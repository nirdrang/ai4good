import { describe, expect, it } from "vitest";
import {
  MANAGED_API,
  managedConfig,
  prdAgentDefinition,
  prdEnvironmentDefinition,
  readTurnEvents,
  runManagedTurn,
  toProviderEvent,
  type ManagedConfig,
  type ManagedFetch,
  type ModelEnd,
  type StoredSession,
  type TurnInput,
} from "../../../supabase/functions/_shared/prd/managed.ts";
import type { SettleDatabase } from "../../../supabase/functions/_shared/write-routes.ts";

const CONFIG: ManagedConfig = {
  apiKey: "test-key-never-sent-anywhere",
  agentId: "agent_prd",
  environmentId: "env_prd",
  toolsUrl: "https://tools.example.test/functions/v1/prd-tools",
};
const TURN = "33333333-3333-4333-8333-333333333333";
const PROJECT = "55555555-5555-4555-8555-555555555555";
const SESSION = "sesn_new";
const STORED: StoredSession = {
  sessionId: "sesn_old",
  vaultId: "vlt_old",
  credentialId: "vcrd_old",
  generation: 3,
  cursor: "sevt_prev",
};

type Call = { method: string; path: string; body: unknown; headers: Record<string, string> };

type Script = {
  stream?: () => ReadableStream<Uint8Array>;
  send?: () => Promise<Response>;
  activeSeconds?: number;
  pages?: unknown[][];
};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function frames(events: readonly unknown[]): Uint8Array {
  const text = events
    .map(
      (event) => `event: ${(event as { type: string }).type}\ndata: ${JSON.stringify(event)}\n\n`,
    )
    .join(": heartbeat\n\n");
  return new TextEncoder().encode(text);
}

function sse(events: readonly unknown[], chunk = 11): () => ReadableStream<Uint8Array> {
  return () => {
    const bytes = frames(events);
    return new ReadableStream<Uint8Array>({
      start(controller) {
        for (let index = 0; index < bytes.length; index += chunk)
          controller.enqueue(bytes.slice(index, index + chunk));
        controller.close();
      },
    });
  };
}

function broken(events: readonly unknown[]): () => ReadableStream<Uint8Array> {
  return () => {
    let delivered = false;
    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (delivered) {
          controller.error(new Error("connection reset"));
          return;
        }
        delivered = true;
        controller.enqueue(frames(events));
      },
    });
  };
}

function anthropic(script: Script) {
  const calls: Call[] = [];
  let listed = 0;
  const fetch: ManagedFetch = async (url, init) => {
    expect(url.startsWith(MANAGED_API)).toBe(true);
    const path = url.slice(MANAGED_API.length);
    const method = init.method ?? "GET";
    const body = typeof init.body === "string" ? (JSON.parse(init.body) as unknown) : undefined;
    calls.push({ method, path, body, headers: init.headers as Record<string, string> });
    if (method === "POST" && path === "/v1/vaults") return json({ id: "vlt_new" });
    if (method === "POST" && /^\/v1\/vaults\/[^/]+\/credentials$/.test(path))
      return json({ id: "vcrd_new" });
    if (method === "POST" && /^\/v1\/vaults\/[^/]+\/credentials\/[^/]+$/.test(path))
      return json({ id: "vcrd_old" });
    if (method === "POST" && path === "/v1/sessions") return json({ id: SESSION });
    if (method === "GET" && /\/events\/stream\?/.test(path))
      return new Response((script.stream ?? sse([]))());
    if (method === "POST" && /^\/v1\/sessions\/[^/]+\/events$/.test(path)) {
      return script.send ? script.send() : json({ data: [] });
    }
    if (method === "GET" && /^\/v1\/sessions\/[^/]+\/events\?/.test(path)) {
      const pages = script.pages ?? [[]];
      const page = pages[listed] ?? [];
      listed += 1;
      return json({ data: page, next_page: listed < pages.length ? `page_${listed}` : null });
    }
    if (method === "POST" && /^\/v1\/sessions\/[^/]+$/.test(path))
      return json({ id: path.split("/")[3] });
    if (method === "GET" && /^\/v1\/sessions\/[^/]+$/.test(path)) {
      return json({
        id: path.split("/")[3],
        status: "idle",
        usage: { active_seconds: script.activeSeconds ?? 0 },
      });
    }
    throw new Error(`unexpected ${method} ${path}`);
  };
  return { fetch, calls };
}

function database(budgetCents = 7) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const rpc: SettleDatabase = async (name, args) => {
    calls.push({ name, args });
    if (name === "prd_session_budget") return { ok: true, value: budgetCents };
    if (name === "prd_session_rotate")
      return { ok: true, value: (args.p_generation as number) + 1 };
    return { ok: true, value: {} };
  };
  return { rpc, calls };
}

function input(session: StoredSession | null): TurnInput {
  return {
    turnId: TURN,
    projectId: PROJECT,
    chatKey: "main",
    text: "Hello",
    grantToken: "grant-token-1",
    session,
  };
}

const usage = {
  input_tokens: 1200,
  output_tokens: 300,
  cache_read_input_tokens: 40,
  cache_creation_input_tokens: 5,
};
const userMessage = (id: string) => ({
  type: "user.message",
  id,
  content: [{ type: "text", text: "Hello" }],
});
const running = (id: string) => ({ type: "session.status_running", id });
const modelStart = (id: string) => ({ type: "span.model_request_start", id });
const modelEnd = (id: string, modelUsage?: unknown) => ({
  type: "span.model_request_end",
  id,
  is_error: false,
  ...(modelUsage === undefined ? {} : { model_usage: modelUsage }),
});
const message = (id: string, text: string) => ({
  type: "agent.message",
  id,
  content: [{ type: "text", text }],
});
const preview = (eventId: string, text: string) => ({
  type: "event_delta",
  event_id: eventId,
  delta: { type: "content_delta", index: 0, content: { type: "text", text } },
});
const idle = (id: string, reason = "end_turn") => ({
  type: "session.status_idle",
  id,
  stop_reason: { type: reason },
});

function hooks() {
  const deltas: string[] = [];
  const ended: ModelEnd[] = [];
  return {
    deltas,
    ended,
    hooks: {
      onText: (delta: string) => deltas.push(delta),
      onModelEnd: async (record: ModelEnd) => {
        ended.push(record);
        return true;
      },
    },
  };
}

const ONE_REPLY = [
  userMessage("sevt_u"),
  running("sevt_r"),
  modelStart("sevt_s1"),
  { type: "event_start", event: { type: "agent.message", id: "sevt_m1" } },
  preview("sevt_m1", "Hel"),
  preview("sevt_m1", "lo there"),
  message("sevt_m1", "Hello there."),
  modelEnd("sevt_e1", usage),
  idle("sevt_i"),
];

describe("the Managed Agents caller", () => {
  it("creates the vault, the tools credential, and a budgeted session on a chat's first turn", async () => {
    const provider = anthropic({ stream: sse(ONE_REPLY), activeSeconds: 12.5 });
    const db = database(7);
    const run = hooks();
    const outcome = await runManagedTurn(
      { fetch: provider.fetch, config: CONFIG, rpc: db.rpc },
      input(null),
      run.hooks,
    );

    expect(outcome).toEqual({
      outcome: "answered",
      sessionId: SESSION,
      text: "Hello there.",
      capped: false,
      activeSeconds: 12.5,
      lastEventId: "sevt_i",
    });
    expect(provider.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "POST /v1/vaults",
      "POST /v1/vaults/vlt_new/credentials",
      "POST /v1/sessions",
      "GET /v1/sessions/sesn_new/events/stream?event_deltas[]=agent.message",
      "POST /v1/sessions/sesn_new/events",
      "GET /v1/sessions/sesn_new",
    ]);
    expect(provider.calls[1].body).toEqual({
      display_name: "PRD tools",
      auth: { type: "static_bearer", mcp_server_url: CONFIG.toolsUrl, token: "grant-token-1" },
    });
    expect(provider.calls[2].body).toEqual({
      agent: "agent_prd",
      environment_id: "env_prd",
      vault_ids: ["vlt_new"],
      budget: { type: "limit", max_list_cost: { amount: "7", currency: "USD" } },
      metadata: { project: PROJECT, chat: "main" },
    });
    expect(provider.calls[4].body).toEqual({
      events: [{ type: "user.message", content: [{ type: "text", text: "Hello" }] }],
    });
    for (const call of provider.calls) {
      expect(call.headers["x-api-key"]).toBe(CONFIG.apiKey);
      expect(call.headers["anthropic-version"]).toBe("2026-10-21");
      expect(call.headers["anthropic-beta"]).toBe("managed-agents-2026-04-01");
    }
    expect(db.calls.map((call) => call.name)).toEqual([
      "prd_session_budget",
      "prd_session_open",
      "prd_turn_settings_record",
    ]);
    expect(db.calls[1].args).toEqual({
      p_turn: TURN,
      p_session: SESSION,
      p_vault: "vlt_new",
      p_credential: "vcrd_new",
    });
    expect(db.calls[2].args).toEqual({
      p_turn: TURN,
      p_model: "claude-haiku-5-5",
      p_settings: {
        agentId: "agent_prd",
        environmentId: "env_prd",
        sessionId: SESSION,
        budgetCents: 7,
      },
    });
    expect(run.deltas.join("")).toBe("Hello there.");
    expect(run.ended).toEqual([
      {
        kind: "model-end",
        sessionId: SESSION,
        eventId: "sevt_e1",
        usage: { input: 1200, output: 300, cacheRead: 40, cacheWrite: 5 },
      },
    ]);
  });

  it("rotates the credential and moves the budget on a later turn, and never creates a second session", async () => {
    const provider = anthropic({ stream: sse(ONE_REPLY), activeSeconds: 30 });
    const db = database(12);
    const outcome = await runManagedTurn(
      { fetch: provider.fetch, config: CONFIG, rpc: db.rpc },
      input(STORED),
      hooks().hooks,
    );
    expect(outcome.outcome).toBe("answered");
    expect(provider.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "POST /v1/vaults/vlt_old/credentials/vcrd_old",
      "POST /v1/sessions/sesn_old",
      "GET /v1/sessions/sesn_old/events/stream?event_deltas[]=agent.message",
      "POST /v1/sessions/sesn_old/events",
      "GET /v1/sessions/sesn_old",
    ]);
    expect(provider.calls[0].body).toEqual({
      auth: { type: "static_bearer", token: "grant-token-1" },
    });
    expect(provider.calls[1].body).toEqual({
      budget: { type: "limit", max_list_cost: { amount: "12", currency: "USD" } },
    });
    expect(db.calls.map((call) => call.name)).toEqual([
      "prd_session_budget",
      "prd_session_rotate",
      "prd_turn_settings_record",
    ]);
    expect(db.calls[1].args).toEqual({ p_turn: TURN, p_generation: 3 });
  });

  it("opens the event stream before it sends the message", async () => {
    const provider = anthropic({ stream: sse(ONE_REPLY), activeSeconds: 1 });
    await runManagedTurn(
      { fetch: provider.fetch, config: CONFIG, rpc: database().rpc },
      input(STORED),
      hooks().hooks,
    );
    const streamAt = provider.calls.findIndex((call) => call.path.includes("/events/stream"));
    const sendAt = provider.calls.findIndex(
      (call) => call.method === "POST" && call.path.endsWith("/events"),
    );
    expect(streamAt).toBeGreaterThanOrEqual(0);
    expect(sendAt).toBeGreaterThan(streamAt);
  });

  it("settles every model request of a reply with several, in order, and joins the messages", async () => {
    const events = [
      userMessage("sevt_u"),
      modelStart("sevt_s1"),
      message("sevt_m1", "Let me read the section."),
      modelEnd("sevt_e1", usage),
      {
        type: "agent.mcp_tool_use",
        id: "sevt_t1",
        name: "read_section",
        evaluated_permission: "allow",
      },
      { type: "agent.mcp_tool_result", id: "sevt_t2" },
      modelStart("sevt_s2"),
      message("sevt_m2", "Done."),
      modelEnd("sevt_e2", { input_tokens: 10, output_tokens: 2 }),
      { type: "session.usage", id: "sevt_usage", active_seconds: 41.25 },
      idle("sevt_i"),
    ];
    const provider = anthropic({ stream: sse(events) });
    const run = hooks();
    const outcome = await runManagedTurn(
      { fetch: provider.fetch, config: CONFIG, rpc: database().rpc },
      input(STORED),
      run.hooks,
    );
    expect(outcome).toMatchObject({
      outcome: "answered",
      text: "Let me read the section.\n\nDone.",
      activeSeconds: 41.25,
    });
    expect(run.deltas.join("")).toBe("Let me read the section.\n\nDone.");
    expect(run.ended.map((record) => record.eventId)).toEqual(["sevt_e1", "sevt_e2"]);
    expect(run.ended[1].usage).toEqual({ input: 10, output: 2, cacheRead: 0, cacheWrite: 0 });
    expect(
      provider.calls.some((call) => call.method === "GET" && call.path === "/v1/sessions/sesn_old"),
    ).toBe(false);
  });

  it("passes a model request without usage on as pending", async () => {
    const events = [
      userMessage("sevt_u"),
      modelStart("sevt_s1"),
      modelEnd("sevt_e1"),
      idle("sevt_i"),
    ];
    const provider = anthropic({ stream: sse(events), activeSeconds: 2 });
    const run = hooks();
    const outcome = await runManagedTurn(
      { fetch: provider.fetch, config: CONFIG, rpc: database().rpc },
      input(STORED),
      run.hooks,
    );
    expect(outcome.outcome).toBe("answered");
    expect(run.ended).toEqual([
      { kind: "model-end", sessionId: "sesn_old", eventId: "sevt_e1", usage: null },
    ]);
  });

  it("hands a duplicate event on with the same id, so the ledger's unique key settles it once", async () => {
    const events = [
      userMessage("sevt_u"),
      modelEnd("sevt_e1", usage),
      modelEnd("sevt_e1", usage),
      idle("sevt_i"),
    ];
    const provider = anthropic({ stream: sse(events), activeSeconds: 2 });
    const run = hooks();
    await runManagedTurn(
      { fetch: provider.fetch, config: CONFIG, rpc: database().rpc },
      input(STORED),
      run.hooks,
    );
    expect(run.ended).toHaveLength(2);
    expect(run.ended[0]).toEqual(run.ended[1]);
  });

  it("calls a stream that breaks mid-turn uncertain, and sends the message only once", async () => {
    const provider = anthropic({
      stream: broken([userMessage("sevt_u"), modelStart("sevt_s1"), modelEnd("sevt_e1", usage)]),
    });
    const run = hooks();
    const outcome = await runManagedTurn(
      { fetch: provider.fetch, config: CONFIG, rpc: database().rpc },
      input(STORED),
      run.hooks,
    );
    expect(outcome.outcome).toBe("uncertain");
    expect(run.ended.map((record) => record.eventId)).toEqual(["sevt_e1"]);
    const sends = provider.calls.filter(
      (call) => call.method === "POST" && call.path.endsWith("/events"),
    );
    expect(sends).toHaveLength(1);
  });

  it("calls a stream that closes before the turn ends uncertain", async () => {
    const provider = anthropic({ stream: sse([userMessage("sevt_u"), modelStart("sevt_s1")]) });
    const outcome = await runManagedTurn(
      { fetch: provider.fetch, config: CONFIG, rpc: database().rpc },
      input(STORED),
      hooks().hooks,
    );
    expect(outcome.outcome).toBe("uncertain");
  });

  it("calls a send that times out or fails on the server uncertain, and never sends again", async () => {
    for (const send of [
      async () => {
        throw new DOMException("The operation timed out.", "TimeoutError");
      },
      async () => json({ type: "error", error: { type: "api_error", message: "boom" } }, 500),
    ]) {
      const provider = anthropic({ stream: sse(ONE_REPLY), send });
      const run = hooks();
      const outcome = await runManagedTurn(
        { fetch: provider.fetch, config: CONFIG, rpc: database().rpc },
        input(STORED),
        run.hooks,
      );
      expect(outcome.outcome).toBe("uncertain");
      expect(run.ended).toEqual([]);
      expect(
        provider.calls.filter((call) => call.method === "POST" && call.path.endsWith("/events")),
      ).toHaveLength(1);
    }
  });

  it("calls a send refused before any model request rejected", async () => {
    const provider = anthropic({
      stream: sse(ONE_REPLY),
      send: async () =>
        json(
          { type: "error", error: { type: "invalid_request_error", message: "budget reached" } },
          400,
        ),
    });
    const run = hooks();
    const outcome = await runManagedTurn(
      { fetch: provider.fetch, config: CONFIG, rpc: database().rpc },
      input(STORED),
      run.hooks,
    );
    expect(outcome).toEqual({ outcome: "rejected", reason: "the provider refused the message" });
    expect(run.ended).toEqual([]);
    expect(run.deltas).toEqual([]);
  });

  it("answers a turn that reached its budget, marked as capped", async () => {
    const events = [
      userMessage("sevt_u"),
      modelStart("sevt_s1"),
      message("sevt_m1", "Partial answer."),
      modelEnd("sevt_e1", usage),
      {
        type: "session.thread_status_idle",
        id: "sevt_ti",
        stop_reason: { type: "budget_reached" },
      },
      {
        type: "session.usage",
        id: "sevt_usage",
        active_seconds: 9,
        list_cost: { amount: "8", currency: "USD" },
      },
      idle("sevt_i", "budget_reached"),
    ];
    const provider = anthropic({ stream: sse(events) });
    const outcome = await runManagedTurn(
      { fetch: provider.fetch, config: CONFIG, rpc: database().rpc },
      input(STORED),
      hooks().hooks,
    );
    expect(outcome).toMatchObject({
      outcome: "answered",
      capped: true,
      activeSeconds: 9,
      text: "Partial answer.",
    });
  });

  it("ignores an event kind it does not know", async () => {
    const events = [
      userMessage("sevt_u"),
      { type: "session.something_new", id: "sevt_x", payload: { a: 1 } },
      { type: "workflow_run.created", id: "sevt_w" },
      modelStart("sevt_s1"),
      modelEnd("sevt_e1", usage),
      idle("sevt_i"),
    ];
    const provider = anthropic({ stream: sse(events), activeSeconds: 3 });
    const outcome = await runManagedTurn(
      { fetch: provider.fetch, config: CONFIG, rpc: database().rpc },
      input(STORED),
      hooks().hooks,
    );
    expect(outcome.outcome).toBe("answered");
    expect(toProviderEvent({ type: "session.something_new", id: "sevt_x" }, "s")).toEqual({
      kind: "ignored",
      id: "sevt_x",
    });
    expect(toProviderEvent("not an event", "s")).toEqual({ kind: "ignored", id: null });
    expect(toProviderEvent(idle("sevt_q", "requires_action"), "s")).toEqual({
      kind: "ignored",
      id: "sevt_q",
    });
    expect(toProviderEvent({ type: "session.status_terminated", id: "sevt_t" }, "s")).toEqual({
      kind: "end",
      id: "sevt_t",
      stopReason: "terminated",
    });
  });

  it("maps the same events read through events.list to the same records as the stream", async () => {
    const turn = [
      userMessage("sevt_u2"),
      modelStart("sevt_s1"),
      message("sevt_m1", "Hello there."),
      modelEnd("sevt_e1", usage),
      modelEnd("sevt_e2"),
      { type: "session.usage", id: "sevt_usage", active_seconds: 15 },
      idle("sevt_i"),
    ];
    const provider = anthropic({ stream: sse(turn) });
    const run = hooks();
    await runManagedTurn(
      { fetch: provider.fetch, config: CONFIG, rpc: database().rpc },
      input(STORED),
      run.hooks,
    );

    const history = [
      userMessage("sevt_u1"),
      modelEnd("sevt_old", usage),
      idle("sevt_prev"),
      ...turn.slice(0, 4),
    ];
    const lister = anthropic({ pages: [history, turn.slice(4)] });
    const listed = await readTurnEvents(
      { fetch: lister.fetch, config: CONFIG },
      "sesn_old",
      "sevt_prev",
    );
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    const records = listed.turn.events.flatMap((event) =>
      event.kind === "model-end" ? [event.record] : [],
    );
    expect(records).toEqual(run.ended);
    expect(listed.turn.lastEventId).toBe("sevt_i");
    expect(listed.turn.events.map((event) => event.kind)).toEqual([
      "user-message",
      "model-start",
      "message",
      "model-end",
      "model-end",
      "runtime",
      "end",
    ]);
    expect(lister.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      "GET /v1/sessions/sesn_old/events?limit=1000",
      "GET /v1/sessions/sesn_old/events?limit=1000&page=page_1",
    ]);
    expect(lister.calls.every((call) => call.method === "GET")).toBe(true);
  });

  it("reads only the latest message's events after the cursor", async () => {
    const lister = anthropic({
      pages: [
        [
          userMessage("sevt_u1"),
          modelEnd("sevt_late", usage),
          userMessage("sevt_u2"),
          modelStart("sevt_s"),
        ],
      ],
    });
    const listed = await readTurnEvents({ fetch: lister.fetch, config: CONFIG }, "sesn_old", null);
    expect(listed.ok && listed.turn.events.map((event) => event.id)).toEqual(["sevt_u2", "sevt_s"]);
    const empty = anthropic({
      pages: [[idle("sevt_a"), { type: "session.usage", id: "sevt_b", active_seconds: 1 }]],
    });
    const none = await readTurnEvents({ fetch: empty.fetch, config: CONFIG }, "sesn_old", null);
    expect(none).toEqual({ ok: true, turn: { events: [], lastEventId: "sevt_b" } });
  });
});

describe("the Managed Agents configuration", () => {
  it("names every missing setting", () => {
    expect(managedConfig({})).toEqual({
      ok: false,
      missing: [
        "ANTHROPIC_API_KEY",
        "PRD_MANAGED_AGENT_ID",
        "PRD_MANAGED_ENVIRONMENT_ID",
        "PRD_TOOLS_PUBLIC_URL",
      ],
    });
    expect(
      managedConfig({
        ANTHROPIC_API_KEY: "k",
        PRD_MANAGED_AGENT_ID: "a",
        PRD_MANAGED_ENVIRONMENT_ID: "e",
        PRD_TOOLS_PUBLIC_URL: "http://localhost:54321/functions/v1/prd-tools",
      }),
    ).toEqual({ ok: false, missing: ["PRD_TOOLS_PUBLIC_URL"] });
  });

  it("defines an agent with the PRD tools only, always allowed, on Haiku", () => {
    const agent = prdAgentDefinition(CONFIG.toolsUrl);
    expect(agent.model).toBe("claude-haiku-5-5");
    expect(agent.mcp_servers).toEqual([{ type: "url", name: "prd", url: CONFIG.toolsUrl }]);
    expect(agent.tools).toEqual([
      {
        type: "mcp_toolset",
        mcp_server_name: "prd",
        default_config: { enabled: true, permission_policy: { type: "always_allow" } },
      },
    ]);
    expect(String(agent.system)).toContain("commit_turn");
    expect(prdEnvironmentDefinition()).toEqual({
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
    });
  });
});
