create table public.brief_revisions (
  project_id uuid not null references public.projects (id) on delete cascade,
  revision bigint not null check (revision >= 1),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  created_by uuid not null references public.accounts (id),
  created_at timestamptz not null default clock_timestamp(),
  primary key (project_id, revision)
);

create table public.discovery_confirmations (
  project_id uuid not null,
  revision bigint not null,
  actor_id uuid not null references public.accounts (id),
  actor_name text not null check (length(btrim(actor_name)) > 0),
  confirmed_at timestamptz not null,
  accepted_gaps jsonb not null check (jsonb_typeof(accepted_gaps) = 'array'),
  primary key (project_id, revision),
  foreign key (project_id, revision) references public.brief_revisions (project_id, revision) on delete cascade
);

create table public.discovery_brief_messages (
  project_id uuid not null,
  revision bigint not null,
  message_id text not null check (length(btrim(message_id)) > 0),
  message jsonb not null check (jsonb_typeof(message) = 'object'),
  created_at timestamptz not null default clock_timestamp(),
  primary key (project_id, revision),
  unique (project_id, message_id),
  foreign key (project_id, revision) references public.brief_revisions (project_id, revision) on delete cascade
);

revoke all on table public.brief_revisions from anon, authenticated, service_role;
revoke all on table public.discovery_confirmations from anon, authenticated, service_role;
revoke all on table public.discovery_brief_messages from anon, authenticated, service_role;

alter table public.brief_revisions enable row level security;
alter table public.discovery_confirmations enable row level security;
alter table public.discovery_brief_messages enable row level security;

grant select on public.brief_revisions to authenticated;
grant select on public.discovery_confirmations to authenticated;
grant select on public.discovery_brief_messages to authenticated;

create policy brief_revisions_select_org_member on public.brief_revisions for select to authenticated
  using (exists (
    select 1 from public.projects p
     where p.id = project_id and (select public.viewer_is_org_member(p.org_id))
  ));
create policy brief_revisions_select_platform_admin on public.brief_revisions for select to authenticated
  using ((select public.viewer_is_platform_admin()));

create policy discovery_confirmations_select_org_member on public.discovery_confirmations for select to authenticated
  using (exists (
    select 1 from public.projects p
     where p.id = project_id and (select public.viewer_is_org_member(p.org_id))
  ));
create policy discovery_confirmations_select_platform_admin on public.discovery_confirmations for select to authenticated
  using ((select public.viewer_is_platform_admin()));

create policy discovery_brief_messages_select_org_member on public.discovery_brief_messages for select to authenticated
  using (exists (
    select 1 from public.projects p
     where p.id = project_id and (select public.viewer_is_org_member(p.org_id))
  ));
create policy discovery_brief_messages_select_platform_admin on public.discovery_brief_messages for select to authenticated
  using ((select public.viewer_is_platform_admin()));

create function public.discovery_brief_row_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'a Discovery brief row cannot be changed' using errcode = '42501';
end;
$$;
revoke execute on function public.discovery_brief_row_immutable() from public, anon, authenticated, service_role;

create trigger brief_revisions_immutable
  before update or delete on public.brief_revisions
  for each row execute function public.discovery_brief_row_immutable();
create trigger discovery_confirmations_immutable
  before update or delete on public.discovery_confirmations
  for each row execute function public.discovery_brief_row_immutable();
create trigger discovery_brief_messages_immutable
  before update or delete on public.discovery_brief_messages
  for each row execute function public.discovery_brief_row_immutable();

create function public.discovery_brief_payload(p_project_id uuid)
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
    return jsonb_build_object('revision', null, 'document', null, 'confirmation', null, 'lines', '[]'::jsonb);
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
    'lines', coalesce(v_lines, '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.discovery_brief_payload(uuid) from public, anon, authenticated, service_role;

create function public.viewer_discovery_brief(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if p_project_id is null then
    return jsonb_build_object('revision', null, 'document', null, 'confirmation', null, 'lines', '[]'::jsonb);
  end if;
  select org_id into v_org from public.projects where id = p_project_id;
  if v_org is null
     or not (public.viewer_is_platform_admin() or public.viewer_is_org_member(v_org)) then
    return jsonb_build_object('revision', null, 'document', null, 'confirmation', null, 'lines', '[]'::jsonb);
  end if;
  return public.discovery_brief_payload(p_project_id);
end;
$$;
revoke execute on function public.viewer_discovery_brief(uuid) from public;
grant execute on function public.viewer_discovery_brief(uuid) to authenticated;

create function public.discovery_brief_commit(
  p_account_id uuid,
  p_organization_id uuid,
  p_project_id uuid,
  p_base_revision bigint,
  p_action text,
  p_document jsonb,
  p_person_line jsonb,
  p_confirmation jsonb,
  p_turn_deadline_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.org_role;
  v_need public.need_intakes;
  v_open public.discovery_turns;
  v_revision bigint;
  v_document jsonb;
  v_confirmed boolean;
  v_next bigint;
  v_email text;
  v_gaps jsonb;
  v_at timestamptz;
  v_hint text;
begin
  perform public.assert_account_active(p_account_id);
  if p_action is null or p_action not in ('edit', 'accept', 'ask', 'remove-label', 'finish')
     or p_turn_deadline_seconds is null or p_turn_deadline_seconds < 1
     or p_base_revision is null or p_base_revision < 1 then
    raise exception 'invalid Discovery brief request' using errcode = '22023', detail = 'invalid-request';
  end if;
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
    raise exception 'only the organisation admin may change the Discovery brief' using errcode = '42501', detail = 'not-an-admin';
  end if;
  if exists (
    select 1 from public.organizations
     where id = p_organization_id and discovery_disabled_at is not null
  ) then
    raise exception 'a platform admin switched Discovery off for this organisation'
      using errcode = 'P0001', detail = 'discovery-disabled';
  end if;
  if not exists (select 1 from auth.users where id = p_account_id and email_confirmed_at is not null) then
    raise exception 'a Discovery brief change needs a verified email address — this account is email-unverified. Use the verification link sent to the account address, then try again'
      using errcode = '42501', detail = 'email-unverified';
  end if;
  perform 1 from public.projects where id = p_project_id and org_id = p_organization_id for update;
  if not found then
    raise exception 'no such project in this organisation' using errcode = '23503', detail = 'no-such-project';
  end if;
  select * into v_need from public.need_intakes where project_id = p_project_id for share;
  if not found or v_need.stage <> 'discovery_in_progress' then
    raise exception 'the need is not in Discovery' using errcode = 'P0001', detail = 'need-not-in-discovery';
  end if;
  select revision, document into v_revision, v_document
    from public.brief_revisions
   where project_id = p_project_id
   order by revision desc
   limit 1
   for update;
  v_confirmed := v_revision is not null and exists (
    select 1 from public.discovery_confirmations
     where project_id = p_project_id and revision = v_revision
  );
  if v_confirmed and p_action in ('accept', 'ask', 'remove-label') then
    raise exception 'Discovery is finished. No further reply is charged.'
      using errcode = 'P0001', detail = 'finished';
  end if;
  if v_revision is null then
    raise exception 'Discovery has no brief yet.' using errcode = 'P0001', detail = 'invalid-request';
  end if;
  if p_base_revision is distinct from v_revision then
    v_hint := jsonb_build_object('revision', v_revision, 'document', v_document)::text;
    raise exception 'The brief changed. Review the latest revision.'
      using errcode = 'P0001', detail = 'stale-revision', hint = v_hint;
  end if;
  select * into v_open from public.discovery_turns
   where project_id = p_project_id and status = 'open' for update;
  if found and v_open.opened_at > clock_timestamp() - make_interval(secs => p_turn_deadline_seconds) then
    raise exception 'a Discovery turn is in flight' using errcode = 'P0001', detail = 'turn-in-flight';
  end if;
  if p_action = 'finish' and v_confirmed then
    return public.discovery_brief_payload(p_project_id);
  end if;
  if p_action = 'finish' then
    if p_document is not null or p_person_line is not null
       or p_confirmation is null or jsonb_typeof(p_confirmation) is distinct from 'object' then
      raise exception 'invalid Discovery finish' using errcode = '22023', detail = 'invalid-request';
    end if;
    if jsonb_typeof(p_confirmation->'acceptedGaps') = 'array' then
      v_gaps := p_confirmation->'acceptedGaps';
    elsif jsonb_typeof(p_confirmation->'accepted_gaps') = 'array' then
      v_gaps := p_confirmation->'accepted_gaps';
    else
      raise exception 'a Discovery finish must name the accepted gaps' using errcode = '22023', detail = 'invalid-request';
    end if;
    if p_confirmation->>'at' is null
       or (p_confirmation->>'revision') !~ '^[0-9]+$'
       or (p_confirmation->>'revision')::bigint is distinct from v_revision then
      raise exception 'a Discovery finish confirms the current revision' using errcode = '22023', detail = 'invalid-request';
    end if;
    begin
      v_at := (p_confirmation->>'at')::timestamptz;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        raise exception 'a Discovery finish must name when it was confirmed'
          using errcode = '22023', detail = 'invalid-request';
    end;
    if v_at is null then
      raise exception 'a Discovery finish must name when it was confirmed'
        using errcode = '22023', detail = 'invalid-request';
    end if;
    select email into v_email from auth.users where id = p_account_id;
    if v_email is null or btrim(v_email) = '' then
      raise exception 'the account has no email address to record as the approver'
        using errcode = 'P0001', detail = 'invalid-request';
    end if;
    insert into public.discovery_confirmations (project_id, revision, actor_id, actor_name, confirmed_at, accepted_gaps)
    values (p_project_id, v_revision, p_account_id, v_email, v_at, v_gaps);
    return public.discovery_brief_payload(p_project_id);
  end if;
  if p_confirmation is not null then
    raise exception 'only finish records a confirmation' using errcode = '22023', detail = 'invalid-request';
  end if;
  if p_document is null then
    if p_person_line is not null then
      raise exception 'a person line belongs to a new revision' using errcode = '22023', detail = 'invalid-request';
    end if;
    return public.discovery_brief_payload(p_project_id);
  end if;
  if jsonb_typeof(p_document) is distinct from 'object' or (p_document->>'schemaVersion') is distinct from '1' then
    raise exception 'invalid Discovery brief document' using errcode = '22023', detail = 'invalid-request';
  end if;
  v_next := v_revision + 1;
  if p_person_line is not null and (
    jsonb_typeof(p_person_line) is distinct from 'object'
    or p_person_line->>'role' is distinct from 'user'
    or p_person_line->>'id' is distinct from 'you-' || v_next::text
  ) then
    raise exception 'invalid Discovery brief person line' using errcode = '22023', detail = 'invalid-request';
  end if;
  insert into public.brief_revisions (project_id, revision, document, created_by)
  values (p_project_id, v_next, p_document, p_account_id);
  if p_person_line is not null then
    insert into public.discovery_brief_messages (project_id, revision, message_id, message)
    values (p_project_id, v_next, p_person_line->>'id', p_person_line);
  end if;
  return public.discovery_brief_payload(p_project_id);
end;
$$;
revoke execute on function public.discovery_brief_commit(uuid, uuid, uuid, bigint, text, jsonb, jsonb, jsonb, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.discovery_brief_commit(uuid, uuid, uuid, bigint, text, jsonb, jsonb, jsonb, integer)
  to service_role;

notify pgrst, 'reload schema';
