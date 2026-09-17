# Set organization Discovery (platform admin per-NGO switch)

A platform administrator switches Discovery off or on for one organisation. The write is
audited. There is no notification. The next reserve on that organisation reads the switch
under the organisation lock and refuses `discovery-disabled`.

## Sub-features

- Disable: 200 `{ok, organizationId, discoveryEnabled: false, changed: true, disabledAt}`.
  Writes the three organisation columns and one `audit_events` row (`org_discovery_switched`)
  whose `detail` is `{enabled, previously_disabled_at}`. The reason is the audit reason.
- Enable: the same shape with `discoveryEnabled: true` and `disabledAt: null`. The three
  columns become null.
- Idempotent: when the requested state already holds, 200 `changed: false` and no audit row.
- Admin-only: an NGO or volunteer caller is refused 403 `not-a-platform-admin` by the write
  gate.
- Blank reason: 400 `invalid-request`.
- Missing organisation: 409 `no-such-organisation`.

## How to get to it (user POV)

The founder, signed in as a platform administrator, records the switch. The API is the
`set-organization-discovery` edge function. There is no public signup for a platform
administrator. Provision one as `set-organization-vetting.md` describes.

## Driving it with the HTTP harness

`POST {API}/functions/v1/set-organization-discovery`, headers `Authorization: Bearer
<admin access_token>` and `apikey: <ANON_KEY>`.

Body: `{"organizationId", "enabled": false, "reason": "abuse report"}`. `reason` must be a
trimmed non-empty string. `enabled: true` turns Discovery back on.

Refusals, in decision order after the write gate (502 `refused` unreadable standing, 403
`account-deactivated`, 409 `no-account`, 403 `not-a-platform-admin`):

- 400 `invalid-request` for an `organizationId` missing or blank, a non-boolean `enabled`,
  or a missing reason.
- 409 `no-such-organisation`: a well-formed id no organization carries.

A later Discovery send on a disabled organisation answers 409 `discovery-disabled`. The
sentence names the stored reason and says a platform admin switched Discovery off for this
organisation. Another organisation is untouched.

Readback over `DB_URL`:

```sql
select id, discovery_disabled_at, discovery_disabled_by, discovery_disabled_reason
  from public.organizations where id = '<organizationId>';

select id, event_kind, actor_account_id, actor_label, subject_org_id, reason,
       detail->>'enabled' as enabled, detail->>'previously_disabled_at' as previously_disabled_at
  from public.audit_events
 where event_kind = 'org_discovery_switched' and subject_org_id = '<organizationId>'
 order by occurred_at;
```

Expect `audit_events.actor_label = 'platform_admin:<admin id>'` and `reason` equal to the
request reason. The audit detail carries no message body.

## What proves it

The 200 pair. The three columns whole or absent. The audit row with the reason. A send on
that organisation refused `discovery-disabled`. A send on another organisation still
admitted. For a refusal, the 4xx pair, `kind`, and no new audit row.

## Gotchas

- `audit_events` revokes every privilege from `service_role`. Read it over `DB_URL`.
- The switch is per organisation. There is no platform-wide flag, cron, or breaker.
- A turn already reserved still settles. The next reserve is blocked.
