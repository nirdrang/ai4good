You are an adversarial code reviewer. Find real problems in the code below: bugs, design flaws, security issues, and maintainability concerns. You are not here to be helpful or encouraging. You are here to stress-test.

## Intent

The author's stated intent for this change:

> An NGO admin starts a "project need" (the intake) for their organisation: a title, a free-text problem description and an urgency, saved as a draft and autosaved on every change with no explicit save action. The need is a `projects` row (the title is `projects.name`) plus a 1:1 companion row `need_intakes` carrying description, urgency, stage, cause labels, reference file metadata, the Tier-2 classification instant and timestamps. One SECURITY DEFINER `public.project_need(account, org, action, project, payload)` dispatches `start`, `save`, `attach`, `submit` to private plpgsql helpers; the edge route `project-need` decides the request in TypeScript (`decideProjectNeed`) and the SQL re-checks the admin role, the organisation and the platform acknowledgment. A caller-bound read route `need-intake` serves the draft to any member of the organisation through row level security, with a data-responsibility disclosure (base, or Tier-2 hardened once the operator sets `tier2_classified_at`, monotonic by trigger). Submission is gated on the description alone (no verification or capacity check here; those belong to a later lifecycle requirement), moves the local stage `draft` to `discovery_in_progress`, and appends one immutable audit snapshot of the raw intake (`audit_events`, kind `need_intake_submitted`, unique per need by a partial index) in the same transaction. Reference files are metadata only in this run; no bytes, no storage. A draft or a need in Discovery is never public (`read_public_project` gains `need_stage`, public iff null). Cause labels are an empty list until Discovery generates them. Thirteen acceptance ids under `tests/at/suites/req-003/` run at a loop tier (a fixture over the shipped TypeScript modules) and an integration tier (the real Supabase stack); three are red at integration by design, waiting on a storage primitive and an upload screen. The tenant posture rules of this tree apply: baseline revoke, RLS with the `viewer_*` helpers, no subquery in USING, service_role-only definers with `search_path = ''` and `assert_account_active` first, refusals as SQLSTATE plus a DETAIL kind.

You are reviewing whether the code achieves this intent well. Do NOT question the intent itself. Assume the goal is correct and challenge the execution.

## Code Under Review

```diff
diff --git a/supabase/config.toml b/supabase/config.toml
index 5e28d22..c30a030 100644
--- a/supabase/config.toml
+++ b/supabase/config.toml
@@ -574,3 +574,9 @@ enabled = true
 # declarative_schema_path = "./database"
 # JSON string passed through to pg-delta SQL formatting.
 # format_options = "{\"keywordCase\":\"upper\",\"indent\":2,\"maxWidth\":80,\"commaStyle\":\"trailing\"}"
+
+[functions.project-need]
+verify_jwt = true
+
+[functions.need-intake]
+verify_jwt = true
diff --git a/supabase/functions/_shared/edge.ts b/supabase/functions/_shared/edge.ts
index 5c9cb2d..c320946 100644
--- a/supabase/functions/_shared/edge.ts
+++ b/supabase/functions/_shared/edge.ts
@@ -31,6 +31,7 @@
 
 import { callerFromAuthAnswer, type Caller } from './caller.ts';
 import type { ReadResult, TenantReads } from './tenant-reads.ts';
+import type { NeedReads } from './need-intake.ts';
 import type { PublicProjectReads, PublicProjectSource } from './public-project.ts';
 import {
   parseWriteRefusalKind,
@@ -395,10 +396,15 @@ async function restJson<Row>(url: string, init: RequestInit): Promise<ReadResult
   }
 }
 
-export function callerReads(supabaseUrl: string, anonKey: string, authorization: string): TenantReads {
+export function callerReads(supabaseUrl: string, anonKey: string, authorization: string): TenantReads & NeedReads {
   const headers = { apikey: anonKey, Authorization: authorization, Accept: 'application/json' };
   const base = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
   return {
+    need: (projectId) =>
+      restJson(
+        `${base}/need_intakes?project_id=eq.${encodeURIComponent(projectId)}&select=project_id,description,urgency,stage,cause_labels,reference_files,tier2_classified_at,submitted_at,updated_at`,
+        { headers },
+      ),
     organization: (organizationId) =>
       restJson(
         `${base}/organizations?id=eq.${encodeURIComponent(organizationId)}&select=id,name,mission,country,website,logo`,
diff --git a/supabase/functions/_shared/need-intake-copy.ts b/supabase/functions/_shared/need-intake-copy.ts
new file mode 100644
index 0000000..a972401
--- /dev/null
+++ b/supabase/functions/_shared/need-intake-copy.ts
@@ -0,0 +1,11 @@
+export const REFERENCE_FILE_DISCLOSURE = {
+  base: {
+    heading: 'Redacted or sample data only.',
+    body: 'Redacted or sample data only. Files here are seen by ai4good and by your volunteer once matched. Never upload real names, contact details, case notes or anything you would not hand to a stranger — make a copy with sample rows instead.',
+  },
+  tier2Hardened: {
+    heading: 'This project handles sensitive data — fixtures only',
+    body: 'Discovery classified this project Tier 2: the finished tool will touch personal or sensitive records. That changes what may be uploaded here, permanently. What Tier 2 means for files: Nothing real, ever: no genuine names, addresses, health notes, case records or identifying details — not even “just one row to show the format”. Upload fixtures: made-up records in the real structure. The build and all testing run on fixtures; real data only ever enters the finished tool, inside your own accounts, after completion. ai4good and your volunteer see everything you upload here, and every project’s repository is public.',
+    acknowledgment: 'I understand: only made-up sample records (fixtures) will be uploaded to this project — never real personal or sensitive data, in any form.',
+  },
+} as const;
diff --git a/supabase/functions/_shared/need-intake.ts b/supabase/functions/_shared/need-intake.ts
new file mode 100644
index 0000000..7f997d2
--- /dev/null
+++ b/supabase/functions/_shared/need-intake.ts
@@ -0,0 +1,233 @@
+import { orgAdminActionAllowed } from './memberships.ts';
+import { REFERENCE_FILE_DISCLOSURE } from './need-intake-copy.ts';
+import { TENANT_NOT_FOUND, TENANT_READ_FAILED, type ReadResult, type TenantReads } from './tenant-reads.ts';
+import { isRecord, refuseWrite, stringField, type AccountWriteRouteInput, type WriteRouteDecision } from './write-routes.ts';
+
+export const NEED_STAGES = ['draft', 'discovery_in_progress'] as const;
+export type NeedStage = (typeof NEED_STAGES)[number];
+export const NEED_URGENCIES = ['soon', 'this_quarter', 'no_deadline'] as const;
+export type NeedUrgency = (typeof NEED_URGENCIES)[number];
+export type ReferenceFileMetadata = {
+  id: string; fileName: string; mediaType: string; byteSize: number;
+  description: string | null; addedByAccountId: string; addedAt: string;
+};
+export type Disclosure = {
+  level: 'base' | 'tier2-hardened'; acknowledgmentRequired: boolean;
+  heading: string; body: string; acknowledgment: string | null;
+};
+export type NeedIntakeView = {
+  projectId: string; organizationId: string; title: string; description: string | null;
+  urgency: NeedUrgency | null; stage: NeedStage; causeLabels: readonly string[];
+  referenceFiles: readonly ReferenceFileMetadata[]; tier2ClassifiedAt: string | null;
+  upload: { disclosure: Disclosure }; submittedAt: string | null; updatedAt: string;
+};
+export type NeedIntakeSqlRow = {
+  project_id: string; org_id: string; title: string; description: string | null;
+  urgency: string | null; stage: string; cause_labels: readonly string[];
+  reference_files: unknown; tier2_classified_at: string | null;
+  submitted_at: string | null; updated_at: string;
+};
+export type ProjectNeedAction = 'start' | 'save' | 'attach' | 'submit';
+export type StartPayload = { title: string; description: string | null; urgency: NeedUrgency | null };
+export type NeedPatch = { title?: string; description?: string | null; urgency?: NeedUrgency | null };
+export type ReferenceFileInput = { fileName: string; mediaType: string; byteSize: number; description?: string | null };
+export type ProjectNeedArgs = {
+  readonly p_account_id: string; readonly p_organization_id: string;
+  readonly p_action: ProjectNeedAction; readonly p_project_id: string | null;
+  readonly p_payload: StartPayload | NeedPatch | ReferenceFileInput | Record<never, never>;
+};
+
+export function disclosureFor(tier2ClassifiedAt: string | null): Disclosure {
+  if (tier2ClassifiedAt !== null) {
+    return { level: 'tier2-hardened', acknowledgmentRequired: true, ...REFERENCE_FILE_DISCLOSURE.tier2Hardened };
+  }
+  return { level: 'base', acknowledgmentRequired: false, ...REFERENCE_FILE_DISCLOSURE.base, acknowledgment: null };
+}
+
+export function needViewFromSql(row: NeedIntakeSqlRow): NeedIntakeView {
+  if (!(NEED_STAGES as readonly string[]).includes(row.stage)) throw new Error('unknown need stage');
+  if (row.urgency !== null && !(NEED_URGENCIES as readonly string[]).includes(row.urgency)) {
+    throw new Error('unknown need urgency');
+  }
+  if (!Array.isArray(row.reference_files)) throw new Error('need reference files are not a list');
+  const referenceFiles = row.reference_files.map((file: unknown): ReferenceFileMetadata => {
+    if (!isRecord(file) || typeof file.id !== 'string' || typeof file.file_name !== 'string' ||
+        typeof file.media_type !== 'string' || typeof file.byte_size !== 'number' ||
+        (file.description !== null && typeof file.description !== 'string') ||
+        typeof file.added_by_account_id !== 'string' || typeof file.added_at !== 'string') {
+      throw new Error('invalid need reference metadata');
+    }
+    return {
+      id: file.id, fileName: file.file_name, mediaType: file.media_type, byteSize: file.byte_size,
+      description: file.description, addedByAccountId: file.added_by_account_id, addedAt: file.added_at,
+    };
+  });
+  return {
+    projectId: row.project_id, organizationId: row.org_id, title: row.title, description: row.description,
+    urgency: row.urgency as NeedUrgency | null, stage: row.stage as NeedStage,
+    causeLabels: [...row.cause_labels], referenceFiles, tier2ClassifiedAt: row.tier2_classified_at,
+    upload: { disclosure: disclosureFor(row.tier2_classified_at) },
+    submittedAt: row.submitted_at, updatedAt: row.updated_at,
+  };
+}
+
+export function decideProjectNeed(input: AccountWriteRouteInput): WriteRouteDecision<ProjectNeedArgs> {
+  if (input.target === null) return refuseWrite('invalid-request', 400, 'a need write must name its organisation');
+  const allowed = orgAdminActionAllowed(input.standing.orgRole);
+  if (!allowed.ok) return refuseWrite(allowed.kind, 403, allowed.reason);
+  const body = input.body;
+  if (body.action === 'attach') {
+    const projectId = stringField(body.projectId);
+    const file = body.file;
+    if (projectId === null || Object.keys(body).some((key) => !['organizationId', 'action', 'projectId', 'file'].includes(key)) ||
+        !isRecord(file) || Object.keys(file).some((key) => !['fileName', 'mediaType', 'byteSize', 'description'].includes(key)) ||
+        stringField(file.fileName) === null || stringField(file.mediaType) === null ||
+        typeof file.byteSize !== 'number' || !Number.isInteger(file.byteSize) || file.byteSize <= 0 ||
+        ('description' in file && file.description !== null && typeof file.description !== 'string')) {
+      return refuseWrite('invalid-request', 400, 'a reference file requires known fields with valid types');
+    }
+    const payload: ReferenceFileInput = {
+      fileName: stringField(file.fileName)!, mediaType: stringField(file.mediaType)!,
+      byteSize: file.byteSize, description: descriptionField(file.description),
+    };
+    return { ok: true, args: {
+      p_account_id: input.caller.id, p_organization_id: input.target, p_action: 'attach',
+      p_project_id: projectId, p_payload: payload,
+    } };
+  }
+  if (body.action === 'save' || body.action === 'submit') {
+    const keys = body.action === 'save' ? ['organizationId', 'action', 'projectId', 'patch'] : ['organizationId', 'action', 'projectId'];
+    const projectId = stringField(body.projectId);
+    if (projectId === null || Object.keys(body).some((key) => !keys.includes(key))) {
+      return refuseWrite('invalid-request', 400, 'a need write requires a project id and known fields');
+    }
+    const patch = body.action === 'save' ? parseNeedPatch(body.patch) : { ok: true as const, args: {} };
+    if (!patch.ok) return patch;
+    return { ok: true, args: {
+      p_account_id: input.caller.id, p_organization_id: input.target, p_action: body.action,
+      p_project_id: projectId, p_payload: patch.args,
+    } };
+  }
+  if (body.action !== 'start') return refuseWrite('invalid-request', 400, 'a need write requires the start action');
+  if (Object.keys(body).some((key) => !['organizationId', 'action', 'title', 'description', 'urgency'].includes(key))) {
+    return refuseWrite('invalid-request', 400, 'a need write contains an unknown intake field');
+  }
+  const title = stringField(body.title);
+  if (title === null) return refuseWrite('invalid-name', 400, 'a need requires a non-empty title');
+  if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
+    return refuseWrite('invalid-request', 400, 'a need description must be text');
+  }
+  const urgency = body.urgency ?? null;
+  if (urgency !== null && (typeof urgency !== 'string' || !(NEED_URGENCIES as readonly string[]).includes(urgency))) {
+    return refuseWrite('invalid-request', 400, 'a need requires a known urgency');
+  }
+  return { ok: true, args: {
+    p_account_id: input.caller.id, p_organization_id: input.target, p_action: 'start', p_project_id: null,
+    p_payload: { title, description: descriptionField(body.description), urgency: urgency as NeedUrgency | null },
+  } };
+}
+
+export function renderProjectNeed(value: unknown): { changed: boolean; need: NeedIntakeView | null } {
+  if (!isRecord(value)) return { changed: false, need: null };
+  return { changed: value.changed === true, need: isRecord(value.need) ? needViewFromSql(value.need as NeedIntakeSqlRow) : null };
+}
+
+function descriptionField(value: unknown): string | null {
+  return typeof value === 'string' && /[^ \t\r\n\f\u00a0]/.test(value) ? value : null;
+}
+
+function parseNeedPatch(value: unknown): WriteRouteDecision<NeedPatch> {
+  if (!isRecord(value) || Object.keys(value).some((key) => !['title', 'description', 'urgency'].includes(key)) ||
+      ('title' in value && typeof value.title !== 'string') ||
+      ('description' in value && value.description !== null && typeof value.description !== 'string') ||
+      ('urgency' in value && value.urgency !== null &&
+        (typeof value.urgency !== 'string' || !(NEED_URGENCIES as readonly string[]).includes(value.urgency)))) {
+    return refuseWrite('invalid-request', 400, 'a need patch requires known fields with valid types');
+  }
+  const patch: NeedPatch = {};
+  if ('title' in value) {
+    const title = stringField(value.title);
+    if (title === null) return refuseWrite('invalid-name', 400, 'a need requires a non-empty title');
+    patch.title = title;
+  }
+  if ('description' in value) patch.description = descriptionField(value.description);
+  if ('urgency' in value) patch.urgency = value.urgency as NeedUrgency | null;
+  return { ok: true, args: patch };
+}
+
+export function submitGate(need: Pick<NeedIntakeView, 'description'>): { ok: true } | { ok: false; kind: 'missing-description'; reason: string } {
+  return descriptionField(need.description) === null
+    ? { ok: false, kind: 'missing-description', reason: 'the problem description is missing' }
+    : { ok: true };
+}
+export function submitTransition(stage: NeedStage): { next: 'discovery_in_progress'; changed: boolean } {
+  return { next: 'discovery_in_progress', changed: stage === 'draft' };
+}
+export function applyNeedPatch(need: NeedIntakeView, patch: NeedPatch): { need: NeedIntakeView; changed: boolean } {
+  const parsed = parseNeedPatch(patch);
+  if (!parsed.ok) throw new Error(parsed.kind);
+  const next = { ...need, ...parsed.args };
+  const changed = next.title !== need.title || next.description !== need.description || next.urgency !== need.urgency;
+  return { need: changed ? { ...next, updatedAt: new Date().toISOString() } : need, changed };
+}
+export type IntakeSnapshot = {
+  project_id: string; org_id: string; title: string; description: string | null; urgency: NeedUrgency | null;
+  reference_files: readonly {
+    id: string; file_name: string; media_type: string; byte_size: number;
+    description: string | null; added_by_account_id: string; added_at: string;
+  }[];
+  submitted_at: string;
+};
+export function intakeSnapshotOf(need: NeedIntakeView & { submittedAt: string }): IntakeSnapshot {
+  return {
+    project_id: need.projectId, org_id: need.organizationId, title: need.title,
+    description: need.description, urgency: need.urgency,
+    reference_files: need.referenceFiles.map((file) => ({
+      id: file.id, file_name: file.fileName, media_type: file.mediaType, byte_size: file.byteSize,
+      description: file.description, added_by_account_id: file.addedByAccountId, added_at: file.addedAt,
+    })),
+    submitted_at: need.submittedAt,
+  };
+}
+export function intakeSnapshotFromDetail(detail: unknown): IntakeSnapshot | null {
+  if (!isRecord(detail) || typeof detail.project_id !== 'string' || typeof detail.org_id !== 'string' ||
+      typeof detail.title !== 'string' || (detail.description !== null && typeof detail.description !== 'string') ||
+      (detail.urgency !== null && (typeof detail.urgency !== 'string' ||
+        !(NEED_URGENCIES as readonly string[]).includes(detail.urgency))) ||
+      typeof detail.submitted_at !== 'string' || !Array.isArray(detail.reference_files)) return null;
+  const referenceFiles: IntakeSnapshot['reference_files'][number][] = [];
+  for (const file of detail.reference_files) {
+    if (!isRecord(file) || typeof file.id !== 'string' || typeof file.file_name !== 'string' ||
+        typeof file.media_type !== 'string' || typeof file.byte_size !== 'number' ||
+        (file.description !== null && typeof file.description !== 'string') ||
+        typeof file.added_by_account_id !== 'string' || typeof file.added_at !== 'string') return null;
+    referenceFiles.push({
+      id: file.id, file_name: file.file_name, media_type: file.media_type, byte_size: file.byte_size,
+      description: file.description, added_by_account_id: file.added_by_account_id, added_at: file.added_at,
+    });
+  }
+  return {
+    project_id: detail.project_id, org_id: detail.org_id, title: detail.title,
+    description: detail.description, urgency: detail.urgency as NeedUrgency | null,
+    reference_files: referenceFiles, submitted_at: detail.submitted_at,
+  };
+}
+
+export type NeedReads = { need(projectId: string): Promise<ReadResult<Omit<NeedIntakeSqlRow, 'org_id' | 'title'>>> };
+export type NeedIntakeAnswer = { status: 200; body: { ok: true; need: NeedIntakeView } } | typeof TENANT_NOT_FOUND | typeof TENANT_READ_FAILED;
+
+export async function needIntakeAnswer(reads: Pick<TenantReads, 'project'> & NeedReads, projectId: string): Promise<NeedIntakeAnswer> {
+  const project = await reads.project(projectId);
+  if (!project.ok) return TENANT_READ_FAILED;
+  const source = project.rows[0];
+  if (source === undefined) return TENANT_NOT_FOUND;
+  const intake = await reads.need(projectId);
+  if (!intake.ok) return TENANT_READ_FAILED;
+  const row = intake.rows[0];
+  if (row === undefined) return TENANT_NOT_FOUND;
+  try {
+    return { status: 200, body: { ok: true, need: needViewFromSql({ ...row, org_id: source.org_id, title: source.name }) } };
+  } catch {
+    return TENANT_READ_FAILED;
+  }
+}
diff --git a/supabase/functions/_shared/public-project.ts b/supabase/functions/_shared/public-project.ts
index 242e922..1b506b0 100644
--- a/supabase/functions/_shared/public-project.ts
+++ b/supabase/functions/_shared/public-project.ts
@@ -7,7 +7,7 @@
 import type { ReadResult } from './tenant-reads.ts';
 
 export type PublicProjectView = { projectId: string; projectName: string; organizationName: string };
-export type PublicProjectSource = { project_id: string; project_name: string; organization_name: string };
+export type PublicProjectSource = { project_id: string; project_name: string; organization_name: string; need_stage: string | null };
 
 /** ONE answer for "no such project" and "not public", with no way to tell which. Returned, never thrown. */
 export const PROJECT_NOT_PUBLIC = {
@@ -15,13 +15,9 @@ export const PROJECT_NOT_PUBLIC = {
   body: { ok: false, reason: 'no such project page is public' },
 } as const;
 
-/**
- * Whether a project row may be shown to the world. TRUE FOR EVERY ROW TODAY: projects carries no
- * visibility or lifecycle column, and the requirement that owns publication (REQ-010/011) has not landed.
- * This is the one place that requirement puts its rule.
- */
-export function projectIsPublic(_source: PublicProjectSource): boolean {
-  return true;
+/** Needs stay private until the publication rule owned by REQ-010/011 lands. */
+export function projectIsPublic(source: PublicProjectSource): boolean {
+  return source.need_stage === null;
 }
 
 export function publicProjectView(source: PublicProjectSource): PublicProjectView {
diff --git a/supabase/functions/_shared/write-routes.ts b/supabase/functions/_shared/write-routes.ts
index 6b314ff..c1b22bf 100644
--- a/supabase/functions/_shared/write-routes.ts
+++ b/supabase/functions/_shared/write-routes.ts
@@ -40,6 +40,10 @@ export const WRITE_ROUTES = {
     surface: { kind: 'edge', rpc: 'set_organization_profile' },
     standing: { kind: 'account-required', admits: ['ngo'] },
   },
+  'project-need': {
+    surface: { kind: 'edge', rpc: 'project_need' },
+    standing: { kind: 'account-required', admits: ['ngo'] },
+  },
   'transfer-organization-contact': {
     surface: { kind: 'edge', rpc: 'transfer_organization_contact' },
     standing: { kind: 'account-required', admits: ['platform_admin'] },
@@ -88,6 +92,9 @@ export const WRITE_REFUSAL_KINDS = [
   'debit-exceeds-remaining',
   'email-unverified',
   'no-such-organisation',
+  'no-such-need',
+  'missing-description',
+  'platform-acknowledgment-missing',
   'not-the-current-contact',
   'transferee-no-account',
   'transferee-not-ngo',
diff --git a/supabase/functions/need-intake/index.ts b/supabase/functions/need-intake/index.ts
new file mode 100644
index 0000000..631a1d6
--- /dev/null
+++ b/supabase/functions/need-intake/index.ts
@@ -0,0 +1,18 @@
+import { needIntakeAnswer } from '../_shared/need-intake.ts';
+import { callerReads, edgeHandler, json, readJsonBody, refusal, requireEnv, resolveCaller } from '../_shared/edge.ts';
+
+const SUPABASE_URL = requireEnv('SUPABASE_URL');
+const ANON_KEY = requireEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');
+const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
+
+Deno.serve(edgeHandler('need-intake', async (request: Request): Promise<Response> => {
+  if (request.method !== 'POST') return refusal('need-intake accepts POST only', 405);
+  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
+  if (!caller) return refusal('authenticate before reading a need intake', 401);
+  const body = await readJsonBody(request);
+  if (!body.ok) return refusal(body.reason, 400);
+  const projectId = typeof body.value.projectId === 'string' ? body.value.projectId.trim() : '';
+  if (!UUID.test(projectId)) return refusal('a need intake must name the project as a uuid', 400);
+  const answer = await needIntakeAnswer(callerReads(SUPABASE_URL, ANON_KEY, request.headers.get('Authorization')!), projectId);
+  return json(answer.body, answer.status);
+}));
diff --git a/supabase/functions/project-need/index.ts b/supabase/functions/project-need/index.ts
new file mode 100644
index 0000000..3d31688
--- /dev/null
+++ b/supabase/functions/project-need/index.ts
@@ -0,0 +1,10 @@
+import { decideProjectNeed, renderProjectNeed } from '../_shared/need-intake.ts';
+import { writeRoute } from '../_shared/edge.ts';
+import { organizationIdField } from '../_shared/write-routes.ts';
+
+Deno.serve(writeRoute({
+  name: 'project-need',
+  target: organizationIdField,
+  decide: decideProjectNeed,
+  render: renderProjectNeed,
+}));
diff --git a/supabase/migrations/20260917120000_project_need_intake.sql b/supabase/migrations/20260917120000_project_need_intake.sql
new file mode 100644
index 0000000..6c03639
--- /dev/null
+++ b/supabase/migrations/20260917120000_project_need_intake.sql
@@ -0,0 +1,161 @@
+create type public.need_stage as enum ('draft', 'discovery_in_progress');
+create type public.need_urgency as enum ('soon', 'this_quarter', 'no_deadline');
+
+create unique index projects_id_org_id_idx on public.projects (id, org_id);
+
+create table public.need_intakes (
+  project_id uuid primary key,
+  org_id uuid not null,
+  description text,
+  urgency public.need_urgency,
+  stage public.need_stage not null default 'draft',
+  cause_labels text[] not null default '{}',
+  reference_files jsonb not null default '[]'::jsonb,
+  tier2_classified_at timestamptz,
+  submitted_at timestamptz,
+  updated_at timestamptz not null default now(),
+  foreign key (project_id, org_id) references public.projects (id, org_id) on delete cascade,
+  constraint need_intakes_draft_has_no_labels check (stage <> 'draft' or cause_labels = '{}'),
+  constraint need_intakes_files_are_a_list check (jsonb_typeof(reference_files) = 'array'),
+  constraint need_intakes_submitted_iff_started check ((stage = 'draft') = (submitted_at is null))
+);
+
+revoke all on table public.need_intakes from anon, authenticated, service_role;
+alter table public.need_intakes enable row level security;
+grant select on public.need_intakes to authenticated;
+
+create policy need_intakes_select_org_member on public.need_intakes for select to authenticated
+  using (public.viewer_is_org_member(org_id));
+create policy need_intakes_select_assigned_volunteer on public.need_intakes for select to authenticated
+  using (public.viewer_is_volunteer() and exists (
+    select 1 from public.projects p
+     where p.id = need_intakes.project_id and p.assigned_volunteer_id = auth.uid()
+  ));
+create policy need_intakes_select_platform_admin on public.need_intakes for select to authenticated
+  using (public.viewer_is_platform_admin());
+
+create function public.need_intake_classification_is_monotonic()
+returns trigger
+language plpgsql
+set search_path = ''
+as $$
+begin
+  if old.tier2_classified_at is not null
+     and new.tier2_classified_at is distinct from old.tier2_classified_at then
+    raise exception 'the Tier-2 classification cannot be cleared or rewritten'
+      using errcode = '42501';
+  end if;
+  return new;
+end;
+$$;
+revoke execute on function public.need_intake_classification_is_monotonic() from public, anon, authenticated, service_role;
+
+create trigger need_intakes_keep_classification
+before update on public.need_intakes
+for each row execute function public.need_intake_classification_is_monotonic();
+
+drop function public.read_public_project(uuid);
+create function public.read_public_project(p_project_id uuid)
+returns table (project_id uuid, project_name text, organization_name text, need_stage text)
+language sql stable security definer
+set search_path = ''
+as $$
+  select p.id, p.name, o.name, n.stage::text
+    from public.projects p
+    join public.organizations o on o.id = p.org_id
+    left join public.need_intakes n on n.project_id = p.id
+   where p.id = p_project_id;
+$$;
+revoke execute on function public.read_public_project(uuid) from public, anon, authenticated, service_role;
+grant execute on function public.read_public_project(uuid) to service_role;
+
+create function public.need_intake_view(p_project_id uuid)
+returns jsonb
+language sql stable
+set search_path = ''
+as $$
+  select to_jsonb(n) || jsonb_build_object('title', p.name)
+    from public.need_intakes n join public.projects p on p.id = n.project_id
+   where n.project_id = p_project_id;
+$$;
+revoke execute on function public.need_intake_view(uuid) from public, anon, authenticated, service_role;
+
+create function public.project_need(
+  p_account_id uuid,
+  p_organization_id uuid,
+  p_action text,
+  p_project_id uuid,
+  p_payload jsonb
+)
+returns jsonb
+language plpgsql security definer
+set search_path = ''
+as $$
+declare
+  v_role public.org_role;
+  v_project_id uuid;
+  v_title text;
+  v_description text;
+  v_urgency text;
+begin
+  perform public.assert_account_active(p_account_id);
+
+  perform 1 from public.organizations where id = p_organization_id for share;
+  if not found then
+    raise exception 'project_need refuses %: no such organisation', p_organization_id
+      using errcode = '23503', detail = 'no-such-organisation';
+  end if;
+  select role into v_role from public.org_memberships
+   where org_id = p_organization_id and account_id = p_account_id for share;
+  if v_role is null then
+    raise exception 'project_need refuses %: the caller holds no membership in organisation %', p_account_id, p_organization_id
+      using errcode = '42501', detail = 'not-a-member';
+  end if;
+  if v_role <> 'admin' then
+    raise exception 'project_need refuses %: only the admin of organisation % may start a need', p_account_id, p_organization_id
+      using errcode = '42501', detail = 'not-an-admin';
+  end if;
+
+  if p_action is distinct from 'start' then
+    raise exception 'project_need refuses an action other than start'
+      using errcode = '22023', detail = 'invalid-request';
+  end if;
+  if not public.has_platform_acknowledgment(p_account_id) then
+    raise exception 'project_need refuses %: the account has not accepted the platform terms', p_account_id
+      using errcode = '42501', detail = 'platform-acknowledgment-missing';
+  end if;
+  if p_project_id is not null or jsonb_typeof(p_payload) is distinct from 'object' then
+    raise exception 'project_need requires a start payload and no existing project id'
+      using errcode = '22023', detail = 'invalid-request';
+  end if;
+  if exists (select 1 from jsonb_object_keys(p_payload) as k(key) where key not in ('title', 'description', 'urgency')) then
+    raise exception 'project_need refuses an unknown intake field'
+      using errcode = '22023', detail = 'invalid-request';
+  end if;
+  v_title := btrim(p_payload->>'title', E' \t\r\n\f' || chr(160));
+  if jsonb_typeof(p_payload->'title') is distinct from 'string' or v_title is null or v_title = '' then
+    raise exception 'project_need requires a non-empty title'
+      using errcode = '22023', detail = 'invalid-name';
+  end if;
+  if (p_payload ? 'description' and jsonb_typeof(p_payload->'description') not in ('string', 'null'))
+     or (p_payload ? 'urgency' and jsonb_typeof(p_payload->'urgency') not in ('string', 'null')) then
+    raise exception 'project_need requires text intake fields'
+      using errcode = '22023', detail = 'invalid-request';
+  end if;
+  v_description := nullif(btrim(p_payload->>'description', E' \t\r\n\f' || chr(160)), '');
+  v_urgency := p_payload->>'urgency';
+  if v_urgency is not null and v_urgency not in ('soon', 'this_quarter', 'no_deadline') then
+    raise exception 'project_need refuses an unknown urgency'
+      using errcode = '22023', detail = 'invalid-request';
+  end if;
+
+  insert into public.projects (org_id, name) values (p_organization_id, v_title) returning id into v_project_id;
+  insert into public.need_intakes (project_id, org_id, description, urgency)
+    values (v_project_id, p_organization_id, v_description, v_urgency::public.need_urgency);
+  return jsonb_build_object('need', public.need_intake_view(v_project_id), 'changed', true);
+end;
+$$;
+revoke execute on function public.project_need(uuid, uuid, text, uuid, jsonb) from public, anon, authenticated, service_role;
+grant execute on function public.project_need(uuid, uuid, text, uuid, jsonb) to service_role;
+
+notify pgrst, 'reload schema';
diff --git a/supabase/migrations/20260917130000_project_need_save_and_submit.sql b/supabase/migrations/20260917130000_project_need_save_and_submit.sql
new file mode 100644
index 0000000..4ea0d2b
--- /dev/null
+++ b/supabase/migrations/20260917130000_project_need_save_and_submit.sql
@@ -0,0 +1,166 @@
+create function public.need_intake_save(v_need public.need_intakes, p_patch jsonb)
+returns boolean
+language plpgsql
+set search_path = ''
+as $$
+declare
+  v_title text;
+  v_old_title text;
+  v_description text := v_need.description;
+  v_urgency public.need_urgency := v_need.urgency;
+begin
+  if jsonb_typeof(p_patch) is distinct from 'object' then
+    raise exception 'a need patch must be an object'
+      using errcode = '22023', detail = 'invalid-request';
+  end if;
+  if exists (select 1 from jsonb_object_keys(p_patch) as k(key) where key not in ('title', 'description', 'urgency'))
+     or (p_patch ? 'title' and jsonb_typeof(p_patch->'title') is distinct from 'string')
+     or (p_patch ? 'description' and jsonb_typeof(p_patch->'description') not in ('string', 'null'))
+     or (p_patch ? 'urgency' and jsonb_typeof(p_patch->'urgency') not in ('string', 'null')) then
+    raise exception 'a need patch requires known fields with valid types'
+      using errcode = '22023', detail = 'invalid-request';
+  end if;
+  select name into v_old_title from public.projects where id = v_need.project_id;
+  v_title := v_old_title;
+  if p_patch ? 'title' then
+    v_title := btrim(p_patch->>'title', E' \t\r\n\f' || chr(160));
+    if v_title = '' then
+      raise exception 'a need requires a non-empty title'
+        using errcode = '22023', detail = 'invalid-name';
+    end if;
+  end if;
+  if p_patch ? 'description' then
+    v_description := case when btrim(p_patch->>'description', E' \t\r\n\f' || chr(160)) <> '' then p_patch->>'description' else null end;
+  end if;
+  if p_patch ? 'urgency' then
+    if p_patch->>'urgency' not in ('soon', 'this_quarter', 'no_deadline') then
+      raise exception 'a need requires a known urgency'
+        using errcode = '22023', detail = 'invalid-request';
+    end if;
+    v_urgency := (p_patch->>'urgency')::public.need_urgency;
+  end if;
+  if v_title is not distinct from v_old_title and v_description is not distinct from v_need.description
+     and v_urgency is not distinct from v_need.urgency then
+    return false;
+  end if;
+  if v_title is distinct from v_old_title then
+    update public.projects set name = v_title where id = v_need.project_id;
+  end if;
+  update public.need_intakes set description = v_description, urgency = v_urgency, updated_at = clock_timestamp()
+   where project_id = v_need.project_id;
+  return true;
+end;
+$$;
+revoke execute on function public.need_intake_save(public.need_intakes, jsonb) from public, anon, authenticated, service_role;
+
+create function public.need_intake_submit(v_need public.need_intakes, p_account_id uuid)
+returns boolean
+language plpgsql
+set search_path = ''
+as $$
+begin
+  if v_need.stage = 'discovery_in_progress' then return false; end if;
+  if btrim(coalesce(v_need.description, ''), E' \t\r\n\f' || chr(160)) = '' then
+    raise exception 'project_need refuses submission of %: the problem description is missing', v_need.project_id
+      using errcode = 'P0001', detail = 'missing-description';
+  end if;
+  update public.need_intakes set stage = 'discovery_in_progress', submitted_at = clock_timestamp()
+   where project_id = v_need.project_id;
+  return true;
+end;
+$$;
+revoke execute on function public.need_intake_submit(public.need_intakes, uuid) from public, anon, authenticated, service_role;
+
+create or replace function public.project_need(
+  p_account_id uuid,
+  p_organization_id uuid,
+  p_action text,
+  p_project_id uuid,
+  p_payload jsonb
+)
+returns jsonb
+language plpgsql security definer
+set search_path = ''
+as $$
+declare
+  v_need public.need_intakes;
+  v_changed boolean;
+  v_role public.org_role;
+  v_project_id uuid;
+  v_title text;
+  v_description text;
+  v_urgency text;
+begin
+  perform public.assert_account_active(p_account_id);
+
+  perform 1 from public.organizations where id = p_organization_id for share;
+  if not found then
+    raise exception 'project_need refuses %: no such organisation', p_organization_id
+      using errcode = '23503', detail = 'no-such-organisation';
+  end if;
+  select role into v_role from public.org_memberships
+   where org_id = p_organization_id and account_id = p_account_id for share;
+  if v_role is null then
+    raise exception 'project_need refuses %: the caller holds no membership in organisation %', p_account_id, p_organization_id
+      using errcode = '42501', detail = 'not-a-member';
+  end if;
+  if v_role <> 'admin' then
+    raise exception 'project_need refuses %: only the admin of organisation % may start a need', p_account_id, p_organization_id
+      using errcode = '42501', detail = 'not-an-admin';
+  end if;
+
+  if p_action = 'start' then
+    if not public.has_platform_acknowledgment(p_account_id) then
+      raise exception 'project_need refuses %: the account has not accepted the platform terms', p_account_id
+        using errcode = '42501', detail = 'platform-acknowledgment-missing';
+    end if;
+    if p_project_id is not null or jsonb_typeof(p_payload) is distinct from 'object' then
+      raise exception 'project_need requires a start payload and no existing project id'
+        using errcode = '22023', detail = 'invalid-request';
+    end if;
+    if exists (select 1 from jsonb_object_keys(p_payload) as k(key) where key not in ('title', 'description', 'urgency')) then
+      raise exception 'project_need refuses an unknown intake field'
+        using errcode = '22023', detail = 'invalid-request';
+    end if;
+    v_title := btrim(p_payload->>'title', E' \t\r\n\f' || chr(160));
+    if jsonb_typeof(p_payload->'title') is distinct from 'string' or v_title is null or v_title = '' then
+      raise exception 'project_need requires a non-empty title'
+        using errcode = '22023', detail = 'invalid-name';
+    end if;
+    if (p_payload ? 'description' and jsonb_typeof(p_payload->'description') not in ('string', 'null'))
+       or (p_payload ? 'urgency' and jsonb_typeof(p_payload->'urgency') not in ('string', 'null')) then
+      raise exception 'project_need requires text intake fields'
+        using errcode = '22023', detail = 'invalid-request';
+    end if;
+    v_description := case when btrim(p_payload->>'description', E' \t\r\n\f' || chr(160)) <> '' then p_payload->>'description' else null end;
+    v_urgency := p_payload->>'urgency';
+    if v_urgency is not null and v_urgency not in ('soon', 'this_quarter', 'no_deadline') then
+      raise exception 'project_need refuses an unknown urgency'
+        using errcode = '22023', detail = 'invalid-request';
+    end if;
+
+    insert into public.projects (org_id, name) values (p_organization_id, v_title) returning id into v_project_id;
+    insert into public.need_intakes (project_id, org_id, description, urgency)
+      values (v_project_id, p_organization_id, v_description, v_urgency::public.need_urgency) returning * into v_need;
+    v_changed := true;
+  else
+    select n.* into v_need from public.need_intakes n join public.projects p on p.id = n.project_id
+     where n.project_id = p_project_id and p.org_id = p_organization_id for update of n;
+    if not found then
+      raise exception 'project_need refuses %: no such need in organisation %', p_project_id, p_organization_id
+        using errcode = '42501', detail = 'no-such-need';
+    end if;
+    case p_action
+      when 'save' then v_changed := public.need_intake_save(v_need, p_payload);
+      when 'submit' then v_changed := public.need_intake_submit(v_need, p_account_id);
+      else raise exception 'project_need refuses an unsupported action'
+        using errcode = '22023', detail = 'invalid-request';
+    end case;
+  end if;
+  return jsonb_build_object('need', public.need_intake_view(coalesce(p_project_id, v_need.project_id)), 'changed', v_changed);
+end;
+$$;
+revoke execute on function public.project_need(uuid, uuid, text, uuid, jsonb) from public, anon, authenticated, service_role;
+grant execute on function public.project_need(uuid, uuid, text, uuid, jsonb) to service_role;
+
+notify pgrst, 'reload schema';
diff --git a/supabase/migrations/20260918120000_project_need_attach.sql b/supabase/migrations/20260918120000_project_need_attach.sql
new file mode 100644
index 0000000..f47c97a
--- /dev/null
+++ b/supabase/migrations/20260918120000_project_need_attach.sql
@@ -0,0 +1,136 @@
+create function public.need_intake_attach(v_need public.need_intakes, p_account_id uuid, p_file jsonb)
+returns boolean
+language plpgsql
+set search_path = ''
+as $$
+declare
+  v_byte_size numeric;
+begin
+  if jsonb_typeof(p_file) is distinct from 'object' then
+    raise exception 'a reference file requires an object'
+      using errcode = '22023', detail = 'invalid-request';
+  end if;
+  if exists (select 1 from jsonb_object_keys(p_file) as k(key) where key not in ('fileName', 'mediaType', 'byteSize', 'description'))
+     or jsonb_typeof(p_file->'fileName') is distinct from 'string'
+     or btrim(p_file->>'fileName', E' \t\r\n\f' || chr(160)) = ''
+     or jsonb_typeof(p_file->'mediaType') is distinct from 'string'
+     or btrim(p_file->>'mediaType', E' \t\r\n\f' || chr(160)) = ''
+     or jsonb_typeof(p_file->'byteSize') is distinct from 'number'
+     or (p_file ? 'description' and jsonb_typeof(p_file->'description') not in ('string', 'null')) then
+    raise exception 'a reference file requires known fields with valid types'
+      using errcode = '22023', detail = 'invalid-request';
+  end if;
+  v_byte_size := (p_file->>'byteSize')::numeric;
+  if v_byte_size <= 0 or v_byte_size <> trunc(v_byte_size) then
+    raise exception 'a reference file requires a positive whole byte size'
+      using errcode = '22023', detail = 'invalid-request';
+  end if;
+  update public.need_intakes set reference_files = reference_files || jsonb_build_array(jsonb_build_object(
+    'id', gen_random_uuid(),
+    'file_name', btrim(p_file->>'fileName', E' \t\r\n\f' || chr(160)),
+    'media_type', btrim(p_file->>'mediaType', E' \t\r\n\f' || chr(160)),
+    'byte_size', v_byte_size,
+    'description', case when btrim(p_file->>'description', E' \t\r\n\f' || chr(160)) <> '' then p_file->>'description' else null end,
+    'added_by_account_id', p_account_id, 'added_at', clock_timestamp()
+  )), updated_at = clock_timestamp()
+   where project_id = v_need.project_id;
+  return true;
+end;
+$$;
+revoke execute on function public.need_intake_attach(public.need_intakes, uuid, jsonb) from public, anon, authenticated, service_role;
+
+create or replace function public.project_need(
+  p_account_id uuid,
+  p_organization_id uuid,
+  p_action text,
+  p_project_id uuid,
+  p_payload jsonb
+)
+returns jsonb
+language plpgsql security definer
+set search_path = ''
+as $$
+declare
+  v_need public.need_intakes;
+  v_changed boolean;
+  v_role public.org_role;
+  v_project_id uuid;
+  v_title text;
+  v_description text;
+  v_urgency text;
+begin
+  perform public.assert_account_active(p_account_id);
+
+  perform 1 from public.organizations where id = p_organization_id for share;
+  if not found then
+    raise exception 'project_need refuses %: no such organisation', p_organization_id
+      using errcode = '23503', detail = 'no-such-organisation';
+  end if;
+  select role into v_role from public.org_memberships
+   where org_id = p_organization_id and account_id = p_account_id for share;
+  if v_role is null then
+    raise exception 'project_need refuses %: the caller holds no membership in organisation %', p_account_id, p_organization_id
+      using errcode = '42501', detail = 'not-a-member';
+  end if;
+  if v_role <> 'admin' then
+    raise exception 'project_need refuses %: only the admin of organisation % may start a need', p_account_id, p_organization_id
+      using errcode = '42501', detail = 'not-an-admin';
+  end if;
+
+  if p_action = 'start' then
+    if not public.has_platform_acknowledgment(p_account_id) then
+      raise exception 'project_need refuses %: the account has not accepted the platform terms', p_account_id
+        using errcode = '42501', detail = 'platform-acknowledgment-missing';
+    end if;
+    if p_project_id is not null or jsonb_typeof(p_payload) is distinct from 'object' then
+      raise exception 'project_need requires a start payload and no existing project id'
+        using errcode = '22023', detail = 'invalid-request';
+    end if;
+    if exists (select 1 from jsonb_object_keys(p_payload) as k(key) where key not in ('title', 'description', 'urgency')) then
+      raise exception 'project_need refuses an unknown intake field'
+        using errcode = '22023', detail = 'invalid-request';
+    end if;
+    v_title := btrim(p_payload->>'title', E' \t\r\n\f' || chr(160));
+    if jsonb_typeof(p_payload->'title') is distinct from 'string' or v_title is null or v_title = '' then
+      raise exception 'project_need requires a non-empty title'
+        using errcode = '22023', detail = 'invalid-name';
+    end if;
+    if (p_payload ? 'description' and jsonb_typeof(p_payload->'description') not in ('string', 'null'))
+       or (p_payload ? 'urgency' and jsonb_typeof(p_payload->'urgency') not in ('string', 'null')) then
+      raise exception 'project_need requires text intake fields'
+        using errcode = '22023', detail = 'invalid-request';
+    end if;
+    v_description := case when btrim(p_payload->>'description', E' \t\r\n\f' || chr(160)) <> '' then p_payload->>'description' else null end;
+    v_urgency := p_payload->>'urgency';
+    if v_urgency is not null and v_urgency not in ('soon', 'this_quarter', 'no_deadline') then
+      raise exception 'project_need refuses an unknown urgency'
+        using errcode = '22023', detail = 'invalid-request';
+    end if;
+
+    insert into public.projects (org_id, name) values (p_organization_id, v_title) returning id into v_project_id;
+    insert into public.need_intakes (project_id, org_id, description, urgency)
+      values (v_project_id, p_organization_id, v_description, v_urgency::public.need_urgency) returning * into v_need;
+    v_changed := true;
+  else
+    select n.* into v_need from public.need_intakes n join public.projects p on p.id = n.project_id
+     where n.project_id = p_project_id and p.org_id = p_organization_id for update of n;
+    if not found then
+      raise exception 'project_need refuses %: no such need in organisation %', p_project_id, p_organization_id
+        using errcode = '42501', detail = 'no-such-need';
+    end if;
+    case p_action
+      when 'save' then v_changed := public.need_intake_save(v_need, p_payload);
+      when 'attach' then v_changed := public.need_intake_attach(v_need, p_account_id, p_payload);
+      when 'submit' then v_changed := public.need_intake_submit(v_need, p_account_id);
+      else raise exception 'project_need refuses an unsupported action'
+        using errcode = '22023', detail = 'invalid-request';
+    end case;
+  end if;
+  return jsonb_build_object('need', public.need_intake_view(coalesce(p_project_id, v_need.project_id)), 'changed', v_changed);
+end;
+$$;
+revoke execute on function public.project_need(uuid, uuid, text, uuid, jsonb) from public, anon, authenticated, service_role;
+grant execute on function public.project_need(uuid, uuid, text, uuid, jsonb) to service_role;
+
+notify pgrst, 'reload schema';
+
diff --git a/supabase/migrations/20260919110000_audit_event_kind_need_intake.sql b/supabase/migrations/20260919110000_audit_event_kind_need_intake.sql
new file mode 100644
index 0000000..e22265e
--- /dev/null
+++ b/supabase/migrations/20260919110000_audit_event_kind_need_intake.sql
@@ -0,0 +1 @@
+alter type public.audit_event_kind add value 'need_intake_submitted';
diff --git a/supabase/migrations/20260919120000_project_need_snapshot.sql b/supabase/migrations/20260919120000_project_need_snapshot.sql
new file mode 100644
index 0000000..c1c5043
--- /dev/null
+++ b/supabase/migrations/20260919120000_project_need_snapshot.sql
@@ -0,0 +1,34 @@
+create or replace function public.need_intake_submit(v_need public.need_intakes, p_account_id uuid)
+returns boolean
+language plpgsql
+set search_path = ''
+as $$
+declare
+  v_submitted_at timestamptz;
+begin
+  if v_need.stage = 'discovery_in_progress' then return false; end if;
+  if btrim(coalesce(v_need.description, ''), E' \t\r\n\f' || chr(160)) = '' then
+    raise exception 'project_need refuses submission of %: the problem description is missing', v_need.project_id
+      using errcode = 'P0001', detail = 'missing-description';
+  end if;
+  v_submitted_at := clock_timestamp();
+  update public.need_intakes set stage = 'discovery_in_progress', submitted_at = v_submitted_at
+   where project_id = v_need.project_id;
+  perform public.append_audit_event(
+    'need_intake_submitted', p_account_id, null, v_need.org_id, 'need intake submitted',
+    jsonb_build_object(
+      'project_id', v_need.project_id, 'org_id', v_need.org_id,
+      'title', (select name from public.projects where id = v_need.project_id),
+      'description', v_need.description, 'urgency', v_need.urgency,
+      'reference_files', v_need.reference_files, 'submitted_at', v_submitted_at
+    ), v_submitted_at
+  );
+  return true;
+end;
+$$;
+revoke execute on function public.need_intake_submit(public.need_intakes, uuid) from public, anon, authenticated, service_role;
+
+create unique index audit_events_need_intake_snapshot_once on public.audit_events
+  ((detail->>'project_id')) where event_kind = 'need_intake_submitted';
+
+notify pgrst, 'reload schema';
diff --git a/tests/at/expected/req-003.json b/tests/at/expected/req-003.json
new file mode 100644
index 0000000..6a22763
--- /dev/null
+++ b/tests/at/expected/req-003.json
@@ -0,0 +1,17 @@
+{
+  "requirement": "003",
+  "tiers": {
+    "loop": {
+      "green": ["AT-003.01", "AT-003.02", "AT-003.03", "AT-003.04", "AT-003.05", "AT-003.07", "AT-003.09", "AT-003.10", "AT-003.11", "AT-003.12", "AT-003.14", "AT-003.16", "AT-003.17"],
+      "red": {}
+    },
+    "integration": {
+      "green": ["AT-003.01", "AT-003.02", "AT-003.03", "AT-003.04", "AT-003.05", "AT-003.11", "AT-003.12", "AT-003.14", "AT-003.16", "AT-003.17"],
+      "red": {
+        "AT-003.07": { "kind": "capability-pending", "capabilities": ["storage.reference-upload"] },
+        "AT-003.09": { "kind": "capability-pending", "capabilities": ["ui.reference-upload-surface"] },
+        "AT-003.10": { "kind": "capability-pending", "capabilities": ["ui.reference-upload-surface"] }
+      }
+    }
+  }
+}
diff --git a/tests/at/harness/req003-need-oracles.selftest.ts b/tests/at/harness/req003-need-oracles.selftest.ts
new file mode 100644
index 0000000..b102b55
--- /dev/null
+++ b/tests/at/harness/req003-need-oracles.selftest.ts
@@ -0,0 +1,25 @@
+import { describe, expect, it } from 'vitest';
+import { needDefinerCallsAcknowledgmentHook, scanNeedDefinerAcknowledgment } from '../suites/req-003/_source-need.ts';
+
+const definition = (body: string) => `create function public.project_need() returns void language plpgsql as $$ begin ${body} end; $$;`;
+const file = (text: string, path = 'supabase/migrations/001.sql') => ({ path, text });
+
+describe('need creation acknowledgment source arm', () => {
+  it('accepts the shipped definition', () => {
+    expect(needDefinerCallsAcknowledgmentHook()).toEqual([]);
+  });
+  it('refuses injected SQL without the hook and ignores comments and quoted text', () => {
+    expect(scanNeedDefinerAcknowledgment([file(definition('perform public.has_platform_acknowledgment(p_account_id);'))])).toEqual([]);
+    expect(scanNeedDefinerAcknowledgment([file(definition('return;'))])).toHaveLength(1);
+    expect(scanNeedDefinerAcknowledgment([file(definition("-- public.has_platform_acknowledgment(p_account_id);\nraise notice 'public.has_platform_acknowledgment(';"))])).toHaveLength(1);
+  });
+  it('judges the latest definition even when supplied out of order', () => {
+    const older = file(definition('perform public.has_platform_acknowledgment(p_account_id);'));
+    const newer = file(definition('return;'), 'supabase/migrations/002.sql');
+    expect(scanNeedDefinerAcknowledgment([newer, older])).toHaveLength(1);
+  });
+  it('throws when it cannot find the definer', () => {
+    expect(() => scanNeedDefinerAcknowledgment([])).toThrow(/no public.project_need definition/);
+    expect(() => scanNeedDefinerAcknowledgment([file('select 1;')])).toThrow(/no public.project_need definition/);
+  });
+});
diff --git a/tests/at/harness/shipped-tenant-reads.selftest.ts b/tests/at/harness/shipped-tenant-reads.selftest.ts
index 30fa9b8..be9a63a 100644
--- a/tests/at/harness/shipped-tenant-reads.selftest.ts
+++ b/tests/at/harness/shipped-tenant-reads.selftest.ts
@@ -65,6 +65,7 @@ const PRESENT: TenantReads = {
 };
 
 const SOURCE: PublicProjectSource = {
+  need_stage: null,
   project_id: PROJECT_A,
   project_name: 'Website',
   organization_name: 'Riverside Shelter',
@@ -130,9 +131,10 @@ describe('publicProjectAnswer', () => {
     const missing = await publicProjectAnswer(ABSENT, { source: async () => ({ ok: true, rows: [] }) });
     expect(missing).toBe(PROJECT_NOT_PUBLIC);
     expect(projectIsPublic(SOURCE)).toBe(true);
-    // The predicate is true for every row today, so a present source cannot take the false arm.
-    // The shipped function still has one `return PROJECT_NOT_PUBLIC` for both conditions; the
-    // constant compared here is that return value.
+    const draft = await publicProjectAnswer(PROJECT_A, {
+      source: async () => ({ ok: true, rows: [{ ...SOURCE, need_stage: 'draft' }] }),
+    });
+    expect(draft).toBe(PROJECT_NOT_PUBLIC);
     expect(JSON.stringify(missing)).toBe(JSON.stringify(PROJECT_NOT_PUBLIC));
   });
 
diff --git a/tests/at/harness/suite-adapters.ts b/tests/at/harness/suite-adapters.ts
index f397022..4381f85 100644
--- a/tests/at/harness/suite-adapters.ts
+++ b/tests/at/harness/suite-adapters.ts
@@ -108,6 +108,7 @@ type CheckedAdapterModules<M extends { [R in keyof M & string]: AdapterModuleFor
 export type AdapterModules = CheckedAdapterModules<{
   'req-001': typeof import('../suites/req-001/_fixture.ts');
   'req-002': typeof import('../suites/req-002/_fixture.ts');
+  'req-003': typeof import('../suites/req-003/_fixture.ts');
   'req-016': typeof import('../suites/req-016/_fixture.ts');
 }>;
 
diff --git a/tests/at/suites/req-001/_contract.ts b/tests/at/suites/req-001/_contract.ts
index 3c48958..7cf368f 100644
--- a/tests/at/suites/req-001/_contract.ts
+++ b/tests/at/suites/req-001/_contract.ts
@@ -295,6 +295,7 @@ export type EscalationContactRequest = {
 export type EscalationOutcome = { ok: true; organizationId: string } | WriteRefusal;
 
 export type WriteSubject =
+  | { readonly route: 'project-need'; readonly organizationId: string; readonly action: 'start'; readonly title: string }
   | { readonly route: 'complete-signup'; readonly name: string }
   | { readonly route: 'create-organization'; readonly name: string }
   | { readonly route: 'update-organization'; readonly organizationId: string; readonly name: string }
diff --git a/tests/at/suites/req-001/_fixture.ts b/tests/at/suites/req-001/_fixture.ts
index 1339322..471e878 100644
--- a/tests/at/suites/req-001/_fixture.ts
+++ b/tests/at/suites/req-001/_fixture.ts
@@ -275,6 +275,7 @@ import {
   type TenantReads,
 } from '../../../../supabase/functions/_shared/tenant-reads.ts';
 import { publicProjectAnswer } from '../../../../supabase/functions/_shared/public-project.ts';
+import { decideProjectNeed } from '../../../../supabase/functions/_shared/need-intake.ts';
 import { CapabilityPending } from '../../harness/pending.ts';
 import type {
   AccountLifecycle,
@@ -1683,6 +1684,16 @@ export function createFixtureAdapter({ clock, worlds }: AdapterOptions) {
       const asAttempt = async (outcome: { ok: true } | WriteRefusal): Promise<WriteAttemptOutcome> =>
         outcome.ok ? { ok: true } : outcome;
       const attempts: Record<WriteRouteName, () => Promise<WriteAttemptOutcome>> = {
+        'project-need': async () => {
+          if (subject.route !== 'project-need') throw new Error('unreachable');
+          const run = runWrite(
+            { name: 'project-need', target: organizationIdField, decide: decideProjectNeed },
+            session,
+            { organizationId: subject.organizationId, action: subject.action, title: subject.title },
+            null,
+          );
+          return run.ok ? { ok: true } : run;
+        },
         'complete-signup': async () => {
           if (session === null) return { ok: false, kind: 'unauthenticated', status: 401, reason: DEAD_SESSION_REASON };
           if (subject.route !== 'complete-signup') throw new Error('unreachable');
@@ -1827,7 +1838,7 @@ export function createFixtureAdapter({ clock, worlds }: AdapterOptions) {
           if (!organization) return { ok: true, rows: [] };
           return {
             ok: true,
-            rows: [{ project_id: project.id, project_name: project.name, organization_name: organization.name }],
+            rows: [{ project_id: project.id, project_name: project.name, organization_name: organization.name, need_stage: null }],
           };
         },
       });
diff --git a/tests/at/suites/req-001/_integration.ts b/tests/at/suites/req-001/_integration.ts
index 57b18d2..2d8255d 100644
--- a/tests/at/suites/req-001/_integration.ts
+++ b/tests/at/suites/req-001/_integration.ts
@@ -2239,6 +2239,8 @@ function deactivatedSubject(
 ): WriteSubject {
   const organizationId = organizationOf(actors, accountType, 'deactivated');
   switch (route) {
+    case 'project-need':
+      return { route, organizationId, action: 'start', title: `Need ${tag} deactivated` };
     case 'complete-signup':
       return { route, name: `Write ${tag} complete-signup ${accountType} deactivated` };
     case 'create-organization':
@@ -2289,6 +2291,8 @@ function deactivatedSubject(
 
 async function snapshotWrite(sut: AccountsSut, session: Session | null, subject: WriteSubject) {
   switch (subject.route) {
+    case 'project-need':
+      return { dashboard: await sut.organizationDashboard(session, subject.organizationId) };
     case 'create-organization':
       return { organizations: await sut.organizationsNamed(subject.name) };
     case 'update-organization':
@@ -2321,6 +2325,12 @@ async function provisionActiveControl(
   accountType: AccountType,
 ): Promise<{ session: Session; subject: WriteSubject }> {
   switch (route) {
+    case 'project-need': {
+      const ngo = await signIn(w.email(`need-on-${tag}`));
+      await ensureVerified(sut, ngo);
+      const organizationId = await completeNgo(sut, ngo, `Need Host ${tag}`);
+      return { session: ngo, subject: { route, organizationId, action: 'start', title: `Need ${tag}` } };
+    }
     case 'complete-signup': {
       const fresh = await signIn(w.email(`signup-on-${tag}`));
       await ensureVerified(sut, fresh);
diff --git a/tests/at/suites/req-001/_live.ts b/tests/at/suites/req-001/_live.ts
index fae7353..2e38380 100644
--- a/tests/at/suites/req-001/_live.ts
+++ b/tests/at/suites/req-001/_live.ts
@@ -922,6 +922,13 @@ export async function createLiveAdapter(opts: { stack: Stack }): Promise<{
       const asAttempt = async (outcome: { ok: true } | WriteRefusal): Promise<WriteAttemptOutcome> =>
         outcome.ok ? { ok: true } : outcome;
       const attempts: Record<WriteRouteName, () => Promise<WriteAttemptOutcome>> = {
+        'project-need': async () => {
+          if (subject.route !== 'project-need') throw new Error('unreachable');
+          const answer = await postWrite('project-need', session, {
+            organizationId: subject.organizationId, action: subject.action, title: subject.title,
+          });
+          return answer.ok ? { ok: true } : answer.refusal;
+        },
         'complete-signup': async () => {
           if (subject.route !== 'complete-signup') throw new Error('unreachable');
           if (session === null) {
diff --git a/tests/at/suites/req-001/_policy-scan.ts b/tests/at/suites/req-001/_policy-scan.ts
index 392e4b7..0efaae1 100644
--- a/tests/at/suites/req-001/_policy-scan.ts
+++ b/tests/at/suites/req-001/_policy-scan.ts
@@ -22,6 +22,7 @@ export const TENANT_CATALOG: { readonly [table: string]: TenantPosture } = {
   organizations: 'tenant-isolated',
   org_memberships: 'tenant-isolated',
   projects: 'tenant-isolated',
+  need_intakes: 'tenant-isolated',
   acknowledgments: 'tenant-isolated',
   accounts: 'unreachable-by-client-roles',
   volunteer_profiles: 'unreachable-by-client-roles',
diff --git a/tests/at/suites/req-001/d-tenant-isolation.test.ts b/tests/at/suites/req-001/d-tenant-isolation.test.ts
index 7e39839..e0cbacc 100644
--- a/tests/at/suites/req-001/d-tenant-isolation.test.ts
+++ b/tests/at/suites/req-001/d-tenant-isolation.test.ts
@@ -140,6 +140,7 @@ atTest(
       expect(viaVolunteer.answer.body).toBe(JSON.stringify(TENANT_NOT_FOUND.body));
 
       const source = {
+        need_stage: null,
         project_id: FOREIGN_ID,
         project_name: 'Website',
         organization_name: 'Riverside Shelter',
diff --git a/tests/at/suites/req-003/_bind.ts b/tests/at/suites/req-003/_bind.ts
new file mode 100644
index 0000000..a4ea23e
--- /dev/null
+++ b/tests/at/suites/req-003/_bind.ts
@@ -0,0 +1,8 @@
+import { bindSuite } from '../../harness/registry.ts';
+import type { AtContext as HarnessAtContext, OpenWorld as HarnessOpenWorld } from '../../harness/registry.ts';
+
+export { AtPending, CapabilityPending, TIER, TIERS } from '../../harness/registry.ts';
+export type AtContext = HarnessAtContext<'req-003', 'needs'>;
+export type OpenWorld = HarnessOpenWorld<'req-003', 'needs'>;
+
+export const { atTest, defineEvidenceCapture } = bindSuite({ requirement: 'req-003', sut: 'needs' });
diff --git a/tests/at/suites/req-003/_contract.ts b/tests/at/suites/req-003/_contract.ts
new file mode 100644
index 0000000..0d647bf
--- /dev/null
+++ b/tests/at/suites/req-003/_contract.ts
@@ -0,0 +1,38 @@
+import type {
+  IntakeSnapshot, NeedIntakeView, NeedPatch, NeedUrgency, ReferenceFileInput,
+} from '../../../../supabase/functions/_shared/need-intake.ts';
+import type {
+  AllowanceOutcome, NgoActor, PublicProjectOutcome, Session, TenantReadOutcome, World, WriteRefusal, WriteRefusalKind,
+} from '../req-002/_contract.ts';
+
+export type { IntakeSnapshot, NeedIntakeView, NeedPatch, NeedUrgency, ReferenceFileInput };
+export type { AllowanceOutcome, NgoActor, PublicProjectOutcome, Session, TenantReadOutcome, World, WriteRefusal, WriteRefusalKind };
+
+export type StartNeedRequest = { organizationId: string; title: string; description?: string | null; urgency?: NeedUrgency | null };
+export type ProjectNeedRequest =
+  | (StartNeedRequest & { action: 'start' })
+  | { organizationId: string; action: 'save'; projectId: string; patch: NeedPatch }
+  | { organizationId: string; action: 'attach'; projectId: string; file: ReferenceFileInput }
+  | { organizationId: string; action: 'submit'; projectId: string };
+export type NeedWriteOutcome = { ok: true; changed: boolean; need: NeedIntakeView } | WriteRefusal;
+export type IntakeSnapshotRow = {
+  id: string; occurredAt: string; actorAccountId: string | null; actorLabel: string;
+  subjectOrgId: string; reason: string; detail: IntakeSnapshot;
+};
+export type NeedsSut = {
+  provisionNgo(email: string, opts: { emailVerified: boolean }): Promise<NgoActor>;
+  provisionVolunteer(email: string): Promise<Session>;
+  signInAgain(email: string): Promise<Session>;
+  setMembershipRoleAsOperator(organizationId: string, accountId: string, role: 'admin' | 'member'): Promise<void>;
+  readAllowance(session: Session | null, organizationId: string): Promise<AllowanceOutcome>;
+  startNeed(session: Session | null, request: StartNeedRequest): Promise<NeedWriteOutcome>;
+  saveNeed(session: Session | null, request: Omit<Extract<ProjectNeedRequest, { action: 'save' }>, 'action'>): Promise<NeedWriteOutcome>;
+  attachReferenceFile(session: Session | null, request: Omit<Extract<ProjectNeedRequest, { action: 'attach' }>, 'action'>): Promise<NeedWriteOutcome>;
+  submitNeed(session: Session | null, request: Omit<Extract<ProjectNeedRequest, { action: 'submit' }>, 'action'>): Promise<NeedWriteOutcome>;
+  readNeed(session: Session | null, projectId: string): Promise<TenantReadOutcome<{ ok: true; need: NeedIntakeView }>>;
+  publicProjectPage(projectId: string): Promise<PublicProjectOutcome>;
+  needRow(projectId: string): Promise<NeedIntakeView | null>;
+  attemptNeedDefinerAsOperator(input: { accountId: string; request: ProjectNeedRequest }): Promise<{ ok: true } | { ok: false; kind: WriteRefusalKind; reason: string }>;
+  classifyTier2AsOperator(projectId: string): Promise<void>;
+  intakeSnapshots(projectId: string): Promise<IntakeSnapshotRow[]>;
+};
diff --git a/tests/at/suites/req-003/_fixture.ts b/tests/at/suites/req-003/_fixture.ts
new file mode 100644
index 0000000..fdaa79d
--- /dev/null
+++ b/tests/at/suites/req-003/_fixture.ts
@@ -0,0 +1,193 @@
+import {
+  applyNeedPatch, submitGate, submitTransition, intakeSnapshotOf, decideProjectNeed, disclosureFor, needIntakeAnswer, type NeedIntakeSqlRow, type ProjectNeedArgs, type StartPayload, type ReferenceFileInput, type ReferenceFileMetadata,
+} from '../../../../supabase/functions/_shared/need-intake.ts';
+import { publicProjectAnswer } from '../../../../supabase/functions/_shared/public-project.ts';
+import {
+  organizationIdField, parseWriteStanding, writePipeline, type AccountWriteRouteInput, type WriteRouteSpec, type WriteRefusalKind,
+} from '../../../../supabase/functions/_shared/write-routes.ts';
+import { createFixtureAdapter as createOrganizationsFixtureAdapter } from '../req-002/_fixture.ts';
+import type { IntakeSnapshotRow, NeedIntakeView, NeedPatch, NeedsSut, NeedWriteOutcome, ProjectNeedRequest, Session } from './_contract.ts';
+
+export const requirement = 'req-003' as const;
+const SPEC: WriteRouteSpec<ProjectNeedArgs, AccountWriteRouteInput> = {
+  name: 'project-need', target: organizationIdField, decide: decideProjectNeed,
+};
+type Actor = { accountId: string; accountType: 'ngo' | 'volunteer'; roles: Map<string, 'admin' | 'member'> };
+
+export function createFixtureAdapter(opts: Parameters<typeof createOrganizationsFixtureAdapter>[0]) {
+  const inner = createOrganizationsFixtureAdapter(opts);
+  const organizations = inner.sut.organizations;
+  const actors = new Map<string, Actor>();
+  const emailActors = new Map<string, Actor>();
+  const needs = new Map<string, NeedIntakeView>();
+  const snapshots: IntakeSnapshotRow[] = [];
+
+  const start = (args: ProjectNeedArgs): Extract<NeedWriteOutcome, { ok: true }> => {
+    const payload = args.p_payload as StartPayload;
+    const need: NeedIntakeView = {
+      projectId: crypto.randomUUID(), organizationId: args.p_organization_id,
+      title: payload.title, description: payload.description, urgency: payload.urgency,
+      stage: 'draft', causeLabels: [], referenceFiles: [], tier2ClassifiedAt: null,
+      upload: { disclosure: disclosureFor(null) }, submittedAt: null, updatedAt: new Date(opts.clock.now()).toISOString(),
+    };
+    needs.set(need.projectId, structuredClone(need));
+    return { ok: true, changed: true, need: structuredClone(need) };
+  };
+
+  const commit = (args: ProjectNeedArgs): NeedWriteOutcome & ({ ok: true } | { ok: false; kind: WriteRefusalKind }) => {
+    if (args.p_action === 'start') return start(args);
+    const need = needs.get(args.p_project_id!);
+    if (need === undefined || need.organizationId !== args.p_organization_id) {
+      return { ok: false, kind: 'no-such-need', status: 409, reason: 'no such need in this organisation' };
+    }
+    if (args.p_action === 'save') {
+      const result = applyNeedPatch(need, args.p_payload as NeedPatch);
+      needs.set(need.projectId, structuredClone(result.need));
+      return { ok: true, ...structuredClone(result) };
+    }
+    if (args.p_action === 'attach') {
+      const payload = args.p_payload as ReferenceFileInput;
+      const addedAt = new Date(opts.clock.now()).toISOString();
+      const file: ReferenceFileMetadata = {
+        ...payload, description: payload.description ?? null, id: crypto.randomUUID(),
+        addedByAccountId: args.p_account_id, addedAt,
+      };
+      const attached = { ...need, referenceFiles: [...need.referenceFiles, file], updatedAt: addedAt };
+      needs.set(need.projectId, structuredClone(attached));
+      return { ok: true, changed: true, need: structuredClone(attached) };
+    }
+    if (args.p_action === 'submit') {
+      if (need.stage === 'discovery_in_progress') return { ok: true, changed: false, need: structuredClone(need) };
+      const gate = submitGate(need);
+      if (!gate.ok) return { ...gate, status: 409 };
+      const transition = submitTransition(need.stage);
+      const submitted = { ...need, stage: transition.next, submittedAt: new Date(opts.clock.now()).toISOString() };
+      needs.set(need.projectId, submitted);
+      if (transition.changed) snapshots.push({
+        id: crypto.randomUUID(), occurredAt: submitted.submittedAt, actorAccountId: args.p_account_id,
+        actorLabel: 'ngo:' + args.p_account_id, subjectOrgId: need.organizationId,
+        reason: 'need intake submitted', detail: intakeSnapshotOf(submitted),
+      });
+      return { ok: true, changed: transition.changed, need: structuredClone(submitted) };
+    }
+    return { ok: false, kind: 'invalid-request', status: 409, reason: 'unsupported action' };
+  };
+  const write = async (session: Session | null, request: ProjectNeedRequest): Promise<NeedWriteOutcome> => {
+    const actor = session === null ? undefined : actors.get(session.sessionId);
+    if (actor === undefined || actor.accountId !== session?.accountId) {
+      return { ok: false, kind: 'unauthenticated', status: 401, reason: 'authenticate before starting a need' };
+    }
+    const standing = parseWriteStanding({
+      account: { account_type: actor.accountType, lifecycle: 'active' },
+      org_exists: (await organizations.profile(request.organizationId)) !== null,
+      org_role: actor.roles.get(request.organizationId) ?? null, org_seat_account_id: null, subject: null,
+    });
+    const decision = writePipeline(SPEC, {
+      caller: { id: actor.accountId, githubHandle: null }, standing, body: request,
+      target: request.organizationId, subject: null, ip: null,
+    });
+    return decision.ok ? commit(decision.args) : decision;
+  };
+
+  const sut: NeedsSut = {
+    provisionNgo: async (email, options) => {
+      const ngo = await organizations.provisionNgo(email, options);
+      actors.set(ngo.session.sessionId, { accountId: ngo.accountId, accountType: 'ngo', roles: new Map([[ngo.organizationId, 'admin']]) });
+      emailActors.set(email, actors.get(ngo.session.sessionId)!);
+      return ngo;
+    },
+    provisionVolunteer: async (email) => {
+      const session = await organizations.provisionVolunteer(email);
+      actors.set(session.sessionId, { accountId: session.accountId, accountType: 'volunteer', roles: new Map() });
+      return session;
+    },
+    signInAgain: async (email) => {
+      const actor = emailActors.get(email);
+      if (actor === undefined) throw new Error('no account for this email');
+      const session = { accountId: actor.accountId, email, sessionId: crypto.randomUUID() };
+      actors.set(session.sessionId, actor);
+      return session;
+    },
+    setMembershipRoleAsOperator: async (organizationId, accountId, role) => {
+      await organizations.setMembershipRoleAsOperator(organizationId, accountId, role);
+      for (const actor of actors.values()) {
+        if (actor.accountId === accountId) actor.roles.set(organizationId, role);
+      }
+    },
+    readAllowance: (session, organizationId) => organizations.readAllowance(session, organizationId),
+    startNeed: (session, request) => write(session, { ...request, action: 'start' }),
+    saveNeed: (session, request) => write(session, { ...request, action: 'save' }),
+    attachReferenceFile: (session, request) => write(session, { ...request, action: 'attach' }),
+    submitNeed: (session, request) => write(session, { ...request, action: 'submit' }),
+    readNeed: async (session: Session | null, projectId) => {
+      const actor = session === null ? undefined : actors.get(session.sessionId);
+      if (actor === undefined || actor.accountId !== session?.accountId) {
+        return { ok: false, answer: { status: 401, body: JSON.stringify({ ok: false, reason: 'authenticate before reading a need intake' }) } };
+      }
+      const stored = needs.get(projectId);
+      const visible = stored !== undefined && actor.roles.has(stored.organizationId) ? stored : undefined;
+      const answer = await needIntakeAnswer({
+        project: async () => ({ ok: true, rows: visible === undefined ? [] : [{ id: visible.projectId, name: visible.title, org_id: visible.organizationId, assigned_volunteer_id: null }] }),
+        need: async () => ({ ok: true, rows: visible === undefined ? [] : [sqlRow(visible)] }),
+      }, projectId);
+      const raw = { status: answer.status, body: JSON.stringify(answer.body) };
+      return answer.status === 200 ? { ok: true, value: answer.body, answer: raw } : { ok: false, answer: raw };
+    },
+    publicProjectPage: async (projectId) => {
+      const need = needs.get(projectId);
+      if (need === undefined) return organizations.publicProjectPage(projectId);
+      const organization = await organizations.profile(need.organizationId);
+      const result = await publicProjectAnswer(projectId, { source: async () => ({ ok: true, rows: [{
+        project_id: projectId, project_name: need.title, organization_name: organization!.name, need_stage: need.stage,
+      }] }) });
+      const answer = { status: result.status, body: JSON.stringify(result.body) };
+      return result.status === 200 ? { ok: true, page: result.body, answer } : { ok: false, answer };
+    },
+    needRow: async (projectId) => structuredClone(needs.get(projectId) ?? null),
+    attemptNeedDefinerAsOperator: async ({ accountId, request }) => {
+      const actor = [...actors.values()].find((candidate) => candidate.accountId === accountId);
+      const role = actor?.roles.get(request.organizationId);
+      if (role === undefined) return { ok: false, kind: 'not-a-member', reason: 'the caller holds no membership in this organisation' };
+      if (role !== 'admin') return { ok: false, kind: 'not-an-admin', reason: 'only the admin of this organisation may start a need' };
+      if (request.action !== 'start') {
+        const need = needs.get(request.projectId);
+        if (need === undefined || need.organizationId !== request.organizationId) {
+          return { ok: false, kind: 'no-such-need', reason: 'no such need in this organisation' };
+        }
+      }
+      const decision = decideProjectNeed({
+        caller: { id: accountId, githubHandle: null },
+        standing: { kind: 'account', accountType: actor!.accountType, lifecycle: 'active', orgRole: role,
+          orgExists: true, orgSeatAccountId: null, subject: null },
+        body: request, target: request.organizationId, subject: null, ip: null,
+      });
+      if (!decision.ok) return decision;
+      const result = commit(decision.args);
+      if (!result.ok) return result;
+      return { ok: true };
+    },
+    classifyTier2AsOperator: async (projectId) => {
+      const need = needs.get(projectId);
+      if (need === undefined) throw new Error('no such need to classify');
+      need.tier2ClassifiedAt ??= new Date(opts.clock.now()).toISOString();
+      need.upload.disclosure = disclosureFor(need.tier2ClassifiedAt);
+    },
+    intakeSnapshots: async (projectId) => structuredClone(snapshots.filter((row) => row.detail.project_id === projectId)),
+  };
+  return {
+    sut: { needs: sut }, fixtures: inner.fixtures,
+    teardown: async () => { await inner.teardown(); actors.clear(); emailActors.clear(); needs.clear(); snapshots.length = 0; },
+  };
+}
+
+function sqlRow(need: NeedIntakeView): NeedIntakeSqlRow {
+  return {
+    project_id: need.projectId, org_id: need.organizationId, title: need.title,
+    description: need.description, urgency: need.urgency, stage: need.stage, cause_labels: [...need.causeLabels],
+    reference_files: need.referenceFiles.map((file) => ({
+      id: file.id, file_name: file.fileName, media_type: file.mediaType, byte_size: file.byteSize,
+      description: file.description, added_by_account_id: file.addedByAccountId, added_at: file.addedAt,
+    })),
+    tier2_classified_at: need.tier2ClassifiedAt, submitted_at: need.submittedAt, updated_at: need.updatedAt,
+  };
+}
diff --git a/tests/at/suites/req-003/_live.ts b/tests/at/suites/req-003/_live.ts
new file mode 100644
index 0000000..72bd7af
--- /dev/null
+++ b/tests/at/suites/req-003/_live.ts
@@ -0,0 +1,154 @@
+import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';
+import { intakeSnapshotFromDetail, needViewFromSql, type NeedIntakeSqlRow } from '../../../../supabase/functions/_shared/need-intake.ts';
+import { parseWriteRefusalKind } from '../../../../supabase/functions/_shared/write-routes.ts';
+import { authPost, followLink, functionPost, functionPostRaw, sqlClient, verifyLinksFor, type Stack } from '../../harness/live-stack.ts';
+import { createLiveAdapter as createOrganizationsLiveAdapter } from '../req-002/_live.ts';
+import type { NeedIntakeView, NeedsSut, NeedWriteOutcome, Session, TenantReadOutcome } from './_contract.ts';
+
+export const requirement = 'req-003' as const;
+const PASSWORD = 'correct horse battery staple';
+const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
+const CLIENT_IP = '203.0.113.7';
+const SIGNER = {
+  signerName: 'Dana Okonkwo', signerTitle: 'Executive Director',
+  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
+};
+
+export async function createLiveAdapter(opts: { stack: Stack }) {
+  const { stack } = opts;
+  const inner = await createOrganizationsLiveAdapter(opts);
+  const sql = sqlClient(stack);
+  const sessions = new Map<string, { accountId: string; accessToken: string }>();
+  const allowanceSessions = new Map<string, Session>();
+
+  const bearerOf = (session: Session | null): string => {
+    if (session === null) return stack.anonKey;
+    const held = sessions.get(session.sessionId);
+    if (held === undefined || held.accountId !== session.accountId) throw new Error('this handle holds no session');
+    return held.accessToken;
+  };
+  const signIn = async (email: string): Promise<Session> => {
+    const answer = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password: PASSWORD });
+    const token = answer.json.access_token;
+    if (typeof token !== 'string' || token === '') throw new Error(`password grant for ${email} returned no token`);
+    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { sub: string; session_id: string };
+    const session = { accountId: claims.sub, sessionId: claims.session_id, email };
+    sessions.set(session.sessionId, { accountId: session.accountId, accessToken: token });
+    return session;
+  };
+  const signup = async (email: string): Promise<Session> => {
+    const answer = await authPost(stack, '/auth/v1/signup', { email, password: PASSWORD });
+    if (answer.status >= 400) throw new Error(`signup for ${email} answered ${answer.status}`);
+    const link = (await verifyLinksFor(stack, email, 'signup'))[0];
+    if (link === undefined) throw new Error(`no confirmation email for ${email}`);
+    const used = await followLink(link);
+    if (used.status >= 400) throw new Error(`following confirmation for ${email} answered ${used.status}`);
+    return signIn(email);
+  };
+  const postNeed = async (session: Session | null, body: Record<string, unknown>): Promise<NeedWriteOutcome> => {
+    const { status, json } = await functionPost(stack, 'project-need', body, bearerOf(session), CLIENT_IP);
+    if (status >= 400 || json.ok !== true) {
+      return { ok: false, status, kind: status === 401 ? 'unauthenticated' : parseWriteRefusalKind(json.kind),
+        reason: String(json.reason ?? json.message ?? `project-need answered ${status}`) };
+    }
+    if (json.need === null || typeof json.need !== 'object') throw new Error('project-need returned no need');
+    return { ok: true, changed: json.changed === true, need: json.need as NeedIntakeView };
+  };
+
+  const sut: NeedsSut = {
+    provisionNgo: async (email, options) => {
+      const ngo = await inner.sut.organizations.provisionNgo(email, { emailVerified: true });
+      const session = await signIn(email);
+      allowanceSessions.set(session.sessionId, ngo.session);
+      if (!options.emailVerified) {
+        const rows = await sql`update auth.users set email_confirmed_at = null where id = ${ngo.accountId}::uuid returning id` as { id: string }[];
+        if (rows.length !== 1) throw new Error('no auth user whose email confirmation could be cleared');
+      }
+      return { ...ngo, session };
+    },
+    provisionVolunteer: async (email) => {
+      const session = await signup(email);
+      const githubHandle = `vol-${session.accountId.replace(/-/g, '').slice(0, 20)}`;
+      await sql`insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
+        values (${crypto.randomUUID()}::uuid, ${githubHandle}, ${session.accountId}::uuid,
+          ${JSON.stringify({ sub: githubHandle, user_name: githubHandle, provider_id: githubHandle })}::text::jsonb,
+          'github', now(), now(), now())`;
+      const answer = await functionPost(stack, 'complete-signup', {
+        accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER,
+      }, bearerOf(session), CLIENT_IP);
+      if (answer.status >= 400 || answer.json.ok !== true) throw new Error(`volunteer completion answered ${answer.status}`);
+      return session;
+    },
+    signInAgain: signIn,
+    setMembershipRoleAsOperator: (organizationId, accountId, role) =>
+      inner.sut.organizations.setMembershipRoleAsOperator(organizationId, accountId, role),
+    readAllowance: (session, organizationId) => {
+      if (session === null) return inner.sut.organizations.readAllowance(null, organizationId);
+      const held = allowanceSessions.get(session.sessionId);
+      if (held === undefined || held.accountId !== session.accountId) throw new Error('no held session for the allowance read');
+      return inner.sut.organizations.readAllowance(held, organizationId);
+    },
+    startNeed: (session, request) => postNeed(session, { ...request, action: 'start' }),
+    saveNeed: (session, request) => postNeed(session, { ...request, action: 'save' }),
+    attachReferenceFile: (session, request) => postNeed(session, { ...request, action: 'attach' }),
+    submitNeed: (session, request) => postNeed(session, { ...request, action: 'submit' }),
+    readNeed: async (session, projectId): Promise<TenantReadOutcome<{ ok: true; need: NeedIntakeView }>> => {
+      const raw = await functionPostRaw(stack, 'need-intake', { projectId }, bearerOf(session));
+      const answer = { status: raw.status, body: raw.text };
+      if (raw.status !== 200) return { ok: false, answer };
+      const value = JSON.parse(raw.text) as { ok: true; need: NeedIntakeView };
+      if (value.ok !== true || !value.need) throw new Error('need-intake returned no need');
+      return { ok: true, value, answer };
+    },
+    publicProjectPage: (projectId) => inner.sut.organizations.publicProjectPage(projectId),
+    needRow: async (projectId) => {
+      const rows = await sql`select to_jsonb(n) || jsonb_build_object('title', p.name) as need
+        from public.need_intakes n join public.projects p on p.id = n.project_id where n.project_id = ${projectId}::uuid` as { need: unknown }[];
+      if (rows.length === 0) return null;
+      const raw: unknown = rows[0].need;
+      return needViewFromSql((typeof raw === 'string' ? JSON.parse(raw) : raw) as NeedIntakeSqlRow);
+    },
+    attemptNeedDefinerAsOperator: async ({ accountId, request }) => {
+      const projectId = request.action === 'start' ? null : request.projectId;
+      const payload = request.action === 'start'
+        ? { title: request.title, description: request.description ?? null, urgency: request.urgency ?? null }
+        : request.action === 'save' ? request.patch : request.action === 'attach' ? request.file : {};
+      try {
+        await sql`select public.project_need(${accountId}::uuid, ${request.organizationId}::uuid,
+          ${request.action}::text, ${projectId}::uuid, ${JSON.stringify(payload)}::text::jsonb)`;
+        return { ok: true };
+      } catch (error) {
+        const carrier = error as { detail?: string; message?: string; cause?: { detail?: string } };
+        return { ok: false, kind: parseWriteRefusalKind(carrier.detail ?? carrier.cause?.detail), reason: carrier.message ?? String(error) };
+      }
+    },
+    classifyTier2AsOperator: async (projectId) => {
+      const rows = await sql`update public.need_intakes set tier2_classified_at = coalesce(tier2_classified_at, now())
+        where project_id = ${projectId}::uuid returning project_id` as { project_id: string }[];
+      if (rows.length === 0) throw new Error('no such need to classify');
+    },
+    intakeSnapshots: async (projectId) => {
+      const rows = await sql`select id, occurred_at, actor_account_id, actor_label, subject_org_id, reason, detail
+        from public.audit_events where event_kind = 'need_intake_submitted'
+          and detail->>'project_id' = ${projectId} order by occurred_at, id` as {
+        id: string; occurred_at: string | Date; actor_account_id: string | null; actor_label: string;
+        subject_org_id: string; reason: string; detail: unknown;
+      }[];
+      return rows.map((event) => {
+        const detail = intakeSnapshotFromDetail(typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail);
+        if (detail === null) throw new Error(`audit row ${event.id} has no intake snapshot`);
+        return {
+          id: event.id, occurredAt: new Date(event.occurred_at).toISOString(),
+          actorAccountId: event.actor_account_id, actorLabel: event.actor_label,
+          subjectOrgId: event.subject_org_id, reason: event.reason, detail,
+        };
+      });
+    },
+  };
+  return {
+    sut: { needs: sut }, fixtures: inner.fixtures,
+    teardown: async () => {
+      try { await inner.teardown(); } finally { await sql.close(); sessions.clear(); allowanceSessions.clear(); }
+    },
+  };
+}
diff --git a/tests/at/suites/req-003/_pending.ts b/tests/at/suites/req-003/_pending.ts
new file mode 100644
index 0000000..3517055
--- /dev/null
+++ b/tests/at/suites/req-003/_pending.ts
@@ -0,0 +1,11 @@
+import { CapabilityPending } from './_bind.ts';
+
+export const AWAITED = {
+  referenceUpload: 'storage.reference-upload',
+  uploadSurface: 'ui.reference-upload-surface',
+} as const;
+
+export type AwaitedSurface = (typeof AWAITED)[keyof typeof AWAITED];
+export function awaiting(...surfaces: AwaitedSurface[]): () => Promise<void> {
+  return async () => { throw new CapabilityPending(surfaces); };
+}
diff --git a/tests/at/suites/req-003/_source-need.ts b/tests/at/suites/req-003/_source-need.ts
new file mode 100644
index 0000000..bf721c2
--- /dev/null
+++ b/tests/at/suites/req-003/_source-need.ts
@@ -0,0 +1,21 @@
+import { splitSqlStatements } from '../req-001/_policy-scan.ts';
+import { migrationFiles, type SourceFile } from '../req-002/_source-scan.ts';
+
+export function scanNeedDefinerAcknowledgment(files: readonly SourceFile[]): string[] {
+  let last: SourceFile | null = null;
+  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
+    for (const statement of splitSqlStatements(file.text)) {
+      if (/^create\s+(?:or\s+replace\s+)?function\s+public\.project_need\s*\(/i.test(statement)) {
+        last = { path: file.path, text: statement };
+      }
+    }
+  }
+  if (last === null) throw new Error('no public.project_need definition was found; refusing to report agreement');
+  const body = last.text.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '').replace(/'(?:[^']|'')*'/g, "''");
+  return /public\.has_platform_acknowledgment\s*\(/i.test(body)
+    ? [] : [`${last.path}: public.project_need does not call public.has_platform_acknowledgment`];
+}
+
+export function needDefinerCallsAcknowledgmentHook(): string[] {
+  return scanNeedDefinerAcknowledgment(migrationFiles('needDefinerCallsAcknowledgmentHook'));
+}
diff --git a/tests/at/suites/req-003/a-capture.test.ts b/tests/at/suites/req-003/a-capture.test.ts
new file mode 100644
index 0000000..666f763
--- /dev/null
+++ b/tests/at/suites/req-003/a-capture.test.ts
@@ -0,0 +1,62 @@
+import { describe, expect } from 'vitest';
+import { NEED_URGENCIES } from '../../../../supabase/functions/_shared/need-intake.ts';
+import { atTest } from './_bind.ts';
+import { needDefinerCallsAcknowledgmentHook } from './_source-need.ts';
+
+describe('need intake capture', () => {
+  atTest('AT-003.01', 'an NGO admin can start an unvetted need and the title and free-text description persist on a private draft', async ({ open }) => {
+    expect(needDefinerCallsAcknowledgmentHook()).toEqual([]);
+    const { w, sut } = await open();
+    for (const emailVerified of [false, true]) {
+      const ngo = await sut.provisionNgo(w.email(`ngo-capture-${emailVerified}`), { emailVerified });
+      const request = {
+        organizationId: ngo.organizationId, title: 'Grant deadline tracker',
+        description: 'We miss reporting deadlines.\nStaff need a shared view of each funder’s dates.',
+      };
+      const started = await sut.startNeed(ngo.session, request);
+      expect(started).toMatchObject({ ok: true, changed: true, need: { ...request, stage: 'draft', urgency: null } });
+      if (!started.ok) return;
+      expect(await sut.needRow(started.need.projectId)).toMatchObject({ ...request, stage: 'draft' });
+      const reopened = await sut.readNeed(ngo.session, started.need.projectId);
+      expect(reopened.ok).toBe(true);
+      if (!reopened.ok) return;
+      expect(reopened.value.need).toEqual(started.need);
+      const page = await sut.publicProjectPage(started.need.projectId);
+      expect(page.ok, 'a draft appeared on the public page').toBe(false);
+      expect(page.answer.status).toBe(404);
+      expect(page.answer.body).not.toContain(request.title);
+      expect(page.answer.body).not.toContain(request.description);
+    }
+  });
+
+  atTest('AT-003.02', 'every supported urgency persists and renders on the draft read', async ({ open }) => {
+    const { w, sut } = await open();
+    const ngo = await sut.provisionNgo(w.email('ngo-urgency'), { emailVerified: false });
+    for (const urgency of NEED_URGENCIES) {
+      const started = await sut.startNeed(ngo.session, { organizationId: ngo.organizationId, title: 'Volunteer rota', urgency });
+      expect(started).toMatchObject({ ok: true, need: { urgency, stage: 'draft', description: null } });
+      if (!started.ok) return;
+      expect((await sut.needRow(started.need.projectId))?.urgency).toBe(urgency);
+      const read = await sut.readNeed(ngo.session, started.need.projectId);
+      expect(read.ok).toBe(true);
+      if (!read.ok) return;
+      expect(read.value.need.urgency).toBe(urgency);
+    }
+  });
+
+  atTest('AT-003.04', 'the organisation member, volunteer and visitor cannot start a need; the database rechecks the admin role', async ({ open }) => {
+    const { w, sut } = await open();
+    const ngo = await sut.provisionNgo(w.email('ngo-admin-role'), { emailVerified: true });
+    const volunteer = await sut.provisionVolunteer(w.email('vol-admin-role'));
+    const request = { organizationId: ngo.organizationId, title: 'Meal planning', description: 'Coordinate the kitchen.' };
+    expect(await sut.startNeed(ngo.session, request)).toMatchObject({ ok: true, changed: true });
+    await sut.setMembershipRoleAsOperator(ngo.organizationId, ngo.accountId, 'member');
+    expect(await sut.startNeed(ngo.session, request)).toMatchObject({ ok: false, kind: 'not-an-admin', status: 403 });
+    expect(await sut.attemptNeedDefinerAsOperator({ accountId: ngo.accountId, request: { ...request, action: 'start' } }))
+      .toMatchObject({ ok: false, kind: 'not-an-admin' });
+    expect(await sut.startNeed(volunteer, request)).toMatchObject({ ok: false, kind: 'not-an-ngo-account', status: 403 });
+    expect(await sut.attemptNeedDefinerAsOperator({ accountId: volunteer.accountId, request: { ...request, action: 'start' } }))
+      .toMatchObject({ ok: false, kind: 'not-a-member' });
+    expect(await sut.startNeed(null, request)).toMatchObject({ ok: false, kind: 'unauthenticated', status: 401 });
+  });
+});
diff --git a/tests/at/suites/req-003/b-gate-and-autosave.test.ts b/tests/at/suites/req-003/b-gate-and-autosave.test.ts
new file mode 100644
index 0000000..5362224
--- /dev/null
+++ b/tests/at/suites/req-003/b-gate-and-autosave.test.ts
@@ -0,0 +1,63 @@
+import { describe, expect } from 'vitest';
+import { atTest } from './_bind.ts';
+
+describe('need submission gate and autosave', () => {
+  atTest('AT-003.03', 'submission is blocked on the missing description alone', async ({ open }) => {
+    const { w, sut } = await open();
+    const ngo = await sut.provisionNgo(w.email('ngo-description-gate'), { emailVerified: true });
+    const allowance = await sut.readAllowance(ngo.session, ngo.organizationId);
+    expect(allowance.ok && allowance.allowance.remaining > 0).toBe(true);
+    const started = await sut.startNeed(ngo.session, {
+      organizationId: ngo.organizationId, title: 'Grant deadline tracker', urgency: 'soon',
+    });
+    expect(started).toMatchObject({ ok: true, need: { description: null, stage: 'draft' } });
+    if (!started.ok) return;
+    const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
+    expect(await sut.submitNeed(ngo.session, request))
+      .toMatchObject({ ok: false, kind: 'missing-description', status: 409 });
+    expect((await sut.needRow(request.projectId))?.stage).toBe('draft');
+    expect(await sut.saveNeed(ngo.session, { ...request, patch: { description: ' \t\r\n\f\u00a0 ' } }))
+      .toMatchObject({ ok: true, need: { description: null } });
+    expect(await sut.submitNeed(ngo.session, request))
+      .toMatchObject({ ok: false, kind: 'missing-description', status: 409 });
+    expect((await sut.needRow(request.projectId))?.stage).toBe('draft');
+    expect(await sut.attemptNeedDefinerAsOperator({ accountId: ngo.accountId, request: { ...request, action: 'submit' } }))
+      .toMatchObject({ ok: false, kind: 'missing-description' });
+  });
+
+  atTest('AT-003.05', 'typed intake persists when the admin leaves and returns without an explicit save', { surface: 'ui' }, async ({ open }) => {
+    const { w, sut } = await open();
+    const ngo = await sut.provisionNgo(w.email('ngo-autosave'), { emailVerified: true });
+    const started = await sut.startNeed(ngo.session, {
+      organizationId: ngo.organizationId, title: 'Volunteer rota', urgency: 'this_quarter',
+      description: '  Initial notes\n  still being typed.  ',
+    });
+    expect(started).toMatchObject({ ok: true, need: { description: '  Initial notes\n  still being typed.  ' } });
+    if (!started.ok) return;
+    const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
+    const description = '  We need  a shared rota.\n\n  Keep each team\'s notes.\t ';
+    const saved = await sut.saveNeed(ngo.session, { ...request, patch: { description } });
+    expect(saved).toMatchObject({ ok: true, changed: true, need: { description } });
+    if (!saved.ok) return;
+    expect(await sut.saveNeed(ngo.session, { ...request, patch: { description } }))
+      .toMatchObject({ ok: true, changed: false, need: { updatedAt: saved.need.updatedAt } });
+    expect(await sut.saveNeed(ngo.session, { ...request, patch: { urgency: null } }))
+      .toMatchObject({ ok: true, changed: true, need: { urgency: null } });
+    const second = await sut.signInAgain(ngo.email);
+    expect(second.accountId).toBe(ngo.accountId);
+    expect(second.sessionId).not.toBe(ngo.session.sessionId);
+    const reopened = await sut.readNeed(second, request.projectId);
+    expect(reopened.ok).toBe(true);
+    if (!reopened.ok) return;
+    expect(reopened.value.need).toMatchObject({ description, urgency: null, stage: 'draft' });
+    const other = await sut.provisionNgo(w.email('ngo-other-autosave'), { emailVerified: true });
+    const foreignRequest = { ...request, organizationId: other.organizationId, patch: { description: 'Foreign edit' } };
+    expect(await sut.saveNeed(other.session, foreignRequest))
+      .toMatchObject({ ok: false, kind: 'no-such-need', status: 409 });
+    expect(await sut.attemptNeedDefinerAsOperator({ accountId: other.accountId, request: { ...foreignRequest, action: 'save' } }))
+      .toMatchObject({ ok: false, kind: 'no-such-need' });
+    const unknownPatch = { description, unexpected: true };
+    expect(await sut.saveNeed(ngo.session, { ...request, patch: unknownPatch }))
+      .toMatchObject({ ok: false, kind: 'invalid-request', status: 400 });
+  });
+});
diff --git a/tests/at/suites/req-003/c-labels.test.ts b/tests/at/suites/req-003/c-labels.test.ts
new file mode 100644
index 0000000..cfb0aba
--- /dev/null
+++ b/tests/at/suites/req-003/c-labels.test.ts
@@ -0,0 +1,34 @@
+import { describe, expect } from 'vitest';
+import { atTest } from './_bind.ts';
+
+describe('need draft cause labels', () => {
+  atTest('AT-003.17', 'a draft carries zero cause labels before Discovery', async ({ open }) => {
+    const { w, sut } = await open();
+    const ngo = await sut.provisionNgo(w.email('ngo-draft-labels'), { emailVerified: true });
+    const started = await sut.startNeed(ngo.session, {
+      organizationId: ngo.organizationId, title: 'Volunteer rota',
+      description: 'Coordinate volunteers across our weekly shifts.',
+    });
+    expect(started).toMatchObject({ ok: true, need: { stage: 'draft' } });
+    if (!started.ok) return;
+    expect(started.need.causeLabels).toEqual([]);
+    const read = await sut.readNeed(ngo.session, started.need.projectId);
+    expect(read.ok).toBe(true);
+    if (!read.ok) return;
+    expect(read.value.need.causeLabels).toEqual([]);
+    expect((await sut.needRow(started.need.projectId))?.causeLabels).toEqual([]);
+
+    const saved = await sut.saveNeed(ngo.session, {
+      organizationId: ngo.organizationId, projectId: started.need.projectId,
+      patch: { description: 'Coordinate volunteers across our weekly shifts and weekend events.' },
+    });
+    expect(saved).toMatchObject({ ok: true, changed: true, need: { stage: 'draft' } });
+    if (!saved.ok) return;
+    expect(saved.need.causeLabels).toEqual([]);
+    const reopened = await sut.readNeed(ngo.session, started.need.projectId);
+    expect(reopened.ok).toBe(true);
+    if (!reopened.ok) return;
+    expect(reopened.value.need.causeLabels).toEqual([]);
+    expect((await sut.needRow(started.need.projectId))?.causeLabels).toEqual([]);
+  });
+});
diff --git a/tests/at/suites/req-003/d-reference-files.test.ts b/tests/at/suites/req-003/d-reference-files.test.ts
new file mode 100644
index 0000000..3111b55
--- /dev/null
+++ b/tests/at/suites/req-003/d-reference-files.test.ts
@@ -0,0 +1,110 @@
+import { describe, expect } from 'vitest';
+import { REFERENCE_FILE_DISCLOSURE } from '../../../../supabase/functions/_shared/need-intake-copy.ts';
+import type { ReferenceFileInput } from './_contract.ts';
+import { atTest } from './_bind.ts';
+import { AWAITED, awaiting } from './_pending.ts';
+
+describe('need reference files', () => {
+  atTest('AT-003.07', 'an optional reference upload attaches to the draft', { surface: 'ui' }, {
+    default: async ({ open }) => {
+      const { w, sut } = await open();
+      const ngo = await sut.provisionNgo(w.email('ngo-reference-file'), { emailVerified: true });
+      const started = await sut.startNeed(ngo.session, { organizationId: ngo.organizationId, title: 'Grant deadline tracker' });
+      expect(started.ok).toBe(true);
+      if (!started.ok) return;
+      const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
+      const file = { fileName: 'grants-tracker.csv', mediaType: 'text/csv', byteSize: 4096, description: 'Sample rows' };
+      const attached = await sut.attachReferenceFile(ngo.session, { ...request, file });
+      expect(attached).toMatchObject({ ok: true, changed: true });
+      if (!attached.ok) return;
+      expect(attached.need.referenceFiles).toHaveLength(1);
+      expect(attached.need.referenceFiles[0]).toMatchObject({ ...file, addedByAccountId: ngo.accountId });
+      const secondFile = { fileName: 'blank-form.txt', mediaType: 'text/plain', byteSize: 256 };
+      const second = await sut.attachReferenceFile(ngo.session, { ...request, file: secondFile });
+      expect(second).toMatchObject({ ok: true, changed: true });
+      if (!second.ok) return;
+      expect(second.need.referenceFiles).toHaveLength(2);
+      expect(second.need.referenceFiles[0]).toEqual(attached.need.referenceFiles[0]);
+      expect(second.need.referenceFiles[1]).toMatchObject({ ...secondFile, description: null, addedByAccountId: ngo.accountId });
+      const read = await sut.readNeed(ngo.session, request.projectId);
+      expect(read.ok).toBe(true);
+      if (!read.ok) return;
+      expect(read.value.need.referenceFiles).toEqual(second.need.referenceFiles);
+      expect((await sut.needRow(request.projectId))?.referenceFiles).toEqual(second.need.referenceFiles);
+      expect(await sut.attachReferenceFile(ngo.session, { ...request, file: { ...file, byteSize: 0 } }))
+        .toMatchObject({ ok: false, kind: 'invalid-request', status: 400 });
+      const missingName = { mediaType: 'text/csv', byteSize: 4096 } as ReferenceFileInput;
+      expect(await sut.attachReferenceFile(ngo.session, { ...request, file: missingName }))
+        .toMatchObject({ ok: false, kind: 'invalid-request', status: 400 });
+    },
+    integration: awaiting(AWAITED.referenceUpload),
+  });
+
+  atTest('AT-003.09', 'the upload surface shows the base data-responsibility disclosure', { surface: 'ui' }, {
+    default: async ({ open }) => {
+      const { w, sut } = await open();
+      const ngo = await sut.provisionNgo(w.email('ngo-base-disclosure'), { emailVerified: true });
+      const started = await sut.startNeed(ngo.session, { organizationId: ngo.organizationId, title: 'Grant deadline tracker' });
+      expect(started.ok).toBe(true);
+      if (!started.ok) return;
+      const disclosure = {
+        level: 'base', acknowledgmentRequired: false, heading: REFERENCE_FILE_DISCLOSURE.base.heading,
+        body: REFERENCE_FILE_DISCLOSURE.base.body, acknowledgment: null,
+      };
+      expect(started.need.upload.disclosure).toEqual(disclosure);
+      const read = await sut.readNeed(ngo.session, started.need.projectId);
+      expect(read.ok).toBe(true);
+      if (!read.ok) return;
+      expect(read.value.need.upload.disclosure).toEqual(disclosure);
+      const attached = await sut.attachReferenceFile(ngo.session, {
+        organizationId: ngo.organizationId, projectId: started.need.projectId,
+        file: { fileName: 'grants-tracker.csv', mediaType: 'text/csv', byteSize: 4096, description: 'Sample rows' },
+      });
+      expect(attached).toMatchObject({ ok: true, changed: true });
+      if (!attached.ok) return;
+      expect(attached.need.upload.disclosure).toEqual(disclosure);
+    },
+    integration: awaiting(AWAITED.uploadSurface),
+  });
+
+  atTest('AT-003.10', 'classification hardens the disclosure before another upload', { surface: 'ui' }, {
+    default: async ({ open }) => {
+      const { w, sut } = await open();
+      const ngo = await sut.provisionNgo(w.email('ngo-tier2-disclosure'), { emailVerified: true });
+      const started = await sut.startNeed(ngo.session, { organizationId: ngo.organizationId, title: 'Grant deadline tracker' });
+      expect(started.ok).toBe(true);
+      if (!started.ok) return;
+      const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
+      const attached = await sut.attachReferenceFile(ngo.session, {
+        ...request, file: { fileName: 'grants-tracker.csv', mediaType: 'text/csv', byteSize: 4096 },
+      });
+      expect(attached).toMatchObject({ ok: true, changed: true });
+      if (!attached.ok) return;
+      expect(attached.need.referenceFiles).toHaveLength(1);
+      expect(attached.need.upload.disclosure.level).toBe('base');
+      await sut.classifyTier2AsOperator(request.projectId);
+      const read = await sut.readNeed(ngo.session, request.projectId);
+      expect(read.ok).toBe(true);
+      if (!read.ok) return;
+      const disclosure = {
+        level: 'tier2-hardened', acknowledgmentRequired: true,
+        heading: REFERENCE_FILE_DISCLOSURE.tier2Hardened.heading,
+        body: REFERENCE_FILE_DISCLOSURE.tier2Hardened.body,
+        acknowledgment: REFERENCE_FILE_DISCLOSURE.tier2Hardened.acknowledgment,
+      };
+      expect(read.value.need.upload.disclosure).toEqual(disclosure);
+      expect(read.value.need.tier2ClassifiedAt).not.toBeNull();
+      const second = await sut.attachReferenceFile(ngo.session, {
+        ...request, file: { fileName: 'blank-form.txt', mediaType: 'text/plain', byteSize: 256 },
+      });
+      expect(second).toMatchObject({ ok: true, changed: true });
+      if (!second.ok) return;
+      expect(second.need.upload.disclosure).toEqual(disclosure);
+      expect(second.need.referenceFiles).toHaveLength(2);
+      expect(second.need.referenceFiles[0]).toEqual(attached.need.referenceFiles[0]);
+      expect(second.need.tier2ClassifiedAt).toEqual(read.value.need.tier2ClassifiedAt);
+      expect(await sut.needRow(request.projectId)).toEqual(second.need);
+    },
+    integration: awaiting(AWAITED.uploadSurface),
+  });
+});
diff --git a/tests/at/suites/req-003/e-submission.test.ts b/tests/at/suites/req-003/e-submission.test.ts
new file mode 100644
index 0000000..fa46ec5
--- /dev/null
+++ b/tests/at/suites/req-003/e-submission.test.ts
@@ -0,0 +1,68 @@
+import { describe, expect } from 'vitest';
+import { atTest } from './_bind.ts';
+
+describe('need submission starts Discovery', () => {
+  atTest('AT-003.11', 'a complete intake starts Discovery without a reference file', async ({ open }) => {
+    const { w, sut } = await open();
+    const ngo = await sut.provisionNgo(w.email('ngo-submit-without-file'), { emailVerified: true });
+    const allowance = await sut.readAllowance(ngo.session, ngo.organizationId);
+    expect(allowance.ok && allowance.allowance.remaining > 0).toBe(true);
+    const started = await sut.startNeed(ngo.session, {
+      organizationId: ngo.organizationId, title: 'Grant deadline tracker',
+      description: 'We need a shared record of reporting deadlines.', urgency: 'soon',
+    });
+    expect(started).toMatchObject({ ok: true, need: { stage: 'draft' } });
+    if (!started.ok) return;
+    const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
+    const submitted = await sut.submitNeed(ngo.session, request);
+    expect(submitted).toMatchObject({
+      ok: true, changed: true, need: { stage: 'discovery_in_progress', referenceFiles: [] },
+    });
+    if (!submitted.ok) return;
+    expect(submitted.need.submittedAt).not.toBeNull();
+    const read = await sut.readNeed(ngo.session, request.projectId);
+    expect(read.ok).toBe(true);
+    if (!read.ok) return;
+    expect(read.value.need.stage).toBe('discovery_in_progress');
+    expect((await sut.needRow(request.projectId))?.stage).toBe(read.value.need.stage);
+    expect(await sut.publicProjectPage(request.projectId)).toMatchObject({ ok: false, answer: { status: 404 } });
+  });
+
+  atTest('AT-003.12', 'submission moves the draft to discovery_in_progress', async ({ open }) => {
+    const { w, sut } = await open();
+    const ngo = await sut.provisionNgo(w.email('ngo-submit-with-file'), { emailVerified: true });
+    const allowance = await sut.readAllowance(ngo.session, ngo.organizationId);
+    expect(allowance.ok && allowance.allowance.remaining > 0).toBe(true);
+    const started = await sut.startNeed(ngo.session, {
+      organizationId: ngo.organizationId, title: 'Volunteer rota',
+      description: 'We need a shared rota for our teams.', urgency: 'this_quarter',
+    });
+    expect(started).toMatchObject({ ok: true, need: { stage: 'draft' } });
+    if (!started.ok) return;
+    const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
+    const attached = await sut.attachReferenceFile(ngo.session, {
+      ...request, file: { fileName: 'sample-rota.csv', mediaType: 'text/csv', byteSize: 4096 },
+    });
+    expect(attached.ok).toBe(true);
+    if (!attached.ok) return;
+    expect(attached.need.referenceFiles).toHaveLength(1);
+    const submitted = await sut.submitNeed(ngo.session, request);
+    expect(submitted).toMatchObject({ ok: true, changed: true, need: { stage: 'discovery_in_progress' } });
+    if (!submitted.ok) return;
+    expect(submitted.need.referenceFiles).toEqual(attached.need.referenceFiles);
+    expect(submitted.need.submittedAt).not.toBeNull();
+    expect(await sut.needRow(request.projectId)).toMatchObject({
+      stage: 'discovery_in_progress', submittedAt: submitted.need.submittedAt,
+    });
+    expect(await sut.submitNeed(ngo.session, request)).toMatchObject({
+      ok: true, changed: false,
+      need: { stage: 'discovery_in_progress', submittedAt: submitted.need.submittedAt },
+    });
+    expect(await sut.saveNeed(ngo.session, {
+      ...request, patch: { description: 'The shared rota also needs team contact details.' },
+    })).toMatchObject({ ok: true, changed: true, need: { stage: 'discovery_in_progress' } });
+    expect(await sut.attemptNeedDefinerAsOperator({
+      accountId: ngo.accountId, request: { ...request, action: 'submit' },
+    })).toMatchObject({ ok: true });
+  });
+});
diff --git a/tests/at/suites/req-003/f-snapshot.test.ts b/tests/at/suites/req-003/f-snapshot.test.ts
new file mode 100644
index 0000000..99a9875
--- /dev/null
+++ b/tests/at/suites/req-003/f-snapshot.test.ts
@@ -0,0 +1,82 @@
+import { describe, expect } from 'vitest';
+import { intakeSnapshotOf } from '../../../../supabase/functions/_shared/need-intake.ts';
+import { atTest } from './_bind.ts';
+
+describe('raw intake audit snapshots', () => {
+  atTest('AT-003.14', 'submission retains an audit snapshot equal to the raw intake', async ({ open }) => {
+    const { w, sut } = await open();
+    const ngo = await sut.provisionNgo(w.email('ngo-snapshot'), { emailVerified: true });
+    const started = await sut.startNeed(ngo.session, {
+      organizationId: ngo.organizationId, title: 'Volunteer rota',
+      description: 'We need a shared rota for our teams.', urgency: 'this_quarter',
+    });
+    expect(started.ok).toBe(true);
+    if (!started.ok) return;
+    const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
+    expect(await sut.attachReferenceFile(ngo.session, {
+      ...request, file: { fileName: 'sample-rota.csv', mediaType: 'text/csv', byteSize: 4096, description: 'Sample rows' },
+    })).toMatchObject({ ok: true, changed: true });
+    expect(await sut.intakeSnapshots(request.projectId)).toEqual([]);
+    const submitted = await sut.submitNeed(ngo.session, request);
+    expect(submitted).toMatchObject({ ok: true, changed: true });
+    if (!submitted.ok) return;
+    expect(submitted.need.submittedAt).not.toBeNull();
+    if (submitted.need.submittedAt === null) return;
+    const snapshots = await sut.intakeSnapshots(request.projectId);
+    expect(snapshots).toHaveLength(1);
+    const snapshot = snapshots[0];
+    expect(snapshot.detail).toEqual(intakeSnapshotOf({ ...submitted.need, submittedAt: submitted.need.submittedAt }));
+    expect(snapshot.detail.submitted_at).toBe(submitted.need.submittedAt);
+    expect(new Date(snapshot.occurredAt).getTime()).toBe(new Date(submitted.need.submittedAt).getTime());
+    expect(snapshot.actorAccountId).toBe(ngo.accountId);
+    expect(snapshot.subjectOrgId).toBe(ngo.organizationId);
+    expect(snapshot.reason.trim()).not.toBe('');
+  });
+
+  atTest('AT-003.16', 'later working edits leave the retained snapshot unchanged', async ({ open }) => {
+    const { w, sut } = await open();
+    const ngo = await sut.provisionNgo(w.email('ngo-snapshot-edits'), { emailVerified: true });
+    const started = await sut.startNeed(ngo.session, {
+      organizationId: ngo.organizationId, title: 'Volunteer rota',
+      description: 'We need a shared rota for our teams.', urgency: 'this_quarter',
+    });
+    expect(started.ok).toBe(true);
+    if (!started.ok) return;
+    const request = { organizationId: ngo.organizationId, projectId: started.need.projectId };
+    expect(await sut.attachReferenceFile(ngo.session, {
+      ...request, file: { fileName: 'sample-rota.csv', mediaType: 'text/csv', byteSize: 4096 },
+    })).toMatchObject({ ok: true, changed: true });
+    expect(await sut.submitNeed(ngo.session, request)).toMatchObject({ ok: true, changed: true });
+    const snapshots = await sut.intakeSnapshots(request.projectId);
+    expect(snapshots).toHaveLength(1);
+    expect(await sut.saveNeed(ngo.session, {
+      ...request, patch: { description: 'The rota also needs team contact details.', urgency: 'soon' },
+    })).toMatchObject({ ok: true, changed: true });
+    expect(await sut.attachReferenceFile(ngo.session, {
+      ...request, file: { fileName: 'team-contacts.csv', mediaType: 'text/csv', byteSize: 2048 },
+    })).toMatchObject({ ok: true, changed: true });
+    const repeated = await sut.submitNeed(ngo.session, request);
+    expect(repeated).toMatchObject({ ok: true, changed: false });
+    expect(await sut.intakeSnapshots(request.projectId)).toEqual(snapshots);
+    if (!repeated.ok) return;
+    expect(repeated.need.description).not.toBe(snapshots[0].detail.description);
+    expect(repeated.need.urgency).not.toBe(snapshots[0].detail.urgency);
+    expect(snapshots[0].detail.reference_files).toHaveLength(1);
+    expect(repeated.need.referenceFiles).toHaveLength(2);
+    const second = await sut.startNeed(ngo.session, {
+      organizationId: ngo.organizationId, title: 'Grant tracker',
+      description: 'We need a shared record of reporting deadlines.', urgency: 'no_deadline',
+    });
+    expect(second.ok).toBe(true);
+    if (!second.ok) return;
+    const secondSubmitted = await sut.submitNeed(ngo.session, {
+      organizationId: ngo.organizationId, projectId: second.need.projectId,
+    });
+    expect(secondSubmitted).toMatchObject({ ok: true, changed: true });
+    const secondSnapshots = await sut.intakeSnapshots(second.need.projectId);
+    expect(secondSnapshots).toHaveLength(1);
+    expect(secondSnapshots[0].detail.project_id).toBe(second.need.projectId);
+    expect(secondSnapshots[0].id).not.toBe(snapshots[0].id);
+    expect(await sut.intakeSnapshots(request.projectId)).toEqual(snapshots);
+  });
+});

```

## Review Rubric

# Review Rubric

Review through whichever lenses are relevant. Not every lens applies to every change. Use judgment.

## Correctness

Does the code actually do what the intent says it should?

- Edge cases: empty inputs, nil/undefined, boundary values, concurrent access
- Error handling: are errors caught, propagated, or silently swallowed?
- Off-by-one, type coercion, integer overflow, string encoding
- State management: race conditions, stale closures, dangling references
- Does the happy path work? Does the sad path work?
- Idempotency: what happens if this operation runs twice, or if a previous run crashed halfway? If the answer is "it depends on what state was left behind," there's a missing reconciliation step.
- Concurrency: if multiple actors can touch the same mutable state (files, branches, shared data), is access serialized structurally (locks, sequential phases, exclusive ownership), or by conventions that won't hold?

When you find a potential bug, trace the execution path. Don't just flag "this could be nil". Show the call chain that makes it nil.

## Root Causes vs. Symptoms

Is the code fixing the actual problem or papering over a symptom?

Answering this often requires looking beyond the changed files. Read the surrounding code (callers, callees, type definitions, sibling modules) and understand the architecture the change lives in. Use the tools available to you (Read, Grep, Glob) to explore. Follow the call chain. Read the types. Understand why the code exists before judging whether the change addresses the right layer.

- Guard clauses that mask a deeper invariant violation
- Retry logic that hides a broken contract
- Type casts that silence a modeling error
- If you see a workaround, ask: why is the workaround needed? What would a proper fix look like?
- A fix in module A that should really be a fix in module B's contract
- Instructions where structure would be better: if the fix is a comment saying "don't do X" or a convention someone has to remember, ask whether it could instead be a type constraint, a lint rule, or a runtime check that makes the wrong thing impossible

## Structural Integrity

Does the code fit well into the system it's part of?

- Boundary discipline: is validation at system boundaries, or scattered through business logic? Validate data once where it enters the system, then trust it internally.
- Abstraction level: is the code mixing high-level orchestration with low-level detail?
- Coupling: does this change introduce dependencies that will make future changes harder?
- Data model fit: do the data structures match the actual access patterns? The right structure makes downstream code obvious. The wrong one fights you at every turn.
- Bolted-on vs. integrated: was the change patched onto the existing design, or does it read as if the design always accounted for it? If the new requirement had been known from the start, would the code look like this?
- Legacy dual-paths: does the change introduce a new API while keeping the old one alive? If there are no external consumers, migrate callers and delete the old path in the same wave. Don't leave compatibility layers that will become permanent.

Don't penalize simple code for lacking abstraction. Premature abstraction is worse than duplication.

## Verification

Can you tell that this code works from reading it?

- Are there tests? Do they test behavior or implementation details?
- Are there assertions/invariants that would catch regressions?
- If this is a bug fix: is there a test for the bug?
- If this touches an integration boundary: is the full path tested?
- Check the real thing, not a proxy. If the code checks liveness via file mtime or cached state instead of reading the actual value, that's a verification gap.
- For delegated or async work: does the code verify actual output artifacts, or does it trust self-reports and summaries?

## Complexity Budget

Is the complexity justified by what the code accomplishes?

- Code that could be simpler without losing correctness or clarity
- Abstractions that serve only one call site
- Configuration or parameterization for cases that don't exist yet
- Dead code, unused imports, vestigial parameters
- Over-engineering: "just in case" code paths with no current callers
- Obsolete compatibility paths kept alive for transitional stability that's no longer needed. If the migration is done, delete the scaffolding
- Does the user experience justify the complexity? Every feature, control, and option should earn its place. Half-finished features are worse than missing ones.

Simpler is better unless simpler is wrong. Three lines of duplication beat a premature abstraction.

## Security

Only flag security issues you can actually trace through the code. "This could be an injection vector" without showing the input path is not useful.

- User input flowing to dangerous sinks (SQL, shell, eval, innerHTML) without sanitization
- Authentication/authorization gaps in new endpoints
- Secrets in code, logs, or error messages
- TOCTOU (time-of-check-time-of-use) in security-critical paths


## Code Quality Lens

# Code Quality Review

Each reviewer applies this code-quality lens in addition to the rubric. It is a strict standard focused on implementation quality, maintainability, abstraction quality, and codebase health.

Above all, be ambitious about code structure. Do not merely identify local cleanup. Actively search for "code judo" moves, restructurings that preserve behavior while making the implementation dramatically simpler, smaller, more direct, and more elegant.

## Core Prompt

Start from this baseline:

> Perform a deep code quality audit of the current branch's changes.
> Rethink how to structure / implement the changes to meaningfully improve code quality without impacting behavior.
> Work to improve abstractions, modularity, reduce Spaghetti code, improve succinctness and legibility.
> Be ambitious, if there is a clear path to improving the implementation that involves restructuring some of the codebase, go for it.
> Be extremely thorough and rigorous. Measure twice, cut once.

## Dimensions

Each dimension is stated once. Apply the ones that are relevant.

0. **Be ambitious about structural simplification.** Do not stop at "this could be a bit cleaner." Look for reframings that make whole branches, helpers, modes, conditionals, or layers disappear. Assume a "code judo" move is often available. It uses the existing architecture more effectively and makes the change dramatically simpler. If you can delete complexity rather than rearrange it, push hard for that.

1. **Do not let a PR push a file from under 1k lines to over 1k lines without a very strong reason.** Treat this as a strong smell. Prefer extracting helpers, subcomponents, or modules. If the diff crosses that threshold, ask whether the code should be decomposed first. Waive only for a compelling structural reason where the resulting file stays clearly organized.

2. **Do not allow spaghetti growth in existing code.** Be suspicious of new ad-hoc conditionals, scattered special cases, or one-off branches inserted into unrelated flows. Treat "weird if statements in random places" as a design problem, not a style nit. Prefer pushing the logic into a dedicated helper, state machine, or module instead of tangling an existing path.

3. **Bias toward cleaning the design, not just accepting working code.** If behavior can stay the same while the structure becomes meaningfully cleaner, push for the cleaner version. Prefer simplifications that remove moving pieces over refactors that spread the same complexity around.

4. **Prefer direct, boring, maintainable code over hacky or magical code.** Treat brittle, ad-hoc, or "magic" behavior as a problem. Be skeptical of generic mechanisms that hide simple data-shape assumptions. Flag thin abstractions, identity wrappers, or pass-through helpers that add indirection without buying clarity.

5. **Push on type and boundary cleanliness when it affects maintainability.** Question unnecessary optionality, `unknown`, `any`, or cast-heavy code when a clearer type boundary could exist. Prefer explicit typed models over loosely-shaped ad-hoc objects. If a branch leans on a silent fallback to paper over an unclear invariant, ask whether the boundary should be made explicit.

6. **Keep logic in the canonical layer and reuse existing helpers.** Call out feature logic leaking into shared paths or implementation details leaking through APIs. Prefer existing canonical utilities over bespoke one-offs. Push code toward the right package, service, or module instead of normalizing drift.

7. **Treat unnecessary sequential orchestration and non-atomic updates as design smells when the cleaner structure is obvious.** If independent work is serialized for no reason, ask whether it should run in parallel. If related updates can leave state half-applied, push for a more atomic structure. Do not over-index on micro-optimizations, but do flag avoidable orchestration complexity that makes the code more brittle.

## Output Expectations

Prioritize structural code-quality regressions and missed simplifications first, then spaghetti and branching complexity, then boundary, type, and file-size concerns, then smaller modularity and legibility issues. Do not flood the review with low-value nits when larger structural issues exist. Prefer a few high-conviction comments over a long list of cosmetic notes.

## Approval Bar

Do not approve merely because behavior seems correct. Treat these as presumptive blockers unless the author can justify them: the PR keeps a lot of incidental complexity when a code-judo move would delete it. Pushes a file from below 1000 lines to above 1000 lines. Adds ad-hoc branching that tangles an existing flow. Scatters feature checks across shared code. Adds an unnecessary abstraction, wrapper, or cast-heavy contract, or duplicates an existing helper or puts logic in the wrong layer when there is a clear canonical home. If those conditions are not met, leave explicit, actionable feedback and push for a cleaner decomposition.

## Review Tone

Be direct, serious, and demanding about quality. Do not be rude, but do not soften major maintainability issues into mild suggestions. If the code is making the codebase messier, say so. If the implementation missed an obvious dramatic simplification, say that too. Do not be satisfied with "maybe rename this" when the real issue is structural.


## Instructions

Review the code through every lens in the rubric and the code-quality lens above that you find relevant. Do not force lenses that don't apply. A simple bug fix does not need paragraphs about architectural integrity.

For each finding, provide:

1. **Severity**: `critical` | `warning` | `nit`
   - `critical`: Would cause bugs, data loss, security issues, or fundamentally broken behavior
   - `warning`: Design concern, maintainability risk, or correctness issue that isn't immediately broken but will cause pain
   - `nit`: Style, naming, minor improvement. Only include nits if they're genuinely useful, not to pad your review.
2. **Finding**: What the problem is, in concrete terms. Reference specific lines/functions.
3. **Evidence**: Why you believe this is a problem. Show your reasoning. Don't just assert.
4. **Suggestion** (optional): What you'd do instead, if you have a concrete alternative. Skip this if you don't have a clear fix.

## What Makes a Good Finding

- It references specific code, not vague concerns ("this could be better")
- It explains WHY something is a problem, not just THAT it is
- It distinguishes between "this is broken" and "I would have done this differently"
- It considers the stated intent. A finding that ignores the context of what's being built is a bad finding

## What to Avoid

- Restating what the code does without identifying a problem
- Suggesting rewrites for working code because you'd prefer a different style
- Raising hypothetical issues ("what if someone passes null here") without evidence that the code path is reachable
- Praising the code. You're an adversary, not a cheerleader. If you find nothing wrong, say "no findings" and stop.

## Output

Return your findings as a structured list. If you have zero findings, say so. An empty review is a valid outcome.

```
## Findings

### 1. [Severity] Short title
**Location**: file:line or function name
**Finding**: What's wrong
**Evidence**: Why this matters
**Suggestion**: (optional) What to do instead

### 2. [Severity] Short title
...
```


Repository context: your working directory is the branch's worktree; read any file you need for evidence (the base tenant migrations under supabase/migrations/, the write frame in supabase/functions/_shared/write-routes.ts, the REQ-002 suite it composes). Do not modify anything. Write your findings as the reply.
