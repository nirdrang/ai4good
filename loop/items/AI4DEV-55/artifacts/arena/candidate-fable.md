# Candidate B, edge-first: tenant isolation and visibility

Runner: Fable, direction B. Every read is an edge function. The edge function reads as the caller. One pure TypeScript decision is the rule the loop tier proves. The SQL policy set is the backstop the integration tier proves. One shared matrix drives both, so a drift between the two rules fails a run.

## Problem

Five acceptance ids must turn green at both tiers, and the tree has no tenant read path: six tables with row-level security on and zero policies, three edge functions that only write, one heading at `/`. The design adds the read path and proves it. Three facts make the shape non-obvious. First, the loop tier cannot exercise a policy; it can exercise shipped TypeScript. Second, every read the tree makes today bypasses row-level security (service role or operator SQL), so a green over those reads proves nothing about isolation. Third, the surfaces the ids name (drafts, ledger, files, thread, dashboard, tasks) do not exist; the tenant rows that exist are organisations, memberships, acknowledgments, volunteer profiles and a project's identity plus its assignee.

The lead's rulings bind this design. Ruling 1 says reads go as the caller and TypeScript holds no second tenant rule. Direction B, as assigned, keeps one pure TypeScript decision as the rule proved at loop. The two statements conflict on one point only: whether `tenantReadAllowed` exists. This package keeps it, as the direction asks, and pays for it with a mechanism: a shared matrix that fails an integration run when the TypeScript rule and the SQL rule disagree on any cell. The section "Open questions" names the deletion path if the lead upholds ruling 1 strictly. Every other ruling is honoured as written.

## Usage (caller's view)

### The UI author's view (later, from `src/`)

```ts
// The UI never touches the database. It calls one function per surface with the user's session.
const { data } = await supabase.functions.invoke('organization-dashboard', {
  body: { organizationId },
});
// data is { ok: true, organizationId, organizationName, seat, projects: [...] }
// or     { ok: false, reason: '<one fixed sentence>' } with HTTP 404 — for "not yours" AND "no such thing".

const page = await fetch(`${SUPABASE_URL}/functions/v1/public-project-page`, {
  method: 'POST', headers: { apikey: ANON_KEY }, body: JSON.stringify({ projectId }),
});
// 200 { ok: true, projectId, projectName, organizationName } for a visitor with no session.
```

### The edge-function author's view (Deno entry point)

```ts
// supabase/functions/organization-dashboard/index.ts — the whole file is wiring.
Deno.serve(edgeHandler('organization-dashboard', async (request) => {
  if (request.method !== 'POST') return refusal('organization-dashboard accepts POST only', 405);
  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
  if (!caller) return refusal('authenticate before reading an organisation dashboard', 401);
  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);
  const organizationId = requiredId(body.value.organizationId);
  if (!organizationId.ok) return refusal(organizationId.reason, 400);

  // THE ONE CHANGE FROM THE WRITE FUNCTIONS: reads carry the CALLER's token, never the service role.
  const reads = callerReads(SUPABASE_URL, ANON_KEY, request.headers.get('Authorization')!);
  const answer = await organizationDashboard(reads, caller.id, organizationId.value);
  return json(answer.body, answer.status);
}));
```

### The test author's view (both tiers)

```ts
// AT-001.21, integration body: three reads, two of them as the viewer, one as the operator.
const a = await signInAgain(sut, world.ngoA);                       // ruling 11: fresh token per probe block
const own = await sut.organizationDashboard(a, world.orgA.id);       // positive control, through the function
expect(own).toMatchObject({ ok: true, value: { organizationId: world.orgA.id } });

const b = await signInAgain(sut, world.ngoB);
const foreign = await sut.rawTenantRead(b, 'organization-dashboard', world.orgA.id);
const absent  = await sut.rawTenantRead(b, 'organization-dashboard', crypto.randomUUID());
expect(foreign).toEqual(absent);                                      // bytes and status, ruling 6

const rows = await sut.viewerRead(b, 'organizations', { id: world.orgA.id }); // ruling 2: as the viewer
expect(rows).toEqual({ status: 200, rows: [] });
expect(await sut.organization(world.orgA.id)).not.toBeNull();         // operator control: the row exists
```

```ts
// AT-001.21, loop body: the shipped rule and the shipped orchestration, nothing else.
for (const cell of cellsFor('AT-001.21')) {
  expect(tenantReadAllowed(viewerStandingFor(cell), cell.target).ok, cell.name).toBe(cell.sees);
}
const foreign = await sut.organizationDashboard(ngoB, orgA.id);      // fixture runs the shipped core
const absent  = await sut.organizationDashboard(ngoB, crypto.randomUUID());
expect(foreign).toEqual(absent);
```

## Shape

### Data structures

**The viewer's standing, relative to one target.** `TenantViewer` holds the caller's account type, the caller's role in the target organisation, and whether the caller is the target project's assignee. It is never a list. A rule that authorised from standing in another organisation cannot be written against this type (same device as `orgAdminActionAllowed`).

**The answer.** `TenantReadAnswer<T>` is a three-member union: `{ status: 200; body: T }`, `TENANT_NOT_FOUND` (404, one fixed sentence) and `TENANT_READ_FAILED` (502, one fixed sentence). Both refusals are `as const` constants, so the type carries no free-text refusal and a handler has nowhere to put a second one.

**The reads a surface needs.** `TenantReads` is a small record of named, keyed reads. Each read is keyed by an identifier from the request, never by the caller. The Deno shell backs it with PostgREST as the caller; the loop fixture backs it with Maps. Nothing on this surface is a PostgREST path or a wire shape (per boundary-discipline).

**The matrix.** `TENANT_MATRIX` is a list of cells `{ viewer, target, sees, ids }`. It is test data, not product code. It is the one place the expected verdicts are written. The loop tier drives the TypeScript rule with it. The integration tier drives PostgREST as each viewer and the edge functions as each viewer with it.

### Modules

```
supabase/functions/_shared/tenant-reads.ts     pure: TenantViewer, tenantReadAllowed, TENANT_NOT_FOUND,
                                               TENANT_READ_FAILED, TenantReads, organizationDashboard,
                                               projectWorkspace, publicProjectEligible, publicProjectView
supabase/functions/_shared/edge.ts             +callerReads (I/O: PostgREST GET as the caller),
                                               +serviceReads (I/O: the one surviving service-role read)
supabase/functions/organization-dashboard/     verify_jwt = true, wiring only
supabase/functions/project-workspace/          verify_jwt = true, wiring only
supabase/functions/public-project-page/        verify_jwt = false, wiring only
supabase/migrations/<unit1>_tenant_read_posture_and_member_policies.sql
supabase/migrations/<unit2>_tenant_visibility_volunteer_and_admin.sql
tests/at/harness/live-stack.ts                 +restGetAsUser, +functionPostRaw
tests/at/suites/req-001/_tenant-matrix.ts      the cells and viewerStandingFor
tests/at/suites/req-001/_tenant-catalog.ts     the declared table lists and the pure conformance rule
tests/at/suites/req-001/_policy-scan.ts        static reader over supabase/migrations/*.sql (loop and integration)
```

A reader traces one read in three files: the entry point, `tenant-reads.ts`, and the migration. That is the ceiling (per minimize-reader-load).

### The type sketch

```ts
// supabase/functions/_shared/tenant-reads.ts
// Same constraints as memberships.ts: relative imports only, no Deno global, no I/O, no clock.

import { ACCOUNT_TYPES, type AccountType } from './accounts.ts';
import { parseOrgRole, type OrgRole } from './memberships.ts';

/** Which kind of thing is read. Two scopes admit two different viewers. */
export type TenantReadScope = 'organization' | 'project';

/** The caller's standing relative to ONE target. Never a list. */
export type TenantViewer = {
  accountType: AccountType | null;
  roleInTargetOrganization: OrgRole | null;
  assignedVolunteerOfTargetProject: boolean;
};

export type TenantReadDecision = { ok: true } | { ok: false; reason: string };

/**
 * THE RULE. Platform admin: both scopes. NGO: the organisation it holds a seat in. Volunteer: the
 * project it is assigned to. Everybody else, including no account: nothing. Fails closed on every
 * value it does not recognise. The SQL policies state the same rule; `_tenant-matrix.ts` is what
 * fails when the two disagree.
 */
export function tenantReadAllowed(viewer: TenantViewer, scope: TenantReadScope): TenantReadDecision {
  throw new Error('not implemented');
}

/** The ONE refusal for "no such thing" and "not yours". Returned, never thrown (edgeHandler turns throws into 502). */
export const TENANT_NOT_FOUND = {
  status: 404,
  body: { ok: false, reason: 'no such thing is visible to this caller' },
} as const;

/** The ONE outage answer. It names no identifier, so a faulted read is the same bytes for every target. */
export const TENANT_READ_FAILED = {
  status: 502,
  body: { ok: false, reason: 'the read could not complete, so no decision was made' },
} as const;

/** A status and a body, or one of the two constants. There is no fourth member. */
export type TenantReadAnswer<T> =
  | { status: 200; body: T }
  | typeof TENANT_NOT_FOUND
  | typeof TENANT_READ_FAILED;

export type ReadResult<Row> = { ok: true; rows: Row[] } | { ok: false; detail: string };

/**
 * THE READS A SURFACE NEEDS, named and keyed by request identifiers only. The caller's identity
 * enters only through the token the I/O adapter carries. Nothing here is a wire path.
 */
export type TenantReads = {
  /** the caller's own account row — visible to the caller through the own-row policy */
  ownAccount(): Promise<ReadResult<{ account_type: string }>>;
  /** the caller's own seat in that organisation, or no rows */
  ownSeatIn(organizationId: string): Promise<ReadResult<{ role: string }>>;
  organization(organizationId: string): Promise<ReadResult<{ id: string; name: string }>>;
  seatsOf(organizationId: string): Promise<ReadResult<{ account_id: string; role: string }>>;
  projectsOf(organizationId: string): Promise<ReadResult<{ id: string; name: string; assigned_volunteer_id: string | null }>>;
  project(projectId: string): Promise<ReadResult<{ id: string; name: string; org_id: string; assigned_volunteer_id: string | null }>>;
};

export type OrganizationDashboard = {
  ok: true;
  organizationId: string;
  organizationName: string;
  seat: { accountId: string; role: OrgRole } | null;
  projects: { projectId: string; projectName: string; assignedVolunteerId: string | null }[];
};

export type ProjectWorkspace = {
  ok: true;
  projectId: string;
  projectName: string;
  organizationId: string;
  assignedVolunteerId: string | null;
};

/**
 * THE ORCHESTRATION, pure over injected reads. Steps: standing, decision, target, answer.
 * Invariant: the decision is computed before the target is used, and the answer is one of the three
 * members of `TenantReadAnswer`. With reads as the caller, an absent target and a foreign target
 * both arrive as zero rows, so no read-ordering discipline is needed for the oracle property.
 * If the decision refuses AND rows came back, the answer is still TENANT_NOT_FOUND: the TypeScript
 * rule is the stricter of the two, and the matrix reports the disagreement at integration.
 */
export async function organizationDashboard(
  reads: TenantReads,
  callerId: string,
  organizationId: string,
): Promise<TenantReadAnswer<OrganizationDashboard>> {
  // TODO: standing = await viewerStanding(reads, { organizationId })
  // TODO: if (!tenantReadAllowed(standing, 'organization').ok) return TENANT_NOT_FOUND
  // TODO: org = await reads.organization(organizationId); seats; projects — any !ok → TENANT_READ_FAILED
  // TODO: org.rows.length === 0 → TENANT_NOT_FOUND; else project the three reads field by field
  throw new Error('not implemented');
}

export async function projectWorkspace(
  reads: TenantReads,
  callerId: string,
  projectId: string,
): Promise<TenantReadAnswer<ProjectWorkspace>> {
  // TODO: project = await reads.project(projectId) — the target row carries org_id and the assignee,
  //       so the standing for the project scope is computed FROM the target row:
  //       roleInTargetOrganization = ownSeatIn(project.org_id), assigned = assignee === callerId.
  //       Zero rows → TENANT_NOT_FOUND before any standing is computed.
  // TODO: decision refuses → TENANT_NOT_FOUND
  throw new Error('not implemented');
}

/**
 * THE ONE ELIGIBILITY PREDICATE for the public surface (ruling 7). True for every row today. The
 * lifecycle that will make it false belongs to the public listing requirement (REQ-010/011). No
 * visibility column is added now; a column nothing enforces is the defect the first migration refuses.
 */
export function publicProjectEligible(project: { id: string }): boolean {
  return true;
}

export type PublicProjectView = { ok: true; projectId: string; projectName: string; organizationName: string };

/** Built field by field from two rows. It cannot copy a workspace projection through. */
export function publicProjectView(project: { id: string; name: string }, organization: { name: string }): PublicProjectView {
  throw new Error('not implemented');
}
```

```ts
// supabase/functions/_shared/edge.ts — additions. I/O only.

/**
 * PostgREST as the CALLER: `apikey: <anon key>`, `Authorization: <the request's own header>`.
 * The policy set is the enforcement point; this adapter carries the token and parses rows.
 * A non-2xx is `{ ok: false, detail }`, never a thrown error, so an outage reaches the pure core as data.
 */
export function callerReads(supabaseUrl: string, anonKey: string, authorization: string): TenantReads {
  throw new Error('not implemented');
  // TODO: each member is one GET on /rest/v1/<table>?<key>=eq.<id>&select=<columns>
}

/**
 * THE ONE SURVIVING SERVICE-ROLE READ, for `public-project-page` only. `anon` holds no table
 * privilege by ruling 5, so the public surface reads with the service role and gates with
 * `publicProjectEligible`. It is ONE read (project embedded with its organisation name), so the
 * target is trivially the last read. It reveals existence on purpose: the criterion's own
 * "beyond public surfaces" carve-out.
 */
export function serviceReads(supabaseUrl: string, serviceRoleKey: string): {
  projectWithOrganization(projectId: string): Promise<ReadResult<{ id: string; name: string; organizations: { name: string } }>>;
} {
  throw new Error('not implemented');
}
```

### Load-bearing decisions

1. **Reads go as the caller; TypeScript is belt, SQL is braces, the matrix is the buckle.** `callerReads` forwards the request's own `Authorization` header. A foreign or absent target is zero rows at the database. The pure core still runs `tenantReadAllowed` first. Neither layer alone is trusted: `_tenant-matrix.ts` drives both at integration and fails when they differ (per encode-lessons-in-structure).
2. **The refusal is a constant in the return type.** `TenantReadAnswer` has three members and two are `as const`. A handler cannot express "not yours" and "no such thing" differently because there is one value for both (per type-system-discipline).
3. **Zero SECURITY DEFINER helpers.** The "consider" item on an own-row `accounts` policy is taken all the way. Every policy is an inline expression over `auth.uid()`, and the subqueries reach only tables whose own policy is own-row (`accounts`, `org_memberships`). The subquery graph is a tree with own-row leaves, so no policy recurses and no function is exposed on `/rest/v1/rpc/`. Ruling 9 is satisfied vacuously and the static check enforces "no `viewer_` function exists, or it follows the rule".
4. **The public page is the one service-role read, and it is one read.** Ruling 6 asks the design to say why a service-role read survives: `anon` holds no grant, by ruling 5. One embedded read means the target is read last by construction.
5. **The loop fixture backs the reads with Maps keyed by request identifiers, and runs the shipped core.** It filters nothing by caller. The only judgement at loop is the shipped rule (ruling 3). The viewer-shaped read is `CapabilityPending` at loop, by name.
6. **The durable guard is a static scan over the migration files** (ruling 4), driven by AT-001.21's body at both tiers, plus a live `pg_policies` read at integration. The declared table list is suite-side test data beside `_source-scan.ts`.

### What the public surface hides, and what stays exposed

Hidden behind three POST functions: the policy set, the token forwarding, the row projection, the oracle collapse, and the outage shape. Exposed: one identifier in, one projection or one of two fixed refusals out. The UI author learns nothing about tables. The interface is no larger than the three surfaces the ids name (dashboard, workspace, public page); a general reader would be a leak waiting for a column.

### What the design deliberately does not do

No listing surface. No visibility or lifecycle column. No JWT claim for the account type. No route registry. No `src/` change. No new operator authority; every Given uses the operator members that exist.

## Migration sketch

### Unit 1: `supabase/migrations/20260906120000_tenant_read_posture_and_member_policies.sql`

```sql
-- REQ-001 D5.L1. THE CLIENT PRIVILEGE POSTURE, stated once (ruling 5):
--   anon holds no privilege on any table. The public surface is a function, never a grant.
--   authenticated holds SELECT, and only SELECT, on a table exactly where a policy runs on it.
--   service_role holds SELECT where an edge function must read past the policies (the public page),
--   and no INSERT, UPDATE or DELETE anywhere. Every write stays inside a SECURITY DEFINER function.
--   No table carries FORCE ROW LEVEL SECURITY; the operator connection still bypasses.
-- POLICY RULE: every policy is an inline expression over (select auth.uid()). A policy subquery may
-- read only public.accounts and public.org_memberships, whose own policies are own-row, so the policy
-- graph is a tree and nothing recurses. No SECURITY DEFINER helper exists for policies. If one is ever
-- added it carries the viewer_ prefix, SET search_path = '', no argument naming another person, and
-- EXECUTE to authenticated; tests/at/suites/req-001/_policy-scan.ts refuses any other shape.

/* ==================================================== 1. reset the posture, then grant exactly select */
revoke all on table public.accounts, public.organizations, public.org_memberships,
                    public.acknowledgments, public.volunteer_profiles, public.projects
  from anon, authenticated;
-- The INSERT half of the first migration's `grant select, insert on public.accounts to authenticated`
-- served a superseded proof. Before this line lands: grep tests/ for the RLS insert message on accounts;
-- if a body pins it, keep INSERT and say so here.
grant select on public.accounts        to authenticated;
grant select on public.organizations   to authenticated;
grant select on public.org_memberships to authenticated;
grant select on public.acknowledgments to authenticated;
grant select on public.projects        to authenticated;
-- volunteer_profiles stays at zero: no id reads it and no policy runs on it. It is declared unreachable.

-- The public page's one service-role read. Reads only; the service role still holds no DML.
grant select on public.organizations to service_role;
grant select on public.projects      to service_role;

/* ==================================================== 2. the own-row leaves */
create policy accounts_select_own_row on public.accounts
  for select to authenticated
  using (id = (select auth.uid()));

create policy org_memberships_select_own_seat on public.org_memberships
  for select to authenticated
  using (account_id = (select auth.uid()));

create policy acknowledgments_select_own_account on public.acknowledgments
  for select to authenticated
  using (account_id = (select auth.uid()));

/* ==================================================== 3. the organisation-member branch */
-- An NGO account seated in the organisation reads the organisation and its projects. The account-type
-- conjunct keeps SQL equal to tenantReadAllowed's organisation branch, which requires 'ngo'. The
-- membership trigger already refuses a non-NGO seat, so the conjunct is agreement, not a second guard.
create policy organizations_select_org_member on public.organizations
  for select to authenticated
  using (exists (select 1 from public.org_memberships m
                  where m.org_id = organizations.id and m.account_id = (select auth.uid())));

create policy projects_select_org_member on public.projects
  for select to authenticated
  using (exists (select 1 from public.org_memberships m
                  where m.org_id = projects.org_id and m.account_id = (select auth.uid())));

-- A volunteer and a platform admin reach nothing through this migration: no policy admits them yet.
-- Unit 2 adds those branches in the unit whose ids exercise them.
notify pgrst, 'reload schema';
```

What happens to `anon`: it starts with default privileges on the four older tables (REFERENCES, TRIGGER, TRUNCATE from `ALTER DEFAULT PRIVILEGES`) and ends with none on all six. Every `anon` read answers 401 `permission denied`; AT-001.17 arm 2 keeps its pinned assertion.

### Unit 2: `supabase/migrations/20260907120000_tenant_visibility_volunteer_and_admin.sql`

```sql
-- REQ-001 D5.L2. Adds branches; replaces nothing. Permissive select policies are OR'd.

/* ==================================================== 1. assignment admits a volunteer only (ruling 8) */
create function public.project_seat_holds_a_volunteer() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- TODO: if new.assigned_volunteer_id is not null and the account's type is not 'volunteer',
  --       raise exception '... single developer seat admits volunteer accounts only' using errcode = '42501';
  return new;
end $$;
revoke execute on function public.project_seat_holds_a_volunteer() from public;
create trigger projects_seat_volunteer_only before insert or update of assigned_volunteer_id
  on public.projects for each row execute function public.project_seat_holds_a_volunteer();
-- SECURITY DEFINER because the trigger reads public.accounts under an operator or service caller that
-- may not see the row; it is a trigger function, not a policy helper, so the viewer_ rule does not apply.

/* ==================================================== 2. the assigned-volunteer branch */
-- The type conjunct stays even with the trigger: a policy may not inherit an invariant added the same day
-- and it keeps SQL equal to the TypeScript rule's project branch.
create policy projects_select_assigned_volunteer on public.projects
  for select to authenticated
  using (assigned_volunteer_id = (select auth.uid())
         and exists (select 1 from public.accounts a
                      where a.id = (select auth.uid()) and a.account_type = 'volunteer'::public.account_type));

/* ==================================================== 3. the platform admin's reach (founder d65) */
-- One policy per tenant table, each naming the same expression. The admin reads its own account row
-- through accounts_select_own_row; no helper is needed.
create policy organizations_select_platform_admin   on public.organizations   for select to authenticated
  using (exists (select 1 from public.accounts a where a.id = (select auth.uid()) and a.account_type = 'platform_admin'::public.account_type));
create policy org_memberships_select_platform_admin on public.org_memberships for select to authenticated
  using (exists (select 1 from public.accounts a where a.id = (select auth.uid()) and a.account_type = 'platform_admin'::public.account_type));
create policy projects_select_platform_admin        on public.projects        for select to authenticated
  using (exists (select 1 from public.accounts a where a.id = (select auth.uid()) and a.account_type = 'platform_admin'::public.account_type));
create policy acknowledgments_select_platform_admin on public.acknowledgments for select to authenticated
  using (exists (select 1 from public.accounts a where a.id = (select auth.uid()) and a.account_type = 'platform_admin'::public.account_type));

notify pgrst, 'reload schema';
```

`anon` is untouched by unit 2. `service_role` gains nothing.

## Read surfaces

| Surface | Kind | Inputs | Success | Refusal | Ids |
|---|---|---|---|---|---|
| `organization-dashboard` | edge function, `verify_jwt = true`, reads as caller | `{ organizationId }` | 200 `OrganizationDashboard` | 401 no caller (shell); 400 malformed body (shell); 404 `TENANT_NOT_FOUND`; 502 `TENANT_READ_FAILED` | .21, .23 (scope arm), .40 |
| `project-workspace` | edge function, `verify_jwt = true`, reads as caller | `{ projectId }` | 200 `ProjectWorkspace` | same four | .22, .23, .40 |
| `public-project-page` | edge function, `verify_jwt = false`, one service-role read, gated by `publicProjectEligible` | `{ projectId }` | 200 `PublicProjectView` | 404 `TENANT_NOT_FOUND` for absent or ineligible; 502 | .22, .24 (arm inside .22) |
| PostgREST GET as the viewer | harness read, not a product surface | table, key filter, session or null | 200 rows (possibly `[]`) | 401 `permission denied` for anon; 401 for a stale token | .21, .22, .23, .40 (matrix cells) |
| PostgREST GET with the service role | none added; the write functions keep theirs | | | | |

The 401 and 400 answers come from the shell before the core runs. They depend on the request's own shape, not on the target's existence, so they open no oracle. The 404 and 502 are the core's two constants.

## Proof map

| Id | Tier | What the body does | Layer proved | Positive control | Manifest |
|---|---|---|---|---|---|
| AT-001.21 | loop | Drives `tenantReadAllowed` with the .21 cells of the matrix; runs the shipped `organizationDashboard` core through the fixture for NGO B against org A and against a random id; asserts the two answers deep-equal and equal `TENANT_NOT_FOUND`; runs `_policy-scan.ts` over the migration files against `_tenant-catalog.ts`. | The TypeScript rule, the orchestration, the refusal constant, the migration text. | NGO A's own dashboard answers 200 with org A's id. | `green` |
| AT-001.21 | integration | Builds org A (product) and org B (product); signs in NGO B right before its probes; `rawTenantRead` for org A and for a random uuid, bytes and status equal; `viewerRead` on `organizations`, `projects`, `org_memberships`, `acknowledgments` keyed to org A answers `[]` each; unfiltered `viewerRead` on `organizations` answers B's row only; operator `organization(orgA)` proves the row exists; every .21 matrix cell agrees across edge and PostgREST; live `pg_policies` conformance. | The policy set through PostgREST and through the deployed function; the deployed refusal bytes. | NGO A's keyed `viewerRead` returns exactly its own row; NGO A's dashboard answers 200. | `green` |
| AT-001.22 | loop | Matrix cells for .22; fixture runs `projectWorkspace` for an unassigned volunteer against project A and a random id, answers deep-equal; `publicProjectView` built from the rows contains no `organizationId` and no `assignedVolunteerId`, each named. | The rule, the orchestration, the projection. | The owning NGO member's workspace read answers 200 (unit 1 has no assigned volunteer yet). | `green` |
| AT-001.22 | integration | Volunteer registers and completes signup (operator-linked GitHub identity); operator creates project A under org A; the volunteer's `rawTenantRead` on the workspace for project A equals the one for a random uuid; `viewerRead` on `projects` keyed to A answers `[]`; `public-project-page` answers 200 to the volunteer AND to a caller with no session; the anonymous caller's `project-workspace` answers 401 and its `viewerRead` answers 401 `permission denied` (the logged-out API arm, recorded here because AT-001.24 stays red). | The policy set, the deployed functions, the public projection. | NGO A's workspace read for project A answers 200; operator `projectAssignment(A)` proves the row. | `green` |
| AT-001.23 | loop | Matrix cells for .23; fixture runs `projectWorkspace` for the assigned volunteer against its project (200), another project (404), and `organizationDashboard` for the owning organisation (404, scope is the project). | The rule's project branch and the scope limit. | The 200 on its own project. | `green` |
| AT-001.23 | integration | Operator assigns the volunteer to project A; volunteer signs in; workspace A answers 200; workspace B (another org's project) answers the constant; dashboard of org A answers the constant; unfiltered `viewerRead` on `projects` returns exactly project A; matrix cells agree. | The assigned-volunteer policy, the trigger (a non-volunteer assignment is refused, classified by sentence), the deployed function. | The 200 and the one-row listing. | `green` |
| AT-001.40 | loop | Matrix cells for .40; fixture runs both cores for a platform admin against org A, org B, project A, project B (all 200); a non-admin repeats one read and gets the constant. | The rule's admin branch. | The non-admin refusal makes the reach attributable. | `green` |
| AT-001.40 | integration | `provisionPlatformAdmin`; admin reads two organisations' dashboards and two projects' workspaces through the functions; unfiltered `viewerRead` on `organizations` returns both; NGO B repeats the org A read and gets the constant; matrix cells agree. | The four admin policies, the deployed functions. | The non-admin refusal. | `green` |
| AT-001.24 | loop | `throw new CapabilityPending(['ui.authenticated-surface-rendering'])`. | Nothing; declared. | none | `{ "kind": "capability-pending", "capabilities": ["ui.authenticated-surface-rendering"] }` |
| AT-001.24 | integration | Same throw. The API half of the logged-out clause (public page answers anon; workspace and PostgREST refuse anon) is asserted inside AT-001.22's integration body, not here, because the founder ruled this id red at both tiers. | Nothing; declared. | none | same declaration |

What no green here claims: isolation of drafts, ledger, files, thread, tasks or a dashboard table, because none exists; any rendering or redirect; timing side channels.

## Harness changes

**`tests/at/harness/live-stack.ts`** gains two siblings and changes nothing existing:

```ts
/** PostgREST as a USER: apikey anon, Authorization the user's token; `null` bearer sends no Authorization (anon). */
export async function restGetAsUser(stack: Stack, path: string, bearer: string | null): Promise<{ url: string; status: number; text: string; json: unknown }>;
/** `functionPost` without the parse, so two answers compare as bytes (ruling 6). */
export async function functionPostRaw(stack: Stack, name: string, body: unknown, bearer: string | null): Promise<{ status: number; text: string }>;
```

Neither is a sentinel, fault, vendor stand-in or fixture world. They are two HTTP calls the existing client lacked.

**`tests/at/suites/req-001/_contract.ts`** gains, importing the projection types from `tenant-reads.ts` rather than restating them:

```ts
export type TenantReadOutcome<T> = { ok: true; value: T } | { ok: false; status: number; body: unknown };
export type ViewerRows = { status: number; rows: unknown[] | null };   // rows null when not 2xx
export type TenantTable = 'organizations' | 'org_memberships' | 'acknowledgments' | 'projects' | 'accounts';

// on AccountsSut:
organizationDashboard(session: Session, organizationId: string): Promise<TenantReadOutcome<OrganizationDashboard>>;
projectWorkspace(session: Session, projectId: string): Promise<TenantReadOutcome<ProjectWorkspace>>;
publicProjectPage(projectId: string): Promise<TenantReadOutcome<PublicProjectView>>;   // no session: the visitor
/** the raw answer, for byte equality; `session` null sends no Authorization */
rawTenantRead(session: Session | null, surface: 'organization-dashboard' | 'project-workspace', id: string): Promise<{ status: number; text: string }>;
/** THE VIEWER-SHAPED READ (ruling 2): a PostgREST GET as THIS session. Named apart from every operator read. */
viewerRead(session: Session | null, table: TenantTable, filter: Record<string, string>): Promise<ViewerRows>;
/** the live catalog witness for the conformance rule; loop throws CapabilityPending */
publicSchemaCatalog(): Promise<CatalogTable[]>;
```

The comment on `updateOrganization` that says `org_memberships` reaches no Data API role is corrected in unit 1 (ruling 12).

**`tests/at/suites/req-001/_fixture.ts`**: no new Map. A `fixtureReads(state, callerId)` builds a `TenantReads` from the existing account, membership, organization and project Maps, keyed by request identifiers only; `ownAccount` and `ownSeatIn` read the caller's own rows because the reads are the caller's by definition. `organizationDashboard` and `projectWorkspace` resolve the caller through the existing `resolveCaller(session)` (dead session answers 401, as the write members do) and call the shipped cores. `publicProjectPage` calls `publicProjectEligible` and `publicProjectView`. `viewerRead`, `rawTenantRead` and `publicSchemaCatalog` throw `CapabilityPending` naming themselves; no loop body calls them.

**`tests/at/suites/req-001/_live.ts`**: `viewerRead` calls `tokensOf` for a session and `restGetAsUser` with a null bearer for `null`; `rawTenantRead` calls `functionPostRaw`; the three surface members call `functionPost` and classify: 2xx with `ok: true` is a value, anything else is `{ ok: false, status, body }`. `publicSchemaCatalog` runs the existing `sqlClient` over `pg_class`, `has_table_privilege` and `pg_policies`. The comment that says `public.projects` reaches no Data API role is corrected in unit 1.

**`tests/at/suites/req-001/_integration.ts`** gains `signInAgain(sut, actor)` (ruling 11) and one `defineEvidenceCapture('tenant world')` producer that builds org A, org B, project A, project B, an NGO actor per org, two volunteers and one admin, and returns inert data (ids, emails, the shared password). The five bodies `at00121`, `at00122`, `at00123`, `at00140` consume it; each signs its actors in right before their probes.

**`tests/at/suites/req-001/_tenant-matrix.ts`**:

```ts
export type ViewerKind = 'owning-ngo' | 'foreign-ngo' | 'assigned-volunteer' | 'unassigned-volunteer' | 'platform-admin';
export type Cell = { name: string; viewer: ViewerKind; target: TenantReadScope; sees: boolean; ids: readonly string[] };
export const TENANT_MATRIX: readonly Cell[];                    // ten cells; the unit-2 cells carry .23/.40
export function cellsFor(atId: string): Cell[];
/** the pure translation the loop tier hands to tenantReadAllowed */
export function viewerStandingFor(cell: Cell): TenantViewer;
```

At integration each body walks its cells: the function answer's `ok` and the `viewerRead` non-emptiness must both equal `sees`. This is the drift mechanism for rubric criterion 5: a policy change that admits a viewer the TypeScript rule refuses fails the PostgREST half of the cell; a TypeScript change the policy does not match fails the function half.

**`tests/at/suites/req-001/_tenant-catalog.ts`** and **`_policy-scan.ts`**: the declared lists (`unreachableByClientRoles: ['volunteer_profiles']`; `tenantIsolated: accounts(id), organizations(id), org_memberships(org_id, account_id), acknowledgments(account_id), projects(org_id, assigned_volunteer_id)`) and a pure `catalogConformanceProblems(catalog)`; the static reader parses `create table public.<name>`, `enable row level security`, `grant`/`revoke`, and `create policy … using (…)` out of every migration file in order, applying later statements over earlier ones, and hands the result to the same rule. It throws when the directory is unreadable or empty (the `_source-scan.ts` posture). The rule refuses: a public table in neither list; an isolated table without RLS, without a `select` grant to `authenticated`, without a policy, or with `using (true)`; a policy whose `using` names neither `auth.uid()` nor the table's key column; a `viewer_`-named function without the ruling-9 shape; and any `grant … to anon`. Its failure cases run in a harness selftest with synthetic inputs, beside the shipped-module selftests.

**`_pending.ts`**: unit 1 drops `D5_L1`; unit 2 drops `D5_L2`. The header counts move each time.

**`expected/req-001.json`**: unit 1 moves .21 and .22 to `green` at both tiers. Unit 2 moves .23 and .40 to `green` at both tiers and .24 to `capability-pending` with `ui.authenticated-surface-rendering` at both tiers, written identically in the bodies.

**`supabase/config.toml`**: three `[functions.*]` blocks; `public-project-page` carries `verify_jwt = false` and the comment that says all functions are authenticated is corrected.

## Unit split

**Unit 1 (cross-org denial, no existence oracle), green on its own:** the posture migration with the own-row leaves and the organisation-member branch; `tenant-reads.ts` whole (one pure rule is not split; its volunteer-grant and admin branches are exercised by the loop matrix from unit 1 and by integration in unit 2); `callerReads` and `serviceReads`; all three functions; the two `live-stack.ts` siblings; the contract, fixture and live additions; `_tenant-matrix.ts` with the .21 and .22 cells; `_tenant-catalog.ts` and `_policy-scan.ts`; the two bodies; the two comment corrections; manifest and `_pending.ts` moves for .21 and .22. The positive control for .22 in unit 1 is the owning NGO's workspace read.

**Unit 2 (assigned volunteer, admin, logged-out):** the second migration (trigger, volunteer branch, admin branches); the .23 and .40 cells; the three bodies; the trigger refusal classified in `assignVolunteerAsOperator` by sentence; manifest and `_pending.ts` moves for .23, .40 and .24. Unit 2 re-runs unit 1's ids in the same integration run, which proves the added branches broke no denial.

## Synthesis decision

*(left for the lead)*

## Tradeoffs accepted

- We accept two statements of the tenant rule (TypeScript and SQL) in exchange for a loop tier that proves product code for four ids. The cost is bounded by the matrix: a disagreement on any cell fails the integration run, so the two cannot drift silently. This is the one point where direction B and ruling 1 differ, and it is stated in the open questions.
- We accept a redundant `tenantReadAllowed` call on the deployed path, where the database already filtered. It costs two small reads (own account, own seat) per request. In exchange the handler refuses before it reads the target in the organisation case, and the core is one function at both tiers.
- We accept inline policy subqueries instead of definer helpers. Each admin policy re-evaluates a one-row subquery on `accounts`; at listing scale this is the cost the JWT-claim alternative would remove. In exchange no function is exposed on `/rest/v1/rpc/` and ruling 9's helper rules have nothing to govern.
- We accept a 404 for a row that exists. That untruth is the criterion. Writes keep 403 because the write surface already tells a member from a non-member by kind, and AT-001.16 and AT-001.36 read that kind; the refusal module states the two vocabularies.
- We accept that the public page reads with the service role. `anon` holds no grant by ruling 5, and a definer SQL function for the projection would move the eligibility predicate out of TypeScript, against the direction.
- We accept that `volunteer_profiles` stays unreachable and undeclared as tenant data. No id reads it; a policy nothing exercises is a policy nobody tests.
- We accept that the green covers five tables and names the absent surfaces in the bodies and the pull request, not a stand-in table.

## Alternatives considered

- **Database-first with no TypeScript rule (direction A's shape).** Smaller product surface by one function; the loop tier then grades only orchestration, projection and the constant. Rejected here because it is another runner's direction; it is the deletion path named below and costs nothing to graft.
- **Service-role reads with the TypeScript rule as the only gate (the reference branch's shape).** The edge function reads everything, decides, and needs the read-last discipline for the oracle property. Rejected: ruling 1 forbids it, and every deployed read would bypass the policies, so integration would prove the policies only through the raw PostgREST probes and never through the product path.
- **Definer helpers `viewer_is_org_member`, `viewer_is_platform_admin`, `viewer_is_volunteer` (the reference branch's SQL).** Same policy semantics; three functions on `/rest/v1/rpc/` with a grant posture that differs from every other function in the tree. Rejected because the own-row policy on `accounts` makes them unnecessary and the subquery graph stays acyclic without them.
- **A stand-in `drafts` table to make the criterion's words literal.** Rejected: a table no requirement owns is the phantom the first migration refuses, and it would double the catalog with rows nothing writes.

## Open questions and risks

1. Does the lead uphold ruling 1 over direction B? If yes: delete `tenantReadAllowed`, `TenantViewer`, `ownAccount` and `ownSeatIn`; the cores become "rows or `TENANT_NOT_FOUND`"; the matrix keeps its integration half; the loop bodies for .21, .22, .23 and .40 keep the orchestration, projection and byte-equality arms and lose the rule arm. Every other file in this package stands.
2. Should the INSERT grant on `accounts` to `authenticated` be removed in the posture reset? The design removes it if no body pins the RLS insert message; a grep decides before the migration is written.
3. Is an inline subquery over `accounts` inside four policies acceptable at the listing scale REQ-010 will bring, or should the analysis for a JWT claim hook be recorded now for that requirement?
4. Is the assignment trigger's account-type check wanted as SECURITY DEFINER? It must read `accounts` for an account that is not the caller, which no policy permits. The alternative is a `check` through a definer predicate, which is the same thing under another name.
5. Risk: PostgREST's schema cache. The migration ends with `notify pgrst`; the first integration run after a reset must confirm a keyed read as `authenticated` answers 200 `[]` and not 401, so an empty list is the policy speaking and not a stale cache.
6. Risk: two-minute tokens. `signInAgain` runs before every probe block; a 401 inside a cell is asserted as a distinct failure, never read as an empty list.

## Next implementation step

Write `supabase/functions/_shared/tenant-reads.ts` with `tenantReadAllowed`, the two constants and the two cores, and `tests/at/suites/req-001/_tenant-matrix.ts` with the ten cells, then make the loop body of AT-001.21 drive both before any migration is written.

## Not built here

- The public listing surface and the lifecycle that makes `publicProjectEligible` false (REQ-010/011).
- The auth screens, the route guard and the sign-in redirect that turn AT-001.24 green (the auth-screens leaf; `src/` through Lovable).
- The correction to `src/lib/api/example.functions.ts` that tells Lovable to use edge functions, not `createServerFn` (founder files it).
- The account type as a JWT claim through a custom access token hook (auth configuration; record beside the listing requirement).
- The isolation matrix each later resource must join (rightful NGO, assigned volunteer, platform admin, foreign NGO, unassigned volunteer, absent id), as a documentation change with its own ritual.
- A platform admin's read of other `accounts` rows (no id asks for it).
- Storage buckets and external task reads, which the catalog check cannot see.
