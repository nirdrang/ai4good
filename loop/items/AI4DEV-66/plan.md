# Plan - AI4DEV-66 (cross-organisation denial, no existence oracle), batch with AI4DEV-67 (assigned volunteer, platform admin, logged-out visitor)

Written by the PLAN sitting, orchestrator on **opus @ max**. The founder ruled for this whole run
(relayed 2026-08-12) that every orchestrator sitting of this item runs as `orchestrator-opus`, not
only the merge and audit-re-run sittings that are opus by design. This is a founder choice for this
run. It is not a sign that fable has no credit.

Chain, derived from the branch and the manifest:
`AI4PM-19 (auth and org membership)` > `AI4DEV-50 (auth root)` >
`AI4DEV-55 (tenant isolation and visibility)` > `AI4DEV-66 (cross-org denial, no existence oracle)`.
`AI4DEV-67 (assigned volunteer, admin, stranger)` rides this branch and this pull request.

Branch: `nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`, cut from
`origin/main` at `948d4f0`. Database slot **1**, reserved under this item, covers both items.

**AMENDED BY THE DRAFT SITTING, 2026-08-12.** Gate 1 returned eleven findings. All eleven are
adopted, four with a different remedy than the reviewer proposed, in
`loop/items/AI4DEV-66/rulings-gate1.md`. **This amended plan is what gets built. There is no second
plan and no brief.** Each amendment below carries its ruling number, so a step and its reason stay
attached. Two additions of my own ride with them, marked A and B in the same file.

---

## What the board items ask

**AI4DEV-66 (D5.L1)** - one organisation cannot reach another's data, through the interface or by
probing identifiers directly against the API, and the denial must not reveal whether the thing
exists. An unassigned volunteer is denied the same way. Verify `AT-001.21`, `AT-001.22`.

**AI4DEV-67 (D5.L2)** - scoped access for a volunteer assigned to a project, platform-admin reach
across all accounts, and a logged-out visitor seeing public surfaces only. Verify `AT-001.23`,
`AT-001.24`, `AT-001.40`.

The acceptance texts are in `.taskmaster/docs/acceptance/at-req-001.md` lines 47-51. The manifest
leaves are in `loop/decomp/req-001.md` lines 37-38. D5.L1 is blocked by D3.L1, which merged; D5.L2
is blocked by D5.L1, which is why the two are batched.

---

## Facts established against the tree (evidence by pointer, never pasted)

1. **Row-level security is ON for every table, with ZERO policies, on purpose, and this item is
   the leaf that changes it.**
   `supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql` lines
   313-322 enable it on the four original tables and say the tenant-isolation policy set "is
   AT-001.21 through .24 and .40, and belongs to the tenant-isolation deliverable"; the
   single-seat migration line 110 does the same for `public.projects`. Measured:
   `grep -ri "create policy" supabase/migrations/` returns nothing.

2. **So the safe default denies EVERYBODY, which is not the requirement.** The requirement is
   that the right tenant reads and the wrong one does not, so this item must both GRANT and DENY.
   A plan whose green rested only on denial would be measuring the tree's current emptiness.

3. **And a grant must come first, or the policy never runs.** The first migration's comment
   (lines 324-337) records the measurement: `auto_expose_new_tables` is unset in
   `supabase/config.toml` line 24, so without an explicit grant a client read fails at the
   PRIVILEGE layer and row-level security is never consulted. `public.accounts` carries
   `grant select, insert ... to authenticated` for exactly this reason.

4. **SIX tables exist in the whole schema, and only four of them hold tenant data.** The six are
   `public.accounts`, `public.organizations`, `public.org_memberships`,
   `public.acknowledgments`, `public.volunteer_profiles` and `public.projects`. The four that
   hold data belonging to one tenant are `organizations`, `org_memberships`, `acknowledgments`
   and `projects`. No drafts, no ledger, no files, no thread and no tasks table exists anywhere.
   Those belong to REQ-005, REQ-006 and REQ-010 and none has landed. See decision E and the open
   question.

   **Nothing reaches `public.projects` through any product surface**, at either tier: the three
   edge functions are `complete-signup`, `create-organization` and `update-organization`, and the
   table carries `revoke all ... from anon, authenticated, service_role`. Only the live adapter,
   as the operator over direct SQL, and the loop fixture's own map touch it today. **This item
   changes that**, because AT-001.22 and AT-001.23 are about reading a project.

5. **The app has no surface at all.** `src/routes/` holds `__root.tsx`, `index.tsx` and a README.
   `index.tsx` renders one heading. There is no sign-in screen, no dashboard, no project page.
   The auth screens are a separate manifest leaf (D2.LW) that has not landed.

6. **`src/` IS FORBIDDEN TERRITORY FOR THIS PULL REQUEST.** `.github/workflows/ci.yml` lines
   242-292 fail any pull request that changes both `src/` (Lovable) and
   `supabase/ tests/ loop/ .claude/ .github/` (Claude). The previous item had to REVERSE a
   committed `src/routeTree.gen.ts` for exactly this reason. This is load-bearing for AT-001.24.

7. **An edge function already answers non-oracularly, and it was measured.**
   `supabase/functions/update-organization/index.ts` line 112 returns one 403 with kind
   `not-a-member` both for an organisation the caller is not in and for an organisation id that
   names nothing - measured in `loop/items/AI4DEV-62/artifacts/gate2-verify-answers.md` v1, on a
   well-formed random uuid. The shape this item needs is precedented, not invented.

8. **The existing suite asserts a privilege refusal that this item must not break.**
   `tests/at/suites/req-001/_integration.ts` AT-001.17 arm 2 asserts that
   `GET /rest/v1/org_memberships` with the ANON key answers `401` and a body matching
   `/permission denied/i`. Granting `select` to `authenticated` leaves `anon` unprivileged, so the
   assertion should stand - but that is a runtime claim and step 6's done-criterion measures it.

9. **Three edge functions exist and all three are authenticated.** `supabase/config.toml` lines
   470-481 declare `verify_jwt = true` for all of them, with a comment stating that all three
   operate for an already-authenticated caller. This item adds the FIRST public function block.

10. **Five ids are declared red, and the counts are measured rather than inherited.**
    `tests/at/suites/req-001/d-tenant-isolation.test.ts` registers all five through
    `notLanded(LEAF.D5_L1)` and `notLanded(LEAF.D5_L2)`.
    `tests/at/suites/req-001/_pending.ts` lines 45-67 hold both leaf labels. Counted directly in
    `tests/at/expected/req-001.json`: **loop 21 green / 16 red** (lines 5-45), **integration 16
    green / 21 red** (lines 48-88). All five of this item's ids sit in both `red` blocks as
    `{ "kind": "pending", "phase": "sut-missing" }`.

11. **The declaration shapes this item writes both already exist in that file.** A green id is a
    bare string in the tier's `green` array. A capability-pending id is
    `{ "kind": "capability-pending", "capabilities": ["<name>"] }` - five ids carry that shape at
    integration tier today (lines 67-71), including AT-001.10, whose situation is the one AT-001.24
    is in. Nothing new has to be invented for decision F.

12. **The verify commands, read from `package.json`:** `at:verify` is
    `bun tests/at/harness/runner.ts` and `at:check` is `bun tests/at/harness/check.ts`. The runs
    this item must make green are `bun run at:verify req-001 --tier loop --expect` and
    `bun run at:verify req-001 --tier integration --expect`, plus
    `bun run at:check req-001`, `bun run typecheck` and `bun run at:selftest`. `--tier` has no
    default. The database reset is performed BY the integration run, which prints its own slot
    evidence line naming the slot and the migration count - see the recorded line in
    `loop/items/AI4DEV-62/PHASE-STATE.md`. No step here resets a database by hand.

    **The slot is derived, not declared.** `tests/at/harness/db-pool.ts` resolves it from the
    branch to the item to the reservation, and refuses when the reservation names a different
    item. Slot 1 is reserved under this item, so the runs need no override. `AT_DB_SLOT` exists
    as an override and this plan does not use it; if a step ever needs it, PowerShell has no
    inline environment prefix, so it is `$env:AT_DB_SLOT='1'; bun run at:verify ...`.

13. **The mechanics a step must respect, measured in the harness:**
    - **A test registers once, with a per-tier body map.** The four-argument form is
      `atTest(id, title, opts, { default: <loop body>, integration: <integration body> })`;
      `chooseTierBody` in `tests/at/harness/registry.ts` picks `bodies[tier] ?? bodies.default`,
      and a map that leaves a tier uncovered with no `default` errors at the call site. `opts`
      carries `surface` and an optional per-tier `timeoutMs`.
    - **A live SUT member must be named in `backedSutMethods.accounts`**,
      `tests/at/suites/req-001/_live.ts` lines 105-138. A member absent from that list is
      supplied by `pendingMethodProxy` and throws `CapabilityPending` at first use - so a
      forgotten name is a red id, never a silent green.
    - **The two red declarations match differently.** `tests/at/harness/expected.ts`: a
      `pending` declaration matches by anchored PREFIX, so its tail is free; a
      `capability-pending` declaration matches the WHOLE string exactly, rebuilt as
      `CapabilityPending: CAPABILITY PENDING - <capabilities, comma-joined>`. AT-001.24's
      capability name must therefore be written identically in the body and in the manifest.
    - **The declaration must be in exact bijection with the acceptance file's 37 P0 ids**, and a
      malformed or non-bijective manifest exits 2 with nothing graded.
    - **vitest's own totals are cross-checked**: passed must equal the green count and the total
      must equal green plus red, so a skipped test is a deviation rather than a pass.
    - **`edgeHandler` turns anything thrown into a shaped 502.** Decision B's constant must be
      RETURNED, never thrown, or the two answers diverge through the error path.

---

## Decisions

### A. The tenant-read rule ships as ONE module, and the acceptance suite drives it

`supabase/functions/_shared/visibility.ts`, under the same two constraints `memberships.ts` states
of itself: zero non-relative imports, no Deno global, no I/O, no clock. It is compiled by
`tests/at/tsconfig.json` (strict, `skipLibCheck: false`, no DOM) and run by Deno in the edge
runtime.

It holds exactly three things:

- `tenantReadAllowed(viewer, scope)` - the one rule. An NGO account reads an organisation's
  non-public data only where it holds a membership row IN THAT organisation. A volunteer reads a
  project's non-public data only where it is THAT project's assigned volunteer. A platform admin
  reads both, for every account. A logged-out viewer reads neither.
- `publicProjectView(project, organization)` - what a project shows the world. One statement of
  what is public, so "public" is a value this repository can point at rather than a habit.
- `TENANT_NOT_FOUND` - see decision B.

It fails closed on every value it does not recognise, the posture `parseOrgRole` states and gives
its reasons for. The decision is the shared module's; the edge functions consult it; the loop-tier
adapter delegates to it, so a loop green is a claim about shipped code.

**Why the argument shape matters.** `tenantReadAllowed` takes the viewer's membership IN THE TARGET
organisation, never a list of the viewer's memberships. An implementation that authorised from the
caller's standing in some other organisation cannot express itself through the signature at all -
the same device `orgAdminActionAllowed` uses, and the same reason.

### B. "No existence oracle" becomes STRUCTURAL, not a rule somebody applies

The criterion's clause is that a denial must not reveal whether the thing exists. That is a
property of two answers being IDENTICAL, so the module exports the answer itself:

```
TENANT_NOT_FOUND = { status: 404, body: { ok: false, reason: '<one sentence>' } }
```

Every non-public read surface returns exactly this constant for BOTH "no such row" and "exists,
not yours". There is nowhere in the surface to put a second refusal, so the two cannot drift apart
by an edit that looks harmless.

**THE TARGET ROW IS READ LAST, AND THAT ORDERING IS THE SECOND STRUCTURAL CLAUSE (gate-1 ruling
4).** Every read a decision needs - the caller's account, its membership in the target organisation,
its assignment to the target project - is issued BEFORE the target row is read, and the target read
is the LAST read the handler makes. The decision is then computed from values already in hand. The
reason is that an outage answer must not depend on whether the target exists: with a lookup AFTER
the target read, a fault reachable only on the existing-row path answers 502 for a real foreign id
while a nonexistent id already answered 404, and those two answers are an existence oracle outside
the constant. With nothing after the target read, a fault answers the same 502 either way, by
construction rather than by care.

**How the two answers are compared, per tier (gate-1 ruling 5).** At integration tier the
comparison is on the RAW response text and the status, through the unparsed helper of step 9 - not
through `callFunction`, which returns `{ status, json }` after `JSON.parse` (`_live.ts:266-288`)
and would let two differently serialised bodies compare equal. At loop tier there are no bytes, so
the comparison is deep equality of the returned outcome value and its status. Both assert equality
of the two responses, never merely that both refused.

**404 rather than 403, and the alternative was considered.** `update-organization` uses one 403 for
both cases and is equally non-oracular; either works so long as it is the SAME. 404 is chosen
because it carries no information at all, while a 403 states that something is there to be
forbidden. The cost is that a 404 for a row that does exist is, strictly, not true - and that cost
is the point of the criterion.

**What is NOT claimed: timing.** Response time is a side channel this item does not measure and
does not defend. The merge ruling states it.

**The outage case is neither.** A read that FAILED - the database unreachable - answers 502 and
says so, the shape `update-organization` lines 101-106 already use, so an outage can never be read
by a test as the isolation property holding.

### C. Enforcement lands in the database, not only in the function

The policy set uses two stable `security definer` helpers keyed on `auth.uid()` -
`public.viewer_is_org_member(uuid)` and `public.viewer_is_platform_admin()` - so a policy on
`org_memberships` does not recurse into itself. Then `select` policies on `organizations`,
`org_memberships`, `acknowledgments` and `projects`, and `grant select ... to authenticated` on
each. **Nothing is granted to `anon`**: the public surface is an edge function, not a table.

**THE SET LANDS IN TWO MIGRATIONS, ONE PER SLICE (gate-1 ruling 7).** Several permissive `select`
policies on one table are OR'd, so the set splits by BRANCH without either half becoming vacuous.
Slice 1 ships `viewer_is_org_member` and the organisation-member policies, which AT-001.21's own
Data API control exercises. Slice 2 ships `viewer_is_platform_admin`, the assigned-volunteer policy
and the platform-admin policies, which AT-001.23 and AT-001.40 exercise in the same slice that
ships them. The rule this obeys: **a slice does not ship a policy branch it does not test.** In
slice 1 the volunteer and the platform admin are denied at the Data API because no policy admits
them yet, which is what slice 1's denials assert; slice 2 re-runs AT-001.21 and .22, so a new
branch that broke a denial fails there.

**THE HELPERS' POSTURE, DICTATED (gate-1 ruling 6).** Each helper is `language sql`, `stable`,
`security definer`, `set search_path = ''`, with every name inside it schema-qualified - the
posture all four existing migrations use. Then `revoke execute on function <full signature> from
public;` and **`grant execute on function <full signature> to authenticated, service_role;`**. The
grant to `authenticated` is mandatory and is the part that copying the existing service-role-only
posture would break: a policy expression is evaluated as the querying role, so the querying role
needs EXECUTE on any helper the policy calls. The comment states that, and states why the resulting
remote-procedure exposure leaks nothing - both helpers answer only about `auth.uid()`, so a caller
learns only its own standing, which it already knows.

**Why both layers.** The Data API is literally the criterion's "direct API/ID probing", and with a
policy a denied keyed read returns `[]` - the same answer as a row that does not exist, so the
no-oracle property is free there. The edge function is the path a UI must use (`CLAUDE.md`: the UI
never touches the database directly) and it needs decision B to get the same property. A green on
one arm alone would leave the other open.

### D. Three read surfaces, each traceable to a named clause

| function | `verify_jwt` | clause it serves |
|---|---|---|
| `organization-dashboard` | true | AT-001.21 "NGO A's non-public data ... dashboard" |
| `project-workspace` | true | AT-001.22 "that project's non-public data", AT-001.23 "that project's working data" |
| `public-project-page` | **false** | AT-001.22 "the public project page remains visible", AT-001.24 "public surfaces (listings, project pages)" |

`public-project-page` is the first `verify_jwt = false` block in this repository and the config
comment that says all functions are authenticated is corrected in the same change. It reveals that
a project exists, deliberately: that is the criterion's own "beyond public surfaces" carve-out, and
keeping it a separate function is what stops the public answer contaminating the no-oracle test.

None of the three is a general reader. Each returns one projection, the way
`update-organization` refuses to be a general profile editor.

### E. What this green covers, said before it is built

The criteria enumerate drafts, ledger, files, thread, tasks and dashboard. **Only the dashboard
kind exists** - an organisation, its projects, its membership and its acknowledgments. The others
are surfaces no requirement has landed. This item isolates every kind of tenant data that exists
and states the rest as absent, in the plan, in the per-id table and in the merge ruling.

**And it makes the absence self-correcting.** A conformance arm at integration tier reads the live
catalog. The declared lists are shipped code, so a table added by a later requirement fails the
build until somebody decides which it is. This is the device the manifest already ratifies for
D6.L2's write routes, applied to reads. Without it this leaf's green would be a statement about
today's four tables and nothing else.

**WHAT THE ARM CHECKS, DICTATED (gate-1 ruling 8).** "Carries a select policy" is not isolation - a
table with `USING (true)` would satisfy it while exposing every row. The arm checks three things:

1. Every table in `public` appears in **exactly one** of two shipped lists,
   `unreachableByClientRoles` or `tenantIsolated`. A table in neither, or in both, FAILS.
2. A table in `unreachableByClientRoles` is unreachable for a stated reason: **either**
   `information_schema.role_table_grants` shows no `select` grant to `anon` or `authenticated`,
   **or** row-level security is on and `pg_policies` shows zero `select` policies reaching those
   roles. Both arms are needed. `public.accounts` carries `grant select, insert ... to
   authenticated` and reaches no row only because it has no policy;
   `public.volunteer_profiles` carries `revoke all` and is unreachable by privilege. An arm that
   tested grants alone would call `accounts` reachable and fail on the first run.
3. A table in `tenantIsolated` carries at least one `select` policy for `authenticated`; no
   `select` policy on it has a `qual` of `true`; and every `select` policy's `qual` names
   `viewer_is_org_member`, `viewer_is_platform_admin`, or that table's declared tenant key column.

**What the arm does NOT prove, and the merge ruling says so:** that a declared predicate is
correct. It proves a table is declared, reachable only as declared, and not trivially open.

### F. AT-001.24's UI clause cannot be built here - the decision lands, the screens do not

The criterion is about a browser: public surfaces render, authenticated surfaces redirect to
sign-in. `src/` is Lovable territory and CI fails a pull request that touches both territories
(fact 6). There are also no screens to guard (fact 5).

So this item lands the three halves it can:

1. the logged-out denial on every non-public API surface - 401 from both authenticated functions,
   and a privilege refusal from the Data API, both measured;
2. the public surface answering an anonymous caller with the public projection and nothing else;
3. a shipped route registry naming each route under `src/routes/` as public or authenticated, with
   a conformance arm that fails when a route is not declared. It reads `src/routes/` and
   `src/routeTree.gen.ts` and writes neither - the same out-of-band shape `_source-scan.ts` uses
   for AT-001.17.

At integration tier AT-001.24 REFUSES with `CapabilityPending(['ui.logged-out-surface-rendering'])`
- the shape AT-001.05 and AT-001.10 already use. A green there would claim a rendering nobody
observed.

**The line between a green id and a capability-pending one (gate-1 ruling 1).** If the criterion's
OUTCOME can be observed without a screen, the id goes green and registers with `{ surface: 'ui' }`,
so a wiring leaf's `--wired` re-run selects it when screens land. If the outcome IS the screen, the
id refuses with a capability. AT-001.21's outcome is "access is denied and nothing leaks",
observable at the API; AT-001.24's outcome is the rendering itself. So AT-001.21 and AT-001.22 are
green AND `ui`-tagged, and AT-001.24 is not green at integration tier.

**THE BATCH PARTNER'S CLOSES-LINE IS CONDITIONAL (gate-1 ruling 3).** The merge ruling adds the one
sanctioned `Closes` line for the partner item **only if** the founder has answered open question 1
- by ratifying a D5 wiring leaf for the screens, the way D2 has one, or by ruling AT-001.24's
browser half out of that item. With no founder answer, the line is OMITTED, the partner item stays
open, and the merge ruling states why. This item does not edit `loop/decomp/req-001.md`; filing a
wiring leaf takes founder approval.

**This is the open question for the founder. See the last section.**

### G. Every denial body carries a positive control

A surface that refused everybody would satisfy AT-001.21, .22 and .24 completely while proving
nothing. Every body therefore performs the ALLOWED read first and asserts it succeeded, so each
refusal is attributable to the tenant boundary rather than to the surface being shut. This is the
discipline every landed body in this suite already applies.

### H. Givens come from the operator, and the plan says so

No product path creates a project or assigns a volunteer (`_contract.ts` says so of
`createProjectAsOperator` and `assignVolunteerAsOperator`). The two-organisation Given uses
`createOrganizationAsOperator` and `grantMembershipAsOperator`, which exist. The platform admin
uses `provisionPlatformAdmin`, which exists. **No new operator authority is invented** - every
Given this item needs is already on the surface. Only READ members are added.

---

## Steps, each with its own done-criterion

The test bodies come FIRST, before any implementation, because the criteria are ratified text that
predates the item and the plan's promise of green is worth nothing without them.

### Slice 1 - the denials (AI4DEV-66: AT-001.21, AT-001.22)

**1. Extend the system-under-test surface.** In `tests/at/suites/req-001/_contract.ts` add the row
and outcome types for the three read surfaces (`OrganizationDashboard`, `ProjectWorkspace`,
`PublicProjectPage`, `TenantReadOutcome`) and the SUT members that drive them, including the raw
Data-API probe members the direct-probing clause needs and the catalog conformance member. Import
the judgement types from `visibility.ts` rather than restating them, the rule this file already
states of `AccountType` and `OrgRole`.
*Done:* `bun run typecheck` exits 0, and every new member is named in `backedSutMethods.accounts`
(`_live.ts` lines 105-138) by the time step 9 closes - a member missing from that list is supplied
by `pendingMethodProxy` and refuses at first use, which turns a forgotten name into a red id.

**2. Write AT-001.21's two bodies.** The id keeps its ONE call site in
`tests/at/suites/req-001/d-tenant-isolation.test.ts`, moving from the one-argument `notLanded`
form to the four-argument form
`atTest('AT-001.21', '<title>', { surface: 'ui' }, { default: <loop body>, integration: at00121 })`,
with `at00121` exported from `_integration.ts` beside the other integration bodies. **The `ui`
surface is gate-1 ruling 1**: the criterion names a browser route this pull request cannot build,
and the tag is what makes a wiring leaf's `--wired` re-run select the id later
(`tests/at/harness/registry.ts:69`). It changes no current run - `--wired` exits 3 today
(`runner.ts:1245-1251`). Arms, in this order: the owning NGO reads its own dashboard
(control); the other NGO is refused; the other NGO probes a well-formed uuid that names nothing and
receives an IDENTICAL answer - raw response text and status at integration tier, deep equality of
the outcome value and its status at loop tier (gate-1 ruling 5); the same pair through the Data API
for `organizations`, `projects`, `org_memberships` and `acknowledgments`, each answering `[]`; the
owning NGO's Data API read returns exactly its own row (control); an unfiltered Data API listing by
the other NGO returns its own rows only and never the first NGO's.
*Done:* `bun run at:check req-001` exits 0, each id at one call site, and the body asserts equality
of the two refusal responses rather than that both refused.

**3. Write AT-001.22's two bodies.** Registered with `{ surface: 'ui' }` for the same reason - the
criterion's "the public project page remains visible" names a page. Arms: an unassigned volunteer is
refused the project workspace; the same volunteer probes a nonexistent project id and receives the
identical answer, compared per tier as in step 2; the Data API keyed probe answers `[]`; the public
project page answers that same volunteer AND an anonymous caller with the public projection; the
projection contains no field the workspace holds; the assigned volunteer's workspace read succeeds
(control).
*Done:* `bun run at:check req-001` exits 0 and the public-projection assertion names each absent
field explicitly rather than checking a length.

**4. Ship `supabase/functions/_shared/visibility.ts`.** Decisions A and B, and nothing else.
*Done:* `bun run typecheck` exits 0 with the module inside the strict acceptance program; the file
holds no import that is not relative and no reference to `Deno`.

**5. Ship SLICE 1's migration.** One file,
`supabase/migrations/<stamp>_tenant_isolation_policy_set.sql`: the `viewer_is_org_member(uuid)`
helper under decision C's dictated posture, the organisation-member select policies on the four
tenant tables, the grants to `authenticated`, and no grant to `anon`. The platform-admin helper and
the volunteer and admin policies are NOT in this file - they are slice 2's, under gate-1 ruling 7.
Its comment states what is deliberately absent, the way every migration in this tree does, **and it
names the statement it reverses**: `20260811130000_single_seat_org_and_single_developer_projects.sql`
line 123 carries `revoke all on table public.projects from anon, authenticated, service_role;`, and
a silent reversal of a deliberate revoke is not acceptable even though a later migration overriding
an earlier one is ordinary (my addition A).
*Done:* **no step runs `supabase db reset`, directly or through any wrapper (gate-1 ruling 10).**
The migration is proved by the integration run of step 9, which resets through the guarded path in
`tests/at/harness/db-pool.ts` and prints its own slot evidence line naming the slot and the
migration count; the executor carries that line into its report verbatim. The policy count -
`select count(*) from pg_policies where schemaname='public'` greater than zero - is read over the
operator connection the live adapter already opens.

**6. Verify the privilege posture did not move under the existing suite.** Measure, do not assume:
`GET /rest/v1/org_memberships` with the ANON key still answers `401` and `permission denied`
(fact 8), and the four newly granted tables answer the same to `anon`.
*Done:* the measurement is recorded in `loop/items/AI4DEV-66/artifacts/verify-first-answers.md`
with the exact status and body, and AT-001.17 stays green at integration tier.

**7. Ship the three edge functions and their `config.toml` blocks.** Decision D. Each resolves its
caller through `resolveCaller`, reads with the service role, consults `visibility.ts`, and returns
`TENANT_NOT_FOUND` or the projection. `public-project-page` declares `verify_jwt = false` and the
surrounding comment is corrected to say why.
*Done:* the three functions answer on the slot; `organization-dashboard` and `project-workspace`
answer 401 to an anonymous caller; `public-project-page` answers 200.

**8. Back the new members in the loop fixture.** `_fixture.ts` is STORAGE ONLY - it delegates
every judgement to `visibility.ts`, the binding rule its own header states. Any new storage joins
`interface State` **and is cleared in `teardown`**; a map that is not cleared leaks one test's rows
into the next and would show up as an isolation defect that is the fixture's, not the product's.

**The fixture also accepts a READ FAULT, and that is gate-1 ruling 4's proof.** One flag - "fail the
next read of the named store" - joins `interface State` and is cleared in `teardown` with the rest.
An arm then asserts that an existing-but-foreign target and a well-formed nonexistent target produce
the SAME outcome under each fault: same kind, same status, same body. It is storage, not judgement,
so the fixture's binding rule holds. There is no fault injection at integration tier and the merge
ruling says so.
*Done:* `bun run at:verify req-001 --tier loop --expect` runs AT-001.21 and .22 and both are green,
and the fault arm fails if the target read is moved before any other read.

**9. Back the new members in the live adapter.** `_live.ts`, against the slot. Three helpers, and
the distinction between them is gate-1 rulings 5 and 9:

- **The edge functions go through a NEW sibling of `callFunction` that returns the body UNPARSED** -
  `{ status, text, contentType }`. `callFunction` itself is not changed: it returns
  `{ status, json }` after `JSON.parse` (lines 266-288), so two differently serialised bodies would
  compare equal, and landed bodies across the suite use it. Only the tenant-read members use the
  new one.
- **The Data API probes need a helper this file does not have.** Every existing REST helper uses
  either the anon key (`authPost`) or the operator; the direct-probing clause needs a
  `GET /rest/v1/...` carrying `apikey: slot.anonKey` **and** `Authorization: Bearer <the caller's
  own access token>`. Both headers: every existing call in this tree sends `apikey` (lines 249 and
  271; `_integration.ts` lines 954 and 977), and without it the gateway can refuse before PostgREST
  and row-level security ever run, which would make the probe a gateway test.
- The catalog conformance read goes through the existing operator connection (`Bun.SQL` over
  `slot.dbUrl`).

*Done:* `bun run at:verify req-001 --tier integration --expect` runs AT-001.21 and .22 and both are
green on slot 1; every new member is named in `backedSutMethods.accounts`; the run's own slot
evidence line is carried into the report verbatim (step 5); and **the owning NGO's keyed Data API
read returning exactly its own row is what settles that row-level security ran** - without that
control passing, an empty array from a denied read could be a gateway refusal in disguise.

**10. Move the declarations.** Remove `D5_L1` from `_pending.ts`'s `LEAF` map, correct that file's
written/pending counts and its enumeration, and move AT-001.21 and .22 out of the `red` block into
the `green` array in `tests/at/expected/req-001.json`, at both tiers.
*Done:* both tiers exact-match and exit 0; the declaration stays in exact bijection with the
acceptance file's 37 P0 ids; and the counts in `_pending.ts`'s header still sum to 37.

### Slice 2 - the grants (AI4DEV-67: AT-001.23, AT-001.40, AT-001.24)

**READ THE SECTION "Slice 2 - the DRAFT SITTING's dictations" BEFORE STEP 11.** It sits immediately
after step 18. It settles eight questions steps 11 to 18 leave to the writer, and each dictation
names the step it binds. A step read without its dictation is a step read incomplete.

**11. Ship SLICE 2's migration.** One file,
`supabase/migrations/<stamp>_tenant_visibility_volunteer_and_admin.sql`: the
`viewer_is_platform_admin()` helper under decision C's dictated posture, the assigned-volunteer
`select` policy on `public.projects`, and the platform-admin `select` policies on the four tenant
tables. This is gate-1 ruling 7 - these branches ship in the slice whose tests exercise them, and
they are OR'd with slice 1's organisation-member policies rather than replacing them.
*Done:* `bun run at:verify req-001 --tier integration --expect` (step 17) reports the higher
migration count on its own slot evidence line; **AT-001.21 and AT-001.22 are still green in that
same run**, which is what proves the added branches broke no denial; and no step runs
`supabase db reset`.

**12. Write AT-001.23's two bodies.** Arms: the assigned volunteer reads its project's workspace;
the same volunteer is refused a DIFFERENT project's workspace, with the not-found answer; the same
volunteer is refused the owning organisation's dashboard, because its scope is the project and not
the organisation; the volunteer's unfiltered Data API listing of `projects` returns exactly its own
project.
*Done:* `bun run at:check req-001` exits 0 and the third arm exists, because it is the one that
proves "scoped to that project only".

**13. Write AT-001.40's two bodies.** Arms: the platform admin reads two DIFFERENT organisations'
dashboards and two different projects' workspaces; its unfiltered Data API listing returns both
organisations; a non-admin repeats one of those reads and is refused, so the reach is attributable
to the account type.
*Done:* `bun run at:check req-001` exits 0 and the body uses two tenants, never one.

**14. Write AT-001.24's bodies.** Registered with `{ surface: 'ui' }`, because it is a
user-interface criterion and the manifest's wiring leaf re-runs the ui-tagged ids. Loop body: an
anonymous caller is refused both authenticated functions with 401, is refused the Data API at the
privilege layer, and receives the public projection from the public function; and every route in
`src/routes/` is declared in the shipped registry. Integration body:
`refusesWith('ui.logged-out-surface-rendering')`.
*Done:* `bun run at:check req-001` exits 0; the integration body refuses rather than asserting the
half of the criterion it can reach; and the capability string in the body is written IDENTICALLY in
the manifest, because a `capability-pending` declaration is matched as a whole string, not by
prefix.

**15. Ship the route registry and its conformance arm.** The registry is shipped code naming each
route as public or authenticated with its redirect target; the arm lives beside `_source-scan.ts`
and reads `src/routes/` and `src/routeTree.gen.ts`. It THROWS when it cannot read the directory,
never reports an empty result - the rule `_source-scan.ts` states and this repository's
re-measure-a-negative invariant demands.
*Done:* the arm fails when handed a synthetic file list holding an undeclared route, and passes on
the real tree. The failure case is exercised, not asserted.

**16. Ship the catalog conformance arm.** Decision E's three checks, as dictated there under gate-1
ruling 8: exactly-one-list membership, an unreachable table unreachable for a stated reason by
either arm, and an isolated table whose every `select` policy is non-trivial and names a known
predicate or its tenant key column.
*Done:* the arm fails when the declared list is missing a table that exists, proved by running it
against a list with one entry removed; it fails a synthetic catalog row whose `select` policy `qual`
is `true`; and it passes on the real list, with `public.accounts` classified as unreachable through
the zero-policy arm rather than the grant arm.

**17. Back the remaining members in both adapters, and move the declarations.** `D5_L2` leaves the
`LEAF` map; `_pending.ts` counts and enumeration are corrected; AT-001.23, .40 and .24 move in
`tests/at/expected/req-001.json` - into `green` at loop for all three, into `green` at integration
for .23 and .40, and to
`{ "kind": "capability-pending", "capabilities": ["ui.logged-out-surface-rendering"] }` at
integration for .24.
*Done:* both tiers exact-match and exit 0 on slot 1; vitest's own totals agree with the declaration
(passed equals green, total equals green plus red); and the manifest holds no id this item did not
move.

**18. Correct the statements this item makes false.** The comments that say this tree has no read
surface and zero policies - `_contract.ts`'s note on `updateOrganization` and `_integration.ts`'s
note on AT-001.16 - now describe a tree that has both.

**AND ONE MORE, NAMED BY FILE AND LINE (gate-1 ruling 11).** `_live.ts` lines 709-712 state that
`public.projects` reaches no Data API role at all, and cite the measurement behind it. Step 5 grants
`select` on that table to `authenticated`, so the sentence stops being true and neither original
search phrase finds it. The corrected comment KEEPS the original measurement as history and says the
date it stopped being true.
*Done:* a search for "zero policies", "no read surface", "reaches no Data API role" and "zero
catalog rows" returns nothing that is still false.

---

## Slice 2 - the DRAFT SITTING's dictations, 2026-08-13

Written by the DRAFT sitting for slice 2, orchestrator on **opus @ max**, 2026-08-13, under the
founder's model ruling for this run. Steps 11 to 18 were written before slice 1 existed. Slice 1 now
exists and it answers some of what those steps assumed, and it raises questions they do not cover.
Each dictation below names the step it binds. **These are decisions, not suggestions.** They are
recorded here rather than in an executor brief because the amended plan is what gets built - there
is no second plan and no brief.

### S2-A. The route registry SHIPS in the shared module directory; its arm reads file names only

**Binds step 15.**

The registry is `supabase/functions/_shared/route-visibility.ts`, under the same two constraints
`visibility.ts` states of itself: zero non-relative imports, no `Deno` global, no I/O, no clock. It
holds two things and nothing else:

1. `ROUTE_VISIBILITY` - the declaration. Each route names itself `public` or `authenticated`, and an
   `authenticated` route names its redirect target.
2. `undeclaredRoutes(routeFileNames: readonly string[])` - PURE, over a list of names, returning the
   names that carry no declaration. A registry that cannot say what is missing is a list, not a
   registry, so the rule lives with the declaration.

**Why it ships rather than living in `tests/`.** A route's classification is product behaviour - it
is the thing a router must obey - and a test file cannot be the authority on product behaviour.
`supabase/functions/_shared/` is the one place in this repository that holds shipped,
territory-neutral TypeScript, and a later `src/`-only pull request can import from it without
crossing the continuous-integration territory guard (fact 6). That is what makes the declaration
usable by the router on the day the screens land.

**The residual, and the merge ruling states it.** Nothing imports the registry today, and nothing
enforces that a future router obeys it - there is no router. What it buys is a declaration in
product code and a test that fails when a route arrives undeclared. It is not a redirect that runs.

**A ROUTE FILE IS ANY `.tsx` FILE UNDER `src/routes/` WHOSE BASE NAME DOES NOT BEGIN WITH `__`.**
The leading double underscore is this router's convention for a layout rather than a route, and
`src/routes/__root.tsx` is the one such file today. `README.md` is not a route because it is not
`.tsx`.

**`src/routeTree.gen.ts` IS DROPPED FROM THIS ARM, and that is a narrowing of step 15 with its
reason.** That file is GENERATED from the very file names the arm reads, so reading both is reading
one fact twice. The risk a second witness would cover - a route present in the generated tree and
absent from `src/routes/` - cannot occur, because the generator derives the tree from the files.
`_source-scan.ts` reads both because it hunts for a NAME anywhere, including a hand-edited path;
this arm asks a different question. No coverage is lost.

**The arm and its failure case:**

- `tests/at/suites/req-001/_route-scan.ts` reads the real `src/routes/` and calls
  `undeclaredRoutes`. It THROWS when it cannot read the directory and when the directory is empty -
  `_source-scan.ts`'s exact posture, and this repository's re-measure-a-negative invariant. It never
  reports an absence it could not measure.
- `tests/at/harness/shipped-route-visibility.selftest.ts` drives the PURE function with synthetic
  lists: a list holding an undeclared route (which must be reported), the real declared set (which
  must be clean), a layout file (which must be ignored), and a non-`.tsx` file (which must be
  ignored). **This is what makes step 15's "the failure case is exercised, not asserted" true**, and
  it is possible only because the pure half lives in the shipped module rather than in the suite.

### S2-B. The catalog declaration lives TEST-SIDE, beside `_source-scan.ts`

**Binds step 16, and narrows decision E's word "shipped" with a stated reason.**

Decision E says "The declared lists are shipped code". For the ROUTE registry that word is right
(S2-A). For the CATALOG lists it is not, and pretending otherwise would put non-product code in a
product directory to satisfy a word. No edge function needs to know which tables are tenant-isolated
and none ever will.

**And the two homes are equal in force, which is why honesty decides it.** A new table in a
migration has no compile-time link to any list, in either home. The signal that a table is
undeclared is the conformance arm failing at integration tier, and that works identically wherever
the lists sit. So the lists and the conformance rule live in
`tests/at/suites/req-001/_catalog-conformance.ts`, beside `_source-scan.ts`, which is the file step
15 already names as the model for an out-of-band oracle.

**The shape, so the failure cases are exercisable:** the module exports the two declared lists and a
PURE `catalogConformanceProblems(catalog: readonly CatalogTable[])` implementing decision E's three
checks exactly as gate-1 ruling 8 dictates them. `tests/at/harness/shipped-catalog-conformance.selftest.ts`
drives that pure function with synthetic catalogs: a table in neither list, a table in both, a table
in `unreachableByClientRoles` that holds a `select` grant AND a policy reaching a client role, a
table in `tenantIsolated` whose `select` policy `qual` is `true`, a table in `tenantIsolated` whose
`qual` names no known predicate and no tenant key column, and the real declared set shaped as the
migrations leave it. **The two arms of check 2 each get their own case**, because gate-1 addition B
records that an arm testing grants alone would have classified `public.accounts` as reachable.

**WHAT CANNOT BE PROVED AT THIS HEAD, and the executor must not claim it.** Step 16's third
done-criterion - "it passes on the real list" - needs the LIVE catalog. `publicSchemaCatalog` throws
at loop tier by design, and the integration tier is blocked (section 1 of `PHASE-STATE.md`). So the
first two done-criteria are met by the selftest and the third is BLOCKED. Say that; do not claim it.

**THE CONSUMER IS `at00121`, AT-001.21's INTEGRATION BODY.** The claim the arm defends is
AT-001.21's own: its per-id row says the green claims isolation "over every kind of tenant data that
exists", and the arm is what proves the set of kinds that exist is the declared set. AT-001.40's
claim is about a viewer's reach, not about the completeness of the table set, so it is the weaker
fit. Slice 2 therefore amends a slice-1 body, deliberately and once; slice 2's integration run
re-runs AT-001.21 anyway (step 11).

### S2-C. The loop fixture's Data API mirror MUST gain slice 2's policy branches

**Binds step 17, and it is required work that step 17's wording does not obviously reach.**

`_fixture.ts`'s `dataApiRead` filters on membership alone, because that is what slice 1's migration
grants. Slice 2's migration adds two more branches, and without the mirror gaining them **AT-001.23's
fourth arm and AT-001.40's second arm cannot pass at loop tier**: a volunteer is seated in no
organisation and an administrator is seated in no organisation, so both would read an empty list.

**THE MIRROR MIRRORS THE SQL, STATEMENT BY STATEMENT. It does NOT delegate to `tenantReadAllowed`,
and gate-2 ruling 2 is why.** The two rules genuinely differ - `viewer_is_org_member` admits any
account holding a membership row, while `tenantReadAllowed`'s organisation branch also requires an
NGO account type - so a delegate would be a wrong mirror wearing the word "shipped". Each new
predicate is mirrored on its own:

- the platform-admin branch reads the CALLER'S ACCOUNT TYPE out of the fixture's own account store,
  the way `public.viewer_is_platform_admin()` reads `public.accounts`, and admits every row of all
  four tables;
- the assigned-volunteer branch on `projects` admits a row whose assigned developer is the caller,
  the way the new policy's `qual` does;
- the branches are OR'd with slice 1's membership branch, never replacing it, because several
  permissive `select` policies on one table are OR'd.

The comment above the member is updated to name all three branches and to keep its existing sentence
that the integration tier is the only thing that grades the prediction and has not run.

### S2-D. `dataApiRead` widens to `Session | null`, and AT-001.24 asserts both logged-out shapes

**Binds steps 14 and 17.**

AT-001.24's subject is a visitor who never signed in. `publicProjectPage` already takes
`Session | null` and its own comment gives the reason in these words: a member that could only be
called with a session could not express the clause at all. The same reason applies here, so
`dataApiRead(session: Session | null, probe: DataApiProbe)`.

- **Fixture:** a `null` session answers `{ status: 401, rows: null }` - the same answer a dead
  session gets, and for the same reason, which the comment states: the migrations grant `anon`
  nothing, so the refusal is the PRIVILEGE layer and not a policy.
- **Live adapter:** a `null` session sends `apikey: slot.anonKey` and NO `Authorization` header, so
  PostgREST resolves the request to `anon`. Fact 8 records the measurement this mirrors -
  AT-001.17's second arm already asserts that the publishable key alone answers 401
  `permission denied` on `org_memberships`.
- Every existing call site passes a `Session`, which is assignable, so nothing else changes.

**AT-001.24 asserts BOTH logged-out shapes and asserts they agree**: the caller that never signed in
(`null`) and the caller that signed out (a session `signOut` has ended). A revoked token must not be
treated as a live one, and the criterion's visitor is the first shape.

**THE TWO AUTHENTICATED FUNCTIONS ARE NOT WIDENED**, and the reason is written in the body: both
declare `verify_jwt = true`, so the gateway answers 401 for a missing token and for a revoked one
alike, and the fixture already answers 401 through `tenantUnauthenticated()` on a caller that does
not resolve. AT-001.24 drives them with a signed-out session. **The residual is named in the body:**
a request carrying no `Authorization` header at all is not expressible through those two members,
and at this tier nothing distinguishes the two refusals.

### S2-E. Gate-2 ruling 4 binds every new body slice 2 writes

**Binds steps 12, 13 and 14.**

Slice 1 closed six vacuous-pass seams of the form
`expect(x).toMatchObject({ ok: true }); if (!x.ok || x.organizationId === null) return;`, where a
completion answering `ok: true` with no organisation ends the body as a silent PASS with every arm
skipped. **Slice 2's bodies must not re-introduce it.** At every narrowing `return` a new body adds,
the shape is gate-2 ruling 4's:

```ts
expect(a, '<what its failure means for THIS body>').toMatchObject({ ok: true });
expect(
  a.ok ? a.organizationId : null,
  '<what its absence means for THIS body - name the arms that would be skipped>',
).not.toBeNull();
if (!a.ok || a.organizationId === null) return;
```

Each site's message names its own body's stake. Do not copy one message across sites. The rule
generalises beyond `organizationId`: **any narrowing `return` a new body adds must be preceded by an
assertion that the run never reaches it.**

### S2-F. AT-001.40's reach is attributable through the NON-ADMIN control, not through a basis field

**Binds step 13.**

`TenantReadBasis` exists so the grant's reason is carried out of the decision, and
`shipped-visibility.selftest.ts` is the consumer that reads it. **The acceptance surface does not
carry it**: `TenantReadOutcome` is `{ ok: true; status; value }` or `{ ok: false; status; body }`,
and its own header gives the reason - the claim under test is that two whole answers are identical,
and an outcome carrying more fields would invite a weaker assertion.

**So the executor does NOT add a basis field to `TenantReadOutcome` or to any projection.** Widening
a product surface for a test's convenience is the defect, not the fix. AT-001.40's reach is made
attributable exactly as step 13 already says: TWO different tenants read by one administrator, and a
NON-ADMIN repeating one of those reads and being refused. Without the third arm the body would prove
only that somebody read something.

### S2-G. Step 18's list, re-measured against the tree at head `64e4ef7`

**Binds step 18.** Step 18 was written before slice 1 ran. Three of its targets have moved.

**ALREADY DONE - DO NOT TOUCH.** Gate-1 ruling 11's target, the `public.projects` reachability
comment in `_live.ts`, was corrected during slice 1. It now sits near line 876 under the heading
"WHAT THE ORIGINAL MEASUREMENT SAID, AND THE DATE IT STOPPED BEING TRUE", keeps the original
measurement as history, and names 2026-08-12 and the migration. Nothing is owed there.

**STILL OUTSTANDING - these are step 18's real work:**

1. `tests/at/suites/req-001/_contract.ts` lines 718-719, on `updateOrganization`: "This tree has no
   read surface to leak through: row-level security is on with zero policies and `org_memberships`
   reaches no Data API role." Every clause is now false.
2. `tests/at/suites/req-001/_integration.ts` lines 710-711, the same sentence in AT-001.16's note.
3. **NEW, and neither the plan nor gate 1 named it:** `tests/at/suites/req-001/_source-scan.ts`
   line 6 says AT-001.17's other arms test that "the membership table reaches no client role".
   `authenticated` IS a client role and now holds `select` on `public.org_memberships`. What that
   arm actually asserts is narrower - the publishable key answers 401 - and the sentence must say
   the narrower thing.
4. **NEW, and it is MINE:** `supabase/functions/_shared/visibility.ts` lines 147-149 say "THE
   PLATFORM-ADMIN BRANCH CARRIES NO TEST IN THIS SLICE ... AT-001.40 exercises it in the slice that
   ships its policy." Slice 2 IS that slice, so the sentence stops being true the moment AT-001.40
   lands. It is corrected to say what now drives that branch and at which tier.
5. **NEW, and it is MINE:** `supabase/functions/_shared/visibility.ts` lines 100-107 say the basis
   is what makes AT-001.40's reach distinguishable from an ordinary read. That is true of
   `shipped-visibility.selftest.ts`, which reads the basis, and MISLEADING about AT-001.40, which
   cannot see it (S2-F). The paragraph names its real consumer and states that the acceptance
   surface deliberately does not carry the basis.

**DELIBERATELY NOT TOUCHED, so a later reader sees these were ruled rather than missed:**

- `supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql` line 23
  says of `public.projects` that "the table reaches no Data API role at all". **A migration records
  what IT did when it ran, and slice 1's migration already names the reversal in its own comment** -
  which is the posture gate-1 addition A established for exactly this case. Editing an applied
  migration's prose to describe a later migration's effect would destroy that record.
- `supabase/migrations/20260812120000_tenant_isolation_policy_set.sql` lines 12-19, 121 and 169-170
  refer to "the next slice". They were written as forward references, the referent now exists, and a
  forward reference that came true is not a false statement. Leave them.

**The search that closes step 18 gains two phrases:** "reaches no client role" and "no client role",
alongside the four it already names.

### S2-H. What this DRAFT sitting's executor runs, and what it must never claim

**Binds every step.**

**RUN, ONCE, AT THE END, and report the result whatever it is:** `bun run typecheck`,
`bun run at:check req-001`, `bun run at:selftest`, `bun run at:verify req-001 --tier loop --expect`.

`at:check` is not optional - a non-bijective declaration exits 2 with NOTHING graded, so a draft
that left the manifest broken would hand both code readers a diff no one can reason about. The loop
run happens because step 17 MOVES the declaration, and a moved declaration whose run nobody made is
a claim with nothing behind it.

**ONE goal iteration, and no more.** The draft exists to be critiqued, not to be polished. If the
loop tier is not an exact match after one pass, the executor reports the deviation in full - which
ids, which direction - and stops. It does not spend the sitting chasing green; the goal belongs to
the fix-and-goal sitting after the code gate.

**NEVER, at any point:**

- **No integration-tier run.** The block stands (`PHASE-STATE.md` section 1) and one attempt is
  spent. No container is started, stopped, rebuilt or reconfigured. No port is changed. No
  `supabase/config.toml` edit for the stack. No `AT_DB_SLOT` override. **`supabase db reset` is
  never run, directly or through any wrapper** (gate-1 ruling 10).
- **No `src/` change.** Continuous integration fails any pull request whose file list matches both
  `^src/` and this change's territory (fact 6). The route arm READS `src/routes/` and writes
  nothing there.
- **No change to `callFunction`** (gate-1 ruling 5).
- **No touching the six pre-existing early-return sites, `_fixture.ts:1162`, `_bind.ts:31`, or
  `resolveCaller`.** Each is named in `rulings-gate2.md` with the reason it stays.
- **No claim that an integration-tier done-criterion is met.** Steps 11, 16 and 17 carry
  integration-tier criteria. Build them; do not claim them. The report says BLOCKED and names the
  machine fault.

---

## Expected verification state per acceptance id

| id | loop tier | integration tier | what the green claims | what it does NOT claim |
|---|---|---|---|---|
| AT-001.21 | GREEN, `ui`-tagged | GREEN | Cross-organisation denial over every kind of tenant data that exists, through the edge surface AND through direct Data API id probing, with denial and absence identical - raw text and status at integration tier, outcome value and status at loop tier. | The criterion's BROWSER route: no screen exists and `src/` is another territory. The `ui` tag enrols the id in a wiring leaf's `--wired` re-run. Isolation of drafts, ledger, files or threads - no such table exists. Timing side channels. |
| AT-001.22 | GREEN, `ui`-tagged | GREEN | An unassigned volunteer is denied a project's non-public data by both paths, while the public project surface answers it and an anonymous caller. | That the public project PAGE renders - there is no page, only its API surface. Same `ui` tag, same reason. |
| AT-001.23 | GREEN | GREEN | The assigned volunteer reads its own project's working data, is denied another project's, and is denied the owning organisation's dashboard. | Reference files, thread and tasks - no such table exists. |
| AT-001.40 | GREEN | GREEN | A platform admin reads two different organisations' and two different projects' data, where a non-admin is refused. | Reach over data kinds that do not exist. |
| AT-001.24 | GREEN | **capability-pending** `ui.logged-out-surface-rendering` | The shipped DECISION: every non-public API surface refuses an anonymous caller, the public one answers, and every route in the tree is declared public or authenticated. | Any rendering or any redirect. No screen exists and `src/` is another territory. |

Counts this item moves, to be confirmed by the run and not by this table alone: loop 21 green / 16
red becomes **26 green / 11 red**; integration 16 green / 21 red becomes **20 green / 17 red**,
because AT-001.24 stays red at integration under a capability declaration.

---

## Proportionality and gates

**This item is SLICED. The code gate runs twice, once per slice.** The reason is size measured
rather than felt: five acceptance ids, ten test bodies, a new shipped module, a migration carrying
the tree's first policy set, three edge functions, two adapters and two conformance arms. One diff
review over all of that would return a wall of findings in which the important ones are
indistinguishable from the rest. The slice boundary is the item boundary - slice 1 is AI4DEV-66's
two denial ids, slice 2 is AI4DEV-67's three grant ids - so each slice is also a complete,
reviewable claim.

**THE POLICY SET SPLITS BY BRANCH, ONE MIGRATION PER SLICE (gate-1 ruling 7).** The plan first said
the set lands whole in slice 1, on the reasoning that splitting it would make slice 1's denials
vacuous. That reasoning does not survive the split being by BRANCH rather than by table. Slice 1
ships the organisation-member branch, which AT-001.21's Data API control exercises; slice 2 ships
the volunteer and platform-admin branches, which AT-001.23 and AT-001.40 exercise. The rule: **a
slice does not ship a policy branch it does not test.**

**What slice 1 still ships unproven, said plainly so both code readers see it.** `visibility.ts`
lands whole in slice 1, deliberately - it is one pure rule and splitting a decision function across
slices is worse than the residual. Its organisation-member and volunteer branches ARE exercised in
slice 1 (AT-001.22 carries both an unassigned denial and an assigned control). **Its platform-admin
branch carries no test until slice 2.** Slice 1's code-gate additions say exactly that.

## Rides along

**One line in `.claude/agents/reviewer-runner.md`** - gate-2 ruling 8. That file tells the runner to
assert an opencode reviewer's tool-call summary holds only `read`, `glob` and `grep`, and to report
anything else as an INVALID RUN. `.opencode/agent/reviewer-flash.md` line 16 grants `gitdiff: true`
deliberately, and this item's own gate-2 flash run used it 16 times. A runner obeying the letter
would discard a valid review, so the allowed list gains `gitdiff`. The cage file itself is correct
and is not changed. Named in the pull request and in the audit brief's path-set.

## Open questions for the founder

Two, written in full in `loop/items/AI4DEV-66/PHASE-STATE.md`, which is what the conductor relays.
In one line each, with the proposed answer this plan proceeds on:

1. **AT-001.24 asks for a browser behaviour that CI forbids this pull request to build** (fact 6),
   and D5.L2 has no wiring leaf the way D2 does. Proposed: land the decision and the API-level
   denials here, declare the id capability-pending at integration tier, and file a D5 wiring leaf.
2. **Most of the data the criteria enumerate does not exist** (fact 4). Proposed: isolate every
   kind that does, land the catalog conformance arm, and name the absent kinds in the merge ruling.

Neither blocks gate 1.
