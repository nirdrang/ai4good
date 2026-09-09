# Baseline at unit 2 start

Ran on commit cfb74a6 (AI4DEV-89: the local stack drops a crash-looping log shipper).

## Command results

### git status --short; git log --oneline -1
```
cfb74a6 AI4DEV-89: the local stack drops a crash-looping log shipper
```
exit: 0

### bun run typecheck
```
=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```
exit: 0

### bun run at:check req-016
```
at:check req-016 — 12 P0 in the acceptance file, 12 registered in the suite
RESULT: 12 P0 ids in bijection
```
exit: 0

### bun run at:verify req-016 --tier loop --expect
```
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-3vEZi0/vitest-report.json

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

### supabase status
```
supabase : The term 'supabase' is not recognized as the name of a cmdlet, function, script file, or operable program.
```
exit: command not found

### bunx supabase status
```
{"_tag":"Error","error":{"code":"LegacyStatusDbInspectError","message":"failed to inspect container health: failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine; check if the path is correct and if the daemon is running: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified."}}
```
exit: 1

## Stack

Not running. `supabase` is not on PATH. `bunx supabase status` failed: Docker Desktop's
named pipe (`dockerDesktopLinuxEngine`) is not present, so the CLI cannot reach the Docker
API. No service or port list was printed.
