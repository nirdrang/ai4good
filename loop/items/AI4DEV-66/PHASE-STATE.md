# PHASE-STATE - AI4DEV-66 (cross-org denial, no existence oracle), batch with AI4DEV-67 (assigned volunteer, admin, stranger)

**Phase: SLICE 1 IS BUILT AND ITS LOOP TIER IS GREEN. The next event is the CODE REVIEW GATE on
slice 1's diff - two readers, each handed its own prompt file as written.** There is also an
INFRASTRUCTURE BLOCK that must be cleared before this item can merge; it is stated in full below
and it is not a defect in this item's work.

Written by the DRAFT sitting, orchestrator on **opus @ max**, 2026-08-13. This sitting was a RESUME
after an earlier executor was stopped mid-work.

## THE MODEL RULING FOR THIS RUN - CARRY IT FORWARD

The founder ruled (relayed 2026-08-12, restated to this sitting 2026-08-13) that **every
orchestrator sitting of this item runs as `orchestrator-opus` at opus/max effort** - plan, draft,
fix-and-goal, and the FIRST audit - not only the merge and audit-re-run sittings that are opus by
design. This is a deliberate founder choice for this run. It is **not** a sign that fable has no
credit. The conductor spawns every subsequent sitting of this item the same way, and every state
file repeats this paragraph.

## Attribution, derived from the branch

Branch `nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`, cut from
`origin/main` at `948d4f0`.

`AI4PM-19 (auth and org membership)` > `AI4DEV-50 (auth root)` >
`AI4DEV-55 (tenant isolation and visibility)` > `AI4DEV-66 (cross-org denial, no existence oracle)`.

`AI4DEV-67 (assigned volunteer, admin, stranger)` rides this branch. It is the manifest's D5.L2,
blocked by D5.L1, which is why the two are batched.

**Database slot 1**, reserved under this item, covers both.

Pull request **#57** is OPEN (`https://github.com/nirdrang/ai4good/pull/57`). Measured this sitting:
its body names `AI4DEV-66` once and no other item id, so the reference guard has nothing to fail on.

---

# 1. THE INFRASTRUCTURE BLOCK - READ THIS BEFORE ANY MERGE DECISION

**Database slot 1's local stack is DOWN. The integration tier has never run at any head of this
branch, so half of this item's verification evidence does not yet exist.**

The founder relayed the cause: the gateway container cannot bind its API port (Windows has it
reserved) and the edge-function container fails to mount its entry file. **Only the founder can
clear this.**

The run was attempted **exactly once**, by my ruling, and refused before any test executed. The
runner's own words, from `artifacts/integration-attempt.txt`:

```
at:verify req-001 --tier integration — INFRASTRUCTURE: slot 1 could not be prepared: slot 1
reported no running stack (the stack reports stopped services: supabase_kong_ai4good-slot-1,
supabase_edge_runtime_ai4good-slot-1 — start them before running the suite), so nothing was
reset and nothing was run
```

Exit code 3. Zero tests. **No slot evidence line exists to carry, because the run never reached the
reset.**

**MY RULINGS ON IT, WHICH BIND THE SITTINGS AFTER THIS ONE:**

1. **This is a machine fault, not a red on this item's work.** It is the class the orchestrator
   contract calls "the check cannot be obtained right now". Nothing about it is debuggable here.
2. **NO REMEDIATION.** No container is to be started, stopped, rebuilt or reconfigured by any role
   inside this item; no port changed; no `supabase/config.toml` edit; no `AT_DB_SLOT` override; and
   **`supabase db reset` is never run, directly or through any wrapper** (gate-1 ruling 10).
3. **ONE ATTEMPT IS SPENT.** Do not re-run the integration tier speculatively. Re-run it when the
   founder says the stack is up, and not before.
4. **THIS IS A HARD MERGE BLOCKER.** The merge ruling must state both tiers' exact-match results,
   and the integration half does not exist. **A merge ruling written on the loop tier alone would
   be claiming a green that was never obtained.** The required continuous-integration check cannot
   supply the missing half either - it holds no database slot.

**What the integration tier still owes, enumerated in `artifacts/verify-first-answers.md`:** the
plan's step 6 privilege-posture measurement (never made - the file records that plainly and invents
no result), AT-001.21 and AT-001.22 green at integration tier, and first proof that the migration
applies and the three deployed functions serve at all.

---

# 2. WHAT THIS SITTING VERIFIED, BEFORE IT SPAWNED ANYTHING

The conductor's resume note said steps 1, 2 (partial), 4, 5, 7 and 8 were shipped. **I measured the
tree instead of accepting that, and the note was wrong in one place: step 2 was not partial, it was
entirely unstarted.** The `_contract.ts` change was step 1 and the `_fixture.ts` change was step 8.

State at `d188557`, the head I inherited:

| step | state as measured | evidence |
|---|---|---|
| 1 extend the system-under-test surface | shipped | six new members and their types present; typecheck exit 0 |
| 2 AT-001.21's two bodies | **unstarted** | `d-tenant-isolation.test.ts:14` still the one-argument `notLanded` form |
| 3 AT-001.22's two bodies | **unstarted** | same file, line 16 |
| 4 `visibility.ts` | shipped, correct | relative imports only, no `Deno`, all three exports as decision A and B state |
| 5 slice 1's migration | shipped, unproved | dictated helper posture present, four `select` policies, no `using (true)`, nothing to `anon` |
| 6 privilege-posture measurement | **unstarted** | the artifacts file did not exist |
| 7 three edge functions and config | shipped, unproved | target row read LAST in both authenticated surfaces; the refusal is RETURNED, never thrown |
| 8 loop fixture backing | shipped, unproved | `readFaults` in `interface State`, cleared in `teardown` |
| 9 live adapter backing | **unstarted** | `_live.ts` untouched |
| 10 move the declarations | **unstarted** | `_pending.ts` and `tests/at/expected/req-001.json` untouched |

Baseline before any new work: `at:check` exit 0, loop tier exact-match exit 0 at 21 green / 16 red.

---

# 3. THE CAP RULING

**The stopped executor invocation is NOT charged.** The orchestrator contract's cap is written per
sitting - "three invocations per sitting" - and that invocation belonged to a different sitting
which was terminated from outside. The shared invariants price an interrupted sitting in **work
items, not invocations**: that is the stated reason the executor commits one commit per work item.
Charging an externally-terminated invocation would spend a judgment budget on a machine event.

This sitting therefore opened with three and used **two**.

---

# 4. WHAT THIS SITTING PRODUCED

Slice 1 is complete in code. Plan steps 2, 3, 6, 9 and 10 landed across six commits:

| commit | what |
|---|---|
| `33d1f09` | AT-001.21's two bodies (step 2) |
| `843b016` | AT-001.22's two bodies (step 3) |
| `e2426f5` | the live adapter backing (step 9) |
| `4dfe53c` | the declarations moved (step 10) |
| `b247772` | two stated facts this slice made false, corrected |
| `ba21dcf` | the one integration attempt, and the measurement that could not be made (step 6) |
| `46de446` | the read-fault arm on `organization-dashboard` |

**Verified by me, independently of the executor's report**, at `46de446`:

- `bun run typecheck` - exit 0, both configs clean
- `bun run at:check req-001` - exit 0, 37 P0 ids in bijection
- `bun run at:verify req-001 --tier loop --expect` - **exit 0, 23 green / 14 red, exact match**,
  with AT-001.21 and AT-001.22 both green
- `bun run at:selftest` - exit 0, 13 files, 344 tests (executor-reported; not re-run by me)
- `bun run at:verify req-001 --tier integration --expect` - **exit 3, INFRASTRUCTURE, zero tests**

Two gate-1 rulings I checked line by line rather than taking on report:

- **ruling 5** - `callFunction` is untouched at `_live.ts:341`; `callFunctionRaw` at line 362 is a
  genuine sibling that keeps the response bytes.
- **ruling 9** - `dataApiGet` at `_live.ts:433` carries `apikey: slot.anonKey` **and** the caller's
  own `Authorization: Bearer` token.

**And the fault arm cannot pass vacuously**, which I establish here by reasoning rather than by
spending an invocation on a mutation run: if `failNextReadOf` were a no-op, the faulted read of a
real foreign target would be an ordinary tenant refusal at status 404, and the arm's
`expect(faultedForeign.status).toBe(502)` fails. A silent fault injector is therefore caught by the
arm itself. The code-review gate is free to attack this reasoning.

## The one plan amendment I made this sitting

The amended plan puts comment corrections in step 18, which belongs to slice 2. **Two of them are
falsified by SLICE 1's own change**, so I moved them into slice 1: `_live.ts` lines 709-712 (which
said `public.projects` reaches no Data API role, untrue once slice 1 grants `select` on it to
`authenticated`) and the header of `supabase/functions/_shared/edge.ts` (which said "both edge
functions"). Gate-1 ruling 11 already dictated the remedy for the first; I moved it earlier, into
the slice whose change causes it. A knowingly-false stated fact must not pass through a review gate.

## The one finding I accepted from the executor and sent it back for

The executor reported that the read-fault arm sat only on `project-workspace`, which makes two
reads, while `organization-dashboard` makes four with **three** of them preceding the target - so
moving `organization-dashboard`'s target read earlier would have been caught by no test at all.
That leaves the plan's own step 8 done-criterion unmet on the surface AT-001.21 is actually about.

**Accepted.** I sent the executor back once for a single work item: the equivalent arm on
AT-001.21's loop body, faulting all four stores in turn, the target's own store included. It landed
in `46de446` and the loop tier stayed green.

## Six more executor observations, each ruled

1. **`edge.ts` importer count is six, not five** - my figure in the instruction was wrong; the
   executor measured and used six. **Accepted; the error was mine.**
2. **`timeoutMs: { integration: INTEGRATION_TIMEOUT_MS }` added to both registrations** - not the
   plan's literal text. **Accepted:** the plan's own fact 13 states `opts` carries an optional
   per-tier `timeoutMs`, every other live body carries the same raise, and it is per tier so the
   loop tier keeps vitest's value.
3. **AT-001.22's positive control runs first, not last as step 3's list has it** - **accepted.**
   Decision G ("the allowed read comes first") is the binding rule; step 3's list is an enumeration
   and, unlike step 2's, does not say "in this order".
4. **`tenantRead` in `_live.ts` hands back the parsed wire object with only `ok` removed, rather
   than a projection rebuilt field by field** - **accepted, and it is the right call.** A rebuild
   would make AT-001.22's "no `organizationId`, no `assignedVolunteerId`" assertion a statement
   about the rebuild, and it would pass however much the deployed function leaked. Recorded here so
   both code readers see it as deliberate.
5. **`publicSchemaCatalog` ships live-backed with no test consuming it in slice 1** - **accepted as
   a named residual.** The arm that consumes it is slice 2's step 16. Named in the gate prompt.
6. **`_bind.ts` line 31 says "the 33 not-yet-landed ids"** - stale before this item by 17 and now
   by 19. **Correctly left alone.** It is not this item's mess and a drive-by fix would widen the
   diff outside what the item claims. **Filing candidate for the founder**; the coordinator suggests
   filings at close-out and only the founder creates items.

---

# 5. WHAT COMPLETES THE NEXT PHASE - THE CODE REVIEW GATE ON SLICE 1

**Two readers, each launched by its own reviewer-runner, each handed one file AS WRITTEN. Neither
prompt may be edited, and nothing may be appended to either.**

| reader | prompt file |
|---|---|
| reader one, per the pins in `.claude/skills/work/reviewers.md` | `loop/items/AI4DEV-66/gate2-terra-prompt.txt` |
| reader two, per the same pins | `loop/items/AI4DEV-66/gate2-flash-prompt.txt` |

The two files are **byte-identical by design** - same hash, verified. The readers differ, the
prompt does not. Raw output and distillate into `loop/items/AI4DEV-66/artifacts/`.

The phase completes when both runners report their distillates, or report a gate as empty. **An
empty output is never a clean gate.**

**How the prompts were assembled**, recorded so a later sitting can check it rather than trust it:
`## Your contract` (lines 64-127 of `reviewers.md`) + the `## The DRAFT CODE review` heading + that
section from `**Subject**` onward (lines 175-191) + this item's additions. **The Pins block was
dropped as a block**, per the assembly rule. Measured on the finished files: no byte-order mark, 77
non-ASCII bytes, 24 em-dashes, **zero replacement characters**, zero occurrences of "Pins", zero
references to any other gate, and zero references to any peer reader. 208 lines, 13294 bytes **as
written, with line-feed endings**.

**A note on line endings, so a later byte count is not read as corruption.** This repository sets
`core.autocrlf=true` and `.gitattributes` pins only shell and Docker files to line feeds, so a
checkout rewrites these two prompts to carriage-return-line-feed and their size becomes 13502
bytes. That is the platform doing what it does, not damage: `gate1-prompt.txt` sits in this same
worktree with 209 such endings and the reviewer that read it returned eleven findings. Nothing
executes these files, so either ending is safe. Re-measure the em-dash and replacement-character
counts, never the byte count, to decide whether a prompt is intact.

The additions are additive only - more files, more risks, more context. They add the change's
identity and diff command, the six claims the item makes, seven extra attack directions, the two
tier conditions, and the seven things the item already says it does not prove.

**The pinned change-set for both readers:**

```
git diff 926d170d5af6becb1f371e36c4b8099caa131429 46de446c0e203f36bc098b852c7ed1cd7355fc0b -- supabase tests
```

Fourteen files. Later commits on this branch touch `loop/items/` only.

## After the gate: the FIX AND GOAL sitting

It rules every finding from **both** readers - a clean seat beside a seat with findings is evidence,
never a veto - pushes the rulings before any code changes, then sends the executor to apply them. It
opens with its own three invocations. **It cannot reach the plan's step 9 or step 10 done-criteria
while the stack is down**, so unless the founder has cleared the infrastructure block by then, that
sitting closes with the block restated rather than with a false claim of completion.

Slice 2 (plan steps 11-18, `AI4DEV-67`'s three ids) has not started and must not start before slice
1's gate is ruled.

---

# 6. STANDING ITEMS THE MERGE RULING MUST CARRY

## The pull request body, for the mechanical who writes it at merge

The pull request closes **AI4DEV-66** through its own branch link. **AI4DEV-67 closes through the
one sanctioned batch line**, per `CLAUDE.md` and the reference guard in `.github/workflows/ci.yml`:

- one line, of exactly the shape `Closes AI4DEV-67`, alone on its line, nothing else on it;
- at most one such line in the whole body;
- **it is added by the MERGE ruling's mechanical, not before**;
- **and gate-1 ruling 3 makes it CONDITIONAL**: the line is added **only if** the founder has
  answered open question 1 - by ratifying a D5 wiring leaf for the screens the way D2 has one, or
  by ruling AT-001.24's browser half out of that item. **With no founder answer the line is
  OMITTED**, the partner item stays open, and the merge ruling states why.
- No other item id may appear anywhere in the title or body. Name other items in words.

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

Neither blocks the code gate. Both must be answered before the partner item can close.

## Residuals for the merge ruling

1. **Timing is not defended.** The claim is about response content and status, never response time.
2. **AT-001.21 and AT-001.22 are `ui`-tagged, not UI-proved.** No screen exists.
3. **Only the dashboard kind of tenant data exists.** Drafts, ledger, files and thread do not.
4. **The public project surface reveals that a project exists**, deliberately - the criterion's own
   carve-out, kept in its own function so it cannot contaminate the no-oracle test.
5. **`visibility.ts`'s platform-admin branch carries no test in slice 1.** Slice 2 exercises it.
6. **`publicSchemaCatalog` is backed with nothing consuming it in slice 1.**
7. **The read-fault arm is loop tier only.** No fault is injected into a real database.
8. **THE INTEGRATION TIER HAS NOT RUN.** Section 1. This is the one that blocks merge.

## One tree fact a later sitting needs

`origin/main` has moved to `227d61f`, ahead of this branch's merge-base `926d170`. The branch has
not taken it. This does not affect the review diff; the merge sitting decides whether to merge main
in again.

---

# 7. CAPS USED

- Executor invocations: **2 of 3 this sitting.** The earlier stopped invocation is not charged - see
  section 3.
- Goal iterations inside those invocations: **1.** No fix loop ran; both new ids were green at the
  loop tier on the first diagnostic run.
- Audit re-run: **unused.**
- Continuous-integration flake re-run: **unused.**
- Integration-tier attempts: **1, and it is spent.** Do not re-run until the founder says the stack
  is up.
