import { Chat, useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { BriefSnapshot, DiscoveryAnswer, DiscoveryState, DiscoveryUIMessage } from "@/lib/discovery-stream";
import { NAME } from "./a11y";
import { currentQuestions, newerBrief, type Draft } from "./model";
import type { DiscoveryPort } from "./port";

export type DiscoveryPanel = "brief" | "questions";

export type DiscoveryController = {
  project: DiscoveryState["project"];
  brief: DiscoveryState["brief"];
  files: DiscoveryState["files"];
  usage: DiscoveryState["usage"];
  confirmation: DiscoveryState["confirmation"];
  messages: DiscoveryUIMessage[];
  drafts: Readonly<Record<string, Draft>>;
  composerText: string;
  canSend: boolean;
  paidSend: boolean;
  refusal: { kind: string; reason: string } | null;
  reopened: readonly string[];
  panel: DiscoveryPanel | null;
  highlight: { messageId: string; text: string } | null;
  focus: { id: string; nonce: number } | null;
  oneAtATime: boolean;
  questionIndex: number;
  assistantCount: number;
  pick(questionId: string, draft: Draft | null): void;
  setComposerText(text: string): void;
  send(): Promise<void>;
  openPanel(panel: DiscoveryPanel): void;
  closePanel(): void;
  reopen(questionId: string): void;
  focusQuestion(questionId: string): void;
  viewAnswer(questionId: string): void;
  showOne(): void;
  showTogether(): void;
  nextQuestion(): void;
};

function parseRefusal(error: unknown): { kind: string; reason: string } {
  const message = error instanceof Error ? error.message : String(error ?? "");
  try {
    const parsed: unknown = JSON.parse(message);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      typeof (parsed as { kind?: unknown }).kind === "string" &&
      typeof (parsed as { reason?: unknown }).reason === "string"
    ) {
      const refusal = parsed as { kind: string; reason: string };
      return { kind: refusal.kind, reason: refusal.reason };
    }
  } catch {
    /* The transport threw plain text, not the refusal JSON. */
  }
  return { kind: "send-failed", reason: message || "The reply did not finish." };
}

function draftReady(questionId: string, options: { id: string }[], draft: Draft | undefined): boolean {
  if (!draft) return false;
  if (draft.kind === "option") return options.some((option) => option.id === draft.optionId);
  if (draft.kind === "uncertain") return true;
  return draft.text.trim().length > 0 && questionId.length > 0;
}

function answersFromDrafts(
  drafts: Readonly<Record<string, Draft>>,
  questions: ReturnType<typeof currentQuestions>,
): DiscoveryAnswer[] {
  return questions.flatMap((question): DiscoveryAnswer[] => {
    const draft = drafts[question.id];
    if (!draftReady(question.id, question.options, draft) || !draft) return [];
    if (draft.kind === "option") {
      const option = question.options.find((item) => item.id === draft.optionId);
      if (!option) return [];
      return [{ questionId: question.id, choice: option.id, text: option.label, certain: true }];
    }
    if (draft.kind === "own") {
      return [{ questionId: question.id, choice: "custom", text: draft.text.trim(), certain: true }];
    }
    return [{ questionId: question.id, choice: "uncertain", text: NAME.notSure, certain: false }];
  });
}

function answerTarget(brief: BriefSnapshot, questionId: string): { messageId: string; text: string } | null {
  const question = brief.questions.find((item) => item.id === questionId);
  const topic = brief.topics.find((item) => item.id === question?.topicId);
  if (topic?.state.kind === "agreed" && topic.state.answerMessageId) {
    return { messageId: topic.state.answerMessageId, text: topic.state.answer };
  }
  return null;
}

export function useDiscovery(port: DiscoveryPort, initial: DiscoveryState): DiscoveryController {
  const [brief, setBrief] = useState(initial.brief);
  const [files, setFiles] = useState(initial.files);
  const [usage, setUsage] = useState(initial.usage);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [composerText, setComposerText] = useState("");
  const [refusal, setRefusal] = useState<{ kind: string; reason: string } | null>(null);
  const [reopened, setReopened] = useState<string[]>([]);
  const [panel, setPanel] = useState<DiscoveryPanel | null>(null);
  const [highlight, setHighlight] = useState<{ messageId: string; text: string } | null>(null);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const [oneAtATime, setOneAtATime] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const briefRef = useRef(brief);
  const draftsRef = useRef(drafts);
  const composerRef = useRef(composerText);
  const reopenedRef = useRef(reopened);
  const sending = useRef(false);
  briefRef.current = brief;
  draftsRef.current = drafts;
  composerRef.current = composerText;
  reopenedRef.current = reopened;

  const chatStore = useRef<Chat<DiscoveryUIMessage> | null>(null);
  if (chatStore.current === null) {
    chatStore.current = new Chat<DiscoveryUIMessage>({
      id: "discovery",
      messages: structuredClone(initial.transcript),
      transport: port.chat,
      onData: (part) => {
        if (part.type === "data-brief") setBrief((current) => newerBrief(current, part.data));
        if (part.type === "data-usage") setUsage(part.data);
      },
    });
  }
  const chat = chatStore.current;
  const { messages, status } = useChat<DiscoveryUIMessage>({ chat });

  useEffect(() => {
    return port.subscribe((change) => {
      if (change.files) setFiles(change.files);
      const incomingBrief = change.brief;
      if (incomingBrief) setBrief((current) => newerBrief(current, incomingBrief));
      if (change.usage) setUsage(change.usage);
    });
  }, [port]);

  useEffect(() => {
    if (!highlight) return;
    const timer = window.setTimeout(() => setHighlight(null), 2000);
    return () => window.clearTimeout(timer);
  }, [highlight]);

  const questions = currentQuestions(brief, reopened);
  const assistantCount = messages.filter((message) => message.role === "assistant").length;
  const busy = status === "submitted" || status === "streaming";
  const ready =
    composerText.trim().length > 0 ||
    questions.some((question) => draftReady(question.id, question.options, drafts[question.id]));
  const canSend = !busy && usage.nextReply !== "unavailable" && ready;
  const index = Math.min(questionIndex, Math.max(questions.length - 1, 0));

  function pick(questionId: string, draft: Draft | null) {
    setDrafts((current) => {
      const next = { ...current };
      if (draft === null) delete next[questionId];
      else next[questionId] = draft;
      return next;
    });
  }

  function pointAt(questionId: string) {
    setOneAtATime(false);
    setPanel(null);
    setFocus({ id: questionId, nonce: Date.now() });
  }

  async function send() {
    if (sending.current) return;
    if (chat.status === "submitted" || chat.status === "streaming") return;
    const open = currentQuestions(briefRef.current, reopenedRef.current);
    const answers = answersFromDrafts(draftsRef.current, open);
    const note = composerRef.current.trim();
    if (answers.length === 0 && note.length === 0) return;
    const text = [...answers.map((answer) => answer.text), note]
      .filter((item) => item.length > 0)
      .join("\n\n");
    sending.current = true;
    try {
      await chat.sendMessage(
        { text },
        {
          body: {
            message: note,
            mode: "answer",
            answers,
          },
        },
      );
      if (chat.status === "error") {
        setRefusal(parseRefusal(chat.error));
        return;
      }
      const sent = new Set(answers.map((answer) => answer.questionId));
      setDrafts((current) => {
        const next = { ...current };
        for (const id of sent) delete next[id];
        return next;
      });
      setReopened((current) => current.filter((id) => !sent.has(id)));
      setComposerText("");
      setRefusal(null);
    } catch (error) {
      setRefusal(parseRefusal(error));
    } finally {
      sending.current = false;
    }
  }

  return {
    project: initial.project,
    brief,
    files,
    usage,
    confirmation: initial.confirmation,
    messages,
    drafts,
    composerText,
    canSend,
    paidSend: usage.nextReply === "paid",
    refusal,
    reopened,
    panel,
    highlight,
    focus,
    oneAtATime,
    questionIndex: index,
    assistantCount,
    pick,
    setComposerText,
    send,
    openPanel(next) {
      setPanel(next);
    },
    closePanel() {
      setPanel(null);
    },
    reopen(questionId) {
      setReopened((current) => (current.includes(questionId) ? current : [...current, questionId]));
      pointAt(questionId);
    },
    focusQuestion: pointAt,
    viewAnswer(questionId) {
      const target = answerTarget(brief, questionId);
      setPanel(null);
      if (target) setHighlight(target);
    },
    showOne() {
      setQuestionIndex(0);
      setOneAtATime(true);
    },
    showTogether() {
      setOneAtATime(false);
    },
    nextQuestion() {
      setQuestionIndex((current) => current + 1);
    },
  };
}
