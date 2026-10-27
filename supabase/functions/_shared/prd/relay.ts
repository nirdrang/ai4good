import { isRecord, type SettleActResult, type SettleDatabase } from "../write-routes.ts";
import { issueGrantToken, usableGrantKey } from "./grant.ts";
import {
  managedConfig,
  parseStoredSession,
  readTurnEvents,
  runManagedTurn,
  sessionActiveSeconds,
  type ManagedConfig,
  type ManagedFetch,
  type ModelEnd,
  type StoredSession,
} from "./managed.ts";

export const PRD_TURN_DEADLINE_SECONDS = 600;
const GRANT_TTL_SECONDS = 900;
const AI_NAME = "ai4good AI";
const SEPARATOR = "\n\n";

export const PRD_MODEL_UNAVAILABLE = "AI replies are not set up on this server yet.";
const REPLAYED = "This message was already sent.";
const REJECTED = "The AI could not take this message. Nothing was charged for it.";
const UNCERTAIN = "The AI's reply was interrupted. It appears here once the AI finishes.";
const CAPPED = "This reply reached its spending cap.";
const UNSAVED = "The AI's reply could not be saved.";

export type PrdRelayDeps = {
  rpc: SettleDatabase;
  grantKey: string;
  managed: { fetch: ManagedFetch; config: ManagedConfig } | null;
};

type Outcome = "answered" | "rejected" | "uncertain";

type TurnRow = {
  id: string;
  kind: "reply" | "answer-write";
  state: "admitted" | "uncertain";
  dispatched: boolean;
  ageSeconds: number;
  parts: readonly unknown[];
  modelRequests: number;
};

type SessionRead = { session: StoredSession | null; turn: TurnRow | null };

export function prdRelayDeps(input: {
  rpc: SettleDatabase;
  fetch: ManagedFetch;
  env: Record<string, string | undefined>;
}): PrdRelayDeps {
  const configured = managedConfig(input.env);
  const grantKey = input.env.PRD_GRANT_SIGNING_KEY?.trim() ?? "";
  return {
    rpc: input.rpc,
    grantKey,
    managed:
      configured.ok && usableGrantKey(grantKey)
        ? { fetch: input.fetch, config: configured.config }
        : null,
  };
}

function turnRow(value: unknown): TurnRow | null {
  if (!isRecord(value)) return null;
  const { id, kind, state, dispatched, ageSeconds, parts, modelRequests } = value;
  if (typeof id !== "string" || (kind !== "reply" && kind !== "answer-write")) return null;
  if ((state !== "admitted" && state !== "uncertain") || typeof dispatched !== "boolean")
    return null;
  const age = typeof ageSeconds === "string" ? Number(ageSeconds) : ageSeconds;
  const requests = typeof modelRequests === "string" ? Number(modelRequests) : modelRequests;
  if (typeof age !== "number" || !Number.isFinite(age) || typeof requests !== "number") return null;
  return {
    id,
    kind,
    state,
    dispatched,
    ageSeconds: age,
    parts: Array.isArray(parts) ? parts : [],
    modelRequests: requests,
  };
}

async function readSession(
  database: SettleDatabase,
  project: string,
  chatKey: string,
): Promise<SessionRead | null> {
  const read = await database("prd_session_read", { p_project: project, p_chat_key: chatKey });
  if (!read.ok || !isRecord(read.value)) return null;
  return { session: parseStoredSession(read.value.session), turn: turnRow(read.value.turn) };
}

function endArgs(turnId: string, outcome: Outcome): Record<string, unknown> {
  return { p_turn: turnId, p_event: { kind: "end", outcome } };
}

function partLines(part: unknown): string[] {
  if (!isRecord(part)) return [];
  if (part.type === "text" && typeof part.text === "string") return [part.text];
  if (part.type === "data-brief" && isRecord(part.data) && Array.isArray(part.data.rows)) {
    return part.data.rows.flatMap((row) =>
      isRecord(row) && typeof row.label === "string" && typeof row.text === "string"
        ? [`${row.label}: ${row.text}`]
        : [],
    );
  }
  return [];
}

function promptOf(chatKey: string, turn: TurnRow): string {
  const where =
    chatKey === "main"
      ? "the main chat"
      : chatKey.startsWith("topic:")
        ? `the chat of section ${chatKey.slice("topic:".length)}`
        : `the NGO side chat of question ${chatKey.slice("side:".length)}`;
  const lines = turn.parts.flatMap(partLines);
  if (lines.length === 0 && turn.kind === "answer-write") {
    lines.push(
      "The NGO marked the answer complete. Write the final answer with record_outcome, then call commit_turn.",
    );
  }
  return [`This message is in ${where}.`, ...lines].join("\n");
}

async function advance(
  database: SettleDatabase,
  turnId: string,
  from: string | null,
  to: string | null,
): Promise<"moved" | "elsewhere" | "failed"> {
  if (to === null) return "moved";
  const moved = await database("prd_session_advance", { p_turn: turnId, p_from: from, p_to: to });
  if (!moved.ok) return "failed";
  return moved.value === true ? "moved" : "elsewhere";
}

async function appendReply(
  database: SettleDatabase,
  project: string,
  chatKey: string,
  text: string,
): Promise<boolean> {
  if (text === "") return true;
  const appended = await database("prd_append_message", {
    p_project: project,
    p_chat_key: chatKey,
    p_actor_kind: "ai",
    p_actor_name: AI_NAME,
    p_parts: [{ type: "text", text }],
    p_for_role: null,
    p_actor_id: null,
  });
  return appended.ok;
}

/** Runs one admitted turn through Managed Agents. The edge settles the returned `end` event last. */
export async function runPrdTurn(
  deps: PrdRelayDeps,
  project: string,
  chatKey: string,
  turnId: string,
  onDelta: (text: string) => void,
): Promise<SettleActResult> {
  if (deps.managed === null) return { args: null, failure: PRD_MODEL_UNAVAILABLE };
  const { rpc: database } = deps;
  const read = await readSession(database, project, chatKey);
  const turn = read?.turn ?? null;
  if (read === null || turn === null || turn.id !== turnId)
    return { args: null, failure: REPLAYED };
  const claimed = await database("prd_turn_dispatch", { p_turn: turnId });
  if (!claimed.ok) return { args: endArgs(turnId, "rejected"), failure: REJECTED };
  if (claimed.value !== true) return { args: null, failure: REPLAYED };
  const grant = await issueGrantToken(
    database,
    deps.grantKey,
    turnId,
    turn.kind,
    GRANT_TTL_SECONDS,
  );
  if (!grant.ok) return { args: endArgs(turnId, "rejected"), failure: REJECTED };
  const ingest = async (event: Record<string, unknown>) =>
    (await database("prd_turn_ingest", { p_turn: turnId, p_event: event })).ok;
  const result = await runManagedTurn(
    { ...deps.managed, rpc: database },
    {
      turnId,
      projectId: project,
      chatKey,
      text: promptOf(chatKey, turn),
      grantToken: grant.token,
      session: read.session,
    },
    { onText: onDelta, onModelEnd: (record: ModelEnd) => ingest(record) },
  );
  if (result.outcome === "rejected")
    return { args: endArgs(turnId, "rejected"), failure: REJECTED };
  if (result.outcome === "uncertain")
    return { args: endArgs(turnId, "uncertain"), failure: UNCERTAIN };
  const runtime = {
    kind: "runtime",
    sessionId: result.sessionId,
    activeSeconds: result.activeSeconds,
  };
  if (!(await ingest(runtime))) return { args: endArgs(turnId, "uncertain"), failure: UNCERTAIN };
  const moved = await advance(database, turnId, read.session?.cursor ?? null, result.lastEventId);
  const saved =
    moved === "moved"
      ? await appendReply(database, project, chatKey, result.text)
      : moved === "elsewhere";
  return {
    args: endArgs(turnId, "answered"),
    failure: result.capped ? CAPPED : saved ? null : UNSAVED,
  };
}

/** Settles a turn whose relay is gone from the session's event history. It never sends a message. */
export async function catchUpChat(
  deps: PrdRelayDeps,
  project: string,
  chatKey: string,
): Promise<void> {
  if (deps.managed === null) return;
  const { rpc: database } = deps;
  const read = await readSession(database, project, chatKey);
  const turn = read?.turn ?? null;
  if (read === null || turn === null) return;
  if (turn.state !== "uncertain" && turn.ageSeconds < PRD_TURN_DEADLINE_SECONDS) return;
  const end = (outcome: Outcome) => database("prd_turn_ingest", endArgs(turn.id, outcome));
  const ingest = async (event: Record<string, unknown>) =>
    (await database("prd_turn_ingest", { p_turn: turn.id, p_event: event })).ok;
  const session = read.session;
  if (!turn.dispatched || session === null) {
    await end("rejected");
    return;
  }
  const listed = await readTurnEvents(deps.managed, session.sessionId, session.cursor);
  if (!listed.ok) return;
  const { events, lastEventId } = listed.turn;
  if (events.length === 0) {
    await end(turn.modelRequests > 0 ? "answered" : "rejected");
    return;
  }
  for (const event of events) {
    if (event.kind === "model-end" && !(await ingest(event.record))) return;
  }
  const modelSeen =
    turn.modelRequests > 0 ||
    events.some((event) => event.kind === "model-start" || event.kind === "model-end");
  if (!events.some((event) => event.kind === "end")) {
    if (turn.state === "admitted") await end("uncertain");
    return;
  }
  if (!modelSeen) {
    if ((await advance(database, turn.id, session.cursor, lastEventId)) !== "moved") return;
    await end("rejected");
    return;
  }
  let activeSeconds: number | null = null;
  for (const event of events) if (event.kind === "runtime") activeSeconds = event.activeSeconds;
  activeSeconds ??= await sessionActiveSeconds(deps.managed, session.sessionId);
  if (activeSeconds === null) return;
  if (!(await ingest({ kind: "runtime", sessionId: session.sessionId, activeSeconds }))) return;
  if ((await advance(database, turn.id, session.cursor, lastEventId)) !== "moved") return;
  const text = events
    .flatMap((event) => (event.kind === "message" && event.text !== "" ? [event.text] : []))
    .join(SEPARATOR);
  await appendReply(database, project, chatKey, text);
  await end("answered");
}

export async function catchUpOverdue(deps: PrdRelayDeps, project: string): Promise<void> {
  if (deps.managed === null) return;
  const { rpc: database } = deps;
  const overdue = await database("prd_turns_overdue", {
    p_project: project,
    p_seconds: PRD_TURN_DEADLINE_SECONDS,
  });
  if (!overdue.ok || !Array.isArray(overdue.value)) return;
  for (const chatKey of overdue.value) {
    if (typeof chatKey === "string") await catchUpChat(deps, project, chatKey);
  }
}
