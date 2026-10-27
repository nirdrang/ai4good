import type { SettleDatabase } from "../write-routes.ts";

export const PRD_MODEL = "claude-haiku-5-5";
export const MANAGED_API = "https://api.anthropic.com";
const API_VERSION = "2026-10-21";
const BETA = "managed-agents-2026-04-01";
const CALL_TIMEOUT_MS = 30_000;
const SEPARATOR = "\n\n";

const PRD_SYSTEM = [
  "You are the ai4good PRD assistant. You change the PRD only through the prd tools.",
  "Before you change a section, read it with read_section, then stage the new document with stage_section and the receipt from that read.",
  "Stage state changes with propose_ready and suggest_ngo_question, and in an NGO side chat record the answer with record_outcome.",
  "Call commit_turn once per reply, after you staged everything.",
  "If commit_turn says a staged section changed since you read it, use the current sections it returns, redo your work, stage again, and commit again.",
  "Answer in plain, short sentences.",
].join(" ");

export type ManagedFetch = (input: string, init: RequestInit) => Promise<Response>;

export type ManagedConfig = {
  apiKey: string;
  agentId: string;
  environmentId: string;
  toolsUrl: string;
};

export type ManagedDeps = {
  fetch: ManagedFetch;
  config: ManagedConfig;
  rpc: SettleDatabase;
};

export type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };

export type ModelEnd = {
  kind: "model-end";
  sessionId: string;
  eventId: string;
  usage: Usage | null;
};

export type ProviderEvent =
  | { kind: "ignored"; id: string | null }
  | { kind: "user-message"; id: string }
  | { kind: "model-start"; id: string }
  | { kind: "model-end"; id: string; record: ModelEnd }
  | { kind: "preview"; id: null; messageId: string; text: string }
  | { kind: "message"; id: string; text: string }
  | { kind: "runtime"; id: string; activeSeconds: number }
  | { kind: "end"; id: string; stopReason: string };

export type StoredSession = {
  sessionId: string;
  vaultId: string;
  credentialId: string;
  generation: number;
  cursor: string | null;
};

export type TurnInput = {
  turnId: string;
  projectId: string;
  chatKey: string;
  text: string;
  grantToken: string;
  session: StoredSession | null;
};

export type TurnHooks = {
  onText: (delta: string) => void;
  onModelEnd: (record: ModelEnd) => Promise<boolean>;
};

export type TurnOutcome =
  | {
      outcome: "answered";
      sessionId: string;
      text: string;
      capped: boolean;
      activeSeconds: number;
      lastEventId: string | null;
    }
  | { outcome: "rejected"; reason: string }
  | { outcome: "uncertain"; reason: string };

export type TurnEvents = { events: readonly ProviderEvent[]; lastEventId: string | null };

type Called =
  | { ok: true; status: number; value: unknown }
  | { ok: false; status: number | null; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function seconds(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

const REQUIRED_ENV = [
  "ANTHROPIC_API_KEY",
  "PRD_MANAGED_AGENT_ID",
  "PRD_MANAGED_ENVIRONMENT_ID",
  "PRD_TOOLS_PUBLIC_URL",
] as const;

export function managedConfig(
  env: Record<string, string | undefined>,
): { ok: true; config: ManagedConfig } | { ok: false; missing: string[] } {
  const missing = REQUIRED_ENV.filter((name) => text(env[name]) === null);
  const toolsUrl = env.PRD_TOOLS_PUBLIC_URL?.trim() ?? "";
  if (!missing.includes("PRD_TOOLS_PUBLIC_URL") && !/^https:\/\/[^\s/]+/i.test(toolsUrl)) {
    missing.push("PRD_TOOLS_PUBLIC_URL");
  }
  if (missing.length > 0) return { ok: false, missing };
  return {
    ok: true,
    config: {
      apiKey: env.ANTHROPIC_API_KEY!.trim(),
      agentId: env.PRD_MANAGED_AGENT_ID!.trim(),
      environmentId: env.PRD_MANAGED_ENVIRONMENT_ID!.trim(),
      toolsUrl,
    },
  };
}

export function managedHeaders(apiKey: string): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "anthropic-version": API_VERSION,
    "anthropic-beta": BETA,
    "content-type": "application/json",
  };
}

export function prdEnvironmentDefinition(): Record<string, unknown> {
  return {
    name: "ai4good-prd",
    config: {
      type: "cloud",
      networking: {
        type: "limited",
        allow_mcp_servers: true,
        allow_package_managers: false,
        allowed_hosts: [],
      },
    },
  };
}

export function prdAgentDefinition(toolsUrl: string): Record<string, unknown> {
  return {
    name: "ai4good-prd",
    model: PRD_MODEL,
    system: PRD_SYSTEM,
    mcp_servers: [{ type: "url", name: "prd", url: toolsUrl }],
    tools: [
      {
        type: "mcp_toolset",
        mcp_server_name: "prd",
        default_config: { enabled: true, permission_policy: { type: "always_allow" } },
      },
    ],
  };
}

async function call(
  deps: Pick<ManagedDeps, "fetch" | "config">,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<Called> {
  let response: Response;
  try {
    response = await deps.fetch(`${MANAGED_API}${path}`, {
      method,
      headers: managedHeaders(deps.config.apiKey),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    });
  } catch (error) {
    return {
      ok: false,
      status: null,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  const raw = await response.text().catch(() => "");
  if (!response.ok)
    return {
      ok: false,
      status: response.status,
      reason: `Managed Agents answered ${response.status}`,
    };
  try {
    return {
      ok: true,
      status: response.status,
      value: raw === "" ? null : (JSON.parse(raw) as unknown),
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      reason: "Managed Agents answered with a body that is not JSON",
    };
  }
}

function idOf(called: Called): string | null {
  return called.ok && isRecord(called.value) ? text(called.value.id) : null;
}

function usageOf(value: unknown): Usage | null {
  if (!isRecord(value)) return null;
  const input = count(value.input_tokens);
  const output = count(value.output_tokens);
  const cacheRead =
    value.cache_read_input_tokens === undefined ? 0 : count(value.cache_read_input_tokens);
  const cacheWrite =
    value.cache_creation_input_tokens === undefined ? 0 : count(value.cache_creation_input_tokens);
  if (input === null || output === null || cacheRead === null || cacheWrite === null) return null;
  return { input, output, cacheRead, cacheWrite };
}

function messageText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (block): block is { type: "text"; text: string } =>
        isRecord(block) && block.type === "text" && typeof block.text === "string",
    )
    .map((block) => block.text)
    .join("");
}

/** The one mapping from a raw Managed Agents event, live or listed, to what the relay needs. */
export function toProviderEvent(raw: unknown, sessionId: string): ProviderEvent {
  if (!isRecord(raw) || typeof raw.type !== "string") return { kind: "ignored", id: null };
  if (raw.type === "event_delta") {
    const messageId = text(raw.event_id);
    const delta = isRecord(raw.delta) ? raw.delta : null;
    const content = delta !== null && isRecord(delta.content) ? delta.content : null;
    if (
      messageId === null ||
      content === null ||
      content.type !== "text" ||
      typeof content.text !== "string"
    ) {
      return { kind: "ignored", id: null };
    }
    return { kind: "preview", id: null, messageId, text: content.text };
  }
  const id = text(raw.id);
  if (id === null) return { kind: "ignored", id: null };
  switch (raw.type) {
    case "user.message":
      return { kind: "user-message", id };
    case "span.model_request_start":
      return { kind: "model-start", id };
    case "span.model_request_end":
      return {
        kind: "model-end",
        id,
        record: { kind: "model-end", sessionId, eventId: id, usage: usageOf(raw.model_usage) },
      };
    case "agent.message":
      return { kind: "message", id, text: messageText(raw.content) };
    case "session.usage": {
      const active =
        seconds(raw.active_seconds) ??
        (isRecord(raw.usage) ? seconds(raw.usage.active_seconds) : null);
      return active === null
        ? { kind: "ignored", id }
        : { kind: "runtime", id, activeSeconds: active };
    }
    case "session.status_idle": {
      const reason = isRecord(raw.stop_reason) ? text(raw.stop_reason.type) : null;
      if (reason === "requires_action") return { kind: "ignored", id };
      return { kind: "end", id, stopReason: reason ?? "unknown" };
    }
    case "session.status_terminated":
      return { kind: "end", id, stopReason: "terminated" };
    default:
      return { kind: "ignored", id };
  }
}

async function* serverEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      for (
        let boundary = buffer.search(/\r?\n\r?\n/);
        boundary !== -1;
        boundary = buffer.search(/\r?\n\r?\n/)
      ) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary).replace(/^\r?\n\r?\n/, "");
        const data = block
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, ""))
          .join("\n");
        if (data === "") continue;
        let parsed: unknown;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }
        yield parsed;
      }
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
}

function budgetBody(cents: number): Record<string, unknown> {
  return { type: "limit", max_list_cost: { amount: String(cents), currency: "USD" } };
}

async function sessionBudget(rpc: SettleDatabase, turnId: string): Promise<number | null> {
  const budget = await rpc("prd_session_budget", { p_turn: turnId });
  if (!budget.ok) return null;
  const cents = typeof budget.value === "string" ? Number(budget.value) : budget.value;
  return typeof cents === "number" && Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function parseStoredSession(value: unknown): StoredSession | null {
  if (!isRecord(value)) return null;
  const sessionId = text(value.sessionId);
  const vaultId = text(value.vaultId);
  const credentialId = text(value.credentialId);
  const generation = count(value.generation);
  if (sessionId === null || vaultId === null || credentialId === null || generation === null)
    return null;
  return { sessionId, vaultId, credentialId, generation, cursor: text(value.cursor) };
}

async function openSession(
  deps: ManagedDeps,
  input: TurnInput,
  cents: number,
): Promise<{ ok: true; sessionId: string } | { ok: false; reason: string }> {
  const { config, rpc: database } = deps;
  if (input.session !== null) {
    const { sessionId, vaultId, credentialId, generation } = input.session;
    const rotated = await call(deps, "POST", `/v1/vaults/${vaultId}/credentials/${credentialId}`, {
      auth: { type: "static_bearer", token: input.grantToken },
    });
    if (!rotated.ok) return { ok: false, reason: "the tools credential could not be rotated" };
    const moved = await database("prd_session_rotate", {
      p_turn: input.turnId,
      p_generation: generation,
    });
    if (!moved.ok) return { ok: false, reason: "the tools credential moved since it was read" };
    const capped = await call(deps, "POST", `/v1/sessions/${sessionId}`, {
      budget: budgetBody(cents),
    });
    if (!capped.ok) return { ok: false, reason: "the session budget could not be changed" };
    return { ok: true, sessionId };
  }
  const vaultId = idOf(
    await call(deps, "POST", "/v1/vaults", {
      display_name: `prd ${input.projectId} ${input.chatKey}`,
    }),
  );
  if (vaultId === null) return { ok: false, reason: "the vault could not be created" };
  const credentialId = idOf(
    await call(deps, "POST", `/v1/vaults/${vaultId}/credentials`, {
      display_name: "PRD tools",
      auth: { type: "static_bearer", mcp_server_url: config.toolsUrl, token: input.grantToken },
    }),
  );
  if (credentialId === null)
    return { ok: false, reason: "the tools credential could not be created" };
  const sessionId = idOf(
    await call(deps, "POST", "/v1/sessions", {
      agent: config.agentId,
      environment_id: config.environmentId,
      vault_ids: [vaultId],
      budget: budgetBody(cents),
      metadata: { project: input.projectId, chat: input.chatKey },
    }),
  );
  if (sessionId === null) return { ok: false, reason: "the session could not be created" };
  const bound = await database("prd_session_open", {
    p_turn: input.turnId,
    p_session: sessionId,
    p_vault: vaultId,
    p_credential: credentialId,
  });
  if (!bound.ok) return { ok: false, reason: "the session could not be recorded" };
  return { ok: true, sessionId };
}

export async function sessionActiveSeconds(
  deps: Pick<ManagedDeps, "fetch" | "config">,
  sessionId: string,
): Promise<number | null> {
  const read = await call(deps, "GET", `/v1/sessions/${sessionId}`);
  if (!read.ok || !isRecord(read.value) || !isRecord(read.value.usage)) return null;
  return seconds(read.value.usage.active_seconds);
}

/** Runs one turn: session, budget, settings, stream first, then the message, then the stream to its end. */
export async function runManagedTurn(
  deps: ManagedDeps,
  input: TurnInput,
  hooks: TurnHooks,
): Promise<TurnOutcome> {
  const rejected = (reason: string): TurnOutcome => ({ outcome: "rejected", reason });
  const { rpc: database } = deps;
  const cents = await sessionBudget(database, input.turnId);
  if (cents === null) return rejected("the session budget could not be read");
  const opened = await openSession(deps, input, cents);
  if (!opened.ok) return rejected(opened.reason);
  const { sessionId } = opened;
  const settings = await database("prd_turn_settings_record", {
    p_turn: input.turnId,
    p_model: PRD_MODEL,
    p_settings: {
      agentId: deps.config.agentId,
      environmentId: deps.config.environmentId,
      sessionId,
      budgetCents: cents,
    },
  });
  if (!settings.ok) return rejected("the provider settings could not be recorded");

  let stream: Response;
  try {
    stream = await deps.fetch(
      `${MANAGED_API}/v1/sessions/${sessionId}/events/stream?event_deltas[]=agent.message`,
      {
        method: "GET",
        headers: { ...managedHeaders(deps.config.apiKey), accept: "text/event-stream" },
      },
    );
  } catch {
    return rejected("the event stream could not be opened");
  }
  if (!stream.ok || stream.body === null) {
    await stream.body?.cancel().catch(() => undefined);
    return rejected("the event stream could not be opened");
  }

  const sent = await call(deps, "POST", `/v1/sessions/${sessionId}/events`, {
    events: [{ type: "user.message", content: [{ type: "text", text: input.text }] }],
  });
  if (!sent.ok) {
    await stream.body.cancel().catch(() => undefined);
    if (sent.status !== null && sent.status >= 400 && sent.status < 500)
      return rejected("the provider refused the message");
    return { outcome: "uncertain", reason: "the message may or may not have reached the provider" };
  }

  const pieces: string[] = [];
  const previews = new Map<string, string>();
  let streamed = "";
  let modelSeen = false;
  let activeSeconds: number | null = null;
  let lastEventId: string | null = null;
  let stopReason: string | null = null;
  const emit = (delta: string) => {
    if (delta === "") return;
    streamed += delta;
    hooks.onText(delta);
  };
  const startMessage = () => {
    if (streamed !== "" && !streamed.endsWith(SEPARATOR)) emit(SEPARATOR);
  };
  try {
    for await (const raw of serverEvents(stream.body)) {
      const event = toProviderEvent(raw, sessionId);
      if (event.id !== null) lastEventId = event.id;
      if (event.kind === "preview") {
        const seen = previews.get(event.messageId);
        if (seen === undefined) startMessage();
        previews.set(event.messageId, (seen ?? "") + event.text);
        emit(event.text);
      } else if (event.kind === "message") {
        const seen = previews.get(event.id);
        if (seen === undefined) {
          startMessage();
          emit(event.text);
        } else if (event.text.startsWith(seen)) {
          emit(event.text.slice(seen.length));
        }
        previews.delete(event.id);
        if (event.text !== "") pieces.push(event.text);
      } else if (event.kind === "model-start") {
        modelSeen = true;
      } else if (event.kind === "model-end") {
        modelSeen = true;
        if (!(await hooks.onModelEnd(event.record))) {
          return { outcome: "uncertain", reason: "a model request could not be recorded" };
        }
      } else if (event.kind === "runtime") {
        activeSeconds = event.activeSeconds;
      } else if (event.kind === "end") {
        stopReason = event.stopReason;
        break;
      }
    }
  } catch {
    return { outcome: "uncertain", reason: "the event stream broke before the turn ended" };
  }
  if (stopReason === null)
    return { outcome: "uncertain", reason: "the event stream ended before the turn ended" };
  if (!modelSeen) return rejected("the turn ended before any model request");
  activeSeconds ??= await sessionActiveSeconds(deps, sessionId);
  if (activeSeconds === null)
    return { outcome: "uncertain", reason: "the session runtime could not be read" };
  return {
    outcome: "answered",
    sessionId,
    text: pieces.join(SEPARATOR),
    capped: stopReason === "budget_reached",
    activeSeconds,
    lastEventId,
  };
}

/** Re-reads a session's events after the cursor, from this turn's message on. It never sends anything. */
export async function readTurnEvents(
  deps: Pick<ManagedDeps, "fetch" | "config">,
  sessionId: string,
  cursor: string | null,
): Promise<{ ok: true; turn: TurnEvents } | { ok: false; reason: string }> {
  const raw: unknown[] = [];
  let page: string | null = null;
  do {
    const query: string =
      page === null ? "limit=1000" : `limit=1000&page=${encodeURIComponent(page)}`;
    const listed = await call(deps, "GET", `/v1/sessions/${sessionId}/events?${query}`);
    if (!listed.ok || !isRecord(listed.value) || !Array.isArray(listed.value.data)) {
      return { ok: false, reason: "the session events could not be read" };
    }
    raw.push(...listed.value.data);
    page = text(listed.value.next_page);
  } while (page !== null);
  const events = raw.map((item) => toProviderEvent(item, sessionId));
  const at = cursor === null ? -1 : events.findIndex((event) => event.id === cursor);
  const after = events.slice(at + 1);
  let lastEventId: string | null = null;
  for (const event of after) if (event.id !== null) lastEventId = event.id;
  let start = -1;
  after.forEach((event, index) => {
    if (event.kind === "user-message") start = index;
  });
  return { ok: true, turn: { events: start === -1 ? [] : after.slice(start), lastEventId } };
}
