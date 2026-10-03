import { utcDayOf } from '../../../../supabase/functions/_shared/discovery-allowance.ts';
import { expect } from 'vitest';
import { atTest, CapabilityPending } from './_bind.ts';
import { AWAITED } from './_pending.ts';
import { meteringPinProblems, sendSentencePinProblems } from './_source-pins.ts';
import type { AnthropicMessagesSim, ConfigRegistry } from '../../harness/contracts.ts';
import type { DiscoverySut, DiscoveryMessageOutcome, ModelUsage } from './_contract.ts';
import type { NgoActor } from '../req-003/_contract.ts';

const INTAKE = { title: 'Grant deadline tracker', description: 'Two staff need reminders before funder reporting deadlines.' };
type Open = () => Promise<{ w: { email(name: string): string }; sut: DiscoverySut }>;
type Drive = (sut: DiscoverySut, ngo: NgoActor, projectId: string, usage: ModelUsage) => Promise<DiscoveryMessageOutcome>;
const loopDrive = (sim: AnthropicMessagesSim): Drive => async (sut, ngo, projectId, usage) => {
  sim.script([{ kind: 'text', text: 'Which reporting deadlines matter most?', usage }]);
  return sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'Help us scope the deadline tracker.' });
};
const operatorDrive: Drive = async (sut, ngo, projectId, usage) => {
  const reserve = await sut.reserveTurnAsOperator({ accountId: ngo.accountId, organizationId: ngo.organizationId,
    projectId, message: 'Help us scope the deadline tracker.'});
  if (!reserve.ok) return reserve;
  return sut.settleTurnAsOperator({ accountId: ngo.accountId, turnId: reserve.reservation.turn.id,
    outcome: 'completed', reply: 'Which reporting deadlines matter most?', usage });
};
async function proveGrants(open: Open, config: ConfigRegistry, drive: Drive) {
  expect(meteringPinProblems()).toEqual([]);
  expect(sendSentencePinProblems()).toEqual([]);
  const { w, sut } = await open();
  const admin = await sut.provisionPlatformAdmin(w.email('admin-grants'));
  for (const tier of ['unverified', 'vetted']) {
    const ngo = await sut.provisionNgo(w.email(`ngo-${tier}`), { emailVerified: true });
    if (tier === 'vetted') await sut.vetOrganizationAsAdmin(admin, ngo.organizationId);
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
    const sent = await drive(sut, ngo, projectId, { inputTokens: 900, outputTokens: 400 });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    const grant = config.get<number>(`req-002.discovery.daily_credits.${tier}`);
    expect(sent.turn.chargedCredits).toBe(1);
    expect(sent.allowance).toMatchObject({ dailyGrant: grant, spentToday: sent.turn.chargedCredits,
      remaining: grant - sent.turn.chargedCredits! });
    expect(await sut.turnRows(projectId)).toEqual([sent.turn]);
  }
}
async function proveOneCredit(open: Open, drive: Drive) {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-one-credit'), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
  for (const usage of [{ inputTokens: 900, outputTokens: 400 }, { inputTokens: 2600, outputTokens: 1100 }, { inputTokens: 5200, outputTokens: 40 }]) {
    const before = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(before.ok).toBe(true);
    const sent = await drive(sut, ngo, projectId, usage);
    expect(sent.ok).toBe(true);
    if (!sent.ok || !before.ok) return;
    expect(sent.turn.reservedCredits).toBe(1);
    expect(sent.turn.chargedCredits).toBe(1);
    expect(sent.turn.actualMicros).toBe(0);
    expect(sent.turn.reservedMicros).toBe(0);
    expect(sent.allowance?.remaining).toBe(before.allowance.remaining - sent.turn.chargedCredits!);
    expect((await sut.turnRows(projectId)).at(-1)).toEqual(sent.turn);
  }
}
async function proveReset(open: Open, drive: Drive) {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-reset'), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
  const before = await sut.readAllowance(ngo.session, ngo.organizationId);
  expect(before.ok).toBe(true);
  if (!before.ok) return;
  const today = before.allowance.utcDay;
  const yesterday = utcDayOf(Date.parse(`${today}T00:00:00Z`) - 86400000);
  await sut.writeSpendRowAsOperator({ organizationId: ngo.organizationId, utcDay: yesterday,
    spent: before.allowance.dailyGrant - 1, granted: before.allowance.dailyGrant });
  const reset = await sut.readAllowance(ngo.session, ngo.organizationId);
  expect(reset).toEqual(before);
  expect((await sut.turnRows(projectId)).filter((r) => r.utcDay === today)).toEqual([]);
  expect((await sut.spendRows(ngo.organizationId)).map((r) => r.utcDay)).toEqual([yesterday]);
  const sent = await drive(sut, ngo, projectId, { inputTokens: 800, outputTokens: 200 });
  expect(sent.ok).toBe(true);
  if (!sent.ok) return;
  expect(sent.turn.utcDay).toBe(today);
  const after = await sut.readAllowance(ngo.session, ngo.organizationId);
  expect(after.ok && after.allowance.remaining).toBe(before.allowance.dailyGrant - sent.turn.chargedCredits!);
  expect(await sut.readAllowance(ngo.session, ngo.organizationId)).toEqual(after);
}
async function proveShared(open: Open, drive: Drive) {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-shared'), { emailVerified: true });
  const before = await sut.readAllowance(ngo.session, ngo.organizationId);
  expect(before.ok).toBe(true);
  if (!before.ok) return;
  let charged = 0;
  for (const title of ['First tracker', 'Second tracker']) {
    const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, { ...INTAKE, title });
    const sent = await drive(sut, ngo, projectId, { inputTokens: 600, outputTokens: 300 });
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    charged += sent.turn.chargedCredits!;
    expect(sent.allowance?.remaining).toBe(before.allowance.dailyGrant - charged);
  }
  expect(await sut.spendRows(ngo.organizationId)).toEqual([{
    organizationId: ngo.organizationId, utcDay: before.allowance.utcDay, granted: before.allowance.dailyGrant, spent: charged,
  }]);
}
async function proveBound(open: Open, config: ConfigRegistry, drive: Drive) {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-bound'), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
  const sent = await drive(sut, ngo, projectId, { inputTokens: 100000, outputTokens: 400 });
  expect(sent.ok).toBe(true);
  if (!sent.ok) return;
  expect(sent.turn.chargedCredits).toBe(1);
  expect(sent.turn.actualMicros).toBe(0);
  await sut.drainAllowance(ngo.session, ngo.organizationId, 1);
  const next = await drive(sut, ngo, projectId, { inputTokens: 800, outputTokens: 200 });
  expect(next.ok).toBe(true);
  if (!next.ok) return;
  expect(next.turn.maxOutputTokens).toBe(config.get<number>('req-004.discovery.max_output_tokens'));
  expect(next.turn.reservedCredits).toBe(1);
  expect(next.turn.chargedCredits).toBe(1);
  expect(next.allowance?.remaining).toBe(0);
}
async function proveKeylessAndAbandon(open: Open, config: ConfigRegistry) {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-keyless'), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
  const before = await sut.readAllowance(ngo.session, ngo.organizationId);
  const spend = await sut.spendRows(ngo.organizationId);
  const sent = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'Hello' });
  const afterSend = await sut.turnRows(projectId);
  if (afterSend.length === 0) {
    expect(sent).toMatchObject({ ok: false, status: 502 });
    expect(await sut.spendRows(ngo.organizationId)).toEqual(spend);
    expect(await sut.readAllowance(ngo.session, ngo.organizationId)).toEqual(before);
  } else {
    expect(afterSend.every((row) => row.status === 'settled' || row.status === 'failed')).toBe(true);
  }
  const input = { accountId: ngo.accountId, organizationId: ngo.organizationId, projectId, message: 'Hello'};
  const first = await sut.reserveTurnAsOperator(input);
  expect(first.ok).toBe(true);
  if (!first.ok) return;
  expect(await sut.reserveTurnAsOperator(input)).toMatchObject({ ok: false, kind: 'turn-in-flight' });
  const deadline = config.get<number>('req-004.discovery.turn_deadline_seconds');
  await sut.backdateOpenTurnAsOperator(first.reservation.turn.id, new Date(Date.now() - (deadline + 1) * 1000).toISOString());
  const second = await sut.reserveTurnAsOperator(input);
  expect(second.ok).toBe(true);
  if (!second.ok) return;
  const abandoned = (await sut.turnRows(projectId)).find((row) => row.id === first.reservation.turn.id);
  expect(abandoned).toMatchObject({ status: 'abandoned', chargedCredits: 0 });
  const failed = await sut.settleTurnAsOperator({ accountId: ngo.accountId, turnId: second.reservation.turn.id, outcome: 'failed' });
  expect(failed.ok).toBe(true);
  if (!failed.ok) return;
  expect(failed.turn.chargedCredits).toBe(0);
  const afterFail = await sut.turnRows(projectId);
  const accounted = afterFail.filter((row) => row.billing === 'free')
    .reduce((sum, turn) => sum + (turn.status === 'open' ? turn.reservedCredits : turn.chargedCredits ?? 0), 0);
  expect(failed.allowance?.spentToday).toBe(accounted);
  expect(await sut.settleTurnAsOperator({ accountId: ngo.accountId, turnId: second.reservation.turn.id, outcome: 'failed' }))
    .toMatchObject({ ok: false, kind: 'turn-not-open' });
}

atTest('AT-004.01', 'both NGO tiers draw the pinned daily grant through metered turns', {
  default: async ({ open }) => { const world = await open(); const { h } = world; return proveGrants(async () => world, h.config, loopDrive(h.vendors.anthropic)); },
  integration: async ({ open }) => { const world = await open(); const { h } = world; return proveGrants(async () => world, h.config, operatorDrive); },
});
atTest('AT-004.02', 'each completed reply costs one free credit regardless of tokens', { surface: 'ui' }, {
  default: async ({ open }) => { const world = await open(); const { h } = world; return proveOneCredit(async () => world, loopDrive(h.vendors.anthropic)); },
  integration: async ({ open }) => {
    const world = await open();
    await proveOneCredit(async () => world, operatorDrive);
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
});
atTest('AT-004.08', 'the UTC day restores the grant without rolling unused credits forward', {
  default: async ({ open }) => { const world = await open(); const { h } = world; return proveReset(async () => world, loopDrive(h.vendors.anthropic)); },
  integration: ({ open }) => proveReset(open, operatorDrive),
});
atTest('AT-004.47', 'two projects share one NGO allowance and one daily spend row', {
  default: async ({ open }) => { const world = await open(); const { h } = world; return proveShared(async () => world, loopDrive(h.vendors.anthropic)); },
  integration: ({ open }) => proveShared(open, operatorDrive),
});
atTest('AT-004.49', 'token counts cannot change a free charge and the last credit reserves once', {
  default: async ({ open }) => { const world = await open(); const { h } = world; return proveBound(async () => world, h.config, loopDrive(h.vendors.anthropic)); },
  integration: async ({ open }) => {
    const world = await open();
    await proveBound(async () => world, world.h.config, operatorDrive);
    await proveKeylessAndAbandon(open, world.h.config);
  },
});
