# Review fixes: the eight act-on groups of the five-lane review

You are the writer lane for the review fixes of the project need intake run. You work alone in a
dedicated git worktree, in `isolated-write` mode. Every path below is relative to the worktree
root. Use PowerShell syntax when you shell out, never Bash syntax. Do not run `git commit`,
`git push`, `bun run db:start` or `bun run db:stop`. The local Supabase stack is up; leave it up.
Never paste the output of `bun run db:start` anywhere.

All seven units have landed and are green. Every edit below is decided; you apply it. Read
`loop/items/AI4DEV-120/review/VERDICT.md`, section "Act on", for the reasoning behind each one.
The branch is unmerged, so its own migration files may be edited in place; merged migrations
(anything dated before 20260917) may not.

## The edits

1. `supabase/functions/_shared/write-routes.ts`: add `export function uuidField(value: unknown):
   string | null` beside `stringField`: the trimmed string when it matches
   `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`, else `null`. One
   doc line in the shape of `stringField`'s.
2. `supabase/functions/_shared/need-intake.ts`:
   - `decideProjectNeed`: `projectId` for `save`, `submit` and `attach` goes through `uuidField`;
     a null answers `refuseWrite('invalid-request', 400, 'a need write must name the project as
     a uuid')`.
   - `applyNeedPatch(need, patch, now: string)`: the third argument replaces `new Date()`;
     `updatedAt: now` when changed. No other clock read remains in the module.
3. `supabase/functions/need-intake/index.ts`: replace the private `UUID` regex and the trim line
   with `uuidField(body.value.projectId)`; a null answers the same 400 sentence as today.
4. `supabase/migrations/20260917120000_project_need_intake.sql`:
   - Delete the policy `need_intakes_select_assigned_volunteer` (the whole `create policy`
     statement). The org-member and platform-admin policies stay.
   - In `need_intake_classification_is_monotonic`, the raise gains `detail =
     'tier2-classification-immutable'` beside its errcode.
   - After the new `read_public_project` definition, restore the catalog comment: `comment on
     function public.read_public_project(uuid) is 'The public project page source: project id,
     project name, organisation name, need stage (REQ-001, AT-001.22; REQ-003).';`
5. `supabase/migrations/20260917130000_project_need_save_and_submit.sql`, `need_intake_save`:
   the title guard becomes `if v_title is null or v_title = '' then`.
6. `supabase/migrations/20260918120000_project_need_attach.sql`, the live `project_need`: the
   admin refusal sentence becomes `'project_need refuses %: only the admin of organisation % may
   write a need'`. Leave the two earlier definitions alone; they are replaced.
7. `supabase/migrations/20260919120000_project_need_snapshot.sql`, `need_intake_submit`: the
   update sets `updated_at = v_submitted_at` beside `stage` and `submitted_at`.
8. `supabase/config.toml`: move the `[functions.project-need]` and `[functions.need-intake]`
   blocks from their current place (about line 578) to directly after `[functions.public-project]`
   (about line 524), same three-line shape as their neighbours. Nothing else in the file moves.
9. `tests/at/suites/req-003/_fixture.ts`:
   - The `save` arm passes `new Date(opts.clock.now()).toISOString()` as `now` to
     `applyNeedPatch`.
   - The `submit` arm sets `updatedAt` to the same instant as `submittedAt` when the transition
     changes.
   - `attemptNeedDefinerAsOperator`: the not-an-admin reason becomes 'only the admin of this
     organisation may write a need'.
10. `tests/at/suites/req-003/a-capture.test.ts`, AT-003.01, after the existing assertions inside
    the loop body or after it (your choice, once): the draft read through `readNeed` answers 401
    for `null`, 404 for another organisation's admin (`provisionNgo` a second NGO), 404 for a
    volunteer (`provisionVolunteer`), and 200 with the same need for a non-admin member of the
    owning organisation (`setMembershipRoleAsOperator(..., 'member')` on the owner, then
    `readNeed` with the owner's session; restore `'admin'` afterwards if the loop continues).
    Assert `answer.status` on the refusals, as the public-page assertions do.
11. `tests/at/suites/req-003/b-gate-and-autosave.test.ts`, AT-003.05: one malformed-id case per
    action: `saveNeed`, `submitNeed` and `attachReferenceFile` with `projectId: 'not-a-uuid'`
    each answer `{ ok: false, kind: 'invalid-request', status: 400 }`.
12. `tests/at/suites/req-003/e-submission.test.ts`, AT-003.12: the first submit's
    `need.updatedAt` is greater than or equal to the attached view's `updatedAt` and equals its
    own `submittedAt`; the repeated submit returns the same `updatedAt`. Use string equality
    for the equal case and `Date.parse` for the ordering.

## Checks, in this order, all green before you report

```
bun run typecheck
bun run at:check req-003
```

Measured: your sandbox cannot run vitest (`Cannot read directory "../../../../..": Access is
denied`). The lead runs the selftests and the eight acceptance checks. Do not claim them.

## Must not

- No other change. No new helper beyond `uuidField`. No change to `project-workspace/index.ts`
  or any merged migration.
- No new policy, no `viewer_*` helper.
- Comments only for a non-obvious why.

## Report

Your reply is your report; the runner captures it. Give: the files changed; each check with its
exit code; every edit you could not make as written, with the reason. Under forty lines.
