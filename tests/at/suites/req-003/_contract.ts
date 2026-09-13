import type {
  IntakeSnapshot, NeedIntakeView, NeedPatch, NeedUrgency, ReferenceFileInput,
} from '../../../../supabase/functions/_shared/need-intake.ts';
import type {
  AllowanceOutcome, NgoActor, PublicProjectOutcome, Session, TenantReadOutcome, World, WriteRefusal, WriteRefusalKind,
} from '../req-002/_contract.ts';

export type { IntakeSnapshot, NeedIntakeView, NeedPatch, NeedUrgency, ReferenceFileInput };
export type { AllowanceOutcome, NgoActor, PublicProjectOutcome, Session, TenantReadOutcome, World, WriteRefusal, WriteRefusalKind };

export type StartNeedRequest = { organizationId: string; title: string; description?: string | null; urgency?: NeedUrgency | null };
export type ProjectNeedRequest =
  | (StartNeedRequest & { action: 'start' })
  | { organizationId: string; action: 'save'; projectId: string; patch: NeedPatch }
  | { organizationId: string; action: 'attach'; projectId: string; file: ReferenceFileInput }
  | { organizationId: string; action: 'submit'; projectId: string };
export type NeedWriteOutcome = { ok: true; changed: boolean; need: NeedIntakeView } | WriteRefusal;
export type IntakeSnapshotRow = {
  id: string; occurredAt: string; actorAccountId: string | null; actorLabel: string;
  subjectOrgId: string; reason: string; detail: IntakeSnapshot;
};
export type NeedsSut = {
  provisionNgo(email: string, opts: { emailVerified: boolean }): Promise<NgoActor>;
  provisionVolunteer(email: string): Promise<Session>;
  signInAgain(email: string): Promise<Session>;
  setMembershipRoleAsOperator(organizationId: string, accountId: string, role: 'admin' | 'member'): Promise<void>;
  readAllowance(session: Session | null, organizationId: string): Promise<AllowanceOutcome>;
  startNeed(session: Session | null, request: StartNeedRequest): Promise<NeedWriteOutcome>;
  saveNeed(session: Session | null, request: Omit<Extract<ProjectNeedRequest, { action: 'save' }>, 'action'>): Promise<NeedWriteOutcome>;
  attachReferenceFile(session: Session | null, request: Omit<Extract<ProjectNeedRequest, { action: 'attach' }>, 'action'>): Promise<NeedWriteOutcome>;
  submitNeed(session: Session | null, request: Omit<Extract<ProjectNeedRequest, { action: 'submit' }>, 'action'>): Promise<NeedWriteOutcome>;
  readNeed(session: Session | null, projectId: string): Promise<TenantReadOutcome<{ ok: true; need: NeedIntakeView }>>;
  publicProjectPage(projectId: string): Promise<PublicProjectOutcome>;
  needRow(projectId: string): Promise<NeedIntakeView | null>;
  attemptNeedDefinerAsOperator(input: { accountId: string; request: ProjectNeedRequest }): Promise<{ ok: true } | { ok: false; kind: WriteRefusalKind; reason: string }>;
  classifyTier2AsOperator(projectId: string): Promise<void>;
  intakeSnapshots(projectId: string): Promise<IntakeSnapshotRow[]>;
};
