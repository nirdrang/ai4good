# PHASE-STATE — AI4DEV-62 (per-org roles and membership isolation), batch with AI4DEV-63 (single seat, single developer)

**Phase: PLAN COMPLETE — the next event is gate 1, the plan review.** Written by the plan
sitting, orchestrator on fable @ xhigh, 2026-08-11. Chain, derived from the branch:
`AI4PM-19 (auth and org membership)` > `AI4DEV-50 (auth root)` >
`AI4DEV-53 (org membership and seats, container)` > `AI4DEV-62 (per-org roles and isolation)`.
The batch partner `AI4DEV-63 (single seat, single developer)` hangs under the same container and
rides this branch; the founder typed both ids into /work, which is the batch confirmation.

## What happened this sitting

1. `loop/items/AI4DEV-62/plan.md` — the plan for BOTH items: ten facts established against the
   tree by pointer, thirteen decisions, nine steps each with a done-criterion, and the expected
   verification state per acceptance id (five ids green at BOTH tiers; exact counts stated).
2. `loop/items/AI4DEV-62/gate1-prompt.txt` — assembled per the reviewers file: the contract,
   the plan-review section without its pins block, and this item's additive section (file list
   plus nine added attack directions).
3. `loop/items/AI4DEV-62/pr-body.md` — the pull-request body handed to a mechanical to open the
   pull request (non-closing references only; the sanctioned closes-line for the partner is
   deliberately NOT in it yet).
4. This state file.

## What completes the next phase

**Gate 1:** one reviewer-runner per the reviewers file's plan-review pins, subject
`loop/items/AI4DEV-62/plan.md` at this branch head, prompt `loop/items/AI4DEV-62/gate1-prompt.txt`,
raw output and distillate into `loop/items/AI4DEV-62/artifacts/`. Then the DRAFT sitting:

1. Rule EVERY gate-1 finding (removals carry a verification condition).
2. Amend `plan.md` — the amended plan is what gets built; commit and push rulings and amendment
   BEFORE any code changes.
3. Spawn the executor for the draft pass: plan steps 1–8, typecheck and build green, the verify
   suite deliberately NOT run.
4. Write the two gate-2 prompts (per slice, per pinned model — the plan slices along the item
   boundary, decision D11) and the state file.

## Facts the next sitting needs

- Base: `ea4f345` (main at pickup). Reserved database slot: **2**, reserved under the primary;
  the one slot serves the pair — do not reserve another.
- The five ids and their call sites: AT-001.16/.36/.37/.17 in
  `tests/at/suites/req-001/c-membership-and-acknowledgment.test.ts` (lines 15–21), AT-001.32 in
  `tests/at/suites/req-001/f-lifecycle-and-audit.test.ts` (line 20).
- The pull request is opened by this sitting's mechanical after the closing push; its number is
  in the conductor report, not in this file (the file rides the head that precedes it).
- **Open task for a later sitting:** the sanctioned `Closes AI4DEV-63` line is NOT in the
  pull-request body yet. It must be added before the merge ruling declares it — the plan sitting
  opens with non-closing references only.
- Verify-first candidates are already marked inside plan steps 5 and 7 (trigger under operator
  SQL, trigger-versus-foreign-key ordering, the service-role grant necessity, refusal error
  shapes over operator SQL, the absent-function probe shape). Gate-1 findings may add more.
- The plan's stated open risk: the loop fixture models the new database semantics by hand; the
  goal loop's two tiers are the mitigation. A gate-1 attack direction covers it.

## Open questions

None for the founder. Nothing contradicts ratified text and there is no scope growth.
