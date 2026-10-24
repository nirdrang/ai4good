import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';
import { declineTrackProblems } from './_source-absences.ts';
import { DATA_TOPIC_ID, type DeclineCause } from '../../../../supabase/functions/_shared/discovery-brief.ts';
import { DISCOVERY_READY_SENTENCE } from '../../../../supabase/functions/_shared/discovery-reply.ts';
import { DECLINE_COPY } from '../../../../supabase/functions/_shared/scope-copy.ts';
import type { AnthropicMessagesSim } from '../../harness/contracts.ts';
import type { DiscoverySut, Session } from './_contract.ts';

const USAGE = { inputTokens: 1600, outputTokens: 120 };
const INTAKE_FORM = {
  title: 'Client intake form',
  description: 'Our caseworkers take new client details on paper. We need an online intake form and a list of new clients.',
};
const DEVELOPER = {
  title: 'Live payment gateway',
  description: 'We want our own payment processing backend that settles card payments with our bank every night.',
};
const CONFIDENTIAL = {
  title: 'Private case engine',
  description: 'We want a matching engine whose source code must stay confidential to our funder.',
};
const EXPLANATION: Record<DeclineCause, string> = {
  'developer-maintenance': 'A nightly payment settlement backend needs a developer to keep it working.',
  'confidential-codebase': 'Your funder requires the source code to stay confidential.',
};
const COPY: Record<DeclineCause, string> = {
  'developer-maintenance': DECLINE_COPY.developerMaintenance,
  'confidential-codebase': DECLINE_COPY.confidentialCodebase,
};
const RESHAPING = 'Use a hosted payment link from your payment provider, and track payments in a simple list.';

type FitInput = { verdict: string; cause: string; reason: string; reshaping: string };
function reply(text: string, fit: FitInput, data?: { kinds: string[]; reason: string }) {
  return { kind: 'tool' as const, name: 'reply', usage: USAGE,
    input: { text, questions: [], agreed: [], openQuestions: [], fit, ...(data === undefined ? {} : { data }) } };
}
const fits = (reason: string): FitInput => ({ verdict: 'fits', cause: 'none', reason, reshaping: '' });
const declined = (cause: DeclineCause): FitInput => ({ verdict: 'declined', cause, reason: EXPLANATION[cause], reshaping: RESHAPING });

async function briefOf(sut: DiscoverySut, session: Session, projectId: string) {
  const read = await sut.readConversation(session, projectId);
  if (!read.ok || !read.value.brief) throw new Error('Discovery has no live brief.');
  return read.value.brief;
}

async function fitTurn(sut: DiscoverySut, anthropic: AnthropicMessagesSim, email: string, intake: typeof INTAKE_FORM, fit: FitInput) {
  const ngo = await sut.provisionNgo(email, { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, intake);
  anthropic.script([reply(fit.reason, fit)]);
  const sent = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: intake.description });
  return { ngo, projectId, sent };
}

async function finish(sut: DiscoverySut, session: Session, organizationId: string, projectId: string) {
  const brief = await briefOf(sut, session, projectId);
  return sut.briefAction(session, { organizationId, projectId, action: 'finish', revision: brief.revision,
    acks: { reviewed: true, openGaps: true, data: true } });
}

async function proveDecline(sut: DiscoverySut, anthropic: AnthropicMessagesSim, email: string, cause: DeclineCause) {
  const intake = cause === 'developer-maintenance' ? DEVELOPER : CONFIDENTIAL;
  const { ngo, projectId, sent } = await fitTurn(sut, anthropic, email, intake, declined(cause));
  if (!sent.ok) throw new Error(`the declining turn was refused: ${sent.reason}`);
  expect(sent.reply).toBe(`${EXPLANATION[cause]}\n\n${COPY[cause]}\n\n${DECLINE_COPY.oversight}`);
  expect(sent.reply).not.toContain(DISCOVERY_READY_SENTENCE);
  expect((await briefOf(sut, ngo.session, projectId)).fit).toEqual(declined(cause));
  expect(await finish(sut, ngo.session, ngo.organizationId, projectId)).toMatchObject({ ok: false, kind: 'declined' });
  expect(await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'Can we try again?' }))
    .toMatchObject({ ok: false, kind: 'discovery-declined', status: 409 });
  return { ngo, projectId };
}

atTest('AT-004.32', 'a need a staffer can maintain by chat passes the fit check', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const { ngo, projectId, sent } = await fitTurn(sut, h.vendors.anthropic, w.email('fit-32'), INTAKE_FORM,
      fits('An intake form and a client list fit a tool your staff can maintain by chat.'));
    expect(sent).toMatchObject({ ok: true });
    expect((await briefOf(sut, ngo.session, projectId)).fit).toEqual({
      verdict: 'fits', reason: 'An intake form and a client list fit a tool your staff can maintain by chat.',
    });
    expect(await finish(sut, ngo.session, ngo.organizationId, projectId)).toMatchObject({ ok: true });
  },
  integration: awaiting(AWAITED.anthropicLive),
});

atTest('AT-004.33', 'a need that requires ongoing developer maintenance is declined plainly with no publishable scope', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    await proveDecline(sut, h.vendors.anthropic, w.email('fit-33'), 'developer-maintenance');
  },
  integration: awaiting(AWAITED.anthropicLive),
});

atTest('AT-004.34', 'a confidential-codebase need is declined the same way', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    await proveDecline(sut, h.vendors.anthropic, w.email('fit-34'), 'confidential-codebase');
  },
  integration: awaiting(AWAITED.anthropicLive),
});

atTest('AT-004.35', 'every decline leaves a record for review, with no waitlist and no second track', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    for (const cause of ['developer-maintenance', 'confidential-codebase'] as const) {
      const { projectId } = await proveDecline(sut, h.vendors.anthropic, w.email(`fit-35-${cause}`), cause);
      expect(await sut.declineRecordAsOperator(projectId)).toEqual({
        cause, reason: EXPLANATION[cause], reshaping: RESHAPING, declinedAt: expect.any(String),
      });
    }
    expect(declineTrackProblems()).toEqual([]);
  },
  integration: async ({ open }) => {
    const { w, sut } = await open();
    for (const cause of ['developer-maintenance', 'confidential-codebase'] as const) {
      const ngo = await sut.provisionNgo(w.email(`fit-35-${cause}`), { emailVerified: true });
      const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, cause === 'developer-maintenance' ? DEVELOPER : CONFIDENTIAL);
      const reserved = await sut.reserveTurnAsOperator({ accountId: ngo.accountId, organizationId: ngo.organizationId, projectId, message: 'Hello.' });
      if (!reserved.ok) throw new Error(reserved.reason);
      expect(await sut.settleTurnAsOperator({ accountId: ngo.accountId, turnId: reserved.reservation.turn.id, outcome: 'completed',
        reply: EXPLANATION[cause], usage: USAGE, decline: { cause, reason: EXPLANATION[cause], reshaping: RESHAPING } })).toMatchObject({ ok: true });
      expect(await sut.declineRecordAsOperator(projectId)).toEqual({
        cause, reason: EXPLANATION[cause], reshaping: RESHAPING, declinedAt: expect.any(String),
      });
    }
    expect(declineTrackProblems()).toEqual([]);
  },
});

atTest('AT-004.36', 'sensitive data that otherwise fits is served with its tier, and an off-enum decline cause is rejected', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const anthropic = h.vendors.anthropic;
    const reason = 'A clinic appointment list fits a tool your staff can maintain by chat.';
    const { ngo, projectId, sent } = await fitTurn(sut, anthropic, w.email('fit-36'), {
      title: 'Clinic appointments', description: 'Our clinic books client appointments by phone. We need a shared appointment list.',
    }, fits(reason));
    expect(sent).toMatchObject({ ok: true });
    expect(await sut.briefAction(ngo.session, { organizationId: ngo.organizationId, projectId, action: 'ask', topicId: DATA_TOPIC_ID }))
      .toMatchObject({ ok: true });
    anthropic.script([reply('Recorded.', fits(reason), { kinds: ['health'], reason: 'Client medical appointments.' })]);
    expect(await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'The list keeps client names and their medical appointments.',
      answers: [{ questionId: DATA_TOPIC_ID, choice: 'other', text: 'Client names and medical appointments', certain: true }] })).toMatchObject({ ok: true });
    const brief = await briefOf(sut, ngo.session, projectId);
    expect(brief.dataTier?.tier).toBe(2);
    expect(brief.fit).toEqual({ verdict: 'fits', reason });
    expect(await sut.declineRecordAsOperator(projectId)).toBeNull();

    anthropic.script([reply('We cannot serve sensitive data.', { verdict: 'declined', cause: 'sensitive-data', reason: 'Health data.', reshaping: 'Drop the health data.' })]);
    const refused = await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: 'Anything else?' });
    expect(refused.ok).toBe(false);
    expect((await sut.turnRows(projectId)).at(-1)?.status).toBe('failed');
    expect((await briefOf(sut, ngo.session, projectId)).fit).toEqual({ verdict: 'fits', reason });
    expect(await sut.declineRecordAsOperator(projectId)).toBeNull();
  },
  integration: awaiting(AWAITED.anthropicLive),
});
