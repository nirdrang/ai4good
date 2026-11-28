import { authPost, type Stack } from "../../harness/live-stack.ts";
import { loadGithubTest } from "../../harness/github.ts";
import { renderSection, type SectionFile } from "../../../../supabase/functions/_shared/prd/file.ts";
import type { Scope } from "../../../../supabase/functions/_shared/scope.ts";
import type { PrdScenario } from "./_screen.ts";
import {
  APOSTROPHE,
  AI_NAME,
  DEV_NAME,
  OPEN_QUESTION,
  PUBLISH_QUESTION,
  PUBLISH_WHY,
  RETENTION_ANSWER,
  RETENTION_QUESTION,
  SATURDAY_LINE,
  SEVEN_STORIES,
  SHIFTS_OPENER,
  SUCCESS_QUESTION,
  SWAP_QUESTION,
  SWAP_WHY,
  TOPIC,
} from "./_phrases.ts";
import {
  commitOnMain,
  credit,
  deliver,
  open,
  seed,
  signDelivery,
  webhookSecret,
} from "./_record.ts";

const PASSWORD = "correct horse battery staple";
const DISCOVERY_REVISION = 12;
const MONDAY_CHAT = `Monday${APOSTROPHE}s chat`;
const SOURCES = [`Discovery revision ${DISCOVERY_REVISION}`, MONDAY_CHAT];
const RETENTION_OPTIONS = [
  "12 months after their last shift",
  "Until the volunteer asks to be removed",
  "24 months after their last shift",
];
const RETENTION_WHY = "only the kitchen can decide what it keeps about people.";
const SUCCESS_OPTIONS = ["Fewer hours on the Saturday rota", "Volunteers fill the shifts themselves"];
const SUCCESS_WHY = "the kitchen has not said what finished looks like.";
const SWAP_OPTIONS = [
  "Volunteers swap with each other",
  "The coordinator approves each swap",
  "No swaps; volunteers cancel instead",
];
const PUBLISH_OPTIONS = ["Two weeks ahead", "One month ahead", "Every Monday for the next week"];

type Seeded = Awaited<ReturnType<typeof seed>>;
type Part = { type: string; text?: string; data?: Record<string, unknown> };

const noted: number[] = [];

export function resetScreenSpend(): void {
  noted.length = 0;
}

export function noteScreenSpend(micros: number): void {
  noted.push(micros);
}

export function screenSpend(): number {
  return noted.reduce((sum, item) => sum + item, 0);
}

function whole(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  throw new Error(`expected a whole number, got ${JSON.stringify(value)}`);
}

function asRecord(value: unknown): Record<string, unknown> {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`expected a record, got ${JSON.stringify(value)}`);
  }
  return parsed as Record<string, unknown>;
}

function statement(text: string) {
  return { text, sources: [...SOURCES] };
}

function scopeDocument(): Scope {
  return {
    summary: "A small tool for the kitchen's volunteer rota.",
    userStories: Array.from({ length: 7 }, (_, index) => ({
      story: `Story ${index + 1}: a volunteer uses the rota.`,
      acceptanceCriteria: ["The volunteer can see the shift."],
    })),
    suggestedStack: ["Supabase"],
    complexity: {
      tier: "small",
      rationale: "One kitchen and one rota.",
      startSmallAdvice: "Start with Saturday shifts.",
    },
    riskFlags: [],
    dataSensitivity: { tier: "tier1", rationale: "Volunteer contact details." },
    maintainabilityFit: { verdict: "fit", rationale: "A small rota fits a small tool." },
    causeLabels: ["food security"],
  };
}

function sectionFile(key: string, title: string): SectionFile {
  if (key === "users") {
    return {
      key,
      title,
      document: {
        statements: [statement("Coordinators and shift leads run the kitchen.")],
        decisions: [],
      },
    };
  }
  if (key === "shifts") {
    return {
      key,
      title,
      document: { statements: [statement(SATURDAY_LINE), statement(OPEN_QUESTION)], decisions: [] },
    };
  }
  if (key === "notify") {
    return {
      key,
      title,
      document: {
        statements: [statement("An email goes out 24 hours before each shift.")],
        decisions: [],
      },
    };
  }
  if (key === "data") {
    return {
      key,
      title,
      document: {
        statements: [statement("Volunteer contact details are kept while the kitchen decides the rule.")],
        decisions: [],
      },
    };
  }
  if (key === "success") {
    return {
      key,
      title,
      document: {
        statements: [statement("The kitchen has not said what success looks like.")],
        decisions: [],
      },
    };
  }
  if (key === "technical-scope") {
    return {
      key,
      title,
      document: { statements: [statement(SEVEN_STORIES)], decisions: [], technicalScope: scopeDocument() },
    };
  }
  throw new Error(`${key} has no screen document`);
}

function agreed(id: string, title: string, answer: string) {
  return {
    id,
    title,
    required: true,
    state: {
      kind: "agreed",
      answer,
      source: { kind: "chat", round: 1 },
      answerMessageId: null,
    },
  };
}

function openTopic(id: string, title: string) {
  return { id, title, required: true, state: { kind: "open" } };
}

function discoveryDocument(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    need: { text: "Schedule volunteers", source: { kind: "intake" } },
    usersToday: { text: "", source: { kind: "intake" } },
    successMeasure: null,
    topicOrder: ["users", "shifts", "notify", "data", "success"],
    topics: {
      users: agreed("users", TOPIC.users, "Coordinators and shift leads run the kitchen."),
      shifts: agreed("shifts", TOPIC.shifts, SATURDAY_LINE),
      notify: agreed("notify", TOPIC.notify, "An email goes out 24 hours before each shift."),
      data: openTopic("data", TOPIC.data),
      success: openTopic("success", TOPIC.success),
    },
    dependsOn: {},
    fileFacts: [],
  };
}

async function sessionFor(stack: Stack, email: string): Promise<Record<string, unknown>> {
  const signedIn = await authPost(stack, "/auth/v1/token?grant_type=password", {
    email,
    password: PASSWORD,
  });
  if (signedIn.status !== 200 || typeof signedIn.json.access_token !== "string") {
    throw new Error(`sign-in for ${email} answered ${signedIn.status}`);
  }
  if (typeof signedIn.json.expires_at === "number") return signedIn.json;
  const expiresIn = typeof signedIn.json.expires_in === "number" ? signedIn.json.expires_in : 3600;
  return { ...signedIn.json, expires_at: Math.floor(Date.now() / 1000) + expiresIn };
}

async function plantDiscovery(seeded: Seeded): Promise<void> {
  await seeded.sql`insert into public.brief_revisions (project_id, revision, document, created_by)
    values (
      ${seeded.projectId}::uuid, ${DISCOVERY_REVISION},
      ${JSON.stringify(discoveryDocument())}::text::jsonb, ${seeded.ngo.accountId}::uuid
    )`;
  await seeded.sql`insert into public.discovery_confirmations
    (project_id, revision, actor_id, actor_name, confirmed_at, accepted_gaps)
    values (
      ${seeded.projectId}::uuid, ${DISCOVERY_REVISION}, ${seeded.ngo.accountId}::uuid,
      'Maya Levi', clock_timestamp(), '[]'::jsonb
    )`;
}

async function importSections(seeded: Seeded): Promise<void> {
  const loaded = loadGithubTest();
  if (!loaded.ok) throw new Error(loaded.reason);
  const repos = (await seeded.sql`select repo_name, repo_id from public.prd_records
    where project_id = ${seeded.projectId}::uuid`) as Array<{ repo_name: string; repo_id: unknown }>;
  const repo = String(repos[0]?.repo_name ?? "");
  if (repo === "") throw new Error("the opened PRD has no repository");
  const repoId = whole(repos[0]?.repo_id);
  const sections = (await seeded.sql`select stable_key, title, file_path from public.prd_sections
    where project_id = ${seeded.projectId}::uuid order by ordinal`) as Array<{
    stable_key: string;
    title: string;
    file_path: string;
  }>;
  const files = sections.map((row) => ({
    path: row.file_path,
    content: renderSection(sectionFile(row.stable_key, row.title)),
  }));
  await commitOnMain(loaded.client, repo, files, "Write the PRD sections for the screen.");
  const body = JSON.stringify({ repository: { id: repoId }, commits: [{ message: "ignored" }] });
  const posted = await deliver(seeded.stack, body, signDelivery(webhookSecret(), body));
  if (posted.status !== 200) {
    throw new Error(`the section import answered ${posted.status}: ${posted.text}`);
  }
  const documents = (await seeded.sql`select s.stable_key, v.document
    from public.prd_sections s
    join public.prd_records r on r.project_id = s.project_id
    join public.prd_revisions rev
      on rev.project_id = s.project_id and rev.revision = r.current_revision
    join public.prd_section_versions v on v.id = (rev.manifest->>s.stable_key)::uuid
    where s.project_id = ${seeded.projectId}::uuid`) as Array<{
    stable_key: string;
    document: unknown;
  }>;
  const byKey = new Map(documents.map((row) => [row.stable_key, asRecord(row.document)]));
  const users = statements(byKey.get("users"));
  const userSources = users[0]?.sources ?? [];
  if (userSources[0] !== SOURCES[0] || userSources[1] !== SOURCES[1]) {
    throw new Error(`the users section did not import its sources: ${JSON.stringify(userSources)}`);
  }
  const shifts = statements(byKey.get("shifts")).map((item) => item.text);
  if (!shifts.includes(SATURDAY_LINE) || !shifts.includes(OPEN_QUESTION)) {
    throw new Error(`the shifts section did not import: ${JSON.stringify(shifts)}`);
  }
  const scope = asRecord(byKey.get("technical-scope")?.technicalScope);
  if (!Array.isArray(scope.userStories) || scope.userStories.length !== 7) {
    throw new Error("the technical scope did not import seven stories");
  }
}

function statements(document: Record<string, unknown> | undefined): { text: string; sources: string[] }[] {
  if (!document || !Array.isArray(document.statements)) return [];
  return document.statements.map((item) => {
    const statement = asRecord(item);
    const sources = Array.isArray(statement.sources) ? statement.sources.map(String) : [];
    return { text: String(statement.text ?? ""), sources };
  });
}

async function setStates(seeded: Seeded, scenario: PrdScenario): Promise<void> {
  const states: Record<string, string> =
    scenario === "check-passed"
      ? {
          users: "confirmed",
          shifts: "confirmed",
          notify: "confirmed",
          data: "confirmed",
          success: "confirmed",
          "technical-scope": "confirmed",
        }
      : {
          users: "confirmed",
          shifts: "draft",
          notify: "ready",
          data: "draft",
          success: "open",
          "technical-scope": "needs-review",
        };
  for (const [key, state] of Object.entries(states)) {
    await seeded.sql`update public.prd_sections set state = ${state}
      where project_id = ${seeded.projectId}::uuid and stable_key = ${key}`;
  }
  const rows = (await seeded.sql`select stable_key, state from public.prd_sections
    where project_id = ${seeded.projectId}::uuid`) as Array<{ stable_key: string; state: string }>;
  for (const row of rows) {
    const expected = states[row.stable_key];
    if (expected !== undefined && row.state !== expected) {
      throw new Error(`${row.stable_key} is ${row.state}, not ${expected}`);
    }
  }
}

async function mainChat(seeded: Seeded): Promise<string> {
  const rows = (await seeded.sql`select id from public.prd_chats
    where project_id = ${seeded.projectId}::uuid and kind = 'main'`) as Array<{ id: string }>;
  const id = String(rows[0]?.id ?? "");
  if (id === "") throw new Error("the main chat is missing");
  return id;
}

async function plantHistory(seeded: Seeded): Promise<void> {
  const chat = await mainChat(seeded);
  const lines: { at: string; kind: string; name: string; actor: string | null; text: string }[] = [
    {
      at: "2026-10-05T12:00:00Z",
      kind: "dev",
      name: DEV_NAME,
      actor: seeded.dev.accountId,
      text: "About 60 active volunteers and 3 shift leads.",
    },
    {
      at: "2026-10-06T12:00:00Z",
      kind: "ai",
      name: AI_NAME,
      actor: null,
      text: "What stack do you suggest?",
    },
    {
      at: "2026-10-07T12:00:00Z",
      kind: "dev",
      name: DEV_NAME,
      actor: seeded.dev.accountId,
      text: "Saturdays have two shifts.",
    },
  ];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    await seeded.sql`insert into public.prd_messages
      (project_id, chat_id, ordinal, actor_kind, actor_name, actor_id, parts, created_at)
      values (
        ${seeded.projectId}::uuid, ${chat}::uuid, ${index + 1}, ${line.kind}, ${line.name},
        ${line.actor}::uuid, ${JSON.stringify([{ type: "text", text: line.text }])}::text::jsonb,
        ${line.at}::timestamptz
      )`;
  }
  await append(seeded, "main", "ai", AI_NAME, null, [
    { type: "text", text: "The PRD is open from Discovery revision 12." },
  ]);
}

async function append(
  seeded: Seeded,
  key: string,
  kind: string,
  name: string,
  actorId: string | null,
  parts: Part[],
): Promise<string> {
  const rows =
    actorId === null
      ? ((await seeded.sql`select public.prd_append_message(
          ${seeded.projectId}::uuid, ${key}, ${kind}, ${name},
          ${JSON.stringify(parts)}::text::jsonb, null, null
        ) as r`) as Array<{ r: unknown }>)
      : ((await seeded.sql`select public.prd_append_message(
          ${seeded.projectId}::uuid, ${key}, ${kind}, ${name},
          ${JSON.stringify(parts)}::text::jsonb, null, ${actorId}::uuid
        ) as r`) as Array<{ r: unknown }>);
  const id = asRecord(rows[0]?.r).id;
  if (typeof id !== "string" || id === "") throw new Error(`no message on ${key}`);
  return id;
}

async function sectionChat(seeded: Seeded, key: string): Promise<string> {
  const rows = (await seeded.sql`select c.id from public.prd_chats c
    join public.prd_sections s on s.id = c.section_id
    where c.project_id = ${seeded.projectId}::uuid and c.kind = 'section' and s.stable_key = ${key}`) as Array<{
    id: string;
  }>;
  const id = String(rows[0]?.id ?? "");
  if (id === "") throw new Error(`${key} has no section chat`);
  return id;
}

async function plantDevQuestions(seeded: Seeded): Promise<void> {
  const chat = await sectionChat(seeded, "shifts");
  const opener = await append(seeded, "topic:shifts", "ai", AI_NAME, null, [
    { type: "text", text: SHIFTS_OPENER },
  ]);
  const asked = (await seeded.sql`select public.prd_question_outcome(
    ${seeded.projectId}::uuid, ${chat}::uuid, ${JSON.stringify({
      kind: "ask",
      message: opener,
      questions: [
        {
          section: "shifts",
          text: SWAP_QUESTION,
          why: SWAP_WHY,
          options: SWAP_OPTIONS,
          suggested: "The coordinator approves each swap",
        },
        {
          section: "shifts",
          text: PUBLISH_QUESTION,
          why: PUBLISH_WHY,
          options: PUBLISH_OPTIONS,
          suggested: "Two weeks ahead",
        },
      ],
    })}::text::jsonb
  ) as r`) as Array<{ r: unknown }>;
  const questions = asRecord(asked[0]?.r).questions;
  if (!Array.isArray(questions) || questions.length !== 2) {
    throw new Error(`the shift questions were not asked: ${JSON.stringify(asked[0]?.r)}`);
  }
  await append(seeded, "topic:shifts", "ai", AI_NAME, null, [
    { type: "data-dev-questions", data: { ids: questions.map(String) } },
  ]);
}

async function plantNgoQuestion(
  seeded: Seeded,
  section: string,
  body: string,
  why: string,
  options: string[],
  blocking: boolean,
): Promise<string> {
  const id = crypto.randomUUID();
  const intro = await append(seeded, "main", "ai", AI_NAME, null, [
    { type: "text", text: body },
    { type: "data-ngo-question", data: { questionId: id } },
  ]);
  const inserted = (await seeded.sql`insert into public.prd_questions
    (id, project_id, section_id, audience, status, body, why_now, options, blocking, intro_message)
    select ${id}::uuid, ${seeded.projectId}::uuid, s.id, 'ngo', 'suggested', ${body}, ${why},
      array(select jsonb_array_elements_text(${JSON.stringify(options)}::text::jsonb)),
      ${blocking}, ${intro}::uuid
    from public.prd_sections s
    where s.project_id = ${seeded.projectId}::uuid and s.stable_key = ${section}
    returning id`) as Array<{ id: string }>;
  if (inserted.length !== 1) throw new Error(`${section} did not take its question`);
  return id;
}

async function plantQuestions(seeded: Seeded, complete: boolean): Promise<void> {
  await plantDevQuestions(seeded);
  const retention = await plantNgoQuestion(
    seeded,
    "data",
    RETENTION_QUESTION,
    RETENTION_WHY,
    RETENTION_OPTIONS,
    true,
  );
  await plantNgoQuestion(seeded, "success", SUCCESS_QUESTION, SUCCESS_WHY, SUCCESS_OPTIONS, true);
  await seeded.sql`select public.prd_question_post(
    ${seeded.dev.accountId}::uuid, ${seeded.projectId}::uuid, ${retention}::uuid, 1
  )`;
  if (!complete) return;
  const chats = (await seeded.sql`select id from public.prd_chats
    where project_id = ${seeded.projectId}::uuid and kind = 'side' and question_id = ${retention}::uuid`) as Array<{
    id: string;
  }>;
  const side = String(chats[0]?.id ?? "");
  if (side === "") throw new Error("the retention question has no side chat");
  const message = await append(seeded, `side:${retention}`, "ngo", "Maya (NGO)", seeded.ngo.accountId, [
    { type: "text", text: "Keep them for a year." },
  ]);
  await seeded.sql`select public.prd_question_outcome(
    ${seeded.projectId}::uuid, ${side}::uuid, ${JSON.stringify({
      kind: "final-answer",
      message,
      answer: RETENTION_ANSWER,
    })}::text::jsonb
  )`;
}

async function plantPassingCheck(seeded: Seeded): Promise<void> {
  const chat = await mainChat(seeded);
  const turns = (await seeded.sql`insert into public.prd_turns (
      project_id, chat_id, actor_id, request_id, body_hash, base_revision,
      conversation_revision, admitted_sequence, kind, state, message_id
    )
    select r.project_id, ${chat}::uuid, ${seeded.dev.accountId}::uuid, ${crypto.randomUUID()},
      ${`hash-${crypto.randomUUID()}`}, r.current_revision, c.conversation_revision,
      coalesce((select max(admitted_sequence) from public.prd_turns where project_id = r.project_id), 0) + 1,
      'check', 'answered', null
    from public.prd_records r
    join public.prd_chats c on c.id = ${chat}::uuid
    where r.project_id = ${seeded.projectId}::uuid
    returning id`) as Array<{ id: string }>;
  const turnId = String(turns[0]?.id ?? "");
  if (turnId === "") throw new Error("the passing check has no turn");
  await seeded.sql`insert into public.prd_checks
    (id, project_id, revision, score, threshold, passed, coverage_text, threshold_text, turn_id)
    select gen_random_uuid(), r.project_id, r.current_revision, 100, c.threshold, true,
      'A passing check for this revision, so the last confirm makes no model call.',
      c.threshold_text, ${turnId}::uuid
    from public.prd_records r, public.prd_check_config c
    where r.project_id = ${seeded.projectId}::uuid and c.key = 'completion'`;
  const ready = (await seeded.sql`select public.prd_close_ready(${seeded.projectId}::uuid) as ready`) as Array<{
    ready: boolean;
  }>;
  if (ready[0]?.ready !== true) throw new Error("the planted passing check did not make Close ready");
  const revisions = (await seeded.sql`select current_revision from public.prd_records
    where project_id = ${seeded.projectId}::uuid`) as Array<{ current_revision: unknown }>;
  const revision = whole(revisions[0]?.current_revision);
  await append(seeded, "main", "ai", AI_NAME, null, [
    { type: "text", text: "The completion check passed for this revision." },
    {
      type: "data-recommendation",
      data: { revision, close: { kind: "close", token: `close|close|${revision}|0` } },
    },
  ]);
}

async function modelCalls(seeded: Seeded, cutoff: Date | string): Promise<string[]> {
  const rows = (await seeded.sql`select t.kind, c.kind as chat
    from public.prd_turns t
    join public.prd_chats c on c.id = t.chat_id
    where t.project_id = ${seeded.projectId}::uuid
      and t.created_at > ${cutoff}::timestamptz
      and exists (
        select 1 from public.prd_provider_events e
        where e.turn_id = t.id and e.state = 'settled'
      )
    order by t.created_at, t.id`) as Array<{ kind: string; chat: string }>;
  return rows.map((row) => {
    if (row.kind === "check") return "prd-check";
    if (row.kind === "answer-write") return "prd-answer-write";
    if (row.kind === "reply" && row.chat === "side") return "prd-side-chat";
    if (row.kind === "reply") return "prd-chat";
    return `unmapped:${row.kind}/${row.chat}`;
  });
}

async function providerMicros(seeded: Seeded): Promise<number> {
  const rows = (await seeded.sql`select coalesce((sum(amount) * 1000000)::bigint, 0) as micros
    from public.prd_ledger_entries
    where project_id = ${seeded.projectId}::uuid and component = 'provider'`) as Array<{
    micros: unknown;
  }>;
  return whole(rows[0]?.micros);
}

export async function seedPrdScreen(scenario: PrdScenario) {
  if (
    scenario !== "prd-today" &&
    scenario !== "queue" &&
    scenario !== "answer-complete" &&
    scenario !== "check-passed"
  ) {
    throw new Error(`the screen seeder has no ${scenario} state`);
  }
  const seeded = await seed();
  try {
    await plantDiscovery(seeded);
    await credit(seeded, "20.000000");
    const opened = await open(seeded, seeded.dev);
    if (opened.status !== 200) {
      throw new Error(`prd-open answered ${opened.status}: ${JSON.stringify(opened.json)}`);
    }
    await importSections(seeded);
    await setStates(seeded, scenario);
    await plantHistory(seeded);
    if (scenario === "check-passed") await plantPassingCheck(seeded);
    else await plantQuestions(seeded, scenario === "answer-complete");
    const devSession = await sessionFor(seeded.stack, seeded.dev.email);
    const ngoSession = await sessionFor(seeded.stack, seeded.ngo.email);
    const marks = (await seeded.sql`select clock_timestamp() as at`) as Array<{ at: Date | string }>;
    const cutoff = marks[0]?.at;
    if (cutoff === undefined) throw new Error("the screen seeder has no cutoff");
    return {
      organizationId: seeded.organizationId,
      projectId: seeded.projectId,
      devSession,
      ngoSession,
      modelCalls: () => modelCalls(seeded, cutoff),
      providerMicros: () => providerMicros(seeded),
      close: () => seeded.sql.close(),
    };
  } catch (error) {
    await seeded.sql.close();
    throw error;
  }
}
