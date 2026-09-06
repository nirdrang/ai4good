# Unit 1 lane: contact transfer, lost-access recovery, escalation contact, and the write boundary they need

You are the hardest-tasks writer lane. You work only in the worktree you were started in. You edit, run the checks, and commit there. You do not push, and you do not touch any other worktree or the primary checkout. Reply with five lines at the end (see Report); everything else goes to the report file.

## Read first, in this order

1. `loop/items/AI4DEV-56/brief.md`, unit 1 and facts 1 to 13.
2. `loop/items/AI4DEV-56/artifacts/arena/design.md`. This is the design you implement. Its sketches are the contract: `WRITE_ROUTES`, `WriteStanding`, `writeGateDecision` and its five ordered checks, `writePipeline`, `writeRoute`, `loadWriteStanding`, the SQL objects, the transfer row by row, the refusal shapes on the wire, and the per-id table. Where the sketch says `not implemented`, you implement it. Where you must deviate, say so in the report with the reason.
3. `loop/items/AI4DEV-56/artifacts/how/rulings.md` (R1 to R15) and `loop/items/AI4DEV-56/artifacts/how/explanation.md` (how the write path, the harness, the two tiers and the pending machinery work today).
4. The code the design names: `supabase/functions/_shared/edge.ts`, `caller.ts`, `accounts.ts`, `memberships.ts`, the three write routes, the migrations under `supabase/migrations/`, `tests/at/suites/req-001/_contract.ts`, `_fixture.ts`, `_live.ts`, `_integration.ts`, `_pending.ts`, `_policy-scan.ts`, `e-admin-operations.test.ts`, `tests/at/expected/req-001.json`, `.taskmaster/docs/acceptance/at-req-001.md` sections F and H, `tests/at/harness/live-stack.ts`.

## Scope of this unit (one commit group)

Everything unit 1 needs lands here, and nothing that belongs to a later unit (R13: no later unit reopens a route this unit ships).

**SQL, one migration** `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql`, per the design's migration sketch, minus the role-change trigger (`org_membership_role_change_audit`), which unit 3 adds in its own migration. So: the `account_lifecycle` enum and column; the index on `org_memberships (account_id, org_id)`; `audit_event_kind`; `audit_events` with `reason not null`, no foreign keys, the two check constraints, `revoke all` from `anon, authenticated` and from `service_role`, row level security with no policy; `org_escalation_contacts` the same way; the append-only row trigger and the statement-level TRUNCATE trigger; `assert_account_active` with `for share` and no grant; `write_standing` (stable, granted to `service_role`); `append_audit_event` and `change_account_lifecycle` (internal, no grant); `transfer_organization_contact` and `set_escalation_contact` (granted to `service_role`); `create_organization` and `update_organization` recreated with `perform public.assert_account_active(p_account_id)` first and their revoke and grant restated; `notify pgrst, 'reload schema'`. `set_account_lifecycle` is unit 2; do not add it. The transfer definer writes two audit rows itself (`org_contact_transferred` with the reason, and `account_lifecycle_changed` through `change_account_lifecycle`); with no trigger yet there is no third row.

**Shared pure modules** under `supabase/functions/_shared/`: `write-routes.ts` (the inventory with the seven rows from the design including the `discovery-message` stand-in and the `set-account-lifecycle` row, `WriteStanding` and its fail-closed parser, `writeGateDecision`, `writePipeline`, `typeRefusalKind`), `admin-operations.ts` (`decideContactTransfer`, `decideEscalationContact`, the two field selectors, `validateEscalationContact`), `accounts.ts` gains `AccountLifecycle`, `parseAccountLifecycle`, `decideSignupCompletion`, `decideOrganizationCreation`; `memberships.ts` gains `decideOrganizationRename`. The `set-account-lifecycle` inventory row exists so the type is complete; its route directory is unit 2's, and until then the scan (unit 2) does not run, so nothing fails on the missing directory. Keep the header comment posture of `accounts.ts` (the rule stated once in TypeScript, the SQL backstop named).

**Edge**: `edge.ts` gains `writeRoute` and `loadWriteStanding`; `callDatabaseFunction` stops being exported. The three existing routes are rewritten to the four-line shape. Two new routes: `transfer-organization-contact` and `set-escalation-contact`, each with a `[functions.<name>]` block with `verify_jwt = true` in `supabase/config.toml`. `complete-signup` keeps its GitHub stats step inside its `decide` or an `args` step, whichever the design's `WriteRouteSpec` accommodates; say which in the report.

**Harness**: `AccountsSut` in `_contract.ts` gains `transferOrganizationContact`, `setEscalationContact`, `auditEvents`, `escalationContact`, and `AccountRow` gains `lifecycle`; `_fixture.ts` and `_live.ts` implement them (the fixture imports the shipped `writePipeline` and the shipped decisions, as the design's "Why the pipeline is not stated twice" requires; the live adapter drives the deployed routes and reads the audit and escalation tables as the operator). `TENANT_CATALOG` in `_policy-scan.ts` gains `audit_events` and `org_escalation_contacts` as `unreachable-by-client-roles`; check the two lists in `_integration.ts` the design names and change them only if the live catalog walk needs it. `attemptWrite`, `setAccountLifecycle`, `attemptAuditTamper`, `unlinkGithubIdentity` and `linkedIdentities` are later units; do not add them.

**Acceptance bodies**: AT-001.25, .26, .27, .28 and .35 in `e-admin-operations.test.ts`, green at both tiers, with the Given, act and assertion of the design's per-id table, and the R15 narrowing stated in AT-001.28's body. Replace their pending bodies; remove the `LEAF` keys in `_pending.ts` those ids no longer need (read the file's rules on the ledger first); move the five ids from red to green in `tests/at/expected/req-001.json` at both tiers. Every refusal test also checks that the intended write did not happen.

**Selftests**: a shipped-module selftest under `tests/at/harness/` for `writeGateDecision` (every ordered check, every admitted shape, the fail-closed parser), named like its neighbours (`shipped-*.selftest.ts`).

## Rules you must keep

- The harness takes no new machinery: no new sentinels, faults, vendor stand-ins, fixture worlds, or capabilities. Reuse `CapabilityPending` and `AtPending` as they are; unit 1 needs neither.
- Every new table passes the static scan as grown by unit 4 (already on your branch): baseline revoke names `anon, authenticated, service_role`; no client write privilege; `revoke execute ... from public` on every new function.
- Refusal kinds travel on the wire as the design's table says (R10). A definer backstop refusal carries its kind in `RAISE ... USING DETAIL`; `RpcOutcome` gains `details`, and a pure fail-closed parser maps it.
- No comment narrates what the code shows. A comment only carries a non-obvious why. No `// Phase 1` style comments in tests; the assertion message is the documentation.
- Every changed line traces to this unit. Do not reformat neighbours.
- ASD-STE100 in every sentence a person reads: short sentences, active voice, one meaning per word.
- Do not name any Linear id other than AI4DEV-56 anywhere in a commit message.

## Checks, all green before you commit

```
bun install --frozen-lockfile
bun run typecheck
bun run at:check req-001
bun run at:selftest
bun run at:verify req-001 --tier loop --expect
```

Then the integration tier, which needs the one local stack to serve YOUR worktree's functions and migrations. From your worktree run, in this order, and keep the output:

```
bun run db:stop
bun run db:start
bun run db:reset
bun run at:verify req-001 --tier integration --expect
```

`db:reset` replays all migrations; a migration error is your defect. The integration run resets the database again itself. If the stack fails to start, report it and stop; do not retry more than twice. When you are done, leave the stack running; the lead restarts it from the primary checkout.

## Commit

One commit (squash if you made several), message exactly:

```
AI4DEV-56: contact transfer, lost-access recovery, the escalation contact, and the write boundary

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01X4L1LDLGqdutW5cMaJsaaG
```

## Report

Write `loop/items/AI4DEV-56/artifacts/lanes/unit1-report.md` in your worktree before the commit, so it is in the commit: files changed and why, deviations from the design with reasons, each check command with its exit code and the last 20 lines of output including the integration run's timestamps, the commit hash, open doubts. Reply with exactly five lines: the commit hash; the six check results as `name: exit code`; one sentence naming any deviation from the design; one sentence on the biggest doubt; the report path.
