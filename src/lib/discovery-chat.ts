export type Allowance = {
  organizationId: string;
  utcDay: string;
  vetted: boolean;
  dailyGrant: number;
  spentToday: number;
  remaining: number;
};

/** Consumed fields of DiscoveryTurnView (supabase/functions/_shared/discovery-turn.ts). */
export type DiscoveryTurn = {
  id: string;
  seq: number;
  status: "open" | "settled" | "failed" | "abandoned";
  userMessage: string;
  assistantMessage: string | null;
};

export type Refusal = { kind: string | null; reason: string };

/** The subset of the SDK's UIMessage the page seeds useChat with; assignable to it. */
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  parts: { type: "text"; text: string }[];
};

export type ConversationRead =
  | { kind: "loaded"; turns: DiscoveryTurn[]; allowance: Allowance | null }
  | { kind: "failed"; reason: string };

export type SettlePollResult =
  | ConversationRead
  | { kind: "still-open"; turns: DiscoveryTurn[]; allowance: Allowance | null }
  | { kind: "no-turn"; turns: DiscoveryTurn[]; allowance: Allowance | null };

const UNEXPECTED_CONVERSATION_SHAPE = "the conversation read has an unexpected shape";

export function isAllowance(value: unknown): value is Allowance {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.organizationId === "string" &&
    typeof record.utcDay === "string" &&
    typeof record.vetted === "boolean" &&
    typeof record.dailyGrant === "number" &&
    typeof record.spentToday === "number" &&
    typeof record.remaining === "number"
  );
}

export function isDiscoveryTurn(value: unknown): value is DiscoveryTurn {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const status = record.status;
  return (
    typeof record.id === "string" &&
    typeof record.seq === "number" &&
    (status === "open" || status === "settled" || status === "failed" || status === "abandoned") &&
    typeof record.userMessage === "string" &&
    (record.assistantMessage === null || typeof record.assistantMessage === "string")
  );
}

export function parseConversationBody(text: string): ConversationRead {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: "failed", reason: text };
  }
  if (parsed === null || typeof parsed !== "object") {
    return { kind: "failed", reason: text };
  }
  const body = parsed as {
    ok?: unknown;
    conversation?: { turns?: unknown };
    allowance?: unknown;
    reason?: unknown;
  };
  if (body.ok !== true) {
    const reason = typeof body.reason === "string" ? body.reason : text;
    return { kind: "failed", reason };
  }
  const turns = body.conversation?.turns;
  if (!Array.isArray(turns)) {
    return { kind: "failed", reason: "the conversation read named no turns" };
  }
  if (!turns.every(isDiscoveryTurn)) {
    return { kind: "failed", reason: UNEXPECTED_CONVERSATION_SHAPE };
  }
  return {
    kind: "loaded",
    turns,
    allowance: isAllowance(body.allowance) ? body.allowance : null,
  };
}

export function messagesFromTurns(turns: DiscoveryTurn[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const turn of turns) {
    messages.push({
      id: `${turn.id}:user`,
      role: "user",
      parts: [{ type: "text", text: turn.userMessage }],
    });
    if (typeof turn.assistantMessage === "string" && turn.assistantMessage.length > 0) {
      messages.push({
        id: `${turn.id}:assistant`,
        role: "assistant",
        parts: [{ type: "text", text: turn.assistantMessage }],
      });
    }
  }
  return messages;
}

export function refusalFromResponseText(text: string): Refusal {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed !== null && typeof parsed === "object" && "reason" in parsed) {
      const reason = (parsed as { reason: unknown }).reason;
      if (typeof reason === "string") {
        const kind = (parsed as { kind?: unknown }).kind;
        return { kind: typeof kind === "string" ? kind : null, reason };
      }
    }
  } catch {
  }
  return { kind: null, reason: text };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function failureReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function pollUntilTurnSettled(
  read: () => Promise<ConversationRead>,
  knownMaxSeq: number,
  options: { deadlineMs: number; intervalMs: number },
): Promise<SettlePollResult> {
  const deadline = Date.now() + options.deadlineMs;
  for (;;) {
    let result: ConversationRead;
    try {
      result = await read();
    } catch (error) {
      return { kind: "failed", reason: failureReason(error) };
    }
    if (result.kind === "failed") return result;
    const newer = result.turns.filter((turn) => turn.seq > knownMaxSeq);
    if (newer.some((turn) => turn.status !== "open")) {
      return { kind: "loaded", turns: result.turns, allowance: result.allowance };
    }
    if (Date.now() >= deadline) {
      return { kind: newer.length > 0 ? "still-open" : "no-turn", turns: result.turns, allowance: result.allowance };
    }
    await wait(options.intervalMs);
  }
}
