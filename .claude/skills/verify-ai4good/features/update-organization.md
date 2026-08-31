# Update organization (admin-only rename)

The admin-only NGO-side action: rename an organization. One field, one write — it exists so
the same account can attempt an action against two organizations and get two different
answers (admin in A succeeds, member in B is rejected).

## Sub-features

- Admin caller renames their organization.
- A member (non-admin) is rejected; the refusal carries `kind` = the not-an-admin reason.
- A non-member is rejected; `kind` = the not-a-member reason. The two are distinguishable on
  the wire by `kind`, not by parsing English.

## How to get to it (user POV)

A signed-in NGO admin renames their organization. The API is the `update-organization` edge
function.

## Driving it with the HTTP harness

`POST {API}/functions/v1/update-organization`, headers `Authorization: Bearer
<access_token>` and `apikey: <ANON_KEY>`, body
`{"organizationId": "<uuid>", "name": "<new name>"}`.

- As the org's admin (the NGO drive's user): expect 200; readback of `organizations` by id
  over `DB_URL` shows the new name.
- Against an organization the caller is not in: expect the not-a-member refusal with its
  `kind`.

## What proves it

The response pair, plus the renamed row for success and the unchanged row for the refusals.
Assert the `kind` field on refusals, not the sentence.

## Gotchas

- The member-in-B case needs a second account seated as `member`, which no public surface
  creates yet; drive the not-a-member case instead and say which case ran.
- Send the organization id from your own drive's readback — ids from an earlier reset are
  gone.
