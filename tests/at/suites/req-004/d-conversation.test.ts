import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';
import { GRANT_TRACKER } from './fixtures/grant-tracker.ts';
import { grantTrackerOracleProblems } from './fixtures/grant-tracker.oracle.ts';
import { DISCOVERY_REQUEST_SETTINGS } from '../../../../supabase/functions/_shared/discovery-metering.ts';
import { utcDayOf } from '../../../../supabase/functions/_shared/discovery-allowance.ts';
import type { DiscoveryMessageOutcome, DiscoverySut, Session } from './_contract.ts';

const MAX_CONVERSATION_TURNS = 10;
const RESUME_TURNS = GRANT_TRACKER.ngoMessages.slice(0, 3).map((message, index) => ({
  message, reply: GRANT_TRACKER.replies[index].kind === 'text' ? GRANT_TRACKER.replies[index].text : '',
  usage: { inputTokens: 900, outputTokens: 40 },
}));
async function returnNextDay(sut: DiscoverySut, ngo: { session: Session; organizationId: string }, projectId: string) {
  const rows = await sut.turnRows(projectId);
  const before = await sut.readAllowance(ngo.session, ngo.organizationId);
  expect(before.ok).toBe(true);
  if (!before.ok) throw new Error(before.reason);
  const today = before.allowance.utcDay;
  const yesterday = utcDayOf(Date.parse(`${today}T00:00:00Z`) - 86400000);
  await sut.writeSpendRowAsOperator({ organizationId: ngo.organizationId, utcDay: yesterday,
    granted: before.allowance.dailyGrant, spent: rows.reduce((total, row) => total + (row.chargedCredits ?? 0), 0) });
  await sut.writeSpendRowAsOperator({ organizationId: ngo.organizationId, utcDay: today,
    granted: before.allowance.dailyGrant, spent: 0 });
  const session = await sut.signInAgain(ngo.session.email);
  expect(session.sessionId).not.toBe(ngo.session.sessionId);
  const read = await sut.readConversation(session, projectId);
  expect(read.ok).toBe(true);
  if (!read.ok) throw new Error(read.answer.body);
  expect(read.value.conversation).toEqual({ projectId, turns: rows, elicitation: null, scopes: [], scope: null });
  expect(read.value.allowance).toMatchObject({ utcDay: today, spentToday: 0, remaining: before.allowance.dailyGrant });
  return { session, rows };
}

atTest('AT-004.10', 'the grant tracker conversation satisfies its semantic oracle', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-conversation'), { emailVerified: true });
    const admin = await sut.provisionPlatformAdmin(w.email('admin-conversation'));
    await sut.vetOrganizationAsAdmin(admin, ngo.organizationId);
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    h.vendors.anthropic.script(GRANT_TRACKER.replies);
    let last: DiscoveryMessageOutcome | null = null;
    for (const message of GRANT_TRACKER.ngoMessages) {
      last = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message });
      expect(last.ok).toBe(true);
      if (!last.ok) return;
    }
    const rows = await sut.turnRows(projectId);
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.length).toBeLessThanOrEqual(MAX_CONVERSATION_TURNS);
    expect(last?.ok && last.turn.elicitation).not.toBeNull();
    expect(grantTrackerOracleProblems(rows.at(-1)?.elicitation)).toEqual([]);
    const requests = h.vendors.anthropic.requests();
    requests.forEach((request, index) => expect(request.messages).toHaveLength(2 * index + 1));
    expect(requests.every((request) => request.system.map((block) => block.text).join('\n').includes(GRANT_TRACKER.intake.description))).toBe(true);
    expect(requests.every((request) => request.system[0].cached && !request.system[1].cached)).toBe(true);
    expect(requests.every((request) => request.model === DISCOVERY_REQUEST_SETTINGS.model)).toBe(true);
    requests.forEach((request) => expect(request.tools.map((tool) => tool.name)).toEqual(['record_elicitation', 'decline_off_topic']));
    const read = await sut.readConversation(ngo.session, projectId);
    expect(read.ok && read.value.conversation.elicitation).toEqual(rows.at(-1)?.elicitation);
  },
  integration: awaiting(AWAITED.anthropicLive),
});
atTest('AT-004.11', 'a new session reads the persisted conversation and resumes with full context after the daily reset', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-resume'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    h.vendors.anthropic.script(RESUME_TURNS.map((turn) => ({ kind: 'text', text: turn.reply, usage: turn.usage })));
    for (const turn of RESUME_TURNS) expect(await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId, message: turn.message,
    })).toMatchObject({ ok: true });
    const { session, rows } = await returnNextDay(sut, ngo, projectId);
    h.vendors.anthropic.script([{ kind: 'text', text: 'When should the reminder arrive?', usage: RESUME_TURNS[0].usage }]);
    expect(await sut.sendMessage(session, { organizationId: ngo.organizationId, projectId, message: 'Let us continue.' })).toMatchObject({ ok: true });
    const request = h.vendors.anthropic.requests().at(-1)!;
    expect(request.messages.slice(0, -1)).toEqual(rows.flatMap((row) => [
      { role: 'user', content: row.userMessage }, { role: 'assistant', content: row.assistantMessage },
    ]));
    expect(request.messages.slice(0, -1)).toHaveLength(6);
  },
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-resume'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    await sut.seedTurnsAsOperator(projectId, RESUME_TURNS);
    const { rows } = await returnNextDay(sut, ngo, projectId);
    const reserved = await sut.reserveTurnAsOperator({ accountId: ngo.accountId, organizationId: ngo.organizationId,
      projectId, message: 'Let us continue.', countedInputTokens: RESUME_TURNS[0].usage.inputTokens });
    expect(reserved.ok).toBe(true);
    if (!reserved.ok) return;
    try {
      expect(reserved.reservation.context.slice(0, -1)).toHaveLength(6);
      expect(reserved.reservation.context.slice(0, -1)).toEqual(rows.flatMap((row) => [
        { role: 'user', content: row.userMessage }, { role: 'assistant', content: row.assistantMessage },
      ]));
    } finally {
      expect(await sut.settleTurnAsOperator({ accountId: ngo.accountId, turnId: reserved.reservation.turn.id, outcome: 'failed' })).toMatchObject({ ok: true });
    }
  },
});
