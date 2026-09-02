### Components Found

**Shared harness object (`AtHarness`)** — `tests/at/harness/contracts.ts:340`. Type alias (not an interface) for every seam a suite may reach: `clock`, `fixtures`, `sentinels`, `faults`, `static`, `config`, `vendors`, `oracles`, `sut`, `stubbedCapabilities()`, `teardown()`.

**Capability ledger** — `tests/at/harness/index.ts:154` (`CapabilityLedger`) plus constructors in `tests/at/harness/capabilities.ts`. Provenance is a computed verdict (`real` / `stand-in` / refusal), never a caller-written label. `createHarness()` (`index.ts:463`) is the only factory a suite ever sees.

**Loop fixture adapters** — `tests/at/suites/req-001/_fixture.ts` and `tests/at/suites/req-016/_fixture.ts`. Loaded by `loadAdapter()` in `index.ts:76` from `tests/at/suites/<req>/_fixture.ts`. Each adapter must export `requirement` as a const literal.

**Live adapters** — `tests/at/suites/req-001/_live.ts` (exists). req-016 has no `_live.ts`; above-loop falls back to the loop fixture and is declared red.

**Suite registry (types only)** — `tests/at/harness/suite-adapters.ts`. Compile-time map of which suites exist. Runtime load is a separate path-built import in `index.ts`.

**Semantic judge (H4)** — `tests/at/harness/oracles.ts`. Pinned model `claude-opus-5`, replay at loop, live above loop. **No suite body calls it.**

**Pair-count helpers (not H4)** — `tests/at/suites/req-016/_oracles.ts`. `countPairs` / `expectedPairs` / `pairProblems`. Unrelated to the judge.

---

### Per-module inventory

For each module: what it does, exports, suite imports under `req-001` / `req-016`, selftests, runtime use.

#### 1. `tests/at/harness/oracles.ts` (H4 semantic judge)

**What it does.** Judges meaning of generated text. Loop is bit-deterministic replay of committed recordings. Integration/drill is live, majority over k votes, arithmetic in code. No live fallback on replay miss.

**Pinned judge (lines 59–96).**
- `JUDGE_MODEL = 'claude-opus-5'`
- `JUDGE_MAX_TOKENS = 4000`
- `JUDGE_EFFORT = 'low'` (provisional)
- `PROMPT_VERSION = 'oracle-prompt-1'` (metadata only; invalidation is `replayKey()`)

**Request shape (`JudgeRequest`, lines 141–151).** `promptVersion`, `rubricId`, `rubricVersion`, `model`, `maxTokens`, `effort`, `outputSchema` (`VERDICT_SCHEMA`), `system`, `messages: [{ role: 'user', content }]`. Built by `renderJudgeRequest()` (440). Comparator values are **not** in the prompt (406–410).

**Live SDK call (`createLiveTransport`, 790–826).** Lazy `@anthropic-ai/sdk`. Reads `process.env.AT_JUDGE_API_KEY` **at send time**. `messages.create({ model, max_tokens, system, messages, output_config: { effort, format: { type: 'json_schema', schema } } })`.

**Record / replay.**
- Replay key: SHA-256 of canonical JSON of `{ request, voteIndex }` (`replayKey`, 477).
- Store: `tests/at/harness/recordings/` (`RECORDINGS_DIR`, 484). **Empty** except `README.md`.
- Writer: `writeRecording()` (616) — atomic rename, no overwrite, `recordedFrom` derived from transport brand (`live` only if `transport.kind === 'live'`). Synthetic entries refused in the committed dir.
- Loop transport: `createReplayTransport()` (701). Miss → `OracleReplayMiss`, never live.
- Live transport: `createLiveTransport()` (790). Missing key → `OracleUnavailable` naming the deferred credential boundary (800–807).
- Per-tier factory: `createOracleCapability()` (1126). Loop refuses a `live` transport; above loop refuses `replay-fs`. `'fake'` is legal at every tier for conformance.

**Vote count.** `harness.oracle.judge_votes` → `atconfig.ts:192` `oracleJudgeVotes.value: 3` (provisional, odd integer required).

**Exports.** `JUDGE_MODEL`, `JUDGE_MAX_TOKENS`, `JUDGE_EFFORT`, `PROMPT_VERSION`, `JudgeEffort`, `OracleError`, `OracleReplayMiss`, `OracleUnavailable`, `JudgeRequest`, `JudgeResponse`, `TransportKind`, `JudgeTransport`, `VERDICT_SCHEMA`, `JudgeAnswer`, `judgeVoteCountProblem`, `rubricProblem`, `materialProblem`, `renderSystemPrompt`, `renderMaterial`, `renderJudgeRequest`, `canonicalJson`, `replayKey`, `RECORDINGS_DIR`, `RecordingEntry`, `isCommittedRecordingsDir`, `recordingFilePath`, `recordingProblem`, `RecordingDraft`, `writeRecording`, `readRecordings`, `createReplayTransport`, `LiveMessage`, `liveJudgeResponse`, `createLiveTransport`, `parseJudgeAnswers`, `compareExtraction`, `majorityPass`, `JUDGE_VOTES_KEY`, `readJudgeVotes`, `createSemanticOracle`, `createOracleCapability`.

**Suite imports.** **None** under `req-001` or `req-016`.

**Runtime suite use.** **None.** No `h.oracles` in `tests/at/suites/**`. The only `h.oracles.judge` call is `oracles.selftest.ts:1033–1036` (expects `OracleReplayMiss` because the store is empty).

**Selftests.** `oracles.selftest.ts` (the whole wall; file-level `beforeEach` deletes `AT_JUDGE_API_KEY`). Ledger construction also hits this via `createHarness()` in `oracles.selftest.ts:1026`, `conformance.selftest.ts`, `vendors.selftest.ts`.

**req-016 tests that depend on it.** **None.** req-016 uses `tests/at/suites/req-016/_oracles.ts` (pair counting). The three ATs that `contracts.ts:165–167` names as needing the judge — AT-009.07, AT-004.10, AT-033.07 — have no suites. Every `open()` still **constructs** an oracle (`index.ts:205`, 376, 406), so a throw in `createOracleCapability` would fail both suites; `judge()` is never called.

---

#### 2. `tests/at/harness/record-oracles.ts` (parent-side recorder)

**What it does.** The only live writer. `bun tests/at/harness/record-oracles.ts`. Reads `AT_JUDGE_API_KEY` from **its own** process. Records 6 specimens (AT-009.07 / AT-004.10 / AT-033.07 compliant+violating) × k votes, then repeats 5 times for a stability table written to `loop/items/AI4DEV-20/live-smoke.md`. Header says **NEVER IN CI** (line 27) and **NOT YET RUN** (line 30) — no credential existed when it landed.

**Exports.** None consumed. Script entry: `if (import.meta.main) process.exit(await main())` (261). Exit 2 if the key is missing (216–230).

**Suite imports.** None.

**Selftests.** None of its own. `writeRecording` / live-brand derivation are covered by `oracles.selftest.ts`.

---

#### 3. `tests/at/harness/sentinels.ts` (H3 planted markers)

**What it does.** `plant(kind, value)` mints a sentinel after `sentinelValueProblem` in `guards.ts`. `scan(scope)` refuses unknown scopes; then `body.includes(value)` over the adapter’s `read(scope)`.

**Exports.** `AdapterSentinelSeam`, `createSentinels`.

**Suite imports.** Type-only: `tests/at/suites/req-016/_fixture.ts:34`. req-001 does not import it and does not export a sentinel seam.

**Runtime suite use.** `req-016/a-emitter-and-taxonomy.test.ts:50` — `h.sentinels.plant(...)` in AT-016.01. Presence is asserted via `sut.deliveries()`, **not** `h.sentinels.scan`. Scan is only in `conformance.selftest.ts:586–615`.

**Selftests.** `conformance.selftest.ts` “H3 wall” (558+) and direct `createSentinels` import (19).

---

#### 4. `tests/at/harness/faults.ts` (H3 forced failures)

**What it does.** `at(point, kind)` arms a named product point; `triggerCount` is owned by the adapter; `clear()` refuses if the fault never fired; `processRestart()` must change epoch.

**Exports.** `FaultKind` (`'crash' | 'reject' | 'lose_ack'`), `ArmedFault`, `AdapterFaultSeam`, `createFaults`.

**Suite imports.** Type-only: `req-016/_fixture.ts:32`. req-001 does not import it.

**Runtime suite use.**
- `req-016/b-delivery-defaults.test.ts:46–48` — `processEpoch` / `processRestart` (AT-016.07).
- `req-016/c-reliability-guard.test.ts:64` — `h.faults.at(FAULT_POINT, 'crash')` (AT-016.09). Point name: `notifications.between_transition_and_event_write` (`_fixture.ts:77`). Adapter implements **crash only** (239).

**Selftests.** `conformance.selftest.ts` H3 wall (629–824) plus direct `createFaults`.

---

#### 5. `tests/at/harness/vendors.ts` (H5 email provider stand-in)

**What it does.** One object, two faces: `sim` (test: `rejectNext`, `acceptButLoseAck`, `attempts`, `accepted`) and `port` (SUT: `deliver` → `'accepted' | 'rejected' | 'no_ack'`). Idempotency key is `JSON.stringify([eventId, recipientId, channel])` (61). `'ack_lost'` is visible only on the sim; the port sees `'no_ack'`.

**Exports.** `ProviderSend`, `EmailProviderPort`, `EmailProviderStandIn`, `createEmailProviderSim`.

**Suite imports.** Type-only: `req-016/_fixture.ts:35` (`EmailProviderPort`). req-001 does not import it; its adapter signature is `{ clock, worlds }` only (`_fixture.ts:426`).

**Runtime suite use.**
- `a-emitter-and-taxonomy.test.ts:71` — `h.vendors.email.attempts()`
- `c-reliability-guard.test.ts:163, 221, 282` — `rejectNext`, `acceptButLoseAck`, `accepted`
- `d-taxonomy-evidence.test.ts:101–102` — `attempts()` / `accepted()`

**Selftests.** `vendors.selftest.ts` (dedicated H5 wall, including `createHarness({ requirement: 'req-016' })`).

---

#### 6. `tests/at/harness/fixtures.ts` (H2 fixture worlds)

**What it does.** Seeded in-memory world: NGO, four actors, one project per lifecycle state, ledger, blocker, thread message. `FixtureWorldStore.world(name)` deep-clones the seed.

**Exports.** `LIFECYCLE_STATES`, `LifecycleState`, `FixtureProject`, `FixtureLedgerRow`, `FixtureBlocker`, `FixtureThreadMessage`, `FixtureState`, `createFixtureSeed`, `FixtureWorld`, `FixtureWorldStore`.

**Suite imports (types).**
- `req-001/_fixture.ts:194–195`
- `req-016/_fixture.ts:33`

**Runtime suite use.** Every `open()` builds a world through `h.fixtures.world`. req-016 wraps the seed in `NotificationFixtureWorld`. req-001 wraps it in its accounts world.

**Selftests.** `conformance.selftest.ts` “H2 fixture and clock conformance wall” (842+), including nine lifecycle states and isolation.

---

#### 7. `tests/at/harness/guards.ts` (centralized predicates)

**What it does.** Plain-words problem or `null`. Sentinels, faults, and the email sim **must** route through these; suites must not re-assert them.

**Exports.** `MIN_SENTINEL_VALUE_LENGTH` (16), `sentinelValueProblem`, `faultPointProblem`, `faultAlreadyArmedProblem`, `faultFiredProblem`, `processEpochProblem`, `providerForceCountProblem`.

**Suite imports.** **None.** Comments in req-016 tests point at this file; they do not import it.

**Selftests.** `conformance.selftest.ts` “the centralized generic guards refuse as well as accept” (481) plus the H3 wall that proves routing.

---

#### 8. `tests/at/harness/clock.ts`

**What it does.**
- `ControlledClock` — starts at `2026-01-01T00:00:00.000Z`; `freezeAt`, `advance`, `now`. Loop only.
- `AttestedRealClock` — `now()` is `Date.now()`; no control seam. Built only by `createAttestedRealClock(attestation)` after a branded slot attestation.

**Exports.** `AttestedRealClock`, `createAttestedRealClock`, `ControlledClock`.

**Suite imports (types).**
- `req-001/_fixture.ts:194`
- `req-016/_fixture.ts:31`

**Runtime suite use.**
- req-001 adapter **reads** `clock.now()` for session expiry (`_fixture.ts:484, 580, 851`).
- `req-001/b-verification-and-sessions.test.ts:405, 519, 537` — `h.clock.advance` (AT-001.12 / AT-001.13).
- req-016 adapter **reads** `clock.now()` for the anti-spam window (`_fixture.ts:468`).
- `req-016/b-delivery-defaults.test.ts:137–151` — `freezeAt` / `advance` (AT-016.08).

**Selftests.** `conformance.selftest.ts` H2 wall (883 — product behavior reads the clock through `createHarness`). `live-ledger.selftest.ts` for `AttestedRealClock` / brand refusal.

---

#### 9. `tests/at/harness/capabilities.ts` (provenance)

**What it does.** Closed witness table of six names: `clock.controlled`, `vendors.email`, `config.registry`, `sentinels.planted`, `faults.injection`, `oracles.judge`. Adapter-derived route stamps `fixtures.worlds` and every `sut.<key>` stand-in. Live route grants `real` over a closed method list plus slot attestation. `pendingCapability` / `pendingMethodProxy` throw `CapabilityPending`.

**Exports.** `ATTESTATION`, `SLOT_ATTESTATION_BRAND`, `CapabilityProvenance`, `CapabilityVerdict`, `CapabilityEvidence`, `LiveAttestation`, `Capability`, `stampAttestation`, `attestationOf`, `witnessedCapability`, `adapterDerivedCapability`, `liveSutCapability`, `liveFixturesCapability`, `stubbedCapabilityNames`, `CapabilityPending`, `pendingCapability`, `pendingMethodProxy`.

**Suite imports.** `req-001/_integration.ts:28` — `CapabilityPending` (four integration bodies refuse unbacked methods by throwing it). req-016 does not import this file.

**Selftests.** `conformance.selftest.ts` provenance describes (163–381). `live-ledger.selftest.ts` (live constructors, method-level backing). `vendors.selftest.ts` imports `CapabilityPending`.

---

#### 10. `tests/at/harness/contracts.ts` (shared types)

**What it does.** Single type-alias contract for every shared seam. Vendor contracts for Anthropic/Stripe/GitHub/Lovable/Linear are **not** here yet (`contracts.ts:14–17`). Oracle criterion kinds exist for future AT-009.07 / AT-004.10 / AT-033.07.

**Exports (selected).** `Tier`/`TIERS` (re-export from registry), `ConfigRegistry`, live-email types, `WorldSeam`, `Fixtures`, `Clock`, `RealClock`, `Sentinel`/`Sentinels`, `FaultHandle`/`Faults`, `StaticScan`, `ProviderOutcome`, `ProviderAttempt`, `EmailProviderSim`, `Vendors`, rubric/verdict types, `SemanticOracle`, `AtHarness`, `TierHarness`.

**Suite imports.**
- `req-001/_contract.ts:21, 43–44` — `WorldSeam` plus re-exports of Clock/Faults/Sentinels/StaticScan/Tier/TIERS.
- `req-016/_contract.ts:18–39` — vendor types + the same re-exports.

Test bodies import `_contract.ts`, not `contracts.ts` directly.

**Selftests.** `type-invention.selftest.ts` + `tests/at/typeprobes/harness-invention.probe.ts` (declaration-merging attacks on `AtHarness` and nested aliases). `oracles.selftest.ts` imports rubric types.

---

#### 11. `tests/at/harness/suite-adapters.ts` (compile-time suite list)

**What it does.** `AdapterModules` maps `'req-001'` and `'req-016'` to `typeof import('../suites/.../_fixture.ts')`. `bindSuite` only accepts a `SuiteId` from this map. Types are erased at emit; runtime load is `index.ts`.

**Exports.** `AdapterModules`, `SuiteId`, `SutMapOf`, `SutKeyOf`, `SutOf`, `WorldOf`.

**Suite imports.** **None.** Suites name string literals; `registry.ts:25` is the only importer.

**Selftests.** Compile-time: `type-invention.selftest.ts` / `tests/at/typeprobes/sut-seam*.probe.ts`. Runtime pair: `runner-blackbox.selftest.ts:284` (mislabelled adapter vs `loadAdapter()`).

---

#### 12. `tests/at/harness/index.ts` (ledger + factory)

**What it does.**
- Loop: `ControlledClock` + `createEmailProviderSim` + loop `_fixture.ts` + `createOracleCapability({ tier: 'loop' })` → replay.
- Above loop: attest slot first (`attestation.ts`), `AttestedRealClock`, live mail catcher, `_live.ts` if present. req-016 has no live adapter → loop fixture with stand-in worlds/sut; registry then refuses above loop.
- `h.static` is **always** `pendingCapability<StaticScan>('H3 static provider scan')` (`index.ts:500`). That is why AT-016.01 is declared red.

**Exports.** `CapabilityLedger`, `LiveSlotCoordinates`, `buildCapabilityLedger`, `createHarness`. `loadAdapter` is unexported.

**Suite imports.** **None.** `registry.ts:154` dynamically imports `./index.ts` as `HARNESS_MODULE`.

**Selftests.** `conformance.selftest.ts`, `oracles.selftest.ts`, `vendors.selftest.ts`, `live-ledger.selftest.ts` (`buildCapabilityLedger`), `runner-blackbox.selftest.ts` (`loadAdapter` mismatch).

---

### Flow

1. **CI / local loop entry.** `bun run at:verify <req> --tier loop --expect` → `tests/at/harness/runner.ts`. Child env is `childEnv()` (`runner.ts:169`), an allowlist. `AT_JUDGE_API_KEY` is **not** on it (`runner.ts:130–166`). Proven by `runner.selftest.ts:38–48` with sentinel `AT_JUDGE_API_KEY: 'sentinel-judge-key'`.

2. **Suite bind.** `_bind.ts` calls `bindSuite({ requirement, sut })`. Types come from `suite-adapters.ts`; runtime harness from `registry.ts` → `createHarness()`.

3. **`createHarness` (`index.ts:463`).** `buildCapabilityLedger`. At loop: witness clock/config/vendors/sentinels/faults; adapter-derived fixtures + `sut.*`; oracle via `createOracleCapability` (replay, empty store). `static` is pending.

4. **`open()`.** Fresh harness per id, `fixtures.world`, body gets `{ h, w, sut }`. Teardown after.

5. **req-016 loop bodies that actually drive H3/H5/H2.**
   - AT-016.01 plants sentinels, reads vendor attempts, then hits `h.static.providerClientImporters()` → `CapabilityPending('H3 static provider scan')`. Declared red in `tests/at/expected/req-016.json:18–22`.
   - AT-016.07/09 drive faults; AT-016.08 drives clock+config; AT-016.11 drives vendor force outcomes. Pair oracles in `_oracles.ts`, not `oracles.ts`.

6. **req-001 loop bodies.** Clock for session TTL; fixture talks to shipped `_shared` modules. No sentinels/faults/vendors/oracles.

7. **req-001 integration.** `_live.ts` + attested slot + mail catcher. Four bodies throw `CapabilityPending` for unbacked methods (`_integration.ts:18–23`). Clock has no `advance`.

8. **Judge path (never taken by suites).** Loop `judge()` → `createReplayTransport` → empty dir → `OracleReplayMiss`. Live `judge()` → `createLiveTransport` → no key in child → `OracleUnavailable`. Filling the store is parent-side `record-oracles.ts` only.

9. **CI without a key.** `.github/workflows/ci.yml` runs typecheck, `at:selftest`, `at:check` per suite, `at:verify --tier loop --expect` per `tests/at/expected/req-*.json`. It does **not** run `record-oracles.ts`. It does **not** run integration. `oracles.selftest.ts:251–257` deletes any inherited key. Empty recordings + no `judge()` in suites ⇒ CI does not need `AT_JUDGE_API_KEY`.

---

### Files Read

- `tests/at/harness/oracles.ts` (full)
- `tests/at/harness/record-oracles.ts` (full)
- `tests/at/harness/sentinels.ts` (full)
- `tests/at/harness/faults.ts` (full)
- `tests/at/harness/vendors.ts` (full)
- `tests/at/harness/fixtures.ts` (full)
- `tests/at/harness/guards.ts` (full)
- `tests/at/harness/clock.ts` (full)
- `tests/at/harness/capabilities.ts` (full)
- `tests/at/harness/contracts.ts` (full)
- `tests/at/harness/suite-adapters.ts` (full)
- `tests/at/harness/index.ts` (full)
- `tests/at/harness/oracles.selftest.ts` (header + key strip + provenance + createHarness cases)
- `tests/at/harness/conformance.selftest.ts` (header + H3/H2/guards)
- `tests/at/harness/vendors.selftest.ts` (header)
- `tests/at/harness/live-ledger.selftest.ts` (header)
- `tests/at/harness/type-invention.selftest.ts` (header)
- `tests/at/harness/req016-oracles.selftest.ts` (full — tests `_oracles.ts`, not H4)
- `tests/at/harness/runner.ts` (`childEnv`, allowlist)
- `tests/at/harness/runner.selftest.ts` (SENTINELS including `AT_JUDGE_API_KEY`)
- `tests/at/harness/runner-blackbox.selftest.ts` (`loadAdapter` mismatch)
- `tests/at/harness/recordings/README.md`
- `tests/at/harness/registry.ts` (`HARNESS_MODULE`, `createHarness` load)
- `tests/at/harness/config.ts` / `atconfig.ts` (`oracleJudgeVotes = 3`)
- `tests/at/suites/req-001/_bind.ts`, `_contract.ts`, `_fixture.ts` (partial), `_integration.ts` (header), `_live.ts` (import)
- `tests/at/suites/req-016/_bind.ts`, `_contract.ts`, `_fixture.ts` (partial), `_oracles.ts` (full)
- `tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts`, `b-delivery-defaults.test.ts`, `c-reliability-guard.test.ts` (headers + `h.*` use)
- `tests/at/expected/req-016.json`
- `tests/at/typeprobes/harness-invention.probe.ts` (header)
- `.github/workflows/ci.yml`
- `.env.example` (AT_JUDGE_API_KEY block)
- `package.json` (`at:verify` / `at:check` / `at:selftest`)
- `loop/items/AI4DEV-86/brief.md`
- `tests/at/README.md` (suite-authoring rules)

---

### Boundaries

**In**
- Suite `_bind.ts` → `registry.bindSuite` → dynamic `index.createHarness`.
- Suite `_fixture.ts` / `_live.ts` factories, options from the ledger (clock, worlds, config, vendor port / live vendors, slot coords).
- at-config dotted keys, including `harness.oracle.judge_votes`.
- Parent-only `AT_JUDGE_API_KEY` for `record-oracles.ts` / `createLiveTransport`.
- Slot attestation + mail catcher above loop (`attestation.ts`, `live-email.ts`, `db-pool.ts` — out of this slice except as live-ledger inputs).

**Out**
- `AtHarness` to test bodies via `open()`.
- Capability ledger names for `--expect` (`oracles.judge` is a loop stand-in; `H3 static provider scan` is pending).
- Judge recordings to `tests/at/harness/recordings/*.json` (none committed).
- Typed errors: `OracleReplayMiss`, `OracleUnavailable`, `CapabilityPending`.

**Not connected to req-001/req-016 bodies**
- Semantic `h.oracles.judge`.
- `record-oracles.ts`.
- `h.sentinels.scan` (plant only).
- Anthropic/Stripe/GitHub/Lovable/Linear vendor sims (contracts say they land with the first consuming suite).

---

### Non-Obvious Things

1. **Two different “oracles”.** `harness/oracles.ts` is the Opus judge. `suites/req-016/_oracles.ts` is pair-counting. `req016-oracles.selftest.ts` tests the latter. A freeze/park of H4 does not change AT-016.02–.12 loop greens.

2. **H4 has zero suite consumers and an empty store.** `oracles.selftest.ts:3–10` states this. Loop `judge()` is `OracleReplayMiss`. CI stays green because no suite calls `judge()`.

3. **Oracle is still constructed on every `open()`.** Both suites get `oracles.judge` on the ledger (`index.ts:205`). Construction is cheap (replay index is lazy). It is a stand-in at loop (`stubbedCapabilities` includes `oracles.judge`).

4. **AT-016.01 is declared red for the static scan, not sentinels.** `h.static` is hardcoded pending (`index.ts:500`). Sentinel plant still runs first; the body dies on `providerClientImporters()`.

5. **req-001 never wires H3/H5.** No sentinel/fault seam, no vendor port. Using `h.sentinels.scan` / `h.faults.at` would refuse with “Exposed scopes/points: (none)”.

6. **CI never runs integration and never runs the recorder.** Loop `--expect` only. Integration against 44321 is a local done-contract check, not a CI step.

7. **Key plumbing is parent-only by design (ruling F8).** Allowlist excludes `AT_JUDGE_API_KEY`. `.env.example:25–33` documents it. How a child would get a key at integration is explicitly undecided; today above-loop `judge()` is `OracleUnavailable`.

8. **Live recordings were never made.** `record-oracles.ts:30–32`, `recordings/README.md:7–10`, `loop/items/AI4DEV-20/live-smoke.md`. Store authenticity is git review, not cryptographic (`recordings/README.md:27–31`).

9. **`suite-adapters.ts` and `loadAdapter()` are two facts.** Types from the map; bytes from a path. Tied by `export const requirement = 'req-00N' as const` plus a runtime equality check.

10. **Guards.ts has no suite import and must stay centralized.** A bug there greens every H3/H5 suite at once. That is why `conformance.selftest.ts` exists.

11. **`index.ts` `static` pending vs sentinels that work.** Easy to misread AT-016.01’s red as “H3 not implemented.” Sentinels and faults are implemented for req-016; only the source scan is pending.

---

### Open Questions

- I did not execute `at:verify` or `at:selftest`; consumer claims are from imports and `h.*` greps.
- I did not read every req-001 test body beyond clock use in `b-verification-and-sessions.test.ts`. Other req-001 files may use `h.config`; they do not use sentinels/faults/vendors/oracles.
- Exact AT ids in `b-verification-and-sessions.test.ts` that call `h.clock.advance` were not fully read past those three call sites.
- Whether parking `oracles.ts` without also changing `index.ts:205` would break `createHarness` (it would) is a design question, not a missing trace.
- I did not confirm whether `type-invention.selftest.ts` asserts the `suite-adapters.ts` map-entry constraint by name, or only via the sut-seam probes.