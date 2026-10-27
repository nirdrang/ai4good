import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";
import { loadGithubTest } from "../../harness/github.ts";
import { type Stack } from "../../harness/live-stack.ts";
import { AtPending } from "../../harness/registry.ts";
import { type PrdSnapshot } from "../../../../src/lib/prd-stream.ts";
import {
  githubApp,
  githubConfig,
  githubHttp,
  type GithubConfig,
  type GithubFetch,
} from "../../../../supabase/functions/_shared/github/app.ts";
import { githubRepo, type GithubRepo } from "../../../../supabase/functions/_shared/github/repo.ts";
import {
  parseSectionDocument,
  renderSection,
  type SectionDocument,
} from "../../../../supabase/functions/_shared/prd/file.ts";
import { commitTurn, type CommitTurnResult } from "../../../../supabase/functions/_shared/prd/git.ts";
import {
  issueGrantToken,
  signGrant,
  type GrantClaims,
} from "../../../../supabase/functions/_shared/prd/grant.ts";
import type { SettleDatabase } from "../../../../supabase/functions/_shared/write-routes.ts";
import {
  act,
  commitOnMain,
  credit,
  deliver,
  finishTurn,
  mainSha,
  ngoSnapshot,
  open,
  readSnapshot,
  sectionFile,
  seed,
  send,
  serviceRpc,
  signDelivery,
  signInAgain,
  topicById,
  webhookSecret,
} from "./_record.ts";

const LAND_BOOKING = "Booking text staged for the shared commit.";
const LAND_RULES = "Rules text staged for the shared commit.";
const STALE_FIRST = "Booking text from the chat that commits first.";
const STALE_SECOND_X = "Booking text from the chat that should be refused.";
const STALE_SECOND_Y = "Rules text from the chat that should be refused.";
const STALE_REDO_X = "Booking text redone after the refusal.";
const STALE_REDO_Y = "Rules text redone after the refusal.";
const SPLIT_USERS = "Users text from the main chat.";
const SPLIT_SCOPE = "Technical scope text from the topic chat.";
const RACE_TURN = "Booking text that should land on the outside edit.";
const RACE_OUTSIDE = "Rules text pushed while the turn was committing.";
const RACE_STALE_TURN = "Booking text that must not land.";
const RACE_STALE_OUTSIDE = "Booking text pushed onto the staged section.";
const LOST_TEXT = "Users text whose advance response was lost.";
const FORGED_STAGED = "Rules text staged and never committed.";
const FORGED_OUTSIDE = "Rules text pushed with a copied trailer.";
const READY_BOOKING = "Booking text marked Ready to confirm.";
const READY_RULES = "Rules text marked Ready to confirm.";
const READY_SCOPE = "Technical scope text marked Ready to confirm.";
const READY_AGAIN = "Booking text marked Ready to confirm again.";
const CHANGE_BOOKING = "Booking text that sends its dependent back to review.";
const OUTSIDE_STATE = "Booking text pushed into a draft section file.";

const REPLY_TOOLS = [
  "read_section",
  "stage_section",
  "propose_ready",
  "suggest_ngo_question",
  "commit_turn",
];
const DIRECT_WRITE = ["path", "sha", "content", "ref"];
const STALE_SENTENCE =
  "A staged section changed since it was read. Use the current sections and redo the work.";

type Seeded = Awaited<ReturnType<typeof seed>>;
type ChatScope = { kind: "main" } | { kind: "topic"; topicId: string };
type Turn = { turnId: string; token: string; grantId: string };
type ToolResponse = { status: number; text: string };
type ToolsWorld = {
  seeded: Seeded;
  client: GithubRepo;
  config: GithubConfig;
  repoName: string;
  repoId: number;
  paths: Record<string, string>;
};

function whole(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  throw new Error(`expected a whole number, got ${JSON.stringify(value)}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function grantKey(): string {
  const path = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "..",
    "supabase",
    "functions",
    ".env",
  );
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("PRD_GRANT_SIGNING_KEY=")) continue;
    let value = trimmed.slice("PRD_GRANT_SIGNING_KEY=".length).trim();
    const first = value[0];
    const last = value[value.length - 1];
    if (
      value.length >= 2 &&
      ((first === '"' && last === '"') || (first === "'" && last === "'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value === "") throw new Error("PRD_GRANT_SIGNING_KEY is empty");
    return value;
  }
  throw new Error("PRD_GRANT_SIGNING_KEY is missing from supabase/functions/.env");
}

function claimsFrom(token: string): GrantClaims {
  const dot = token.indexOf(".");
  if (dot <= 0) throw new Error("the grant token has no payload");
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(token.slice(0, dot), "base64url").toString("utf8"));
  } catch {
    throw new Error("the grant token payload is not json");
  }
  if (!isRecord(parsed)) throw new Error("the grant token payload is not a record");
  const { grantId, projectId, chatId, expiresAt } = parsed;
  if (
    typeof grantId !== "string" ||
    typeof projectId !== "string" ||
    typeof chatId !== "string" ||
    typeof expiresAt !== "string"
  ) {
    throw new Error("the grant token payload is missing a claim");
  }
  return { grantId, projectId, chatId, expiresAt };
}

function changedSignature(token: string): string {
  const last = token.slice(-1);
  return token.slice(0, -1) + (last === "A" ? "B" : "A");
}

function hintRpc(stack: Stack): SettleDatabase {
  return async (name, args) => {
    const response = await fetch(`${stack.apiUrl}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: stack.serviceRoleKey,
        Authorization: `Bearer ${stack.serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    const text = await response.text();
    if (!response.ok) {
      let message = text;
      let details: string | null = null;
      let hint: string | null = null;
      let code: string | null = null;
      try {
        const body = JSON.parse(text) as {
          message?: unknown;
          details?: unknown;
          hint?: unknown;
          code?: unknown;
        };
        if (typeof body.message === "string") message = body.message;
        if (typeof body.details === "string") details = body.details;
        if (typeof body.hint === "string") hint = body.hint;
        if (typeof body.code === "string") code = body.code;
      } catch {
        message = text;
      }
      return { ok: false, message, details, hint, code };
    }
    return { ok: true, value: text === "" ? null : JSON.parse(text) };
  };
}

function isRefUpdate(url: string, init: RequestInit | undefined): boolean {
  return init?.method?.toUpperCase() === "PATCH" && url.includes("/git/refs/heads/main");
}

function pushBeforeFirstAdvance(inner: GithubFetch, push: () => Promise<void>): GithubFetch {
  let armed = true;
  return async (url, init) => {
    if (armed && isRefUpdate(url, init)) {
      armed = false;
      await push();
    }
    return inner(url, init);
  };
}

function loseFirstAdvance(inner: GithubFetch): GithubFetch {
  let armed = true;
  return async (url, init) => {
    const response = await inner(url, init);
    if (!armed || !isRefUpdate(url, init)) return response;
    armed = false;
    if (response.status < 200 || response.status >= 300) return response;
    await response.text();
    // The ref update has reached GitHub. A 502 is the lost response the caller sees.
    return new Response("lost", { status: 502 });
  };
}

async function postPrdTools(
  stack: Stack,
  token: string | null,
  body: unknown,
): Promise<ToolResponse> {
  const headers: Record<string, string> = {
    apikey: stack.anonKey,
    "content-type": "application/json",
  };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${stack.apiUrl.replace(/\/$/, "")}/functions/v1/prd-tools`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
}

function callTool(
  stack: Stack,
  token: string | null,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResponse> {
  return postPrdTools(stack, token, {
    jsonrpc: "2.0",
    id: crypto.randomUUID(),
    method: "tools/call",
    params: { name, arguments: args },
  });
}

function rpcBody(response: ToolResponse, label: string): Record<string, unknown> {
  expect(response.status, `${label}: ${response.text}`).toBe(200);
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error(`${label} did not return JSON`);
  }
  if (!isRecord(parsed)) throw new Error(`${label} did not return a JSON object`);
  return parsed;
}

function toolValue(response: ToolResponse, label: string): unknown {
  const body = rpcBody(response, label);
  if (!isRecord(body.result)) throw new Error(`${label} has no result`);
  const content = body.result.content;
  if (body.result.isError === true) {
    const text = Array.isArray(content) && isRecord(content[0]) ? content[0].text : body.result;
    throw new Error(`${label}: ${typeof text === "string" ? text : JSON.stringify(text)}`);
  }
  if (!Array.isArray(content) || !isRecord(content[0]) || typeof content[0].text !== "string") {
    throw new Error(`${label} returned no text`);
  }
  return JSON.parse(content[0].text);
}

function refusedCommitText(response: ToolResponse, label: string): string {
  const body = rpcBody(response, label);
  if (!isRecord(body.result) || body.result.isError !== true || !Array.isArray(body.result.content)) {
    throw new Error(`${label} was not refused`);
  }
  const sentence = body.result.content[0];
  const sections = body.result.content[1];
  if (!isRecord(sentence) || !isRecord(sections) || typeof sections.text !== "string") {
    throw new Error(`${label} did not return the current sections`);
  }
  expect(sentence.text, label).toBe(STALE_SENTENCE);
  return sections.text;
}

function withText(document: SectionDocument, text: string): SectionDocument {
  return { ...document, statements: [{ text, sources: ["Discovery revision 2"] }] };
}

const TOKEN_REFRESH_MS = 60_000;
const signedAt = new WeakMap<object, number>();

async function fresh(world: ToolsWorld): Promise<void> {
  for (const person of [world.seeded.dev, world.seeded.ngo]) {
    if (Date.now() - (signedAt.get(person) ?? 0) < TOKEN_REFRESH_MS) continue;
    await signInAgain(world.seeded.stack, person);
    signedAt.set(person, Date.now());
  }
}

async function actAs(world: ToolsWorld, ...args: Parameters<typeof act>) {
  await fresh(world);
  return act(...args);
}

async function devView(world: ToolsWorld): Promise<PrdSnapshot> {
  await fresh(world);
  return readSnapshot(world.seeded, world.seeded.dev);
}

async function ngoView(world: ToolsWorld): Promise<PrdSnapshot> {
  await fresh(world);
  return ngoSnapshot(world.seeded);
}

function texts(snapshot: PrdSnapshot, id: string): string[] {
  return [...topicById(snapshot, id).statements];
}

function progress(snapshot: PrdSnapshot): { confirmed: number; total: number } {
  const required = snapshot.topics.filter((topic) => topic.required);
  return {
    confirmed: required.filter((topic) => topic.state === "confirmed").length,
    total: required.length,
  };
}

function sectionPicture(snapshot: PrdSnapshot) {
  return snapshot.topics.map((topic) => ({
    id: topic.id,
    state: topic.state,
    statements: topic.statements,
    author: topic.author,
  }));
}

function statePicture(snapshot: PrdSnapshot): Record<string, string> {
  return Object.fromEntries(snapshot.topics.map((topic) => [topic.id, topic.state]));
}

function filePath(world: ToolsWorld, key: string): string {
  const path = world.paths[key];
  if (typeof path !== "string" || path === "") throw new Error(`${key} has no file path`);
  return path;
}

function expectTrailer(message: string, turnId: string, label: string): void {
  const lines = message.split("\n");
  expect(lines[0], `${label}: the commit subject`).toBe("Update the PRD");
  expect(
    lines.filter((line) => line.startsWith("PRD-Turn:")),
    `${label}: the commit carries the turn trailer`,
  ).toEqual([`PRD-Turn: ${turnId}`]);
}

async function counts(seeded: Seeded): Promise<{
  reads: number;
  staged: number;
  ops: number;
  commits: number;
}> {
  const project = seeded.projectId;
  const reads = (await seeded.sql`select count(*)::int as n from public.prd_tool_reads
    where project_id = ${project}::uuid`) as Array<{ n: unknown }>;
  const staged = (await seeded.sql`select count(*)::int as n from public.prd_staged_sections
    where project_id = ${project}::uuid`) as Array<{ n: unknown }>;
  const ops = (await seeded.sql`select count(*)::int as n from public.prd_git_ops
    where project_id = ${project}::uuid and kind = 'turn'`) as Array<{ n: unknown }>;
  const commits = (await seeded.sql`select count(*)::int as n from public.prd_tool_commits
    where project_id = ${project}::uuid`) as Array<{ n: unknown }>;
  return {
    reads: whole(reads[0]?.n),
    staged: whole(staged[0]?.n),
    ops: whole(ops[0]?.n),
    commits: whole(commits[0]?.n),
  };
}

async function turnCommits(seeded: Seeded, turnId: string): Promise<number> {
  const rows = (await seeded.sql`select count(*)::int as n from public.prd_tool_commits
    where turn_id = ${turnId}::uuid`) as Array<{ n: unknown }>;
  return whole(rows[0]?.n);
}

async function finalizedOps(seeded: Seeded, turnId: string): Promise<number> {
  const rows = (await seeded.sql`select count(*)::int as n from public.prd_git_ops
    where turn_id = ${turnId}::uuid and kind = 'turn' and status = 'finalized'`) as Array<{
    n: unknown;
  }>;
  return whole(rows[0]?.n);
}

async function versionsFor(world: ToolsWorld, key: string, sha: string): Promise<number> {
  const rows = (await world.seeded.sql`select count(*)::int as n
    from public.prd_section_versions v
    join public.prd_sections s on s.id = v.section_id
    where s.project_id = ${world.seeded.projectId}::uuid
      and s.stable_key = ${key}
      and v.commit_sha = ${sha.toLowerCase()}`) as Array<{ n: unknown }>;
  return whole(rows[0]?.n);
}

async function currentVersion(
  world: ToolsWorld,
  key: string,
): Promise<{ authorKind: string; authorLogin: string | null; sha: string }> {
  const rows = (await world.seeded.sql`
    select v.author_kind, v.author_login, v.commit_sha
    from public.prd_section_versions v
    join public.prd_sections s on s.id = v.section_id
    join public.prd_records rec on rec.project_id = s.project_id
    join public.prd_revisions rev
      on rev.project_id = rec.project_id and rev.revision = rec.current_revision
    where s.project_id = ${world.seeded.projectId}::uuid
      and s.stable_key = ${key}
      and v.id = (rev.manifest->>s.stable_key)::uuid`) as Array<{
    author_kind: string;
    author_login: string | null;
    commit_sha: string;
  }>;
  const row = rows[0];
  if (!row) throw new Error(`${key} has no current version`);
  return { authorKind: row.author_kind, authorLogin: row.author_login, sha: row.commit_sha };
}

async function columnStates(world: ToolsWorld): Promise<Record<string, string>> {
  const rows = (await world.seeded.sql`select stable_key, state from public.prd_sections
    where project_id = ${world.seeded.projectId}::uuid
    order by ordinal`) as Array<{ stable_key: string; state: string }>;
  return Object.fromEntries(rows.map((row) => [row.stable_key, row.state]));
}

async function head(world: ToolsWorld): Promise<string> {
  return mainSha(world.client, world.repoName);
}

async function commitsBetween(world: ToolsWorld, from: string, to: string) {
  const range = await world.client.commitsSince(world.repoName, from, to);
  if (!range.ok) throw new Error(range.reason);
  if (range.result !== "commits") throw new Error("main left the line of commits");
  return range.commits;
}

async function filesChanged(world: ToolsWorld, parent: string, sha: string): Promise<string[]> {
  const auth = await githubApp(world.config).installationToken(fetch);
  if (!auth.ok) throw new Error(auth.reason);
  const response = await githubHttp(
    fetch,
    auth.token,
    "GET",
    `/repos/${encodeURIComponent(world.config.org)}/${encodeURIComponent(world.repoName)}/compare/${encodeURIComponent(parent)}...${encodeURIComponent(sha)}`,
  );
  if (!response.ok) throw new Error(response.failure.reason);
  if (!isRecord(response.value) || !Array.isArray(response.value.files)) {
    throw new Error("GitHub comparison listed no files");
  }
  return response.value.files.map((file) => {
    if (!isRecord(file) || typeof file.filename !== "string") {
      throw new Error("GitHub comparison file has no name");
    }
    return file.filename;
  });
}

async function expectTurnCommit(
  world: ToolsWorld,
  parent: string,
  sha: string,
  turnId: string,
  paths: string[],
  label: string,
): Promise<void> {
  const commit = await world.client.readCommit(world.repoName, sha);
  if (!commit.ok) throw new Error(commit.reason);
  expect(commit.parents.map((item) => item.toLowerCase()), `${label}: the parent is the old head`).toEqual([
    parent.toLowerCase(),
  ]);
  const commits = await commitsBetween(world, parent, sha);
  expect(commits, `${label}: main moved by one commit`).toHaveLength(1);
  expect(commits[0]?.sha.toLowerCase(), label).toBe(sha.toLowerCase());
  expectTrailer(commits[0]?.message ?? "", turnId, label);
  const files = await filesChanged(world, parent, sha);
  expect(files.slice().sort(), `${label}: the commit changes exactly the staged files`).toEqual(
    paths.slice().sort(),
  );
}

async function loadWorld(seeded: Seeded): Promise<ToolsWorld> {
  const loaded = loadGithubTest();
  if (!loaded.ok) throw new Error(loaded.reason);
  const rows = (await seeded.sql`select repo_name, repo_id from public.prd_records
    where project_id = ${seeded.projectId}::uuid`) as Array<{
    repo_name: string;
    repo_id: unknown;
  }>;
  const repoName = rows[0]?.repo_name;
  if (typeof repoName !== "string" || repoName === "") throw new Error("the PRD has no repository");
  const pathRows = (await seeded.sql`select stable_key, file_path from public.prd_sections
    where project_id = ${seeded.projectId}::uuid`) as Array<{
    stable_key: string;
    file_path: string;
  }>;
  const paths: Record<string, string> = {};
  for (const row of pathRows) paths[row.stable_key] = row.file_path;
  return {
    seeded,
    client: loaded.client,
    config: loaded.config,
    repoName,
    repoId: whole(rows[0]?.repo_id),
    paths,
  };
}

async function beginTurn(world: ToolsWorld, scope: ChatScope, label: string): Promise<Turn> {
  const view = await devView(world);
  await fresh(world);
  const response = await send(
    world.seeded,
    world.seeded.dev,
    scope,
    { kind: "text", text: label },
    view.revision,
    crypto.randomUUID(),
  );
  expect(response.status, `${label}: ${JSON.stringify(response.json)}`).toBe(200);
  const turnId = response.json.turnId;
  if (typeof turnId !== "string") throw new Error(`${label} named no turn`);
  const issued = await issueGrantToken(
    serviceRpc(world.seeded.stack),
    grantKey(),
    turnId,
    "reply",
    3600,
  );
  if (!issued.ok) throw new Error(`${label} could not issue a grant: ${issued.reason}`);
  return { turnId, token: issued.token, grantId: claimsFrom(issued.token).grantId };
}

async function readKey(
  world: ToolsWorld,
  token: string,
  key: string,
): Promise<{ receipt: string; document: SectionDocument }> {
  const value = toolValue(
    await callTool(world.seeded.stack, token, "read_section", { key }),
    `read ${key}`,
  );
  if (!isRecord(value) || typeof value.receipt !== "string") {
    throw new Error(`read ${key} named no receipt`);
  }
  const parsed = parseSectionDocument(value.document);
  if (!parsed.ok) throw new Error(`read ${key}: ${parsed.reason}`);
  return { receipt: value.receipt, document: parsed.document };
}

async function stageKey(
  world: ToolsWorld,
  token: string,
  receipt: string,
  document: SectionDocument,
  label: string,
): Promise<void> {
  const value = toolValue(
    await callTool(world.seeded.stack, token, "stage_section", {
      receipt,
      document: { ...document },
    }),
    label,
  );
  if (!isRecord(value) || typeof value.staged !== "string") throw new Error(`${label} did not stage`);
}

async function proposeKey(world: ToolsWorld, token: string, key: string): Promise<void> {
  const value = toolValue(
    await callTool(world.seeded.stack, token, "propose_ready", { key }),
    `propose ${key} ready`,
  );
  if (!isRecord(value) || value.staged !== "ready") {
    throw new Error(`propose ${key} did not stage Ready to confirm`);
  }
}

async function commitTool(world: ToolsWorld, token: string, label: string): Promise<string> {
  const value = toolValue(
    await callTool(world.seeded.stack, token, "commit_turn", {}),
    label,
  );
  if (!isRecord(value) || typeof value.sha !== "string") throw new Error(`${label} named no sha`);
  return value.sha;
}

async function commitInProcess(
  world: ToolsWorld,
  grantId: string,
  fetchImpl: GithubFetch,
): Promise<CommitTurnResult> {
  const configured = githubConfig({
    PRD_GITHUB_ORG: world.config.org,
    GITHUB_APP_ID: world.config.appId,
    GITHUB_APP_PRIVATE_KEY: world.config.privateKey,
    PRD_GITHUB_REPO_VISIBILITY: world.config.visibility,
  });
  if (!configured.ok) throw new Error(configured.reason);
  return commitTurn(world.seeded.projectId, grantId, {
    github: githubRepo(configured.config, fetchImpl),
    rpc: hintRpc(world.seeded.stack),
  });
}

function committedSha(outcome: CommitTurnResult, label: string): string {
  expect(outcome, label).toMatchObject({ ok: true, result: "committed" });
  if (!outcome.ok || outcome.result !== "committed") throw new Error(label);
  return outcome.sha;
}

async function rewriteSection(
  world: ToolsWorld,
  key: string,
  text: string,
  message: string,
): Promise<{ sha: string; login: string }> {
  const path = filePath(world, key);
  const file = await sectionFile(world.client, world.repoName, await head(world), path);
  return commitOnMain(
    world.client,
    world.repoName,
    [
      {
        path,
        content: renderSection({
          key: file.key,
          title: file.title,
          document: withText(file.document, text),
        }),
      },
    ],
    message,
  );
}

async function deliverPush(world: ToolsWorld, body: string): Promise<void> {
  const delivered = await deliver(world.seeded.stack, body, signDelivery(webhookSecret(), body));
  expect(delivered.status, `the webhook answered ${delivered.status}: ${delivered.text}`).toBe(200);
}

function hookBody(world: ToolsWorld): string {
  return JSON.stringify({ repository: { id: world.repoId }, commits: [{ message: "ignored" }] });
}

async function expectRefusedToken(
  world: ToolsWorld,
  token: string | null,
  label: string,
): Promise<void> {
  const before = await counts(world.seeded);
  const response = await callTool(world.seeded.stack, token, "read_section", { key: "booking" });
  expect(response.status, `${label} answers 401`).toBe(401);
  expect(await counts(world.seeded), `${label} reaches no tool`).toEqual(before);
}

async function proveGrantToken(world: ToolsWorld, token: string): Promise<void> {
  await expectRefusedToken(world, null, "no bearer");
  await expectRefusedToken(world, "not-a-grant-token", "a malformed token");
  await expectRefusedToken(world, changedSignature(token), "a token with a changed signature");
  const claims = claimsFrom(token);
  await expectRefusedToken(
    world,
    await signGrant({ ...claims, expiresAt: "2020-01-01T00:00:00.000Z" }, grantKey()),
    "an expired token",
  );
  await expectRefusedToken(
    world,
    await signGrant({ ...claims, projectId: crypto.randomUUID() }, grantKey()),
    "a token signed for another project",
  );
  await expectRefusedToken(
    world,
    await signGrant({ ...claims, chatId: crypto.randomUUID() }, grantKey()),
    "a token signed for another chat",
  );

  const before = await counts(world.seeded);
  const listed = rpcBody(
    await postPrdTools(world.seeded.stack, token, {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "tools/list",
    }),
    "tools/list",
  );
  expect(await counts(world.seeded), "tools/list reaches no section").toEqual(before);
  if (!isRecord(listed.result) || !Array.isArray(listed.result.tools)) {
    throw new Error("tools/list returned no tools");
  }
  const tools = listed.result.tools.map((tool) => {
    if (!isRecord(tool) || typeof tool.name !== "string" || !isRecord(tool.inputSchema)) {
      throw new Error("tools/list returned a tool without a name and a schema");
    }
    return { name: tool.name, inputSchema: tool.inputSchema };
  });
  expect(
    tools.map((tool) => tool.name),
    "a reply grant lists only the tools its mode allows",
  ).toEqual(REPLY_TOOLS);
  for (const tool of tools) {
    const properties = isRecord(tool.inputSchema.properties)
      ? Object.keys(tool.inputSchema.properties)
      : [];
    for (const name of DIRECT_WRITE) {
      expect(properties, `${tool.name} does not write the repository directly`).not.toContain(name);
    }
  }
}

async function proveLandTogether(world: ToolsWorld, turn: Turn): Promise<void> {
  const beforeDev = await devView(world);
  const beforeNgo = await ngoView(world);
  const beforeHead = await head(world);
  const booking = await readKey(world, turn.token, "booking");
  const rules = await readKey(world, turn.token, "rules");
  await stageKey(
    world,
    turn.token,
    booking.receipt,
    withText(booking.document, LAND_BOOKING),
    "stage booking for the shared commit",
  );
  await stageKey(
    world,
    turn.token,
    rules.receipt,
    withText(rules.document, LAND_RULES),
    "stage rules for the shared commit",
  );
  await proposeKey(world, turn.token, "booking");
  const heldDev = await devView(world);
  const heldNgo = await ngoView(world);
  expect(texts(heldDev, "booking"), "staged booking is invisible to the developer").toEqual(
    texts(beforeDev, "booking"),
  );
  expect(texts(heldDev, "rules"), "staged rules are invisible to the developer").toEqual(
    texts(beforeDev, "rules"),
  );
  expect(topicById(heldDev, "booking").state, "a staged proposal is not Ready to confirm yet").toBe(
    topicById(beforeDev, "booking").state,
  );
  expect(texts(heldNgo, "booking"), "staged booking is invisible to the NGO").toEqual(
    texts(beforeNgo, "booking"),
  );
  expect(texts(heldNgo, "rules"), "staged rules are invisible to the NGO").toEqual(
    texts(beforeNgo, "rules"),
  );
  expect(heldDev.revision, "staging does not move the revision").toBe(beforeDev.revision);

  const sha = await commitTool(world, turn.token, "the shared commit");
  await expectTurnCommit(world, beforeHead, sha, turn.turnId, [
    filePath(world, "booking"),
    filePath(world, "rules"),
  ], "the shared commit");
  const afterDev = await devView(world);
  const afterNgo = await ngoView(world);
  expect(texts(afterDev, "booking"), "the developer sees the staged booking text").toEqual([
    LAND_BOOKING,
  ]);
  expect(texts(afterDev, "rules"), "the developer sees the staged rules text").toEqual([LAND_RULES]);
  expect(topicById(afterDev, "booking").state, "the proposed section is Ready to confirm").toBe(
    "ready",
  );
  expect(
    topicById(afterDev, "booking").statusText,
    "the proposed section says Ready to confirm",
  ).toBe("Ready to confirm.");
  expect(topicById(afterDev, "rules").state, "the section that was only staged is not ready").toBe(
    "draft",
  );
  expect(texts(afterNgo, "booking"), "the NGO sees the staged booking text").toEqual([LAND_BOOKING]);
  expect(texts(afterNgo, "rules"), "the NGO sees the staged rules text").toEqual([LAND_RULES]);
  expect(topicById(afterNgo, "booking").state, "the NGO sees Ready to confirm").toBe("ready");

  const againHead = await head(world);
  const againRevision = afterDev.revision;
  const againSequence = afterDev.sequence;
  const again = await commitTool(world, turn.token, "the second commit in the same turn");
  expect(again.toLowerCase(), "a second commit in the same turn returns the same sha").toBe(
    sha.toLowerCase(),
  );
  expect((await head(world)).toLowerCase(), "a second commit in the same turn does not move main").toBe(
    againHead.toLowerCase(),
  );
  const settled = await devView(world);
  expect(settled.revision, "a second commit in the same turn does not move the revision").toBe(
    againRevision,
  );
  expect(settled.sequence, "a second commit in the same turn does not move the sequence").toBe(
    againSequence,
  );
  expect(await turnCommits(world.seeded, turn.turnId), "the turn has one recorded commit").toBe(1);
  expect(await commitsBetween(world, beforeHead, await head(world)), "main still has one new commit").toHaveLength(
    1,
  );
}

async function proveReplayedWebhook(world: ToolsWorld): Promise<void> {
  const before = await devView(world);
  const body = hookBody(world);
  await deliverPush(world, body);
  const once = await devView(world);
  expect(once.sequence, "a webhook after the turn commit keeps the sequence").toBe(before.sequence);
  expect(once.revision, "a webhook after the turn commit keeps the revision").toBe(before.revision);
  expect(sectionPicture(once), "a webhook after the turn commit keeps the sections").toEqual(
    sectionPicture(before),
  );
  await deliverPush(world, body);
  const twice = await devView(world);
  expect(twice.sequence, "a replayed webhook keeps the sequence").toBe(once.sequence);
  expect(twice.revision, "a replayed webhook keeps the revision").toBe(once.revision);
  expect(sectionPicture(twice), "a replayed webhook keeps the sections").toEqual(sectionPicture(once));
}

async function proveStaleCommit(world: ToolsWorld): Promise<void> {
  const main = await beginTurn(world, { kind: "main" }, "The chat that commits section X first.");
  const topic = await beginTurn(
    world,
    { kind: "topic", topicId: "rules" },
    "The topic chat that also read section X.",
  );
  const rulesBefore = texts(await devView(world), "rules");
  const mainBooking = await readKey(world, main.token, "booking");
  const topicBooking = await readKey(world, topic.token, "booking");
  const topicRules = await readKey(world, topic.token, "rules");
  await stageKey(
    world,
    main.token,
    mainBooking.receipt,
    withText(mainBooking.document, STALE_FIRST),
    "the first chat stages section X",
  );
  const before = await head(world);
  const first = await commitTool(world, main.token, "the first chat commits section X");
  await expectTurnCommit(world, before, first, main.turnId, [filePath(world, "booking")], "the first chat");
  await stageKey(
    world,
    topic.token,
    topicBooking.receipt,
    withText(topicBooking.document, STALE_SECOND_X),
    "the second chat stages the stale section X",
  );
  await stageKey(
    world,
    topic.token,
    topicRules.receipt,
    withText(topicRules.document, STALE_SECOND_Y),
    "the second chat stages section Y",
  );
  const headBeforeRefusal = await head(world);
  const refused = refusedCommitText(
    await callTool(world.seeded.stack, topic.token, "commit_turn", {}),
    "the stale commit is refused as a whole",
  );
  expect(refused, "the refusal returns the current text of section X").toContain(STALE_FIRST);
  expect((await head(world)).toLowerCase(), "the refusal leaves main unchanged").toBe(
    headBeforeRefusal.toLowerCase(),
  );
  const held = await devView(world);
  expect(texts(held, "booking"), "the refusal leaves section X as the first chat wrote it").toEqual([
    STALE_FIRST,
  ]);
  expect(texts(held, "rules"), "the refusal leaves section Y unchanged").toEqual(rulesBefore);

  const redoBooking = await readKey(world, topic.token, "booking");
  const redoRules = await readKey(world, topic.token, "rules");
  await stageKey(
    world,
    topic.token,
    redoBooking.receipt,
    withText(redoBooking.document, STALE_REDO_X),
    "the second chat stages section X again",
  );
  await stageKey(
    world,
    topic.token,
    redoRules.receipt,
    withText(redoRules.document, STALE_REDO_Y),
    "the second chat stages section Y again",
  );
  const redone = await commitTool(world, topic.token, "the second chat commits after reading again");
  await expectTurnCommit(
    world,
    headBeforeRefusal,
    redone,
    topic.turnId,
    [filePath(world, "booking"), filePath(world, "rules")],
    "the redone commit",
  );
  const landed = await devView(world);
  expect(texts(landed, "booking"), "the redone commit lands section X").toEqual([STALE_REDO_X]);
  expect(texts(landed, "rules"), "the redone commit lands section Y").toEqual([STALE_REDO_Y]);
  await finishTurn(world.seeded, main.turnId);
  await finishTurn(world.seeded, topic.turnId);
}

async function proveSeparateChats(world: ToolsWorld): Promise<void> {
  const main = await beginTurn(world, { kind: "main" }, "The main chat writes the users section.");
  const topic = await beginTurn(
    world,
    { kind: "topic", topicId: "technical-scope" },
    "The topic chat writes the technical scope.",
  );
  const users = await readKey(world, main.token, "usersToday");
  const scope = await readKey(world, topic.token, "technical-scope");
  await stageKey(
    world,
    main.token,
    users.receipt,
    withText(users.document, SPLIT_USERS),
    "the main chat stages its section",
  );
  await stageKey(
    world,
    topic.token,
    scope.receipt,
    withText(scope.document, SPLIT_SCOPE),
    "the topic chat stages its section",
  );
  const before = await head(world);
  const mainShaWritten = await commitTool(world, main.token, "the main chat commits its section");
  await expectTurnCommit(
    world,
    before,
    mainShaWritten,
    main.turnId,
    [filePath(world, "usersToday")],
    "the main chat's own commit",
  );
  const middle = await head(world);
  const topicSha = await commitTool(world, topic.token, "the topic chat commits its section");
  await expectTurnCommit(
    world,
    middle,
    topicSha,
    topic.turnId,
    [filePath(world, "technical-scope")],
    "the topic chat's own commit",
  );
  const landed = await devView(world);
  expect(texts(landed, "usersToday"), "the main chat's section landed").toEqual([SPLIT_USERS]);
  expect(texts(landed, "technical-scope"), "the topic chat's section landed").toEqual([SPLIT_SCOPE]);
  await finishTurn(world.seeded, main.turnId);
  await finishTurn(world.seeded, topic.turnId);
}

async function proveOutsideDuringAdvance(world: ToolsWorld): Promise<void> {
  const unrelated = await beginTurn(world, { kind: "main" }, "The turn that lands on an outside edit.");
  const booking = await readKey(world, unrelated.token, "booking");
  await stageKey(
    world,
    unrelated.token,
    booking.receipt,
    withText(booking.document, RACE_TURN),
    "stage the section the outside edit does not touch",
  );
  const before = await head(world);
  let pushed: { sha: string; login: string } | undefined;
  const landed = await commitInProcess(
    world,
    unrelated.grantId,
    pushBeforeFirstAdvance(fetch, async () => {
      pushed = await rewriteSection(
        world,
        "rules",
        RACE_OUTSIDE,
        "Rules text pushed while the turn was committing.",
      );
    }),
  );
  const sha = committedSha(landed, "the turn lands on top of an outside edit to another section");
  if (pushed === undefined) throw new Error("the outside edit did not run");
  const outside = pushed;
  const commits = await commitsBetween(world, before, await head(world));
  expect(
    commits.map((commit) => commit.sha.toLowerCase()),
    "main holds the outside edit and the turn",
  ).toEqual([outside.sha.toLowerCase(), sha.toLowerCase()]);
  const turnCommit = await world.client.readCommit(world.repoName, sha);
  if (!turnCommit.ok) throw new Error(turnCommit.reason);
  expect(
    turnCommit.parents.map((parent) => parent.toLowerCase()),
    "the turn commit's parent is the outside edit",
  ).toEqual([outside.sha.toLowerCase()]);
  expect(
    await filesChanged(world, before, outside.sha),
    "the outside edit changes only the section the turn did not stage",
  ).toEqual([filePath(world, "rules")]);
  expect(
    (await filesChanged(world, outside.sha, sha)).slice().sort(),
    "the turn commit changes only the section it staged",
  ).toEqual([filePath(world, "booking")]);
  const atop = await devView(world);
  expect(texts(atop, "booking"), "the turn's booking text landed").toEqual([RACE_TURN]);
  expect(texts(atop, "rules"), "the outside rules text landed").toEqual([RACE_OUTSIDE]);
  await finishTurn(world.seeded, unrelated.turnId);

  const conflicting = await beginTurn(
    world,
    { kind: "main" },
    "The turn whose staged section is pushed.",
  );
  const again = await readKey(world, conflicting.token, "booking");
  await stageKey(
    world,
    conflicting.token,
    again.receipt,
    withText(again.document, RACE_STALE_TURN),
    "stage the section the outside edit will touch",
  );
  const base = await head(world);
  let conflict: { sha: string; login: string } | undefined;
  const refused = await commitInProcess(
    world,
    conflicting.grantId,
    pushBeforeFirstAdvance(fetch, async () => {
      conflict = await rewriteSection(
        world,
        "booking",
        RACE_STALE_OUTSIDE,
        "Booking text pushed onto the staged section.",
      );
    }),
  );
  expect(refused, "an outside edit of a staged section refuses the whole turn").toMatchObject({
    ok: true,
    result: "stale",
  });
  if (!refused.ok || refused.result !== "stale") {
    throw new Error("an outside edit of a staged section refuses the whole turn");
  }
  if (conflict === undefined) throw new Error("the conflicting outside edit did not run");
  expect(JSON.stringify(refused.sections), "the stale refusal returns the current text of X").toContain(
    RACE_STALE_OUTSIDE,
  );
  expect((await head(world)).toLowerCase(), "nothing of the refused turn lands").toBe(
    conflict.sha.toLowerCase(),
  );
  expect(await commitsBetween(world, base, await head(world)), "main gained only the outside edit").toHaveLength(
    1,
  );
  const untouched = await devView(world);
  expect(texts(untouched, "booking"), "the turn's booking text did not land").toEqual([
    RACE_STALE_OUTSIDE,
  ]);
  expect(texts(untouched, "booking"), "the staged booking text is absent").not.toContain(RACE_STALE_TURN);
  expect(await turnCommits(world.seeded, conflicting.turnId), "the refused turn recorded no commit").toBe(
    0,
  );
  await finishTurn(world.seeded, conflicting.turnId);
}

async function proveLostAdvance(world: ToolsWorld): Promise<void> {
  const turn = await beginTurn(world, { kind: "main" }, "The turn whose advance response is lost.");
  const beforeView = await devView(world);
  const users = await readKey(world, turn.token, "usersToday");
  await stageKey(
    world,
    turn.token,
    users.receipt,
    withText(users.document, LOST_TEXT),
    "stage the section whose advance response is lost",
  );
  const before = await head(world);
  const outcome = await commitInProcess(world, turn.grantId, loseFirstAdvance(fetch));
  const sha = committedSha(outcome, "a lost advance response still reports the turn committed");
  expect((await head(world)).toLowerCase(), "main holds the turn commit").toBe(sha.toLowerCase());
  const commits = await commitsBetween(world, before, sha);
  expect(commits, "main holds exactly one commit for the turn").toHaveLength(1);
  expectTrailer(commits[0]?.message ?? "", turn.turnId, "the commit whose response was lost");
  const after = await devView(world);
  expect(texts(after, "usersToday"), "the snapshot shows the turn's text once").toEqual([LOST_TEXT]);
  expect(after.revision, "the snapshot records the turn once").toBe(beforeView.revision + 1);
  expect(await versionsFor(world, "usersToday", sha), "the turn's file is recorded once").toBe(1);
  expect(await turnCommits(world.seeded, turn.turnId), "the turn has one recorded commit").toBe(1);
  await finishTurn(world.seeded, turn.turnId);
}

async function proveForgedTrailer(world: ToolsWorld): Promise<void> {
  const turn = await beginTurn(world, { kind: "main" }, "The turn whose trailer is copied.");
  const rules = await readKey(world, turn.token, "rules");
  await stageKey(
    world,
    turn.token,
    rules.receipt,
    withText(rules.document, FORGED_STAGED),
    "stage rules and do not commit them",
  );
  const pushed = await rewriteSection(
    world,
    "rules",
    FORGED_OUTSIDE,
    `Outside edit\n\nPRD-Turn: ${turn.turnId}\n`,
  );
  await deliverPush(world, hookBody(world));
  const after = await devView(world);
  const topic = topicById(after, "rules");
  expect(topic.statements, "the forged trailer does not apply the staged text").toEqual([FORGED_OUTSIDE]);
  expect(topic.statements, "the staged text is absent").not.toContain(FORGED_STAGED);
  expect(topic.author, "the imported edit names the pusher").toBe(pushed.login);
  expect(topicById(await ngoView(world), "rules").author, "the NGO sees the pusher").toBe(
    pushed.login,
  );
  const version = await currentVersion(world, "rules");
  expect(version.authorKind, "the imported edit is a repository edit").toBe("repository");
  expect(version.authorLogin, "the repository edit names the pusher").toBe(pushed.login);
  expect(version.sha.toLowerCase(), "the imported edit is the outside commit").toBe(
    pushed.sha.toLowerCase(),
  );
  expect(await turnCommits(world.seeded, turn.turnId), "the forged trailer records no tool commit").toBe(
    0,
  );
  expect(await finalizedOps(world.seeded, turn.turnId), "the forged trailer finalizes no turn").toBe(0);
  await finishTurn(world.seeded, turn.turnId);
}

function confirmToken(snapshot: PrdSnapshot, id: string): string {
  const topic = topicById(snapshot, id);
  if (topic.confirm.kind !== "available") {
    throw new Error(`${id} is not Ready to confirm (${topic.state})`);
  }
  return topic.confirm.action.token;
}

async function confirmSection(world: ToolsWorld, token: string, label: string): Promise<void> {
  const response = await actAs(world,
    world.seeded,
    world.seeded.dev,
    "confirm-topic",
    token,
    crypto.randomUUID(),
  );
  expect(response.status, `${label}: ${JSON.stringify(response.json)}`).toBe(200);
}

async function proveDatabaseStates(world: ToolsWorld): Promise<void> {
  const readyTurn = await beginTurn(world, { kind: "main" }, "The turn that marks sections ready.");
  const booking = await readKey(world, readyTurn.token, "booking");
  const rules = await readKey(world, readyTurn.token, "rules");
  const scope = await readKey(world, readyTurn.token, "technical-scope");
  await stageKey(
    world,
    readyTurn.token,
    booking.receipt,
    withText(booking.document, READY_BOOKING),
    "stage booking ready",
  );
  await stageKey(
    world,
    readyTurn.token,
    rules.receipt,
    withText(rules.document, READY_RULES),
    "stage rules ready",
  );
  await stageKey(
    world,
    readyTurn.token,
    scope.receipt,
    withText(scope.document, READY_SCOPE),
    "stage technical scope ready",
  );
  await proposeKey(world, readyTurn.token, "booking");
  await proposeKey(world, readyTurn.token, "rules");
  await proposeKey(world, readyTurn.token, "technical-scope");
  await commitTool(world, readyTurn.token, "the turn that marks three sections ready");
  await finishTurn(world.seeded, readyTurn.turnId);

  const offered = await devView(world);
  expect(progress(offered), "three topics are required and none are confirmed yet").toEqual({
    confirmed: 0,
    total: 3,
  });
  expect(topicById(offered, "usersToday").required, "the users topic is not in the total").toBe(false);
  const bookingToken = confirmToken(offered, "booking");
  const ngoFirst = await actAs(world,
    world.seeded,
    world.seeded.ngo,
    "confirm-topic",
    bookingToken,
    crypto.randomUUID(),
  );
  expect(ngoFirst.status, `the NGO is refused: ${JSON.stringify(ngoFirst.json)}`).toBe(409);
  expect(ngoFirst.json.kind, "the NGO is refused").toBe("forbidden");
  expect(topicById(await devView(world), "booking").state, "the NGO's refusal leaves it ready").toBe(
    "ready",
  );
  await confirmSection(world, bookingToken, "the developer confirms the Ready to confirm section");
  const confirmedOnce = await devView(world);
  expect(topicById(confirmedOnce, "booking").state, "the developer's confirmation confirms it").toBe(
    "confirmed",
  );
  expect(progress(confirmedOnce), "one confirmation counts, and the total stays 3").toEqual({
    confirmed: 1,
    total: 3,
  });
  const ngoAgain = await actAs(world,
    world.seeded,
    world.seeded.ngo,
    "confirm-topic",
    bookingToken,
    crypto.randomUUID(),
  );
  expect(ngoAgain.status, `the NGO is refused after confirmation: ${JSON.stringify(ngoAgain.json)}`).toBe(
    409,
  );
  expect(ngoAgain.json.kind, "the NGO is refused after confirmation").toBe("forbidden");
  const reopen = topicById(confirmedOnce, "booking").reopen;
  if (reopen.kind !== "available") throw new Error("reopen is not offered");
  const reopened = await actAs(world,
    world.seeded,
    world.seeded.dev,
    "reopen-topic",
    reopen.action.token,
    crypto.randomUUID(),
  );
  expect(reopened.status, `reopen: ${JSON.stringify(reopened.json)}`).toBe(200);
  const afterReopen = await devView(world);
  const ngoReopen = await ngoView(world);
  expect(topicById(afterReopen, "booking").state, "reopen shows Needs review").toBe("needs-review");
  expect(topicById(afterReopen, "booking").statusText, "reopen says Needs review").toBe(
    "Needs review.",
  );
  expect(topicById(ngoReopen, "booking").state, "the NGO sees Needs review").toBe("needs-review");
  expect(progress(afterReopen), "reopen lowers the confirmed count and keeps the total").toEqual({
    confirmed: 0,
    total: 3,
  });

  const again = await beginTurn(world, { kind: "main" }, "The turn that marks booking ready again.");
  const bookingAgain = await readKey(world, again.token, "booking");
  await stageKey(
    world,
    again.token,
    bookingAgain.receipt,
    withText(bookingAgain.document, READY_AGAIN),
    "stage booking ready again",
  );
  await proposeKey(world, again.token, "booking");
  await commitTool(world, again.token, "booking is Ready to confirm again");
  await finishTurn(world.seeded, again.turnId);
  const readyAgain = await devView(world);
  expect(topicById(readyAgain, "booking").state, "booking is Ready to confirm again").toBe("ready");
  expect(topicById(readyAgain, "rules").state, "rules stays Ready to confirm").toBe("ready");
  expect(topicById(readyAgain, "technical-scope").state, "technical scope stays Ready to confirm").toBe(
    "ready",
  );
  await confirmSection(
    world,
    confirmToken(readyAgain, "booking"),
    "the developer confirms the section its dependent needs",
  );
  await confirmSection(
    world,
    confirmToken(readyAgain, "rules"),
    "the developer confirms the section that depends on it",
  );
  await confirmSection(
    world,
    confirmToken(readyAgain, "technical-scope"),
    "the developer confirms the unrelated section",
  );
  const allConfirmed = await devView(world);
  expect(progress(allConfirmed), "the three required sections are confirmed").toEqual({
    confirmed: 3,
    total: 3,
  });
  const scopeText = texts(allConfirmed, "technical-scope");

  const change = await beginTurn(world, { kind: "main" }, "The turn that changes a confirmed section.");
  const changed = await readKey(world, change.token, "booking");
  await stageKey(
    world,
    change.token,
    changed.receipt,
    withText(changed.document, CHANGE_BOOKING),
    "stage a change with no Ready to confirm proposal",
  );
  await commitTool(world, change.token, "the change to the confirmed section");
  await finishTurn(world.seeded, change.turnId);
  const invalidated = await devView(world);
  expect(topicById(invalidated, "booking").state, "the changed section is no longer confirmed").toBe(
    "draft",
  );
  expect(texts(invalidated, "booking"), "the changed section shows the new text").toEqual([
    CHANGE_BOOKING,
  ]);
  expect(topicById(invalidated, "rules").state, "the dependent goes to Needs review").toBe(
    "needs-review",
  );
  expect(topicById(invalidated, "rules").statusText, "the dependent says Needs review").toBe(
    "Needs review.",
  );
  expect(topicById(invalidated, "technical-scope").state, "the unrelated section stays Confirmed").toBe(
    "confirmed",
  );
  expect(texts(invalidated, "technical-scope"), "the unrelated section keeps its text").toEqual(
    scopeText,
  );
  const afterChange = progress(invalidated);
  expect(
    afterChange.confirmed,
    "the changed section and its dependent leave the confirmed count",
  ).toBe(progress(allConfirmed).confirmed - 2);
  expect(afterChange.total, "the required total stays the same").toBe(progress(allConfirmed).total);

  const columns = await columnStates(world);
  const pushed = await rewriteSection(
    world,
    "booking",
    OUTSIDE_STATE,
    "Booking text pushed into a draft section file.",
  );
  await deliverPush(world, hookBody(world));
  expect(await columnStates(world), "an outside push does not change any section state").toEqual(columns);
  const imported = await devView(world);
  const file = await sectionFile(
    world.client,
    world.repoName,
    pushed.sha,
    filePath(world, "booking"),
  );
  expect(Object.keys(file.document), "a section file has no state field").not.toContain("state");
  expect(texts(imported, "booking"), "the outside push imported the file text").toEqual([OUTSIDE_STATE]);
  expect(statePicture(imported), "the snapshot state is the database column").toEqual(
    await columnStates(world),
  );
  expect(statePicture(await ngoView(world)), "the NGO reads the same states").toEqual(
    statePicture(imported),
  );
}

export async function proveTopicTools(): Promise<void> {
  const seeded = await seed();
  try {
    await credit(seeded, "20.000000");
    const opened = await open(seeded, seeded.dev);
    expect(opened.status, JSON.stringify(opened.json)).toBe(200);
    const world = await loadWorld(seeded);
    const shared = await beginTurn(world, { kind: "main" }, "The shared commit turn.");
    await proveGrantToken(world, shared.token);
    await proveLandTogether(world, shared);
    await proveReplayedWebhook(world);
    await finishTurn(seeded, shared.turnId);
    await proveStaleCommit(world);
    await proveSeparateChats(world);
    await proveOutsideDuringAdvance(world);
    await proveLostAdvance(world);
    await proveForgedTrailer(world);
    await proveDatabaseStates(world);
    throw new AtPending(
      "AT-036.08",
      "sut-missing",
      "The overview list and its test ids are the screen wiring unit's, and stale recommendations and score events need the completion check, which is not in this tree yet.",
    );
  } finally {
    await seeded.sql.close();
  }
}
