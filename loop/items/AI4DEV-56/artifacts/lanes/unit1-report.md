# Unit 1 report: contact transfer, lost-access recovery, the escalation contact, and the write boundary

Lane: the hardest-tasks writer lane. Worktree: `.claude/worktrees/AI4DEV-56-unit1`, branch `lane/ai4dev-56/unit1`, base commit `229dc8d`.

## What landed

- One migration adds the account lifecycle column, the append-only audit table, the escalation-contact table, the standing read, the lifecycle assert, and the two platform-admin definers.
- The write boundary is one handler. `writeRoute` owns the pipeline. Every write route is four lines. `callDatabaseFunction` is no longer exported.
- Two new routes: `transfer-organization-contact` and `set-escalation-contact`, both with `verify_jwt = true`.
- AT-001.25, AT-001.26, AT-001.27, AT-001.28 and AT-001.35 are green at both tiers. The manifest moves the five ids from red to green at both tiers. The label `LEAF.D6_L1` is gone.
- One selftest covers the gate order, the standing parser and the refusal-kind parser.

The GitHub statistics step of complete-signup lives inside `decideSignupCompletion` (the `decide` step). There is no separate `args` step. The stats come from `stubGithubStatsFor`, and the four GitHub keys are absent from the arguments when the caller has no handle.

## Files changed and why

New files:

- `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql`. The enum `account_lifecycle` and the column `accounts.lifecycle` (R8). The index `org_memberships_by_account_idx` for the seat lookups. The enum `audit_event_kind` and the table `audit_events`, append-only by two triggers (row and statement) that raise `42501`. The table `org_escalation_contacts`, one row per organisation (R15). `write_standing` (stable definer, executable by `service_role` only). `assert_account_active` (definer, `for share`, R7). `append_audit_event` (R9: null actor is labelled `operator`). `change_account_lifecycle` (idempotent, writes its own audit row). `transfer_organization_contact` (the transfer row by row, two audit rows). `set_escalation_contact` (upsert). `create_organization` and `update_organization` are restated with `perform public.assert_account_active(p_account_id)` as their first statement; their bodies are otherwise unchanged. Every new function has `revoke execute ... from public`. Both new tables have the baseline revoke from `anon`, `authenticated` and `service_role`, and row-level security on.
- `supabase/functions/_shared/write-routes.ts`. The inventory `WRITE_ROUTES`, the `WriteStanding` type and its fail-closed parser, `writeGateDecision` with the five ordered checks, `writePipeline`, the closed list `WRITE_REFUSAL_KINDS` with `parseWriteRefusalKind`, `typeRefusalKind`, `refuseWrite`, `stringField`, `organizationIdField`.
- `supabase/functions/_shared/admin-operations.ts`. `decideContactTransfer`, `decideEscalationContact`, `validateEscalationContact`, `subjectAccountIdField`, and their argument types.
- `supabase/functions/transfer-organization-contact/index.ts` and `supabase/functions/set-escalation-contact/index.ts`. The two new routes in the four-line shape.
- `tests/at/harness/shipped-write-gate.selftest.ts`. The selftest of the gate, the standing parser and the refusal-kind parser.

Edited files:

- `supabase/functions/_shared/accounts.ts`. `ACCOUNT_LIFECYCLES`, `AccountLifecycle`, `parseAccountLifecycle`; `decideSignupCompletion` and `decideOrganizationCreation` with their argument types.
- `supabase/functions/_shared/memberships.ts`. `decideOrganizationRename` with its argument type.
- `supabase/functions/_shared/edge.ts`. `writeRoute` and `loadWriteStanding`. `RpcOutcome` carries `details`. `callDatabaseFunction` is unexported.
- `supabase/functions/complete-signup/index.ts`, `supabase/functions/create-organization/index.ts`, `supabase/functions/update-organization/index.ts`. Rewritten to the four-line shape.
- `supabase/config.toml`. The two new function blocks with `verify_jwt = true`.
- `tests/at/expected/req-001.json`. The five ids move from red to green at both tiers.
- `tests/at/suites/req-001/_contract.ts`. `AccountRow.lifecycle`; `AuditEventRow`, `EscalationContactRow`, the request and outcome types; the four new `AccountsSut` members.
- `tests/at/suites/req-001/_fixture.ts`. The fixture runs the shipped `writePipeline` with the shipped decisions over its Maps. It mirrors the transfer, the lifecycle change, the audit rows and the escalation contact.
- `tests/at/suites/req-001/_live.ts`. The live adapter posts to the deployed routes and reads `audit_events` and `org_escalation_contacts` as the operator.
- `tests/at/suites/req-001/_integration.ts`. The five integration bodies, the shared Given, the read-backs and the audit assertion. One whole-row account assertion in the AT-001.01 body and one in the AT-001.09 body gained `lifecycle: 'active'`.
- `tests/at/suites/req-001/_policy-scan.ts`. Two catalog rows: `audit_events` and `org_escalation_contacts` are `unreachable-by-client-roles` (R12).
- `tests/at/suites/req-001/_pending.ts`. `D6_L1` is removed and the counts are updated.
- `tests/at/suites/req-001/e-admin-operations.test.ts`. The five loop bodies; the integration bodies are bound from `_integration.ts`.
- `tests/at/suites/req-001/a-signup-and-signin.test.ts` and `tests/at/suites/req-001/b-verification-and-sessions.test.ts`. Four whole-row account assertions gained `lifecycle: 'active'`, because `AccountRow` now carries the column.

## Deviations from the design, with reasons

1. `WriteStanding` has no `subjectExists` and `SubjectStanding` has no `seatCount`. The standing carries `orgSeatAccountId` (the current seat holder of the target organisation), `orgSeatHolderSeats` (every organisation where that holder has the seat) and `subject` (`null` when the subject account does not exist). R6 says the refusal must name the other seats, so the standing carries the ids and not a count.
2. The subject of the standing read is the transferee (`toAccountId`). The outgoing account is identified by the seat it holds, so `not-the-current-contact` is decided from `orgSeatAccountId`.
3. `organizationIdField` has one home, `write-routes.ts`. Three routes read it.
4. The design's `definerRefusalKind` is `parseWriteRefusalKind` in `write-routes.ts`. The edge and the live adapter share it, so both tiers classify a refusal with the same function.
5. A refusal decision can carry `fields`. Only `holds-other-seats` uses it, to name the organisations on the wire.
6. `writeRoute` refuses a target or subject id that is not a UUID with `400 invalid-request` before the standing read. The design does not say where a malformed id is refused; refusing it before any database call keeps the standing read free of bad input.
7. The `update-organization` route renders `organizationId` and `name` from the definer's `organization_id` and `name`, so the wire shape the existing bodies read is unchanged.
8. The audit rows: the transfer row has `subject_account_id` = the outgoing account, `subject_org_id` = the organisation, and `detail = {from_account_id, to_account_id}`. The lifecycle row has `detail = {from, to}`. The actor label is `platform_admin:<id>`, or `operator` when the actor is null (R9).
9. The unauthenticated arm has no kind on the wire. `edgeHandler` answers 401 before the pipeline starts. Both adapters map status 401 to `kind: 'unauthenticated'`, so AT-001.35 asserts the same shape at both tiers.
10. A transfer from an account to itself is refused as `invalid-request`, in TypeScript and in SQL. The design is silent on it.
11. The escalation email must be non-blank and contain `@`. The design says non-blank only; the added check is the smallest one that refuses a name typed into the email field.
12. The loop `Clock` has no `now()`. The loop bodies of AT-001.26 and AT-001.27 freeze the clock at `AUDIT_INSTANT` before the Given and assert the audit instant with tolerance 0. The integration bodies take the window from `RealClock.now()` around the act, with a 60 second tolerance for the container clock.
13. The SQL `complete_signup` is not restated. An account that exists refuses a second completion already, so a deactivated account cannot reach it; the TypeScript gate refuses it first in any case.
14. The inventory holds a `set-account-lifecycle` row so the gate and the selftest cover it now. Its handler is unit 2's; there is no `supabase/functions/set-account-lifecycle` folder and no `config.toml` block for it in this commit.
15. The report cannot carry the hash of the commit that carries it. The hash is in the five-line reply, and `git log -1 lane/ai4dev-56/unit1` shows it.

## Checks

Every command ran from the worktree. The four static checks ran green before the stack sequence, and again after the one-line fix that the first integration run found, so the record below is the final run of each. Local time is UTC+3.

| Command | Start | End | Exit |
| --- | --- | --- | --- |
| `bun run db:stop` | 2026-09-06T10:56:59+03:00 | 2026-09-06T10:57:14+03:00 | 0 |
| `bun run db:start` | 2026-09-06T10:57:14+03:00 | 2026-09-06T10:57:51+03:00 | 0 |
| `bun run db:reset` | 2026-09-06T11:01:31+03:00 | 2026-09-06T11:02:07+03:00 | 0 |
| `bun run at:verify req-001 --tier integration --expect` (first run) | 2026-09-06T11:02:17+03:00 | 2026-09-06T11:05:44+03:00 | 1 |
| `bun run typecheck` | 2026-09-06T11:06:24+03:00 | 2026-09-06T11:06:41+03:00 | 0 |
| `bun run at:verify req-001 --tier integration --expect` (final run) | 2026-09-06T11:06:41+03:00 | 2026-09-06T11:10:08+03:00 | 0 |
| `bun install --frozen-lockfile` | 2026-09-06T11:10:56+03:00 | 2026-09-06T11:10:57+03:00 | 0 |
| `bun run at:check req-001` | 2026-09-06T11:10:57+03:00 | 2026-09-06T11:10:57+03:00 | 0 |
| `bun run at:selftest` | 2026-09-06T11:10:57+03:00 | 2026-09-06T11:11:06+03:00 | 0 |
| `bun run at:verify req-001 --tier loop --expect` | 2026-09-06T11:11:06+03:00 | 2026-09-06T11:11:08+03:00 | 0 |

The first integration run reported one deviation: AT-001.09 red, declared green. Its body compares the whole account row, and the row now carries `lifecycle`. The fix is one line in `_integration.ts` (`lifecycle: 'active'` in that assertion). The stack was started once and was not restarted. The stack is left running.

The migration applied on `db:reset` with no error. The integration run reported `8 migrations expected, 8 applied`.

### Last 20 lines: `bun install --frozen-lockfile`

```text
[0.09ms] ".env"
bun install v1.3.14 (0d9b296a)

Checked 547 installs across 651 packages (no changes) [118.00ms]
```

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
$ bunx vitest run --root tests/at --config vitest.config.ts harness/

 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56-unit1/tests/at


 Test Files  16 passed (16)
      Tests  235 passed (235)
   Start at  11:10:57
   Duration  9.24s (transform 2.76s, setup 0ms, import 3.78s, tests 21.20s, environment 2ms)

```

### Last 20 lines: `bun run at:verify req-001 --tier loop --expect`

```text
  AT-001.39    green    an acknowledgment missing any of name, title or attestation is rejected and records nothing
  AT-001.20    green    acknowledgment copy prohibits shared credentials and recommends an org email
  AT-001.21    green    one NGO cannot reach another NGO non-public data by UI or by direct id probing
  AT-001.22    green    an unassigned volunteer is denied a project non-public data while the public page stays visible
  AT-001.23    green    the assigned volunteer reaches that project working data, scoped to that project only
  AT-001.40    green    a platform admin reaches any NGO or project data — the admin role spans all accounts
  AT-001.24    red      CapabilityPending: CAPABILITY PENDING — ui.authenticated-surface-rendering
  AT-001.25    green    contact transfer moves ownership, deactivates the old account and preserves all history
  AT-001.26    green    the completed transfer leaves an audit record of who, when and why
  AT-001.27    green    lost-access recovery runs the same audited flow as contact transfer
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    red      AtPending: AT-001.29 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.30    red      AtPending: AT-001.30 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.31    red      AtPending: AT-001.31 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 30 green, 7 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-unit1\tests\at\expected\req-001.json exactly (30 declared green, 7 declared red)
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
WARN: no files matched pattern: supabase/seed.sql
Skipping migration .gitkeep... (file name must match pattern "<timestamp>_name.sql")
Skipping migration README.md... (file name must match pattern "<timestamp>_name.sql")
Restarting containers...
A new version of Supabase CLI is available: v2.116.0 (currently installed v2.110.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
WARN: environment variable is unset: SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID
WARN: environment variable is unset: SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET
A new version of Supabase CLI is available: v2.116.0 (currently installed v2.110.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
Finished [36msupabase db reset[39m on branch [36mmain[39m.
{"target":"local","version":"","message":"Reset local database."}
```

### Last 20 lines: `bun run at:verify req-001 --tier integration --expect (first run, exit 1)`

```text
  AT-001.23    green    the assigned volunteer reaches that project working data, scoped to that project only
  AT-001.40    green    a platform admin reaches any NGO or project data — the admin role spans all accounts
  AT-001.24    red      CapabilityPending: CAPABILITY PENDING — ui.authenticated-surface-rendering
  AT-001.25    green    contact transfer moves ownership, deactivates the old account and preserves all history
  AT-001.26    green    the completed transfer leaves an audit record of who, when and why
  AT-001.27    green    lost-access recovery runs the same audited flow as contact transfer
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    red      AtPending: AT-001.29 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.30    red      AtPending: AT-001.30 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.31    red      AtPending: AT-001.31 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 24 green, 13 red, 0 missing
  DEVIATION: AT-001.09 — declared green, reported red: AssertionError: the completed ngo account does not carry the ngo global type: expected { …(3) } to deeply equal { …(2) }
  DEVIATION: the report counts 13 failed tests but the declaration declares 12 reds — a failure outside the declared ids (an untagged test, a failing hook) looks exactly like this
  DEVIATION: the report counts 24 passed tests but the declaration declares 25 greens
  EXPECT FAILURE: 3 deviation(s) from the declaration. A red that turned green is a failure too — if reality improved, update the declaration in the same change.
error: script "at:verify" exited with code 1
```

### Last 20 lines: `bun run at:verify req-001 --tier integration --expect (final run, exit 0)`

```text
  AT-001.39    green    an acknowledgment missing any of name, title or attestation is rejected and records nothing
  AT-001.20    green    acknowledgment copy prohibits shared credentials and recommends an org email
  AT-001.21    green    one NGO cannot reach another NGO non-public data by UI or by direct id probing
  AT-001.22    green    an unassigned volunteer is denied a project non-public data while the public page stays visible
  AT-001.23    green    the assigned volunteer reaches that project working data, scoped to that project only
  AT-001.40    green    a platform admin reaches any NGO or project data — the admin role spans all accounts
  AT-001.24    red      CapabilityPending: CAPABILITY PENDING — ui.authenticated-surface-rendering
  AT-001.25    green    contact transfer moves ownership, deactivates the old account and preserves all history
  AT-001.26    green    the completed transfer leaves an audit record of who, when and why
  AT-001.27    green    lost-access recovery runs the same audited flow as contact transfer
  AT-001.28    green    concierge onboarding stores one non-login escalation contact for the NGO
  AT-001.35    green    an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow
  AT-001.29    red      AtPending: AT-001.29 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.30    red      AtPending: AT-001.30 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.31    red      AtPending: AT-001.31 PENDING [sut-missing] — REQ-001 D6.L2 (the lifecycle gate every write route registers through) has not landed
  AT-001.32    green    attaching a second volunteer to a project is rejected — single-dev projects
  AT-001.33    red      AtPending: AT-001.33 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  AT-001.34    red      AtPending: AT-001.34 PENDING [sut-missing] — REQ-001 D6.L3 (the append-only audit for role changes and transfer, and sign-in rate limiting) has not landed
  37 P0: 25 green, 12 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-56-unit1\tests\at\expected\req-001.json exactly (25 declared green, 12 declared red)
```

## The commit hash

The commit is the one commit on `lane/ai4dev-56/unit1` above `229dc8d`. Its hash is in the five-line reply. The report is inside that commit, so the hash cannot be written here.

## Open doubts

1. The refusal branches `holds-other-seats`, `transferee-no-account`, `transferee-not-ngo` and `transferee-deactivated` have no acceptance id. They exist in `decideContactTransfer` and in the definer. The gate selftest does not reach them. This doubt is closed for the TypeScript decisions by the selftest in the section "Selftest added" below; the definer branches remain proven by reading only.
2. The integration bodies of AT-001.26 and AT-001.27 accept an audit instant within 60 seconds of the harness window. A container clock that drifts more than that makes those two ids flake at the integration tier.
3. `write_standing` is one `stable` definer that the edge calls once per write. It reads the caller, the organisation, the seat holder, the seat holder's other seats and the subject in one query. If a later unit needs more standing, the JSON shape and `parseWriteStanding` must change together.
4. The lifecycle assert lives in `create_organization` and `update_organization` as a restatement of both function bodies. A change to those bodies in another unit must start from this migration's text, not from the earlier one.
5. The demo keys in the `db:start` output above are the public keys of every local Supabase stack; they are already in a tracked file of this item.

## Selftest added

The coordinator accepted the diff on one condition: open doubt 1 must close. `tests/at/harness/shipped-admin-operations.selftest.ts` drives `decideContactTransfer` and `decideEscalationContact` directly with hand-built `WriteRouteInput` values. It has 24 cases. Every case asserts the exact kind, status and arguments.

The transfer cases: the admitted shape; the trimmed arguments; `refused` 502 with no caller standing; `invalid-request` 400 for a missing organisation, a missing outgoing account, a missing new contact, a missing reason, and a self-transfer; `no-such-organisation` 409; `not-the-current-contact` 409; `holds-other-seats` 409 with `fields.organizations` naming the other seats and not the one being transferred; `transferee-no-account` 409; `transferee-not-ngo` 409; `transferee-deactivated` 409; the order of the checks.

The escalation cases: the admitted shape; the null phone; the trimmed fields; `refused` 502 with no caller standing; `invalid-request` 400 for a missing organisation; `invalid-contact` 400 for a blank, missing or non-string name; `invalid-contact` 400 for an email with no `@` and for a blank, missing or non-string one; `no-such-organisation` 409; the order of the checks.

| Command | Start | End | Exit |
| --- | --- | --- | --- |
| `bun run typecheck` | 2026-09-06T11:20:47+03:00 | 2026-09-06T11:20:55+03:00 | 0 |
| `bun run at:selftest` | 2026-09-06T11:20:55+03:00 | 2026-09-06T11:21:05+03:00 | 0 |

The selftest run counts 17 files and 259 tests; before the addition it counted 16 files and 235 tests. The one commit is amended with the same message.

### Last 20 lines: `bun run typecheck (after the selftest)`

```text
$ bun tests/at/typecheck.ts

=== typecheck: app (tsconfig.json) ===

=== typecheck: acceptance tests (tests/at/tsconfig.json) ===

=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===

typecheck OK: all three projects clean
```

### Last 20 lines: `bun run at:selftest (after the selftest)`

```text
$ bunx vitest run --root tests/at --config vitest.config.ts harness/

 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56-unit1/tests/at


 Test Files  17 passed (17)
      Tests  259 passed (259)
   Start at  11:20:56
   Duration  9.11s (transform 2.56s, setup 0ms, import 3.55s, tests 20.60s, environment 2ms)

```
