# PHASE-STATE — AI4DEV-82 (window guard at the sitting boundary)

**Phase: DRAFT COMPLETE — the next event is GATE 2 (the draft code review), a wait the conductor
holds.** Written by the RECOVERY DRAFT sitting, orchestrator on **fable @ xhigh**, 2026-08-12.
Chain, derived from the branch: `AI4DEV-4 (the work skill)` > `AI4DEV-82 (window guard at the
sitting boundary)`. Bring-up item; no database slot. The pull request is #56.

## What happened — two sittings, one phase

1. The original DRAFT sitting ruled all six gate 1 findings (`gate1-rulings.md`), amended
   `plan.md`, pushed both FIRST (f7ec462), then ran one opus executor which implemented every
   plan step and pushed six commits through d120230. The sitting then died on a vendor-side 529
   error on its first model call AFTER the executor returned — before ruling on the executor's
   report. Nothing was lost: the tree was clean at d120230.
2. This RECOVERY sitting verified the tree first-hand against the gate 1 rulings — reading every
   changed file's diff and re-running the verification: `window-sim.ps1` 60/60, the watchdog
   drill standalone 54/54, `run-drills.ps1` 74/74, capture-diff identical except its label line.
   **Nothing the dead sitting's executor claimed was found wrong.** The verification table and
   the rulings on the executor's five flagged deviations are in `draft-rulings.md`; two
   deviations were accepted into the plan (D2: the 85 line lives in three defaults; D7: the
   gauge honors the override too).
3. `draft-rulings.md` also carries a REAL INCIDENT record: the drill's first run wrote a
   synthetic 95% reading into the live snapshot before the sensor honored the override; it
   self-healed and two permanent guards now stand in the drill. Read it before writing the audit
   brief — the incident and the guards belong in the claim checklist territory facts.
4. The two gate 2 prompts are written and committed: `gate2-terra-prompt.txt` and
   `gate2-flash-prompt.txt` — identical assembly (contract + draft-code section + this item's
   additions), neither aware of the other.

## What completes the next phase

GATE 2: the conductor launches TWO reviewer-runners in the background, pinned at this sitting's
close head (the head this state file rides in — verify against the remote):

- reader one · `gpt-5.6-terra` · effort `max` · codex · `--sandbox read-only` · prompt
  `loop/items/AI4DEV-82/gate2-terra-prompt.txt`
- reader two · `opencode-go/deepseek-v4-flash` · `--variant max` · opencode · agent
  `reviewer-flash` · clean session · prompt `loop/items/AI4DEV-82/gate2-flash-prompt.txt`

Neither reader may learn the other exists. When both land and are distilled, the conductor
spawns the FIX AND GOAL sitting (orchestrator, fable).

## What the FIX AND GOAL sitting must do (beyond its contract)

- Rule on every finding from BOTH readers; push rulings before any code changes.
- The executor then checks verify-first claims, applies ruled fixes, and pursues the goal. The
  draft is already green (drill, sim, full suite), so "goal" here means the deliberately
  deferred evidence steps: run the settings-proof probe (step 10 — MANDATORY, it is the runtime
  proof gate 1 rulings [1] and [3] depend on, with their contingencies pre-decided); measure the
  two overhead medians (step 6, alarm target ≤ 100 ms); prove the fold binding once with a
  forced red (step 8); write `goal-evidence.md` (step 12) including the capture-diff pointers.
- Commit both readers' full evidence (raw + distillate + the opencode reader's tool-call summary
  and identity extract) into the record before closing.
- Write the audit brief per reader (luna via codex, flash via opencode), with the CLAIM
  CHECKLIST: the gate 1 ruling ids [1]–[6] and the draft ruling ids [E1]–[E5] as adopted claims,
  the declared path territory from plan.md's scope declaration, the incident record's facts, and
  each concrete code fact the record states. The auditors' change-set command must be scoped to
  the declared territory — the default source-only diff yields an EMPTY list for this item.

## Facts the next sitting needs

- Branch base: 390042c. Gate 1 rulings + plan amendment: f7ec462. Executor's draft: six commits
  through d120230. This sitting adds: plan D2/D7 amendments, `draft-rulings.md`, the two gate 2
  prompts, this file.
- The six draft commits carry a `Co-Authored-By: Claude Fable 5` trailer but were written by an
  OPUS executor (verified from transcripts; see `draft-rulings.md`). Do not read trailers on
  this branch as model attribution.
- Deliberately NOT done in the draft, by plan design: probe execution, overhead medians,
  fold-binding forced-red proof, `goal-evidence.md`.
- The committed `.claude/settings.json` hook paths point at the MAIN checkout and are live only
  post-merge; the probe proves the entry shapes pre-merge, and the merge sitting must verify
  live firing post-merge and record whether the running session picked up the entries.
- node_modules is not installed in this tree; nothing in this item needs it.

## Open questions for the founder

None. No finding contradicts ratified text and there is no scope growth. The 529 death and the
recovery are process facts, recorded here and in `draft-rulings.md`.
