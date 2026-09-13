# Unit 1: capture title, description and urgency; only the NGO admin starts a need

You are the writer lane for unit 1 of the project need intake run. You work alone in a dedicated
git worktree, in `isolated-write` mode. Every path below is relative to the worktree root. Use
PowerShell syntax when you shell out, never Bash syntax. Do not run `git commit`, `git push`,
`bun run db:start` or `bun run db:stop`. The local Supabase stack is up; leave it up. Never paste
the output of `bun run db:start` anywhere.

## Read first, in this order

1. `loop/items/AI4DEV-120/design/SYNTHESIS.md`. The design of record. It wins over everything.
2. `loop/items/AI4DEV-120/design/candidate-2-project-row.md`. The base design; SYNTHESIS corrects it.
3. `loop/items/AI4DEV-120/how/explanation.md`. The thirty constraints and the tree's frame.
4. `loop/items/AI4DEV-120/brief.md`, "Facts from the repository" and Unit 1.
5. `.taskmaster/docs/acceptance/at-req-003.md`. The thirteen ids.
6. `tests/at/suites/req-002/` in full, and `tests/at/expected/req-002.json`, `tests/at/expected/README.md`.
7. `supabase/functions/set-organization-profile/index.ts`, `supabase/functions/_shared/write-routes.ts`,
   `edge.ts`, `memberships.ts`, `public-project.ts`, `tenant-reads.ts`,
   `supabase/functions/project-workspace/index.ts`, `supabase/functions/public-project/index.ts`.
8. `supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql`,
   `20260906120000_tenant_read_posture_and_org_member_policies.sql`,
   `20260914120000_org_vetting.sql`, `20260916120000_discovery_allowance.sql`.
9. `tests/at/suites/req-001/_policy-scan.ts`, `_write-route-scan.ts`, `_fixture.ts`,
   `d-tenant-isolation.test.ts` line 142; `tests/at/harness/shipped-tenant-reads.selftest.ts` lines 67 and 147.

## What this unit lands

The scaffold every later unit inherits, and the three capture ids green at both tiers.

1. Migration `supabase/migrations/20260917120000_project_need_intake.sql`: the enums `need_stage`
   and `need_urgency`; the unique index on `projects (id, org_id)`; `public.need_intakes` with
   `org_id` and the composite foreign key (SYNTHESIS correction 1), the check constraints of
   candidate 2 lines 97 to 110, the posture (revoke, RLS, grant select to authenticated, three
   policies with no subquery in USING), the monotonic classification trigger (correction 3);
   `read_public_project` redefined with `need_stage` (correction 2); `public.project_need` with
   the `start` arm only and `public.need_intake_view`. Every SECURITY DEFINER: `set search_path
   = ''`, `assert_account_active` first, revoke execute from public, grant to service_role only.
   `start` calls `has_platform_acknowledgment` and raises `platform-acknowledgment-missing` when
   false. Actions other than `start` raise `invalid-request` for now; unit 2 adds them.
2. `supabase/functions/_shared/need-intake.ts` and `need-intake-copy.ts` per candidate 2's
   `_shared` modules section with corrections 5, 8 and 9. Land every exported signature the
   design names; a body a later unit fills may throw `new Error('not landed: unit N')`.
3. `supabase/functions/_shared/write-routes.ts`: the `project-need` edge row and the three refusal
   kinds. `edge.ts`: `callerReads` gains `need(projectId)` and returns `TenantReads & NeedReads`;
   `TenantReads` does not change. `public-project.ts`: `need_stage` on the source,
   `projectIsPublic` is `source.need_stage === null`.
4. `supabase/functions/project-need/index.ts` and `supabase/functions/need-intake/index.ts`, ten
   lines each in the `set-organization-profile` and `project-workspace` shapes. `supabase/config.toml`
   gains `[functions.project-need]` and `[functions.need-intake]` with `verify_jwt = true`.
5. `tests/at/suites/req-001/_policy-scan.ts`: `TENANT_CATALOG` gains `need_intakes:
   'tenant-isolated'`. The three REQ-001 sites of correction 2 gain `need_stage: null`.
6. `tests/at/harness/suite-adapters.ts`: the `'req-003'` line.
7. `tests/at/suites/req-003/`: `_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`,
   `_pending.ts`, `_source-need.ts`, and all six test files with exactly thirteen `atTest` call
   sites. The three capture ids have real bodies. The other ten call `awaiting(AWAITED.<unit>)`
   with the per-unit names `intake.gate-and-autosave` (03, 05), `intake.labels` (17),
   `intake.reference-files` (07, 09), `intake.tier2-disclosure` (10), `intake.submission` (11,
   12), `intake.snapshot` (14, 16). AT-003.05, .07, .09 and .10 register with `surface: 'ui'`.
   `tests/at/harness/req003-need-oracles.selftest.ts` proves the source arm can fail on
   injected text.
8. `tests/at/expected/req-003.json`: `"requirement": "003"`, both tiers, 01, 02, 04 green at both,
   the other ten red at both on the `intake.*` names above, in the exact shape of
   `tests/at/expected/req-002.json`.

The loop fixture composes REQ-002's fixture for provisioning, roles and the allowance read and
keeps its own maps, as candidate 2 line 330 says. The live adapter posts with `functionPost` and
reads with `sqlClient`. `attemptNeedDefinerAsOperator` calls `public.project_need` directly.
`publicProjectPage` runs the deployed `public-project` route at integration and the shipped
`publicProjectAnswer` over a source with `need_stage` at loop.

## Checks, in this order, all green before you report

```
bun run typecheck
bun run at:check req-003
bun run at:selftest
bun run at:verify req-003 --tier loop --expect
bun run at:verify req-001 --tier loop --expect
bun run at:verify req-002 --tier loop --expect
bun run at:verify req-016 --tier loop --expect
bun run at:verify req-003 --tier integration --expect
bun run at:verify req-001 --tier integration --expect
bun run at:verify req-002 --tier integration --expect
bun run at:verify req-016 --tier integration --expect
```

Measured before you started: your sandbox runs `bun run typecheck` and `bun run at:check` but refuses vitest, so `at:selftest` and every `at:verify` fail with `Cannot read directory "../../../../..": Access is denied`. Run the first two yourself. For the rest, write the suite against the REQ-002 precedent with care, say in your report that you could not run them, and the lead runs them and sends the reds back.

An integration run resets the stack. A check that starts while the stack restarts reports every
id red with a 502 from provisioning; that is the environment, run it again. If a command cannot
run in your sandbox, say so with the exact error and do not claim the check.

## Must not

- No column named `lifecycle`, `state` or `status` on `projects`. No name that holds `project`
  together with `lifecycle`, `state`, `status`, `publish`, `triage`, `scoped` or `visibility`.
- No `storage.from(`, `createBucket(`, `createSignedUrl(`, no `bytea`, no column from the list in
  `tests/at/suites/req-002/_source-documents.ts` lines 25 to 43, no `'application/pdf'` string.
- No `deliver(`, no notification, no taxonomy row, no `_shared/lifecycle.ts`.
- No fourth `viewer_*` helper. No change to `write_standing`. No stand-in inventory row.
- Nothing under `src/`. No new harness sentinel, fault, vendor sim, fixture world or capability.
- No numerals 10 or 30 in a test body for the grants.
- No string that calls an organisation "verified" without the word email, jwt or token.
- Comments only for a non-obvious why. No phase narration.

## Report

Your reply is your report; the runner captures it. Give: the files created and changed; each
check with its exit code and its green and red counts; every deviation from SYNTHESIS with the
reason; every open problem. Under two hundred lines.
