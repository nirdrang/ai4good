import { NAME, TEXT } from "../../../src/components/discovery/a11y";
import { topicSettled } from "../../../src/components/discovery/model";
import type {
  BriefSnapshot,
  BriefTopic,
  Confirmation,
  DiscoveryRequestBody,
  DiscoveryState,
  DiscoveryUIMessage,
  DiscoveryUsage,
  FileChatUIMessage,
  FileStatus,
} from "../../../src/lib/discovery-stream";
import type { FileChatTarget, Result, ServerChange } from "../../../src/components/discovery/port";
import { nextFileId, nextOpenQuestions, questionForTopic, questionPart, replyKind, scriptForName, seedState } from "./fixture-data";
import type { Pace, ScreenScenario } from "./givens";

const STALE = "The brief changed. Review the latest revision.";

export type AppliedTurn = {
  assistantId: string;
  reply: string;
  parts: DiscoveryUIMessage["parts"];
  brief: BriefSnapshot;
  usage: DiscoveryUsage;
};

export type AppliedFileAnswer = {
  fileId: string;
  assistantId: string;
  reply: string;
  charge: Extract<DiscoveryUIMessage["parts"][number], { type: "data-charge" }>;
  usage: DiscoveryUsage;
  status: FileStatus;
  startedRead: boolean;
};

export type FixtureWorld = {
  load(): Promise<Result<DiscoveryState>>;
  read(): DiscoveryState;
  subscribe(listener: (change: ServerChange) => void): () => void;
  applyTurn(input: { messages: DiscoveryUIMessage[]; request: DiscoveryRequestBody }): Result<AppliedTurn>;
  saveBriefEdit(input: { sectionId: string; text: string; baseRevision: number }): Promise<Result<BriefSnapshot>>;
  acceptSuggestion(input: { topicId: string; baseRevision: number }): Promise<Result<BriefSnapshot>>;
  askTopic(input: { topicId: string }): Promise<Result<BriefSnapshot>>;
  removeCauseLabel(input: { label: string; baseRevision: number }): Promise<Result<BriefSnapshot>>;
  finish(input: { revision: number; acks: { reviewed: true; openGaps: boolean; data: true } }): Promise<Result<Confirmation>>;
  fileBlock(target: FileChatTarget): { kind: string; reason: string } | null;
  applyFileAnswer(input: {
    target: FileChatTarget;
    text: string;
    messages: FileChatUIMessage[];
  }): Result<AppliedFileAnswer>;
};

function storageKey(scenario: ScreenScenario): string {
  return `ai4good.discovery.fixture.v1.${scenario}`;
}

function isState(value: unknown): value is DiscoveryState {
  if (value === null || typeof value !== "object") return false;
  const state = value as DiscoveryState;
  return (
    typeof state.brief?.revision === "number" &&
    Array.isArray(state.transcript) &&
    Array.isArray(state.files) &&
    typeof state.usage?.allocationMicros === "number" &&
    typeof state.project?.title === "string" &&
    state.fileChats !== null &&
    typeof state.fileChats === "object" &&
    !Array.isArray(state.fileChats)
  );
}

function loadStored(scenario: ScreenScenario): DiscoveryState | null {
  try {
    const raw = localStorage.getItem(storageKey(scenario));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function refusal(kind: string, reason: string): Result<never> {
  return { ok: false, refusal: { kind, reason } };
}

export function allRequiredAgreed(brief: BriefSnapshot): boolean {
  const required = brief.topics.filter((topic) => topic.required);
  return required.length > 0 && required.every((topic) => topicSettled(topic));
}

/** A changed answer reopens these topics when they already have an answer. */
const DEPENDENTS: Record<string, readonly string[]> = {
  priority: ["measure"],
  booking: ["rules"],
  owner: ["info"],
};

function hasAnswer(topic: BriefTopic): boolean {
  return topic.state.kind === "agreed" || topic.state.kind === "not-sure";
}

function markDependents(brief: BriefSnapshot, topicId: string) {
  for (const id of DEPENDENTS[topicId] ?? []) {
    const topic = brief.topics.find((item) => item.id === id);
    if (!topic || !hasAnswer(topic)) continue;
    topic.needsReview = true;
  }
}

function replyText(request: DiscoveryRequestBody, certain: string[], uncertain: boolean): string {
  if (request.mode === "ask") return "The open questions stay in the chat. Answer them when you are ready.";
  if (certain.length > 0 && uncertain) {
    return `I added this to your brief: ${certain.join(", ")}. One answer stays open. I will not invent it.`;
  }
  if (certain.length > 0) return `I added this to your brief: ${certain.join(", ")}.`;
  if (uncertain) return "That stays open in your brief. I will not invent an answer.";
  return "I read your note. The open questions stay in the chat.";
}

function charge(usage: DiscoveryUsage): { usage: DiscoveryUsage; charge: DiscoveryUIMessage["parts"][number] } | null {
  const kind = replyKind(usage);
  if (kind === "unavailable") return null;
  const next = { ...usage };
  if (kind === "free") {
    next.dailyLeft -= 1;
    next.betaLeft -= 1;
  } else {
    next.availableMicros -= next.holdMicros;
    next.settledMicros += next.holdMicros;
  }
  next.nextReply = replyKind(next);
  const part: DiscoveryUIMessage["parts"][number] =
    kind === "paid"
      ? { type: "data-charge", data: { kind: "paid", usageMicros: usage.holdMicros, feeMicros: 0 } }
      : { type: "data-charge", data: { kind: "free" } };
  return { usage: next, charge: part };
}

export function openFixtureWorld(scenario: ScreenScenario, pace: Pace = "test"): FixtureWorld {
  // The seed itself is not stored, so a code change reseeds until the NGO sends.
  let state = loadStored(scenario) ?? seedState(scenario);
  const listeners = new Set<(change: ServerChange) => void>();

  function notify(change: ServerChange) {
    const snapshot = structuredClone(change);
    for (const listener of listeners) listener(snapshot);
  }

  function commit(next: DiscoveryState) {
    state = next;
    try {
      localStorage.setItem(storageKey(scenario), JSON.stringify(state));
    } catch {
      // A private window can refuse storage. The in-memory world still answers.
    }
    notify({ files: state.files, brief: state.brief, usage: state.usage });
  }

  function stale(): Result<never> {
    notify({ brief: state.brief });
    return refusal("stale-revision", STALE);
  }

  const world: FixtureWorld = {
    async load() {
      return { ok: true, value: structuredClone(state) };
    },
    read() {
      return structuredClone(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    applyTurn({ messages, request }) {
      if (state.confirmation) return refusal("finished", TEXT.finishedClosed);
      if (allRequiredAgreed(state.brief) && request.answers.length === 0) {
        return refusal("discovery-ready", TEXT.readyInvite);
      }
      const charged = charge(state.usage);
      if (!charged) {
        return refusal(
          state.usage.betaLeft > 0 ? "daily-limit" : "beta-limit",
          state.usage.betaLeft > 0
            ? "Today's free replies are used and the project has no fuel for Discovery."
            : "All beta free replies are used and the project has no fuel for Discovery.",
        );
      }
      const user = messages[messages.length - 1];
      const answerMessageId = user?.role === "user" ? user.id : null;
      const round = messages.filter((message) => message.role === "assistant").length + 1;
      let brief = state.brief;
      const certain: { id: string; title: string; text: string }[] = [];
      let uncertain = false;
      let changed = false;
      if (request.mode === "answer") {
        const topics = brief.topics.map((topic) => {
          const answer = request.answers.find((item) => {
            const question = brief.questions.find((entry) => entry.id === item.questionId);
            return question?.topicId === topic.id;
          });
          if (!answer) return topic;
          const question = brief.questions.find((entry) => entry.id === answer.questionId);
          if (!question) return topic;
          changed = true;
          if (answer.certain) {
            certain.push({ id: topic.id, title: topic.title, text: answer.text });
            return {
              ...topic,
              needsReview: false,
              state: {
                kind: "agreed" as const,
                answer: answer.text,
                source: { kind: "chat" as const, round },
                answerMessageId,
              },
            };
          }
          uncertain = true;
          return {
            ...topic,
            needsReview: false,
            state: { kind: "not-sure" as const, questionId: question.id, help: question.uncertaintyHelp },
          };
        });
        if (changed) brief = { ...brief, revision: brief.revision + 1, topics };
      }
      const added = request.mode === "answer" ? nextOpenQuestions(brief, round) : [];
      if (added.length > 0) {
        brief = {
          ...brief,
          questions: [...brief.questions, ...added],
          revision: changed ? brief.revision : brief.revision + 1,
        };
      }
      const stillOpen = brief.topics.some((topic) => topic.state.kind === "open" || topic.needsReview === true);
      let replyBody = replyText(
        request,
        certain.map((item) => item.text),
        uncertain,
      );
      if (request.mode === "answer" && added.length > 0) {
        replyBody = `${replyBody} ${added.map((question) => question.text).join(" ")}`;
      }
      if (allRequiredAgreed(brief)) {
        replyBody = `${replyBody} ${TEXT.readyReply}`;
      } else if (request.mode === "answer" && !stillOpen) {
        replyBody = `${replyBody} Nothing is left to ask. Select Finish Discovery.`;
      }
      const report = pendingReports(messages);
      const reply = report.length > 0 ? `${report}\n\n${replyBody}` : replyBody;
      const assistantId = `reply-${messages.length}`;
      const parts: DiscoveryUIMessage["parts"] = [
        { type: "text", text: reply },
        ...(certain.length > 0
          ? [{ type: "data-filed" as const, data: { topics: certain.map((item) => ({ id: item.id, title: item.title })) } }]
          : []),
        charged.charge,
        ...brief.questions
          .filter((question) => {
            const topic = brief.topics.find((item) => item.id === question.topicId);
            return topic !== undefined && topic.state.kind !== "agreed";
          })
          .map(questionPart),
      ];
      const assistant: DiscoveryUIMessage = { id: assistantId, role: "assistant", parts };
      const next: DiscoveryState = {
        ...state,
        brief,
        usage: charged.usage,
        transcript: [...structuredClone(messages), assistant],
      };
      commit(next);
      return {
        ok: true,
        value: {
          assistantId,
          reply,
          parts,
          brief: structuredClone(next.brief),
          usage: structuredClone(next.usage),
        },
      };
    },
    async saveBriefEdit(input) {
      if (input.baseRevision !== state.brief.revision) return stale();
      const next = structuredClone(state);
      const revision = next.brief.revision + 1;
      const source = { kind: "edit" as const, revision };
      let changed = false;
      if (input.sectionId === "need") {
        changed = next.brief.need.text !== input.text;
        next.brief.need = { text: input.text, source };
      } else if (input.sectionId === "usersToday") {
        changed = next.brief.usersToday?.text !== input.text;
        next.brief.usersToday = { text: input.text, source };
      } else if (input.sectionId === "successMeasure") {
        changed = next.brief.successMeasure?.text !== input.text;
        next.brief.successMeasure = { text: input.text, source };
      } else {
        const topic = next.brief.topics.find((item) => item.id === input.sectionId);
        if (!topic) return refusal("unknown-section", "That part of the brief cannot be edited.");
        const previous = topic.state.kind === "agreed" ? topic.state.answer : null;
        changed = previous !== input.text || topic.needsReview === true || topic.state.kind !== "agreed";
        topic.needsReview = false;
        if (input.text === NAME.notSure) {
          const question = next.brief.questions.find((item) => item.topicId === topic.id);
          topic.state = {
            kind: "not-sure",
            questionId: question?.id ?? topic.id,
            help: question?.uncertaintyHelp ?? "",
          };
        } else {
          topic.state = { kind: "agreed", answer: input.text, source, answerMessageId: null };
        }
        if (changed) markDependents(next.brief, topic.id);
      }
      if (!changed) return { ok: true, value: structuredClone(state.brief) };
      next.brief.revision = revision;
      // A real change drops the earlier approval. Opening Edit and going back does not.
      next.confirmation = null;
      commit(next);
      return { ok: true, value: structuredClone(next.brief) };
    },
    async askTopic(input) {
      if (state.confirmation) return refusal("finished", TEXT.finishedClosed);
      const topic = state.brief.topics.find((item) => item.id === input.topicId);
      if (!topic) return refusal("unknown-topic", "That topic is not in the brief.");
      if (state.brief.questions.some((question) => question.topicId === topic.id)) {
        return { ok: true, value: structuredClone(state.brief) };
      }
      const round = state.transcript.filter((message) => message.role === "assistant").length;
      const next = structuredClone(state);
      next.brief.questions.push(questionForTopic(topic, Math.max(round, 1)));
      next.brief.revision += 1;
      commit(next);
      return { ok: true, value: structuredClone(next.brief) };
    },
    async acceptSuggestion(input) {
      if (input.baseRevision !== state.brief.revision) return stale();
      const next = structuredClone(state);
      const topic = next.brief.topics.find((item) => item.id === input.topicId);
      if (!topic || topic.suggestion === null) {
        return refusal("no-suggestion", "This topic has no suggestion to accept.");
      }
      topic.needsReview = false;
      topic.state = {
        kind: "agreed",
        answer: topic.suggestion,
        source: { kind: "accepted-suggestion" },
        answerMessageId: null,
      };
      next.brief.revision += 1;
      commit(next);
      return { ok: true, value: structuredClone(next.brief) };
    },
    async removeCauseLabel(input) {
      if (input.baseRevision !== state.brief.revision) return stale();
      if (!state.brief.causeLabels.includes(input.label)) {
        return { ok: true, value: structuredClone(state.brief) };
      }
      const next = structuredClone(state);
      next.brief.causeLabels = next.brief.causeLabels.filter((label) => label !== input.label);
      next.brief.revision += 1;
      commit(next);
      return { ok: true, value: structuredClone(next.brief) };
    },
    async finish(input) {
      if (state.confirmation && state.confirmation.revision === input.revision) {
        return { ok: true, value: structuredClone(state.confirmation) };
      }
      if (input.revision !== state.brief.revision) return stale();
      const open = state.brief.topics.filter((topic) => !topicSettled(topic));
      if (open.length > 0 && !input.acks.openGaps) {
        return refusal("open-gaps", "Open questions stay in the brief unless you accept them.");
      }
      const confirmation: Confirmation = {
        revision: input.revision,
        approver: "Sam Taylor",
        at: new Date().toISOString(),
        acceptedGaps: open.map((topic) => ({
          topicId: topic.id,
          title: topic.title,
          importance: topic.importance,
          reason: topic.why,
        })),
      };
      commit({ ...state, confirmation });
      return { ok: true, value: structuredClone(confirmation) };
    },
    fileBlock,
    applyFileAnswer,
  };

  // The read stays in the world, so closing the panel does not stop it.
  // Test steps stay long enough for the screen host to read "Reading… N%".
  // Demo steps match the board: 1200 ms to 35%, 1000 ms to the question, 1200 ms to 70%, 2400 ms to ready.
  const delay =
    pace === "test"
      ? { to35: 400, pause: 400, to70: 400, ready: 2200 }
      : { to35: 1200, pause: 1000, to70: 1200, ready: 2400 };
  const timers = new Map<string, number[]>();

  function clearTimers(fileId: string) {
    const pending = timers.get(fileId);
    if (!pending) return;
    for (const handle of pending) window.clearTimeout(handle);
    timers.delete(fileId);
  }

  function later(fileId: string, ms: number, run: () => void) {
    const handle = window.setTimeout(run, ms);
    const pending = timers.get(fileId) ?? [];
    pending.push(handle);
    timers.set(fileId, pending);
  }

  function discoveryFile(snapshot: DiscoveryState, fileId: string) {
    const file = snapshot.files.find((item) => item.id === fileId && item.origin === "discovery");
    return file && file.origin === "discovery" ? file : null;
  }

  function setReadingPercent(fileId: string, percent: number): boolean {
    const next = structuredClone(state);
    const file = discoveryFile(next, fileId);
    if (!file || file.status.kind !== "reading") return false;
    file.status = { kind: "reading", percent };
    commit(next);
    return true;
  }

  function pauseRead(fileId: string) {
    const next = structuredClone(state);
    const file = discoveryFile(next, fileId);
    if (!file || file.status.kind !== "reading") return;
    const pause = scriptForName(file.name).pause;
    if (!pause) return;
    const percent = file.status.percent;
    file.status = { kind: "waiting", percent, question: { text: pause.text, chips: [...pause.chips] } };
    const chat = next.fileChats[fileId] ?? [];
    const asked = chat.some((message) => message.parts.some((part) => part.type === "text" && part.text === pause.text));
    if (!asked) {
      next.fileChats[fileId] = [
        ...chat,
        { id: `ask-${fileId}`, role: "assistant", parts: [{ type: "text", text: pause.text }] },
      ];
    }
    commit(next);
  }

  function finishRead(fileId: string) {
    const next = structuredClone(state);
    const file = discoveryFile(next, fileId);
    if (!file || file.status.kind !== "reading") return;
    const script = scriptForName(file.name);
    file.status = { kind: "ready", facts: script.facts };
    file.tookFromIt = script.fact;
    const suggestionId = `file-${fileId}`;
    if (!next.brief.suggestions.some((item) => item.id === suggestionId)) {
      next.brief.suggestions = [
        ...next.brief.suggestions,
        { id: suggestionId, topicId: "info", fileId, fileName: file.name, fact: script.fact },
      ];
    }
    next.brief.revision += 1;
    const done = TEXT.fileDone(script.facts);
    const chat = next.fileChats[fileId] ?? [];
    const told = chat.some((message) => message.parts.some((part) => part.type === "text" && part.text === done));
    if (!told) {
      next.fileChats[fileId] = [
        ...chat,
        { id: `done-${fileId}`, role: "assistant", parts: [{ type: "text", text: done }] },
      ];
    }
    commit(next);
  }

  function scheduleRead(fileId: string, from: number) {
    clearTimers(fileId);
    const file = discoveryFile(state, fileId);
    if (!file) return;
    const script = scriptForName(file.name);
    if (from < 35) {
      later(fileId, delay.to35, () => {
        if (!setReadingPercent(fileId, 35)) return;
        if (script.pause) later(fileId, delay.pause, () => pauseRead(fileId));
        else scheduleRead(fileId, 35);
      });
      return;
    }
    later(fileId, delay.to70, () => {
      setReadingPercent(fileId, 70);
    });
    later(fileId, delay.ready, () => {
      finishRead(fileId);
    });
  }

  function pendingReports(messages: DiscoveryUIMessage[]): string {
    const shown = messages
      .flatMap((message) => message.parts.filter((part) => part.type === "text").map((part) => part.text))
      .join("\n");
    const lines: string[] = [];
    for (const file of state.files) {
      if (file.origin !== "discovery" || file.status.kind !== "ready" || file.tookFromIt === null) continue;
      if (shown.includes(file.tookFromIt)) continue;
      lines.push(scriptForName(file.name).report);
    }
    return lines.join("\n\n");
  }

  function fileBlock(target: FileChatTarget): { kind: string; reason: string } | null {
    if (target.kind === "new") {
      const discoveryCount = state.files.filter((file) => file.origin === "discovery").length;
      if (!state.project.funded && discoveryCount >= 3) return { kind: "file-limit", reason: TEXT.fileLimit };
      if (state.files.some((file) => file.origin === "discovery" && file.name === target.file.name)) {
        return { kind: "duplicate-file", reason: TEXT.fileDuplicate };
      }
      return null;
    }
    const file = state.files.find((item) => item.id === target.fileId && item.origin === "discovery");
    if (!file || file.origin !== "discovery" || file.status.kind !== "waiting") {
      return { kind: "not-waiting", reason: "This file is not waiting for an answer." };
    }
    return null;
  }

  function unavailable(): Result<never> {
    return refusal(
      state.usage.betaLeft > 0 ? "daily-limit" : "beta-limit",
      state.usage.betaLeft > 0
        ? "Today's free replies are used and the project has no fuel for Discovery."
        : "All beta free replies are used and the project has no fuel for Discovery.",
    );
  }

  function applyFileAnswer(input: {
    target: FileChatTarget;
    text: string;
    messages: FileChatUIMessage[];
  }): Result<AppliedFileAnswer> {
    if (state.confirmation) return refusal("finished", TEXT.finishedClosed);
    const blocked = fileBlock(input.target);
    if (blocked) return refusal(blocked.kind, blocked.reason);
    const charged = charge(state.usage);
    if (!charged || charged.charge.type !== "data-charge") return unavailable();
    const next = structuredClone(state);
    next.usage = charged.usage;
    let fileId: string;
    let reply: string;
    let from = 5;
    const startedRead = input.target.kind === "new";
    if (input.target.kind === "new") {
      fileId = nextFileId(input.target.file.name, next.files.map((item) => item.id));
      next.files = [
        ...next.files,
        {
          origin: "discovery",
          id: fileId,
          name: input.target.file.name,
          sizeBytes: input.target.file.size,
          status: { kind: "reading", percent: 5 },
          tookFromIt: null,
        },
      ];
      reply = TEXT.fileReadingReply;
    } else {
      fileId = input.target.fileId;
      const file = discoveryFile(next, fileId);
      if (!file || file.status.kind !== "waiting") return refusal("not-waiting", "This file is not waiting for an answer.");
      from = file.status.percent;
      file.status = { kind: "reading", percent: from };
      reply = TEXT.fileResumeReply;
    }
    const assistantId = `file-reply-${fileId}-${input.messages.length}`;
    const assistant: FileChatUIMessage = {
      id: assistantId,
      role: "assistant",
      parts: [
        { type: "text", text: reply },
        charged.charge,
      ],
    };
    next.fileChats[fileId] = [...structuredClone(input.messages), assistant];
    commit(next);
    scheduleRead(fileId, from);
    const saved = discoveryFile(state, fileId);
    if (!saved) return refusal("send-failed", "The reply did not finish.");
    return {
      ok: true,
      value: {
        fileId,
        assistantId,
        reply,
        charge: charged.charge,
        usage: structuredClone(state.usage),
        status: structuredClone(saved.status),
        startedRead,
      },
    };
  }

  for (const file of state.files) {
    if (file.origin === "discovery" && file.status.kind === "reading") scheduleRead(file.id, file.status.percent);
  }

  return world;
}
