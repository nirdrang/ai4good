# Item records

Each folder here is the record of one board item: its brief, its rulings, and the evidence it
produced.

## The proof scripts here are deliberately not type-checked

`bun run typecheck` checks four projects: the app, the acceptance tests, the verify drive and
the fixture shell. It does not check `loop/items/`. This is on purpose, for three reasons.

1. **A record is frozen at the commit it ran against.** A proof script imports the code of its
   day. When that code moves, the script stops compiling, and that is correct. Two scripts of
   AI4DEV-62 import `tests/at/harness/db-pool.ts`, which workflow v2 moved under `loop/parked/`.
   To make them compile again, we would have to edit the evidence after the fact, and then the
   record would no longer show what ran.
2. **The scripts run on three runtimes.** Some run on Bun, some on Node, and the spike scripts
   under `ai-path/spike/` run as Deno edge functions with `npm:` imports. No one configuration
   checks all three.
3. **Each script runs alone.** Most are top-level scripts, not modules. Checked together, they
   declare the same globals and the compiler reports them as clashes.

Measured on 2026-10-23 at `9189dc3`: a configuration that extends `tests/at/tsconfig.json`
over `loop/items/**/*.ts` reports 113 errors in 16 of the 23 scripts. To check this again,
write that configuration and run the pinned compiler on it with `--noEmit`.

The check for a proof script is to run it. A script is written to produce evidence, so it is
run before that evidence is committed, and a type error shows then. If a script must stay live
after its item merges, move it to code the typecheck covers, such as `tests/at/harness/`.
