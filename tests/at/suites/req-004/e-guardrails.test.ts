import { expect } from 'vitest';
import { atTest, CapabilityPending } from './_bind.ts';
import { AWAITED } from './_pending.ts';
import { discoveryWalletProblems } from '../req-002/_source-absences.ts';
import {
  freeCreditsOutsideMoneyProblems,
  noPlatformBreakerProblems,
  noSupplementalGrantPathProblems,
} from './_source-absences.ts';
import { GRANT_TRACKER } from './fixtures/grant-tracker.ts';
import type { DiscoverySut } from './_contract.ts';

const USAGE = { inputTokens: 900, outputTokens: 400 };
const MESSAGE = 'Hello';

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
