# Unit 2 and 3 evidence at the final head

50df047 AI4DEV-89: the taxonomy capture reads the mail catcher above loop
2026-09-09

## Capture timing probe

```
world_ms=401
event=pm_item.status_changed ms=22 deliveries=1 emails=0 roles=ngo
event=blocker.raised ms=26 deliveries=2 emails=1 roles=ngo
event=fuel.depleted ms=35 deliveries=6 emails=3 roles=ngo,platform_admin,volunteer
event=abandonment.released ms=26 deliveries=4 emails=2 roles=ex_volunteer,ngo
event=payment.succeeded ms=24 deliveries=4 emails=2 roles=ngo,volunteer
event=thread.comment ms=9 deliveries=1 emails=0 roles=volunteer
event=lovable.credits_blocked ms=10 deliveries=2 emails=0 roles=ngo,platform_admin
mail_read_ms=27 mail_count=8
ex_volunteer_released=yes
mean_email_event_ms=28 mean_inapp_event_ms=14 ms_per_email=14
extrapolate_48_ms=1568 (34 email-class events, 14 in-app-class events, one world, one mail read)
exit: 0
```

Deleted the probe file `loop/items/AI4DEV-89/lanes/_measure-capture.ts` after capture.

## Commands

### bun run typecheck

Start time: 12:27:54

```
=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
exit: 0
```

### bun run at:check req-016

Start time: 12:28:10

```
at:check req-016 — 12 P0 in the acceptance file, 12 registered in the suite
RESULT: 12 P0 ids in bijection
exit: 0
```

### bun run at:selftest

Start time: 12:28:17

```
 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-89/tests/at

 Test Files  19 passed (19)
      Tests  293 passed (293)
   Start at  12:28:17
   Duration  8.73s (transform 2.25s, setup 0ms, import 3.46s, tests 20.03s, environment 2ms)

exit: 0
```

### bun run at:verify req-016 --tier loop --expect

Start time: 12:28:33

```
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-teCw2C/vitest-report.json

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
exit: 0
```

### bun run at:verify req-016 --tier integration --expect

Start time: 12:28:41

```
at:verify — identity proven before the readiness wait: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — identity proven immediately before the reset: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — 15 migrations expected, 15 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head 50df047, dirty
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-zQcVoP/vitest-report.json

at:verify req-016 --tier integration
  AT-016.01    green    the one shared emitter is the sole writer; blockers/scope/lifecycle hold no direct send path
  AT-016.02    green    registered events equal the taxonomy exactly, are immutable, and carry no CR/scope-change event
  AT-016.03    green    every taxonomy row delivers to exactly its recipients on exactly its channels, with the named payloads
  AT-016.04    green    sensitive negatives: no candidacy to the NGO, no vetting outcome to the volunteer, no donation event
  AT-016.05    green    every critical class goes out by email; the low-tone event is in-app only
  AT-016.06    green    a documented delivery default exists for every taxonomy row
  AT-016.07    red      CapabilityPending: CAPABILITY PENDING — faults.processRestart
  AT-016.08    red      CapabilityPending: CAPABILITY PENDING — fixtures.world.burstThreadComments
  AT-016.09    red      CapabilityPending: CAPABILITY PENDING — faults.at
  AT-016.10    green    recipients resolve at event creation: the old holder receives, the new holder is excluded
  AT-016.11    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.12    green    an escalation-tier event notifies both the NGO and the platform admin
  12 P0: 8 green, 4 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89\tests\at\expected\req-016.json exactly (8 declared green, 4 declared red)
exit: 0
```

### bun run at:verify req-001 --tier loop --expect

Start time: 12:29:26

```
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
exit: 0
```

### bun run at:verify req-001 --tier integration --expect

Start time: 12:29:35

```
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
exit: 0
```
