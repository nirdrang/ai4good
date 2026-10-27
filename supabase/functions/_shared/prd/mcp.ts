import { githubConfig, type GithubFailure, type GithubFetch } from "../github/app.ts";
import { githubRepo, type GithubRepo } from "../github/repo.ts";
import type { SettleDatabase } from "../write-routes.ts";
import { commitTurn } from "./git.ts";
import { verifyGrant, type GrantClaims } from "./grant.ts";

const LATEST_PROTOCOL = "2025-11-25";
const SUPPORTED_PROTOCOLS = ["2024-11-05", "2025-03-26", "2025-06-18", LATEST_PROTOCOL];

const GRANT_REFUSAL = new Set(["unknown-grant", "revoked", "expired", "turn-finished"]);

const REFUSAL: Record<string, string> = {
  "tool-denied": "That tool is not available in this turn.",
  "nothing-staged": "Nothing is staged to commit.",
  "wrong-receipt": "That read receipt is not for this turn.",
  "invalid-document": "That document is not a section.",
  "invalid-request": "That request is not valid.",
  "not-ready": "That section is not ready.",
  "not-confirmed": "That section is not confirmed.",
  "follow-up-open": "A follow-up is still open.",
  busy: "The commit is busy. Try again.",
  closed: "The PRD is closed.",
  forbidden: "That action is not allowed.",
  "commit-failed": "The commit could not be written.",
};

type JsonSchema = {
  type: "object";
  properties: Record<string, { type: "string" | "object"; minLength?: number; format?: "uuid" }>;
  required: string[];
  additionalProperties: boolean;
};

type ToolSpec = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  sql: string;
};

const objectField = { type: "object" as const };
const keyField = { type: "string" as const, minLength: 1 };
const uuidField = { type: "string" as const, format: "uuid" as const };

export const TOOLS: readonly ToolSpec[] = [
  {
    name: "read_section",
    description: "Read one section of the PRD.",
    inputSchema: {
      type: "object",
      properties: { key: keyField },
      required: ["key"],
      additionalProperties: false,
    },
    sql: "read_section",
  },
  {
    name: "stage_section",
    description: "Stage a new document for a section read in this turn.",
    inputSchema: {
      type: "object",
      properties: { receipt: uuidField, document: objectField },
      required: ["receipt", "document"],
      additionalProperties: false,
    },
    sql: "stage_section",
  },
  {
    name: "propose_ready",
    description: "Stage Ready to confirm for a section.",
    inputSchema: {
      type: "object",
      properties: { key: keyField },
      required: ["key"],
      additionalProperties: false,
    },
    sql: "propose_ready",
  },
  {
    name: "suggest_ngo_question",
    description: "Stage a question for the NGO.",
    inputSchema: {
      type: "object",
      properties: { question: objectField },
      required: ["question"],
      additionalProperties: false,
    },
    sql: "suggest_ngo_question",
  },
  {
    name: "record_outcome",
    description: "Stage the outcome of the NGO side chat.",
    inputSchema: {
      type: "object",
      properties: { outcome: objectField },
      required: ["outcome"],
      additionalProperties: false,
    },
    sql: "record_outcome",
  },
  {
    name: "commit_turn",
    description: "Commit the staged changes for this turn.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    sql: "commit_prepare",
  },
];

export type PrdToolsDeps = {
  rpc: SettleDatabase;
  fetch: GithubFetch;
  key: string;
  now: () => number;
  env: Record<string, string | undefined>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function empty(status: number): Response {
  return new Response(null, { status });
}

function rpcResult(id: unknown, result: unknown): Response {
  return json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: unknown, code: number, message: string): Response {
  return json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

function sentence(code: string): string {
  return REFUSAL[code] ?? "That tool call was refused.";
}

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header === null) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match?.[1] ?? null;
}

function argumentsMatch(schema: JsonSchema, value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (schema.additionalProperties === false && keys.some((key) => !(key in schema.properties))) return false;
  if (schema.required.some((key) => !(key in value))) return false;
  for (const [key, spec] of Object.entries(schema.properties)) {
    if (!(key in value)) continue;
    const item = value[key];
    if (spec.type === "string") {
      if (typeof item !== "string") return false;
      if (spec.minLength !== undefined && item.length < spec.minLength) return false;
      if (spec.format === "uuid" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item)) {
        return false;
      }
    } else if (!isRecord(item)) {
      return false;
    }
  }
  return true;
}

function sqlArgs(tool: ToolSpec, grantId: string, args: Record<string, unknown>): Record<string, unknown> {
  const grant = { p_grant: grantId };
  if (tool.sql === "read_section" || tool.sql === "propose_ready") return { ...grant, p_key: args.key };
  if (tool.sql === "stage_section") return { ...grant, p_receipt: args.receipt, p_document: args.document };
  if (tool.sql === "suggest_ngo_question") return { ...grant, p_question: args.question };
  if (tool.sql === "record_outcome") return { ...grant, p_outcome: args.outcome };
  return grant;
}

function toolResult(id: unknown, texts: string[], isError: boolean): Response {
  return rpcResult(id, {
    content: texts.map((text) => ({ type: "text", text })),
    ...(isError ? { isError: true } : {}),
  });
}

function protocolVersion(params: unknown): string {
  const asked = isRecord(params) && typeof params.protocolVersion === "string" ? params.protocolVersion : "";
  return SUPPORTED_PROTOCOLS.includes(asked) ? asked : LATEST_PROTOCOL;
}

function namesOf(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return null;
  return value;
}

function failureCode(result: { ok: false; details?: string | null }): string | null {
  return typeof result.details === "string" && result.details !== "" ? result.details : null;
}

function unavailableRepo(reason: string): GithubRepo {
  const failure: GithubFailure = { ok: false, kind: "invalid", reason };
  return {
    createRepo: async () => failure,
    protection: async () => failure,
    head: async () => failure,
    readCommit: async () => failure,
    writeCommit: async () => failure,
    advance: async () => failure,
    commitsSince: async () => failure,
    prdTree: async () => failure,
    readBlobs: async () => failure,
    tag: async () => failure,
  };
}

function lazyGithub(env: Record<string, string | undefined>, fetchImpl: GithubFetch): GithubRepo {
  let repo: GithubRepo | null = null;
  const client = (): GithubRepo => {
    if (repo !== null) return repo;
    const configured = githubConfig(env);
    repo = configured.ok ? githubRepo(configured.config, fetchImpl) : unavailableRepo(configured.reason);
    return repo;
  };
  return {
    createRepo: (name) => client().createRepo(name),
    protection: (repoName) => client().protection(repoName),
    head: (repoName) => client().head(repoName),
    readCommit: (repoName, sha) => client().readCommit(repoName, sha),
    writeCommit: (repoName, parent, files, message) => client().writeCommit(repoName, parent, files, message),
    advance: (repoName, sha) => client().advance(repoName, sha),
    commitsSince: (repoName, from, to) => client().commitsSince(repoName, from, to),
    prdTree: (repoName, commit) => client().prdTree(repoName, commit),
    readBlobs: (repoName, shas) => client().readBlobs(repoName, shas),
    tag: (repoName, name, sha) => client().tag(repoName, name, sha),
  };
}

async function database(deps: PrdToolsDeps, name: string, args: Record<string, unknown>) {
  const call = deps.rpc;
  return call(name, args);
}

async function listTools(id: unknown, claims: GrantClaims, deps: PrdToolsDeps): Promise<Response> {
  const listed = await database(deps, "prd_grant_tools", { p_grant: claims.grantId });
  if (!listed.ok) {
    const code = failureCode(listed);
    if (code !== null && GRANT_REFUSAL.has(code)) return empty(401);
    return rpcError(id, -32603, "The tools could not be listed.");
  }
  const names = namesOf(listed.value);
  if (names === null) return rpcError(id, -32603, "The tools could not be listed.");
  const allowed = new Set(names);
  return rpcResult(id, {
    tools: TOOLS.filter((tool) => allowed.has(tool.sql)).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  });
}

async function callTool(
  id: unknown,
  params: unknown,
  claims: GrantClaims,
  deps: PrdToolsDeps,
): Promise<Response> {
  if (!isRecord(params) || typeof params.name !== "string") return rpcError(id, -32602, "Invalid params");
  const tool = TOOLS.find((item) => item.name === params.name);
  if (tool === undefined) return toolResult(id, [sentence("tool-denied")], true);
  const args = params.arguments === undefined ? {} : params.arguments;
  if (!argumentsMatch(tool.inputSchema, args)) return toolResult(id, [sentence("invalid-request")], true);
  if (tool.name === "commit_turn") {
    const outcome = await commitTurn(claims.projectId, claims.grantId, {
      github: lazyGithub(deps.env, deps.fetch),
      rpc: deps.rpc,
    });
    if (!outcome.ok) {
      if (GRANT_REFUSAL.has(outcome.reason)) return empty(401);
      return toolResult(id, [sentence(outcome.reason)], true);
    }
    if (outcome.result === "busy") return toolResult(id, [sentence("busy")], true);
    if (outcome.result === "stale") {
      return toolResult(
        id,
        [
          "A staged section changed since it was read. Use the current sections and redo the work.",
          JSON.stringify(outcome.sections),
        ],
        true,
      );
    }
    return toolResult(id, [JSON.stringify({ sha: outcome.sha })], false);
  }
  const called = await database(deps, tool.sql, sqlArgs(tool, claims.grantId, args));
  if (!called.ok) {
    const code = failureCode(called);
    if (code !== null && GRANT_REFUSAL.has(code)) return empty(401);
    return toolResult(id, [sentence(code ?? "")], true);
  }
  return toolResult(id, [JSON.stringify(called.value)], false);
}

/** One stateless MCP response. The bearer is the grant token; SQL still checks the grant. */
export async function handlePrdTools(request: Request, deps: PrdToolsDeps): Promise<Response> {
  if (request.method !== "POST") return empty(405);
  const token = bearer(request);
  if (token === null) return empty(401);
  const verified = await verifyGrant(token, deps.key, deps.now());
  if (!verified.ok) return empty(401);
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return rpcError(null, -32700, "Parse error");
  }
  if (!isRecord(body) || typeof body.method !== "string" || body.jsonrpc !== "2.0") {
    return rpcError(null, -32600, "Invalid Request");
  }
  if (!Object.hasOwn(body, "id")) return empty(202);
  const id = body.id;
  if (body.method === "initialize") {
    return rpcResult(id, {
      protocolVersion: protocolVersion(body.params),
      capabilities: { tools: {} },
      serverInfo: { name: "prd-tools", version: "1" },
    });
  }
  if (body.method === "ping") return rpcResult(id, {});
  if (body.method === "tools/list") return listTools(id, verified.claims, deps);
  if (body.method === "tools/call") return callTool(id, body.params, verified.claims, deps);
  return rpcError(id, -32601, "Method not found");
}
