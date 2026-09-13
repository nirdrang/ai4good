# Unit 7: the raw-intake snapshot is retained at submission and unchanged by later edits

You are the writer lane for unit 7 of the project need intake run, the last unit. You work alone
in a dedicated git worktree, in `isolated-write` mode. Every path below is relative to the
worktree root. Use PowerShell syntax when you shell out, never Bash syntax. Do not run
`git commit`, `git push`, `bun run db:start` or `bun run db:stop`. The local Supabase stack is
up; leave it up. Never paste the output of `bun run db:start` anywhere.

Units 1 to 6 have landed and are green. You apply a fixed contract; you design nothing.

## Read first, in this order

1. `loop/items/AI4DEV-120/design/SYNTHESIS.md`: correction 4 (line 58, the partial unique
   index), correction 10, decision 7, the unit 7 migration line.
2. `loop/items/AI4DEV-120/design/candidate-2-project-row.md` lines 80 to 84, 141 to 149, 201
   to 208, 287 to 288, 330, 362, 423.
3. `loop/items/AI4DEV-120/brief.md`, the Unit 7 block.
4. `.taskmaster/docs/acceptance/at-req-003.md`, AT-003.14 and AT-003.16.
5. `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql` lines
   11 to 26 (the enum and `audit_events`) and its append-only trigger further down;
   `20260914110000_audit_event_kind_org_vetting.sql` (the one-line enum migration, your shape
   for the first file); `20260914120000_org_vetting.sql` lines 1 to 57 (the seven-argument
   `append_audit_event`, the `p_occurred_at` argument).
6. `supabase/migrations/20260917130000_project_need_save_and_submit.sql`, `need_intake_submit`.
7. `supabase/functions/_shared/need-intake.ts`: `IntakeSnapshot`, the two stubs, `NeedIntakeView`.
8. `tests/at/suites/req-003/_contract.ts` (`IntakeSnapshotRow`), `_fixture.ts` (the `commit`
   function's `submit` arm), `_live.ts`, `_pending.ts`, `e-submission.test.ts` (the shape),
   `tests/at/expected/req-003.json`.
9. `tests/at/suites/req-002/_live.ts`, the `audit_events` select (search for `audit_events`):
   the column list and the detail parse are your precedent.

## What this unit lands

AT-003.14 and AT-003.16 green at both tiers. With them, thirteen green at loop and ten at
integration; the three integration reds stay on their capability names.

1. Migration `supabase/migrations/20260919110000_audit_event_kind_need_intake.sql`, one
   statement: `alter type public.audit_event_kind add value 'need_intake_submitted';`. Its own
   file, because a new enum value cannot be used in the transaction that adds it.
2. Migration `supabase/migrations/20260919120000_project_need_snapshot.sql`:
   - `create or replace function public.need_intake_submit(v_need public.need_intakes,
     p_account_id uuid) returns boolean`, same posture as unit 2's. Body: stage already
     `discovery_in_progress` returns false; the description gate raises `missing-description`
     (P0001) as today; then `v_submitted_at := clock_timestamp()`; the update sets `stage` and
     `submitted_at = v_submitted_at`; then `perform public.append_audit_event(
     'need_intake_submitted', p_account_id, null, v_need.org_id, 'need intake submitted',
     jsonb_build_object('project_id', v_need.project_id, 'org_id', v_need.org_id, 'title',
     <projects.name for v_need.project_id>, 'description', v_need.description, 'urgency',
     v_need.urgency, 'reference_files', v_need.reference_files, 'submitted_at',
     v_submitted_at), v_submitted_at);` returns true. Same transaction as the stage change; the
     definer that calls this helper owns the audit writer's grant.
   - `create unique index audit_events_need_intake_snapshot_once on public.audit_events
     ((detail->>'project_id')) where event_kind = 'need_intake_submitted';`
   - `notify pgrst, 'reload schema';`. No change to `project_need`.
3. `supabase/functions/_shared/need-intake.ts`:
   - `intakeSnapshotOf(need)` builds `IntakeSnapshot` from the view, snake_case keys, the
     `reference_files` entries mapped back to snake_case, `submitted_at: need.submittedAt`.
   - `intakeSnapshotFromDetail(detail)` parses unknown jsonb into `IntakeSnapshot` or `null`:
     every key present with the right type, `reference_files` a list of well-typed entries,
     `urgency` null or one of `NEED_URGENCIES`. No throw.
   - Correction 10 binds the two: the SQL detail and `intakeSnapshotOf` are one shape.
4. `tests/at/suites/req-003/_fixture.ts`: a `snapshots: IntakeSnapshotRow[]` list. The `commit`
   function's `submit` arm, when the transition changes, appends one row `{ id:
   crypto.randomUUID(), occurredAt: <the submittedAt>, actorAccountId: args.p_account_id,
   actorLabel: 'ngo:' + args.p_account_id, subjectOrgId: need.organizationId, reason: 'need
   intake submitted', detail: intakeSnapshotOf(submitted) }`. `intakeSnapshots(projectId)`
   returns clones of the rows whose `detail.project_id` matches, in insertion order. Teardown
   clears the list.
5. `tests/at/suites/req-003/_live.ts`: `intakeSnapshots(projectId)` selects `id, occurred_at,
   actor_account_id, actor_label, subject_org_id, reason, detail` from `public.audit_events`
   where `event_kind = 'need_intake_submitted' and detail->>'project_id' = <id>`, ordered by
   `occurred_at, id`, maps to `IntakeSnapshotRow` with `intakeSnapshotFromDetail`, and throws
   when a detail does not parse.
6. `tests/at/suites/req-003/f-snapshot.test.ts`, inside a `describe`, both real bodies:
   - AT-003.14: provision an email-verified admin, start a need with title, description and
     urgency, attach one file, submit; `intakeSnapshots` returns exactly one row; its `detail`
     `toEqual(intakeSnapshotOf(submitted.need))`; `detail.submitted_at` equals
     `submitted.need.submittedAt`; `actorAccountId` is the admin's account id; `subjectOrgId`
     is the organisation; `reason` is non-empty. Before submission the list is empty.
   - AT-003.16: same start and submit, keep the one row; then `saveNeed` a new description and
     a new urgency, `attachReferenceFile` a second file, submit again (`changed: false`); the
     list still equals the earlier one-row list exactly (`toEqual`), and the working view now
     differs from the snapshot in description, urgency and file count. A second need of the
     same organisation submitted afterwards has its own single row and leaves the first
     untouched.
7. `tests/at/suites/req-003/_pending.ts`: drop `snapshot` from `AWAITED`. The three capability
   names stay.
8. `tests/at/expected/req-003.json`: AT-003.14 and .16 green at both tiers. Every other row
   unchanged.

## Checks, in this order

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

Measured: your sandbox runs `bun run typecheck` and `bun run at:check` but refuses vitest with
`Cannot read directory "../../../../..": Access is denied`. Run the first two yourself and make
them green. Do not claim the rest; say you could not run them. The lead runs them.

## Must not

- No update or delete on `audit_events` anywhere; no second immutability trigger; no snapshot
  column on `need_intakes`.
- No change to `project_need`, `need_intake_save`, `need_intake_attach`, `need_intake_view`, the
  `need_intakes` table or its policies. No change to `append_audit_event`.
- The enum value lives in its own migration file, and nothing else is in that file.
- No `deliver(`, no notification. No `_shared/lifecycle.ts`.
- No column named `lifecycle`, `state` or `status` on `projects`. No name that holds `project`
  together with `lifecycle`, `state`, `status`, `publish`, `triage`, `scoped` or `visibility`.
- No `'application/pdf'` string, no storage call, no `bytea`.
- No numerals 10 or 30 in a test body for the grants.
- No string that calls an organisation "verified" without the word email, jwt or token.
- No new harness sentinel, fault, vendor stand-in, fixture world or capability.
- Comments only for a non-obvious why. No phase narration.

## Report

Your reply is your report; the runner captures it. Give: the files created and changed; each
check with its exit code and its counts, or the exact error where it could not run; every
deviation from SYNTHESIS with the reason; every open problem. Under one hundred lines.
