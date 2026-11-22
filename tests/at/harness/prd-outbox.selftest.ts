import { describe, expect, it } from "vitest";
import {
  EMPTY_OUTBOX,
  finish,
  holds,
  offer,
  refuse,
  settle,
  start,
  take,
  type Outbox,
  type QueuedItem,
} from "../../../src/components/prd-workspace/outbox.ts";
import type { PrdIntent, PrdRefusal, QuestionId, RequestId } from "../../../src/lib/prd-stream.ts";

const RETENTION = "retention" as QuestionId;
const BUSY: PrdRefusal = { kind: "busy", reason: "The AI is still answering in this chat." };

function item(id: string, intent: PrdIntent, text = id): QueuedItem {
  return { id: id as RequestId, intent, text };
}

function text(id: string): QueuedItem {
  return item(id, { kind: "text", text: id });
}

function use(id: string): QueuedItem {
  return item(id, { kind: "use-answer", questionId: RETENTION, answer: null, note: "a note" });
}

function check(id: string): QueuedItem {
  return item(id, { kind: "close-check" });
}

function running(box: Outbox, queued: QueuedItem): Outbox {
  return start(offer(box, queued), queued.id);
}

describe("the PRD main-chat outbox", () => {
  it("starts the head only when the chat can send and nothing runs, in order", () => {
    let box = offer(offer(EMPTY_OUTBOX, text("first")), text("second"));
    expect(settle(box, false, 1)).toBeNull();
    expect(settle(box, true, 1)?.id).toBe("first");
    box = start(box, "first" as RequestId);
    expect(box.running?.id).toBe("first");
    expect(settle(box, true, 1)).toBeNull();
    expect(start(box, "second" as RequestId)).toBe(box);
    box = finish(box, "first" as RequestId).box;
    expect(settle(box, true, 2)?.id).toBe("second");
  });

  it("takes a queued message out, and a message that started stays where it is", () => {
    const box = offer(running(EMPTY_OUTBOX, text("first")), text("second"));
    expect(box.running?.id).toBe("first");
    const kept = take(box, "first");
    expect(kept.item).toBeNull();
    expect(kept.box).toBe(box);
    const taken = take(box, "second");
    expect(taken.item?.text).toBe("second");
    expect(taken.box.queue).toEqual([]);
  });

  it("puts a refused message back in an empty composer, or back at the head of the queue", () => {
    const box = offer(running(EMPTY_OUTBOX, text("first")), text("second"));
    const toComposer = refuse(box, "first" as RequestId, BUSY, 5, true);
    expect(toComposer.composer).toBe("first");
    expect(toComposer.box.running).toBeNull();
    expect(toComposer.box.queue.map((queued) => queued.id)).toEqual(["second"]);
    const toQueue = refuse(box, "first" as RequestId, BUSY, 5, false);
    expect(toQueue.composer).toBeNull();
    expect(toQueue.box.queue.map((queued) => queued.text)).toEqual(["first", "second"]);
  });

  it("retries a refused text with a fresh request id and then sends the next text", () => {
    const first = text("first");
    const second = text("second");
    const seen = new Set<RequestId>();
    const sent: RequestId[] = [];
    const delivered: string[] = [];
    function send(entry: QueuedItem): PrdRefusal | null {
      sent.push(entry.id);
      if (seen.has(entry.id)) return { kind: "invalid", reason: "This message was already sent." };
      seen.add(entry.id);
      if (sent.length === 1) return { kind: "invalid", reason: "The AI's reply was interrupted." };
      delivered.push(entry.text);
      return null;
    }

    let box = offer(offer(EMPTY_OUTBOX, first), second);
    box = start(box, first.id);
    const failure = send(first);
    expect(failure).not.toBeNull();
    box = refuse(box, first.id, failure!, 10, false).box;
    expect(settle(box, true, 10)).toBeNull();
    expect(settle(offer(box, text("third")), true, 10)?.text).toBe("first");
    for (const sequence of [11, 12]) {
      const head = settle(box, true, sequence)!;
      box = start(box, head.id);
      const refusal = send(head);
      box = refusal ? refuse(box, head.id, refusal, sequence, false).box : finish(box, head.id).box;
    }
    expect(sent).toEqual([first.id, expect.stringMatching(/^[0-9a-f-]{36}$/), second.id]);
    expect(delivered).toEqual(["first", "second"]);
    expect(settle(box, true, 13)).toBeNull();
  });

  it("reopens the review of a refused use, and clears the review drafts only when a use is accepted", () => {
    const box = running(EMPTY_OUTBOX, use("use"));
    const refused = refuse(box, "use" as RequestId, BUSY, 3, true);
    expect(refused.review).toBe(RETENTION);
    expect(refused.composer).toBeNull();
    expect(finish(box, "use" as RequestId).clearReview).toBe(RETENTION);
    expect(
      finish(running(EMPTY_OUTBOX, text("plain")), "plain" as RequestId).clearReview,
    ).toBeNull();
  });

  it("resumes a halted queue on the next newer snapshot without a new offer", () => {
    const box = offer(running(EMPTY_OUTBOX, text("first")), text("second"));
    const halted = refuse(box, "first" as RequestId, BUSY, 7, true).box;
    expect(settle(halted, true, 7)).toBeNull();
    expect(settle(halted, true, 8)?.id).toBe("second");
    expect(start(halted, "second" as RequestId).halted).toBeNull();
  });

  it("holds one Close PRD check and one use of an answer at a time, queued or running", () => {
    const queued = offer(EMPTY_OUTBOX, check("check-1"));
    expect(holds(queued, { kind: "close-check" })).toBe(true);
    expect(offer(queued, check("check-2")).queue.map((entry) => entry.id)).toEqual(["check-1"]);
    const started = start(queued, "check-1" as RequestId);
    expect(offer(started, check("check-3")).queue).toEqual([]);
    const using = running(EMPTY_OUTBOX, use("use-1"));
    expect(holds(using, use("use-2").intent)).toBe(true);
    expect(offer(using, use("use-2")).queue).toEqual([]);
    expect(offer(using, text("hello")).queue.map((entry) => entry.id)).toEqual(["hello"]);
    expect(holds(using, { kind: "text", text: "hello" })).toBe(false);
  });
});
