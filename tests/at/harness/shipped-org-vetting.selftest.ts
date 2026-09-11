/**
 * THE ORACLE FOR `org-vetting.ts`'s TWO SHIPPED PERMISSIBILITY DECISIONS.
 *
 * `publishingAllowed` is the one thing the vetted condition gates. `fundingAllowed` is the
 * other half of that pair: ordinary project-fuel funding is permitted at every vetting tier.
 * No publish route consults the first yet, and AT-002.19 and AT-002.20 stay red for that
 * reason. No checkout consults the second yet, and AT-002.31 stays red for that reason.
 *
 * WHY THE SELFTEST LANE. The same reason `shipped-verification.selftest.ts` gives: driving the
 * module directly is how this tree asserts a shipped decision with no acceptance id behind it.
 * An acceptance body that called either function and went green would claim a publish route
 * or a checkout this tree does not have.
 *
 * WHAT A GREEN ON PUBLISHING CLAIMS: the unverified tier is refused, the vetted tier is
 * permitted, and the refusal names the founder-vetted condition the requirement pins. WHAT IT
 * DOES NOT CLAIM: that a publish route consults it, that a project enters triage, or that
 * AT-002.19 or AT-002.20 is green.
 *
 * WHAT A GREEN ON FUNDING CLAIMS: both values of the vetted flag produce the same permit,
 * because the decision takes the tier and ignores it. WHAT IT DOES NOT CLAIM: that a checkout
 * consults it, or that AT-002.31 is green.
 */

import { describe, expect, it } from 'vitest';

import {
  decideOrganizationVetting,
  fundingAllowed,
  publishingAllowed,
  vettingOutcomeNotice,
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
});

describe('the shipped vetting outcome notice', () => {
  it('does not claim the organisation may publish', () => {
    const vetted = vettingOutcomeNotice('vetted');
    const unvetted = vettingOutcomeNotice('unvetted');
    expect(vetted.copy.body).not.toMatch(/publish/i);
    expect(unvetted.copy.body).not.toMatch(/publish/i);
    expect(vetted.copy.subject).toBe('Your organisation is founder-vetted');
    expect(unvetted.copy.subject).toBe('Your organisation is no longer founder-vetted');
  });
});
