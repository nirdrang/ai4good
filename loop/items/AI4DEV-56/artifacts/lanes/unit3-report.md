# Unit 3 report: the append-only audit for role changes and contact transfer, and the sign-in rate limit declared

Lane: the feature writer lane. Worktree: `.claude/worktrees/AI4DEV-56-unit3`, branch `lane/ai4dev-56/unit3`.

## What landed

- The role-change trigger writes one `org_role_changed` row through `append_audit_event` on every membership insert and on every update that changes the account or the role. An update that changes neither writes nothing.
- AT-001.33 is green at both tiers. The body reuses the transfer Given, re-points the seat as the operator, asserts the three audit kinds, and refuses update, delete and truncate. At integration the catalog privileges on `audit_events` are empty for `anon`, `authenticated` and `service_role`.
- AT-001.34 is declared red at both tiers with `vendors.gotrue-sign-in-rate-limit`. The body opens a world and then throws. The label `LEAF.D6_L3` is gone.

## Actor decision for product membership inserts

`create_organization` and `complete_signup` do not set `app.actor_account_id`. This unit does not restate those definers. Their membership inserts therefore record `actor_account_id` null and `actor_label` `operator`. Ruling R9 accepts a trigger-written row with no actor. The transfer definer already sets the actor, so a seat move inside a transfer records the administrator.

## Files changed and why

New files:

- `supabase/migrations/20260910120000_org_membership_role_change_audit.sql`. `org_membership_role_change_audit` is a security definer with `set search_path = ''` and `revoke execute from public`. The trigger `org_memberships_role_change_audit` runs AFTER INSERT OR UPDATE on `org_memberships` FOR EACH ROW. It reads `current_setting('app.actor_account_id', true)`. Reasons: `membership granted` on insert, `seat repointed` when `account_id` changes, `role changed` otherwise. Detail carries old and new role and account. It ends with `notify pgrst, 'reload schema'`. It creates no table.
- `loop/items/AI4DEV-56/pending-ledger.txt`. One line per REQ-001 id that is still red, with tier, declared shape, and capability or leaf.
- `loop/items/AI4DEV-56/artifacts/lanes/unit3-report.md`. This file.

Edited files:

- `tests/at/suites/req-001/_contract.ts`. `TamperOutcome` and `attemptAuditTamper`.
- `tests/at/suites/req-001/_fixture.ts`. The trigger mirror `recordRoleChange` on every membership write, labelled as a mirror. The append-only refusal on `attemptAuditTamper`, also labelled as a mirror. Transfer writes the trigger row with the caller as actor.
- `tests/at/suites/req-001/_live.ts`. `attemptAuditTamper` runs the real UPDATE, DELETE and TRUNCATE as the operator and reports the refusal.
- `tests/at/suites/req-001/_integration.ts`. Shared `assertAppendOnlyAudit`, `at00133`, `at00134`. The transfer helpers filter for `org_contact_transferred` so the signup grant row does not fail AT-001.26 and AT-001.35.
- `tests/at/suites/req-001/e-admin-operations.test.ts`. The pre-transfer assertion for AT-001.26 filters the same way.
- `tests/at/suites/req-001/f-lifecycle-and-audit.test.ts`. AT-001.33 and AT-001.34 replace the pending stubs.
- `tests/at/suites/req-001/_pending.ts`. `D6_L3` is removed. The counts move from 3 remaining to 1.
- `tests/at/expected/req-001.json`. AT-001.33 is green at both tiers. AT-001.34 is `capability-pending` with `vendors.gotrue-sign-in-rate-limit` at both tiers.

## Deviations from the design, with reasons

1. Product membership inserts record the operator. The design sketch lets product definers set the actor before they write. This unit's migration is the trigger only. Restating `complete_signup` and `create_organization` would reopen unit 1's writers. Ruling R9 accepts the null actor.
2. The transfer audit helpers no longer require an empty organisation event list. The trigger writes `org_role_changed` on the signup insert that builds the Given. The helpers now look for the transfer kind. Without that filter AT-001.26 and AT-001.35 fail.
3. The operator role change is `repointMembershipAsOperator` of the transferred seat back onto the outgoing account. That account is deactivated and still of type `ngo`. The NGO-only trigger admits it. No new operator method is added.

## Checks

Every command ran from the worktree. Local time is UTC+3. The stack started once and was not restarted. The stack is left running. The new migration applied on `db:reset` with no error. The integration run reported `10 migrations expected, 10 applied`.

| Command | Start | End | Exit |
| --- | --- | --- | --- |
| `bun run typecheck` | 2026-09-06T12:11:57+03:00 | 2026-09-06T12:12:09+03:00 | 0 |
| `bun run at:check req-001` | 2026-09-06T12:12:22+03:00 | 2026-09-06T12:12:22+03:00 | 0 |
| `bun run at:selftest` | 2026-09-06T12:12:43+03:00 | 2026-09-06T12:12:54+03:00 | 0 |
| `bun run at:verify req-001 --tier loop --expect` | 2026-09-06T12:13:11+03:00 | 2026-09-06T12:13:13+03:00 | 0 |
| `bun run db:stop` | 2026-09-06T12:13:29+03:00 | 2026-09-06T12:13:44+03:00 | 0 |
| `bun run db:start` | 2026-09-06T12:13:50+03:00 | 2026-09-06T12:14:27+03:00 | 0 |
| `bun run db:reset` | 2026-09-06T12:14:35+03:00 | 2026-09-06T12:15:12+03:00 | 0 |
| `bun run at:verify req-001 --tier integration --expect` | 2026-09-06T12:15:23+03:00 | 2026-09-06T12:18:52+03:00 | 0 |

### Last 20 lines: `bun run typecheck`

```text
$ bun tests/at/typecheck.ts

=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```

### Last 20 lines: `bun run at:check req-001`

```text
$ bun tests/at/harness/check.ts "req-001"
at:check req-001 — 37 P0 in the acceptance file, 37 registered in the suite
RESULT: 37 P0 ids in bijection
```

### Last 20 lines: `bun run at:selftest`

```text
 Test Files  19 passed (19)
      Tests  283 passed (283)
   Start at  12:12:43
   Duration  10.74s (transform 3.97s, setup 0ms, import 5.03s, tests 24.36s, environment 2ms)
```

### Last 20 lines: `bun run at:verify req-001 --tier loop --expect`

```text
  AT-001.24    red      CapabilityPending: CAPABILITY PENDING — ui.authenticated-surface-rendering
  AT-001.25    green    contact transfer moves ownership, deactivates the old account and preserves all history
  AT-001.26    green    the completed transfer leaves an audit record of who, when and why
  AT-001.27    green    lost-access recovery runs the same audited flow as contact transfer
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    green    every enumerated write is rejected for a deactivated account while an active control succeeds
  AT-001.30    green    an AUP-deactivated volunteer is refused writes immediately and the project keys are revoked
  AT-001.31    green    re-enabling an account restores otherwise-authorized writes while independent gates stay enforced
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    green    role changes and contact transfer leave an append-only audit record that cannot be altered
  AT-001.34    red      CapabilityPending: CAPABILITY PENDING — vendors.gotrue-sign-in-rate-limit
  37 P0: 34 green, 3 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-unit3\tests\at\expected\req-001.json exactly (34 declared green, 3 declared red)
```

### Last 20 lines: `bun run db:stop`

```text
$ bunx supabase stop
{"project_id_filter":"poancmeitlmxejofwzuu","backup":true,"message":"Stopped supabase local development setup."}
```

### Last 20 lines: `bun run db:start`

```text
$ bunx supabase start --ignore-health-check
{"DB_URL":"postgresql://postgres:postgres@127.0.0.1:44322/postgres","API_URL":"http://127.0.0.1:44321","REST_URL":"http://127.0.0.1:44321/rest/v1","GRAPHQL_URL":"http://127.0.0.1:44321/graphql/v1","FUNCTIONS_URL":"http://127.0.0.1:44321/functions/v1","MCP_URL":"http://127.0.0.1:44321/mcp","STUDIO_URL":"http://127.0.0.1:44323","PUBLISHABLE_KEY":"sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH","SECRET_KEY":"sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz","JWT_SECRET":"super-secret-jwt-token-with-at-least-32-characters-long","ANON_KEY":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0","SERVICE_ROLE_KEY":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU","MAILPIT_URL":"http://127.0.0.1:44324","INBUCKET_URL":"http://127.0.0.1:44324","STORAGE_S3_URL":"http://127.0.0.1:44321/storage/v1/s3","S3_PROTOCOL_ACCESS_KEY_ID":"625729a08b95bf1b7ff351a663f3a23c","S3_PROTOCOL_ACCESS_KEY_SECRET":"850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907","S3_PROTOCOL_REGION":"local","message":""}
```

### Last 20 lines: `bun run db:reset`

```text
Applying migration 20260808120000_accounts_org_membership_and_acknowledgments.sql...
Applying migration 20260809090000_volunteer_github_link_and_imported_profile.sql...
Applying migration 20260811120000_acknowledgment_signer_identity.sql...
Applying migration 20260811125000_org_membership_ngo_only_and_organization_rename.sql...
Applying migration 20260811130000_single_seat_org_and_single_developer_projects.sql...
Applying migration 20260906120000_tenant_read_posture_and_org_member_policies.sql...
Applying migration 20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql...
Applying migration 20260908120000_account_lifecycle_audit_and_contact_transfer.sql...
Applying migration 20260909120000_account_lifecycle_setter.sql...
Applying migration 20260910120000_org_membership_role_change_audit.sql...
WARN: no files matched pattern: supabase/seed.sql
Skipping migration .gitkeep... (file name must match pattern "<timestamp>_name.sql")
Skipping migration README.md... (file name must match pattern "<timestamp>_name.sql")
Restarting containers...
Finished supabase db reset on branch main.
{"target":"local","version":"","message":"Reset local database."}
```

### Last 20 lines: `bun run at:verify req-001 --tier integration --expect`

```text
  AT-001.24    red      CapabilityPending: CAPABILITY PENDING — ui.authenticated-surface-rendering
  AT-001.25    green    contact transfer moves ownership, deactivates the old account and preserves all history
  AT-001.26    green    the completed transfer leaves an audit record of who, when and why
  AT-001.27    green    lost-access recovery runs the same audited flow as contact transfer
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    red      CapabilityPending: CAPABILITY PENDING — sut.accounts.sendDiscoveryMessage
  AT-001.30    red      CapabilityPending: CAPABILITY PENDING — gateway.virtual-key-revocation, sut.accounts.sendDiscoveryMessage
  AT-001.31    red      CapabilityPending: CAPABILITY PENDING — gateway.virtual-key-reissue
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    green    role changes and contact transfer leave an append-only audit record that cannot be altered
  AT-001.34    red      CapabilityPending: CAPABILITY PENDING — vendors.gotrue-sign-in-rate-limit
  37 P0: 26 green, 11 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-unit3\tests\at\expected\req-001.json exactly (26 declared green, 11 declared red)
```

The integration child reported `10 migrations expected, 10 applied`. AT-001.33 reached green after the real trigger and the real tampers. AT-001.34 reached `CapabilityPending` after `open()`.

## Open doubts

1. A later reader of the audit table cannot tell a product membership grant from an operator grant, because both record the operator. Setting the actor in `complete_signup` and `create_organization` would close that, and would still leave AT-001.33's operator path as the extra re-point.
2. AT-001.33's null-actor assertion would already pass from the signup insert. The extra re-point is the proof of the trigger's UPDATE half on an operator path.
3. The operator re-point uses a deactivated NGO account as the new holder. The NGO-only trigger does not read lifecycle. A later lifecycle trigger of the AT-001.37 shape would refuse this Given.

The report cannot carry the hash of the commit that carries it. The hash is in the five-line reply.
