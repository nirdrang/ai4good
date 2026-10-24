import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STACK_ENV, sqlClient, stackFromEnv, type Stack } from "./live-stack.ts";
import {
  snapshotFromRecord,
  viewerFromRecord,
} from "../../../supabase/functions/_shared/prd/snapshot.ts";

type Sql = ReturnType<typeof sqlClient>;
type Facts = Record<string, unknown> & {
  sequence: number;
  revision: number;
  drafts: Record<string, string>;
  devQuestions: Array<Record<string, unknown>>;
  questions: Array<Record<string, unknown>>;
  chats: Array<Record<string, unknown>>;
};
type Counts = {
  turns: number;
  messages: number;
  actions: number;
  sequence: number;
  active: number;
};

const live = Boolean(process.env[STACK_ENV.dbUrl]) && "Bun" in globalThis;
const FOLLOW_UP = "Answer the AI’s question first.";

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

describe.skipIf(!live)("PRD turns on the local stack", () => {
  let sql: Sql;
  let stack: Stack;
  let dev: string;
  let ngo: string;
  let stranger: string;
  let project: string;
  let main: string;
  const ids: Record<string, string> = {};
  const held: Record<string, string> = {};

  async function account(kind: "volunteer" | "ngo", name: string) {
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

  async function facts(actor: string): Promise<Facts> {
    const rows =
      (await sql`select public.prd_facts(${actor}::uuid, ${project}::uuid) as f`) as Array<{
        f: unknown;
      }>;
    return parsed(rows[0].f) as Facts;
  }

  async function revision(): Promise<number> {
    const rows = (await sql`select current_revision::int as revision
      from public.prd_records where project_id = ${project}::uuid`) as Array<{ revision: number }>;
    return Number(rows[0].revision);
  }

  async function measure(): Promise<Counts> {
    const rows = (await sql`select
      (select count(*)::int from public.prd_turns where project_id = ${project}::uuid) as turns,
      (select count(*)::int from public.prd_messages where project_id = ${project}::uuid) as messages,
      (select count(*)::int from public.prd_actions where project_id = ${project}::uuid) as actions,
      (select snapshot_sequence::int from public.prd_records where project_id = ${project}::uuid) as sequence,
      (select count(*)::int from public.prd_turns
        where project_id = ${project}::uuid and state in ('admitted', 'uncertain')) as active
    `) as Array<Counts>;
    const row = rows[0];
    return {
      turns: Number(row.turns),
      messages: Number(row.messages),
      actions: Number(row.actions),
      sequence: Number(row.sequence),
      active: Number(row.active),
    };
  }

  async function questionRow(id: string): Promise<{ status: string; rowRevision: number }> {
    const rows = (await sql`select status, row_revision from public.prd_questions
      where id = ${id}::uuid`) as Array<{ status: string; row_revision: unknown }>;
    return { status: rows[0].status, rowRevision: Number(rows[0].row_revision) };
  }

  async function sides(question: string): Promise<number> {
    const rows = (await sql`select count(*)::int as n from public.prd_chats
      where project_id = ${project}::uuid and kind = 'side' and question_id = ${question}::uuid`) as Array<{
      n: unknown;
    }>;
    return Number(rows[0].n);
  }

  function reserve(
    actor: string,
    key: string,
    request: string,
    hash: string,
    intent: Record<string, unknown>,
    base: number,
  ) {
    return sql`select public.prd_turn_reserve(
      ${actor}::uuid, ${project}::uuid, ${key}, ${request}, ${base},
      ${JSON.stringify(intent)}::text::jsonb, ${hash}
    ) as r`;
  }

  function action(actor: string, kind: string, token: string, request: string) {
    return sql`select public.prd_action(
      ${actor}::uuid, ${project}::uuid, ${kind}, ${token}, ${request}
    ) as r`;
  }

  function finish(turn: string, state = "answered") {
    return sql`select public.prd_turn_finish(${turn}::uuid, ${state}) as r`;
  }

  async function one(query: Promise<unknown>): Promise<Record<string, unknown>> {
    const rows = (await query) as Array<{ r: unknown }>;
    return parsed(rows[0].r) as Record<string, unknown>;
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

  async function sideChat(question: string): Promise<string> {
    const rows = (await sql`select id from public.prd_chats
      where project_id = ${project}::uuid and kind = 'side' and question_id = ${question}::uuid`) as Array<{
      id: string;
    }>;
    return String(rows[0].id);
  }

  function ngoQuestion(text: string) {
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

  function questionFacts(body: Facts, id: string): Record<string, unknown> {
    const found = body.questions.find((question) => question.id === id);
    if (!found) throw new Error(`missing question ${id}`);
    return found;
  }

  function tokenOf(question: Record<string, unknown>, field: "post" | "complete"): string {
    const gate = question[field] as { token?: unknown };
    if (typeof gate?.token !== "string") throw new Error(`missing ${field} token`);
    return gate.token;
  }

  beforeAll(async () => {
    stack = stackFromEnv();
    sql = sqlClient(stack);
    dev = await account("volunteer", "Priya Shah");
    ngo = await account("ngo", "Maya Levi");
    stranger = await account("volunteer", "Someone Else");
    const orgs =
      (await sql`insert into public.organizations (name) values ('Harbor Community Kitchen')
      returning id`) as Array<{ id: string }>;
    const org = String(orgs[0].id);
    await sql`insert into public.org_memberships (org_id, account_id, role)
      values (${org}::uuid, ${ngo}::uuid, 'admin')`;
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

  it("lets the developer send in the main chat and a section chat, and refuses a stale or repeated send", async () => {
    const rev = await revision();
    const devFacts = await facts(dev);
    const devView = snapshotFromRecord(devFacts, viewerFromRecord(devFacts));
    expect(devView.canWrite.main).toBe(true);
    expect(devView.send.main).toEqual({ kind: "available" });
    expect(devView.canWrite["topic:booking"]).toBe(true);
    expect(devView.send["topic:booking"]).toEqual({ kind: "available" });

    const before = await measure();
    const sent = await one(
      reserve(
        dev,
        "main",
        "send-main",
        "hash-main",
        { kind: "text", text: "Hello from Priya" },
        rev,
      ),
    );
    held.mainTurn = String(sent.turnId);
    expect(sent.messageId).toEqual(expect.any(String));
    expect(Number(sent.sequence)).toBe(before.sequence + 1);
    const after = await measure();
    expect(after.turns).toBe(before.turns + 1);
    expect(after.messages).toBe(before.messages + 1);
    expect(after.active).toBe(1);
    const stored =
      (await sql`select t.kind, t.state, t.actor_id, c.kind as chat_kind, m.actor_kind, m.parts
      from public.prd_turns t
      join public.prd_chats c on c.id = t.chat_id
      join public.prd_messages m on m.id = t.message_id
      where t.id = ${held.mainTurn}::uuid`) as Array<Record<string, unknown>>;
    expect(stored[0]).toMatchObject({
      kind: "reply",
      state: "admitted",
      actor_id: dev,
      chat_kind: "main",
      actor_kind: "dev",
    });
    expect(JSON.stringify(parsed(stored[0].parts))).toContain("Hello from Priya");

    const busy = await measure();
    expect(
      await refusal(
        reserve(dev, "main", "send-main-busy", "hash-busy", { kind: "text", text: "Again" }, rev),
      ),
    ).toBe("busy");
    expect(await measure()).toEqual(busy);
    expect(await refusal(finish(held.mainTurn, "admitted"))).toBe("invalid-request");
    const still = (await sql`select state from public.prd_turns
      where id = ${held.mainTurn}::uuid`) as Array<{ state: string }>;
    expect(still[0].state).toBe("admitted");
    await one(finish(held.mainTurn));
    expect(await refusal(finish(held.mainTurn, "rejected"))).toBe("stale");
    expect((await measure()).active).toBe(0);

    const freed = await one(
      reserve(
        dev,
        "main",
        "send-main-next",
        "hash-next",
        { kind: "text", text: "The chat is free" },
        rev,
      ),
    );
    await one(finish(String(freed.turnId)));

    const topic = await one(
      reserve(
        dev,
        "topic:booking",
        "send-topic",
        "hash-topic",
        { kind: "text", text: "In the section" },
        rev,
      ),
    );
    const topicChat = (await sql`select c.kind from public.prd_turns t
      join public.prd_chats c on c.id = t.chat_id
      where t.id = ${String(topic.turnId)}::uuid`) as Array<{ kind: string }>;
    expect(topicChat[0].kind).toBe("section");
    await one(finish(String(topic.turnId)));

    const settled = await measure();
    const replay = await one(
      reserve(
        dev,
        "main",
        "send-main",
        "hash-main",
        { kind: "text", text: "Hello from Priya" },
        rev,
      ),
    );
    expect(replay.turnId).toBe(held.mainTurn);
    expect(replay.messageId).toBe(sent.messageId);
    expect(Number(replay.sequence)).toBe(Number(sent.sequence));
    expect(await measure()).toEqual(settled);
    expect(
      await refusal(
        reserve(
          dev,
          "main",
          "send-main",
          "hash-other",
          { kind: "text", text: "Different body" },
          rev,
        ),
      ),
    ).toBe("invalid-request");
    expect(
      await refusal(
        reserve(
          ngo,
          "main",
          "send-main",
          "hash-main",
          { kind: "text", text: "Hello from Priya" },
          rev,
        ),
      ),
    ).toBe("invalid-request");
    expect(await measure()).toEqual(settled);
    expect(
      await refusal(
        reserve(
          dev,
          "main",
          "send-stale",
          "hash-stale",
          { kind: "text", text: "Old tab" },
          rev + 1,
        ),
      ),
    ).toBe("stale");
    expect(
      await refusal(
        reserve(dev, "main", "send-empty", "hash-empty", { kind: "text", text: "  " }, rev),
      ),
    ).toBe("invalid-request");
    expect(
      await refusal(reserve(dev, "main", "send-close", "hash-close", { kind: "close-check" }, rev)),
    ).toBe("not-yet");
    expect(
      await refusal(
        reserve(
          dev,
          "main",
          "send-answers-main",
          "hash-answers-main",
          { kind: "answers", picks: { swap: "Yes" }, text: "" },
          rev,
        ),
      ),
    ).toBe("invalid-request");
    expect(await measure()).toEqual(settled);
    const answersBefore = await measure();
    const answers = await one(
      reserve(
        dev,
        "topic:booking",
        "send-answers",
        "hash-answers",
        { kind: "answers", picks: { swap: "Yes" }, text: "They can." },
        rev,
      ),
    );
    const answerParts = (await sql`select parts from public.prd_messages
      where id = ${String(answers.messageId)}::uuid`) as Array<{ parts: unknown }>;
    expect(JSON.stringify(parsed(answerParts[0].parts))).toContain("swap: Yes\nThey can.");
    await one(finish(String(answers.turnId)));
    const answersAfter = await measure();
    expect(answersAfter.turns).toBe(answersBefore.turns + 1);
    expect(answersAfter.messages).toBe(answersBefore.messages + 1);
    expect(answersAfter.active).toBe(0);
  });

  it("refuses the NGO outside a posted side chat, and an unrelated account for every send and the snapshot", async () => {
    const rev = await revision();
    const mainChat = main;
    [ids.retention] = await outcome(mainChat, {
      kind: "suggest-ngo",
      question: ngoQuestion("How long should we keep contact details?"),
    });
    [ids.quiet] = await outcome(mainChat, {
      kind: "suggest-ngo",
      question: ngoQuestion("Who may see the rota?"),
    });
    [ids.settled] = await outcome(mainChat, {
      kind: "suggest-ngo",
      question: ngoQuestion("How far ahead are shifts published?"),
    });
    expect(await sides(ids.retention)).toBe(0);
    const before = await measure();
    expect(
      await refusal(
        reserve(ngo, "main", "ngo-main", "hash-ngo-main", { kind: "text", text: "Hello" }, rev),
      ),
    ).toBe("forbidden");
    expect(
      await refusal(
        reserve(
          ngo,
          "topic:booking",
          "ngo-topic",
          "hash-ngo-topic",
          { kind: "text", text: "Hello" },
          rev,
        ),
      ),
    ).toBe("forbidden");
    expect(
      await refusal(
        reserve(
          ngo,
          `side:${ids.retention}`,
          "ngo-suggested",
          "hash-ngo-suggested",
          { kind: "text", text: "Hello" },
          rev,
        ),
      ),
    ).toBe("forbidden");
    expect(
      await refusal(
        reserve(
          dev,
          `side:${ids.retention}`,
          "dev-suggested",
          "hash-dev-suggested",
          { kind: "text", text: "Hello" },
          rev,
        ),
      ),
    ).toBe("forbidden");
    for (const key of ["main", "topic:booking", `side:${ids.retention}`]) {
      expect(
        await refusal(
          reserve(
            stranger,
            key,
            `stranger-${key}`,
            `hash-stranger-${key}`,
            { kind: "text", text: "Hello" },
            rev,
          ),
        ),
      ).toBe("forbidden");
    }
    expect(await refusal(sql`select public.prd_facts(${stranger}::uuid, ${project}::uuid)`)).toBe(
      "forbidden",
    );
    expect(
      await refusal(sql`select public.prd_snapshot(${stranger}::uuid, ${project}::uuid, null)`),
    ).toBe("forbidden");
    expect(
      await refusal(
        sql`select public.prd_append_message(${project}::uuid, ${`side:${ids.retention}`},
          'ai', 'ai4good AI', '[{"type":"text","text":"too soon"}]'::jsonb)`,
      ),
    ).toBe("invalid-request");
    expect(await sides(ids.retention)).toBe(0);
    expect((await questionRow(ids.retention)).status).toBe("suggested");
    expect(await measure()).toEqual(before);

    const ngoView = snapshotFromRecord(await facts(ngo), viewerFromRecord(await facts(ngo)));
    expect(ngoView.canWrite.main).toBe(false);
    expect(ngoView.send.main).toEqual({
      kind: "unavailable",
      block: "role",
      reason: "Only Priya writes to the AI here.",
    });
    expect(ngoView.send["topic:booking"]).toEqual({
      kind: "unavailable",
      block: "role",
      reason: "Only Priya writes to the AI here.",
    });
  });

  it("posts once, and the NGO's first side-chat message moves the question to answering", async () => {
    const rev = await revision();
    const token = tokenOf(questionFacts(await facts(dev), ids.retention), "post");
    held.postToken = token;
    const before = await measure();
    await one(action(dev, "post-question", token, "post-retention"));
    const posted = await questionRow(ids.retention);
    expect(posted.status).toBe("posted");
    expect(await sides(ids.retention)).toBe(1);
    const afterPost = await measure();
    expect(afterPost.actions).toBe(before.actions + 1);
    const replay = await one(action(dev, "post-question", token, "post-retention"));
    expect(await questionRow(ids.retention)).toEqual(posted);
    expect(await measure()).toEqual(afterPost);
    expect(Number(replay.sequence)).toBe(afterPost.sequence);
    expect(await refusal(action(dev, "post-question", token, "post-retention-again"))).toBe(
      "stale",
    );
    expect(await questionRow(ids.retention)).toEqual(posted);

    const first = await one(
      reserve(
        ngo,
        `side:${ids.retention}`,
        "ngo-side-1",
        "hash-ngo-side-1",
        { kind: "text", text: "A year." },
        rev,
      ),
    );
    const answering = await questionRow(ids.retention);
    expect(answering.status).toBe("answering");
    expect(answering.rowRevision).toBe(posted.rowRevision + 1);
    const actor = (await sql`select actor_kind, actor_id from public.prd_messages
      where id = ${String(first.messageId)}::uuid`) as Array<{
      actor_kind: string;
      actor_id: string;
    }>;
    expect(actor[0]).toEqual({ actor_kind: "ngo", actor_id: ngo });
    const whileBusy = snapshotFromRecord(await facts(ngo), viewerFromRecord(await facts(ngo)));
    expect(whileBusy.canWrite[`side:${ids.retention}`]).toBe(true);
    expect(whileBusy.send[`side:${ids.retention}`]).toEqual({
      kind: "unavailable",
      block: "busy",
      reason: "The AI is still answering in this chat.",
    });
    expect(
      await refusal(
        reserve(
          stranger,
          `side:${ids.retention}`,
          "stranger-posted-side",
          "hash-stranger-posted-side",
          { kind: "text", text: "Hello" },
          rev,
        ),
      ),
    ).toBe("forbidden");
    await one(finish(String(first.turnId)));

    const second = await one(
      reserve(
        ngo,
        `side:${ids.retention}`,
        "ngo-side-2",
        "hash-ngo-side-2",
        { kind: "text", text: "Still a year." },
        rev,
      ),
    );
    expect(await questionRow(ids.retention)).toEqual(answering);
    await one(finish(String(second.turnId)));
    const devView = snapshotFromRecord(await facts(dev), viewerFromRecord(await facts(dev)));
    expect(devView.send[`side:${ids.retention}`]).toEqual({
      kind: "unavailable",
      block: "role",
      reason: "Only Maya answers in her side chat.",
    });
    const ngoView = snapshotFromRecord(await facts(ngo), viewerFromRecord(await facts(ngo)));
    expect(ngoView.canWrite[`side:${ids.retention}`]).toBe(true);
    expect(ngoView.send[`side:${ids.retention}`]).toEqual({ kind: "available" });
  });

  it("leaves exactly one turn when two sends race, and a replay writes nothing", async () => {
    const rev = await revision();
    const before = await measure();
    const left = sqlClient(stack);
    const right = sqlClient(stack);
    try {
      const intent = JSON.stringify({ kind: "text", text: "Together" });
      const [oneResult, otherResult] = await Promise.allSettled([
        left`select public.prd_turn_reserve(${dev}::uuid, ${project}::uuid, 'main', 'race-a', ${rev},
          ${intent}::text::jsonb, 'hash-race-a') as r`,
        right`select public.prd_turn_reserve(${dev}::uuid, ${project}::uuid, 'main', 'race-b', ${rev},
          ${intent}::text::jsonb, 'hash-race-b') as r`,
      ]);
      const details = [oneResult, otherResult].map((result) =>
        result.status === "fulfilled"
          ? "ok"
          : String((result.reason as { detail?: unknown }).detail),
      );
      expect(details.filter((detail) => detail === "ok")).toHaveLength(1);
      expect(details.filter((detail) => detail === "busy")).toHaveLength(1);
      const after = await measure();
      expect(after.turns).toBe(before.turns + 1);
      expect(after.messages).toBe(before.messages + 1);
      expect(after.active).toBe(before.active + 1);
    } finally {
      const active = (await sql`select id from public.prd_turns
        where project_id = ${project}::uuid and chat_id = ${main}::uuid
          and state in ('admitted', 'uncertain')`) as Array<{ id: string }>;
      for (const row of active) {
        await sql`select public.prd_turn_finish(${row.id}::uuid, 'answered')`;
      }
      await left.close();
      await right.close();
    }
  });

  it("refuses an action for the wrong role, a spent post, an open follow-up, and then admits the answer", async () => {
    const rev = await revision();
    const kinds = [
      "post-question",
      "complete-answer",
      "confirm-topic",
      "reopen-topic",
      "close",
      "close-anyway",
      "keep-working",
    ] as const;
    const beforeRoles = await measure();
    for (const kind of kinds) {
      const token = `${kind}|question:${ids.retention}|${rev}|1`;
      const wrong = kind === "complete-answer" ? dev : ngo;
      expect(await refusal(action(wrong, kind, token, `wrong-${kind}`))).toBe("forbidden");
      expect(await refusal(action(stranger, kind, token, `stranger-${kind}`))).toBe("forbidden");
    }
    expect(await refusal(action(dev, "post-question", "not-a-token", "bad-token"))).toBe(
      "invalid-request",
    );
    expect(await refusal(action(dev, "close", "post-question|close|1|1", "bad-kind"))).toBe(
      "invalid-request",
    );
    expect(await refusal(action(dev, "dance", "dance|topic:booking|1|1", "dance"))).toBe(
      "invalid-request",
    );
    for (const kind of ["confirm-topic", "reopen-topic", "close", "close-anyway", "keep-working"]) {
      expect(
        await refusal(action(dev, kind, `${kind}|topic:booking|${rev}|1`, `later-${kind}`)),
      ).toBe("not-yet");
    }
    expect(await measure()).toEqual(beforeRoles);

    const quietToken = tokenOf(questionFacts(await facts(dev), ids.quiet), "post");
    await one(action(dev, "post-question", quietToken, "post-quiet"));
    const quietSide = await sideChat(ids.quiet);
    await outcome(quietSide, { kind: "follow-up-open" });
    await outcome(quietSide, { kind: "follow-up-resolved" });
    const quiet = await questionRow(ids.quiet);
    expect(quiet.status).toBe("answering");
    const quietComplete = `complete-answer|question:${ids.quiet}|${rev}|${quiet.rowRevision}`;
    const beforeQuiet = await measure();
    expect(await refusal(action(ngo, "complete-answer", quietComplete, "complete-quiet"))).toBe(
      "invalid-request",
    );
    expect(await measure()).toEqual(beforeQuiet);
    const quietView = snapshotFromRecord(await facts(ngo), viewerFromRecord(await facts(ngo)));
    expect(quietView.questions.find((question) => question.id === ids.quiet)).toMatchObject({
      kind: "answering",
      complete: { kind: "unavailable", reason: "Write your answer first." },
    });

    const side = await sideChat(ids.retention);
    await outcome(side, { kind: "follow-up-open" });
    const open = await questionRow(ids.retention);
    const openToken = `complete-answer|question:${ids.retention}|${rev}|${open.rowRevision}`;
    const beforeOpen = await measure();
    expect(await refusal(action(ngo, "complete-answer", openToken, "complete-open"))).toBe(
      "follow-up-open",
    );
    expect(await measure()).toEqual(beforeOpen);
    const pending = snapshotFromRecord(await facts(ngo), viewerFromRecord(await facts(ngo)));
    expect(pending.questions.find((question) => question.id === ids.retention)).toMatchObject({
      kind: "answering",
      followUp: "pending",
      complete: { kind: "unavailable", reason: FOLLOW_UP },
    });
    await outcome(side, { kind: "follow-up-resolved" });

    const ready = questionFacts(await facts(ngo), ids.retention);
    const readyToken = tokenOf(ready, "complete");
    const admitted = await one(action(ngo, "complete-answer", readyToken, "complete-retention"));
    expect(admitted.messageId).toBeNull();
    const answerTurn = String(admitted.turnId);
    const turn = (await sql`select kind, state, message_id, chat_id from public.prd_turns
      where id = ${answerTurn}::uuid`) as Array<{
      kind: string;
      state: string;
      message_id: string | null;
      chat_id: string;
    }>;
    expect(turn[0]).toMatchObject({
      kind: "answer-write",
      state: "admitted",
      message_id: null,
      chat_id: side,
    });
    const spent = await questionRow(ids.retention);
    expect(spent.status).toBe("answering");
    expect(spent.rowRevision).toBe(open.rowRevision + 2);
    const beforeSpent = await measure();
    expect(await refusal(action(ngo, "complete-answer", readyToken, "complete-spent"))).toBe(
      "stale",
    );
    const fresh = `complete-answer|question:${ids.retention}|${rev}|${spent.rowRevision}`;
    expect(await refusal(action(ngo, "complete-answer", fresh, "complete-busy"))).toBe("busy");
    expect(await measure()).toEqual(beforeSpent);
    expect(
      await refusal(
        reserve(
          ngo,
          `side:${ids.retention}`,
          "side-while-answer",
          "hash-side-while-answer",
          { kind: "text", text: "More" },
          rev,
        ),
      ),
    ).toBe("busy");
    await one(finish(answerTurn));
    const freed = await one(
      reserve(
        ngo,
        `side:${ids.retention}`,
        "side-after-answer",
        "hash-side-after-answer",
        { kind: "text", text: "The side chat is free" },
        rev,
      ),
    );
    await one(finish(String(freed.turnId)));
  });

  it("wraps using an answer, and hides the developer's draft from the NGO", async () => {
    const rev = await revision();
    expect(
      await refusal(
        reserve(
          dev,
          "main",
          "use-early",
          "hash-use-early",
          { kind: "use-answer", questionId: ids.retention, answer: null, note: "" },
          rev,
        ),
      ),
    ).toBe("stale");
    const settledToken = tokenOf(questionFacts(await facts(dev), ids.settled), "post");
    await one(action(dev, "post-question", settledToken, "post-settled"));
    const side = await sideChat(ids.settled);
    const wrote = await one(
      reserve(
        ngo,
        `side:${ids.settled}`,
        "ngo-settled",
        "hash-ngo-settled",
        { kind: "text", text: "A month ahead." },
        rev,
      ),
    );
    await one(finish(String(wrote.turnId)));
    await outcome(side, { kind: "final-answer", answer: "One month ahead." });
    expect(
      await refusal(
        reserve(
          ngo,
          "main",
          "use-ngo",
          "hash-use-ngo",
          { kind: "use-answer", questionId: ids.settled, answer: null, note: "" },
          rev,
        ),
      ),
    ).toBe("forbidden");
    expect(
      await refusal(
        reserve(
          dev,
          "topic:booking",
          "use-topic",
          "hash-use-topic",
          { kind: "use-answer", questionId: ids.settled, answer: null, note: "Later" },
          rev,
        ),
      ),
    ).toBe("invalid-request");

    const before = await measure();
    const used = await one(
      reserve(
        dev,
        "main",
        "use-settled",
        "hash-use-settled",
        {
          kind: "use-answer",
          questionId: ids.settled,
          answer: "Six weeks ahead.",
          note: "Keep it shorter.",
        },
        rev,
      ),
    );
    expect((await questionRow(ids.settled)).status).toBe("used");
    expect(Number(used.sequence)).toBe(before.sequence + 1);
    const after = await measure();
    expect(after.messages).toBe(before.messages + 1);
    expect(after.turns).toBe(before.turns + 1);
    expect(after.actions).toBe(before.actions);
    const parts = (await sql`select parts from public.prd_messages
      where id = ${String(used.messageId)}::uuid`) as Array<{ parts: unknown }>;
    const body = JSON.stringify(parsed(parts[0].parts));
    expect(body).toContain("I’m using Maya’s answer for Who books shifts. Brief:");
    expect(body).toContain("How the answer was reached");
    expect(body).toContain("Settled with the AI in 1 message, then marked complete.");
    expect(body).toContain("I changed it to");
    expect(body).toContain("Six weeks ahead.");
    expect(body).toContain("My note");
    expect(body).toContain("Keep it shorter.");
    expect(body).not.toContain("How she got there");
    expect(body).not.toContain("What it changes");
    expect(body).not.toContain("To discuss");
    const replay = await one(
      reserve(
        dev,
        "main",
        "use-settled",
        "hash-use-settled",
        {
          kind: "use-answer",
          questionId: ids.settled,
          answer: "Six weeks ahead.",
          note: "Keep it shorter.",
        },
        rev,
      ),
    );
    expect(replay.turnId).toBe(used.turnId);
    expect(await measure()).toEqual(after);
    await one(finish(String(used.turnId)));

    await sql`select public.prd_save_draft(${dev}::uuid, ${project}::uuid, 'main', 'secret draft')`;
    const mainChat = main;
    await outcome(mainChat, {
      kind: "ask",
      questions: [
        {
          section: "booking",
          text: "Can volunteers swap shifts?",
          why: "It decides the screens.",
          options: ["Yes", "No"],
          suggested: "Yes",
          prerequisites: [],
          anchors: ["Who books shifts"],
        },
      ],
    });
    await sql`select public.prd_append_message(${project}::uuid, 'main', 'ai', 'ai4good AI',
      '[{"type":"text","text":"board line"}]'::jsonb, 'dev', ${dev}::uuid)`;
    const ngoFacts = await facts(ngo);
    const devFacts = await facts(dev);
    expect(ngoFacts.drafts).toEqual({});
    expect(devFacts.drafts).toEqual({ main: "secret draft" });
    expect(JSON.stringify(ngoFacts.chats)).not.toContain("board line");
    expect(JSON.stringify(devFacts.chats)).toContain("board line");
    expect(ngoFacts.devQuestions.map((question) => question.text)).toContain(
      "Can volunteers swap shifts?",
    );
    expect(ngoFacts).not.toHaveProperty("board");
  });

  it("refuses sends and actions once the PRD is closed", async () => {
    const rev = await revision();
    await sql`update public.prd_records set closed_revision = current_revision
      where project_id = ${project}::uuid`;
    const before = await measure();
    const replay = await one(
      reserve(
        dev,
        "main",
        "send-main",
        "hash-main",
        { kind: "text", text: "Hello from Priya" },
        rev,
      ),
    );
    expect(replay.turnId).toBe(held.mainTurn);
    expect(await measure()).toEqual(before);
    expect(
      await refusal(
        reserve(dev, "main", "send-closed", "hash-closed", { kind: "text", text: "Too late" }, rev),
      ),
    ).toBe("closed");
    expect(
      await refusal(
        reserve(
          ngo,
          `side:${ids.retention}`,
          "side-closed",
          "hash-side-closed",
          { kind: "text", text: "Too late" },
          rev,
        ),
      ),
    ).toBe("closed");
    expect(
      await refusal(
        reserve(
          ngo,
          "main",
          "ngo-main-closed",
          "hash-ngo-closed",
          { kind: "text", text: "Hi" },
          rev,
        ),
      ),
    ).toBe("forbidden");
    const posted = await questionRow(ids.retention);
    expect(await refusal(action(dev, "post-question", held.postToken, "post-retention"))).toBe(
      "closed",
    );
    expect(await refusal(action(dev, "close", `close|close|${rev}|1`, "close-when-closed"))).toBe(
      "closed",
    );
    expect(await questionRow(ids.retention)).toEqual(posted);
    expect(await measure()).toEqual(before);
    const devView = snapshotFromRecord(await facts(dev), viewerFromRecord(await facts(dev)));
    const ngoView = snapshotFromRecord(await facts(ngo), viewerFromRecord(await facts(ngo)));
    expect(devView.canWrite.main).toBe(false);
    expect(devView.send.main).toEqual({
      kind: "unavailable",
      block: "closed",
      reason: "The PRD is closed.",
    });
    expect(ngoView.send.main).toEqual({
      kind: "unavailable",
      block: "closed",
      reason: "The PRD is closed.",
    });
    expect(ngoView.canWrite.main).toBe(false);
  });
});
