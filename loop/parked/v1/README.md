# loop/parked/v1 — dead text under version control

Everything under this directory is PARKED. The files are kept as history, unchanged from how they
last stood in the tree apart from one table row in `.claude/skills/work/SKILL.md` removed the same
day (2026-09-02, before the move: the row named `pstack-workflow-ai4good.md`, a file this item
deleted), and for nothing else.

- They are not compiled. No `tsconfig.json` includes this directory: the root config includes
  `src/**`, `vite.config.ts` and `eslint.config.js`; `tests/at/tsconfig.json` includes `**/*`
  relative to `tests/at`.
- They are not run. vitest's include is relative to `--root tests/at`, and CI reads `loop/` as
  prose.
- They are not imported. Nothing under `tests/at` imports them, and their own relative imports
  (`./runner.ts`, `./check.ts`, `./attestation.ts`) no longer resolve from here. Two probe scripts
  in an old item folder, `loop/items/AI4DEV-62/verify-first.ts` and `gate2-verify.ts`, still
  import the pool by its old path; they are frozen history, outside every tsconfig, and fail on
  their first import if run.
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

One residual of the identity read that replaced it, recorded here as well as in `runner.ts`
(`containerNames`): the own-container match is a suffix match, so a container of a project whose
id ends in `_<this project id>` would count as this project's. No such project exists on this
machine.

## loop/work/db-slots.ps1

The coordinator's half of the pool: reserve, release, list, over the reservation files and the
occupancy claims. It reads no config and writes no config. Nothing dot-sources it any more.
Parked with the pool, for the same reason.

## The v1 ceremony (parked 2026-09-02, AI4DEV-86)
Founder rulings 2026-09-01: "no more slots machinery this should be moved out" and "i want to clean the codebase with the v1 ceremony and align with what is does on CI as well". Everything under this folder is dead text under version control: not compiled, not run, not loaded by Claude Code, not a spare part that still fits. The live way of work is section 5 of the project CLAUDE.md: `/controller`, then `/pstack:poteto-mode`, then `/controller done`.
- `.claude/agents/`: the six relay roles (conductor, orchestrator, orchestrator-opus, executor, reviewer-runner, distiller). `mechanical` stays live; v2 uses it.
- `.claude/skills/work/`: the `/work` coordinator manual, WORKFLOW.md, reviewers.md, lessons.md, shared-invariants.md, and the nine conductor phase files. The three standing rules moved to CLAUDE.md section 5. Note: shared-invariants.md recommended `ref` / `part of` / `towards` for naming other items in a pull request; CI's reference guard fails those words. The rule in CLAUDE.md is the one that binds.
- `loop/work/`: twin-check (the CI twin-guard step is gone with it), stamp-hook and banner (already unwired), attribution-report with its selftest and epoch file, watch-items, db-slots (the coordinator's half of the slot pool), and — by the same rule, no live caller — ci-status, context-gauge, render-mermaid, and sheet-check with its pstack-models.expected.md. Four stay live, each with a caller: work-lib.ps1 (the status line dot-sources it), materialize.ps1 (`/controller`), statusline.ps1 and guard-branch-switch.ps1 (`.claude/settings.json`, from the main checkout). statusline.ps1 still writes the context snapshot that context-gauge read; that block is filed, not edited.
- `.claude/skills/find-batch/`: the batch-partner scout. It told the founder to type `/work <primary> <partner>`, and `/work` is parked; batching is not part of v2.
- `.claude/hooks/session-start-banner.sh` stays live and exits unless `CLAUDE_CODE_REMOTE` is true. With banner.ps1 parked, a local session has no session-start banner from either source. The hook's own header still says local Windows sessions run banner.ps1 for the same slot; both halves of that sentence are stale (banner.ps1 is parked, and there is no slot). Recorded here, not edited.
- `loop/drills/`: the drill harness (run-drills, control-lib, fake-actor, live-scenarios, prompts) that bound the agents, the phase files and the twin check. `loop/drills/records/` stays where it is as history.
- `tests/at/harness/db-pool.ts` and its selftest: the database slot pool. See the section above.

## The semantic judge (parked 2026-09-02)

No suite ever called it. The recording store was empty. The recorder never ran. The parked files
are dead text: they are not compiled. The three ids it was written for (AT-009.07, AT-004.10,
AT-033.07) have no suites. When one lands, a judge is a function that test imports with its own
record-and-replay store, not a member of the harness object.

## The provenance ledger (parked 2026-09-02)

Five paths left the live tree:

- `tests/at/harness/capabilities.ts`
- `tests/at/harness/attestation.ts`
- `tests/at/harness/live-ledger.selftest.ts`
- `tests/at/harness/type-invention.selftest.ts`
- `tests/at/typeprobes/`

They are dead text under version control: not compiled, not run, not imported. The red kinds
(`pending` with a phase, `capability-pending` with names) and the manifests under
`tests/at/expected/` did not move. One boolean `live` on the harness now drives the above-loop
refusal: `registry.ts` throws `CapabilityPending` naming `fixtures.worlds` and `sut.<key>` when
the tier is above loop and `live` is false.

What that costs: the loop tier can no longer tell a real member from a stand-in. Above loop, a
suite with no live adapter is refused by a boolean, not a computed verdict.
