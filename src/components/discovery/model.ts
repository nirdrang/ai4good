import type {
  BriefQuestion,
  BriefSnapshot,
  BriefSource,
  BriefTopic,
  DiscoveryFile,
  DiscoveryUIMessage,
  DiscoveryUsage,
  FileChatUIMessage,
  Importance,
} from "@/lib/discovery-stream";
import { BRIEF_STATUS, IMPORTANCE, NAME, QUESTION_STATUS, SCREEN, TEXT, type QuestionStatus } from "./a11y";

/** What the NGO has chosen for one current question but not yet sent. */
export type Draft =
  | { kind: "option"; optionId: string }
  | { kind: "own"; text: string }
  | { kind: "uncertain" };

/** The snapshot with the higher revision wins, whichever path delivered it. */
export function newerBrief(current: BriefSnapshot, incoming: BriefSnapshot): BriefSnapshot {
  return incoming.revision > current.revision ? incoming : current;
}

/** Agreed, and not waiting on a changed answer it depends on. */
export function topicSettled(topic: BriefTopic): boolean {
  return topic.state.kind === "agreed" && topic.needsReview !== true;
}

/** The words Save change stores. Null until the draft is an answer. */
export function answerText(question: BriefQuestion, draft: Draft | undefined): string | null {
  if (!draft) return null;
  if (draft.kind === "option") {
    return question.options.find((item) => item.id === draft.optionId)?.label ?? null;
  }
  if (draft.kind === "own") {
    const text = draft.text.trim();
    return text.length > 0 ? text : null;
  }
  return NAME.notSure;
}

/** Asked questions whose topic is not settled, plus any question Edit reopened. */
export function currentQuestions(
  brief: BriefSnapshot,
  reopened: readonly string[] = [],
): BriefQuestion[] {
  const again = new Set(reopened);
  return brief.questions.filter((question) => {
    if (again.has(question.id)) return true;
    const topic = brief.topics.find((item) => item.id === question.topicId);
    return topic !== undefined && !topicSettled(topic);
  });
}

export type PresentedMessage = {
  id: string;
  role: "user" | "assistant";
  paragraphs: string[];
  filed: string[];
  receipt: string | null;
};

function paragraphsOf(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

/** The first paragraph a person reads in one chat line. */
export function messageLead(message: DiscoveryUIMessage): string | null {
  for (const part of message.parts) {
    if (part.type !== "text") continue;
    const paragraph = paragraphsOf(part.text)[0];
    if (paragraph) return paragraph;
  }
  return null;
}

/** The conversation a person reads. Question parts stay out of the bubbles. */
export function presentMessages(messages: readonly DiscoveryUIMessage[]): PresentedMessage[] {
  return messages.flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") return [];
    const paragraphs: string[] = [];
    const filed: string[] = [];
    let receipt: string | null = null;
    for (const part of message.parts) {
      if (part.type === "text") paragraphs.push(...paragraphsOf(part.text));
      else if (part.type === "data-filed") {
        for (const topic of part.data.topics) filed.push(topic.title);
      } else if (part.type === "data-charge" && part.data.kind === "free") {
        receipt = TEXT.freeReceipt;
      } else if (part.type === "data-charge" && part.data.kind === "paid") {
        receipt = paidReceipt(part.data.usageMicros, part.data.feeMicros);
      }
    }
    return [{ id: message.id, role: message.role, paragraphs, filed, receipt }];
  });
}

export type FileBarTone = "reading" | "waiting" | "ready";

/** The file bar colour. Reading stays one working colour. A question warns. Ready is ok. */
export function fileBarClass(tone: FileBarTone): string {
  if (tone === "waiting") return "bg-usage-warn";
  if (tone === "ready") return "bg-usage-ok";
  return "bg-progress-reading";
}

export type FileRowView = {
  id: string;
  name: string;
  sizeText: string;
  statusText: string;
  percent: number | null;
  tone: FileBarTone | null;
  canOpen: boolean;
};

/** 1 KB is the smallest label. A megabyte keeps one decimal. */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const OPENING_CHIPS: Record<string, readonly string[]> = {
  "volunteer-rota.xlsx": [
    "Our August rota. Look at who books which shifts",
    "It shows where Sundays stay empty",
    "It has phone numbers. Leave them out",
  ],
  "sunday-gaps.csv": ["These are the shifts we could not fill", "Look at which kitchen is short"],
  "kitchen-rules.docx": [
    "Our volunteer rules. Look at who may take a shift",
    "Look at how shifts are cancelled",
  ],
};

const GENERIC_CHIPS = [
  "It shows how we work today",
  "It lists our volunteers or shifts",
  "Look at all of it",
] as const;

/** Chips for the opening file question. A known file name has its own list. */
export function openingChips(fileName: string): readonly string[] {
  return OPENING_CHIPS[fileName] ?? GENERIC_CHIPS;
}

function statusText(file: DiscoveryFile): string {
  if (file.origin === "intake") return TEXT.source.intake;
  switch (file.status.kind) {
    case "reading":
      return TEXT.fileStatus.reading(file.status.percent);
    case "waiting":
      return TEXT.fileStatus.waiting;
    case "ready":
      return TEXT.fileStatus.ready(file.status.facts);
    case "failed":
      return file.status.reason;
  }
}

function percentOf(file: DiscoveryFile): number | null {
  if (file.origin !== "discovery") return null;
  if (file.status.kind === "reading" || file.status.kind === "waiting") return file.status.percent;
  return null;
}

function rowTone(file: DiscoveryFile): FileBarTone | null {
  if (file.origin !== "discovery") return null;
  if (file.status.kind === "reading") return "reading";
  if (file.status.kind === "waiting") return "waiting";
  return null;
}

/** Intake files are listed and never counted. The limit of three applies only while the project is not funded. */
export function fileRows(files: readonly DiscoveryFile[], funded: boolean): {
  rows: FileRowView[];
  discoveryCount: number;
  canAdd: boolean;
  limitText: string | null;
} {
  const discoveryCount = files.filter((file) => file.origin === "discovery").length;
  return {
    rows: files.map((file) => ({
      id: file.id,
      name: file.name,
      sizeText: formatFileSize(file.sizeBytes),
      statusText: statusText(file),
      percent: percentOf(file),
      tone: rowTone(file),
      canOpen: file.origin === "discovery",
    })),
    discoveryCount,
    canAdd: funded || discoveryCount < 3,
    limitText: funded ? null : TEXT.fileLimit,
  };
}

export type FileChatMessage = { id: string; role: "user" | "assistant"; text: string };

export type FileChatView = {
  name: string;
  sizeText: string;
  messages: FileChatMessage[];
  chips: readonly string[];
  draft: string;
  canAnswer: boolean;
  busy: boolean;
  paid: boolean;
  statusText: string;
  percent: number | null;
  tone: FileBarTone | null;
  closeLabel: string;
  closeHint: string | null;
};

function messageText(message: FileChatUIMessage): string {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n\n")
    .trim();
}

/** What the file panel shows. The pause question and the done line come from the file when the chat does not already have them. */
export function fileChatView(input: {
  name: string;
  sizeBytes: number;
  file: Extract<DiscoveryFile, { origin: "discovery" }> | null;
  messages: readonly FileChatUIMessage[];
  draft: string;
  busy: boolean;
  paid: boolean;
}): FileChatView {
  const file = input.file;
  const waiting = file?.status.kind === "waiting" ? file.status : null;
  const messages: FileChatMessage[] = [];
  for (const message of input.messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const text = messageText(message);
    if (text.length === 0) continue;
    messages.push({ id: message.id, role: message.role, text });
  }
  const shown = messages.map((message) => message.text).join("\n");
  if (waiting && !shown.includes(waiting.question.text)) {
    messages.push({ id: `ask-${input.name}`, role: "assistant", text: waiting.question.text });
  }
  if (file?.status.kind === "ready") {
    const done = TEXT.fileDone(file.status.facts);
    if (!shown.includes(done)) messages.push({ id: `done-${input.name}`, role: "assistant", text: done });
  }
  let statusText: string = TEXT.fileStatus.asking;
  let percent: number | null = null;
  let tone: FileBarTone | null = null;
  let closeLabel: string = SCREEN.cancelAdding.name;
  let closeHint: string | null = null;
  if (file?.status.kind === "reading") {
    statusText = TEXT.fileChatStatus.reading(file.status.percent);
    percent = file.status.percent;
    tone = "reading";
    closeLabel = TEXT.closeAndKeep;
    closeHint = TEXT.closeReadingHint;
  } else if (file?.status.kind === "waiting") {
    statusText = TEXT.fileChatStatus.waiting(file.status.percent);
    percent = file.status.percent;
    tone = "waiting";
    closeLabel = TEXT.closeAndKeep;
    closeHint = TEXT.closeReadingHint;
  } else if (file?.status.kind === "ready") {
    statusText = TEXT.fileStatus.ready(file.status.facts);
    percent = 100;
    tone = "ready";
    closeLabel = TEXT.closeFile;
    closeHint = TEXT.closeReadyHint;
  } else if (file?.status.kind === "failed") {
    statusText = file.status.reason;
    closeLabel = TEXT.closeFile;
  }
  return {
    name: input.name,
    sizeText: formatFileSize(input.sizeBytes),
    messages,
    chips: waiting ? waiting.question.chips : file ? [] : openingChips(input.name),
    draft: input.draft,
    canAnswer: file === null || waiting !== null,
    busy: input.busy,
    paid: input.paid,
    statusText,
    percent,
    tone,
    closeLabel,
    closeHint,
  };
}

/** Whole cents stay two digits. A fractional cent stays visible. */
export function formatUsd(micros: number): string {
  const sign = micros < 0 ? "-" : "";
  const abs = Math.abs(micros);
  const whole = Math.trunc(abs / 1_000_000);
  const fraction = abs % 1_000_000;
  if (fraction % 10_000 === 0) {
    const cents = Math.trunc(fraction / 10_000);
    return `${sign}$${whole}.${String(cents).padStart(2, "0")}`;
  }
  const digits = String(fraction).padStart(6, "0").replace(/0+$/, "");
  return `${sign}$${whole}.${digits}`;
}

function paidReceipt(usageMicros: number, feeMicros: number): string {
  const total = formatUsd(usageMicros + feeMicros);
  return `${formatUsd(usageMicros)} AI usage + ${formatUsd(feeMicros)} platform fee = ${total} total`;
}

export function sourceText(source: BriefSource): string {
  switch (source.kind) {
    case "intake":
      return TEXT.source.intake;
    case "chat":
      return TEXT.source.chat(source.round);
    case "accepted-suggestion":
      return TEXT.source.accepted;
    case "edit":
      return TEXT.source.edit;
    case "file":
      return TEXT.source.file(source.fileName);
  }
}

/** Required topics only. The percent rounds down. */
export function progressOf(brief: BriefSnapshot): { agreed: number; total: number; percent: number } {
  const required = brief.topics.filter((topic) => topic.required);
  const agreed = required.filter((topic) => topicSettled(topic)).length;
  const total = required.length;
  return { agreed, total, percent: total === 0 ? 0 : Math.floor((agreed / total) * 100) };
}

export type QuestionRow = {
  topicId: string;
  questionId: string | null;
  text: string;
  status: QuestionStatus;
  note: string;
  canAnswer: boolean;
  canView: boolean;
};

function draftIsReady(draft: Draft | undefined): boolean {
  if (!draft) return false;
  if (draft.kind === "own") return draft.text.trim().length > 0;
  return true;
}

function draftNote(question: BriefQuestion, draft: Draft): string {
  if (draft.kind === "option") {
    return question.options.find((option) => option.id === draft.optionId)?.label ?? "";
  }
  if (draft.kind === "own") return draft.text.trim();
  return NAME.notSure;
}

/** One row per topic, in checklist order. */
export function questionRows(
  brief: BriefSnapshot,
  drafts: Readonly<Record<string, Draft>>,
): QuestionRow[] {
  return brief.topics.map((topic) => {
    const question = brief.questions.find((item) => item.topicId === topic.id) ?? null;
    if (topic.needsReview === true && topic.state.kind === "agreed") {
      return {
        topicId: topic.id,
        questionId: question?.id ?? null,
        text: question?.text ?? topic.plannedQuestion,
        status: "open",
        note: BRIEF_STATUS.needsReview,
        canAnswer: question !== null,
        canView: false,
      };
    }
    if (topic.state.kind === "agreed") {
      return {
        topicId: topic.id,
        questionId: question?.id ?? null,
        text: question?.text ?? topic.plannedQuestion,
        status: "answered",
        note: topic.state.answer,
        canAnswer: false,
        canView: true,
      };
    }
    if (topic.state.kind === "not-sure") {
      return {
        topicId: topic.id,
        questionId: topic.state.questionId,
        text: question?.text ?? topic.plannedQuestion,
        status: "notSure",
        note: topic.needsReview === true ? BRIEF_STATUS.needsReview : "Stays open in your brief",
        canAnswer: false,
        canView: true,
      };
    }
    if (question) {
      const draft = drafts[question.id];
      const ready = draftIsReady(draft);
      return {
        topicId: topic.id,
        questionId: question.id,
        text: question.text,
        status: ready ? "ready" : "open",
        note: ready && draft ? draftNote(question, draft) : "Waiting for your answer",
        canAnswer: true,
        canView: false,
      };
    }
    return {
      topicId: topic.id,
      questionId: null,
      text: topic.plannedQuestion,
      status: "next",
      note: "After this round",
      canAnswer: false,
      canView: false,
    };
  });
}

export function questionStatusText(status: QuestionStatus): string {
  return QUESTION_STATUS[status];
}

export type BriefSectionView = {
  id: string;
  title: string;
  status: string;
  text: string;
  detail: string;
  questionId: string | null;
};

/** The need, then each topic. Edit exists only where a question can reopen. */
export function briefSections(brief: BriefSnapshot): BriefSectionView[] {
  const sections: BriefSectionView[] = [
    {
      id: "need",
      title: "The need",
      status: sourceText(brief.need.source),
      text: brief.need.text,
      detail: "",
      questionId: null,
    },
  ];
  if (brief.usersToday) {
    sections.push({
      id: "usersToday",
      title: "Who uses it today",
      status: sourceText(brief.usersToday.source),
      text: brief.usersToday.text,
      detail: "",
      questionId: null,
    });
  }
  if (brief.successMeasure) {
    sections.push({
      id: "successMeasure",
      title: "How you will know it works",
      status: sourceText(brief.successMeasure.source),
      text: brief.successMeasure.text,
      detail: "",
      questionId: null,
    });
  }
  for (const topic of brief.topics) {
    const question = brief.questions.find((item) => item.topicId === topic.id) ?? null;
    const importance = IMPORTANCE[topic.importance];
    const questionLine = `Question: ${question?.text ?? topic.plannedQuestion}`;
    if (topic.needsReview === true) {
      const text =
        topic.state.kind === "agreed"
          ? topic.state.answer
          : topic.state.kind === "not-sure"
            ? topic.state.help
            : (question?.text ?? topic.plannedQuestion);
      const source = topic.state.kind === "agreed" ? `${sourceText(topic.state.source)}. ` : "";
      sections.push({
        id: topic.id,
        title: topic.title,
        status: BRIEF_STATUS.needsReview,
        text,
        detail: `${source}${importance}. ${questionLine}`,
        questionId: question?.id ?? (topic.state.kind === "not-sure" ? topic.state.questionId : null),
      });
      continue;
    }
    if (topic.state.kind === "agreed") {
      sections.push({
        id: topic.id,
        title: topic.title,
        status: BRIEF_STATUS.agreed,
        text: topic.state.answer,
        detail: `${sourceText(topic.state.source)}. ${importance}. Question: ${question?.text ?? topic.plannedQuestion}`,
        questionId: question?.id ?? null,
      });
    } else if (topic.state.kind === "not-sure") {
      sections.push({
        id: topic.id,
        title: topic.title,
        status: BRIEF_STATUS.notSure,
        text: topic.state.help,
        detail: `${importance}. Question: ${question?.text ?? topic.plannedQuestion}`,
        questionId: topic.state.questionId,
      });
    } else {
      sections.push({
        id: topic.id,
        title: topic.title,
        status: BRIEF_STATUS.open,
        text: question?.text ?? topic.plannedQuestion,
        detail: importance,
        questionId: question?.id ?? null,
      });
    }
  }
  for (const suggestion of brief.suggestions) {
    sections.push({
      id: suggestion.id,
      title: suggestion.fileName,
      status: BRIEF_STATUS.suggestion,
      text: suggestion.fact,
      detail: "",
      questionId: null,
    });
  }
  return sections;
}

export type UsageTone = "green" | "yellow" | "red";

/**
 * Colour from the unrounded consumed fraction.
 * 0.8 and 0.95 stay yellow; the next fraction above 0.95 is red.
 */
export function gaugeTone(consumed: number): UsageTone {
  if (consumed > 0.95) return "red";
  if (consumed >= 0.8) return "yellow";
  return "green";
}

function ratio(used: number, total: number): number {
  if (total <= 0) return 0;
  return used / total;
}

export type UsageView = {
  headline: string;
  values: { daily: string; beta: string; fuel: string };
  bar: { free: number; fuel: number; label: string; freeTone: UsageTone; fuelTone: UsageTone };
  footer: string;
};

export function usageView(usage: DiscoveryUsage, resetLocalTime: string): UsageView {
  const dailyConsumed = ratio(usage.dailyGrant - usage.dailyLeft, usage.dailyGrant);
  const betaConsumed = ratio(usage.betaGrant - usage.betaLeft, usage.betaGrant);
  const freeTone = gaugeTone(Math.max(dailyConsumed, betaConsumed));
  const fuelConsumed = usage.allocationMicros > 0 ? usage.settledMicros / usage.allocationMicros : 0;
  const fuelTone = gaugeTone(fuelConsumed);
  const fuel = formatUsd(usage.availableMicros);
  const freeTitle = betaConsumed > dailyConsumed ? "Beta free replies" : "Free replies";
  const freeCount =
    betaConsumed > dailyConsumed
      ? `${usage.betaLeft} of ${usage.betaGrant} left`
      : `${usage.dailyLeft} of ${usage.dailyGrant} left today`;
  const coversHold = usage.availableMicros >= usage.holdMicros;
  const returns =
    usage.betaLeft > 0 && resetLocalTime.length > 0
      ? ` Free replies return at ${resetLocalTime}.`
      : " Beta replies do not reset.";
  let headline: string;
  if (usage.nextReply === "free") headline = `Next reply is free · ${usage.dailyLeft} left today`;
  else if (usage.nextReply === "unavailable") headline = `Not available now.${returns}`;
  else if (!coversHold) headline = `Next reply is paid · ${fuel} left. More fuel needed to reply.${returns}`;
  else if (fuelTone === "green") {
    headline = `Next reply is paid · ${fuel} left. ${formatUsd(usage.holdMicros)} hold per reply.${returns}`;
  } else {
    headline = `Next reply is paid · ${fuel} left. Low fuel. Replies still work. ${formatUsd(usage.holdMicros)} hold per reply.${returns}`;
  }
  let footer: string;
  if (usage.nextReply === "paid") {
    const tail =
      usage.betaLeft > 0 && resetLocalTime.length > 0
        ? ` Resets at ${resetLocalTime}.`
        : " Beta replies do not reset.";
    footer = `The shown fuel already excludes the hold. Only actual usage is charged. The hold is not an extra charge.${tail}`;
  } else if (usage.betaLeft > 0 && resetLocalTime.length > 0) {
    footer = `Free replies are used first, then fuel. Resets at ${resetLocalTime}.`;
  } else {
    footer = "Beta replies do not reset.";
  }
  return {
    headline,
    values: {
      daily: `${usage.dailyLeft} of ${usage.dailyGrant}`,
      beta: `${usage.betaLeft} of ${usage.betaGrant}`,
      fuel,
    },
    bar: {
      free: usage.dailyGrant > 0 ? Math.min(1, Math.max(0, usage.dailyLeft / usage.dailyGrant)) : 0,
      fuel:
        usage.allocationMicros > 0
          ? Math.min(1, Math.max(0, usage.availableMicros / usage.allocationMicros))
          : 0,
      label: `${freeTitle} ${freeCount}. Paid fuel ${fuel}.`,
      freeTone,
      fuelTone: usage.nextReply === "free" ? freeTone : fuelTone,
    },
    footer,
  };
}

export function resetClock(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

const IMPORTANCE_RANK: Record<Importance, number> = { needed: 0, suggested: 1, later: 2 };

export type OpenReviewItem = {
  topicId: string;
  topicTitle: string;
  questionId: string | null;
  importance: Importance;
  why: string;
  suggestion: string | null;
};

/** Topics that are not agreed, in importance order. An unasked topic still appears. */
export function openForReview(brief: BriefSnapshot): OpenReviewItem[] {
  const items = brief.topics.flatMap((topic): OpenReviewItem[] => {
    if (topicSettled(topic)) return [];
    const question = brief.questions.find((item) => item.topicId === topic.id) ?? null;
    const questionId =
      question?.id ?? (topic.state.kind === "not-sure" ? topic.state.questionId : null);
    return [
      {
        topicId: topic.id,
        topicTitle: topic.title,
        questionId,
        importance: question?.importance ?? topic.importance,
        why: topic.why,
        suggestion: topic.suggestion,
      },
    ];
  });
  return items.sort((a, b) => IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance]);
}

export type ReviewSection = {
  id: string;
  title: string;
  text: string;
  source: string;
  editable: boolean;
};

/** The brief as it stands. An accepted suggestion stays as the person accepted it. */
export function reviewSections(brief: BriefSnapshot): ReviewSection[] {
  const sections: ReviewSection[] = [
    {
      id: "need",
      title: TEXT.review.need,
      text: brief.need.text,
      source: sourceText(brief.need.source),
      editable: true,
    },
  ];
  if (brief.usersToday) {
    sections.push({
      id: "usersToday",
      title: TEXT.review.users,
      text: brief.usersToday.text,
      source: sourceText(brief.usersToday.source),
      editable: true,
    });
  }
  for (const topic of brief.topics) {
    if (topic.state.kind !== "agreed" || topic.needsReview === true) continue;
    sections.push({
      id: topic.id,
      title: topic.title,
      text: topic.state.answer,
      source: sourceText(topic.state.source),
      editable: true,
    });
  }
  if (brief.successMeasure) {
    sections.push({
      id: "successMeasure",
      title: TEXT.review.success,
      text: brief.successMeasure.text,
      source: sourceText(brief.successMeasure.source),
      editable: true,
    });
  }
  return sections;
}

export type ReviewTicks = { reviewedRevision: number | null; openGaps: boolean; data: boolean };

/** Finish stays unavailable while an edit is open, and the review tick must match this revision. */
export function reviewGate(input: {
  revision: number;
  openCount: number;
  ticks: ReviewTicks;
  editing: boolean;
}): { canFinish: boolean; hint: string } {
  if (input.editing) return { canFinish: false, hint: TEXT.review.gateEditing };
  const reviewed = input.ticks.reviewedRevision === input.revision;
  const gapsOk = input.openCount === 0 || input.ticks.openGaps;
  if (reviewed && gapsOk && input.ticks.data) {
    return { canFinish: true, hint: TEXT.review.gateReady(input.revision) };
  }
  return { canFinish: false, hint: TEXT.review.gateIdle };
}

export function fileTookLine(file: DiscoveryFile): string {
  const where = file.origin === "intake" ? TEXT.review.fromIntake : TEXT.review.addedInDiscovery;
  const took = file.tookFromIt ? TEXT.review.took(file.tookFromIt) : TEXT.review.tookNothing;
  return `${file.name} · ${where}. ${took}`;
}
