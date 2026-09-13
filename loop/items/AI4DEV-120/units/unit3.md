# Unit 3: a pre-Discovery draft carries zero cause labels

You are the writer lane for unit 3 of the project need intake run. You work alone in a dedicated
git worktree, in `isolated-write` mode. Every path below is relative to the worktree root. Use
PowerShell syntax when you shell out, never Bash syntax. Do not run `git commit`, `git push`,
`bun run db:start` or `bun run db:stop`. The local Supabase stack is up; leave it up.

Units 1 and 2 have landed and are green at both tiers. This unit is a test and a manifest flip.
No migration, no shared-module change, no adapter change. You design nothing.

## Read first

1. `loop/items/AI4DEV-120/design/SYNTHESIS.md`, decision 6 and the suite section.
2. `loop/items/AI4DEV-120/brief.md`, the Unit 3 block.
3. `.taskmaster/docs/acceptance/at-req-003.md`, AT-003.17.
4. `tests/at/suites/req-003/a-capture.test.ts` and `b-gate-and-autosave.test.ts` as the shape of
   a test body; `_contract.ts` for the SUT; `_pending.ts`; `tests/at/expected/req-003.json`.
5. `supabase/migrations/20260917120000_project_need_intake.sql` lines 10 to 20: the
   `cause_labels` column and the check `need_intakes_draft_has_no_labels`.

## What this unit lands

AT-003.17 green at both tiers. Nothing else flips.

1. `tests/at/suites/req-003/c-labels.test.ts`: a real body inside a `describe`. Provision an NGO
   admin, start a need with a title and a description, then read it through every supported
   surface and assert zero labels on each: the write answer's `need.causeLabels` is `[]`, the
   `readNeed` view's `causeLabels` is `[]`, and `needRow` (the stored row) has `causeLabels`
   `[]`. Save a patch through `saveNeed` and read again: still `[]`. The public page is not a
   surface for a draft (it answers 404, proven in AT-003.01), so do not read it here.
2. `tests/at/suites/req-003/_pending.ts`: drop `labels` from `AWAITED`.
3. `tests/at/expected/req-003.json`: AT-003.17 green at both tiers. The other rows unchanged.

## Checks

```
bun run typecheck
bun run at:check req-003
bun run at:verify req-003 --tier loop --expect
bun run at:verify req-003 --tier integration --expect
```

Measured: your sandbox runs `bun run typecheck` and `bun run at:check` but refuses vitest with
`Cannot read directory "../../../../..": Access is denied`. Run the first two and make them
green. Do not claim the other two; say you could not run them. The lead runs them.

## Must not

- No change to any file under `supabase/`, to `_contract.ts`, `_fixture.ts`, `_live.ts`, or to
  any other test file.
- No new SUT method. No new harness sentinel, fault, vendor stand-in, fixture world or capability.
- No taxonomy row, no label producer, no stub module. The negative claim needs none.
- Comments only for a non-obvious why. No phase narration.

## Report

Your reply is your report; the runner captures it. Give: the files changed; each check with its
exit code and its counts, or the exact error where it could not run; every deviation; every open
problem. Under fifty lines.
