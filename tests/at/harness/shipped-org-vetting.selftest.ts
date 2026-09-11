/**
 * THE ORACLE FOR `org-vetting.ts`'s FUNDING PERMISSIBILITY.
 *
 * `fundingAllowed` promises that ordinary project-fuel funding is permitted at every vetting
 * tier. No checkout consults it yet, and AT-002.31 stays red for that reason. A green here says
 * the shipped decision answers that way. It does not say any funding path exists.
 *
 * WHY THE SELFTEST LANE. The same reason `shipped-verification.selftest.ts` gives: driving the
 * module directly is how this tree asserts a shipped decision with no acceptance id behind it.
 * An acceptance body that called this function and went green would claim a checkout this tree
 * does not have.
 *
 * WHAT A GREEN HERE CLAIMS: both values of the vetted flag produce the same permit, because the
 * decision takes the tier and ignores it. WHAT IT DOES NOT CLAIM: that a checkout consults it,
 * or that AT-002.31 is green.
 */

import { describe, expect, it } from 'vitest';

import { fundingAllowed } from '../../../supabase/functions/_shared/org-vetting.ts';

describe('the shipped funding permissibility', () => {
  it('permits funding at the unverified tier and at the vetted tier, with the same answer', () => {
    const unverified = fundingAllowed(false);
    const vetted = fundingAllowed(true);
    expect(unverified).toEqual({ ok: true, value: 'not-vetting-gated' });
    expect(vetted).toEqual({ ok: true, value: 'not-vetting-gated' });
    expect(vetted).toEqual(unverified);
  });
});
