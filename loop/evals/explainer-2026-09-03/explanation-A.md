# The v1 ceremony and the acceptance harness: what depends on what

Written from four explorer traces plus spot checks against the tree at
`C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\harness-atlas` (commit `f81062e`, the state
before any parking). Where the explorers disagreed, the code decided. The disagreements and their
resolutions are listed under "Gotchas".

## Overview

This repository carries two things that grew together and are now being pulled apart. The first
is the **v1 ceremony**: a relay of Claude agents (`conductor`, `orchestrator`, `executor`,
`reviewer-runner`, ...) driven by the `/work` skill, with PowerShell helpers under `loop/work/`,
a "twin guard" CI step that keeps two orchestrator prompt files identical, and a **database slot
pool** that gives each in-flight item its own Supabase stack. The second is the **acceptance-test
harness** under `tests/at/`: a vitest wrapper (`bun run at:verify`) that grades one requirement
at a time, per acceptance-test id, at a chosen tier (`loop` = in-memory, `integration` = a real
local Supabase stack), and can compare the result against a committed declaration
(`--expect`).

The two are coupled at exactly one seam: the harness's integration tier resolves its database
**only through the slot pool** (`tests/at/harness/db-pool.ts`), and the pool's reservations are
written by a ceremony script (`loop/work/db-slots.ps1`). Everything else the harness does — the
bijection check, the loop tier, `--expect`, the capability ledger, the suites — has no ceremony
dependency at all. So the parking job is: remove the ceremony and the pool, give the integration
tier a slot-free way to reach the one local stack on API port 44321, keep the identity and
attestation proofs the pool used to supply, and leave the loop tier, the manifests, and CI's
loop gate untouched.

## Key Concepts

- **AT id / P0 id.** `AT-001.12` and so on. The source of truth is
  `.taskmaster/docs/acceptance/at-req-0NN.md`; a line `AT-<req>.<n> (P0)` is a P0 id. Every P0
  id must have exactly one `atTest('AT-...')` call site under `tests/at/suites/req-0NN/*.test.ts`.
  That is the **bijection**, checked by `tests/at/harness/check.ts` (`bun run at:check`).
- **Tier.** `loop`, `integration`, `drill`. The runner passes `AT_TIER` to the vitest child;
  `registry.ts` reads it and there is **no default** (an unset tier is `tier-unset` pending).
  Loop has no database. Integration has one real Supabase stack. Drill is a hard refusal today.
- **`--expect` manifest.** `tests/at/expected/req-0NN.json` declares, per tier, which ids are
  green and which are red (with the red's kind and first line). `expected.ts` refuses the run
  before any test if the declaration is malformed or not bijective, and after the run fails on
  any deviation in either direction: a declared red that turns green is a failure too.
- **Capability ledger.** `tests/at/harness/index.ts` builds an `AtHarness` per `open()` and stamps
  each seam (`clock`, `vendors.email`, `fixtures.worlds`, `sut.<key>`, ...) with a computed
  provenance: `real`, `stand-in`, or pending. Above loop, a stand-in seam throws
  `CapabilityPending` before the body runs (`registry.ts` `aboveLoopStubbedRefusal`). That is
  what makes integration reds *declarable* by name instead of arbitrary assertion failures.
- **Adapters.** Each suite has `_fixture.ts` (loop: Map storage + shipped modules for req-001; a
  taxonomy-derived stand-in for req-016) and optionally `_live.ts` (integration). Only
  `req-001/_live.ts` exists. `req-016` falls back to its loop fixture above loop and is therefore
  all-red at integration by declaration.
- **Slot.** A standing Supabase stack named `ai4good-slot-N`, with every listener port equal to
  the repo port plus `N * 1000` (inspector: plus `N * 10`), living under
  `%LOCALAPPDATA%\ai4good-build\db-slots\slot-N`. Slot 1's API port is **45321**, not 44321.
- **Personal stack / the one stack.** The stack `supabase/config.toml` describes:
  `project_id = "poancmeitlmxejofwzuu"`, API 44321, DB 44322, mail catcher 44324, `jwt_expiry =
  3600`, started with `bun run db:start`. The pool was built to **never** touch it; the new
  design makes it the integration target.
- **Attestation.** After a reset, the runner mints a nonce and writes it into
  `at_runtime.slot_attestation` (not a migration). The vitest child reads it back through
  `AT_SUPABASE_DB_URL` + `AT_SLOT_ATTESTATION` (`attestation.ts` `attestSlot`). Only a stamped
  attestation with brand `'slot'` lets `index.ts` grant `real` to live capabilities and lets
  `live-email.ts` build the Mailpit vendor.

## How It Works

### The runner, end to end

Entry is `bun run at:verify req-0NN --tier <tier> [--expect] [--wired]` →
`tests/at/harness/runner.ts` `main()` (around line 1233).

1. **Parse** (`parseArgs`). `--tier` is required. `--expect` plus `--wired` is refused. `--wired`
   alone always exits 3 ("the screen driver does not exist yet").
2. **Bijection preflight** (`check.ts` `inspectBijection`). Missing, extra, or duplicated ids →
   exit 2, nothing runs.
3. **Declaration preflight** (`expected.ts` `loadTierExpectation`, only with `--expect`). Bad
   JSON, wrong requirement field, unknown tier, unknown red kind, or ids not bijective with the
   P0 set → exit 2. Note: this happens **before** any lock, Docker call, or reset.
4. **Tier dispatch** (runner lines 1319–1370).
   - `drill` → exit 3. The comment says why: it used to reset the personal stack.
   - `loop` → no lock, no stack, `stackEnv` stays empty.
   - `integration` → the pool, and only the pool (next section).
5. **Spawn vitest** on `suites/req-0NN/` with `--reporter=json`, binary pinned from the install
   root, `cwd` = install root, env = `childEnv({...stackEnv, AT_TIER, AT_REGISTRATION_DIR})`.
   `childEnv` is an allowlist; it drops `.env.local` secrets, `AT_JUDGE_API_KEY`, and
   `AT_DB_SLOT`. The child cannot occupy a slot.
6. **Grade** (`analyzeReportedTests`). One runtime registration and one vitest result per P0 id;
   titles must match. Without `--expect`, any red → exit 1. With `--expect`, green set, red set,
   red first-line shape, passed/failed counts, and file-level accounting must all match → exit 0.
7. **Cleanup** in `finally` and on SIGINT/SIGTERM: remove the report dir, release the lock.

Exit codes: 0 ok, 1 test or expectation failure, 2 usage/preflight refusal, 3 infrastructure,
4 no usable vitest JSON.

### The integration path today (the slot path)

```mermaid
sequenceDiagram
    participant R as runner.ts main()
    participant P as db-pool.ts
    participant S as slot stack ai4good-slot-N
    participant V as vitest child
    participant I as index.ts buildLiveLedger
    participant L as req-001/_live.ts

    R->>P: occupy("req-001", AT_DB_SLOT ? {slot} : {})
    P->>P: reservation file (from db-slots.ps1) or override; claim lock dead-pid-only
    R->>P: prepare(occupancy)
    P->>S: mirror supabase/, rewrite config (project_id, ports +N*1000, jwt_expiry=120)
    P->>S: personalBlockProblems (refuse 44320-44329 / poancmeitlmxejofwzuu)
    P->>S: proveSlotTarget, waitForReady, reset, proveMigrationsReplayed
    P->>S: writeAttestation(nonce) into at_runtime.slot_attestation
    R->>R: print evidence(); stackEnv() -> AT_SUPABASE_* + AT_SLOT_ATTESTATION + MAIL_URL
    R->>V: spawn vitest, childEnv(stackEnv, AT_TIER=integration)
    V->>I: open() -> createHarness({tier: integration})
    I->>S: attestSlot(): read nonce back via AT_SUPABASE_DB_URL
    I->>I: AttestedRealClock, createLiveEmail(mailUrl, attestation)
    I->>L: createLiveAdapter({slot: 5 strings, vendors})
    L->>S: Auth HTTP, functions HTTP, Bun.SQL, Mailpit link polling
```

The load-bearing facts:

- `runner.ts` line 44 imports `occupy`, `prepare`, `evidence`, `stackEnv` from `db-pool.ts`.
  This is a **load-time** import. Parking `db-pool.ts` without replacing that import means the
  runner does not start, for the loop tier too.
- `runner.ts` line 1338 is the **only** read of `AT_DB_SLOT` anywhere. `.claude/settings.json`
  injects `AT_DB_SLOT=1` into every session. Today that means pool slot 1 (`ai4good-slot-1`, API
  45321). It never meant the 44321 stack.
- `db-pool.ts` refuses the 44321 block in three places: `personalBlockProblems` (457), `stackEnv`
  (1386), and `withSlotSql` (1550). The refusal is by port range 44320–44329 and by project id.
- `prepare` is also the only place `jwt_expiry` is forced to 120 (`SLOT_JWT_EXPIRY_SECONDS`, line
  407). `req-001/_integration.ts` line 65 hard-codes the matching `SLOT_JWT_EXPIRY_MS = 120_000`
  and sizes AT-001.12 (wait 135 s for expiry), AT-001.13 (poll 150 s for auto-refresh), and
  `INTEGRATION_TIMEOUT_MS = 240_000` around it. The repo config says 3600.
- `prepare` is the only per-run database wipe. `_live.ts` does not wipe; its world isolation is
  the reset plus namespaced test emails.

### Inside the child: tiers, bodies, and the ledger

`registry.ts` `atTest` registers one `it()` per id and picks a body per tier
(`chooseTierBody`: `integration` entry if present and `AT_TIER=integration`, else `default` or
the plain function). Every id runs at every tier; there is no integration-only file. Bodies in
`req-001/_integration.ts` are reached through the test file's map entry, so `at:check` never
sees them (it scans only `*.test.ts`).

`open()` → `index.ts` `createHarness`. At loop: `ControlledClock`, `createEmailProviderSim`,
`_fixture.ts`, replay-only oracle over an empty recording store, and `static` is always
`pendingCapability('H3 static provider scan')` (line 500) — that single line is why AT-016.01 is
the only declared loop red. At integration: `attestSlot` first (line 344), then real clock and
`createLiveEmail` (353), then `_live.ts` if the file exists (286) or the loop fixture as a
fallback. With the fallback, `stubbedCapabilities()` is non-empty and `aboveLoopStubbedRefusal`
throws `CapabilityPending(['fixtures.worlds', 'sut.notifications'])` before the body — the
declared shape for all twelve req-016 integration ids.

For req-001 at integration, `createLiveAdapter` receives five strings (`apiUrl`, `dbUrl`,
`anonKey`, `serviceRoleKey`, plus mail via `vendors`) and grants `real` only over the closed
`backedSutMethods` list. Five ids (AT-001.02/.03/.04/.05/.10) call unbacked methods and are
declared `capability-pending` by name; sixteen ids are `sut-missing` via `_pending.ts
notLanded`; sixteen are green.

### The declared state that must stay green

From the manifests (checked, and this corrects one explorer's count):

| Suite | Tier | Green | Red |
|---|---|---|---|
| req-001 | loop | 21 | 16 `pending/sut-missing` |
| req-001 | integration | 16 | 5 `capability-pending` (named methods) + 16 `sut-missing` |
| req-016 | loop | 11 | 1 `capability-pending: H3 static provider scan` |
| req-016 | integration | 0 | 12 `capability-pending: fixtures.worlds, sut.notifications` |

The done contract asks for both suites green at loop with `--expect`, and req-001 green at
integration against 44321. It does not ask for req-016 integration; that stays all-red by
declaration and needs no change.

### CI (`.github/workflows/ci.yml`, job `verify`)

In order: checkout the PR head SHA; **twin guard** (`pwsh -File loop/work/twin-check.ps1`,
lines 85–103, skipped loudly if the script is absent); prose fast lane (skip the code steps if
the PR touches none of `src/ supabase/ tests/ .github/` or root build files); `bun run
typecheck`; `bun run at:selftest` (vitest over `tests/at/harness/**/*.selftest.ts`); `bun run
at:check` for every `tests/at/suites/req-*/`; `bun run at:verify $req --tier loop --expect` for
every `tests/at/expected/req-*.json`; ownership guard; reference guard (no foreign `AI4DEV`/
`AI4PM` id in the PR text, one `Closes AI4DEV-nn` line allowed).

CI never runs the integration tier, never sets `AT_DB_SLOT`, and never needs a judge API key.
Integration green is a **local** check, today and after the parking.

### The v1 ceremony and what it touches

The `/work` skill (`.claude/skills/work/SKILL.md`, `WORKFLOW.md`, `shared-invariants.md`, nine
`conductor/phase-*.md` files, `reviewers.md`) is the v1 lifecycle: coordinator claims an item,
runs `twin-check.ps1`, reserves a slot with `Reserve-DbSlot` (`loop/work/db-slots.ps1`), spawns
a worktree-isolated `conductor`, which spawns `orchestrator` sittings and `reviewer-runner`s,
the `executor` runs `at:verify` at both tiers on the reserved slot, and a `mechanical` agent
merges. The v2 lifecycle (`/controller` → brief → `/pstack:poteto-mode` → `/controller done`)
is already live beside it and spawns only `mechanical`.

Dependency map of the pieces the brief parks, with their live callers at `f81062e`:

```
ceremony piece                 live callers (config / CI)            other callers
------------------------------ ------------------------------------- ---------------------------------
.claude/agents/{6 relay}.md    none                                  /work prose, WORKFLOW.md,
                                                                     loop/drills/run-drills.ps1
.claude/agents/mechanical.md   none                                  /controller (v2 KEEPS it)
loop/work/twin-check.ps1       ci.yml twin-guard step                /work Phase B step 0, run-drills.ps1
loop/work/db-slots.ps1         none                                  /work prose; db-pool.ts occupy()
                                                                     READS the reservation files
loop/work/stamp-hook.ps1       none (settings has no UserPromptSubmit) banner.ps1 (also unwired)
loop/work/banner.ps1           none                                  -
loop/work/statusline.ps1       settings.json statusLine (absolute    dot-sources work-lib.ps1
                               path into the MAIN checkout)
loop/work/guard-branch-switch  settings.json PreToolUse (same        shared-invariants.md names it
                               absolute main-checkout path)
loop/work/work-lib.ps1         via statusline.ps1                    stamp-hook, materialize, /controller
                                                                     prose (Set-HeldItem, Clear-HeldItem)
loop/work/{attribution-*,      none                                  manual only
 watch-items, ci-status,
 context-gauge, sheet-check,
 render-mermaid}.ps1
tests/at/harness/db-pool.ts    -                                     runner.ts line 44 (LOAD-TIME),
                                                                     db-pool.selftest.ts (at:selftest)
.claude/settings.json          env AT_DB_SLOT=1                      runner.ts line 1338 only
```

Reading the map: dropping the CI twin-guard step removes CI's only ceremony dependency, but
`twin-check.ps1` still has two prose callers (`/work` step 0 and `run-drills.ps1`). Parking the
six relay agents while leaving `loop/drills/` in place turns the drills red (the drills assert
those files are tracked). The status line and branch guard are the only `loop/work/` scripts a
live session actually executes, and their paths are hard-coded to the main checkout, so parking
files in a worktree changes nothing until merge **and** those two paths move.

### What a slot-free 44321 integration path needs

The runner already has every non-slot building block; the slot block at lines 1332–1369 is the
only thing to replace. Concretely:

Keep in `runner.ts`: `readLocalConfig(REPO_ROOT)` (those ports **are** the target),
`supabaseInvocation(undefined, ...)` (no target = repo workdir, and it strips every other
`SUPABASE_*` from the CLI's env — the wall that exists because a tracked `.env` once carried
the personal project id and a reset hit it, 2026-08-09), `localStackProblems(status,
repoConfig)` (loopback, this config's ports, `iss=supabase-demo`, no hosted `ref`),
`waitForReady`, `proveMigrationsReplayed`, the no-target overload `resetLocalDatabase()` (line
984, which already aims at the repo stack and is unused by the main path today),
`acquireStackLock(repoConfig, requirement)` (today only ever taken on a slot key; two
concurrent integration runs would otherwise reset 44321 under each other — keep the
`dead-pid-only` takeover policy the pool used), and an evidence line naming project id, API
port, reset, and migration counts.

Keep the round trip from `attestation.ts`: mint after reset, `writeAttestation` against the
proven repo db URL, pass `AT_SLOT_ATTESTATION` (renamed or not) into the child, `attestSlot`
before the live ledger. Without it `index.ts` grants nothing `real` and `createLiveEmail`
refuses (`live-email.ts` line 100 checks `SLOT_ATTESTATION_BRAND`). The brand string `'slot'`
is a naming leftover, not a pool dependency.

Keep `live-email.ts` (the Mailpit `/api/v1/info` probe and `messagesFor`) pointed at
`status.mailUrl`, which is 44324 on the one stack. It never computed a port from a slot.

Keep `index.ts` and `req-001/_live.ts` as they are: `LiveSlotCoordinates` is five strings and
`_live.ts` imports only the `LiveVendors` type. Rename `slot` at leisure.

Drop: `db-pool.ts`, `db-pool.selftest.ts`, `loop/work/db-slots.ps1`, the runner's
`occupy`/`prepare`/`AT_DB_SLOT` block, the `AT_DB_SLOT` env in settings, and the `db-pool.ts
setup` instruction in the controller's cloud brief template.

Two things have **no** slot-free equivalent today and need a decision:

1. **`jwt_expiry`.** AT-001.12 and AT-001.13 are integration-green only because the slot
   generator pinned 120 s. Against 44321 as shipped (3600 s), AT-001.12 waits 135 s and the
   token is still valid; AT-001.13 polls 150 s for a refresh that never comes; both exceed no
   timeout but fail. Either the one stack's `supabase/config.toml` carries `jwt_expiry = 120`
   as a standing value (loop's `_fixture.ts` models 3600 and does not care), or
   `_integration.ts` changes its waits. `db-pool.ts` lines 387–395 rejected rewriting the repo
   file on the fly as unsafe.
2. **Destructive-path identity.** `proveSlotTarget` keys every container-name check on
   `ai4good-slot-N`, so it cannot be reused. A 44321 path either looks for
   `supabase_*_poancmeitlmxejofwzuu` containers or relies on `localStackProblems` plus the CLI
   wall alone. The latter is weaker than the rule the pool followed (ports alone were not
   identity in the 2026-08-09 incident).

### What stays frozen and untouched

Loop tier: every `*.test.ts`, `_bind.ts`, `_contract.ts`, `_fixture.ts`, `_pending.ts`,
`_source-scan.ts`, the whole req-016 suite, both manifests, `check.ts`, `expected.ts`,
`registry.ts`, `config.ts`/`atconfig.ts`, `typecheck.ts`, `vitest.config.ts`,
`suite-adapters.ts`. None of these import the pool. The harness machinery that no suite drives
— the H4 semantic judge (`oracles.ts`, empty recording store, zero suite callers),
`record-oracles.ts` (never run), `h.sentinels.scan`, vendor stand-ins beyond email — can be
left in place; `createHarness` still constructs the oracle on every `open()` (line 205), so
removing `oracles.ts` outright would break both suites, whereas leaving it costs nothing.

New acceptance ids under the freeze register through `atTest` with existing adapters. A test
with no id goes under `tests/at/harness/*.selftest.ts` beside `shipped-caller.selftest.ts`; the
`at:verify` path filter (`suites/req-0NN/`) keeps those out of graded runs, and a plain `it()`
inside a suite `*.test.ts` is exactly the extra-test case `--expect` file accounting rejects.

## Where Things Live

```
tests/at/harness/runner.ts        at:verify main(); slot block 1332-1369; AT_DB_SLOT read 1338; db-pool import 44
tests/at/harness/db-pool.ts       the slot pool (park as a unit) + db-pool.selftest.ts
tests/at/harness/attestation.ts   nonce write (runner side) / attestSlot (child side) — keep the round trip
tests/at/harness/live-email.ts    Mailpit vendor; requires the attestation brand
tests/at/harness/index.ts         createHarness, buildLiveLedger (344-397), static pending (500)
tests/at/harness/registry.ts      atTest, bindSuite, AT_TIER (no default), aboveLoopStubbedRefusal (807)
tests/at/harness/check.ts         at:check bijection
tests/at/harness/expected.ts      --expect load + comparison
tests/at/harness/capabilities.ts  provenance verdicts, SLOT_ATTESTATION_BRAND, CapabilityPending
tests/at/expected/req-001.json    declared state, both tiers
tests/at/expected/req-016.json    declared state, both tiers
tests/at/suites/req-001/_live.ts  the only live adapter; _integration.ts holds the 120 s pin (line 65)
tests/at/suites/req-016/          loop-only in practice; no _live.ts
supabase/config.toml              the one stack: poancmeitlmxejofwzuu, 44321/44322/44324, jwt_expiry 3600
.github/workflows/ci.yml          twin guard 85-103; loop --expect 195-236; ownership; reference guard
.claude/settings.json             AT_DB_SLOT=1; statusLine + PreToolUse paths into the main checkout
.claude/agents/                   seven agents; mechanical stays
.claude/skills/work/              v1 manual, WORKFLOW.md, shared-invariants.md, conductor/phase-*.md
.claude/skills/controller/        v2 entry; still says "run db-pool.ts setup" in the cloud brief
loop/work/                        ceremony scripts (table above); db-slots.ps1 is the pool's other half
loop/drills/run-drills.ps1        binds the six agents and twin-check; goes red if they move
package.json                      at:verify, at:check, at:selftest, db:start, db:stop, db:reset
```

## Gotchas

- **`AT_DB_SLOT=1` is not the 44321 block.** Slot 1 is `ai4good-slot-1` on API 45321. The
  brief's environment line pairs the two; in current code they are different stacks, and the
  pool fails closed on the 44321 one. The done contract ("no slot code on the path") is the
  binding statement, not that line.
- **The new target reverses a stated invariant.** `runner.ts` lines 10–13 and `db-pool.ts` 8–12
  say the personal stack is untouchable. After parking, every integration run resets it. The
  explorers could not find a founder message that accepts this beyond the brief itself; the
  design station should say it out loud.
- **The runner imports the pool at load time** (line 44). Parking `db-pool.ts` first and
  rewriting the integration block second breaks loop CI in between. Do both in one change.
- **The 120-second JWT is a slot artifact.** See above; two declared integration greens hinge
  on it.
- **`--expect` is additive and exact.** An improvement (a red turning green) without a manifest
  edit fails CI. Known hole (`expected.ts` 371–376, `expected/README.md` §5): a hook throw in a
  file that already has a failed test is invisible.
- **`at:selftest` is a glob, not a list.** Parking `db-pool.selftest.ts` shrinks it silently;
  `runner.selftest.ts` still covers `localStackProblems` and should keep passing.
- **Stamp hook and banner are already unwired.** Their comments claim `UserPromptSubmit` and
  `SessionStart`; `.claude/settings.json` registers neither. The live `SessionStart` is
  `.claude/hooks/session-start-banner.sh` (cloud-only body). A user-level settings file was not
  checked.
- **Twin-check is not CI-only.** `/work` and `run-drills.ps1` still call it.
- **Two documents disagree on PR wording.** `shared-invariants.md` 76–79 recommends `ref` /
  `part of` / `towards`; `CLAUDE.md` and the CI reference guard treat those as item-moving.
  CI binds.
- **`Agents.md` is a third, stale way-of-work** (TaskMaster verbs). Not in the brief's park list.
- **Explorer count correction.** One trace reported req-001 loop as "21 green, 15 sut-missing"
  and integration as "15 green"; the manifest says 16 and 16. The table above is from the file.
- **Not measured this pass:** whether the 44321 stack is up, what `jwt_expiry` the running
  GoTrue holds, whether Mailpit answers on 44324, and the current colour of any suite. All
  colour claims here come from manifests and code paths, not a fresh run.
