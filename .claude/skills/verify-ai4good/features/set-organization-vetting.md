# Set organization vetting (platform admin vet and unvet)

A platform administrator records that an organization is founder-vetted, or revokes it. A vet
carries the mandated audit fields. Those are the organization's legal or display name, a public
reference link, and the contact's name and title. They also include the contact's authority
attestation, one of four evidence types, and a note. The actor and the time are never request
fields; the database records them.
The write lands the vetting row, an audit row, and a notification for the organization's seat
holder, in one transaction. Vetting raises the daily Discovery grant (see
discovery-allowance.md).

## Sub-features

- Vet: 200 `{ok, organizationId, vetted: true, changed: true, notificationEventId}`. Writes
  `org_vetting`, one `audit_events` row (`org_vetting_changed`), one `notification_events` row
  (`vetting.outcome`) and two `notification_deliveries` rows (`email`, `inapp`), both `pending`.
- Unvet: same shape with `vetted: false`; the mandated fields stay on the row. Unvet takes
  `organizationId`, `action` and `note` only. An unvet on an organization that is not vetted is
  a no-op: 200 `changed: false`, `notificationEventId: null`, and no rows written.
- Evidence types: `public_registry`, `organization_website`, `ein`,
  `emailed_registration_documents`. Anything else, an identity document included, is refused
  `invalid-evidence` (400): `evidence type "<value>" is not an accepted v1 evidence type`.
- The emailed-documents arm: `evidenceType: "emailed_registration_documents"` requires
  `registrationReceivedAt` (ISO instant), `registrationDocumentCount` (positive integer) and
  `registrationCopiesDeleted: true`; otherwise 400 `invalid-evidence`. Any of the three on
  another evidence type is refused 400 `invalid-evidence` ("registration document metadata is
  recorded only for emailed registration documents"). Only metadata is stored, never a document.
- Admin-only: an NGO or volunteer caller is refused 403 `not-a-platform-admin` by the write gate,
  with a reason that names platform administrators.
- Nothing is delivered. No worker function is deployed (the fourteen functions under
  `supabase/functions/` include none). So the two deliveries stay `pending` and no vetting email
  reaches Mailpit.
- The grant high-water mark: a vet writes today's `discovery_spend` row with `granted = 30`
  (`greatest` of the stored value and the new tier). An unvet the same UTC day keeps 30 — the
  mark takes the higher of the tier before and after the action.

## How to get to it (user POV)

The founder, signed in as a platform administrator, records the vetting decision. The API is the
`set-organization-vetting` edge function. There is no public signup for a platform
administrator. An auth user is minted with the admin API (`POST /auth/v1/admin/users`, service
role, `email_confirm: true`). Its `accounts` row is inserted over `DB_URL` with
`account_type = 'platform_admin'`. This is the one place a drive writes the database directly,
and the shipped drive does exactly that (step 4).

## Driving it with the HTTP harness

`POST {API}/functions/v1/set-organization-vetting`, headers `Authorization: Bearer
<admin access_token>` and `apikey: <ANON_KEY>`.

Vet body: `{"organizationId", "action": "vet", "organizationName", "publicReferenceUrl",
"contactName", "contactTitle", "authorityAttestation", "evidenceType", "note"}`, plus the three
`registration*` fields on the emailed arm only. `publicReferenceUrl` must match
`^https?://\S+$`. Unvet body: `{"organizationId", "action": "unvet", "note"}`.

Refusals, in decision order after the write gate (502 `refused` unreadable standing, 403
`account-deactivated`, 409 `no-account`, 403 `not-a-platform-admin`):

- 400 `invalid-request` for an `organizationId` missing or blank. 400 `invalid-request` for a
  non-uuid id (from the shape check before the standing read). 400 `invalid-request` for an
  `action` not `vet` or `unvet`. 400 `invalid-request` for any key outside the action's list
  ("the vetting action does not accept <keys> — actor, time and document content are not
  request fields"). 400 `invalid-request` for a missing `note`.
- 409 `no-such-organisation`: a well-formed id no organization carries.
- 400 `invalid-request`, on a vet, for each missing mandated field, named. 400
  `invalid-request` for a reference link that is not http or https.
- 400 `invalid-evidence` for an unlisted evidence type. 400 `invalid-evidence` for the emailed
  arm without its metadata or with a non-positive count. 400 `invalid-evidence` for metadata on
  a non-emailed type.
- 409 `refused` from the database when the organization has no seat holder, more than one, or a
  seat holder with no email address. None is reachable on a signup-created organization.

Readback over `DB_URL`:

```sql
select org_id, vetted, vetted_by_account_id, vetted_at, organization_name, public_reference_url,
       contact_name, contact_title, evidence_type, note,
       registration_received_at, registration_document_count, registration_copies_deleted
  from public.org_vetting where org_id = '<organizationId>';

select id, event_kind, actor_account_id, actor_label, subject_org_id, reason,
       detail->>'action' as action, detail->'current'->>'vetted' as vetted
  from public.audit_events
 where event_kind = 'org_vetting_changed' and subject_org_id = '<organizationId>'
 order by occurred_at;

select id, event, actor_account_id, state, attempts
  from public.notification_events where id = '<notificationEventId>';

select channel, state, recipient_id, recipient_address, subject, emitted_by
  from public.notification_deliveries where event_id = '<notificationEventId>';

select utc_day, spent, granted from public.discovery_spend where org_id = '<organizationId>';
```

Expect `audit_events.actor_label = 'platform_admin:<admin id>'` and `reason` equal to the
note. Expect two `notification_deliveries` rows, channels `email` and `inapp`, both `state =
'pending'`, `emitted_by = 'notifications.emitter'`. The email row's `recipient_address` is the
seat holder's address. The subject is "Your organisation is founder-vetted" on a vet and "Your
organisation is no longer founder-vetted" on an unvet.

Mailpit: `GET /api/v1/search?query=to:<ngo address>` holds the signup confirmation only.

The shipped drive `scripts/drive-vetting.ts` covers NGO signup, profile, allowance read and
debit, and admin provisioning. It covers vet with `public_registry`, the vetted read (30), and
unvet. It covers three refusals (`not-a-platform-admin`, `debit-exceeds-remaining`,
`daily-allowance-exhausted`). It does NOT cover the emailed-documents arm, the
identity-document (`invalid-evidence`) refusal, the idempotent second unvet, or
`no-such-organisation`. It does NOT cover the delivery channels and `pending` state exactly (it
asserts at least one delivery row).

## What proves it

The 200 pair. The `org_vetting` row with `vetted_by_account_id` equal to the admin and the
driven fields. The audit row with the note as `reason`. The event row and its two pending
deliveries. The `discovery_spend` mark. For an unvet, a second audit row and a second event
id. For a refusal, the 4xx pair, `kind`, and no new row in any of the five tables.

## Gotchas

- Every vet is an upsert on `org_vetting`; a second vet overwrites the fields and writes a new
  audit row and a new notification. Only an unvet of an unvetted organization is a no-op.
- `org_vetting`, `audit_events`, `notification_events` and `notification_deliveries` revoke
  every privilege from `service_role`. Read them over `DB_URL`, never over REST with the
  service-role key. (`notification_deliveries` grants a signed-in recipient SELECT on its own
  `inapp` rows by policy; the drive does not use that path.)
- The audit `detail.current` copies the whole vetting row; `authority_attestation` is inside it.
- The seat holder's email is `auth.users.email`; the definer refuses when it is blank. A
  signup-created NGO always has one.
