import type {
  Action,
  ActionToken,
  Availability,
  CloseState,
  CompletionCheck,
  DevQuestion,
  FundsState,
  NgoQuestion,
  Person,
  PrdWireMessage,
  PrdWireSnapshot,
  QuestionId,
  RemainingItem,
  RemainingTarget,
  SendAvailability,
  Topic,
  TopicId,
  TopicScope,
  TopicState,
  TurnId,
  Viewer,
} from "./wire.ts";
import { storedTechnicalScope } from "./technical-scope.ts";

const NOT_YET = "Not available yet.";
const CLOSED_REASON = "The PRD is closed.";
const FOLLOW_UP_REASON = "Answer the AI’s question first.";
const STALE_REASON = "The PRD changed since this was offered. Use the current version.";
const WRITE_FIRST = "Write your answer first.";
const STILL_ANSWERING = "The AI is still answering.";
const BUSY_REASON = "The AI is still answering in this chat.";
const FUNDS_REASON = "Not enough left for another AI reply. The kitchen adds funds to continue.";
const TOPIC_STATES = ["open", "draft", "ready", "confirmed", "needs-review"] as const;
const QUESTION_STATES = ["suggested", "posted", "answering", "complete", "used"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(message);
}

function wholeNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(`the PRD facts ${label} is a whole number`);
  }
  return value;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string") fail(`the PRD facts ${label} is text`);
  return value;
}

function statusText(state: TopicState): string {
  switch (state) {
    case "confirmed":
      return "Confirmed.";
    case "ready":
      return "Ready to confirm.";
    case "needs-review":
      return "Needs review.";
    default:
      return "The AI is still writing this section.";
  }
}

function unavailable(): { kind: "unavailable"; reason: string } {
  return { kind: "unavailable", reason: NOT_YET };
}

function scopeOf(document: Record<string, unknown>): TopicScope | null {
  const value = document.technicalScope;
  if (value === null || value === undefined) return null;
  const stored = storedTechnicalScope(value);
  if (stored === null) fail("the technical scope is a scope");
  if (stored.kind === "not-written") return { kind: "not-written" };
  const scope = stored.scope;
  return {
    kind: "written",
    stories: scope.userStories.map((story) => ({
      story: story.story,
      acceptanceCriteria: story.acceptanceCriteria,
    })),
    suggestedStack: scope.suggestedStack,
    complexity: scope.complexity,
    riskFlags: scope.riskFlags,
  };
}

function storiesOf(scope: TopicScope | null): readonly string[] | null {
  if (scope === null) return null;
  return scope.kind === "written" ? scope.stories.map((story) => story.story) : [];
}

function statementsOf(document: Record<string, unknown>): {
  statements: string[];
  sources: string[];
} {
  const raw = document.statements;
  if (!Array.isArray(raw)) fail("a section document lists its statements");
  const statements: string[] = [];
  const sources: string[] = [];
  for (const statement of raw) {
    if (!isRecord(statement) || typeof statement.text !== "string") fail("a statement is text");
    statements.push(statement.text);
    const named = statement.sources;
    if (!Array.isArray(named)) continue;
    for (const source of named) {
      if (typeof source !== "string" || source.length === 0 || sources.includes(source)) continue;
      sources.push(source);
    }
  }
  return { statements, sources };
}

function topicReason(
  code: unknown,
  kind: "confirm-topic" | "reopen-topic",
  names: Names,
): string {
  if (code === "forbidden") {
    return kind === "confirm-topic"
      ? `Only ${names.dev} confirms sections.`
      : `Only ${names.dev} reopens sections.`;
  }
  if (code === "closed") return CLOSED_REASON;
  if (code === "gap") return "Fix the completion check gap first.";
  if (code === "not-ready") return "This section is not ready to confirm.";
  if (code === "not-confirmed") return "This section is not confirmed.";
  if (code === "busy") return "Wait for the AI to finish.";
  if (code === "funds") {
    return "Confirming this section runs the completion check, and there is not enough left for it. The kitchen adds funds to continue.";
  }
  return NOT_YET;
}

function topicAvailability<K extends "confirm-topic" | "reopen-topic">(
  value: unknown,
  label: string,
  kind: K,
  names: Names,
): Availability<Action<K>> {
  const action = fact(value, label);
  if (action.allowed) {
    return {
      kind: "available",
      action: { kind, token: text(action.token, `${label} token`) as ActionToken },
    };
  }
  return { kind: "unavailable", reason: topicReason(action.reason, kind, names) };
}

function topicOf(section: unknown, names: Names, role: Viewer["role"]): Topic {
  if (!isRecord(section)) fail("a section is a record");
  const state = section.state;
  if (typeof state !== "string" || !TOPIC_STATES.includes(state as TopicState)) {
    fail("a section names its state");
  }
  if (typeof section.required !== "boolean") fail("a section says whether it is required");
  const unreadable = section.variant === "unreadable" || section.variant === "missing";
  if (!unreadable && !isRecord(section.document)) fail("a section carries its document");
  const document = isRecord(section.document) ? section.document : {};
  const content = unreadable ? { statements: [], sources: [] } : statementsOf(document);
  const scope = unreadable ? null : scopeOf(document);
  const changed = section.changedSinceConfirmed;
  const gap = typeof section.gap === "string" && section.gap.trim() !== "" ? section.gap : null;
  const gapClosed = changed === "Gap closed";
  const topicState = state as TopicState;
  const problem = typeof section.problem === "string" ? section.problem : null;
  const status = gap
    ? `Gap from the completion check: ${gap}`
    : gapClosed && topicState === "needs-review"
      ? role === "dev"
        ? "Gap closed. Read it again and confirm."
        : `Gap closed. Ready for ${names.dev} to confirm again.`
      : statusText(topicState);
  const blocker = unreadable
    ? (problem ?? "the section could not be read")
    : gap !== null
      ? role === "dev"
        ? "Completion check gap · fix it in this section"
        : `Completion check gap · ${names.dev} fixes it in this section`
      : gapClosed && topicState === "needs-review"
        ? `Gap closed · ${names.dev} reviews and confirms again`
        : typeof section.blocker === "string"
          ? section.blocker
          : null;
  return {
    id: text(section.key, "section key") as Topic["id"],
    title: text(section.title, "section title"),
    required: section.required,
    state: topicState,
    statusText: status,
    blocker,
    statements: content.statements,
    sources: content.sources,
    stories: storiesOf(scope),
    scope,
    changeSummary: gap !== null || gapClosed ? null : typeof changed === "string" ? changed : null,
    author: typeof section.author === "string" ? section.author : null,
    confirm: topicAvailability(section.confirm, "confirm", "confirm-topic", names),
    reopen: topicAvailability(section.reopen, "reopen", "reopen-topic", names),
  };
}

function messageOf(value: unknown, keep?: (part: unknown) => boolean): PrdWireMessage {
  if (!isRecord(value) || typeof value.id !== "string" || value.id.length === 0) {
    fail("a message has an id");
  }
  if (value.role !== "system" && value.role !== "user" && value.role !== "assistant") {
    fail("a message has a role");
  }
  if (!Array.isArray(value.parts)) fail("a message has parts");
  const message: PrdWireMessage = {
    id: value.id,
    role: value.role,
    parts: (keep === undefined ? value.parts : value.parts.filter(keep)) as PrdWireMessage["parts"],
  };
  if (value.metadata !== undefined) {
    if (!isRecord(value.metadata)) fail("a message names its actor");
    const actor = value.metadata.actor;
    if (actor !== "ai" && actor !== "dev" && actor !== "ngo" && actor !== "system") {
      fail("a message names its actor");
    }
    message.metadata = {
      actor,
      name: text(value.metadata.name, "actor name"),
      at: text(value.metadata.at, "actor time"),
    };
  }
  return message;
}

function sendReason(code: unknown, names: Names): string {
  switch (code) {
    case "only-dev":
      return `Only ${names.dev} writes to the AI here.`;
    case "only-ngo":
      return `Only ${names.ngo} answers in her side chat.`;
    case "not-open":
      return "This question is not open for an answer.";
    case "closed":
      return CLOSED_REASON;
    case "busy":
      return BUSY_REASON;
    case "funds":
      return FUNDS_REASON;
    default:
      return NOT_YET;
  }
}

function chatAccess(
  chat: Record<string, unknown>,
  names: Names,
): { canWrite: boolean; send: SendAvailability } {
  if (
    typeof chat.canWrite !== "boolean" ||
    !isRecord(chat.send) ||
    typeof chat.send.allowed !== "boolean"
  ) {
    fail("a chat names who can send");
  }
  if (chat.send.allowed) return { canWrite: chat.canWrite, send: { kind: "available" } };
  const block = chat.send.block;
  if (block !== "role" && block !== "closed" && block !== "busy" && block !== "funds") {
    fail("a chat names why sending is off");
  }
  return {
    canWrite: chat.canWrite,
    send: { kind: "unavailable", block, reason: sendReason(chat.send.reason, names) },
  };
}

function chatsOf(
  value: unknown,
  names: Names,
  keep?: (part: unknown) => boolean,
): {
  chats: Record<string, readonly PrdWireMessage[]>;
  canWrite: Record<string, boolean>;
  send: Record<string, SendAvailability>;
} {
  if (!Array.isArray(value)) fail("the PRD facts list its chats");
  const chats: Record<string, PrdWireMessage[]> = {};
  const canWrite: Record<string, boolean> = {};
  const send: Record<string, SendAvailability> = {};
  for (const chat of value) {
    if (!isRecord(chat) || typeof chat.key !== "string" || chat.key.length === 0) {
      fail("a chat has a key");
    }
    if (!Array.isArray(chat.messages)) fail("a chat lists its messages");
    const access = chatAccess(chat, names);
    chats[chat.key] = chat.messages.map((message) => messageOf(message, keep));
    canWrite[chat.key] = access.canWrite;
    send[chat.key] = access.send;
  }
  return { chats, canWrite, send };
}

function peopleOf(value: unknown): Person[] {
  if (!Array.isArray(value)) fail("the PRD facts name its people");
  return value.map((person) => {
    if (!isRecord(person)) fail("a person is a record");
    const role = person.role;
    if (role !== "ai" && role !== "dev" && role !== "ngo") fail("a person has a role");
    return {
      role,
      name: text(person.name, "person name"),
      label: text(person.label, "person label"),
    };
  });
}

function draftsOf(value: unknown): Record<string, string> {
  if (!isRecord(value)) fail("the PRD facts list the viewer's drafts");
  const drafts: Record<string, string> = {};
  for (const [key, body] of Object.entries(value)) {
    if (typeof body !== "string") fail("a draft is text");
    drafts[key] = body;
  }
  return drafts;
}

function texts(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) fail(`the PRD facts list ${label}`);
  return value.map((item) => text(item, label));
}

type Names = { dev: string; ngo: string };

function namesOf(people: readonly Person[]): Names {
  const first = (role: "dev" | "ngo") => {
    const person = people.find((item) => item.role === role);
    return person ? (person.name.split(" ")[0] ?? person.name) : role;
  };
  return { dev: first("dev"), ngo: first("ngo") };
}

function devQuestionOf(value: unknown): DevQuestion {
  if (!isRecord(value)) fail("a developer question is a record");
  const answered = value.answered;
  if (answered !== null && typeof answered !== "string") fail("a developer answer is text");
  return {
    id: text(value.id, "question id"),
    topicId: text(value.section, "question section") as TopicId,
    text: text(value.text, "question text"),
    why: text(value.why, "question reason"),
    options: texts(value.options, "question options"),
    suggested: text(value.suggested, "suggested option"),
    answered,
  };
}

function reasonText(code: unknown, forbidden: string): string {
  switch (code) {
    case "forbidden":
      return forbidden;
    case "closed":
      return CLOSED_REASON;
    case "follow-up-open":
      return FOLLOW_UP_REASON;
    default:
      return NOT_YET;
  }
}

function completeReason(code: unknown, names: Names): string {
  switch (code) {
    case "forbidden":
      return `Only ${names.ngo} marks her answer complete.`;
    case "closed":
      return CLOSED_REASON;
    case "follow-up-open":
      return FOLLOW_UP_REASON;
    case "busy":
      return STILL_ANSWERING;
    case "invalid-request":
      return WRITE_FIRST;
    case "stale":
      return STALE_REASON;
    case "funds":
      return FUNDS_REASON;
    default:
      return NOT_YET;
  }
}

function fact(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value) || typeof value.allowed !== "boolean") fail(`a question names its ${label}`);
  return value;
}

function ngoQuestionOf(value: unknown, names: Names): NgoQuestion {
  if (!isRecord(value)) fail("a question for the NGO is a record");
  const status = value.status as (typeof QUESTION_STATES)[number];
  if (!QUESTION_STATES.includes(status)) fail("a question for the NGO names its status");
  if (typeof value.blocking !== "boolean") fail("a question for the NGO says whether it blocks");
  const intro = text(value.introMessage, "question message") as TurnId;
  const common = {
    id: text(value.id, "question id") as QuestionId,
    topicId: text(value.section, "question section") as TopicId,
    text: text(value.text, "question text"),
    why: text(value.why, "question reason"),
    blocking: value.blocking,
    introTurn: intro,
    options: texts(value.options, "question options"),
    impact: "",
    openPoint: null,
  };
  switch (status) {
    case "suggested": {
      const post = fact(value.post, "post");
      return {
        ...common,
        kind: "suggested",
        post: post.allowed
          ? {
              kind: "available",
              action: {
                kind: "post-question",
                token: text(post.token, "post token") as ActionToken,
              },
            }
          : {
              kind: "unavailable",
              reason: reasonText(post.reason, `Only ${names.dev} posts questions to ${names.ngo}.`),
            },
      };
    }
    case "posted":
      return { ...common, kind: "posted" };
    case "answering": {
      const complete = fact(value.complete, "complete");
      return {
        ...common,
        kind: "answering",
        followUp: value.followUpOpen === true ? "pending" : "none",
        complete: complete.allowed
          ? {
              kind: "available",
              action: {
                kind: "complete-answer",
                token: text(complete.token, "complete token") as ActionToken,
              },
            }
          : {
              kind: "unavailable",
              reason: completeReason(complete.reason, names),
            },
      };
    }
    case "complete":
      return {
        ...common,
        kind: "complete",
        answer: text(value.answer, "answer"),
        canUse: fact(value.use, "use").allowed === true,
      };
    case "used":
      return {
        ...common,
        kind: "used",
        answer: text(value.answer, "answer"),
        briefTurn: intro,
        changed: false,
      };
  }
}

function fundsOf(value: unknown): FundsState {
  if (!isRecord(value)) fail("the PRD facts carry the funds");
  const band = value.band;
  if (band !== "green" && band !== "yellow" && band !== "red") fail("the funds name their band");
  if (typeof value.replyFunded !== "boolean") fail("the funds say whether a reply is funded");
  return {
    allocationMicros: wholeNumber(value.allocationMicros, "allocation"),
    settledMicros: wholeNumber(value.settledMicros, "settled spend"),
    pendingMicros: wholeNumber(value.pendingMicros, "pending spend"),
    replyHoldMicros: wholeNumber(value.replyHoldMicros, "reply hold"),
    availableMicros: Math.max(0, wholeNumber(value.availableMicros, "available funds")),
    band,
    replyFunded: value.replyFunded,
  };
}

function restingClose(): CloseState {
  return { kind: "open", remaining: [], path: "check", close: unavailable() };
}

function wholeOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function closeRecordOf(value: unknown): Record<string, unknown> | null {
  if (value === undefined) return null;
  if (!isRecord(value) || (value.kind !== "open" && value.kind !== "closed")) fail("the close state is a record");
  return value;
}

function closeReason(code: unknown, names: Names): string {
  if (code === "forbidden") return `Only ${names.dev} can close the PRD.`;
  if (code === "busy") return "Wait for the AI to finish.";
  if (code === "funds") return FUNDS_REASON;
  if (code === "closed") return CLOSED_REASON;
  return NOT_YET;
}

function tokenMatches(action: unknown, checkId: string, revision: number, version: number): boolean {
  if (!isRecord(action) || typeof action.token !== "string") return false;
  const pieces = action.token.split("|");
  if (pieces.length !== 4) return false;
  return pieces[1] === `ask:${checkId}` && Number(pieces[2]) === revision && Number(pieces[3]) === version;
}

function keepClosePart(part: unknown, close: Record<string, unknown>): boolean {
  if (!isRecord(part)) return true;
  if (part.type !== "data-close-ask" && part.type !== "data-recommendation") return true;
  if (close.kind !== "open" || !isRecord(part.data)) return false;
  const revision = wholeOrNull(close.revision);
  if (revision === null || part.data.revision !== revision) return false;
  if (part.type === "data-recommendation") {
    const action = part.data.close;
    return close.path === "close" && isRecord(action) && action.token === close.token && typeof close.token === "string";
  }
  if (typeof close.checkId !== "string" || part.data.checkId !== close.checkId) return false;
  const version = wholeOrNull(close.askVersion);
  if (version === null) return false;
  return tokenMatches(part.data.closeAnyway, close.checkId, revision, version)
    && tokenMatches(part.data.keepWorking, close.checkId, revision, version);
}

type CloseSection = { key: string; required: boolean; state: string; gap: boolean; dependencies: string[] };

function closeSections(value: unknown): CloseSection[] {
  if (!Array.isArray(value)) fail("the PRD facts list its sections");
  return value.map((section) => {
    if (!isRecord(section) || typeof section.key !== "string" || section.key.length === 0) fail("a section is a record");
    const dependencies = Array.isArray(section.dependencies)
      ? section.dependencies.filter((item): item is string => typeof item === "string")
      : [];
    return {
      key: section.key,
      required: section.required === true,
      state: typeof section.state === "string" ? section.state : "",
      gap: typeof section.gap === "string" && section.gap.trim() !== "",
      dependencies,
    };
  });
}

function closeQuestions(value: unknown): Array<{ status: string; blocking: boolean; intro: string }> {
  if (!Array.isArray(value)) return [];
  return value.map((question) => {
    if (!isRecord(question) || typeof question.status !== "string") fail("a question for the NGO names its status");
    return {
      status: question.status,
      blocking: question.blocking === true,
      intro: typeof question.introMessage === "string" ? question.introMessage : "",
    };
  });
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function remainingLines(record: Record<string, unknown>, names: Names, role: Viewer["role"]): RemainingItem[] {
  const isDev = role === "dev";
  const sections = closeSections(record.sections);
  const questions = closeQuestions(record.questions);
  const required = sections.filter((section) => section.required);
  const gaps = sections.filter((section) => section.gap);
  const open = required.filter((section) => section.state !== "confirmed" && !section.gap);
  const reviewable = open.filter((section) => section.state === "ready" || section.state === "needs-review");
  const held = reviewable.filter((section) =>
    section.dependencies.some((key) => {
      const dep = sections.find((item) => item.key === key);
      return dep !== undefined && dep.state !== "ready" && dep.state !== "confirmed";
    }),
  );
  const ready = reviewable.filter((section) => !held.includes(section));
  const writing = open.filter((section) => !reviewable.includes(section));
  const blocking = questions.filter((question) => question.blocking);
  const unposted = blocking.filter((question) => question.status === "suggested");
  const waiting = blocking.filter((question) => question.status === "posted" || question.status === "answering");
  const toUse = questions.filter((question) => question.status === "complete");
  const items: RemainingItem[] = [];
  const questionsPanel: RemainingTarget = { kind: "questions" };
  const first = (list: readonly CloseSection[]): RemainingTarget | null =>
    list[0] ? { kind: "topic", topicId: list[0].key as TopicId } : null;
  if (ready.length > 0) {
    items.push({
      text: `${plural(ready.length, "section", "sections")} ready for ${isDev ? "you" : names.dev} to confirm`,
      target: first(ready),
    });
  }
  if (held.length > 0) {
    items.push({
      text: `${plural(held.length, "section", "sections")} waiting on another section`,
      target: first(held),
    });
  }
  if (writing.length > 0) {
    items.push({
      text: `${plural(writing.length, "section", "sections")} still being written`,
      target: first(writing),
    });
  }
  if (unposted.length > 0) {
    const suggested = unposted[0];
    items.push({
      text: isDev
        ? `${plural(unposted.length, "blocking question", "blocking questions")} not posted to ${names.ngo}`
        : `${plural(unposted.length, "blocking question", "blocking questions")} ${names.dev} has not sent you yet`,
      target: isDev && suggested !== undefined && suggested.intro !== ""
        ? { kind: "turn", turnId: suggested.intro as TurnId }
        : null,
    });
  }
  if (waiting.length > 0) {
    items.push({
      text: `${plural(waiting.length, "blocking question", "blocking questions")} waiting for ${isDev ? names.ngo : "your answer"}`,
      target: questionsPanel,
    });
  }
  if (toUse.length > 0) {
    const answers = plural(toUse.length, "answer", "answers");
    items.push({
      text: isDev ? `${answers} from ${names.ngo} to use` : `${answers} you sent, waiting for ${names.dev} to use`,
      target: questionsPanel,
    });
  }
  if (gaps.length > 0) {
    items.push({
      text: `${plural(gaps.length, "gap", "gaps")} from the completion check ${isDev ? "to fix" : `for ${names.dev} to fix`}`,
      target: first(gaps),
    });
  }
  const checkCurrent = isRecord(record.check) && record.check.revision === record.revision;
  if (!checkCurrent) {
    items.push({
      text: `Completion check runs when ${isDev ? "you close" : `${names.dev} closes`}, or when all sections are confirmed`,
      target: null,
    });
  }
  return items;
}

function closeStateOf(
  record: Record<string, unknown>,
  close: Record<string, unknown>,
  names: Names,
  role: Viewer["role"],
): CloseState {
  if (close.kind === "closed") {
    return {
      kind: "closed",
      revision: wholeNumber(close.revision, "closed revision"),
      openPoints: wholeNumber(close.openPoints, "open points"),
    };
  }
  if (close.path !== "close" && close.path !== "check") fail("the close state names its path");
  return {
    kind: "open",
    remaining: remainingLines(record, names, role),
    path: close.path,
    close: close.allowed === true
      ? { kind: "available", action: { kind: "close", token: text(close.token, "close token") as ActionToken } }
      : { kind: "unavailable", reason: closeReason(close.reason, names) },
  };
}

/** Reads the viewer the facts record already named. */
export function viewerFromRecord(record: unknown): Viewer {
  if (!isRecord(record) || !isRecord(record.viewer)) fail("the PRD facts name the viewer");
  const role = record.viewer.role;
  const name = record.viewer.name;
  if ((role !== "dev" && role !== "ngo") || typeof name !== "string" || name.trim() === "") {
    fail("the PRD facts name the viewer");
  }
  return { role, name };
}

function checkOf(value: unknown): CompletionCheck | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value) || !Array.isArray(value.gaps) || typeof value.passed !== "boolean") {
    fail("the completion check is a record");
  }
  const id = text(value.id, "check id");
  const thresholdText = text(value.thresholdText, "threshold");
  if (id.length === 0 || thresholdText.length === 0) fail("the completion check names its threshold");
  return {
    id,
    revision: wholeNumber(value.revision, "check revision"),
    passed: value.passed,
    coverageText: text(value.coverageText, "coverage"),
    thresholdText,
    gaps: value.gaps.map((gap) => {
      if (!isRecord(gap) || typeof gap.fixed !== "boolean") fail("a completion check gap is a record");
      const topicId = text(gap.topicId, "gap topic");
      const title = text(gap.title, "gap title");
      const body = text(gap.text, "gap text");
      if (topicId.length === 0 || title.length === 0 || body.length === 0) fail("a completion check gap names its section");
      return { topicId: topicId as TopicId, title, text: body, fixed: gap.fixed };
    }),
  };
}

/** Turns the facts record into the screen snapshot. It maps text and drops nothing it was given. */
export function snapshotFromRecord(record: unknown, viewer: Viewer): PrdWireSnapshot {
  if (!isRecord(record)) fail("the PRD facts are a record");
  if (!isRecord(record.project)) fail("the PRD facts name the project");
  if (!Array.isArray(record.sections)) fail("the PRD facts list its sections");
  if (!Array.isArray(record.devQuestions)) fail("the PRD facts list the developer questions");
  if (!Array.isArray(record.questions)) fail("the PRD facts list the questions for the NGO");
  const people = peopleOf(record.people);
  const names = namesOf(people);
  const closeFacts = closeRecordOf(record.close);
  const presented = chatsOf(
    record.chats,
    names,
    closeFacts === null ? undefined : (part) => keepClosePart(part, closeFacts),
  );
  return {
    sequence: wholeNumber(record.sequence, "sequence"),
    revision: wholeNumber(record.revision, "revision"),
    viewer,
    people,
    project: {
      title: text(record.project.title, "project title"),
      organizationName: text(record.project.organizationName, "organisation name"),
    },
    discoveryRevision: wholeNumber(record.discoveryRevision, "discovery revision"),
    topics: record.sections.map((section) => topicOf(section, names, viewer.role)),
    devQuestions: record.devQuestions.map(devQuestionOf),
    questions: record.questions.map((question) => ngoQuestionOf(question, names)),
    chats: presented.chats,
    canWrite: presented.canWrite,
    send: presented.send,
    funds: fundsOf(record.funds),
    check: checkOf(record.check),
    close: closeFacts === null ? restingClose() : closeStateOf(record, closeFacts, names, viewer.role),
    drafts: draftsOf(record.drafts),
  };
}
