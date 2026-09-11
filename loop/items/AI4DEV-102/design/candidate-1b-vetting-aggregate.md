### 1. The data shape

The core objects are **Organisation**, **Organisation vetting**, **Discovery usage**, and **Audit event**.

`organizations` holds the editable profile. `org_vetting` holds the current trust decision and its complete evidence record. `org_discovery_usage` holds consumption, not grants or balances. The existing `audit_events` table holds immutable action history.

Trust is organised around one vetting aggregate. There is no separate trust boolean on `organizations`, `accounts`, or the allowance.

**One qualification to the assigned direction:** an organisation that has never been vetted has no `org_vetting` row. Otherwise, mandatory evidence columns would require invented evidence at signup. After the first vet, the row remains, including after unvet. Thus the relationship is zero-or-one before vetting and exactly one thereafter.

These statements describe the proposed implementation. They are not claims that migrations or tests have run.

**Vetting aggregate**

Add `20260914110000_audit_event_kind_org_vetting.sql`:

```sql
alter type public.audit_event_kind
  add value 'org_vetting_changed';
```

This migration contains no use of the new value. The actual audit column is `event_kind`, not `kind`.

Add the following table in `20260914120000_org_vetting.sql`:

```sql
create table public.org_vetting (
  org_id uuid primary key
    references public.organizations(id) on delete cascade,

  vetted boolean not null,

  vetted_by_account_id uuid not null
    references public.accounts(id) on delete restrict,
  vetted_at timestamptz not null,

  organization_name text not null,
  public_reference_url text not null,
  contact_name text not null,
  contact_title text not null,
  authority_attestation text not null,
  evidence_type text not null,
  note text not null,

  registration_received_at timestamptz,
  registration_document_count integer,
  registration_copies_deleted boolean,

  constraint org_vetting_name_populated
    check (organization_name ~ '[^[:space:]]'),

  constraint org_vetting_reference_url
    check (
      public_reference_url ~ '^https?://[^[:space:]]+$'
    ),

  constraint org_vetting_contact_name_populated
    check (contact_name ~ '[^[:space:]]'),

  constraint org_vetting_contact_title_populated
    check (contact_title ~ '[^[:space:]]'),

  constraint org_vetting_attestation_populated
    check (authority_attestation ~ '[^[:space:]]'),

  constraint org_vetting_evidence_type
    check (
      evidence_type in (
        'public_registry',
        'organization_website',
        'ein',
        'emailed_registration_documents'
      )
    ),

  constraint org_vetting_note_populated
    check (note ~ '[^[:space:]]'),

  constraint org_vetting_registration_metadata
    check (
      (
        evidence_type = 'emailed_registration_documents'
        and registration_received_at is not null
        and registration_document_count is not null
        and registration_document_count > 0
        and registration_copies_deleted is true
      )
      or
      (
        evidence_type <> 'emailed_registration_documents'
        and registration_received_at is null
        and registration_document_count is null
        and registration_copies_deleted is null
      )
    )
);

revoke all on table public.org_vetting
  from anon, authenticated, service_role;

alter table public.org_vetting enable row level security;
```

There are no additional indexes, policies, table grants, or defaults. The primary key provides the organisation lookup.

The evidence tokens above are the proposed API vocabulary. Store the accepted token unchanged. Do not convert `ein` or `organization_website` into a generic “documents reviewed” value.

The actor foreign key uses `RESTRICT`: account deactivation remains supported, while physical deletion cannot erase the identity required by the current vetting record. Historical audit identifiers retain their existing treatment.

Add this catalog entry:

```ts
org_vetting: 'unreachable-by-client-roles',
```

An unvet changes only `vetted`. The other columns continue to describe the latest completed vet. The unvet actor, time, and reason live in its audit event.

The database rejects missing mandatory fields even when an insertion bypasses the edge validator. This is the schema enforcement for AT-002.11b. Neither table constraints nor this design claim to constrain the database owner.

**Organisation profile**

Extend the existing table in `20260915120000_organization_profile.sql`:

```sql
alter table public.organizations
  add column mission text,
  add column country text,
  add column website text,
  add column logo text,

  add constraint organizations_profile_complete_or_absent
    check (
      (
        mission is null
        and country is null
        and website is null
        and logo is null
      )
      or
      (
        mission is not null
        and mission ~ '[^[:space:]]'
        and country is not null
        and country ~ '[^[:space:]]'
        and website is not null
        and website ~ '^https?://[^[:space:]]+$'
        and logo is not null
        and logo ~ '^https?://[^[:space:]]+$'
      )
    );
```

There are no new defaults, foreign keys, or indexes. Existing name constraints, RLS, grants, revokes, and policies remain.

`organizations` remains `tenant-isolated`. Authenticated callers retain SELECT only, through the existing membership and platform-admin policies. Neither service-role table writes nor client writes are added.

The nullable fields preserve organisations created by existing signup and name-only calls. They represent an incomplete profile. A completed profile supplies all five fields.

Design choices:

- `country` is populated text. No country taxonomy is introduced.
- `website` and `logo` are HTTP(S) URLs. The application does not fetch them during a write.
- Logo upload, image processing, dimensions, and storage buckets are outside this change.
- Mission remains text. There is no cause-category column.

**Discovery usage**

Add in `20260916120000_discovery_allowance.sql`:

```sql
create table public.org_discovery_usage (
  org_id uuid primary key
    references public.organizations(id) on delete cascade,

  spent_utc_day date not null,
  spent_credits integer not null default 0,

  constraint org_discovery_usage_nonnegative
    check (spent_credits >= 0)
);

revoke all on table public.org_discovery_usage
  from anon, authenticated, service_role;

alter table public.org_discovery_usage enable row level security;
```

There are no additional indexes, policies, or grants.

Add:

```ts
org_discovery_usage: 'unreachable-by-client-roles',
```

The consumption contract uses positive whole credits. This run does not define how the Discovery agent converts a turn into credits.

The table deliberately stores neither `remaining`, `daily_grant`, nor `ever_raised`. A cross-table cap check cannot be a reliable ordinary CHECK constraint. The debit function enforces that invariant under an organisation lock.

**Existing audit table**

There are no changes to `audit_events` columns, constraints, indexes, policies, or privileges. `append_audit_event` remains its sole writer. Its existing append-only triggers remain.

Every successful vet records a complete snapshot in `detail.current`. Every state-changing unvet records the retained snapshot with `vetted = false`.

### 2. How the allowance and the reset work

Add the product function:

```sql
create function public.discovery_daily_grant(p_vetted boolean)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_vetted then 30 else 10 end;
$$;

revoke execute on function public.discovery_daily_grant(boolean)
  from public, anon, authenticated, service_role;
```

This function is callable inside the owner-definer allowance function. It adds no client RPC capability.

The SQL literals mirror these existing pins:

```ts
AT_CONFIG.discoveryDailyCreditsUnverified.value
AT_CONFIG.discoveryDailyCreditsVetted.value
```

The product TypeScript module exports corresponding named constants. AT-002.04 and AT-002.07 compare both the shipped TypeScript values and live SQL results against those pins. A pin change must therefore update the product constants and add a replacement SQL migration. Product code does not import the test configuration.

**Stored and computed values**

For a request, compute:

```text
today = UTC date of the database clock, captured after taking the org lock

vetted = org_vetting.vetted, or false when no row exists
grant = discovery_daily_grant(vetted)

spentToday =
  usage.spent_credits, if usage.spent_utc_day = today
  0, otherwise

remaining = max(0, grant - spentToday)
```

Use:

```sql
(clock_timestamp() at time zone 'UTC')::date
```

Capture it once, after locking. Do not use the caller’s date, the application server’s local timezone, or a date parameter.

On the first read of a new UTC day, previous-day consumption contributes zero. The response therefore shows exactly the current tier grant. **A read performs no reset write.** A later debit replaces the stale usage row with today’s date and today’s consumption.

This is a logical reset, not a scheduled grant. There is nothing that can run twice and add another grant.

**Allowance RPC**

Expose:

```text
public.discovery_allowance(
  p_account_id uuid,
  p_organization_id uuid,
  p_action text,
  p_credits integer default null
) returns jsonb
```

Actions are exactly `read` and `debit`.

The function is `security definer`, has `set search_path = ''`, calls `public.assert_account_active`, and grants execute only to `service_role`.

For both actions:

1. Require an existing NGO account.
2. Lock the target organisation `FOR UPDATE`.
3. Require its current admin membership; hold that membership row `FOR SHARE`.
4. Capture the database UTC date.
5. Read current vetting and usage.
6. Compute the response from the formula above.

For `read`, require `p_credits IS NULL` and return without writing.

For `debit`:

1. Read `auth.users.email_confirmed_at` for `p_account_id`; hold the row through the transaction.
2. Reject an unconfirmed email before considering remaining credits.
3. Require positive integer `p_credits`.
4. Reject if `p_credits > remaining`.
5. Upsert `(org_id, today, spentToday + p_credits)`.
6. Return the updated allowance.

The response is:

```json
{
  "organization_id": "<uuid>",
  "utc_day": "YYYY-MM-DD",
  "vetted": false,
  "daily_grant": 10,
  "spent_today": 0,
  "remaining": 10
}
```

The edge renderer converts these keys to camel case.

All vet, unvet, and debit operations lock the same organisation row. Concurrent debits therefore cannot both spend the same remaining credit. A competing vet or unvet establishes a definite order with the debit.

The endpoint is the allowance contract, not a Discovery conversation endpoint. It creates no message, agent response, funded turn, or checkout.

**Mid-day vet**

Suppose an unverified organisation spends four credits:

```text
Before vet: grant 10, spent 4, remaining 6.
After vet:  grant 30, spent 4, remaining 26.
```

Vetting does not update usage. It changes the aggregate from which the grant is derived.

If the organisation is unvetted that day:

```text
grant 10, spent 4, remaining 6.
```

Re-vetting returns:

```text
grant 30, spent 4, remaining 26.
```

If it already spent more than the unverified grant, unvet produces zero remaining. It does not produce negative credits or erase spending.

Repeated vets cannot stack grants because there is no addition operation. Neither vet nor unvet changes `spent_credits` or `spent_utc_day`.

**Integration proof of the day boundary**

The test observes a **persisted-day boundary**, not a wall-clock transition.

For each tier and each starting balance—zero, partial, full:

1. Create an organisation through the product path.
2. Establish its tier through the vet action where required.
3. Read the database’s current UTC date.
4. As operator setup, store usage for the preceding UTC date.
5. Call the deployed allowance route.
6. Assert that its returned `utcDay` is later than the stored usage date and that remaining equals the tier grant.
7. Debit a positive amount through the deployed route.
8. Read twice more and assert that consumption remains deducted.

The operator setup changes persisted product data. It does not change any clock or add a product time override.

If UTC midnight occurs during the test, start the same-day assertions again using the newly returned day. Bound this retry to avoid hiding failures.

This proves stale-day reset and no repeated same-day grant. It does not claim that the test waited through midnight. The loop body separately advances the existing controlled clock across midnight and exercises the same product arithmetic.

### 3. The vetting action

The route is:

```text
POST /functions/v1/set-organization-vetting
```

Its entry point is exactly one:

```ts
Deno.serve(writeRoute({
  name: 'set-organization-vetting',
  target: organizationIdField,
  decide: decideOrganizationVetting,
  render: renderOrganizationVetting,
}));
```

Register:

```ts
'set-organization-vetting': {
  surface: { kind: 'edge', rpc: 'set_organization_vetting' },
  standing: {
    kind: 'account-required',
    admits: ['platform_admin'],
  },
},
```

Configure:

```toml
[functions.set-organization-vetting]
verify_jwt = true
```

**Request**

A vet request contains:

```json
{
  "organizationId": "<uuid>",
  "action": "vet",
  "organizationName": "Organisation legal or display name",
  "publicReferenceUrl": "https://example.org/public-reference",
  "contactName": "Contact name",
  "contactTitle": "Contact title",
  "authorityAttestation": "The contact states their authority to act.",
  "evidenceType": "organization_website",
  "note": "Reason for the founder's decision."
}
```

For emailed registration documents, also require:

```json
{
  "registrationReceivedAt": "<ISO timestamp>",
  "registrationDocumentCount": 1,
  "registrationCopiesDeleted": true
}
```

An unvet request contains only:

```json
{
  "organizationId": "<uuid>",
  "action": "unvet",
  "note": "Reason for revocation."
}
```

Reject unknown fields, including attachments, document bodies, storage keys, and download URLs. Do not silently discard supplied document content.

Reject evidence types outside the declared vocabulary. This includes passports, national identity cards, driving licences, and any other personal identity-document type.

Actor and timestamp are server facts. Neither is accepted from the request.

**Standing and decision**

The existing `writeRoute` sequence remains:

```text
authenticate → parse request → load write_standing
→ lifecycle/type gate → pure decision → one product RPC
```

There is no change to `write_standing`. In particular, it gains no recipient email address or evidence fields.

`decideOrganizationVetting` validates the request shape and target existence. It does not write state, read a clock, resolve a notification recipient, or send anything.

The SQL function repeats authorization because standing is a preliminary read, not a transaction lock.

**Definer contract**

```text
public.set_organization_vetting(
  p_account_id uuid,
  p_organization_id uuid,
  p_action text,
  p_organization_name text default null,
  p_public_reference_url text default null,
  p_contact_name text default null,
  p_contact_title text default null,
  p_authority_attestation text default null,
  p_evidence_type text default null,
  p_note text default null,
  p_registration_received_at timestamptz default null,
  p_registration_document_count integer default null,
  p_registration_copies_deleted boolean default null
) returns jsonb
```

It is `security definer`, uses `set search_path = ''`, and has:

```sql
revoke execute on function public.set_organization_vetting(
  uuid, uuid, text, text, text, text, text,
  text, text, text, timestamptz, integer, boolean
) from public, anon, authenticated, service_role;

grant execute on function public.set_organization_vetting(
  uuid, uuid, text, text, text, text, text,
  text, text, text, timestamptz, integer, boolean
) to service_role;
```

The function performs this sequence:

1. Call `public.assert_account_active(p_account_id)`.
2. Require an existing `platform_admin` account.
3. Require `p_action` to be `vet` or `unvet` and require a populated note.
4. Lock the organisation `FOR UPDATE`; reject a missing organisation.
5. Read its existing vetting row.
6. Resolve and lock its current NGO membership `FOR SHARE`.
7. Read the holder’s email from `auth.users`; refuse a missing or empty address.
8. Apply the vet or unvet.
9. Call `append_audit_event`.
10. Construct the notification write set.
11. Call `public.emit_notification`.
12. Return the committed action result.

For a vet, INSERT or UPDATE every required aggregate field. Use the authenticated actor and database `now()` for `vetted_by_account_id` and `vetted_at`. The table constraints reject a partial record.

Every accepted vet is an audited manual action, including another complete vet submitted while already vetted. It may replace the evidence snapshot. It never changes usage.

For an unvet, update `vetted` to false and retain the latest vet evidence. If no vetted state exists, return `changed = false` without an audit event or notification.

The successful response contains:

```json
{
  "organization_id": "<uuid>",
  "vetted": true,
  "changed": true,
  "notification_event_id": "<uuid>"
}
```

For vet, `changed` means a new manual record was committed, even if the previous flag was already true.

**Audit**

Call:

```text
append_audit_event(
  'org_vetting_changed',
  authenticated actor,
  null,
  target organisation,
  submitted note,
  {
    action,
    previous_vetted,
    current: complete persisted aggregate
  }
)
```

The existing function supplies the actor label and audit timestamp. The aggregate snapshot preserves the legal/display name and evidence even when the NGO later edits its profile.

For unvet, the audit actor and timestamp describe revocation. The snapshot’s `vetted_by_account_id` and `vetted_at` still describe the latest vet.

**Notification**

Keep the existing taxonomy row unchanged:

```ts
{
  event: 'vetting.outcome',
  recipients: ['ngo'],
  channels: null,
  tone: 'normal',
  class: 'decision',
}
```

Pass ordinary event parameters:

```json
{ "outcome": "vetted" }
```

or:

```json
{ "outcome": "unvetted" }
```

Do not add `payloadKeys`, another event name, or another taxonomy row. Ordinary parameters are supported by the existing emitter and generic copy renderer.

The SQL write set must match `prepareWriteSet`:

```text
event:
  event = "vetting.outcome"
  actor = authenticated admin UUID
  payload = { outcome }
  recipients = [
    {
      role: "ngo",
      recipientId: current seat holder UUID,
      address: current holder email,
      channels: ["email", "inapp"]
    }
  ]

deliveries:
  exactly one email row and one inapp row
  role = "ngo"
  recipientId/address = the resolved holder
  emittedBy = "notifications.emitter"
  payload = { outcome }
  subject = "Vetting outcome"
  body = "Vetting outcome notification. " + outcome

opsItem:
  null
```

The definer builds this small JSON structure in SQL. The edge never calls `emit_notification`. Its execute fence remains untouched.

AT-002.13 compares persisted event and delivery content with the output of the existing TypeScript `prepareWriteSet`. This catches divergence in defaults, recipients, or copy.

**Transaction boundary**

The aggregate write, audit append, and outbox emit occur in one database transaction. A constraint failure or emit failure rolls all three back.

Authentication and preliminary standing reads happen before that transaction. Notification delivery happens afterwards through the existing delivery subsystem.

This run proves emission into the normal outbox. It does not add a production delivery worker or equate a pending outbox row with delivered email.

**Evidence custody**

The application accepts metadata only. It has no document upload, download, storage object, or document-review state.

For emailed documents, the founder must delete the received copies before submitting `registrationCopiesDeleted: true`. SQL requires that attestation before committing.

The system records this attestation; it cannot independently inspect the founder’s mailbox. AT-002.16 proves non-retention and non-retrievability through application storage and surfaces. It does not prove deletion from an external mailbox or its backups.

### 4. The modules and the routes

**Files under `supabase/functions/`**

| File | Responsibility |
|---|---|
| `_shared/organization-profile.ts` — add | Defines the profile fields and validates the complete four-field extension to an already validated name. |
| `_shared/accounts.ts` — change | Extends `decideOrganizationCreation` to accept a complete profile while preserving existing name-only calls. |
| `_shared/memberships.ts` — change | Extends the organisation edit decision while retaining the target organisation’s admin check. |
| `_shared/org-vetting.ts` — add | Defines evidence tokens, request validation, RPC arguments, and result projection. |
| `_shared/discovery-allowance.ts` — add | Defines named grants, UTC-date arithmetic, debit decisions, and zero-credit remedy text. |
| `_shared/publishing-policy.ts` — add | Exposes the necessary trust condition `publishingAllowed(vetted)` without implementing publication or triage. |
| `_shared/funding-policy.ts` — add | States that trust does not restrict ordinary fuel funding and that paid continuation targets project fuel. |
| `_shared/write-routes.ts` — change | Registers the two new edges and the refusal kinds used by their SQL functions. |
| `_shared/tenant-reads.ts` — change | Adds the four profile fields to the existing dashboard projection, without adding tenant logic. |
| `_shared/edge.ts` — change | Extends `callerReads().organization()` to select the persisted profile fields as the caller. |
| `create-organization/index.ts` — change | Uses the extended creation decision through its existing single `writeRoute`. |
| `update-organization/index.ts` — change | Uses the extended edit decision and removes the obsolete name-only description. |
| `set-organization-vetting/index.ts` — add | Hosts the manual platform-admin action through one `writeRoute`. |
| `discovery-allowance/index.ts` — add | Hosts allowance reads and direct debits through one `writeRoute`. |

No changes to `emit_notification`, `notification-taxonomy.ts`, `notification-copy.ts`, or `public-project/index.ts` are required.

Add refusal kinds:

```text
invalid-profile
invalid-evidence
email-unverified
invalid-credit-amount
daily-allowance-exhausted
```

Use existing kinds for account, membership, target, and lifecycle refusals. SQL constraint failures may retain the existing generic `refused` mapping; their transaction must still roll back.

The second new inventory row is:

```ts
'discovery-allowance': {
  surface: { kind: 'edge', rpc: 'discovery_allowance' },
  standing: { kind: 'account-required', admits: ['ngo'] },
},
```

Configure:

```toml
[functions.discovery-allowance]
verify_jwt = true
```

Although its `read` action does not write, the endpoint shares the lifecycle, identity, and ownership boundary with debit.

The existing `discovery-message` row remains a stand-in. Do not deploy an allowance endpoint under that name and imply that a conversation route exists.

Do not register fake checkout or publish edges. Their modules are pure policies awaiting real consumers.

**Files under `supabase/migrations/`**

| File | Responsibility |
|---|---|
| `20260914110000_audit_event_kind_org_vetting.sql` | Adds the audit enum value in its own migration. |
| `20260914120000_org_vetting.sql` | Creates the aggregate and its single vet/unvet/audit/emit definer. |
| `20260915120000_organization_profile.sql` | Adds profile columns and replaces the creation and edit function signatures. |
| `20260916120000_discovery_allowance.sql` | Creates usage storage, the grant function, and the gated allowance function. |

Each function migration restates execute revokes and grants and ends with:

```sql
notify pgrst, 'reload schema';
```

Replace the profile RPC signatures with:

```text
create_organization(
  p_account_id uuid,
  p_name text,
  p_profile jsonb default null
)

update_organization(
  p_account_id uuid,
  p_organization_id uuid,
  p_name text,
  p_profile jsonb default null
)
```

Drop the old overloads before creating these functions. Preserve their return fields and membership audit attribution.

`p_profile = null` means the existing name-only operation. Otherwise require exactly `mission`, `country`, `website`, and `logo`, all populated strings. On update, null preserves the existing four fields; a supplied object replaces all four.

Both functions retain `assert_account_active`. The update repeats the NGO and current target-admin checks under transaction locks. Signup remains unchanged and creates an incomplete profile.

**Files under `src/`**

No changes in this backend run. The brief excludes the wiring leaf.

The existing `organization-dashboard` response is the profile projection exercised here. “Render” evidence means that real persisted values reach that projection. It does not claim a browser screen exists.

A later UI must call the edge functions. It must not query Supabase tables directly.

### 5. The suite

Add:

```text
tests/at/suites/req-002/
  _bind.ts
  _contract.ts
  _fixture.ts
  _live.ts
  _integration.ts
  _source-scan.ts
  a-profile.test.ts
  b-allowance.test.ts
  c-vetting.test.ts
  d-evidence.test.ts
  e-gates.test.ts
  f-public-claims.test.ts
```

The single call-site allocation is:

| Test file | Acceptance IDs |
|---|---|
| `a-profile.test.ts` | AT-002.01, AT-002.02 |
| `b-allowance.test.ts` | AT-002.04, .05, .06, .07, .08, .10, .26, .27, .31 |
| `c-vetting.test.ts` | AT-002.11, .11b, .12, .13, .14, .29, .30 |
| `d-evidence.test.ts` | AT-002.16, .17, .18 |
| `e-gates.test.ts` | AT-002.19, .20, .21, .22, .28 |
| `f-public-claims.test.ts` | AT-002.23 |

Each ID has exactly one literal `atTest` call. Parameterisation occurs inside that call.

Register:

```ts
'req-002': typeof import('../suites/req-002/_fixture.ts');
```

Both adapters export:

```ts
export const requirement = 'req-002' as const;
```

Bind:

```ts
bindSuite({
  requirement: 'req-002',
  sut: 'organizations',
});
```

Use `{ default: loopBody, integration: integrationBody }` where tier behaviour differs. Do not use an incomplete `{ loop, integration }` map.

**Reuse, without new harness machinery**

Extend the existing account adapters with the organisation operations. The new suite wraps those factories and exposes their SUT as `organizations`. It returns the existing `fixtures` and teardown objects.

This reuses existing signup, sessions, memberships, operator setup, and world namespaces. It avoids a second account simulator or another fixture-world class.

The extensions belong in:

```text
tests/at/suites/req-001/_contract.ts
tests/at/suites/req-001/_fixture.ts
tests/at/suites/req-001/_live.ts
```

Add the new routes to their exhaustive write-attempt dispatches and lifecycle conformance cases. Extend the audit-kind type with `org_vetting_changed`.

The new suite’s loop implementation stores aggregate and usage rows alongside the existing in-memory organisation state. It invokes shipped decisions and `prepareWriteSet`. It introduces no fake checkout, agent, publisher, mailbox, or generic notification producer.

The live implementation drives:

- Real Auth and the existing signup paths.
- Deployed profile, vetting, and allowance edges.
- Real SQL constraints and transaction effects.
- Operator reads of audit and notification rows.
- Existing caller-bound and public projections.

Operator setup may establish a prior-day usage row or an email-unconfirmed account. It must not perform the action being graded.

**Important assertions**

- **Profile:** create and replace all five fields; read them back through the caller-bound dashboard. Reject other NGO, volunteer, visitor, platform admin, and a non-admin member.
- **Mandatory evidence:** omit each client-supplied mandatory field separately. Test both first vet and re-vet. Assert unchanged aggregate, audit count, and event count.
- **Schema enforcement:** integration also attempts direct aggregate inserts with each mandatory column null inside rolled-back operator transactions. Require database constraint failures.
- **Authorization:** vet and unvet refusals leave both trust and notifications unchanged. Include deactivated platform admins.
- **Audit:** inspect persisted actor, time, organisation name, reference, contact, attestation, exact evidence token, and note.
- **Emit:** require one event, two recipient-channel deliveries, the current NGO holder, and no volunteer delivery. Compare content with `prepareWriteSet`.
- **Allowance:** test exact caps, partial spends, exhaustion, concurrent last-credit debits, vet/unvet/re-vet arithmetic, and stale-day reset.
- **Email floor:** use actual Auth confirmation state. A request field named `emailVerified` cannot override it.
- **Evidence:** inspect stored columns, audit detail, outbox payload, and projections. Reject content-bearing requests rather than dropping their extra fields.
- **Public claims:** inspect the existing public project response and root source. Preserve its closed three-field project view and introduce no public trust claim.

AT-002.23 covers the public surfaces currently shipped. It does not certify future listing screens.

For the free Discovery clauses, use the direct allowance contract explicitly permitted by the brief. AT-002.05 and .27 prove block and restoration of free-debit admission. AT-002.21 and .22 prove the trust-independent allowance decision and email floor. They do not prove agent output or funded billing.

Likewise, AT-002.12 proves that unvet changes the publishing trust condition, preserves funding permissibility, and appends the audit. The absent publishing and funding operations remain covered by their red IDs.

These are acceptance proofs at this requirement’s stated boundary, not end-to-end claims about absent consumers.

**Static checks and existing suites**

Add the two `TENANT_CATALOG` entries. Retain the tenant scan’s rules and existing service-role SELECT allowlist. Neither new table requires a viewer helper or service-role table grant.

`_source-scan.ts` checks the shipped evidence vocabulary, absence of document storage paths, the manual-only action surface, and the expected required aggregate columns. It reads real source; it does not add a harness sentinel.

Run the existing write-route, tenant, and notification sole-writer checks without weakening them.

**Exact final manifest**

`tests/at/expected/req-002.json`:

```json
{
  "requirement": "002",
  "tiers": {
    "loop": {
      "green": [
        "AT-002.01",
        "AT-002.02",
        "AT-002.04",
        "AT-002.05",
        "AT-002.06",
        "AT-002.07",
        "AT-002.08",
        "AT-002.11",
        "AT-002.11b",
        "AT-002.12",
        "AT-002.13",
        "AT-002.14",
        "AT-002.16",
        "AT-002.17",
        "AT-002.18",
        "AT-002.21",
        "AT-002.22",
        "AT-002.23",
        "AT-002.27",
        "AT-002.28",
        "AT-002.29",
        "AT-002.30"
      ],
      "red": {
        "AT-002.10": {
          "kind": "pending",
          "phase": "sut-missing"
        },
        "AT-002.19": {
          "kind": "pending",
          "phase": "sut-missing"
        },
        "AT-002.20": {
          "kind": "pending",
          "phase": "sut-missing"
        },
        "AT-002.26": {
          "kind": "pending",
          "phase": "sut-missing"
        },
        "AT-002.31": {
          "kind": "pending",
          "phase": "sut-missing"
        }
      }
    },
    "integration": {
      "green": [
        "AT-002.01",
        "AT-002.02",
        "AT-002.04",
        "AT-002.05",
        "AT-002.06",
        "AT-002.07",
        "AT-002.08",
        "AT-002.11",
        "AT-002.11b",
        "AT-002.12",
        "AT-002.13",
        "AT-002.14",
        "AT-002.16",
        "AT-002.17",
        "AT-002.18",
        "AT-002.21",
        "AT-002.22",
        "AT-002.23",
        "AT-002.27",
        "AT-002.28",
        "AT-002.29",
        "AT-002.30"
      ],
      "red": {
        "AT-002.10": {
          "kind": "pending",
          "phase": "sut-missing"
        },
        "AT-002.19": {
          "kind": "pending",
          "phase": "sut-missing"
        },
        "AT-002.20": {
          "kind": "pending",
          "phase": "sut-missing"
        },
        "AT-002.26": {
          "kind": "pending",
          "phase": "sut-missing"
        },
        "AT-002.31": {
          "kind": "pending",
          "phase": "sut-missing"
        }
      }
    }
  }
}
```

Use `AtPending(ctx.atId, 'sut-missing', specificReason)` in those bodies. Do not introduce new capability names.

A red body may first assert a shipped policy. It must still throw the declared pending result. It must not treat passing policy assertions as completion of the missing flow.

Verification consists of typecheck, bijection, harness selftests, and all three suites at both tiers with `--expect`. Integration must be run explicitly; current CI runs loop expectations only.

### 6. The red set

The proposed five-ID set remains.

| ID | Missing surface | Why it remains red |
|---|---|---|
| AT-002.10 | Project-fuel checkout | A destination policy cannot prove that the UI and API actually reach ordinary fuel checkout. |
| AT-002.31 | Project-fuel checkout | Trust-independent permission cannot prove that either tier successfully funds fuel. |
| AT-002.19 | Publish flow and scoped lifecycle | The trust predicate cannot prove API/UI refusal or indefinite residence at `scoped`. |
| AT-002.20 | Publish flow and triage transition | There is no publishing operation whose successful result can be observed as triage. |
| AT-002.26 | Checkout and funded-turn billing | No real path can fund fuel and bill the next Discovery turn to that fuel. |

Use the existing stand-in precedent for the pure funding and publishing decisions. Their acceptance IDs remain red until consumers exist.

Refuse that precedent as a substitute for real vetting, audit, emission, profile persistence, or allowance storage. Those surfaces are built here and exercised against the database.

The brief’s older “twenty-five” count and proposed partial public-sweep red do not determine this manifest. Its thirteen units allocate all twenty-seven P0 IDs. The current instruction allows testing existing public surfaces and requires per-ID red declarations.

### 7. The unit sequence

| Unit | Builds and proves | Earlier dependencies and ordering notes |
|---|---|---|
| **1. AI4DEV-111 (complete vet audit)** | Adds the enum migration, aggregate, manual definer, route, suite registration, and AT-002.11/.11b. | Uses existing accounts, audit, and notifications. Mandatory authorization and atomic emission ship immediately; they cannot safely wait for later units. |
| **2. AI4DEV-112 (manual admin authority)** | Completes the refusal matrix and source inspection for AT-002.29/.30. | Depends on unit 1. It proves authorization already present in the first implementation. |
| **3. AI4DEV-113 (unvet and outcome)** | Proves unvet audit, publishing trust closure, funding permissibility, shared emission, and one-action completion: AT-002.12/.13/.14. | Depends on unit 1. Introduces the minimal publishing and funding policy modules needed by these assertions. |
| **4. AI4DEV-114 (metadata-only evidence)** | Proves metadata constraints, content-field refusal, identity-document refusal, and exact evidence tokens: AT-002.16/.17/.18. | Depends on unit 1. Evidence constraints already belong in its aggregate; this unit completes the evidence tests. |
| **5. AI4DEV-105 (profile creation)** | Adds profile columns, extends creation, and projects persisted fields: AT-002.01. | Uses existing signup and tenant reads. Does not require allowance storage. |
| **6. AI4DEV-106 (profile editing)** | Extends editing and tests all five fields and all forbidden callers: AT-002.02. | Depends on unit 5. Preserves existing name-only calls. |
| **7. AI4DEV-107 (tier grant arithmetic)** | Adds usage, the allowance route, exact grants, debit serialization, and vet/re-vet arithmetic: AT-002.04/.07/.08. | Uses the aggregate from unit 1. The first complete implementation includes stale-day handling because later-day grants are part of AT-002.07. |
| **8. AI4DEV-109 (UTC daily reset)** | Adds the full tier-by-balance reset matrix and repeated-read/debit proof: AT-002.06. | Depends on unit 7. Replaces the brief’s impossible live-clock assumption with persisted prior-day setup. |
| **9. AI4DEV-116 (Discovery email floor)** | Proves allowance admission is independent of vetting and requires actual email confirmation: AT-002.21/.22. | Depends on unit 7 and the existing verification module. The SQL floor already ships with debit. |
| **10. AI4DEV-117 (pilot vetting default)** | Proves concierge completion through the audited vet, then reads the vetted grant; sweeps current public claims: AT-002.28/.23. | Depends on units 1 and 7. No signup auto-vet or special pilot setter is added. |
| **11. AI4DEV-108 (exhaustion and remedies)** | Proves zero-credit refusal and next-day free-debit restoration: AT-002.05/.27. Registers AT-002.26 as red. | Depends on units 7–9. The funded remedy awaits checkout and funded billing. |
| **12. AI4DEV-110 (ordinary fuel continuation)** | Completes the pure paid-destination contract and confirms no Discovery wallet structure. AT-002.10/.31 remain red. | Uses the funding policy introduced in unit 3. Builds no checkout or vendor substitute. |
| **13. AI4DEV-115 (publication trust gate)** | Completes the pure publishing decision matrix. AT-002.19/.20 remain red. | Uses the policy introduced in unit 3 and the aggregate. Builds no publisher or lifecycle substitute. |

The order remains unchanged. Some later units prove invariants that must ship earlier for safety or dependency completeness.

During construction, register all twenty-seven IDs immediately. Unfinished units use temporary `sut-missing` declarations. Move each completed ID to green with its implementation and evidence. The final manifest is the one above.

For units whose IDs intentionally remain red, completion means their shipped policies pass and the expected-red accounting matches. It does not mean their full acceptance criteria are green.

### 8. Rationale

**Rejected: trust booleans scattered across organisation, account, and allowance.** They permit disagreement and require reconciliation. One aggregate determines the grant and publishing trust condition.

**Rejected: one mandatory vetting row at signup.** Non-null evidence would force empty defaults or fictitious evidence. Absence is the honest representation of never vetted.

**Rejected: current trust reconstructed from audit history.** The repository already separates current state from audit history. Replaying JSON events would weaken schema enforcement and complicate every read.

**Rejected: mandatory evidence only in audit JSON.** `append_audit_event` validates a reason and actor label, not the full vetting contract. The aggregate supplies the required schema constraints.

**Rejected: stored remaining balances or a “raised once” flag.** Both create unnecessary mutable state. Current tier minus same-day spending directly implements first vet, unvet, and re-vet.

**Rejected: scheduled daily grants.** They introduce job timing and repeated-grant concerns. The integration harness cannot advance their clock.

**Rejected: granting the emitter to service role.** That breaks the existing privilege fence. The owner-definer transaction is sufficient.

**Rejected: emit after committing vetting.** Two transactions permit a vetted organisation without its notification.

**Rejected: two outcome event types or new required payload keys.** The existing taxonomy already covers both outcomes. Ordinary `outcome` parameters preserve its contract.

**Rejected: attachment storage followed by deletion.** The run does not need document content. Accepting only metadata avoids a new storage lifecycle and retrieval surface.

**Rejected: simulated checkout, funded turns, publishing, or triage.** Their successful simulations would not prove the absent product paths.

The deliberate duplication is the small SQL notification write-set construction. The existing pure decision boundary cannot run TypeScript inside the database transaction. Comparing real emitted rows with `prepareWriteSet` makes that duplication visible and testable.

**The weakest point is evidence custody.** SQL can require a deletion attestation and prevent an attachment storage path. It cannot prove that an external emailed copy was deleted, or prevent a dishonest administrator from pasting content into a required free-text note.

This design treats AT-002.16 as application retention evidence plus a manual custody obligation. If the reviewer requires mechanically verified deletion from the receiving mailbox, that ID must become red. Making it green under that interpretation requires a real mailbox custody surface, not another fixture or a stronger-sounding attestation.