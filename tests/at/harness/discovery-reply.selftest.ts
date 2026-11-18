import { expect, it } from 'vitest';
import { KEY_TOPIC_IDS, snapshotOf } from '../../../supabase/functions/_shared/discovery-brief.ts';
import { TEST_TOPIC_PLAN, testOpening } from './discovery-topic-plan.ts';
import { parseReplyInput, parseTopicPlan, planReplyTurn, replyTool } from '../../../supabase/functions/_shared/discovery-reply.ts';

const TOPICS = ['priority', 'booking', 'measure', 'owner', 'info', 'rules'];

function askedBrief() {
  const opened = testOpening('Track grants.');
  const planned = planReplyTurn({
    current: opened, need: 'Track grants.', answers: [], userMessageId: 'open-1', round: 1,
    topicIds: TOPICS, opening: false, discoveryFileCount: 3,
    toolInput: {
      text: 'What should improve first?',
      questions: [{ topicId: 'priority', suggestion: 'Less coordination time', suggested: 'o1', importance: 'needed', reason: 'A clear priority keeps the first version small.' }],
      agreed: [], openQuestions: [],
    },
  });
  if (!planned.ok) throw new Error('the opening question did not parse');
  return planned.brief;
}

it('parses a reply and rejects an unknown topic, a missing field and an extra field', () => {
  const valid = {
    text: 'Noted.',
    questions: [{ topicId: 'booking', suggestion: 'Volunteers book themselves', suggested: 'o1', importance: 'needed', reason: 'This decides who needs access.' }],
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
    answers: [{ questionId: 'priority', choice: 'o1', text: 'Less coordination time', certain: true }],
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
  const current = testOpening('Track grants.');
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
  const current = testOpening('Food bank shelf list.');
  current.document.removedCauseLabels = ['food security'];
  const plan = planReplyTurn({ current, need: current.document.need.text, answers: [], userMessageId: 'turn', round: 2,
    topicIds: TOPICS, opening: false, discoveryFileCount: 0,
    toolInput: { text: 'Recorded.', questions: [], agreed: [], openQuestions: [], causeLabels: ['food security'] } });
  expect(plan.ok && plan.brief.document.causeLabels).toEqual([]);
});

const OPENING_TURN = { current: null, need: 'Track donors.', answers: [], userMessageId: 'open', round: 1, opening: true, discoveryFileCount: 0, topicIds: KEY_TOPIC_IDS };
const OPENING_REPLY = {
  text: 'Let us start with your main priority.',
  questions: [{ topicId: 'donors', suggestion: 'A shared donor list', suggested: 'A shared donor list', importance: 'needed', reason: 'The list decides what the tool keeps.' }],
  agreed: [], openQuestions: [],
};
const DONOR_TOPIC = {
  id: 'donors', title: 'Donor records', why: 'The donor list is what the tool keeps up to date.',
  question: 'Where do you keep donors today?', options: ['A shared donor list', 'Paper forms'], suggested: 'A shared donor list',
  recommendation: 'Suggested: a shared donor list.', uncertaintyHelp: 'To find out: ask who records a new gift.',
};
const DONOR_PLAN = { ...TEST_TOPIC_PLAN, topics: [DONOR_TOPIC], fileExamples: ['donor list'] };

function openingWith(plan: Record<string, unknown>, discoveryFileCount = 0) {
  return planReplyTurn({ ...OPENING_TURN, discoveryFileCount, toolInput: { ...OPENING_REPLY, ...plan } });
}

it('builds the opening brief from the plan, with fixed titles and the key flag only on key topics', () => {
  const planned = openingWith(DONOR_PLAN);
  expect(planned.ok).toBe(true);
  if (!planned.ok) return;
  const topics = snapshotOf(planned.brief).topics;
  expect(topics.map((topic) => [topic.id, topic.title, topic.key ?? false])).toEqual([
    ['priority', 'Main priority', true],
    ['donors', 'Donor records', false],
    ['info', 'Information handled', true],
    ['owner', 'Maintenance owner', true],
  ]);
  expect(planned.brief.document.topics.donors?.definition.options.map((option) => option.label)).toEqual(['A shared donor list', 'Paper forms']);
  expect(planned.brief.document.questions.donors).toBeDefined();
});

it('rejects a plan with a duplicate id, a key id, a reserved id, too many topics, a stray suggestion or a missing key topic', () => {
  const bad = [
    { ...DONOR_PLAN, topics: [DONOR_TOPIC, DONOR_TOPIC] },
    { ...DONOR_PLAN, topics: [{ ...DONOR_TOPIC, id: 'owner' }] },
    { ...DONOR_PLAN, topics: [{ ...DONOR_TOPIC, id: 'need' }] },
    { ...DONOR_PLAN, topics: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'].map((id) => ({ ...DONOR_TOPIC, id })) },
    { ...DONOR_PLAN, topics: [{ ...DONOR_TOPIC, suggested: 'A spreadsheet' }] },
    { ...DONOR_PLAN, keyTopics: { priority: TEST_TOPIC_PLAN.keyTopics.priority, info: TEST_TOPIC_PLAN.keyTopics.info } },
  ];
  for (const plan of bad) {
    expect(parseTopicPlan(plan)).toBeNull();
    expect(openingWith(plan)).toEqual({ ok: false, release: true });
  }
  expect(parseTopicPlan({ ...DONOR_PLAN, topics: ['a1', 'a2', 'a3', 'a4', 'a5'].map((id) => ({ ...DONOR_TOPIC, id })) })).not.toBeNull();
});

it('releases an opening reply without a plan, and a later reply that carries plan fields', () => {
  expect(planReplyTurn({ ...OPENING_TURN, toolInput: { ...OPENING_REPLY, questions: [] } })).toEqual({ ok: false, release: true });
  expect(planReplyTurn({
    current: testOpening('Track grants.'), need: 'Track grants.', answers: [], userMessageId: 'later', round: 2,
    topicIds: TOPICS, opening: false, discoveryFileCount: 0,
    toolInput: { text: 'Noted.', questions: [], agreed: [], openQuestions: [], ...TEST_TOPIC_PLAN },
  })).toEqual({ ok: false, release: true });
});

it('names the files that would help this need on the opening reply, unless the NGO already has three files', () => {
  const asked = openingWith(DONOR_PLAN);
  expect(asked.ok && asked.suffix).toContain('Files that would help this need: donor list.');
  const full = openingWith(DONOR_PLAN, 3);
  expect(full.ok).toBe(true);
  if (!full.ok) return;
  expect(full.text).not.toContain('Files that would help this need');
});
