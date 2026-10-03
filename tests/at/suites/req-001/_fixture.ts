import { decideDiscoveryMessage, type DiscoveryReserveArgs } from '../../../../supabase/functions/_shared/discovery-turn.ts';
import { decideDiscoveryScope, type DiscoveryScopeArgs } from '../../../../supabase/functions/_shared/scope.ts';
import { decideDiscoveryBrief, type DiscoveryBriefCommitArgs } from '../../../../supabase/functions/_shared/discovery-brief-write.ts';
import { AT_CONFIG } from '../../harness/atconfig.ts';
import type { ControlledClock } from '../../harness/clock.ts';
import type { FixtureWorld, FixtureWorldStore } from '../../harness/fixtures.ts';
import {
  PLATFORM_ACKNOWLEDGMENT_KIND,
  PUBLIC_SIGNUP_ACCOUNT_TYPES,
  decideOrganizationCreation,
  decideSignupCompletion,
  validateOrganizationName,
  type AccountType,
  type CompleteSignupRequest,
  type OrganizationCreationArgs,
  type SignupCompletionArgs,
} from '../../../../supabase/functions/_shared/accounts.ts';
import { callerFromAuthAnswer, type Caller } from '../../../../supabase/functions/_shared/caller.ts';
import {
  decideOrganizationProfile,
  decideOrganizationRename,
  type OrganizationProfileArgs,
  type OrganizationRenameArgs,
} from '../../../../supabase/functions/_shared/memberships.ts';
import {
  organizationIdField,
  parseWriteStanding,
  writePipeline,
  type AccountWriteRouteInput,
  type WriteRouteInput,
  type WriteRouteName,
  type WriteRouteSpec,
} from '../../../../supabase/functions/_shared/write-routes.ts';
import {
  accountIdField,
  decideContactTransfer,
  decideEscalationContact,
  decideLifecycleChange,
  fromAccountIdField,
  subjectAccountIdField,
  type ContactTransferArgs,
  type EscalationContactArgs,
  type LifecycleChangeArgs,
} from '../../../../supabase/functions/_shared/admin-operations.ts';
import {
  decideDiscoveryAllowance,
  type DiscoveryAllowanceArgs,
} from '../../../../supabase/functions/_shared/discovery-allowance.ts';
import {
  decideOrganizationVetting,
  type OrganizationVettingArgs,
} from '../../../../supabase/functions/_shared/org-vetting.ts';
import {
  decideOrganizationDiscovery,
  type OrganizationDiscoveryArgs,
} from '../../../../supabase/functions/_shared/discovery-switch.ts';
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';
import { stubGithubStatsFor } from '../../../../supabase/functions/_shared/github.ts';
import {
  discoveryMessageAllowed,
  emailVerifiedFromUser,
} from '../../../../supabase/functions/_shared/verification.ts';
import {
  organizationDashboard,
  projectWorkspace,
  type TenantReadAnswer,
  type TenantReads,
} from '../../../../supabase/functions/_shared/tenant-reads.ts';
import { publicProjectAnswer } from '../../../../supabase/functions/_shared/public-project.ts';
import { decideProjectNeed } from '../../../../supabase/functions/_shared/need-intake.ts';
import { CapabilityPending } from '../../harness/pending.ts';
import type {
  AccountLifecycle,
  AccountRow,
  AccountsSut,
  AcknowledgmentRow,
  AssignVolunteerOutcome,
  AuditEventKind,
  AuditEventRow,
  CompleteSignupOutcome,
  CreateOrganizationOutcome,
  EscalationContactRow,
  EscalationOutcome,
  GrantMembershipOutcome,
  LifecycleOutcome,
  MembershipRow,
  OrganizationRow,
  ProjectRow,
  PublicProjectOutcome,
  RefreshSessionOutcome,
  RepointMembershipOutcome,
  SendDiscoveryMessageOutcome,
  Session,
  SessionProvider,
  SignInOutcome,
  TamperOutcome,
  TenantReadOutcome,
  TransferOutcome,
  UpdateOrganizationOutcome,
  VolunteerProfileRow,
  World,
  WriteAttemptOutcome,
  WriteRefusal,
} from './_contract.ts';

export const requirement = 'req-001' as const;

interface AdapterOptions {
  clock: ControlledClock;
  worlds: FixtureWorldStore;
}

interface AuthUser {
  id: string;
  email: string;
  password: string | null;
  provider: SessionProvider;
  githubHandle: string | null;
  identities: { provider: string }[];
  emailConfirmedAt: string | null;
  verificationLink: string | null;
  passwordResetLink: string | null;
}

interface StoredSession {
  userId: string;
  expiresAtMs: number;
  revoked: boolean;
}

interface StoredAcknowledgment extends AcknowledgmentRow {}

interface State {
  authUsers: Map<string, AuthUser>;
  byEmail: Map<string, string>;
  byVerificationLink: Map<string, string>;
  byPasswordResetLink: Map<string, string>;
  sessions: Map<string, StoredSession>;
  accounts: Map<string, AccountRow>;
  organizations: Map<string, OrganizationRow>;
  memberships: Map<string, MembershipRow>;
  projects: Map<string, ProjectRow>;
  acknowledgments: StoredAcknowledgment[];
  volunteerProfiles: Map<string, VolunteerProfileRow>;
  discoveryMessages: Map<string, string[]>;
  auditEvents: AuditEventRow[];
  escalationContacts: Map<string, EscalationContactRow>;
  nextId: number;
}

function membershipKey(organizationId: string, accountId: string): string {
  return `${organizationId}:${accountId}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

class AccountsFixtureWorld implements World {
  constructor(
    private readonly base: FixtureWorld,
    private readonly serial: number,
  ) {}

  email(local: string): string {
    return `${local}+w${this.serial}@example.test`;
  }

  async teardown(): Promise<void> {
    await this.base.teardown();
  }
}

export function createFixtureAdapter({ clock, worlds }: AdapterOptions) {
  const state: State = {
    authUsers: new Map(),
    byEmail: new Map(),
    byVerificationLink: new Map(),
    byPasswordResetLink: new Map(),
    sessions: new Map(),
    accounts: new Map(),
    organizations: new Map(),
    memberships: new Map(),
    projects: new Map(),
    acknowledgments: [],
    volunteerProfiles: new Map(),
    discoveryMessages: new Map(),
    auditEvents: [],
    escalationContacts: new Map(),
    nextId: 1,
  };
  const openedWorlds = new Set<AccountsFixtureWorld>();
  let worldSerial = 0;

  const nextId = (prefix: string): string => `${prefix}-${state.nextId++}`;

  const CONFIRMED_AT = '2026-01-01T00:00:00.000Z';

  const ACCESS_TOKEN_TTL_MS = AT_CONFIG.accessTokenLifetimeSeconds.value * 1000;

  const issueSession = (user: AuthUser, provider: SessionProvider = user.provider): Session => {
    const sessionId = nextId('session');
    state.sessions.set(sessionId, {
      userId: user.id,
      expiresAtMs: clock.now() + ACCESS_TOKEN_TTL_MS,
      revoked: false,
    });
    return { accountId: user.id, email: user.email, provider, sessionId };
  };

  const register = (
    email: string,
    password: string | null,
    provider: SessionProvider,
    githubHandle: string | null = null,
    confirmedByTheCreator = false,
  ): Session => {
    const existing = state.byEmail.get(email);
    if (existing) throw new Error(`fixture: ${email} is already registered — Supabase Auth would refuse this`);

    const id = nextId('user');
    const confirmedAtCreation = provider !== 'email' || confirmedByTheCreator;
    const emailConfirmedAt = confirmedAtCreation ? CONFIRMED_AT : null;
    const verificationLink = confirmedAtCreation ? null : `verify-${id}`;

    const user: AuthUser = {
      id,
      email,
      password,
      provider,
      githubHandle,
      identities:
        githubHandle !== null && provider !== 'github'
          ? [{ provider }, { provider: 'github' }]
          : [{ provider }],
      emailConfirmedAt,
      verificationLink,
      passwordResetLink: null,
    };
    state.authUsers.set(user.id, user);
    state.byEmail.set(email, user.id);
    if (verificationLink !== null) state.byVerificationLink.set(verificationLink, user.id);
    return issueSession(user);
  };

  const renderAuthUser = (user: AuthUser): Record<string, unknown> => ({
    id: user.id,
    email: user.email,
    email_confirmed_at: user.emailConfirmedAt,
    identities:
      user.githubHandle === null
        ? []
        : [{ provider: 'github', identity_data: { user_name: user.githubHandle } }],
  });

  const sessionIsLive = (stored: StoredSession | undefined): stored is StoredSession =>
    stored !== undefined && !stored.revoked && clock.now() < stored.expiresAtMs;

  const resolveCaller = (session: Session): Caller | null => {
    const stored = state.sessions.get(session.sessionId);
    const user = sessionIsLive(stored) ? state.authUsers.get(stored.userId) : undefined;
    return user === undefined
      ? callerFromAuthAnswer(401, null)
      : callerFromAuthAnswer(200, renderAuthUser(user));
  };

  const DEAD_SESSION_REASON = 'this session is no longer valid — sign in again';

  const renderWriteStanding = (
    accountId: string,
    organizationId: string | null,
    subjectAccountId: string | null,
  ): Record<string, unknown> => {
    const account = state.accounts.get(accountId) ?? null;
    const seat =
      organizationId === null ? null : ([...state.memberships.values()].find((row) => row.organizationId === organizationId) ?? null);
    const subject = subjectAccountId === null ? null : (state.accounts.get(subjectAccountId) ?? null);
    return {
      account: account === null ? null : { account_type: account.accountType, lifecycle: account.lifecycle },
      org_exists: organizationId !== null && state.organizations.has(organizationId),
      org_role: organizationId === null ? null : (state.memberships.get(membershipKey(organizationId, accountId))?.role ?? null),
      org_seat_account_id: seat?.accountId ?? null,
      subject: subject === null ? null : { account_type: subject.accountType, lifecycle: subject.lifecycle },
    };
  };

  type WriteRun<Args> = { ok: true; caller: Caller; args: Args } | WriteRefusal;

  const runWrite = <Args, Input extends WriteRouteInput = WriteRouteInput>(
    spec: WriteRouteSpec<Args, Input>,
    session: Session | null,
    body: Record<string, unknown>,
    ip: string | null,
  ): WriteRun<Args> => {
    const caller = session === null ? null : resolveCaller(session);
    if (caller === null) return { ok: false, kind: 'unauthenticated', status: 401, reason: DEAD_SESSION_REASON };
    const target = spec.target ? spec.target(body) : null;
    const subject = spec.subject ? spec.subject(body) : null;
    const standing = parseWriteStanding(renderWriteStanding(caller.id, target, subject));
    const decision = writePipeline(spec, { caller, standing, body, target, subject, ip });
    if (decision.ok) return { ok: true, caller, args: decision.args };
    return { ok: false, kind: decision.kind, status: decision.status, reason: decision.reason };
  };

  const SIGNUP_COMPLETION: WriteRouteSpec<SignupCompletionArgs> = { name: 'complete-signup', decide: decideSignupCompletion };
  const ORGANIZATION_CREATION: WriteRouteSpec<OrganizationCreationArgs, AccountWriteRouteInput> = {
    name: 'create-organization',
    decide: decideOrganizationCreation,
  };
  const ORGANIZATION_RENAME: WriteRouteSpec<OrganizationRenameArgs, AccountWriteRouteInput> = {
    name: 'update-organization',
    target: organizationIdField,
    decide: decideOrganizationRename,
  };
  const ORGANIZATION_PROFILE: WriteRouteSpec<OrganizationProfileArgs, AccountWriteRouteInput> = {
    name: 'set-organization-profile',
    target: organizationIdField,
    decide: decideOrganizationProfile,
  };
  const CONTACT_TRANSFER: WriteRouteSpec<ContactTransferArgs, AccountWriteRouteInput> = {
    name: 'transfer-organization-contact',
    target: organizationIdField,
    subject: subjectAccountIdField,
    from: fromAccountIdField,
    decide: decideContactTransfer,
  };
  const ESCALATION_CONTACT: WriteRouteSpec<EscalationContactArgs, AccountWriteRouteInput> = {
    name: 'set-escalation-contact',
    target: organizationIdField,
    decide: decideEscalationContact,
  };
  const LIFECYCLE_CHANGE: WriteRouteSpec<LifecycleChangeArgs, AccountWriteRouteInput> = {
    name: 'set-account-lifecycle',
    subject: accountIdField,
    decide: decideLifecycleChange,
  };
  const ORGANIZATION_VETTING: WriteRouteSpec<OrganizationVettingArgs, AccountWriteRouteInput> = {
    name: 'set-organization-vetting',
    target: organizationIdField,
    decide: decideOrganizationVetting,
  };
  const ORGANIZATION_DISCOVERY: WriteRouteSpec<OrganizationDiscoveryArgs, AccountWriteRouteInput> = {
    name: 'set-organization-discovery',
    target: organizationIdField,
    decide: decideOrganizationDiscovery,
  };
  const DISCOVERY_ALLOWANCE: WriteRouteSpec<DiscoveryAllowanceArgs, AccountWriteRouteInput> = {
    name: 'discovery-allowance',
    target: organizationIdField,
    decide: decideDiscoveryAllowance,
  };
  const DISCOVERY_MESSAGE: WriteRouteSpec<DiscoveryReserveArgs, AccountWriteRouteInput> = {
    name: 'discovery-message', target: organizationIdField, decide: decideDiscoveryMessage,
  };
  const DISCOVERY_SCOPE: WriteRouteSpec<DiscoveryScopeArgs, AccountWriteRouteInput> = {
    name: 'discovery-scope', target: organizationIdField, decide: decideDiscoveryScope,
  };
  const DISCOVERY_BRIEF: WriteRouteSpec<DiscoveryBriefCommitArgs, AccountWriteRouteInput> = {
    name: 'discovery-brief', target: organizationIdField, decide: decideDiscoveryBrief,
  };

  const appendAudit = (
    eventKind: AuditEventKind,
    actorAccountId: string | null,
    subjectAccountId: string | null,
    subjectOrgId: string | null,
    reason: string,
    detail: Record<string, unknown>,
  ): void => {
    const actor = actorAccountId === null ? null : (state.accounts.get(actorAccountId) ?? null);
    state.auditEvents.push({
      id: nextId('audit'),
      occurredAt: new Date(clock.now()).toISOString(),
      eventKind,
      actorAccountId,
      actorLabel: actorAccountId === null || actor === null ? 'operator' : `${actor.accountType}:${actorAccountId}`,
      subjectAccountId,
      subjectOrgId,
      reason,
      detail,
    });
  };

  const recordRoleChange = (
    previous: MembershipRow | null,
    next: MembershipRow | null,
    actorAccountId: string | null,
  ): void => {
    if (next === null) {
      if (previous === null) return;
      appendAudit('org_role_changed', actorAccountId, previous.accountId, previous.organizationId, 'membership removed', {
        old_role: previous.role,
        new_role: null,
        old_account_id: previous.accountId,
        new_account_id: null,
      });
      return;
    }
    if (previous !== null && previous.accountId === next.accountId && previous.role === next.role) return;
    const reason =
      previous === null ? 'membership granted' : previous.accountId !== next.accountId ? 'seat repointed' : 'role changed';
    appendAudit('org_role_changed', actorAccountId, next.accountId, next.organizationId, reason, {
      old_role: previous?.role ?? null,
      new_role: next.role,
      old_account_id: previous?.accountId ?? null,
      new_account_id: next.accountId,
    });
  };

  const changeLifecycle = (accountId: string, lifecycle: AccountLifecycle, actorAccountId: string, reason: string): boolean => {
    const account = state.accounts.get(accountId);
    if (!account) throw new Error(`fixture: no account ${accountId} to change the lifecycle of`);
    if (account.lifecycle === lifecycle) return false;
    state.accounts.set(accountId, { ...account, lifecycle });
    appendAudit('account_lifecycle_changed', actorAccountId, accountId, null, reason, { from: account.lifecycle, to: lifecycle });
    return true;
  };

  const reachableThroughProvider = (user: AuthUser, provider: SessionProvider): boolean =>
    provider === 'github' ? user.githubHandle !== null : user.provider === provider;

  const completeSignup = async (
    session: Session,
    request: CompleteSignupRequest,
    ip: string,
  ): Promise<CompleteSignupOutcome> => {
    const run = runWrite(SIGNUP_COMPLETION, session, request, ip);
    if (!run.ok) return run;
    const { caller } = run;
    const {
      p_account_type: accountType,
      p_organization_name: organizationName,
      p_acknowledgment_text_version: acknowledgmentTextVersion,
      p_github_handle: githubHandle = null,
      p_signer_name: signerName,
      p_signer_title: signerTitle,
      p_authority_attestation: authorityAttestation,
    } = run.args;

    if (state.accounts.has(caller.id)) {
      return { ok: false, reason: 'this account has already completed signup — one account holds exactly one global type' };
    }

    const account: AccountRow = { id: caller.id, accountType, lifecycle: 'active' };
    let organization: OrganizationRow | null = null;
    let membership: MembershipRow | null = null;

    if (organizationName !== null) {
      organization = {
        id: nextId('org'),
        name: organizationName,
        mission: null,
        country: null,
        website: null,
        logo: null,
      };
      membership = { organizationId: organization.id, accountId: account.id, role: 'admin' };
    }

    let volunteerProfile: VolunteerProfileRow | null = null;
    if (githubHandle !== null) {
      const stats = stubGithubStatsFor(githubHandle);
      volunteerProfile = {
        accountId: caller.id,
        githubHandle,
        topLanguages: stats.topLanguages,
        repositoryCount: stats.repositoryCount,
        contributionSummary: stats.contributionSummary,
        importedAt: '2026-01-01T00:00:00.000Z',
      };
    }

    const acknowledgment: StoredAcknowledgment = {
      accountId: account.id,
      kind: PLATFORM_ACKNOWLEDGMENT_KIND,
      acknowledgedAt: '2026-01-01T00:00:00.000Z',
      ip,
      textVersion: acknowledgmentTextVersion,
      signerName,
      signerTitle,
      authorityAttestation,
    };

    state.accounts.set(account.id, account);
    if (organization) state.organizations.set(organization.id, organization);
    if (membership) {
      state.memberships.set(membershipKey(membership.organizationId, membership.accountId), membership);
      recordRoleChange(null, membership, caller.id);
    }
    if (volunteerProfile) state.volunteerProfiles.set(volunteerProfile.accountId, volunteerProfile);
    state.acknowledgments.push(acknowledgment);

    return { ok: true, accountId: account.id, organizationId: organization?.id ?? null };
  };

  const fixtureReads = (): TenantReads => ({
    organization: async (organizationId) => {
      const row = state.organizations.get(organizationId);
      return {
        ok: true,
        rows: row
          ? [
              {
                id: row.id,
                name: row.name,
                mission: row.mission,
                country: row.country,
                website: row.website,
                logo: row.logo,
              },
            ]
          : [],
      };
    },
    seatsOf: async (organizationId) => ({
      ok: true,
      rows: [...state.memberships.values()]
        .filter((row) => row.organizationId === organizationId)
        .map((row) => ({ account_id: row.accountId, role: row.role })),
    }),
    projectsOf: async (organizationId) => ({
      ok: true,
      rows: [...state.projects.values()]
        .filter((row) => row.organizationId === organizationId)
        .map((row) => ({ id: row.id, name: row.name, assigned_volunteer_id: row.assignedVolunteerId })),
    }),
    project: async (projectId) => {
      const row = state.projects.get(projectId);
      return {
        ok: true,
        rows: row
          ? [{ id: row.id, name: row.name, org_id: row.organizationId, assigned_volunteer_id: row.assignedVolunteerId }]
          : [],
      };
    },
  });

  const asTenantOutcome = <T>(result: TenantReadAnswer<T>): TenantReadOutcome<T> => {
    const answer = { status: result.status, body: JSON.stringify(result.body) };
    return result.status === 200 ? { ok: true, value: result.body, answer } : { ok: false, answer };
  };

  const deadSessionAnswer = { status: 401, body: JSON.stringify({ ok: false, reason: DEAD_SESSION_REASON }) };

  type AccountsFixtureSut = AccountsSut & {
    deactivateAccountAsOperator(accountId: string): Promise<void>;
    setMembershipRoleAsOperator(
      organizationId: string,
      accountId: string,
      role: 'admin' | 'member',
    ): Promise<void>;
  };

  const sut: AccountsFixtureSut = {
    publicSignupAccountTypes: async () => [...PUBLIC_SIGNUP_ACCOUNT_TYPES],

    registerWithEmailPassword: async (email, password) => register(email, password, 'email'),
    registerWithProvider: async (provider, email) => register(email, null, provider),
    registerWithGithub: async (email, githubHandle) => register(email, null, 'github', githubHandle),

    linkGithubIdentity: async (session, githubHandle) => {
      const caller = resolveCaller(session);
      if (caller === null) {
        throw new Error(`fixture: session ${session.sessionId} is not one Auth would answer for — nothing to link an identity to`);
      }
      const user = state.authUsers.get(caller.id);
      if (!user) throw new Error(`fixture: no auth user ${caller.id} to link a GitHub identity to`);
      user.githubHandle = githubHandle;
      if (!user.identities.some((identity) => identity.provider === 'github')) {
        user.identities.push({ provider: 'github' });
      }
    },

    unlinkGithubIdentity: async (session, provider) => {
      const caller = resolveCaller(session);
      if (caller === null) {
        throw new Error(
          `fixture: session ${session.sessionId} is not one Auth would answer for — nothing to unlink an identity from`,
        );
      }
      const user = state.authUsers.get(caller.id);
      if (!user) throw new Error(`fixture: no auth user ${caller.id} to unlink an identity from`);
      const account = state.accounts.get(caller.id);
      if (provider === 'github' && account?.accountType === 'volunteer') return;
      user.identities = user.identities.filter((identity) => identity.provider !== provider);
      if (provider === 'github') user.githubHandle = null;
    },

    linkedIdentities: async (accountId) => clone(state.authUsers.get(accountId)?.identities ?? []),

    authUserIsHealthy: async (session) => sessionIsLive(state.sessions.get(session.sessionId)),

    signInWithEmailPassword: async (email, password): Promise<SignInOutcome> => {
      const userId = state.byEmail.get(email);
      const user = userId ? state.authUsers.get(userId) : undefined;
      if (!user || user.password === null || user.password !== password) {
        return { ok: false, reason: 'the email or password is incorrect' };
      }
      return { ok: true, session: issueSession(user) };
    },

    signInWithProvider: async (provider, email): Promise<SignInOutcome> => {
      const userId = state.byEmail.get(email);
      const user = userId ? state.authUsers.get(userId) : undefined;
      if (!user || !reachableThroughProvider(user, provider)) {
        return { ok: false, reason: `no account of this address is reachable through ${provider}` };
      }
      return { ok: true, session: issueSession(user, provider) };
    },

    // GoTrue's default logout scope is `global`, ending every session of the user. This models
    // `?scope=local`, one session ending.
    signOut: async (session) => {
      const stored = state.sessions.get(session.sessionId);
      if (!stored) throw new Error(`fixture: no session ${session.sessionId} to sign out`);
      stored.revoked = true;
    },

    refreshSession: async (session): Promise<RefreshSessionOutcome> => {
      const stored = state.sessions.get(session.sessionId);
      if (!stored || stored.revoked) {
        return { ok: false, reason: 'this session has ended — sign in again' };
      }
      const user = state.authUsers.get(stored.userId);
      if (!user) return { ok: false, reason: 'this session has ended — sign in again' };

      stored.expiresAtMs = clock.now() + ACCESS_TOKEN_TTL_MS;
      return { ok: true, session: { accountId: user.id, email: user.email, provider: session.provider, sessionId: session.sessionId } };
    },

    sessionsOf: async (accountId) =>
      [...state.sessions.entries()]
        .filter(([, stored]) => stored.userId === accountId && sessionIsLive(stored))
        .map(([sessionId]) => ({ sessionId })),

    requestPasswordReset: async (email) => {
      const userId = state.byEmail.get(email);
      const user = userId ? state.authUsers.get(userId) : undefined;
      if (user && user.password !== null) {
        const link = `reset-${user.id}-${state.nextId++}`;
        user.passwordResetLink = link;
        state.byPasswordResetLink.set(link, user.id);
      }
      return { ok: true };
    },

    emailedPasswordResetLink: async (email) => {
      const userId = state.byEmail.get(email);
      const user = userId ? state.authUsers.get(userId) : undefined;
      return user?.passwordResetLink ?? null;
    },

    completePasswordReset: async (link, newPassword) => {
      const userId = state.byPasswordResetLink.get(link);
      const user = userId ? state.authUsers.get(userId) : undefined;
      if (!user) return { ok: false };
      user.password = newPassword;
      return { ok: true };
    },

    emailVerified: async (accountId) => {
      const user = state.authUsers.get(accountId);
      if (!user) throw new Error(`fixture: no auth user ${accountId} whose verified state could be read`);
      return emailVerifiedFromUser(renderAuthUser(user));
    },

    emailedVerificationLink: async (email) => {
      const userId = state.byEmail.get(email);
      const user = userId ? state.authUsers.get(userId) : undefined;
      return user?.verificationLink ?? null;
    },

    useVerificationLink: async (link) => {
      const userId = state.byVerificationLink.get(link);
      const user = userId ? state.authUsers.get(userId) : undefined;
      if (!user) return { ok: false };
      user.emailConfirmedAt = CONFIRMED_AT;
      return { ok: true };
    },

    completeSignup,

    sendDiscoveryMessage: async (session, body): Promise<SendDiscoveryMessageOutcome> => {
      const caller = session === null ? null : resolveCaller(session);
      if (caller === null) return { ok: false, kind: 'unauthenticated', status: 401, reason: DEAD_SESSION_REASON };
      const membership = [...state.memberships.values()].find((row) => row.accountId === caller.id);
      const run = runWrite(DISCOVERY_MESSAGE, session, {
        organizationId: membership?.organizationId ?? null, projectId: crypto.randomUUID(), message: body,
        mode: 'answer', userMessageId: crypto.randomUUID(), answers: [], expectedCharge: 'free',
      }, null);
      if (!run.ok) return run;
      const allowed = discoveryMessageAllowed({ emailVerified: caller.emailVerified });
      if (!allowed.ok) return { ok: false, kind: 'email-unverified', status: 409, reason: allowed.reason };
      const sent = state.discoveryMessages.get(run.caller.id) ?? [];
      sent.push(run.args.p_message);
      state.discoveryMessages.set(run.caller.id, sent);
      return { ok: true };
    },

    discoveryMessagesBy: async (accountId) => clone(state.discoveryMessages.get(accountId) ?? []),

    createOrganization: async (session, organizationName): Promise<CreateOrganizationOutcome> => {
      const run = runWrite(ORGANIZATION_CREATION, session, { name: organizationName }, null);
      if (!run.ok) return run;

      const organization: OrganizationRow = {
        id: nextId('org'),
        name: run.args.p_name,
        mission: null,
        country: null,
        website: null,
        logo: null,
      };
      const membership: MembershipRow = { organizationId: organization.id, accountId: run.caller.id, role: 'admin' };
      state.organizations.set(organization.id, organization);
      state.memberships.set(membershipKey(organization.id, membership.accountId), membership);
      recordRoleChange(null, membership, run.caller.id);
      return { ok: true, organizationId: organization.id };
    },

    updateOrganization: async (session, organizationId, name): Promise<UpdateOrganizationOutcome> => {
      const run = runWrite(ORGANIZATION_RENAME, session, { organizationId, name }, null);
      if (!run.ok) return run;

      const previous = state.organizations.get(run.args.p_organization_id);
      state.organizations.set(run.args.p_organization_id, {
        id: run.args.p_organization_id,
        name: run.args.p_name,
        mission: previous?.mission ?? null,
        country: previous?.country ?? null,
        website: previous?.website ?? null,
        logo: previous?.logo ?? null,
      });
      return { ok: true, organizationId: run.args.p_organization_id, name: run.args.p_name };
    },

    createOrganizationAsOperator: async (name) => {
      const validated = validateOrganizationName(name);
      if (!validated.ok) throw new Error(`fixture: an operator cannot create an organisation named ${JSON.stringify(name)} — ${validated.reason}`);
      const organization: OrganizationRow = {
        id: nextId('org'),
        name: validated.value,
        mission: null,
        country: null,
        website: null,
        logo: null,
      };
      state.organizations.set(organization.id, organization);
      return clone(organization);
    },

    grantMembershipAsOperator: async (organizationId, accountId, role): Promise<GrantMembershipOutcome> => {
      const account = state.accounts.get(accountId);
      if (!account) {
        return { ok: false, kind: 'refused', reason: `no account ${accountId} has completed signup` };
      }
      if (account.accountType !== 'ngo') {
        return {
          ok: false,
          kind: 'not-an-ngo-account',
          reason:
            `a per-organisation role may be granted to NGO accounts only — account ${accountId} is of type ` +
            `${JSON.stringify(account.accountType)}`,
        };
      }

      if (!state.organizations.has(organizationId)) {
        return { ok: false, kind: 'refused', reason: `no organisation ${organizationId} exists` };
      }

      const seated = [...state.memberships.values()].find((row) => row.organizationId === organizationId);
      if (seated) {
        return {
          ok: false,
          kind: 'org-already-seated',
          reason:
            `organisation ${organizationId} already holds its single seat (account ${seated.accountId}) — ` +
            'a v1 NGO is single-seat, so no second member can be added',
        };
      }

      const membership: MembershipRow = { organizationId, accountId, role };
      state.memberships.set(membershipKey(organizationId, accountId), membership);
      recordRoleChange(null, membership, null);
      return { ok: true, membership: clone(membership) };
    },

    repointMembershipAsOperator: async (organizationId, accountId): Promise<RepointMembershipOutcome> => {
      const seated = [...state.memberships.values()].find((row) => row.organizationId === organizationId);
      if (!seated) {
        return { ok: false, kind: 'refused', reason: `no membership row exists in organisation ${organizationId} to re-point` };
      }

      const account = state.accounts.get(accountId);
      if (!account) {
        return { ok: false, kind: 'refused', reason: `no account ${accountId} has completed signup` };
      }
      if (account.accountType !== 'ngo') {
        return {
          ok: false,
          kind: 'not-an-ngo-account',
          reason:
            `a per-organisation role may be granted to NGO accounts only — account ${accountId} is of type ` +
            `${JSON.stringify(account.accountType)}`,
        };
      }

      const repointed: MembershipRow = { organizationId, accountId, role: seated.role };
      state.memberships.delete(membershipKey(organizationId, seated.accountId));
      state.memberships.set(membershipKey(organizationId, accountId), repointed);
      recordRoleChange(seated, repointed, null);
      return { ok: true, membership: clone(repointed) };
    },

    createProjectAsOperator: async (organizationId, name) => {
      if (!state.organizations.has(organizationId)) {
        throw new Error(`fixture: no organisation ${organizationId} to create a project in`);
      }
      const trimmed = name.trim();
      if (trimmed === '') throw new Error('fixture: a project needs a non-empty name');
      const project: ProjectRow = { id: nextId('project'), organizationId, name: trimmed, assignedVolunteerId: null };
      state.projects.set(project.id, project);
      return clone(project);
    },

    assignVolunteerAsOperator: async (projectId, accountId): Promise<AssignVolunteerOutcome> => {
      const project = state.projects.get(projectId);
      if (!project) return { ok: false, kind: 'refused', reason: `no project ${projectId} exists` };
      const account = state.accounts.get(accountId);
      if (!account) {
        return { ok: false, kind: 'refused', reason: `no account ${accountId} has completed signup` };
      }
      if (account.accountType !== 'volunteer') {
        return {
          ok: false,
          kind: 'not-a-volunteer-account',
          reason: 'projects refuses assignment: the developer seat admits volunteer accounts only',
        };
      }
      if (project.assignedVolunteerId !== null && project.assignedVolunteerId !== accountId) {
        return {
          ok: false,
          kind: 'seat-occupied',
          reason:
            `project ${projectId} refuses a second volunteer: its single developer seat is held by account ` +
            `${project.assignedVolunteerId}`,
        };
      }
      const assigned: ProjectRow = { ...project, assignedVolunteerId: accountId };
      state.projects.set(projectId, assigned);
      return { ok: true, project: clone(assigned) };
    },

    projectAssignment: async (projectId) => clone(state.projects.get(projectId) ?? null),

    account: async (accountId) => clone(state.accounts.get(accountId) ?? null),
    organization: async (organizationId) => clone(state.organizations.get(organizationId) ?? null),
    membership: async (organizationId, accountId) => clone(state.memberships.get(membershipKey(organizationId, accountId)) ?? null),
    acknowledgments: async (accountId) => clone(state.acknowledgments.filter((row) => row.accountId === accountId)),
    volunteerProfile: async (accountId) => clone(state.volunteerProfiles.get(accountId) ?? null),

    organizationsNamed: async (name) => clone([...state.organizations.values()].filter((row) => row.name === name.trim())),
    membershipsOf: async (accountId) => clone([...state.memberships.values()].filter((row) => row.accountId === accountId)),

    hasPlatformAcknowledgment: async (accountId) =>
      state.acknowledgments.some((row) => row.accountId === accountId && row.kind === PLATFORM_ACKNOWLEDGMENT_KIND),

    provisionPlatformAdmin: async (email, password) => {
      // POST /auth/v1/admin/users issues no session at all; this one is the fixture's own.
      const session = register(email, password, 'email', null, true);
      const accountType: AccountType = 'platform_admin';
      state.accounts.set(session.accountId, { id: session.accountId, accountType, lifecycle: 'active' });
      return session;
    },

    organizationAsViewer: () => {
      throw new CapabilityPending(['sut.accounts.tenantReadAsViewer']);
    },
    membershipsAsViewer: () => {
      throw new CapabilityPending(['sut.accounts.tenantReadAsViewer']);
    },
    projectAsViewer: () => {
      throw new CapabilityPending(['sut.accounts.tenantReadAsViewer']);
    },
    acknowledgmentsAsViewer: () => {
      throw new CapabilityPending(['sut.accounts.tenantReadAsViewer']);
    },
    organizationsAsViewer: () => {
      throw new CapabilityPending(['sut.accounts.tenantReadAsViewer']);
    },
    tenantTableFacts: () => {
      throw new CapabilityPending(['sut.accounts.tenantReadAsViewer']);
    },

    retypeAccountAsOperator: async (accountId, accountType) => {
      const account = state.accounts.get(accountId);
      if (!account) throw new Error(`no account ${accountId} to retype`);
      state.accounts.set(accountId, { ...account, accountType });
    },

    clearEmailConfirmationAsOperator: async (accountId) => {
      const user = state.authUsers.get(accountId);
      if (!user) throw new Error(`no auth user ${accountId} whose confirmation could be cleared`);
      user.emailConfirmedAt = null;
    },

    deactivateAccountAsOperator: async (accountId) => {
      const account = state.accounts.get(accountId);
      if (!account) throw new Error(`fixture: no account ${accountId} to deactivate`);
      if (account.lifecycle === 'deactivated') return;
      state.accounts.set(accountId, { ...account, lifecycle: 'deactivated' });
    },

    setMembershipRoleAsOperator: async (organizationId, accountId, role) => {
      const key = membershipKey(organizationId, accountId);
      const membership = state.memberships.get(key);
      if (!membership) {
        throw new Error(`fixture: no membership for ${accountId} in ${organizationId} to change`);
      }
      if (membership.role === role) return;
      const next = { ...membership, role };
      state.memberships.set(key, next);
      recordRoleChange(membership, next, null);
    },

    transferOrganizationContact: async (session, request): Promise<TransferOutcome> => {
      const run = runWrite(CONTACT_TRANSFER, session, request, null);
      if (!run.ok) return run;
      const { p_organization_id: organizationId, p_from_account_id: from, p_to_account_id: to, p_reason: reason } = run.args;
      const seat = state.memberships.get(membershipKey(organizationId, from));
      if (!seat) throw new Error(`fixture: the decision admitted a transfer from ${from}, which holds no seat in ${organizationId}`);
      const moved: MembershipRow = { ...seat, accountId: to };
      state.memberships.delete(membershipKey(organizationId, from));
      state.memberships.set(membershipKey(organizationId, to), moved);
      recordRoleChange(seat, moved, run.caller.id);
      const remaining = [...state.memberships.values()]
        .filter((row) => row.accountId === from)
        .map((row) => row.organizationId)
        .sort();
      const deactivated = remaining.length === 0;
      if (deactivated) changeLifecycle(from, 'deactivated', run.caller.id, reason);
      appendAudit('org_contact_transferred', run.caller.id, from, organizationId, reason, {
        from_account_id: from,
        to_account_id: to,
        remaining_seats: remaining,
        deactivated,
      });
      return { ok: true, organizationId };
    },

    setEscalationContact: async (session, request): Promise<EscalationOutcome> => {
      const run = runWrite(ESCALATION_CONTACT, session, request, null);
      if (!run.ok) return run;
      const { p_organization_id: organizationId, p_name, p_email, p_phone } = run.args;
      const previous = state.escalationContacts.get(organizationId) ?? null;
      state.escalationContacts.set(organizationId, {
        organizationId,
        contactName: p_name,
        contactEmail: p_email,
        contactPhone: p_phone,
        recordedByAccountId: run.caller.id,
        recordedAt: new Date(clock.now()).toISOString(),
      });
      appendAudit('org_escalation_contact_recorded', run.caller.id, null, organizationId, 'escalation contact recorded', {
        previous:
          previous === null
            ? null
            : { name: previous.contactName, email: previous.contactEmail, phone: previous.contactPhone },
        current: { name: p_name, email: p_email, phone: p_phone },
      });
      return { ok: true, organizationId };
    },

    setAccountLifecycle: async (session, request): Promise<LifecycleOutcome> => {
      const run = runWrite(LIFECYCLE_CHANGE, session, request, null);
      if (!run.ok) return run;
      const changed = changeLifecycle(run.args.p_subject_account_id, run.args.p_lifecycle, run.caller.id, run.args.p_reason);
      return { ok: true, changed };
    },

    attemptWrite: async function (this: AccountsSut, subject, session): Promise<WriteAttemptOutcome> {
      const asAttempt = async (outcome: { ok: true } | WriteRefusal): Promise<WriteAttemptOutcome> =>
        outcome.ok ? { ok: true } : outcome;
      const attempts: Record<WriteRouteName, () => Promise<WriteAttemptOutcome>> = {
        'project-need': async () => {
          if (subject.route !== 'project-need') throw new Error('unreachable');
          const run = runWrite(
            { name: 'project-need', target: organizationIdField, decide: decideProjectNeed },
            session,
            { organizationId: subject.organizationId, action: subject.action, title: subject.title },
            null,
          );
          return run.ok ? { ok: true } : run;
        },
        'complete-signup': async () => {
          if (session === null) return { ok: false, kind: 'unauthenticated', status: 401, reason: DEAD_SESSION_REASON };
          if (subject.route !== 'complete-signup') throw new Error('unreachable');
          const completed = await completeSignup(
            session,
            {
              accountType: 'ngo',
              organizationName: subject.name,
              acknowledgmentTextVersion: 'tos-2026-01+promise-2026-01',
              signerName: 'Dana Okonkwo',
              signerTitle: 'Executive Director',
              authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
            },
            '203.0.113.7',
          );
          if (completed.ok) return { ok: true };
          if ('kind' in completed) return completed;
          return { ok: false, kind: 'refused', status: 409, reason: completed.reason };
        },
        'create-organization': async () => {
          if (subject.route !== 'create-organization') throw new Error('unreachable');
          if (session === null) return { ok: false, kind: 'unauthenticated', status: 401, reason: DEAD_SESSION_REASON };
          return asAttempt(await this.createOrganization(session, subject.name));
        },
        'update-organization': async () => {
          if (subject.route !== 'update-organization') throw new Error('unreachable');
          if (session === null) return { ok: false, kind: 'unauthenticated', status: 401, reason: DEAD_SESSION_REASON };
          return asAttempt(await this.updateOrganization(session, subject.organizationId, subject.name));
        },
        'set-organization-profile': async () => {
          if (subject.route !== 'set-organization-profile') throw new Error('unreachable');
          if (session === null) return { ok: false, kind: 'unauthenticated', status: 401, reason: DEAD_SESSION_REASON };
          const run = runWrite(
            ORGANIZATION_PROFILE,
            session,
            {
              organizationId: subject.organizationId,
              name: subject.name,
              mission: subject.mission,
              country: subject.country,
              website: subject.website,
              logo: subject.logo,
            },
            null,
          );
          if (!run.ok) return run;
          state.organizations.set(run.args.p_organization_id, {
            id: run.args.p_organization_id,
            name: run.args.p_name,
            mission: run.args.p_mission,
            country: run.args.p_country,
            website: run.args.p_website,
            logo: run.args.p_logo,
          });
          return { ok: true };
        },
        'transfer-organization-contact': async () => {
          if (subject.route !== 'transfer-organization-contact') throw new Error('unreachable');
          return asAttempt(await this.transferOrganizationContact(session, subject));
        },
        'set-escalation-contact': async () => {
          if (subject.route !== 'set-escalation-contact') throw new Error('unreachable');
          return asAttempt(await this.setEscalationContact(session, { ...subject, phone: null }));
        },
        'set-account-lifecycle': async () => {
          if (subject.route !== 'set-account-lifecycle') throw new Error('unreachable');
          return asAttempt(await this.setAccountLifecycle(session, subject));
        },
        'set-organization-vetting': async () => {
          if (subject.route !== 'set-organization-vetting') throw new Error('unreachable');
          const run = runWrite(
            ORGANIZATION_VETTING,
            session,
            {
              organizationId: subject.organizationId,
              action: subject.action,
              organizationName: subject.organizationName,
              publicReferenceUrl: subject.publicReferenceUrl,
              contactName: subject.contactName,
              contactTitle: subject.contactTitle,
              authorityAttestation: subject.authorityAttestation,
              evidenceType: subject.evidenceType,
              note: subject.note,
            },
            null,
          );
          if (!run.ok) return run;
          return { ok: true };
        },
        'set-organization-discovery': async () => {
          if (subject.route !== 'set-organization-discovery') throw new Error('unreachable');
          const run = runWrite(
            ORGANIZATION_DISCOVERY,
            session,
            { organizationId: subject.organizationId, enabled: subject.enabled, reason: subject.reason },
            null,
          );
          if (!run.ok) return run;
          return { ok: true };
        },
        'discovery-allowance': async () => {
          if (subject.route !== 'discovery-allowance') throw new Error('unreachable');
          const body: Record<string, unknown> = { organizationId: subject.organizationId, action: subject.action };
          if (subject.action === 'debit') body.credits = subject.credits;
          const run = runWrite(DISCOVERY_ALLOWANCE, session, body, null);
          if (!run.ok) return run;
          return { ok: true };
        },
        'discovery-message': async () => {
          if (subject.route !== 'discovery-message') throw new Error('unreachable');
          if (session === null) return { ok: false, kind: 'unauthenticated', status: 401, reason: DEAD_SESSION_REASON };
          return asAttempt(await this.sendDiscoveryMessage(session, subject.message));
        },
        'discovery-scope': async () => {
          if (subject.route !== 'discovery-scope') throw new Error('unreachable');
          const run = runWrite(
            DISCOVERY_SCOPE,
            session,
            { organizationId: subject.organizationId, projectId: subject.projectId, action: subject.action },
            null,
          );
          if (!run.ok) return run;
          return { ok: true };
        },
        'discovery-brief': async () => {
          if (subject.route !== 'discovery-brief') throw new Error('unreachable');
          const run = runWrite(
            DISCOVERY_BRIEF,
            session,
            {
              organizationId: subject.organizationId, projectId: subject.projectId, action: subject.action,
              sectionId: subject.sectionId, text: subject.text, baseRevision: subject.baseRevision,
            },
            null,
          );
          if (!run.ok) return run;
          return { ok: true };
        },
      };
      return attempts[subject.route]();
    },

    auditEvents: async (filter) =>
      clone(
        state.auditEvents.filter(
          (row) =>
            (filter.subjectOrgId === undefined || row.subjectOrgId === filter.subjectOrgId) &&
            (filter.subjectAccountId === undefined || row.subjectAccountId === filter.subjectAccountId),
        ),
      ),

    attemptAuditTamper: async (attempt): Promise<TamperOutcome> => ({
      ok: false,
      reason: `public.audit_events is append-only: ${attempt.toUpperCase()} is refused (REQ-001, AT-001.33)`,
    }),

    escalationContact: async (organizationId) => clone(state.escalationContacts.get(organizationId) ?? null),

    organizationDashboard: async (session, organizationId) => {
      if (session === null) return { ok: false, answer: deadSessionAnswer };
      const caller = resolveCaller(session);
      if (caller === null) return { ok: false, answer: deadSessionAnswer };
      return asTenantOutcome(await organizationDashboard(fixtureReads(), organizationId));
    },
    projectWorkspace: async (session, projectId) => {
      if (session === null) return { ok: false, answer: deadSessionAnswer };
      const caller = resolveCaller(session);
      if (caller === null) return { ok: false, answer: deadSessionAnswer };
      return asTenantOutcome(await projectWorkspace(fixtureReads(), projectId));
    },
    publicProjectPage: async (projectId): Promise<PublicProjectOutcome> => {
      const result = await publicProjectAnswer(projectId, {
        source: async (id) => {
          const project = state.projects.get(id);
          if (!project) return { ok: true, rows: [] };
          const organization = state.organizations.get(project.organizationId);
          if (!organization) return { ok: true, rows: [] };
          return {
            ok: true,
            rows: [{ project_id: project.id, project_name: project.name, organization_name: organization.name, need_stage: null }],
          };
        },
      });
      const answer = { status: result.status, body: JSON.stringify(result.body) };
      if (result.status !== 200) return { ok: false, answer };
      return {
        ok: true,
        page: {
          projectId: result.body.projectId,
          projectName: result.body.projectName,
          organizationName: result.body.organizationName,
        },
        answer,
      };
    },
  };

  return {
    sut: { accounts: sut },
    fixtures: {
      world: async (name: string) => {
        const base = await worlds.world(name);
        const world = new AccountsFixtureWorld(base, ++worldSerial);
        openedWorlds.add(world);
        return world;
      },
    },
    teardown: async () => {
      await Promise.all([...openedWorlds].map((world) => world.teardown()));
      openedWorlds.clear();
      state.authUsers.clear();
      state.byEmail.clear();
      state.byVerificationLink.clear();
      state.byPasswordResetLink.clear();
      state.sessions.clear();
      state.accounts.clear();
      state.organizations.clear();
      state.memberships.clear();
      state.projects.clear();
      state.acknowledgments.length = 0;
      state.volunteerProfiles.clear();
      state.discoveryMessages.clear();
      state.auditEvents.length = 0;
      state.escalationContacts.clear();
      state.nextId = 1;
    },
  };
}
