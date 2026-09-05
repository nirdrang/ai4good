-- REQ-001 tenant read posture and organisation-member policies (AT-001.21, AT-001.22).
--
-- Client privilege posture, stated once. The static catalog scan and the live catalog
-- read both test this paragraph rather than a second copy of it:
--   * `anon` holds nothing on any table in `public`. The public surface is a function, never a grant.
--   * `authenticated` holds `SELECT` and nothing else, and only on a table where a policy runs.
--   * `service_role` keeps the two reads the deployed write functions make (`accounts`,
--     `org_memberships`) and holds no `INSERT`, `UPDATE` or `DELETE` anywhere.
--   * No table carries `FORCE ROW LEVEL SECURITY`; the operator connection bypasses.
--
-- Policy helpers a policy's USING calls are named `viewer_`, are SECURITY DEFINER with
-- `SET search_path = ''`, take no argument that names another person, and are granted
-- EXECUTE to `authenticated`. Every other function stays `service_role` only.
--
-- The `select, insert` grant on accounts to authenticated from the first migration is gone.
-- It served one superseded proof (`loop/items/AI4DEV-57/proof-local.ts`). Grep of `tests/`
-- on 2026-09-05 found zero bodies pinning the row-level-security message on a client-key
-- insert into `accounts`.

/* ======================================================= 1. normalise client privileges ==== */

revoke all on table public.accounts, public.organizations, public.org_memberships,
                    public.acknowledgments, public.volunteer_profiles, public.projects
  from anon, authenticated;

grant select on public.organizations   to authenticated;
grant select on public.org_memberships to authenticated;
grant select on public.projects        to authenticated;
grant select on public.acknowledgments to authenticated;

/* ======================================================= 2. the viewer predicate =========== */

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

/* ======================================================= 3. the policies =================== */

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

/* ======================================================= 4. the public page's source ======= */

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

/* ======================================================= 5. indexes the lookups want ======= */

create index org_memberships_account_id_idx on public.org_memberships (account_id);
create index projects_assigned_volunteer_id_idx on public.projects (assigned_volunteer_id);

notify pgrst, 'reload schema';
