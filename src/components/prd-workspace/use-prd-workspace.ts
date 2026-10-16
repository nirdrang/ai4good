import { Chat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  parsePrdSnapshot,
  scopeKey,
  type Action,
  type ActionKind,
  type ChatScope,
  type PrdIntent,
  type PrdRefusal,
  type PrdSnapshot,
  type PrdUIMessage,
  type QuestionId,
  type RequestId,
  type TopicId,
} from "@/lib/prd-stream";
import { COPY } from "./copy";
import { canAfford, namesOf, present, sameMessages, topicTitle, type PrdView } from "./model";
import {
  EMPTY_OUTBOX,
  fail,
  finish,
  offer,
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

export interface PrdController {
  view: PrdView;
  center: Center;
  aside: Aside;
  phoneTab: PhoneTab;
  answeredOpen: boolean;
  drafts: Readonly<Record<string, string>>;
  picks: Readonly<Record<string, string>>;
  queue: readonly QueuedItem[];
  mainBusy: boolean;
  notice: Notice | null;
  focusRequest: FocusRequest | null;
  acting: boolean;
  chat(scope: ChatScope): Chat<PrdUIMessage>;
  select(selection: Selection): void;
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
}

export const MAIN: ChatScope = { kind: "main" };

export function turnElementId(messageId: string): string {
  return `prd-turn-${messageId}`;
}

export function introElementId(questionId: string): string {
  return `prd-intro-${questionId}`;
}

export function reviewKeys(questionId: string): { answer: string; note: string } {
  return { answer: `review:${questionId}`, note: `review:${questionId}:note` };
}

function busy(chat: Chat<PrdUIMessage>): boolean {
  return chat.status === "submitted" || chat.status === "streaming";
}

function newRequestId(): RequestId {
  return crypto.randomUUID() as RequestId;
}

function parseRefusal(error: unknown): PrdRefusal {
  const message = error instanceof Error ? error.message : String(error ?? "");
  try {
    const parsed: unknown = JSON.parse(message);
    if (parsed !== null && typeof parsed === "object") {
      const { kind, reason } = parsed as { kind?: unknown; reason?: unknown };
      if (typeof kind === "string" && typeof reason === "string") {
        return { kind: kind as PrdRefusal["kind"], reason };
      }
    }
  } catch {
    return { kind: "invalid", reason: message || "The reply did not finish." };
  }
  return { kind: "invalid", reason: message || "The reply did not finish." };
}

function initialPlace(start: Selection): { center: Center; aside: Aside; tab: PhoneTab } {
  switch (start.kind) {
    case "main":
      return { center: start, aside: { kind: "list" }, tab: "chat" };
    case "topic":
      return { center: start, aside: { kind: "list" }, tab: "prd" };
    case "questions":
      return { center: MAIN as Center, aside: { kind: "list" }, tab: "questions" };
    case "side":
    case "review":
      return { center: MAIN as Center, aside: start, tab: "questions" };
  }
}

export function usePrdWorkspace(
  port: PrdPort,
  initial: PrdSnapshot,
  startAt: Selection,
): PrdController {
  const [snapshot, setSnapshot] = useState(initial);
  const snapRef = useRef(initial);
  const [place] = useState(() => initialPlace(startAt));
  const [center, setCenter] = useState<Center>(place.center);
  const [aside, setAside] = useState<Aside>(place.aside);
  const [phoneTab, setPhoneTab] = useState<PhoneTab>(place.tab);
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

  function syncChats(force: string | null) {
    const latest = snapRef.current;
    for (const [key, chat] of chats.current) {
      if (key !== force && busy(chat)) continue;
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
        try {
          install(parsePrdSnapshot(part.data));
        } catch {
          return;
        }
      },
    });
    chats.current.set(key, created);
    return created;
  }

  const installRef = useRef(install);
  installRef.current = install;
  useEffect(() => port.subscribe((next) => installRef.current(next)), [port]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const [key, entry] of pending) {
        window.clearTimeout(entry.timer);
        void port.saveDraft(key, entry.text);
      }
      pending.clear();
    };
  }, [port]);

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
    switch (selection.kind) {
      case "main":
        setCenter(MAIN as Center);
        setPhoneTab("chat");
        return;
      case "topic":
        setCenter(selection);
        setPhoneTab("prd");
        return;
      case "questions":
        setAside({ kind: "list" });
        setPhoneTab("questions");
        return;
      case "side":
      case "review":
        setAside(selection);
        setPhoneTab("questions");
        return;
    }
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
        refusal = parseRefusal(chat.error);
        chat.clearError();
      }
    } catch (error) {
      refusal = parseRefusal(error);
      chat.clearError();
    }
    syncChats(key);
    return refusal;
  }

  function pump() {
    const box = outboxRef.current;
    const snap = snapRef.current;
    const ready =
      !busy(chatFor(MAIN)) &&
      snap.close.kind === "open" &&
      snap.canWrite.main === true &&
      canAfford(snap.funds);
    const head = settle(box, ready);
    if (!head) return;
    commitOutbox(start(box, head.id));
    void runMain(head);
  }

  async function runMain(item: QueuedItem) {
    const refusal = await deliver(MAIN, item.id, item.intent, optimistic(item));
    commitOutbox(
      refusal ? fail(outboxRef.current, item.id, refusal) : finish(outboxRef.current, item.id),
    );
    if (refusal) setNotice({ key: "main", reason: refusal.reason });
    pump();
  }

  function enqueueMain(intent: PrdIntent, text: string) {
    commitOutbox(offer(outboxRef.current, { id: newRequestId(), intent, text }));
    pump();
  }

  async function sendConversation(scope: ChatScope) {
    const key = scopeKey(scope);
    const chat = chatFor(scope);
    const snap = snapRef.current;
    if (busy(chat) || snap.canWrite[key] !== true || !canAfford(snap.funds)) return;
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
      const result = await port.act(action);
      if (!result.ok) {
        setNotice({ key: "act", reason: result.refusal.reason });
        return false;
      }
      setNotice(null);
      install(result.value);
      return true;
    } finally {
      setActing(false);
    }
  }

  const view = useMemo(() => present(snapshot), [snapshot]);

  return {
    view,
    center,
    aside,
    phoneTab,
    answeredOpen,
    drafts,
    picks,
    queue: outbox.queue,
    mainBusy: outbox.busy !== null,
    notice,
    focusRequest,
    acting,
    chat: chatFor,
    select,
    closeTopic() {
      setCenter(MAIN as Center);
    },
    setPhoneTab,
    toggleAnswered() {
      setAnsweredOpen((open) => !open);
    },
    setDraft: writeDraft,
    send(scope) {
      if (scope.kind !== "main") {
        void sendConversation(scope);
        return;
      }
      const snap = snapRef.current;
      const text = (draftsRef.current.main ?? "").trim();
      if (!text || snap.canWrite.main !== true || !canAfford(snap.funds)) return;
      setNotice(null);
      writeDraft("main", "");
      enqueueMain({ kind: "text", text }, text);
    },
    pick(devQuestionId, option) {
      picksRef.current = { ...picksRef.current, [devQuestionId]: option };
      setPicks(picksRef.current);
    },
    editQueued(id) {
      const { box, item } = take(outboxRef.current, id);
      if (!item || item.intent.kind !== "text") return;
      commitOutbox(box);
      const current = draftsRef.current.main ?? "";
      writeDraft("main", current ? `${current} ${item.text}` : item.text);
    },
    removeQueued(id) {
      commitOutbox(take(outboxRef.current, id).box);
    },
    act,
    async completeAnswer(action) {
      if (await act(action)) select({ kind: "questions" });
    },
    useAnswer(questionId) {
      const question = snapRef.current.questions.find((entry) => entry.id === questionId);
      if (!question || question.kind !== "complete") return;
      const keys = reviewKeys(questionId);
      const edited = draftsRef.current[keys.answer]?.trim();
      const answer = edited && edited !== question.answer ? edited : null;
      const note = (draftsRef.current[keys.note] ?? "").trim();
      writeDraft(keys.answer, "");
      writeDraft(keys.note, "");
      setAside({ kind: "list" });
      select(MAIN);
      enqueueMain(
        { kind: "use-answer", questionId, answer, note },
        `${COPY.useAnswer} · ${question.text}`,
      );
    },
    async closePrd() {
      const action = present(snapRef.current).close.action;
      if (!action) return;
      select(MAIN);
      setActing(true);
      try {
        const result = await port.act(action);
        if (result.ok) {
          install(result.value);
          return;
        }
        if (result.refusal.kind !== "invalid") {
          setNotice({ key: "act", reason: result.refusal.reason });
          return;
        }
      } finally {
        setActing(false);
      }
      enqueueMain({ kind: "close-check" }, COPY.closePrd);
    },
    openAnswered(questionId) {
      const question = snapRef.current.questions.find((entry) => entry.id === questionId);
      if (!question || question.kind !== "used") return;
      select(MAIN);
      focusOn(turnElementId(question.briefTurn), true);
    },
    openQuestion(questionId, fromList) {
      select({ kind: "side", questionId });
      if (fromList) {
        setCenter(MAIN as Center);
        focusOn(introElementId(questionId), false);
      }
    },
  };
}
