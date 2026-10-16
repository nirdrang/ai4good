import type { PrdIntent, PrdRefusal, RequestId } from "@/lib/prd-stream";

export type QueuedItem = Readonly<{ id: RequestId; intent: PrdIntent; text: string }>;

export type Outbox = Readonly<{
  busy: RequestId | null;
  queue: readonly QueuedItem[];
  halted: PrdRefusal | null;
}>;

export const EMPTY_OUTBOX: Outbox = { busy: null, queue: [], halted: null };

/** Adds a message at the end of the queue and lifts a halt. */
export function offer(box: Outbox, item: QueuedItem): Outbox {
  return { ...box, queue: [...box.queue, item], halted: null };
}

/** Takes a message out of the queue. A message that already started stays where it is. */
export function take(box: Outbox, id: string): { box: Outbox; item: QueuedItem | null } {
  const item = box.queue.find((queued) => queued.id === id) ?? null;
  if (!item) return { box, item: null };
  return { box: { ...box, queue: box.queue.filter((queued) => queued.id !== id) }, item };
}

/** Marks the head of the queue as the running request. */
export function start(box: Outbox, id: RequestId): Outbox {
  const head = box.queue[0];
  if (box.busy !== null || !head || head.id !== id) return box;
  return { ...box, busy: id, queue: box.queue.slice(1) };
}

export function finish(box: Outbox, id: RequestId): Outbox {
  return box.busy === id ? { ...box, busy: null } : box;
}

/** Ends the running request and halts the queue until the next offer. */
export function fail(box: Outbox, id: RequestId, refusal: PrdRefusal): Outbox {
  return box.busy === id ? { ...box, busy: null, halted: refusal } : box;
}

/** The message to start now, or null when one is running, the queue is halted or empty, or the chat cannot send. */
export function settle(box: Outbox, canSend: boolean): QueuedItem | null {
  if (!canSend || box.busy !== null || box.halted !== null) return null;
  return box.queue[0] ?? null;
}
