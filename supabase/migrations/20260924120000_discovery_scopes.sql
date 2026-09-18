create type public.discovery_scope_status as enum ('generating', 'current', 'superseded', 'failed', 'escalated');

create table public.discovery_scopes (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null,
  org_id         uuid not null,
  version        integer not null,
  status         public.discovery_scope_status not null,
  reason         text,
  requested_by   uuid not null references public.accounts (id) on delete restrict,
  elicitation    jsonb not null,
  contract       jsonb,
  markdown       text,
  cause_labels   text[] not null default '{}',
  served_model   text,
  input_tokens   integer,
  output_tokens  integer,
  opened_at      timestamptz not null default clock_timestamp(),
  settled_at     timestamptz,
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  unique (project_id, version),
  constraint discovery_scopes_version_positive check (version >= 1),
  constraint discovery_scopes_generating_iff_unsettled check ((status = 'generating') = (settled_at is null)),
  constraint discovery_scopes_first_has_no_reason check (version <> 1 or reason is null),
  constraint discovery_scopes_later_has_reason check (version = 1 or (reason is not null and btrim(reason) <> '')),
  constraint discovery_scopes_current_is_filled check (status not in ('current', 'superseded') or (contract is not null and markdown is not null and served_model is not null)),
  constraint discovery_scopes_escalated_is_empty check (status <> 'escalated' or (contract is null and markdown is null)),
  constraint discovery_scopes_labels_are_bounded check (coalesce(array_length(cause_labels, 1), 0) <= 3)
);
create unique index discovery_scopes_one_current_per_project on public.discovery_scopes (project_id) where status = 'current';
create unique index discovery_scopes_one_generating_per_project on public.discovery_scopes (project_id) where status = 'generating';

revoke all on table public.discovery_scopes from anon, authenticated, service_role;
alter table public.discovery_scopes enable row level security;
grant select on public.discovery_scopes to authenticated;
create policy discovery_scopes_select_org_member on public.discovery_scopes for select to authenticated
  using (public.viewer_is_org_member(org_id));
create policy discovery_scopes_select_platform_admin on public.discovery_scopes for select to authenticated
  using (public.viewer_is_platform_admin());

create function public.discovery_scope_begin(
  p_account_id uuid, p_organization_id uuid, p_project_id uuid,
  p_action text, p_reason text, p_label text, p_bound integer, p_notice jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_role public.org_role;
  v_project public.projects;
  v_need public.need_intakes;
  v_scope public.discovery_scopes;
  v_elicitation jsonb;
  v_context jsonb;
  v_mission text;
begin
  perform public.assert_account_active(p_account_id);
  perform 1 from public.organizations where id = p_organization_id for share;
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
  select * into v_project from public.projects where id = p_project_id and org_id = p_organization_id for update;
  if not found then
    raise exception 'no such project in this organisation' using errcode = '23503', detail = 'no-such-project';
  end if;
  select * into v_need from public.need_intakes where project_id = p_project_id;
  if not found or v_need.stage <> 'discovery_in_progress' then
    raise exception 'the need is not in Discovery' using errcode = 'P0001', detail = 'need-not-in-discovery';
  end if;
  if p_action is distinct from 'generate' then
    raise exception 'a Discovery scope write requires the generate action' using errcode = '22023', detail = 'invalid-request';
  end if;
  select t.elicitation into v_elicitation
    from public.discovery_turns t
   where t.project_id = p_project_id and t.elicitation is not null
   order by t.seq desc
   limit 1;
  if v_elicitation is null or (v_elicitation->>'complete') is distinct from 'true' then
    raise exception 'the elicitation is not complete' using errcode = 'P0001', detail = 'elicitation-incomplete';
  end if;
  if exists (
    select 1 from public.discovery_scopes
     where project_id = p_project_id and status in ('generating', 'current', 'superseded')
  ) then
    raise exception 'a scope has already been generated for this project'
      using errcode = 'P0001', detail = 'scope-already-generated';
  end if;
  select mission into v_mission from public.organizations where id = p_organization_id;
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
    'vocabulary', '[]'::jsonb
  );
end;
$$;

revoke execute on function public.discovery_scope_begin(uuid, uuid, uuid, text, text, text, integer, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.discovery_scope_begin(uuid, uuid, uuid, text, text, text, integer, jsonb)
  to service_role;

create function public.discovery_scope_commit(
  p_account_id uuid, p_scope_id uuid, p_outcome text,
  p_contract jsonb, p_markdown text, p_labels text[],
  p_served_model text, p_input_tokens integer, p_output_tokens integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_role public.org_role;
  v_scope public.discovery_scopes;
  v_need public.need_intakes;
  v_title text;
  v_scopes jsonb;
begin
  perform public.assert_account_active(p_account_id);
  select * into v_scope from public.discovery_scopes where id = p_scope_id;
  if not found then
    raise exception 'the Discovery scope is not open' using errcode = 'P0001', detail = 'scope-not-open';
  end if;
  perform 1 from public.projects where id = v_scope.project_id for update;
  select * into v_scope from public.discovery_scopes where id = p_scope_id for update;
  if not found then
    raise exception 'the Discovery scope is not open' using errcode = 'P0001', detail = 'scope-not-open';
  end if;
  select role into v_role from public.org_memberships
    where org_id = v_scope.org_id and account_id = p_account_id for share;
  if v_role is null then
    raise exception 'the caller holds no membership in this organisation' using errcode = '42501', detail = 'not-a-member';
  end if;
  if v_role <> 'admin' then
    raise exception 'only the organisation admin may settle a Discovery scope' using errcode = '42501', detail = 'not-an-admin';
  end if;
  if p_outcome = 'completed' and p_contract is null then
    select * into v_need from public.need_intakes where project_id = v_scope.project_id;
    select name into v_title from public.projects where id = v_scope.project_id;
    select coalesce(jsonb_agg(to_jsonb(s) order by s.version), '[]'::jsonb) into v_scopes
      from public.discovery_scopes s where s.project_id = v_scope.project_id;
    return jsonb_build_object(
      'scope', to_jsonb(v_scope),
      'scopes', v_scopes,
      'need', to_jsonb(v_need) || jsonb_build_object('title', v_title)
    );
  end if;
  if v_scope.status <> 'generating' then
    raise exception 'the Discovery scope is not open' using errcode = 'P0001', detail = 'scope-not-open';
  end if;
  if p_outcome = 'completed' then
    if p_markdown is null or btrim(p_markdown) = '' or p_served_model is null or btrim(p_served_model) = '' then
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
  elsif p_outcome = 'failed' then
    update public.discovery_scopes set status = 'failed', settled_at = clock_timestamp()
     where id = p_scope_id
     returning * into v_scope;
  else
    raise exception 'invalid Discovery scope outcome' using errcode = '22023', detail = 'invalid-request';
  end if;
  select * into v_need from public.need_intakes where project_id = v_scope.project_id;
  select name into v_title from public.projects where id = v_scope.project_id;
  select coalesce(jsonb_agg(to_jsonb(s) order by s.version), '[]'::jsonb) into v_scopes
    from public.discovery_scopes s where s.project_id = v_scope.project_id;
  return jsonb_build_object(
    'scope', to_jsonb(v_scope),
    'scopes', v_scopes,
    'need', to_jsonb(v_need) || jsonb_build_object('title', v_title)
  );
end;
$$;

revoke execute on function public.discovery_scope_commit(uuid, uuid, text, jsonb, text, text[], text, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.discovery_scope_commit(uuid, uuid, text, jsonb, text, text[], text, integer, integer)
  to service_role;

notify pgrst, 'reload schema';
