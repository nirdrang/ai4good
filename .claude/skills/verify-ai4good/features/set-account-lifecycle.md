# Set account lifecycle (admin-only deactivate and reactivate)

A platform administrator deactivates or reactivates another account, with a reason. The change
is idempotent. A deactivated account keeps its sign-in, but every write route refuses it with
403 `account-deactivated` before any other judgement.

## Sub-features

- Platform-admin caller, `lifecycle` = `deactivated` on an active subject: 200
  `{ok: true, changed: true}`. `accounts.lifecycle` = `deactivated`. One `audit_events` row is
  written, `event_kind` = `account_lifecycle_changed`, `actor_label` = `platform_admin:<admin
  account id>`. On that row `subject_account_id` = the subject, `subject_org_id` null, reason =
  the reason, `detail` `{"from": "active", "to": "deactivated"}`.
- The same call again: 200 `{ok: true, changed: false}`; no new audit row.
- `lifecycle` = `active`: reactivates; `changed` true; `detail` `{"from": "deactivated",
  "to": "active"}`.
- Any account type can be the subject: NGO, volunteer, or another platform administrator.
- Effect on the deactivated account: every write route answers 403
  `{"ok": false, "kind": "account-deactivated", "reason": "this account is deactivated, so it
  may perform no write"}`. The write routes are `complete-signup`, `create-organization`,
  `update-organization`, `set-organization-profile`, `project-need`, `discovery-allowance`,
  `set-organization-vetting` and the three admin routes. The gate judges deactivation before
  type and before presence. The reads (`organization-dashboard`, `project-workspace`,
  `need-intake`) still answer: no read policy names the lifecycle. The Auth session stays
  valid. Nothing in the tree touches `auth.users` or sessions on deactivation. No Auth hook is
  configured, and the password grant still issues tokens.
- Refusals decided at the edge, all `{ok: false, kind, reason}`. 400 `invalid-request` for a
  missing `accountId`. 400 `invalid-request` for an `accountId` that is not a uuid. 400
  `invalid-request` for a `lifecycle` other than `active` or `deactivated`. 400
  `invalid-request` for a missing `reason`. 400 `invalid-request` for an `accountId` equal to
  the caller's own id. 409 `subject-no-account` for a confirmed user with no `accounts` row.
  From the gate: 502 `refused`. 403 `account-deactivated` (an administrator deactivated by
  another one). 409 `no-account`. 403 `not-a-platform-admin`.
- The definer `set_account_lifecycle` repeats the refusals in `DETAIL` and the shared
  `change_account_lifecycle` raises `subject-no-account`. The edge refuses first, so those
  branches are not reachable through the function.

## How to get to it (user POV)

A platform administrator switches an account off, and later on again. The API is the
`set-account-lifecycle` edge function.

## Driving it with the HTTP harness

`POST {API}/functions/v1/set-account-lifecycle`, headers `Authorization: Bearer
<access_token>` and `apikey: <ANON_KEY>`, body `{"accountId": "<uuid>", "lifecycle":
"deactivated", "reason": "<text>"}`.

- As the administrator, with the NGO drive's user as subject: expect 200 `changed: true`.
- As that NGO user, `POST update-organization` on its own organization: expect 403
  `account-deactivated`; the organization name is unchanged.
- As that NGO user, `POST organization-dashboard` on its own organization: expect 200 still.
- Sign the NGO user in again (`POST /auth/v1/token?grant_type=password`): expect 200 with an
  access token.
- Repeat the deactivation: expect 200 `changed: false`.
- With `lifecycle` = `active`: expect 200 `changed: true`; `update-organization` works again.
- With `accountId` = the administrator's own id: expect 400 `invalid-request`.
- With `accountId` = a confirmed user who never completed signup: expect 409
  `subject-no-account`.

The shipped drive `scripts/drive-access-and-admin.ts` proves `account-deactivated` on
`create-organization`, not on `update-organization`. It used `GET /auth/v1/user` for the
session check. It does not drive the dashboard-still-200 read, the password-grant re-sign-in,
or `subject-no-account`.

## What proves it

The response pairs, the 403 pair with the unchanged `organizations` row, plus the rows over
`DB_URL`:

```sql
select id, account_type, lifecycle from public.accounts where id = '<subject>';
select occurred_at, actor_label, subject_account_id, reason, detail
  from public.audit_events
 where event_kind = 'account_lifecycle_changed' and subject_account_id = '<subject>'
 order by occurred_at, id;
```

Expect exactly two audit rows after deactivate, replay and reactivate: one `active` to
`deactivated`, one `deactivated` to `active`.

## Gotchas

- `audit_events` holds no grant for any API key. Read it over `DB_URL` only.
- The database backstop `assert_account_active` raises SQLSTATE `42501` with `DETAIL`
  `account-deactivated`, which the route would map to 409. A 403 proves the edge gate ran; a
  409 with that kind means a stale function served the call (see Doctor in `SKILL.md`).
- The "deactivated administrator" gate case needs a second platform administrator. Drive it
  only when one exists, and say so.
- The contact transfer deactivates too (see `transfer-organization-contact.md`) and writes the
  same audit kind. Filter by `subject_account_id` to keep the two apart.
