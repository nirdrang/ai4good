import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";
import { AtPending } from "../../harness/registry.ts";
import { loadGithubTest } from "../../harness/github.ts";
import type { PrdSnapshot } from "../../../../src/lib/prd-stream.ts";
import { renderSection, sectionPath } from "../../../../supabase/functions/_shared/prd/file.ts";
import { FUNDS_OUT, ONLY_PRIYA_CLOSES } from "./_phrases.ts";
import {
  act,
  commitOnMain,
  credit,
  deliver,
  finishTurn,
  mainSha,
  open,
  readSnapshot,
  sectionFile,
  seed,
  send,
  signDelivery,
  webhookSecret,
} from "./_record.ts";

const MODEL = "gpt-6-luna";
const SPEND_CAP_MICROS = 250_000;
const PHONE = "The rota stores volunteer phone numbers.";
const CONSTRAINT = "No shift may be shorter than two hours.";
const QUESTION = "Which Saturday shortage should the kitchen count?";
const LATER_PUSH = "A later push must not appear in the closed view.";

type Seeded = Awaited<ReturnType<typeof seed>>;
type HttpAnswer = { status: number; json: Record<string, unknown> };

function whole(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  throw new Error(`expected a whole number, got ${JSON.stringify(value)}`);
}

function record(value: unknown): Record<string, unknown> {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("expected a record");
  }
  return parsed as Record<string, unknown>;
}

function envValue(text: string, key: string): string {
  const line = text.split(/\r?\n/).find((item) => item.startsWith(`${key}=`));
  if (line === undefined) throw new Error(`${key} is missing from supabase/functions/.env`);
  return line.slice(key.length + 1).replace(/^"|"$/g, "");
}

function configuredModel(): void {
  const path = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "supabase", "functions", ".env");
  const model = envValue(readFileSync(path, "utf8").replace(/^\uFEFF/, ""), "PRD_MODEL").trim();
  if (model !== MODEL) throw new Error(`the configured model is ${model}`);
}

async function providerSpend(seeded: Seeded): Promise<number> {
  const rows = (await seeded.sql`select coalesce((sum(amount) * 1000000)::bigint, 0) as micros
    from public.prd_ledger_entries
    where project_id = ${seeded.projectId}::uuid and component = 'provider'`) as Array<{ micros: unknown }>;
  return whole(rows[0]?.micros);
}

async function providerEvents(seeded: Seeded): Promise<number> {
  const rows = (await seeded.sql`select count(*) as n from public.prd_provider_events
    where project_id = ${seeded.projectId}::uuid`) as Array<{ n: unknown }>;
  return whole(rows[0]?.n);
}

async function checkCount(seeded: Seeded): Promise<number> {
  const rows = (await seeded.sql`select count(*) as n from public.prd_checks
    where project_id = ${seeded.projectId}::uuid`) as Array<{ n: unknown }>;
  return whole(rows[0]?.n);
}

async function namesEachUnconfirmed(seeded: Seeded, text: string): Promise<void> {
  const rows = (await seeded.sql`select title from public.prd_sections
    where project_id = ${seeded.projectId}::uuid and required and state <> 'confirmed'`) as Array<{ title: string }>;
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) expect(text, "the warning names each unconfirmed section").toContain(row.title);
}

async function plantDiscovery(seeded: Seeded): Promise<void> {
  const rows = (await seeded.sql`select document from public.brief_revisions
    where project_id = ${seeded.projectId}::uuid and revision = 2`) as Array<{ document: unknown }>;
  const document = record(rows[0]?.document);
  document.dataTier = { tier: "personal", kinds: ["contact"], reason: PHONE };
  document.fit = { verdict: "fits", reason: CONSTRAINT };
  await seeded.sql`insert into public.brief_revisions (project_id, revision, document, created_by)
    values (${seeded.projectId}::uuid, 4, ${JSON.stringify(document)}::text::jsonb, ${seeded.ngo.accountId}::uuid)`;
  await seeded.sql`insert into public.discovery_confirmations
    (project_id, revision, actor_id, actor_name, confirmed_at, accepted_gaps)
    values (${seeded.projectId}::uuid, 4, ${seeded.ngo.accountId}::uuid, 'Maya Levi', clock_timestamp(), '[]'::jsonb)`;
}

function expectRefusal(response: HttpAnswer, kind: string, reason?: string): void {
  expect(response.status, JSON.stringify(response.json)).toBe(409);
  expect(response.json.kind, JSON.stringify(response.json)).toBe(kind);
  if (reason !== undefined) expect(response.json.reason).toBe(reason);
}

function chatText(snapshot: PrdSnapshot): string {
  const chunks: string[] = [];
  for (const message of snapshot.chats.main ?? []) {
    for (const part of message.parts) {
      if (part.type === "text") chunks.push(part.text);
      if (part.type === "data-line") chunks.push(part.data.text);
    }
  }
  return chunks.join("\n");
}

function closeAsk(snapshot: PrdSnapshot) {
  for (const message of snapshot.chats.main ?? []) {
    for (const part of message.parts) {
      if (part.type === "data-close-ask") return part;
    }
  }
  return null;
}

function openClose(snapshot: PrdSnapshot) {
  if (snapshot.close.kind !== "open") throw new Error("the PRD is closed");
  return snapshot.close;
}

async function boardTables(seeded: Seeded): Promise<number> {
  const rows = (await seeded.sql`select count(*) as n from information_schema.tables
    where table_schema = 'public'
      and (table_name like '%board%' or table_name like '%bootstrap%'
        or table_name like '%development%' or table_name like '%linear%')`) as Array<{ n: unknown }>;
  return whole(rows[0]?.n);
}

async function logSpend(atId: string, seeded: Seeded): Promise<number> {
  try {
    const spent = await providerSpend(seeded);
    console.log(`${atId} provider cost ${spent} micros`);
    return spent;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unread";
    console.log(`${atId} provider cost unread: ${message}`);
    return 0;
  }
}

export async function proveClosedRevision(): Promise<void> {
  configuredModel();
  const seeded = await seed();
  try {
    await plantDiscovery(seeded);
    await credit(seeded, "20.000000");
    const opened = await open(seeded, seeded.dev);
    expect(opened.status, JSON.stringify(opened.json)).toBe(200);
    const before = await readSnapshot(seeded, seeded.dev);
    const pressed = await send(
      seeded,
      seeded.dev,
      { kind: "main" },
      { kind: "close-check" },
      before.revision,
      crypto.randomUUID(),
    );
    expect(pressed.status, JSON.stringify(pressed.json)).toBe(200);
    const warned = await readSnapshot(seeded, seeded.dev);
    const warning = openClose(warned);
    expect(warning.path, "a first close with open work warns").toBe("check");
    const ask = closeAsk(warned);
    if (ask === null) throw new Error("the warning has no Close anyway or Keep working");
    expect(ask.data.closeAnyway.kind).toBe("close-anyway");
    expect(ask.data.keepWorking.kind).toBe("keep-working");
    const warningText = chatText(warned);
    expect(warningText).toContain("You can close anyway");
    await namesEachUnconfirmed(seeded, warningText);

    const closedAction = await act(
      seeded,
      seeded.dev,
      "close-anyway",
      ask.data.closeAnyway.token,
      crypto.randomUUID(),
    );
    expect(closedAction.status, JSON.stringify(closedAction.json)).toBe(200);
    const closed = await readSnapshot(seeded, seeded.dev);
    if (closed.close.kind !== "closed") throw new Error("Close anyway left the PRD open");
    const points = (await seeded.sql`select kind, section_key, body from public.prd_close_points
      where project_id = ${seeded.projectId}::uuid order by ordinal`) as Array<Record<string, unknown>>;
    expect(closed.close.openPoints, "the closed snapshot counts the recorded points").toBe(points.length);
    expect(points.length, "the warning recorded at least the unconfirmed sections").toBeGreaterThan(0);
    const unconfirmed = (await seeded.sql`select stable_key from public.prd_sections
      where project_id = ${seeded.projectId}::uuid and required and state <> 'confirmed'`) as Array<{ stable_key: string }>;
    for (const section of unconfirmed) {
      expect(
        points.some((point) => point.section_key === section.stable_key && (point.kind === "gap" || point.kind === "unconfirmed")),
        `${section.stable_key} is recorded as an open point`,
      ).toBe(true);
    }
    const gaps = (await seeded.sql`select g.section_key, g.text from public.prd_check_gaps g
      join public.prd_checks c on c.id = g.check_id
      where c.project_id = ${seeded.projectId}::uuid and g.fixed = false`) as Array<Record<string, unknown>>;
    for (const gap of gaps) {
      expect(points).toContainEqual(
        expect.objectContaining({ kind: "gap", section_key: gap.section_key, body: gap.text }),
      );
    }
    const closeRow = (await seeded.sql`select revision, commit_sha, closed_anyway from public.prd_closes
      where project_id = ${seeded.projectId}::uuid`) as Array<Record<string, unknown>>;
    expect(closeRow).toHaveLength(1);
    expect(closeRow[0].closed_anyway).toBe(true);
    expect(whole(closeRow[0].revision)).toBe(closed.close.revision);
    const ops = (await seeded.sql`select status, commit_sha from public.prd_git_ops
      where project_id = ${seeded.projectId}::uuid and kind = 'close-tag'`) as Array<Record<string, unknown>>;
    expect([...ops], "the tag operation is published before anyone reads the tag").toEqual([
      { status: "published", commit_sha: closeRow[0].commit_sha },
    ]);

    const loaded = loadGithubTest();
    if (!loaded.ok) throw new Error(loaded.reason);
    const repos = (await seeded.sql`select repo_name from public.prd_records
      where project_id = ${seeded.projectId}::uuid`) as Array<{ repo_name: string }>;
    const repo = String(repos[0]?.repo_name ?? "");
    const name = `prd-r${whole(closeRow[0].revision)}`;
    const sha = String(closeRow[0].commit_sha);
    const tagged = await loaded.client.tag(repo, name, sha);
    expect(tagged, "the repository tag names the revision and points at the frozen commit").toEqual({
      ok: true,
      result: "tagged",
    });

    const revision = closed.revision;
    expectRefusal(
      await send(seeded, seeded.dev, { kind: "main" }, { kind: "text", text: "Too late" }, revision, crypto.randomUUID()),
      "closed",
      "the PRD is closed",
    );
    expectRefusal(
      await send(
        seeded,
        seeded.dev,
        { kind: "topic", topicId: "booking" },
        { kind: "text", text: "Too late" },
        revision,
        crypto.randomUUID(),
      ),
      "closed",
      "the PRD is closed",
    );
    expectRefusal(
      await send(seeded, seeded.dev, { kind: "main" }, { kind: "close-check" }, revision, crypto.randomUUID()),
      "closed",
      "the PRD is closed",
    );
    for (const kind of ["confirm-topic", "reopen-topic", "close", "close-anyway", "keep-working"] as const) {
      const token =
        kind === "close"
          ? `close|close|${revision}|0`
          : kind === "confirm-topic" || kind === "reopen-topic"
            ? `${kind}|topic:booking|${revision}|0`
            : `${kind}|ask:${ask.data.checkId}|${revision}|1`;
      expectRefusal(await act(seeded, seeded.dev, kind, token, crypto.randomUUID()), "closed", "the PRD is closed");
    }
    const devView = await readSnapshot(seeded, seeded.dev);
    const ngoView = await readSnapshot(seeded, seeded.ngo);
    expect(devView.send.main).toMatchObject({ kind: "unavailable", block: "closed" });
    expect(ngoView.send.main).toMatchObject({ kind: "unavailable", block: "closed" });
    expect(devView.close).toEqual(closed.close);
    expect(ngoView.close).toEqual(closed.close);

    const statements = devView.topics.map((topic) => ({ id: topic.id, state: topic.state, statements: topic.statements }));
    const heldRevision = devView.revision;
    const heldSequence = devView.sequence;
    const heldPoints = devView.close.kind === "closed" ? devView.close.openPoints : -1;
    const bookingPath = sectionPath("booking");
    const bookingFile = await sectionFile(loaded.client, repo, await mainSha(loaded.client, repo), bookingPath);
    const edited = {
      ...bookingFile.document,
      statements: bookingFile.document.statements.map((statement, index) =>
        index === 0 ? { text: LATER_PUSH, sources: statement.sources } : statement,
      ),
    };
    const pushed = await commitOnMain(
      loaded.client,
      repo,
      [{ path: bookingPath, content: renderSection({ key: bookingFile.key, title: bookingFile.title, document: edited }) }],
      "Edit who books shifts after close",
    );
    const repoRow = (await seeded.sql`select repo_id from public.prd_records
      where project_id = ${seeded.projectId}::uuid`) as Array<{ repo_id: unknown }>;
    const body = JSON.stringify({ repository: { id: whole(repoRow[0]?.repo_id) }, commits: [{ message: "ignored" }] });
    const delivered = await deliver(seeded.stack, body, signDelivery(webhookSecret(), body));
    expect(delivered.status, delivered.text).toBe(200);
    const afterPush = await readSnapshot(seeded, seeded.dev);
    expect(afterPush.revision).toBe(heldRevision);
    expect(afterPush.sequence).toBe(heldSequence);
    expect(afterPush.close).toEqual(devView.close);
    if (afterPush.close.kind === "closed") expect(afterPush.close.openPoints).toBe(heldPoints);
    expect(afterPush.topics.map((topic) => ({ id: topic.id, state: topic.state, statements: topic.statements }))).toEqual(
      statements,
    );
    expect(afterPush.topics.some((topic) => topic.statements.includes(LATER_PUSH))).toBe(false);
    const head = (await seeded.sql`select head_commit, current_revision from public.prd_records
      where project_id = ${seeded.projectId}::uuid`) as Array<Record<string, unknown>>;
    expect(String(head[0].head_commit)).toBe(pushed.sha);
    expect(whole(head[0].current_revision)).toBe(heldRevision);
    const history = (await seeded.sql`select max(revision) as n from public.prd_revisions
      where project_id = ${seeded.projectId}::uuid`) as Array<{ n: unknown }>;
    expect(whole(history[0].n)).toBeGreaterThan(heldRevision);
    expect(await boardTables(seeded), "closing writes nothing to a board table").toBe(0);

    const spent = await providerSpend(seeded);
    expect(spent, "the live run stays within 250000 micros").toBeLessThanOrEqual(SPEND_CAP_MICROS);
    throw new AtPending(
      "AT-036.06",
      "sut-missing",
      "The banner and the Open UI Design control are screen wiring, and the planning package is written after the last UI Design screen sign-off, not in this tree.",
    );
  } finally {
    await logSpend("AT-036.06", seeded);
    await seeded.sql.close();
  }
}

async function suggestBlocker(seeded: Seeded): Promise<void> {
  const chats = (await seeded.sql`select id from public.prd_chats
    where project_id = ${seeded.projectId}::uuid and kind = 'main'`) as Array<{ id: string }>;
  const messages = (await seeded.sql`select public.prd_insert_message(
    ${seeded.projectId}::uuid, ${String(chats[0].id)}::uuid, 'ai', 'ai4good AI', null,
    ${JSON.stringify([{ type: "text", text: QUESTION }])}::text::jsonb, null
  ) as id`) as Array<{ id: string }>;
  const sections = (await seeded.sql`select id from public.prd_sections
    where project_id = ${seeded.projectId}::uuid and stable_key = 'booking'`) as Array<{ id: string }>;
  await seeded.sql`insert into public.prd_questions
    (project_id, section_id, audience, status, body, why_now, options, blocking, intro_message)
    values (
      ${seeded.projectId}::uuid, ${String(sections[0].id)}::uuid, 'ngo', 'suggested', ${QUESTION},
      'It blocks the close.', array['This Saturday']::text[], true, ${String(messages[0].id)}::uuid
    )`;
}

export async function proveCloseAtAnyTime(): Promise<number> {
  configuredModel();
  const spent: number[] = [];
  const warning = await seed();
  try {
    await credit(warning, "20.000000");
    const opened = await open(warning, warning.dev);
    expect(opened.status, JSON.stringify(opened.json)).toBe(200);
    const start = await readSnapshot(warning, warning.dev);
    const startClose = openClose(start);
    expect(startClose.path, "Close PRD is available before a check exists").toBe("check");
    expect(startClose.close.kind).toBe("available");
    expect(startClose.remaining.some((item) => item.text.includes("Completion check runs when you close"))).toBe(true);
    const ngo = await readSnapshot(warning, warning.ngo);
    const ngoClose = openClose(ngo);
    expect(ngoClose.close).toEqual({ kind: "unavailable", reason: ONLY_PRIYA_CLOSES });
    expectRefusal(
      await send(warning, warning.ngo, { kind: "main" }, { kind: "close-check" }, start.revision, crypto.randomUUID()),
      "forbidden",
    );

    const reserved = (await warning.sql`select public.prd_turn_reserve(
      ${warning.dev.accountId}::uuid, ${warning.projectId}::uuid, 'topic:booking', ${crypto.randomUUID()},
      ${start.revision}, ${JSON.stringify({ kind: "text", text: "Still writing." })}::text::jsonb,
      ${`hash-${crypto.randomUUID()}`}
    ) as r`) as Array<{ r: unknown }>;
    const topic = record(reserved[0].r);
    expectRefusal(
      await send(warning, warning.dev, { kind: "main" }, { kind: "close-check" }, start.revision, crypto.randomUUID()),
      "busy",
      "Wait for the AI to finish.",
    );
    await finishTurn(warning, String(topic.turnId));

    const beforeEvents = await providerEvents(warning);
    const beforeChecks = await checkCount(warning);
    const pressed = await send(
      warning,
      warning.dev,
      { kind: "main" },
      { kind: "close-check" },
      start.revision,
      crypto.randomUUID(),
    );
    expect(pressed.status, JSON.stringify(pressed.json)).toBe(200);
    const first = await readSnapshot(warning, warning.dev);
    const firstClose = openClose(first);
    expect(firstClose.path).toBe("check");
    expect(first.revision).toBe(start.revision);
    const ask = closeAsk(first);
    if (ask === null) throw new Error("the warning has no Close anyway or Keep working");
    expect(ask.data.closeAnyway.kind).toBe("close-anyway");
    expect(ask.data.keepWorking.kind).toBe("keep-working");
    expect(chatText(first)).toContain("You can close anyway");
    await namesEachUnconfirmed(warning, chatText(first));
    expect(await checkCount(warning)).toBe(beforeChecks + 1);
    expect(await providerEvents(warning)).toBeGreaterThan(beforeEvents);

    const kept = await act(warning, warning.dev, "keep-working", ask.data.keepWorking.token, crypto.randomUUID());
    expect(kept.status, JSON.stringify(kept.json)).toBe(200);
    const afterKeep = await readSnapshot(warning, warning.dev);
    expect(afterKeep.close.kind).toBe("open");
    expect(afterKeep.revision).toBe(start.revision);
    const stillOpen = (await warning.sql`select state, closed_revision from public.prd_records
      where project_id = ${warning.projectId}::uuid`) as Array<Record<string, unknown>>;
    expect(stillOpen[0].state).toBe("open");
    expect(stillOpen[0].closed_revision).toBeNull();

    const spentOnce = await providerSpend(warning);
    const eventsOnce = await providerEvents(warning);
    const checksOnce = await checkCount(warning);
    const repeated = await send(
      warning,
      warning.dev,
      { kind: "main" },
      { kind: "close-check" },
      afterKeep.revision,
      crypto.randomUUID(),
    );
    expect(repeated.status, JSON.stringify(repeated.json)).toBe(200);
    const second = await readSnapshot(warning, warning.dev);
    expect(second.close.kind).toBe("open");
    expect(closeAsk(second)).not.toBeNull();
    expect(await providerSpend(warning), "a repeated Close PRD on this revision makes no model call").toBe(spentOnce);
    expect(await providerEvents(warning)).toBe(eventsOnce);
    expect(await checkCount(warning)).toBe(checksOnce);
    spent.push(await logSpend("AT-036.16 warning", warning));
  } finally {
    await warning.sql.close();
  }

  const unfunded = await seed();
  try {
    const opened = await open(unfunded, unfunded.dev);
    expect(opened.status, JSON.stringify(opened.json)).toBe(200);
    const view = await readSnapshot(unfunded, unfunded.dev);
    const close = openClose(view);
    expect(close.close).toEqual({ kind: "unavailable", reason: FUNDS_OUT });
    expectRefusal(
      await send(unfunded, unfunded.dev, { kind: "main" }, { kind: "close-check" }, view.revision, crypto.randomUUID()),
      "funds",
      FUNDS_OUT,
    );
    const turns = (await unfunded.sql`select count(*) as n from public.prd_turns
      where project_id = ${unfunded.projectId}::uuid`) as Array<{ n: unknown }>;
    expect(whole(turns[0].n), "a funds refusal starts no check").toBe(0);
    spent.push(await logSpend("AT-036.16 funds", unfunded));
  } finally {
    await unfunded.sql.close();
  }

  const passing = await seed();
  try {
    await credit(passing, "20.000000");
    const opened = await open(passing, passing.dev);
    expect(opened.status, JSON.stringify(opened.json)).toBe(200);
    await passing.sql`update public.prd_sections set state = 'confirmed'
      where project_id = ${passing.projectId}::uuid and required = true`;
    await suggestBlocker(passing);
    const ready = await readSnapshot(passing, passing.dev);
    const reserved = (await passing.sql`select public.prd_turn_reserve(
      ${passing.dev.accountId}::uuid, ${passing.projectId}::uuid, 'main', ${crypto.randomUUID()},
      ${ready.revision}, ${JSON.stringify({ kind: "close-check" })}::text::jsonb, ${`hash-${crypto.randomUUID()}`}
    ) as r`) as Array<{ r: unknown }>;
    const started = record(reserved[0].r);
    const turnId = String(started.turnId);
    const checkId = crypto.randomUUID();
    await passing.sql`select public.prd_check_record(
      ${passing.projectId}::uuid, ${turnId}::uuid, ${checkId}::uuid, ${100}, 'The planted check passes.',
      ${"[]"}::text::jsonb, ${JSON.stringify([{ type: "text", text: "The planted check passes." }])}::text::jsonb
    )`;
    await finishTurn(passing, turnId);
    const beforeSpend = await providerSpend(passing);
    const beforeEvents = await providerEvents(passing);
    expect(beforeSpend).toBe(0);
    expect(beforeEvents).toBe(0);
    const warned = await send(
      passing,
      passing.dev,
      { kind: "main" },
      { kind: "close-check" },
      ready.revision,
      crypto.randomUUID(),
    );
    expect(warned.status, JSON.stringify(warned.json)).toBe(200);
    const blocked = await readSnapshot(passing, passing.dev);
    expect(openClose(blocked).path, "an open blocking question warns after a passing check").toBe("check");
    expect(chatText(blocked)).toContain(`Open blocking questions: ${QUESTION}`);
    expect(chatText(blocked)).toContain("passes.");
    expect(await providerSpend(passing)).toBe(0);
    expect(await providerEvents(passing)).toBe(0);
    expect(await checkCount(passing)).toBe(1);

    await passing.sql`update public.prd_questions set blocking = false
      where project_id = ${passing.projectId}::uuid and body = ${QUESTION}`;
    const clear = await readSnapshot(passing, passing.dev);
    const clearClose = openClose(clear);
    expect(clearClose.path).toBe("close");
    if (clearClose.close.kind !== "available") throw new Error("a passing revision did not offer close");
    const closedAction = await act(passing, passing.dev, "close", clearClose.close.action.token, crypto.randomUUID());
    expect(closedAction.status, JSON.stringify(closedAction.json)).toBe(200);
    const closed = await readSnapshot(passing, passing.dev);
    expect(closed.close).toEqual({ kind: "closed", revision: clear.revision, openPoints: 0 });
    expect(await providerSpend(passing), "the seeded passing close makes no model call").toBe(0);
    expect(await providerEvents(passing)).toBe(0);
    spent.push(await logSpend("AT-036.16 passing", passing));
  } finally {
    await passing.sql.close();
  }

  const total = spent.reduce((sum, item) => sum + item, 0);
  expect(total, "the live run stays within 250000 micros").toBeLessThanOrEqual(SPEND_CAP_MICROS);
  return total;
}
