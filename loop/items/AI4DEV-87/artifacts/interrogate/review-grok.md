The branch parks the ledger and shares one stack client. The two suites still refuse above loop the way the manifests describe. These execution problems remain.

## Findings

### 1. [warning] The shared client changes the drive's requests, and the skill still documents the old ones
**Location**: `tests/at/harness/live-stack.ts` (`authPost`, `mailMessagesFor`, `verifyLinksIn`); `.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts`; `.claude/skills/verify-ai4good/SKILL.md` lines 78–83

**Finding**: Unifying the drive onto `live-stack.ts` changes the wire the drive sends. The skill's "recipe it implements" still describes the old drive.

**Evidence**: Before this branch the drive posted signup and password-grant with `apikey` only, listed mail at `GET /api/v1/messages`, read `GET /api/v1/message/{ID}` as JSON `Text`/`HTML`, and took any `/auth/v1/verify` URL. After the import it uses `authPost`, which always sends `Authorization: Bearer <anon>`, then `GET /api/v1/search?query=to:…` and `GET /api/v1/message/{ID}/raw`, then quoted-printable decode plus a `type=signup` filter. The adapter already used that Auth header and that mail path, so the adapter's requests stay the same. The drive's do not. `SKILL.md` still tells a custom drive to send `apikey` only and to call `/api/v1/messages` then `/api/v1/message/{ID}`. A drive that follows the skill does not send what the helper sends.

**Suggestion**: Make the helper, the skill recipe, and `live-stack.ts` describe one protocol. If the adapter's Mailpit path is the one source, write that path in the skill. If the old drive's requests must stay, do not send the adapter's mail client through the drive.

### 2. [warning] `live: true` means `_live.ts` loaded, and the stand-in fixtures still say the parked ledger is the gate
**Location**: `tests/at/harness/index.ts` `createHarness` (lines 237–244); `tests/at/harness/registry.ts` `aboveLoopStandInRefusal` (lines 789–792); `tests/at/suites/req-016/_fixture.ts` lines 15–28; `tests/at/suites/req-001/_fixture.ts` lines 7–9; `tests/at/harness/conformance.selftest.ts` lines 139–146

**Finding**: Above loop, the only check is the boolean. The boolean is file presence. The loop fixtures still tell the reader the parked ledger makes a stand-in unreachable at integration. That claim is false.

**Evidence**: `createHarness` sets `live: true` as soon as `loadLiveAdapterModule` returns a module. `aboveLoopStandInRefusal` then returns null and `openWorld` never inspects the adapter. A `_live.ts` that returns the loop fixture's `sut` and `world` would run in-memory Maps at integration and could green. `req-016/_fixture.ts` still says every `sut` key is stamped stand-in by `adapterDerivedCapability()` in `harness/capabilities.ts`, and that "the registry refuses ANY stubbed capability above the loop tier, so this adapter cannot reach the integration-tier run". `req-001/_fixture.ts` says the same. Those files are gone from the live tree. The conformance test only calls the pure function with literal `true`/`false`. Nothing in `at:selftest` builds `createHarness({ requirement: 'req-016', tier: 'integration' })` and asserts `h.live === false`, or that `openWorld` throws. Swapping the two `live:` values in `finish()` would not fail the selftest. The integration `--expect` pin would catch it; this review did not run that pin.

**Suggestion**: Point the fixture headers at the boolean and at `_live.ts`. Add a selftest that `createHarness` at integration without `_live.ts` sets `live: false` and that `openWorld` throws the declared `CapabilityPending`.

### 3. [warning] Live prose still names parked files as if they were the live design
**Location**: `tests/at/harness/registry.ts` lines 262 and 297; `tests/at/harness/suite-adapters.ts` line 10; `tests/at/harness/runner-blackbox.selftest.ts` line 281; `tests/at/harness/local-stack.ts` lines 496 and 1013; `tests/at/suites/req-001/_integration.ts` line 1241; `supabase/functions/_shared/accounts.ts` lines 13–15; `loop/parked/v1/README.md` lines 83–88

**Finding**: After the park, the live tree still points at `capabilities.ts`, `live-email.ts`, `tests/at/typeprobes/`, `pendingMethodProxy`, and `type-invention.selftest.ts` as current machinery. The parked README says `live-email.ts` moved byte for byte. That is false.

**Evidence**: Grep of `tests/`, `.claude/`, and `supabase/` finds no live import of the parked modules. The remaining hits are comments that describe the parked design as live: type probes "kept alive" at `tests/at/typeprobes/sut-seam-legacy.probe.ts`; compile-time map checks "asserted in `type-invention.selftest.ts`"; mail refusal " `live-email.ts` says exactly that"; identity brand "the same line `capabilities.ts` draws"; refusal shape "`pendingMethodProxy` throws"; product comment that `adapterDerivedCapability()` in `tests/at/harness/capabilities.ts` stamps every `sut` key a stand-in. Those paths are under `loop/parked/v1/`. `git diff -M` for `live-email.ts` is a rename at 73% similarity: the parked copy dropped the attestation import, the brand check, and `stampAttestation`. That is not a byte-for-byte move.

**Suggestion**: Rewrite or drop those sentences so they name the boolean, `registry.ts`, and `live-stack.ts`. Correct the parked README to say the mail reader was edited as it moved.

### 4. [warning] `local-stack.ts` claims a single CLI seam; `live-stack.ts` builds a second, weaker one
**Location**: `tests/at/harness/local-stack.ts` lines 535–537 (`supabaseInvocation`); `tests/at/harness/live-stack.ts` `stackFromStatus` (lines 107–113) and `parseStatusJson` (lines 75–90)

**Finding**: The lifecycle module states that nothing under `tests/` assembles a Supabase CLI line except `supabaseInvocation`. The shared client the drive now imports does exactly that, without the pinned CLI, the identity wall, or the stopped-service check.

**Evidence**: `supabaseInvocation` sets `SUPABASE_PROJECT_ID`, uses the pinned `node_modules/supabase/dist/supabase.js`, and refuses extra `SUPABASE_*` variables. `stackFromStatus` runs `bun x supabase status -o json` from `repoRoot`, ignores `spawnSync` `error` and `status`, and parses stdout with `parseStatusJson`. That parser does not read container names, does not call `localStackProblems`, and does not reject unexpected stopped services. The drive used `bun x` before, so this is not a new drive behaviour. Putting it in `tests/at/harness` makes the "one seam" sentence in `local-stack.ts` false, and it gives the tree two parsers for the same CLI JSON.

**Suggestion**: Have the drive call the pinned seam and `parseStackStatus`, or delete the "nothing under `tests/`" sentence and say why the drive is allowed a second assembler.

### 5. [warning] The extracted lifecycle module is 1,268 lines with 26 exports
**Location**: `tests/at/harness/local-stack.ts` (whole file)

**Finding**: The move takes the one-stack section out of `runner.ts` and lands it as a new file over the 1,000-line bar. The file mixes the env allowlist, redaction, config scan, lock protocol, CLI seam, identity brand, reset, and evidence line.

**Evidence**: The file exports 26 functions. The header still numbers steps 1, 2, 3, then 5. The lock-race comment at line 321 still says the race lives in `runner.selftest.ts`; the tests are in `local-stack.selftest.ts`. The brand comment at line 1013 still names `capabilities.ts`. `runner.ts` is smaller, which is the point of the move, but the result is one module that is larger than the bar and still describes the previous homes of its tests and its brand.

**Suggestion**: Split at the seams the file already draws (lock, CLI/status, identity/reset, child env/redaction) without changing behaviour, and point the leftover comments at `local-stack.selftest.ts`.