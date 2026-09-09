# Unit 5 report: the atomic emitter and outbox contract under an induced fault

Written as the work proceeds. This file is the record if the runner discards the final message.

Writer lane for unit 5 of item AI4DEV-89. Working directory
`C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89`, branch
`nirdrang/ai4dev-89-emitter-core-and-static-taxonomy-d1`, started at `93c435a`.

## Commits, oldest first

(filled in as they land)

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

(filled in)

## Manifest changes

(filled in)

## Deviations from the design

(filled in)

## Environment

(filled in)

## Every command and its exact output

(filled in)
