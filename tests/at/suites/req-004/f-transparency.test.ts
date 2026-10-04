import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import { discoveryScreens } from './_screen.ts';
import { expectUsage, answerWhenAsked } from './_flows.ts';
const withDiscovery = discoveryScreens();
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
  });
  expect(reserved.ok).toBe(true);
  if (!reserved.ok) return;
  deltas.push((await remainingOf(sut, ngo)) - beforeReserve);
  expect(await sut.settleTurnAsOperator({ accountId: ngo.accountId, turnId: reserved.reservation.turn.id, outcome: 'failed' })).toMatchObject({ ok: true });
  deltas.push(1);
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

atTest('AT-004.46', 'remaining credits and every turn cost are readable, and every negative delta is one turn record or the reset', { surface: 'ui', timeoutMs: { integration: 240_000 } }, {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    return proveTransparency(sut, w, loopDrive(h.vendors.anthropic));
  },
  integration: async (ctx) => {
    for (const viewport of ['desktop', 'phone'] as const) {
      await withDiscovery(ctx, { scenario: 'mid-interview', viewport }, async (screen) => {
        await expectUsage(screen);
        await screen.brief.back();
        const before = await screen.backend!.read();
        const question = before.brief.questions.find((question) => before.brief.topics.some((topic) => topic.id === question.topicId && topic.state.kind !== 'agreed'))!;
        await screen.composer.fill('');
        await answerWhenAsked(screen, question.text, question.options[0]!.label);
        await screen.composer.send();
        const after = await screen.backend!.read();
        expect(after.usage.dailyLeft).toBe(before.usage.dailyLeft - 1);
        expect(await screen.chat.lastAssistantText()).toContain('Free reply');
        const rows = await screen.backend!.sql`select reserved_credits, charged_credits from public.discovery_turns where project_id = ${screen.backend!.projectId}::uuid order by seq desc limit 1` as { reserved_credits: number; charged_credits: number }[];
        expect(Number(rows[0].charged_credits)).toBe(1);
        await screen.review.open();
        expect((await screen.backend!.read()).usage).toEqual(after.usage);
      });
    }
  },
});
