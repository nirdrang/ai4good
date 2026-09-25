### Components Found

**Database objects (created in `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`, the last-but-one migration at head):**

- `public.notification_state` enum — `'pending' | 'retrying' | 'sent' | 'failed'` (line 39). Used by both tables. `'failed'` is never written by any function or test in this tree.
- `public.notification_channel` enum — `'email' | 'inapp'` (line 40).
- `public.notification_role` enum — `'ngo' | 'volunteer' | 'ex_volunteer' | 'platform_admin'` (line 41).
- `public.notification_event_types` (lines 45–48) — one row per wire name. Columns: `event text primary key`, constraint `notification_event_types_shape check (event ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')`. Seeded with the 48 names at lines 53–101 (the exact closed set the TS taxonomy must equal).
- `public.notification_events` (lines 105–116) — the outbox header, one per committed producer event. Columns: `id uuid pk default gen_random_uuid()`, `event text not null references notification_event_types(event)`, `actor_account_id uuid` (nullable, **no FK**), `payload jsonb not null default '{}'`, `recipients jsonb not null` with check `jsonb_typeof(recipients)='array' and jsonb_array_length(recipients)>0` (the frozen resolution, AT-016.10), `state notification_state not null default 'pending'`, `attempts integer not null default 0`, `created_at timestamptz not null default now()`. No index besides the PK.
- `public.notification_deliveries` (lines 121–143) — one row per recipient-channel pair. Columns: `id uuid pk`, `event_id uuid not null references notification_events(id) on delete cascade`, `event text not null` (**no FK to the types table** — denormalized), `role notification_role not null`, `recipient_id uuid not null` (no FK), `recipient_address text`, `channel notification_channel not null`, `state notification_state not null default 'pending'`, `emitted_by text not null`, `delivered_by_process text`, `payload jsonb not null default '{}'`, `subject text not null`, `body text not null`, `idempotency_key text not null`, `accepted_at timestamptz`, `provider_receipt jsonb`, `created_at timestamptz not null default now()`.
  - Constraints: `notification_deliveries_one_per_pair unique (event_id, recipient_id, channel)`; `notification_deliveries_one_per_key unique (idempotency_key)`; `notification_deliveries_emitter_only check (emitted_by = 'notifications.emitter')`; `notification_deliveries_email_has_address check (channel <> 'email' or recipient_address is not null)`.
  - Indexes: `notification_deliveries_by_recipient_idx (recipient_id, channel)`; `notification_deliveries_unsent_idx (created_at) where state <> 'sent'` (partial, supports the worker's pending scan).
- `public.notification_ops_items` (lines 151–158) — columns `id uuid pk`, `kind text not null`, `linked_event_id uuid references notification_events(id) on delete cascade`, `detail jsonb not null default '{}'`, `created_at timestamptz`; constraint `notification_ops_items_one_per_event unique (linked_event_id)`. `kind` is free text (the emitter passes the event name).
- `public.notification_fault_triggers` sequence (line 166) — the one sequence. No trigger exists anywhere on any notification table. The sequence has no `owned by`, default cache 1; its only purpose is the rollback-surviving witness of the induced fault.
- `public.emit_notification(p_write jsonb) returns uuid` (lines 191–236) — SECURITY DEFINER, `set search_path = ''`, VOLATILE; the sole writer of events/deliveries/ops items. Execute revoked from PUBLIC, never granted.
- `public.apply_delivery_results(p_results jsonb, p_epoch text) returns void` (lines 244–285) — SECURITY DEFINER, `set search_path=''`; the one transaction that applies a worker pass.
- Both migrations end with `notify pgrst, 'reload schema'`.

**Fixture producer (own migration, `supabase/migrations/20260913121000_notification_fixture_producers.sql`):**

- `public.notification_fixture_transitions` (lines 19–24) — `scope_id text not null`, `event text not null references notification_event_types(event)`, `committed boolean not null default false`, `primary key (scope_id, event)`. The stand-in ledger for producers that do not exist yet.
- `public.fixture_commit_transition_and_emit(p_scope text, p_write jsonb, p_induce_fault boolean) returns uuid` (lines 33–59) — SECURITY DEFINER, `set search_path=''`; upsert the transition row, optionally take `nextval` and raise, then return `public.emit_notification(p_write)`.

**Client/role posture (lines 168–187):**

- `revoke all` from `anon, authenticated` and separately from `service_role` on all four outbox tables; `revoke all` on the sequence from all three; RLS enabled on all four (plus the fixture table and sequence at fixture-migration lines 29–31).
- The one exception: `grant select on table public.notification_deliveries to authenticated` (line 183) plus policy `notification_deliveries_own_inapp for select to authenticated using (recipient_id = (select auth.uid()) and channel = 'inapp')` (lines 185–187). Nothing in the product reads this policy yet.
- Net reachability: `anon` — nothing; `authenticated` — SELECT on `notification_deliveries` only, RLS-filtered to own in-app rows; `service_role` — **nothing at all** (no table privileges, no function execute, no sequence). The read/write path everywhere is the **operator** (`postgres`, the owner) over `AT_SUPABASE_DB_URL`.

**Test-side components that exercise this layer:**

- `tests/at/suites/req-016/_live.ts` — integration adapter: `outbox.append` calls the fixture producer (lines 304–322); `pending`/`applyPassResults`/`events`/`deliveries`/`opsItems` are operator SQL (lines 324–432); fault witnesses at lines 267–292; worlds + accounts at lines 539–626.
- `tests/at/suites/req-016/_source-scan.ts` — text oracles over migrations/product source: `strayNotificationWriters` (lines 197–228), `taxonomySeedProblems` (158–176), `providerClientImporters` (127–140).
- `tests/at/suites/req-001/_policy-scan.ts` — `TENANT_CATALOG` (lines 21–35; all five notification tables declared), `scanTenantMigrations` (254–568), `scanWriteGateSql` (584–658), `tenantCatalogProblems` (660–675).
- `tests/at/suites/req-001/_live-tenant-reads.ts` — `tenantTableFacts()` (lines 263–329) reads `pg_class`, `has_table_privilege`, `pg_policies`, `pg_proc`.
- `tests/at/suites/req-001/_integration.ts` — `assertTenantCatalog` (lines 170–201) is the live posture check, called by AT-001.21/22/23/40 (lines 1426, 1498, 1613, 1706).

### Flow

**Emit, integration tier (one transaction):**

1. Test body → `NotificationLiveWorld.fire` → `core.emit({event, actor: null, params})` (`_live.ts:211–215`).
2. Core `emit` (`supabase/functions/_shared/notifications.ts:374–381`): find taxonomy row; `directory.resolve(rows)` reads `org_memberships`, `projects.assigned_volunteer_id`, `auth.users` as operator (`_live.ts:437–465`); `prepareWriteSet` (notifications.ts:174–206) resolves recipients, builds one delivery per channel with rendered copy, brands the `WriteSet`.
3. `outbox.append` (`_live.ts:304–322`) reads the crash switch, snapshots `pg_sequence_last_value('public.notification_fault_triggers')` when armed, then runs the single statement `select public.fixture_commit_transition_and_emit(scopeId, write::jsonb, armed)`. In `finally`, it reads the sequence again and requires sequence advances == refusals (throw if not).
4. Inside Postgres, that one statement is one implicit transaction. The fixture producer:
   a. `insert into notification_fixture_transitions (scope_id, event, committed) values (..., true) on conflict (scope_id,event) do update set committed = true` — the stand-in state transition, for **every** event the live suite fires (guarded or not);
   b. if `p_induce_fault`: `perform nextval('public.notification_fault_triggers')` then `raise exception ... errcode 'P0001' detail 'induced-fault:notifications.between_transition_and_event_write'`;
   c. otherwise `return public.emit_notification(p_write)`.
5. `emit_notification` writes, in this order: one `notification_events` row `(event, actor_account_id from `actor`, payload, recipients)` returning the id; then per element of `deliveries`, one `notification_deliveries` row whose `idempotency_key` is built by the function as `'ntf:' || event_id || ':' || recipientId || ':' || channel` and whose `emitted_by` comes from the write; then, only if `p_write->'opsItem'` is a JSON object, one `notification_ops_items` row `(kind, linked_event_id, detail)`. Return the event id.
6. Commit. The adapter receives `event_id` and `fire()` returns it.

**Fault path:** the `raise` aborts the transaction. The transition upsert, the event row, every delivery row and the ops item all roll back. The only thing that survives is the sequence increment (`nextval` is outside transactional control, per the comment at outbox-migration lines 163–165), which is exactly why the sequence exists. No event id is consumed because the event insert runs after the fault point. The adapter counts up to two independent witnesses: the sequence delta (product side) and the caught error whose `detail` matches `induced-fault:...` (wire side); AT-016.09's oracle (in `c-reliability-guard.test.ts:30–129`) additionally requires a no-fault control run per guarded row (both sides commit) and asserts on the fault run that transition, event, delivery **and** ops item are all absent.

**Delivery worker, integration tier:**

1. `sut.drainDeliveries()` → core `drain` (`notifications.ts:385–401`) loops; `outbox.pending()` (`_live.ts:324–350`) reads `notification_deliveries` where `recipient_id = any(<all opened worlds' actors>) and state <> 'sent' order by created_at, id`.
2. `runPassOver` (`notifications.ts:335–357`): `inapp` deliveries never touch the provider — the core records `{outcome:'accepted', receipt:null}` itself; `email` deliveries go through `provider.deliver` (the provider-fault decorators, then the product SMTP module `notification-provider.ts`) which sends `X-Notification-Key = idempotencyKey`.
3. `outbox.applyPassResults(results, epoch)` → one statement `select public.apply_delivery_results(results::jsonb, epoch)`.
4. The function, one transaction: per result, `accepted` → `update ... set state='sent', delivered_by_process=coalesce(existing, epoch), accepted_at=coalesce(existing, now()), provider_receipt=coalesce(nullif(receipt,'null'), existing) where id=... returning event_id`; anything else → `set state='retrying'`. It collects the distinct touched event ids, then `update notification_events set attempts = attempts + 1, state = 'retrying' if any delivery not sent else 'sent'` for those events.
5. Reads back through `sut.events`/`deliveries`/`opsItems` (operator SQL scoped to world actors, `_live.ts:356–432`).

**How the acceptance suite reaches this at each tier:**

- **Loop tier: never touches the database.** `tests/at/suites/req-016/_fixture.ts` binds the same core's six ports to in-memory arrays and the harness email simulator. The only DB-adjacent thing that runs at loop tier is the static catalog scan over the migration files (via req-001 bodies, e.g. `d-tenant-isolation.test.ts:98`) and the `_source-scan.ts` oracles, which run at both tiers.
- **Integration tier:** the local stack is started (`bun run db:start`, one stack per machine, `supabase/config.toml` ports 443xx), the runner proves the target, runs `supabase db reset --local` (replaying every migration in filename order), re-proves readiness, and proves `supabase_migrations.schema_migrations` equals the on-disk migration set exactly (`local-stack.ts:610–665`, `:955–1001`). Then `_live.ts` calls the fixture producer and worker functions as the operator, reads via `pg_sequence_last_value`, `notification_fixture_transitions`, and the outbox tables, and `assertTenantCatalog` reads the live catalog.
- **Posture checks:** static — `tenantCatalogProblems()` requires all five tables declared in `TENANT_CATALOG` with a baseline revoke from anon/authenticated/service_role, no anon grants, no service_role write grants, tenant-isolated tables with RLS + exactly `{select}` for authenticated + a non-tautological policy, unreachable tables with no authenticated grant, and definers with `revoke execute from public` and no client execute grant. Live — `assertTenantCatalog` asserts via `has_table_privilege` that `anon=[]` and `service_role=[]` on the notification tables, `authenticated=['select']` only on `notification_deliveries`, RLS on and no FORCE, no tautological policy, and that the three definers are non-executable by anon/authenticated (`VIEWER_FUNCTIONS` only exception).

### Files Read

- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`
- `supabase/migrations/20260913121000_notification_fixture_producers.sql`
- `supabase/migrations/README.md`
- `supabase/config.toml`
- `supabase/functions/_shared/notifications.ts` (ports, `prepareWriteSet`, emit, worker, guard)
- `supabase/functions/_shared/notification-taxonomy.ts` (grepped; the product's 48-row table)
- `supabase/functions/_shared/notification-provider.ts` (grepped outcomes/receipts)
- `tests/at/suites/req-016/_live.ts`, `_fixture.ts` (header), `_fixture-producers.ts`, `_integration.ts`, `_source-scan.ts`, `_fault-switch.ts`, `_provider-faults.ts`, `taxonomy.ts`, `c-reliability-guard.test.ts`, `a-emitter-and-taxonomy.test.ts`
- `tests/at/suites/req-001/_policy-scan.ts`, `_live-tenant-reads.ts`, `_integration.ts` (catalog helper), `d-tenant-isolation.test.ts`
- `tests/at/harness/policy-scan.selftest.ts`, `live-stack.ts`, `local-stack.ts` (migration/reset proof)
- `.taskmaster/docs/acceptance/at-req-016.md`
- `package.json`, `supabase/functions` listing (product wiring check)

### Boundaries

- **Inputs to the DB layer:** exactly one jsonb document per emit. Shape (from `WriteSet`, notifications.ts:158–168, serialized in `_live.ts:311`): `{ event: { event, actor, payload, recipients: [{role, recipientId, address, channels}] }, deliveries: [{role, recipientId, address, channel, emittedBy, payload, subject, body}], opsItem: {kind, detail} | null }`. And for the worker: `[{id, outcome, receipt}]` plus a process epoch string.
- **Outputs:** a minted event uuid; then updated rows (state/attempts/acceptance facts); reads exposed as the six-port `OutboxPort` results; the `notification_fixture_transitions.committed` boolean for transition observation.
- **Callers:** in this tree, only the acceptance adapter calls the fixture producer. There is no edge function, cron job, queue consumer, or product module that calls `emit_notification`, `apply_delivery_results`, `createNotifications`, or `runPass`. No edge function imports the notification modules (only `_shared` files reference each other). The subsystem is built and graded, not deployed in a product path.
- **Provider side:** `notification-provider.ts` is the only send path; `_source-scan.providerClientImporters()` asserts only the `notifications.emitter` component holds a send path/credential. Live, it points at the local Mailpit SMTP port read from `[local_smtp] smtp_port` in `supabase/config.toml`.
- **Posture scans:** these tables are entries in `TENANT_CATALOG`; adding a public table without declaring it fails the static scan, and a live catalog row absent from the catalog fails the integration check.

### Non-Obvious Things

- **No triggers, no trigger functions anywhere in the notification schema** — the "every trigger" tally is zero. The only tree-level triggers are on `auth.identities` and `audit_events`.
- **`'failed'` is dead vocabulary.** The state enum defines it; no SQL function, core path, or test ever sets it. There is also no retry cap, no backoff and no dead-lettering anywhere: retries are unbounded passes over `state <> 'sent'`, driven by the caller's drain loop.
- **The idempotency key is derived from the freshly minted event id** (`ntf:<event_id>:<recipientId>:<channel>`), so `one_per_key` is functionally a duplicate of `one_per_pair` and can never actually collide across distinct events. Cross-retry duplicate prevention is **not** in the database; it is the provider's idempotency on that key (in the live test, the `withIdempotentReplay` wrapper asks Mailpit before sending). `accepted_at`/`provider_receipt` are recovery facts, explicitly **not** a way to skip the provider on retry (migration header lines 31–35).
- **`apply_delivery_results` is not monotonic and silently tolerates unknown ids.** Any outcome other than the exact string `'accepted'` flips the row to `'retrying'` with no state filter — a stale result for an already-`sent` row would demote it; and an update with an id matching no row is a no-op (no error, no touch). The safety comes from the adapter reading `state <> 'sent'` rows only, not from the function.
- **Acceptance facts are first-write-wins**: `delivered_by_process`, `accepted_at` and `provider_receipt` all use `coalesce(existing, new)`, so a replay/restart cannot overwrite the process or timestamp that first recorded acceptance. `attempts` counts event-touching worker passes, not provider sends, and increments once per event per `apply_delivery_results` call (deduped via `v_touched`).
- **The fault is an argument of the fixture producer, not of `emit_notification`.** The product emitter has no fault hook and reads no control table/GUC; the arming lives entirely in the binding (`_live.ts` crash switch). Nothing the emitter writes survives a rollback except the sequence value.
- **The live suite routes every event through the fixture producer**, guarded or not, so `notification_fixture_transitions` gets a row for all 48 names in integration runs, not only the 11 guarded ones.
- **`service_role` is deliberately blind here.** It holds no table privileges on any notification table and no execute on the definers; the tests read as the `postgres` owner over the direct `AT_SUPABASE_DB_URL` connection, which is why owner-only definers are callable at all.
- **`notification_deliveries.event` and `recipient_id`, and `notification_events.actor_account_id`, have no foreign keys** — deliberate denormalization; only the event-name FK is enforced, and only on `notification_events.event` and `notification_fixture_transitions.event` (which is what makes an unregistered event fail on the key).
- **The RLS policy on deliveries is the only client-read path and nothing reads it** — noted in the migration header as landed early "so the rule is encoded where a later reader will find it".
- **`notification_fixture_transitions` + its function are isolated in their own migration on purpose**, so removing them later is one migration that touches nothing in the outbox schema.
- **The static write-gate rule (`scanWriteGateSql`) does not apply to these definers** because it keys on a `grant execute ... to service_role`; since there is none, no `assert_account_active` is demanded. A future producer definer granted to service_role *would* need the gate.

### Open Questions

- `supabase/config.toml` declares `[db.seed] enabled = true` with `sql_paths = ["./seed.sql"]`, but no `supabase/seed.sql` exists in the tree. I did not verify how `supabase db reset` treats the missing seed file (skip with warning vs. error) — it clearly did not block the migration set proof in the runs recorded elsewhere.
- I did not execute anything (read-only by instruction), so the claims about runtime behavior (`nextval` survival, sequence visibility across connections, implicit-transaction wrapping of the Bun SQL statement) are read from the migration comments and the adapter code, not re-measured here. The unit reports under `loop/items/AI4DEV-89/lanes/` record those measurements but I did not audit them against a live stack.
- The head-of-main question: the two notification migrations are the newest files in `supabase/migrations/` in this working tree, and no later migration alters/drops their objects, but I did not verify this tree is byte-identical to the remote `main` tip.