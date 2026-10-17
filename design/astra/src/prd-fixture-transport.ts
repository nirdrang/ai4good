import type { ChatTransport, UIMessageChunk } from "ai";
import {
  parseSendBody,
  scopeKey,
  type ChatScope,
  type PrdRefusal,
  type PrdSendBody,
  type PrdUIMessage,
  type Viewer,
} from "../../../src/lib/prd-stream";
import type { PrdWorld, SendReceipt } from "./prd-fixture-world";

function refusalError(refusal: PrdRefusal): Error {
  return new Error(JSON.stringify(refusal));
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

function lastUserMessageId(messages: readonly PrdUIMessage[]): string | null {
  const last = messages.length > 0 ? messages[messages.length - 1] : undefined;
  return last?.role === "user" ? last.id : null;
}

function replyStream(
  world: PrdWorld,
  viewer: Viewer,
  receipt: SendReceipt,
  signal: AbortSignal | undefined,
): ReadableStream<UIMessageChunk> {
  const demo = world.pace === "demo" && !receipt.replay;
  return new ReadableStream<UIMessageChunk>({
    async start(controller) {
      const send = (chunk: UIMessageChunk) => controller.enqueue(chunk);
      send({ type: "start", messageId: receipt.messageId, messageMetadata: receipt.metadata });
      let message: PrdUIMessage;
      try {
        message = await receipt.done;
      } catch (error) {
        send({
          type: "error",
          errorText: JSON.stringify({ kind: "invalid", reason: String(error) }),
        });
        controller.close();
        return;
      }
      for (const [index, part] of message.parts.entries()) {
        if (part.type === "text") {
          const id = `${message.id}-${index}`;
          send({ type: "text-start", id });
          for (const piece of demo ? part.text.split(/(?<= )/) : [part.text]) {
            send({ type: "text-delta", id, delta: piece });
            if (demo) await pause(35, signal);
          }
          send({ type: "text-end", id });
        } else if (part.type.startsWith("data-")) {
          send({ type: part.type as `data-${string}`, data: "data" in part ? part.data : null });
        }
      }
      send({ type: "data-snapshot", data: world.snapshot(viewer), transient: true });
      send({ type: "finish" });
      controller.close();
    },
  });
}

/** One conversation's transport. The send body is a `PrdSendBody`; a refusal is thrown as JSON `{ kind, reason }`. */
export class PrdFixtureTransport implements ChatTransport<PrdUIMessage> {
  constructor(
    private readonly world: PrdWorld,
    private readonly viewer: Viewer,
    private readonly scope: ChatScope,
  ) {}

  async sendMessages(
    options: Parameters<ChatTransport<PrdUIMessage>["sendMessages"]>[0],
  ): Promise<ReadableStream<UIMessageChunk>> {
    let body: PrdSendBody;
    try {
      body = parseSendBody(options.body);
    } catch {
      throw refusalError({ kind: "invalid", reason: "The message could not be read." });
    }
    if (scopeKey(body.scope) !== scopeKey(this.scope)) {
      throw refusalError({ kind: "invalid", reason: "This message belongs to another chat." });
    }
    const sent = await this.world.send(this.viewer, body, lastUserMessageId(options.messages));
    if (!sent.ok) throw refusalError(sent.refusal);
    return replyStream(this.world, this.viewer, sent.value, options.abortSignal);
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}
