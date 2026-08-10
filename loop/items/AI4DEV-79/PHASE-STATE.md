# PHASE-STATE — AI4DEV-79 (parallel local DB slot pool)

**Phase: DRAFT COMPLETE → GATE 2 (draft-code review, panel of two).**
Resumed draft sitting (orchestrator on fable, claude-fable-5 @ xhigh) closed 2026-08-10.
Chain, derived from the branch: AI4DEV-79 (parallel DB slot pool) → AI4DEV-3 (AT harness),
root label `attr:bringup`.

## What happened this sitting

- The founder answered, relayed verbatim by the conductor: "Personal can stay stopped. And
  continue 79." Ruling E5 (the re-proof shape) and the E2 unblock are in plan §8; the amended
  S3 is in plan §4. Rulings were pushed (6ac65d7) before any code changed.
- Observed and recorded, not acted on: the personal stack was recovered OUTSIDE the item — its
  db container was recreated 2026-08-09T22:30:25Z and has run healthy on its correct port
  54322 since, before the founder's morning answer. No item agent touched it. Two independent
  instruments confirm no touch this sitting: the spike's own before/after docker snapshot, and
  the orchestrator's separate `docker inspect`.
- **The wall is RE-PROVEN under the hostile condition.** Transcript
  `loop/items/AI4DEV-79/spike-isolation-2.txt`, committed, scanned clean. With
  `SUPABASE_PROJECT_ID=<the personal project id>` deliberately present in the spike's parent
  process, a reset aimed at slot 2 through the shared helper destroyed slot 2's canary, left
  slot 1's canary standing, and left the personal stack's docker identity byte-equal on every
  identity field. F8 stands settled as amended: the wall is positive identity, not
  `--workdir`. F4's reset-with-absent-seed claim is now settled on a slot identity.
- Draft complete: S1 (E1/D13 helper; E3 and E4 folded), S2 (prior sitting), S3 as amended
  (passed), S4 (the nine named tests plus two anti-vacuity companions, ruling E8), S5 (runner
  hook; drill refuses as infrastructure; loop tier untouched), S6 (`loop/work/db-slots.ps1`
  plus three SKILL.md touch points). `bun run typecheck` green; `bun run build` green.
  **The verify suite was NOT run** (draft contract): no at:selftest, no at:check, no
  at:verify in any tier. The loop-tier oracle capture (gate-1 [10]) and S8's integration run
  belong to the goal phase.
- Executor budget: ONE invocation of three used this sitting. Inside it the spike ran twice —
  the first run stopped on a leftover canary table in slot 1, a client problem with no
  identity resolved; the transcript postscript records both runs. Rulings E6–E9 (plan §8)
  ratify the executor's judgment calls.

## GATE 2 — what the conductor launches

Two readers, draft-code review. Both prompts are assembled per reviewers.md and scanned free
of pin-shaped tokens. NEITHER prompt names or hints the other reader; no spawn prompt may
either. Pin both reviews at this close's pushed head — the sitting's completion report names
it; verify with ls-remote before launching.

Reader one — the codex lane, pins per reviewers.md "The DRAFT CODE review", reader one:
- prompt file: `loop/items/AI4DEV-79/gate2-terra-prompt.txt`
- output: `loop/items/AI4DEV-79/artifacts/gate2-terra-output.md`
- stderr log: `loop/items/AI4DEV-79/artifacts/gate2-terra-output.stderr.log`
- distillate: `loop/items/AI4DEV-79/artifacts/gate2-terra-distillate.md`
- (the runner may add stdout and pid files per its recipe, as gate 1 did)

Reader two — the opencode lane, pins per reviewers.md "The DRAFT CODE review", reader two;
the agent file exists at `.opencode/agent/reviewer-flash.md` in this worktree (verified this
sitting):
- prompt file: `loop/items/AI4DEV-79/gate2-flash-prompt.txt`
- output: `loop/items/AI4DEV-79/artifacts/gate2-flash-output.md`
- stderr log: `loop/items/AI4DEV-79/artifacts/gate2-flash-output.stderr.log`
- distillate: `loop/items/AI4DEV-79/artifacts/gate2-flash-distillate.md`
- tool-call summary: `loop/items/AI4DEV-79/artifacts/gate2-flash-toolcalls.md`
- identity extract: `loop/items/AI4DEV-79/artifacts/gate2-flash-identity.md`

Proportionality (workflow step 32): the diff reaches code — the gate runs.

## For the fix sitting

- Read both distillates. Rule every finding, claim quoted verbatim. Push rulings before any
  code changes.
- The goal loop then runs the verify suite: typecheck; at:selftest (now includes the db-pool
  tests); at:check req-001; at:verify req-001 --tier loop --expect PLUS the gate-1 [10]
  oracle capture (main vs branch, normalized, empty diff, both transcripts and the diff
  committed); and S8 — one integration-tier verify through the pool with `AT_DB_SLOT` set,
  transcript committed and scanned clean.
- **HARD LINE, unchanged and permanent:** the personal stack (project id
  poancmeitlmxejofwzuu, ports 54320–54329, inspector 8083) is untouchable — no start, stop,
  reset, connection, or write by any role. Docker reads only. S8 uses a SLOT.
- The audit brief (written by the fix sitting): the panel's subject is the claim, never code
  quality; execution evidence is CI's — the brief must not ask for suite runs.

## Anomalies

- The conductor's remote-tip watcher (`artifacts/watch-tip.sh`, a tracked file) rewrites its
  own base pointer after every push, so the tree goes dirty moments after every close. Two
  sittings have now committed the change as it arrived (ruling E9). The conductor may want
  the watcher's state moved to an untracked path.
- The personal stack's kong container reports "unhealthy" and the vector container
  restart-loops on ALL three stacks — pre-existing, observed 2026-08-10, not this item's
  defect, not touched.

## Gate-1 record (complete, committed at 6429e7e)

Unchanged — all 15 findings ruled in plan §7; raw output, logs and distillate under
`loop/items/AI4DEV-79/artifacts/`.
