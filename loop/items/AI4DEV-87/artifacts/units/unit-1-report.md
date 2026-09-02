# Unit 1 report

Commit: `32f0a74f3168bb88df5b36bcf77632e4d5277c4a`

## Files moved (git mv, 100%)

- `tests/at/harness/capabilities.ts` → `loop/parked/v1/tests/at/harness/capabilities.ts`
- `tests/at/harness/attestation.ts` → `loop/parked/v1/tests/at/harness/attestation.ts`
- `tests/at/harness/live-ledger.selftest.ts` → `loop/parked/v1/tests/at/harness/live-ledger.selftest.ts`
- `tests/at/harness/type-invention.selftest.ts` → `loop/parked/v1/tests/at/harness/type-invention.selftest.ts`
- `tests/at/typeprobes/` → `loop/parked/v1/tests/at/typeprobes/` (three probes, three tsconfigs)

## Files edited

- `tests/at/harness/registry.ts` — `CapabilityPending` beside `AtPending`; `aboveLoopStandInRefusal(tier, live, sutKey)` replaces `aboveLoopStubbedRefusal`; `openWorld` reads `h.live`.
- `tests/at/harness/index.ts` — ledger, witness, brand, attestation gone; `createHarness` sets `live`; `refusing()` is the pending proxy.
- `tests/at/harness/contracts.ts` — `stubbedCapabilities()` replaced by `live: boolean`.
- `tests/at/harness/clock.ts` — `AttestedRealClock` / `createAttestedRealClock` gone; `export class RealClock` with `now()` only.
- `tests/at/harness/live-email.ts` — no attestation, no brand, no stamp; Mailpit probe kept.
- `tests/at/harness/runner.ts` — nonce mint/write and `AT_SLOT_ATTESTATION` gone from `PreparedStack` / `childCoordinates`.
- `tests/at/harness/runner.selftest.ts` — `ATTESTATION_ENV` assertions gone; five `AT_SUPABASE_*` names remain.
- `tests/at/harness/conformance.selftest.ts` — added the stand-in refusal test; deleted the three provenance blocks.
- `tests/at/harness/vendors.selftest.ts` — `CapabilityPending` from registry; `stubbedCapabilities()` assertion gone.
- `tests/at/harness/runner-expect.selftest.ts` — generated suite imports `CapabilityPending` from the registry URL.
- `tests/at/harness/expected.ts` — prose now names `registry.ts`.
- `tests/at/harness/expected.selftest.ts` — prose now names `registry.ts`.
- `tests/at/suites/req-001/_integration.ts` — `CapabilityPending` from registry.
- `tests/at/suites/req-001/_live.ts` — `backedSutMethods` gone; six explicit one-line refusals. `AccountsSut` named no further missing methods.
- `tests/at/tsconfig.json` — `typeprobes` dropped from `exclude`.
- `tests/at/README.md` — typeprobe sentences dropped.
- `loop/parked/v1/README.md` — provenance-ledger section appended.

## Selftest count

- Before (baseline, 11 files): 253 passed.
- After the failing test (11 files): 254 tests, 1 failed (`aboveLoopStandInRefusal is not a function`).
- After (9 files): 156 passed.

## Pin command tails (step 3 and 4)

Step 3 and 4 are five commands. Tails below. No JWT-shaped string appeared.

### `bun run typecheck`

```
=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

typecheck OK: both configs clean
```

### `bun run at:selftest`

```
(node:39008) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:39212) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)

 Test Files  9 passed (9)
      Tests  156 passed (156)
   Start at  00:17:53
   Duration  8.51s (transform 930ms, setup 0ms, import 1.38s, tests 16.88s, environment 1ms)
```

### `bun run at:verify req-001 --tier loop --expect`

```
  AT-001.25    red      AtPending: AT-001.25 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.26    red      AtPending: AT-001.26 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.27    red      AtPending: AT-001.27 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.28    red      AtPending: AT-001.28 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.35    red      AtPending: AT-001.35 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.29    red      AtPending: AT-001.29 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.30    red      AtPending: AT-001.30 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.31    red      AtPending: AT-001.31 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 21 green, 16 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\tests\at\expected\req-001.json exactly (21 declared green, 16 declared red)
```

### `bun run at:verify req-016 --tier loop --expect`

```
  AT-016.01    red      CapabilityPending: CAPABILITY PENDING — H3 static provider scan
  AT-016.02    green    registered events equal the taxonomy exactly, are immutable, and carry no CR/scope-change event
  AT-016.03    green    every taxonomy row delivers to exactly its recipients on exactly its channels, with the named payloads
  AT-016.04    green    sensitive negatives: no candidacy to the NGO, no vetting outcome to the volunteer, no donation event
  AT-016.05    green    every critical class goes out by email; the low-tone event is in-app only
  AT-016.06    green    a documented delivery default exists for every taxonomy row
  AT-016.07    green    one logical event per committed event, one delivery per recipient-channel pair, across a restart
  AT-016.08    green    a comment burst delivers the count the pinned anti-spam configuration prescribes, on two different configurations
  AT-016.09    green    every guarded transition writes its notification event atomically under an induced fault
  AT-016.10    green    recipients resolve at event creation: the old holder receives, the new holder is excluded
  AT-016.11    green    sent only on provider acceptance; unconfirmed sends retry; a lost ack mints no duplicate
  AT-016.12    green    an escalation-tier event notifies both the NGO and the platform admin
  12 P0: 11 green, 1 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\tests\at\expected\req-016.json exactly (11 declared green, 1 declared red)
```

### `bun run at:verify req-001 --tier integration --expect`

Evidence line:

```
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 5 expected, 5 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head d73202c, dirty
```

Last 15 lines:

```
  AT-001.25    red      AtPending: AT-001.25 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.26    red      AtPending: AT-001.26 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.27    red      AtPending: AT-001.27 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.28    red      AtPending: AT-001.28 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.35    red      AtPending: AT-001.35 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.29    red      AtPending: AT-001.29 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.30    red      AtPending: AT-001.30 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.31    red      AtPending: AT-001.31 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 16 green, 21 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\tests\at\expected\req-001.json exactly (16 declared green, 21 declared red)
```

## Deviations

1. `AtPending` and `CapabilityPending` sit above `registry.ts`'s top-level dynamic import of `index.ts`. The brief put the new class beside `AtPending`; the move keeps them together and lets `index.ts` import `CapabilityPending` without a temporal dead zone.
2. Runner header step 5 also dropped the nonce. The brief named steps 2 and 4; step 5 still named the nonce and would have been false.
3. The `childCoordinates` selftest title and key counts now say four names without a catcher and five `AT_SUPABASE_*` names with one. Removing `AT_SLOT_ATTESTATION` made the old "five / six" counts wrong.

`AccountsSut` named no unbacked method beyond the six listed in the brief.
