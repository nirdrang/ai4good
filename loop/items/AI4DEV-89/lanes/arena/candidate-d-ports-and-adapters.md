# Candidate D. One notification core behind six ports, bound twice

REQ-016, designed backwards from the seams the harness already fixes.

## Direction

I design from the outside in. `NotificationsSut` and `World` in `tests/at/suites/req-016/_contract.ts`
are given and cannot move. `tests/at/suites/req-001/_live.ts` shows the shape a live adapter takes.
So I name the ports the subsystem needs first, write every port signature before any implementation,
and then implement each port twice. One binding is in memory for the loop tier. One binding is over
the real stack for the integration tier. Between the two bindings sits one core of pure TypeScript
that decides everything and stores nothing.

The single bet is this. **The notification subsystem has exactly one implementation, and the loop
stand-in stops being a second implementation. It becomes one binding of the same core.** Today
`_fixture.ts` is a conforming reference written from the suite's own oracle, which is why a loop
green says nothing about a product. After this change a loop green and an integration green run the
same emitter, the same taxonomy, the same defaults, the same copy renderer and the same delivery
worker. Only the storage, the wire and the clock differ, and each of those is a named port with two
implementations that a reviewer can read side by side.

The bet has a price and I state it early. The core is TypeScript, so it cannot run inside a Postgres
transaction. The atomicity criterion demands that the producer's state transition and the notification
write commit or roll back as one unit. My answer is to split deciding from writing. The core decides
the whole write set before the transaction opens. One database call then applies the producer's
transition and the prepared write set together, in one round trip, in one implicit transaction. The
fault point sits inside that call, between the two. Everything in this document follows from that one
move.

## The data shape

### The organising structure for the taxonomy

I chose **one typed const array in product TypeScript, with a derived name list in SQL and a static
oracle that proves the two equal.** Not a table. Not a state machine. Not a registry with a
registration call.

The array is `TAXONOMY` in `supabase/functions/_shared/notification-taxonomy.ts`. It is 48 rows, one
per wire event, transcribed from the requirement independently of the suite's `taxonomy.ts`. The
database holds only the 48 wire names, in `public.notification_event_types`, seeded by the migration
that creates it, and referenced by a foreign key from every event row.

What the choice buys.

- A const array is closed by construction. There is no add path, so `runtimeRegistrationSurface()`
  returns the empty list because there is nothing to return, not because a flag says so.
- The array is the emitter's decision table. Recipients, channels, class, tone, payload keys, guarded,
  ops item and escalation all live on the row that names the event, so a reviewer reads one line and
  knows the whole behaviour of one event.
- The loop binding and the live binding read the same array through the same port. A drift between the
  tiers is impossible because there is nothing to drift from.
- Type narrowing works. `Role`, `Channel`, `EventClass` and the row type are unions, so an event with
  an unknown class or a channel outside the two names fails `bun run typecheck`.

What the choice costs.

- The wire names exist twice, once in the array and once in the migration's seed. Two artifacts can
  disagree. I pay for that with a static oracle, `tests/at/suites/req-016/_source-scan.ts`, which reads
  the migration text and the product module and reports any difference. It runs in both tier bodies of
  AT-016.02, so CI catches a drift at the loop tier before anybody reaches a stack.
- Changing the taxonomy needs a code change and a migration, not a row insert. That is the point. The
  requirement says the table is immutable in v1.
- An operator cannot inspect the taxonomy with SQL alone. They see the names and not the recipients.
  I accept that. Nothing in the twelve ids needs it and the in-app surface is out of this run.

### The tables

Migration `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`.

```sql
create type public.notification_state   as enum ('pending','retrying','sent','failed');
create type public.notification_channel as enum ('email','inapp');
create type public.notification_role    as enum ('ngo','volunteer','ex_volunteer','platform_admin');
```

`public.notification_event_types`

| column | type | invariant |
|---|---|---|
| `event` | `text primary key` | one row per wire name, 48 rows, seeded by this migration; shape check `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$` |

The closed set, in the database, as a foreign key target. An insert naming an unregistered event fails
on the key rather than on a convention.

`public.notification_events`

| column | type | invariant |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | minted inside the emit, after the fault point |
| `event` | `text not null references public.notification_event_types(event)` | the closed set |
| `actor_account_id` | `uuid` | who caused it, null for a system cause |
| `payload` | `jsonb not null default '{}'` | the producer's context, frozen |
| `recipients` | `jsonb not null` | resolved at creation, `check (jsonb_array_length(recipients) > 0)` |
| `state` | `public.notification_state not null default 'pending'` | derived from its deliveries |
| `attempts` | `integer not null default 0` | worker passes that attempted this event |
| `created_at` | `timestamptz not null default now()` | |

`recipients` is the frozen resolution AT-016.10 is about. It is written once and never recomputed.

`public.notification_deliveries`

| column | type | invariant |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `event_id` | `uuid not null references public.notification_events(id) on delete cascade` | |
| `event` | `text not null` | denormalised so `deliveries({type})` needs no join |
| `role` | `public.notification_role not null` | |
| `recipient_id` | `uuid not null` | |
| `recipient_address` | `text` | frozen at emit, `check (channel <> 'email' or recipient_address is not null)` |
| `channel` | `public.notification_channel not null` | |
| `state` | `public.notification_state not null default 'pending'` | |
| `emitted_by` | `text not null` | `check (emitted_by = 'notifications.emitter')` |
| `delivered_by_process` | `text` | null until a process sent it, first send owns the stamp |
| `payload` | `jsonb not null default '{}'` | |
| `subject` | `text not null` | |
| `body` | `text not null` | the copy the recipient receives |
| `idempotency_key` | `text not null` | `unique`, derived as `ntf:<event_id>:<recipient_id>:<channel>` |
| `created_at` | `timestamptz not null default now()` | |
| | `unique (event_id, recipient_id, channel)` | **one delivery per pair, by the schema** |

Two uniques, deliberately. The pair unique is the structural answer to AT-016.07. The key unique is
the structural answer to AT-016.11, and it is redundant with the pair unique on purpose, because the
key is what the provider sees and the pair is what the test counts. If those two ever disagree the
database refuses the write rather than sending twice.

`public.notification_ops_items`

| column | type | invariant |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `kind` | `text not null` | the event name that raised it |
| `linked_event_id` | `uuid references public.notification_events(id) on delete cascade` | |
| `detail` | `jsonb not null default '{}'` | |
| | `unique (linked_event_id)` | **exactly one linked ops item per event, by the schema** |

`public.notification_fault_triggers`, a sequence, not a table. `nextval` is not transactional, so a
value taken inside a transaction survives the rollback of that transaction. That is the whole reason
it exists and section "The fault port" explains it.

Migration `supabase/migrations/20260913121000_notification_fixture_producers.sql`.

`public.notification_fixture_transitions`

| column | type | invariant |
|---|---|---|
| `scope_id` | `text not null` | one open world |
| `event` | `text not null references public.notification_event_types(event)` | |
| `committed` | `boolean not null default false` | what `World.transitionCommitted` reads |
| | `primary key (scope_id, event)` | |

This is the stand-in ledger the eleven guarded producers do not have yet. It lives in its own
migration file, named for what it is, so that deleting it later is one new migration and no edit to
the outbox schema.

### The core types

`supabase/functions/_shared/notifications.ts`, pure, no Deno, no fetch, no clock, relative imports
only, so `tests/at` type-checks it and both adapters import it.

```ts
export type EmitRequest = { event: string; actor: string | null; params: Record<string, unknown> };

export type ResolvedRecipient = {
  role: Role; recipientId: string; address: string | null; channels: Channel[];
};

export type PreparedDelivery = {
  role: Role; recipientId: string; address: string | null; channel: Channel;
  payload: Record<string, unknown>; subject: string; body: string;
};

declare const WRITE_SET: unique symbol;

/** Only `prepareWriteSet` in this module constructs one. The brand is the sole-writer type. */
export type WriteSet = {
  readonly [WRITE_SET]: true;
  event: { event: string; actor: string | null; payload: Record<string, unknown>;
           recipients: ResolvedRecipient[] };
  deliveries: PreparedDelivery[];
  opsItem: { kind: string; detail: Record<string, unknown> } | null;
};
```

The brand is load-bearing. `OutboxPort.append` takes a `WriteSet` and nothing else, the symbol is
`declare`d and never exported, so no module outside `notifications.ts` can build a value of that type
without a cast. That is the type-level half of "the emitter is the sole writer".

## The design

### The six ports, signatures first

The direction names five. I need six, and I say so rather than folding the sixth into one of the five
and hoping nobody notices. Recipients must be resolved from somewhere, and where they come from
differs completely between the tiers. That is a port.

```ts
export type OutboxPort = {
  /** Apply the producer's transition and this write set as ONE unit. Returns the minted event id. */
  append(write: WriteSet): Promise<{ eventId: string }>;
  /** Deliveries not yet sent, oldest first, with everything a send needs. */
  pending(): Promise<PendingDelivery[]>;
  /** One worker pass, applied as one unit: mark, stamp, bump attempts, recompute event state. */
  applyPassResults(results: PassResult[], processEpoch: string): Promise<void>;
  events(filter?: { type?: string }): Promise<NotificationEventRow[]>;
  deliveries(filter?: { type?: string }): Promise<DeliveryRow[]>;
  opsItems(filter?: { linkedEventId?: string }): Promise<OpsItemRow[]>;
};

export type ProviderPort = {
  /** 'accepted' only when the provider confirmed. 'no_ack' is silence and is not a refusal. */
  deliver(message: OutgoingMessage): Promise<'accepted' | 'rejected' | 'no_ack'>;
};

export type DirectoryPort = {
  /** role -> account id and address, read at EMIT time, never at send time. */
  resolve(roles: readonly Role[]): Promise<Partial<Record<Role, RoleHolder>>>;
};

export type TaxonomyPort = {
  rows(): readonly TaxonomyRow[];
  documentedDefaults(): readonly DocumentedDefault[];
};

export type ClockPort = { now(): number };

export type ProcessPort = { epoch(): string };
```

`PendingDelivery` carries `id`, `eventId`, `recipientId`, `address`, `channel`, `subject`, `body` and
`idempotencyKey`. The key comes off the row, so the worker never derives it and cannot derive it
differently on a retry.

There is no fault port in this list, and that is a finding rather than an omission. See "The fault
port" below.

### The core

```ts
export function createNotifications(deps: {
  taxonomy: TaxonomyPort; outbox: OutboxPort; provider: ProviderPort;
  directory: DirectoryPort; clock: ClockPort; process: ProcessPort;
}): Notifications;

export type Notifications = {
  senders(): SenderProbe[];
  taxonomy(): RegisteredRow[];
  documentedDefaults(): DocumentedDefault[];
  runtimeRegistrationSurface(): string[];
  emit(request: EmitRequest): Promise<{ accepted: boolean; reason?: string; eventId?: string }>;
  runPass(): Promise<{ changed: number }>;
  drain(opts?: { passes?: number }): Promise<void>;
  events(filter?): Promise<NotificationEventRow[]>;
  deliveries(filter?): Promise<DeliveryRow[]>;
  opsItems(filter?): Promise<OpsItemRow[]>;
  threadCommentGuard(config: GuardConfig): ThreadCommentGuard;
};
```

Files.

| path | what lands there |
|---|---|
| `supabase/functions/_shared/notification-taxonomy.ts` | `TAXONOMY` (48 rows), `Role`, `Channel`, `EventClass`, `DEFAULT_BY_CLASS`, `documentedDefaults()`, `channelsFor(row)` |
| `supabase/functions/_shared/notification-copy.ts` | `SUBJECTS` and `LEAD` per event, `renderCopy(row, payload)` |
| `supabase/functions/_shared/notifications.ts` | the six port types, `WriteSet`, `prepareWriteSet`, `createNotifications`, `SENDER_DECLARATIONS`, `NOTIFICATION_COMPONENTS`, the thread-comment guard |
| `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql` | types, four tables, the sequence, `emit_notification`, `apply_delivery_results` |
| `supabase/migrations/20260913121000_notification_fixture_producers.sql` | the transition table, `fixture_commit_transition_and_emit` |
| `supabase/config.toml` | uncomment `smtp_port = 44325` |
| `tests/at/suites/req-001/_policy-scan.ts` | five `TENANT_CATALOG` rows |
| `tests/at/suites/req-016/_fixture.ts` | rewritten as the loop binding of the six ports |
| `tests/at/suites/req-016/_live.ts` | new, the integration binding |
| `tests/at/suites/req-016/_integration.ts` | new, eight integration procedures and the integration capture |
| `tests/at/suites/req-016/_source-scan.ts` | new, the provider-importer oracle and the taxonomy-seed equality oracle |
| `tests/at/suites/req-016/_mail-witness.ts` | new, the Mailpit reader the integration procedures use as the out-of-band send witness |
| `tests/at/suites/req-016/_fixture-producers.ts` | new, the sample payloads both bindings' producers supply |
| the four `*.test.ts` files | per-tier body maps for eight ids, `h.static` replaced by the source oracle |
| `tests/at/harness/conformance.selftest.ts` | two assertions re-pointed, see "Passes the standing gates" |
| `tests/at/expected/req-016.json` | per-unit declarations, ending at twelve green at both tiers |

### The emit path, from a producer's transition to a committed outbox row

Six steps. Steps 1 to 4 are the core. Step 5 is the port. Step 6 is one transaction.

1. A producer calls `notifications.emit({ event, actor, params })`.
2. The core looks the event up in `TAXONOMY`. An unknown name returns
   `{ accepted: false, reason: 'unregistered event type' }` and touches no port. Nothing is written and
   nothing is sent, which is AT-016.02's second clause.
3. The core computes the effective channels. Named channels win. A row with `channels: null` binds to
   `DEFAULT_BY_CLASS[row.class]`. `documentedDefaults()` serves the same computation as data, so the
   documentation and the behaviour are one function and cannot disagree.
4. The core resolves recipients through `DirectoryPort.resolve(row.recipients)`, renders the copy
   through `renderCopy`, and calls `prepareWriteSet`, which is the only constructor of a `WriteSet`.
   `prepareWriteSet` refuses a row with no resolved recipient, refuses a channel outside the effective
   set, and stamps `emitted_by = 'notifications.emitter'` on every delivery.
5. The core calls `outbox.append(write)`.
6. The binding applies it.

The write set is a plain JSON document. That matters, because step 6 hands it to the database whole.

Live binding of `append`, one round trip.

```sql
select public.fixture_commit_transition_and_emit($1::text, $2::jsonb, $3::boolean);
```

```sql
create function public.fixture_commit_transition_and_emit(
  p_scope text, p_write jsonb, p_induce_fault boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  -- (1) THE TRANSITION COMMITS FIRST.
  insert into public.notification_fixture_transitions (scope_id, event, committed)
  values (p_scope, p_write->'event'->>'event', true)
  on conflict (scope_id, event) do update set committed = true;

  -- (2) THE FAULT POINT: notifications.between_transition_and_event_write.
  if p_induce_fault then
    perform nextval('public.notification_fault_triggers');
    raise exception 'induced fault: crash at notifications.between_transition_and_event_write'
      using errcode = 'P0001',
            detail  = 'induced-fault:notifications.between_transition_and_event_write';
  end if;

  -- (3) THE EVENT WRITE, and everything that belongs to it.
  return public.emit_notification(p_write);
end;
$$;
revoke execute on function public.fixture_commit_transition_and_emit(text, jsonb, boolean) from public;
```

`public.emit_notification(p_write jsonb) returns uuid` inserts one event row with the frozen
recipients, one delivery row per prepared delivery with its derived idempotency key, and the ops item
when the write set carries one. It is `security definer`, `set search_path = ''`, `revoke execute from
public`, and it is granted to nobody. No client role can call it. No `service_role` can call it. Only
the owner and another definer running as the owner can, which is exactly how a real producer will
reach it.

What SQL validates and what it does not.

- Validated in SQL. The event name exists in the closed set, by foreign key. Recipients are non-empty,
  by check. `emitted_by` is the emitter, by check. One delivery per pair, by unique index. One ops item
  per event, by unique index. An email delivery carries an address, by check.
- Not validated in SQL. That the channels match the taxonomy row, and that the copy carries the named
  payload strings. Those are the core's decisions and the suite is their oracle. I say this plainly
  because a design that claimed the database re-derives the taxonomy would be claiming two sources of
  truth while calling itself one.

A real producer later. Its edge route builds the write set with the same core, then calls one definer
that performs the ledger statements and ends with `perform public.emit_notification(p_notification)`.
The transaction boundary is identical. The fixture producer above is the same shape with a one-row
transition instead of a ledger.

### The delivery path, from a pending row to a provider acceptance

```ts
async function runPass(): Promise<{ changed: number }> {
  const pending = await outbox.pending();
  const results: PassResult[] = [];
  for (const d of pending) {
    if (d.channel !== 'email') { results.push({ id: d.id, outcome: 'accepted' }); continue; }
    results.push({ id: d.id, outcome: await provider.deliver({
      key: d.idempotencyKey, to: d.address, subject: d.subject, body: d.body,
      eventId: d.eventId, recipientId: d.recipientId, channel: d.channel,
    }) });
  }
  await outbox.applyPassResults(results, process.epoch());
  return { changed: results.length };
}
```

In-app never reaches the provider. That is one `continue` in the core rather than a sentence in a
comment, and AT-016.05 reads the provider's own record to check it.

`applyPassResults` is one call and one transaction. For each result it sets `state = 'sent'` on
`accepted` and `state = 'retrying'` otherwise, stamps `delivered_by_process = coalesce(delivered_by_process,
p_epoch)` so the first send owns the stamp, bumps `attempts` on every event the pass touched, and
recomputes each touched event's state from its own deliveries. `drain()` runs passes until nothing is
`pending` or `retrying`, or until a pass changes nothing, and a `passes` argument that is not a whole
number at least 1 is refused rather than interpreted. That refusal is the contract's and it moves into
the core unchanged.

### The fault port, which is the hardest one

There is no fault port on the core, and finding that out is the useful part of designing this way.
A fault is not a capability the subsystem has. **A fault is an adapter that misbehaves.** So the fault
seam lives entirely in the binding layer, and the core never learns that faults exist. Two kinds of
fault, two different mechanisms, both in adapters.

**Provider faults, `reject` and `lose_ack`.** The live adapter wraps `ProviderPort` in a decorator.

```ts
function withProviderFaults(inner: ProviderPort, armed: ArmedProviderFault): ProviderPort {
  return { deliver: async (m) => {
    const forced = armed.take();               // consumes one forced outcome, counts the reach
    if (forced === 'reject') return 'rejected';
    if (forced === 'lose_ack') { await inner.deliver(m); return 'no_ack'; }
    return inner.deliver(m);
  }};
}
```

`lose_ack` really sends and then lies about it, which is the whole point of the ambiguous case. The
product's send path is untouched. This answers the open question the exploration left open, and it
answers it better than the alternative, because the alternative was to make product code read the
arming, and product code that knows about test faults is product code the test can no longer trust.
The live `faults.points()` returns two points, `notifications.between_transition_and_event_write` and
`notifications.provider_send`. The loop `faults.points()` returns one, because
`tests/at/harness/conformance.selftest.ts` asserts that it returns exactly one and that arming
`lose_ack` at the emit point is refused. The loop tier keeps its provider control on `h.vendors`,
which is what its bodies already use.

**The crash fault, inside a database transaction.** This one cannot be a decorator, because the crash
must happen after the transition and before the write, and both are inside one round trip. So the
arming reaches the transaction as an argument of the call. The binding, not the core, passes it.

```ts
const outbox = createSqlOutbox({ sql, scope, faultSwitch });   // the switch is a binding concern
```

`faultSwitch.armedCrash()` is read by the binding immediately before the call and forwarded as
`p_induce_fault`. `OutboxPort.append` gains no parameter. The core still sees a port that either
returns an event id or throws.

**Why the trigger count survives the rollback.** Everything the function writes before `raise` is
undone. A counter row is undone. A sequence is not, because `nextval` is non-transactional by
definition. The function takes a `nextval` immediately before it raises, so the reach is recorded in a
place the rollback cannot reach. The adapter reads the counter as

```sql
select coalesce(pg_sequence_last_value('public.notification_fault_triggers'::regclass), 0);
```

at arming time and again at `triggerCount()`, and reports the difference. `pg_sequence_last_value`
answers null for a sequence never called, which is why the coalesce is there and not decoration.

**And it is cross-checked, because one witness for a count is one witness too few.** The raise carries
`detail = 'induced-fault:notifications.between_transition_and_event_write'`. The binding counts every
refusal it receives carrying that detail. `triggerCount()` returns the sequence delta and throws if the
two numbers disagree, naming both. A count the adapter invented and a count the product recorded are
then the same number or the test fails, which is the standard `faultFiredProblem` exists to hold.

Arming needs no control table, no session GUC and no state visible to a second connection. That is the
direct payoff of putting the fault in the binding. The exploration expected a control table and a
`TENANT_CATALOG` row for it. This design has neither.

**`processRestart` and `processEpoch`.** The live adapter holds the worker as an object with an
identity string. `processRestart()` discards it, mints a new identity and constructs a new worker over
the same ports. Pending rows are re-read from the table, so the restart is real. `deliveredByProcess`
carries the identity of the process that actually sent, and `coalesce` in SQL is what keeps the first
send's stamp.

### What survives of `_fixture.ts` and what is deleted

Deleted, because the core now owns it.

- `channelsFor`, `defaults()`. Moved to `notification-taxonomy.ts`.
- `bodyFor`. Moved to `notification-copy.ts` and grown into a per-event template.
- `SENDERS`. Moved to `notifications.ts` as `SENDER_DECLARATIONS`.
- The taxonomy lookup and recipient mapping inside `emitKnown`. Moved to `prepareWriteSet`.
- `runDeliveryPass`, `markSent`, and the `drainDeliveries` loop with its termination argument and its
  `passes` refusal. Moved to the core's worker.
- `sut.taxonomy`, `sut.documentedDefaults`, `sut.senders`, `sut.runtimeRegistrationSurface`,
  `sut.emit`. Now thin maps onto the core.

Survives as a port implementation.

- `MutableState` and its arrays become the in-memory `OutboxPort`. It keeps the `event-${n}` id
  scheme, minted after the fault point, because `conformance.selftest.ts` asserts that a crashed emit
  consumes no id and that the survivor is `event-1`.
- The `vendors.email.deliver` call becomes the loop `ProviderPort`, wrapping a synchronous seam in a
  promise.
- `world.actors` becomes the loop `DirectoryPort`.
- `ControlledClock` becomes the loop `ClockPort`, and `processEpoch` becomes the loop `ProcessPort`.
- `NotificationFixtureWorld` survives whole. It is the loop fixture producer. `WorldOf<'req-016'>`
  resolves to this class, so every test body's `w` is typed from it and it cannot be replaced by an
  object literal.
- `reachFaultPoint` survives as the loop `faultSwitch`, reached in process.
- `payloadFor` survives, but moves to `tests/at/suites/req-016/_fixture-producers.ts` and is shared by
  both bindings. It is producer data, not emitter behaviour. The real producer supplies a real reason.
  The fixture producer supplies a stated one. Neither is the emitter's business, and putting sample
  copy in the product would be putting test data in the product.

That is roughly sixty percent of the current file deleted and re-landed as product code, which is the
bet paying out.

### The live adapter

`tests/at/suites/req-016/_live.ts` exports `requirement = 'req-016' as const` and
`createLiveAdapter({ stack })`. It calls `mailIdentification(stack)` and `sqlClient(stack)` exactly as
the auth suite does, and it builds the six bindings.

- **Outbox.** `sqlClient` calling `fixture_commit_transition_and_emit`, `apply_delivery_results` and
  three scoped selects. Every read is scoped to the open world's actor ids, because one integration run
  shares one database and AT-016.09 opens twenty-two worlds and requires that a fresh world observe
  nothing from an earlier one. The scope is data, not bookkeeping. Deliveries are selected by
  `recipient_id = any($actors)`, events by the ids those deliveries name, ops items by
  `linked_event_id` in that set. A crashed emit leaves no delivery and therefore no event, which is
  exactly the answer AT-016.09 reads.
- **Provider.** SMTP to Mailpit on 44325, with idempotent replay. Before sending, the binding asks
  Mailpit whether a message carrying this idempotency key already exists. If one does it answers
  `accepted` and sends nothing. Otherwise it sends with `Message-ID: <key>` and headers
  `X-Notification-Event-Id`, `X-Notification-Recipient-Id` and `X-Notification-Channel`, and answers
  `accepted` on a 250. A stated refusal is `rejected`. A timeout is `no_ack`.
- **Directory.** SQL. `ngo` is the seat holder in `public.org_memberships` for this world's
  organisation. `volunteer` is `public.projects.assigned_volunteer_id` for this world's project.
  `platform_admin` and `ex_volunteer` come from the world's own record, because neither has per-scope
  storage in this schema and inventing one would be building another requirement's surface early.
- **Clock.** `Date.now`.
- **Process.** The adapter's epoch string.
- **World.** `fixtures.world(name)` provisions four accounts through `POST /auth/v1/admin/users` with
  `email_confirm: true`, which sends no mail and therefore never touches the `email_sent = 2` per hour
  auth limit, then writes `public.accounts` rows as the operator, one organisation with the NGO seat
  and one project with the volunteer seat. Addresses are namespaced per world exactly as `req-001`
  does. `reassignRole(role, label)` mints or finds an account for the label, moves the real row, and
  returns the account id it moved to, so `w.reassignRole('ngo', 'at-016.10-successor')` really moves
  the role in the source the directory reads.
- **Faults and sentinels.** Two points as described. One sentinel scope,
  `notifications.delivery_bodies`, read as `select body from public.notification_deliveries` scoped to
  the world.

Methods a unit has not landed yet throw `new CapabilityPending(['sut.notifications.<name>'])`, one per
name, exactly as `req-001`'s live adapter does for its four unbacked families. That is what lets the
six units land one at a time behind a file whose mere existence opens the gate.

### The static provider scan, without touching the harness

`h.static` is hard-coded as a refusing proxy at every tier and no adapter can supply it. I do not
change that. `tests/at/suites/req-016/_source-scan.ts` is the witness instead, on the precedent of
`tests/at/suites/req-001/_source-scan.ts`, which is a suite-local source oracle in a file `at:check`
ignores, imported by test bodies at both tiers.

It exports two functions.

```ts
/** Components whose SOURCE holds a send path or a provider credential. */
export function providerClientImporters(): string[];
/** Where the migration's seeded event names and the product's TAXONOMY disagree. */
export function taxonomySeedProblems(): string[];
```

`providerClientImporters` walks `supabase/functions/**`, `src/**` and the migrations, and reports the
component id of every file that names a send path or a credential. A send path is a call to
`deliver(`, an import of an SMTP or provider client, or a reference to `ProviderPort`. A credential is
one of the declared provider credential names. Files map to component ids through
`NOTIFICATION_COMPONENTS` in the product module, and a file matching no declared component is reported
under a path-derived id so that a new sender is an unexpected entry rather than an invisible one. The
oracle throws when it cannot read a directory or when it finds zero hits, because an instrument that
reports an absence it did not measure is the false green this whole arrangement exists to remove.

AT-016.01's first assertion becomes `expect(providerClientImporters().sort()).toEqual(['notifications.emitter'])`
at both tiers. The assertion is not weakened. It is re-homed from a capability nobody implemented onto
an oracle that actually runs, and the manifest's loop red for AT-016.01 becomes a green in the same
commit. `h.static` stays in the harness contract, unread by this suite, for whoever implements it.

`senders()` stays a separate artifact from the scan, and that separation is the point. The scan reads
the tree. `senders()` is the architecture's self-report. AT-016.01 compares them. If `senders()`
derived from the scan the two witnesses would collapse into one and the id would prove nothing.

## Per-id plan

`h.static` is not read by any body after this change, so it never forces an integration procedure.
`h.vendors` and `h.clock` still do.

| id | needs from the product | needs from the seam | `integration:` procedure | witness at integration |
|---|---|---|---|---|
| AT-016.01 | `senders()`, emitter stamps `emitted_by`, copy carries producer strings | sentinels scope, world `fire`, source oracle | **yes**, the loop body reads `h.vendors.email.attempts()` | source oracle over the tree, plus Mailpit. Every message addressed to this world carrying `X-Notification-Event-Id` names an id that exists in `notification_events`. Sentinel values found in `notification_deliveries.body`, every carrying row stamped `notifications.emitter` |
| AT-016.02 | `taxonomy()`, closed set, `emit()` refusal, `runtimeRegistrationSurface()` | none beyond `sut` | no, single body | `sut.taxonomy()` equals `taxonomy.ts`, `taxonomySeedProblems()` empty, and `select count(*)` on events and deliveries unchanged across the rejected emit and a drain |
| AT-016.03 | recipients, effective channels, payload rendering, ops items, escalation | one capture over one world, `w.fire` per row | **yes**, the loop capture reads `h.vendors.email` | delivery rows read as the operator for the pairs, and the Mailpit body for each email pair as the copy the payload predicates run against |
| AT-016.04 | the sensitive negatives hold in the same capture | the integration capture | **yes**, it consumes a different capture object | delivery rows, plus a negative Mailpit check that no message for a candidacy or match-log event was addressed to the world's NGO address |
| AT-016.05 | class channel rule honoured, in-app never reaches the provider | the integration capture | **yes**, the loop body reads `h.vendors.email.accepted()` | Mailpit. Per row, the accepted pairs are exactly the pairs the row owes on email, counted by `Message-ID`, and no message exists for a non-email channel |
| AT-016.06 | `documentedDefaults()` with a non-empty source | the integration capture | **yes**, same reason as .04 | the product's own defaults, checked against `taxonomy.ts` and the class rule, which are upstream of the product |
| AT-016.07 | unique pair index, durable outbox, epoch stamping | `h.faults.processEpoch` and `processRestart`, both present at integration | no, single body | the delivery rows after the restart, all stamped with the post-restart epoch, one row per pair enforced by the schema |
| AT-016.08 | the thread-comment guard reads its configuration and the clock | `h.config` at both tiers, `w.burstThreadComments` | **yes**, the loop body commands `h.clock` | delivery row counts on the `volunteer:inapp` pair, over real elapsed time, with the two configurations passed through the world name |
| AT-016.09 | one transaction across transition and write, the fault point inside it | `h.faults.at(point,'crash')`, `w.transitionCommitted` | no, single body | four operator reads after the crash, all empty, plus a control run that commits both, plus the sequence-based trigger count agreeing with the refusal count |
| AT-016.10 | recipients frozen on the event row | `w.reassignRole` | no, single body | delivery rows name the original holder while `org_memberships` names the successor |
| AT-016.11 | sent only on acceptance, retry, idempotent replay | `h.faults.at('notifications.provider_send', kind)` | **yes**, the loop body drives `h.vendors.email` | Mailpit holds exactly one message per idempotency key, delivery rows show `retrying` between passes, `attempts` at least two |
| AT-016.12 | escalation row reaches NGO and admin | the integration capture | **yes**, same reason as .04 | delivery rows for both roles with the world's two account ids |

Eight integration procedures. AT-016.02, .07, .09 and .10 stay single-body, which is the same four the
exploration predicted.

Two notes on the procedures.

**AT-016.08 passes its configuration through the world name.** The live factory receives only
`{ stack }`, so `h.config` never reaches it. The world NAME does reach it, through
`h.fixtures.world(name)`. The integration procedure reads the pinned values back from `h.config` and
opens `req-016/guard?cap=<cap>&window=<ms>&coalesce=<bool>`, so the numbers the body asserts against
and the numbers the guard runs on are one value read once. It uses two explicit configurations with
short windows, three and five seconds, and waits real time. The criterion asks for a test-pinned
configuration and says production values remain unstandardized, so two explicit pins are more faithful
than one registry default, and a product that hard-coded the registry's sixty second window fails the
reset assertion. The id carries `timeoutMs: { integration: 60_000 }`.

**AT-016.09 needs a budget.** Twenty-two worlds, each provisioning four accounts, an organisation and
a project. `timeoutMs: { integration: 240_000 }`, the same value the auth suite uses for its two
real-time bodies.

## The six units

The brief fixes the order. I keep it. What I change is the shape of the first unit, and I say why.

**Unit 1, one shared emitter and the static event table. AT-016.01, AT-016.02.**
Files: both migrations, `notification-taxonomy.ts`, `notification-copy.ts`, `notifications.ts`,
`_fixture.ts` (rebound onto the core for the taxonomy, senders and registration surface),
`_source-scan.ts`, `_live.ts` (spine plus refusals), `_integration.ts` (the AT-016.01 procedure),
`_mail-witness.ts`, `_fixture-producers.ts`, `config.toml`, `_policy-scan.ts`,
`conformance.selftest.ts`, the manifest.
Turns green: AT-016.01 and AT-016.02 at both tiers, and AT-016.01 additionally at the loop tier where
it is red today.

**Unit 2, the full taxonomy matrix. AT-016.03, AT-016.04.**
Files: the 48 rows gain recipients, payload keys, ops items and escalation; `notification-copy.ts`
gains its per-event templates; `_fixture.ts` loses `payloadFor` and `bodyFor`; `_live.ts` gains the
directory binding and the ops-item read; `_integration.ts` gains the integration capture.
Turns green: AT-016.03, AT-016.04, and in practice AT-016.10, which is satisfied the moment recipients
are frozen on the event row. The manifest declares .10 green here rather than at unit 5, because
`--expect` fails a declared red that goes green.

**Unit 3, delivery defaults. AT-016.05, AT-016.06.**
Files: `DEFAULT_BY_CLASS` and `documentedDefaults()` with a stated source per class; `_integration.ts`
gains the provider-side arm of the capture.
Turns green: AT-016.05, AT-016.06.

**Unit 4, one notification per committed event and the anti-spam guard. AT-016.07, AT-016.08.**
Files: the worker moves into the core; `applyPassResults` lands in the migration; the guard lands in
`notifications.ts`; `_live.ts` gains `processRestart`; `_integration.ts` gains the AT-016.08 procedure.
Turns green: AT-016.07, AT-016.08.

**Unit 5, the atomic emitter-outbox contract. AT-016.09, AT-016.10.**
Files: `fixture_commit_transition_and_emit` gains its fault branch and the sequence; `_live.ts` gains
the fault switch and the two-witness trigger count; `_fixture.ts`'s fault switch is re-expressed
through the same seam.
Turns green: AT-016.09. AT-016.10 was already green at unit 2 and is re-verified here.

**Unit 6, sent only on provider acceptance. AT-016.11, AT-016.12.**
Files: the provider fault decorator; the Mailpit idempotent replay; `_integration.ts` gains the
AT-016.11 procedure.
Turns green: AT-016.11, AT-016.12.

### Where the unit boundaries cut across something that cannot be split

Three cuts. I name each and say what I would do.

**One. Unit 1 is not "the emitter" alone, and cannot be.** At the integration tier AT-016.01 fires
`blocker.raised`, which is an email and in-app row, drains it and reads the delivered copy. So unit 1
already needs the tables, the emit path, the worker, the world, the fixture producer and the SMTP
provider. The brief's unit 1 is a product decomposition. At the integration tier the first observable
emitter is the whole spine. What I would do: land unit 1 as five commits in one group, schema, core,
loop rebinding, live spine, seam and manifest, and say in the decision trail that unit 1 is the spine
and units 2 to 6 are increments on it. That is also why unit 1 goes to the hardest-tasks lane and
units 2, 3, 4 and 6 go to the feature lane. Unit 5 goes to the hardest-tasks lane too, because the
fault mechanism has no precedent in this tree.

**Two. Units 2 and 3 cannot be separated at the integration tier.** AT-016.03 binds every
`channels: null` row to the documented default, and twenty-five of the forty-eight rows are such rows.
So AT-016.03 cannot pass until `documentedDefaults()` is right, which is AT-016.06's subject. The five
ids .03, .04, .05, .06 and .12 additionally share one evidence capture, which asserts
`evidenceBuilds === 1` under `describe.sequential`, so the producer runs once and all five consume it.
What I would do: keep the two units and their verify lines exactly as written, land them as one commit
group of two commits, and flip five manifest ids on the second commit. I would not fake a split by
having unit 2 declare a default it calls an implementation detail and unit 3 rename it documentation.

**Three. The `_live.ts` gate is all or nothing.** The file's mere existence turns every id from the
declared stand-in refusal into a real run, and unit 1 creates it. What I would do is what `req-001`
already does. Every method a later unit lands throws `CapabilityPending` naming itself, the manifest
declares each id red on exactly those names until its unit lands, and each unit's commit moves its own
ids from red to green. That keeps every unit independently verifiable with `bun run at:verify req-016
--tier integration --expect`, which is what "each unit green before the next starts" has to mean here.

There is a fourth thing that is not a cut but is worth flagging in the same breath. Unit 1 changes
`tests/at/harness/conformance.selftest.ts`, because that selftest asserts
`liveAdapterExists('req-016') === false` and that `createHarness` above loop for `req-016` rejects.
Both become false the moment `_live.ts` exists. The edit re-points those two assertions at a
requirement that has no live adapter, so the rule is preserved and only its example changes.

## Rubric answers

### 1. Atomicity by construction

The transaction boundary is one database call. `outbox.append` is one
`select public.fixture_commit_transition_and_emit($scope, $write, $induceFault)` over PostgREST or the
operator connection, and one call is one implicit transaction. Inside it the transition upsert runs
first, the fault point runs second, the event, deliveries and ops item run third. A `raise` at the
fault point rolls back the transition with everything else, so all four of AT-016.09's reads come back
empty. No compensating logic exists anywhere, because there is nothing to compensate.

The fault point is raised in SQL, in the producer function, between the transition statement and the
call to `emit_notification`. Its name asserts exactly that position and the code matches the name.

The trigger count survives the rollback because it is taken from a sequence.
`perform nextval('public.notification_fault_triggers')` immediately precedes the raise, and `nextval`
is not transactional, so the rollback cannot undo it. The adapter reads
`pg_sequence_last_value` before arming and again at `triggerCount()` and reports the difference. It
independently counts the refusals it received carrying
`detail = 'induced-fault:notifications.between_transition_and_event_write'`, and it throws when the
two numbers disagree. So the count is the product's, the adapter cannot invent one, and a
disagreement between the two witnesses is a loud failure rather than a quiet number.

For a real producer the boundary does not move. Its own definer performs its ledger statements and
ends with `perform public.emit_notification(p_notification)`, in the same transaction, and the write
set was prepared by the same core before the call.

### 2. Sole writer, structurally

Four layers, none of them convention.

- **Privileges.** The three notification tables and the event-type table revoke everything from `anon`,
  `authenticated` and `service_role`, and enable row level security with no write policy. No client
  role can write them at all. `service_role` holds nothing, so the `service-role-write` scan finds
  nothing to report and the live catalog check reads `[]` for all three roles.
- **Reachability.** `emit_notification`, `apply_delivery_results` and
  `fixture_commit_transition_and_emit` are `security definer` with `revoke execute from public` and no
  grant to any role. Only the owner and another definer executing as the owner can call them. There is
  no grant a future route could accidentally rely on.
- **Schema.** `notification_deliveries.emitted_by` carries `check (emitted_by = 'notifications.emitter')`.
  A row claiming another writer cannot exist.
- **Types.** `OutboxPort.append` takes a branded `WriteSet` whose brand symbol is declared inside
  `notifications.ts` and never exported. `prepareWriteSet` is its only constructor. A second sender
  would have to write a cast, which is a decision somebody takes rather than a mistake they make.

The source-level scan proves it from outside the subject. `providerClientImporters()` walks the
product tree for send paths and provider credentials, maps files to declared component ids, and
AT-016.01 asserts the result is exactly `['notifications.emitter']`. It throws rather than reporting an
empty result when it cannot read the tree. Beside it, `senders()` is the architecture's own report and
the two are compared, never derived from one another.

One residual, stated because a claim wider than the truth is worse than a narrow one. `blockers.service`,
`scope.service` and `lifecycle.service` do not exist as product files yet, so the scan proves an
absence in code nobody has written. `NOTIFICATION_COMPONENTS` declares the paths those components will
own, so the day one lands with a send path the scan reports it. Until then the probe is a standing
claim rather than a measured one, and AT-016.01's own body checks that the three probes are present so
the assertion is at least not vacuous about the report.

### 3. One taxonomy, one source

The 48 rows are declared once, in `supabase/functions/_shared/notification-taxonomy.ts`. There is no
second copy in the product. The database holds only the wire names, derived from that array and seeded
by the migration.

Equality is proved twice, from two directions.

- At run time, AT-016.02 compares `sut.taxonomy()` against the suite's `taxonomy.ts`, in both
  directions, with duplicate and forbidden-pattern checks. The suite's table is an independent
  transcription, so it can disagree.
- Statically, `taxonomySeedProblems()` compares the migration's seeded names against the product array
  and is asserted empty in both tier bodies of AT-016.02. That runs in CI at the loop tier, so a drift
  is caught before any stack is involved.

The documented defaults are data, not comments. `documentedDefaults()` returns one row per event with
`channels` and a non-empty `source`. For a row that names channels the source cites the taxonomy row.
For a `channels: null` row the source cites `DEFAULT_BY_CLASS`, which carries one sentence per class
saying why that class delivers where it does. The same function computes the channels the emitter
actually uses, so the documentation and the behaviour are one expression and cannot disagree.

The defaults satisfy the class channel rule by construction. `money`, `deadline`, `blocker`,
`completion` and `decision` bind to `['email','inapp']`, which includes email as the rule demands and
matches the brief's own words for unit 3. `lowtone` binds to `['inapp']` exactly. `access` binds to
`['email','inapp']`, which agrees with both access rows that name their channels. `other` binds to
`['inapp']`, where the rule is silent and the requirement names nothing. AT-016.06 additionally checks
that no documented default contradicts a row that names its channels, and the single function makes
that impossible.

### 4. Honest at both tiers

Loop and integration run the same core. What differs is the binding, and the per-id table above says
exactly what each id runs at each tier.

Eight ids need an `integration:` procedure. AT-016.01, .03, .04, .05, .06, .08, .11 and .12. Seven of
them because their loop procedure reads `h.vendors.email`, which does not exist at integration. One,
AT-016.08, because its loop procedure commands `h.clock`, which at integration has `now()` and nothing
else. AT-016.02, .07, .09 and .10 stay single-body, because every seam they touch, `sut`, `w`,
`h.faults` and `h.config`, exists at both tiers.

The email provider simulator is replaced as the send witness by **Mailpit, read directly by the test
body**. The integration procedures import `stackFromEnv()` and `readJson` from
`tests/at/harness/live-stack.ts` inside `tests/at/suites/req-016/_mail-witness.ts`, list the catcher's
messages and parse `Message-ID`, `X-Notification-Event-Id`, `X-Notification-Recipient-Id` and
`X-Notification-Channel`. That gives the same three things `EmailProviderSim` gave. Every send that
arrived, keyed by pair. Every send the provider accepted, counted by key. A record written by
something other than the sender. Messages are scoped to the world's namespaced addresses, so a
previous run's mail cannot be mistaken for this one's, and Mailpit is not cleared destructively.

Nothing in this design assumes `h.vendors` above the loop tier, and nothing assumes `h.static` at any
tier.

### 5. Passes the standing gates

Five new tables. Every one is `unreachable-by-client-roles`, every one gets a `TENANT_CATALOG` row in
`tests/at/suites/req-001/_policy-scan.ts` in the same change.

| table | posture | grants | policies |
|---|---|---|---|
| `notification_event_types` | unreachable-by-client-roles | none | none |
| `notification_events` | unreachable-by-client-roles | none | none |
| `notification_deliveries` | unreachable-by-client-roles | none | none |
| `notification_ops_items` | unreachable-by-client-roles | none | none |
| `notification_fixture_transitions` | unreachable-by-client-roles | none | none |

Each table's migration follows `create table`, then
`revoke all on table ... from anon, authenticated;`, then `revoke all on table ... from service_role;`,
then `alter table ... enable row level security;`. The migration ends with `notify pgrst, 'reload schema'`.

The CI check each choice satisfies.

- `undeclared-table` and `missing-table`, satisfied by the five catalog rows landing in the same commit
  as the migration.
- `no-baseline-revoke`, satisfied by the two revoke statements per table.
- `anon-privilege` and `unreachable-client-grant`, satisfied because nothing is granted to anybody.
- `service-role-write`, satisfied for the same reason. The worker does not write through
  `service_role`. It calls definers as the owner over the operator connection at integration, and it
  will call them from a producer definer in production.
- `definer-no-revoke`, satisfied by `revoke execute on function ... from public` after each of the
  three functions.
- `definer-client-execute`, satisfied because no function grants execute to `anon`, `authenticated` or
  `public`.
- `definer-no-write-gate`, not triggered. That rule fires only for a volatile definer that
  `service_role` may execute. None of the three is granted to `service_role`, so no
  `assert_account_active` call is required and no `WRITE_GATE_EXEMPT` entry is needed. This is a
  deliberate design choice, not a loophole. The notification writer has no caller who is an account,
  so a lifecycle gate on it would be a check with no subject.
- `audit-mutation-in-definer`, satisfied because nothing here touches `public.audit_events`.
- The write-route conformance scan, satisfied by adding **no function directory at all**. There is no
  `supabase/functions/notifications-*/index.ts`, so `write-route-unregistered`,
  `write-route-not-constructed`, `write-route-missing-entry` and `write-route-jwt-unverified` cannot
  fire. The three new `_shared` modules are pure and name none of the bypass patterns, so
  `shared-module-reaches-database` cannot fire. `WRITE_ROUTES` gains no row.
- The live catalog check in `tests/at/suites/req-001/_integration.ts` enumerates every public table and
  every `SECURITY DEFINER` function. The five tables read `anon []`, `authenticated []`,
  `service_role []`, force RLS false. The three functions read `anonExecute false` and
  `authenticatedExecute false`, which is what `VIEWER_FUNCTIONS` membership decides and none of them
  is a viewer. This is why the brief asks for the auth suite at both tiers, and this design requires
  it.
- `public.notification_fault_triggers` is a sequence. The live catalog query filters
  `relkind = 'r'`, so a sequence is invisible to it, and the static scan only models `create table`.
  The migration still revokes all on it from the three client roles.

One configuration change. `smtp_port = 44325` is uncommented in `supabase/config.toml`. It adds a key
rather than changing `[local_smtp] port`, so `configDriftProblems` sees no change in the four fields
it holds. The stack must be stopped and started once after that commit, because Supabase reads the
config at container start and `db reset` does not reload it. That is a step in the verification
section of the pull request, not a hope.

One harness file changes, `tests/at/harness/conformance.selftest.ts`, and the argument for it is
narrow. Nothing is added to the harness. No new sentinel, fault, vendor stand-in, fixture world or
capability. Two assertions in a selftest name `req-016` as the example of a suite with no live adapter,
and after this change no such example exists among the registered suites, so they are re-pointed at an
unregistered requirement id. The rule under test is unchanged and still fails if the harness stops
refusing.

### 6. Retry without duplication

The idempotency key is `ntf:<event_id>:<recipient_id>:<channel>`. It lives on the delivery row, in
`notification_deliveries.idempotency_key`, `not null` and `unique`, derived by the binding at emit
time from the row's own identity. The worker never computes it, so it cannot compute it differently on
a retry.

It survives a process restart because it is a column, not a variable. `processRestart()` discards the
worker object and builds a new one, which re-reads `pending()` from the table and finds the same rows
with the same keys.

It survives a lost acknowledgment because the provider binding presents it and the provider answers on
it. At the loop tier the simulator's identity is the same triple, and a replay of an accepted identity
returns `accepted` while adding nothing to `accepted()`. At the integration tier the SMTP binding asks
Mailpit whether a message carrying this key already exists before it sends. When one does it answers
`accepted` and sends nothing, so the catcher holds exactly one message per key however many times the
worker retried.

A retry cannot mint a second delivery on a pair that already has one, for a reason that has nothing to
do with the worker being careful. The worker never inserts. `append` inserts, once, at emit. The worker
only updates rows that exist, and `unique (event_id, recipient_id, channel)` means at most one row can
exist per pair. A second delivery for a pair is not a bug the worker avoids. It is a row the database
refuses.

And a delivery is marked sent only on `accepted`. `rejected` and `no_ack` both set `retrying`, because
the sender cannot tell a lost acknowledgment from silence and must not pretend it can.

## Rationale

What I considered inside this direction and rejected. The rejections are the load-bearing part.

**Rejected: the emitter in SQL, with the taxonomy as a table.** This is the obvious way to get
atomicity, and it is what the exploration's "what must be built" leans toward. One definer computes
recipients, channels, copy and ops item from taxonomy tables, and the producer calls it. I rejected it
because it kills the bet outright. The loop tier has no database, so the loop tier would need a second
implementation of every one of those decisions, in TypeScript, and the suite would grade a stand-in
forever. It also puts the copy renderer and the payload predicates in plpgsql, where the type system
is gone and where `taxonomy.ts`'s payload semantics are hardest to satisfy. The cost of my choice is
that the write set is computed outside the transaction, which I address next.

**Rejected: the write set computed inside the transaction by a definer that calls back out.** There is
no callback. Postgres cannot call TypeScript. Considered and dismissed in one line, recorded because a
reader will ask.

**Rejected: two round trips, one for the transition and one for the emit, wrapped in an explicit
transaction from the client.** This would let the core drive the transaction. It fails for the reason
`edge.ts` already documents. There is no transaction helper in this tree, `callDatabaseFunction` is one
round trip by design, and a producer running in an edge function has no session to hold a transaction
open across two calls. It would also make atomicity a property of the caller rather than of the
schema, which is exactly the property AT-016.09 exists to refuse.

**Rejected: a fault control table read by the definer.** The exploration expected this, and it is a
reasonable design. I rejected it because it needs a `create table public.X`, a `TENANT_CATALOG` row,
and a second writer of test state into the product schema, and because the arming then has to be
visible across connections, which is where the session GUC idea fails. Passing the arming as an
argument of the fixture producer's own call needs none of that and puts the fault where the design
already says faults live, in the binding.

**Rejected: counting fault triggers with a counter table.** A row incremented before the raise is
rolled back with it, so the count reads zero afterwards and every atomicity test passes on a fault
that never fired. That is the trap. A sequence is the mechanism because `nextval` is outside
transactional control.

**Rejected: counting only the adapter's refusals.** It would work, and it needs no sequence. I kept it
anyway, as the second witness, and made disagreement fatal. A count owned entirely by the adapter is a
count the product never confirms, and this suite exists because that shape is how false greens get
bought.

**Rejected: a new edge function for the emitter or the worker.** A worker has no JWT caller, so
`writeRoute` cannot serve it, and a function directory that reaches the database without a
`WRITE_ROUTES` row fails `write-route-unregistered`. Adding a row and a route would mean designing the
production host for the worker, which no requirement has settled and which the decomposition puts in
the wiring leaf. The pure core plus ports shape needs no function directory at all, so this run adds
no deployed surface and no new attack surface.

**Rejected: exposing the mail witness on the SUT or the world.** It cannot be done. `SutOf` and
`WorldOf` derive from the loop fixture, so an integration body can only see members that exist on the
loop types, and `NotificationsSut` has no mail method. Even if it could be done it should not be. A
witness reached through the subject is the subject reporting on itself. The body reading Mailpit
directly is the honest shape and needs no seam at all.

**Rejected: the guard inside the emit path.** I considered making the thread-comment anti-spam guard
part of `emit`, so that every producer inherits it. It fails against the suite's own behaviour.
`w.fire('thread.comment')` in the evidence capture and in AT-016.01 must produce a delivery, while
`w.burstThreadComments(cap + 5)` must produce `cap`. The guard is therefore a property of the
thread-comment producer, not of the emitter, and I kept it where the fixture already puts it. Its
decision function is in the core so both bindings share it.

**Rejected: `other` class rows defaulting to email and in-app.** It would make `provisioning.failed`
and `lovable.credits_blocked` louder, and I think a real product would want that. I rejected it
because no requirement says so, and a documented default needs a defensible sentence, not a
preference. It goes in the "not done here" list as a product question for the founder.

**Rejected: keeping `h.static` and implementing a `StaticScan` in the harness.** It is the reading of
AT-016.01 that changes least. It also means new harness machinery, which this tree forbids without an
explicit argument, and a component-id mapping the `StaticScan` contract does not specify. The
suite-local source oracle is the sanctioned precedent, it runs at both tiers, and it turns a
permanently red id green.

**Rejected: provisioning world actors through the public signup order.** It is the product path and it
is what `req-001` does deliberately. Here it would cost two confirmation emails per world against an
`email_sent = 2` per hour limit, and AT-016.09 opens twenty-two worlds. REQ-016 does not test signup.
The admin API with `email_confirm: true` sends no mail, and the operator writes the `public.accounts`
row, which is exactly the authority `provisionPlatformAdmin` already uses.

## Where this direction strains

**The core cannot be in the transaction, and one day that will bite.** Deciding before the transaction
means a future producer definer must be handed a prepared write set. If somebody writes a producer
that performs its ledger transition and forgets the `p_notification` argument, the transition commits
with no notification and nothing fails. A design with the emitter in SQL would make that impossible,
because the producer would call one function that does both by construction. My mitigations are a
`not null` parameter on each guarded producer's definer and a future source-oracle rule that every
definer writing a guarded producer's table must name `public.emit_notification`. Neither exists yet,
because neither producer's table exists yet. This is the single place where the alternative direction
is better, and it costs the price of a rewrite of `prepareWriteSet` into plpgsql if it ever has to be
paid.

**The product has no production adapter.** Every port has a loop binding and an integration binding,
and the integration binding lives in `tests/at/suites/req-016/_live.ts`. So the shipped product is a
core, a schema and no host. That is honest for this run, because the worker's home is an open question
and the wiring leaf is out, but a reader should not mistake an integration green for a deployed
subsystem. A design that put the worker in an edge function would have less to explain here and more
to explain at the write-route scan.

**SMTP has no idempotency, so the provider binding emulates one.** Asking the catcher whether a key
already arrived is a real technique and a real provider offers a better one, but it is a read of the
provider's own store standing in for a contract the wire does not have. It is the weakest joint in the
delivery path. It is behind a port, which is the direction's answer to weak joints, and replacing it
with a hosted provider's idempotency key is a change to one file.

**Adapter-scoped reads.** One integration run shares one database, and the suite opens many worlds per
id, so the live adapter scopes every read to the open world's actor ids. That is derived from data
rather than remembered, which is the better of the two options, but it does mean a stray row written by
something else in the same database would be invisible to `sut.deliveries()`. AT-016.01's Mailpit
orphan check is the counterweight and it only covers email.

**`ex_volunteer` has no storage anywhere.** The directory resolves it from the world's own record at
both tiers. When REQ-027 lands it will resolve from a release record. Until then `abandonment.released`
proves that the emitter delivers to the id the directory gives it, and not that the platform knows who
the ex-volunteer is.

**The guard's window is in memory.** The thread-comment guard's state lives in the producer, which is
the adapter, at both tiers. AT-016.08 pins configuration conformance and coalescing, not durability
across a restart, so nothing is overclaimed. A real REQ-015 producer will need a durable window and
that is a table this run does not add.

**The first unit is large.** Splitting the spine further would mean landing an emitter nothing can
observe, and I would rather say the unit is large than pretend it is small. If the founder wants a
smaller first commit group, the honest split is to land the loop rebinding and the source oracle first,
with `_live.ts` withheld, so the integration gate stays shut for one more commit. That keeps AT-016.01
and AT-016.02 red at integration for a commit longer and green at loop immediately.
