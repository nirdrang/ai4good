import type { PrdPort } from "../../../../src/components/prd-workspace/port.ts";
import { MODEL_CALL_PROBE } from "../../../../design/astra/src/givens.ts";
import {
  scopeKey,
  type Action,
  type ActionKind,
  type ChatScope,
  type PrdIntent,
  type PrdSendBody,
  type PrdSnapshot,
  type PrdUIMessage,
  type QuestionId,
  type RequestId,
  type TopicId,
  type Viewer,
} from "../../../../src/lib/prd-stream.ts";

export const DEV: Viewer = { role: "dev", name: "Priya Shah" };
export const NGO: Viewer = { role: "ngo", name: "Maya Levi" };

export const TOPIC_ID = {
  users: "users" as TopicId,
  shifts: "shifts" as TopicId,
  notify: "notify" as TopicId,
  data: "data" as TopicId,
  scope: "scope" as TopicId,
  success: "success" as TopicId,
} as const;

export const QUESTION_ID = {
  retention: "retention" as QuestionId,
  logo: "logo" as QuestionId,
  success: "success" as QuestionId,
} as const;

export type Delivery = { ok: true; text: string } | { ok: false; kind: string; reason: string };

type PrdFixtureEntry = {
  createPrdWorld: (
    scenario: string,
    options: { storage: null; pace: "test" | "demo" },
  ) => Promise<unknown> | unknown;
  prdPortFor: (world: unknown, viewer: Viewer) => PrdPort;
};

export type PrdWorld = {
  port(viewer: Viewer): PrdPort;
  calls(): readonly string[];
  release(): void;
};

let requestCounter = 0;

export function requestId(prefix: string): RequestId {
  requestCounter += 1;
  return `${prefix}-${requestCounter}` as RequestId;
}

function entrySpecifier(): string {
  return ["..", "..", "..", "..", "design", "astra", "src", "prd-fixture-port.ts"].join("/");
}

async function loadFixtureEntry(): Promise<PrdFixtureEntry> {
  const loaded: unknown = await import(entrySpecifier());
  if (typeof loaded !== "object" || loaded === null) {
    throw new Error("design/astra/src/prd-fixture-port.ts did not export a module");
  }
  const record = loaded as Record<string, unknown>;
  if (typeof record.createPrdWorld !== "function" || typeof record.prdPortFor !== "function") {
    throw new Error(
      `design/astra/src/prd-fixture-port.ts must export createPrdWorld and prdPortFor; it exported ${Object.keys(record).join(", ")}`,
    );
  }
  return loaded as PrdFixtureEntry;
}

export async function loadPrdWorld(scenario: string): Promise<PrdWorld> {
  const calls: string[] = [];
  const host = globalThis as Record<string, unknown>;
  const previous = host[MODEL_CALL_PROBE];
  host[MODEL_CALL_PROBE] = (kind: unknown) => {
    calls.push(String(kind));
  };
  try {
    const entry = await loadFixtureEntry();
    const world = await Promise.resolve(
      entry.createPrdWorld(scenario, { storage: null, pace: "test" }),
    );
    return {
      port(viewer) {
        return entry.prdPortFor(world, viewer);
      },
      calls: () => calls.slice(),
      release() {
        if (previous === undefined) delete host[MODEL_CALL_PROBE];
        else host[MODEL_CALL_PROBE] = previous;
      },
    };
  } catch (error) {
    if (previous === undefined) delete host[MODEL_CALL_PROBE];
    else host[MODEL_CALL_PROBE] = previous;
    throw error;
  }
}

export function messageText(message: PrdUIMessage): string {
  return message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
}

export async function snapshot(port: PrdPort): Promise<PrdSnapshot> {
  const result = await port.load();
  if (!result.ok) throw new Error(result.refusal.reason);
  return result.value;
}

export function chatText(snap: PrdSnapshot, scope: ChatScope): string {
  return (snap.chats[scopeKey(scope)] ?? []).map(messageText).join("\n");
}

export function occurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) return count;
    count += 1;
    from = at + needle.length;
  }
}

export function actionsOf(snap: PrdSnapshot): Action<ActionKind>[] {
  const actions: Action<ActionKind>[] = [];
  for (const topic of snap.topics) {
    if (topic.confirm.kind === "available") actions.push(topic.confirm.action);
    if (topic.reopen.kind === "available") actions.push(topic.reopen.action);
  }
  for (const question of snap.questions) {
    if (question.kind === "suggested" && question.post.kind === "available") {
      actions.push(question.post.action);
    }
    if (question.kind === "answering" && question.complete.kind === "available") {
      actions.push(question.complete.action);
    }
  }
  if (snap.close.kind === "open" && snap.close.close.kind === "available") {
    actions.push(snap.close.close.action);
  }
  return actions;
}

function refusalFrom(message: string): Delivery {
  const start = message.indexOf("{");
  if (start >= 0) {
    try {
      const value = JSON.parse(message.slice(start)) as {
        kind?: unknown;
        reason?: unknown;
        refusal?: { kind?: unknown; reason?: unknown };
      };
      const kind = value.refusal?.kind ?? value.kind;
      const reason = value.refusal?.reason ?? value.reason ?? message;
      if (typeof kind === "string") {
        return { ok: false, kind, reason: typeof reason === "string" ? reason : message };
      }
    } catch {
      return { ok: false, kind: "error", reason: message };
    }
  }
  return { ok: false, kind: "error", reason: message };
}

export async function deliver(
  port: PrdPort,
  scope: ChatScope,
  intent: PrdIntent,
  baseRevision: number,
  id: RequestId,
): Promise<Delivery> {
  const body: PrdSendBody = { scope, requestId: id, baseRevision, intent };
  try {
    const stream = await port.chat(scope).sendMessages({
      trigger: "submit-message",
      chatId: scopeKey(scope),
      messageId: undefined,
      messages: [],
      abortSignal: undefined,
      body,
    });
    const reader = stream.getReader();
    let errorText: string | null = null;
    let text = "";
    for (;;) {
      const step = await reader.read();
      if (step.done) break;
      if (step.value.type === "error") errorText = step.value.errorText;
      if (step.value.type === "text-delta") text += step.value.delta;
    }
    if (errorText !== null) return refusalFrom(errorText);
    return { ok: true, text };
  } catch (error) {
    return refusalFrom(error instanceof Error ? error.message : String(error));
  }
}
