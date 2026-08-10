# PHASE-STATE — AI4DEV-80 (attribution by spawn tree)

**Phase: DRAFT COMPLETE, gate 1 ruled → next is gate 2 (the draft-code review, a panel of
two).** Written by the DRAFT sitting, orchestrator on fable (claude-fable-5 @ xhigh),
2026-08-11. Chain, derived from the branch: AI4DEV-4 (the work skill, bring-up root) >
AI4DEV-80 (attribution by spawn tree), label `attr:bringup`. Branch base: `ac8a235`.

## What completes gate 2

- TWO reviewer-runners, per the DRAFT CODE pins in `.claude/skills/work/reviewers.md`
  (reader one and reader two), each launched against the head this sitting reports, each
  blind to the other.
- Prompts — assembled, complete, hand each as is:
  - reader one: `loop/items/AI4DEV-80/gate2-terra-prompt.txt`
  - reader two: `loop/items/AI4DEV-80/gate2-flash-prompt.txt`
- Completing files: two distillates in `loop/items/AI4DEV-80/artifacts/` plus the runners'
  LANDED reports. Then spawn the FIX-AND-GOAL sitting with both distillates.
- Standing ruling (plan D10, ruling G1-1): this gate RUNS despite the `loop/`-only diff.
  The tightening is recorded; do not re-derive the skip.

## What the draft is

Six step commits S1–S7 (S4+S5 shared one, said in its message), draft head `a119c4e`, one
executor iteration, tree clean. The selftest (asserts A1–A14) has NEVER been executed —
syntax-checked only, by ruling G1-2. Gate 1 landed ten findings; ten rulings with claims
quoted are in `loop/items/AI4DEV-80/gate1-rulings.md`; the executor's one reported
deviation is ruled in plan section 8 (D-1, the recursive `subagents` scan — accepted).

## Facts the FIX-AND-GOAL sitting needs

1. Goal-pass order of operations: the closing block of plan section 5. The S3 commit that
   pins the pre-mechanism report for the RED capture is `0c1bbf7`.
2. The fixture gains W1 (the nested `workflows/wf_1` agent, plan S3, ruling D-1) — the
   drafted selftest predates it; the fix sitting implements it. It joins A1 and A3.
3. Predicted RED pattern: plan section 6 table — PASS = A4, A8, A14; every other assert
   FAILS. A deviation is reported, never silently adjusted around.
4. Audit brief (the audit is a panel of two): ADD `git diff <base>...<head> -- loop/work`
   to the enumeration instrument (the pinned source-only command enumerates nothing for
   this diff); scope box = the path-set in plan section 1. The claim checklist names
   rulings G1-1 through G1-10 and D-1 by id, the path-set, and the code facts stated in
   plan sections 3 and 8.
5. S8's delta note states both percentages WITH both denominators. At the draft head the
   numbers were: unattributed 70.6% → 67.7%; transcript files scanned 480 → 912;
   responses 26371 → 48658. S8 re-measures at the goal head.
6. Also measured on the real store: 2 agents ambiguous (two items in their own records),
   0 agents without a meta file.

## Open founder question — non-blocking, raise at or before the merge ruling

The board item expects the unattributed share to "drop sharply" as the headline evidence.
Measured at the draft head: the share moves 70.6% → 67.7%, because the 877 newly-visible
transcripts also enlarge the denominator, and because 19892 of 37610 branchless responses
sit in coordinator sessions on `main`, where the tree has nothing to hand down. The
mechanism itself works: 3764 responses across 14 items are newly attributed, and the
previous item's scoped view grows from 249 to 1935 responses with its full role table.
Question: does the founder accept the attribution numbers as the headline evidence, in
place of a sharp percentage drop? Gate 2 proceeds regardless; this shapes the merge
ruling only.

## At close — carry forward

- Two follow-ups are FILED IN WORDS, not built: the flash/opencode reviewer-spend join
  (scoped out by the item), and a one-sentence clarification in the conductor contract
  and the workflow that a derived gate SKIP is a floor an orchestrator ruling recorded in
  PHASE-STATE may tighten to RUN, never the reverse (ruling G1-1).
- No pull-request text names any item id but AI4DEV-80; other items appear in words only.

## Expectations that are not anomalies

- The required CI check takes the prose fast lane (guards run, TypeScript suite skipped) —
  expected for a `loop/`-only diff; this item's verification is the PowerShell selftest,
  run at the fix sitting.
- Pull request #52 is open and gates every push.

## Anomalies

- One executor shell read was denied by the permission classifier; the executor switched
  to the Grep tool, which the denial itself named. Ruled: compliance with the boundary,
  not a workaround — the switch was TOWARD the sanctioned instrument. No action.
- Two commit messages needed `git commit -F` instead of `-m` (Windows PowerShell 5.1
  mangles here-strings with double quotes when passing them to native executables).
  Mechanical fact, no action.
