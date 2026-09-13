# Unit 6: submission starts Discovery, with or without a reference file

You are the writer lane for unit 6 of the project need intake run. You work alone in a dedicated
git worktree, in `isolated-write` mode. Every path below is relative to the worktree root. Use
PowerShell syntax when you shell out, never Bash syntax. Do not run `git commit`, `git push`,
`bun run db:start` or `bun run db:stop`. The local Supabase stack is up; leave it up. Never paste
the output of `bun run db:start` anywhere.

Units 1 to 5 have landed and are green. No migration in this unit: `need_intake_submit` landed in
unit 2 with the gate and the transition, and the `submit` action already dispatches to it. You
apply a fixed contract; you design nothing.

## Read first, in this order

1. `loop/items/AI4DEV-120/design/SYNTHESIS.md`: decision 2, decision 9 (`already-submitted` does
   not exist), the "Per-unit plan" paragraph.
2. `loop/items/AI4DEV-120/design/candidate-2-project-row.md` lines 75 to 78, 280, 352, 421.
   Line 421 names a source pin for `submitTransition`; SYNTHESIS keeps `_source-need.ts` at one
   arm, so do not add it.
3. `loop/items/AI4DEV-120/brief.md`, the Unit 6 block.
4. `.taskmaster/docs/acceptance/at-req-003.md`, AT-003.11 and AT-003.12.
5. `supabase/migrations/20260917130000_project_need_save_and_submit.sql`, `need_intake_submit`.
6. `supabase/functions/_shared/need-intake.ts` (`submitTransition` stub, `submitGate`).
7. `tests/at/suites/req-003/_fixture.ts` (the `commit` function's `submit` arm already calls
   `submitTransition`), `b-gate-and-autosave.test.ts` (AT-003.03 is the shape: the allowance
   read, the Given), `_pending.ts`, `tests/at/expected/req-003.json`.

## What this unit lands

AT-003.11 and AT-003.12 green at both tiers. Nothing else flips.

1. `supabase/functions/_shared/need-intake.ts`: `submitTransition(stage)` gets its body:
   `{ next: 'discovery_in_progress', changed: stage === 'draft' }`. Pure, no other change. Do not
   touch `submitGate`, `applyNeedPatch` or `decideProjectNeed`.
2. `tests/at/suites/req-003/_fixture.ts`: check that the `commit` function's `submit` arm now
   works end to end (gate, transition, `submittedAt` from the harness clock, `changed` from the
   transition, a second submit answers `changed: false` with the same `submittedAt`). Change it
   only if it does not.
3. `tests/at/suites/req-003/e-submission.test.ts`, inside a `describe`, both bodies with the
   Given read and never restated: provision an email-verified admin, read the allowance through
   `readAllowance` and assert `remaining > 0`.
   - AT-003.11: start a need with a title, a description and an urgency, attach nothing, submit,
     expect `{ ok: true, changed: true, need: { stage: 'discovery_in_progress', referenceFiles:
     [] } }` and `submittedAt` not null; `readNeed` and `needRow` agree on the stage; the public
     page still answers 404 (a need in Discovery is not public; `projectIsPublic` is
     `need_stage === null`).
   - AT-003.12: start a need, attach one file, submit, expect the same transition with one file
     kept; `needRow` shows `stage: 'discovery_in_progress'` and a non-null `submittedAt`; submit
     again and expect `{ ok: true, changed: false }` with the same `submittedAt` and the same
     stage; after submission a `save` of a new description still answers `ok: true, changed:
     true` and leaves the stage unchanged (the door AT-003.16 uses later); the operator attempt
     `attemptNeedDefinerAsOperator` with `action: 'submit'` on the already submitted need
     answers `{ ok: true }`.
4. `tests/at/suites/req-003/_pending.ts`: drop `submission` from `AWAITED`.
5. `tests/at/expected/req-003.json`: AT-003.11 and .12 green at both tiers. Every other row
   unchanged.

## Checks, in this order

```
bun run typecheck
bun run at:check req-003
bun run at:verify req-003 --tier loop --expect
bun run at:verify req-003 --tier integration --expect
```

Measured: your sandbox runs `bun run typecheck` and `bun run at:check` but refuses vitest with
`Cannot read directory "../../../../..": Access is denied`. Run the first two yourself and make
them green. Do not claim the other two; say you could not run them. The lead runs them.

## Must not

- No file under `supabase/migrations/` changes. No new SQL. No audit append, no snapshot; unit 7.
- No email-verification or capacity check anywhere in the submit path (SYNTHESIS rejects it).
- No `already-submitted` kind. No second arm in `_source-need.ts`.
- No `deliver(`, no notification, no `_shared/lifecycle.ts`, no state table.
- No column named `lifecycle`, `state` or `status` on `projects`. No name that holds `project`
  together with `lifecycle`, `state`, `status`, `publish`, `triage`, `scoped` or `visibility`.
- No numerals 10 or 30 in a test body for the grants.
- No string that calls an organisation "verified" without the word email, jwt or token.
- No new harness sentinel, fault, vendor stand-in, fixture world or capability.
- Comments only for a non-obvious why. No phase narration.

## Report

Your reply is your report; the runner captures it. Give: the files changed; each check with its
exit code and its counts, or the exact error where it could not run; every deviation; every open
problem. Under fifty lines.
