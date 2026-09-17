import { utcDayOf } from '../../../../supabase/functions/_shared/discovery-allowance.ts';
import { expect } from 'vitest';
import { atTest, CapabilityPending } from './_bind.ts';
import { AWAITED } from './_pending.ts';
import { meteringPinProblems, sendSentencePinProblems } from './_source-pins.ts';
import { DISCOVERY_INPUT_MARGIN_TOKENS } from '../../../../supabase/functions/_shared/discovery-metering.ts';
import type { AnthropicMessagesSim, ConfigRegistry } from '../../harness/contracts.ts';
import type { DiscoverySut, DiscoveryMessageOutcome, ModelUsage } from './_contract.ts';
import type { NgoActor } from '../req-003/_contract.ts';

const INTAKE = { title: 'Grant deadline tracker', description: 'Two staff need reminders before funder reporting deadlines.' };
type Open = () => Promise<{ w: { email(name: string): string }; sut: DiscoverySut }>;
type Drive = (sut: DiscoverySut, ngo: NgoActor, projectId: string, usage: ModelUsage, counted?: number) => Promise<DiscoveryMessageOutcome>;
const loopDrive = (sim: AnthropicMessagesSim): Drive => async (sut, ngo, projectId, usage, counted) => {
  sim.script([{ kind: 'text', text: 'Which reporting deadlines matter most?', usage, inputTokens: counted ?? usage.inputTokens }]);
  return sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'Help us scope the deadline tracker.' });
};
const operatorDrive: Drive = async (sut, ngo, projectId, usage, counted) => {
  const reserve = await sut.reserveTurnAsOperator({ accountId: ngo.accountId, organizationId: ngo.organizationId,
    projectId, message: 'Help us scope the deadline tracker.', countedInputTokens: counted ?? usage.inputTokens });
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
    expect(sent.allowance).toMatchObject({ dailyGrant: grant, spentToday: sent.turn.chargedCredits,
      remaining: grant - sent.turn.chargedCredits! });
    expect(await sut.turnRows(projectId)).toEqual([sent.turn]);
  }
}
async function proveRatio(open: Open, config: ConfigRegistry, drive: Drive) {
  const ratio = config.get<number>('req-004.discovery.micros_per_credit');
  const inPrice = config.get<number>('req-004.discovery.input_micros_per_token');
  const outPrice = config.get<number>('req-004.discovery.output_micros_per_token');
  const cap = config.get<number>('req-004.discovery.max_output_tokens');
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-ratio'), { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, INTAKE);
  for (const usage of [{ inputTokens: 900, outputTokens: 400 }, { inputTokens: 2600, outputTokens: 1100 }, { inputTokens: 5200, outputTokens: 40 }]) {
    const before = await sut.readAllowance(ngo.session, ngo.organizationId);
    expect(before.ok).toBe(true);
    const sent = await drive(sut, ngo, projectId, usage);
    expect(sent.ok).toBe(true);
    if (!sent.ok || !before.ok) return;
    const reservedMicros = (usage.inputTokens + DISCOVERY_INPUT_MARGIN_TOKENS) * inPrice + cap * outPrice;
    const actualMicros = usage.inputTokens * inPrice + usage.outputTokens * outPrice;
    expect(sent.turn.reservedMicros).toBe(reservedMicros);
    expect(sent.turn.reservedCredits).toBe(Math.ceil(reservedMicros / ratio));
    expect(sent.turn.actualMicros).toBe(actualMicros);
    expect(sent.turn.chargedCredits).toBe(Math.min(sent.turn.reservedCredits, Math.ceil(actualMicros / ratio)));
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
  const sent = await drive(sut, ngo, projectId, { inputTokens: 100000, outputTokens: 400 }, 800);
  expect(sent.ok).toBe(true);
  if (!sent.ok) return;
  expect(sent.turn.chargedCredits).toBe(sent.turn.reservedCredits);
  expect(sent.turn.overrunMicros).toBeGreaterThan(0);
  expect(sent.allowance!.spentToday).toBeLessThanOrEqual(sent.allowance!.dailyGrant);
  await sut.drainAllowance(ngo.session, ngo.organizationId, 1);
  const next = await drive(sut, ngo, projectId, { inputTokens: 800, outputTokens: 200 });
  if (next.ok) {
    expect(next.turn.maxOutputTokens).toBeLessThan(config.get<number>('req-004.discovery.max_output_tokens'));
    expect(next.turn.maxOutputTokens).toBeGreaterThanOrEqual(config.get<number>('req-004.discovery.min_output_tokens'));
    expect(next.turn.chargedCredits).toBeLessThanOrEqual(1);
    expect(next.allowance!.remaining).toBeGreaterThanOrEqual(0);
  } else {
    expect(next.kind).toBe('debit-exceeds-remaining');
    expect(await sut.turnRows(projectId)).toHaveLength(1);
  }
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
  const input = { accountId: ngo.accountId, organizationId: ngo.organizationId, projectId, message: 'Hello', countedInputTokens: 800 };
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
  expect(abandoned).toMatchObject({ status: 'abandoned', chargedCredits: first.reservation.turn.reserved_credits });
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
atTest('AT-004.02', 'each recorded turn charges at the pinned ratio with ceiling rounding', { surface: 'ui' }, {
  default: async ({ open }) => { const world = await open(); const { h } = world; return proveRatio(async () => world, h.config, loopDrive(h.vendors.anthropic)); },
  integration: async ({ open }) => {
    const world = await open();
    await proveRatio(async () => world, world.h.config, operatorDrive);
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
atTest('AT-004.49', 'overruns remain visible and a last-credit turn never overspends', {
  default: async ({ open }) => { const world = await open(); const { h } = world; return proveBound(async () => world, h.config, loopDrive(h.vendors.anthropic)); },
  integration: async ({ open }) => {
    const world = await open();
    await proveBound(async () => world, world.h.config, operatorDrive);
    await proveKeylessAndAbandon(open, world.h.config);
  },
});
