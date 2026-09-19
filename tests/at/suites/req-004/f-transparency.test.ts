import { expect } from 'vitest';
import { atTest, CapabilityPending } from './_bind.ts';
import { AWAITED } from './_pending.ts';
import { GRANT_TRACKER } from './fixtures/grant-tracker.ts';
import type { AnthropicMessagesSim } from '../../harness/contracts.ts';
import type { DiscoveryMessageOutcome, DiscoverySut, ModelUsage } from './_contract.ts';
import type { NgoActor } from '../req-003/_contract.ts';

const FILE = { fileName: 'deadlines.csv', mediaType: 'text/csv', byteSize: 256 };
function scriptedStep(index: number) {
  const message = GRANT_TRACKER.ngoMessages[index];
  const reply = GRANT_TRACKER.replies[index];
  if (message === undefined || reply === undefined || reply.kind === 'error') {
    throw new Error('the grant tracker fixture is missing a text turn');
  }
  return { message, reply: reply.kind === 'text' ? reply.text : '', usage: reply.usage };
}
const STEPS = [scriptedStep(0), scriptedStep(1), scriptedStep(2)] as const;
type Drive = (sut: DiscoverySut, ngo: NgoActor, projectId: string, message: string, usage: ModelUsage, reply: string) => Promise<DiscoveryMessageOutcome>;
const loopDrive = (sim: AnthropicMessagesSim): Drive => async (sut, ngo, projectId, message, usage, reply) => {
  sim.script([{ kind: 'text', text: reply, usage }]);
  return sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message });
};
const operatorDrive: Drive = async (sut, ngo, projectId, message, usage, reply) => {
  const reserved = await sut.reserveTurnAsOperator({
    accountId: ngo.accountId, organizationId: ngo.organizationId, projectId, message, countedInputTokens: usage.inputTokens,
  });
  if (!reserved.ok) return reserved;
  return sut.settleTurnAsOperator({
    accountId: ngo.accountId, turnId: reserved.reservation.turn.id, outcome: 'completed', reply, usage,
  });
};
async function remainingOf(sut: DiscoverySut, ngo: NgoActor): Promise<number> {
  const read = await sut.readAllowance(ngo.session, ngo.organizationId);
  expect(read.ok).toBe(true);
  if (!read.ok) throw new Error(read.reason);
  return read.allowance.remaining;
}
async function recordCompleted(
  sut: DiscoverySut, ngo: NgoActor, projectId: string, deltas: number[], drive: Drive, step: (typeof STEPS)[number],
): Promise<void> {
  const before = await remainingOf(sut, ngo);
  const sent = await drive(sut, ngo, projectId, step.message, step.usage, step.reply);
  expect(sent.ok).toBe(true);
  if (!sent.ok) return;
  const after = await remainingOf(sut, ngo);
  expect(before - after).toBe(sent.turn.chargedCredits!);
  deltas.push(-sent.turn.reservedCredits);
  const released = sent.turn.reservedCredits - sent.turn.chargedCredits!;
  if (released > 0) deltas.push(released);
}
async function proveTransparency(sut: DiscoverySut, w: { email(name: string): string }, drive: Drive) {
  const admin = await sut.provisionPlatformAdmin(w.email('admin-46'));
  const ngo = await sut.provisionNgo(w.email('ngo-46'), { emailVerified: true });
  await sut.vetOrganizationAsAdmin(admin, ngo.organizationId);
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, GRANT_TRACKER.intake);
  const deltas: number[] = [];
  await recordCompleted(sut, ngo, projectId, deltas, drive, STEPS[0]);
  const beforeAttach = await remainingOf(sut, ngo);
  const attached = await sut.attachReferenceFile(ngo.session, { organizationId: ngo.organizationId, projectId, file: FILE });
  expect(attached.ok).toBe(true);
  const attachDelta = (await remainingOf(sut, ngo)) - beforeAttach;
  expect(attachDelta).toBe(0);
  deltas.push(attachDelta);
  await recordCompleted(sut, ngo, projectId, deltas, drive, STEPS[1]);
  const beforeReserve = await remainingOf(sut, ngo);
  const reserved = await sut.reserveTurnAsOperator({
    accountId: ngo.accountId, organizationId: ngo.organizationId, projectId, message: STEPS[2].message,
    countedInputTokens: STEPS[2].usage.inputTokens,
  });
  expect(reserved.ok).toBe(true);
  if (!reserved.ok) return;
  deltas.push((await remainingOf(sut, ngo)) - beforeReserve);
  await sut.backdateOpenTurnAsOperator(reserved.reservation.turn.id, new Date(0).toISOString());
  await recordCompleted(sut, ngo, projectId, deltas, drive, STEPS[2]);
  const rows = await sut.turnRows(projectId);
  const byCredit = (left: number, right: number) => left - right;
  expect(deltas.filter((delta) => delta < 0).map((delta) => -delta).sort(byCredit))
    .toEqual(rows.map((row) => row.reservedCredits).filter((credits) => credits > 0).sort(byCredit));
  expect(await sut.spendLedgerInvariantProblems(ngo.organizationId)).toEqual([]);
  const read = await sut.readConversation(ngo.session, projectId);
  expect(read.ok).toBe(true);
  if (!read.ok) return;
  expect(read.value.conversation.turns.map((turn) => turn.chargedCredits)).toEqual(rows.map((row) => row.chargedCredits));
}

atTest('AT-004.46', 'remaining credits and every turn cost are readable, and every negative delta is one turn record or the reset', { surface: 'ui' }, {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    return proveTransparency(sut, w, loopDrive(h.vendors.anthropic));
  },
  integration: async ({ open }) => {
    const { w, sut } = await open();
    await proveTransparency(sut, w, operatorDrive);
    throw new CapabilityPending([AWAITED.discoverySurface]);
  },
});
