import {
  isStepCount,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type LanguageModelUsage,
  type ModelMessage,
} from "npm:ai@7.0.102";
import { createOpenAI } from "npm:@ai-sdk/openai@4.0.67";
import { isRecord, type SettleActResult, type SettleDatabase } from "../write-routes.ts";
import { finishStagedTurn, prdTools, type PrdToolDeps, type PrdToolScope } from "./tools.ts";

export const OPENCODE_GO_URL = "https://opencode.ai/zen/go/v1";
export const PRD_MODEL_UNAVAILABLE = "AI replies are not set up on this server yet.";
const GRANT_TTL_SECONDS = 900;
const PRD_STEP_LIMIT = 8;
const AI_NAME = "ai4good AI";

const REPLAYED = "This message was already sent.";
const REJECTED = "The AI could not take this message. Nothing was charged for it.";
const UNCERTAIN = "The AI's reply was interrupted. It appears here once the AI finishes.";
const UNSAVED = "The AI's reply could not be saved.";

const PRD_SYSTEM = [
  "You are the ai4good PRD assistant. You change the PRD only through the prd tools.",
  "Before you change a section, read it with read_section, then stage the new document with stage_section and the receipt from that read.",
  "Stage state changes with propose_ready and suggest_ngo_question, and in an NGO side chat record the answer with record_outcome.",
  "Call commit_turn once per reply, after you staged everything.",
  "If commit_turn says a staged section changed since you read it, use the current sections it returns, redo your work, stage again, and commit again.",
  "Answer in plain, short sentences.",
].join(" ");

export type PrdUsage = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
};

export type PrdModelSettings = {
  baseURL: string;
  modelId: string;
  apiKey: string;
};

export type PrdFetch = typeof fetch;

export type PrdTurnDeps = PrdToolDeps & {
  settings: PrdModelSettings | null;
  model: LanguageModel | null;
};

export type PrdTurnSink = {
  emit: (chunk: unknown) => void;
  closed: () => boolean;
};

type Outcome = "answered" | "rejected" | "uncertain";

type OpenTurn = {
  id: string;
  kind: "reply" | "answer-write";
  state: "admitted" | "uncertain";
  ageSeconds: number;
  parts: readonly unknown[];
  modelRequests: number;
  reservationMicros: number;
  spentMicros: number;
  messageId: string | null;
  chatId: string;
};

export function prdModelSettings(env: Record<string, string | undefined>): PrdModelSettings | null {
  const baseURL = env.PRD_MODEL_BASE_URL?.trim() ?? "";
  const modelId = env.PRD_MODEL?.trim() ?? "";
  const apiKey = env.PRD_MODEL_API_KEY?.trim() ?? "";
  if (baseURL === "" || modelId === "" || apiKey === "") return null;
  return { baseURL, modelId, apiKey };
}

function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function prdModel(chatId: string, settings: PrdModelSettings, fetchImpl?: PrdFetch): LanguageModel {
  const headers: Record<string, string> = {};
  // opencode go answers 400 MissingSessionID unless every request carries this header.
  if (normalizeBase(settings.baseURL) === OPENCODE_GO_URL) headers["x-opencode-session"] = chatId;
  const provider = createOpenAI({
    baseURL: settings.baseURL,
    apiKey: settings.apiKey,
    headers,
    ...(fetchImpl === undefined ? {} : { fetch: fetchImpl }),
  });
  return provider.responses(settings.modelId);
}

export function prdGrantMode(chatKey: string, kind: "reply" | "answer-write"): "reply" | "answer-write" {
  if (chatKey.startsWith("side:") || kind === "answer-write") return "answer-write";
  return "reply";
}

export function usageOf(usage: LanguageModelUsage): PrdUsage | null {
  if (usage.inputTokens === undefined && usage.outputTokens === undefined) return null;
  return {
    input: usage.inputTokens ?? 0,
    output: usage.outputTokens ?? 0,
    cacheRead: usage.inputTokenDetails.cacheReadTokens ?? 0,
    cacheWrite: usage.inputTokenDetails.cacheWriteTokens ?? 0,
  };
}

function numberOf(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value !== "" && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

export async function ingestModelStep(
  database: SettleDatabase,
  turnId: string,
  stepNumber: number,
  usage: PrdUsage | null,
  seen: Set<string>,
): Promise<{ providerMicros: number; feeMicros: number } | "duplicate" | null> {
  const eventId = `${turnId}:${stepNumber}`;
  if (seen.has(eventId)) return "duplicate";
  seen.add(eventId);
  const result = await database("prd_turn_ingest", {
    p_turn: turnId,
    p_event: { kind: "model-end", eventId, usage },
  });
  if (!result.ok || !isRecord(result.value)) return null;
  return {
    providerMicros: numberOf(result.value.providerMicros),
    feeMicros: numberOf(result.value.feeMicros),
  };
}

function whole(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function turnOf(value: unknown, chatId: string): OpenTurn | null {
  if (!isRecord(value)) return null;
  const turn = value.turn;
  if (turn === null) return null;
  if (!isRecord(turn)) return null;
  const age = whole(turn.ageSeconds);
  const requests = whole(turn.modelRequests);
  const reservation = whole(turn.reservationMicros);
  const spent = whole(turn.spentMicros);
  if (typeof turn.id !== "string" || (turn.kind !== "reply" && turn.kind !== "answer-write")) return null;
  if (turn.state !== "admitted" && turn.state !== "uncertain") return null;
  if (age === null || requests === null || reservation === null || spent === null) return null;
  const messageId = turn.messageId === null ? null : typeof turn.messageId === "string" ? turn.messageId : null;
  if (turn.messageId !== null && turn.messageId !== undefined && messageId === null) return null;
  return {
    id: turn.id,
    kind: turn.kind,
    state: turn.state,
    ageSeconds: age,
    parts: Array.isArray(turn.parts) ? turn.parts : [],
    modelRequests: requests,
    reservationMicros: reservation,
    spentMicros: spent,
    messageId,
    chatId,
  };
}

function textOfParts(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .flatMap((part) => (isRecord(part) && part.type === "text" && typeof part.text === "string" ? [part.text] : []))
    .join("\n");
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

function promptOf(chatKey: string, turn: OpenTurn): string {
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

function historyOf(rows: unknown, chatKey: string, turn: OpenTurn): ModelMessage[] {
  const messages: ModelMessage[] = [];
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (!isRecord(row)) continue;
      if (turn.messageId !== null && row.id === turn.messageId) continue;
      const text = textOfParts(row.parts);
      if (text === "") continue;
      messages.push({ role: row.role === "assistant" ? "assistant" : "user", content: text });
    }
  }
  messages.push({ role: "user", content: promptOf(chatKey, turn) });
  return messages;
}

async function readOpen(
  database: SettleDatabase,
  project: string,
  chatKey: string,
): Promise<{ ok: true; turn: OpenTurn | null } | { ok: false }> {
  const read = await database("prd_turn_open", { p_project: project, p_chat_key: chatKey });
  if (!read.ok || !isRecord(read.value) || typeof read.value.chatId !== "string") return { ok: false };
  return { ok: true, turn: turnOf(read.value, read.value.chatId) };
}

function skipped(failure: string, status = 502): SettleActResult {
  return { args: null, failure, skipSettle: true, status };
}

async function endTurn(
  database: SettleDatabase,
  turnId: string,
  outcome: Outcome,
  failure: string | null,
): Promise<SettleActResult> {
  const ended = await database("prd_turn_ingest", {
    p_turn: turnId,
    p_event: { kind: "end", outcome },
  });
  if (!ended.ok) return skipped(UNCERTAIN);
  return { args: null, failure, skipSettle: true, ...(failure === null ? {} : { status: 502 }) };
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

function namesOf(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return null;
  return value;
}

async function readUiStream(
  stream: ReadableStream<unknown>,
  sink: PrdTurnSink,
  text: string[],
): Promise<void> {
  const reader = stream.getReader();
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) return;
      if (!sink.closed()) sink.emit(next.value);
      if (isRecord(next.value) && next.value.type === "text-delta" && typeof next.value.delta === "string") {
        text.push(next.value.delta);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Runs one admitted turn. The `end` ingest is the last ledger write. */
export async function runPrdTurn(
  deps: PrdTurnDeps,
  project: string,
  chatKey: string,
  turnId: string | null,
  sink: PrdTurnSink,
): Promise<SettleActResult> {
  if (turnId === null) return skipped("The turn could not be read.");
  const database = deps.rpc;
  const opened = await readOpen(database, project, chatKey);
  if (!opened.ok) return endTurn(database, turnId, "rejected", REJECTED);
  const turn = opened.turn;
  if (turn === null || turn.id !== turnId) return skipped(REPLAYED, 409);
  if (deps.settings === null) return endTurn(database, turnId, "rejected", REJECTED);

  const mode = prdGrantMode(chatKey, turn.kind);
  const issued = await database("prd_grant_issue", {
    p_turn: turnId,
    p_mode: mode,
    p_ttl_seconds: GRANT_TTL_SECONDS,
  });
  if (!issued.ok || typeof issued.value !== "string") return endTurn(database, turnId, "rejected", REJECTED);
  const scope: PrdToolScope = {
    grantId: issued.value,
    projectId: project,
    chatId: turn.chatId,
    turnId,
  };
  const recorded = await database("prd_turn_settings_record", {
    p_turn: turnId,
    p_model: deps.settings.modelId,
    p_settings: { baseURL: normalizeBase(deps.settings.baseURL), model: deps.settings.modelId },
  });
  if (!recorded.ok) return endTurn(database, turnId, "rejected", REJECTED);
  const history = await database("prd_chat_transcript", { p_project: project, p_chat_key: chatKey });
  if (!history.ok) return endTurn(database, turnId, "rejected", REJECTED);
  const listed = await database("prd_grant_tools", { p_grant: scope.grantId });
  const names = listed.ok ? namesOf(listed.value) : null;
  if (names === null) return endTurn(database, turnId, "rejected", REJECTED);

  const toolDeps: PrdToolDeps = { rpc: database, github: deps.github };
  const tools = prdTools(toolDeps, scope, new Set(names));
  const seen = new Set<string>();
  let spent = turn.spentMicros;
  let capped = spent >= turn.reservationMicros;
  let modelEnds = 0;
  let ingestFailed = false;
  let providerFailed = false;
  const text: string[] = [];
  const model = deps.model ?? prdModel(turn.chatId, deps.settings);

  if (!capped) {
    try {
      const result = streamText({
        model,
        system: PRD_SYSTEM,
        messages: historyOf(history.value, chatKey, turn),
        tools,
        stopWhen: [isStepCount(PRD_STEP_LIMIT), () => capped],
        maxRetries: 0,
        onError: () => {
          providerFailed = true;
        },
        onStepFinish: async (step) => {
          const settled = await ingestModelStep(database, turnId, step.stepNumber, usageOf(step.usage), seen);
          if (settled === null) {
            ingestFailed = true;
            return;
          }
          if (settled === "duplicate") return;
          modelEnds += 1;
          spent += settled.providerMicros + settled.feeMicros;
          if (spent >= turn.reservationMicros) capped = true;
        },
      });
      await readUiStream(toUIMessageStream({ stream: result.stream }), sink, text);
    } catch {
      providerFailed = true;
    }
  }

  await finishStagedTurn(toolDeps, scope);
  const saved = await appendReply(database, project, chatKey, text.join(""));
  let outcome: Outcome = "answered";
  let failure: string | null = saved ? null : UNSAVED;
  if (providerFailed && modelEnds === 0) {
    outcome = "rejected";
    failure = REJECTED;
  } else if (ingestFailed) {
    outcome = "uncertain";
    failure = UNCERTAIN;
  }
  return endTurn(database, turnId, outcome, failure);
}

export async function modelPriced(database: SettleDatabase, modelId: string): Promise<boolean> {
  const priced = await database("prd_model_priced", { p_model: modelId });
  return priced.ok && priced.value === true;
}

