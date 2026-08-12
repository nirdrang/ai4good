# Gate 2 rulings, slice 1 - AI4DEV-66 (cross-organisation denial, no existence oracle)

Written by the FIX AND GOAL sitting, orchestrator on **opus @ max**, 2026-08-13.

**THE MODEL RULING FOR THIS RUN - CARRY IT FORWARD.** The founder ruled (relayed 2026-08-12,
restated to this sitting 2026-08-13) that **every orchestrator sitting of this item runs as
`orchestrator-opus` at opus/max effort** - plan, draft, fix-and-goal, and the FIRST audit - not only
the merge and audit-re-run sittings that are opus by design. This is a deliberate founder choice for
this run. It is **not** a sign that fable has no credit.

## The panel

Two readers, each blind to the other, each handed a byte-identical prompt file.

| reader | lane | pin | verdict line | evidence in the record |
|---|---|---|---|---|
| terra | codex | `gpt-5.6-terra`, effort max, sandbox read-only | `CODE REVIEW: 5 FINDINGS` | `artifacts/gate2-terra.raw.txt`, `artifacts/gate2-terra.distilled.md`, `artifacts/gate2-terra.stderr.log` |
| flash | opencode | `opencode-go/deepseek-v4-flash --variant max`, agent `reviewer-flash` | `CODE REVIEW: 2 FINDINGS` | `artifacts/gate2-flash.raw.txt`, `artifacts/gate2-flash.distilled.md`, `artifacts/gate2-flash.toolcalls.md`, `artifacts/gate2-flash.identity.md` |

**Seven findings. Seven adopted. Zero rejected outright.** Two are adopted with a different remedy
than the reviewer proposed, and one of those has a reviewer characterisation I reject in writing
while adopting the defect underneath it.

**THE PANEL CONVERGED TWICE, and a convergence is the strongest signal a blind panel gives.**
Two of the five distinct defects were found independently by both readers:

| defect | terra | flash |
|---|---|---|
| the `organizationId === null` early return can end a body as a silent pass | [4], medium | [1], low |
| the loop Data API green grades the fixture's mirror of the policy set, not the migration | [2], medium | [2], low |

Each is ruled ONCE below, under both claims.

## Evidence checks I made before ruling

These are mine, not the readers', and they are recorded because a ruling that only repeats what a
reviewer said adds nothing a reviewer could not have added.

1. **The flash run's cage held, and its tool set is WIDER than `reviewer-runner.md` says.** The
   tool-call summary holds 43 events, counted by kind: 16 `gitdiff`, 14 `read`, 13 `grep`. No
   `write`, `edit`, `patch`, `bash`, `task` or `webfetch` event appears. `.opencode/agent/reviewer-flash.md` line 16 grants
   `gitdiff: true` deliberately, with a comment explaining it. `.claude/agents/reviewer-runner.md`
   line 198 tells the runner to assert the summary holds **only** `read`, `glob` and `grep` - so a
   runner obeying the letter would report this valid run as an INVALID RUN. That is a machinery
   defect found while working this item. **It rides along** (see ruling 8).
2. **The flash identity extract matches the pin exactly** - 27 assistant messages checked, zero
   mismatches, session `ses_007e35f86fferd7sy86lr37Zo9`.
3. **The fixture's Data API mirror agrees with the migration statement by statement, at this head.**
   I checked all four branches by reading, which neither reader did:
   `organizations` mirror `seatedIn.has(row.id)` against policy `viewer_is_org_member(id)`;
   `org_memberships` mirror `seatedIn.has(row.organizationId)` against `viewer_is_org_member(org_id)`;
   `projects` mirror `seatedIn.has(row.organizationId)` against `viewer_is_org_member(org_id)`;
   `acknowledgments` mirror `row.accountId === caller.id` against `account_id = (select auth.uid())`.
   **They agree.** That converts "a divergence would ship undetected" into a narrower and truer
   statement, which ruling 2 uses.
4. **`viewer_is_org_member` and `tenantReadAllowed` are DIFFERENT rules, and the difference makes
   terra's proposed remedy for finding [2] harmful.** The SQL helper admits any account holding a
   membership row. `tenantReadAllowed`'s organisation branch additionally requires
   `accountType === 'ngo'` (`visibility.ts:164`). A volunteer holding a membership row is admitted
   by the policy and refused by the module. Ruling 2 turns on this.
5. **A selftest cannot import `edge.ts`.** `tests/at/tsconfig.json` includes `**/*`, and `edge.ts`
   uses `Deno.env.get` at line 44; its own header (lines 7-8, 25-26) states the arrangement -
   a Deno-only file may import a pure one, never the reverse, or `Deno` is dragged into the strict
   acceptance program. This is why ruling 1's fix ships without a test and is proved structurally.
6. **The early-return idiom is PRE-EXISTING, exactly as flash says.** Six sites at the merge base
   `926d170` (`c-membership-and-acknowledgment.test.ts` 106, 189, 364; `f-lifecycle-and-audit.test.ts`
   69; `_integration.ts` 1001, 1054). This change adds **six new ones** - `d-tenant-isolation.test.ts`
   94, 103, **252**, and `_integration.ts` 1273, 1282, 1393. Neither reader named 252; both readers
   named the other five. Ruling 4 covers all six new sites and leaves the six old ones alone.
7. **One stated fact in this item's own new code is FALSE at this head, and neither reader caught
   it.** Ruling 7 is mine.

---

## [1] terra, high - `readRows` lets a rejected `fetch` escape the fixed refusal

> claim: `readRows` lets rejected `fetch` calls escape, bypassing each handler's fixed `readFailed()`
> response and entering `edgeHandler`'s error-detail response.
> why it matters: A target-dependent fetch error detail (for example, one containing the REST URL)
> makes foreign and absent probes return different raw 502 bodies. Settle by injecting rejected reads
> at every handler read position and comparing status, body, and headers for valid foreign versus
> absent IDs.

**ACCEPT the defect. REJECT the "existence oracle" characterisation. REJECT the proposed settlement.
Fix it differently, and the fix is structural.**

**The defect is real and it is new code.** `readRows` (`supabase/functions/_shared/edge.ts:323`,
added by this change) calls `fetch` and `response.text()` with no `try`. A rejected `fetch` - the
Data API unreachable - propagates out of `readRows`, out of the handler, and into `edgeHandler`'s
catch at line 104, which answers
`refusal(\`${name} could not complete the request: ${detail}\`, 502)`. Two contracts break at once:

- `readRows`'s own header says "TWO OUTCOMES, AND `ok: false` MEANS THE READ DID NOT HAPPEN".
  A thrown rejection is an undeclared third outcome.
- Each handler's `readFailed()` carries a deliberately target-independent sentence, and
  `organization-dashboard/index.ts` lines 56-58 say why: "The sentence is the SAME for every target
  ... a reason that quoted the organisation id would make them distinguishable while looking
  helpful." On the escape path the sentence is the Deno `TypeError` message, which carries the
  request URL, and that URL carries the target identifier. The handler's stated property does not
  hold on that path.

**Why the oracle characterisation is wrong, and it goes in the record because a ruling must not
inflate a claim to justify a fix.** An existence oracle needs the answer for ONE identifier to
depend on whether that identifier's row exists. It does not here. A `fetch` rejection is a transport
failure that happens before any row is examined, so it cannot be conditional on existence. The
divergence terra found is keyed to the identifier the caller itself chose and already knows. Flash
reached the same conclusion independently and cleared it by reading: "a thrown fetch error can only
echo the caller's own input, never the row's existence." **What the escape actually is:** a breach of
two stated contracts and a disclosure of the internal REST URL to the caller. That is enough to fix
it; it is not an oracle, and the merge ruling will not say it was.

**Why the proposed settlement is refused.** "Injecting rejected reads at every handler read position"
needs the deployed functions on a live stack. The integration tier is blocked by a machine fault
(`PHASE-STATE.md` section 1) and one attempt is already spent. It is also the wrong instrument: this
item's own gate-1 ruling 4 settled the identical shape of question by REMOVING the condition rather
than measuring it, and the same posture applies here. After the fix there is no un-caught throw site
inside `readRows`, so the escape is closed by construction, in one function, for all three surfaces.

**THE FIX, DICTATED.** In `supabase/functions/_shared/edge.ts`, in `readRows` only:

- Wrap the `fetch` call and the `response.text()` read in `try` / `catch`.
- The catch returns `{ ok: false, detail: ... }` in the SAME table-only style the three existing
  details use - `path.split('?')[0]` and nothing after it. **The detail must not carry the caught
  error's message, the query string, or the URL**; that is the whole point.
- Extend the header's "TWO OUTCOMES" paragraph to name the rejected-`fetch` case as the third thing
  that becomes `ok: false`, and to say why the detail is table-only.

**What is deliberately NOT touched.** `resolveCaller`'s own un-caught `fetch` (line 167) is
pre-existing, and `edgeHandler`'s header (lines 90-94) declares that path deliberate. Its error
detail names `/auth/v1/user` and carries no target identifier. It is not this item's mess.

**What this fix is proved by:** reading, not running. There is no test, and ruling-evidence item 5
gives the measured reason a selftest cannot reach `edge.ts`. The merge ruling states this plainly.

---

## [2] terra medium + flash low, CONVERGED - the loop Data API green grades the fixture, not the migration

> **terra:** claim: The loop Data API adapter independently computes row visibility from memberships
> instead of delegating that judgement to shipped code.
> why it matters: A missing, wrong-keyed, or universally-denying SQL policy can still produce a
> loop-tier green for the direct-API arms, so that green is partly a claim about the fixture rather
> than the migration.

> **flash:** claim: the loop-tier green over the Data API arms grades the fixture's hand-written
> mirror of the policy set, not shipped code - so item claim 1's "a green grades shipped code rather
> than a copy of it" holds for the edge-surface arms and not for the probe arms; a divergence between
> the mirror and the migration keeps every run this change can make green.

**ACCEPT the defect. REJECT terra's proposed remedy, in writing, because applying it would make the
fixture WRONG. Adopt flash's framing: the claim narrows, and the settlement is the blocked
integration run.**

Both readers are right that the loop-tier probe arms grade `_fixture.ts:1485` and not
`20260812120000_tenant_isolation_policy_set.sql`.

**Terra's remedy - "delegate that judgement to shipped code" - is not available, and the reason is
not that it is hard.** There is no TypeScript module holding the policy set; the rules are SQL.
Flash says so directly. The only shipped module a delegate could reach is `tenantReadAllowed`, and
**delegating to it would introduce a false equivalence**, because the two rules genuinely differ:
`viewer_is_org_member(p_org_id)` admits any account holding a membership row, while
`tenantReadAllowed`'s organisation branch also requires `accountType === 'ngo'`. A volunteer holding
a membership row is admitted by the policy and refused by the module. The fixture's mirror, which
filters on membership alone with no account-type test, is the CORRECT mirror of the SQL; a delegate
would be a wrong one wearing the word "shipped". Refused for that reason.

**What I add that neither reader could give:** I checked the mirror against the migration branch by
branch, and **they agree at this head** (evidence check 3). So the true residual is not "the mirror
may already be wrong". It is narrower and sharper: **nothing this branch can run proves the DATABASE
behaves the way the SQL reads.**

**THE REMEDY, in three parts:**

1. **The claim narrows, in the record.** Item claim 1 - "a green grades shipped code rather than a
   copy of it" - holds for the edge-surface arms and NOT for the Data API probe arms at loop tier.
   The merge ruling says exactly that, and PHASE-STATE carries it as a named residual.
2. **The exposure narrows, in code.** Ruling 3's positive controls force the mirror to admit the
   rightful tenant on all four tables, so a universally-denying mirror fails the loop tier too. It
   does not close the mirror-versus-migration gap; it removes the largest way the mirror could be
   silently wrong.
3. **The settlement is named and it is BLOCKED.** The integration run is the only thing that grades
   the prediction. It has never run at any head of this branch. **This is a merge blocker already,
   for other reasons; this ruling adds a second reason to the same blocker rather than a new one.**

**And ruling 7 corrects the sentence in the fixture that gets this wrong today.**

---

## [3] terra, medium - one Data API positive control where four are needed

> claim: The only successful Data API control covers `organizations`; `org_memberships`, `projects`,
> and `acknowledgments` are asserted only as denials.
> why it matters: If any of those three policies is `USING (false)` or uses the wrong key, both
> foreign and nonexistent probes still return `[]`, while the criterion green falsely claims the
> rightful tenant can read every covered data kind.

**ACCEPT, exactly as proposed.** This is the best finding of the seven.

The probe loop covers four tables (`d-tenant-isolation.test.ts:158-171`, `_integration.ts:1330-1343`)
and the positive control covers one (`:176`, `:1349`). Decision G of the plan says "Every denial body
carries a positive control" and the plan's own step 9 done-criterion says the owning tenant's keyed
read "is what settles that row-level security ran". Both were applied to `organizations` only.
Three tables therefore carry a denial with nothing standing behind it: a `USING (false)` policy, or
one keyed on the wrong column, answers `[]` to A and to B alike and every assertion in the body still
passes.

**THE FIX, DICTATED.** Extend arm (5) - the positive control - in BOTH AT-001.21 bodies, the loop
body in `d-tenant-isolation.test.ts` and `at00121` in `_integration.ts`, so the owning tenant reads
its own rows out of all four tables:

| table | keyed by | assertion |
|---|---|---|
| `organizations` | `id` = A's organisation | exactly one row, `id` is A's organisation (already present, keep as is) |
| `org_memberships` | `org_id` = A's organisation | at least one row, and EVERY row's `org_id` is A's organisation |
| `projects` | `org_id` = A's organisation | at least one row, and the rows' ids contain the operator-created project's id |
| `acknowledgments` | `account_id` = A's account | at least one row, and EVERY row's `account_id` is A's account |

**"At least one, and every row is A's" rather than an exact count**, and the reason is measured: the
integration database is shared by the whole run (the comment at `_integration.ts:1355` already says
so), and a completion records more than one acknowledgment kind. An exact count would be a brittle
assertion about the suite rather than about the policy.

**What this control does and does not prove, so the merge ruling can say it precisely.** It proves
each policy is not universally denying and admits the rightful tenant. It does NOT prove the policy
is keyed correctly - a policy on `org_memberships` keyed on `account_id = auth.uid()` would also let
A read its own row. The denial arms and the unfiltered listing bracket that from the other side.
Together they are a bracket, not a proof, and the record says bracket.

---

## [4] terra medium + flash low, CONVERGED - the `organizationId === null` early return is a silent pass

> **terra:** claim: An NGO completion returning `{ ok: true, organizationId: null }` ends the body
> successfully instead of failing it.
> why it matters: The test can green without creating either tenant or exercising a control/probe;
> the integration twin has the same early-return pattern at `_integration.ts:1273`.

> **flash:** claim: `expect(a).toMatchObject({ok:true}); if (!a.ok || a.organizationId === null)
> return;` - a completion that answers `ok:true` with `organizationId === null` passes the expect,
> trips the `return`, and the whole criterion goes green with every arm skipped.

**ACCEPT for the six sites THIS CHANGE ADDS. The six pre-existing sites are out of scope and stay
untouched.**

Both readers traced it correctly. The `expect` throws on `ok: false`, so the `!a.ok` half is dead
code; the `organizationId === null` half is live, and on that path the body returns as a PASS with
zero arms run. At loop tier the fixture always sets the id, so the live seam is integration tier -
which is where AT-001.21 and AT-001.22 have no other guard.

**Flash's severity is the right one and its reason is the right reason:** the idiom is the suite's,
not this item's invention. I measured it (evidence check 6). Six sites predate this change at
`926d170`. This change adds six more. **A drive-by fix of the pre-existing six would widen the diff
outside what the item claims**, which is the rule the draft sitting already applied to `_bind.ts`
line 31. They are named here and left alone, and they are a filing candidate for the founder; only
the founder creates items.

**THE FIX, DICTATED**, at each of the six new sites - `d-tenant-isolation.test.ts` 94, 103, 252 and
`_integration.ts` 1273, 1282, 1393:

Before the narrowing `return`, add one `expect` that the organisation identifier is present, with a
message naming what its absence means for that body. The narrowing `return` stays exactly as it is
and becomes what it was always meant to be - a TypeScript narrowing device that no run reaches. The
shape, using site 94 as the pattern for all six:

```ts
expect(a, 'NGO A could not complete signup, so there is no tenant for B to be denied').toMatchObject({ ok: true });
expect(
  a.ok ? a.organizationId : null,
  'NGO A completed signup with no organisation, so every arm below would be skipped and this id would go green having proved nothing',
).not.toBeNull();
if (!a.ok || a.organizationId === null) return;
```

Each site's message names its own body's stake; do not copy one message six times.

---

## [5] terra, low - an unrecognised scope falls through to the project branch

> claim: Any runtime scope value other than `'organization'` falls through to the project branch,
> where an assigned volunteer is allowed.
> why it matters: An unrecognized scope such as `undefined` or a future typo widens access instead of
> failing closed, contrary to the shared-rule contract.

**ACCEPT, and it is rated low by the reviewer but it is the finding with a FALSE STATED FACT behind
it, which raises what it costs to leave.**

`visibility.ts:158` is `if (scope === 'organization') { ... }` and everything else falls through to
the project rule at line 174, where a volunteer assigned to the target project is allowed. Meanwhile
the module's own header, lines 137-139, states: "IT FAILS CLOSED ON EVERY VALUE IT DOES NOT
RECOGNISE ... an unknown account type, an unknown role, `undefined`, a number and a missing row all
reach the same refusal, and no value widens authority."

**That sentence is not true of the scope argument.** The module narrows `accountType` through
`knownAccountType` and the role through `parseOrgRole` - both of which take `unknown` deliberately,
even though the types already claim to be narrow. The scope argument gets neither treatment. The
audit's subject is whether every stated fact about the code is true, so this is the class of defect
that is not mergeable, whatever its severity label says.

**THE FIX, DICTATED,** in `supabase/functions/_shared/visibility.ts`:

- Make the scope dispatch exhaustive. Keep the organisation branch as it is. Put the project rule
  behind an explicit `if (scope === 'project')`. After both, return a refusal for every other value,
  with a reason sentence in this module's voice saying an unrecognised scope reads nothing.
- One comment line saying the branch is the same fail-closed posture `knownAccountType` and
  `parseOrgRole` apply, and that no call site can reach it today.

**AND IT GETS A TEST, because a defensive branch nothing drives is the thing this repository has
already learned to distrust.** Add `tests/at/harness/shipped-visibility.selftest.ts`, in the shape of
the two files that already exist for exactly this job - `shipped-caller.selftest.ts` (173 lines) and
`shipped-verification.selftest.ts` (130 lines), whose header says of its subject that it "promises
that every unrecognised shape reads as ...". `at:selftest` discovers `tests/at/harness/` by glob, so
no registration is needed, and `visibility.ts` is import-safe from the strict program - it is
Deno-free by its own constraint, which is exactly why `edge.ts` cannot have one (evidence check 5).

**BOUNDED, so this does not become a second item.** The new file drives `tenantReadAllowed` and
nothing else. Cases: each of the four clauses that grants; an unknown account type; an unknown role;
an unknown scope; `undefined`, a number and a missing field where the types claim a value. No new
helpers, no new abstractions, no fixtures. `publicProjectView` gets NO selftest - AT-001.22 already
asserts its absent fields by name at both tiers, so a selftest would be a second copy of a live
assertion.

**One residual narrows but does not disappear.** The selftest drives `visibility.ts`'s platform-admin
branch as a unit. It is NOT an acceptance test, so residual 5 stands as written: the acceptance id
that exercises that branch through a surface is still slice 2's.

---

## [6] flash, low - the vacuous-pass seam

Ruled with terra [4]. See ruling 4.

---

## [7] MY OWN FINDING - this change states a fact about its own verification that is false

Neither reader caught this. Flash came within one sentence of it.

`tests/at/suites/req-001/_fixture.ts:1474`, inside the `dataApiRead` comment this change adds, says:

> The integration tier is what grades the prediction: both tiers run at the goal step, so a
> divergence between this file and the database fails there rather than shipping.

**"Both tiers run at the goal step" is false at this head.** The integration tier has never run at
any head of this branch. It was attempted once, refused before any test executed, exit code 3, and
the machine fault that caused it is unresolved (`PHASE-STATE.md` section 1,
`artifacts/integration-attempt.txt`). So the sentence promises a grading that did not happen, in the
exact comment a reader consults to learn what the loop green is worth. It is the same defect class as
gate-1 ruling 11 and the two corrections the draft sitting pulled forward into slice 1: a knowingly
false stated fact must not pass through a gate.

**THE FIX, DICTATED.** Correct line 1474's sentence in `_fixture.ts` only. It keeps the mechanism -
the integration tier is what grades the prediction - and stops claiming the grading occurred. It
states that at this head the integration tier has not run, so the prediction is UNGRADED, and that
this is the item's named merge blocker rather than a property of the design.

**`_fixture.ts:1162` carries the same sentence and is NOT touched.** I measured it against the merge
base `926d170`: it is pre-existing, it belongs to an earlier item, and it was true when written. Not
this item's mess.

---

## [8] RIDES ALONG - `reviewer-runner.md`'s cage check omits a sanctioned tool

Not a reviewer finding. Found while checking flash's evidence (evidence check 1), and dictated the
same way.

`.claude/agents/reviewer-runner.md` line 198 tells the runner to assert the tool-call summary holds
**only** `read`, `glob` and `grep`, and to report anything else as an INVALID RUN.
`.opencode/agent/reviewer-flash.md` line 16 grants `gitdiff: true`, with a comment at lines 26-28
explaining that it is the one capability the cage grants beyond reading and that it was measured on
2026-08-12. This gate's flash run made 43 tool calls and many were `gitdiff`.

A runner obeying the letter would have discarded a valid review. This is a false-alarm defect in a
safety check, which is the worst kind to leave: it teaches the next runner to ignore the check.

**THE FIX, DICTATED.** In `.claude/agents/reviewer-runner.md`, add `gitdiff` to that sentence's
allowed list and say in the same sentence that the cage file grants it deliberately. **Change
nothing else in that file, and change nothing in `.opencode/agent/reviewer-flash.md`** - the cage is
correct; only the check that reads it was stale. Listed under "Rides along" in `plan.md`, and named
in the audit brief's path-set so a reader does not see it as scope creep.

---

## What the executor may NOT do

- **No integration-tier run.** The block stands (`PHASE-STATE.md` section 1). One attempt is spent.
  No container is started, stopped or reconfigured; no port is changed; no `supabase/config.toml`
  edit; no `AT_DB_SLOT` override; and `supabase db reset` is never run, directly or through any
  wrapper (gate-1 ruling 10).
- **No slice-2 work.** Plan steps 11-18 belong to the next sitting.
- **No touching the six pre-existing early-return sites, `_fixture.ts:1162`, `_bind.ts:31`, or
  `resolveCaller`.** Each is named above with the reason it stays.
- **No change to `callFunction`** (gate-1 ruling 5).

## The verification this sitting requires

Loop tier only, and it must be exact-match:

1. `bun run typecheck` - exit 0
2. `bun run at:check req-001` - exit 0, 37 P0 ids in bijection
3. `bun run at:verify req-001 --tier loop --expect` - exit 0, 23 green / 14 red, exact match,
   AT-001.21 and AT-001.22 both green
4. `bun run at:selftest` - exit 0, and the new selftest file appears in its file count

**A green here claims the loop tier and nothing else.** The integration half of this item's evidence
does not exist and no ruling above changes that.

---

# What the executor reported back, and my ruling on each

One executor invocation, one goal iteration. All seven work items landed across seven commits,
`951e6d8` through `50d0baa`. **I verified the four checks myself rather than taking the report:**
`typecheck` exit 0 ("typecheck OK: both configs clean"), `at:check req-001` exit 0 ("37 P0 ids in
bijection"), `at:verify req-001 --tier loop --expect` exit 0 with **23 green / 14 red, exact match**
and AT-001.21 and AT-001.22 both green, `at:selftest` exit 0 with 14 files and 353 tests (up from 13
and 344). I also read every diff against the ruling that dictated it. **The changed-file list is
exactly the seven files the rulings name** - no `src/`, no migration, no `config.toml`.

**The executor raised no dispute.** It reported three places where dictated text met the code, and
four observations it deliberately did not fix. Each is ruled here.

## Where the dictated text met the code

**[a] The `projects` positive control - it asserted BOTH forms. ACCEPT AS LANDED, and the
discrepancy was MINE.** Ruling 3's table says "the rows' ids contain the operator-created project's
id"; my executor instruction paraphrased it as "every row belongs to A". The executor asserted both
rather than choosing. That is the union, it is strictly stronger, and it costs one `expect`. It also
did the right thing procedurally: it reported the divergence instead of silently picking. Recorded
here so a later reader sees the extra assertion was ruled, not improvised.

**[b] The one cast bridge in the selftest. ACCEPT AS LANDED.** My bound said "no new helpers, no new
abstractions, no fixtures", and the file declares
`const call = (viewer, scope) => tenantReadAllowed(viewer as TenantViewer, scope as TenantReadScope)`.
That bound barred a framework, not the one construct that lets the file reach `unknown` inputs at
all - and `shipped-verification.selftest.ts` carries the identical construct for the identical
reason. Without it the file cannot test the thing it exists to test.

**[c] Driving BOTH organisation roles inside the NGO clause. ACCEPT AS LANDED.** The module's own
comment says either role reads. Testing one leaves half that clause unexercised. One extra line
inside an existing case.

## The four observations

**[d] Both narrowers TRIM, so `'ngo '` and `' admin '` are RECOGNISED. DISMISSED, with the reason.**
`knownAccountType` calls `raw.trim()` before the membership test, mirroring `parseOrgRole`
(`memberships.ts:51`) deliberately. The executor's first draft of the selftest predicted `'ngo '`
would be refused, the test failed, and **it corrected the test rather than the module** - the right
call, and the instrument working as intended.

Three reasons this is not a defect. First, trimming does not WIDEN: `'ngo '` and `'ngo'` name the
same account type, and no value that is not an account type becomes one. Second, the promise is
about values the module does not RECOGNISE, and it recognises this one. Third, `parseOrgRole` is
pre-existing shipped code from a merged item, so changing that posture is outside this item's
declared scope, and changing only the copy would put two different narrowing rules in one tree.
The selftest now asserts the behaviour positively, so it is documented rather than accidental.

**[e] The header enumeration did not name the scope. ACCEPTED and APPLIED.** After the fix the
claim was true of the scope, but a reader had to infer it from an enumeration that listed everything
else. Since the whole of ruling 5 turned on that sentence being untrue, leaving it silent about the
thing that was wrong is the missed half of the fix.

The remedy is comment-only and I decided every character of it, so **a mechanical carried the typing
under the founder ruling of 2026-08-12**, and I verified the result as any change is verified: the
anchor matched, one file changed, comment only, `typecheck` exit 0, `at:check` exit 0, tree clean.
Commit `4af5c39`. The enumeration now says "AN UNKNOWN SCOPE" and a following paragraph records what
gate 2 measured and names the selftest as the oracle.

**[f] The "every row is A's" assertion shape. DISMISSED - keep it as landed.** It compares the mapped
key column against an array of the same length filled with A's identifier. The executor offered
`.every()` inside one `expect` as plainer. It is plainer and it is worse: `.every()` collapses to
`true`/`false` and reports nothing about WHICH row was foreign, while the landed shape prints the
offending value. A guard above it already asserts the row count is greater than zero, so the empty
case cannot pass vacuously. Diagnostics win over brevity in a test whose failure is a tenant leak.

**[g] Twelve early-return sites now exist; the six new ones carry the guard. CONFIRMED.** I measured
the same thing independently (evidence check 6). The six pre-existing sites stay untouched and
remain a filing candidate for the founder; only the founder creates items.

## What ruling 1 is proved by, restated with the executor's measurement

The executor measured what I had reasoned: a search over `tests/` finds exactly one occurrence of
`_shared/edge`, at `_contract.ts:115`, **inside a comment** - no import anywhere. So no test program
reaches `edge.ts`, `typecheck` does not cover it, and work item 1 is proved by reading plus Deno's
own check when the function is served. Structurally there is now no un-caught throw site inside
`readRows`: the `fetch` and the `response.text()` sit inside one `try` whose `catch` returns
`{ ok: false, detail: 'a read of <table> could not be made at all' }` - no error message, no query
string, no URL. **The merge ruling states this in these words rather than implying a test exists.**

## Caps used by this sitting

- **Executor invocations: 1 of 3.** One goal iteration inside it. No fix loop.
- **Mechanical invocations: 1**, for a comment-only edit whose every character I decided.
- Integration-tier attempts: **0 this sitting.** The one attempt from the draft sitting stays spent.
- Continuous-integration flake re-run: unused. Audit re-run: unused.
