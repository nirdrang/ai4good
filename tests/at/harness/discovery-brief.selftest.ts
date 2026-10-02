import { expect, it } from 'vitest';
import {
  BRIEF_REASONS,
  decideFinish,
  evolveBrief,
  openingDocument,
  snapshotOf,
  type BriefVersion,
  type Confirmation,
  type FinishInput,
} from '../../../supabase/functions/_shared/discovery-brief.ts';

const NEED = 'We coordinate 45 volunteers across three community kitchens.';

function changedBrief(version: BriefVersion, command: Parameters<typeof evolveBrief>[1]): BriefVersion {
  const result = evolveBrief(version, command);
  expect(result.kind).toBe('changed');
  if (result.kind !== 'changed') throw new Error('expected a changed brief');
  return result.brief;
}

function finishInput(overrides: Partial<FinishInput> & { existing?: Confirmation | null } = {}): FinishInput {
  return {
    acks: { reviewed: true, openGaps: true, data: false },
    filesReading: false,
    actor: { id: 'actor-1', displayName: 'Sam Taylor' },
    at: '2026-10-02T12:00:00.000Z',
    existing: null,
    ...overrides,
  };
}

it('keeps an unchanged section edit on the same revision and source', () => {
  const version = openingDocument({ need: NEED });
  const result = evolveBrief(version, { kind: 'edit', sectionId: 'need', text: NEED });
  expect(result.kind).toBe('unchanged');
  if (result.kind !== 'unchanged') return;
  expect(result.brief.revision).toBe(1);
  expect(result.brief.document.need).toEqual({ text: NEED, source: { kind: 'intake' } });
});

it('bumps a real edit once and writes the person line', () => {
  const version = openingDocument({ need: NEED });
  const result = evolveBrief(version, { kind: 'edit', sectionId: 'need', text: 'A new need' });
  expect(result.kind).toBe('changed');
  if (result.kind !== 'changed') return;
  expect(result.brief.revision).toBe(2);
  expect(result.filed).toEqual([]);
  expect(result.personLine).toEqual({
    id: 'you-2',
    role: 'user',
    parts: [{ type: 'text', text: 'You changed The need: A new need' }],
  });
  expect(result.brief.document.need).toEqual({ text: 'A new need', source: { kind: 'edit', revision: 2 } });
  const again = evolveBrief(result.brief, { kind: 'edit', sectionId: 'need', text: 'A new need' });
  expect(again.kind).toBe('unchanged');
  if (again.kind !== 'unchanged') return;
  expect(again.brief.revision).toBe(2);
  expect(again.brief.document.need.source).toEqual({ kind: 'edit', revision: 2 });
});

it('marks an answered dependent when its prerequisite suggestion is accepted', () => {
  const version = openingDocument({ need: NEED });
  version.document.topics.measure!.state = {
    kind: 'agreed',
    answer: 'Two hours a week, down from four',
    source: { kind: 'chat', round: 1 },
    answerMessageId: 'msg-measure',
  };
  const result = evolveBrief(version, { kind: 'accept-suggestion', topicId: 'priority' });
  expect(result.kind).toBe('changed');
  if (result.kind !== 'changed') return;
  expect(result.brief.revision).toBe(2);
  expect(result.personLine).toEqual({
    id: 'you-2',
    role: 'user',
    parts: [{ type: 'text', text: 'You used the suggestion for Main priority: Less coordination time' }],
  });
  expect(result.brief.document.topics.priority?.state).toEqual({
    kind: 'agreed',
    answer: 'Less coordination time',
    source: { kind: 'accepted-suggestion' },
    answerMessageId: 'you-2',
  });
  const measure = result.brief.document.topics.measure!;
  expect(measure.needsReview).toBe(true);
  expect(measure.state).toEqual(version.document.topics.measure?.state);
  const repeat = evolveBrief(result.brief, { kind: 'accept-suggestion', topicId: 'priority' });
  expect(repeat.kind).toBe('unchanged');
});

it('asks a topic once and leaves a second ask unchanged', () => {
  const version = openingDocument({ need: NEED });
  const asked = evolveBrief(version, { kind: 'ask-topic', topicId: 'priority', round: 1 });
  expect(asked.kind).toBe('changed');
  if (asked.kind !== 'changed') return;
  expect(asked.brief.revision).toBe(2);
  expect(asked.personLine).toBeNull();
  expect(snapshotOf(asked.brief).questions).toHaveLength(1);
  expect(snapshotOf(asked.brief).questions[0]).toMatchObject({
    id: 'priority',
    topicId: 'priority',
    text: 'What should improve first?',
    askedInRound: 1,
  });
  const again = evolveBrief(asked.brief, { kind: 'ask-topic', topicId: 'priority' });
  expect(again.kind).toBe('unchanged');
  if (again.kind !== 'unchanged') return;
  expect(again.brief.revision).toBe(2);
  expect(snapshotOf(again.brief).questions).toHaveLength(1);
  expect(evolveBrief(version, { kind: 'ask-topic', topicId: 'missing' }).kind).toBe('refused');
});

it('leaves a missing cause label unchanged', () => {
  const version = openingDocument({ need: NEED });
  const result = evolveBrief(version, { kind: 'remove-label', label: 'Food' });
  expect(result.kind).toBe('unchanged');
  if (result.kind !== 'unchanged') return;
  expect(result.brief.revision).toBe(1);
  expect(result.brief.document.removedCauseLabels).toEqual([]);
});

it('applies the same answer twice and bumps once, keeping provenance', () => {
  const asked = changedBrief(openingDocument({ need: NEED }), { kind: 'ask-topic', topicId: 'priority', round: 1 });
  const command = {
    kind: 'apply-answers' as const,
    round: 1,
    userMessageId: 'msg-1',
    answers: [{ questionId: 'priority', choice: 'time', text: 'Less coordination time', certain: true }],
  };
  const first = evolveBrief(asked, command);
  expect(first.kind).toBe('changed');
  if (first.kind !== 'changed') return;
  expect(first.brief.revision).toBe(asked.revision + 1);
  expect(first.personLine).toBeNull();
  expect(first.filed).toEqual([{ id: 'priority', title: 'Main priority' }]);
  const second = evolveBrief(first.brief, command);
  expect(second.kind).toBe('unchanged');
  if (second.kind !== 'unchanged') return;
  expect(second.brief.revision).toBe(first.brief.revision);
  expect(second.brief.document.topics.priority?.state).toEqual({
    kind: 'agreed',
    answer: 'Less coordination time',
    source: { kind: 'chat', round: 1 },
    answerMessageId: 'msg-1',
  });
});

it('returns the same confirmation when finish is repeated at one revision', () => {
  const version = openingDocument({ need: NEED });
  const first = decideFinish(version, finishInput());
  expect(first.ok).toBe(true);
  if (!first.ok) return;
  expect(first.confirmation.approver).toBe('Sam Taylor');
  expect(first.confirmation.revision).toBe(1);
  expect(first.confirmation.acceptedGaps.map((gap) => gap.topicId)).toEqual([
    'priority', 'booking', 'measure', 'owner', 'info', 'rules',
  ]);
  const second = decideFinish(version, finishInput({
    filesReading: true,
    at: '2026-10-03T00:00:00.000Z',
    actor: { id: 'other', displayName: 'Someone Else' },
    acks: { reviewed: true, openGaps: false, data: true },
    existing: first.confirmation,
  }));
  expect(second).toEqual(first);
  expect(version.revision).toBe(1);
});

it('refuses finish for a file still reading, open gaps, and a missing data acknowledgement', () => {
  const version = openingDocument({ need: NEED });
  expect(decideFinish(version, finishInput({ filesReading: true, acks: { reviewed: true, openGaps: false, data: false } })))
    .toEqual({ ok: false, kind: 'file-reading', reason: BRIEF_REASONS.fileReading });
  expect(decideFinish(version, finishInput({ acks: { reviewed: true, openGaps: false, data: false } })))
    .toEqual({ ok: false, kind: 'open-gaps', reason: BRIEF_REASONS.openGaps });
  version.document.dataTier = { tier: 2, reason: 'The tool handles contact details.' };
  expect(decideFinish(version, finishInput())).toEqual({ ok: false, kind: 'data-ack', reason: BRIEF_REASONS.dataAck });
  const allowed = decideFinish(version, finishInput({ acks: { reviewed: true, openGaps: true, data: true } }));
  expect(allowed.ok).toBe(true);
});

it('finishes a fully settled brief without a gaps acknowledgement', () => {
  let version = openingDocument({ need: NEED });
  for (const topicId of ['priority', 'measure', 'booking', 'rules', 'owner', 'info']) {
    version = changedBrief(version, { kind: 'accept-suggestion', topicId });
  }
  expect(version.revision).toBe(7);
  expect(version.document.topicOrder.every((id) => {
    const topic = version.document.topics[id]!;
    return topic.state.kind === 'agreed' && topic.needsReview !== true;
  })).toBe(true);
  const finished = decideFinish(version, finishInput({ acks: { reviewed: true, openGaps: false, data: false } }));
  expect(finished).toMatchObject({
    ok: true,
    confirmation: { revision: 7, approver: 'Sam Taylor', acceptedGaps: [] },
  });
  expect(version.revision).toBe(7);
});

it('projects a snapshot the screen can read, and keeps a removed label off it', () => {
  const version = openingDocument({ need: NEED });
  version.document.causeLabels = ['Food', 'Health'];
  const removed = evolveBrief(version, { kind: 'remove-label', label: 'Food' });
  expect(removed.kind).toBe('changed');
  if (removed.kind !== 'changed') return;
  expect(removed.brief.document.causeLabels).toEqual(['Health']);
  expect(removed.brief.document.removedCauseLabels).toEqual(['Food']);
  const snapshot = snapshotOf(removed.brief);
  expect(snapshotOf(removed.brief)).toEqual(snapshot);
  expect(Object.keys(snapshot)).toEqual([
    'revision', 'need', 'usersToday', 'successMeasure', 'topics', 'questions', 'dataTier', 'fit', 'causeLabels',
  ]);
  expect(snapshot.causeLabels).toEqual(['Health']);
  expect(snapshot.topics).toHaveLength(6);
  expect(Object.keys(snapshot.topics[0] ?? {})).toEqual([
    'id', 'title', 'required', 'importance', 'why', 'suggestion', 'plannedQuestion', 'state',
  ]);
  expect(snapshot.questions).toEqual([]);
  expect(snapshot.revision).toBe(2);
  const restored = evolveBrief(removed.brief, { kind: 'remove-label', label: 'Food' });
  expect(restored.kind).toBe('unchanged');
  if (restored.kind !== 'unchanged') return;
  expect(restored.brief.document.removedCauseLabels).toEqual(['Food']);
});

it('records a file fact on an optional topic and never agrees a required one', () => {
  const version = openingDocument({ need: NEED });
  version.document.topics.priority!.required = false;
  const applied = evolveBrief(version, {
    kind: 'apply-file-facts',
    fileId: 'rota',
    fileName: 'volunteer-rota.xlsx',
    facts: [
      { sectionId: 'need', text: 'replaced intake' },
      { sectionId: 'priority', text: 'Less waiting' },
      { sectionId: 'measure', text: 'Two hours' },
    ],
  });
  expect(applied.kind).toBe('changed');
  if (applied.kind !== 'changed') return;
  expect(applied.brief.document.need.text).toBe(NEED);
  expect(applied.brief.document.topics.measure?.state).toEqual({ kind: 'open' });
  expect(applied.brief.document.topics.priority?.state).toEqual({
    kind: 'agreed',
    answer: 'Less waiting',
    source: { kind: 'file', fileId: 'rota', fileName: 'volunteer-rota.xlsx' },
    answerMessageId: null,
  });
  expect(applied.personLine).toBeNull();
  const requiredOnly = evolveBrief(openingDocument({ need: NEED }), {
    kind: 'apply-file-facts',
    fileId: 'rota',
    fileName: 'volunteer-rota.xlsx',
    facts: [{ sectionId: 'measure', text: 'Two hours' }],
  });
  expect(requiredOnly.kind).toBe('unchanged');
});
