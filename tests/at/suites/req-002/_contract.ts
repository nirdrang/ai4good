import type { WorldSeam } from '../../harness/contracts.ts';
import type { Decision } from '../../../../supabase/functions/_shared/accounts.ts';
import type { Allowance, SpendRow } from '../../../../supabase/functions/_shared/discovery-allowance.ts';
import type { DeliveryRow, NotificationEventRow } from '../../../../supabase/functions/_shared/notifications.ts';
import type { VettingOutcomeNotice } from '../../../../supabase/functions/_shared/org-vetting.ts';
import type { PublicProjectView } from '../../../../supabase/functions/_shared/public-project.ts';
import type { OrganizationDashboard } from '../../../../supabase/functions/_shared/tenant-reads.ts';
import type { WriteRefusalKind } from '../../../../supabase/functions/_shared/write-routes.ts';

export type {
  Clock,
  ConfigRegistry,
  Fixtures,
  Tier,
  WorldSeam,
} from '../../harness/contracts.ts';
export { TIERS } from '../../harness/contracts.ts';

export type { Allowance, Decision, DeliveryRow, NotificationEventRow, OrganizationDashboard, PublicProjectView, SpendRow, VettingOutcomeNotice, WriteRefusalKind };

export type Session = {
  accountId: string;
  email: string;
  sessionId: string;
};

export type NgoActor = {
  session: Session;
  accountId: string;
  organizationId: string;
  email: string;
};

export type WriteRefusal = {
  ok: false;
  kind: WriteRefusalKind | 'unauthenticated';
  status: number;
  reason: string;
};

export type OrganizationProfileFields = {
  mission: string;
  country: string;
  website: string;
  logo: string;
};

export type OrganizationProfileRow = {
  id: string;
  name: string;
  mission: string | null;
  country: string | null;
  website: string | null;
  logo: string | null;
};

export type ProfileRequest = OrganizationProfileFields & {
  organizationId: string;
  name: string;
};

export type ProfileOutcome = { ok: true; organizationId: string } | WriteRefusal;

export type ProfileDefinerAttempt = {
  accountId: string;
  request: ProfileRequest;
};

export type ProfileDefinerOutcome =
  | { ok: true; organizationId: string }
  | { ok: false; kind: WriteRefusalKind; reason: string };

export type RegistrationDocumentMetadata = {
  registrationReceivedAt: string;
  registrationDocumentCount: number;
  registrationCopiesDeleted: boolean;
};

export type VetEvidence = {
  organizationName: string;
  publicReferenceUrl: string;
  contactName: string;
  contactTitle: string;
  authorityAttestation: string;
  evidenceType: string;
  note: string;
} & Partial<RegistrationDocumentMetadata>;

export type VettingRecord = {
  organizationId: string;
  vetted: boolean;
  vettedByAccountId: string;
  vettedAt: string;
  organizationName: string;
  publicReferenceUrl: string;
  contactName: string;
  contactTitle: string;
  authorityAttestation: string;
  evidenceType: string;
  note: string;
  registration: RegistrationDocumentMetadata | null;
};

export type VetRequest = VetEvidence & { organizationId: string; action: 'vet' };
export type UnvetRequest = { organizationId: string; action: 'unvet'; note: string };
export type VettingRequest = VetRequest | UnvetRequest;

export type VettingOutcome =
  | { ok: true; organizationId: string; vetted: boolean; changed: boolean; notificationEventId: string | null }
  | WriteRefusal;

export type VettingAuditRow = {
  id: string;
  occurredAt: string;
  actorAccountId: string | null;
  actorLabel: string;
  subjectOrgId: string;
  reason: string;
  detail: {
    action: 'vet' | 'unvet';
    previousVetted: boolean;
    current: VettingRecord;
  };
};

export type OperatorWriteOutcome = { ok: true } | { ok: false; reason: string };

export type VettingDefinerNotice = {
  channels: string[];
  copy: { subject: string; body: string };
};

export type VettingDefinerAttempt = {
  accountId: string;
  request: VettingRequest;
  notice: VettingDefinerNotice;
};

export type VettingNotificationEvent = NotificationEventRow & {
  actorAccountId: string | null;
  payload: Record<string, unknown>;
};

export type AllowanceOutcome = { ok: true; allowance: Allowance } | WriteRefusal;

export type PublishingDecision = Decision<'vetted'>;
export type FundingDecision = Decision<'not-vetting-gated'>;
export type DiscoveryMessageDecision = Decision<'verified'>;

export type ViewerAnswer = { status: number; body: string };
export type TenantReadOutcome<T> = { ok: true; value: T; answer: ViewerAnswer } | { ok: false; answer: ViewerAnswer };
export type PublicProjectOutcome = { ok: true; page: PublicProjectView; answer: ViewerAnswer } | { ok: false; answer: ViewerAnswer };

export type OrganizationsSut = {
  provisionNgo(email: string, opts: { emailVerified: boolean }): Promise<NgoActor>;
  provisionVolunteer(email: string): Promise<Session>;
  provisionPlatformAdmin(email: string): Promise<Session>;
  deactivateAccountAsOperator(accountId: string): Promise<void>;

  setProfile(session: Session | null, request: ProfileRequest): Promise<ProfileOutcome>;
  profile(organizationId: string): Promise<OrganizationProfileRow | null>;
  organizationDashboard(session: Session | null, organizationId: string): Promise<TenantReadOutcome<OrganizationDashboard>>;
  attemptProfileDefinerAsOperator(input: ProfileDefinerAttempt): Promise<ProfileDefinerOutcome>;
  setMembershipRoleAsOperator(organizationId: string, accountId: string, role: 'admin' | 'member'): Promise<void>;

  setVetting(session: Session | null, request: VettingRequest & Record<string, unknown>): Promise<VettingOutcome>;
  vettingRecord(organizationId: string): Promise<VettingRecord | null>;
  attemptVettingRowAsOperator(
    row: { [K in keyof Omit<VettingRecord, 'registration'>]: VettingRecord[K] | null } & Partial<RegistrationDocumentMetadata>,
  ): Promise<OperatorWriteOutcome>;
  vettingAuditEvents(organizationId: string): Promise<VettingAuditRow[]>;
  removeOrganizationSeatAsOperator(organizationId: string): Promise<void>;
  addOrganizationSeatAsOperator(organizationId: string, accountId: string): Promise<void>;
  clearAccountEmailAsOperator(accountId: string): Promise<void>;
  attemptVettingDefinerAsOperator(input: VettingDefinerAttempt): Promise<OperatorWriteOutcome>;

  notificationEvents(filter: { event?: string; recipientId?: string }): Promise<VettingNotificationEvent[]>;
  notificationDeliveries(filter: { eventId?: string; recipientId?: string }): Promise<DeliveryRow[]>;

  readAllowance(session: Session | null, organizationId: string): Promise<AllowanceOutcome>;
  debitAllowance(session: Session | null, organizationId: string, credits: number): Promise<AllowanceOutcome>;
  spendRows(organizationId: string): Promise<SpendRow[]>;
  writeSpendRowAsOperator(row: SpendRow): Promise<void>;

  publishingAllowed(organizationId: string): Promise<PublishingDecision>;
  fundingAllowed(organizationId: string): Promise<FundingDecision>;
  discoveryMessageAllowed(session: Session): Promise<DiscoveryMessageDecision>;

  createProjectAsOperator(organizationId: string, name: string): Promise<{ id: string }>;
  publicProjectPage(projectId: string, session?: Session | null): Promise<PublicProjectOutcome>;
};

export type World = WorldSeam & {
  email(local: string): string;
};
