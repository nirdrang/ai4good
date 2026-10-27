import { describe, expect, it } from "vitest";
import type { Caller } from "../../../supabase/functions/_shared/caller.ts";
import { MANAGED_API, type ManagedFetch } from "../../../supabase/functions/_shared/prd/managed.ts";
import {
  catchUpChat,
  catchUpOverdue,
  PRD_MODEL_UNAVAILABLE,
  PRD_TURN_DEADLINE_SECONDS,
  prdRelayDeps,
  type PrdRelayDeps,
} from "../../../supabase/functions/_shared/prd/relay.ts";
import {
  prdMessagePrepare,
  prdMessageSettle,
  type PrdMessageArgs,
} from "../../../supabase/functions/_shared/prd/routes.ts";
import type { CallerReads } from "../../../supabase/functions/_shared/tenant-reads.ts";
import type { SettleDatabase } from "../../../supabase/functions/_shared/write-routes.ts";

const KEY = "prd-grant-signing-key-for-the-offline-tests";
const PROJECT = "55555555-5555-4555-8555-555555555555";
const CHAT = "66666666-6666-4666-8666-666666666666";
const TURN = "33333333-3333-4333-8333-333333333333";
const GRANT = "44444444-4444-4444-8444-444444444444";
const QUESTION = "77777777-7777-4777-8777-777777777777";
const CONFIG = {
  apiKey: "test-key-never-sent-anywhere",
  agentId: "agent_prd",
  environmentId: "env_prd",
  toolsUrl: "https://tools.example.test/functions/v1/prd-tools",
};

type TurnJson = {
  id: string;
  kind: "reply" | "answer-write";
  state: "admitted" | "uncertain";
  dispatched: boolean;
  ageSeconds: number;
  parts: unknown[];
  modelRequests: number;
};

type SessionJson = {
  sessionId: string;
  vaultId: string;
  credentialId: string;
  generation: number;
  cursor: string | null;
};

const SESSION: SessionJson = {
  sessionId: "sesn_old",
  vaultId: "vlt_old",
  credentialId: "vcrd_old",
  generation: 2,
  cursor: "sevt_prev",
};

function freshTurn(overrides: Partial<TurnJson> = {}): TurnJson {
  return {
    id: TURN,
    kind: "reply",
    state: "admitted",
    dispatched: false,
    ageSeconds: 1,
    parts: [{ type: "text", text: "Who books shifts?" }],
    modelRequests: 0,
    ...overrides,
  };
}

function database(state: {
  session: SessionJson | null;
  turn: TurnJson | null;
  dispatch?: boolean;
  overdue?: string[];
}) {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const rpc: SettleDatabase = async (name, args) => {
    calls.push({ name, args });
    switch (name) {
      case "prd_session_read":
        return {
          ok: true,
          value: {
            chatId: CHAT,
            chatKey: args.p_chat_key,
            session: state.session,
            turn: state.turn,
          },
        };
      case "prd_turn_dispatch":
        return { ok: true, value: state.dispatch ?? true };
      case "prd_grant_issue":
        return { ok: true, value: GRANT };
      case "prd_grant_claims":
        return {
          ok: true,
          value: {
            grant: GRANT,
            project: PROJECT,
            chat: CHAT,
            turn: TURN,
            expiresAt: "2099-01-01T00:00:00.000Z",
          },
        };
      case "prd_session_budget":
        return { ok: true, value: 5 };
      case "prd_session_rotate":
        return { ok: true, value: (args.p_generation as number) + 1 };
      case "prd_session_advance":
        return { ok: true, value: true };
      case "prd_append_message":
        return { ok: true, value: { id: "88888888-8888-4888-8888-888888888888", sequence: 9 } };
      case "prd_turns_overdue":
        return { ok: true, value: state.overdue ?? [] };
      default:
        return { ok: true, value: {} };
    }
  };
  const named = (name: string) => calls.filter((call) => call.name === name);
  return { rpc, calls, named };
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function sse(events: readonly unknown[]): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(
    events
      .map(
        (event) => `event: ${(event as { type: string }).type}\ndata: ${JSON.stringify(event)}\n\n`,
      )
      .join(""),
  );
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function anthropic(script: {
  stream?: unknown[];
  send?: number;
  history?: unknown[];
  activeSeconds?: number;
}) {
  const calls: Array<{ method: string; path: string; body: unknown }> = [];
  const fetch: ManagedFetch = async (url, init) => {
    const path = url.slice(MANAGED_API.length);
    const method = init.method ?? "GET";
    calls.push({
      method,
      path,
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    });
    if (method === "POST" && path === "/v1/vaults") return json({ id: "vlt_new" });
    if (method === "POST" && /\/credentials$/.test(path)) return json({ id: "vcrd_new" });
    if (method === "POST" && /\/credentials\/[^/]+$/.test(path)) return json({ id: "vcrd_old" });
    if (method === "POST" && path === "/v1/sessions") return json({ id: "sesn_new" });
    if (method === "GET" && path.includes("/events/stream"))
      return new Response(sse(script.stream ?? []));
    if (method === "POST" && path.endsWith("/events")) {
      return script.send === undefined ? json({ data: [] }) : json({ type: "error" }, script.send);
    }
    if (method === "GET" && path.includes("/events?"))
      return json({ data: script.history ?? [], next_page: null });
    if (method === "POST" && /^\/v1\/sessions\/[^/]+$/.test(path)) return json({});
    if (method === "GET" && /^\/v1\/sessions\/[^/]+$/.test(path)) {
      return json({ usage: { active_seconds: script.activeSeconds ?? 20 } });
    }
    throw new Error(`unexpected ${method} ${path}`);
  };
  return { fetch, calls };
}

function relay(rpc: SettleDatabase, fetch: ManagedFetch): PrdRelayDeps {
  return { rpc, grantKey: KEY, managed: { fetch, config: CONFIG } };
}

function args(chatKey = "main"): PrdMessageArgs {
  return {
    p_actor: "99999999-9999-4999-8999-999999999999",
    p_project: PROJECT,
    p_chat_key: chatKey,
    p_request_id: "request-1",
    p_base_revision: 1,
    p_intent: { kind: "text", text: "Who books shifts?" },
    p_body_hash: "hash",
  };
}

const usage = {
  input_tokens: 900,
  output_tokens: 120,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};
const userMessage = (id: string) => ({ type: "user.message", id, content: [] });
const modelStart = (id: string) => ({ type: "span.model_request_start", id });
const modelEnd = (id: string) => ({ type: "span.model_request_end", id, model_usage: usage });
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

const REPLY = [
  userMessage("sevt_u"),
  modelStart("sevt_s1"),
  preview("sevt_m1", "Volunteers "),
  preview("sevt_m1", "book"),
  message("sevt_m1", "Volunteers book themselves."),
  modelEnd("sevt_e1"),
  modelStart("sevt_s2"),
  message("sevt_m2", "I staged the section."),
  modelEnd("sevt_e2"),
  { type: "session.usage", id: "sevt_usage", active_seconds: 33 },
  idle("sevt_i"),
];

function ingested(calls: Array<{ name: string; args: Record<string, unknown> }>) {
  return calls
    .filter((call) => call.name === "prd_turn_ingest")
    .map((call) => call.args.p_event as Record<string, unknown>);
}

describe("the relay inside prd-message", () => {
  it("streams the reply's text in order and hands back the end event for the edge to settle last", async () => {
    const db = database({ session: SESSION, turn: freshTurn() });
    const provider = anthropic({ stream: REPLY });
    const settle = prdMessageSettle(relay(db.rpc, provider.fetch));
    const deltas: string[] = [];
    const result = await settle.stream(
      { turnId: TURN, messageId: "m", sequence: 4 },
      args(),
      (delta) => deltas.push(delta),
    );

    expect(settle.rpc).toBe("prd_turn_ingest");
    expect(deltas).toEqual([
      "Volunteers ",
      "book",
      " themselves.",
      "\n\n",
      "I staged the section.",
    ]);
    expect(result).toEqual({
      args: { p_turn: TURN, p_event: { kind: "end", outcome: "answered" } },
      failure: null,
    });
  });

  it("ingests every model request and then the runtime, appends the reply once, and leaves the end to the edge", async () => {
    const db = database({ session: SESSION, turn: freshTurn() });
    const provider = anthropic({ stream: REPLY });
    await prdMessageSettle(relay(db.rpc, provider.fetch)).stream(
      { turnId: TURN },
      args(),
      () => undefined,
    );

    expect(ingested(db.calls)).toEqual([
      {
        kind: "model-end",
        sessionId: "sesn_old",
        eventId: "sevt_e1",
        usage: { input: 900, output: 120, cacheRead: 0, cacheWrite: 0 },
      },
      {
        kind: "model-end",
        sessionId: "sesn_old",
        eventId: "sevt_e2",
        usage: { input: 900, output: 120, cacheRead: 0, cacheWrite: 0 },
      },
      { kind: "runtime", sessionId: "sesn_old", activeSeconds: 33 },
    ]);
    const order = db.calls.map((call) => call.name);
    const lastIngest = order.lastIndexOf("prd_turn_ingest");
    expect(order.indexOf("prd_session_advance")).toBeGreaterThan(lastIngest);
    expect(order.indexOf("prd_append_message")).toBeGreaterThan(
      order.indexOf("prd_session_advance"),
    );
    expect(db.named("prd_session_advance")[0].args).toEqual({
      p_turn: TURN,
      p_from: "sevt_prev",
      p_to: "sevt_i",
    });
    expect(db.named("prd_append_message")).toEqual([
      {
        name: "prd_append_message",
        args: {
          p_project: PROJECT,
          p_chat_key: "main",
          p_actor_kind: "ai",
          p_actor_name: "ai4good AI",
          p_parts: [{ type: "text", text: "Volunteers book themselves.\n\nI staged the section." }],
          p_for_role: null,
          p_actor_id: null,
        },
      },
    ]);
    const sent = provider.calls.filter(
      (call) => call.method === "POST" && call.path.endsWith("/events"),
    );
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toEqual({
      events: [
        {
          type: "user.message",
          content: [{ type: "text", text: "This message is in the main chat.\nWho books shifts?" }],
        },
      ],
    });
  });

  it("issues the grant in the mode of the turn", async () => {
    for (const [kind, chatKey] of [
      ["reply", "topic:booking"],
      ["answer-write", `side:${QUESTION}`],
    ] as const) {
      const db = database({ session: SESSION, turn: freshTurn({ kind, parts: [] }) });
      const provider = anthropic({ stream: REPLY });
      await prdMessageSettle(relay(db.rpc, provider.fetch)).stream(
        { turnId: TURN },
        args(chatKey),
        () => undefined,
      );
      expect(db.named("prd_grant_issue")[0].args).toEqual({
        p_turn: TURN,
        p_mode: kind,
        p_ttl_seconds: 900,
      });
      expect(db.named("prd_turn_dispatch")).toHaveLength(1);
    }
  });

  it("ends a turn the provider refused as rejected, with nothing appended", async () => {
    const db = database({ session: SESSION, turn: freshTurn() });
    const provider = anthropic({ stream: REPLY, send: 400 });
    const result = await prdMessageSettle(relay(db.rpc, provider.fetch)).stream(
      { turnId: TURN },
      args(),
      () => undefined,
    );
    expect(result.args).toEqual({ p_turn: TURN, p_event: { kind: "end", outcome: "rejected" } });
    expect(result.failure).not.toBeNull();
    expect(ingested(db.calls)).toEqual([]);
    expect(db.named("prd_append_message")).toEqual([]);
  });

  it("ends a turn whose stream broke as uncertain, keeping what landed and charging no runtime yet", async () => {
    const db = database({ session: SESSION, turn: freshTurn() });
    const provider = anthropic({ stream: REPLY.slice(0, 6) });
    const result = await prdMessageSettle(relay(db.rpc, provider.fetch)).stream(
      { turnId: TURN },
      args(),
      () => undefined,
    );
    expect(result.args).toEqual({ p_turn: TURN, p_event: { kind: "end", outcome: "uncertain" } });
    expect(ingested(db.calls).map((event) => event.kind)).toEqual(["model-end"]);
    expect(db.named("prd_session_advance")).toEqual([]);
    expect(db.named("prd_append_message")).toEqual([]);
  });

  it("answers a turn at its spending cap with a short refusal part", async () => {
    const db = database({ session: SESSION, turn: freshTurn() });
    const provider = anthropic({
      stream: [
        userMessage("sevt_u"),
        modelStart("sevt_s"),
        message("sevt_m", "Part"),
        modelEnd("sevt_e"),
        idle("sevt_i", "budget_reached"),
      ],
    });
    const result = await prdMessageSettle(relay(db.rpc, provider.fetch)).stream(
      { turnId: TURN },
      args(),
      () => undefined,
    );
    expect(result).toEqual({
      args: { p_turn: TURN, p_event: { kind: "end", outcome: "answered" } },
      failure: "This reply reached its spending cap.",
    });
  });

  it("never sends a replayed request to the provider again", async () => {
    for (const db of [
      database({ session: SESSION, turn: freshTurn({ dispatched: true }), dispatch: false }),
      database({ session: SESSION, turn: null }),
    ]) {
      const provider = anthropic({ stream: REPLY });
      const result = await prdMessageSettle(relay(db.rpc, provider.fetch)).stream(
        { turnId: TURN },
        args(),
        () => undefined,
      );
      expect(result).toEqual({ args: null, failure: "This message was already sent." });
      expect(provider.calls).toEqual([]);
    }
  });

  it("keeps the JSON answer when the request does not ask for a stream", async () => {
    const db = database({ session: SESSION, turn: freshTurn() });
    const settle = prdMessageSettle(relay(db.rpc, anthropic({}).fetch));
    expect(await settle.act()).toEqual({ args: null, failure: null, skipSettle: true });
    expect(db.calls).toEqual([]);
  });
});

describe("the relay without its settings", () => {
  const caller = { id: "99999999-9999-4999-8999-999999999999" } as Caller;
  const reads = {} as CallerReads;

  it("refuses a model turn with a fixed reason before any money is held", async () => {
    const db = database({ session: null, turn: null });
    const deps = prdRelayDeps({
      rpc: db.rpc,
      fetch: anthropic({}).fetch,
      env: { ANTHROPIC_API_KEY: "k", PRD_GRANT_SIGNING_KEY: KEY },
    });
    expect(deps.managed).toBeNull();
    expect(await prdMessagePrepare(deps)(caller, args(), reads, true)).toEqual({
      ok: false,
      kind: "refused",
      status: 503,
      reason: PRD_MODEL_UNAVAILABLE,
    });
    expect(db.calls).toEqual([]);
    expect(await prdMessageSettle(deps).stream({ turnId: TURN }, args(), () => undefined)).toEqual({
      args: null,
      failure: PRD_MODEL_UNAVAILABLE,
    });
    expect(db.calls).toEqual([]);
  });

  it("still reserves a JSON send, which runs no model", async () => {
    const db = database({ session: null, turn: null });
    const deps = prdRelayDeps({ rpc: db.rpc, fetch: anthropic({}).fetch, env: {} });
    expect(await prdMessagePrepare(deps)(caller, args(), reads, false)).toEqual({
      ok: true,
      args: args(),
    });
    expect(db.calls).toEqual([]);
  });

  it("needs a usable grant key as well as the Managed Agents settings", () => {
    const env = {
      ANTHROPIC_API_KEY: "k",
      PRD_MANAGED_AGENT_ID: "agent_prd",
      PRD_MANAGED_ENVIRONMENT_ID: "env_prd",
      PRD_TOOLS_PUBLIC_URL: CONFIG.toolsUrl,
    };
    const rpc = database({ session: null, turn: null }).rpc;
    const fetch = anthropic({}).fetch;
    expect(
      prdRelayDeps({ rpc, fetch, env: { ...env, PRD_GRANT_SIGNING_KEY: "short" } }).managed,
    ).toBeNull();
    expect(
      prdRelayDeps({ rpc, fetch, env: { ...env, PRD_GRANT_SIGNING_KEY: KEY } }).managed,
    ).not.toBeNull();
  });
});

describe("catch-up", () => {
  const history = [
    userMessage("sevt_u0"),
    modelEnd("sevt_old"),
    idle("sevt_prev"),
    userMessage("sevt_u"),
    modelStart("sevt_s1"),
    message("sevt_m1", "Volunteers book themselves."),
    modelEnd("sevt_e1"),
    modelStart("sevt_s2"),
    modelEnd("sevt_e2"),
    idle("sevt_i"),
  ];

  it("ingests what landed after an uncertain turn, moves the cursor after the ingests, then appends and ends", async () => {
    const db = database({
      session: SESSION,
      turn: freshTurn({ state: "uncertain", dispatched: true, modelRequests: 1 }),
    });
    const provider = anthropic({ history, activeSeconds: 44 });
    await catchUpChat(relay(db.rpc, provider.fetch), PROJECT, "main");

    expect(ingested(db.calls)).toEqual([
      {
        kind: "model-end",
        sessionId: "sesn_old",
        eventId: "sevt_e1",
        usage: { input: 900, output: 120, cacheRead: 0, cacheWrite: 0 },
      },
      {
        kind: "model-end",
        sessionId: "sesn_old",
        eventId: "sevt_e2",
        usage: { input: 900, output: 120, cacheRead: 0, cacheWrite: 0 },
      },
      { kind: "runtime", sessionId: "sesn_old", activeSeconds: 44 },
      { kind: "end", outcome: "answered" },
    ]);
    const order = db.calls.map((call) => call.name);
    const advanceAt = order.indexOf("prd_session_advance");
    const ingestAts = order.flatMap((name, index) => (name === "prd_turn_ingest" ? [index] : []));
    expect(advanceAt).toBeGreaterThan(ingestAts[2]);
    expect(advanceAt).toBeLessThan(ingestAts[3]);
    expect(db.named("prd_session_advance")[0].args).toEqual({
      p_turn: TURN,
      p_from: "sevt_prev",
      p_to: "sevt_i",
    });
    expect(db.named("prd_append_message")).toHaveLength(1);
    expect(order.indexOf("prd_append_message")).toBeLessThan(ingestAts[3]);
  });

  it("never sends a message or calls the model", async () => {
    const db = database({
      session: SESSION,
      turn: freshTurn({ state: "uncertain", dispatched: true }),
    });
    const provider = anthropic({ history });
    await catchUpChat(relay(db.rpc, provider.fetch), PROJECT, "main");
    expect(provider.calls.length).toBeGreaterThan(0);
    expect(provider.calls.every((call) => call.method === "GET")).toBe(true);
    expect(db.named("prd_turn_dispatch")).toEqual([]);
    expect(db.named("prd_grant_issue")).toEqual([]);
  });

  it("leaves a turn that is still being answered alone", async () => {
    const db = database({ session: SESSION, turn: freshTurn({ dispatched: true, ageSeconds: 5 }) });
    const provider = anthropic({ history });
    await catchUpChat(relay(db.rpc, provider.fetch), PROJECT, "main");
    expect(provider.calls).toEqual([]);
    expect(db.calls.map((call) => call.name)).toEqual(["prd_session_read"]);
  });

  it("rejects an overdue turn that was never sent, without asking the provider", async () => {
    const db = database({
      session: SESSION,
      turn: freshTurn({ ageSeconds: PRD_TURN_DEADLINE_SECONDS + 1 }),
    });
    const provider = anthropic({ history });
    await catchUpChat(relay(db.rpc, provider.fetch), PROJECT, "main");
    expect(provider.calls).toEqual([]);
    expect(ingested(db.calls)).toEqual([{ kind: "end", outcome: "rejected" }]);
  });

  it("rejects a turn whose message never reached the session and whose events show no model request", async () => {
    const db = database({
      session: SESSION,
      turn: freshTurn({ state: "uncertain", dispatched: true }),
    });
    const provider = anthropic({ history: history.slice(0, 3) });
    await catchUpChat(relay(db.rpc, provider.fetch), PROJECT, "main");
    expect(ingested(db.calls)).toEqual([{ kind: "end", outcome: "rejected" }]);
    expect(db.named("prd_append_message")).toEqual([]);
  });

  it("marks an overdue turn that has not ended uncertain and keeps the cursor", async () => {
    const db = database({
      session: SESSION,
      turn: freshTurn({ dispatched: true, ageSeconds: PRD_TURN_DEADLINE_SECONDS + 1 }),
    });
    const provider = anthropic({ history: history.slice(0, 7) });
    await catchUpChat(relay(db.rpc, provider.fetch), PROJECT, "main");
    expect(ingested(db.calls).map((event) => event.kind)).toEqual(["model-end", "end"]);
    expect(ingested(db.calls)[1]).toEqual({ kind: "end", outcome: "uncertain" });
    expect(db.named("prd_session_advance")).toEqual([]);
  });

  it("stops before the cursor moves when an ingest is refused", async () => {
    const db = database({
      session: SESSION,
      turn: freshTurn({ state: "uncertain", dispatched: true }),
    });
    const refusing: SettleDatabase = async (name, callArgs) =>
      name === "prd_turn_ingest"
        ? { ok: false, message: "no", details: "invalid-request" }
        : db.rpc(name, callArgs);
    await catchUpChat(relay(refusing, anthropic({ history }).fetch), PROJECT, "main");
    expect(db.named("prd_session_advance")).toEqual([]);
    expect(db.named("prd_append_message")).toEqual([]);
  });

  it("catches up every overdue chat a snapshot load finds", async () => {
    const db = database({
      session: SESSION,
      turn: freshTurn({ ageSeconds: PRD_TURN_DEADLINE_SECONDS + 1 }),
      overdue: ["main", "topic:booking"],
    });
    await catchUpOverdue(relay(db.rpc, anthropic({}).fetch), PROJECT);
    expect(db.named("prd_turns_overdue")[0].args).toEqual({
      p_project: PROJECT,
      p_seconds: PRD_TURN_DEADLINE_SECONDS,
    });
    expect(db.named("prd_session_read").map((call) => call.args.p_chat_key)).toEqual([
      "main",
      "topic:booking",
    ]);
  });
});
