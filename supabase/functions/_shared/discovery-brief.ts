/**
 * Pure Discovery brief transitions. No Deno, no database, no browser.
 * A revision bumps only when the document changes meaning. Finish never bumps one.
 */

export type Importance = 'needed' | 'suggested' | 'later';

export type BriefSource =
  | { kind: 'intake' }
  | { kind: 'chat'; round: number }
  | { kind: 'accepted-suggestion' }
  | { kind: 'edit'; revision: number }
  | { kind: 'file'; fileId: string; fileName: string };

export type SuggestedAnswer = { id: string; label: string; answer: string };

export type BriefSection = { text: string; source: BriefSource };

export type TopicDefinition = {
  text: string;
  options: SuggestedAnswer[];
  suggestedId: string;
  recommendation: string;
  uncertaintyHelp: string;
};

export type TopicState =
  | { kind: 'open' }
  | { kind: 'not-sure'; questionId: string; help: string }
  | { kind: 'agreed'; answer: string; source: BriefSource; answerMessageId: string | null };

export type StoredTopic = {
  id: string;
  title: string;
  required: boolean;
  importance: Importance;
  why: string;
  suggestion: string | null;
  plannedQuestion: string;
  state: TopicState;
  needsReview?: boolean;
  definition: TopicDefinition;
};

export type StoredQuestion = {
  topicId: string;
  text: string;
  reason: string;
  options: SuggestedAnswer[];
  suggestedId: string;
  importance: Importance;
  recommendation: string;
  uncertaintyHelp: string;
  askedInRound: number;
};

export type DataTier = { tier: 0 | 1 | 2; reason: string };
export type BriefFit = { verdict: 'fits' | 'declined'; reason: string };

export type BriefDocument = {
  schemaVersion: 1;
  need: BriefSection;
  usersToday: BriefSection | null;
  successMeasure: BriefSection | null;
  topicOrder: string[];
  topics: Record<string, StoredTopic>;
  questionOrder: string[];
  questions: Record<string, StoredQuestion>;
  dependsOn: Record<string, string[]>;
  dataTier: DataTier | null;
  fit: BriefFit | null;
  causeLabels: string[];
  removedCauseLabels: string[];
  fileFacts?: { text: string; sectionId: string; source: Extract<BriefSource, { kind: 'file' }> }[];
};

export type BriefVersion = { revision: number; document: BriefDocument };

export type BriefQuestion = {
  id: string;
  topicId: string;
  text: string;
  reason: string;
  options: SuggestedAnswer[];
  suggestedId: string;
  importance: Importance;
  recommendation: string;
  uncertaintyHelp: string;
  askedInRound: number;
};

export type BriefTopic = {
  id: string;
  title: string;
  required: boolean;
  importance: Importance;
  why: string;
  suggestion: string | null;
  plannedQuestion: string;
  state: TopicState;
  needsReview?: boolean;
};

export type BriefSnapshot = {
  revision: number;
  need: BriefSection;
  usersToday: BriefSection | null;
  successMeasure: BriefSection | null;
  topics: BriefTopic[];
  questions: BriefQuestion[];
  dataTier: DataTier | null;
  fit: BriefFit | null;
  causeLabels: string[];
};

export type DiscoveryAnswer = {
  questionId: string;
  choice: string;
  text: string;
  certain: boolean;
};

export type FileFact = { sectionId: string; text: string };

export type BriefCommand =
  | { kind: 'edit'; sectionId: string; text: string }
  | { kind: 'accept-suggestion'; topicId: string; round?: number }
  | { kind: 'ask-topic'; topicId: string; round?: number }
  | { kind: 'remove-label'; label: string }
  | { kind: 'apply-answers'; answers: readonly DiscoveryAnswer[]; round: number; userMessageId: string }
  | { kind: 'apply-file-facts'; fileId: string; fileName: string; facts: readonly FileFact[] };

export type PersonLine = { id: string; role: 'user'; parts: [{ type: 'text'; text: string }] };

export type FiledTopic = { id: string; title: string };

export type BriefTransition =
  | { kind: 'unchanged'; brief: BriefVersion }
  | { kind: 'changed'; brief: BriefVersion; personLine: PersonLine | null; filed: FiledTopic[] }
  | { kind: 'refused'; refusal: { kind: string; reason: string } };

export type AcceptedGap = { topicId: string; title: string; importance: Importance; reason: string };

export type Confirmation = {
  revision: number;
  approver: string;
  at: string;
  acceptedGaps: AcceptedGap[];
};

export type FinishInput = {
  acks: { reviewed: true; openGaps: boolean; data: boolean };
  filesReading: boolean;
  actor: { id: string; displayName: string };
  at: string;
  existing: Confirmation | null;
};

export type FinishDecision =
  | { ok: true; confirmation: Confirmation }
  | { ok: false; kind: 'file-reading' | 'open-gaps' | 'data-ack' | 'invalid-request'; reason: string };

export type OpeningTopic = {
  id: string;
  title: string;
  required?: boolean;
  importance?: Importance;
  why: string;
  suggestion: string | null;
  plannedQuestion: string;
  definition?: TopicDefinition;
  dependsOn?: readonly string[];
};

const NOT_SURE = "I'm not sure";
const SECTION_TITLE: Record<string, string> = {
  need: 'The need',
  usersToday: 'Who uses it, and what they do today',
  successMeasure: 'How you will know it works',
};

export const BRIEF_REASONS = {
  stale: 'The brief changed. Review the latest revision.',
  finished: 'Discovery is finished. No further reply is charged.',
  fileReading: 'A file is still being read. You can finish when it is ready.',
  openGaps: 'Open questions stay in the brief unless you accept them.',
  dataAck: 'Tick the data box before you finish.',
  unknownSection: 'That part of the brief cannot be edited.',
  unknownTopic: 'That topic is not in the brief.',
  noSuggestion: 'This topic has no suggestion to accept.',
} as const;

function option(id: string, label: string): SuggestedAnswer {
  return { id, label, answer: label };
}

function definitionOf(
  text: string,
  options: SuggestedAnswer[],
  suggestedId: string,
  recommendation: string,
  uncertaintyHelp: string,
): TopicDefinition {
  return { text, options, suggestedId, recommendation, uncertaintyHelp };
}

const DEFAULT_TOPICS: readonly OpeningTopic[] = [
  {
    id: 'priority',
    title: 'Main priority',
    why: 'A clear priority keeps the first version small and useful.',
    suggestion: 'Less coordination time',
    plannedQuestion: 'What should improve first?',
    definition: definitionOf(
      'What should improve first?',
      [option('time', 'Less coordination time'), option('coverage', 'Fewer unfilled shifts')],
      'time',
      'Suggested: less coordination time. Your intake says scheduling takes four hours each week.',
      'To find out: ask your coordinators which problem causes the most work.',
    ),
  },
  {
    id: 'booking',
    title: 'Who books shifts',
    why: 'This decides who needs access and which rules we ask about next.',
    suggestion: 'Volunteers book themselves',
    plannedQuestion: 'Who should book volunteers into shifts?',
    definition: definitionOf(
      'Who should book volunteers into shifts?',
      [option('self', 'Volunteers book themselves'), option('coordinators', 'Coordinators book shifts')],
      'self',
      'Suggested: volunteers book themselves, and coordinators handle exceptions.',
      'To find out: check whether your volunteers can book online.',
    ),
    dependsOn: [],
  },
  {
    id: 'measure',
    title: 'Success measure',
    why: 'You can use this target to check whether the first version helps.',
    suggestion: 'Two hours a week, down from four',
    plannedQuestion: 'What weekly scheduling time would count as success?',
    definition: definitionOf(
      'What weekly scheduling time would count as success?',
      [option('two', 'Two hours a week'), option('one', 'One hour a week')],
      'two',
      'Suggested: two hours a week, down from four.',
      'To find out: ask the people who schedule shifts how long last week took.',
    ),
    dependsOn: ['priority'],
  },
  {
    id: 'owner',
    title: 'Maintenance owner',
    why: 'Someone must manage access and small changes after handoff.',
    suggestion: 'Our operations lead',
    plannedQuestion: 'Who will look after the tool?',
    definition: definitionOf(
      'Who will look after the tool?',
      [option('lead', 'Our operations lead'), option('coordinators', 'Our coordinators')],
      'lead',
      'Suggested: your operations lead already handles access.',
      'To find out: ask who fixes a problem when a coordinator is away.',
    ),
  },
  {
    id: 'info',
    title: 'Information handled',
    why: 'Less personal information means less risk and simpler rules.',
    suggestion: 'Name and phone only',
    plannedQuestion: 'What volunteer information will the tool keep?',
    definition: definitionOf(
      'What volunteer information will the tool keep?',
      [option('phone', 'Name and phone only'), option('email', 'Name, phone and email')],
      'phone',
      'Suggested: name and phone are enough to fill a shift.',
      'To find out: list the fields your rota uses today.',
    ),
    dependsOn: ['owner'],
  },
  {
    id: 'rules',
    title: 'Booking rules',
    why: 'You said volunteers book themselves, so the tool needs limits.',
    suggestion: 'Weekly shift limit',
    plannedQuestion: 'Which booking rules should the tool enforce?',
    definition: definitionOf(
      'Which booking rules should the tool enforce?',
      [option('weekly', 'Weekly shift limit'), option('none', 'No weekly limit')],
      'weekly',
      'Suggested: a weekly shift limit keeps the rota fair.',
      'To find out: ask how many shifts one volunteer may take.',
    ),
    dependsOn: ['booking'],
  },
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function topicSettled(topic: { state: { kind: string }; needsReview?: boolean }): boolean {
  return topic.state.kind === 'agreed' && topic.needsReview !== true;
}

function hasAnswer(topic: StoredTopic): boolean {
  return topic.state.kind === 'agreed' || topic.state.kind === 'not-sure';
}

function genericDefinition(topic: OpeningTopic): TopicDefinition {
  const suggestion = topic.suggestion ?? 'Something else';
  return definitionOf(
    topic.plannedQuestion,
    [option('suggested', suggestion), option('other', 'Something else')],
    'suggested',
    `Suggested: ${suggestion}.`,
    'To find out: ask the people who do this work.',
  );
}

function storedTopic(seed: OpeningTopic): StoredTopic {
  return {
    id: seed.id,
    title: seed.title,
    required: seed.required ?? true,
    importance: seed.importance ?? 'needed',
    why: seed.why,
    suggestion: seed.suggestion,
    plannedQuestion: seed.plannedQuestion,
    state: { kind: 'open' },
    definition: clone(seed.definition ?? genericDefinition(seed)),
  };
}

export function openingDocument(input: { need: string; topics?: readonly OpeningTopic[] }): BriefVersion {
  const seeds = input.topics ?? DEFAULT_TOPICS;
  const topics: Record<string, StoredTopic> = {};
  const topicOrder: string[] = [];
  for (const seed of seeds) {
    if (topics[seed.id]) continue;
    topics[seed.id] = storedTopic(seed);
    topicOrder.push(seed.id);
  }
  const present = new Set(topicOrder);
  const dependsOn: Record<string, string[]> = {};
  for (const seed of seeds) {
    if (!present.has(seed.id) || !seed.dependsOn) continue;
    const prerequisites = seed.dependsOn.filter((id) => present.has(id) && id !== seed.id);
    if (prerequisites.length > 0) dependsOn[seed.id] = [...prerequisites];
  }
  return {
    revision: 1,
    document: {
      schemaVersion: 1,
      need: { text: input.need, source: { kind: 'intake' } },
      usersToday: null,
      successMeasure: null,
      topicOrder,
      topics,
      questionOrder: [],
      questions: {},
      dependsOn,
      dataTier: null,
      fit: null,
      causeLabels: [],
      removedCauseLabels: [],
    },
  };
}

function topicSnapshot(topic: StoredTopic): BriefTopic {
  const projected: BriefTopic = {
    id: topic.id,
    title: topic.title,
    required: topic.required,
    importance: topic.importance,
    why: topic.why,
    suggestion: topic.suggestion,
    plannedQuestion: topic.plannedQuestion,
    state: clone(topic.state),
  };
  if (topic.needsReview === true) projected.needsReview = true;
  return projected;
}

export function snapshotOf(version: BriefVersion): BriefSnapshot {
  const document = version.document;
  return {
    revision: version.revision,
    need: clone(document.need),
    usersToday: clone(document.usersToday),
    successMeasure: clone(document.successMeasure),
    topics: document.topicOrder.filter((id) => document.topics[id]).map((id) => topicSnapshot(document.topics[id]!)),
    questions: document.questionOrder.filter((id) => document.questions[id]).map((id) => {
      const question = document.questions[id]!;
      return { ...clone(question), id };
    }),
    dataTier: clone(document.dataTier),
    fit: clone(document.fit),
    causeLabels: [...document.causeLabels],
  };
}

function changed(
  document: BriefDocument,
  revision: number,
  personLine: PersonLine | null,
  filed: FiledTopic[],
): BriefTransition {
  return { kind: 'changed', brief: { revision, document }, personLine, filed };
}

function unchanged(version: BriefVersion): BriefTransition {
  return { kind: 'unchanged', brief: clone(version) };
}

function refused(kind: string, reason: string): BriefTransition {
  return { kind: 'refused', refusal: { kind, reason } };
}

function personLine(revision: number, text: string): PersonLine {
  return { id: `you-${revision}`, role: 'user', parts: [{ type: 'text', text }] };
}

function sectionTitle(document: BriefDocument, sectionId: string): string {
  return SECTION_TITLE[sectionId] ?? document.topics[sectionId]?.title ?? sectionId;
}

function ensureQuestion(document: BriefDocument, topic: StoredTopic, round: number): boolean {
  if (document.questions[topic.id]) return false;
  document.questions[topic.id] = {
    topicId: topic.id,
    text: topic.definition.text,
    reason: topic.why,
    options: clone(topic.definition.options),
    suggestedId: topic.definition.suggestedId,
    importance: topic.importance,
    recommendation: topic.definition.recommendation,
    uncertaintyHelp: topic.definition.uncertaintyHelp,
    askedInRound: Math.max(round, 1),
  };
  document.questionOrder.push(topic.id);
  return true;
}

function clearReview(topic: StoredTopic): void {
  delete topic.needsReview;
}

function markDependents(document: BriefDocument, topicId: string, skip: ReadonlySet<string>): void {
  for (const [dependentId, prerequisites] of Object.entries(document.dependsOn)) {
    if (!prerequisites.includes(topicId) || skip.has(dependentId)) continue;
    const dependent = document.topics[dependentId];
    if (!dependent || !hasAnswer(dependent)) continue;
    dependent.needsReview = true;
  }
}

function agreedSameText(topic: StoredTopic, text: string): boolean {
  return topic.state.kind === 'agreed' && topic.state.answer === text;
}

function editTopic(topic: StoredTopic, text: string, document: BriefDocument): boolean {
  const sameSettled = topic.needsReview !== true && (
    (topic.state.kind === 'not-sure' && text === NOT_SURE) || agreedSameText(topic, text)
  );
  if (sameSettled) return false;
  clearReview(topic);
  if (text === NOT_SURE) {
    const question = document.questions[topic.id];
    topic.state = { kind: 'not-sure', questionId: topic.id, help: question?.uncertaintyHelp ?? '' };
    return true;
  }
  topic.state = { kind: 'agreed', answer: text, source: { kind: 'edit', revision: 0 }, answerMessageId: null };
  return true;
}

function applyEdit(version: BriefVersion, command: Extract<BriefCommand, { kind: 'edit' }>): BriefTransition {
  const document = clone(version.document);
  const revision = version.revision + 1;
  if (command.sectionId === 'need' || command.sectionId === 'usersToday' || command.sectionId === 'successMeasure') {
    const current = command.sectionId === 'need'
      ? document.need.text
      : document[command.sectionId]?.text ?? null;
    if (current === command.text) return unchanged(version);
    const section: BriefSection = { text: command.text, source: { kind: 'edit', revision } };
    document[command.sectionId] = section;
    return changed(document, revision, personLine(revision, `You changed ${sectionTitle(document, command.sectionId)}: ${command.text}`), []);
  }
  const topic = document.topics[command.sectionId];
  if (!topic) return refused('unknown-section', BRIEF_REASONS.unknownSection);
  if (!editTopic(topic, command.text, document)) return unchanged(version);
  if (topic.state.kind === 'agreed' && topic.state.source.kind === 'edit') topic.state.source.revision = revision;
  markDependents(document, topic.id, new Set());
  const line = personLine(revision, `You changed ${sectionTitle(document, command.sectionId)}: ${command.text}`);
  if (topic.state.kind === 'agreed') topic.state.answerMessageId = line.id;
  return changed(document, revision, line, []);
}

function applyAccept(version: BriefVersion, command: Extract<BriefCommand, { kind: 'accept-suggestion' }>): BriefTransition {
  const topic = version.document.topics[command.topicId];
  if (!topic || topic.suggestion === null) return refused('no-suggestion', BRIEF_REASONS.noSuggestion);
  const questionReady = version.document.questions[topic.id] !== undefined;
  const settled = questionReady
    && topic.needsReview !== true
    && topic.state.kind === 'agreed'
    && topic.state.answer === topic.suggestion
    && topic.state.source.kind === 'accepted-suggestion';
  if (settled) return unchanged(version);
  const document = clone(version.document);
  const next = document.topics[command.topicId]!;
  const revision = version.revision + 1;
  ensureQuestion(document, next, command.round ?? 1);
  const line = personLine(revision, `You used the suggestion for ${next.title}: ${next.suggestion}`);
  clearReview(next);
  next.state = {
    kind: 'agreed',
    answer: next.suggestion ?? '',
    source: { kind: 'accepted-suggestion' },
    answerMessageId: line.id,
  };
  markDependents(document, next.id, new Set());
  return changed(document, revision, line, []);
}

function applyAsk(version: BriefVersion, command: Extract<BriefCommand, { kind: 'ask-topic' }>): BriefTransition {
  const topic = version.document.topics[command.topicId];
  if (!topic) return refused('unknown-topic', BRIEF_REASONS.unknownTopic);
  if (version.document.questions[topic.id]) return unchanged(version);
  const document = clone(version.document);
  ensureQuestion(document, document.topics[command.topicId]!, command.round ?? 1);
  return changed(document, version.revision + 1, null, []);
}

function applyRemoveLabel(version: BriefVersion, command: Extract<BriefCommand, { kind: 'remove-label' }>): BriefTransition {
  if (!version.document.causeLabels.includes(command.label)) return unchanged(version);
  const document = clone(version.document);
  document.causeLabels = document.causeLabels.filter((label) => label !== command.label);
  if (!document.removedCauseLabels.includes(command.label)) document.removedCauseLabels.push(command.label);
  return changed(document, version.revision + 1, null, []);
}

function sameChatProvenance(topic: StoredTopic, text: string, round: number, userMessageId: string): boolean {
  return topic.state.kind === 'agreed'
    && topic.state.answer === text
    && topic.state.source.kind === 'chat'
    && topic.state.source.round === round
    && topic.state.answerMessageId === userMessageId
    && topic.needsReview !== true;
}

function applyAnswers(version: BriefVersion, command: Extract<BriefCommand, { kind: 'apply-answers' }>): BriefTransition {
  const document = clone(version.document);
  const touched = new Set<string>();
  const contentChanged = new Set<string>();
  const filed: FiledTopic[] = [];
  let changedDocument = false;
  for (const answer of command.answers) {
    const question = document.questions[answer.questionId];
    const topic = question ? document.topics[question.topicId] : undefined;
    if (!question || !topic) continue;
    touched.add(topic.id);
    if (answer.certain) {
      if (sameChatProvenance(topic, answer.text, command.round, command.userMessageId)) continue;
      if (agreedSameText(topic, answer.text)) {
        if (topic.needsReview === true) {
          clearReview(topic);
          changedDocument = true;
        }
        continue;
      }
      clearReview(topic);
      topic.state = {
        kind: 'agreed',
        answer: answer.text,
        source: { kind: 'chat', round: command.round },
        answerMessageId: command.userMessageId,
      };
      contentChanged.add(topic.id);
      filed.push({ id: topic.id, title: topic.title });
      changedDocument = true;
      continue;
    }
    const wasUnsure = topic.state.kind === 'not-sure' && topic.state.questionId === topic.id;
    if (wasUnsure && topic.needsReview !== true) continue;
    clearReview(topic);
    topic.state = { kind: 'not-sure', questionId: topic.id, help: question.uncertaintyHelp };
    if (!wasUnsure) contentChanged.add(topic.id);
    changedDocument = true;
  }
  for (const id of contentChanged) markDependents(document, id, touched);
  if (!changedDocument) return unchanged(version);
  return changed(document, version.revision + 1, null, filed);
}

function sectionFromFile(current: BriefSection | null, text: string, source: Extract<BriefSource, { kind: 'file' }>): BriefSection | null {
  if (current?.text === text) return null;
  return { text, source };
}

function applyFileFacts(version: BriefVersion, command: Extract<BriefCommand, { kind: 'apply-file-facts' }>): BriefTransition {
  const document = clone(version.document);
  const source: Extract<BriefSource, { kind: 'file' }> = { kind: 'file', fileId: command.fileId, fileName: command.fileName };
  const filed: FiledTopic[] = [];
  let changedDocument = false;
  for (const fact of command.facts) {
    if (fact.sectionId === 'need') continue;
    if (fact.sectionId !== 'usersToday' && fact.sectionId !== 'successMeasure' && !document.topics[fact.sectionId]) continue;
    const recorded = document.fileFacts ?? [];
    if (!recorded.some((item) => item.sectionId === fact.sectionId && item.text === fact.text && item.source.fileId === command.fileId)) {
      document.fileFacts = [...recorded, { ...fact, source }];
      changedDocument = true;
    }
    if (fact.sectionId === 'usersToday' || fact.sectionId === 'successMeasure') {
      const next = sectionFromFile(document[fact.sectionId], fact.text, source);
      if (!next) continue;
      document[fact.sectionId] = next;
      changedDocument = true;
      continue;
    }
    const topic = document.topics[fact.sectionId];
    if (!topic || topic.required) continue;
    if (agreedSameText(topic, fact.text) && topic.needsReview !== true) continue;
    clearReview(topic);
    topic.state = { kind: 'agreed', answer: fact.text, source, answerMessageId: null };
    filed.push({ id: topic.id, title: topic.title });
    changedDocument = true;
  }
  if (!changedDocument) return unchanged(version);
  return changed(document, version.revision + 1, null, filed);
}

export type ReplyQuestionUpdate = {
  topicId: string;
  suggestion: string;
  suggested: string;
  importance: Importance;
  reason: string;
};

export type ReplyAgreedUpdate = { topicId: string; answer: string };
export type ReplyOpenUpdate = { topicId: string; importance: Importance };

export type ReplyUpdate = {
  text: string;
  questions: readonly ReplyQuestionUpdate[];
  agreed: readonly ReplyAgreedUpdate[];
  openQuestions: readonly ReplyOpenUpdate[];
};

function matchOption(options: readonly SuggestedAnswer[], suggested: string): string | null {
  const trimmed = suggested.trim();
  const byId = options.find((option) => option.id === trimmed);
  if (byId) return byId.id;
  const byLabel = options.find((option) => option.label === trimmed || option.answer === trimmed);
  return byLabel?.id ?? null;
}

function applyModelQuestion(document: BriefDocument, item: ReplyQuestionUpdate, round: number): boolean {
  const topic = document.topics[item.topicId];
  if (!topic) return false;
  let changed = false;
  if (item.suggestion.trim() !== '' && topic.suggestion !== item.suggestion) {
    topic.suggestion = item.suggestion;
    changed = true;
  }
  if (topic.importance !== item.importance) {
    topic.importance = item.importance;
    changed = true;
  }
  if (ensureQuestion(document, topic, round)) changed = true;
  const question = document.questions[topic.id];
  if (!question) return changed;
  const suggestedId = matchOption(question.options, item.suggested) ?? question.suggestedId;
  if (question.suggestedId !== suggestedId) {
    question.suggestedId = suggestedId;
    changed = true;
  }
  if (question.importance !== item.importance) {
    question.importance = item.importance;
    changed = true;
  }
  if (item.reason.trim() !== '' && question.reason !== item.reason) {
    question.reason = item.reason;
    changed = true;
  }
  return changed;
}

function applyModelAgreed(
  document: BriefDocument,
  item: ReplyAgreedUpdate,
  round: number,
  userMessageId: string,
  answered: ReadonlySet<string>,
): FiledTopic | null {
  const topic = document.topics[item.topicId];
  if (!topic || answered.has(topic.id)) return null;
  if (topic.state.kind === 'agreed' && topic.state.answer === item.answer && topic.needsReview !== true) return null;
  clearReview(topic);
  topic.state = {
    kind: 'agreed',
    answer: item.answer,
    source: { kind: 'chat', round },
    answerMessageId: userMessageId,
  };
  return { id: topic.id, title: topic.title };
}

function applyModelOpen(document: BriefDocument, item: ReplyOpenUpdate, round: number): boolean {
  const topic = document.topics[item.topicId];
  if (!topic || topicSettled(topic)) return false;
  let changed = false;
  if (topic.importance !== item.importance) {
    topic.importance = item.importance;
    changed = true;
  }
  if (ensureQuestion(document, topic, round)) changed = true;
  const question = document.questions[topic.id];
  if (question && question.importance !== item.importance) {
    question.importance = item.importance;
    changed = true;
  }
  return changed;
}

/** Answers land first. A model entry that repeats an answer already stored does not change the brief. */
export function applyReplyTurn(current: BriefVersion, input: {
  answers: readonly DiscoveryAnswer[];
  userMessageId: string;
  round: number;
  update: ReplyUpdate;
}): BriefTransition {
  const answered = evolveBrief(current, {
    kind: 'apply-answers',
    answers: input.answers,
    round: input.round,
    userMessageId: input.userMessageId,
  });
  const base = answered.kind === 'refused' ? current : answered.brief;
  const filed = answered.kind === 'changed' ? [...answered.filed] : [];
  const protectedIds = new Set<string>();
  for (const answer of input.answers) {
    const question = current.document.questions[answer.questionId];
    if (question) protectedIds.add(question.topicId);
  }
  const document = clone(base.document);
  const before = JSON.stringify(document);
  for (const question of input.update.questions) applyModelQuestion(document, question, input.round);
  for (const agreed of input.update.agreed) {
    const filedTopic = applyModelAgreed(document, agreed, input.round, input.userMessageId, protectedIds);
    if (filedTopic) filed.push(filedTopic);
  }
  for (const open of input.update.openQuestions) applyModelOpen(document, open, input.round);
  const modelChanged = JSON.stringify(document) !== before;
  if (!modelChanged) return answered.kind === 'changed' ? answered : unchanged(current);
  const revision = answered.kind === 'changed' ? answered.brief.revision : current.revision + 1;
  const line = answered.kind === 'changed' ? answered.personLine : null;
  return changed(document, revision, line, filed);
}

export function requiredAgreement(version: BriefVersion): { agreed: number; total: number; ready: boolean } {
  const required = version.document.topicOrder
    .map((id) => version.document.topics[id])
    .filter((topic): topic is StoredTopic => topic !== undefined && topic.required);
  const agreed = required.filter((topic) => topicSettled(topic)).length;
  return { agreed, total: required.length, ready: required.length > 0 && agreed === required.length };
}

export function evolveBrief(current: BriefVersion, command: BriefCommand): BriefTransition {
  switch (command.kind) {
    case 'edit':
      return applyEdit(current, command);
    case 'accept-suggestion':
      return applyAccept(current, command);
    case 'ask-topic':
      return applyAsk(current, command);
    case 'remove-label':
      return applyRemoveLabel(current, command);
    case 'apply-answers':
      return applyAnswers(current, command);
    case 'apply-file-facts':
      return applyFileFacts(current, command);
    default: {
      const unreachable: never = command;
      return unreachable;
    }
  }
}

function dataTierOf(document: BriefDocument): 0 | 1 | 2 {
  const tier = document.dataTier?.tier;
  return tier === 1 || tier === 2 ? tier : 0;
}

function openTopics(version: BriefVersion): StoredTopic[] {
  return version.document.topicOrder
    .map((id) => version.document.topics[id])
    .filter((topic): topic is StoredTopic => topic !== undefined && !topicSettled(topic));
}

export function decideFinish(version: BriefVersion, input: FinishInput): FinishDecision {
  if (input.existing && input.existing.revision === version.revision) {
    return { ok: true, confirmation: clone(input.existing) };
  }
  if (input.filesReading) return { ok: false, kind: 'file-reading', reason: BRIEF_REASONS.fileReading };
  if (input.acks.reviewed !== true) return { ok: false, kind: 'invalid-request', reason: 'Finish needs the review acknowledgement.' };
  const open = openTopics(version);
  if (open.length > 0 && !input.acks.openGaps) return { ok: false, kind: 'open-gaps', reason: BRIEF_REASONS.openGaps };
  const tier = dataTierOf(version.document);
  if ((tier === 1 || tier === 2) && !input.acks.data) return { ok: false, kind: 'data-ack', reason: BRIEF_REASONS.dataAck };
  return {
    ok: true,
    confirmation: {
      revision: version.revision,
      approver: input.actor.displayName,
      at: input.at,
      acceptedGaps: open.map((topic) => ({
        topicId: topic.id,
        title: topic.title,
        importance: topic.importance,
        reason: topic.why,
      })),
    },
  };
}

function isSource(value: unknown): value is BriefSource {
  if (!isRecord(value) || typeof value.kind !== 'string') return false;
  if (value.kind === 'intake' || value.kind === 'accepted-suggestion') return true;
  if (value.kind === 'chat') return typeof value.round === 'number';
  if (value.kind === 'edit') return typeof value.revision === 'number';
  if (value.kind === 'file') return typeof value.fileId === 'string' && typeof value.fileName === 'string';
  return false;
}

function isSection(value: unknown): value is BriefSection {
  return isRecord(value) && typeof value.text === 'string' && isSource(value.source);
}

export function isBriefDocument(value: unknown): value is BriefDocument {
  if (!isRecord(value) || value.schemaVersion !== 1) return false;
  if (!isSection(value.need)) return false;
  if (value.usersToday !== null && !isSection(value.usersToday)) return false;
  if (value.successMeasure !== null && !isSection(value.successMeasure)) return false;
  if (!Array.isArray(value.topicOrder) || !value.topicOrder.every((id) => typeof id === 'string')) return false;
  if (!Array.isArray(value.questionOrder) || !value.questionOrder.every((id) => typeof id === 'string')) return false;
  if (!isRecord(value.topics) || !isRecord(value.questions) || !isRecord(value.dependsOn)) return false;
  if (!Array.isArray(value.causeLabels) || !value.causeLabels.every((label) => typeof label === 'string')) return false;
  if (!Array.isArray(value.removedCauseLabels) || !value.removedCauseLabels.every((label) => typeof label === 'string')) return false;
  if (value.dataTier !== null && !isRecord(value.dataTier)) return false;
  if (value.fit !== null && !isRecord(value.fit)) return false;
  return true;
}

export function revisionNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) return value;
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 1) return parsed;
  }
  return null;
}

export function briefVersionFrom(revision: unknown, document: unknown): BriefVersion | null {
  const parsed = revisionNumber(revision);
  if (parsed === null || !isBriefDocument(document)) return null;
  return { revision: parsed, document };
}

export function staleBriefDetail(hint: string | null): { brief: BriefSnapshot } | null {
  if (hint === null || hint.trim() === '' || hint.trim() === 'null') return null;
  try {
    const parsed: unknown = JSON.parse(hint);
    if (!isRecord(parsed)) return null;
    const version = briefVersionFrom(parsed.revision, parsed.document);
    return version === null ? null : { brief: snapshotOf(version) };
  } catch {
    return null;
  }
}

function isPersonLine(value: unknown): value is PersonLine {
  if (!isRecord(value) || value.role !== 'user' || typeof value.id !== 'string') return false;
  return Array.isArray(value.parts) && value.parts.length > 0;
}

function confirmationFrom(value: unknown): Confirmation | null {
  if (!isRecord(value)) return null;
  const revision = revisionNumber(value.revision);
  const approver = typeof value.actor_name === 'string' ? value.actor_name : typeof value.approver === 'string' ? value.approver : null;
  const at = typeof value.confirmed_at === 'string' ? value.confirmed_at : typeof value.at === 'string' ? value.at : null;
  const gaps = value.accepted_gaps ?? value.acceptedGaps;
  if (revision === null || approver === null || at === null || !Array.isArray(gaps)) return null;
  return { revision, approver, at, acceptedGaps: gaps as AcceptedGap[] };
}

export function briefViewFromRead(value: unknown): { brief: BriefSnapshot | null; confirmation: Confirmation | null; lines: PersonLine[] } {
  const lines = isRecord(value) && Array.isArray(value.lines) ? value.lines.filter(isPersonLine) : [];
  if (!isRecord(value)) return { brief: null, confirmation: null, lines };
  const version = briefVersionFrom(value.revision, value.document);
  if (version === null) return { brief: null, confirmation: null, lines };
  return { brief: snapshotOf(version), confirmation: confirmationFrom(value.confirmation), lines };
}
