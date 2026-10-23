import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import { discoveryScreens } from './_screen.ts';
import { expectExhaustedScreen } from './_flows.ts';
import type { AnthropicMessagesSim } from '../../harness/contracts.ts';
import type { DiscoverySut, DiscoveryMessageOutcome } from './_contract.ts';
import type { NgoActor } from '../req-003/_contract.ts';

const withDiscovery = discoveryScreens();
const INTAKE = { title: 'Grant deadline tracker', description: 'Two staff need reminders before funder reporting deadlines.' };
const USAGE = { inputTokens: 900, outputTokens: 400 };
const MESSAGE = 'Help us scope the deadline tracker.';
const UNVERIFIED_PIN = 'req-002.discovery.daily_credits.unverified';
const VETTED_PIN = 'req-002.discovery.daily_credits.vetted';
type World = { w: { email(name: string): string }; sut: DiscoverySut };
type Drive = (sut: DiscoverySut, ngo: NgoActor, projectId: string) => Promise<DiscoveryMessageOutcome>;
const loopDrive = (sim: AnthropicMessagesSim): Drive => async (sut, ngo, projectId) => {
  sim.script([{ kind: 'text', text: 'Which reporting deadlines matter most?', usage: USAGE }]);
  return sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: MESSAGE });
};
const operatorDrive: Drive = async (sut, ngo, projectId) => {
  const reserve = await sut.reserveTurnAsOperator({ accountId: ngo.accountId, organizationId: ngo.organizationId,
    projectId, message: MESSAGE});
  if (!reserve.ok) return reserve;
  return sut.settleTurnAsOperator({ accountId: ngo.accountId, turnId: reserve.reservation.turn.id,
    outcome: 'completed', reply: 'Which reporting deadlines matter most?', usage: USAGE });
};
function remediesOf(reason: string): string[] {
  return (reason.split(` — `)[1] ?? '').split(', ').map((part) => part.replace(/^or /, ''));
}
async function proveBlocked(sut: DiscoverySut, ngo: NgoActor, projectId: string, drive: Drive) {
  const before = await sut.readAllowance(ngo.session, ngo.organizationId);
  const blocked = await drive(sut, ngo, projectId);
  expect(blocked).toMatchObject({ ok: false, kind: 'daily-limit', status: 409 });
  if (blocked.ok) return before;
  expect(remediesOf(blocked.reason)).toEqual(['fund project fuel to continue now', 'wait for the next UTC day']);
  expect(blocked.reason).not.toMatch(/get vetted/i);
  expect(await sut.turnRows(projectId)).toEqual([]);
  expect(await sut.readAllowance(ngo.session, ngo.organizationId)).toEqual(before);
  return before;
}
async function proveUnverified({ w, sut }: World, drive: Drive, grants: { unverified: number; vetted: number }) {
  const ngo = await sut.provisionNgo(w.email('ngo-03a'), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
  await sut.drainAllowance(ngo.session, ngo.organizationId);
  const before = await proveBlocked(sut, ngo, projectId, drive);
  expect(before).toMatchObject({ ok: true, allowance: { vetted: false, dailyGrant: grants.unverified, remaining: 0 } });
  if (!before.ok) return;
  const admin = await sut.provisionPlatformAdmin(w.email('admin-03a'));
  await sut.vetOrganizationAsAdmin(admin, ngo.organizationId);
  expect(await sut.readAllowance(ngo.session, ngo.organizationId), 'vetting raises the grant and keeps the consumed turns').toMatchObject({
    ok: true,
    allowance: {
      vetted: true,
      dailyGrant: grants.vetted,
      spentToday: before.allowance.spentToday,
      remaining: grants.vetted - before.allowance.spentToday,
    },
  });
}
async function proveVetted({ w, sut }: World, drive: Drive, vettedGrant: number) {
  const ngo = await sut.provisionNgo(w.email('ngo-03b'), { emailVerified: true });
  const admin = await sut.provisionPlatformAdmin(w.email('admin-03b'));
  await sut.vetOrganizationAsAdmin(admin, ngo.organizationId);
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
  await sut.drainAllowance(ngo.session, ngo.organizationId);
  const before = await proveBlocked(sut, ngo, projectId, drive);
  expect(before).toMatchObject({ ok: true, allowance: { vetted: true, dailyGrant: vettedGrant, remaining: 0 } });
}

const TIMEOUT = { timeoutMs: { loop: 120_000, integration: 900_000 } };

atTest('AT-004.03a', 'an unvetted NGO with no free turn and no fuel is blocked with two remedies, keeps its draft, and vetting raises the grant without resetting used turns', { surface: 'ui', ...TIMEOUT }, {
  default: async (ctx) => {
    const world = await ctx.open();
    const grants = { unverified: world.h.config.get<number>(UNVERIFIED_PIN), vetted: world.h.config.get<number>(VETTED_PIN) };
    await proveUnverified(world, loopDrive(world.h.vendors.anthropic), grants);
    await withDiscovery(ctx, { scenario: 'daily-empty', viewport: 'desktop' }, (screen) => expectExhaustedScreen(screen, grants.unverified));
  },
  integration: async (ctx) => {
    const world = await ctx.open();
    const grants = { unverified: world.h.config.get<number>(UNVERIFIED_PIN), vetted: world.h.config.get<number>(VETTED_PIN) };
    await proveUnverified(world, operatorDrive, grants);
    await withDiscovery(ctx, { scenario: 'daily-empty', viewport: 'desktop' }, (screen) => expectExhaustedScreen(screen, grants.unverified));
  },
});
atTest('AT-004.03b', 'a vetted NGO with no free turn and no fuel is blocked with the same two remedies and keeps its draft', { surface: 'ui', ...TIMEOUT }, {
  default: async (ctx) => {
    const world = await ctx.open();
    await proveVetted(world, loopDrive(world.h.vendors.anthropic), world.h.config.get<number>(VETTED_PIN));
    await withDiscovery(ctx, { scenario: 'daily-empty', viewport: 'desktop', vetted: true }, (screen) => expectExhaustedScreen(screen, null));
  },
  integration: async (ctx) => {
    const world = await ctx.open();
    const vettedGrant = world.h.config.get<number>(VETTED_PIN);
    await proveVetted(world, operatorDrive, vettedGrant);
    await withDiscovery(ctx, { scenario: 'daily-empty', viewport: 'desktop', vetted: true }, (screen) => expectExhaustedScreen(screen, vettedGrant));
  },
});
