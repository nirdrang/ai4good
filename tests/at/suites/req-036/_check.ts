import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema, type UIMessageChunk } from "ai";
import { expect } from "vitest";
import { AtPending } from "../../harness/registry.ts";
import type { PrdSnapshot } from "../../../../src/lib/prd-stream.ts";
import { act, credit, open, readSnapshot, seed } from "./_record.ts";

const MODEL = "gpt-6-luna";
const SPEND_CAP_MICROS = 250_000;
const PHONE = "The rota stores volunteer phone numbers.";
const CONSTRAINT = "No shift may be shorter than two hours.";
const CONFIRM_ORDER = ["booking", "rules", "technical-scope"] as const;

type Seeded = Awaited<ReturnType<typeof seed>>;

const PLANTED = [
  {
    name: "a user story",
    match: (text: string, section: string) => section === "technical-scope" && /stor(y|ies)/i.test(text),
  },
  {
    name: "an acceptance criterion",
    match: (text: string, section: string) => section === "technical-scope" && /acceptance/i.test(text),
  },
  {
    name: "a data-handling decision",
    match: (text: string, _section: string) => /phone|data handling|contact/i.test(text),
  },
  {
    name: "a constraint",
    match: (text: string, _section: string) => /two hours|shorter|constraint/i.test(text),
  },
];

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

function bytes(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
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

async function markReady(seeded: Seeded): Promise<void> {
  await seeded.sql`update public.prd_sections set state = 'ready'
    where project_id = ${seeded.projectId}::uuid and required = true`;
}

async function confirmTopic(seeded: Seeded, key: string, request: string): Promise<Record<string, unknown>> {
  const view = await readSnapshot(seeded, seeded.dev);
  const topic = view.topics.find((item) => item.id === key);
  if (topic === undefined || topic.confirm.kind !== "available") {
    const reason = topic?.confirm.kind === "unavailable" ? topic.confirm.reason : "missing";
    throw new Error(`${key} cannot be confirmed: ${reason}`);
  }
  const response = await act(seeded, seeded.dev, "confirm-topic", topic.confirm.action.token, request);
  if (response.status !== 200) {
    throw new Error(`confirm ${key} answered ${response.status}: ${JSON.stringify(response.json)}`);
  }
  return response.json;
}

function checkMessage(snapshot: PrdSnapshot): { text: string; checkId: string; gaps: number } {
  for (const message of snapshot.chats.main ?? []) {
    if (message.role !== "assistant") continue;
    const text = message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
    const check = message.parts.find((part) => part.type === "data-check");
    if (check?.type !== "data-check") continue;
    return { text, checkId: check.data.checkId, gaps: check.data.gaps.length };
  }
  throw new Error("the main chat has no completion check message");
}

function missingThemes(gaps: ReadonlyArray<{ topicId: string; text: string }>): string[] {
  const taken = new Set<number>();
  for (const gap of gaps) {
    const index = PLANTED.findIndex(
      (theme, themeIndex) => !taken.has(themeIndex) && theme.match(gap.text, gap.topicId),
    );
    if (index >= 0) taken.add(index);
  }
  return PLANTED.filter((_, index) => !taken.has(index)).map((theme) => theme.name);
}

async function sendStream(seeded: Seeded, topicId: string, text: string, revision: number, request: string) {
  const response = await fetch(`${seeded.stack.apiUrl.replace(/\/$/, "")}/functions/v1/prd-message`, {
    method: "POST",
    headers: {
      apikey: seeded.stack.anonKey,
      Authorization: `Bearer ${seeded.dev.token}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      projectId: seeded.projectId,
      scope: { kind: "topic", topicId },
      requestId: request,
      baseRevision: revision,
      intent: { kind: "text", text },
    }),
  });
  const body = await response.text();
  if (response.status !== 200) throw new Error(`the topic chat answered ${response.status}: ${body.slice(0, 400)}`);
  const reader = parseJsonEventStream({ stream: bytes(body), schema: uiMessageChunkSchema }).getReader();
  const chunks: UIMessageChunk[] = [];
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    if (!next.value.success) throw new Error("the topic chat stream did not parse");
    chunks.push(next.value.value);
  }
  const error = chunks.find((chunk) => chunk.type === "error");
  if (error !== undefined && error.type === "error") throw new Error(`the topic chat failed: ${error.errorText}`);
  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  let reply = "";
  for await (const message of readUIMessageStream({ stream })) {
    reply = message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");
  }
  return reply;
}

async function gapRows(seeded: Seeded): Promise<Array<{ section: string; text: string; fixed: boolean; state: string; gap: string | null }>> {
  const rows = (await seeded.sql`select g.section_key, g.text, g.fixed, s.state, s.gap_text
    from public.prd_check_gaps g
    join public.prd_checks c on c.id = g.check_id
    join public.prd_sections s on s.project_id = c.project_id and s.stable_key = g.section_key
    where c.project_id = ${seeded.projectId}::uuid
    order by g.created_at`) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    section: String(row.section_key),
    text: String(row.text),
    fixed: row.fixed === true,
    state: String(row.state),
    gap: row.gap_text === null || row.gap_text === undefined ? null : String(row.gap_text),
  }));
}

export async function proveCompletionCheck(): Promise<void> {
  configuredModel();
  const seeded = await seed();
  try {
    await plantDiscovery(seeded);
    await credit(seeded, "20.000000");
    const opened = await open(seeded, seeded.dev);
    expect(opened.status, JSON.stringify(opened.json)).toBe(200);
    await markReady(seeded);
    const configRows = (await seeded.sql`select threshold, threshold_text, placeholder
      from public.prd_check_config where key = 'completion'`) as Array<Record<string, unknown>>;
    const config = configRows[0];
    if (config === undefined) throw new Error("the completion check threshold row is missing");
    const threshold = whole(config.threshold);
    const thresholdText = String(config.threshold_text);
    expect(config.placeholder, "the threshold row is the pilot placeholder").toBe(true);

    let lastRequest = "";
    for (const key of CONFIRM_ORDER) {
      lastRequest = crypto.randomUUID();
      const body = await confirmTopic(seeded, key, lastRequest);
      expect(body.state, `${key} confirms`).toBe("confirmed");
      if (key !== "technical-scope") expect(body.check, `${key} does not start the check`).toBeUndefined();
    }

    const checked = await readSnapshot(seeded, seeded.dev);
    if (checked.check === null) throw new Error("the completion check was not recorded");
    const checkRows = (await seeded.sql`select revision, threshold, threshold_text, passed
      from public.prd_checks where project_id = ${seeded.projectId}::uuid`) as Array<Record<string, unknown>>;
    expect(checkRows, "one check is recorded for this revision").toHaveLength(1);
    expect(whole(checkRows[0].revision)).toBe(checked.revision);
    expect(whole(checkRows[0].threshold), "the check uses the configured threshold").toBe(threshold);
    expect(String(checkRows[0].threshold_text)).toBe(thresholdText);
    expect(checked.check.revision).toBe(checked.revision);
    expect(checked.check.thresholdText).toBe(thresholdText);
    expect(checked.check.passed).toBe(checkRows[0].passed === true);
    const absent = missingThemes(checked.check.gaps);
    if (absent.length > 0) {
      throw new Error(`the model found fewer than the four planted gaps. Missing: ${absent.join(", ")}.`);
    }
    for (const gap of checked.check.gaps) {
      const topic = checked.topics.find((item) => item.id === gap.topicId);
      expect(topic?.state, `${gap.topicId} goes to Needs review`).toBe("needs-review");
      expect(topic?.confirm.kind, `${gap.topicId} cannot be confirmed while the gap is open`).toBe("unavailable");
    }
    const posted = checkMessage(checked);
    expect(posted.checkId).toBe(checked.check.id);
    expect(posted.gaps).toBe(checked.check.gaps.length);
    expect(posted.text).toContain(thresholdText);

    const spent = await providerSpend(seeded);
    const events = await providerEvents(seeded);
    const replay = await act(seeded, seeded.dev, "confirm-topic", `confirm-topic|topic:technical-scope|${checked.revision}|0`, lastRequest);
    expect(replay.status, JSON.stringify(replay.json)).toBe(200);
    expect(await providerSpend(seeded), "a repeated trigger for this revision makes no model call").toBe(spent);
    expect(await providerEvents(seeded), "a repeated trigger adds no provider event").toBe(events);
    const still = (await seeded.sql`select count(*) as n from public.prd_checks
      where project_id = ${seeded.projectId}::uuid`) as Array<{ n: unknown }>;
    expect(whole(still[0].n)).toBe(1);

    const openGap = checked.check.gaps.find((gap) => gap.fixed === false);
    if (openGap === undefined) throw new Error("the check recorded no open gap");
    const beforeFix = await readSnapshot(seeded, seeded.dev);
    await sendStream(
      seeded,
      openGap.topicId,
      `Add this exact sentence to this section. Read the section, stage the document with that sentence added, and commit. Do not remove the sentences already there. The sentence is: ${openGap.text}`,
      beforeFix.revision,
      crypto.randomUUID(),
    );
    const closed = (await gapRows(seeded)).filter((row) => row.section === openGap.topicId && row.text === openGap.text);
    expect(closed.length, "the fixed gap is still recorded").toBeGreaterThan(0);
    expect(closed.every((row) => row.fixed), "the topic-chat change closes the gap").toBe(true);
    expect(closed.every((row) => row.gap === null), "the section gap clears").toBe(true);
    const again = await readSnapshot(seeded, seeded.dev);
    const topic = again.topics.find((item) => item.id === openGap.topicId);
    if (topic === undefined || topic.confirm.kind !== "available") {
      throw new Error(`confirm did not return after the gap closed: ${topic?.confirm.kind === "unavailable" ? topic.confirm.reason : "missing"}`);
    }
    const confirmed = await act(seeded, seeded.dev, "confirm-topic", topic.confirm.action.token, crypto.randomUUID());
    expect(confirmed.status, JSON.stringify(confirmed.json)).toBe(200);
    expect(confirmed.json.state).toBe("confirmed");

    const total = await providerSpend(seeded);
    expect(total, "the live run stays within 250000 micros").toBeLessThanOrEqual(SPEND_CAP_MICROS);
    throw new AtPending(
      "AT-036.04",
      "sut-missing",
      "The screen line for the score and threshold, and the Close PRD half, are the next units.",
    );
  } finally {
    try {
      const spent = await providerSpend(seeded);
      console.log(`AT-036.04 provider cost ${spent} micros`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unread";
      console.log(`AT-036.04 provider cost unread: ${message}`);
    }
    await seeded.sql.close();
  }
}
