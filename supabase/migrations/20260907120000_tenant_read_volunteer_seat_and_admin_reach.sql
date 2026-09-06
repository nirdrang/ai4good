-- REQ-001 tenant read: assigned-volunteer seat, volunteer predicate, platform-admin reach
-- (AT-001.23, AT-001.40). Adds branches; replaces nothing.
--
-- Viewer helpers follow the posture the 20260906120000 migration header states: named
-- `viewer_`, SECURITY DEFINER, `SET search_path = ''`, no argument that names another
-- person, EXECUTE granted to `authenticated`. The catalog scan refuses any other shape.
-- The assigned-volunteer policy keeps the type conjunct beside the seat trigger: the
-- trigger guards the write, the conjunct guards a read after the account's type changed.

-- Symmetric with org_membership_grantee_must_be_ngo: one enforcement point on every SQL path.
create function public.project_seat_holds_a_volunteer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type public.account_type;
begin
  if new.assigned_volunteer_id is null then
    return new;
  end if;

  select a.account_type into v_type
    from public.accounts a
   where a.id = new.assigned_volunteer_id;

  if v_type is null then
    raise exception
      'projects refuses assignment: no account has completed signup'
      using errcode = '23503';
  end if;

  if v_type <> 'volunteer'::public.account_type then
    raise exception
      'projects refuses assignment: the developer seat admits volunteer accounts only'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.project_seat_holds_a_volunteer() is
  'Refuses seating a non-volunteer account in a project developer seat, on every SQL path (REQ-001, AT-001.23).';

revoke execute on function public.project_seat_holds_a_volunteer() from public;

create trigger projects_seat_holds_a_volunteer
before insert or update of assigned_volunteer_id on public.projects
for each row
execute function public.project_seat_holds_a_volunteer();

-- Raise when any existing row already seats a non-volunteer. The table is empty in every
-- environment this runs in; a violating row stops the migration rather than hiding under a policy.
do $$
begin
  if exists (
    select 1
      from public.projects p
      join public.accounts a on a.id = p.assigned_volunteer_id
     where a.account_type <> 'volunteer'::public.account_type
  ) then
    raise exception
      'projects: a developer seat holds a non-volunteer account; fix the data before this migration';
  end if;
end
$$;

create function public.viewer_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.accounts a
     where a.id = (select auth.uid())
       and a.account_type = 'platform_admin'::public.account_type
  );
$$;

comment on function public.viewer_is_platform_admin() is
  'True when the calling user holds a platform administrator account row (REQ-001, AT-001.40). Answers only about auth.uid().';

revoke execute on function public.viewer_is_platform_admin() from public;
grant execute on function public.viewer_is_platform_admin() to authenticated, service_role;

create function public.viewer_is_volunteer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.accounts a
     where a.id = (select auth.uid())
       and a.account_type = 'volunteer'::public.account_type
  );
$$;

comment on function public.viewer_is_volunteer() is
  'True when the calling user holds a volunteer account row (REQ-001, AT-001.23). Answers only about auth.uid().';

revoke execute on function public.viewer_is_volunteer() from public;
grant execute on function public.viewer_is_volunteer() to authenticated, service_role;

-- A free seat admits nobody: null = auth.uid() is null, not true.
create policy projects_select_assigned_volunteer
  on public.projects
  for select
  to authenticated
  using (assigned_volunteer_id = (select auth.uid()) and (select public.viewer_is_volunteer()));

comment on policy projects_select_assigned_volunteer on public.projects is
  'A project is visible to the volunteer who holds its developer seat (REQ-001, AT-001.23).';

create policy organizations_select_platform_admin
  on public.organizations
  for select
  to authenticated
  using ((select public.viewer_is_platform_admin()));

comment on policy organizations_select_platform_admin on public.organizations is
  'An organisation is visible to a platform administrator (REQ-001, AT-001.40).';

create policy org_memberships_select_platform_admin
  on public.org_memberships
  for select
  to authenticated
  using ((select public.viewer_is_platform_admin()));

comment on policy org_memberships_select_platform_admin on public.org_memberships is
  'A seat is visible to a platform administrator (REQ-001, AT-001.40).';

create policy projects_select_platform_admin
  on public.projects
  for select
  to authenticated
  using ((select public.viewer_is_platform_admin()));

comment on policy projects_select_platform_admin on public.projects is
  'A project is visible to a platform administrator (REQ-001, AT-001.40).';

create policy acknowledgments_select_platform_admin
  on public.acknowledgments
  for select
  to authenticated
  using ((select public.viewer_is_platform_admin()));

comment on policy acknowledgments_select_platform_admin on public.acknowledgments is
  'An acknowledgment is visible to a platform administrator (REQ-001, AT-001.40).';

notify pgrst, 'reload schema';
