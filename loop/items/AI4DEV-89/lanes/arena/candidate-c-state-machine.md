I have the suite, the posture gates, and the stand-in. The rest of this answer is the design.

### Direction

This design treats every delivery as a row that occupies exactly one named state. The occupancy table, the legal-transition catalog, and the receipt table are the product. The emitter only inserts the birth rows. The worker is the only function that may change occupancy. Units four, five, and six (one delivery per pair, atomic write, sent only on acceptance) then follow from constraints rather than from reviewer discipline.

### The data shape

The organising structure is a state machine in Postgres, with a closed taxonomy table as the only event vocabulary the machine will accept.

The 48 taxonomy rows live in `public.notification_taxonomy`. They do not live in a TypeScript registry as the source of truth. A TypeScript module still renders bodies and lists senders, and the suite file `tests/at/suites/req-016/taxonomy.ts` remains the specification oracle. AT-016.02 is the bijection. This choice buys foreign keys and check constraints on event names. It costs a second listing of the 48 names in the migration. Drift fails AT-016.02 rather than failing silently.

#### Closed vocabulary

`public.notification_channel` as `'email' | 'inapp'`.

`public.notification_role` as `'ngo' | 'volunteer' | 'ex_volunteer' | 'platform_admin'`.

`public.notification_tone` as `'normal' | 'low'`.

`public.notification_class` as `'money' | 'deadline' | 'blocker' | 'completion' | 'decision' | 'access' | 'lowtone' | 'other'`.

`public.notification_delivery_state` as `'pending' | 'retrying' | 'sent' | 'failed'`.

These four states are the contract in `_contract.ts`. There is no public `claimed` state. A worker pass locks a row. It does not mint a fifth state.

#### Taxonomy table

`public.notification_taxonomy`

| Column | Invariant |
|---|---|
| `event` text PK | one of the 48 wire names |
| `recipients` `notification_role[]` not null | non-empty |
| `named_channels` `notification_channel[]` null | null means the row binds to the documented default |
| `effective_channels` `notification_channel[]` not null | the documented default, always populated |
| `tone` | matches the suite row |
| `class` | matches the suite row |
| `ops_item` boolean not null default false | true for the three ops rows |
| `escalation` boolean not null default false | true for `lovable.credits_blocked` |
| `guarded` boolean not null default false | true for the eleven AT-016.09 rows |
| `default_source` text not null | `btrim(default_source) <> ''` |

Checks on this table.

- `effective_channels` is non-empty.
- If `named_channels` is not null, `effective_channels = named_channels`.
- If `class` is `money`, `deadline`, `blocker`, `completion`, or `decision`, then `'email' = any(effective_channels)`.
- If `class` is `lowtone`, then `effective_channels = '{inapp}'`.

An illegal documented default cannot be inserted. AT-016.05 and AT-016.06 read this table as data.

#### Event and delivery identity (no state column)

`public.notification_events`

| Column | Invariant |
|---|---|
| `id` uuid PK | minted after the fault point |
| `event` text not null | FK to `notification_taxonomy(event)` |
| `recipients` jsonb not null | frozen at insert, shape `[{role, recipientId, channels}]` |
| `payload` jsonb not null | named keys present |
| `attempts` integer not null default 0 | `attempts >= 0` |
| `created_at` timestamptz not null | |

There is no `state` column. Event state is a view. An event is `sent` when every child occupancy is `sent`. It is `retrying` when any child is `retrying`. It is `pending` otherwise. `failed` is reserved and unused in v1. A writer cannot store `sent` on an event that still has a pending child.

`public.notification_deliveries`

| Column | Invariant |
|---|---|
| `id` uuid PK | |
| `event_id` uuid not null | FK to `notification_events` |
| `event` text not null | denormalised wire name, FK to taxonomy |
| `role` `notification_role` not null | |
| `recipient_id` uuid not null | the holder at creation |
| `channel` `notification_channel` not null | |
| `emitted_by` text not null | check equals `'notifications.emitter'` |
| `payload` jsonb not null | |
| `body` text not null | rendered copy |

Unique `(event_id, recipient_id, channel)`. That unique is the pair identity AT-016.07 counts. A retry cannot insert a second pair row. The worker never inserts into this table.

#### Occupancy (the state row)

`public.notification_delivery_occupancy`

One row per delivery. Primary key `delivery_id` references `notification_deliveries(id)`. Moving state is delete plus insert of this row, in one transaction, with a matching transition log row.

| Column | Invariant |
|---|---|
| `delivery_id` uuid PK | |
| `channel` `notification_channel` not null | copied at birth, so checks can see it |
| `state` `notification_delivery_state` not null | |
| `process_id` text | the delivery process that last advanced this row |
| `receipt_id` uuid | FK to `notification_provider_receipts`, nullable |
| `delivered_by_process` text | null until the sent occupancy is inserted |

Checks on occupancy. These make illegal states unrepresentable.

- `pending` implies `process_id` is null, `receipt_id` is null, `delivered_by_process` is null.
- `retrying` implies `delivered_by_process` is null.
- `sent` implies `delivered_by_process` is not null.
- `sent` and `channel = 'email'` implies `receipt_id` is not null.
- `sent` and `channel = 'inapp'` implies `receipt_id` is null.
- `failed` implies `delivered_by_process` is not null. No writer inserts `failed` in v1.

Lost acknowledgment is representable. Occupancy may be `retrying` with a non-null `receipt_id`. That is the durable fact "the provider already accepted, the sent mark did not commit". The next worker pass sees the receipt and inserts `sent` without a second SMTP call.

#### Legal transitions (illegal pairs unrepresentable)

`public.notification_delivery_legal_transitions`

Primary key `(from_state, to_state, channel)`. `from_state` is nullable for birth.

Seeded rows.

| from_state | to_state | channel | Meaning |
|---|---|---|---|
| null | `pending` | `email` | birth, emitter only |
| null | `pending` | `inapp` | birth, emitter only |
| `pending` | `sent` | `inapp` | in-app never reaches a provider |
| `pending` | `retrying` | `email` | first unaccepted send |
| `pending` | `sent` | `email` | first send accepted in the same pass |
| `retrying` | `retrying` | `email` | another unaccepted send |
| `retrying` | `sent` | `email` | accepted, or a prior receipt found |

There is no row `(pending, sent, email)` that skips a receipt. The occupancy check still demands `receipt_id` for email `sent`. There is no row that moves `sent` to anything. `sent` is terminal. There is no row into `failed` in v1. There is no in-app path into `retrying`.

`public.notification_delivery_transitions` is append-only.

| Column | Invariant |
|---|---|
| `id` uuid PK | |
| `delivery_id` uuid not null | |
| `seq` bigint not null | per-delivery monotonic |
| `from_state` | |
| `to_state` not null | |
| `channel` not null | |
| `process_id` text | |
| `receipt_id` uuid | |
| unique `(delivery_id, seq)` | |
| FK `(from_state, to_state, channel)` | to the legal catalog |

A pair that is not in the catalog cannot be inserted. A before-insert trigger copies the current occupancy state into `from_state` and refuses a mismatch. That is the one trigger that enforces continuity. The catalog is the constraint that enforces legality.

Append-only is the same pattern as `public.audit_events`. A before-update-or-delete row trigger raises. A before-truncate statement trigger raises.

#### Receipts and attempts (the idempotency key)

`public.notification_provider_receipts`

| Column | Invariant |
|---|---|
| `id` uuid PK | |
| `event_id` uuid not null | |
| `recipient_id` uuid not null | |
| `channel` `notification_channel` not null | check equals `'email'` |
| `message_id` text not null | SMTP `Message-ID`, unique |
| `accepted_at` timestamptz not null | |
| unique `(event_id, recipient_id, channel)` | **the idempotency key** |

The key is the same triple the loop simulator uses (`JSON.stringify([eventId, recipientId, channel])`). It lives in this table, not in worker memory. A process restart re-reads it. A lost acknowledgment leaves this row in place and leaves occupancy at `retrying`.

`public.notification_provider_attempts` is append-only.

| Column | Invariant |
|---|---|
| `id` uuid PK | |
| `event_id`, `recipient_id`, `channel` | |
| `process_id` text not null | |
| `outcome` text | check in `'accepted' \| 'rejected' \| 'ack_lost'` |
| `occurred_at` timestamptz | |

This table is the integration-tier replacement for `h.vendors.email.attempts()`. Mailpit is the out-of-band witness for physical mail. The attempts table is the outcome trace, including `rejected` and `ack_lost`, which Mailpit cannot store.

#### Ops, fault, fixture, guard

`public.ops_items` (`id`, `kind` text not null, `linked_event_id` uuid unique references `notification_events`, `detail` jsonb). Inserted only by the emitter, and only when `notification_taxonomy.ops_item` is true.

`public.notification_fault_armings` (`point` text PK, `kind` text check in `'crash' \| 'reject' \| 'lose_ack'`). Written by the live adapter with operator SQL. Read by product functions. Unreachable by client roles.

Sequence `public.notification_fault_triggers`. `nextval` survives rollback. That is the trigger count.

`public.notification_fixture_ledger` (`event` text PK, `committed` boolean not null). The fixture producer writes this before the fault point. AT-016.09 reads it through `world.transitionCommitted`.

`public.notification_fixture_bindings` (`role` `notification_role` PK, `account_id` uuid not null). Recipient resolution at emit time reads this map. `reassignRole` updates it after emit. Frozen delivery rows do not change.

`public.notification_guard_config` (single row. `cap` int, `window_ms` int, `coalesce` boolean). `public.notification_comment_windows` (`recipient_id`, `window_start`, `count`, `coalesced`).

#### What is unrepresentable, not merely forbidden

- Two occupancy rows for one delivery (primary key).
- A second delivery for the same pair (unique on identity).
- `emitted_by` other than `'notifications.emitter'` (check).
- An unregistered event on an event row (FK to taxonomy).
- Email `sent` with no receipt (occupancy check).
- In-app row that carries a receipt (occupancy check).
- `pending` that already has a process stamp (occupancy check).
- `sent` → anything (no legal-transition row, and the log FK).
- In-app `retrying` (no legal-transition row).
- A documented default that breaks the class channel rule (taxonomy checks).
- An implicit default with empty `default_source` (taxonomy check).
- Two ops items for one event (`linked_event_id` unique).
- A second provider acceptance for one pair (receipt unique).

`failed` is representable and unused. No legal-transition row points at it in v1.

### The design

#### Module map

Create.

- `supabase/migrations/20260913120000_notification_taxonomy_and_delivery_machine.sql`
- `supabase/functions/_shared/notifications.ts` (pure. senders, body render, documented-default mapping, worker decision over ports. no Deno, no fetch, no clock)
- `supabase/functions/_shared/notification-smtp.ts` (SMTP client. this is the provider-client import AT-016.01's source scan must find, mapped to `notifications.emitter`)
- `tests/at/suites/req-016/_live.ts`
- `tests/at/suites/req-016/_live-world.ts` (actor provisioning, fire, reassign, burst)
- `tests/at/suites/req-016/_source-scan.ts` (suite-local provider-importer oracle, same shape as `tests/at/suites/req-001/_source-scan.ts`)
- `tests/at/suites/req-016/_integration.ts` (per-tier bodies)

Change.

- `tests/at/suites/req-001/_policy-scan.ts` (`TENANT_CATALOG` rows for every new table)
- `tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts` (per-tier map for AT-016.01)
- `tests/at/suites/req-016/b-delivery-defaults.test.ts` (per-tier map for AT-016.08)
- `tests/at/suites/req-016/c-reliability-guard.test.ts` (per-tier map for AT-016.11)
- `tests/at/suites/req-016/d-taxonomy-evidence.test.ts` (per-tier map for the capture ids)
- `tests/at/expected/req-016.json` (each id moves to green in the same commit that makes it pass)
- `supabase/config.toml` (uncomment `smtp_port = 44325`)
- `tests/at/suites/req-016/_contract.ts` only if the live world needs `pinThreadGuard`. Loop `burstThreadComments` keeps reading `h.config`. Integration cannot. See unit 4.

Do not create a `supabase/functions/<name>/index.ts` for the worker. A new function directory that reaches the database and is not a `WRITE_ROUTES` edge row fails `write-route-unregistered`. The worker is a definer plus a pure module. The live adapter calls both. Do not change `tests/at/harness/index.ts`. `h.static` stays a refusing proxy.

#### Posture for every table

Every `create table public.X` starts with `revoke all on table public.X from anon, authenticated, service_role`, then `alter table public.X enable row level security`. No `force row level security`. End the migration with `notify pgrst, 'reload schema'`.

Catalog rows, all added in the same change as the migration.

| Table | Posture | Grants | Policies |
|---|---|---|---|
| `notification_taxonomy` | unreachable-by-client-roles | none | none |
| `notification_events` | unreachable-by-client-roles | none | none |
| `notification_deliveries` | tenant-isolated | `grant select to authenticated` | `for select to authenticated using (recipient_id = (select auth.uid()))` |
| `notification_delivery_occupancy` | unreachable-by-client-roles | none | none |
| `notification_delivery_legal_transitions` | unreachable-by-client-roles | none | none |
| `notification_delivery_transitions` | unreachable-by-client-roles | none | none |
| `notification_provider_receipts` | unreachable-by-client-roles | none | none |
| `notification_provider_attempts` | unreachable-by-client-roles | none | none |
| `ops_items` | unreachable-by-client-roles | none | none |
| `notification_fault_armings` | unreachable-by-client-roles | none | none |
| `notification_fixture_ledger` | unreachable-by-client-roles | none | none |
| `notification_fixture_bindings` | unreachable-by-client-roles | none | none |
| `notification_guard_config` | unreachable-by-client-roles | none | none |
| `notification_comment_windows` | unreachable-by-client-roles | none | none |

`notification_deliveries` is tenant-isolated now so the later in-app screen can read as the caller. This run does not add that screen. `sut.deliveries()` uses operator SQL and bypasses RLS. The policy is still required by `isolated-no-policy` and `policy-using-no-auth`.

`service_role` holds no table write (`service-role-write` in the static scan, live catalog pins `[]` except `accounts` and `org_memberships`). Do not add these tables to `SERVICE_ROLE_SELECT`.

#### Definers

All `security definer`, `set search_path = ''`, `revoke execute from public`.

`public.emit_notification(p_event text, p_payload jsonb)`  
No grant to `service_role`, `anon`, or `authenticated`. Only other definers call it. `scanWriteGateSql` demands `assert_account_active` only when `service_role` may execute a volatile definer. This function is not in that set.

Behaviour.

1. Look up `p_event` in `notification_taxonomy`. Missing row raises, nothing is written.
2. Set `app.notification_emit = '1'` for the transaction.
3. Resolve recipients from `notification_fixture_bindings` now. Real producers later pass the same bindings from org seat, project assignee, and admin account. Freeze the array onto the event.
4. Insert `notification_events`.
5. For each recipient-and-`effective_channels` pair, insert `notification_deliveries` with `emitted_by = 'notifications.emitter'`, insert occupancy `pending`, insert birth transition `(null, pending, channel)`.
6. If `ops_item`, insert `ops_items` with `kind = p_event`.
7. Return the event id.

`public.notification_fault_point()`  
No grant to client roles. Producers call it.

```
perform nextval('public.notification_fault_triggers');
if exists (
  select 1 from public.notification_fault_armings
   where point = 'notifications.between_transition_and_event_write'
     and kind = 'crash'
) then
  raise exception 'induced fault: crash at notifications.between_transition_and_event_write'
    using errcode = 'XX001',
          detail = 'induced-fault:notifications.between_transition_and_event_write';
end if;
```

The `nextval` is outside the raise. Rollback does not undo it.

`public.fire_notification_fixture(p_event text, p_payload jsonb)`  
This is a fixture producer. It is not a real Stripe, gateway, or lifecycle writer.

```
insert into public.notification_fixture_ledger(event, committed)
values (p_event, true)
on conflict (event) do update set committed = true;
perform public.notification_fault_point();
return public.emit_notification(p_event, p_payload);
```

No grant to `service_role`. The live adapter calls it with operator SQL.

A real producer later looks like this, in that requirement's migration, and does not change `emit_notification`.

```
-- ledger or state writes for payment.succeeded
perform public.notification_fault_point();
perform public.emit_notification('payment.succeeded', p_payload);
```

Then drop `fire_notification_fixture` and `notification_fixture_ledger`. AT-016.09 keeps the same fault point name and the same four reads.

`public.advance_notification_delivery(p_delivery_id uuid, p_to_state ..., p_process_id text, p_receipt_id uuid)`  
The worker transition function. No grant to `service_role` in this run. Operator SQL from the live adapter. Sets `app.notification_advance = '1'`. Deletes the current occupancy, inserts the new occupancy, inserts the transition log row. The legal-transition FK is what refuses a bad pair.

`public.record_provider_receipt(...)` and `public.record_provider_attempt(...)`  
Insert-only. Called from the worker after SMTP, or after a Mailpit lookup that proves a prior acceptance.

`public.try_emit_notification(...)` is not added. `sut.emit` for the unregistered probe calls `emit_notification` through operator SQL and maps a raised exception to `{ accepted: false }` with no `eventId`. Counts of events and deliveries are unchanged because the raise rolls back.

Write-gate. None of these definers are granted to `service_role`, so none need `assert_account_active` and none need `WRITE_GATE_EXEMPT`. A later scheduled worker that runs as `service_role` must either call `assert_account_active` (it cannot, there is no account) or take an exemption whose reason is "the delivery process has no caller account". That grant is not in this run.

Sole-writer triggers.

- Insert on `notification_events`, `notification_deliveries`, `ops_items` is refused unless `current_setting('app.notification_emit', true) = '1'`.
- Insert on occupancy and on the transition log is refused unless the emit GUC is set (birth) or `app.notification_advance = '1'` (worker).

A producer definer that tries to insert a delivery row directly raises, even though it runs as the table owner.

#### Pure module

`supabase/functions/_shared/notifications.ts` exports.

- `SENDERS` as the four probes. Only `notifications.emitter` has `canSendDirectly: true`.
- `runtimeRegistrationSurface()` as `[]`.
- `renderBody(event, payload)` including sentinel pass-through, leftover non-donation copy, and the named payload strings.
- `payloadFor(event, params)` with the same named defaults the stand-in uses.
- `decideSend(delivery, ports)` as a pure function. In-app returns `{ kind: 'mark_sent' }`. Email with an existing receipt returns `{ kind: 'mark_sent', receiptId }`. Email without a receipt returns `{ kind: 'call_provider' }`.

The module does not import SMTP. The SMTP file is the only provider-client importer.

#### SMTP and Mailpit

Uncomment `smtp_port = 44325` in `supabase/config.toml`. The stack must be restarted. `db:reset` does not open the port. `prepareLocalStack` locks `[local_smtp] port` (the web UI on 44324). It does not lock `smtp_port`. The writer still restarts the stack once after the config change.

`notification-smtp.ts` opens SMTP to `127.0.0.1:44325`. It sends to `auth.users.email` for the recipient uuid. It sets `Message-ID` to a stable value derived from the triple `(event_id, recipient_id, channel)`. SMTP 250 maps to `accepted`. A stated 5xx maps to `rejected`. A timeout maps to `no_ack`.

Mailpit accepts almost everything. A real `rejected` at integration is not a Mailpit 5xx. It is the product honouring `h.faults.at('notifications.provider_send', 'reject')`. The worker reads `notification_fault_armings` for that point, records outcome `rejected`, does not SMTP, moves occupancy to `retrying`, and consumes the arming row. `lose_ack` does SMTP (or records that it would), inserts the receipt, records outcome `ack_lost`, and leaves occupancy at `retrying` with `receipt_id` set.

#### Emit path (producer to committed outbox)

```
world.fire('payment.succeeded')
  -> operator SQL: fire_notification_fixture('payment.succeeded', payload)
       -> insert fixture_ledger committed = true
       -> notification_fault_point()          -- FAULT POINT. nextval then maybe raise
       -> emit_notification(...)
            -> insert notification_events      -- recipients frozen here
            -> insert notification_deliveries  -- one row per pair, emitted_by pinned
            -> insert occupancy pending
            -> insert birth transition
            -> insert ops_items if taxonomy says so
```

One `SECURITY DEFINER` call is one implicit transaction. There is no TypeScript `begin`. A raise at the fault point undoes the ledger insert and never reaches emit. AT-016.09 then reads four absences.

The event id is allocated inside `emit_notification`, after the fault point. A crash does not consume an id.

#### Delivery path (pending to provider acceptance)

```
sut.drainDeliveries({ passes })
  -> live adapter worker, identity = processEpoch
       -> SELECT occupancy JOIN deliveries
          WHERE state in ('pending','retrying')
          FOR UPDATE SKIP LOCKED
       -> in-app: advance to sent, stamp delivered_by_process if null
       -> email:
            if occupancy.receipt_id is not null
              or a receipt row exists for the triple
              or Mailpit already holds this Message-ID
                 then advance to sent, no SMTP
            else
              honour provider_send arming if any
              else SMTP
            on accepted: insert receipt, insert attempt accepted, advance to sent
            on rejected: insert attempt rejected, advance to retrying
            on no_ack / lose_ack: insert receipt if SMTP 250 already happened,
                 insert attempt ack_lost, occupancy stays retrying with receipt_id
       -> increment notification_events.attempts once per event touched in this pass
```

Default drain runs to quiescence. `{ passes: n }` stops after n passes so AT-016.11 can observe `retrying`. A `passes` value that is not an integer `>= 1` is refused, same as the stand-in.

`processRestart` builds a new worker object and a new `processEpoch` string. Pending rows remain in the tables. The next drain stamps `delivered_by_process` with the new epoch. AT-016.07 asserts that stamp.

#### Recipient resolution

At emit time, not at send time. `notification_fixture_bindings` is the map. The live world writes it when the world opens.

- `ngo` is the organisation seat account.
- `volunteer` is the assigned volunteer on the fixture project.
- `platform_admin` is the provisioned administrator.
- `ex_volunteer` is a real auth user bound under that role. It is not an `account_type` value.

`reassignRole('ngo', 'at-016.10-successor')` updates the in-memory `actors` map and the bindings table. It does not rewrite delivery rows. Drain sends to the uuid frozen on the event. The successor string appears on no delivery.

#### Anti-spam guard

Evaluated at emit, not at occupancy. `burstThreadComments` calls `fire_notification_fixture('thread.comment', ...)` under the guard.

- `coalesce = true`. One emit per window.
- `coalesce = false`. At most `cap` emits per window.
- Window reset uses the clock the caller supplies.

Loop. The stand-in already does this with `h.clock` and `h.config`. Leave that path.

Integration. `createLiveAdapter` receives only `{ stack }`. It never sees `h.config`. The integration body still can, because `config` remains on the harness at every tier. Add `pinThreadGuard({ cap, windowMs, coalesce })` on the live world class. The `World` alias in `_contract.ts` gains that method. The loop world implements it as a write into the same config the burst already reads, so both variants of AT-016.08 stay one body shape if wanted. The integration procedure writes a short window (about 1500 ms and 2000 ms) so the test waits on real time instead of 60 seconds. Pass `timeoutMs: { integration: INTEGRATION_TIMEOUT_MS }` at the call site, same pattern as the auth suite.

#### Live adapter

`tests/at/suites/req-016/_live.ts` exports `requirement = 'req-016' as const` and `createLiveAdapter({ stack })`.

It calls `mailIdentification(stack)` and `sqlClient(stack)`. It returns `{ sut: { notifications }, fixtures: { world }, faults, sentinels, teardown }`.

`sut.notifications` implements `NotificationsSut` over operator SQL plus the worker object.

`fixtures.world(name)` provisions four actors with the Auth admin API and `email_confirm: true`, then inserts `public.accounts` as the operator. It does not follow the public signup order. This suite opens many worlds (AT-016.09 opens twenty-two). GoTrue's `email_sent = 2` per hour cannot survive public confirmations. Platform admin provisioning copies the auth live adapter. `ex_volunteer` is a confirmed auth user bound only in `notification_fixture_bindings`.

`faults.points()` returns

- `notifications.between_transition_and_event_write` (kind `crash`)
- `notifications.provider_send` (kinds `reject`, `lose_ack`)

`arm` writes `notification_fault_armings`. `triggerCount` is `last_value` of `notification_fault_triggers` after the call minus before it, for the crash point. For `provider_send`, the count is the number of arming rows the worker consumed. `clear()` still goes through `faultFiredProblem`, so a count of 0 fails.

`processEpoch` is a string on the adapter. `processRestart` replaces the worker object and the string.

`sentinels.scopes()` returns `['notifications.delivery_bodies']`. `read` selects `body` from `notification_deliveries`.

`teardown` closes the SQL client.

Actor emails are unique per world so Mailpit searches do not collide across `open()` calls in one run.

#### Source scan

`tests/at/suites/req-016/_source-scan.ts` walks `supabase/functions/**/*.ts`. It does not walk `tests/`. It flags an import or credential for a comms provider (SMTP client, `nodemailer`, `resend`, `RESEND_API_KEY`, `SMTP_`, SendGrid). Path `_shared/notification-smtp.ts` maps to `notifications.emitter`. Any other hit maps to its folder name (`blockers`, `scope`, `lifecycle` if those ever appear). The function throws if `supabase/functions` cannot be read. An empty functions tree is not reported as "no importers".

Both AT-016.01 bodies import this module. Neither body calls `h.static`. That is the req-001 `_source-scan.ts` pattern. It is not new harness machinery.

#### Loop fixture

`_fixture.ts` stays. Loop greens that already hold stay on the in-memory stand-in. This run does not rewrite the stand-in to use Postgres.

### Per-id plan

| Id | Product | Seam | `integration:` body? | Integration witness |
|---|---|---|---|---|
| AT-016.01 | emitter is the only occupancy birth writer. SMTP file exists under the emitter path. Domain `fire` stamps `emittedBy = notifications.emitter`. | suite-local `_source-scan.ts`. live `senders()`, `sentinels`, Mailpit. | yes (replaces `h.static` and `h.vendors`) | `providerClientImporters()` from `_source-scan.ts` equals `['notifications.emitter']`. Mailpit messages' event ids are a subset of `sut.events()`. |
| AT-016.02 | taxonomy table equals the 48 names. unregistered raise. no registration function. | `sut.taxonomy`, `sut.emit`, `sut.runtimeRegistrationSurface` | no | same reads against Postgres |
| AT-016.03 | every fire writes the named pairs, payloads, bodies, ops items, fuel.depleted admin | integration capture | yes | capture reads occupancy+deliveries. Mailpit accepted pairs for email. not `h.vendors` |
| AT-016.04 | taxonomy negatives (roles and leftover copy) | same capture | yes, rides the capture | same capture. no Mailpit needed for the negatives |
| AT-016.05 | class checks on `effective_channels`. worker sends email only on email occupancy | same capture | yes | Mailpit plus `notification_provider_attempts`. no attempt with `channel <> 'email'`. accepted triples equal the email pairs |
| AT-016.06 | `default_source` non-empty, `effective_channels` populated, class checks | same capture, `sut.documentedDefaults()` reads the taxonomy table | yes, rides the capture | taxonomy table columns, not a comment |
| AT-016.07 | unique pair. occupancy survives restart. `delivered_by_process` stamped on sent | live `faults.processRestart` | no | SQL unique plus process stamp on occupancy |
| AT-016.08 | guard tables. `pinThreadGuard` | live world + real time | yes (replaces `h.clock.freezeAt` / `advance`) | counts of `thread.comment` in-app pairs after real waits |
| AT-016.09 | fixture producer + fault point + sequence | live `faults.at(..., 'crash')` | no | `transitionCommitted` reads fixture_ledger. events, deliveries, ops_items are empty after raise. control world commits both |
| AT-016.10 | recipients jsonb frozen on the event | live `reassignRole` | no | delivery `recipient_id` equals the original uuid |
| AT-016.11 | occupancy checks. receipt unique. worker retry | live `faults.at('notifications.provider_send', 'reject' \| 'lose_ack')` | yes (replaces `h.vendors.email.rejectNext` / `acceptButLoseAck`) | attempts table outcomes. occupancy not `sent` after one pass. Mailpit Message-ID count stays 1 after lost-ack retry. event `attempts >= 2` |
| AT-016.12 | taxonomy recipients for `lovable.credits_blocked` | same capture as .03 | yes, rides the capture | delivery roles exactly `{ngo, platform_admin}` with the world actor ids |

Ids that read `h.vendors`, `h.clock`, or `h.static` in today's single body, and therefore need an `integration:` procedure, are AT-016.01, .03, .04, .05, .06, .08, .11, .12.

AT-016.02, .07, .09, .10 stay single-body. The live adapter backs the methods they already call.

### The six units

The brief's unit order stays. The state machine tables all land in unit 1, because birth occupancy is part of emit. Later units turn the machine. They do not redesign it.

**Unit 1. One shared emitter and the static event table.**  
Files. migration, catalog rows, `_shared/notifications.ts` senders and taxonomy reads, `_shared/notification-smtp.ts` (file exists so the source scan has a target), `_source-scan.ts`, `_live.ts` skeleton, `_live-world.ts` fire through the fixture producer, AT-016.01 per-tier body, expect manifest for .01 and .02.  
Turns green. AT-016.01, AT-016.02.  
The worker may still be a no-op drain. Deliveries sit at `pending`.

**Unit 2. Full taxonomy matrix.**  
Files. payload and body render, ops_item insert, leftover copy, live world fires all 48, integration capture for .03 and .04 (and it will also run .12).  
Turns green. AT-016.03, AT-016.04, and AT-016.12.  
The brief puts AT-016.12 in unit 6. The capture file is unsplittable. `.12` is a recipient fact. Once every row fires, `.12` is green. `--expect` fails a declared red that went green, so the manifest must move `.12` in this unit. Unit 6 still owns AT-016.11.

**Unit 3. Documented defaults.**  
Files. taxonomy checks already in the migration from unit 1. `sut.documentedDefaults()` and the capture's .05/.06 projections. Email occupancy exists. Provider-accepted pairs for .05 wait on the worker.  
Turns green. AT-016.06 immediately. AT-016.05 stays red until unit 4 drains email, because .05 reads the provider trace. If unit 3 is committed alone, keep .05 declared red. Do not declare it green early.

**Unit 4. One logical notification, anti-spam guard.**  
Files. `advance_notification_delivery`, worker in `_shared/notifications.ts`, processEpoch on the adapter, guard tables, `pinThreadGuard`, AT-016.08 integration body, uncomment `smtp_port`.  
Turns green. AT-016.07, AT-016.08, and AT-016.05 (provider witness now exists).  
Restart is mid-flight because fire does not drain. That is why the emitter stays thin.

**Unit 5. Atomic emitter-outbox contract.**  
Files. fault arming already in the migration. live `faults` seam wired to the sequence. AT-016.09 and .10 run against fixture producers as the founder ruled.  
Turns green. AT-016.09, AT-016.10.  
`.10` may already have been green in unit 2. If it is, move it in the manifest in the unit that first makes it pass, not later.

**Unit 6. Sent only on acceptance, no duplicate, escalation.**  
Files. receipts, attempts, `notifications.provider_send` arming, SMTP plus Mailpit lookup, AT-016.11 integration body.  
Turns green. AT-016.11. AT-016.12 is already green from unit 2.

**Cuts the brief cannot split.**

- One migration. Occupancy, legal transitions, and emit birth rows are one schema. Splitting them across units means unit 1's emit has nowhere to put `pending`. Keep one migration in unit 1.
- `d-taxonomy-evidence.test.ts` holds AT-016.03, .04, .05, .06, .12 on one capture. One integration capture function serves all five. Units 2, 3, 4, and 6 share that file. Update the expect manifest whenever an id in that file actually goes green.
- `_live.ts` must exist before any integration id runs. Its mere presence removes the twelve-way stand-in refusal. Create it in unit 1 with honest methods, and keep unready behaviour behind product absences that the still-red ids already declare, or implement enough that the ids you claim green in that unit really pass.

### Rubric answers

#### 1. Atomicity by construction

The transaction boundary is one call of `public.fire_notification_fixture`. Postgres wraps a single Data API RPC in one transaction. The fixture producer inserts `notification_fixture_ledger`, then calls `notification_fault_point`, then calls `emit_notification`.

The fault point is `notifications.between_transition_and_event_write`. It is raised inside `notification_fault_point` after `nextval('public.notification_fault_triggers')`. A crash raises SQLSTATE `XX001` with detail `induced-fault:notifications.between_transition_and_event_write`. Every insert above it rolls back. The four AT-016.09 reads (ledger, event, delivery, ops item) are empty.

The harness trigger count does not live in a table row. The adapter snapshots `last_value` of the sequence before the RPC and after it, including on refusal. `nextval` is not rolled back. `triggerCount()` is the difference. Arming does not increment the sequence. A control run with no arming row does not call `nextval` (the function still can, but arming is absent so it returns without raise). Count the `nextval` only when an arming row exists, so a control run does not pollute the sequence in a way the next fault run depends on. The adapter still owns the count.

#### 2. Sole writer, structurally

Three gates, all in the database or in the source scan. None is a comment.

- Table writes to events, deliveries, and ops items require GUC `app.notification_emit`. Only `emit_notification` sets it.
- `emitted_by` has a check constraint equal to `'notifications.emitter'`.
- `service_role` and client roles hold no insert on those tables. No write route is added, so no other edge function can call `callDatabaseFunction` for these names.

The source-level scan is `_source-scan.ts`. It is not `h.static`. It walks `supabase/functions`. The only allowed provider-client hit is `_shared/notification-smtp.ts`, mapped to `notifications.emitter`. Blockers, scope, and lifecycle have no function files that import SMTP. `sut.senders()` agrees. Domain fires still reach a delivery whose `emittedBy` is the emitter.

#### 3. One taxonomy, one source

The product's registered set is `public.notification_taxonomy`. It is seeded with the 48 wire names, recipients, named channels, effective channels, tone, class, ops, escalation, guarded, and a non-empty `default_source`. `sut.taxonomy()` and `sut.documentedDefaults()` select from it. AT-016.02 compares names to `tests/at/suites/req-016/taxonomy.ts`. AT-016.06 compares sources and channels. Class channel rules are table checks, so a seed that violated them would fail the migration. The suite oracle stays the specification. The table is the product. Equality is proved, not assumed.

The TypeScript module does not list the 48 rows a second time as a registry. It lists senders, body templates keyed by event, and payload defaults. Missing keys fail AT-016.03's predicates, which is the right failure.

#### 4. Honest at both tiers

Loop keeps `_fixture.ts` and the existing greens, except AT-016.01 which becomes a per-tier body and goes green on the suite-local scan.

Integration never reads `h.vendors` or `h.clock.freezeAt` or `h.static`.

| Id | Loop | Integration |
|---|---|---|
| .01 | `_source-scan.ts` + stand-in senders and sentinels | `_source-scan.ts` + Mailpit orphan check |
| .02 | stand-in | SQL taxonomy + raise on unregistered |
| .03–.06, .12 | existing capture on `h.vendors.email` | new capture on occupancy, attempts table, Mailpit |
| .07 | stand-in processEpoch | adapter processEpoch + SQL unique |
| .08 | controlled clock + `h.config` | `pinThreadGuard` + real time |
| .09 | in-process throw | SQL raise + sequence |
| .10 | in-memory actors | bindings table freeze |
| .11 | email simulator | `notifications.provider_send` faults + attempts table + Mailpit Message-ID |

The send witness at integration is Mailpit on port 44324 for physical mail, plus `notification_provider_attempts` for `rejected` and `ack_lost`. It is not the simulator.

#### 5. Passes the standing gates

Every new table has a `TENANT_CATALOG` row, a baseline revoke from `anon`, `authenticated`, and `service_role`, and RLS on. Isolated vs unreachable matches the table list above. `notification_deliveries` gets `grant select to authenticated` and one `for select` policy that names `auth.uid()`. No grant to `anon`. No `service_role` write. No `force row level security`.

Definers revoke execute from public. None are granted to `anon` or `authenticated`. None are granted to `service_role` in this run, so `definer-no-write-gate` does not fire and `WRITE_GATE_EXEMPT` stays with only `complete_signup`. Viewer functions are not added. The deliveries policy does not call a non-`viewer_` function.

No new `WRITE_ROUTES` row. No new `supabase/functions/<name>/index.ts`. `_shared/notifications.ts` does not match the database-reach regex. `_shared/notification-smtp.ts` does not either. `edge.ts` is unchanged.

CI that grades these choices. `tenantCatalogProblems` / `scanWriteGateSql` in `_policy-scan.ts` (via `at:selftest` and the auth suite). `writeRouteProblems` in `_write-route-scan.ts`. Live catalog on AT-001.21, .22, .23, .40 if the auth suite is run at integration after this migration, which the brief requires.

#### 6. Retry without duplication

The idempotency key is unique `(event_id, recipient_id, channel)` on `notification_provider_receipts`. It is also unique on `notification_deliveries` for the pair row itself.

It survives a process restart because it is a table. `processRestart` replaces the worker object only.

A lost acknowledgment inserts the receipt (or finds the Mailpit `Message-ID`) and leaves occupancy at `retrying` with `receipt_id` set. The next pass sees the receipt and inserts `sent` without SMTP. `accepted()` at integration is Mailpit messages keyed by `Message-ID`. That set still has one member.

A retry cannot mint a second delivery row because the worker does not insert into `notification_deliveries`. It only inserts occupancy and transition log rows. The identity unique would also refuse a second insert.

A retry cannot mint a second receipt because of the receipt unique. A replay after acceptance records an attempt with outcome `accepted` and does not insert a second receipt. That matches the loop simulator.

### Rationale

Inside this direction I considered four shapes and kept one.

**Four subtype tables (pending, retrying, sent, failed) as separate relations.** A delivery would physically move. Illegal states would be unrepresentable because `sent` columns would not exist on `pending`. I rejected this. Fourteen extra catalog rows, four extra revoke blocks, and a join at every SUT read, for an invariant occupancy already gives with a primary key and checks. The direction is occupancy plus a legal-transition FK, not a table explosion.

**A `state` column on `notification_deliveries` updated in place.** Closest to the stand-in. I rejected this as the centre. An in-place update can jump `pending` to `sent` for email with no receipt unless a trigger copies the occupancy checks onto that table. Then you have two sources of state. Occupancy is the state. Identity does not carry it.

**Event-sourcing only (transition log, current state as a view, no occupancy table).** Pure, and illegal pairs are unrepresentable. I rejected a view as the row the worker locks. `FOR UPDATE SKIP LOCKED` needs a real table. Occupancy is that table. The log remains the history and the FK target.

**Provider idempotency only in Mailpit, no receipt table.** I rejected this. Mailpit is not an idempotent provider. A lost-ack retry would send a second message. The receipt table is the product's memory of acceptance. Mailpit is the witness, and a `Message-ID` lookup is the backup if the process crashed after SMTP 250 and before the receipt insert.

**Putting the worker in a new edge function.** I rejected this. `writeRoute` requires a JWT caller. A function directory that reaches the database without a `WRITE_ROUTES` row fails CI. A `verify_jwt = false` worker is a new production surface this run does not need. `drainDeliveries` on the adapter is the process. A later item may add a schedule and a `WRITE_GATE_EXEMPT` reason.

**Harness `StaticScan` wired in `createHarness`.** I rejected this. The project forbids new harness machinery. `h.static` is hard-coded to refuse. The req-001 source oracle is the in-tree alternative.

**Public signup order for live actors.** I rejected this. AT-016.09 opens twenty-two worlds. Confirmation mail is rate-limited to two per hour and a database reset does not clear it. Admin API with `email_confirm: true` plus operator insert into `public.accounts` is the auth suite's own administrator path.

**Clock freeze at integration through a fake clock in the adapter.** I rejected this. The live factory receives `{ stack }` only. AT-016.08's integration procedure waits on real time with a short pinned window.

### Where this direction strains

The state machine is a good fit for AT-016.07, AT-016.09, and AT-016.11. It is a worse fit for AT-016.02, AT-016.03, AT-016.04, AT-016.06, and AT-016.08.

AT-016.08's anti-spam guard is an emit-time coalescer. It is not a delivery transition. Modelling a burst as occupancy absorption would invent states the contract does not name. The guard stays a producer filter. The occupancy machine never sees the suppressed comments. Switching later to a "coalesced" occupancy state would cost a new legal-transition row and a new contract field, and the suite would not read it.

AT-016.02 and AT-016.06 are set equality and documentation. A state machine does not make 48 names more correct than a const array would. The taxonomy table exists so occupancy can FK event names. If a later design moves the taxonomy to a TypeScript const as the product source, the migration seed becomes generated or deleted, and the FK target has to remain. That switch is a new migration that copies names from the module into the table, not a rewrite of occupancy.

AT-016.03's payload predicates are about copy. Occupancy does not help. Body rendering in the thin emitter is ordinary string work. A direction that started with a typed registry would spend less schema on this and more on shared renderers. Switching later costs nothing in occupancy. The renderer already lives in `_shared/notifications.ts`.

`failed` is a contract state with no inbound legal transition in v1. Keeping it in the enum satisfies the type. It is also dead weight. A direction that omitted `failed` until a max-retry existed would be smaller. Adding inbound `failed` later is one catalog insert plus a worker rule. It is cheap.

The lost-ack occupancy (`retrying` with a non-null `receipt_id`) is the honest model and it is also a state the suite never names. The adapter must still project `retrying` to the SUT. If a reviewer wants that situation to be a fifth state, the contract has to change. I would not change it. The suite is the contract.

Channel-specific legal transitions make in-app `retrying` unrepresentable, which is good, and they duplicate the class channel rule in a second form. The taxonomy already forbids email on `lowtone`. The catalog forbids in-app retry. Two layers can drift. The cost of switching to a single channel-blind catalog later is that the worker must re-learn "in-app never calls SMTP" in code. That is the stand-in's model. It is weaker than a missing catalog row.

Nineteen catalog-visible objects (tables plus a sequence) is more posture surface than a three-table outbox. Every object needs a revoke block and a catalog row. A ports-and-adapters direction would have fewer tables and more TypeScript. Switching later toward that style means keeping occupancy and receipts (they are load-bearing for .07 and .11) and dropping the legal-transition table only if the worker is trusted. I would not drop it. The FK is the whole bet.

The fixture producer is a real definer that writes a fake ledger. AT-016.09 goes green on that pair. It does not prove Stripe, the gateway, or project completion. Replacement is one `perform` line in those definers and a drop of `fire_notification_fixture`. Until those requirements exist, the green is a green about the contract, which is what the founder asked for.

Enabling `smtp_port = 44325` is a stack-config change. Integration on a stack started before that line still has no SMTP listener. The design cannot fix that from a migration. The writer restarts the stack once and then runs the auth suite and this suite at integration.