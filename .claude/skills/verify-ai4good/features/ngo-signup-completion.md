# NGO signup completion

An authenticated person turns their auth user into an NGO account. One call creates the
account row, the organization, the `admin` membership, and the ToS + Platform Promise
acknowledgment with the signer's identity. All of it lands in one transaction. The membership
insert also fires one audit row (`org_role_changed`, reason `membership granted`, actor label
`ngo:<user id>`), so five rows land together.

## Sub-features

- The happy path above. The 200 body is `{ok: true, accountId, accountType: "ngo",
  organizationId}`.
- Refusals, each naming its own field, all 400 with `kind` = `invalid-request`. A missing or
  unknown account type is refused. `platform_admin` as the requested type is refused. A missing
  organization name is refused. An organization name on a volunteer request is refused. A
  missing acknowledgment version is refused. A missing signer name or title is refused. A blank
  attestation is refused. An attestation that is not the shipped statement is refused.
- The lifecycle gate runs before the decision. It answers 502 `refused` when the caller's
  standing cannot be read ("no decision was made"). It answers 403 `account-deactivated` for a
  deactivated account, judged before anything else.
- A second completion for the same user: 409 `refused`. The database raises the
  already-completed refusal with no DETAIL, so the kind is the generic one.

## How to get to it (user POV)

After signing in (see email-signup-and-confirmation), the user completes signup. The API the
future screen calls is the `complete-signup` edge function.

## Driving it with the HTTP harness

`POST {API}/functions/v1/complete-signup`, headers `Authorization: Bearer <user access_token>`
and `apikey: <ANON_KEY>`, JSON body:

```json
{
  "accountType": "ngo",
  "organizationName": "<unique name>",
  "acknowledgmentTextVersion": "tos-platform-promise-v1",
  "signerName": "<person>",
  "signerTitle": "<title>",
  "authorityAttestation": "<ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement, word for word>"
}
```

The attestation must equal the shipped constant in
`supabase/functions/_shared/acknowledgment-copy.ts` exactly — import it. Any other string is
refused with the not-matching reason.

Refusal shapes. A decision refusal is `{ok: false, kind: "invalid-request", reason}` with 400.
Before the decision, the transport answers without a `kind`. It answers 405 for a method that
is not POST. It answers 401 for a missing or rejected bearer. It answers 400 for a body that is
not a JSON object. The gate answers 502 `{kind: "refused"}` when `write_standing` cannot be
read. It answers 403 `{kind: "account-deactivated"}` for a deactivated caller. A repeat
completion answers 409 `{kind: "refused"}` with the sentence "this account has already
completed signup".

Readback directly from Postgres over `DB_URL` (not REST — see the SKILL's Drive section).
`accounts` shows `account_type=ngo` for the user id. `organizations` shows the row by name.
`org_memberships` shows the `admin` membership joining the two. `acknowledgments` shows one
row carrying the version, the signer name, title, the attested statement, and `ip`. The `ip` is
the first `x-forwarded-for` entry when it is a well-formed address, else null. `audit_events`
shows one `org_role_changed` row for the organization.

```sql
select a.account_type, o.name, m.role,
       k.text_version, k.signer_name, k.signer_title, k.authority_attestation, k.ip,
       e.event_kind, e.reason, e.actor_label
  from public.accounts a
  join public.org_memberships m on m.account_id = a.id
  join public.organizations o on o.id = m.org_id
  join public.acknowledgments k on k.account_id = a.id
  join public.audit_events e on e.subject_org_id = o.id and e.event_kind = 'org_role_changed'
 where a.id = '<user id>';
```

Expect exactly one row, with `reason = 'membership granted'` and `actor_label = 'ngo:<user
id>'`. `audit_events` revokes every privilege from `service_role`; `DB_URL` is the only read.

The shipped helper `scripts/drive-ngo-signup.ts` runs the happy path end to end. It checks the
account type, the organization name, the `admin` role and the acknowledgment's `text_version`
only. It does NOT check the signer fields, the `ip`, or the audit row, and it drives no refusal.

## What proves it

The 200 response AND the five rows, read back after the call. Every row or none — a partial
write is a failed proof.

## Gotchas

- A second completion for the same user is refused 409 `refused` (the type is set once). Fresh
  drive, fresh user. To drive it: run steps 1 to 4 of the signup path, complete once, then send
  the same body again.
- 401 with a valid-looking token usually means the `apikey` header is missing — the gateway
  wants both.
- The 403 `account-deactivated` arm needs a platform administrator to deactivate the account
  first (`set-account-lifecycle`, see [set-account-lifecycle.md](set-account-lifecycle.md)). Say so when it did not run.
