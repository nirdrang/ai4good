import { TEXT } from "../../../src/components/discovery/a11y";
import type {
  BriefSnapshot,
  Confirmation,
  DiscoveryRequestBody,
  DiscoveryState,
  DiscoveryUIMessage,
  DiscoveryUsage,
} from "../../../src/lib/discovery-stream";
import type { FileChatTarget, Result, ServerChange } from "../../../src/components/discovery/port";
import { questionPart, replyKind, seedState } from "./fixture-data";
import type { ScreenScenario } from "./givens";

const STALE = "The brief changed. Review the latest revision.";

export type AppliedTurn = {
  assistantId: string;
  reply: string;
  parts: DiscoveryUIMessage["parts"];
  brief: BriefSnapshot;
  usage: DiscoveryUsage;
};

export type FixtureWorld = {
  load(): Promise<Result<DiscoveryState>>;
  read(): DiscoveryState;
  subscribe(listener: (change: ServerChange) => void): () => void;
  applyTurn(input: { messages: DiscoveryUIMessage[]; request: DiscoveryRequestBody }): Result<AppliedTurn>;
  saveBriefEdit(input: { sectionId: string; text: string; baseRevision: number }): Promise<Result<BriefSnapshot>>;
  acceptSuggestion(input: { topicId: string; baseRevision: number }): Promise<Result<BriefSnapshot>>;
  removeCauseLabel(input: { label: string; baseRevision: number }): Promise<Result<BriefSnapshot>>;
  finish(input: { revision: number; acks: { reviewed: true; openGaps: boolean; data: true } }): Promise<Result<Confirmation>>;
  fileLimit(target: FileChatTarget): { kind: string; reason: string } | null;
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
    typeof state.project?.title === "string"
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
  if (next.dailyLeft > 0) next.dailyLeft -= 1;
  else if (next.betaLeft > 0) next.betaLeft -= 1;
  else {
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

export function openFixtureWorld(scenario: ScreenScenario): FixtureWorld {
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

  return {
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
      if (request.mode === "answer") {
        let changed = false;
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
            state: { kind: "not-sure" as const, questionId: question.id, help: question.uncertaintyHelp },
          };
        });
        if (changed) brief = { ...brief, revision: brief.revision + 1, topics };
      }
      const reply = replyText(
        request,
        certain.map((item) => item.text),
        uncertain,
      );
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
      if (input.sectionId === "need") next.brief.need = { text: input.text, source };
      else if (input.sectionId === "usersToday") next.brief.usersToday = { text: input.text, source };
      else if (input.sectionId === "successMeasure") next.brief.successMeasure = { text: input.text, source };
      else {
        const topic = next.brief.topics.find((item) => item.id === input.sectionId);
        if (!topic) return refusal("unknown-section", "That part of the brief cannot be edited.");
        topic.state = { kind: "agreed", answer: input.text, source, answerMessageId: null };
      }
      next.brief.revision = revision;
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
      const open = state.brief.topics.filter((topic) => topic.state.kind !== "agreed");
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
    fileLimit(target) {
      if (target.kind !== "new") return null;
      const discoveryCount = state.files.filter((file) => file.origin === "discovery").length;
      if (!state.project.funded && discoveryCount >= 3) return { kind: "file-limit", reason: TEXT.fileLimit };
      return null;
    },
  };
}
