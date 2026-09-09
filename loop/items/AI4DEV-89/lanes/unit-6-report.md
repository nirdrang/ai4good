# Unit 6 report: sent only on provider acceptance, retried, never duplicated

Written as the work proceeds. This file is the record if the runner discards the final message.

Writer lane for unit 6 of item AI4DEV-89. Working directory
`C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-89`, branch
`nirdrang/ai4dev-89-emitter-core-and-static-taxonomy-d1`, started at `b331439`.

## Plan

1. Reuse the crash switch for the provider point, with kinds `reject` and `lose_ack`.
2. Wrap the live SMTP provider: idempotent Mailpit replay inside, provider-fault decorator outside.
3. Record every provider-side outcome on the adapter. The catcher cannot see a rejection.
4. Write the AT-016.11 integration procedure. Arm through `h.faults.at`, not `h.vendors`.
5. Flip AT-016.11 green in the manifest in the same commit that changes what runs.
6. Verify: typecheck, at:check, at:selftest, both req-016 tiers, both req-001 tiers. Integration twice.

The retry must physically reach the provider. A stored receipt must not skip that call.

## Commits, oldest first

- (pending) the provider fault decorator, Mailpit replay, AT-016.11 procedure, manifest flip,
  and this report. SHA filled after the commit.

## Files created or changed

| path | what changed |
|---|---|
| `tests/at/suites/req-016/_fault-switch.ts` | the switch takes the kinds it implements; `openLedger` receives the kind |
| `tests/at/suites/req-016/_provider-faults.ts` | new. provider-fault decorator, Mailpit idempotent replay, the adapter's attempt log |
| `tests/at/suites/req-016/_live.ts` | stacks replay inside the decorator; arms `notifications.provider_send` |
| `tests/at/suites/req-016/_integration.ts` | AT-016.11 procedure |
| `tests/at/suites/req-016/c-reliability-guard.test.ts` | AT-016.11 is a per-tier map; loop body unchanged as `default` |
| `tests/at/expected/req-016.json` | AT-016.11 green at integration |
| `loop/items/AI4DEV-89/lanes/unit-6-report.md` | this report |

## What already existed, verified against the tree before writing

- `_fault-switch.ts` is generic over its ledger and refuses any kind but `crash`. The provider
  point needs `reject` and `lose_ack`, so the switch gains the list of kinds it implements. The
  loop binding still passes nothing and still implements only `crash`.
- `_live.ts` lists `notifications.provider_send` in `points()` and throws
  `CapabilityPending(['faults.at'])` when that point is armed.
- `createSmtpProvider` already stamps `X-Notification-Key` and the pair headers. It does not
  ask Mailpit whether the key already arrived.
- `_mail-witness.ts` counts physical messages, keys on the catcher's storage id, and parses
  `x-notification-key`. The replay and the procedure both use it.
- The durable columns `accepted_at` and `provider_receipt` are written only when
  `apply_delivery_results` sees `outcome = 'accepted'`. The lost-ack decorator returns `no_ack`
  with a null receipt, so those columns stay empty on that attempt. They are not the lost-ack
  mechanism.
- AT-016.11's loop body drives `h.vendors.email`. Above loop that proxy is the declared red
  `vendors.email`. AT-016.12 is already green.

`loop/items/AI4DEV-89/decisions.tsv` is modified in the worktree and is not this unit's. Left
alone.

## The mechanism

Two wrappers around the product SMTP module, stacked in `_live.ts`:

```
core -> provider-fault decorator -> Mailpit idempotent replay -> createSmtpProvider
```

**The decorator** reuses `createCrashSwitch` with kinds `reject` and `lose_ack`. One arming
forces one outcome. `reject` does not call the inner provider. `lose_ack` does call it, then
answers `no_ack` with a null receipt, so `apply_delivery_results` cannot write `accepted_at` or
`provider_receipt` and cannot mark the row sent. The next pass therefore calls the provider
again. That is the binding constraint: the lost-ack trace is exactly `['ack_lost', 'accepted']`,
two attempts.

**The replay** asks `_mail-witness.ts` whether a physical message carrying this idempotency key
already exists. If one does it answers `accepted` and sends nothing. SMTP has no idempotency;
this is the live binding's stand-in for it. It is not a stored receipt on the delivery row.

**The attempt log** lives in `_provider-faults.ts`. Every `deliver` records recipient, event,
channel, and the test-facing outcome (`rejected` / `ack_lost` / `accepted`). `accepted()` keeps
the first physical acceptance per identity, including the lost-ack send, and drops replays, which
is the simulator's shape. The integration procedure reads this log the way the loop body reads
`h.vendors.email.attempts()`.

The integration procedure arms through `h.faults.at('notifications.provider_send', kind)`,
drains one pass, clears, then drains to quiescence, for both clauses. A run-to-quiescence drain
would hide the unconfirmed state.

## Evidence: one witness for outcomes, one for physical messages

Unit 5's two-witness rule was for a fault the database records. This fault is induced by the
adapter. There is no sequence analogue.

- **Outcomes** rest on the adapter's attempt log. One witness. It would be wrong if the decorator
  recorded a sequence it did not perform: logged `rejected` while still sending, logged
  `ack_lost` without calling the inner provider, or logged `accepted` without a retry reaching
  the port.
- **Physical messages** rest on the catcher, read by `_mail-witness.ts`, keyed on Mailpit's
  storage id, never collapsed. After the reject pass the catcher holds zero messages for that
  event. After each retry it holds exactly one message per idempotency key. Two events, two
  keys, count 1 each. That is the second witness, and it is for the duplicate claim, not for
  the outcome sequence.
- **Pair binding** is on the same attempt log: every provider attempt for both access events
  names the volunteer on email. In-app never reaches the provider.

An invented second outcome witness (for example pretending the catcher saw a rejection) would
be a lie. The catcher cannot see a rejection.

## Manifest changes

- **AT-016.11** moves from red on `vendors.email` to green at the integration tier. Reason: the
  live adapter arms the provider point, the procedure no longer reads `h.vendors`, and the first
  integration run below reports it green.
- **AT-016.12** stays green. Re-verified, not re-earned. No first-refusal name changed.

The loop tier is unchanged: twelve green.

## Deviations from the design

1. **Both wrappers live in one suite-local file**, `_provider-faults.ts`. The design names them
   as two deliverables. They are both `ProviderPort` wrappers the live adapter stacks, and the
   replay uses the existing mail witness rather than a second Mailpit client. No harness file
   changed.
2. **`createCrashSwitch` gained an `implemented` kinds list** rather than a second switch
   module. The brief said to reuse the pattern. The loop binding still defaults to `crash` only,
   so the conformance selftest that arms `lose_ack` at the emit point still refuses.
3. **The attempt log is module-scoped inside `_provider-faults.ts`**, reset when a live adapter
   is built. The integration procedure imports the reader. Importing `_live.ts` from
   `_integration.ts` would pull the SQL client into the loop tests.

## Environment

The Docker engine and the local stack were already running. Edge runtime
`supabase_edge_runtime_poancmeitlmxejofwzuu` stayed up. Restart count: 0. No `db:start`, no
`db:stop`, no Docker Desktop action. Slot containers were ignored. No extra SQL client.

## Every command and its exact output

Commands were run through PowerShell from the worktree root. The leading `NativeCommandError`
banner PowerShell wraps around a native command's stderr is stripped from the quotes below,
nothing else is.

### `bun run typecheck`

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

### `bun run at:selftest`

```
 Test Files  19 passed (19)
      Tests  293 passed (293)
   Start at  13:52:35
   Duration  7.83s (transform 2.25s, setup 0ms, import 3.36s, tests 18.79s, environment 2ms)
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

### `bun run at:verify req-016 --tier integration --expect`, run one (uncommitted tree, head b331439 dirty)

```
at:verify — identity proven before the readiness wait: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — identity proven immediately before the reset: project poancmeitlmxejofwzuu, api 44321, db 44322, containers supabase_imgproxy_poancmeitlmxejofwzuu, supabase_analytics_poancmeitlmxejofwzuu, supabase_vector_poancmeitlmxejofwzuu, supabase_pooler_poancmeitlmxejofwzuu
at:verify — 15 migrations expected, 15 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — stack poancmeitlmxejofwzuu (api 44321) — reset OK — migrations: 15 expected, 15 applied — lock C:\Users\nirdr\AppData\Local\ai4good-build\at-locks\at-verify-poancmeitlmxejofwzuu-44321.lock — head b331439, dirty
JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-Qa5Isa/vitest-report.json

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
exit 0
elapsed 49 s
```

### remaining commands

req-016 integration run two, req-001 loop, req-001 integration: not yet run. They follow the
commit of the green tree.
