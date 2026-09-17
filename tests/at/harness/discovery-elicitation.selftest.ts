import { expect, it } from 'vitest';
import { parseElicitation, RECORD_ELICITATION_TOOL } from '../../../supabase/functions/_shared/discovery-prompt.ts';
import { settleArgsFrom, type Reservation } from '../../../supabase/functions/_shared/discovery-turn.ts';
import { GRANT_TRACKER_ELICITATION } from '../suites/req-004/fixtures/grant-tracker.ts';

it('rejects missing, extra and wrongly typed tool fields at both object levels', () => {
  expect(parseElicitation(GRANT_TRACKER_ELICITATION)).toEqual(GRANT_TRACKER_ELICITATION);
  for (const input of [null, [], {}, { ...GRANT_TRACKER_ELICITATION, complete: false },
    { ...GRANT_TRACKER_ELICITATION, facts: [42] }, { ...GRANT_TRACKER_ELICITATION, extra: true },
    { ...GRANT_TRACKER_ELICITATION, userStories: [{ story: 'Need', acceptanceCriteria: [], extra: true }] },
    { ...GRANT_TRACKER_ELICITATION, userStories: [{ story: 'Need' }] }]) {
    expect(parseElicitation(input)).toBeNull();
  }
  expect(RECORD_ELICITATION_TOOL).toMatchObject({ name: 'record_elicitation', strict: true,
    input_schema: { additionalProperties: false, properties: { userStories: { items: { additionalProperties: false } } } } });
});
it('settles a tool-only record with empty text and invalid input with no record', () => {
  const reservation = { turn: { id: 'turn' } } as Reservation;
  const answer = { ok: true as const, text: '', model: 'test-model', stopReason: 'tool_use',
    usage: { inputTokens: 512, outputTokens: 64 }, toolUse: { name: 'record_elicitation', input: GRANT_TRACKER_ELICITATION } };
  expect(settleArgsFrom(reservation, answer, 'account')).toMatchObject({ failure: null,
    args: { p_outcome: 'completed', p_assistant_message: '', p_elicitation: GRANT_TRACKER_ELICITATION, p_stop_reason: 'tool_use' } });
  expect(settleArgsFrom(reservation, { ...answer, text: 'Recorded.', toolUse: { ...answer.toolUse, input: {} } }, 'account'))
    .toMatchObject({ failure: null, args: { p_outcome: 'completed', p_assistant_message: 'Recorded.', p_elicitation: null } });
  expect(settleArgsFrom(reservation, { ...answer, stopReason: 'user_stopped', toolUse: null }, 'account'))
    .toMatchObject({ args: { p_stop_reason: 'user_stopped', p_elicitation: null } });
});
