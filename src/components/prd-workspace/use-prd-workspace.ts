import { Chat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  parsePrdSnapshot,
  parseRefusal,
  scopeKey,
  type Action,
  type ActionKind,
  type ChatScope,
  type PrdIntent,
  type PrdRefusal,
  type PrdSnapshot,
  type PrdUIMessage,
  type QuestionId,
  type RemainingTarget,
  type RequestId,
  type SendAvailability,
  type TopicId,
} from "@/lib/prd-stream";
import { COPY } from "./copy";
import { namesOf, present, sameMessages, sendOf, topicTitle, type PrdView } from "./model";
import {
  EMPTY_OUTBOX,
  finish,
  holds,
  offer,
  refuse,
  settle,
  start,
  take,
  type Outbox,
  type QueuedItem,
} from "./outbox";
import type { PrdPort, Selection } from "./port";

export type { Selection };
export type PhoneTab = "chat" | "prd" | "questions";
export type Center =
  | { readonly kind: "main" }
  | { readonly kind: "topic"; readonly topicId: TopicId };
export type Aside =
  | { readonly kind: "list" }
  | { readonly kind: "side"; readonly questionId: QuestionId }
  | { readonly kind: "review"; readonly questionId: QuestionId };
export type Notice = Readonly<{ key: string; reason: string }>;
export type FocusRequest = Readonly<{ elementId: string; focus: boolean; nonce: number }>;
export type SendState = Readonly<{ enabled: boolean; busy: boolean; send: SendAvailability }>;

export interface PrdController {
  view: PrdView;
  center: Center;
  aside: Aside;
  phoneTab: PhoneTab;
  answeredOpen: boolean;
  drafts: Readonly<Record<string, string>>;
  picks: Readonly<Record<string, string>>;
  queue: readonly QueuedItem[];
  canEditQueued: boolean;
  notice: Notice | null;
  focusRequest: FocusRequest | null;
  acting: boolean;
  chat(scope: ChatScope): Chat<PrdUIMessage>;
  sendState(scope: ChatScope): SendState;
  answerQueued(questionId: QuestionId): boolean;
  select(selection: Selection): void;
  openRemaining(target: RemainingTarget): void;
  closeTopic(): void;
  setPhoneTab(tab: PhoneTab): void;
  toggleAnswered(): void;
  setDraft(key: string, text: string): void;
  send(scope: ChatScope): void;
  pick(devQuestionId: string, option: string): void;
  editQueued(id: string): void;
  removeQueued(id: string): void;
  act(action: Action<ActionKind>): Promise<boolean>;
  completeAnswer(action: Action<"complete-answer">): Promise<void>;
  useAnswer(questionId: QuestionId): void;
  closePrd(): Promise<void>;
  openAnswered(questionId: QuestionId): void;
  openQuestion(questionId: QuestionId, fromList: boolean): void;
  dismissNotice(): void;
}

export const MAIN: ChatScope = { kind: "main" };
const MAIN_CENTER: Center = { kind: "main" };
const LIST: Aside = { kind: "list" };

export function turnElementId(messageId: string): string {
  return `prd-turn-${messageId}`;
}

export function introElementId(questionId: string): string {
  return `prd-intro-${questionId}`;
}

export function reviewKeys(questionId: string): { answer: string; note: string } {
  return { answer: `review:${questionId}`, note: `review:${questionId}:note` };
}

type Place = Readonly<{ center: Center; aside: Aside; tab: PhoneTab }>;

function placeOf(selection: Selection, current: Place): Place {
  switch (selection.kind) {
    case "main":
      return { ...current, center: MAIN_CENTER, tab: "chat" };
    case "topic":
      return { ...current, center: selection, tab: "prd" };
    case "questions":
      return { ...current, aside: LIST, tab: "questions" };
    case "side":
    case "review":
      return { ...current, aside: selection, tab: "questions" };
  }
}

function streaming(chat: Chat<PrdUIMessage>): boolean {
  return chat.status === "submitted" || chat.status === "streaming";
}

function mainBusy(snapshot: PrdSnapshot): boolean {
  const send = sendOf(snapshot, "main");
  return send.kind === "unavailable" && send.block === "busy";
}

function newRequestId(): RequestId {
  return crypto.randomUUID() as RequestId;
}

function refusalOf(error: unknown): PrdRefusal {
  const message = error instanceof Error ? error.message : String(error ?? "");
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(message);
  } catch {
    parsed = null;
  }
  return parseRefusal(parsed) ?? { kind: "invalid", reason: message || COPY.replyFailed };
}

function answerIntent(questionId: QuestionId): PrdIntent {
  return { kind: "use-answer", questionId, answer: null, note: "" };
}

export function usePrdWorkspace(
  port: PrdPort,
  initial: PrdSnapshot,
  startAt: Selection,
): PrdController {
  const [snapshot, setSnapshot] = useState(initial);
  const snapRef = useRef(initial);
  const [place, setPlace] = useState<Place>(() =>
    placeOf(startAt, { center: MAIN_CENTER, aside: LIST, tab: "chat" }),
  );
  const placeRef = useRef(place);
  placeRef.current = place;
  const [answeredOpen, setAnsweredOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => ({ ...initial.drafts }));
  const draftsRef = useRef(drafts);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const picksRef = useRef(picks);
  const [outbox, setOutbox] = useState<Outbox>(EMPTY_OUTBOX);
  const outboxRef = useRef(outbox);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [acting, setActing] = useState(false);
  const chats = useRef(new Map<string, Chat<PrdUIMessage>>());
  const timers = useRef(new Map<string, { timer: number; text: string }>());
  const disposed = useRef(false);

  function syncChats(force: string | null) {
    const latest = snapRef.current;
    for (const [key, chat] of chats.current) {
      if (key !== force && streaming(chat)) continue;
      const stored = latest.chats[key];
      if (stored && !sameMessages(chat.messages, stored))
        chat.messages = structuredClone([...stored]);
    }
  }

  function install(next: PrdSnapshot) {
    if (next.sequence >= snapRef.current.sequence) {
      snapRef.current = next;
      setSnapshot(next);
    }
    syncChats(null);
    settleMain();
  }

  function chatFor(scope: ChatScope): Chat<PrdUIMessage> {
    const key = scopeKey(scope);
    const existing = chats.current.get(key);
    if (existing) return existing;
    const created = new Chat<PrdUIMessage>({
      id: key,
      messages: structuredClone([...(snapRef.current.chats[key] ?? [])]),
      transport: port.chat(scope),
      onData: (part) => {
        if (part.type !== "data-snapshot") return;
        let next: PrdSnapshot;
        try {
          next = parsePrdSnapshot(part.data);
        } catch {
          setNotice({ key: "act", reason: COPY.updateUnreadable });
          return;
        }
        install(next);
      },
    });
    chats.current.set(key, created);
    return created;
  }

  function sendState(scope: ChatScope): SendState {
    const send = sendOf(snapRef.current, scopeKey(scope));
    const local = streaming(chatFor(scope));
    const backend = send.kind === "unavailable" && send.block === "busy";
    if (scope.kind === "main") {
      const running = outboxRef.current.running !== null;
      return {
        enabled: send.kind === "available" || backend,
        busy: local || backend || running,
        send,
      };
    }
    return { enabled: send.kind === "available" && !local, busy: local || backend, send };
  }

  const installRef = useRef(install);
  installRef.current = install;
  useEffect(() => port.subscribe((next) => installRef.current(next)), [port]);

  useEffect(() => {
    const pending = timers.current;
    const flush = () => {
      for (const [key, entry] of pending) {
        window.clearTimeout(entry.timer);
        void port.saveDraft(key, entry.text);
      }
      pending.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [port]);

  useEffect(() => {
    const live = chats.current;
    disposed.current = false;
    return () => {
      disposed.current = true;
      outboxRef.current = EMPTY_OUTBOX;
      for (const chat of live.values()) void chat.stop();
    };
  }, []);

  function commitOutbox(next: Outbox) {
    outboxRef.current = next;
    setOutbox(next);
  }

  function writeDraft(key: string, text: string) {
    draftsRef.current = { ...draftsRef.current, [key]: text };
    setDrafts(draftsRef.current);
    const previous = timers.current.get(key);
    if (previous) window.clearTimeout(previous.timer);
    const timer = window.setTimeout(() => {
      timers.current.delete(key);
      void port.saveDraft(key, text);
    }, 250);
    timers.current.set(key, { timer, text });
  }

  function focusOn(elementId: string, focus: boolean) {
    setFocusRequest({ elementId, focus, nonce: Date.now() });
  }

  function select(selection: Selection) {
    setPlace((current) => placeOf(selection, current));
  }

  function humanMeta(actor: "dev" | "ngo") {
    const names = namesOf(snapRef.current);
    return {
      actor,
      name: actor === "dev" ? names.devLabel : names.ngoLabel,
      at: new Date().toISOString(),
    } as const;
  }

  function optimistic(item: QueuedItem): Parameters<Chat<PrdUIMessage>["sendMessage"]>[0] {
    const snap = snapRef.current;
    const names = namesOf(snap);
    switch (item.intent.kind) {
      case "close-check":
        return {
          id: `${item.id}-event`,
          role: "system",
          metadata: { actor: "system", name: "", at: new Date().toISOString() },
          parts: [
            {
              type: "data-line",
              data: { text: COPY.closePressed(names.dev, snap.revision), topicId: null },
            },
          ],
        };
      case "use-answer": {
        const questionId = item.intent.questionId;
        const question = snap.questions.find((entry) => entry.id === questionId);
        const title = question ? topicTitle(snap, question.topicId) : "";
        return {
          role: "user",
          metadata: humanMeta("dev"),
          parts: [{ type: "text", text: COPY.usingAnswer(names.ngo, title) }],
        };
      }
      default:
        return {
          role: "user",
          metadata: humanMeta("dev"),
          parts: [{ type: "text", text: item.text }],
        };
    }
  }

  async function deliver(
    scope: ChatScope,
    requestId: RequestId,
    intent: PrdIntent,
    message: Parameters<Chat<PrdUIMessage>["sendMessage"]>[0],
  ): Promise<PrdRefusal | null> {
    const key = scopeKey(scope);
    const chat = chatFor(scope);
    let refusal: PrdRefusal | null = null;
    try {
      await chat.sendMessage(message, {
        body: { scope, requestId, baseRevision: snapRef.current.revision, intent },
      });
      if (chat.status === "error") {
        refusal = refusalOf(chat.error);
        chat.clearError();
      }
    } catch (error) {
      refusal = refusalOf(error);
      chat.clearError();
    }
    syncChats(key);
    return refusal;
  }

  function settleMain() {
    if (disposed.current) return;
    const box = outboxRef.current;
    const snap = snapRef.current;
    const idle = !streaming(chatFor(MAIN)) && sendOf(snap, "main").kind === "available";
    const head = settle(box, idle, snap.sequence);
    if (!head) return;
    commitOutbox(start(box, head.id));
    void runMain(head);
  }

  async function runMain(item: QueuedItem) {
    const refusal = await deliver(MAIN, item.id, item.intent, optimistic(item));
    if (disposed.current) return;
    if (!refusal) {
      const done = finish(outboxRef.current, item.id);
      commitOutbox(done.box);
      if (done.clearReview) {
        const keys = reviewKeys(done.clearReview);
        writeDraft(keys.answer, "");
        writeDraft(keys.note, "");
      }
      settleMain();
      return;
    }
    const composerEmpty = (draftsRef.current.main ?? "").trim() === "";
    const refused = refuse(
      outboxRef.current,
      item.id,
      refusal,
      snapRef.current.sequence,
      composerEmpty,
    );
    commitOutbox(refused.box);
    if (refused.composer !== null) writeDraft("main", refused.composer);
    if (refused.review !== null) select({ kind: "review", questionId: refused.review });
    setNotice({ key: "main", reason: refusal.reason });
    settleMain();
  }

  function enqueueMain(intent: PrdIntent, text: string): boolean {
    if (holds(outboxRef.current, intent)) {
      setNotice({ key: "main", reason: COPY.alreadyQueued });
      return false;
    }
    commitOutbox(offer(outboxRef.current, { id: newRequestId(), intent, text }));
    settleMain();
    return true;
  }

  async function sendConversation(scope: ChatScope) {
    const key = scopeKey(scope);
    if (!sendState(scope).enabled) return;
    const snap = snapRef.current;
    const text = (draftsRef.current[key] ?? "").trim();
    let intent: PrdIntent | null = null;
    let lines: string[] = [];
    let picked: string[] = [];
    if (scope.kind === "topic") {
      const asked = snap.devQuestions.filter(
        (question) => question.topicId === scope.topicId && question.answered === null,
      );
      const chosen = picksRef.current;
      if (asked.length > 0 && asked.every((question) => chosen[question.id])) {
        picked = asked.map((question) => question.id);
        const choices = Object.fromEntries(
          asked.map((question) => [question.id, chosen[question.id] ?? ""]),
        );
        intent = { kind: "answers", picks: choices, text };
        lines = asked.map(
          (question) => `${question.text.replace(/\?$/, "")}: ${choices[question.id]}`,
        );
        if (text) lines.push(text);
      }
    }
    if (!intent) {
      if (!text) return;
      intent = { kind: "text", text };
      lines = [text];
    }
    setNotice(null);
    writeDraft(key, "");
    const actor = snap.viewer.role;
    const refusal = await deliver(scope, newRequestId(), intent, {
      role: "user",
      metadata: humanMeta(actor),
      parts: lines.map((line) => ({ type: "text" as const, text: line })),
    });
    if (refusal) {
      if ((draftsRef.current[key] ?? "") === "") writeDraft(key, text);
      setNotice({ key, reason: refusal.reason });
      return;
    }
    if (picked.length > 0) {
      const next = { ...picksRef.current };
      for (const id of picked) delete next[id];
      picksRef.current = next;
      setPicks(next);
    }
  }

  async function act(action: Action<ActionKind>): Promise<boolean> {
    setActing(true);
    try {
      const mainWasBusy = mainBusy(snapRef.current);
      const result = await port.act(action);
      if (!result.ok) {
        setNotice({ key: "act", reason: result.refusal.reason });
        return false;
      }
      setNotice(null);
      install(result.value);
      if (action.kind === "confirm-topic" && !mainWasBusy && mainBusy(result.value)) {
        select({ kind: "main" });
      }
      return true;
    } finally {
      setActing(false);
    }
  }

  const view = useMemo(() => present(snapshot), [snapshot]);

  return {
    view,
    center: place.center,
    aside: place.aside,
    phoneTab: place.tab,
    answeredOpen,
    drafts,
    picks,
    queue: outbox.queue,
    canEditQueued: (drafts.main ?? "").trim() === "",
    notice,
    focusRequest,
    acting,
    chat: chatFor,
    sendState,
    answerQueued(questionId) {
      return holds(outbox, answerIntent(questionId));
    },
    select,
    openRemaining(target) {
      if (target.kind !== "turn") {
        select(target);
        return;
      }
      select({ kind: "main" });
      focusOn(turnElementId(target.turnId), true);
    },
    closeTopic() {
      setPlace((current) => ({ ...current, center: MAIN_CENTER }));
    },
    setPhoneTab(tab) {
      setPlace((current) => ({ ...current, tab }));
    },
    toggleAnswered() {
      setAnsweredOpen((open) => !open);
    },
    setDraft: writeDraft,
    send(scope) {
      if (scope.kind !== "main") {
        void sendConversation(scope);
        return;
      }
      const text = (draftsRef.current.main ?? "").trim();
      if (!text || !sendState(MAIN).enabled) return;
      setNotice(null);
      writeDraft("main", "");
      enqueueMain({ kind: "text", text }, text);
    },
    pick(devQuestionId, option) {
      picksRef.current = { ...picksRef.current, [devQuestionId]: option };
      setPicks(picksRef.current);
    },
    editQueued(id) {
      if ((draftsRef.current.main ?? "").trim() !== "") return;
      const { box, item } = take(outboxRef.current, id);
      if (!item || item.intent.kind !== "text") return;
      commitOutbox(box);
      writeDraft("main", item.text);
    },
    removeQueued(id) {
      commitOutbox(take(outboxRef.current, id).box);
    },
    act,
    async completeAnswer(action) {
      const pressedAt = placeRef.current;
      if (!(await act(action))) return;
      setPlace((current) =>
        current === pressedAt ? placeOf({ kind: "questions" }, current) : current,
      );
    },
    useAnswer(questionId) {
      const question = snapRef.current.questions.find((entry) => entry.id === questionId);
      if (!question || question.kind !== "complete" || !question.canUse) return;
      const keys = reviewKeys(questionId);
      const edited = draftsRef.current[keys.answer]?.trim();
      const answer = edited && edited !== question.answer ? edited : null;
      const note = (draftsRef.current[keys.note] ?? "").trim();
      const queued = enqueueMain(
        { kind: "use-answer", questionId, answer, note },
        `${COPY.useAnswer} · ${question.text}`,
      );
      if (!queued) return;
      setPlace((current) => placeOf({ kind: "main" }, { ...current, aside: LIST }));
    },
    async closePrd() {
      const close = snapRef.current.close;
      if (close.kind !== "open" || close.close.kind !== "available") return;
      select({ kind: "main" });
      if (close.path === "check") {
        enqueueMain({ kind: "close-check" }, COPY.closePrd);
        return;
      }
      await act(close.close.action);
    },
    openAnswered(questionId) {
      const question = snapRef.current.questions.find((entry) => entry.id === questionId);
      if (!question || question.kind !== "used") return;
      select({ kind: "main" });
      focusOn(turnElementId(question.briefTurn), true);
    },
    dismissNotice() {
      setNotice(null);
    },
    openQuestion(questionId, fromList) {
      select({ kind: "side", questionId });
      if (fromList) {
        setPlace((current) => ({ ...current, center: MAIN_CENTER }));
        focusOn(introElementId(questionId), false);
      }
    },
  };
}
