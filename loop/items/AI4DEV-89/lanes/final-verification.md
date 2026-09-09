# Final verification for the notifications backend run

ce4758d AI4DEV-89: the unit 6 report, with both integration runs

2026-09-09 14:09:58

## Commands

### `bun run typecheck`
start: 14:02:42
duration: 7.92s
```
=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```
exit: 0

### `bun run at:check req-016`
start: 14:03:02
duration: 0.17s
```
at:check req-016 — 12 P0 in the acceptance file, 12 registered in the suite
RESULT: 12 P0 ids in bijection
```
exit: 0

### `bun run at:selftest`
start: 14:03:14
duration: 9.45s
```
 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-89/tests/at

 Test Files  19 passed (19)
      Tests  293 passed (293)
   Start at  14:03:14
   Duration  8.95s (transform 3.53s, setup 0ms, import 4.38s, tests 21.23s, environment 2ms)
```
exit: 0

### `bun run at:verify req-016 --tier loop --expect`
start: 14:03:35
duration: 1.14s
```
at:verify req-016 --tier loop
  AT-016.01    green    the one shared emitter is the sole writer; blockers/scope/lifecycle hold no direct send path
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
  12 P0: 12 green, 0 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89\tests\at\expected\req-016.json exactly (12 declared green, 0 declared red)
```
exit: 0

### `bun run at:verify req-016 --tier integration --expect` (first run)
start: 14:03:48
duration: 49.73s
```
at:verify — identity proven before the readiness wait: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — identity proven immediately before the reset: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — 15 migrations expected, 15 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head ce4758d, dirty
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-aN4MKh/vitest-report.json

at:verify req-016 --tier integration
  AT-016.01    green    the one shared emitter is the sole writer; blockers/scope/lifecycle hold no direct send path
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
  12 P0: 12 green, 0 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89\tests\at\expected\req-016.json exactly (12 declared green, 0 declared red)
```
exit: 0

### `bun run at:verify req-016 --tier integration --expect` (second run)
start: 14:04:51
duration: 49.64s
```
at:verify — identity proven before the readiness wait: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — identity proven immediately before the reset: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — 15 migrations expected, 15 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head ce4758d, dirty
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-QsYafd/vitest-report.json

at:verify req-016 --tier integration
  AT-016.01    green    the one shared emitter is the sole writer; blockers/scope/lifecycle hold no direct send path
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
  12 P0: 12 green, 0 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89\tests\at\expected\req-016.json exactly (12 declared green, 0 declared red)
```
exit: 0

### `bun run at:verify req-001 --tier loop --expect`
start: 14:05:53
duration: 1.35s
```
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-srjp8t/vitest-report.json

at:verify req-001 --tier loop
  AT-001.01    green    NGO email/password signup creates the account, org, admin membership and acknowledgment; sign-in returns
  AT-001.02    green    GitHub OAuth volunteer signup links the identity and returns to the same account
  AT-001.03    green    a session established by Google completes signup through the same path, with the same result as email
  AT-001.04    green    volunteer signup cannot complete without a linked GitHub account
  AT-001.05    green    linking GitHub fires volunteer onboarding with the public stats observably imported
  AT-001.41    green    a volunteer cannot unlink the GitHub identity after signup
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
  AT-001.21    green    one NGO cannot reach another NGO non-public data by UI or by direct id probing
  AT-001.22    green    an unassigned volunteer is denied a project non-public data while the public page stays visible
  AT-001.23    green    the assigned volunteer reaches that project working data, scoped to that project only
  AT-001.40    green    a platform admin reaches any NGO or project data — the admin role spans all accounts
  AT-001.24    red      CapabilityPending: CAPABILITY PENDING — ui.authenticated-surface-rendering
  AT-001.25    green    contact transfer moves ownership, deactivates the old account and preserves all history
  AT-001.26    green    the completed transfer leaves an audit record of who, when and why
  AT-001.27    green    lost-access recovery runs the same audited flow as contact transfer
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    green    every enumerated write is rejected for a deactivated account while an active control succeeds
  AT-001.30    red      CapabilityPending: CAPABILITY PENDING — gateway.virtual-key-revocation
  AT-001.31    red      CapabilityPending: CAPABILITY PENDING — gateway.virtual-key-reissue
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    green    role changes and contact transfer leave an append-only audit record that cannot be altered
  AT-001.34    red      CapabilityPending: CAPABILITY PENDING — vendors.gotrue-sign-in-rate-limit
  38 P0: 33 green, 5 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89\tests\at\expected\req-001.json exactly (33 declared green, 5 declared red)
```
exit: 0

### `bun run at:verify req-001 --tier integration --expect`
start: 14:06:07
duration: 204.54s
```
at:verify — 15 migrations expected, 15 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head ce4758d, dirty
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-d5Dpdg/vitest-report.json

at:verify req-001 --tier integration
  AT-001.01    green    NGO email/password signup creates the account, org, admin membership and acknowledgment; sign-in returns
  AT-001.02    red      CapabilityPending: CAPABILITY PENDING — sut.accounts.registerWithGithub
  AT-001.03    red      CapabilityPending: CAPABILITY PENDING — sut.accounts.registerWithProvider
  AT-001.04    red      CapabilityPending: CAPABILITY PENDING — sut.accounts.registerWithProvider
  AT-001.05    red      CapabilityPending: CAPABILITY PENDING — vendors.github-public-statistics
  AT-001.41    green    a volunteer cannot unlink the GitHub identity after signup
  AT-001.06    green    a volunteer is refused the NGO-only action while an NGO account performs it successfully
  AT-001.07    green    a provisioned platform admin authenticates and carries the type; public signup offers only the two
  AT-001.09    green    a fresh email/password signup of either account type is unverified until the link is used
  AT-001.10    red      CapabilityPending: CAPABILITY PENDING — sut.accounts.sendDiscoveryMessage
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
  AT-001.21    green    one NGO cannot reach another NGO non-public data by UI or by direct id probing
  AT-001.22    green    an unassigned volunteer is denied a project non-public data while the public page stays visible
  AT-001.23    green    the assigned volunteer reaches that project working data, scoped to that project only
  AT-001.40    green    a platform admin reaches any NGO or project data — the admin role spans all accounts
  AT-001.24    red      CapabilityPending: CAPABILITY PENDING — ui.authenticated-surface-rendering
  AT-001.25    green    contact transfer moves ownership, deactivates the old account and preserves all history
  AT-001.26    green    the completed transfer leaves an audit record of who, when and why
  AT-001.27    green    lost-access recovery runs the same audited flow as contact transfer
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    red      CapabilityPending: CAPABILITY PENDING — sut.accounts.sendDiscoveryMessage
  AT-001.30    red      CapabilityPending: CAPABILITY PENDING — gateway.virtual-key-revocation, sut.accounts.sendDiscoveryMessage
  AT-001.31    red      CapabilityPending: CAPABILITY PENDING — gateway.virtual-key-reissue
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    green    role changes and contact transfer leave an append-only audit record that cannot be altered
  AT-001.34    red      CapabilityPending: CAPABILITY PENDING — vendors.gotrue-sign-in-rate-limit
  38 P0: 27 green, 11 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89\tests\at\expected\req-001.json exactly (27 declared green, 11 declared red)
```
exit: 0

## Branch state

### `git log --oneline origin/main..HEAD`
```
ce4758d AI4DEV-89: the unit 6 report, with both integration runs
83bb110 AI4DEV-89: a notification is marked sent only on provider acceptance, retried, never duplicated
b331439 AI4DEV-89: the unit 5 and 6 briefs, the verifications, and the trail
deb63c4 AI4DEV-89: the unit 5 report, with both integration runs and the probes
a830767 AI4DEV-89: the crash fault is an argument of the producer's call, counted by two witnesses
93c435a AI4DEV-89: the unit 4 brief and the lead's trail through it
177370c AI4DEV-89: the unit 4 report with the seven command tails
19bd0e0 AI4DEV-89: one notification per committed event, and the thread-comment anti-spam guard
521779c AI4DEV-89: the record for the taxonomy and defaults units
50df047 AI4DEV-89: the taxonomy capture reads the mail catcher above loop
4ff63ba AI4DEV-89: the taxonomy copy and recipients frozen at emit
cfb74a6 AI4DEV-89: the local stack drops a crash-looping log shipper
d21777f AI4DEV-89: the live adapter opens the integration gate for the notification suite
1598996 AI4DEV-89: the loop tier binds the product core, and the source oracles replace the static scan
db63693 AI4DEV-89: the notification core, its taxonomy, copy and SMTP provider
f0cc1ee AI4DEV-89: the notification outbox schema, its fixture producer, and the SMTP port
eb357f8 AI4DEV-89: the grounding and the design for the notifications backend
afe10da AI4DEV-89: the brief for the notifications backend run, six units
```

### `git status --short`
```
 M loop/items/AI4DEV-89/decisions.tsv
?? loop/items/AI4DEV-89/lanes/comment-audit.md
```

### `git diff --stat origin/main...HEAD`
```
 .claude/pstack-models.md                           |   28 +-
 loop/items/AI4DEV-89/brief.md                      |  239 +++++
 loop/items/AI4DEV-89/decisions.tsv                 |   64 ++
 loop/items/AI4DEV-89/design.md                     |  219 +++++
 .../lanes/arena/candidate-a-sql-resident.md        |  456 +++++++++
 .../lanes/arena/candidate-b-typescript-core.md     |  369 +++++++
 .../lanes/arena/candidate-c-state-machine.md       |  629 ++++++++++++
 .../lanes/arena/candidate-d-ports-and-adapters.md  | 1002 ++++++++++++++++++++
 loop/items/AI4DEV-89/lanes/arena/cross-judge.md    |   87 ++
 loop/items/AI4DEV-89/lanes/baseline-integration.md |  111 +++
 loop/items/AI4DEV-89/lanes/baseline-unit2-start.md |   70 ++
 loop/items/AI4DEV-89/lanes/how-explanation.md      |  223 +++++
 .../AI4DEV-89/lanes/how-explorer-1-harness.md      |  352 +++++++
 .../AI4DEV-89/lanes/how-explorer-2-database.md     |  359 +++++++
 .../AI4DEV-89/lanes/how-explorer-3-application.md  |  348 +++++++
 loop/items/AI4DEV-89/lanes/how-explorer-4-suite.md |  492 ++++++++++
 loop/items/AI4DEV-89/lanes/inflight-check.md       |   66 ++
 loop/items/AI4DEV-89/lanes/unit-1-report.md        |  390 ++++++++
 loop/items/AI4DEV-89/lanes/unit-2-evidence.md      |  216 +++++
 loop/items/AI4DEV-89/lanes/unit-2-report.md        |  106 +++
 loop/items/AI4DEV-89/lanes/unit-4-report.md        |  267 ++++++
 loop/items/AI4DEV-89/lanes/unit-4-verification.md  |  228 +++++
 loop/items/AI4DEV-89/lanes/unit-5-report.md        |  442 +++++++++
 loop/items/AI4DEV-89/lanes/unit-5-verification.md  |  168 ++++
 loop/items/AI4DEV-89/lanes/unit-6-report.md        |  334 +++++++
 loop/items/AI4DEV-89/unit-1-brief.md               |  179 ++++
 loop/items/AI4DEV-89/unit-2-brief.md               |  146 +++
 loop/items/AI4DEV-89/unit-4-brief.md               |  165 ++++
 loop/items/AI4DEV-89/unit-5-brief.md               |  174 ++++
 loop/items/AI4DEV-89/unit-6-brief.md               |  171 ++++
 supabase/config.toml                               |   28 +-
 supabase/functions/_shared/notification-copy.ts    |   84 ++
 .../functions/_shared/notification-provider.ts     |  212 +++++
 .../functions/_shared/notification-taxonomy.ts     |  251 +++++
 supabase/functions/_shared/notifications.ts        |  440 +++++++++
 ...0913120000_notification_taxonomy_and_outbox.sql |  306 ++++++
 ...260913121000_notification_fixture_producers.sql |   66 ++
 tests/at/expected/req-016.json                     |   25 +-
 tests/at/harness/conformance.selftest.ts           |    9 +-
 tests/at/harness/live-refusal.selftest.ts          |   69 +-
 tests/at/harness/local-stack.ts                    |   15 +-
 tests/at/suites/req-001/_policy-scan.ts            |    5 +
 tests/at/suites/req-016/_contract.ts               |    6 +
 tests/at/suites/req-016/_fault-switch.ts           |   55 ++
 tests/at/suites/req-016/_fixture-producers.ts      |   31 +
 tests/at/suites/req-016/_fixture.ts                |  567 +++++------
 tests/at/suites/req-016/_integration.ts            |  382 ++++++++
 tests/at/suites/req-016/_live.ts                   |  637 +++++++++++++
 tests/at/suites/req-016/_mail-witness.ts           |  118 +++
 tests/at/suites/req-016/_provider-faults.ts        |  147 +++
 tests/at/suites/req-016/_source-scan.ts            |  229 +++++
 .../suites/req-016/a-emitter-and-taxonomy.test.ts  |   71 +-
 .../at/suites/req-016/b-delivery-defaults.test.ts  |   14 +-
 .../at/suites/req-016/c-reliability-guard.test.ts  |    9 +-
 .../at/suites/req-016/d-taxonomy-evidence.test.ts  |   27 +-
 55 files changed, 11451 insertions(+), 452 deletions(-)
```
