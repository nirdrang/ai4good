# loop/parked/v1 — dead text under version control

Everything under this directory is PARKED. The files are kept as history, byte for byte as they
last stood in the tree, and for nothing else.

- They are not compiled. No `tsconfig.json` includes this directory: the root config includes
  `src/**`, `vite.config.ts` and `eslint.config.js`; `tests/at/tsconfig.json` includes `**/*`
  relative to `tests/at`.
- They are not run. vitest's include is relative to `--root tests/at`, and CI reads `loop/` as
  prose.
- They are not imported. Nothing under `tests/at` names them, and their own relative imports
  (`./runner.ts`, `./check.ts`, `./attestation.ts`) no longer resolve from here.
- They still carry the personal-stack refusals this tree no longer believes: the 44320–44329
  port block as forbidden ground, `personalBlockProblems`, "the founder's personal stack is
  untouchable". The integration tier now targets that stack on purpose, as the one stack, and
  resets it on every run.

They are not spare parts. **Never run `bun tests/at/harness/db-pool.ts setup`.** The path no
longer exists; the parked copy fails on its first import if run from here; and it must not be
moved back to make it run.

## tests/at/harness/db-pool.ts and db-pool.selftest.ts

The local database slot pool: two standing stacks (`ai4good-slot-1`, `ai4good-slot-2`), a
generated config per slot, a reservation per item, an occupancy claim per verify window, the
port overlay, the mirror, and the isolation spike. The integration tier reached a database only
through it. The selftest — 9 describe blocks, 33 tests — went with it; each test grades code that
no longer runs. Parked on 2026-09-02, when the integration tier moved to the one stack
described by this tree's own `supabase/config.toml`.

## loop/work/db-slots.ps1

The coordinator's half of the pool: reserve, release, list, over the reservation files and the
occupancy claims. It reads no config and writes no config. Nothing dot-sources it any more.
Parked with the pool, for the same reason.

## The v1 ceremony (parked 2026-09-02, AI4DEV-86)
Founder rulings 2026-09-01: "no more slots machinery this should be moved out" and "i want to clean the codebase with the v1 ceremony and align with what is does on CI as well". Everything under this folder is dead text under version control: not compiled, not run, not loaded by Claude Code, not a spare part that still fits. The live way of work is section 5 of the project CLAUDE.md: `/controller`, then `/pstack:poteto-mode`, then `/controller done`.
- `.claude/agents/`: the six relay roles (conductor, orchestrator, orchestrator-opus, executor, reviewer-runner, distiller). `mechanical` stays live; v2 uses it.
- `.claude/skills/work/`: the `/work` coordinator manual, WORKFLOW.md, reviewers.md, lessons.md, shared-invariants.md, and the nine conductor phase files. The three standing rules moved to CLAUDE.md section 5. Note: shared-invariants.md recommended `ref` / `part of` / `towards` for naming other items in a pull request; CI's reference guard fails those words. The rule in CLAUDE.md is the one that binds.
- `loop/work/`: twin-check (the CI twin-guard step is gone with it), stamp-hook and banner (already unwired), attribution-report with its selftest and epoch file, watch-items, db-slots (the coordinator's half of the slot pool). work-lib.ps1 and materialize.ps1 stay live: the status line and `/controller` call them.
- `loop/drills/`: the drill harness (run-drills, control-lib, fake-actor, live-scenarios, prompts) that bound the agents, the phase files and the twin check. `loop/drills/records/` stays where it is as history.
- `tests/at/harness/db-pool.ts` and its selftest: the database slot pool. See the section above.
