## Findings

### 1. [warning] Moving the pending error creates a runtime dependency cycle
**Location**: `tests/at/harness/index.ts:12`, `tests/at/harness/registry.ts:168`

**Finding**: Harness construction now imports the registry that loads it, solely to obtain an error class.

**Evidence**: `index.ts` imports `CapabilityPending` from `registry.ts`; the registry imports Vitest and executes a top-level awaited import of `index.ts` at line 208. `_live.ts:77` also acquires these initialization dependencies merely to throw pending errors. Consequently, importing the adapter’s pure `lifetimeProblem` now initializes the test registry and harness. The 170 passing Vitest tests do not eliminate this circular dependency.

**Suggestion**: Put pending errors in a dependency-free module, re-export them from the registry, and import that module directly from the harness and adapter.

### 2. [warning] Parking the ledger tests also removes coverage of retained behavior
**Location**: `loop/parked/v1/tests/at/harness/live-ledger.selftest.ts:235`, `:288`, `:493`

**Finding**: The parked file contains regression tests unrelated to the removed provenance mechanism, and those tests have no live replacements.

**Evidence**: Three tests cover `captureFailure`, seven cover tier selection, incomplete body maps, and timeout isolation, and the Mailpit tests cover rejecting HTML and invalid identification responses. Their implementations remain active: captures call `captureFailure`; registration calls `tierBodyProblem`, `chooseTierBody`, and `tierTimeout`; adapter construction calls `mailIdentification`. None of these functions is exercised directly by the remaining selftests. The new `live-stack.selftest.ts` covers parsing and redaction but never calls the identification probe.

**Suggestion**: Restore the retained-behavior cases under the live harness, adapting the Mailpit tests to the shared client. Park only tests of mechanisms that were actually removed.

### 3. [warning] Live documentation still promises the removed provenance guarantees
**Location**: `tests/at/suites/req-016/_fixture.ts:15`

**Finding**: Active source documentation describes the parked ledger as current enforcement, overstating what protects integration results.

**Evidence**: This header says every SUT key receives adapter-derived provenance, the registry refuses every stubbed capability, and relabelling requires changing `adapterDerivedCapability`. That function is parked; `openWorld` now checks `h.live`. Similar current-tense claims remain in `req-001/_fixture.ts:7` and `supabase/functions/_shared/accounts.ts:13`. Meanwhile, `suite-adapters.ts:10` and `registry.ts:297` describe parked type probes as executed tests, and `local-stack.ts:496` points readers to the removed live mail module.

**Suggestion**: Update these live references to describe the boolean gate and actual remaining coverage. Keep historical explanations explicitly marked as history under the parked tree.