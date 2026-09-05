# Candidate design

Direction D, viewer-scope-first. One `SECURITY DEFINER` function computes the caller’s whole reach once. Policies, edge reads, and the route classifier consume that value. TypeScript does not compute membership.

---

## Problem

Five acceptance ids in section E of `.taskmaster/docs/acceptance/at-req-001.md` must gain a tenant read path. The tree has six `public` tables with row-level security on and zero policies. Client roles hold almost no privileges. Three edge functions only write. The front end is one heading. Direct probing today is either a privilege denial or an operator read that bypasses row-level security.

The ids, verbatim:

- **AT-001.21 (P0)** — Given NGO A and NGO B, When NGO B's account requests NGO A's non-public data (drafts, ledger, files, thread, dashboard) by UI or direct API/ID probing, Then access is denied and nothing leaks (no existence oracle beyond public surfaces).
- **AT-001.22 (P0)** — Given a volunteer not assigned to a project, When they request that project's non-public data (reference files, thread), Then access is denied; the public project page remains visible [cross: REQ-010].
- **AT-001.23 (P0)** — Given the assigned volunteer of a project, When they request that project's working data (reference files, thread, tasks), Then access succeeds, scoped to that project only.
- **AT-001.40 (P0)** — Given a platform admin, When they request any NGO's or project's data (drafts, ledger, files, thread, dashboard), Then access succeeds — the admin role spans all accounts. [d65]
- **AT-001.24 (P0)** — Given a logged-out visitor, When they browse, Then only public surfaces render (listings, project pages); every authenticated surface redirects to sign-in.

The shape is non-obvious for four reasons. Account type is not in the JWT, so a policy cannot read it from the token. A policy on `org_memberships` that reads `org_memberships` recurses unless a definer helper cuts the loop. Boolean helpers of the form `viewer_is_org_member(uuid)` are correlated per row, so listing cost grows with table size. The named surfaces (drafts, ledger, files, thread, tasks, dashboard pages) have no table and no route; this pull request cannot touch `src/`. The lead rulings bind a single SQL rule exercised as the caller, no TypeScript tenant-decision clone, no loop Map that mirrors policies, a catalog tripwire, a structural no-oracle constant, and AT-001.24 red at both tiers as `CapabilityPending` on the UI-rendering capability.

Direction D’s load-bearing move: compute one `ViewerScope` value per statement and make every consumer probe it. The computation has one home. Cheapness is a property of that home (one uncorrelated `STABLE` init-plan, then in-memory array probes), not a cache somebody adds later.

---

## Usage (caller's view)

A caller never asks “may I read this org?” as a second product rule. The database already filtered. The UI never talks to PostgREST. Three call sites, then the types.

### 1. An authenticated edge read (organisation dashboard)

```ts
// supabase/functions/organization-dashboard/index.ts
import {
  edgeHandler, json, readJsonBody, refusal, requireEnv, resolveCaller, readAsCaller,
} from '../_shared/edge.ts';
import {
  TENANT_NOT_FOUND,
  shapeOrganizationDashboard,
} from '../_shared/viewer-scope.ts';

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const ANON_KEY = requireEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');

Deno.serve(edgeHandler('organization-dashboard', async (request) => {
  if (request.method !== 'POST') return refusal('organization-dashboard accepts POST only', 405);
  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
  if (!caller) return refusal('authenticate before reading an organisation dashboard', 401);

  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);
  const organizationId = /* trim string or 400 */;

  // Caller JWT, not service role. RLS probes viewer_scope() once per statement.
  const read = await readAsCaller(
    SUPABASE_URL, ANON_KEY, request.headers.get('Authorization')!,
    `organizations?id=eq.${encodeURIComponent(organizationId)}&select=id,name`,
  );
  if (!read.ok) return json({ ok: false, reason: 'the organisation dashboard could not read what it needs, so no decision was made' }, 502);

  const org = read.rows[0] ?? null;
  const seatRead = await readAsCaller(/* org_memberships?org_id=eq.… */);
  const projectRead = await readAsCaller(/* projects?org_id=eq.… */);
  // Target organisation row is already in hand. Further reads are of OTHER tables
  // keyed on the request id, so an outage cannot depend on whether that org exists
  // as a 404-vs-502 split: empty vs missing already collapsed in `org === null`.

  const outcome = shapeOrganizationDashboard(caller, org, seatRead.rows, projectRead.rows);
  // ONE return for "no such row" and "not yours": TENANT_NOT_FOUND. No second refusal.
  return json(outcome.body, outcome.status);
}));
```

### 2. A policy (the same value, in SQL)

```sql
-- Evaluated as `authenticated`. viewer_scope() is STABLE and uncorrelated.
-- The scalar subquery is an InitPlan: one computation per statement, not per row.
create policy organizations_select_in_scope
  on public.organizations
  for select
  to authenticated
  using (
    (select id = any (s.organization_ids)
       from public.viewer_scope() as s)
  );
```

A later table (drafts, ledger, files, thread) joins by writing the same probe against its tenant key. It does not invent a new helper.

### 3. The front end, on the day screens land (this pull request does not touch `src/`)

```ts
// future src/routes/_authenticated.tsx — a src-only pull request imports this
import { classifyRoute, type ViewerScope } from '../../supabase/functions/_shared/viewer-scope.ts';

const scope: ViewerScope | null = session
  ? await api.viewerScope()   // POST /functions/v1/viewer-scope, caller JWT
  : null;

const decision = classifyRoute(scope, {
  kind: 'organization-dashboard',
  organizationId,
});
// logged out → { action: 'redirect-to-sign-in', to: '/sign-in' }
// in scope or platform admin → { action: 'render' }
// signed in, out of scope → { action: 'not-found' }  // same as missing
```

`classifyRoute` does not recompute membership. It probes fields SQL already filled. AT-001.24 stays red until a router actually runs this. The module exists so that pull request has something to import without crossing the territory guard.

### What the caller does not do

- Import `tenantReadAllowed`. That function is not in this design.
- Send the service-role key from a browser or from an authenticated edge read.
- Branch on “not found” vs “forbidden” for a non-public read.

---

## Shape

### Core type: one snapshot of reach

```ts
// supabase/functions/_shared/viewer-scope.ts
// Constraints: no non-relative imports, no Deno, no I/O, no clock.

/** The caller's whole reach. SQL computes it. Everyone else probes it. */
export type ViewerScope = {
  accountId: string;
  isPlatformAdmin: boolean;
  /** Organisations this caller holds a membership row in. Empty for a platform admin. */
  organizationIds: readonly string[];
  /**
   * Projects this caller holds as assigned volunteer.
   * Empty unless the account type is volunteer. Empty for a platform admin.
   */
  assignedProjectIds: readonly string[];
};

/**
 * Parse the PostgREST / RPC JSON into ViewerScope, or null.
 * The wire is untrusted. Fail closed on any missing or mistyped field.
 */
export function parseViewerScope(raw: unknown): ViewerScope | null {
  throw new Error('not implemented');
}

/**
 * THE ONE ANSWER a non-public read surface gives when it does not answer.
 * 404, not 403: a 403 says something is there to forbid.
 * Returned, never thrown: edgeHandler turns throws into 502.
 */
export const TENANT_NOT_FOUND = {
  status: 404,
  body: {
    ok: false as const,
    reason:
      'no such thing is visible to this caller — it does not exist, or it exists and is not yours, ' +
      'and this answer deliberately does not say which',
  },
} as const;

export type TenantReadOutcome =
  | { ok: true; status: 200; body: Record<string, unknown> }
  | { ok: false; status: 401 | 404 | 502; body: { ok: false; reason: string } };

/**
 * Shape a dashboard from rows the caller-bound read already filtered.
 * `organization === null` covers both missing and not-yours. There is no second refusal.
 */
export function shapeOrganizationDashboard(
  caller: { id: string } | null,
  organization: { id: unknown; name: unknown } | null,
  seats: readonly Record<string, unknown>[],
  projects: readonly Record<string, unknown>[],
): TenantReadOutcome {
  throw new Error('not implemented');
}

export function shapeProjectWorkspace(
  caller: { id: string } | null,
  project: { id: unknown; name: unknown; org_id: unknown; assigned_volunteer_id: unknown } | null,
): TenantReadOutcome {
  throw new Error('not implemented');
}

export type PublicProjectView = {
  projectId: string;
  projectName: string;
  organizationName: string;
};

/**
 * Whether a project row may be shown to the world.
 * Today: true for every row. The lifecycle column does not exist.
 * Owning requirement: the public listings / project-page requirement (REQ-010).
 * When that requirement starts returning false, public-project-page returns TENANT_NOT_FOUND.
 */
export function projectIsPubliclyListed(_project: { id: string }): boolean {
  return true;
}

/** Field-by-field. Copies nothing wholesale, so a new column cannot leak. */
export function publicProjectView(
  project: { id: string; name: string },
  organization: { name: string },
): PublicProjectView {
  throw new Error('not implemented');
}

export const SIGN_IN_PATH = '/sign-in' as const;

/**
 * Product routes, including stand-ins for tables this leaf does not have.
 * Exhaustive: a new surface is a new variant, and classifyRoute must name it.
 */
export type AppRoute =
  | { kind: 'landing' }
  | { kind: 'listings' }
  | { kind: 'public-project'; projectId: string }
  | { kind: 'sign-in' }
  | { kind: 'organization-dashboard'; organizationId: string }
  | { kind: 'project-workspace'; projectId: string }
  | {
      kind: 'stand-in';
      surface: 'drafts' | 'ledger' | 'files' | 'thread' | 'tasks' | 'dashboard';
      organizationId?: string;
      projectId?: string;
    };

export type RouteDecision =
  | { action: 'render' }
  | { action: 'redirect-to-sign-in'; to: typeof SIGN_IN_PATH }
  | { action: 'not-found' };

/**
 * UI consumer of ViewerScope. Does not compute membership.
 * Logged out + authenticated route → redirect to sign-in.
 * Signed in + out of scope → not-found (no oracle).
 * Platform admin → render every authenticated route.
 */
export function classifyRoute(scope: ViewerScope | null, route: AppRoute): RouteDecision {
  throw new Error('not implemented');
}
```

SQL companion, one composite, no per-row boolean helpers:

```sql
create type public.viewer_scope as (
  account_id uuid,
  is_platform_admin boolean,
  organization_ids uuid[],
  assigned_project_ids uuid[]
);

-- STABLE + no arguments + uncorrelated FROM: one InitPlan per statement.
-- SECURITY DEFINER: reads accounts / memberships / projects without RLS recursion
-- and without an own-row policy having to be in place first.
-- Takes no argument that names another person. Answers only about auth.uid().
create function public.viewer_scope()
returns public.viewer_scope
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    exists (
      select 1
        from public.accounts a
       where a.id = u.id
         and a.account_type = 'platform_admin'::public.account_type
    ),
    coalesce(
      (select array_agg(m.org_id)
         from public.org_memberships m
        where m.account_id = u.id),
      '{}'::uuid[]
    ),
    coalesce(
      (select array_agg(p.id)
         from public.projects p
         join public.accounts a on a.id = u.id
        where p.assigned_volunteer_id = u.id
          and a.account_type = 'volunteer'::public.account_type),
      '{}'::uuid[]
    )
  from (select auth.uid() as id) as u;
$$;
```

How it stays cheap and correct:

| Pressure | Response |
|---|---|
| Per-row `EXISTS` on every listing | Uncorrelated `viewer_scope()` in a scalar subquery. Planner builds an InitPlan. One computation per statement, then `= ANY (uuid[])` per row. |
| Platform admin listing every org | `is_platform_admin` is a flag. Arrays stay empty. The function does not `array_agg` the whole catalog for an admin. |
| Lookup by `account_id` on a PK of `(org_id, account_id)` | New index `org_memberships_account_id_idx`. New index `projects_assigned_volunteer_id_idx`. |
| Stale shared cache across requests | No cache. No GUC. No temp table. Two concurrent requests each compute their own snapshot. A membership write in another session is visible on the next statement, not mid-statement (`STABLE` = snapshot per statement). |
| TypeScript drifting from SQL | TypeScript never fills `organizationIds`. `parseViewerScope` only validates. `classifyRoute` only probes. The fill lives in `public.viewer_scope()`. |
| Recursion on `org_memberships` | Definer owner read. The function is not itself subject to the table’s policies. |

Per `boundary-discipline`: parse at the RPC/JSON boundary (`parseViewerScope`), trust `ViewerScope` inside. Per `encode-lessons-in-structure`: “no other-person argument” is the function signature; “no second refusal” is a single exported constant; “admin arrays stay empty” is the function body, not a comment on a boolean helper. Per `separate-before-serializing-shared-state`: there is no shared writable scope object. Per `make-operations-idempotent`: `CREATE OR REPLACE` on the function; named policies; grants are the end state of the privilege posture, not a delta somebody must apply in order.

### Read architecture (the project-rule conflict, closed)

The UI never touches the database. The UI calls an edge function with the caller JWT. The edge function forwards that same JWT to PostgREST (`apikey: <anon key>`, `Authorization: Bearer <caller token>`). Row-level security is the one enforcement point for the UI path and for direct probing. `resolveCaller` stays as the session-liveness gate. TypeScript holds no second tenant rule. Handlers shape rows the database already filtered.

The public project page is the exception that the criterion writes for itself (“no existence oracle beyond public surfaces”). `anon` holds zero table privileges, so that function reads with the service role, then applies `projectIsPubliclyListed` and `publicProjectView`. That service-role read survives because a table grant to `anon` would open every column, and a policy `using (true)` is what the catalog check refuses. The target project row is the first read; the organisation name is keyed on a column of that row. The surface makes no access decision, so there is no second answer for ordering to keep identical. Residual: an organisation-read outage answers 502 where a missing project answers 404. That discloses less than the 200 the surface already returns for a real project.

Write RPCs stay `service_role`-only. Reads as the caller do not change that.

### No-existence-oracle, structural

- One exported `TENANT_NOT_FOUND`. Handlers return it. They never throw it. There is nowhere to put a second refusal.
- Edge keyed read: caller-bound GET returns zero rows for “missing” and for “not yours”. Both become `TENANT_NOT_FOUND`. Read-order discipline is not required on this path, because the handler never learns existence except through a filtered read.
- PostgREST keyed GET as the caller: `[]` for both cases. Privilege denial is 401 with `permission denied` and must stay distinct from `[]`.
- Writes keep 403. A write names an action the caller tried to perform. A read names a resource the caller must not learn exists. The two vocabularies stay apart on purpose.
- The harness gains `functionPostRaw` so equality is over bytes, not parsed JSON.

### Route classification, without a file registry

Lead ruling 10 refuses a route registry no router imports. This direction still needs a UI consumer of `ViewerScope`. The consumer is a function of `(scope, AppRoute)`, not a map of `src/routes/*.tsx` file names. No scan of `src/` ships. AT-001.24 stays `CapabilityPending` at both tiers, capability `ui.logged-out-surface-rendering`. A later `src/`-only pull request imports `classifyRoute` and turns the id green. The tripwire for a new *table* is the catalog. The tripwire for a new *surface* is the `AppRoute` union: TypeScript exhaustiveness fails the build when `classifyRoute` does not name it.

### Privilege posture (stated once)

Revoke every client-role privilege on every existing `public` table, then grant exactly `SELECT` to `authenticated` where a policy will run. `anon` stays at zero on every table. The public surface is a function, not a grant. Restore `service_role` `SELECT` only where existing write-path lookups and the public project page need it. No `INSERT`/`UPDATE`/`DELETE` to any client role. No `FORCE ROW LEVEL SECURITY`. Drop the leftover `authenticated` `INSERT` on `accounts` (no body pins the old RLS-insert message). Own-row `SELECT` on `accounts` is added so a caller can read their own type through the Data API; it does not replace `viewer_scope()`, which still must read memberships and assignments as definer.

### Assignment is a volunteer seat

Unit 2 adds `project_assignee_must_be_volunteer`, the twin of `org_membership_grantee_must_be_ngo`. `viewer_scope()` also requires `account_type = volunteer` when filling `assigned_project_ids`. The trigger stops a bad write. The function stops a bad read if a write ever bypassed the trigger. One computation home, two layers, not two rules.

### Interface depth

Public surface: one SQL function, one composite, one parse, one refusal constant, two shapers, one public projection, one eligibility predicate, one `classifyRoute`. Behind that: InitPlan cheapness, definer reads, grant-then-policy, catalog tripwire, no-oracle collapse, volunteer-type conjunct, empty admin arrays. Callers do not coordinate those. That is a deep module. A family of `viewer_is_*` booleans would expose the questions and hide nothing about evaluation cost.

Deliberately not on the surface: PostgREST wire rows, `auth.uid()`, SQLSTATE, the catalog lists, the operator SQL client.

### Module map

```
supabase/migrations/20260905120000_tenant_viewer_scope_and_org_member_reads.sql   unit 1
supabase/migrations/20260905130000_tenant_viewer_scope_volunteer_and_admin.sql    unit 2
supabase/functions/_shared/viewer-scope.ts     types, parse, refusal, shapers, projection, classifyRoute
supabase/functions/_shared/edge.ts             + readAsCaller, + readWithServiceRole
supabase/functions/organization-dashboard/     verify_jwt = true
supabase/functions/project-workspace/          verify_jwt = true
supabase/functions/public-project-page/        verify_jwt = false
supabase/functions/viewer-scope/               verify_jwt = true, unit 2
supabase/config.toml                           four function blocks; correct the “all authenticated” comment
tests/at/harness/live-stack.ts                 + restGet + functionPostRaw
tests/at/suites/req-001/_catalog-conformance.ts
tests/at/harness/shipped-viewer-scope.selftest.ts
tests/at/harness/shipped-catalog-conformance.selftest.ts
```

Call chain for an authenticated read: handler → `resolveCaller` → `readAsCaller` → PostgREST/RLS/`viewer_scope()` → shaper. Three files, then SQL. No fourth policy module.

---

## Synthesis decision

*(empty — filled by the arena lead)*

---

## Tradeoffs accepted

- We accept 2–3 InitPlan evaluations of `viewer_scope()` per statement (one per permissive policy on a table) in exchange for named policy branches that split cleanly across the two units and that the catalog can name. A single `OR` policy would be one call and would force unit 2 to `DROP`/`CREATE` unit 1’s policy.
- We accept exposing `POST /rest/v1/rpc/viewer_scope` to `authenticated` in exchange for policies being able to `EXECUTE` it. Postgres cannot grant “usable from a policy, not from RPC”. The function returns only the caller’s own standing.
- We accept a service-role read on the public project page in exchange for keeping `anon` at zero table privileges. Direct probing as a logged-out visitor still fails at the privilege layer.
- We accept two refusal vocabularies (403 writes, 404 reads) in exchange for a read denial that carries no “this exists” signal.
- We accept shipping `classifyRoute` with no router importing it, in exchange for a later `src/`-only pull request having a territory-neutral import. We do **not** claim AT-001.24 green. We do **not** ship a file-name registry.
- We accept proving AT-001.21/.22/.23/.40 at loop over shapers, the refusal constant, the public projection, `parseViewerScope`, and `classifyRoute` with constructed scopes — not over a Map that reimplements `USING` clauses. Integration is the only tier that proves `public.viewer_scope()` and the policies.
- We accept empty `organization_ids` / `assigned_project_ids` for a platform admin in exchange for listing cost that does not scan the catalog. Admin reach is the flag, not the arrays.
- We accept own-row `SELECT` on `accounts` without an admin policy on that table. AT-001.40 names NGO and project data (dashboard, workspace), not a listing of every account row.
- We accept stand-in green over organisations, memberships, acknowledgments, volunteer-ineligible profiles, and a project’s identity plus assignee. Drafts, ledger, files, thread, and tasks do not exist.

---

## Alternatives considered

- **Per-row boolean helpers (`viewer_is_org_member(uuid)`, `viewer_is_platform_admin()`, `viewer_is_volunteer()`).** This is the reference branch’s SQL. Interface: one helper per question, each taking a row key or nothing. Callers (policies) coordinate OR-branches and must know which helper fits which table. Hidden: definer posture, grants. Exposed: evaluation shape — each helper is correlated, so a listing of N rows issues N membership lookups. Lost because Direction D’s whole claim is one snapshot, and because listing cost is then a property of table size rather than of the caller’s reach. (The helpers remain the right *fallback* if InitPlan ever fails to fire; the catalog can still demand `viewer_scope` by name.)
- **TypeScript `tenantReadAllowed(viewer, scope)` as the product rule, SQL as a backstop.** Deeper for loop-tier greens: one pure function the fixture can drive. Shallower as a system: two rules, and a drift between them is an isolation hole that loop cannot see. Lost because the lead ruling is one rule in SQL, and because Direction D’s TypeScript must consume a scope, not recompute it. The reference branch’s `TENANT_NOT_FOUND`, `publicProjectView`, and target-row-last notes are taken; `tenantReadAllowed` is not.
- **Own-row policy on `accounts` instead of any definer.** Smaller attack surface (no RPC). Cannot compute the caller’s memberships without reading `org_memberships` as the querying role, which recurses, and cannot read `account_type` of the caller from a policy on another table until that own-row policy exists — a bootstrap knot. Lost as a replacement. Taken as an *addition*: own-row `SELECT` on `accounts` plus `viewer_scope()` as definer.
- **Account type as a JWT claim.** Cheaper policies, staleness bounded by the two-minute token. Out of this item (auth configuration). Recorded under Not built here for the listings requirement.
- **A generated catalog that emits SQL, TypeScript, and tests.** One source, no drift. Exposes a generator and a DSL to every later table author. Hidden: the actual policy text, which a reviewer then cannot read in the migration. Lost for this leaf: six tables do not pay for a compiler. The catalog here is a tripwire, not a generator.

---

## Open questions and risks

- Does the planner actually build an InitPlan for `(select … from public.viewer_scope() s)` inside a policy `USING` on this Postgres version? If a listing of organisations still calls the function per row, do we wrap the call in a `SELECT` from a one-row CTE at the query site (PostgREST cannot), or do we add a `LANGUAGE plpgsql` wrapper that stores the composite in a statement-local variable?
- Does PostgREST return a composite RPC as a JSON object with the type’s field names, or as a one-element array? `parseViewerScope` must pin the measured shape at integration, not the documented one.
- Does a revoked-but-unexpired JWT still pass Kong `verify_jwt` and fail at `/auth/v1/user` as 401, and does a PostgREST GET with that token fail as 401 rather than as `[]`? The tenant bodies must keep 401 distinct from `[]`.
- When a later requirement adds Storage objects or Linear task reads, the table catalog will not catch them. Is the isolation matrix in “Not built here” enough, or does that requirement need its own tripwire kind?
- `classifyRoute` names `/sign-in` before that route exists. Is that constant a contract the auth-screens leaf must honour, or should the redirect target stay unnamed until that leaf?

---

## Next implementation step

Write `tests/at/harness/shipped-viewer-scope.selftest.ts` against `TENANT_NOT_FOUND` identity, `shapeOrganizationDashboard` collapsing missing and foreign to the same constant, `publicProjectView` field absences, `projectIsPubliclyListed` returning true, and `classifyRoute` on constructed scopes — then fill `viewer-scope.ts` until that selftest is green.

---

## Migration sketch

Two files. Unit 1 does not ship a policy branch it does not test. Unit 2 adds permissive OR-branches.

### Unit 1 — `20260905120000_tenant_viewer_scope_and_org_member_reads.sql`

```sql
-- REQ-001 tenant isolation, organisation-member branch.
--
-- PRIVILEGE POSTURE (the catalog check tests this paragraph):
--   1. Every client-role privilege on every existing public table is revoked.
--   2. authenticated receives SELECT only on tables that carry a SELECT policy in this
--      deliverable: accounts, organizations, org_memberships, acknowledgments, projects.
--   3. anon receives nothing on any table. The public surface is the edge function
--      public-project-page, not a grant.
--   4. service_role receives SELECT only where a write-path lookup or the public page
--      already needed it. No INSERT, UPDATE, or DELETE is granted to any of the three.
--   5. volunteer_profiles stays unreachable (revoke remains).
--
-- THIS FILE REVERSES two deliberate revokes, and names them:
--   20260809090000 … volunteer_profiles stays revoked.
--   20260811130000 line 123 revoked ALL on public.projects from anon, authenticated,
--   service_role. SELECT for authenticated (policy) and service_role (public page) returns.
--
-- WHAT IS ABSENT: platform-admin policies, assigned-volunteer policy, assignee-type
-- trigger. They land in the next migration, which is the unit that tests them.
-- Until then a volunteer and an administrator are denied at the Data API because no
-- policy admits them.

/* posture --------------------------------------------------------------- */

revoke all on table public.accounts from anon, authenticated, service_role;
revoke all on table public.organizations from anon, authenticated, service_role;
revoke all on table public.org_memberships from anon, authenticated, service_role;
revoke all on table public.acknowledgments from anon, authenticated, service_role;
revoke all on table public.volunteer_profiles from anon, authenticated, service_role;
revoke all on table public.projects from anon, authenticated, service_role;

-- Restore the write-path lookups. create-organization reads accounts;
-- update-organization reads org_memberships; both use the service role.
grant select on public.accounts to service_role;
grant select on public.org_memberships to service_role;
-- Public project page reads these with the service role. See the design's
-- "why this service-role read survives".
grant select on public.organizations to service_role;
grant select on public.projects to service_role;

grant select on public.accounts to authenticated;
grant select on public.organizations to authenticated;
grant select on public.org_memberships to authenticated;
grant select on public.acknowledgments to authenticated;
grant select on public.projects to authenticated;
-- no grant to anon
-- no INSERT restored on accounts

/* the one function ------------------------------------------------------ */

create type public.viewer_scope as (
  account_id uuid,
  is_platform_admin boolean,
  organization_ids uuid[],
  assigned_project_ids uuid[]
);

grant usage on type public.viewer_scope to authenticated;

create function public.viewer_scope()
returns public.viewer_scope
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    exists (
      select 1 from public.accounts a
       where a.id = u.id
         and a.account_type = 'platform_admin'::public.account_type
    ),
    coalesce(
      (select array_agg(m.org_id) from public.org_memberships m
        where m.account_id = u.id),
      '{}'::uuid[]
    ),
    coalesce(
      (select array_agg(p.id) from public.projects p
        join public.accounts a on a.id = u.id
       where p.assigned_volunteer_id = u.id
         and a.account_type = 'volunteer'::public.account_type),
      '{}'::uuid[]
    )
  from (select auth.uid() as id) as u;
$$;

comment on function public.viewer_scope() is
  'The caller''s whole read reach in one snapshot (REQ-001 D5). Answers only about auth.uid(). Platform-admin arrays stay empty; the flag is the reach.';

revoke execute on function public.viewer_scope() from public;
grant execute on function public.viewer_scope() to authenticated;
-- not to anon. not to service_role: a service-role call would see auth.uid() null.

create index org_memberships_account_id_idx on public.org_memberships (account_id);
create index projects_assigned_volunteer_id_idx on public.projects (assigned_volunteer_id);

/* policies: organisation-member branch + own-row ------------------------ */

-- Helper-naming rule this catalog check enforces: a definer a policy calls is
-- named viewer_*, SET search_path = '', takes no other-person argument, EXECUTE
-- granted to authenticated. viewer_scope() is that helper. There are no others.

create policy accounts_select_own
  on public.accounts
  for select
  to authenticated
  using (
    (select id = s.account_id from public.viewer_scope() as s)
  );

create policy organizations_select_in_scope
  on public.organizations
  for select
  to authenticated
  using (
    (select id = any (s.organization_ids) from public.viewer_scope() as s)
  );

create policy org_memberships_select_in_scope
  on public.org_memberships
  for select
  to authenticated
  using (
    (select org_id = any (s.organization_ids) from public.viewer_scope() as s)
  );

create policy projects_select_in_scope
  on public.projects
  for select
  to authenticated
  using (
    (select org_id = any (s.organization_ids) from public.viewer_scope() as s)
  );

-- Acknowledgments are keyed on the account, not an organisation.
create policy acknowledgments_select_own
  on public.acknowledgments
  for select
  to authenticated
  using (
    (select account_id = s.account_id from public.viewer_scope() as s)
  );

-- comments on each policy: -- TODO one sentence naming the criterion

notify pgrst, 'reload schema';
```

`anon` after this file: zero table privileges, zero execute on `viewer_scope`. `GET /rest/v1/org_memberships` with the publishable key still answers 401 `permission denied` (AT-001.17 arm 2 stays green).

### Unit 2 — `20260905130000_tenant_viewer_scope_volunteer_and_admin.sql`

```sql
-- REQ-001 tenant visibility, assigned-volunteer and platform-admin branches.
-- Adds policies. Replaces nothing. No new table grant. Nothing to anon.

/* assignee must be a volunteer ----------------------------------------- */

create function public.project_assignee_must_be_volunteer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_type public.account_type;
begin
  if new.assigned_volunteer_id is null then
    return new; -- offboarding stays allowed
  end if;
  -- TODO: look up accounts.account_type; 23503 if no row; 42501 if not volunteer
  return new;
end;
$$;

drop trigger if exists projects_assignee_must_be_volunteer on public.projects;
create trigger projects_assignee_must_be_volunteer
before insert or update of assigned_volunteer_id on public.projects
for each row
execute function public.project_assignee_must_be_volunteer();

revoke execute on function public.project_assignee_must_be_volunteer() from public;

/* assigned-volunteer branch -------------------------------------------- */

create policy projects_select_assigned
  on public.projects
  for select
  to authenticated
  using (
    (select id = any (s.assigned_project_ids) from public.viewer_scope() as s)
  );

/* platform-admin branch ------------------------------------------------ */

create policy organizations_select_platform_admin
  on public.organizations for select to authenticated
  using ((select s.is_platform_admin from public.viewer_scope() as s));

create policy org_memberships_select_platform_admin
  on public.org_memberships for select to authenticated
  using ((select s.is_platform_admin from public.viewer_scope() as s));

create policy projects_select_platform_admin
  on public.projects for select to authenticated
  using ((select s.is_platform_admin from public.viewer_scope() as s));

create policy acknowledgments_select_platform_admin
  on public.acknowledgments for select to authenticated
  using ((select s.is_platform_admin from public.viewer_scope() as s));

-- no platform-admin policy on accounts (AT-001.40 names NGO/project data)
-- no policy on volunteer_profiles

notify pgrst, 'reload schema';
```

---

## Read surfaces

| Surface | Inputs | Auth | Read path | Refusal | Ids |
|---|---|---|---|---|---|
| `POST /functions/v1/organization-dashboard` | `{ organizationId }` | `verify_jwt = true`; `resolveCaller` | `readAsCaller` on `organizations`, `org_memberships`, `projects` | 401 unauthenticated; **404 `TENANT_NOT_FOUND`** for missing and not-yours (same constant); 400 bad body; 502 outage | AT-001.21, AT-001.40; AT-001.23 negative (volunteer denied the org dashboard) |
| `POST /functions/v1/project-workspace` | `{ projectId }` | same | `readAsCaller` on `projects` | same 401 / 404 constant | AT-001.22 denial; AT-001.23 grant; AT-001.40 |
| `POST /functions/v1/public-project-page` | `{ projectId }` | `verify_jwt = false`; no `resolveCaller` | `readWithServiceRole` on `projects` then `organizations`; gated by `projectIsPubliclyListed`; projected by `publicProjectView` | 400 bad body; 404 `TENANT_NOT_FOUND` if missing or ineligible; 502 outage. **200 is an existence reveal on purpose.** | AT-001.22 “public page remains visible”; AT-001.24 public half (API only) |
| `POST /functions/v1/viewer-scope` (unit 2) | none | `verify_jwt = true`; `resolveCaller` | `POST /rest/v1/rpc/viewer_scope` as the caller; `parseViewerScope` | 401; 502 | UI source of `ViewerScope`; not an acceptance id of its own |
| `GET /rest/v1/{organizations,org_memberships,acknowledgments,projects,accounts}` as the caller | PostgREST filters | `apikey: anon`, `Authorization: Bearer <user token>` | RLS probes `viewer_scope()` | keyed miss and not-yours: **`[]` (200)**; no grant: **401 permission denied** (anon, or a table not granted) | AT-001.21/.22/.23/.40 Data API arms; AT-001.17 arm 2 still 401 for anon |
| Operator SQL (`sqlClient`) | — | `postgres`, bypasses RLS | existence control only | — | every body: prove the row exists before asserting a viewer denial |

Projections (fields named, absences asserted by name in AT-001.22):

- Dashboard 200: `{ ok, organizationId, organizationName, seat: { accountId, role } \| null, projects: [{ projectId, projectName, assignedVolunteerId }] }`.
- Workspace 200: `{ ok, projectId, projectName, organizationId, assignedVolunteerId }`. This *is* the stand-in for reference files, thread, and tasks.
- Public 200: `{ ok, projectId, projectName, organizationName }`. No `organizationId`, no `assignedVolunteerId`.

CORS stays `POST, OPTIONS`. Reads are POST, matching the three write functions.

---

## Proof map

Stand-in statement that every green row carries: the green is over organisations, memberships, acknowledgments, and a project’s identity plus assignee. Drafts, ledger, files, thread, tasks, and a rendered dashboard page do not exist. A later table must join `tenantIsolated` and probe `viewer_scope()`.

| Id | Tier | Body | Layer proved | Positive control | Manifest |
|---|---|---|---|---|---|
| AT-001.21 | loop | Drive `shapeOrganizationDashboard` with injected empty row twice (foreign vs missing) and assert **the same `TENANT_NOT_FOUND` reference**. Drive a present row and assert the projection. Drive `classifyRoute` with a constructed scope that holds only org A: org-B dashboard is `not-found`. Run the static catalog check over `supabase/migrations/*.sql`. | Shipped shaper, refusal identity, classifier probes, static catalog. **Not RLS.** | Injected present row shapes 200. | `green` |
| AT-001.21 | integration | Register, confirm, sign in A and B immediately before each probe (tokens live two minutes). Operator: two orgs, A seated in A, B seated in B, a project and an acknowledgment on A. A dashboard of A → 200. B dashboard of A → 404. B dashboard of a well-formed random uuid → **raw text and status byte-equal** to the previous 404 (`functionPostRaw`). Data API keyed GETs as B on A’s organization, membership, project, acknowledgment ids → `[]`. Data API keyed GET as A of A’s organization → exactly A’s row (proves RLS ran, not a gateway empty). B’s unfiltered `organizations` listing never contains A. Anon `org_memberships` still 401 `permission denied`. Live catalog check. | SQL `viewer_scope()` + org-member policies + grants, edge-as-caller, PostgREST-as-caller, catalog. | A reads A; operator SQL shows the row B was denied. | `green` |
| AT-001.22 | loop | Unassigned constructed scope + `project-workspace` → `not-found`. Null scope + `public-project` → `render`. `publicProjectView` asserted field-by-field (no `organizationId`, no `assignedVolunteerId`). `projectIsPubliclyListed` is true. Shaper: empty project row → `TENANT_NOT_FOUND`. | Shapers, projection, predicate, classifier. | Public route renders with a null scope. | `green` |
| AT-001.22 | integration | Operator: project in org A, seat free. Sign in an unassigned volunteer immediately before probes. Workspace of that project → 404. Workspace of a random uuid → byte-equal 404. Data API keyed project GET as that volunteer → `[]`. Public page as that volunteer **and** as anon (`functionPost` with anon key) → 200 public projection; named absences. Owning NGO Data API GET of that project → the row. | RLS denial for a volunteer with empty `assigned_project_ids`; public function; org-member positive on Data API. | Public 200; NGO Data API 200. Assigned-volunteer 200 is **not** a unit-1 control (that policy is unit 2). | `green` |
| AT-001.23 | loop | Constructed scope with one assigned project id. `classifyRoute` workspace of that id → `render`; other project → `not-found`; org dashboard → `not-found`. Shaper with a present project row → 200. | Classifier probes of `assignedProjectIds`; shaper. | Present row shapes 200. | `green` |
| AT-001.23 | integration | Operator: two projects, volunteer assigned to P1 only. Sign in that volunteer immediately before probes. Workspace P1 → 200. Workspace P2 → 404 `TENANT_NOT_FOUND`. Org dashboard of the owner → 404. Unfiltered Data API `projects` → exactly P1. Unfiltered `organizations` → `[]`. | Assigned-volunteer policy (`assigned_project_ids`); scope does not include orgs. | P1 200; operator SQL shows P2 exists. | `green` |
| AT-001.40 | loop | Constructed `{ isPlatformAdmin: true, organizationIds: [], assignedProjectIds: [] }`. `classifyRoute` on two org dashboards and two workspaces → `render`. A non-admin constructed scope on one of those → `not-found`. | Classifier uses the flag, not the arrays. | Admin constructed scope renders. | `green` |
| AT-001.40 | integration | Provision admin; two NGOs with projects (operator). Sign in admin immediately before probes. Dashboard of both orgs → 200. Workspace of both projects → 200. Unfiltered `organizations` listing contains both. A non-admin repeating one dashboard → 404. | Admin policies; empty arrays still admit via the flag. | Two tenants succeed; non-admin refused (reach is the type, not “somebody read something”). | `green` |
| AT-001.24 | loop | `throw new CapabilityPending(['ui.logged-out-surface-rendering'])`. | Nothing. No router imports `classifyRoute`. No screen exists. | — | `{ "kind": "capability-pending", "capabilities": ["ui.logged-out-surface-rendering"] }` |
| AT-001.24 | integration | Same throw, same capability string (whole-string match). Logged-out API denials live on AT-001.21/.22 so they are not silently dropped. | Nothing about rendering. | — | same `capability-pending` |

`ui` surface tag on AT-001.21, .22, and .24 so a later wiring leaf’s `--wired` re-run selects them. Tag does not change today’s run (`--wired` exits 3).

---

## Harness changes

No new sentinel, fault, vendor stand-in, or fixture world. Transport helpers sit next to `functionPost`. Catalog and selftests sit next to `_source-scan.ts` / `shipped-caller.selftest.ts`.

| File | Change |
|---|---|
| `tests/at/harness/live-stack.ts` | Add `restGet(stack, pathAndQuery, bearer: string \| null)` — `GET /rest/v1/…`, `apikey: anonKey`, `Authorization: Bearer <bearer>` or both headers the anon key when `bearer` is null (match AT-001.17 arm 2). Add `functionPostRaw(stack, name, body, bearer)` returning `{ status, text, contentType }` unparsed. Do not change `functionPost`. |
| `tests/at/suites/req-001/_contract.ts` | Add `OrganizationDashboard`, `ProjectWorkspace`, `PublicProjectPage`, `TenantReadOutcome`, `DataApiProbe`, `DataApiReadOutcome`, `ViewerScope` (imported from `viewer-scope.ts`, not restated). Add SUT members: `organizationDashboard(session, organizationId)`, `projectWorkspace(session, projectId)`, `publicProjectPage(session: Session \| null, projectId)`, `dataApiRead(session: Session \| null, probe)`, `viewerScope(session)` (unit 2). Operator reads stay and are the existence control. Correct the comment on `updateOrganization` that says `org_memberships` reaches no Data API role. |
| `tests/at/suites/req-001/_fixture.ts` | Storage stays Maps of rows. Viewer-read members resolve the caller with the shipped `callerFromAuthAnswer`, then call the shipped shapers. They do **not** implement `USING` clauses. Loop isolation claims in the bodies drive shipped functions with constructed `ViewerScope` values and injected rows; they do not rest on fixture filtering. Header states that loop does not prove `public.viewer_scope()`. |
| `tests/at/suites/req-001/_live.ts` | `organizationDashboard` / `projectWorkspace` / `viewerScope` use `tokensOf` then `functionPostRaw` or `functionPost`. `publicProjectPage` uses the access token when a session is passed, else the anon key as bearer. `dataApiRead` uses `restGet` with `tokensOf` or null. Sign-in-before-probe is the body’s job; if a token’s `exp` is within 15 seconds, the member refreshes through the existing refresh path so a 401 cannot pass as `[]`. Correct the comment that `public.projects` reaches no Data API role: keep the original measurement as history and name the date it stopped being true. |
| `tests/at/suites/req-001/_integration.ts` | Export `at00121`, `at00122` (unit 1), `at00123`, `at00140`, `at00124` (unit 2). Reuse `registerConfirmAndSignIn`. Sign each actor in immediately before that actor’s reads. Every denial body runs the allowed read first. AT-001.24 throws `CapabilityPending(['ui.logged-out-surface-rendering'])`. |
| `tests/at/suites/req-001/d-tenant-isolation.test.ts` | Four-argument `atTest` with `{ surface: 'ui' }` for .21, .22, .24, and per-tier bodies. |
| `tests/at/suites/req-001/_pending.ts` | Drop `D5_L1` when unit 1 lands; drop `D5_L2` when unit 2 lands (AT-001.24 has a real body). Correct counts. |
| `tests/at/expected/req-001.json` | Unit 1: move AT-001.21, .22 to `green` at both tiers. Unit 2: move AT-001.23, .40 to `green` at both; move AT-001.24 from `pending/sut-missing` to `capability-pending` / `ui.logged-out-surface-rendering` at both. |
| `tests/at/suites/req-001/_catalog-conformance.ts` | Declared lists `unreachableByClientRoles` (`volunteer_profiles`) and `tenantIsolated` (`accounts`, `organizations`, `org_memberships`, `acknowledgments`, `projects`). Pure `catalogConformanceProblems`. Isolated tables: RLS on, `SELECT` grant to `authenticated`, at least one `SELECT` policy, no `using (true)`, every `SELECT` qual names `viewer_scope`. Unreachable: no `SELECT` to `anon`/`authenticated`. Helpers a policy calls: name `viewer_%`, `EXECUTE` to `authenticated`. |
| `tests/at/suites/req-001/_source-scan.ts` | Narrow the sentence “the membership table reaches no client role” to the publishable-key 401. |
| `tests/at/harness/shipped-viewer-scope.selftest.ts` | Refusal identity, shaper collapse, projection absences, predicate header promise, `classifyRoute` matrix, `parseViewerScope` fail-closed. |
| `tests/at/harness/shipped-catalog-conformance.selftest.ts` | Synthetic catalogs: table in neither list, in both, `using (true)`, missing `viewer_scope` in qual, unreachable table that is actually granted. |

Loop static catalog: the same pure `catalogConformanceProblems` over a parse of `supabase/migrations/*.sql` (`CREATE TABLE public.X`, `ENABLE ROW LEVEL SECURITY`, `GRANT SELECT`, `CREATE POLICY`, `USING (`). Throws if it cannot read the directory. Precedent: `_source-scan.ts`. CI runs loop, so this is the durable guard.

---

## Unit split

Unit 1 is green on its own. Unit 2 starts only then. A unit does not ship a policy branch it does not test.

**Unit 1 — cross-org denial, no existence oracle (AT-001.21, AT-001.22)**

- Privilege posture + `viewer_scope()` (full computation, including admin flag and assigned-project ids; unused by unit-1 policies).
- Org-member policies and own-row / own-acknowledgment policies.
- Indexes.
- `viewer-scope.ts` whole (shapers, refusal, projection, predicate, `classifyRoute`, parse).
- `organization-dashboard`, `project-workspace`, `public-project-page`.
- `readAsCaller` / `readWithServiceRole` / `restGet` / `functionPostRaw`.
- Catalog module and static + live checks (live check in AT-001.21 integration).
- AT-001.21, AT-001.22 green at both tiers.
- Comment corrections that unit 1 falsifies (`_contract.ts` Data API sentence; `_source-scan.ts` client-role sentence). `_live.ts` projects sentence if the grant is in this unit.

Assigned-volunteer success is **not** a unit-1 control. `project-workspace` in unit 1 denies everyone at the Data API, including an assigned volunteer, because no policy probes `assigned_project_ids` yet. AT-001.22’s positive controls are the public page and the owning NGO’s Data API read.

**Unit 2 — assigned volunteer, platform admin, logged-out (AT-001.23, AT-001.40, AT-001.24)**

- Assigned-volunteer policy, platform-admin policies, assignee-type trigger.
- `viewer-scope` edge function.
- AT-001.23, AT-001.40 green at both tiers.
- AT-001.24 `CapabilityPending` at both tiers; declaration moves from `sut-missing` to `capability-pending`.
- Re-run AT-001.21 and AT-001.22 in the same integration run so a new OR-branch that broke a denial fails here.
- Remaining comment corrections (`_live.ts` if not already done).

---

## Not built here

- Auth screens, a sign-in route, a router that calls `classifyRoute`, a browser driver. AT-001.24 stays red until that leaf. The redirect target constant is `/sign-in`.
- Drafts (later need-capture requirement), ledger / fuel (later funding requirement), storage / reference files (later files requirement), comment thread (later thread requirement), NGO/volunteer dashboards as pages (later dashboard requirements), tasks (Linear, later matching requirement), listings and a lifecycle column on `projects` (later public project-page requirement). Each new `public` table joins the catalog as `tenantIsolated` or `unreachableByClientRoles`. Isolated tables get `SELECT` to `authenticated`, RLS, and a policy whose `USING` probes `public.viewer_scope()`. Isolation matrix every later resource must fill: rightful NGO, assigned volunteer where applicable, platform admin, foreign NGO, unassigned volunteer, absent id, logged-out visitor. Storage buckets and Linear reads are not tables; they need their own tripwire in their requirement.
- Account type as a JWT custom-access-token hook. Cheaper listings, two-minute staleness. Auth configuration, not this leaf. The listings requirement should find this note.
- Platform-admin `SELECT` over `public.accounts` or `volunteer_profiles`.
- Product project creation, volunteer matching, offboarding, lifecycle deactivation on reads.
- Timing side-channels.
- Any file under `src/`.