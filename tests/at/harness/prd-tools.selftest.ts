import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseSection, renderSection } from "../../../supabase/functions/_shared/prd/file.ts";
import type { SectionDocument } from "../../../supabase/functions/_shared/prd/file.ts";
import { STACK_ENV, sqlClient, stackFromEnv, type Stack } from "./live-stack.ts";
import { madeSha, openWithoutGithub } from "./prd-git.ts";

type Sql = ReturnType<typeof sqlClient>;

const live = Boolean(process.env[STACK_ENV.dbUrl]) && "Bun" in globalThis;
const REPLY_TOOLS = [
  "read_section",
  "stage_section",
  "propose_ready",
  "suggest_ngo_question",
  "commit_prepare",
];
const ANSWER_TOOLS = ["record_outcome", "commit_prepare"];

type World = { dev: string; ngo: string; stranger: string; org: string; project: string };
type Stamp = {
  state: string;
  revision: number;
  sequence: number;
  head: string;
  closed: number | null;
};
type DbSection = {
  stable_key: string;
  title: string;
  file_path: string;
  state: string;
  required: boolean;
  confirmed_version: string | null;
  changed_since_confirmed: string | null;
};
type Turn = { turnId: string; messageId: string; sequence: number };
type FileChange = {
  path: string;
  change: "modified";
  blobSha: string;
  file: {
    variant: "readable";
    key: string;
    title: string;
    document: SectionDocument;
  };
};

function jsonValue(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  const parsed = jsonValue(value);
  if (!isRecord(parsed)) throw new Error("expected a record");
  return parsed;
}

function asArray(value: unknown): unknown[] {
  const parsed = jsonValue(value);
  if (!Array.isArray(parsed)) throw new Error("expected an array");
  return parsed;
}

function whole(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  throw new Error(`expected a whole number, got ${JSON.stringify(value)}`);
}

function texts(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string" && value.startsWith("[")) {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item));
  }
  if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
    const body = value.slice(1, -1);
    if (body === "") return [];
    return body.split(",").map((item) => item.replace(/^"|"$/g, ""));
  }
  throw new Error(`expected a text list, got ${JSON.stringify(value)}`);
}

function statementText(document: unknown): string[] {
  return asArray(record(document).statements).map((item) => String(record(item).text));
}

function flag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  throw new Error(`expected a boolean, got ${JSON.stringify(value)}`);
}

function drafted(text: string): SectionDocument {
  return { statements: [{ text, sources: ["Discovery revision 1"] }], decisions: [] };
}

function schedulingBrief(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    need: { text: "Schedule volunteers", source: { kind: "intake" } },
    usersToday: {
      text: "Coordinators fill a spreadsheet every week.",
      source: { kind: "intake" },
    },
    successMeasure: null,
    topicOrder: ["booking", "rules"],
    topics: {
      booking: {
        id: "booking",
        title: "Who books shifts",
        required: true,
        state: {
          kind: "agreed",
          answer: "Volunteers book themselves.",
          source: { kind: "chat", round: 1 },
        },
      },
      rules: { id: "rules", title: "Booking rules", required: true, state: { kind: "open" } },
    },
    dependsOn: { rules: ["booking"] },
  };
}

async function refusal(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (error) {
    const err = error as { detail?: unknown };
    return String(err.detail);
  }
  throw new Error("expected a refusal");
}

async function refused(run: Promise<unknown>): Promise<{ detail: string; hint: Record<string, unknown> | null }> {
  try {
    await run;
  } catch (error) {
    const err = error as { detail?: unknown; hint?: unknown };
    let hint: Record<string, unknown> | null = null;
    if (typeof err.hint === "string" && err.hint !== "") {
      const parsed = JSON.parse(err.hint) as unknown;
      if (isRecord(parsed)) hint = parsed;
    }
    return { detail: String(err.detail), hint };
  }
  throw new Error("expected a refusal");
}

async function objectOf(query: Promise<unknown>): Promise<Record<string, unknown>> {
  const rows = (await query) as Array<{ r: unknown }>;
  return record(rows[0].r);
}

async function counted(query: Promise<unknown>): Promise<number> {
  const rows = (await query) as Array<{ n: unknown }>;
  return whole(rows[0].n);
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

async function world(stack: Stack, sql: Sql): Promise<World> {
  const dev = await account(stack, sql, "volunteer", "Priya Shah");
  const ngo = await account(stack, sql, "ngo", "Maya Levi");
  const stranger = await account(stack, sql, "volunteer", "Someone Else");
  const orgs = (await sql`insert into public.organizations (name)
    values ('Harbor Community Kitchen') returning id`) as Array<{ id: string }>;
  const org = String(orgs[0].id);
  await sql`insert into public.org_memberships (org_id, account_id, role)
    values (${org}::uuid, ${ngo}::uuid, 'admin')`;
  const projects = (await sql`insert into public.projects (org_id, name, assigned_volunteer_id)
    values (${org}::uuid, 'Volunteer scheduling', ${dev}::uuid) returning id`) as Array<{
    id: string;
  }>;
  const project = String(projects[0].id);
  const brief = schedulingBrief();
  await sql`insert into public.brief_revisions (project_id, revision, document, created_by)
    values (${project}::uuid, 1, ${JSON.stringify(brief)}::text::jsonb, ${ngo}::uuid)`;
  await sql`insert into public.discovery_confirmations
    (project_id, revision, actor_id, actor_name, confirmed_at, accepted_gaps)
    values (${project}::uuid, 1, ${ngo}::uuid, 'Maya Levi', clock_timestamp(), '[]'::jsonb)`;
  await openWithoutGithub(sql, dev, org, project);
  return { dev, ngo, stranger, org, project };
}

async function stamp(sql: Sql, project: string): Promise<Stamp> {
  const rows =
    (await sql`select state, current_revision, snapshot_sequence, head_commit, closed_revision
    from public.prd_records where project_id = ${project}::uuid`) as Array<Record<string, unknown>>;
  const row = rows[0];
  if (row.head_commit === null || row.head_commit === undefined) {
    throw new Error("the PRD has no head");
  }
  return {
    state: String(row.state),
    revision: whole(row.current_revision),
    sequence: whole(row.snapshot_sequence),
    head: String(row.head_commit),
    closed: row.closed_revision === null ? null : whole(row.closed_revision),
  };
}

async function sections(sql: Sql, project: string): Promise<Record<string, DbSection>> {
  const rows = (await sql`select stable_key, title, file_path, state, required,
      confirmed_version, changed_since_confirmed
    from public.prd_sections where project_id = ${project}::uuid order by ordinal`) as Array<
    Record<string, unknown>
  >;
  const out: Record<string, DbSection> = {};
  for (const row of rows) {
    const key = String(row.stable_key);
    out[key] = {
      stable_key: key,
      title: String(row.title),
      file_path: String(row.file_path),
      state: String(row.state),
      required: flag(row.required),
      confirmed_version:
        row.confirmed_version === null || row.confirmed_version === undefined
          ? null
          : String(row.confirmed_version),
      changed_since_confirmed:
        row.changed_since_confirmed === null || row.changed_since_confirmed === undefined
          ? null
          : String(row.changed_since_confirmed),
    };
  }
  return out;
}

function requiredFlags(rows: Record<string, DbSection>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of Object.keys(rows)) out[key] = rows[key].required;
  return out;
}

async function factSection(sql: Sql, actor: string, project: string, key: string) {
  const body = await objectOf(sql`select public.prd_facts(${actor}::uuid, ${project}::uuid) as r`);
  const found = asArray(body.sections)
    .map(record)
    .find((item) => item.key === key);
  if (!found) throw new Error(`missing section ${key}`);
  return found;
}

async function questionRows(sql: Sql, actor: string, project: string) {
  const body = await objectOf(sql`select public.prd_facts(${actor}::uuid, ${project}::uuid) as r`);
  return asArray(body.questions).map(record);
}

async function reserve(
  sql: Sql,
  project: string,
  actor: string,
  key: string,
  request: string,
  text: string,
): Promise<Turn> {
  const rev = (await stamp(sql, project)).revision;
  const body = await objectOf(sql`select public.prd_turn_reserve(
    ${actor}::uuid, ${project}::uuid, ${key}, ${request}, ${rev},
    ${JSON.stringify({ kind: "text", text })}::text::jsonb, ${`hash-${request}`}
  ) as r`);
  return {
    turnId: String(body.turnId),
    messageId: String(body.messageId),
    sequence: whole(body.sequence),
  };
}

function issue(sql: Sql, turn: string, mode: "reply" | "answer-write") {
  return sql`select public.prd_grant_issue(${turn}::uuid, ${mode}, ${3600}::integer) as r`;
}

async function grantOf(query: Promise<unknown>): Promise<string> {
  const rows = (await query) as Array<{ r: unknown }>;
  return String(rows[0].r);
}

async function toolList(sql: Sql, grant: string): Promise<string[]> {
  const rows = (await sql`select public.prd_grant_tools(${grant}::uuid) as r`) as Array<{
    r: unknown;
  }>;
  return texts(rows[0].r);
}

function read(sql: Sql, grant: string, key: string) {
  return sql`select public.read_section(${grant}::uuid, ${key}) as r`;
}

function stage(sql: Sql, grant: string, receipt: string, document: unknown) {
  return sql`select public.stage_section(
    ${grant}::uuid, ${receipt}::uuid, ${JSON.stringify(document)}::text::jsonb) as r`;
}

function prepare(sql: Sql, grant: string) {
  return sql`select public.commit_prepare(${grant}::uuid) as r`;
}

async function finish(sql: Sql, turn: string) {
  await sql`select public.prd_turn_finish(${turn}::uuid, 'answered')`;
}

async function turnOps(sql: Sql, turn: string): Promise<number> {
  return counted(
    sql`select count(*)::int as n from public.prd_git_ops
      where turn_id = ${turn}::uuid and kind = 'turn'`,
  );
}

async function toolCommits(sql: Sql, turn: string): Promise<number> {
  return counted(
    sql`select count(*)::int as n from public.prd_tool_commits where turn_id = ${turn}::uuid`,
  );
}

async function questionCount(sql: Sql, project: string): Promise<number> {
  return counted(
    sql`select count(*)::int as n from public.prd_questions where project_id = ${project}::uuid`,
  );
}

async function answerCount(sql: Sql, project: string): Promise<number> {
  return counted(
    sql`select count(*)::int as n from public.prd_answers where project_id = ${project}::uuid`,
  );
}

async function actionCount(sql: Sql, project: string): Promise<number> {
  return counted(
    sql`select count(*)::int as n from public.prd_actions where project_id = ${project}::uuid`,
  );
}

async function versionCount(sql: Sql, project: string): Promise<number> {
  return counted(
    sql`select count(*)::int as n from public.prd_section_versions
      where project_id = ${project}::uuid`,
  );
}

async function opStatus(sql: Sql, op: string): Promise<string> {
  const rows = (await sql`select status from public.prd_git_ops where id = ${op}::uuid`) as Array<{
    status: string;
  }>;
  return rows[0].status;
}

function rendered(section: DbSection, document: SectionDocument, label: string): FileChange {
  const content = renderSection({
    key: section.stable_key,
    title: section.title,
    document,
  });
  const parsed = parseSection(content);
  if (!parsed.ok) throw new Error(parsed.reason);
  return {
    path: section.file_path,
    change: "modified",
    blobSha: madeSha(label),
    file: {
      variant: "readable",
      key: parsed.file.key,
      title: parsed.file.title,
      document: parsed.file.document,
    },
  };
}

async function reconcile(
  sql: Sql,
  project: string,
  head: string,
  commits: unknown[],
): Promise<Record<string, unknown>> {
  const rows = (await sql`select public.prd_reconcile(
    ${project}::uuid, ${head}, ${JSON.stringify(commits)}::text::jsonb) as r`) as Array<{
    r: unknown;
  }>;
  const result = record(rows[0].r);
  if (result.stale !== false) throw new Error("reconcile was stale");
  return result;
}

async function repoEdit(
  sql: Sql,
  project: string,
  head: string,
  changes: unknown[],
  message: string,
  label: string,
): Promise<string> {
  const sha = madeSha(label);
  const result = await reconcile(sql, project, head, [
    { sha, parents: [head], login: "octocat", message, changes },
  ]);
  expect(whole(result.applied)).toBe(1);
  expect(result.head).toBe(sha);
  return sha;
}

function act(
  sql: Sql,
  actor: string,
  project: string,
  kind: string,
  token: string,
  request: string,
) {
  return sql`select public.prd_action(
    ${actor}::uuid, ${project}::uuid, ${kind}, ${token}, ${request}
  ) as r`;
}

function ngoQuestion(text: string): Record<string, unknown> {
  return {
    section: "booking",
    text,
    why: "Only the kitchen can decide this.",
    options: ["12 months", "24 months"],
    blocking: true,
    prerequisites: [],
    anchors: ["Who books shifts"],
  };
}

function fileByKey(files: unknown[], key: string): Record<string, unknown> {
  const found = files.map(record).find((file) => file.key === key);
  if (!found) throw new Error(`missing staged file ${key}`);
  return found;
}

describe.skipIf(!live)("PRD tools on the local stack", () => {
  let stack: Stack;
  let sql: Sql;

  beforeAll(() => {
    stack = stackFromEnv();
    sql = sqlClient(stack);
  });

  afterAll(async () => {
    await sql?.close();
  });

  it("refuses an unknown, revoked, expired, or finished grant, and a tool the mode does not allow", async () => {
    const opened = await world(stack, sql);
    const project = opened.project;
    expect(await refusal(read(sql, crypto.randomUUID(), "booking"))).toBe("unknown-grant");

    const first = await reserve(sql, project, opened.dev, "main", "grant-a", "First turn");
    const grantA = await grantOf(issue(sql, first.turnId, "reply"));
    expect(await toolList(sql, grantA)).toEqual(REPLY_TOOLS);
    expect(await refusal(prepare(sql, grantA))).toBe("nothing-staged");
    expect(
      await refusal(sql`select public.record_outcome(${grantA}::uuid, '{}'::jsonb) as r`),
    ).toBe("tool-denied");

    const grantB = await grantOf(issue(sql, first.turnId, "reply"));
    expect(await refusal(read(sql, grantA, "booking"))).toBe("revoked");
    expect(await refusal(sql`select public.prd_grant_tools(${grantA}::uuid) as r`)).toBe("revoked");
    await sql`update public.prd_grants
      set expires_at = timestamptz '2000-01-01+00'
      where id = ${grantB}::uuid`;
    expect(await refusal(read(sql, grantB, "booking"))).toBe("expired");

    const grantC = await grantOf(issue(sql, first.turnId, "reply"));
    const seen = await objectOf(read(sql, grantC, "booking"));
    expect(seen.key).toBe("booking");
    expect(seen.state).toBe("draft");
    expect(seen.variant).toBe("readable");
    expect(statementText(seen.document)).toEqual(["Volunteers book themselves."]);
    expect(typeof seen.receipt).toBe("string");
    await finish(sql, first.turnId);
    expect(await refusal(read(sql, grantC, "booking"))).toBe("turn-finished");
  });

  it("refuses another chat's receipt, another project's receipt, and a document that is not a section", async () => {
    const opened = await world(stack, sql);
    const project = opened.project;
    const main = await reserve(sql, project, opened.dev, "main", "receipt-main", "Main");
    const topic = await reserve(
      sql,
      project,
      opened.dev,
      "topic:booking",
      "receipt-topic",
      "Topic",
    );
    const mainGrant = await grantOf(issue(sql, main.turnId, "reply"));
    const topicGrant = await grantOf(issue(sql, topic.turnId, "reply"));
    const mainRead = await objectOf(read(sql, mainGrant, "booking"));
    const topicRead = await objectOf(read(sql, topicGrant, "booking"));
    const mainReceipt = String(mainRead.receipt);
    const topicReceipt = String(topicRead.receipt);
    const before = await factSection(sql, opened.dev, project, "booking");

    const empty = { statements: [], decisions: [] };
    expect(await objectOf(stage(sql, mainGrant, mainReceipt, empty))).toEqual({
      staged: "booking",
    });
    expect(await factSection(sql, opened.dev, project, "booking")).toMatchObject({
      state: before.state,
      document: before.document,
    });
    expect(
      await objectOf(
        stage(sql, mainGrant, mainReceipt, {
          statements: [],
          decisions: [],
          technicalScope: {},
        }),
      ),
    ).toEqual({ staged: "booking" });
    expect(await factSection(sql, opened.dev, project, "booking")).toMatchObject({
      document: before.document,
    });
    expect(
      await refusal(
        stage(sql, mainGrant, mainReceipt, { statements: [], decisions: [], note: "extra" }),
      ),
    ).toBe("invalid-document");
    expect(
      await refusal(
        stage(sql, mainGrant, mainReceipt, {
          statements: [{ text: "   ", sources: ["Discovery revision 1"] }],
          decisions: [],
        }),
      ),
    ).toBe("invalid-document");
    expect(
      await refusal(
        stage(sql, mainGrant, mainReceipt, { statements: [], decisions: [], technicalScope: "no" }),
      ),
    ).toBe("invalid-document");
    expect(await factSection(sql, opened.dev, project, "booking")).toMatchObject({
      state: "draft",
      document: before.document,
    });

    expect(await refusal(stage(sql, topicGrant, mainReceipt, empty))).toBe("wrong-receipt");
    expect(await refusal(stage(sql, mainGrant, topicReceipt, empty))).toBe("wrong-receipt");
    const other = await world(stack, sql);
    const otherTurn = await reserve(
      sql,
      other.project,
      other.dev,
      "main",
      "receipt-other",
      "Other",
    );
    const otherGrant = await grantOf(issue(sql, otherTurn.turnId, "reply"));
    expect(await refusal(stage(sql, otherGrant, mainReceipt, empty))).toBe("wrong-receipt");
    expect(await refusal(stage(sql, mainGrant, crypto.randomUUID(), empty))).toBe("wrong-receipt");
  });

  it("lands two staged sections and a Ready proposal in one revision, and only after reconcile", async () => {
    const opened = await world(stack, sql);
    const project = opened.project;
    const rows = await sections(sql, project);
    const turn = await reserve(sql, project, opened.dev, "main", "two-sections", "Write two");
    const grant = await grantOf(issue(sql, turn.turnId, "reply"));
    const bookingRead = await objectOf(read(sql, grant, "booking"));
    const rulesRead = await objectOf(read(sql, grant, "rules"));
    const bookingReceipt = String(bookingRead.receipt);
    const rulesReceipt = String(rulesRead.receipt);
    const first = rendered(
      rows.booking,
      drafted("First booking text."),
      `${project}:booking-first`,
    );
    const second = rendered(
      rows.booking,
      drafted("Second booking text."),
      `${project}:booking-second`,
    );
    const rules = rendered(rows.rules, drafted("A swap needs a coordinator."), `${project}:rules`);
    await objectOf(stage(sql, grant, bookingReceipt, first.file.document));
    await objectOf(stage(sql, grant, bookingReceipt, second.file.document));
    await objectOf(stage(sql, grant, rulesReceipt, rules.file.document));
    expect(await objectOf(sql`select public.propose_ready(${grant}::uuid, 'rules') as r`)).toEqual({
      staged: "ready",
      key: "rules",
    });

    const hidden = await stamp(sql, project);
    expect(hidden.revision).toBe(1);
    expect(hidden.sequence).toBe(turn.sequence);
    expect((await sections(sql, project)).booking.state).toBe("draft");
    expect((await sections(sql, project)).rules.state).toBe("open");
    expect(
      statementText((await factSection(sql, opened.dev, project, "booking")).document),
    ).toEqual(["Volunteers book themselves."]);
    expect(statementText((await factSection(sql, opened.dev, project, "rules")).document)).toEqual(
      [],
    );
    expect(await versionCount(sql, project)).toBe(4);
    expect(await toolCommits(sql, turn.turnId)).toBe(0);

    const prepared = await objectOf(prepare(sql, grant));
    expect(prepared.ok).toBe(true);
    expect(whole(prepared.attempt)).toBe(1);
    expect(prepared.base).toBe(hidden.head);
    const files = asArray(prepared.sections);
    expect(files).toHaveLength(2);
    expect(fileByKey(files, "booking").title).toBe(rows.booking.title);
    expect(fileByKey(files, "booking").path).toBe(rows.booking.file_path);
    expect(statementText(fileByKey(files, "booking").document)).toEqual(["Second booking text."]);
    expect(statementText(fileByKey(files, "rules").document)).toEqual([
      "A swap needs a coordinator.",
    ]);
    const effects = asArray(prepared.effects).map(record);
    expect(effects).toEqual([expect.objectContaining({ kind: "ready", section: "rules" })]);
    const op = String(prepared.op);
    expect(await opStatus(sql, op)).toBe("prepared");
    expect(await refusal(prepare(sql, grant))).toBe("attempt-prepared");
    expect(await stamp(sql, project)).toMatchObject({
      revision: hidden.revision,
      sequence: hidden.sequence,
      head: hidden.head,
    });

    const sha = madeSha(`${project}:two-sections`);
    await sql`select public.prd_git_op_written(${op}::uuid, ${hidden.head}, ${sha})`;
    expect(await opStatus(sql, op)).toBe("written");
    expect(await refusal(prepare(sql, grant))).toBe("attempt-written");
    expect((await sections(sql, project)).booking.state).toBe("draft");
    expect((await sections(sql, project)).rules.state).toBe("open");
    expect(await versionCount(sql, project)).toBe(4);
    expect(await toolCommits(sql, turn.turnId)).toBe(0);

    await sql`select public.prd_git_op_published(${op}::uuid)`;
    expect(await opStatus(sql, op)).toBe("published");
    expect(await refusal(prepare(sql, grant))).toBe("attempt-published");
    expect((await stamp(sql, project)).sequence).toBe(hidden.sequence);

    const landed = await reconcile(sql, project, hidden.head, [
      {
        sha,
        parents: [hidden.head],
        login: "octocat",
        message: "PRD tools",
        changes: [second, rules],
      },
    ]);
    expect(whole(landed.applied)).toBe(1);
    expect(whole(landed.revision)).toBe(2);
    expect(whole(landed.sequence)).toBe(hidden.sequence + 1);
    expect(landed.head).toBe(sha);
    const after = await sections(sql, project);
    expect(after.booking.state).toBe("draft");
    expect(after.rules.state).toBe("ready");
    expect(
      statementText((await factSection(sql, opened.dev, project, "booking")).document),
    ).toEqual(["Second booking text."]);
    expect(statementText((await factSection(sql, opened.dev, project, "rules")).document)).toEqual([
      "A swap needs a coordinator.",
    ]);
    expect(await versionCount(sql, project)).toBe(6);
    const authors = (await sql`select author_kind, author_login, variant
      from public.prd_section_versions
      where project_id = ${project}::uuid and commit_sha = ${sha}`) as Array<{
      author_kind: string;
      author_login: string | null;
      variant: string;
    }>;
    expect(authors).toHaveLength(2);
    for (const author of authors) {
      expect(author).toEqual({ author_kind: "ai", author_login: null, variant: "readable" });
    }
    expect(await toolCommits(sql, turn.turnId)).toBe(1);
    expect(await opStatus(sql, op)).toBe("finalized");
    expect(await refusal(prepare(sql, grant))).toBe("turn-committed");
    expect((await stamp(sql, project)).revision).toBe(2);
  });

  it("refuses the whole commit when a staged section changed, and registers nothing", async () => {
    const opened = await world(stack, sql);
    const project = opened.project;
    const rows = await sections(sql, project);
    const earlier = await reserve(sql, project, opened.dev, "main", "stale-first", "Look first");
    await objectOf(read(sql, await grantOf(issue(sql, earlier.turnId, "reply")), "booking"));
    await finish(sql, earlier.turnId);

    const turn = await reserve(sql, project, opened.dev, "main", "stale-second", "Write both");
    const grant = await grantOf(issue(sql, turn.turnId, "reply"));
    const bookingRead = await objectOf(read(sql, grant, "booking"));
    const rulesRead = await objectOf(read(sql, grant, "rules"));
    const booking = rendered(rows.booking, drafted("Staged booking."), `${project}:stale-booking`);
    const rules = rendered(rows.rules, drafted("Staged rules."), `${project}:stale-rules`);
    await objectOf(stage(sql, grant, String(bookingRead.receipt), booking.file.document));
    await objectOf(stage(sql, grant, String(rulesRead.receipt), rules.file.document));
    const head = (await stamp(sql, project)).head;
    const edited = rendered(
      rows.booking,
      drafted("Repository booking."),
      `${project}:repo-booking`,
    );
    await repoEdit(sql, project, head, [edited], "Edit the PRD", `${project}:stale-edit`);

    const refused = await objectOf(prepare(sql, grant));
    expect(refused.ok).toBe(false);
    expect(refused.reason).toBe("stale");
    const changed = asArray(refused.sections).map(record);
    expect(changed).toHaveLength(1);
    expect(changed[0].key).toBe("booking");
    expect(statementText(changed[0].document)).toEqual(["Repository booking."]);
    expect(await turnOps(sql, turn.turnId)).toBe(0);
    const after = await sections(sql, project);
    expect(after.booking.state).toBe("draft");
    expect(after.rules.state).toBe("open");
    expect(
      statementText((await factSection(sql, opened.dev, project, "booking")).document),
    ).toEqual(["Repository booking."]);
    expect(statementText((await factSection(sql, opened.dev, project, "rules")).document)).toEqual(
      [],
    );
  });

  it("lets two chats commit different sections in turn", async () => {
    const opened = await world(stack, sql);
    const project = opened.project;
    const rows = await sections(sql, project);
    const main = await reserve(sql, project, opened.dev, "main", "split-main", "Booking");
    const topic = await reserve(sql, project, opened.dev, "topic:rules", "split-rules", "Rules");
    const mainGrant = await grantOf(issue(sql, main.turnId, "reply"));
    const topicGrant = await grantOf(issue(sql, topic.turnId, "reply"));
    const mainRead = await objectOf(read(sql, mainGrant, "booking"));
    const topicRead = await objectOf(read(sql, topicGrant, "rules"));
    const booking = rendered(
      rows.booking,
      drafted("Booked in the main chat."),
      `${project}:split-booking`,
    );
    const rules = rendered(
      rows.rules,
      drafted("Ruled in the section chat."),
      `${project}:split-rules`,
    );
    await objectOf(stage(sql, mainGrant, String(mainRead.receipt), booking.file.document));
    await objectOf(stage(sql, topicGrant, String(topicRead.receipt), rules.file.document));

    const firstPrepared = await objectOf(prepare(sql, mainGrant));
    expect(firstPrepared.ok).toBe(true);
    const firstHead = String(firstPrepared.base);
    const firstSha = madeSha(`${project}:split-first`);
    await sql`select public.prd_git_op_written(${String(firstPrepared.op)}::uuid, ${firstHead}, ${firstSha})`;
    const firstBefore = await stamp(sql, project);
    const first = await reconcile(sql, project, firstHead, [
      {
        sha: firstSha,
        parents: [firstHead],
        login: null,
        message: "PRD tools",
        changes: [booking],
      },
    ]);
    expect(whole(first.revision)).toBe(2);
    expect(whole(first.sequence)).toBe(firstBefore.sequence + 1);

    const secondPrepared = await objectOf(prepare(sql, topicGrant));
    expect(secondPrepared.ok).toBe(true);
    expect(secondPrepared.base).toBe(firstSha);
    const secondSha = madeSha(`${project}:split-second`);
    await sql`select public.prd_git_op_written(
      ${String(secondPrepared.op)}::uuid, ${firstSha}, ${secondSha})`;
    const beforeSecond = await stamp(sql, project);
    const second = await reconcile(sql, project, firstSha, [
      { sha: secondSha, parents: [firstSha], login: null, message: "PRD tools", changes: [rules] },
    ]);
    expect(whole(second.revision)).toBe(3);
    expect(whole(second.sequence)).toBe(beforeSecond.sequence + 1);
    expect(
      statementText((await factSection(sql, opened.dev, project, "booking")).document),
    ).toEqual(["Booked in the main chat."]);
    expect(statementText((await factSection(sql, opened.dev, project, "rules")).document)).toEqual([
      "Ruled in the section chat.",
    ]);
    expect(await toolCommits(sql, main.turnId)).toBe(1);
    expect(await toolCommits(sql, topic.turnId)).toBe(1);
  });

  it("refuses the later chat that staged the same section", async () => {
    const opened = await world(stack, sql);
    const project = opened.project;
    const rows = await sections(sql, project);
    const main = await reserve(sql, project, opened.dev, "main", "race-main", "Main booking");
    const topic = await reserve(
      sql,
      project,
      opened.dev,
      "topic:booking",
      "race-topic",
      "Topic booking",
    );
    const mainGrant = await grantOf(issue(sql, main.turnId, "reply"));
    const topicGrant = await grantOf(issue(sql, topic.turnId, "reply"));
    const mainRead = await objectOf(read(sql, mainGrant, "booking"));
    const topicRead = await objectOf(read(sql, topicGrant, "booking"));
    const winner = rendered(rows.booking, drafted("The first chat won."), `${project}:race-win`);
    const loser = rendered(rows.booking, drafted("The second chat lost."), `${project}:race-lose`);
    await objectOf(stage(sql, mainGrant, String(mainRead.receipt), winner.file.document));
    await objectOf(stage(sql, topicGrant, String(topicRead.receipt), loser.file.document));
    const prepared = await objectOf(prepare(sql, mainGrant));
    const head = String(prepared.base);
    const sha = madeSha(`${project}:race-land`);
    await sql`select public.prd_git_op_written(${String(prepared.op)}::uuid, ${head}, ${sha})`;
    await reconcile(sql, project, head, [
      { sha, parents: [head], login: null, message: "PRD tools", changes: [winner] },
    ]);

    const refused = await objectOf(prepare(sql, topicGrant));
    expect(refused.ok).toBe(false);
    expect(refused.reason).toBe("stale");
    const changed = asArray(refused.sections).map(record);
    expect(changed).toHaveLength(1);
    expect(statementText(changed[0].document)).toEqual(["The first chat won."]);
    expect(await turnOps(sql, topic.turnId)).toBe(0);
    expect(
      statementText((await factSection(sql, opened.dev, project, "booking")).document),
    ).toEqual(["The first chat won."]);
  });

  it("confirms and reopens by role, and sends a confirmed dependent to Needs review", async () => {
    const opened = await world(stack, sql);
    const project = opened.project;
    const opening = await sections(sql, project);
    const openedStamp = await stamp(sql, project);
    expect(openedStamp).toMatchObject({ state: "open", revision: 1, sequence: 1, closed: null });
    expect(Object.values(requiredFlags(opening)).filter(Boolean)).toHaveLength(3);
    expect(opening.booking.state).toBe("draft");
    expect(opening.rules.state).toBe("open");
    expect(opening.usersToday.state).toBe("draft");
    expect(opening["technical-scope"].state).toBe("open");
    expect(opening.usersToday.required).toBe(false);

    const beforeRoles = await stamp(sql, project);
    const beforeActions = await actionCount(sql, project);
    for (const kind of ["confirm-topic", "reopen-topic"] as const) {
      const token = `${kind}|topic:booking|1|0`;
      expect(await refusal(act(sql, opened.ngo, project, kind, token, `ngo-${kind}`))).toBe(
        "forbidden",
      );
      expect(
        await refusal(act(sql, opened.stranger, project, kind, token, `stranger-${kind}`)),
      ).toBe("forbidden");
    }
    expect(
      await refusal(
        act(
          sql,
          opened.dev,
          project,
          "confirm-topic",
          "confirm-topic|topic:booking|1|0",
          "early-confirm",
        ),
      ),
    ).toBe("not-ready");
    expect(
      await refusal(
        act(
          sql,
          opened.dev,
          project,
          "reopen-topic",
          "reopen-topic|topic:booking|1|0",
          "early-reopen",
        ),
      ),
    ).toBe("not-confirmed");
    expect(
      await refusal(
        act(
          sql,
          opened.dev,
          project,
          "confirm-topic",
          "confirm-topic|topic:booking|999|0",
          "early-stale",
        ),
      ),
    ).toBe("stale");
    expect(
      await refusal(
        act(sql, opened.dev, project, "close", "close|topic:booking|1|0", "early-close"),
      ),
    ).toBe("not-yet");
    expect(await stamp(sql, project)).toEqual(beforeRoles);
    expect(await actionCount(sql, project)).toBe(beforeActions);
    const draftFacts = await factSection(sql, opened.dev, project, "booking");
    expect(draftFacts.confirm).toEqual({ allowed: false, reason: "not-ready", token: null });
    expect(draftFacts.reopen).toEqual({ allowed: false, reason: "not-confirmed", token: null });
    const ngoFacts = await factSection(sql, opened.ngo, project, "booking");
    expect(ngoFacts.confirm).toEqual({ allowed: false, reason: "forbidden", token: null });
    expect(ngoFacts.reopen).toEqual({ allowed: false, reason: "forbidden", token: null });

    const rulesTurn = await reserve(sql, project, opened.dev, "main", "ready-rules", "Ready rules");
    const rulesGrant = await grantOf(issue(sql, rulesTurn.turnId, "reply"));
    await objectOf(sql`select public.propose_ready(${rulesGrant}::uuid, 'rules') as r`);
    const rulesPrepared = await objectOf(prepare(sql, rulesGrant));
    expect(asArray(rulesPrepared.sections)).toEqual([]);
    const rulesBefore = await stamp(sql, project);
    const rulesSha = madeSha(`${project}:ready-rules`);
    await sql`select public.prd_git_op_written(
      ${String(rulesPrepared.op)}::uuid, ${String(rulesPrepared.base)}, ${rulesSha})`;
    const rulesLanded = await reconcile(sql, project, String(rulesPrepared.base), [
      {
        sha: rulesSha,
        parents: [String(rulesPrepared.base)],
        login: null,
        message: "PRD tools",
        changes: [],
      },
    ]);
    expect(whole(rulesLanded.revision)).toBe(rulesBefore.revision);
    expect(whole(rulesLanded.sequence)).toBe(rulesBefore.sequence + 1);
    expect((await sections(sql, project)).rules.state).toBe("ready");
    await finish(sql, rulesTurn.turnId);
    const rulesBlocked = await stamp(sql, project);
    expect(
      await refusal(
        act(
          sql,
          opened.dev,
          project,
          "confirm-topic",
          `confirm-topic|topic:rules|${rulesBlocked.revision}|0`,
          "rules-too-soon",
        ),
      ),
    ).toBe("not-ready");
    expect((await sections(sql, project)).rules.state).toBe("ready");
    expect(await factSection(sql, opened.dev, project, "rules")).toMatchObject({
      confirm: { allowed: false, reason: "not-ready", token: null },
    });
    expect((await stamp(sql, project)).sequence).toBe(rulesBlocked.sequence);

    const rows = await sections(sql, project);
    const bookingTurn = await reserve(
      sql,
      project,
      opened.dev,
      "main",
      "ready-booking",
      "Ready booking",
    );
    const bookingGrant = await grantOf(issue(sql, bookingTurn.turnId, "reply"));
    const bookingRead = await objectOf(read(sql, bookingGrant, "booking"));
    const booking = rendered(
      rows.booking,
      drafted("Volunteers book in the app."),
      `${project}:confirm-booking`,
    );
    await objectOf(stage(sql, bookingGrant, String(bookingRead.receipt), booking.file.document));
    await objectOf(sql`select public.propose_ready(${bookingGrant}::uuid, 'booking') as r`);
    const bookingPrepared = await objectOf(prepare(sql, bookingGrant));
    const bookingBefore = await stamp(sql, project);
    const bookingSha = madeSha(`${project}:confirm-booking`);
    await sql`select public.prd_git_op_written(
      ${String(bookingPrepared.op)}::uuid, ${String(bookingPrepared.base)}, ${bookingSha})`;
    const bookingLanded = await reconcile(sql, project, String(bookingPrepared.base), [
      {
        sha: bookingSha,
        parents: [String(bookingPrepared.base)],
        login: null,
        message: "PRD tools",
        changes: [booking],
      },
    ]);
    expect(whole(bookingLanded.revision)).toBe(bookingBefore.revision + 1);
    expect(whole(bookingLanded.sequence)).toBe(bookingBefore.sequence + 1);
    expect((await sections(sql, project)).booking.state).toBe("ready");
    await finish(sql, bookingTurn.turnId);

    const readyBooking = await factSection(sql, opened.dev, project, "booking");
    const confirmToken = String(record(readyBooking.confirm).token);
    expect(confirmToken).toBe(
      `confirm-topic|topic:booking|${(await stamp(sql, project)).revision}|0`,
    );
    expect(record(readyBooking.confirm).allowed).toBe(true);
    const confirmBefore = await stamp(sql, project);
    expect(
      await refusal(
        act(sql, opened.ngo, project, "confirm-topic", confirmToken, "ngo-confirm-ready"),
      ),
    ).toBe("forbidden");
    expect(
      await refusal(
        act(
          sql,
          opened.dev,
          project,
          "confirm-topic",
          "confirm-topic|topic:booking|999|0",
          "stale-confirm",
        ),
      ),
    ).toBe("stale");
    expect((await stamp(sql, project)).sequence).toBe(confirmBefore.sequence);
    const confirmed = await objectOf(
      act(sql, opened.dev, project, "confirm-topic", confirmToken, "confirm-booking"),
    );
    const confirmAfter = await stamp(sql, project);
    expect(confirmAfter.revision).toBe(confirmBefore.revision);
    expect(confirmAfter.sequence).toBe(confirmBefore.sequence + 1);
    expect(confirmed.state).toBe("confirmed");
    const confirmedBooking = (await sections(sql, project)).booking;
    expect(confirmedBooking.state).toBe("confirmed");
    expect(confirmedBooking.confirmed_version).toBeTruthy();
    const manifest = (await sql`select rev.manifest->>'booking' as version
      from public.prd_revisions rev
      join public.prd_records rec
        on rec.project_id = rev.project_id and rec.current_revision = rev.revision
      where rev.project_id = ${project}::uuid`) as Array<{ version: string }>;
    expect(confirmedBooking.confirmed_version).toBe(manifest[0].version);
    const replay = await objectOf(
      act(sql, opened.dev, project, "confirm-topic", confirmToken, "confirm-booking"),
    );
    expect(replay).toEqual(confirmed);
    expect((await stamp(sql, project)).sequence).toBe(confirmAfter.sequence);
    expect(await actionCount(sql, project)).toBe(beforeActions + 1);

    const rulesToken = String(
      record((await factSection(sql, opened.dev, project, "rules")).confirm).token,
    );
    expect(rulesToken).toBe(`confirm-topic|topic:rules|${confirmAfter.revision}|0`);
    const rulesConfirmBefore = await stamp(sql, project);
    await objectOf(act(sql, opened.dev, project, "confirm-topic", rulesToken, "confirm-rules"));
    expect((await sections(sql, project)).rules.state).toBe("confirmed");
    expect((await stamp(sql, project)).revision).toBe(rulesConfirmBefore.revision);
    expect((await stamp(sql, project)).sequence).toBe(rulesConfirmBefore.sequence + 1);

    const current = await sections(sql, project);
    const usersTurn = await reserve(sql, project, opened.dev, "main", "ready-users", "Ready users");
    const usersGrant = await grantOf(issue(sql, usersTurn.turnId, "reply"));
    const usersRead = await objectOf(read(sql, usersGrant, "usersToday"));
    const users = rendered(
      current.usersToday,
      drafted("Coordinators use the app."),
      `${project}:confirm-users`,
    );
    await objectOf(stage(sql, usersGrant, String(usersRead.receipt), users.file.document));
    await objectOf(sql`select public.propose_ready(${usersGrant}::uuid, 'usersToday') as r`);
    const usersPrepared = await objectOf(prepare(sql, usersGrant));
    const usersBefore = await stamp(sql, project);
    const usersSha = madeSha(`${project}:confirm-users`);
    await sql`select public.prd_git_op_written(
      ${String(usersPrepared.op)}::uuid, ${String(usersPrepared.base)}, ${usersSha})`;
    const usersLanded = await reconcile(sql, project, String(usersPrepared.base), [
      {
        sha: usersSha,
        parents: [String(usersPrepared.base)],
        login: null,
        message: "PRD tools",
        changes: [users],
      },
    ]);
    expect(whole(usersLanded.revision)).toBe(usersBefore.revision + 1);
    expect(whole(usersLanded.sequence)).toBe(usersBefore.sequence + 1);
    await finish(sql, usersTurn.turnId);
    const usersToken = String(
      record((await factSection(sql, opened.dev, project, "usersToday")).confirm).token,
    );
    const usersConfirmBefore = await stamp(sql, project);
    await objectOf(act(sql, opened.dev, project, "confirm-topic", usersToken, "confirm-users"));
    const confirmedUsers = (await sections(sql, project)).usersToday;
    expect(confirmedUsers.state).toBe("confirmed");
    expect(confirmedUsers.confirmed_version).toBeTruthy();
    expect((await stamp(sql, project)).revision).toBe(usersConfirmBefore.revision);
    const recordedUsers = confirmedUsers.confirmed_version;

    const rewriteRows = await sections(sql, project);
    const rewriteTurn = await reserve(
      sql,
      project,
      opened.dev,
      "main",
      "rewrite-booking",
      "Rewrite",
    );
    const rewriteGrant = await grantOf(issue(sql, rewriteTurn.turnId, "reply"));
    const rewriteRead = await objectOf(read(sql, rewriteGrant, "booking"));
    const rewrite = rendered(
      rewriteRows.booking,
      drafted("Volunteers book themselves, then a coordinator checks."),
      `${project}:rewrite-booking`,
    );
    await objectOf(stage(sql, rewriteGrant, String(rewriteRead.receipt), rewrite.file.document));
    const rewritePrepared = await objectOf(prepare(sql, rewriteGrant));
    const rewriteBefore = await stamp(sql, project);
    const rewriteSha = madeSha(`${project}:rewrite-booking`);
    await sql`select public.prd_git_op_written(
      ${String(rewritePrepared.op)}::uuid, ${String(rewritePrepared.base)}, ${rewriteSha})`;
    const rewriteLanded = await reconcile(sql, project, String(rewritePrepared.base), [
      {
        sha: rewriteSha,
        parents: [String(rewritePrepared.base)],
        login: null,
        message: "PRD tools",
        changes: [rewrite],
      },
    ]);
    expect(whole(rewriteLanded.revision)).toBe(rewriteBefore.revision + 1);
    expect(whole(rewriteLanded.sequence)).toBe(rewriteBefore.sequence + 1);
    const cascaded = await sections(sql, project);
    expect(cascaded.booking.state).toBe("draft");
    expect(cascaded.booking.confirmed_version).toBe(confirmedBooking.confirmed_version);
    expect(cascaded.rules.state).toBe("needs-review");
    expect(cascaded.rules.changed_since_confirmed).toBe(
      "the section it depends on changed: booking",
    );
    expect(cascaded.usersToday.state).toBe("confirmed");
    expect(cascaded.usersToday.changed_since_confirmed).toBeNull();
    expect(cascaded["technical-scope"].state).toBe("open");
    expect(requiredFlags(cascaded)).toEqual(requiredFlags(opening));
    expect((await stamp(sql, project)).state).toBe("open");
    expect((await stamp(sql, project)).closed).toBeNull();
    await finish(sql, rewriteTurn.turnId);

    const reopenToken = String(
      record((await factSection(sql, opened.dev, project, "usersToday")).reopen).token,
    );
    const reopenBefore = await stamp(sql, project);
    expect(reopenToken).toBe(`reopen-topic|topic:usersToday|${reopenBefore.revision}|0`);
    expect(
      await refusal(act(sql, opened.ngo, project, "reopen-topic", reopenToken, "ngo-reopen")),
    ).toBe("forbidden");
    const reopened = await objectOf(
      act(sql, opened.dev, project, "reopen-topic", reopenToken, "reopen-users"),
    );
    expect(reopened.state).toBe("needs-review");
    const reopenedUsers = (await sections(sql, project)).usersToday;
    expect(reopenedUsers.state).toBe("needs-review");
    expect(reopenedUsers.changed_since_confirmed).toBe("the developer reopened it");
    expect(reopenedUsers.confirmed_version).toBe(recordedUsers);
    const reopenAfter = await stamp(sql, project);
    expect(reopenAfter.revision).toBe(reopenBefore.revision);
    expect(reopenAfter.sequence).toBe(reopenBefore.sequence + 1);
    expect(reopenAfter.state).toBe("open");
    expect(reopenAfter.closed).toBeNull();
    expect(requiredFlags(await sections(sql, project))).toEqual(requiredFlags(opening));
    expect(reopenAfter.revision).toBe(4);
  });

  it("applies no staged effect for a repository edit that copies a turn trailer", async () => {
    const opened = await world(stack, sql);
    const project = opened.project;
    const rows = await sections(sql, project);
    const turn = await reserve(
      sql,
      project,
      opened.dev,
      "main",
      "trailer",
      "Stage a ready section",
    );
    const grant = await grantOf(issue(sql, turn.turnId, "reply"));
    const bookingRead = await objectOf(read(sql, grant, "booking"));
    const staged = rendered(
      rows.booking,
      drafted("Staged but not committed."),
      `${project}:trailer-staged`,
    );
    await objectOf(stage(sql, grant, String(bookingRead.receipt), staged.file.document));
    await objectOf(sql`select public.propose_ready(${grant}::uuid, 'booking') as r`);
    expect(
      await refusal(
        sql`select public.suggest_ngo_question(${grant}::uuid, '{"section":"booking"}'::jsonb) as r`,
      ),
    ).toBe("invalid-request");
    await objectOf(
      sql`select public.suggest_ngo_question(${grant}::uuid,
        ${JSON.stringify(ngoQuestion("How long are shifts kept?"))}::text::jsonb) as r`,
    );
    expect(await questionCount(sql, project)).toBe(0);
    const head = (await stamp(sql, project)).head;
    const edited = rendered(
      rows.booking,
      drafted("Edited in the repository."),
      `${project}:trailer-edit`,
    );
    const trailer = await repoEdit(
      sql,
      project,
      head,
      [edited],
      `PRD-Turn: ${turn.turnId}`,
      `${project}:trailer-sha`,
    );
    expect((await sections(sql, project)).booking.state).toBe("draft");
    expect(
      statementText((await factSection(sql, opened.dev, project, "booking")).document),
    ).toEqual(["Edited in the repository."]);
    expect(await questionCount(sql, project)).toBe(0);
    expect(await toolCommits(sql, turn.turnId)).toBe(0);
    expect(await turnOps(sql, turn.turnId)).toBe(0);

    const raw = "not a section";
    const unreadable = parseSection(raw);
    if (unreadable.ok) throw new Error("expected the raw text to fail parsing");
    const damaged = await sections(sql, project);
    await repoEdit(
      sql,
      project,
      trailer,
      [
        { path: damaged.usersToday.file_path, change: "removed" },
        {
          path: damaged.rules.file_path,
          change: "modified",
          blobSha: madeSha(`${project}:trailer-raw`),
          file: { variant: "unreadable", raw, error: unreadable.reason },
        },
      ],
      "Damage two files",
      `${project}:trailer-damage`,
    );
    const missing = await objectOf(read(sql, grant, "usersToday"));
    expect(missing.variant).toBe("missing");
    expect(missing.document).toBeNull();
    expect(missing.raw).toBeNull();
    expect(missing.parseError).toBeNull();
    const broken = await objectOf(read(sql, grant, "rules"));
    expect(broken.variant).toBe("unreadable");
    expect(broken.document).toBeNull();
    expect(broken.raw).toBe(raw);
    expect(broken.parseError).toBe(unreadable.reason);

    const refused = await objectOf(prepare(sql, grant));
    expect(refused.ok).toBe(false);
    expect(refused.reason).toBe("stale");
    const changed = asArray(refused.sections).map(record);
    expect(changed).toHaveLength(1);
    expect(changed[0].key).toBe("booking");
    expect(statementText(changed[0].document)).toEqual(["Edited in the repository."]);
    expect(await turnOps(sql, turn.turnId)).toBe(0);
    expect(await questionCount(sql, project)).toBe(0);
    expect((await sections(sql, project)).booking.state).toBe("draft");
  });

  it("records a side-chat outcome only when its commit is reconciled", async () => {
    const opened = await world(stack, sql);
    const project = opened.project;
    const reply = await reserve(sql, project, opened.dev, "main", "suggest", "Suggest a question");
    const replyGrant = await grantOf(issue(sql, reply.turnId, "reply"));
    expect(await toolList(sql, replyGrant)).toEqual(REPLY_TOOLS);
    const question = ngoQuestion("How long are shifts kept?");
    await objectOf(
      sql`select public.suggest_ngo_question(${replyGrant}::uuid,
        ${JSON.stringify(question)}::text::jsonb) as r`,
    );
    expect(await questionCount(sql, project)).toBe(0);
    const prepared = await objectOf(prepare(sql, replyGrant));
    expect(prepared.ok).toBe(true);
    expect(asArray(prepared.sections)).toEqual([]);
    const before = await stamp(sql, project);
    expect(before.sequence).toBe(reply.sequence);
    const sha = madeSha(`${project}:suggest`);
    await sql`select public.prd_git_op_written(${String(prepared.op)}::uuid, ${String(prepared.base)}, ${sha})`;
    const landed = await reconcile(sql, project, String(prepared.base), [
      { sha, parents: [String(prepared.base)], login: null, message: "PRD tools", changes: [] },
    ]);
    expect(whole(landed.revision)).toBe(before.revision);
    expect(whole(landed.sequence)).toBe(before.sequence + 1);
    const suggested = await questionRows(sql, opened.dev, project);
    expect(suggested).toHaveLength(1);
    expect(suggested[0].status).toBe("suggested");
    expect(suggested[0].introMessage).toBe(reply.messageId);
    const questionId = String(suggested[0].id);
    await finish(sql, reply.turnId);

    const postToken = String(record(suggested[0].post).token);
    await objectOf(act(sql, opened.dev, project, "post-question", postToken, "post-shifts"));
    const posted = await questionRows(sql, opened.dev, project);
    expect(posted[0].status).toBe("posted");
    const side = await reserve(
      sql,
      project,
      opened.ngo,
      `side:${questionId}`,
      "ngo-answer",
      "We keep them for 12 months.",
    );
    await finish(sql, side.turnId);
    const answering = await questionRows(sql, opened.ngo, project);
    expect(answering[0].status).toBe("answering");
    const completeToken = String(record(answering[0].complete).token);
    expect(completeToken.startsWith(`complete-answer|question:${questionId}|`)).toBe(true);
    const admitted = await objectOf(
      act(sql, opened.ngo, project, "complete-answer", completeToken, "complete-shifts"),
    );
    const answerTurn = String(admitted.turnId);
    expect(
      (
        (await sql`select kind, state from public.prd_turns where id = ${answerTurn}::uuid`) as Array<{
          kind: string;
          state: string;
        }>
      )[0],
    ).toEqual({ kind: "answer-write", state: "admitted" });
    expect((await questionRows(sql, opened.dev, project))[0].status).toBe("answering");

    const appended = await objectOf(sql`select public.prd_append_message(${project}::uuid,
      ${`side:${questionId}`}, 'ai', 'ai4good AI',
      '[{"type":"text","text":"The settled answer"}]'::jsonb) as r`);
    const answerGrant = await grantOf(issue(sql, answerTurn, "answer-write"));
    expect(await toolList(sql, answerGrant)).toEqual(ANSWER_TOOLS);
    expect(await refusal(read(sql, answerGrant, "booking"))).toBe("tool-denied");
    expect(
      await refusal(
        sql`select public.record_outcome(${answerGrant}::uuid, '{"kind":"final-answer"}'::jsonb) as r`,
      ),
    ).toBe("invalid-request");
    expect(await answerCount(sql, project)).toBe(0);
    const outcome = {
      kind: "final-answer",
      message: String(appended.id),
      answer: "Shifts are kept for 12 months.",
    };
    expect(
      await objectOf(
        sql`select public.record_outcome(${answerGrant}::uuid,
          ${JSON.stringify(outcome)}::text::jsonb) as r`,
      ),
    ).toEqual({ staged: "outcome" });
    expect((await questionRows(sql, opened.dev, project))[0].status).toBe("answering");
    expect(await answerCount(sql, project)).toBe(0);
    const outcomePrepared = await objectOf(prepare(sql, answerGrant));
    expect(outcomePrepared.ok).toBe(true);
    expect((await questionRows(sql, opened.dev, project))[0].status).toBe("answering");
    const outcomeBefore = await stamp(sql, project);
    const outcomeSha = madeSha(`${project}:outcome`);
    await sql`select public.prd_git_op_written(
      ${String(outcomePrepared.op)}::uuid, ${String(outcomePrepared.base)}, ${outcomeSha})`;
    const outcomeLanded = await reconcile(sql, project, String(outcomePrepared.base), [
      {
        sha: outcomeSha,
        parents: [String(outcomePrepared.base)],
        login: null,
        message: "PRD tools",
        changes: [],
      },
    ]);
    expect(whole(outcomeLanded.revision)).toBe(outcomeBefore.revision);
    expect(whole(outcomeLanded.sequence)).toBe(outcomeBefore.sequence + 1);
    expect(outcomeBefore.revision).toBe(1);
    const completed = await questionRows(sql, opened.dev, project);
    expect(completed[0].status).toBe("complete");
    expect(completed[0].answer).toBe("Shifts are kept for 12 months.");
    expect(await answerCount(sql, project)).toBe(1);
    const bodies = (await sql`select body from public.prd_answers
      where project_id = ${project}::uuid`) as Array<{ body: string }>;
    expect(bodies.map((row) => row.body)).toEqual(["Shifts are kept for 12 months."]);
    expect(await toolCommits(sql, answerTurn)).toBe(1);
    expect(await toolCommits(sql, reply.turnId)).toBe(1);

    const replay = await reserve(sql, project, opened.dev, "main", "replay", "Replay the answer");
    const replayGrant = await grantOf(issue(sql, replay.turnId, "reply"));
    await objectOf(
      sql`select public.suggest_ngo_question(${replayGrant}::uuid,
        ${JSON.stringify(ngoQuestion("Who approves a shift swap?"))}::text::jsonb) as r`,
    );
    const replayPrepared = await objectOf(prepare(sql, replayGrant));
    await sql`update public.prd_git_ops
      set effects = effects || ${JSON.stringify([
        {
          kind: "outcome",
          section: null,
          payload: { kind: "follow-up-resolved", message: String(appended.id) },
        },
      ])}::text::jsonb
      where id = ${String(replayPrepared.op)}::uuid`;
    await finish(sql, answerTurn);
    await sql`update public.prd_turns set chat_id = (
        select id from public.prd_chats where project_id = ${project}::uuid and question_id = ${questionId}::uuid
      ) where id = ${replay.turnId}::uuid`;
    const replaySha = madeSha(`${project}:replay`);
    await sql`select public.prd_git_op_written(
      ${String(replayPrepared.op)}::uuid, ${String(replayPrepared.base)}, ${replaySha})`;
    const replayed = await reconcile(sql, project, String(replayPrepared.base), [
      { sha: replaySha, parents: [String(replayPrepared.base)], login: null, message: "PRD tools", changes: [] },
    ]);
    expect(String(replayed.head)).toBe(replaySha);
    expect(await answerCount(sql, project)).toBe(1);
    expect(await questionCount(sql, project)).toBe(2);
    expect(await toolCommits(sql, replay.turnId)).toBe(1);
  });

  it("fails a prepared attempt and prepares the turn again", async () => {
    const opened = await world(stack, sql);
    const project = opened.project;
    const rows = await sections(sql, project);
    const turn = await reserve(sql, project, opened.dev, "main", "fail-prepared", "Try again");
    const grant = await grantOf(issue(sql, turn.turnId, "reply"));
    const claims = await objectOf(sql`select public.prd_grant_claims(${grant}::uuid) as r`);
    const chats = (await sql`select chat_id from public.prd_turns where id = ${turn.turnId}::uuid`) as Array<{
      chat_id: string;
    }>;
    const repos = (await sql`select repo_name from public.prd_records where project_id = ${project}::uuid`) as Array<{
      repo_name: string;
    }>;
    expect(String(claims.grant)).toBe(grant);
    expect(String(claims.project)).toBe(project);
    expect(String(claims.chat)).toBe(String(chats[0].chat_id));
    expect(String(claims.turn)).toBe(turn.turnId);
    expect(Number.isFinite(Date.parse(String(claims.expiresAt)))).toBe(true);
    const readBooking = await objectOf(read(sql, grant, "booking"));
    await objectOf(stage(sql, grant, String(readBooking.receipt), drafted("Prepared, then dropped.")));
    const prepared = await objectOf(prepare(sql, grant));
    expect(prepared.turn).toBe(turn.turnId);
    expect(prepared.repo).toBe(repos[0].repo_name);
    const blocked = await refused(prepare(sql, grant));
    expect(blocked.detail).toBe("attempt-prepared");
    expect(blocked.hint).toMatchObject({
      op: prepared.op,
      status: "prepared",
      turn: turn.turnId,
      repo: repos[0].repo_name,
      sha: null,
    });
    await sql`select public.prd_git_op_fail(${String(prepared.op)}::uuid)`;
    expect(await opStatus(sql, String(prepared.op))).toBe("failed");
    const again = await objectOf(prepare(sql, grant));
    expect(again.ok).toBe(true);
    expect(whole(again.attempt)).toBe(2);
    expect(again.op).not.toBe(prepared.op);
    expect(again.turn).toBe(turn.turnId);
    expect((await sections(sql, project)).booking.state).toBe(rows.booking.state);
  });

  it("fails a written attempt and imports that sha as a repository edit", async () => {
    const opened = await world(stack, sql);
    const project = opened.project;
    const rows = await sections(sql, project);
    const turn = await reserve(sql, project, opened.dev, "main", "fail-written", "Write then lose it");
    const grant = await grantOf(issue(sql, turn.turnId, "reply"));
    const readBooking = await objectOf(read(sql, grant, "booking"));
    const staged = rendered(rows.booking, drafted("Staged, then abandoned."), `${project}:fail-written`);
    await objectOf(stage(sql, grant, String(readBooking.receipt), staged.file.document));
    await objectOf(sql`select public.propose_ready(${grant}::uuid, 'booking') as r`);
    const prepared = await objectOf(prepare(sql, grant));
    expect(asArray(prepared.effects).map(record)).toEqual([
      expect.objectContaining({ kind: "ready", section: "booking" }),
    ]);
    const sha = madeSha(`${project}:fail-written-sha`);
    await sql`select public.prd_git_op_written(${String(prepared.op)}::uuid, ${String(prepared.base)}, ${sha})`;
    const blocked = await refused(prepare(sql, grant));
    expect(blocked.detail).toBe("attempt-written");
    expect(blocked.hint).toMatchObject({ op: prepared.op, status: "written", sha, turn: turn.turnId });
    await sql`select public.prd_git_op_fail(${String(prepared.op)}::uuid)`;
    expect(await opStatus(sql, String(prepared.op))).toBe("failed");
    const imported = await reconcile(sql, project, String(prepared.base), [
      { sha, parents: [String(prepared.base)], login: "octocat", message: `PRD-Turn: ${turn.turnId}`, changes: [staged] },
    ]);
    expect(imported.head).toBe(sha);
    expect((await sections(sql, project)).booking.state).toBe("draft");
    expect(statementText((await factSection(sql, opened.dev, project, "booking")).document)).toEqual([
      "Staged, then abandoned.",
    ]);
    const authors = (await sql`select author_kind from public.prd_section_versions
      where project_id = ${project}::uuid and commit_sha = ${sha}`) as Array<{ author_kind: string }>;
    expect(authors).toEqual([{ author_kind: "repository" }]);
    expect(await toolCommits(sql, turn.turnId)).toBe(0);
    expect(await opStatus(sql, String(prepared.op))).toBe("failed");
  });

  it("refuses to fail a finalized attempt", async () => {
    const opened = await world(stack, sql);
    const project = opened.project;
    const rows = await sections(sql, project);
    const turn = await reserve(sql, project, opened.dev, "main", "fail-final", "Land it");
    const grant = await grantOf(issue(sql, turn.turnId, "reply"));
    const readBooking = await objectOf(read(sql, grant, "booking"));
    const staged = rendered(rows.booking, drafted("Landed booking."), `${project}:fail-final`);
    await objectOf(stage(sql, grant, String(readBooking.receipt), staged.file.document));
    await objectOf(sql`select public.propose_ready(${grant}::uuid, 'booking') as r`);
    const prepared = await objectOf(prepare(sql, grant));
    const sha = madeSha(`${project}:fail-final-sha`);
    await sql`select public.prd_git_op_written(${String(prepared.op)}::uuid, ${String(prepared.base)}, ${sha})`;
    await reconcile(sql, project, String(prepared.base), [
      { sha, parents: [String(prepared.base)], login: null, message: "PRD tools", changes: [staged] },
    ]);
    expect(await opStatus(sql, String(prepared.op))).toBe("finalized");
    expect((await sections(sql, project)).booking.state).toBe("ready");
    expect(await refusal(sql`select public.prd_git_op_fail(${String(prepared.op)}::uuid)`)).toBe("invalid-request");
    expect(await opStatus(sql, String(prepared.op))).toBe("finalized");
    const blocked = await refused(prepare(sql, grant));
    expect(blocked.detail).toBe("turn-committed");
    expect(blocked.hint).toMatchObject({ sha, turn: turn.turnId, status: "finalized" });
  });
});
