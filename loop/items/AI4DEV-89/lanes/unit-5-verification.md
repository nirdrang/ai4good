# Unit 5 independent verification

deb63c4 AI4DEV-89: the unit 5 report, with both integration runs and the probes
2026-09-09

## Commands

### bun run typecheck
start: 13:30:41
duration: 7.78 s
```
=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```
exit: 0

### bun run at:check req-016
start: 13:30:56
duration: 0.15 s
```
at:check req-016 — 12 P0 in the acceptance file, 12 registered in the suite
RESULT: 12 P0 ids in bijection
```
exit: 0

### bun run at:selftest
start: 13:31:03
duration: 8.92 s
```
 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-89/tests/at

 Test Files  19 passed (19)
      Tests  293 passed (293)
   Start at  13:31:03
   Duration  8.39s (transform 2.48s, setup 0ms, import 3.70s, tests 19.24s, environment 3ms)
```
exit: 0

### bun run at:verify req-016 --tier loop --expect
start: 13:31:18
duration: 1.21 s
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
  EXPECTED: the run matches ...tests\at\expected\req-016.json exactly (12 declared green, 0 declared red)
```
exit: 0

### bun run at:verify req-016 --tier integration --expect (first run)
start: 13:31:27
duration: 52.62 s
```
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — head deb63c4, dirty

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
  AT-016.11    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.12    green    an escalation-tier event notifies both the NGO and the platform admin
  12 P0: 11 green, 1 red, 0 missing
  EXPECTED: the run matches ...tests\at\expected\req-016.json exactly (11 declared green, 1 declared red)
```
exit: 0

### bun run at:verify req-016 --tier integration --expect (second run)
start: 13:32:25
duration: 54.13 s
```
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — head deb63c4, dirty

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
  AT-016.11    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.12    green    an escalation-tier event notifies both the NGO and the platform admin
  12 P0: 11 green, 1 red, 0 missing
  EXPECTED: the run matches ...tests\at\expected\req-016.json exactly (11 declared green, 1 declared red)
```
exit: 0

### bun run at:verify req-001 --tier loop --expect
start: 13:33:27
duration: 1.33 s
```
at:verify req-001 --tier loop
  (37 green, 5 red — see full listing in the command's terminal output above; ids: AT-001.18 red
  [sut-missing, D3.L3 not landed], AT-001.24, AT-001.30, AT-001.31, AT-001.34 red [CapabilityPending])
  38 P0: 33 green, 5 red, 0 missing
  EXPECTED: the run matches ...tests\at\expected\req-001.json exactly (33 declared green, 5 declared red)
```
exit: 0

### bun run at:verify req-001 --tier integration --expect
start: 13:33:36
duration: 207.51 s
```
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — head deb63c4, dirty

at:verify req-001 --tier integration
  AT-001.01 green, AT-001.02 red [CapabilityPending sut.accounts.registerWithGithub],
  AT-001.03 red [CapabilityPending sut.accounts.registerWithProvider],
  AT-001.04 red [CapabilityPending sut.accounts.registerWithProvider],
  AT-001.05 red [CapabilityPending vendors.github-public-statistics],
  AT-001.41 green, AT-001.06 green, AT-001.07 green, AT-001.09 green,
  AT-001.10 red [CapabilityPending sut.accounts.sendDiscoveryMessage],
  AT-001.38 green, AT-001.12 green, AT-001.13 green, AT-001.14 green, AT-001.16 green,
  AT-001.36 green, AT-001.37 green, AT-001.17 green,
  AT-001.18 red [AtPending sut-missing, D3.L3 not landed],
  AT-001.19 green, AT-001.39 green, AT-001.20 green, AT-001.21 green, AT-001.22 green,
  AT-001.23 green, AT-001.40 green,
  AT-001.24 red [CapabilityPending ui.authenticated-surface-rendering],
  AT-001.25 green, AT-001.26 green, AT-001.27 green, AT-001.28 green, AT-001.35 green,
  AT-001.29 red [CapabilityPending sut.accounts.sendDiscoveryMessage],
  AT-001.30 red [CapabilityPending gateway.virtual-key-revocation, sut.accounts.sendDiscoveryMessage],
  AT-001.31 red [CapabilityPending gateway.virtual-key-reissue],
  AT-001.32 green, AT-001.33 green,
  AT-001.34 red [CapabilityPending vendors.gotrue-sign-in-rate-limit]
  38 P0: 27 green, 11 red, 0 missing
  EXPECTED: the run matches ...tests\at\expected\req-001.json exactly (27 declared green, 11 declared red)
```
exit: 0

## Connection count

Idle count (before any verify run): 20 connections.

Sequence sampled while `bun run at:verify req-016 --tier integration --expect` ran a third
time (a separate run from steps 5 and 6, started 13:37:55 as a background process, finished
about 13:38:50, same green/red result as steps 5 and 6): 8, 10, 20, 18, 18.

Highest count seen during a run: 20.

Interleaving: achieved. The verify command was launched as a detached background process
(`Start-Process`) and the connection-count command was run five times against the live
database while that process was still executing, before the process exited.
