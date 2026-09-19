I have the neighbouring stores, write-route inventory, notification emitter, and org-profile path traced. Below is the attachment map a second structured output and a cause-label vocabulary would use.

### Components Found

| Name | Path | What it does |
|---|---|---|
| `NEED_STAGES` / `NeedStage` | `supabase/functions/_shared/need-intake.ts:6-7` | Closed stage vocabulary: `draft`, `discovery_in_progress`. |
| `NEED_URGENCIES` / `NeedUrgency` | `need-intake.ts:8-9` | Closed urgency vocabulary: `soon`, `this_quarter`, `no_deadline`. |
| `NeedIntakeView` / `NeedIntakeSqlRow` | `need-intake.ts:18-29` | Product view vs SQL row. View adds camelCase, `causeLabels`, and `upload.disclosure`. Title is not a column on `need_intakes`. |
| `ProjectNeedAction` / `ProjectNeedArgs` | `need-intake.ts:30-38` | Write actions `start` \| `save` \| `attach` \| `submit` and the RPC argument bag (`p_account_id`, `p_organization_id`, `p_action`, `p_project_id`, `p_payload`). |
| `decideProjectNeed` | `need-intake.ts:74-130` | TypeScript gate for `project-need`: org-admin, known keys, typed payloads. Does not accept `causeLabels`. |
| `needViewFromSql` / `renderProjectNeed` | `need-intake.ts:47-72, 132-135` | Maps SQL jsonb to `NeedIntakeView`. |
| `needIntakeAnswer` | `need-intake.ts:221-235` | Read orchestration: REST `project` + REST `need`, then `needViewFromSql`. Same 404 for missing and not-yours. |
| `submitGate` / `submitTransition` / `applyNeedPatch` / `intakeSnapshotOf` | `need-intake.ts:160-193` | Pure helpers the suite drives. SQL is the live writer. |
| `NeedReads` | `need-intake.ts:218` | Extra port on `CallerReads`: `need(projectId)`. |
| `REFERENCE_FILE_DISCLOSURE` | `supabase/functions/_shared/need-intake-copy.ts` | Upload copy only (base + Tier-2). No cause-label copy. |
| `WRITE_ROUTES` | `supabase/functions/_shared/write-routes.ts:24-76` | Closed write inventory. Twelve edge routes, zero stand-ins. |
| `WriteRouteSpec` / `writePipeline` / `writeGateDecision` | `write-routes.ts:231-348` | Gate-then-decide. Account-required routes get `AccountStanding`. |
| `WRITE_REFUSAL_KINDS` | `write-routes.ts:80-111` | Closed refusal vocabulary. New kinds must be added here. |
| `writeRoute` | `supabase/functions/_shared/edge.ts:337-437` | The only product write constructor. Loads standing, runs `writePipeline`, optional `prepare`, RPC, optional `settle`/`stream`, `render`. |
| `callerReads` | `edge.ts:455-497` | JWT-bound REST reads: `need_intakes` (explicit select list), `organizations` (includes `mission`), seats, projects, discovery turns, allowance. |
| `TenantReads` / `organizationDashboard` | `supabase/functions/_shared/tenant-reads.ts:33-94` | Pure read orchestration. Holds no tenant rule. Projects `mission` onto `OrganizationDashboard`. |
| `TENANT_NOT_FOUND` / `TENANT_READ_FAILED` | `tenant-reads.ts:11-20` | The one 404 and the one 502 for tenant reads. |
| `TENANT_CATALOG` | `tests/at/suites/req-001/_policy-scan.ts:21-39` | Static RLS posture oracle. Every `public` table must be listed. |
| `TAXONOMY` / `TaxonomyRow` | `supabase/functions/_shared/notification-taxonomy.ts:32-123` | Closed 48-row event table. No add path. |
| `prepareWriteSet` / `createNotifications` / `emit` | `supabase/functions/_shared/notifications.ts:174-381` | Type-branded write-set constructor and the one emitter. Live producers do not call this; they call SQL `emit_notification`. |
| `SENDER_DECLARATIONS` / `NOTIFICATION_COMPONENTS` | `notifications.ts:53-70` | Architecture self-report. `scope.service` is already declared as a non-sender. |
| `renderCopy` | `supabase/functions/_shared/notification-copy.ts:83-94` | Named copy for some events; general template otherwise. |
| `decideOrganizationVetting` / `vettingOutcomeNotice` | `supabase/functions/_shared/org-vetting.ts:83-437` | Builds `p_notice` (channels + copy) from taxonomy row `vetting.outcome`, then SQL emits. |
| `decideContactTransfer` / `decideEscalationContact` / `decideLifecycleChange` | `supabase/functions/_shared/admin-operations.ts` | Platform-admin writes that are not vetting. No notification. |
| `decideOrganizationProfile` | `supabase/functions/_shared/memberships.ts:151-184` | Writes all five profile fields, including `mission`. |
| `RECORD_ELICITATION_TOOL` / `parseElicitation` / `DiscoveryNeed` | `supabase/functions/_shared/discovery-prompt.ts:10-47` | The one structured output today. `DiscoveryNeed` is `{ title, description, urgency, reference_files }` — no mission, no cause labels. |
| `discoveryPrepare` / `settleArgsFrom` / `discovery_turn_settle` | `discovery-turn.ts:90-161` and `supabase/migrations/20260920120000_discovery_turns.sql:221-272` | Prepare counts tokens; settle writes `elicitation` jsonb onto the turn. |
| `AT_CONFIG` | `tests/at/harness/atconfig.ts` | Sole source of pinned numbers. No cause-label or scope knobs. |

---

### Flow

#### A. Need intake write (`project-need`)

1. UI or test POSTs `supabase/functions/project-need`. Entry: `supabase/functions/project-need/index.ts:5-10` → `writeRoute({ name: 'project-need', target: organizationIdField, decide: decideProjectNeed, render: renderProjectNeed })`.
2. `writeRoute` (`edge.ts:347-375`) authenticates, reads JSON, takes `organizationId` as target, loads `write_standing`, runs `writePipeline`.
3. `writeGateDecision` (`write-routes.ts:319-336`) refuses deactivated / no-account / non-NGO.
4. `decideProjectNeed` (`need-intake.ts:74-130`) requires org-admin (`orgAdminActionAllowed`), then branches:
   - `start`: keys `{organizationId, action, title, description, urgency}`; non-empty title; known urgency. `p_project_id: null`. Payload `{ title, description, urgency }`.
   - `save`: keys `{organizationId, action, projectId, patch}`; patch keys `{title, description, urgency}` only.
   - `attach`: keys `{organizationId, action, projectId, file}`; file keys `{fileName, mediaType, byteSize, description}`.
   - `submit`: keys `{organizationId, action, projectId}`; empty payload.
   - Unknown action → `invalid-request`.
   - **No path accepts `causeLabels`.** Extra keys fail.
5. `callDatabaseFunction('project_need', args)` (`edge.ts:375`). Args JSON-serialize 1:1 to SQL params.
6. Live SQL is `public.project_need` from `supabase/migrations/20260918120000_project_need_attach.sql:42-131` (replaces the start-only and save/submit versions):
   - `assert_account_active`.
   - Lock organisation; membership must be `admin`.
   - `start`: platform acknowledgment required; insert `projects` (name = title) + `need_intakes` (description, urgency). `cause_labels` defaults to `'{}'`. Stage defaults to `'draft'`. `submitted_at` null.
   - else: lock `need_intakes` for the project in that org; `no-such-need` if missing.
   - `save` → `need_intake_save` (`20260917130000_project_need_save_and_submit.sql:1-52`): title writes `projects.name`; description/urgency write `need_intakes`. **No stage check. Save after submit is allowed.**
   - `attach` → `need_intake_attach` (`20260918120000_project_need_attach.sql:1-38`): appends a jsonb file object with a new uuid. **No stage check.**
   - `submit` → `need_intake_submit` (`20260919120000_project_need_snapshot.sql:1-28`): if already `discovery_in_progress`, return `changed: false` (idempotent). Else require non-empty description; set `stage = 'discovery_in_progress'`, `submitted_at`, `updated_at`; append audit `need_intake_submitted` with the snapshot. Unique index `audit_events_need_intake_snapshot_once` on `detail->>'project_id'` makes one snapshot per project.
7. Return `{ need: need_intake_view(project_id), changed }`. `need_intake_view` (`20260917120000_project_need_intake.sql:68-76`) is `to_jsonb(n) || { title: p.name }`.
8. `renderProjectNeed` maps that to `{ changed, need: NeedIntakeView }`.

#### B. Need intake read (`need-intake`)

1. POST `supabase/functions/need-intake/index.ts`. **Not a write route.** Uses `edgeHandler` + `callerReads`.
2. `needIntakeAnswer` (`need-intake.ts:221-235`):
   - `reads.project(projectId)` — REST `projects?id=eq.…&select=id,name,org_id,assigned_volunteer_id`.
   - `reads.need(projectId)` — REST `need_intakes?…&select=project_id,description,urgency,stage,cause_labels,reference_files,tier2_classified_at,submitted_at,updated_at` (`edge.ts:471-475`). **Explicit select list. A new column is dropped unless this list is updated.**
   - Zero rows → `TENANT_NOT_FOUND` (same bytes as “not yours”).
   - Joins `org_id` and `title` from the project row, then `needViewFromSql`.

#### C. Discovery turn using the need (where scope / labels would attach)

1. POST `discovery-message` (`supabase/functions/discovery-message/index.ts:8-13`): `writeRoute` with `prepare: discoveryPrepare`, `settle: { rpc: 'discovery_turn_settle', act, stream }`.
2. `decideDiscoveryMessage` then `discoveryPrepare` (`discovery-turn.ts:90-114`):
   - Calls `needIntakeAnswer`. Stage must be `discovery_in_progress` or `need-not-in-discovery`.
   - Builds `DiscoveryNeed` as `{ title, description, urgency, reference_files: fileName[] }` only.
   - **Does not read `organization.mission` or `causeLabels`.**
   - Stashes the counted request on args under `Symbol('discovery prepared request')`. `JSON.stringify` omits symbol keys, so SQL never sees it.
3. SQL `discovery_turn_reserve` (latest body in `20260923120100_organization_discovery_switch.sql:179-241`) re-reads `need_intakes`, requires `discovery_in_progress`, returns a **narrow** need: `{ title: projects.name, description, urgency, reference_files: file names }`.
4. Model may call `record_elicitation`. `settleArgsFrom` (`discovery-turn.ts:121-142`) parses it with `parseElicitation` and passes `p_elicitation`.
5. SQL `discovery_turn_settle` (`20260920120000_discovery_turns.sql:256-260`) writes `elicitation` onto **the turn row**, not onto `need_intakes`.
6. `renderDiscoveryMessage` (`discovery-turn.ts:184-190`) returns `{ turn, reply, elicitation, allowance }`. Conversation read (`conversationAnswer`, `discovery-turn.ts:165-179`) takes the latest non-null `elicitation` across settled turns.

#### D. Write-route registration (how a new write joins)

1. Add a row to `WRITE_ROUTES` (`write-routes.ts:24-76`): `{ surface: { kind: 'edge', rpc: '<sql_fn>' }, standing: { kind: 'account-required', admits: […] } }`.
2. Create `supabase/functions/<name>/index.ts` as exactly one `Deno.serve(writeRoute({ name: '<name>', … }))`.
3. Add `[functions.<name>]\nverify_jwt = true` in `supabase/config.toml`.
4. SQL function: `security definer`, `set search_path = ''`, `assert_account_active`, `revoke execute from public, anon, authenticated, service_role`, `grant execute to service_role`.
5. `writeRoute` boots only if `spec.name in WRITE_ROUTES` (`edge.ts:340-342`).
6. Scan: `scanWriteRoutes` in `tests/at/suites/req-001/_write-route-scan.ts:152-283`. CI hits it via:
   - `writeRouteProblems()` inside `assertDeactivationGatesEveryWrite` (`req-001/_integration.ts:2477`), run by **AT-001.29** (`req-001/f-lifecycle-and-audit.test.ts:48-60`).
   - Harness selftest `tests/at/harness/write-route-scan.selftest.ts:34-37` (`expect(writeRouteProblems()).toEqual([])`).
7. Read functions (`need-intake`, `organization-dashboard`, `discovery-conversation`) stay **out** of `WRITE_ROUTES`. Their `index.ts` does not match `REACHES_DATABASE` (`writeRoute|callDatabaseFunction|/rest/v1/|createClient|.rpc(|SERVICE_ROLE)`). They import `callerReads` from `edge.ts`.

Current `WRITE_ROUTES` (all `kind: 'edge'`):

| Route | RPC | Admits |
|---|---|---|
| `complete-signup` | `complete_signup` | account-absent-by-design |
| `create-organization` | `create_organization` | ngo |
| `update-organization` | `update_organization` | ngo |
| `set-organization-profile` | `set_organization_profile` | ngo |
| `project-need` | `project_need` | ngo |
| `transfer-organization-contact` | `transfer_organization_contact` | platform_admin |
| `set-escalation-contact` | `set_escalation_contact` | platform_admin |
| `set-account-lifecycle` | `set_account_lifecycle` | platform_admin |
| `set-organization-vetting` | `set_organization_vetting` | platform_admin |
| `discovery-allowance` | `discovery_allowance` | ngo |
| `discovery-message` | `discovery_turn_reserve` | ngo |
| `set-organization-discovery` | `set_organization_discovery` | platform_admin |

#### E. Tenant catalog / RLS (how a new table joins)

`TENANT_CATALOG` (`_policy-scan.ts:21-39`):

**tenant-isolated** (RLS on, `grant select` to authenticated, at least one `viewer_*` / `auth.uid()` policy, no tautological `using`, no `for all`, no `to anon`):  
`organizations`, `org_memberships`, `projects`, `need_intakes`, `discovery_turns`, `acknowledgments`, `notification_deliveries`.

**unreachable-by-client-roles** (RLS on, **no** authenticated grant):  
`accounts`, `volunteer_profiles`, `audit_events`, `org_escalation_contacts`, `org_vetting`, `discovery_spend`, `notification_event_types`, `notification_events`, `notification_ops_items`, `notification_fixture_transitions`.

`need_intakes` posture (`20260917120000_project_need_intake.sql:23-30`): revoke all → enable RLS → `grant select` to authenticated → policies `need_intakes_select_org_member` (`viewer_is_org_member(org_id)`) and `need_intakes_select_platform_admin` (`viewer_is_platform_admin()`). Same shape as `discovery_turns`.

A new table must: appear in a migration `create table public.<t>`; `revoke all from anon, authenticated, service_role`; enable RLS; match one posture; be added to `TENANT_CATALOG`. Otherwise `undeclared-table` / `isolated-no-rls` / `isolated-wrong-privileges` / `no-baseline-revoke`. Scan runs at loop (AT-001.21/22/23/40) and live (`assertTenantCatalog` in `_integration.ts:171-202`). CI loop-only; live catalog is the integration half.

`viewer_is_org_member` (`20260906120000_tenant_read_posture_and_org_member_policies.sql:64-83`): security definer, `search_path = ''`, revoke public, grant execute to `authenticated` and `service_role`. Policies may call only `public.viewer_*` functions.

#### F. Notifications (how an emitter is called; sole-writer)

**Taxonomy row shape** (`notification-taxonomy.ts:32-48`): `{ event, recipients, channels | null, tone, class, payloadKeys?, guarded?, opsItem?, escalation? }`. `channels: null` binds to `DEFAULT_BY_CLASS`. Import-time `assertTaxonomyIsLegal` enforces class channel rules.

**All 48 events today** (same names in TS `TAXONOMY` and SQL seed `20260913120000_notification_taxonomy_and_outbox.sql:53-101`):

`triage.approved`, `triage.returned_to_scoped`, `triage.declined_terminal`, `vetting.outcome`, `discovery.fit_declined`, `discovery.fit_decline_review`, `discovery.decline_overturned`, `candidacy.marked`, `match.created`, `match.consented`, `match.declined_or_expired`, `open_project.unmatched_aging`, `abandonment.reminder_14d`, `abandonment.released`, `abandonment.rematch_available`, `funding.pre_deadline_reminder`, `funding.deadline_expired`, `payment.succeeded`, `payment.failed`, `fuel.threshold_20`, `fuel.threshold_5`, `fuel.depleted`, `leftover.released`, `chargeback.opened`, `access.key_issued`, `access.key_revoked`, `gateway.watchdog_failed_closed`, `prd_gate.below_threshold_gap_report`, `prd_gate.passed`, `backlog.live`, `reconciliation.large_drift`, `reconciliation.undecidable_drift`, `pm_item.status_changed`, `pm_item.completed`, `requirement.comment`, `thread.comment`, `blocker.raised`, `blocker.resolved`, `blocker.aging_48h`, `blocker.aging_7d`, `pm_item.status_auto_reverted`, `project.completed`, `provisioning.failed`, `lovable.setup_reminder`, `lovable.credits_low`, `lovable.credits_blocked`, `lovable.setup_pending_raised`, `lovable.setup_complete`.

Forbidden new names (`tests/at/suites/req-016/taxonomy.ts:160`): `/change[._-]?request/i`, `/\bcr\b/i`, `/scope[._-]?change/i`, `/donat/i`. A `scope.change` event would fail AT-016.02.

**Live emit path (vetting, the one landed producer):**

1. `decideOrganizationVetting` (`org-vetting.ts:294-437`) builds `p_notice = vettingOutcomeNotice('vetted'|'unvetted')` = `{ channels: channelsFor(row), copy: renderCopy(row, { outcome }) }`.
2. `writeRoute` JSON-posts args to `set_organization_vetting`.
3. SQL (`20260914120000_org_vetting.sql:256-483`) writes `org_vetting`, audit, discovery grant mark, then **hand-builds** the write set and calls `public.emit_notification(...)`. Recipients: the org seat holder. Channels must be exactly `["email","inapp"]` (decision class default). `opsItem` is null. Event name `'vetting.outcome'`.
4. `createNotifications.emit` is **not** on this path. It is used only in `tests/at/suites/req-016/_fixture.ts` and `_live.ts`.

**Sole-writer scan** (`tests/at/suites/req-016/_source-scan.ts` + `assertEmitterIsSoleWriter` in `_integration.ts:52-107`):

1. `providerClientImporters()` — any `deliver(`, `ProviderPort`, mail-client import, or provider credential in `supabase/functions`, `supabase/migrations`, `src` must map to `notifications.emitter` via `NOTIFICATION_COMPONENTS`. **Do not name a helper `deliver(`.**
2. `strayNotificationWriters()` — `insert into public.notification_events|deliveries|ops_items` allowed only inside `create function public.emit_notification`. Client `.from('notification_*').insert` is never allowed.
3. Self-report: `senders().canSendDirectly` must be exactly `['notifications.emitter']`. `blockers.service`, `scope.service`, `lifecycle.service` must be present and `canSendDirectly: false`.
4. Sentinel `w.fire` per domain; deliveries `emittedBy` must be `notifications.emitter`.
5. `taxonomySeedProblems()` — SQL seed names ↔ TS `TAXONOMY` names, both ways.
6. `runtimeRegistrationSurface()` returns `[]`.

Privilege half: `emit_notification` execute revoked from public, granted to nobody; only owner / another definer. Schema half: `emitted_by = 'notifications.emitter'`. Type half: branded `WriteSet`.

`NOTIFICATION_COMPONENTS['scope.service']` already lists `supabase/functions/_shared/scope.ts` and `supabase/functions/scope/` — those files do not exist yet.

#### G. Organisation mission text

1. **Store:** `public.organizations.mission` added in `supabase/migrations/20260915120000_organization_profile.sql:14-18`. Nullable (signup rows stay valid). Present value must be non-empty after ASCII+NBSP trim.
2. **Write:** route `set-organization-profile` → `decideOrganizationProfile` (`memberships.ts:151-184`) requires org-admin and non-empty `name, mission, country, website, logo` → RPC `set_organization_profile` (`20260915120000_organization_profile.sql:20-114`) trims, re-checks, locks org, updates all five.
3. **Read:** `callerReads.organization` selects `id,name,mission,country,website,logo` (`edge.ts:476-479`). `organizationDashboard` (`tenant-reads.ts:64-94`) copies `row.mission` onto the dashboard. Entry: `supabase/functions/organization-dashboard/index.ts`. AT-002.01/02 (`req-002/a-org-profile.test.ts`) assert persist + dashboard render.
4. **Discovery does not read it.** `discoverySystemPrompt` / `DiscoveryNeed` / reserve SQL omit mission. Decomp `loop/decomp/req-004.md` D4.L4 says cause-taxonomy generation **should** read this text. Attachment: `discoveryPrepare` already has `CallerReads`, which already has `organization()`.

#### H. Where a second structured output (scope) and cause labels attach

**Scope (second tool, beside elicitation):**

- Today: one tool `RECORD_ELICITATION_TOOL`, parsed by `parseElicitation`, stored as `discovery_turns.elicitation` jsonb, returned from settle and from `conversationAnswer`.
- Attach: a second tool next to `RECORD_ELICITATION_TOOL` in `discovery-prompt.ts`; parse in `settleArgsFrom`; extra `p_*` on `discovery_turn_settle` (or a new jsonb column on `discovery_turns`, which is already tenant-isolated). Skill `04-complete-the-record` currently says to call `record_elicitation` when done.

**Cause labels:**

- Column already exists: `need_intakes.cause_labels text[] not null default '{}'` with `need_intakes_draft_has_no_labels` (`stage <> 'draft' or cause_labels = '{}'`). After submit, non-empty labels are allowed.
- **No SQL writer, no TypeScript writer, no vocabulary table.** Grep of `supabase/` hits only the column, the view mapper, and the REST select.
- AT-003.17 (`req-003/c-labels.test.ts`) asserts drafts stay `[]` on write answer, read view, and stored row, including after save.
- Natural writer: `discovery_turn_settle` in the same transaction as the scope tool, while stage is already `discovery_in_progress`. A new `project-need` action would also work but would have to pass `write-routes` + AT-001.29, and decomp says invention is machine-owned (NGO correction is deletion-only).
- Vocabulary: none. `volunteer_profiles` has GitHub fields only (`github_handle`, `top_languages`, `repository_count`, `contribution_summary`). Growing a shared vocabulary needs a new table → `TENANT_CATALOG` + RLS.

**Mission as cause-taxonomy input:** `discoveryPrepare` + `DiscoveryNeed` + reserve SQL need projection + `discoverySystemPrompt` second system block.

---

### Files Read

- `supabase/functions/_shared/need-intake.ts`
- `supabase/functions/_shared/need-intake-copy.ts`
- `supabase/functions/_shared/write-routes.ts`
- `supabase/functions/_shared/edge.ts`
- `supabase/functions/_shared/tenant-reads.ts`
- `supabase/functions/_shared/discovery-reads.ts`
- `supabase/functions/_shared/discovery-turn.ts`
- `supabase/functions/_shared/discovery-prompt.ts`
- `supabase/functions/_shared/discovery-skills/index.ts`
- `supabase/functions/_shared/discovery-skills/02-ground-the-scope.md`
- `supabase/functions/_shared/notifications.ts`
- `supabase/functions/_shared/notification-taxonomy.ts`
- `supabase/functions/_shared/notification-copy.ts`
- `supabase/functions/_shared/org-vetting.ts`
- `supabase/functions/_shared/admin-operations.ts`
- `supabase/functions/_shared/memberships.ts`
- `supabase/functions/project-need/index.ts`
- `supabase/functions/need-intake/index.ts`
- `supabase/functions/set-organization-profile/index.ts`
- `supabase/functions/set-organization-vetting/index.ts`
- `supabase/functions/organization-dashboard/index.ts`
- `supabase/functions/discovery-message/index.ts`
- `supabase/functions/discovery-conversation/index.ts`
- `supabase/migrations/20260917120000_project_need_intake.sql`
- `supabase/migrations/20260917130000_project_need_save_and_submit.sql`
- `supabase/migrations/20260918120000_project_need_attach.sql`
- `supabase/migrations/20260919120000_project_need_snapshot.sql`
- `supabase/migrations/20260915120000_organization_profile.sql`
- `supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql`
- `supabase/migrations/20260914120000_org_vetting.sql`
- `supabase/migrations/20260906120000_tenant_read_posture_and_org_member_policies.sql`
- `supabase/migrations/20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql`
- `supabase/migrations/20260920120000_discovery_turns.sql`
- `supabase/migrations/20260809090000_volunteer_github_link_and_imported_profile.sql` (volunteer_profiles columns)
- `supabase/config.toml` (function blocks)
- `tests/at/suites/req-001/_policy-scan.ts`
- `tests/at/suites/req-001/_write-route-scan.ts`
- `tests/at/suites/req-001/_integration.ts` (catalog + write-route scan hooks)
- `tests/at/suites/req-001/d-tenant-isolation.test.ts`
- `tests/at/suites/req-001/f-lifecycle-and-audit.test.ts`
- `tests/at/suites/req-002/a-org-profile.test.ts`
- `tests/at/suites/req-003/c-labels.test.ts`
- `tests/at/suites/req-004/_source-absences.ts`
- `tests/at/suites/req-016/_source-scan.ts`
- `tests/at/suites/req-016/_integration.ts`
- `tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts`
- `tests/at/suites/req-016/taxonomy.ts`
- `tests/at/harness/atconfig.ts`
- `tests/at/harness/write-route-scan.selftest.ts`
- `src/lib/discovery-chat.ts`
- `loop/decomp/req-004.md`

---

### Boundaries

**In**

- `project-need` JSON: `{ organizationId, action, … }` as above.
- `need-intake` / `discovery-conversation` JSON: `{ projectId }`.
- `set-organization-profile` JSON: `{ organizationId, name, mission, country, website, logo }`.
- `set-organization-vetting` JSON: vet/unvet fields; TypeScript injects `p_notice`.
- `discovery-message` JSON: `{ organizationId, projectId, message }`.

**Out**

- Need write/read: `{ ok, changed?, need: NeedIntakeView }` with `causeLabels: string[]` always present, today always `[]` until something writes the column.
- Dashboard: `{ ok, organizationId, organizationName, mission, country, website, logo, seats, projects }`.
- Discovery settle: `{ ok, turn, reply, elicitation, allowance }`.
- Vetting: `{ ok, organizationId, vetted, changed, notificationEventId }`.

**Does not connect today**

- `src/` has no `project-need` / `need-intake` / `set-organization-profile` / `organization-dashboard` callers. Discovery chat (`src/lib/discovery-chat.ts`) types turns and allowance only.
- Mission is not an input to the Discovery prompt.
- Cause labels are not an output of settle.
- `admin-operations.ts` does not emit notifications. Vetting is the landed producer pattern.
- TypeScript `createNotifications.emit` is test-only. Product producers call `public.emit_notification` inside their definer.

---

### Non-Obvious Things

1. **Title is `projects.name`.** `need_intakes` has no title column. Save of title updates `projects`. Dual projection: write returns SQL `need_intake_view` (`to_jsonb(n)` + title); read joins REST `need` (no title/org_id) with REST `project`. A new column auto-appears on the write view and is **dropped** on the read unless `callerReads.need`’s select list is updated (`edge.ts:473`).
2. **`cause_labels` is a reserved slot, not a feature.** Default `'{}'`, draft check, mapped on the view, never written. After submit the check allows labels. No vocabulary, no CHECK of known strings.
3. **Save and attach ignore stage.** After Discovery starts, description/urgency/title/files still write. Submit is the only action that looks at stage (and is idempotent).
4. **Platform acknowledgment is required only on `start`**, not on save/submit/attach.
5. **Read routes are not write routes.** Adding a write function that names `writeRoute` / `/rest/v1/` / `.rpc(` without a `WRITE_ROUTES` row fails `write-route-unregistered`. Adding `writeRoute` without the inventory row throws at boot.
6. **`JSON.stringify` strips the prepared Discovery request** because it lives under a `Symbol`. That is the in-memory side-channel for data that must not hit SQL. A second structured parse can ride the same args object until settle.
7. **Vetting notification is NGO-only.** `vetting.outcome` recipients are `['ngo']`. The admin is the actor, not a recipient. Copy is prepared in TypeScript; SQL rebuilds the write set by hand and refuses channels other than email+inapp.
8. **`scope.service` is already a declared non-sender** with paths that do not exist. A new `deliver(` in those files, or a mail client import, fails AT-016.01. `FORBIDDEN_EVENT_PATTERNS` bans `scope.change`-shaped event names.
9. **`admin-operations.ts` is not the vetting module.** Contact transfer, escalation contact, lifecycle only. Vetting is `org-vetting.ts`.
10. **`publishingAllowed` / `fundingAllowed` in `org-vetting.ts` are unused by any route** (comments at lines 57 and 71 say so).
11. **One snapshot per project** via unique index on `audit_events` for `need_intake_submitted`. A second successful submit cannot append another snapshot (it returns `changed: false` before the insert).
12. **`need_intake_save` / `need_intake_attach` / `need_intake_submit` execute is revoked from everyone**, including `service_role`. Only `project_need` (definer) may call them.
13. **Tier-2 classification is monotonic** (`need_intakes_keep_classification` trigger). Unrelated to labels, but the same table.
14. **AT_CONFIG has no cause/scope pin.** A “0–3 labels” cap, if tested as a number, would need a registry entry; today it would be a hard-coded test body, which the registry forbids.

---

### Open Questions

- I did not read every later overlay of `discovery_turn_reserve` line-by-line beyond confirming the need projection in `20260921120000` and `20260923120100` is still `{ title, description, urgency, reference_files }`. I did not determine whether funded routing changes that shape further.
- I could not find a cause-label vocabulary anywhere in product SQL or TypeScript. Volunteer matching (REQ-007) is named as a future consumer in the decomp, not as a store.
- I could not determine the intended store for the scope document itself (new jsonb on `discovery_turns` vs new table vs overwrite of `elicitation`). Only elicitation exists.
- I could not determine how a live notification worker is scheduled. `apply_delivery_results` exists in SQL; no edge function under `supabase/functions/` calls `runPass`. Tests drain through the req-016 adapter.
- I did not trace UI screens for org profile or need intake; `src/` has no callers for those functions.
- Exact PostgREST mapping of nested `p_payload` / `p_notice` objects is inferred from the SQL (`jsonb` parameters) and from `JSON.stringify(args)` in `callDatabaseFunction`. I did not inspect a live request body.