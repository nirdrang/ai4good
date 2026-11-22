import { expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { usageOf, runPrdTurn } from "../../../supabase/functions/_shared/prd/turn.ts";
import { runCompletionCheck } from "../../../supabase/functions/_shared/prd/check.ts";
import {
  catchUpChat,
  PRD_TURN_DEADLINE_SECONDS,
  prdRelayDeps,
} from "../../../supabase/functions/_shared/prd/relay.ts";
import {
  prdMessagePrepare,
  prdMessageSettle,
  prdActionSettle,
} from "../../../supabase/functions/_shared/prd/routes.ts";
import type { SettleDatabase } from "../../../supabase/functions/_shared/write-routes.ts";

const PROJECT = "55555555-5555-4555-8555-555555555555";
const CHAT = "66666666-6666-4666-8666-666666666666";
const TURN = "33333333-3333-4333-8333-333333333333";
const GRANT = "44444444-4444-4444-8444-444444444444";
const OP = "77777777-7777-4777-8777-777777777777";
const tokens = {
  inputTokens: { total: 1000, noCache: 100, cacheRead: 900, cacheWrite: 0 },
  outputTokens: { total: 10, text: 10, reasoning: 0 },
};
const env = {
  PRD_MODEL_BASE_URL: "https://example.test/v1",
  PRD_MODEL: "selftest-model",
  PRD_MODEL_API_KEY: "offline",
};
const sink = { emit: () => {}, closed: () => false };
const noNetwork = async () => {
  throw new Error("network forbidden");
};

function stream(text: string, tool?: string) {
  return {
    stream: new ReadableStream({
      start(c) {
        c.enqueue({ type: "stream-start", warnings: [] });
        if (tool)
          c.enqueue({
            type: "tool-call",
            toolCallId: "call-1",
            toolName: tool,
            input: JSON.stringify({ receipt: GRANT, document: { statements: [], decisions: [] } }),
          });
        else {
          c.enqueue({ type: "text-start", id: "text" });
          c.enqueue({ type: "text-delta", id: "text", delta: text });
          c.enqueue({ type: "text-end", id: "text" });
        }
        c.enqueue({
          type: "finish",
          usage: tokens,
          finishReason: { unified: tool ? "tool-calls" : "stop", raw: undefined },
        });
        c.close();
      },
    }),
  };
}

function fakeDb(options: { uncertain?: boolean } = {}) {
  const calls: Array<{ name: string; args: any }> = [];
  const charged = new Set<string>();
  let claimed = false;
  const rpc: SettleDatabase = async (name, args) => {
    calls.push({ name, args });
    switch (name) {
      case "prd_role":
        return { ok: true, value: null };
      case "prd_turn_claim": {
        const won = !claimed;
        claimed = true;
        return { ok: true, value: won };
      }
      case "prd_turn_open":
        return {
          ok: true,
          value: {
            chatId: CHAT,
            turn: {
              id: TURN,
              kind: "reply",
              state: options.uncertain ? "uncertain" : "admitted",
              ageSeconds: 1,
              parts: [{ type: "text", text: "Update this section" }],
              modelRequests: options.uncertain ? 1 : 0,
              reservationMicros: 50000,
              spentMicros: 0,
              messageId: null,
              chatId: CHAT,
            },
          },
        };
      case "prd_grant_issue":
        return { ok: true, value: GRANT };
      case "prd_grant_tools":
        return { ok: true, value: ["stage_section", "commit_prepare"] };
      case "prd_chat_transcript":
        return { ok: true, value: [] };
      case "prd_turn_ingest": {
        const event = args.p_event as any;
        if (event.kind === "model-end") charged.add(event.eventId);
        return { ok: true, value: { providerMicros: 100, feeMicros: 10 } };
      }
      case "commit_prepare":
        return { ok: false, message: "nothing staged", details: "nothing-staged" };
      case "prd_check_source":
        return {
          ok: true,
          value: {
            state: "admitted",
            recorded: null,
            chatId: CHAT,
            revision: 1,
            threshold: 85,
            thresholdText: "85",
            discovery: { need: { text: "Book shifts" } },
            sections: [
              { key: "booking", title: "Booking", document: { statements: [], decisions: [] } },
            ],
          },
        };
      default:
        return { ok: true, value: {} };
    }
  };
  return { rpc, calls, charged };
}

it("cached input must not also be billed as ordinary input", () => {
  const actual = usageOf({
    inputTokens: 1000,
    outputTokens: 10,
    totalTokens: 1010,
    inputTokenDetails: { noCacheTokens: 100, cacheReadTokens: 900, cacheWriteTokens: 0 },
    outputTokenDetails: { textTokens: 10, reasoningTokens: 0 },
  });
  console.log("normalized usage:", JSON.stringify(actual));
  expect(actual?.input).toBe(100);
});

it("an unrelated caller must not finish another projects uncertain turn before authorization", async () => {
  const db = fakeDb({ uncertain: true });
  const deps = prdRelayDeps({ rpc: db.rpc, fetch: noNetwork, env: {} });
  const stranger = {
    id: "99999999-9999-4999-8999-999999999999",
    githubHandle: null,
    emailVerified: true,
  };
  const prepared = await prdMessagePrepare(deps)(
    stranger,
    {
      p_actor: stranger.id,
      p_project: PROJECT,
      p_chat_key: "main",
      p_request_id: "outsider",
      p_base_revision: 1,
      p_intent: { kind: "text", text: "hello" },
      p_body_hash: "outsider",
    },
    {} as any,
    true,
  );
  const ends = db.calls.filter((c) => c.name === "prd_turn_ingest").map((c) => c.args.p_event);
  console.log(
    "unauthorized prepare:",
    JSON.stringify({ requestAdmitted: prepared.ok, otherProjectsTurnWrites: ends }),
  );
  expect(ends).toHaveLength(0);
  expect(prepared).toMatchObject({ ok: false, kind: "forbidden", status: 403 });
});

it("malformed completion output still incurs provider usage", async () => {
  const db = fakeDb();
  const model = new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text: "not JSON" }],
      finishReason: { unified: "stop", raw: undefined },
      usage: tokens,
      warnings: [],
    }),
  });
  const result = await runCompletionCheck(
    prdRelayDeps({ rpc: db.rpc, fetch: noNetwork, env, model }),
    PROJECT,
    { turnId: TURN, sectionKey: "booking", priorState: "ready", priorChanged: null },
  );
  const ingests = db.calls.filter((c) => c.name === "prd_turn_ingest").map((c) => c.args.p_event);
  console.log("malformed check:", JSON.stringify({ failure: result.failure, ingests }));
  expect(ingests.some((e) => e.kind === "model-end")).toBe(true);
});

it("missing completion usage is reported for estimation", async () => {
  const db = fakeDb();
  const missing = {
    inputTokens: {
      total: undefined,
      noCache: undefined,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: { total: undefined, text: undefined, reasoning: undefined },
  };
  const model = new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [
        { type: "text", text: JSON.stringify({ score: 90, coverageText: "Covered", gaps: [] }) },
      ],
      finishReason: { unified: "stop", raw: undefined },
      usage: missing,
      warnings: [],
    }),
  });
  const result = await runCompletionCheck(
    prdRelayDeps({ rpc: db.rpc, fetch: noNetwork, env, model }),
    PROJECT,
    { turnId: TURN, sectionKey: "booking", priorState: "ready", priorChanged: null },
  );
  const ingests = db.calls.filter((c) => c.name === "prd_turn_ingest").map((c) => c.args.p_event);
  console.log("missing check usage:", JSON.stringify({ failure: result.failure, ingests }));
  expect(ingests.some((e) => e.kind === "model-end" && e.usage === null)).toBe(true);
});

it("an interrupted stream with visible generated text must keep its usage pending", async () => {
  const db = fakeDb();
  const model = new MockLanguageModelV4({
    doStream: async () => ({
      stream: new ReadableStream({
        start(c) {
          c.enqueue({ type: "stream-start", warnings: [] });
          c.enqueue({ type: "text-start", id: "partial" });
          c.enqueue({ type: "text-delta", id: "partial", delta: "Already generated tokens" });
          setTimeout(() => c.error(new Error("connection reset after generation started")), 10);
        },
      }),
    }),
  });
  const result = await runPrdTurn(
    prdRelayDeps({ rpc: db.rpc, fetch: noNetwork, env, model }),
    PROJECT,
    "main",
    TURN,
    sink,
  );
  const ingests = db.calls.filter((c) => c.name === "prd_turn_ingest").map((c) => c.args.p_event);
  console.log(
    "interrupted stream:",
    JSON.stringify({
      failure: result.failure,
      ingests,
      appendedReply: db.calls.find((c) => c.name === "prd_append_message")?.args.p_parts,
    }),
  );
  expect(
    ingests.some((e) => e.kind === "model-end" && e.usage === null) ||
      ingests.some((e) => e.kind === "end" && e.outcome === "uncertain"),
  ).toBe(true);
  expect(result.failure).not.toContain("Nothing was charged");
  expect(db.calls.find((c) => c.name === "prd_append_message")?.args.p_parts).toEqual([
    { type: "text", text: "Already generated tokens" },
  ]);
});

for (const action of [false, true]) {
  it(`runs a replayed ${action ? "complete-answer action" : "message stream"} only once`, async () => {
    const db = fakeDb();
    let modelCalls = 0;
    let release!: () => void;
    let started!: () => void;
    const firstStarted = new Promise<void>((r) => {
      started = r;
    });
    const barrier = new Promise<void>((r) => {
      release = r;
    });
    const model = new MockLanguageModelV4({
      doStream: async () => {
        modelCalls++;
        started();
        await barrier;
        return stream("Reply");
      },
    });
    const deps = prdRelayDeps({ rpc: db.rpc, fetch: noNetwork, env, model });
    const chunks: unknown[][] = [[], []];
    const invoke = (index: number) =>
      action
        ? prdActionSettle(deps).act(
            { turnId: TURN },
            {
              p_actor: GRANT,
              p_project: PROJECT,
              p_kind: "complete-answer",
              p_token: `complete-answer|question:${OP}|3|2`,
              p_request_id: "same",
            },
          )
        : prdMessageSettle(deps).uiStream(
            { turnId: TURN },
            {
              p_actor: GRANT,
              p_project: PROJECT,
              p_chat_key: "main",
              p_request_id: "same",
              p_base_revision: 1,
              p_intent: { kind: "text", text: "hello" },
              p_body_hash: "same",
            },
            (chunk) => chunks[index].push(chunk),
            () => false,
          );
    const first = invoke(0);
    await firstStarted;
    const retry = invoke(1);
    setTimeout(release, 25);
    await retry;
    release();
    await first;
    console.log(
      "replay:",
      JSON.stringify({
        action,
        modelCalls,
        grants: db.calls.filter((c) => c.name === "prd_grant_issue").length,
        appends: db.calls.filter((c) => c.name === "prd_append_message").length,
        replayChunks: chunks[1].length,
      }),
    );
    expect(modelCalls).toBe(1);
    expect(db.calls.filter((c) => c.name === "prd_grant_issue")).toHaveLength(1);
    expect(db.calls.filter((c) => c.name === "prd_append_message")).toHaveLength(1);
    expect(db.charged.size).toBe(1);
    expect(chunks[1]).toEqual([]);
  });
}

it("catch-up leaves a turn within the grant lifetime alone and never guesses rejected", async () => {
  const calls: unknown[] = [];
  let age = 601;
  let state = "admitted";
  const rpc: SettleDatabase = async (name, args) => {
    if (name === "prd_turn_open")
      return { ok: true, value: { turn: { id: TURN, state, ageSeconds: age, modelRequests: 0 } } };
    if (name === "prd_turn_ingest") calls.push(args.p_event);
    return { ok: true, value: {} };
  };
  const deps = prdRelayDeps({ rpc, fetch: noNetwork, env });
  await catchUpChat(deps, PROJECT, "main");
  expect(calls).toEqual([]);
  age = PRD_TURN_DEADLINE_SECONDS + 1;
  await catchUpChat(deps, PROJECT, "main");
  state = "uncertain";
  age = 1;
  await catchUpChat(deps, PROJECT, "main");
  expect(calls).toEqual([
    { kind: "end", outcome: "answered", deadlineSeconds: PRD_TURN_DEADLINE_SECONDS },
    { kind: "end", outcome: "answered", deadlineSeconds: PRD_TURN_DEADLINE_SECONDS },
  ]);
});

it("normalizes cached input with a fallback and floors it at zero", () => {
  for (const [total, expected] of [
    [1000, 100],
    [100, 0],
  ]) {
    expect(
      usageOf({
        inputTokens: total,
        outputTokens: 10,
        totalTokens: total + 10,
        inputTokenDetails: {
          noCacheTokens: undefined,
          cacheReadTokens: 800,
          cacheWriteTokens: 100,
        },
        outputTokenDetails: { textTokens: 10, reasoningTokens: 0 },
      })?.input,
    ).toBe(expected);
  }
});

it("records each call before dispatch so a later lost model-end is estimated", async () => {
  const db = fakeDb();
  const model = new MockLanguageModelV4({
    doStream: async () => {
      expect(
        db.calls.some((c) => c.name === "prd_turn_ingest" && c.args.p_event.kind === "model-start"),
      ).toBe(true);
      return stream("Reply");
    },
  });
  const result = await runPrdTurn(
    prdRelayDeps({ rpc: db.rpc, fetch: noNetwork, env, model }),
    PROJECT,
    "main",
    TURN,
    sink,
  );
  expect(result.failure).toBeNull();
  expect(
    db.calls.filter((c) => c.name === "prd_turn_ingest").map((c) => c.args.p_event.kind),
  ).toEqual(["model-start", "model-end", "end"]);
});

it("runs a replayed completion check once", async () => {
  const db = fakeDb();
  let modelCalls = 0;
  let release!: () => void;
  let started!: () => void;
  const firstStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  const model = new MockLanguageModelV4({
    doGenerate: async () => {
      modelCalls++;
      started();
      await barrier;
      return {
        content: [
          { type: "text", text: JSON.stringify({ score: 90, coverageText: "Covered", gaps: [] }) },
        ],
        finishReason: { unified: "stop", raw: undefined },
        usage: tokens,
        warnings: [],
      };
    },
  });
  const deps = prdRelayDeps({ rpc: db.rpc, fetch: noNetwork, env, model });
  const check = { turnId: TURN, sectionKey: "booking", priorState: "ready", priorChanged: null };
  const first = runCompletionCheck(deps, PROJECT, check);
  await firstStarted;
  const retry = runCompletionCheck(deps, PROJECT, check);
  setTimeout(release, 25);
  await retry;
  release();
  await first;
  expect(modelCalls).toBe(1);
  expect(db.calls.filter((c) => c.name === "prd_check_record")).toHaveLength(1);
});
