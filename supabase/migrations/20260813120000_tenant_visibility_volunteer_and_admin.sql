-- REQ-001 D5.L2 — the tenant-visibility branches that GRANT: the assigned volunteer and the platform
-- administrator.
--
-- IT ADDS BRANCHES; IT REPLACES NOTHING. Several permissive `select` policies on one table are OR'd,
-- so every policy `20260812120000_tenant_isolation_policy_set.sql` created still stands and each
-- policy below widens the admitted set by exactly one clause. The rule that put these here rather
-- than in that file is gate-1 ruling 7: A SLICE DOES NOT SHIP A POLICY BRANCH IT DOES NOT TEST. The
-- previous slice shipped the organisation-member branch, which AT-001.21's own Data API control
-- exercises; the two branches below are the ones AT-001.23 and AT-001.40 exercise, and they land in
-- the slice that carries those criteria.
--
-- ============================================================================================
-- WHAT IS DELIBERATELY ABSENT FROM THIS FILE
-- ============================================================================================
--
-- NO NEW TABLE GRANT. The previous migration granted `select` on all four tenant tables to
-- `authenticated`, and a platform administrator authenticates as an ordinary user in that role — it
-- holds no database role of its own. What makes it an administrator is one row in `public.accounts`,
-- which is what the helper below reads. So there is nothing to grant here.
--
-- NOTHING IS GRANTED TO `anon`, for the reason the previous migration states: the public surface of
-- this product is an edge function (`public-project-page`), never a table. AT-001.17's second arm
-- asserts that the publishable key still answers 401 `permission denied` on
-- `GET /rest/v1/org_memberships`, and it still does.
--
-- NO INSERT, UPDATE OR DELETE ANYWHERE. Every write in this schema goes through a `security definer`
-- function. These are read policies and nothing else.

/* ============================================================ the policy helper ================ */

-- WHY A DEFINER FUNCTION AND NOT AN INLINE SUBQUERY, which is the same reason
-- `public.viewer_is_org_member` gives and one reason more. `public.accounts` carries row-level
-- security with NO policy, so it reaches no row through a client key at all; a policy expression that
-- read that table as the querying role would therefore see nothing and every administrator would be
-- refused. A `security definer` function runs as its owner, whose reads are not subject to row-level
-- security, so the read succeeds without opening `public.accounts` to anybody.
--
-- IT TAKES NO ARGUMENT, and that is the device rather than a convenience. There is nowhere in the
-- signature to name a person, so the only question it can answer is "is the CALLER an administrator".
-- That is what makes the remote-procedure exposure below safe: a caller learns its own standing,
-- which it already knows.
--
-- THE ACCOUNT TYPE IS COMPARED AS THE ENUM IT IS, spelled with its schema, because `search_path` is
-- empty and an unqualified type name would not resolve.
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

-- THE REVOKE-THEN-GRANT POSTURE, AND THE SECOND HALF IS THE PART A COPY WOULD GET WRONG.
--
-- PostgreSQL grants EXECUTE on a new function to PUBLIC by default and every Data API role inherits
-- it, so the revoke is what closes the default. THE GRANT TO `authenticated` IS MANDATORY: a policy
-- expression is evaluated AS THE QUERYING ROLE, so the querying role needs EXECUTE on any function
-- the policy calls. Copying the service-role-only posture the write-path definer functions use would
-- make every read below fail with a permission error on the function instead of answering.
--
-- THE RESULTING REMOTE-PROCEDURE EXPOSURE LEAKS NOTHING. The function answers only about
-- `auth.uid()` and takes no argument, so the most a caller can learn by calling it directly is
-- whether IT is an administrator.
revoke execute on function public.viewer_is_platform_admin() from public;
grant execute on function public.viewer_is_platform_admin() to authenticated, service_role;

/* ================================================ the assigned developer's branch ============== */

-- AT-001.23's grant, and it is the exact counterpart of AT-001.22's denial: a project's working data
-- is readable by THAT project's assigned developer. `assigned_volunteer_id` is one nullable column
-- holding at most one account, so this clause admits one person per project and there is no
-- collaborator seat for a second to occupy.
--
-- A FREE SEAT ADMITS NOBODY. `assigned_volunteer_id` is null while the seat is free, and `null =
-- auth.uid()` is null rather than true, so an unassigned project stays unreadable through this
-- branch. That is the fail-closed direction and it is a property of the comparison rather than a
-- guard somebody added.
create policy projects_select_assigned_volunteer
  on public.projects
  for select
  to authenticated
  using (assigned_volunteer_id = (select auth.uid()));

comment on policy projects_select_assigned_volunteer on public.projects is
  'A project is readable by the volunteer assigned to it (REQ-001, AT-001.23).';

/* ================================================ the administrator's reach ==================== */

-- AT-001.40 AND THE FOUNDER'S d65 RULING: the platform administrator's role spans all accounts, so
-- one policy per tenant table admits every row of it. FOUR POLICIES RATHER THAN ONE WIDER CLAUSE
-- ADDED TO THE EXISTING ONES: a separate policy leaves each existing tenant rule readable exactly as
-- it was written, and the conformance arm can then say which clause admits a reader by name.
--
-- THE REACH IS NOT NARROWED PER SCOPE, deliberately. `visibility.ts`'s administrator branch does not
-- read the scope either, and narrowing it here would build a rule the founder ruled against.

create policy organizations_select_platform_admin
  on public.organizations
  for select
  to authenticated
  using (public.viewer_is_platform_admin());

comment on policy organizations_select_platform_admin on public.organizations is
  'Every organisation is readable by a platform administrator (REQ-001, AT-001.40, founder d65).';

create policy org_memberships_select_platform_admin
  on public.org_memberships
  for select
  to authenticated
  using (public.viewer_is_platform_admin());

comment on policy org_memberships_select_platform_admin on public.org_memberships is
  'Every seat is readable by a platform administrator (REQ-001, AT-001.40, founder d65).';

create policy projects_select_platform_admin
  on public.projects
  for select
  to authenticated
  using (public.viewer_is_platform_admin());

comment on policy projects_select_platform_admin on public.projects is
  'Every project is readable by a platform administrator (REQ-001, AT-001.40, founder d65).';

create policy acknowledgments_select_platform_admin
  on public.acknowledgments
  for select
  to authenticated
  using (public.viewer_is_platform_admin());

comment on policy acknowledgments_select_platform_admin on public.acknowledgments is
  'Every acknowledgment is readable by a platform administrator (REQ-001, AT-001.40, founder d65).';

-- `public.accounts` AND `public.volunteer_profiles` STILL GET NO POLICY, and the absence is the same
-- deliberate one the previous migration records. Neither table holds data belonging to one tenant in
-- the sense the criteria use, and no criterion in this leaf asks a client key to read either. The
-- conformance arm classifies both as unreachable by the client roles and states which of the two
-- reasons applies to each.

-- POSTGREST CACHES THE SCHEMA, AND BOTH HALVES OF THE REASON MATTER HERE.
--
-- THE FUNCTION IS THE HALF THAT NEEDS THIS. `public.viewer_is_platform_admin()` joins the schema
-- PostgREST exposes, so its cache must be told the function exists; without the reload the cache
-- describes a schema this migration has already changed.
--
-- THE POLICIES ARE THE HALF THAT DOES NOT. A policy is not in that cache at all — PostgreSQL applies
-- it inside the query planner on every request, as the querying role, so the four policies above take
-- effect on the next statement whatever any cache holds. The notify is here for the function and is
-- stated as being for the function, rather than left to read as though a policy needed it.
notify pgrst, 'reload schema';
