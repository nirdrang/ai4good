import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { parsePrdSnapshot } from "../../../src/lib/prd-stream.ts";
import { prdRelayDeps } from "../../../supabase/functions/_shared/prd/relay.ts";
import { snapshotFromRecord } from "../../../supabase/functions/_shared/prd/snapshot.ts";
import { runCompletionCheck, type StartedCheck } from "../../../supabase/functions/_shared/prd/check.ts";
import type { PrdTurnDeps } from "../../../supabase/functions/_shared/prd/turn.ts";
import type { SettleDatabase } from "../../../supabase/functions/_shared/write-routes.ts";

const PROJECT = "55555555-5555-4555-8555-555555555555";
const TURN = "33333333-3333-4333-8333-333333333333";
const CONFIGURED = { threshold: 85, thresholdText: "85 (placeholder)" };

const STARTED: StartedCheck = {
  turnId: TURN,
  sectionKey: "technical-scope",
  priorState: "ready",
  priorChanged: null,
};

const FUNDS = {
  allocationMicros: 1_000_000,
  settledMicros: 0,
  pendingMicros: 0,
  replyHoldMicros: 50_000,
  availableMicros: 1_000_000,
  band: "green",
  replyFunded: true,
};

type Call = { name: string; args: Record<string, unknown> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sourceBody(extra: Record<string, unknown> = {}) {
  return {
    state: "admitted",
    recorded: null,
    chatId: "66666666-6666-4666-8666-666666666666",
    revision: 2,
    threshold: CONFIGURED.threshold,
    thresholdText: CONFIGURED.thresholdText,
    discovery: {
      need: { text: "Schedule volunteers" },
      dataTier: { tier: "personal", kinds: ["contact"], reason: "The rota stores volunteer phone numbers." },
      fit: { verdict: "fits", reason: "No shift may be shorter than two hours." },
    },
    sections: [
      {
        key: "booking",
        title: "Who books shifts",
        document: { statements: [{ text: "Volunteers book themselves." }], decisions: [] },
      },
      {
        key: "technical-scope",
        title: "Technical scope",
        document: { statements: [], decisions: [], technicalScope: {} },
      },
    ],
    ...extra,
  };
}

function database(source: Record<string, unknown>) {
  const calls: Call[] = [];
  const rpc: SettleDatabase = async (name, args) => {
    calls.push({ name, args });
    if (name === "prd_check_source") return { ok: true, value: source };
    if (name === "prd_turn_settings_record") return { ok: true, value: {} };
    if (name === "prd_turn_ingest") return { ok: true, value: { providerMicros: 12, feeMicros: 1 } };
    if (name === "prd_check_record") return { ok: true, value: { id: args.p_check, replayed: false } };
    if (name === "prd_check_revert") return { ok: true, value: null };
    return { ok: false, message: `unexpected ${name}` };
  };
  return { calls, rpc };
}

function modelOf(text: string | "throw") {
  let calls = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async () => {
      calls += 1;
      if (text === "throw") throw new Error("the model rejected the check");
      return {
        content: [{ type: "text", text }],
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: { total: 11, noCache: 11, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 7, text: 7, reasoning: 0 },
        },
        warnings: [],
      };
    },
  });
  return { model, calls: () => calls };
}

function depsFor(rpc: SettleDatabase, model: PrdTurnDeps["model"], configured: boolean): PrdTurnDeps {
  return prdRelayDeps({
    rpc,
    fetch: async () => new Response("offline", { status: 500 }),
    env: configured
      ? {
          PRD_MODEL_BASE_URL: "https://model.example/v1/",
          PRD_MODEL: "selftest-model",
          PRD_MODEL_API_KEY: "test-key",
        }
      : {},
    model,
  });
}

function events(calls: Call[]): Array<Record<string, unknown>> {
  return calls
    .filter((call) => call.name === "prd_turn_ingest")
    .map((call) => call.args.p_event as Record<string, unknown>);
}

function recordCall(calls: Call[]): Record<string, unknown> | null {
  const found = calls.find((call) => call.name === "prd_check_record");
  return found ? found.args : null;
}

function partsOf(args: Record<string, unknown>): unknown[] {
  const parts = args.p_parts;
  if (!Array.isArray(parts)) throw new Error("the check message has no parts");
  return parts;
}

function shell(parts: unknown[]) {
  return {
    sequence: 1,
    revision: 2,
    viewer: { role: "dev", name: "Priya Shah" },
    people: [
      { role: "dev", name: "Priya Shah", label: "Developer" },
      { role: "ngo", name: "Maya Levi", label: "NGO" },
      { role: "ai", name: "ai4good AI", label: "AI" },
    ],
    project: { title: "Volunteer scheduling", organizationName: "Harbor Community Kitchen" },
    discoveryRevision: 2,
    topics: [],
    devQuestions: [],
    questions: [],
    chats: { main: [{ id: "m1", role: "assistant", parts }] },
    canWrite: { main: true },
    send: { main: { kind: "available" } },
    funds: FUNDS,
    check: null,
    close: {
      kind: "open",
      remaining: [],
      path: "check",
      close: { kind: "unavailable", reason: "Not available yet." },
    },
    drafts: {},
  };
}

function parsedMessage(args: Record<string, unknown>) {
  const snapshot = parsePrdSnapshot(shell(partsOf(args)));
  const message = snapshot.chats.main?.[0];
  if (message === undefined) throw new Error("the check message did not parse");
  return message;
}

describe("completion check offline", () => {
  it("records a passing check, settles one model request, and ends last", async () => {
    const db = database(sourceBody());
    const language = modelOf(
      JSON.stringify({ score: 91, coverageText: "The PRD covers the agreed booking answer.", gaps: [] }),
    );
    const result = await runCompletionCheck(depsFor(db.rpc, language.model, true), PROJECT, STARTED);
    expect(result).toEqual({ args: null, failure: null, skipSettle: true });
    expect(language.calls()).toBe(1);
    const recorded = recordCall(db.calls);
    if (recorded === null) throw new Error("the passing check was not recorded");
    expect(recorded.p_score).toBe(91);
    expect(recorded.p_gaps).toEqual([]);
    const message = parsedMessage(recorded);
    const text = message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
    expect(text).toContain("91%");
    expect(text).toContain(CONFIGURED.thresholdText);
    expect(text).toContain("passes.");
    const check = message.parts.find((part) => part.type === "data-check");
    expect(check?.data).toEqual({ checkId: recorded.p_check, gaps: [] });
    const ingested = events(db.calls);
    expect(ingested.map((event) => event.kind)).toEqual(["model-end", "end"]);
    expect(ingested[0]).toMatchObject({
      eventId: `${TURN}:0`,
      usage: { input: 11, output: 7, cacheRead: 0, cacheWrite: 0 },
    });
    expect(ingested[1]).toEqual({ kind: "end", outcome: "answered" });
    const settings = db.calls.find((call) => call.name === "prd_turn_settings_record");
    expect(settings?.args.p_settings).toMatchObject({ baseURL: "https://model.example/v1", model: "selftest-model" });
    expect(db.calls.some((call) => call.name === "prd_check_revert")).toBe(false);
  });

  it("records a failing check and names each gap on its section", async () => {
    const db = database(sourceBody());
    const gaps = [
      { sectionKey: "technical-scope", text: "No user story is written." },
      { sectionKey: "technical-scope", text: "No acceptance criterion is written." },
    ];
    const language = modelOf(JSON.stringify({ score: 40, coverageText: "Stories are missing.", gaps }));
    const result = await runCompletionCheck(depsFor(db.rpc, language.model, true), PROJECT, STARTED);
    expect(result.failure).toBeNull();
    const recorded = recordCall(db.calls);
    if (recorded === null) throw new Error("the failing check was not recorded");
    expect(recorded.p_gaps).toEqual(gaps);
    const message = parsedMessage(recorded);
    const text = message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
    expect(text).toContain("does not pass yet.");
    expect(text).toContain(CONFIGURED.thresholdText);
    expect(text).toContain("Technical scope: No user story is written.");
    const check = message.parts.find((part) => part.type === "data-check");
    expect(check?.data.gaps).toEqual([
      { topicId: "technical-scope", title: "Technical scope", text: "No user story is written.", fixed: false },
      { topicId: "technical-scope", title: "Technical scope", text: "No acceptance criterion is written.", fixed: false },
    ]);
    expect(events(db.calls).map((event) => event.kind)).toEqual(["model-end", "end"]);
  });

  it("drops a gap whose section key is not in the PRD and says so", async () => {
    const db = database(sourceBody());
    const gaps = [
      { sectionKey: "booking", text: "The phone-number decision is missing." },
      { sectionKey: "not-a-section", text: "This key is not a section." },
    ];
    const language = modelOf(JSON.stringify({ score: 50, coverageText: "One key is unknown.", gaps }));
    await runCompletionCheck(depsFor(db.rpc, language.model, true), PROJECT, STARTED);
    const recorded = recordCall(db.calls);
    if (recorded === null) throw new Error("the check was not recorded");
    expect(recorded.p_gaps).toEqual(gaps);
    const message = parsedMessage(recorded);
    const text = message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
    expect(text).toContain("These section keys are not in this PRD and were not recorded: not-a-section.");
    const check = message.parts.find((part) => part.type === "data-check");
    expect(check?.data.gaps).toEqual([
      {
        topicId: "booking",
        title: "Who books shifts",
        text: "The phone-number decision is missing.",
        fixed: false,
      },
    ]);
  });

  it("rejects a malformed model result, releases the reservation, and records no check", async () => {
    const db = database(sourceBody());
    const language = modelOf("not json");
    const result = await runCompletionCheck(depsFor(db.rpc, language.model, false), PROJECT, STARTED);
    expect(result).toMatchObject({ args: null, status: 502 });
    expect(result.failure).toContain("Nothing was recorded");
    expect(language.calls()).toBe(1);
    expect(recordCall(db.calls)).toBeNull();
    expect(db.calls.some((call) => call.name === "prd_check_revert")).toBe(true);
    expect(events(db.calls)).toEqual([{ kind: "end", outcome: "rejected" }]);
  });

  it("rejects a gap whose section key is blank after it settles the model request", async () => {
    const db = database(sourceBody());
    const language = modelOf(
      JSON.stringify({ score: 50, coverageText: "A blank key.", gaps: [{ sectionKey: " ", text: "Missing." }] }),
    );
    const result = await runCompletionCheck(depsFor(db.rpc, language.model, false), PROJECT, STARTED);
    expect(result.status).toBe(502);
    expect(recordCall(db.calls)).toBeNull();
    expect(events(db.calls).map((event) => event.kind)).toEqual(["model-end", "end"]);
    expect(events(db.calls).at(-1)).toEqual({ kind: "end", outcome: "rejected" });
    expect(db.calls.some((call) => call.name === "prd_check_revert")).toBe(true);
  });

  it("reuses a check that is already recorded and does not call the model", async () => {
    const db = database(sourceBody({ state: "answered", recorded: { id: "already" } }));
    const language = modelOf("throw");
    const result = await runCompletionCheck(depsFor(db.rpc, language.model, true), PROJECT, STARTED);
    expect(result).toEqual({ args: null, failure: null, skipSettle: true });
    expect(language.calls()).toBe(0);
    expect(db.calls.map((call) => call.name)).toEqual(["prd_check_source"]);
  });

  it("maps the check and a section gap into the shapes the screen parses", () => {
    const facts = {
      sequence: 4,
      revision: 2,
      discoveryRevision: 2,
      people: [
        { role: "ai", name: "ai4good AI", label: "AI" },
        { role: "dev", name: "Priya Shah", label: "Developer" },
        { role: "ngo", name: "Maya Levi", label: "NGO" },
      ],
      project: { title: "Volunteer scheduling", organizationName: "Harbor Community Kitchen" },
      sections: [
        {
          key: "booking",
          title: "Who books shifts",
          required: true,
          state: "needs-review",
          document: { statements: [{ text: "Volunteers book themselves.", sources: [] }], decisions: [] },
          gap: "The phone-number decision is missing.",
          changedSinceConfirmed: "an older note",
          confirm: { allowed: false, reason: "gap", token: null },
          reopen: { allowed: false, reason: "not-confirmed", token: null },
        },
        {
          key: "rules",
          title: "Booking rules",
          required: true,
          state: "needs-review",
          document: { statements: [{ text: "Shifts stay open.", sources: [] }], decisions: [] },
          gap: null,
          changedSinceConfirmed: "Gap closed",
          confirm: { allowed: true, reason: null, token: "confirm-topic|topic:rules|2|0" },
          reopen: { allowed: false, reason: "not-confirmed", token: null },
        },
      ],
      chats: [],
      drafts: {},
      funds: FUNDS,
      devQuestions: [],
      questions: [],
      check: {
        id: "check-1",
        revision: 2,
        passed: false,
        coverageText: "A data decision is missing.",
        thresholdText: CONFIGURED.thresholdText,
        gaps: [
          {
            topicId: "booking",
            title: "Who books shifts",
            text: "The phone-number decision is missing.",
            fixed: false,
          },
        ],
      },
    };
    const dev = parsePrdSnapshot(snapshotFromRecord(facts, { role: "dev", name: "Priya Shah" }));
    expect(dev.check).toEqual(facts.check);
    expect(dev.topics[0]).toMatchObject({
      statusText: "Gap from the completion check: The phone-number decision is missing.",
      blocker: "Completion check gap · fix it in this section",
      changeSummary: null,
      confirm: { kind: "unavailable", reason: "Fix the completion check gap first." },
    });
    expect(dev.topics[1]).toMatchObject({
      statusText: "Gap closed. Read it again and confirm.",
      blocker: "Gap closed · Priya reviews and confirms again",
      changeSummary: null,
    });
    const ngo = snapshotFromRecord(facts, { role: "ngo", name: "Maya Levi" });
    expect(ngo.topics[0]?.blocker).toBe("Completion check gap · Priya fixes it in this section");
    expect(ngo.topics[1]?.statusText).toBe("Gap closed. Ready for Priya to confirm again.");
    expect(isRecord(dev.check)).toBe(true);
  });
});
