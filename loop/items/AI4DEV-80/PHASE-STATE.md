# PHASE-STATE — AI4DEV-80 (attribution by spawn tree)

**Phase: PLAN COMPLETE → next is gate 1 (the plan review).** Written by the plan sitting,
orchestrator on fable (claude-fable-5 @ xhigh), 2026-08-11. Chain, derived from the branch:
AI4DEV-4 (the work skill, bring-up root) > AI4DEV-80 (attribution by spawn tree), label
`attr:bringup`. Branch base: `ac8a235` (origin/main at pickup).

## What completes this gate

- One reviewer-runner, sol via codex, per the PLAN review pins in
  `.claude/skills/work/reviewers.md`, launched against the head this sitting reports.
- Prompt: `loop/items/AI4DEV-80/gate1-prompt.txt` — assembled, complete, hand it as is.
- Completing file: `loop/items/AI4DEV-80/artifacts/gate1-sol-distillate.md` plus the runner's
  LANDED report. Then spawn the DRAFT sitting.

## What the plan is

`loop/items/AI4DEV-80/plan.md`. Substance: the report starts counting the agent transcripts
under `subagents/` (never scanned before — the largest measured gap), stops counting Temp
`.output` files (twins double-count, one background file inflates), builds the spawn forest
from the platform's `agent-*.meta.json` files (872 of 872 present), and propagates the item
down the tree for records that resolve no item themselves. Selftest with eight enumerated
asserts, written RED before the mechanism lands (plan step S3). Evidence: before/after runs
committed to the record (steps S1 and S8).

## Open founder question

None. The plan keeps every ruled decision; the mechanism differs from the board text only
where measurement improved the instrument (meta files instead of transcript pairing; the
`.jsonl` store instead of the `.output` twins), which the item explicitly licenses ("the plan
critiques the mechanism").

## Standing rulings for the later sittings — do not re-derive

1. **Draft sitting**: the executor's FIRST action is plan step S1 — capture the
   before-evidence with the UNMODIFIED script. Any code edit before S1 destroys the baseline.
2. **Conductor, at the gate-2 proportionality step**: this diff touches `loop/` only, so CI's
   derived rule calls it prose. RULED (plan D10): the draft-code gate RUNS anyway — the
   substance is a ~400-line script rework plus a new selftest. Running it is a tightening;
   do not skip the gate.
3. **Fix sitting, audit brief**: ADD `git diff <base>...<head> -- loop/work` to the
   auditor's enumeration instrument (additive — the pinned source-only command enumerates
   nothing for a `loop/`-only diff), and declare the path-set from plan section 1 as the
   scope box.
4. **Any pull-request text**: no id but AI4DEV-80, ever. The board item's own description
   names other items — never copy it into the pull request. Other items are named in words.
5. **At close**: the scoped-out follow-up (the flash/opencode reviewer-spend join) is named
   in the record in words, filed, not built.

## Expectations that are not anomalies

- The required CI check on this branch takes the prose fast lane: guards run, the TypeScript
  suite is skipped. Expected for a `loop/`-only diff; the item's own verification is the
  PowerShell selftest, run by the executor and recorded, not by CI.
- The pull request is opened by a mechanical right after this sitting's push, so the check
  gates every later push.

## Anomalies

None observed this sitting.
