/**
 * AT-REQ-002 · C. The vetting action and its audit record — AT-002.11, AT-002.11b, AT-002.29,
 * AT-002.30, AT-002.12, AT-002.13, AT-002.14
 * Source: .taskmaster/docs/acceptance/at-req-002.md
 *
 * AT-002.12 waits on the publish flow and the checkout: publishing closing and funding staying
 * untouched both need a consumer this tree does not have. It is declared red by shape in
 * `tests/at/expected/req-002.json`; the unvet audit and the two pure policies are proved by the
 * neighbouring ids.
 */

import { describe, expect } from 'vitest';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting, LEAF, notLanded } from './_pending.ts';
import type { VettingRecord, VettingRequest } from './_contract.ts';

const EVIDENCE = {
  organizationName: 'Riverside Shelter',
  publicReferenceUrl: 'https://example.org/riverside-shelter',
  contactName: 'Dana Okonkwo',
  contactTitle: 'Executive Director',
  authorityAttestation: 'The named contact attests they have authority to bind the organisation.',
  evidenceType: 'organization_website',
  note: 'Public website matches the registry listing and the named contact.',
} as const;

const REQUEST_FIELDS = [
  'organizationName',
  'publicReferenceUrl',
  'contactName',
  'contactTitle',
  'authorityAttestation',
  'evidenceType',
  'note',
] as const;

const SCHEMA_FIELDS: ReadonlyArray<keyof Omit<VettingRecord, 'registration'>> = [
  'organizationId',
  'vetted',
  'vettedByAccountId',
  'vettedAt',
  'organizationName',
  'publicReferenceUrl',
  'contactName',
  'contactTitle',
  'authorityAttestation',
  'evidenceType',
  'note',
];

describe('AT-REQ-002 C — the vetting action and its audit record', () => {
  atTest(
    'AT-002.11',
    'the recorded vet captures who vetted and when, the NGO name, a public reference link, the contact name, title and authority attestation, the evidence type and a note',
    async ({ open }) => {
      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-11'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-11'));

      const outcome = await sut.setVetting(admin, {
        organizationId: ngo.organizationId,
        action: 'vet',
        ...EVIDENCE,
      });
      expect(outcome, 'the platform admin vet was refused').toMatchObject({
        ok: true,
        organizationId: ngo.organizationId,
        vetted: true,
        changed: true,
      });
      if (!outcome.ok) return;

      const record = await sut.vettingRecord(ngo.organizationId);
      expect(record, 'the vet wrote no aggregate row').not.toBeNull();
      if (record === null) return;
      expect(record.organizationId).toBe(ngo.organizationId);
      expect(record.vetted).toBe(true);
      expect(record.vettedByAccountId, 'the aggregate does not name who vetted').toBe(admin.accountId);
      expect(Number.isNaN(Date.parse(record.vettedAt)), 'the aggregate does not name when the vet happened').toBe(false);
      expect(record.organizationName).toBe(EVIDENCE.organizationName);
      expect(record.publicReferenceUrl).toBe(EVIDENCE.publicReferenceUrl);
      expect(record.contactName).toBe(EVIDENCE.contactName);
      expect(record.contactTitle).toBe(EVIDENCE.contactTitle);
      expect(record.authorityAttestation).toBe(EVIDENCE.authorityAttestation);
      expect(record.evidenceType).toBe(EVIDENCE.evidenceType);
      expect(record.note).toBe(EVIDENCE.note);
      expect(record.registration).toBeNull();

      const audits = await sut.vettingAuditEvents(ngo.organizationId);
      expect(audits, 'the vet wrote no audit row').toHaveLength(1);
      const audit = audits[0];
      expect(audit.actorAccountId, 'the audit row does not name who vetted').toBe(admin.accountId);
      expect(Number.isNaN(Date.parse(audit.occurredAt)), 'the audit row does not name when the vet happened').toBe(false);
      expect(audit.subjectOrgId).toBe(ngo.organizationId);
      expect(audit.reason).toBe(EVIDENCE.note);
      expect(audit.detail.action).toBe('vet');
      expect(audit.detail.previousVetted).toBe(false);
      expect(audit.detail.current.organizationId).toBe(ngo.organizationId);
      expect(audit.detail.current.vetted).toBe(true);
      expect(audit.detail.current.vettedByAccountId).toBe(admin.accountId);
      expect(audit.detail.current.organizationName).toBe(EVIDENCE.organizationName);
      expect(audit.detail.current.publicReferenceUrl).toBe(EVIDENCE.publicReferenceUrl);
      expect(audit.detail.current.contactName).toBe(EVIDENCE.contactName);
      expect(audit.detail.current.contactTitle).toBe(EVIDENCE.contactTitle);
      expect(audit.detail.current.authorityAttestation).toBe(EVIDENCE.authorityAttestation);
      expect(audit.detail.current.evidenceType).toBe(EVIDENCE.evidenceType);
      expect(audit.detail.current.note).toBe(EVIDENCE.note);
    },
  );

  atTest(
    'AT-002.11b',
    'a vet with any one required audit field absent does not commit and leaves no partial vetted state',
    async ({ open }) => {
      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-11b'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-11b'));
      const complete: VettingRequest = {
        organizationId: ngo.organizationId,
        action: 'vet',
        ...EVIDENCE,
      };

      for (const field of REQUEST_FIELDS) {
        const { [field]: _omitted, ...rest } = complete;
        const outcome = await sut.setVetting(admin, rest as VettingRequest & Record<string, unknown>);
        expect(outcome.ok, `a vet with ${field} absent still committed`).toBe(false);
        if (outcome.ok) return;
        expect(outcome.kind, `a vet with ${field} absent was refused as ${outcome.kind}: ${outcome.reason}`).toBe(
          'invalid-request',
        );
        expect(await sut.vettingRecord(ngo.organizationId), `a vet with ${field} absent left an aggregate row`).toBeNull();
        expect(await sut.vettingAuditEvents(ngo.organizationId), `a vet with ${field} absent wrote an audit row`).toEqual([]);
      }

      const validRow = {
        organizationId: ngo.organizationId,
        vetted: true,
        vettedByAccountId: admin.accountId,
        vettedAt: new Date().toISOString(),
        organizationName: EVIDENCE.organizationName,
        publicReferenceUrl: EVIDENCE.publicReferenceUrl,
        contactName: EVIDENCE.contactName,
        contactTitle: EVIDENCE.contactTitle,
        authorityAttestation: EVIDENCE.authorityAttestation,
        evidenceType: EVIDENCE.evidenceType,
        note: EVIDENCE.note,
      };

      for (const field of SCHEMA_FIELDS) {
        const outcome = await sut.attemptVettingRowAsOperator({ ...validRow, [field]: null });
        expect(outcome.ok, `the schema accepted a row with ${field} null`).toBe(false);
        if (outcome.ok) return;
        expect(
          outcome.reason,
          `a null ${field} was refused for a reason other than a not-null constraint: ${outcome.reason}`,
        ).toMatch(/not-null constraint/i);
        expect(await sut.vettingRecord(ngo.organizationId), `a null ${field} left an aggregate row`).toBeNull();
      }
    },
  );

  atTest('AT-002.29', 'a vet or unvet from an NGO account, a volunteer or an unauthenticated caller is rejected with no tier change and no verification-outcome event', notLanded(LEAF.D3_L2));

  atTest('AT-002.30', 'only the manual founder vet and unvet path exists — no automated verification, KYC workflow or document-review status transition', notLanded(LEAF.D3_L2));

  atTest('AT-002.12', 'unvetting a vetted NGO closes publishing, is audit-recorded, and leaves project-fuel funding unblocked', awaiting(AWAITED.publishFlow, AWAITED.projectFuelCheckout));

  atTest('AT-002.13', 'a vet or unvet emits the verification-outcome notification to the NGO through the normal event path, never a side-channel email', notLanded(LEAF.D3_L3));

  atTest('AT-002.14', 'the vetting flow is a single audited admin action with no multi-step approval chain', notLanded(LEAF.D3_L3));
});
