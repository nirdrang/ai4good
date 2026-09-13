The unique-index foreign key applies on this stack (the companion table and `need_intakes_project_id_org_id_fkey` are present). Overlapping saves without a revision token, acknowledgment only on `start`, and the assigned-volunteer `EXISTS` policy are all in the design of record, so those are not findings.

## Findings

### 1. [warning] Write `projectId` is not UUID-checked; a bad id looks like a conflict
**Location**: `supabase/functions/_shared/need-intake.ts` (`decideProjectNeed`, save/attach/submit); `supabase/functions/_shared/edge.ts` (`writeRoute` UUID loop); contrast `supabase/functions/need-intake/index.ts`

**Finding**: `save`, `attach`, and `submit` take any non-empty `projectId` string and pass it as `p_project_id uuid`. The write frame UUID-checks only organisation, account, and `from`, with the comment that a failed PostgREST cast “would answer like an outage.” The read route already UUID-tests `projectId`.

**Evidence**: `stringField` only trims. `writeRoute` then JSON-posts the args. A value such as `"not-a-uuid"` never reaches `project_need`; PostgREST fails the uuid cast (`22P02`). `rpcRefusalStatus` maps any five-character SQLSTATE to HTTP 409, and `parseWriteRefusalKind` on a missing DETAIL becomes `refused`. The loop fixture looks the id up in a `Map`, so this path is invisible at loop.

**Suggestion**: Reject a non-UUID `projectId` in `decideProjectNeed` with `invalid-request` / 400, the same shape as `need-intake`. Add one malformed-id case per action.

### 2. [warning] The draft read can return a title/description pair that was never stored
**Location**: `supabase/functions/_shared/need-intake.ts` (`needIntakeAnswer`); `supabase/functions/_shared/edge.ts` (`callerReads.need` / `project`)

**Finding**: The read route loads the title from `projects` and the rest from `need_intakes` in two HTTP calls, then stitches them. Autosave writes both tables in one transaction. The write path already has a single-snapshot join (`need_intake_view`); the read path does not.

**Evidence**: Order: `reads.project` returns title A. A concurrent `save` commits title B and description B. `reads.need` then returns description B and the new `updated_at`. The client sees title A with description B. AT-003.01 uses `toEqual` on write vs read only in sequence, so it cannot catch this. Candidate 2 described this door as hiding “the two-table join”; the implementation is two REST reads.

**Suggestion**: One caller-bound query that joins under RLS (PostgREST embed `projects!inner(name,org_id)`, or an invoker SQL function granted to `authenticated`). Keep `need_intake_view` as the write-side snapshot.

### 3. [warning] Submit changes the row and leaves `updated_at` on the last draft edit
**Location**: `supabase/migrations/20260919120000_project_need_snapshot.sql` (`need_intake_submit`); `tests/at/suites/req-003/_fixture.ts` submit arm

**Finding**: First submit sets `stage` and `submitted_at` and does not set `updated_at`. `need_intake_save` and `need_intake_attach` both set `updated_at = clock_timestamp()`. The fixture copies the omission, so loop agreement cannot see it.

**Evidence**: Start a draft, wait, submit. The Discovery view can show `updatedAt < submittedAt` even though the companion row just changed. There is no `updated_at` trigger; only the helpers write the column. AT-003.11 / .12 never assert that a successful submit advances `updatedAt`, or that a repeat submit leaves it alone.

**Suggestion**: Set `updated_at = v_submitted_at` in the submit `UPDATE`. Assert it on first submit and on the idempotent repeat. If `updated_at` is meant to mean “intake fields only,” say that next to the column; today every other companion write treats it as “this row changed.”

### 4. [warning] Autosave timestamps ignore the loop clock
**Location**: `supabase/functions/_shared/need-intake.ts` (`applyNeedPatch`); `tests/at/suites/req-003/_fixture.ts` (`start` / `attach` / `submit` vs `save`)

**Finding**: The loop clock is a controlled clock fixed at `2026-01-01`. `start`, `attach`, `submit`, and Tier-2 classify all stamp from `opts.clock.now()`. `save` calls `applyNeedPatch`, which stamps `new Date().toISOString()` (wall clock). That is also the only clock in the shared module.

**Evidence**: After `start`, `updatedAt` is `2026-01-01T00:00:00.000Z`. After the first real autosave it jumps to today’s date. Identical-patch `changed: false` still passes because both saves use the wall clock. Any later test that advances the controlled clock and then saves will not see the advanced time. Live SQL uses `clock_timestamp()`, so loop and integration already disagree about what “now” means on save.

**Suggestion**: Stop putting `Date` in `applyNeedPatch`. Either take `now` as an argument, or let the fixture set `updatedAt` from `opts.clock` the same way it does for attach and submit.

### 5. [warning] Loop `readNeed` only models organisation membership
**Location**: `tests/at/suites/req-003/_fixture.ts` (`readNeed`); `supabase/migrations/20260917120000_project_need_intake.sql` (three SELECT policies)

**Finding**: Live SELECT policies admit an org member, the assigned volunteer, and a platform admin. The fixture treats a need as visible only when `actor.roles.has(organizationId)`. An assigned volunteer with no org role gets 404 at loop and 200 live. No acceptance id reads as volunteer or platform admin, so two of the three shipped policies have no test at either tier.

**Evidence**: `visible = stored !== undefined && actor.roles.has(stored.organizationId)`. `provisionVolunteer` stores `roles: new Map()`. There is no `assigned_volunteer_id` on the fixture need. AT-003.04 covers writes, not reads.

**Suggestion**: Model assignment and platform-admin in the fixture, or add a read case for each policy so the fixture cannot lie.

### 6. [warning] Start validation sits inline in the dispatcher; every other action is a helper
**Location**: `supabase/migrations/20260918120000_project_need_attach.sql` (`project_need` start arm vs `need_intake_save` / `need_intake_attach` / `need_intake_submit`)

**Finding**: `save`, `attach`, and `submit` are private helpers. `start` still inlines title/description/urgency checks, the acknowledgment hook, and both inserts inside `project_need`. That block was copied through three replacements of the same function. The next action will copy it again.

**Evidence**: The live `project_need` start arm is ~35 lines of payload checks plus two inserts. `need_intake_save` already owns the same title/description/urgency rules for patches. Two copies of one intake grammar will drift (the first migration stored a trimmed description; the replacement keeps original whitespace).

**Suggestion**: Add `need_intake_start(...)` in the same shape as the other helpers. Keep `project_need` as lock, membership re-check, and `CASE`.

### 7. [warning] Non-admin refusal always says the caller tried to start a need
**Location**: `supabase/migrations/20260918120000_project_need_attach.sql` (role gate before dispatch)

**Finding**: The admin re-check runs for every action and still raises `only the admin of organisation % may start a need`.

**Evidence**: The sentence is leftover from the start-only first definition. Tests assert `kind: 'not-an-admin'`, never `reason`. A refused autosave or submit is explained as a failed start.

**Suggestion**: Use a verb that covers write (`may write a need`), or name the action.

### 8. [nit] The monotonic classification trigger raises with no DETAIL kind
**Location**: `supabase/migrations/20260917120000_project_need_intake.sql` (`need_intake_classification_is_monotonic`)

**Finding**: `RAISE ... using errcode = '42501'` has no `detail`. Every other new refusal on this path sets a DETAIL kind. This trigger is the operator path, not `writeRoute`, but a rewrite still surfaces as a bare 42501.

**Suggestion**: Add `detail = 'tier2-classification-immutable'` (or the kind you want the operator path to carry).