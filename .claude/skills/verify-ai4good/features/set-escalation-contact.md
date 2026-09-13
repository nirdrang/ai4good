# Set escalation contact (admin-only upsert)

A platform administrator records a non-login escalation contact for an organization: a name, an
email address and an optional phone. One row per organization; a second call replaces it. Each
call writes an audit row that holds the previous contact and the current one.

## Sub-features

- Platform-admin caller: 200 `{ok: true, organizationId}`. One `org_escalation_contacts` row
  (`org_id` primary key, `contact_name`, `contact_email`, `contact_phone`,
  `recorded_by_account_id`, `recorded_at`).
- Upsert: a second call for the same organization updates the row; `recorded_at` is now and
  `recorded_by_account_id` is the caller.
- Audit: one `audit_events` row per call, `event_kind` = `org_escalation_contact_recorded`,
  `actor_label` = `platform_admin:<admin account id>`. On that row `subject_account_id` is
  null, `subject_org_id` = the organization, reason `escalation contact recorded`, `detail`
  `{"previous": null | {name, email, phone}, "current": {name, email, phone}}`. An identical
  re-record still writes a row.
- Fields are trimmed. A blank or missing `phone` is stored as null and appears as null in
  `detail.current.phone`.
- Refusals decided at the edge, all `{ok: false, kind, reason}`. 400 `invalid-request` for a
  missing `organizationId` or one that is not a uuid. 400 `invalid-contact` for a missing
  name. 400 `invalid-contact` for an email that does not match `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
  409 `no-such-organisation`. From the gate: 502 `refused`. 403 `account-deactivated`. 409
  `no-account`. 403 `not-a-platform-admin`.
- The table repeats the shape rules as constraints (`org_escalation_contacts_populated`,
  `org_escalation_contacts_email_shape`) and the definer repeats the refusals in `DETAIL`. The
  edge refuses first, so those branches are not reachable through the function.

## How to get to it (user POV)

A platform administrator records who to call about an organization when its login contact is
unreachable. The API is the `set-escalation-contact` edge function.

## Driving it with the HTTP harness

`POST {API}/functions/v1/set-escalation-contact`, headers `Authorization: Bearer
<access_token>` and `apikey: <ANON_KEY>`, body `{"organizationId": "<uuid>", "name":
"<text>", "email": "<address>", "phone": "<text>"}` (`phone` optional).

- As the administrator, first record for the NGO drive's organization: expect 200;
  `detail.previous` null.
- Second record with a different name: expect 200; `detail.previous` equals the first
  contact.
- Without `email`: expect 400 `invalid-contact`; no row written.
- With a random uuid as `organizationId`: expect 409 `no-such-organisation`.
- As the NGO user: expect 403 `not-a-platform-admin`.

## What proves it

The response pairs, plus the rows over `DB_URL`:

```sql
select org_id, contact_name, contact_email, contact_phone, recorded_by_account_id, recorded_at
  from public.org_escalation_contacts where org_id = '<org>';
select occurred_at, actor_label, subject_account_id, reason, detail
  from public.audit_events
 where event_kind = 'org_escalation_contact_recorded' and subject_org_id = '<org>'
 order by occurred_at, id;
```

Expect one contact row and as many audit rows as successful calls. The second row's
`detail.previous` equals the first row's `detail.current`.

## Gotchas

- `org_escalation_contacts` and `audit_events` hold no grant for any API key. Read them over
  `DB_URL` only.
- The response does not echo the contact; `render` maps `organization_id` only. Read the row
  for the stored values.
- The audit kind arrived in migration `20260912110000` and the definer that writes it in
  `20260912120000`. A stale function mount (see Doctor in `SKILL.md`) still upserts but writes
  no audit row.
