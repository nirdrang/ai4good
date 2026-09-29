import { Chat, useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { DiscoveryAnswer, DiscoveryState, DiscoveryUIMessage } from "@/lib/discovery-stream";
import { NAME } from "./a11y";
import { currentQuestions, newerBrief, type Draft } from "./model";
import type { DiscoveryPort } from "./port";

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
  refusal: { kind: string; reason: string } | null;
  pick(questionId: string, draft: Draft | null): void;
  setComposerText(text: string): void;
  send(): Promise<void>;
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

export function useDiscovery(
  port: DiscoveryPort,
  initial: DiscoveryState,
  scope: { organizationId: string; projectId: string },
): DiscoveryController {
  const [brief, setBrief] = useState(initial.brief);
  const [files, setFiles] = useState(initial.files);
  const [usage, setUsage] = useState(initial.usage);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [composerText, setComposerText] = useState("");
  const [refusal, setRefusal] = useState<{ kind: string; reason: string } | null>(null);
  const briefRef = useRef(brief);
  const draftsRef = useRef(drafts);
  const composerRef = useRef(composerText);
  const sending = useRef(false);
  briefRef.current = brief;
  draftsRef.current = drafts;
  composerRef.current = composerText;

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

  const questions = currentQuestions(brief);
  const busy = status === "submitted" || status === "streaming";
  const ready =
    composerText.trim().length > 0 ||
    questions.some((question) => draftReady(question.id, question.options, drafts[question.id]));
  const canSend = !busy && ready;

  function pick(questionId: string, draft: Draft | null) {
    setDrafts((current) => {
      const next = { ...current };
      if (draft === null) delete next[questionId];
      else next[questionId] = draft;
      return next;
    });
  }

  async function send() {
    if (sending.current) return;
    if (chat.status === "submitted" || chat.status === "streaming") return;
    const open = currentQuestions(briefRef.current);
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
            organizationId: scope.organizationId,
            projectId: scope.projectId,
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
    refusal,
    pick,
    setComposerText,
    send,
  };
}
