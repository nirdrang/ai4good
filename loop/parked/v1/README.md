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
