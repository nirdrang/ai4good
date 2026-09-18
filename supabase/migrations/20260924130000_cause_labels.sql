create table public.cause_labels (
  label            text primary key,
  first_project_id uuid references public.projects (id) on delete set null,
  created_at       timestamptz not null default clock_timestamp(),
  constraint cause_labels_canonical check (label <> '' and label = lower(btrim(label)) and label !~ '\s\s')
);

revoke all on table public.cause_labels from anon, authenticated, service_role;
alter table public.cause_labels enable row level security;

create or replace function public.discovery_scope_begin(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid,
  p_action text, p_reason text, p_label text, p_settings jsonb, p_notice jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_role public.org_role;
  v_project public.projects;
  v_need public.need_intakes;
  v_scope public.discovery_scopes;
  v_elicitation jsonb;
  v_context jsonb;
  v_mission text;
  v_disabled_at timestamptz;
  v_disabled_reason text;
  v_key text;
  v_label text;
  v_scopes jsonb;
  v_scope_json jsonb;
begin
  perform public.assert_account_active(p_account_id);
  select discovery_disabled_at, discovery_disabled_reason, mission
    into v_disabled_at, v_disabled_reason, v_mission
    from public.organizations where id = p_organization_id for share;
  if not found then
    raise exception 'no such organisation' using errcode = '23503', detail = 'no-such-organisation';
  end if;
  select role into v_role from public.org_memberships
    where org_id = p_organization_id and account_id = p_account_id for share;
  if v_role is null then
    raise exception 'the caller holds no membership in this organisation' using errcode = '42501', detail = 'not-a-member';
  end if;
  if v_role <> 'admin' then
    raise exception 'only the organisation admin may write a Discovery scope' using errcode = '42501', detail = 'not-an-admin';
  end if;
  if v_disabled_at is not null then
    raise exception 'a platform admin switched Discovery off for this organisation — %', v_disabled_reason
      using errcode = 'P0001', detail = 'discovery-disabled';
  end if;
  if jsonb_typeof(p_settings) is distinct from 'object' then
    raise exception 'invalid Discovery settings' using errcode = '22023', detail = 'invalid-request';
  end if;
  foreach v_key in array array['turn_deadline_seconds'] loop
    if jsonb_typeof(p_settings->v_key) is distinct from 'number'
      or (p_settings->>v_key) !~ '^[0-9]+$' then
      raise exception 'invalid Discovery numeric setting %', v_key using errcode = '22023', detail = 'invalid-request';
    end if;
    if (p_settings->>v_key)::numeric > 2147483583
      or (p_settings->>v_key)::numeric = 0 then
      raise exception 'invalid Discovery numeric setting %', v_key using errcode = '22023', detail = 'invalid-request';
    end if;
  end loop;
  select * into v_project from public.projects where id = p_project_id and org_id = p_organization_id for update;
  if not found then
    raise exception 'no such project in this organisation' using errcode = '23503', detail = 'no-such-project';
  end if;
  select * into v_need from public.need_intakes where project_id = p_project_id;
  if not found or v_need.stage <> 'discovery_in_progress' then
    raise exception 'the need is not in Discovery' using errcode = 'P0001', detail = 'need-not-in-discovery';
  end if;
  if p_action = 'remove-label' then
    v_label := regexp_replace(lower(btrim(coalesce(p_label, ''))), '\s+', ' ', 'g');
    if v_label = '' then
      raise exception 'a Discovery scope write requires a label to remove'
        using errcode = '22023', detail = 'invalid-request';
    end if;
    select * into v_need from public.need_intakes where project_id = p_project_id for update;
    select to_jsonb(s) into v_scope_json from public.discovery_scopes s
      where s.project_id = p_project_id and s.status = 'current';
    select coalesce(jsonb_agg(to_jsonb(s) order by s.version), '[]'::jsonb) into v_scopes
      from public.discovery_scopes s where s.project_id = p_project_id;
    if not (v_label = any (coalesce(v_need.cause_labels, '{}'::text[]))) then
      return jsonb_build_object(
        'done', true,
        'changed', false,
        'scope', v_scope_json,
        'scopes', v_scopes,
        'need', to_jsonb(v_need) || jsonb_build_object('title', v_project.name)
      );
    end if;
    update public.need_intakes
       set cause_labels = array_remove(cause_labels, v_label)
     where project_id = p_project_id
     returning * into v_need;
    return jsonb_build_object(
      'done', true,
      'changed', true,
      'scope', v_scope_json,
      'scopes', v_scopes,
      'need', to_jsonb(v_need) || jsonb_build_object('title', v_project.name)
    );
  end if;
  if p_action is distinct from 'generate' then
    raise exception 'a Discovery scope write requires the generate or remove-label action'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  select t.elicitation into v_elicitation
    from public.discovery_turns t
   where t.project_id = p_project_id and t.elicitation is not null
   order by t.seq desc
   limit 1;
  if v_elicitation is null or (v_elicitation->>'complete') is distinct from 'true' then
    raise exception 'the elicitation is not complete' using errcode = 'P0001', detail = 'elicitation-incomplete';
  end if;
  select * into v_scope from public.discovery_scopes
    where project_id = p_project_id and status = 'generating' for update;
  if found then
    if v_scope.opened_at > clock_timestamp() - make_interval(secs => (p_settings->>'turn_deadline_seconds')::integer) then
      raise exception 'a Discovery generation is in flight' using errcode = 'P0001', detail = 'generation-in-flight';
    end if;
    update public.discovery_scopes set status = 'failed', settled_at = clock_timestamp()
      where id = v_scope.id;
  end if;
  if exists (
    select 1 from public.discovery_scopes
     where project_id = p_project_id and status in ('current', 'superseded')
  ) then
    raise exception 'a scope has already been generated for this project'
      using errcode = 'P0001', detail = 'scope-already-generated';
  end if;
  select coalesce(jsonb_agg(m.message order by t.seq, m.position), '[]'::jsonb) into v_context
    from public.discovery_turns t cross join lateral (values
      (1, jsonb_build_object('role', 'user', 'content', t.user_message)),
      (2, jsonb_build_object('role', 'assistant', 'content', t.assistant_message))
    ) as m(position, message) where t.project_id = p_project_id and t.status = 'settled';
  -- a failed version still occupies (project_id, version); later versions require a reason, so generate reopens the latest failed row
  select * into v_scope from public.discovery_scopes
   where project_id = p_project_id and status = 'failed'
   order by version desc
   limit 1
   for update;
  if found then
    update public.discovery_scopes set
      status = 'generating', contract = null, markdown = null, served_model = null,
      input_tokens = null, output_tokens = null, settled_at = null,
      elicitation = v_elicitation, requested_by = p_account_id,
      opened_at = clock_timestamp(), cause_labels = '{}'
     where id = v_scope.id
     returning * into v_scope;
  else
    insert into public.discovery_scopes (
      project_id, org_id, version, status, reason, requested_by, elicitation, cause_labels, opened_at
    ) values (
      p_project_id, p_organization_id, 1, 'generating', null, p_account_id, v_elicitation, '{}', clock_timestamp()
    ) returning * into v_scope;
  end if;
  return jsonb_build_object(
    'done', false,
    'scope', to_jsonb(v_scope),
    'elicitation', v_elicitation,
    'context', v_context,
    'need', to_jsonb(v_need) || jsonb_build_object('title', v_project.name),
    'mission', v_mission,
    'vocabulary', (select coalesce(jsonb_agg(c.label order by c.label), '[]'::jsonb) from public.cause_labels c)
  );
end;
$$;

revoke execute on function public.discovery_scope_begin(uuid, uuid, uuid, text, text, text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.discovery_scope_begin(uuid, uuid, uuid, text, text, text, jsonb, jsonb)
  to service_role;

create or replace function public.discovery_scope_commit(
  p_account_id uuid, p_project_id uuid, p_scope_id uuid, p_outcome text,
  p_contract jsonb, p_markdown text, p_labels text[],
  p_served_model text, p_input_tokens integer, p_output_tokens integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_role public.org_role;
  v_scope public.discovery_scopes;
  v_need public.need_intakes;
  v_title text;
  v_scopes jsonb;
  v_org_id uuid;
begin
  perform public.assert_account_active(p_account_id);
  select org_id, name into v_org_id, v_title from public.projects where id = p_project_id for update;
  if not found then
    raise exception 'no such project in this organisation' using errcode = '23503', detail = 'no-such-project';
  end if;
  select role into v_role from public.org_memberships
    where org_id = v_org_id and account_id = p_account_id for share;
  if v_role is null then
    raise exception 'the caller holds no membership in this organisation' using errcode = '42501', detail = 'not-a-member';
  end if;
  if v_role <> 'admin' then
    raise exception 'only the organisation admin may settle a Discovery scope' using errcode = '42501', detail = 'not-an-admin';
  end if;
  if p_scope_id is null then
    select * into v_scope from public.discovery_scopes
      where project_id = p_project_id and status = 'current';
    select * into v_need from public.need_intakes where project_id = p_project_id;
    select coalesce(jsonb_agg(to_jsonb(s) order by s.version), '[]'::jsonb) into v_scopes
      from public.discovery_scopes s where s.project_id = p_project_id;
    return jsonb_build_object(
      'scope', to_jsonb(v_scope),
      'scopes', v_scopes,
      'need', to_jsonb(v_need) || jsonb_build_object('title', v_title),
      'changed', coalesce((p_contract->>'changed')::boolean, false)
    );
  end if;
  select * into v_scope from public.discovery_scopes
    where id = p_scope_id and project_id = p_project_id for update;
  if not found or v_scope.status <> 'generating' then
    raise exception 'the Discovery scope is not open' using errcode = 'P0001', detail = 'scope-not-open';
  end if;
  if p_outcome = 'completed' then
    if p_contract is null or p_markdown is null or btrim(p_markdown) = '' or p_served_model is null or btrim(p_served_model) = '' then
      raise exception 'invalid Discovery scope outcome' using errcode = '22023', detail = 'invalid-request';
    end if;
    update public.discovery_scopes set status = 'superseded'
     where project_id = v_scope.project_id and status = 'current';
    update public.discovery_scopes set
      status = 'current', contract = p_contract, markdown = p_markdown,
      cause_labels = coalesce(p_labels, '{}'), served_model = p_served_model,
      input_tokens = p_input_tokens, output_tokens = p_output_tokens,
      settled_at = clock_timestamp()
     where id = p_scope_id
     returning * into v_scope;
    insert into public.cause_labels (label, first_project_id)
      select unnest(coalesce(p_labels, '{}')), v_scope.project_id
      on conflict do nothing;
    update public.need_intakes
       set cause_labels = coalesce(p_labels, '{}')
     where project_id = v_scope.project_id;
  elsif p_outcome = 'failed' then
    update public.discovery_scopes set status = 'failed', settled_at = clock_timestamp()
     where id = p_scope_id
     returning * into v_scope;
  else
    raise exception 'invalid Discovery scope outcome' using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_need from public.need_intakes where project_id = v_scope.project_id;
  select coalesce(jsonb_agg(to_jsonb(s) order by s.version), '[]'::jsonb) into v_scopes
    from public.discovery_scopes s where s.project_id = v_scope.project_id;
  return jsonb_build_object(
    'scope', to_jsonb(v_scope),
    'scopes', v_scopes,
    'need', to_jsonb(v_need) || jsonb_build_object('title', v_title)
  );
end;
$$;

revoke execute on function public.discovery_scope_commit(uuid, uuid, uuid, text, jsonb, text, text[], text, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.discovery_scope_commit(uuid, uuid, uuid, text, jsonb, text, text[], text, integer, integer)
  to service_role;

notify pgrst, 'reload schema';
