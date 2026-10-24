import type {
  CloseState,
  FundsState,
  Person,
  PrdWireMessage,
  PrdWireSnapshot,
  SendAvailability,
  Topic,
  TopicState,
  Viewer,
} from "./wire.ts";

const NOT_YET = "Not available yet.";
const TOPIC_STATES = ["open", "draft", "ready", "confirmed", "needs-review"] as const;

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

function storiesOf(document: Record<string, unknown>): readonly string[] | null {
  const scope = document.technicalScope;
  if (scope === null || scope === undefined) return null;
  if (!isRecord(scope)) fail("the section document names its technical scope");
  const stories = scope.stories;
  if (stories === undefined) return [];
  if (!Array.isArray(stories)) fail("the technical scope lists its stories");
  return stories.map((story) => {
    if (typeof story === "string") return story;
    if (isRecord(story) && typeof story.text === "string") return story.text;
    return fail("a story is text");
  });
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
    stories: storiesOf(section.document),
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
  const presented = chatsOf(record.chats);
  return {
    sequence: wholeNumber(record.sequence, "sequence"),
    revision: wholeNumber(record.revision, "revision"),
    viewer,
    people: peopleOf(record.people),
    project: {
      title: text(record.project.title, "project title"),
      organizationName: text(record.project.organizationName, "organisation name"),
    },
    discoveryRevision: wholeNumber(record.discoveryRevision, "discovery revision"),
    topics: record.sections.map(topicOf),
    devQuestions: [],
    questions: [],
    chats: presented.chats,
    canWrite: presented.canWrite,
    send: presented.send,
    funds: restingFunds(),
    check: null,
    close: restingClose(),
    drafts: draftsOf(record.drafts),
  };
}
