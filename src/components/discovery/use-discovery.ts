import { Chat, useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type {
  BriefSnapshot,
  DiscoveryAnswer,
  DiscoveryFile,
  DiscoveryState,
  DiscoveryUIMessage,
  FileChatUIMessage,
} from "@/lib/discovery-stream";
import { NAME, TEXT } from "./a11y";
import { currentQuestions, fileChatView, fileRows, newerBrief, type Draft, type FileChatView } from "./model";
import type { DiscoveryPort } from "./port";

export type DiscoveryPanel =
  | { kind: "brief" }
  | { kind: "questions" }
  | { kind: "chooser" }
  | { kind: "file"; key: string };

type HeldFileChat = {
  chat: Chat<FileChatUIMessage>;
  name: string;
  staged: boolean;
  seen: ReadonlySet<string>;
};

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
  fileChat: FileChatView | null;
  fileNotice: string | null;
  highlight: { messageId: string; text: string } | null;
  focus: { id: string; nonce: number } | null;
  oneAtATime: boolean;
  questionIndex: number;
  assistantCount: number;
  pick(questionId: string, draft: Draft | null): void;
  setComposerText(text: string): void;
  send(): Promise<void>;
  openPanel(panel: "brief" | "questions"): void;
  closePanel(): void;
  openChooser(): void;
  chooseFile(file: File): void;
  openFile(fileId: string): void;
  setFileDraft(text: string): void;
  sendFileAnswer(text: string): Promise<void>;
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
  const [staged, setStaged] = useState<{ key: string; name: string; sizeBytes: number } | null>(null);
  const [fileDrafts, setFileDrafts] = useState<Record<string, string>>({});
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<{ messageId: string; text: string } | null>(null);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const [oneAtATime, setOneAtATime] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const briefRef = useRef(brief);
  const draftsRef = useRef(drafts);
  const composerRef = useRef(composerText);
  const reopenedRef = useRef(reopened);
  const filesRef = useRef(files);
  const panelRef = useRef(panel);
  const sending = useRef(false);
  const fileSending = useRef(false);
  const held = useRef(new Map<string, HeldFileChat>());
  briefRef.current = brief;
  draftsRef.current = drafts;
  composerRef.current = composerText;
  reopenedRef.current = reopened;
  filesRef.current = files;
  panelRef.current = panel;

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

  const idleStore = useRef<Chat<FileChatUIMessage> | null>(null);
  if (idleStore.current === null) {
    idleStore.current = new Chat<FileChatUIMessage>({
      id: "file-idle",
      messages: [],
      transport: port.fileChat({ kind: "existing", fileId: "idle" }),
    });
  }
  const idleChat = idleStore.current;
  const fileKey = panel?.kind === "file" ? panel.key : null;
  const fileEntry = fileKey ? (held.current.get(fileKey) ?? null) : null;
  const activeFileChat = fileEntry?.chat ?? idleChat;
  const { messages: fileMessages, status: fileStatus } = useChat<FileChatUIMessage>({ chat: activeFileChat });
  const fileChatRef = useRef(activeFileChat);
  fileChatRef.current = activeFileChat;

  useEffect(() => {
    return port.subscribe((change) => {
      if (change.files) {
        filesRef.current = change.files;
        setFiles(change.files);
      }
      const incomingBrief = change.brief;
      if (incomingBrief) setBrief((current) => newerBrief(current, incomingBrief));
      if (change.usage) setUsage(change.usage);
    });
  }, [port]);

  useEffect(() => {
    if (panel?.kind !== "file") return;
    const entry = held.current.get(panel.key);
    if (!entry?.staged) return;
    const created = files.find(
      (item) => item.origin === "discovery" && item.name === entry.name && !entry.seen.has(item.id),
    );
    if (!created || created.origin !== "discovery") return;
    entry.staged = false;
    held.current.delete(panel.key);
    held.current.set(created.id, entry);
    const oldKey = panel.key;
    setFileDrafts((draftsNow) => {
      if (!(oldKey in draftsNow)) return draftsNow;
      const next = { ...draftsNow };
      const text = next[oldKey] ?? "";
      delete next[oldKey];
      next[created.id] = text;
      return next;
    });
    setStaged((item) => (item?.key === oldKey ? null : item));
    setPanel({ kind: "file", key: created.id });
  }, [files, panel]);

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

  function linkedFile(): Extract<DiscoveryFile, { origin: "discovery" }> | null {
    if (!fileEntry) return null;
    if (fileKey) {
      const byId = files.find((item) => item.origin === "discovery" && item.id === fileKey);
      if (byId && byId.origin === "discovery") return byId;
    }
    if (!fileEntry.staged) return null;
    const created = files.find(
      (item) => item.origin === "discovery" && item.name === fileEntry.name && !fileEntry.seen.has(item.id),
    );
    return created && created.origin === "discovery" ? created : null;
  }

  function releaseUncommitted(current: DiscoveryPanel | null) {
    if (current?.kind !== "file") return;
    const entry = held.current.get(current.key);
    if (!entry?.staged) return;
    const committed = filesRef.current.some(
      (item) => item.origin === "discovery" && item.name === entry.name && !entry.seen.has(item.id),
    );
    if (committed) return;
    held.current.delete(current.key);
    setStaged((item) => (item?.key === current.key ? null : item));
    setFileDrafts((draftsNow) => {
      if (!(current.key in draftsNow)) return draftsNow;
      const next = { ...draftsNow };
      delete next[current.key];
      return next;
    });
  }

  function pointAt(questionId: string) {
    setOneAtATime(false);
    releaseUncommitted(panelRef.current);
    setPanel(null);
    setFocus({ id: questionId, nonce: Date.now() });
  }

  function chooseFile(file: File) {
    const key = `new:${file.name}`;
    if (!held.current.has(key)) {
      const seen = new Set(
        filesRef.current.filter((item) => item.origin === "discovery").map((item) => item.id),
      );
      const fileChat = new Chat<FileChatUIMessage>({
        id: `file-new-${file.name}`,
        messages: [
          {
            id: `open-${file.name}`,
            role: "assistant",
            parts: [{ type: "text", text: TEXT.fileQuestion }],
          },
        ],
        transport: port.fileChat({ kind: "new", file }),
        onData: (part) => {
          if (part.type === "data-usage") setUsage(part.data);
        },
      });
      held.current.set(key, { chat: fileChat, name: file.name, staged: true, seen });
      setStaged({ key, name: file.name, sizeBytes: file.size });
    }
    setFileNotice(null);
    setPanel({ kind: "file", key });
  }

  function openFile(fileId: string) {
    const file = filesRef.current.find((item) => item.id === fileId && item.origin === "discovery");
    if (!file || file.origin !== "discovery") return;
    const stagedKey = `new:${file.name}`;
    const stagedEntry = held.current.get(stagedKey);
    if (!held.current.has(fileId) && stagedEntry) {
      stagedEntry.staged = false;
      held.current.delete(stagedKey);
      held.current.set(fileId, stagedEntry);
    }
    if (!held.current.has(fileId)) {
      held.current.set(fileId, {
        name: file.name,
        staged: false,
        seen: new Set(filesRef.current.map((item) => item.id)),
        chat: new Chat<FileChatUIMessage>({
          id: `file-${fileId}`,
          messages: structuredClone(initial.fileChats[fileId] ?? []),
          transport: port.fileChat({ kind: "existing", fileId }),
          onData: (part) => {
            if (part.type === "data-usage") setUsage(part.data);
          },
        }),
      });
    }
    setFileNotice(null);
    setPanel({ kind: "file", key: fileId });
  }

  function setFileDraft(text: string) {
    const key = panelRef.current?.kind === "file" ? panelRef.current.key : null;
    if (!key) return;
    setFileDrafts((draftsNow) => ({ ...draftsNow, [key]: text }));
  }

  async function sendFileAnswer(text: string) {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    if (fileSending.current) return;
    const current = fileChatRef.current;
    if (current === idleChat) return;
    if (current.status === "submitted" || current.status === "streaming") return;
    const key = panelRef.current?.kind === "file" ? panelRef.current.key : null;
    fileSending.current = true;
    setFileNotice(null);
    try {
      await current.sendMessage({ text: trimmed });
      if (current.status === "error") {
        setFileNotice(parseRefusal(current.error).reason);
        return;
      }
      setFileDrafts((draftsNow) => {
        const next = { ...draftsNow };
        if (key) next[key] = "";
        const liveKey = panelRef.current?.kind === "file" ? panelRef.current.key : null;
        if (liveKey) next[liveKey] = "";
        return next;
      });
    } catch (error) {
      setFileNotice(parseRefusal(error).reason);
    } finally {
      fileSending.current = false;
    }
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

  const linked = linkedFile();
  const fileChat =
    fileEntry && fileKey
      ? fileChatView({
          name: fileEntry.name,
          sizeBytes: linked?.sizeBytes ?? (staged?.name === fileEntry.name ? staged.sizeBytes : 0),
          file: linked,
          messages: fileMessages,
          draft: fileDrafts[fileKey] ?? "",
          busy: fileStatus === "submitted" || fileStatus === "streaming",
          paid: usage.nextReply === "paid",
        })
      : null;

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
    fileChat,
    fileNotice,
    highlight,
    focus,
    oneAtATime,
    questionIndex: index,
    assistantCount,
    pick,
    setComposerText,
    send,
    openPanel(next) {
      releaseUncommitted(panelRef.current);
      setPanel({ kind: next });
    },
    closePanel() {
      releaseUncommitted(panelRef.current);
      setFileNotice(null);
      setPanel(null);
    },
    openChooser() {
      if (!fileRows(filesRef.current, initial.project.funded).canAdd) return;
      releaseUncommitted(panelRef.current);
      setFileNotice(null);
      setPanel({ kind: "chooser" });
    },
    chooseFile,
    openFile,
    setFileDraft,
    sendFileAnswer,
    reopen(questionId) {
      setReopened((current) => (current.includes(questionId) ? current : [...current, questionId]));
      pointAt(questionId);
    },
    focusQuestion: pointAt,
    viewAnswer(questionId) {
      const target = answerTarget(brief, questionId);
      releaseUncommitted(panelRef.current);
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
