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
import {
  decideOrganizationVetting,
  isVettingEvidenceType,
  type OrganizationVettingArgs,
  type VettingRecordProjection,
} from '../../../../supabase/functions/_shared/org-vetting.ts';
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
  ConfigRegistry,
  NgoActor,
  NotificationEventRow,
  OperatorWriteOutcome,
  OrganizationsSut,
  RegistrationDocumentMetadata,
  Session,
  VettingAuditRow,
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
  const events: NotificationEventRow[] = [];
  const deactivated = new Set<string>();
  let auditSerial = 1;

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
      org_seat_account_id: null,
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

    const args = decision.args;
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

    const vettedAt = args.p_action === 'vet' ? new Date(clock.now()).toISOString() : (existing?.vettedAt ?? new Date(clock.now()).toISOString());
    const record = recordFromArgs(args, caller.id, vettedAt, existing);
    vetting.set(record.organizationId, record);
    audits.push({
      id: `vet-audit-${auditSerial++}`,
      occurredAt: new Date(clock.now()).toISOString(),
      actorAccountId: caller.id,
      actorLabel: `${account?.accountType ?? 'operator'}:${caller.id}`,
      subjectOrgId: record.organizationId,
      reason: args.p_note,
      detail: {
        action: args.p_action,
        previousVetted: existing?.vetted === true,
        current: clone(record),
      },
    });
    return {
      ok: true,
      organizationId: record.organizationId,
      vetted: record.vetted,
      changed: true,
      notificationEventId: null,
    };
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

    setProfile: notLanded('setProfile'),
    profile: notLanded('profile'),
    organizationDashboard: notLanded('organizationDashboard'),

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
    notificationDeliveries: notLanded('notificationDeliveries'),

    readAllowance: notLanded('readAllowance'),
    debitAllowance: notLanded('debitAllowance'),
    spendRows: notLanded('spendRows'),
    writeSpendRowAsOperator: notLanded('writeSpendRowAsOperator'),

    publishingAllowed: notLanded('publishingAllowed'),
    fundingAllowed: notLanded('fundingAllowed'),

    createProjectAsOperator: notLanded('createProjectAsOperator'),
    publicProjectPage: notLanded('publicProjectPage'),
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
      deactivated.clear();
    },
  };
}
