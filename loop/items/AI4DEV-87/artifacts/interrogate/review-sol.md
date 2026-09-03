## Findings

### 1. [warning] The shared client changes the drive’s HTTP contract

**Location**: `tests/at/harness/live-stack.ts:115`, `.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts:101`

**Finding**: The refactor does not preserve the requests previously sent by the verification drive.

**Evidence**: The drive calls `authPost` without a bearer at lines 101, 109, and 133. `authPost` now always adds `Authorization: Bearer <anonKey>`. Before this change, signup and password-grant requests sent only `apikey` and `Content-Type`. Mailpit access also changed from `/api/v1/messages` plus `/api/v1/message/{ID}` with an exact recipient check to `/api/v1/search?...` plus `/raw`. The skill still documents the old requests at lines 80–83. `live-stack.selftest.ts` tests no request headers or endpoints, and the transcript does not record headers, so an 11/11 drive cannot establish request preservation.

**Suggestion**: Share response parsing and redaction, but retain caller-specific request construction where the existing protocols differ. Add fetch-spy tests that pin headers, URLs, and bodies.

### 2. [warning] The “20 second” mail poll has no global time bound

**Location**: `tests/at/harness/live-stack.ts:206` and `verifyLinksFor`

**Finding**: `verifyLinksFor` can run far longer than its advertised twenty seconds.

**Evidence**: The deadline is checked only after `mailMessagesFor` completes. One call performs a search and then reads as many as 50 messages sequentially. Every request has its own ten-second timeout, so a single polling iteration can consume minutes before line 261 checks the deadline. Both the live adapter’s confirmation/reset methods and the verification drive await this function.

**Suggestion**: Apply one deadline or abort signal to the entire operation, pass the remaining time into each fetch, and stop reading messages once a matching link is found.

### 3. [warning] The false-green guard is tested only as a detached predicate

**Location**: `tests/at/harness/conformance.selftest.ts:139`, `tests/at/harness/index.ts:236`, `tests/at/harness/registry.ts:682`

**Finding**: No self-test verifies that the actual harness fallback reaches the above-loop refusal.

**Evidence**: The sole test manually calls `aboveLoopStandInRefusal('integration', false, ...)`. It never exercises `loadLiveAdapterModule → createHarness(live: false) → openWorld → CapabilityPending`. The six explicit refusal methods in the account adapter are likewise untested. Continuous integration runs typecheck, self-tests, and only loop-tier acceptance runs; it does not exercise this integration-tier wiring. Setting the fallback to `live: true`, or omitting/reordering the `openWorld` check, would let the fixture adapter answer above loop while all 170 self-tests and the continuous-integration jobs remain green.

**Suggestion**: Add a database-free black-box self-test using the notification requirement’s REQ-016 suite, which has no live adapter, and assert the exact per-ID refusal through the real factory and registry path.

### 4. [warning] Moving `CapabilityPending` introduces a central runtime dependency cycle

**Location**: `tests/at/harness/index.ts:12`, `tests/at/harness/registry.ts:208`

**Finding**: `index.ts` now imports `registry.ts` at runtime, while `registry.ts` performs a top-level dynamic import of `index.ts`.

**Evidence**: Every suite loads `_bind.ts → registry.ts`; registry then awaits `import('./index.ts')`; index statically imports `CapabilityPending` back from the still-evaluating registry. This makes initialization depend on loader-specific circular-module behavior. The cycle is unnecessary and couples the two central harness modules merely to share one error class.

**Suggestion**: Put `CapabilityPending` in a dependency-leaf error module and re-export it from `registry.ts` if that public import path must remain.

### 5. [warning] The lifecycle extraction creates another god module

**Location**: `tests/at/harness/local-stack.ts`

**Finding**: The new module is 1,268 lines with 36 exported declarations and still combines unrelated responsibilities.

**Evidence**: It owns environment filtering, redaction, configuration parsing, machine-wide locking, command construction, process execution, status and token validation, network readiness, migration proof, database reset, Docker identity, and evidence formatting. Its self-test also imports the requirement-specific account live adapter at `local-stack.selftest.ts:16`, crossing back from generic harness infrastructure into a suite implementation. The extraction relocates complexity but does not establish clean module boundaries.

**Suggestion**: Keep `local-stack.ts` as a small lifecycle façade and separate the lock/config protocol, Supabase command/status handling, and preparation/evidence orchestration. Move the account-token lifetime test beside the account adapter or into a neutral token utility.

### 6. [warning] Live prose still asserts that parked machinery is active

**Location**: `supabase/functions/_shared/accounts.ts:13`, `tests/at/harness/registry.ts:262`, `tests/at/harness/suite-adapters.ts:10`, `tests/at/suites/req-001/_fixture.ts:7`, `tests/at/suites/req-001/_integration.ts:1241`, `tests/at/suites/req-016/_fixture.ts:25`, `tests/at/harness/local-stack.ts:496`

**Finding**: The parked files have no live imports, but active comments still describe them as current enforcement.

**Evidence**: Comments say `adapterDerivedCapability` stamps live values, type probes are “kept alive” and “executed,” `pendingMethodProxy` throws refusals, and `live-email.ts` owns construction-time refusal. Those mechanisms are now parked and excluded from compilation and tests. These comments document trust and false-green protections, so claiming nonexistent checks is materially misleading rather than simple path rot.

**Suggestion**: Rewrite the live comments around the boolean gate and explicit refusal methods, referring to parked material only as historical context.