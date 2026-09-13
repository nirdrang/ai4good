# Create organization (NGO-only action)

An NGO account creates an additional organization. A volunteer attempting it is rejected with
the reason stated — this function exists as the application boundary that acceptance
criterion drives.

## Sub-features

- NGO caller: organization created, caller becomes its `admin` member. The membership insert
  fires one `audit_events` row (`org_role_changed`, reason `membership granted`, actor label
  `ngo:<user id>`).
- Volunteer caller (or a platform administrator): 403 `not-an-ngo-account`, reason names the
  NGO-only rule.
- Caller with no completed signup: 409 `no-account`, "complete signup before this action — the
  caller holds no account yet".
- Deactivated caller: 403 `account-deactivated`, judged before type and before presence, so a
  deactivated caller is told that and nothing else.
- Unreadable standing: 502 `refused`, "the caller's standing could not be read, so no decision
  was made", not "complete signup".
- Missing or blank `name`: 400 `invalid-name`.
- A refused call writes nothing: no organization, no membership, no audit row.

## How to get to it (user POV)

A signed-in, completed NGO user creates an organization. The API is the
`create-organization` edge function.

## Driving it with the HTTP harness

`POST {API}/functions/v1/create-organization`, headers `Authorization: Bearer
<access_token>` and `apikey: <ANON_KEY>`, body `{"name": "<unique name>"}`.

- As the NGO user from the NGO drive: expect 200 `{ok: true, organizationId}`. Readback shows
  the `organizations` row. It shows an `admin` row in `org_memberships`. It shows one
  `org_role_changed` row in `audit_events` with `subject_org_id` = the new id.
- As a volunteer (or a user who never completed signup): expect the refusal with its `kind`
  (`not-an-ngo-account` 403, `no-account` 409). Both come from the edge write gate, which reads
  `write_standing` before the decision. The SQL backstops for the same two cases are not
  reachable through the edge.

Readback over `DB_URL`:

```sql
select o.id, o.name, m.role, e.reason, e.actor_label
  from public.organizations o
  join public.org_memberships m on m.org_id = o.id
  left join public.audit_events e on e.subject_org_id = o.id and e.event_kind = 'org_role_changed'
 where o.id = '<organizationId>';
```

For a refusal, count `audit_events` rows for the caller's account before and after:

```sql
select count(*) from public.audit_events where actor_account_id = '<user id>';
```

## What proves it

The response pair plus the rows (or their absence, for the refusal cases). Assert `kind` on a
refusal, not the sentence. The audit count is unchanged by a refusal.

## Gotchas

- The volunteer refusal needs a volunteer account, whose creation needs the GitHub gate —
  see volunteer-signup-github-gate.md. The "no completed signup" refusal is drivable with
  any fresh confirmed user and costs nothing.
