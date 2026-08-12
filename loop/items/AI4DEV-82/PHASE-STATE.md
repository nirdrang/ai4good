# PHASE-STATE — AI4DEV-82 (window guard at the sitting boundary)

## SCOPE RESET — 2026-08-12, founder ruling (UNPARKS AND SUPERSEDES EVERYTHING BELOW)

The founder reset scope tonight, verbatim: *"one important findings we want to rely on the
coordinator reading the status line only and then executing the pause and the resume. All code
that u created for advanced mechanics for this should be out. I don't need a full ceremony of
reviewers and audits for this. It should be a small change and test the drills"*

The item is now SMALL. One actor (the coordinator), no new runtime surface.

**What stays:**
- `loop/work/window-gauge.ps1` — already read by the coordinator on every FLOW/PULSE line.
- `loop/work/window-wait.ps1` — parks until the provider's stated reset.
- The pause line moves 90% → 85%.
- Synthetic-snapshot drills covering: gauge verdicts at/over/under the line, stale-high/stale-low
  rules, and the park/resume path. Never touch the live snapshot.

**What comes OUT (delete, don't adapt):**
- The PreToolUse spawn gate, PostToolUse per-tool alarm, UserPromptSubmit window alarm.
- Every `.claude/settings.json` hook entry added for them, `window-alarm.cmd` and any hook
  wrapper script.
- The verdict file and the verdict-first sensor write.
- Any library extraction, choreography text, or drill case that exists only to serve the hooks.

**Ceremony for THIS item only:** no reviewer gates, no audit panel, no audit sitting. Plan →
build → drills green → pull request → merge. CI still gates the merge; commits still cite the
item; the PR still closes it.

**The prior park (below, and the whole prior sitting history in this file) is superseded.** The
branch at `6d6aff8` is prior art, not the baseline: take only the 85% line, the synthetic-snapshot
drill scaffolding, and any gauge-testing drill case; leave the hook machinery, the verdict file,
and everything that serves it behind.

**Two carry-forward facts the merge must respect:**
1. The pull request body must be rewritten to describe what actually merges (a small
   coordinator-read guard, no hooks) — it is currently stale ("Current state: PLAN phase").
2. No file may claim any hook or alarm delivery works — the reduced design has none.

**What completes the next phase:** a PLAN sitting (orchestrator, fable @ xhigh) that reads this
file and the Linear description's SCOPE RESET section, proposes the small design (gauge line
change, deletion of hook machinery, drill updates), and hands off to build. Given the reduced
scope, the orchestrator may judge plan+build as one sitting — that judgment is the orchestrator's,
per the conductor contract.

---

## Everything below this line is PRE-RESET HISTORY, kept for provenance only. Do not resume from
## it. It describes hook machinery, an audit panel, and a park reason that the reset above voids.

(See git history at commit `6d6aff8` on this branch for the full prior PHASE-STATE content: the
park note explaining the sensor-untrustworthy stand-down, the gate 1/gate 2/audit ruling
references, and the per-tool-alarm delivery gap. None of it binds the reduced design.)
