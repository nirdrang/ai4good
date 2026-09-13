## Findings

### 1. [critical] Composite FK references a unique index, not a unique constraint — migration fails
**Location**: `supabase/migrations/20260917120000_project_need_intake.sql:4,17`
**Finding**: `create unique index projects_id_org_id_idx on public.projects (id, org_id)` does not satisfy `foreign key (project_id, org_id) references public.projects (id, org_id)`.
**Evidence**: Postgres requires the referenced columns to be a PK or a declared `UNIQUE` constraint. A bare `CREATE UNIQUE INDEX` enforces uniqueness but is not a constraint, so the `CREATE TABLE need_intakes` errors with `there is no unique constraint matching given keys for referenced table "projects"`. The PK on `id` alone does not cover `(id, org_id)`. Nothing else adds the constraint, so the whole migration — and everything after it — never applies.
**Suggestion**: `alter table public.projects add constraint projects_id_org_id_key unique (id, org_id)`, or FK only on `project_id` and keep the org check in the function join that already exists.

### 2. [critical] RLS policy puts a table-reading subquery in USING, violating the stated posture
**Location**: `supabase/migrations/20260917120000_project_need_intake.sql:29-33`
**Finding**: `need_intakes_select_assigned_volunteer ... using (public.viewer_is_volunteer() and exists (select 1 from public.projects p where ...))` is a subquery in USING that reads another table directly.
**Evidence**: The intent states the tenant posture includes "no subquery in USING" with `viewer_*` helpers. The pre-existing `projects_select_assigned_volunteer` policy avoids this (scalar `auth.uid()` + viewer conjunct only). Here the policy executes `select from public.projects` as the querying role, so it is itself RLS-filtered and couples the two tables' policies. The static scan does not catch it because it only checks that USING names `auth.uid()`/`viewer_*` and that every `public.*(` call is `viewer_*` — both hold here — so CI stays green while the posture is broken.
**Suggestion**: Add a definer helper e.g. `viewer_can_read_need(project_id)` with `search_path=''` and call only that from USING.

### 3. [critical] Title/filename blank-check diverges: JS `trim()` vs SQL `btrim()` limited set
**Location**: `supabase/functions/_shared/write-routes.ts:244-248` (`stringField`), `supabase/functions/_shared/need-intake.ts:84` vs `supabase/migrations/20260918120000_project_need_attach.sql:15,17,30-31`
**Finding**: Edge trims with JS `String.trim()` (all Unicode whitespace); SQL trims only `' \t\r\n\f' + chr(160)`.
**Evidence**: Title `"\u2003"` (em-space alone): edge `stringField` → `""` → `null` → 400 `invalid-name`. Direct definer call: `btrim('\u2003', ...)` leaves `'\u2003'`, `v_title = ''` is false, type is `string`, so it inserts. `projects.name check (length(btrim(name)) > 0)` uses one-arg `btrim` (spaces only), so length 1 passes and a visually-blank title persists. Same hole for `fileName`/`mediaType` in `need_intake_attach`. Gate-then-decide disagree on what "empty" means; edge is stricter, SQL is the backstop that accepts.
**Suggestion**: Use one whitespace definition in both layers, or have SQL reject via a regex equivalent to the TS one instead of `btrim`.

### 4. [warning] Platform acknowledgment re-checked only on `start`
**Location**: `supabase/migrations/20260918120000_project_need_attach.sql:80-84` vs `114-128`
**Finding**: `if p_action = 'start' then if not has_platform_acknowledgment ...` — the `else` branch (`save`/`attach`/`submit`) re-checks org existence and admin role but never the acknowledgment.
**Evidence**: Intent says "the SQL re-checks the admin role, the organisation and the platform acknowledgment." The source oracle `scanNeedDefinerAcknowledgment` only greps the latest `project_need` body for the substring `has_platform_acknowledgment(`, which the `start` branch satisfies, so AT-003.01 passes while `save`/`attach`/`submit` via direct definer call succeed without any acknowledgment. Low exploitability today (acknowledgments are insert-only via client grants) but the backstop does not enforce what it claims.
**Suggestion**: Hoist the acknowledgment check above the action dispatch, or narrow the intent/scan to "creation only".

### 5. [warning] Monotonic trigger raises without DETAIL kind
**Location**: `supabase/migrations/20260917120000_project_need_intake.sql:43-47`
**Finding**: `raise exception 'the Tier-2 classification cannot be cleared or rewritten' using errcode='42501'` carries no `detail`.
**Evidence**: Tree posture is "refusals as SQLSTATE plus a DETAIL kind"; `writeRoute` maps `code`→409 and `details`→`kind` via `parseWriteRefusalKind`, falling back to generic `'refused'` when `details` is null. This is the one `RAISE` in the new SQL without a `detail`, so a monotonic violation surfaces as opaque `refused` instead of a named kind.
**Suggestion**: Add `detail = 'tier2-classification-immutable'` (and register the kind if edge must branch on it).

### 6. [warning] `submit` never bumps `updated_at`
**Location**: `supabase/migrations/20260919120000_project_need_snapshot.sql:15-16`
**Finding**: `update need_intakes set stage='discovery_in_progress', submitted_at=v_submitted_at` leaves `updated_at` at its pre-submit value.
**Evidence**: `need_intake_save` and `need_intake_attach` both set `updated_at = clock_timestamp()`. After submit, `updated_at < submitted_at` and a later `needRow` shows a mutation (`stage` flip) that `updated_at` does not reflect. The fixture mirrors the bug (`_fixture.ts:64` spreads old `updatedAt`), so AT-003.11/12/14/16 cannot catch it — both tiers agree on the wrong value.
**Suggestion**: Set `updated_at = v_submitted_at` in the same update.

### 7. [warning] `reference_files` is unbounded metadata with no caps
**Location**: `supabase/migrations/20260918120000_project_need_attach.sql:1-37`
**Finding**: No max file count, no `byteSize` upper bound, no filename/description length limit; every `attach` appends a new UUID row and always returns `changed=true`.
**Evidence**: Checks are only `byteSize > 0 integer` and non-empty `fileName`/`mediaType`. An admin (or a retried client — `attach` is not idempotent) can grow the `jsonb` array without limit; the read path (`need-intake`, `need_intake_view`) always returns the full array, so one need can degrade every draft read. Intent says "metadata only, no bytes, no storage" — that makes a huge `byteSize` claim cheap to write and impossible to verify.
**Suggestion**: Cap count (e.g. `jsonb_array_length < N`), cap `byteSize`, cap text lengths.

### 8. [warning] Fixture read path ignores volunteer/admin RLS — loop tier is blind there
**Location**: `tests/at/suites/req-003/_fixture.ts:127-131`
**Finding**: `readNeed` computes `visible = stored !== undefined && actor.roles.has(orgId)`, i.e. org membership only.
**Evidence**: Live RLS grants three paths: org member, assigned volunteer (`need_intakes_select_assigned_volunteer`), platform admin. The fixture denies an assigned volunteer with no org role (returns 404) where live returns 200. No AT covers volunteer/admin need reads, so the divergence is untested and loop-green proves nothing about two of the three shipped policies.
**Suggestion**: Model assignment + admin in the fixture, or add ATs pinning volunteer/admin reads to force the fixture honest.

### 9. [warning] Admin refusal message says "start" for every action
**Location**: `supabase/migrations/20260918120000_project_need_attach.sql:75-78`
**Finding**: The role gate runs before dispatch but raises `'only the admin of organisation % may start a need'` even for `save`/`attach`/`submit`.
**Evidence**: Copy-paste from the `start`-only first migration. Tests assert `kind` (`not-an-admin`), never `reason`, so the misleading sentence ships. An admin debugging a refused autosave is told they tried to "start" something.
**Suggestion**: Neutral wording ("may write a need") or per-action wording.

### 10. [warning] One rule in two runtimes, synced by hand
**Location**: `supabase/functions/_shared/need-intake.ts:8,135-137` vs SQL literals in `20260917120000`, `20260917130000`, `20260918120000`
**Finding**: Urgency vocabulary (`NEED_URGENCIES` vs hardcoded `'soon','this_quarter','no_deadline'` in start + save + attach-adjacent checks), blank-description test (regex `/[^ \t\r\n\f\u00a0]/` vs `btrim(..., E' \t\r\n\f'||chr(160))`), and the whole `project_need` start-validation block (~30 lines) are duplicated across TS and three `create or replace` bodies.
**Evidence**: Adding an urgency or fixing whitespace (finding 3) requires touching 5+ sites with nothing to fail if one is missed. The start block is literally repeated in three migrations; only the last one ships, the first two are dead weight that still get reviewed as if live.
**Suggestion**: Extract SQL helpers for start-payload validation (like `need_intake_save`/`attach` already are) and derive the TS lists from the same single source or pin them with a source test.

### 11. [warning] `need_intake_save` NULL-title check is weaker than `start`'s
**Location**: `supabase/migrations/20260917130000_project_need_save_and_submit.sql:25-31`
**Finding**: `if v_title = ''` — with `v_title IS NULL` this evaluates to NULL, not true, so no `invalid-name` raise.
**Evidence**: `start` guards `v_title is null or v_title = ''`. Currently unreachable (title must be `string` per the preceding type check, so `btrim` never returns NULL), but the safety depends on that earlier check staying exactly as-is. A NULL slipping through would `update projects set name = NULL` → bare `23502` with no DETAIL kind instead of the named `invalid-name`.
**Suggestion**: `if v_title is null or v_title = ''`, matching `start`.

### 12. [nit] Audit "unique per need" index permits multiple NULLs
**Location**: `supabase/migrations/20260919120000_project_need_snapshot.sql:31-32`
**Finding**: `unique ((detail->>'project_id')) where event_kind='need_intake_submitted'` — when `detail->>'project_id'` is NULL, Postgres treats each NULL as distinct.
**Evidence**: Only reachable via operator misuse today (clients have no grant on `audit_events`), but the index guarantees less than its name claims: any number of snapshots with missing `project_id` coexist.
**Suggestion**: `coalesce(detail->>'project_id','')` or a `check (detail ? 'project_id')` on that kind.
