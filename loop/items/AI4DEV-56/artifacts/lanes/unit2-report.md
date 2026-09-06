# Unit 2 report: deactivation gates every write, with a conformance check in CI

Lane: the feature writer lane. Worktree: `.claude/worktrees/AI4DEV-56-unit2`, branch `lane/ai4dev-56/unit2`.

## What landed

- The lifecycle setter is a new definer and a four-line edge route. The caller is gated first, so a deactivated administrator cannot re-enable itself. The decision refuses a self-change as `invalid-request`.
- The virtual-key seam is a pure module with no table and no route. `virtualKeyActionFor` answers `revoke`, `reissue` or `none`.
- The conformance scan reads the tree against `WRITE_ROUTES` in both directions. The SQL half lives in `_policy-scan.ts` and reuses `splitSqlStatements`.
- AT-001.29, AT-001.30 and AT-001.31 are green at loop. At integration they are `capability-pending` after the real arms run. The label `LEAF.D6_L2` is gone.

## Files changed and why

New files:

- `supabase/migrations/20260909120000_account_lifecycle_setter.sql`. `set_account_lifecycle` is granted to `service_role`. It calls `assert_account_active` on the caller, then the platform-admin backstop, then `change_account_lifecycle`. It returns `{changed: boolean}`. Every raise carries its kind as DETAIL. It ends with `notify pgrst, 'reload schema'`.
- `supabase/functions/set-account-lifecycle/index.ts`. The four-line route. The inventory row already existed.
- `supabase/functions/_shared/gateway-keys.ts`. `KeyAction` and `virtualKeyActionFor`. No table. No route.
- `tests/at/suites/req-001/_write-route-scan.ts`. Pure `scanWriteRoutes` and tree-reading `writeRouteProblems`. Throws on an empty functions directory.
- `tests/at/harness/write-route-scan.selftest.ts`. One `it` per code, plus the real tree, plus the empty-directory throw. The load-bearing case is a fourth write route that reaches `/rest/v1/rpc/` without registering.
- `tests/at/harness/shipped-lifecycle.selftest.ts`. Direct cases for `decideLifecycleChange` and `virtualKeyActionFor`.

Edited files:

- `supabase/functions/_shared/admin-operations.ts`. `accountIdField` and `decideLifecycleChange`.
- `supabase/config.toml`. `[functions.set-account-lifecycle]` with `verify_jwt = true`.
- `tests/at/suites/req-001/_policy-scan.ts`. `WRITE_GATE_EXEMPT` for `complete_signup`. `scanWriteGateSql` tracks definers with `splitSqlStatements`. `tenantCatalogProblems` concatenates those codes.
- `tests/at/suites/req-001/_contract.ts`. `WriteSubject`, `WriteAttemptOutcome`, `LifecycleRequest`, `LifecycleOutcome`, and the two SUT members.
- `tests/at/suites/req-001/_fixture.ts`. `sendDiscoveryMessage` calls `writeGateDecision('discovery-message'` first. `setAccountLifecycle` and `attemptWrite` as a `Record<WriteRouteName, …>`.
- `tests/at/suites/req-001/_live.ts`. The same two members. The live `discovery-message` entry throws `CapabilityPending(['sut.accounts.sendDiscoveryMessage'])`.
- `tests/at/suites/req-001/_integration.ts`. Shared Given and the three integration bodies.
- `tests/at/suites/req-001/f-lifecycle-and-audit.test.ts`. The three loop bodies replace the pending stubs.
- `tests/at/suites/req-001/_pending.ts`. `D6_L2` is removed. The counts move from 6 remaining to 3.
- `tests/at/expected/req-001.json`. The three ids are green at loop. At integration they are `capability-pending` with the arrays the unit named, in that order.
- `tests/at/harness/policy-scan.selftest.ts`. Two negative cases for the SQL codes.

## Deviations from the design, with reasons

1. The SQL half is `scanWriteGateSql` in `_policy-scan.ts`, not a second SQL parser in the write-route module. The unit asked to extend that module and to reuse `splitSqlStatements`. `scanWriteRoutes` calls it. `tenantCatalogProblems` also calls it, so a ungated definer fails the existing catalog assertion too.
2. `scanWriteRoutes` takes `migrations` and `fixtureText`. The design sketch omitted those parameters. The unit prompt required them, because the stand-in check reads the fixture and the SQL half reads the migrations.
3. `loadWriteRouteTree` takes an optional repo root so the empty-directory selftest can throw. The design did not name that parameter.
4. The fixture `attemptWrite` entry for `discovery-message` runs `writeGateDecision` and then writes. `sendDiscoveryMessage` also calls `writeGateDecision` first. The scan's stand-in needle is that call in `sendDiscoveryMessage`.

## Checks

Every command ran from the worktree. Local time is UTC+3. The stack started once and was not restarted. The stack is left running. The new migration applied on `db:reset` with no error. The integration run reported `9 migrations expected, 9 applied`.

| Command | Start | End | Exit |
| --- | --- | --- | --- |
| `bun run typecheck` | 2026-09-06T11:46:00+03:00 | 2026-09-06T11:46:09+03:00 | 0 |
| `bun run at:check req-001` | 2026-09-06T11:46:20+03:00 | 2026-09-06T11:46:20+03:00 | 0 |
| `bun run at:selftest` | 2026-09-06T11:47:34+03:00 | 2026-09-06T11:47:43+03:00 | 0 |
| `bun run at:verify req-001 --tier loop --expect` | 2026-09-06T11:47:50+03:00 | 2026-09-06T11:47:52+03:00 | 0 |
| `bun run db:stop` | 2026-09-06T11:48:14+03:00 | 2026-09-06T11:48:29+03:00 | 0 |
| `bun run db:start` | 2026-09-06T11:48:41+03:00 | 2026-09-06T11:49:19+03:00 | 0 |
| `bun run db:reset` | 2026-09-06T11:49:28+03:00 | 2026-09-06T11:50:04+03:00 | 0 |
| `bun run at:verify req-001 --tier integration --expect` | 2026-09-06T11:50:14+03:00 | 2026-09-06T11:53:44+03:00 | 0 |

The typecheck timestamp is the successful run after the comment-terminator fix in `_write-route-scan.ts`. The selftest timestamp is the successful run after the CRLF config-replace fix.

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
   Start at  11:47:34
   Duration  9.17s (transform 2.38s, setup 0ms, import 3.33s, tests 21.38s, environment 2ms)
```

The run before the CRLF fix had 17 files and 259 tests in unit 1's last count, then 17 and 259 after unit 1's extra selftest. This unit adds two selftest files. The passing count is 19 files and 283 tests.

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
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 33 green, 4 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-unit2\tests\at\expected\req-001.json exactly (33 declared green, 4 declared red)
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
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 25 green, 12 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-unit2\tests\at\expected\req-001.json exactly (25 declared green, 12 declared red)
```

The integration child reported `9 migrations expected, 9 applied`. AT-001.29, AT-001.30 and AT-001.31 reached `CapabilityPending` after the real arms. An assertion failure before the throw would not have worn that shape.

## Open doubts

1. AT-001.29's transfer control deactivates the outgoing contact as a side effect of a successful write. Later inventory rows in the same body must not need that account to stay active. Today they do not. A new write route inserted after `transfer-organization-contact` in `WRITE_ROUTES` could make the loop order-dependent.
2. The integration Given for AT-001.29 provisions three administrators, four NGO accounts and two volunteers. The whole integration run finished in about three and a half minutes. A slower mail catcher could press the four-minute body timeout.
3. The scan is a text oracle. A comment that names `/rest/v1/rpc/` in a read function would fail as `write-route-unregistered`. That is the same residual `_source-scan.ts` states for names.

## SQL half: which reuse

The SQL half extends `_policy-scan.ts`. It does not parse SQL a second way. `scanWriteGateSql` walks `splitSqlStatements`, tracks `security definer`, `stable`/`immutable`, `grant execute` to `service_role`, `public.assert_account_active(`, and `update`/`delete` of `public.audit_events`. `complete_signup` is the one exemption row.
