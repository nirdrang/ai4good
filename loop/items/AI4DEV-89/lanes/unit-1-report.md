# Unit 1 report: the notification spine

Writer lane for unit 1 of the notifications backend run. Working directory
`C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89`, branch `AI4DEV-89`.

## Commits, oldest first

| sha | what it lands |
|---|---|
| `f0cc1ee` | earlier lane, kept: the two migrations, the five catalog rows, `smtp_port = 44325` |
| `db63693` | the notification core, its taxonomy, copy and SMTP provider, plus the fixture producer payloads |
| `1598996` | the loop tier binds the product core; the three source oracles; the mail witness; the integration procedures; AT-016.01 green at loop |
| `d21777f` | the live adapter opens the integration gate; the AT-016.08 refusal; the two selftests re-pointed; the integration manifest |

## What I kept from the earlier lane, what I changed, and why

Read against the design and the tests, not assumed.

- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`, kept whole. The five
  tables, the three enums, the sequence, `emit_notification` and `apply_delivery_results` match
  candidate D with override 1 (the deliveries table is tenant-isolated with the own-in-app policy)
  and override 2 (`accepted_at`, `provider_receipt`) applied. Every table has the baseline revoke
  and row level security; every function is a definer with `set search_path = ''` and execute
  revoked from public. The live catalog check at the auth suite's integration tier is what proves
  the posture on the stack; see the criteria section.
- `supabase/migrations/20260913121000_notification_fixture_producers.sql`, kept whole. The fault
  branch and the sequence bump are already landed, as an argument of the call, which is the design's
  shape. I chose to keep them: the branch is three statements, it is never reached because unit 1
  always passes `false`, and taking it out to put it back in unit 5 would be churn. Unit 5 owns the
  arming seam in the adapter and the two-witness count.
- `tests/at/suites/req-001/_policy-scan.ts`, kept. The five catalog rows are right.
- `supabase/config.toml`, kept. `smtp_port = 44325` is a new key beside `port = 44324`, so the
  runner's drift check sees no change.
- `supabase/functions/_shared/notification-taxonomy.ts`, kept whole. Forty-eight rows, the class
  channel rule enforced at load (override 6), `DEFAULT_BY_CLASS` with a stated source per class,
  `channelsFor`, `documentedDefaults`. Pure.
- `supabase/functions/_shared/notification-copy.ts`, kept whole. One general template; unit 2 grows
  it. No placeholder rows.
- `supabase/functions/_shared/notifications.ts`, kept whole. The six ports, the branded `WriteSet`
  with a declared, unexported symbol, `prepareWriteSet` as the only constructor, `createNotifications`,
  `SENDER_DECLARATIONS`, `NOTIFICATION_COMPONENTS`. Pure. The drain runs to quiescence; see the
  deviations section for why it has no other stop.
- `supabase/functions/_shared/notification-provider.ts`, one change. The earlier lane's
  `deliverOverSmtp` assigned the session inside a `.then` callback and then checked it, which the
  compiler narrows to `never` after the check, so `session?.close()` in the `finally` failed
  `bun run typecheck` under `tests/at/tsconfig.json`. The earlier lane's claim of a clean typecheck
  did not hold for this file. The session is now assigned directly from the race, and a connection
  that opens after the deadline is still closed rather than leaked. Everything else is kept.
- `tests/at/suites/req-016/_fixture-producers.ts`, kept whole.

## Files created or changed by this lane

| path | one line |
|---|---|
| `tests/at/suites/req-016/_fixture.ts` | rewritten as the loop binding of the six ports; memory outbox, the simulator behind the provider port, the world's actors as the directory; keeps `event-${n}`, the fault point inside `append`, and the world class the suite's types derive from |
| `tests/at/suites/req-016/_contract.ts` | `World` gains `addresses: Record<Role, string>`, so an integration body can scope the mail catcher to its own world |
| `tests/at/suites/req-016/_source-scan.ts` | `providerClientImporters()`, `taxonomySeedProblems()`, `strayNotificationWriters()`; each throws rather than report an absence it did not measure |
| `tests/at/suites/req-016/_mail-witness.ts` | `messagesAddressedTo(addresses)` reads Mailpit's search and raw source per message; counts physical messages, keyed only on the catcher's own storage id, never on `Message-ID` |
| `tests/at/suites/req-016/_integration.ts` | `assertEmitterIsSoleWriter` (the arms shared by both tiers), `at01601` (Mailpit as the provider-side trace), `at01608` (refuses by name) |
| `tests/at/suites/req-016/_live.ts` | the integration binding: SQL outbox scoped to the open world's actors, the product SMTP provider on the config's port, SQL directory, world provisioning through the admin API and operator SQL, named refusals |
| `tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts` | AT-016.01 is a per-tier map; its first assertion is the suite's own oracle at both tiers; AT-016.02 stays single and additionally asserts `taxonomySeedProblems()` |
| `tests/at/suites/req-016/b-delivery-defaults.test.ts` | AT-016.08 is a per-tier map whose integration body refuses by name |
| `tests/at/harness/conformance.selftest.ts` | the no-live-adapter example is `req-999`; `req-016` is now asserted to have one |
| `tests/at/harness/live-refusal.selftest.ts` | plants a disposable suite `req-999` under `AT_REPO_ROOT` and spawns vitest on it; three ids, same refusal string, same rule |
| `tests/at/expected/req-016.json` | twelve green at loop; AT-016.01 and AT-016.02 green at integration; every other id red on the name the adapter throws |
| `supabase/functions/_shared/notification-provider.ts` | the connection race fix described above |

## The capability names the live adapter throws

| id | red at integration on | thrown by |
|---|---|---|
| AT-016.03, .04, .05, .06, .12 | `vendors.email` | the harness's refusing vendor proxy, reached by the shared evidence capture after the first row fires and drains |
| AT-016.07 | `faults.processRestart` | the adapter's fault seam |
| AT-016.08 | `fixtures.world.burstThreadComments` | the integration procedure in `_integration.ts`, and the live world's method |
| AT-016.09 | `faults.at` | the adapter's fault seam, after a full control run of the first guarded row |
| AT-016.10 | `fixtures.world.reassignRole` | the live world's method |
| AT-016.11 | `vendors.email` | the harness's refusing vendor proxy |

The sentinel scope `notifications.delivery_bodies` is registered and its read throws
`sentinels.scan`; no body calls it. See deviations.

## Deviations from the design, and design-versus-tree findings

1. **AT-016.08 gains an integration procedure in unit 1.** The design says every later unit's
   method throws `CapabilityPending` naming itself and the manifest declares each id red on that
   name. That holds for every id but one. AT-016.08's loop body calls `h.clock.freezeAt` before it
   reaches any adapter method, and above loop the clock is `RealClock` with `now()` only, so the
   first failing call is a `TypeError`, a red no declaration can describe and `--expect` would
   fail on. The fix is the auth suite's own precedent: a per-tier map whose integration body opens a
   world and throws `CapabilityPending(['fixtures.world.burstThreadComments'])`. Unit 4 replaces it
   with the real procedure. This touches `b-delivery-defaults.test.ts`, which the brief did not list
   for unit 1.
2. **The drain has no "until a pass changes nothing" stop.** Candidate D says `drain()` runs until
   nothing is pending or retrying, or until a pass changes nothing. `tests/at/harness/vendors.selftest.ts`
   ("reaches quiescence across consecutive forced rejections on ONE default drain") arms three
   rejections and asserts one default drain ends in `['rejected', 'rejected', 'rejected', 'accepted']`.
   Any definition of "changes nothing" that stops after a pass with no acceptance fails that
   selftest, and a definition that counts an attempts bump as a change never fires. The drain runs
   to quiescence, exactly as the contract's own comment argues. The consequence, stated plainly: at
   the integration tier a provider that never answers would make `drainDeliveries()` spin until
   vitest's 30 second timeout. That is a bounded red with an obvious cause, not a false green.
3. **The live sentinel scope cannot be a SQL read.** `AdapterSentinelSeam.read` is synchronous and
   the design's "read as `select body from public.notification_deliveries`" is not. Without a
   harness change, which this item does not make, the live adapter registers the scope and its read
   throws `CapabilityPending(['sentinels.scan'])`. No body scans; AT-016.01 plants and then reads
   delivery bodies through `sut.deliveries()`, which is what the design's witness column describes.
4. **The mail witness scopes by address, so the world exposes its addresses.** The design says
   messages are scoped to the world's namespaced addresses but rejects exposing the witness on the
   world. The body has to know the addresses from somewhere, and `WorldOf<'req-016'>` derives from
   the loop world class. So `World` and both world classes gain `addresses: Record<Role, string>`,
   data the directory already holds, alongside `actors`. Both bindings supply real values.
5. **The capture ids are red on a harness name, not an adapter name.** The brief asks that every
   other id be red on exactly the names the live adapter throws. For AT-016.03, .04, .05, .06 and .12
   the first refusal is the harness's `vendors.email`, because every adapter method the capture
   producer calls before it is spine and works. The manifest declares what the run produces. Unit 2's
   integration capture retires this.
6. **The fault branch and the sequence bump are landed, not deferred.** Said above; stated here
   because the brief asked which I chose.
7. **`strayNotificationWriters()` covers inserts into the three outbox tables only.** The seed of
   `notification_event_types` and the fixture ledger's upsert are inserts into
   `public.notification_` tables that are not the outbox, and the worker's `update` is a state
   change, not a creation. The oracle's own comment says so.

## Environment findings, not tree findings

- **The stack had not been restarted after the config commit.** Port 44325 was closed when this
  lane started. `bun run db:stop` then `bun run db:start` opened it. Their output is in the
  scratchpad only and is not quoted anywhere.
- **The gateway went stale on the first auth-suite integration run.** Every signup and admin-user
  call answered 502. Cause, measured from inside the Kong container: Kong had resolved the auth
  container to `172.18.0.6` at start; the runner's `db reset` restarted auth, which came back on
  `172.18.0.8`; Kong kept the stale address. Auth's old address was being taken by the `vector`
  container, which crash-loops on this machine because `[analytics] enabled = true` makes the CLI
  run it with `DOCKER_HOST=http://host.docker.internal:2375`, and nothing listens there (Docker
  Desktop's "expose daemon on tcp://localhost:2375" is off). Every reset therefore has a chance of
  swapping auth's address under the gateway. I restarted the Kong container to clear the cache and
  tried the run with `vector` stopped; the runner refuses to reset while a stack service is stopped
  (exit 3, shown below), so `vector` was started again and the run launched when its restart
  backoff was long. This is a machine setting for the founder, not something this tree can fix.

## Every command and its exact output

Commands were run through PowerShell; the leading PowerShell `NativeCommandError` banner that
wraps a native command's stderr is stripped from the quotes below, nothing else is.

### `bun run typecheck` (final tree)

```
=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
exit 0
```

Before the provider fix, the same command reported:

```
=== typecheck: acceptance tests (tests/at/tsconfig.json) ===
supabase/functions/_shared/notification-provider.ts(205,14): error TS2339: Property 'close' does not exist on type 'never'.
tests/at/tsconfig.json: tsc exited 2
typecheck FAILED: tests/at/tsconfig.json
```

### `bun run at:check req-016`

```
at:check req-016 — 12 P0 in the acceptance file, 12 registered in the suite
RESULT: 12 P0 ids in bijection
exit 0
```

### `bun run at:selftest` (final tree)

```
 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-89/tests/at

 Test Files  19 passed (19)
      Tests  293 passed (293)
   Start at  22:25:45
   Duration  9.84s (transform 3.01s, setup 0ms, import 4.08s, tests 22.58s, environment 2ms)
exit 0
```

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

Repeated on the final tree after the last commit, same verdict lines.

### `bun run at:verify req-016 --tier integration --expect`

Run on the tree that became commit `d21777f`, after the stack restart.

```
at:verify — identity proven before the readiness wait: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — identity proven immediately before the reset: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — 15 migrations expected, 15 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head f0cc1ee, dirty
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-cmf18D/vitest-report.json

at:verify req-016 --tier integration
  AT-016.01    green    the one shared emitter is the sole writer; blockers/scope/lifecycle hold no direct send path
  AT-016.02    green    registered events equal the taxonomy exactly, are immutable, and carry no CR/scope-change event
  AT-016.03    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.04    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.05    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.06    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.07    red      CapabilityPending: CAPABILITY PENDING — faults.processRestart
  AT-016.08    red      CapabilityPending: CAPABILITY PENDING — fixtures.world.burstThreadComments
  AT-016.09    red      CapabilityPending: CAPABILITY PENDING — faults.at
  AT-016.10    red      CapabilityPending: CAPABILITY PENDING — fixtures.world.reassignRole
  AT-016.11    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.12    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  12 P0: 2 green, 10 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89\tests\at\expected\req-016.json exactly (2 declared green, 10 declared red)
```

Re-run by the lead on the final committed tree, after the environment fix below, on a stack with no
crash-looping service:

```
at:verify req-016 --tier integration
  AT-016.01    green    the one shared emitter is the sole writer; blockers/scope/lifecycle hold no direct send path
  AT-016.02    green    registered events equal the taxonomy exactly, are immutable, and carry no CR/scope-change event
  AT-016.03    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.04    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.05    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.06    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.07    red      CapabilityPending: CAPABILITY PENDING — faults.processRestart
  AT-016.08    red      CapabilityPending: CAPABILITY PENDING — fixtures.world.burstThreadComments
  AT-016.09    red      CapabilityPending: CAPABILITY PENDING — faults.at
  AT-016.10    red      CapabilityPending: CAPABILITY PENDING — fixtures.world.reassignRole
  AT-016.11    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  AT-016.12    red      CapabilityPending: CAPABILITY PENDING — vendors.email
  12 P0: 2 green, 10 red, 0 missing
  EXPECTED: the run matches tests\at\expected\req-016.json exactly (2 declared green, 10 declared red)
exit 0
```

### `bun run at:check req-001`

```
at:check req-001 — 38 P0 in the acceptance file, 38 registered in the suite
RESULT: 38 P0 ids in bijection
exit 0
```

### `bun run at:verify req-001 --tier loop --expect`

```
at:verify req-001 --tier loop
  38 P0: 33 green, 5 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89\tests\at\expected\req-001.json exactly (33 declared green, 5 declared red)
exit 0
```

The per-id lines match the manifest; the first run printed all thirty-eight and they are not
repeated here.

### `bun run at:verify req-001 --tier integration --expect`

First attempt, right after the stack restart. Every signup and admin-user call answered 502 for
the reason in the environment section. Verdict lines:

```
at:verify req-001 --tier integration
  38 P0: 1 green, 37 red, 0 missing
  DEVIATION: AT-001.01 — declared green, reported red: Error
  DEVIATION: AT-001.04 — declared red as capability-pending, reported a red of a different shape. expected: "CapabilityPending: CAPABILITY PENDING — sut.accounts.registerWithProvider" actual: "Error: the live signup for a fresh address answered 502"
  (thirty-one more lines of the same two shapes, `the live signup for a fresh address answered 502` and `provisioning a platform administrator answered 502`)
  EXPECT FAILURE: 33 deviation(s) from the declaration. A red that turned green is a failure too — if reality improved, update the declaration in the same change.
error: script "at:verify" exited with code 1
exit 1
```

Gateway evidence from inside the Kong container at that time:

```
2026/09/08 19:20:14 [error] 1110#0: *265 connect() failed (111: Connection refused) while connecting to upstream, client: 172.18.0.1, server: kong, request: "POST /auth/v1/signup HTTP/1.1", upstream: "http://172.18.0.6:9999/signup", host: "127.0.0.1:44321"
```

with `docker inspect` reporting auth at `172.18.0.8`, `getent hosts` inside Kong resolving the auth
name to `172.18.0.8`, and `wget` from inside Kong to `172.18.0.8:9999/health` answering GoTrue's
health JSON.

Second attempt, with `vector` stopped:

```
at:verify req-001 --tier integration — INFRASTRUCTURE: REFUSING TO RESET poancmeitlmxejofwzuu: the stack did not report its status — the stack reports stopped services: supabase_vector_poancmeitlmxejofwzuu — start them before running the suite. Nothing was done.
error: script "at:verify" exited with code 3
exit 3
```

Third attempt, with `vector` started again and the run launched right after one of its restarts:
the lane never got a verdict and stopped waiting on the restart backoff. The lead took the run over,
reproduced the same failure once, then fixed the cause rather than retrying around it. See the
section below.

Fourth attempt, by the lead, on a stack with no crash-looping service:

```
at:verify req-001 --tier integration
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
  EXPECTED: the run matches tests\at\expected\req-001.json exactly (27 declared green, 11 declared red)
exit 0
```

Only the last sixteen verdict lines are quoted; the run printed all thirty-eight and every one matched
the declaration.

This run is the posture evidence for the five new tables and the three new definers. AT-001.21, .22,
.23 and .40 call `sut.tenantTableFacts()`, which reads `pg_class`, `has_table_privilege` for seven
privileges across the three client roles, `relrowsecurity`, `relforcerowsecurity`, `pg_policies` and
`has_function_privilege` for every `SECURITY DEFINER` function, and asserts catalog equality in both
directions. The static scan runs in CI; this is the live check, and CI never runs it.

## The environment fix, by the lead

The lane's diagnosis was right and the lead reproduced it once before acting: a run with every one of
the thirty-seven reds reading `answered 502`, none of them notification-specific.

The cause is in the section above. The fix is two lines and one of them is an allowlist entry.

`supabase/config.toml` sets `[analytics] enabled = false`. The CLI runs that service's `vector`
container with `DOCKER_HOST` pointed at `http://host.docker.internal:2375`, and Docker Desktop only
listens there when its unauthenticated TCP daemon is on, which it is not and should not have to be.
So the container crash-loops, and a container restarting every few seconds keeps taking and releasing
addresses on the docker network until the gateway is holding a stale one for auth. Nothing in this
repository reads the analytics service. No test, no workflow and no script names it, its container or
its port. The reason is written in full beside the switch.

`tests/at/harness/local-stack.ts` adds `analytics` and `vector` to `DISABLED_SERVICES`. That regular
expression already existed for exactly this case, `imgproxy` and `pooler`, which `supabase status`
also reports as stopped because the config turns them off. The readiness check needed the two new
names or it refused to reset. This adds no mechanism. Its comment says plainly that the list is an
allowlist of services the config disables and never a list of failures to tolerate.

`at:selftest` passes 293 tests over 19 files on the changed harness.

## What unit 1 does not deliver, unchanged

No taxonomy matrix payloads beyond the sample table, no evidence capture at integration, no
anti-spam guard at integration, no fault arming seam in the adapter, no provider fault decorator,
no Mailpit idempotent replay, no `src/` change, no function directory, no `WRITE_ROUTES` row.

## The largest risk handed to unit 2

The integration capture fires all forty-eight rows in one world and drains after each, and every
email row is a real SMTP round trip to Mailpit plus a Mailpit read. `abandonment.released` resolves
`ex_volunteer` from the world's own record, which the directory already does, but nothing has yet
fired a row whose recipient is the ex-volunteer against the stack, and nothing has yet measured the
time forty-eight fires and drains take under vitest's 30 second default. Unit 2 should measure
before it writes, and budget the capture's producer id with `timeoutMs` if it needs to.
