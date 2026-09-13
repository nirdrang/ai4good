# Unit 4: a reference file attaches to the draft, and the upload surface serves the base disclosure

You are the writer lane for unit 4 of the project need intake run. You work alone in a dedicated
git worktree, in `isolated-write` mode. Every path below is relative to the worktree root. Use
PowerShell syntax when you shell out, never Bash syntax. Do not run `git commit`, `git push`,
`bun run db:start` or `bun run db:stop`. The local Supabase stack is up; leave it up. Never paste
the output of `bun run db:start` anywhere.

Units 1 to 3 have landed and are green. You apply a fixed contract; you design nothing.

## Read first, in this order

1. `loop/items/AI4DEV-120/design/SYNTHESIS.md`: corrections 5, 6 and 7; decisions 3, 4 and 10;
   the unit 4 migration line.
2. `loop/items/AI4DEV-120/design/candidate-2-project-row.md` lines 66 to 69 (the criteria as
   code; the disclosure shape there is superseded by SYNTHESIS correction 5), 171 to 200 (the
   dispatcher and `need_intake_attach`), 417 (the unit 4 file list).
3. `loop/items/AI4DEV-120/brief.md`, the Unit 4 block.
4. `.taskmaster/docs/acceptance/at-req-003.md`, AT-003.07 and AT-003.09.
5. `supabase/migrations/20260917130000_project_need_save_and_submit.sql` in full. You redefine
   `project_need` from it.
6. `supabase/functions/_shared/need-intake.ts` (`ReferenceFileInput`, `ReferenceFileMetadata`,
   `disclosureFor`, `needViewFromSql`, `decideProjectNeed`) and `need-intake-copy.ts`.
7. `tests/at/suites/req-003/` in full; `b-gate-and-autosave.test.ts` as the shape of a body;
   `tests/at/expected/req-003.json`.
8. `tests/at/suites/req-002/b-allowance.test.ts` lines 430 to 455: the per-tier body shape
   `atTest(id, title, { default: fn, integration: awaiting(...) })`. AT-003.07 and .09 use it.

## What this unit lands

AT-003.07 and AT-003.09 green at loop; at integration, .07 red on `storage.reference-upload` and
.09 red on `ui.reference-upload-surface`, both `capability-pending`. AT-003.10 stays red on
`intake.tier2-disclosure` at both tiers; unit 5 lands it.

1. Migration `supabase/migrations/20260918120000_project_need_attach.sql`:
   - `public.need_intake_attach(v_need public.need_intakes, p_account_id uuid, p_file jsonb)
     returns boolean`, plain plpgsql, not SECURITY DEFINER, `set search_path = ''`, execute
     revoked from public, anon, authenticated and service_role, granted to nobody. Per candidate
     2 lines 198 to 200: a non-object, an unknown key, a `fileName` or `mediaType` that is not a
     non-empty string after btrim, a `byteSize` that is not a positive whole number, or a
     `description` that is neither string nor null raises `invalid-request` (22023). It appends
     `{ id: gen_random_uuid(), file_name, media_type, byte_size, description, added_by_account_id:
     p_account_id, added_at: clock_timestamp() }` to `reference_files` (`||`, keeping order),
     sets `updated_at`, and returns true. Allowed in every stage. It stores metadata only; it
     touches no storage, no bytes.
   - `public.project_need` redefined with `create or replace`, identical to the unit 2 text
     except the `case` gains `when 'attach' then v_changed := public.need_intake_attach(v_need,
     p_account_id, p_payload);`. Keep the revoke and grant lines and `notify pgrst, 'reload
     schema'`.
2. `supabase/functions/_shared/need-intake.ts`: `decideProjectNeed` accepts `attach`: keys
   `organizationId`, `action`, `projectId`, `file`; `file` parsed with the rules above into
   `ReferenceFileInput` (`fileName` and `mediaType` trimmed, `description` as typed, null when
   blank or absent); `p_action: 'attach'`, `p_project_id`, `p_payload: ReferenceFileInput`. No
   other export changes.
3. `tests/at/suites/req-003/_fixture.ts`: `attachReferenceFile` runs the same `write` path;
   `commit`'s `attach` arm appends a `ReferenceFileMetadata` with `crypto.randomUUID()`, the
   caller's account id and the harness clock, sets `updatedAt`, and answers `changed: true`.
   `attemptNeedDefinerAsOperator` already routes through `decideProjectNeed` and `commit`.
4. `tests/at/suites/req-003/_live.ts`: `attachReferenceFile` posts through `postNeed` with the
   action.
5. `tests/at/suites/req-003/d-reference-files.test.ts`, inside a `describe`:
   - AT-003.07, `{ surface: 'ui' }`, per-tier body. `default`: start a need, attach
     `{ fileName: 'grants-tracker.csv', mediaType: 'text/csv', byteSize: 4096, description:
     'Sample rows' }`, expect `{ ok: true, changed: true }` and one entry in
     `need.referenceFiles` whose `fileName`, `mediaType`, `byteSize`, `description` match and
     whose `addedByAccountId` is the admin's account id; attach a second file with no
     description and expect two entries in order with `description: null`; `readNeed` and
     `needRow` both show the same two entries. A `byteSize` of `0` and a missing `fileName`
     each answer `invalid-request` 400. `integration: awaiting(AWAITED.referenceUpload)`.
   - AT-003.09, `{ surface: 'ui' }`, per-tier body. `default`: start a need; the write answer's
     `need.upload.disclosure` equals `{ level: 'base', acknowledgmentRequired: false, heading:
     REFERENCE_FILE_DISCLOSURE.base.heading, body: REFERENCE_FILE_DISCLOSURE.base.body,
     acknowledgment: null }`, imported from the copy module; the `readNeed` view carries the
     same; after an attach the write answer still carries it. `integration:
     awaiting(AWAITED.uploadSurface)`.
   - AT-003.10 stays `awaiting(AWAITED.tier2Disclosure)` with its tag.
6. `tests/at/suites/req-003/_pending.ts`: drop `referenceFiles` from `AWAITED`. Keep
   `referenceUpload`, `uploadSurface`, `tier2Disclosure`, `submission`, `snapshot`.
7. `tests/at/expected/req-003.json`: loop green gains 07 and 09; integration red rows become
   `"AT-003.07": { "kind": "capability-pending", "capabilities": ["storage.reference-upload"] }`
   and `"AT-003.09": { "kind": "capability-pending", "capabilities":
   ["ui.reference-upload-surface"] }`. Every other row unchanged.

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

- No `storage.from(`, `createBucket(`, `createSignedUrl(`, no bucket, no `bytea`, no column
  from the list in `tests/at/suites/req-002/_source-documents.ts` lines 25 to 43, no
  `'application/pdf'` string anywhere. Metadata only.
- No change to the `need_intakes` table, its policies, `need_intake_view`, `need_intake_save`
  or `need_intake_submit`. No change to `need-intake-copy.ts`.
- No `classifyTier2AsOperator` body, no `submitTransition` body, no audit append. Units 5, 6, 7.
- No column named `lifecycle`, `state` or `status` on `projects`. No name that holds `project`
  together with `lifecycle`, `state`, `status`, `publish`, `triage`, `scoped` or `visibility`.
- No fourth `viewer_*` helper. No change to `write_standing`. Nothing under `src/`.
- No new harness sentinel, fault, vendor stand-in, fixture world or capability. The two
  capability names above already exist in `_pending.ts`.
- No numerals 10 or 30 in a test body for the grants.
- No string that calls an organisation "verified" without the word email, jwt or token.
- Comments only for a non-obvious why. No phase narration.

## Report

Your reply is your report; the runner captures it. Give: the files created and changed; each
check with its exit code and its counts, or the exact error where it could not run; every
deviation from SYNTHESIS with the reason; every open problem. Under one hundred lines.
