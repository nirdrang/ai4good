# PHASE-STATE - AI4DEV-66 (cross-org denial, no existence oracle), batch with AI4DEV-67 (assigned volunteer, admin, stranger)

**Phase: SLICE 1 IS BUILT, CODE-REVIEWED BY A TWO-READER PANEL, EVERY FINDING RULED, EVERY ADOPTED
FIX LANDED, AND ITS LOOP TIER IS GREEN. The next event is BUILDING SLICE 2 - the partner item's
three acceptance ids, plan steps 11-18.** There is also an INFRASTRUCTURE BLOCK that must be cleared
before this item can merge; it is stated in full below and it is not a defect in this item's work.

Written by the FIX AND GOAL sitting for slice 1, orchestrator on **opus @ max**, 2026-08-13.

## THE MODEL RULING FOR THIS RUN - CARRY IT FORWARD

The founder ruled (relayed 2026-08-12, restated to this sitting 2026-08-13) that **every
orchestrator sitting of this item runs as `orchestrator-opus` at opus/max effort** - plan, draft,
fix-and-goal, and the FIRST audit - not only the merge and audit-re-run sittings that are opus by
design. This is a deliberate founder choice for this run. It is **not** a sign that fable has no
credit. The conductor spawns every subsequent sitting of this item the same way, and every state
file repeats this paragraph.

## Attribution, derived from the branch

Branch `nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`, cut from
`origin/main` at `948d4f0`, merge-base with main today `926d170`.

`AI4PM-19 (auth and org membership)` > `AI4DEV-50 (auth root)` >
`AI4DEV-55 (tenant isolation and visibility)` > `AI4DEV-66 (cross-org denial, no existence oracle)`.

`AI4DEV-67 (assigned volunteer, admin, stranger)` rides this branch. It is the manifest's D5.L2,
blocked by D5.L1, which is why the two are batched.

**Database slot 1**, reserved under this item, covers both.

Pull request **#57** is OPEN and its head is this branch
(`https://github.com/nirdrang/ai4good/pull/57`). Its body names `AI4DEV-66` once and no other item
id, so the reference guard has nothing to fail on.

---

# 1. THE INFRASTRUCTURE BLOCK - READ THIS BEFORE ANY MERGE DECISION

**Database slot 1's local stack is DOWN. The integration tier has never run at any head of this
branch, so half of this item's verification evidence does not yet exist.** Nothing this sitting did
changes that.

The founder relayed the cause: the gateway container cannot bind its API port (Windows has it
reserved) and the edge-function container fails to mount its entry file. **Only the founder can
clear this.**

The run was attempted **exactly once**, by the draft sitting's ruling, and was refused before any
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
5. **GATE 2 ADDED A SECOND REASON TO THE SAME BLOCKER, not a new one.** Both code readers found that
   the loop-tier Data API arms grade the fixture's mirror of the policy set rather than the
   migration. The integration run is the only thing that grades that mirror. See gate-2 ruling 2.

**What the integration tier still owes, enumerated in `artifacts/verify-first-answers.md`:** the
plan's step 6 privilege-posture measurement (never made - the file records that plainly and invents
no result), AT-001.21 and AT-001.22 green at integration tier, first proof that the migration applies
and the three deployed functions serve at all, and now the grading of the fixture's policy mirror.

---

# 2. WHAT THIS SITTING DID

## The panel and the rulings

Two blind code readers ran on slice 1's diff and both landed with findings. **Seven findings, seven
adopted, zero rejected outright.** Everything is in `loop/items/AI4DEV-66/rulings-gate2.md`, with
every reviewer claim quoted exactly beside its ruling.

| reader | lane | pin | verdict |
|---|---|---|---|
| terra | codex | `gpt-5.6-terra`, effort max, read-only | `CODE REVIEW: 5 FINDINGS` |
| flash | opencode | `opencode-go/deepseek-v4-flash --variant max`, agent `reviewer-flash` | `CODE REVIEW: 2 FINDINGS` |

**The panel converged twice** - on the vacuous early-return seam and on the fixture-mirror scope
question. Each was ruled once, under both claims, and the convergence is recorded as the signal it
is.

**Two rulings adopt the defect while refusing the reviewer's remedy, and both refusals are written
out with reasons:**

- The `readRows` rejected-`fetch` escape is real and now closed by construction. **The reviewer's
  "existence oracle" characterisation is REJECTED in writing**: a transport failure cannot depend on
  whether the target row exists, and the divergence it found is keyed to the identifier the caller
  itself chose. What it actually is - a breach of the module's stated two-outcome contract and a
  disclosure of the internal REST URL - is enough to fix it, and the merge ruling must not inflate
  it into an oracle.
- The fixture-mirror remedy ("delegate to shipped code") is **REFUSED because applying it would make
  the fixture WRONG**: the SQL helper `viewer_is_org_member` admits any account holding a membership
  row, while `tenantReadAllowed` additionally requires an NGO account type. A volunteer holding a
  membership row is admitted by the policy and refused by the module. The fixture's membership-only
  filter is the CORRECT mirror of the SQL. The claim narrows instead.

**One finding is mine, and neither reader caught it.** `_fixture.ts:1474`, added by this change,
said the integration tier grades the prediction because "both tiers run at the goal step". That is
false at this head. Corrected in `dbd05d4`. The identical sentence at `_fixture.ts:1162` predates
this change at `926d170` and is deliberately untouched.

## What landed, and what I verified myself

Nine commits. `04c7c1d` carried the rulings and the evidence BEFORE any code change, so the judgment
survives an executor death. Then seven work-item commits `951e6d8`..`50d0baa`, then one dictated
comment edit `4af5c39`.

**Verified by me, independently of the executor's report**, at `4af5c39`'s parent state and after the
comment edit:

- `bun run typecheck` - exit 0, "typecheck OK: both configs clean"
- `bun run at:check req-001` - exit 0, "37 P0 ids in bijection"
- `bun run at:verify req-001 --tier loop --expect` - **exit 0, 23 green / 14 red, EXACT MATCH**, with
  AT-001.21 and AT-001.22 both green
- `bun run at:selftest` - exit 0, **14 files / 353 tests**, up from 13 / 344
- **The changed-file list is exactly the seven files the rulings name.** No `src/`, no migration, no
  `config.toml`, no `_live.ts`, no `_contract.ts`.
- I read every diff against the ruling that dictated it.

**The integration tier was NOT run this sitting and this green claims the loop tier only.**

## The evidence now in the record

`artifacts/gate2-terra.raw.txt`, `gate2-terra.distilled.md`, `gate2-terra.stderr.log`,
`gate2-flash.raw.txt`, `gate2-flash.distilled.md`, `gate2-flash.toolcalls.md`,
`gate2-flash.identity.md`.

**The launcher scratch was deleted, not committed**, per `.claude/agents/reviewer-runner.md`:
`gate2-terra.pid` (a handle, not evidence) and `gate2-terra.stdout.log` (byte-identical to the raw
file plus one trailing newline - measured, not assumed). Gate 1 left neither in the record either.

**The flash cage held and I checked it rather than trusting the runner:** 43 tool events - 16
`gitdiff`, 14 `read`, 13 `grep`. No `write`, `edit`, `patch`, `bash`, `task` or `webfetch`. The
identity extract matches the pin on all 27 assistant messages, zero mismatches.

## Rides along

**One line in `.claude/agents/reviewer-runner.md`** (gate-2 ruling 8, commit `50d0baa`). That file
told the runner to report any tool outside `read`, `glob` and `grep` as an INVALID RUN, while
`.opencode/agent/reviewer-flash.md` grants `gitdiff: true` deliberately - and this gate's own reader
used it 16 times. A runner obeying the letter would have discarded a valid review. `gitdiff` is now
on the list with its reason. The cage file itself is correct and is NOT changed. **Named in
`plan.md` under "Rides along", and it must be named in the pull request body and in the audit
brief's path-set.**

---

# 3. CAPS USED BY THIS SITTING

- **Executor invocations: 1 of 3.** One goal iteration inside it; no fix loop ran.
- **Mechanical invocations: 1**, for a comment-only edit whose every character I decided (the
  founder ruling of 2026-08-12 permits this; I verified the result as any change is verified).
- Integration-tier attempts: **0 this sitting.** The draft sitting's single attempt stays spent.
- Continuous-integration flake re-run: **unused.** Audit re-run: **unused.**

**The running total across the item, so the count stays auditable:** the draft sitting used 2 of its
3, this sitting used 1 of its 3. The terminated resume-sitting's invocation was ruled not-chargeable
by that sitting and this sitting does not reopen that ruling. **Caps are PER SITTING** - the next
sitting opens with three of its own.

---

# 4. WHAT COMPLETES THE NEXT PHASE - BUILDING SLICE 2

**This is my call and I am making it plainly: the next phase is slice 2's BUILD, not the audit.**

The plan's own "Proportionality and gates" section ratifies the structure: *"This item is SLICED. The
code gate runs twice, once per slice."* The audit is per ITEM, not per slice, and it re-runs at most
once - so auditing now, with the partner item's three acceptance ids unbuilt, would either audit an
incomplete item or spend the one audit re-run on ordinary new work. Slice 1's gate is ruled and its
fixes are landed, which is the condition the draft sitting set for slice 2 starting.

**So the sitting sequence for this item is:** plan → draft (slice 1) → fix and goal (slice 1) →
**draft (slice 2)** → fix and goal (slice 2) → audit → merge.

## The next sitting is a DRAFT sitting for slice 2

It builds plan steps **11 to 18** - `AI4DEV-67 (assigned volunteer, admin, stranger)`'s three
acceptance ids, AT-001.23, AT-001.40 and AT-001.24 - then writes the two gate-2 prompts for slice
2's diff. It opens with its own three executor invocations.

**WHAT IT MUST KNOW BEFORE IT PLANS A SINGLE STEP:**

1. **Several slice-2 done-criteria are UNREACHABLE while the stack is down.** Steps 11, 16 and 17
   are written against the integration tier. Step 16's catalog conformance arm reads the LIVE
   catalog and the loop fixture's `publicSchemaCatalog` deliberately THROWS, so that arm has no loop
   tier at all. **Build them; do not claim them.** That sitting closes with the block restated, not
   with a false claim of completion, exactly as this one does.
2. **Steps 12 to 15 ARE reachable at loop tier** - the three test bodies and the route registry with
   its conformance arm, which reads `src/routes/` out of band the way `_source-scan.ts` does.
3. **Slice 2's migration ships the branches slice 2 tests** (gate-1 ruling 7): the
   `viewer_is_platform_admin()` helper under decision C's dictated posture, the assigned-volunteer
   policy on `public.projects`, and the platform-admin policies. They are OR'd with slice 1's
   organisation-member policies, never replacing them.
4. **Gate-2 ruling 5 already retired part of one residual.** `visibility.ts`'s platform-admin branch
   now has a unit-level oracle in `tests/at/harness/shipped-visibility.selftest.ts`. That is NOT an
   acceptance test - the acceptance id that drives that branch through a surface is still AT-001.40,
   which is slice 2's. Do not let a later ruling read the selftest as the criterion being met.
5. **Slice 2 re-runs AT-001.21 and AT-001.22.** That is what proves the added policy branches broke
   no denial. If either goes red in slice 2, the added branch is the suspect.
6. **`main` has moved to `160042c`**, two commits ahead of the merge-base `926d170`. Neither commit
   touches any file this branch touches, and neither touches `.claude/agents/reviewer-runner.md`, so
   the ride-along will not conflict. The branch has not taken main in. **The merge sitting decides
   whether to merge main in again; no sitting before it should.** One of those commits changed
   `.claude/skills/work/shared-invariants.md`, which binds every role - **read the current version,
   not a remembered one.**

## The code gate for slice 2

Two readers, each launched by its own reviewer-runner, each handed one prompt file AS WRITTEN, the
two files byte-identical by design. Assemble per `.claude/skills/work/reviewers.md`: its
`## Your contract` section, the DRAFT CODE review section only, and the item's additions. Additions
are **additive only**. **No gate may learn another gate exists and neither reader may learn the
other exists.**

**One note on measuring a prompt file, carried forward because it saved a sitting once.** This
repository sets `core.autocrlf=true` and `.gitattributes` pins only shell and Docker files to line
feeds, so a checkout rewrites a prompt to carriage-return-line-feed and its byte count changes.
Re-measure the em-dash and replacement-character counts to decide whether a prompt is intact, never
the byte count.

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
2. **Most of the data the criteria enumerate does not exist.** Drafts, ledger, files, thread and
   tasks belong to requirements that have not landed. **Proposed:** isolate every kind that does
   exist, land the catalog conformance arm so a later requirement's table cannot arrive unisolated,
   and name the absent kinds in the merge ruling.

Neither blocked the code gate. Both must be answered before the partner item can close.

## Residuals for the merge ruling - updated by gate 2

1. **Timing is not defended.** The claim is about response content and status, never response time.
2. **AT-001.21 and AT-001.22 are `ui`-tagged, not UI-proved.** No screen exists.
3. **Only the dashboard kind of tenant data exists.** Drafts, ledger, files and thread do not.
4. **The public project surface reveals that a project exists**, deliberately - the criterion's own
   carve-out, kept in its own function so it cannot contaminate the no-oracle test.
5. **`visibility.ts`'s platform-admin branch has a UNIT oracle but no acceptance test in slice 1.**
   Narrowed by gate-2 ruling 5; slice 2's AT-001.40 is what exercises it through a surface.
6. **`publicSchemaCatalog` is backed with nothing consuming it in slice 1.**
7. **The read-fault arm is loop tier only.** No fault is injected into a real database.
8. **NEW - the loop-tier Data API arms grade the fixture's MIRROR of the policy set, not the
   migration.** Both readers found this. Item claim 1 - "a green grades shipped code rather than a
   copy of it" - holds for the edge-surface arms and NOT for the probe arms at loop tier. **I checked
   the mirror against the migration branch by branch and they agree at this head**, so the residual
   is not "the mirror may be wrong" but "nothing this branch can run proves the DATABASE behaves the
   way the SQL reads".
9. **NEW - the `readRows` fix is proved by reading, not by a test.** No test program imports
   `edge.ts`: a search over `tests/` finds one occurrence, in a comment at `_contract.ts:115`. The
   file uses `Deno.env` and `tests/at/tsconfig.json` includes `**/*`, so a selftest importing it
   would drag `Deno` into the strict acceptance program - the arrangement `edge.ts`'s own header
   states. **The merge ruling says this in these words rather than implying a test exists.**
10. **NEW - the four Data API positive controls are a BRACKET, not a proof.** They prove each policy
    is not universally denying and admits the rightful tenant. They do NOT prove a policy is keyed
    correctly; the denial arms and the unfiltered listing bracket that from the other side.
11. **THE INTEGRATION TIER HAS NOT RUN.** Section 1. This is the one that blocks merge.

## Filing candidates for the founder - suggestions only, at close-out

The coordinator suggests filings at close-out and **only the founder creates items.**

1. **Six pre-existing vacuous-pass seams**, of the form
   `expect(x).toMatchObject({ok:true}); if (!x.ok || x.organizationId === null) return;` -
   `c-membership-and-acknowledgment.test.ts` 106, 189, 364; `f-lifecycle-and-audit.test.ts` 69;
   `_integration.ts` 1001, 1054. They predate this change at `926d170`. This item guarded the six it
   ADDED and left these alone deliberately.
2. **`_bind.ts` line 31 says "the 33 not-yet-landed ids"** - stale before this item by 17 and now by
   19. Not this item's mess; a drive-by fix would widen the diff outside what the item claims.
