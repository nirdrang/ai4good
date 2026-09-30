import type { ChatTransport, UIMessageChunk } from "ai";
import type {
  DiscoveryRequestBody,
  DiscoveryUIMessage,
  FileChatUIMessage,
} from "../../../src/lib/discovery-stream";
import { TEXT } from "../../../src/components/discovery/a11y";
import type { FileChatTarget } from "../../../src/components/discovery/port";
import { allRequiredAgreed, type AppliedFileAnswer, type AppliedTurn, type FixtureWorld } from "./fixture-world";
import { MODEL_CALL_PROBE, type ModelCall, type Pace } from "./givens";

function refusalError(kind: string, reason: string): Error {
  return new Error(JSON.stringify({ kind, reason }));
}

function requestOf(body: unknown): DiscoveryRequestBody {
  if (body === null || typeof body !== "object") {
    throw refusalError("invalid-request", "The reply needs a project.");
  }
  const value = body as Partial<DiscoveryRequestBody>;
  if (typeof value.organizationId !== "string" || value.organizationId.length === 0) {
    throw refusalError("invalid-request", "The reply needs a project.");
  }
  if (typeof value.projectId !== "string" || value.projectId.length === 0) {
    throw refusalError("invalid-request", "The reply needs a project.");
  }
  if (value.mode !== "answer" && value.mode !== "ask") {
    throw refusalError("invalid-request", "The reply needs a project.");
  }
  if (typeof value.message !== "string" || !Array.isArray(value.answers)) {
    throw refusalError("invalid-request", "The reply needs a project.");
  }
  for (const answer of value.answers) {
    if (
      answer === null ||
      typeof answer !== "object" ||
      typeof answer.questionId !== "string" ||
      typeof answer.choice !== "string" ||
      typeof answer.text !== "string" ||
      typeof answer.certain !== "boolean"
    ) {
      throw refusalError("invalid-request", "The reply needs a project.");
    }
  }
  return {
    organizationId: value.organizationId,
    projectId: value.projectId,
    message: value.message,
    mode: value.mode,
    answers: value.answers,
  };
}

async function reportModelCall(kind: ModelCall): Promise<void> {
  const probe = (globalThis as Record<string, unknown>)[MODEL_CALL_PROBE];
  if (typeof probe === "function") await probe(kind);
}

function pause(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function textPieces(reply: string, pace: Pace): string[] {
  return pace === "demo" ? reply.split(/(?<= )/) : [reply];
}

function streamTurn(
  pace: Pace,
  signal: AbortSignal | undefined,
  turn: AppliedTurn,
): ReadableStream<UIMessageChunk> {
  const pieces = textPieces(turn.reply, pace);
  const tail = turn.parts.filter((part) => part.type !== "text");
  return new ReadableStream<UIMessageChunk>({
    async start(controller) {
      const send = (chunk: UIMessageChunk) => controller.enqueue(chunk);
      send({ type: "start", messageId: turn.assistantId });
      send({ type: "text-start", id: "reply" });
      for (const piece of pieces) {
        if (signal?.aborted) {
          send({ type: "abort" });
          controller.close();
          return;
        }
        send({ type: "text-delta", id: "reply", delta: piece });
        if (pace === "demo") await pause(35, signal);
      }
      send({ type: "text-end", id: "reply" });
      for (const part of tail) {
        if (
          part.type === "data-question" ||
          part.type === "data-filed" ||
          part.type === "data-charge" ||
          part.type === "data-ready"
        ) {
          send({ type: part.type, data: part.data });
        }
      }
      send({ type: "data-brief", data: turn.brief, transient: true });
      send({ type: "data-usage", data: turn.usage, transient: true });
      send({ type: "finish" });
      controller.close();
    },
  });
}

export type ProjectScope = Pick<DiscoveryRequestBody, "organizationId" | "projectId">;

export class FixtureChatTransport implements ChatTransport<DiscoveryUIMessage> {
  constructor(
    private readonly world: FixtureWorld,
    private readonly pace: Pace,
    private readonly scope: ProjectScope,
  ) {}

  async sendMessages(
    options: Parameters<ChatTransport<DiscoveryUIMessage>["sendMessages"]>[0],
  ): Promise<ReadableStream<UIMessageChunk>> {
    const request = requestOf({ ...(options.body as object | undefined), ...this.scope });
    const current = this.world.read();
    if (allRequiredAgreed(current.brief) && request.answers.length === 0) {
      throw refusalError("discovery-ready", TEXT.readyInvite);
    }
    if (current.usage.nextReply === "unavailable") {
      throw refusalError(
        current.usage.betaLeft > 0 ? "daily-limit" : "beta-limit",
        current.usage.betaLeft > 0
          ? "Today's free replies are used and the project has no fuel for Discovery."
          : "All beta free replies are used and the project has no fuel for Discovery.",
      );
    }
    await reportModelCall("chat-turn");
    await pause(this.pace === "demo" ? 650 : 20, options.abortSignal);
    if (options.abortSignal?.aborted) throw new DOMException("The request was stopped.", "AbortError");
    const turned = this.world.applyTurn({ messages: options.messages, request });
    if (!turned.ok) throw refusalError(turned.refusal.kind, turned.refusal.reason);
    return streamTurn(this.pace, options.abortSignal, turned.value);
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}

function scopeOf(body: unknown): ProjectScope {
  if (body === null || typeof body !== "object") {
    throw refusalError("invalid-request", "The reply needs a project.");
  }
  const value = body as Partial<ProjectScope>;
  if (typeof value.organizationId !== "string" || value.organizationId.length === 0) {
    throw refusalError("invalid-request", "The reply needs a project.");
  }
  if (typeof value.projectId !== "string" || value.projectId.length === 0) {
    throw refusalError("invalid-request", "The reply needs a project.");
  }
  return { organizationId: value.organizationId, projectId: value.projectId };
}

function lastUserText(messages: readonly FileChatUIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== "user") continue;
    return message.parts
      .flatMap((part) => (part.type === "text" ? [part.text] : []))
      .join("\n")
      .trim();
  }
  return "";
}

function streamFileAnswer(
  signal: AbortSignal | undefined,
  answer: AppliedFileAnswer,
): ReadableStream<UIMessageChunk> {
  return new ReadableStream<UIMessageChunk>({
    start(controller) {
      const send = (chunk: UIMessageChunk) => controller.enqueue(chunk);
      send({ type: "start", messageId: answer.assistantId });
      send({ type: "text-start", id: "reply" });
      if (signal?.aborted) {
        send({ type: "abort" });
        controller.close();
        return;
      }
      send({ type: "text-delta", id: "reply", delta: answer.reply });
      send({ type: "text-end", id: "reply" });
      send({ type: "data-charge", data: answer.charge.data });
      send({ type: "data-status", data: answer.status, transient: true });
      send({ type: "data-usage", data: answer.usage, transient: true });
      send({ type: "finish" });
      controller.close();
    },
  });
}

export class FixtureFileChatTransport implements ChatTransport<FileChatUIMessage> {
  private resolvedId: string | null;

  constructor(
    private readonly world: FixtureWorld,
    private readonly target: FileChatTarget,
    private readonly pace: Pace,
    private readonly scope: ProjectScope,
  ) {
    this.resolvedId = target.kind === "existing" ? target.fileId : null;
  }

  async sendMessages(
    options: Parameters<ChatTransport<FileChatUIMessage>["sendMessages"]>[0],
  ): Promise<ReadableStream<UIMessageChunk>> {
    if (options.abortSignal?.aborted) throw new DOMException("The request was stopped.", "AbortError");
    scopeOf({ ...(options.body as object | undefined), ...this.scope });
    const current = this.world.read();
    if (current.usage.nextReply === "unavailable") {
      throw refusalError(
        current.usage.betaLeft > 0 ? "daily-limit" : "beta-limit",
        current.usage.betaLeft > 0
          ? "Today's free replies are used and the project has no fuel for Discovery."
          : "All beta free replies are used and the project has no fuel for Discovery.",
      );
    }
    const target: FileChatTarget = this.resolvedId
      ? { kind: "existing", fileId: this.resolvedId }
      : this.target;
    const blocked = this.world.fileBlock(target);
    // A limit, a duplicate, or a file that is not waiting is a refusal, not a model call.
    if (blocked) throw refusalError(blocked.kind, blocked.reason);
    const text = lastUserText(options.messages);
    if (text.length === 0) throw refusalError("empty-answer", "The file chat needs an answer.");
    await reportModelCall("file-chat-turn");
    await pause(this.pace === "demo" ? 650 : 20, options.abortSignal);
    if (options.abortSignal?.aborted) throw new DOMException("The request was stopped.", "AbortError");
    const turned = this.world.applyFileAnswer({ target, text, messages: options.messages });
    if (!turned.ok) throw refusalError(turned.refusal.kind, turned.refusal.reason);
    this.resolvedId = turned.value.fileId;
    if (turned.value.startedRead) await reportModelCall("file-read");
    return streamFileAnswer(options.abortSignal, turned.value);
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}
