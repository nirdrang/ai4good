/**
 * THE ORACLE FOR THE SHIPPED EXHAUSTED-SENTENCE RENDERER, WITH NO ACCEPTANCE ID BEHIND IT.
 *
 * AT-002.05 proves the unverified-tier block at zero and the three remedies. Its criterion does
 * not mention the vetted tier. Driving the renderer here is how this tree asserts a shipped
 * decision that has no acceptance id: the vetted-at-zero sentence names the two remedies that
 * still apply, and drops get-vetted.
 *
 * WHAT A GREEN HERE CLAIMS: an unverified caller reads three remedies and a vetted caller reads
 * two. WHAT IT DOES NOT CLAIM: that a Discovery surface shows either sentence.
 */

import { describe, expect, it } from 'vitest';

import { dailyAllowanceExhaustedReason } from '../../../supabase/functions/_shared/discovery-allowance.ts';

const ORG = '00000000-0000-4000-8000-000000000002';

describe('the shipped exhausted-sentence renderer', () => {
  it('names three remedies for an unverified caller and two for a vetted caller', () => {
    const unverified = dailyAllowanceExhaustedReason(ORG, 'unverified');
    const vetted = dailyAllowanceExhaustedReason(ORG, 'vetted');

    expect(unverified, 'the get-vetted remedy is missing for an unverified caller').toMatch(/get vetted/i);
    expect(unverified, 'the fund-fuel remedy is missing for an unverified caller').toMatch(/fund project fuel/i);
    expect(unverified, 'the wait-for-the-next-day remedy is missing for an unverified caller').toMatch(
      /wait for the next UTC day/i,
    );

    // The get-vetted remedy is dropped for a vetted caller: that caller has already taken it.
    expect(vetted, 'the get-vetted remedy is still named for a vetted caller').not.toMatch(/get vetted/i);
    expect(vetted, 'the fund-fuel remedy is missing for a vetted caller').toMatch(/fund project fuel/i);
    expect(vetted, 'the wait-for-the-next-day remedy is missing for a vetted caller').toMatch(
      /wait for the next UTC day/i,
    );
  });
});
