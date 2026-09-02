The gate machinery, the live ledger, and the req-016 seams fit the two suites they serve. The integration path does not fit the one-stack target. Slot identity, session lifetime, and attestation proof still assume a pool that this item parks.

## Findings

### 1. [structural] Integration identity is inverted, not missing
**Components**: `tests/at/harness/runner.ts` (header and integration branch), `tests/at/harness/db-pool.ts` (`personalBlockProblems`, `stackEnv`, `proveSlotTarget`, `occupy` / `prepare`), `supabase/config.toml`, `.claude/settings.json`

**Finding**: The integration tier is not a stack-agnostic runner with a slot overlay. It is a closed system whose founding rule is “never the repository stack”. Every identity check, env emit, and occupancy path treats project `poancmeitlmxejofwzuu` and ports 44320–44329 as forbidden. AI4DEV-86 (v1 ceremony out) requires the opposite: that same stack is the only legal target, with no slot code on the path. This is a doctrine change, not a wiring tweak. `localStackProblems` still earns its place (loopback, configured ports, `iss=supabase-demo`, no hosted `ref`). The personal-block refusals and slot occupancy do not.

**Evidence**: Runner header (lines 10–13) and the integration branch (1332–1335) say the repo stack is untouchable and that integration resolves a stack only through the pool. `stackEnv` throws if the API or DB URL port sits in 44320–44329, or if the project id is the personal one (`db-pool.ts` 1386–1392). `occupy()` is the only production caller, and it keys the lock as `ai4good-slot-N` with api port `0`. No lock is taken today on `poancmeitlmxejofwzuu` + 44321. The unused building blocks already sit in `runner.ts`: `acquireStackLock(readLocalConfig(REPO_ROOT), …, { takeover: 'dead-pid-only' })`, `readStackStatus()` with no target, `localStackProblems`, `resetLocalDatabase()` with no target, `proveMigrationsReplayed`. Integration never calls that overload.

**Impact**: A “repoint in place” that leaves `occupy` / `prepare` / `stackEnv` on the path cannot meet the done contract. A leftover `AT_DB_SLOT` read still aims at pool slot 1 (API 45321), which the pool refuses to treat as 44321. The thin entry the brief asks the design station to weigh is the one that reuses the runner’s lock, CLI wall, status parse, identity checks, reset, and migration proof — and does not import the pool.

---

### 2. [structural] Session-lifetime pin lives only in parked code
**Components**: `db-pool.ts` `generateSlotConfig` / `SLOT_JWT_EXPIRY_SECONDS`, `tests/at/suites/req-001/_integration.ts`, `tests/at/suites/req-001/_fixture.ts`, `supabase/config.toml`, `tests/at/expected/req-001.json`

**Finding**: AT-001.12 and AT-001.13 are integration-green only because the slot generator rewrites `[auth] jwt_expiry` from 3600 to 120 and restarts Auth so GoTrue issues two-minute tokens. That rewrite is the one non-identity transform in the parked file. The shipped config, the loop fixture, and the integration wait budget do not agree. Against the one stack as shipped, those two bodies wait for an expiry that arrives after their four-minute budget. The pool already rejected a transient pin-and-restore as having no safe oracle. Parking the generator without moving the pin (or changing the waits and the budget) makes the integration done contract unreachable.

**Evidence**: `supabase/config.toml` has `jwt_expiry = 3600`. `SLOT_JWT_EXPIRY_SECONDS = 120` and the generator comment (`db-pool.ts` 378–407, 424–436) state that 3600 would force an hour wait, and that a missing setting must refuse rather than hang. `_integration.ts` hard-codes `SLOT_JWT_EXPIRY_MS = 120_000` and `INTEGRATION_TIMEOUT_MS = 240_000`, then waits 135 s / 150 s. The two numbers are not imported; a mismatch fails by timeout. The loop fixture models `ACCESS_TOKEN_TTL_MS = 3600 * 1000` from the same config. The req-001 integration manifest lists AT-001.12 and AT-001.13 as green.

**Impact**: Three real options, none free. A standing 120 in the repo config changes founder sessions and the loop fixture’s 3600 model. A restart-and-pin on every verify needs a restore proof the pool already called unsafe. Leaving 3600 and raising the wait makes those ids hour-long tests, which the current budget cannot hold. Skipping the ids fails the done contract. This ruling belongs in the design station, not as a silent default.

---

### 3. [structural] Attestation write has no one-stack identity producer
**Components**: `attestation.ts` `writeAttestation` / `ProvenSlotRead`, `db-pool.ts` `proveSlotTarget` / `ownContainerNames` / `resetSlotDatabase`, `index.ts` `buildLiveLedger`, `live-email.ts`, `clock.ts`

**Finding**: Shape checks on URLs and JWTs are guards. A `real` grant requires a nonce written after reset and read back through the child’s coordinates. The write will not compile-and-run against 44321 today: it demands a `ProvenSlotRead` whose `provenProjectId` equals the target, and the only producer is `proveSlotTarget`, which keys positive identity on container names of the form `*ai4good-slot-N*`. Ports alone were not identity in the 2026-08-09 hybrid (right ports, wrong project). A 44321 path that calls `writeAttestation` with `localStackProblems` only reopens that hole. A 44321 path that skips the round trip kills every live grant: `attestSlot` runs first in `buildLiveLedger`; `createAttestedRealClock` and `createLiveEmail` refuse without the `'slot'` brand.

**Evidence**: `writeAttestation` (`attestation.ts` 100–108) refuses when `read.provenProjectId !== target.projectId`. `proveSlotTarget` (`db-pool.ts` 1194–1243) sets `provenProjectId` only when `ownContainerNames` finds a `supabase_*` token ending in `ai4good-slot-N`; on a destructive act it also requires `docker ps` to show `supabase_db_ai4good-slot-N`. Comment at 1234–1235 records that ports alone are not identity. `buildLiveLedger` (`index.ts` 337–348) attests before it constructs clock, mail, or the live adapter. `createLiveEmail` (`live-email.ts` 100–107) and `createAttestedRealClock` (`clock.ts` 37–46) both call `attestationOf(..., SLOT_ATTESTATION_BRAND)`.

**Impact**: Parking `db-pool.ts` removes the only identity read that can feed the write. The round trip must stay. The new read must prove `poancmeitlmxejofwzuu` from CLI container names (and Docker, if the destructive-path rule is kept), then hand that proof into both `resetLocalDatabase(target, proof)` and `writeAttestation`. Treating attestation.ts or live-email.ts as “slot machinery to park” is a different, fatal reading of the brief (see finding 6).

---

### 4. [structural] Parking the pool deletes isolation; it does not move it
**Components**: `db-pool.ts` doctrine (state never inherited; personal stack outside the pool), `runner.ts` `resetLocalDatabase` / `acquireStackLock`, `tests/at/suites/req-001/_live.ts` world teardown, v2 “one item at a time”

**Finding**: The pool’s architectural job is not concurrency for its own sake. It is a boundary: destructive verify never shares containers, ports, or data with the founder’s working stack, and never inherits the previous holder’s schema. Pointing verify at project `poancmeitlmxejofwzuu` on 44321 removes that boundary. The lock only serializes two `at:verify` processes. It does not stop Studio, `bun run db:reset`, or a second worktree that shares the same Docker project id. Live worlds do not isolate Auth users or rows; they namespace email addresses and close SQL. Isolation is the pre-run reset.

**Evidence**: Pool header (`db-pool.ts` 8–23): the 44321 stack is outside the pool and untouchable; the first act of occupancy is copy-and-reset; state is never inherited. `_live.ts` (940–953, 959–961): world teardown is a no-op; adapter teardown only closes SQL; the comment says `prepare()` reset the database from empty. `resetLocalDatabase()` with no target already runs `supabase db reset --local` from the repo root with no `SUPABASE_*` in the environment — the act the pool was built to keep off this project. One `project_id` means one container set for every worktree. The pool solved that by mirroring each item tree into `ai4good-slot-N`.

**Impact**: Every integration green becomes a wipe of the founder’s local database, and grades whatever that shared stack holds. A verify that skips reset (because the founder is using the stack) collides with leftover Auth users and rows. Keep the reset, keep `dead-pid-only` on a lock keyed by `poancmeitlmxejofwzuu` + 44321, and say the data-loss cost out loud. v2’s “one item on this machine” limits parallel verify. It does not protect founder data.

---

### 5. [concern] `AT_DB_SLOT=1` still names a different stack
**Components**: `.claude/settings.json`, `.claude/skills/controller/SKILL.md` (environment facts and cloud brief), `runner.ts` 1338–1339, `db-pool.ts` `occupy` override, `slotProjectId` / port arithmetic

**Finding**: The item’s environment line puts `AT_DB_SLOT=1` next to the 44321 block and calls them one database. In current code they are two stacks. Slot N maps ports by `+ N * 1000`, so slot 1’s API is 45321, project `ai4good-slot-1`. Settings inject `AT_DB_SLOT=1` into every session. The controller’s brief template still tells a cloud VM to run `bun tests/at/harness/db-pool.ts setup`. After the pool is parked, that name and that command are landmines: they either fail closed on missing slot files, or — if any occupy path remains — they still refuse 44321.

**Evidence**: Settings `env.AT_DB_SLOT = "1"`. Runner integration: `occupy(..., override ? { slot: Number(override) } : {})`. `slotProjectId(1)` is `ai4good-slot-1`. Controller skill lines 68–69 and 155–157: “the project settings set `AT_DB_SLOT=1`, and there is no slot pool in v2”, then “on a fresh cloud VM run `db-pool.ts setup`”. This item’s own brief forbids that setup command.

**Impact**: The done-contract phrase “no slot code on the path” is the one that binds. The settings variable cannot keep meaning “slot 1” and also mean “44321”. Drop the read, drop the env, and rewrite the controller template in the same change, or the first cloud integration run rebuilds the parked pool.

---

### 6. [concern] The live grant spine is named “slot” but is not slot machinery
**Components**: `attestation.ts`, `live-email.ts`, `capabilities.ts` `SLOT_ATTESTATION_BRAND`, `clock.ts`, `index.ts` `buildLiveLedger`, brief scope bullet 1

**Finding**: The brief parks “the slot-shaped parts of `attestation.ts` and `live-email.ts`”. Those files do not compute slot ports and do not import the pool. They implement the only positive grounds the ledger accepts for `real`. The word `slot` is a brand string and a table name (`at_runtime.slot_attestation`, `AT_SLOT_ATTESTATION`, `attestSlot`). Parking the files, or dropping the brand check, makes every integration id fail before a body runs. Renaming is optional leftover cleanup. Removing the round trip is not.

**Evidence**: `live-email.ts` takes `AT_SUPABASE_MAIL_URL` and probes Mailpit `/api/v1/info`; it refuses without the `'slot'` brand (100–107). `capabilities.ts` 86 defines `SLOT_ATTESTATION_BRAND = 'slot'`. `liveSutCapability` and `liveFixturesCapability` both require `attestationOf(attestation, SLOT_ATTESTATION_BRAND)`. No suite imports `attestation.ts`. The child only needs the six env values and a nonce that matches one row.

**Impact**: A design that parks those two files to satisfy the bullet will fail `at:verify req-001 --tier integration` with no tests run. Keep the write, the read-back, the mail probe, and the brand check. Change the parent that mints the nonce from `prepare()` to the one-stack sequence.

---

### 7. [concern] The semantic judge does not earn its place in this harness
**Components**: `oracles.ts` (~58 KB), `oracles.selftest.ts` (~59 KB), `record-oracles.ts`, `index.ts` (three `createOracleCapability` sites), `capabilities.ts` `oracles.judge` witness, `runner.ts` `ENV_ALLOWLIST`, req-016 `_oracles.ts`

**Finding**: The judge is a full capability — pinned model, replay store, live transport, recorder — constructed on every `open()`, and never called by either suite. The item text says req-016 uses it. Req-016’s `_oracles.ts` is pair counting, with no harness import. `contracts.ts` names three acceptance ids that need a semantic judge; none of those suites exist. At integration the capability is labelled `real` because the transport kind is `live`, but the child never receives `AT_JUDGE_API_KEY`, and `createLiveTransport` reads the key only at call time. A body that called `judge()` would get `OracleUnavailable`, which is not a declarable red kind. The recorder says it has never run.

**Evidence**: No `h.oracles` in `tests/at/suites/**`. `index.ts` 205, 376, 406 always construct the oracle. `createLiveTransport` (`oracles.ts` 790–808) throws `OracleUnavailable` without the key; the comment says the credential is parent-side only and unexercised. `record-oracles.ts` header: `NEVER IN CI`, `NOT YET RUN`. Req-016 loop red is only AT-016.01 (`H3 static provider scan`), not the judge. Loop stand-in `oracles.judge` never appears in a manifest because the loop tier allows stand-ins and nobody calls it.

**Impact**: Freeze costs almost nothing at run time (construction is cheap; `judge()` is never hit). Treating the judge as load-bearing value is false, and it distorts the “keep frozen vs park vs remove” ruling. Park or leave as dead construction. Do not spend design budget on making the live judge reachable. If it is removed, touch `index.ts` at three sites and the witness table; both loop manifests stay valid because they never named it.

---

### 8. [concern] Freeze plus “new tests are plain vitest” splits the verification path
**Components**: `check.ts` bijection, `registry.ts` `atTest`, `expected.ts` `--expect` and report accounting, `.github/workflows/ci.yml` loop `--expect` step, item scope bullets 5–6, `.taskmaster/docs/acceptance/` (30 files, 2 suites)

**Finding**: The harness was sized for thirty suites. This item freezes it at two and sends new acceptance tests to plain vitest against shipped modules or the one stack. CI still grades by `atTest('AT-…')` call sites and by exact `--expect` arithmetic. A plain `it()` inside `tests/at/suites/req-0NN/*.test.ts` is either extra (bijection fail) or an untagged test that breaks `reportAccountingDeviations` when it fails, and inflates pass counts when it passes. New tests can live outside those directories only if CI grows a second job. The item does not add one.

**Evidence**: `registeredIds` (`check.ts` 71–81) scans only `atTest(` in `*.test.ts`. `reportAccountingDeviations` (`expected.ts` 378–389) requires vitest totals to equal declared greens and reds, with no pending or todo. CI discovers every `tests/at/expected/req-*.json` and runs `--tier loop --expect`; a suite directory without a manifest fails the step. Thirty acceptance files exist; two have suites.

**Impact**: Keeping bijection and `--expect` (the CI floor, and the done contract for both loop suites) means current suites must stay on `atTest`. “New tests are plain vitest” is then a second, unenforced track. That is a ruling, not a freeze. If the lead keeps the gate, say that new AT ids still register through `atTest` even when the body is a thin vitest over a shipped module. If the lead opens a second track, say that CI will not see it until a later item.

---

### 9. [concern] Parking v1 ceremony without its remaining callers
**Components**: `.claude/agents/*.md`, `loop/work/twin-check.ps1`, `loop/work/work-lib.ps1`, `loop/work/statusline.ps1`, `loop/drills/run-drills.ps1`, `.claude/settings.json`, `.claude/skills/work/SKILL.md`, `.claude/skills/controller/SKILL.md`

**Finding**: The ceremony is not a closed set of unused files. The drill harness binds the agent contracts, the nine conductor phase files, and the twin check. Settings still run `statusline.ps1`, which dotsources `work-lib.ps1` with no guard. The controller still cites `/work` for materialisation and `Set-HeldItem` / `Clear-HeldItem` from `work-lib.ps1`. `mechanical` stays and is not the problem. Parking the six v1 agents plus `twin-check` plus `work-lib` without moving those callers makes drills red and breaks the live status line.

**Evidence**: `run-drills.ps1` 303 (twin-check), 306–323 (every `.claude/agents/*.md` and work-skill file tracked), 325–358 (phase files exist and are named in `conductor.md`), 360–370 (no `## PARK` in the role contracts). `statusline.ps1` 108: `. (Join-Path $PSScriptRoot 'work-lib.ps1')`. Settings `statusLine` and `PreToolUse` point at absolute paths in the main checkout, not this worktree. Controller skill still names `/work` as the fallback manual (line 12) and `db-pool.ts setup` (line 157).

**Impact**: The park set in the brief is incomplete relative to what still runs. Either park the drills in the same move, or leave the files the drills assert on until a later item. Either keep `work-lib.ps1` because settings reference it, or change the status line in the same change. Twin-check has three callers; dropping only the CI step leaves two.

---

### 10. [concern] CI alignment cannot witness the hard half of the done contract
**Components**: `.github/workflows/ci.yml`, `package.json` scripts, `runner.ts` integration branch

**Finding**: CI has no Docker, no database, no `AT_DB_SLOT`, and no judge key. It never runs the integration tier. Dropping the twin-guard step and shrinking `at:selftest` by `db-pool.selftest.ts` aligns CI with what it already does: typecheck, bijection, loop `--expect`, ownership guard, reference guard. The req-001 integration green against 44321 remains a local (or cloud VM) command. A broken one-stack identity proof, a 3600-second JWT wait, or a missing nonce write will not fail CI.

**Evidence**: CI verify job runs `at:selftest` then `at:check` then `at:verify --tier loop --expect` per manifest (ci.yml 161–236). No `db:start`, no integration step. Runner: integration is the only path that talks to a database, and only through the pool (1332–1369).

**Impact**: Do not treat “CI green” as evidence of the integration repoint. The pull-request Verification section has to carry the 44321 command and its timestamp, as the brief already requires. Design the one-stack path to fail closed locally (infrastructure exit 3, no tests run) rather than to degrade to loop stubs; that fail-closed rule in the runner header is still the right one.

---

### 11. [observation] The frozen parts that do earn their place
**Components**: `runner.ts` grading / `childEnv` / `supabaseInvocation`, `check.ts`, `expected.ts`, `registry.ts`, `capabilities.ts` live route, `sentinels.ts` / `faults.ts` / `vendors.ts` / `fixtures.ts` / `guards.ts` / `clock.ts`, req-001 `_live.ts` / `_integration.ts`, req-016 suite bodies

**Finding**: Three layers are doing real work for the two suites. They should not be collapsed into “15,000 lines of harness” when ruling keep / park / remove.

1. **Gate (keep frozen).** `at:check` bijection, `atTest` registration, per-id grading, `--expect` exact match including “a red that turned green fails”. CI’s loop floor is this layer. Plain vitest “N failed” cannot tell a declared honest red from a regression. Req-001 loop has 16 declared `sut-missing` reds; req-016 loop has one `capability-pending`; req-001 integration has five named unbacked methods. That contract is the reason `--expect` exists.

2. **Live ledger (keep frozen, minus the unused judge).** `aboveLoopStubbedRefusal` plus `backedSutMethods` plus `pendingMethodProxy` is why req-016 integration is twelve named reds rather than an undeclarable failure, and why req-001 integration can be green on backed methods and red by name on OAuth and Discovery. `childEnv` and `supabaseInvocation` are the 2026-08-09 wall: they stay, because a 44321 reset still must not pick up a hosted URL or a stray `SUPABASE_*` from `.env`.

3. **Req-016 loop substrate (keep frozen).** Sentinels, faults, email sim, controlled clock, and config registry are not indirection “in case”. They are what AT-016.02–.12 drive. Parking them means rewriting those tests. `h.static` stays pending; AT-016.01 stays a declared red; the freeze makes that permanent until a later item.

**Evidence**: Req-016 tests call `h.sentinels.plant`, `h.faults.at` / `processRestart`, `h.clock.freezeAt` / `advance`, `h.vendors.email.*`, `h.config.get`. Req-001 loop tests call `h.clock.advance` on AT-001.12 and AT-001.13 and otherwise use the fixture SUT. Req-001 `_live.ts` `backedSutMethods` is the closed live claim. `ENV_ALLOWLIST` (`runner.ts` 129–166) never carries `AT_DB_SLOT` or `AT_JUDGE_API_KEY`. `supabaseInvocation` with no target (`runner.ts` 630–631) runs from the repo root with no `SUPABASE_*` at all.

**Impact**: The alternative “plain vitest against shipped modules and the one stack” still needs a reset, an identity proof, an env allowlist, and a live HTTP adapter for req-001. That is most of the runner minus grading. What it would drop is bijection, `--expect`, the ledger, and the unused judge. Dropping the first two loses the CI honest-red floor. Dropping the ledger loses the only mechanism that stops an integration green over a stand-in. Those are the costs to print under a “Harness ruling” heading if the lead parks more than the pool.

---

### 12. [observation] `stackEnv` and the drill tier still encode the old rule
**Components**: `db-pool.ts` `stackEnv` / `evidence`, `runner.ts` drill branch 1320–1329, `index.ts` `LiveSlotCoordinates` (`slot` field)

**Finding**: Even after occupancy is gone, two leftovers will teach the next editor the old doctrine. `stackEnv` cannot emit 44321 coordinates; a one-stack emitter has to be new. The drill tier is a hard infrastructure refusal whose stated reason is that it used to reset the personal stack. After the personal stack is the verify database, that comment is the inverted rule sitting on a dead path. The live adapter’s `opts.slot` is five strings, not a pool slot; renaming is cosmetic.

**Evidence**: `stackEnv` 1386–1388 throws on personal-block ports. Drill infra message (runner.ts 1325–1328) still calls the repo `config.toml` stack untouchable. `createLiveAdapter({ slot, vendors, ... })` in `_live.ts` 226–237 reads URLs and keys only.

**Impact**: Leave those comments in place and a later change will “protect” 44321 again. The one-stack evidence line should name project id, API port, reset, and migration counts, with no slot number. Drill can stay a refusal; rewrite the reason so it does not reassert the parked rule.

---

The gate, the live ledger, and the req-016 seams are sound for what they do today. The slot pool is not sound as the integration host for this item: its identity, its JWT pin, and its isolation boundary all point at a stack the done contract forbids. The judge is unused capacity. The ceremony park list is smaller than the set of live callers. The design station should rule the JWT pin and the 44321 identity read first; every other integration choice hangs on those two.