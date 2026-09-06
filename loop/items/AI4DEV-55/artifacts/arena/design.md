# Tenant isolation and visibility: the synthesized design

Base: candidate A (database-first), with grafts from B, C and D as `synthesis.md` records. This file is the contract the two units are built against. A deviation the writer needs is a signal to the lead, not something to absorb.

## The one rule, and where everything sits

The SQL policy set is the only tenant rule. Every read that must be filtered reaches PostgREST as the caller: `apikey` is the publishable key and `Authorization` is the caller's own access token. That holds for a direct probe and for the two authenticated edge functions, which forward the request's own `Authorization` header and hold no tenant decision. The service role reads nothing tenant-scoped on any read path; the one service-role call on a read path is the public project page's call to a definer RPC that returns a public projection source.

| Table | Tenant key | Readers after unit 1 | Readers added in unit 2 |
|---|---|---|---|
| `organizations` | `id` | accounts seated in it | platform admin |
| `org_memberships` | `org_id` | accounts seated in that organisation | platform admin |
| `projects` | `org_id`; `assigned_volunteer_id` | accounts seated in the owning organisation | the assigned volunteer; platform admin |
| `acknowledgments` | `account_id` | the account that made it | platform admin |
| `accounts` | none | nobody through a client key | nobody |
| `volunteer_profiles` | none | nobody through a client key | nobody |

Three definer predicates, each answering only about `auth.uid()`: `viewer_is_org_member(p_org_id uuid)` (unit 1), `viewer_is_platform_admin()` and `viewer_is_volunteer()` (unit 2). The assigned-volunteer policy checks the assignment and the account type, and a trigger makes the developer seat hold a volunteer at write time. Both are kept on purpose: the trigger stops a bad write, and the conjunct stops a read by an account whose type changed after it was seated, which no trigger on `projects` can see.

The two write functions keep their service-role lookups and definer RPCs. Moving them off the service role is listed under "Not built here".

## Migration, unit 1: `supabase/migrations/20260906120000_tenant_read_posture_and_org_member_policies.sql`

The header states the client privilege posture in one paragraph, which the static and live catalog checks test:

- `anon` holds nothing on any table in `public`. The public surface is a function, never a grant.
- `authenticated` holds `SELECT` and nothing else, and only on a table where a policy runs.
- `service_role` keeps the two reads the deployed write functions make (`accounts`, `org_memberships`) and holds no `INSERT`, `UPDATE` or `DELETE` anywhere.
- No table carries `FORCE ROW LEVEL SECURITY`; the operator connection bypasses.

Statements, in order:

```sql
-- 1. normalise: every client-role privilege on every existing table goes, then exactly SELECT returns
revoke all on table public.accounts, public.organizations, public.org_memberships,
                    public.acknowledgments, public.volunteer_profiles, public.projects
  from anon, authenticated;
-- The `select, insert` grant on accounts to authenticated from the first migration is gone. It served
-- one superseded proof (loop/items/AI4DEV-57/proof-local.ts); no body under tests/ pins that message.
-- The writer confirms that with a grep before landing this line and names the result in the header.

grant select on public.organizations   to authenticated;
grant select on public.org_memberships to authenticated;
grant select on public.projects        to authenticated;
grant select on public.acknowledgments to authenticated;

-- 2. the viewer predicate (cuts the recursion a policy on org_memberships would otherwise hit)
create function public.viewer_is_org_member(p_org_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.org_memberships m
                  where m.org_id = p_org_id and m.account_id = (select auth.uid()));
$$;
comment on function public.viewer_is_org_member(uuid) is
  'True when the calling user holds a seat in that organisation (REQ-001, AT-001.21). Answers only about auth.uid().';
revoke execute on function public.viewer_is_org_member(uuid) from public;
grant  execute on function public.viewer_is_org_member(uuid) to authenticated, service_role;

-- 3. the policies, one sentence each
create policy organizations_select_org_member   on public.organizations   for select to authenticated using (public.viewer_is_org_member(id));
create policy org_memberships_select_org_member on public.org_memberships for select to authenticated using (public.viewer_is_org_member(org_id));
create policy projects_select_org_member        on public.projects        for select to authenticated using (public.viewer_is_org_member(org_id));
create policy acknowledgments_select_own_account on public.acknowledgments for select to authenticated using (account_id = (select auth.uid()));
-- comment on policy ... one sentence each, citing the id it serves.

-- 4. the public page's source, one row, no table grant to service_role for it
create function public.read_public_project(p_project_id uuid)
returns table (project_id uuid, project_name text, organization_name text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.name, o.name
    from public.projects p join public.organizations o on o.id = p.org_id
   where p.id = p_project_id;
$$;
revoke execute on function public.read_public_project(uuid) from public;
grant  execute on function public.read_public_project(uuid) to service_role;

-- 5. the indexes the predicate and the unit-2 policy want
create index org_memberships_account_id_idx on public.org_memberships (account_id);
create index projects_assigned_volunteer_id_idx on public.projects (assigned_volunteer_id);

notify pgrst, 'reload schema';
```

`accounts` and `volunteer_profiles` get no grant and no policy; the catalog declares them unreachable by client roles, and the checks test the grant and the policy separately. The existing arm of AT-001.17 (publishable key on `org_memberships` answers 401 `permission denied`) stays true.

## Migration, unit 2: `supabase/migrations/20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql`

Adds branches, replaces nothing. Permissive policies are OR-ed.

```sql
-- 1. the seat holds a volunteer: one enforcement point, symmetric with the membership trigger
create function public.project_seat_holds_a_volunteer()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_type public.account_type;
begin
  if new.assigned_volunteer_id is null then return new; end if;
  select a.account_type into v_type from public.accounts a where a.id = new.assigned_volunteer_id;
  if v_type is null then
    raise exception 'projects refuses assignment: no account has completed signup' using errcode = '23503';
  end if;
  if v_type <> 'volunteer'::public.account_type then
    raise exception 'projects refuses assignment: a single developer seat holds a volunteer account only' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.project_seat_holds_a_volunteer() from public;
create trigger projects_seat_holds_a_volunteer
  before insert or update of assigned_volunteer_id on public.projects
  for each row execute function public.project_seat_holds_a_volunteer();
-- validate existing rows: raise when any project seats a non-volunteer account (the table is empty
-- in every environment this runs in; a violating row stops the migration rather than hiding under a policy)
do $$ begin
  if exists (select 1 from public.projects p join public.accounts a on a.id = p.assigned_volunteer_id
              where a.account_type <> 'volunteer'::public.account_type) then
    raise exception 'projects: a developer seat holds a non-volunteer account; fix the data before this migration';
  end if;
end $$;

-- 2. the administrator predicate
create function public.viewer_is_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.accounts a
                  where a.id = (select auth.uid()) and a.account_type = 'platform_admin'::public.account_type);
$$;
comment on function public.viewer_is_platform_admin() is
  'True when the calling user holds a platform administrator account row (REQ-001, AT-001.40). Answers only about auth.uid().';
revoke execute on function public.viewer_is_platform_admin() from public;
grant  execute on function public.viewer_is_platform_admin() to authenticated, service_role;

-- 3. the volunteer predicate, and the assigned developer's branch
create function public.viewer_is_volunteer()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.accounts a
                  where a.id = (select auth.uid()) and a.account_type = 'volunteer'::public.account_type);
$$;
comment on function public.viewer_is_volunteer() is
  'True when the calling user holds a volunteer account row (REQ-001, AT-001.23). Answers only about auth.uid().';
revoke execute on function public.viewer_is_volunteer() from public;
grant  execute on function public.viewer_is_volunteer() to authenticated, service_role;

-- A free seat admits nobody: null = auth.uid() is null, not true. The type conjunct stays beside the
-- trigger: the trigger guards the write, the conjunct guards a read after the account's type changed.
create policy projects_select_assigned_volunteer on public.projects
  for select to authenticated
  using (assigned_volunteer_id = (select auth.uid()) and public.viewer_is_volunteer());

-- 4. the administrator's reach, one policy per tenant table so the catalog can name the admitting clause
create policy organizations_select_platform_admin   on public.organizations   for select to authenticated using (public.viewer_is_platform_admin());
create policy org_memberships_select_platform_admin on public.org_memberships for select to authenticated using (public.viewer_is_platform_admin());
create policy projects_select_platform_admin        on public.projects        for select to authenticated using (public.viewer_is_platform_admin());
create policy acknowledgments_select_platform_admin on public.acknowledgments for select to authenticated using (public.viewer_is_platform_admin());

notify pgrst, 'reload schema';
```

## Product code

### `supabase/functions/_shared/tenant-reads.ts` (pure; relative imports only, no Deno, no I/O)

```ts
/** Exactly what a caller-bound read produced. Zero rows is a state, not an error. */
export type ReadResult<Row> = { ok: true; rows: readonly Row[] } | { ok: false; detail: string };

/** THE ONE refusal for "no such thing" and "not yours". Returned, never thrown: edgeHandler turns a throw into a 502. */
export const TENANT_NOT_FOUND = {
  status: 404,
  body: { ok: false, reason: 'no such thing is visible to this caller' },
} as const;

/** THE ONE outage answer. It names no identifier, so a faulted read is the same bytes for every target. */
export const TENANT_READ_FAILED = {
  status: 502,
  body: { ok: false, reason: 'the read could not complete, so no decision was made' },
} as const;

/** A success body, or one of the two constants. There is no fourth member. */
export type TenantReadAnswer<T> = { status: 200; body: T } | typeof TENANT_NOT_FOUND | typeof TENANT_READ_FAILED;

/** The reads a surface needs, keyed by request identifiers only. The caller's identity enters only through the token the adapter carries. */
export type TenantReads = {
  organization(organizationId: string): Promise<ReadResult<{ id: string; name: string }>>;
  seatsOf(organizationId: string): Promise<ReadResult<{ account_id: string; role: string }>>;
  projectsOf(organizationId: string): Promise<ReadResult<{ id: string; name: string; assigned_volunteer_id: string | null }>>;
  project(projectId: string): Promise<ReadResult<{ id: string; name: string; org_id: string; assigned_volunteer_id: string | null }>>;
};

export type OrganizationDashboard = {
  ok: true; organizationId: string; organizationName: string;
  seats: { accountId: string; role: string }[];
  projects: { projectId: string; projectName: string; assignedVolunteerId: string | null }[];
};
export type ProjectWorkspace = {
  ok: true; projectId: string; projectName: string; organizationId: string; assignedVolunteerId: string | null;
};

/**
 * Pure orchestration over caller-bound reads. It holds no tenant rule: the database already filtered.
 * Zero rows for the target is TENANT_NOT_FOUND; any failed read is TENANT_READ_FAILED; rows are projected field by field.
 */
export async function organizationDashboard(reads: TenantReads, organizationId: string): Promise<TenantReadAnswer<OrganizationDashboard>>;
export async function projectWorkspace(reads: TenantReads, projectId: string): Promise<TenantReadAnswer<ProjectWorkspace>>;
```

### `supabase/functions/_shared/public-project.ts` (pure)

```ts
export type PublicProjectView = { projectId: string; projectName: string; organizationName: string };
export type PublicProjectSource = { project_id: string; project_name: string; organization_name: string };

/** ONE answer for "no such project" and "not public", with no way to tell which. Returned, never thrown. */
export const PROJECT_NOT_PUBLIC = {
  status: 404,
  body: { ok: false, reason: 'no such project page is public' },
} as const;

/**
 * Whether a project row may be shown to the world. TRUE FOR EVERY ROW TODAY: projects carries no
 * visibility or lifecycle column, and the requirement that owns publication (REQ-010/011) has not landed.
 * This is the one place that requirement puts its rule.
 */
export function projectIsPublic(source: PublicProjectSource): boolean;

/** Built field by field, so a wider row cannot leak a field through. */
export function publicProjectView(source: PublicProjectSource): PublicProjectView;

export type PublicProjectReads = { source(projectId: string): Promise<ReadResult<PublicProjectSource>> };

/** THE ONE outage answer for the public surface. Names nothing. */
export const PUBLIC_READ_FAILED = {
  status: 502,
  body: { ok: false, reason: 'the public project page could not be read, so no answer was given' },
} as const;

/** A page, or one of the two constants. There is no fourth member, so a handler has nowhere to put a second refusal. */
export type PublicProjectAnswer =
  | { status: 200; body: { ok: true } & PublicProjectView }
  | typeof PROJECT_NOT_PUBLIC
  | typeof PUBLIC_READ_FAILED;

/** One read, then the predicate, then ONE `return PROJECT_NOT_PUBLIC` for both refusals. */
export async function publicProjectAnswer(projectId: string, reads: PublicProjectReads): Promise<PublicProjectAnswer>;
```

### `supabase/functions/_shared/edge.ts` additions (I/O only)

- `callerReads(supabaseUrl, anonKey, authorization): TenantReads`. Each member is one GET on `/rest/v1/<table>?<key>=eq.<id>&select=<columns>` with `apikey: anonKey` and the request's own `Authorization` header. A non-2xx answer is `{ ok: false, detail }`, never a throw. The columns are the ones the `TenantReads` row types name.
- `publicProjectReads(supabaseUrl, serviceRoleKey): PublicProjectReads`. One POST to `/rest/v1/rpc/read_public_project` with the service role.

### The three functions and the config

- `supabase/functions/organization-dashboard/index.ts` and `supabase/functions/project-workspace/index.ts`: `verify_jwt = true`. Wiring only: POST-only check, `resolveCaller` for session liveness (401 on a dead session, as the write functions answer), `readJsonBody`, a trimmed uuid or 400, then `callerReads` and the pure core, then `json(answer.body, answer.status)`. The caller's id is not passed to the core.
- `supabase/functions/public-project/index.ts`: `verify_jwt = false` in `supabase/config.toml`, with the comment that says every function is authenticated corrected. Wiring only, over `publicProjectReads` and `publicProjectAnswer`.
- CORS stays `POST, OPTIONS`. All three take `{ organizationId }` or `{ projectId }` bodies.

## Harness

### `tests/at/harness/live-stack.ts`

Two siblings of `functionPost`, returning raw text so equality is over bytes. Neither is a sentinel, fault, vendor stand-in or fixture world.

```ts
/** A Data API GET as a caller. `bearer` null sends the anon key as bearer (the AT-001.17 arm's shape). */
export async function restGet(stack: Stack, pathAndQuery: string, bearer: string | null): Promise<{ url: string; status: number; text: string }>;
/** functionPost without the parse. */
export async function functionPostRaw(stack: Stack, name: string, body: unknown, bearer: string | null): Promise<{ status: number; text: string }>;
```

### `tests/at/suites/req-001/_contract.ts`

Types, importing the projection types from the shipped modules rather than restating them:

```ts
export type ViewerAnswer = { status: number; body: string };
/** privilege-denied: the privilege layer; session-refused: the token, a broken test not a verdict; refused: anything else. */
export type ViewerRefusalKind = 'privilege-denied' | 'session-refused' | 'refused';
export type ViewerRead<Row> =
  | { ok: true; rows: readonly Row[]; answer: ViewerAnswer }
  | { ok: false; kind: ViewerRefusalKind; reason: string; answer: ViewerAnswer };
export type TenantReadOutcome<T> = { ok: true; value: T; answer: ViewerAnswer } | { ok: false; answer: ViewerAnswer };
export type PublicProjectOutcome = { ok: true; page: PublicProjectView; answer: ViewerAnswer } | { ok: false; answer: ViewerAnswer };
export type TenantTableFacts = { table: string; rowLevelSecurity: boolean; anonSelect: boolean; authenticatedSelect: boolean; policies: readonly { name: string; using: string }[] };
```

New `AccountsSut` members, grouped under a heading that says they read AS THE CALLER and that the operator reads beside them are the existence control:

```ts
organizationAsViewer(session: Session, organizationId: string): Promise<ViewerRead<OrganizationRow>>;
membershipsAsViewer(session: Session, organizationId: string): Promise<ViewerRead<MembershipRow>>;
projectAsViewer(session: Session, projectId: string): Promise<ViewerRead<ProjectRow>>;
acknowledgmentsAsViewer(session: Session, accountId: string): Promise<ViewerRead<AcknowledgmentRow>>;
organizationDashboard(session: Session, organizationId: string): Promise<TenantReadOutcome<OrganizationDashboard>>;
projectWorkspace(session: Session, projectId: string): Promise<TenantReadOutcome<ProjectWorkspace>>;
publicProjectPage(projectId: string): Promise<PublicProjectOutcome>;     // no session: a visitor has none
tenantTableFacts(): Promise<readonly TenantTableFacts[]>;               // the live half of the guard, read as the operator
```

`AssignVolunteerOutcome` gains `not-a-volunteer-account` in unit 2, classified by message first. The two comments this deliverable falsifies (`_contract.ts` on `org_memberships`, `_live.ts` on `projects`) are corrected in unit 1.

### `tests/at/suites/req-001/_fixture.ts` (loop)

No new Map and no policy mirror. `organizationDashboard`, `projectWorkspace` and `publicProjectPage` resolve the caller through the existing fixture path (a dead session answers 401 as the write members do) and run the shipped cores over a `TenantReads` built from the existing Maps, keyed by request identifiers only and filtered by nobody. The four `...AsViewer` members and `tenantTableFacts` throw `CapabilityPending(['sut.accounts.tenantReadAsViewer'])`; no loop body calls them. `assignVolunteerAsOperator` mirrors the seat trigger's `not-a-volunteer-account` refusal in unit 2, as it already mirrors the NGO-only membership trigger.

### `tests/at/suites/req-001/_live.ts` (integration)

- `freshAccessToken(session, act)`: reads `exp` from the cached token; under about twenty seconds left, runs the refresh grant through `authPost` and replaces the map entry under the same key. Every viewer member and the two function members go through it.
- `viewerRead(answer, parse)`: the one place a Data API answer becomes rows. 200 is rows; 401 or 403 with `permission denied` is `privilege-denied`; 401 or 403 naming the token or JWT is `session-refused`; anything else is `refused` with the body as the reason. Message first, SQLSTATE second.
- The four viewer members call `restGet` with the caller's token; the two function members call `functionPostRaw`; `publicProjectPage` calls `functionPostRaw` with a null bearer; `tenantTableFacts` runs one operator query over `pg_class.relrowsecurity`, `has_table_privilege('anon' | 'authenticated', ..., 'select')` and `pg_policies.qual` for every table in `public`.

### `tests/at/suites/req-001/_policy-scan.ts` (both tiers; the static half of the guard)

Precedent `_source-scan.ts`. Exports `TENANT_CATALOG` (`organizations`, `org_memberships`, `projects`, `acknowledgments` tenant-isolated; `accounts`, `volunteer_profiles` unreachable-by-client-roles) and `tenantCatalogProblems(): PolicyProblem[]`, which reads `supabase/migrations/*.sql` in filename order, applies later statements over earlier ones, and refuses: a `create table public.<t>` absent from the catalog or a catalog key with no table; any `grant ... to anon`; a tenant-isolated table without `enable row level security`, a `grant select ... to authenticated`, at least one `create policy`, or with `using (true)`; an unreachable table with an un-revoked grant to `anon` or `authenticated`; a function a policy's `using` calls that is not named `public.viewer_...`; a `viewer_` function without `security definer`, `set search_path = ''`, a revoke from `public` and an execute grant to `authenticated`. It throws when it can read no migration or finds no table. The catalog is the guard's expectation, not a source of truth: nothing derives from it.

### Selftests (no acceptance id; `bun run at:selftest` runs them in CI)

- `tests/at/harness/shipped-tenant-reads.selftest.ts`: `organizationDashboard` and `projectWorkspace` over injected reads answer the identical `TENANT_NOT_FOUND` reference for a foreign target and an absent target (both arrive as zero rows), `TENANT_READ_FAILED` for a failed read, and a projection with the named fields for rows; `publicProjectAnswer` answers `PROJECT_NOT_PUBLIC` for a missing source and for a source the predicate refuses, the same value, and exactly three fields for a public one, with `organizationId` and `assignedVolunteerId` absent by name.
- `tests/at/harness/policy-scan.selftest.ts`: synthetic migration text for each refusal case above, and the throw on an empty directory.

### Bodies and declarations

`d-tenant-isolation.test.ts` registers each id once with per-tier bodies. Loop bodies for .21, .22, .23 and .40 drive the shipped cores through the fixture surface (a foreign and an absent target answer the same constant, compared as values and as serialized bytes), assert the public projection's named absences, and run `tenantCatalogProblems()` expecting `[]`. Integration bodies in `_integration.ts` (`at00121`, `at00122`, `at00123`, `at00140`, `at00124`) follow the file's order: register through the mail catcher, sign in, complete signup, provision Givens as the operator, read as the viewer, assert; each carries `INTEGRATION_TIMEOUT_MS`; each ends with `tenantCatalogProblems()` and `sut.tenantTableFacts()`.

| Id | Tier | Body | Manifest |
|---|---|---|---|
| AT-001.21 | loop | cores over injected reads: NGO B against org A and against a random id answer the same constant; NGO A's own dashboard projects; static scan | green |
| AT-001.21 | integration | two NGOs complete signup; operator confirms A's organisation, seat, project and acknowledgment exist; A reads all four as itself (positive control) and its dashboard answers 200; B probes all four ids and four absent ids through the viewer reads (all `[]`) and through the dashboard function (404 bytes equal for foreign and absent); B's unfiltered `organizations` listing never contains A; anon on `org_memberships` still 401; both catalog halves | green |
| AT-001.22 | loop | `projectWorkspace` for an unassigned volunteer against a project and a random id answers the same constant; public projection field by field; static scan | green |
| AT-001.22 | integration | a volunteer completes signup unassigned; workspace of A's project and of a random id answer 404 bytes equal; viewer read of the project `[]`; public page answers 200 as the volunteer and with no token; owning NGO's viewer read of the project returns the row (positive control); anon workspace answers 401; catalog halves | green |
| AT-001.23 | loop | `projectWorkspace` over an injected present row projects; the sibling and the owning dashboard answer the constant; static scan | green |
| AT-001.23 | integration | volunteer seated on P1; workspace P1 200 and viewer read returns exactly P1; P2 in the same organisation, P3 in another, the owning organisation, its seats and the NGO's acknowledgment all `[]` and the function answers the constant; an operator attempt to seat an NGO account is refused with `not-a-volunteer-account`; catalog halves | green |
| AT-001.40 | loop | cores over injected rows from two tenants project; a refused read still answers the constant; static scan | green |
| AT-001.40 | integration | a provisioned platform admin reads both organisations' dashboards and both projects' workspaces (200) and all four tenant tables of two NGOs through the viewer reads; an NGO account repeats one read and gets `[]` and the constant; catalog halves | green |
| AT-001.24 | loop | `throw new CapabilityPending(['ui.authenticated-surface-rendering'])` | capability-pending, `ui.authenticated-surface-rendering` |
| AT-001.24 | integration | anon probes of the four tenant tables answer 401 and the public page answers 200 (the API half, asserted before the throw so a regression fails the run), then the same throw | capability-pending, same capability |

`tests/at/expected/req-001.json` moves in the same commit as the bodies: unit 1 moves .21 and .22 to green at both tiers; unit 2 moves .23 and .40 to green at both tiers and .24 to the capability shape at both. `_pending.ts` drops `D5_L1` in unit 1 and `D5_L2` in unit 2, with the header counts.

## Unit split

**Unit 1, green on its own (AT-001.21, AT-001.22):** migration one; `tenant-reads.ts`, `public-project.ts`, the `edge.ts` adapters, the three functions and the config entry; `restGet`, `functionPostRaw`; `_contract.ts` types and members and the two comment corrections; `_fixture.ts` members; `_live.ts` members with `freshAccessToken` and `viewerRead`; `_policy-scan.ts` with the six-table catalog; the two selftests; bodies and manifest rows for .21 and .22; `_pending.ts` loses `D5_L1`. Unit 1 ships no policy that admits a volunteer or an administrator, so AT-001.22's denial is proved by the absence of a branch, and the assigned-volunteer success is not a unit-1 control.

**Unit 2 (AT-001.23, AT-001.40, AT-001.24):** migration two; `not-a-volunteer-account` in both adapters; bodies and manifest rows for .23, .40 and .24; `_pending.ts` loses `D5_L2`. Unit 2 re-runs unit 1's ids in the same integration run.

## Tradeoffs accepted

- We accept one shipped read function per surface the ids name (dashboard, workspace, public page) in exchange for proving the product path and giving the loop tier shipped orchestration to grade. Nothing in `src/` calls them yet; neither does anything call the three write functions.
- We accept a definer RPC for the public page in exchange for `anon` holding nothing and `service_role` gaining no table grant for reads.
- We accept a text oracle as the CI guard in exchange for it running where the build runs; the live catalog check at integration is the semantic oracle.
- We accept the seat invariant stated twice, in the trigger and in the policy's type conjunct, because they guard different moments: the write, and a read after the account's type changed. AT-001.23 exercises both.
- We accept a 404 for a row that exists on reads, beside the write path's 403, because a read denial must not say something exists.
- We accept that the green is over organisations, memberships, acknowledgments and a project's identity plus assignee; the bodies and the pull request say so.
- We accept dropping the `select, insert` grant on `accounts` to `authenticated`, pending the writer's grep.

## Not built here

The authenticated screens, the sign-in route and a browser driver (the auth-screens leaf). Moving the two write functions' lookups off the service role. The isolation matrix each later resource joins (rightful NGO, assigned volunteer where applicable, platform admin, foreign NGO, unassigned volunteer, absent id, logged-out visitor), as a documentation change. The account type as a token claim. Project publication and lifecycle (REQ-010/011), which owns `projectIsPublic`. Storage object policies and external task reads, outside the table catalog. The correction to `src/lib/api/example.functions.ts`, which the founder files. The stale sentence in `loop/items/AI4DEV-57/proof-local.ts`.
