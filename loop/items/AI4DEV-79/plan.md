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
  stack (F6, measured).
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
- **S3. The isolation spike** — the ruled done-criterion, run once, transcript to
  `loop/items/AI4DEV-79/spike-isolation.txt`. Procedure: (a) preflight — prove via `status
  --workdir` that slot-2's stack answers on the 56321 block BEFORE any reset, the same
  prove-first pattern the runner uses; (b) canary row in slot-1's database; (c) canary row in
  the personal stack, in a dedicated scratch schema created for the spike; (d) canary row in
  SLOT-2's database — the row the reset must DESTROY (gate-1 [7]); (e) `supabase db reset
  --workdir <slot-2>`; (f) slot-1 and personal canaries still present AND the slot-2 canary
  GONE — a reset that destroys nothing proved nothing; (g) drop the scratch schema — the
  personal stack ends the spike with zero residue. Steps (b)–(f) run inside try/finally; the
  scratch-schema drop is the `finally` (gate-1 [8]), and a failed drop is reported loudly with
  the exact manual cleanup command. The spike REQUIRES the personal stack to be running; if it
  is not, the executor stops and reports rather than starting it — starting the founder's
  stack is touching it.
  *Done when:* the transcript shows the slot-2 canary destroyed by the reset, both other
  canaries surviving it, and the scratch schema dropped afterward; the committed transcript is
  scanned clean per gate-1 [14].
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
- **S8. End-to-end proof of the changed path** (gate-1 [9]) — goal phase, on the dev machine:
  one real integration-tier verify through the pool, `bun run at:verify req-001 --tier
  integration --expect` with `AT_DB_SLOT` set (the D6 override; this run is the evidence
  gathering the override exists for). Transcript to
  `loop/items/AI4DEV-79/integration-run.txt`.
  *Done when:* the run is green, the evidence line names the slot, and the committed
  transcript is scanned clean per gate-1 [14].

## 5. Expected verification state

No acceptance-test ids exist on this item (foundation work). The goal state for the fix-and-goal
sitting, all on the item branch:

| check | expected |
|---|---|
| `bun run typecheck` | green |
| `bun run at:selftest` | green, now including the nine named db-pool tests (S4) |
| `bun run at:check req-001` | green, unchanged |
| `bun run at:verify req-001 --tier loop --expect` | green, and the normalized main-vs-branch output diff is EMPTY (S5, gate-1 [10]) |
| `bun run at:verify req-001 --tier integration --expect` via the pool | green once on the dev machine, evidence line naming the slot, transcript committed (S8, gate-1 [9]) |
| S3 spike done-criterion | met once, transcript committed — slot-2 canary destroyed, the other two surviving |
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
