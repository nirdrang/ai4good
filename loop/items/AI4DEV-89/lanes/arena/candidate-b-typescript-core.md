# Candidate B. The notification domain in pure TypeScript, Postgres as a dumb outbox

Every path is relative to the worktree root. Every claim about the tree was checked against the files the task named. Where I could not check something, I say so.

### Direction

The whole notification domain lives in one pure module, `supabase/functions/_shared/notifications.ts`. That module holds the forty-eight rows as a typed const, the documented defaults as data, recipient resolution, channel resolution, body rendering, the anti-spam guard decision, and the delivery worker's decision logic over two injected ports. It has no Deno, no fetch, no clock and no randomness, so the `tests/at` TypeScript program type-checks it and both the loop stand-in and the live adapter import it. Postgres holds three dumb tables and one narrow definer, `public.emit_notification_batch(jsonb)`, which inserts a batch the TypeScript already computed. The producer's own definer calls that emitter after its state transition, inside its one transaction. The single bet is this. One typed source of the rules, graded at the loop tier by the suite's independent oracle and exercised at the integration tier by the same code, is worth the cost of computing the batch before the transaction opens and handing it in as an argument.

### The data shape

The taxonomy is a `const` array of forty-eight typed rows, declared once, in the product module. Not a table, not a registry with a mutation surface, not a state machine. A `const` array with `as const satisfies readonly NotificationRow[]` gives three things the suite grades. The event names are literal types, so `EventName` is a closed union and an unregistered name is a compile error in product code. There is no runtime registration surface, because a const has no `add` method, and `runtimeRegistrationSurface()` returns `[]` truthfully. The rows are data, so `taxonomy()` and `documentedDefaults()` serve them without transformation. The cost is that the database does not know the forty-eight names. The emitter definer trusts the batch it is handed. I return to that cost under Rubric 3 and under Strains.

```ts
// supabase/functions/_shared/notifications.ts
export type Role = 'ngo' | 'volunteer' | 'ex_volunteer' | 'platform_admin';
export type Channel = 'email' | 'inapp';
export type EventClass = 'money' | 'deadline' | 'blocker' | 'completion' | 'decision' | 'access' | 'lowtone' | 'other';

export type NotificationRow = {
  readonly event: string;
  readonly recipients: readonly Role[];
  readonly channels: readonly Channel[] | null;   // null = bound to the documented default
  readonly tone: 'normal' | 'low';
  readonly class: EventClass;
  readonly payloadKeys?: readonly string[];
  readonly guarded?: true;
  readonly opsItem?: true;
  readonly escalation?: true;
};

export const NOTIFICATION_TAXONOMY = [ /* 48 rows, same wire names as the suite's taxonomy.ts */ ] as const satisfies readonly NotificationRow[];
export type EventName = (typeof NOTIFICATION_TAXONOMY)[number]['event'];
```

The types the module computes and the tables that store them.

```ts
/** A recipient directory snapshot. The CALLER reads it; the module never reads the database. */
export type RecipientDirectory = Readonly<Record<Role, string | null>>;

/** What the emitter definer inserts. Computed in TypeScript, carried into the transaction as jsonb. */
export type EmitBatch = {
  readonly event: EventName;
  readonly payload: Record<string, unknown>;
  readonly recipients: readonly { role: Role; recipientId: string; channels: readonly Channel[] }[];
  readonly deliveries: readonly { role: Role; recipientId: string; channel: Channel; body: string }[];
  readonly opsItem: { kind: EventName; detail: Record<string, unknown> } | null;
};

export type ComputeOutcome =
  | { accepted: true; batch: EmitBatch }
  | { accepted: false; reason: string };

export function computeBatch(event: string, directory: RecipientDirectory, params: Record<string, unknown>): ComputeOutcome;
```

Tables, all in one migration, `supabase/migrations/<stamp>_notification_outbox.sql`.

`public.notification_events`. Posture `unreachable-by-client-roles`.
- `id uuid primary key default gen_random_uuid()`
- `event text not null`
- `actor_account_id uuid` (from `current_setting('app.actor_account_id', true)`, the same setting the membership audit trigger reads; null when unset)
- `payload jsonb not null`
- `recipients jsonb not null` (the frozen array from the batch; AT-016.10's evidence)
- `state text not null default 'pending' check (state in ('pending','retrying','sent','failed'))`
- `attempts integer not null default 0`
- `created_at timestamptz not null default now()`

`public.notification_deliveries`. Posture `tenant-isolated`, one select policy for the recipient's own in-app rows. The screen is out of this run; the policy is the read path the twelve ids do not need but the later screen does, and it costs three lines now instead of a second migration later.
- `id uuid primary key default gen_random_uuid()`
- `event_id uuid not null references public.notification_events(id)`
- `event text not null` (denormalised so `deliveries({ type })` is one filter)
- `role text not null`
- `recipient_id uuid not null`
- `channel text not null check (channel in ('email','inapp'))`
- `state text not null default 'pending' check (state in ('pending','retrying','sent','failed'))`
- `emitted_by text not null default 'notifications.emitter' check (emitted_by = 'notifications.emitter')`
- `delivered_by_process text`
- `payload jsonb not null`
- `body text not null check (btrim(body, E' \t\r\n\f') <> '')`
- `created_at timestamptz not null default now()`, `sent_at timestamptz`
- `unique (event_id, recipient_id, channel)` named `notification_deliveries_one_per_pair`

`public.ops_items`. Posture `unreachable-by-client-roles`.
- `id uuid primary key default gen_random_uuid()`
- `kind text not null`
- `linked_event_id uuid references public.notification_events(id)`
- `detail jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Invariants the schema holds by itself. One delivery row per recipient-and-channel pair per event, by the unique constraint. No delivery row can name a writer other than the emitter, by the check. No client role can insert into any of the three tables, by the baseline revoke with no insert grant. The recipients on an event are a frozen jsonb written once and never updated, because nothing updates that column.

Two more types the worker needs, both ports the module never implements.

```ts
export type PendingDelivery = { id: string; eventId: string; recipientId: string; channel: Channel; body: string; email: string | null; idempotencyKey: string };
export type OutboxPort = {
  pending(): Promise<PendingDelivery[]>;
  recordOutcome(deliveryId: string, outcome: 'accepted' | 'rejected' | 'no_ack', epoch: string): Promise<void>;
  finishPass(eventIds: string[]): Promise<void>;
};
export type ProviderPort = {
  deliver(req: { idempotencyKey: string; eventId: string; recipientId: string; to: string; subject: string; body: string }): Promise<'accepted' | 'rejected' | 'no_ack'>;
};
export async function runDeliveryPass(outbox: OutboxPort, provider: ProviderPort, epoch: string): Promise<{ touched: number }>;
```

### The design

#### Files created or changed

Product.
- `supabase/functions/_shared/notifications.ts`. New. The pure domain module described above. Exports `NOTIFICATION_TAXONOMY`, `EventName`, `SENDERS`, `DOCUMENTED_DEFAULTS`, `documentedChannels(row)`, `computeBatch`, `renderBody`, `threadCommentGuard`, `runDeliveryPass`, and the port types.
- `supabase/functions/_shared/notifications-provider.ts`. New. The one file in the product that knows how to reach a mail endpoint. Two functions, both `fetch` only, no Deno. `mailpitProvider(baseUrl)` posts to Mailpit's `POST /api/v1/send` and returns `'accepted'` on 200, `'rejected'` on a 4xx with a body, `'no_ack'` on a timeout or 5xx. `resendProvider(apiKey)` is the production shape and posts to Resend with an `Idempotency-Key` header. Both put the idempotency key, the event id and the recipient id in message headers `X-AI4G-Idempotency-Key`, `X-AI4G-Event-Id`, `X-AI4G-Recipient-Id`. This module is what the source scan looks for.
- `supabase/migrations/<stamp>_notification_outbox.sql`. New. The three tables, their revokes, row-level security, the one policy, the emitter definer, three outbox definers, `notify pgrst, 'reload schema'`.
- `tests/at/suites/req-001/_policy-scan.ts`. Changed. Three `TENANT_CATALOG` rows. No `WRITE_GATE_EXEMPT` change in this run, because no new definer is granted to `service_role`.

Suite.
- `tests/at/suites/req-016/_live.ts`. New. `requirement = 'req-016'`, `createLiveAdapter({ stack })`.
- `tests/at/suites/req-016/_live-producers.ts`. New. The SQL text of the fixture producer schema `at_fixture`, applied by the live adapter at construction with operator SQL.
- `tests/at/suites/req-016/_provider-scan.ts`. New. The suite-local source oracle for AT-016.01, the shape of `req-001/_source-scan.ts`.
- `tests/at/suites/req-016/_integration.ts`. New. The eight `integration:` bodies and the integration evidence capture.
- `tests/at/suites/req-016/_fixture.ts`. Changed. It stops deriving from the suite's `taxonomy.ts` and becomes storage around the product module. Its taxonomy, defaults, senders, batch computation, rendering, guard decision and worker pass are all the product's. Its storage is arrays, its provider port is the harness simulator, its outbox port is in-memory.
- `tests/at/suites/req-016/_contract.ts`. Changed. `burstThreadComments(count, guard?)` gains an optional explicit guard configuration, for the live factory that never sees `h.config`.
- The four test files. Changed. Eight ids move to per-tier maps `{ default: loopBody, integration: at016NN }`. AT-016.01's first line imports `providerClientImporters` from `_provider-scan.ts` instead of reading `h.static`.
- `tests/at/expected/req-016.json`. Changed. Per unit, as the unit section says.

Not changed. `supabase/config.toml`. No SMTP port is needed because the provider client posts to Mailpit's HTTP send API on the web port the stack already exposes. `_shared/edge.ts`, `write-routes.ts`, no new function directory. See the strain on the Mailpit version.

#### The module, function by function

`SENDERS` is the four probes the suite reads, a const. `runtimeRegistrationSurface()` returns `[]`.

`documentedChannels(row)` is the documented default rule, and `DOCUMENTED_DEFAULTS` is that rule applied to every row with a `source` sentence. The rule. A row that names channels binds to them. A null-channel row of class money, deadline, blocker, completion or decision binds to `['email', 'inapp']`. A null-channel row of class lowtone binds to `['inapp']`. A null-channel row of class access or other binds to `['inapp']`, except a row that carries `opsItem` or `escalation`, which binds to `['email', 'inapp']` because an ops item and an escalation are operator-facing signals. The `source` string names the PRD slice line and the rule branch, for example `REQ-016 delivery defaults (loop/out/pure-s6-req-027-036.md line 25): critical class money, email and in-app`. This satisfies `CLASS_CHANNEL_RULE` for every class and equals the named channels wherever the row names them.

`computeBatch(event, directory, params)`. Finds the row by name, or returns `{ accepted: false, reason: 'unregistered event type' }` before anything else happens. Resolves each role to `directory[role]`, and refuses with a reason if a role the row needs is null. Builds the payload as `params` plus the named keys with their v1 copy, the same values `_fixture.ts` holds today, moved into the product. Renders one body per delivery with `renderBody(row, role, payload)`, which carries every string payload value into the copy and uses the leftover wording that names no donation. Computes the channels from `documentedChannels`. Emits `opsItem` for the three rows that carry one. Returns the batch. This is pure. Recipients are frozen here, which is the moment of event creation from the caller's side.

`threadCommentGuard(config, state, now)` returns `{ emit: boolean; state }`. `config` is `{ cap, windowMs, coalesce }`. The state is the window start, the count in the window, and whether the window has coalesced. The decision is the one the stand-in makes today, moved into the product.

`runDeliveryPass(outbox, provider, epoch)`. Reads `outbox.pending()`. For each row, an in-app row is recorded accepted without touching the provider. An email row is handed to `provider.deliver` with its idempotency key and the outcome is recorded. Every event the pass touched goes to `outbox.finishPass`. The rule "sent only on accepted" is one line in this function, and the loop tier drives it through the simulator's reject and lose-ack queues.

#### The migration, object by object

```sql
create table public.notification_events (...);
create table public.notification_deliveries (...);
create table public.ops_items (...);
revoke all on table public.notification_events, public.notification_deliveries, public.ops_items from anon, authenticated;
revoke all on table public.notification_events, public.notification_deliveries, public.ops_items from service_role;
alter table public.notification_events enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.ops_items enable row level security;
grant select on table public.notification_deliveries to authenticated;
create policy notification_deliveries_own_inapp on public.notification_deliveries
  for select to authenticated
  using (recipient_id = (select auth.uid()) and channel = 'inapp');
```

The emitter.

```sql
create function public.emit_notification_batch(p_batch jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_actor uuid := nullif(current_setting('app.actor_account_id', true), '')::uuid;
begin
  if p_batch->>'event' is null or jsonb_typeof(p_batch->'deliveries') <> 'array' then
    raise exception 'emit_notification_batch refuses a batch with no event or no deliveries'
      using errcode = '22023', detail = 'invalid-batch';
  end if;
  insert into public.notification_events (event, actor_account_id, payload, recipients)
  values (p_batch->>'event', v_actor, p_batch->'payload', p_batch->'recipients')
  returning id into v_event_id;
  insert into public.notification_deliveries (event_id, event, role, recipient_id, channel, payload, body)
  select v_event_id, p_batch->>'event', d->>'role', (d->>'recipientId')::uuid, d->>'channel', p_batch->'payload', d->>'body'
    from jsonb_array_elements(p_batch->'deliveries') d;
  if p_batch->'opsItem' is not null and jsonb_typeof(p_batch->'opsItem') = 'object' then
    insert into public.ops_items (kind, linked_event_id, detail)
    values (p_batch->'opsItem'->>'kind', v_event_id, coalesce(p_batch->'opsItem'->'detail', '{}'::jsonb));
  end if;
  return v_event_id;
end;
$$;
revoke execute on function public.emit_notification_batch(jsonb) from public;
```

No grant follows the revoke. No client role, `service_role` included, can execute it. It runs only when another definer calls it, in that definer's transaction, or when the operator calls it. The unique constraint on deliveries makes a batch that names a pair twice fail as a whole.

The three outbox definers, for the worker's port. All `security definer`, `set search_path = ''`, revoked from public, no grant in this run. The operator executes them at integration. When the production worker gets a home, the grant to `service_role` and the `WRITE_GATE_EXEMPT` entry land together with a reason, because a worker acts for no account.

- `public.notification_pending_deliveries() returns table (...)`, `stable`. Returns deliveries whose state is not `sent`, joined to `auth.users` for the address of an email row, with `idempotency_key` computed as `event_id::text || ':' || recipient_id::text || ':' || channel`.
- `public.notification_record_outcome(p_delivery_id uuid, p_outcome text, p_epoch text)`. On `accepted`, `set state = 'sent', sent_at = now(), delivered_by_process = coalesce(delivered_by_process, p_epoch)`. On anything else, `set state = 'retrying'`. The `coalesce` is the stand-in's "first send owns the stamp".
- `public.notification_finish_pass(p_event_ids uuid[])`. `attempts = attempts + 1` and state derived as `sent` when no delivery of the event is unsent, else `retrying`.

#### The emit path

From a producer's transition to a committed outbox row.

1. The producer's TypeScript reads the recipient directory for the subject. For a project that is the NGO seat holder, the assigned volunteer, and the platform admin on duty, through a read the route already has. This read happens before the transaction.
2. The producer calls `computeBatch(event, directory, params)`. A refusal ends here with nothing written.
3. The producer calls its own definer with the batch as one `jsonb` argument, through `callDatabaseFunction`, one round trip, one transaction.
4. Inside that definer, in order. `assert_account_active`. The state transition statements. The fault point, if the producer exposes one. `perform public.emit_notification_batch(p_batch)`. Return.
5. A `raise` anywhere in that body rolls back the transition and the batch together. A commit commits both.

Where the TypeScript-computed payload gets inside the transaction. As the `p_batch jsonb` parameter of the producer's definer. It is data by the time the transaction opens, so the transaction has nothing to compute and nothing to call out to.

When the producer is itself a database function with no TypeScript caller. It cannot build the batch. The rules exist in one place and that place is TypeScript. There are three ways out and I reject two. Duplicating the rules in SQL breaks the bet. Writing an intent row in SQL and letting a TypeScript pass complete it later breaks "recipients resolve at event creation" and "deliveries atomic with the transition". The one I keep. Every producer is a write route or a scheduled TypeScript process, which is already this tree's rule for writes, and the guarded rows all have TypeScript callers by their nature. Payment and chargeback come from a Stripe webhook function. Fuel thresholds come from the gateway's usage accounting. Key issued and revoked come from the kickoff route. Completion comes from the lifecycle route. The unguarded time-based rows, abandonment reminders, blocker aging, unmatched aging and the pre-deadline reminder, need a TypeScript scheduler, and they are not guarded, so they emit outside any producer transaction through the emitter directly. What breaks if a future producer is pure SQL. That producer cannot emit. It must either be redesigned as a route or carry a second copy of its rows' rules in SQL, and the second copy is the thing this design refuses to have. I say this in Strains too.

#### The fixture producers

A fixture producer is a definer in a schema the live adapter creates, `at_fixture`, from the SQL text in `_live-producers.ts`, with operator SQL at adapter construction, idempotently (`create schema if not exists`, `create or replace function`). It lives outside `public`, so the static catalog scan never sees it and the live catalog check over `public` never sees it. It is test authority, like req-001's operator inserts.

```sql
create table if not exists at_fixture.transitions (world text not null, event text not null, committed_at timestamptz not null default now());

create or replace function at_fixture.fire_guarded(p_world text, p_event text, p_batch jsonb, p_fault text)
returns uuid language plpgsql as $$
begin
  insert into at_fixture.transitions (world, event) values (p_world, p_event);        -- the transition
  if p_fault = 'notifications.between_transition_and_event_write' then                -- the fault point
    raise exception 'induced fault at %', p_fault
      using errcode = 'P0016', detail = 'induced-fault:notifications.between_transition_and_event_write';
  end if;
  return public.emit_notification_batch(p_batch);                                      -- the event write
end;
$$;
```

The order is the fault point's name. The transition, the point, the write. A raise at the point undoes the insert above it. The operator owns the function, so it may call the emitter that no client role may call.

How the real producer replaces it. `_live.ts` routes `fire(event)` by a table. Today every guarded row routes to `at_fixture.fire_guarded`. When the Stripe ledger lands, `fire('payment.succeeded')` routes to the deployed route with a real session, one line changes, and `transitionCommitted` reads the ledger row instead of `at_fixture.transitions`. The emitter contract, `computeBatch` in TypeScript and `emit_notification_batch(jsonb)` in SQL, does not change. The real producer's own fault point is its own business. If it exposes none, AT-016.09 for that row runs against the fixture until it does, and the decision trail says so.

Unguarded rows need no transition. The adapter calls `select public.emit_notification_batch(${batch})` directly as the operator. Same emitter, no fixture producer.

#### The delivery path

From a pending row to a provider acceptance.

1. `drainDeliveries({ passes })` on the live adapter runs `runDeliveryPass(outbox, provider, epoch)` until no row is unsent or the pass budget is spent.
2. `outbox.pending()` calls `public.notification_pending_deliveries()` as the operator.
3. An in-app row is recorded `accepted`. The provider is never consulted.
4. An email row goes to `provider.deliver`. At integration the provider is `mailpitProvider(stack.mailUrl)` from the product module, wrapped by the adapter's fault shim for AT-016.11. The request carries the idempotency key and the event and recipient ids as headers.
5. The port replays before it sends. It searches Mailpit for a message to that address whose raw source carries `X-AI4G-Idempotency-Key: <key>`. If one exists, it returns `accepted` without sending. This is the provider-side idempotency a real provider gives through its idempotency header. Mailpit has none, so the port supplies it.
6. `outbox.recordOutcome` calls `public.notification_record_outcome`. Only `accepted` marks `sent`. The first accepted send stamps `delivered_by_process` with the worker's epoch.
7. `outbox.finishPass` bumps `attempts` on every touched event and derives the event state.

`processRestart()` on the live adapter discards the worker instance and its in-memory state, and mints `delivery-process-<n+1>`. The next pass re-reads pending rows from the table. That is the only volatile state the worker holds.

#### The live adapter

`createLiveAdapter({ stack })`. Calls `mailIdentification(stack)` and refuses if the Mailpit version predates the send API. Opens `sqlClient(stack)`. Applies `_live-producers.ts`. Builds the outbox port over the three definers and the provider port over `mailpitProvider`. Returns `sut.notifications`, `fixtures.world`, `faults`, `sentinels`, `teardown`.

`sut.notifications` over SQL and the module.
- `senders`, `taxonomy`, `documentedDefaults`, `runtimeRegistrationSurface` from the module.
- `emit({ type, ctx })` runs `computeBatch` against the current world's directory; a refusal returns `{ accepted: false }` and touches no SQL; an acceptance calls the emitter as the operator.
- `events`, `deliveries`, `opsItems` are operator selects mapped to the contract shapes.
- `drainDeliveries` as above.

`fixtures.world(name)`. Provisions four accounts through the admin user API with `email_confirm: true` and an operator insert into `public.accounts`, the recipe req-001's `provisionPlatformAdmin` uses, so no confirmation mail is sent and the two-per-hour auth mail limit is never touched. The NGO gets an organisation and the seat through the product path only if a row needs it; none of the twelve does. Addresses carry the world namespace, `ngo+<ns>@example.test`, so Mailpit reads filter by address and prior runs cannot collide. `actors` maps the four roles to the four ids. `ex_volunteer` is a real account of type volunteer that holds no seat; nothing stores that role in the product, and the world supplies it as the settled facts allow.
- `fire(event, params)` computes the batch from the module with the world's directory, then routes. Guarded row, `at_fixture.fire_guarded(world, event, batch, armedFault)`. Other row, the emitter directly.
- `transitionCommitted(event)` is `exists (select 1 from at_fixture.transitions where world = $1 and event = $2)`.
- `reassignRole(role, toActorId)` changes the world's map and returns the id. Rows already written hold the old uuid. Nothing re-resolves.
- `burstThreadComments(count, guard?)` runs the module's `threadCommentGuard` against the world's window state with `Date.now()`, and fires `thread.comment` when the decision says emit. The guard configuration comes from the explicit argument at this tier. The window state lives in the world for this run, because the comment thread requirement that will own it has not landed.

`faults`. `points()` returns `['notifications.between_transition_and_event_write', 'notifications.provider_send']`. `arm(point, kind)` records the arming in the adapter. For the first point only `crash` is implemented and any other kind is refused by name, as the stand-in does. For the second point `reject` and `lose_ack` are implemented and `crash` is refused. `triggerCount()` for the first point counts refusals with `detail = 'induced-fault:...'` that `fire` received. For the second point it counts calls the provider shim intercepted. `processEpoch` and `processRestart` as above.

`sentinels`. One scope, `notifications.delivery_bodies`, read as `select body from public.notification_deliveries`.

`teardown` closes SQL. Worlds have no teardown work because the runner reset the database before the run.

#### The source oracle for AT-016.01

`tests/at/suites/req-016/_provider-scan.ts` exports `providerClientImporters(): string[]`. It walks `supabase/functions/**/*.ts`, strips comments, and marks a file as a provider importer when it imports `notifications-provider.ts`, names a mail endpoint (`/api/v1/send`, `api.resend.com`, `smtp`), or reads a provider credential (`RESEND_API_KEY`, `MAIL_PROVIDER_KEY`). The provider module itself counts. It maps a file to a component. `_shared/notifications*.ts` is `notifications.emitter`. Any other `_shared/<name>.ts` is `<name>.service`. Any `<dir>/index.ts` is `<dir>.route`. It returns the sorted distinct components. It throws when `supabase/functions` cannot be read or holds no `.ts` file, so an empty answer is never a broken instrument. The expected answer is exactly `['notifications.emitter']`. A second importer anywhere fails the id at both tiers. At loop this replaces the refusing `h.static`, so the loop red on `H3 static provider scan` becomes green in unit 1.

### Per-id plan

| Id | Needs from the product | Needs from the seam | `integration:` body | Witness at integration |
|---|---|---|---|---|
| AT-016.01 | `SENDERS`, `emitted_by` check, provider module as the only mail reach, worker and provider port | source oracle at both tiers, sentinels scope, Mailpit read by address | Yes. Steps 1 to 3 as the loop body with the oracle import. Step 4 reads Mailpit for this world's four addresses and asserts every message's `X-AI4G-Event-Id` is in `sut.events()`. | `_provider-scan.ts` over the tree, `emitted_by` on rows, Mailpit headers |
| AT-016.02 | `NOTIFICATION_TAXONOMY`, `computeBatch` refusal, `runtimeRegistrationSurface` | `sut.emit` refusing before SQL | No. Single body. | Row counts unchanged across the refused emit, read as the operator |
| AT-016.03 | `computeBatch`, `renderBody`, `DOCUMENTED_DEFAULTS`, emitter, ops item insert | world with four real actors, `fire` for all 48 rows | Yes. A second capture in `_integration.ts` whose `providerAttempts` and `providerAccepted` are read from Mailpit by event id header. | delivery rows and ops items as the operator, Mailpit messages per event |
| AT-016.04 | same as .03 | same capture | Yes. Same assertions over the integration capture. | delivery rows |
| AT-016.05 | `documentedChannels`, worker's in-app rule | same capture | Yes. Same assertions. Mailpit holds only email, so the off-channel check reads an empty set, and the accepted pairs are the messages per event. | Mailpit messages per event and address |
| AT-016.06 | `DOCUMENTED_DEFAULTS` with sources | `sut.documentedDefaults` | Yes. Same assertions over the integration capture. | the served data |
| AT-016.07 | unique pair constraint, `delivered_by_process` coalesce, `notification_pending_deliveries` re-read | `faults.processEpoch`, `processRestart` | No. Single body. | rows after restart carry the new epoch; the unique constraint is what a duplicate would hit |
| AT-016.08 | `threadCommentGuard` | `burstThreadComments(count, guard)` with the explicit configuration; `open(undefined, { config })` for the read-back | Yes. Both variants pass short real windows, wait `windowMs / 2` and then `windowMs` with `setTimeout`, `timeoutMs: { integration: 60_000 }`. | delivery rows for `thread.comment` on the volunteer in-app pair |
| AT-016.09 | emitter inside the caller's transaction | `at_fixture.fire_guarded`, `faults.at(point, 'crash')`, refusal-counted trigger, `transitionCommitted` | No. Single body. | four operator reads all empty after the crash; all present in the control |
| AT-016.10 | `recipients` frozen on the event, delivery rows hold the uuid | `reassignRole` on the world map | No. Single body. | delivery rows name the original uuid only |
| AT-016.11 | `runDeliveryPass` marks sent only on accepted, `record_outcome`, `finish_pass`, idempotent replay in the port | `faults.at('notifications.provider_send', 'reject' \| 'lose_ack')`, handle `triggerCount`, Mailpit read | Yes. Arms reject, fires, one pass, asserts `triggerCount() === 1`, no Mailpit message, delivery not sent, event pending or retrying. Full drain, asserts one Mailpit message for the volunteer, event sent, `attempts >= 2`. Arms lose_ack, fires, one pass, asserts one Mailpit message and delivery not sent. Full drain, asserts still exactly one message for the pair, both deliveries sent, one logical event. | fault handle counts, Mailpit message count per idempotency key |
| AT-016.12 | recipients from `computeBatch` | same capture as .03 | Yes. Same assertions over the integration capture. | delivery rows |

Eight ids carry an `integration:` body. AT-016.01, .03, .04, .05, .06, .08, .11, .12. Four stay single-body. AT-016.02, .07, .09, .10.

What replaces the email provider simulator as the send witness. Mailpit's message store, read through `mailMessagesFor` by this world's addresses, with the event id, recipient id and idempotency key in message headers. Attempts that never reached Mailpit, the rejected ones, are witnessed by the fault handle's trigger count, which the adapter's shim owns at the point.

### The six units

Unit 1, one shared emitter and the static event table. AT-016.01, AT-016.02. Files. `_shared/notifications.ts`, `_shared/notifications-provider.ts`, the migration, `_policy-scan.ts` catalog rows, `_provider-scan.ts`, `_live.ts`, `_integration.ts` with the .01 body, `_fixture.ts` rewritten over the module, `a-emitter-and-taxonomy.test.ts`, the manifest. The manifest moves .01 to green at loop and .01 and .02 to green at integration, and declares the other ten integration ids red as `capability-pending` on the seam their body reaches first, thrown by the live adapter by name. `sut.notifications.drainDeliveries` is real here because .01 needs a drain and the Mailpit orphan check. This is where the brief's boundary cuts hardest. Unit 1 must land the tables, the emitter, the worker and the provider, because .01 cannot pass without a delivered body and a provider trace. I would do exactly that and say in the commit that the emitter and the outbox arrive together because the first id reads both ends.

Unit 2, the full taxonomy matrix. AT-016.03, AT-016.04. Files. `_integration.ts` gains the integration capture and the .03 and .04 bodies, `d-taxonomy-evidence.test.ts` moves the two ids to per-tier maps, the manifest flips the two. The defaults data already exists from unit 1 because .03 binds channels through it. Nothing else changes.

Unit 3, delivery defaults. AT-016.05, AT-016.06. Files. `_integration.ts` gains the .05 and .06 bodies, `d-taxonomy-evidence.test.ts`, the manifest. The cut. The documented default data and the class rule were built in unit 1 and exercised in unit 2. Unit 3's own work is the two integration bodies and the flip. I would keep the unit as the brief orders it and say plainly that the data landed early because an earlier id could not run without it.

Unit 4, one logical notification and the anti-spam guard. AT-016.07, AT-016.08. Files. `_live.ts` gains the faults seam with epoch and restart, `threadCommentGuard` in the module, `_contract.ts` gains the guard argument, `_fixture.ts` routes its guard through the module, `_integration.ts` gains the .08 body, `b-delivery-defaults.test.ts`, the manifest.

Unit 5, the atomic emitter-outbox contract and each guarded producer. AT-016.09, AT-016.10. Files. `_live-producers.ts`, `_live.ts` gains the fixture producer route, the first fault point, the refusal counter, `transitionCommitted` and `reassignRole`, the manifest. AT-016.10 needs only the frozen recipients from unit 1 and the map change; it rides here because the brief puts it here.

Unit 6, sent only on provider acceptance. AT-016.11, AT-016.12. Files. `_live.ts` gains the `notifications.provider_send` point and the shim, the idempotent replay in the Mailpit port lands in `_live.ts` beside it, `_integration.ts` gains the .11 body, `c-reliability-guard.test.ts`, the manifest. AT-016.12 is a capture projection built in unit 2 and flips here because the brief says so.

The one thing the unit order cannot split. `_live.ts` exists or it does not, and the moment it exists every id runs. Each unit therefore lands its `_live.ts` with the later units' seams throwing `CapabilityPending` by name and the manifest declaring exactly those names, the way req-001's live adapter declares its unbacked methods. The pull request has six commit groups and the manifest changes in every one.

### Rubric answers

1. Atomicity by construction. The transaction boundary is the producer's definer, entered by one `POST /rest/v1/rpc/<name>` from `callDatabaseFunction` in production and by one operator statement at integration. The fault point is raised inside `at_fixture.fire_guarded`, after the transition insert and before `perform public.emit_notification_batch`. The emitter can only run inside a caller's transaction because no client role may execute it, so a producer that commits its transition in one call and emits in another cannot be written against this contract. The trigger count survives the rollback because it never touches the database. The adapter's `fire` catches the refusal, matches `detail = 'induced-fault:notifications.between_transition_and_event_write'`, and increments the armed handle's counter in process. The rollback erases the transition row, the event, the deliveries and the ops item, and leaves the counter at one.

2. Sole writer, structurally. Three facts hold by construction. No client role holds insert on any of the three tables, and the only insert path is `emit_notification_batch`, which no client role may execute. Every delivery row carries `emitted_by = 'notifications.emitter'` by check constraint, so no row can claim another writer. The only file in the product that names a mail endpoint or a mail credential is `_shared/notifications-provider.ts`, and the worker is the only code that calls it, with rows it read from the outbox as its only input. The source scan proves the third fact from outside the subject. It walks the tree, not the running system, maps every importer to a component, and the body demands the set equal `['notifications.emitter']`. `senders()` is the self-report the scan is checked against.

3. One taxonomy, one source. The forty-eight rows are `NOTIFICATION_TAXONOMY` in the product module. The suite's `taxonomy.ts` is the independent oracle and stays separate on purpose. AT-016.02 proves the two equal at run time, at both tiers, by set equality over the served names. The loop stand-in now serves the product's rows, so the loop tier grades the product's taxonomy against the suite's, which the current stand-in cannot do. The documented defaults are `DOCUMENTED_DEFAULTS`, data with a non-empty `source` per row, derived by `documentedChannels` from the row's class, and AT-016.06 checks the class rule over them. The database holds no second copy. The cost is that the emitter definer accepts any event name it is handed. The name reaches it only through `computeBatch`, which refuses an unregistered name before any SQL, and through no client role at all.

4. Honest at both tiers. Loop runs `_fixture.ts`, storage around the product module, with the harness simulator as the provider port and the controlled clock feeding the guard. Integration runs `_live.ts` against the reset stack, with the operator outbox port over the three definers, `mailpitProvider` as the provider port, and the wall clock. The eight ids with an `integration:` body and what each observes are in the table above. Nothing at integration reads `h.vendors`, `h.clock.freezeAt` or `h.static`. The send witness at integration is Mailpit, read by address and event id header, plus the fault handle's count for sends that were refused before they left.

5. Passes the standing gates. `notification_events` and `ops_items` are `unreachable-by-client-roles`, baseline revoke from the three roles, row-level security on, no grant to `authenticated`. `notification_deliveries` is `tenant-isolated`, baseline revoke, row-level security on, `grant select to authenticated`, one policy `for select to authenticated using (recipient_id = (select auth.uid()) and channel = 'inapp')`. That satisfies `no-baseline-revoke`, `anon-privilege`, `service-role-write`, `isolated-no-rls`, `isolated-wrong-privileges`, `isolated-no-policy`, `policy-using-no-auth`, `policy-tautological-using`, `unreachable-client-grant`, and the live `assertTenantCatalog` reads `serviceRole === []` and `authenticated === ['select']` for deliveries. Three catalog rows satisfy `undeclared-table`. Four definers, all `security definer`, `set search_path = ''`, `revoke execute from public`, no grant, so `definer-no-revoke` and `definer-client-execute` pass and `definer-no-write-gate` never fires because none is reachable by `service_role`. No new function directory, so `write-route-unregistered` cannot fire. The provider module matches nothing in `BYPASS_TEST`, so `shared-module-reaches-database` passes. `at:check` counts call sites only in `*.test.ts`, and `_integration.ts` and `_provider-scan.ts` add none. The exemption I claim is one. The fixture schema `at_fixture` is outside `public`, created by test authority, and is not a product table.

6. Retry without duplication. The idempotency key is the triple `(event_id, recipient_id, channel)`. It lives in the deliveries table as the unique constraint `notification_deliveries_one_per_pair`, and it travels to the provider as `X-AI4G-Idempotency-Key`. A process restart loses only the worker's in-memory state; the next pass re-reads rows that are not `sent`, and a pair has exactly one row, so a restart can re-attempt a row but cannot add one. A lost acknowledgment leaves the row `retrying`; the retry carries the same key; the provider port replays an accepted key as `accepted` without a second send, at integration by searching Mailpit for the key, in production by the provider's idempotency header. A retry therefore cannot mint a second delivery row, by the constraint, and cannot mint a second physical send, by the key.

### Rationale

Alternatives inside this direction, and what I rejected.

Compute the batch inside a TypeScript transaction helper. Rejected because the tree has none, no `sql.begin`, no supabase-js in product code, and one `POST /rpc` is the only transaction this codebase knows. Adding a transaction helper is a second write boundary and the write-route scan would have to learn it.

Mint the event id in TypeScript and carry it in the batch. Rejected. The stand-in learned that an id allocated before the point survives a crash as a gap. `gen_random_uuid()` in the emitter allocates after the point.

Resolve recipients inside the emitter from `org_memberships` and `projects`. Rejected for this direction. It moves the rules into SQL and creates the second source. The cost I accept instead is a staleness window between the directory read and the commit, during which a role that moves resolves to the pre-move holder, which is the direction AT-016.10 wants anyway.

Put the fault point inside `emit_notification_batch` with a GUC or a control table. Rejected. It puts a test hook in product SQL, and req-001 refused exactly that. The point lives in the fixture producer, which is where the name says it lives, between the transition and the write.

A control table `public.notification_fault_armings` for arming. Rejected. It needs a catalog row and a posture for a table no product code reads, and the arming is known in process by the adapter that will make the call. The armed point rides as a parameter of the fixture producer.

SMTP to Mailpit on port 44325. Rejected in favour of Mailpit's HTTP send API. SMTP needs a config change, a stack restart, and two client implementations, one for Deno and one for Bun. A `fetch` client runs in both and type-checks under `tests/at`. The version dependency is named under Strains.

Grant the outbox definers to `service_role` now and add three `WRITE_GATE_EXEMPT` entries. Rejected. No production worker has a home in this run, so the grants would exist for nobody and the exemptions would be text with no caller. The operator executes them at integration. The grants land with the worker.

Keep `_fixture.ts` oracle-derived. Rejected. The bet is one typed source, and the payoff at loop is that the product's rows, defaults, rendering and worker decisions are graded by the suite's independent oracle before any stack runs. A stand-in that mirrors the oracle proves the harness, not the product.

A second declaration of the forty-eight names as a SQL check constraint. Rejected. It is the second source. The name reaches the emitter only through code that has already refused an unregistered name.

Email only for null-channel critical rows, as the stand-in documents today. Rejected in favour of email and in-app, because the unit text says so and the later in-app screen would otherwise show no critical events. The suite accepts either.

### Where this direction strains

The database trusts the batch. The emitter cannot tell a registered event from an invented one, or a well-formed recipient list from a wrong one. It relies on `computeBatch` having run. A producer that builds a batch by hand bypasses every rule while still writing through the sole writer. The mitigation is that `EmitBatch` is a typed value that only `computeBatch` returns, which is a TypeScript guarantee, and TypeScript guarantees end at the RPC boundary. The SQL-resident direction would check the name in the emitter for free. Switching later costs one check constraint and a generated list, and the list becomes a second source the moment it exists.

A pure-SQL producer has no emitter. Triggers, cron-driven SQL, and any future Stripe path that writes the ledger from a database function cannot build a batch. The time-based rows escape because they are not guarded and a scheduler emits them outside any transaction. A guarded producer that arrives as SQL first must be reshaped as a route, or it duplicates its rows' rules. Switching to a SQL-resident emitter later means rewriting recipient resolution, channel resolution and rendering in plpgsql and deleting them from the module, and the loop stand-in loses the product code it grades.

Recipient resolution has a window. The directory is read before the transaction. A role that changes between the read and the commit freezes the old holder. AT-016.10 wants that outcome, and production wants it in the same direction, but a design that resolves inside the transaction under `for share` has no window at all. Closing it here means the producer's definer re-reads the seat holder and compares it to the batch, which is a second resolution and a partial second source.

The send path runs in two runtimes. The worker's decisions are one pure function. Its ports are built by the live adapter in Bun today and will be built by a Deno function or a host process in production. The provider module is `fetch` only so it type-checks under `tests/at` and runs in both, but nothing in this run proves the Deno side, because no production worker has a home. The write-route scan would refuse a worker function directory that reaches the database, so the worker's home is a design question this run leaves in the Not-done-here list.

Mailpit's send API is a dependency I could not verify from the tree. The stack's Mailpit version is read by `mailIdentification`, and the adapter refuses when the version predates the send endpoint. If the bundled Mailpit is too old, the fallback is `smtp_port = 44325` in `config.toml`, a stack restart, and a small SMTP client in the adapter for the integration port, with the product's provider module keeping only the production HTTP shape. That fallback weakens the source scan, because the file the scan attributes to the emitter would then not be the file that sends at integration.

The anti-spam window state has no durable home. The decision is the product's pure function. The state lives in the loop fixture and in the live world. Production needs it in a table keyed by thread, and that table belongs to the comment thread requirement. Until it lands, AT-016.08 proves the decision and the configuration binding, not the storage.

The unit boundaries do not fit the first id. AT-016.01 reads a delivered body and a provider trace, so unit 1 must land the tables, the emitter, the worker and the provider together. The brief's units 3 and 6 then carry little of their own beyond integration bodies and manifest flips. I would keep the order and say so in each commit, rather than move work between units to make the units look even.
