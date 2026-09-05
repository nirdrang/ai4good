-- REQ-001 tenant read posture and organisation-member policies (AT-001.21, AT-001.22).
--
-- Client privilege posture, stated once. The two catalog checks test this paragraph:
--   * `anon` holds nothing on any table in `public`. The public surface is a function, never a grant.
--     Static: remaining anon privileges are empty; a `grant ... to anon` is a problem.
--     Live: every table privilege via `has_table_privilege` is false for `anon`.
--   * `authenticated` holds `SELECT` and nothing else, and only on a table where a policy runs.
--     Static: remaining authenticated privileges are exactly `{select}` on an isolated table
--     and `{}` on an unreachable one. Live: the same sets via `has_table_privilege`.
--   * `service_role` keeps SELECT on `accounts` and `org_memberships` (the two reads the
--     deployed write functions make) and holds no INSERT, UPDATE, DELETE or TRUNCATE anywhere.
--     Static refuses those four write privileges. Live pins the exact remaining sets.
--   * No table carries `FORCE ROW LEVEL SECURITY`; the operator connection bypasses.
--     Static refuses `force row level security`. Live reads `relforcerowsecurity`.
-- The static scan overlays later statements over earlier ones, including drop, disable, alter
-- and force; it requires `revoke all ... from anon, authenticated` after every catalog
-- table's `create table`; it refuses `grant ... to public`, `grant ... on all tables`, and
-- `alter default privileges`; a policy `to anon`, `for all`, or with a tautological USING
-- is a problem; every USING must name `auth.uid()` or a `public.viewer_` function; every
-- SECURITY DEFINER function needs a revoke of EXECUTE from `public`. The live read walks
-- `public` tables both ways, so a table the catalog does not name is a problem, and it
-- pins `has_function_privilege` EXECUTE for `anon` and `authenticated` on every definer
-- function to the `viewer_` set.
--
-- Policy helpers a policy's USING calls are named `viewer_`, are SECURITY DEFINER with
-- `SET search_path = ''`, take no argument that names another person, and are granted
-- EXECUTE to `authenticated`. Every other function stays `service_role` only.
--
-- SUPERSEDED CLAIMS IN EARLIER MIGRATIONS, which this file must not edit:
--   * `20260808120000_accounts_org_membership_and_acknowledgments.sql` said the other
--     three tables get no grant and are unreachable through the Data API. `organizations`,
--     `org_memberships` and `acknowledgments` now hold SELECT for `authenticated`, filtered
--     by policy.
--   * `20260811130000_single_seat_org_and_single_developer_projects.sql` said `projects`
--     has no policies and reaches no Data API role, and that a catalog check for the
--     three client roles on that table must return zero rows. `projects` now has SELECT
--     for `authenticated` and policies that admit an organisation member, the assigned
--     volunteer, and a platform administrator.
-- The `select, insert` grant on accounts to authenticated from the first migration is gone.
-- It served one superseded proof (`loop/items/AI4DEV-57/proof-local.ts`). That script's
-- `authenticated` arm no longer holds: without the grant, a client-key insert is refused
-- as permission denied rather than as a row-level-security violation. The correction of
-- that script is not this leaf's. Grep of `tests/` on 2026-09-05 found zero bodies pinning
-- the row-level-security message on a client-key insert into `accounts`.

revoke all on table public.accounts, public.organizations, public.org_memberships,
                    public.acknowledgments, public.volunteer_profiles, public.projects
  from anon, authenticated;

revoke all on table public.accounts, public.organizations, public.org_memberships,
                    public.acknowledgments, public.volunteer_profiles, public.projects
  from service_role;

grant select on public.organizations   to authenticated;
grant select on public.org_memberships to authenticated;
grant select on public.projects        to authenticated;
grant select on public.acknowledgments to authenticated;

grant select on public.accounts        to service_role;
grant select on public.org_memberships to service_role;

-- Cuts the recursion a policy on org_memberships would otherwise hit: the policy asks this
-- function, and this function reads org_memberships as the definer, not as the querying role.
create function public.viewer_is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.org_memberships m
     where m.org_id = p_org_id
       and m.account_id = (select auth.uid())
  );
$$;

comment on function public.viewer_is_org_member(uuid) is
  'True when the calling user holds a seat in that organisation (REQ-001, AT-001.21). Answers only about auth.uid().';

revoke execute on function public.viewer_is_org_member(uuid) from public;
grant execute on function public.viewer_is_org_member(uuid) to authenticated, service_role;

create policy organizations_select_org_member
  on public.organizations
  for select
  to authenticated
  using (public.viewer_is_org_member(id));

comment on policy organizations_select_org_member on public.organizations is
  'An organisation is visible to an account seated in it (REQ-001, AT-001.21).';

create policy org_memberships_select_org_member
  on public.org_memberships
  for select
  to authenticated
  using (public.viewer_is_org_member(org_id));

comment on policy org_memberships_select_org_member on public.org_memberships is
  'A seat is visible to an account seated in that organisation (REQ-001, AT-001.21).';

create policy projects_select_org_member
  on public.projects
  for select
  to authenticated
  using (public.viewer_is_org_member(org_id));

comment on policy projects_select_org_member on public.projects is
  'A project is visible to an account seated in the owning organisation (REQ-001, AT-001.21).';

create policy acknowledgments_select_own_account
  on public.acknowledgments
  for select
  to authenticated
  using (account_id = (select auth.uid()));

comment on policy acknowledgments_select_own_account on public.acknowledgments is
  'An acknowledgment is visible to the account that made it (REQ-001, AT-001.21).';

-- One row, no table grant to service_role for it. EXECUTE is service_role only, matching
-- every other non-viewer function.
create function public.read_public_project(p_project_id uuid)
returns table (project_id uuid, project_name text, organization_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, o.name
    from public.projects p
    join public.organizations o on o.id = p.org_id
   where p.id = p_project_id;
$$;

comment on function public.read_public_project(uuid) is
  'The public project page source: project id, project name, organisation name (REQ-001, AT-001.22).';

revoke execute on function public.read_public_project(uuid) from public;
grant execute on function public.read_public_project(uuid) to service_role;

create index projects_assigned_volunteer_id_idx on public.projects (assigned_volunteer_id);

notify pgrst, 'reload schema';
