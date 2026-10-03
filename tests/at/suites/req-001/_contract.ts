import type { WorldSeam } from '../../harness/contracts.ts';
import type {
  AccountLifecycle,
  AccountType,
  CompleteSignupRequest,
} from '../../../../supabase/functions/_shared/accounts.ts';
import type { WriteRefusalKind, WriteRouteName } from '../../../../supabase/functions/_shared/write-routes.ts';
import type { OrgAdminRefusalKind, OrgRole } from '../../../../supabase/functions/_shared/memberships.ts';
import type {
  OrganizationDashboard,
  ProjectWorkspace,
} from '../../../../supabase/functions/_shared/tenant-reads.ts';
import type { PublicProjectView } from '../../../../supabase/functions/_shared/public-project.ts';

export type {
  Clock,
  ConfigRegistry,
  FaultHandle,
  Faults,
  Fixtures,
  ProviderOutcome,
  Sentinel,
  Sentinels,
  StaticScan,
  Tier,
  WorldSeam,
} from '../../harness/contracts.ts';
export { TIERS } from '../../harness/contracts.ts';

export type { AccountLifecycle, AccountType, CompleteSignupRequest, OrgAdminRefusalKind, OrgRole, WriteRefusalKind, WriteRouteName };
export type { OrganizationDashboard, ProjectWorkspace, PublicProjectView };

export type AccountRow = {
  id: string;
  accountType: AccountType;
  lifecycle: AccountLifecycle;
};

export type AuditEventKind =
  | 'org_contact_transferred'
  | 'account_lifecycle_changed'
  | 'org_role_changed'
  | 'org_escalation_contact_recorded'
  | 'org_vetting_changed';

export type AuditEventRow = {
  id: string;
  occurredAt: string;
  eventKind: AuditEventKind;
  actorAccountId: string | null;
  actorLabel: string;
  subjectAccountId: string | null;
  subjectOrgId: string | null;
  reason: string;
  detail: Record<string, unknown>;
};

export type EscalationContactRow = {
  organizationId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  recordedByAccountId: string;
  recordedAt: string;
};

export type OrganizationRow = {
  id: string;
  name: string;
  mission: string | null;
  country: string | null;
  website: string | null;
  logo: string | null;
};

export type MembershipRow = {
  organizationId: string;
  accountId: string;
  role: 'admin' | 'member';
};

export type ProjectRow = {
  id: string;
  organizationId: string;
  name: string;
  assignedVolunteerId: string | null;
};

export type AcknowledgmentRow = {
  accountId: string;
  kind: string;
  acknowledgedAt: string;
  ip: string;
  textVersion: string;
  signerName: string;
  signerTitle: string;
  authorityAttestation: string;
};

export type VolunteerProfileRow = {
  accountId: string;
  githubHandle: string;
  topLanguages: string[];
  repositoryCount: number;
  contributionSummary: string;
  importedAt: string;
};

export type SessionProvider = 'email' | 'google' | 'github';

export type Session = {
  accountId: string;
  email: string;
  provider: SessionProvider;
  sessionId: string;
};

export type SignInOutcome = { ok: true; session: Session } | { ok: false; reason: string };

export type RefreshSessionOutcome = { ok: true; session: Session } | { ok: false; reason: string };

export type CompleteSignupOutcome =
  | { ok: true; accountId: string; organizationId: string | null }
  | WriteRefusal
  | { ok: false; reason: string };

export type CreateOrganizationOutcome = { ok: true; organizationId: string } | WriteRefusal;

export type UpdateOrganizationOutcome = { ok: true; organizationId: string; name: string } | WriteRefusal;

export type WriteRefusal = {
  ok: false;
  kind: WriteRefusalKind | 'unauthenticated';
  status: number;
  reason: string;
};

export type TransferRequest = {
  organizationId: string;
  fromAccountId: string;
  toAccountId: string;
  reason: string;
};

export type TransferOutcome = { ok: true; organizationId: string } | WriteRefusal;

export type EscalationContactRequest = {
  organizationId: string;
  name: string;
  email: string;
  phone: string | null;
};

export type EscalationOutcome = { ok: true; organizationId: string } | WriteRefusal;

export type WriteSubject =
  | { readonly route: 'project-need'; readonly organizationId: string; readonly action: 'start'; readonly title: string }
  | { readonly route: 'complete-signup'; readonly name: string }
  | { readonly route: 'create-organization'; readonly name: string }
  | { readonly route: 'update-organization'; readonly organizationId: string; readonly name: string }
  | {
      readonly route: 'set-organization-profile';
      readonly organizationId: string;
      readonly name: string;
      readonly mission: string;
      readonly country: string;
      readonly website: string;
      readonly logo: string;
    }
  | {
      readonly route: 'transfer-organization-contact';
      readonly organizationId: string;
      readonly fromAccountId: string;
      readonly toAccountId: string;
      readonly reason: string;
    }
  | { readonly route: 'set-escalation-contact'; readonly organizationId: string; readonly name: string; readonly email: string }
  | {
      readonly route: 'set-account-lifecycle';
      readonly accountId: string;
      readonly lifecycle: AccountLifecycle;
      readonly reason: string;
    }
  | {
      readonly route: 'set-organization-vetting';
      readonly organizationId: string;
      readonly action: 'vet';
      readonly organizationName: string;
      readonly publicReferenceUrl: string;
      readonly contactName: string;
      readonly contactTitle: string;
      readonly authorityAttestation: string;
      readonly evidenceType: string;
      readonly note: string;
    }
  | {
      readonly route: 'set-organization-discovery';
      readonly organizationId: string;
      readonly enabled: boolean;
      readonly reason: string;
    }
  | {
      readonly route: 'discovery-allowance';
      readonly organizationId: string;
      readonly action: 'read' | 'debit';
      readonly credits?: number;
    }
  | { readonly route: 'discovery-message'; readonly message: string }
  | { readonly route: 'discovery-scope'; readonly organizationId: string; readonly projectId: string; readonly action: 'generate' }
  | {
      readonly route: 'discovery-brief';
      readonly organizationId: string;
      readonly projectId: string;
      readonly action: 'edit';
      readonly sectionId: string;
      readonly text: string;
      readonly baseRevision: number;
    };

export type WriteAttemptOutcome = { ok: true } | WriteRefusal;

export type LifecycleRequest = {
  accountId: string;
  lifecycle: AccountLifecycle;
  reason: string;
};

export type LifecycleOutcome = { ok: true; changed: boolean } | WriteRefusal;

export type TamperOutcome = { ok: true } | { ok: false; reason: string };

export type GrantMembershipOutcome =
  | { ok: true; membership: MembershipRow }
  | { ok: false; kind: 'not-an-ngo-account' | 'org-already-seated' | 'refused'; reason: string };

export type RepointMembershipOutcome =
  | { ok: true; membership: MembershipRow }
  | { ok: false; kind: 'not-an-ngo-account' | 'refused'; reason: string };

export type AssignVolunteerOutcome =
  | { ok: true; project: ProjectRow }
  | { ok: false; kind: 'seat-occupied' | 'not-a-volunteer-account' | 'refused'; reason: string };

export type SendDiscoveryMessageOutcome = { ok: true } | WriteRefusal;

export type ViewerAnswer = { status: number; body: string };
export type ViewerRefusalKind = 'privilege-denied' | 'session-refused' | 'refused';
export type ViewerRead<Row> =
  | { ok: true; rows: readonly Row[]; answer: ViewerAnswer }
  | { ok: false; kind: ViewerRefusalKind; reason: string; answer: ViewerAnswer };
export type TenantReadOutcome<T> = { ok: true; value: T; answer: ViewerAnswer } | { ok: false; answer: ViewerAnswer };
export type PublicProjectOutcome = { ok: true; page: PublicProjectView; answer: ViewerAnswer } | { ok: false; answer: ViewerAnswer };
export type TablePrivilege =
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'truncate'
  | 'references'
  | 'trigger';

export type TenantTableFacts = {
  table: string;
  rowLevelSecurity: boolean;
  forceRowLevelSecurity: boolean;
  anon: readonly TablePrivilege[];
  authenticated: readonly TablePrivilege[];
  serviceRole: readonly TablePrivilege[];
  policies: readonly { name: string; using: string }[];
};

export type TenantFunctionFacts = {
  name: string;
  anonExecute: boolean;
  authenticatedExecute: boolean;
};

export type TenantCatalogFacts = {
  tables: readonly TenantTableFacts[];
  functions: readonly TenantFunctionFacts[];
};

export type AccountsSut = {
  publicSignupAccountTypes(): Promise<readonly string[]>;

  registerWithEmailPassword(email: string, password: string): Promise<Session>;
  registerWithProvider(provider: SessionProvider, email: string): Promise<Session>;
  registerWithGithub(email: string, githubHandle: string): Promise<Session>;
  linkGithubIdentity(session: Session, githubHandle: string): Promise<void>;
  unlinkGithubIdentity(session: Session, provider: string): Promise<void>;
  linkedIdentities(accountId: string): Promise<{ provider: string }[]>;
  authUserIsHealthy(session: Session): Promise<boolean>;
  signInWithEmailPassword(email: string, password: string): Promise<SignInOutcome>;
  signInWithProvider(provider: SessionProvider, email: string): Promise<SignInOutcome>;

  signOut(session: Session): Promise<void>;
  refreshSession(session: Session): Promise<RefreshSessionOutcome>;
  sessionsOf(accountId: string): Promise<{ sessionId: string }[]>;

  requestPasswordReset(email: string): Promise<{ ok: true }>;
  emailedPasswordResetLink(email: string): Promise<string | null>;
  completePasswordReset(link: string, newPassword: string): Promise<{ ok: boolean }>;

  emailVerified(accountId: string): Promise<boolean>;
  emailedVerificationLink(email: string): Promise<string | null>;
  useVerificationLink(link: string): Promise<{ ok: boolean }>;

  completeSignup(session: Session, request: CompleteSignupRequest, ip: string): Promise<CompleteSignupOutcome>;
  createOrganization(session: Session, organizationName: string): Promise<CreateOrganizationOutcome>;

  updateOrganization(session: Session, organizationId: string, name: string): Promise<UpdateOrganizationOutcome>;

  createOrganizationAsOperator(name: string): Promise<OrganizationRow>;

  grantMembershipAsOperator(organizationId: string, accountId: string, role: OrgRole): Promise<GrantMembershipOutcome>;

  repointMembershipAsOperator(organizationId: string, accountId: string): Promise<RepointMembershipOutcome>;

  createProjectAsOperator(organizationId: string, name: string): Promise<ProjectRow>;

  assignVolunteerAsOperator(projectId: string, accountId: string): Promise<AssignVolunteerOutcome>;

  retypeAccountAsOperator(accountId: string, accountType: AccountType): Promise<void>;

  clearEmailConfirmationAsOperator(accountId: string): Promise<void>;

  projectAssignment(projectId: string): Promise<ProjectRow | null>;

  sendDiscoveryMessage(session: Session, body: string): Promise<SendDiscoveryMessageOutcome>;
  discoveryMessagesBy(accountId: string): Promise<string[]>;

  account(accountId: string): Promise<AccountRow | null>;
  organization(organizationId: string): Promise<OrganizationRow | null>;
  membership(organizationId: string, accountId: string): Promise<MembershipRow | null>;
  acknowledgments(accountId: string): Promise<AcknowledgmentRow[]>;
  volunteerProfile(accountId: string): Promise<VolunteerProfileRow | null>;

  organizationsNamed(name: string): Promise<OrganizationRow[]>;
  membershipsOf(accountId: string): Promise<MembershipRow[]>;
  hasPlatformAcknowledgment(accountId: string): Promise<boolean>;

  provisionPlatformAdmin(email: string, password: string): Promise<Session>;

  transferOrganizationContact(session: Session | null, request: TransferRequest): Promise<TransferOutcome>;
  setEscalationContact(session: Session | null, request: EscalationContactRequest): Promise<EscalationOutcome>;
  setAccountLifecycle(session: Session | null, request: LifecycleRequest): Promise<LifecycleOutcome>;
  attemptWrite(subject: WriteSubject, session: Session | null): Promise<WriteAttemptOutcome>;

  auditEvents(filter: { subjectOrgId?: string; subjectAccountId?: string }): Promise<AuditEventRow[]>;
  attemptAuditTamper(attempt: 'update' | 'delete' | 'truncate'): Promise<TamperOutcome>;
  escalationContact(organizationId: string): Promise<EscalationContactRow | null>;

  organizationAsViewer(session: Session | null, organizationId: string): Promise<ViewerRead<OrganizationRow>>;
  membershipsAsViewer(session: Session | null, organizationId: string): Promise<ViewerRead<MembershipRow>>;
  projectAsViewer(session: Session | null, projectId: string): Promise<ViewerRead<ProjectRow>>;
  acknowledgmentsAsViewer(session: Session | null, accountId: string): Promise<ViewerRead<AcknowledgmentRow>>;
  organizationsAsViewer(session: Session | null): Promise<ViewerRead<OrganizationRow>>;
  organizationDashboard(session: Session | null, organizationId: string): Promise<TenantReadOutcome<OrganizationDashboard>>;
  projectWorkspace(session: Session | null, projectId: string): Promise<TenantReadOutcome<ProjectWorkspace>>;
  publicProjectPage(projectId: string, session?: Session | null): Promise<PublicProjectOutcome>;
  tenantTableFacts(): Promise<TenantCatalogFacts>;
};

export type World = WorldSeam & {
  email(local: string): string;
};
