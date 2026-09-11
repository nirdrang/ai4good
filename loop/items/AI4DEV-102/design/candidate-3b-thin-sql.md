# Design: NGO organisation profile, daily Discovery allowance, and the audited founder vetting action

Direction: three narrow records, thin SQL, decisions in TypeScript. This document is the shape a writer can implement without guessing.

The stack is TanStack Start plus Supabase. The write boundary is `writeRoute`. The emit privilege fence and the closed taxonomy stay as they are. The acceptance harness takes no new machinery.

---

### 1. The data shape

Three current-state records sit beside `public.organizations`. Each record holds one fact. History lives in `public.audit_events`. Rules that can be pure functions live in TypeScript. SQL stores rows, locks them, and calls the emitter.

`public.organizations` already holds `id`, `name`, and `created_at`. This run does not add profile, trust, or allowance columns to that table. The rename route stays a one-field write. Name remains the organisation identity that signup, membership, and the public project page already use.

#### Why three records, not flags on `organizations`

A boolean `vetted` plus a credits column on `organizations` would mix identity, trust, and a daily meter in one row. The raise math, the UTC reset, and the profile edit would all fight over the same tuple. The tree already uses a one-to-one current-state table plus an audit row for the escalation contact. This run copies that split.

| Record | Table | What it holds | What it does not hold |
|---|---|---|---|
| Profile | `org_profiles` | mission, country, website, logo | name (stays on `organizations`); trust; credits |
| Trust | `org_trust` | current tier `unverified` \| `vetted` | who vetted, evidence, notes (those go to the audit row) |
| Allowance | `org_discovery_allowance` | UTC grant day, remaining, spent, whether a same-day raise already ran | funded fuel; a Discovery wallet |

Unverified is the floor. An organisation always has a trust row and an allowance row from the insert of `organizations`. A profile row exists only after the NGO admin writes one. Until then the dashboard shows name and a null profile.

#### Closed vocabularies

```sql
create type public.org_trust_tier as enum ('unverified', 'vetted');
```

Add one audit kind in its own migration. Postgres refuses to use a new enum value in the transaction that adds it. Precedent: `org_escalation_contact_recorded`.

```sql
-- supabase/migrations/20260914110000_audit_event_kind_org_trust_changed.sql
alter type public.audit_event_kind add value 'org_trust_changed';
```

One kind covers vet and unvet. The action lives in `detail->>'action'` as `vetted` or `unvetted`. A second event type would change the notifications taxonomy. This kind does not.

Evidence types are a TypeScript closed set, not a Postgres enum. The audit row stores the exact string. Adding a SQL enum would force a migration for every later evidence label.

```ts
export const EVIDENCE_TYPES = [
  'public_registry',
  'website',
  'ein',
  'emailed_registration_metadata',
] as const;

export const REFUSED_IDENTITY_EVIDENCE_TYPES = [
  'passport',
  'national_id',
  'drivers_license',
  'identity_card',
  'personal_id_scan',
] as const;
```

Unknown types are refused. The identity list is refused with a dedicated kind even if someone also puts them in a wider unknown-type bucket.

Pinned grants stay in three places that a source scan keeps equal:

- `tests/at/harness/atconfig.ts` already pins `discoveryDailyCreditsUnverified = 10` and `discoveryDailyCreditsVetted = 30`.
- `supabase/functions/_shared/discovery-grants.ts` exports the same two integers as `DISCOVERY_DAILY_GRANT_UNVERIFIED` and `DISCOVERY_DAILY_GRANT_VETTED`.
- SQL `public.org_discovery_grant(p_tier)` returns those two integers and no others.

Tests read `h.config.get('req-002.discovery_daily_credits.unverified')` and the vetted twin. They never write `10` or `30` in a test body. `CONFIG_KEYS` in `tests/at/harness/config.ts` gains those two dotted keys.

#### Table: `public.org_profiles`

```sql
create table public.org_profiles (
  org_id   uuid primary key references public.organizations (id) on delete cascade,
  mission  text not null,
  country  text not null,
  website  text not null,
  logo     text not null,
  updated_at timestamptz not null default now(),
  constraint org_profiles_mission_populated
    check (btrim(mission, E' \t\r\n\f') <> ''),
  constraint org_profiles_country_populated
    check (btrim(country, E' \t\r\n\f') <> ''),
  constraint org_profiles_website_populated
    check (btrim(website, E' \t\r\n\f') <> ''),
  constraint org_profiles_logo_populated
    check (btrim(logo, E' \t\r\n\f') <> '')
);

comment on table public.org_profiles is
  'NGO profile fields other than name. Name stays on public.organizations. Logo is a reference string, not stored bytes.';

revoke all on table public.org_profiles from anon, authenticated, service_role;
alter table public.org_profiles enable row level security;
grant select on table public.org_profiles to authenticated;

create policy org_profiles_select_org_member
  on public.org_profiles for select to authenticated
  using (public.viewer_is_org_member(org_id));

create policy org_profiles_select_platform_admin
  on public.org_profiles for select to authenticated
  using ((select public.viewer_is_platform_admin()));
```

`logo` is a non-empty text reference (URL or storage key). This run does not build an upload. AT-002.03 is retired. There is no file table and no byte column.

`TENANT_CATALOG` posture: **tenant-isolated**.

#### Table: `public.org_trust`

```sql
create table public.org_trust (
  org_id     uuid primary key references public.organizations (id) on delete cascade,
  tier       public.org_trust_tier not null default 'unverified',
  updated_at timestamptz not null default now()
);

comment on table public.org_trust is
  'Current founder-trust tier. Unverified is the floor. History is public.audit_events kind org_trust_changed.';

revoke all on table public.org_trust from anon, authenticated, service_role;
alter table public.org_trust enable row level security;
grant select on table public.org_trust to authenticated;

create policy org_trust_select_org_member
  on public.org_trust for select to authenticated
  using (public.viewer_is_org_member(org_id));

create policy org_trust_select_platform_admin
  on public.org_trust for select to authenticated
  using ((select public.viewer_is_platform_admin()));
```

No `vetted_at`, no evidence columns, no contact columns. Those facts are the audit row. Current state is the tier only.

`TENANT_CATALOG` posture: **tenant-isolated**.

#### Table: `public.org_discovery_allowance`

```sql
create table public.org_discovery_allowance (
  org_id         uuid primary key references public.organizations (id) on delete cascade,
  grant_day      date not null,
  remaining      integer not null,
  spent          integer not null,
  raised_on_day  boolean not null default false,
  constraint org_discovery_allowance_remaining_nonneg check (remaining >= 0),
  constraint org_discovery_allowance_spent_nonneg check (spent >= 0)
);

comment on table public.org_discovery_allowance is
  'Free Discovery meter for one UTC day. remaining and spent are stored. raised_on_day blocks a second same-day raise. There is no Discovery wallet column.';

revoke all on table public.org_discovery_allowance from anon, authenticated, service_role;
alter table public.org_discovery_allowance enable row level security;
-- no grant to authenticated
```

No upper-bound check on `remaining`. After a mid-day first vet, remaining is `30 - k`, which is not `10`. A check of `remaining <= 10` would be wrong. A check of `remaining <= 30` would pin `30` in SQL beside `org_discovery_grant`. The grant function is the one pin.

`TENANT_CATALOG` posture: **unreachable-by-client-roles**. Remaining-credit visibility is a later Discovery-agent clause (retired AT-002.09). This run does not expose the meter over PostgREST. Tests read it as the database owner through `public.touch_org_discovery_allowance` / `public.debit_org_discovery_allowance`.

There is no `service_role` SELECT on any of the three tables. `SERVICE_ROLE_SELECT` in the auth suite stays `{accounts, org_memberships}`.

#### Trigger: floor rows at organisation birth

```sql
create function public.org_trust_and_allowance_on_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.org_trust (org_id, tier)
  values (new.id, 'unverified');

  insert into public.org_discovery_allowance (
    org_id, grant_day, remaining, spent, raised_on_day
  )
  values (
    new.id,
    (timezone('utc', now()))::date,
    public.org_discovery_grant('unverified'),
    0,
    false
  );
  return new;
end;
$$;

create trigger organizations_trust_and_allowance
  after insert on public.organizations
  for each row execute function public.org_trust_and_allowance_on_insert();
```

`complete_signup` and `create_organization` both insert into `organizations`. The trigger covers both. Those two function signatures do not change.

The trigger function is not granted to `service_role`. It is not a write-route RPC. `assert_account_active` is not required on it.

Unit 1 may land the trust insert first and leave the allowance insert to the allowance migration. The final overlay is the function above. See section 7.

#### Grant lookup (the only SQL literals of 10 and 30)

```sql
create function public.org_discovery_grant(p_tier public.org_trust_tier)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_tier
    when 'vetted' then 30
    else 10
  end;
$$;
revoke execute on function public.org_discovery_grant(public.org_trust_tier) from public;
```

Comment on the function: keep in step with `DISCOVERY_DAILY_GRANT_*` in `discovery-grants.ts` and with `AT_CONFIG.discoveryDailyCreditsUnverified` / `discoveryDailyCreditsVetted`. The req-002 source scan extracts both integers from this function body and compares them to the TypeScript constants and to `AT_CONFIG`. That is how the literals stay in step.

#### Standing: seat email, so decide can build the write set

`public.write_standing` gains one extra key. Every write already loads the seat holder. This run also loads that holder's Auth email so `decideSetOrganizationTrust` can call `prepareWriteSet` with no I/O.

```sql
'org_seat_email', (
  select u.email
    from public.org_memberships m
    join auth.users u on u.id = m.account_id
   where m.org_id = p_org_id
)
```

`parseWriteStanding` reads `org_seat_email`. A missing key becomes `null`. A non-string non-null value is `unreadable`. `AccountStanding` gains `orgSeatEmail: string | null`.

This is a small break of “standing is type, lifecycle, and org role”. It avoids rendering notification copy in SQL. Section 8 names the alternative.

#### Dashboard projection

`TenantReads` gains two methods. `organizationDashboard` fills them. The public project view does not.

```ts
profile(organizationId: string): Promise<ReadResult<{
  org_id: string; mission: string; country: string; website: string; logo: string
}>>;
trust(organizationId: string): Promise<ReadResult<{
  org_id: string; tier: 'unverified' | 'vetted'
}>>;
```

`OrganizationDashboard` gains:

- `mission`, `country`, `website`, `logo`: `string | null` (null when no profile row)
- `trustLabel`: `'founder-vetted' | null` (`publicTrustLabel(tier)`; never `'verified'`)

`toMatchObject` bodies in the auth suite keep passing. Implementors that must grow: `callerReads` in `edge.ts`, `fixtureReads` in the auth fixture, the auth suite's tenant-isolation mocks, and `tests/at/harness/shipped-tenant-reads.selftest.ts`.

`callerReads` selects `mission,country,website,logo` from `org_profiles` and `tier` from `org_trust` as the caller. RLS is the tenant rule. This module still holds none.

#### What this run does not add

- No document-bytes table.
- No Discovery wallet table or SKU.
- No project lifecycle column (`scoped`, `triage`).
- No `verified` column and no `verified` label on any projection.
- No change to `PublicProjectView` keys `{ projectId, projectName, organizationName }`. Adding a trust flag there would break the auth suite's closed public-page key set.

---

### 2. How the allowance and the reset work

The day boundary is the UTC calendar date of the instant under test. In TypeScript that is `new Date(ms).toISOString().slice(0, 10)`. In SQL that is `(timezone('utc', now()))::date`. There is no cron. There is no rollover. The first read or debit of a new UTC day writes the tier grant into `remaining`, writes `0` into `spent`, writes `false` into `raised_on_day`, and writes today into `grant_day`.

#### What is stored versus what is computed

Stored on `org_discovery_allowance`:

- `grant_day` — the UTC date this row describes
- `remaining` — free credits left today
- `spent` — free credits already consumed today (`k` in AT-002.07)
- `raised_on_day` — true after the first unverified-to-vetted raise on `grant_day`

Computed:

- the tier grant: `grantForTier(tier)` / `org_discovery_grant(tier)`
- whether this instant is a new UTC day: `row.grantDay < utcDay`
- remaining after a first raise: `vettedGrant - spent`

Do not recompute `remaining` from `grant - spent` on every read. After an unvet, remaining may sit above the unverified grant until midnight. Recomputing would mint or claw credits the criteria do not ask for.

#### Pure TypeScript (loop tier, no database)

```ts
export type AllowanceRow = {
  grantDay: string; // YYYY-MM-DD
  remaining: number;
  spent: number;
  raisedOnDay: boolean;
};

export function utcDayFromUnixMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function allowanceForUtcDay(
  row: AllowanceRow,
  utcDay: string,
  grant: number,
): AllowanceRow {
  if (row.grantDay < utcDay) {
    return { grantDay: utcDay, remaining: grant, spent: 0, raisedOnDay: false };
  }
  return row;
}

export function applyFirstVetRaise(
  row: AllowanceRow,
  fromTier: OrgTrustTier,
  vettedGrant: number,
): AllowanceRow {
  if (fromTier !== 'unverified' || row.raisedOnDay) return row;
  const remaining = Math.max(0, vettedGrant - row.spent);
  return { ...row, remaining, raisedOnDay: true };
}

export function debitAllowance(
  row: AllowanceRow,
  n: number,
): { ok: true; row: AllowanceRow } | { ok: false; reason: string } {
  if (n < 1 || row.remaining < n) {
    return { ok: false, reason: ZERO_CREDIT_REASON };
  }
  return {
    ok: true,
    row: { ...row, remaining: row.remaining - n, spent: row.spent + n },
  };
}
```

`ZERO_CREDIT_REASON` names the three remedies in one sentence: get vetted (the vetted grant), fund fuel to continue now, or wait for the next day. AT-002.05 matches that sentence. It does not need a screen.

`discoveryTurnAllowed` consults `discoveryMessageAllowed` first, then remaining. It does not read the trust tier. That is AT-002.21 and AT-002.22 as decisions.

#### SQL twin (integration tier)

`writeRoute` `decide` is pure. It has no clock and no current remaining. The live path therefore runs the same arithmetic in SQL. This is the honest break of “every rule in TypeScript”. Section 8 states the cost.

```sql
create function public.touch_org_discovery_allowance(p_org_id uuid)
returns public.org_discovery_allowance
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (timezone('utc', now()))::date;
  v_tier public.org_trust_tier;
  v_row public.org_discovery_allowance;
begin
  select tier into v_tier from public.org_trust where org_id = p_org_id for update;
  if v_tier is null then
    raise exception 'touch_org_discovery_allowance refuses %: no trust row', p_org_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;

  select * into v_row
    from public.org_discovery_allowance
   where org_id = p_org_id
     for update;

  if v_row.grant_day < v_today then
    update public.org_discovery_allowance
       set grant_day = v_today,
           remaining = public.org_discovery_grant(v_tier),
           spent = 0,
           raised_on_day = false
     where org_id = p_org_id
     returning * into v_row;
  end if;
  return v_row;
end;
$$;
revoke execute on function public.touch_org_discovery_allowance(uuid) from public;
-- not granted to service_role; owner and other owner-definers only
```

`public.debit_org_discovery_allowance(p_account_id uuid, p_org_id uuid, p_n integer)` calls `assert_account_active`, calls `touch_org_discovery_allowance`, refuses when `remaining < p_n` with `detail = 'allowance-exhausted'`, then subtracts. Also owner-only. The future Discovery send definer will call it. This run does not deploy a Discovery edge function.

`set_organization_trust` calls `touch_org_discovery_allowance`, then `applyFirstVetRaise` in SQL:

```sql
if p_action = 'vet'
   and v_old_tier = 'unverified'
   and v_allowance.raised_on_day = false then
  update public.org_discovery_allowance
     set remaining = public.org_discovery_grant('vetted') - spent,
         raised_on_day = true
   where org_id = p_organization_id;
end if;
update public.org_trust
   set tier = 'vetted', updated_at = now()
 where org_id = p_organization_id;
```

Unvet sets `tier = 'unverified'` and does not touch remaining, spent, or `raised_on_day`.

#### Worked example: mid-day first vet (AT-002.07)

Grants are the pinned values 10 and 30.

1. Start of the UTC day, unverified. After `touch`: `remaining = 10`, `spent = 0`, `raised_on_day = false`.
2. The NGO consumes `k = 4` free credits. `remaining = 6`, `spent = 4`.
3. The founder vets. `fromTier` is `unverified` and `raised_on_day` is false, so remaining becomes `30 - 4 = 26`. `raised_on_day` becomes true. Tier becomes `vetted`.
4. Remaining is not a fresh 30.
5. A later UTC day: `touch` sees a new `grant_day`, writes `remaining = 30`, `spent = 0`, `raised_on_day = false`.

#### How a re-vet cannot raise twice or mint same-day credits (AT-002.08)

`applyFirstVetRaise` runs only when the stored tier is still `unverified` and `raised_on_day` is false.

Sequence:

1. Vetted mid-day. `raised_on_day = true`. Remaining is `30 - k`.
2. Unvet. Tier is `unverified`. Remaining is unchanged. `raised_on_day` stays true.
3. Re-vet the same UTC day. Stored tier is `unverified`, but `raised_on_day` is true, so remaining does not change. Cap is 30 because the stored tier becomes `vetted` again. No credits are minted.

A re-vet of an already-vetted org takes the same no-raise path (`fromTier !== 'unverified'`).

`raised_on_day` clears only in `allowanceForUtcDay` / `touch` when the UTC day changes. That is the “later days grant 30” half.

#### How the integration tier observes a day boundary

`h.clock.advance` does not exist at integration. No live adapter takes the harness clock. Postgres `now()` is not frozen.

The live adapter exposes `backdateAllowanceGrantDay(orgId, utcDay, remaining, spent)` as owner SQL. The test:

1. Reads today’s UTC date from `h.clock.now()` (RealClock, `Date.now()`).
2. Writes `grant_day` to that date minus one day, and writes the parameterized starting `remaining` and `spent`.
3. Calls `touch` or `debit` (product SQL uses `now()`).
4. Asserts `grant_day` equals today, `remaining` equals the current tier grant (or grant minus the debit), `spent` matches, and `raised_on_day` is false.

A second `touch` or `debit` in the same test does not restore the grant. That is “a second reset does not occur within the same UTC day”.

Starting balances for AT-002.06: `0`, `Math.floor(grant / 2)`, and `grant`. `grant` comes from `h.config.get`. The test body does not write 10 or 30.

Loop-tier AT-002.06 uses `h.clock.freezeAt('2026-03-01T12:00:00.000Z')`, spends, then `h.clock.freezeAt('2026-03-02T00:00:00.000Z')`. That body is `loop`-only. The integration body is the backdate path. Shared `default` must not call `h.clock.advance`.

#### Zero-credit remedies (AT-002.05, AT-002.27)

A debit that finds `remaining < n` after `touch` returns `ZERO_CREDIT_REASON`. That is AT-002.05 at both tiers, on an unfunded project, because this tree has no funded project.

AT-002.27: backdate (or freeze) to a new day with remaining 0, then debit. After reset, remaining is the tier grant, and the debit succeeds.

AT-002.26 stays red. There is no project-fuel checkout and no funded-turn billing. This run does not invent a `projectFunded: true` bypass that a test could flip.

---

### 3. The vetting action

One write route, one RPC, one transaction. Vet and unvet are the `action` field of the same route. That is AT-002.14: a single audited admin action, not a multi-step chain.

#### Route

- Folder: `supabase/functions/set-organization-trust/index.ts`
- Inventory: `WRITE_ROUTES['set-organization-trust']`
- Surface: `{ kind: 'edge', rpc: 'set_organization_trust' }`
- Standing: `{ kind: 'account-required', admits: ['platform_admin'] }`
- Target: `organizationIdField` (`body.organizationId`)
- `decide`: `decideSetOrganizationTrust` in `supabase/functions/_shared/org-trust.ts`
- Config: `[functions.set-organization-trust] verify_jwt = true`

Deactivation still beats type. A deactivated platform admin receives `account-deactivated` 403, not `not-a-platform-admin`.

#### Request body

Vet:

```ts
{
  organizationId: string,
  action: 'vet',
  legalName: string,
  publicReferenceUrl: string,
  contactName: string,
  contactTitle: string,
  authorityAttestation: string,
  evidenceType: string,
  note: string,
  evidenceMetadata?: { filename?: string; mediaType?: string; byteLength?: number }
}
```

Unvet:

```ts
{
  organizationId: string,
  action: 'unvet',
  note: string
}
```

Mandated vet fields (AT-002.11): `legalName`, `publicReferenceUrl`, `contactName`, `contactTitle`, `authorityAttestation`, `evidenceType`, `note`. Who vetted is the caller id. When is `audit_events.occurred_at` default `now()`. If any mandated field is absent or blank after trim, `decide` returns `invalid-request` 400 and the RPC is not called. That is AT-002.11b at the TypeScript gate.

`publicReferenceUrl` must match `/^https?:\/\//i`. Other mandated fields are non-empty trimmed text.

If the body carries `documentContent`, `documentBytes`, `document`, or `file`, `decide` refuses with `invalid-evidence`. Content is not stored and not ignored.

#### Decide (pure)

Order:

1. `action` is `vet` or `unvet`. Else `invalid-request`.
2. `standing.orgExists`. Else `no-such-organisation`.
3. Unvet: `note` present. Build the write set (below). Return args.
4. Vet: every mandated field present. `evidenceType` in `EVIDENCE_TYPES`. If it is in `REFUSED_IDENTITY_EVIDENCE_TYPES`, return `identity-document-refused` 400. If it is any other string, return `invalid-evidence` 400.
5. Seat: `standing.orgSeatAccountId` and `standing.orgSeatEmail` must both be non-null. Else `invalid-request` 400, reason: the organisation has no seat holder with an email, so the verification-outcome notification cannot be emitted. Class `decision` delivers email. `prepareWriteSet` would throw. Decide refuses instead.
6. `prepareWriteSet` on the existing taxonomy row `{ event: 'vetting.outcome', recipients: ['ngo'], channels: null, tone: 'normal', class: 'decision' }` with:

   - `actor`: caller id
   - `params`: `{ outcome: 'vetted' }` or `{ outcome: 'unvetted' }`
   - holders: `{ ngo: { recipientId: orgSeatAccountId, address: orgSeatEmail } }`

7. Return RPC args including `p_write` as the plain JSON of that `WriteSet` (`event`, `deliveries`, `opsItem: null`). `emittedBy` on every delivery is `notifications.emitter`.

Do not add `payloadKeys` to the taxonomy row. That would change the notifications suite oracle. Do not add a `NAMED` copy row. The general template renders subject `Vetting outcome` and body `Vetting outcome notification. vetted` (or `unvetted`). That is how this run tells a vet from an unvet without opening the closed 48-name set.

Do not import `notification-provider.ts` or `ProviderPort`. Do not call `deliver(`. The sole-writer scan would treat the vet module as a second sender.

#### New refusal kinds

Add to `WRITE_REFUSAL_KINDS`:

- `invalid-profile`
- `invalid-evidence`
- `identity-document-refused`

Missing audit fields reuse `invalid-request`. SQL `DETAIL` must equal the kind string.

#### Definer `public.set_organization_trust`

Arguments (final signature, landed with unit 1 so later units do not drop the function):

```
p_account_id uuid
p_organization_id uuid
p_action text
p_legal_name text
p_public_reference_url text
p_contact_name text
p_contact_title text
p_authority_attestation text
p_evidence_type text
p_note text
p_evidence_metadata jsonb
p_write jsonb
```

Body, in order, one transaction:

1. `perform public.assert_account_active(p_account_id)`.
2. Load caller type. If not `platform_admin`, raise `not-a-platform-admin`.
3. If the organisation does not exist, raise `no-such-organisation`.
4. `p_action` in (`vet`, `unvet`) or raise `invalid-request`.
5. For `vet`: if any of legal name, public reference URL, contact name, title, attestation, evidence type, note is null or blank, raise `invalid-request`. This is the SQL backstop for AT-002.11b.
6. `select … from org_trust where org_id = p_organization_id for update`.
7. `perform public.touch_org_discovery_allowance(p_organization_id)` (once the allowance table exists; unit 1 skips this line).
8. Apply the first-raise branch for `vet` (unit 7). For `unvet`, only set `tier = 'unverified'`.
9. `perform public.append_audit_event('org_trust_changed', p_account_id, org_seat_account_id, p_organization_id, p_note, detail)`.
10. `return public.emit_notification(p_write)`.

`detail` for a vet:

```json
{
  "action": "vetted",
  "legalName": "…",
  "publicReferenceUrl": "…",
  "contactName": "…",
  "contactTitle": "…",
  "authorityAttestation": "…",
  "evidenceType": "website",
  "note": "…",
  "evidenceMetadata": { "filename": "registry.pdf", "mediaType": "application/pdf", "byteLength": 20480 }
}
```

`evidenceMetadata` holds only those keys. It never holds a content key. For `emailed_registration_metadata`, metadata is required enough to prove AT-002.16: a filename and media type are enough. Content is unretrievable because it was never written.

`detail` for an unvet: `{ "action": "unvetted", "note": "…" }`.

Execute: `revoke from public`; `grant execute to service_role`. Volatile definer with `assert_account_active`, so the write-gate SQL scan passes.

#### What runs in one transaction, and why a partial vet is impossible

`writeRoute` calls one RPC. That RPC writes trust, writes allowance (after unit 7), appends the audit row, and calls `emit_notification`. `emit_notification` inserts the event and both deliveries (email and in-app). If any statement raises, Postgres rolls back all of it.

A missing mandated field never reaches the RPC (`decide` returns 400). A SQL backstop still refuses if a caller bypasses the edge. Either way `org_trust.tier` stays `unverified`, no audit row of this kind is appended, and no `vetting.outcome` event exists.

Two round trips (vet, then emit) are refused. That shape can leave a vetted org with no event. AT-002.13 requires the normal event path on land.

The TypeScript `decide` does not write. The edge function does not call `emit_notification` (execute is granted to nobody). The producer is the owner-definer. That is the emit privilege fence.

#### Authorization negatives (AT-002.29)

NGO, volunteer, unauthenticated, and non-admin callers never reach a committed tier change:

- Unauthenticated: `writeRoute` 401 before decide.
- NGO / volunteer: `writeGateDecision` 403 `not-a-platform-admin`.
- SQL backstop: same kind if the edge is skipped.

The test reads trust, allowance, audit, and `notification_events` after the refusal and asserts no change.

#### Unvet effects (AT-002.12)

- Publishing: `organizationMayPublish(tier)` is `tier === 'vetted'`. After unvet it is false. There is no publish route yet, so this is the gate the later publish flow must consult. AT-002.19 and AT-002.20 stay red because they need that flow.
- Funding: `organizationMayFund()` returns true for both tiers. Unvet does not write any funding gate. AT-002.31 still needs the checkout to prove an actual fund, so that id stays red. AT-002.12 is green on the decision plus the audit row.
- Allowance: unchanged the same UTC day (see section 2).

#### v1 shape (AT-002.30)

A source scan over `supabase/functions`, `supabase/migrations`, and `src` asserts there is no KYC workflow, no automated verification state machine, and no document-review status column. The only writers of `org_trust.tier` are the insert trigger (floor `unverified`) and `set_organization_trust`. That scan is the body of AT-002.30, at both tiers.

#### Pilot default (AT-002.28)

Concierge onboarding is this vet action. The test provisions a platform admin, vets an admitted NGO with every mandated field, and reads `tier = 'vetted'` plus remaining equal to the vetted grant (or `vettedGrant - k` if the test spent first). There is no separate onboarding route.

---

### 4. The modules and the routes

#### New shared modules (`supabase/functions/_shared/`)

| File | Owns |
|---|---|
| `discovery-grants.ts` | The two pinned grant integers and `grantForTier`. Loop and the source scan import this. No I/O, no clock. |
| `org-allowance.ts` | `utcDayFromUnixMs`, `allowanceForUtcDay`, `applyFirstVetRaise`, `debitAllowance`, `ZERO_CREDIT_REASON`, `discoveryTurnAllowed`. Clock is an argument. |
| `org-trust.ts` | `OrgTrustTier`, `publicTrustLabel` (returns `'founder-vetted'` or `null`, never `'verified'`), `organizationMayPublish`, `organizationMayFund`, evidence closed sets, `decideSetOrganizationTrust`, `validateVetAuditFields`. Calls `prepareWriteSet`. |
| `org-profile.ts` | `validateOrganizationProfile` (five fields: name via `validateOrganizationName`, plus mission, country, website, logo), `decideOrganizationProfileUpsert`. |

`verification.ts` is not grown. It remains the email-verification floor and says nothing about vetting. The Discovery route of a later requirement will call `discoveryMessageAllowed` and then `discoveryTurnAllowed`.

#### Changed shared modules

| File | Change |
|---|---|
| `write-routes.ts` | Two new `WRITE_ROUTES` rows. Three new refusal kinds. `AccountStanding.orgSeatEmail`. `parseWriteStanding` reads `org_seat_email`. |
| `tenant-reads.ts` | `profile` and `trust` on `TenantReads`. Extra fields on `OrganizationDashboard`. `organizationDashboard` projects them and sets `trustLabel` from `publicTrustLabel`. |
| `edge.ts` | `callerReads` selects the new tenant-isolated tables as the caller. |
| `notification-taxonomy.ts` | **No change.** `vetting.outcome` stays one row, no `payloadKeys`. |
| `notification-copy.ts` | **No change.** Outcome rides `params.outcome` through the general template. |
| `verification.ts` | **No change.** |
| `public-project.ts` | **No change.** Closed key set stays. |

#### New edge functions

| Folder | Kind | Owns |
|---|---|---|
| `set-organization-trust/` | write | `Deno.serve(writeRoute({ name: 'set-organization-trust', target: organizationIdField, decide: decideSetOrganizationTrust, render: … }))` |
| `update-organization-profile/` | write | NGO admin upsert of name plus the four profile columns. |

`update-organization` stays the rename used by the auth suite. Its header still forbids a general editor. This run does not grow it.

`organization-dashboard` stays a read. It is not a write route. After `TenantReads` grows, it renders the profile and the founder-vetted label.

No `src/` file changes. The wiring leaf of the parent is not in this run. The public-claim proof reads the existing index route and `public-project.ts`.

#### New `WRITE_ROUTES` rows and their standing

```ts
'update-organization-profile': {
  surface: { kind: 'edge', rpc: 'update_organization_profile' },
  standing: { kind: 'account-required', admits: ['ngo'] },
},
'set-organization-trust': {
  surface: { kind: 'edge', rpc: 'set_organization_trust' },
  standing: { kind: 'account-required', admits: ['platform_admin'] },
},
```

`discovery-message` stays a **stand-in** with the existing reason. This run does not replace it with a deployed Discovery function. This run does not grow its `decide` with allowance or vetting. The auth suite already gates that stand-in in `tests/at/suites/req-001/_fixture.ts`. A second stand-in for publish or checkout would have to appear in that same fixture text (`stand-in-not-gated`). This run refuses those stand-in rows. It ships `organizationMayPublish` and `organizationMayFund` as the decisions those future routes will consult, and it leaves AT-002.19, AT-002.20, AT-002.10, AT-002.31, and AT-002.26 red.

#### Profile write SQL

`public.update_organization_profile(p_account_id, p_organization_id, p_name, p_mission, p_country, p_website, p_logo)`:

1. `assert_account_active`
2. Non-empty trimmed fields or `invalid-profile` / `invalid-name`
3. Org exists or `no-such-organisation`
4. Membership admin, same `not-a-member` / `not-an-admin` backstop as `update_organization`
5. `update public.organizations set name = v_name where id = p_organization_id`
6. `insert into public.org_profiles … on conflict (org_id) do update …`

All five fields in one transaction. AT-002.02 exercises all five in one request.

#### Config

`supabase/config.toml` gains:

```
[functions.update-organization-profile]
verify_jwt = true

[functions.set-organization-trust]
verify_jwt = true
```

#### Migrations

| File | Owns |
|---|---|
| `20260914110000_audit_event_kind_org_trust_changed.sql` | `alter type … add value 'org_trust_changed'` only |
| `20260914120000_org_trust_and_vetting.sql` | enum `org_trust_tier`, table `org_trust`, RLS, trigger (trust row), `write_standing` email, `set_organization_trust` (trust + audit + emit) |
| `20260914130000_org_profiles.sql` | table `org_profiles`, RLS, `update_organization_profile` |
| `20260914140000_org_discovery_allowance.sql` | `org_discovery_grant`, table `org_discovery_allowance`, trigger overlay (trust + allowance), `touch_org_discovery_allowance`, `debit_org_discovery_allowance`, raise branch inside `set_organization_trust` |

#### Catalog and scans this run must keep green

- `tests/at/suites/req-001/_policy-scan.ts` `TENANT_CATALOG`: add `org_profiles` tenant-isolated, `org_trust` tenant-isolated, `org_discovery_allowance` unreachable-by-client-roles.
- Auth suite write-route scan: new folders constructed as `writeRoute`, configured, gated.
- Notifications `strayNotificationWriters()` and `providerClientImporters()` stay as they are. `set_organization_trust` calls `emit_notification`; it does not `insert into public.notification_*`.

#### Which rules the loop tier can prove, and the cost of the rest

| Rule | Loop (no stack) | Cost if it cannot |
|---|---|---|
| Profile field validation and org-admin standing | yes, shipped decide | — |
| Mandated vet fields; identity evidence refused | yes | — |
| Non-admin gate | yes, `writeGateDecision` | — |
| `publicTrustLabel` never returns `verified` | yes | — |
| Publish / fund decisions | yes | HTTP publish/checkout absent; those AT ids red |
| Email floor `discoveryMessageAllowed` | yes (already shipped) | — |
| Discovery not vetting-gated; remaining math; first raise; re-vet flag; UTC reset | yes, with `ControlledClock` | SQL twin must match; integration proves the twin with a backdated `grant_day` |
| Emit on the normal path, same transaction as the tier change | fixture mirrors the write set into memory | Live proof is the definer + `emit_notification` against Mailpit-pending rows |
| Tenant posture, RLS, write-route registration | static scans already in the auth suite | Live catalog in that suite’s integration run |
| Day boundary against Postgres `now()` | no | Operator backdate. No harness clock injection. |

---

### 5. The suite

Register `'req-002': typeof import('../suites/req-002/_fixture.ts')` in `tests/at/harness/suite-adapters.ts`. `_fixture.ts` exports `requirement = 'req-002' as const`.

#### Layout of `tests/at/suites/req-002/`

| File | Holds |
|---|---|
| `_bind.ts` | `bindSuite({ requirement: 'req-002', sut: 'orgProfile' })`. Bodies write `atTest(id, title, body)`. |
| `_contract.ts` | Sut methods and row types. Judgement types imported from the shipped modules, not restated. |
| `_fixture.ts` | In-memory maps for orgs, profiles, trust, allowance, audit, notification events/deliveries. Uses shipped decide functions. Allowance uses `clock.now()`. Org insert applies the same floor as the SQL trigger. |
| `_live.ts` | Auth, deployed writes, owner SQL for `touch` / `debit` / backdate / notification and audit reads. |
| `_integration.ts` | Shared live procedures (provision NGO, provision platform admin, backdate helper). |
| `_pending.ts` | `CapabilityPending` helpers for the five red ids. |
| `_source-scan.ts` | Grant bijection (AT_CONFIG ↔ `discovery-grants.ts` ↔ `org_discovery_grant`). No KYC / no document-review status (AT-002.30). No `verified` trust copy in product projections (AT-002.23). |
| `a-vetting-audit.test.ts` | AT-002.11, AT-002.11b |
| `b-vetting-authorization.test.ts` | AT-002.29, AT-002.30 |
| `c-unvet-and-notify.test.ts` | AT-002.12, AT-002.13, AT-002.14 |
| `d-evidence.test.ts` | AT-002.16, AT-002.17, AT-002.18 |
| `e-profile.test.ts` | AT-002.01, AT-002.02 |
| `f-tier-grants.test.ts` | AT-002.04, AT-002.07, AT-002.08 |
| `g-utc-reset.test.ts` | AT-002.06 (`loop` freezeAt / `integration` backdate) |
| `h-discovery-gates.test.ts` | AT-002.21, AT-002.22 |
| `i-pilot-and-claims.test.ts` | AT-002.28, AT-002.23 |
| `j-zero-credit.test.ts` | AT-002.05, AT-002.26 (red), AT-002.27 |
| `k-no-wallet.test.ts` | AT-002.10 (red), AT-002.31 (red) |
| `l-publish-gates.test.ts` | AT-002.19 (red), AT-002.20 (red) |

Every P0 has exactly one `atTest('AT-002.…'` call site, including every red. Per-tier maps use `default` plus `integration` where the clock or the live path differs. Drill is covered by `default`.

#### What the loop fixture stands on

- Shipped modules: `org-trust.ts`, `org-profile.ts`, `org-allowance.ts`, `discovery-grants.ts`, `verification.ts`, `prepareWriteSet`, `writePipeline`.
- Maps that mirror the three tables plus `organizations`, `audit_events`, and an in-memory outbox.
- `ControlledClock` passed into `allowanceForUtcDay` / debit / first raise.
- `attemptDiscoveryTurn(session, orgId)`: derive `emailVerified` from the rendered GoTrue user through `emailVerifiedFromUser`; consult `discoveryMessageAllowed`; consult `discoveryTurnAllowed` (remaining only); debit. It does not consult the trust tier. It does not go through a new write-route stand-in.

#### What the live adapter drives

- Real signup, email confirmation, and the two new edge writes.
- Owner SQL for `touch_org_discovery_allowance`, `debit_org_discovery_allowance`, backdate, and reads of `org_trust`, `org_discovery_allowance`, `audit_events`, `notification_events`, `notification_deliveries`.
- `attemptDiscoveryTurn` at integration: `select email_confirmed_at from auth.users`, then the same two shipped decisions, then `debit_org_discovery_allowance`. No Discovery HTTP route. The honesty sentence is the same one `verification.ts` already ships: a green does not mean Discovery messaging is gated in production. It means the decisions and the SQL meter answer as the criteria require.
- `organizationDashboard` and `publicProjectPage` against the deployed read functions.
- `provisionPlatformAdmin` copied from the auth live adapter (Auth admin user plus owner insert into `accounts`).

An email-unverified NGO at integration is built with the Auth admin API (`email_confirm: false`), then `complete_signup` as service role, then `attemptDiscoveryTurn` by account id. The public path still issues no session to that user. AT-002.22 is about the write rule, not about the session layer.

#### Exact `tests/at/expected/req-002.json`

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
        "AT-002.10": { "kind": "capability-pending", "capabilities": ["sut.ledger.projectFuelCheckout"] },
        "AT-002.19": { "kind": "capability-pending", "capabilities": ["sut.publishing.publishProject"] },
        "AT-002.20": { "kind": "capability-pending", "capabilities": ["sut.publishing.publishProject"] },
        "AT-002.26": {
          "kind": "capability-pending",
          "capabilities": ["sut.ledger.projectFuelCheckout", "sut.discovery.fundedTurn"]
        },
        "AT-002.31": { "kind": "capability-pending", "capabilities": ["sut.ledger.projectFuelCheckout"] }
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
        "AT-002.10": { "kind": "capability-pending", "capabilities": ["sut.ledger.projectFuelCheckout"] },
        "AT-002.19": { "kind": "capability-pending", "capabilities": ["sut.publishing.publishProject"] },
        "AT-002.20": { "kind": "capability-pending", "capabilities": ["sut.publishing.publishProject"] },
        "AT-002.26": {
          "kind": "capability-pending",
          "capabilities": ["sut.ledger.projectFuelCheckout", "sut.discovery.fundedTurn"]
        },
        "AT-002.31": { "kind": "capability-pending", "capabilities": ["sut.ledger.projectFuelCheckout"] }
      }
    }
  }
}
```

Red bodies throw `new CapabilityPending(['sut.ledger.projectFuelCheckout'])` (or the two-name list for AT-002.26, in that order). The rebuilt first line must match exactly.

No drill key. The auth and notifications manifests also omit drill.

---

### 6. The red set

Five ids. This matches the lead’s provisional set. One id the parent brief offered as red does **not** move to red.

| Id | Capability | Why the tree cannot honestly prove it today |
|---|---|---|
| AT-002.10 | `sut.ledger.projectFuelCheckout` | Paid continuation must route to the project-fuel checkout. That checkout is absent. The negative “no Discovery wallet” is the same id and cannot be split. |
| AT-002.31 | `sut.ledger.projectFuelCheckout` | “When it funds ordinary project fuel, Then funding succeeds.” There is no fund write. `organizationMayFund` is shipped and used by AT-002.12. That is not a successful checkout. |
| AT-002.19 | `sut.publishing.publishProject` | Unvetted publish blocked in the UI and at the API, with a project sitting at `scoped`. There is no publish route, no UI, and no `scoped` column. |
| AT-002.20 | `sut.publishing.publishProject` | Vetted publish enters triage. There is no publish flow and no triage state. |
| AT-002.26 | `sut.ledger.projectFuelCheckout`, `sut.discovery.fundedTurn` | The zero-credit remedy that restores by funding needs checkout and a funded Discovery turn together. Neither exists. |

**AT-002.23 stays green.** The parent brief said the full public-surface sweep waits on listing screens. One P0 id cannot be half green. Every public surface that exists today is the public project page (`PublicProjectView` and `read_public_project`) and `src/routes/index.tsx`. The test asserts those surfaces carry no `"verified"` claim and do not grow a trust flag. Listing screens are absent, so they cannot display a false claim. When they land they must call `publicTrustLabel`. That is a later requirement’s regression duty, not a reason to leave this id unproven on the page that does exist.

**AT-002.21 and AT-002.22 stay green at both tiers.** They do not need a deployed Discovery HTTP route. They need the shipped decisions plus the SQL meter, which this run builds. That is the same stand-in shape as `discovery-message` in the auth suite, except the live adapter here composes Auth + debit instead of throwing `CapabilityPending`.

This run does **not** add fixture producers, vendor stand-ins, or new harness capabilities to force a red id green.

---

### 7. The unit sequence

The order is the founder’s: vetting first, then the profile, then the allowance, then the gates. It does not change. Two units fight a real dependency. The fight is named. The order still holds.

#### Unit 1 — the vet action’s audit record (AT-002.11, AT-002.11b)

Builds: audit kind migration; `org_trust`; trigger that inserts the unverified floor; `write_standing` email; `org-trust.ts` validation and decide; `set-organization-trust` edge and definer (trust + audit + emit); WRITE_ROUTES row; catalog row for `org_trust`.

Proves: a complete vet writes every mandated field on the audit row; any omitted field writes nothing, including no `vetted` tier and no `vetting.outcome` event.

Depends on: nothing in this run. Depends on accounts, memberships, the audit table, and the emitter already on the tree.

Allowance raise is not in this unit. The definer does not touch a meter yet.

#### Unit 2 — only the platform admin vets, only by hand (AT-002.29, AT-002.30)

Builds: the authorization tests and the v1-shape source scan. No new tables.

Proves: NGO, volunteer, and unauthenticated callers are refused with no tier change and no event. No KYC / automated verification path exists.

Depends on: unit 1’s route.

#### Unit 3 — unvet, funding untouched, outcome through the emitter (AT-002.12, AT-002.13, AT-002.14)

Builds: the unvet branch if unit 1 shipped vet-only (prefer both actions in unit 1’s definer; this unit then only proves). `organizationMayPublish` / `organizationMayFund`. Notification read-back on the sut.

Proves: unvet writes `unverified` and an audit row; publish decision becomes false; fund decision stays true; both actions emit `vetting.outcome` with `params.outcome` set; one route, no approval chain.

Depends on: unit 1. The notifications emitter is already Done.

#### Unit 4 — emailed documents metadata-only; identity documents refused (AT-002.16, AT-002.17, AT-002.18)

Builds: evidence closed sets and the content-field refusal inside decide. No evidence table.

Proves: after a vet with `emailed_registration_metadata`, audit detail has metadata keys only; no table holds document bytes; identity types are refused with no commit; a vet with type `website` stores exactly that type; public project and dashboard copy do not imply a document review.

Depends on: unit 1.

#### Unit 5 — profile create (AT-002.01)

Builds: `org_profiles`; `org-profile.ts`; `update-organization-profile` edge and definer; dashboard projection fields; catalog row.

Proves: a signed-up, email-verified NGO writes name, mission, country, website, and logo; they persist; the dashboard returns them.

Depends on: nothing in this run. Signup already created the organisation with a name. This unit writes the profile row and may rename.

#### Unit 6 — profile edit by the NGO’s admin only (AT-002.02)

Builds: the negative cases on the same route (other NGO, volunteer, visitor).

Proves: all five fields edit for the org admin; every other account is rejected; the SQL backstop matches the rename route’s membership kinds.

Depends on: unit 5.

#### Unit 7 — tier grants and the vet math (AT-002.04, AT-002.07, AT-002.08)

Builds: `discovery-grants.ts`, `org-allowance.ts`, `org_discovery_grant`, `org_discovery_allowance`, trigger overlay, `touch` / `debit`, the first-raise branch in `set_organization_trust`, CONFIG_KEYS, grant source scan.

Proves: unverified grant is exactly the unverified pin; consumption cannot pass it; first vet sets remaining to vetted pin minus `k`; later days grant the vetted pin; re-vet does not mint.

Depends on: unit 1’s definer (this unit amends it). Profile is not required.

**Order fight:** unit 1 ships the definer; unit 7 patches it. That is a real dependency running backwards in the founder’s order. Keep the order. Unit 1’s ids do not read remaining. Do not pull the meter into unit 1 to make the SQL prettier.

#### Unit 8 — UTC hard reset (AT-002.06)

Builds: the parameterized reset tests. No new schema.

Proves: from zero, partial, and full remaining, the next UTC day writes exactly the current tier grant, once.

Depends on: unit 7.

**Order fight with the harness, not with another unit.** The unit text asks for a controllable clock at integration. Integration has no `h.clock.advance`. Do not add one. Observe the boundary by backdating `grant_day` (section 2). Loop still freezes the controlled clock.

#### Unit 9 — what vetting never gates (AT-002.21, AT-002.22)

Builds: `attemptDiscoveryTurn` on both adapters, sequencing `discoveryMessageAllowed` then `discoveryTurnAllowed` then debit.

Proves: an unvetted, email-verified NGO can debit within remaining; an email-unverified NGO cannot, at either trust tier.

Depends on: unit 7 for remaining. Email verification is already shipped.

#### Unit 10 — pilot default and founder-vetted wording (AT-002.28, AT-002.23)

Builds: `publicTrustLabel` usage on the dashboard; the public-surface source scan.

Proves: concierge vet leaves the NGO vetted at the vetted grant; public project page and `src/` carry no `"verified"` claim; if a trust label is shown on the dashboard it is exactly `founder-vetted`.

Depends on: units 1 and 7.

#### Unit 11 — zero-credit block and the remedies that restore (AT-002.05, AT-002.26, AT-002.27)

Builds: `ZERO_CREDIT_REASON` assertions; AT-002.26 as `CapabilityPending`.

Proves: at remaining 0 on an unfunded project, debit is blocked and the reason names vet, fund, and wait; the next UTC day restores a free debit. AT-002.26 stays red.

Depends on: unit 7 (and unit 8’s reset). Checkout and funded turns are not in the tree.

#### Unit 12 — no Discovery wallet; funding is not vetting-gated (AT-002.10, AT-002.31)

Builds: red call sites only, plus the decision `organizationMayFund` already shipped in unit 3.

Proves: nothing green. Both ids wait on the checkout.

Depends on: unit 7 only in the manifest sense (the grants exist). The red bodies do not need the meter.

#### Unit 13 — publish gates (AT-002.19, AT-002.20)

Builds: red call sites. `organizationMayPublish` is already shipped in unit 3.

Proves: nothing green. Both ids wait on the publish flow.

Depends on: unit 7 in the manifest. The red bodies do not.

---

### 8. Rationale

#### Considered and rejected

**Grow `organizations` with mission, country, website, logo, a vetted flag, and remaining.** Rejected. The table is the identity row. The rename route’s own header forbids a general editor. Mixing a daily meter with identity makes the mid-day raise a column fight. The assigned direction is three narrow records.

**Put the vet record only in `audit_events`, with no `org_trust` table.** Rejected. Current state does not live in the audit log. Lifecycle uses `accounts.lifecycle` plus an audit row. The escalation contact uses a one-to-one table plus an audit row. “Is this org founder-vetted?” must survive a log scan and must be lockable in the vet transaction.

**A new audit table for vetting.** Rejected. It would duplicate append-only machinery and fight the sole-writer scan on `audit_events`. Extra fields belong in `detail jsonb`.

**Two taxonomy events, `vetting.vetted` and `vetting.unvetted`.** Rejected. The taxonomy is closed. Adding a name changes the notifications suite’s own oracle. The seeded row is already `vetting.outcome` for both outcomes.

**Add `payloadKeys: ['outcome']` to `vetting.outcome`.** Rejected for the same oracle. String params already appear in the general copy body.

**Replace the `discovery-message` stand-in with a real Discovery edge function.** Rejected. The Discovery agent owns per-turn metering and the send route. This requirement owns grants, reset, and raise math. Shipping the debit contract is the established stand-in shape. Replacing the row would also retarget the auth suite’s Discovery tests.

**Add WRITE_ROUTES stand-ins for publish and project-fuel checkout so those ids can go green at loop.** Rejected. A stand-in must be gated in `tests/at/suites/req-001/_fixture.ts` or CI fails `stand-in-not-gated`. That would make the auth fixture drive surfaces this requirement does not own. The founder’s split-per-id ruling is declared red, not a fake green. Decision modules are shipped; the ids stay red.

**Inject the harness clock into Postgres or GoTrue at integration.** Rejected. No live adapter takes the harness clock. That would be new harness machinery. Backdating `grant_day` is an operator write to product state, which the auth suite already does for other operator facts.

**Recompute remaining as `grant(tier) - spent` on every tier change.** Rejected. Unvet then re-vet the same day would mint a second raise. `raised_on_day` is the minimum extra bit that makes AT-002.08 true.

**Clamp remaining to the unverified grant on unvet.** Rejected as extra behaviour the criteria do not ask for. Unvet closes publishing. It does not describe a credit clawback. `raised_on_day` already blocks a same-day remint.

**Prepare the notification write set in SQL.** Rejected as a copy-logic twin of `renderCopy`. Extending `write_standing` with the seat email lets `decide` call `prepareWriteSet`. SQL only persists.

**Pass remaining from `decide` into the definer so raise math stays TypeScript-only on the live path.** Rejected. `decide` cannot see spent or the UTC date without a clock and a standing dump of the meter. Dumping the whole allowance into standing on every write is a larger standing change than the email field, and it still cannot reset using `now()` inside decide.

#### Where the assigned direction breaks, and what this design does instead

The direction wants every rule as a pure function under `_shared/`. Two rules cannot run only there on the live path:

1. **UTC reset and first-raise**, because they need the stored row and `now()`. `writeRoute` decide is pure and has no clock. The live path uses short SQL (`touch_org_discovery_allowance` and the raise branch) that copies the TypeScript functions. The loop fixture uses the TypeScript functions only.
2. **`emit_notification`**, because execute is granted to nobody. The producer must be an owner-definer. This design still *decides* the write set in TypeScript. SQL only inserts it.

Both breaks are reported rather than hidden. The rest of the direction holds: three narrow tables, thin definers, closed-set validation and publish/fund/label/evidence rules in TypeScript.

#### Weakest point

The TypeScript and SQL twins of `allowanceForUtcDay` and `applyFirstVetRaise`. If a writer changes one and not the other, loop stays green and integration lies, or the reverse.

What would break it: editing the raise branch in `set_organization_trust` to `remaining = remaining + 20` (or to a fresh 30) without changing `org-allowance.ts`. AT-002.07 at loop would still pass. AT-002.07 at integration would fail — if it is run. CI runs loop `--expect` only. The integration command is a local gate. The grant source scan does not catch arithmetic drift, only the integers 10 and 30.

Mitigation that is still in this design: AT-002.07 and AT-002.08 must be green at integration in the committed manifest, and the writer’s verify list includes `bun run at:verify req-002 --tier integration --expect`. There is no mechanical bijection of the SQL procedure body with the TypeScript functions. Adding one would be new harness machinery. This run does not add it.

A second, smaller weakness: `attemptDiscoveryTurn` at integration is adapter-composed, not an HTTP route. A later Discovery send function can forget to call `discoveryMessageAllowed`, `discoveryTurnAllowed`, and `debit_org_discovery_allowance`. That is the same residual `verification.ts` already states in its header. It is accepted. Building the send route here would be another requirement’s surface invented early.