## Commit

`ea73436362b6bcbd6ac5a3dea42fb8f9a93e6cd1`

Renames are 100 percent. Not pushed.

## 1. `bun run typecheck`

TIMESTAMP 2026-09-02T19:21:42.4912717+03:00

```
$ bun tests/at/typecheck.ts

=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

typecheck OK: both configs clean
```

## 2. `bun run at:selftest`

TIMESTAMP 2026-09-02T19:21:57.5064567+03:00

```
$ bunx vitest run --root tests/at --config vitest.config.ts harness/

 Test Files  11 passed (11)
      Tests  244 passed (244)
   Start at  19:21:58
   Duration  10.84s (transform 1.23s, setup 0ms, import 7.58s, tests 20.86s, environment 1ms)
```

11 files (12 minus `oracles.selftest`). Type-invention is among them and is green, so the probe still fails to compile.

## 3. `bun run at:verify req-001 --tier loop --expect`

TIMESTAMP 2026-09-02T19:22:38.3290240+03:00

```
$ bun tests/at/harness/runner.ts "req-001" --tier loop --expect

JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-1KuIUV/vitest-report.json

at:verify req-001 --tier loop
  AT-001.01    green    NGO email/password signup creates the account, org, admin membership and acknowledgment; sign-in returns
  AT-001.02    green    GitHub OAuth volunteer signup links the identity and returns to the same account
  AT-001.03    green    a session established by Google completes signup through the same path, with the same result as email
  AT-001.04    green    volunteer signup cannot complete without a linked GitHub account
  AT-001.05    green    linking GitHub fires volunteer onboarding with the public stats observably imported
  AT-001.06    green    a volunteer is refused the NGO-only action while an NGO account performs it successfully
  AT-001.07    green    a provisioned platform admin authenticates and carries the type; public signup offers only the two
  AT-001.09    green    a fresh email/password signup of either account type is unverified until the link is used
  AT-001.10    green    an unverified NGO account is blocked from Discovery messages with verification named as the remedy
  AT-001.38    green    sign-in with the correct email and a wrong password is rejected and creates no session
  AT-001.12    green    an expired or revoked session ends access — the next request re-authenticates
  AT-001.13    green    a session in continuous use refreshes without a forced mid-work re-login
  AT-001.14    green    after the emailed reset flow the new password works and the old one does not
  AT-001.16    green    membership and role are held per-NGO — acting in one never grants access to the other
  AT-001.36    green    an admin in one NGO and a member in another succeeds only where it is the admin
  AT-001.37    green    granting a per-NGO role to a volunteer account is rejected on every path
  AT-001.17    green    no capability exists to invite or add a second member to an org
  AT-001.18    red      AtPending: AT-001.18 PENDING [sut-missing] — REQ-001 D3.L3 (the cross-surface single-seat integration) has not landed
  AT-001.19    green    every acknowledgment records the acting person name, title and authority attestation
  AT-001.39    green    an acknowledgment missing any of name, title or attestation is rejected and records nothing
  AT-001.20    green    acknowledgment copy prohibits shared credentials and recommends an org email
  AT-001.21    red      AtPending: AT-001.21 PENDING [sut-missing] — REQ-001 D5.L1 (cross-NGO denial and unassigned-volunteer denial) has not landed
  AT-001.22    red      AtPending: AT-001.22 PENDING [sut-missing] — REQ-001 D5.L1 (cross-NGO denial and unassigned-volunteer denial) has not landed
  AT-001.23    red      AtPending: AT-001.23 PENDING [sut-missing] — REQ-001 D5.L2 (assigned-volunteer scope, platform-admin reach, logged-out visibility) has not landed
  AT-001.40    red      AtPending: AT-001.40 PENDING [sut-missing] — REQ-001 D5.L2 (assigned-volunteer scope, platform-admin reach, logged-out visibility) has not landed
  AT-001.24    red      AtPending: AT-001.24 PENDING [sut-missing] — REQ-001 D5.L2 (assigned-volunteer scope, platform-admin reach, logged-out visibility) has not landed
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
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86\tests\at\expected\req-001.json exactly (21 declared green, 16 declared red)
```

## 4. `bun run at:verify req-016 --tier loop --expect`

TIMESTAMP 2026-09-02T19:22:39.7861344+03:00

```
$ bun tests/at/harness/runner.ts "req-016" --tier loop --expect

JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-8YAeRH/vitest-report.json

at:verify req-016 --tier loop
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
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86\tests\at\expected\req-016.json exactly (11 declared green, 1 declared red)
```

## `git status --short` before the commit

TIMESTAMP 2026-09-02T19:22:52.7786945+03:00

```
 M .env.example
 M loop/parked/v1/README.md
R  tests/at/harness/oracles.selftest.ts -> loop/parked/v1/tests/at/harness/oracles.selftest.ts
R  tests/at/harness/oracles.ts -> loop/parked/v1/tests/at/harness/oracles.ts
R  tests/at/harness/record-oracles.ts -> loop/parked/v1/tests/at/harness/record-oracles.ts
R  tests/at/harness/recordings/README.md -> loop/parked/v1/tests/at/harness/recordings/README.md
R  tests/at/harness/rubrics/at-004-10.ts -> loop/parked/v1/tests/at/harness/rubrics/at-004-10.ts
R  tests/at/harness/rubrics/at-009-07.ts -> loop/parked/v1/tests/at/harness/rubrics/at-009-07.ts
R  tests/at/harness/rubrics/at-033-07.ts -> loop/parked/v1/tests/at/harness/rubrics/at-033-07.ts
 M tests/at/harness/atconfig.ts
 M tests/at/harness/capabilities.ts
 M tests/at/harness/config.ts
 M tests/at/harness/conformance.selftest.ts
 M tests/at/harness/contracts.ts
 M tests/at/harness/index.ts
 M tests/at/harness/live-ledger.selftest.ts
 M tests/at/harness/registry.ts
 M tests/at/harness/runner.selftest.ts
 M tests/at/harness/type-invention.selftest.ts
 M tests/at/typeprobes/harness-invention.probe.ts
?? loop/items/AI4DEV-86/artifacts/
```

Moves show as renames. Modified files are only the ones the brief names. The untracked artifacts folder was already untracked before this unit.

## Deviations

1. **The brief was wrong.** It said remove “the six H4 names” from the protected-names list. That list had thirteen H4 names (`SemanticCriterion` through `SemanticOracle`). The probe lost every H4 interface, so I removed all thirteen. Leaving any of them would have made type-invention fail.

2. **The brief was wrong.** After the witness left, the closed table has five names, not six. I changed the “six exact names” comment in `capabilities.ts` to five. The brief did not name that comment.

3. **I overreached.** The brief said rewrite the two header sentences in `contracts.ts` that name H4 oracles. I also rewrote the `stubbedCapabilities` paragraph (three sources / five names / `oracles.judge` → two sources / four names) and dropped `oracles` from the “NOTHING ELSE FORKS” sentence, so those comments would not keep naming a deleted member.

4. **The brief was wrong, and I followed the range.** “Delete `LEGAL_TRANSPORTS` and its comment block (~173-195)” also covers `LEGAL_TIERS`. That constant had no remaining caller, so both constants went with the comment.

5. **No missed requirement.** The index.ts comment at ~203-204 went with the construction it described. That is the adjustment.