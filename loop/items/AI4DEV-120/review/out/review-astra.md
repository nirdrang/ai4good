[unattributed]

## Findings

### 1. [critical] Autosave is not implemented; its acceptance test explicitly saves
**Location**: `tests/at/suites/req-003/b-gate-and-autosave.test.ts:28–49`

**Finding**: The change implements persistence endpoints but provides no intake screen or mechanism that saves on input changes.

**Evidence**: The supposedly UI-level acceptance test calls `sut.saveNeed(...)` explicitly and then reads the result. Its integration adapter sends an explicit HTTP save request. Neither exercises typing, navigation, or automatic persistence. The frontend contains no calls to `project-need` or `need-intake`; `src/routes/index.tsx` still renders only a heading. Nevertheless, `AT-003.05` is declared green at integration.

**Suggestion**: Implement the input-to-save path and test typing followed by navigation and reopening. Until then, classify this acceptance criterion as pending.

### 2. [critical] Overlapping autosaves can silently overwrite newer input
**Location**: `supabase/migrations/20260918120000_project_need_attach.sql`, `project_need`; `20260917130000_project_need_save_and_submit.sql`, `need_intake_save`

**Finding**: Saves carry neither an expected revision nor an ordering token. Row locking serializes database execution but does not preserve the order of user edits.

**Evidence**: An admin sends description A, then description B. If B reaches the database first, it commits B; delayed request A subsequently acquires the lock and overwrites B. Both return success. No shipped client serializes requests, and the tests await every save sequentially, excluding this failure.

**Suggestion**: Introduce revision-based conflict detection and a client queue that preserves pending edits. Exercise reversed request arrival in a test.

### 3. [warning] The draft read can return a combination that never existed
**Location**: `supabase/functions/_shared/need-intake.ts:219`, `needIntakeAnswer`

**Finding**: Title and intake fields are read in separate HTTP requests and then presented as one coherent version.

**Evidence**: The first request reads title A. A concurrent save atomically changes the title to B and description to B. The second request reads description B and its new `updated_at`. The response combines title A with description B and the newer timestamp—even though that combination was never committed.

**Suggestion**: Read the project and companion row through one caller-bound joined query, preserving RLS and a single database snapshot.

### 4. [warning] The volunteer policy bypasses the required policy-helper boundary
**Location**: `supabase/migrations/20260917120000_project_need_intake.sql:28–32`

**Finding**: `need_intakes_select_assigned_volunteer` embeds a table-reading subquery directly in `USING`, contrary to the stated tenant posture.

**Evidence**: Its `EXISTS` reads `public.projects` under the querying role, so intake authorization also depends on that table’s grants and policies. This introduces a cross-table policy dependency instead of encapsulating the assignment predicate in the prescribed `viewer_*` helper. The current policy scanner accepts it because it checks for authentication references, not forbidden table subqueries.

**Suggestion**: Encapsulate the caller’s project assignment in a restricted `viewer_*` helper and extend the scanner to reject table-reading subqueries in policies.

### 5. [warning] Submission changes the intake without advancing `updated_at`
**Location**: `supabase/migrations/20260919120000_project_need_snapshot.sql:15–16`

**Finding**: Submission updates `stage` and `submitted_at` but leaves `updated_at` at the previous draft edit.

**Evidence**: Create a draft, leave it untouched, then submit it later. The returned Discovery intake still reports the draft’s old modification timestamp. Save and attachment operations explicitly advance this field; submission does not, and no general update-timestamp trigger exists. The fixture reproduces the omission, so fixture agreement cannot detect it.

**Suggestion**: Set `updated_at = v_submitted_at` in the submission update and assert that successful submission advances it while repeated submission preserves it.

### 6. [warning] Write-side project identifiers escape boundary validation
**Location**: `supabase/functions/_shared/need-intake.ts:80,100`, `decideProjectNeed`

**Finding**: `save`, `attach`, and `submit` accept any nonempty project ID, despite passing it to a UUID SQL parameter.

**Evidence**: An authenticated NGO admin can send `projectId: "not-a-uuid"`. `stringField` accepts it. The shared write frame validates only organisation, account, and `from` identifiers, so this value reaches PostgREST and fails UUID conversion before `project_need` executes. The shared error mapper turns that SQLSTATE into HTTP 409 with generic kind `refused`, instead of the intended HTTP 400 `invalid-request`. The read route already validates this identifier correctly.

**Suggestion**: Validate project UUIDs in the write decision before issuing the RPC, and cover malformed identifiers for all three actions.

These findings are based on source inspection; I did not run the acceptance suites.