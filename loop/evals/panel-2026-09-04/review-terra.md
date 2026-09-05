## Findings

### 1. [warning] The edge-runtime mount “check” cannot stop a stale checkout from producing a green drive
**Location**: `.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts:70-97`; `.claude/skills/verify-ai4good/SKILL.md:50-58`

**Finding**: The Doctor addition only prints Docker mount JSON in documentation. Neither the drive nor the integration lifecycle inspects the edge-runtime container or compares its `supabase/functions` mount with this checkout.

**Evidence**: The drive proceeds from `stackFromStatus()` directly to the Auth health request and then invokes edge functions. `local-stack.ts` also deliberately avoids Docker inspection. Therefore a container mounted from an old worktree can answer all requests and be reported green against code that is not in this checkout. The skill text claims such a condition makes completions refuse, but no executed path implements that refusal.

**Suggestion**: Resolve this checkout’s `supabase/functions`, inspect the edge-runtime mount, and fail before driving when no matching source mount exists.

### 2. [warning] No-live suites build the loop stand-in before the above-loop refusal
**Location**: `tests/at/harness/registry.ts:682-696`; `tests/at/harness/index.ts:236-255`

**Finding**: The liveness gate runs after constructing a fixture adapter, contrary to the design requirement that file presence be decided before anything is built.

**Evidence**: For `req-016`, which has no `_live.ts`, `openWorld()` calls `createHarness()`. `createHarness()` then creates an email simulator and `ControlledClock`, imports `_fixture.ts`, calls `createFixtureAdapter()`, and returns `live: false`. Only then does `openWorld()` throw `aboveLoopStandInRefusal()`. Thus every req-016 integration red constructs the very stand-in it is meant to reject. If that factory fails or gains setup side effects, the declared `CapabilityPending` red is replaced by an unrelated failure.

**Suggestion**: Check for the live adapter before calling `createHarness()`, or make `createHarness()` throw immediately for a non-loop tier without `_live.ts`.

### 3. [warning] The exported factory still advertises loop-only capabilities for integration harnesses
**Location**: `tests/at/harness/index.ts:185-244`; `tests/at/harness/contracts.ts:188-232`

**Finding**: `createHarness()` always returns `Promise<AtHarness>`, even for `tier: 'integration'`. `AtHarness` promises a controllable `Clock` and `vendors`, while the live branch returns a `RealClock` cast through `unknown` and a refusing proxy.

**Evidence**: A direct caller can compile `const h = await createHarness({ tier: 'integration', ... }); await h.clock.advance(1)` or access `h.vendors.email`, because the return type permits both. At runtime the first is missing and the second throws `CapabilityPending`. `TierHarness<'integration'>` removes those members, but only the registry context uses that narrower type; the public factory does not.

**Suggestion**: Make the factory generic/overloaded on `tier` and return `TierHarness<T>`, or keep the raw factory private behind the registry.

### 4. [warning] Active documentation still describes the parked ledger and an obsolete mail protocol
**Location**: `tests/at/suites/req-016/_fixture.ts:15-28`; `tests/at/suites/req-001/_fixture.ts:7-9`; `tests/at/harness/registry.ts:262-264`; `.claude/skills/verify-ai4good/SKILL.md:80-83`

**Finding**: The live tree continues to state that `capabilities.ts`, `adapterDerivedCapability()`, `pendingMethodProxy`, and executable `typeprobes` enforce current behavior, although all were parked. The verification skill also tells custom drivers to use `/api/v1/messages` and `/api/v1/message/{ID}`, while the shared client used by the drive now sends `/api/v1/search` and `/api/v1/message/{ID}/raw`.

**Evidence**: The referenced ledger files and `tests/at/typeprobes/` no longer exist outside `loop/parked/v1/`. The current gate is only `live` plus `aboveLoopStandInRefusal()`. Separately, the drive calls `verifyLinksFor()` at `drive-ngo-signup.ts:117`, which uses the search/raw requests in `live-stack.ts:211-221`; the documented recipe exercises a different protocol and skips the shared quoted-printable parsing path.

**Suggestion**: Update or remove every live reference to the parked machinery, and make the skill recipe describe the shared helper’s actual requests.

### 5. [warning] The lifecycle extraction replaces one oversized file with another
**Location**: `tests/at/harness/local-stack.ts`

**Finding**: The new module is 1,268 lines and combines environment isolation, redaction, config parsing, lock arbitration, CLI invocation, identity proof, readiness, migration verification, reset orchestration, and evidence formatting.

**Evidence**: This is a new file over the 1,000-line threshold, not a focused lifecycle façade. The extraction removes complexity from `runner.ts` but preserves it as a second monolith, making future safety changes require navigating unrelated destructive-path concerns.

**Suggestion**: Split at existing boundaries—at minimum lock management, Supabase CLI/identity proof, and lifecycle orchestration—while keeping `prepareLocalStack()` as the runner-facing entry point.