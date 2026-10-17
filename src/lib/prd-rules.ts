import { scopeKey } from "./prd-stream";
import type {
  Action,
  ActionKind,
  ActionToken,
  Availability,
  CheckGap,
  CompletionCheck,
  DevQuestion,
  Funds,
  FundsBand,
  FundsState,
  NgoQuestion,
  Person,
  PrdRefusal,
  PrdSnapshot,
  PrdUIMessage,
  QuestionId,
  Result,
  Role,
  SendAvailability,
  Topic,
  TopicId,
  TopicState,
  TurnId,
  Viewer,
} from "./prd-stream";

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export type StoredMessage = { message: PrdUIMessage; forRole: Role | null };

export type TopicRecord = {
  id: TopicId;
  title: string;
  required: boolean;
  dependsOn: TopicId[];
  drafted: boolean;
  aiReady: boolean;
  confirmed: boolean;
  review: boolean;
  gap: string | null;
  gapClosed: boolean;
  changedDependency: TopicId | null;
  updatedInChat: boolean;
  body: string[];
  ngoBody: string[] | null;
  added: string[];
  sources: string[];
  stories: string[] | null;
};

export type QuestionStatus = "suggested" | "posted" | "answering" | "complete" | "used";

export type QuestionRecord = {
  id: QuestionId;
  topicId: TopicId;
  text: string;
  why: string;
  blocking: boolean;
  introTurn: TurnId;
  options: string[];
  impact: string;
  openPoint: string | null;
  status: QuestionStatus;
  followUp: "pending" | "none";
  evidence: string[];
  answer: string | null;
  briefTurn: TurnId | null;
  changed: boolean;
  pointOpen: boolean;
  using: boolean;
};

export type CheckRecord = Mutable<Omit<CompletionCheck, "gaps">> & { gaps: CheckGap[] };

export type PrdRecord = {
  sequence: number;
  revision: number;
  discoveryRevision: number;
  project: { title: string; organizationName: string };
  people: Person[];
  topics: TopicRecord[];
  devQuestions: Mutable<DevQuestion>[];
  questions: QuestionRecord[];
  chats: Record<string, StoredMessage[]>;
  drafts: Record<Role, Record<string, string>>;
  funds: Mutable<Funds>;
  check: CheckRecord | null;
  checkRuns: number;
  closed: { revision: number; openPoints: number } | null;
  versions: Record<string, number>;
  requests: Record<string, { chat: string; reply: string | null }>;
  busy: Record<string, string>;
};

export const ACTION_ROLE: Readonly<Record<ActionKind, Role>> = {
  "post-question": "dev",
  "complete-answer": "ngo",
  "confirm-topic": "dev",
  "reopen-topic": "dev",
  close: "dev",
  "close-anyway": "dev",
  "keep-working": "dev",
};

export const STALE_REASON = "The PRD changed since this was offered. Use the current version.";
export const CLOSED_REASON = "The PRD is closed.";
export const FOLLOW_UP_REASON = "Answer the AI’s question first.";
export const FUNDS_REASON =
  "Not enough left for another AI reply. The kitchen adds funds to continue.";
export const CHECK_FUNDS_REASON =
  "Confirming this section runs the completion check, and there is not enough left for it. The kitchen adds funds to continue.";
export const BUSY_REASON = "The AI is still answering in this chat.";
export const WAIT_REASON = "Wait for the AI to finish.";

export function refusal(
  kind: PrdRefusal["kind"],
  reason: string,
): { ok: false; refusal: PrdRefusal } {
  return { ok: false, refusal: { kind, reason } };
}

export function firstName(record: PrdRecord, role: Role): string {
  const person = record.people.find((item) => item.role === role);
  return person ? (person.name.split(" ")[0] ?? person.name) : role;
}

export function topicTarget(id: TopicId): string {
  return `topic:${id}`;
}

export function questionTarget(id: QuestionId): string {
  return `question:${id}`;
}

export const CLOSE_TARGET = "close";

export function askTarget(checkId: string): string {
  return `ask:${checkId}`;
}

export function issueToken(record: PrdRecord, kind: ActionKind, target: string): ActionToken {
  return `${kind}|${target}|${record.revision}|${record.versions[target] ?? 0}` as ActionToken;
}

function readToken(
  token: string,
): { kind: string; target: string; revision: number; version: number } | null {
  const parts = token.split("|");
  if (parts.length !== 4) return null;
  const [kind, target, revision, version] = parts;
  if (!kind || !target || !revision || !version) return null;
  const numbers = [Number(revision), Number(version)];
  if (!numbers.every(Number.isInteger)) return null;
  return { kind, target, revision: numbers[0]!, version: numbers[1]! };
}

export function tokenLive(record: PrdRecord, action: Action<ActionKind>): boolean {
  const token = readToken(action.token);
  return (
    token !== null &&
    record.closed === null &&
    token.kind === action.kind &&
    token.revision === record.revision &&
    token.version === (record.versions[token.target] ?? 0)
  );
}

function forbiddenReason(record: PrdRecord, kind: ActionKind): string {
  const dev = firstName(record, "dev");
  const ngo = firstName(record, "ngo");
  switch (kind) {
    case "post-question":
      return `Only ${dev} posts questions to ${ngo}.`;
    case "complete-answer":
      return `Only ${ngo} marks her answer complete.`;
    case "confirm-topic":
      return `Only ${dev} confirms sections.`;
    case "reopen-topic":
      return `Only ${dev} reopens sections.`;
    case "close":
    case "close-anyway":
    case "keep-working":
      return `Only ${dev} can close the PRD.`;
  }
}

export function verifyAction(
  record: PrdRecord,
  role: Role,
  action: Action<ActionKind>,
): Result<{ target: string }> {
  const token = readToken(action.token);
  if (token === null || token.kind !== action.kind) {
    return refusal("invalid", "This action could not be read.");
  }
  if (ACTION_ROLE[action.kind] !== role)
    return refusal("forbidden", forbiddenReason(record, action.kind));
  if (record.closed !== null) return refusal("closed", CLOSED_REASON);
  if (!tokenLive(record, action)) return refusal("stale", STALE_REASON);
  return { ok: true, value: { target: token.target } };
}

export function spend(versions: Record<string, number>, target: string): Record<string, number> {
  return { ...versions, [target]: (versions[target] ?? 0) + 1 };
}

export function topicState(topic: TopicRecord): TopicState {
  if (topic.review) return "needs-review";
  if (topic.confirmed) return "confirmed";
  if (topic.aiReady) return "ready";
  return topic.drafted ? "draft" : "open";
}

export function requiredProgress(record: PrdRecord): { confirmed: number; total: number } {
  const required = record.topics.filter((topic) => topic.required);
  return {
    confirmed: required.filter((topic) => topicState(topic) === "confirmed").length,
    total: required.length,
  };
}

export function allRequiredConfirmed(record: PrdRecord): boolean {
  const progress = requiredProgress(record);
  return progress.total > 0 && progress.confirmed === progress.total;
}

export function checkCurrent(record: PrdRecord): boolean {
  return record.check !== null && record.check.revision === record.revision;
}

export function checkPassedForRevision(record: PrdRecord): boolean {
  return (
    record.check !== null &&
    record.check.passed &&
    record.check.revision === record.revision &&
    allRequiredConfirmed(record)
  );
}

export function availableMicros(funds: Funds): number {
  return funds.allocationMicros - funds.settledMicros - funds.pendingMicros;
}

export function canAffordReply(funds: Funds): boolean {
  return availableMicros(funds) >= funds.replyHoldMicros;
}

/** Green below 80% of the allocation settled, yellow from 80% through 95%, red above 95%. Unrounded. */
export function fundsBand(funds: Funds): FundsBand {
  const spent = funds.settledMicros * 100;
  if (spent < funds.allocationMicros * 80) return "green";
  if (spent <= funds.allocationMicros * 95) return "yellow";
  return "red";
}

export function fundsState(funds: Funds): FundsState {
  return {
    allocationMicros: funds.allocationMicros,
    settledMicros: funds.settledMicros,
    pendingMicros: funds.pendingMicros,
    replyHoldMicros: funds.replyHoldMicros,
    availableMicros: Math.max(0, availableMicros(funds)),
    band: fundsBand(funds),
    replyFunded: canAffordReply(funds),
  };
}

export function anyBusy(record: PrdRecord): boolean {
  return Object.keys(record.busy).length > 0;
}

export function holdReply(funds: Funds): Mutable<Funds> {
  return { ...funds, pendingMicros: funds.pendingMicros + funds.replyHoldMicros };
}

export function settleReply(funds: Funds, costMicros: number): Mutable<Funds> {
  return {
    ...funds,
    pendingMicros: Math.max(0, funds.pendingMicros - funds.replyHoldMicros),
    settledMicros: funds.settledMicros + costMicros,
  };
}

export function releaseHolds(funds: Funds): Mutable<Funds> {
  return { ...funds, pendingMicros: 0 };
}

export function canWriteChat(record: PrdRecord, role: Role, key: string): boolean {
  if (record.closed !== null) return false;
  if (key === "main") return role === "dev";
  if (key.startsWith("topic:")) {
    return role === "dev" && record.topics.some((topic) => `topic:${topic.id}` === key);
  }
  if (key.startsWith("side:")) {
    const question = record.questions.find((item) => `side:${item.id}` === key);
    return (
      role === "ngo" &&
      question !== undefined &&
      (question.status === "posted" || question.status === "answering")
    );
  }
  return false;
}

function writeRefusalReason(record: PrdRecord, role: Role, key: string): string {
  const dev = firstName(record, "dev");
  const ngo = firstName(record, "ngo");
  if (!key.startsWith("side:")) return `Only ${dev} writes to the AI here.`;
  if (role === "dev") return `Only ${ngo} answers in her side chat.`;
  return "This question is not open for an answer.";
}

/** Whether this viewer can send in this chat now: role, then closed, then a running reply, then funds. */
export function sendAvailability(record: PrdRecord, role: Role, key: string): SendAvailability {
  if (record.closed !== null)
    return { kind: "unavailable", block: "closed", reason: CLOSED_REASON };
  if (!canWriteChat(record, role, key)) {
    return { kind: "unavailable", block: "role", reason: writeRefusalReason(record, role, key) };
  }
  if (record.busy[key]) return { kind: "unavailable", block: "busy", reason: BUSY_REASON };
  if (!canAffordReply(record.funds)) {
    return { kind: "unavailable", block: "funds", reason: FUNDS_REASON };
  }
  return { kind: "available" };
}

export function sendRefusal(record: PrdRecord, role: Role, key: string): PrdRefusal | null {
  const send = sendAvailability(record, role, key);
  if (send.kind === "available") return null;
  const kind = send.block === "role" ? "forbidden" : send.block;
  return { kind, reason: send.reason };
}

export function waitingDependency(record: PrdRecord, topic: TopicRecord): TopicRecord | null {
  return (
    record.topics.find((other) => {
      if (!topic.dependsOn.includes(other.id)) return false;
      const state = topicState(other);
      return state !== "confirmed" && state !== "ready";
    }) ?? null
  );
}

export function confirmStartsCheck(record: PrdRecord, topic: TopicRecord): boolean {
  if (!topic.required) return false;
  const others = record.topics.filter((item) => item.required && item.id !== topic.id);
  return (
    others.every((item) => topicState(item) === "confirmed") &&
    !(record.check !== null && record.check.passed && record.check.revision === record.revision)
  );
}

export function confirmBlock(
  record: PrdRecord,
  topic: TopicRecord,
): { kind: PrdRefusal["kind"]; reason: string } | null {
  const state = topicState(topic);
  if (topic.gap !== null) return { kind: "invalid", reason: "Fix the completion check gap first." };
  if (state === "confirmed") return { kind: "invalid", reason: "This section is confirmed." };
  if (state !== "ready" && state !== "needs-review") {
    return {
      kind: "invalid",
      reason: "The AI marks this section ready when every decision is in. Then you can confirm it.",
    };
  }
  const waits = waitingDependency(record, topic);
  if (waits) {
    return {
      kind: "invalid",
      reason: `${waits.title} must be ready before you can confirm this section.`,
    };
  }
  if (confirmStartsCheck(record, topic)) {
    if (record.busy.main) return { kind: "busy", reason: WAIT_REASON };
    if (!canAffordReply(record.funds)) return { kind: "funds", reason: CHECK_FUNDS_REASON };
  }
  return null;
}

/** A changed decision sends the changed topic and every confirmed dependent back to Needs review. */
export function markDependents(
  topics: TopicRecord[],
  changed: readonly TopicId[],
  inChat: TopicId | null = null,
): TopicRecord[] {
  const touched = new Set<TopicId>(changed);
  let next = topics.map((topic) =>
    touched.has(topic.id) && topic.confirmed
      ? {
          ...topic,
          confirmed: false,
          review: true,
          changedDependency: null,
          updatedInChat: topic.id === inChat,
        }
      : topic,
  );
  for (;;) {
    let moved = false;
    next = next.map((topic) => {
      const cause = topic.confirmed ? topic.dependsOn.find((id) => touched.has(id)) : undefined;
      if (cause === undefined) return topic;
      touched.add(topic.id);
      moved = true;
      return {
        ...topic,
        confirmed: false,
        review: true,
        changedDependency: cause,
        updatedInChat: false,
      };
    });
    if (!moved) return next;
  }
}

export function openPointCount(record: PrdRecord): number {
  const gaps = record.topics.filter((topic) => topic.gap !== null).length;
  const unconfirmed = record.topics.filter(
    (topic) => topic.required && topic.gap === null && topicState(topic) !== "confirmed",
  ).length;
  return gaps + unconfirmed;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function blockingCounts(record: PrdRecord): {
  unposted: number;
  waiting: number;
  toUse: number;
} {
  const blocking = record.questions.filter((question) => question.blocking);
  const count = (...statuses: QuestionStatus[]) =>
    blocking.filter((question) => statuses.includes(question.status)).length;
  return {
    unposted: count("suggested"),
    waiting: count("posted", "answering"),
    toUse: count("complete"),
  };
}

export function closeRemaining(record: PrdRecord, role: Role): string[] {
  if (record.closed !== null) return [];
  const dev = firstName(record, "dev");
  const ngo = firstName(record, "ngo");
  const isDev = role === "dev";
  const required = record.topics.filter((topic) => topic.required);
  const gaps = record.topics.filter((topic) => topic.gap !== null).length;
  const open = required.filter((topic) => topicState(topic) !== "confirmed" && topic.gap === null);
  const reviewable = open.filter((topic) => {
    const state = topicState(topic);
    return state === "ready" || state === "needs-review";
  });
  const held = reviewable.filter((topic) => waitingDependency(record, topic) !== null).length;
  const ready = reviewable.length - held;
  const { unposted, waiting } = blockingCounts(record);
  const toUse = record.questions.filter((question) => question.status === "complete").length;
  const writing = open.length - reviewable.length;
  const items: string[] = [];
  const sections = (count: number) => plural(count, "section", "sections");
  const questions = (count: number) => plural(count, "blocking question", "blocking questions");
  if (ready > 0) {
    items.push(`${sections(ready)} ready for ${isDev ? "you" : dev} to confirm`);
  }
  if (held > 0) items.push(`${sections(held)} waiting on another section`);
  if (writing > 0) items.push(`${sections(writing)} still being written`);
  if (unposted > 0) {
    items.push(
      isDev
        ? `${questions(unposted)} not posted to ${ngo}`
        : `${questions(unposted)} ${dev} has not sent you yet`,
    );
  }
  if (waiting > 0) {
    items.push(`${questions(waiting)} waiting for ${isDev ? ngo : "your answer"}`);
  }
  if (toUse > 0) {
    const answers = plural(toUse, "answer", "answers");
    items.push(
      isDev ? `${answers} from ${ngo} to use` : `${answers} you sent, waiting for ${dev} to use`,
    );
  }
  if (gaps > 0) {
    items.push(
      `${plural(gaps, "gap", "gaps")} from the completion check ${isDev ? "to fix" : `for ${dev} to fix`}`,
    );
  }
  if (!checkCurrent(record)) {
    items.push(
      `Completion check runs when ${isDev ? "you close" : `${dev} closes`}, or when all sections are confirmed`,
    );
  }
  return items;
}

function closedOpenPoint(topic: TopicRecord): boolean {
  return topicState(topic) !== "confirmed" && (topic.gap !== null || topic.required);
}

function closedStatusText(record: PrdRecord, topic: TopicRecord): string {
  if (topicState(topic) === "confirmed") return `Confirmed by ${firstName(record, "dev")}.`;
  if (topic.gap !== null) {
    return `The PRD closed with this completion check gap, recorded as an open point: ${topic.gap}`;
  }
  return topic.required
    ? "Not confirmed when the PRD closed. It is recorded as an open point."
    : "Not confirmed when the PRD closed.";
}

function reviewLead(record: PrdRecord, topic: TopicRecord): string {
  if (topic.gapClosed) return "Gap closed";
  const changed = record.topics.find((other) => other.id === topic.changedDependency);
  if (changed) return `Updated because ${changed.title} changed`;
  return topic.updatedInChat ? "Updated in its chat" : "Reopened";
}

export function blockerFor(record: PrdRecord, topic: TopicRecord, role: Role): string | null {
  if (record.closed !== null) {
    return closedOpenPoint(topic) ? "Recorded as an open point when the PRD closed" : null;
  }
  const dev = firstName(record, "dev");
  const ngo = firstName(record, "ngo");
  const isDev = role === "dev";
  if (topic.gap !== null) {
    return isDev
      ? "Completion check gap · fix it in this section"
      : `Completion check gap · ${dev} fixes it in this section`;
  }
  const state = topicState(topic);
  if (state === "confirmed") return null;
  if (state === "ready") return `AI: every decision is in · ${dev} can confirm`;
  if (state === "needs-review")
    return `${reviewLead(record, topic)} · ${dev} reviews and confirms again`;
  const asked = record.devQuestions.filter(
    (question) => question.topicId === topic.id && question.answered === null,
  ).length;
  if (asked > 0) return `${plural(asked, "question", "questions")} ready for ${dev}`;
  const question = record.questions.find(
    (item) => item.topicId === topic.id && item.blocking && item.status !== "used",
  );
  if (question) {
    switch (question.status) {
      case "suggested":
        return `Question for ${ngo} not posted yet`;
      case "posted":
        return `Waiting for ${ngo}’s answer`;
      case "answering":
        return `${ngo} is answering`;
      case "complete":
        return isDev
          ? `${ngo} answered · ${dev} can use it`
          : `Sent to ${dev} · waiting for ${dev} to use it`;
    }
  }
  const pointOpen = record.questions.some(
    (item) => item.topicId === topic.id && item.status === "used" && item.pointOpen,
  );
  if (pointOpen) {
    return isDev
      ? "One point to settle in the main chat"
      : `One point for ${dev} to settle in the main chat`;
  }
  const waitsOn = waitingDependency(record, topic);
  return waitsOn ? `Waits on ${waitsOn.title}` : null;
}

function statusText(record: PrdRecord, topic: TopicRecord, role: Role): string {
  if (record.closed !== null) return closedStatusText(record, topic);
  if (topic.gap !== null) return `Gap from the completion check: ${topic.gap}`;
  const dev = firstName(record, "dev");
  const isDev = role === "dev";
  const waits = waitingDependency(record, topic);
  const state = topicState(topic);
  if (waits && (state === "ready" || state === "needs-review")) {
    return `${state === "ready" ? "Every decision is recorded" : reviewLead(record, topic)}. It waits on ${waits.title} before ${isDev ? "you" : dev} can confirm it.`;
  }
  switch (state) {
    case "confirmed":
      return `Confirmed by ${dev}.`;
    case "ready":
      return `The AI checked this section: every decision is recorded. ${isDev ? "Read it and confirm." : `Ready for ${dev} to confirm.`}`;
    case "needs-review":
      return isDev
        ? `${reviewLead(record, topic)}. Read it again and confirm.`
        : `${reviewLead(record, topic)}. Ready for ${dev} to confirm again.`;
    default:
      return blockerFor(record, topic, role) ?? "The AI is still writing this section.";
  }
}

export function briefRows(
  record: PrdRecord,
  question: QuestionRecord,
  use: { answer: string; note: string; ngoMessages: number },
): { label: string; text: string }[] {
  const ngo = firstName(record, "ngo");
  const original = question.answer ?? use.answer;
  const rows = [
    { label: "Question", text: question.text },
    { label: `${ngo}’s answer`, text: original },
  ];
  if (use.answer !== original) rows.push({ label: "I changed it to", text: use.answer });
  rows.push({
    label: "How she got there",
    text: `Settled with the AI in ${plural(use.ngoMessages, "message", "messages")}, then marked complete.`,
  });
  rows.push({ label: "What it changes", text: question.impact });
  if (question.openPoint !== null) rows.push({ label: "To discuss", text: question.openPoint });
  if (use.note.length > 0) rows.push({ label: "My note", text: use.note });
  return rows;
}

function available<K extends ActionKind>(
  record: PrdRecord,
  kind: K,
  target: string,
): Availability<Action<K>> {
  return { kind: "available", action: { kind, token: issueToken(record, kind, target) } };
}

function unavailable(reason: string): { kind: "unavailable"; reason: string } {
  return { kind: "unavailable", reason };
}

function projectTopic(record: PrdRecord, topic: TopicRecord, role: Role): Topic {
  const dev = firstName(record, "dev");
  const state = topicState(topic);
  const open = record.closed === null;
  let confirm: Topic["confirm"];
  const block = confirmBlock(record, topic);
  if (role !== "dev") confirm = unavailable(`${dev} confirms sections.`);
  else if (!open) confirm = unavailable(CLOSED_REASON);
  else if (block) confirm = unavailable(block.reason);
  else confirm = available(record, "confirm-topic", topicTarget(topic.id));
  let reopen: Topic["reopen"];
  if (role !== "dev") reopen = unavailable(`${dev} reopens sections.`);
  else if (!open) reopen = unavailable(CLOSED_REASON);
  else if (state === "confirmed") reopen = available(record, "reopen-topic", topicTarget(topic.id));
  else reopen = unavailable("Only a confirmed section can be reopened.");
  return {
    id: topic.id,
    title: topic.title,
    required: topic.required,
    state,
    statusText: statusText(record, topic, role),
    blocker: blockerFor(record, topic, role),
    statements: [...((role === "ngo" && topic.ngoBody) || topic.body), ...topic.added],
    sources: [...topic.sources],
    stories: topic.stories === null ? null : [...topic.stories],
    confirm,
    reopen,
  };
}

function projectQuestion(record: PrdRecord, question: QuestionRecord, role: Role): NgoQuestion {
  const dev = firstName(record, "dev");
  const ngo = firstName(record, "ngo");
  const open = record.closed === null;
  const common = {
    id: question.id,
    topicId: question.topicId,
    text: question.text,
    why: question.why,
    blocking: question.blocking,
    introTurn: question.introTurn,
    options: [...question.options],
    impact: question.impact,
    openPoint: question.openPoint,
  };
  switch (question.status) {
    case "suggested":
      return {
        ...common,
        kind: "suggested",
        post:
          role !== "dev"
            ? unavailable(`Only ${dev} posts questions to ${ngo}.`)
            : !open
              ? unavailable(CLOSED_REASON)
              : available(record, "post-question", questionTarget(question.id)),
      };
    case "posted":
      return { ...common, kind: "posted" };
    case "answering": {
      let complete: Availability<Action<"complete-answer">>;
      if (role !== "ngo") complete = unavailable(`Only ${ngo} marks her answer complete.`);
      else if (!open) complete = unavailable(CLOSED_REASON);
      else if (record.busy[`side:${question.id}`])
        complete = unavailable("The AI is still answering.");
      else if (question.followUp === "pending") complete = unavailable(FOLLOW_UP_REASON);
      else if (question.evidence.length === 0) complete = unavailable("Write your answer first.");
      else if (!canAffordReply(record.funds)) complete = unavailable(FUNDS_REASON);
      else complete = available(record, "complete-answer", questionTarget(question.id));
      return { ...common, kind: "answering", followUp: question.followUp, complete };
    }
    case "complete":
      return {
        ...common,
        kind: "complete",
        answer: question.answer ?? "",
        canUse: role === "dev" && open && !question.using && canAffordReply(record.funds),
      };
    case "used":
      return {
        ...common,
        kind: "used",
        answer: question.answer ?? "",
        briefTurn: question.briefTurn ?? question.introTurn,
        changed: question.changed,
      };
  }
}

function visibleParts(record: PrdRecord, message: PrdUIMessage): PrdUIMessage["parts"] {
  return message.parts.filter((part) => {
    if (part.type === "data-close-ask") {
      return record.check?.id === part.data.checkId && tokenLive(record, part.data.closeAnyway);
    }
    if (part.type === "data-recommendation") {
      return checkPassedForRevision(record) && tokenLive(record, part.data.close);
    }
    return true;
  });
}

function chatKeys(record: PrdRecord): string[] {
  return [
    "main",
    ...record.topics.map((topic) => scopeKey({ kind: "topic", topicId: topic.id })),
    ...record.questions
      .filter((question) => question.status !== "suggested")
      .map((question) => scopeKey({ kind: "side", questionId: question.id })),
  ];
}

export function toSnapshot(record: PrdRecord, viewer: Viewer): PrdSnapshot {
  const role = viewer.role;
  const keys = chatKeys(record);
  const chats: Record<string, PrdUIMessage[]> = {};
  const canWrite: Record<string, boolean> = {};
  const send: Record<string, SendAvailability> = {};
  for (const key of keys) {
    chats[key] = (record.chats[key] ?? [])
      .filter((stored) => stored.forRole === null || stored.forRole === role)
      .map((stored) => ({ ...stored.message, parts: visibleParts(record, stored.message) }));
    canWrite[key] = canWriteChat(record, role, key);
    send[key] = sendAvailability(record, role, key);
  }
  return {
    sequence: record.sequence,
    revision: record.revision,
    viewer,
    people: record.people.map((person) => ({ ...person })),
    project: { ...record.project },
    discoveryRevision: record.discoveryRevision,
    topics: record.topics.map((topic) => projectTopic(record, topic, role)),
    devQuestions: record.devQuestions.map((question) => ({
      ...question,
      options: [...question.options],
    })),
    questions: record.questions.map((question) => projectQuestion(record, question, role)),
    chats,
    canWrite,
    send,
    funds: fundsState(record.funds),
    check:
      record.check === null
        ? null
        : { ...record.check, gaps: record.check.gaps.map((gap) => ({ ...gap })) },
    close:
      record.closed !== null
        ? { kind: "closed", revision: record.closed.revision, openPoints: record.closed.openPoints }
        : {
            kind: "open",
            remaining: closeRemaining(record, role),
            path: checkPassedForRevision(record) ? "close" : "check",
            close: closeAvailability(record, role),
          },
    drafts: { ...record.drafts[role] },
  };
}

function closeAvailability(record: PrdRecord, role: Role): Availability<Action<"close">> {
  if (role !== "dev") return unavailable(`Only ${firstName(record, "dev")} can close the PRD.`);
  if (anyBusy(record)) return unavailable(WAIT_REASON);
  if (!checkCurrent(record) && !canAffordReply(record.funds)) {
    return unavailable(FUNDS_REASON);
  }
  return available(record, "close", CLOSE_TARGET);
}

export function closeBlock(record: PrdRecord): PrdRefusal | null {
  return anyBusy(record) ? { kind: "busy", reason: WAIT_REASON } : null;
}
