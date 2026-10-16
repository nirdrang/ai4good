import type {
  Action,
  Availability,
  FundsState,
  NgoQuestion,
  PrdSnapshot,
  PrdUIMessage,
  SendAvailability,
  Topic,
  TopicId,
} from "@/lib/prd-stream";
import { COPY, STATE_LABEL, money } from "./copy";

export type Names = Readonly<{
  dev: string;
  ngo: string;
  devLabel: string;
  ngoLabel: string;
  ai: string;
}>;

export type Tone = "muted" | "dev" | "ngo" | "stop" | "ok";

export type FundsView = Readonly<{
  available: string;
  allocation: string;
  pending: string | null;
  band: "ok" | "warn" | "stop";
  low: boolean;
  spentPercent: number;
  pendingPercent: number;
}>;

export type TopicView = Readonly<{
  topic: Topic;
  label: string;
  blockerTone: Tone;
}>;

export type QuestionView = Readonly<{
  question: NgoQuestion;
  topicTitle: string;
  blockLabel: string;
  statusText: string;
  statusTone: Tone;
  sent: string | null;
  sentLabel: string;
  wordingChanged: string | null;
  canView: boolean;
  canUse: boolean;
}>;

export type CloseView = Readonly<{
  title: string;
  ready: boolean;
  remaining: readonly string[];
  action: Action<"close"> | null;
  reason: string | null;
}>;

export type PrdView = Readonly<{
  snapshot: PrdSnapshot;
  names: Names;
  isDev: boolean;
  closed: Readonly<{ revision: number; openPoints: number }> | null;
  progress: Readonly<{ confirmed: number; total: number }>;
  funds: FundsView;
  close: CloseView;
  topics: readonly TopicView[];
  open: readonly QuestionView[];
  answered: readonly QuestionView[];
  listTitle: string;
  listNote: string;
  badge: number;
  liveCheckMessage: string | null;
}>;

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export function namesOf(snapshot: PrdSnapshot): Names {
  const person = (role: "dev" | "ngo" | "ai") =>
    snapshot.people.find((item) => item.role === role)?.name ?? role;
  const dev = firstName(person("dev"));
  const ngo = firstName(person("ngo"));
  return { dev, ngo, devLabel: `${dev} (Dev)`, ngoLabel: `${ngo} (NGO)`, ai: person("ai") };
}

const BAND = { green: "ok", yellow: "warn", red: "stop" } as const;

export function fundsView(funds: FundsState): FundsView {
  const share = (micros: number) =>
    funds.allocationMicros > 0 ? Math.min(100, (micros / funds.allocationMicros) * 100) : 0;
  return {
    available: money(funds.availableMicros),
    allocation: money(funds.allocationMicros),
    pending: funds.pendingMicros > 0 ? money(funds.pendingMicros) : null,
    band: BAND[funds.band],
    low: !funds.replyFunded,
    spentPercent: share(funds.settledMicros),
    pendingPercent: share(funds.pendingMicros),
  };
}

const NO_CHAT: SendAvailability = { kind: "unavailable", block: "role", reason: "" };

export function sendOf(snapshot: PrdSnapshot, key: string): SendAvailability {
  return snapshot.send[key] ?? NO_CHAT;
}

export function actionOf<T>(availability: Availability<T>): T | null {
  return availability.kind === "available" ? availability.action : null;
}

export function reasonOf<T>(availability: Availability<T>): string | null {
  return availability.kind === "unavailable" ? availability.reason : null;
}

export function topicTitle(snapshot: PrdSnapshot, id: TopicId): string {
  return snapshot.topics.find((topic) => topic.id === id)?.title ?? id;
}

function blockerTone(topic: Topic): Tone {
  if (topic.state === "needs-review") return "stop";
  if (topic.state === "ready") return "dev";
  return "muted";
}

function questionStatus(
  question: NgoQuestion,
  isDev: boolean,
  names: Names,
  closed: boolean,
): { text: string; tone: Tone } {
  if (closed) {
    switch (question.kind) {
      case "posted":
      case "answering":
        return { text: COPY.status.closedUnanswered(question.blocking), tone: "muted" };
      case "complete":
        return {
          text: isDev
            ? COPY.status.closedUnusedDev(names.ngo)
            : COPY.status.closedUnusedNgo(names.dev),
          tone: "muted",
        };
    }
  }
  switch (question.kind) {
    case "suggested":
      return { text: COPY.status.suggested, tone: "muted" };
    case "posted":
      return {
        text: isDev ? COPY.status.waitingFor(names.ngo) : COPY.status.openAnswer,
        tone: "muted",
      };
    case "answering":
      return { text: COPY.status.answering(names.ngo), tone: "ngo" };
    case "complete":
      return {
        text: isDev ? COPY.status.completeDev(names.ngo) : COPY.status.completeNgo(names.dev),
        tone: "dev",
      };
    case "used":
      return { text: COPY.status.used(names.dev), tone: "ok" };
  }
}

export function questionStatusText(
  question: NgoQuestion,
  isDev: boolean,
  names: Names,
  closed: boolean,
): string {
  return questionStatus(question, isDev, names, closed).text;
}

function questionView(snapshot: PrdSnapshot, question: NgoQuestion, names: Names): QuestionView {
  const isDev = snapshot.viewer.role === "dev";
  const closed = snapshot.close.kind === "closed";
  const title = topicTitle(snapshot, question.topicId);
  const status = questionStatus(question, isDev, names, closed);
  return {
    question,
    topicTitle: title,
    blockLabel: question.blocking ? COPY.blocks(title) : COPY.notBlocking,
    statusText: status.text,
    statusTone: status.tone,
    sent: !isDev && question.kind === "complete" ? question.answer : null,
    sentLabel: closed ? COPY.sentClosed(names.dev) : COPY.sentTo(names.dev),
    wordingChanged:
      !isDev && question.kind === "used" && question.changed
        ? COPY.wordingChanged(names.dev)
        : null,
    canView: isDev && question.kind === "complete" && snapshot.close.kind === "open",
    canUse: question.kind === "complete" && question.canUse,
  };
}

function waiting(question: NgoQuestion): boolean {
  return question.kind === "posted" || question.kind === "answering";
}

/** Everything the screen shows, derived from one snapshot. It decides no rule of its own. */
export function present(snapshot: PrdSnapshot): PrdView {
  const names = namesOf(snapshot);
  const isDev = snapshot.viewer.role === "dev";
  const required = snapshot.topics.filter((topic) => topic.required);
  const progress = {
    confirmed: required.filter((topic) => topic.state === "confirmed").length,
    total: required.length,
  };
  const closeState = snapshot.close;
  const close: CloseView =
    closeState.kind === "closed"
      ? {
          title: COPY.closedAt(closeState.revision),
          ready: false,
          remaining: [],
          action: null,
          reason: null,
        }
      : {
          title: closeState.path === "close" ? COPY.readyToClose : COPY.stillOpen,
          ready: closeState.path === "close",
          remaining: closeState.remaining,
          action: actionOf(closeState.close),
          reason: reasonOf(closeState.close),
        };
  const views = snapshot.questions
    .filter((question) => question.kind !== "suggested")
    .map((question) => questionView(snapshot, question, names));
  const open = views.filter((view) => view.question.kind !== "used");
  const answered = views.filter((view) => view.question.kind === "used");
  const closed = closeState.kind === "closed";
  const toAnswer = closed ? 0 : open.filter((view) => waiting(view.question)).length;
  const blockingOpen = open.filter((view) => view.question.blocking).length;
  const listTitle = isDev
    ? closed
      ? COPY.devListTitleClosed(names.ngoLabel)
      : COPY.devListTitle(names.ngoLabel, open.length)
    : closed
      ? COPY.ngoListTitleClosed
      : COPY.ngoListTitle(toAnswer);
  const listNote = closed
    ? COPY.closedListNote
    : isDev
      ? COPY.devListNote(blockingOpen, names.ngo)
      : COPY.ngoListNote;
  return {
    snapshot,
    names,
    isDev,
    closed:
      closeState.kind === "closed"
        ? { revision: closeState.revision, openPoints: closeState.openPoints }
        : null,
    progress,
    funds: fundsView(snapshot.funds),
    close,
    topics: snapshot.topics.map((topic) => ({
      topic,
      label: STATE_LABEL[topic.state],
      blockerTone: blockerTone(topic),
    })),
    open,
    answered,
    listTitle,
    listNote,
    badge: isDev ? open.filter((view) => view.canView).length : toAnswer,
    liveCheckMessage: liveCheckMessage(snapshot),
  };
}

function liveCheckMessage(snapshot: PrdSnapshot): string | null {
  const checkId = snapshot.check?.id;
  if (checkId === undefined) return null;
  const holding = (snapshot.chats.main ?? []).filter((message) =>
    message.parts.some((part) => part.type === "data-check" && part.data.checkId === checkId),
  );
  return holding.at(-1)?.id ?? null;
}

export function sameMessages(
  left: readonly PrdUIMessage[],
  right: readonly PrdUIMessage[],
): boolean {
  if (left.length !== right.length) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}
