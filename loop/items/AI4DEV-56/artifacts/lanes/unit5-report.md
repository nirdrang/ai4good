# Unit 5 report: a volunteer cannot unlink the GitHub identity after signup

Lane: the feature writer lane. Worktree: `.claude/worktrees/AI4DEV-56-unit5`, branch `lane/ai4dev-56/unit5`.

## What landed

- A BEFORE DELETE trigger on `auth.identities` refuses a direct delete of a volunteer GitHub identity. The WHEN clause admits a cascade from an admin user delete.
- `_policy-scan.ts` gains `identityPermanenceProblems()`. It fails when that trigger is missing or unguarded.
- AT-001.41 is green at both tiers. The loop body asserts the scan is empty and drives the fixture mirror. The integration body drives the real DELETE. The oracle is the identity row and a healthy `/auth/v1/user`, never GoTrue's 500.

The fold for decision d91 (requirement text, AT-001.41, decomposition leaf) sits in the same commit. That fold was red on its own because the suite had 37 registered ids against 38 in the file.

## Files changed and why

New files:

- `supabase/migrations/20260911120000_volunteer_github_identity_is_permanent.sql`. `github_identity_is_permanent_for_volunteers` is a security definer with `set search_path = ''`. It raises `42501` with `detail = 'github-unlink-refused'` when `old.provider = 'github'` and the owning `public.accounts` row is of type `volunteer`. Otherwise it returns `old`. Execute is revoked from public. The trigger `volunteer_github_identity_is_permanent` runs BEFORE DELETE on `auth.identities` FOR EACH ROW `WHEN (pg_trigger_depth() = 0)`. The header names the two probe files in two sentences.
- `loop/items/AI4DEV-56/artifacts/lanes/unit5-report.md`. This file.

Edited files:

- `tests/at/suites/req-001/_policy-scan.ts`. Pure `scanIdentityPermanence` and tree-reading `identityPermanenceProblems`. Two codes: `identity-permanence-missing` and `identity-permanence-unguarded`.
- `tests/at/harness/policy-scan.selftest.ts`. One case per code, plus the real tree yielding `[]`.
- `tests/at/harness/live-stack.ts`. `authDelete` beside `authPost`.
- `tests/at/harness/live-stack.selftest.ts`. One request-shape case for `authDelete`.
- `tests/at/suites/req-001/_contract.ts`. `unlinkGithubIdentity`, `linkedIdentities`, `authUserIsHealthy`.
- `tests/at/suites/req-001/_fixture.ts`. An identity list on the auth user. Unlink refuses when the account is a volunteer and the provider is github, labelled as a mirror of the trigger.
- `tests/at/suites/req-001/_live.ts`. Unlink is `DELETE /auth/v1/user/identities/{id}` with the user's token. The identity id comes from `GET /auth/v1/user`. Linked identities are read as the operator. Health is `/auth/v1/user` answering 200.
- `tests/at/suites/req-001/_integration.ts`. Call site 3 as `at00141`.
- `tests/at/suites/req-001/a-signup-and-signin.test.ts`. AT-001.41 registered through `atTest`. Loop body asserts `identityPermanenceProblems()` is `[]` and drives the fixture mirror.
- `tests/at/expected/req-001.json`. AT-001.41 is green at both tiers.

The fold already in this commit:

- `.taskmaster/docs/acceptance/at-req-001.md`, `loop/out/pure-s3-req-001-006.md`, `.taskmaster/docs/prd-mvp.md`, `.taskmaster/docs/requirements/req-001.md`, `loop/decomp/req-001.md`, `loop/state/decisions.jsonl`.

## Deviations from the design, with reasons

1. The loop body drives the fixture mirror as well as the static scan. Design section 9 said the loop arm is a static oracle only. The unit asked for both. The synthesis already labelled the fixture method as a mirror of the trigger.
2. Both bodies assert that the volunteer Given holds an email identity as well as github. Call site 3 only checked github. The extra assertion stops GoTrue's last-identity rule from looking like the volunteer rule.
3. The migration stamp is `20260911120000`. The design sketch used `20260910120000`, which the append-only-audit unit already took.
4. `GET /auth/v1/user` is inlined in the live adapter. The unit asked only for `authDelete` in `live-stack.ts`.

## Checks

Every command ran from the worktree. Local time is UTC+3. The stack started once and was not restarted. The stack is left running. The new migration applied on `db:reset` with no error. The integration run reported `11 migrations expected, 11 applied`.

| Command | Start | End | Exit |
| --- | --- | --- | --- |
| `bun run typecheck` | 2026-09-06T12:38:59+03:00 | 2026-09-06T12:39:07+03:00 | 0 |
| `bun run at:check req-001` | 2026-09-06T12:39:16+03:00 | 2026-09-06T12:39:16+03:00 | 0 |
| `bun run at:selftest` | 2026-09-06T12:31:54+03:00 | 2026-09-06T12:32:03+03:00 | 0 |
| `bun run at:verify req-001 --tier loop --expect` | 2026-09-06T12:32:14+03:00 | 2026-09-06T12:32:15+03:00 | 0 |
| `bun run db:stop` | 2026-09-06T12:32:33+03:00 | 2026-09-06T12:32:48+03:00 | 0 |
| `bun run db:start` | 2026-09-06T12:32:58+03:00 | 2026-09-06T12:33:36+03:00 | 0 |
| `bun run db:reset` | 2026-09-06T12:33:46+03:00 | 2026-09-06T12:34:23+03:00 | 0 |
| `bun run at:verify req-001 --tier integration --expect` | 2026-09-06T12:34:44+03:00 | 2026-09-06T12:38:16+03:00 | 0 |

The typecheck and `at:check` timestamps are a second green run after the integration run. The first typecheck and `at:check` also exited 0, before the stack sequence. The selftest count is 19 files and 287 tests. Unit 3's last count was 19 files and 283 tests. This unit adds three scan cases and one `authDelete` request-shape case.

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
at:check req-001 — 38 P0 in the acceptance file, 38 registered in the suite
RESULT: 38 P0 ids in bijection
```

### Last 20 lines: `bun run at:selftest`

```text
 Test Files  19 passed (19)
      Tests  287 passed (287)
   Start at  12:31:54
   Duration  9.31s (transform 2.55s, setup 0ms, import 3.51s, tests 20.89s, environment 2ms)
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
  38 P0: 35 green, 3 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-unit5\tests\at\expected\req-001.json exactly (35 declared green, 3 declared red)
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
Applying migration 20260911120000_volunteer_github_identity_is_permanent.sql...
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
  38 P0: 27 green, 11 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-unit5\tests\at\expected\req-001.json exactly (27 declared green, 11 declared red)
```

The integration child reported `11 migrations expected, 11 applied`. AT-001.41 reached green after the real DELETE. The volunteer GitHub row survived and `/auth/v1/user` answered 200. The NGO GitHub row was removed.

## Open doubts

1. The fixture mirror can drift from the trigger, because nothing compiles one from the other. The integration tier is the oracle for the trigger.
2. An NGO that held only a GitHub identity would hit GoTrue's last-identity rule, not this trigger. The Given always signs up by email first, so both identities exist.
3. The operator can drop the trigger. No object in a database protects against its owner. Ruling R3 states the same residual for the audit trigger.

The report cannot carry the hash of the commit that carries it. The hash is in the five-line reply.
