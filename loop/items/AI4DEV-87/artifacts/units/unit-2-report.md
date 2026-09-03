# Unit 2 report

Commit: `9df316691b28a439fe9ee5f7a2d6f9c5c297279c`

## Files

Created:

- `tests/at/harness/live-stack.ts` — one client for the running stack (HTTP, Mailpit, SQL, redaction).
- `tests/at/harness/live-stack.selftest.ts` — pure-function selftest written first.

Moved (git mv, 100 percent):

- `tests/at/harness/live-email.ts` → `loop/parked/v1/tests/at/harness/live-email.ts`

Edited:

- `tests/at/suites/req-001/_live.ts` — `createLiveAdapter({ stack })`; plumbing moved to the shared module.
- `tests/at/harness/index.ts` — live path calls `createLiveAdapter({ stack: stackFromEnv() })`; vendors refusing.
- `tests/at/harness/contracts.ts` — no live-email types; above-loop `TierHarness` has no vendors member.
- `tests/at/harness/runner.selftest.ts` — comment now names the shared stack module.
- `.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts` — imports the shared module; eleven checks kept.
- `.claude/skills/verify-ai4good/SKILL.md` — Drive names the shared module; Doctor inspects the edge-runtime mount.
- `loop/parked/v1/README.md` — live mail reader section.

Drive evidence `loop/items/AI4DEV-87/artifacts/units/unit-2-drive/` is unstaged.

## Line counts after

- `_live.ts`: 837
- `live-stack.ts`: 304

## Checks (last 15 lines)

### bun run typecheck

```
=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

typecheck OK: both configs clean
```

### bun run at:selftest

```
(node:15256) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:45660) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)

 Test Files  10 passed (10)
      Tests  170 passed (170)
   Start at  00:37:54
   Duration  8.58s (transform 1.09s, setup 0ms, import 1.59s, tests 17.01s, environment 1ms)
```

### bun run at:verify req-001 --tier loop --expect

```
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

### bun run at:verify req-016 --tier loop --expect

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

### bun run at:verify req-001 --tier integration --expect

```
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

### drive (11 of 11, exit 0)

```
PASS  (d2) verify link redirects (address confirmed)
        status 303 -> http://127.0.0.1:3000/
PASS  (e) sign-in succeeds after confirmation
        status 200, token issued, user ef4aa8c1-2981-4d2e-b54c-7d58f1adf5e7
PASS  (f) complete-signup (ngo) answers 200
        status 200: {"ok":true,"accountId":"ef4aa8c1-2981-4d2e-b54c-7d58f1adf5e7","accountType":"ngo","organizationId":"0f1a5fa4-54c0-477d-900c-93c6d166affe"}
PASS  (g1) accounts row: account_type=ngo
        {"id":"ef4aa8c1-2981-4d2e-b54c-7d58f1adf5e7","account_type":"ngo"}
PASS  (g2) organizations row exists with the driven name
        {"id":"0f1a5fa4-54c0-477d-900c-93c6d166affe","name":"Verify Drill Org 1788385408613"}
PASS  (g3) org_memberships row: role=admin
        {"role":"admin"}
PASS  (g4) acknowledgments row carries the driven text_version
        {"kind":"platform_tos_and_promise","text_version":"tos-platform-promise-v1"}

evidence: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\loop\items\AI4DEV-87\artifacts\units\unit-2-drive\transcript.json

11/11 checks passed
```

## Deviations

1. `createLiveAdapter` awaits `mailIdentification(stack)` when it is built. The brief named that export and told `index.ts` not to call `createLiveEmail`; it did not name this call. The probe used to run from `index.ts` at harness construction. Without it, a dead catcher would fail later as "no confirmation email" instead of at construction.
