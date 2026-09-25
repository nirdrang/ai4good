## Components Found

**Migrations (the database layer itself)**

- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql` — REQ-016 D1.L1. Creates 3 enums, 4 tables, 1 sequence, 1 partial+1 plain index, the security-definer emitter `public.emit_notification(jsonb)` (lines 191-236), the worker `public.apply_delivery_results(jsonb, text)` (lines 244-285), the whole privilege/RLS posture (lines 170-187), and ends with `notify pgrst, 'reload schema'` (line 291). It is the only migration that mentions notifications except its companion file; grep confirms no other migration touches these objects.
- `supabase/migrations/20260913121000_notification_fixture_producers.sql` — REQ-016's stand-in producers. Creates `public.notification_fixture_transitions` (lines 19-24) and the security-definer `public.fixture_commit_transition_and_emit(text, jsonb, boolean)` (lines 33-59). Deliberately in its own file "so that dropping it later is one new migration" (comment lines 10-11).

**Schema objects created (exactly what the migrations land)**

Enums (outbox file lines 39-41):
- `public.notification_state` = `pending | retrying | sent | failed`
- `public.notification_channel` = `email | inapp`
- `public.notification_role` = `ngo | volunteer | ex_volunteer | platform_admin`

Tables:
- `public.notification_event_types` (lines 45-48): the closed vocabulary — `event text primary key` with a shape check `event ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'` (namespace.event, lowercase snake). Seeded with exactly 48 wire names (`triage.approved` … `lovable.setup_complete`, lines 53-101). Table comment (line 50) says the set is "seeded here and immutable in v1 (AT-016.02)"; recipients/channels/class/copy live in TypeScript, not the DB.
- `public.notification_events` (lines 105-116): `id uuid pk default gen_random_uuid()`, `event text not null references notification_event_types(event)`, `actor_account_id uuid` (nullable, never constrained), `payload jsonb not null default '{}'`, `recipients jsonb not null`, `state notification_state not null default 'pending'`, `attempts integer not null default 0`, `created_at timestamptz not null default now()`. One check: `notification_events_recipients_frozen` — recipients must be a non-empty jsonb array (lines 114-115). No unique on event content; multiple events of the same type are legal.
- `public.notification_deliveries` (lines 121-143): `id uuid pk`, `event_id uuid not null references notification_events(id) on delete cascade`, `event text not null` (denormalized copy, no FK), `role notification_role not null`, `recipient_id uuid not null`, `recipient_address text` (nullable), `channel notification_channel not null`, `state notification_state not null default 'pending'`, `emitted_by text not null`, `delivered_by_process text`, `payload jsonb not null default '{}'`, `subject text not null`, `body text not null`, `idempotency_key text not null`, `accepted_at timestamptz`, `provider_receipt jsonb`, `created_at timestamptz not null default now()`. Constraints: `notification_deliveries_one_per_pair unique (event_id, recipient_id, channel)`; `notification_deliveries_one_per_key unique (idempotency_key)`; `notification_deliveries_emitter_only check (emitted_by = 'notifications.emitter')`; `notification_deliveries_email_has_address check (channel <> 'email' or recipient_address is not null)`.
- Indexes (lines 148-149): `notification_deliveries_by_recipient_idx (recipient_id, channel)` and the partial `notification_deliveries_unsent_idx (created_at) where state <> 'sent'`.
- `public.notification_ops_items` (lines 151-158): `id uuid pk`, `kind text not null`, `linked_event_id uuid references notification_events(id) on delete cascade`, `detail jsonb not null default '{}'`, `created_at`. Unique `notification_ops_items_one_per_event unique (linked_event_id)` — exactly one ops row per event, and nullable `linked_event_id` is allowed by that unique (a nullable unique holds no restriction), though the emitter always links.
- `public.notification_fixture_transitions` (fixture file lines 19-24): `scope_id text`, `event text references notification_event_types(event)`, `committed boolean not null default false`, pk `(scope_id, event)`.
- Sequence `public.notification_fault_triggers` (line 166) — deliberately a sequence, "because `nextval` is outside transactional control" (comment lines 163-165); a value taken before a `raise exception` survives the rollback.

Functions (all `security definer`, all `set search_path = ''`, all `revoke execute … from public` with **no grant to anybody**):
- `public.emit_notification(p_write jsonb) returns uuid` (lines 191-236). The one INSERT writer of the three outbox tables.
- `public.apply_delivery_results(p_results jsonb, p_epoch text) returns void` (lines 244-285). The one UPDATE writer (states/attempts/receipts).
- `public.fixture_commit_transition_and_emit(p_scope text, p_write jsonb, p_induce_fault boolean) returns uuid` (fixture file lines 33-59). Transition ledger upsert + optional fault + emitter call.

Triggers: none. The notification tables have zero triggers; enforcement is by constraint, function, and grant/RLS only.

**The consumer posture / catalog guards**

- `TENANT_CATALOG` — `tests/at/suites/req-001/_policy-scan.ts:21-35`. Declares posture per table: `notification_event_types`, `notification_events`, `notification_ops_items`, `notification_fixture_transitions` = `'unreachable-by-client-roles'`; `notification_deliveries` = `'tenant-isolated'`.
- `scanTenantMigrations` / `tenantCatalogProblems()` — same file, lines 254-568 and 660-675. The static half: a statement-by-statement overlay parser over `supabase/migrations/*.sql` that models grants, revokes, RLS enable/disable, policies, definer functions.
- `tenantTableFacts` — `tests/at/suites/req-001/_live-tenant-reads.ts:263-329`. The live half: queries `pg_class` (`relkind='r'`, schema `public`) with 21 `has_table_privilege` columns across `anon`/`authenticated`/`service_role` (7 privileges each), `pg_policies`, and `pg_proc` (`prosecdef` only) with `has_function_privilege` for anon and authenticated.
- `assertTenantCatalog` — `tests/at/suites/req-001/_integration.ts:170-201`. Joins the two halves: every live table must be in `TENANT_CATALOG` and vice versa, no FORCE RLS, `anon = []` everywhere, `service_role = []` except `SERVICE_ROLE_SELECT = {accounts, org_memberships}` (line 166 — so all five notification tables must have empty service_role grants too), tenant-isolated ⇒ RLS on + `authenticated = ['select']` + ≥1 non-tautological policy, unreachable ⇒ `authenticated = []`; every definer function must have `anonExecute = false` and `authenticatedExecute` true only for `VIEWER_FUNCTIONS` (line 167 — `emit_notification`, `apply_delivery_results`, `fixture_commit_transition_and_emit` are not viewers, so authenticated must hold no EXECUTE).
- `tests/at/harness/policy-scan.selftest.ts` — the oracle for the scanner itself, plus `tenantCatalogProblems()` run over the real migrations expecting `[]` (line 62-66).
- REQ-016's own source oracles — `tests/at/suites/req-016/_source-scan.ts`: `providerClientImporters()` (lines 127-140, expects exactly `['notifications.emitter']`), `taxonomySeedProblems()` (lines 158-176, the migration seed vs the product `TAXONOMY`, both directions plus duplicate-seed check), `strayNotificationWriters()` (lines 197-229, every `insert into public.notification_{events,deliveries,ops_items}` must sit inside the `$$` body span of `public.emit_notification` in the migrations; product-module inserts and `.from('…').insert/upsert` client writes are never allowed; throws if no migration defines the emitter).

**Upstream (what feeds the DB layer, read for context)**

- `supabase/functions/_shared/notification-taxonomy.ts` — the 48-row product `TAXONOMY`, `channelsFor`, `DEFAULT_BY_CLASS`, `CLASS_CHANNEL_RULE`, and the load-time `assertTaxonomyIsLegal()` (line 233-243) that throws on import for a duplicate event or a class-rule violation. `guarded: true` marks the 11 rows AT-016.09 parameterizes over; `opsItem: true` marks the 3 rows that raise ops items (discovery.fit_decline_review, chargeback.opened, provisioning.failed).
- `tests/at/suites/req-016/taxonomy.ts` — the suite's independent oracle copy (`FORBIDDEN_EVENT_PATTERNS`, `GUARDED_ROWS`).
- `supabase/functions/_shared/notifications.ts` — the core (`createNotifications`, ports) that builds the `p_write` jsonb; not read in full (out of my slice).
- `tests/at/suites/req-016/_live.ts` — the integration adapter: outbox port bound to the SQL functions, directory port, SMTP provider, crash switch.
- `tests/at/suites/req-016/_fixture.ts` — the loop-tier memory outbox (lines 218-324) mirroring the same write order.

## Flow

**1. Privilege posture, as written and as checked (the "who can call what" map)**

Outbox migration lines 170-187, fixture lines 29-31:
- `REVOKE ALL` on all four outbox tables from `anon, authenticated` and separately from `service_role`; `REVOKE ALL` on the sequence from all three. RLS enabled on all four outbox tables and on `notification_fixture_transitions`.
- The single grant in the whole subsystem: `GRANT SELECT ON public.notification_deliveries TO authenticated` (line 183), with policy `notification_deliveries_own_inapp` (lines 185-187): `for select to authenticated using (recipient_id = (select auth.uid()) and channel = 'inapp')`. So `authenticated` can read ONLY their own in-app delivery rows. The header (lines 25-29) states this is the one exception and that "Nothing reads the policy yet" — verified: grep over `src/` finds no notification reference, and no edge function selects these tables as a caller.
- The three functions: `REVOKE EXECUTE … FROM public` only, no `GRANT` at all. Effective reachability: table owner (postgres) and any other definer running as owner — exactly what the header lines 19-23 say. The acceptance adapter reaches them only because it connects with the stack's DB URL (`sqlClient` → `new SQL(stack.dbUrl)`, `tests/at/harness/live-stack.ts:322-325`; local stack URL is `postgresql://postgres:…@127.0.0.1:54322/postgres` per `tests/at/harness/local-stack.selftest.ts:47`), i.e., as the superuser/owner, bypassing grants and RLS.
- Reachability summary: `anon` — nothing anywhere. `service_role` — nothing anywhere. `authenticated` — SELECT on `notification_deliveries` filtered by the own-inapp policy; nothing else. `postgres` (owner/operator) — everything; only the acceptance adapter and the definers use it.

**2. How the posture is checked (static + live, and how the tables join existing scans)**

- Static half (`_policy-scan.ts`): each table must have a baseline `revoke all` naming all three roles after `create table` (`no-baseline-revoke`, lines 473-478); any later grant to `anon` is refused outright (`grant-to-anon`, line 296-298); `grant to public`, `grant on all tables`, `alter default privileges`, `force row level security`, policies `to anon` / `for all` are each refused with dedicated codes; tenant-isolated tables must hold exactly `{select}` for authenticated and at least one non-tautological policy whose `using` names `auth.uid()` or a `public.viewer_…` function (`policy-non-viewer-function`, `recordPolicyUsing` lines 223-248 — so the notification policy's `auth.uid()` form passes); unreachable tables must hold zero grants for authenticated (`unreachable-client-grant`, lines 512-520); every non-viewer definer must have `revoke execute from public` and must not grant EXECUTE to any client role (`definer-no-revoke` / `definer-client-execute`, lines 539-551). `notification_deliveries`' policy satisfies the isolated checks; the other four satisfy the unreachable checks. The write-gate scan (`scanWriteGateSql`, lines 584-658) demands `assert_account_active` for service-role-reachable definers — `emit_notification` and the other two hold no EXECUTE grant at all, so they fall outside that gate (no `assert_account_active` call, and the scan only flags definers whose `executeRoles.has('service_role')`).
- Live half: `at:verify` integration runs (e.g. req-001's) call `assertTenantCatalog`, which first asserts `tenantCatalogProblems() === []` and then compares the live catalog row-by-row against `TENANT_CATALOG` (facts above). Notification-specific live expectations: all five tables present in `pg_class`, `force_rls = false`, `anon = []`, `service_role = []`, `notification_deliveries` RLS on + `authenticated = ['select']` + the policy non-tautological, the other four `authenticated = []`, and the three definer functions not executable by anon or authenticated.
- REQ-016's own ids run these too: `assertEmitterIsSoleWriter` (`tests/at/suites/req-016/_integration.ts:52-107`) asserts `providerClientImporters()` = `['notifications.emitter']` and `strayNotificationWriters()` = `[]` at BOTH tiers, plus the self-report `senders()` and a sentinel fired in each of the three domains (`blockers`, `scope_additions`, `lifecycle`) reaching a recipient only with `emittedBy = 'notifications.emitter'` (integration adds the mail-catcher arm: every message addressed to the world carries the emitter headers and names an emitter-written event, `at01601` lines 121-139).

**3. What one call to the emitter actually writes, in order, inside one transaction**

`emit_notification` (lines 191-236) is plain plpgsql with no `COMMIT`; it runs entirely inside the caller's transaction. Order:
1. `INSERT INTO notification_events (event, actor_account_id, payload, recipients)` — event name from `p_write->'event'->>'event'` (FK to the 48-name table: an unregistered name fails on the foreign key, per header lines 7-9); `actor_account_id` = `nullif(p_write->'event'->>'actor','')::uuid` (empty string becomes NULL); `payload` = `coalesce(p_write->'event'->'payload','{}')`; `recipients` = `p_write->'event'->'recipients'` (frozen; the check requires a non-empty array). `RETURNING id into v_event_id`.
2. Loop over `p_write->'deliveries'` (coalesced to `[]`): per element `INSERT INTO notification_deliveries (event_id, event, role, recipient_id, recipient_address, channel, emitted_by, payload, subject, body, idempotency_key)` — role/channel cast to enums, `emitted_by` taken from `emittedBy` (so the check `emitted_by = 'notifications.emitter'` is what makes any other stamping value impossible), `idempotency_key` composed as `'ntf:' || event_id || ':' || recipientId || ':' || channel` (line 225 — structurally unique per event/recipient/channel pair because of the two unique constraints).
3. If `jsonb_typeof(p_write->'opsItem') = 'object'`: `INSERT INTO notification_ops_items (kind, linked_event_id, detail)`.
4. `RETURN v_event_id`.

Transaction boundary: a real producer's own definer "performs its ledger or state transition and then calls `public.emit_notification` in the same transaction, so the two commit together or roll back together" (header lines 11-16). The outbox is therefore a classic transactional outbox: the event row becomes visible only with the producer's transition.

Note: an event with zero deliveries is legal SQL (only `recipients` has a non-empty check) — the emitter would insert the event and no delivery rows, leaving the event `pending` forever (the worker only touches events reached via delivery updates).

**4. What the worker does (how a delivery is marked sent)**

`apply_delivery_results(p_results, p_epoch)` (lines 244-285), also one caller transaction:
1. Per result: `outcome = 'accepted'` ⇒ `UPDATE notification_deliveries SET state='sent', delivered_by_process = coalesce(delivered_by_process, p_epoch), accepted_at = coalesce(accepted_at, now()), provider_receipt = coalesce(nullif(v_result->'receipt','null'), provider_receipt) WHERE id = … RETURNING event_id`. Any other outcome (`no_ack`, `rejected`) ⇒ `UPDATE … SET state='retrying'`.
2. Collect touched event ids; then `UPDATE notification_events SET attempts = attempts + 1, state = (any delivery of the event not 'sent' ? 'retrying' : 'sent')` for each touched event (lines 276-283).
- First-send-owns-the-stamp: `delivered_by_process` and `accepted_at` keep their first values via `coalesce`; the receipt is replaced by any later non-null receipt (`coalesce(new, old)` ordering).
- No `failed` is ever written here despite the enum member; `sent`/`retrying` are the only outcomes.
- The header (lines 31-35) says `accepted_at`/`provider_receipt` "make the provider's acceptance a durable fact … written by `apply_delivery_results` in the same statement that marks a delivery sent, so a crash after acceptance and before the sent mark leaves something to recover from" — but they are written in the SAME statement, so a crash before that UPDATE leaves no stored receipt; the comment's recovery claim does not match the implementation. The header also says a retry must reach the provider again and the provider's own idempotency on the key stops duplicates.

**5. The fixture producer and its fault argument**

`fixture_commit_transition_and_emit(p_scope, p_write, p_induce_fault)` (fixture file lines 33-59), one transaction:
1. Upsert `notification_fixture_transitions (scope_id, event, committed=true)` — `on conflict (scope_id, event) do update set committed = true`.
2. If `p_induce_fault`: `perform nextval('public.notification_fault_triggers')` then `raise exception … using errcode='P0001', detail='induced-fault:notifications.between_transition_and_event_write'` (lines 48-53). The fault is a plain argument of the call — "Nothing in product SQL reads a control table or a session setting to decide whether to fail. The acceptance adapter that arms the fault passes `p_induce_fault`, so the arming lives in the binding and the product owns only the raise" (comment lines 13-17).
3. Otherwise `return public.emit_notification(p_write)`.

What survives the rollback: only the sequence advance. The upsert, the event row, the deliveries, and the ops item are all inside the aborted transaction and are erased; the comment (lines 55-57) states "a rollback here must take all of them". The sequence is the deliberate witness because `nextval` is non-transactional.

**6. How the acceptance suite binds the same system (DB-side view)**

- Integration tier (`tests/at/suites/req-016/_live.ts`): the `OutboxPort` is these exact SQL surfaces —
  - `append` (lines 304-322): reads `crash.armed()`; if armed, snapshots `pg_sequence_last_value('public.notification_fault_triggers'::regclass)` before, then one call `select public.fixture_commit_transition_and_emit(scopeId, JSON.stringify(write)::text::jsonb, armed !== null::boolean)`; counts `refusals` only when the caught error's `detail` equals the raise's detail (line 291-292) and `sequenceAdvances` as the delta after; the ledger is refused when the two witnesses disagree (`createCrashSwitch` judge, `_live.ts:270-280`, `_fault-switch.ts:28-55`).
  - `pending` (lines 324-350): `select … from notification_deliveries where recipient_id = any({uuid array}) and state <> 'sent' order by created_at, id`.
  - `applyPassResults` (lines 352-354): one call `select public.apply_delivery_results(results::jsonb, epoch)`.
  - `events` / `deliveries` / `opsItems` (lines 356-432): operator SELECTs over the three tables, every read scoped by `recipient_id = any(knownActorIds of open worlds)` so 22 worlds on one DB do not observe each other.
  - The transition ledger read `transitionOf` (lines 525-530) selects `committed` from `notification_fixture_transitions` by scope+event; the world's `scopeId` (`req-016/<namespace>`, line 611) keys it so worlds don't see each other's transitions.
  - Writes performed by the adapter operator (world provisioning, lines 539-606): `insert into public.accounts`, `public.organizations`, `public.org_memberships`, `public.projects` — again superuser authority, outside the product surface.
- Loop tier (`tests/at/suites/req-016/_fixture.ts`): the memory outbox mirrors the SQL semantics one-for-one — same write order (transition, fault point, event, deliveries with `idempotencyKey: ntf:<eventId>:<recipientId>:<channel>`, ops item), transition restored to its PREVIOUS value on crash rather than deleted (lines 232-239), `applyPassResults` with first-send-owns-the-stamp and the same event-state derivation (lines 297-317), but no `accepted_at`/`provider_receipt` columns (memory has no receipt fields). `conformance.selftest.ts` asserts the survivor of a crashed emit is still `event-1`.
- AT-016.09 (atomicity oracle, `c-reliability-guard.test.ts:29-129`): for each of the 11 guarded rows, a control world (no fault) must show transition AND event, then a fresh fault world must show `transition=false AND event=false AND delivery=false AND opsItem=false` — the widened "everything the rollback claims" oracle; ops items matched by `kind` because a crashed fire leaves no event id. 240s integration timeout for 22 worlds × 4 accounts.
- AT-016.10 / AT-016.11 (`c-reliability-guard.test.ts:131-296` and the integration bodies `_integration.ts:257-382`): recipients frozen at creation (role reassignment after `fire` must not change who the event delivered to), sent only on acceptance (`{passes:1}` first so the unconfirmed state is observable), retry physically re-reaches the provider, and exactly one physical message per idempotency key after the retry at the catcher (lost-ack replay: Mailpit's store answers the replay, so no duplicate).

## Files Read

- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql` (full)
- `supabase/migrations/20260913121000_notification_fixture_producers.sql` (full)
- `supabase/migrations/` directory listing
- `supabase/functions/_shared/notification-taxonomy.ts` (full)
- `tests/at/suites/req-001/_policy-scan.ts` (lines 1-830, full)
- `tests/at/harness/policy-scan.selftest.ts` (full)
- `tests/at/suites/req-001/_integration.ts` (lines 1-921; `assertTenantCatalog` at 170-201)
- `tests/at/suites/req-001/_live-tenant-reads.ts` (lines 200-331; `tenantTableFacts` at 263-329)
- `tests/at/suites/req-016/_source-scan.ts` (full)
- `tests/at/suites/req-016/_live.ts` (lines 80-637)
- `tests/at/suites/req-016/_fixture.ts` (lines 200-330)
- `tests/at/suites/req-016/_fixture-producers.ts` (full)
- `tests/at/suites/req-016/_fault-switch.ts` (full)
- `tests/at/suites/req-016/_integration.ts` (full)
- `tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts` (full)
- `tests/at/suites/req-016/c-reliability-guard.test.ts` (full)
- `tests/at/harness/live-stack.ts` (grep excerpts, sqlClient at 322-325)
- `tests/at/harness/local-stack.selftest.ts` (grep excerpt for the postgres URL)
- Prior exploration artifacts in `loop/evals/explorer-2026-09-09/out/` surfaced in grep results (used only as leads; every fact above re-verified in source).

## Boundaries

- **In:** the TypeScript core `supabase/functions/_shared/notifications.ts` builds the `p_write` document (event/actor/payload/recipients, per-pair role/recipientId/address/channel/emittedBy/subject/body/payload, optional opsItem). Real producers do not exist yet; the fixture producer `public.fixture_commit_transition_and_emit` is the declared stand-in, with the same shape a real producer will take (its own transition, then `emit_notification`, one transaction). The adapter passes the whole write set as one jsonb text literal.
- **Out (DB → world):** the worker's `pending` feed (deliveries `state <> 'sent'`, ordered by created_at) feeds the provider path; `apply_delivery_results` is the write-back. The only client-facing read is `notification_deliveries` under the own-inapp policy — currently with zero consumers.
- **Catalog scans:** these five tables are registered in req-001's `TENANT_CATALOG` (4 unreachable + 1 tenant-isolated) and are therefore checked by both the static migration oracle (`tenantCatalogProblems`, which req-001's integration AT runs and the harness selftest runs over the real tree) and the live catalog oracle (`tenantTableFacts`/`assertTenantCatalog`). REQ-016 adds three of its own oracles on top (`providerClientImporters`, `taxonomySeedProblems`, `strayNotificationWriters`).
- **Cross-domain reads by the adapter/operator:** `org_memberships`, `projects`, `organizations`, `accounts`, `auth.users` — only for world provisioning and directory resolution, never product SQL.
- **Mail headers/idempotency:** `idempotency_key` (`ntf:<eventId>:<recipientId>:<channel>`) is what the SMTP provider carries as the message-id (`notification-provider.ts:141` formats it `<key@notifications.ai4good.local>`) and what the catcher's per-key message count answers a replay with.

## Non-Obvious Things

1. **Execute is granted to nobody.** `revoke execute from public` with no subsequent `GRANT` (outbox lines 237/286, fixture line 60) is intentional: only the owner and other definers running as owner can call the two outbox functions. Unlike other definers in the tree (e.g. `complete_signup` re-granted to `service_role`), these are deliberately unreachable by service_role, which is why they are exempt from the `assert_account_active` write-gate scan.
2. **The migration header's recovery claim about `accepted_at`/`provider_receipt` contradicts the implementation.** Header lines 31-35 say a crash "after acceptance and before the sent mark leaves something to recover from"; in the code all three (`state='sent'`, `accepted_at`, `provider_receipt`) are written by the same UPDATE statement (lines 258-264), so a crash before that statement stores nothing new. The "provider's own idempotency on the key" clause is the actual duplicate guard.
3. **A later non-null receipt replaces an earlier one.** `coalesce(nullif(new, 'null'), provider_receipt)` puts the incoming value first; only `delivered_by_process` and `accepted_at` are first-wins. In practice the worker's `pending()` filter (`state <> 'sent'`) means a sent row is not re-updated, but nothing in the SQL function itself treats `sent` as terminal.
4. **`notification_events` rows with zero deliveries would never leave `pending`.** The emitter accepts an empty `deliveries` array; `apply_delivery_results` only touches events via delivery-row updates, so a zero-delivery event has no pass to count and no state derivation.
5. **RLS is enabled on all four outbox tables but only `notification_deliveries` has a policy.** On the three tables with no grant and no policy, enabling RLS is inert (no client role holds anything anyway); the migration header (lines 25-29) says the deliveries policy "lands here so the rule is encoded where a later reader will find it" even though nothing reads it yet.
6. **The `strayNotificationWriters` oracle is INSERT-only by omission.** `apply_delivery_results`' UPDATEs are allowed because the oracle only scans `insert into` (plus client `.from(...).insert/upsert`); "the worker updates rows that exist; only the emitter creates them" (`_source-scan.ts:23-25`).
7. **`notification_deliveries.event` is denormalized without a foreign key** — the FK is `event_id`; the `event` text column is a frozen copy of the wire name on the delivery row.
8. **The `notification_ops_items_one_per_event` unique on a nullable column** permits unlinked ops rows; the emitter always links, so it functions as one-ops-item-per-event.
9. **The suite's real oracle for the emitter's sole-writer claim is deliberately not self-reported state:** `senders()` and `Delivery.emittedBy` are produced by the component under test, so the source scans are the "witnesses that are not the subject" (`_source-scan.ts:1-9`).
10. **22 worlds share one database and are kept mutually blind only by adapter scoping:** every live read filters `recipient_id = any(knownActorIds)`; the transition ledger is scoped by `scope_id`; there is no database-level tenant fencing on `notification_events`/`ops_items` reads — the operator SELECTs see rows directly, world isolation is adapter convention.
11. **No cron or scheduled caller exists for `apply_delivery_results` in the DB layer** — the only production-shaped callers found anywhere are the acceptance adapters; retry cadence/backoff is not a database concept here (the worker applies whatever one pass reports; the drain loop above it decides how many passes run).

## Open Questions

- **No scheduled driver:** I could not find any pg_cron entry, edge-function scheduler, or product code path that calls `public.apply_delivery_results` outside the acceptance suite. Whether a production delivery worker exists at all, and its retry cadence, is not determinable from the DB layer (the emitter likewise has no product caller — the fixture producer is the stand-in, and AT-016.09's guarded-matrix definers for payments/keys/completion are not built).
- **`actor_account_id` is unconstrained:** nothing checks it references `accounts`, and the emitter accepts any uuid or NULL. Whether a future producer must supply a real account id is unstated in the schema.
- **The inapp read path:** the `notification_deliveries_own_inapp` policy exists, but I found no reader (UI, edge function, or adapter-as-caller) exercising it; how the in-app inbox will eventually be served (recipient-as-caller read shape) is not in the DB layer yet.
- **Recipients shape enforcement:** the DB check only demands a non-empty jsonb array; the `role/recipientId/channels` object shape of `recipients` is enforced nowhere in SQL (the TypeScript core is the type half, per the header). A malformed-but-nonempty array would be accepted by the emitter.