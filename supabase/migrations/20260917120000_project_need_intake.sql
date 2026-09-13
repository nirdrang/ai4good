create type public.need_stage as enum ('draft', 'discovery_in_progress');
create type public.need_urgency as enum ('soon', 'this_quarter', 'no_deadline');

create unique index projects_id_org_id_idx on public.projects (id, org_id);

create table public.need_intakes (
  project_id uuid primary key,
  org_id uuid not null,
  description text,
  urgency public.need_urgency,
  stage public.need_stage not null default 'draft',
  cause_labels text[] not null default '{}',
  reference_files jsonb not null default '[]'::jsonb,
  tier2_classified_at timestamptz,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
  constraint need_intakes_draft_has_no_labels check (stage <> 'draft' or cause_labels = '{}'),
  constraint need_intakes_files_are_a_list check (jsonb_typeof(reference_files) = 'array'),
  constraint need_intakes_submitted_iff_started check ((stage = 'draft') = (submitted_at is null))
);

revoke all on table public.need_intakes from anon, authenticated, service_role;
alter table public.need_intakes enable row level security;
grant select on public.need_intakes to authenticated;

create policy need_intakes_select_org_member on public.need_intakes for select to authenticated
  using (public.viewer_is_org_member(org_id));
create policy need_intakes_select_platform_admin on public.need_intakes for select to authenticated
  using (public.viewer_is_platform_admin());

create function public.need_intake_classification_is_monotonic()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.tier2_classified_at is not null
     and new.tier2_classified_at is distinct from old.tier2_classified_at then
    raise exception 'the Tier-2 classification cannot be cleared or rewritten'
      using errcode = '42501', detail = 'tier2-classification-immutable';
  end if;
  return new;
end;
$$;
revoke execute on function public.need_intake_classification_is_monotonic() from public, anon, authenticated, service_role;

create trigger need_intakes_keep_classification
before update on public.need_intakes
for each row execute function public.need_intake_classification_is_monotonic();

drop function public.read_public_project(uuid);
create function public.read_public_project(p_project_id uuid)
returns table (project_id uuid, project_name text, organization_name text, need_stage text)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.name, o.name, n.stage::text
    from public.projects p
    join public.organizations o on o.id = p.org_id
    left join public.need_intakes n on n.project_id = p.id
   where p.id = p_project_id;
$$;
comment on function public.read_public_project(uuid) is 'The public project page source: project id, project name, organisation name, need stage (REQ-001, AT-001.22; REQ-003).';
revoke execute on function public.read_public_project(uuid) from public, anon, authenticated, service_role;
grant execute on function public.read_public_project(uuid) to service_role;

create function public.need_intake_view(p_project_id uuid)
returns jsonb
language sql stable
set search_path = ''
as $$
  select to_jsonb(n) || jsonb_build_object('title', p.name)
    from public.need_intakes n join public.projects p on p.id = n.project_id
   where n.project_id = p_project_id;
$$;
revoke execute on function public.need_intake_view(uuid) from public, anon, authenticated, service_role;

create function public.project_need(
  p_account_id uuid,
  p_organization_id uuid,
  p_action text,
  p_project_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_role public.org_role;
  v_project_id uuid;
  v_title text;
  v_description text;
  v_urgency text;
begin
  perform public.assert_account_active(p_account_id);

  perform 1 from public.organizations where id = p_organization_id for share;
  if not found then
    raise exception 'project_need refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;
  select role into v_role from public.org_memberships
   where org_id = p_organization_id and account_id = p_account_id for share;
  if v_role is null then
    raise exception 'project_need refuses %: the caller holds no membership in organisation %', p_account_id, p_organization_id
      using errcode = '42501', detail = 'not-a-member';
  end if;
  if v_role <> 'admin' then
    raise exception 'project_need refuses %: only the admin of organisation % may start a need', p_account_id, p_organization_id
      using errcode = '42501', detail = 'not-an-admin';
  end if;

  if p_action is distinct from 'start' then
    raise exception 'project_need refuses an action other than start'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if not public.has_platform_acknowledgment(p_account_id) then
    raise exception 'project_need refuses %: the account has not accepted the platform terms', p_account_id
      using errcode = '42501', detail = 'platform-acknowledgment-missing';
  end if;
  if p_project_id is not null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'project_need requires a start payload and no existing project id'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  if exists (select 1 from jsonb_object_keys(p_payload) as k(key) where key not in ('title', 'description', 'urgency')) then
    raise exception 'project_need refuses an unknown intake field'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  v_title := btrim(p_payload->>'title', E' \t\r\n\f' || chr(160));
  if jsonb_typeof(p_payload->'title') is distinct from 'string' or v_title is null or v_title = '' then
    raise exception 'project_need requires a non-empty title'
      using errcode = '22023', detail = 'invalid-name';
  end if;
  if (p_payload ? 'description' and jsonb_typeof(p_payload->'description') not in ('string', 'null'))
     or (p_payload ? 'urgency' and jsonb_typeof(p_payload->'urgency') not in ('string', 'null')) then
    raise exception 'project_need requires text intake fields'
      using errcode = '22023', detail = 'invalid-request';
  end if;
  v_description := nullif(btrim(p_payload->>'description', E' \t\r\n\f' || chr(160)), '');
  v_urgency := p_payload->>'urgency';
  if v_urgency is not null and v_urgency not in ('soon', 'this_quarter', 'no_deadline') then
    raise exception 'project_need refuses an unknown urgency'
      using errcode = '22023', detail = 'invalid-request';
  end if;

  insert into public.projects (org_id, name) values (p_organization_id, v_title) returning id into v_project_id;
  insert into public.need_intakes (project_id, org_id, description, urgency)
    values (v_project_id, p_organization_id, v_description, v_urgency::public.need_urgency);
  return jsonb_build_object('need', public.need_intake_view(v_project_id), 'changed', true);
end;
$$;
revoke execute on function public.project_need(uuid, uuid, text, uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.project_need(uuid, uuid, text, uuid, jsonb) to service_role;

notify pgrst, 'reload schema';
