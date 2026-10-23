import { describe, expect, it } from 'vitest';

import {
  allowanceOf,
  dailyAllowanceExhaustedReason,
  renderDiscoveryAllowance,
} from '../../../supabase/functions/_shared/discovery-allowance.ts';

const ORG = '00000000-0000-4000-8000-000000000002';

describe('the shipped exhausted-sentence renderer', () => {
  it('names exactly two remedies, fund project fuel or wait for the next UTC day, and never get vetted', () => {
    const reason = dailyAllowanceExhaustedReason(ORG);

    expect(reason).toBe(
      `discovery_allowance refuses: organisation ${ORG} has no Discovery credits left today — fund project fuel to continue now, or wait for the next UTC day`,
    );
    expect(reason, 'the get-vetted remedy came back').not.toMatch(/get vetted/i);
  });
});

describe('the shipped allowance renderer', () => {
  const row = {
    organization_id: ORG,
    utc_day: '2026-09-11',
    vetted: false,
    daily_grant: 10,
    spent_today: 3,
    remaining: 7,
  };

  it('builds the allowance through allowanceOf', () => {
    expect(renderDiscoveryAllowance(row)).toEqual(
      allowanceOf({
        organizationId: ORG,
        utcDay: '2026-09-11',
        vetted: false,
        granted: 10,
        spent: 3,
      }),
    );
  });

  it('throws when a numeric field is missing rather than reading it as zero', () => {
    expect(() => renderDiscoveryAllowance({ ...row, remaining: null })).toThrow(/not an allowance/i);
    expect(() => renderDiscoveryAllowance({ ...row, daily_grant: null })).toThrow(/not an allowance/i);
    expect(() => renderDiscoveryAllowance({ ...row, spent_today: null })).toThrow(/not an allowance/i);
  });

  it('keeps a remaining of zero as zero', () => {
    expect(renderDiscoveryAllowance({ ...row, spent_today: 10, remaining: 0 })).toEqual(
      allowanceOf({
        organizationId: ORG,
        utcDay: '2026-09-11',
        vetted: false,
        granted: 10,
        spent: 10,
      }),
    );
  });
});
