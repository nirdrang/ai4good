**Scores**

| Criterion | K | L | M | N |
|---|---|---|---|---|
| 1 Proof on destructive path | 3 | 3 | 2 | 3 |
| 2 Positive identity | 3 | 2 | 2 | 2 |
| 3 Surface | 2 | 1 | 3 | 1 |
| 4 Session lifetime | 3 | 2 | 2 | 2 |
| 5 Smallest honest diff | 2 | 1 | 1 | 3 |
| 6 Lock and evidence | 3 | 3 | 3 | 3 |
| Total | 16 | 12 | 13 | 14 |

**K evidence**
1. 3: Deletes no-target `resetLocalDatabase` overloads (`tests/at/harness/runner.ts:984-986`) and passes the same read to `reset` guard (`runner.ts:987`) and `writeAttestation` (`tests/at/harness/attestation.ts:100-101`); zero prod callers remain once `db-pool.ts:1265` parks.
2. 3: `proveLocalTarget` runs `runSupabaseCli(target)` (`runner.ts:657`), refuses foreign names (`tests/at/harness/db-pool.ts:1084`) first, keeps `localStackProblems` (`runner.ts:754`) and `supabaseInvocation` wall (`runner.ts:630-644`), requires own names (`db-pool.ts:1110`) plus `docker ps supabase_db_<id>` (`db-pool.ts:1126-1144`); target comes from `readLocalConfig` (`runner.ts:244`), personal refusals (`db-pool.ts:73-75,457,492`) leave with the parked file.
3. 2: Branch is one screen but calls `acquireStackLock` (`runner.ts:397`) plus `prepareLocalStack`, `localEvidence`, `localStackEnv` (4 visible, exceeds at-most-two); it hides wait/reset/migrations/write inside `prepare`, with no framework.
4. 3: Pins `jwt_expiry=120` (`supabase/config.toml:174` currently `3600`), one `atconfig.ts` entry, fixture reads via `h.config.get` (uses `index.ts:121` passing `config` to `createFixtureAdapter`, `_fixture.ts:426` gains it, `config.ts` dotted-key pattern) preserving overrides while `_integration.ts:65,83` reads direct as running-stack fact; `b-verification-and-sessions.test.ts:405,519` advances move to the registry; no manifest edit.
5. 2: Counts verify (`tests/at/harness`: 34 files, 15493 lines; `db-pool.ts:1827` + selftest `668` = `2495` moved; 9 describes at `db-pool.selftest.ts:121,241,329,343,394,510,538,582,621` with 33 its; 13 to 12 files; park `loop/parked/v1` outside `tests/at/tsconfig.json:**/*`); selftest story is honest (admits `results.json` time not measured) but edited total `519/116` is largest plus an unrequested fail-open lifetime probe and a retained `runner.ts:42-44` cycle.
6. 3: `dead-pid-only` (`runner.ts:330,397`; pool passes it `db-pool.ts:326`) keyed by `stackLockPath` (`runner.ts:308-309` projectId-apiPort) gives `at-verify-poancmeitlmxejofwzuu-44321.lock` (`runner.ts:290-293`, `config.toml:5,19`); evidence names project, status-derived port via `statusApiPort` (`db-pool.ts:1418`, ruling `db-pool.ts:1433-1436`), reset, `proveMigrationsReplayed` counts (`runner.ts:938-943`, 5 migrations), and lock file with no slot.

**L evidence**
1. 3: Deletes both reset overloads (`runner.ts:984-985`) leaving `reset(target,proof)`, deletes `undefined` seam branch (`runner.ts:631,657`) and `readStackStatus` (`runner.ts:673`, caller `db-pool.ts:1497` parked), narrows `SlotIdentityProof` (`runner.ts:964-966` `string|null` to `string`); `runner.selftest.ts:173,179` already pass a target.
2. 2: Proves `poancmeitlmxejofwzuu` from own/foreign helpers (`db-pool.ts:1084,1110` same regex, suffix rule verified) plus `localStackProblems` and required-target wall, states target from `readLocalConfig(REPO_ROOT)`, imports nothing from `db-pool.ts`; omits the docker probe (`db-pool.ts:1126,1140`) by design, leaving a single instrument where the pool comment (`db-pool.ts:1116-1124`) demands two.
3. 1: Branch is one screen but exposes `proveTarget`, two `waitForReady`, `reset`, `proveMigrationsReplayed`, `mint/writeAttestation`, `evidenceLine`, `childCoordinates` (about 8 calls) with proof pass-through; it explicitly rejects a `prepare` wrapper, violating at-most-two.
4. 2: Pins `120` with one entry `accessTokenLifetimeSeconds` and updates `_fixture.ts:468`, `_integration.ts:65,83,487,559`, and `b-verification:405,519` with no manifest edit; both suite files import `AT_CONFIG` directly, bypassing the `index.ts:121,189,351` registry and `createConfigRegistry` overrides plus the `config.ts` dotted-key pattern.
5. 1: Small (`170/90`, 9 files) with correct park outside every tsconfig (`tests/at/tsconfig.json` includes `**/*` under `tests/at`; `vitest.config.ts` includes `harness/**/*.selftest.ts`) and first CI coverage of the read; undercounts the move as about `2300` versus `1827+668=2495` and lists docker callers as `resetSlotDatabase,stopSlotStack` while `stopSlotStack` (`db-pool.ts:1270-1278`) never calls `proveSlotDbContainer`.
6. 3: Same `dead-pid-only` lock via `readLocalConfig(REPO_ROOT)` to `at-verify-poancmeitlmxejofwzuu-44321.lock` with existing `cleanupRun` release; evidence names project, status port, reset, `E expected, A applied`, and lock file with no slot.

**M evidence**
1. 2: Deletes no-target reset signatures leaving `reset(target,proof)` with zero prod callers beyond the new module (`db-pool.ts:1265` parked; `runner.selftest.ts:173,179` already targeted); renames the proof to `TargetIdentityProof` instead of reusing `SlotIdentityProof` (`runner.ts:964`) and keeps it nullable, weaker than narrowing, plus extra signal handling.
2. 2: Uses targeted seam, own/foreign classifiers, `localStackProblems`, and exact `supabase_db_poancmeitlmxejofwzuu` docker check with no `db-pool.ts` import; hardcodes `ONE_STACK` duplicating `config.toml:5,19,44,117` against `runner.ts:238` never hard-coded plus `readLocalConfig:244-273`, and requires `mailUrl` always versus `StackStatus:570` optional and `localStackProblems:784-790` only-when-reported.
3. 3: Branch is one screen calling only `prepareLocalStack(requirement)` plus `console.log`/`Object.assign` of returned `{env,evidence,lock}`; it hides config agreement, lock, two reads, docker, reset, migrations, attestation, env, evidence, and partial-failure cleanup with no pass-through and no framework.
4. 2: Pins `jwt_expiry=120` with one entry `supabaseJwtExpirySeconds:120` read in `_fixture.ts` and `_integration.ts` via `AT_CONFIG` plus `b-verification` extending its ` _integration.ts:69` import, no manifest edit and `240000` budget kept; both read direct, bypassing `h.config` overrides.
5. 1: Park is correct (`loop/parked/v1/tests/at/harness`, `README` dead-text, outside `tests/at/tsconfig.json` and `vitest.config.ts` roots) and arithmetic is honest (33 minus 5 is 28 fewer, `668` minus about 60 is about 610); touches 19 paths including five settings/guidance files and `index.ts`/`attestation.ts` label changes beyond the nine questions, not smallest.
6. 3: `dead-pid-only` lock yielding `at-verify-poancmeitlmxejofwzuu-44321.lock` and evidence `local stack poancmeitlmxejofwzuu, api 44321, reset OK, 5 expected, 5 applied, lock:<file>` naming all five with proven port and no slot (5 migrations verified under `supabase/migrations`).

**N evidence**
1. 3: Deletes both reset overloads quoted verbatim (`runner.ts:984-985`) keeping `reset(target,proof:SlotIdentityProof)` with guard `runner.ts:987`; `ProvenLocalRead(string,StackStatus)` is assignable to `SlotIdentityProof` and `ProvenSlotRead` (`attestation.ts:80-84`); zero callers (loop never resets, drill refuses `runner.ts:1324-1328`, pool parked, selftests already targeted).
2. 2: Proves from `own/foreignContainerNames` over one `runSupabaseCli(target)` plus `parseStackStatus` (avoids `readStackStatus:673` which drops raw text), keeps `localStackProblems` and `supabaseInvocation`/`childEnv` wall (`runner.ts:129,169`), states target from `readLocalConfig`; omits docker (`db-pool.ts:1126,1140`), single instrument only.
3. 1: Branch is about 30 lines with `proveLocalTarget`, two waits, `reset`, `proveMigrations`, `mint/write` plus inline six-key assign and inline evidence string (about 6 calls, untestable duplication); exceeds one screen and at-most-two while rejecting a `prepare` wrapper.
4. 2: Pins `jwt_expiry=120` with one entry `authJwtExpirySeconds:120` read in `_fixture.ts` and `_integration.ts:65` (`SLOT_JWT_EXPIRY_MS` name kept) plus `b-verification:405,519` (`TTL`, `TTL-1s`), no manifest edit and `INTEGRATION_TIMEOUT_MS:83` kept; both read direct with no `CONFIG_KEYS` row, bypassing registry overrides.
5. 3: Smallest honest (`runner.ts:140/75`, selftest `75/0`, `atconfig:12/0`, suites `4/6,4/10,8/6`, `config.toml:3/2`; live `246/99` net `+147`; moves `1827`/`668` exact); keeps existing 18 `runner.selftest.ts` tests (8 describes `51,94,116,166,183,192,273,282` with 18 its verified) and shrinks `at:selftest` by `33/668/1-of-13` correctly (`package.json:at:selftest` roots `tests/at`, `vitest.config.ts` glob, `tests/at/tsconfig.json` scope).
6. 3: Same `dead-pid-only` lock to `at-verify-poancmeitlmxejofwzuu-44321.lock`; inline evidence names project, port, reset, counts, and lock file with no helper and no slot; port comes from `config.apiPort` after `localStackProblems:769-770` proved equality with status, same `44321` value.

**Ranking**
1. K is best because it is the only generic `CliTarget` design with two instruments, registry-correct lifetime handling, and exact counts, leaving the cleanest extension path.
2. N is second because it is the smallest exact diff with no cycle and preserved tests, but it settles for one instrument, inline untestable emitters, and registry-bypassing reads.
3. M is third because its one-call surface is ideal yet hardcoding the project, requiring mail always, and widening scope to 19 paths outweigh the surface win.
4. L is fourth because its pure verdict and narrowed proof are strong yet it exposes the most stages in the branch and carries two verifiable count/caller inaccuracies.

**Graft list for K**
- From M: repeat the identity read immediately before destruction so a long `waitForReady` cannot separate proof from reset, plus M pre-return signal guard closing the null-lock interval.
- From L: split a pure `identityVerdict(CliResult,target,config)` testable without Docker/CLI and narrow `SlotIdentityProof:966` to `string` so null is a compile error.
- From N: import `mintAttestationNonce,writeAttestation` from `attestation.ts` only (`attestation.ts:36` imports only `capabilities.ts`) to kill the `runner.ts:42-44` style cycle, and keep the existing 18 `runner.selftest.ts` tests byte-identical.

**Judgment**
K would green with the most safety margin and the least future friction, while N would also green with less code; picking N is not a failure but leaves the second instrument, override coherence, and reuse on the table, so the gap is real but not regrettable.

K=16 L=12 M=13 N=14
K > N > M > L
close