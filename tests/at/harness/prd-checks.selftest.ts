import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseSection, parseSectionDocument, renderSection } from "../../../supabase/functions/_shared/prd/file.ts";
import type { SectionDocument } from "../../../supabase/functions/_shared/prd/file.ts";
import { STACK_ENV, sqlClient, stackFromEnv, type Stack } from "./live-stack.ts";
import { madeSha, openWithoutGithub } from "./prd-git.ts";

type Sql = ReturnType<typeof sqlClient>;
const live = Boolean(process.env[STACK_ENV.dbUrl]) && "Bun" in globalThis;

type World = { dev: string; ngo: string; org: string; project: string };

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

async function refusal(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (error) {
    const err = error as { detail?: unknown };
    return String(err.detail);
  }
  throw new Error("expected a refusal");
}

async function errorCode(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (error) {
    const code = (error as { errno?: unknown }).errno;
    return typeof code === "string" ? code : "";
  }
  return "inserted";
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

async function world(stack: Stack, sql: Sql): Promise<World> {
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

async function sectionState(sql: Sql, project: string, key: string): Promise<{ state: string; gap: string | null }> {
  const rows = (await sql`select state, gap_text from public.prd_sections
    where project_id = ${project}::uuid and stable_key = ${key}`) as Array<Record<string, unknown>>;
  return {
    state: String(rows[0].state),
    gap: rows[0].gap_text === null || rows[0].gap_text === undefined ? null : String(rows[0].gap_text),
  };
}

function confirm(sql: Sql, actor: string, project: string, key: string, revision: number, request: string) {
  return sql`select public.prd_action(
    ${actor}::uuid, ${project}::uuid, 'confirm-topic',
    ${`confirm-topic|topic:${key}|${revision}|0`}, ${request}
  ) as r`;
}

async function decision(sql: Sql, actor: string, project: string, key: string) {
  return objectOf(sql`select public.prd_check_decision(
    ${actor}::uuid, ${project}::uuid, ${key}
  ) as r`);
}

async function credit(sql: Sql, project: string): Promise<void> {
  await sql`select public.prd_fund_credit(${project}::uuid, ${"1000"}::numeric, 'selftest funds')`;
}

describe.skipIf(!live)("completion check rows on the local stack", () => {
  let stack: Stack;
  let sql: Sql;

  beforeAll(() => {
    stack = stackFromEnv();
    sql = sqlClient(stack);
  });

  afterAll(async () => {
    await sql?.close();
  });

  it("reuses one check, refuses a confirm that cannot run, and closes a gap when the section changes", async () => {
    const opened = await world(stack, sql);
    const { dev, ngo, project } = opened;
    const configRows = (await sql`select threshold, threshold_text, placeholder
      from public.prd_check_config where key = 'completion'`) as Array<Record<string, unknown>>;
    const threshold = whole(configRows[0].threshold);
    const thresholdText = String(configRows[0].threshold_text);
    expect(configRows[0].placeholder).toBe(true);
    await sql`update public.prd_sections set state = 'ready'
      where project_id = ${project}::uuid and required = true`;

    const revision = await revisionOf(sql, project);
    const booking = await objectOf(confirm(sql, dev, project, "booking", revision, crypto.randomUUID()));
    expect(booking).toEqual({ sequence: booking.sequence, state: "confirmed" });
    const rules = await objectOf(confirm(sql, dev, project, "rules", revision, crypto.randomUUID()));
    expect(rules.check).toBeUndefined();
    expect(rules.state).toBe("confirmed");

    expect(await refusal(confirm(sql, dev, project, "technical-scope", revision, crypto.randomUUID()))).toBe("funds");
    expect((await sectionState(sql, project, "technical-scope")).state).toBe("ready");

    await credit(sql, project);
    const reserved = await objectOf(sql`select public.prd_turn_reserve(
      ${dev}::uuid, ${project}::uuid, 'main', ${crypto.randomUUID()}, ${revision},
      ${JSON.stringify({ kind: "text", text: "Still writing." })}::text::jsonb, ${"hash-busy"}
    ) as r`);
    expect(await refusal(confirm(sql, dev, project, "technical-scope", revision, crypto.randomUUID()))).toBe("busy");
    expect((await sectionState(sql, project, "technical-scope")).state).toBe("ready");
    await sql`select public.prd_turn_finish(${String(reserved.turnId)}::uuid, 'answered')`;

    const ngoDecision = await decision(sql, ngo, project, "technical-scope");
    expect(ngoDecision.starts).toBe(false);
    expect(
      await refusal(confirm(sql, ngo, project, "technical-scope", revision, crypto.randomUUID())),
    ).toBe("forbidden");
    const before = await decision(sql, dev, project, "technical-scope");
    expect(before.starts).toBe(true);
    expect(before.current).toBe(false);

    const started = await objectOf(confirm(sql, dev, project, "technical-scope", revision, crypto.randomUUID()));
    const check = record(started.check);
    const turnId = String(check.turnId);
    expect(turnId.length).toBeGreaterThan(0);
    expect(started.state).toBe("confirmed");

    const score = threshold > 0 ? threshold - 1 : 0;
    const checkId = crypto.randomUUID();
    const gapText = "The booking rule is missing.";
    const parts = [
      { type: "text", text: gapText },
      {
        type: "data-check",
        data: {
          checkId,
          gaps: [{ topicId: "booking", title: "Who books shifts", text: gapText, fixed: false }],
        },
      },
    ];
    const first = await objectOf(sql`select public.prd_check_record(
      ${project}::uuid, ${turnId}::uuid, ${checkId}::uuid, ${score}, 'A booking gap.',
      ${JSON.stringify([{ sectionKey: "booking", text: gapText }])}::text::jsonb,
      ${JSON.stringify(parts)}::text::jsonb
    ) as r`);
    expect(first.replayed).toBe(false);
    expect(whole(first.threshold)).toBe(threshold);
    expect(first.thresholdText).toBe(thresholdText);
    const gapped = await sectionState(sql, project, "booking");
    expect(gapped.state).toBe("needs-review");
    expect(gapped.gap).toBe(gapText);
    const current = await decision(sql, dev, project, "booking");
    expect(current.current).toBe(true);

    const duplicate = await errorCode(sql`insert into public.prd_checks (
      id, project_id, revision, score, threshold, passed, coverage_text, threshold_text, turn_id
    ) values (
      ${crypto.randomUUID()}::uuid, ${project}::uuid, ${revision}, ${score}, ${threshold}, false,
      'again', ${thresholdText}, ${turnId}::uuid
    )`);
    expect(duplicate).toBe("23505");

    const messages = await counted(sql`select count(*) as n from public.prd_messages m
      join public.prd_chats c on c.id = m.chat_id
      where c.project_id = ${project}::uuid and m.parts::text like '%data-check%'`);
    const second = await objectOf(sql`select public.prd_check_record(
      ${project}::uuid, ${turnId}::uuid, ${crypto.randomUUID()}::uuid, ${score}, 'A booking gap.',
      ${JSON.stringify([{ sectionKey: "booking", text: gapText }])}::text::jsonb,
      ${JSON.stringify(parts)}::text::jsonb
    ) as r`);
    expect(second.replayed).toBe(true);
    expect(
      await counted(sql`select count(*) as n from public.prd_messages m
        join public.prd_chats c on c.id = m.chat_id
        where c.project_id = ${project}::uuid and m.parts::text like '%data-check%'`),
    ).toBe(messages);

    expect(await refusal(confirm(sql, dev, project, "booking", revision, crypto.randomUUID()))).toBe("gap");
    expect((await sectionState(sql, project, "booking")).state).toBe("needs-review");
    await sql`select public.prd_turn_finish(${turnId}::uuid, 'answered')`;

    const rows = (await sql`select s.title, s.file_path, v.document
      from public.prd_sections s
      join public.prd_records r on r.project_id = s.project_id
      join public.prd_revisions rev on rev.project_id = s.project_id and rev.revision = r.current_revision
      join public.prd_section_versions v on v.id = (rev.manifest->>s.stable_key)::uuid
      where s.project_id = ${project}::uuid and s.stable_key = 'booking'`) as Array<Record<string, unknown>>;
    const parsed = parseSectionDocument(jsonValue(rows[0].document));
    if (!parsed.ok) throw new Error(parsed.reason);
    const next: SectionDocument = {
      statements: [...parsed.document.statements, { text: "Volunteers can swap a shift.", sources: ["Discovery revision 1"] }],
      decisions: parsed.document.decisions,
    };
    const content = renderSection({ key: "booking", title: String(rows[0].title), document: next });
    const file = parseSection(content);
    if (!file.ok) throw new Error(file.reason);
    const sha = madeSha(`${project}:gap-closed`);
    const head = await headOf(sql, project);
    const applied = await objectOf(sql`select public.prd_reconcile(
      ${project}::uuid, ${head}, ${JSON.stringify([
        {
          sha,
          parents: [head],
          login: "octocat",
          message: "Close the booking gap",
          changes: [
            {
              path: String(rows[0].file_path),
              change: "modified",
              blobSha: sha,
              file: { variant: "readable", key: "booking", title: file.file.title, document: file.file.document },
            },
          ],
        },
      ])}::text::jsonb
    ) as r`);
    expect(applied.stale).toBe(false);
    expect(whole(applied.applied)).toBe(1);
    const fixed = (await sql`select fixed from public.prd_check_gaps
      where project_id = ${project}::uuid and section_key = 'booking'`) as Array<{ fixed: unknown }>;
    expect(fixed.length).toBeGreaterThan(0);
    expect(fixed.every((row) => row.fixed === true)).toBe(true);
    const cleared = await sectionState(sql, project, "booking");
    expect(cleared.gap).toBeNull();

    const moved = await revisionOf(sql, project);
    const again = await objectOf(confirm(sql, dev, project, "booking", moved, crypto.randomUUID()));
    expect(again.state).toBe("confirmed");
    expect((await sectionState(sql, project, "booking")).state).toBe("confirmed");
  });
});
