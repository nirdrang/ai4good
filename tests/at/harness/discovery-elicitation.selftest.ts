import { expect, it } from 'vitest';
import { parseElicitation, RECORD_ELICITATION_TOOL } from '../../../supabase/functions/_shared/discovery-prompt.ts';
import { discoveryPrepare, settleArgsFrom, type CallerReads, type DiscoveryReserveArgs, type DiscoveryTurnSqlRow, type MessagesPort, type Reservation } from '../../../supabase/functions/_shared/discovery-turn.ts';
import { reserveSettings } from '../../../supabase/functions/_shared/discovery-metering.ts';
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
  expect(settleArgsFrom(reservation, { ok: false, status: 499, reason: 'the client cancelled before the provider answered' }, 'account'))
    .toMatchObject({ args: { p_outcome: 'failed', p_assistant_message: null }, failure: 'the client cancelled before the provider answered' });
  expect(settleArgsFrom(reservation, { ...answer, stopReason: 'refusal', toolUse: null }, 'account'))
    .toMatchObject({ args: { p_outcome: 'failed', p_assistant_message: null }, failure: 'the model refused the request' });
});
it('skips an empty assistant reply when preparing the next turn', async () => {
  const seen: { role: string; content: string }[] = [];
  const port: MessagesPort = {
    model: 'test-model',
    countTokens: async (request) => { seen.push(...request.messages); return 128; },
    create: async () => { throw new Error('create is not used'); },
    stream: async () => { throw new Error('stream is not used'); },
  };
  const projectId = '11111111-1111-4111-8111-111111111111';
  const orgId = '22222222-2222-4222-8222-222222222222';
  const reads: CallerReads = {
    organization: async () => ({ ok: true, rows: [] }),
    seatsOf: async () => ({ ok: true, rows: [] }),
    projectsOf: async () => ({ ok: true, rows: [] }),
    project: async () => ({ ok: true, rows: [{ id: projectId, name: 'Tracker', org_id: orgId, assigned_volunteer_id: null }] }),
    need: async () => ({ ok: true, rows: [{
      project_id: projectId, description: 'Need', urgency: 'soon', stage: 'discovery_in_progress',
      cause_labels: [], reference_files: [], tier2_classified_at: null, submitted_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }] }),
    discoveryTurnsOf: async () => ({ ok: true, rows: [{
      seq: 1, status: 'settled', user_message: 'Hello', assistant_message: '', elicitation: GRANT_TRACKER_ELICITATION,
    } as DiscoveryTurnSqlRow] }),
    discoveryScopesOf: async () => ({ ok: true, rows: [] }),
    discoveryAllowance: async () => ({ ok: true, value: {} }),
  };
  const args: DiscoveryReserveArgs = {
    p_account_id: 'account', p_organization_id: orgId, p_project_id: projectId,
    p_message: 'Continue.', p_settings: reserveSettings(), p_counted_through_seq: 0,
  };
  const prepared = await discoveryPrepare(port, [])({ id: 'account', githubHandle: null, emailVerified: true }, args, reads);
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) return;
  expect(prepared.args.p_counted_through_seq).toBe(1);
  expect(seen).toEqual([{ role: 'user', content: 'Continue.' }]);
  expect(seen.some((message) => message.content === '')).toBe(false);
});
