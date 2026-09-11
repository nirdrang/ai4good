/** The founder's manual vet and unvet: evidence tokens, request validation, RPC arguments and result projection. */

import type { Decision } from './accounts.ts';
import { renderCopy } from './notification-copy.ts';
import { channelsFor, taxonomyRow, type Channel, type TaxonomyRow } from './notification-taxonomy.ts';
import {
  booleanField,
  integerField,
  isRecord,
  refuseWrite,
  stringField,
  timestampField,
  type AccountWriteRouteInput,
  type WriteRouteDecision,
} from './write-routes.ts';

export const VETTING_EVIDENCE_TYPES = [
  'public_registry',
  'organization_website',
  'ein',
  'emailed_registration_documents',
] as const;

export type VettingEvidenceType = (typeof VETTING_EVIDENCE_TYPES)[number];

const VETTING_EVIDENCE_TYPE_SET: ReadonlySet<string> = new Set(VETTING_EVIDENCE_TYPES);

export const EMAILED_REGISTRATION_EVIDENCE = 'emailed_registration_documents' as const;

const PUBLIC_REFERENCE_URL = /^https?:\/\/[^\s]+$/;

const VET_BODY_KEYS = new Set([
  'organizationId',
  'action',
  'organizationName',
  'publicReferenceUrl',
  'contactName',
  'contactTitle',
  'authorityAttestation',
  'evidenceType',
  'note',
  'registrationReceivedAt',
  'registrationDocumentCount',
  'registrationCopiesDeleted',
]);

const UNVET_BODY_KEYS = new Set(['organizationId', 'action', 'note']);

const VETTING_OUTCOME_EVENT = 'vetting.outcome';

/**
 * Publishing is the ONE thing the vetted condition gates, and this function is the whole of that
 * rule. It lives here, and not in either test adapter, because a rule an adapter states is a rule
 * the suite grades against itself: AT-002.21 asserts that publishing refuses at the same moment
 * Discovery does not, and that assertion is worth nothing unless it reads the product's answer.
 *
 * NO PUBLISH ROUTE CONSULTS IT YET. AT-002.19 and AT-002.20 stay red for exactly that reason.
 */
export function publishingAllowed(vetted: boolean): Decision<'vetted'> {
  if (vetted === true) return { ok: true, value: 'vetted' };
  return {
    ok: false,
    reason: 'publishing needs a founder-vetted organisation — this organisation is not founder-vetted',
  };
}

/**
 * The tier argument is taken and ignored on purpose: both values give the same permit, and a
 * signature without it would hide that the rule is "whatever the tier".
 *
 * NO CHECKOUT CONSULTS IT YET. AT-002.31 stays red for exactly that reason.
 */
export function fundingAllowed(_vetted: boolean): Decision<'not-vetting-gated'> {
  return { ok: true, value: 'not-vetting-gated' };
}

/** Channels and copy the definer must not restate. Recipient and payload are resolved in SQL. */
export type VettingOutcomeNotice = {
  readonly channels: readonly Channel[];
  readonly copy: { readonly subject: string; readonly body: string };
};

export function vettingOutcomeNotice(
  outcome: 'vetted' | 'unvetted',
  row: TaxonomyRow | null = taxonomyRow(VETTING_OUTCOME_EVENT) ?? null,
): Decision<VettingOutcomeNotice> {
  if (row === null) {
    return { ok: false, reason: 'vetting.outcome is missing from the notification taxonomy' };
  }
  return {
    ok: true,
    value: {
      channels: channelsFor(row),
      copy: renderCopy(row, { outcome }),
    },
  };
}

export type OrganizationVettingArgs = {
  readonly p_account_id: string;
  readonly p_organization_id: string;
  readonly p_action: 'vet' | 'unvet';
  readonly p_notice: VettingOutcomeNotice;
  readonly p_organization_name: string | null;
  readonly p_public_reference_url: string | null;
  readonly p_contact_name: string | null;
  readonly p_contact_title: string | null;
  readonly p_authority_attestation: string | null;
  readonly p_evidence_type: string | null;
  readonly p_note: string;
  readonly p_registration_received_at: string | null;
  readonly p_registration_document_count: number | null;
  readonly p_registration_copies_deleted: boolean | null;
};

export type OrganizationVettingRender = {
  organizationId: string | null;
  vetted: boolean;
  changed: boolean;
  notificationEventId: string | null;
};

export type VettingRecordProjection = {
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
  registration: {
    registrationReceivedAt: string;
    registrationDocumentCount: number;
    registrationCopiesDeleted: boolean;
  } | null;
};

export type VettingSqlRow = {
  org_id: string;
  vetted: boolean;
  vetted_by_account_id: string;
  vetted_at: string | Date;
  organization_name: string;
  public_reference_url: string;
  contact_name: string;
  contact_title: string;
  authority_attestation: string;
  evidence_type: string;
  note: string;
  registration_received_at: string | Date | null;
  registration_document_count: number | null;
  registration_copies_deleted: boolean | null;
};

function unknownKeys(body: Record<string, unknown>, allowed: ReadonlySet<string>): string[] {
  return Object.keys(body).filter((key) => !allowed.has(key));
}

function isoInstant(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('org_vetting timestamp is not a valid instant');
  }
  return date.toISOString();
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value === '') {
    throw new Error(`org_vetting ${field} is missing`);
  }
  return value;
}

function registrationFromSql(row: VettingSqlRow): VettingRecordProjection['registration'] {
  if (row.evidence_type === EMAILED_REGISTRATION_EVIDENCE) {
    if (
      row.registration_received_at === null ||
      row.registration_document_count === null ||
      row.registration_document_count <= 0 ||
      row.registration_copies_deleted !== true
    ) {
      throw new Error('org_vetting emailed registration row is missing registration metadata');
    }
    return {
      registrationReceivedAt: isoInstant(row.registration_received_at),
      registrationDocumentCount: row.registration_document_count,
      registrationCopiesDeleted: true,
    };
  }
  if (
    row.registration_received_at !== null ||
    row.registration_document_count !== null ||
    row.registration_copies_deleted !== null
  ) {
    throw new Error('org_vetting row carries registration metadata on a non-emailed evidence type');
  }
  return null;
}

export function isVettingEvidenceType(raw: string): raw is VettingEvidenceType {
  return VETTING_EVIDENCE_TYPE_SET.has(raw);
}

export function vettingRecordFromSql(row: VettingSqlRow): VettingRecordProjection {
  return {
    organizationId: String(row.org_id),
    vetted: row.vetted,
    vettedByAccountId: String(row.vetted_by_account_id),
    vettedAt: isoInstant(row.vetted_at),
    organizationName: row.organization_name,
    publicReferenceUrl: row.public_reference_url,
    contactName: row.contact_name,
    contactTitle: row.contact_title,
    authorityAttestation: row.authority_attestation,
    evidenceType: row.evidence_type,
    note: row.note,
    registration: registrationFromSql(row),
  };
}

export function vettingAuditCurrentFromDetail(detail: unknown): VettingRecordProjection | null {
  if (!isRecord(detail) || !isRecord(detail.current)) return null;
  const current = detail.current;
  if (typeof current.vetted !== 'boolean') {
    throw new Error('org_vetting audit current is missing vetted');
  }
  const vettedAt = current.vetted_at;
  if (typeof vettedAt !== 'string' && !(vettedAt instanceof Date)) {
    throw new Error('org_vetting audit current is missing vetted_at');
  }
  let registrationReceivedAt: string | Date | null = null;
  if (current.registration_received_at !== null && current.registration_received_at !== undefined) {
    if (typeof current.registration_received_at !== 'string' && !(current.registration_received_at instanceof Date)) {
      throw new Error('org_vetting audit current carries a registration received-at that is not an instant');
    }
    registrationReceivedAt = current.registration_received_at;
  }
  const registrationDocumentCount =
    current.registration_document_count === null || current.registration_document_count === undefined
      ? null
      : integerField(current.registration_document_count);
  if (
    current.registration_document_count !== null &&
    current.registration_document_count !== undefined &&
    registrationDocumentCount === null
  ) {
    throw new Error('org_vetting audit current carries a registration document count that is not a whole number');
  }
  const registrationCopiesDeleted =
    current.registration_copies_deleted === null || current.registration_copies_deleted === undefined
      ? null
      : booleanField(current.registration_copies_deleted);
  if (
    current.registration_copies_deleted !== null &&
    current.registration_copies_deleted !== undefined &&
    registrationCopiesDeleted === null
  ) {
    throw new Error('org_vetting audit current carries a copies-deleted flag that is not a boolean');
  }
  return vettingRecordFromSql({
    org_id: requiredString(current.org_id, 'org_id'),
    vetted: current.vetted,
    vetted_by_account_id: requiredString(current.vetted_by_account_id, 'vetted_by_account_id'),
    vetted_at: vettedAt,
    organization_name: requiredString(current.organization_name, 'organization_name'),
    public_reference_url: requiredString(current.public_reference_url, 'public_reference_url'),
    contact_name: requiredString(current.contact_name, 'contact_name'),
    contact_title: requiredString(current.contact_title, 'contact_title'),
    authority_attestation: requiredString(current.authority_attestation, 'authority_attestation'),
    evidence_type: requiredString(current.evidence_type, 'evidence_type'),
    note: requiredString(current.note, 'note'),
    registration_received_at: registrationReceivedAt,
    registration_document_count: registrationDocumentCount,
    registration_copies_deleted: registrationCopiesDeleted,
  });
}

export function renderOrganizationVetting(value: unknown): OrganizationVettingRender {
  const row = isRecord(value) ? value : null;
  const organizationId = typeof row?.organization_id === 'string' ? row.organization_id : null;
  const notificationEventId = typeof row?.notification_event_id === 'string' ? row.notification_event_id : null;
  return {
    organizationId,
    vetted: row?.vetted === true,
    changed: row?.changed === true,
    notificationEventId,
  };
}

export function decideOrganizationVetting(input: AccountWriteRouteInput): WriteRouteDecision<OrganizationVettingArgs> {
  const organizationId = input.target;
  if (organizationId === null) {
    return refuseWrite('invalid-request', 400, 'the vetting action must name the organisation by id (organizationId)');
  }

  const action = stringField(input.body.action);
  if (action !== 'vet' && action !== 'unvet') {
    return refuseWrite('invalid-request', 400, 'the vetting action must be vet or unvet');
  }

  const allowed = action === 'vet' ? VET_BODY_KEYS : UNVET_BODY_KEYS;
  const extras = unknownKeys(input.body, allowed);
  if (extras.length > 0) {
    return refuseWrite(
      'invalid-request',
      400,
      `the vetting action does not accept ${extras.join(', ')} — actor, time and document content are not request fields`,
    );
  }

  const note = stringField(input.body.note);
  if (note === null) {
    return refuseWrite('invalid-request', 400, 'the vetting action must carry a note — the audit record is written with it');
  }

  if (!input.standing.orgExists) {
    return refuseWrite('no-such-organisation', 409, `no organisation ${organizationId} exists`);
  }

  if (action === 'unvet') {
    const notice = vettingOutcomeNotice('unvetted');
    if (!notice.ok) return refuseWrite('refused', 502, notice.reason);
    return {
      ok: true,
      args: {
        p_account_id: input.caller.id,
        p_organization_id: organizationId,
        p_action: 'unvet',
        p_notice: notice.value,
        p_organization_name: null,
        p_public_reference_url: null,
        p_contact_name: null,
        p_contact_title: null,
        p_authority_attestation: null,
        p_evidence_type: null,
        p_note: note,
        p_registration_received_at: null,
        p_registration_document_count: null,
        p_registration_copies_deleted: null,
      },
    };
  }

  const organizationName = stringField(input.body.organizationName);
  if (organizationName === null) {
    return refuseWrite('invalid-request', 400, 'the vet must carry the organisation legal or display name');
  }
  const publicReferenceUrl = stringField(input.body.publicReferenceUrl);
  if (publicReferenceUrl === null) {
    return refuseWrite('invalid-request', 400, 'the vet must carry a public reference link');
  }
  if (!PUBLIC_REFERENCE_URL.test(publicReferenceUrl)) {
    return refuseWrite('invalid-request', 400, 'the public reference link must be an http or https URL');
  }
  const contactName = stringField(input.body.contactName);
  if (contactName === null) {
    return refuseWrite('invalid-request', 400, 'the vet must carry the contact name');
  }
  const contactTitle = stringField(input.body.contactTitle);
  if (contactTitle === null) {
    return refuseWrite('invalid-request', 400, 'the vet must carry the contact title');
  }
  const authorityAttestation = stringField(input.body.authorityAttestation);
  if (authorityAttestation === null) {
    return refuseWrite('invalid-request', 400, 'the vet must carry the contact authority attestation');
  }
  const evidenceType = stringField(input.body.evidenceType);
  if (evidenceType === null) {
    return refuseWrite('invalid-request', 400, 'the vet must carry the evidence type');
  }
  if (!isVettingEvidenceType(evidenceType)) {
    return refuseWrite('invalid-evidence', 400, `evidence type ${JSON.stringify(evidenceType)} is not an accepted v1 evidence type`);
  }

  const receivedAtPresent = input.body.registrationReceivedAt !== undefined;
  const countPresent = input.body.registrationDocumentCount !== undefined;
  const deletedPresent = input.body.registrationCopiesDeleted !== undefined;
  const registrationReceivedAt = timestampField(input.body.registrationReceivedAt);
  const registrationDocumentCount = integerField(input.body.registrationDocumentCount);
  const registrationCopiesDeleted = booleanField(input.body.registrationCopiesDeleted);

  if (evidenceType === EMAILED_REGISTRATION_EVIDENCE) {
    if (registrationReceivedAt === null || registrationDocumentCount === null || registrationCopiesDeleted !== true) {
      return refuseWrite(
        'invalid-evidence',
        400,
        'emailed registration documents require received-at, a positive document count and copies-deleted true',
      );
    }
    if (registrationDocumentCount <= 0) {
      return refuseWrite(
        'invalid-evidence',
        400,
        'emailed registration documents require received-at, a positive document count and copies-deleted true',
      );
    }
  } else if (
    receivedAtPresent ||
    countPresent ||
    deletedPresent ||
    registrationReceivedAt !== null ||
    registrationDocumentCount !== null ||
    registrationCopiesDeleted !== null
  ) {
    return refuseWrite(
      'invalid-evidence',
      400,
      'registration document metadata is recorded only for emailed registration documents',
    );
  }

  const notice = vettingOutcomeNotice('vetted');
  if (!notice.ok) return refuseWrite('refused', 502, notice.reason);
  return {
    ok: true,
    args: {
      p_account_id: input.caller.id,
      p_organization_id: organizationId,
      p_action: 'vet',
      p_notice: notice.value,
      p_organization_name: organizationName,
      p_public_reference_url: publicReferenceUrl,
      p_contact_name: contactName,
      p_contact_title: contactTitle,
      p_authority_attestation: authorityAttestation,
      p_evidence_type: evidenceType,
      p_note: note,
      p_registration_received_at: evidenceType === EMAILED_REGISTRATION_EVIDENCE ? registrationReceivedAt : null,
      p_registration_document_count: evidenceType === EMAILED_REGISTRATION_EVIDENCE ? registrationDocumentCount : null,
      p_registration_copies_deleted: evidenceType === EMAILED_REGISTRATION_EVIDENCE ? true : null,
    },
  };
}
