import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { expect } from "vitest";
import { AtPending } from "../../harness/registry.ts";
import { loadGithubTest } from "../../harness/github.ts";
import {
  authPost,
  functionPost,
  functionPostRaw,
  sqlClient,
  stackFromEnv,
  type Stack,
} from "../../harness/live-stack.ts";
import { parsePrdSnapshot, type PrdSnapshot } from "../../../../src/lib/prd-stream.ts";
import type { GithubRepo } from "../../../../supabase/functions/_shared/github/repo.ts";
import { parseSection, renderSection, sectionPath } from "../../../../supabase/functions/_shared/prd/file.ts";
import {
  OPEN_STEPS,
  parseOpenOperation,
  publishOpen,
} from "../../../../supabase/functions/_shared/prd/git.ts";
import { renderPrdFacts } from "../../../../supabase/functions/_shared/prd/routes.ts";
import type { Scope } from "../../../../supabase/functions/_shared/scope.ts";

const PASSWORD = "correct horse battery staple";
const DEV_NAME = "Priya Shah";
const NGO_NAME = "Maya Levi";
const ORG_NAME = "Harbor Community Kitchen";
const PROJECT_TITLE = "Volunteer scheduling";
const KNOWN_USERS = "Coordinators fill a spreadsheet every week.";
const KNOWN_BOOKING = "Volunteers book themselves.";
const FILE_FACT = "The rota is a spreadsheet.";
const FILE_NAME = "rota.txt";
const DEV_SHARED = "Dev shared the main chat";
const AI_SHARED = "The AI shared the main chat";
const BOOKING_LINE = "Dev shared the booking chat";
const NGO_SIDE = "Maya shared the side chat";
const DEV_PRIVATE = "Dev private line the NGO must not see";
const SCOPE_COMMIT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const SCOPE_BLOB = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SCOPE_REVISION = "cccccccccccccccccccccccccccccccccccccccc";
const DEV_DRAFT = "Dev draft the NGO must not see";

const createdRepos: string[] = [];

export function createdRepoNames(): readonly string[] {
  return createdRepos;
}
const DEV_TOPIC_DRAFT = "Dev topic draft the NGO must not see";
const NGO_DRAFT = "NGO draft the developer must not see";

type Sql = ReturnType<typeof sqlClient>;
type Person = { accountId: string; token: string };

type Seed = {
  stack: Stack;
  sql: Sql;
  dev: Person;
  ngo: Person;
  stranger: Person;
  organizationId: string;
  projectId: string;
  source: string;
};

function whole(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  throw new Error(`expected a whole number, got ${JSON.stringify(value)}`);
}

function documentOf(value: unknown): Record<string, unknown> {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("a section document is a record");
  }
  return parsed as Record<string, unknown>;
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
    const body = value.slice(1, -1);
    return body.length === 0 ? [] : body.split(",");
  }
  throw new Error(`expected a list, got ${JSON.stringify(value)}`);
}

function factsRecord(value: unknown): unknown {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("prd_facts did not return a record");
  }
  const record = parsed as Record<string, unknown>;
  for (const key of ["sequence", "revision", "discoveryRevision"]) {
    if (record[key] !== null && record[key] !== undefined) record[key] = whole(record[key]);
  }
  return record;
}

async function user(
  stack: Stack,
  email: string,
  accountType: "volunteer" | "ngo",
  name: string,
  sql: Sql,
): Promise<Person> {
  const created = await fetch(`${stack.apiUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: stack.serviceRoleKey,
      Authorization: `Bearer ${stack.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  if (created.status >= 400) throw new Error(`provisioning ${email} answered ${created.status}`);
  const body = (await created.json()) as { id?: string };
  const accountId = String(body.id ?? "");
  if (!accountId) throw new Error(`provisioning ${email} named no user id`);
  await sql`insert into public.accounts (id, account_type) values (${accountId}::uuid, ${accountType}::public.account_type)`;
  await sql`insert into public.acknowledgments
    (account_id, kind, text_version, signer_name, signer_title, authority_attestation)
    values (${accountId}::uuid, 'platform_tos_and_promise', 'tos-1', ${name}, 'Coordinator', 'I am allowed to act for this project')`;
  const signedIn = await authPost(stack, "/auth/v1/token?grant_type=password", {
    email,
    password: PASSWORD,
  });
  if (signedIn.status !== 200) throw new Error(`sign-in for ${email} answered ${signedIn.status}`);
  const token = String(signedIn.json.access_token ?? "");
  if (!token) throw new Error(`sign-in for ${email} named no access token`);
  return { accountId, token };
}

function brief(booking: string, users: string): Record<string, unknown> {
  return {
    schemaVersion: 1,
    need: { text: "Schedule volunteers", source: { kind: "intake" } },
    usersToday: { text: users, source: { kind: "intake" } },
    successMeasure: null,
    topicOrder: ["booking", "rules"],
    topics: {
      booking: {
        id: "booking",
        title: "Who books shifts",
        required: true,
        state: {
          kind: "agreed",
          answer: booking,
          source: { kind: "chat", round: 1 },
          answerMessageId: null,
        },
      },
      rules: {
        id: "rules",
        title: "Booking rules",
        required: true,
        state: { kind: "open" },
      },
    },
    dependsOn: { rules: ["booking", "not-a-section"] },
    fileFacts: [
      {
        text: FILE_FACT,
        sectionId: "booking",
        source: {
          kind: "file",
          fileId: "00000000-0000-4000-8000-000000000001",
          fileName: FILE_NAME,
        },
      },
    ],
  };
}

async function seed(): Promise<Seed> {
  const stack = stackFromEnv();
  const sql = sqlClient(stack);
  const stamp = crypto.randomUUID();
  const dev = await user(stack, `dev-${stamp}@example.com`, "volunteer", DEV_NAME, sql);
  const ngo = await user(stack, `ngo-${stamp}@example.com`, "ngo", NGO_NAME, sql);
  const stranger = await user(
    stack,
    `other-${stamp}@example.com`,
    "volunteer",
    "Someone Else",
    sql,
  );
  const orgs =
    (await sql`insert into public.organizations (name) values (${ORG_NAME}) returning id`) as Array<{
      id: string;
    }>;
  const organizationId = String(orgs[0].id);
  await sql`insert into public.org_memberships (org_id, account_id, role)
    values (${organizationId}::uuid, ${ngo.accountId}::uuid, 'admin')`;
  const projects = (await sql`insert into public.projects (org_id, name, assigned_volunteer_id)
    values (${organizationId}::uuid, ${PROJECT_TITLE}, ${dev.accountId}::uuid)
    returning id`) as Array<{ id: string }>;
  const projectId = String(projects[0].id);
  const documents = [
    brief("Coordinators book every shift.", "An older note about users."),
    brief(KNOWN_BOOKING, KNOWN_USERS),
    brief("Anyone can book.", "A later unconfirmed note."),
  ];
  for (let revision = 1; revision <= documents.length; revision += 1) {
    await sql`insert into public.brief_revisions (project_id, revision, document, created_by)
      values (${projectId}::uuid, ${revision}, ${JSON.stringify(documents[revision - 1])}::text::jsonb, ${ngo.accountId}::uuid)`;
    if (revision < 3) {
      await sql`insert into public.discovery_confirmations
        (project_id, revision, actor_id, actor_name, confirmed_at, accepted_gaps)
        values (${projectId}::uuid, ${revision}, ${ngo.accountId}::uuid, ${NGO_NAME}, clock_timestamp(), '[]'::jsonb)`;
    }
  }
  return {
    stack,
    sql,
    dev,
    ngo,
    stranger,
    organizationId,
    projectId,
    source: "Discovery revision 2",
  };
}

async function counts(
  sql: Sql,
  projectId: string,
  devId: string,
  ngoId: string,
  organizationId: string,
) {
  const rows = (await sql`select
      (select count(*) from public.prd_records where project_id = ${projectId}::uuid) as records,
      (select count(*) from public.prd_revisions where project_id = ${projectId}::uuid) as revisions,
      (select count(*) from public.prd_sections where project_id = ${projectId}::uuid) as sections,
      (select count(*) from public.prd_section_versions where project_id = ${projectId}::uuid) as versions,
      (select count(*) from public.prd_chats where project_id = ${projectId}::uuid) as chats,
      (select count(*) from public.brief_revisions where project_id = ${projectId}::uuid) as briefs,
      (select snapshot_sequence from public.prd_records where project_id = ${projectId}::uuid) as sequence,
      (select current_revision from public.prd_records where project_id = ${projectId}::uuid) as revision,
      (select discovery_revision from public.prd_records where project_id = ${projectId}::uuid) as discovery,
      (select count(*) from public.discovery_turns where project_id = ${projectId}::uuid) as turns,
      (select count(*) from public.discovery_scopes where project_id = ${projectId}::uuid) as scopes,
      (select count(*) from public.discovery_files where project_id = ${projectId}::uuid) as files,
      (select count(*) from public.need_intakes where project_id = ${projectId}::uuid) as needs,
      (select count(*) from public.discovery_spend where org_id = ${organizationId}::uuid) as spend,
      (select count(*) from public.audit_events
        where actor_account_id = ${devId}::uuid or actor_account_id = ${ngoId}::uuid) as audits,
      (select count(*) from public.notification_events
        where actor_account_id = ${devId}::uuid or actor_account_id = ${ngoId}::uuid) as notifications,
      (select count(*) from information_schema.tables
        where table_schema = 'public'
          and (table_name like '%board%' or table_name like '%bootstrap%'
            or table_name like '%development%' or table_name like '%linear%')) as other_tables
    `) as Array<Record<string, unknown>>;
  const row = rows[0];
  return {
    records: whole(row.records),
    revisions: whole(row.revisions),
    sections: whole(row.sections),
    versions: whole(row.versions),
    chats: whole(row.chats),
    briefs: whole(row.briefs),
    sequence: row.sequence === null ? null : whole(row.sequence),
    revision: row.revision === null ? null : whole(row.revision),
    discovery: row.discovery === null ? null : whole(row.discovery),
    turns: whole(row.turns),
    scopes: whole(row.scopes),
    files: whole(row.files),
    needs: whole(row.needs),
    spend: whole(row.spend),
    audits: whole(row.audits),
    notifications: whole(row.notifications),
    otherTables: whole(row.other_tables),
  };
}

function jsonValue(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  throw new Error(`expected a number, got ${JSON.stringify(value)}`);
}

async function rememberProjectRepo(seeded: Seed): Promise<void> {
  const rows = (await seeded.sql`select repo_name from public.prd_records
    where project_id = ${seeded.projectId}::uuid`) as Array<{ repo_name: string }>;
  const name = rows[0]?.repo_name;
  if (typeof name === "string" && name !== "" && !createdRepos.includes(name)) {
    createdRepos.push(name);
  }
}

function serviceRpc(stack: Stack) {
  return async (name: string, args: Record<string, unknown>) => {
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
    if (response.status >= 400) {
      let message = text;
      try {
        const body = JSON.parse(text) as { message?: unknown };
        if (typeof body.message === "string" && body.message !== "") message = body.message;
      } catch {
        message = text;
      }
      return { ok: false as const, message };
    }
    return { ok: true as const, value: text === "" ? null : JSON.parse(text) };
  };
}

async function open(seeded: Seed, person: Person) {
  try {
    return await functionPost(
      seeded.stack,
      "prd-open",
      { organizationId: seeded.organizationId, projectId: seeded.projectId },
      person.token,
    );
  } finally {
    await rememberProjectRepo(seeded);
  }
}

async function expectOneOpening(
  client: GithubRepo,
  repoName: string,
  recordHead: string,
  snapshot: PrdSnapshot,
): Promise<void> {
  const head = await client.head(repoName);
  if (!head.ok) throw new Error(head.reason);
  if ("missing" in head) throw new Error("main is not a branch");
  expect(head.sha.toLowerCase()).toBe(recordHead.toLowerCase());
  const tip = await client.readCommit(repoName, head.sha);
  if (!tip.ok) throw new Error(tip.reason);
  expect(tip.parents).toHaveLength(1);
  const root = await client.readCommit(repoName, tip.parents[0]);
  if (!root.ok) throw new Error(root.reason);
  expect(root.parents).toHaveLength(0);
  const range = await client.commitsSince(repoName, tip.parents[0], head.sha);
  if (!range.ok) throw new Error(range.reason);
  if (range.result !== "commits") throw new Error("main left the opening line");
  expect(range.commits).toHaveLength(1);
  expect(range.commits[0]?.sha).toBe(head.sha);
  expect(range.commits[0]?.message.split("\n")[0]).toBe("Open the PRD");
  const tree = await client.prdTree(repoName, head.sha);
  if (!tree.ok) throw new Error(tree.reason);
  expect(tree.files).toHaveLength(snapshot.topics.length);
  const blobs = await client.readBlobs(
    repoName,
    tree.files.map((file) => file.sha),
  );
  if (!blobs.ok) throw new Error(blobs.reason);
  const textOf = new Map(blobs.blobs.map((blob) => [blob.sha, blob.text]));
  const seen: string[] = [];
  for (const file of tree.files) {
    const raw = textOf.get(file.sha);
    if (raw === undefined) throw new Error(`${file.path} had no blob text`);
    const parsed = parseSection(raw);
    if (!parsed.ok) throw new Error(`${file.path}: ${parsed.reason}`);
    const topic = snapshot.topics.find((item) => item.id === parsed.file.key);
    if (topic === undefined) throw new Error(`${parsed.file.key} is not an opening topic`);
    expect(parsed.file.document.statements.map((statement) => statement.text)).toEqual(
      topic.statements,
    );
    seen.push(parsed.file.key);
  }
  expect(seen.sort()).toEqual(snapshot.topics.map((topic) => topic.id).sort());
}

async function proveOpenedRepository(seeded: Seed, snapshot: PrdSnapshot): Promise<void> {
  const loaded = loadGithubTest();
  if (!loaded.ok) throw new Error(loaded.reason);
  const rows = (await seeded.sql`select repo_name, repo_id, repo_url, head_commit
    from public.prd_records
    where project_id = ${seeded.projectId}::uuid`) as Array<{
    repo_name: string;
    repo_id: unknown;
    repo_url: string;
    head_commit: string;
  }>;
  const row = rows[0];
  if (!createdRepos.includes(row.repo_name)) createdRepos.push(row.repo_name);
  const found = await loaded.client.createRepo(row.repo_name);
  if (!found.ok) throw new Error(found.reason);
  if (found.result !== "exists") {
    throw new Error(`the repository was ${found.result} on the second look`);
  }
  expect(found.visibility).toBe(loaded.config.visibility);
  expect(found.id).toBe(asNumber(row.repo_id));
  expect(found.url).toBe(row.repo_url);
  const protection = await loaded.client.protection(row.repo_name);
  if (!protection.ok) throw new Error(protection.reason);
  expect(protection.forbidsForcePushes).toBe(true);
  expect(protection.forbidsDeletion).toBe(true);
  const ops = (await seeded.sql`select status from public.prd_git_ops
    where project_id = ${seeded.projectId}::uuid and kind = 'open'
    order by created_at`) as Array<{ status: string }>;
  expect(ops.map((op) => op.status)).toEqual(["finalized"]);
  await expectOneOpening(loaded.client, row.repo_name, row.head_commit, snapshot);
}

async function proveCrashResume(baseline: PrdSnapshot): Promise<void> {
  const loaded = loadGithubTest();
  if (!loaded.ok) throw new Error(loaded.reason);
  for (const step of OPEN_STEPS) {
    const seeded = await seed();
    try {
      const rows = (await seeded.sql`select public.prd_open_begin(
        ${seeded.dev.accountId}::uuid,
        ${seeded.organizationId}::uuid,
        ${seeded.projectId}::uuid) as begun`) as Array<{ begun: unknown }>;
      const begun = jsonValue(rows[0].begun);
      if (!isRecord(begun) || begun.kind !== "publish") {
        throw new Error("prd_open_begin did not return the opening operation");
      }
      const op = parseOpenOperation(jsonValue(begun.op));
      if (op === null) throw new Error(`${step}: the opening operation could not be read`);
      await rememberProjectRepo(seeded);
      const partial = await publishOpen(
        op,
        { github: loaded.client, rpc: serviceRpc(seeded.stack) },
        step,
      );
      if (!partial.ok) throw new Error(`${step}: ${partial.reason}`);
      const finished = await open(seeded, seeded.dev);
      expect(finished.status, `${step}: ${JSON.stringify(finished.json)}`).toBe(200);
      const snapshot = snapshotOf(finished.json);
      expect(snapshot).toEqual(baseline);
      await proveOpenedRepository(seeded, snapshot);
    } finally {
      await rememberProjectRepo(seeded);
      await seeded.sql.close();
    }
  }
}

function snapshotOf(body: Record<string, unknown>): PrdSnapshot {
  return parsePrdSnapshot(body.snapshot);
}

async function readFacts(sql: Sql, actorId: string, projectId: string): Promise<unknown> {
  const rows =
    (await sql`select public.prd_facts(${actorId}::uuid, ${projectId}::uuid) as facts`) as Array<{
      facts: unknown;
    }>;
  return factsRecord(rows[0].facts);
}

function sameAsFacts(http: PrdSnapshot, facts: unknown): void {
  const rendered = renderPrdFacts(facts).snapshot;
  expect(http).toEqual(parsePrdSnapshot(rendered));
}

function resting(snapshot: PrdSnapshot): void {
  expect(snapshot.devQuestions).toEqual([]);
  expect(snapshot.questions).toEqual([]);
  expect(snapshot.check).toBeNull();
  expect(snapshot.funds).toEqual({
    allocationMicros: 0,
    settledMicros: 0,
    pendingMicros: 0,
    replyHoldMicros: 0,
    availableMicros: 0,
    band: "green",
    replyFunded: false,
  });
  expect(snapshot.close).toEqual({
    kind: "open",
    remaining: [],
    path: "check",
    close: { kind: "unavailable", reason: "Not available yet." },
  });
  expect(snapshot.canWrite.main).toBe(true);
  expect(snapshot.send.main).toEqual({ kind: "available" });
}

async function append(
  seeded: Seed,
  chatKey: string,
  actor: "ai" | "dev" | "ngo",
  name: string,
  text: string,
  forRole: "dev" | "ngo" | null,
  actorId: string,
) {
  const response = await fetch(`${seeded.stack.apiUrl}/rest/v1/rpc/prd_append_message`, {
    method: "POST",
    headers: {
      apikey: seeded.stack.serviceRoleKey,
      Authorization: `Bearer ${seeded.stack.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_project: seeded.projectId,
      p_chat_key: chatKey,
      p_actor_kind: actor,
      p_actor_name: name,
      p_parts: [{ type: "text", text }],
      p_for_role: forRole,
      p_actor_id: actorId,
    }),
  });
  const raw = await response.text();
  if (response.status !== 200) throw new Error(`append answered ${response.status}: ${raw}`);
  return JSON.parse(raw) as { id: string; sequence: number };
}

export async function proveRecordOpens(): Promise<void> {
  const seeded = await seed();
  try {
    const ngoFirst = await open(seeded, seeded.ngo);
    expect(ngoFirst.status, JSON.stringify(ngoFirst.json)).toBe(409);
    expect(ngoFirst.json.kind).toBe("forbidden");
    const strangerFirst = await open(seeded, seeded.stranger);
    expect(strangerFirst.status).toBe(409);
    expect(strangerFirst.json.kind).toBe("forbidden");
    const strangerRead = await functionPost(
      seeded.stack,
      "prd-snapshot",
      { projectId: seeded.projectId },
      seeded.stranger.token,
    );
    expect(strangerRead.status).toBe(409);
    expect(strangerRead.json.kind).toBe("forbidden");
    expect(
      (
        await counts(
          seeded.sql,
          seeded.projectId,
          seeded.dev.accountId,
          seeded.ngo.accountId,
          seeded.organizationId,
        )
      ).records,
    ).toBe(0);

    const [first, second] = await Promise.all([open(seeded, seeded.dev), open(seeded, seeded.dev)]);
    expect(first.status, JSON.stringify(first.json)).toBe(200);
    expect(second.status, JSON.stringify(second.json)).toBe(200);
    const opened = snapshotOf(first.json);
    const again = snapshotOf(second.json);
    expect(opened.discoveryRevision).toBe(2);
    expect(again.discoveryRevision).toBe(2);
    expect(opened.topics.map((topic) => topic.id)).toEqual(again.topics.map((topic) => topic.id));
    expect(opened.viewer).toEqual({ role: "dev", name: DEV_NAME });
    expect(opened.people.map((person) => person.role)).toEqual(["ai", "dev", "ngo"]);
    expect(opened.people[1]).toEqual({
      role: "dev",
      name: DEV_NAME,
      label: "Developer · works on the PRD with the AI",
    });
    expect(opened.people[2]).toEqual({
      role: "ngo",
      name: NGO_NAME,
      label: `NGO · ${ORG_NAME} · answers questions`,
    });
    expect(opened.project).toEqual({ title: PROJECT_TITLE, organizationName: ORG_NAME });
    expect(opened.revision).toBe(1);
    expect(opened.sequence).toBe(1);
    expect(opened.topics.map((topic) => topic.id)).toEqual([
      "usersToday",
      "booking",
      "rules",
      "technical-scope",
    ]);
    const users = opened.topics[0];
    const booking = opened.topics[1];
    const rules = opened.topics[2];
    const scope = opened.topics[3];
    expect(users.required).toBe(false);
    expect(users.state).toBe("draft");
    expect(users.statements).toEqual([KNOWN_USERS]);
    expect(users.sources).toEqual([seeded.source]);
    expect(users.stories).toBeNull();
    expect(booking.required).toBe(true);
    expect(booking.state).toBe("draft");
    expect(booking.statements).toEqual([KNOWN_BOOKING, FILE_FACT]);
    expect(booking.sources).toEqual([seeded.source, FILE_NAME]);
    expect(rules.state).toBe("open");
    expect(rules.statements).toEqual([]);
    expect(rules.stories).toBeNull();
    expect(scope.required).toBe(true);
    expect(scope.state).toBe("open");
    expect(scope.stories).toEqual([]);
    expect(opened.drafts).toEqual({});
    resting(opened);
    sameAsFacts(opened, await readFacts(seeded.sql, seeded.dev.accountId, seeded.projectId));

    const shaped =
      (await seeded.sql`select s.dependencies, s.confirmed_version, s.changed_since_confirmed
      from public.prd_sections s
      where s.project_id = ${seeded.projectId}::uuid
        and s.stable_key = 'rules'`) as Array<{
        dependencies: unknown;
        confirmed_version: string | null;
        changed_since_confirmed: string | null;
      }>;
    expect(list(shaped[0].dependencies)).toEqual(["booking"]);
    expect(shaped[0].confirmed_version).toBeNull();
    expect(shaped[0].changed_since_confirmed).toBeNull();
    const bookingDoc = (await seeded.sql`select v.document
      from public.prd_sections s
      join public.prd_section_versions v on v.section_id = s.id
      where s.project_id = ${seeded.projectId}::uuid and s.stable_key = 'booking'`) as Array<{
      document: unknown;
    }>;
    const bookingDocument = documentOf(bookingDoc[0].document);
    expect(bookingDocument.decisions).toEqual([]);
    expect(bookingDocument.technicalScope ?? null).toBeNull();

    let tally = await counts(
      seeded.sql,
      seeded.projectId,
      seeded.dev.accountId,
      seeded.ngo.accountId,
      seeded.organizationId,
    );
    expect(tally.records).toBe(1);
    expect(tally.revisions).toBe(1);
    expect(tally.sections).toBe(4);
    expect(tally.versions).toBe(4);
    expect(tally.chats).toBe(5);
    expect(tally.sequence).toBe(1);
    expect(tally.revision).toBe(1);
    expect(tally.discovery).toBe(2);

    const repeated = await open(seeded, seeded.dev);
    expect(repeated.status).toBe(200);
    expect(snapshotOf(repeated.json).sequence).toBe(1);
    const fresh = await functionPost(
      seeded.stack,
      "prd-snapshot",
      { projectId: seeded.projectId },
      seeded.dev.token,
    );
    expect(fresh.status).toBe(200);
    expect(parsePrdSnapshot(fresh.json).discoveryRevision).toBe(2);
    const quiet = await functionPostRaw(
      seeded.stack,
      "prd-snapshot",
      { projectId: seeded.projectId, sinceSequence: 1 },
      seeded.dev.token,
    );
    expect(quiet.status).toBe(204);
    expect(quiet.text).toBe("");

    const ngoLater = await open(seeded, seeded.ngo);
    expect(ngoLater.status, JSON.stringify(ngoLater.json)).toBe(200);
    expect(snapshotOf(ngoLater.json).viewer).toEqual({ role: "ngo", name: NGO_NAME });
    const strangerLater = await open(seeded, seeded.stranger);
    expect(strangerLater.status).toBe(409);
    tally = await counts(
      seeded.sql,
      seeded.projectId,
      seeded.dev.accountId,
      seeded.ngo.accountId,
      seeded.organizationId,
    );
    expect(tally.records).toBe(1);
    expect(tally.sections).toBe(4);
    expect(tally.chats).toBe(5);
    expect(tally.sequence).toBe(1);

    let frozen = false;
    try {
      await seeded.sql`insert into public.brief_revisions (project_id, revision, document, created_by)
        values (${seeded.projectId}::uuid, 4, '{"schemaVersion":1}'::jsonb, ${seeded.ngo.accountId}::uuid)`;
    } catch (error) {
      frozen = String(error instanceof Error ? error.message : error).includes(
        "Discovery is frozen",
      );
      if (!frozen) throw error;
    }
    expect(frozen).toBe(true);
    tally = await counts(
      seeded.sql,
      seeded.projectId,
      seeded.dev.accountId,
      seeded.ngo.accountId,
      seeded.organizationId,
    );
    expect(tally.briefs).toBe(3);
    expect(tally.turns).toBe(0);
    expect(tally.scopes).toBe(0);
    expect(tally.files).toBe(0);
    expect(tally.needs).toBe(0);
    expect(tally.spend).toBe(0);
    expect(tally.audits).toBe(0);
    expect(tally.notifications).toBe(0);
    expect(tally.otherTables).toBe(0);

    await proveOpenedRepository(seeded, opened);
    await proveCrashResume(opened);

    throw new AtPending(
      "AT-036.01",
      "sut-missing",
      "The PM scope requirements and the Author the project PRD bootstrap are not in this tree, " +
        "so this case cannot prove them. The test organization is on GitHub's free plan, " +
        'so repositories there are public and the test cannot prove "private".',
    );
  } finally {
    await rememberProjectRepo(seeded);
    await seeded.sql.close();
  }
}

export async function proveScopeSection(written: Scope): Promise<void> {
  const seeded = await seed();
  try {
    const opened = await open(seeded, seeded.dev);
    expect(opened.status, JSON.stringify(opened.json)).toBe(200);
    const before = snapshotOf(opened.json);
    for (const topic of before.topics) {
      expect(topic.scope, topic.id).toEqual(
        topic.id === "technical-scope" ? { kind: "not-written" } : null,
      );
    }

    const sections = (await seeded.sql`select id from public.prd_sections
      where project_id = ${seeded.projectId}::uuid and stable_key = 'technical-scope'`) as Array<{
      id: string;
    }>;
    const document = { statements: [], decisions: [], technicalScope: written };
    const versions = (await seeded.sql`insert into public.prd_section_versions (
        project_id, section_id, commit_sha, blob_sha, author_kind, variant, document
      ) values (
        ${seeded.projectId}::uuid,
        ${sections[0].id}::uuid,
        ${SCOPE_COMMIT},
        ${SCOPE_BLOB},
        'repository',
        'readable',
        ${JSON.stringify(document)}::text::jsonb
      ) returning id`) as Array<{ id: string }>;
    await seeded.sql`insert into public.prd_revisions (
        project_id, revision, discovery_revision, manifest, commit_sha
      )
      select project_id, 2, discovery_revision,
             manifest || jsonb_build_object('technical-scope', ${versions[0].id}::text),
             ${SCOPE_REVISION}
        from public.prd_revisions
       where project_id = ${seeded.projectId}::uuid and revision = 1`;
    await seeded.sql`update public.prd_sections set state = 'draft' where id = ${sections[0].id}::uuid`;
    await seeded.sql`update public.prd_records
      set current_revision = 2, snapshot_sequence = snapshot_sequence + 1
      where project_id = ${seeded.projectId}::uuid`;

    const read = await functionPost(
      seeded.stack,
      "prd-snapshot",
      { projectId: seeded.projectId },
      seeded.dev.token,
    );
    expect(read.status, JSON.stringify(read.json)).toBe(200);
    const after = parsePrdSnapshot(read.json);
    expect(after.revision).toBe(2);
    expect(after.sequence).toBe(2);
    sameAsFacts(after, await readFacts(seeded.sql, seeded.dev.accountId, seeded.projectId));
    const technical = after.topics.find((topic) => topic.id === "technical-scope");
    expect(technical?.state).toBe("draft");
    expect(technical?.scope).toEqual({
      kind: "written",
      stories: written.userStories.map((story) => ({
        story: story.story,
        acceptanceCriteria: story.acceptanceCriteria,
      })),
      suggestedStack: written.suggestedStack,
      complexity: written.complexity,
      riskFlags: written.riskFlags,
    });
    expect(technical?.stories).toEqual(written.userStories.map((story) => story.story));
    for (const topic of after.topics) {
      if (topic.id !== "technical-scope") expect(topic.scope, topic.id).toBeNull();
    }
  } finally {
    await seeded.sql.close();
  }
}

export async function proveRecordSurvives(): Promise<void> {
  const seeded = await seed();
  try {
    const opened = await open(seeded, seeded.dev);
    expect(opened.status, JSON.stringify(opened.json)).toBe(200);
    const refused = await fetch(`${seeded.stack.apiUrl}/rest/v1/rpc/prd_append_message`, {
      method: "POST",
      headers: {
        apikey: seeded.stack.anonKey,
        Authorization: `Bearer ${seeded.dev.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_project: seeded.projectId,
        p_chat_key: "main",
        p_actor_kind: "dev",
        p_actor_name: DEV_NAME,
        p_parts: [{ type: "text", text: DEV_SHARED }],
      }),
    });
    expect(refused.status).toBeGreaterThanOrEqual(400);

    const devShared = await append(seeded, "main", "dev", DEV_NAME, DEV_SHARED, null, seeded.dev.accountId);
    const aiShared = await append(seeded, "main", "ai", "ai4good AI", AI_SHARED, null, seeded.dev.accountId);
    const bookingLine = await append(
      seeded,
      "topic:booking",
      "dev",
      DEV_NAME,
      BOOKING_LINE,
      null,
      seeded.dev.accountId,
    );
    const suggestion = (await seeded.sql`select public.prd_question_outcome(
        ${seeded.projectId}::uuid,
        ${await mainChat(seeded)}::uuid,
        ${JSON.stringify({
          kind: "suggest-ngo",
          message: aiShared.id,
          question: {
            section: "booking",
            text: "How far ahead do volunteers book shifts?",
            why: "The booking rules depend on it.",
            options: ["A week ahead.", "A month ahead."],
            blocking: true,
            prerequisites: [],
            anchors: [],
          },
        })}::text::jsonb
      ) as outcome`) as Array<{ outcome: unknown }>;
    const [questionId] = outcomeQuestions(suggestion[0].outcome);
    await postQuestion(seeded, seeded.dev.accountId, questionId, await rowRevision(seeded, questionId));
    const sideKey = `side:${questionId}`;
    const sequences = [
      devShared,
      aiShared,
      bookingLine,
      await append(seeded, sideKey, "ngo", NGO_NAME, NGO_SIDE, null, seeded.ngo.accountId),
      await append(seeded, "main", "dev", DEV_NAME, DEV_PRIVATE, "dev", seeded.dev.accountId),
    ];
    expect(sequences.map((row) => whole(row.sequence))).toEqual([2, 3, 4, 7, 8]);

    const beforeDrafts = await functionPostRaw(
      seeded.stack,
      "prd-snapshot",
      { projectId: seeded.projectId, sinceSequence: 8 },
      seeded.dev.token,
    );
    expect(beforeDrafts.status).toBe(204);

    const emptyDraft = await functionPost(
      seeded.stack,
      "prd-draft",
      { projectId: seeded.projectId, key: "main", text: "" },
      seeded.dev.token,
    );
    expect(emptyDraft.status, JSON.stringify(emptyDraft.json)).toBe(200);
    expect(snapshotOf(emptyDraft.json).sequence).toBe(8);
    const devMain = await functionPost(
      seeded.stack,
      "prd-draft",
      { projectId: seeded.projectId, key: "main", text: DEV_DRAFT },
      seeded.dev.token,
    );
    const devTopic = await functionPost(
      seeded.stack,
      "prd-draft",
      { projectId: seeded.projectId, key: "topic:booking", text: DEV_TOPIC_DRAFT },
      seeded.dev.token,
    );
    const ngoDraft = await functionPost(
      seeded.stack,
      "prd-draft",
      { projectId: seeded.projectId, key: sideKey, text: NGO_DRAFT },
      seeded.ngo.token,
    );
    expect(devMain.status).toBe(200);
    expect(devTopic.status).toBe(200);
    expect(ngoDraft.status).toBe(200);
    expect(snapshotOf(ngoDraft.json).sequence).toBe(8);
    const afterDrafts = await functionPostRaw(
      seeded.stack,
      "prd-snapshot",
      { projectId: seeded.projectId, sinceSequence: 8 },
      seeded.ngo.token,
    );
    expect(afterDrafts.status).toBe(204);

    const devRead = await functionPost(
      seeded.stack,
      "prd-snapshot",
      { projectId: seeded.projectId },
      seeded.dev.token,
    );
    const ngoRead = await functionPost(
      seeded.stack,
      "prd-snapshot",
      { projectId: seeded.projectId },
      seeded.ngo.token,
    );
    expect(devRead.status, JSON.stringify(devRead.json)).toBe(200);
    expect(ngoRead.status, JSON.stringify(ngoRead.json)).toBe(200);
    const devSnapshot = parsePrdSnapshot(devRead.json);
    const ngoSnapshot = parsePrdSnapshot(ngoRead.json);
    sameAsFacts(devSnapshot, await readFacts(seeded.sql, seeded.dev.accountId, seeded.projectId));
    sameAsFacts(ngoSnapshot, await readFacts(seeded.sql, seeded.ngo.accountId, seeded.projectId));
    expect(devSnapshot.sequence).toBe(8);
    expect(devSnapshot.revision).toBe(1);
    expect(ngoSnapshot.sequence).toBe(8);
    const booking = devSnapshot.topics.find((topic) => topic.id === "booking");
    expect(booking?.sources).toContain(seeded.source);
    expect(booking?.statements).toContain(KNOWN_BOOKING);

    const devMainChat = devSnapshot.chats.main;
    expect(devMainChat.map((message) => message.parts)).toEqual([
      [{ type: "text", text: DEV_SHARED }],
      [{ type: "text", text: AI_SHARED }],
      [{ type: "text", text: DEV_PRIVATE }],
    ]);
    expect(devMainChat.map((message) => message.role)).toEqual(["user", "assistant", "user"]);
    expect(devMainChat.map((message) => message.metadata)).toEqual([
      expect.objectContaining({ actor: "dev", name: DEV_NAME }),
      expect.objectContaining({ actor: "ai", name: "ai4good AI" }),
      expect.objectContaining({ actor: "dev", name: DEV_NAME }),
    ]);
    expect(devMainChat.every((message) => typeof message.metadata?.at === "string")).toBe(true);
    expect(devSnapshot.chats["topic:booking"].map((message) => message.metadata?.actor)).toEqual([
      "dev",
    ]);
    expect(devSnapshot.chats[sideKey].map((message) => message.metadata)).toEqual([
      expect.objectContaining({ actor: "ngo", name: NGO_NAME }),
    ]);
    expect(ngoSnapshot.chats.main.map((message) => message.parts)).toEqual([
      [{ type: "text", text: DEV_SHARED }],
      [{ type: "text", text: AI_SHARED }],
    ]);
    expect(ngoSnapshot.chats[sideKey][0].parts).toEqual([{ type: "text", text: NGO_SIDE }]);
    expect(JSON.stringify(ngoSnapshot)).not.toContain(DEV_PRIVATE);
    expect(JSON.stringify(ngoSnapshot)).not.toContain(DEV_DRAFT);
    expect(JSON.stringify(ngoSnapshot)).not.toContain(DEV_TOPIC_DRAFT);
    expect(devSnapshot.drafts).toEqual({ main: DEV_DRAFT, "topic:booking": DEV_TOPIC_DRAFT });
    expect(ngoSnapshot.drafts).toEqual({ [sideKey]: NGO_DRAFT });
    expect(JSON.stringify(devSnapshot)).not.toContain(NGO_DRAFT);

    const tally = await counts(
      seeded.sql,
      seeded.projectId,
      seeded.dev.accountId,
      seeded.ngo.accountId,
      seeded.organizationId,
    );
    expect(tally.sequence).toBe(8);
    expect(tally.revision).toBe(1);
    expect(tally.chats).toBe(6);
    const stranger = await functionPost(
      seeded.stack,
      "prd-snapshot",
      { projectId: seeded.projectId },
      seeded.stranger.token,
    );
    expect(stranger.status).toBe(409);
    expect(stranger.json.kind).toBe("forbidden");
    await proveOutsideReaches(seeded, devSnapshot.sequence, devSnapshot.revision);
  } finally {
    await seeded.sql.close();
  }
}

function devQuestion(
  section: string,
  text: string,
  why: string,
  options: readonly string[],
  suggested: string,
  prerequisites: readonly string[] = [],
  anchors: readonly string[] = [],
): Record<string, unknown> {
  return { section, text, why, options, suggested, prerequisites, anchors };
}

function outcomeQuestions(value: unknown): string[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("an outcome did not name its questions");
  }
  const questions = (parsed as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) throw new Error("an outcome did not name its questions");
  return questions.map((id) => {
    if (typeof id !== "string" || id.length === 0)
      throw new Error("an outcome names a question id");
    return id;
  });
}

async function refusal(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (error) {
    const detail = (error as { detail?: unknown }).detail;
    if (typeof detail !== "string" || detail.length === 0) throw error;
    return detail;
  }
  throw new Error("expected a refusal");
}

async function questionIds(seeded: Seed): Promise<string[]> {
  const rows = (await seeded.sql`select id from public.prd_questions
    where project_id = ${seeded.projectId}::uuid
    order by ordinal`) as Array<{ id: string }>;
  return rows.map((row) => String(row.id));
}

async function rowRevision(seeded: Seed, questionId: string): Promise<number> {
  const rows = (await seeded.sql`select row_revision from public.prd_questions
    where id = ${questionId}::uuid`) as Array<{ row_revision: unknown }>;
  return whole(rows[0].row_revision);
}

async function sideChatCount(seeded: Seed, questionId: string): Promise<number> {
  const rows = (await seeded.sql`select count(*) as n from public.prd_chats
    where project_id = ${seeded.projectId}::uuid
      and kind = 'side'
      and question_id = ${questionId}::uuid`) as Array<{ n: unknown }>;
  return whole(rows[0].n);
}

async function mainChat(seeded: Seed): Promise<string> {
  const rows = (await seeded.sql`select id from public.prd_chats
    where project_id = ${seeded.projectId}::uuid and kind = 'main'`) as Array<{ id: string }>;
  const id = rows[0] ? String(rows[0].id) : "";
  if (!id) throw new Error("the opened PRD has no main chat");
  return id;
}

async function outcome(
  seeded: Seed,
  chatId: string,
  body: Record<string, unknown>,
): Promise<string[]> {
  const message = await append(
    seeded,
    "main",
    "ai",
    "ai4good AI",
    "The AI asks.",
    null,
    seeded.dev.accountId,
  );
  const rows = (await seeded.sql`select public.prd_question_outcome(
      ${seeded.projectId}::uuid,
      ${chatId}::uuid,
      ${JSON.stringify({ ...body, message: message.id })}::text::jsonb
    ) as outcome`) as Array<{ outcome: unknown }>;
  return outcomeQuestions(rows[0].outcome);
}

function postQuestion(seeded: Seed, actorId: string, questionId: string, revision: number) {
  return seeded.sql`select public.prd_question_post(
    ${actorId}::uuid,
    ${seeded.projectId}::uuid,
    ${questionId}::uuid,
    ${revision}::bigint
  )`;
}

async function readSnapshot(seeded: Seed, person: Person): Promise<PrdSnapshot> {
  const response = await functionPost(
    seeded.stack,
    "prd-snapshot",
    { projectId: seeded.projectId },
    person.token,
  );
  expect(response.status, JSON.stringify(response.json)).toBe(200);
  const view = parsePrdSnapshot(response.json);
  sameAsFacts(view, await readFacts(seeded.sql, person.accountId, seeded.projectId));
  return view;
}

async function expectRefused(
  seeded: Seed,
  chatId: string,
  body: Record<string, unknown>,
  reason: string,
  label: string,
): Promise<void> {
  const before = await questionIds(seeded);
  expect(await refusal(outcome(seeded, chatId, body)), label).toBe(reason);
  expect(await questionIds(seeded), `${label} changes nothing`).toEqual(before);
}

export async function proveQuestionOrder(): Promise<void> {
  const seeded = await seed();
  try {
    const opened = await open(seeded, seeded.dev);
    expect(opened.status, JSON.stringify(opened.json)).toBe(200);
    const chatId = await mainChat(seeded);

    const swapText = "Can volunteers swap a shift themselves?";
    const swapWhy = "The swap rule decides which screens the stories need.";
    const swapYes = "Yes, they swap themselves.";
    const publishText = "How far ahead are shifts published?";
    const publishWhy = "Reminders and the Saturday shortage check count from this date.";
    const publishWeek = "Two weeks ahead.";
    const approveText = "Who approves a swap?";
    const approveWhy = "The swap answer decides whether a coordinator has to approve.";
    const approveBy = "The coordinator approves.";
    const clarifyText = "Does who books shifts still match the approved Discovery answer?";
    const clarifyWhy = "The booking rule was agreed in Discovery, and this checks it still holds.";
    const anchor = "PM requirement: who books shifts";
    const ngoText = "What would show the kitchen that the tool works?";
    const ngoWhy = "Only the kitchen can decide what success means.";

    const asked = await outcome(seeded, chatId, {
      kind: "ask",
      questions: [
        devQuestion(
          "booking",
          swapText,
          swapWhy,
          [swapYes, "No, a coordinator approves."],
          swapYes,
        ),
        devQuestion(
          "booking",
          publishText,
          publishWhy,
          [publishWeek, "The day before."],
          publishWeek,
        ),
      ],
    });
    expect(asked, "two independent questions in one section are asked together").toHaveLength(2);
    const [swapId, publishId] = asked;
    const ready = await readSnapshot(seeded, seeded.dev);
    expect(
      ready.devQuestions,
      "the developer sees both questions, each with its why and one suggested option",
    ).toEqual([
      {
        id: swapId,
        topicId: "booking",
        text: swapText,
        why: swapWhy,
        options: [swapYes, "No, a coordinator approves."],
        suggested: swapYes,
        answered: null,
      },
      {
        id: publishId,
        topicId: "booking",
        text: publishText,
        why: publishWhy,
        options: [publishWeek, "The day before."],
        suggested: publishWeek,
        answered: null,
      },
    ]);

    const dependent = devQuestion(
      "booking",
      approveText,
      approveWhy,
      [approveBy, "No one else approves."],
      approveBy,
      [swapId],
    );
    await expectRefused(
      seeded,
      chatId,
      { kind: "ask", questions: [dependent] },
      "not-ready",
      "a question whose prerequisite is unanswered",
    );
    await expectRefused(
      seeded,
      chatId,
      {
        kind: "ask",
        questions: [
          devQuestion(
            "booking",
            "Are reminders sent the day before a shift?",
            "Reminders are a screen of their own only if the kitchen wants them.",
            ["Yes, the day before.", "No reminders."],
            "Yes, the day before.",
          ),
          dependent,
        ],
      },
      "not-ready",
      "a mixed ask of a ready question and one whose prerequisite is unanswered",
    );
    await expectRefused(
      seeded,
      chatId,
      {
        kind: "ask",
        questions: [
          devQuestion(
            "rules",
            "How many shifts can one volunteer take in a week?",
            "A weekly limit means something only once booking is settled.",
            ["Two shifts.", "As many as are open."],
            "Two shifts.",
          ),
        ],
      },
      "not-ready",
      "a question in a section that waits on an unconfirmed section",
    );

    expect(
      await outcome(seeded, chatId, { kind: "answered", question: swapId, answer: swapYes }),
      "the prerequisite is answered",
    ).toEqual([swapId]);
    const [approveId] = await outcome(seeded, chatId, { kind: "ask", questions: [dependent] });
    expect(approveId, "the answer lets the dependent question be asked").toBeTruthy();
    const followed = await readSnapshot(seeded, seeded.dev);
    expect(
      followed.devQuestions.map((question) => ({
        id: question.id,
        text: question.text,
        answered: question.answered,
      })),
      "the answer is kept, and it determines the next question",
    ).toEqual([
      { id: swapId, text: swapText, answered: swapYes },
      { id: publishId, text: publishText, answered: null },
      { id: approveId, text: approveText, answered: null },
    ]);

    const [clarificationId] = await outcome(seeded, chatId, {
      kind: "ask",
      questions: [
        devQuestion(
          "booking",
          clarifyText,
          clarifyWhy,
          ["Yes, it still holds.", "No, it changed."],
          "Yes, it still holds.",
          [],
          [anchor],
        ),
      ],
    });
    const facts = (await readFacts(seeded.sql, seeded.dev.accountId, seeded.projectId)) as {
      devQuestions: Array<{ id: string; anchors: string[] }>;
    };
    expect(
      facts.devQuestions.find((question) => question.id === clarificationId)?.anchors,
      "the clarification keeps its anchor",
    ).toEqual([anchor]);

    const [ngoQuestionId] = await outcome(seeded, chatId, {
      kind: "suggest-ngo",
      question: {
        section: "booking",
        text: ngoText,
        why: ngoWhy,
        options: ["Fewer missed Saturday shifts.", "Volunteers book themselves every week."],
        blocking: true,
        prerequisites: [],
        anchors: [],
      },
    });
    expect(ngoQuestionId, "the suggestion is recorded").toBeTruthy();
    const suggested = await readSnapshot(seeded, seeded.ngo);
    expect(
      suggested.questions.find((question) => question.id === ngoQuestionId),
      "the NGO sees the question as a suggestion, and Post is unavailable",
    ).toMatchObject({
      kind: "suggested",
      text: ngoText,
      post: { kind: "unavailable", reason: "Only Priya posts questions to Maya." },
    });
    expect(suggested.chats[`side:${ngoQuestionId}`], "no side chat exists yet").toBeUndefined();
    expect(await sideChatCount(seeded, ngoQuestionId), "no side chat row exists yet").toBe(0);
    const revision = await rowRevision(seeded, ngoQuestionId);
    expect(
      await refusal(postQuestion(seeded, seeded.ngo.accountId, ngoQuestionId, revision)),
      "the NGO cannot post the suggestion",
    ).toBe("forbidden");
    expect(
      await refusal(postQuestion(seeded, seeded.stranger.accountId, ngoQuestionId, revision)),
      "an unrelated account cannot post the suggestion",
    ).toBe("forbidden");
    expect(await sideChatCount(seeded, ngoQuestionId), "a refused post creates no side chat").toBe(
      0,
    );

    await postQuestion(seeded, seeded.dev.accountId, ngoQuestionId, revision);
    expect(
      await refusal(postQuestion(seeded, seeded.dev.accountId, ngoQuestionId, revision)),
      "posting again with the old row revision is refused",
    ).toBe("stale");
    const posted = await readSnapshot(seeded, seeded.ngo);
    expect(
      posted.questions.find((question) => question.id === ngoQuestionId),
      "the NGO sees the question once it is posted",
    ).toMatchObject({ kind: "posted", text: ngoText });
    expect(posted.chats[`side:${ngoQuestionId}`], "the side chat exists").toEqual([]);
    expect(await sideChatCount(seeded, ngoQuestionId), "the side chat is one row").toBe(1);

    throw new AtPending(
      "AT-036.03",
      "sut-missing",
      "The AI's own choices are not yet proven, so this case cannot prove that it explains why it asks, reuses approved facts, offers suggestions, and keeps unknowns open. Those need a real model session, which is not in this tree yet.",
    );
  } finally {
    await seeded.sql.close();
  }
}

type HttpAnswer = { status: number; json: Record<string, unknown> };
type SendScope =
  | { kind: "main" }
  | { kind: "topic"; topicId: string }
  | { kind: "side"; questionId: string };

const ROLE_ACTIONS = ["confirm-topic", "reopen-topic", "close"] as const;
const EVERY_ACTION = [
  "post-question",
  "complete-answer",
  "confirm-topic",
  "reopen-topic",
  "close",
  "close-anyway",
  "keep-working",
] as const;

function expectRefusal(response: HttpAnswer, kind: string, label: string): void {
  expect(response.status, `${label}: ${JSON.stringify(response.json)}`).toBe(409);
  expect(response.json.kind, label).toBe(kind);
}

function landedSend(response: HttpAnswer, label: string): { turnId: string; messageId: string } {
  expect(response.status, `${label}: ${JSON.stringify(response.json)}`).toBe(200);
  const turnId = response.json.turnId;
  const messageId = response.json.messageId;
  if (typeof turnId !== "string" || typeof messageId !== "string") {
    throw new Error(`${label} did not name a turn and a message`);
  }
  return { turnId, messageId };
}

function chatTexts(snapshot: PrdSnapshot, key: string): string[] {
  const found: string[] = [];
  for (const message of snapshot.chats[key] ?? []) {
    for (const part of message.parts) {
      if (part.type === "text") found.push(part.text);
    }
  }
  return found;
}

function questionBy(snapshot: PrdSnapshot, id: string) {
  const question = snapshot.questions.find((item) => item.id === id);
  if (!question) throw new Error("the snapshot has no such question");
  return question;
}

function offeredPost(snapshot: PrdSnapshot, id: string): string {
  const question = questionBy(snapshot, id);
  if (question.kind !== "suggested" || question.post.kind !== "available") {
    throw new Error("the developer is not offered a post");
  }
  return question.post.action.token;
}

function actionToken(kind: string, questionId: string): string {
  const target =
    kind === "post-question" || kind === "complete-answer"
      ? `question:${questionId}`
      : kind === "confirm-topic" || kind === "reopen-topic"
        ? "booking"
        : "prd";
  return `${kind}|${target}|1|1`;
}

async function openTurns(seeded: Seed, actorId: string): Promise<number> {
  const rows = (await seeded.sql`select count(*) as n from public.prd_turns
    where project_id = ${seeded.projectId}::uuid
      and actor_id = ${actorId}::uuid
      and state in ('admitted', 'uncertain')`) as Array<{ n: unknown }>;
  return whole(rows[0].n);
}

async function turnsNamed(seeded: Seed, left: string, right: string): Promise<number> {
  const rows = (await seeded.sql`select count(*) as n from public.prd_turns
    where project_id = ${seeded.projectId}::uuid
      and (request_id = ${left} or request_id = ${right})`) as Array<{ n: unknown }>;
  return whole(rows[0].n);
}

async function sideChatId(seeded: Seed, questionId: string): Promise<string> {
  const rows = (await seeded.sql`select id from public.prd_chats
    where project_id = ${seeded.projectId}::uuid
      and kind = 'side'
      and question_id = ${questionId}::uuid`) as Array<{ id: string }>;
  const id = rows[0] ? String(rows[0].id) : "";
  if (!id) throw new Error("the posted question has no side chat");
  return id;
}

async function finishTurn(seeded: Seed, turnId: string): Promise<void> {
  await seeded.sql`select public.prd_turn_finish(${turnId}::uuid, 'answered')`;
}

async function send(
  seeded: Seed,
  person: Person,
  scope: SendScope,
  intent: Record<string, unknown>,
  revision: number,
  request: string,
): Promise<HttpAnswer> {
  return functionPost(
    seeded.stack,
    "prd-message",
    {
      projectId: seeded.projectId,
      scope,
      requestId: request,
      baseRevision: revision,
      intent,
    },
    person.token,
  );
}

async function act(
  seeded: Seed,
  person: Person,
  kind: string,
  token: string,
  request: string,
): Promise<HttpAnswer> {
  return functionPost(
    seeded.stack,
    "prd-action",
    { projectId: seeded.projectId, kind, token, requestId: request },
    person.token,
  );
}

export async function proveRolesAndPermissions(): Promise<void> {
  const seeded = await seed();
  try {
    const opened = await open(seeded, seeded.dev);
    expect(opened.status, JSON.stringify(opened.json)).toBe(200);

    const plainReply = "The AI continues the main chat.";
    await append(seeded, "main", "ai", "ai4good AI", plainReply, null, seeded.dev.accountId);
    const plain = await readSnapshot(seeded, seeded.dev);
    expect(
      plain.chats.main.map((message) => message.parts),
      "a plain AI reply offers no state-action button",
    ).toEqual([[{ type: "text", text: plainReply }]]);

    const postText = "What would show the kitchen that the tool works?";
    const heldText = "Which Saturday shortage should the kitchen count?";
    const chatId = await mainChat(seeded);
    const [postedId] = await outcome(seeded, chatId, {
      kind: "suggest-ngo",
      question: {
        section: "booking",
        text: postText,
        why: "Only the kitchen can decide what success means.",
        options: ["Fewer missed Saturday shifts."],
        blocking: true,
        prerequisites: [],
        anchors: [],
      },
    });
    const [heldId] = await outcome(seeded, chatId, {
      kind: "suggest-ngo",
      question: {
        section: "booking",
        text: heldText,
        why: "The shortage rule is the kitchen's to name.",
        options: ["Count the Saturday shortage."],
        blocking: false,
        prerequisites: [],
        anchors: [],
      },
    });
    const offered = await readSnapshot(seeded, seeded.dev);
    const postToken = offeredPost(offered, postedId);
    const heldToken = offeredPost(offered, heldId);
    const revision = offered.revision;

    const mainLine = "Priya writes the roster in the main chat.";
    const mainRequest = crypto.randomUUID();
    expect(await openTurns(seeded, seeded.dev.accountId), "a main send needs no turn the developer owns").toBe(0);
    const mainIntent = { kind: "text", text: mainLine };
    const firstMain = await send(seeded, seeded.dev, { kind: "main" }, mainIntent, revision, mainRequest);
    const againMain = await send(seeded, seeded.dev, { kind: "main" }, mainIntent, revision, mainRequest);
    const mainLanded = landedSend(firstMain, "the developer writes in main");
    expect(landedSend(againMain, "the same request is the same send")).toEqual(mainLanded);
    expect(
      chatTexts(await readSnapshot(seeded, seeded.dev), "main").filter((text) => text === mainLine),
      "the same request writes one message",
    ).toEqual([mainLine]);
    await finishTurn(seeded, mainLanded.turnId);

    const topicLine = "Priya writes in the booking topic.";
    expect(await openTurns(seeded, seeded.dev.accountId), "a topic send needs no turn the developer owns").toBe(0);
    const topicLanded = landedSend(
      await send(
        seeded,
        seeded.dev,
        { kind: "topic", topicId: "booking" },
        { kind: "text", text: topicLine },
        revision,
        crypto.randomUUID(),
      ),
      "the developer writes in a topic chat",
    );
    expect(
      chatTexts(await readSnapshot(seeded, seeded.dev), "topic:booking").filter((text) => text === topicLine),
      "the topic chat keeps the developer's message once",
    ).toEqual([topicLine]);
    await finishTurn(seeded, topicLanded.turnId);

    const raceLeft = "Priya's first simultaneous line.";
    const raceRight = "Priya's second simultaneous line.";
    const leftRequest = crypto.randomUUID();
    const rightRequest = crypto.randomUUID();
    const [left, right] = await Promise.all([
      send(seeded, seeded.dev, { kind: "main" }, { kind: "text", text: raceLeft }, revision, leftRequest),
      send(seeded, seeded.dev, { kind: "main" }, { kind: "text", text: raceRight }, revision, rightRequest),
    ]);
    const won = [left, right].filter((response) => response.status === 200);
    const lost = [left, right].filter((response) => response.status !== 200);
    expect(won, "one simultaneous send lands").toHaveLength(1);
    expect(lost, "the other simultaneous send is refused").toHaveLength(1);
    expectRefusal(lost[0], "busy", "the other simultaneous send");
    const raced = await readSnapshot(seeded, seeded.dev);
    const storedRace = [raceLeft, raceRight].filter((text) => chatTexts(raced, "main").includes(text));
    expect(storedRace, "two simultaneous sends leave one message").toHaveLength(1);
    expect(await turnsNamed(seeded, leftRequest, rightRequest), "two simultaneous sends leave one turn").toBe(1);
    const wonTurn = won[0].json.turnId;
    if (typeof wonTurn !== "string") throw new Error("the landed send named no turn");
    await finishTurn(seeded, wonTurn);

    expect(await openTurns(seeded, seeded.dev.accountId), "posting needs no turn the developer owns").toBe(0);
    const posted = await act(seeded, seeded.dev, "post-question", postToken, crypto.randomUUID());
    expect(posted.status, JSON.stringify(posted.json)).toBe(200);
    expect(await openTurns(seeded, seeded.dev.accountId), "posting creates no turn").toBe(0);
    expect(questionBy(await readSnapshot(seeded, seeded.dev), postedId).kind, "the question is posted once").toBe(
      "posted",
    );
    expectRefusal(
      await act(seeded, seeded.dev, "post-question", postToken, crypto.randomUUID()),
      "stale",
      "a spent post token",
    );
    const postedOnce = (await readSnapshot(seeded, seeded.dev)).questions.filter(
      (question) => question.id === postedId,
    );
    expect(postedOnce, "a spent post does not add a question").toHaveLength(1);
    expect(postedOnce[0]?.kind).toBe("posted");

    expectRefusal(
      await send(
        seeded,
        seeded.dev,
        { kind: "side", questionId: postedId },
        { kind: "text", text: "Priya cannot answer Maya." },
        revision,
        crypto.randomUUID(),
      ),
      "forbidden",
      "the developer is refused in the side chat",
    );
    expectRefusal(
      await send(
        seeded,
        seeded.ngo,
        { kind: "main" },
        { kind: "text", text: "Maya writes in main." },
        revision,
        crypto.randomUUID(),
      ),
      "forbidden",
      "the NGO is refused in main",
    );
    expectRefusal(
      await send(
        seeded,
        seeded.ngo,
        { kind: "topic", topicId: "booking" },
        { kind: "text", text: "Maya writes in a topic." },
        revision,
        crypto.randomUUID(),
      ),
      "forbidden",
      "the NGO is refused in a topic chat",
    );
    expect(await sideChatCount(seeded, heldId), "a suggested question has no side chat").toBe(0);
    expectRefusal(
      await send(
        seeded,
        seeded.ngo,
        { kind: "side", questionId: heldId },
        { kind: "text", text: "Maya answers too soon." },
        revision,
        crypto.randomUUID(),
      ),
      "forbidden",
      "the NGO is refused in a question still suggested",
    );
    expectRefusal(
      await act(seeded, seeded.ngo, "post-question", heldToken, crypto.randomUUID()),
      "forbidden",
      "the NGO is refused posting a question",
    );
    expect(questionBy(await readSnapshot(seeded, seeded.dev), heldId).kind).toBe("suggested");

    const ngoLine = "Maya writes in the posted side chat.";
    const ngoLanded = landedSend(
      await send(
        seeded,
        seeded.ngo,
        { kind: "side", questionId: postedId },
        { kind: "text", text: ngoLine },
        revision,
        crypto.randomUUID(),
      ),
      "the NGO writes in the posted side chat",
    );
    expect(
      chatTexts(await readSnapshot(seeded, seeded.ngo), `side:${postedId}`).filter((text) => text === ngoLine),
      "the side chat keeps the NGO's message once",
    ).toEqual([ngoLine]);
    await finishTurn(seeded, ngoLanded.turnId);
    const answering = questionBy(await readSnapshot(seeded, seeded.ngo), postedId);
    if (answering.kind !== "answering" || answering.complete.kind !== "available") {
      throw new Error("the NGO is not offered a way to mark the answer complete");
    }
    const completed = await act(
      seeded,
      seeded.ngo,
      "complete-answer",
      answering.complete.action.token,
      crypto.randomUUID(),
    );
    expect(completed.status, JSON.stringify(completed.json)).toBe(200);
    expect(completed.json.messageId, "marking the answer complete writes no message").toBeNull();
    if (typeof completed.json.turnId !== "string") throw new Error("complete-answer named no turn");
    await finishTurn(seeded, completed.json.turnId);

    const sideId = await sideChatId(seeded, postedId);
    const recorded = await append(
      seeded,
      `side:${postedId}`,
      "ai",
      "ai4good AI",
      "The AI records the settled answer.",
      null,
      seeded.dev.accountId,
    );
    await seeded.sql`select public.prd_question_outcome(
      ${seeded.projectId}::uuid,
      ${sideId}::uuid,
      ${JSON.stringify({ kind: "final-answer", message: recorded.id, answer: "One month ahead." })}::text::jsonb
    )`;
    const completeView = await readSnapshot(seeded, seeded.dev);
    expect(questionBy(completeView, postedId).kind, "the answer is complete").toBe("complete");
    expectRefusal(
      await send(
        seeded,
        seeded.dev,
        { kind: "main" },
        { kind: "use-answer", questionId: postedId, answer: null, note: "" },
        completeView.revision + 1,
        crypto.randomUUID(),
      ),
      "stale",
      "use-answer with an old revision",
    );
    expect(questionBy(await readSnapshot(seeded, seeded.dev), postedId).kind).toBe("complete");
    expect(await openTurns(seeded, seeded.dev.accountId), "using an answer needs no turn the developer owns").toBe(0);
    const used = landedSend(
      await send(
        seeded,
        seeded.dev,
        { kind: "main" },
        { kind: "use-answer", questionId: postedId, answer: null, note: "" },
        completeView.revision,
        crypto.randomUUID(),
      ),
      "the developer uses a complete answer",
    );
    expect(questionBy(await readSnapshot(seeded, seeded.dev), postedId).kind).toBe("used");
    await finishTurn(seeded, used.turnId);

    const drafted = await functionPost(
      seeded.stack,
      "prd-draft",
      { projectId: seeded.projectId, key: "main", text: DEV_DRAFT },
      seeded.dev.token,
    );
    expect(drafted.status, JSON.stringify(drafted.json)).toBe(200);
    const devView = await readSnapshot(seeded, seeded.dev);
    const ngoView = await readSnapshot(seeded, seeded.ngo);
    expect(devView.drafts.main).toBe(DEV_DRAFT);
    expect(ngoView.drafts.main).toBeUndefined();
    const ngoJson = JSON.stringify(ngoView);
    expect(ngoJson, "the NGO snapshot has no developer draft").not.toContain(DEV_DRAFT);
    expect(ngoJson.toLowerCase(), "the NGO snapshot has no development board").not.toContain("development board");
    expect(ngoJson, "the NGO snapshot has no Linear").not.toContain("Linear");
    expectRefusal(
      await functionPost(seeded.stack, "prd-snapshot", { projectId: seeded.projectId }, seeded.stranger.token),
      "forbidden",
      "an unrelated account cannot read the snapshot",
    );

    const strangerSends: Array<{ scope: SendScope; label: string }> = [
      { scope: { kind: "main" }, label: "main" },
      { scope: { kind: "topic", topicId: "booking" }, label: "a topic chat" },
      { scope: { kind: "side", questionId: postedId }, label: "the posted side chat" },
      { scope: { kind: "side", questionId: heldId }, label: "a question still suggested" },
    ];
    for (const item of strangerSends) {
      expectRefusal(
        await send(
          seeded,
          seeded.stranger,
          item.scope,
          { kind: "text", text: "An unrelated account writes." },
          revision,
          crypto.randomUUID(),
        ),
        "forbidden",
        `an unrelated account is refused in ${item.label}`,
      );
    }
    for (const kind of EVERY_ACTION) {
      expectRefusal(
        await act(seeded, seeded.stranger, kind, actionToken(kind, postedId), crypto.randomUUID()),
        "forbidden",
        `an unrelated account is refused ${kind}`,
      );
    }

    const before = await readSnapshot(seeded, seeded.dev);
    const beforeStates = before.topics.map((topic) => ({ id: topic.id, state: topic.state }));
    expect(before.close.kind).toBe("open");
    for (const kind of ROLE_ACTIONS) {
      const token = actionToken(kind, postedId);
      expectRefusal(
        await act(seeded, seeded.ngo, kind, token, crypto.randomUUID()),
        "forbidden",
        `the NGO is refused ${kind}`,
      );
      expectRefusal(
        await act(seeded, seeded.dev, kind, token, crypto.randomUUID()),
        "not-yet",
        `the developer is refused ${kind}`,
      );
    }
    const after = await readSnapshot(seeded, seeded.dev);
    expect(after.sequence, "confirm, reopen, and close change nothing").toBe(before.sequence);
    expect(after.close.kind).toBe("open");
    expect(after.topics.map((topic) => ({ id: topic.id, state: topic.state }))).toEqual(beforeStates);

    throw new AtPending(
      "AT-036.09",
      "sut-missing",
      "Confirm, reopen and close are role-checked but have no effect until section states and closing the PRD are built, so they still answer not-yet for the developer. Changing the threshold or overriding scoring has no endpoint yet; the completion check is not in this tree yet.",
    );
  } finally {
    await seeded.sql.close();
  }
}

const WEEK_AHEAD = "Volunteers book themselves a week ahead.";
const MONTH_AHEAD = "Volunteers book themselves a month ahead.";
const RENAMED_BOOKING = "prd/who-books.md";
const UNKNOWN_PATH = "prd/notes.md";

function webhookSecret(): string {
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
    if (!trimmed.startsWith("GITHUB_WEBHOOK_SECRET=")) continue;
    let value = trimmed.slice("GITHUB_WEBHOOK_SECRET=".length).trim();
    const first = value[0];
    const last = value[value.length - 1];
    if (
      value.length >= 2 &&
      ((first === '"' && last === '"') || (first === "'" && last === "'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value === "") throw new Error("GITHUB_WEBHOOK_SECRET is empty");
    return value;
  }
  throw new Error("GITHUB_WEBHOOK_SECRET is missing from supabase/functions/.env");
}

function signDelivery(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

async function postDelivery(
  stack: Stack,
  event: string,
  body: string,
  signature: string,
): Promise<{ status: number; text: string }> {
  const response = await fetch(`${stack.apiUrl.replace(/\/$/, "")}/functions/v1/prd-github-hook`, {
    method: "POST",
    headers: {
      apikey: stack.anonKey,
      Authorization: `Bearer ${stack.anonKey}`,
      "content-type": "application/json",
      "x-github-event": event,
      "x-hub-signature-256": signature,
    },
    body,
  });
  return { status: response.status, text: await response.text() };
}

function realtimeClient(stack: Stack) {
  return createClient(stack.apiUrl, stack.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function channelStatus(channel: RealtimeChannel, timeoutMs: number): Promise<string> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("TIMED_OUT"), timeoutMs);
    channel.subscribe((status) => {
      if (
        status === "SUBSCRIBED" ||
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        clearTimeout(timer);
        resolve(status);
      }
    });
  });
}

function sequenceOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

async function nextSequence(heard: readonly number[], held: number): Promise<number> {
  const start = Date.now();
  for (;;) {
    const found = heard.find((sequence) => sequence > held);
    if (found !== undefined) return found;
    if (Date.now() - start >= 30_000) {
      throw new Error(
        `the channel did not hear a sequence above ${held}; heard ${JSON.stringify(heard)}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function ngoSnapshot(seeded: Seed): Promise<PrdSnapshot> {
  const read = await functionPost(
    seeded.stack,
    "prd-snapshot",
    { projectId: seeded.projectId },
    seeded.ngo.token,
  );
  expect(read.status, JSON.stringify(read.json)).toBe(200);
  return parsePrdSnapshot(read.json);
}

function topicById(snapshot: PrdSnapshot, id: string) {
  const topic = snapshot.topics.find((item) => item.id === id);
  if (topic === undefined) throw new Error(`missing topic ${id}`);
  return topic;
}

async function mainSha(client: GithubRepo, repo: string): Promise<string> {
  const head = await client.head(repo);
  if (!head.ok) throw new Error(head.reason);
  if ("missing" in head) throw new Error("main is not a branch");
  return head.sha;
}

async function sectionFile(client: GithubRepo, repo: string, sha: string, path: string) {
  const tree = await client.prdTree(repo, sha);
  if (!tree.ok) throw new Error(tree.reason);
  const file = tree.files.find((item) => item.path === path);
  if (file === undefined) throw new Error(`${path} is not in the tree`);
  const blobs = await client.readBlobs(repo, [file.sha]);
  if (!blobs.ok) throw new Error(blobs.reason);
  const text = blobs.blobs[0]?.text;
  if (text === undefined) throw new Error(`${path} had no blob text`);
  const parsed = parseSection(text);
  if (!parsed.ok) throw new Error(`${path}: ${parsed.reason}`);
  return parsed.file;
}

async function commitOnMain(
  client: GithubRepo,
  repo: string,
  files: { path: string; content: string | null }[],
  message: string,
): Promise<{ sha: string; login: string }> {
  const parent = await mainSha(client, repo);
  const written = await client.writeCommit(repo, parent, files, message);
  if (!written.ok) throw new Error(written.reason);
  const moved = await client.advance(repo, written.sha);
  if (!moved.ok) throw new Error(moved.reason);
  if (moved.result !== "advanced") throw new Error(`main did not advance: ${moved.result}`);
  const since = await client.commitsSince(repo, parent, written.sha);
  if (!since.ok) throw new Error(since.reason);
  if (since.result !== "commits") throw new Error("the outside commit is not on the line");
  const login = since.commits[since.commits.length - 1]?.committerLogin;
  if (typeof login !== "string" || login === "") throw new Error("the outside commit names no committer");
  return { sha: written.sha, login };
}

async function deliver(
  stack: Stack,
  body: string,
  signature: string,
): Promise<{ status: number; text: string }> {
  return postDelivery(stack, "push", body, signature);
}

async function filePath(seeded: Seed, key: string): Promise<string> {
  const rows = (await seeded.sql`select file_path from public.prd_sections
    where project_id = ${seeded.projectId}::uuid and stable_key = ${key}`) as Array<{
    file_path: string;
  }>;
  const path = rows[0]?.file_path;
  if (typeof path !== "string" || path === "") throw new Error(`${key} has no file path`);
  return path;
}

async function proveOutsideReaches(
  seeded: Seed,
  heldSequence: number,
  heldRevision: number,
): Promise<void> {
  const loaded = loadGithubTest();
  if (!loaded.ok) throw new Error(loaded.reason);
  const secret = webhookSecret();
  const rows = (await seeded.sql`select repo_name, repo_id from public.prd_records
    where project_id = ${seeded.projectId}::uuid`) as Array<{
    repo_name: string;
    repo_id: unknown;
  }>;
  const repoName = String(rows[0]?.repo_name ?? "");
  const repoId = asNumber(rows[0]?.repo_id);
  const body = JSON.stringify({ repository: { id: repoId }, commits: [{ message: "ignored" }] });
  const signature = signDelivery(secret, body);
  const client = loaded.client;

  const outsider = await user(
    seeded.stack,
    `outsider-${crypto.randomUUID()}@example.com`,
    "ngo",
    "Other Org",
    seeded.sql,
  );
  const orgs = (await seeded.sql`insert into public.organizations (name)
    values ('Other Kitchen') returning id`) as Array<{ id: string }>;
  await seeded.sql`insert into public.org_memberships (org_id, account_id, role)
    values (${String(orgs[0].id)}::uuid, ${outsider.accountId}::uuid, 'admin')`;

  const ngoClient = realtimeClient(seeded.stack);
  const otherClient = realtimeClient(seeded.stack);
  await ngoClient.realtime.setAuth(seeded.ngo.token);
  await otherClient.realtime.setAuth(outsider.token);
  const heard: number[] = [];
  const topic = `prd:${seeded.projectId}`;
  const ngoChannel = ngoClient.channel(topic, { config: { private: true } });
  ngoChannel.on("broadcast", { event: "sequence" }, (message: { payload?: { sequence?: unknown } }) => {
    const sequence = sequenceOf(message.payload?.sequence);
    if (sequence !== null) heard.push(sequence);
  });
  const otherChannel = otherClient.channel(topic, { config: { private: true } });
  try {
    const [ngoStatus, otherStatus] = await Promise.all([
      channelStatus(ngoChannel, 15_000),
      channelStatus(otherChannel, 15_000),
    ]);
    expect(ngoStatus, "the NGO subscribes to the project channel").toBe("SUBSCRIBED");
    expect(otherStatus, "another organisation is refused the project channel").toBe("CHANNEL_ERROR");

    const bookingPath = sectionPath("booking");
    const bookingFile = await sectionFile(client, repoName, await mainSha(client, repoName), bookingPath);
    const edited = {
      ...bookingFile.document,
      statements: bookingFile.document.statements.map((statement, index) =>
        index === 0 ? { text: WEEK_AHEAD, sources: statement.sources } : statement,
      ),
    };
    const pushed = await commitOnMain(
      client,
      repoName,
      [{ path: bookingPath, content: renderSection({ key: bookingFile.key, title: bookingFile.title, document: edited }) }],
      "Edit who books shifts",
    );
    const delivered = await deliver(seeded.stack, body, signature);
    expect(delivered.status, delivered.text).toBe(200);
    const sequence = await nextSequence(heard, heldSequence);
    expect(sequence).toBeGreaterThan(heldSequence);
    const afterPush = await ngoSnapshot(seeded);
    const booking = topicById(afterPush, "booking");
    expect(booking.statements).toContain(WEEK_AHEAD);
    expect(afterPush.revision).toBeGreaterThan(heldRevision);
    expect(booking.author).toBe(pushed.login);

    const forged = await deliver(seeded.stack, body, `sha256=${"0".repeat(64)}`);
    expect(forged.status).toBe(401);
    const afterForgery = await ngoSnapshot(seeded);
    expect(afterForgery.sequence).toBe(afterPush.sequence);
    expect(topicById(afterForgery, "booking").statements).toEqual(booking.statements);

    const replay = await deliver(seeded.stack, body, signature);
    expect(replay.status, replay.text).toBe(200);
    const afterReplay = await ngoSnapshot(seeded);
    expect(afterReplay.sequence).toBe(afterPush.sequence);
    expect(afterReplay.revision).toBe(afterPush.revision);
    expect(topicById(afterReplay, "booking").statements).toEqual(booking.statements);

    const current = await sectionFile(client, repoName, await mainSha(client, repoName), bookingPath);
    const later = {
      ...current.document,
      statements: current.document.statements.map((statement, index) =>
        index === 0 ? { text: MONTH_AHEAD, sources: statement.sources } : statement,
      ),
    };
    await commitOnMain(
      client,
      repoName,
      [{ path: bookingPath, content: renderSection({ key: current.key, title: current.title, document: later }) }],
      "Edit booking again",
    );
    // Test-only write. The product never rewinds synced_at; this makes the next load look stale.
    await seeded.sql`update public.prd_records
      set synced_at = clock_timestamp() - interval '2 minutes'
      where project_id = ${seeded.projectId}::uuid`;
    const stale = await ngoSnapshot(seeded);
    expect(topicById(stale, "booking").statements).toContain(WEEK_AHEAD);
    expect(topicById(stale, "booking").statements).not.toContain(MONTH_AHEAD);
    const started = Date.now();
    let caught = stale;
    for (;;) {
      caught = await ngoSnapshot(seeded);
      if (topicById(caught, "booking").statements.includes(MONTH_AHEAD)) break;
      if (Date.now() - started >= 60_000) {
        throw new Error("the stale load did not pick up the outside edit within 60s");
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    expect(topicById(caught, "booking").statements).toContain(MONTH_AHEAD);

    await commitOnMain(
      client,
      repoName,
      [{ path: sectionPath("rules"), content: null }],
      "Remove the rules file",
    );
    const removedDelivery = await deliver(seeded.stack, body, signature);
    expect(removedDelivery.status, removedDelivery.text).toBe(200);
    const removed = await ngoSnapshot(seeded);
    const rules = topicById(removed, "rules");
    expect(rules.blocker).toBe("the file was removed from the repository");
    expect(rules.statements).toEqual([]);

    const beforeRename = await ngoSnapshot(seeded);
    const liveBooking = await sectionFile(
      client,
      repoName,
      await mainSha(client, repoName),
      bookingPath,
    );
    await commitOnMain(
      client,
      repoName,
      [
        { path: bookingPath, content: null },
        { path: RENAMED_BOOKING, content: renderSection(liveBooking) },
      ],
      "Rename the booking file",
    );
    const renamedDelivery = await deliver(seeded.stack, body, signature);
    expect(renamedDelivery.status, renamedDelivery.text).toBe(200);
    const renamed = await ngoSnapshot(seeded);
    expect(renamed.topics.map((item) => item.id)).toContain("booking");
    expect(topicById(renamed, "booking").statements).toEqual(topicById(beforeRename, "booking").statements);
    expect(await filePath(seeded, "booking")).toBe(RENAMED_BOOKING);

    const raw = "not a section";
    const unreadable = parseSection(raw);
    if (unreadable.ok) throw new Error("expected the replacement file to fail parsing");
    await commitOnMain(client, repoName, [{ path: RENAMED_BOOKING, content: raw }], "Break the booking file");
    const brokenDelivery = await deliver(seeded.stack, body, signature);
    expect(brokenDelivery.status, brokenDelivery.text).toBe(200);
    const broken = topicById(await ngoSnapshot(seeded), "booking");
    expect(broken.blocker).toBe(unreadable.reason);

    const beforeUnknown = await ngoSnapshot(seeded);
    const note = renderSection({
      key: "mystery",
      title: "Notes",
      document: { statements: [{ text: "This key is not a topic.", sources: [] }], decisions: [] },
    });
    const unknown = await commitOnMain(
      client,
      repoName,
      [{ path: UNKNOWN_PATH, content: note }],
      "Add a file with an unknown key",
    );
    const unknownDelivery = await deliver(seeded.stack, body, signature);
    expect(unknownDelivery.status, unknownDelivery.text).toBe(200);
    const afterUnknown = await ngoSnapshot(seeded);
    expect(afterUnknown.topics.map((item) => item.id)).toEqual(beforeUnknown.topics.map((item) => item.id));
    expect(afterUnknown.topics.some((item) => item.id === "mystery")).toBe(false);
    for (const item of beforeUnknown.topics) {
      expect(topicById(afterUnknown, item.id).statements).toEqual([...item.statements]);
    }
    expect(afterUnknown.sequence).toBe(beforeUnknown.sequence);
    const unknownRows = (await seeded.sql`select reason from public.prd_unknown_files
      where project_id = ${seeded.projectId}::uuid and file_path = ${UNKNOWN_PATH}`) as Array<{
      reason: string;
    }>;
    expect(unknownRows.map((row) => row.reason)).toContain("the file key is not a section");
    const head = (await seeded.sql`select head_commit from public.prd_records
      where project_id = ${seeded.projectId}::uuid`) as Array<{ head_commit: string }>;
    expect(String(head[0]?.head_commit).toLowerCase()).toBe(unknown.sha.toLowerCase());
  } finally {
    await ngoClient.removeChannel(ngoChannel);
    await otherClient.removeChannel(otherChannel);
  }
}
