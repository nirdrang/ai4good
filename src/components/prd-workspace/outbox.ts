import type { PrdIntent, PrdRefusal, QuestionId, RequestId } from "@/lib/prd-stream";

export type QueuedItem = Readonly<{ id: RequestId; intent: PrdIntent; text: string }>;

export type Outbox = Readonly<{
  running: QueuedItem | null;
  queue: readonly QueuedItem[];
  halted: Readonly<{ refusal: PrdRefusal; sequence: number }> | null;
}>;

export const EMPTY_OUTBOX: Outbox = { running: null, queue: [], halted: null };

function sameWork(left: PrdIntent, right: PrdIntent): boolean {
  if (left.kind === "close-check") return right.kind === "close-check";
  if (left.kind === "use-answer") {
    return right.kind === "use-answer" && right.questionId === left.questionId;
  }
  return false;
}

export function holds(box: Outbox, intent: PrdIntent): boolean {
  const items = box.running ? [box.running, ...box.queue] : box.queue;
  return items.some((item) => sameWork(item.intent, intent));
}

/** Adds a message at the end of the queue and lifts a halt. Work the outbox already holds is not added twice. */
export function offer(box: Outbox, item: QueuedItem): Outbox {
  if (holds(box, item.intent)) return box;
  return { ...box, queue: [...box.queue, item], halted: null };
}

/** Takes a message out of the queue. A message that already started stays where it is. */
export function take(box: Outbox, id: string): { box: Outbox; item: QueuedItem | null } {
  const item = box.queue.find((queued) => queued.id === id) ?? null;
  if (!item) return { box, item: null };
  return { box: { ...box, queue: box.queue.filter((queued) => queued.id !== id) }, item };
}

export function start(box: Outbox, id: RequestId): Outbox {
  const head = box.queue[0];
  if (box.running !== null || !head || head.id !== id) return box;
  return { running: head, queue: box.queue.slice(1), halted: null };
}

/** Ends the running request. A used answer's review drafts are cleared only here, once the use is accepted. */
export function finish(
  box: Outbox,
  id: RequestId,
): { box: Outbox; clearReview: QuestionId | null } {
  const item = box.running?.id === id ? box.running : null;
  if (!item) return { box, clearReview: null };
  return {
    box: { ...box, running: null },
    clearReview: item.intent.kind === "use-answer" ? item.intent.questionId : null,
  };
}

export type Refused = Readonly<{
  box: Outbox;
  composer: string | null;
  review: QuestionId | null;
}>;

/**
 * Ends a refused request and halts the queue until a snapshot newer than `sequence` or the next offer.
 * A refused message goes back to an empty composer, or back to the head of the queue; a refused use reopens its review.
 */
export function refuse(
  box: Outbox,
  id: RequestId,
  refusal: PrdRefusal,
  sequence: number,
  composerEmpty: boolean,
): Refused {
  const item = box.running?.id === id ? box.running : null;
  if (!item) return { box, composer: null, review: null };
  const halted = { ...box, running: null, halted: { refusal, sequence } };
  switch (item.intent.kind) {
    case "text":
      return composerEmpty
        ? { box: halted, composer: item.text, review: null }
        : { box: { ...halted, queue: [item, ...box.queue] }, composer: null, review: null };
    case "use-answer":
      return { box: halted, composer: null, review: item.intent.questionId };
    default:
      return { box: halted, composer: null, review: null };
  }
}

/** The message to start now, or null when one is running, the queue is empty or halted at this snapshot, or the chat cannot send. */
export function settle(box: Outbox, canSend: boolean, sequence: number): QueuedItem | null {
  if (!canSend || box.running !== null) return null;
  if (box.halted !== null && sequence <= box.halted.sequence) return null;
  return box.queue[0] ?? null;
}
