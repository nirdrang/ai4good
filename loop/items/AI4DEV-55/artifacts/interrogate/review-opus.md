# Adversarial review — Opus lane

Scope: `loop/items/AI4DEV-55/artifacts/interrogate/diff-code.patch` against origin/main, plus the
surrounding code in `supabase/`, `tests/at/` and `loop/work/`. I read the design
(`artifacts/arena/design.md`) and the rulings (`artifacts/how/rulings.md`) first, so nothing below
challenges a tradeoff those two files chose on purpose.

Two of the findings are backed by a probe I ran against the shipped scanner. The probe is described
in finding 1 and can be reproduced from the code in this review.

## Findings

### 1. [critical] The static catalog scan accepts every regression it was built to stop

**Location**: `tests/at/suites/req-001/_policy-scan.ts`, `scanTenantMigrations`; the live half in
`tests/at/suites/req-001/_integration.ts`, `assertTenantCatalog`.

**Finding**: Ruling 4 built this module for one reason, stated in its own header: "CI runs the loop
tier only, so a live catalog check over `pg_class` would never run after merge. This module is the
half that does." The scan's model of a migration set is add-only. It records `create table`,
`enable row level security`, `create policy` and grants, and it applies later statements over
earlier ones for grants only. It parses no `drop policy`, no `disable row level security`, no
`drop table`, no `drop function`. Its table matcher is the literal string `create table public.<bare
name>`, so two ordinary spellings of a new table are invisible to it.

**Evidence**: I appended one synthetic later migration to the six real ones and ran the shipped
`scanTenantMigrations`. Every case below returned an empty problem list — the same value the four
loop bodies assert with `expect(tenantCatalogProblems()).toEqual([])`.

| Appended statement | Scan verdict |
|---|---|
| `alter table public.projects disable row level security;` | clean |
| `drop policy` on all three `projects` policies | clean |
| `grant insert, update, delete on public.projects to authenticated;` | clean |
| `create table if not exists public.secrets (id uuid, token text);` | clean |
| `create table public."secrets2" (id uuid);` | clean |
| `grant all on all tables in schema public to authenticated;` | clean |
| `alter table public.projects force row level security;` | clean |
| policy `using (viewer_is_org_member(org_id))` — no schema qualifier | clean |
| `create policy ... for all ... using (viewer_...) with check (true);` | clean |
| `create policy ... for select to anon using (...);` | clean |
| `drop function public.viewer_is_org_member(uuid);` | clean |
| `drop table public.acknowledgments;` | clean |
| `create policy ... using (1=1);` | clean |

The first three are the likeliest regressions this guard exists for, and the CI half misses all
three. The live half catches the first two, and CI never runs it.

The `if not exists` case is worse than it looks, because the live half misses it too.
`assertTenantCatalog` iterates `Object.entries(TENANT_CATALOG)` and looks each name up in the facts
it read from `pg_class`. It never walks the other direction. So a new `public` table is checked by
the static half only, and only when it is spelled the one way the regex matches. The migration
history in this tree already records that a new `public` table arrives with privileges granted to
`anon` and `authenticated` by Supabase's `ALTER DEFAULT PRIVILEGES`
(`20260809090000_...sql`, "NO GRANT STATEMENT IS NOT THE SAME THING AS NO PRIVILEGE"). A new table
added with `if not exists` therefore reaches `anon` with privileges, and both halves report it
clean.

The scan's own selftest (`tests/at/harness/policy-scan.selftest.ts`) tests only the positive
direction — it builds valid SQL and removes one statement at a time. It has one case named
"later statements overlay earlier ones", and that case is a later `revoke`. Nothing in the selftest
asks what happens when a later migration takes a policy or row-level security away, which is why the
hole is invisible from inside the test file.

**Suggestion**: The overlay model has to be symmetric to be worth the name. Track `drop policy`,
`alter table ... disable row level security`, `drop table` and `drop function`, and remove from the
sets. Match `create table` with an optional `if not exists` and with an optionally quoted name. Then
close the live half by walking `facts` and refusing any `public` table that `TENANT_CATALOG` does
not name, which makes the two halves agree on the same question rather than on a subset of it.

### 2. [critical] Three of the four privilege-posture bullets are stated and enforced by nobody

**Location**: `supabase/migrations/20260906120000_tenant_read_posture_and_org_member_policies.sql`
header; `_policy-scan.ts`; `assertTenantCatalog` in `_integration.ts`.

**Finding**: The migration header states the posture in four bullets and says the two catalog checks
"test this paragraph rather than a second copy of it". They test one bullet.

* "`anon` holds nothing on any table in `public`" — the static half looks for the literal text
  `to anon` in a grant; the live half reads `has_table_privilege('anon', ..., 'select')`. Neither
  covers `insert`, `update`, `delete`, `truncate`, `references` or `trigger` on `anon`. The tree has
  measured those exact privileges arriving by default on a new table.
* "`authenticated` holds `SELECT` and nothing else" — the static half asserts `select` is
  **present** for an isolated table and never asserts that nothing else is. The live half reads
  `select` only. `grant insert on public.projects to authenticated` passes both.
* "`service_role` ... holds no `INSERT`, `UPDATE` or `DELETE` anywhere" — neither half reads
  `service_role` at all.
* "No table carries `FORCE ROW LEVEL SECURITY`" — neither half reads `relforcerowsecurity`. This
  one matters more than it reads, because the three `viewer_` predicates and
  `read_public_project` are all SECURITY DEFINER functions that depend on the owner bypassing
  row-level security. If a later migration forces row-level security on `accounts`, every predicate
  silently answers false and every tenant read goes empty, with both guard halves green.

Worse, the rule that this tree learned the hard way is unguarded. A new SECURITY DEFINER function
with no `revoke execute ... from public` is executable by `anon` through `/rest/v1/rpc/`. I probed
it: appending

```sql
create function public.export_everything() returns setof public.accounts
language sql security definer set search_path='' as $$ select * from public.accounts $$;
```

to the real migration set returns an empty problem list. The scan tracks the four definer
properties for functions whose name begins with `viewer_` and for nothing else, so the one naming
convention it checks is also the only thing protecting the convention. Ruling 9 says "Every other
function stays `service_role` only" and "the catalog check enforces it". It does not.

**Suggestion**: For each declared table, assert the exact privilege set rather than the presence of
one privilege: isolated means `authenticated` holds `{select}` and `anon` holds `{}`; unreachable
means both hold `{}`. Add `service_role` with a write-privilege refusal, and add
`relforcerowsecurity` to the live read. Then apply the definer-function rule to every
`create function ... security definer`, not to the `viewer_` prefix: each one needs a
`revoke execute ... from public`, and its execute grants must name only roles the header allows.

### 3. [warning] `_live.ts` crosses 1000 lines, and the block that pushes it over is separable

**Location**: `tests/at/suites/req-001/_live.ts` — 839 lines on origin/main, 1078 after this change.

**Finding**: The change adds 239 lines to a file that was already the largest adapter in the suite
and pushes it over the thousand-line line. The added block is self-contained: eight `AccountsSut`
members (`organizationAsViewer` through `tenantTableFacts`) plus `freshAccessToken`, `expOf`,
`viewerRead` and `asStringRows`. Nothing else in the file calls any of them.

Inside that block, `organizationDashboard`, `projectWorkspace` and `publicProjectPage` each carry
the same ten lines: call `functionPostRaw`, build `answer`, return early on non-200, `JSON.parse` in
a `try`, refuse a non-object, refuse `body.ok !== true`, return. Three copies, differing only in the
cast on the parsed body and in what `publicProjectPage` builds afterwards.

**Evidence**: The code-quality lens treats a file crossing 1000 lines as a presumptive blocker
unless the resulting file stays clearly organised. This one does not: the eight new members sit
after the six `CapabilityPending` stubs, which the file's own comment introduces as the tail of the
adapter ("Written out because the integration manifest names each one").

**Suggestion**: Move the viewer block to `tests/at/suites/req-001/_live-tenant-reads.ts` and spread
it into the adapter, the way `_source-scan.ts` and `_policy-scan.ts` already sit beside this suite.
Collapse the three parse blocks into one `functionOutcome<T>(status, text, isOk)` helper in the same
module; the only real difference between the three is the predicate on the body.

### 4. [warning] The new refusal sentence collides with the old one, and only match order separates them

**Location**: `supabase/migrations/20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql`,
`project_seat_holds_a_volunteer`; `_live.ts` `assignVolunteerAsOperator`; `_fixture.ts`
`assignVolunteerAsOperator`.

**Finding**: The new trigger raises

> projects refuses assignment: a single developer seat holds a volunteer account only

and the existing trigger raises

> projects refuses a second volunteer on project %: its single developer seat is held by account %

Both sentences contain the substring "single developer seat". Both carry SQLSTATE 42501. The live
adapter separates them by testing `/holds a volunteer account only/i` **before**
`/single developer seat/i`, and the code comment says so in as many words: "The volunteer-seat
refusal is matched first: its sentence also names a developer seat, and the occupancy pattern below
would steal it."

**Evidence**: This is a classification that depends on the order of two regular expressions, in two
adapters, over a sentence written in SQL in a third file. The suite's own convention is
sentence-primary with SQLSTATE as agreement (gate-2 ruling R3), and here the SQLSTATE agrees with
both branches, so the sentence is carrying the whole distinction. Anyone who reorders the two `if`
blocks, or who rewords the occupancy message, turns `seat-occupied` into `not-a-volunteer-account`
or the reverse, and AT-001.32 and AT-001.23 both classify on `kind`.

**Suggestion**: Change the SQL sentence so the two do not overlap — for example "projects refuses
assignment: the developer seat holds a volunteer account only", or better, a sentence that names the
account type rather than the seat. Then the two patterns are disjoint and the order stops being
load-bearing in three files. The fixture's mirrored reason string has to move with it.

### 5. [warning] The two zero-argument policy predicates run once per row

**Location**: `20260907120000_...sql` — `organizations_select_platform_admin`,
`org_memberships_select_platform_admin`, `projects_select_platform_admin`,
`acknowledgments_select_platform_admin`, `projects_select_assigned_volunteer`.

**Finding**: `using (public.viewer_is_platform_admin())` takes no argument and does not vary by row,
but it is a SECURITY DEFINER SQL function, so PostgreSQL cannot inline it and will not fold it. It
is evaluated per candidate row of the scan, and each evaluation runs a lookup on `public.accounts`.
The same is true of `public.viewer_is_volunteer()` in the assigned-volunteer policy.

**Evidence**: The migration right beside these lines already applies the fix to the other
row-invariant expression: every `auth.uid()` in this change is written `(select auth.uid())`, which
is exactly the wrapping that turns a per-row call into a single InitPlan. The two viewer predicates
did not get it. On an unfiltered listing (`/organizations?select=id,name`, which AT-001.21's
integration body actually issues) this is one `accounts` lookup per organisation row in the table,
for every authenticated caller, forever. The design's own "Consider" item records that policy cost
at listing scale was already a known concern and deferred the JWT-claim answer; that deferral is
reasonable, doing nothing about the free half of it is not.

**Suggestion**: Wrap both zero-argument predicates:
`using ((select public.viewer_is_platform_admin()))` and
`assigned_volunteer_id = (select auth.uid()) and (select public.viewer_is_volunteer())`.
`viewer_is_org_member(id)` genuinely varies per row and must stay as it is.

### 6. [warning] `organizationDashboard` makes three round trips where one would do, and they are not one snapshot

**Location**: `supabase/functions/_shared/tenant-reads.ts`, `organizationDashboard`;
`supabase/functions/_shared/edge.ts`, `callerReads`.

**Finding**: The dashboard issues three separate PostgREST GETs — `organization`, then `seatsOf`,
then `projectsOf` — sequentially, each with its own `if (!x.ok) return TENANT_READ_FAILED`. The
second and third are independent of each other and are still awaited one after the other. The three
reads are three transactions, so a dashboard can report an organisation whose seat list and project
list come from different moments.

**Evidence**: PostgREST answers the whole thing in one request through resource embedding, and
row-level security applies to embedded tables exactly as it does to the top-level one, so the
"database already filtered" property is unchanged:

```
/rest/v1/organizations?id=eq.<id>&select=id,name,org_memberships(account_id,role),projects(id,name,assigned_volunteer_id)
```

That collapses `TenantReads` from four members to two, deletes two failure branches from the core,
makes the read atomic, and removes three-quarters of the boilerplate that the injected-read
literals carry. Those literals are the visible cost: `EMPTY`, `FAILED`, `PRESENT` in
`shipped-tenant-reads.selftest.ts`, and `EMPTY_READS`, `assignedReads`, `twoTenants` and `failed` in
`d-tenant-isolation.test.ts` all have to name four members, and in five of those seven cases three
of the four members exist only to return `{ ok: true, rows: [] }` so the object type-checks.

**Suggestion**: Replace `organization`/`seatsOf`/`projectsOf` with one
`dashboardSource(organizationId)` member returning the embedded row, and keep `project` for the
workspace. The seam the loop tier grades survives — it is still one injected function per surface.
If the embedded shape is judged too clever for the fixture to model, the smaller move still stands:
run `seatsOf` and `projectsOf` under one `Promise.all`.

### 7. [warning] A caller-bound read that returns rows of an unexpected shape is indistinguishable from a denial

**Location**: `tests/at/suites/req-001/_live.ts`, `asStringRows` and its four call sites.

**Finding**: `asStringRows` calls the per-row mapper and drops every row for which the mapper
returns `null`. A 200 answer carrying rows the mapper rejects becomes `{ ok: true, rows: [] }`. Every
tenant-denial assertion in the four integration bodies has the form
`expect(emptyViewerRows(await sut.xAsViewer(...))).toEqual([])`. So "the policy denied this row" and
"the harness could not read this row" produce the same green.

**Evidence**: Trace `membershipsAsViewer`. The mapper returns `null` when `row.role` is neither
`'admin'` nor `'member'`. Add a third value to `public.org_role` in a later migration, and
`expect(emptyViewerRows(await sut.membershipsAsViewer(sessionB, orgA))).toEqual([])` in `at00121`
passes while NGO B is in fact reading NGO A's seats. `projectAsViewer` has the same shape: any row
whose `name` is not a string is dropped silently.

The positive controls in the same bodies do reduce this: `at00121` asserts A's own seat row equals
an exact object, so a change that affected every row would break there first. They do not cover a
drift that affects one row and not another, and the denial assertions are the ones this requirement
rests on.

**Suggestion**: Make an unmappable row loud. Return
`{ ok: false, kind: 'refused', reason: 'a row did not match the expected shape' }` from
`viewerRead` when the mapper rejects any row of a 200 answer. `emptyViewerRows` already fails on
`ok: false`, so no body changes and the failure arrives with the right message.

### 8. [warning] Three request helpers are copied rather than composed

**Location**: `supabase/functions/_shared/edge.ts`, `restJson` and `publicProjectReads`;
`tests/at/harness/live-stack.ts`, `functionPostRaw` and `functionPost`.

**Finding**: `publicProjectReads.source` repeats `restJson`'s body — fetch, `await text()`, refuse
on `!ok`, `JSON.parse` in a `try`, refuse a non-array, return rows — eighteen lines, in the same
file, twelve lines below the original. `restJson` already takes `(url, init)`, so the whole body is

```ts
source: (projectId) => restJson<PublicProjectSource>(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  body: JSON.stringify({ p_project_id: projectId }),
}),
```

`functionPostRaw` is the same case one file over, and its own doc comment states it: "functionPost
without the parse". It differs from `functionPost` in two ways only — it accepts a null bearer and
it skips `jsonBody`.

**Evidence**: Two secondary problems ride along on the harness copy. `functionPostRaw` drops `url`
from its result, while `authPost`, `restGet` and `functionPost` all return it, so a failed tenant
read is the one call in this harness with no url to put in the evidence line. And `functionPostRaw`
has no `ip` parameter, so the two helpers will drift the next time one of them needs a header.

**Suggestion**: Make `functionPostRaw` the single implementation, returning `{ url, status, text }`
and taking the optional `ip`, and define
`functionPost = async (...) => { const { url, status, text } = await functionPostRaw(...); return { url, status, json: jsonBody(text) }; }`.
Every existing call site keeps working. Do the same one-line substitution for
`publicProjectReads.source`.

### 9. [warning] The publication rule lands in TypeScript, after the service-role read has already returned the row

**Location**: `supabase/functions/_shared/public-project.ts`, `projectIsPublic` and
`publicProjectAnswer`; `20260906120000_...sql`, `read_public_project`.

**Finding**: `publicProjectAnswer` calls `reads.source(projectId)`, which is a service-role POST to
`read_public_project`, and only then asks `projectIsPublic(row)`. The definer function has no
eligibility predicate in its `WHERE` clause; it returns any project joined to its organisation. The
one gate is a TypeScript function that returns `true` today and that the header names as "the one
place that requirement puts its rule".

**Evidence**: This is the single anonymous surface in the tree (`verify_jwt = false`), and it is the
only read path that runs with the service-role key. When REQ-010/011 lands and `projectIsPublic`
becomes a real predicate, an unpublished project's name and its organisation's name will cross out
of the database and into the edge function's memory on every request, and the only thing between
them and an anonymous caller will be a `return` in a file that no type-checker covers (the `edge.ts`
header says so explicitly: "NO TYPE-CHECKER COVERS THIS FILE"). The design's own governing sentence
is "The SQL policy set is the only tenant rule". This is the one rule placed outside it, on the one
surface where placing it outside costs the most.

**Suggestion**: Put the predicate in `read_public_project`'s `WHERE` clause, so a row that is not
public never leaves the database, and keep `projectIsPublic` as the shipped, loop-gradable statement
of the same rule for the projection. One rule, two enforcement points, is the pattern this change
already accepted for the volunteer seat (trigger plus policy conjunct) and defended in the
tradeoffs section. Ruling 7 asks for one shipped predicate and does not say which language it must
be written in.

### 10. [warning] The change falsifies four stated-posture comments that ruling 12 does not name

**Location**: `20260808120000_...sql` around the `accounts` grant;
`20260811130000_...sql` header and its closing `revoke`; `supabase/functions/_shared/edge.ts`,
`CORS_HEADERS` and the module header.

**Finding**: Ruling 12 names two comments this deliverable falsifies and both are corrected. At
least four more are now false, and this tree treats those paragraphs as the specification:

1. `20260808120000_...sql`: "The other three tables get no grant and are unreachable through the
   Data API entirely, which is stricter still." All three now hold `SELECT` for `authenticated`.
2. `20260811130000_...sql` header: "NO POLICIES. Row-level security is enabled and the table reaches
   no Data API role at all." `projects` now has three policies and a grant.
3. `20260811130000_...sql`, the comment on its closing revoke: "the catalog check for these three
   roles on this table must return ZERO rows." That is now false for `authenticated`, and it reads
   as an instruction to a future reader running that check.
4. `edge.ts`, the paragraph justifying `access-control-allow-origin: '*'`: "It is safe here for a
   reason specific to these two endpoints: BOTH AUTHENTICATE BY `Authorization` HEADER AND NEITHER
   READS A COOKIE." There are now six functions under that header, and `public-project` authenticates
   nothing at all.

**Evidence**: Item 4 carries actual weight. The wildcard origin is a security decision, its stated
justification is a property of the endpoints it governs, and the change adds an endpoint that does
not have the property. The conclusion is still defensible — a public page needs no ambient authority
to protect — but the written argument no longer reaches it, and this file's convention is that the
paragraph is the control. Items 1 to 3 are the two migrations a reader consults to learn the
privilege posture, and they now teach the opposite of what is deployed.

**Suggestion**: Correct item 4 in place; it is not a migration and nothing stops the edit. For the
two migration files, either correct the comments (the tree replays migrations from scratch, so a
comment edit is safe) or add one paragraph to the `20260906120000` header naming both superseded
claims by file, the way it already names the superseded `accounts` grant.

### 11. [warning] The grok wrapper escalates unconditionally, well past the Landlock case it names

**Location**: `loop/work/grok-shim/grok`.

**Finding**: The script's first line of documentation says it is a wrapper "on hosts whose kernel
lacks Landlock", and it does probe for Landlock. Three of its four behaviours ignore the probe:

* `--sandbox workspace` becomes `--sandbox devbox` **always**, on every host, whatever the probe
  said. The header states this ("workspace -> devbox always") without saying why the Landlock
  argument does not apply to it.
* `--permission-mode acceptEdits` becomes `--permission-mode bypassPermissions`, unconditionally.
  These are not near neighbours: one asks for file edits without prompting, the other turns the
  permission system off.
* `GROK_SANDBOX_AUTO_ALLOW_BASH=1` is exported unconditionally.

**Evidence**: The script is `chmod +x` and designed to sit in front of the real binary on `PATH`, so
every future grok lane on any host inherits all three, including read-only reviewer lanes. Two more
details make it stickier than it looks. The probe result is written once to
`$XDG_CACHE_HOME/grok-shim` and never re-checked, so a host that gains Landlock keeps the downgrade
forever. And the probe is `grep -qs landlock /sys/kernel/security/lsm`, which fails closed to
"unavailable" whenever `securityfs` is not mounted — the normal state inside many containers — so
the downgrade also applies on kernels that do support Landlock.

Separately: nothing in the tree references `loop/work/grok-shim/grok`. The receipts in
`loop/items/AI4DEV-55/artifacts/` all name `/root/.local/grok-shim/grok`, so the committed copy is a
record of a wrapper that ran from somewhere else. It arrives with no README beside it and no
mention in any process file.

**Suggestion**: Gate all three escalations on the same probe the read-only branch uses, so a host
with Landlock gets what the caller asked for. Re-probe when the cached answer says unavailable
rather than caching a negative permanently. And either wire the committed copy to something or put a
short README beside it saying what it is and that it is a record, not a live path.

### 12. [warning] The evidence for dropping the `accounts` grant is a grep of the wrong scope

**Location**: `20260906120000_...sql` header, last paragraph.

**Finding**: The header says: "Grep of `tests/` on 2026-09-05 found zero bodies pinning the
row-level-security message on a client-key insert into `accounts`." The design's "Consider" item
asked to "confirm no body pins the RLS-layer message on an account insert" before removing the
grant. A grep of `tests/` cannot settle that, because the check that does pin the message is not
under `tests/`.

**Evidence**: `loop/items/AI4DEV-57/proof-local.ts` asserts exactly that message, and explains why:

> — with "new row violates row-level security policy". Without that grant the refusal would read
> "permission denied for table accounts", which is a different mechanism

That script is still live evidence in this tree: `supabase/functions/_shared/edge.ts`'s header
retains its sibling `proof-local.txt` "for the ONE thing only it still covers: `create-organization`".
Re-running it after this migration gives the wrong message on that arm. The design's "Not built
here" does mention "the stale sentence in `loop/items/AI4DEV-57/proof-local.ts`", so this was seen —
but the migration header, which is the durable record, states a narrower search than it needs and
reads as if the question is closed.

**Suggestion**: One sentence in the header: name the file, say that its `authenticated` arm no longer
holds, and say who owns the correction. The removal itself is right; only the evidence line is
overstated.

### 13. [nit] `org_memberships_account_id_idx` serves no query in this change

**Location**: `20260906120000_...sql`, step 5.

**Finding**: The section is titled "indexes the lookups want". `viewer_is_org_member` runs
`where m.org_id = p_org_id and m.account_id = (select auth.uid())`, and `org_memberships`'s primary
key is `(org_id, account_id)`, so that predicate is already an exact primary-key lookup. The table
additionally carries a unique index on `org_id` alone, so it holds at most one row per organisation.
A single-column index on `account_id` serves neither the predicate nor any query this change adds.
`projects_assigned_volunteer_id_idx` beside it does earn its place — the assigned-volunteer policy
filters on that column in an unfiltered listing.

**Suggestion**: Drop the `org_memberships` index, or name in the comment which future query wants
it.

### 14. [nit] Naming and placement in the harness additions

**Location**: `tests/at/suites/req-001/_live.ts`; `tests/at/suites/req-001/_integration.ts`;
`tests/at/suites/req-001/d-tenant-isolation.test.ts`.

* `expOf` is inserted directly beneath the long doc comment that belongs to `databaseRefusal`
  ("WHAT A POSTGRES REFUSAL CARRIES — the SQLSTATE and the sentence..."), so that paragraph now
  appears to document a JWT `exp` decoder. It is also the fourth copy of
  `JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))` in the same file,
  beside `sessionIdOf`, `accountIdOf` and `lifetimeOf`. One `claimsOf(token)` deletes three of the
  four.
* `emptyViewerRows` returns rows and is used as often for a non-empty expectation as for an empty
  one. `viewerRows` says what it does.
* `asStringRows` maps objects, not strings.
* `d-tenant-isolation.test.ts` keeps four long loop bodies inline in the `atTest` calls, while every
  integration body in the same file is a named export from `_integration.ts`. The file went from 22
  lines to 405 on that asymmetry alone. A `_loop.ts` sibling would match the file's own pattern, and
  would also let the injected `TenantReads` literals be shared with
  `harness/shipped-tenant-reads.selftest.ts`, which currently asserts nearly the same set of facts
  over nearly the same fixtures.
* `organization-dashboard/index.ts` and `project-workspace/index.ts` read the `Authorization` header
  a second time with `request.headers.get('Authorization') ?? ''`. The `?? ''` branch is
  unreachable: `resolveCaller` returns `null` when the header is absent, and the line above it has
  already answered 401. The fallback papers over an invariant that is already established four lines
  earlier.

## What I checked and did not find a problem with

Stated so the absence is not read as an oversight. The trigger firing order the fixture comments
claim is correct: `projects_seat_holds_a_volunteer` sorts before `projects_single_developer_seat`,
so the type refusal really does pre-empt the occupancy refusal, and AT-001.32's two actors are both
volunteers, so that criterion does not change. `tenantCatalogProblems()` returns `[]` against the
real migration set. Nothing under `src/` reads a table or invokes a function, so revoking the
`accounts` grant breaks no UI path. The three `viewer_` predicates and both definer functions are
schema-qualified throughout under `search_path = ''`. The 404 constants serialise to the bytes the
bodies compare against, and the handler's refusal order (method, session, body, uuid) reveals
nothing about the target.
