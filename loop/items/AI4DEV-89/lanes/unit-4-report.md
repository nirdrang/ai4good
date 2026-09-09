# Unit 4 report: one notification per committed event, and the anti-spam guard

Written as the work proceeds. This file is the record if the runner discards the final message.

## Commits, oldest first

- `19bd0e0` AI4DEV-89: one notification per committed event, and the thread-comment anti-spam guard. The implementation, the manifest flip, and the first draft of this report.
- This file's final evidence section is a follow-up commit on the same branch.

The tree after the implementation commit still shows `loop/items/AI4DEV-89/decisions.tsv` modified and `loop/items/AI4DEV-89/unit-4-brief.md` untracked. Neither is this unit's. They were left alone.

## Mid-flight precondition (AT-016.07)

`w.fire()` at both tiers only calls `core.emit` then `outbox.append`. It does not drain. Live `append` is one `fixture_commit_transition_and_emit` call. Deliveries insert as `pending`. `payment.succeeded` is a money row with null channels, so it binds to email and in-app for the NGO and the volunteer: four pending rows, none `sent`.

A restart after `fire()` and before `drainDeliveries()` is therefore mid-flight. If `fire()` had drained, the id would be a red rather than a pass. Confirmed from the code, then by the integration run: AT-016.07 is green, so the three preconditions held, including "nothing delivered yet".

## What landed

Unit 1 already landed the worker in the core and `apply_delivery_results` in the first notification migration, because AT-016.01 drains a real send. This unit does not add a second copy.

- The live process epoch is a `let`. `processRestart` mints `delivery-process-<uuid>`. The core's `ProcessPort` reads that binding at stamp time, so pending work completed after the restart carries the new identity. The harness refuses a restart that left the identity unchanged.
- `threadCommentGuard(config)` lives on the core and reads `ClockPort.now()`. Window state lives in the guard object the producer holds. `fire('thread.comment')` still emits; only `burstThreadComments` consults the guard.
- The loop fixture's burst routes through that guard. The live factory never receives `h.config`, so the pin travels in the world name `req-016/guard?cap=<n>&window=<ms>&coalesce=<bool>`.
- The AT-016.08 integration procedure uses two explicit pins with short windows, three seconds and five seconds, and waits real time. It reads the pins back from `h.config` and names the world from those same numbers. The id carries `timeoutMs: { integration: 60_000 }`.

No new table. No new write route. No new harness machinery.

## Files changed

| path | what changed |
|---|---|
| `supabase/functions/_shared/notifications.ts` | `threadCommentGuard` on the core, reading `ClockPort` |
| `tests/at/suites/req-016/_fixture.ts` | burst routes through the core guard |
| `tests/at/suites/req-016/_live.ts` | mutable process epoch; restart mints a new one; world name carries the guard pin; burst is real |
| `tests/at/suites/req-016/_integration.ts` | AT-016.08 procedure, two short windows, real waits |
| `tests/at/suites/req-016/b-delivery-defaults.test.ts` | `timeoutMs: { integration: 60_000 }` |
| `tests/at/expected/req-016.json` | AT-016.07 and AT-016.08 green at integration; AT-016.09 and AT-016.11 stay red |
| `loop/items/AI4DEV-89/lanes/unit-4-report.md` | this report |

## Manifest

AT-016.07 moved from red on `faults.processRestart` to green.

AT-016.08 moved from red on `fixtures.world.burstThreadComments` to green.

AT-016.09 stays red on `faults.at`. Unit 5 owns it.

AT-016.11 stays red on `vendors.email`. Unit 6 owns it.

No other id changed its first refusal.

## Deviations from the design

None. Two notes that are not deviations:

1. The worker and `applyPassResults` already lived in the core and the migration, from unit 1. This unit does not add a second copy.
2. The live restart mutates the epoch string, the way the loop fixture does with `epochSeq`. The core stores nothing, so minting a new identity is the restart. The same `ProcessPort` closure is what `drain` reads when it stamps.

## Environment

The Docker engine and the local stack were already running. Edge runtime `supabase_edge_runtime_poancmeitlmxejofwzuu` stayed up. Restart count: 0. Slot containers were ignored.

The runner printed `head 19bd0e0, dirty` on both integration runs because `decisions.tsv` and the unit brief sit unstaged. That dirt is not this unit's.

## Every command and its exact output

Commands were run through PowerShell from the worktree root. Every one exits 0.

### `bun run typecheck`

```
=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```

exit 0.

### `bun run at:check req-016`

```
at:check req-016 — 12 P0 in the acceptance file, 12 registered in the suite
RESULT: 12 P0 ids in bijection
```

exit 0.

### `bun run at:selftest`

```
 Test Files  19 passed (19)
      Tests  293 passed (293)
   Start at  12:48:49
   Duration  8.31s (transform 2.40s, setup 0ms, import 3.31s, tests 19.32s, environment 2ms)
```

exit 0.

### `bun run at:verify req-016 --tier loop --expect`

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

exit 0.

### `bun run at:verify req-016 --tier integration --expect`

```
at:verify — identity proven before the readiness wait: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — identity proven immediately before the reset: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — 15 migrations expected, 15 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head 19bd0e0, dirty
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-wtugP0/vitest-report.json

at:verify req-016 --tier integration
  AT-016.01    green    the one shared emitter is the sole writer; blockers/scope/lifecycle hold no direct send path
  AT-016.02    green    registered events equal the taxonomy exactly, are immutable, and carry no CR/scope-change event
  AT-016.03    green    every taxonomy row delivers to exactly its recipients on exactly its channels, with the named payloads
  AT-016.04    green    sensitive negatives: no candidacy to the NGO, no vetting outcome to the volunteer, no donation event
  AT-016.05    green    every critical class goes out by email; the low-tone event is in-app only
  AT-016.06    green    a documented delivery default exists for every taxonomy row
  AT-016.07    green    one logical event per committed event, one delivery per recipient-channel pair, across a restart
  AT-016.08    green    a comment burst delivers the count the pinned anti-spam configuration prescribes, on two different configurations
  AT-016.09    red      CapabilityPending: CAPABILITY PENDING — faults.at
  AT-016.10    green    recipients resolve at event creation: the old holder receives, the new holder is excluded
  AT-016.11    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.12    green    an escalation-tier event notifies both the NGO and the platform admin
  12 P0: 10 green, 2 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89\tests\at\expected\req-016.json exactly (10 declared green, 2 declared red)
```

exit 0.

### `bun run at:verify req-001 --tier loop --expect`

```
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

exit 0.

### `bun run at:verify req-001 --tier integration --expect`

```
at:verify — identity proven before the readiness wait: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — identity proven immediately before the reset: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — 15 migrations expected, 15 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head 19bd0e0, dirty
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-GI6QuA/vitest-report.json

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

exit 0.

## Counts after this unit

| suite | tier | green | red | expect |
|---|---|---|---|---|
| req-016 | loop | 12 | 0 | 0 |
| req-016 | integration | 10 | 2 | 0 |
| req-001 | loop | 33 | 5 | 0 |
| req-001 | integration | 27 | 11 | 0 |

Flipped green at integration: AT-016.07, AT-016.08.

Left red, as this brief required: AT-016.09 on `faults.at`, AT-016.11 on `vendors.email`.
