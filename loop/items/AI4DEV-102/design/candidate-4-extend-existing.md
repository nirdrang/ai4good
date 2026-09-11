# Candidate 4 — extend what already exists

Direction: extend the objects the tree already has. Add a new object only where extending an
existing one would be wrong.

**Headline: this design adds zero new tables.** `TENANT_CATALOG` in
`tests/at/suites/req-001/_policy-scan.ts` does not change. No new RLS policy is written. No new
viewer function is written. The organisation profile, the trust tier and the daily allowance are
six columns on `public.organizations`. The vetting record is one row of `public.audit_events`
under one new `audit_event_kind` value. The notification is the existing emitter, called from the
existing producer-definer shape.

Two places where the direction costs something, both stated in full below and again in section 8:

1. `public.write_standing` grows one field, `org_seat_email`. The emit cannot be built without
   it. This touches REQ-001 machinery and breaks four files at compile time.
2. `supabase/functions/update-organization` grows from a rename into the profile writer. Its own
   header today says it is "not a general organisation-profile editor". This run is the product
   change that makes it one, and the header is rewritten with the reason.

---

## 1. The data shape

### The core domain objects

There are three, and only the first is new to the tree as a concept:

- **The organisation profile.** `public.organizations` IS the profile. It already holds `id`,
  `name` and `created_at`. It gains `mission`, `country`, `website_url` and `logo_url`.
- **The trust tier.** One closed enum with two members, held in one column of the organisation
  row, exactly as `public.accounts.lifecycle` holds the account's lifecycle. The tier is current
  state. It is not a boolean, because "vetted" and "unverified" are two named tiers in the PRD and
  a third tier is a plausible later ruling; an enum makes a third tier one migration and a boolean
  makes it a schema change plus every reader.
- **The daily allowance, stored as SPEND and never as BALANCE.** Two columns on the organisation
  row: the UTC day of the last spend, and the credits spent on that day. Everything the
  requirement asks for — the grant, the remaining credits, the hard reset, the mid-day vet
  arithmetic, the re-vet rule — is arithmetic over those two columns and the tier. Section 2 shows
  why this removes the reset as a moving part.

The vetting record is not a fourth object. It is an event, not a state, so it lives in the
append-only log the tree already has.

### `public.organizations` — the altered table

Migration `20260917120000_organization_profile_fields.sql` (unit 5) adds four columns:

```sql
alter table public.organizations
  add column mission     text,
  add column country     text,
  add column website_url text,
  add column logo_url    text;

alter table public.organizations
  add constraint organizations_profile_fields_populated check (
    (mission     is null or btrim(mission,     E' \t\r\n\f') <> '') and
    (country     is null or btrim(country,     E' \t\r\n\f') <> '') and
    (website_url is null or btrim(website_url, E' \t\r\n\f') <> '') and
    (logo_url    is null or btrim(logo_url,    E' \t\r\n\f') <> '')
  ),
  add constraint organizations_profile_links_shape check (
    (website_url is null or website_url ~ '^https?://[^\s]+$') and
    (logo_url    is null or logo_url    ~ '^https?://[^\s]+$')
  );
```

Every profile column is nullable. It has to be: `complete_signup` and `create_organization`
already create rows with a name and nothing else, and those rows must stay legal. `null` means
"not set" and a blank string is refused, so there is one representation of "not set" rather than
two. The link shape check follows the precedent of
`org_escalation_contacts_email_shape` in `20260908120000_…sql`, which is the tree's only other
"this text is an address a person will follow" column.

`country` carries no closed list. No ratified text names one, and inventing ISO 3166 here would
refuse inputs the PRD never constrained. This is a deliberate non-decision, recorded in section 8.

`logo_url` is a URL, not bytes. The tree has no object storage, this run adds none, and
AT-002.03 was retired with the words "the PRD defines no logo upload constraints". A logo the NGO
hosts is the whole of what the acceptance file asks for.

Migration `20260914120000_org_trust_tier_and_vetting_action.sql` (unit 1) adds the tier:

```sql
create type public.org_trust_tier as enum ('unverified', 'vetted');

alter table public.organizations
  add column trust_tier public.org_trust_tier not null default 'unverified';
```

`not null default 'unverified'` is the exact shape of `accounts.lifecycle`. Unverified is the
floor, and an organisation that nobody has vetted holds the floor without any writer having to
say so.

Migration `20260918120000_discovery_daily_allowance.sql` (unit 7) adds the allowance:

```sql
alter table public.organizations
  add column discovery_spent_on      date,
  add column discovery_credits_spent integer not null default 0;

alter table public.organizations
  add constraint organizations_discovery_spend_nonnegative check (discovery_credits_spent >= 0),
  add constraint organizations_discovery_spend_dated check (
    discovery_spent_on is not null or discovery_credits_spent = 0
  );
```

The second constraint says the pair means nothing apart: a spend count with no day is not a
fact about any day.

**Posture, grants, RLS: unchanged, and that is the point.** `public.organizations` is already
`tenant-isolated` in `TENANT_CATALOG`. It already has the baseline revoke from `anon`,
`authenticated` and `service_role`; it already has RLS enabled; it already grants exactly
`{select}` to `authenticated`; it already carries the two select policies
`organizations_select_org_member` and `organizations_select_platform_admin`. Adding columns
changes none of that. I read `scanTenantMigrations` to be sure: it models `create table`,
`drop table`, `alter table … enable/disable/force row level security`, policies, grants, revokes
and function shapes. An `alter table public.organizations add column …` statement falls through
every branch and raises nothing. The live half in `_integration.ts` pins privilege sets, force-RLS
and the viewer functions, not the column list.

The consequence a reviewer should check on purpose: the NGO's own seat holder can now read its
own trust tier and its own spend counters through the existing member policy, and the platform
admin can read every organisation's. Nobody else can read anything. That is the reach the
requirement wants.

### `public.audit_events` — the altered table

Migration `20260914110000_audit_event_kind_org_vetting.sql` (unit 1), **alone in its own file**
because PostgreSQL refuses to use a new enum value in the transaction that adds it — the reason
`20260912110000_audit_event_kind_escalation_contact.sql` exists:

```sql
alter type public.audit_event_kind add value 'org_vetting_recorded';
```

The name is `…_recorded`, not `…_changed`, and the choice carries meaning. The escalation-contact
kind is `org_escalation_contact_recorded` and its writer records the action every time, including
a re-capture that changes nothing. `account_lifecycle_changed` records a state transition and
writes nothing when the state does not move. The vetting record is the first kind: it captures an
admin's evidence for an action, and that evidence exists whether or not the tier moves. Section 3
returns to this.

Then, in `20260914120000_…sql`, the shape guard:

```sql
alter table public.audit_events
  add constraint audit_events_vetting_record_shape check (
    event_kind <> 'org_vetting_recorded'
    or (
      actor_account_id is not null
      and detail->>'outcome' in ('vetted', 'unverified')
      and (
        detail->>'outcome' <> 'vetted'
        or detail ?& array['legal_name', 'reference_link', 'contact_name', 'contact_title',
                           'authority_attestation', 'evidence_type', 'note']
      )
      and detail - array['outcome', 'legal_name', 'reference_link', 'contact_name', 'contact_title',
                         'authority_attestation', 'evidence_type', 'note',
                         'document_filename', 'document_received_at'] = '{}'::jsonb
    )
  );
```

Read it in three parts.

- **Who vetted is structural.** `actor_account_id is not null` for this kind only. The table's
  existing `actor_label` check already refuses a blank label, and `occurred_at` is
  `not null default now()`, so "who vetted and when" is enforced by the table.
- **Every mandated field or no row.** For an outcome of `vetted`, the seven mandated keys must all
  be present. For an outcome of `unverified` — an unvet — they are not required, because AT-002.11
  mandates them for the vet and forcing a founder to retype a legal name to revoke would be a
  product mistake.
- **The key set is CLOSED.** `detail - array[…] = '{}'::jsonb` says: after removing the ten keys
  this design knows about, nothing is left. There is nowhere in a vetting record to put document
  content, a document body, a base64 blob, or any field nobody designed. This is the schema half
  of AT-002.16, and it holds against every writer, not only against the route.

The constraint fires for rows of one kind, so no existing row and no existing writer is affected.
AT-001.33 (the append-only guard) is untouched: the two triggers and their scan see no change.

**Where this constraint's authority ends**, in the same voice as
`20260811120000_acknowledgment_signer_identity.sql`: it guards SHAPE, not CONTENT. A key present
with an empty string satisfies it. Content is guarded twice above it — in the shipped decision
module and in the definer, both in section 3 — and both sit on the only path a product caller has.
An operator with a database connection can still write a blank legal name. That is the accepted
residual, and it is the same residual the acknowledgment identity columns declare.

### The new enums

```sql
create type public.org_evidence_type as enum (
  'public_registry',
  'organization_website',
  'registration_number',
  'emailed_registration_document'
);
```

Four members, mirroring the PRD's own list — "public evidence is preferred (registry, website,
EIN)" plus the emailed document the evidence rule tolerates. `registration_number` covers an EIN
and its equivalents outside the United States.

**There is no member for a personal identity document, and that is the whole of AT-002.17.** The
refusal is not a blocklist of passport words that somebody has to keep current. An evidence type
this platform does not record is unrepresentable: the TypeScript parser answers `null` for it and
the decision module refuses with `invalid-evidence-type`; independently, the PostgREST argument
cast to the enum fails for it. Two closed vocabularies, no list of forbidden words.

### What is NOT added, and why

- **No `org_profiles` table.** A one-to-one table beside `organizations` would carry the same
  primary key, the same tenant posture, the same two policies and a second row to keep in step.
  `org_escalation_contacts` earned its own table because an escalation contact is a different
  person from the organisation, with its own name, address and phone. A mission statement is not a
  different thing from the organisation; it is the organisation described.
- **No `org_vetting_records` table.** Current state is the tier column; the record of the action
  is an event. `audit_events` is the tree's append-only event log, with its own append-only
  triggers, its own sole writer, and a static scan that refuses any other writer. A second audit
  table would have to duplicate `audit_events_are_append_only`, both triggers, and the
  `scanAuditAppendOnly` expectations, and the explorer report says so directly.
- **No `discovery_credit_ledger` table.** A per-day row per organisation would be a table whose
  only reader computes one number from the row for today. Two columns on the row that already
  exists answer the same question. See section 8 for what this costs.
- **No `discovery_daily_grants` lookup table.** Two constants in one function read better than a
  two-row table with a tenant posture.
- **No storage bucket, no attachment table, no `bytea` column anywhere.**

---

## 2. How the allowance and the reset work

### The mechanism

**Store what was spent. Derive what remains. The reset is not an event.**

```
grant(tier)              = 10 for unverified, 30 for vetted
spentToday(row, today)   = row.discovery_spent_on = today ? row.discovery_credits_spent : 0
remaining(row, today)    = greatest(0, grant(row.trust_tier) - spentToday(row, today))
```

`today` is `(now() at time zone 'utc')::date` in SQL, and `utcDay(clock.now())` in TypeScript.
**The day boundary lives in that one expression and nowhere else.** It is written
`(now() at time zone 'utc')::date` and never `current_date`, because `current_date` follows the
session time zone and would silently make the reset local rather than UTC. A source scan enforces
that spelling; see section 5.

Nothing stores a balance. Nothing schedules a reset. Nothing writes a row at midnight.

What each clause of the requirement becomes:

- **"Exactly 10 a day unverified, 30 vetted."** `grant(tier)`, enforced in the spend function
  before the update.
- **"Hard resets to the tier grant once per UTC day."** On a new UTC day, `spentToday` is 0 by
  the date comparison, so `remaining` is the full grant. The reset is the arithmetic, not an act.
- **"No rollover."** Yesterday's unspent credits appear in no term of the formula. They cannot
  carry over because they are not represented.
- **"A second reset does NOT occur within the same UTC day."** There is no reset to occur twice.
  Within one UTC day the only writer of the spend counter is the spend function, and it only
  increases the count. The property is structural, not enforced.
- **"Free consumption can reach 10 but never exceed it."** The spend function takes
  `select … for update` on the organisation row, so two concurrent turns serialise and the
  `spent + credits > grant` test cannot be raced.

### The worked example — a mid-day vet (AT-002.07)

An NGO signs up on 2026-03-01 and is unverified.

| step | row after the step | grant | spent today | remaining |
|---|---|---|---|---|
| start of 2026-03-01 | `spent_on = null, spent = 0, tier = unverified` | 10 | 0 | 10 |
| spends 4 credits | `spent_on = 2026-03-01, spent = 4` | 10 | 4 | 6 |
| the founder vets it, same day | `tier = vetted` (the spend columns are NOT touched) | 30 | 4 | **26** |

`k = 4`, and `30 − k = 26`. The vet writes one column. It does not add credits, reset a counter,
or read the allowance at all. The requirement's "remaining = 30 − k, not a fresh 30" is what the
formula already says once the grant changes.

On 2026-03-02 the row still holds `spent_on = 2026-03-01, spent = 4`. `spentToday` is 0 because
the dates differ, so remaining is 30. "Later days grant 30" needs no code.

### A re-vet never raises twice and never mints credits (AT-002.08)

Continue the example. On the same day, `k = 4` and the tier is vetted.

| step | row after the step | grant | spent today | remaining |
|---|---|---|---|---|
| the founder unvets | `tier = unverified` | 10 | 4 | 6 |
| the NGO spends 6 more | `spent = 10` | 10 | 10 | 0 |
| the founder re-vets | `tier = vetted` | 30 | 10 | **20** |

The re-vet gives `30 − 10 = 20`. It cannot "re-raise" because the cap is a function of the tier
and the tier has two values; setting it to `vetted` a second time computes the same 30. It cannot
mint credits because no writer of `discovery_credits_spent` exists on the vetting path. The
prevention is that the vet has no way to express the mistake, not a guard that catches it.

The `greatest(0, …)` clamp earns its place in the unvet row above the other way round: a vetted
organisation that has spent 25 and is then unvetted computes `10 − 25 = −15`, which is reported as
0 remaining. No credit is owed and no spend is undone.

### How the integration tier observes a day boundary, with no clock to move

`h.clock.advance` exists at the loop tier only, and no live adapter takes the harness clock.
The two tiers observe the boundary differently, and both observations are real:

- **Loop tier.** The fixture's `utcDay` reads `clock.now()`, which is the harness's controlled
  clock, and `utcDay` is the SHIPPED function. `h.clock.advance` of 24 hours moves the process
  across a real date boundary and the shipped arithmetic answers. The boundary is crossed.
- **Integration tier.** The day boundary is a STORED DATE compared with the server's UTC date at
  read time. The test does not move time; it constructs the Given "this organisation last spent
  yesterday", with one operator statement:

  ```sql
  update public.organizations
     set discovery_spent_on      = (now() at time zone 'utc')::date - 1,
         discovery_credits_spent = $2
   where id = $1;
  ```

  Then it reads the allowance and the answer is the full grant, whatever `$2` was — which is
  AT-002.06's "any starting balance (zero, partial, or full)". A second read in the same UTC day
  still answers the same number, which is the "no second reset" half.

That operator write is a Given provisioned directly in the database, in the same category as
`provisionPlatformAdmin`, `createOrganizationAsOperator` and `createProjectAsOperator` in
`tests/at/suites/req-001/_live.ts`. It is not a sentinel, a fault, a vendor stand-in, a fixture
world or a harness capability. It adds no machinery.

**Say plainly what the integration green does not prove:** that the machine's own clock rolling
past midnight produces the reset. No test that has to finish can prove that. What it proves is
that the stored day and the server's UTC day are compared, and that the comparison answers
correctly on both sides of a boundary. The one hole that leaves — a reader that used the session
time zone instead of UTC would pass this test on a UTC-configured stack — is closed by the source
scan in section 5, not by the test.

### The debit contract REQ-004 will consume

The Discovery route does not exist. This run ships the decision it must consult and the SQL
function it must call, and it ships no route. That is the established shape in this tree:
`WRITE_ROUTES['discovery-message']` is a `stand-in` row today, with the reason "REQ-002/004 owns
the Discovery route; this tree ships the decision it must consult", and
`discoveryMessageAllowed` has no deployed caller.

**Where I use that shape:** the allowance decisions and the spend function. Both are driven at the
loop tier through the existing `discovery-message` stand-in row, exactly as AT-001.10 drives the
verification gate, and at the integration tier through the real SQL function called as the
operator.

**Where I refuse it:** I ship no `publishAllowed` decision and no checkout decision. AT-002.19,
AT-002.20, AT-002.10, AT-002.31 and AT-002.26 stay red either way, so a module written for them
would be code that no acceptance id turns green — which the project rule against speculative code
forbids. A stand-in decision earns its place only when an id goes green over it.

`public.spend_discovery_credits` is granted to nobody. It is NOT granted to `service_role`,
deliberately: a service-role-callable write with no `WRITE_ROUTES` row would be a hole in the
write gate that the static scan cannot see, because that scan checks edge folders and RPC names,
not orphan functions. The requirement that owns the Discovery route adds the grant in the same
change that adds the row. Until then the only callers are the acceptance suite's operator
connection and, later, that route.

---

## 3. The vetting action

### The whole path

1. **The admin calls the route.** `POST /functions/v1/set-organization-trust-tier` with the
   caller's bearer token and a JSON body:

   ```json
   {
     "organizationId": "…",
     "trustTier": "vetted",
     "legalName": "Riverside Shelter Foundation",
     "referenceLink": "https://registry.example.gov/orgs/12345",
     "contactName": "Dana Okonkwo",
     "contactTitle": "Executive Director",
     "authorityAttestation": "I am authorised to represent this organisation",
     "evidenceType": "public_registry",
     "note": "Registry entry checked against the website footer on 2026-03-01",
     "documentFilename": null,
     "documentReceivedAt": null
   }
   ```

2. **`writeRoute` runs its fixed pipeline** (`supabase/functions/_shared/edge.ts:346`): OPTIONS,
   POST only, `resolveCaller` (401 when the session is dead), `readJsonBody`, the UUID shape check
   on `organizationId`, then one `write_standing` round trip, then `writePipeline`.

3. **The gate decides standing** (`writeGateDecision`). The route's row admits
   `['platform_admin']` only. A deactivated caller is refused `account-deactivated` 403 BEFORE the
   type is judged; a caller with no account is refused `no-account` 409; an NGO or a volunteer is
   refused `not-a-platform-admin` 403; an unauthenticated caller never reaches the gate at all and
   gets 401. **This is the whole of AT-002.29 and it is inherited, not written.** No tier changes
   and no event is emitted, because the refusal happens before the RPC call exists.

4. **The decision module judges the record.** `decideTrustTierChange` in
   `supabase/functions/_shared/vetting.ts`, pure, no I/O:
   - `trustTier` must parse to `unverified` or `vetted`, else `invalid-request` 400.
   - When the tier is `vetted`, every mandated field must be a non-blank trimmed string, else
     `invalid-vetting-record` 400 with a reason that NAMES the absent field.
   - `evidenceType` must parse to a member of `EVIDENCE_TYPES`, else `invalid-evidence-type` 400
     with a reason that says the platform records no personal identity documents.
   - `documentFilename` and `documentReceivedAt` must both be present when the evidence type is
     `emailed_registration_document`, and both absent otherwise, else `invalid-vetting-record` 400.
   - The organisation must exist (`standing.orgExists`), else `no-such-organisation` 409.
   - The organisation must have a seat holder with an address (`standing.orgSeatAccountId` and
     `standing.orgSeatEmail`), else `organisation-unreachable` 409.
   - Then it builds the notification write set (below) and returns the RPC arguments.

5. **One RPC call, one transaction.** `callDatabaseFunction('set_organization_trust_tier', args)`
   as the service role. Everything from here is inside one PL/pgSQL function, and therefore inside
   one transaction:

   ```
   assert_account_active(caller)                 -- the lifecycle floor, the write gate's own
   caller type is platform_admin                 -- the SQL backstop of step 3
   select trust_tier … for update                -- the organisation exists and is locked
   every mandated field non-blank                -- the SQL backstop of step 4
   update organizations set trust_tier = …       -- the state change
   append_audit_event('org_vetting_recorded', …) -- the record
   emit_notification(p_notification)             -- the notification
   return { organization_id, trust_tier, changed }
   ```

6. **The edge maps the answer.** 200 with `{ ok: true, organizationId, trustTier, changed }`, or
   409 with the `kind` read from the raised `DETAIL`, or 400/403 from the decision module.

### What runs in one transaction, and why a partial vet is impossible

**In one transaction: the tier update, the audit row, and the emit.** All three are statements of
one PL/pgSQL function body. PostgreSQL runs a function body inside the calling statement's
transaction, and PostgREST runs one statement per request. Any `raise exception` anywhere in the
body — including the field checks, including the audit table's own check constraint, including
`emit_notification` failing — rolls the whole body back. There is no ordering of statements that
leaves a vetted tier with no record, or a record with no tier, or either with no notification.

**Outside the transaction: nothing that matters.** The caller resolution and `write_standing` are
reads before the write. The delivery worker sends the email later, from the outbox rows the emit
committed; that is REQ-016's design and its `pending` state is the committed fact.

**So AT-002.11b is proved by construction, three times over:**

1. The decision module refuses before any RPC call is made. Nothing is attempted.
2. The definer refuses before any UPDATE. The transaction has written nothing to roll back.
3. Even a caller that reached `append_audit_event` with an incomplete detail is refused by
   `audit_events_vetting_record_shape`, and the raise rolls back the tier update that preceded it.

The test asserts all of it from outside: after each omission, the tier is unchanged, the audit
query returns no row of the new kind, and the notification query returns no event.

### Why two round trips are impossible, and why that is a good thing

`public.emit_notification` is `security definer` with `revoke execute … from public` and no grant
to anybody. The edge function holds the service role and the service role cannot call it. So
"vet, then emit" as two calls is not a design I rejected; it is a design the privilege fence
already refuses. The only shape available is a producer-definer that calls the emitter inside its
own transaction, which is what the emitter's own comment asks for and what
`fixture_commit_transition_and_emit` demonstrates.

### Telling a vet from an unvet, with the taxonomy closed

`vetting.outcome` is one row: `{ event: 'vetting.outcome', recipients: ['ngo'], channels: null,
tone: 'normal', class: 'decision' }`. It has no `payloadKeys`. Class `decision` resolves through
`DEFAULT_BY_CLASS` to email plus in-app.

**I add no event type and no payload key.** The outcome travels as a payload value:
`params = { outcome: 'vetted' }` or `params = { outcome: 'unverified' }`. `renderCopy` has no
named entry for this row, so the general template renders subject `"Vetting outcome"` and body
`"Vetting outcome notification. vetted"` — the template joins every non-blank string in the
payload. The payload is frozen onto the event row and onto every delivery row, so a reader of the
outbox can tell the two outcomes apart by data, and the recipient can tell them apart by the word
in the body.

Adding `payloadKeys: ['outcome']` to the taxonomy row would change AT-016.03's oracle, which
compares the product table with `tests/at/suites/req-016/taxonomy.ts` in both directions. Adding a
second event name would change the closed 48-name set and its database seed. Adding a `NAMED` copy
entry would change the copy evidence AT-016.04 captures. **This design changes none of the six
files the notification explorer lists as having to stay equal.** Better copy for this row is named
in "Not done here": it belongs to a change that moves the taxonomy oracle deliberately.

### Building the write set — the one place the direction costs something

`emit_notification` takes a complete write set: the event, the resolved recipients, and one
delivery row per recipient and channel with a subject, a body and an address.
`prepareWriteSet` is the only constructor of one, it is pure, and it throws when an email-channel
delivery has no address. The channels and the copy come from the taxonomy and from `renderCopy`,
both TypeScript, and neither exists in SQL — the database seeds event NAMES only, with no class
and no channels.

Therefore the write set must be built in TypeScript, and TypeScript must know the NGO recipient's
account id and email address. `write_standing` already carries `org_seat_account_id`. It does not
carry the address. So it grows one field:

```sql
create or replace function public.write_standing(p_account_id uuid, p_org_id uuid, p_subject_account_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'account', ( … unchanged … ),
    'org_exists', ( … unchanged … ),
    'org_role', ( … unchanged … ),
    'org_seat_account_id', ( … unchanged … ),
    -- The address the organisation's single seat holder is reached at. The notification taxonomy
    -- delivers `vetting.outcome` by email, `prepareWriteSet` is the only constructor of a write
    -- set, and it refuses an email delivery with no address. So the address has to reach a pure
    -- decision, and this is the one read every write route already makes.
    'org_seat_email', (
      select u.email
        from public.org_memberships m
        join auth.users u on u.id = m.account_id
       where m.org_id = p_org_id
    ),
    'subject', ( … unchanged … )
  );
$$;
revoke execute on function public.write_standing(uuid, uuid, uuid) from public;
grant execute on function public.write_standing(uuid, uuid, uuid) to service_role;
```

`create or replace` keeps the signature, so the grants survive; they are restated anyway, because
this tree has been bitten by a recreate dropping a grant. The function stays `stable`, so
`scanWriteGateSql` still skips it for `definer-no-write-gate`.

`parseWriteStanding` gains `orgSeatEmail: string | null`, parsed fail-closed in the file's own
style: a value that is neither a string nor null answers `unreadable`, never an account with a
guessed field.

**The blast radius, named:** `AccountStanding` gains a required field, so every literal of that
type is a compile error until it is updated. There are four, and the compiler finds all four:
`tests/at/harness/shipped-write-gate.selftest.ts`, `tests/at/harness/shipped-lifecycle.selftest.ts`,
`tests/at/harness/shipped-admin-operations.selftest.ts` and
`tests/at/suites/req-001/_fixture.ts:678` (`renderWriteStanding`). Every other write route's
`decide` now receives an address it does not read; no `render` returns it; nothing sends it to a
client.

The alternatives are in section 8. The short version: the other two ways both put a lie or a
duplicate in the tree.

### The audit row

One row, written by `append_audit_event`, which stays the only writer of `audit_events`:

```
event_kind         org_vetting_recorded
occurred_at        now()                      -- "when"
actor_account_id   the platform admin's id    -- "who", non-null by the check constraint
actor_label        'platform_admin:<id>'      -- built by append_audit_event
subject_account_id null
subject_org_id     the organisation
reason             'organisation vetted' | 'organisation unvetted'
detail             { outcome, legal_name, reference_link, contact_name, contact_title,
                     authority_attestation, evidence_type, note,
                     document_filename?, document_received_at? }
```

`reason` is a constant the definer supplies, exactly as `set_escalation_contact` supplies
`'escalation contact recorded'`. The admin's free text is `note`, inside the record, where the
mandated field list puts it. The detail is built with `jsonb_strip_nulls`, so an unvet's detail is
`{ "outcome": "unverified" }` and a vet's carries eight or ten keys and no nulls.

### Idempotency: always record, never re-raise

`change_account_lifecycle` returns false and writes nothing when the lifecycle already holds the
requested value. **This design deliberately does the opposite: every accepted vet writes its audit
row and emits, even when the tier already held that value, and only the UPDATE is idempotent.**

The reason is the difference between the two records. A lifecycle audit row's detail is
`{from, to}` — a state transition, with nothing to say when nothing moved. A vetting record's
detail is the founder's evidence for an action taken on a date, and that evidence is a fact about
the action whether or not the tier moved. `org_escalation_contact_recorded` is the precedent that
fits: it records every capture, including a second capture of the same contact.

The return value carries `changed`, so a caller can still tell a real transition from a
re-affirmation. AT-002.08's "re-vetting never re-raises" is unaffected, because the raise is
arithmetic over the tier and not an act, as section 2 shows.

---

## 4. The modules and the routes

### `supabase/migrations/`

| file | what it owns |
|---|---|
| `20260914110000_audit_event_kind_org_vetting.sql` | Adds `'org_vetting_recorded'` to `audit_event_kind`. Alone in its file, because PostgreSQL refuses the new value in the transaction that adds it. |
| `20260914120000_org_trust_tier_and_vetting_action.sql` | `org_trust_tier` and `org_evidence_type` enums, `organizations.trust_tier`, the audit shape constraint, and `set_organization_trust_tier` without its notification argument. |
| `20260916120000_vetting_outcome_notification.sql` | Replaces `write_standing` with the `org_seat_email` field; drops and recreates `set_organization_trust_tier` with `p_notification jsonb` and the `emit_notification` call. |
| `20260917120000_organization_profile_fields.sql` | The four profile columns and their two constraints; drops and recreates `update_organization` as the profile writer. |
| `20260918120000_discovery_daily_allowance.sql` | The two spend columns and their constraints; `discovery_daily_grant`, `discovery_allowance`, `assert_email_confirmed`, `spend_discovery_credits`. |

Five migrations, no new table, one new value on an existing enum, two new enums, six new columns.

The three functions the allowance needs, in full, because their exact text is load-bearing:

```sql
create function public.discovery_daily_grant(p_tier public.org_trust_tier)
returns integer
language sql
immutable
as $$
  -- The two pinned grants of REQ-002, in one place. `tests/at/suites/req-002/_source-scan.ts`
  -- compares these literals with AT_CONFIG.discoveryDailyCreditsUnverified and …Vetted.
  select case p_tier when 'vetted' then 30 else 10 end;
$$;
revoke execute on function public.discovery_daily_grant(public.org_trust_tier) from public;

create function public.assert_email_confirmed(p_account_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_confirmed timestamptz;
begin
  select email_confirmed_at into v_confirmed from auth.users where id = p_account_id;
  if v_confirmed is null then
    raise exception 'a Discovery message needs a verified email address (REQ-002, AT-002.22)'
      using errcode = '42501', detail = 'email-unverified';
  end if;
end;
$$;
revoke execute on function public.assert_email_confirmed(uuid) from public;

create function public.discovery_allowance(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  -- THE UTC DAY BOUNDARY LIVES HERE. `current_date` follows the session time zone and would make
  -- the reset local; `(now() at time zone 'utc')::date` is the same day everywhere.
  select jsonb_build_object(
    'organization_id', o.id,
    'trust_tier',      o.trust_tier,
    'day',             (now() at time zone 'utc')::date,
    'grant',           public.discovery_daily_grant(o.trust_tier),
    'spent',           case when o.discovery_spent_on = (now() at time zone 'utc')::date
                            then o.discovery_credits_spent else 0 end,
    'remaining',       greatest(0, public.discovery_daily_grant(o.trust_tier)
                         - case when o.discovery_spent_on = (now() at time zone 'utc')::date
                                then o.discovery_credits_spent else 0 end)
  )
  from public.organizations o
 where o.id = p_organization_id;
$$;
revoke execute on function public.discovery_allowance(uuid) from public;
```

```sql
create function public.spend_discovery_credits(p_account_id uuid, p_organization_id uuid, p_credits integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_tier  public.org_trust_tier;
  v_role  public.org_role;
  v_spent integer;
  v_grant integer;
begin
  perform public.assert_account_active(p_account_id);
  perform public.assert_email_confirmed(p_account_id);

  if p_credits is null or p_credits < 1 then
    raise exception 'spend_discovery_credits refuses a turn that spends % credits', p_credits
      using errcode = '22023', detail = 'invalid-request';
  end if;

  select o.trust_tier,
         case when o.discovery_spent_on = v_today then o.discovery_credits_spent else 0 end
    into v_tier, v_spent
    from public.organizations o
   where o.id = p_organization_id
     for update;
  if v_tier is null then
    raise exception 'spend_discovery_credits refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;

  select role into v_role from public.org_memberships
   where org_id = p_organization_id and account_id = p_account_id;
  if v_role is null then
    raise exception 'spend_discovery_credits refuses %: the caller holds no membership in organisation %',
      p_account_id, p_organization_id
      using errcode = '42501', detail = 'not-a-member';
  end if;

  v_grant := public.discovery_daily_grant(v_tier);
  if v_spent + p_credits > v_grant then
    raise exception 'the daily Discovery allowance of % credits is spent for this UTC day', v_grant
      using errcode = '42501', detail = 'discovery-allowance-exhausted';
  end if;

  update public.organizations
     set discovery_spent_on = v_today, discovery_credits_spent = v_spent + p_credits
   where id = p_organization_id;

  return jsonb_build_object('day', v_today, 'grant', v_grant,
                            'spent', v_spent + p_credits, 'remaining', v_grant - v_spent - p_credits);
end;
$$;
revoke execute on function public.spend_discovery_credits(uuid, uuid, integer) from public;
-- NOT granted to service_role. The Discovery route does not exist, and a service-role-callable
-- write with no WRITE_ROUTES row is a hole the write-route scan cannot see. The requirement that
-- lands that route adds the grant in the same change that adds the row.
```

`update_organization`, dropped and recreated as the profile writer, keeps every refusal it has and
adds patch semantics:

```sql
drop function public.update_organization(uuid, uuid, text);

create function public.update_organization(
  p_account_id      uuid,
  p_organization_id uuid,
  p_name            text default null,
  p_mission         text default null,
  p_country         text default null,
  p_website_url     text default null,
  p_logo_url        text default null
) returns jsonb …
  -- unchanged: assert_account_active, organisation exists, membership exists, role is admin
  -- a present but blank name is still 'invalid-name'
  -- a request that names no field at all is 'invalid-request'
  update public.organizations
     set name        = coalesce(nullif(btrim(p_name, E' \t\r\n\f'), ''), name),
         mission     = coalesce(p_mission,     mission),
         country     = coalesce(p_country,     country),
         website_url = coalesce(p_website_url, website_url),
         logo_url    = coalesce(p_logo_url,    logo_url)
   where id = p_organization_id;
```

**Patch semantics, not replace.** An omitted field is unchanged. This is forced rather than
chosen: AT-001.16 and AT-001.36 call this route with a name and nothing else, and replace
semantics would make a rename erase the profile. The cost is that no field can be cleared once
set. No acceptance id asks to clear one, so clearing is in "Not done here" rather than in the
diff. The seven-argument form with defaults is called by name through PostgREST, so REQ-001's
two-key call still resolves — the same tolerance `complete_signup` relies on.

### `supabase/functions/`

| file | new or changed | what it owns |
|---|---|---|
| `_shared/vetting.ts` | new | The trust-tier and evidence-type vocabularies, the vetting-record validation, `decideTrustTierChange`, and the construction of the `vetting.outcome` write set. |
| `_shared/discovery-allowance.ts` | new | `utcDay`, `DISCOVERY_DAILY_GRANTS`, `dailyGrant`, `remainingCredits`, and `discoveryTurnAllowed` — the decision REQ-004's route must consult. |
| `_shared/write-routes.ts` | changed | One new `WRITE_ROUTES` row; `orgSeatEmail` on `WriteStanding` and in `parseWriteStanding`; four new members of `WRITE_REFUSAL_KINDS`. |
| `_shared/memberships.ts` | changed | `decideOrganizationRename` becomes `decideOrganizationEdit` and judges five fields instead of one. |
| `_shared/tenant-reads.ts` | changed | `TenantReads.organization` and `OrganizationDashboard` carry the four profile fields, so the profile renders. |
| `_shared/edge.ts` | changed | One line: the `callerReads` select list for `organizations` gains the four profile columns. |
| `set-organization-trust-tier/index.ts` | new | One `Deno.serve(writeRoute(…))`, target `organizationIdField`, decide `decideTrustTierChange`, render `{ organizationId, trustTier, changed }`. |
| `update-organization/index.ts` | changed | Imports `decideOrganizationEdit`; its header stops saying "one field, one write" and says what it is now. |
| `supabase/config.toml` | changed | `[functions.set-organization-trust-tier]` with `verify_jwt = true`. |

`src/` is **not touched**. There is no screen in this run; the wiring leaf is not in it. That is
also why AT-002.23 is provable: no surface under `src/` can carry a trust label when no surface
under `src/` reads the tier.

Two warnings for the writer, both learned from
`tests/at/suites/req-016/_source-scan.ts`:

- `_shared/vetting.ts` must not contain the token `ProviderPort` or the text `deliver(`, in code
  OR in prose. `providerClientImporters()` is a text scan over `supabase/functions`,
  `supabase/migrations` and `src`, and it reports any file that matches under
  `undeclared:<path>`, which fails AT-016.01. Importing `prepareWriteSet` matches nothing.
- No product file may contain `insert into public.notification_events|deliveries|ops_items`. The
  definer calls `emit_notification`; it never inserts.

And one from `tests/at/suites/req-001/_write-route-scan.ts`: no `_shared` module except `edge.ts`
may contain `/rest/v1/`, `createClient`, `.rpc(`, `SUPABASE_SERVICE_ROLE_KEY` or
`SUPABASE_SECRET_KEY`, and the route's `index.ts` may not contain `callDatabaseFunction`.

### The new `WRITE_ROUTES` row and its standing

```ts
  'set-organization-trust-tier': {
    surface: { kind: 'edge', rpc: 'set_organization_trust_tier' },
    standing: { kind: 'account-required', admits: ['platform_admin'] },
  },
```

One route for vet and unvet, with the target tier in the body — the shape of
`set-account-lifecycle`, which is one route for activate and deactivate with the lifecycle in the
body. Two routes would duplicate the standing, the audit call and the emit for a one-word
difference, and AT-002.14's "single audited admin action" reads better with one.

`discovery-message` keeps its stand-in row unchanged. This run adds no second Discovery name.

New members of `WRITE_REFUSAL_KINDS`:

| kind | status | raised by | id |
|---|---|---|---|
| `invalid-vetting-record` | 400 | the decision module, then the definer | AT-002.11b |
| `invalid-evidence-type` | 400 | the decision module, then the enum cast | AT-002.17 |
| `organisation-unreachable` | 409 | the decision module | fail-closed for the emit |
| `discovery-allowance-exhausted` | 403 | `spend_discovery_credits` | AT-002.05 |

---

## 5. The suite

### Layout of `tests/at/suites/req-002/`

| file | what it holds |
|---|---|
| `_bind.ts` | `bindSuite({ requirement: 'req-002', sut: 'orgProfile', sutMissingDetail: … })`, and the bound `AtContext` / `OpenWorld` aliases. |
| `_contract.ts` | The `OrgProfileSut` type and the row shapes it reads back. Judgement types are imported from the shipped modules, never restated. |
| `_fixture.ts` | The loop adapter: in-memory storage, the shipped decision modules, the shipped `utcDay` over `h.clock`, and a labelled mirror of `emit_notification`. Exports `requirement = 'req-002' as const`. |
| `_live.ts` | The integration adapter: `functionPost` for the two edge routes, `callerReads` through the dashboard route, and one operator SQL connection for Givens and read-backs. |
| `_integration.ts` | One exported body per id whose integration arm differs from the loop arm, in the style of `tests/at/suites/req-001/_integration.ts`. |
| `_source-scan.ts` | Four text oracles, all in the shape of `req-016/_source-scan.ts`. |
| `_pending.ts` | The declared-red bodies and the leaf labels, in the shape of `req-001/_pending.ts`. |
| `a-profile.test.ts` | AT-002.01, AT-002.02 |
| `b-allowance.test.ts` | AT-002.04, AT-002.05, AT-002.06, AT-002.07, AT-002.08, AT-002.10, AT-002.26, AT-002.27, AT-002.31 |
| `c-vetting.test.ts` | AT-002.11, AT-002.11b, AT-002.12, AT-002.13, AT-002.14, AT-002.29, AT-002.30 |
| `d-evidence.test.ts` | AT-002.16, AT-002.17, AT-002.18 |
| `e-gates.test.ts` | AT-002.19, AT-002.20, AT-002.21, AT-002.22, AT-002.28 |
| `f-public-claims.test.ts` | AT-002.23 |

The file split follows the acceptance file's own sections A to F, so a reader who has the
criteria open finds the body by section.

Registration: one line in `tests/at/harness/suite-adapters.ts`:

```ts
  'req-002': typeof import('../suites/req-002/_fixture.ts');
```

and two lines in `tests/at/harness/config.ts`:

```ts
  'req-002.discovery.daily_credits_unverified': 'discoveryDailyCreditsUnverified',
  'req-002.discovery.daily_credits_vetted': 'discoveryDailyCreditsVetted',
```

`AT_CONFIG` itself gains nothing. Both grants are already pinned there.

### The four source oracles

Each returns a list the assertion expects to be empty, and each throws rather than reporting an
absence it could not measure — the discipline `req-016/_source-scan.ts` states.

- `discoveryGrantProblems()` — parses `create function public.discovery_daily_grant` out of the
  migrations, reads its two integer literals, and reports a disagreement with
  `AT_CONFIG.discoveryDailyCreditsUnverified` and `…Vetted`. **This is how the migration literal
  stays in step with the pin, in CI, at the loop tier.** Without it the SQL numbers would be
  checked only at the integration tier, which CI does not run.
- `utcDayProblems()` — reports any use of `current_date`, `now()::date` or `localtimestamp` inside
  the allowance functions. Only `(now() at time zone 'utc')::date` is allowed. This closes the one
  hole the seeded day boundary leaves.
- `strayTrustTierWriters()` — reports any `update public.organizations set … trust_tier` outside
  the body of `set_organization_trust_tier`. The sole-writer idea of `strayNotificationWriters`,
  applied to a column. It is most of AT-002.30.
- `documentContentSinks()` — reports any `bytea` column, any `storage.` reference, and any
  migration or module that names a document body or content field. It is most of AT-002.16.

The loop fixture's grant constants are checked against the pin in the same bodies, through
`h.config.get('req-002.discovery.daily_credits_vetted')`. So the three statements of "30" — the
at-config pin, `DISCOVERY_DAILY_GRANTS` in TypeScript, and the migration literal — are compared
pairwise, and no test body writes the number.

### What the loop fixture stands on

- The shipped decision modules, imported and driven, never copied: `decideTrustTierChange`,
  `decideOrganizationEdit`, `discoveryTurnAllowed`, `discoveryMessageAllowed`,
  `emailVerifiedFromUser`, `callerFromAuthAnswer`, `writeGateDecision`, `writePipeline`,
  `prepareWriteSet`, `renderCopy`, `utcDay`, `dailyGrant`, `remainingCredits`.
- In-memory storage for organisations, memberships, accounts, audit rows and the outbox.
- `h.clock` for the UTC day and for the audit row's instant.
- One labelled mirror of `public.emit_notification` that turns a write set into event and delivery
  rows with the same idempotency key format and the same `emittedBy`. It is labelled a mirror in
  its own comment and the live adapter is named as its oracle, exactly as `appendAudit` is in
  `req-001/_fixture.ts`.
- The spend runs through `writePipeline` with a spec named `'discovery-message'`, so the loop tier
  drives the existing stand-in row of the write gate rather than inventing a surface.

The fixture builds no ProviderPort and drains nothing. AT-002.13 asks that the notification is
emitted through the normal path; the emitted fact is the event and delivery rows.

### What the live adapter drives

- `functionPost(stack, 'set-organization-trust-tier', body, token)` — the real route, over HTTP,
  with a real bearer token. Every vetting id at the integration tier goes through it.
- `functionPost(stack, 'update-organization', body, token)` — the real profile writer.
- `functionPost(stack, 'organization-dashboard', body, token)` — the render for AT-002.01.
- `functionPost(stack, 'public-project', body, null)` — the public surface for AT-002.23.
- One operator SQL connection, as `req-001/_live.ts` holds, for: provisioning the platform admin,
  reading `organizations.trust_tier`, reading `audit_events`, reading `notification_events` and
  `notification_deliveries`, calling `public.spend_discovery_credits` and
  `public.discovery_allowance`, and seeding yesterday's spend.

Email confirmation for a Given uses the same route `req-001/_live.ts` uses: register through Auth,
read the emailed link from the mail catcher, use it. An email-unverified NGO for AT-002.22 is the
state immediately after registration, because `enable_confirmations = true`.

### `tests/at/expected/req-002.json`

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
        "AT-002.10": { "kind": "capability-pending", "capabilities": ["checkout.project-fuel"] },
        "AT-002.19": { "kind": "capability-pending", "capabilities": ["publishing.publish-action"] },
        "AT-002.20": { "kind": "capability-pending", "capabilities": ["publishing.publish-action", "triage.queue"] },
        "AT-002.26": { "kind": "capability-pending", "capabilities": ["checkout.project-fuel", "discovery.funded-turn-billing"] },
        "AT-002.31": { "kind": "capability-pending", "capabilities": ["checkout.project-fuel"] }
      }
    },
    "integration": {
      "green": [
        "AT-002.01",
        "AT-002.02",
        "AT-002.04",
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
        "AT-002.05": { "kind": "capability-pending", "capabilities": ["discovery.message-route"] },
        "AT-002.10": { "kind": "capability-pending", "capabilities": ["checkout.project-fuel"] },
        "AT-002.19": { "kind": "capability-pending", "capabilities": ["publishing.publish-action"] },
        "AT-002.20": { "kind": "capability-pending", "capabilities": ["publishing.publish-action", "triage.queue"] },
        "AT-002.26": { "kind": "capability-pending", "capabilities": ["checkout.project-fuel", "discovery.funded-turn-billing"] },
        "AT-002.31": { "kind": "capability-pending", "capabilities": ["checkout.project-fuel"] }
      }
    }
  }
}
```

Loop: 22 green, 5 red. Integration: 21 green, 6 red. Both tiers declare all 27 P0 ids, which
`loadTierExpectation` requires.

### Bodies that are red at one tier only

AT-002.05 uses a per-tier body map. The `default` body drives the shipped decision and asserts the
block names all three remedies. The `integration` body drives the real SQL refusal, asserts its
kind is `discovery-allowance-exhausted` and that the spend did not land, and then throws
`new CapabilityPending(['discovery.message-route'])`. That is the shape AT-001.24 already uses:
prove everything the tier can prove, then declare the missing half by name.

Every declared-red body does the same. A red is not an empty body.

---

## 6. The red set

Six ids, five of them at both tiers.

| id | tier | waits on | why the tree cannot prove it today |
|---|---|---|---|
| AT-002.10 (paid continuation routes to project fuel) | both | `checkout.project-fuel` | The criterion has two halves. The negative half — no Discovery wallet, no Discovery-only balance, no separate credit SKU — is provable and the body proves it before it throws. The positive half needs a checkout route to route to, and no checkout exists anywhere in the tree. |
| AT-002.31 (funding is not vetting-gated) | both | `checkout.project-fuel` | Funding cannot succeed when there is nothing that funds. There is no payment table, no Stripe module and no checkout route. |
| AT-002.26 (funding restores the next turn) | both | `checkout.project-fuel`, `discovery.funded-turn-billing` | Needs both the checkout and a funded turn that bills fuel instead of the free allowance. The funded-turn side belongs to the Discovery agent requirement, which owns per-turn metering. |
| AT-002.19 (unvetted publish is blocked) | both | `publishing.publish-action` | There is no publish route, no project lifecycle column and no `scoped` state. The criterion is about an action being refused, and the action does not exist. |
| AT-002.20 (vetted publish enters triage) | both | `publishing.publish-action`, `triage.queue` | The same missing action, plus a triage queue that does not exist. |
| AT-002.05 (the zero-credit block names three remedies) | **integration only** | `discovery.message-route` | The block itself is real at both tiers. The three remedies are a sentence the product shows a person, and at the integration tier there is no deployed surface to show it: the refusal arrives as a raised SQLSTATE with a kind. Green at the loop tier over the shipped decision, exactly as AT-001.10 is green at loop and red at integration. |

### Where I differ from the lead's provisional set

**I add one id, at one tier: AT-002.05 at integration.** The lead's list is about surfaces that do
not exist at all. There is a second axis in this tree's manifests — `tests/at/expected/req-001.json`
declares eleven integration reds against five loop reds — and AT-002.05 falls on it. Declaring it
green at integration would mean claiming that the block's remedies reach a person, when the only
thing an integration test can observe is a SQLSTATE. The precedent is exact: AT-001.10 and
AT-001.29 are green at loop and `capability-pending` at integration on
`sut.accounts.sendDiscoveryMessage`.

**I keep AT-002.23 (no public "verified" claim) GREEN, and I flag it.** The brief's parenthetical
says its "full sweep waits on listing screens", and unit 10's own text says to "prove it on the
public project page that exists today, and declare the rest of the sweep in the manifest with a
stated shape". Those two sentences point in different directions and the founder should settle it.
My reading, and the reason for it: the criterion is a NEGATIVE over public surfaces. The set of
public surfaces today is exactly one — `public-project`, whose key set AT-001.22 already pins to
three keys and an `ok`. No public read function returns the trust tier; `read_public_project`
returns three columns; nothing under `src/` reads the tier. So the claim "no public surface makes
a verified claim" is true, provable, and stronger than a red: it fails the day somebody adds a
surface that breaks it. The narrowing is real and I state it in the body's own evidence — the
sweep covers the surfaces that exist, and the label rule for a trust flag is vacuously satisfied
because no surface shows a trust flag at all.

**I keep AT-002.12 (unvet closes publishing, funding untouched) GREEN, with a narrowed claim, and
this is the weakest green in the set.** Its three clauses divide badly:

- "the action is audit-recorded" — fully provable, and proved.
- "publishing closes" — the observable is that the tier returns to `unverified`, which is the
  state the publish gate will read. The refusal itself is carried by AT-002.19's red.
- "project-fuel funding is NOT blocked" — there is no funding to block. The body proves the
  adjacent fact it can: after the unvet, the allowance still recomputes, no other table changed,
  and no money object exists in the tree to have been touched.

A reviewer who wants AT-002.12 red has a case. I keep it green because two of its three clauses
are provable and the third is an absence, and because moving it red would leave unvet with no
green id at all — which would be a worse description of what this run actually builds.

---

## 7. The unit sequence

The order is the founder's. I do not change it. One unit carries more than its item text says, and
one dependency is latent; both are flagged.

### Unit 1 — AI4DEV-111 (the vet record, every field or no commit) · AT-002.11, AT-002.11b

**Builds.** The whole suite skeleton, and the vetting action without its notification: the audit
enum value in its own migration; the `org_trust_tier` and `org_evidence_type` enums;
`organizations.trust_tier`; the audit shape constraint; `set_organization_trust_tier` with its
full evidence parameter list; `_shared/vetting.ts`; the `WRITE_ROUTES` row; the edge folder; the
config block.

**Proves.** A vet by the platform admin writes one audit row carrying who, when, the legal name,
the reference link, the contact's name, title and attestation, the evidence type and the note. An
omission of any one mandated field leaves the tier unchanged, writes no audit row, and returns
`invalid-vetting-record`.

**Depends on.** Nothing in this run.

**ORDER FLAG — this unit carries the suite bring-up, and the item text does not say so.**
`bun run at:check req-002` requires every one of the 27 P0 ids to have exactly one `atTest` call
site the moment `tests/at/suites/req-002/` exists, and `at:verify --expect` requires
`tests/at/expected/req-002.json` to declare all 27. So unit 1 must also write: the
`suite-adapters.ts` line, `_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, the
six test files with all 27 call sites, and the manifest with 2 green and 25 red at both tiers. The
25 reds are `{ "kind": "pending", "phase": "sut-missing" }` bodies that name their own manifest
leaf, the shape `req-001/_pending.ts` established. Each later unit then moves its ids from red to
green in the same commit that lands them. **The manifest is this run's progress ledger, and every
unit after the first edits it.** I would not reorder anything for this; I would put it in unit 1's
commit message so a reviewer expects the size.

### Unit 2 — AI4DEV-112 (only the platform admin vets, only by hand) · AT-002.29, AT-002.30

**Builds.** `_source-scan.ts` with `strayTrustTierWriters()` and the vetting-surface inventory.
No product change: the authorisation this unit proves is the write gate's, inherited.

**Proves.** An NGO, a volunteer and an unauthenticated caller are each refused with the right kind
and status, with no tier change and no notification event. The tree holds exactly one vetting
path: one `WRITE_ROUTES` row, one writer of the column, no scheduled job, no document-review
state, no automated verification.

**Depends on.** Unit 1's route and column.

### Unit 3 — AI4DEV-113 (unvet closes publishing, funding untouched, outcome via the emitter) · AT-002.12, AT-002.13, AT-002.14

**Builds.** `write_standing` gains `org_seat_email`; `parseWriteStanding` and `WriteStanding` gain
`orgSeatEmail`; the four compile-broken literals are fixed; `decideTrustTierChange` builds the
write set with `prepareWriteSet`; `set_organization_trust_tier` is dropped and recreated with
`p_notification jsonb` and the `emit_notification` call.

**Proves.** Unvet returns the tier to `unverified` and writes its own audit row. A vet and an unvet
each emit exactly one `vetting.outcome` event with one email delivery and one in-app delivery to
the NGO, `emittedBy` equal to `notifications.emitter`, and the payload naming the outcome. No
second send path exists. It is one action: one route, one call, no approval chain.

**Depends on.** Unit 1. Also on the notifications emitter, merged already.

**ORDER FLAG — this unit changes REQ-001 machinery.** After it, the auth suite and the
notifications suite must both be re-run at both tiers. The brief already requires that; this is
the unit that makes it necessary. The alternative — giving `set_organization_trust_tier` its
notification parameter in unit 1 and leaving it unused — would put speculative code in unit 1 and
prove nothing earlier, so I keep the drop-and-recreate. It is the same move `complete_signup` has
survived twice.

### Unit 4 — AI4DEV-114 (emailed documents, metadata only; identity documents refused) · AT-002.16, AT-002.17, AT-002.18

**Builds.** `documentContentSinks()` in `_source-scan.ts`. No product change: the closed evidence
vocabulary and the closed audit key set both land in unit 1, because the record's shape is unit
1's subject.

**Proves.** A vet with `evidenceType: 'emailed_registration_document'` records a filename and a
received instant and nothing else. A vet whose body also carries a `documentContent` key records
the same closed key set, because the decision module reads named fields only. An identity-document
evidence type is refused with `invalid-evidence-type`, before any write. The stored evidence type
is exactly the one submitted, and no surface anywhere renders evidence or implies a review.

**Depends on.** Unit 1.

**Honest scope.** The platform proves it never held the document, not that a copy elsewhere was
deleted. The emailed copy lives in the founder's mailbox and its deletion is not a
platform-observable act. AT-002.16's own cx note drops the deletion-audit-event claim, so this is
the criterion's own scope and not a narrowing I chose.

### Unit 5 — AI4DEV-105 (profile create: name, mission, country, website, logo) · AT-002.01

**Builds.** The four profile columns and their constraints; `update_organization` dropped and
recreated with the four new parameters; `decideOrganizationRename` renamed to
`decideOrganizationEdit` and grown; `TenantReads.organization`, `OrganizationDashboard`, the
`callerReads` select list, and the two fixtures that implement `TenantReads`.

**Proves.** An email-verified NGO admin writes all five fields in one call, and all five come back
on the organisation dashboard.

**Depends on.** Nothing in this run.

**Design note the item text asks for.** I measured what `create-organization` and
`update-organization` hold: `create_organization(p_account_id, p_name)` inserts a row and seats
the caller; `update_organization` renames. `complete_signup` has already created the NGO's
organisation by the time AT-002.01's Given holds, so the criterion's "creates the org profile" is
the FIRST WRITE of the profile fields on an organisation that already exists. That is why this
unit grows the edit route and leaves `create_organization` alone. AT-002.01 and AT-002.02 are then
two different tests over one route: the first write plus the render, and the later edit plus three
rejections.

### Unit 6 — AI4DEV-106 (profile edit by the NGO's admin only) · AT-002.02

**Builds.** Nothing. Every refusal it needs exists.

**Proves.** The NGO's own admin edits all five fields and every value persists. Another NGO's
admin is refused `not-a-member`; a volunteer is refused `not-an-ngo-account`; a visitor is refused
401; and after each refusal the five fields are unchanged.

**Depends on.** Unit 5.

### Unit 7 — AI4DEV-107 (tier grants and the vet math) · AT-002.04, AT-002.07, AT-002.08

**Builds.** The two spend columns and their constraints; `discovery_daily_grant`,
`discovery_allowance`, `assert_email_confirmed`, `spend_discovery_credits`;
`_shared/discovery-allowance.ts`; the two `CONFIG_KEYS` entries; `discoveryGrantProblems()` and
`utcDayProblems()`.

**Proves.** An unverified NGO's grant is exactly the pinned 10; the tenth credit is allowed and
the eleventh is refused; a mid-day vet leaves remaining at 30 minus what was already spent; a
re-vet after an unvet mints nothing.

**Depends on.** Unit 1's `trust_tier` column.

**ORDER FLAG — a latent dependency the order happens to satisfy.** The manifest records D2.L1 as
`blocked-by: —`, but the grant is a function of the tier, so this unit cannot land before the tier
column. The founder's order puts the vetting units first, so the dependency is met. If anyone ever
reorders these units, this is the edge that breaks.

### Unit 8 — AI4DEV-109 (UTC hard reset, once per UTC day) · AT-002.06

**Builds.** Nothing in the product. The reset is unit 7's arithmetic; this unit is the test that
parameterises it.

**Proves.** From a starting balance of zero, partial and full, the allowance on the next UTC day
is exactly the tier grant, at both tiers — by advancing the loop clock, and by seeding yesterday's
spend at the integration tier. Two reads in one UTC day give the same answer, so no second reset
occurs.

**Depends on.** Unit 7.

### Unit 9 — AI4DEV-116 (what vetting never gates) · AT-002.21, AT-002.22

**Builds.** Nothing. `discoveryTurnAllowed` consults REQ-001's `discoveryMessageAllowed` for the
email floor and never reads the tier; `spend_discovery_credits` calls `assert_email_confirmed` and
reads the tier only to compute the grant.

**Proves.** An unvetted NGO spends inside its allowance at both tiers, and vetting, unvetting and
re-vetting change nothing about that. An email-unverified NGO is refused at every tier, and the
refusal names verification as the remedy.

**Depends on.** Unit 7.

### Unit 10 — AI4DEV-117 (pilot default: vetted at 30, founder-vetted wording) · AT-002.28, AT-002.23

**Builds.** The public-claim arm of `_source-scan.ts`.

**Proves.** After the audited vet, the organisation is vetted and its grant is exactly 30 — the
pilot default. The public project page carries the same four keys it always did, carries no trust
flag, and makes no verified claim; no public read function returns the tier; nothing under `src/`
reads it.

**Depends on.** Units 1 and 7.

### Unit 11 — AI4DEV-108 (zero-credit block and the remedies) · AT-002.05, AT-002.26, AT-002.27

**Builds.** The block message in `discoveryTurnAllowed`, naming three remedies: get founder-vetted
to raise the allowance to 30, fund project fuel to continue now, or wait for the next UTC day.

**Proves.** At zero remaining the turn is refused and the message names all three remedies (loop
tier). The day rollover makes the next turn succeed (both tiers). AT-002.26 is declared red.

**Depends on.** Unit 7. AT-002.26 additionally on the checkout and the funded turn, neither of
which exists.

### Unit 12 — AI4DEV-110 (no Discovery wallet) · AT-002.10, AT-002.31

**Builds.** Nothing in the product, and the absence is the substance: this design stores no
balance at all, only a spend count, so a Discovery-only balance is not merely absent but
unrepresentable.

**Proves.** Both ids are declared red, and both bodies prove the negative half before they throw:
no wallet table, no Discovery credit SKU, no Discovery-only balance, and no vetting condition
anywhere on a funding path.

**Depends on.** Unit 7. Both ids additionally on the checkout.

### Unit 13 — AI4DEV-115 (publish gates) · AT-002.19, AT-002.20

**Builds.** Nothing. I deliberately ship no `publishAllowed` decision module; see section 2.

**Proves.** Both ids are declared red. The bodies assert that the trust tier is readable and is the
only vetting state a publish gate could consult, and then throw the capability.

**Depends on.** Unit 7 for the tier, and the publish flow, which does not exist.

---

## 8. Rationale

### What I considered and rejected

**A one-to-one `org_profiles` table.** Rejected. It duplicates the primary key, the tenant
posture and both select policies, and it makes every profile read a join. `org_escalation_contacts`
justified its own table because it holds a DIFFERENT person; a mission statement is the
organisation described, not a second entity. This is the direction working: extending the row is
right here, and the escalation-contact precedent is the case where it would have been wrong.

**A separate `org_vetting_records` table.** Rejected, and this is the one a reviewer will press
hardest. The record is an event with an actor, an instant and evidence, and it never changes after
it is written. `audit_events` is precisely that table, with append-only triggers, a sole writer,
and a static scan that refuses a second writer. A new table would have to reproduce all three or
be a weaker audit log beside the strong one. What the choice costs: the record's mandated fields
live in a jsonb column rather than in typed, `not null` columns. I bought most of that back with
the check constraint — every mandated key present, the key set closed, the actor non-null — and I
say plainly in section 1 that the constraint guards shape and not content.

**A per-day credit ledger table.** Rejected. The only question anyone asks is "what remains
today", and two columns on the organisation row answer it. What the choice costs, stated honestly:
the pair `(discovery_spent_on, discovery_credits_spent)` is stale after midnight, and a reader who
reads the count without the date gets yesterday's number. The mitigation is that
`public.discovery_allowance` is the only read and `spend_discovery_credits` the only write, and
both compare the date. A ledger table would have made a stale read impossible instead of merely
wrong, and it would have given the Discovery agent's requirement a usage history for free. No
acceptance id asks for a history, so building one would be speculative.

**Storing a REMAINING balance instead of a SPEND count.** Rejected, and this is the load-bearing
call of section 2. A stored balance needs an actor to reset it: a scheduled job, or a
reset-on-first-read that writes on a read path, or a "last reset day" column that a reader must
compare anyway. Each of those makes "exactly once per UTC day" a property somebody has to enforce
and a test has to catch being violated. Storing spend makes the reset a consequence of the
arithmetic; makes "no rollover" unrepresentable rather than forbidden; makes the mid-day vet
compute `30 − k` with no code on the vetting path at all; and makes "no Discovery-only balance
exists" (AT-002.10) true of the schema.

**A second route for the profile edit.** Rejected. It would carry the same standing, the same
per-organisation admin check and an overlapping set of columns, which gives `organizations.name`
two writers, or splits one form across two calls where one can fail. The cost of growing
`update-organization` instead is that its own header today says it is not a profile editor, and
the run must rewrite that header. A comment is a description of the tree at a moment, not a rule;
this is the product change that changes it. What would have made me reverse: if AT-001.16 or
AT-001.36 had pinned the route's response shape or its refusal on a missing name. I checked both
bodies and the live adapter; neither does.

**Two routes for vet and unvet.** Rejected, for `set-account-lifecycle`'s reason: one route, the
target state in the body, one audited definer.

**Emitting outside the vet's transaction.** Not rejected — impossible. `emit_notification` is
granted to nobody, so no edge function can call it. The privilege fence decides this, and it
decides it the right way.

**Building the write set in SQL.** Rejected. The channel defaults and the copy live in the
TypeScript taxonomy; the database seeds event NAMES only. SQL would have to restate
`DEFAULT_BY_CLASS` and `renderCopy`'s general template for one row, and the two copies would
diverge silently the first time somebody edited the TypeScript.

**Passing a placeholder address and patching it in SQL.** Rejected. It keeps `write_standing`
untouched, and it puts a fabricated field inside a branded `WriteSet` — a value that is a lie
until SQL rewrites it. A brand exists to make the write set trustworthy; filling it with a
placeholder defeats the point for the sake of avoiding one column.

**Adding `payloadKeys: ['outcome']` to the taxonomy row, or a named copy entry.** Rejected. Either
moves an oracle another requirement owns. The outcome travels as a payload value, which the closed
taxonomy already permits.

**A blocklist of identity-document words for AT-002.17.** Rejected. A closed enum with no
identity-document member refuses them by construction and needs no maintenance.

**Shipping a `publishAllowed` decision module.** Rejected. AT-002.19 and AT-002.20 stay red with
or without it, so it would be code no acceptance id turns green. This is where I refuse the
`discovery-message` stand-in shape, and the difference is exactly that: that shape earns its place
when an id goes green over the shipped decision, and here none would.

### The single weakest point of this design

**Extending `public.write_standing` with `org_seat_email`.** Everything about the vet's
notification rests on it. It is the one place where "extend what exists" reaches into REQ-001's
machinery: `write_standing` sits on the path of EVERY write route, the field is read by exactly
one route, and after the change every `decide` in the tree receives an NGO's email address in its
input whether it wants one or not. It also breaks four files at compile time.

**What would break it.** A founder ruling or a review finding that the shared standing must not
carry personal data — a defensible position, since the standing exists to answer "who is calling
and what may they do", and an email address answers neither. If that ruling comes, the fallback is
the SQL-side recipient patch I rejected above: `decide` builds the write set with the seat
holder's account id and a placeholder address, and the definer rewrites the address in the event's
recipients and in each delivery with `jsonb_set`. That is about six lines of SQL, it does not
duplicate the taxonomy, and it costs the honesty of the branded write set. I would take it if the
ruling came, and I would not take it first.

**Two smaller weaknesses, named so a reviewer does not have to find them.**

The integration proof of the day boundary is a CONSTRUCTED yesterday, not an observed midnight.
`utcDayProblems()` closes the "is it really UTC" hole in CI, but no test in this design observes a
real day change on a real clock. Nothing can, and I would rather say so than imply otherwise.

AT-002.12 is the weakest green. Two of its three clauses are provable and the third is an absence.
Section 6 gives the argument for keeping it green and the argument a reviewer would use to move it.

### Not done here

- Clearing a profile field once set. Patch semantics have no clear operation; no acceptance id
  asks for one.
- A named copy entry for `vetting.outcome`. The NGO receives the general template's wording. Better
  copy moves the notification requirement's own oracle and belongs to that change.
- The trust tier on the organisation dashboard. Nothing green needs it, and the wiring leaf that
  would render "founder-vetted" is not in this run.
- A closed country vocabulary.
- The `service_role` grant on `public.spend_discovery_credits`, which belongs to the change that
  lands the Discovery route.
- Discovery usage history. This design keeps today's spend and nothing older.
