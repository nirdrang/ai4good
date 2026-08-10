# Plan — AI4DEV-79 (parallel local DB slot pool)

Written by the plan sitting (orchestrator, fable @ xhigh), 2026-08-10. Chain, derived from the
branch: AI4DEV-79 (parallel DB slot pool) → AI4DEV-3 (AT harness), root label `attr:bringup`.
Foundation work: no requirement above it, no acceptance-test ids of its own.

## 1. The ruled design — quoted from the board item, because the board is not in the tree

The Linear description carries the founder-ruled design (ruled 2026-08-09). This gate critiques
the mechanism below it; it does not reopen these decisions. The ruled points, quoted:

> * **A pool of 2 standing Supabase stacks** ("slots"), each with its own project id and port
>   block. Concurrency = pool size. The default stack on ports 54321+ is the founder's personal
>   stack and stays OUTSIDE the pool, untouchable.
> * **Warm slots**: the stacks stay running. (Flipping to start-on-acquire later is a one-line
>   change.)
> * **One claim file per slot, two states, three owners**: the coordinator RESERVES a slot when
>   an item starts (`/work` time — admission control); the harness runner OCCUPIES it for each
>   verify window (atomic create-new claim, pid stamped, release in a `finally`); the
>   coordinator RELEASES the reservation at the item sweep.
> * **Full pool = the next database-needing item is REJECTED at start.** No flagged limbo.
>   Items that need no database (docs, contracts) skip the reservation, stated at start.
> * **State is never inherited.** First act of every occupancy: copy the item tree's own
>   `supabase/migrations` + seed into the slot directory and run `supabase db reset --workdir
>   <slot>`. The previous holder is never trusted, including a crashed one.
> * **Stale claims are broken LOUDLY** — dead holder pid, takeover recorded in the claim, never
>   silent.
> * **The evidence names the slot**: the verify transcript carries one line — slot, reset
>   performed, migration state. A green that cannot name its reset ran against unknown state.
> * **Identity/data split**: each slot directory permanently owns its `config.toml` (project id
>   + ports = identity); the item supplies migrations by copy (data). The repo's committed
>   `supabase/config.toml` is never edited, so no item diff is ever polluted.

What gets built, per the item: (1) a one-time setup script; (2) `tests/at/harness/db-pool.ts`
(~150–250 lines) exporting `readPool / occupy / prepare / stackEnv / release / evidence`;
(3) one hook in `tests/at/harness/runner.ts` gated behind the integration tier, loop-tier
behavior byte-identical; (4) reservation helpers (PowerShell, work library) plus reservation
lines in the /work skill, the conductor's spawn facts, and release in the coordinator sweep.

The tests, per the item: `db-pool.selftest.ts` with named tests (two concurrent occupies on one
slot → exactly one wins; dead-pid claim → loud takeover, recorded; release fires from `finally`
even when the suite throws; the evidence line carries slot + migration state), and:

> **The isolation spike comes FIRST and is a done-criterion**: canary rows in slot-1 AND in the
> personal stack must survive a `db reset` aimed at slot-2. Never assume the wall — prove it
> before building on it.

> Suites change ZERO lines — they already reach the stack only through the env the runner
> injects.

## 2. Facts about the tree this plan stands on (verified this sitting; pointers, not paste)

- F1. The runner's integration-tier sequence is `tests/at/harness/runner.ts` main(), the
  `tier !== 'loop'` block (~lines 1044–1112): read `supabase/config.toml` at REPO_ROOT →
  machine-wide stack lock → `supabase status` → prove-local checks → readiness → `db reset
  --local` → readiness → prove migrations replayed → inject `AT_SUPABASE_URL`,
  `AT_SUPABASE_DB_URL`, `AT_SUPABASE_ANON_KEY`, `AT_SUPABASE_SERVICE_ROLE_KEY` into the vitest
  child. Suites see only that env (runner.ts ~1108–1111). The item's "suites change ZERO lines"
  claim is true against the tree.
- F2. The tiers are `loop | integration | drill` (runner.ts:47). The `tier !== 'loop'` guard
  means the DRILL tier also reaches the repo-config stack today.
- F3. `acquireStackLock` (runner.ts ~343–442) is already an atomic create-new claim file, pid
  and start-time stamped, with a race-proven stale-takeover gate (runner.selftest.ts) and a
  loud console line on takeover. Its release runs inside the runner's `finally` chain
  (`cleanupRun`, runner.ts ~938–946, called from main's `finally`). The lock file lives at
  `<LOCALAPPDATA|XDG_CACHE_HOME|tmpdir>/ai4good-build/at-locks/at-verify-<projectId>-<apiPort>.lock`.
- F4. The personal stack's identity (`supabase/config.toml`): `project_id
  "poancmeitlmxejofwzuu"`; ports 54321 (api), 54322 (db), 54320 (shadow), 54323 (studio),
  54324 (local_smtp), 54327 (analytics), 54329 (pooler, disabled), and `edge_runtime`
  `inspector_port` 8083. Seed config `[db.seed] sql_paths = ["./seed.sql"]` — and
  `supabase/seed.sql` does NOT exist in the tree today.
- F5. `supabase/functions/` carries two live edge functions plus `_shared` modules, and
  `config.toml` pins `verify_jwt = true` for both. A slot that lacks the functions directory
  serves 404 where the personal stack serves the function.
- F6. `config.toml` uses `env()` substitution for OAuth credentials; a missed env resolves to a
  literal string and does not stop the stack (documented in config.toml ~line 410, measured on
  the sign-in item).
- F7. CI (`.github/workflows/ci.yml`, required check `verify`) runs on `ubuntu-latest`, or on
  a self-hosted runner when the repository variable `CI_RUNNER_LABEL` is set (ci.yml:44;
  corrected by gate-1 [15]), with NO Docker step either way: typecheck, `at:selftest` (vitest
  over `tests/at/harness/`), `at:check` per suite, `at:verify --tier loop --expect` per
  declaration. Every test this item adds to `harness/` must be green with no live stack, no
  Docker, and no Windows-only path assumption.
- F8. The Supabase CLI is pinned in devDependencies (`supabase ^2.110.0`) and always invoked as
  `bun --no-env-file <INSTALL_ROOT>/node_modules/supabase/dist/supabase.js` (runner.ts:69,
  460–463). The CLI takes a global `--workdir` flag naming a directory that contains a
  `supabase/` project folder — used by nothing in this repo yet, so it is UNVERIFIED here;
  step S2's done-criterion proves it before anything depends on it.
- F9. The work library pattern for locks is `Acquire-WorkLock` / `Release-WorkLock`
  (`loop/work/work-lib.ps1` ~196–223). The /work skill's claim step and spawn-facts step are
  SKILL.md steps 4–6 (~lines 91–101); the coordinator sweep step is SKILL.md ~line 170.
- F10. The verify surface for this item (foundation work, no AT ids): `bun run typecheck`,
  `bun run at:selftest`, `bun run at:check req-001`, `bun run at:verify req-001 --tier loop
  --expect` — the same four things CI runs, and all four are green on main today.

## 3. Decisions — the mechanism under the ruled design

- **D1. Pool root.** `<LOCALAPPDATA ?? XDG_CACHE_HOME ?? tmpdir>/ai4good-build/db-slots/`,
  the same base-resolution rule as the runner's `lockDir()` (F3), so the pool lives beside the
  locks it cooperates with, outside every worktree. Layout: `slot-1/supabase/…`,
  `slot-2/supabase/…`, `reservations/slot-N.json`. Env override `AT_DB_POOL_ROOT` exists for
  the selftests only, exactly as `AT_REPO_ROOT` exists for the runner's own tests.
- **D2. Slot identity.** Slot N owns `project_id "ai4good-slot-N"` and the port overlay
  `54xxx + N*1000`: slot-1 = 55320/55321/55322/55323/55324/55327/55329, inspector 8093;
  slot-2 = 56320/56321/56322/56323/56324/56327/56329, inspector 8103. Distinct project ids
  give distinct Docker container and volume names; distinct port blocks give the wall the
  spike proves. No slot value may fall in 54320–54329 or be 8083 (D5 enforces).
  The overlay rule is GENERAL (gate-1 [5]): every active key named `port` or ending `_port`,
  in every section, with a value in 54000–54999, maps to value + N*1000.
  `edge_runtime.inspector_port` maps 8083 → 8083 + N*10. Any other active port value refuses
  loudly as unmappable — a human decides, not a guess.
- **D3. Slot config regeneration — identity is permanent, everything else is data.** The ruled
  identity/data split names project id + ports as the slot's identity. Auth flags, seed paths
  and `verify_jwt` pins also live in `config.toml`, and items change them (F4's
  `enable_confirmations` was flipped by an item). A slot config frozen at setup time would
  drift from the item tree's config, and a verify on a slot would grade different auth
  behavior than a verify on the stack the config describes. So `prepare()` regenerates the
  slot's `config.toml` on every occupancy: take the item tree's `supabase/config.toml`
  verbatim, overlay ONLY the identity fields (project_id, the seven port keys, inspector_port)
  with the slot's permanent values, using the same section-aware line scan `readLocalConfig`
  already uses, and the general port rule in D2. The keep-warm decision compares against a
  MARKER, not the file (gate-1 [1]): `slot-N/.last-start.json` holds the hash of the config the
  stack last STARTED with, written only after a successful start. Regenerated hash equals the
  marker → nothing happens, the warm stack keeps running (the ruled default). Different or
  absent marker → prepare writes the config, restarts that slot's stack (`stop` + `start
  --workdir`) before the reset — the auth container reads config at start, not at reset — and
  writes the marker only when the restart succeeds. A crash between the write and the restart
  therefore forces a restart on the next occupancy instead of hiding behind equal text.
- **D4. Occupancy = the existing stack lock, extended.** `occupy()` acquires
  `acquireStackLock(slotConfig, requirement)` (F3) — it is already the atomic create-new,
  pid-stamped, stale-takeover-with-loud-line claim the ruled text describes, and it is already
  released in the runner's `finally` chain. Two extensions. First: when a stale claim is
  broken, the new claim file records `tookOverFrom` (the dead holder's pid and start time), so
  the takeover is recorded IN the claim, not only on the console. Second (gate-1 [3]):
  `acquireStackLock` gains a takeover-policy parameter; the pool passes dead-pid-only, so a
  LIVE holder is never taken over at any age — occupy refuses loudly and names the holder.
  Existing call sites keep today's default policy unchanged.
- **D5. The personal block is refused in code, not by convention.** db-pool refuses to occupy,
  prepare, reset or emit env for any slot whose config carries the repo config's `project_id`,
  any port in 54320–54329, or inspector port 8083. The scan covers EVERY active port-valued
  key in the config, not a fixed list (gate-1 [5]). The check runs before anything
  destructive, every time, and has its own named selftest. This is the "untouchable" ruling as
  an executable guard.
- **D6. Reservation lookup is derived, never declared.** The coordinator's `Reserve-DbSlot`
  writes `reservations/slot-N.json` (exclusive create; content: item id, branch, timestamp,
  holder). At verify time the runner derives its item id from the current branch (the house
  attribution rule) and occupies the slot whose reservation names that item. A run with no
  reservation for its item refuses as INFRASTRUCTURE, naming `Reserve-DbSlot` — no silent
  fallback onto any free slot, because admission control is the coordinator's, not the
  runner's. `AT_DB_SLOT=N` is the explicit override for runs outside an item (the founder, the
  evidence gate, the spike); the occupancy claim still applies.
  Three hardenings (gate-1 [2], [12]): the branch parser is a pure function over the branch
  string and FAILS CLOSED — exactly one item id, or it refuses naming the condition (zero ids,
  several ids, detached HEAD, git call failed); `occupy` re-reads the reservation AFTER the
  claim is acquired and releases-then-refuses if it no longer names the runner's item;
  `Release-DbSlot` deletes a reservation only when it names the item being swept, and refuses
  loudly while a live occupancy claim exists on that slot.
- **D7. Data copy at occupancy.** Before the reset, prepare deletes and re-copies into the
  slot: `supabase/migrations/*.sql` (timestamped files only, the runner's own pattern),
  `supabase/seed.sql` when the item tree has one — and removes the slot's copy when it does
  not (F4) — and `supabase/functions/**` (F5: integration suites can call edge functions
  through the injected URL). The previous holder's files are never trusted; delete-then-copy,
  not merge.
  Fail closed on the closure (gate-1 [6]): after regeneration, prepare scans the config for
  active relative-path values (seed `sql_paths`, `schema_paths`, email template files, TLS and
  signing key paths) and refuses loudly on any path it cannot copy from the item tree — no
  stack starts half-provisioned. Env policy, decided: slot start and restart inherit the
  invoking process env; a missed `env()` resolves to a literal string and does not stop the
  stack (F6, measured). [The inherit-env sentence is SUPERSEDED by ruling E1's strip — see §9,
  flash note 1: every `env()` substitution resolves to the literal string on a slot, always.]
- **D8. The runner hook is integration-tier only.** In main's stack block: when
  `tier === 'integration'`, resolve the stack through the pool — occupy → prepare (copy,
  config, reset via `--workdir`, readiness, prove migrations) → the same prove-local checks
  against the SLOT's config → inject the slot's env — and print the evidence line. The loop
  tier stays byte-identical (it never enters the block). The DRILL tier REFUSES as
  INFRASTRUCTURE (gate-1 [4]): "the drill tier's stack is not yet decided" — it no longer
  reaches any stack, personal or slot. Nothing in the tree invokes `--tier drill` today
  (verified: no script, no CI step, no process file), so nothing breaks, and the last harness
  path that could reset the personal stack is closed in code. The follow-up item that decides
  drill's stack replaces the refusal.
- **D9. Existing helpers are parameterized, not duplicated.** `readLocalConfig`,
  `readStackStatus`, `resetLocalDatabase` and `proveMigrationsReplayed` currently hard-code
  REPO_ROOT (F1). Each gains a workdir/config parameter defaulting to today's value —
  loop-tier call-site behavior is unchanged — and the pool path passes the slot.
  No second copy of the status parser, the prove-local checks or the reset process handling.
  `lockDir()` honors an `AT_LOCK_DIR` env override (gate-1 [13]), the same pattern as
  `AT_REPO_ROOT`; the default is unchanged; the db-pool selftests set it so their claims never
  touch the machine-wide lock directory.
- **D10. One place builds configs.** All TOML reading and generation lives in db-pool.ts
  (TypeScript). The one-time setup is a CLI entry in the same file (`bun
  tests/at/harness/db-pool.ts setup`, the `import.meta.main` pattern runner.ts uses): create
  both slot directories, generate both configs from the current tree + identity overlay, start
  both stacks via the pinned CLI, print both status reports. The PowerShell helpers
  (`loop/work/db-slots.ps1`: `Reserve-DbSlot`, `Release-DbSlot`, `Get-DbSlotPool`) do file
  operations only — reserve, release, list — mirroring the `Acquire-WorkLock` house pattern
  (F9). No TOML logic in PowerShell, so the overlay cannot fork.
- **D11. The evidence line.** One line on the verify transcript, printed by the runner on the
  pool path: `at:verify — db slot <N> (<project_id>, api <port>) — reset OK — migrations: <E>
  expected, <A> applied`. Slot, reset performed, migration state — the ruled three.
- **D12. No slicing.** The diff is one mechanism — pool module, its selftests, one runner
  hook, small PowerShell helpers, and process-file lines. The parts reference each other; a
  per-slice code gate would review the claim logic apart from the tests that pin it. One
  draft-code gate reads the whole diff.
- **D13. One shared invocation helper (ruling E1, §8; added by the resumed draft sitting,
  2026-08-10).** Every slot CLI invocation goes through one helper in db-pool.ts. The helper:
  sets `SUPABASE_PROJECT_ID=<slot project id>` positively in the child env; strips every other
  `SUPABASE_*` variable; invokes `bun --no-env-file` per the house rule; sets the child working
  directory to the slot. The destructive path (reset, stop) performs an identity read through
  the same helper first — the status the CLI reports must carry the slot's ports, and any
  project identity it reports must be the slot's — and refuses loudly on mismatch. The read is
  structurally ON the destructive path, never a separate call a caller can skip. This applies
  to every slot-aimed use of the parameterized runner helpers (D9) too.

## 4. Steps, each with its done-criterion

Build order note: the ruled text says the spike comes FIRST — before anything is built ON the
wall. The spike needs the slots to exist, so S1–S2 create them, S3 proves the wall, and only
then S5 builds the runner hook on top of it.

- **S1. `tests/at/harness/db-pool.ts`** — pool root resolution (D1), config read/overlay/
  generation (D2, D3), `readPool`, `occupy` (D4), `prepare` (D3, D7), `stackEnv`, `release`,
  `evidence` (D11), the personal-block guard (D5), reservation lookup (D6), and the `setup`
  CLI entry (D10).
  *Done when:* `bun run typecheck` is green; every name the item lists (`readPool / occupy /
  prepare / stackEnv / release / evidence`) is exported; the guard (D5) runs on every
  destructive path.
- **S2. Setup run on the dev machine** — `bun tests/at/harness/db-pool.ts setup`; transcript
  to `loop/items/AI4DEV-79/setup-pool.txt`.
  *Done when:* `supabase status --workdir` for slot-1 and slot-2 reports loopback URLs on the
  55321 and 56321 blocks respectively (this also settles F8's unverified `--workdir` claim);
  a plain read of the personal stack's status still reports the 54321 block untouched. The
  personal-stack check is a read; setup performs no write to it. The committed transcript is
  scanned clean first (gate-1 [14]): no `eyJ` token, no anon or service-role key value, no
  database password.
- **S3. The isolation spike — AMENDED by ruling E5 (§8) after the incident; this text
  replaces the original procedure, which stands in the history at commit 6429e7e.** Run once,
  through the pool module's own `spike` CLI entry — never a hand-written script (E1).
  Transcript to `loop/items/AI4DEV-79/spike-isolation-2.txt`; the first spike's transcript
  stays committed as the incident record.
  Hard constraint (founder, 2026-08-10): no command starts, stops, resets, connects to, or
  writes to the personal stack. Docker READS (`docker ps`, `docker inspect`, `docker volume
  ls` / `volume inspect`) are the only permitted interaction with it.
  Hostile condition, mandatory: the spike parent process carries
  `SUPABASE_PROJECT_ID=<the personal project id>` in its own environment — the exact override
  that caused the breach — while the tracked `.env` stays in place unmodified. The transcript
  prints that the variable was present in the parent.
  Procedure: (a) BEFORE snapshot — docker-level identity record of every personal container
  (container id, created timestamp, image, port bindings) and every personal volume (name,
  CreatedAt); (b) preflight — status through the shared helper (D13) proves slot-1 and slot-2
  answer on the 55321 and 56321 blocks; (c) canary row in slot-1's database; (d) canary row in
  slot-2's database — the row the reset must DESTROY (gate-1 [7]); (e) the helper's
  pre-destructive identity read on slot-2, visible in the transcript; (f) `db reset` aimed at
  slot-2 through the helper, hostile env present; (g) slot-1 canary PRESENT and slot-2 canary
  GONE; (h) AFTER snapshot — equal to (a) on every identity field: same container ids, same
  created timestamps, same port bindings, same volume set, same volume CreatedAt values.
  Run-state fields are excluded from the comparison: one personal container restart-loops on
  its own (`vector`, observed on all three stacks, 2026-08-10), and run state is not the
  breach signature — recreation is. Canary connections go only to slot ports; the spike opens
  no connection to any 54321-block port.
  *Done when:* the transcript shows the hostile variable present in the parent; the identity
  pre-read naming slot-2's target before the reset; the slot-2 canary destroyed by the reset;
  the slot-1 canary surviving it; and the before and after docker snapshots equal on every
  identity field. The committed transcript is scanned clean per gate-1 [14]. The slot-2 reset
  here also settles F4 for slots: the config references `./seed.sql`, the mirror reproduces
  its absence (E3), and a reset that succeeds settles the claim on a slot identity this time.
- **S4. `tests/at/harness/db-pool.selftest.ts`** — no Docker, temp pool roots via
  `AT_DB_POOL_ROOT`, temp lock dirs via `AT_LOCK_DIR` (gate-1 [13]), runnable on CI (F7).
  Named tests, each its own `it()`:
  (1) two concurrent occupies on one slot → exactly one wins; (2) dead-pid claim → loud
  takeover, and `tookOverFrom` recorded in the new claim; (3) the pool module's occupy/release
  pair releases in a `finally` when its caller throws — unit level, the honest scope of a
  Dockerless test (gate-1 [11]); (4) the evidence line carries slot + migration state; (5) the
  personal-block guard refuses a 54321-block config and the repo project id; (6) no
  reservation and no override → refusal that names `Reserve-DbSlot`; (7) the identity overlay
  changes exactly the identity fields and nothing else (byte-compare the rest), including the
  generalized port rule (an enabled `smtp_port` maps, an out-of-band port refuses — gate-1
  [5]); (8) a LIVE holder is never taken over — dead-pid-only policy refuses and names the
  holder (gate-1 [3]); (9) the branch parser fails closed — zero ids, one id, several ids
  (gate-1 [12]).
  *Done when:* `bun run at:selftest` is green including this file, on a machine with no
  running stack.
- **S5. The runner hook** (D8, D9) in `tests/at/harness/runner.ts`.
  *Done when:* typecheck green; the loop-tier oracle holds (gate-1 [10]): the full output of
  `bun run at:verify req-001 --tier loop --expect` captured on main and on the branch head,
  volatile tokens normalized (durations, temp paths, dates), diff EMPTY, both normalized
  transcripts and the diff committed and scanned clean per gate-1 [14]; the integration path
  resolves the stack only through db-pool; the drill path refuses per D8; the pool claim is
  stored in the same `lock` variable `cleanupRun` releases, so release stays in the existing
  `finally` chain (gate-1 [11]).
- **S6. Reservation helpers and process lines** — `loop/work/db-slots.ps1` (D10);
  `.claude/skills/work/SKILL.md`: the claim step gains the admission-control line (reserve
  before claiming; full pool → the item is REJECTED at start, stated; database-free items skip
  the reservation, stated at start), the spawn-facts line gains the reserved slot as an item
  fact, the sweep step gains `Release-DbSlot`.
  *Done when:* the helpers dot-source and run under Windows PowerShell 5.1; `Reserve-DbSlot`
  on a full pool returns a rejection, not a wait; `Release-DbSlot` refuses a reservation
  naming a different item, and refuses while a live occupancy claim exists on the slot
  (gate-1 [2]); the three SKILL.md touch points read correctly in context.
- **S7. The record** — commit setup and spike transcripts and this plan's amendments as they
  happen; every phase boundary pushes.
  *Done when:* the item directory carries `setup-pool.txt` and `spike-isolation.txt` committed,
  and `git status --porcelain` is empty at every sitting close.
- **S8. End-to-end proof of the changed path** (gate-1 [9]) — AMENDED by ruling X2 (§9);
  the audit finding [A1] (§10) caught this step still carrying its original text after §5's
  row was amended, and this rewrite is that record fix. The original text stands in the
  history at commit 63dfe3d. Goal phase, on the dev machine: one real verify of the changed
  path through the pool with `AT_DB_SLOT` set (the D6 override; this run is the evidence
  gathering the override exists for). Transcript to
  `loop/items/AI4DEV-79/integration-run.txt`.
  *Done when (as corrected by X2):* `tests/at/expected/req-001.json` declares the loop tier
  only, so `--expect` refuses at the integration tier — NO integration-tier green exists or
  is claimed. The criterion is the changed path end to end: occupancy claimed, prepare ran,
  both identity instruments visible, the evidence line naming the slot, the suite executed
  on the slot's env, the claim released — and the committed transcript is scanned clean per
  gate-1 [14].

## 5. Expected verification state

No acceptance-test ids exist on this item (foundation work). The goal state for the fix-and-goal
sitting, all on the item branch:

| check | expected |
|---|---|
| `bun run typecheck` | green |
| `bun run at:selftest` | green, now including the nine named db-pool tests (S4) |
| `bun run at:check req-001` | green, unchanged |
| `bun run at:verify req-001 --tier loop --expect` | green, and the normalized main-vs-branch output diff is EMPTY (S5, gate-1 [10]) |
| S8: one integration-tier verify via the pool, `AT_DB_SLOT` set | AMENDED by ruling X2 (§9): req-001 declares the loop tier only, so `--expect` refuses at integration; the criterion is the changed path end to end — occupancy, prepare, both identity instruments, the evidence line naming the slot, suite executed on the slot env, claim released — transcript committed (S8, gate-1 [9], X2) |
| S3 spike done-criterion (amended, E5) | met once, transcript `spike-isolation-2.txt` committed — hostile env present, identity pre-read shown, slot-2 canary destroyed, slot-1 canary surviving, personal docker snapshots equal on every identity field |
| every committed transcript | scanned clean: no `eyJ` token, no key value, no db password (gate-1 [14]) |
| CI required check `verify` | green on the final head (it runs the first four rows; it cannot run the spike or the integration run — F7, no Docker) |

What the green does NOT claim, stated now so no later phase inflates it: CI proves the pool's
claim logic and guards on temp directories; only the committed setup, spike and
integration-run transcripts prove real stacks, real ports, the real wall and the real runner
path, and they prove it on the dev machine at the recorded commit, once.

## 6. Risks, residuals, and one reading made explicit

- **The drill tier residual (F2, D8, amended by gate-1 [4]).** After this item, `--tier
  drill` refuses as INFRASTRUCTURE instead of resetting the repo-config stack — the last
  harness path that could reach the personal stack is closed in code. The coordinator still
  gets a follow-up to file: decide the drill tier's stack, in words, as its own item; that
  item replaces the refusal.
- **The "untouchable" reading.** The ruled text makes the personal stack "OUTSIDE the pool,
  untouchable", and the same ruled text's spike requires a canary row IN the personal stack.
  These reconcile as: the POOL — its machinery, its resets, its tests — never targets the
  personal stack's identity (D5 enforces this in code, S4 tests it); the one-time spike proves
  that wall, and its personal-stack canary is the founder's own ruled proof, performed in a
  scratch schema and removed, leaving zero residue (S3). The recurring selftests never open a
  connection to any 54321-block port: they run on temp directories with no Docker at all.
  SUPERSEDED 2026-08-10 by ruling E5 (§8): after the incident and the founder's answer, the
  re-proof touches the personal stack not at all — its survival instrument is the docker-level
  identity snapshot, and no canary ever enters the personal database. The paragraph above
  stays as the record of the original reading.
- **Config regeneration vs "warm" (D3).** A restart on functional-config drift is not a
  reopening of the warm-slots ruling: warm remains the steady state; a restart happens only
  when the item tree's own config differs from what the running slot was started with, which
  is exactly when a warm stack would grade the wrong behavior.
- **Two standing stacks cost real memory and containers.** Ruled ("standing"), so accepted;
  the setup transcript records what actually started, so the cost is visible.
- **Unverified runtime claims, routed to steps:** `--workdir` semantics (F8 → S2); reset with
  a configured-but-absent seed file succeeds (F4 → S2/S3, the slot reset runs before any
  suite depends on it); edge-runtime hot reload picks up functions copied after start (F5 →
  S3 window or the first integration run — if false, prepare restarts the slot after the
  copy, a contained change inside `prepare()`).
- **Port collisions with unrelated software** on 55321/56321 blocks: `supabase start` fails
  loudly at setup time; the setup transcript catches it on this machine now, not mid-item
  later.
- **The identity-read instrument is coupled to the CLI's output shape** (gate-2 [F4], §9). The
  container-token scan and the personal-id substring check both read what the pinned CLI
  (`supabase ^2.110.0`) prints in status output. A CLI upgrade that changes that shape must
  re-prove the instrument. [T2]'s docker corroboration on the destructive path narrows the
  exposure; it does not remove it.

## 7. Gate-1 rulings

Written by the draft sitting (orchestrator, fable @ xhigh), 2026-08-10. Gate 1: sol
(gpt-5.6-sol) via codex @ xhigh, sandbox read-only, 15 findings; distillate at
`artifacts/gate1-sol-distillate.md`, count line matched. Every finding is ruled here, the claim
quoted verbatim. The amended sections in §2–§6 carry the binding text; each ruling names them.
Dispositions: 11 accepted, 4 accepted-fixed-differently, 0 rejected. No ruling removes work, so
no removal verification conditions exist.

**[1] ACCEPT** — claim: "File equality cannot enforce D3's invariant that the on-disk config
describes the successfully restarted stack."
The crash window is real: a config write followed by a death before the restart leaves equal
text and a stack still running the old behavior. Fix: prepare compares the regenerated config
against a marker written only AFTER a successful start — `slot-N/.last-start.json` (config
hash, timestamp, pid). Equal hash → keep the warm stack. Different or absent marker → write
config, restart, and write the marker only when the restart succeeds. D3 amended.

**[2] ACCEPT, FIXED DIFFERENTLY** — claim: "D4 and D6 create separate reservation and occupancy
files instead of the ruled single per-slot claim transitioning between reserved and occupied
states."
The races sol names are real and are fixed three ways: (i) `Release-DbSlot` deletes a
reservation only when it names the item being swept — an ownership-checked release; (ii)
`Release-DbSlot` refuses loudly while a live occupancy claim exists on that slot; (iii)
`occupy` re-reads the reservation after the claim is acquired and releases-then-refuses if it
no longer names the runner's item. The single-file shape itself is not adopted: the ruled
text's own parenthetical describes occupancy as an "atomic create-new claim", and a create-new
cannot target a file that already exists holding the reservation. The two ruled states are
materialized as two files with one owner each; the three fixes close every gap sol names
between them. D4 and D6 amended; S6's done-criterion extended.

**[3] ACCEPT** — claim: "Reusing `acquireStackLock` permits takeover of a live occupier after
`LOCK_STALE_MINUTES`, not only takeover of a dead PID."
Verified at runner.ts:285-288 this sitting. The ruled text says "dead holder pid" — the code
must match it. Fix: `acquireStackLock` gains a takeover-policy parameter; the pool passes
dead-pid-only, so a live holder is never taken over at any age — occupy refuses loudly and
names the holder instead. Existing call sites keep today's default, so the runner selftests
stand. D4 amended; S4 gains a named test.

**[4] ACCEPT, FIXED DIFFERENTLY** — claim: "D8 deliberately leaves the drill tier resetting the
repo-configured personal stack despite the settled requirement that this stack remain
untouchable."
Verified this sitting: nothing in the tree invokes `--tier drill` — no script, no CI step, no
process file; only type definitions and oracle-capability tests name it. Routing drill through
the pool would widen the ruled hook, which is pinned to the integration tier — that is not this
plan's call. So the drill tier REFUSES as INFRASTRUCTURE: "the drill tier's stack is not yet
decided" — it no longer reaches any stack, personal or slot. Nothing breaks, and the reset path
sol names is closed in code, not by a filed intention. The follow-up item that decides drill's
stack replaces the refusal. D8 amended; the §6 residual is rewritten; the coordinator still
gets the follow-up to file.

**[5] ACCEPT** — claim: "The identity overlay omits valid host-port fields such as
`local_smtp.smtp_port` and `local_smtp.pop3_port` shown in `supabase/config.toml:110-111`."
Verified: both keys exist, commented today, and an item may enable them. The overlay
generalizes: every ACTIVE key named `port` or ending `_port`, in every section, with a value in
54000–54999, maps to value + N*1000; `edge_runtime.inspector_port` keeps its special case
(8083 → 8083 + N*10); any other port value refuses loudly as unmappable. D5's personal-band
scan covers every port-valued key, not a fixed seven. D2, D3 and D5 amended; S4 test 7 covers
the generalization.

**[6] ACCEPT, FIXED DIFFERENTLY** — claim: "D7's fixed copy set is not the dependency closure
of the item's regenerated config."
The hazard is real; the proposed fixture-probe is not adopted — F6 already measured the
missed-env behavior, and a probe proves one config once, not the rule. Fix instead, fail
closed: after regeneration, prepare scans the config for active relative-path values (seed
`sql_paths`, `schema_paths`, email template files, TLS and signing key paths) and refuses
loudly on any path it cannot copy from the item tree — no stack starts half-provisioned. Env
policy recorded as a decision: slot start and restart inherit the invoking process env; a
missed `env()` resolves to a literal string and does not stop the stack (F6, measured). D7
amended.

**[7] ACCEPT** — claim: "The isolation spike has no canary in slot 2 that must disappear."
Correct, and the miss matters: without a vanishing canary, a no-op reset satisfies the whole
done-criterion. The spike adds a canary row in slot-2 BEFORE the reset; the done-criterion
requires it GONE after the reset, beside the two surviving canaries. S3 amended.

**[8] ACCEPT** — claim: "Personal scratch-schema cleanup is only the last procedural step, not
guaranteed by a `finally`-style cleanup."
The spike runs inside try/finally; the scratch-schema drop is the finally. A failed drop is
reported loudly with the exact manual cleanup command. S3 amended.

**[9] ACCEPT** — claim: "No done-criterion executes the new integration runner path end to
end."
Correct — under the plan as written, the changed branch never runs before merge. New step S8
(goal phase): one real integration-tier verify on the dev machine through the pool —
`bun run at:verify req-001 --tier integration --expect` with `AT_DB_SLOT` set — green, the
evidence line naming the slot, redacted transcript committed. §5 gains the row.

**[10] ACCEPT** — claim: "A green `--tier loop --expect` run does not prove byte-identical
output against main."
The oracle is now defined: capture the loop-tier verify's full output on main and on the branch
head, normalize volatile tokens (durations, temp paths, dates), and diff. An empty diff is the
done-criterion; both normalized transcripts and the diff are committed. S5 amended.

**[11] ACCEPT, FIXED DIFFERENTLY** — claim: "The Dockerless \"suite throws\" selftest has no
specified seam capable of exercising the runner's occupied integration path."
Correct that no seam exists without refactoring `main`, and a refactor made only for a test is
not adopted. The test's claim narrows to what a Dockerless test can prove: the pool module's
own occupy/release pair releases in a `finally` when its caller throws — unit level. The
runner-level guarantee is delivered structurally: the pool path stores its claim in the SAME
`lock` variable `cleanupRun` already releases (D9), S5's done-criterion pins that, and the
draft-code gate reads it. S4 test 3 reworded.

**[12] ACCEPT** — claim: "D6 does not define a fail-closed branch parser for detached HEAD, no
Git executable, or branches containing multiple item IDs."
The parser becomes a pure function over the branch string: exactly one item id, or it refuses.
Zero ids, several ids, detached HEAD, or a failed git call → refusal as INFRASTRUCTURE naming
the condition. Never the first match. D6 amended; S4 gains parser tests (zero / one / many).

**[13] ACCEPT** — claim: "`AT_DB_POOL_ROOT` does not isolate the occupancy claim used by the
proposed selftests."
Verified: `lockDir()` (runner.ts:255-260) has no override. Fix: `lockDir` honors `AT_LOCK_DIR`
(the same pattern as `AT_REPO_ROOT`); the default is unchanged; the db-pool selftests set it.
D9 amended.

**[14] ACCEPT** — claim: "The committed setup transcript has no redaction or 'contains no
credentials' done-criterion."
Every committed transcript — S2 setup, S3 spike, S8 integration run, S5 baselines — passes a
scan before commit: no `eyJ` token, no anon or service-role key value, no database password.
The clean scan is part of each done-criterion. S2, S3, S5 and S8 amended.

**[15] ACCEPT** — claim: "F7 incorrectly states that the required check runs on
`ubuntu-latest`."
Verified at ci.yml:44: `runs-on: ${{ vars.CI_RUNNER_LABEL || 'ubuntu-latest' }}`. F7 is
corrected: the check runs on ubuntu-latest, or on a self-hosted runner when that repository
variable is set. The constraint this plan takes from F7 stands unchanged — every test this item
adds must pass with no live stack and no Docker, on either runner.

## 8. INCIDENT — the spike destroyed the personal database (draft sitting, 2026-08-10)

The isolation spike (S3), run by the draft executor, destroyed the founder's personal local
database instead of proving the wall. This section records the measured facts, the rulings on
them, and what is blocked until the founder decides. The orchestrator verified every fact below
with its own instruments after the executor's report.

### The facts, measured

- `supabase db reset` aimed at slot-2 — `--workdir <slot-2>` AND process working directory in
  the slot — removed and recreated the container `supabase_db_poancmeitlmxejofwzuu`: the
  founder's personal database, bound to slot-2's port 56322. The bind then failed (slot-2's
  real container holds that port), so the personal db container now sits in state `Created`,
  not running.
- The personal db VOLUME was recreated at 2026-08-09T22:04:38Z, the moment of the reset; the
  sibling personal volumes keep their 2026-08-08 timestamps. The old volume — the founder's
  local data — is deleted. The schema is reproducible from `supabase/migrations`; hand-made
  rows are not, unless a backup exists outside Docker that only the founder knows about.
- Root cause: the tracked `.env` at the repo root, line 1, `SUPABASE_PROJECT_ID=
  "poancmeitlmxejofwzuu"`. The Supabase CLI treats that variable as a `project_id` OVERRIDE,
  so the slot's config supplied the ports while the environment supplied the personal
  identity. The override reaches the CLI by two routes: the process environment, and env-file
  loading in the invoking runtime. The hand-written spike script closed neither route; the
  pool module's own `childEnv()` allowlist closed both, which is why S2's setup built correct
  slot containers.
- **F8 is settled AGAINST the plan: `--workdir` is NOT the wall.** D1's "outside every
  worktree" layout stands, but nothing about `--workdir` isolates identity.
- Collateral: F4's "reset with a configured-but-absent seed succeeds" verification is TAINTED
  — the reset that appeared to succeed was acting on the personal identity. It returns to
  unverified, settled by the re-run spike.
- The slot-2 canary SURVIVED, proving the reset never touched slot-2 — gate-1 [7]'s vanishing
  canary did exactly its job: without it, this spike could have read as a pass.

### Rulings

- **E1. The wall is positive identity, never absence of an override.** Every slot CLI
  invocation goes through ONE shared invocation helper in db-pool.ts — no role ever hand-rolls
  a slot CLI command again, the spike script's exact mistake. The helper: (a) sets
  `SUPABASE_PROJECT_ID=<slot project id>` explicitly in the child env; (b) strips every other
  `SUPABASE_*` variable; (c) invokes `bun --no-env-file` per F8's house rule; (d) sets the
  child working directory to the slot. Before any DESTRUCTIVE act, a read through the same
  helper must prove the resolved target: the status the CLI reports carries the slot's project
  id and ports — mismatch refuses loudly. D5's guard now bites at the layer that was actually
  breached.
- **E2. S3 and S5 are BLOCKED until the founder decides.** The spike must re-run to prove the
  amended wall, and S5 is built only on a proven wall (the plan's own build-order rule). No
  role starts, stops, resets or repairs the personal stack — recovery is the founder's alone.
- **E3. Executor reading RATIFIED, amending D7 and gate-1 [6]:** the closure rule is "mirror
  `supabase/` entire; refuse on active references outside `supabase/`". The literal per-path
  refusal would false-refuse today's tree — `sql_paths = ["./seed.sql"]` is active and
  `seed.sql` does not exist (F4); the mirror faithfully reproduces the absence.
- **E4. Executor reading RATIFIED, amending D2's general port rule:** the overlay applies to
  the local stack's LISTENER ports only (api, db, shadow, pooler, studio, local_smtp web/smtp/
  pop3, analytics, edge_runtime inspector). A client-connection port to an external service —
  e.g. a real `[auth.email.smtp] port = 587` — is data, passes through unchanged. D5's
  personal-band refusal stays broad over all port keys: fail-closed and loud is correct there.

### Draft status at the interruption

S1 done (typecheck green). S2 done, criteria met, transcript committed. S3 run and FAILED —
done-criterion not met, wall disproven, transcript with postscript committed. S4, S5, S6 not
started. The draft is incomplete; no draft-code gate can read it yet.

### Founder decisions and the re-proof ruling (resumed draft sitting, 2026-08-10)

The founder answered, relayed verbatim by the conductor (2026-08-10, morning, founder local
time): "Personal can stay stopped. And continue 79." Mapped to the three questions above:

1. **Recovery:** no agent recovers, starts, stops, or repairs the personal stack. It stays as
   the founder leaves it.
2. **Spike sequencing:** not ruled explicitly. The first answer fixes the CONSTRAINT — the
   re-proof must not require starting the personal stack, and no agent may touch it. The shape
   inside that constraint is the orchestrator's ruling: E5 below.
3. **Proceed:** yes — the item continues.

Observed at sitting open (2026-08-10 09:30 founder local), recorded and not acted on: the
personal db container was recreated at 2026-08-09T22:30:25Z — 26 minutes after the breach —
and has run healthy on its correct port 54322 since; the recreated data volume dates
2026-08-09T22:25:17Z. Recovery happened outside the item, before the founder's morning answer.
Recovery is the founder's alone (E2), so this is consistent, and no item agent touched the
stack. Ruling E5 makes the re-proof independent of the personal stack's run state, so this
observation changes no step; it corrects the "container dead in state Created" line above,
which described 2026-08-09 22:04–22:30 only.

- **E5. The re-proof shape: a zero-touch pass under the hostile condition.** The amended S3
  (§4) proves the wall with zero interaction with the personal stack beyond docker-level
  reads. Three instruments replace the original personal-stack canary:
  (1) the vanishing slot-2 canary and the surviving slot-1 canary — reset scope, exactly as
  gate-1 [7] required; (2) the shared helper's pre-destructive identity read (E1/D13) —
  positive identity, visible in the transcript; (3) a docker-level before/after snapshot of
  every personal container and volume, compared on identity fields: container id, created
  timestamp, port bindings, volume name set, volume CreatedAt. The breach signature was
  RECREATION — the incident recreated the db container and its volume — so identity-field
  equality is the direct negative of the breach.
  **Why no disposable stand-in plays the personal stack's part:** docker object names derive
  from the project id, so a stand-in carrying the personal project id IS the personal stack's
  container set — creating or removing it would itself touch what must stay untouched — and a
  stand-in under any other id is just another bystander, a role slot-1 already fills. A
  stand-in adds cost and no proof.
  **Why the proof does not depend on the personal stack's run state:** the CLI selects the
  docker objects it acts on by resolved project identity, not by what is running — the
  incident demonstrated this by destroying the personal identity's containers while running
  slot-2 went untouched. A leak under the amended helper surfaces as one of: the identity
  pre-read reporting the wrong target (refusal before the reset), the reset acting on the
  personal identity (snapshot mismatch), or the reset failing to act on slot-2 (the canary
  survives and the done-criterion fails). No leak shape produces a green transcript.
  **The hostile condition is mandatory:** the spike parent deliberately carries the `.env`
  override that caused the breach, so a pass proves the helper closes the route WHILE the
  route is loaded — not that the route happened to be empty on the day.
- **E2 amended: UNBLOCKED (founder, 2026-08-10).** S3 as amended runs now; S5 follows only
  after S3's done-criterion is met, per the plan's build-order rule. The no-touch rule on the
  personal stack is unchanged and permanent.

### Draft-pass ratifications (resumed draft sitting, 2026-08-10)

The draft executor (opus) completed E1/D13 with E3 and E4 folded, the amended S3, S4, S5 and
S6 in one invocation. The spike ran twice inside it: the first run stopped on a leftover
canary table in slot 1's database — a client problem, no identity resolved, the personal
snapshot already IDENTICAL on that attempt — and the postscript of
`loop/items/AI4DEV-79/spike-isolation-2.txt` records both runs. The wall is re-proven under
the hostile condition; the orchestrator read the transcript and confirmed the personal
stack's docker identity with its own instrument. Four executor judgment calls, ruled:

- **E6. The identity pre-read instrument — RATIFIED.** E1's "any project identity the CLI
  reports matches the slot id" clause is implemented as a strict scan over every `supabase_*`
  container-name token in the CLI's own status output: every token must end in the slot's
  project id, the personal project id must appear nowhere, and `localStackProblems` must pass
  against the slot's config. The executor's observation is correct and recorded: ports alone
  would NOT have caught the incident — the hybrid invocation reported slot-2's ports
  correctly; the container names carry the RESOLVED project. The pre-read stays a
  corroborating instrument; the wall itself is the positive `SUPABASE_PROJECT_ID` plus the
  working directory (E1).
- **E7. The scan's fail-closed bias — ACCEPTED.** A `supabase_*` token that does not end in
  the slot's project id refuses loudly, so an unknown token false-refuses rather than passes.
  A false refusal is loud and costs a look; a false pass destroyed a database. Consistent
  with D2's unmappable-port refusal and D6's fail-closed parser.
- **E8. Two selftests beyond the nine named — KEPT.** The positive reservation-lookup case
  and the guard-accepts-a-generated-slot-config case exist so the refusal tests cannot pass
  vacuously. Gate 1's central theme was oracles too weak to prove their claim; these apply
  that lesson.
- **E9. Watcher-file churn — RATIFIED as housekeeping.** The conductor's remote-tip watcher
  (`artifacts/watch-tip.sh`, a tracked file) rewrites its own base pointer after every push,
  so the tree goes dirty moments after each close. The executor committed the arrived change
  unaltered, labelled as not-item work; this sitting did the same. Recorded here so the
  change-scope check downstream reads these commits as declared, not as scope drift.

## 9. Gate-2 rulings (fix sitting, orchestrator on fable, 2026-08-10)

Gate 2 was a panel of two, each blind to the other. Reader one: terra via codex @ max,
read-only sandbox — 13 findings, distillate `artifacts/gate2-terra-distillate.md`, count line
matched. Reader two: flash via opencode, agent `reviewer-flash`, variant max — 9 findings plus
four notes outside the findings, distillate `artifacts/gate2-flash-distillate.md`, count line
matched. Every finding is ruled here with the claim quoted verbatim. Neither seat outvotes the
other; convergences are named because a panel converging on one defect is its strongest signal.

Dispositions: terra — 8 accepted, 4 accepted-fixed-differently, 1 rejected. flash — 9 accepted,
0 rejected; all four notes ruled below. No ruling removes work, so no removal verification
conditions exist. One ruling ([T2]) carries a verify-first component for the executor.

### Terra's findings

**[T1] ACCEPT — the critical.** Claim: "An empty or partially written lock file is treated as a
dead holder under `dead-pid-only`, so a second occupier can delete a live process's just-created
claim."
Verified at runner.ts:440: `readHolder` returns `{}` for an unreadable or half-written file, and
`holderIsLive({})` is false under every policy — so an unidentifiable holder is takeover-eligible
even under the policy whose ruled meaning is "a DEAD HOLDER PID and nothing else". The window is
the microseconds between `openSync(file, 'wx')` and the `writeSync`, and it is real. Fix, scoped
to `dead-pid-only`: an unidentifiable holder is NEVER takeover-eligible. After one bounded
re-read (a short pause, then read again — enough to skate over the write window), a holder that
still has no parseable pid refuses loudly, naming the file and the manual deletion path. The
same guard applies to the re-read INSIDE the takeover gate, so the gate cannot remove an
unidentifiable file either. `stale-or-dead` keeps today's behaviour: that path predates this
item and is another item's business if anyone wants it changed.

**[T2] ACCEPT, with a verify-first component.** Claim: "`proveSlotTarget` accepts a valid status
result containing zero `supabase_*` container tokens, so its project-identity check can pass
vacuously."
True by code: `foreignContainerNames` on empty input returns nothing, `carriesPersonal` is
false, and the read proceeds on port checks alone — the exact hybrid shape the incident wore
(right ports, wrong project) passes if the CLI prints no container names. Fail-closed (E7) says
absence of identity evidence must refuse a destructive act. VERIFY FIRST (executor, read-only):
run `status -o json` through the helper on a slot and measure whether `supabase_*` tokens appear
in the combined output. Then: destructive acts require POSITIVE identity evidence — at least one
`supabase_*` token ending in the slot's project id when the measurement shows tokens appear; and
in every case a docker READ (`docker ps` filtered on the slot's own project id) must confirm the
slot's own db container exists before a reset. Docker reads are the one permitted instrument on
the untouchable stack and are unrestricted on slots. This also narrows [F4]'s residual: the CLI
output shape is no longer the only instrument.

**[T3] ACCEPT — amends ruling E3 (convergence with flash [F3]).** Claim: "The full-tree mirror
copies ignored `supabase/.temp` and `.branches` runtime state into slots."
Both seats found this independently. `supabase/.temp` is the CLI's runtime state about the
PERSONAL stack — and `.gitignore` itself says its `start-secrets/**` "must NEVER be committed" —
so the mirror carries another stack's identity residue and secrets into every slot. E3's
"mirror entire, no filter" is narrowed, not removed: the mirror carries the item tree's PROJECT
SOURCE entire; the CLI's own runtime directories `.temp` and `.branches` are not project source
and are excluded, as is `config.toml` (see [T11]). `pathClosureProblems` gains the matching
refusal: a config path that resolves into `.temp` or `.branches` refuses loudly, so the closure
guarantee stays honest about the exclusions.

**[T4] ACCEPT (convergence with flash note 2).** Claim: "The `spike` command resets slot 2
without acquiring either slot's occupancy claim."
D6's own ruled sentence — "the occupancy claim still applies" for override runs — is not
implemented by the spike, which calls `resetSlotDatabase` and writes canaries with no claim
held. Fix: the spike occupies both slots through the normal `occupy` path (dead-pid-only
policy) before touching either, and releases both in a `finally`.

**[T5] ACCEPT, FIXED DIFFERENTLY.** Claim: "`AT_DB_SLOT` bypasses branch-derived reservation
ownership and the post-claim reservation reread even when invoked from a normal item branch."
The framing over-claims: slot STATE is disposable by design ("state is never inherited" — every
occupancy resets from its own tree), so the wall against destruction is the occupancy claim,
which the override keeps, not the reservation, which is admission control. The override itself
is ruled (D6: the founder, the evidence gate, the spike). But a silent stomp on a slot another
item holds is real and cheap to refuse: `occupy` via override now refuses loudly when the
target slot carries a reservation naming a DIFFERENT item than this run can derive (from
`options.item` or the branch); a run that can derive no item treats ANY reservation as foreign.
The refusal names the reservation holder. An unreserved slot, or one reserved for this run's
own item, proceeds as today.

**[T6] ACCEPT.** Claim: "Occupancy locks the previous slot config, while `prepare` can rewrite
that config's listener ports from the current item tree."
The claim file's name derives from `projectId + apiPort` read from the slot's CURRENT on-disk
config, which `prepare` may lawfully rewrite — so two runs bracketing a port change would hold
two different lock files for one slot. Fix: slot claims are keyed on the slot's PERMANENT
identity — project id `ai4good-slot-N` plus a fixed sentinel port — used by `occupy` and by
`readPool`'s occupancy read, and documented at the key. The PowerShell occupancy glob
(`at-verify-ai4good-slot-N-*.lock`) already matches any suffix and is unchanged.

**[T7] ACCEPT (convergence with flash [F1] — same line, both seats).** Claim:
"`resetSlotDatabase`, `stopSlotStack`, and `stackEnv` do not run the broad D5 personal-block
guard themselves."
D5's ruled sentence names "occupy, prepare, reset or emit env"; the code runs `refusePersonal`
on the first two only, and the last two are exported entry points a caller can reach directly —
the spike does. Fix: each of the three runs `refusePersonal` over the slot's on-disk config
text before acting. `stackEnv` keeps its inline URL-port checks besides — they check the
STATUS, which the config guard cannot see.

**[T8] ACCEPT, FIXED DIFFERENTLY — one half of the claim is wrong and is recorded as such.**
Claim: "`edge_runtime.inspector_port` is remapped from any value, including non-numeric values,
instead of refusing every value other than the ruled 8083."
The non-numeric half is false: the `!literal` branch at db-pool.ts:242 refuses before the
inspector case is reached. The numeric half is right: any numeric inspector value is remapped
by +N*10, which is a guess for every value except the ruled 8083, and a guess is what D2
forbids. Fix: the special case pins to exactly 8083; any other inspector value falls through to
the generic listener rule — in-band maps, out-of-band refuses loudly.

**[T9] REJECT.** Claim: "`Release-DbSlot` checks occupancy and deletes the reservation without
an atomic handoff."
The TOCTOU window is real and changes nothing destructive. The serializer for destructive acts
is the occupancy claim (dead-pid-only; a live holder is never displaced): a runner that slips
into the window still holds its claim, so the worst outcome is the NEXT item's occupy refusing
loudly until the window closes — a loud refusal, not a reset under a live run. An atomic
two-file handoff in PowerShell 5.1 would buy no safety the claim does not already provide.
Recorded as a residual beside the sweep helper's comment.

**[T10] ACCEPT.** Claim: "Two concurrent `Reserve-DbSlot` calls for the same item can reserve
both slots."
True by walk-through: both pass the already-held scan, one wins slot 1, the loser's catch
records "held" and advances to slot 2, and one item holds the whole pool. Fix: in the
create-failure catch, re-read the reservation; when it names the same item, return
`alreadyHeld` for that slot instead of advancing.

**[T11] ACCEPT, FIXED DIFFERENTLY.** Claim: "An interruption between delete/copy and
regenerated-config write can permanently strand a slot before the marker recovery logic runs."
Ruling this surfaced something worse than stranding: between the mirror and the config write,
the slot's `config.toml` IS the item tree's config — the personal identity — on disk in a slot
directory. A crash in that window leaves a slot wearing the personal identity (occupy would
refuse loudly, but the file should never exist at all). Fix: the mirror excludes `config.toml`
(with [T3]'s exclusions, one mechanism) and the generated config is written immediately after —
so no slot config ever carries the personal identity, even transiently, and a crash in the
window leaves NO config rather than a wrong one. The missing-config refusal in `occupy` names
both causes (never set up; a prepare that died mid-window) and the one-command repair. Not
permanent, and loud at every step.

**[T12] ACCEPT (convergence with flash [F2], second half).** Claim: "The personal Docker
snapshot can report `IDENTICAL` when both before/after queries return zero containers and
volumes."
A vacuous pass on the spike's central instrument — gate 1's whole theme. Fix: a new spike
criterion requires the BEFORE snapshot non-empty (at least one personal container AND one
personal volume recorded); an empty snapshot fails the run.

**[T13] ACCEPT, FIXED DIFFERENTLY.** Claim: "The path-closure check validates lexical paths but
does not resolve symlinks under `supabase/`."
Real, and resolving symlinks lexically is the wrong instrument. Fix, fail-closed and total: the
mirror refuses loudly on ANY symlink found under the item tree's `supabase/` before copying.
The tree carries none today (the executor confirms the scan passes), so nothing breaks, and a
symlink smuggled in later refuses instead of copying as a link that points wherever it likes.

### Flash's findings

**[F1] ACCEPT — same defect as [T7], one fix.** Claim: "The D5 personal-block guard
(`refusePersonal`) runs on occupy/prepare/stackEnv but NOT on the exported destructive entry
points `resetSlotDatabase` and `stopSlotStack` — those run only the identity read."
Both seats converged on this line independently. Ruled at [T7]; flash's tampered-config probe
becomes unnecessary once the guard is structural.

**[F2] ACCEPT.** Claim: "The spike's \"slot 2 canary is GONE\" criterion can pass vacuously: if
`readCanary(2)` throws after a successful reset (while the slot-1 read, which runs first,
succeeded), the catch swallows the failure and `resetDone && slot2Canary === null` passes with
the canary never read."
Verified against db-pool.ts:1167-1194: the read order is exactly as claimed, and a slot-2 read
failure after a good slot-1 read passes every criterion. Fix, as the reviewer proposes: the
criteria gain "the spike body completed without an exception" (`failure === null`) and the
non-empty before-snapshot criterion ([T12]).

**[F3] ACCEPT — same defect as [T3], one fix.** Claim: "`mirrorItemTree` copies the item tree's
`supabase/` entire including CLI runtime state — `supabase/.temp` (whose `start-secrets/**` the
.gitignore itself says \"must NEVER be committed\") and `supabase/.branches` — and deletes the
slot's own copies."
Ruled at [T3].

**[F4] ACCEPT, as a named residual.** Claim: "The only instruments that catch the incident's
hybrid shape (slot ports + personal containers) are the `supabase_*` container-token scan and
the personal-id substring check, and both depend on the CLI printing container names/project
ids in status output."
Correct, and not settleable today. Recorded in §6 as a residual pinned to the CLI version in
devDependencies (`supabase ^2.110.0`): a CLI upgrade that changes status output shape must
re-prove the identity-read instrument. [T2]'s docker corroboration narrows the exposure — the
CLI's own output is no longer the only instrument on the destructive path.

**[F5] ACCEPT.** Claim: "`pathClosureProblems` cannot see multi-line array values: `scanConfig`
reads one line per setting, so a valid multi-line `sql_paths = [\n \"./x.sql\"\n]` yields value
`[` and no paths are extracted."
For the OVERLAY an invisible value is copied verbatim — safe. For the CLOSURE an invisible
value is a missed refusal — not safe. Fix: a PATH_KEYS entry whose value opens an array without
closing it on the same line refuses loudly as unscannable, with the one-line rewrite named. A
selftest carries the multi-line fixture.

**[F6] ACCEPT.** Claim: "`setup()` writes the `.last-start.json` marker after a `start` that
did not stop first, and the S2 transcript itself measured that `supabase start` on an
already-running project \"exited zero having created no slot container at all\" — so a setup
re-run over a warm slot with a changed tree config writes a matching marker while the stack
still runs the old config."
The marker's whole meaning (gate-1 [1]) is "written only after a start that provably ran this
config"; a no-op start breaks that meaning. Fix: setup stops the slot before starting it —
`stopSlotStack` is identity-read-guarded and no-ops loudly on a down slot — so the start is
real and the marker truthful. The unverified runtime half (does a slot behave as the personal
identity did) needs no measurement once the condition is removed.

**[F7] ACCEPT.** Claim: "`Get-DbSlotOccupancy` treats a claim pid that exists but is not
inspectable as dead — `Get-Process` throws on another user's process — while the runner's own
`processIsAlive` (runner.ts:282-290) treats EPERM as alive."
An occupancy misread as dead lets `Release-DbSlot` hand the slot away under a live run. Fix:
the catch distinguishes not-found (dead) from every other failure (alive — fail-closed, E7's
bias), matching the runner's semantics.

**[F8] ACCEPT.** Claim: "The PowerShell pool-root resolution uses `$env:LOCALAPPDATA` alone,
while the harness `poolRoot()` (db-pool.ts:87-94) falls back `XDG_CACHE_HOME` → `tmpdir`; plan
D1 promises \"the same base-resolution rule\"."
Two resolution rules for one pool is how the two halves stop seeing each other's files. Fix:
the PowerShell helpers mirror the full chain — LOCALAPPDATA, then XDG_CACHE_HOME, then the
system temp path.

**[F9] ACCEPT.** Claim: "The dead-pid takeover test plants pid 999_999, which is assumed dead
but is not provably dead — a busy machine (Linux pid_max 4194304, Windows pid space larger) can
legitimately hold that pid."
A flaky-by-environment selftest on the exact test that guards the takeover rule. Fix: the test
spawns a real short-lived child, waits for its exit, and plants THAT pid — provably dead at
plant time.

### Flash's notes outside the findings, ruled

- **Note 1 (the D7 wording conflict) — ACCEPTED as a plan correction.** The reviewer is right
  that the code resolves the tension in favour of E1: `supabaseInvocation` strips every
  `SUPABASE_*` and the allowlist drops the rest, so a config `env()` substitution always
  resolves to the F6 literal string on a slot. D7's sentence "slot start and restart inherit
  the invoking process env" is SUPERSEDED by E1's strip — recorded here rather than rewriting
  §3's history. Consequence, named unproved exactly as the reviewer put it: OAuth-dependent
  integration ids will grade the literal-string config on slots — unchanged from the old
  integration path and unexercised today.
- **Note 2 (the spike holds no slot claims) — ruled at [T4]**, where terra's numbered finding
  says the same thing. Convergence noted.
- **Note 3 (out of scope, pre-existing on main)** — `package.json` `db:start`/`db:stop`/
  `db:reset` reach the personal stack directly via `bunx supabase`, and runner.selftest.ts
  writes a probe file into the repo's `supabase/migrations`. Both predate this branch. OUT OF
  SCOPE, per the change-only rule; named here for the coordinator to file as separate work
  alongside the drill-tier follow-up (§6).
- **Note 4 (the one-seam and strip hold under attack)** — a clean verdict on the wall itself
  from the seat that was seated to attack it. Recorded as evidence, not as a finding.

### Rulings on the executor's fix-and-goal report (fix sitting, 2026-08-10)

The fix executor (opus, one invocation, two iterations) implemented every accepted ruling and
ran the goal suite. Five judgment calls came back for ruling:

- **X1. The [T10] completion — RATIFIED (commit bb14267).** The executor implemented [T10]
  exactly as ruled, then MEASURED it: five races out of five still ended with one item holding
  both slots, because the winner's exclusive-create handle holds the reservation file with no
  sharing until Dispose — the loser's re-read gets a sharing violation, not a readable file.
  The completion: the re-read waits out the window (bounded, up to one second), and a
  reservation still unreadable REJECTS the item rather than granting a second slot. That is
  the same remedy [T1] applies to the same window shape in the harness's claim files, and the
  fail-closed direction is E7's. After: eight races out of eight, one item holds exactly one
  slot. The commit stands; its "NOT RULED BY GATE 2" marker is answered by this ruling.
- **X2. S8's done-criterion is CORRECTED against the tree.** S8 as written (gate-1 [9]) said
  `--tier integration --expect`, "the run is green". Discovered at execution:
  `tests/at/expected/req-001.json` declares the LOOP tier only — on this branch and on main
  alike — so `--expect` at integration refuses the declaration before any test runs. The
  criterion as written was unsatisfiable, and writing an integration-tier declaration is a
  decision about the acceptance contract, which is not this foundation item's to make; the
  executor's refusal to write one is RATIFIED. The corrected criterion, met and committed in
  `loop/items/AI4DEV-79/integration-run.txt`: the changed path executes end to end — occupancy
  claimed, prepare ran (mirror, regenerated config, reset, migration proof), BOTH identity
  instruments visible in the transcript ([T2]: the container-token read and the docker
  corroboration), the ruled evidence line naming the slot, the suite executed against the
  slot's env, the claim released, the personal docker snapshot IDENTICAL. What the suite then
  scored at integration tier — 28 pre-existing sut-missing pendings and 9 ids whose suites
  refuse their stubbed capabilities outside the loop tier — is the requirement's own
  pre-existing state on main, not this item's defect, and is recorded here for the
  requirement's own work. §5's table row is amended to match.
- **X3. The oracle baseline is the MERGE BASE, RATIFIED — and the branch stays behind main.**
  origin/main moved ten commits ahead of this branch mid-item; one of them landed new
  acceptance tests for req-001 and moved four ids in the declaration. Gate-1 [10]'s oracle
  exists to prove THIS BRANCH changes nothing on the loop tier, so the honest baseline is the
  commit the branch departs from (c11e352), and the committed diff header says so. The diff is
  EMPTY. Folding main's ten commits in mid-item would widen the audit's subject with foreign
  changes for no safety gain; mergeability is the merge sitting's check, and this fact is
  recorded in PHASE-STATE for it.
- **X4. The [T2] instrument's own residual — RECORDED.** The measurement found the
  container-name tokens exist in status output because the tracked config disables imgproxy
  and the pooler (`Stopped services: [...]`). A future config enabling both would print no
  such line, and destructive acts would REFUSE loudly until the instrument is amended —
  fail-closed (E7), loud, named in the code comment at `ownContainerNames`. The docker
  corroboration is unaffected by that shape.
- **X5. One pre-existing draft defect fixed in passing — RATIFIED.** `db-pool.selftest.ts`
  asserted `/is inside the founder's personal port block/` while the guard has always emitted
  "is inside the personal stack's port block". This branch's own file, invisible until the
  first suite run (the draft contract forbids running the suite), wording aligned, substance
  unchanged.

## 10. Audit rulings (audit sitting, orchestrator on fable, 2026-08-10)

The audit panel of two, each blind to the other, read the record at head 63dfe3d: luna
(gpt-5.6-luna via codex @ max, read-only) returned five findings; flash
(deepseek-v4-flash via opencode, agent reviewer-flash, variant max) returned one finding, with
every other box PASS except git-level facts marked could-not-verify (its cage has no git
tooling — expected, and not a defect). The six findings are disjoint: no convergence exists
between the seats. Every claim below is quoted verbatim from the seat's distillate. No claim
named a foreign item id, so nothing is elided. Finding names: [A1]–[A5] are luna's [1]–[5];
[AF1] is flash's [1].

- **[A1] — ACCEPTED, record-false; the record changes to match the tree.** Luna, on
  `plan.md` §4 S8: "S8 still requires a green integration-tier `--expect` run." — "X2
  correctly says the expected file declares only the loop tier, so `--expect` refuses; this
  stale criterion conflicts with X2 and the integration transcript's 0-green result." TRUE:
  X2 amended §5's table row but left §4's step text carrying the original criterion, so the
  record contradicted itself. The fix is in this same commit: S8's step text now carries the
  X2 correction, on the pattern S3 uses for E5. Record fix only; no code changed for this
  finding.

- **[A2] — ACCEPTED, record-false; the tree changes to match the record.** Luna, severity
  high, on `db-pool.ts:695`: "The `AT_DB_SLOT` override treats an existing unreadable
  reservation as absent." — "`readReservation` converts parse/read failures to `null`, so an
  empty or partial reservation file does not block takeover of a slot reserved for another
  item, violating the fail-closed reservation rule." VERIFIED in source this sitting:
  `readReservation` (db-pool.ts:552) catches every read and parse failure to `null`, and the
  override path at 695 treats `null` as no reservation. The write window is real and already
  measured on this machine (T10/X1: the winner's exclusive-create handle holds the file with
  no sharing until Dispose — a concurrent reader gets a sharing violation, not the content).
  So an override run inside that window takes a slot whose reservation names another item —
  the exact refusal ruling T5 establishes, missing on this one path; fail-open against E7's
  direction. Scope of the harm, stated so the claim stays exact: this defect CANNOT reach the
  personal stack — `refusePersonal` guards that wall independently on every destructive path;
  the harm is a slot-vs-slot collision between items. The ruled fix: a strict reservation
  read for decision paths — absent proceeds; present-but-unreadable waits out the window with
  the same bounded remedy T1 and T10 use, and a reservation still unreadable after the wait
  REFUSES, naming the file. `readPool`'s view read stays lenient (a view refusing to render
  is no safety). The 745 re-read may share the strict read so its message stops calling an
  unreadable file "nobody", behavior direction unchanged (it already refuses). The selftest
  grows: an empty or garbage reservation file plus the override → refusal.

- **[A3] — ACCEPTED.** Luna, severity medium, on `db-pool.ts:1136`: "The evidence line
  reports the API port from the pre-prepare occupancy configuration." — "`prepare` can
  regenerate a changed port, and the runtime environment uses the new status while the
  evidence names the old port, producing misleading verification evidence." VERIFIED:
  `evidence()` prints `occupancy.config.apiPort`, read at occupy time, before `prepare`
  regenerates the slot config from the item tree; `stackEnv` emits from the post-prepare
  status. Under config drift the record's one evidence line names a port the suite did not
  use — and a truthful evidence line is this item's ruled deliverable (D11). The ruled fix:
  the evidence line takes its api port from the proven post-prepare status (what actually
  answered); the slot project id is permanent identity (T6) and stays as is. Selftest 4
  asserts the port comes from the status. The committed S8 transcript is NOT invalidated: in
  that run no drift existed and the line was true.

- **[A4] — ACCEPTED, with a measurement recorded before the fix.** Luna, severity medium,
  marked unverified-runtime-claim, on `db-slots.ps1:110`: "`Get-DbSlotOccupancy` treats an
  empty or unparseable occupancy claim as no occupancy." — "During the runner's claim-file
  creation/write window, release can miss a live claim and delete the reservation, contrary
  to the release refusal rule; settle by invoking release during that window." The
  structural half is VERIFIED by reading: line 110 catches any read or parse failure to
  `$null` and line 111 skips the file — fail-open, directly beside a liveness check whose
  own comment demands fail-closed ("an occupancy misread as dead lets Release-DbSlot hand
  the slot away under a running verify window"). The runtime half the executor MEASURES
  before fixing, against a TEMP claim dir, never the live one: hold a claim-shaped file open
  without sharing and observe what `Get-DbSlotOccupancy` returns today. The fix applies
  either way, because a mid-write claim file is unreadable while its writer is alive by
  definition: read with the bounded wait (mirror `Read-DbSlotReservationWait`), and a claim
  file that EXISTS but stays unreadable or unparseable after the wait is treated as a LIVE
  occupancy, so `Release-DbSlot` refuses and names the file. Stated cost, accepted: a
  crashed writer's residue now needs one manual look instead of a silent skip — the same
  loud-over-silent trade the reservation path already made.

- **[A5] — ACCEPTED.** Luna, severity medium, on `db-pool.ts:328`: "The personal-block guard
  does not semantically parse every port value." — "A valid TOML value such as
  `port = 54_321` is read as `54`; an unrecognized/client port field can therefore pass the
  guard despite carrying a forbidden personal-stack port." VERIFIED: line 328 parses a
  numeric PREFIX (`/^(\d+)/`) of the raw value, and line 329 silently skips a port-valued
  key whose value does not parse at all — two fail-opens in the wall's own guard. TOML
  permits underscores in integers, so `54_321` is a valid encoding of a personal-block port
  that the guard reads as 54. The ruled fix: whole-token parse, underscore-aware — the
  entire value must be an integer once underscores are stripped; a port-valued key whose
  value does not parse is a PROBLEM (fail closed, E7), named with its raw value. The
  executor also checks `portMappings` for the same prefix-parse and aligns it to the same
  whole-token rule if it shares the defect (an unparseable or out-of-band port already
  refuses there per gate-1 [5] — that direction stands). Selftest 5 grows: `54_321` refuses;
  a non-numeric port value refuses. Stated so the claim stays exact: the tracked
  `supabase/config.toml` carries plain integers, so no committed transcript's guard pass is
  invalidated — the defect is in what the guard WOULD accept, not in anything it accepted.

- **[AF1] — ACCEPTED as the verification it asks for; verified clean, no change needed.**
  Flash, severity low (its own scale), on the audit's own working file
  `audit-flash-output.events.jsonl`: "the current audit sitting's live tool-call log records
  raw tool outputs verbatim and already contains the complete repo `.env` content, including
  two live SUPABASE_PUBLISHABLE_KEY JWT tokens (eyJ...), inside the item's artifacts
  directory." Why it matters, verbatim: "the item's own ruling gate-1 [14] makes \"no eyJ
  token\" a done-criterion for every committed transcript in this record, and PHASE-STATE's
  recipe commits the audit sitting's tool-call artifacts alongside the outputs; if this file
  or its content lands in the record, the rule is violated and a live credential value is
  committed. If it stays untracked and is excluded at close, nothing is violated." The
  verification, performed this sitting before any artifact was staged: the events file is
  ABSENT from disk (deleted by the reviewer-runner's cleanup per its contract); `git
  ls-files` shows it never entered the index; a token-shape scan (`eyJ` followed by 15+
  token characters) across every file in the artifacts directory returns ZERO matches; a
  scan for other secret shapes (sb_secret, service-role key assignments, db password names)
  returns zero. The only `eyJ` occurrences in the record are the reviewer's own truncated
  "eyJ..." mentions, which carry no token material — the gate-1 [14] criterion reads "no
  eyJ token", and a three-character prefix followed by an ellipsis is not a token. Nothing
  derived from the events log lands in the record. Flash's two non-finding observations are
  recorded as given: (a) several §7–§9 line-number citations are pre-fix and drifted — left
  as written, because they cite the lines as they stood at ruling time and the cited facts
  hold structurally; rewriting citations after every fix would churn the record they anchor;
  (b) git-level facts were could-not-verify from its cage — expected, the cage has no git.

**Disposition summary.** Six findings: [A1] record fix, applied in this commit; [A2], [A3],
[A4], [A5] code fixes, applied by the fix executor AFTER this commit is pushed; [AF1]
verified clean, no change. Nothing is rejected, so no maintained-disagreement text is owed to
the pull request from this gate. Code changes, so the WHOLE panel re-runs once at the new
head — the once-per-item re-run, both seats, never one.

### Rulings on the audit-fix executor's report (audit sitting, 2026-08-10)

The executor (opus, one invocation, one iteration) implemented [A2]–[A5] as ruled, all four
suites green (typecheck 0; at:selftest 0, 284 tests; at:check req-001 0; at:verify req-001
--tier loop --expect 0), no stack and no Docker touched, measurements on temp directories
only. The [A4] measurement, recorded: BEFORE the fix, a claim-shaped file held open with no
sharing was invisible to `Get-DbSlotOccupancy` (returned null in 21 ms) and `Release-DbSlot`
then deleted the reservation under it — the fail-open was real and reached the ruled harm.
AFTER: the occupancy returns as live-unreadable in ~1.3 s and release refuses, naming the
file. The loop tier is behaviorally untouched, shown two ways: the normalized loop output
matches `oracle-loop-branch.txt` line for line (the one raw difference was the em-dash
encoding between capture environments, folded before comparison and stated here plainly),
and the commit does not touch `runner.ts` at all. Eight judgment calls, ruled:

- **AX1 — RATIFIED.** The post-claim strict read releases the occupancy claim before its
  refusal travels. A refusal that strands a claim locks the slot against everyone; it copies
  the adjacent refusal on the same path.
- **AX2 — RATIFIED as an observation, no change.** `slotForItem` keeps the lenient read: on
  the reservation path an unreadable file makes the lookup find no slot and the run REFUSES
  loudly ("no database slot is reserved") — fail-closed by a different route, never a silent
  take.
- **AX3 — RATIFIED.** The evidence line's port helper does not throw on an unparseable
  status URL; it prints what the status said verbatim. The status is proven before
  `evidence()` runs, no destructive act rides on the line, and honesty about what answered
  is the line's whole job.
- **AX4 — RATIFIED.** A trailing `# comment` is dropped before the port token is judged.
  TOML ignores the comment, so the guard judges exactly the value TOML delivers; a comment
  cannot smuggle a different port past it.
- **AX5 — RATIFIED.** `generateSlotConfig`'s rewrite pattern matches underscored integers —
  the necessary consequence of [A5]: replacing only the leading digits of a mapped `54_321`
  would write a corrupt value. Pinned by its own selftest (AX7).
- **AX6 — RATIFIED.** The occupancy record gained a `readable` field so `Release-DbSlot`
  can refuse naming the exact claim file — the field is the carrier of the ruled refusal.
- **AX7 — RATIFIED.** One selftest beyond the ruled list ("an underscored port maps and
  rewrites whole") exists to protect AX5. A test is never scope growth.
- **AX8 — Already ruled.** The conductor's watcher file rode along unaltered, the E9
  pattern; nothing new to rule.

## 11. Audit round-two rulings (audit sitting, orchestrator on fable, 2026-08-10)

The whole panel re-ran at head db4a451 — the once-per-item re-run, now spent. Neither seat
came back clean: luna (gpt-5.6-luna via codex @ max, read-only) returned six findings
([B1]–[B6], its [1]–[6]); flash (deepseek-v4-flash via opencode, agent reviewer-flash,
variant max) returned three ([BF1]–[BF3], its [1]–[3]). Every claim below is quoted verbatim
from the seat's distillate. No claim names a foreign item id, so nothing is elided. One
convergence exists and it is the strongest signal this panel gave: [B1] and [BF1] are the
same defect class — reviewer working files carrying the repo's tracked `.env` content, and
that content crossing into the committed record. Round one's [AF1] warned of the exact
mechanism ("if this file or its content lands in the record, the rule is violated"); [B1]
found where it had already landed.

### [B1] — ACCEPTED; the stated severity is corrected with evidence; record and tree both repaired

Luna, severity critical (its scale: "critical = credential disclosure"), on
`artifacts/audit-luna-output.stderr.log:11185`: "The committed audit stderr log embeds raw
audit-event output containing JWT-shaped Supabase key values, contrary to AF1 and gate-1
[14]." — "Credential material is committed in the item record, so the claimed clean artifact
set is false and a hosted project credential may be exposed."

**The factual core is TRUE, verified this sitting by direct measurement.** The round-one
stderr log, committed at 2e2a215, carried 21 whole-token JWT-shaped matches. The round-two
stderr log on disk carried 61 more of the same two values. Exactly two distinct token values
exist across both files, and this sitting decoded both:

1. A 208-character token whose payload reads `{"iss":"supabase","ref":"poancmeitlmxejofwzuu",
   "role":"anon","iat":1781524573,"exp":2097100573}`. This is the cloud project's ANON
   ("publishable") key — the key Supabase designs to ship inside every client bundle. The
   repository itself carries this exact value, twice, in the TRACKED `.env` at the repo root
   (`SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY`), deliberately: the
   `.gitignore` comment at line 34 reads "secrets live here, never in the tracked .env" and
   routes secrets to the untracked `.env.local`. The committed log therefore exposed a value
   the same repository already publishes on the same remote by design. Zero incremental
   exposure resulted.
2. A 65-character token whose signature segment decodes to the literal word "signature"
   (`c2lnbmF0dXJl`) — the redaction selftest's own deliberate fixture (`const jwtish = ...`),
   quoted through terra's gate-2 log. A real HS256 signature is 43 base64url characters; this
   one is 12. It is cryptographically invalid and is not a credential.

A wider secret battery over the record found nothing else: the two `sb_secret_` matches are
the fixture `sb_secret_abcdefghijklmnop` inside the redaction selftest's own expect line; the
connection-string matches carry the passwords `postgres` (the universal local default) and
`hunter2` (a fixture). No service-role key, no database password, no access token of any
vendor shape exists anywhere in the record.

**How the material crossed.** During the round-one panel, flash's lane held working files in
the artifacts directory (`audit-flash-output.events.jsonl`, `audit-flash-identity.raw.json`)
whose raw tool events quoted the tracked `.env`. Luna read and grepped that directory while
auditing; codex logs every tool output to its own stderr; the runner captured that stderr;
the audit sitting committed it. The runner's cleanup deleted flash's working files — after
their content had already crossed. Round two repeated the pattern: luna re-read the committed
round-one log to verify its own finding, and its new stderr carried the values again.

**The record-false half.** §10 [AF1] states "a token-shape scan ... across every file in the
artifacts directory returns ZERO matches." That statement cannot be reproduced: the same scan
this sitting returned 21 matches in a file committed in that same commit. The negative was
never re-measured with a second instrument — the exact failure shared-invariants names. This
section is the record's correction, and gate-1 [14]'s precise scope is restated: its
done-criterion binds the four committed TRANSCRIPTS (S2, S3, S5, S8), and all four do scan
clean; the stderr logs sat outside its literal scope and inside [AF1]'s broader claim, which
is the claim that was false.

**The tree repair, applied this sitting before this commit.** Both stderr logs are redacted
in place: every occurrence of the anon key is now `[REDACTED:anon-publishable-key:
poancmeitlmxejofwzuu]` and every occurrence of the fixture is
`[REDACTED:fixture-jwt-from-redact-selftest]`. Post-redaction, a whole-token scan and a
key-fragment scan over everything under `loop/items/AI4DEV-79/` — tracked and untracked —
return zero matches. The repo-level residents are stated so no scan surprises anyone again:
the tracked `.env` carries the publishable key by design (pre-existing, not this item's
doing), and the redaction selftest carries its named fixture as its test subject.

**What redaction does NOT do, stated plainly.** The values remain in git history at 2e2a215
and every commit through db4a451, on the remote. A pushed value cannot be un-pushed by a
forward edit, and this sitting does not rewrite history. **No key rotation is warranted**:
the exposed value is the publishable key, public by design, and published by this same
repository in plaintext `.env` deliberately; the other token is not a key. No live secret,
no service-role key, and no password beyond fixtures and the local default ever appeared.
This is a hygiene defect in the record, not a credential incident, and the severity
"critical = credential disclosure" is corrected on that evidence.

**Filed for the coordinator, in words, never built here:** (a) the reviewer-runner could
scrub key-shaped tokens from reviewer session logs at capture time, before anything lands in
the artifacts directory; (b) whether the tracked `.env` should carry even publishable keys is
a standing repo design decision worth one deliberate look.

### [B2] — ACCEPTED; the tree changes to match the record

Luna, severity high, on `tests/at/harness/runner.ts:904`: "The exported parameterized
resetLocalDatabase can reset a slot target without the required identity read or Docker
proof." — "A direct caller can reach the destructive CLI invocation without proveSlotTarget
or proveSlotDbContainer, contradicting D13's structural guarantee."

VERIFIED in source: `resetLocalDatabase(target?)` is exported and spawns `db reset --local`
with no proof inside; the proofs live only at db-pool's call site (db-pool.ts:1099–1108).
D13's ruled text reads "The read is structurally ON the destructive path, never a separate
call a caller can skip. This applies to every slot-aimed use of the parameterized runner
helpers (D9) too." The tree does not implement that sentence: any compiling importer can aim
the reset at a slot with no read. Adopted-ruling-absent — never mergeable as is.

The ruled fix: the identity read's RESULT becomes a required parameter of every slot-aimed
destructive runner helper. When a target is present, the helper demands the proof object the
identity read returns and refuses loudly when the proof's identity does not match the
target; with no target the signature is unchanged. db-pool's guarded paths pass the reads
they already perform. The executor applies the same rule to every parameterized destructive
runner helper (reset, and stop if runner exports one), so the skip becomes a compile error
for every caller and a named refusal at runtime for a mismatched proof. A selftest pins the
mismatch refusal. `refusePersonal` stays exactly where it is — this fix narrows nothing.

### [B3] — ACCEPTED; the tree changes to match the record

Luna, severity high, on `tests/at/harness/db-pool.ts:635`: "readReservationStrict accepts
JSON primitives, and the override's truthiness check treats an existing null reservation as
absent." — "A reservation file containing null lets AT_DB_SLOT proceed to claim and reset a
slot despite the A2 fail-closed rule."

VERIFIED in source: line 635 casts `JSON.parse(raw)` blindly. A file containing the valid
JSON `null` parses cleanly, returns `null`, and becomes indistinguishable from ENOENT — the
caller proceeds as if no reservation exists. That is a present-but-garbage file taking the
ABSENT branch, against A2's own three-outcome rule written directly above the function. The
ruled fix: after parse, the value must be a non-null object whose `item` is a non-empty
string; every other parse result takes the half-written path and lands in the bounded
refusal. After the fix, a `null` return means ENOENT and nothing else. The A2 selftest grows
the case: a reservation file containing `null` plus the override refuses.

### [B4] — ACCEPTED; the tree changes to match the record

Luna, severity high, on `loop/work/db-slots.ps1:137`: "Get-DbSlotOccupancy treats a parsed
claim with pid 0 as no occupancy." — "Release-DbSlot can then delete the matching reservation
under an existing unidentifiable claim, violating A4."

VERIFIED in source: line 137 guards the liveness check with truthiness (`if ($holder.pid)`),
so a parsed claim whose pid is 0, missing, null or empty skips the check, `$alive` stays
false, the claim is treated as dead residue, and release proceeds — directly beside A4's own
fail-closed comment. The ruled fix: a parsed claim without a strictly positive integer pid is
an occupancy with an unidentifiable holder — returned as live, carrying the claim file's
path, so `Release-DbSlot` refuses and names the file. Same loud-over-silent trade A4 already
ratified, same manual remedy.

### [B5] — ACCEPTED; measured first, then the tree changes to match the record

Luna, severity high, marked unverified-runtime, on `loop/work/db-slots.ps1:123`:
"Claim-directory enumeration errors are silently converted into an empty occupancy result." —
"An unreadable claim directory can make release delete a reservation without proving that no
live claim exists; settle this by exercising release with an inaccessible claim directory."

The structural half is VERIFIED in source: `-ErrorAction SilentlyContinue` inside `@()` turns
every enumeration failure into an empty list, and an empty list reads as no occupancy. The
runtime half the executor MEASURES before fixing, on a TEMP directory only, the A4 protocol:
make a claim directory unreadable and observe what `Get-DbSlotOccupancy` returns today. The
ruled fix applies either way: enumeration runs fail-closed — a claim directory that does not
exist is legitimately empty (no claim was ever created); a directory that EXISTS but cannot
be enumerated is a PROBLEM, reported as a live occupancy with an unknown holder, naming the
directory, so release refuses. The measurement and its result go in this section's executor
ruling.

### [B6] — ACCEPTED; record fix, applied in this commit

Luna, severity medium, on `loop/items/AI4DEV-79/oracle-loop.diff:8`: "The oracle header says
origin/main is ten commits ahead of c11e352, while the pinned graph has eight descendants." —
"The merge base and empty normalized diff are valid, but the record's stated baseline
provenance does not match the tree."

VERIFIED: `git rev-list --count c11e352..origin/main` returns 8, measured this sitting;
origin/main only grows, so the count at capture time was at most eight and the header's "ten"
was wrong when written. The header now reads eight and carries a bracketed correction naming
this sitting. The oracle's substance — merge base, both transcripts, the empty normalized
diff — is untouched and was not challenged.

### [BF1] — ACCEPTED as the verification it asks; verified with two instruments; convergence with [B1] recorded

Flash, severity high, on `artifacts/audit2-flash.events.jsonl:95`: "the audit RE-RUN's live
tool-call log (the audit2- artifact this sitting's own recipe creates) records raw tool
outputs verbatim and already contains the complete repo `.env` content, including both live
SUPABASE_PUBLISHABLE_KEY JWT tokens, inside the item's artifacts directory at this snapshot."

The verification, performed this sitting: the events file is ABSENT from disk (Test-Path
false), zero `*events*` files exist in the artifacts directory, and `git ls-files` shows no
events file ever entered the index — the negative measured two ways, the round-one lesson
applied. The disposition the finding asks for (exclude at close) was already satisfied by the
runner's cleanup before this sitting opened. What the finding adds beyond round one's [AF1]
is the convergence with [B1]: the working file's existence WHILE a concurrent reader runs is
itself the leak path, independent of whether the file is ever staged. The forward remedy is
the reviewer-runner scrub filed under [B1]; nothing in this tree changes for [BF1] itself.

### [BF2] — ACCEPTED; record fix, applied in this commit

Flash, severity low, on `loop/items/AI4DEV-79/integration-run.txt:13`: "the item's only
end-to-end proof of the changed path ran on a tree whose uncommitted delta is never
identified — the transcript discloses "tree state: DIRTY" but nothing in the record says
which files were dirty."

TRUE, and the exact porcelain list was not captured and cannot be reconstructed. A postscript
now states what the graph proves: the run's head 09dca7de is the direct parent of c0994e7,
and c0994e7 added exactly four files, all evidence under `loop/items/AI4DEV-79/` — the
transcripts and oracles that capture session was writing. Every code path the run exercised
sat at committed state 09dca7de unless the dirty delta touched code and was then discarded,
which the record cannot exclude; what bounds that residue is CI's required check, which
re-runs the four suites on the clean committed tree at every subsequent head.

### [BF3] — ACCEPTED; record fix, applied in this commit

Flash, severity low, on `loop/items/AI4DEV-79/pr-body.md:14`: "the pull-request body still
reads "Status: planned; nothing is built yet" while the branch it describes is fully built,
ruled, reviewed and audited."

TRUE and stale since the draft landed. The status paragraph now states the actual position:
built, both gates ruled, audit rounds one and two ruled, ahead only CI green and the merge
ruling. A mechanical syncs the live pull request body from the corrected file.

### Disposition summary, and the re-run decision

Nine findings, nine ACCEPTED, zero rejected — no maintained-disagreement text is owed to the
pull request from this gate. [B1], [B6], [BF2], [BF3] are record repairs, applied in this
commit; [BF1] is a verification, performed; [B2]–[B5] are code fixes, applied by the
executor AFTER this commit is pushed.

**No third panel run happens, and here is the reasoning in the open.** The once-per-item
re-run is spent. PHASE-STATE's standing rule: a fix that would need another panel re-run is
scope growth and goes up as an escalation. These fixes do not reach that bar. [B2]–[B5]
tighten guards the record already rules fail-closed — they change what the guards REFUSE on
edges no committed transcript ever exercised, and they change nothing on any proven path:
no new mechanism, no new file, no behavioral change to the loop tier or to any green
evidence. Each fix is pinned by its own selftest, the four suites re-run green at the new
head, and CI's required check re-proves them on the exact merge head. The record repairs
carry no code at all. The residual — that these four small fixes go unread by an external
panel — is the accepted cost of the re-run cap, stated here so the merge sitting and the
founder weigh it with open eyes.
