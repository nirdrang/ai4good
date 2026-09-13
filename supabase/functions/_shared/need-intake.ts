import { orgAdminActionAllowed } from './memberships.ts';
import { REFERENCE_FILE_DISCLOSURE } from './need-intake-copy.ts';
import { TENANT_NOT_FOUND, TENANT_READ_FAILED, type ReadResult, type TenantReads } from './tenant-reads.ts';
import { isRecord, refuseWrite, stringField, type AccountWriteRouteInput, type WriteRouteDecision } from './write-routes.ts';

export const NEED_STAGES = ['draft', 'discovery_in_progress'] as const;
export type NeedStage = (typeof NEED_STAGES)[number];
export const NEED_URGENCIES = ['soon', 'this_quarter', 'no_deadline'] as const;
export type NeedUrgency = (typeof NEED_URGENCIES)[number];
export type ReferenceFileMetadata = {
  id: string; fileName: string; mediaType: string; byteSize: number;
  description: string | null; addedByAccountId: string; addedAt: string;
};
export type Disclosure = {
  level: 'base' | 'tier2-hardened'; acknowledgmentRequired: boolean;
  heading: string; body: string; acknowledgment: string | null;
};
export type NeedIntakeView = {
  projectId: string; organizationId: string; title: string; description: string | null;
  urgency: NeedUrgency | null; stage: NeedStage; causeLabels: readonly string[];
  referenceFiles: readonly ReferenceFileMetadata[]; tier2ClassifiedAt: string | null;
  upload: { disclosure: Disclosure }; submittedAt: string | null; updatedAt: string;
};
export type NeedIntakeSqlRow = {
  project_id: string; org_id: string; title: string; description: string | null;
  urgency: string | null; stage: string; cause_labels: readonly string[];
  reference_files: unknown; tier2_classified_at: string | null;
  submitted_at: string | null; updated_at: string;
};
export type ProjectNeedAction = 'start' | 'save' | 'attach' | 'submit';
export type StartPayload = { title: string; description: string | null; urgency: NeedUrgency | null };
export type NeedPatch = { title?: string; description?: string | null; urgency?: NeedUrgency | null };
export type ReferenceFileInput = { fileName: string; mediaType: string; byteSize: number; description?: string | null };
export type ProjectNeedArgs = {
  readonly p_account_id: string; readonly p_organization_id: string;
  readonly p_action: ProjectNeedAction; readonly p_project_id: string | null;
  readonly p_payload: StartPayload | NeedPatch | ReferenceFileInput | Record<never, never>;
};

export function disclosureFor(tier2ClassifiedAt: string | null): Disclosure {
  if (tier2ClassifiedAt !== null) {
    return { level: 'tier2-hardened', acknowledgmentRequired: true, ...REFERENCE_FILE_DISCLOSURE.tier2Hardened };
  }
  return { level: 'base', acknowledgmentRequired: false, ...REFERENCE_FILE_DISCLOSURE.base, acknowledgment: null };
}

export function needViewFromSql(row: NeedIntakeSqlRow): NeedIntakeView {
  if (!(NEED_STAGES as readonly string[]).includes(row.stage)) throw new Error('unknown need stage');
  if (row.urgency !== null && !(NEED_URGENCIES as readonly string[]).includes(row.urgency)) {
    throw new Error('unknown need urgency');
  }
  if (!Array.isArray(row.reference_files)) throw new Error('need reference files are not a list');
  const referenceFiles = row.reference_files.map((file: unknown): ReferenceFileMetadata => {
    if (!isRecord(file) || typeof file.id !== 'string' || typeof file.file_name !== 'string' ||
        typeof file.media_type !== 'string' || typeof file.byte_size !== 'number' ||
        (file.description !== null && typeof file.description !== 'string') ||
        typeof file.added_by_account_id !== 'string' || typeof file.added_at !== 'string') {
      throw new Error('invalid need reference metadata');
    }
    return {
      id: file.id, fileName: file.file_name, mediaType: file.media_type, byteSize: file.byte_size,
      description: file.description, addedByAccountId: file.added_by_account_id, addedAt: file.added_at,
    };
  });
  return {
    projectId: row.project_id, organizationId: row.org_id, title: row.title, description: row.description,
    urgency: row.urgency as NeedUrgency | null, stage: row.stage as NeedStage,
    causeLabels: [...row.cause_labels], referenceFiles, tier2ClassifiedAt: row.tier2_classified_at,
    upload: { disclosure: disclosureFor(row.tier2_classified_at) },
    submittedAt: row.submitted_at, updatedAt: row.updated_at,
  };
}

export function decideProjectNeed(input: AccountWriteRouteInput): WriteRouteDecision<ProjectNeedArgs> {
  if (input.target === null) return refuseWrite('invalid-request', 400, 'a need write must name its organisation');
  const allowed = orgAdminActionAllowed(input.standing.orgRole);
  if (!allowed.ok) return refuseWrite(allowed.kind, 403, allowed.reason);
  const body = input.body;
  if (body.action !== 'start') return refuseWrite('invalid-request', 400, 'a need write requires the start action');
  if (Object.keys(body).some((key) => !['organizationId', 'action', 'title', 'description', 'urgency'].includes(key))) {
    return refuseWrite('invalid-request', 400, 'a need write contains an unknown intake field');
  }
  const title = stringField(body.title);
  if (title === null) return refuseWrite('invalid-name', 400, 'a need requires a non-empty title');
  if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    return refuseWrite('invalid-request', 400, 'a need description must be text');
  }
  const urgency = body.urgency ?? null;
  if (urgency !== null && (typeof urgency !== 'string' || !(NEED_URGENCIES as readonly string[]).includes(urgency))) {
    return refuseWrite('invalid-request', 400, 'a need requires a known urgency');
  }
  return { ok: true, args: {
    p_account_id: input.caller.id, p_organization_id: input.target, p_action: 'start', p_project_id: null,
    p_payload: { title, description: stringField(body.description), urgency: urgency as NeedUrgency | null },
  } };
}

export function renderProjectNeed(value: unknown): { changed: boolean; need: NeedIntakeView | null } {
  if (!isRecord(value)) return { changed: false, need: null };
  return { changed: value.changed === true, need: isRecord(value.need) ? needViewFromSql(value.need as NeedIntakeSqlRow) : null };
}

export function submitGate(_need: Pick<NeedIntakeView, 'description'>): { ok: true } | { ok: false; kind: 'missing-description'; reason: string } {
  throw new Error('not landed: unit 2');
}
export function submitTransition(_stage: NeedStage): { next: 'discovery_in_progress'; changed: boolean } {
  throw new Error('not landed: unit 6');
}
export function applyNeedPatch(_need: NeedIntakeView, _patch: NeedPatch): { need: NeedIntakeView; changed: boolean } {
  throw new Error('not landed: unit 2');
}
export type IntakeSnapshot = {
  project_id: string; org_id: string; title: string; description: string | null; urgency: NeedUrgency | null;
  reference_files: readonly {
    id: string; file_name: string; media_type: string; byte_size: number;
    description: string | null; added_by_account_id: string; added_at: string;
  }[];
  submitted_at: string;
};
export function intakeSnapshotOf(_need: NeedIntakeView & { submittedAt: string }): IntakeSnapshot {
  throw new Error('not landed: unit 7');
}
export function intakeSnapshotFromDetail(_detail: unknown): IntakeSnapshot | null {
  throw new Error('not landed: unit 7');
}

export type NeedReads = { need(projectId: string): Promise<ReadResult<Omit<NeedIntakeSqlRow, 'org_id' | 'title'>>> };
export type NeedIntakeAnswer = { status: 200; body: { ok: true; need: NeedIntakeView } } | typeof TENANT_NOT_FOUND | typeof TENANT_READ_FAILED;

export async function needIntakeAnswer(reads: Pick<TenantReads, 'project'> & NeedReads, projectId: string): Promise<NeedIntakeAnswer> {
  const project = await reads.project(projectId);
  if (!project.ok) return TENANT_READ_FAILED;
  const source = project.rows[0];
  if (source === undefined) return TENANT_NOT_FOUND;
  const intake = await reads.need(projectId);
  if (!intake.ok) return TENANT_READ_FAILED;
  const row = intake.rows[0];
  if (row === undefined) return TENANT_NOT_FOUND;
  try {
    return { status: 200, body: { ok: true, need: needViewFromSql({ ...row, org_id: source.org_id, title: source.name }) } };
  } catch {
    return TENANT_READ_FAILED;
  }
}
