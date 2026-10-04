import { expect, it } from 'vitest';
import { openingDocument } from '../../../supabase/functions/_shared/discovery-brief.ts';
import { parseReplyInput, planReplyTurn, replyTool } from '../../../supabase/functions/_shared/discovery-reply.ts';

const TOPICS = ['priority', 'booking', 'measure', 'owner', 'info', 'rules'];

function askedBrief() {
  const opened = openingDocument({ need: 'Track grants.' });
  const planned = planReplyTurn({
    current: opened, need: 'Track grants.', answers: [], userMessageId: 'open-1', round: 1,
    topicIds: TOPICS, opening: false, discoveryFileCount: 3,
    toolInput: {
      text: 'What should improve first?',
      questions: [{ topicId: 'priority', suggestion: 'Less coordination time', suggested: 'time', importance: 'needed', reason: 'A clear priority keeps the first version small.' }],
      agreed: [], openQuestions: [],
    },
  });
  if (!planned.ok) throw new Error('the opening question did not parse');
  return planned.brief;
}

it('parses a reply and rejects an unknown topic, a missing field and an extra field', () => {
  const valid = {
    text: 'Noted.',
    questions: [{ topicId: 'booking', suggestion: 'Volunteers book themselves', suggested: 'self', importance: 'needed', reason: 'This decides who needs access.' }],
    agreed: [{ topicId: 'priority', answer: 'Less coordination time' }],
    openQuestions: [{ topicId: 'measure', importance: 'later' }],
  };
  expect(parseReplyInput(valid, TOPICS)).toEqual(valid);
  expect(replyTool(TOPICS).input_schema.required[0]).toBe('text');
  expect(parseReplyInput({ ...valid, text: 1 }, TOPICS)).toBeNull();
  expect(parseReplyInput({ ...valid, extra: true }, TOPICS)).toBeNull();
  expect(parseReplyInput({ ...valid, questions: [{ ...valid.questions[0], topicId: 'nope' }] }, TOPICS)).toBeNull();
  expect(parseReplyInput({ ...valid, openQuestions: [{ topicId: 'measure', importance: 'urgent' }] }, TOPICS)).toBeNull();
});

it('applies the answer before the model update and ignores a repeated agreed topic', () => {
  const current = askedBrief();
  const planned = planReplyTurn({
    current, need: 'Track grants.', userMessageId: 'user-1', round: 2, topicIds: TOPICS, opening: false, discoveryFileCount: 0,
    answers: [{ questionId: 'priority', choice: 'time', text: 'Less coordination time', certain: true }],
    toolInput: {
      text: 'I recorded a different priority.',
      questions: [],
      agreed: [{ topicId: 'priority', answer: 'The model invented this' }],
      openQuestions: [],
    },
  });
  expect(planned.ok).toBe(true);
  if (!planned.ok) return;
  expect(planned.brief.revision).toBe(current.revision + 1);
  expect(planned.brief.document.topics.priority?.state).toMatchObject({ kind: 'agreed', answer: 'Less coordination time' });
  expect(planned.filed).toEqual([{ id: 'priority', title: 'Main priority' }]);
  const repeated = planReplyTurn({
    current: planned.brief, need: 'Track grants.', answers: [], userMessageId: 'user-2', round: 3,
    topicIds: TOPICS, opening: false, discoveryFileCount: 0,
    toolInput: {
      text: 'Still the same priority.',
      questions: [],
      agreed: [{ topicId: 'priority', answer: 'Less coordination time' }],
      openQuestions: [],
    },
  });
  expect(repeated.ok).toBe(true);
  if (!repeated.ok) return;
  expect(repeated.changed).toBe(false);
  expect(repeated.brief.revision).toBe(planned.brief.revision);
});

it('releases the credit when the tool input is invalid', () => {
  const current = openingDocument({ need: 'Track grants.' });
  expect(planReplyTurn({
    current, need: 'Track grants.', answers: [], userMessageId: 'user-3', round: 1,
    topicIds: TOPICS, opening: false, discoveryFileCount: 0, toolInput: { text: 'No update.' },
  })).toEqual({ ok: false, release: true });
});


it('bounds, canonicalises and deduplicates labels in the reply tool', () => {
  const input = { text: 'Recorded.', questions: [], agreed: [], openQuestions: [], causeLabels: [' Food  Security ', 'food security'] };
  expect(parseReplyInput(input, TOPICS)?.causeLabels).toEqual(['food security']);
  for (const causeLabels of [['a', 'b', 'c', 'd'], ['x'.repeat(41)], ['   '], [1]]) {
    expect(parseReplyInput({ ...input, causeLabels }, TOPICS)).toBeNull();
  }
});
it('a later reply cannot restore a label the NGO removed', () => {
  const current = openingDocument({ need: 'Food bank shelf list.' });
  current.document.removedCauseLabels = ['food security'];
  const plan = planReplyTurn({ current, need: current.document.need.text, answers: [], userMessageId: 'turn', round: 2,
    topicIds: TOPICS, opening: false, discoveryFileCount: 0,
    toolInput: { text: 'Recorded.', questions: [], agreed: [], openQuestions: [], causeLabels: ['food security'] } });
  expect(plan.ok && plan.brief.document.causeLabels).toEqual([]);
});
