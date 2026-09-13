# Candidate 2: the need is the project, from day one

Runner lane: claude:fable. Structural direction: the `public.projects` row is created at intake and carries the need's identity; everything a project row may not carry lives on one companion table keyed by `project_id`.

## Problem

REQ-003 needs a draft that an NGO admin starts, autosaves, attaches metadata to, and submits, plus an audit snapshot at submission. The tree has a `projects` table with an org, a name, a single developer seat, three select policies, a dashboard list (`projectsOf`), a workspace read, and an anonymous public page. It has no intake fields, no stage, no upload path and no snapshot. Two oracles shape the answer before any code exists. The REQ-002 absence oracle refuses a `lifecycle`, `state` or `status` column on `projects` or on any table whose name holds the token `project` (constraint 11). The REQ-002 document oracle refuses storage calls, `bytea`, and a list of column and route names (constraint 12). The public page today shows every `projects` row to the world by id, so a draft stored as a project row leaks its title unless the public read changes. The write frame is fixed: one `Deno.serve(writeRoute(...))` per write, one SECURITY DEFINER per route, refusals as SQLSTATE plus `DETAIL`, and thirteen `atTest` sites with a manifest written before the first run.

This candidate makes the need a `projects` row at the first keystroke, so the draft inherits the seat, the three read policies, the dashboard list and the workspace for free, and puts intake, stage, classification stub, label stub and file metadata on `public.need_intakes`, a 1:1 companion whose name holds no `project` token. The snapshot goes to `audit_events`, not the companion, because the tree already makes that table append-only by trigger and unreachable by every client role; a companion column would need a second immutability trigger to say the same thing. The anonymous public read learns one fact: a project that has a need companion is not public until the publish flow lands.

## Usage (caller's view)

The screen the wiring leaf builds calls two routes. `project-need` is the one write door: `start`, `save`, `attach`, `submit`, every answer the full need view. `need-intake` is the caller-bound read: the same view, filtered by row level security. There is no explicit save: every field change is a `save` with a patch.

```ts
// POST /functions/v1/project-need   (verify_jwt = true, NGO admin of organizationId)
{ organizationId, action: 'start',  title, description?, urgency? }        // creates the projects row + companion
{ organizationId, action: 'save',   projectId, patch: { title?, description?, urgency? } }
{ organizationId, action: 'attach', projectId, file: { fileName, mediaType, byteSize, description? } }
{ organizationId, action: 'submit', projectId }
// every 200 answer:
{ ok: true, changed: boolean, need: NeedIntakeView }

// POST /functions/v1/need-intake   (verify_jwt = true, anyone who can see the project row)
{ projectId }
// 200: { ok: true, need: NeedIntakeView }   404: TENANT_NOT_FOUND   502: TENANT_READ_FAILED
```

The seven unit call sites, in test form over `sut.needs` (the suite's SUT key):

```ts
// Unit 1 — AT-003.01: an unvetted NGO admin starts a need; title and description persist; a draft is not public.
const ngo = await sut.provisionNgo(w.email('ngo-01'), { emailVerified: false });
const started = await sut.startNeed(ngo.session, { organizationId: ngo.organizationId, title: 'Grant deadline tracker', description: 'We miss reporting deadlines...' });
expect(started).toMatchObject({ ok: true, changed: true, need: { stage: 'draft', title: 'Grant deadline tracker' } });
const read = await sut.readNeed(ngo.session, started.need.projectId);
expect(read.ok && read.value.need.description).toBe('We miss reporting deadlines...');
expect((await sut.publicProjectPage(started.need.projectId)).ok, 'a draft is on the public page').toBe(false);
expect(needDefinerCallsAcknowledgmentHook(), 'the start definer does not call has_platform_acknowledgment').toEqual([]);

// Unit 1 — AT-003.04: a member, a volunteer and a visitor are refused, at the route and at the definer.
await sut.setMembershipRoleAsOperator(ngo.organizationId, ngo.accountId, 'member');
expect(await sut.startNeed(ngo.session, req)).toMatchObject({ ok: false, kind: 'not-an-admin', status: 403 });
expect(await sut.attemptNeedDefinerAsOperator({ accountId: ngo.accountId, request: req })).toMatchObject({ ok: false, kind: 'not-an-admin' });
expect(await sut.startNeed(volunteer, req)).toMatchObject({ ok: false, kind: 'not-an-ngo-account', status: 403 });
expect(await sut.startNeed(null, req)).toMatchObject({ ok: false, kind: 'unauthenticated', status: 401 });

// Unit 2 — AT-003.03: verified admin, remaining credits > 0, complete but for the description: blocked on that alone.
const allowance = await sut.readAllowance(ngo.session, ngo.organizationId);
expect(allowance.ok && allowance.allowance.remaining > 0).toBe(true);           // the Given, read, never restated
const blocked = await sut.submitNeed(ngo.session, { organizationId, projectId });
expect(blocked).toMatchObject({ ok: false, kind: 'missing-description', status: 409 });
expect((await sut.needRow(projectId))?.stage).toBe('draft');

// Unit 2 — AT-003.05: two saves with no explicit save action; a second session reads the draft intact.
await sut.saveNeed(ngo.session, { organizationId, projectId, patch: { description: 'Typed so far' } });
const again = await sut.saveNeed(ngo.session, { organizationId, projectId, patch: { description: 'Typed so far' } });
expect(again).toMatchObject({ ok: true, changed: false });                        // autosave twice converges
const second = await sut.signInAgain(ngo.email);                                  // a new session, same admin
expect((await sut.readNeed(second, projectId)).value.need.description).toBe('Typed so far');

// Unit 3 — AT-003.17: a fresh draft carries zero cause labels through the read and the row.
expect((await sut.readNeed(ngo.session, projectId)).value.need.causeLabels).toEqual([]);
expect((await sut.needRow(projectId))?.causeLabels).toEqual([]);

// Unit 4 — AT-003.07 (loop), AT-003.09: attach metadata; the read serves the base disclosure.
const attached = await sut.attachReferenceFile(ngo.session, { organizationId, projectId, file: { fileName: 'grants-tracker.csv', mediaType: 'text/csv', byteSize: 4096, description: 'Sample rows' } });
expect(attached.need.referenceFiles).toHaveLength(1);
expect((await sut.readNeed(ngo.session, projectId)).value.need.upload.disclosure).toEqual({ kind: 'base', text: REFERENCE_FILE_DISCLOSURE.base });

// Unit 5 — AT-003.10: classify Tier-2 as the operator; the very next read is hardened; no attach in between.
await sut.classifyTier2AsOperator(projectId);
expect((await sut.readNeed(ngo.session, projectId)).value.need.upload.disclosure.kind).toBe('tier2-hardened');

// Unit 6 — AT-003.11 / .12: verified admin with capacity submits; draft -> discovery_in_progress; file or no file.
const submitted = await sut.submitNeed(ngo.session, { organizationId, projectId });
expect(submitted).toMatchObject({ ok: true, changed: true, need: { stage: 'discovery_in_progress' } });
expect(await sut.submitNeed(ngo.session, { organizationId, projectId })).toMatchObject({ ok: true, changed: false }); // submit twice is safe

// Unit 7 — AT-003.14 / .16: the snapshot equals the submitted raw intake; a later edit leaves it unchanged.
const [snapshot] = await sut.intakeSnapshots(projectId);
expect(snapshot.detail).toEqual(intakeSnapshotOf(submitted.need));
await sut.saveNeed(ngo.session, { organizationId, projectId, patch: { description: 'Edited after Discovery began' } });
expect((await sut.intakeSnapshots(projectId))).toEqual([snapshot]);
```

## Shape

### Data structures

```sql
-- migration U1: 20260917120000_project_need_intake.sql
create type public.need_stage   as enum ('draft', 'discovery_in_progress');   -- the engine of REQ-005.5 absorbs this
create type public.need_urgency as enum ('soon', 'this_quarter', 'no_deadline');

-- 1:1 companion. The projects row is the need's identity; projects.name IS the title.
create table public.need_intakes (
  project_id          uuid primary key references public.projects (id) on delete cascade,
  description         text,                                              -- null on a draft; the submit gate reads it
  urgency             public.need_urgency,                               -- null until set
  stage               public.need_stage not null default 'draft',
  cause_labels        text[] not null default '{}',                      -- REQ-004's stub; the producer writes here later
  reference_files     jsonb  not null default '[]'::jsonb,               -- REQ-032's stub; metadata only, never content
  tier2_classified_at timestamptz,                                       -- REQ-004's stub; the operator sets it at integration
  submitted_at        timestamptz,
  updated_at          timestamptz not null default now(),
  constraint need_intakes_draft_has_no_labels   check (stage <> 'draft' or cause_labels = '{}'),
  constraint need_intakes_files_are_a_list      check (jsonb_typeof(reference_files) = 'array'),
  constraint need_intakes_submitted_iff_started check ((stage = 'draft') = (submitted_at is null))
);
revoke all on table public.need_intakes from anon, authenticated, service_role;
alter table public.need_intakes enable row level security;
grant select on public.need_intakes to authenticated;
-- the three projects policies, mirrored through the project row, so whoever sees the project sees the need
create policy need_intakes_select_org_member        on public.need_intakes for select to authenticated
  using (public.viewer_is_org_member((select p.org_id from public.projects p where p.id = project_id)));
create policy need_intakes_select_assigned_volunteer on public.need_intakes for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.assigned_volunteer_id = (select auth.uid()))
         and (select public.viewer_is_volunteer()));
create policy need_intakes_select_platform_admin    on public.need_intakes for select to authenticated
  using ((select public.viewer_is_platform_admin()));
-- TENANT_CATALOG gains: need_intakes: 'tenant-isolated'
```

Invariants in the table, not in prose: a draft cannot carry a label (`need_intakes_draft_has_no_labels`); a submitted need has exactly one `submitted_at` and a draft has none; `reference_files` is a list; a need cannot exist without its project row and dies with it; the title cannot be empty because `projects.name` already checks it.

```sql
-- migration U1, continued: the anonymous public read learns that a need is not public.
drop function public.read_public_project(uuid);
create function public.read_public_project(p_project_id uuid)
returns table (project_id uuid, project_name text, organization_name text, need_stage text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, o.name, n.stage::text
    from public.projects p
    join public.organizations o on o.id = p.org_id
    left join public.need_intakes n on n.project_id = p.id
   where p.id = p_project_id;
$$;
-- same revoke/grant as before

-- migration U7a: 20260919110000_audit_event_kind_need_intake.sql
alter type public.audit_event_kind add value 'need_intake_submitted';
```

### The one write definer and its private helpers

```sql
-- U1 lands the dispatcher with `start`; U2 replaces it with `save` and `submit`; U4 with `attach`. Forward
-- migrations, drop + create, as the vetting run did for append_audit_event.
create function public.project_need(
  p_account_id      uuid,
  p_organization_id uuid,
  p_action          text,      -- 'start' | 'save' | 'attach' | 'submit'
  p_project_id      uuid,      -- null for start
  p_payload         jsonb      -- start: {title, description?, urgency?}; save: the patch; attach: file metadata; submit: {}
) returns jsonb                -- { need: <view row>, changed: boolean }
language plpgsql security definer set search_path = '' as $$
declare v_need public.need_intakes; v_changed boolean;
begin
  perform public.assert_account_active(p_account_id);
  -- membership re-check under the organisation row lock: not-a-member / not-an-admin, 42501
  -- TODO: select role from org_memberships where org_id = p_organization_id and account_id = p_account_id for share
  if p_action = 'start' then
    -- has_platform_acknowledgment fires HERE, at creation, as the projects table comment demands
    if not public.has_platform_acknowledgment(p_account_id) then
      raise exception 'project_need refuses %: the account has not accepted the platform terms', p_account_id
        using errcode = '42501', detail = 'platform-acknowledgment-missing';
    end if;
    -- TODO: insert projects (org_id, name) with the trimmed title (empty -> invalid-name, 22023);
    --       insert need_intakes; v_changed := true
  else
    -- constraint 5: the need must belong to the target organisation, under a row lock; one answer for absent and foreign
    select n.* into v_need from public.need_intakes n join public.projects p on p.id = n.project_id
     where n.project_id = p_project_id and p.org_id = p_organization_id for update of n;
    if not found then
      raise exception 'project_need refuses %: no such need in organisation %', p_project_id, p_organization_id
        using errcode = '42501', detail = 'no-such-need';
    end if;
    case p_action
      when 'save'   then v_changed := public.need_intake_save(v_need, p_payload);
      when 'attach' then v_changed := public.need_intake_attach(v_need, p_account_id, p_payload);
      when 'submit' then v_changed := public.need_intake_submit(v_need, p_account_id);
      else raise exception 'project_need refuses an action that is not start, save, attach or submit'
             using errcode = '22023', detail = 'invalid-request';
    end case;
  end if;
  return jsonb_build_object('need', public.need_intake_view(coalesce(p_project_id, v_need.project_id)), 'changed', v_changed);
end $$;
revoke execute on function public.project_need(uuid, uuid, text, uuid, jsonb) from public, anon, authenticated, service_role;
grant  execute on function public.project_need(uuid, uuid, text, uuid, jsonb) to service_role;

-- Private helpers: plain plpgsql, search_path '', execute revoked from public, granted to nobody. They run
-- inside the definer's transaction and lock. Not SECURITY DEFINER, so the definer scan does not see them.
create function public.need_intake_save(v_need public.need_intakes, p_patch jsonb) returns boolean ...
  -- absent key: unchanged. title -> update projects.name (empty -> invalid-name). description that trims to '' -> null.
  -- urgency outside the enum -> invalid-request. Returns whether any stored value differed. Allowed in every stage:
  -- AT-003.16 edits after submission through this door. Sets updated_at only when changed.
create function public.need_intake_attach(v_need public.need_intakes, p_account_id uuid, p_file jsonb) returns boolean ...
  -- validates fileName, mediaType, byteSize > 0, optional description; appends
  -- {id, file_name, media_type, byte_size, description, added_by_account_id, added_at} to reference_files. Always true.
create function public.need_intake_submit(v_need public.need_intakes, p_account_id uuid) returns boolean ...
  -- if v_need.stage = 'discovery_in_progress' then return false;            -- submit twice is safe: no second snapshot
  -- if btrim(coalesce(v_need.description, ''), E' \t\r\n\f' || chr(160)) = '' then
  --   raise exception 'project_need refuses submission of %: the problem description is missing', v_need.project_id
  --     using errcode = 'P0001', detail = 'missing-description';            -- the ONLY gate this helper has
  -- update need_intakes set stage = 'discovery_in_progress', submitted_at = clock_timestamp() ...
  -- U7 adds: perform public.append_audit_event('need_intake_submitted', p_account_id, null, <org>, 'need intake submitted',
  --          <snapshot jsonb: project_id, org_id, title, description, urgency, reference_files, submitted_at>, v_submitted_at);
create function public.need_intake_view(p_project_id uuid) returns jsonb ...
  -- one jsonb of projects.name + every need_intakes column, snake_case, the shape needViewFromSql parses
```

The description gate is isolated from verification and capacity by construction: `need_intake_submit` takes the need row and the caller id and nothing else. It cannot read `auth.users.email_confirmed_at` or `discovery_spend` because no argument names them and no line queries them. REQ-005.5's intake guards land as their own gate in front of this helper. The test still provisions a verified admin and reads remaining credits through the REQ-002 adapter, because the criterion's Given says so.

### Refusal kinds

Added to `WRITE_REFUSAL_KINDS`: `no-such-need`, `missing-description`, `platform-acknowledgment-missing`. Exact `DETAIL` per raise: `not-a-member` and `not-an-admin` (42501, the membership re-check), `no-such-organisation` (23503), `platform-acknowledgment-missing` (42501), `no-such-need` (42501), `invalid-name` (22023, empty title), `invalid-request` (22023, bad action, urgency, patch or file shape), `missing-description` (P0001). Every `writeGateDecision` kind arrives before the definer as today.

### Routes

| Route | Kind | Inventory row | Standing | Config |
|---|---|---|---|---|
| `project-need` | write, `Deno.serve(writeRoute({ name: 'project-need', target: organizationIdField, decide: decideProjectNeed, render: renderProjectNeed }))` | `{ surface: { kind: 'edge', rpc: 'project_need' }, standing: { kind: 'account-required', admits: ['ngo'] } }` | NGO account; admin of the target organisation in `decide` and again in SQL | `[functions.project-need] verify_jwt = true` |
| `need-intake` | read, `edgeHandler` + `resolveCaller` + `callerReads`, as `project-workspace` is built | none (a read) | any authenticated caller; row level security filters | `[functions.need-intake] verify_jwt = true` |

`callerReads` gains one member inside its body and returns `TenantReads & NeedReads`; `TenantReads` itself does not change, so the REQ-001 read doubles (`EMPTY_READS`, `assignedReads`, `twoTenants`) still type-check.

```ts
// edge.ts, inside callerReads (the one place a caller-bound read may live, constraint 4)
need: (projectId) => restJson(`${base}/need_intakes?project_id=eq.${encodeURIComponent(projectId)}&select=project_id,description,urgency,stage,cause_labels,reference_files,tier2_classified_at,submitted_at,updated_at`, { headers }),
```

### `_shared` modules

`supabase/functions/_shared/need-intake.ts` (pure, relative imports only, no Deno):

```ts
export const NEED_STAGES = ['draft', 'discovery_in_progress'] as const;
export type NeedStage = (typeof NEED_STAGES)[number];
export const NEED_URGENCIES = ['soon', 'this_quarter', 'no_deadline'] as const;
export type NeedUrgency = (typeof NEED_URGENCIES)[number];

export type ReferenceFileMetadata = { id: string; fileName: string; mediaType: string; byteSize: number; description: string | null; addedByAccountId: string; addedAt: string };
export type Disclosure =
  | { kind: 'base'; text: string }
  | { kind: 'tier2-hardened'; text: string; acknowledgmentRequired: true };

export type NeedIntakeView = {
  projectId: string; organizationId: string;
  title: string; description: string | null; urgency: NeedUrgency | null;
  stage: NeedStage;
  causeLabels: readonly string[];                 // [] before Discovery; the check constraint makes a draft's [] structural
  referenceFiles: readonly ReferenceFileMetadata[];
  tier2ClassifiedAt: string | null;
  upload: { disclosure: Disclosure };             // DERIVED at read time from tier2ClassifiedAt, never stored
  submittedAt: string | null;
  updatedAt: string;
};

/** The row `need_intake_view` and the `need_intakes` select answer with, snake_case. Parsed at the boundary, once. */
export type NeedIntakeSqlRow = { project_id: string; org_id: string; title: string; description: string | null; urgency: string | null; stage: string; cause_labels: readonly string[]; reference_files: unknown; tier2_classified_at: string | null; submitted_at: string | null; updated_at: string };
export function needViewFromSql(row: NeedIntakeSqlRow): NeedIntakeView;           // throws on an unknown stage or urgency: fail closed

export type ProjectNeedAction = 'start' | 'save' | 'attach' | 'submit';
export type StartPayload = { title: string; description: string | null; urgency: NeedUrgency | null };
export type NeedPatch = { title?: string; description?: string; urgency?: NeedUrgency };
export type ReferenceFileInput = { fileName: string; mediaType: string; byteSize: number; description: string | null };
export type ProjectNeedArgs = {
  readonly p_account_id: string; readonly p_organization_id: string;
  readonly p_action: ProjectNeedAction; readonly p_project_id: string | null;
  readonly p_payload: StartPayload | NeedPatch | ReferenceFileInput | Record<never, never>;
};
/** Admin-of-this-organisation, then per-action field validation. Never reads the stored need: the SQL gate does. */
export function decideProjectNeed(input: AccountWriteRouteInput): WriteRouteDecision<ProjectNeedArgs>;
export function renderProjectNeed(value: unknown): { changed: boolean; need: NeedIntakeView | null };

/** The submission gate, the one rule and the one kind. Shared by the fixture; restated in need_intake_submit. */
export function submitGate(need: Pick<NeedIntakeView, 'description'>): { ok: true } | { ok: false; kind: 'missing-description'; reason: string };
/** The local transition the engine of REQ-005.5 replaces. draft -> discovery_in_progress; already there -> unchanged. */
export function submitTransition(stage: NeedStage): { next: 'discovery_in_progress'; changed: boolean };
/** The disclosure follows the classification, not the next upload. */
export function disclosureFor(tier2ClassifiedAt: string | null): Disclosure;
/** Patch semantics as the fixture and the SQL both apply them: absent = unchanged, '' description = null. */
export function applyNeedPatch(need: NeedIntakeView, patch: NeedPatch): { need: NeedIntakeView; changed: boolean };
/** What the audit row's detail holds. AT-003.14 compares this to the audit row. */
export type IntakeSnapshot = { projectId: string; organizationId: string; title: string; description: string | null; urgency: NeedUrgency | null; referenceFiles: readonly ReferenceFileMetadata[]; submittedAt: string };
export function intakeSnapshotOf(need: NeedIntakeView & { submittedAt: string }): IntakeSnapshot;
export function intakeSnapshotFromDetail(detail: unknown): IntakeSnapshot | null;

/** The read route's orchestration, the shape of projectWorkspace in tenant-reads.ts. */
export type NeedReads = { need(projectId: string): Promise<ReadResult<Omit<NeedIntakeSqlRow, 'org_id' | 'title'>>> };
export type NeedIntakeAnswer = { status: 200; body: { ok: true; need: NeedIntakeView } } | typeof TENANT_NOT_FOUND | typeof TENANT_READ_FAILED;
export function needIntakeAnswer(reads: Pick<TenantReads, 'project'> & NeedReads, projectId: string): Promise<NeedIntakeAnswer>;
```

`supabase/functions/_shared/need-intake-copy.ts`: `REFERENCE_FILE_DISCLOSURE = { base: '<the sentence at design/screens/reference-files.html line 23>', tier2Hardened: { title, body, acknowledgment } }` as `const`. The copy ships here so `disclosureFor` and the wiring leaf's screen read one constant, and the loop test pins the served text against it. The REQ-032 file-policy contract moves this constant into its module later and this file imports it back.

`public-project.ts`: `PublicProjectSource` gains `need_stage: string | null`; `projectIsPublic` becomes `source.need_stage === null`. The comment already says this function is where the publication rule goes; REQ-010/011 replaces the predicate.

### Suite

`tests/at/suites/req-003/`: `_bind.ts` (`bindSuite({ requirement: 'req-003', sut: 'needs' })`), `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, `_source-need.ts`, and `a-capture.test.ts` (01, 02, 04), `b-gate-and-autosave.test.ts` (03, 05), `c-labels.test.ts` (17), `d-reference-files.test.ts` (07, 09, 10), `e-submission.test.ts` (11, 12), `f-snapshot.test.ts` (14, 16). `AdapterModules` gains `'req-003'`. `TENANT_CATALOG` gains one row.

```ts
export type NeedsSut = {
  // provisioning, delegated to the REQ-002 adapter at loop; the live adapter provisions as REQ-002's live does
  provisionNgo(email: string, opts: { emailVerified: boolean }): Promise<NgoActor>;
  provisionVolunteer(email: string): Promise<Session>;
  signInAgain(email: string): Promise<Session>;                                     // the second session of AT-003.05
  setMembershipRoleAsOperator(organizationId: string, accountId: string, role: 'admin' | 'member'): Promise<void>;
  readAllowance(session: Session | null, organizationId: string): Promise<AllowanceOutcome>;   // constraint 19

  // the product operations: the deployed routes at integration, writePipeline over Maps at loop
  startNeed(session: Session | null, request: { organizationId: string; title: string; description?: string; urgency?: NeedUrgency }): Promise<NeedWriteOutcome>;
  saveNeed(session: Session | null, request: { organizationId: string; projectId: string; patch: NeedPatch }): Promise<NeedWriteOutcome>;
  attachReferenceFile(session: Session | null, request: { organizationId: string; projectId: string; file: ReferenceFileInput }): Promise<NeedWriteOutcome>;
  submitNeed(session: Session | null, request: { organizationId: string; projectId: string }): Promise<NeedWriteOutcome>;
  readNeed(session: Session | null, projectId: string): Promise<TenantReadOutcome<{ ok: true; need: NeedIntakeView }>>;
  publicProjectPage(projectId: string): Promise<PublicProjectOutcome>;

  // operator members: Givens and read-backs, never the act under test
  needRow(projectId: string): Promise<NeedIntakeView | null>;
  attemptNeedDefinerAsOperator(input: { accountId: string; request: ProjectNeedRequest }): Promise<{ ok: true } | { ok: false; kind: WriteRefusalKind; reason: string }>;
  classifyTier2AsOperator(projectId: string): Promise<void>;                        // update need_intakes set tier2_classified_at = now()
  intakeSnapshots(projectId: string): Promise<IntakeSnapshotRow[]>;                 // audit_events where event_kind = 'need_intake_submitted'
};
export type NeedWriteOutcome = { ok: true; changed: boolean; need: NeedIntakeView } | WriteRefusal;
```

The loop fixture composes `createFixtureAdapter` of REQ-002 for provisioning, membership role and the allowance read, and keeps its own maps: `needs: Map<projectId, NeedIntakeView>`, `actors: Map<sessionId, { accountId; accountType; roles: Map<orgId, OrgRole> }>`, `snapshots: IntakeSnapshotRow[]`. It builds `WriteStanding` from its own actor map, runs `writePipeline` with the shipped `decideProjectNeed`, and commits with `applyNeedPatch`, `submitGate`, `submitTransition`, `disclosureFor` and `intakeSnapshotOf`. `publicProjectPage` for a project the fixture started runs the shipped `publicProjectAnswer` over a source that carries `need_stage`; any other id is delegated to the inner adapter. The live adapter posts with `functionPost`, reads `need_intakes` and `audit_events` with `sqlClient`, and calls `public.project_need` directly for the operator attempt.

`_source-need.ts` has one arm: the last `project_need` definition in the migrations contains `public.has_platform_acknowledgment(`. It throws when it cannot find the definer, returns a problem list, and has `tests/at/harness/req003-need-oracles.selftest.ts`. AT-003.01's body asserts the list is empty first, as AT-002.05 does with the sentence arm.

### Manifest

`tests/at/expected/req-003.json`, `"requirement": "003"`, written before the first run:

- loop: green 01, 02, 03, 04, 05, 07, 09, 10, 11, 12, 14, 16, 17. Red: none.
- integration: green 01, 02, 03, 04, 05, 11, 12, 14, 16, 17. Red:
  - `AT-003.07`: `{ "kind": "capability-pending", "capabilities": ["storage.reference-upload"] }`. No bucket, no multipart helper, and the document oracle forbids the primitive; the deployed route writes metadata and no byte leaves the test.
  - `AT-003.09`: `["ui.reference-upload-surface"]`. The route serves the copy; "renders" is the wiring leaf's, as AT-002.05 is red on `ui.discovery-surface`.
  - `AT-003.10`: `["ui.reference-upload-surface", "discovery.tier2-classification"]`. The operator sets the column; the event itself is REQ-004's.

Ten green at integration, three red, each on a surface a stranger can name. Until each unit lands, its ids are red at both tiers on `intake.<unit>` names (`intake.gate-and-autosave`, `intake.labels`, `intake.reference-files`, `intake.tier2-disclosure`, `intake.submission`, `intake.snapshot`) and the landing unit flips them, as REQ-002 did.

### The decisions, one paragraph each

**Where the need lives.** A row on `public.projects`, created at `start`, with `projects.name` as the title, plus the 1:1 companion `need_intakes`. The projects comment says creation is not landed and names the hook; this is the leaf that lands it, and the hook fires in `start`. The single developer seat, `viewer_is_org_member` and the two other policies, `projectsOf` on the dashboard and `project-workspace` all work on the row already, so a draft appears in the NGO's project list at the first keystroke with nothing added. The companion holds what constraint 11 forbids on the project row. A table with no join would rebuild the seat and the three policies for a second entity that becomes a project later anyway; that is the same rows twice.

**What the anonymous read does about a draft.** `read_public_project` gains a `need_stage` column by left join and `projectIsPublic` answers false whenever it is not null. A seat-only project the operator inserts stays public, so AT-001.22 and the REQ-002 public-claims tests keep their Given; a need is invisible to the world in every stage until REQ-010's publish flow replaces the predicate. The REQ-001 fixture's source literal gains `need_stage: null`, one line. This is where the direction costs something outside REQ-003 and the run says so.

**The transition until the engine exists.** A local `stage` on the companion with two values and a pure `submitTransition`, so AT-003.11 and .12 are green at both tiers. REQ-005.5's engine absorbs the column into its state table, deletes `need_stage` and `submitTransition`, and puts its intake guards in front of `need_intake_submit`. The public predicate moves with it.

**What "attached" means.** A metadata entry `{ id, fileName, mediaType, byteSize, description, addedByAccountId, addedAt }` appended to `need_intakes.reference_files`. Loop proves the decision, the append and the snapshot copy. Integration cannot prove that a file was uploaded, because no byte path exists and the document oracle refuses one under any ordinary name, so AT-003.07 is red there. REQ-032 lands storage, narrows the REQ-002 document oracle, and moves the list into its own table with an object reference; this run leaves the column as the stub it is.

**What the upload route serves for the disclosure.** The read serves both the kind and the copy: `upload.disclosure` is `{ kind: 'base', text }` or `{ kind: 'tier2-hardened', text, acknowledgmentRequired: true }`. The copy lives as `REFERENCE_FILE_DISCLOSURE` in `need-intake-copy.ts`. Serving copy and kind together means the screen cannot render the wrong text for the kind, and the loop test pins the served text to the constant.

**The Tier-2 stub.** One nullable column `tier2_classified_at`. The operator sets it with one `UPDATE` at integration; `classifyTier2AsOperator` sets it at loop. `disclosureFor` derives the hardened disclosure from the column at every read, so hardening follows classification with no upload in between and nothing to trigger. REQ-004's classification event writes the column, or replaces it with its own record and rewrites `disclosureFor`'s one line.

**Zero cause labels.** `cause_labels text[] not null default '{}'` with `check (stage <> 'draft' or cause_labels = '{}')`. The read projects it. A draft cannot carry a label in the database, not only because no writer exists. REQ-004's producer writes the array after Discovery and the NGO's deletion-only correction removes from it; if REQ-004 wants provenance per label it adds a table and this column goes.

**Where the snapshot lives.** A row on `audit_events`, kind `need_intake_submitted`, written by `need_intake_submit` through `append_audit_event` inside the same transaction as the stage change. The table refuses update, delete and truncate by trigger and no client role reaches it, so "unchanged under later edits" is structural, and no definer here names `audit_events` in an update. The platform retrieves it by operator SQL on `event_kind` and `detail->>'project_id'`, as the vetting audit rows are read. The direction placed the snapshot on the companion; this candidate departs there, because a companion column would need a second immutability trigger to promise what `audit_events` already promises.

**Autosave as a data contract.** `save` carries a patch: an absent key is unchanged, a present key is set, a description that trims to empty becomes null, an empty title is `invalid-name`. The definer takes the need row `for update`, writes only when a value differs, and answers `changed`. The same patch twice answers `changed: false` and leaves `updated_at` alone. A second session of the same admin reads the draft back through `need-intake`. Two sessions writing different fields converge because a patch names only its own keys.

**Refusal kinds.** Three new kinds, listed above with their SQLSTATE and DETAIL. `already-submitted` is deliberately absent: a second submit is a no-op with `changed: false`, not a refusal.

**The red set.** Three ids red at integration only: .07 on `storage.reference-upload`, .09 on `ui.reference-upload-surface`, .10 on that surface and `discovery.tier2-classification`. Zero red at loop.

**Lanes.** Unit 1 goes to the hardest-tasks lane: it lands the table, the dispatcher, the public read change, both `_shared` modules, both routes, and the suite's contract, fixture and live adapters, which every later unit inherits. Units 2 to 7 apply a fixed contract and go to the feature lane.

### Interface depth

Two routes and one RPC. The write door hides the admin re-check, ownership under lock, the acknowledgment hook, patch semantics, the description gate, the transition, the snapshot, and the file-list append. The read door hides row level security, the two-table join and the disclosure derivation. The caller sees one request shape per action and one answer shape for everything. Not exposed: stage names as a state machine the caller drives (submit is the only transition verb), the disclosure rule (derived), the snapshot format (read by the platform only). What remains with the caller: `organizationId` on every write, because `write_standing` needs it (constraint 5), and the `projectId` after `start`.

## Synthesis decision

## Tradeoffs accepted

- We accept editing three REQ-001 surfaces (`read_public_project`, `projectIsPublic`, one fixture literal) in exchange for a draft that is never public without a second visibility store.
- We accept that a draft needs a title at `start` (because `projects.name` is checked non-empty) in exchange for no placeholder name and no second title column.
- We accept a `stage` column and `submitTransition` that REQ-005.5 deletes, in exchange for AT-003.11 and .12 green at both tiers now.
- We accept `reference_files` as a jsonb list and `cause_labels` as an array, both replaced by their owning requirements, in exchange for one table and one posture block.
- We accept one dispatcher replaced by forward migration in units 2 and 4, in exchange for one route, one inventory row and one config block for the whole intake.
- We accept row level security policies that subquery `projects` in exchange for no denormalised `org_id` to keep in sync.
- We accept reads through `need-intake` rather than `project-workspace`, in exchange for leaving `TenantReads` and `projectWorkspace` untouched.

## Alternatives considered

- **A `needs` table with no join to `projects`.** Hides nothing the companion does not; exposes to callers a second identity that must be linked to a project at some later step, and rebuilds the seat, three policies, the dashboard list and the workspace for a second entity. Lost on duplication.
- **Snapshot as a column on the companion.** One table instead of an enum migration, but immutability would need a new trigger and the column would be readable by the NGO through the same policy, which nothing asked for. `audit_events` already promises append-only and platform-only. Lost on invariants.
- **Three write routes (`start-project-need`, `attach-reference-file`, `submit-project-need`).** Same hidden complexity, three inventory rows, three config blocks, three definers with the same membership preamble; a screen coordinates three doors. Lost on interface depth and diff size.
- **Reading the need through `project-workspace`.** One fewer route, but `TenantReads` grows a member and every REQ-001 read double breaks, or the deployed body changes shape under REQ-001's live tests. Lost on blast radius.
- **A `need_reference_files` table now.** Cleaner rows, but a second posture block and a second policy set for a stub REQ-032 replaces. Lost on diff size; noted as the shape REQ-032 should build.

## Open questions and risks

- Does the static policy scan accept a USING clause whose `viewer_is_org_member` argument is a subquery on `projects`? If not, the fallback is an `org_id` column on `need_intakes` with a composite foreign key `(project_id, org_id) references projects (id, org_id)` and a unique index on `projects (id, org_id)`, which keeps the pair consistent structurally. Which does the lead prefer if the scan refuses?
- Should `submit` require urgency as well as the description? The PRD lists urgency as captured; no criterion gates on it. This candidate gates on the description only and leaves urgency nullable.
- Is a need in `discovery_in_progress` correctly invisible on the public page? This candidate hides every need until the publish flow lands. If a Discovery-stage project should be public, the predicate is one comparison.
- Do any REQ-001 or REQ-002 tests pin the `read_public_project` signature or `toEqual` the workspace or public page body? The run must grep before unit 1; the design assumes `toMatchObject` on fields.
- Is `platform-acknowledgment-missing` worth a runtime proof (operator deletes the acknowledgment, `start` refuses) instead of the static arm? The arm is smaller; the runtime proof is stronger.
- Does the REQ-002 fixture need to expose anything for REQ-003 to compose it? This candidate says no: REQ-003 keeps its own actor map for standing. If the lead wants one source of standing at loop, REQ-002's adapter would expose its inner accounts sut.

## Next implementation step

Write migration U1 (`need_intakes`, its posture and three policies, `read_public_project` with `need_stage`, `project_need` with `start` and `need_intake_view`) and `need-intake.ts` with `needViewFromSql`, `decideProjectNeed` and `disclosureFor`, then the suite scaffold with all thirteen call sites and the manifest.

## Per-unit plan

**Unit 1 — capture, admin gate (AT-003.01, .02, .04).** Files: `supabase/migrations/20260917120000_project_need_intake.sql`; `supabase/functions/_shared/need-intake.ts`, `need-intake-copy.ts`; `write-routes.ts` (inventory row, three kinds); `edge.ts` (`callerReads.need`); `public-project.ts` (`need_stage`); `supabase/functions/project-need/index.ts`, `need-intake/index.ts`; `config.toml` (two blocks); `tests/at/suites/req-001/_policy-scan.ts` (catalog row); `tests/at/suites/req-001/_fixture.ts` (one literal); `tests/at/harness/suite-adapters.ts`; `tests/at/suites/req-003/_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, `_source-need.ts`, all six test files with thirteen sites; `tests/at/harness/req003-need-oracles.selftest.ts`; `tests/at/expected/req-003.json`. Tier result: 01, 02, 04 green at loop and integration; the other ten red on `intake.*` names. Lane: hardest tasks.

**Unit 2 — description gate, autosave (AT-003.03, .05).** Files: `supabase/migrations/20260917130000_project_need_save_and_submit.sql` (`need_intake_save`, `need_intake_submit` with the gate and the transition, dispatcher replaced); `need-intake.ts` (`applyNeedPatch`, `submitGate`); `_fixture.ts`, `_live.ts` (`saveNeed`, `submitNeed`, `signInAgain`); `b-gate-and-autosave.test.ts`; manifest. Tier result: 03, 05 green at both. Lane: feature.

**Unit 3 — zero cause labels (AT-003.17).** Files: `c-labels.test.ts`; `_contract.ts` (`causeLabels` already in the view); manifest. The column and its check landed in unit 1. Tier result: 17 green at both. Lane: feature.

**Unit 4 — reference file metadata, base disclosure (AT-003.07, .09).** Files: `supabase/migrations/20260918120000_project_need_attach.sql` (`need_intake_attach`, dispatcher replaced); `need-intake.ts` (`ReferenceFileInput` validation in `decideProjectNeed`); `_fixture.ts`, `_live.ts` (`attachReferenceFile`); `d-reference-files.test.ts`; manifest. Tier result: 07 green at loop, red at integration on `storage.reference-upload`; 09 green at loop, red at integration on `ui.reference-upload-surface`. Lane: feature.

**Unit 5 — Tier-2 hardened disclosure (AT-003.10).** Files: `_fixture.ts`, `_live.ts` (`classifyTier2AsOperator`); `d-reference-files.test.ts`; manifest. No migration: the column and `disclosureFor` landed in unit 1. Tier result: 10 green at loop, red at integration on `ui.reference-upload-surface` and `discovery.tier2-classification`. Lane: feature.

**Unit 6 — submission starts Discovery (AT-003.11, .12).** Files: `need-intake.ts` (`submitTransition`, pinned against the SQL helper in `_source-need.ts`); `e-submission.test.ts` (verified admin, allowance read, with and without a file, submit twice); manifest. The transition itself landed in unit 2 because a gate that could never pass proves nothing. Tier result: 11, 12 green at both. Lane: feature.

**Unit 7 — audit snapshot (AT-003.14, .16).** Files: `supabase/migrations/20260919110000_audit_event_kind_need_intake.sql`, `20260919120000_project_need_snapshot.sql` (`need_intake_submit` replaced to append the row); `need-intake.ts` (`intakeSnapshotOf`, `intakeSnapshotFromDetail`); `_fixture.ts`, `_live.ts` (`intakeSnapshots`); `f-snapshot.test.ts`; manifest. Tier result: 14, 16 green at both. Lane: feature.
