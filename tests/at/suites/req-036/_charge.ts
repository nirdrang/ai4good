import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema, type UIMessageChunk } from "ai";
import { expect } from "vitest";
import { loadGithubTest } from "../../harness/github.ts";
import { AtPending } from "../../harness/registry.ts";
import type { PrdSnapshot } from "../../../../src/lib/prd-stream.ts";
import { credit, mainSha, open, readSnapshot, sectionFile, seed, topicById } from "./_record.ts";

const MODEL = "gpt-6-luna";
const SPEND_CAP_MICROS = 250_000;
const MAIN_TEXT = "Reply with this exact sentence and do not change the PRD: The rota stays a spreadsheet.";
const SECTION_TEXT =
  "Add this exact sentence to the booking section. Read the section, stage the document with that sentence added, and commit. Do not remove the sentences already there. The sentence is: Volunteers can book a Saturday shift a week ahead.";
const SENTENCE = "Volunteers can book a Saturday shift a week ahead.";
const TOPIC_KEY = "topic:booking";
const CHARGE_WORD = /\b(?:fee|receipt|cost)\b/i;

type Seeded = Awaited<ReturnType<typeof seed>>;
type Scope = { kind: "main" } | { kind: "topic"; topicId: string };
type Tokens = { input: bigint; output: bigint; cacheRead: bigint; cacheWrite: bigint };
type Rates = Tokens;

function whole(value: unknown): number {
  if (typeof value === "bigint") {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new Error("the amount does not fit");
    }
    return Number(value);
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  throw new Error(`expected a whole number, got ${JSON.stringify(value)}`);
}

function big(value: unknown): bigint {
  return BigInt(whole(value));
}

function roundDiv(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n;
  const value = negative ? -numerator : numerator;
  const quotient = value / denominator;
  const remainder = value % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

function record(value: unknown): Record<string, unknown> {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("expected a record");
  }
  return parsed as Record<string, unknown>;
}

function envValue(text: string, key: string): string {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(`${key}=`)) continue;
    let value = trimmed.slice(key.length + 1).trim();
    const first = value[0];
    const last = value[value.length - 1];
    if (value.length >= 2 && ((first === '"' && last === '"') || (first === "'" && last === "'"))) {
      value = value.slice(1, -1);
    }
    if (value === "") throw new Error(`${key} is empty`);
    return value;
  }
  throw new Error(`${key} is missing from supabase/functions/.env`);
}

function configuredService(): { model: string; baseURL: string } {
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
  const model = envValue(text, "PRD_MODEL").trim();
  const baseURL = envValue(text, "PRD_MODEL_BASE_URL").trim().replace(/\/+$/, "");
  if (model !== MODEL) throw new Error(`the configured model is ${model}`);
  if (baseURL === "") throw new Error("the configured base URL is empty");
  return { model, baseURL };
}

function bytes(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

function texts(snapshot: PrdSnapshot, key: string, role: "assistant" | "user"): string[] {
  return (snapshot.chats[key] ?? []).flatMap((message) =>
    message.role === role
      ? [message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("")]
      : [],
  );
}

function chargedParts(snapshot: PrdSnapshot): string[] {
  const found: string[] = [];
  for (const messages of Object.values(snapshot.chats)) {
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts) {
        const text = JSON.stringify(part);
        if (CHARGE_WORD.test(text)) found.push(text);
      }
    }
  }
  return found;
}

async function sendStream(seeded: Seeded, scope: Scope, text: string, revision: number, request: string) {
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
      scope,
      requestId: request,
      baseRevision: revision,
      intent: { kind: "text", text },
    }),
  });
  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    streamHeader: response.headers.get("x-vercel-ai-ui-message-stream"),
    body: await response.text(),
  };
}

async function readStream(body: string, label: string): Promise<string> {
  expect(body.includes("data: [DONE]"), `${label} ends`).toBe(true);
  const reader = parseJsonEventStream({ stream: bytes(body), schema: uiMessageChunkSchema }).getReader();
  const chunks: UIMessageChunk[] = [];
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    if (!next.value.success) {
      const reason = next.value.error instanceof Error ? next.value.error.message : "the chunk was rejected";
      throw new Error(`${label} did not parse: ${reason}`);
    }
    chunks.push(next.value.value);
  }
  const error = chunks.find((chunk) => chunk.type === "error");
  if (error !== undefined && error.type === "error") throw new Error(`${label} failed: ${error.errorText}`);
  expect(chunks.some((chunk) => chunk.type === "finish"), `${label} finishes`).toBe(true);
  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  let text = "";
  for await (const message of readUIMessageStream({ stream })) {
    text = message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");
  }
  expect(CHARGE_WORD.test(text), `${label} carries no fee, receipt, or cost`).toBe(false);
  return text;
}

async function streamedReply(seeded: Seeded, scope: Scope, text: string, revision: number, request: string) {
  const response = await sendStream(seeded, scope, text, revision, request);
  expect(response.status, response.body.slice(0, 400)).toBe(200);
  expect(response.contentType, "the reply is a UI message stream").toContain("text/event-stream");
  expect(response.streamHeader, "the reply is a UI message stream").toBe("v1");
  return readStream(response.body, scope.kind === "main" ? "the streamed reply" : "the section reply");
}

async function turnRow(seeded: Seeded, request: string): Promise<{ id: string; state: string }> {
  const rows = (await seeded.sql`select id::text as id, state from public.prd_turns
    where project_id = ${seeded.projectId}::uuid and request_id = ${request}`) as Array<{
    id: string;
    state: string;
  }>;
  expect(rows, "one request is one turn").toHaveLength(1);
  return { id: String(rows[0].id), state: String(rows[0].state) };
}

async function providerSpend(seeded: Seeded): Promise<number> {
  const rows = (await seeded.sql`select coalesce((sum(amount) * 1000000)::bigint, 0) as micros
    from public.prd_ledger_entries
    where project_id = ${seeded.projectId}::uuid and component = 'provider'`) as Array<{
    micros: unknown;
  }>;
  return whole(rows[0]?.micros);
}

async function eventCount(seeded: Seeded): Promise<number> {
  const rows = (await seeded.sql`select count(*) as n from public.prd_provider_events
    where project_id = ${seeded.projectId}::uuid`) as Array<{ n: unknown }>;
  return whole(rows[0]?.n);
}

type EventRow = {
  event_id: string;
  state: string;
  input_tokens: unknown;
  output_tokens: unknown;
  cache_read_tokens: unknown;
  cache_write_tokens: unknown;
};

type EntryRow = { component: string; source_key: string; micros: unknown; rate_card: string | null };

async function eventsOf(seeded: Seeded, turnId: string): Promise<EventRow[]> {
  return (await seeded.sql`select event_id, state, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens
    from public.prd_provider_events
    where turn_id = ${turnId}::uuid
    order by event_id`) as EventRow[];
}

async function entriesOf(seeded: Seeded, turnId: string): Promise<EntryRow[]> {
  return (await seeded.sql`select component, source_key, (amount * 1000000)::bigint as micros, rate_card
    from public.prd_ledger_entries
    where turn_id = ${turnId}::uuid
    order by component, source_key`) as EntryRow[];
}

function fingerprint(events: EventRow[], entries: EntryRow[]): string {
  return JSON.stringify({
    events: events.map((row) => ({
      eventId: String(row.event_id),
      state: String(row.state),
      input: whole(row.input_tokens),
      output: whole(row.output_tokens),
      cacheRead: whole(row.cache_read_tokens),
      cacheWrite: whole(row.cache_write_tokens),
    })),
    entries: entries.map((row) => ({
      component: String(row.component),
      source: String(row.source_key),
      micros: whole(row.micros),
    })),
  });
}

async function ratesFor(seeded: Seeded, version: number, card: string): Promise<Rates> {
  const rows = (await seeded.sql`select category, (usd * 1000000)::bigint as micros
    from public.prd_rate_versions
    where model = ${MODEL} and version = ${version} and rate_card = ${card}`) as Array<{
    category: string;
    micros: unknown;
  }>;
  const price = (category: string): bigint => {
    const found = rows.find((row) => row.category === category);
    if (found === undefined) throw new Error(`the ${MODEL} rate has no ${category} price on ${card}`);
    return big(found.micros);
  };
  return {
    input: price("input"),
    output: price("output"),
    cacheRead: price("cache-read"),
    cacheWrite: price("cache-write"),
  };
}

function priced(tokens: Tokens, rates: Rates, feeBasisPoints: bigint): { provider: bigint; fee: bigint } {
  const weighted =
    tokens.input * rates.input +
    tokens.output * rates.output +
    tokens.cacheRead * rates.cacheRead +
    tokens.cacheWrite * rates.cacheWrite;
  const provider = roundDiv(weighted, 1_000_000n);
  return { provider, fee: roundDiv(provider * feeBasisPoints, 10_000n) };
}

async function expectTurnCharge(
  seeded: Seeded,
  turnId: string,
  settledBefore: number,
  settledAfter: number,
): Promise<{ requests: number; providerMicros: number }> {
  const reserved = (await seeded.sql`select model, rate_version, trunc(fee_basis_points)::bigint as bps
    from public.prd_reservations where turn_id = ${turnId}::uuid`) as Array<{
    model: string;
    rate_version: unknown;
    bps: unknown;
  }>;
  expect(reserved, "the turn was priced for one model").toHaveLength(1);
  expect(reserved[0].model, "the turn was priced for the configured model").toBe(MODEL);
  const version = whole(reserved[0].rate_version);
  const feeBasisPoints = big(reserved[0].bps);
  const events = await eventsOf(seeded, turnId);
  expect(events.length, "the turn made a model request").toBeGreaterThan(0);
  const entries = await entriesOf(seeded, turnId);
  let provider = 0n;
  let fee = 0n;
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  for (const event of events) {
    expect(event.state, `${event.event_id} is settled`).toBe("settled");
    const tokens = {
      input: big(event.input_tokens),
      output: big(event.output_tokens),
      cacheRead: big(event.cache_read_tokens),
      cacheWrite: big(event.cache_write_tokens),
    };
    expect(
      whole(tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite),
      `${event.event_id} reports tokens`,
    ).toBeGreaterThan(0);
    const card =
      tokens.input + tokens.cacheRead + tokens.cacheWrite <= 100_000n ? "up-to-100k" : "over-100k";
    const cost = priced(tokens, await ratesFor(seeded, version, card), feeBasisPoints);
    const key = `event:${event.event_id}`;
    const providerRow = entries.find((row) => row.component === "provider" && row.source_key === key);
    const feeRow = entries.find((row) => row.component === "fee" && row.source_key === key);
    expect(providerRow, `${event.event_id} is charged once`).toBeDefined();
    expect(feeRow, `${event.event_id} keeps the platform fee separate`).toBeDefined();
    expect(providerRow?.rate_card, `${event.event_id} uses the ${MODEL} rate row`).toBe(card);
    expect(whole(providerRow?.micros), `${event.event_id} keeps the ${MODEL} price in micros`).toBe(
      whole(cost.provider),
    );
    expect(whole(feeRow?.micros), `${event.event_id} prices the fee apart from the provider`).toBe(
      whole(cost.fee),
    );
    provider += cost.provider;
    fee += cost.fee;
    input += whole(tokens.input);
    output += whole(tokens.output);
    cacheRead += whole(tokens.cacheRead);
    cacheWrite += whole(tokens.cacheWrite);
  }
  expect(entries.filter((row) => row.component === "provider"), "one provider charge per request").toHaveLength(
    events.length,
  );
  expect(entries.filter((row) => row.component === "fee"), "one fee per request").toHaveLength(events.length);
  const ledgerRows = (await seeded.sql`select public.prd_ledger(${seeded.projectId}::uuid, ${turnId}::uuid) as ledger`) as Array<{
    ledger: unknown;
  }>;
  const ledger = record(ledgerRows[0]?.ledger);
  const providerMicros = whole(provider);
  const feeMicros = whole(fee);
  const deductedMicros = whole(provider + fee);
  expect(whole(ledger.providerMicros), "the ledger provider cost is the priced sum").toBe(providerMicros);
  expect(whole(ledger.feeMicros), "the ledger keeps the platform fee separate").toBe(feeMicros);
  expect(whole(ledger.deductedMicros), "the deducted total is the provider cost plus the fee").toBe(
    deductedMicros,
  );
  expect(whole(ledger.deductedMicros), "the deducted total equals the two amounts").toBe(
    whole(ledger.providerMicros) + whole(ledger.feeMicros),
  );
  const tokens = record(ledger.tokens);
  expect(whole(tokens.input)).toBe(input);
  expect(whole(tokens.output)).toBe(output);
  expect(whole(tokens.cacheRead)).toBe(cacheRead);
  expect(whole(tokens.cacheWrite)).toBe(cacheWrite);
  const pending = typeof ledger.pending === "string" ? JSON.parse(ledger.pending) : ledger.pending;
  expect(pending, "a settled request is not pending").toEqual([]);
  expect(whole(ledger.heldMicros), "the reservation is released").toBe(0);
  expect(settledAfter - settledBefore, "the settled funds moved by the deducted total").toBe(deductedMicros);
  return { requests: events.length, providerMicros };
}

async function expectSettings(seeded: Seeded, turnId: string, baseURL: string): Promise<void> {
  const rows = (await seeded.sql`select model, settings from public.prd_turn_settings
    where turn_id = ${turnId}::uuid`) as Array<{ model: string; settings: unknown }>;
  expect(rows, "the turn records its settings once").toHaveLength(1);
  expect(rows[0].model).toBe(MODEL);
  expect(record(rows[0].settings)).toEqual({ baseURL, model: MODEL });
}

async function repoName(seeded: Seeded): Promise<string> {
  const rows = (await seeded.sql`select repo_name from public.prd_records
    where project_id = ${seeded.projectId}::uuid`) as Array<{ repo_name: string }>;
  const name = rows[0]?.repo_name;
  if (typeof name !== "string" || name === "") throw new Error("the PRD has no repository");
  return name;
}

async function bookingPath(seeded: Seeded): Promise<string> {
  const rows = (await seeded.sql`select file_path from public.prd_sections
    where project_id = ${seeded.projectId}::uuid and stable_key = 'booking'`) as Array<{
    file_path: string;
  }>;
  const path = rows[0]?.file_path;
  if (typeof path !== "string" || path === "") throw new Error("booking has no file path");
  return path;
}

function statementText(file: { document: { statements: Array<{ text: string }> } }): string {
  return file.document.statements.map((statement) => statement.text).join("\n");
}

async function expectToolCommit(seeded: Seeded, turnId: string, beforeSha: string, beforeText: string) {
  const loaded = loadGithubTest();
  if (!loaded.ok) throw new Error(loaded.reason);
  const repo = await repoName(seeded);
  const path = await bookingPath(seeded);
  const head = await mainSha(loaded.client, repo);
  if (head.toLowerCase() === beforeSha.toLowerCase()) {
    throw new Error("the booking section did not change in the repository");
  }
  const range = await loaded.client.commitsSince(repo, beforeSha, head);
  if (!range.ok) throw new Error(range.reason);
  if (range.result !== "commits") throw new Error("main left the line of commits");
  expect(range.commits, "the section changed as one commit").toHaveLength(1);
  const message = range.commits[0]?.message ?? "";
  const lines = message.split("\n");
  expect(lines[0], "the commit subject").toBe("Update the PRD");
  expect(
    lines.filter((line) => line.startsWith("PRD-Turn:")),
    "the commit carries this turn",
  ).toEqual([`PRD-Turn: ${turnId}`]);
  const after = await sectionFile(loaded.client, repo, head, path);
  const afterText = statementText(after);
  expect(afterText, "the booking section changed").not.toBe(beforeText);
  expect(afterText, "the asked sentence is in the section").toContain(SENTENCE);
  const commits = (await seeded.sql`select commit_sha from public.prd_tool_commits
    where turn_id = ${turnId}::uuid`) as Array<{ commit_sha: string }>;
  expect(commits, "the commit was made by the tools").toHaveLength(1);
  expect(String(commits[0].commit_sha).toLowerCase()).toBe(head.toLowerCase());
  const authors = (await seeded.sql`select author_kind from public.prd_section_versions
    where project_id = ${seeded.projectId}::uuid and commit_sha = ${head.toLowerCase()}`) as Array<{
    author_kind: string;
  }>;
  expect(authors.length, "the tool commit wrote the section").toBeGreaterThan(0);
  expect(
    authors.every((row) => row.author_kind === "ai"),
    "the section changed only through the tools",
  ).toBe(true);
}

export async function proveModelCharges(): Promise<void> {
  const seeded = await seed();
  try {
    const service = configuredService();
    const opened = await open(seeded, seeded.dev);
    expect(opened.status, JSON.stringify(opened.json)).toBe(200);
    await credit(seeded, "1.000000");
    const ready = await readSnapshot(seeded, seeded.dev);
    expect(ready.funds.replyFunded, "the credit covers a reply").toBe(true);
    expect(ready.funds.pendingMicros).toBe(0);
    expect(ready.funds.settledMicros).toBe(0);

    const mainRequest = crypto.randomUUID();
    const mainText = await streamedReply(
      seeded,
      { kind: "main" },
      MAIN_TEXT,
      ready.revision,
      mainRequest,
    );
    expect(mainText.length, "the streamed reply has text").toBeGreaterThan(0);
    const mainTurn = await turnRow(seeded, mainRequest);
    expect(mainTurn.state, "the streamed reply is answered").toBe("answered");
    const afterMain = await readSnapshot(seeded, seeded.dev);
    expect(afterMain.funds.pendingMicros, "the funds show no pending hold").toBe(0);
    expect(texts(afterMain, "main", "user"), "the request is one user message").toEqual([MAIN_TEXT]);
    expect(texts(afterMain, "main", "assistant"), "the assistant message is in the snapshot once").toEqual([
      mainText,
    ]);
    const mainCharge = await expectTurnCharge(
      seeded,
      mainTurn.id,
      ready.funds.settledMicros,
      afterMain.funds.settledMicros,
    );

    const loaded = loadGithubTest();
    if (!loaded.ok) throw new Error(loaded.reason);
    const repo = await repoName(seeded);
    const path = await bookingPath(seeded);
    const beforeSha = await mainSha(loaded.client, repo);
    const beforeText = statementText(await sectionFile(loaded.client, repo, beforeSha, path));
    const sectionRequest = crypto.randomUUID();
    const sectionText = await streamedReply(
      seeded,
      { kind: "topic", topicId: "booking" },
      SECTION_TEXT,
      afterMain.revision,
      sectionRequest,
    );
    const sectionTurn = await turnRow(seeded, sectionRequest);
    expect(sectionTurn.state, "the section reply is answered").toBe("answered");
    const afterSection = await readSnapshot(seeded, seeded.dev);
    expect(afterSection.funds.pendingMicros, "the funds show no pending hold").toBe(0);
    const sectionCharge = await expectTurnCharge(
      seeded,
      sectionTurn.id,
      afterMain.funds.settledMicros,
      afterSection.funds.settledMicros,
    );
    if (sectionCharge.requests < 2) throw new Error("this model answered without tools");
    await expectToolCommit(seeded, sectionTurn.id, beforeSha, beforeText);
    expect(topicById(afterSection, "booking").statements.join("\n"), "the workspace shows the change").toContain(
      SENTENCE,
    );
    expect(texts(afterSection, TOPIC_KEY, "user"), "the section request is one user message").toEqual([
      SECTION_TEXT,
    ]);
    expect(texts(afterSection, TOPIC_KEY, "assistant")).toEqual(sectionText === "" ? [] : [sectionText]);

    const picture = fingerprint(await eventsOf(seeded, mainTurn.id), await entriesOf(seeded, mainTurn.id));
    const requests = await eventCount(seeded);
    const settled = afterSection.funds.settledMicros;
    await sendStream(seeded, { kind: "main" }, MAIN_TEXT, ready.revision, mainRequest);
    expect((await turnRow(seeded, mainRequest)).id, "the same request is the same turn").toBe(mainTurn.id);
    expect(await eventCount(seeded), "the same request makes no second model call").toBe(requests);
    expect(fingerprint(await eventsOf(seeded, mainTurn.id), await entriesOf(seeded, mainTurn.id))).toBe(
      picture,
    );
    const replayed = await readSnapshot(seeded, seeded.dev);
    expect(replayed.funds.settledMicros, "the same request adds no charge").toBe(settled);
    expect(replayed.funds.pendingMicros).toBe(0);
    expect(texts(replayed, "main", "assistant"), "the assistant message stays one").toEqual([mainText]);

    await expectSettings(seeded, mainTurn.id, service.baseURL);
    await expectSettings(seeded, sectionTurn.id, service.baseURL);
    expect(chargedParts(replayed), "no assistant message carries a fee, a receipt, or a cost").toEqual([]);
    const spent = await providerSpend(seeded);
    expect(mainCharge.providerMicros + sectionCharge.providerMicros, "the run's provider cost is the two turns").toBe(
      spent,
    );
    expect(spent, "the live run stays within $0.25").toBeLessThanOrEqual(SPEND_CAP_MICROS);

    throw new AtPending(
      "AT-036.05",
      "sut-missing",
      "Scoring and the planning package make no model calls yet (the completion check and Close PRD units), and missing usage, duplicate usage records, retries, interrupted streams, the reservation stop and a provider rejection are proven offline in the relay selftest, because a real provider cannot be made to fail on demand.",
    );
  } finally {
    try {
      const spent = await providerSpend(seeded);
      console.log(`AT-036.05 provider cost ${spent} micros`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unread";
      console.log(`AT-036.05 provider cost unread: ${message}`);
    }
    await seeded.sql.close();
  }
}
