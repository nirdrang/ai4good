import { describe, expect, it } from 'vitest';

import { countPairs, expectedPairs, pairProblems } from '../suites/req-016/_oracles.ts';
import { channelRuleProblems, PAYLOAD_PREDICATES, TAXONOMY } from '../suites/req-016/taxonomy.ts';

describe('REQ-016 oracle conformance', () => {
  it('counts duplicate recipient-channel pairs instead of deduplicating them', () => {
    const counts = countPairs([
      { recipientId: 'ngo-1', channel: 'email' },
      { recipientId: 'ngo-1', channel: 'email' },
    ]);
    expect(counts.get('ngo-1:email')).toBe(2);
    expect(pairProblems(['ngo-1:email'], counts)).toContain('ngo-1:email: 2 deliveries, expected exactly 1');
  });

  it('builds the complete expected recipient-channel matrix', () => {
    expect(expectedPairs({ ngo: 'ngo-1', volunteer: 'volunteer-1' }, ['ngo', 'volunteer'], ['email', 'inapp'])).toEqual([
      'ngo-1:email',
      'ngo-1:inapp',
      'volunteer-1:email',
      'volunteer-1:inapp',
    ]);
  });

  it('rejects a critical event without email and low-tone email delivery', () => {
    const money = TAXONOMY.find((row) => row.event === 'payment.succeeded')!;
    const lowTone = TAXONOMY.find((row) => row.event === 'pm_item.status_changed')!;
    expect(channelRuleProblems(money, ['inapp']).join(' ')).toContain('requires email');
    expect(channelRuleProblems(lowTone, ['email']).join(' ')).toContain('exactly [inapp]');
  });

  it('rejects decorative payload fields that do not reach recipient copy', () => {
    const reason = PAYLOAD_PREDICATES['triage.returned_to_scoped'].reason;
    expect(reason('A detailed reason for revision', 'Unrelated body')).toContain('never appears');
    expect(reason('A detailed reason for revision', 'A detailed reason for revision')).toBeNull();
  });
});
