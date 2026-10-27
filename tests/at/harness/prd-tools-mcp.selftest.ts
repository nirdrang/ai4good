import { expect, it } from "vitest";
import { signGrant, type GrantClaims } from "../../../supabase/functions/_shared/prd/grant.ts";
import { handlePrdTools, type PrdToolsDeps } from "../../../supabase/functions/_shared/prd/mcp.ts";
import type { SettleDatabase } from "../../../supabase/functions/_shared/write-routes.ts";

const KEY = "prd-tools-signing-key-for-the-offline-tests";
const NOW = Date.parse("2026-01-01T00:00:00.000Z");
const CLAIMS: GrantClaims = {
  grantId: "44444444-4444-4444-8444-444444444444",
  projectId: "55555555-5555-4555-8555-555555555555",
  chatId: "66666666-6666-4666-8666-666666666666",
  expiresAt: "2026-06-01T00:00:00.000Z",
};
const REPLY = ["read_section", "stage_section", "propose_ready", "suggest_ngo_question", "commit_prepare"];
const ANSWER = ["record_outcome", "commit_prepare"];
const SECRET = "SECRET-DB-TEXT";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deps(rpc: SettleDatabase): PrdToolsDeps {
  return {
    rpc,
    fetch: async () => {
      throw new Error("github was called");
    },
    key: KEY,
    now: () => NOW,
    env: {},
  };
}

function storedGrant(overrides: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    value: {
      grant: CLAIMS.grantId,
      project: CLAIMS.projectId,
      chat: CLAIMS.chatId,
      turn: "77777777-7777-4777-8777-777777777777",
      expiresAt: CLAIMS.expiresAt,
      ...overrides,
    },
  };
}

function recording(
  reply: (name: string, args: Record<string, unknown>) => Awaited<ReturnType<SettleDatabase>>,
  stored = storedGrant(),
) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const rpc: SettleDatabase = async (name, args) => {
    if (name === "prd_grant_claims") return stored;
    calls.push({ name, args });
    return reply(name, args);
  };
  return { calls, rpc };
}

async function post(
  body: unknown,
  rpc: SettleDatabase,
  token: string | null,
): Promise<{ status: number; text: string; json: unknown }> {
  const headers = new Headers();
  if (token !== null) headers.set("authorization", `Bearer ${token}`);
  const response = await handlePrdTools(
    new Request("http://localhost/prd-tools", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    deps(rpc),
  );
  const text = await response.text();
  return { status: response.status, text, json: text === "" ? null : JSON.parse(text) };
}

function rpcMessage(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("expected a JSON-RPC object");
  return value;
}

it("answers 401 for a missing bearer, a bad bearer, and a grant SQL refuses", async () => {
  const token = await signGrant(CLAIMS, KEY);
  const silent = recording(() => {
    throw new Error("sql");
  });
  const missing = await post({ jsonrpc: "2.0", id: 1, method: "ping" }, silent.rpc, null);
  const bad = await post({ jsonrpc: "2.0", id: 1, method: "ping" }, silent.rpc, "not-a-grant");
  const garbage = await post("not-json", silent.rpc, "not-a-grant");
  expect(missing).toMatchObject({ status: 401, text: "" });
  expect(bad).toMatchObject({ status: 401, text: "" });
  expect(garbage).toMatchObject({ status: 401, text: "" });
  expect(silent.calls).toHaveLength(0);

  const refused = recording(() => ({ ok: false, message: SECRET, details: "revoked" }));
  const listed = await post({ jsonrpc: "2.0", id: 4, method: "tools/list" }, refused.rpc, token);
  expect(listed).toMatchObject({ status: 401, text: "" });
  expect(listed.text).not.toContain(SECRET);
  const called = await post(
    { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "read_section", arguments: { key: "booking" } } },
    refused.rpc,
    token,
  );
  expect(called).toMatchObject({ status: 401, text: "" });
  expect(called.text).not.toContain(SECRET);
});

it("answers 401 when the signed claims differ from the stored grant", async () => {
  const token = await signGrant(CLAIMS, KEY);
  const cases = [
    storedGrant({ project: "88888888-8888-4888-8888-888888888888" }),
    storedGrant({ chat: "99999999-9999-4999-8999-999999999999" }),
    storedGrant({ expiresAt: "2026-07-01T00:00:00.000Z" }),
    { ok: false as const, message: SECRET, details: "unknown-grant" },
  ];
  for (const stored of cases) {
    const silent = recording(() => {
      throw new Error("sql");
    }, stored as ReturnType<typeof storedGrant>);
    const response = await post(
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "read_section", arguments: { key: "booking" } } },
      silent.rpc,
      token,
    );
    expect(response).toMatchObject({ status: 401, text: "" });
    expect(silent.calls).toHaveLength(0);
  }
});

it("serves nothing when the signing key is missing or short", async () => {
  const token = await signGrant(CLAIMS, KEY);
  const silent = recording(() => {
    throw new Error("sql");
  });
  for (const key of ["", "short-key"]) {
    const response = await handlePrdTools(
      new Request("http://localhost/prd-tools", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      }),
      { ...deps(silent.rpc), key },
    );
    expect(response.status).toBe(503);
  }
  expect(silent.calls).toHaveLength(0);
});

it("answers initialize, ping, and notifications", async () => {
  const token = await signGrant(CLAIMS, KEY);
  const silent = recording(() => {
    throw new Error("sql");
  });
  const latest = rpcMessage((await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }, silent.rpc, token)).json);
  expect(latest.result).toEqual({
    protocolVersion: "2025-11-25",
    capabilities: { tools: {} },
    serverInfo: { name: "prd-tools", version: "1" },
  });
  const echoed = rpcMessage(
    (await post(
      { jsonrpc: "2.0", id: "abc", method: "initialize", params: { protocolVersion: "2025-03-26" } },
      silent.rpc,
      token,
    )).json,
  );
  expect(echoed.id).toBe("abc");
  expect(isRecord(echoed.result) ? echoed.result.protocolVersion : null).toBe("2025-03-26");
  const ping = rpcMessage((await post({ jsonrpc: "2.0", id: 2, method: "ping" }, silent.rpc, token)).json);
  expect(ping.result).toEqual({});
  const notice = await post({ jsonrpc: "2.0", method: "notifications/initialized" }, silent.rpc, token);
  const other = await post({ jsonrpc: "2.0", method: "notifications/cancelled" }, silent.rpc, token);
  expect(notice).toMatchObject({ status: 202, text: "" });
  expect(other).toMatchObject({ status: 202, text: "" });
  expect(silent.calls).toHaveLength(0);
});

it("lists the tools the grant's mode allows", async () => {
  const token = await signGrant(CLAIMS, KEY);
  const listed = async (names: string[]) => {
    const world = recording((name) => {
      expect(name).toBe("prd_grant_tools");
      return { ok: true, value: names };
    });
    const response = await post({ jsonrpc: "2.0", id: 1, method: "tools/list" }, world.rpc, token);
    const result = rpcMessage(response.json).result;
    if (!isRecord(result) || !Array.isArray(result.tools)) throw new Error("expected tools");
    return result.tools.map((tool) => (isRecord(tool) ? tool.name : null));
  };
  expect(await listed(REPLY)).toEqual([
    "read_section",
    "stage_section",
    "propose_ready",
    "suggest_ngo_question",
    "commit_turn",
  ]);
  expect(await listed(ANSWER)).toEqual(["record_outcome", "commit_turn"]);
});

it("routes each tool to its SQL function with the parsed arguments", async () => {
  const token = await signGrant(CLAIMS, KEY);
  const question = { section: "booking", text: "How long?", why: "The kitchen decides.", options: [], blocking: true };
  const outcome = { kind: "final-answer", answer: "12 months." };
  const document = { statements: [{ text: "Booked.", sources: ["Discovery revision 1"] }], decisions: [] };
  const receipt = "88888888-8888-4888-8888-888888888888";
  const cases: { name: string; arguments: unknown; sql: string; args: Record<string, unknown>; value: unknown }[] = [
    { name: "read_section", arguments: { key: "booking" }, sql: "read_section", args: { p_grant: CLAIMS.grantId, p_key: "booking" }, value: { receipt } },
    {
      name: "stage_section",
      arguments: { receipt, document },
      sql: "stage_section",
      args: { p_grant: CLAIMS.grantId, p_receipt: receipt, p_document: document },
      value: { staged: "section" },
    },
    {
      name: "propose_ready",
      arguments: { key: "rules" },
      sql: "propose_ready",
      args: { p_grant: CLAIMS.grantId, p_key: "rules" },
      value: { staged: "ready" },
    },
    {
      name: "suggest_ngo_question",
      arguments: { question },
      sql: "suggest_ngo_question",
      args: { p_grant: CLAIMS.grantId, p_question: question },
      value: { staged: "suggest-ngo" },
    },
    {
      name: "record_outcome",
      arguments: { outcome },
      sql: "record_outcome",
      args: { p_grant: CLAIMS.grantId, p_outcome: outcome },
      value: { staged: "outcome" },
    },
  ];
  for (const item of cases) {
    const world = recording((name, args) => {
      expect(name).toBe(item.sql);
      expect(args).toEqual(item.args);
      return { ok: true, value: item.value };
    });
    const response = await post(
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: item.name, arguments: item.arguments } },
      world.rpc,
      token,
    );
    const result = rpcMessage(response.json).result;
    expect(result).toEqual({ content: [{ type: "text", text: JSON.stringify(item.value) }] });
    expect(world.calls).toHaveLength(1);
  }
});

it("refuses bad arguments before SQL and maps a refusal to a fixed message", async () => {
  const token = await signGrant(CLAIMS, KEY);
  const silent = recording(() => {
    throw new Error("sql");
  });
  const bad = await post(
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "read_section", arguments: { key: "" } } },
    silent.rpc,
    token,
  );
  const extra = await post(
    { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "commit_turn", arguments: { key: "booking" } } },
    silent.rpc,
    token,
  );
  expect(rpcMessage(bad.json).result).toEqual({
    content: [{ type: "text", text: "That request is not valid." }],
    isError: true,
  });
  expect(rpcMessage(extra.json).result).toMatchObject({ isError: true });
  expect(silent.calls).toHaveLength(0);

  const refused = recording(() => ({ ok: false, message: SECRET, details: "wrong-receipt" }));
  const response = await post(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "stage_section", arguments: { receipt: "88888888-8888-4888-8888-888888888888", document: { statements: [], decisions: [] } } },
    },
    refused.rpc,
    token,
  );
  expect(response.text).not.toContain(SECRET);
  expect(rpcMessage(response.json).result).toEqual({
    content: [{ type: "text", text: "That read receipt is not for this turn." }],
    isError: true,
  });
});

it("returns the current sections when the commit is stale", async () => {
  const token = await signGrant(CLAIMS, KEY);
  const sections = [{ key: "booking", document: { statements: [], decisions: [] } }];
  const world = recording((name, args) => {
    expect(name).toBe("commit_prepare");
    expect(args).toEqual({ p_grant: CLAIMS.grantId });
    return { ok: true, value: { ok: false, reason: "stale", sections } };
  });
  const response = await post(
    { jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "commit_turn", arguments: {} } },
    world.rpc,
    token,
  );
  expect(rpcMessage(response.json).result).toEqual({
    content: [
      { type: "text", text: "A staged section changed since it was read. Use the current sections and redo the work." },
      { type: "text", text: JSON.stringify(sections) },
    ],
    isError: true,
  });
});

it("reports an unknown method as a JSON-RPC error", async () => {
  const token = await signGrant(CLAIMS, KEY);
  const silent = recording(() => {
    throw new Error("sql");
  });
  const response = await post({ jsonrpc: "2.0", id: 7, method: "resources/list" }, silent.rpc, token);
  expect(rpcMessage(response.json).error).toEqual({ code: -32601, message: "Method not found" });
  expect(silent.calls).toHaveLength(0);
});
