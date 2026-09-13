# Unit 5: the Tier-2 hardened disclosure is present before any further upload

You are the writer lane for unit 5 of the project need intake run. You work alone in a dedicated
git worktree, in `isolated-write` mode. Every path below is relative to the worktree root. Use
PowerShell syntax when you shell out, never Bash syntax. Do not run `git commit`, `git push`,
`bun run db:start` or `bun run db:stop`. The local Supabase stack is up; leave it up. Never paste
the output of `bun run db:start` anywhere.

Units 1 to 4 have landed and are green. No migration in this unit: the column
`tier2_classified_at`, its monotonic trigger and `disclosureFor` landed in unit 1. You apply a
fixed contract; you design nothing.

## Read first, in this order

1. `loop/items/AI4DEV-120/design/SYNTHESIS.md`: corrections 3, 5, 6 and 7; decisions 4, 5 and 10.
2. `loop/items/AI4DEV-120/design/candidate-2-project-row.md` lines 71 to 73, 324, 358, 419.
3. `loop/items/AI4DEV-120/brief.md`, the Unit 5 block.
4. `.taskmaster/docs/acceptance/at-req-003.md`, AT-003.10.
5. `supabase/migrations/20260917120000_project_need_intake.sql` lines 10 to 56: the column and
   the trigger `need_intakes_keep_classification`.
6. `supabase/functions/_shared/need-intake.ts` (`disclosureFor`) and `need-intake-copy.ts`.
7. `tests/at/suites/req-003/d-reference-files.test.ts` (the two per-tier bodies of unit 4 are
   the shape), `_fixture.ts`, `_live.ts`, `_pending.ts`, `tests/at/expected/req-003.json`.

## What this unit lands

AT-003.10 green at loop; at integration red on `ui.reference-upload-surface`,
`capability-pending`. Nothing else flips.

1. `tests/at/suites/req-003/_fixture.ts`: `classifyTier2AsOperator(projectId)` sets the stored
   need's `tier2ClassifiedAt` to the harness clock's now and its `upload.disclosure` to
   `disclosureFor(that timestamp)`. A second call on an already classified need leaves the first
   timestamp in place (the trigger's rule, restated). An unknown project id throws.
2. `tests/at/suites/req-003/_live.ts`: `classifyTier2AsOperator(projectId)` runs one statement
   through `sql`: `update public.need_intakes set tier2_classified_at = coalesce(tier2_classified_at,
   now()) where project_id = <id> returning project_id`; zero rows returned throws.
3. `tests/at/suites/req-003/d-reference-files.test.ts`, AT-003.10, keeps `{ surface: 'ui' }`,
   per-tier body. `default`: start a need; attach one file and confirm the write answer's
   disclosure level is `base`; call `classifyTier2AsOperator`; with no attach in between, the
   very next `readNeed` carries `upload.disclosure` equal to `{ level: 'tier2-hardened',
   acknowledgmentRequired: true, heading: REFERENCE_FILE_DISCLOSURE.tier2Hardened.heading, body:
   ...body, acknowledgment: ...acknowledgment }` and `tier2ClassifiedAt` not null; a further
   attach's write answer carries the same hardened disclosure and the file list grows to two;
   `needRow` agrees. `integration: awaiting(AWAITED.uploadSurface)`.
4. `tests/at/suites/req-003/_pending.ts`: drop `tier2Disclosure` from `AWAITED`.
5. `tests/at/expected/req-003.json`: loop green gains AT-003.10; the integration row becomes
   `"AT-003.10": { "kind": "capability-pending", "capabilities": ["ui.reference-upload-surface"] }`.
   Every other row unchanged.

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

- No file under `supabase/` changes. No migration. No new column, trigger or helper.
- No acknowledgment record, no refusal of an attach after classification (SYNTHESIS rejects it).
- No `discovery.tier2-classification` capability name: the stub is sanctioned by the manifest
  and .10 waits on the upload surface alone (SYNTHESIS correction 6).
- No change to `_contract.ts`, `a-`, `b-`, `c-`, `e-` or `f-` test files.
- No new harness sentinel, fault, vendor stand-in, fixture world or capability.
- No `'application/pdf'` string, no storage call, no `bytea`.
- Comments only for a non-obvious why. No phase narration.

## Report

Your reply is your report; the runner captures it. Give: the files changed; each check with its
exit code and its counts, or the exact error where it could not run; every deviation; every open
problem. Under fifty lines.
