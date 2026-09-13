# Update organization (admin-only rename)

The admin-only NGO-side action: rename an organization. One field, one write. It exists so
the same account can attempt an action against two organizations and get two different
answers. The admin in A succeeds; the member in B is rejected. The five-field profile write,
which also sets `name`, is a separate route on purpose: see set-organization-profile.md.

## Sub-features

- Admin caller renames their organization. The 200 body is `{ok: true, organizationId, name}`.
  The rename writes zero audit rows: the audit trigger sits on `org_memberships` only, and
  `update_organization` calls no audit writer.
- A member (non-admin) is rejected; the refusal carries `kind` = `not-an-admin`.
- A non-member is rejected; `kind` = `not-a-member`. The two are distinguishable on
  the wire by `kind`, not by parsing English.
- Refusals, with status and `kind`, in order. The write gate runs first. It answers 502
  `refused` for unreadable standing. It answers 403 `account-deactivated`. It answers 409
  `no-account`. It answers 403 `not-an-ngo-account`, so `not-a-member` is only ever answered to
  an NGO-typed caller. Then 400 `invalid-request` for a missing or blank `organizationId`. Then
  403 `not-a-member` or `not-an-admin`. Then 400 `invalid-name` for a missing or blank `name`.
  A non-uuid `organizationId` is 400 `invalid-request` from the id shape check, before the
  standing read.

## How to get to it (user POV)

A signed-in NGO admin renames their organization. The API is the `update-organization` edge
function.

## Driving it with the HTTP harness

`POST {API}/functions/v1/update-organization`, headers `Authorization: Bearer
<access_token>` and `apikey: <ANON_KEY>`, body
`{"organizationId": "<uuid>", "name": "<new name>"}`.

- As the org's admin (the NGO drive's user): expect 200; readback of `organizations` by id
  over `DB_URL` shows the new name.
- Against an organization the caller is not in: expect 403 `not-a-member`. A well-formed id
  that no organization carries answers the same. The decision reads the caller's role in the
  target and never whether the target exists. So the SQL `no-such-organisation` backstop is not
  reachable through the edge.
- With `"organizationId": "not-a-uuid"`: 400 `invalid-request`, "the organisation id
  \"not-a-uuid\" is not a well-formed id".

Readback over `DB_URL`:

```sql
select id, name from public.organizations where id = '<organizationId>';
select count(*) from public.audit_events where subject_org_id = '<organizationId>';
```

The audit count is the same before and after a rename.

## What proves it

The response pair, plus the renamed row for success and the unchanged row for the refusals.
Assert the `kind` field on refusals, not the sentence.

## Gotchas

- The member-in-B case needs a membership row with role `member`. No product surface writes
  that role. The unique index `org_memberships_one_seat_per_org_idx` (one membership row per
  organization) leaves no room for a member beside the admin. So `not-an-admin` is
  unreachable through the product. Drive the not-a-member case instead and say which case ran.
- Send the organization id from your own drive's readback — ids from an earlier reset are
  gone.
