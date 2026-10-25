import { expect, it } from 'vitest';
import {
  applyReplyTurn,
  BRIEF_REASONS,
  decideFinish,
  evolveBrief,
  openingDocument,
  requiredAgreement,
  snapshotOf,
  type BriefVersion,
  type Confirmation,
  type FinishInput,
} from '../../../supabase/functions/_shared/discovery-brief.ts';
import { decideDiscoveryBrief, prepareDiscoveryBrief } from '../../../supabase/functions/_shared/discovery-brief-write.ts';
import type { Caller } from '../../../supabase/functions/_shared/caller.ts';
import type { AccountWriteRouteInput } from '../../../supabase/functions/_shared/write-routes.ts';

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
  version.document.dataTier = { tier: 2, kinds: ['special-category'], reason: 'The tool handles contact details.', responsibility: 'ngo' };
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

it('records file facts without agreeing any topic, and a later file never replaces a filled section', () => {
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
      { sectionId: 'successMeasure', text: 'Scheduling takes 45 minutes.' },
      { sectionId: 'successMeasure', text: 'Checked after four weeks.' },
    ],
  });
  expect(applied.kind).toBe('changed');
  if (applied.kind !== 'changed') return;
  const document = applied.brief.document;
  expect(document.need.text).toBe(NEED);
  expect(document.topics.priority?.state).toEqual({ kind: 'open' });
  expect(document.topics.measure?.state).toEqual({ kind: 'open' });
  expect(document.fileFacts).toMatchObject([
    { sectionId: 'priority', text: 'Less waiting', source: { kind: 'file', fileId: 'rota' } },
    { sectionId: 'measure', text: 'Two hours' },
    { sectionId: 'successMeasure', text: 'Scheduling takes 45 minutes.' },
    { sectionId: 'successMeasure', text: 'Checked after four weeks.' },
  ]);
  expect(document.successMeasure).toEqual({
    text: 'Scheduling takes 45 minutes. Checked after four weeks.',
    source: { kind: 'file', fileId: 'rota', fileName: 'volunteer-rota.xlsx' },
  });
  expect(applied.personLine).toBeNull();
  const later = evolveBrief(applied.brief, {
    kind: 'apply-file-facts',
    fileId: 'notice',
    fileName: 'notice.png',
    facts: [{ sectionId: 'successMeasure', text: 'Hilltop is closed on Wednesdays.' }],
  });
  expect(later.kind).toBe('changed');
  if (later.kind !== 'changed') return;
  expect(later.brief.document.successMeasure).toEqual(document.successMeasure);
  expect(later.brief.document.fileFacts?.at(-1)).toMatchObject({ text: 'Hilltop is closed on Wednesdays.', source: { fileId: 'notice' } });
});

it('reopens an agreed topic the AI lists as still open, so Discovery is not ready', () => {
  const version = openingDocument({ need: NEED });
  for (const topic of Object.values(version.document.topics)) {
    topic.state = { kind: 'agreed', answer: 'Agreed', source: { kind: 'chat', round: 1 }, answerMessageId: null };
  }
  expect(requiredAgreement(version).ready).toBe(true);
  const reopened = applyReplyTurn(version, {
    answers: [], userMessageId: 'm2', round: 2,
    update: { text: 'Who exactly will look after the tool?', questions: [], agreed: [], openQuestions: [{ topicId: 'owner', importance: 'needed' }] },
  });
  expect(reopened.kind).toBe('changed');
  if (reopened.kind !== 'changed') return;
  expect(reopened.brief.document.topics.owner?.needsReview).toBe(true);
  expect(reopened.brief.document.questions.owner).toBeDefined();
  expect(requiredAgreement(reopened.brief)).toMatchObject({ ready: false, agreed: 5, total: 6 });
  const edited = openingDocument({ need: NEED });
  edited.document.topics.owner!.state = { kind: 'agreed', answer: 'Our operations lead', source: { kind: 'edit', revision: 1 }, answerMessageId: null };
  const withdrawn = applyReplyTurn(edited, {
    answers: [], userMessageId: 'm2', round: 2,
    update: { text: 'Understood, that stays open.', questions: [], agreed: [], openQuestions: [{ topicId: 'owner', importance: 'needed' }] },
  });
  expect(withdrawn.kind).toBe('changed');
  if (withdrawn.kind !== 'changed') return;
  expect(withdrawn.brief.document.topics.owner).toMatchObject({ needsReview: true, state: { kind: 'agreed', answer: 'Our operations lead' } });
});

it('gives a topic the AI records from chat a question, so the brief offers Edit for it', () => {
  const version = openingDocument({ need: NEED });
  const agreed = applyReplyTurn(version, {
    answers: [], userMessageId: 'm1', round: 1,
    update: { text: 'Noted.', questions: [], openQuestions: [], agreed: [{ topicId: 'measure', answer: 'At least 95% of shifts staffed' }] },
  });
  expect(agreed.kind).toBe('changed');
  if (agreed.kind !== 'changed') return;
  expect(agreed.brief.document.topics.measure?.state.kind).toBe('agreed');
  expect(agreed.brief.document.questions.measure).toBeDefined();
});

it('keeps the guidance and the blocker on the current decision when answers change', () => {
  const version = openingDocument({ need: NEED });
  const measured = applyReplyTurn(version, {
    answers: [], userMessageId: 'm1', round: 1,
    update: { text: 'Noted.', questions: [], openQuestions: [], agreed: [{ topicId: 'measure', answer: 'At least 95% of shifts staffed' }] },
  });
  if (measured.kind !== 'changed') throw new Error('measure not agreed');
  const measure = measured.brief.document.questions.measure!;
  expect(measure.options.map((option) => option.answer)).toEqual(['At least 95% of shifts staffed']);
  expect(measure.recommendation).toBe('Suggested: At least 95% of shifts staffed.');
  expect(measure.reason).toBe(measured.brief.document.topics.measure!.why);

  const ruled = applyReplyTurn(version, {
    answers: [], userMessageId: 'm1', round: 1,
    update: { text: 'Who approves training?', openQuestions: [], questions: [], agreed: [
      { topicId: 'booking', answer: 'Coordinators book shifts' },
      { topicId: 'rules', answer: 'Only trained cooks take lead shifts' },
    ] },
  });
  if (ruled.kind !== 'changed') throw new Error('rules not agreed');
  const blocked = applyReplyTurn(ruled.brief, {
    answers: [], userMessageId: 'm2', round: 2,
    update: { text: 'Who approves training?', agreed: [], openQuestions: [], questions: [{
      topicId: 'rules', suggestion: 'The kitchen manager approves training', suggested: 'The kitchen manager approves training',
      importance: 'needed', reason: 'Nobody is named to approve lead-cook training.',
    }] },
  });
  if (blocked.kind !== 'changed') throw new Error('rules question not applied');
  const rebooked = applyReplyTurn(blocked.brief, {
    answers: [], userMessageId: 'm3', round: 3,
    update: { text: 'Noted.', questions: [], openQuestions: [], agreed: [{ topicId: 'booking', answer: 'Volunteers book their own shifts' }] },
  });
  if (rebooked.kind !== 'changed') throw new Error('booking not changed');
  const rules = rebooked.brief.document.topics.rules!;
  expect(rules.needsReview).toBe(true);
  expect(rules.suggestion).toBe('The kitchen manager approves training');
  expect(rebooked.brief.document.questions.rules!.recommendation).toBe('Suggested: The kitchen manager approves training.');
  expect(rebooked.brief.document.questions.rules!.reason).toBe(
    'You changed Who books shifts. Check that this answer still fits. Nobody is named to approve lead-cook training.',
  );
  const finished = decideFinish(rebooked.brief, {
    acks: { reviewed: true, openGaps: true, data: true }, filesReading: false,
    actor: { id: 'a', displayName: 'Dana' }, at: '2026-10-25T00:00:00Z', existing: null,
  });
  if (!finished.ok) throw new Error('finish refused');
  const gap = finished.confirmation.acceptedGaps.find((item) => item.topicId === 'rules')!;
  expect(gap.reason).toContain('Current answer: Only trained cooks take lead shifts.');
  expect(gap.reason).toContain('Nobody is named to approve lead-cook training.');
});

it('replaces stale options when the AI recommends a new answer, and keeps the latest reason as the accepted gap', () => {
  const version = openingDocument({ need: NEED });
  const asked = applyReplyTurn(version, {
    answers: [], userMessageId: 'm1', round: 1,
    update: { text: 'Who approves lead training?', agreed: [], openQuestions: [], questions: [{
      topicId: 'rules', suggestion: 'Coordinators approve lead training', suggested: 'Coordinators approve lead training',
      importance: 'needed', reason: 'The tool needs a named role who can mark volunteers as trained.',
    }] },
  });
  expect(asked.kind).toBe('changed');
  if (asked.kind !== 'changed') return;
  const question = asked.brief.document.questions.rules!;
  expect(question.options).toEqual([{ id: 'round-1', label: 'Coordinators approve lead training', answer: 'Coordinators approve lead training' }]);
  expect(question.suggestedId).toBe('round-1');
  expect(question.recommendation).toBe('Suggested: Coordinators approve lead training.');
  expect(asked.brief.document.topics.rules?.suggestion).toBe('Coordinators approve lead training');
  expect(question.uncertaintyHelp).toBe('To find out: ask the people who do this work.');
  const finished = decideFinish(asked.brief, {
    acks: { reviewed: true, openGaps: true, data: true }, filesReading: false,
    actor: { id: 'a', displayName: 'Dana' }, at: '2026-10-25T00:00:00Z', existing: null,
  });
  expect(finished.ok).toBe(true);
  if (!finished.ok) return;
  expect(finished.confirmation.acceptedGaps.find((gap) => gap.topicId === 'rules')?.reason)
    .toBe('Clear limits keep the rota fair, whoever books the shifts. The tool needs a named role who can mark volunteers as trained.');
});

const ORG_ID = '22222222-2222-4222-8222-222222222222';
const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const CALLER: Caller = { id: 'account-1', githubHandle: null, emailVerified: true };

function briefInput(body: Record<string, unknown>): AccountWriteRouteInput {
  return {
    caller: CALLER,
    standing: {
      kind: 'account', accountType: 'ngo', lifecycle: 'active', orgRole: 'admin',
      orgExists: true, orgSeatAccountId: null, subject: null,
    },
    body, target: ORG_ID, subject: null, ip: null,
  };
}

function storedBrief(version: BriefVersion, confirmation: Record<string, unknown> | null = null) {
  return { revision: version.revision, document: version.document, confirmation, lines: [] as unknown[] };
}

it('shapes an edit for the commit and leaves a stale base for the database to refuse', async () => {
  const refused = decideDiscoveryBrief(briefInput({ organizationId: ORG_ID, action: 'edit' }));
  expect(refused).toMatchObject({ ok: false, kind: 'invalid-request', status: 400 });
  const version = openingDocument({ need: NEED });
  const decided = decideDiscoveryBrief(briefInput({
    projectId: PROJECT_ID, action: 'edit', sectionId: 'need', text: 'A shorter need.', baseRevision: 1,
  }));
  expect(decided.ok).toBe(true);
  if (!decided.ok) return;
  const prepared = await prepareDiscoveryBrief(CALLER, decided.args, {
    discoveryBriefOf: async () => ({ ok: true, value: storedBrief(version) }),
  });
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) return;
  expect(prepared.args.p_base_revision).toBe(1);
  expect(prepared.args.p_document?.need.text).toBe('A shorter need.');
  expect(prepared.args.p_person_line?.id).toBe('you-2');
  expect(prepared.args.p_confirmation).toBeNull();
  expect(prepared.args).not.toHaveProperty('clientBase');
  const stale = await prepareDiscoveryBrief(CALLER, { ...decided.args, clientBase: 4 }, {
    discoveryBriefOf: async () => ({ ok: true, value: storedBrief(version) }),
  });
  expect(stale.ok).toBe(true);
  if (!stale.ok) return;
  expect(stale.args.p_base_revision).toBe(4);
  expect(stale.args.p_document).toBeNull();
});

it('refuses a suggestion on a finished brief before it compares the base revision', async () => {
  const version = openingDocument({ need: NEED });
  const decided = decideDiscoveryBrief(briefInput({
    projectId: PROJECT_ID, action: 'accept', topicId: 'priority', baseRevision: 9,
  }));
  expect(decided.ok).toBe(true);
  if (!decided.ok) return;
  const finished = await prepareDiscoveryBrief(CALLER, decided.args, {
    discoveryBriefOf: async () => ({ ok: true, value: storedBrief(version, {
      revision: 1, actor_name: 'sam@example.com', confirmed_at: '2026-10-02T12:00:00.000Z', accepted_gaps: [],
    }) }),
  });
  expect(finished).toMatchObject({ ok: false, kind: 'finished', status: 409, reason: BRIEF_REASONS.finished });
  const missing = await prepareDiscoveryBrief(CALLER, decided.args, {
    discoveryBriefOf: async () => ({ ok: true, value: { revision: null, document: null, confirmation: null, lines: [] } }),
  });
  expect(missing).toMatchObject({ ok: false, kind: 'invalid-request', status: 409, reason: 'Discovery has no brief yet.' });
});
