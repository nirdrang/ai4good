# Transfer organization contact (admin-only seat repoint)

A platform administrator moves an organization's single contact seat from one NGO account to
another, with a reason. When the outgoing account keeps no seat anywhere, the platform
deactivates it in the same transaction. Every transfer writes audit rows that name the
administrator, the two accounts, the organization and the reason.

## Sub-features

- Platform-admin caller: 200 `{ok: true, organizationId}`. The organization's one
  `org_memberships` row now names `toAccountId`, with the role unchanged.
- Auto-deactivation: when the outgoing account holds no other seat, `accounts.lifecycle`
  becomes `deactivated`. When it holds a seat elsewhere, it stays `active`.
- Audit rows, in this order, each with `actor_label` = `platform_admin:<admin account id>`:
  1. `org_role_changed`, reason `seat repointed`, from the membership trigger. `detail` holds
     `old_account_id`, `new_account_id`, and `old_role` and `new_role` both `admin`.
  2. `account_lifecycle_changed`, reason = the transfer's reason, `detail`
     `{"from": "active", "to": "deactivated"}`. Only when the transfer deactivated.
  3. `org_contact_transferred`, reason = the transfer's reason, `subject_account_id` = the
     outgoing account, `subject_org_id` = the organization. `detail` is `{from_account_id,
     to_account_id, remaining_seats: [<org ids>], deactivated: true|false}`.
- Refusals decided at the edge, all `{ok: false, kind, reason}`:
  - 400 `invalid-request` for no `organizationId`. 400 `invalid-request` for no
    `fromAccountId` or no `toAccountId`. 400 `invalid-request` for no `reason`. 400
    `invalid-request` for `fromAccountId` equal to `toAccountId`. 400 `invalid-request` for
    any of the three ids not a uuid (that check runs before the standing read).
  - 409 `no-such-organisation`. 409 `not-the-current-contact` when `fromAccountId` does not
    hold the seat. A replay of a completed transfer gets the same 409. 409
    `transferee-no-account`. 409 `transferee-not-ngo`. 409 `transferee-deactivated`.
  - Gate, before any of the above: 502 `refused`. 403 `account-deactivated`. 409
    `no-account`. 403 `not-a-platform-admin` for an NGO or volunteer caller.
- The definer `transfer_organization_contact` repeats every refusal with the same kind in
  `DETAIL`. The edge refuses first, so those SQL branches are not reachable through the
  function.

## How to get to it (user POV)

A platform administrator repoints an organization's contact seat after the current contact
left. The API is the `transfer-organization-contact` edge function.

## Driving it with the HTTP harness

`POST {API}/functions/v1/transfer-organization-contact`, headers `Authorization: Bearer
<access_token>` and `apikey: <ANON_KEY>`, body `{"organizationId": "<uuid>", "fromAccountId":
"<uuid>", "toAccountId": "<uuid>", "reason": "<text>"}`.

Setup by product paths. NGO user A completes signup (organization A, A seated). NGO user B
completes signup (organization B, B seated). A platform administrator is obtained as described
in "Shared mechanics" in `README.md`.

- As the administrator, transfer organization A from A to B: expect 200. A holds no seat now,
  so A is deactivated; B holds two seats.
- For the no-deactivation case: before the transfer, A calls `create-organization` for a second
  organization A2, then transfer organization A. A keeps A2 and stays active;
  `detail.remaining_seats` = `[<A2 id>]`, `detail.deactivated` = false.
- Replay the same body: expect 409 `not-the-current-contact`.
- As NGO user A or B: expect 403 `not-a-platform-admin`.
- With `toAccountId` = a confirmed user who never completed signup: expect 409
  `transferee-no-account`.
- After the deactivating transfer, as A, call `update-organization` on any organization: expect
  403 `account-deactivated`.

The shipped drive `scripts/drive-access-and-admin.ts` covers the non-deactivating transfer and
the replay refusal. It does not cover the deactivating transfer (`deactivated` true,
`remaining_seats` empty), the NGO caller's 403, `transferee-no-account`, or the post-transfer
`account-deactivated` refusal.

## What proves it

The response pairs, plus the rows over `DB_URL`:

```sql
select org_id, account_id, role from public.org_memberships where org_id = '<org A>';
select id, account_type, lifecycle from public.accounts where id in ('<A>', '<B>');
select occurred_at, event_kind, actor_label, subject_account_id, subject_org_id, reason, detail
  from public.audit_events
 where subject_org_id = '<org A>' or subject_account_id = '<A>'
 order by occurred_at, id;
```

Before the transfer the organization already holds one `org_role_changed` row, reason
`membership granted`, from signup completion. Expect the three new rows above for the
deactivating transfer, with `detail.deactivated` true and `detail.remaining_seats` `[]`.
Expect two new rows for the non-deactivating one. Append-only: `update public.audit_events set
reason = 'x' where id = '<row>';` answers SQLSTATE `42501` "public.audit_events is
append-only: UPDATE is refused". `delete` answers the same for DELETE.

## Gotchas

- `audit_events` holds no grant for any API key. Read it over `DB_URL` only.
- The seat is the organization's one membership row (unique index on `org_id`). "Current
  contact" means that row's `account_id`. An account seated elsewhere can take the seat.
- The reason is stored verbatim in the audit rows. A whitespace-only reason is refused 400 at
  the edge, because the field selector trims.
- The outgoing account keeps its Auth session. Only its writes are refused (see
  `set-account-lifecycle.md`).
