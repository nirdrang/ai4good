### Components Found

- **`createNotifications` / `Notifications`** — `supabase/functions/_shared/notifications.ts`. Pure core: taxonomy lookup, write-set construction, worker pass, drain. Stores nothing. Six ports (`OutboxPort`, `ProviderPort`, `DirectoryPort`, `TaxonomyPort`, `ClockPort`, `ProcessPort`).
- **`EmitRequest` / `EmitOutcome` / `WriteSet` / `prepareWriteSet`** — same file. The emit contract and the branded write set. Only `prepareWriteSet` may construct a `WriteSet`.
- **`TAXONOMY` / `TaxonomyRow` / `channelsFor` / `DEFAULT_BY_CLASS`** — `supabase/functions/_shared/notification-taxonomy.ts`. Closed 48-row table. Class-channel rule runs at module load.
- **`renderCopy` / `NAMED`** — `supabase/functions/_shared/notification-copy.ts`. Named copy for 10 events; everything else uses a general template.
- **`createSmtpProvider`** — `supabase/functions/_shared/notification-provider.ts`. The one SMTP send path. `ProviderPort.deliver` → `accepted` | `rejected` | `no_ack`.
- **`public.emit_notification` / `public.apply_delivery_results`** — `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`. Sole SQL writer of the outbox; worker-pass applier.
- **`public.fixture_commit_transition_and_emit`** — `supabase/migrations/20260913121000_notification_fixture_producers.sql`. Stand-in producer: transition, optional fault, then `emit_notification`, one transaction.
- **`providerClientImporters` / `strayNotificationWriters` / `taxonomySeedProblems`** — `tests/at/suites/req-016/_source-scan.ts`. Sole-writer and seed oracles.
- **`pairProblems` / `expectedPairs` / `countPairs`** — `tests/at/suites/req-016/_oracles.ts`. Delivery-pair assertion helpers.
- **`assertEmitterIsSoleWriter`** — `tests/at/suites/req-016/_integration.ts`. Shared AT-016.01 procedure.
- **`publicProjectAnswer` / `PublicProjectView`** — `supabase/functions/_shared/public-project.ts`. The only public surface. Three fields. No trust label.
- **`public.read_public_project`** — `supabase/migrations/20260906120000_tenant_read_posture_and_org_member_policies.sql`. Service-role RPC: `project_id`, `project_name`, `organization_name`.
- **`WRITE_ROUTES` / `writeRoute` / `writePipeline`** — `supabase/functions/_shared/write-routes.ts` and `edge.ts`. Mandatory write-route gate. A new vet route must register here.
- **`public.audit_events` / `public.append_audit_event`** — `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql` (replaced by `20260912120000_audit_actor_on_product_paths.sql`). Append-only audit. Kinds today: `org_contact_transferred`, `account_lifecycle_changed`, `org_role_changed`.
- **`discoveryDailyCreditsUnverified` / `discoveryDailyCreditsVetted`** — `tests/at/harness/atconfig.ts` lines 83–94. Pinned grants 10 and 30 already exist.

There is **no product caller of `emit`**. `createNotifications` is constructed only in `tests/at/suites/req-016/_fixture.ts` and `_live.ts`. No edge function under `supabase/functions/` imports the notifications module.

---

### Flow

#### Emit (logical notification)

1. **Caller** (today: fixture `fire`, not a product route) calls `core.emit({ event, actor, params })` in `notifications.ts` lines 374–381.
2. **Taxonomy lookup.** Unknown event → `{ accepted: false, reason: 'unregistered event type' }`. No write.
3. **`directory.resolve(row.recipients)`.** Role → `{ recipientId, address }`. Missing role or email-channel with `address === null` throws in `prepareWriteSet` (lines 174–185).
4. **`prepareWriteSet`** (lines 174–206):
   - `channelsFor(row)`: named channels, or `DEFAULT_BY_CLASS[row.class]`.
   - `renderCopy(row, payload)` for subject/body.
   - One `PreparedDelivery` per recipient × channel. `emittedBy` is always `'notifications.emitter'`.
   - If `row.opsItem`, one ops item `{ kind: row.event, detail: {} }`.
5. **`outbox.append(write)`** — one call, one transaction:
   - Loop: in-memory arrays after a fake transition, then a crash switch (`_fixture.ts` 230–276).
   - Integration: `public.fixture_commit_transition_and_emit(scope, write, induce_fault)` (`_live.ts` 304–322), which upserts the stand-in ledger, optionally raises, then `public.emit_notification(p_write)`.
6. **SQL `emit_notification`** (migration lines 191–236), in order:
   1. Insert `notification_events` (event, actor, payload, frozen recipients).
   2. Insert one `notification_deliveries` per delivery; idempotency key `ntf:{eventId}:{recipientId}:{channel}`.
   3. Insert `notification_ops_items` if `opsItem` is an object.
   4. Return the event uuid.
7. Return `{ accepted: true, eventId }`. Rows start `pending`. Nothing is sent yet.

#### Delivery worker

8. **`drain()` / `runPass()`** (`notifications.ts` 335–401) reads `outbox.pending()`.
9. In-app: recorded `accepted` with no provider call (lines 338–342). Email: `provider.deliver({ key, to, subject, body, eventId, recipientId, channel })`.
10. **`outbox.applyPassResults`** → `public.apply_delivery_results`:
    - `accepted` → delivery `sent`, stamp `delivered_by_process`, `accepted_at`, `provider_receipt`.
    - anything else → delivery `retrying`.
    - Event `attempts += 1`; event `sent` iff every delivery is `sent`, else `retrying`.
11. The enum includes `'failed'`. **`apply_delivery_results` never writes `failed`.**

#### Sole-writer checks (AT-016.01)

12. `providerClientImporters()` must equal `['notifications.emitter']`.
13. `strayNotificationWriters()` must be `[]`.
14. `sut.senders()`: only `notifications.emitter` has `canSendDirectly: true`.
15. Domain fires (`blocker.raised`, `thread.comment`, `pm_item.status_changed`) must produce deliveries with `emittedBy === 'notifications.emitter'`.

#### Public project

16. POST `public-project` (`verify_jwt = false`) → `publicProjectAnswer` → `read_public_project` as service role → `{ ok, projectId, projectName, organizationName }` or a 404/502 that does not say which.

---

### Files Read

- `supabase/functions/_shared/notifications.ts`
- `supabase/functions/_shared/notification-taxonomy.ts`
- `supabase/functions/_shared/notification-copy.ts`
- `supabase/functions/_shared/notification-provider.ts`
- `supabase/functions/_shared/public-project.ts`
- `supabase/functions/_shared/tenant-reads.ts`
- `supabase/functions/_shared/edge.ts` (public reads, `writeRoute`, CORS)
- `supabase/functions/_shared/write-routes.ts`
- `supabase/functions/_shared/accounts.ts` (org create args)
- `supabase/functions/_shared/memberships.ts` (org rename)
- `supabase/functions/_shared/admin-operations.ts`
- `supabase/functions/_shared/verification.ts`
- `supabase/functions/public-project/index.ts`
- `supabase/functions/create-organization/index.ts`
- `supabase/functions/update-organization/index.ts`
- `supabase/functions/organization-dashboard/index.ts`
- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`
- `supabase/migrations/20260913121000_notification_fixture_producers.sql`
- `supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql` (orgs table)
- `supabase/migrations/20260906120000_tenant_read_posture_and_org_member_policies.sql` (`read_public_project`)
- `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql`
- `supabase/migrations/20260912120000_audit_actor_on_product_paths.sql` (`append_audit_event`)
- `tests/at/suites/req-016/` — every file: `_bind.ts`, `_contract.ts`, `_fixture.ts`, `_fixture-producers.ts`, `_live.ts`, `_integration.ts`, `_source-scan.ts`, `_oracles.ts`, `_mail-witness.ts`, `_provider-faults.ts`, `_fault-switch.ts`, `taxonomy.ts`, `a-`/`b-`/`c-`/`d-*.test.ts`
- `tests/at/suites/req-001/_policy-scan.ts` (TENANT_CATALOG)
- `tests/at/suites/req-001/_write-route-scan.ts`
- `tests/at/suites/req-001/d-tenant-isolation.test.ts` (public page keys)
- `tests/at/suites/req-001/_integration.ts` (`PUBLIC_PAGE_KEYS`)
- `tests/at/harness/atconfig.ts` (grants 10/30)
- `tests/at/expected/req-016.json`
- `src/routes/index.tsx`, `src/routes/__root.tsx`, `src/routes/README.md`, `src/router.tsx`, `src/routeTree.gen.ts`, `src/lib/api/example.functions.ts`
- `.taskmaster/docs/acceptance/at-req-002.md`
- `.taskmaster/docs/requirements/req-016.md`
- `loop/items/AI4DEV-102/brief.md`
- `loop/decomp/req-002.md` (cross-contracts)

---

### Boundaries

**Inputs to emit**

```121:129:supabase/functions/_shared/notifications.ts
export type EmitRequest = {
  event: string;
  /** the account that caused the event, or null for a system cause */
  actor: string | null;
  /** the producer's context, frozen onto the event and every delivery */
  params: Record<string, unknown>;
};

export type EmitOutcome = { accepted: true; eventId: string } | { accepted: false; reason: string };
```

Directory must resolve every taxonomy recipient. For `vetting.outcome` that is role `ngo`. Email is required because class `decision` defaults to `['email', 'inapp']`.

**SQL privilege boundary.** `emit_notification` is security definer, `revoke execute … from public`, **no grant to `service_role`**. Edge functions cannot RPC it. A product producer definer must call it inside the same transaction. Product writes go `writeRoute` → `callDatabaseFunction` (service role) → producer definer → `emit_notification`.

**Write-route scan.** A new vet function must be a `WRITE_ROUTES` edge row, `Deno.serve(writeRoute(`, and a `[functions.<name>]` block. `_shared` modules other than `edge.ts` must not contain `/rest/v1/`, `createClient`, `.rpc(`, or service-role key names. A live OutboxPort that talks to PostgREST cannot live in `_shared`.

**Sole-writer scan.** A new `INSERT INTO public.notification_events|deliveries|ops_items` outside the `emit_notification` function body fails `strayNotificationWriters`. A new SMTP/provider import or `deliver(` / `ProviderPort` outside `NOTIFICATION_COMPONENTS['notifications.emitter']` fails `providerClientImporters` (reported as `undeclared:<path>`).

**Tenant catalog.** Every new `public` table needs a `TENANT_CATALOG` row in `tests/at/suites/req-001/_policy-scan.ts`. Notification tables already: `notification_event_types` / `events` / `ops_items` unreachable; `notification_deliveries` tenant-isolated (SELECT own in-app rows).

**Auth surfaces this run sits on.** `organizations` is `{ id, name, created_at }` only. `create-organization` / `update-organization` take a name. No mission, country, website, logo, vetted flag, or allowance. Email “verified” is GoTrue `email_confirmed_at` (`verification.ts`); it is not founder-vetted.

**Public surface.** `PublicProjectView` is exactly `{ projectId, projectName, organizationName }`. AT-001.22 asserts those keys and that `organizationId` / `assignedVolunteerId` are absent. AT-002.23 must prove no `"verified"` claim here; if a trust flag is shown it must be exactly `"founder-vetted"`. Listing screens do not exist (deferred, `loop/decomp/req-011.md`).

---

### Non-Obvious Things

**1. The wire name is `vetting.outcome`, not “verification-outcome”.** Requirement prose and AT-002.13 say “verification-outcome notification”. The closed taxonomy row is:

```56:56:supabase/functions/_shared/notification-taxonomy.ts
  { event: 'vetting.outcome', recipients: ['ngo'], channels: null, tone: 'normal', class: 'decision' },
```

Same row in the suite oracle (`tests/at/suites/req-016/taxonomy.ts:57`) and the seed (`20260913120000_…sql:57`). REQ-016.md line 6: “Vetting outcome (vetted/unvetted) → NGO.” **One event covers both.** No `payloadKeys`, not `guarded`, no `opsItem`.

**2. Taxonomy is closed. Adding an event type is a spec change, not a local register.** Files that must stay equal:

| What | File |
|---|---|
| Product rows | `notification-taxonomy.ts` `TAXONOMY` |
| Suite oracle | `tests/at/suites/req-016/taxonomy.ts` `TAXONOMY` |
| DB seed names | `insert into public.notification_event_types` in the outbox migration |
| Named copy (optional) | `notification-copy.ts` `NAMED` |
| Sample payloads | `tests/at/suites/req-016/_fixture-producers.ts` |
| Payload predicates | suite `PAYLOAD_PREDICATES` |

AT-016.02 compares registered names to the suite table both ways, then `taxonomySeedProblems()`, then `runtimeRegistrationSurface() === []`. `runtimeRegistrationSurface` is hard-coded `[]`. There is no add API.

**3. Vet vs unvet is not distinguished on the wire today.** `renderCopy` has no `vetting.outcome` entry. General template (`notification-copy.ts` 73–83):

- subject: `eventInWords` → `"Vetting outcome"`
- body: `"Vetting outcome notification."` plus any non-empty **string** values from `params`, space-joined

A caller may pass `{ outcome: 'vetted' }` / `{ outcome: 'unvetted' }` and those strings appear in the body **without** changing the taxonomy. Adding `payloadKeys` would change the req-016 suite oracle (AT-016.03). Splitting into two events would also change the closed 48-name set. The row is already enough to emit both outcomes as one type; it is **not** enough if the NGO must see distinct named copy unless params (or a new named-copy row) carry the distinction.

**4. There is no product emit call site.** Intended producer shape is the fixture SQL, which a real vet definer should copy:

```33:58:supabase/migrations/20260913121000_notification_fixture_producers.sql
create function public.fixture_commit_transition_and_emit(
  p_scope text,
  p_write jsonb,
  p_induce_fault boolean
)
returns uuid
...
  insert into public.notification_fixture_transitions ...
  if p_induce_fault then
    perform nextval('public.notification_fault_triggers');
    raise exception 'induced fault: ...' ...
  end if;
  return public.emit_notification(p_write);
```

TypeScript side of a fire (the only `emit` caller besides the AT-016.02 unregistered probe):

```109:114:tests/at/suites/req-016/_fixture.ts
async function fireThroughCore(core: Notifications, event: string, params: Record<string, unknown>): Promise<{ eventId: string }> {
  const outcome = await core.emit({ event, actor: null, params: producerPayload(event, params) });
  if (!outcome.accepted) throw new Error(`fixture cannot fire unregistered notification event ${JSON.stringify(event)}: ${outcome.reason}`);
  return { eventId: outcome.eventId };
}
```

Live world `fire` is the same `core.emit` (`_live.ts` 211–214). `writeRoute.decide` is pure and cannot call `directory.resolve` / `emit`. A vet write that stays on `writeRoute` must either build the jsonb write set in SQL, or pass a write set that `decide` built from standing (standing today has `orgSeatAccountId`, not email).

**5. `vetting.outcome` is not in AT-016.09’s guarded matrix.** Atomicity of ledger + notification is proven only for money/access/completion rows. AT-002.13 still wants emit on the normal path, never a side-channel email. Two round trips (vet RPC, then emit) can leave a vetted org with no event.

**6. Delivery worker is test-only.** No cron, no notifications edge function. `sut.drainDeliveries()` is the worker. Emit writes `pending`. AT-002.13 “emitted” is the event/delivery rows, not Mailpit, unless the req-002 suite drains.

**7. Sole-writer scan is a text oracle.** `SEND_PATH_PATTERNS` includes `\bdeliver\b\s*\(` and `\bProviderPort\b`. A vet module that imports `ProviderPort` or calls `deliver(` becomes a second sender unless its path is listed on `NOTIFICATION_COMPONENTS['notifications.emitter']`. Calling `emit_notification` from another definer is allowed; inserting into the three tables is not.

**8. Check constraint `emitted_by = 'notifications.emitter'`.** SQL that builds jsonb must set `emittedBy` to that exact string.

**9. In-app never hits SMTP.** Class `decision` still creates an email delivery. The NGO holder must have an email or `prepareWriteSet` throws.

**10. Frontend has no org/project public page.** `src/routes/` is `/` plus `__root__`. Index renders the heading `ai4good`. No “verified”, no “founder-vetted”. Authenticated dashboards (`organization-dashboard`, `project-workspace`) expose name/seats/projects only — also no trust label.

**11. Grants 10/30 are already in at-config.** Do not hard-code them in a test body (`discoveryDailyCreditsUnverified` = 10, `discoveryDailyCreditsVetted` = 30).

**12. Audit kinds are a Postgres enum.** A vet row on `audit_events` needs `ALTER TYPE … ADD VALUE` (or a new table). `append_audit_event` only requires non-empty `reason` and `actor_label`. AT-002.11’s extra fields (legal name, public link, contact name/title/attestation, evidence type, note) would live in `detail jsonb` or new columns/checks. AT-002.11b needs omission → no commit, no partial vetted state.

---

### Open Questions

- **How a product vet route should construct the write set.** `writeRoute` forbids I/O in `decide`. `_shared` forbids a live OutboxPort. I did not find a product pattern that both stays on `writeRoute` and uses TypeScript `prepareWriteSet` + `renderCopy`. The migration comments want “producer definer then `emit_notification` in the same transaction.” Whether SQL duplicates copy, or `decide` is given email via an extended `write_standing`, is a design choice, not an existing path.
- **Whether AT-002.13 requires distinct vetted vs unvetted copy.** The taxonomy does not. The PRD parenthetical “(vetted/unvetted)” is the two outcomes of one event. I could not find a payload predicate for this row.
- **Who drains in production.** Unclear. Integration greens drain from the test adapter. A committed emit without a worker stays `pending`.
- **Where the founder-vetted flag will live.** No column on `organizations` or `accounts`. Public projection has nowhere to put it today without changing `PublicProjectView` / `read_public_project` / AT-001.22’s closed key set.
- **Req-002 suite observation of notifications.** Req-002 does not exist yet. Req-016’s `sut.events` / `sut.deliveries` are bound only in the notifications adapter. A req-002 test must either share that sut, query as operator, or read Mailpit via `_mail-witness.ts`. I did not trace a cross-suite harness hook for that.

---

### Exact contracts a writer must imitate

#### Emit core

```374:381:supabase/functions/_shared/notifications.ts
    emit: async (request) => {
      const row = taxonomy.rows().find((candidate) => candidate.event === request.event);
      if (!row) return { accepted: false, reason: 'unregistered event type' };
      const holders = await directory.resolve(row.recipients);
      const write = prepareWriteSet(row, request, holders);
      const { eventId } = await outbox.append(write);
      return { accepted: true, eventId };
    },
```

#### Verification-outcome row (quote exactly)

Product, suite, and seed all name:

`{ event: 'vetting.outcome', recipients: ['ngo'], channels: null, tone: 'normal', class: 'decision' }`

Caller must supply: `event: 'vetting.outcome'`, `actor` (admin account id or `null`), `params` (any object; empty is legal). Directory must resolve `ngo` with a non-null email. Effective channels: **email + in-app** via `DEFAULT_BY_CLASS.decision`. Copy unless params add strings: subject `"Vetting outcome"`, body `"Vetting outcome notification."`

#### Sole-writer check (what fails a new writer)

```189:220:tests/at/suites/req-016/_source-scan.ts
export function strayNotificationWriters(): string[] {
  ...
      for (const match of file.text.matchAll(OUTBOX_INSERT)) {
        const inside = span !== null && match.index >= span.start && match.index < span.end;
        if (!inside) {
          problems.push(`${file.path}:${lineOf(file.text, match.index)} inserts into public.${match[1]} outside public.emit_notification`);
        }
      }
  ...
    for (const match of file.text.matchAll(CLIENT_OUTBOX_INSERT)) {
      problems.push(`${file.path}:${lineOf(file.text, match.index)} writes ${match[1]} through a client insert`);
    }
```

`OUTBOX_TABLES = ['notification_events', 'notification_deliveries', 'notification_ops_items']`. Assertion: `expect(strayNotificationWriters(), ...).toEqual([])` and `providerClientImporters().sort() === ['notifications.emitter']` (`_integration.ts` 62–66).

#### How req-016 asserts an emit

There is no `assertEmitted`. Tests `w.fire(event)` then read `sut.events({ type })` / `sut.deliveries({ type })`. Pair oracle:

```43:52:tests/at/suites/req-016/_oracles.ts
export function pairProblems(expectedKeys: readonly string[], got: Map<string, number>): string[] {
  const problems: string[] = [];
  for (const key of expectedKeys) {
    const n = got.get(key) ?? 0;
    if (n !== 1) problems.push(`${key}: ${n} deliveries, expected exactly 1`);
  }
  for (const [key, n] of got) {
    if (!expectedKeys.includes(key)) problems.push(`${key}: ${n} unexpected deliveries`);
  }
  return problems;
}
```

Used as `pairProblems(expectedPairs(actors, ['ngo'], ['email', 'inapp']), countPairs(deliveries))`. Sensitive-negative for this row (AT-016.04): deliveries exist, and none have `role === 'volunteer'` or the volunteer actor id.

Taxonomy capture (`d-taxonomy-evidence.test.ts` 91–107): for every row, `w.fire` → `drainDeliveries` → store events/deliveries/opsItems/provider traces keyed by `eventId`.

Unregistered probe (AT-016.02): `sut.emit({ type: 'at-016.02.sentinel.unregistered' })` → `accepted === false`, `eventId` undefined, delivery/event counts unchanged.

#### All 48 taxonomy events (verbatim)

`triage.approved` (ngo, email+inapp, decision, payloadKeys marketplaceVisibility); `triage.returned_to_scoped` (ngo, email+inapp, decision, reason); `triage.declined_terminal` (ngo, email+inapp, decision); **`vetting.outcome` (ngo, null→class default, decision)**; `discovery.fit_declined` (ngo, email+inapp, decision, declineCause/reshapingSuggestion/oversightSentence); `discovery.fit_decline_review` (platform_admin, email+inapp, decision, declineCause, opsItem); `discovery.decline_overturned` (ngo, email+inapp, decision, discoveryReopened); `candidacy.marked` (platform_admin, null, other); `match.created` (volunteer, email+inapp, decision, consentCta); `match.consented` (ngo, email+inapp, decision, fundToKickOff); `match.declined_or_expired` (platform_admin, null, other); `open_project.unmatched_aging` (platform_admin, null, other); `abandonment.reminder_14d` (volunteer+ngo, null, deadline); `abandonment.released` (ngo+ex_volunteer, null, deadline); `abandonment.rematch_available` (ngo, null, other); `funding.pre_deadline_reminder` (ngo, null, deadline); `funding.deadline_expired` (ngo+volunteer, null, deadline, guarded); `payment.succeeded` (ngo+volunteer, null, money, guarded); `payment.failed` (ngo, null, money, guarded); `fuel.threshold_20` (ngo, null, money, guarded); `fuel.threshold_5` (ngo+volunteer, null, money, guarded); `fuel.depleted` (ngo+volunteer+platform_admin, null, money, guarded); `leftover.released` (ngo, null, money, guarded); `chargeback.opened` (ngo+platform_admin, null, money, guarded, opsItem); `access.key_issued` (volunteer, email+inapp, access, guarded); `access.key_revoked` (volunteer, email+inapp, access, guarded, replacementOnDashboard); `gateway.watchdog_failed_closed` (platform_admin, email+inapp, other); `prd_gate.below_threshold_gap_report` (volunteer, email+inapp, decision); `prd_gate.passed` (ngo, email+inapp, decision); `backlog.live` (ngo, email+inapp, other); `reconciliation.large_drift` (platform_admin, email+inapp, money); `reconciliation.undecidable_drift` (platform_admin, email+inapp, money); `pm_item.status_changed` (ngo, inapp, lowtone); `pm_item.completed` (ngo, email+inapp, completion); `requirement.comment` (volunteer, inapp, other); `thread.comment` (volunteer, inapp, other); `blocker.raised` (ngo, email+inapp, blocker); `blocker.resolved` (ngo+volunteer, email+inapp, blocker); `blocker.aging_48h` (ngo, email+inapp, blocker); `blocker.aging_7d` (ngo+platform_admin, email+inapp, blocker); `pm_item.status_auto_reverted` (volunteer, inapp, lowtone, whatToDoInstead); `project.completed` (ngo+volunteer, null, completion, guarded); `provisioning.failed` (ngo+volunteer+platform_admin, null, other, opsItem); `lovable.setup_reminder` (ngo, null, other); `lovable.credits_low` (ngo, null, other); `lovable.credits_blocked` (ngo+platform_admin, null, other, escalation); `lovable.setup_pending_raised` (ngo, null, other); `lovable.setup_complete` (ngo+volunteer, null, other).

Null channels bind to `DEFAULT_BY_CLASS`: money/deadline/blocker/completion/decision/access → email+inapp; lowtone/other → inapp only.

#### Public project (no trust label)

```9:33:supabase/functions/_shared/public-project.ts
export type PublicProjectView = { projectId: string; projectName: string; organizationName: string };
...
export function publicProjectView(source: PublicProjectSource): PublicProjectView {
  return {
    projectId: source.project_id,
    projectName: source.project_name,
    organizationName: source.organization_name,
  };
}
```

`projectIsPublic` returns `true` for every row (publication requirement not landed). Frontend: `src/routes/index.tsx` only. No org/project public UI, no trust label anywhere under `src/`.