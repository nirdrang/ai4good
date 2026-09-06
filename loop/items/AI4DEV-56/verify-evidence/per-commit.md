# Per-commit checks (step 2)

Skipped commits (touch only loop/items/AI4DEV-56/): ce2c3c2, 3bc5ddd, 82bd3cf, 0b0254d, fc33b2a, f94dfdc, 1a76415, 0cab771, 89be06d, dc86adc, 1797868


### Commit 229dc8d

| command | start | end | exit |
|---|---|---|---|
| bun install --frozen-lockfile | 2026-09-06T14:04:46.9790754+03:00 | 2026-09-06T14:05:53.7619592+03:00 | 0 |
| bun run typecheck | 2026-09-06T14:05:53.7862525+03:00 | 2026-09-06T14:06:03.1112128+03:00 | 0 |
| bun run at:check req-001 | 2026-09-06T14:06:03.1112128+03:00 | 2026-09-06T14:06:03.2342623+03:00 | 0 |
| bun run at:selftest | 2026-09-06T14:06:03.2342623+03:00 | 2026-09-06T14:06:12.5054546+03:00 | 0 |
| bun run at:verify req-001 --tier loop --expect | 2026-09-06T14:06:12.5054546+03:00 | 2026-09-06T14:06:13.8519741+03:00 | 0 |

**bun install --frozen-lockfile** last 10 lines:

```
+ recharts@2.15.4
+ sonner@2.0.7
+ tailwind-merge@3.5.0
+ tailwindcss@4.2.4
+ tw-animate-css@1.4.0
+ vaul@1.1.2
+ vite-tsconfig-paths@6.1.1
+ zod@3.25.76

529 packages installed [66.66s]
```

**bun run typecheck** last 10 lines:

```
$ bun tests/at/typecheck.ts

=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```

**bun run at:check req-001** last 10 lines:

```
$ bun tests/at/harness/check.ts "req-001"
at:check req-001 — 37 P0 in the acceptance file, 37 registered in the suite
RESULT: 37 P0 ids in bijection
```

**bun run at:selftest** last 10 lines:

```
$ bunx vitest run --root tests/at --config vitest.config.ts harness/

 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56-evidence/tests/at


 Test Files  15 passed (15)
      Tests  222 passed (222)
   Start at  14:06:03
   Duration  8.78s (transform 1.84s, setup 0ms, import 2.59s, tests 19.97s, environment 2ms)

```

**bun run at:verify req-001 --tier loop --expect** last 10 lines:

```
  AT-001.28    red      AtPending: AT-001.28 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.35    red      AtPending: AT-001.35 PENDING [sut-missing] — REQ-001 D6.L1 (contact transfer, lost-access recovery and the escalation contact) has not landed
  AT-001.29    red      AtPending: AT-001.29 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.30    red      AtPending: AT-001.30 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.31    red      AtPending: AT-001.31 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 25 green, 12 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-evidence\tests\at\expected\req-001.json exactly (25 declared green, 12 declared red)
```

### Commit 1fe977f

| command | start | end | exit |
|---|---|---|---|
| bun install --frozen-lockfile | 2026-09-06T14:06:21.1593515+03:00 | 2026-09-06T14:06:21.3718100+03:00 | 0 |
| bun run typecheck | 2026-09-06T14:06:21.3718100+03:00 | 2026-09-06T14:06:29.1330484+03:00 | 0 |
| bun run at:check req-001 | 2026-09-06T14:06:29.1330484+03:00 | 2026-09-06T14:06:29.2599722+03:00 | 0 |
| bun run at:selftest | 2026-09-06T14:06:29.2599722+03:00 | 2026-09-06T14:06:38.4221074+03:00 | 0 |
| bun run at:verify req-001 --tier loop --expect | 2026-09-06T14:06:38.4221074+03:00 | 2026-09-06T14:06:39.7965946+03:00 | 0 |

**bun install --frozen-lockfile** last 10 lines:

```
[0.09ms] ".env"
bun install v1.3.14 (0d9b296a)

Checked 547 installs across 651 packages (no changes) [135.00ms]
```

**bun run typecheck** last 10 lines:

```
$ bun tests/at/typecheck.ts

=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```

**bun run at:check req-001** last 10 lines:

```
$ bun tests/at/harness/check.ts "req-001"
at:check req-001 — 37 P0 in the acceptance file, 37 registered in the suite
RESULT: 37 P0 ids in bijection
```

**bun run at:selftest** last 10 lines:

```
$ bunx vitest run --root tests/at --config vitest.config.ts harness/

 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56-evidence/tests/at


 Test Files  17 passed (17)
      Tests  259 passed (259)
   Start at  14:06:29
   Duration  8.65s (transform 2.62s, setup 0ms, import 3.78s, tests 19.81s, environment 2ms)

```

**bun run at:verify req-001 --tier loop --expect** last 10 lines:

```
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    red      AtPending: AT-001.29 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.30    red      AtPending: AT-001.30 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.31    red      AtPending: AT-001.31 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 30 green, 7 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-evidence\tests\at\expected\req-001.json exactly (30 declared green, 7 declared red)
```

### Commit 4ec5168

| command | start | end | exit |
|---|---|---|---|
| bun install --frozen-lockfile | 2026-09-06T14:06:48.4382969+03:00 | 2026-09-06T14:06:48.6121156+03:00 | 0 |
| bun run typecheck | 2026-09-06T14:06:48.6121156+03:00 | 2026-09-06T14:06:56.6157782+03:00 | 0 |
| bun run at:check req-001 | 2026-09-06T14:06:56.6271156+03:00 | 2026-09-06T14:06:56.7377521+03:00 | 0 |
| bun run at:selftest | 2026-09-06T14:06:56.7377521+03:00 | 2026-09-06T14:07:06.2896531+03:00 | 0 |
| bun run at:verify req-001 --tier loop --expect | 2026-09-06T14:07:06.2896531+03:00 | 2026-09-06T14:07:07.9379631+03:00 | 0 |

**bun install --frozen-lockfile** last 10 lines:

```
[0.07ms] ".env"
bun install v1.3.14 (0d9b296a)

Checked 547 installs across 651 packages (no changes) [102.00ms]
```

**bun run typecheck** last 10 lines:

```
$ bun tests/at/typecheck.ts

=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```

**bun run at:check req-001** last 10 lines:

```
$ bun tests/at/harness/check.ts "req-001"
at:check req-001 — 37 P0 in the acceptance file, 37 registered in the suite
RESULT: 37 P0 ids in bijection
```

**bun run at:selftest** last 10 lines:

```
$ bunx vitest run --root tests/at --config vitest.config.ts harness/

 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56-evidence/tests/at


 Test Files  19 passed (19)
      Tests  283 passed (283)
   Start at  14:06:57
   Duration  8.99s (transform 2.42s, setup 0ms, import 3.77s, tests 21.10s, environment 3ms)

```

**bun run at:verify req-001 --tier loop --expect** last 10 lines:

```
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    green    every enumerated write is rejected for a deactivated account while an active control succeeds
  AT-001.30    green    an AUP-deactivated volunteer is refused writes immediately and the project keys are revoked
  AT-001.31    green    re-enabling an account restores otherwise-authorized writes while independent gates stay enforced
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 33 green, 4 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-evidence\tests\at\expected\req-001.json exactly (33 declared green, 4 declared red)
```

### Commit 9d79519

| command | start | end | exit |
|---|---|---|---|
| bun install --frozen-lockfile | 2026-09-06T14:07:14.9277313+03:00 | 2026-09-06T14:07:15.1110331+03:00 | 0 |
| bun run typecheck | 2026-09-06T14:07:15.1173945+03:00 | 2026-09-06T14:07:23.1481731+03:00 | 0 |
| bun run at:check req-001 | 2026-09-06T14:07:23.1481731+03:00 | 2026-09-06T14:07:23.2664635+03:00 | 0 |
| bun run at:selftest | 2026-09-06T14:07:23.2682297+03:00 | 2026-09-06T14:07:32.6038804+03:00 | 0 |
| bun run at:verify req-001 --tier loop --expect | 2026-09-06T14:07:32.6038804+03:00 | 2026-09-06T14:07:34.1118727+03:00 | 0 |

**bun install --frozen-lockfile** last 10 lines:

```
[0.10ms] ".env"
bun install v1.3.14 (0d9b296a)

Checked 547 installs across 651 packages (no changes) [112.00ms]
```

**bun run typecheck** last 10 lines:

```
$ bun tests/at/typecheck.ts

=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```

**bun run at:check req-001** last 10 lines:

```
$ bun tests/at/harness/check.ts "req-001"
at:check req-001 — 37 P0 in the acceptance file, 37 registered in the suite
RESULT: 37 P0 ids in bijection
```

**bun run at:selftest** last 10 lines:

```
$ bunx vitest run --root tests/at --config vitest.config.ts harness/

 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56-evidence/tests/at


 Test Files  19 passed (19)
      Tests  283 passed (283)
   Start at  14:07:23
   Duration  8.78s (transform 2.48s, setup 0ms, import 3.57s, tests 20.15s, environment 2ms)

```

**bun run at:verify req-001 --tier loop --expect** last 10 lines:

```
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    green    every enumerated write is rejected for a deactivated account while an active control succeeds
  AT-001.30    green    an AUP-deactivated volunteer is refused writes immediately and the project keys are revoked
  AT-001.31    green    re-enabling an account restores otherwise-authorized writes while independent gates stay enforced
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    green    role changes and contact transfer leave an append-only audit record that cannot be altered
  AT-001.34    red      CapabilityPending: CAPABILITY PENDING — vendors.gotrue-sign-in-rate-limit
  37 P0: 34 green, 3 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-evidence\tests\at\expected\req-001.json exactly (34 declared green, 3 declared red)
```

### Commit d62a2d1

| command | start | end | exit |
|---|---|---|---|
| bun install --frozen-lockfile | 2026-09-06T14:07:42.0512933+03:00 | 2026-09-06T14:07:42.2200921+03:00 | 0 |
| bun run typecheck | 2026-09-06T14:07:42.2241732+03:00 | 2026-09-06T14:07:50.1844938+03:00 | 0 |
| bun run at:check req-001 | 2026-09-06T14:07:50.1844938+03:00 | 2026-09-06T14:07:50.3028052+03:00 | 0 |
| bun run at:selftest | 2026-09-06T14:07:50.3028052+03:00 | 2026-09-06T14:07:59.6562127+03:00 | 0 |
| bun run at:verify req-001 --tier loop --expect | 2026-09-06T14:07:59.6562127+03:00 | 2026-09-06T14:08:01.1353905+03:00 | 0 |

**bun install --frozen-lockfile** last 10 lines:

```
[0.07ms] ".env"
bun install v1.3.14 (0d9b296a)

Checked 547 installs across 651 packages (no changes) [103.00ms]
```

**bun run typecheck** last 10 lines:

```
$ bun tests/at/typecheck.ts

=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```

**bun run at:check req-001** last 10 lines:

```
$ bun tests/at/harness/check.ts "req-001"
at:check req-001 — 38 P0 in the acceptance file, 38 registered in the suite
RESULT: 38 P0 ids in bijection
```

**bun run at:selftest** last 10 lines:

```
$ bunx vitest run --root tests/at --config vitest.config.ts harness/

 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56-evidence/tests/at


 Test Files  19 passed (19)
      Tests  287 passed (287)
   Start at  14:07:50
   Duration  8.83s (transform 2.02s, setup 0ms, import 3.38s, tests 20.10s, environment 2ms)

```

**bun run at:verify req-001 --tier loop --expect** last 10 lines:

```
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    green    every enumerated write is rejected for a deactivated account while an active control succeeds
  AT-001.30    green    an AUP-deactivated volunteer is refused writes immediately and the project keys are revoked
  AT-001.31    green    re-enabling an account restores otherwise-authorized writes while independent gates stay enforced
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    green    role changes and contact transfer leave an append-only audit record that cannot be altered
  AT-001.34    red      CapabilityPending: CAPABILITY PENDING — vendors.gotrue-sign-in-rate-limit
  38 P0: 35 green, 3 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-evidence\tests\at\expected\req-001.json exactly (35 declared green, 3 declared red)
```

### Commit a870d4d

| command | start | end | exit |
|---|---|---|---|
| bun install --frozen-lockfile | 2026-09-06T14:08:08.8393358+03:00 | 2026-09-06T14:08:09.0163124+03:00 | 0 |
| bun run typecheck | 2026-09-06T14:08:09.0203249+03:00 | 2026-09-06T14:08:16.7946024+03:00 | 0 |
| bun run at:check req-001 | 2026-09-06T14:08:16.7946024+03:00 | 2026-09-06T14:08:16.9137680+03:00 | 0 |
| bun run at:selftest | 2026-09-06T14:08:16.9137680+03:00 | 2026-09-06T14:08:26.3707558+03:00 | 0 |
| bun run at:verify req-001 --tier loop --expect | 2026-09-06T14:08:26.3707558+03:00 | 2026-09-06T14:08:27.9310400+03:00 | 0 |

**bun install --frozen-lockfile** last 10 lines:

```
[0.07ms] ".env"
bun install v1.3.14 (0d9b296a)

Checked 547 installs across 651 packages (no changes) [111.00ms]
```

**bun run typecheck** last 10 lines:

```
$ bun tests/at/typecheck.ts

=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```

**bun run at:check req-001** last 10 lines:

```
$ bun tests/at/harness/check.ts "req-001"
at:check req-001 — 38 P0 in the acceptance file, 38 registered in the suite
RESULT: 38 P0 ids in bijection
```

**bun run at:selftest** last 10 lines:

```
$ bunx vitest run --root tests/at --config vitest.config.ts harness/

 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56-evidence/tests/at


 Test Files  19 passed (19)
      Tests  293 passed (293)
   Start at  14:08:17
   Duration  8.91s (transform 2.70s, setup 0ms, import 4.00s, tests 20.80s, environment 3ms)

```

**bun run at:verify req-001 --tier loop --expect** last 10 lines:

```
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    green    every enumerated write is rejected for a deactivated account while an active control succeeds
  AT-001.30    red      CapabilityPending: CAPABILITY PENDING — gateway.virtual-key-revocation
  AT-001.31    red      CapabilityPending: CAPABILITY PENDING — gateway.virtual-key-reissue
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    green    role changes and contact transfer leave an append-only audit record that cannot be altered
  AT-001.34    red      CapabilityPending: CAPABILITY PENDING — vendors.gotrue-sign-in-rate-limit
  38 P0: 33 green, 5 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-evidence\tests\at\expected\req-001.json exactly (33 declared green, 5 declared red)
```

### Commit e6c14ce

| command | start | end | exit |
|---|---|---|---|
| bun install --frozen-lockfile | 2026-09-06T14:08:34.8889235+03:00 | 2026-09-06T14:08:35.1084727+03:00 | 0 |
| bun run typecheck | 2026-09-06T14:08:35.1138628+03:00 | 2026-09-06T14:08:43.1644620+03:00 | 0 |
| bun run at:check req-001 | 2026-09-06T14:08:43.1644620+03:00 | 2026-09-06T14:08:43.2767418+03:00 | 0 |
| bun run at:selftest | 2026-09-06T14:08:43.2777548+03:00 | 2026-09-06T14:08:52.6505078+03:00 | 0 |
| bun run at:verify req-001 --tier loop --expect | 2026-09-06T14:08:52.6505078+03:00 | 2026-09-06T14:08:54.0871425+03:00 | 0 |

**bun install --frozen-lockfile** last 10 lines:

```
[0.12ms] ".env"
bun install v1.3.14 (0d9b296a)

Checked 547 installs across 651 packages (no changes) [148.00ms]
```

**bun run typecheck** last 10 lines:

```
$ bun tests/at/typecheck.ts

=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```

**bun run at:check req-001** last 10 lines:

```
$ bun tests/at/harness/check.ts "req-001"
at:check req-001 — 38 P0 in the acceptance file, 38 registered in the suite
RESULT: 38 P0 ids in bijection
```

**bun run at:selftest** last 10 lines:

```
$ bunx vitest run --root tests/at --config vitest.config.ts harness/

 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56-evidence/tests/at


 Test Files  19 passed (19)
      Tests  293 passed (293)
   Start at  14:08:43
   Duration  8.90s (transform 2.35s, setup 0ms, import 3.48s, tests 21.23s, environment 2ms)

```

**bun run at:verify req-001 --tier loop --expect** last 10 lines:

```
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    green    every enumerated write is rejected for a deactivated account while an active control succeeds
  AT-001.30    red      CapabilityPending: CAPABILITY PENDING — gateway.virtual-key-revocation
  AT-001.31    red      CapabilityPending: CAPABILITY PENDING — gateway.virtual-key-reissue
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    green    role changes and contact transfer leave an append-only audit record that cannot be altered
  AT-001.34    red      CapabilityPending: CAPABILITY PENDING — vendors.gotrue-sign-in-rate-limit
  38 P0: 33 green, 5 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-evidence\tests\at\expected\req-001.json exactly (33 declared green, 5 declared red)
```

### Commit 7e70eb2

| command | start | end | exit |
|---|---|---|---|
| bun install --frozen-lockfile | 2026-09-06T14:09:01.7055447+03:00 | 2026-09-06T14:09:01.8702505+03:00 | 0 |
| bun run typecheck | 2026-09-06T14:09:01.8749366+03:00 | 2026-09-06T14:09:09.7277626+03:00 | 0 |
| bun run at:check req-001 | 2026-09-06T14:09:09.7277626+03:00 | 2026-09-06T14:09:09.8439526+03:00 | 0 |
| bun run at:selftest | 2026-09-06T14:09:09.8439526+03:00 | 2026-09-06T14:09:19.0283181+03:00 | 0 |
| bun run at:verify req-001 --tier loop --expect | 2026-09-06T14:09:19.0283181+03:00 | 2026-09-06T14:09:20.4908894+03:00 | 0 |

**bun install --frozen-lockfile** last 10 lines:

```
[0.06ms] ".env"
bun install v1.3.14 (0d9b296a)

Checked 547 installs across 651 packages (no changes) [101.00ms]
```

**bun run typecheck** last 10 lines:

```
$ bun tests/at/typecheck.ts

=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```

**bun run at:check req-001** last 10 lines:

```
$ bun tests/at/harness/check.ts "req-001"
at:check req-001 — 38 P0 in the acceptance file, 38 registered in the suite
RESULT: 38 P0 ids in bijection
```

**bun run at:selftest** last 10 lines:

```
$ bunx vitest run --root tests/at --config vitest.config.ts harness/

 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56-evidence/tests/at


 Test Files  19 passed (19)
      Tests  293 passed (293)
   Start at  14:09:10
   Duration  8.70s (transform 2.01s, setup 0ms, import 3.24s, tests 20.35s, environment 2ms)

```

**bun run at:verify req-001 --tier loop --expect** last 10 lines:

```
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    green    every enumerated write is rejected for a deactivated account while an active control succeeds
  AT-001.30    red      CapabilityPending: CAPABILITY PENDING — gateway.virtual-key-revocation
  AT-001.31    red      CapabilityPending: CAPABILITY PENDING — gateway.virtual-key-reissue
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    green    role changes and contact transfer leave an append-only audit record that cannot be altered
  AT-001.34    red      CapabilityPending: CAPABILITY PENDING — vendors.gotrue-sign-in-rate-limit
  38 P0: 33 green, 5 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-evidence\tests\at\expected\req-001.json exactly (33 declared green, 5 declared red)
```
