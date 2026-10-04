import { expect, it } from 'vitest';
import { decideDiscoveryMessage, discoveryAct, discoveryPrepare, type CallerReads, type DiscoveryReserveArgs, type DiscoveryTurnSqlRow, type MessagesPort } from '../../../supabase/functions/_shared/discovery-turn.ts';
import { reserveSettings } from '../../../supabase/functions/_shared/discovery-metering.ts';
import type { AccountWriteRouteInput } from '../../../supabase/functions/_shared/write-routes.ts';

const projectId = '11111111-1111-4111-8111-111111111111';
const orgId = '22222222-2222-4222-8222-222222222222';
const caller = { id: 'account', githubHandle: null, emailVerified: true };
const body = { projectId, mode: 'answer', userMessageId: 'message-1', message: 'Continue.', answers: [], expectedCharge: 'free' };
function decision(input: Record<string, unknown>) {
  return decideDiscoveryMessage({ caller, target: orgId, body: input,
    standing: { orgExists: true, orgRole: 'admin' } } as AccountWriteRouteInput);
}
function args(): DiscoveryReserveArgs {
  const result = decision(body);
  if (!result.ok) throw new Error(result.reason);
  return result.args;
}
const reads: CallerReads = {
  organization: async () => ({ ok: true, rows: [] }),
  seatsOf: async () => ({ ok: true, rows: [] }), projectsOf: async () => ({ ok: true, rows: [] }),
  project: async () => ({ ok: true, rows: [{ id: projectId, name: 'Tracker', org_id: orgId, assigned_volunteer_id: null }] }),
  need: async () => ({ ok: true, rows: [{ project_id: projectId, description: 'Need', urgency: 'soon',
    stage: 'discovery_in_progress', cause_labels: [], reference_files: [], tier2_classified_at: null,
    submitted_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }] }),
  discoveryTurnsOf: async () => ({ ok: true, rows: [{ seq: 1, status: 'settled', user_message: 'Hello', assistant_message: '' } as DiscoveryTurnSqlRow] }),
  discoveryScopesOf: async () => ({ ok: true, rows: [] }),
  discoveryBriefOf: async () => ({ ok: true, value: { revision: null, document: null, confirmation: null, lines: [] } }),
  discoveryAllowance: async () => ({ ok: true, value: {} }),
};

it('requires the screen mode, message id and displayed charge', () => {
  expect(decision(body).ok).toBe(true);
  for (const field of ['mode', 'userMessageId', 'expectedCharge']) {
    const missing: Record<string, unknown> = { ...body };
    delete missing[field];
    expect(decision(missing)).toMatchObject({ ok: false, kind: 'invalid-request' });
  }
  expect(decision({ projectId, message: 'Old shape' })).toMatchObject({ ok: false, kind: 'invalid-request' });
});

it('accepts an answer with an empty note and refuses an empty submission', () => {
  expect(decision({ ...body, message: '', answers: [{ questionId: 'priority', choice: 'own', text: 'Track deadlines', certain: true }] }).ok).toBe(true);
  expect(decision({ ...body, message: '' })).toMatchObject({ ok: false, kind: 'invalid-request' });
  expect(decision({ ...body, mode: 'opening', message: '', expectedCharge: undefined }).ok).toBe(true);
});

it('prepares a forced reply without a provider call and skips an empty assistant message', async () => {
  const unused = async () => { throw new Error('preparation must not call the provider'); };
  const port: MessagesPort = { model: 'test-model', create: unused, stream: unused };
  const prepared = await discoveryPrepare(port, [])(caller, args(), reads);
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) return;
  const seen: unknown[] = [];
  const invalid: MessagesPort = { model: 'test-model', stream: unused,
    create: async (request) => {
      seen.push(request);
      return { ok: true, text: '', model: 'test-model', stopReason: 'tool_use', usage: { inputTokens: 100, outputTokens: 20 }, toolUse: { name: 'reply', input: {} } };
    } };
  const result = await discoveryAct(invalid)({ turn: { id: 'turn', max_output_tokens: 4096 }, need: {}, context: [] }, prepared.args);
  expect(seen).toMatchObject([{ toolChoice: { type: 'tool', name: 'reply' }, messages: [{ role: 'user', content: 'Continue.' }] }]);
  expect(result.args).toMatchObject({ p_outcome: 'failed', p_turn_id: 'turn' });
});

it('has no token prices in reserve settings', () => {
  expect(Object.keys(reserveSettings()).sort()).toEqual(['effort', 'max_output_tokens', 'message_max_chars', 'model', 'off_topic_flag_strikes', 'turn_deadline_seconds']);
});
