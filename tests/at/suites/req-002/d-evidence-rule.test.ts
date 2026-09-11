/**
 * AT-REQ-002 · D. Evidence rule — AT-002.16, AT-002.17, AT-002.18
 * Source: .taskmaster/docs/acceptance/at-req-002.md
 *
 * Rejecting attachments and storing only metadata cannot prove a document was deleted from
 * the founder's mailbox. The record carries `registrationCopiesDeleted` as an attestation,
 * and an attestation is not proof. AT-002.16 does not assert mailbox deletion.
 *
 * The AT-002.18 surface sweep covers the organisation dashboard and the public project page,
 * which are the surfaces this tree has. It does not claim a sweep of listing screens or of
 * any other surface that does not exist.
 */

import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import { documentContentSinks } from './_source-documents.ts';
import type { OrganizationsSut, VettingRecord, VettingRequest } from './_contract.ts';

const VETTING_OUTCOME = 'vetting.outcome';

const BASE_EVIDENCE = {
  organizationName: 'Riverside Shelter',
  publicReferenceUrl: 'https://example.org/riverside-shelter',
  contactName: 'Dana Okonkwo',
  contactTitle: 'Executive Director',
  authorityAttestation: 'The named contact attests they have authority to bind the organisation.',
  note: 'Public website matches the registry listing and the named contact.',
} as const;

const RECEIVED_AT = '2026-09-08T14:30:00.000Z';

const EMAILED_EVIDENCE = {
  ...BASE_EVIDENCE,
  evidenceType: 'emailed_registration_documents',
  note: 'Registration documents arrived by email; copies deleted before this vet.',
  registrationReceivedAt: RECEIVED_AT,
  registrationDocumentCount: 2,
  registrationCopiesDeleted: true,
} as const;

const CONTENT_KEYS = ['documentContent', 'content', 'attachment', 'storageKey', 'downloadPath', 'fileBytes'] as const;

const IDENTITY_DOCUMENTS: ReadonlyArray<{ label: string; evidenceType: string }> = [
  { label: 'a passport', evidenceType: 'passport' },
  { label: 'a national identity card', evidenceType: 'national_identity_card' },
  { label: 'a driving licence', evidenceType: 'driving_licence' },
  { label: 'an identity-card scan', evidenceType: 'identity-card scan' },
];

const NON_DOCUMENT_TYPES = ['public_registry', 'organization_website', 'ein'] as const;

const RECORD_KEYS = [
  'authorityAttestation',
  'contactName',
  'contactTitle',
  'evidenceType',
  'note',
  'organizationId',
  'organizationName',
  'publicReferenceUrl',
  'registration',
  'vetted',
  'vettedAt',
  'vettedByAccountId',
].sort();

const METADATA_KEYS = ['registrationCopiesDeleted', 'registrationDocumentCount', 'registrationReceivedAt'].sort();

const FORBIDDEN_RECORD_KEY =
  /^(?:attachment|bytes|content|documentContent|document_content|downloadPath|download_path|fileBytes|file_bytes|storageKey|storage_key)$/;

const IMPLIED_DOCUMENT_REVIEW =
  /document[-_ ]?review|documents[-_ ]?reviewed|reviewed[-_ ]?documents|identity[-_ ]?(?:document|verif)|kyc/i;

function forbiddenContentKeys(value: unknown, path: string): string[] {
  const hits: string[] = [];
  const walk = (node: unknown, here: string): void => {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => walk(entry, `${here}[${index}]`));
      return;
    }
    if (node !== null && typeof node === 'object') {
      for (const [key, child] of Object.entries(node)) {
        const childPath = here === '' ? key : `${here}.${key}`;
        if (FORBIDDEN_RECORD_KEY.test(key)) hits.push(childPath);
        walk(child, childPath);
      }
    }
  };
  walk(value, path);
  return hits.sort();
}

function impliedDocumentReviewHits(value: unknown, path: string): string[] {
  const hits: string[] = [];
  const walk = (node: unknown, here: string): void => {
    if (typeof node === 'string') {
      if (IMPLIED_DOCUMENT_REVIEW.test(node)) hits.push(`${here}=${JSON.stringify(node)}`);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((entry, index) => walk(entry, `${here}[${index}]`));
      return;
    }
    if (node !== null && typeof node === 'object') {
      for (const [key, child] of Object.entries(node)) {
        const childPath = here === '' ? key : `${here}.${key}`;
        if (IMPLIED_DOCUMENT_REVIEW.test(key)) hits.push(childPath);
        walk(child, childPath);
      }
    }
  };
  walk(value, path);
  return hits.sort();
}

function surfaceHits(label: string, body: string): string[] {
  let parsed: unknown = body;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    if (IMPLIED_DOCUMENT_REVIEW.test(body)) return [`${label}=${JSON.stringify(body)}`];
    return [];
  }
  return impliedDocumentReviewHits(parsed, label);
}

async function assertNothingWritten(
  sut: OrganizationsSut,
  organizationId: string,
  recipientId: string,
): Promise<void> {
  expect(await sut.vettingRecord(organizationId), 'a refused vet left an aggregate row').toBeNull();
  expect(await sut.vettingAuditEvents(organizationId), 'a refused vet wrote an audit row').toEqual([]);
  expect(
    await sut.notificationEvents({ event: VETTING_OUTCOME, recipientId }),
    'a refused vet wrote a verification-outcome event',
  ).toEqual([]);
}

function assertMetadataOnly(record: VettingRecord, organizationId: string): void {
  expect(Object.keys(record).sort(), 'the stored record is not the closed metadata shape').toEqual(RECORD_KEYS);
  expect(record.organizationId).toBe(organizationId);
  expect(record.evidenceType).toBe('emailed_registration_documents');
  expect(record.registration, 'emailed registration documents stored no metadata').not.toBeNull();
  if (record.registration === null) return;
  expect(Object.keys(record.registration).sort(), 'the stored metadata is not exactly the three metadata fields').toEqual(
    METADATA_KEYS,
  );
  expect(record.registration.registrationReceivedAt).toBe(RECEIVED_AT);
  expect(record.registration.registrationDocumentCount).toBe(2);
  expect(record.registration.registrationCopiesDeleted).toBe(true);
  expect(forbiddenContentKeys(record, 'record'), 'the stored record carries a document-content field').toEqual([]);
}

describe('AT-REQ-002 D — evidence rule', () => {
  atTest(
    'AT-002.16',
    'for registration documents received by email, only their metadata is recorded and no document content is retrievable afterwards',
    async ({ open }) => {
      expect(
        documentContentSinks(),
        'a column holds document bytes, or a route returns a document',
      ).toEqual([]);

      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-16'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-16'));
      const complete: VettingRequest & Record<string, unknown> = {
        organizationId: ngo.organizationId,
        action: 'vet',
        ...EMAILED_EVIDENCE,
      };

      for (const key of CONTENT_KEYS) {
        const outcome = await sut.setVetting(admin, { ...complete, [key]: 'the document bytes' });
        expect(outcome.ok, `a vet carrying ${key} still committed`).toBe(false);
        if (outcome.ok) return;
        expect(outcome.kind, `a vet carrying ${key} was refused as ${outcome.kind}: ${outcome.reason}`).toBe(
          'invalid-request',
        );
        await assertNothingWritten(sut, ngo.organizationId, ngo.accountId);
      }

      const outcome = await sut.setVetting(admin, complete);
      expect(outcome, 'the metadata-only emailed-registration vet was refused').toMatchObject({
        ok: true,
        organizationId: ngo.organizationId,
        vetted: true,
        changed: true,
      });
      if (!outcome.ok) return;

      const record = await sut.vettingRecord(ngo.organizationId);
      expect(record, 'the metadata-only vet wrote no aggregate row').not.toBeNull();
      if (record === null) return;
      assertMetadataOnly(record, ngo.organizationId);

      const audits = await sut.vettingAuditEvents(ngo.organizationId);
      expect(audits, 'the metadata-only vet wrote no audit row').toHaveLength(1);
      assertMetadataOnly(audits[0].detail.current, ngo.organizationId);

      const afterWrite = await sut.vettingRecord(ngo.organizationId);
      const afterAudits = await sut.vettingAuditEvents(ngo.organizationId);
      const afterEvents = await sut.notificationEvents({ event: VETTING_OUTCOME, recipientId: ngo.accountId });

      const second = await sut.setVetting(admin, { ...complete, documentContent: 'the document bytes' });
      expect(second.ok, 'a later vet carrying documentContent still committed').toBe(false);
      if (second.ok) return;
      expect(second.kind).toBe('invalid-request');
      expect(await sut.vettingRecord(ngo.organizationId), 'a content-carrying vet changed the aggregate').toEqual(
        afterWrite,
      );
      expect(await sut.vettingAuditEvents(ngo.organizationId), 'a content-carrying vet wrote an audit row').toEqual(
        afterAudits,
      );
      expect(
        await sut.notificationEvents({ event: VETTING_OUTCOME, recipientId: ngo.accountId }),
        'a content-carrying vet wrote a verification-outcome event',
      ).toEqual(afterEvents);
    },
  );

  atTest(
    'AT-002.17',
    'an attempt to record a sensitive personal identity document as evidence is refused',
    async ({ open }) => {
      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-17'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-17'));

      for (const { label, evidenceType } of IDENTITY_DOCUMENTS) {
        const outcome = await sut.setVetting(admin, {
          organizationId: ngo.organizationId,
          action: 'vet',
          ...BASE_EVIDENCE,
          evidenceType,
        });
        expect(outcome.ok, `${label} was admitted through the decision module`).toBe(false);
        if (outcome.ok) return;
        expect(outcome.kind, `${label} was refused as ${outcome.kind}: ${outcome.reason}`).toBe('invalid-evidence');
        expect(outcome.status, `${label} was refused with status ${outcome.status}`).toBe(400);
        await assertNothingWritten(sut, ngo.organizationId, ngo.accountId);
      }

      const validRow = {
        organizationId: ngo.organizationId,
        vetted: true,
        vettedByAccountId: admin.accountId,
        vettedAt: new Date().toISOString(),
        organizationName: BASE_EVIDENCE.organizationName,
        publicReferenceUrl: BASE_EVIDENCE.publicReferenceUrl,
        contactName: BASE_EVIDENCE.contactName,
        contactTitle: BASE_EVIDENCE.contactTitle,
        authorityAttestation: BASE_EVIDENCE.authorityAttestation,
        note: BASE_EVIDENCE.note,
      };

      for (const { label, evidenceType } of IDENTITY_DOCUMENTS) {
        const outcome = await sut.attemptVettingRowAsOperator({ ...validRow, evidenceType });
        expect(outcome.ok, `${label} was admitted by the schema`).toBe(false);
        if (outcome.ok) return;
        expect(
          outcome.reason,
          `${label} was refused for a reason other than the closed evidence-type check: ${outcome.reason}`,
        ).toMatch(/org_vetting_evidence_type/);
        await assertNothingWritten(sut, ngo.organizationId, ngo.accountId);
      }
    },
  );

  atTest(
    'AT-002.18',
    'a vet with evidence type X stores exactly X in the audit record, and no NGO-facing or public surface implies a document review occurred',
    async ({ open }) => {
      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-18'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-18'));

      for (const evidenceType of NON_DOCUMENT_TYPES) {
        const outcome = await sut.setVetting(admin, {
          organizationId: ngo.organizationId,
          action: 'vet',
          ...BASE_EVIDENCE,
          evidenceType,
        });
        expect(outcome, `the ${evidenceType} vet was refused`).toMatchObject({
          ok: true,
          organizationId: ngo.organizationId,
          vetted: true,
          changed: true,
        });
        if (!outcome.ok) return;

        const record = await sut.vettingRecord(ngo.organizationId);
        expect(record, `the ${evidenceType} vet wrote no aggregate row`).not.toBeNull();
        if (record === null) return;
        expect(record.evidenceType, `${evidenceType} was normalised, mapped or widened`).toBe(evidenceType);
        expect(record.registration, `${evidenceType} stored registration-document metadata`).toBeNull();

        const audits = await sut.vettingAuditEvents(ngo.organizationId);
        const latest = audits[audits.length - 1];
        expect(latest, `the ${evidenceType} vet wrote no audit row`).toBeDefined();
        expect(latest.detail.current.evidenceType, `the ${evidenceType} audit snapshot was not the submitted token`).toBe(
          evidenceType,
        );
      }

      const dash = await sut.organizationDashboard(ngo.session, ngo.organizationId);
      expect(dash.ok, 'the organisation dashboard was not readable after a non-document vet').toBe(true);
      if (!dash.ok) return;
      expect(
        surfaceHits('organization-dashboard', dash.answer.body),
        'the organisation dashboard implies a document review',
      ).toEqual([]);

      const project = await sut.createProjectAsOperator(ngo.organizationId, 'Riverside Shelter Website');
      const page = await sut.publicProjectPage(project.id, null);
      expect(page.ok, 'the public project page was not readable after a non-document vet').toBe(true);
      if (!page.ok) return;
      expect(
        surfaceHits('public-project', page.answer.body),
        'the public project page implies a document review',
      ).toEqual([]);
    },
  );
});
