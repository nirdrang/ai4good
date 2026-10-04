import { expect } from 'vitest';
import { atTest } from './_bind.ts';
const USAGE = { inputTokens: 900, outputTokens: 400 };
const MESSAGE = 'Help us scope the deadline tracker.';
const OTHER_MESSAGE = 'What should the tracker do first?';
const LOST_MESSAGE = 'Which reminders go out first?';
import { GRANT_TRACKER } from './fixtures/grant-tracker.ts';

atTest('AT-004.39', 'failure releases its credit and the successful retry consumes only one credit', {
  default: async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('retry-39'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const reserved = await sut.reserveTurnAsOperator({
      accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
      message: MESSAGE,
    });
    expect(reserved).toMatchObject({ ok: true });
    if (!reserved.ok) return;
    expect(reserved.reservation.turn.billing).toBe('free');
    const failed = await sut.settleTurnAsOperator({
      accountId: ngo.accountId, turnId: reserved.reservation.turn.id, outcome: 'failed',
    });
    expect(failed).toMatchObject({ ok: true });
    if (!failed.ok) return;
    const afterFail = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(afterFail).toMatchObject({ ok: true });
    if (!afterFail.ok) return;
    const retry = await sut.reserveTurnAsOperator({
      accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
      message: MESSAGE,
    });
    expect(retry).toMatchObject({ ok: true });
    if (!retry.ok) return;
    expect(retry.reservation.turn.billing).toBe('free');
    expect(retry.reservation.turn.reserved_credits).toBe(1);
    const afterRetryReserve = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(afterRetryReserve.ok && afterRetryReserve.allowance.remaining).toBe(afterFail.allowance.remaining - 1);
    const completed = await sut.settleTurnAsOperator({
      accountId: ngo.accountId, turnId: retry.reservation.turn.id, outcome: 'completed',
      reply: 'Which reporting deadlines matter most?', usage: USAGE,
    });
    expect(completed).toMatchObject({ ok: true });
    if (!completed.ok) return;
    expect(completed.turn.billing).toBe('free');
    expect(completed.turn.chargedCredits).toBe(1);
    const afterRetrySettle = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(afterRetrySettle.ok && afterRetrySettle.allowance.remaining).toBe(afterFail.allowance.remaining - 1);
    const next = await sut.reserveTurnAsOperator({
      accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
      message: OTHER_MESSAGE,
    });
    expect(next).toMatchObject({ ok: true });
    if (!next.ok) return;
    expect(next.reservation.turn.billing).toBe('free');
    expect(await sut.settleTurnAsOperator({
      accountId: ngo.accountId, turnId: next.reservation.turn.id, outcome: 'failed',
    })).toMatchObject({ ok: true });
    const lost = await sut.reserveTurnAsOperator({
      accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
      message: LOST_MESSAGE,
    });
    expect(lost).toMatchObject({ ok: true });
    if (!lost.ok) return;
    await sut.backdateOpenTurnAsOperator(lost.reservation.turn.id, new Date(0).toISOString());
    const afterLoss = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(afterLoss).toMatchObject({ ok: true });
    if (!afterLoss.ok) return;
    const resent = await sut.reserveTurnAsOperator({
      accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
      message: LOST_MESSAGE,
    });
    expect(resent).toMatchObject({ ok: true });
    if (!resent.ok) return;
    expect(resent.reservation.turn.billing).toBe('free');
    expect(resent.reservation.turn.reserved_credits).toBe(1);
    const afterResend = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(afterResend.ok && afterResend.allowance.remaining).toBe(afterLoss.allowance.remaining);
  },
});
