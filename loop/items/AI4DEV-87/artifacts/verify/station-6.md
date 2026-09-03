# Station 6 verify report — AI4DEV-87

Worktree: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87

## Step 1: `git rev-parse --short HEAD` and `git status --short`

Exit code: 0
Timestamp: 2026-09-02T23:23:xx (recorded before step 2)

```
d71c968
 M loop/items/AI4DEV-87/brief.md
?? loop/items/AI4DEV-87/artifacts/
```

Both paths are under `loop/items/`. Tree is otherwise clean.

## Step 2: `bun run typecheck`

Exit code: 0
Timestamp: 2026-09-02T23:23:50.6646635Z

```
=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```

## Step 3a: `bun run at:check req-001`

Exit code: 0
Timestamp: 2026-09-02T23:24:06.6785886Z

```
at:check req-001 — 37 P0 in the acceptance file, 37 registered in the suite
RESULT: 37 P0 ids in bijection
```

## Step 3b: `bun run at:check req-016`

Exit code: 0
Timestamp: 2026-09-02T23:24:13.1075450Z

```
at:check req-016 — 12 P0 in the acceptance file, 12 registered in the suite
RESULT: 12 P0 ids in bijection
```

## Step 4: `bun run at:selftest`

Exit code: 0
Timestamp: 2026-09-02T23:24:19.3940459Z

```
 Test Files  13 passed (13)
      Tests  175 passed (175)
   Start at  02:24:19
   Duration  9.44s (transform 1.36s, setup 0ms, import 2.13s, tests 21.54s, environment 2ms)
```

Files: 13 passed, 0 failed. Tests: 175 passed, 0 failed.

## Step 5: `bun run at:verify req-001 --tier loop --expect`

Exit code: 0
Timestamp: 2026-09-02T23:24:34.5713725Z

Last lines of output:

```
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 21 green, 16 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\tests\at\expected\req-001.json exactly (21 declared green, 16 declared red)
```

Result: matches expected (21 green, 16 red).

## Step 6: `bun run at:verify req-016 --tier loop --expect`

Exit code: 0
Timestamp: 2026-09-02T23:24:41.7973644Z

Last lines of output:

```
  AT-016.10    green    recipients resolve at event creation: the old holder receives, the new holder is excluded
  AT-016.11    green    sent only on provider acceptance; unconfirmed sends retry; a lost ack mints no duplicate
  AT-016.12    green    an escalation-tier event notifies both the NGO and the platform admin
  12 P0: 11 green, 1 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\tests\at\expected\req-016.json exactly (11 declared green, 1 declared red)
```

Result: matches expected (11 green, 1 red).

## Step 7: `bun run at:verify req-001 --tier integration --expect`

Exit code: 0
Timestamp: 2026-09-02T23:24:49.1295491Z

Identity and evidence lines:

```
at:verify — identity proven before the readiness wait: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — identity proven immediately before the reset: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — 5 migrations expected, 5 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 5 expected, 5 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head d71c968, dirty
```

Result summary:

```
  37 P0: 16 green, 21 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\tests\at\expected\req-001.json exactly (16 declared green, 21 declared red)
```

Result: matches expected (16 green, 21 red).

## Step 8: `bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts loop/items/AI4DEV-87/artifacts/verify/drive`

Exit code: 0
Timestamp: 2026-09-02T23:28:24.7941431Z

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
        status 200, token issued, user bc816176-a519-485c-92d1-5c6bb677fcf4
PASS  (f) complete-signup (ngo) answers 200
        status 200: {"ok":true,"accountId":"bc816176-a519-485c-92d1-5c6bb677fcf4","accountType":"ngo","organizationId":"1b4fcff1-7987-4dca-ad9a-4648326b2a00"}
PASS  (g1) accounts row: account_type=ngo
        {"id":"bc816176-a519-485c-92d1-5c6bb677fcf4","account_type":"ngo"}
PASS  (g2) organizations row exists with the driven name
        {"id":"1b4fcff1-7987-4dca-ad9a-4648326b2a00","name":"Verify Drill Org 1788391705860"}
PASS  (g3) org_memberships row: role=admin
        {"role":"admin"}
PASS  (g4) acknowledgments row carries the driven text_version
        {"kind":"platform_tos_and_promise","text_version":"tos-platform-promise-v1"}

evidence: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\loop\items\AI4DEV-87\artifacts\verify\drive\transcript.json

13/13 checks passed
```

## Step 9: `docker inspect supabase_edge_runtime_poancmeitlmxejofwzuu --format "{{json .Mounts}}"`

Exit code: 0
Timestamp: 2026-09-02T23:28:34.0292956Z

Source path ending in `supabase\functions`:

```
C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-87\supabase\functions
```

This matches this worktree.

## Step 10: `git rev-parse --short HEAD` again

Exit code: 0

```
d71c968
```

Matches step 1's head SHA.
