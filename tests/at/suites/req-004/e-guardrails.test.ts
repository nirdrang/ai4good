import { expect } from 'vitest';
import { atTest, CapabilityPending } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';
import { DISCOVERY_STOP_RULE } from '../../../../supabase/functions/_shared/discovery-prompt.ts';
import { SCOPE_COPY } from '../../../../supabase/functions/_shared/scope-copy.ts';
import { discoveryWalletProblems } from '../req-002/_source-absences.ts';
import {
  freeCreditsOutsideMoneyProblems,
  noPlatformBreakerProblems,
  noSupplementalGrantPathProblems,
} from './_source-absences.ts';
import { stopRulePinProblems } from './_source-pins.ts';
import { GRANT_TRACKER, GRANT_TRACKER_ELICITATION } from './fixtures/grant-tracker.ts';
import type { DiscoverySut } from './_contract.ts';

const USAGE = { inputTokens: 900, outputTokens: 400 };
const MESSAGE = 'Hello';
const OFF_TOPIC = 'Please translate this letter into French.';
const STOP = 'Stop here and write it up.';
const DECLINE_TEXT = 'I can only help you scope this software need. What should the tracker do first?';
const OPEN_QUESTIONS = ['Who else will use the tool?', 'What reminder channel is required?'];

atTest('AT-004.12', 'free Discovery declines an unrelated task and redirects to scoping', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-12'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    h.vendors.anthropic.script([{
      kind: 'tool', name: 'decline_off_topic', input: { requested: 'translate this letter' },
      text: DECLINE_TEXT, usage: USAGE,
    }]);
    const sent = await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId, message: OFF_TOPIC,
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    expect(sent.reply).toBe(DECLINE_TEXT);
    expect(sent.turn.offTopic).toBe(true);
    expect(sent.guardrail).toEqual({ offTopicCount: 1, flagged: false, notice: null });
    const request = h.vendors.anthropic.requests()[0];
    expect(request.tools.map((tool) => tool.name)).toEqual(['record_elicitation', 'decline_off_topic']);
  },
  integration: awaiting(AWAITED.anthropicLive),
});

atTest('AT-004.13', 'repeated off-topic requests on free credits flag once and never lock the NGO out', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    await sut.provisionPlatformAdmin(w.email('admin-13'));
    const ngo = await sut.provisionNgo(w.email('ngo-13'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const strikes = h.config.get<number>('req-004.discovery.off_topic_flag_strikes');
    for (let i = 0; i < strikes; i += 1) {
      const reserved = await sut.reserveTurnAsOperator({
        accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
        message: OFF_TOPIC, countedInputTokens: USAGE.inputTokens,
      });
      expect(reserved.ok).toBe(true);
      if (!reserved.ok) return;
      const settled = await sut.settleTurnAsOperator({
        accountId: ngo.accountId, turnId: reserved.reservation.turn.id, outcome: 'completed',
        reply: DECLINE_TEXT, usage: USAGE, offTopic: true,
      });
      expect(settled.ok).toBe(true);
      if (!settled.ok) return;
      if (i + 1 < strikes) {
        expect(settled.guardrail).toEqual({ offTopicCount: i + 1, flagged: false, notice: null });
      } else {
        expect(settled.guardrail).toEqual({
          offTopicCount: strikes, flagged: true, notice: SCOPE_COPY.offTopicNotice,
        });
      }
    }
    expect(await sut.notificationEvents('discovery.off_topic_flagged')).toHaveLength(1);
    const extraReserve = await sut.reserveTurnAsOperator({
      accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
      message: OFF_TOPIC, countedInputTokens: USAGE.inputTokens,
    });
    expect(extraReserve.ok).toBe(true);
    if (!extraReserve.ok) return;
    const extra = await sut.settleTurnAsOperator({
      accountId: ngo.accountId, turnId: extraReserve.reservation.turn.id, outcome: 'completed',
      reply: DECLINE_TEXT, usage: USAGE, offTopic: true,
    });
    expect(extra.ok).toBe(true);
    if (!extra.ok) return;
    expect(extra.guardrail).toMatchObject({ flagged: true, notice: SCOPE_COPY.offTopicNotice });
    expect(await sut.notificationEvents('discovery.off_topic_flagged')).toHaveLength(1);
    const next = await sut.reserveTurnAsOperator({
      accountId: ngo.accountId, organizationId: ngo.organizationId, projectId,
      message: MESSAGE, countedInputTokens: USAGE.inputTokens,
    });
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(await sut.settleTurnAsOperator({
      accountId: ngo.accountId, turnId: next.reservation.turn.id, outcome: 'failed',
    })).toMatchObject({ ok: true });
  },
});

atTest('AT-004.14', 'the NGO can stop at any time and Discovery records what it has with open questions', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    expect(stopRulePinProblems()).toEqual([]);
    const ngo = await sut.provisionNgo(w.email('ngo-14'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const elicitation = { ...GRANT_TRACKER_ELICITATION, openQuestions: OPEN_QUESTIONS };
    h.vendors.anthropic.script([
      { kind: 'text', text: 'Who will use the tracker?', usage: USAGE },
      { kind: 'text', text: 'How do you track deadlines today?', usage: USAGE },
      {
        kind: 'tool', name: 'record_elicitation', input: elicitation,
        text: 'I recorded what we have. Two questions stay open.', usage: USAGE,
      },
    ]);
    expect(await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId, message: MESSAGE,
    })).toMatchObject({ ok: true });
    expect(await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId, message: 'Two staff.',
    })).toMatchObject({ ok: true });
    const sent = await sut.sendMessage(ngo.session, {
      organizationId: ngo.organizationId, projectId, message: STOP,
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    expect(sent.scopeReady).toBe(true);
    expect(sent.elicitation).toEqual(elicitation);
    expect(sent.turn.elicitation).toEqual(elicitation);
    expect(sent.elicitation?.openQuestions).toHaveLength(2);
    const request = h.vendors.anthropic.requests().at(-1)!;
    expect(request.system[0].cached).toBe(true);
    expect(request.system[0].text).toContain(DISCOVERY_STOP_RULE);
  },
  integration: awaiting(AWAITED.anthropicLive),
});

atTest('AT-004.15', 'a funded project carries no free-phase guardrail', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-15'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const strikes = h.config.get<number>('req-004.discovery.off_topic_flag_strikes');
    await sut.setProjectFundingAsOperator(projectId, {
      fundedAt: new Date().toISOString(), fuelMicros: 5_000_000,
    });
    const past = strikes + 2;
    h.vendors.anthropic.script(Array.from({ length: past }, () => ({
      kind: 'text' as const, text: DECLINE_TEXT, usage: USAGE,
    })));
    for (let i = 0; i < past; i += 1) {
      const sent = await sut.sendMessage(ngo.session, {
        organizationId: ngo.organizationId, projectId, message: OFF_TOPIC,
      });
      expect(sent.ok).toBe(true);
      if (!sent.ok) return;
      expect(sent.guardrail).toBeNull();
      expect(sent.turn.offTopic).toBe(false);
    }
    const requests = h.vendors.anthropic.requests();
    expect(requests).toHaveLength(past);
    requests.forEach((request) => expect(request.tools.map((tool) => tool.name)).toEqual(['record_elicitation']));
    expect(await sut.notificationEvents('discovery.off_topic_flagged')).toEqual([]);
  },
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-15'), { emailVerified: true });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    await sut.setProjectFundingAsOperator(projectId, { fundedAt: new Date().toISOString(), fuelMicros: 1 });
  },
});

atTest('AT-004.41', 'an email-unverified account is blocked from any Discovery message', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-41'), { emailVerified: false });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const before = await sut.readAllowance(ngo.session, ngo.organizationId);
    const blocked = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: MESSAGE });
    expect(blocked).toMatchObject({ ok: false, kind: 'email-unverified', status: 409 });
    if (blocked.ok) return;
    expect(blocked.reason).toMatch(/verif/i);
    expect(blocked.reason).toMatch(/email/i);
    expect(await sut.turnRows(projectId)).toEqual([]);
    expect(await sut.readAllowance(ngo.session, ngo.organizationId)).toEqual(before);
    await sut.setEmailVerifiedAsOperator(ngo.accountId, true);
    h.vendors.anthropic.script([{ kind: 'text', text: 'Which reporting deadlines matter most?', usage: USAGE }]);
    const sent = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: MESSAGE });
    expect(sent.ok).toBe(true);
  },
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-41'), { emailVerified: false });
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
    const before = await sut.readAllowance(ngo.session, ngo.organizationId);
    const blocked = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: MESSAGE });
    expect(blocked).toMatchObject({ ok: false, kind: 'email-unverified', status: 409 });
    if (blocked.ok) return;
    expect(blocked.reason).toMatch(/verif/i);
    expect(blocked.reason).toMatch(/email/i);
    expect(await sut.turnRows(projectId)).toEqual([]);
    expect(await sut.readAllowance(ngo.session, ngo.organizationId)).toEqual(before);
    await sut.setEmailVerifiedAsOperator(ngo.accountId, true);
    const reserved = await sut.reserveTurnAsOperator({
      accountId: ngo.accountId, organizationId: ngo.organizationId, projectId, message: MESSAGE, countedInputTokens: USAGE.inputTokens,
    });
    expect(reserved.ok).toBe(true);
    if (!reserved.ok) return;
    await sut.settleTurnAsOperator({ accountId: ngo.accountId, turnId: reserved.reservation.turn.id, outcome: 'failed' });
  },
});

async function proveSwitchOff(sut: DiscoverySut, w: { email(name: string): string }, sendBlocked: (args: {
  sut: DiscoverySut; ngo: Awaited<ReturnType<DiscoverySut['provisionNgo']>>; projectId: string;
}) => Promise<void>) {
  const admin = await sut.provisionPlatformAdmin(w.email('admin-42'));
  const ngo = await sut.provisionNgo(w.email('ngo-42'), { emailVerified: true });
  const other = await sut.provisionNgo(w.email('ngo-42-other'), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
  const otherNeed = await sut.startDiscoveryNeed(other.session, other.organizationId, GRANT_TRACKER.intake);
  const off = await sut.setDiscoverySwitch(admin, { organizationId: ngo.organizationId, enabled: false, reason: 'abuse report 42' });
  expect(off).toMatchObject({ ok: true, discoveryEnabled: false, changed: true });
  await sendBlocked({ sut, ngo, projectId });
  expect(await sut.turnRows(projectId)).toEqual([]);
  expect((await sut.discoverySwitchAuditEvents(ngo.organizationId)).map((event) => event.detail.enabled)).toEqual([false]);
  expect(await sut.setDiscoverySwitch(ngo.session, { organizationId: ngo.organizationId, enabled: true, reason: 'x' }))
    .toMatchObject({ ok: false, kind: 'not-a-platform-admin', status: 403 });
  return { other, otherProjectId: otherNeed.projectId };
}

atTest('AT-004.42', 'a platform admin switches Discovery off for one NGO and the next message is blocked', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const world = await proveSwitchOff(sut, w, async ({ sut: inner, ngo, projectId }) => {
      const blocked = await inner.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: MESSAGE });
      expect(blocked).toMatchObject({ ok: false, kind: 'discovery-disabled', status: 409 });
    });
    h.vendors.anthropic.script([{ kind: 'text', text: 'Which reporting deadlines matter most?', usage: USAGE }]);
    const otherSent = await sut.sendMessage(world.other.session, {
      organizationId: world.other.organizationId, projectId: world.otherProjectId, message: MESSAGE,
    });
    expect(otherSent.ok).toBe(true);
  },
  integration: async ({ open }) => {
    const { w, sut } = await open();
    const world = await proveSwitchOff(sut, w, async ({ sut: inner, ngo, projectId }) => {
      const blocked = await inner.reserveTurnAsOperator({
        accountId: ngo.accountId, organizationId: ngo.organizationId, projectId, message: MESSAGE, countedInputTokens: USAGE.inputTokens,
      });
      expect(blocked).toMatchObject({ ok: false, kind: 'discovery-disabled', status: 409 });
    });
    const otherReserved = await sut.reserveTurnAsOperator({
      accountId: world.other.accountId, organizationId: world.other.organizationId, projectId: world.otherProjectId,
      message: MESSAGE, countedInputTokens: USAGE.inputTokens,
    });
    expect(otherReserved.ok).toBe(true);
    if (!otherReserved.ok) return;
    await sut.settleTurnAsOperator({ accountId: world.other.accountId, turnId: otherReserved.reservation.turn.id, outcome: 'failed' });
  },
});

atTest('AT-004.43', 'no admin path grants supplemental free credits', {
  default: async ({ open }) => {
    await open();
    expect(noSupplementalGrantPathProblems()).toEqual([]);
  },
  integration: async ({ open }) => {
    await open();
    expect(noSupplementalGrantPathProblems()).toEqual([]);
  },
});

atTest('AT-004.44', 'caps bind per NGO and there is no platform-wide Discovery circuit breaker', {
  default: async ({ open }) => {
    await open();
    expect(noPlatformBreakerProblems()).toEqual([]);
  },
  integration: async ({ open }) => {
    await open();
    expect(noPlatformBreakerProblems()).toEqual([]);
  },
});

atTest('AT-004.45', 'free credits are never purchasable and live outside the money ledger', {
  default: async ({ open }) => {
    await open();
    expect(discoveryWalletProblems()).toEqual([]);
    expect(freeCreditsOutsideMoneyProblems()).toEqual([]);
  },
  integration: async ({ open }) => {
    await open();
    expect(discoveryWalletProblems()).toEqual([]);
    expect(freeCreditsOutsideMoneyProblems()).toEqual([]);
    throw new CapabilityPending([AWAITED.projectFuelCheckout]);
  },
});
