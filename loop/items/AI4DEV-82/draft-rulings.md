# Draft-phase rulings — AI4DEV-82 (window guard at the sitting boundary)

Ruled by the RECOVERY DRAFT sitting, orchestrator on **fable @ xhigh**, 2026-08-12. This file
exists because the original DRAFT sitting died on a vendor-side 529 error after its executor
finished and before it could rule on the executor's report. The recovery sitting verified the
pushed tree first-hand and rules here on everything the executor flagged.

## The recovery, and what it verified

The dead sitting's transcript shows a clean sequence: gate 1 rulings and the plan amendment
committed and pushed FIRST (f7ec462), one executor spawned (opus, synchronous), the executor's
six commits pushed through d120230, tree clean — and then the 529 killed the sitting on its
very first model call after the executor returned. Nothing was lost mid-write; the phrase the
conductor caught ("Now the steps section.") was narration from the earlier plan-amendment work,
which completed and is committed.

Verified first-hand at d120230, not taken from the dead sitting's or the executor's claims:

| claim | how verified | result |
|---|---|---|
| library extraction behaviour-neutral | capture artifacts compared line by line | identical except the label line |
| the line is 85 everywhere it must be | grep across `loop/work` | three defaults (lib, gauge, wait) + sim boundaries at 84/85 and 84.6/84.4 |
| `window-sim.ps1` green | ran it | 60 passed, 0 failed, exit 0 |
| watchdog drill green, all four groups + fault injection | ran it standalone | 54 passed, 0 failed, exit 0 |
| drill folded and BINDING, twin guard intact | read the `run-drills.ps1` diff; ran the full suite | `$failed` computed after ALL asserts; 74 of 74 green, exit 0 |
| gate matches rulings [3] and [4] | read `window-gate.ps1` | deny carries window, percent, line, reset and the parking choreography; UNKNOWN allows with `additionalContext` + `systemMessage`; errors fail open, never mute |
| alarm matches ruling [1]'s shape | read `window-alarm.cmd` and `.claude/settings.json` | findstr anchor, exit 2 on ALARM, silent otherwise; wired under BOTH PostToolUse and PostToolUseFailure, no matcher |
| sensor writes verdict-first in one envelope | read the `statusline.ps1` diff | one try block, verdict before snapshot, paths via the library helper |
| stamp computes via the lib | read the `stamp-hook.ps1` diff | PAUSE → `WINDOW ALARM` line, UNKNOWN → non-halting note, guarded dot-source |
| contract amendments keep "the coordinator decides" true | read both diffs | the hooks are named as machinery that decides nothing; resume stays centralized; twins untouched |

## Rulings on the executor's flagged deviations

**[E1] The pause-line number lives in three param defaults, not two — ACCEPT.**
> "The plan's D2 names `window-gauge.ps1` and `window-wait.ps1`; D1 forces a third in
> `window-lib.ps1`, because gate/sensor/stamp call the library directly and PowerShell cannot
> evaluate a dot-sourced value in a `param()` default."
The library's `$script:WindowPauseLine` is the canonical constant; the two CLI wrappers are
separate processes and must carry their own defaults. The sim's 84/85 boundary cases are the net
that catches a copy left behind. Plan D2 amended to name all three.

**[E2] The gauge CLI also honors `AI4GOOD_WINDOW_DIR` — ACCEPT.**
> "It is behaviour-neutral when the variable is unset — the capture-diff proves that — and it
> keeps one path formula."
One path formula in one helper is the exact drift class D1 exists to remove; a gauge that
ignored the override while every other reader honored it would make drill group 4 prove less
than it claims. Plan D7 amended to name the gauge as a reader of the override.

**[E3] `additionalContext` visibility and `PostToolUseFailure` dispatch are unverified at
runtime — ALREADY RULED, no new ruling needed.** These are precisely the two contingencies gate
1 rulings [1] and [3] pre-decided, and the settings-proof probe (step 10) is their runtime
proof. The fix-and-goal sitting MUST run the probe and record either the proof or the named
contingency, in `goal-evidence.md`.

**[E4] Live firing of the committed main-checkout paths is unprovable pre-merge — ALREADY
RULED (D11 path honesty).** The executor investigated and found no way to prefer the committed
file pre-merge; the probe uses the path-substituted twin, and the merge sitting's post-merge
live check remains the second half of the proof.

**[E5] `git commit -F <file>` needed where a message carries double quotes — NOTED.** Same
hazard class as the quoting note in the measurement record: PowerShell native-argument handling
re-parses inline quotes. No plan change; recorded so the next sitting does not rediscover it.

## Incident record — the drill's first run touched the live snapshot

Real incident, disclosed by the executor and recorded here as part of the permanent record:

- The drill's FIRST red-first run (plan step 3) wrote a synthetic 95% reading into the LIVE
  snapshot file, because the sensor did not yet honor `AI4GOOD_WINDOW_DIR` — that arrived at
  step 4. The plan's own step order created the exposure.
- It self-healed: the founder's session refreshed the file with a true reading about two
  minutes later. The executor re-read the file at sitting end: clean, real, fresh.
- The executor tried to delete the contaminated file at once, was DENIED by the permission
  classifier (a write outside the repository), and did not work around the denial. Correct on
  both counts. Had no session refreshed the file, a false 95% would have stood until one did —
  under this item's own machinery that false reading would have parked new work.
- Two permanent guards now stand in the drill where the hole was: a static assertion that the
  sensor never spells out a snapshot path (it must use the library helper), and a live canary
  that ABORTS the whole run if the drill's own marker string ever appears in the live file. The
  canary was retuned once (timestamp → content marker) because the founder's session
  legitimately rewrites the live file every prompt.

Disposition: no further action this item. The guards are committed and green; the residual
lesson — a drill that tests an override must not run before the override exists — is a plan-
ordering fact recorded here for the audit and for future drill-writing items.

## One attribution note for later readers

The six draft commits carry a `Co-Authored-By: Claude Fable 5` trailer, but the executor that
wrote and committed them ran on OPUS — verified from the dead sitting's transcript (spawn
parameters: `subagent_type: executor`, `model: opus`) and the executor's own transcript. The
trailer text is what the executor typed; do not read commit trailers on this branch as model
attribution evidence.
