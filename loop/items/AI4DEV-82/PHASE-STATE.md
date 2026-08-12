# PHASE-STATE — AI4DEV-82 (window guard at the sitting boundary)

**Phase: PLAN COMPLETE — the next event is GATE 1 (the plan review), a wait the conductor
holds.** Written by the PLAN sitting, orchestrator on **fable @ xhigh**, 2026-08-12. Chain,
derived from the branch: `AI4DEV-4 (the work skill)` > `AI4DEV-82 (window guard at the sitting
boundary)`. Bring-up item; no database slot (coordinator-confirmed: hooks, PowerShell scripts
and a drill).

## What happened this sitting

1. **The worktree had been auto-cleaned mid-sitting and was repaired.** The conductor's tree
   arrived populated, then the platform's unchanged-worktree cleanup emptied and unregistered it
   while this sitting ran (zero commits existed on the branch, so it counted as unchanged). This
   sitting re-registered the same path on the item branch and immediately committed and pushed
   an anchor, which is what makes the tree survive from now on. Full evidence:
   `artifacts/worktree-incident.md`. Consequences the next sittings must know: **node_modules is
   NOT installed in this tree** (nothing in this item needs it), and any file state the conductor
   remembers from before the repair is unreliable — the branch and the pushed record are the
   truth.
2. **The item's required first measurement is done and positive** — PreToolUse hooks fire for
   Agent calls made inside spawned agents; the matcher name is `Agent`; deny reasons reach the
   denied actor; PostToolUse fires inside subagents; UserPromptSubmit does not. Three
   instruments agree. Evidence: `artifacts/hook-measurement.md` + `artifacts/hookprobe/`.
   **The conductor-fallback branch of the item is dead; the hook design is confirmed.**
3. **`plan.md` is written** — eleven steps, each with a done-criterion; the drill is the
   executable test body and is written red-first at step 3; one slice; scope declaration for the
   later audit brief included.
4. **`gate1-prompt.txt` is written** — contract + PLAN review section + this item's additions
   (no pins block, no sibling gates).
5. **The pull request is opened by a mechanical after this state file is pushed**, so the
   required CI check gates from the first push onward.

## What completes the next phase

GATE 1: the conductor launches one reviewer-runner for the plan gate — reader `gpt-5.6-sol`,
effort `xhigh`, codex, `--sandbox read-only`, prompt file `loop/items/AI4DEV-82/gate1-prompt.txt`,
pinned at this branch head — waits for the landing, and has the distillate produced. Then the
conductor spawns the DRAFT sitting (orchestrator, fable), which rules on every gate 1 finding,
amends `plan.md`, pushes rulings + amendment BEFORE any code changes, and only then spawns the
executor for the draft (typecheck-level clean for scripts means: every script parses; the drill
runs; the verify suite — drill green — deliberately NOT yet achieved).

## Facts the next sitting needs

- Branch base: 390042c (= main at branch creation). The anchor commit and the plan commits sit
  on top; the head the conductor pins for gate 1 is the pushed head of this sitting's close.
- The specification is the Linear item description (AI4DEV-82, updated 2026-08-12). The plan
  quotes every load-bearing ruling; if a gate 1 finding disputes a quote, the Linear text wins
  and the ruling should re-read it.
- The audit brief (fix sitting's job) must scope the auditors' change-set command to this item's
  declared territory (see plan.md "Scope declaration") — the default source-only diff yields an
  empty list here.
- The merge sitting must verify post-merge that the running interactive session actually picked
  up the new hook entries (the docs claim a file watcher does it; unmeasured), and record the
  answer.

## Open questions for the founder

None. The measurement confirmed the hook design, so the item's conditional fallback never
activates and nothing contradicts ratified text. No scope growth: everything planned is inside
the item's own specification.
