import { expect } from 'vitest';
import { atTest, CapabilityPending } from './_bind.ts';
import { AWAITED } from './_pending.ts';
import type { AnthropicMessagesSim } from '../../harness/contracts.ts';
import type { DiscoverySut, DiscoveryMessageOutcome } from './_contract.ts';
import type { NgoActor } from '../req-003/_contract.ts';

const INTAKE = { title: 'Grant deadline tracker', description: 'Two staff need reminders before funder reporting deadlines.' };
const USAGE = { inputTokens: 900, outputTokens: 400 };
const MESSAGE = 'Help us scope the deadline tracker.';
const FUEL = 5_000_000;
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
async function proveExhausted(open: Open, drive: Drive, name: string) {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email(name), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
  await sut.setProjectFundingAsOperator(projectId, { fundedAt: new Date().toISOString(), fuelMicros: 0 });
  const before = await sut.readAllowance(ngo.session, ngo.organizationId);
  const refused = await drive(sut, ngo, projectId);
  expect(refused).toMatchObject({ ok: false, kind: 'fuel-exhausted', status: 409 });
  if (refused.ok) return;
  expect(refused.reason).toMatch(/top up project fuel/i);
  expect(await sut.readAllowance(ngo.session, ngo.organizationId)).toEqual(before);
  expect(await sut.turnRows(projectId)).toEqual([]);
}
async function proveFundedBillsFuel(open: Open, drive: Drive) {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-04'), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
  await sut.setProjectFundingAsOperator(projectId, { fundedAt: new Date().toISOString(), fuelMicros: FUEL });
  const before = await sut.readAllowance(ngo.session, ngo.organizationId);
  expect(before.ok).toBe(true);
  const sent = await drive(sut, ngo, projectId);
  expect(sent.ok).toBe(true);
  if (!sent.ok || !before.ok) return;
  expect(sent.turn.billing).toBe('fuel');
  expect(sent.turn.reservedCredits).toBe(0);
  expect(await sut.readAllowance(ngo.session, ngo.organizationId)).toEqual(before);
}
async function proveIsolation(open: Open, drive: Drive) {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-05'), { emailVerified: true });
  const a = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, { ...INTAKE, title: 'Funded tracker' });
  const b = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, { ...INTAKE, title: 'Unfunded tracker' });
  await sut.setProjectFundingAsOperator(a.projectId, { fundedAt: new Date().toISOString(), fuelMicros: FUEL });
  const before = await sut.readAllowance(ngo.session, ngo.organizationId);
  expect(before.ok).toBe(true);
  if (!before.ok) return;
  const fuelBefore = await sut.projectFundingAsOperator(a.projectId);
  const sentA = await drive(sut, ngo, a.projectId);
  expect(sentA.ok).toBe(true);
  if (!sentA.ok) return;
  expect(sentA.turn.billing).toBe('fuel');
  expect(sentA.turn.reservedCredits).toBe(0);
  const fuelAfter = await sut.projectFundingAsOperator(a.projectId);
  expect(fuelAfter.fuelMicros).toBe(fuelBefore.fuelMicros - sentA.turn.actualMicros!);
  expect(await sut.readAllowance(ngo.session, ngo.organizationId)).toEqual(before);
  const sentB = await drive(sut, ngo, b.projectId);
  expect(sentB.ok).toBe(true);
  if (!sentB.ok) return;
  expect(sentB.turn.billing).toBe('free');
  const after = await sut.readAllowance(ngo.session, ngo.organizationId);
  expect(after.ok && after.allowance.remaining).toBe(before.allowance.remaining - sentB.turn.chargedCredits!);
}
async function proveSwitch(open: Open, drive: Drive) {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-06'), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
  const first = await drive(sut, ngo, projectId);
  expect(first.ok).toBe(true);
  if (!first.ok) return;
  expect(first.turn.billing).toBe('free');
  await sut.setProjectFundingAsOperator(projectId, { fundedAt: new Date().toISOString(), fuelMicros: FUEL });
  const second = await drive(sut, ngo, projectId);
  expect(second.ok).toBe(true);
  if (!second.ok) return;
  const third = await drive(sut, ngo, projectId);
  expect(third.ok).toBe(true);
  if (!third.ok) return;
  expect(second.turn.billing).toBe('fuel');
  expect(third.turn.billing).toBe('fuel');
}
async function proveSettings(open: Open, drive: Drive) {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-09'), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
  const free = await drive(sut, ngo, projectId);
  expect(free.ok).toBe(true);
  if (!free.ok) return;
  const before = await sut.readAllowance(ngo.session, ngo.organizationId);
  await sut.setProjectFundingAsOperator(projectId, { fundedAt: new Date().toISOString(), fuelMicros: FUEL });
  expect(await sut.readAllowance(ngo.session, ngo.organizationId)).toEqual(before);
  const funded = await drive(sut, ngo, projectId);
  expect(funded.ok).toBe(true);
  if (!funded.ok) return;
  expect(funded.turn.billing).toBe('fuel');
  expect(funded.turn.requestSettings).toEqual(free.turn.requestSettings);
}

atTest('AT-004.04', 'a funded project bills fuel and never the free pool', {
  default: async ({ open }) => { const world = await open(); return proveFundedBillsFuel(async () => world, loopDrive(world.h.vendors.anthropic)); },
  integration: async ({ open }) => {
    const world = await open();
    await proveExhausted(async () => world, operatorDrive, 'ngo-04');
    throw new CapabilityPending([AWAITED.projectFuelCheckout, AWAITED.fundedTurnBilling]);
  },
});
atTest('AT-004.05', 'a funded project bills its fuel and an unfunded sibling draws the pool', {
  default: async ({ open }) => { const world = await open(); return proveIsolation(async () => world, loopDrive(world.h.vendors.anthropic)); },
  integration: async ({ open }) => {
    const world = await open();
    await proveExhausted(async () => world, operatorDrive, 'ngo-05');
    throw new CapabilityPending([AWAITED.projectFuelCheckout, AWAITED.fundedTurnBilling]);
  },
});
atTest('AT-004.06', 'funding mid-conversation bills fuel from the next turn onward', {
  default: async ({ open }) => { const world = await open(); return proveSwitch(async () => world, loopDrive(world.h.vendors.anthropic)); },
  integration: async ({ open }) => {
    const world = await open();
    await proveExhausted(async () => world, operatorDrive, 'ngo-06');
    throw new CapabilityPending([AWAITED.projectFuelCheckout, AWAITED.fundedTurnBilling]);
  },
});
atTest('AT-004.48', 'a funded project with no fuel is refused and never draws the free pool', {
  default: async ({ open }) => { const world = await open(); return proveExhausted(async () => world, loopDrive(world.h.vendors.anthropic), 'ngo-48'); },
  integration: async ({ open }) => { const world = await open(); return proveExhausted(async () => world, operatorDrive, 'ngo-48'); },
});
atTest('AT-004.09', 'funding leaves request settings and the free daily allowance unchanged', {
  default: async ({ open }) => { const world = await open(); return proveSettings(async () => world, loopDrive(world.h.vendors.anthropic)); },
  integration: async ({ open }) => {
    const world = await open();
    await proveExhausted(async () => world, operatorDrive, 'ngo-09');
    throw new CapabilityPending([AWAITED.projectFuelCheckout]);
  },
});
