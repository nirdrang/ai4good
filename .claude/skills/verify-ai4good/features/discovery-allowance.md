# Discovery allowance (read and debit daily credits)

An NGO admin's organization holds a daily grant of Discovery credits: 10 while unverified, 30
once founder-vetted. The Discovery agent reads the remaining credits before a turn and debits
them after one. The day is the UTC calendar day, taken after the organization row is locked.
`remaining` is never stored; it is `granted − spent`. The route creates no conversation and no
agent turn — it is the ledger only.

## Sub-features

- Read: 200 `{ok, organizationId, utcDay, vetted, dailyGrant, spentToday, remaining}` with no
  write when no row exists yet for the day.
- Debit: the same shape after `spent` grows by `credits`. The first debit of a day writes the
  `discovery_spend` row with `granted` set from the current tier.
- `dailyGrant` is the high-water mark for the day: a vet raises today's row to 30, and an unvet
  the same day leaves it at 30 (see set-organization-vetting.md).
- Three database refusals, all 409, each with its pinned sentence:
  - `daily-allowance-exhausted` when `remaining <= 0`: "discovery_allowance refuses: organisation
    <id> has no Discovery credits left today — get vetted (daily grant becomes 30), fund project
    fuel to continue now, or wait for the next UTC day". The three remedies are get vetted, fund
    project fuel, wait for the next UTC day. For a vetted organization the get-vetted clause is
    dropped and two remedies remain.
  - `debit-exceeds-remaining` when `credits > remaining`: "discovery_allowance refuses:
    organisation <id> still has <remaining> Discovery credits remaining today — this debit is
    larger than what remains".
  - `email-unverified` on a debit when `auth.users.email_confirmed_at` is null for the caller:
    "discovery_allowance refuses <account id>: the caller's email address is not verified". A read
    never checks it.
- Admin-only within the organization: 403 `not-a-member` for a caller with no seat there.

## How to get to it (user POV)

Discovery calls this on the NGO admin's behalf, once per turn. The API is the
`discovery-allowance` edge function, called with the NGO admin's token.

## Driving it with the HTTP harness

`POST {API}/functions/v1/discovery-allowance`, headers `Authorization: Bearer <ngo
access_token>` and `apikey: <ANON_KEY>`, body `{"organizationId": "<uuid>", "action": "read"}`
or `{"organizationId", "action": "debit", "credits": <positive integer>}`.

Refusals, in decision order after the write gate (502 `refused` unreadable standing, 403
`account-deactivated`, 409 `no-account`, 403 `not-an-ngo-account`):

- 400 `invalid-request` for an `organizationId` missing or blank. 400 `invalid-request` for a
  non-uuid id (shape check before the standing read). 400 `invalid-request` for an `action` not
  `read` or `debit`. 400 `invalid-request` for a read that carries `credits`.
- 409 `no-such-organisation`: a well-formed id no organization carries.
- 403 `not-a-member` (no seat in the target) or `not-an-admin` (a `member` seat, which no product
  path writes).
- 400 `invalid-credit-amount`: a debit whose `credits` is missing, not an integer, zero or
  negative.
- 409 `email-unverified`, `daily-allowance-exhausted`, `debit-exceeds-remaining` from the
  database, checked in that order. Exhausted is judged before exceeds. With `remaining = 0` any
  debit is exhausted. With `remaining > 0` an oversize debit is exceeds.

Sequence for a fresh organization. Read → `dailyGrant 10, spentToday 0, remaining 10`. Debit 1
→ `remaining 9`. Debit `remaining + 1` → 409 `debit-exceeds-remaining`. Debit `remaining` →
`remaining 0`. Debit 1 → 409 `daily-allowance-exhausted` naming three remedies. After a vet:
read → `vetted true, dailyGrant 30`.

Readback over `DB_URL`:

```sql
select org_id, utc_day::text, spent, granted, granted - spent as remaining
  from public.discovery_spend where org_id = '<organizationId>';
```

The shipped drive `scripts/drive-vetting.ts` covers the read (10) and a debit of 1 with the row
readback (`spent 1, granted 10`). It covers the vetted read (30), `debit-exceeds-remaining`, the
drain to 0, and `daily-allowance-exhausted` with its three remedies. It does NOT cover
`email-unverified`. That one is unreachable through the surface: sign-in needs a confirmed
address, so only an operator `update auth.users set email_confirmed_at = null` reaches it. It
does NOT cover the vetted two-remedy sentence, `invalid-credit-amount`, `not-a-member`, or the
UTC day rollover.

## What proves it

Each response pair and the `discovery_spend` row after each debit, with `remaining` in the body
equal to `granted − spent` in the row. The edge re-checks that equality and answers 502 when the
database's `remaining` disagrees. For the refusals, `kind` plus the row unchanged.

## Gotchas

- The day is `(clock_timestamp() at time zone 'utc')::date`. A drive that crosses 00:00 UTC
  starts a new row with a fresh grant; the old row stays. Check `utcDay` in the body.
- A read on a day with no row shows the current tier's grant; a read after a vet shows the
  greater of the stored mark and the tier. A downgrade never lowers today's `granted`.
- `discovery_spend` revokes every privilege from `service_role`; read it over `DB_URL`.
- `credits` must be a JSON number that is an integer; a numeric string is `invalid-credit-amount`.
