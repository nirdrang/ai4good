### Components Found

**Migrations (in name order):**
- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql` — the outbox schema, closed vocabulary, posture, emitter + worker definers.
- `supabase/migrations/20260913121000_notification_fixture_producers.sql` — stand-in producer ledger + definer. Header says it is in its own file so a later drop touches only that table/function.

**Enums — `20260913120000` lines 39-41:**
- `public.notification_state` (`pending`,`retrying`,`sent`,`failed`).
- `public.notification_channel` (`email`,`inapp`).
- `public.notification_role` (`ngo`,`volunteer`,`ex_volunteer`,`platform_admin`).

**Tables:**

1. `public.notification_event_types` — `20260913120000` lines 45-48, seed lines 53-101:
   - `event text PRIMARY KEY`, `CHECK (event ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')`.
   - 48 rows seeded via single `INSERT ... VALUES`: `triage.approved` … `lovable.setup_complete`. Header + comment (lines 50-51): the 48 wire names, immutable in v1; recipients/channels/class/copy live only in `supabase/functions/_shared/notification-taxonomy.ts`, DB holds names as FK target.
2. `public.notification_events` — lines 105-116:
   - `id uuid PK DEFAULT gen_random_uuid()`, `event text NOT NULL REFERENCES notification_event_types(event)`, `actor_account_id uuid NULL` (no FK), `payload jsonb NOT NULL DEFAULT '{}'`, `recipients jsonb NOT NULL`, `state notification_state NOT NULL DEFAULT 'pending'`, `attempts integer NOT NULL DEFAULT 0`, `created_at timestamptz NOT NULL DEFAULT now()`.
   - `CHECK notification_events_recipients_frozen`: `jsonb_typeof(recipients)='array' AND jsonb_array_length>0` — recipients frozen at creation.
3. `public.notification_deliveries` — lines 121-143:
   - `id uuid PK`, `event_id uuid NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE`, `event text NOT NULL` (denormalized copy, no FK), `role notification_role NOT NULL`, `recipient_id uuid NOT NULL` (no FK), `recipient_address text NULL`, `channel notification_channel NOT NULL`, `state NOT NULL DEFAULT 'pending'`, `emitted_by text NOT NULL`, `delivered_by_process text NULL`, `payload jsonb NOT NULL DEFAULT '{}'`, `subject text NOT NULL`, `body text NOT NULL`, `idempotency_key text NOT NULL`, `accepted_at timestamptz NULL`, `provider_receipt jsonb NULL`, `created_at NOT NULL DEFAULT now()`.
   - `UNIQUE (event_id,recipient_id,channel)` (`notification_deliveries_one_per_pair`), `UNIQUE (idempotency_key)` (`notification_deliveries_one_per_key`), `CHECK (emitted_by='notifications.emitter')` (`..._emitter_only`), `CHECK (channel<>'email' OR recipient_address IS NOT NULL)` (`..._email_has_address`).
   - Indexes: `notification_deliveries_by_recipient_idx (recipient_id,channel)` line 148; partial `notification_deliveries_unsent_idx (created_at) WHERE state<>'sent'` line 149 (worker pending scan).
4. `public.notification_ops_items` — lines 151-158:
   - `id uuid PK`, `kind text NOT NULL`, `linked_event_id uuid NULL REFERENCES notification_events(id) ON DELETE CASCADE`, `detail jsonb NOT NULL DEFAULT '{}'`, `created_at NOT NULL DEFAULT now()`, `UNIQUE (linked_event_id)`.
   - Note: column is nullable; Postgres `UNIQUE` permits multiple `NULL`s, so DB alone does not forbid multiple unlinked rows — emitter (line 229-232) only inserts with non-null `v_event_id` when `p_write->'opsItem'` is an object, so `NULL` never arises via product path.
5. `public.notification_fixture_transitions` — `20260913121000` lines 19-24:
   - `scope_id text NOT NULL`, `event text NOT NULL REFERENCES notification_event_types(event)`, `committed boolean NOT NULL DEFAULT false`, `PRIMARY KEY (scope_id,event)`. Comment (26-27): stand-in ledger for guarded rows until real producers exist.

**Sequence:**
- `public.notification_fault_triggers` — `20260913120000` line 166. Comment lines 163-165: a sequence, not a table, because `nextval` is outside transactional control; value taken before `raise exception` survives rollback so injected fault is countable afterwards.

**SECURITY DEFINER functions (all `LANGUAGE plpgsql`, `SET search_path=''`, `REVOKE EXECUTE FROM public`, no grant back):**
- `public.emit_notification(p_write jsonb) RETURNS uuid` — lines 191-237.
- `public.apply_delivery_results(p_results jsonb, p_epoch text) RETURNS void` — lines 244-286.
- `public.fixture_commit_transition_and_emit(p_scope text, p_write jsonb, p_induce_fault boolean) RETURNS uuid` — `20260913121000` lines 33-60.
- No other functions in these two files.

**Triggers:** none. Neither notification migration contains `CREATE TRIGGER`. Atomicity is by single-transaction inserts, not row triggers. Contrast `public.audit_events` which has `audit_events_no_update_or_delete` / `..._no_truncate` triggers in `20260908120000_account_lifecycle_audit_and_contact_transfer.sql` lines 60-65.

**Grants / revokes / RLS / policies:**
- `20260913120000` lines 170-176: `REVOKE ALL ON TABLE notification_event_types,notification_events,notification_deliveries,notification_ops_items FROM anon,authenticated;` then separately `... FROM service_role;` + `REVOKE ALL ON SEQUENCE notification_fault_triggers FROM anon,authenticated,service_role;`
- Lines 178-181: `ENABLE ROW LEVEL SECURITY` on all four tables. `20260913121000` line 31 same for fixture table.
- Line 183: sole grant: `GRANT SELECT ON notification_deliveries TO authenticated;`
- Lines 185-187: sole policy: `CREATE POLICY notification_deliveries_own_inapp ON notification_deliveries FOR SELECT TO authenticated USING (recipient_id=(SELECT auth.uid()) AND channel='inapp')`.
- Function revokes: `REVOKE EXECUTE ON FUNCTION emit_notification(jsonb) FROM public;` line 237; same for `apply_delivery_results(jsonb,text)` line 286; `fixture_commit_transition_and_emit(text,jsonb,boolean)` in fixture file line 60. No `GRANT EXECUTE ... TO service_role/authenticated/anon` follows — unlike e.g. `complete_signup`/`update_organization` which re-grant to `service_role`. Header lines 19-23 states intent: only owner and another definer running as owner can reach them.
- Both files end with `notify pgrst, 'reload schema';`.
- Fixture table posture mirrors outbox: `REVOKE ALL ... FROM anon,authenticated; REVOKE ALL ... FROM service_role;` lines 29-30, RLS on, no policy, no grant.

### Flow

**One call to `public.emit_notification(p_write jsonb)` — lines 197-235, runs entirely in caller's transaction (no `COMMIT`):**
1. Parse `v_event := p_write->'event'->>'event'`.
2. `INSERT INTO notification_events (event,actor_account_id,payload,recipients)` with `nullif(actor,'')::uuid`, `coalesce(payload,'{}')`, `recipients := p_write->'event'->'recipients'` → `RETURNING id INTO v_event_id`. FK to `event_types` fails unregistered names; `recipients_frozen` CHECK fails empty/non-array. Step order matters: event row first so `event_id` FK target exists.
3. Loop `jsonb_array_elements(coalesce(p_write->'deliveries','[]'))`: per element `INSERT INTO notification_deliveries (event_id,event,role,recipient_id,recipient_address,channel,emitted_by,payload,subject,body,idempotency_key)` with casts to `notification_role`/`notification_channel`/`uuid`, `emitted_by := v_delivery->>'emittedBy'` (must be literal `notifications.emitter` or CHECK fails), `idempotency_key := 'ntf:'||v_event_id||':'||recipientId||':'||channel` computed server-side (line 225), not caller-supplied.
4. If `jsonb_typeof(p_write->'opsItem')='object'`: `INSERT INTO notification_ops_items (kind,linked_event_id,detail)` with `v_event_id`. `UNIQUE(linked_event_id)` enforces at most one ops item per event.
5. `RETURN v_event_id`.
6. Transaction boundary per header lines 11-17: a real producer's own definer performs its ledger/state transition then calls `emit_notification` in the same transaction, so transition + event + deliveries + ops item commit or roll back together. No code path commits transition and notification in separate round trips. Worker `apply_delivery_results` is a separate later transaction.

**Worker `public.apply_delivery_results(p_results jsonb, p_epoch text)` — lines 249-284, one transaction per pass:**
- Loop results array. If `outcome='accepted'`: `UPDATE deliveries SET state='sent', delivered_by_process=coalesce(old,p_epoch), accepted_at=coalesce(old,now()), provider_receipt=coalesce(receipt,old) WHERE id=... RETURNING event_id`. Else: `UPDATE ... SET state='retrying'`. Collect distinct `v_touched` event ids.
- Then `UPDATE notification_events SET attempts=attempts+1, state=CASE WHEN EXISTS (SELECT 1 FROM deliveries WHERE event_id=e.id AND state<>'sent') THEN 'retrying' ELSE 'sent' END WHERE id=ANY(v_touched)`.
- Header lines 31-35: `accepted_at`+`provider_receipt` are written in same statement as `sent` so crash-after-acceptance leaves recovery fact; they are not a skip-provider-on-retry mechanism — retry must reach provider again, provider idempotency on key stops duplicates.

**Fixture producer `public.fixture_commit_transition_and_emit(p_scope,p_write,p_induce_fault)` — fixture file lines 43-58, one transaction:**
1. `INSERT INTO notification_fixture_transitions (scope_id,event,committed) VALUES (p_scope, p_write->'event'->>'event', true) ON CONFLICT (scope_id,event) DO UPDATE SET committed=true;` — one-row upsert standing in for future ledger statements.
2. `IF p_induce_fault THEN PERFORM nextval('public.notification_fault_triggers'); RAISE EXCEPTION 'induced fault: crash at notifications.between_transition_and_event_write' USING ERRCODE='P0001', DETAIL='induced-fault:notifications.between_transition_and_event_write'; END IF;`
3. `RETURN public.emit_notification(p_write);` — comment lines 55-56 notes rollback here must take event+deliveries+ops item.

**`p_induce_fault` semantics + rollback survival:**
- Pure call argument forwarded by live adapter `outbox.append` in `tests/at/suites/req-016/_live.ts` lines 304-322: `sql select fixture_commit_transition_and_emit(scope, write::jsonb, armed!==null::boolean)`. Header fixture file lines 13-17: nothing in product SQL reads a control table/session setting; arming lives in binding, product owns only the raise.
- When `true`: sequence advances, then raise aborts transaction. Upserted transition row + any `emit_notification` rows (none yet — fault is between transition and emit) are erased. Only the `nextval` survives because sequences are non-transactional.
- Checked by two witnesses (`_live.ts` lines 267-292): `pg_sequence_last_value('public.notification_fault_triggers'::regclass)` read before/after (coalesced, relation not session so cross-connection visible) vs adapter-counted refusals whose `detail` equals `induced-fault:notifications.between_transition_and_event_write` (lines 291-292). `triggerCount()` throws if they differ — catches took-sequence-but-stopped-raising vs refusal-without-sequence-move.

**Acceptance-suite driving (same DB objects at both tiers):**
- Loop tier binds same core to memory; integration tier (`_live.ts` `outbox` port lines 296-433) binds to these exact functions: `append` → fixture producer, `pending` → `SELECT ... FROM notification_deliveries WHERE recipient_id=ANY(scopedActors) AND state<>'sent'`, `applyPassResults` → `apply_delivery_results`, `events/deliveries/opsItems` → operator `SELECT`s from the three outbox tables scoped by recipient/event ids (lines 356-432). Every read filters to open worlds' `knownActorIds` so 22 worlds on one DB do not observe each other.
- Directory port (`_live.ts` 437-465) does not read notification tables: NGO = `org_memberships.account_id` for world org, volunteer = `projects.assigned_volunteer_id`, addresses from `auth.users`.
- Static oracles in `tests/at/suites/req-016/_source-scan.ts`: `strayNotificationWriters()` (lines 197-228) allows `INSERT INTO public.notification_{events,deliveries,ops_items}` only inside `emit_notification` body in migrations, never in product modules or via `.from(...).insert/upsert`; `taxonomySeedProblems()` diffs seeded 48 names vs `TAXONOMY`; `providerClientImporters()` asserts only `notifications.emitter` holds send path.

### Files Read
- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql` (full, 291 lines).
- `supabase/migrations/20260913121000_notification_fixture_producers.sql` (full, 65 lines).
- `tests/at/suites/req-016/_source-scan.ts` (full).
- `tests/at/suites/req-016/_live.ts` (full, esp. lines 282-322 crash switch, 324-433 outbox port).
- `tests/at/suites/req-016/_integration.ts` (esp. `assertEmitterIsSoleWriter`, `at01601`, `at01611`).
- `tests/at/suites/req-001/_policy-scan.ts` lines 1-80 (`TENANT_CATALOG` 21-35) and 660-675 (`tenantCatalogProblems`).
- `tests/at/suites/req-001/_live-tenant-reads.ts` lines 263-329 (`tenantTableFacts`: `pg_class` + 7 `has_table_privilege` × 3 roles + `pg_policies` + `pg_proc prosecdef`).
- `tests/at/suites/req-001/_integration.ts` lines 166-201 (`SERVICE_ROLE_SELECT={accounts,org_memberships}`, `VIEWER_FUNCTIONS`, `assertTenantCatalog`).
- Grep over `supabase/migrations/*.sql` for `create trigger|index|sequence|policy|function|revoke|grant|enable row level security|notify pgrst` to confirm no hidden trigger/grant.

### Boundaries
- **In:** TypeScript core `supabase/functions/_shared/notifications.ts` (+ `notification-taxonomy.ts`, `notification-provider.ts`) builds `p_write` JSON (event/payload/recipients, per-pair role/recipientId/address/channel/subject/body/payload, optional opsItem). Future real producers will be definers calling `emit_notification` after their own transition — same shape as fixture producer.
- **Out (reads):** worker/drain path reads pending deliveries via operator SQL then calls `apply_delivery_results`; in-app read path is recipient-as-caller `SELECT` on `notification_deliveries` through RLS policy (nothing reads it yet per header lines 25-29). SMTP provider sends `subject/body/address` with `x-notification-key/event-id/recipient-id/channel` headers (see `tests/at/suites/req-016/_mail-witness.ts` lines 110-113); catcher + `idempotency_key` are duplicate witnesses.
- **Adjacent catalog:** `organizations`/`org_memberships`/`projects`/`accounts`/`auth.users` supply directory resolution and world setup (`_live.ts` 539-606); `notification_*` tables FK only to each other + `event_types`, never to tenant tables, so tenant deletes do not cascade into outbox except event→deliveries/ops cascade on event delete (operator-only, no client privilege).

### Non-Obvious Things
- **Posture is `revoke-from-everyone-including-service_role`, not just RLS.** All five tables revoke from `anon,authenticated,service_role`; only `notification_deliveries` gets `SELECT` back to `authenticated`. Functions revoke `EXECUTE FROM public` and grant to nobody — strictly tighter than older definers that re-grant to `service_role`. Caller is never the Data API role; only table owner or another definer reaches rows.
- **The one tenant-isolated exception is deliberate:** `notification_deliveries` is `tenant-isolated` with `recipient_id=(SELECT auth.uid()) AND channel='inapp'` so recipient reads own in-app rows as caller, never via service-role read in edge function. Other four are `unreachable-by-client-roles`.
- **Taxonomy split:** DB stores only event names; channels/recipients/class/copy are TypeScript-only. Equality is enforced by static oracle, not FK.
- **`deliveries.event` is unenforced text**, not a FK — only `events.event` is FK-checked. A stray writer could put mismatched `event` on a delivery; `strayNotificationWriters` + `emitted_by` CHECK are the guards, not the schema.
- **`accepted_at`/`provider_receipt` look like exactly-once machinery but are not:** header explicitly says retry must re-reach provider; dedup is provider-side idempotency on `idempotency_key` (`UNIQUE` + Mailpit replay in `_provider-faults.ts`/`_live.ts` 476).
- **Sequence-as-witness is load-bearing:** `notification_fault_triggers` has no business meaning; its only consumer is the atomicity test (`AT-016.09`) proving transition+emit are one transaction (no delivery/event row survives a crash between them).
- **Fault lives in adapter, not product:** no control table, no `current_setting`, no GUC — boolean argument only. Easy to misread `p_induce_fault` as test-only dead code; it is the specified crash point `notifications.between_transition_and_event_write`.
- **Ops-item uniqueness edge:** `UNIQUE(linked_event_id)` with nullable column technically allows repeated `NULL`s; invariant holds only because emitter never inserts `NULL`.

### Open Questions
- I did not trace a scheduled worker/cron that calls `apply_delivery_results` in production — the migration defines the function but no `pg_cron` entry or edge-function caller is in these two files; the only callers found are the acceptance adapters (`_live.ts` line 353, `_fixture.ts` loop equivalent). Retry cadence/backoff therefore not determinable from DB layer alone.
- I did not verify the live `has_table_privilege` outcome for `TRUNCATE/REFERENCES/TRIGGER` on these tables beyond the migration text (revoke-all should clear them, but default ACLs and owner bypass mean only an integration `tenantTableFacts` run proves it).
- Retention/GDPR deletion for `notification_deliveries` (which stores `recipient_address`/`payload`) is not defined in these migrations; `ON DELETE CASCADE` from events exists but no cleanup job was found in this slice.
