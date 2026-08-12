-- REQ-001 D5.L1 — the tenant-isolation policy set, organisation-member branch.
--
-- THE FIRST POLICIES IN THIS REPOSITORY. Row-level security has been ON since the first migration
-- with ZERO policies, on purpose: that denies everybody, which is the safe default and is NOT the
-- requirement. AT-001.21 and AT-001.22 need the right tenant to READ and the wrong one to be denied,
-- so this migration both GRANTS and DENIES.
--
-- ============================================================================================
-- WHAT IS DELIBERATELY ABSENT FROM THIS FILE, AND WHERE IT LANDS
-- ============================================================================================
--
-- `public.viewer_is_platform_admin()`, the assigned-volunteer policy on `public.projects` and the
-- platform-admin policies are NOT here. They are the next migration's, and the rule that puts them
-- there is: A SLICE DOES NOT SHIP A POLICY BRANCH IT DOES NOT TEST. Several permissive `select`
-- policies on one table are OR'd, so the set splits cleanly by BRANCH rather than by table — the
-- branch below is the one AT-001.21's own Data API control exercises, and the branches that admit a
-- volunteer and an administrator are exercised by AT-001.23 and AT-001.40 in the slice that ships
-- them. Until then a volunteer and an administrator are denied at the Data API because no policy
-- admits them, which is exactly what this slice's denials assert.
--
-- NOTHING IS GRANTED TO `anon`. The public surface of this product is an edge function
-- (`public-project-page`), never a table. AT-001.17's second arm asserts that
-- `GET /rest/v1/org_memberships` with the publishable key still answers 401 `permission denied`, and
-- it still does: `anon` receives no grant here.
--
-- ============================================================================================
-- THIS MIGRATION REVERSES AN EXPLICIT REVOKE, AND NAMES IT
-- ============================================================================================
--
-- `20260811130000_single_seat_org_and_single_developer_projects.sql` line 123 carries
--
--     revoke all on table public.projects from anon, authenticated, service_role;
--
-- and its comment gives the reason: no PostgREST route reached that table, and Supabase's ALTER
-- DEFAULT PRIVILEGES had granted REFERENCES, TRIGGER and TRUNCATE to all three roles, which
-- row-level security does not cover. A later migration overriding an earlier one is ordinary; a
-- SILENT reversal of a deliberate revoke is not, so it is named here.
--
-- WHY THE GRANT IS NOW CORRECT. The revoke's stated premise was that nothing reaches the table
-- through the Data API. This leaf changes that premise: AT-001.21 probes `public.projects` by
-- identifier and AT-001.22 reads a project, so the table now has a client-facing read, and a read
-- denied at the PRIVILEGE layer would mean row-level security never ran at all. What is granted back
-- is `select` and nothing else — strictly narrower than the default privileges the revoke removed,
-- so REFERENCES, TRIGGER and TRUNCATE stay revoked for all three roles.

/* ============================================================ the policy helper ================ */

-- WHY A DEFINER FUNCTION AND NOT AN INLINE SUBQUERY. A `select` policy ON `public.org_memberships`
-- that read `public.org_memberships` would recurse into itself: evaluating the policy runs the
-- subquery, which is a read of the same table, which evaluates the policy again. A `security definer`
-- function runs as its owner, whose reads are not subject to row-level security, so the recursion is
-- cut structurally rather than by a flag somebody sets.
--
-- IT ANSWERS ONLY ABOUT `auth.uid()`, which is what makes the remote-procedure exposure below safe:
-- there is no argument by which a caller can ask about somebody else's standing. A caller learns
-- whether IT is seated in an organisation, which it already knows.
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
  'True when the calling user holds a membership row in that organisation (REQ-001, AT-001.21). Answers only about auth.uid().';

-- THE REVOKE-THEN-GRANT POSTURE, AND THE SECOND HALF IS THE PART A COPY WOULD GET WRONG.
--
-- PostgreSQL grants EXECUTE on a new function to PUBLIC by default and every Data API role inherits
-- it, so the revoke is what closes the default. That much is the posture every definer function in
-- this tree already has.
--
-- THE GRANT TO `authenticated` IS MANDATORY HERE, and copying the existing service-role-only posture
-- would BREAK the policies below. A policy expression is evaluated AS THE QUERYING ROLE, so the
-- querying role needs EXECUTE on any function the policy calls; without this grant every read below
-- would fail with a permission error on the function instead of answering.
revoke execute on function public.viewer_is_org_member(uuid) from public;
grant execute on function public.viewer_is_org_member(uuid) to authenticated, service_role;

/* ============================================================ the privileges ==================== */

-- WHY A GRANT COMES BEFORE A POLICY, measured rather than reasoned and recorded in the first
-- migration's own comment: `[api] auto_expose_new_tables` is unset in `supabase/config.toml`, so a
-- table is NOT reachable through the Data API roles without an explicit grant. Left ungranted, a
-- client read fails at the PRIVILEGE layer and row-level security is never consulted — so "denied by
-- row-level security" would be a claim about a mechanism that did not run, and AT-001.21's denial
-- would be measuring the tree's emptiness.
grant select on public.organizations to authenticated;
grant select on public.org_memberships to authenticated;
grant select on public.acknowledgments to authenticated;
grant select on public.projects to authenticated;

-- THE SERVICE ROLE READS FOR THE THREE NEW EDGE FUNCTIONS, and it needs the privilege even though it
-- bypasses row-level security: bypassing a policy is not holding a table privilege.
-- `public.accounts` and `public.org_memberships` already carry this grant from earlier migrations —
-- `organizations` and `projects` did not, and `organization-dashboard`, `project-workspace` and
-- `public-project-page` read both.
--
-- STILL NO INSERT, UPDATE OR DELETE ANYWHERE. Every write in this schema goes through a SECURITY
-- DEFINER function, which is what stops the service-role key writing past `complete_signup`'s own
-- refusals. These two statements are reads and nothing else.
grant select on public.organizations to service_role;
grant select on public.projects to service_role;

/* ============================================================ the policies ====================== */

-- ONE `select` POLICY PER TABLE, EACH NAMING ITS OWN TENANT KEY. Every one of them is a claim a
-- reader can check against the criterion: an account reads the organisation it is seated in, that
-- organisation's seat, that organisation's projects, and its OWN acknowledgments.
--
-- NO `using (true)` ANYWHERE, and the conformance arm of the next slice refuses one. A policy that
-- admits every row satisfies "the table carries a select policy" while exposing everything, which is
-- the difference between isolation and the appearance of it.

create policy organizations_select_org_member
  on public.organizations
  for select
  to authenticated
  using (public.viewer_is_org_member(id));

comment on policy organizations_select_org_member on public.organizations is
  'An organisation is readable by the accounts seated in it (REQ-001, AT-001.21).';

create policy org_memberships_select_org_member
  on public.org_memberships
  for select
  to authenticated
  using (public.viewer_is_org_member(org_id));

comment on policy org_memberships_select_org_member on public.org_memberships is
  'An organisation''s seat is readable by the accounts seated in that organisation (REQ-001, AT-001.21).';

create policy projects_select_org_member
  on public.projects
  for select
  to authenticated
  using (public.viewer_is_org_member(org_id));

comment on policy projects_select_org_member on public.projects is
  'A project is readable by the accounts seated in its owning organisation (REQ-001, AT-001.21).';

-- ACKNOWLEDGMENTS ARE KEYED ON THE ACCOUNT, NOT ON AN ORGANISATION, so this one policy does not call
-- the helper. `public.acknowledgments` holds a PLATFORM-level record of one person accepting the ToS
-- and the Platform Promise; it has no `org_id` and belongs to no organisation. "Your own
-- acknowledgments and nobody else's" is both the honest tenant rule for this table and strictly
-- tighter than an organisation-wide one — which is what AT-001.21 needs, since NGO B must not read
-- NGO A's acknowledgment row.
create policy acknowledgments_select_own_account
  on public.acknowledgments
  for select
  to authenticated
  using (account_id = (select auth.uid()));

comment on policy acknowledgments_select_own_account on public.acknowledgments is
  'An acknowledgment is readable by the account that made it (REQ-001, AT-001.21).';

-- `public.accounts` GETS NO POLICY, and its absence is deliberate rather than forgotten. It carries
-- `grant select, insert … to authenticated` from the first migration and row-level security with no
-- policy, so it reaches NO row through a client key — which is the state the first migration chose
-- and no criterion in this leaf asks to change. `public.volunteer_profiles` is unreachable a
-- different way, by `revoke all`. The conformance arm of the next slice classifies both, and it needs
-- both tests because a grant check alone would call `accounts` reachable.

-- PostgREST caches the schema. Without this, the first read of a freshly granted table can answer out
-- of a stale cache rather than out of the catalog this migration just changed.
notify pgrst, 'reload schema';
