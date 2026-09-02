## Findings

### 1. [structural] The stated completion gate is impossible with the frozen suite
**Components**: `brief.md`, `runner.ts`, `tests/at/expected/req-001.json`  
**Finding**: The Done contract requires `at:verify req-001 --tier integration` without `--expect`, but that mode requires every acceptance ID to pass. The current integration suite deliberately contains known reds.  
**Evidence**: `brief.md:51-52,120-123` names the command without `--expect`. `runner.ts:1179-1203,1433-1437` fails an undeclared run for any red or missing ID. `req-001.json:47-88` records 16 green and 21 red integration IDs, including 16 `sut-missing` results. The item freezes the suite and implements none of those capabilities.  
**Impact**: A correct one-stack repoint still cannot meet the Done contract. The gate must either use the existing integration expectation manifest or expand into a much larger product-implementation item.

### 2. [structural] The pool module is the integration preparation transaction, not merely an allocator
**Components**: `runner.ts`, `db-pool.ts`, `attestation.ts`, req-001 live adapter  
**Finding**: Slot allocation, locking, target identity, reset, migration verification, attestation, environment construction, and evidence are fused into `db-pool.ts`. Parking it removes the only composition that safely prepares integration state.  
**Evidence**: `runner.ts:41-44` eagerly imports the pool, while `db-pool.ts:49-70` imports runner primitives back. The integration branch delegates entirely to `occupy()`, `prepare()`, and `slotStackEnv()` at `runner.ts:1332-1369`. `db-pool.ts:1297-1360` performs the preparation transaction. Positive project identity is produced only by `proveSlotTarget()` around `db-pool.ts:1154-1243`; the generic runner checks URLs and ports but not project identity, and its no-target reset overload requires no proof. `attestation.ts:100-114` requires that positive project proof before writing the nonce.  
**Impact**: Simply moving `db-pool.ts` can break even loop-tier module loading. A partial replacement can reset an insufficiently identified stack or leave the child unable to attest it. The generic preparation transaction and positive-identity proof must survive independently of pool selection.

### 3. [structural] Req-001’s live timing depends on configuration generated only by the parked pool
**Components**: `db-pool.ts`, `supabase/config.toml`, `tests/at/suites/req-001/_integration.ts`  
**Finding**: Two declared-green integration tests assume a 120-second JWT lifetime, while the one target stack declares 3,600 seconds. The pool currently hides that mismatch by generating a 120-second configuration and restarting Auth.  
**Evidence**: `db-pool.ts:379-437` rewrites `jwt_expiry` to 120; `:1297-1331` restarts when generated configuration changes. `supabase/config.toml:164-174` declares 3,600 seconds. `_integration.ts:57-83` hard-codes 120 seconds; AT-001.12 waits 135 seconds at `:484-490`, and AT-001.13 stops polling after 150 seconds at `:555-566`.  
**Impact**: Against the proposed stack, one test observes an unexpired token and the other stops before the expected rotation. Changing the tracked value alone is insufficient unless the running Auth configuration is also restarted and verified.

### 4. [concern] The one-stack lock does not govern every destructive path
**Components**: `runner.ts`, `db-pool.ts`, `package.json` database scripts  
**Finding**: The reusable lock defaults to allowing takeover of a live holder after 60 minutes. The safer `dead-pid-only` policy is selected only by the pool occupancy layer being parked. Standard stack-management commands do not participate in the lock.  
**Evidence**: `runner.ts:321-342,397-400` defines `stale-or-dead` as the default. `db-pool.ts:891-896,962-965` explicitly selects `dead-pid-only`. `package.json:17-19` exposes `db:start`, `db:stop`, and `db:reset` without the shared claim.  
**Impact**: A replacement path can accidentally inherit the weaker policy, while another terminal or automation can reset the sole stack during a run. Integration evidence remains race-sensitive unless all normal destructive entry points honor the same ownership boundary.

### 5. [structural] The v1 parking boundary cuts through the retained v2 control plane
**Components**: `.claude/settings.json`, `statusline.ps1`, `work-lib.ps1`, `controller/SKILL.md`, `materialize.ps1`, `mechanical.md`  
**Finding**: Files designated for parking still provide functions and contracts required by retained settings hooks and v2 actors. This is not a clean old-system/new-system boundary.  
**Evidence**: `.claude/settings.json:38-40` retains `statusline.ps1`, which unconditionally loads `work-lib.ps1` at `statusline.ps1:108` and calls its attribution functions at `:121-132`. The v2 controller calls `Set-HeldItem` and `Clear-HeldItem` at `controller/SKILL.md:72,191`, delegates materialization rules to the old `/work` material, and invokes `materialize.ps1`, which itself loads `work-lib.ps1`. The retained controller and mechanical agent both require `.claude/skills/work/shared-invariants.md`.  
**Impact**: Parking the named v1 files can silently remove attribution from the status line and leave the replacement controller unable to materialize, claim, or clear work. The proposed physical move does not match the actual dependency graph.

### 6. [concern] Retained operational entry points still instruct users to run parked machinery
**Components**: cloud setup, cloud session documentation, controller instructions, drill suite  
**Finding**: Cloud bootstrap and regression drills remain explicitly coupled to the pool and v1 ceremony slated for parking.  
**Evidence**: `controller/SKILL.md:156-157`, `.claude/cloud-environment-setup.sh:39-50,216`, and `.claude/cloud-session-readme.md:14,32-34,106-120` configure `AT_DB_SLOT`, `AT_DB_POOL_ROOT`, and `AT_DB_POOL_SIZE`, then instruct users to run `db-pool.ts setup`. `run-drills.ps1:301-370` invokes the twin guard and requires the conductor, phase files, and parked agent contracts to remain present.  
**Impact**: A fresh cloud worker follows a broken or obsolete provisioning path, while the retained drill command rejects the intended new architecture. Local success would not establish that the supported operating paths still work.

### 7. [structural] The frozen acceptance path cannot host the stated plain-Vitest future
**Components**: `check.ts`, `runner.ts`, `suite-adapters.ts`, Vitest configuration, CI  
**Finding**: New tests are supposed to use ordinary Vitest, but the retained CI pipeline only understands the legacy harness registration protocol.  
**Evidence**: `check.ts:70-96` recognizes literal `atTest(...)` call sites. `runner.ts:1090-1153` requires exactly one runtime registration emitted by `atTest` for each ID. `suite-adapters.ts:107-114` is a closed map containing only req-001 and req-016. `vitest.config.ts:16` includes only acceptance-suite and harness-selftest paths, while CI runs `at:check` and harness `at:verify` for every suite.  
**Impact**: A plain `it(...)` acceptance test inside the existing tree fails harness accounting; one outside it is not run by this CI path. Future acceptance work must either keep modifying the supposedly frozen harness or gain a separate test pipeline. The bijection still has a useful narrow role for the two legacy suites, but it is not a general plain-Vitest architecture.

### 8. [structural] `--expect` has a documented whole-run false-green gap
**Components**: Vitest JSON reporting, `expected.ts`, `runner.ts`, CI manifests  
**Finding**: When any red is expected, the harness cannot use Vitest’s non-zero process status directly and reconstructs success from its JSON report. A same-file hook failure can be serialized identically to the expected failing-test case.  
**Evidence**: `expected.ts:365-376` explicitly documents the measured residual gap. Process status is checked only when zero reds are declared at `:443-447`. `runner.ts:1443-1452` returns success when reconstructed deviations are empty. Both current loop manifests contain expected reds, so CI uses this path.  
**Impact**: CI can pass while setup or teardown in a file failed. The expectation manifests still detect changes to declared per-ID progress, but they cannot provide the stronger whole-run-integrity claim used to justify the custom grading layer.

### 9. [structural] The capability ledger is both requirement-global and weaker than its “real” label implies
**Components**: `contracts.ts`, `index.ts`, `registry.ts`, `capabilities.ts`, live email and oracle capabilities  
**Finding**: Every test receives one eager, requirement-wide capability universe. The same `real` classification covers product-backed services, harness-owned machinery, and transports selected without proving they are currently operable.  
**Evidence**: `contracts.ts:361-377` makes the complete capability surface part of every `AtHarness`. `index.ts:337-406` eagerly constructs email, sentinels, faults, and the oracle. `registry.ts:705-706` rejects all stand-ins before selecting the test’s SUT method. `capabilities.ts:165-168,281-286` grants unconditional `real` witnesses to several harness-owned facilities. The live oracle can also be classified real before the child has its required credential. All req-016 integration IDs consequently stop on the same global capability pair in `req-016.json:25-40`.  
**Impact**: An unrelated missing capability prevents useful partial integration coverage, while an empty stand-in list does not necessarily mean every capability is product-backed and usable. The data model conflates dependency selection, provenance, and readiness.

### 10. [concern] The semantic judge is a zero-consumer subsystem that is not operable from acceptance children
**Components**: `oracles.ts`, `record-oracles.ts`, oracle selftests, contracts, runner environment  
**Finding**: No current acceptance suite calls the harness semantic judge. Req-016’s similarly named `_oracles.ts` contains separate deterministic helpers, not a consumer of `h.oracles`.  
**Evidence**: There are no `h.oracles` or `oracles.judge` call sites under `tests/at/suites`. `contracts.ts:165-172` names only future suites that do not exist. The recording store says it is empty, and `record-oracles.ts` says the live path has not run. `oracles.ts:798-806` requires `AT_JUDGE_API_KEY`, but `runner.ts:129-166,1395` deliberately omits it from the child environment. Nevertheless `index.ts` constructs the oracle for every harness.  
**Impact**: A large implementation, selftest surface, dependency, and capability failure mode currently produce no acceptance evidence. Freezing it preserves speculative infrastructure whose first real consumer would still require a new credential boundary.

### 11. [concern] Most req-016 machinery proves a conforming reference model, not shipped behavior
**Components**: req-016 fixture and suites, sentinels, faults, vendor simulation, guards, clock, CI  
**Finding**: Req-016’s fixture derives its implementation from the same taxonomy used by its tests. Its machinery exercises meaningful reliability scenarios, but against a model conforming by construction rather than product code.  
**Evidence**: `_fixture.ts:2-13` explicitly says req-016 is unimplemented and that the adapter is a reference stand-in derived from its own specification. `req-016.json:4-40` records eleven loop greens, one loop red, and no integration greens. CI verifies only that loop declaration.  
**Impact**: These greens demonstrate executable-spec and harness conformance, not notification-product regression protection. Sentinels, faults, vendor simulation, guards, and the req-016 fixture therefore earn their current cost only if that preimplementation design artifact is deliberately valued. The controlled clock and req-001 fixture have separate, narrower value because req-001 uses them with shipped decision modules; the machinery should not be ruled on as one indivisible block.

### 12. [concern] Local integration evidence is not bound to the pull-request head
**Components**: CI workflow, runner evidence, pull-request verification contract  
**Finding**: CI verifies the exact commit but runs no integration tier. The local integration transcript proves stack preparation facts without recording the tested commit or whether the worktree was dirty.  
**Evidence**: `.github/workflows/ci.yml:60-78` reports the CI SHA, while `:195-236` runs only loop-tier `--expect`. The preparation evidence from `db-pool.ts:1438-1442` and final runner summary at `runner.ts:1421-1431` contain no source revision.  
**Impact**: A valid local run can be followed by untested changes that still receive green CI. The changed one-stack integration boundary therefore lacks a trustworthy final-head merge gate.

### 13. [observation] Much of the “slot-shaped” live code is generic safety machinery
**Components**: `attestation.ts`, `capabilities.ts`, `clock.ts`, `live-email.ts`, `index.ts`  
**Finding**: Names such as `AT_SLOT_ATTESTATION`, `SLOT_ATTESTATION_BRAND`, and `LiveSlotCoordinates` suggest pool behavior, but these components implement a generic nonce round trip, capability brand, coordinate check, and Mailpit probe. They contain no slot selection or reservation logic.  
**Evidence**: `attestation.ts:68-114,157-208` works from supplied coordinates and positive project evidence. `capabilities.ts`, `clock.ts`, and `live-email.ts` enforce the resulting brand, while `index.ts:317-354,397-421` requires it before granting live capabilities.  
**Impact**: Parking these functions because of their names would remove the live-evidence boundary and prevent integration construction. They may need neutral naming, but their behavior belongs with the surviving one-stack preparation path rather than with the retired allocator.