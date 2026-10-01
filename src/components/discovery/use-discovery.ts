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
} from "@/lib/discovery-stream";
import { NAME } from "./a11y";
import {
  answerText,
  confirmationCurrent,
  currentQuestions,
  dataTierOf,
  fileReadView,
  fileRows,
  messageLead,
  newerBrief,
  openForReview,
  progressOf,
  reviewGate,
  reviewSections,
  type Draft,
  type FileReadView,
  type ReviewTicks,
} from "./model";
import type { DiscoveryPort } from "./port";

export type DiscoveryPanel =
  | { kind: "brief" }
  | { kind: "questions" }
  | { kind: "chooser" }
  | { kind: "file"; key: string };

export type DiscoveryOpener = "brief" | "questions" | "add" | { kind: "file"; fileId: string };

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
  fileView: FileReadView | null;
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
  chooseFile(file: File): Promise<void>;
  openFile(fileId: string): void;
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

/** True when the draft is still the answer that was sent. */
function draftStillMatches(draft: Draft | undefined, answer: DiscoveryAnswer): boolean {
  if (!draft) return false;
  if (!answer.certain) return draft.kind === "uncertain";
  if (answer.choice === "custom") return draft.kind === "own" && draft.text.trim() === answer.text;
  return draft.kind === "option" && draft.optionId === answer.choice;
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
  const adding = useRef(false);
  const confirmationRef = useRef(confirmation);
  const usageRef = useRef(usage);
  const shownGeneration = useRef(0);
  confirmationRef.current = confirmation;
  usageRef.current = usage;
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
      if ("confirmation" in change) setConfirmation(change.confirmation ?? null);
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

  function remember(opener: DiscoveryOpener) {
    openerRef.current = opener;
  }

  function pointAt(questionId: string) {
    setOneAtATime(false);
    setPanel(null);
    setRestore(null);
    setFocus({ id: questionId, nonce: Date.now() });
  }

  async function chooseFile(file: File) {
    if (adding.current) return;
    adding.current = true;
    setFileNotice(null);
    try {
      const result = await port.addFile(file);
      if (!result.ok) {
        setFileNotice(result.refusal.reason);
        return;
      }
      setPanel(null);
      const opener = openerRef.current;
      if (opener) setRestore({ nonce: Date.now(), opener });
    } finally {
      adding.current = false;
    }
  }

  function openFile(fileId: string) {
    const file = filesRef.current.find((item) => item.id === fileId && item.origin === "discovery");
    if (!file || file.origin !== "discovery") return;
    setFileNotice(null);
    remember({ kind: "file", fileId });
    setRestore(null);
    setPanel({ kind: "file", key: fileId });
  }

  async function refreshAfterModeChange() {
    const loaded = await port.load();
    if (!loaded.ok) return;
    setUsage(loaded.value.usage);
    setBrief((current) => newerBrief(current, loaded.value.brief));
    setConfirmation(loaded.value.confirmation);
    setFiles(loaded.value.files);
  }

  async function send() {
    if (confirmationCurrent(briefRef.current, confirmationRef.current)) return;
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
    const expectedCharge = usageRef.current.nextReply === "paid" ? "paid" : "free";
    const before = structuredClone(messagesRef.current);
    sending.current = true;
    try {
      await chat.sendMessage(
        { text },
        {
          body: {
            message: note,
            mode: "answer",
            expectedCharge,
            answers,
          },
        },
      );
      if (chat.status === "error") {
        setMessages(before);
        const parsed = parseRefusal(chat.error);
        if (parsed.kind === "mode-changed") await refreshAfterModeChange();
        setRefusal(parsed);
        return;
      }
      const keptOpen = answers.filter((answer) => !draftStillMatches(draftsRef.current[answer.questionId], answer));
      const keptIds = new Set(keptOpen.map((answer) => answer.questionId));
      setDrafts((current) => {
        const next = { ...current };
        for (const answer of answers) {
          if (draftStillMatches(next[answer.questionId], answer)) delete next[answer.questionId];
        }
        return next;
      });
      setReopened((current) => current.filter((id) => keptIds.has(id) || !answers.some((answer) => answer.questionId === id)));
      setComposerText((current) => (current.trim() === note ? "" : current));
      setRefusal(null);
    } catch (error) {
      setMessages(before);
      const parsed = parseRefusal(error);
      if (parsed.kind === "mode-changed") await refreshAfterModeChange();
      setRefusal(parsed);
    } finally {
      sending.current = false;
    }
  }

  const openFileRecord =
    panel?.kind === "file"
      ? files.find((item) => item.id === panel.key && item.origin === "discovery")
      : null;
  const fileView = openFileRecord && openFileRecord.origin === "discovery" ? fileReadView(openFileRecord) : null;

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
    fileView,
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
        setBrief((current) => newerBrief(current, result.value));
        setDrafts((current) => {
          const next = { ...current };
          delete next[questionId];
          return next;
        });
        setReopened((current) => current.filter((id) => id !== questionId));
        setPinned((current) => current.filter((id) => id !== questionId));
        setRefusal(null);
      } finally {
        savingChange.current = false;
      }
    },
    openPanel(next) {
      remember(next);
      setRestore(null);
      setPanel({ kind: next });
    },
    closePanel() {
      setFileNotice(null);
      setPanel(null);
      const opener = openerRef.current;
      if (opener) setRestore({ nonce: Date.now(), opener });
    },
    openChooser() {
      if (!fileRows(filesRef.current, initial.project.funded).canAdd) return;
      remember("add");
      setRestore(null);
      setFileNotice(null);
      setPanel({ kind: "chooser" });
    },
    chooseFile,
    openFile,
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
  acceptError: Readonly<Record<string, string>>;
  askError: Readonly<Record<string, string>>;
  labelError: Readonly<Record<string, string>>;
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
  const [openGapsCount, setOpenGapsCount] = useState<number | null>(null);
  const [dataAck, setDataAck] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editBase, setEditBase] = useState(initial.brief.revision);
  const [editError, setEditError] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<Record<string, string>>({});
  const [askError, setAskError] = useState<Record<string, string>>({});
  const [labelError, setLabelError] = useState<Record<string, string>>({});
  const [changed, setChanged] = useState<string[]>([]);
  const briefRef = useRef(brief);
  const busyRef = useRef(false);
  briefRef.current = brief;

  useEffect(() => {
    return port.subscribe((change) => {
      const incomingBrief = change.brief;
      if (incomingBrief) setBrief((current) => newerBrief(current, incomingBrief));
      if (change.files) setFiles(change.files);
      if (change.usage) setUsage(change.usage);
      if ("confirmation" in change) setConfirmation(change.confirmation ?? null);
    });
  }, [port]);

  const open = openForReview(brief);
  const sections = reviewSections(brief);
  const ticks: ReviewTicks = { reviewedRevision, openGapsCount, data: dataAck };
  const reading = files.some((file) => file.origin === "discovery" && file.status.kind === "reading");
  const dataRequired = dataTierOf(brief) !== 0;
  const gate = reviewGate({
    revision: brief.revision,
    openCount: open.length,
    ticks,
    editing: editingId !== null,
    reading,
    dataRequired,
  });

  function hold(): boolean {
    if (busyRef.current) return false;
    busyRef.current = true;
    return true;
  }

  function release() {
    busyRef.current = false;
  }

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
    acceptError,
    askError,
    labelError,
    changed,
    gate,
    setReviewed(checked) {
      setReviewedRevision(checked ? briefRef.current.revision : null);
    },
    setOpenGaps(checked) {
      setOpenGapsCount(checked ? openForReview(briefRef.current).length : null);
    },
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
      if (!editingId || !hold()) return;
      try {
        const current = reviewSections(briefRef.current).find((section) => section.id === editingId);
        if (current && current.text === draft) {
          setEditingId(null);
          setDraft("");
          setEditError(null);
          return;
        }
        const result = await port.saveBriefEdit({ sectionId: editingId, text: draft, baseRevision: editBase });
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
      } catch (error) {
        setEditError(error instanceof Error ? error.message : "The edit did not save.");
      } finally {
        release();
      }
    },
    async askTopic(topicId) {
      if (!hold()) return null;
      try {
        const result = await port.askTopic({ topicId });
        if (!result.ok) {
          setAskError((current) => ({ ...current, [topicId]: result.refusal.reason }));
          return null;
        }
        setAskError((current) => {
          const next = { ...current };
          delete next[topicId];
          return next;
        });
        const nextBrief = newerBrief(briefRef.current, result.value);
        setBrief(nextBrief);
        return result.value.questions.find((question) => question.topicId === topicId)?.id ?? null;
      } catch (error) {
        setAskError((current) => ({
          ...current,
          [topicId]: error instanceof Error ? error.message : "The question did not open.",
        }));
        return null;
      } finally {
        release();
      }
    },
    async accept(topicId, title) {
      if (!hold()) return;
      try {
        const result = await port.acceptSuggestion({ topicId, baseRevision: briefRef.current.revision });
        if (!result.ok) {
          setAcceptError((current) => ({ ...current, [topicId]: result.refusal.reason }));
          return;
        }
        setAcceptError((current) => {
          const next = { ...current };
          delete next[topicId];
          return next;
        });
        setBrief((currentBrief) => newerBrief(currentBrief, result.value));
        setChanged((list) => [...list, title]);
      } catch (error) {
        setAcceptError((current) => ({
          ...current,
          [topicId]: error instanceof Error ? error.message : "The suggestion was not accepted.",
        }));
      } finally {
        release();
      }
    },
    async removeLabel(label) {
      if (!hold()) return;
      try {
        const result = await port.removeCauseLabel({ label, baseRevision: briefRef.current.revision });
        if (!result.ok) {
          setLabelError((current) => ({ ...current, [label]: result.refusal.reason }));
          return;
        }
        setLabelError((current) => {
          const next = { ...current };
          delete next[label];
          return next;
        });
        setBrief((currentBrief) => newerBrief(currentBrief, result.value));
      } catch (error) {
        setLabelError((current) => ({
          ...current,
          [label]: error instanceof Error ? error.message : "The label was not removed.",
        }));
      } finally {
        release();
      }
    },
    async finish() {
      const latest = briefRef.current;
      const openNow = openForReview(latest);
      const tier = dataTierOf(latest);
      const ready = reviewGate({
        revision: latest.revision,
        openCount: openNow.length,
        ticks: { reviewedRevision, openGapsCount, data: dataAck },
        editing: editingId !== null,
        reading: files.some((file) => file.origin === "discovery" && file.status.kind === "reading"),
        dataRequired: tier !== 0,
      });
      if (!ready.canFinish || !hold()) return;
      try {
        const result = await port.finish({
          revision: latest.revision,
          acks: {
            reviewed: true,
            openGaps: openNow.length > 0 ? openGapsCount === openNow.length : false,
            data: tier === 0 ? false : dataAck,
          },
        });
        if (!result.ok) {
          setFinishError(result.refusal.reason);
          return;
        }
        setConfirmation(result.value);
        setFinishError(null);
      } catch (error) {
        setFinishError(error instanceof Error ? error.message : "Discovery did not finish.");
      } finally {
        release();
      }
    },
  };
}
