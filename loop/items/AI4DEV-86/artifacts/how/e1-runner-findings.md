[TURN] AI4DEV-86 (v1 ceremony out, CI aligned) - acceptance runner, tiers, --expect, and every slot entry so a slot-free 44321 integration path can be designed from facts
[HOOK] no stamp hook was emitted in this session

### Components Found

- **`at:verify` / `main()`** — `tests/at/harness/runner.ts` (`parseArgs` 85–114, `main` 1233–1465). Package script `bun tests/at/harness/runner.ts`. Parses `req-0NN --tier loop|integration|drill [--wired] [--expect]`, preflights bijection and (if `--expect`) the declaration, then either skips the database (loop), occupies and prepares a slot (integration), or refuses (drill). Spawns vitest, prints per-AT-id rows, applies `--expect` or the plain verdict.

- **`at:check` / `inspectBijection()`** — `tests/at/harness/check.ts`. Static AT-id bijection between `.taskmaster/docs/acceptance/at-req-0NN.md` P0 ids and `atTest('AT-…'` call sites under `tests/at/suites/req-0NN/*.test.ts`. The runner calls this as preflight (`runner.ts` 1260–1271). No slot logic.

- **`at:selftest`** — `package.json` line 16: `bunx vitest run --root tests/at --config vitest.config.ts harness/`. Runs `harness/**/*.selftest.ts`, including `db-pool.selftest.ts`. CI runs this; parking slot files shrinks this set.

- **`typecheck` / `pinnedTsc()`** — `tests/at/typecheck.ts`. Always type-checks both `tsconfig.json` (app) and `tests/at/tsconfig.json`. No slot logic.

- **`AT_CONFIG` / `AtConfigEntry`** — `tests/at/harness/atconfig.ts`. Single registry of pinned numbers. Suites never hard-code them.

- **`createConfigRegistry()` / `CONFIG_KEYS`** — `tests/at/harness/config.ts`. Dotted-key reader over `AT_CONFIG`, with per-world overrides. No slot logic.

- **`loadTierExpectation()` / `TierExpectation` / `ExpectedManifest`** — `tests/at/harness/expected.ts`. Reads `tests/at/expected/req-0NN.json`, validates schema and AT-id grammar, enforces bijection with the acceptance file’s P0 ids, then compares reported rows and vitest arithmetic to the declaration.

- **`atTest` / `bindSuite` / `TIER` / `AtPending`** — `tests/at/harness/registry.ts`. One registration site per AT id. `AT_TIER` has no default (`TIER` is `null` if unset). Builds a world per `open()`, tears harness and world down per id. Above loop, stubbed capabilities become `CapabilityPending` (`aboveLoopStubbedRefusal`, 807–810).

- **`createHarness()` / `buildCapabilityLedger()` / `buildLiveLedger()`** — `tests/at/harness/index.ts`. Loop ledger uses controlled clock + email sim + `_fixture.ts`. Above-loop ledger attests the database first, then real clock + live mail catcher + `_live.ts` (or falls back to the loop fixture, which stamps stand-in and makes every id declarably red).

- **`AdapterModules` / `SutOf` / `WorldOf`** — `tests/at/harness/suite-adapters.ts`. Compile-time list of suites: `req-001` and `req-016` only. Types come off `_fixture.ts`.

- **`occupy()` / `prepare()` / `stackEnv()` / `evidence()`** — `tests/at/harness/db-pool.ts`. The slot pool. Two standing stacks whose ports are `repo port + slot * 1000`. Occupancy, mirror, identity overlay, restart-on-config-change, identity proof, reset, migration proof, attestation write, child env.

- **`attestSlot()` / `writeAttestation()` / `mintAttestationNonce()` / `ATTESTATION_ENV`** — `tests/at/harness/attestation.ts`. After reset, the runner writes a nonce into `at_runtime.slot_attestation`. The child reads it back through `AT_SUPABASE_DB_URL` + `AT_SLOT_ATTESTATION`. That round trip is what lets live capabilities be labelled `real`.

- **`createLiveEmail()`** — `tests/at/harness/live-email.ts`. Integration `vendors.email`. Reads `MAILPIT_URL` from the child’s env (never recomputes slot ports). Requires a branded slot attestation.

- **`SLOT_ATTESTATION_BRAND` / `stampAttestation()` / `CapabilityPending`** — `tests/at/harness/capabilities.ts`. Provenance verdicts. Live grants require a stamped attestation whose brand is `'slot'`.

- **`Clock` vs `RealClock` / `TierHarness<T>`** — `tests/at/harness/contracts.ts`. Integration bodies lose `clock.advance` and vendor arming methods at the type level.

- **`createLiveAdapter()` in `tests/at/suites/req-001/_live.ts`**. Talks to Auth, edge functions, and Postgres using a `slot: LiveSlotCoordinates` object. `req-016` has **no** `_live.ts`.

- **Expected manifests** — `tests/at/expected/req-001.json` and `req-016.json`. Both declare `loop` and `integration`.

---

### Flow

1. **Entry.** `bun run at:verify req-0NN --tier <tier> [--expect] [--wired]` → `runner.ts` `main(argv)` (1233).

2. **`parseArgs` (85–114).** Requirement via `normalizeRequirement` (`check.ts` 41–45). `--tier` is required. Unknown flags throw. `--expect` + `--wired` is refused (usage exit 2).

3. **`--wired` (1245–1251).** Always exit 3: “the screen driver does not exist yet.” No tests.

4. **Suite directory** (`suiteDir`, `check.ts` 61–63). Missing dir → exit 2.

5. **Bijection preflight** (`inspectBijection`, `check.ts` 106–121, called at `runner.ts` 1260–1271).
   - P0 ids from `.taskmaster/docs/acceptance/at-req-0NN.md` via `acceptanceP0Ids` (regex `AT-<req>.<n> (P0)`).
   - Registered ids from `atTest('AT-…'` call sites in `*.test.ts`.
   - Any missing / extra / duplicate / zero-P0 → exit 2, no tests.

6. **`--expect` preflight** (`loadTierExpectation`, `expected.ts` 519–538, called at `runner.ts` 1278–1287).
   - File: `tests/at/expected/req-<requirement>.json` (redirected by `AT_REPO_ROOT`).
   - Parse + requirement-field copy/paste guard + known tiers `loop|integration|drill`.
   - Red kinds: `capability-pending` (exact first line) or `pending` (anchored prefix with phase `harness-missing|sut-missing|tier-unset`).
   - Bijection of declared ids with the acceptance P0 set.
   - Any failure → exit 2, **no lock, no Docker, no reset**.

7. **Tier dispatch (`runner.ts` 1319–1370).**
   - **`drill`:** infrastructure refusal (exit 3). Used to reset the repo `config.toml` stack; that path is closed.
   - **`loop`:** `stackEnv` stays `{}`. No lock, no stack, no reset.
   - **`integration`:** the only path that talks to a database, and it talks **only through the pool**.

8. **Integration occupy (`runner.ts` 1332–1345 → `db-pool.ts` `occupy` 901–998).**
   - If `AT_DB_SLOT` is set: `occupy(req, { slot: Number(override) })` — override path (`via: 'override'`). Skips “must have a reservation”, still refuses a slot reserved for a **different** item (`readReservationStrict`).
   - Else: derive item from `git rev-parse --abbrev-ref HEAD` (`itemFromBranch` 799–808), look up reservation (`slotForItem`). No reservation → refuse. **No fallback onto a free slot.**
   - Slot must already have `supabase/config.toml` (from `db-pool.ts setup`).
   - `refusePersonal` on that config (must not be project `poancmeitlmxejofwzuu` or ports 44320–44329).
   - Claim: `acquireStackLock(slotClaimKey(slot), …, { takeover: 'dead-pid-only' })`. Claim file is `at-verify-ai4good-slot-N-0.lock` (sentinel port 0, ruling T6).
   - Re-read reservation after the claim; if it changed, release and refuse.

9. **Integration prepare (`prepare`, `db-pool.ts` 1297–1360).**
   - Read repo `supabase/config.toml`.
   - `generateSlotConfig`: rewrite `project_id` to `ai4good-slot-N`; move listener ports by `+ slot*1000` (inspector 8083 by `+ slot*10`); **force `jwt_expiry = 120`** (`SLOT_JWT_EXPIRY_SECONDS`).
   - `refusePersonal` + `pathClosureProblems`.
   - `mirrorItemTree`: delete slot `supabase/`, copy repo `supabase/` excluding `.temp`, `.branches`, `config.toml`.
   - Write generated config. If hash ≠ `.last-start.json`, `stop` then `start` the slot.
   - `proveSlotTarget`: CLI `status -o json` through `supabaseInvocation` (`--workdir` = slot dir, `SUPABASE_PROJECT_ID=ai4good-slot-N`, no other `SUPABASE_*`, `bun --no-env-file`). Foreign container names, personal project id in output, `localStackProblems` against the **slot** config (loopback + slot ports + `iss=supabase-demo` + no hosted `ref`). Destructive acts also require a positive own-container name and `docker ps` showing `supabase_db_ai4good-slot-N`.
   - `waitForReady` → `resetSlotDatabase` → `waitForReady` → `proveMigrationsReplayed` (disk timestamps vs `supabase_migrations.schema_migrations`).
   - `mintAttestationNonce` + `writeAttestation` into `at_runtime.slot_attestation` (schema created by the runner, not a migration).

10. **Evidence + child env (`runner.ts` 1361–1369).**
    - Print `evidence()`: `at:verify — db slot N (ai4good-slot-N, api <status port>) — reset OK — migrations: E expected, A applied`.
    - `stackEnv()` emits only: `AT_SUPABASE_URL`, `AT_SUPABASE_DB_URL`, `AT_SUPABASE_ANON_KEY`, `AT_SUPABASE_SERVICE_ROLE_KEY`, `AT_SLOT_ATTESTATION`, `AT_SUPABASE_MAIL_URL`. Refuses to emit a URL whose port is in 44320–44329.

11. **Vitest spawn (`runner.ts` 1379–1398).**
    - Binary: pinned `node_modules/vitest/vitest.mjs` from `INSTALL_ROOT`.
    - Args: `run --root tests/at --config tests/at/vitest.config.ts --reporter=json --outputFile=<tmp> suites/req-0NN/`.
    - Env: `childEnv({ …stackEnv, AT_REPO_ROOT?, AT_TIER, AT_REGISTRATION_DIR })`. Allowlist drops `.env.local` secrets. `--no-env-file` on the child.
    - `cwd` is `INSTALL_ROOT`. `AT_TIER` is how `registry.ts` learns the tier.

12. **Inside vitest (`registry.ts` `atTest` 895–1002, `openWorld` 664–717).**
    - Each `atTest` registers one `it('AT-0NN.MM — title')` and appends a JSONL registration.
    - Per-tier body maps: `chooseTierBody` picks `integration` / `loop` / `default`.
    - `open()` → `createHarness({ requirement, tier })`.
    - Loop: `_fixture.ts` + Map storage + controlled clock + email sim.
    - Integration: `buildLiveLedger` (`index.ts` 337–447):
      1. `liveCoordinatesFromEnv()` reads the five `AT_SUPABASE_*` strings.
      2. `attestSlot()` must round-trip the nonce **before** anything else is built.
      3. Real clock + `createLiveEmail({ catcherUrl: mailUrl, attestation })`.
      4. If `suites/req-0NN/_live.ts` exists (only req-001), `createLiveAdapter({ slot: coordinates, vendors, … })` and grant `real` only over `backedSutMethods`.
      5. If no `_live.ts` (req-016), fall back to loop fixture; `fixtures.worlds` and `sut.*` stay stand-in; `registry.ts` throws `CapabilityPending` naming them.

13. **Report (`analyzeReportedTests` 1090–1154).** One runtime registration and one vitest result per expected P0 id. Title must match. Status `passed` → green; else red with redacted first failure line.

14. **Verdict.**
    - Without `--expect`: `runVerdict` (1179–1204). Any red/missing/extra, or non-zero vitest exit, → exit 1. Green rows + non-zero process exit is still failure.
    - With `--expect`: `expectationDeviations` + `reportAccountingDeviations` (`expected.ts` 305–452). A declared red that is green is a failure. Failed-test count must equal declared reds; passed count must equal declared greens; no pending/todo; file-level import/hook failures are deviations. Match → exit 0.

15. **Cleanup (`cleanupRun` 1213–1221).** Always in `finally`: remove report dir, release occupancy claim. SIGINT/SIGTERM also release.

**Exit codes:** 0 match/all-green; 1 test or expect failure; 2 usage / bijection / declaration refusal; 3 infrastructure (`--wired`, drill, occupy/prepare failure); 4 no usable vitest JSON.

**`at:check` alone:** `check.ts` `main` 123–171. Same bijection, no tests. Exit 0/1/2.

**`at:selftest`:** vitest over `harness/**/*.selftest.ts`. Independent of `AT_TIER` except where a selftest sets it.

---

### Files Read

- `package.json`
- `tests/at/harness/runner.ts` (full)
- `tests/at/harness/check.ts` (full)
- `tests/at/harness/expected.ts` (full)
- `tests/at/harness/registry.ts` (full)
- `tests/at/harness/atconfig.ts` (full)
- `tests/at/harness/config.ts` (full)
- `tests/at/harness/db-pool.ts` (full)
- `tests/at/harness/attestation.ts` (full)
- `tests/at/harness/live-email.ts` (full)
- `tests/at/harness/index.ts` (full)
- `tests/at/harness/contracts.ts` (partial, types)
- `tests/at/harness/capabilities.ts` (partial, attestation brand)
- `tests/at/harness/suite-adapters.ts` (full)
- `tests/at/harness/runner-expect.selftest.ts` (head)
- `tests/at/typecheck.ts` (full)
- `tests/at/vitest.config.ts` (full)
- `tests/at/expected/req-001.json`, `req-016.json`, `expected/README.md`
- `tests/at/README.md` (head)
- `tests/at/suites/req-001/_live.ts` (head + factory)
- `tests/at/suites/req-001/_integration.ts` (head)
- `tests/at/suites/req-001/a-signup-and-signin.test.ts` (head)
- `supabase/config.toml` (ports, `jwt_expiry`, `local_smtp`)
- `.github/workflows/ci.yml` (full)
- `loop/items/AI4DEV-86/brief.md` (scope for parking)

---

### Boundaries

**Inputs**

| Input | Where |
|---|---|
| CLI: `req-0NN`, `--tier`, `--expect`, `--wired` | `runner.parseArgs` |
| Acceptance P0 ids | `.taskmaster/docs/acceptance/at-req-0NN.md` |
| Suite registrations | `tests/at/suites/req-0NN/*.test.ts` `atTest(` call sites |
| Expected-state manifest | `tests/at/expected/req-0NN.json` |
| Repo stack identity | `supabase/config.toml`: `project_id = "poancmeitlmxejofwzuu"`, api **44321**, db **44322**, mail **44324**, `jwt_expiry = 3600` |
| Slot identity | derived: `ai4good-slot-N`, ports `from + N*1000` (slot 1 api **45321**, not 44321) |
| `AT_DB_SLOT` | parent process only, `runner.ts` 1338–1339 |
| `AT_TIER` | set by runner into the vitest child; read by `registry.ts` 138–146 |
| `AT_REPO_ROOT` | data-root redirect for black-box selftests (`check.ts` 38) |
| `AT_DB_POOL_ROOT`, `AT_DB_POOL_SIZE` | pool location and size (`db-pool.ts` 117–137, 147–154) |
| `AT_LOCK_DIR` | stack-lock directory (`runner.ts` 290–294) |
| Reservation files | `%LOCALAPPDATA%/ai4good-build/db-slots/reservations/slot-N.json` (PowerShell `Reserve-DbSlot`) |
| Pinned CLIs | `node_modules/supabase/dist/supabase.js`, `node_modules/vitest/vitest.mjs`, `node_modules/typescript/bin/tsc` |

**Outputs**

- Per-id table on stdout; `--expect` `EXPECTED` or `DEVIATION` lines.
- Child env coordinates (integration only).
- Occupancy lock file; released in `finally`.
- Side effect: **every integration run resets the occupied slot’s database**.
- Exit code consumed by CI and by humans.

**Downstream consumers of stack env (no `AT_DB_SLOT` themselves)**

- `index.ts` `liveCoordinatesFromEnv` 317–327: `AT_SUPABASE_URL|DB_URL|ANON_KEY|SERVICE_ROLE_KEY|MAIL_URL`.
- `attestation.ts` `attestationCoordinatesFromEnv` 211–214: `AT_SUPABASE_DB_URL` + `AT_SLOT_ATTESTATION`.
- `req-001/_live.ts` `createLiveAdapter({ slot })`: HTTP to `slot.apiUrl`, SQL to `slot.dbUrl`.
- `req-001/_integration.ts` 535–537 and 947–949: asserts `AT_SUPABASE_URL` and `AT_SUPABASE_ANON_KEY` for a real supabase-js client.

**CI (`.github/workflows/ci.yml`) — loop only**

1. Twin guard: `loop/work/twin-check.ps1` (this item parks it).
2. Prose fast lane (skip typecheck/selftest/check/verify if the PR does not touch `src|supabase|tests|.github` / root build files).
3. `bun run typecheck`
4. `bun run at:selftest`
5. `bun run at:check` for every `tests/at/suites/req-*/`
6. `bun run at:verify $req --tier loop --expect` for every `tests/at/expected/req-*.json`
7. Ownership guard (Lovable `src/` vs Claude `supabase|tests|loop|.claude|.github`)
8. Reference guard (no foreign `AI4DEV/AI4PM` ids in PR title/body)

CI never runs the integration tier and never sets `AT_DB_SLOT`.

**Declared state that must stay green**

- Loop `--expect`: req-001 (21 green, 15 `sut-missing` reds) and req-016 (11 green, AT-016.01 `capability-pending: H3 static provider scan`).
- Integration req-001: 15 green + 5 `capability-pending` (OAuth / GitHub stats / Discovery) + 15 `sut-missing`. Req-016 integration is **all 12** `capability-pending: fixtures.worlds, sut.notifications` because there is no `_live.ts`. The done contract asks for req-001 integration green against 44321, **not** req-016 integration.

---

### Every slot-logic entry (integration path)

**`runner.ts`**

| Lines | Symbol / site | What it does |
|---|---|---|
| 10–24, 44 | header + import | `occupy`, `prepare`, `evidence`, `slotStackEnv` from `db-pool.ts` |
| 240–242 | `readLocalConfig(root)` | Parameter exists so the pool can scan a **slot** config with the same parser |
| 587–644 | `CliTarget` / `supabaseInvocation` | Slot identity wall: positive `SUPABASE_PROJECT_ID`, no other `SUPABASE_*`, cwd = `--workdir` |
| 754–807 | `localStackProblems` | Loopback + **this config’s** api/db/mail ports + local JWT issuer |
| 964–993 | `SlotIdentityProof` / `resetLocalDatabase(target, proof)` | Reset with a target demands the identity-read proof |
| 1295–1300 | `stackHelp` | Mentions Docker + `db-pool.ts setup` |
| 1332–1369 | integration branch | **The only production call of occupy/prepare/evidence/stackEnv** |
| 1338–1339 | `process.env.AT_DB_SLOT` | **Sole read of `AT_DB_SLOT` in the runner** |

`acquireStackLock`, `waitForReady`, `proveMigrationsReplayed`, `resetLocalDatabase()`, `childEnv`, `redact`, report analysis, `--expect` are **not** slot-specific. They are reused by the pool.

**`db-pool.ts` — park as a unit (brief item 1)**

Port arithmetic `from + slot * 1000` is `portMappings` 318–370, applied in `generateSlotConfig` 409–445. Slot 1 of a 44321 api is **45321**. The 44321 block is `PERSONAL_PORT_LOW/HIGH` 73–74 and is **refused** by `personalBlockProblems` 457–488, `stackEnv` 1381–1388, and `withSlotSql` 1548–1552.

Also: `POOL_SIZE`, `slotDir`, `slotProjectId`, `slotClaimKey`, `occupy`, `prepare`, `resetSlotDatabase`, `proveSlotTarget`, `foreignContainerNames` / `ownContainerNames` / `slotDbContainers`, `mirrorItemTree`, reservation I/O, `itemFromBranch`, `stackEnv`, `evidence`, CLI `setup|status|spike`. `if (import.meta.main)` 1820–1827.

**`attestation.ts` — slot-shaped, round-trip still needed**

| Lines | What |
|---|---|
| 5–33, 39–43 | Slot nonce doctrine; `AT_SLOT_ATTESTATION`; table `at_runtime.slot_attestation` |
| 100–127 | `writeAttestation(target, read, nonce)` — currently called only from `prepare` |
| 157–208 | `attestSlot` — called from `index.ts` `buildLiveLedger` |
| 211–214 | `attestationCoordinatesFromEnv` |

The child never sees `AT_DB_SLOT`. It only sees the nonce + db URL.

**`live-email.ts` — comments say “slot”; code does not compute slots**

- Needs `catcherUrl` (from `AT_SUPABASE_MAIL_URL`) and a branded `LiveAttestation`.
- Probes Mailpit `/api/v1/info` for a `Version` string.
- No `AT_DB_SLOT`, no port offset.

**`index.ts`**

| Lines | What |
|---|---|
| 184, 247–266, 317–327, 342–348 | “slot” coordinates from env; label `the ${tier}-tier slot for req-…` |
| 397–398 | `createLiveAdapter({ slot: coordinates, … })` |

No import of `db-pool.ts`.

**`req-001/_live.ts` / `_integration.ts`**

- Factory option named `slot`; uses `slot.apiUrl/dbUrl/anonKey/serviceRoleKey`.
- `_integration.ts` 65: `SLOT_JWT_EXPIRY_MS = 120_000`, duplicated from `SLOT_JWT_EXPIRY_SECONDS` in `db-pool.ts` (not imported). AT-001.12/13 wait 135s / 150s against that lifetime.

**Not slot-aware:** `check.ts`, `expected.ts`, `config.ts`, `atconfig.ts`, `typecheck.ts`, `vitest.config.ts`, `registry.ts` (tier only), `suite-adapters.ts`.

---

### What a slot-free integration against the 44321 block still needs from these files

The brief wants the integration tier to target **the one stack** on api 44321 / db 44322 / mail 44324, project id `poancmeitlmxejofwzuu`, via `bun run db:start` / `db:reset`, **with no slot code on the path**.

**Keep (or thin-wrap) in `runner.ts`**

1. Argument parsing, bijection preflight, `--expect` preflight and comparison, vitest spawn, allowlisted `childEnv`, `AT_TIER`, `AT_REGISTRATION_DIR`, redaction, per-id report, cleanup-on-signal.
2. `readLocalConfig(REPO_ROOT)` — those ports **are** the target, not something to offset.
3. `supabaseInvocation(undefined, …)` / `runSupabaseCli` / `parseStackStatus` / `readStackStatus` — no-target already means repo workdir and **no** `SUPABASE_*` in the child (the wall against `.env`’s `SUPABASE_PROJECT_ID`).
4. `localStackProblems(status, repoConfig)` — loopback + 44321/44322/44324 + `iss=supabase-demo` + no hosted `ref`. This is the identity proof the brief keeps.
5. `waitForReady`, `expectedMigrations` / `proveMigrationsReplayed`, `resetLocalDatabase()` **with no CliTarget** (overload at 984 already resets the repo project).
6. `acquireStackLock(repoConfig, requirement)` — still required so two integration runs do not reset 44321 under each other. Today this lock is only taken on `slotClaimKey` (`ai4good-slot-N`, port 0), never on `poancmeitlmxejofwzuu`+44321.
7. Some evidence line that names **this** stack (project id + api port + reset + migration counts), without a slot number.

**Keep from `attestation.ts` (rename, don’t drop the round trip)**

- Mint nonce after reset, write into `at_runtime.slot_attestation` (or a renamed table) using the **proven** db URL, pass `AT_SLOT_ATTESTATION` (or renamed) into the child, `attestSlot` before the live ledger. `index.ts` will not grant `real` without it. `writeAttestation` today takes a `projectId` target plus `ProvenSlotRead`; that can be the repo project if the identity read is the repo `status`.

**Keep from `live-email.ts`**

- The Mailpit probe and `messagesFor`. Point it at `status.mailUrl` for the 44321 catcher (44324). Drop “slot 1 port” comments. Keep the attestation brand check.

**Keep from `index.ts` / `_live.ts`**

- `LiveSlotCoordinates` is already just five strings. Rename `slot` if desired; the adapter does not know about pool dirs or port math.
- Req-001 `_live.ts` stays the SUT. Req-016 stays declarably red at integration (no `_live.ts`).

**Drop / park**

- Entire `db-pool.ts` + `db-pool.selftest.ts` + `bun tests/at/harness/db-pool.ts setup|spike|status`.
- `runner.ts` integration block 1332–1369 (`occupy` / `prepare` / `AT_DB_SLOT`).
- Reservation / `itemFromBranch` / `AT_DB_POOL_*` / port overlay / `personalBlockProblems` / `ai4good-slot-N` / `slot * 1000`.
- `loop/work/db-slots.ps1` (out of this angle’s files, named by the brief).

**Must not keep as-is: `AT_DB_SLOT=1` meaning “44321”.** Today `AT_DB_SLOT=1` occupies **slot 1** (`ai4good-slot-1`, api **45321**). The 44321 block is the repo/personal stack the pool is built **not** to touch. The brief’s “environment facts” line that pairs `AT_DB_SLOT=1` with 44321 is leftover language; the done contract is “no slot code on the path.”

---

### Non-Obvious Things

1. **44321 is not slot 1.** Slot 1 = 44321 + 1000 = 45321. `personalBlockProblems` **fails closed** if a slot config ever carries 44320–44329 or project id `poancmeitlmxejofwzuu`. Parking slots and targeting 44321 **reverses** the “personal stack is untouchable” rule that `runner.ts` 10–13 and `db-pool.ts` 8–12 state as load-bearing.

2. **`jwt_expiry` is only lowered in the slot generator.** Repo `supabase/config.toml` line 174 is `jwt_expiry = 3600`. `generateSlotConfig` rewrites it to 120. Req-001 integration bodies wait 120s + slack (`_integration.ts` 65–80, 487, 559). Against the 44321 stack **as shipped**, AT-001.12/13 will not see expiry inside their 4-minute budget. Loop tests still model 3600 (`_fixture.ts`). A slot-free integration that must stay green has to pin 120 on the **one** stack (standing config change, or a prepare-like rewrite of the repo file — the latter is what `db-pool.ts` 387–395 rejected as unsafe).

3. **`--expect` is additive.** Without it, any red is exit 1. With it, declared reds must stay red **with the exact rebuilt first line**. Improvement without a manifest edit is a failure. Loop CI depends on this for both suites.

4. **`AT_TIER` has no default.** A bare vitest run of a suite is `tier-unset` (`AtPending`) on first `open()`.

5. **Above-loop stub refusal is `CapabilityPending`, not a bare `expect`.** That is what makes integration `--expect` declarable (`registry.ts` 687–706, `aboveLoopStubbedRefusal`).

6. **Req-016 has no live adapter.** Integration `--expect` for 016 is twelve `capability-pending` reds. The done contract does **not** require 016 integration green.

7. **Attestation is not the identity proof.** `localStackProblems` is fabricable with typed strings. `attestSlot` is the positive “this database answered with this run’s nonce.” The brief keeps the identity proofs; the live ledger also needs the round trip or every `real` grant dies.

8. **`writeAttestation` is not a migration.** Table lives in `at_runtime` so `proveMigrationsReplayed` still matches `supabase/migrations` exactly. Reset drops it; prepare recreates it.

9. **CLI identity wall exists because a reset destroyed the founder’s database (2026-08-09).** Tracked `.env` carried `SUPABASE_PROJECT_ID=poancmeitlmxejofwzuu`; a slot reset with that env hit the personal project. `supabaseInvocation` states identity positively and strips other `SUPABASE_*`. A slot-free path that resets 44321 **is** resetting that project, on purpose. The wall still matters so a hosted URL or a second `SUPABASE_*` cannot sneak in.

10. **`childEnv` allowlist does not include `AT_DB_SLOT`.** Only the parent runner reads it. The vitest child cannot occupy a slot.

11. **`--wired` is a hard 3**, and cannot combine with `--expect`.

12. **Drill refuses** so it cannot reset 44321. After parking, 44321 **is** the integration target; drill is still undecided.

13. **Lock takeover policies differ.** Runner default `stale-or-dead` (60 minutes). Pool occupancy `dead-pid-only` so a long verify is not stolen. A single-stack lock on 44321 should keep `dead-pid-only` (or equivalent).

14. **`INSTALL_ROOT` vs `REPO_ROOT`.** Binaries always from the real checkout; acceptance files/suites follow `AT_REPO_ROOT`. `--expect` selftests plant disposable trees this way.

15. **CI does not run integration.** Aligning CI with the brief means: drop twin-guard; keep typecheck, `at:check`, loop `--expect`, ownership, reference; `at:selftest` shrinks when `db-pool.selftest.ts` is parked. Integration green is a **local** (and possibly cloud VM) check against the one stack, not a CI step today.

16. **Known `--expect` hole** (`expected.ts` 371–376, README §5): a hook throw in a file that already has a failed test is invisible. Loop declarations for 001/016 currently live with that hole.

17. **Standing `jwt_expiry=120` on a slot means the slot grades a different session lifetime than the tree.** Documented in `db-pool.ts` 402–406 as a reviewed exception. Moving to 44321 without an equivalent pin changes AT-001.12/13 from “wait two minutes” to “wait an hour.”

18. **`resetLocalDatabase()` with no target already aims at the repo stack.** The integration main path never uses that overload; it always goes through `resetSlotDatabase` → targeted reset. Repointing in place is mostly: stop calling `occupy`/`prepare`, call the no-target reset + local proofs + attestation write instead.

---

### Open Questions

- I did not execute `at:verify` or inspect a running 44321 stack. Whether that stack is up, whether `jwt_expiry` in the **running** GoTrue is 3600, and whether Mailpit answers on 44324 were not measured this turn.

- I did not read `loop/work/db-slots.ps1` (PowerShell reservation helper). Occupancy’s reservation files are that helper’s contract; the brief parks it with the pool.

- I did not fully read `req-001/_live.ts` beyond the factory and comments, nor every per-id body in `_integration.ts`. Backed-method list vs declaration greens were not re-diffed line by line.

- Whether `writeAttestation`’s `AttestationTarget` can be satisfied by a no-target identity read without `proveSlotTarget` (which is slot-specific: container-name suffix `ai4good-slot-N`) is a design hole: **`proveSlotTarget` cannot be reused as-is against `poancmeitlmxejofwzuu`**, because `ownContainerNames` / `foreignContainerNames` / `slotDbContainers` are all keyed on `ai4good-slot-N`. A 44321 path needs an identity read that looks for `supabase_*_poancmeitlmxejofwzuu` instead — or drops the container-name instrument and keeps only `localStackProblems` + loopback ports, which is weaker than today’s destructive-path rule (ruling T2: ports alone were not identity in the 2026-08-09 incident).

- `SLOT_ATTESTATION_BRAND = 'slot'` is baked into `capabilities.ts` and `live-email.ts`. Renaming it is optional for parking; leaving the brand string `'slot'` while parking pool code would be a naming leftover, not a functional slot dependency.

- I could not determine from these files whether the founder still treats 44321 as a daily personal stack that must not be reset, or has accepted that this item makes it the shared verify database. The brief says the latter; `runner.ts`/`db-pool.ts` comments still say the former. That is the design-station conflict, not a missing pointer in the harness.