import { Chat, useChat } from "@ai-sdk/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  BriefSnapshot,
  Confirmation,
  DiscoveryAnswer,
  DiscoveryFile,
  DiscoveryState,
  DiscoveryUIMessage,
  DiscoveryUsage,
  FileChatUIMessage,
} from "@/lib/discovery-stream";
import { NAME, TEXT } from "./a11y";
import {
  answerText,
  currentQuestions,
  fileChatView,
  fileRows,
  messageLead,
  newerBrief,
  openForReview,
  progressOf,
  reviewGate,
  reviewSections,
  type Draft,
  type FileChatView,
  type ReviewTicks,
} from "./model";
import type { DiscoveryPort } from "./port";

export type DiscoveryPanel =
  | { kind: "brief" }
  | { kind: "questions" }
  | { kind: "chooser" }
  | { kind: "file"; key: string };

export type DiscoveryOpener = "brief" | "questions" | "add" | { kind: "file"; fileId: string };

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
  confirmation: Confirmation | null;
  messages: DiscoveryUIMessage[];
  drafts: Readonly<Record<string, Draft>>;
  composerText: string;
  canSend: boolean;
  paidSend: boolean;
  refusal: { kind: string; reason: string } | null;
  reopened: readonly string[];
  pinned: readonly string[];
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
  saveChange(questionId: string): Promise<void>;
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
  restore: { nonce: number; opener: DiscoveryOpener } | null;
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

function answerTarget(
  brief: BriefSnapshot,
  messages: readonly DiscoveryUIMessage[],
  questionId: string,
): { messageId: string; text: string } | null {
  const question = brief.questions.find((item) => item.id === questionId);
  const topic = brief.topics.find((item) => item.id === question?.topicId);
  if (!topic || topic.state.kind !== "agreed") return null;
  const messageId = topic.state.answerMessageId;
  if (!messageId) return null;
  const message = messages.find((item) => item.id === messageId);
  const text = message ? messageLead(message) : null;
  return { messageId, text: text ?? topic.state.answer };
}

export function useDiscovery(
  port: DiscoveryPort,
  initial: DiscoveryState,
  active = true,
  returnFocus: { questionId: string; nonce: number } | null = null,
): DiscoveryController {
  const [brief, setBrief] = useState(initial.brief);
  const [files, setFiles] = useState(initial.files);
  const [usage, setUsage] = useState(initial.usage);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(initial.confirmation);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [composerText, setComposerText] = useState("");
  const [refusal, setRefusal] = useState<{ kind: string; reason: string } | null>(null);
  const [reopened, setReopened] = useState<string[]>([]);
  const [pinned, setPinned] = useState<string[]>([]);
  const [panel, setPanel] = useState<DiscoveryPanel | null>(null);
  const [staged, setStaged] = useState<{ key: string; name: string; sizeBytes: number } | null>(null);
  const [fileDrafts, setFileDrafts] = useState<Record<string, string>>({});
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<{ messageId: string; text: string } | null>(null);
  const [focus, setFocus] = useState<{ id: string; nonce: number } | null>(null);
  const [restore, setRestore] = useState<{ nonce: number; opener: DiscoveryOpener } | null>(null);
  const openerRef = useRef<DiscoveryOpener | null>(null);
  const [oneAtATime, setOneAtATime] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const briefRef = useRef(brief);
  const draftsRef = useRef(drafts);
  const composerRef = useRef(composerText);
  const reopenedRef = useRef(reopened);
  const filesRef = useRef(files);
  const panelRef = useRef(panel);
  const sending = useRef(false);
  const savingChange = useRef(false);
  const fileSending = useRef(false);
  const confirmationRef = useRef(confirmation);
  const shownGeneration = useRef(0);
  const held = useRef(new Map<string, HeldFileChat>());
  confirmationRef.current = confirmation;
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
  const { messages, status, setMessages } = useChat<DiscoveryUIMessage>({ chat });
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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
    if (!active || !returnFocus) return;
    setOneAtATime(false);
    setPanel(null);
    setFocus({ id: returnFocus.questionId, nonce: returnFocus.nonce });
  }, [active, returnFocus]);

  useEffect(() => {
    if (!active) return;
    let live = true;
    const generationAtLoad = shownGeneration.current;
    port.load().then((result) => {
      if (!live || !result.ok) return;
      const incoming = result.value.confirmation;
      // A click during this load keeps the question. An older Edit does not survive confirmation.
      if (incoming && confirmationRef.current === null && shownGeneration.current === generationAtLoad) {
        setReopened([]);
        setPinned([]);
      }
      setConfirmation(incoming);
      setBrief((current) => newerBrief(current, result.value.brief));
      setUsage(result.value.usage);
      setFiles(result.value.files);
    });
    return () => {
      live = false;
    };
  }, [active, port]);

  useEffect(() => {
    return port.subscribe((change) => {
      if (change.files) {
        filesRef.current = change.files;
        setFiles(change.files);
      }
      const incomingBrief = change.brief;
      if (incomingBrief) setBrief((current) => newerBrief(current, incomingBrief));
      if (change.usage) setUsage(change.usage);
      const incomingTranscript = change.transcript;
      if (incomingTranscript) {
        setMessages((current) => {
          const ids = new Set(current.map((message) => message.id));
          const extra = incomingTranscript.filter((message) => !ids.has(message.id));
          return extra.length === 0 ? current : [...current, ...extra];
        });
      }
    });
  }, [port, setMessages]);

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
  const sendable = questions.filter((question) => !reopened.includes(question.id));
  const questionKey = questions.map((question) => question.id).join("\n");
  const questionKeyRef = useRef(questionKey);
  useLayoutEffect(() => {
    if (questionKeyRef.current === questionKey) return;
    questionKeyRef.current = questionKey;
    setQuestionIndex(0);
  }, [questionKey]);
  const assistantCount = messages.filter((message) => message.role === "assistant").length;
  const busy = status === "submitted" || status === "streaming";
  const progress = progressOf(brief);
  const requiredDone = progress.total > 0 && progress.agreed === progress.total;
  const hasDraft = sendable.some((question) => draftReady(question.id, question.options, drafts[question.id]));
  const hasNote = composerText.trim().length > 0;
  const canSend = !busy && usage.nextReply !== "unavailable" && (requiredDone ? hasDraft : hasDraft || hasNote);
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

  function remember(opener: DiscoveryOpener) {
    openerRef.current = opener;
  }

  function pointAt(questionId: string) {
    setOneAtATime(false);
    releaseUncommitted(panelRef.current);
    setPanel(null);
    setRestore(null);
    setFocus({ id: questionId, nonce: Date.now() });
  }

  function chooseFile(file: File) {
    // A staged file commits with its first answer. Confirmation takes no new answer, so it takes no new file.
    if (confirmationRef.current) return;
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
    remember({ kind: "file", fileId });
    setRestore(null);
    setPanel({ kind: "file", key: fileId });
  }

  function setFileDraft(text: string) {
    const key = panelRef.current?.kind === "file" ? panelRef.current.key : null;
    if (!key) return;
    setFileDrafts((draftsNow) => ({ ...draftsNow, [key]: text }));
  }

  async function sendFileAnswer(text: string) {
    if (confirmationRef.current) return;
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    if (fileSending.current) return;
    const current = fileChatRef.current;
    if (current === idleChat) return;
    if (current.status === "submitted" || current.status === "streaming") return;
    const key = panelRef.current?.kind === "file" ? panelRef.current.key : null;
    // The pause question arrives with the file status, not as a chat message. Keep it in the
    // transcript above the answer it gets.
    const waitingFile = filesRef.current.find((item) => item.id === key);
    if (waitingFile?.origin === "discovery" && waitingFile.status.kind === "waiting") {
      const question = waitingFile.status.question.text;
      const asked = current.messages.some((message) =>
        message.parts.some((part) => part.type === "text" && part.text === question),
      );
      if (!asked) {
        current.messages = [
          ...current.messages,
          { id: `ask-${waitingFile.id}`, role: "assistant", parts: [{ type: "text", text: question }] },
        ];
      }
    }
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
    if (confirmationRef.current) return;
    if (sending.current) return;
    if (chat.status === "submitted" || chat.status === "streaming") return;
    const open = currentQuestions(briefRef.current, reopenedRef.current).filter(
      (question) => !reopenedRef.current.includes(question.id),
    );
    const answers = answersFromDrafts(draftsRef.current, open);
    const note = composerRef.current.trim();
    const progressNow = progressOf(briefRef.current);
    if (progressNow.total > 0 && progressNow.agreed === progressNow.total && answers.length === 0) return;
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
          finished: confirmation !== null,
        })
      : null;

  return {
    project: initial.project,
    brief,
    files,
    usage,
    confirmation,
    messages,
    drafts,
    composerText,
    canSend,
    paidSend: usage.nextReply === "paid",
    refusal,
    reopened,
    pinned,
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
    async saveChange(questionId) {
      if (savingChange.current || sending.current) return;
      const briefNow = briefRef.current;
      const question = briefNow.questions.find((item) => item.id === questionId);
      if (!question) return;
      const text = answerText(question, draftsRef.current[questionId]);
      if (!text) return;
      savingChange.current = true;
      try {
        const result = await port.saveBriefEdit({
          sectionId: question.topicId,
          text,
          baseRevision: briefNow.revision,
        });
        if (!result.ok) {
          setRefusal(result.refusal);
          return;
        }
        const loaded = await port.load();
        setBrief((current) => newerBrief(current, result.value));
        setDrafts((current) => {
          const next = { ...current };
          delete next[questionId];
          return next;
        });
        setReopened((current) => current.filter((id) => id !== questionId));
        setPinned((current) => current.filter((id) => id !== questionId));
        if (loaded.ok) setConfirmation(loaded.value.confirmation);
        setRefusal(null);
      } finally {
        savingChange.current = false;
      }
    },
    openPanel(next) {
      releaseUncommitted(panelRef.current);
      remember(next);
      setRestore(null);
      setPanel({ kind: next });
    },
    closePanel() {
      releaseUncommitted(panelRef.current);
      setFileNotice(null);
      setPanel(null);
      const opener = openerRef.current;
      if (opener) setRestore({ nonce: Date.now(), opener });
    },
    openChooser() {
      if (!fileRows(filesRef.current, initial.project.funded).canAdd) return;
      releaseUncommitted(panelRef.current);
      remember("add");
      setRestore(null);
      setFileNotice(null);
      setPanel({ kind: "chooser" });
    },
    chooseFile,
    openFile,
    setFileDraft,
    sendFileAnswer,
    reopen(questionId) {
      shownGeneration.current += 1;
      setReopened((current) => (current.includes(questionId) ? current : [...current, questionId]));
      pointAt(questionId);
    },
    focusQuestion(questionId) {
      shownGeneration.current += 1;
      setPinned((current) => (current.includes(questionId) ? current : [...current, questionId]));
      pointAt(questionId);
    },
    viewAnswer(questionId) {
      const opener = panelRef.current ? openerRef.current : null;
      const target = answerTarget(briefRef.current, messagesRef.current, questionId);
      releaseUncommitted(panelRef.current);
      setPanel(null);
      if (target) setHighlight(target);
      if (opener) setRestore({ nonce: Date.now(), opener });
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
    restore,
  };
}

export type DiscoveryReviewController = {
  project: DiscoveryState["project"];
  brief: BriefSnapshot;
  files: DiscoveryFile[];
  usage: DiscoveryUsage;
  confirmation: Confirmation | null;
  open: ReturnType<typeof openForReview>;
  sections: ReturnType<typeof reviewSections>;
  ticks: ReviewTicks;
  editingId: string | null;
  draft: string;
  editError: string | null;
  finishError: string | null;
  changed: readonly string[];
  gate: { canFinish: boolean; hint: string };
  setReviewed(checked: boolean): void;
  setOpenGaps(checked: boolean): void;
  setData(checked: boolean): void;
  beginEdit(sectionId: string, text: string): void;
  setDraft(text: string): void;
  cancelEdit(): void;
  saveEdit(title: string): Promise<void>;
  accept(topicId: string, title: string): Promise<void>;
  askTopic(topicId: string): Promise<string | null>;
  removeLabel(label: string): Promise<void>;
  finish(): Promise<void>;
};

export function useDiscoveryReview(port: DiscoveryPort, initial: DiscoveryState): DiscoveryReviewController {
  const [brief, setBrief] = useState(initial.brief);
  const [files, setFiles] = useState(initial.files);
  const [usage, setUsage] = useState(initial.usage);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(initial.confirmation);
  const [reviewedRevision, setReviewedRevision] = useState<number | null>(null);
  const [openGaps, setOpenGaps] = useState(false);
  const [dataAck, setDataAck] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editBase, setEditBase] = useState(initial.brief.revision);
  const [editError, setEditError] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [changed, setChanged] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const briefRef = useRef(brief);
  briefRef.current = brief;

  useEffect(() => {
    return port.subscribe((change) => {
      if (change.brief) setBrief((current) => newerBrief(current, change.brief as BriefSnapshot));
      if (change.files) setFiles(change.files);
      if (change.usage) setUsage(change.usage);
    });
  }, [port]);

  const open = openForReview(brief);
  const sections = reviewSections(brief);
  const ticks: ReviewTicks = { reviewedRevision, openGaps, data: dataAck };
  const gate = reviewGate({
    revision: brief.revision,
    openCount: open.length,
    ticks,
    editing: editingId !== null,
  });

  return {
    project: initial.project,
    brief,
    files,
    usage,
    confirmation,
    open,
    sections,
    ticks,
    editingId,
    draft,
    editError,
    finishError,
    changed,
    gate,
    setReviewed(checked) {
      setReviewedRevision(checked ? briefRef.current.revision : null);
    },
    setOpenGaps,
    setData: setDataAck,
    beginEdit(sectionId, text) {
      setEditingId(sectionId);
      setDraft(text);
      setEditBase(briefRef.current.revision);
      setEditError(null);
    },
    setDraft,
    cancelEdit() {
      setEditingId(null);
      setDraft("");
      setEditError(null);
    },
    async saveEdit(title) {
      if (!editingId || busy) return;
      const current = reviewSections(briefRef.current).find((section) => section.id === editingId);
      if (current && current.text === draft) {
        setEditingId(null);
        setDraft("");
        setEditError(null);
        return;
      }
      setBusy(true);
      const result = await port.saveBriefEdit({ sectionId: editingId, text: draft, baseRevision: editBase });
      setBusy(false);
      if (!result.ok) {
        setEditError(result.refusal.reason);
        if (result.refusal.kind === "stale-revision") setEditBase(briefRef.current.revision);
        return;
      }
      setBrief((currentBrief) => newerBrief(currentBrief, result.value));
      setChanged((list) => [...list, title]);
      setEditingId(null);
      setDraft("");
      setEditError(null);
    },
    async askTopic(topicId) {
      const result = await port.askTopic({ topicId });
      if (!result.ok) {
        setFinishError(result.refusal.reason);
        return null;
      }
      setBrief((currentBrief) => newerBrief(currentBrief, result.value));
      return topicId;
    },
    async accept(topicId, title) {
      if (busy) return;
      setBusy(true);
      const result = await port.acceptSuggestion({ topicId, baseRevision: briefRef.current.revision });
      setBusy(false);
      if (!result.ok) {
        setFinishError(result.refusal.reason);
        return;
      }
      setBrief((currentBrief) => newerBrief(currentBrief, result.value));
      setChanged((list) => [...list, title]);
    },
    async removeLabel(label) {
      const result = await port.removeCauseLabel({ label, baseRevision: briefRef.current.revision });
      if (!result.ok) {
        setFinishError(result.refusal.reason);
        return;
      }
      setBrief((currentBrief) => newerBrief(currentBrief, result.value));
    },
    async finish() {
      const latest = briefRef.current;
      const openNow = openForReview(latest);
      const ready = reviewGate({
        revision: latest.revision,
        openCount: openNow.length,
        ticks: { reviewedRevision, openGaps, data: dataAck },
        editing: editingId !== null,
      });
      if (!ready.canFinish || busy) return;
      setBusy(true);
      const result = await port.finish({
        revision: latest.revision,
        acks: { reviewed: true, openGaps: openNow.length > 0 ? openGaps : false, data: true },
      });
      setBusy(false);
      if (!result.ok) {
        setFinishError(result.refusal.reason);
        return;
      }
      setConfirmation(result.value);
      setFinishError(null);
    },
  };
}
