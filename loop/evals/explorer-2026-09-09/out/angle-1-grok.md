The database layer is two migrations at the end of `supabase/migrations/`, plus catalog rows in the auth suite. There are no notification triggers. Writes go through three `SECURITY DEFINER` functions that no Data API role can execute.

### Components Found

- **`public.notification_state`** — `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql` lines 39, 111, 129. Enum: `'pending' | 'retrying' | 'sent' | 'failed'`. Default on event and delivery rows is `'pending'`. `'failed'` is never written by either writer function.
- **`public.notification_channel`** — same file, line 40. Enum: `'email' | 'inapp'`.
- **`public.notification_role`** — same file, line 41. Enum: `'ngo' | 'volunteer' | 'ex_volunteer' | 'platform_admin'`.
- **`public.notification_event_types`** — same file, lines 45–101. Closed set of 48 wire names. PK `event text`. CHECK `notification_event_types_shape`: `event ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'`. Seeded by one `INSERT`. Recipients, channels, class, and copy are not stored here.
- **`public.notification_events`** — same file, lines 105–119. One logical notification. Columns: `id uuid PK default gen_random_uuid()`, `event text NOT NULL` FK → `notification_event_types(event)`, `actor_account_id uuid` (nullable, no FK), `payload jsonb NOT NULL default '{}'` , `recipients jsonb NOT NULL`, `state notification_state NOT NULL default 'pending'`, `attempts integer NOT NULL default 0`, `created_at timestamptz NOT NULL default now()`. CHECK `notification_events_recipients_frozen`: `jsonb_typeof(recipients) = 'array' AND jsonb_array_length(recipients) > 0`.
- **`public.notification_deliveries`** — same file, lines 121–149. One row per recipient-channel pair. Columns: `id uuid PK`, `event_id uuid NOT NULL` FK → `notification_events(id) ON DELETE CASCADE`, denormalized `event text NOT NULL` (no FK), `role notification_role NOT NULL`, `recipient_id uuid NOT NULL` (no FK), `recipient_address text`, `channel notification_channel NOT NULL`, `state notification_state NOT NULL default 'pending'`, `emitted_by text NOT NULL`, `delivered_by_process text`, `payload jsonb NOT NULL default '{}'`, `subject text NOT NULL`, `body text NOT NULL`, `idempotency_key text NOT NULL`, `accepted_at timestamptz`, `provider_receipt jsonb`, `created_at timestamptz NOT NULL default now()`.
- **`public.notification_ops_items`** — same file, lines 151–161. At most one ops item per event. Columns: `id uuid PK`, `kind text NOT NULL` (unconstrained), `linked_event_id uuid` FK → `notification_events(id) ON DELETE CASCADE`, `detail jsonb NOT NULL default '{}'`, `created_at timestamptz NOT NULL default now()`. UNIQUE `notification_ops_items_one_per_event (linked_event_id)`.
- **`public.notification_fault_triggers`** — same file, lines 163–166. Sequence, not a table. Used so a `nextval` taken before a `RAISE` survives rollback.
- **`public.notification_fixture_transitions`** — `supabase/migrations/20260913121000_notification_fixture_producers.sql` lines 19–27. Stand-in ledger. PK `(scope_id text, event text)` with `event` FK → `notification_event_types(event)`, `committed boolean NOT NULL default false`.
- **`public.emit_notification(jsonb)`** — outbox file, lines 191–240. The only INSERT path into the three outbox tables. `SECURITY DEFINER`, `SET search_path = ''`, `REVOKE EXECUTE FROM public`, no `GRANT EXECUTE`.
- **`public.apply_delivery_results(jsonb, text)`** — outbox file, lines 244–289. One worker pass: mark deliveries, stamp acceptance, increment event `attempts`, derive event `state`. Same privilege shape as the emitter.
- **`public.fixture_commit_transition_and_emit(text, jsonb, boolean)`** — fixture file, lines 33–63. Stand-in producer: upsert transition, optional fault, then `emit_notification`, in one transaction.
- **`TENANT_CATALOG`** — `tests/at/suites/req-001/_policy-scan.ts` lines 21–35. Expectation map every `CREATE TABLE public.*` must join.
- **`prepareWriteSet` / `WriteSet`** — `supabase/functions/_shared/notifications.ts` lines 155–206. Builds the jsonb document the emitter inserts. Not SQL, but it is the only constructor of that document.

Delivery constraints (outbox file 139–142):

| Constraint | Meaning |
|---|---|
| `notification_deliveries_one_per_pair UNIQUE (event_id, recipient_id, channel)` | One delivery per pair inside one event |
| `notification_deliveries_one_per_key UNIQUE (idempotency_key)` | One stored key |
| `notification_deliveries_emitter_only CHECK (emitted_by = 'notifications.emitter')` | Schema half of sole writer |
| `notification_deliveries_email_has_address CHECK (channel <> 'email' OR recipient_address IS NOT NULL)` | Email row must have an address |

Indexes (outbox file 148–149), plus PK/UNIQUE indexes:

- `notification_deliveries_by_recipient_idx` on `(recipient_id, channel)`
- `notification_deliveries_unsent_idx` on `(created_at) WHERE state <> 'sent'`

There is no extra index on `notification_events.event` (FK is unindexed). `notification_ops_items.linked_event_id` is covered by its UNIQUE constraint.

### Flow

1. **Prepare the write set (TypeScript, before any SQL).** `createNotifications.emit` in `notifications.ts` lines 374–380 looks up the taxonomy row, `directory.resolve`s roles, then `prepareWriteSet` (lines 174–206) builds:

```text
{
  event: { event, actor, payload, recipients: [{ role, recipientId, address, channels }] },
  deliveries: [{ role, recipientId, address, channel, emittedBy: 'notifications.emitter', payload, subject, body }],
  opsItem: { kind: row.event, detail: {} } | null
}
```

   Recipients and channels are frozen here. The unique symbol brand on `WriteSet` is stripped by `JSON.stringify` (symbol keys do not serialize).

2. **One client statement, one implicit transaction.** The live outbox `append` (`tests/at/suites/req-016/_live.ts` lines 304–322) runs:

```sql
select public.fixture_commit_transition_and_emit($scope, $write::jsonb, $armed::boolean) as event_id
```

   Bun SQL auto-commits each tagged template. The whole function body is one transaction. There is no `BEGIN`/`EXCEPTION`/`SAVEPOINT` inside the functions.

3. **Fixture producer, in order** (`fixture_commit_transition_and_emit`, fixture file 43–57):

   1. `INSERT INTO notification_fixture_transitions (scope_id, event, committed) VALUES (p_scope, event-name, true) ON CONFLICT (scope_id, event) DO UPDATE SET committed = true`.
   2. If `p_induce_fault` is true: `PERFORM nextval('public.notification_fault_triggers')`, then `RAISE EXCEPTION` SQLSTATE `P0001` with `detail = 'induced-fault:notifications.between_transition_and_event_write'`.
   3. Else `RETURN public.emit_notification(p_write)`.

4. **Emitter writes, in order** (`emit_notification`, outbox file 201–234):

   1. `INSERT INTO notification_events (event, actor_account_id, payload, recipients)` from `p_write->'event'`. `actor` empty string becomes NULL via `nullif(..., '')::uuid`. `payload` defaults to `{}`. `RETURNING id` into `v_event_id`.
   2. For each element of `coalesce(p_write->'deliveries', '[]')`: `INSERT INTO notification_deliveries` with camelCase JSON keys (`role`, `recipientId`, `address`, `channel`, `emittedBy`, `payload`, `subject`, `body`). `idempotency_key` is **computed in SQL**, never taken from JSON: `'ntf:' || v_event_id || ':' || recipientId || ':' || channel`.
   3. If `jsonb_typeof(p_write->'opsItem') = 'object'`: `INSERT INTO notification_ops_items (kind, linked_event_id, detail)`. JSON `null` is type `null`, not `object`, so a missing/null ops item writes nothing.
   4. `RETURN v_event_id`.

   Any failure in 1–3 aborts the function and rolls back the fixture upsert as well. There is no inner subtransaction.

5. **Fault / rollback survivors.** On `p_induce_fault = true`, step 3 of the producer never runs. The upsert, the event, every delivery, and any ops item roll back. The only durable effect is the sequence advance (`nextval` is non-transactional). Live `append` reads `pg_sequence_last_value('public.notification_fault_triggers')` before and after the call (`_live.ts` 282–318) and counts refusals whose `detail` matches the raise.

6. **Worker pass** (`apply_delivery_results`, outbox file 255–283), also one transaction:

   - For each result: if `outcome = 'accepted'`, `UPDATE notification_deliveries SET state = 'sent', delivered_by_process = coalesce(delivered_by_process, p_epoch), accepted_at = coalesce(accepted_at, now()), provider_receipt = coalesce(nullif(receipt, 'null'::jsonb), provider_receipt) WHERE id = ...`. First epoch, first `accepted_at`, and first non-null receipt win.
   - Else (including `'rejected'` and `'no_ack'`): `SET state = 'retrying'` only. No epoch stamp, no receipt, no `'failed'`.
   - Then for each distinct `event_id` actually updated: `attempts = attempts + 1`, `state = 'retrying'` if any sibling delivery is not `'sent'`, else `'sent'`. One increment per event per pass, not per delivery.
   - Unknown delivery ids: `UPDATE` hits 0 rows, `event_id` stays null, event is not touched. The in-memory loop outbox throws instead (`_fixture.ts` 301).

7. **Pending set.** Live `pending()` (`_live.ts` 324–349) is operator SQL: `state <> 'sent'` and `recipient_id = ANY(world actors)`. That matches the partial index predicate. In-app rows never hit a provider; the TypeScript worker records `'accepted'` itself (`notifications.ts` 338–342).

### Files Read

- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql` (full)
- `supabase/migrations/20260913121000_notification_fixture_producers.sql` (full)
- `supabase/migrations/README.md`
- `supabase/migrations/20260906120000_tenant_read_posture_and_org_member_policies.sql` (header + revoke/grant pattern)
- `supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql` (table/RLS precedent)
- `supabase/migrations/20260809090000_volunteer_github_link_and_imported_profile.sql` (default-privilege comment, lines 424–443)
- `supabase/config.toml` (API expose / ports)
- `tests/at/suites/req-001/_policy-scan.ts` (`TENANT_CATALOG`, overlay, definer rules, write-gate)
- `tests/at/suites/req-001/_integration.ts` (`assertTenantCatalog`, `SERVICE_ROLE_SELECT`, `VIEWER_FUNCTIONS`)
- `tests/at/suites/req-001/_live-tenant-reads.ts` (`tenantTableFacts` SQL)
- `tests/at/suites/req-016/_source-scan.ts`
- `tests/at/suites/req-016/_live.ts` (SQL binding, fault sequence, producer call)
- `tests/at/suites/req-016/_fixture.ts` (in-memory analogue of the same transaction)
- `supabase/functions/_shared/notifications.ts` (`WriteSet`, `emit`, `applyPassResults` contract)
- `supabase/functions/_shared/notification-taxonomy.ts` (48 rows, 11 `guarded`, 3 `opsItem`)
- `tests/at/harness/live-stack.ts` (`sqlClient` / `dbUrl`)
- `tests/at/harness/policy-scan.selftest.ts` (catalog scan contract)

### Boundaries

**Inputs into SQL**

- jsonb write set from `prepareWriteSet` (camelCase).
- `p_induce_fault boolean` from the live crash switch, never from a control table or GUC.
- Worker results `{ id, outcome, receipt }[]` plus process epoch string.

**Outputs from SQL**

- `emit_notification` / `fixture_commit_transition_and_emit` return the event uuid.
- `apply_delivery_results` returns void; state is read back by operator `SELECT`s.

**Who can reach what**

| Object | `anon` | `authenticated` | `service_role` | table owner (`postgres` via `AT_SUPABASE_DB_URL`) |
|---|---|---|---|---|
| `notification_event_types` | nothing | nothing | nothing | all, RLS bypassed (no FORCE) |
| `notification_events` | nothing | nothing | nothing | all, RLS bypassed |
| `notification_ops_items` | nothing | nothing | nothing | all, RLS bypassed |
| `notification_fixture_transitions` | nothing | nothing | nothing | all, RLS bypassed |
| `notification_deliveries` | nothing | `SELECT` only, RLS: own `channel = 'inapp'` rows | nothing | all, RLS bypassed |
| `notification_fault_triggers` | nothing | nothing | nothing | `nextval` / `last_value` |
| `emit_notification`, `apply_delivery_results`, `fixture_commit_transition_and_emit` | no EXECUTE | no EXECUTE | no EXECUTE (no GRANT; PUBLIC revoked) | EXECUTE as owner; definers run as owner |

RLS is enabled on all five tables. FORCE is not. Unreachable tables have **no policies**, so a non-owner with a grant would still see zero rows; they also have no grant. `notification_deliveries` is the catalog exception: tenant-isolated, `GRANT SELECT TO authenticated`, policy `notification_deliveries_own_inapp` (`for select to authenticated using (recipient_id = (select auth.uid()) and channel = 'inapp')`). Email rows are invisible to the recipient through the Data API. The migration says nothing reads that policy yet (outbox file lines 25–29). Integration reads are operator SQL, not that policy.

`service_role` is `BYPASSRLS` in Supabase, but these tables revoke its privileges, so bypass does not help. `SERVICE_ROLE_SELECT` in `assertTenantCatalog` is only `{accounts, org_memberships}`; a later `GRANT SELECT` on a notification table to `service_role` would pass the static write check and fail the live catalog.

Functions are not granted to `service_role`, so they are **not** the usual “service_role-only write route”. They also do not call `assert_account_active`. `scanWriteGateSql` only flags definers that both grant EXECUTE to `service_role` and skip that gate (`_policy-scan.ts` 642–648). These three functions therefore do not need a write-gate exemption.

**How posture is checked**

1. **Static overlay (CI / loop).** `tenantCatalogProblems()` → `scanTenantMigrations` + `scanWriteGateSql` (`_policy-scan.ts` 660–675). Reads every `supabase/migrations/*.sql` in name order. Requires every `CREATE TABLE public.*` to be in `TENANT_CATALOG` (both directions: `undeclared-table` / `missing-table`). Requires a later `REVOKE ALL … FROM anon, authenticated, service_role` (`no-baseline-revoke`). Isolated tables must enable RLS, hold exactly `{select}` for `authenticated`, and have at least one policy whose `USING` names `auth.uid()` or `public.viewer_*`. Unreachable tables must leave `authenticated` with `{}`. `anon` remaining privileges are a problem. `service_role` remaining **write** privileges are a problem. Definers must `REVOKE EXECUTE FROM public`; non-viewer definers must not grant EXECUTE to `anon`/`authenticated`/`public`. Refuses `GRANT TO PUBLIC`, `GRANT … ON ALL TABLES`, `ALTER DEFAULT PRIVILEGES`, `FORCE ROW LEVEL SECURITY`, policy `TO anon` / `FOR ALL`.
2. **Live catalog (integration only, auth suite).** `assertTenantCatalog` (`_integration.ts` 170–201) plus `tenantTableFacts` (`_live-tenant-reads.ts` 263–329): `pg_class` `relkind = 'r'` in `public`, seven `has_table_privilege` values × `{anon, authenticated, service_role}`, `relrowsecurity` / `relforcerowsecurity`, `pg_policies`, and `has_function_privilege` EXECUTE for every `prosecdef` function. Every live table must be in `TENANT_CATALOG` and vice versa. Notification tables must show `anon = []`, `service_role = []`, `forceRowLevelSecurity = false`; deliveries `authenticated = ['select']` with a non-tautological policy; the other four `authenticated = []`. `emit_notification`, `apply_delivery_results`, and `fixture_commit_transition_and_emit` must have `anonExecute = false` and `authenticatedExecute = false` (not in `VIEWER_FUNCTIONS`).
3. **Emitter-only inserts (both tiers).** `strayNotificationWriters()` (`_source-scan.ts` 197–228) allows `INSERT INTO` the three outbox tables only inside the `$$` body of `emit_notification`. The fixture table is not in that list. `taxonomySeedProblems()` compares the migration seed to `TAXONOMY` both ways.

Sequences are not catalog tables (`relkind = 'S'` is not scanned). Types are not scanned. Seed.sql does not touch these tables.

### Non-Obvious Things

- **Default grants, not “no GRANT”.** Supabase `ALTER DEFAULT PRIVILEGES` already grant table/sequence privileges to `anon`/`authenticated`/`service_role`. The baseline `REVOKE ALL` is what makes the posture true (`20260809090000` lines 424–443). `[api] auto_expose_new_tables` is unset (`config.toml` 28–33), which is a second, PostgREST-level gate, not a substitute for the revoke.
- **Owner bypass is load-bearing.** No `FORCE ROW LEVEL SECURITY`. Definers run as owner and insert despite RLS with no INSERT policy. Operator SQL in `_live.ts` sees every row, including email deliveries. World isolation there is `WHERE recipient_id = ANY(...)`, not RLS.
- **Idempotency key is minted in SQL from the new event id.** A retry of the **same delivery row** reuses the stored key. A second emit of the same event type mints a new uuid and new keys. The fixture PK `(scope_id, event)` only upserts `committed`; it does not stop a second outbox event.
- **`'failed'` is dead at this layer.** Enum exists; both writers only use `pending` (default), `retrying`, `sent`. `pending()` is `state <> 'sent'`, so `failed` would be retried if anyone wrote it.
- **`apply_delivery_results` does not treat `sent` as terminal.** A later non-accepted result for the same id would set `retrying`. The worker’s `pending()` filter is what usually prevents that.
- **No FK from `recipient_id` or `actor_account_id` to `accounts` / `auth.users`.** Directory resolution is TypeScript. In-app RLS compares `recipient_id` to `auth.uid()`.
- **Empty deliveries are legal in SQL.** The event CHECK only requires a non-empty `recipients` array. `emit_notification` will insert an event and zero deliveries if `deliveries` is missing/`[]`. `prepareWriteSet` always emits one delivery per role × channel.
- **Taxonomy flags are not enforced in SQL.** Ops items and guarded-ness live in TypeScript. The database will store an ops item for any event, or none, if the jsonb says so. Three taxonomy rows set `opsItem: true`: `discovery.fit_decline_review`, `chargeback.opened`, `provisioning.failed`.
- **Eleven guarded rows have no real producer.** Fixture migration header (lines 3–8): payment/key/completion definers do not exist. `notification_fixture_transitions` is the stand-in ledger, in its own file so a later drop is one migration that does not touch the outbox schema.
- **`strayNotificationWriters` is INSERT-only.** Updates in `apply_delivery_results` are allowed by that oracle by omission.
- **UNIQUE on `linked_event_id` allows multiple NULLs** in PostgreSQL. The function always sets `linked_event_id = v_event_id`.
- **Loop vs live crash witness.** Loop restores the previous transition map value and increments an in-process counter (`_fixture.ts` 229–239). Live uses the sequence. Same fault name: `notifications.between_transition_and_event_write`.
- **Live catalog does not assert `service_role` EXECUTE.** Only anon/authenticated. Absence of service_role EXECUTE on these functions is inferred from `REVOKE FROM PUBLIC` and no GRANT, not measured in `assertTenantCatalog`.
- **Notification RLS is unexercised by req-016.** Comment at outbox file 27–28; grep shows no PostgREST read of `notification_deliveries` as a caller.

### Open Questions

- Object owner is not measured here. Comments elsewhere say `postgres` remains owner; live SQL uses `AT_SUPABASE_DB_URL`. I did not query `pg_roles` / `pg_class.relowner`.
- I did not run `has_table_privilege` / `has_function_privilege` against a live replay, so the live catalog numbers are inferred from the SQL and the scan rules.
- I did not confirm whether Supabase default privileges on **sequences** are `ALL` vs a subset; the migration revokes `ALL` from the three roles either way.
- Whether PostgREST still lists the RPCs in OpenAPI after reload, even with EXECUTE revoked, was not checked.
- How a future real producer will open the transaction (one definer vs explicit `BEGIN` from an edge function) is not in this tree yet; only the fixture shape exists.