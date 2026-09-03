# Unit 4 report — AI4DEV-87

## Step 1: git status --short

Command: `git status --short`

Output (23 modified, 4 new — matches the expected working-tree state):
```
 M .claude/skills/verify-ai4good/SKILL.md
 M .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts
 M loop/parked/v1/README.md
 M supabase/functions/_shared/accounts.ts
 M tests/at/README.md
 M tests/at/harness/conformance.selftest.ts
 M tests/at/harness/contracts.ts
 M tests/at/harness/index.ts
 M tests/at/harness/live-stack.selftest.ts
 M tests/at/harness/live-stack.ts
 M tests/at/harness/local-stack.selftest.ts
 M tests/at/harness/local-stack.ts
 M tests/at/harness/registry.ts
 M tests/at/harness/runner-blackbox.selftest.ts
 M tests/at/harness/runner-expect.selftest.ts
 M tests/at/harness/runner.selftest.ts
 M tests/at/harness/runner.ts
 M tests/at/harness/suite-adapters.ts
 M tests/at/suites/req-001/_fixture.ts
 M tests/at/suites/req-001/_integration.ts
 M tests/at/suites/req-001/_live.ts
 M tests/at/suites/req-016/_fixture.ts
 M tests/at/typecheck.ts
?? .claude/skills/verify-ai4good/scripts/tsconfig.json
?? loop/items/AI4DEV-87/artifacts/
?? tests/at/harness/pending.ts
?? tests/at/harness/stack-lock.selftest.ts
?? tests/at/harness/stack-lock.ts
```

## Step 2: bun run at:verify req-001 --tier loop --expect

Exit code: 0

Last 20 lines:
```
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
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\tests\at\expected\req-001.json exactly (21 declared green, 16 declared red)
```
Result: EXPECTED match, exit 0.

## Step 3: bun run at:verify req-016 --tier loop --expect

Exit code: 0

Last 20 lines:
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
Result: EXPECTED match, exit 0.

## Step 4: bun run at:verify req-001 --tier integration --expect

Exit code: 0

Last 20 lines:
```
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
  37 P0: 16 green, 21 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\tests\at\expected\req-001.json exactly (16 declared green, 21 declared red)
```
The `at:verify — stack` line:
```
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 5 expected, 5 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head 3141206, dirty
```
Result: EXPECTED match, exit 0.

## Step 5: bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts loop/items/AI4DEV-87/artifacts/units/unit-4-drive

Exit code: 0

All check lines:
```
PASS  (a) auth health answers
        GET /auth/v1/health -> 200
PASS  (a2) mail identification
        Mailpit v1.30.2 at http://127.0.0.1:44324
PASS  (a3) edge runtime mount
        edge runtime functions mount C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\supabase\functions
PASS  (b) signup returns a user and no session
        status 200, access_token present: false
PASS  (c) sign-in refused while unconfirmed
        status 400
PASS  (d1) confirmation email holds a verify link
        http://127.0.0.1:44321/auth/v1/verify?token=REDACTED&type=REDACTED&redirect_to=REDACTED
PASS  (d2) verify link redirects (address confirmed)
        status 303 -> http://127.0.0.1:3000/
PASS  (e) sign-in succeeds after confirmation
        status 200, token issued, user 30616e61-ae1f-4862-9fbe-34387521b86f
PASS  (f) complete-signup (ngo) answers 200
        status 200: {"ok":true,"accountId":"30616e61-ae1f-4862-9fbe-34387521b86f","accountType":"ngo","organizationId":"14c59437-039a-4a3c-9401-b4ef9d896f06"}
PASS  (g1) accounts row: account_type=ngo
        {"id":"30616e61-ae1f-4862-9fbe-34387521b86f","account_type":"ngo"}
PASS  (g2) organizations row exists with the driven name
        {"id":"14c59437-039a-4a3c-9401-b4ef9d896f06","name":"Verify Drill Org 1788389601222"}
PASS  (g3) org_memberships row: role=admin
        {"role":"admin"}
PASS  (g4) acknowledgments row carries the driven text_version
        {"kind":"platform_tos_and_promise","text_version":"tos-platform-promise-v1"}

evidence: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\loop\items\AI4DEV-87\artifacts\units\unit-4-drive\transcript.json

13/13 checks passed
```
Result: 13/13 checks passed, exit 0.

## Step 6: commit

All four gates passed (steps 2, 3, 4 each EXPECTED match with exit 0; step 5 printed 13/13 checks passed with exit 0). Staged every modified and new file except `loop/items/`, wrote the commit message to
`loop/items/AI4DEV-87/artifacts/units/unit-4-commit-message.txt`, and committed.

Commit: `1cc6d32` — "AI4DEV-87: the interrogate fixes: liveness before construction, one CLI seam, one name map, the drive checked and typed"

`git log --oneline -1`:
```
1cc6d32 AI4DEV-87: the interrogate fixes: liveness before construction, one CLI seam, one name map, the drive checked and typed
```
