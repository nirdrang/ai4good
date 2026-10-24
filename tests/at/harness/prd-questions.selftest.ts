import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STACK_ENV, sqlClient, stackFromEnv, type Stack } from "./live-stack.ts";
import {
  snapshotFromRecord,
  viewerFromRecord,
} from "../../../supabase/functions/_shared/prd/snapshot.ts";

type Sql = ReturnType<typeof sqlClient>;
type Facts = Record<string, unknown> & {
  sequence: number;
  devQuestions: Array<Record<string, unknown>>;
  questions: Array<Record<string, unknown>>;
};

const live = Boolean(process.env[STACK_ENV.dbUrl]) && "Bun" in globalThis;

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
  await sql`insert into public.accounts (id, account_type) values (${id}::uuid, ${kind}::public.account_type)`;
  await sql`insert into public.acknowledgments
    (account_id, kind, text_version, signer_name, signer_title, authority_attestation)
    values (${id}::uuid, 'platform_tos_and_promise', 'tos-1', ${name}, 'Coordinator', 'I may act')`;
  return id;
}

function parsed(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

async function refusal(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (error) {
    return String((error as { detail?: unknown }).detail);
  }
  throw new Error("expected a refusal");
}

describe.skipIf(!live)("PRD questions on the local stack", () => {
  let sql: Sql;
  let dev: string;
  let ngo: string;
  let stranger: string;
  let project: string;
  let main: string;
  const ids: Record<string, string> = {};

  async function facts(actor: string): Promise<Facts> {
    const rows =
      (await sql`select public.prd_facts(${actor}::uuid, ${project}::uuid) as f`) as Array<{
        f: unknown;
      }>;
    return parsed(rows[0].f) as Facts;
  }

  async function message(chat: string): Promise<string> {
    const rows = (await sql`select c.kind, s.stable_key, c.question_id
      from public.prd_chats c left join public.prd_sections s on s.id = c.section_id
      where c.id = ${chat}::uuid`) as Array<{
      kind: string;
      stable_key: string | null;
      question_id: string | null;
    }>;
    const row = rows[0];
    const key =
      row.kind === "main"
        ? "main"
        : row.kind === "section"
          ? `topic:${row.stable_key}`
          : `side:${row.question_id}`;
    const appended = (await sql`select public.prd_append_message(${project}::uuid, ${key},
      'ai', 'ai4good AI', '[{"type":"text","text":"reply"}]'::jsonb) as m`) as Array<{
      m: unknown;
    }>;
    return String((parsed(appended[0].m) as { id: string }).id);
  }

  async function outcome(chat: string, body: Record<string, unknown>): Promise<string[]> {
    const withMessage = { ...body, message: await message(chat) };
    const rows = (await sql`select public.prd_question_outcome(${project}::uuid, ${chat}::uuid,
      ${JSON.stringify(withMessage)}::text::jsonb) as o`) as Array<{ o: unknown }>;
    return (parsed(rows[0].o) as { questions: string[] }).questions;
  }

  async function sideChat(question: string): Promise<string | null> {
    const rows = (await sql`select id from public.prd_chats
      where project_id = ${project}::uuid and kind = 'side' and question_id = ${question}::uuid`) as Array<{
      id: string;
    }>;
    return rows[0]?.id ?? null;
  }

  async function rowRevision(question: string): Promise<number> {
    const rows =
      (await sql`select row_revision from public.prd_questions where id = ${question}::uuid`) as Array<{
        row_revision: unknown;
      }>;
    return Number(rows[0].row_revision);
  }

  function post(actor: string, question: string, revision: number) {
    return sql`select public.prd_question_post(${actor}::uuid, ${project}::uuid, ${question}::uuid, ${revision})`;
  }

  function devQuestion(section: string, text: string, prerequisites: string[] = []) {
    return {
      section,
      text,
      why: "It decides the booking screens.",
      options: ["Yes", "No"],
      suggested: "Yes",
      prerequisites,
      anchors: ["Who books shifts"],
    };
  }

  function ngoQuestion(section: string, text: string, prerequisites: string[] = []) {
    return {
      section,
      text,
      why: "Only the kitchen can decide this.",
      options: ["12 months", "24 months"],
      blocking: true,
      prerequisites,
      anchors: ["Data handling"],
    };
  }

  beforeAll(async () => {
    const stack = stackFromEnv();
    sql = sqlClient(stack);
    dev = await account(stack, sql, "volunteer", "Priya Shah");
    ngo = await account(stack, sql, "ngo", "Maya Levi");
    stranger = await account(stack, sql, "volunteer", "Someone Else");
    const orgs =
      (await sql`insert into public.organizations (name) values ('Harbor Community Kitchen')
      returning id`) as Array<{ id: string }>;
    const org = String(orgs[0].id);
    await sql`insert into public.org_memberships (org_id, account_id, role) values (${org}::uuid, ${ngo}::uuid, 'admin')`;
    const projects = (await sql`insert into public.projects (org_id, name, assigned_volunteer_id)
      values (${org}::uuid, 'Volunteer scheduling', ${dev}::uuid) returning id`) as Array<{
      id: string;
    }>;
    project = String(projects[0].id);
    const brief = {
      schemaVersion: 1,
      need: { text: "Schedule volunteers", source: { kind: "intake" } },
      usersToday: null,
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
    await sql`insert into public.brief_revisions (project_id, revision, document, created_by)
      values (${project}::uuid, 1, ${JSON.stringify(brief)}::text::jsonb, ${ngo}::uuid)`;
    await sql`insert into public.discovery_confirmations
      (project_id, revision, actor_id, actor_name, confirmed_at, accepted_gaps)
      values (${project}::uuid, 1, ${ngo}::uuid, 'Maya Levi', clock_timestamp(), '[]'::jsonb)`;
    await sql`select public.prd_open(${dev}::uuid, ${org}::uuid, ${project}::uuid)`;
    const chats = (await sql`select id from public.prd_chats
      where project_id = ${project}::uuid and kind = 'main'`) as Array<{ id: string }>;
    main = String(chats[0].id);
  });

  afterAll(async () => {
    await sql?.close();
  });

  it("asks a ready pair together as one outcome", async () => {
    const before = (await facts(dev)).sequence;
    const asked = await outcome(main, {
      kind: "ask",
      questions: [
        devQuestion("booking", "Can volunteers swap?"),
        devQuestion("booking", "How far ahead?"),
      ],
    });
    expect(asked).toHaveLength(2);
    [ids.swap, ids.ahead] = asked;
    const after = await facts(dev);
    expect(after.sequence).toBe(before + 2);
    expect(after.devQuestions.map((question) => question.text)).toEqual([
      "Can volunteers swap?",
      "How far ahead?",
    ]);
    expect(after.devQuestions[0]).toMatchObject({
      section: "booking",
      answered: null,
      anchors: ["Who books shifts"],
    });
  });

  it("refuses a dependent question until its prerequisite is answered", async () => {
    const count = (await facts(dev)).devQuestions.length;
    expect(
      await refusal(
        outcome(main, {
          kind: "ask",
          questions: [devQuestion("booking", "Who approves?", [ids.swap])],
        }),
      ),
    ).toBe("not-ready");
    expect((await facts(dev)).devQuestions).toHaveLength(count);
    await outcome(main, { kind: "answered", question: ids.swap, answer: "Yes" });
    const [approves] = await outcome(main, {
      kind: "ask",
      questions: [devQuestion("booking", "Who approves?", [ids.swap])],
    });
    expect(approves).toBeTruthy();
  });

  it("refuses a question in a section that waits on another section", async () => {
    expect(
      await refusal(
        outcome(main, {
          kind: "ask",
          questions: [devQuestion("rules", "How many shifts a week?")],
        }),
      ),
    ).toBe("not-ready");
    expect(
      await refusal(
        outcome(main, {
          kind: "ask",
          questions: [devQuestion("booking", "Fine alone"), devQuestion("rules", "Waits")],
        }),
      ),
    ).toBe("not-ready");
  });

  it("lets only the developer post a ready question, at its current row revision", async () => {
    [ids.retention] = await outcome(main, {
      kind: "suggest-ngo",
      question: ngoQuestion("booking", "How long?"),
    });
    [ids.waiting] = await outcome(main, {
      kind: "suggest-ngo",
      question: ngoQuestion("rules", "Which rules?"),
    });
    const revision = await rowRevision(ids.retention);
    expect(await sideChat(ids.retention)).toBeNull();
    expect(await refusal(post(ngo, ids.retention, revision))).toBe("forbidden");
    expect(await refusal(post(stranger, ids.retention, revision))).toBe("forbidden");
    expect(await refusal(post(dev, ids.retention, revision + 1))).toBe("stale");
    expect(await refusal(post(dev, ids.waiting, await rowRevision(ids.waiting)))).toBe("not-ready");
    await post(dev, ids.retention, revision);
    expect(await sideChat(ids.retention)).not.toBeNull();
    expect(await refusal(post(dev, ids.retention, revision + 1))).toBe("stale");
  });

  it("shows the NGO a suggested question it cannot post", async () => {
    const ngoFacts = await facts(ngo);
    expect(ngoFacts.questions.map((question) => question.status)).toEqual(["posted", "suggested"]);
    const devFacts = await facts(dev);
    expect(devFacts.questions.map((question) => question.status)).toEqual(["posted", "suggested"]);
    const ngoView = snapshotFromRecord(ngoFacts, viewerFromRecord(ngoFacts));
    const unposted = ngoView.questions[1];
    expect(unposted.kind === "suggested" && unposted.post.kind).toBe("unavailable");
    const devView = snapshotFromRecord(devFacts, viewerFromRecord(devFacts));
    const waiting = devView.questions[1];
    expect(waiting.kind === "suggested" && waiting.post).toEqual({
      kind: "unavailable",
      reason: "Not available yet.",
    });
  });

  it("refuses the final answer while a follow-up is open", async () => {
    const side = String(await sideChat(ids.retention));
    await outcome(side, { kind: "follow-up-open" });
    expect(await refusal(outcome(side, { kind: "final-answer", answer: "A year." }))).toBe(
      "follow-up-open",
    );
    const pending = snapshotFromRecord(await facts(ngo), viewerFromRecord(await facts(ngo)))
      .questions[0];
    expect(pending.kind === "answering" && pending.followUp).toBe("pending");
    await outcome(side, { kind: "follow-up-resolved" });
    await outcome(side, { kind: "final-answer", answer: "Keep contact details for a year." });
    const devView = snapshotFromRecord(await facts(dev), viewerFromRecord(await facts(dev)));
    expect(devView.questions[0]).toMatchObject({
      kind: "complete",
      answer: "Keep contact details for a year.",
      canUse: true,
    });
    const ngoView = snapshotFromRecord(await facts(ngo), viewerFromRecord(await facts(ngo)));
    expect(ngoView.questions[0]).toMatchObject({ kind: "complete", canUse: false });
  });

  it("settles a prerequisite when the developer uses the answer", async () => {
    expect(
      await refusal(
        outcome(main, {
          kind: "ask",
          questions: [devQuestion("booking", "Export too?", [ids.retention])],
        }),
      ),
    ).toBe("not-ready");
    expect(
      await refusal(
        sql`select public.prd_answer_use(${ngo}::uuid, ${project}::uuid, ${ids.retention}::uuid, 1, '')`,
      ),
    ).toBe("forbidden");
    expect(
      await refusal(
        sql`select public.prd_answer_use(${dev}::uuid, ${project}::uuid, ${ids.retention}::uuid, 2, '')`,
      ),
    ).toBe("stale");
    await sql`select public.prd_answer_use(${dev}::uuid, ${project}::uuid, ${ids.retention}::uuid, 1, 'Fine')`;
    const [exported] = await outcome(main, {
      kind: "ask",
      questions: [devQuestion("booking", "Export too?", [ids.retention])],
    });
    expect(exported).toBeTruthy();
    const devView = snapshotFromRecord(await facts(dev), viewerFromRecord(await facts(dev)));
    expect(devView.questions[0]).toMatchObject({
      kind: "used",
      answer: "Keep contact details for a year.",
    });
  });

  it("refuses a closed PRD", async () => {
    await sql`update public.prd_records set closed_revision = current_revision where project_id = ${project}::uuid`;
    expect(await refusal(post(dev, ids.waiting, await rowRevision(ids.waiting)))).toBe("closed");
    expect(
      await refusal(outcome(main, { kind: "ask", questions: [devQuestion("booking", "Late?")] })),
    ).toBe("closed");
  });
});
