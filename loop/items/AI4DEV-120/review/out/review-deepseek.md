## Findings

### 1. [warning] The SQL re-check of the platform acknowledgment covers only `start`, not `save`/`attach`/`submit`

**Location**: `supabase/migrations/20260917130000_project_need_save_and_submit.sql:113`, `supabase/migrations/20260918120000_project_need_attach.sql:81`

**Finding**: The stated intent says "the SQL re-checks the admin role, the organisation and the platform acknowledgment." The admin-role check is unconditional, but `has_platform_acknowledgment` sits **inside** `if p_action = 'start'`. Every subsequent action an existing need accepts — `save`, `attach`, `submit` — is reachable with no acknowledgment check in the definer at all. The TypeScript layer does not check acknowledgment either (`decideProjectNeed` never calls it), it just forwards args; the only acknowledgment guard anywhere on the `save`/`submit` path is the `start`-scoped SQL branch.

**Evidence**: Trace `project_need(action => 'submit', p_project_id => <existing>)`: validation skips the `start` branch, falls to the `else` arm (select need, dispatch to `need_intake_submit`), and nothing in the path consults `has_platform_acknowledgment`. Today the gap is masked because an admin cannot complete signup without the acknowledgment row and the append-only trigger makes that row undeletable — but the enforcement claim in the intent is not true of the code, and a future acknowledgment *version* requirement (a second kind, or a re-acceptance) would silently not apply to editing/submitting an existing need.

**Suggestion**: Move the acknowledgment check above the `if p_action = 'start'` branch so every action re-checks, or state in the migration comment that the check is start-only by design and why.

### 2. [warning] `need_intakes_select_assigned_volunteer` embeds a table-reading subquery in `USING`, and the static posture scan cannot see it

**Location**: `supabase/migrations/20260917120000_project_need_intake.sql:29-33`

**Finding**: The policy is `using (public.viewer_is_volunteer() and exists (select 1 from public.projects p where p.id = need_intakes.project_id and p.assigned_volunteer_id = auth.uid()))`. The tree's stated posture (`20260906120000` header) is "every USING must name `auth.uid()` or a `public.viewer_` function," and the explicit task constraint is "no subquery in USING." This policy reads `public.projects` **as the querying role**, so `need_intakes` authorization now also depends on `projects`' grants and policy set — a cross-table policy dependency instead of the helper boundary.

**Evidence**: In `tests/at/suites/req-001/_policy-scan.ts:160-162`, `usingNamesAuthOrViewer` passes the statement because it merely *contains* `public.viewer_is_volunteer()`; `recordPolicyUsing` (lines 226-251) never checks for table subqueries. So the guard that exists to catch exactly this shape doesn't. The policy is also currently dead code: no path in this run assigns a volunteer to a project, and the assigned-volunteer read is untested (`AT-003.15` was retired to REQ-001).

**Suggestion**: Delete the policy until assignment lands, or replace the subquery with a `viewer_`-shape helper (e.g. `viewer_is_assigned_volunteer(project_id)`), and extend the scanner with a `policy-using-table-subquery` check so the posture sentence is enforced rather than remembered.

### 3. [warning] A committed write is reported as a 502 when the render throws

**Location**: `supabase/functions/_shared/edge.ts:379` (`json({ ok: true, ...spec.render(...) })`), `supabase/functions/_shared/need-intake.ts:130-133`

**Finding**: `renderProjectNeed` calls `needViewFromSql`, which throws on any `NeedIntakeSqlRow` shape it doesn't recognise. `needIntakeAnswer` wraps that same call in try/catch and degrades to `TENANT_READ_FAILED` (lines 228-232), but `writeRoute` does not: the throw escapes to `edgeHandler` and becomes a shaped 502 **after the row was created/updated**.

**Evidence**: `edge.ts:118-123` converts any throw to `refusal(..., 502)`. The write and the render are in different transactions (the RPC has already committed when `spec.render` runs). So a client retrying a 502'd `project-need` creates a second project — there is no idempotency key anywhere on the start path. Reachable on a partial deploy (new TS, old SQL), or any future column addition this validator doesn't know.

**Suggestion**: Render defensively — either let `render` return `need: null` instead of throwing, or catch around `spec.render` in `writeRoute` and answer a distinct "the write completed but its result could not be read" status.

### 4. [warning] Submission advances `stage` and `submitted_at` but leaves `updated_at` at the draft's last edit

**Location**: `supabase/migrations/20260919120000_project_need_snapshot.sql:14-16`

**Finding**: `update public.need_intakes set stage = 'discovery_in_progress', submitted_at = v_submitted_at where ...` — `updated_at` is untouched. `save` and `attach` both set `updated_at = clock_timestamp()`; `submit` does not. The read route and every write response expose `updatedAt`, so a need submitted after sitting untouched reports a modification time older than its own `submittedAt`.

**Evidence**: `need_intake_view` returns `to_n` including `updated_at`, and `NeedIntakeView.updatedAt` is part of the contract the UI consumes. There is no update trigger on `need_intakes`; the column is only written by the helpers. The fixture reproduces the omission (`_fixture.ts` submit path never touches `updatedAt`), so loop-tier agreement cannot detect it.

**Suggestion**: Add `updated_at = v_submitted_at` to the submit update and assert it in `e-submission.test.ts` (advanced on first submit, preserved on the idempotent repeat).

### 5. [warning] `projectId` is the one request identifier the write frame does not shape-check; the failure surfaces as a 409 instead of a 400

**Location**: `supabase/functions/_shared/need-intake.ts:80,100` vs `supabase/functions/_shared/edge.ts:359-364`

**Finding**: `edge.ts` validates `target`, `subject` and `from` against `UUID_SHAPE` precisely because "PostgREST would fail the cast and answer like an outage." `projectId` is inside the JSON body and is never checked: `decideProjectNeed` accepts any nonempty string and passes it as `p_project_id uuid`. A malformed id fails inside PostgREST's cast; `rpcRefusalStatus` (write-routes.ts:239-241) then returns 409, and `parseWriteRefusalKind(null)` maps it to `refused` — a generic conflict for a request-shape error. The read route already gets this right (`need-intake/index.ts` UUID-tests `projectId`).

**Evidence**: `p_project_id uuid` parameter plus `.some((key) => !keys.includes(key))` validation that only checks *presence*, never *shape*. The fixture's `commit` looks the id up in a Map, so the loop tier can't reproduce the SQL cast failure.

**Suggestion**: Validate `projectId` with the same `UUID_SHAPE` pattern in `decideProjectNeed` for `save`/`attach`/`submit` and refuse `invalid-request`/400 before the RPC; add a malformed-id assertion per action.

### 6. [warning] `project_need` is copy-pasted across three migrations; each copy freezes every path it did not touch

**Location**: `20260917120000_project_need_intake.sql:83-159`, `..._save_and_submit.sql:56-160`, `..._attach.sql:47-133`

**Finding**: Three full definitions of the same 60-line function exist, `CREATE OR REPLACE` stacked; the later two differ only by one `when` arm in the `case`. This is not the repo's forward-migration idiom for a new *signature* — it is the same signature replaced to add one branch. Every copy silently becomes the code for all paths it doesn't change: the attach migration's copy, for example, still embeds the **pre-audit** version of `need_intake_submit`'s caller contract. Any bug fixed in copy #2 is absent from copy #3 unless someone remembers to re-copy.

**Evidence**: `git grep "create or replace function public.project_need"` → three hits; diff the start-validation blocks of the three: byte-identical. Migration 3's `missing-description` path runs through a submit helper defined in migration 2 but dispatched from migration 3's copy — so editing migration 2 alone cannot change what ships.

**Suggestion**: Keep one definition and add actions additively — either separate `create or replace` dispatcher arms in the *last* migration only after the pattern is established, or split each action into its own definer (`project_need_save`, `project_need_attach`, …) with the shared prologue in one helper. At minimum, add a source-scan arm that refuses a `create function public.project_need` body older than the newest one (the repo already has this shape of oracle in `_source-need.ts`).

### 7. [warning] Test scaffolding lives in the production module and re-implements the SQL; the loop tier grades the re-implementation

**Location**: `supabase/functions/_shared/need-intake.ts:158-172,181-191`

**Finding**: `submitGate`, `submitTransition`, `applyNeedPatch` and `intakeSnapshotOf` are used only by `tests/at/suites/req-003/_fixture.ts` and its tests (grep confirms zero production callers). They encode business rules — the missing-description gate, the stage transition, change detection — that the SQL also encodes, so the loop tier verifies a TypeScript twin rather than the shipped database behavior. The rules now exist in at least three places (`decideProjectNeed`/helpers, the fixture, the SQL) with no mechanism forcing agreement on anything not exercised at integration.

**Evidence**: `git grep applyNeedPatch|submitGate|submitTransition` → only `need-intake.ts` and `_fixture.ts`; the SQL `need_intake_save`/`need_intake_submit` are the real implementations. Worse, `AT-003.14`'s loop-tier assertion compares the fixture's snapshot to `intakeSnapshotOf(...)` — the same function that produced it — so the loop test cannot detect a wrong field mapping at all.

**Suggestion**: Move the test-only helpers into the suite (e.g. `tests/at/suites/req-003/_model.ts`) so production `_shared/need-intake.ts` holds only the route decision and view mapping, and let the integration tier be the only place the SQL state machine is judged.

### 8. [nit] `need_intakes.org_id` is a denormalised copy that buys one redundant index and a forward FK

**Location**: `supabase/migrations/20260917120000_project_need_intake.sql:4,8,17`

**Finding**: `org_id` is derivable from `project_id` (projects.org_id), yet it is stored, constrained by a `(project_id, org_id)` FK — which required the otherwise-unused `create unique index projects_id_org_id_idx on public.projects (id, org_id)` (`id` is already the primary key, so the second column can never add uniqueness) — and the copy is never re-checked when a project's org changes: the FK silently forbids the org reassignment instead of rejecting the stale copy. The read route doesn't even select it; it takes `org_id` from the project row.

**Evidence**: `callerReads.need` select list omits `org_id`, and `needIntakeAnswer` fills it from `source.org_id`. The only consumers of the column are RLS (`viewer_is_org_member(org_id)`) and the audit snapshot's `org_id`.

**Suggestion**: Drop `need_intakes.org_id`, key the policies off a join/helper built on `projects.org_id`, and drop `projects_id_org_id_idx`. If the copy stays, say in the migration comment which invariant it protects, because right now it protects one nobody can name.

### 9. [nit] The fixture cannot fail the acknowledgment gate the source scan only text-checks

**Location**: `tests/at/suites/req-003/_fixture.ts:120-127` (`attemptNeedDefinerAsOperator`), `tests/at/suites/req-003/_source-need.ts:8-17`

**Finding**: The only proof that the SQL acknowledgment gate behaves (not just exists as a regex hit) is `needDefinerCallsAcknowledgmentHook` — a text oracle that accepts any statement containing `public.has_platform_acknowledgment(` after stripping comments/strings. Nothing behavioral drives an admin without an acknowledgment through `start`, and the fixture's definer operator path (`attemptNeedDefinerAsOperator`) doesn't model acknowledgment at all, so a misplaced check (e.g. inside the catch-all `else`) would pass the scanner.

**Evidence**: `scanNeedDefinerAcknowledgment` returns `[]` iff the regex matches; the selftest only proves the scanner rejects a definition with *no* call. `AT-003.04`'s definer arm checks roles, never acknowledgment.

**Suggestion**: Add a live-tier test that deletes/omits the acknowledgment for a fixture admin and asserts `platform-acknowledgment-missing`, and make the fixture honor an `acknowledged` flag so the loop tier can drive the same refusal.

### 10. [nit] No cap on `reference_files` length or description size

**Location**: `supabase/migrations/20260918120000_project_need_attach.sql:38-46`

**Finding**: `attach` appends one entry per call with no limit on count, and neither `fileName`/`mediaType`/`description` nor the accumulated array has a length constraint. The document says format matrix and size caps belong to the upload requirement, which is fair for *file* policy — but the metadata row itself is unbounded JSONB that is re-serialised on every read and copied into the audit snapshot at submission.

**Evidence**: `reference_files = reference_files || jsonb_build_array(...)` in a loop is O(n) rewrites and an unbounded blob; `need_intake_view` returns the whole array on every draft read. A scripted admin (or a buggy retry loop) can grow the row without limit, and the only bound is `max_rows = 1000` on the response, which does not apply to rows inside one JSON value.

**Suggestion**: Add a count check (e.g. refuse beyond a small N with `invalid-request`) and a `pg_column_size`-style guard at minimum, even if the per-file policy waits for REQ-032.