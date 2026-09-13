# Unit 2: the missing-description block on its own, and autosave without an explicit save

You are the writer lane for unit 2 of the project need intake run. You work alone in a dedicated
git worktree, in `isolated-write` mode. Every path below is relative to the worktree root. Use
PowerShell syntax when you shell out, never Bash syntax. Do not run `git commit`, `git push`,
`bun run db:start` or `bun run db:stop`. The local Supabase stack is up; leave it up. Never paste
the output of `bun run db:start` anywhere.

Unit 1 has landed and is green at both tiers. You apply a fixed contract; you design nothing.

## Read first, in this order

1. `loop/items/AI4DEV-120/design/SYNTHESIS.md`. The design of record. Corrections 8 and 9,
   decisions 2, 8 and 9, the "Routes, SQL and modules" section and its unit 2 migration line.
2. `loop/items/AI4DEV-120/design/candidate-2-project-row.md` lines 48 to 60 (the two criteria as
   code), 160 to 217 (the dispatcher, the private helpers, the refusal kinds), 277 to 290 (the
   pure helpers), 413 (the unit 2 file list).
3. `loop/items/AI4DEV-120/brief.md`, the Unit 2 block.
4. `.taskmaster/docs/acceptance/at-req-003.md`, AT-003.03 and AT-003.05.
5. `supabase/migrations/20260917120000_project_need_intake.sql` in full. You redefine
   `project_need` from it.
6. `supabase/functions/_shared/need-intake.ts`, `write-routes.ts` (the `stringField` family and
   `rpcRefusalStatus`), `supabase/functions/project-need/index.ts`.
7. `tests/at/suites/req-003/` in full, `tests/at/expected/req-003.json`,
   `tests/at/suites/req-003/a-capture.test.ts` as the shape of a test body.
8. `tests/at/suites/req-002/_fixture.ts` and `_live.ts`, the sections that mint sessions.

## What this unit lands

Ids AT-003.03 and AT-003.05 green at both tiers. Nothing else flips.

1. Migration `supabase/migrations/20260917130000_project_need_save_and_submit.sql`:
   - `public.need_intake_save(v_need public.need_intakes, p_patch jsonb) returns boolean`,
     plain plpgsql, not SECURITY DEFINER, `set search_path = ''`, execute revoked from public,
     anon, authenticated and service_role, granted to nobody. Semantics per candidate 2 lines
     194 to 197 and SYNTHESIS corrections 8 and 9. A key absent from the patch is unchanged. A
     key present with `null` clears `urgency` or `description`. `title` updates `projects.name`;
     a title that trims to empty raises `invalid-name` (22023). An unknown key, a non-object
     patch, a non-text title or description, or an urgency outside the enum raises
     `invalid-request` (22023). Allowed in every stage. Returns true only when a stored value
     differs; sets `updated_at` only then. An identical patch changes nothing at all.
   - `public.need_intake_submit(v_need public.need_intakes, p_account_id uuid) returns boolean`,
     same posture. Per candidate 2 lines 201 to 206: stage already `discovery_in_progress`
     returns false; a description that trims to empty raises `missing-description` (P0001);
     otherwise sets `stage = 'discovery_in_progress'` and `submitted_at = clock_timestamp()` and
     returns true. This helper takes the need row and the caller id and nothing else. It reads
     no other table. No audit append yet; unit 7 adds it.
   - `public.project_need` redefined with `create or replace`: the `start` arm as it is today,
     then the non-start arm of candidate 2 lines 171 to 186 with `save` and `submit` dispatched
     and `attach` raising `invalid-request` until unit 4. The `no-such-need` raise is 42501 and
     covers absent and foreign alike, under `for update of n`. The return line is candidate 2
     line 187. Keep the revoke and grant lines and `notify pgrst, 'reload schema'`.
   - The description is stored as typed. In `start`, `v_description` becomes the raw text when
     `btrim(..., E' \t\r\n\f' || chr(160))` is non-empty, else null. `need_intake_save` does the
     same. btrim decides blankness only; it never changes what is stored. The title stays
     trimmed as today.
2. `supabase/functions/_shared/need-intake.ts`:
   - `decideProjectNeed` accepts `save` and `submit` beside `start`. For `save`: `projectId` is a
     non-empty string, `patch` is an object whose keys are a subset of `title`, `description`,
     `urgency`, with the type rules above; the decision carries `p_action: 'save'`,
     `p_project_id`, `p_payload: NeedPatch`. For `submit`: `projectId` only; `p_payload: {}`.
     `attach` still refuses `invalid-request` until unit 4. An unknown top-level key refuses
     `invalid-request`. The description is passed as typed, null when blank; add a small helper
     beside `stringField` in `write-routes.ts` or inline it, your choice, and apply it to `start`
     too.
   - `applyNeedPatch(need, patch)` and `submitGate(need)` get real bodies with the same rules as
     the SQL. `submitTransition` stays the unit 6 stub. `applyNeedPatch` returns `changed: false`
     and the same `updatedAt` for an identical patch.
   - `supabase/functions/project-need/index.ts` does not change unless the type of the decision
     forces it.
3. `tests/at/suites/req-003/_fixture.ts`: `saveNeed` and `submitNeed` run `writePipeline` with
   the shipped `decideProjectNeed`, look the need up under the target organisation (absent or
   foreign answers `no-such-need`, status 409), then commit with `applyNeedPatch` or
   `submitGate`. A passing gate calls `submitTransition`, which throws until unit 6; that is
   expected. `signInAgain(email)` mints a second `Session` for the same account and registers it
   in the actor map. `attemptNeedDefinerAsOperator` gains the `save` and `submit` arms with the
   same kinds the SQL raises.
4. `tests/at/suites/req-003/_live.ts`: `saveNeed` and `submitNeed` post through `postNeed` with
   the action. `signInAgain` is `signIn(email)`. `attemptNeedDefinerAsOperator` already passes
   the patch through.
5. `tests/at/suites/req-003/b-gate-and-autosave.test.ts`: real bodies for both ids, in the shape
   of `a-capture.test.ts`. AT-003.03: provision an email-verified admin, read the allowance
   through `readAllowance` and assert `remaining > 0` (never restate the number), start a need
   with a title and an urgency and no description, submit, expect `{ ok: false, kind:
   'missing-description', status: 409 }`, expect the row's stage still `draft`, then save a
   description of whitespace only and submit again, same refusal. AT-003.05 keeps its
   `{ surface: 'ui' }` tag: start a need, save a description patch, save the same patch again and
   expect `{ ok: true, changed: false }` with the same `updatedAt`, save a second patch that clears
   `urgency` with `null`, sign in again with `signInAgain(ngo.email)`, read through `readNeed` on
   the second session and expect the typed text intact, including its inner whitespace and line
   breaks, and `urgency: null`. Also cover, inside one of the two bodies: a `save` on a project of
   another organisation answers `no-such-need` 409; an unknown patch key answers `invalid-request`
   400 at the route.
6. `tests/at/suites/req-003/_pending.ts`: drop `gateAndAutosave` from `AWAITED`.
7. `tests/at/expected/req-003.json`: 03 and 05 green at both tiers. The other ten rows unchanged.

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
them green. Do not claim the rest; say you could not run them. The lead runs them and sends the
reds back.

## Must not

- No change to the `need_intakes` table, its policies, or `need_intake_view`.
- No `submitTransition` body, no audit append, no `attach` arm, no snapshot. Those are units 4,
  6 and 7.
- No column named `lifecycle`, `state` or `status` on `projects`. No name that holds `project`
  together with `lifecycle`, `state`, `status`, `publish`, `triage`, `scoped` or `visibility`.
- No read of `auth.users`, `discovery_spend` or any allowance inside `need_intake_submit`.
- No `storage.from(`, no `bytea`, no `'application/pdf'` string, no `deliver(`, no notification.
- No fourth `viewer_*` helper. No change to `write_standing`. Nothing under `src/`.
- No new harness sentinel, fault, vendor stand-in, fixture world or capability.
- No numerals 10 or 30 in a test body for the grants.
- No string that calls an organisation "verified" without the word email, jwt or token.
- Comments only for a non-obvious why. No phase narration.

## Report

Your reply is your report; the runner captures it. Give: the files created and changed; each
check with its exit code and its counts, or the exact error where it could not run; every
deviation from SYNTHESIS with the reason; every open problem. Under one hundred lines.
