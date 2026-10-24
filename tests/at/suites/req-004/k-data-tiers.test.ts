import { expect } from 'vitest';
import { atTest, TIER } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';
import { DATA_TOPIC_ID, type DataKind } from '../../../../supabase/functions/_shared/discovery-brief.ts';
import { SCOPE_COPY } from '../../../../supabase/functions/_shared/scope-copy.ts';
import type { DiscoverySut, Session } from './_contract.ts';
import type { AnthropicMessagesSim } from '../../harness/contracts.ts';
import { tierFinalPinProblems } from './_source-pins.ts';

const ROTA = {
  title: 'Volunteer rota',
  description: 'Our coordinators spend four hours a week filling volunteer shifts by phone. We need a shared rota volunteers can book.',
};
const USAGE = { inputTokens: 1600, outputTokens: 80 };

function reply(text: string, data?: { kinds: DataKind[]; reason: string }) {
  return { kind: 'tool' as const, name: 'reply', usage: USAGE,
    input: { text, questions: [], agreed: [], openQuestions: [], ...(data === undefined ? {} : { data }) } };
}

async function briefOf(sut: DiscoverySut, session: Session, projectId: string) {
  const read = await sut.readConversation(session, projectId);
  if (!read.ok || !read.value.brief) throw new Error('Discovery has no live brief.');
  return read.value.brief;
}

type Flow = {
  first: { message: string; data?: { kinds: DataKind[]; reason: string } };
  answer: { text: string; certain: boolean; message: string };
  data: { kinds: DataKind[]; reason: string };
};

async function tierFlow(sut: DiscoverySut, anthropic: AnthropicMessagesSim, email: string, flow: Flow) {
  const ngo = await sut.provisionNgo(email, { emailVerified: true });
  const { projectId } = await sut.startDiscoveryNeed(ngo.session, ngo.organizationId, ROTA);
  if (TIER === 'loop') anthropic.script([reply('Thanks. Tell me more about the rota.', flow.first.data)]);
  expect(await sut.sendMessage(ngo.session, { organizationId: ngo.organizationId, projectId, message: flow.first.message }))
    .toMatchObject({ ok: true });
  const before = await briefOf(sut, ngo.session, projectId);
  expect(await sut.briefAction(ngo.session, { organizationId: ngo.organizationId, projectId, action: 'ask', topicId: DATA_TOPIC_ID }))
    .toMatchObject({ ok: true });
  if (TIER === 'loop') anthropic.script([reply('Recorded.', flow.data)]);
  const sent = await sut.sendMessage(ngo.session, {
    organizationId: ngo.organizationId, projectId, message: flow.answer.message,
    answers: [{ questionId: DATA_TOPIC_ID, choice: 'other', text: flow.answer.text, certain: flow.answer.certain }],
  });
  if (!sent.ok) throw new Error(`the data answer was refused: ${sent.reason}`);
  return { ngo, projectId, before, sent, brief: await briefOf(sut, ngo.session, projectId) };
}

async function finish(sut: DiscoverySut, session: Session, organizationId: string, projectId: string, data: boolean) {
  const brief = await briefOf(sut, session, projectId);
  return sut.briefAction(session, { organizationId, projectId, action: 'finish', revision: brief.revision,
    acks: { reviewed: true, openGaps: true, data } });
}

const contacts = { text: 'Name and phone only', certain: true, message: 'We keep each volunteer name and phone number.' };
const PII = { kinds: ['ordinary-pii'] as DataKind[], reason: 'Volunteer names and phone numbers.' };

atTest('AT-004.26', 'Discovery asks what data the tool will handle before it assigns a tier', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const { before, brief } = await tierFlow(sut, h.vendors.anthropic, w.email('tiers-26'), {
      first: { message: 'We will keep client health records in the rota.', data: { kinds: ['health'], reason: 'Client health records.' } },
      answer: { text: 'Client health records and medication notes', certain: true, message: 'The tool keeps client health records and medication notes.' },
      data: { kinds: ['health'], reason: 'Client health records.' },
    });
    expect(before.dataTier).toBeNull();
    expect(brief.dataTier).toMatchObject({ tier: 2, responsibility: 'ngo' });
  },
});

atTest('AT-004.27', 'ordinary personal data gives Tier 1 with the minimisation reminder and the data acknowledgment', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const { ngo, projectId, sent, brief } = await tierFlow(sut, h.vendors.anthropic, w.email('tiers-27'), {
      first: { message: 'Hello.' }, answer: contacts, data: PII,
    });
    expect(brief.dataTier).toMatchObject({ tier: 1, kinds: ['ordinary-pii'] });
    expect(sent.reply).toContain(SCOPE_COPY.dataTier.tier1);
    expect(await finish(sut, ngo.session, ngo.organizationId, projectId, false)).toMatchObject({ ok: false, kind: 'data-ack' });
    expect(await finish(sut, ngo.session, ngo.organizationId, projectId, true)).toMatchObject({ ok: true });
  },
  integration: awaiting(AWAITED.anthropicLive),
});

atTest('AT-004.28', 'special-category or high-volume data gives Tier 2, fixtures only, and classifies the need', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    for (const kind of ['special-category', 'high-volume'] as const) {
      const { ngo, projectId, sent, brief } = await tierFlow(sut, h.vendors.anthropic, w.email(`tiers-28-${kind}`), {
        first: { message: 'Hello.' },
        answer: { text: 'Membership records', certain: true, message: 'The tool keeps membership records.' },
        data: { kinds: [kind], reason: 'Membership records.' },
      });
      expect(brief.dataTier).toMatchObject({ tier: 2, kinds: [kind] });
      expect(sent.reply).toContain(SCOPE_COPY.dataTier.tier2);
      const need = await sut.readNeed(ngo.session, projectId);
      expect(need.ok && need.value.need.tier2ClassifiedAt).toEqual(expect.any(String));
    }
  },
  integration: awaiting(AWAITED.anthropicLive),
});

atTest('AT-004.29', 'health, immigration, abuse-victim and financial data are never below Tier 2', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const cases = TIER === 'loop'
      ? (['health', 'immigration', 'abuse-victim', 'financial'] as const).flatMap((kind) => [['none', kind], ['ordinary-pii', kind]] as DataKind[][])
      : [['health'] as DataKind[]];
    for (const [i, kinds] of cases.entries()) {
      const { brief } = await tierFlow(sut, h.vendors.anthropic, w.email(`tiers-29-${i}`), {
        first: { message: 'Hello.' },
        answer: { text: 'Names, phone numbers and medical conditions', certain: true, message: 'The tool keeps each client name, phone number and medical conditions.' },
        data: { kinds, reason: 'Client contact details and sensitive records.' },
      });
      expect(brief.dataTier?.tier).toBe(2);
    }
  },
});

atTest('AT-004.30', 'an unsure data answer, or an unsure report, gives Tier 2', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const unsure = await tierFlow(sut, h.vendors.anthropic, w.email('tiers-30-answer'), {
      first: { message: 'Hello.' },
      answer: { text: 'We have not decided what to keep', certain: false, message: 'We are not sure what data the tool will keep.' },
      data: PII,
    });
    expect(unsure.brief.dataTier?.tier).toBe(2);
    if (TIER !== 'loop') return;
    const reported = await tierFlow(sut, h.vendors.anthropic, w.email('tiers-30-report'), {
      first: { message: 'Hello.' }, answer: contacts, data: { kinds: ['unsure'], reason: 'The NGO does not know yet.' },
    });
    expect(reported.brief.dataTier).toMatchObject({ tier: 2, kinds: ['unsure'] });
  },
});

atTest('AT-004.31', 'a tool with no personal data gives Tier 0 and finishes without the data acknowledgment', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const { ngo, projectId, sent, brief } = await tierFlow(sut, h.vendors.anthropic, w.email('tiers-31'), {
      first: { message: 'Hello.' },
      answer: { text: 'Shift times only', certain: true, message: 'The tool keeps shift times and no personal data.' },
      data: { kinds: ['none'], reason: 'Shift times only.' },
    });
    expect(brief.dataTier).toMatchObject({ tier: 0, kinds: ['none'] });
    expect(sent.reply).toContain(SCOPE_COPY.dataTier.tier0);
    expect(await finish(sut, ngo.session, ngo.organizationId, projectId, false)).toMatchObject({ ok: true });
  },
  integration: awaiting(AWAITED.anthropicLive),
});

atTest('AT-004.50', 'the tier attributes the data responsibility to the NGO and asks for the acknowledgment only at Tier 1 and 2', {
  default: async ({ open }) => {
    const { w, sut, h } = await open();
    const flows = [
      { tier: 0, data: { kinds: ['none'] as DataKind[], reason: 'Shift times only.' } },
      { tier: 1, data: PII },
      { tier: 2, data: { kinds: ['ordinary-pii', 'financial'] as DataKind[], reason: 'Names and bank details.' } },
    ];
    for (const flow of flows) {
      const { ngo, projectId, brief } = await tierFlow(sut, h.vendors.anthropic, w.email(`tiers-50-${flow.tier}`), {
        first: { message: 'Hello.' }, answer: contacts, data: flow.data,
      });
      expect(brief.dataTier).toMatchObject({ tier: flow.tier, responsibility: 'ngo' });
      if (flow.tier !== 0) {
        expect(await finish(sut, ngo.session, ngo.organizationId, projectId, false)).toMatchObject({ ok: false, kind: 'data-ack' });
      }
      const finished = await finish(sut, ngo.session, ngo.organizationId, projectId, flow.tier !== 0);
      expect(finished).toMatchObject({ ok: true, brief: { dataTier: { tier: flow.tier, responsibility: 'ngo' } } });
      expect(finished.ok && finished.confirmation?.revision).toBe(brief.revision);
    }
    expect(tierFinalPinProblems()).toEqual([]);
  },
  integration: awaiting(AWAITED.anthropicLive),
});
