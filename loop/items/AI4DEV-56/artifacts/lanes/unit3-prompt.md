# Unit 3 lane: the append-only audit for role changes and contact transfer, and the sign-in rate limit declared

You are a feature writer lane. You work only in the worktree you were started in (branch `lane/ai4dev-56/unit3`). You edit, run the checks, and commit there. You do not push, and you do not touch any other worktree. Reply with five lines at the end (see Report); everything else goes to the report file.

## Read first, in this order

1. `loop/items/AI4DEV-56/brief.md`, unit 3 and unit 6, and facts 1 to 13.
2. `loop/items/AI4DEV-56/artifacts/arena/design.md`: the migration sketch's `org_membership_role_change_audit` trigger, section 6 (the transfer row by row, including the audit rows), section 9 rows .33 and .34, section 10 (`attemptAuditTamper`), and "Unit 6 is a record".
3. `loop/items/AI4DEV-56/artifacts/how/rulings.md` R3, R9, R11, R12.
4. `loop/items/AI4DEV-56/unit6-record.md` and the measurements it cites under `loop/items/AI4DEV-56/artifacts/measure/` (`unit6-signin-rate-limit.txt`, `unit6-auth-container-env.txt`, `hook-push-probe.txt`).
5. `loop/items/AI4DEV-56/artifacts/lanes/unit1-report.md` and `unit2-report.md`: what units 1 and 2 landed. Both are on your branch. The audit table, `append_audit_event`, `change_account_lifecycle` and the transfer definer are in `supabase/migrations/20260908120000_...sql`; the SUT members `auditEvents`, `transferOrganizationContact`, `setAccountLifecycle`, `repointMembershipAsOperator` and the operator Givens are in `tests/at/suites/req-001/_contract.ts`, implemented in `_fixture.ts` and `_live.ts`; the integration bodies live in `_integration.ts`; the pending ledger is `_pending.ts`; the manifest is `tests/at/expected/req-001.json`; the acceptance text is `.taskmaster/docs/acceptance/at-req-001.md` section H.

## Scope of this unit (one commit group)

**The role-change trigger.** Migration `supabase/migrations/20260910120000_org_membership_role_change_audit.sql`: the trigger function `org_membership_role_change_audit()` (security definer, `set search_path = ''`, `revoke execute from public`) and the trigger `org_memberships_role_change_audit` AFTER INSERT OR UPDATE on `org_memberships` FOR EACH ROW. It reads the actor from `current_setting('app.actor_account_id', true)` (the transfer definer already sets it; `create_organization` and `complete_signup` do not, so their inserts record `operator` unless you set it there too, and you must decide and state which: the design's R9 accepts a trigger-written row with no actor). It writes one `org_role_changed` row through `append_audit_event` with `subject_account_id = new.account_id`, `subject_org_id = new.org_id`, `reason` = `membership granted` on INSERT, `seat repointed` when `account_id` changed, `role changed` otherwise, and `detail` carrying old and new role and account. An UPDATE that changes nothing writes nothing. The migration ends with `notify pgrst, 'reload schema'`.

**AT-001.33** in `f-lifecycle-and-audit.test.ts`, per the design's row: Given a transfer (unit 1's Given, reuse `transferGiven` from `_integration.ts`) plus an operator role change through `repointMembershipAsOperator` or a role update as the operator; the assertions: rows exist for the transfer (`org_contact_transferred` and `account_lifecycle_changed`, written by the definer) and for the role change (`org_role_changed`, written by the trigger, with `actorAccountId === null` and `actorLabel === 'operator'` on the operator path, R9); then `attemptAuditTamper('update' | 'delete' | 'truncate')`, a new `AccountsSut` member the operator uses to try to alter the record, is refused each time and every row survives; and at integration the table's privileges for `anon`, `authenticated` and `service_role` are empty (read `tenantTableFacts` or the exact-set assertion `_integration.ts` already makes for the catalog and reuse it). The fixture mirrors the trigger and the append-only refusal in `_fixture.ts`, labelled as a mirror the way every operator mirror there is; the live adapter runs the real UPDATE, DELETE and TRUNCATE as the operator and reports the refusal. Green at both tiers.

**AT-001.34** declared red at both tiers: the body opens a world and then throws `CapabilityPending(['vendors.gotrue-sign-in-rate-limit'])` (R11: the local limiter does not throttle, measured; the vendor's limiter is verified on the hosted platform). Say in the body's comment, in one sentence, where the limit is verified instead and cite `loop/items/AI4DEV-56/unit6-record.md`. Declare it `capability-pending` with that one string in `tests/at/expected/req-001.json` at both tiers.

**Bookkeeping.** Replace the two pending bodies; remove `LEAF.D6_L3` from `_pending.ts` and update its counts and header text; `expected/req-001.json` moves .33 to green at both tiers and .34 to `capability-pending` at both tiers. Write `loop/items/AI4DEV-56/pending-ledger.txt` (the pending-ledger convention `_pending.ts`'s header describes): every REQ-001 id still red after this unit, its tier, its declared shape and capability or leaf, one line each. Do not invent ids; read the manifest.

Nothing else: no identity trigger (unit 5), no product sign-in counter, no hook.

## Rules you must keep

- The harness takes no new machinery: no new sentinels, faults, vendor stand-ins, fixture worlds. `vendors.gotrue-sign-in-rate-limit` is the declared capability the rulings name; reuse `CapabilityPending`.
- The new migration passes the static scan: `revoke execute ... from public` on the trigger function; it creates no table.
- Every changed line traces to this unit. Do not reformat neighbours. No narrating comments; a comment only for a non-obvious why. ASD-STE100 in every sentence a person reads.
- Do not name any Linear id other than AI4DEV-56 in the commit message.

## Checks, all green before you commit

```
bun run typecheck
bun run at:check req-001
bun run at:selftest
bun run at:verify req-001 --tier loop --expect
```

Then the integration tier on the one local stack, from your worktree, in this order, keeping the output:

```
bun run db:stop
bun run db:start
bun run db:reset
bun run at:verify req-001 --tier integration --expect
```

If the stack fails to start, report it and stop; do not retry more than twice. Leave the stack running when done.

## Commit

One commit (squash if several), message exactly:

```
AI4DEV-56: the append-only audit for role changes and contact transfer, and the sign-in rate limit declared

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01X4L1LDLGqdutW5cMaJsaaG
```

## Report

Write `loop/items/AI4DEV-56/artifacts/lanes/unit3-report.md` in your worktree before the commit: files changed and why, the actor decision for product membership inserts, deviations from the design with reasons, each check command with its exit code and the last 20 lines of output including the integration run's timestamps, open doubts. Reply with exactly five lines: the commit hash; the eight check results as `name: exit code`; one sentence naming any deviation from the design; one sentence on the biggest doubt; the report path.
