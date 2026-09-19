import { expect } from 'vitest';
import { DISCOVERY_REQUEST_SETTINGS } from '../../../../supabase/functions/_shared/discovery-metering.ts';
import { renderScopeMarkdown } from '../../../../supabase/functions/_shared/scope.ts';
import { atTest } from './_bind.ts';
import type { DiscoverySut, OperatorScopeBeginOutcome, ScopeView, ScopeWriteOutcome, Session } from './_contract.ts';
import { GRANT_TRACKER, GRANT_TRACKER_ELICITATION } from './fixtures/grant-tracker.ts';
import { GRANT_TRACKER_SCOPE, GRANT_TRACKER_SCOPE_REPLY } from './fixtures/scope-tiers.ts';

const ELICITATION_REPLY = {
  kind: 'tool' as const, name: 'record_elicitation', input: GRANT_TRACKER_ELICITATION,
  text: 'I recorded the shared deadline list and reminders.',
  usage: { inputTokens: 1600, outputTokens: 80 },
};
const USAGE = { inputTokens: 900, outputTokens: 400 };
const MESSAGE = 'Help us scope the deadline tracker.';
const OTHER_MESSAGE = 'What should the tracker do first?';
const REASON_ONE = 'The reminder channel is missing.';
const REASON_TWO = 'The stack should start smaller.';

function usedOf(rows: readonly ScopeView[]): number {
  return rows.filter((row) => row.version > 1 && row.status !== 'failed' && row.status !== 'escalated').length;
}

async function seedCompletedElicitation(sut: DiscoverySut, projectId: string) {
  await sut.seedTurnsAsOperator(projectId, [{
    message: 'That covers it.',
    reply: 'I recorded the shared deadline list and reminders.',
    usage: { inputTokens: 1600, outputTokens: 80 },
    elicitation: GRANT_TRACKER_ELICITATION,
  }]);
}

async function commitOperatorScope(
  sut: DiscoverySut, accountId: string, projectId: string, begun: Extract<OperatorScopeBeginOutcome, { ok: true }>,
): Promise<ScopeWriteOutcome> {
  return sut.commitScopeAsOperator({
    accountId, projectId, scopeId: begun.scopeId, outcome: 'completed',
    contract: GRANT_TRACKER_SCOPE,
    markdown: renderScopeMarkdown(GRANT_TRACKER_SCOPE, { title: GRANT_TRACKER.intake.title }),
    labels: [...GRANT_TRACKER_SCOPE.causeLabels],
    servedModel: DISCOVERY_REQUEST_SETTINGS.model,
    inputTokens: 1800, outputTokens: 640,
  });
}

async function operatorGenerate(
  sut: DiscoverySut, ngo: { accountId: string; organizationId: string }, projectId: string,
): Promise<ScopeWriteOutcome> {
  const begun = await sut.beginScopeAsOperator({
    accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
  });
  expect(begun.ok).toBe(true);
  if (!begun.ok) return begun;
  return commitOperatorScope(sut, ngo.accountId, projectId, begun);
}

async function operatorRegenerate(
  sut: DiscoverySut, ngo: { accountId: string; organizationId: string }, projectId: string, reason: string,
): Promise<ScopeWriteOutcome> {
  const begun = await sut.beginScopeAsOperator({
    accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
    action: 'regenerate', reason,
  });
  expect(begun.ok).toBe(true);
  if (!begun.ok) return begun;
  return commitOperatorScope(sut, ngo.accountId, projectId, begun);
}

function expectRegenVersion(rows: readonly ScopeView[], version: number, reason: string, status: ScopeView['status']) {
  const row = rows.find((item) => item.version === version);
  expect(row).toMatchObject({ version, reason, status });
}

async function proveNoReasonRefused(
  sut: DiscoverySut, session: Session, organizationId: string, projectId: string,
) {
  const refused = await sut.writeScope(session, {
    organizationId, projectId, action: 'regenerate', reason: '',
  });
  expect(refused).toMatchObject({ ok: false, kind: 'invalid-request' });
}

atTest('AT-004.37', 'regeneration logs a reason, versions the scope, and costs zero credits', {
  loop: async ({ open }) => {
    const { w, sut, h } = await open();
    const ngo = await sut.provisionNgo(w.email('regen-37'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const bound = h.config.get<number>('req-004.discovery.regeneration_bound');
    h.vendors.anthropic.script([ELICITATION_REPLY, GRANT_TRACKER_SCOPE_REPLY, GRANT_TRACKER_SCOPE_REPLY, GRANT_TRACKER_SCOPE_REPLY]);
    expect(await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId, message: 'That covers it.',
    })).toMatchObject({ ok: true, scopeReady: true });
    const before = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    const generated = await sut.writeScope(ngo.session, {
      organizationId: ngo.organizationId, projectId, action: 'generate',
    });
    expect(generated).toMatchObject({ ok: true, scope: { version: 1, status: 'current', reason: null } });
    const first = await sut.writeScope(ngo.session, {
      organizationId: ngo.organizationId, projectId, action: 'regenerate', reason: REASON_ONE,
    });
    expect(first).toMatchObject({ ok: true, scope: { version: 2, status: 'current', reason: REASON_ONE } });
    const second = await sut.writeScope(ngo.session, {
      organizationId: ngo.organizationId, projectId, action: 'regenerate', reason: REASON_TWO,
    });
    expect(second).toMatchObject({ ok: true, scope: { version: 3, status: 'current', reason: REASON_TWO } });
    const rows = await sut.scopeRows(projectId);
    expect(rows.find((row) => row.version === 1)).toMatchObject({ status: 'superseded', reason: null });
    expectRegenVersion(rows, 2, REASON_ONE, 'superseded');
    expectRegenVersion(rows, 3, REASON_TWO, 'current');
    expect(usedOf(rows)).toBeLessThanOrEqual(bound);
    const after = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(after.ok && after.allowance.remaining).toBe(before.allowance.remaining);
    await proveNoReasonRefused(sut, ngo.session, ngo.organizationId, projectId);
  },
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const ngo = await sut.provisionNgo(w.email('regen-37'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const bound = h.config.get<number>('req-004.discovery.regeneration_bound');
    await seedCompletedElicitation(sut, projectId);
    const before = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(await operatorGenerate(sut, ngo, projectId)).toMatchObject({
      ok: true, scope: { version: 1, status: 'current', reason: null },
    });
    expect(await operatorRegenerate(sut, ngo, projectId, REASON_ONE)).toMatchObject({
      ok: true, scope: { version: 2, status: 'current', reason: REASON_ONE },
    });
    expect(await operatorRegenerate(sut, ngo, projectId, REASON_TWO)).toMatchObject({
      ok: true, scope: { version: 3, status: 'current', reason: REASON_TWO },
    });
    const rows = await sut.scopeRows(projectId);
    expect(rows.find((row) => row.version === 1)).toMatchObject({ status: 'superseded', reason: null });
    expectRegenVersion(rows, 2, REASON_ONE, 'superseded');
    expectRegenVersion(rows, 3, REASON_TWO, 'current');
    expect(usedOf(rows)).toBeLessThanOrEqual(bound);
    const after = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(after.ok && after.allowance.remaining).toBe(before.allowance.remaining);
    await proveNoReasonRefused(sut, ngo.session, ngo.organizationId, projectId);
  },
});

async function proveExhaustion(
  world: { w: { email(name: string): string }; sut: DiscoverySut; h: { config: { get<T>(key: string): T } } },
  sim?: { requests(): unknown[] },
) {
  const { w, sut, h } = world;
  await sut.provisionPlatformAdmin(w.email('admin-38'));
  const ngo = await sut.provisionNgo(w.email('regen-38'), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
  const bound = h.config.get<number>('req-004.discovery.regeneration_bound');
  await seedCompletedElicitation(sut, projectId);
  expect((await operatorGenerate(sut, ngo, projectId)).ok).toBe(true);
  for (let i = 0; i < bound; i += 1) {
    const regenerated = await operatorRegenerate(sut, ngo, projectId, `Regeneration ${i + 1} needs a different split.`);
    expect(regenerated.ok).toBe(true);
    if (!regenerated.ok) return;
    expect(usedOf(await sut.scopeRows(projectId))).toBeLessThanOrEqual(bound);
  }
  expect(usedOf(await sut.scopeRows(projectId))).toBe(bound);
  const requestsBefore = sim?.requests().length;
  const exhaustedReason = 'Please try one more regeneration.';
  const exhausted = await sut.writeScope(ngo.session, {
    organizationId: ngo.organizationId, projectId, action: 'regenerate', reason: exhaustedReason,
  });
  expect(exhausted).toMatchObject({ ok: true, escalated: true });
  if (requestsBefore !== undefined && sim !== undefined) expect(sim.requests()).toHaveLength(requestsBefore);
  const rows = await sut.scopeRows(projectId);
  expect(rows.filter((row) => row.status === 'generating')).toHaveLength(0);
  const escalated = rows.find((row) => row.status === 'escalated');
  expect(escalated).toMatchObject({ status: 'escalated', reason: exhaustedReason });
  expect(await sut.notificationEvents('discovery.regeneration_exhausted')).toHaveLength(1);
  const again = await sut.writeScope(ngo.session, {
    organizationId: ngo.organizationId, projectId, action: 'regenerate', reason: 'And again after escalation.',
  });
  expect(again).toMatchObject({ ok: true, escalated: true });
  expect(await sut.scopeRows(projectId)).toHaveLength(rows.length);
  expect(await sut.notificationEvents('discovery.regeneration_exhausted')).toHaveLength(1);
}

atTest('AT-004.38', 'exhausting the regeneration bound escalates once and does not call the model', {
  default: async ({ open }) => proveExhaustion(await open()),
  loop: async ({ open }) => {
    const world = await open();
    return proveExhaustion(world, world.h.vendors.anthropic);
  },
});

atTest('AT-004.39', 'a retry after a failed turn costs zero credits and a different message is free again', {
  default: async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('retry-39'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const reserved = await sut.reserveTurnAsOperator({
      accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
      message: MESSAGE, countedInputTokens: USAGE.inputTokens,
    });
    expect(reserved.ok).toBe(true);
    if (!reserved.ok) return;
    expect(reserved.reservation.turn.billing).toBe('free');
    const failed = await sut.settleTurnAsOperator({
      accountId: ngo.accountId, turnId: reserved.reservation.turn.id, outcome: 'failed',
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    const afterFail = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(afterFail.ok).toBe(true);
    if (!afterFail.ok) return;
    const retry = await sut.reserveTurnAsOperator({
      accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
      message: MESSAGE, countedInputTokens: USAGE.inputTokens,
    });
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.reservation.turn.billing).toBe('retry');
    expect(retry.reservation.turn.reserved_credits).toBe(0);
    const afterRetryReserve = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(afterRetryReserve.ok && afterRetryReserve.allowance.remaining).toBe(afterFail.allowance.remaining);
    const completed = await sut.settleTurnAsOperator({
      accountId: ngo.accountId, turnId: retry.reservation.turn.id, outcome: 'completed',
      reply: 'Which reporting deadlines matter most?', usage: USAGE,
    });
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    expect(completed.turn.billing).toBe('retry');
    expect(completed.turn.chargedCredits).toBe(0);
    const afterRetrySettle = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(afterRetrySettle.ok && afterRetrySettle.allowance.remaining).toBe(afterFail.allowance.remaining);
    const next = await sut.reserveTurnAsOperator({
      accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
      message: OTHER_MESSAGE, countedInputTokens: USAGE.inputTokens,
    });
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.reservation.turn.billing).toBe('free');
    expect(await sut.settleTurnAsOperator({
      accountId: ngo.accountId, turnId: next.reservation.turn.id, outcome: 'failed',
    })).toMatchObject({ ok: true });
  },
});
