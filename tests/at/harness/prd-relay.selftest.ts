import { readUIMessageStream, streamText, type UIMessageChunk } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import type { Caller } from "../../../supabase/functions/_shared/caller.ts";
import {
  catchUpChat,
  catchUpOverdue,
  PRD_MODEL_UNAVAILABLE,
  PRD_TURN_DEADLINE_SECONDS,
  prdRelayDeps,
  runPrdTurn,
} from "../../../supabase/functions/_shared/prd/relay.ts";
import {
  prdActionPrepare,
  prdMessagePrepare,
  prdMessageSettle,
  type PrdActionArgs,
  type PrdMessageArgs,
} from "../../../supabase/functions/_shared/prd/routes.ts";
import {
  ingestModelStep,
  OPENCODE_GO_URL,
  prdModel,
  usageOf,
  type PrdFetch,
  type PrdUsage,
} from "../../../supabase/functions/_shared/prd/turn.ts";
import type { CallerReads } from "../../../supabase/functions/_shared/tenant-reads.ts";
import type { SettleDatabase } from "../../../supabase/functions/_shared/write-routes.ts";
import { parsePrdSnapshot } from "../../../src/lib/prd-stream.ts";

const PROJECT = "55555555-5555-4555-8555-555555555555";
const CHAT = "66666666-6666-4666-8666-666666666666";
const TURN = "33333333-3333-4333-8333-333333333333";
const GRANT = "44444444-4444-4444-8444-444444444444";
const QUESTION = "77777777-7777-4777-8777-777777777777";
const RECEIPT = "88888888-8888-4888-8888-888888888888";
const ACTOR = "11111111-1111-4111-8111-111111111111";
const SETTINGS = {
  PRD_MODEL_BASE_URL: "https://example.test/v1",
  PRD_MODEL: "selftest-model",
  PRD_MODEL_API_KEY: "test-key-never-sent",
};
const REPLY_TOOLS = [
  "read_section",
  "stage_section",
  "propose_ready",
  "suggest_ngo_question",
  "commit_prepare",
];
const ANSWER_TOOLS = ["record_outcome", "commit_prepare"];

type Call = { name: string; args: Record<string, unknown> };
type TurnJson = {
  id: string;
  kind: "reply" | "answer-write";
  state: "admitted" | "uncertain";
  ageSeconds: number;
  parts: unknown[];
  modelRequests: number;
  reservationMicros: number;
  spentMicros: number;
  messageId: string | null;
  chatId: string;
};

const CALLER: Caller = { id: ACTOR, githubHandle: null, emailVerified: true };
const READS = {} as CallerReads;

function freshTurn(overrides: Partial<TurnJson> = {}): TurnJson {
  return {
    id: TURN,
    kind: "reply",
    state: "admitted",
    ageSeconds: 1,
    parts: [{ type: "text", text: "Who books shifts?" }],
    modelRequests: 0,
    reservationMicros: 50_000,
    spentMicros: 0,
    messageId: "99999999-9999-4999-8999-999999999999",
    chatId: CHAT,
    ...overrides,
  };
}

function messageArgs(chatKey = "main"): PrdMessageArgs {
  return {
    p_actor: ACTOR,
    p_project: PROJECT,
    p_chat_key: chatKey,
    p_request_id: "request-1",
    p_base_revision: 1,
    p_intent: { kind: "text", text: "Who books shifts?" },
    p_body_hash: "hash-1",
  };
}

function tokens(input: number, output: number, cacheRead = 0, cacheWrite = 0) {
  return {
    inputTokens: { total: input, noCache: input - cacheRead - cacheWrite, cacheRead, cacheWrite },
    outputTokens: { total: output, text: output, reasoning: 0 },
  };
}

const NO_USAGE = {
  inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: undefined, text: undefined, reasoning: undefined },
};

function textStream(text: string, usage: ReturnType<typeof tokens> | typeof NO_USAGE = tokens(12, 4)) {
  return {
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "stream-start", warnings: [] });
        controller.enqueue({ type: "text-start", id: "text" });
        controller.enqueue({ type: "text-delta", id: "text", delta: text });
        controller.enqueue({ type: "text-end", id: "text" });
        controller.enqueue({ type: "finish", usage, finishReason: { unified: "stop", raw: undefined } });
        controller.close();
      },
    }),
  };
}

function toolStream(name: string, input: unknown, usage: ReturnType<typeof tokens> = tokens(8, 2)) {
  return {
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "stream-start", warnings: [] });
        controller.enqueue({
          type: "tool-call",
          toolCallId: `call_${name}`,
          toolName: name,
          input: JSON.stringify(input),
        });
        controller.enqueue({
          type: "finish",
          usage,
          finishReason: { unified: "tool-calls", raw: undefined },
        });
        controller.close();
      },
    }),
  };
}

function database(state: {
  turn: TurnJson | null;
  priced?: boolean;
  providerMicros?: number;
  feeMicros?: number;
  overdue?: string[];
  readDetail?: string;
}) {
  const calls: Call[] = [];
  const rpc: SettleDatabase = async (name, args) => {
    calls.push({ name, args });
    switch (name) {
      case "prd_turn_open":
        return { ok: true, value: { chatId: state.turn?.chatId ?? CHAT, turn: state.turn } };
      case "prd_grant_issue":
        return { ok: true, value: GRANT };
      case "prd_grant_tools":
        return {
          ok: true,
          value: args && state.turn?.kind === "answer-write" ? ANSWER_TOOLS : REPLY_TOOLS,
        };
      case "prd_turn_settings_record":
        return { ok: true, value: { turnId: state.turn?.id ?? TURN } };
      case "prd_chat_transcript":
        return { ok: true, value: [] };
      case "prd_turn_ingest":
        return {
          ok: true,
          value: { providerMicros: state.providerMicros ?? 100, feeMicros: state.feeMicros ?? 10 },
        };
      case "prd_append_message":
        return { ok: true, value: { id: "appended" } };
      case "prd_model_priced":
        return { ok: true, value: state.priced !== false };
      case "prd_turns_overdue":
        return { ok: true, value: state.overdue ?? [] };
      case "read_section":
        return { ok: false, message: "refused", details: state.readDetail ?? "tool-denied" };
      case "stage_section":
        return { ok: true, value: { staged: "booking" } };
      case "commit_prepare":
        return { ok: false, message: "nothing is staged", details: "nothing-staged" };
      default:
        return { ok: true, value: {} };
    }
  };
  return { calls, rpc };
}

function modelOf(streams: "throw" | Array<(prompt: unknown) => ReturnType<typeof textStream>>) {
  let count = 0;
  const prompts: unknown[] = [];
  const model = new MockLanguageModelV4({
    doStream: async (options) => {
      prompts.push(options.prompt);
      const index = count;
      count += 1;
      if (streams === "throw") throw new Error("provider rejected the turn");
      const next = streams[index];
      if (next === undefined) throw new Error(`the model was called again at step ${index}`);
      return next(options.prompt);
    },
  });
  return { model, prompts, calls: () => count };
}

async function run(input: {
  streams: "throw" | Array<(prompt: unknown) => ReturnType<typeof textStream>>;
  turn?: Partial<TurnJson> | null;
  chatKey?: string;
  turnId?: string | null;
  closed?: boolean;
  priced?: boolean;
  env?: Record<string, string | undefined>;
  providerMicros?: number;
  feeMicros?: number;
  readDetail?: string;
}) {
  const turn = input.turn === null ? null : freshTurn(input.turn);
  const db = database({
    turn,
    priced: input.priced,
    providerMicros: input.providerMicros,
    feeMicros: input.feeMicros,
    readDetail: input.readDetail,
  });
  const language = modelOf(input.streams);
  const chunks: unknown[] = [];
  const deps = prdRelayDeps({
    rpc: db.rpc,
    fetch: async () => new Response("offline", { status: 500 }),
    env: input.env ?? SETTINGS,
    model: language.model,
  });
  const result = await runPrdTurn(
    deps,
    PROJECT,
    input.chatKey ?? "main",
    input.turnId === undefined ? TURN : input.turnId,
    {
      emit: (chunk) => chunks.push(chunk),
      closed: () => input.closed === true,
    },
  );
  return { result, calls: db.calls, chunks, prompts: language.prompts, streamCalls: language.calls() };
}

function ingests(calls: Call[]): Array<Record<string, unknown>> {
  return calls
    .filter((call) => call.name === "prd_turn_ingest")
    .map((call) => call.args.p_event as Record<string, unknown>);
}

function named(calls: Call[], name: string): Call[] {
  return calls.filter((call) => call.name === name);
}

describe("PRD turn on a mock model", () => {
  it("settles one model request, appends the reply once, and ends last", async () => {
    const ran = await run({ streams: [() => textStream("Volunteers book themselves.")] });
    const events = ingests(ran.calls);
    expect(events.map((event) => event.kind)).toEqual(["model-end", "end"]);
    expect(events[0]).toMatchObject({
      eventId: `${TURN}:0`,
      usage: { input: 12, output: 4, cacheRead: 0, cacheWrite: 0 },
    });
    expect(events[1]).toMatchObject({ outcome: "answered" });
    expect(named(ran.calls, "prd_grant_issue")).toEqual([
      { name: "prd_grant_issue", args: { p_turn: TURN, p_mode: "reply", p_ttl_seconds: 900 } },
    ]);
    expect(named(ran.calls, "prd_turn_settings_record")[0]?.args).toMatchObject({
      p_turn: TURN,
      p_model: "selftest-model",
      p_settings: { baseURL: "https://example.test/v1", model: "selftest-model" },
    });
    const appended = named(ran.calls, "prd_append_message");
    expect(appended).toHaveLength(1);
    expect(appended[0]?.args).toMatchObject({
      p_actor_kind: "ai",
      p_actor_name: "ai4good AI",
      p_parts: [{ type: "text", text: "Volunteers book themselves." }],
    });
    expect(ran.result).toMatchObject({ failure: null, skipSettle: true });
    expect(ran.streamCalls).toBe(1);
  });

  it("runs several model steps and tool calls, and keeps every model-end before the end", async () => {
    const ran = await run({
      streams: [
        () => toolStream("read_section", { key: "booking" }),
        () => textStream("The section is unchanged."),
      ],
    });
    const events = ingests(ran.calls);
    expect(events.map((event) => event.eventId ?? event.kind)).toEqual([`${TURN}:0`, `${TURN}:1`, "end"]);
    expect(events[0]?.usage).toEqual({ input: 8, output: 2, cacheRead: 0, cacheWrite: 0 });
    expect(named(ran.calls, "read_section")).toHaveLength(1);
    expect(named(ran.calls, "prd_append_message")).toHaveLength(1);
    expect(named(ran.calls, "prd_append_message")[0]?.args.p_parts).toEqual([
      { type: "text", text: "The section is unchanged." },
    ]);
    expect(ran.streamCalls).toBe(2);
  });

  it("ingests a step with no usage as pending and still ends the turn", async () => {
    const ran = await run({ streams: [() => textStream("No usage arrived.", NO_USAGE)] });
    const events = ingests(ran.calls);
    expect(events[0]).toMatchObject({ kind: "model-end", eventId: `${TURN}:0`, usage: null });
    expect(events[1]).toMatchObject({ kind: "end", outcome: "answered" });
  });

  it("keeps settling after the client drops the stream", async () => {
    const ran = await run({
      streams: [() => textStream("Still settled.")],
      closed: true,
    });
    expect(ran.chunks).toEqual([]);
    expect(ingests(ran.calls).map((event) => event.kind)).toEqual(["model-end", "end"]);
    expect(named(ran.calls, "prd_append_message")[0]?.args.p_parts).toEqual([
      { type: "text", text: "Still settled." },
    ]);
  });

  it("stops calling the model once settled spend reaches the reservation", async () => {
    const ran = await run({
      streams: [
        () => toolStream("read_section", { key: "booking" }, tokens(20, 5)),
        () => textStream("This step must not run."),
      ],
      providerMicros: 40_000,
      feeMicros: 10_000,
    });
    expect(ran.streamCalls).toBe(1);
    expect(ingests(ran.calls).map((event) => event.kind)).toEqual(["model-end", "end"]);
    expect(named(ran.calls, "prd_append_message")).toEqual([]);
  });

  it("releases a provider rejection that lands before any model request", async () => {
    const ran = await run({ streams: "throw" });
    expect(ingests(ran.calls)).toEqual([{ kind: "end", outcome: "rejected" }]);
    expect(ran.result.failure).toBe("The AI could not take this message. Nothing was charged for it.");
    expect(named(ran.calls, "prd_append_message")).toEqual([]);
    expect(ran.streamCalls).toBe(1);
  });

  it("ingests a repeated step id once", async () => {
    const calls: Call[] = [];
    const rpc: SettleDatabase = async (name, args) => {
      calls.push({ name, args });
      return { ok: true, value: { providerMicros: 5, feeMicros: 1 } };
    };
    const seen = new Set<string>();
    const usage: PrdUsage = { input: 3, output: 1, cacheRead: 2, cacheWrite: 1 };
    expect(await ingestModelStep(rpc, TURN, 0, usage, seen)).toEqual({ providerMicros: 5, feeMicros: 1 });
    expect(await ingestModelStep(rpc, TURN, 0, null, seen)).toBe("duplicate");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.args.p_event).toEqual({ kind: "model-end", eventId: `${TURN}:0`, usage });
  });

  it("issues a reply grant, an answer-write grant, and a side-chat grant", async () => {
    const reply = await run({ streams: [() => textStream("Reply.")] });
    const answer = await run({
      streams: [() => textStream("Recorded.")],
      turn: { kind: "answer-write" },
    });
    const side = await run({
      streams: [() => textStream("Side reply.")],
      chatKey: `side:${QUESTION}`,
    });
    expect(named(reply.calls, "prd_grant_issue")[0]?.args.p_mode).toBe("reply");
    expect(named(answer.calls, "prd_grant_issue")[0]?.args.p_mode).toBe("answer-write");
    expect(named(answer.calls, "prd_grant_tools")[0]?.args).toBeDefined();
    expect(named(side.calls, "prd_grant_issue")[0]?.args.p_mode).toBe("answer-write");
  });

  it("gives a tool refusal back to the model as the tool result", async () => {
    let prompt = "";
    const ran = await run({
      streams: [
        () => toolStream("read_section", { key: "booking" }),
        (value) => {
          prompt = JSON.stringify(value);
          return textStream("I could not read it.");
        },
      ],
    });
    expect(prompt).toContain("That tool is not available in this turn.");
    expect(ran.result.failure).toBeNull();
    expect(named(ran.calls, "read_section")).toHaveLength(1);
  });

  it("commits staged topics the model left uncommitted", async () => {
    const ran = await run({
      streams: [
        () =>
          toolStream("stage_section", {
            receipt: RECEIPT,
            document: { statements: [{ text: "Volunteers book themselves.", sources: ["Discovery"] }], decisions: [] },
          }),
        () => textStream("Staged, not committed."),
      ],
    });
    const names = ran.calls.map((call) => call.name);
    expect(names).toContain("stage_section");
    expect(names).toContain("commit_prepare");
    expect(names.indexOf("commit_prepare")).toBeGreaterThan(names.indexOf("stage_section"));
    expect(names.filter((name) => name === "commit_turn")).toEqual([]);
    const endAt = names.lastIndexOf("prd_turn_ingest");
    expect(names.indexOf("commit_prepare")).toBeLessThan(endAt);
  });

  it("refuses a streaming turn before reserving when settings or a rate are missing", async () => {
    const missingDb = database({ turn: freshTurn() });
    const missing = prdRelayDeps({
      rpc: missingDb.rpc,
      fetch: async () => new Response("offline", { status: 500 }),
      env: {},
    });
    const refused = await prdMessagePrepare(missing)(CALLER, messageArgs(), READS, true);
    expect(refused).toEqual({ ok: false, kind: "refused", status: 503, reason: PRD_MODEL_UNAVAILABLE });
    expect(missingDb.calls.map((call) => call.name)).toEqual(["prd_turn_open"]);

    const unpricedDb = database({ turn: freshTurn(), priced: false });
    const unpriced = prdRelayDeps({
      rpc: unpricedDb.rpc,
      fetch: async () => new Response("offline", { status: 500 }),
      env: SETTINGS,
    });
    const noRate = await prdMessagePrepare(unpriced)(CALLER, messageArgs(), READS, true);
    expect(noRate).toEqual({ ok: false, kind: "refused", status: 503, reason: PRD_MODEL_UNAVAILABLE });
    expect(unpricedDb.calls.map((call) => call.name)).toEqual(["prd_turn_open", "prd_model_priced"]);

    const jsonDb = database({ turn: freshTurn() });
    const json = prdRelayDeps({
      rpc: jsonDb.rpc,
      fetch: async () => new Response("offline", { status: 500 }),
      env: {},
    });
    const quiet = await prdMessagePrepare(json)(CALLER, messageArgs(), READS, false);
    expect(quiet).toEqual({ ok: true, args: messageArgs() });

    const readyDb = database({ turn: freshTurn(), priced: true });
    const ready = prdRelayDeps({
      rpc: readyDb.rpc,
      fetch: async () => new Response("offline", { status: 500 }),
      env: SETTINGS,
    });
    const priced = await prdMessagePrepare(ready)(CALLER, messageArgs(), READS, true);
    expect(priced).toEqual({ ok: true, args: { ...messageArgs(), p_model: "selftest-model" } });

    const actionArgs: PrdActionArgs = {
      p_actor: ACTOR,
      p_project: PROJECT,
      p_kind: "complete-answer",
      p_token: "complete-answer|question|1|1",
      p_request_id: "request-2",
    };
    const action = await prdActionPrepare(missing)(CALLER, actionArgs, READS, true);
    expect(action).toEqual({ ok: true, args: actionArgs });

    const settle = prdMessageSettle(ready);
    expect(await settle.act()).toEqual({ args: null, failure: null, skipSettle: true });
  });

  it("sends x-opencode-session only for opencode go", async () => {
    const seen: Array<{ url: string; session: string | null }> = [];
    const fetchImpl: PrdFetch = async (url, init) => {
      const request = typeof url === "string" ? null : (url as Request);
      const headers = new Headers(init?.headers ?? request?.headers);
      seen.push({
        url: typeof url === "string" ? url : request?.url ?? String(url),
        session: headers.get("x-opencode-session"),
      });
      return new Response("offline", { status: 400 });
    };
    const go = prdModel(CHAT, { baseURL: `${OPENCODE_GO_URL}/`, modelId: "go-model", apiKey: "k" }, fetchImpl);
    const openai = prdModel(
      CHAT,
      { baseURL: "https://api.openai.com/v1", modelId: "gpt-test", apiKey: "k" },
      fetchImpl,
    );
    await streamText({ model: go, prompt: "Hello", maxRetries: 0 }).text.catch(() => undefined);
    await streamText({ model: openai, prompt: "Hello", maxRetries: 0 }).text.catch(() => undefined);
    const goCalls = seen.filter((item) => item.url.includes("opencode.ai"));
    const openaiCalls = seen.filter((item) => item.url.includes("api.openai.com"));
    expect(goCalls.length).toBeGreaterThan(0);
    expect(goCalls.every((item) => item.session === CHAT)).toBe(true);
    expect(openaiCalls.length).toBeGreaterThan(0);
    expect(openaiCalls.every((item) => item.session === null)).toBe(true);
  });

  it("parses the streamed reply with the screen snapshot parser", async () => {
    const text = "Volunteers book themselves.";
    const ran = await run({ streams: [() => textStream(text)] });
    expect(ran.chunks.some((chunk) => isChunk(chunk) && chunk.type === "text-delta" && chunk.delta === text)).toBe(
      true,
    );
    const stream = new ReadableStream<UIMessageChunk>({
      start(controller) {
        for (const chunk of ran.chunks) controller.enqueue(chunk as UIMessageChunk);
        controller.close();
      },
    });
    const messages = [];
    for await (const message of readUIMessageStream({ stream })) messages.push(message);
    const last = messages.at(-1);
    const streamed = last?.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("") ?? "";
    expect(streamed).toBe(text);
    const snapshot = parsePrdSnapshot(snapshotWith(text));
    expect(snapshot.chats.main[0]?.parts).toEqual([{ type: "text", text }]);
  });

  it("ends an overdue turn without calling the model, and leaves a young turn alone", async () => {
    const young = database({ turn: freshTurn({ ageSeconds: 5 }) });
    const youngDeps = prdRelayDeps({
      rpc: young.rpc,
      fetch: async () => new Response("offline", { status: 500 }),
      env: SETTINGS,
      model: new MockLanguageModelV4({ doStream: async () => textStream("no") }),
    });
    await catchUpChat(youngDeps, PROJECT, "main");
    expect(young.calls.map((call) => call.name)).toEqual(["prd_turn_open"]);

    const old = database({ turn: freshTurn({ ageSeconds: PRD_TURN_DEADLINE_SECONDS + 1, modelRequests: 0 }) });
    await catchUpChat(
      prdRelayDeps({
        rpc: old.rpc,
        fetch: async () => new Response("offline", { status: 500 }),
        env: SETTINGS,
      }),
      PROJECT,
      "main",
    );
    expect(ingests(old.calls)).toEqual([{ kind: "end", outcome: "rejected" }]);

    const uncertain = database({
      turn: freshTurn({ state: "uncertain", ageSeconds: 1, modelRequests: 2 }),
    });
    await catchUpChat(
      prdRelayDeps({
        rpc: uncertain.rpc,
        fetch: async () => new Response("offline", { status: 500 }),
        env: SETTINGS,
      }),
      PROJECT,
      "main",
    );
    expect(ingests(uncertain.calls)).toEqual([{ kind: "end", outcome: "answered" }]);

    const listed = database({
      turn: freshTurn({ ageSeconds: PRD_TURN_DEADLINE_SECONDS + 5 }),
      overdue: ["main"],
    });
    await catchUpOverdue(
      prdRelayDeps({
        rpc: listed.rpc,
        fetch: async () => new Response("offline", { status: 500 }),
        env: SETTINGS,
      }),
      PROJECT,
    );
    expect(named(listed.calls, "prd_turns_overdue")[0]?.args).toEqual({
      p_project: PROJECT,
      p_seconds: PRD_TURN_DEADLINE_SECONDS,
    });
    expect(ingests(listed.calls)).toEqual([{ kind: "end", outcome: "rejected" }]);
  });

  it("does not end a turn whose open row is a different turn", async () => {
    const ran = await run({ streams: [() => textStream("no")], turnId: "22222222-2222-4222-8222-222222222222" });
    expect(ran.result).toMatchObject({ failure: "This message was already sent.", status: 409, skipSettle: true });
    expect(ingests(ran.calls)).toEqual([]);
    expect(ran.streamCalls).toBe(0);
  });

  it("reads normalized usage, including a missing report", () => {
    expect(
      usageOf({
        inputTokens: undefined,
        outputTokens: undefined,
        inputTokenDetails: { noCacheTokens: undefined, cacheReadTokens: undefined, cacheWriteTokens: undefined },
        outputTokenDetails: { textTokens: undefined, reasoningTokens: undefined },
        totalTokens: undefined,
      }),
    ).toBeNull();
    expect(
      usageOf({
        inputTokens: 9,
        outputTokens: 3,
        inputTokenDetails: { noCacheTokens: 4, cacheReadTokens: 3, cacheWriteTokens: 2 },
        outputTokenDetails: { textTokens: 3, reasoningTokens: 0 },
        totalTokens: 12,
      }),
    ).toEqual({ input: 9, output: 3, cacheRead: 3, cacheWrite: 2 });
  });
});

function isChunk(value: unknown): value is { type: string; delta?: string } {
  return typeof value === "object" && value !== null && "type" in value;
}

function snapshotWith(text: string) {
  const unavailable = { kind: "unavailable" as const, reason: "Not now." };
  return {
    sequence: 1,
    revision: 1,
    viewer: { role: "dev" as const, name: "Priya Shah" },
    people: [{ role: "ai" as const, name: "ai4good AI", label: "AI" }],
    project: { title: "Scheduling", organizationName: "Harbor" },
    discoveryRevision: 1,
    topics: [
      {
        id: "booking",
        title: "Booking",
        required: true,
        state: "draft" as const,
        statusText: "Draft.",
        blocker: null,
        statements: [] as string[],
        sources: [] as string[],
        stories: null,
        scope: null,
        changeSummary: null,
        author: null,
        confirm: unavailable,
        reopen: unavailable,
      },
    ],
    devQuestions: [],
    questions: [],
    chats: {
      main: [
        {
          id: "assistant-1",
          role: "assistant" as const,
          parts: [{ type: "text" as const, text }],
        },
      ],
    },
    canWrite: { main: true },
    send: { main: { kind: "available" as const } },
    funds: {
      allocationMicros: 0,
      settledMicros: 0,
      pendingMicros: 0,
      replyHoldMicros: 0,
      availableMicros: 0,
      band: "green" as const,
      replyFunded: true,
    },
    check: null,
    close: { kind: "closed" as const, revision: 1, openPoints: 0 },
    drafts: {},
  };
}
