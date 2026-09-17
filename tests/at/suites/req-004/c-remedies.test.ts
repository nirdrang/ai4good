import { expect } from 'vitest';
import { atTest, CapabilityPending } from './_bind.ts';
import { AWAITED } from './_pending.ts';
import type { AnthropicMessagesSim } from '../../harness/contracts.ts';
import type { DiscoverySut, DiscoveryMessageOutcome } from './_contract.ts';
import type { NgoActor } from '../req-003/_contract.ts';

const INTAKE = { title: 'Grant deadline tracker', description: 'Two staff need reminders before funder reporting deadlines.' };
const USAGE = { inputTokens: 900, outputTokens: 400 };
const MESSAGE = 'Help us scope the deadline tracker.';
type Open = () => Promise<{ w: { email(name: string): string }; sut: DiscoverySut }>;
type Drive = (sut: DiscoverySut, ngo: NgoActor, projectId: string) => Promise<DiscoveryMessageOutcome>;
const loopDrive = (sim: AnthropicMessagesSim): Drive => async (sut, ngo, projectId) => {
  sim.script([{ kind: 'text', text: 'Which reporting deadlines matter most?', usage: USAGE }]);
  return sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: MESSAGE });
};
const operatorDrive: Drive = async (sut, ngo, projectId) => {
  const reserve = await sut.reserveTurnAsOperator({ accountId: ngo.accountId, organizationId: ngo.organizationId,
    projectId, message: MESSAGE, countedInputTokens: USAGE.inputTokens });
  if (!reserve.ok) return reserve;
  return sut.settleTurnAsOperator({ accountId: ngo.accountId, turnId: reserve.reservation.turn.id,
    outcome: 'completed', reply: 'Which reporting deadlines matter most?', usage: USAGE });
};
function remediesOf(reason: string): string[] {
  return (reason.split(` \u2014 `)[1] ?? '').split(', ').map((part) => part.replace(/^or /, ''));
}
async function proveUnverified(open: Open, drive: Drive, vettedGrant: number) {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-03a'), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
  await sut.drainAllowance(ngo.session, ngo.organizationId);
  const before = await sut.readAllowance(ngo.session, ngo.organizationId);
  const blocked = await drive(sut, ngo, projectId);
  expect(blocked).toMatchObject({ ok: false, kind: 'daily-allowance-exhausted', status: 409 });
  if (blocked.ok) return;
  const remedies = remediesOf(blocked.reason);
  expect(remedies).toHaveLength(3);
  expect(remedies[0]).toMatch(new RegExp(`get vetted \\(daily grant becomes ${vettedGrant}\\)`));
  expect(remedies[1]).toMatch(/fund project fuel/i);
  expect(remedies[2]).toMatch(/wait for the next UTC day/i);
  expect(await sut.turnRows(projectId)).toEqual([]);
  expect(await sut.readAllowance(ngo.session, ngo.organizationId)).toEqual(before);
}
async function proveVetted(open: Open, drive: Drive) {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-03b'), { emailVerified: true });
  const admin = await sut.provisionPlatformAdmin(w.email('admin-03b'));
  await sut.vetOrganizationAsAdmin(admin, ngo.organizationId);
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
  await sut.drainAllowance(ngo.session, ngo.organizationId);
  const before = await sut.readAllowance(ngo.session, ngo.organizationId);
  const blocked = await drive(sut, ngo, projectId);
  expect(blocked).toMatchObject({ ok: false, kind: 'daily-allowance-exhausted', status: 409 });
  if (blocked.ok) return;
  const remedies = remediesOf(blocked.reason);
  expect(remedies).toHaveLength(2);
  expect(blocked.reason).not.toMatch(/get vetted/i);
  expect(await sut.turnRows(projectId)).toEqual([]);
  expect(await sut.readAllowance(ngo.session, ngo.organizationId)).toEqual(before);
}

atTest('AT-004.03a', 'an unverified-tier NGO at zero credits is blocked with exactly three remedies', { surface: 'ui' }, {
  default: async ({ open }) => {
    const world = await open();
    return proveUnverified(async () => world, loopDrive(world.h.vendors.anthropic),
      world.h.config.get<number>('req-002.discovery.daily_credits.vetted'));
  },
  integration: async ({ open }) => {
    const world = await open();
    await proveUnverified(async () => world, operatorDrive,
      world.h.config.get<number>('req-002.discovery.daily_credits.vetted'));
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
});
atTest('AT-004.03b', 'a vetted NGO at zero credits is blocked without the get-vetted remedy', { surface: 'ui' }, {
  default: async ({ open }) => {
    const world = await open();
    return proveVetted(async () => world, loopDrive(world.h.vendors.anthropic));
  },
  integration: async ({ open }) => {
    const world = await open();
    await proveVetted(async () => world, operatorDrive);
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
});
