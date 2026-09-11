/**
 * REQ-002's fixture adapter — the loop tier's binding of the organisation system under test.
 *
 * Members this unit lands run the shipped decisions over in-memory storage. Provisioning reuses
 * the auth suite's factory so an NGO is what signup leaves. What a loop-tier green means: the
 * shipped vetting decision and the aggregate shape are right. What it does not mean: that any
 * migration, policy or deployed function behaves. That is the integration tier's claim, in
 * `_live.ts`.
 */

import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';
import type { Caller } from '../../../../supabase/functions/_shared/caller.ts';
import { EMITTER_COMPONENT } from '../../../../supabase/functions/_shared/notifications.ts';
import { channelsFor, taxonomyRow, type Channel } from '../../../../supabase/functions/_shared/notification-taxonomy.ts';
import {
  allowanceOf,
  dailyAllowanceExhaustedReason,
  dailyGrantFor,
  debitExceedsRemainingReason,
  decideDiscoveryAllowance,
  discoveryTier,
  highWaterGrant,
  remainingCredits,
  utcDayOf,
  type DiscoveryAllowanceArgs,
  type SpendRow,
} from '../../../../supabase/functions/_shared/discovery-allowance.ts';
import {
  decideOrganizationProfile,
  type OrganizationProfileArgs,
} from '../../../../supabase/functions/_shared/memberships.ts';
import {
  decideOrganizationVetting,
  isVettingEvidenceType,
  type OrganizationVettingArgs,
  publishingAllowed as decidePublishing,
  type VettingOutcomeNotice,
  type VettingRecordProjection,
} from '../../../../supabase/functions/_shared/org-vetting.ts';
import { discoveryMessageAllowed as decideDiscoveryMessage } from '../../../../supabase/functions/_shared/verification.ts';
import {
  organizationIdField,
  parseWriteStanding,
  writePipeline,
  type AccountWriteRouteInput,
  type WriteRouteSpec,
} from '../../../../supabase/functions/_shared/write-routes.ts';
import type { ControlledClock } from '../../harness/clock.ts';
import type { FixtureWorldStore } from '../../harness/fixtures.ts';
import { createFixtureAdapter as createAccountsFixtureAdapter } from '../req-001/_fixture.ts';
import type { Session as AccountsSession } from '../req-001/_contract.ts';
import type {
  AllowanceOutcome,
  ConfigRegistry,
  DeliveryRow,
  NgoActor,
  OperatorWriteOutcome,
  OrganizationsSut,
  ProfileDefinerAttempt,
  ProfileDefinerOutcome,
  RegistrationDocumentMetadata,
  Session,
  VettingAuditRow,
  VettingDefinerAttempt,
  VettingNotificationEvent,
  VettingOutcome,
  VettingRecord,
  VettingRequest,
  WriteRefusal,
} from './_contract.ts';

export const requirement = 'req-002' as const;

interface AdapterOptions {
  clock: ControlledClock;
  worlds: FixtureWorldStore;
  config: ConfigRegistry;
}

const PASSWORD = 'correct horse battery staple';
const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const CLIENT_IP = '203.0.113.7';
const SIGNER = {
  signerName: 'Dana Okonkwo',
  signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
} as const;
const DEAD_SESSION_REASON = 'this session is no longer valid — sign in again';
const PUBLIC_REFERENCE_URL = /^https?:\/\/[^\s]+$/;
const HAS_NON_SPACE = /\S/;

const ORGANIZATION_VETTING: WriteRouteSpec<OrganizationVettingArgs, AccountWriteRouteInput> = {
  name: 'set-organization-vetting',
  target: organizationIdField,
  decide: decideOrganizationVetting,
};

const ORGANIZATION_PROFILE: WriteRouteSpec<OrganizationProfileArgs, AccountWriteRouteInput> = {
  name: 'set-organization-profile',
  target: organizationIdField,
  decide: decideOrganizationProfile,
};

const DISCOVERY_ALLOWANCE: WriteRouteSpec<DiscoveryAllowanceArgs, AccountWriteRouteInput> = {
  name: 'discovery-allowance',
  target: organizationIdField,
  decide: decideDiscoveryAllowance,
};

const NOT_NULL_COLUMNS: ReadonlyArray<{
  key: keyof Omit<VettingRecord, 'registration'>;
  column: string;
}> = [
  { key: 'organizationId', column: 'org_id' },
  { key: 'vetted', column: 'vetted' },
  { key: 'vettedByAccountId', column: 'vetted_by_account_id' },
  { key: 'vettedAt', column: 'vetted_at' },
  { key: 'organizationName', column: 'organization_name' },
  { key: 'publicReferenceUrl', column: 'public_reference_url' },
  { key: 'contactName', column: 'contact_name' },
  { key: 'contactTitle', column: 'contact_title' },
  { key: 'authorityAttestation', column: 'authority_attestation' },
  { key: 'evidenceType', column: 'evidence_type' },
  { key: 'note', column: 'note' },
];

function notLanded(member: keyof OrganizationsSut): () => Promise<never> {
  return async () => {
    throw new Error(`REQ-002 loop adapter: sut.organizations.${member} has not landed`);
  };
}

function asSession(session: AccountsSession): Session {
  return { accountId: session.accountId, email: session.email, sessionId: session.sessionId };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function unauthenticated(): WriteRefusal {
  return { ok: false, kind: 'unauthenticated', status: 401, reason: DEAD_SESSION_REASON };
}

function checkViolation(name: string): OperatorWriteOutcome {
  return { ok: false, reason: `new row for relation "org_vetting" violates check constraint "${name}"` };
}

function operatorRowRefused(
  row: { [K in keyof Omit<VettingRecord, 'registration'>]: VettingRecord[K] | null } & Partial<RegistrationDocumentMetadata>,
): OperatorWriteOutcome | null {
  for (const { key, column } of NOT_NULL_COLUMNS) {
    if (row[key] === null || row[key] === undefined) {
      return {
        ok: false,
        reason: `null value in column "${column}" of relation "org_vetting" violates not-null constraint`,
      };
    }
  }
  if (!HAS_NON_SPACE.test(row.organizationName as string)) return checkViolation('org_vetting_name_populated');
  if (!PUBLIC_REFERENCE_URL.test(row.publicReferenceUrl as string)) return checkViolation('org_vetting_reference_url');
  if (!HAS_NON_SPACE.test(row.contactName as string)) return checkViolation('org_vetting_contact_name_populated');
  if (!HAS_NON_SPACE.test(row.contactTitle as string)) return checkViolation('org_vetting_contact_title_populated');
  if (!HAS_NON_SPACE.test(row.authorityAttestation as string)) return checkViolation('org_vetting_attestation_populated');
  if (!isVettingEvidenceType(row.evidenceType as string)) return checkViolation('org_vetting_evidence_type');
  if (!HAS_NON_SPACE.test(row.note as string)) return checkViolation('org_vetting_note_populated');

  const emailed = row.evidenceType === 'emailed_registration_documents';
  const received = row.registrationReceivedAt ?? null;
  const count = row.registrationDocumentCount ?? null;
  const deleted = row.registrationCopiesDeleted ?? null;
  const metadataOk = emailed
    ? received !== null && count !== null && count > 0 && deleted === true
    : received === null && count === null && deleted === null;
  if (!metadataOk) return checkViolation('org_vetting_registration_metadata');
  return null;
}

type Seat = { accountId: string; email: string | null };

type CommitResult =
  | { ok: true; organizationId: string; vetted: boolean; changed: boolean; notificationEventId: string | null }
  | { ok: false; reason: string };

const VETTING_TAXONOMY = taxonomyRow('vetting.outcome');
if (VETTING_TAXONOMY === undefined) {
  throw new Error('vetting.outcome is missing from the notification taxonomy');
}
const VETTING_CLASS_DEFAULT = channelsFor(VETTING_TAXONOMY);

function sameChannelSet(got: readonly string[], want: readonly string[]): boolean {
  const left = [...new Set(got)].sort();
  const right = [...new Set(want)].sort();
  return left.length === right.length && left.every((channel, index) => channel === right[index]);
}

function emptyProfileField(value: string, field: string): ProfileDefinerOutcome | null {
  if (value.trim() !== '') return null;
  if (field === 'name') {
    return { ok: false, kind: 'invalid-name', reason: 'set_organization_profile refuses an empty organisation name' };
  }
  return { ok: false, kind: 'invalid-request', reason: `set_organization_profile refuses an empty organisation ${field}` };
}

async function profileDefinerAsOperator(
  accounts: ReturnType<typeof createAccountsFixtureAdapter>['sut']['accounts'],
  heldSessions: Map<string, AccountsSession>,
  roleOverrides: Map<string, 'admin' | 'member'>,
  input: ProfileDefinerAttempt,
): Promise<ProfileDefinerOutcome> {
  const request = input.request;
  const empty =
    emptyProfileField(request.name, 'name') ??
    emptyProfileField(request.mission, 'mission') ??
    emptyProfileField(request.country, 'country') ??
    emptyProfileField(request.website, 'website') ??
    emptyProfileField(request.logo, 'logo');
  if (empty) return empty;

  const organization = await accounts.organization(request.organizationId);
  if (organization === null) {
    return {
      ok: false,
      kind: 'no-such-organisation',
      reason: `set_organization_profile refuses ${request.organizationId}: no such organisation`,
    };
  }

  const override = roleOverrides.get(`${request.organizationId}:${input.accountId}`);
  const membership = override === undefined ? await accounts.membership(request.organizationId, input.accountId) : { role: override };
  if (membership === null) {
    return {
      ok: false,
      kind: 'not-a-member',
      reason:
        `set_organization_profile refuses ${input.accountId}: the caller holds no membership in organisation ` +
        `${request.organizationId} — membership is held per organisation`,
    };
  }
  if (membership.role !== 'admin') {
    return {
      ok: false,
      kind: 'not-an-admin',
      reason:
        `set_organization_profile refuses ${input.accountId}: the caller holds the ${membership.role} role in organisation ` +
        `${request.organizationId} — the admin role is held per organisation`,
    };
  }

  const innerSession = [...heldSessions.values()].find((row) => row.accountId === input.accountId) ?? null;
  if (innerSession === null) {
    throw new Error(`REQ-002 loop adapter: no session for ${input.accountId} to persist a profile definer write`);
  }
  const result = await accounts.attemptWrite(
    {
      route: 'set-organization-profile',
      organizationId: request.organizationId,
      name: request.name,
      mission: request.mission,
      country: request.country,
      website: request.website,
      logo: request.logo,
    },
    innerSession,
  );
  if (!result.ok) {
    return { ok: false, kind: result.kind === 'unauthenticated' ? 'refused' : result.kind, reason: result.reason };
  }
  return { ok: true, organizationId: request.organizationId };
}

function argsFromDefinerAttempt(input: VettingDefinerAttempt): OrganizationVettingArgs {
  const notice = input.notice as VettingOutcomeNotice;
  if (input.request.action === 'unvet') {
    return {
      p_account_id: input.accountId,
      p_organization_id: input.request.organizationId,
      p_action: 'unvet',
      p_notice: notice,
      p_organization_name: null,
      p_public_reference_url: null,
      p_contact_name: null,
      p_contact_title: null,
      p_authority_attestation: null,
      p_evidence_type: null,
      p_note: input.request.note,
      p_registration_received_at: null,
      p_registration_document_count: null,
      p_registration_copies_deleted: null,
    };
  }
  return {
    p_account_id: input.accountId,
    p_organization_id: input.request.organizationId,
    p_action: 'vet',
    p_notice: notice,
    p_organization_name: input.request.organizationName,
    p_public_reference_url: input.request.publicReferenceUrl,
    p_contact_name: input.request.contactName,
    p_contact_title: input.request.contactTitle,
    p_authority_attestation: input.request.authorityAttestation,
    p_evidence_type: input.request.evidenceType,
    p_note: input.request.note,
    p_registration_received_at: input.request.registrationReceivedAt ?? null,
    p_registration_document_count: input.request.registrationDocumentCount ?? null,
    p_registration_copies_deleted: input.request.registrationCopiesDeleted ?? null,
  };
}

function recordFromArgs(
  args: OrganizationVettingArgs,
  callerId: string,
  vettedAt: string,
  existing: VettingRecord | null,
): VettingRecordProjection {
  if (args.p_action === 'unvet') {
    if (existing === null) {
      throw new Error('fixture: unvet of a missing aggregate is a no-op and must not write a record');
    }
    return { ...existing, vetted: false };
  }
  return {
    organizationId: args.p_organization_id,
    vetted: true,
    vettedByAccountId: callerId,
    vettedAt,
    organizationName: args.p_organization_name ?? '',
    publicReferenceUrl: args.p_public_reference_url ?? '',
    contactName: args.p_contact_name ?? '',
    contactTitle: args.p_contact_title ?? '',
    authorityAttestation: args.p_authority_attestation ?? '',
    evidenceType: args.p_evidence_type ?? '',
    note: args.p_note,
    registration:
      args.p_evidence_type === 'emailed_registration_documents' &&
      args.p_registration_received_at !== null &&
      args.p_registration_document_count !== null &&
      args.p_registration_copies_deleted === true
        ? {
            registrationReceivedAt: args.p_registration_received_at,
            registrationDocumentCount: args.p_registration_document_count,
            registrationCopiesDeleted: true,
          }
        : null,
  };
}

export function createFixtureAdapter({ clock, worlds }: AdapterOptions) {
  const inner = createAccountsFixtureAdapter({ clock, worlds });
  const accounts = inner.sut.accounts;
  const heldSessions = new Map<string, AccountsSession>();
  const vetting = new Map<string, VettingRecord>();
  const audits: VettingAuditRow[] = [];
  const events: VettingNotificationEvent[] = [];
  const deliveries: DeliveryRow[] = [];
  const seats = new Map<string, Seat[]>();
  const seatHolders = (organizationId: string): Seat[] => seats.get(organizationId) ?? [];
  const firstSeat = (organizationId: string): Seat | undefined => seatHolders(organizationId)[0];
  const deactivated = new Set<string>();
  const roleOverrides = new Map<string, 'admin' | 'member'>();
  const spend = new Map<string, SpendRow>();
  const emailVerified = new Map<string, boolean>();
  let auditSerial = 1;

  const spendKey = (organizationId: string, utcDay: string): string => `${organizationId}:${utcDay}`;

  const applyGrantMark = (organizationId: string, vetted: boolean, utcDay: string): SpendRow => {
    const key = spendKey(organizationId, utcDay);
    const grant = dailyGrantFor(discoveryTier(vetted));
    const existing = spend.get(key);
    if (existing === undefined) {
      const row: SpendRow = { organizationId, utcDay, spent: 0, granted: grant };
      spend.set(key, row);
      return row;
    }
    if (grant > existing.granted) {
      const raised: SpendRow = { ...existing, granted: grant };
      spend.set(key, raised);
      return raised;
    }
    return existing;
  };

  const membershipKey = (organizationId: string, accountId: string): string => `${organizationId}:${accountId}`;

  const remember = (session: AccountsSession): Session => {
    heldSessions.set(session.sessionId, session);
    return asSession(session);
  };

  const deadSession = async (session: Session | null): Promise<WriteRefusal | Caller> => {
    if (session === null) return unauthenticated();
    const innerSession = heldSessions.get(session.sessionId);
    if (!innerSession) return unauthenticated();
    if (!(await accounts.authUserIsHealthy(innerSession))) return unauthenticated();
    return { id: innerSession.accountId, githubHandle: null };
  };

  const commitVetting = async (args: OrganizationVettingArgs, actorLabel: string): Promise<CommitResult> => {
    const organization = await accounts.organization(args.p_organization_id);
    if (organization === null) {
      return {
        ok: false,
        reason: `set_organization_vetting refuses ${args.p_organization_id}: no such organisation`,
      };
    }

    const holders = seatHolders(args.p_organization_id);
    if (holders.length === 0) {
      return {
        ok: false,
        reason: `set_organization_vetting refuses ${args.p_organization_id}: the organisation has no seat holder`,
      };
    }
    if (holders.length > 1) {
      return {
        ok: false,
        reason: `set_organization_vetting refuses ${args.p_organization_id}: the organisation has more than one seat holder`,
      };
    }
    const seat = holders[0];
    if (seat === undefined) {
      return {
        ok: false,
        reason: `set_organization_vetting refuses ${args.p_organization_id}: the organisation has no seat holder`,
      };
    }
    if (seat.email === null || seat.email.trim() === '') {
      return {
        ok: false,
        reason: `set_organization_vetting refuses ${seat.accountId}: the seat holder has no email address`,
      };
    }

    const existing = vetting.get(args.p_organization_id) ?? null;
    if (args.p_action === 'unvet' && (existing === null || !existing.vetted)) {
      return {
        ok: true,
        organizationId: args.p_organization_id,
        vetted: false,
        changed: false,
        notificationEventId: null,
      };
    }

    const notice = args.p_notice;
    const suppliedChannels = Array.isArray(notice?.channels) ? [...notice.channels] : [];
    const subject = notice?.copy?.subject;
    const body = notice?.copy?.body;
    if (suppliedChannels.length === 0) {
      return { ok: false, reason: 'set_organization_vetting refuses a notice with no delivery channels' };
    }
    if (typeof subject !== 'string' || typeof body !== 'string') {
      return { ok: false, reason: 'set_organization_vetting refuses a notice with no copy' };
    }
    if (!sameChannelSet(suppliedChannels, VETTING_CLASS_DEFAULT)) {
      return { ok: false, reason: 'set_organization_vetting refuses a notice whose channels are not the class default' };
    }
    const channels = [...VETTING_CLASS_DEFAULT];

    const utcDay = utcDayOf(clock.now());
    const vettedAt =
      args.p_action === 'vet' ? new Date(clock.now()).toISOString() : (existing?.vettedAt ?? new Date(clock.now()).toISOString());
    const record = recordFromArgs(args, args.p_account_id, vettedAt, existing);
    vetting.set(record.organizationId, record);
    // The mark takes the HIGHER of the tier before this action and the tier after it. An unvet on a
    // day with no row yet would otherwise write the unverified grant and take away credits the
    // organisation already held today, which the founder's ruling of 2026-09-09 forbids.
    applyGrantMark(record.organizationId, (existing?.vetted ?? false) || record.vetted, utcDay);
    const audit: VettingAuditRow = {
      id: `vet-audit-${auditSerial++}`,
      occurredAt: new Date(clock.now()).toISOString(),
      actorAccountId: args.p_account_id,
      actorLabel,
      subjectOrgId: record.organizationId,
      reason: args.p_note,
      detail: {
        action: args.p_action,
        previousVetted: existing?.vetted === true,
        current: clone(record),
      },
    };
    audits.push(audit);

    const outcome = record.vetted ? 'vetted' : 'unvetted';
    const payload = {
      outcome,
      organizationId: args.p_organization_id,
      organizationName: organization.name,
    };
    const eventId = crypto.randomUUID();
    events.push({
      id: eventId,
      type: 'vetting.outcome',
      actorAccountId: args.p_account_id,
      payload,
      recipients: [{ role: 'ngo', recipientId: seat.accountId, channels: channels as Channel[] }],
      state: 'pending',
      attempts: 0,
    });
    for (const channel of channels) {
      deliveries.push({
        eventId,
        type: 'vetting.outcome',
        role: 'ngo',
        recipientId: seat.accountId,
        channel: channel as Channel,
        state: 'pending',
        emittedBy: EMITTER_COMPONENT,
        deliveredByProcess: null,
        payload,
        body,
      });
    }

    return {
      ok: true,
      organizationId: record.organizationId,
      vetted: record.vetted,
      changed: true,
      notificationEventId: eventId,
    };
  };

  const setVetting = async (
    session: Session | null,
    request: VettingRequest & Record<string, unknown>,
  ): Promise<VettingOutcome> => {
    const callerOrRefusal = await deadSession(session);
    if ('ok' in callerOrRefusal) return callerOrRefusal;
    const caller = callerOrRefusal;
    const account = await accounts.account(caller.id);
    const target = organizationIdField(request);
    const organization = target === null ? null : await accounts.organization(target);
    const standing = parseWriteStanding({
      account:
        account === null
          ? null
          : {
              account_type: account.accountType,
              lifecycle: deactivated.has(caller.id) ? 'deactivated' : account.lifecycle,
            },
      org_exists: organization !== null,
      org_role: null,
      org_seat_account_id: firstSeat(target ?? '')?.accountId ?? null,
      subject: null,
    });
    const decision = writePipeline(ORGANIZATION_VETTING, {
      caller,
      standing,
      body: request,
      target,
      subject: null,
      ip: null,
    });
    if (!decision.ok) return { ok: false, kind: decision.kind, status: decision.status, reason: decision.reason };

    const committed = await commitVetting(decision.args, `${account?.accountType ?? 'operator'}:${caller.id}`);
    if (!committed.ok) {
      return { ok: false, kind: 'refused', status: 409, reason: committed.reason };
    }
    return committed;
  };

  const sut: OrganizationsSut = {
    provisionNgo: async (email, opts): Promise<NgoActor> => {
      const registered = await accounts.registerWithEmailPassword(email, PASSWORD);
      if (opts.emailVerified) {
        const link = await accounts.emailedVerificationLink(email);
        if (link === null) throw new Error(`REQ-002 loop adapter: no verification link for ${email}`);
        await accounts.useVerificationLink(link);
      }
      const completion = await accounts.completeSignup(
        registered,
        { accountType: 'ngo', organizationName: `Riverside ${email}`, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      if (!completion.ok || completion.organizationId === null) {
        throw new Error(`REQ-002 loop adapter: NGO completion for ${email} was refused`);
      }
      seats.set(completion.organizationId, [{ accountId: registered.accountId, email }]);
      emailVerified.set(registered.accountId, opts.emailVerified);
      return {
        session: remember(registered),
        accountId: registered.accountId,
        organizationId: completion.organizationId,
        email,
      };
    },
    provisionVolunteer: async (email): Promise<Session> => {
      const registered = await accounts.registerWithEmailPassword(email, PASSWORD);
      const link = await accounts.emailedVerificationLink(email);
      if (link === null) throw new Error(`REQ-002 loop adapter: no verification link for ${email}`);
      await accounts.useVerificationLink(link);
      await accounts.linkGithubIdentity(registered, email.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 30));
      const completion = await accounts.completeSignup(
        registered,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      if (!completion.ok) {
        throw new Error(`REQ-002 loop adapter: volunteer completion for ${email} was refused`);
      }
      return remember(registered);
    },
    provisionPlatformAdmin: async (email): Promise<Session> => remember(await accounts.provisionPlatformAdmin(email, PASSWORD)),
    deactivateAccountAsOperator: async (accountId) => {
      const account = await accounts.account(accountId);
      if (account === null) throw new Error(`REQ-002 loop adapter: no account ${accountId} to deactivate`);
      deactivated.add(accountId);
    },

    setProfile: async (session, request) => {
      const callerOrRefusal = await deadSession(session);
      if ('ok' in callerOrRefusal) return callerOrRefusal;
      const innerSession = session === null ? null : (heldSessions.get(session.sessionId) ?? null);
      if (innerSession === null) return unauthenticated();
      const override = roleOverrides.get(membershipKey(request.organizationId, innerSession.accountId));
      if (override !== undefined) {
        const caller = callerOrRefusal;
        const account = await accounts.account(caller.id);
        const organization = await accounts.organization(request.organizationId);
        const standing = parseWriteStanding({
          account:
            account === null
              ? null
              : {
                  account_type: account.accountType,
                  lifecycle: deactivated.has(caller.id) ? 'deactivated' : account.lifecycle,
                },
          org_exists: organization !== null,
          org_role: override,
          org_seat_account_id: null,
          subject: null,
        });
        const decision = writePipeline(ORGANIZATION_PROFILE, {
          caller,
          standing,
          body: request,
          target: request.organizationId,
          subject: null,
          ip: null,
        });
        if (!decision.ok) return { ok: false, kind: decision.kind, status: decision.status, reason: decision.reason };
      }
      const result = await inner.sut.accounts.attemptWrite(
        {
          route: 'set-organization-profile',
          organizationId: request.organizationId,
          name: request.name,
          mission: request.mission,
          country: request.country,
          website: request.website,
          logo: request.logo,
        },
        innerSession,
      );
      if (!result.ok) return result;
      return { ok: true, organizationId: request.organizationId };
    },
    profile: async (organizationId) => {
      const row = await inner.sut.accounts.organization(organizationId);
      if (row === null) return null;
      return {
        id: row.id,
        name: row.name,
        mission: row.mission,
        country: row.country,
        website: row.website,
        logo: row.logo,
      };
    },
    organizationDashboard: (session, organizationId) => {
      const innerSession = session === null ? null : (heldSessions.get(session.sessionId) ?? null);
      return inner.sut.accounts.organizationDashboard(innerSession, organizationId);
    },
    attemptProfileDefinerAsOperator: async (input: ProfileDefinerAttempt): Promise<ProfileDefinerOutcome> =>
      profileDefinerAsOperator(accounts, heldSessions, roleOverrides, input),
    setMembershipRoleAsOperator: async (organizationId, accountId, role) => {
      const membership = await accounts.membership(organizationId, accountId);
      if (membership === null) {
        throw new Error(`REQ-002 loop adapter: no membership for ${accountId} in ${organizationId} to change`);
      }
      roleOverrides.set(membershipKey(organizationId, accountId), role);
    },

    setVetting,
    vettingRecord: async (organizationId) => clone(vetting.get(organizationId) ?? null),
    attemptVettingRowAsOperator: async (row) => {
      const refused = operatorRowRefused(row);
      if (refused) return refused;
      const organizationId = row.organizationId as string;
      const record: VettingRecord = {
        organizationId,
        vetted: row.vetted as boolean,
        vettedByAccountId: row.vettedByAccountId as string,
        vettedAt: row.vettedAt as string,
        organizationName: row.organizationName as string,
        publicReferenceUrl: row.publicReferenceUrl as string,
        contactName: row.contactName as string,
        contactTitle: row.contactTitle as string,
        authorityAttestation: row.authorityAttestation as string,
        evidenceType: row.evidenceType as string,
        note: row.note as string,
        registration:
          row.evidenceType === 'emailed_registration_documents'
            ? {
                registrationReceivedAt: row.registrationReceivedAt as string,
                registrationDocumentCount: row.registrationDocumentCount as number,
                registrationCopiesDeleted: row.registrationCopiesDeleted as boolean,
              }
            : null,
      };
      vetting.set(organizationId, record);
      return { ok: true };
    },
    vettingAuditEvents: async (organizationId) => clone(audits.filter((row) => row.subjectOrgId === organizationId)),
    removeOrganizationSeatAsOperator: async (organizationId) => {
      seats.delete(organizationId);
    },
    addOrganizationSeatAsOperator: async (organizationId, accountId) => {
      let email: string | null = null;
      for (const holders of seats.values()) {
        const found = holders.find((holder) => holder.accountId === accountId);
        if (found !== undefined) {
          email = found.email;
          break;
        }
      }
      seats.set(organizationId, [...seatHolders(organizationId), { accountId, email }]);
    },
    clearAccountEmailAsOperator: async (accountId) => {
      for (const [organizationId, holders] of seats) {
        seats.set(
          organizationId,
          holders.map((holder) => (holder.accountId === accountId ? { accountId, email: null } : holder)),
        );
      }
    },
    attemptVettingDefinerAsOperator: async (input) => {
      const account = await accounts.account(input.accountId);
      const committed = await commitVetting(
        argsFromDefinerAttempt(input),
        account === null ? `operator:${input.accountId}` : `${account.accountType}:${input.accountId}`,
      );
      if (!committed.ok) return { ok: false, reason: committed.reason };
      return { ok: true };
    },

    notificationEvents: async (filter) =>
      clone(
        events.filter((row) => {
          if (filter.event !== undefined && row.type !== filter.event) return false;
          if (filter.recipientId !== undefined && !row.recipients.some((recipient) => recipient.recipientId === filter.recipientId)) {
            return false;
          }
          return true;
        }),
      ),
    notificationDeliveries: async (filter) =>
      clone(
        deliveries.filter((row) => {
          if (filter.eventId !== undefined && row.eventId !== filter.eventId) return false;
          if (filter.recipientId !== undefined && row.recipientId !== filter.recipientId) return false;
          return true;
        }),
      ),

    readAllowance: async (session, organizationId): Promise<AllowanceOutcome> => {
      const callerOrRefusal = await deadSession(session);
      if ('ok' in callerOrRefusal) return callerOrRefusal;
      const caller = callerOrRefusal;
      const account = await accounts.account(caller.id);
      const organization = await accounts.organization(organizationId);
      const membership = await accounts.membership(organizationId, caller.id);
      const override = roleOverrides.get(membershipKey(organizationId, caller.id));
      const standing = parseWriteStanding({
        account:
          account === null
            ? null
            : {
                account_type: account.accountType,
                lifecycle: deactivated.has(caller.id) ? 'deactivated' : account.lifecycle,
              },
        org_exists: organization !== null,
        org_role: override ?? membership?.role ?? null,
        org_seat_account_id: firstSeat(organizationId)?.accountId ?? null,
        subject: null,
      });
      const decision = writePipeline(DISCOVERY_ALLOWANCE, {
        caller,
        standing,
        body: { organizationId, action: 'read' },
        target: organizationId,
        subject: null,
        ip: null,
      });
      if (!decision.ok) return { ok: false, kind: decision.kind, status: decision.status, reason: decision.reason };

      const utcDay = utcDayOf(clock.now());
      const vetted = vetting.get(organizationId)?.vetted === true;
      const existing = spend.get(spendKey(organizationId, utcDay));
      const granted = highWaterGrant(existing?.granted ?? null, discoveryTier(vetted));
      const spentToday = existing?.spent ?? 0;
      return {
        ok: true,
        allowance: allowanceOf({ organizationId, utcDay, vetted, granted, spent: spentToday }),
      };
    },
    debitAllowance: async (session, organizationId, credits): Promise<AllowanceOutcome> => {
      const callerOrRefusal = await deadSession(session);
      if ('ok' in callerOrRefusal) return callerOrRefusal;
      const caller = callerOrRefusal;
      const account = await accounts.account(caller.id);
      const organization = await accounts.organization(organizationId);
      const membership = await accounts.membership(organizationId, caller.id);
      const override = roleOverrides.get(membershipKey(organizationId, caller.id));
      const standing = parseWriteStanding({
        account:
          account === null
            ? null
            : {
                account_type: account.accountType,
                lifecycle: deactivated.has(caller.id) ? 'deactivated' : account.lifecycle,
              },
        org_exists: organization !== null,
        org_role: override ?? membership?.role ?? null,
        org_seat_account_id: firstSeat(organizationId)?.accountId ?? null,
        subject: null,
      });
      const decision = writePipeline(DISCOVERY_ALLOWANCE, {
        caller,
        standing,
        body: { organizationId, action: 'debit', credits },
        target: organizationId,
        subject: null,
        ip: null,
      });
      if (!decision.ok) return { ok: false, kind: decision.kind, status: decision.status, reason: decision.reason };

      if (emailVerified.get(caller.id) !== true) {
        return {
          ok: false,
          kind: 'email-unverified',
          status: 409,
          reason: `discovery_allowance refuses ${caller.id}: the caller's email address is not verified`,
        };
      }

      const utcDay = utcDayOf(clock.now());
      const vetted = vetting.get(organizationId)?.vetted === true;
      const existing = spend.get(spendKey(organizationId, utcDay));
      const granted = highWaterGrant(existing?.granted ?? null, discoveryTier(vetted));
      const spentToday = existing?.spent ?? 0;
      const remaining = remainingCredits(granted, spentToday);
      if (remaining <= 0) {
        return {
          ok: false,
          kind: 'daily-allowance-exhausted',
          status: 409,
          reason: dailyAllowanceExhaustedReason(organizationId, discoveryTier(vetted)),
        };
      }
      if (credits > remaining) {
        return {
          ok: false,
          kind: 'debit-exceeds-remaining',
          status: 409,
          reason: debitExceedsRemainingReason(organizationId, remaining),
        };
      }
      const row: SpendRow = { organizationId, utcDay, spent: spentToday + credits, granted };
      spend.set(spendKey(organizationId, utcDay), row);
      return {
        ok: true,
        allowance: allowanceOf({ organizationId, utcDay, vetted, granted, spent: row.spent }),
      };
    },
    spendRows: async (organizationId) =>
      clone(
        [...spend.values()]
          .filter((row) => row.organizationId === organizationId)
          .sort((left, right) => (left.utcDay < right.utcDay ? -1 : left.utcDay > right.utcDay ? 1 : 0)),
      ),
    writeSpendRowAsOperator: async (row) => {
      const today = utcDayOf(clock.now());
      if (row.utcDay !== today) spend.delete(spendKey(row.organizationId, today));
      spend.set(spendKey(row.organizationId, row.utcDay), clone(row));
    },

    publishingAllowed: async (organizationId) => decidePublishing(vetting.get(organizationId)?.vetted === true),
    fundingAllowed: notLanded('fundingAllowed'),
    discoveryMessageAllowed: async (session) => {
      const innerSession = heldSessions.get(session.sessionId);
      if (innerSession === undefined) {
        throw new Error(`REQ-002 loop adapter: no session ${session.sessionId} whose Discovery floor could be consulted`);
      }
      const emailVerified = await accounts.emailVerified(innerSession.accountId);
      return decideDiscoveryMessage({ emailVerified });
    },

    createProjectAsOperator: async (organizationId, name) => {
      const project = await inner.sut.accounts.createProjectAsOperator(organizationId, name);
      return { id: project.id };
    },
    publicProjectPage: (projectId) => inner.sut.accounts.publicProjectPage(projectId),
  };

  return {
    sut: { organizations: sut },
    fixtures: inner.fixtures,
    teardown: async () => {
      await inner.teardown();
      heldSessions.clear();
      vetting.clear();
      audits.length = 0;
      events.length = 0;
      deliveries.length = 0;
      seats.clear();
      deactivated.clear();
      roleOverrides.clear();
      spend.clear();
      emailVerified.clear();
    },
  };
}
