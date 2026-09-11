/**
 * Oracle for `org-vetting.ts`'s two shipped permissibility decisions.
 *
 * Driving the module directly is how this tree asserts a shipped decision with no
 * acceptance id behind it. An acceptance body that called either function and went
 * green would claim a publish route or a checkout this tree does not have.
 */

import { describe, expect, it } from 'vitest';

import {
  decideOrganizationVetting,
  fundingAllowed,
  publishingAllowed,
  vettingAuditCurrentFromDetail,
  vettingOutcomeNotice,
  vettingRecordFromSql,
  type VettingSqlRow,
} from '../../../supabase/functions/_shared/org-vetting.ts';
import type { AccountWriteRouteInput } from '../../../supabase/functions/_shared/write-routes.ts';

const MISSING_ORG = '00000000-0000-4000-8000-000000000099';
const CALLER = { id: '00000000-0000-4000-8000-000000000001', githubHandle: null };

function missingOrgInput(body: Record<string, unknown>): AccountWriteRouteInput {
  return {
    caller: CALLER,
    standing: {
      kind: 'account',
      accountType: 'platform_admin',
      lifecycle: 'active',
      orgRole: null,
      orgExists: false,
      orgSeatAccountId: null,
      subject: null,
    },
    body,
    target: MISSING_ORG,
    subject: null,
    ip: null,
  };
}

describe('the shipped publishing permissibility', () => {
  it('permits publishing only at the founder-vetted tier, and the refusal names that condition', () => {
    const vetted = publishingAllowed(true);
    const unverified = publishingAllowed(false);
    expect(vetted).toEqual({ ok: true, value: 'vetted' });
    expect(unverified).toEqual({
      ok: false,
      reason: 'publishing needs a founder-vetted organisation — this organisation is not founder-vetted',
    });
  });
});

describe('the shipped funding permissibility', () => {
  it('permits funding at the unverified tier and at the vetted tier, with the same answer', () => {
    const unverified = fundingAllowed(false);
    const vetted = fundingAllowed(true);
    expect(unverified).toEqual({ ok: true, value: 'not-vetting-gated' });
    expect(vetted).toEqual({ ok: true, value: 'not-vetting-gated' });
    expect(vetted).toEqual(unverified);
  });
});

describe('the shipped vetting decision', () => {
  it('refuses a missing organisation at the same step for vet and unvet', () => {
    const unvet = decideOrganizationVetting(missingOrgInput({ action: 'unvet', note: 'revoke the pilot' }));
    const vet = decideOrganizationVetting(
      missingOrgInput({
        action: 'vet',
        note: 'admit the pilot',
        organizationName: 'Riverside Shelter',
        publicReferenceUrl: 'not-a-url',
        contactName: 'Dana Okonkwo',
        contactTitle: 'Executive Director',
        authorityAttestation: 'The named contact attests they have authority to bind the organisation.',
        evidenceType: 'organization_website',
      }),
    );
    expect(unvet.ok, 'unvet of a missing organisation was admitted').toBe(false);
    expect(vet.ok, 'vet of a missing organisation was admitted').toBe(false);
    if (unvet.ok || vet.ok) return;
    expect(unvet.kind).toBe('no-such-organisation');
    expect(vet.kind, 'a vet of a missing organisation with a malformed URL was refused as something other than no-such-organisation').toBe(
      'no-such-organisation',
    );
  });

  it('returns the notice as a decision field rather than throwing', () => {
    const unvet = decideOrganizationVetting({
      caller: CALLER,
      standing: {
        kind: 'account',
        accountType: 'platform_admin',
        lifecycle: 'active',
        orgRole: null,
        orgExists: true,
        orgSeatAccountId: CALLER.id,
        subject: null,
      },
      body: { action: 'unvet', note: 'revoke the pilot' },
      target: MISSING_ORG,
      subject: null,
      ip: null,
    });
    expect(unvet.ok, 'an unvet of a present organisation was refused').toBe(true);
    if (!unvet.ok) return;
    expect(unvet.args.p_notice.copy.subject).toBe('Your organisation is no longer founder-vetted');
  });
});

describe('the shipped vetting outcome notice', () => {
  it('does not claim the organisation may publish', () => {
    const vetted = vettingOutcomeNotice('vetted');
    const unvetted = vettingOutcomeNotice('unvetted');
    expect(vetted.ok, 'the shipped notice builder refused a present taxonomy row').toBe(true);
    expect(unvetted.ok, 'the shipped notice builder refused a present taxonomy row').toBe(true);
    if (!vetted.ok || !unvetted.ok) return;
    expect(vetted.value.copy.body).not.toMatch(/publish/i);
    expect(unvetted.value.copy.body).not.toMatch(/publish/i);
    expect(vetted.value.copy.subject).toBe('Your organisation is founder-vetted');
    expect(unvetted.value.copy.subject).toBe('Your organisation is no longer founder-vetted');
  });

  it('returns a refusal when the taxonomy row is missing, and does not throw', () => {
    const missing = vettingOutcomeNotice('vetted', null);
    expect(missing).toEqual({
      ok: false,
      reason: 'vetting.outcome is missing from the notification taxonomy',
    });
  });
});

const SQL_ROW: VettingSqlRow = {
  org_id: '00000000-0000-4000-8000-000000000010',
  vetted: true,
  vetted_by_account_id: '00000000-0000-4000-8000-000000000001',
  vetted_at: '2026-09-11T12:00:00.000Z',
  organization_name: 'Riverside Shelter',
  public_reference_url: 'https://riverside.example.org',
  contact_name: 'Dana Okonkwo',
  contact_title: 'Executive Director',
  authority_attestation: 'The named contact attests they have authority to bind the organisation.',
  evidence_type: 'organization_website',
  note: 'admit the pilot',
  registration_received_at: null,
  registration_document_count: null,
  registration_copies_deleted: null,
};

describe('the shipped vetting projections', () => {
  it('throws when emailed registration evidence is missing registration metadata', () => {
    expect(() =>
      vettingRecordFromSql({
        ...SQL_ROW,
        evidence_type: 'emailed_registration_documents',
      }),
    ).toThrow(/registration metadata/i);
  });

  it('throws when a non-emailed evidence type carries registration metadata', () => {
    expect(() =>
      vettingRecordFromSql({
        ...SQL_ROW,
        registration_received_at: '2026-09-11T12:00:00.000Z',
        registration_document_count: 1,
        registration_copies_deleted: true,
      }),
    ).toThrow(/registration metadata/i);
  });

  it('throws when an audit current blob is truncated rather than filling empty strings', () => {
    expect(() =>
      vettingAuditCurrentFromDetail({
        current: {
          org_id: SQL_ROW.org_id,
          organization_name: SQL_ROW.organization_name,
          vetted: true,
        },
      }),
    ).toThrow(/missing/i);
  });

  it('projects a well-formed website-evidence row with no registration metadata', () => {
    const projected = vettingRecordFromSql(SQL_ROW);
    expect(projected.registration).toBeNull();
    expect(projected.organizationName).toBe('Riverside Shelter');
  });

  it('projects emailed registration metadata when every column is present', () => {
    const projected = vettingRecordFromSql({
      ...SQL_ROW,
      evidence_type: 'emailed_registration_documents',
      registration_received_at: '2026-09-11T12:00:00.000Z',
      registration_document_count: 2,
      registration_copies_deleted: true,
    });
    expect(projected.registration).toEqual({
      registrationReceivedAt: '2026-09-11T12:00:00.000Z',
      registrationDocumentCount: 2,
      registrationCopiesDeleted: true,
    });
  });
});
