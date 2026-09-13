# Set organization profile (all five fields, one write)

An NGO admin fills in the organization's profile: name, mission, country, website and logo.
Signup created the organization with a name only; this is the first completion and every later
edit. All five fields travel in one request and one database write, so a profile is never half
written. It overlaps `update-organization` on `name` on purpose (`write-routes.ts` lists both
routes; the profile migration says `update_organization` is unchanged). The rename stays a
one-field action; the profile is the five-field door. See update-organization.md.

## Sub-features

- Admin caller writes all five fields; the 200 body echoes the five trimmed values.
- All-or-nothing: one missing or blank field refuses the whole request, and the row keeps every
  old value. `name` refuses as `invalid-name`; `mission`, `country`, `website` and `logo` refuse
  as `invalid-request`, each naming its field.
- A caller with no membership in the target organization is refused `not-a-member` (403). A
  `member` seat would be refused `not-an-admin` (403), but no product path writes that role.

## How to get to it (user POV)

A signed-in, completed NGO admin edits the organization profile. The API is the
`set-organization-profile` edge function.

## Driving it with the HTTP harness

`POST {API}/functions/v1/set-organization-profile`, headers `Authorization: Bearer
<access_token>` and `apikey: <ANON_KEY>`, body
`{"organizationId": "<uuid>", "name", "mission", "country", "website", "logo"}` — five
non-empty strings. The shared module trims each value and refuses an all-whitespace one.

- As the org's admin: expect 200 `{ok: true, organizationId, name, mission, country, website,
  logo}` with the trimmed values.
- With one field blank or missing: expect 400. `kind` is `invalid-name` for `name`, and
  `invalid-request` for any of the other four ("an organisation needs a non-empty mission").
- Against an organization the caller is not in, including a well-formed id that no longer
  exists: expect 403 `not-a-member`. The decision reads the caller's role in the target only. It
  never reads whether the organization exists. So the SQL `no-such-organisation` (409) backstop
  is not reachable through the edge.
- With a non-uuid `organizationId`: 400 `invalid-request` from the id shape check, before any
  standing read. With `organizationId` missing or blank: 400 `invalid-request` from the
  decision.
- The write gate runs first and its refusals come before all of the above. It answers 502
  `refused` when the caller's standing cannot be read. It answers 403 `account-deactivated`. It
  answers 409 `no-account`. It answers 403 `not-an-ngo-account`.

Every refusal is `{ok: false, kind, reason}`. Transport refusals (405 not POST, 401 no bearer,
400 malformed JSON) carry `reason` and no `kind`.

Readback over `DB_URL`:

```sql
select id, name, mission, country, website, logo
  from public.organizations where id = '<organizationId>';
```

The shipped drive `scripts/drive-vetting.ts` runs the happy path (step 2: the write, then the
five-column readback). It does NOT drive the all-or-nothing refusal, `not-a-member`, or
`not-an-admin`.

## What proves it

The 200 response pair and the row carrying all five driven values. For the refusal, the 4xx
pair and the row unchanged — including `name`, which the refused request also carried.

## Gotchas

- The four new columns are nullable; a signup-created row has `null` in them until this write.
  A `CHECK` on each column refuses an empty string when a value is present.
- `mission`, `country`, `website` and `logo` are unconstrained text beyond non-emptiness. No
  URL check on `website` or `logo`; do not assert one.
- `not-an-admin` needs a membership row with role `member`. No product surface writes it, and
  the one-seat index leaves no room for a second member beside the admin. Drive `not-a-member`
  and say which case ran.
