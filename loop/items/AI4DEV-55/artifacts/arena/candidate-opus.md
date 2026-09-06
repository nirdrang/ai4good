# Candidate design — direction A, database-first

One rule, written once, in SQL. Every read that must be filtered reaches PostgREST as the caller.
No TypeScript anywhere holds a second copy of the tenant rule. The only edge function this
deliverable adds is the one surface that has no caller to read as: the public project page for a
logged-out visitor.

---

## Problem

Five acceptance ids must turn green and the tree has no tenant read path at all. Six tables carry
row-level security with zero policies. Three edge functions exist and all three write. The front end
is one heading. So "who may see what" today has one answer: the service role and the operator see
everything, and nobody else sees anything.

The shape is non-obvious because the enforcement point is not yet chosen, and three written intents
disagree about it. The project rule says the user interface never touches the database. The migration
notes imagine the project page and the dashboard reading through row-level security. A file under
`src/` tells Lovable to use `createServerFn`. Only one of the three can be the rule that the
acceptance ids grade.

The constraints that bind this design, all from the explanation and the lead's rulings:

- A grant must precede a policy. Without `grant select … to authenticated` the read fails at the
  privilege layer and the policy never runs. `projects` and `volunteer_profiles` carry `revoke all`.
- The account type is not a claim in the token. A policy that needs it reads `public.accounts`
  through a definer helper with `set search_path = ''` and `execute` granted to `authenticated`.
- `service_role` data-changing privileges must not widen, and `force row level security` must not be
  set. The first would defeat the platform-admin refusal in `complete_signup`; the second would break
  operator provisioning.
- The service role and the operator connection bypass row-level security. Every edge-function lookup
  and every harness read-back today is such a read, and none of them can prove isolation.
- The loop tier has no database. It can prove a shipped pure decision and the shape of an
  edge-function answer. It cannot run a policy.
- This pull request cannot touch `src/`. The ownership guard fails a pull request that changes both
  Lovable territory and Claude territory.
- The named surfaces — drafts, ledger, reference files, comment thread, dashboard, tasks, listings —
  have no table and no route. The tenant rows that exist are organisations, memberships,
  acknowledgments, volunteer profiles, and a project's identity plus its assigned volunteer.
- The lead ruled: one rule for reads in SQL; a viewer-shaped read in the harness named apart from the
  operator read; no policy mirror in the loop fixture; a durable guard that runs in the continuous
  integration build; one privilege posture stated once; the no-existence-oracle property structural;
  one eligibility predicate on the public surface; assignment grants access only to a volunteer;
  policy helpers marked and granted differently; the logged-out id red with a named shape; sign in
  right before each probe; two false comments corrected.

---

## Usage (caller's view)

### The README this design ships

> **Reading tenant data.** There is one rule and it lives in the database. A caller reads
> `/rest/v1/<table>` with the publishable key as `apikey` and its own access token as
> `Authorization`. The policy set decides which rows come back. A row the caller may not see is not
> refused; it is absent. A table the caller's role holds no privilege on answers `401` with
> `permission denied for table …`, and that answer is the same for every row, so it names no row.
>
> There is no second rule. No TypeScript function decides whether a caller may read a tenant row. A
> future edge function that reads tenant data forwards the caller's `Authorization` header to
> PostgREST and returns what came back; it never reads with the service role, and it never learns who
> the caller is.
>
> **The one exception is the public project page.** A logged-out visitor has no token, and `anon`
> holds no privilege on any table. So the public page is an edge function with `verify_jwt = false`
> that reads with the service role and answers a projection built field by field. One shipped
> predicate says whether a project may be shown to the world. One exported constant is the answer for
> "no such project" and for "this project may not be shown", and there is nowhere in the handler to
> put a second one.

### Call site 1 — an acceptance body probes a foreign organisation

```ts
// tests/at/suites/req-001/_integration.ts — AT-001.21
const ngoA = await registerConfirmAndSignIn(sut, w.email('ngo-a-21'));
const a = await sut.completeSignup(ngoA, { accountType: 'ngo', organizationName: 'Riverside Shelter 21', … }, CLIENT_IP);

// the operator control: the row is really there, so an empty viewer answer is not an empty database
expect(await sut.organization(a.organizationId), 'the operator cannot see NGO A organisation').not.toBeNull();

// the positive control: the rightful reader sees exactly the row
const own = await sut.organizationAsViewer(ngoA, a.organizationId);
expect(own.ok && own.rows.map((r) => r.id), 'NGO A cannot read its own organisation').toEqual([a.organizationId]);

// the act: NGO B probes NGO A identifier directly against the data interface
const foreign = await sut.organizationAsViewer(ngoB, a.organizationId);
expect(foreign.ok && foreign.rows, 'NGO B read a row of NGO A').toEqual([]);

// the no-existence-oracle clause, over the bytes that crossed the wire
const absent = await sut.organizationAsViewer(ngoB, crypto.randomUUID());
expect(absent.answer, 'the foreign answer differs from the absent answer, so the refusal is an oracle')
  .toEqual(foreign.answer);
```

### Call site 2 — the assigned volunteer, and the scope of the grant

```ts
// tests/at/suites/req-001/_integration.ts — AT-001.23
const seated = await sut.projectAsViewer(volunteer, assignedProject.id);
expect(seated.ok && seated.rows.map((r) => r.id), 'the assigned volunteer cannot read its project').toEqual([assignedProject.id]);

// scoped to that project only — a sibling project in the SAME organisation stays invisible
expect((await sut.projectAsViewer(volunteer, siblingProject.id)).ok && …rows, 'the volunteer read a project it is not assigned to').toEqual([]);
// and the owning organisation, its seat and the NGO acknowledgment stay invisible too
expect((await sut.organizationAsViewer(volunteer, orgId)).ok && …rows, 'the volunteer read the owning organisation').toEqual([]);
expect((await sut.membershipsAsViewer(volunteer, orgId)).ok && …rows, 'the volunteer read the organisation seat').toEqual([]);
expect((await sut.acknowledgmentsAsViewer(volunteer, ngoAccountId)).ok && …rows, 'the volunteer read the NGO acknowledgment').toEqual([]);
```

### Call site 3 — the public page, and the future user interface

```ts
// a test body, and the same call a browser makes
const page = await sut.publicProjectPage(project.id);
expect(page.ok && page.page, 'the public project page does not render').toEqual({
  projectId: project.id,
  projectName: 'Riverside Shelter Website 22',
  organizationName: 'Riverside Shelter 22',
});

// the future workspace screen, when the auth-screens leaf lands. It calls one edge function.
// That function forwards the caller's Authorization header to PostgREST and returns what came back.
// It holds no rule, so this screen and the probe above are filtered by the same policy.
const rows = await fetch('/functions/v1/tenant-read?resource=projects&id=' + id, {
  headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}` },
});
```

The third call site is written here and **is not built in this pull request**. No user interface
exists, this pull request cannot create one, and no acceptance id needs the proxy. The contract is
stated so the leaf that lands the screens has it, and the section "Not built here" carries it.

---

## Shape

### The load-bearing decision

**The policy set is the system under test.** Everything else in this design either provisions the
state a policy reads, or transports a caller's identity to the policy, or checks that the policy set
still has the shape it claims.

That decision follows from one fact and one ruling. The fact: the only read that exercises a policy
is a request carrying the caller's own token, and the harness has exactly one way to make such a
request. The ruling: one rule for reads, in SQL, exercised on every path. Direction A takes the
ruling to its end. If the rule is in SQL and TypeScript holds no copy, then TypeScript on the read
path is transport, and transport is not worth building before there is something to transport for.

### Data structures first

Three structures carry the whole design.

**One: the tenant key of each table.** Every policy is one sentence about one column.

| Table | Tenant key | Who reads it |
|---|---|---|
| `organizations` | `id` | the accounts seated in it; the platform admin |
| `org_memberships` | `org_id` | the accounts seated in that organisation; the platform admin |
| `projects` | `org_id`, and `assigned_volunteer_id` | the seated accounts; the assigned volunteer; the platform admin |
| `acknowledgments` | `account_id` | the account that made it; the platform admin |
| `accounts` | none | nobody, through a client key |
| `volunteer_profiles` | none | nobody, through a client key |

The two tables with no tenant key get no grant and no policy. That is not an omission; it is the
second half of the classification the guard checks.

**Two: the viewer predicate.** Two definer functions, each answering one question about
`auth.uid()` and nothing else:

- `public.viewer_is_org_member(p_org_id uuid) returns boolean`
- `public.viewer_is_platform_admin() returns boolean`

Neither takes an argument that names another person, so neither can be asked about somebody else.
That is what makes their exposure at `/rest/v1/rpc/` safe: a caller learns its own standing, which it
already knows. Both carry the `viewer_` prefix, `security definer`, `set search_path = ''`, a revoke
from `public` and an `execute` grant to `authenticated`, per the lead's ruling on helpers, and the
guard enforces every part of that sentence.

The reference branch had a third helper, `viewer_is_volunteer()`. This design does not ship it. See
"the seat invariant" below.

**Three: the read outcome the harness sees.**

```ts
export type ViewerAnswer = { status: number; body: string };   // exactly what crossed the wire
export type ViewerRefusalKind = 'privilege-denied' | 'session-refused' | 'refused';
export type ViewerRead<Row> =
  | { ok: true; rows: readonly Row[]; answer: ViewerAnswer }
  | { ok: false; kind: ViewerRefusalKind; reason: string; answer: ViewerAnswer };
```

`ok: true` with `rows: []` and `ok: false` are different states and the type keeps them apart. That
separation is the whole reason this type exists rather than `Row[]`. A filtered read answers `200`
with `[]`. A privilege denial answers `401` with `permission denied for table …`. A dead token
answers `401` with a token message. A body that could not tell the three apart would report
"isolation works" for a stack whose grants were never applied, and would report the same for an actor
whose two-minute token expired mid-body.

### How data flows

```
a signed-in caller                              a logged-out visitor
        |                                                |
   access token                                      no token
        |                                                |
        v                                                v
  GET /rest/v1/<table>?…                    POST /functions/v1/public-project
  apikey: publishable                       apikey: publishable, verify_jwt = false
  Authorization: Bearer <token>                          |
        |                                                v
        v                                    read project, then organisation
  privilege layer  --no grant-->  401        with the service role
        |                                                |
        v                                                v
  policy layer  --no match-->  200 []        projectIsPublic(project) ? view : PROJECT_NOT_PUBLIC
        |
        v
  200 [row]
```

Two paths, and neither has a TypeScript tenant decision on it.

### What is encoded in types, and where validation lives

- **The refusal cannot become an oracle.** For an authenticated read, the two answers are produced by
  PostgREST from the same code path — `[]` is `[]` — so there is no place in this design where a
  developer could add a second refusal for "not yours". The property is not asserted into existence;
  it is a consequence of removing the handler that would have held it.
- **The public refusal has one value and one return point.** `PROJECT_NOT_PUBLIC` is exported,
  returned and never thrown, and `publicProjectAnswer` has exactly one `return PROJECT_NOT_PUBLIC`
  statement covering both "no such project" and "not publicly visible". A second refusal would have
  to be written as a second statement, which review sees.
- **Read order is a property of the code, not a discipline.** The public handler reads the project,
  applies the predicate, and only then reads the organisation. Both refusal paths therefore perform
  exactly one read, so a fault in the second read cannot separate them.
- **The seat invariant has one home.** A trigger on `public.projects` refuses a non-volunteer account
  in `assigned_volunteer_id`, the way the membership trigger refuses a non-NGO grantee. The
  assigned-volunteer policy then reads `assigned_volunteer_id = (select auth.uid())` and does not
  restate the account type. The reference branch put `and public.viewer_is_volunteer()` in the policy
  precisely because no constraint enforced the seat's type; the lead's ruling adds that constraint,
  so the compensating conjunct becomes a second statement of one invariant with nothing able to
  notice them diverging. One invariant, one enforcement point, per single-source-of-truth. The open
  questions section asks the human whether defence in depth is wanted here anyway.
- **Validation sits at the boundaries.** PostgREST parses and types the request. The policy is the
  business rule and it is pure in the database sense: it reads rows and returns a boolean. The
  harness adapter parses the wire answer into domain rows at one seam and nothing downstream touches
  the wire again, per boundary-discipline.

### Interface depth

The public surface this deliverable adds is small: one edge function with one input (a project id),
one shipped predicate, one projection type, one refusal constant, two definer predicates, nine
policies, and six harness members. Behind that surface sit the privilege layer, the policy layer,
token freshness, refusal classification, and the whole question of who may see what.

The complexity that stays exposed to callers is exactly one thing: a caller must send its own token
and read the answer's shape. That is the minimum for an architecture whose enforcement point is the
database, and hiding it would mean reintroducing a proxy that hides nothing else.

What the interface deliberately does not do: it does not offer a "may I read X" question. There is no
such call, at any layer, in any language. A caller finds out by reading. That absence is the
direction's whole content, and it is why a future reviewer will not find a second rule to keep in
step with the first.

### The relation between the two written rules

The project rule says the user interface never touches the database directly and always goes through
an edge function. The SQL rule says the policy set decides every read. This design keeps both, and
states the relation once:

> The TypeScript rule is about **who may issue the request**. The SQL rule is about **which rows come
> back**. A screen calls an edge function; that function forwards the caller's token to PostgREST and
> returns the rows verbatim. It resolves nothing about the caller and holds no tenant rule, so it can
> never disagree with the policy set. Where the two rules could have conflicted — an edge function
> reading with the service role and filtering in TypeScript — this design deletes the conflict by
> deleting the filter.

The acceptance ids are proved against PostgREST directly because that is the enforcement point. A
proof at the enforcement point covers every caller that traverses it, the future screens included.

### How the ids are proved against surfaces that do not exist

Decided once, here, and repeated in the bodies' own evidence and in the pull request:

1. **The stand-in is named, never simulated.** Drafts, ledger, reference files, comment thread,
   dashboard and tasks have no table. The five ids are proved over the tenant rows that do exist. The
   mapping is: an organisation's non-public data is its `organizations` row, its `org_memberships`
   seat, its `projects` rows and its `acknowledgments` rows; a project's working data is its
   `projects` row. No fixture world, sentinel, fault or vendor stand-in is added to pretend
   otherwise, and no table is created for a requirement that does not own it.
2. **A later requirement's new table is forced to join the policy set by a tripwire.** A static scan
   over `supabase/migrations/*.sql` enumerates every `create table public.…` and fails when a table
   is missing from a declared classification, or when a table declared tenant-isolated lacks
   row-level security, a grant, a policy, or carries `using (true)`. It runs at the loop tier, which
   is the tier the continuous integration build runs. The integration tier keeps the same check
   against the live catalog, where a hand-dropped policy is also caught.
3. **The classification list is the guard's expectation, not a source of truth.** Nothing derives
   from it: no policy, no TypeScript, no test body reads it to decide anything. It exists so the scan
   has something to compare the migrations against. This is the deliberate difference from a
   catalog-first design.

---

## 1. Migration sketch

Two migrations, one per unit. Bodies marked `-- TODO` where the logic is routine.

### Unit 1 — `20260905120000_tenant_read_privileges_and_org_member_policies.sql`

```sql
-- REQ-001 D5 unit 1 — the client privilege posture, and the organisation-member read branch.
--
-- THE POSTURE, STATED ONCE.
--   * `anon` holds NOTHING on any table in `public`, before this migration and after it. The public
--     surface of this product is an edge function, never a table grant.
--   * `authenticated` holds `select` and nothing else, and only on a table where a policy runs.
--   * `service_role` keeps the reads the deployed functions make, and holds no insert, update or
--     delete anywhere. Every write goes through a definer function.
--   * The operator connection bypasses row-level security and is not constrained here.
-- The static and live catalog checks test this paragraph, so it is a specification and not a note.

/* ---------------------------------------------------------------- 1. normalise what clients hold */

-- Supabase ships ALTER DEFAULT PRIVILEGES for `public`, so a new table arrives already carrying
-- REFERENCES, TRIGGER and TRUNCATE for the three Data API roles. Two earlier migrations revoked
-- those on the two newest tables. This revokes them everywhere, so the posture is stated in one
-- place instead of being inferred from four files.
revoke all on table public.accounts, public.organizations, public.org_memberships,
                   public.acknowledgments, public.volunteer_profiles, public.projects
  from anon, authenticated;

-- THE `accounts` GRANT FROM THE FIRST MIGRATION IS GONE, and its removal is deliberate. It existed
-- so one superseded proof could show row-level security as the refusing layer on an insert. No test
-- body in `tests/at/suites/req-001/` pins that message; only `loop/items/AI4DEV-57/proof-local.ts`
-- does, and that script is not re-run. A client-key insert into `public.accounts` now fails at the
-- privilege layer, which is stricter.

/* ---------------------------------------------------------------- 2. grant where a policy runs */

grant select on public.organizations   to authenticated;
grant select on public.org_memberships to authenticated;
grant select on public.projects        to authenticated;
grant select on public.acknowledgments to authenticated;

-- The public project page reads with the service role, because a logged-out visitor has no token to
-- read as and `anon` is granted nothing. These are reads; the no-write posture is unchanged.
grant select on public.organizations to service_role;
grant select on public.projects      to service_role;

/* ---------------------------------------------------------------- 3. the viewer predicate */

-- WHY A DEFINER FUNCTION. A `select` policy on `public.org_memberships` that read
-- `public.org_memberships` would recurse into itself. A definer function runs as its owner, whose
-- reads are not subject to row-level security, so the recursion is cut structurally.
-- IT ANSWERS ONLY ABOUT `auth.uid()`. There is no argument that names another person.
create function public.viewer_is_org_member(p_org_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.org_memberships m
     where m.org_id = p_org_id and m.account_id = (select auth.uid())
  );
$$;

comment on function public.viewer_is_org_member(uuid) is
  'True when the calling user holds a seat in that organisation (REQ-001, AT-001.21). Answers only about auth.uid().';

-- THE GRANT TO `authenticated` IS MANDATORY AND DIFFERS FROM THE WRITE-PATH FUNCTIONS. A policy
-- expression is evaluated as the querying role, so that role needs EXECUTE on any function the
-- policy calls. Copying the service-role-only posture would make every read below fail on the
-- function instead of answering.
revoke execute on function public.viewer_is_org_member(uuid) from public;
grant  execute on function public.viewer_is_org_member(uuid) to authenticated, service_role;

/* ---------------------------------------------------------------- 4. the policies */

-- One `select` policy per table, each naming its own tenant key. No `using (true)` anywhere; the
-- catalog checks refuse one.

create policy organizations_select_org_member on public.organizations
  for select to authenticated using (public.viewer_is_org_member(id));

create policy org_memberships_select_org_member on public.org_memberships
  for select to authenticated using (public.viewer_is_org_member(org_id));

create policy projects_select_org_member on public.projects
  for select to authenticated using (public.viewer_is_org_member(org_id));

-- Acknowledgments are keyed on the account, not on an organisation: the row records one person
-- accepting the terms, and it belongs to no organisation. Own-account is both the honest rule and
-- strictly tighter than an organisation-wide one, which is what AT-001.21 needs.
create policy acknowledgments_select_own_account on public.acknowledgments
  for select to authenticated using (account_id = (select auth.uid()));

-- comment on policy … is '…' for each of the four.   -- TODO, one sentence each, citing its id.

-- `public.accounts` and `public.volunteer_profiles` get NO grant and NO policy. Both are declared
-- unreachable-by-client-roles in the catalog classification, and the checks test the two reasons
-- separately: a grant check alone would call a granted-but-unpolicied table reachable.

notify pgrst, 'reload schema';   -- the function joins the exposed schema; policies need no reload.
```

### Unit 2 — `20260906120000_tenant_read_volunteer_seat_and_admin_reach.sql`

```sql
-- REQ-001 D5 unit 2 — the assigned developer's branch and the platform administrator's reach.
--
-- IT ADDS BRANCHES AND REPLACES NOTHING. Permissive `select` policies on one table are OR-ed, so
-- every policy unit 1 created still stands and each policy below widens the admitted set by one
-- clause. A slice does not ship a policy branch it does not test, which is why these are here.
--
-- NO NEW TABLE GRANT. A platform administrator authenticates as an ordinary user in the
-- `authenticated` role; what makes it an administrator is one row in `public.accounts`.

/* ------------------------------------------------- 1. the seat holds a volunteer, and only one */

-- WHY THIS TRIGGER IS PART OF A READ SLICE. The policy below grants a project's working data to the
-- account in `assigned_volunteer_id`. That column is a bare `uuid references public.accounts (id)`;
-- nothing restricts the seat holder's type. Without this trigger the policy would have to restate
-- the type, and the invariant would live in two places. The membership seat already has such a
-- guard; the two seats are now symmetric.
create function public.project_seat_holds_a_volunteer()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  -- TODO: when new.assigned_volunteer_id is not null and the account is not `volunteer`,
  -- raise insufficient_privilege with the sentence
  -- 'projects refuses account %: a single developer seat holds a volunteer account only'.
  return new;
end;
$$;

create trigger projects_seat_holds_a_volunteer
before insert or update on public.projects
for each row execute function public.project_seat_holds_a_volunteer();

revoke execute on function public.project_seat_holds_a_volunteer() from public;

-- The migration validates what is already there, so the invariant is true of the whole table and
-- not only of future writes. The table is empty in every environment this runs in; a row that
-- violated it would stop the migration rather than sit under a policy that assumes it.
do $$ begin
  -- TODO: raise when any existing project seats a non-volunteer account.
end $$;

/* ------------------------------------------------- 2. the administrator predicate */

create function public.viewer_is_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
     where a.id = (select auth.uid())
       and a.account_type = 'platform_admin'::public.account_type
  );
$$;

comment on function public.viewer_is_platform_admin() is
  'True when the calling user holds a platform administrator account row (REQ-001, AT-001.40). Answers only about auth.uid().';

revoke execute on function public.viewer_is_platform_admin() from public;
grant  execute on function public.viewer_is_platform_admin() to authenticated, service_role;

/* ------------------------------------------------- 3. the assigned developer's branch */

-- A FREE SEAT ADMITS NOBODY: `null = auth.uid()` is null, not true, so an unassigned project stays
-- unreadable through this branch. That is a property of the comparison, not a guard.
-- THE ACCOUNT TYPE IS NOT RESTATED HERE. The trigger above is the single enforcement point for
-- "a seat holds a volunteer"; see this file's first section.
create policy projects_select_assigned_volunteer on public.projects
  for select to authenticated using (assigned_volunteer_id = (select auth.uid()));

/* ------------------------------------------------- 4. the administrator's reach */

-- Four separate policies rather than four widened clauses: each existing tenant rule stays readable
-- exactly as it was written, and the catalog check can name the clause that admits a reader.
-- The reach is not narrowed per table, per the founder ruling that the role spans all accounts.
create policy organizations_select_platform_admin   on public.organizations
  for select to authenticated using (public.viewer_is_platform_admin());
create policy org_memberships_select_platform_admin on public.org_memberships
  for select to authenticated using (public.viewer_is_platform_admin());
create policy projects_select_platform_admin        on public.projects
  for select to authenticated using (public.viewer_is_platform_admin());
create policy acknowledgments_select_platform_admin on public.acknowledgments
  for select to authenticated using (public.viewer_is_platform_admin());

-- comment on policy … is '…' for each of the four.   -- TODO

notify pgrst, 'reload schema';   -- for the new function; a policy is not in that cache.
```

### What happens to `anon`

`anon` is revoked on all six tables in unit 1 and is granted nothing, in this deliverable or in any
earlier one. It reaches no table, no view and no policy. The one thing it reaches is the
`public-project` function, which carries `verify_jwt = false`. The static and live catalog checks
both assert "anon holds no privilege on any table in `public`", so the posture cannot decay quietly.

The existing arm of AT-001.17 — the publishable key answering `401 permission denied` on
`GET /rest/v1/org_memberships` — stays true, and this design does not change it.

---

## 2. Read surfaces

| Surface | Input | Auth | Reads as | Refusal shape | Acceptance ids |
|---|---|---|---|---|---|
| `GET /rest/v1/organizations?id=eq.<uuid>&select=id,name` | organisation id | caller token | the caller | `200 []` when filtered; `401 permission denied` when the role holds no privilege | AT-001.21, .23, .40 |
| `GET /rest/v1/org_memberships?org_id=eq.<uuid>&select=org_id,account_id,role` | organisation id | caller token | the caller | same | AT-001.21, .23, .40 |
| `GET /rest/v1/projects?id=eq.<uuid>&select=id,org_id,name,assigned_volunteer_id` | project id | caller token | the caller | same | AT-001.21, .22, .23, .40 |
| `GET /rest/v1/acknowledgments?account_id=eq.<uuid>&select=…` | account id | caller token | the caller | same | AT-001.21, .40 |
| `POST /functions/v1/public-project` | `{ projectId }` | none (`verify_jwt = false`) | the service role | `404` with `PROJECT_NOT_PUBLIC`, one value for "no such project" and for "not publicly visible" | AT-001.22, .24 |

Four of the five are the database's own interface and this design ships no code for them. The fifth
is the whole of the new product code:

```ts
// supabase/functions/_shared/public-project.ts
// Pure. No Deno global, no non-relative import: it is compiled by tests/at/tsconfig.json and run by
// the edge runtime. Every row a decision needs is read by the caller and handed here.

/** The three fields the world may see. The absences are the substance: no organisation id, no person. */
export type PublicProjectView = {
  projectId: string;
  projectName: string;
  organizationName: string;
};

export type ProjectIdentity = { id: string; name: string; orgId: string };
export type OrganizationIdentity = { id: string; name: string };

/**
 * The ONE answer the public surface gives when it does not answer — for a project that does not
 * exist AND for a project that may not be shown, with no way to tell which. Returned, never thrown:
 * `edgeHandler` turns a throw into a 502, which would separate the two paths through the error path.
 */
export const PROJECT_NOT_PUBLIC = {
  status: 404,
  body: {
    ok: false,
    reason:
      'no such project page is public — it does not exist, or it exists and is not public, ' +
      'and this answer deliberately does not say which',
  },
} as const;

/**
 * Whether a project row may be shown to the world.
 *
 * IT RETURNS TRUE FOR EVERY ROW TODAY, and that is the honest state of this tree: `public.projects`
 * carries no visibility and no lifecycle column, and the requirement that owns project publication
 * (REQ-010/011) has not landed. A column nothing enforces is the defect the first migration refuses
 * in its own words, so none is added here. The predicate exists so there is ONE place for that
 * requirement to put the rule, and so the refusal collapse below is already structural when it does.
 */
export function projectIsPublic(project: ProjectIdentity): boolean {
  throw new Error('not implemented');
}

/** Built field by field, so a wider row handed in cannot leak a field through. */
export function publicProjectView(
  project: ProjectIdentity,
  organization: OrganizationIdentity,
): PublicProjectView {
  throw new Error('not implemented');
}

export type PublicProjectReads = {
  project(projectId: string): Promise<ProjectIdentity | null>;
  organization(organizationId: string): Promise<OrganizationIdentity | null>;
};

/**
 * The handler's whole decision, with its reads injected.
 *
 * ONE `return PROJECT_NOT_PUBLIC` STATEMENT covers both refusals, and there is nowhere else in this
 * function to put a second one.
 * THE ORGANISATION IS READ AFTER THE PREDICATE, so both refusal paths perform exactly one read and a
 * fault in the second read cannot separate them.
 */
export async function publicProjectAnswer(
  projectId: string,
  reads: PublicProjectReads,
): Promise<{ status: number; body: Record<string, unknown> }> {
  throw new Error('not implemented');
  // TODO: const project = await reads.project(projectId);
  // TODO: if (project === null || !projectIsPublic(project)) return PROJECT_NOT_PUBLIC;
  // TODO: const organization = await reads.organization(project.orgId);
  // TODO: organization === null is an invariant violation (org_id is a NOT NULL foreign key) — throw,
  //       so it becomes a 502 rather than wearing the caller-facing refusal.
  // TODO: return { status: 200, body: { ok: true, ...publicProjectView(project, organization) } };
}
```

```ts
// supabase/functions/public-project/index.ts — the shell, and it is thin on purpose.
import { edgeHandler, json, readJsonBody, refusal, requireEnv } from '../_shared/edge.ts';
import { publicProjectAnswer, type PublicProjectReads } from '../_shared/public-project.ts';

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');

/**
 * THE SERVICE-ROLE READ THAT SURVIVES, and why. A logged-out visitor holds no token, so there is no
 * caller to read as, and `anon` is granted nothing by the lead's ruling. The read is over data this
 * design declares public through `projectIsPublic`, so no tenant rule sits on it.
 */
const reads: PublicProjectReads = {
  project: async (projectId) => { throw new Error('not implemented'); },       // TODO: GET /rest/v1/projects?id=eq.…
  organization: async (organizationId) => { throw new Error('not implemented'); }, // TODO: GET /rest/v1/organizations?id=eq.…
};

Deno.serve(edgeHandler('public-project', async (request) => {
  const body = await readJsonBody(request);            // TODO: refuse a missing or non-uuid projectId with 400
  const answer = await publicProjectAnswer(String(body.value.projectId), reads);
  return json(answer.body, answer.status);
}));
```

```toml
# supabase/config.toml
[functions.public-project]
verify_jwt = false   # the only function in this tree that a logged-out visitor may call
```

**No authenticated read function ships.** The proxy sketched in call site 3 is a later leaf's, and
"Not built here" carries its contract. The reason is the reason a route registry no router imports
was refused: a surface nothing calls reports a capability nothing enforces.

---

## 3. Proof map

Ten rows. "Layer" names what a green over that row establishes.

| Id | Tier | What the body does | Layer proved | Positive control | Manifest |
|---|---|---|---|---|---|
| AT-001.21 | loop | Runs the static policy scan over `supabase/migrations/*.sql`; then declares the missing capability. | The migration set declares the four tenant tables isolated, with row-level security, a grant, a policy and no `using (true)`; `anon` holds nothing. No policy runs. | The scan throws when it can read no migration or finds no table, so an empty result cannot pass as an intact policy set. | red, `capability-pending`, `sut.accounts.tenantReadAsViewer` |
| AT-001.21 | integration | Two NGO accounts complete signup through the product path. The operator confirms NGO A's organisation, seat, project and acknowledgment exist. NGO A reads all four as itself. NGO B then probes all four of NGO A's identifiers, and probes four absent identifiers. | The policy layer, on a real request carrying NGO B's own token. The byte comparison proves the denial names no row. | NGO A's own reads return exactly its rows, so the empty answers are not an empty database. | green |
| AT-001.22 | loop | The static policy scan; then declares the missing capability. | Same as AT-001.21 loop. The public projection is graded by `tests/at/harness/shipped-public-project.selftest.ts`, which drives the shipped handler with injected reads. | Same. | red, `capability-pending`, `sut.accounts.tenantReadAsViewer` |
| AT-001.22 | integration | A volunteer completes signup and is not assigned to the project. It probes the project row and an absent id. Then the public page is fetched for the same project, with no token. | The policy layer denies the volunteer; the public function answers a three-field projection; `anon` reaches no table. | The operator read shows the project exists, and the public page renders it, so the empty answer is about the reader and not about the row. | green |
| AT-001.23 | loop | The static policy scan; then declares the missing capability. | Same as AT-001.21 loop. | Same. | red, `capability-pending`, `sut.accounts.tenantReadAsViewer` |
| AT-001.23 | integration | A volunteer is seated on project one. It reads project one; then probes project two in the same organisation, project three in another organisation, the owning organisation, its seat, and the NGO's acknowledgment. An operator attempt to seat an NGO account is refused. | The assigned-developer policy branch grants exactly one project row and nothing else. The seat trigger enforces the branch's premise. | The seated read returns the row with `assignedVolunteerId` equal to the volunteer, so the four empty answers are not a broken token. | green |
| AT-001.40 | loop | The static policy scan; then declares the missing capability. | Same as AT-001.21 loop. | Same. | red, `capability-pending`, `sut.accounts.tenantReadAsViewer` |
| AT-001.40 | integration | A provisioned platform administrator reads the organisation, seat, project and acknowledgment of two different NGO accounts. An NGO account then repeats one of those reads. | The administrator policy branch spans accounts; the repeat proves the reach belongs to the account type and not to a world-readable row. | The administrator's own eight reads return rows; the non-administrator's repeat returns none. | green |
| AT-001.24 | loop | Declares the missing capability. | Nothing. No route, no router, no browser driver. | — | red, `capability-pending`, `ui.authenticated-surface-rendering` |
| AT-001.24 | integration | Probes all four tenant tables with the publishable key and no user token, and fetches the public project page the same way; then declares the missing capability. | The interface half of "public surfaces only": `anon` reaches no tenant table and reaches the public page. The rendering and redirect halves are not proved. | The public page answers, so the four refusals are not a stack that is down. | red, `capability-pending`, `ui.authenticated-surface-rendering` |

**Why the four loop rows are red.** The criterion in each case is a verdict — denied, or granted and
scoped. In this design the verdict is a policy, and the loop tier has no database. The alternative
would be a TypeScript stand-in for the rule, which is the third copy the lead's ruling refuses. So
the loop bodies declare the capability they lack, by name, and the manifest declares that red.

**Why the reds still guard.** Each loop body runs the static policy scan *before* it declares the
capability. If the scan finds a problem, the body fails with the scan's own error, which does not
match the declared `capability-pending` shape, so `--expect` fails the run. A passing scan produces
the declared red. The declared red is therefore conditional on the guard, and the continuous
integration build — which runs the loop tier and `bun run at:selftest`, and never the integration
tier — still fails when the policy set loses its shape or a new table appears unclassified.

**AT-001.24's shape.** The founder ruled it red at both tiers. The interface half of its Then-clause
is asserted as an arm before the declaration, for the same reason: an arm under a declared red still
fails the run when it breaks.

---

## 4. Harness changes

### `tests/at/suites/req-001/_contract.ts`

Additions, and two corrections.

```ts
import type { PublicProjectView } from '../../../../supabase/functions/_shared/public-project.ts';

/** Exactly what crossed the wire — the acceptance claim about a denial is a claim about bytes. */
export type ViewerAnswer = { status: number; body: string };

/**
 * WHY THREE KINDS AND NOT A BOOLEAN. `ok: true, rows: []` is the policy layer filtering, and it is
 * the answer AT-001.21 and .22 assert. `privilege-denied` is the privilege layer, which is a
 * different mechanism and a different criterion. `session-refused` is a token the stack rejected,
 * which is a broken test rather than a product verdict and must never read as an empty list.
 */
export type ViewerRefusalKind = 'privilege-denied' | 'session-refused' | 'refused';

export type ViewerRead<Row> =
  | { ok: true; rows: readonly Row[]; answer: ViewerAnswer }
  | { ok: false; kind: ViewerRefusalKind; reason: string; answer: ViewerAnswer };

/** The public page's answer. THE REFUSAL CARRIES NO PARSED SHAPE — there is nowhere to put a field
 *  that would distinguish "absent" from "not public", which is the criterion's own requirement. */
export type PublicProjectOutcome =
  | { ok: true; page: PublicProjectView; answer: ViewerAnswer }
  | { ok: false; answer: ViewerAnswer };

/** One row of the live privilege and policy catalog — the integration half of the tenant guard. */
export type TenantTableFacts = {
  table: string;
  rowLevelSecurity: boolean;
  anonSelect: boolean;
  authenticatedSelect: boolean;
  policies: readonly { name: string; using: string }[];
};
```

Six new members on `AccountsSut`:

```ts
  /* ------------------------------- read AS THE CALLER, never as the operator ------------------ */

  /**
   * These four run a Data API GET carrying THAT CALLER'S OWN ACCESS TOKEN, so the policy set is what
   * answers. They are the only reads in this contract that can prove isolation; every other read
   * here is the operator's and bypasses row-level security entirely.
   *
   * THEY ARE INTEGRATION-ONLY BY CONSTRUCTION and the loop fixture throws `CapabilityPending` for
   * each. That is this design's own consequence, stated where a reader meets it: the rule they read
   * is in the database, and a fixture answer would be a second copy of it.
   */
  organizationAsViewer(session: Session, organizationId: string): Promise<ViewerRead<OrganizationRow>>;
  membershipsAsViewer(session: Session, organizationId: string): Promise<ViewerRead<MembershipRow>>;
  projectAsViewer(session: Session, projectId: string): Promise<ViewerRead<ProjectRow>>;
  acknowledgmentsAsViewer(session: Session, accountId: string): Promise<ViewerRead<AcknowledgmentRow>>;

  /** The logged-out surface. It takes NO session, because a visitor has none. */
  publicProjectPage(projectId: string): Promise<PublicProjectOutcome>;

  /** The live privilege and policy catalog, read as the operator — the integration half of the guard. */
  tenantTableFacts(): Promise<readonly TenantTableFacts[]>;
```

Corrections, per the lead's ruling that this deliverable falsifies two comments:

- `_contract.ts` line 579 says `org_memberships` reaches no Data API role. It now reaches
  `authenticated` through one grant and one policy. The sentence is rewritten to say what stays true:
  a green over `updateOrganization` is operation-surface isolation, and read isolation is proved by
  the four viewer members above.
- `_live.ts` line ~584 says `public.projects` reaches no Data API role at all. Same correction.

### `tests/at/suites/req-001/_fixture.ts`

Six new members, every one of them:

```ts
    organizationAsViewer: () => { throw new CapabilityPending(['sut.accounts.tenantReadAsViewer']); },
    membershipsAsViewer:  () => { throw new CapabilityPending(['sut.accounts.tenantReadAsViewer']); },
    projectAsViewer:      () => { throw new CapabilityPending(['sut.accounts.tenantReadAsViewer']); },
    acknowledgmentsAsViewer: () => { throw new CapabilityPending(['sut.accounts.tenantReadAsViewer']); },
    publicProjectPage:    () => { throw new CapabilityPending(['sut.accounts.tenantReadAsViewer']); },
    tenantTableFacts:     () => { throw new CapabilityPending(['sut.accounts.tenantReadAsViewer']); },
```

Plus one mirror change: `assignVolunteerAsOperator` gains the `not-a-volunteer-account` refusal, so
the loop fixture is not more permissive than the trigger the migration lands. That mirrors a trigger,
not the policy set, and it follows the existing mirror of the NGO-only membership trigger.

**Nothing else in `_fixture.ts` changes.** No Map holds a policy. No loop-tier decision answers "may
this caller read this row". That is the direction's signature, and its cost is the four loop reds.

### `tests/at/harness/live-stack.ts`

Two helpers, both siblings of `functionPost`, both returning the raw text so a byte comparison is
possible:

```ts
/** A Data API GET as a specific caller. `bearer` is that caller's access token, never a key. */
export async function restGet(
  stack: Stack, path: string, bearer: string,
): Promise<{ url: string; status: number; text: string }> { /* not implemented */ }

/** A function GET with no user token — the logged-out visitor's call. */
export async function functionGet(
  stack: Stack, name: string, query: Record<string, string>,
): Promise<{ url: string; status: number; text: string }> { /* not implemented */ }
```

They are not a new sentinel, fault, vendor stand-in or fixture world. They are two `fetch` calls
beside the two that are already there, in the file whose stated job is being the one client for the
running stack.

### `tests/at/suites/req-001/_live.ts`

```ts
/**
 * A LIVE ACCESS TOKEN FOR THIS HANDLE, refreshed when it is nearly spent.
 *
 * Access tokens live two minutes on this stack, and a tenant body registers several actors through
 * the mail catcher before it reads. A stale token answers 401, which must never be mistaken for the
 * empty list a policy produces. The refresh keeps the SAME `session_id` claim, so the map key does
 * not move and `sessionId` on the handle stays true.
 */
async function freshAccessToken(session: Session, act: string): Promise<string> {
  throw new Error('not implemented');
  // TODO: read `exp` from the cached token; when under ~20 seconds remain, run the refresh grant
  // through authPost and replace the map entry under the same key.
}

/** The one place a Data API answer becomes rows. Wire shape enters here and stops here. */
function viewerRead<Row>(answer: { status: number; text: string }, parse: (raw: unknown) => Row): ViewerRead<Row> {
  throw new Error('not implemented');
  // TODO: 200 -> { ok: true, rows: JSON.parse(text).map(parse), answer }
  // TODO: 401/403 with /permission denied/i -> privilege-denied   (message first, SQLSTATE second)
  // TODO: 401/403 naming the token or the JWT  -> session-refused
  // TODO: anything else -> refused, with the body as the reason
}

    organizationAsViewer: async (session, organizationId) =>
      viewerRead(
        await restGet(stack, `/rest/v1/organizations?id=eq.${organizationId}&select=id,name`,
                      await freshAccessToken(session, 'read an organisation as the caller')),
        parseOrganizationRow,
      ),
    // membershipsAsViewer, projectAsViewer, acknowledgmentsAsViewer: the same three lines each.

    publicProjectPage: async (projectId) => { /* not implemented — functionGet, then parse or refuse */ },

    tenantTableFacts: async () => { /* not implemented */ },
      // TODO: one operator query joining pg_class.relrowsecurity, has_table_privilege('anon'|
      // 'authenticated', …, 'select') and pg_policies.qual, for every table in schema `public`.
```

The token reaches these members through `tokensOf` and the same private map every other
session-taking member uses. No token leaves the adapter.

### `tests/at/suites/req-001/_policy-scan.ts` — new

A `_`-prefixed module in the suite, shared by both tiers, exactly as `_source-scan.ts` is. Not a
sentinel, fault, vendor stand-in or fixture world: it reads the tree, like the source scan, and the
acceptance rules place a shared arm here.

```ts
/**
 * THE TENANT CATALOG TRIPWIRE — the static half.
 *
 * It reads `supabase/migrations/*.sql` in filename order and answers one question: does every table
 * in `public` still carry the posture this deliverable declared? It is a TEXT oracle with the limits
 * of one — a grant inside a `do $$` block escapes it — and the live half at the integration tier is
 * the semantic oracle. It is worth having anyway, because the realistic regression is a later
 * requirement adding a table and forgetting the policy, and this turns that into a red in the same
 * run.
 *
 * THE CLASSIFICATION BELOW IS THE GUARD'S EXPECTATION AND NOTHING ELSE. No policy, no product code
 * and no test body reads it to decide anything; it exists so the scan has something to compare
 * against. A table missing from it is a failure, which is what forces a later requirement to choose.
 */
export type TableClass = 'tenant-isolated' | 'unreachable-by-client-roles';

export const TENANT_CATALOG: Readonly<Record<string, TableClass>> = {
  organizations: 'tenant-isolated',
  org_memberships: 'tenant-isolated',
  projects: 'tenant-isolated',
  acknowledgments: 'tenant-isolated',
  accounts: 'unreachable-by-client-roles',
  volunteer_profiles: 'unreachable-by-client-roles',
};

export type PolicyProblem = { table: string; problem: string };

/**
 * Every way the declared posture and the migration text disagree. An EMPTY array is the assertion.
 * It THROWS when it can read no migration or finds no `create table`, because an absence reported by
 * a broken instrument is indistinguishable from a true absence unless the instrument says so.
 *
 * What it checks:
 *   1. every `create table public.<t>` appears in TENANT_CATALOG, and every catalog key exists;
 *   2. no `grant … to anon`, anywhere, on any table;
 *   3. a tenant-isolated table shows `enable row level security`, a `grant select … to
 *      authenticated`, at least one `create policy … on public.<t>`, and no `using (true)`;
 *   4. an unreachable table holds no un-revoked grant to `anon` or `authenticated`;
 *   5. every function a policy's `using (…)` calls is named `public.viewer_…`, and every
 *      `create function public.viewer_…` carries `security definer`, `set search_path = ''`, a
 *      revoke from `public` and a grant of execute to `authenticated`.
 */
export function tenantCatalogProblems(): PolicyProblem[] { throw new Error('not implemented'); }
```

### `tests/at/harness/shipped-public-project.selftest.ts` — new

A test with no acceptance id, beside `shipped-caller.selftest.ts` and `shipped-verification.selftest.ts`,
run by `bun run at:selftest` in the continuous integration build. It drives the shipped handler with
injected reads and asserts:

- an absent project and a project the predicate refuses produce the identical answer, compared after
  one shared serialization;
- the answer for both is `PROJECT_NOT_PUBLIC`;
- a public project produces exactly three fields, and `organizationId` and `assignedVolunteerId` are
  absent by name rather than by counting;
- a missing organisation throws rather than wearing the caller-facing refusal.

### `tests/at/suites/req-001/_integration.ts`

Five new exported bodies, `at00121`, `at00122`, `at00123`, `at00140`, `at00124`. Each follows the
file's existing order: register through the mail catcher, sign in, complete signup, provision Givens
as the operator, read as the viewer, assert. Each carries `INTEGRATION_TIMEOUT_MS`. Each ends with
the two catalog arms — `tenantCatalogProblems()` and `sut.tenantTableFacts()` — so the declared
posture is checked against the text and against the running database in the same body.

### `tests/at/suites/req-001/d-tenant-isolation.test.ts`

```ts
/** The loop arm every tenant id shares: check the declared posture, then name what this tier lacks. */
const policySetOrCapability = (): never => {
  expect(tenantCatalogProblems(), 'the declared tenant posture and the migrations disagree').toEqual([]);
  throw new CapabilityPending(['sut.accounts.tenantReadAsViewer']);
};

atTest('AT-001.21', '…', { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  { default: policySetOrCapability, integration: at00121 });
// .22, .23 and .40 the same shape; .24 uses its own loop arm and declares the UI capability.
```

### `tests/at/suites/req-001/_pending.ts`

`D5_L1` and `D5_L2` both leave `LEAF`. No id in this deliverable uses `notLanded` afterwards: four
are green at integration and capability-pending at loop, and the fifth is capability-pending at both.
The header's count and the removal note move with them.

### `tests/at/expected/req-001.json`

```jsonc
// loop.red — the five move from "pending / sut-missing" to capability shapes
"AT-001.21": { "kind": "capability-pending", "capabilities": ["sut.accounts.tenantReadAsViewer"] },
"AT-001.22": { "kind": "capability-pending", "capabilities": ["sut.accounts.tenantReadAsViewer"] },
"AT-001.23": { "kind": "capability-pending", "capabilities": ["sut.accounts.tenantReadAsViewer"] },
"AT-001.40": { "kind": "capability-pending", "capabilities": ["sut.accounts.tenantReadAsViewer"] },
"AT-001.24": { "kind": "capability-pending", "capabilities": ["ui.authenticated-surface-rendering"] },

// integration.green gains AT-001.21, AT-001.22, AT-001.23 and AT-001.40
// integration.red keeps AT-001.24, as the capability shape above
```

The manifest moves in the same commit as the bodies, because a declared red that turns green fails
the run.

---

## 5. Unit split

### Unit 1 — cross-organisation denial, no existence oracle (AT-001.21, AT-001.22)

Green on its own, with no part of unit 2 present.

- Migration one: the privilege normalisation, `viewer_is_org_member`, the four organisation-member
  and own-account policies.
- `supabase/functions/_shared/public-project.ts` and `supabase/functions/public-project/index.ts`,
  plus the `verify_jwt = false` entry in `supabase/config.toml`.
- `tests/at/harness/live-stack.ts`: `restGet`, `functionGet`.
- `tests/at/harness/shipped-public-project.selftest.ts`.
- `tests/at/suites/req-001/_policy-scan.ts` with the classification of the six existing tables.
- `_contract.ts` additions and the two comment corrections; `_fixture.ts` capability throwers;
  `_live.ts` viewer members, `freshAccessToken`, `publicProjectPage`, `tenantTableFacts`.
- Bodies for AT-001.21 and AT-001.22 at both tiers; the manifest rows for those two.

**Why it stands alone.** AT-001.22's denial is an unassigned volunteer reading nothing, and unit 1
ships no policy that admits a volunteer, so the denial is proved by the absence of a branch. That is
the same reason unit 1 must not ship the assigned-volunteer policy: a slice does not ship a branch it
does not test, and shipping it here would make unit 1's denial prove less than it says.

### Unit 2 — assigned volunteer, administrator reach, logged-out visitor (AT-001.23, AT-001.40, AT-001.24)

- Migration two: the seat trigger and its validation, `viewer_is_platform_admin`, the
  assigned-developer policy, the four administrator policies.
- `AssignVolunteerOutcome` gains `not-a-volunteer-account`; both adapters classify it.
- Bodies for AT-001.23, AT-001.40 and AT-001.24; the manifest rows for those three;
  `_pending.ts` loses both leaf labels.

---

## 6. Not built here

Discovered work, for the pull request's list and for the requirements that own it.

- **The authenticated read proxy.** One edge function, `tenant-read`, that forwards the caller's
  `Authorization` header to PostgREST and returns the rows verbatim. Its contract is call site 3
  above. It belongs with the leaf that lands the auth screens, because until a screen calls it, it is
  a surface nothing uses. **It must never resolve the caller's identity for a tenant decision**; the
  suggested shape is a `sessionIsLive(request): Promise<boolean>` wrapper over `resolveCaller`, so
  the handler has no caller id to filter with.
- **Moving the write path off the service role.** `create-organization` and `update-organization`
  read `public.accounts` and `public.org_memberships` with the service role to decide a write. With
  this policy set in place, both reads could carry the caller's token instead, and the two refusal
  kinds would survive: no row means not a member, a `member` row means not an admin. Then
  `service_role` could lose its `select` on `org_memberships`. It is not done here because three
  green acceptance ids depend on those refusals, and a policy regression would then arrive dressed as
  a write-authorization regression.
- **The isolation matrix each later resource must join**: rightful NGO, assigned volunteer where
  applicable, platform admin, foreign NGO, unassigned volunteer, absent identifier. It is a
  documentation change with its own ritual, and it goes in the acceptance notes.
- **The account type as a token claim**, through a custom access token hook. It would make the
  administrator predicate free at listing scale, with staleness bounded by the two-minute token. It
  is auth configuration and belongs where the listing requirement will find it.
- **Project publication.** A visibility state and a lifecycle for `projects`, owned by REQ-010/011.
  When it lands, `projectIsPublic` is where the rule goes, and the refusal collapse is already
  structural.
- **The storage bucket and the external task reads.** The catalog guard covers tables. Storage object
  policies and Linear-side task reads are outside it, and the requirements that add them must add
  their own guard.
- **The front-end note.** `src/lib/api/example.functions.ts` tells Lovable to use `createServerFn`,
  which contradicts the chosen path. This pull request cannot touch `src/`, so the founder files the
  correction.
- **One stale artifact sentence.** `loop/items/AI4DEV-57/proof-local.ts` asserts the row-level
  security message on a client-key insert into `public.accounts`. Removing that grant makes the
  refusal a privilege denial instead. The script is not re-run and nothing in the suite pins it.

---

## Synthesis decision

*(left for the arena lead)*

---

## Tradeoffs accepted

- **We accept four red loop rows in exchange for one rule.** The continuous integration build runs
  the loop tier, so four of the five ids are not exercised there. The mitigation is real but partial:
  the static catalog scan runs inside each red body, the shipped public surface has its own selftest,
  and the integration tier proves the verdicts. The alternative — a TypeScript rule the loop tier can
  grade — is a second copy of the rule and is the thing this direction exists to avoid.
- **We accept that no code ships for four of the five read surfaces, in exchange for having nowhere
  for a second rule to live.** A reviewer looking for the tenant logic will find nine policies and two
  predicates, and no TypeScript. That is the point, and it will look like an omission to somebody who
  expects a service layer.
- **We accept a service-role read on the public page in exchange for `anon` holding nothing.** A
  logged-out visitor has no caller to read as. The read is over data the design declares public
  through one predicate, and the refusal collapse is structural, so the surface reveals only what the
  word "public" already promises.
- **We accept a text oracle for the durable guard in exchange for it running where the build runs.**
  A grant hidden inside a `do $$` block escapes the static scan. The live catalog check at the
  integration tier is the semantic oracle, and it is the one the build does not run.
- **We accept that the assigned-developer policy does not restate the seat's account type, in
  exchange for one enforcement point.** The trigger is the invariant. If the trigger is ever dropped
  without the policy being revisited, the branch widens. The open questions ask whether the human
  wants the belt as well as the braces.
- **We accept that "by UI" in AT-001.21 is proved at the interface the future screens traverse, not in
  a browser.** There is no browser driver and this pull request cannot create a screen. With one
  enforcement point, a proof at that point covers every caller that reaches it, which is the strongest
  statement available and is weaker than a rendered page.
- **We accept dropping the `select, insert` grant on `public.accounts` from `authenticated`**, which
  changes a client-key insert refusal from the policy layer to the privilege layer. Nothing in the
  suite pins the old message; one unmaintained proof script does.
- **We accept that the platform administrator's reach is proved over four tables rather than over
  "any NGO's or project's data".** Those four are the tenant rows this tree has. The bodies say so.

---

## Alternatives considered

- **Column grants to `anon` with a public-projection policy, and no edge function at all.** The
  purest database-first shape: `grant select (id, name) on public.projects to anon` plus a policy
  admitting publicly visible rows. It hides more complexity from callers than the function does — the
  world reads the same interface as everyone else — and it exposes one thing more: a column added
  later is one `grant` away from being world-readable, and no code builds the answer field by field.
  It lost to the lead's ruling that `anon` stays at zero and the public surface is a function. That
  ruling buys a projection that cannot carry a field by accident.
- **A shipped `tenantReadAllowed(viewer, scope)` decision plus policies, as the reference branch
  built.** It gives the loop tier something real to grade, so four ids go green at both tiers, and
  the edge surface and the data interface enforce independently. It lost because it is two rules for
  one question in two languages, with nothing able to notice them drifting — the reference branch's
  own migration comment already had to argue that a policy must not inherit an invariant the schema
  does not enforce, which is the drift beginning. The interface depth is worse too: the caller gains a
  second surface with a second refusal vocabulary, and the hidden complexity is duplicated rather than
  concentrated.
- **One edge function per screen — dashboard, workspace, public page — each reading with the caller's
  token.** The reference branch's shape, minus the TypeScript rule. It puts a projection between the
  caller and the rows, which is genuinely useful later. It lost on timing, not on merit: no screen
  exists, no acceptance id needs a projection, and three functions nothing calls would each need a
  reason to exist. The contract for the one generic proxy is written into "Not built here" so the
  screens leaf can take it without redesigning.
- **A single generic `tenant-read` proxy, shipped now.** Cheap, and it would let the loop tier grade
  handler orchestration with injected reads. It lost because what the loop tier would then grade is a
  transport shim, and a green over a shim, labelled with a criterion about denial, is the false green
  this repository exists to remove.
- **`force row level security` on the four tenant tables.** It would make the posture uniform for the
  table owner too. Refused by the constraints: it breaks operator provisioning of platform admins,
  unseated organisations and projects, which is how three landed ids reach their Givens.

---

## Open questions and risks

1. **Should the assigned-developer policy restate the seat's account type as defence in depth, or is
   the trigger the single enforcement point?** This design chose one enforcement point and named the
   trigger. Keeping both costs one conjunct and a second statement of one invariant. Which does the
   human prefer at a security boundary?
2. **Are four red loop rows acceptable for this deliverable?** The lead's rulings authorise a loop
   `CapabilityPending` where a body can grade nothing shipped, and this design takes that route for
   all four verdict ids rather than for some. The alternative is a narrower loop green over the static
   scan alone. Is a green that means "the migration declares the right shape" wanted under a
   criterion whose Then-clause is "access is denied"?
3. **Does the static scan belong inside the red bodies, or beside them?** Running it there makes the
   declared red conditional on the guard, which is exact but subtle. A harness selftest would be
   plainer and would still run in the build. Which reads better to the reviewer who meets it first?
4. **Should a volunteer read the owning organisation's row?** This design says no: the volunteer
   reads the project and reaches the organisation's name through the public projection. A workspace
   screen may want more. Is "scoped to that project only" meant this tightly?
5. **Does PostgREST accept a revoked-but-unexpired token?** The explorers left this open. If it does,
   a revoked session reads rows for up to two minutes. No criterion here asserts otherwise, and the
   token lifetime bounds it, but the human may want it recorded against the session requirement.
6. **Is the acknowledgment table the right stand-in for "drafts, ledger, files, thread, dashboard"?**
   It is a real per-account tenant row and it is the one NGO A holds that NGO B must not read. If the
   human reads the criterion as needing an organisation-scoped artefact instead, the honest answer is
   that none exists yet and the mapping should say so more loudly.

---

## Next implementation step

Write `20260905120000_tenant_read_privileges_and_org_member_policies.sql` and run
`bun run at:verify req-001 --tier integration` with a throwaway body that signs two NGO accounts in
and probes each other's organisation identifier, to measure the exact status and body PostgREST
answers for a filtered read before any acceptance body is written against it.
