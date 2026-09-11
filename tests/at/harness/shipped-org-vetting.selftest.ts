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

import { fundingAllowed, publishingAllowed } from '../../../supabase/functions/_shared/org-vetting.ts';

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
