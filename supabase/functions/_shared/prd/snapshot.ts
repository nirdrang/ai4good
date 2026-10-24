import type {
  ActionToken,
  CloseState,
  DevQuestion,
  FundsState,
  NgoQuestion,
  Person,
  PrdWireMessage,
  PrdWireSnapshot,
  QuestionId,
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

function topicOf(section: unknown): Topic {
  if (!isRecord(section)) fail("a section is a record");
  const state = section.state;
  if (typeof state !== "string" || !TOPIC_STATES.includes(state as TopicState)) {
    fail("a section names its state");
  }
  if (typeof section.required !== "boolean") fail("a section says whether it is required");
  if (!isRecord(section.document)) fail("a section carries its document");
  const content = statementsOf(section.document);
  const scope = scopeOf(section.document);
  const changed = section.changedSinceConfirmed;
  return {
    id: text(section.key, "section key") as Topic["id"],
    title: text(section.title, "section title"),
    required: section.required,
    state: state as TopicState,
    statusText: statusText(state as TopicState),
    blocker: typeof section.blocker === "string" ? section.blocker : null,
    statements: content.statements,
    sources: content.sources,
    stories: storiesOf(scope),
    scope,
    changeSummary: typeof changed === "string" ? changed : null,
    confirm: unavailable(),
    reopen: unavailable(),
  };
}

function messageOf(value: unknown): PrdWireMessage {
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
    parts: value.parts as PrdWireMessage["parts"],
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

function chatsOf(value: unknown): {
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
    chats[chat.key] = chat.messages.map(messageOf);
    canWrite[chat.key] = false;
    send[chat.key] = { kind: "unavailable", block: "role", reason: NOT_YET };
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
        complete: {
          kind: "unavailable",
          reason: reasonText(complete.reason, `Only ${names.ngo} marks her answer complete.`),
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

function restingFunds(): FundsState {
  return {
    allocationMicros: 0,
    settledMicros: 0,
    pendingMicros: 0,
    replyHoldMicros: 0,
    availableMicros: 0,
    band: "green",
    replyFunded: false,
  };
}

function restingClose(): CloseState {
  return { kind: "open", remaining: [], path: "check", close: unavailable() };
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

/** Turns the facts record into the screen snapshot. It maps text and drops nothing it was given. */
export function snapshotFromRecord(record: unknown, viewer: Viewer): PrdWireSnapshot {
  if (!isRecord(record)) fail("the PRD facts are a record");
  if (!isRecord(record.project)) fail("the PRD facts name the project");
  if (!Array.isArray(record.sections)) fail("the PRD facts list its sections");
  if (!Array.isArray(record.devQuestions)) fail("the PRD facts list the developer questions");
  if (!Array.isArray(record.questions)) fail("the PRD facts list the questions for the NGO");
  const presented = chatsOf(record.chats);
  const people = peopleOf(record.people);
  const names = namesOf(people);
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
    topics: record.sections.map(topicOf),
    devQuestions: record.devQuestions.map(devQuestionOf),
    questions: record.questions.map((question) => ngoQuestionOf(question, names)),
    chats: presented.chats,
    canWrite: presented.canWrite,
    send: presented.send,
    funds: restingFunds(),
    check: null,
    close: restingClose(),
    drafts: draftsOf(record.drafts),
  };
}
