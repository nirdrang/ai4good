import { jsonSchema, tool, type ToolSet } from "npm:ai@7.0.102";
import { githubConfig, type GithubFailure, type GithubFetch } from "../github/app.ts";
import { githubRepo, type GithubRepo } from "../github/repo.ts";
import type { SettleDatabase } from "../write-routes.ts";
import { commitTurn, type GitDeps } from "./git.ts";

const REFUSAL: Record<string, string> = {
  "tool-denied": "That tool is not available in this turn.",
  "nothing-staged": "Nothing is staged to commit.",
  forbidden: "That action is not allowed.",
  "wrong-receipt": "That read receipt is not for this turn.",
  "invalid-document": "That document is not a section.",
  "invalid-request": "That request is not valid.",
  "not-ready": "That section is not ready.",
  "not-confirmed": "That section is not confirmed.",
  "follow-up-open": "A follow-up is still open.",
  busy: "The commit is busy. Try again.",
  closed: "The PRD is closed.",
  "commit-failed": "The commit could not be written.",
  "unknown-grant": "That grant does not exist.",
  revoked: "That grant was revoked.",
  expired: "That grant has expired.",
  "turn-finished": "That turn has finished.",
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

export type PrdToolScope = {
  grantId: string;
  projectId: string;
  chatId: string;
  turnId: string;
};

export type PrdToolDeps = GitDeps;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sentence(code: string): string {
  return REFUSAL[code] ?? "That tool call was refused.";
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

function sqlArgs(spec: ToolSpec, grantId: string, args: Record<string, unknown>): Record<string, unknown> {
  const grant = { p_grant: grantId };
  if (spec.sql === "read_section" || spec.sql === "propose_ready") return { ...grant, p_key: args.key };
  if (spec.sql === "stage_section") return { ...grant, p_receipt: args.receipt, p_document: args.document };
  if (spec.sql === "suggest_ngo_question") return { ...grant, p_question: args.question };
  if (spec.sql === "record_outcome") return { ...grant, p_outcome: args.outcome };
  return grant;
}

function failureCode(result: { ok: false; details?: string | null }): string {
  return typeof result.details === "string" && result.details !== "" ? result.details : "invalid-request";
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

export function prdGithub(env: Record<string, string | undefined>, fetchImpl: GithubFetch): GithubRepo {
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

function sameScope(bound: PrdToolScope, grant: PrdToolScope): boolean {
  return (
    grant.grantId === bound.grantId &&
    grant.projectId === bound.projectId &&
    grant.chatId === bound.chatId &&
    grant.turnId === bound.turnId
  );
}

async function commitResult(deps: PrdToolDeps, scope: PrdToolScope): Promise<string> {
  const outcome = await commitTurn(scope.projectId, scope.grantId, deps);
  if (!outcome.ok) return sentence(outcome.reason);
  if (outcome.result === "busy") return sentence("busy");
  if (outcome.result === "stale") {
    return [
      "A staged section changed since it was read. Use the current sections and redo the work.",
      JSON.stringify(outcome.sections),
    ].join("\n");
  }
  return JSON.stringify({ sha: outcome.sha });
}

/** Runs one PRD tool. A refusal is the tool result the model reads. */
export async function executePrdTool(
  deps: PrdToolDeps,
  bound: PrdToolScope,
  grant: PrdToolScope,
  name: string,
  input: unknown,
): Promise<string> {
  if (!sameScope(bound, grant)) return sentence("forbidden");
  const spec = TOOLS.find((item) => item.name === name);
  if (spec === undefined) return sentence("tool-denied");
  const args = input === undefined ? {} : input;
  if (!argumentsMatch(spec.inputSchema, args)) return sentence("invalid-request");
  if (spec.name === "commit_turn") return commitResult(deps, grant);
  const called = await deps.rpc(spec.sql, sqlArgs(spec, grant.grantId, args));
  if (!called.ok) return sentence(failureCode(called));
  return JSON.stringify(called.value);
}

export function prdTools(deps: PrdToolDeps, scope: PrdToolScope, allowed: ReadonlySet<string>): ToolSet {
  const set: ToolSet = {};
  for (const spec of TOOLS) {
    if (!allowed.has(spec.sql)) continue;
    set[spec.name] = tool({
      description: spec.description,
      inputSchema: jsonSchema(spec.inputSchema),
      execute: async (input) => executePrdTool(deps, scope, scope, spec.name, input),
    });
  }
  return set;
}

export async function finishStagedTurn(deps: PrdToolDeps, scope: PrdToolScope): Promise<void> {
  await commitTurn(scope.projectId, scope.grantId, deps);
}
