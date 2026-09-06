# Architectural critique — the tenant-isolation deliverable against the tree it must land in

Reviewer: Claude Opus. Tree read at `/home/user/ai4good`, branch
`nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5`, head `ca340d0`, on 2026-09-05. Line numbers
are from that checkout.

I used `explanation.md` and the four explorer reports as a map, then read the migrations, the three
edge functions, the shared modules, the harness contract and adapters, the CI workflow, the route
tree, and the reference worktree under `.claude/worktrees/ref-66/`. Where I disagree with the
explanation I say so in the finding.

## What is sound, said first

Three things in this tree are well built and the deliverable should preserve them rather than work
around them.

- **The two denial layers are kept distinct on purpose, and the distinction is load-bearing.**
  `grant select, insert on public.accounts to authenticated`
  (`supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql:338`) exists so
  that a client refusal comes from row-level security and not from the privilege layer. That is the
  correct Supabase posture and it is written down with its reason. The deliverable inherits a correct
  starting state, not a mess.
- **The pure/impure split is real and it is enforced by the type system.** `accounts.ts`,
  `memberships.ts`, `caller.ts` and `verification.ts` hold decisions with no I/O and no `Deno`
  reference; `edge.ts` holds I/O and no decisions. The acceptance suite imports the decision modules
  directly, so a loop-tier green grades shipped code. A read decision belongs on the pure side, and
  the seam for it already exists.
- **A refusal type whose shape is the oracle.** `OrgAdminDecision`
  (`supabase/functions/_shared/memberships.ts:84-86`) carries a `kind`, and
  `orgAdminActionAllowed(role: OrgRole | null)` takes one role with nowhere to put a second. An
  implementation that authorised from the wrong organisation cannot express itself through that
  signature. This is the best idea in the codebase and the read decision should copy the device.

The findings below are about where the deliverable does not fit that shape.

## Findings

### 1. [structural] Reads have two enforcement paths, and the write doctrine that justifies the service role does not transfer to them

**Components**: `supabase/functions/_shared/edge.ts`, `create-organization/index.ts`,
`update-organization/index.ts`, the migration grant set, the row-level-security policy set this
deliverable must add.

**Finding**: The write path has one choke point and a backstop under it. Every write goes through a
`SECURITY DEFINER` function; the service role holds no `INSERT`, `UPDATE` or `DELETE` anywhere; the
TypeScript decision above and the SQL raise below are two guards on **one** path, so "a guard on the
only write path does not depend on the code that normally calls it"
(`20260808120000_...sql:257-259`) is literally true.

Reads have no such single path. The criterion itself names two: "by UI or direct API/ID probing"
(`.taskmaster/docs/acceptance/at-req-001.md:47`). The UI path is fixed by project rule to go through
an edge function (`CLAUDE.md`, "UI never touches the DB directly"), and every edge function in this
tree reads with the service role, which holds `BYPASSRLS`. The probing path is PostgREST with the
caller's JWT, which is governed only by policies. So the deliverable ships **one requirement stated
twice**, in two languages, with nothing able to notice the two statements diverging.

**Evidence**: The service role is on every edge read.
`create-organization/index.ts:55-72` reads `public.accounts` with
`apikey: SERVICE_ROLE_KEY`. `update-organization/index.ts:60-81` reads `public.org_memberships` the
same way. `edge.ts:272-286` posts every RPC with the service-role key, and its own comment says "The
service role bypasses row-level security, which is why the database functions perform their own
checks: nothing else is standing on this path" (`edge.ts:269-271`). The grants that make those reads
possible are `20260808120000_...sql:353` and `20260811125000_...sql:202`, both to `service_role`.

The divergence is not hypothetical. The reference branch shipped exactly this two-rule design and
measured the two rules disagreeing: its SQL helper `viewer_is_org_member` admits any seated account,
while its TypeScript `tenantReadAllowed` additionally requires `accountType === 'ngo'`
(`.claude/worktrees/ref-66/supabase/functions/_shared/visibility.ts:184` against
`.claude/worktrees/ref-66/supabase/migrations/20260812120000_tenant_isolation_policy_set.sql:57-71`).
Its own gate-2 ruling 2 forbade the loop fixture from delegating the SQL mirror to the TypeScript
rule, which is a rule that keeps the two copies apart on purpose. The divergence is currently
harmless only because a separate trigger makes non-NGO membership unwritable.

**Impact**: Two costs, both paid by every later requirement rather than by this one.

First, every tenant table added by REQ-003, REQ-006, REQ-015 or REQ-032 must be added to both rule
statements. Miss the SQL and the direct probe leaks. Miss the TypeScript and the edge read leaks.
Nothing in the tree cross-checks them, and no test can: at loop tier the SQL is a hand-written mirror
(finding 2), and at integration the two are proved by different arms of the same body.

Second, this contradicts the doctrine the repository states about itself. `_contract.ts:14-18` says
restating a type would be "two independent statements about one thing with nothing able to notice
them diverging, and that is the defect this whole harness exists to delete". The deliverable would
introduce exactly that defect at the level of the rule rather than the type.

**Push-back the deliverable should make**: forward the caller's JWT from the edge function to
PostgREST for the tenant reads, instead of using the service role. Then the policy set is the single
enforcement point, the edge function becomes projection and shaping only, and the TypeScript decision
either disappears or becomes a second opinion whose disagreement is a bug rather than a parallel
rule. `callDatabaseFunction` already takes the key as a parameter (`edge.ts:272-277`), so the
mechanism exists; only the parameter name lies. If forwarding is refused, then say plainly in the
plan that the deliverable ships two rules, and add the one thing that can detect divergence: a test
that drives the same viewer and target through both paths and requires the same verdict.

### 2. [structural] The acceptance harness has one flat system-under-test type, derived from the loop fixture, so a database-only property must first be given a Map implementation

**Components**: `tests/at/harness/suite-adapters.ts`, `tests/at/suites/req-001/_contract.ts`,
`_fixture.ts`, `_live.ts`.

**Finding**: `AccountsSut` is one type with about forty members, and both tier adapters must implement
all of it. Worse, the compile-time source of the type is the **loop** adapter:
`AdapterModules` maps `'req-001'` to `typeof import('../suites/req-001/_fixture.ts')`
(`suite-adapters.ts:112-115`), and `SutOf` is read off that module's return type
(`suite-adapters.ts:120-127`). `_fixture.ts:746` declares `const sut: AccountsSut`, `_live.ts:227`
declares `const accounts: AccountsSut`, so the contract binds both.

This deliverable is the first one whose subject matter exists **only** at the integration tier. Row-level
security, table privileges, PostgREST's difference between an empty list and a privilege refusal, and
the catalog posture of future tables are all invisible to a `Map`. The type forces the loop fixture
to grow a member for each of them anyway.

**Evidence**: The loop fixture's own header states the limit: "NOT PROVED: that the migration is
correct, that either edge function works, that row-level security denies what it should"
(`_fixture.ts:33-36`). The live adapter has an escape for the reverse case, a member it cannot back:
six inline `CapabilityPending` throws at `_live.ts:808-813`. The loop fixture uses that escape
**nowhere** — `grep CapabilityPending tests/at/suites/req-001/_fixture.ts` returns nothing — and the
expected manifest has no loop-tier `capability-pending` red either
(`tests/at/expected/req-001.json`: all sixteen loop reds are `pending / sut-missing`; the five
`capability-pending` reds are all at integration). So the precedent a reader will follow is "write a
Map member", not "declare the capability absent".

The reference branch followed that precedent and recorded the result as a residual: its
`dataApiRead` is a hand-written SQL mirror, and its own record says "Loop Data API green grades the
fixture, not SQL" and that positive controls on four tables are "a bracket, not a proof of correct
keys".

**Impact**: The deliverable is pushed toward writing a second copy of the policy set in TypeScript,
inside the harness, whose green is worth nothing about the database and which drifts silently from
the SQL. That is the same double-statement defect as finding 1, moved into the test tree, where it is
harder to see because it looks like test code rather than like a rule.

**Push-back**: two options, and the plan should choose one out loud.
The cheap one is to let the loop fixture throw `CapabilityPending(['sut.accounts.<member>'])` for the
Data API and catalog members, and declare those ids `capability-pending` at loop in
`tests/at/expected/req-001.json`. The manifest supports it (`expected.ts` accepts the kind at any
tier); only the precedent is missing. The claim then reads honestly: this property is an integration
claim and the loop tier says nothing about it.
The structural one is to stop treating "the accounts system" as one surface. The type already mixes
four unrelated systems, and `_contract.ts:296-328` names them: the Auth vendor mirror, the product
edge operations, the operator's provisioning authority, and the read-backs. Adding a fifth, the
database's own access control, to the same flat type is what forces the mirror. Splitting the
database-posture members into their own key under `harness.sut` would let each tier bind only what it
can honestly answer.

### 3. [structural] The only durable guard for this property runs at a tier that CI never runs

**Components**: `.github/workflows/ci.yml`, `tests/at/harness/runner.ts`,
`tests/at/expected/req-001.json`.

**Finding**: Tenant isolation is a property over the whole `public` schema, and it decays as later
requirements add tables. The device that keeps it true is a catalog conformance check: every table is
declared either unreachable by client roles or tenant-isolated, and an isolated table has row-level
security on, a grant, and no `using (true)`. That check reads `pg_class`, `has_table_privilege` and
`pg_policies`, so it can only run against a live database. CI runs the loop tier only.

**Evidence**: `.github/workflows/ci.yml:185-187` runs
`bun run at:verify "$req" --tier loop --expect` and nothing else. There is no integration step in the
workflow. The integration tier needs Docker, a machine lock and `supabase db reset --local`
(`tests/at/harness/local-stack.ts`), which is why it is a local, manual command. The reference
branch's catalog arm sits inside AT-001.21's integration body
(`.claude/worktrees/ref-66/tests/at/suites/req-001/_integration.ts` `at00121`), so on that branch too
the guard was never executed by any automated run; its own record says integration never ran there at
all.

**Impact**: On the day this deliverable merges, the property is true and proved by a local run on one
machine. From the next merge onward nothing checks it. A later leaf that adds a `drafts` table with
no `revoke all` reintroduces the leak, CI stays green, and the acceptance ids stay green because they
test the tables that existed when they were written. This is the single highest-consequence gap in
the plan, because tenant isolation is the one property whose regression is silent by nature: a leak
produces rows, not errors.

**Push-back**: land a **loop-tier** static half of the catalog guard beside the integration one. The
migration files are text in the repository; a check that parses `supabase/migrations/*.sql` for
`create table`, `enable row level security`, `grant`, `revoke` and `create policy`, and requires every
`public` table to appear in a declared list, runs with no database and can sit in CI. It is weaker
than the catalog query, because it reads intent rather than the catalog, and the pair is what makes
the property durable: the static half catches the realistic regression (somebody adds a table), and
the live half catches the subtle one (default privileges the migration did not name). The tree
already has a precedent for exactly this shape: `_source-scan.ts` reads `src/routes/` from disk as an
out-of-band oracle for AT-001.17's "UI absent" clause, and its header states the reasoning.

### 4. [structural] AT-001.24 is grouped with two API-observable criteria, and its blockers are in a different territory, a different leaf and a different tool

**Components**: `loop/decomp/req-001.md:38`, `src/routeTree.gen.ts`, `src/router.tsx`,
`tests/at/harness/runner.ts:300-306`, `.github/workflows/ci.yml:213-277`.

**Finding**: `D5.L2` bundles AT-001.23 (assigned volunteer reads), AT-001.40 (platform admin reads)
and AT-001.24 (a logged-out visitor sees public surfaces only, and authenticated surfaces redirect to
sign-in). The first two are API-observable and share this deliverable's whole machinery. The third
shares none of it. Its outcome is a rendered screen, and three separate structures forbid producing
one here.

**Evidence**:
- There is no authenticated surface to redirect. `src/routeTree.gen.ts:19-24` declares one route,
  `/`. `src/routes/index.tsx` renders one heading. `src/router.tsx` builds the router with a query
  client and no auth context, no `beforeLoad` and no redirect.
- There is no sign-in target. The leaf that creates one is `D2.LW`, "wire the auth screens"
  (`loop/decomp/req-001.md:23`), which has not landed.
- There is no way to observe a render. `runner.ts:300-306` makes `--wired` exit 3 with the reason
  that the screen driver does not exist.
- The work cannot land with its test. The CI territory guard fails any pull request that changes both
  `src/` and `supabase|tests|loop|.claude|.github` (`ci.yml:213-277`). A route guard lives in `src/`,
  owned by Lovable; its acceptance body lives in `tests/`, owned by Claude. Two pull requests, two
  actors, and the guard is unproved in between.

**Impact**: The most likely outcome is a shipped route-visibility registry that nothing imports, with
a loop-tier body asserting the registry agrees with the file names under `src/routes/`. The reference
branch built exactly that, and its own audit recorded the objection "nothing imports
route-visibility". That artefact is the shape the first migration's header refuses in its own words:
"a column nothing enforces looks like a requirement being met and is not one"
(`20260808120000_...sql:5-6`). Landing it green would make AT-001.24 report a requirement that no
running code enforces.

**Push-back**: do not turn AT-001.24 green in this deliverable. Two honest options.
Declare it `capability-pending` at integration on a UI-rendering capability, exactly as AT-001.02 to
.05 are declared for the OAuth handshakes (`tests/at/expected/req-001.json`), and leave it red at
loop with the leaf that will land it named. Or propose to the founder that the decomposition move
AT-001.24 to `D2.LW`, which is the leaf that creates the sign-in route the criterion needs. The
second is a decomposition change and needs a ruling; the first needs none. Either way, the plan
should state that D5.L2 lands two criteria and defers one, rather than discovering it at the gate.

### 5. [concern] The shared error path puts internal detail on the wire, and a no-existence-oracle read surface cannot tolerate that

**Components**: `supabase/functions/_shared/edge.ts:96-109`, `update-organization/index.ts:98-106`,
the read surfaces this deliverable adds.

**Finding**: `edgeHandler` catches everything a handler throws and answers
`refusal(\`${name} could not complete the request: ${detail}\`, 502)` where `detail` is
`error.message`. On the write functions that is a good trade: a caller can tell a refusal from an
outage. On a read surface whose criterion is "nothing leaks (no existence oracle)", the same
mechanism is a channel by construction. The message text of a thrown error varies with the code path,
and the code path varies with whether the row exists.

**Evidence**: `edge.ts:104-107` is the catch-all. `update-organization` already puts an upstream
status into a caller-visible sentence: `roleIn` returns
`` `the membership read answered ${response.status}` `` (`index.ts:74`) and that string is embedded in
the 502 body at `index.ts:103`. The reference branch measured the same class of leak on this same
`edgeHandler` and recorded it: its `readRows` "fetch escape ... leaked the REST URL via
`edgeHandler`". Main's `edgeHandler` is unchanged from the one that leaked.

The tree also has no place to keep a single refusal **value**. `refusal()` is a shared *function*
that takes a sentence, so each call site writes its own
(`update-organization/index.ts:94, 103, 112, 118, 132` are five distinct shapes, and three of them
carry a `kind` the other two omit). A property that is "two answers are byte-identical" cannot rest on
five call sites choosing the same words.

**Impact**: Two answers that must be indistinguishable can drift apart through the error path even
when the success path is correct, and the drift is invisible to a test that only compares the two
happy refusals. The harness makes this worse: `functionPost` parses the body to JSON
(`tests/at/harness/live-stack.ts:101-121`, via `jsonBody`), so a body written against it compares
parsed objects and cannot see a difference in bytes, header order or whitespace.

**Push-back**: three concrete things.
Export the refusal as a **constant value**, returned and never thrown, so there is nowhere in the
surface to put a second one. The reference branch's `TENANT_NOT_FOUND`
(`.claude/worktrees/ref-66/supabase/functions/_shared/visibility.ts:60-68`) is the right shape and its
reasoning is sound, including the note that `edgeHandler` forces "returned, never thrown".
Read the target row **last**, so an outage answers the same 502 for a real foreign identifier and for
one that names nothing.
Add a sibling of `functionPost` that returns unparsed text, so the equality assertion is over bytes.
This is a harness gap, not a product one, and it is small: `functionPost` already reads
`response.text()` and then parses it.

### 6. [concern] Every read-back in the harness is an operator read, so a positive tenant criterion can go green with no policy at all

**Components**: `tests/at/suites/req-001/_contract.ts:697-721`, `_live.ts` read-back section,
`tests/at/harness/live-stack.ts:275-279`.

**Finding**: The contract's read-back vocabulary is shaped around a subject, never around a viewer:
`account(accountId)`, `organization(organizationId)`, `membership(organizationId, accountId)`,
`projectAssignment(projectId)`, `acknowledgments(accountId)`. At integration every one of them runs
over `sqlClient(stack)`, which opens `stack.dbUrl` as `postgres` with `bypassrls = true`. `Session`
deliberately carries no token (`_contract.ts:174-194`, "IT IS STILL NOT AN ACCESS TOKEN"), and the
live adapter keeps tokens in a private map reachable only from inside SUT methods
(`_live.ts:106-123`).

So the harness has no notion of "a caller reading". It has "the operator reading", which sees
everything.

**Impact**: A concrete vacuous green, not a theoretical one. AT-001.23 says the assigned volunteer
reaches that project's working data. A body written with the existing vocabulary would call
`sut.projectAssignment(projectId)` after assigning the volunteer, assert the row comes back, and pass
**with zero policies in the database**, because the operator connection was never denied anything.
The negative criteria (.21, .22) do not have this failure mode, because an operator read returns the
row and the assertion fails loudly. The positive ones (.23, .40) do, and .40 is the one whose whole
content is that an admin reaches across accounts.

**Push-back**: the deliverable must add a viewer-shaped read to the contract, and the split has to be
explicit rather than two similar-looking members. Name them so a reader cannot pick the wrong one by
accident: the operator read is the **control** that proves the row exists, and the viewer read is the
**subject** of every tenant assertion. Every tenant body should use both — operator to establish the
row, viewer to establish the verdict — and the plan should say that a body using only the operator
read is a defect. The mechanics already exist: `_integration.ts:979-994` fetches
`/rest/v1/org_memberships` directly with the anon key and pins 401 plus `permission denied`, so the
raw-fetch precedent is in the tree; what is missing is the same fetch carrying the caller's bearer
token, which needs `tokensOf` and therefore a SUT method.

### 7. [concern] The schema has one uniform function-grant posture that the policy helpers must break exactly once, with nothing marking the difference

**Components**: every `grant execute` in `supabase/migrations/`.

**Finding**: Every function this schema creates follows the same two lines: revoke `execute` from
`public`, then grant it to `service_role` and to nobody else. That posture is correct for the write
RPCs, because they are reached only by a running service. It is fatal for a policy helper: a policy
expression is evaluated as the querying role, so `authenticated` needs `execute` on any function a
policy calls. A helper that copies the established posture makes every policy fail with a permission
error on the function.

**Evidence**: the posture is uniform and therefore convincing to copy.
`20260808120000_...sql:370-376` (three functions), `20260809090000_...sql:421-422`,
`20260811125000_...sql:206-207`. There is no function in this schema today that is granted to
`authenticated`. Nothing in the file names, the comments or the structure distinguishes "callable by
the platform" from "callable by a policy"; the only difference is the grant line itself. The
reference branch hit this and wrote the reason into its helper's comment
(`.claude/worktrees/ref-66/supabase/migrations/20260812120000_...sql:76-86`), which is evidence that
the trap is real and not imagined.

**Impact**: The failure mode is the misleading kind. A missing helper grant does not produce a
denial; it produces `permission denied for function viewer_is_org_member`, which reads like an outage
and would be debugged as one. A test asserting denial would pass for the wrong reason, and a test
asserting access would fail with a message that points at the wrong layer.

**Push-back**: small and cheap. Give the policy helpers a name prefix the schema does not otherwise
use, `viewer_` in the reference branch's design, and state in the migration header that every
`viewer_*` function is granted to `authenticated` while every other function is `service_role` only.
Then the catalog arm of finding 3 can check the rule instead of a reader remembering it.

### 8. [observation] `account_type` is a column and not a claim, so every policy that needs the caller's type pays for a definer call per row

**Components**: `public.accounts`, `supabase/config.toml` auth block, the policy set to be added.

**Finding**: There is no custom access token hook, so the JWT carries no `account_type`. `accounts`
has row-level security on and no policy, so a policy cannot join it directly either; it needs a
`SECURITY DEFINER` helper. A `SECURITY DEFINER` function is never inlined by the planner, so a
listing of N rows makes N calls, each running an `exists` subquery.

**Impact**: Free today. `projects` holds a handful of rows and no listing surface exists. It becomes a
real cost when REQ-010 and REQ-011 land the marketplace listing, which the migration notes give a
p95 target of under 500 ms (`.taskmaster/docs/migration-nextjs-to-tanstack-VERIFIED.md:521`). The
reference branch already applies the standard mitigation, wrapping the call as
`(select auth.uid())` so the planner treats it as an `InitPlan`, but that only stabilises `auth.uid()`,
not the helper.

**The tradeoff is worth naming rather than deciding here.** A claim in `app_metadata` through a custom
access token hook makes `viewer_is_platform_admin()` a claim read with no table access. The usual
objection is staleness: a demoted admin keeps the claim until the token expires. This tree's
`jwt_expiry` is 120 seconds, which bounds the staleness to two minutes and makes the objection much
weaker than it usually is. I would not change it in this deliverable, because a hook is auth
configuration and this leaf is already large. I would record the choice and its reason, so the next
requirement that hits the listing cost finds the analysis instead of redoing it.

### 9. [observation] `projects` has no public-versus-private axis, so AT-001.22's "the public project page remains visible" has no data-model hook

**Components**: `public.projects`
(`supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql:57-63`), the
public surface this deliverable would add.

**Finding**: The table is `id`, `org_id`, `name`, `assigned_volunteer_id`, `created_at`. There is no
visibility flag, no lifecycle state and no published-at column. So "the public project page" is not a
projection of a declared-public row; it is a decision made in a function about a row that carries no
statement of its own visibility.

**Impact**: The public surface is correct only for as long as every project is public. REQ-010 and
REQ-011 land listings and a project page, and REQ-003 lands drafts, which are by name not public. At
that moment the public surface written here becomes wrong in a way no test in this deliverable can
detect, because the criterion it was written against never mentioned a private project. The
architecture note for REQ-033 already anticipates the split ("the public status projection is
role-uniform; thread, files, and the NGO bot sit outside that").

**Push-back**: keep the public surface as narrow as the criterion allows and say what it assumes. The
reference branch's `publicProjectView` returns three fields built one at a time and copies nothing
wholesale, which is right. Add one sentence to the migration or the function header: this surface
treats every project row as public, which is true today because no lifecycle column exists, and the
requirement that adds one owns re-deciding it. That is cheaper and more honest than adding a
`visibility` column now, which would be a column nothing enforces.

### 10. [observation] Three written instructions disagree about how a read should reach the database, and this deliverable settles it for every later requirement

**Components**: `CLAUDE.md`, `.taskmaster/docs/migration-nextjs-to-tanstack-VERIFIED.md`,
`src/lib/api/example.functions.ts`.

**Finding**: The tree contains three incompatible instructions and implements none of them.
`CLAUDE.md` says "UI code must always go through an edge function, never call the database directly
from UI code". The migration notes say the project page and the dashboard read "via @supabase/ssr
(RLS)" (`migration-nextjs-to-tanstack-VERIFIED.md:444, 473`). And `src/lib/api/example.functions.ts:11-13`
tells its reader, in a file written for Lovable, "Use this pattern instead of Supabase Edge Functions
for server logic".

**Impact**: The deliverable is the first read in the repository, so whichever path it builds becomes
the precedent that thirty later read surfaces copy. Two of the three instructions point away from the
edge function, and one of them sits in `src/`, in Lovable's territory, where the actor who builds the
front end will read it. If this leaf builds edge-function reads and nobody amends
`example.functions.ts`, the next UI work follows the comment in front of it and reaches the database
a third way.

**Push-back**: the plan should name the chosen path and ask the founder to rule, because the losing
instruction lives in the other territory and this deliverable cannot edit it (the CI territory guard
forbids one pull request touching both). A one-line note is enough: which of the three wins, and who
files the correction to the other two.

## Two claims in the explanation I would qualify

- **"The design must pick" one of the three read architectures** (`explanation.md`, section 3). The
  criterion requires two paths regardless of which one the UI uses: "by UI or direct API/ID probing"
  means the direct probe must be denied even if no UI ever makes it. So the choice is about the UI
  path only. The policy set is not optional under any of the three options.
- **"`update-organization`'s 403 collapse is a useful shape"** (`explanation.md`, gotcha 11). It is
  useful, and it is also the wrong status for a read. `update-organization` answers 403 for a missing
  organisation and for a foreign one, which is non-oracular because both answers are the same. For a
  read, a 403 still says something exists to be forbidden. The reference branch's reasoning for
  choosing 404 (`visibility.ts:50-54`) is better and the deliverable should follow it, while keeping
  the write path's 403 unchanged. Two different statuses on two different surfaces is fine; what
  matters is that each surface gives one answer for both cases.
