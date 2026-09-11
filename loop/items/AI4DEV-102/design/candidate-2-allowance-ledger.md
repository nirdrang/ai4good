# Candidate 2: the allowance ledger is the centre

Direction two, carried as far as it honestly goes. The daily Discovery allowance is the
load-bearing object. The ledger stores one number per organisation per UTC day: what was spent.
It stores no balance, no grant and no reset. The balance is a pure function of three inputs: the
tier grant, the spend row for today, and nothing else. A reset is not an event; a new UTC day is a
new row key with no row behind it yet. A tier change touches no ledger row; it changes one of the
two inputs the balance is computed from. Vetting is therefore one audited write to one column,
and the mid-day raise, the no-rollover rule, the once-per-day rule and the re-vet rule are all
consequences of the row key, not of code paths.

Where the direction breaks: it does not. The one place it bends is the integration tier, where no
clock moves. There the day boundary is observed by the operator re-keying today's spend row to
yesterday, which produces the exact bytes the product would hold after midnight. Section 2 says
what that proves and what it does not.

Every constraint in the task was checked against the source, not the reports. File and line
citations are given where a detail was load-bearing.

---

## 1. The data shape

### 1.1 The domain objects, in order of weight

1. **The spend row** — `public.discovery_spend (org_id, utc_day, spent)`. One row per
   organisation per UTC day, created on the first spend of that day. This is the ledger.
2. **The tier grant** — `public.discovery_daily_grant(tier) → integer`, an immutable function of
   the two-value enum. 10 for `unverified`, 30 for `vetted`. Mirrored in TypeScript as
   `DISCOVERY_DAILY_GRANT` and pinned in the at-config registry; section 1.6 says how the three
   stay in step.
3. **The allowance** — computed, never stored: `remaining = greatest(0, grant(tier) − spent)`.
   `public.discovery_allowance(org)` in SQL and `remainingCredits(tier, spent)` in TypeScript are
   the same expression.
4. **The trust tier** — one column, `organizations.trust_tier`, enum `unverified | vetted`,
   default `unverified`. This is the only input vetting changes.
5. **The vet record** — the audit row of kind `org_vetted`, whose `detail` carries every mandated
   field. It is a record of the action, not current state. Current state is the column above.
   Precedent: `accounts.lifecycle` plus an audit row
   (`supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql:158-196`).
6. **The profile** — four nullable columns on `organizations` beside `name`.

Why one column and one spend table rather than a status table, a balance column, a reset job and
booleans: every rule in the requirement reads off the two-part key `(org_id, utc_day)`. Once the
spend is keyed by day, "no rollover" is the absence of a row, "once per UTC day" is the primary
key, "reset to the tier grant" is `spent = 0` on a fresh key, "vet mid-day raises immediately" is
the grant input changing under a preserved `spent`, and "re-vet never mints" is that vetting
writes nothing to the ledger. A balance column would need a reset writer, and a reset writer
would need a guard against running twice; both are exactly the branching this direction refuses.

### 1.2 New types

```sql
-- 20260914100000_audit_event_kind_vetting.sql  (own file: Postgres refuses a new enum value in
-- the transaction that adds it; precedent 20260912110000_audit_event_kind_escalation_contact.sql)
alter type public.audit_event_kind add value 'org_vetted';
alter type public.audit_event_kind add value 'org_unvetted';
```

```sql
-- 20260914110000_organization_trust_tier_and_vetting.sql
create type public.trust_tier as enum ('unverified', 'vetted');

-- The closed evidence vocabulary. Sensitive personal identity documents are not a value, so
-- recording one is a cast failure, not a rule somebody has to remember (AT-002.17).
create type public.evidence_type as enum
  ('public_registry', 'website', 'ein', 'emailed_registration_document');
```

### 1.3 Altered table: `public.organizations`

```sql
-- 20260914110000 (trust tier) and 20260915100000_organization_profile.sql (the four fields)
alter table public.organizations
  add column trust_tier public.trust_tier not null default 'unverified';

alter table public.organizations
  add column mission  text,
  add column country  text,
  add column website  text,
  add column logo_url text,
  add constraint organizations_mission_populated  check (mission  is null or btrim(mission,  E' \t\r\n\f') <> ''),
  add constraint organizations_country_populated  check (country  is null or btrim(country,  E' \t\r\n\f') <> ''),
  add constraint organizations_website_shape      check (website  is null or website  ~ '^https?://[^\s]+$'),
  add constraint organizations_logo_url_shape     check (logo_url is null or logo_url ~ '^https?://[^\s]+$');
```

No new grant, revoke, policy or catalog row: `organizations` is already `tenant-isolated`
(`tests/at/suites/req-001/_policy-scan.ts:22`) with `select` to `authenticated` and the two
policies `organizations_select_org_member` and `organizations_select_platform_admin`. The NGO's
admin reads its own tier and profile through the existing policy; the platform admin reads every
organisation's. Nobody else can read the tier, so the tier is not a public claim. The four profile
fields are nullable because every organisation in the tree is created at signup with a name
only; the PRD gives no logo constraints (AT-002.03 retired) and no country vocabulary, so a logo
is a URL and a country is non-blank text.

### 1.4 New table: `public.discovery_spend`

```sql
-- 20260916100000_discovery_allowance_ledger.sql
create table public.discovery_spend (
  org_id  uuid    not null references public.organizations (id) on delete cascade,
  utc_day date    not null,
  spent   integer not null default 0,
  primary key (org_id, utc_day),
  constraint discovery_spend_non_negative check (spent >= 0)
);

comment on table public.discovery_spend is
  'Discovery credits spent per organisation per UTC day. No balance and no grant live here: '
  'remaining = greatest(0, discovery_daily_grant(trust_tier) - spent). A new UTC day is a new key (REQ-002, AT-002.06).';

revoke all on table public.discovery_spend from anon, authenticated, service_role;
alter table public.discovery_spend enable row level security;
grant select on table public.discovery_spend to authenticated;

create policy discovery_spend_select_org_member on public.discovery_spend
  for select to authenticated using (public.viewer_is_org_member(org_id));
create policy discovery_spend_select_platform_admin on public.discovery_spend
  for select to authenticated using ((select public.viewer_is_platform_admin()));
```

`TENANT_CATALOG` gains `discovery_spend: 'tenant-isolated'`. The posture passes every code in
`scanTenantMigrations`: baseline revoke names all three roles (`no-baseline-revoke`), RLS is
enabled (`isolated-no-rls`), `authenticated` holds exactly `{select}` (`isolated-wrong-privileges`),
both policies call a `public.viewer_` helper (`policy-using-no-auth`, `policy-non-viewer-function`),
neither is `for all` nor `to anon`, and `service_role` holds nothing (`service-role-write`). The
live half in `tests/at/suites/req-001/_integration.ts:166-201` pins `SERVICE_ROLE_SELECT` to
`accounts` and `org_memberships`, which this table does not join. No new `viewer_` function is
added: `VIEWER_FUNCTIONS` there is a closed set of three, and a fourth would fail AT-001's live
catalog check.

Why tenant-isolated and not unreachable: a later dashboard may show the NGO its own remaining
credits (AT-002.09 was retired into REQ-004's transparency clause). The read policy lands with the
table, as the outbox migration did for `notification_deliveries`, so the rule is encoded where a
later reader finds it. Nothing in this run reads it as a caller.

### 1.5 Functions

All four product functions are `security definer`, `set search_path = ''`, schema-qualified, and
`revoke execute … from public`. Grants are stated per function.

```sql
-- the grant, one expression, immutable
create function public.discovery_daily_grant(p_tier public.trust_tier)
returns integer language sql immutable set search_path = ''
as $$
  select case p_tier
    when 'unverified' then 10
    when 'vetted'     then 30
  end;
$$;
revoke execute on function public.discovery_daily_grant(public.trust_tier) from public;

-- the allowance, computed; granted to nobody, read by other definers and by the operator
create function public.discovery_allowance(p_organization_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'organization_id', o.id,
    'utc_day',   (now() at time zone 'utc')::date,
    'tier',      o.trust_tier,
    'grant',     public.discovery_daily_grant(o.trust_tier),
    'spent',     coalesce(s.spent, 0),
    'remaining', greatest(0, public.discovery_daily_grant(o.trust_tier) - coalesce(s.spent, 0))
  )
  from public.organizations o
  left join public.discovery_spend s
    on s.org_id = o.id and s.utc_day = (now() at time zone 'utc')::date
  where o.id = p_organization_id;
$$;
revoke execute on function public.discovery_allowance(uuid) from public;
```

```sql
-- the spend: the one writer of discovery_spend
create function public.spend_discovery_credit(p_account_id uuid, p_organization_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_confirmed timestamptz;
  v_tier      public.trust_tier;
  v_day       date := (now() at time zone 'utc')::date;
  v_spent     integer;
begin
  perform public.assert_account_active(p_account_id);

  -- Email verification is the floor for every Discovery message (decision-8). GoTrue's own fact,
  -- read here as a backstop; the route's TypeScript consults discoveryMessageAllowed first.
  select email_confirmed_at into v_confirmed from auth.users where id = p_account_id;
  if v_confirmed is null then
    raise exception 'spend_discovery_credit refuses %: the caller''s email address is not verified', p_account_id
      using errcode = '42501', detail = 'email-unverified';
  end if;

  select trust_tier into v_tier from public.organizations where id = p_organization_id for share;
  if v_tier is null then
    raise exception 'spend_discovery_credit refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;
  if not exists (select 1 from public.org_memberships where org_id = p_organization_id and account_id = p_account_id) then
    raise exception 'spend_discovery_credit refuses %: the caller holds no membership in organisation %', p_account_id, p_organization_id
      using errcode = '42501', detail = 'not-a-member';
  end if;

  -- The first spend of a UTC day creates the day's row. A concurrent first spend loses the
  -- insert and wins nothing: the update below serialises on the row lock.
  insert into public.discovery_spend (org_id, utc_day) values (p_organization_id, v_day)
  on conflict (org_id, utc_day) do nothing;

  update public.discovery_spend
     set spent = spent + 1
   where org_id = p_organization_id
     and utc_day = v_day
     and spent < public.discovery_daily_grant(v_tier)
  returning spent into v_spent;

  if v_spent is null then
    raise exception 'spend_discovery_credit refuses: organisation % has no Discovery credits left today', p_organization_id
      using errcode = 'P0001', detail = 'discovery-allowance-exhausted';
  end if;

  return public.discovery_allowance(p_organization_id);
end;
$$;
revoke execute on function public.spend_discovery_credit(uuid, uuid) from public;
-- No grant. The Discovery route (REQ-004) grants execute to service_role in its own migration.
```

The vet function and the profile function are given in sections 3 and 4.

Why `spend_discovery_credit` is granted to nobody today: the only caller in this tree is the
integration adapter, which drives it as the operator, exactly as `req-016/_live.ts:311` drives
`fixture_commit_transition_and_emit`. A `service_role` grant with no route behind it would be a
reachable write nobody serves. `scanWriteGateSql` still sees the function call
`assert_account_active`, so the grant can be added later without a rewrite.

### 1.6 The pinned numbers and how three copies stay in step

10 and 30 exist in three places by necessity: the registry
(`tests/at/harness/atconfig.ts:83-94`), the SQL `case` above, and the TypeScript mirror the
loop fixture consults:

```ts
// supabase/functions/_shared/discovery-allowance.ts
export const DISCOVERY_DAILY_GRANT: Readonly<Record<TrustTier, number>> = { unverified: 10, vetted: 30 };
```

`tests/at/harness/config.ts` `CONFIG_KEYS` gains two dotted keys:

```ts
'req-002.discovery.daily_credits.unverified': 'discoveryDailyCreditsUnverified',
'req-002.discovery.daily_credits.vetted': 'discoveryDailyCreditsVetted',
```

`tests/at/suites/req-002/_source-scan.ts` exports `grantPinProblems()`: it reads the two registry
values, `DISCOVERY_DAILY_GRANT`, and the migration text of `discovery_daily_grant` (regex
`when 'unverified' then (\d+)` and `when 'vetted' then (\d+)`), and returns every disagreement.
AT-002.04 asserts it empty at both tiers, and at the integration tier also asserts
`select public.discovery_daily_grant('unverified'::public.trust_tier)` equals `h.config.get(...)`.
Precedent for a text oracle over a migration seed: `taxonomySeedProblems()` in
`tests/at/suites/req-016/_source-scan.ts`. No test body writes 10 or 30.

---

## 2. How the allowance and the reset work

### 2.1 Where the day boundary lives

In Postgres: `(now() at time zone 'utc')::date`, evaluated inside `spend_discovery_credit` and
`discovery_allowance` on every call. In the loop fixture: `utcDayOf(clock.now())` from the shared
module, which is `new Date(ms).toISOString().slice(0, 10)`. Nothing stores "the current day"; the
key is computed at every read and every write.

### 2.2 What is stored and what is computed

| Fact | Stored | Computed |
|---|---|---|
| credits spent today | `discovery_spend.spent` for `(org, today)` | |
| tier | `organizations.trust_tier` | |
| grant | | `discovery_daily_grant(tier)` |
| remaining | | `greatest(0, grant − spent)` |
| yesterday's unspent credits | | nowhere: not in any row |

### 2.3 The first read of a new UTC day

There is no row for `(org, today)`. `discovery_allowance` left-joins it and coalesces `spent` to
0, so `remaining = grant`. The first spend inserts the row with `spent = 0` and increments it to 1.
No reset ran; no code path asks "has the reset already happened today". A second "reset" inside
the same day is impossible because it would be a second row with the same primary key.

### 2.4 The mid-day vet, worked

Organisation R, unverified, on day D:

| time (UTC) | act | tier | grant | spent (day D) | remaining |
|---|---|---|---|---|---|
| 09:00 | four spends | unverified | 10 | 4 | 6 |
| 13:00 | founder vets R | vetted | 30 | 4 | **26 = 30 − 4** |
| 14:00 | three spends | vetted | 30 | 7 | 23 |
| 15:00 | founder unvets R | unverified | 10 | 7 | 3 = max(0, 10 − 7) |
| 16:00 | founder re-vets R | vetted | 30 | 7 | **23 = 30 − 7**, not 30 and not 26 + 4 |
| 00:00 D+1 | first read | vetted | 30 | 0 (no row) | 30 |

The vet at 13:00 wrote one column on `organizations` and one audit row. It read and wrote no
ledger row. The remaining balance changed because one input to the computed value changed. The
re-vet at 16:00 had the same shape, so it cannot mint: `spent` is 7 before and after, and the
grant is 30 before and after. On day D+1 the key `(R, D+1)` has no row, so the grant is the whole
allowance, whatever day D ended at (zero, partial or full).

### 2.5 Why a re-vet cannot raise twice

Two reasons, both structural. First, vetting never writes to `discovery_spend`, so there is
nothing for a second vet to add. Second, `set_organization_vetting` compares the current tier
with the target tier under a row lock and returns `changed: false` without an audit row or an
event when they are equal (precedent: `change_account_lifecycle` returns `false` on a no-op,
`20260908120000:182-184`). So a vet on an already-vetted organisation changes nothing at all, and
a vet after an unvet changes exactly one column back.

### 2.6 What the integration tier observes, without moving the clock

The live adapter exposes one operator act, `moveLedgerToPreviousDay(organizationId)`:

```sql
update public.discovery_spend
   set utc_day = utc_day - 1
 where org_id = $1 and utc_day = (now() at time zone 'utc')::date
```

After it, the database holds exactly the bytes it would hold one second after midnight:
yesterday's row with its spend, and no row for today. The bodies of AT-002.06 and AT-002.27 then
call the product's own `discovery_allowance` and `spend_discovery_credit`, which compute today's
key themselves and find no row. The three starting balances of AT-002.06 are three organisations
whose day-D spend is set to 0, to 4, and to the full grant before the move.

What this proves: the ledger is keyed by UTC day, a different day's row is invisible to today's
read and write, and today's first read yields exactly the tier grant. What it does not prove: the
crossing itself. The product's midnight is `now()` in Postgres, and no test in this tree can wait
for it. One extra assertion narrows the gap: the integration body compares the `utc_day` the
product reports with `new Date().toISOString().slice(0, 10)` from the test process. Two clocks
agree on the day at every second except the few around midnight, so a product key computed in a
session time zone rather than UTC would be caught on any machine whose zone is not UTC.

The loop fixture computes the key from the controlled clock, so AT-002.06 there uses
`h.clock.advance(24 * 60 * 60 * 1000)` and observes the same thing through the same shared
function. Both tiers register a per-tier body map `{ default, integration }` for these two ids.

---

## 3. The vetting action

### 3.1 The path, in order

1. **Request.** `POST /functions/v1/set-organization-vetting` with a bearer token and a JSON body:
   `{ organizationId, vetted: true, legalName, referenceLink, contactName, contactTitle,
   authorityAttestation, evidenceType, document?, note }` for a vet;
   `{ organizationId, vetted: false, note }` for an unvet.
2. **Edge route.** `supabase/functions/set-organization-vetting/index.ts` is exactly one
   `Deno.serve(writeRoute({ name: 'set-organization-vetting', target: organizationIdField,
   decide: decideVetting, render }))`. `writeRoute` (`_shared/edge.ts:336-380`) owns CORS, POST
   only, `resolveCaller` (401), the JSON body, the uuid shape of `organizationId`, the standing
   round trip, the gate, the decision, and the one RPC.
3. **Write-route row.** `WRITE_ROUTES['set-organization-vetting'] = { surface: { kind: 'edge',
   rpc: 'set_organization_vetting' }, standing: { kind: 'account-required', admits:
   ['platform_admin'] } }`. `[functions.set-organization-vetting] verify_jwt = true` in
   `supabase/config.toml`.
4. **Standing and gate.** `write_standing` answers type, lifecycle, `org_exists`. `writeGateDecision`
   refuses in its fixed order: unreadable → deactivated → no account → type, so a deactivated
   platform admin hears `account-deactivated` and an NGO hears `not-a-platform-admin` (403). An
   unauthenticated caller never reaches the gate: `resolveCaller` answers 401.
5. **Decision.** `decideVetting(input: AccountWriteRouteInput)` in `_shared/vetting.ts`, pure:
   - `organizationId` absent → `invalid-request` 400; `standing.orgExists` false →
     `no-such-organisation` 409.
   - `vetted` not a boolean → `invalid-request` 400.
   - `vetted: true` → `validateVetRecord(body)`: every mandated field through `stringField`, and
     each null one is refused as `invalid-vet-record` 400 with the field named. `evidenceType`
     must be one of `EVIDENCE_TYPES`; anything else, including any value naming a passport, an
     identity card or a personal identity document, is `invalid-evidence` 400 with the v1 rule as
     the reason. `document` is accepted only when `evidenceType === 'emailed_registration_document'`,
     and then only with the keys `filename`, `mimeType`, `sizeBytes`, `receivedAt`; an extra key
     (`content`, `base64`, `url`, anything) is `invalid-evidence`.
   - `vetted: false` → `note` required, the rest ignored.
   - Args: `{ p_account_id, p_organization_id, p_vetted, p_legal_name, p_reference_link,
     p_contact_name, p_contact_title, p_authority_attestation, p_evidence_type, p_document,
     p_note, p_notice }`, where `p_notice = vettingOutcomeNotice()` is `{ channels, copy }`
     computed from the shipped taxonomy row and `renderCopy` (section 3.3).
6. **The definer.** `callDatabaseFunction('set_organization_vetting', args)` as the service role,
   one round trip, one transaction. Body below.
7. **Audit row, emit, return.** Inside that transaction.

### 3.2 The definer

```sql
create function public.set_organization_vetting(
  p_account_id uuid, p_organization_id uuid, p_vetted boolean,
  p_legal_name text, p_reference_link text,
  p_contact_name text, p_contact_title text, p_authority_attestation text,
  p_evidence_type public.evidence_type, p_document jsonb,
  p_note text, p_notice jsonb
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_caller_type public.account_type;
  v_current     public.trust_tier;
  v_target      public.trust_tier := case when p_vetted then 'vetted' else 'unverified' end;
  v_kind        public.audit_event_kind := case when p_vetted then 'org_vetted' else 'org_unvetted' end;
  v_outcome     text := case when p_vetted then 'vetted' else 'unvetted' end;
  v_seat        uuid;
  v_address     text;
  v_channel     text;
  v_deliveries  jsonb := '[]'::jsonb;
  v_note        text := btrim(p_note, E' \t\r\n\f');
begin
  perform public.assert_account_active(p_account_id);

  select account_type into v_caller_type from public.accounts where id = p_account_id;
  if v_caller_type is null then
    raise exception 'set_organization_vetting refuses %: no account has completed signup', p_account_id
      using errcode = '42501', detail = 'no-account';
  end if;
  if v_caller_type <> 'platform_admin' then
    raise exception 'set_organization_vetting refuses account type %: only a platform administrator vets', v_caller_type
      using errcode = '42501', detail = 'not-a-platform-admin';
  end if;

  if v_note is null or v_note = '' then
    raise exception 'set_organization_vetting refuses an action with no note'
      using errcode = '22023', detail = 'invalid-vet-record';
  end if;

  if p_vetted then
    -- Every mandated field, or nothing. This is the backstop under the TypeScript check.
    if p_legal_name is null or btrim(p_legal_name, E' \t\r\n\f') = ''
       or p_reference_link is null or btrim(p_reference_link, E' \t\r\n\f') = ''
       or p_contact_name is null or btrim(p_contact_name, E' \t\r\n\f') = ''
       or p_contact_title is null or btrim(p_contact_title, E' \t\r\n\f') = ''
       or p_authority_attestation is null or btrim(p_authority_attestation, E' \t\r\n\f') = ''
       or p_evidence_type is null then
      raise exception 'set_organization_vetting refuses a vet with a mandated field absent'
        using errcode = '22023', detail = 'invalid-vet-record';
    end if;
    if p_evidence_type = 'emailed_registration_document' then
      if p_document is null or jsonb_typeof(p_document) <> 'object'
         or not (p_document ?& array['filename', 'mime_type', 'size_bytes', 'received_at'])
         or exists (select 1 from jsonb_object_keys(p_document) k
                     where k not in ('filename', 'mime_type', 'size_bytes', 'received_at')) then
        raise exception 'set_organization_vetting refuses an emailed document with anything but its metadata'
          using errcode = '22023', detail = 'invalid-evidence';
      end if;
    elsif p_document is not null then
      raise exception 'set_organization_vetting refuses document metadata for evidence type %', p_evidence_type
        using errcode = '22023', detail = 'invalid-evidence';
    end if;
  end if;

  select trust_tier into v_current from public.organizations where id = p_organization_id for update;
  if v_current is null then
    raise exception 'set_organization_vetting refuses %: no such organisation', p_organization_id
      using errcode = '23503', detail = 'no-such-organisation';
  end if;
  if v_current = v_target then
    return jsonb_build_object('organization_id', p_organization_id, 'trust_tier', v_current, 'changed', false);
  end if;

  update public.organizations set trust_tier = v_target where id = p_organization_id;

  perform public.append_audit_event(
    v_kind, p_account_id, null, p_organization_id, v_note,
    jsonb_build_object(
      'from_tier', v_current, 'to_tier', v_target,
      'legal_name', p_legal_name, 'reference_link', p_reference_link,
      'contact', jsonb_build_object('name', p_contact_name, 'title', p_contact_title,
                                    'authority_attestation', p_authority_attestation),
      'evidence', case when p_vetted
                       then jsonb_build_object('type', p_evidence_type, 'document', p_document)
                       else null end,
      'note', v_note
    )
  );

  -- The NGO recipient: the organisation's one seat holder, and the address GoTrue holds for it.
  select m.account_id, u.email into v_seat, v_address
    from public.org_memberships m join auth.users u on u.id = m.account_id
   where m.org_id = p_organization_id;
  if v_seat is null or v_address is null then
    raise exception 'set_organization_vetting refuses %: no seat holder with an email address to notify', p_organization_id
      using errcode = '23503', detail = 'refused';
  end if;

  for v_channel in select jsonb_array_elements_text(p_notice->'channels') loop
    v_deliveries := v_deliveries || jsonb_build_object(
      'role', 'ngo', 'recipientId', v_seat, 'address', v_address, 'channel', v_channel,
      'emittedBy', 'notifications.emitter',
      'payload', jsonb_build_object('outcome', v_outcome),
      'subject', p_notice->'copy'->>'subject', 'body', p_notice->'copy'->>'body');
  end loop;

  perform public.emit_notification(jsonb_build_object(
    'event', jsonb_build_object(
      'event', 'vetting.outcome', 'actor', p_account_id,
      'payload', jsonb_build_object('outcome', v_outcome),
      'recipients', jsonb_build_array(jsonb_build_object(
        'role', 'ngo', 'recipientId', v_seat, 'address', v_address, 'channels', p_notice->'channels'))),
    'deliveries', v_deliveries,
    'opsItem', null));

  return jsonb_build_object('organization_id', p_organization_id, 'trust_tier', v_target, 'changed', true);
end;
$$;
revoke execute on function public.set_organization_vetting(uuid, uuid, boolean, text, text, text, text, text, public.evidence_type, jsonb, text, jsonb) from public;
grant execute on function public.set_organization_vetting(uuid, uuid, boolean, text, text, text, text, text, public.evidence_type, jsonb, text, jsonb) to service_role;
```

### 3.3 The transaction boundary, and why a partial vet is impossible

Everything from `assert_account_active` to `emit_notification` runs in the one transaction
PostgREST opens for the RPC. Three things happen outside it: the caller resolution against GoTrue,
the `write_standing` read, and the TypeScript decision. None of them writes. So the possible
end states are exactly two: nothing changed, or the tier column, the audit row, the event row and
its deliveries all committed together. A raise at any line, including an emitter refusal (an
unregistered event name fails the foreign key on `notification_event_types`), rolls back the
column and the audit row with it. That is the property AT-002.11b names, and the same property
the outbox migration header demands of every producer
(`20260913120000_notification_taxonomy_and_outbox.sql:11-17`).

The mandated fields are checked twice on purpose: `decideVetting` answers 400 before any round
trip, and the definer refuses again so an operator or a later route that bypasses the TypeScript
cannot land a vet with a hole in its record. AT-002.11b's integration body drives both arms: one
request with `referenceLink` missing through the edge (400, tier unchanged, no audit row, no
event), and one direct operator call of the definer with a null field (raise, tier unchanged, no
audit row, no event).

### 3.4 The emit, and the taxonomy

`vetting.outcome` is the registered row (`_shared/notification-taxonomy.ts:56`): recipients
`['ngo']`, class `decision`, channels null, so `channelsFor(row)` is `['email', 'inapp']`. The
taxonomy does not change: no new event, no `payloadKeys`, so the req-016 oracle
(`tests/at/suites/req-016/taxonomy.ts`) is untouched and AT-016.02 and AT-016.03 keep their
bijection. Vet and unvet are told apart by the payload `{ outcome: 'vetted' | 'unvetted' }`,
which the definer writes from `p_vetted` so the wire can never disagree with the column.

`p_notice` carries the two taxonomy facts a producer needs and SQL should not restate: the
channels and the copy. `vettingOutcomeNotice(outcome)` in `_shared/vetting.ts` returns
`{ channels: channelsFor(row), copy: renderCopy(row, { outcome }) }` from the shipped modules, so
there is one statement of the channel default and one of the wording. The event name is not in
`p_notice`; the definer hard-codes `'vetting.outcome'` and derives the payload itself. The
residual is stated in section 8.

`notification-copy.ts` gains one `NAMED` entry so the NGO reads a sentence rather than the general
template's "Vetting outcome notification. vetted":

```ts
'vetting.outcome': (payload) => ({
  subject: text(payload, 'outcome') === 'vetted' ? 'Your organisation is founder-vetted' : 'Your organisation is no longer founder-vetted',
  body: text(payload, 'outcome') === 'vetted'
    ? 'A platform administrator vetted your organisation. Your daily Discovery allowance is now the vetted grant, and you may publish.'
    : 'A platform administrator revoked your organisation\'s vetting. Publishing is closed. Funding is unchanged.',
}),
```

No suite reads `NAMED` (grep over `tests/at`: only `_fixture-producers.ts` names a
`NAMED_SAMPLES` of its own), so the entry changes no oracle. The word "verified" appears in
neither sentence.

The write set the definer assembles satisfies every check `emit_notification` and the schema
apply: `emitted_by = 'notifications.emitter'` (check constraint), an address on the email
delivery (`notification_deliveries_email_has_address`), a non-empty recipients array. The
sole-writer scan is satisfied: `strayNotificationWriters()` looks for `insert into
public.notification_*` outside `emit_notification`, and this function only calls the emitter;
`providerClientImporters()` looks for `deliver(` and `ProviderPort` in TypeScript, and
`vetting.ts` imports neither.

### 3.5 Refusal kinds

`WRITE_REFUSAL_KINDS` gains `'invalid-profile'`, `'invalid-vet-record'`, `'invalid-evidence'`,
`'email-unverified'` and `'discovery-allowance-exhausted'`. Each is raised as `detail` by exactly
one definer and produced by exactly one decision, so the edge maps it rather than flattening it
to `refused` (`_shared/edge.ts:374`).

---

## 4. The modules and the routes

### 4.1 `supabase/migrations/`

| file | owns |
|---|---|
| `20260914100000_audit_event_kind_vetting.sql` | the two enum values, alone, for the same-transaction reason |
| `20260914110000_organization_trust_tier_and_vetting.sql` | `trust_tier`, `evidence_type`, the column on `organizations`, `set_organization_vetting` |
| `20260915100000_organization_profile.sql` | the four profile columns and checks, `set_organization_profile` |
| `20260916100000_discovery_allowance_ledger.sql` | `discovery_spend`, its posture, `discovery_daily_grant`, `discovery_allowance`, `spend_discovery_credit` |

Each file ends with `notify pgrst, 'reload schema';`.

`set_organization_profile(p_account_id, p_organization_id, p_name, p_mission, p_country,
p_website, p_logo_url) returns jsonb`: `assert_account_active`, then the same membership and admin
checks `update_organization` makes (`20260912120000:279-301`) with the same `detail` kinds, then
one `update public.organizations set name, mission, country, website, logo_url`, returning the
row as jsonb. Granted to `service_role`. It writes `name` as well because the profile is the
five fields together (AT-002.02 says "ALL of"); `update_organization` stays as it is, one field,
one write, because two auth ids grade through it.

### 4.2 `supabase/functions/_shared/`

| file | change | owns |
|---|---|---|
| `vetting.ts` | new | `TRUST_TIERS`, `TrustTier`, `parseTrustTier`, `publishAllowed(tier)`, `trustLabel(tier)` (`'founder-vetted'` for vetted, `null` otherwise), `EVIDENCE_TYPES`, `DocumentMetadata`, `VetRecord`, `validateVetRecord`, `decideVetting`, `VettingArgs`, `vettingOutcomeNotice` |
| `organization-profile.ts` | new | `OrganizationProfile`, `validateOrganizationProfile`, `decideOrganizationProfile`, `ProfileArgs` |
| `discovery-allowance.ts` | new | `DISCOVERY_DAILY_GRANT`, `utcDayOf(ms)`, `remainingCredits(tier, spent)`, `allowanceDecision(facts)` (consults `discoveryMessageAllowed` first, then the grant), `DISCOVERY_BLOCK_REMEDIES` (the sentence naming vet → 30, fund fuel, wait for the next UTC day) |
| `write-routes.ts` | edit | two rows: `set-organization-profile` (admits `['ngo']`, rpc `set_organization_profile`), `set-organization-vetting` (admits `['platform_admin']`, rpc `set_organization_vetting`); five refusal kinds |
| `tenant-reads.ts` | edit | `TenantReads.organization` row gains `mission, country, website, logo_url, trust_tier`; `OrganizationDashboard` gains `profile: { mission, country, website, logoUrl }`, `trustLabel`, `canPublish`; the projection calls `trustLabel` and `publishAllowed` |
| `edge.ts` | edit | `callerReads.organization` selects the seven columns; no other line |
| `notification-copy.ts` | edit | the one `NAMED` entry |

All three new modules obey the `_shared` constraints: relative imports only, no Deno, no I/O, no
clock, no randomness. `utcDayOf` takes milliseconds; it does not read a clock. The write-route
scan's `shared-module-reaches-database` regex finds nothing in them.

The `discovery-message` stand-in row is not touched. Its future edge surface is
`{ kind: 'edge', rpc: 'spend_discovery_credit' }`, and its decision is `allowanceDecision`.
That is the one place this design uses the established stand-in shape: a pure decision the
route will consult, driven by the fixture, while the route stays absent. Where the design refuses
the shape: no stand-in rows are added for publishing or for the fuel checkout. A row in
`WRITE_ROUTES` is a claim about a route, the scan then demands that `req-001/_fixture.ts` drive it
(`_write-route-scan.ts:254-267`), and every row also lands in three exhaustive maps of the auth
suite. Two decisions that no route consults yet, `publishAllowed` and the funding absence, do not
earn inventory rows; their ids are red.

### 4.3 `supabase/functions/<route>/index.ts`

| folder | shape |
|---|---|
| `set-organization-profile/` | one `Deno.serve(writeRoute({ name, target: organizationIdField, decide: decideOrganizationProfile, render }))` |
| `set-organization-vetting/` | one `Deno.serve(writeRoute({ name, target: organizationIdField, decide: decideVetting, render }))` |
| `organization-dashboard/` | unchanged; its body grows through `tenant-reads.ts` |

`supabase/config.toml` gains `[functions.set-organization-profile]` and
`[functions.set-organization-vetting]`, both `verify_jwt = true`.

### 4.4 `src/`

Nothing. The wiring leaf of the fifth deliverable is not in this run, no route under
`src/routes/` exists beyond the index, and the UI never touches the database. The label constant
any future screen must use is `trustLabel` in `_shared/vetting.ts`.

### 4.5 Test-side files touched outside the new suite

| file | change |
|---|---|
| `tests/at/harness/suite-adapters.ts` | `'req-002': typeof import('../suites/req-002/_fixture.ts')` |
| `tests/at/harness/config.ts` | the two dotted keys |
| `tests/at/suites/req-001/_policy-scan.ts` | `discovery_spend: 'tenant-isolated'` |
| `tests/at/suites/req-001/_contract.ts` | `WriteSubject` gains the two route variants; `AuditEventKind` gains the two kinds |
| `tests/at/suites/req-001/_fixture.ts` | `fixtureReads().organization` returns the seven columns (nulls and `'unverified'`); `attemptWrite`'s `Record<WriteRouteName, …>` gains two entries that call the shipped decisions through `writePipeline` |
| `tests/at/suites/req-001/_live.ts` | `attemptWrite` gains the same two entries through `postWrite` |

The last three are forced by exhaustive types, not by choice. `Record<WriteRouteName, …>` at
`req-001/_fixture.ts:1586` and `req-001/_live.ts:885` refuses to compile with a missing key, and
`TenantReads.organization` is what `organizationDashboard` reads. Each edit is a few lines. They
are named here so the unit that lands the rows budgets for them.

---

## 5. The suite

### 5.1 Layout of `tests/at/suites/req-002/`

| file | holds |
|---|---|
| `_bind.ts` | `bindSuite({ requirement: 'req-002', sut: 'organizations' })`; re-exports `AtContext`, `OpenWorld`, `AtPending` |
| `_contract.ts` | `OrganizationsSut`, the row shapes, the request and outcome types; judgement types imported from the shipped modules, never restated |
| `_fixture.ts` | the loop adapter, `requirement = 'req-002' as const`, `createFixtureAdapter` |
| `_live.ts` | the integration adapter, `requirement = 'req-002' as const`, `createLiveAdapter({ stack })` |
| `_source-scan.ts` | `grantPinProblems()`, `trustTierWriters()`, `vettingRouteProblems()` |
| `a-org-profile.test.ts` | AT-002.01, AT-002.02 |
| `b-allowance.test.ts` | AT-002.04, AT-002.05, AT-002.06, AT-002.07, AT-002.08, AT-002.10, AT-002.26, AT-002.27, AT-002.31 |
| `c-vetting-action.test.ts` | AT-002.11, AT-002.11b, AT-002.29, AT-002.30, AT-002.12, AT-002.13, AT-002.14 |
| `d-evidence-rule.test.ts` | AT-002.16, AT-002.17, AT-002.18 |
| `e-gates.test.ts` | AT-002.19, AT-002.20, AT-002.21, AT-002.22, AT-002.28 |
| `f-public-claims.test.ts` | AT-002.23 |

Twenty-seven `atTest('AT-002.…'` call sites, one per P0 id, in `*.test.ts` files only, which is
what `inspectBijection` reads (`tests/at/harness/check.ts:78`).

### 5.2 The system under test

```ts
export type OrganizationsSut = {
  // Givens. The NGO takes the live public path (register, confirm, sign in, complete signup);
  // the others are operator acts, as provisionPlatformAdmin is in the auth suite.
  provisionNgo(email: string, opts: { emailVerified: boolean }): Promise<NgoActor>;      // { session, accountId, organizationId, email }
  provisionVolunteer(email: string): Promise<Session>;
  provisionPlatformAdmin(email: string): Promise<Session>;

  // the profile route and its read-backs
  setProfile(session: Session | null, request: ProfileRequest): Promise<ProfileOutcome>;
  profile(organizationId: string): Promise<ProfileRow | null>;                          // operator read
  organizationDashboard(session: Session | null, organizationId: string): Promise<TenantReadOutcome<OrganizationDashboard>>;

  // the vetting route and its read-backs
  setVetting(session: Session | null, request: VettingRequest): Promise<VettingOutcome>;
  trustTier(organizationId: string): Promise<TrustTier>;                                // operator read
  trustTierValues(): Promise<string[]>;                                                 // the enum, live: enum_range
  auditEvents(filter: { subjectOrgId: string }): Promise<AuditEventRow[]>;
  notificationEvents(filter: { event: string; recipientId: string }): Promise<NotificationEventRow[]>;
  notificationDeliveries(eventId: string): Promise<NotificationDeliveryRow[]>;

  // the ledger: the debit contract the Discovery agent calls later, and its read-back
  spendDiscoveryCredit(session: Session | null, organizationId: string): Promise<SpendOutcome>;
  allowance(organizationId: string): Promise<AllowanceRow>;                             // { utcDay, tier, grant, spent, remaining }
  moveLedgerToPreviousDay(organizationId: string): Promise<void>;                       // operator act, section 2.6

  // the publish decision, consulted; no route exists behind it
  attemptPublish(session: Session, organizationId: string): Promise<{ ok: true } | WriteRefusal>;

  // the public page, unchanged from the auth suite's shape
  publicProjectPage(projectId: string): Promise<PublicProjectOutcome>;
  createProjectAsOperator(organizationId: string, name: string): Promise<{ id: string }>;
};
```

### 5.3 What the loop fixture stands on

`_fixture.ts` is standalone: its own Map state for accounts, sessions, organisations, seats,
profile fields, tier, spend rows, audit rows of the two kinds, and notification writes. Every
judgement is the shipped module's:

- caller resolution renders the GoTrue user shape and judges it with `callerFromAuthAnswer` and
  `emailVerifiedFromUser`;
- every write runs `writePipeline(spec, input)` with a spec whose `name` is the `WRITE_ROUTES` row,
  so the gate order is on the path; the `discovery-message` stand-in spec's `decide` wraps
  `allowanceDecision` over facts the fixture supplies;
- the tier arithmetic is `remainingCredits` and `utcDayOf(clock.now())`;
- the vet mirror follows section 3.2 step for step over state, and its emit builds the same write
  set from `vettingOutcomeNotice` and appends it to an in-memory outbox with
  `emittedBy: 'notifications.emitter'`;
- `publishAllowed(tier)` is the whole of `attemptPublish`.

What a loop green claims: the decisions and the arithmetic are right, and the gate sits in front
of every write. What it does not claim: any migration, policy or deployed function.

### 5.4 What the live adapter drives

`_live.ts` uses `authPost`, `functionPost`, `verifyLinksFor`, `followLink` and `sqlClient` from
`tests/at/harness/live-stack.ts`, nothing else:

- `provisionNgo({ emailVerified: true })`: signup, the emailed link from the mail catcher, the
  password grant, `POST /functions/v1/complete-signup`. `provisionNgo({ emailVerified: false })`:
  the Auth admin API with `email_confirm: false`, then operator inserts into `accounts`,
  `organizations` and `org_memberships` (the state `complete_signup` would leave, without a
  session; the live public path cannot reach a completed-but-unverified account, which is the
  reason the auth suite declares AT-001.10 red at this tier). `provisionVolunteer` and
  `provisionPlatformAdmin`: the admin API with `email_confirm: true`, one `accounts` insert as the
  operator, then a sign-in. Precedent: `req-001/_live.ts:831-854`.
- `setProfile` and `setVetting`: the two deployed functions over the stack's gateway, with the
  anon key as bearer when the session is null (401).
- `spendDiscoveryCredit`: `select public.spend_discovery_credit($account, $org)` as the operator;
  the SQLSTATE and `detail` of a raise are read with the same field walk as `databaseRefusal` in
  the auth suite (`req-001/_live.ts:195-207`), and the reason sentence for
  `discovery-allowance-exhausted` is rendered from `DISCOVERY_BLOCK_REMEDIES`, which is what the
  Discovery route will do when it exists.
- `allowance`, `trustTier`, `profile`, `auditEvents`, `notificationEvents`, `notificationDeliveries`,
  `trustTierValues`: operator SQL reads.
- `moveLedgerToPreviousDay`: the one operator write of section 2.6.
- `attemptPublish`: the live tier read, then `publishAllowed`. It is labelled in `_contract.ts`
  as a decision consult with no route behind it.
- `publicProjectPage`: `POST /functions/v1/public-project` with the anon key.

`registerConfirmAndSignIn`'s assertions from the auth suite (`req-001/_integration.ts:144-164`)
are repeated inside `provisionNgo`, so a missing confirmation email fails with its own cause.

### 5.5 The oracles in `_source-scan.ts`

- `grantPinProblems()` — section 1.6.
- `trustTierWriters()` — over `supabase/migrations/*.sql`: every statement that assigns
  `trust_tier` must sit inside the body of `set_organization_vetting`; no `create trigger` on
  `public.organizations` may name `trust_tier`; no statement may name `cron.schedule` or
  `pg_cron`. Empty is the assertion (AT-002.14, AT-002.30).
- `vettingRouteProblems()` — over `WRITE_ROUTES`: exactly one row whose rpc is
  `set_organization_vetting`, its `admits` exactly `['platform_admin']`, no row whose name or rpc
  contains `kyc`, `verify` or `review` (AT-002.30).

Precedent for suite-local text oracles: `req-001/_policy-scan.ts`, `req-016/_source-scan.ts`. No
sentinel, fault, vendor stand-in, fixture world or capability is added.

### 5.6 The bodies, by id

- **AT-002.01** provision an NGO; `setProfile` with all five; `profile()` and
  `organizationDashboard()` both carry the five values.
- **AT-002.02** the admin edits all five, each new value persists; a second NGO's admin,
  a volunteer and a null session are refused (`not-a-member`, `not-an-ngo-account`,
  `unauthenticated`) and the row is unchanged.
- **AT-002.04** `grantPinProblems()` empty; `allowance().grant === h.config.get('req-002.discovery.daily_credits.unverified')`;
  spend `grant` times, all ok, the next refused `discovery-allowance-exhausted`; `spent === grant`
  and never above; `attemptPublish` refused.
- **AT-002.05** at zero, the refusal reason matches `/vet/i`, `/30/`, `/fuel/i` and `/next (UTC )?day/i`
  and the spend row did not move.
- **AT-002.06** three NGOs at spent 0, 4 and `grant`; default body advances the clock a day,
  integration body calls `moveLedgerToPreviousDay`; each `allowance().remaining === grant`
  exactly; one spend; `remaining === grant − 1`; a second `allowance()` read still
  `grant − 1`; integration also checks `allowance().utcDay` against the process clock.
- **AT-002.07** spend k = 4; vet; `allowance()` is `{ grant: 30, spent: 4, remaining: 26 }` at
  once; roll the day; `remaining === 30`.
- **AT-002.08** vet, spend k, unvet (`remaining === max(0, 10 − k)`), re-vet; `remaining === 30 − k`;
  a second vet answers `changed: false`, no new audit row, no new event.
- **AT-002.10, AT-002.31, AT-002.26** section 6.
- **AT-002.27** exhaust; blocked; roll the day; the next spend succeeds and `remaining === grant − 1`.
- **AT-002.11** vet with every field; the `org_vetted` audit row's `actorAccountId`, `occurredAt`,
  and `detail.legal_name`, `reference_link`, `contact.name`, `contact.title`,
  `contact.authority_attestation`, `evidence.type`, `note` are each the submitted value.
- **AT-002.11b** one request per mandated field with that field absent: refused
  `invalid-vet-record`, tier still `unverified`, zero audit rows, zero events; at integration the
  operator arm of section 3.3.
- **AT-002.29** an NGO admin, a volunteer and a null session each attempt vet and unvet:
  `not-a-platform-admin`, `not-a-platform-admin`, `unauthenticated`; tier unchanged; zero events.
- **AT-002.30** `trustTierValues()` equals `TRUST_TIERS` and has two members;
  `trustTierWriters()` and `vettingRouteProblems()` empty.
- **AT-002.12** vet, then unvet: tier `unverified`, `attemptPublish` refused, `org_unvetted`
  audit row with the note; nothing about funding is read, because no funding exists, and the body
  says so in its evidence rather than asserting on an absence.
- **AT-002.13** after vet and after unvet: exactly one `vetting.outcome` event each, actor the
  admin, payload outcome `vetted` then `unvetted`, two deliveries (email, inapp) to the seat holder,
  every `emittedBy === 'notifications.emitter'`, state `pending`; `strayNotificationWriters()` and
  `providerClientImporters()` from the notifications suite unchanged.
- **AT-002.14** one call, one audit row, tier vetted; `trustTierWriters()` empty.
- **AT-002.16** vet with `emailed_registration_document` and metadata; the audit detail's
  `evidence.document` has exactly the four keys; a second attempt with a `content` key is refused
  `invalid-evidence` and nothing changes.
- **AT-002.17** `evidenceType: 'passport'` and `'national_id'` refused `invalid-evidence`, tier
  unchanged, no audit row.
- **AT-002.18** vet with `website`; `evidence.type === 'website'`, `evidence.document === null`;
  the dashboard and the public page bodies carry no key or string matching
  `/evidence|document|review/i`.
- **AT-002.19, AT-002.20** section 6.
- **AT-002.21** unverified NGO spends within its grant, every spend ok, and `allowanceDecision`
  is never given a tier for any purpose but the grant (the facts type has no other tier use).
- **AT-002.22** `provisionNgo({ emailVerified: false })`; spend refused `email-unverified` with a
  reason matching `/verif/i` and `/email/i`; no spend row.
- **AT-002.28** a fresh NGO; the admin vets; `trustTier === 'vetted'`, `allowance().grant === 30`,
  one `org_vetted` audit row.
- **AT-002.23** a project under a vetted NGO; the public page body's keys equal the auth suite's
  `['ok', 'organizationName', 'projectId', 'projectName']`; no string in the body matches
  `/verified/i`; `trustLabel('vetted') === 'founder-vetted'` and `trustLabel('unverified') === null`.

### 5.7 `tests/at/expected/req-002.json`, exactly

```json
{
  "requirement": "002",
  "tiers": {
    "loop": {
      "green": [
        "AT-002.01", "AT-002.02",
        "AT-002.04", "AT-002.05", "AT-002.06", "AT-002.07", "AT-002.08", "AT-002.27",
        "AT-002.11", "AT-002.11b", "AT-002.29", "AT-002.30", "AT-002.12", "AT-002.13", "AT-002.14",
        "AT-002.16", "AT-002.17", "AT-002.18",
        "AT-002.21", "AT-002.22", "AT-002.28",
        "AT-002.23"
      ],
      "red": {
        "AT-002.10": { "kind": "capability-pending", "capabilities": ["sut.ledger.fundProjectFuel"] },
        "AT-002.31": { "kind": "capability-pending", "capabilities": ["sut.ledger.fundProjectFuel"] },
        "AT-002.26": { "kind": "capability-pending", "capabilities": ["sut.ledger.fundProjectFuel", "sut.discovery.fundedTurn"] },
        "AT-002.19": { "kind": "capability-pending", "capabilities": ["sut.projects.publish"] },
        "AT-002.20": { "kind": "capability-pending", "capabilities": ["sut.projects.publish"] }
      }
    },
    "integration": {
      "green": [
        "AT-002.01", "AT-002.02",
        "AT-002.04", "AT-002.05", "AT-002.06", "AT-002.07", "AT-002.08", "AT-002.27",
        "AT-002.11", "AT-002.11b", "AT-002.29", "AT-002.30", "AT-002.12", "AT-002.13", "AT-002.14",
        "AT-002.16", "AT-002.17", "AT-002.18",
        "AT-002.21", "AT-002.22", "AT-002.28",
        "AT-002.23"
      ],
      "red": {
        "AT-002.10": { "kind": "capability-pending", "capabilities": ["sut.ledger.fundProjectFuel"] },
        "AT-002.31": { "kind": "capability-pending", "capabilities": ["sut.ledger.fundProjectFuel"] },
        "AT-002.26": { "kind": "capability-pending", "capabilities": ["sut.ledger.fundProjectFuel", "sut.discovery.fundedTurn"] },
        "AT-002.19": { "kind": "capability-pending", "capabilities": ["sut.projects.publish"] },
        "AT-002.20": { "kind": "capability-pending", "capabilities": ["sut.projects.publish"] }
      }
    }
  }
}
```

Twenty-two green and five red at each tier, twenty-seven in all, in bijection with the
acceptance file. The two tiers are identical because the integration adapter drives the spend
definer directly, so no allowance id waits on the absent route. Capability names carry no comma
(`expected.ts:142`). During the run, ids whose unit has not landed are declared
`{ "kind": "pending", "phase": "sut-missing" }` and move to `green` in the commit that lands them,
which is the auth suite's ledger discipline (`req-001/_pending.ts`).

---

## 6. The red set

Each red body proves what the tree can prove, then throws `CapabilityPending([...])`, the shape
AT-001.30's default body uses (`req-001/f-lifecycle-and-audit.test.ts:97`).

| id | waits on | why the tree cannot prove it |
|---|---|---|
| AT-002.10 | `sut.ledger.fundProjectFuel` | "routes to the ordinary project-fuel checkout" needs a checkout to route to; the body first asserts no `WRITE_ROUTES` row and no migration names a wallet, credit purchase or Discovery balance, then throws. |
| AT-002.31 | `sut.ledger.fundProjectFuel` | "funding succeeds" at both tiers needs a funding action; none exists. |
| AT-002.26 | `sut.ledger.fundProjectFuel`, `sut.discovery.fundedTurn` | needs a funded project and a turn billed to fuel; the body reproduces the AT-002.05 block, then throws. |
| AT-002.19 | `sut.projects.publish` | "blocked (UI and API)" needs a publish route; the body proves `publishAllowed('unverified')` is false and `attemptPublish` refuses, then throws. |
| AT-002.20 | `sut.projects.publish` | "enters triage" needs the publish flow and the triage state; the body proves `publishAllowed('vetted')` is true, then throws. |

The lead's provisional set stands. One id the brief mentions as a candidate red is not in it:
**AT-002.23** is green. The id's observable exists today, the public project page, and the
listing screens it also names do not exist at all. A red declared on a surface that does not
exist would be a declaration about nothing; a green over every public surface the tree has,
with the label constant proved, is the honest state now. When the listing screens land, the
body's sweep grows; the manifest does not move. If the lead prefers the brief's reading, the
declaration is `{ "kind": "capability-pending", "capabilities": ["ui.public-listing-screens"] }`
at both tiers and the body throws after the page assertions; nothing else in this design changes.

---

## 7. The unit sequence

The order is the founder's. Each unit ends with `bun run typecheck`, `bun run at:check req-002`,
`bun run at:selftest`, and `at:verify req-002` at both tiers with `--expect`, plus `req-001` and
`req-016` at both tiers, because the write-route scan, the tenant scan and the sole-writer scan
all change their answer when this run adds rows and writers.

**Unit 1 — the vet action's audit record (AT-002.11, .11b).** Builds: the two enum migrations,
`trust_tier`, `evidence_type`, the column, `set_organization_vetting` complete with its emit,
`_shared/vetting.ts` (all of it, including `publishAllowed` and `trustLabel`), the route, its
config block, the `WRITE_ROUTES` row, the refusal kinds, the three auth-suite map entries, and
the whole suite skeleton: adapters, bind, contract, every one of the twenty-seven call sites, the
manifest with twenty-five `sut-missing` reds. Proves: every mandated field is recorded; any
absent field commits nothing at both tiers. Depends on: nothing in this run. Carries more than its
two ids on purpose: the definer's emit is in it because a producer that "gets its emit later" in a
replacement migration is a second migration file for no proof, and unit 2 already needs "no
event" to be a real read-back. The suite skeleton is in it because `at:check` runs on every suite
directory from the first commit.

**Unit 2 — only the platform admin vets (AT-002.29, .30).** Builds: `_source-scan.ts` with
`trustTierWriters` and `vettingRouteProblems`. Proves: the gate, the SQL backstop, the closed
enum, the one writer. Depends on unit 1.

**Unit 3 — unvet, funding untouched, outcome via the emitter (AT-002.12, .13, .14).** Builds:
the `NAMED` copy entry, the notification read-backs in both adapters. Proves: the transaction
holds the tier, the audit row and the event together. Depends on unit 1 and the merged emitter.

**Unit 4 — emailed documents, identity documents (AT-002.16, .17, .18).** Builds: nothing new in
product; the evidence checks landed in unit 1. Proves: metadata only, refusals, exact type, no
implied review. Depends on unit 1.

**Unit 5 — profile create (AT-002.01).** Builds: the profile migration, `organization-profile.ts`,
the route, its config block, the row, the `tenant-reads.ts` and `edge.ts` change, the auth-suite
`fixtureReads` edit. Proves: five fields persist and render. Depends on nothing; its map entries
in the auth suite are the same three files unit 1 touched.

**Unit 6 — profile edit by the admin only (AT-002.02).** Builds: nothing new. Proves: the five
fields on the edit path, the three refusals. Depends on unit 5.

**Unit 7 — tier grants and the vet math (AT-002.04, .07, .08).** Builds: the ledger migration,
`discovery-allowance.ts`, the two config keys, `grantPinProblems`, `TENANT_CATALOG` row, the
ledger members of both adapters, the `discovery-message` stand-in spec in the fixture. Proves:
exactly 10, cap 30 at once with `30 − k`, no minting. Depends on unit 1 for the tier.

**Unit 8 — UTC hard reset (AT-002.06).** Builds: `moveLedgerToPreviousDay` in both adapters and
the per-tier body. Proves: reset to the grant from zero, partial and full; no second reset.
Depends on unit 7. This unit lands no product code, because the reset is a property of the row
key unit 7 created; the brief's sentence "the reset needs a controllable clock at the integration
tier" is answered by section 2.6, not by a clock.

**Unit 9 — what vetting never gates (AT-002.21, .22).** Builds: `provisionNgo({ emailVerified:
false })` in the live adapter. Proves: no tier input on the spend path; the email floor at every
tier, with the SQL backstop live. Depends on unit 7.

**Unit 10 — pilot default and the label (AT-002.28, .23).** Builds: `createProjectAsOperator` and
`publicProjectPage` in both adapters. Proves: vet leaves the NGO at 30; no "verified" claim; the
label. Depends on units 1 and 7.

**Unit 11 — zero-credit block and the remedies (AT-002.05, .26, .27).** Builds:
`DISCOVERY_BLOCK_REMEDIES` wording is already in unit 7; this unit lands the bodies. Proves: the
block names vet, fund and wait; the day rollover restores; the fuel remedy is red. Depends on
units 7 and 8.

**Unit 12 — no Discovery wallet (AT-002.10, .31).** Builds: the two red bodies with their absence
checks. Depends on unit 7.

**Unit 13 — publish gates (AT-002.19, .20).** Builds: `attemptPublish` in both adapters and the
two red bodies. Depends on unit 1 (`publishAllowed`). Its product content moved to unit 1 because
units 3 and 7 already read "cannot publish"; the founder's order is kept and this unit is the
proof, not the code.

No unit's order fights a dependency. The one thing the order costs is stated: units 1 and 5 each
touch the auth suite's three exhaustive files, and the same lines would be one edit if the two
routes landed together. Two small edits is the price of vetting first, and it is small.

---

## 8. Rationale

### Considered and rejected

**A stored balance with a reset writer.** `organizations.discovery_credits_remaining` plus
`allowance_reset_on date`, decremented on spend and refilled when the stored day is behind
today. Rejected: it needs a "has today's reset run" branch on every read and write, the vet raise
becomes arithmetic on a stored number (`remaining += 20`, which is exactly what a re-vet must not
do twice), and the no-rollover rule becomes an assignment somebody could get wrong. The spend
row removes all three.

**A grant stored on the day row.** `discovery_spend (org_id, utc_day, grant, spent)`, with the
vet updating today's `grant` to 30. Rejected: the vet then writes the ledger, the unvet has to
decide what to do to `grant`, and a re-vet after an unvet is an update that could stack if
written as `grant + 20`. Computing the grant from the tier at read time makes the vet write one
column and nothing else. The cost is that a re-tune of 10 or 30 changes every organisation's
balance at once, which is what a tier grant means.

**A `org_trust` one-to-one table.** The escalation-contact precedent. Rejected: the tier is one
enum, the audit row already holds who and when, and a table would need its own posture, catalog
row and policies for one column the organisation row can carry under policies that exist.

**A separate audit table for the vet record.** Rejected: `append_audit_event` is the sole writer
of the append-only log, `scanAuditAppendOnly` guards that table only, and a second table would
have to duplicate the triggers, the revoke and the scan. The `detail` jsonb carries the record,
as the escalation contact's does.

**Two routes, `vet-organization` and `unvet-organization`.** Rejected: two rows in the inventory
and six map entries in the auth suite for what is one column with two values. One route, one
definer, `p_vetted boolean`, two audit kinds.

**Building the write set in SQL only.** Rejected because the definer would restate the class
default channels and the copy. **Building it in TypeScript only** (a `WriteSet` passed as an
argument). Rejected because `decide` is pure and cannot know the seat holder's address, and
extending `write_standing` with an email touches every route's standing parser. The split in
section 3.4 keeps taxonomy facts in TypeScript and directory facts in SQL.

**Composing the req-002 fixture over the auth suite's `createFixtureAdapter`.** Tempting: sessions,
verification and signup mirrors for free. Rejected: the organisation's `name` would then live in
two stores, the auth suite's and an overlay, and the profile write could not keep both. A
standalone fixture with operator-style Givens is about two hundred lines and has one store.

**A `publish-project` stand-in row.** Rejected in section 4.2. The decision ships; the row does not.

**Extending the public project page with the trust label.** Rejected: `PUBLIC_PAGE_KEYS` in the
auth suite is a closed four-key set asserted by three of its ids, and the requirement says the
flag "may" show, not must. The label constant is shipped for the surface that will show it.

**Declaring AT-002.23 red.** Section 6.

### The weakest point

The day boundary is never crossed on the live stack. Section 2.6's operator re-key produces the
bytes the product would hold after midnight, and the product's own key derivation is exercised
for "today" on every call, but the transition from one key to the next is inferred from the
structure, not observed. What would break it: a product key computed from a session time zone
rather than UTC. That would pass every integration body except the one extra assertion that
compares the product's `utc_day` with the test process's UTC date, which catches it on any
machine whose zone is not UTC at any time but the seconds around midnight. On a UTC machine at
build time, the defect would be invisible until a user in another zone met it. The mitigation is
in the migration text: the key is written once, as `(now() at time zone 'utc')::date`, in two
functions, and a reviewer can read it.

The second-weakest point, named so nobody has to find it: `p_notice` lets the edge choose the
channels and the wording of the notification. A route that passed `channels: []` would vet an
organisation with an event and no deliveries. Today the only caller is the shipped route, which
computes `p_notice` from the taxonomy; the definer could refuse an empty channels array, and the
builder should add that one check.
