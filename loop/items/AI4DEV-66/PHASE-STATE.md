# PHASE-STATE - AI4DEV-66 (cross-org denial, no existence oracle), batch with AI4DEV-67 (assigned volunteer, admin, stranger)

**Phase: SLICE 2 IS BUILT AND ITS LOOP TIER IS GREEN. The next event is SLICE 2's CODE GATE - two
blind readers on slice 2's diff. The two prompt files are written and named below.** The
INFRASTRUCTURE BLOCK from earlier sittings still stands, unchanged, and it is restated in full in
section 1.

Written by the DRAFT sitting for slice 2, orchestrator on **opus @ max**, 2026-08-13.

## THE MODEL RULING FOR THIS RUN - CARRY IT FORWARD

The founder ruled (relayed 2026-08-12, restated to this sitting 2026-08-13) that **every
orchestrator sitting of this item runs as `orchestrator-opus` at opus/max effort** - plan, draft,
fix-and-goal, and the FIRST audit - not only the merge and audit-re-run sittings that are opus by
design. This is a deliberate founder choice for this run. It is **not** a sign that fable has no
credit. The conductor spawns every subsequent sitting of this item the same way, and every state
file repeats this paragraph.

## Attribution, derived from the branch

Branch `nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`, cut from
`origin/main` at `948d4f0`, merge-base with main `926d170`.

`AI4PM-19 (auth and org membership)` > `AI4DEV-50 (auth root)` >
`AI4DEV-55 (tenant isolation and visibility)` > `AI4DEV-66 (cross-org denial, no existence oracle)`.

`AI4DEV-67 (assigned volunteer, admin, stranger)` rides this branch. It is the manifest's D5.L2,
blocked by D5.L1, which is why the two are batched. **Slice 2 is that partner item's whole scope.**

**Database slot 1**, reserved under this item, covers both.

Pull request **#57** is OPEN and its head is this branch
(`https://github.com/nirdrang/ai4good/pull/57`). Its body names `AI4DEV-66` once and no other item
id, so the reference guard has nothing to fail on.

**Head at the close of this sitting: `c82363bba1ae09d71b64c7c32f57ce2c21d9df13`.**

---

# 1. THE INFRASTRUCTURE BLOCK - READ THIS BEFORE ANY MERGE DECISION

**Database slot 1's local stack is DOWN. The integration tier has never run at any head of this
branch, so half of this item's verification evidence does not yet exist.** Nothing this sitting did
changes that, and this sitting made no attempt.

The founder relayed the cause: the gateway container cannot bind its API port (Windows has it
reserved) and the edge-function container fails to mount its entry file. **Only the founder can
clear this.**

The run was attempted **exactly once**, by the draft sitting for slice 1, and was refused before any
test executed. The runner's own words, from `artifacts/integration-attempt.txt`:

```
at:verify req-001 --tier integration — INFRASTRUCTURE: slot 1 could not be prepared: slot 1
reported no running stack (the stack reports stopped services: supabase_kong_ai4good-slot-1,
supabase_edge_runtime_ai4good-slot-1 — start them before running the suite), so nothing was
reset and nothing was run
```

Exit code 3. Zero tests. **No slot evidence line exists to carry, because the run never reached the
reset.**

**THE RULINGS ON IT, WHICH BIND EVERY SITTING AFTER THIS ONE:**

1. **This is a machine fault, not a red on this item's work.** It is the class the orchestrator
   contract calls "the check cannot be obtained right now". Nothing about it is debuggable here.
2. **NO REMEDIATION.** No container is to be started, stopped, rebuilt or reconfigured by any role
   inside this item; no port changed; no `supabase/config.toml` edit; no `AT_DB_SLOT` override; and
   **`supabase db reset` is never run, directly or through any wrapper** (gate-1 ruling 10).
3. **ONE ATTEMPT IS SPENT.** Do not re-run the integration tier speculatively. Re-run it when the
   founder says the stack is up, and not before.
4. **THIS IS A HARD MERGE BLOCKER.** The merge ruling must state both tiers' exact-match results,
   and the integration half does not exist. **A merge ruling written on the loop tier alone would be
   claiming a green that was never obtained.** The required continuous-integration check cannot
   supply the missing half either - it holds no database slot.
5. **SLICE 2 ADDS A THIRD REASON TO THE SAME BLOCKER, not a new one.** The new migration has never
   been applied anywhere. Nothing has parsed it, nothing has run it, and no policy in it has ever
   been evaluated. Slice 1's migration was already in that position; slice 2 doubles the SQL that
   ships unexecuted.

**What the integration tier now owes, enumerated:** the plan's step 6 privilege-posture measurement
(never made - `artifacts/verify-first-answers.md` records that plainly and invents no result);
AT-001.21, .22, .23 and .40 green at integration tier; first proof that BOTH migrations apply and
that the three deployed functions serve at all; the grading of the fixture's policy mirror, which now
mirrors two migrations rather than one; and step 16's third done-criterion, "the conformance arm
passes on the real list", which needs the live catalog.

---

# 2. WHAT THIS SITTING DID

## The plan was amended BEFORE any code was written

Steps 11 to 18 were written before slice 1 existed. Slice 1 then answered some of what they assumed
and raised questions they do not cover. So this sitting amended `plan.md` with eight dictations,
**committed and pushed as `d231485` before the executor touched a single file**, so the judgment
would survive an executor death. Each dictation names the step it binds. In one line each:

| id | what it settles | binds |
|---|---|---|
| S2-A | the route registry SHIPS in `supabase/functions/_shared/`; its arm reads file names only, and the generated route tree is dropped with its reason | step 15 |
| S2-B | the catalog declaration lives TEST-SIDE beside `_source-scan.ts`, which narrows decision E's word "shipped" with a stated reason; its consumer is `at00121` | step 16 |
| S2-C | the loop fixture's Data API mirror MUST gain slice 2's branches, mirroring the SQL statement by statement rather than delegating | step 17 |
| S2-D | `dataApiRead` widens to `Session \| null` so AT-001.24 can express the visitor who never signed in | steps 14, 17 |
| S2-E | gate-2 ruling 4's vacuous-pass guard binds every new body slice 2 writes | steps 12-14 |
| S2-F | AT-001.40's reach is attributable through the NON-ADMIN control; no product surface gains a field for a test's convenience | step 13 |
| S2-G | step 18's list re-measured against the tree: one target already done, two outstanding, three NEW (two of them mine), and two deliberately not touched | step 18 |
| S2-H | what the draft executor runs, and the five things it never does | every step |

**Two of S2-G's targets are my own findings, not the plan's and not a reviewer's.**
`visibility.ts` lines 147-149 said the platform-admin branch carries no test - true of the slice that
landed the module, false the moment AT-001.40 lands beside it. And lines 100-107 said the grant basis
is what makes AT-001.40's reach distinguishable, which is true of the unit selftest that reads the
basis and MISLEADING about AT-001.40, which cannot see it. Both are corrected, and both corrections
keep the original as history with the date it stopped being true.

## What landed

Six commits, `1978e21` through `c82363b`, one per work item. **Fifteen code files.** The executor
built the commits in the order W1, W5, W6, W2-W4, W7, W8 so that no commit references a module that
does not yet exist - its own decision, and the right one.

- `supabase/migrations/20260813120000_tenant_visibility_volunteer_and_admin.sql` - the
  `viewer_is_platform_admin()` helper, the assigned-developer policy on `public.projects`, and the
  four platform-admin policies. OR'd onto slice 1's, replacing nothing.
- `supabase/functions/_shared/route-visibility.ts` - the shipped route declaration and its pure rule.
- `tests/at/suites/req-001/_route-scan.ts`, `_catalog-conformance.ts` - the two out-of-band arms.
- `tests/at/harness/shipped-route-visibility.selftest.ts`,
  `shipped-catalog-conformance.selftest.ts` - where both failure cases are EXERCISED rather than
  asserted.
- The three acceptance bodies at both tiers, the two adapters, the declaration, and six comment
  corrections.

## What I verified MYSELF, independently of the executor's report

Every one of these I ran or read first-hand:

- `bun run typecheck` - exit 0, "typecheck OK: both configs clean"
- `bun run at:check req-001` - exit 0, "37 P0 ids in bijection"
- `bun run at:verify req-001 --tier loop --expect` - **exit 0, 26 green / 11 red, EXACT MATCH**, with
  AT-001.23, .40 and .24 green AND AT-001.21 and .22 still green in the same run
- `bun run at:selftest` - exit 0, **16 files / 368 tests**, up from 14 / 353
- **The changed-file list is exactly 15 code files.** No `src/`, no `supabase/config.toml`, no
  `.claude/`, no `.github/`, no `package.json`.
- I read the migration against the schema the earlier migrations create and confirmed each fact it
  turns on: `public.account_type` is an enum carrying `platform_admin`; `public.accounts.id` IS the
  auth user's id, so `a.id = (select auth.uid())` is the right key; `public.projects` really carries
  `assigned_volunteer_id uuid references public.accounts (id)`. The `::public.account_type` cast is
  required under the empty search path and is present.
- I read every other diff against the dictation that produced it, and every vacuous-pass site in
  both files.

**THE INTEGRATION TIER WAS NOT RUN AND THIS GREEN CLAIMS THE LOOP TIER ONLY.**

## Where a dictation met the code - three, all reported rather than picked silently, all ruled

**[a] A tenant key is a LIST of columns, not one. ACCEPT AS LANDED, and the discrepancy was MINE.**
Gate-1 ruling 8's clause 3 says "that table's declared tenant key column", singular. It was written
when `public.projects` had one tenant rule. Slice 2 gives it two by design - `org_id` for the
organisation branch and `assigned_volunteer_id` for the developer branch - because gate-1 ruling 7
splits the policy set by BRANCH. A single-column declaration would force one of two correct shipped
policies to be declared wrong, and the arm would then fail against a correct database. That is
exactly the failure mode gate-1 addition B exists to prevent on clause 2, on clause 3 instead.

**[b] The conformance rule is exported TWICE. ACCEPT AS LANDED; the contradiction was MINE.** S2-B
named one function AND required the selftest to drive "a table declared in BOTH lists". Those cannot
both hold: `DECLARED_CATALOG` has no overlap and must never gain one, so with the declaration fixed
no `catalog` argument can reach that branch - leaving a defensive branch nothing drives, which
gate-2 ruling 5 records that this repository has learned to distrust. The executor kept
`catalogConformanceProblems(catalog)` with the dictated signature as the entry point the acceptance
body calls, and added `catalogProblemsAgainst(catalog, declaration)` so the failure case is
exercised. Step 16's own done-criteria point that way, and S2-B makes this module test-side, so no
product surface widened.

**[c] S2-A's layout rule is STRICTER than the router's documented convention. THE DICTATION STANDS.**
`src/routes/README.md` documents `_layout.tsx` - a single underscore - as a layout too, and S2-A
exempts only `__`. So a future `_layout.tsx` would need a declaration. That is the fail-closed
direction: an unclassified file fails and a person decides what it is, rather than being silently
exempt on a naming convention - which is the exact weakness `_source-scan.ts` already records about
naming oracles. No such file exists today, so it costs nothing now. The executor implemented as
dictated and reported the divergence, which is what it should have done.

## One step-18 target the executor found that S2-G did not name - CONFIRMED

`_integration.ts`, AT-001.17's arm 2, said `public.org_memberships` is "granted to no client role at
all". False since 2026-08-12: `authenticated` is a client role and holds `select`. It is the same
defect class as S2-G's target 3, it was surfaced by S2-G's own extended search doing its job, and a
knowingly false stated fact must not pass through a gate. Corrected to the narrower fact the arm
actually asserts, keeping the original as history with its date.

## A measurement trap worth carrying forward

The previous sitting recorded that a checkout rewrites a prompt to carriage-return-line-feed, so the
BYTE COUNT is not the instrument for deciding a prompt is intact. There is a second, distinct trap on
the same file and this sitting hit it: **PowerShell 5.1's `Get-Content -Raw` reads with the system
ANSI codepage**, so it reported ZERO em-dashes and ZERO replacement characters in a file full of
em-dashes. Zero of both is self-contradictory, which is what gave it away. Re-measured with
`[System.IO.File]::ReadAllText(path, [System.Text.Encoding]::UTF8)`: **29 em-dashes, 0 replacement
characters, and the two prompt files byte-identical at 15776 bytes each.** Use the explicit
UTF-8 reader.

---

# 3. CAPS USED BY THIS SITTING

- **Executor invocations: 1 of 3.** One build pass, zero corrective iterations. No fix loop ran.
- **Mechanical invocations: 0.**
- Integration-tier attempts: **0 this sitting.** The single attempt from slice 1's draft sitting
  stays spent.
- Continuous-integration flake re-run: **unused.** Audit re-run: **unused.**

**The running total across the item, so the count stays auditable:** slice 1's draft sitting used 2
of its 3, slice 1's fix-and-goal sitting used 1 of its 3, this sitting used 1 of its 3. The
terminated resume-sitting's invocation was ruled not-chargeable by that sitting and no sitting since
has reopened that ruling. **Caps are PER SITTING** - the next sitting opens with three of its own.

---

# 4. WHAT COMPLETES THE NEXT PHASE - SLICE 2's CODE GATE

**The next phase is slice 2's code gate, and the two prompt files are written, committed and ready
to hand out AS WRITTEN:**

- `loop/items/AI4DEV-66/gate2-slice2-terra-prompt.txt`
- `loop/items/AI4DEV-66/gate2-slice2-flash-prompt.txt`

Two readers, each launched by its own reviewer-runner, each handed ONE prompt file as written. The
two files are **byte-identical by design** - verified at 15776 bytes each with the UTF-8 reader
above, not with the byte count alone. Assembled per `.claude/skills/work/reviewers.md`: its
`## Your contract` section, the DRAFT CODE review section only, and this item's additions. **The
`**Pins**` block is NOT in either file** - checked, zero occurrences - and neither file mentions any
other reader or any other review stage. Additions are additive only: eleven attack directions, eight
claims to refute, and eight stated non-claims offered for attack rather than as exemptions.

**The change-set the prompts pin:**

```
git diff 64e4ef7afc4a422bb99ed8c408ca26261a9f802f c82363bba1ae09d71b64c7c32f57ce2c21d9df13 -- supabase tests
```

Fifteen files. The prompts tell each reader that steps 1-10 landed before the base commit and are
context rather than work under review.

**ONE PROPERTY OF THIS SETUP, STATED PLAINLY RATHER THAN GLOSSED.** The prompts instruct each reader
to read `plan.md` first, and `plan.md` names ruling numbers from earlier review stages. So a reader
that follows the instruction learns those stages exist. This is the condition `reviewers.md` already
names - slicing removes the DEFAULT exposure, not the possibility, and the plan is a document the
reviewer is positively instructed to read. Slice 1 ran under the identical condition. Nothing in
either prompt points at a rulings file, and no reader is told the other exists.

## What the sitting after the gate must know

1. **Rule every finding from BOTH readers, then amend, then push the rulings BEFORE any code
   change.** A convergence between the two is the strongest signal a blind panel gives and is ruled
   once, under both claims.
2. **Three integration-tier done-criteria are BLOCKED, not met, and no ruling may quietly convert
   them.** Step 11's migration proof (the slot evidence line, which does not exist), step 16's third
   criterion (the arm passing on the real list), and step 17's both-tiers exact match. The loop half
   of step 17 IS met and exact.
3. **The audit comes after slice 2's gate is ruled and its fixes are landed** - it is per ITEM, not
   per slice, and it re-runs at most once. Its claim checklist must carry BOTH slices' adopted
   rulings, the path-set of BOTH slices plus the ride-along, and every stated fact about the code
   from both.
4. **`main` has moved to `160042c`.** Neither of its two commits touches any file this branch
   touches, and neither touches `.claude/agents/reviewer-runner.md`, so the ride-along will not
   conflict. The branch has not taken main in. **The merge sitting decides whether to merge main in;
   no sitting before it should.** One of those commits changed
   `.claude/skills/work/shared-invariants.md`, which binds every role - **read the current version,
   not a remembered one.** This sitting did, and the 85-percent usage line it now carries is in it.
5. **The sitting sequence for this item is now:** plan → draft (slice 1) → fix and goal (slice 1) →
   draft (slice 2) → **fix and goal (slice 2)** → audit → merge.

---

# 5. STANDING ITEMS THE MERGE RULING MUST CARRY

## The pull request body, for the mechanical who writes it at merge

The pull request closes **AI4DEV-66** through its own branch link. **The partner item closes through
the one sanctioned batch line**, per `CLAUDE.md` and the reference guard in `.github/workflows/ci.yml`:

- one line, of exactly the shape `Closes AI4DEV-67`, alone on its line, nothing else on it;
- at most one such line in the whole body;
- **it is added by the MERGE ruling's mechanical, not before**;
- **and gate-1 ruling 3 makes it CONDITIONAL**: the line is added **only if** the founder has
  answered open question 1 - by ratifying a D5 wiring leaf for the screens the way D2 has one, or by
  ruling AT-001.24's browser half out of that item. **With no founder answer the line is OMITTED**,
  the partner item stays open, and the merge ruling states why.
- No other item id may appear anywhere in the title or body. Name other items in words.
- The body lists the ride-along under "rides along".

## The two open questions for the founder - still unanswered

1. **AT-001.24 asks for a browser behaviour this pull request is forbidden to build.** CI fails any
   change touching both `src/` and this change's territory, there are no screens to guard, and D5.L2
   has no wiring leaf the way D2 does. **Proposed:** land the decision and the API-level denials
   here, declare the id capability-pending at integration tier, and file a D5 wiring leaf. The
   founder may instead prefer to hold AT-001.24 out of that item entirely.
   **Slice 2 has now built exactly what that proposal describes**, so the question is live rather
   than hypothetical: AT-001.24 is green at loop tier on the shipped decision and refuses at
   integration tier with `ui.logged-out-surface-rendering`.
2. **Most of the data the criteria enumerate does not exist.** Drafts, ledger, files, thread and
   tasks belong to requirements that have not landed. **Proposed:** isolate every kind that does
   exist, land the catalog conformance arm so a later requirement's table cannot arrive unisolated,
   and name the absent kinds in the merge ruling. **The arm is now built** - and it has never seen a
   real catalog, which section 1 covers.

Neither blocked either code gate. Both must be answered before the partner item can close.

## Residuals for the merge ruling

Carried from slice 1, with slice 2's added:

1. **Timing is not defended.** The claim is about response content and status, never response time.
2. **AT-001.21 and AT-001.22 are `ui`-tagged, not UI-proved.** No screen exists.
3. **Only the dashboard kind of tenant data exists.** Drafts, ledger, files and thread do not.
4. **The public project surface reveals that a project exists**, deliberately - the criterion's own
   carve-out, kept in its own function so it cannot contaminate the no-oracle test.
5. **RETIRED BY SLICE 2.** `visibility.ts`'s platform-admin branch now has a unit oracle AND an
   acceptance test driving it through a surface at both tiers - AT-001.40. The residual as written no
   longer stands, and the comment that stated it is corrected.
6. **RETIRED BY SLICE 2.** `publicSchemaCatalog` now has a consumer: `at00121`'s catalog conformance
   arm. It has never run, which is section 1's problem rather than this one.
7. **The read-fault arm is loop tier only.** No fault is injected into a real database.
8. **The loop-tier Data API arms grade the fixture's MIRROR of the policy set, not the migrations.**
   Item claim 1 - "a green grades shipped code rather than a copy of it" - holds for the edge-surface
   arms and NOT for the probe arms at loop tier. The mirror now predicts TWO migrations rather than
   one, so the exposure is wider than it was at slice 1's close.
9. **The `readRows` fix is proved by reading, not by a test.** No test program imports `edge.ts`.
10. **The four Data API positive controls are a BRACKET, not a proof.**
11. **NEW - nothing imports the route registry and no router obeys it.** It is a declaration in
    product code plus a test that fails when a route arrives undeclared. It is not a redirect that
    runs.
12. **NEW - the catalog conformance arm does not prove a declared predicate is CORRECT.** It proves a
    table is declared, reachable only as declared, and not trivially open. `using (org_id = org_id)`
    would satisfy it.
13. **NEW - the catalog selftest's "real shaped catalog" is a HAND-WRITTEN PREDICTION** of what the
    two migrations leave in `pg_policies`, including the deparsed `qual` strings. Only the
    integration tier grades that prediction.
14. **NEW - a request carrying no `Authorization` header is not expressible against the two
    authenticated functions.** Both declare `verify_jwt = true`, so AT-001.24 drives them with a
    session that has ended, and the body names the residual itself.
15. **THE INTEGRATION TIER HAS NOT RUN.** Section 1. This is the one that blocks merge.

## Rides along

**One line in `.claude/agents/reviewer-runner.md`** (gate-2 ruling 8, commit `50d0baa`, landed in
slice 1). That file told the runner to report any tool outside `read`, `glob` and `grep` as an
INVALID RUN, while `.opencode/agent/reviewer-flash.md` grants `gitdiff: true` deliberately. `gitdiff`
is now on the list with its reason. **Named in `plan.md` under "Rides along", and it must be named in
the pull request body and in the audit brief's path-set.** Slice 2 added no ride-along of its own.

## Filing candidates for the founder - suggestions only, at close-out

The coordinator suggests filings at close-out and **only the founder creates items.**

1. **Six pre-existing vacuous-pass seams**, of the form
   `expect(x).toMatchObject({ok:true}); if (!x.ok || x.organizationId === null) return;` -
   `c-membership-and-acknowledgment.test.ts` 106, 189, 364; `f-lifecycle-and-audit.test.ts` 69;
   `_integration.ts` (now 1013 and 1066, after the file grew). They predate this change at
   `926d170`. This item guarded the nine it ADDED - six in slice 1, three in slice 2 - and left these
   alone deliberately.
2. **`_bind.ts` line 31 says "the 33 not-yet-landed ids"** - stale before this item, and now stale by
   22. Not this item's mess; a drive-by fix would widen the diff outside what the item claims.
