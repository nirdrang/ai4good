create or replace function public.discovery_scope_begin(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid,
  p_action text, p_reason text, p_label text, p_settings jsonb, p_notice jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_role public.org_role;
  v_project public.projects;
  v_need public.need_intakes;
  v_scope public.discovery_scopes;
  v_brief jsonb;
  v_confirmation jsonb;
  v_revision bigint;
  v_mission text;
  v_disabled_at timestamptz;
  v_disabled_reason text;
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
  if not exists (select 1 from auth.users where id = p_account_id and email_confirmed_at is not null) then
    raise exception 'a Discovery scope write needs a verified email address — this account is email-unverified. Use the verification link sent to the account address, then try again'
      using errcode = '42501', detail = 'email-unverified';
  end if;
  if p_action is distinct from 'generate' or p_reason is not null or p_label is not null then
    raise exception 'PRD scope accepts generate only' using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_project from public.projects where id = p_project_id and org_id = p_organization_id for update;
  if not found then
    raise exception 'no such project in this organisation' using errcode = '23503', detail = 'no-such-project';
  end if;
  select * into v_need from public.need_intakes where project_id = p_project_id;
  select revision, document into v_revision, v_brief from public.brief_revisions
    where project_id = p_project_id order by revision desc limit 1;
  select jsonb_build_object('revision', revision, 'approver', actor_name, 'at', confirmed_at, 'acceptedGaps', accepted_gaps)
    into v_confirmation from public.discovery_confirmations where project_id = p_project_id and revision = v_revision;
  if v_confirmation is null then
    raise exception 'PRD scope needs the current confirmed Discovery revision' using errcode = 'P0001', detail = 'elicitation-incomplete';
  end if;
  select * into v_scope from public.discovery_scopes where project_id = p_project_id and status = 'generating' for update;
  if found then
    if v_scope.opened_at > clock_timestamp() - make_interval(secs => (p_settings->>'turn_deadline_seconds')::integer) then
      raise exception 'a scope generation is in flight' using errcode = 'P0001', detail = 'generation-in-flight';
    end if;
    update public.discovery_scopes set status = 'failed', settled_at = clock_timestamp() where id = v_scope.id;
  end if;
  if exists (select 1 from public.discovery_scopes where project_id = p_project_id and status in ('current', 'superseded')) then
    raise exception 'a scope has already been generated' using errcode = 'P0001', detail = 'scope-already-generated';
  end if;
  select * into v_scope from public.discovery_scopes where project_id = p_project_id and status = 'failed' order by version desc limit 1 for update;
  if found then
    update public.discovery_scopes set id = gen_random_uuid(), status = 'generating', settled_at = null,
      elicitation = v_brief, requested_by = p_account_id, opened_at = clock_timestamp() where id = v_scope.id returning * into v_scope;
  else
    insert into public.discovery_scopes(project_id, org_id, version, status, requested_by, elicitation)
      values (p_project_id, p_organization_id, 1, 'generating', p_account_id, v_brief) returning * into v_scope;
  end if;
  return jsonb_build_object('done', false, 'scope', to_jsonb(v_scope),
    'confirmed', jsonb_build_object('brief', jsonb_build_object('revision', v_revision, 'document', v_brief), 'confirmation', v_confirmation),
    'need', to_jsonb(v_need) || jsonb_build_object('title', v_project.name));
end;
$$;

revoke execute on function public.discovery_scope_begin(uuid, uuid, uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.discovery_scope_begin(uuid, uuid, uuid, text, text, text, jsonb, jsonb) to service_role;

create or replace function public.discovery_brief_payload(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revision bigint;
  v_document jsonb;
  v_confirmation jsonb;
  v_lines jsonb;
begin
  select revision, document into v_revision, v_document
    from public.brief_revisions
   where project_id = p_project_id
   order by revision desc
   limit 1;
  if v_revision is null then
    return jsonb_build_object('revision', null, 'document', null, 'confirmation', null, 'lines', '[]'::jsonb, 'vocabulary', (select coalesce(jsonb_agg(label order by label), '[]'::jsonb) from public.cause_labels));
  end if;
  select jsonb_build_object(
    'revision', c.revision,
    'actor_id', c.actor_id,
    'actor_name', c.actor_name,
    'confirmed_at', c.confirmed_at,
    'accepted_gaps', c.accepted_gaps
  ) into v_confirmation
    from public.discovery_confirmations c
   where c.project_id = p_project_id and c.revision = v_revision;
  select coalesce(jsonb_agg(m.message order by m.revision), '[]'::jsonb) into v_lines
    from public.discovery_brief_messages m
   where m.project_id = p_project_id;
  return jsonb_build_object(
    'revision', v_revision,
    'document', v_document,
    'confirmation', v_confirmation,
    'lines', coalesce(v_lines, '[]'::jsonb),
    'vocabulary', (select coalesce(jsonb_agg(label order by label), '[]'::jsonb) from public.cause_labels)
  );
end;
$$;
revoke execute on function public.discovery_brief_payload(uuid) from public, anon, authenticated, service_role;

create function public.record_discovery_brief_labels()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_document jsonb;
  v_labels text[];
begin
  select document into v_document from public.brief_revisions where project_id = new.project_id and revision = new.revision;
  select coalesce(array_agg(distinct label order by label), '{}'::text[]) into v_labels
    from (select regexp_replace(lower(btrim(value)), '\s+', ' ', 'g') as label
      from jsonb_array_elements_text(coalesce(v_document->'causeLabels', '[]'::jsonb))) labels;
  if cardinality(v_labels) > 3 or exists (select 1 from unnest(v_labels) label where length(label) = 0 or length(label) > 40) then
    raise exception 'invalid Discovery cause labels' using errcode = '22023', detail = 'invalid-request';
  end if;
  insert into public.cause_labels(label, first_project_id)
    select label, new.project_id from unnest(v_labels) label on conflict (label) do nothing;
  update public.need_intakes set cause_labels = v_labels where project_id = new.project_id;
  return new;
end;
$$;
revoke execute on function public.record_discovery_brief_labels() from public, anon, authenticated, service_role;
create trigger discovery_confirmations_publish_labels after insert on public.discovery_confirmations
  for each row execute function public.record_discovery_brief_labels();
notify pgrst, 'reload schema';
