# Pre-change baseline — AI4DEV-87

Captured on branch `AI4DEV-87`, worktree
`C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87`.

## 1. `git rev-parse --short HEAD` and `git status --short`

Command: `git rev-parse --short HEAD`
Exit code: 0
Output:
```
d73202c
```

Command: `git status --short`
Exit code: 0
Output (before this report file was written):
```
?? loop/items/AI4DEV-87/artifacts/
```

## 2. `bun run typecheck`

Exit code: 0
Output (last 20 lines):
```
=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

typecheck OK: both configs clean
```

## 3. `bun run at:check req-001` then `bun run at:check req-016`

Command: `bun run at:check req-001`
Exit code: 0
Output:
```
at:check req-001 — 37 P0 in the acceptance file, 37 registered in the suite
RESULT: 37 P0 ids in bijection
```

Command: `bun run at:check req-016`
Exit code: 0
Output:
```
at:check req-016 — 12 P0 in the acceptance file, 12 registered in the suite
RESULT: 12 P0 ids in bijection
```

## 4. `bun run at:selftest`

Exit code: 0
Output (summary lines):
```
RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-87/tests/at

Test Files  11 passed (11)
     Tests  253 passed (253)
  Start at  23:50:54
  Duration  11.86s (transform 2.60s, setup 0ms, import 10.73s, tests 22.95s, environment 6ms)
```
Test files: 11, tests: 253, passed: 253, failed: 0.

## 5. `bun run at:verify req-001 --tier loop --expect`

Exit code: 0
Output (last 20 lines):
```
  AT-001.29    red      AtPending: AT-001.29 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.30    red      AtPending: AT-001.30 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.31    red      AtPending: AT-001.31 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 21 green, 16 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\tests\at\expected\req-001.json exactly (21 declared green, 16 declared red)
```
Result: matches the expected file exactly (21 green, 16 red, 0 missing).

## 6. `bun run at:verify req-016 --tier loop --expect`

Exit code: 0
Output (full):
```
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
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\tests\at\expected\req-016.json exactly (11 declared green, 1 declared red)
```
Result: matches the expected file exactly (11 green, 1 red, 0 missing).

## 7. `bun run db:start`

Exit code: 0
Output (redacted — keys and the JWT-shaped ANON_KEY/SERVICE_ROLE_KEY replaced):
```
Stopped services: [supabase_imgproxy_poancmeitlmxejofwzuu supabase_pooler_poancmeitlmxejofwzuu]
{"DB_URL":"postgresql://postgres:postgres@127.0.0.1:44322/postgres","API_URL":"http://127.0.0.1:44321","REST_URL":"http://127.0.0.1:44321/rest/v1","GRAPHQL_URL":"http://127.0.0.1:44321/graphql/v1","FUNCTIONS_URL":"http://127.0.0.1:44321/functions/v1","MCP_URL":"http://127.0.0.1:44321/mcp","STUDIO_URL":"http://127.0.0.1:44323","PUBLISHABLE_KEY":"[REDACTED]","SECRET_KEY":"[REDACTED]","JWT_SECRET":"[REDACTED]","ANON_KEY":"[REDACTED-JWT]","SERVICE_ROLE_KEY":"[REDACTED-JWT]","MAILPIT_URL":"http://127.0.0.1:44324","INBUCKET_URL":"http://127.0.0.1:44324","STORAGE_S3_URL":"http://127.0.0.1:44321/storage/v1/s3","S3_PROTOCOL_ACCESS_KEY_ID":"[REDACTED]","S3_PROTOCOL_ACCESS_KEY_SECRET":"[REDACTED]","S3_PROTOCOL_REGION":"local","message":""}
```
The stack reported services already running/restarted cleanly; no error.

## 8. `bun run at:verify req-001 --tier integration --expect`

Exit code: 1
Output (last 20 lines):
```
  DEVIATION: AT-001.19 — declared green, reported red: AssertionError: the deployed complete-signup refused a completion carrying all three identity fields: expected { ok: false, …(1) } to match object { ok: true }
  DEVIATION: AT-001.39 — declared green, reported red: AssertionError: the refusal does not name the name as what is missing: expected 'the deployed complete-signup answered…' to match /signer name/i
  DEVIATION: AT-001.32 — declared green, reported red: AssertionError: the NGO could not complete signup, so there is no organisation to hold a project: expected { ok: false, …(1) } to match object { ok: true }
  DEVIATION: the report counts 34 failed tests but the declaration declares 21 reds — a failure outside the declared ids (an untagged test, a failing hook) looks exactly like this
  DEVIATION: the report counts 3 passed tests but the declaration declares 16 greens
  EXPECT FAILURE: 15 deviation(s) from the declaration. A red that turned green is a failure too — if reality improved, update the declaration in the same change.
error: script "at:verify" exited with code 1
```

The line naming the project id, the reset, and the migration counts:
```
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 5 expected, 5 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head d73202c, dirty
```

Result: 37 P0: 3 green, 34 red, 0 missing. This does not match the declared expectation (21 green, 16 red)
— 15 deviations reported, exit code 1.

## 9. `Get-ChildItem tests/at/harness/*.selftest.ts | ForEach-Object { $_.Name }`

Exit code: 0
Output (full, 11 files):
```
conformance.selftest.ts
expected.selftest.ts
live-ledger.selftest.ts
req016-oracles.selftest.ts
runner-blackbox.selftest.ts
runner-expect.selftest.ts
runner.selftest.ts
shipped-caller.selftest.ts
shipped-verification.selftest.ts
type-invention.selftest.ts
vendors.selftest.ts
```
