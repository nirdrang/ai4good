# NGO signup completion

An authenticated person turns their auth user into an NGO account: one call creates the
account row, the organization, the `admin` membership, and the ToS + Platform Promise
acknowledgment with the signer's identity — all in one transaction.

## Sub-features

- The happy path above.
- Refusals, each naming its own field: missing organization name, missing acknowledgment
  version, missing signer name/title, an attestation that is not the shipped statement,
  `platform_admin` as the requested type.

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

Readback directly from Postgres over `DB_URL` (not REST — see the SKILL's Drive section):
`accounts` shows `account_type=ngo` for the user id; `organizations` shows the row by name;
`org_memberships` shows the `admin` membership joining the two; `acknowledgments` shows one
row carrying the version, the signer name, title, and the attested statement.

The shipped helper `scripts/drive-ngo-signup.ts` runs this whole feature end to end.

## What proves it

The 200 response AND the four rows, read back after the call. Every row or none — a partial
write is a failed proof.

## Gotchas

- A second completion for the same user is refused (the type is set once). Fresh drive, fresh
  user.
- 401 with a valid-looking token usually means the `apikey` header is missing — the gateway
  wants both.
