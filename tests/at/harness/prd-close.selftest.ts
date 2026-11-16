import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { parsePrdSnapshot } from "../../../src/lib/prd-stream.ts";
import type { GithubRepo } from "../../../supabase/functions/_shared/github/repo.ts";
import { publishCloseTag } from "../../../supabase/functions/_shared/prd/git.ts";
import { prdMessageSettle, type PrdMessageArgs } from "../../../supabase/functions/_shared/prd/routes.ts";
import { prdRelayDeps } from "../../../supabase/functions/_shared/prd/relay.ts";
import { snapshotFromRecord } from "../../../supabase/functions/_shared/prd/snapshot.ts";
import type { SettleDatabase } from "../../../supabase/functions/_shared/write-routes.ts";
import { STACK_ENV, sqlClient, stackFromEnv, type Stack } from "./live-stack.ts";
import { madeSha, openWithoutGithub } from "./prd-git.ts";

const PROJECT = "55555555-5555-4555-8555-555555555555";
const TURN = "33333333-3333-4333-8333-333333333333";
const ACTOR = "11111111-1111-4111-8111-111111111111";
const FROZEN = "0123456789abcdef0123456789abcdef01234567";
const OTHER = "abcdef0123456789abcdef0123456789abcdef01";
const OP = "22222222-2222-4222-8222-222222222222";
const REPO = "harbor-prd";
const CHECK = "44444444-4444-4444-8444-444444444444";

const live = Boolean(process.env[STACK_ENV.dbUrl]) && "Bun" in globalThis;
type Sql = ReturnType<typeof sqlClient>;

type Call = { name: string; args: Record<string, unknown> };
type TagCall = { repo: string; name: string; sha: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sourceBody() {
  return {
    state: "admitted",
    recorded: null,
    chatId: "66666666-6666-4666-8666-666666666666",
    revision: 2,
    threshold: 85,
    thresholdText: "85 (placeholder)",
    discovery: { need: { text: "Schedule volunteers" } },
    sections: [
      {
        key: "booking",
        title: "Who books shifts",
        document: { statements: [{ text: "Volunteers book themselves." }], decisions: [] },
      },
      {
        key: "technical-scope",
        title: "Technical scope",
        document: { statements: [], decisions: [] },
      },
    ],
  };
}

function messageArgs(): PrdMessageArgs {
  return {
    p_actor: ACTOR,
    p_project: PROJECT,
    p_chat_key: "main",
    p_request_id: "close-check-1",
    p_base_revision: 2,
    p_intent: { kind: "close-check" },
    p_body_hash: "hash-close-check-1",
    p_model: "selftest-model",
  };
}

function modelOf(text: string) {
  let calls = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async () => {
      calls += 1;
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

function harness(options: {
  pending: Record<string, unknown> | null;
  tagged: { ok: true; result: "tagged" } | { ok: true; result: "conflict"; sha: string };
}) {
  const calls: Call[] = [];
  const tags: TagCall[] = [];
  const rpc: SettleDatabase = async (name, args) => {
    calls.push({ name, args });
    if (name === "prd_check_source") return { ok: true, value: sourceBody() };
    if (name === "prd_turn_settings_record") return { ok: true, value: {} };
    if (name === "prd_turn_ingest") return { ok: true, value: { providerMicros: 12, feeMicros: 1 } };
    if (name === "prd_check_record") return { ok: true, value: { id: args.p_check, replayed: false } };
    if (name === "prd_close_after_check") {
      return { ok: true, value: { sequence: 5, closed: options.pending !== null, tag: null } };
    }
    if (name === "prd_close_tag_pending") return { ok: true, value: options.pending };
    if (name === "prd_git_op_published") return { ok: true, value: null };
    return { ok: false, message: `unexpected ${name}` };
  };
  const github = {
    async tag(repo: string, name: string, sha: string) {
      tags.push({ repo, name, sha });
      return options.tagged;
    },
  } as GithubRepo;
  const deps = prdRelayDeps({
    rpc,
    fetch: async () => new Response("offline", { status: 500 }),
    env: {
      PRD_MODEL_BASE_URL: "https://model.example/v1/",
      PRD_MODEL: "selftest-model",
      PRD_MODEL_API_KEY: "test-key",
    },
    model: modelOf("").model,
    github,
  });
  return { calls, tags, rpc, github, deps };
}

function withModel(
  built: ReturnType<typeof harness>,
  text: string,
): { deps: ReturnType<typeof harness>["deps"]; calls: () => number } {
  const language = modelOf(text);
  return {
    deps: { ...built.deps, model: language.model },
    calls: language.calls,
  };
}

function recordCall(calls: Call[], name: string): Record<string, unknown> | null {
  const found = calls.find((call) => call.name === name);
  return found ? found.args : null;
}

function partsOf(args: Record<string, unknown>): unknown[] {
  const parts = args.p_parts;
  if (!Array.isArray(parts)) throw new Error("the check message has no parts");
  return parts;
}

const PEOPLE = [
  { role: "ai", name: "ai4good AI", label: "AI" },
  { role: "dev", name: "Priya Shah", label: "Developer" },
  { role: "ngo", name: "Maya Levi", label: "NGO" },
];

const FUNDS = {
  allocationMicros: 1_000_000,
  settledMicros: 0,
  pendingMicros: 0,
  replyHoldMicros: 50_000,
  availableMicros: 1_000_000,
  band: "green",
  replyFunded: true,
};

function section(key: string, title: string, state: string, required: boolean, gap: string | null) {
  return {
    key,
    title,
    required,
    state,
    gap,
    dependencies: key === "rules" ? ["booking"] : [],
    document: { statements: [{ text: `${title} is written.`, sources: ["Discovery revision 1"] }], decisions: [] },
    confirm: { allowed: false, reason: "not-ready" },
    reopen: { allowed: false, reason: "not-confirmed" },
  };
}

function closeFacts(path: "check" | "close", allowed: boolean, reason: string | null) {
  return {
    kind: "open",
    revision: 2,
    path,
    allowed,
    reason,
    token: allowed ? "close|close|2|0" : null,
    checkId: CHECK,
    askVersion: 1,
  };
}

function facts(parts: unknown[], close: Record<string, unknown>) {
  return {
    sequence: 4,
    revision: 2,
    discoveryRevision: 1,
    people: PEOPLE,
    project: { title: "Volunteer scheduling", organizationName: "Harbor Community Kitchen" },
    sections: [
      section("booking", "Who books shifts", "ready", true, null),
      section("rules", "Booking rules", "open", true, null),
      section("technical-scope", "Technical scope", "needs-review", true, "No user story is written."),
    ],
    devQuestions: [],
    questions: [
      {
        id: "q-block",
        section: "booking",
        text: "Which Saturday shortage should the kitchen count?",
        why: "It blocks the close.",
        blocking: true,
        options: ["This Saturday"],
        introMessage: "m-intro",
        status: "suggested",
        post: { allowed: false, reason: "forbidden" },
      },
      {
        id: "q-wait",
        section: "booking",
        text: "How far ahead are shifts published?",
        why: "The reminders count from this date.",
        blocking: true,
        options: ["One week"],
        introMessage: "m-intro",
        status: "posted",
      },
      {
        id: "q-done",
        section: "booking",
        text: "How long should the kitchen keep contact details?",
        why: "Only the kitchen can decide this.",
        blocking: false,
        options: ["12 months"],
        introMessage: "m-intro",
        status: "complete",
        answer: "12 months",
        use: { allowed: false, reason: "forbidden" },
      },
    ],
    chats: [
      {
        key: "main",
        canWrite: true,
        send: { allowed: true },
        messages: [
          {
            id: "m-line",
            role: "system",
            metadata: { actor: "system", name: "", at: "2026-11-16T00:00:00.000Z" },
            parts: [
              {
                type: "data-line",
                data: { text: "Priya pressed Close PRD · revision 2", topicId: null },
              },
            ],
          },
          {
            id: "m-ask",
            role: "assistant",
            metadata: { actor: "ai", name: "ai4good AI", at: "2026-11-16T00:00:00.000Z" },
            parts,
          },
        ],
      },
    ],
    drafts: {},
    funds: FUNDS,
    check: {
      id: CHECK,
      revision: 2,
      passed: false,
      coverageText: "Stories are missing.",
      thresholdText: "85 (placeholder)",
      gaps: [
        {
          topicId: "technical-scope",
          title: "Technical scope",
          text: "No user story is written.",
          fixed: false,
        },
      ],
    },
    close,
  };
}

const DEV = { role: "dev", name: "Priya Shah" } as const;
const NGO = { role: "ngo", name: "Maya Levi" } as const;

describe("close PRD offline", () => {
  it("closes after a passing check and tags the frozen revision", async () => {
    const pending = { opId: OP, repoName: REPO, commitSha: FROZEN, revision: 2 };
    const built = harness({ pending, tagged: { ok: true, result: "tagged" } });
    const language = withModel(
      built,
      JSON.stringify({ score: 91, coverageText: "The PRD covers the agreed booking answer.", gaps: [] }),
    );
    const reserved = {
      turnId: TURN,
      messageId: null,
      sequence: 4,
      check: { turnId: TURN, sectionKey: "", priorState: "ready", priorChanged: null },
    };
    const result = await prdMessageSettle(language.deps).act(reserved, messageArgs(), built.rpc);
    expect(result).toEqual({ args: null, failure: null, skipSettle: true });
    expect(language.calls()).toBe(1);
    const recorded = recordCall(built.calls, "prd_check_record");
    if (recorded === null) throw new Error("the passing check was not recorded");
    expect(recorded.p_score).toBe(91);
    expect(recorded.p_gaps).toEqual([]);
    const text = partsOf(recorded)
      .flatMap((part) => (isRecord(part) && part.type === "text" ? [part.text] : []))
      .join("\n");
    expect(text).toContain("passes.");
    expect(built.calls.some((call) => call.name === "prd_close_after_check")).toBe(true);
    expect(built.tags).toEqual([{ repo: REPO, name: "prd-r2", sha: FROZEN }]);
    expect(recordCall(built.calls, "prd_git_op_published")).toEqual({ p_op: OP });
  });

  it("warns with the gaps and parses the close ask", async () => {
    const built = harness({ pending: null, tagged: { ok: true, result: "tagged" } });
    const language = withModel(
      built,
      JSON.stringify({
        score: 40,
        coverageText: "Stories are missing.",
        gaps: [{ sectionKey: "technical-scope", text: "No user story is written." }],
      }),
    );
    const reserved = {
      turnId: TURN,
      messageId: null,
      sequence: 4,
      check: { turnId: TURN, sectionKey: "", priorState: "ready", priorChanged: null },
    };
    const result = await prdMessageSettle(language.deps).act(reserved, messageArgs(), built.rpc);
    expect(result.failure).toBeNull();
    expect(language.calls()).toBe(1);
    const recorded = recordCall(built.calls, "prd_check_record");
    if (recorded === null) throw new Error("the failing check was not recorded");
    expect(recorded.p_gaps).toEqual([{ sectionKey: "technical-scope", text: "No user story is written." }]);
    const edgeParts = partsOf(recorded);
    const checkPart = edgeParts.find((part) => isRecord(part) && part.type === "data-check");
    if (!isRecord(checkPart) || !isRecord(checkPart.data)) throw new Error("the check part is missing");
    const checkId = String(checkPart.data.checkId);
    const liveAsk = {
      type: "data-close-ask",
      data: {
        checkId,
        revision: 2,
        closeAnyway: { kind: "close-anyway", token: `close-anyway|ask:${checkId}|2|1` },
        keepWorking: { kind: "keep-working", token: `keep-working|ask:${checkId}|2|1` },
      },
    };
    const staleAsk = {
      type: "data-close-ask",
      data: {
        checkId,
        revision: 2,
        closeAnyway: { kind: "close-anyway", token: `close-anyway|ask:${checkId}|2|0` },
        keepWorking: { kind: "keep-working", token: `keep-working|ask:${checkId}|2|0` },
      },
    };
    const recommendation = {
      type: "data-recommendation",
      data: { revision: 2, close: { kind: "close", token: "close|close|2|0" } },
    };
    const openFacts = facts(
      [...edgeParts, liveAsk, staleAsk, recommendation],
      { ...closeFacts("check", true, null), checkId },
    );
    const warned = parsePrdSnapshot(snapshotFromRecord(openFacts, DEV));
    if (warned.close.kind !== "open") throw new Error("the warning closed the PRD");
    expect(warned.close.path).toBe("check");
    expect(warned.close.close).toEqual({ kind: "available", action: { kind: "close", token: "close|close|2|0" } });
    expect(warned.close.remaining.map((item) => item.text)).toEqual([
      "1 section ready for you to confirm",
      "1 section still being written",
      "1 blocking question not posted to Maya",
      "1 blocking question waiting for Maya",
      "1 answer from Maya to use",
      "1 gap from the completion check to fix",
    ]);
    const message = warned.chats.main?.[1];
    if (message === undefined) throw new Error("the warning message did not parse");
    expect(message.parts.filter((part) => part.type === "data-close-ask")).toEqual([liveAsk]);
    expect(message.parts.some((part) => part.type === "data-recommendation")).toBe(false);
    expect(message.parts.some((part) => part.type === "data-check")).toBe(true);
    expect(warned.chats.main?.[0]?.parts[0]).toMatchObject({
      type: "data-line",
      data: { text: "Priya pressed Close PRD · revision 2", topicId: null },
    });
    const ready = parsePrdSnapshot(
      snapshotFromRecord(facts([...edgeParts, recommendation], closeFacts("close", true, null)), DEV),
    );
    const readyMessage = ready.chats.main?.[1];
    expect(readyMessage?.parts.filter((part) => part.type === "data-recommendation")).toEqual([recommendation]);
    if (ready.close.kind !== "open") throw new Error("a passing revision was not open");
    expect(ready.close.path).toBe("close");
    const closed = parsePrdSnapshot(
      snapshotFromRecord(
        { ...facts([], { kind: "closed", revision: 2, openPoints: 3 }), sections: [], questions: [], chats: [] },
        DEV,
      ),
    );
    expect(closed.close).toEqual({ kind: "closed", revision: 2, openPoints: 3 });
    const ngo = parsePrdSnapshot(snapshotFromRecord(facts([], closeFacts("check", false, "forbidden")), NGO));
    if (ngo.close.kind !== "open" || ngo.close.close.kind !== "unavailable") {
      throw new Error("the NGO was offered close");
    }
    expect(ngo.close.close.reason).toBe("Only Priya can close the PRD.");
    expect(built.tags).toEqual([]);
    expect(built.calls.some((call) => call.name === "prd_git_op_published")).toBe(false);
  });

  it("repeats the warning on the same revision without a model call", async () => {
    const built = harness({ pending: null, tagged: { ok: true, result: "tagged" } });
    const language = withModel(built, JSON.stringify({ score: 10, coverageText: "No.", gaps: [] }));
    const result = await prdMessageSettle(language.deps).act(
      { turnId: TURN, messageId: null, sequence: 4, closeFollowUp: true },
      messageArgs(),
      built.rpc,
    );
    expect(result).toEqual({ args: null, failure: null, skipSettle: true });
    expect(language.calls()).toBe(0);
    expect(built.calls.map((call) => call.name)).toEqual(["prd_close_after_check", "prd_close_tag_pending"]);
    expect(built.tags).toEqual([]);
  });

  it("treats an existing tag at the frozen commit as done and leaves a conflicting tag pending", async () => {
    const pending = { opId: OP, repoName: REPO, commitSha: FROZEN, revision: 2 };
    const done = harness({ pending, tagged: { ok: true, result: "tagged" } });
    const published = await publishCloseTag(PROJECT, { github: done.github, rpc: done.rpc });
    expect(published).toEqual({ ok: true });
    expect(done.tags).toEqual([{ repo: REPO, name: "prd-r2", sha: FROZEN }]);
    expect(recordCall(done.calls, "prd_git_op_published")).toEqual({ p_op: OP });

    const conflict = harness({ pending, tagged: { ok: true, result: "conflict", sha: OTHER } });
    const language = withModel(conflict, JSON.stringify({ score: 91, coverageText: "Covered.", gaps: [] }));
    const settled = await prdMessageSettle(language.deps).act(
      {
        turnId: TURN,
        messageId: null,
        sequence: 4,
        check: { turnId: TURN, sectionKey: "", priorState: "ready", priorChanged: null },
      },
      messageArgs(),
      conflict.rpc,
    );
    expect(settled).toEqual({ args: null, failure: null, skipSettle: true });
    expect(conflict.tags).toEqual([{ repo: REPO, name: "prd-r2", sha: FROZEN }]);
    expect(conflict.calls.some((call) => call.name === "prd_git_op_published")).toBe(false);
    const direct = await publishCloseTag(PROJECT, { github: conflict.github, rpc: conflict.rpc });
    expect(direct).toEqual({ ok: false, reason: "the close tag points at another commit" });
  });
});

function jsonValue(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function record(value: unknown): Record<string, unknown> {
  const parsed = jsonValue(value);
  if (!isRecord(parsed)) throw new Error("expected a record");
  return parsed;
}

function whole(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  throw new Error(`expected a whole number, got ${JSON.stringify(value)}`);
}

async function objectOf(query: Promise<unknown>): Promise<Record<string, unknown>> {
  const rows = (await query) as Array<{ r: unknown }>;
  return record(rows[0].r);
}

async function counted(query: Promise<unknown>): Promise<number> {
  const rows = (await query) as Array<{ n: unknown }>;
  return whole(rows[0].n);
}

async function refused(run: Promise<unknown>): Promise<{ detail: string; message: string }> {
  try {
    await run;
  } catch (error) {
    const err = error as { detail?: unknown; message?: unknown };
    return { detail: String(err.detail), message: String(err.message) };
  }
  throw new Error("expected a refusal");
}

async function account(stack: Stack, sql: Sql, kind: "volunteer" | "ngo", name: string) {
  const created = await fetch(`${stack.apiUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: stack.serviceRoleKey,
      Authorization: `Bearer ${stack.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: `${crypto.randomUUID()}@example.com`, email_confirm: true }),
  });
  if (created.status >= 400) throw new Error(`provisioning answered ${created.status}`);
  const id = String(((await created.json()) as { id?: string }).id ?? "");
  await sql`insert into public.accounts (id, account_type)
    values (${id}::uuid, ${kind}::public.account_type)`;
  await sql`insert into public.acknowledgments
    (account_id, kind, text_version, signer_name, signer_title, authority_attestation)
    values (${id}::uuid, 'platform_tos_and_promise', 'tos-1', ${name}, 'Coordinator', 'I may act')`;
  return id;
}

function schedulingBrief(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    need: { text: "Schedule volunteers", source: { kind: "intake" } },
    usersToday: { text: "Coordinators fill a spreadsheet every week.", source: { kind: "intake" } },
    successMeasure: null,
    topicOrder: ["booking", "rules"],
    topics: {
      booking: {
        id: "booking",
        title: "Who books shifts",
        required: true,
        state: { kind: "agreed", answer: "Volunteers book themselves.", source: { kind: "chat", round: 1 } },
      },
      rules: { id: "rules", title: "Booking rules", required: true, state: { kind: "open" } },
    },
    dependsOn: { rules: ["booking"] },
  };
}

async function world(stack: Stack, sql: Sql) {
  const dev = await account(stack, sql, "volunteer", "Priya Shah");
  const ngo = await account(stack, sql, "ngo", "Maya Levi");
  const orgs = (await sql`insert into public.organizations (name)
    values ('Harbor Community Kitchen') returning id`) as Array<{ id: string }>;
  const org = String(orgs[0].id);
  await sql`insert into public.org_memberships (org_id, account_id, role)
    values (${org}::uuid, ${ngo}::uuid, 'admin')`;
  const projects = (await sql`insert into public.projects (org_id, name, assigned_volunteer_id)
    values (${org}::uuid, 'Volunteer scheduling', ${dev}::uuid) returning id`) as Array<{ id: string }>;
  const project = String(projects[0].id);
  await sql`insert into public.brief_revisions (project_id, revision, document, created_by)
    values (${project}::uuid, 1, ${JSON.stringify(schedulingBrief())}::text::jsonb, ${ngo}::uuid)`;
  await sql`insert into public.discovery_confirmations
    (project_id, revision, actor_id, actor_name, confirmed_at, accepted_gaps)
    values (${project}::uuid, 1, ${ngo}::uuid, 'Maya Levi', clock_timestamp(), '[]'::jsonb)`;
  await openWithoutGithub(sql, dev, org, project);
  return { dev, ngo, org, project };
}

async function credit(sql: Sql, project: string): Promise<void> {
  await sql`select public.prd_fund_credit(${project}::uuid, ${"1000"}::numeric, 'selftest funds')`;
}

async function revisionOf(sql: Sql, project: string): Promise<number> {
  const rows = (await sql`select current_revision from public.prd_records
    where project_id = ${project}::uuid`) as Array<{ current_revision: unknown }>;
  return whole(rows[0].current_revision);
}

async function headOf(sql: Sql, project: string): Promise<string> {
  const rows = (await sql`select head_commit from public.prd_records
    where project_id = ${project}::uuid`) as Array<{ head_commit: unknown }>;
  if (typeof rows[0].head_commit !== "string" || rows[0].head_commit === "") {
    throw new Error("the PRD has no head");
  }
  return rows[0].head_commit;
}

function reserve(
  sql: Sql,
  actor: string,
  project: string,
  key: string,
  request: string,
  revision: number,
  intent: Record<string, unknown>,
) {
  return sql`select public.prd_turn_reserve(
    ${actor}::uuid, ${project}::uuid, ${key}, ${request}, ${revision},
    ${JSON.stringify(intent)}::text::jsonb, ${`hash-${request}`}
  ) as r`;
}

function closeCheck(sql: Sql, actor: string, project: string, request: string, revision: number) {
  return reserve(sql, actor, project, "main", request, revision, { kind: "close-check" });
}

function act(sql: Sql, actor: string, project: string, kind: string, token: string, request: string) {
  return sql`select public.prd_action(
    ${actor}::uuid, ${project}::uuid, ${kind}, ${token}, ${request}
  ) as r`;
}

async function recordCheck(
  sql: Sql,
  project: string,
  turnId: string,
  score: number,
  gaps: Array<{ sectionKey: string; text: string }>,
): Promise<string> {
  const checkId = crypto.randomUUID();
  const recorded = await objectOf(sql`select public.prd_check_record(
    ${project}::uuid, ${turnId}::uuid, ${checkId}::uuid, ${score}, 'A selftest check.',
    ${JSON.stringify(gaps)}::text::jsonb,
    ${JSON.stringify([{ type: "text", text: "A selftest check." }])}::text::jsonb
  ) as r`);
  expect(recorded.replayed).toBe(false);
  return checkId;
}

async function finish(sql: Sql, turnId: string): Promise<void> {
  await sql`select public.prd_turn_finish(${turnId}::uuid, 'answered')`;
}

async function suggestQuestion(sql: Sql, project: string, body: string): Promise<string> {
  const chats = (await sql`select id from public.prd_chats
    where project_id = ${project}::uuid and kind = 'main'`) as Array<{ id: string }>;
  const chat = String(chats[0].id);
  const messages = (await sql`select public.prd_insert_message(
    ${project}::uuid, ${chat}::uuid, 'ai', 'ai4good AI', null,
    ${JSON.stringify([{ type: "text", text: body }])}::text::jsonb, null
  ) as id`) as Array<{ id: string }>;
  const sections = (await sql`select id from public.prd_sections
    where project_id = ${project}::uuid and stable_key = 'booking'`) as Array<{ id: string }>;
  const rows = (await sql`insert into public.prd_questions
    (project_id, section_id, audience, status, body, why_now, options, blocking, intro_message)
    values (
      ${project}::uuid, ${String(sections[0].id)}::uuid, 'ngo', 'posted', ${body},
      'It blocks the close.', array['This Saturday']::text[], true, ${String(messages[0].id)}::uuid
    )
    returning id`) as Array<{ id: string }>;
  const questionId = String(rows[0].id);
  await sql`insert into public.prd_chats (project_id, kind, question_id)
    values (${project}::uuid, 'side', ${questionId}::uuid)`;
  return questionId;
}

async function statesOf(sql: Sql, project: string): Promise<Array<{ key: string; state: string; gap: string | null }>> {
  const rows = (await sql`select stable_key, state, gap_text from public.prd_sections
    where project_id = ${project}::uuid order by ordinal`) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    key: String(row.stable_key),
    state: String(row.state),
    gap: row.gap_text === null || row.gap_text === undefined ? null : String(row.gap_text),
  }));
}

async function fundsOf(sql: Sql, project: string): Promise<unknown> {
  const rows = (await sql`select public.prd_funds(${project}::uuid) as r`) as Array<{ r: unknown }>;
  return jsonValue(rows[0].r);
}

async function passedOf(sql: Sql, project: string): Promise<boolean> {
  const rows = (await sql`select passed from public.prd_checks
    where project_id = ${project}::uuid`) as Array<{ passed: unknown }>;
  return rows[0].passed === true;
}

async function boardTables(sql: Sql): Promise<number> {
  return counted(sql`select count(*) as n from information_schema.tables
    where table_schema = 'public'
      and (table_name like '%board%' or table_name like '%bootstrap%'
        or table_name like '%development%' or table_name like '%linear%')`);
}

describe.skipIf(!live)("close PRD rows on the local stack", () => {
  let stack: Stack;
  let sql: Sql;

  beforeAll(() => {
    stack = stackFromEnv();
    sql = sqlClient(stack);
  });

  afterAll(async () => {
    await sql?.close();
  });

  it("lets only the developer close, and refuses a busy chat or an unfunded check", async () => {
    const opened = await world(stack, sql);
    const revision = await revisionOf(sql, opened.project);
    const ngoFacts = await objectOf(sql`select public.prd_facts(${opened.ngo}::uuid, ${opened.project}::uuid) as r`);
    expect(record(ngoFacts.close)).toMatchObject({ kind: "open", path: "check", allowed: false, reason: "forbidden" });
    const ngoClose = await refused(closeCheck(sql, opened.ngo, opened.project, crypto.randomUUID(), revision));
    expect(ngoClose.detail).toBe("forbidden");

    const unfunded = await refused(closeCheck(sql, opened.dev, opened.project, crypto.randomUUID(), revision));
    expect(unfunded.detail).toBe("funds");
    expect(unfunded.message).toContain("Not enough left for another AI reply. The kitchen adds funds to continue.");
    expect(
      await counted(sql`select count(*) as n from public.prd_turns where project_id = ${opened.project}::uuid`),
    ).toBe(0);

    await credit(sql, opened.project);
    const devFacts = await objectOf(sql`select public.prd_facts(${opened.dev}::uuid, ${opened.project}::uuid) as r`);
    expect(record(devFacts.close)).toMatchObject({ kind: "open", path: "check", allowed: true, reason: null });
    const topic = await objectOf(
      reserve(sql, opened.dev, opened.project, "topic:booking", crypto.randomUUID(), revision, {
        kind: "text",
        text: "Still writing the booking section.",
      }),
    );
    const busy = await refused(closeCheck(sql, opened.dev, opened.project, crypto.randomUUID(), revision));
    expect(busy.detail).toBe("busy");
    expect(busy.message).toContain("Wait for the AI to finish.");
    await finish(sql, String(topic.turnId));
    const started = await objectOf(closeCheck(sql, opened.dev, opened.project, crypto.randomUUID(), revision));
    expect(record(started.check).sectionKey).toBe("");
    await finish(sql, String(started.turnId));
  });

  it("records each open point on close anyway, refuses a stale token, and keeps a later push out of the closed view", async () => {
    const opened = await world(stack, sql);
    await credit(sql, opened.project);
    const question = "Which Saturday shortage should the kitchen count?";
    const questionId = await suggestQuestion(sql, opened.project, question);
    const revision = await revisionOf(sql, opened.project);
    const started = await objectOf(closeCheck(sql, opened.dev, opened.project, crypto.randomUUID(), revision));
    const turnId = String(started.turnId);
    const checkId = await recordCheck(sql, opened.project, turnId, 40, [
      { sectionKey: "booking", text: "No user story is written." },
    ]);
    await finish(sql, turnId);
    const warned = await objectOf(sql`select public.prd_close_after_check(
      ${opened.project}::uuid, ${turnId}::uuid) as r`);
    expect(warned.closed).toBe(false);
    const stale = await refused(
      act(sql, opened.dev, opened.project, "close", `close|prd|${revision}|1`, crypto.randomUUID()),
    );
    expect(stale.detail).toBe("stale");
    expect(stale.message).toContain("The PRD changed. Close again.");
    const oldAsk = await refused(
      act(
        sql,
        opened.dev,
        opened.project,
        "close-anyway",
        `close-anyway|ask:${checkId}|${revision}|0`,
        crypto.randomUUID(),
      ),
    );
    expect(oldAsk.detail).toBe("stale");
    expect(await counted(sql`select count(*) as n from public.prd_closes where project_id = ${opened.project}::uuid`)).toBe(
      0,
    );

    const beforeStates = await statesOf(sql, opened.project);
    const beforeFunds = await fundsOf(sql, opened.project);
    const beforePassed = await passedOf(sql, opened.project);
    const request = crypto.randomUUID();
    const closed = await objectOf(
      act(
        sql,
        opened.dev,
        opened.project,
        "close-anyway",
        `close-anyway|ask:${checkId}|${revision}|1`,
        request,
      ),
    );
    expect(closed.closed).toBe(true);
    const replay = await objectOf(
      act(
        sql,
        opened.dev,
        opened.project,
        "close-anyway",
        `close-anyway|ask:${checkId}|${revision}|1`,
        request,
      ),
    );
    expect(replay).toEqual(closed);
    const points = (await sql`select kind, section_key, question_id, body from public.prd_close_points
      where project_id = ${opened.project}::uuid order by ordinal`) as Array<Record<string, unknown>>;
    expect(points.filter((point) => point.kind === "gap")).toEqual([
      expect.objectContaining({ section_key: "booking", body: "No user story is written." }),
    ]);
    expect(points.filter((point) => point.kind === "unconfirmed").map((point) => point.section_key).sort()).toEqual([
      "rules",
      "technical-scope",
    ]);
    const questionPoint = points.find((point) => point.kind === "question");
    expect(String(questionPoint?.question_id)).toBe(questionId);
    expect(questionPoint?.body).toBe(question);
    expect(whole(closed.openPoints)).toBe(points.length);
    const closeRow = (await sql`select revision, closed_anyway, commit_sha from public.prd_closes
      where project_id = ${opened.project}::uuid`) as Array<Record<string, unknown>>;
    expect(closeRow[0].closed_anyway).toBe(true);
    expect(whole(closeRow[0].revision)).toBe(revision);
    const tag = (await sql`select status, commit_sha from public.prd_git_ops
      where project_id = ${opened.project}::uuid and kind = 'close-tag'`) as Array<Record<string, unknown>>;
    expect([...tag]).toEqual([{ status: "written", commit_sha: closeRow[0].commit_sha }]);
    expect(await statesOf(sql, opened.project)).toEqual(beforeStates);
    expect(await fundsOf(sql, opened.project)).toEqual(beforeFunds);
    expect(await passedOf(sql, opened.project)).toBe(beforePassed);

    const again = await refused(act(sql, opened.dev, opened.project, "close", `close|close|${revision}|0`, crypto.randomUUID()));
    expect(again.detail).toBe("closed");
    for (const kind of ["confirm-topic", "reopen-topic", "post-question", "close", "close-anyway", "keep-working"]) {
      const token =
        kind === "post-question"
          ? `post-question|question:${questionId}|${revision}|1`
          : kind === "close"
            ? `close|close|${revision}|0`
            : kind === "confirm-topic" || kind === "reopen-topic"
              ? `${kind}|topic:booking|${revision}|0`
              : `${kind}|ask:${checkId}|${revision}|1`;
      expect(
        (await refused(act(sql, opened.dev, opened.project, kind, token, crypto.randomUUID()))).detail,
        kind,
      ).toBe("closed");
    }
    expect(
      (
        await refused(
          act(
            sql,
            opened.ngo,
            opened.project,
            "complete-answer",
            `complete-answer|question:${questionId}|${revision}|1`,
            crypto.randomUUID(),
          ),
        )
      ).detail,
    ).toBe("closed");
    expect(
      (
        await refused(
          reserve(sql, opened.dev, opened.project, "main", crypto.randomUUID(), revision, {
            kind: "text",
            text: "Too late",
          }),
        )
      ).detail,
    ).toBe("closed");
    expect(
      (
        await refused(
          reserve(sql, opened.dev, opened.project, "topic:booking", crypto.randomUUID(), revision, {
            kind: "text",
            text: "Too late",
          }),
        )
      ).detail,
    ).toBe("closed");
    expect(
      (
        await refused(
          closeCheck(sql, opened.dev, opened.project, crypto.randomUUID(), revision),
        )
      ).detail,
    ).toBe("closed");
    expect(
      (
        await refused(
          reserve(sql, opened.ngo, opened.project, `side:${questionId}`, crypto.randomUUID(), revision, {
            kind: "text",
            text: "Too late",
          }),
        )
      ).detail,
    ).toBe("closed");

    const beforeFacts = await objectOf(sql`select public.prd_facts(${opened.dev}::uuid, ${opened.project}::uuid) as r`);
    const beforeDocument = JSON.stringify(
      (beforeFacts.sections as Array<Record<string, unknown>>).find((item) => item.key === "rules")?.document,
    );
    const sequence = whole(
      ((await sql`select snapshot_sequence from public.prd_records
        where project_id = ${opened.project}::uuid`) as Array<{ snapshot_sequence: unknown }>)[0].snapshot_sequence,
    );
    const head = await headOf(sql, opened.project);
    const files = (await sql`select title, file_path from public.prd_sections
      where project_id = ${opened.project}::uuid and stable_key = 'rules'`) as Array<Record<string, unknown>>;
    const sha = madeSha(`${opened.project}:after-close`);
    const applied = await objectOf(sql`select public.prd_reconcile(
      ${opened.project}::uuid, ${head}, ${JSON.stringify([
        {
          sha,
          parents: [head],
          login: "octocat",
          message: "A push after close",
          changes: [
            {
              path: String(files[0].file_path),
              change: "modified",
              blobSha: sha,
              file: {
                variant: "readable",
                key: "rules",
                title: String(files[0].title),
                document: {
                  statements: [{ text: "A later push must not appear in the closed view.", sources: ["Discovery revision 1"] }],
                  decisions: [],
                },
              },
            },
          ],
        },
      ])}::text::jsonb
    ) as r`);
    expect(applied.stale).toBe(false);
    expect(whole(applied.revision)).toBe(revision);
    expect(whole(applied.sequence)).toBe(sequence);
    expect(await headOf(sql, opened.project)).toBe(sha);
    expect(
      whole(
        ((await sql`select max(revision) as n from public.prd_revisions
          where project_id = ${opened.project}::uuid`) as Array<{ n: unknown }>)[0].n,
      ),
    ).toBeGreaterThan(revision);
    const afterFacts = await objectOf(sql`select public.prd_facts(${opened.dev}::uuid, ${opened.project}::uuid) as r`);
    expect(record(afterFacts.close)).toMatchObject({ kind: "closed", revision, openPoints: points.length });
    expect(
      JSON.stringify((afterFacts.sections as Array<Record<string, unknown>>).find((item) => item.key === "rules")?.document),
    ).toBe(beforeDocument);
    expect(await statesOf(sql, opened.project)).toEqual(beforeStates);
    expect(await boardTables(sql)).toBe(0);
  });

  it("keeps working without closing or changing the revision", async () => {
    const opened = await world(stack, sql);
    await credit(sql, opened.project);
    const revision = await revisionOf(sql, opened.project);
    const started = await objectOf(closeCheck(sql, opened.dev, opened.project, crypto.randomUUID(), revision));
    const turnId = String(started.turnId);
    const checkId = await recordCheck(sql, opened.project, turnId, 40, [
      { sectionKey: "booking", text: "No user story is written." },
    ]);
    await finish(sql, turnId);
    await objectOf(sql`select public.prd_close_after_check(${opened.project}::uuid, ${turnId}::uuid) as r`);
    const before = {
      revision: await revisionOf(sql, opened.project),
      states: await statesOf(sql, opened.project),
      funds: await fundsOf(sql, opened.project),
      passed: await passedOf(sql, opened.project),
    };
    const kept = await objectOf(
      act(
        sql,
        opened.dev,
        opened.project,
        "keep-working",
        `keep-working|ask:${checkId}|${revision}|1`,
        crypto.randomUUID(),
      ),
    );
    expect(kept.closed).toBe(false);
    expect(await revisionOf(sql, opened.project)).toBe(before.revision);
    expect(await statesOf(sql, opened.project)).toEqual(before.states);
    expect(await fundsOf(sql, opened.project)).toEqual(before.funds);
    expect(await passedOf(sql, opened.project)).toBe(before.passed);
    const recordRow = (await sql`select state, closed_revision from public.prd_records
      where project_id = ${opened.project}::uuid`) as Array<Record<string, unknown>>;
    expect(recordRow[0].state).toBe("open");
    expect(recordRow[0].closed_revision).toBeNull();
    expect(await counted(sql`select count(*) as n from public.prd_closes where project_id = ${opened.project}::uuid`)).toBe(
      0,
    );
    const versions = (await sql`select ask_version from public.prd_checks
      where id = ${checkId}::uuid`) as Array<{ ask_version: unknown }>;
    expect(whole(versions[0].ask_version)).toBe(2);
  });

  it("closes at once when the check passes and nothing is still open", async () => {
    const opened = await world(stack, sql);
    await credit(sql, opened.project);
    await sql`update public.prd_sections set state = 'confirmed'
      where project_id = ${opened.project}::uuid and required = true`;
    const revision = await revisionOf(sql, opened.project);
    const started = await objectOf(closeCheck(sql, opened.dev, opened.project, crypto.randomUUID(), revision));
    const turnId = String(started.turnId);
    await recordCheck(sql, opened.project, turnId, 100, []);
    await finish(sql, turnId);
    const request = crypto.randomUUID();
    const closed = await objectOf(
      act(sql, opened.dev, opened.project, "close", `close|close|${revision}|0`, request),
    );
    expect(closed).toMatchObject({ closed: true, openPoints: 0 });
    const replay = await objectOf(
      act(sql, opened.dev, opened.project, "close", `close|close|${revision}|0`, request),
    );
    expect(replay).toEqual(closed);
    const row = (await sql`select state, closed_revision, closed_anyway from public.prd_records r
      join public.prd_closes c on c.project_id = r.project_id
      where r.project_id = ${opened.project}::uuid`) as Array<Record<string, unknown>>;
    expect(row[0].state).toBe("closed");
    expect(whole(row[0].closed_revision)).toBe(revision);
    expect(row[0].closed_anyway).toBe(false);
    expect(
      await counted(sql`select count(*) as n from public.prd_close_points where project_id = ${opened.project}::uuid`),
    ).toBe(0);
    expect(
      (await refused(act(sql, opened.dev, opened.project, "close", `close|close|${revision}|0`, crypto.randomUUID())))
        .detail,
    ).toBe("closed");
  });
});
