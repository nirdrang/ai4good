import type { ChatTransport, UIMessageChunk } from "ai";
import type {
  DiscoveryRefusal,
  DiscoveryRequestBody,
  DiscoveryUIMessage,
  DiscoveryUsage,
} from "../../../src/lib/discovery-stream";
import { completeReply, funding, refreshDay, type Answers, type MockState } from "./model";
import {
  briefReady,
  currentQuestions,
  discoveryProgress,
  questions,
  type Question,
} from "./questions";

// Stands in for the discovery-message edge function. It reads and writes the mock's saved
// state instead of the database, and streams the same UI message chunks the real route must
// stream. Everything above this transport is the real screen's chat code.

type Part = DiscoveryUIMessage["parts"][number];
type Round = MockState["history"][number];
export type FixtureBackend = { read: () => MockState; write: (next: MockState) => void };

const introText = "I have read your intake. Let's start with what matters most.";

export function questionPart(question: Question): Part {
  return {
    type: "data-question",
    data: {
      id: question.id,
      text: question.text,
      reason: question.reason,
      suggestions: question.options,
    },
  };
}

function findQuestion(
  state: MockState,
  match: (question: Question) => boolean,
): Question | undefined {
  return [...questions(state.answers), ...questions({})].find(match);
}

/** The parts that end a reply: what it filed, what it cost, and what the AI asks next. */
function roundParts(state: MockState, round: Round, nextQuestions: Question[] | "ready"): Part[] {
  const filed = Object.keys(round.answers).map((id) => ({
    id,
    title: findQuestion(state, (question) => question.id === id)?.title ?? id,
  }));
  const progress = discoveryProgress(state.answers);
  return [
    ...(filed.length ? [{ type: "data-filed", data: { topics: filed } } as Part] : []),
    {
      type: "data-charge",
      data:
        round.charge.kind === "free"
          ? { kind: "free" }
          : { kind: "paid", usageMicros: round.charge.usage, feeMicros: round.charge.fee },
    },
    ...(nextQuestions === "ready"
      ? [
          {
            type: "data-ready",
            data: { agreed: progress.completed, total: progress.total },
          } as Part,
        ]
      : nextQuestions.map(questionPart)),
  ];
}

function nextQuestionsOf(state: MockState): Question[] | "ready" {
  return briefReady(state.answers) ? "ready" : currentQuestions(state.answers);
}

export function usageOf(state: MockState): DiscoveryUsage {
  const mode = funding(state);
  return {
    dailyLeft: mode.dailyLeft,
    dailyGrant: 10,
    betaLeft: mode.betaLeft,
    betaGrant: 50,
    availableMicros: mode.available,
    reservedMicros: state.usage.reserved,
    nextReply: mode.free ? "free" : mode.canSend ? "paid" : "unavailable",
  };
}

function refusal(kind: string, reason: string): Error {
  const body: DiscoveryRefusal = { kind, reason };
  return new Error(JSON.stringify(body));
}

function pause(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export class FixtureChatTransport implements ChatTransport<DiscoveryUIMessage> {
  constructor(private readonly backend: FixtureBackend) {}

  async sendMessages({
    abortSignal,
    body,
  }: Parameters<ChatTransport<DiscoveryUIMessage>["sendMessages"]>[0]): Promise<
    ReadableStream<UIMessageChunk>
  > {
    const request = body as DiscoveryRequestBody;
    const before = refreshDay(this.backend.read());
    const mode = funding(before);
    if (!mode.canSend)
      throw mode.betaLeft > 0
        ? refusal(
            "daily-limit",
            "Today's free replies are used and the project has no fuel for Discovery.",
          )
        : refusal(
            "beta-limit",
            "All beta free replies are used and the project has no fuel for Discovery.",
          );
    await pause(650, abortSignal);
    if (abortSignal?.aborted) throw new DOMException("The request was stopped.", "AbortError");
    if (before.condition === "reply-fails") {
      this.backend.write({ ...before, condition: "normal" });
      throw new Error(
        "The reply did not finish. Your answers are saved. No turn or fuel was charged.",
      );
    }
    const submitted: Answers =
      request.mode === "ask"
        ? {}
        : Object.fromEntries(
            request.answers.map((answer) => [
              answer.questionId,
              { choice: answer.choice, text: answer.text, certain: answer.certain },
            ]),
          );
    const open = currentQuestions(before.answers)[0];
    const askedReply =
      request.mode === "ask" && open
        ? `${open.reason} You can answer in your own words or leave it open with "I'm not sure". I will keep this question open until you answer it.`
        : "";
    const after = completeReply(before, submitted, mode.free ? "free" : "paid", askedReply);
    if (after === before)
      throw refusal(
        "discovery-complete",
        "Discovery needs no more AI replies. Review the brief to finish.",
      );
    // Like the real route, the turn settles even if the NGO presses Stop mid-reply.
    this.backend.write(after);

    const round = after.history[after.history.length - 1];
    const words = round.reply.split(/(?<= )/);
    const tail: UIMessageChunk[] = [
      ...(roundParts(after, round, nextQuestionsOf(after)) as UIMessageChunk[]),
      { type: "data-usage", data: usageOf(after), transient: true },
    ];
    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        controller.enqueue({ type: "start" });
        controller.enqueue({ type: "text-start", id: "reply" });
        for (const word of words) {
          if (abortSignal?.aborted) return;
          controller.enqueue({ type: "text-delta", id: "reply", delta: word });
          await pause(35, abortSignal);
        }
        controller.enqueue({ type: "text-end", id: "reply" });
        tail.forEach((chunk) => controller.enqueue(chunk));
        controller.enqueue({ type: "finish" });
        controller.close();
      },
    });
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}

/** Rebuilds the transcript from saved state, as the real page does from the conversation read. */
export function messagesFromState(state: MockState): DiscoveryUIMessage[] {
  const byText = (texts: string[]) =>
    texts.flatMap((text) => {
      const question = findQuestion(state, (q) => q.text === text);
      return question ? [question] : [];
    });
  const messages: DiscoveryUIMessage[] = [
    {
      id: "intro",
      role: "assistant",
      parts: [
        { type: "text", text: introText },
        ...(state.history[0]
          ? byText(state.history[0].questions)
          : currentQuestions(state.answers).slice(0, 1)
        ).map(questionPart),
      ],
    },
  ];
  state.history.forEach((round, index) => {
    const userText = [...Object.values(round.answers).map((answer) => answer.text), round.note]
      .filter(Boolean)
      .join("\n\n");
    const next = state.history[index + 1];
    messages.push(
      { id: `${round.id}:user`, role: "user", parts: [{ type: "text", text: userText }] },
      {
        id: `${round.id}:assistant`,
        role: "assistant",
        parts: [
          { type: "text", text: round.reply },
          ...roundParts(state, round, next ? byText(next.questions) : nextQuestionsOf(state)),
        ],
      },
    );
  });
  return messages;
}
