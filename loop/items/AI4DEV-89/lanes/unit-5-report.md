# Unit 5 report: the atomic emitter and outbox contract under an induced fault

Written as the work proceeds. This file is the record if the runner discards the final message.

Writer lane for unit 5 of item AI4DEV-89. Working directory
`C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89`, branch
`nirdrang/ai4dev-89-emitter-core-and-static-taxonomy-d1`, started at `93c435a`.

## Commits, oldest first

- `a830767` AI4DEV-89: the crash fault is an argument of the producer's call, counted by two
  witnesses. The switch module, both bindings, the shared SQL client, the timeout, the manifest
  flip, and the first draft of this report.
- The final version of this report is a follow-up commit on the same branch.

The tree after the first commit still shows `loop/items/AI4DEV-89/decisions.tsv` modified and
`loop/items/AI4DEV-89/lanes/unit-4-verification.md` and `loop/items/AI4DEV-89/unit-5-brief.md`
untracked. None is this unit's. They were left alone, and the runner printed `head a830767,
dirty` because of them.

## Files created or changed

| path | what changed |
|---|---|
| `tests/at/suites/req-016/_fault-switch.ts` | new. `createCrashSwitch(point, openLedger, triggerCount)`: one live arming, the kind check, a ledger per arming that the binding writes its witnesses into, and the binding's own judgement that turns the ledger into a count |
| `tests/at/suites/req-016/_fixture.ts` | the armed-points map and `reachFaultPoint` are gone; `append` reads the switch, restores the transition, counts the reach and throws; `faults.arm` delegates to the switch |
| `tests/at/suites/req-016/_live.ts` | the switch with a two-column ledger; `faultTriggers()` reads `pg_sequence_last_value`; `inducedRefusal()` matches the raise's `detail`; `append` forwards the arming as `p_induce_fault` and records both witnesses; `faults.arm` arms the crash point and keeps the provider point pending; one SQL client per process, reference counted; header paragraph updated |
| `tests/at/suites/req-016/c-reliability-guard.test.ts` | AT-016.09 carries `timeoutMs: { integration: 240_000 }` |
| `tests/at/expected/req-016.json` | AT-016.09 green at integration |
| `loop/items/AI4DEV-89/lanes/unit-5-report.md` | this report |

The migration is untouched. Unit 1 landed the fault branch and the sequence bump, and the file
matches the design's function statement for statement.

## What already existed, verified against the tree before planning

- `supabase/migrations/20260913121000_notification_fixture_producers.sql` already carries the
  fault branch: `if p_induce_fault then perform nextval(...); raise exception ... using errcode =
  'P0001', detail = 'induced-fault:notifications.between_transition_and_event_write'; end if;`
  between the transition upsert and `emit_notification`. Unit 1's report, deviation 6, said so and
  the file agrees. The sequence `public.notification_fault_triggers` is created in the outbox
  migration and revoked from the three client roles.
- `tests/at/suites/req-016/_live.ts` passes `false` as the third argument on every `append` and
  its `faults.arm` throws `CapabilityPending(['faults.at'])`. Its `points()` already lists both
  points.
- `tests/at/suites/req-016/_fixture.ts` holds a map of armed points and `reachFaultPoint`, which
  increments an in-process count and throws.
- `tests/at/harness/faults.ts` calls the adapter's `arm(point, kind)` synchronously and reads
  `triggerCount()` synchronously. Neither can await a database read. This constrains where the
  live adapter may read the sequence: only inside `append`, which is already async.
- The AT-016.09 body swallows whatever `w.fire` throws (`catch {}`), so a disagreement between the
  two witnesses must surface from `triggerCount()`, which the harness reads inside `clear()`,
  outside that catch. A disagreement thrown from `append` would be swallowed.

## Measured facts

A throwaway Bun script in the session scratchpad (not in the tree) called
`public.fixture_commit_transition_and_emit` with `p_induce_fault = true` as the operator and read
the sequence before and after. Output, verbatim:

```
sequence before: 0 string
name: PostgresError
own keys: [
  "message", "name", "code", "errno", "detail", "severity", "where", "file", "originalLine", "originalColumn",
  "line", "column", "sourceURL", "stack", "routine"
]
message: induced fault: crash at notifications.between_transition_and_event_write
code: ERR_POSTGRES_SERVER_ERROR
errno: P0001
detail: induced-fault:notifications.between_transition_and_event_write
severity: ERROR
hint: undefined
where: PL/pgSQL function public.fixture_commit_transition_and_emit(text,jsonb,boolean) line 11 at RAISE
sequence after: 1
transition rows after rollback: 0
```

So: the raise's `detail` arrives as the error's own `detail` property; `errno` carries the
SQLSTATE, as the auth suite measured earlier; `pg_sequence_last_value` advanced by exactly one
across the rolled-back call and arrives as a string (bigint), so the adapter wraps it in `Number`;
and the transition upsert was rolled back.

## The first integration run went red on connection slots, and the fix

First integration run on the uncommitted tree: AT-016.09 red with `Error: provisioning the auth
user volunteer+req-016-base-mtty2szo-ukqhyc@example.test answered 500`, every other id as declared,
elapsed 51 s. The auth container log at that second:

```
"error":"unable to find identity by email for duplicates: unable to fetch records: failed to connect to `host=supabase_db_poancmeitlmxejofwzuu user=supabase_auth_admin database=postgres`: server error (FATAL: remaining connection slots are reserved for roles with the SUPERUSER attribute (SQLSTATE 53300))","level":"error","method":"POST","msg":"500: Database error checking email","path":"/admin/users"
```

Measured with a second throwaway probe: `max_connections` 100, `superuser_reserved_connections` 3,
27 sessions at idle with the probe's one client connected (10 of them the probe's own), 73 with five
more idle clients. So one Bun SQL client holds about ten connections as soon as it is used. The
registry tears every harness of one body down together after the body (`runTrackedTest` in
`tests/at/harness/registry.ts`), so AT-016.09's twenty-two `open()` calls hold twenty-two clients,
about 220 connections, against a database with 97 usable slots, while the other three test files
run in parallel workers.

This red is mine: unit 5 is what makes the id run twenty-two worlds for real. The fix is in the
file the design names for this unit. `_live.ts` now holds one SQL client per process, shared by
every adapter it builds and reference counted; the last adapter's teardown closes it. Nothing in
the harness changed. The auth suite's live adapter has the same one-client-per-adapter shape and
its ids open fewer worlds; not changed, named here.

## The fault mechanism

The product side was already in the tree: the fixture producer takes `p_induce_fault`, and when it
is true it takes `nextval` on `public.notification_fault_triggers` and raises `P0001` with
`detail = 'induced-fault:notifications.between_transition_and_event_write'`, between the
transition upsert and `emit_notification`. This unit designed the adapter side: how the arming
reaches that argument, and how the reach is counted so that no single party can invent it.

**One crash switch, read immediately before the one write that can crash.** Both bindings import
`createCrashSwitch` from `_fault-switch.ts`. The switch holds at most one live arming. `arm(kind)`
refuses any kind but `crash` with the "implements no" sentence the conformance selftest expects,
opens a ledger, and hands back the harness's `ArmedFault`. `armed()` returns the live ledger or
null. The binding reads `armed()` inside `append`, and nowhere else.

**The ledger is the binding's, and so is the judgement.** The switch is generic over the ledger and
takes the function that turns a ledger into a trigger count. That is the whole difference between
the tiers:

- In memory, the binding is the code path. `_fixture.ts` opens `{ reaches: 0 }`, and when `append`
  finds the switch armed it puts the transition back, adds one to `reaches`, and throws
  `induced fault: crash at ...`. The count is the reach and nothing else. There is one witness at
  the loop tier and there cannot be a second: no product record exists apart from the binding.
- Over the stack, `_live.ts` opens `{ sequenceAdvances: 0, refusals: 0 }`. `append` reads the
  sequence, calls the producer with `p_induce_fault = (armed !== null)`, and in `finally` reads the
  sequence again and adds the difference to `sequenceAdvances`, whether the call refused or not. In
  `catch`, if the error's own `detail` equals the raise's marker, it adds one to `refusals`, then
  rethrows. `triggerCount()` returns `sequenceAdvances` only when it equals `refusals`; otherwise it
  throws naming both numbers.

**Why the sequence witness survives.** `nextval` is outside transactional control, so the value
taken immediately before the raise persists through the rollback that erases the transition. The
probe above shows it: sequence 0 before, 1 after, transition rows 0.

**Why the reads are inside `append`.** `AdapterFaultSeam.arm` and `ArmedFault.triggerCount` are
synchronous in `tests/at/harness/faults.ts`. Neither can await a database read. The one place the
live binding is already asynchronous around the reach is `append`, so the sequence is read on both
sides of the call there, while armed. The window is per call, not per arming.

**Why the disagreement is thrown from `triggerCount()`.** AT-016.09 wraps `w.fire` in `try {}
catch {}` and swallows whatever it throws. A disagreement thrown from `append` would vanish. The
harness reads `triggerCount()` inside `clear()`, in the test's `finally`, outside that catch, so a
disagreement thrown there is the test's failure.

### How the two witnesses can disagree

They record on different sides of the wire: the database writes the sequence inside the
transaction, the adapter reads the refusal off the connection. Neither can write the other's
column.

`sequenceAdvances` greater than `refusals`:

- The producer takes `nextval` and no longer raises (the raise deleted or guarded). The call then
  returns an event id, the sequence has moved, and no refusal arrived. `triggerCount()` throws;
  without the sequence witness the harness would report "never fired" and the test would still
  fail, but with the wrong diagnosis.
- Something between the database and this file swallows or replaces the error: a retrying wrapper
  that succeeds on the second attempt, or a rethrow that drops `detail`.
- Another actor takes `nextval` on the sequence during the window: a second producer, a concurrent
  world, a stray product path.

`refusals` greater than `sequenceAdvances`:

- A refusal carrying the marker `detail` is raised by something other than the fault point (a
  trigger or another function that copied the string), or the raise is re-ordered before the
  `nextval`.
- The adapter refuses client-side without calling the database at all. That is the "count the
  adapter invented" shape the design warns of, and it is exactly what the sequence witness refuses.

Both witnesses zero while armed: the fault did not fire, and the harness's `faultFiredProblem`
refuses the clear. That case is the harness's and this unit routes through it, as the brief said.

### Two shapes I rejected

1. **The sequence baseline at arming time and the delta at `triggerCount()`**, the design's
   literal words. Rejected because both seam calls are synchronous. Doing it that way needs either
   a harness change, which this item does not make, or a promise started in `arm` that
   `triggerCount()` still cannot await. The per-call window is what the seam allows, and it is also
   the tighter window: a `nextval` by a stranger between arming and the call is not counted as this
   call's reach.
2. **Matching the refusal on its message text** (`/induced fault/`) rather than the `detail` field.
   Rejected because the message is what the loop binding prints too, and what any error that
   quotes the sentence would carry. `detail` is set by the raise and by nothing else in the tree,
   so it is the product's own marker and not a coincidence of wording. The probe confirmed the
   client exposes it as an own property.

Beyond those two, the design's three rejections were not revisited: no product SQL reads test
state, no control table exists, the arming is the call's own argument.

## Manifest changes

- **AT-016.09** moves from red on `faults.at` to green at the integration tier. Reason: the live
  adapter arms the crash point, and both integration runs below report it green.
- **AT-016.11** stays red on `vendors.email`. Its first refusal is still the harness's refusing
  vendor proxy; `--expect` exits 0 on that name in both runs, so the name is still true. Unit 6
  owns it. The live adapter's provider point still throws `CapabilityPending(['faults.at'])`, and
  no id reaches it before `vendors.email` refuses.
- The loop tier is unchanged: twelve green.

## Deviations from the design

1. **A new suite-local file, `_fault-switch.ts`.** The design's unit 5 file list names only the
   migration, `_live.ts` and `_fixture.ts`. "Re-expressed through the same seam" needs a seam both
   files can import, and the live binding importing from the loop binding would make the
   integration tier depend on the loop module. Suite-local files are the standing precedent
   (`_source-scan.ts`, `_mail-witness.ts`). Nothing in `tests/at/harness/` changed.
2. **The sequence is read inside `append`, per call, not at arming and at `triggerCount()`.** The
   seam is synchronous. Said in full above.
3. **One SQL client per process in `_live.ts`.** Not in the design; forced by the measured pool
   size and the registry's end-of-body teardown. Said in full above.
4. **The migration is untouched.** The design lists "`fixture_commit_transition_and_emit` gains its
   fault branch and the sequence" under unit 5; unit 1 landed both, its report says so, and the
   file was verified against the design before planning.
5. **`c-reliability-guard.test.ts` is edited** for the timeout only. The design budgets the id at
   240 seconds and the brief says to set it. The body is unchanged.

## Environment

The Docker engine and the local stack were already running. Edge runtime
`supabase_edge_runtime_poancmeitlmxejofwzuu` stayed up. Restart count: 0. No `db:start`, no
`db:stop`, no Docker Desktop action. Slot containers were ignored. The stack ran the analytics and
vector containers throughout, as the unit 4 runs did.

Two throwaway probes ran against the stack from the session scratchpad, both outside the tree and
not committed: the error-shape probe and the connection-count probe quoted above. The first
advanced the fault sequence once and left one rolled-back transaction; the runner's reset before
each integration run erased both.

## Every command and its exact output

Commands were run through PowerShell from the worktree root. The leading `NativeCommandError`
banner PowerShell wraps around a native command's stderr is stripped from the quotes below,
nothing else is. The integration tier was timed with a stopwatch around the whole command.

### `bun run typecheck` (committed tree)

```
=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
exit 0
```

### `bun run at:check req-016`

```
at:check req-016 — 12 P0 in the acceptance file, 12 registered in the suite
RESULT: 12 P0 ids in bijection
exit 0
```

### `bun run at:selftest` (committed tree)

```
 Test Files  19 passed (19)
      Tests  293 passed (293)
   Start at  13:26:40
   Duration  9.42s (transform 2.40s, setup 0ms, import 3.32s, tests 20.04s, environment 3ms)
exit 0
```

The same command on the tree before the shared-client change: 19 files, 293 tests, 8.83 s, exit 0.

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
exit 0
```

### `bun run at:verify req-016 --tier integration --expect`, first run on the uncommitted tree before the shared client

Quoted in the connection-slots section above: 10 green, 2 red, `EXPECT FAILURE: 3 deviation(s)`,
exit 1, elapsed 51 s.

### `bun run at:verify req-016 --tier integration --expect`, run one (tree of `a830767`, before commit)

```
at:verify — identity proven before the readiness wait: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — identity proven immediately before the reset: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — 15 migrations expected, 15 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head 93c435a, dirty
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-O5y83n/vitest-report.json

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
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89\tests\at\expected\req-016.json exactly (11 declared green, 1 declared red)
exit 0
elapsed 50 s
```

### `bun run at:verify req-016 --tier integration --expect`, run two (committed `a830767`)

```
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head a830767, dirty
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-0TkcIr/vitest-report.json

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
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89\tests\at\expected\req-016.json exactly (11 declared green, 1 declared red)
exit 0
req-016 integration elapsed 54 s
```

The two identity lines and the migrations line are identical to run one and are not repeated.
The runner deletes its vitest report after the run, so no per-id duration is on record; the
whole tier, twenty-two worlds included, is 50 and 54 seconds against a 240 second budget for
the one id.

### `bun run at:verify req-001 --tier loop --expect`

```
  38 P0: 33 green, 5 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89\tests\at\expected\req-001.json exactly (33 declared green, 5 declared red)
exit 0
```

The per-id lines match the manifest and unit 4's quote of the same run; the last four lines are
quoted.

### `bun run at:verify req-001 --tier integration --expect` (committed `a830767`)

```
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head a830767, dirty
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-NwMiFl/vitest-report.json

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
exit 0
req-001 integration elapsed 210 s
```

This unit adds no table and no write route, so the standing checks the auth suite carries (the
static catalog scan, the live catalog check, the append-only audit, the lifecycle gate conformance)
had nothing new to judge; the run confirms they are unchanged.

## Counts after this unit

| suite | tier | green | red | expect |
|---|---|---|---|---|
| req-016 | loop | 12 | 0 | 0 |
| req-016 | integration | 11 | 1 | 0 |
| req-001 | loop | 33 | 5 | 0 |
| req-001 | integration | 27 | 11 | 0 |

Flipped green at integration: AT-016.09. Left red, as the brief required: AT-016.11 on
`vendors.email`.

## What this unit hands to unit 6

The live `faults.arm` still throws `CapabilityPending(['faults.at'])` for
`notifications.provider_send`. The provider fault decorator, the Mailpit idempotent replay, and
the adapter's own record of provider outcomes (the limit unit 2 named) are unit 6's. The crash
switch's ledger shape is the precedent if the provider point wants a two-witness count of its own:
the decorator's forced outcomes on one side, and the catcher's physical messages on the other.
