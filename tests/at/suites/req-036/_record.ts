import { expect } from "vitest";
import { AtPending } from "../../harness/registry.ts";
import {
  authPost,
  functionPost,
  functionPostRaw,
  sqlClient,
  stackFromEnv,
  type Stack,
} from "../../harness/live-stack.ts";
import { parsePrdSnapshot, type PrdSnapshot } from "../../../../src/lib/prd-stream.ts";
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
const DEV_DRAFT = "Dev draft the NGO must not see";
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
  sideKey: string;
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
    sideKey: `side:${crypto.randomUUID()}`,
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

async function open(seeded: Seed, person: Person) {
  return functionPost(
    seeded.stack,
    "prd-open",
    { organizationId: seeded.organizationId, projectId: seeded.projectId },
    person.token,
  );
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
  expect(snapshot.canWrite.main).toBe(false);
  expect(snapshot.send.main).toEqual({
    kind: "unavailable",
    block: "role",
    reason: "Not available yet.",
  });
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
    expect(bookingDocument.technicalScope).toBeNull();

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

    throw new AtPending(
      "AT-036.01",
      "sut-missing",
      "The PM scope requirements and the Author the project PRD bootstrap are not in this tree, so this case cannot prove them.",
    );
  } finally {
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
    const versions = (await seeded.sql`insert into public.prd_section_versions
      (project_id, section_id, document)
      values (${seeded.projectId}::uuid, ${sections[0].id}::uuid, ${JSON.stringify(document)}::text::jsonb)
      returning id`) as Array<{ id: string }>;
    await seeded.sql`insert into public.prd_revisions (project_id, revision, discovery_revision, manifest)
      select project_id, 2, discovery_revision,
             manifest || jsonb_build_object('technical-scope', ${versions[0].id}::text)
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

    const sequences = [
      await append(seeded, "main", "dev", DEV_NAME, DEV_SHARED, null, seeded.dev.accountId),
      await append(seeded, "main", "ai", "ai4good AI", AI_SHARED, null, seeded.dev.accountId),
      await append(
        seeded,
        "topic:booking",
        "dev",
        DEV_NAME,
        BOOKING_LINE,
        null,
        seeded.dev.accountId,
      ),
      await append(seeded, seeded.sideKey, "ngo", NGO_NAME, NGO_SIDE, null, seeded.ngo.accountId),
      await append(seeded, "main", "dev", DEV_NAME, DEV_PRIVATE, "dev", seeded.dev.accountId),
    ];
    expect(sequences.map((row) => whole(row.sequence))).toEqual([2, 3, 4, 5, 6]);

    const beforeDrafts = await functionPostRaw(
      seeded.stack,
      "prd-snapshot",
      { projectId: seeded.projectId, sinceSequence: 6 },
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
    expect(snapshotOf(emptyDraft.json).sequence).toBe(6);
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
      { projectId: seeded.projectId, key: seeded.sideKey, text: NGO_DRAFT },
      seeded.ngo.token,
    );
    expect(devMain.status).toBe(200);
    expect(devTopic.status).toBe(200);
    expect(ngoDraft.status).toBe(200);
    expect(snapshotOf(ngoDraft.json).sequence).toBe(6);
    const afterDrafts = await functionPostRaw(
      seeded.stack,
      "prd-snapshot",
      { projectId: seeded.projectId, sinceSequence: 6 },
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
    expect(devSnapshot.sequence).toBe(6);
    expect(devSnapshot.revision).toBe(1);
    expect(ngoSnapshot.sequence).toBe(6);
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
    expect(devSnapshot.chats[seeded.sideKey].map((message) => message.metadata)).toEqual([
      expect.objectContaining({ actor: "ngo", name: NGO_NAME }),
    ]);
    expect(ngoSnapshot.chats.main.map((message) => message.parts)).toEqual([
      [{ type: "text", text: DEV_SHARED }],
      [{ type: "text", text: AI_SHARED }],
    ]);
    expect(ngoSnapshot.chats[seeded.sideKey][0].parts).toEqual([{ type: "text", text: NGO_SIDE }]);
    expect(JSON.stringify(ngoSnapshot)).not.toContain(DEV_PRIVATE);
    expect(JSON.stringify(ngoSnapshot)).not.toContain(DEV_DRAFT);
    expect(JSON.stringify(ngoSnapshot)).not.toContain(DEV_TOPIC_DRAFT);
    expect(devSnapshot.drafts).toEqual({ main: DEV_DRAFT, "topic:booking": DEV_TOPIC_DRAFT });
    expect(ngoSnapshot.drafts).toEqual({ [seeded.sideKey]: NGO_DRAFT });
    expect(JSON.stringify(devSnapshot)).not.toContain(NGO_DRAFT);

    const tally = await counts(
      seeded.sql,
      seeded.projectId,
      seeded.dev.accountId,
      seeded.ngo.accountId,
      seeded.organizationId,
    );
    expect(tally.sequence).toBe(6);
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
