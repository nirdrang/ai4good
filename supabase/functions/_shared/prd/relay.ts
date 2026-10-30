import type { GithubFetch } from "../github/app.ts";
import { isRecord, type SettleDatabase } from "../write-routes.ts";
import { prdGithub } from "./tools.ts";
import {
  modelPriced,
  prdModelSettings,
  runPrdTurn,
  PRD_MODEL_UNAVAILABLE,
  type PrdTurnDeps,
  type PrdTurnSink,
} from "./turn.ts";

export { PRD_MODEL_UNAVAILABLE, runPrdTurn };
export type { PrdTurnDeps as PrdRelayDeps, PrdTurnSink };

export const PRD_TURN_DEADLINE_SECONDS = 600;

type Outcome = "answered" | "rejected";

type OpenTurn = {
  id: string;
  state: "admitted" | "uncertain";
  ageSeconds: number;
  modelRequests: number;
};

export function prdRelayDeps(input: {
  rpc: SettleDatabase;
  fetch: GithubFetch;
  env: Record<string, string | undefined>;
  model?: PrdTurnDeps["model"];
  github?: PrdTurnDeps["github"];
}): PrdTurnDeps {
  return {
    rpc: input.rpc,
    settings: prdModelSettings(input.env),
    model: input.model ?? null,
    fetchImpl: input.fetch,
    github: input.github ?? prdGithub(input.env, input.fetch),
  };
}

function whole(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function openTurn(value: unknown): OpenTurn | null {
  if (!isRecord(value) || value.turn === null || !isRecord(value.turn)) return null;
  const turn = value.turn;
  const age = whole(turn.ageSeconds);
  const requests = whole(turn.modelRequests);
  if (typeof turn.id !== "string" || (turn.state !== "admitted" && turn.state !== "uncertain")) return null;
  if (age === null || requests === null) return null;
  return { id: turn.id, state: turn.state, ageSeconds: age, modelRequests: requests };
}

/** Ends a turn whose edge function died. It never calls the model. */
export async function catchUpChat(deps: PrdTurnDeps, project: string, chatKey: string): Promise<void> {
  const read = await deps.rpc("prd_turn_open", { p_project: project, p_chat_key: chatKey });
  if (!read.ok) return;
  const turn = openTurn(read.value);
  if (turn === null) return;
  if (turn.state !== "uncertain" && turn.ageSeconds < PRD_TURN_DEADLINE_SECONDS) return;
  const outcome: Outcome = turn.modelRequests > 0 ? "answered" : "rejected";
  await deps.rpc("prd_turn_ingest", { p_turn: turn.id, p_event: { kind: "end", outcome } });
}

export async function catchUpOverdue(deps: PrdTurnDeps, project: string): Promise<void> {
  const overdue = await deps.rpc("prd_turns_overdue", {
    p_project: project,
    p_seconds: PRD_TURN_DEADLINE_SECONDS,
  });
  if (!overdue.ok || !Array.isArray(overdue.value)) return;
  for (const chatKey of overdue.value) {
    if (typeof chatKey === "string") await catchUpChat(deps, project, chatKey);
  }
}

export async function prdModelReady(deps: PrdTurnDeps): Promise<boolean> {
  if (deps.settings === null) return false;
  return modelPriced(deps.rpc, deps.settings.modelId);
}
