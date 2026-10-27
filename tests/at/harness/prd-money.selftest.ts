import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STACK_ENV, sqlClient, stackFromEnv, type Stack } from "./live-stack.ts";
import { openWithoutGithub } from "./prd-git.ts";

type Sql = ReturnType<typeof sqlClient>;

const live = Boolean(process.env[STACK_ENV.dbUrl]) && "Bun" in globalThis;
const SERVICE_MODEL = "claude-haiku-5-5";

type World = { dev: string; ngo: string; stranger: string; org: string; project: string };
type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };
type Rates = Record<string, bigint>;

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

function micros(text: unknown): bigint {
  const match = /^(-?)(\d+)(?:\.(\d{1,6}))?$/.exec(String(text));
  if (!match) throw new Error(`expected a decimal amount, got ${JSON.stringify(text)}`);
  const value = BigInt(match[2]) * 1_000_000n + BigInt((match[3] ?? "").padEnd(6, "0"));
  return match[1] === "-" ? -value : value;
}

function dollars(amount: bigint): string {
  const sign = amount < 0n ? "-" : "";
  const size = amount < 0n ? -amount : amount;
  return `${sign}${size / 1_000_000n}.${String(size % 1_000_000n).padStart(6, "0")}`;
}

function roundedDivide(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n);
}

async function refusal(run: Promise<unknown>): Promise<string> {
  try {
    await run;
  } catch (error) {
    return String((error as { detail?: unknown }).detail);
  }
  throw new Error("expected a refusal");
}

async function one(query: Promise<unknown>): Promise<Record<string, unknown>> {
  const rows = (await query) as Array<{ r: unknown }>;
  return record(rows[0].r);
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
  const brief = {
    schemaVersion: 1,
    need: { text: "Schedule volunteers", source: { kind: "intake" } },
    usersToday: null,
    successMeasure: null,
    topicOrder: ["booking"],
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
    },
    dependsOn: {},
  };
  await sql`insert into public.brief_revisions (project_id, revision, document, created_by)
    values (${project}::uuid, 1, ${JSON.stringify(brief)}::text::jsonb, ${ngo}::uuid)`;
  await sql`insert into public.discovery_confirmations
    (project_id, revision, actor_id, actor_name, confirmed_at, accepted_gaps)
    values (${project}::uuid, 1, ${ngo}::uuid, 'Maya Levi', clock_timestamp(), '[]'::jsonb)`;
  await openWithoutGithub(sql, dev, org, project);
  return { dev, ngo, stranger, org, project };
}

describe.skipIf(!live)("PRD money on the local stack", () => {
  let stack: Stack;
  let sql: Sql;
  let hold: bigint;
  let feeBps: bigint;

  beforeAll(async () => {
    stack = stackFromEnv();
    sql = sqlClient(stack);
    const config = (await sql`select key, value::text as value, placeholder
      from public.prd_money_config order by key`) as Array<{
      key: string;
      value: string;
      placeholder: boolean;
    }>;
    expect(config.map((row) => row.key)).toEqual(["fee-basis-points", "turn-reservation-usd"]);
    expect(config.every((row) => row.placeholder === true)).toBe(true);
    feeBps = micros(config[0].value);
    hold = micros(config[1].value);
    expect(hold > 0n).toBe(true);
  });

  afterAll(async () => {
    await sql?.close();
  });

  function credit(project: string, amount: bigint) {
    return sql`select public.prd_fund_credit(${project}::uuid, ${dollars(amount)}::numeric,
      'selftest funds') as r`;
  }

  async function revision(project: string): Promise<number> {
    const rows = (await sql`select current_revision from public.prd_records
      where project_id = ${project}::uuid`) as Array<{ current_revision: unknown }>;
    return whole(rows[0].current_revision);
  }

  async function sequence(project: string): Promise<number> {
    const rows = (await sql`select snapshot_sequence from public.prd_records
      where project_id = ${project}::uuid`) as Array<{ snapshot_sequence: unknown }>;
    return whole(rows[0].snapshot_sequence);
  }

  async function reserveIn(w: World, actor: string, key: string, text = "Hello"): Promise<string> {
    const request = crypto.randomUUID();
    const body = await one(sql`select public.prd_turn_reserve(
      ${actor}::uuid, ${w.project}::uuid, ${key}, ${request}, ${await revision(w.project)},
      ${JSON.stringify({ kind: "text", text })}::text::jsonb, ${`hash-${request}`}
    ) as r`);
    return String(body.turnId);
  }

  function reserveRefusal(w: World, actor: string, key: string): Promise<string> {
    const request = crypto.randomUUID();
    return revision(w.project).then((rev) =>
      refusal(sql`select public.prd_turn_reserve(
        ${actor}::uuid, ${w.project}::uuid, ${key}, ${request}, ${rev},
        ${JSON.stringify({ kind: "text", text: "Refused" })}::text::jsonb, ${`hash-${request}`}
      ) as r`),
    );
  }

  function ingest(turn: string, event: Record<string, unknown>) {
    return one(sql`select public.prd_turn_ingest(${turn}::uuid,
      ${JSON.stringify(event)}::text::jsonb) as r`);
  }

  function modelEnd(session: string, eventId: string, usage: Usage | null) {
    return { kind: "model-end", sessionId: session, eventId, usage };
  }

  async function funds(w: World, actor = w.dev): Promise<Record<string, unknown>> {
    const facts = await one(sql`select public.prd_facts(${actor}::uuid, ${w.project}::uuid) as r`);
    return record(facts.funds);
  }

  async function mainSend(w: World, actor = w.dev): Promise<Record<string, unknown>> {
    const facts = await one(sql`select public.prd_facts(${actor}::uuid, ${w.project}::uuid) as r`);
    const chats = jsonValue(facts.chats) as Array<Record<string, unknown>>;
    const main = chats.find((chat) => chat.key === "main");
    if (!main) throw new Error("the facts have no main chat");
    return record(main.send);
  }

  function ledger(w: World, turn: string | null) {
    return one(sql`select public.prd_ledger(${w.project}::uuid, ${turn}::uuid) as r`);
  }

  async function entries(turn: string, component: string): Promise<bigint[]> {
    const rows = (await sql`select amount::text as amount from public.prd_ledger_entries
      where turn_id = ${turn}::uuid and component = ${component}
      order by created_at, id`) as Array<{ amount: string }>;
    return rows.map((row) => micros(row.amount));
  }

  async function entryCount(project: string): Promise<number> {
    const rows = (await sql`select count(*)::int as n from public.prd_ledger_entries
      where project_id = ${project}::uuid`) as Array<{ n: unknown }>;
    return whole(rows[0].n);
  }

  async function rates(turn: string): Promise<Rates> {
    const rows = (await sql`select v.rate_card, v.category, v.usd::text as usd
      from public.prd_reservations r
      join public.prd_rate_versions v on v.model = r.model and v.version = r.rate_version
      where r.turn_id = ${turn}::uuid`) as Array<{
      rate_card: string;
      category: string;
      usd: string;
    }>;
    const out: Rates = {};
    for (const row of rows) out[`${row.rate_card}:${row.category}`] = micros(row.usd);
    return out;
  }

  function cardOf(usage: Usage): "up-to-100k" | "over-100k" {
    return usage.input + usage.cacheRead + usage.cacheWrite <= 100_000 ? "up-to-100k" : "over-100k";
  }

  function tokenCost(table: Rates, usage: Usage): bigint {
    const card = cardOf(usage);
    const scaled =
      BigInt(usage.input) * table[`${card}:input`] +
      BigInt(usage.output) * table[`${card}:output`] +
      BigInt(usage.cacheRead) * table[`${card}:cache-read`] +
      BigInt(usage.cacheWrite) * table[`${card}:cache-write`];
    return roundedDivide(scaled, 1_000_000n);
  }

  function feeOf(cost: bigint): bigint {
    return roundedDivide(cost * feeBps, 10_000n * 1_000_000n);
  }

  function runtimeCost(table: Rates, secondsMicros: bigint): bigint {
    return roundedDivide(secondsMicros * table["runtime:active-hour"], 3600n * 1_000_000n);
  }

  it("refuses an unfunded reply, credits funds, holds a reply, and releases it when the turn ends", async () => {
    const w = await world(stack, sql);
    const empty = await funds(w);
    expect(empty).toMatchObject({
      allocationMicros: 0,
      settledMicros: 0,
      pendingMicros: 0,
      replyHoldMicros: Number(hold),
      availableMicros: 0,
      band: "red",
      replyFunded: false,
    });
    expect(await mainSend(w)).toEqual({ allowed: false, block: "funds", reason: "funds" });
    expect(await reserveRefusal(w, w.dev, "main")).toBe("funds");
    expect(await refusal(credit(w.project, 0n))).toBe("invalid-request");
    expect(
      await refusal(sql`select public.prd_fund_credit(${w.project}::uuid, 0.0000001, 'too fine')`),
    ).toBe("invalid-request");
    expect(await refusal(sql`select public.prd_fund_credit(${w.project}::uuid, 1, '  ')`)).toBe(
      "invalid-request",
    );

    const before = await sequence(w.project);
    const credited = await one(credit(w.project, 1_000_000n));
    expect(credited).toMatchObject({ allocationMicros: 1_000_000, availableMicros: 1_000_000 });
    expect(await sequence(w.project)).toBe(before + 1);
    expect(await funds(w)).toEqual({
      allocationMicros: 1_000_000,
      settledMicros: 0,
      pendingMicros: 0,
      replyHoldMicros: Number(hold),
      availableMicros: 1_000_000,
      overrunMicros: 0,
      band: "green",
      replyFunded: 1_000_000n >= hold,
    });
    expect(await mainSend(w)).toEqual({ allowed: true, reason: null });

    const turn = await reserveIn(w, w.dev, "main");
    const reservation =
      (await sql`select amount::text as amount, model, fee_basis_points::text as fee
      from public.prd_reservations where turn_id = ${turn}::uuid`) as Array<{
        amount: string;
        model: string;
        fee: string;
      }>;
    expect(micros(reservation[0].amount)).toBe(hold);
    expect(reservation[0].model).toBe(SERVICE_MODEL);
    expect(micros(reservation[0].fee)).toBe(feeBps);
    expect(await funds(w)).toMatchObject({
      pendingMicros: Number(hold),
      availableMicros: Number(1_000_000n - hold),
    });
    expect(await ledger(w, turn)).toMatchObject({ heldMicros: Number(hold), deductedMicros: 0 });

    const ended = await ingest(turn, { kind: "end", outcome: "answered" });
    expect(ended).toMatchObject({
      turnId: turn,
      state: "answered",
      released: true,
      releasedMicros: Number(hold),
      pendingEvents: 0,
    });
    expect(await ingest(turn, { kind: "end", outcome: "answered" })).toEqual(ended);
    expect(await refusal(ingest(turn, { kind: "end", outcome: "rejected" }))).toBe("stale");
    expect(await entries(turn, "release")).toEqual([hold]);
    expect(await funds(w)).toMatchObject({ pendingMicros: 0, availableMicros: 1_000_000 });
  });

  it("settles several model requests in one turn once each, with the fee apart and six decimals kept", async () => {
    const w = await world(stack, sql);
    await credit(w.project, 10_000_000n);
    const turn = await reserveIn(w, w.dev, "main");
    const table = await rates(turn);
    const first: Usage = { input: 12_345, output: 678, cacheRead: 0, cacheWrite: 0 };
    const second: Usage = { input: 1_001, output: 203, cacheRead: 3_007, cacheWrite: 409 };
    const firstCost = tokenCost(table, first);
    const secondCost = tokenCost(table, second);
    expect(firstCost % 10_000n, "the cost is not a whole number of cents").not.toBe(0n);

    const settled = await ingest(turn, modelEnd("sesn_many", "evt_1", first));
    expect(settled).toEqual({
      turnId: turn,
      kind: "model-end",
      eventId: "evt_1",
      state: "settled",
      rateCard: "up-to-100k",
      providerMicros: Number(firstCost),
      feeMicros: Number(feeOf(firstCost)),
      overrunMicros: 0,
    });
    const count = await entryCount(w.project);
    const quiet = await sequence(w.project);
    expect(await ingest(turn, modelEnd("sesn_many", "evt_1", first))).toEqual(settled);
    expect(
      await ingest(turn, modelEnd("sesn_many", "evt_1", { ...first, output: 99_999 })),
    ).toEqual(settled);
    expect(await entryCount(w.project)).toBe(count);
    expect(await sequence(w.project)).toBe(quiet);

    await ingest(turn, modelEnd("sesn_many", "evt_2", second));
    expect(await entries(turn, "provider")).toEqual([firstCost, secondCost]);
    expect(await entries(turn, "fee")).toEqual([feeOf(firstCost), feeOf(secondCost)]);
    const readback = await ledger(w, turn);
    const providerSum = firstCost + secondCost;
    const feeSum = feeOf(firstCost) + feeOf(secondCost);
    expect(readback).toMatchObject({
      providerMicros: Number(providerSum),
      tokenMicros: Number(providerSum),
      runtimeMicros: 0,
      feeMicros: Number(feeSum),
      deductedMicros: Number(providerSum + feeSum),
      tokens: {
        input: first.input + second.input,
        output: first.output + second.output,
        cacheRead: first.cacheRead + second.cacheRead,
        cacheWrite: first.cacheWrite + second.cacheWrite,
      },
      pending: [],
    });
    expect(await funds(w)).toMatchObject({ settledMicros: Number(providerSum + feeSum) });
    const project = await ledger(w, null);
    expect(project).toMatchObject({ deductedMicros: Number(providerSum + feeSum) });

    const other = await world(stack, sql);
    await credit(other.project, 1_000_000n);
    const otherTurn = await reserveIn(other, other.dev, "main");
    expect(await refusal(ingest(otherTurn, modelEnd("sesn_many", "evt_9", first)))).toBe(
      "invalid-request",
    );
    expect(await refusal(ingest(turn, modelEnd("sesn_other", "evt_3", first)))).toBe(
      "invalid-request",
    );
    expect(await refusal(ingest(turn, { kind: "model-end", sessionId: "sesn_many" }))).toBe(
      "invalid-request",
    );
    expect(
      await refusal(ingest(turn, modelEnd("sesn_many", "evt_4", { ...first, input: -1 }))),
    ).toBe("invalid-request");
    expect(await refusal(ingest(turn, { kind: "nonsense" }))).toBe("invalid-request");
    expect(await refusal(ledger(w, otherTurn))).toBe("invalid-request");
  });

  it("switches to the long-prompt rate card above 100,000 prompt tokens", async () => {
    const w = await world(stack, sql);
    await credit(w.project, 10_000_000n);
    const turn = await reserveIn(w, w.dev, "main");
    const table = await rates(turn);
    const atLimit: Usage = { input: 90_000, output: 10, cacheRead: 9_000, cacheWrite: 1_000 };
    const overLimit: Usage = { input: 90_001, output: 10, cacheRead: 9_000, cacheWrite: 1_000 };
    const short = await ingest(turn, modelEnd("sesn_card", "evt_at", atLimit));
    const long = await ingest(turn, modelEnd("sesn_card", "evt_over", overLimit));
    expect(short).toMatchObject({
      rateCard: "up-to-100k",
      providerMicros: Number(tokenCost(table, atLimit)),
    });
    expect(long).toMatchObject({
      rateCard: "over-100k",
      providerMicros: Number(tokenCost(table, overLimit)),
    });
    expect(table["over-100k:input"] > table["up-to-100k:input"]).toBe(true);
    const cards = (await sql`select rate_card from public.prd_ledger_entries
      where turn_id = ${turn}::uuid and component = 'provider' order by created_at, id`) as Array<{
      rate_card: string;
    }>;
    expect(cards.map((row) => row.rate_card)).toEqual(["up-to-100k", "over-100k"]);
  });

  it("keeps missing usage pending with the hold, then settles it once when it arrives", async () => {
    const w = await world(stack, sql);
    await credit(w.project, 1_000_000n);
    const turn = await reserveIn(w, w.dev, "main");
    const table = await rates(turn);
    const before = await entryCount(w.project);
    const pending = await ingest(turn, modelEnd("sesn_gap", "evt_gap", null));
    expect(pending).toMatchObject({
      state: "pending",
      providerMicros: 0,
      feeMicros: 0,
      rateCard: null,
    });
    expect(await entryCount(w.project)).toBe(before);
    expect(
      await ingest(turn, { kind: "model-end", sessionId: "sesn_gap", eventId: "evt_gap" }),
    ).toEqual(pending);
    expect((await ledger(w, turn)).pending).toEqual([{ turnId: turn, eventId: "evt_gap" }]);

    const ended = await ingest(turn, { kind: "end", outcome: "answered" });
    expect(ended).toMatchObject({ state: "answered", released: false, pendingEvents: 1 });
    expect(await funds(w)).toMatchObject({ pendingMicros: Number(hold) });
    const band = (await funds(w)).band;

    const usage: Usage = { input: 2_000, output: 300, cacheRead: 0, cacheWrite: 0 };
    const cost = tokenCost(table, usage);
    const filled = await ingest(turn, modelEnd("sesn_gap", "evt_gap", usage));
    expect(filled).toMatchObject({ state: "settled", providerMicros: Number(cost) });
    expect(await ingest(turn, modelEnd("sesn_gap", "evt_gap", usage))).toEqual(filled);
    expect(await ingest(turn, modelEnd("sesn_gap", "evt_gap", null))).toEqual(filled);
    expect(await entries(turn, "provider")).toEqual([cost]);
    expect(await entries(turn, "fee")).toEqual([feeOf(cost)]);
    const spent = cost + feeOf(cost);
    const released = spent > hold ? 0n : hold - spent;
    expect(await entries(turn, "release")).toEqual([released]);
    expect((await ledger(w, turn)).pending).toEqual([]);
    expect(await funds(w)).toMatchObject({
      pendingMicros: 0,
      settledMicros: Number(spent),
      availableMicros: Number(1_000_000n - spent),
      band,
    });
  });

  it("charges runtime once per turn from the session baseline, and moves the baseline", async () => {
    const w = await world(stack, sql);
    await credit(w.project, 10_000_000n);
    const first = await reserveIn(w, w.dev, "main");
    const table = await rates(first);
    const charged = await ingest(first, {
      kind: "runtime",
      sessionId: "sesn_run",
      activeSeconds: 90,
    });
    expect(charged).toMatchObject({
      turnId: first,
      kind: "runtime",
      runtimeMicros: Number(runtimeCost(table, 90_000_000n)),
    });
    expect(
      await ingest(first, { kind: "runtime", sessionId: "sesn_run", activeSeconds: 120 }),
    ).toEqual(charged);
    expect(await entries(first, "runtime")).toEqual([runtimeCost(table, 90_000_000n)]);
    const baseline = (await sql`select runtime_baseline_seconds::text as seconds
      from public.prd_sessions where provider_session_id = 'sesn_run'`) as Array<{
      seconds: string;
    }>;
    expect(micros(baseline[0].seconds)).toBe(90_000_000n);
    await ingest(first, { kind: "end", outcome: "answered" });

    const second = await reserveIn(w, w.dev, "main");
    const again = await ingest(second, {
      kind: "runtime",
      sessionId: "sesn_run",
      activeSeconds: 150.5,
    });
    expect(again).toMatchObject({ runtimeMicros: Number(runtimeCost(table, 60_500_000n)) });
    await ingest(second, { kind: "end", outcome: "answered" });

    const third = await reserveIn(w, w.dev, "main");
    expect(
      await refusal(ingest(third, { kind: "runtime", sessionId: "sesn_run", activeSeconds: 100 })),
    ).toBe("invalid-request");
    expect(await ledger(w, null)).toMatchObject({
      runtimeMicros: Number(runtimeCost(table, 90_000_000n) + runtimeCost(table, 60_500_000n)),
      feeMicros: 0,
    });
  });

  it("releases the whole hold of a turn rejected before any model request, and keeps an uncertain hold", async () => {
    const w = await world(stack, sql);
    await credit(w.project, 1_000_000n);
    const rejected = await reserveIn(w, w.dev, "main");
    expect(await ingest(rejected, { kind: "end", outcome: "rejected" })).toMatchObject({
      state: "rejected",
      released: true,
      releasedMicros: Number(hold),
    });
    expect(await funds(w)).toMatchObject({ pendingMicros: 0, settledMicros: 0 });

    const uncertain = await reserveIn(w, w.dev, "topic:booking");
    const unsure = await ingest(uncertain, { kind: "end", outcome: "uncertain" });
    expect(unsure).toMatchObject({ state: "uncertain", released: false, releasedMicros: 0 });
    expect(await ingest(uncertain, { kind: "end", outcome: "uncertain" })).toEqual(unsure);
    expect(await funds(w)).toMatchObject({ pendingMicros: Number(hold) });
    expect(await reserveRefusal(w, w.dev, "topic:booking")).toBe("busy");
    expect(await entries(uncertain, "release")).toEqual([]);
    expect(await ingest(uncertain, { kind: "end", outcome: "answered" })).toMatchObject({
      state: "answered",
      released: true,
    });
    expect(await funds(w)).toMatchObject({ pendingMicros: 0 });
  });

  it("shows an overrun as an adjustment, lets funds go below zero, and refuses the next admission", async () => {
    const w = await world(stack, sql);
    await credit(w.project, hold);
    const turn = await reserveIn(w, w.dev, "main");
    const table = await rates(turn);
    const output = Number((3n * hold * 1_000_000n) / table["up-to-100k:output"] + 1n);
    const usage: Usage = { input: 10, output, cacheRead: 0, cacheWrite: 0 };
    const cost = tokenCost(table, usage);
    const spent = cost + feeOf(cost);
    expect(spent > hold).toBe(true);
    const settled = await ingest(turn, modelEnd("sesn_over", "evt_big", usage));
    expect(settled).toMatchObject({ overrunMicros: Number(spent - hold) });
    expect(await entries(turn, "adjustment")).toEqual([spent - hold]);
    expect(await ledger(w, turn)).toMatchObject({
      overrunMicros: Number(spent - hold),
      deductedMicros: Number(spent),
      heldMicros: 0,
    });
    await ingest(turn, { kind: "end", outcome: "answered" });
    expect(await entries(turn, "release")).toEqual([0n]);
    const after = await funds(w);
    expect(after).toMatchObject({
      allocationMicros: Number(hold),
      settledMicros: Number(spent),
      availableMicros: Number(hold - spent),
      overrunMicros: Number(spent - hold),
      band: "red",
      replyFunded: false,
    });
    expect(whole(after.availableMicros) < 0).toBe(true);
    expect(await reserveRefusal(w, w.dev, "main")).toBe("funds");
    await credit(w.project, spent);
    expect(await reserveIn(w, w.dev, "main")).toEqual(expect.any(String));
  });

  it("caps the session at its settled list spend plus the reservation, rounded up to a cent", async () => {
    const w = await world(stack, sql);
    await credit(w.project, 10_000_000n);
    const first = await reserveIn(w, w.dev, "main");
    const table = await rates(first);
    const opening = (await sql`select public.prd_session_budget(${first}::uuid) as r`) as Array<{
      r: unknown;
    }>;
    expect(whole(opening[0].r)).toBe(Number((hold + 9_999n) / 10_000n));
    const usage: Usage = { input: 1_234, output: 567, cacheRead: 0, cacheWrite: 0 };
    const cost = tokenCost(table, usage);
    await ingest(first, modelEnd("sesn_cap", "evt_cap", usage));
    const runtime = runtimeCost(table, 45_000_000n);
    await ingest(first, { kind: "runtime", sessionId: "sesn_cap", activeSeconds: 45 });
    await ingest(first, { kind: "end", outcome: "answered" });
    const second = await reserveIn(w, w.dev, "main");
    const cents = (cost + runtime + hold + 9_999n) / 10_000n;
    const rows = (await sql`select public.prd_session_budget(${second}::uuid) as r`) as Array<{
      r: unknown;
    }>;
    expect(whole(rows[0].r)).toBe(Number(cents));
    const topic = await reserveIn(w, w.dev, "topic:booking");
    const other = (await sql`select public.prd_session_budget(${topic}::uuid) as r`) as Array<{
      r: unknown;
    }>;
    expect(whole(other[0].r)).toBe(Number((hold + 9_999n) / 10_000n));
  });

  it("colors the band from settled spend only, at 79.999, 80, 95 and 95.001 percent", async () => {
    const unit = 100_000n;
    const allocation = ((21n * hold + unit - 1n) / unit) * unit;
    const cases = [
      { thousandths: 79_999n, band: "green" },
      { thousandths: 80_000n, band: "yellow" },
      { thousandths: 95_000n, band: "yellow" },
      { thousandths: 95_001n, band: "red" },
    ];
    for (const item of cases) {
      const w = await world(stack, sql);
      await credit(w.project, allocation);
      const turn = await reserveIn(w, w.dev, "main");
      const table = await rates(turn);
      const target = (allocation * item.thousandths) / 100_000n;
      const scaled = target * 3600n * 1_000_000n;
      expect(scaled % table["runtime:active-hour"], "the runtime rate divides the target").toBe(0n);
      const secondsMicros = scaled / table["runtime:active-hour"];
      expect(runtimeCost(table, secondsMicros)).toBe(target);
      await ingest(turn, {
        kind: "runtime",
        sessionId: `sesn_band_${item.thousandths}`,
        activeSeconds: Number(dollars(secondsMicros)),
      });
      await ingest(turn, { kind: "end", outcome: "answered" });
      const settled = await funds(w);
      expect(settled, `${item.thousandths}`).toMatchObject({
        allocationMicros: Number(allocation),
        settledMicros: Number(target),
        pendingMicros: 0,
        band: item.band,
      });
      expect(settled.replyFunded, "red alone still allows a funded reply").toBe(true);

      const held = await reserveIn(w, w.dev, "main");
      await ingest(held, modelEnd(`sesn_band_${item.thousandths}`, "evt_wait", null));
      const waiting = await funds(w);
      expect(waiting.pendingMicros).toBe(Number(hold));
      expect(waiting.band, "pending spend never changes the band").toBe(item.band);
    }
  });

  it("keeps role, closed and busy refusals ahead of funds, and a top-up clears none of them", async () => {
    const w = await world(stack, sql);
    expect(await reserveRefusal(w, w.ngo, "main")).toBe("forbidden");
    expect(await reserveRefusal(w, w.stranger, "main")).toBe("forbidden");
    expect(await mainSend(w, w.ngo)).toMatchObject({ allowed: false, block: "role" });
    await credit(w.project, 1_000_000n);
    expect(await reserveRefusal(w, w.ngo, "main")).toBe("forbidden");
    expect(await mainSend(w, w.ngo)).toMatchObject({ allowed: false, block: "role" });

    await reserveIn(w, w.dev, "main");
    expect(await reserveRefusal(w, w.dev, "main")).toBe("busy");
    await credit(w.project, 1_000_000n);
    expect(await reserveRefusal(w, w.dev, "main")).toBe("busy");
    expect(await mainSend(w)).toMatchObject({ allowed: false, block: "busy" });

    const closed = await world(stack, sql);
    // Test-only write. Close is not built yet; this freezes the record the way close will.
    await sql`update public.prd_records set closed_revision = current_revision
      where project_id = ${closed.project}::uuid`;
    expect(await reserveRefusal(closed, closed.dev, "main")).toBe("closed");
    expect(await mainSend(closed)).toMatchObject({ allowed: false, block: "closed" });
    await credit(closed.project, 1_000_000n);
    expect(await reserveRefusal(closed, closed.dev, "main")).toBe("closed");
    expect(await mainSend(closed)).toMatchObject({ allowed: false, block: "closed" });
  });

  it("never refuses repeated funded turns by count", async () => {
    const w = await world(stack, sql);
    await credit(w.project, 10_000_000n);
    for (let index = 0; index < 15; index += 1) {
      const turn = await reserveIn(w, w.dev, "main", `Reply ${index}`);
      await ingest(
        turn,
        modelEnd("sesn_count", `evt_${index}`, {
          input: 500,
          output: 50,
          cacheRead: 0,
          cacheWrite: 0,
        }),
      );
      await ingest(turn, { kind: "end", outcome: "answered" });
    }
    const turns = (await sql`select count(*)::int as n from public.prd_turns
      where project_id = ${w.project}::uuid and state = 'answered'`) as Array<{ n: unknown }>;
    expect(whole(turns[0].n)).toBe(15);
    expect(await mainSend(w)).toEqual({ allowed: true, reason: null });
  });

  it("records the provider settings of a turn once, for the model it was priced for", async () => {
    const w = await world(stack, sql);
    await credit(w.project, 1_000_000n);
    const turn = await reserveIn(w, w.dev, "main");
    const settings = { effort: "medium", maxTokens: 4096 };
    const recorded = await one(sql`select public.prd_turn_settings_record(${turn}::uuid,
      ${SERVICE_MODEL}, ${JSON.stringify(settings)}::text::jsonb) as r`);
    expect(recorded).toEqual({ turnId: turn, model: SERVICE_MODEL, settings });
    expect(
      await one(sql`select public.prd_turn_settings_record(${turn}::uuid,
        ${SERVICE_MODEL}, ${JSON.stringify(settings)}::text::jsonb) as r`),
    ).toEqual(recorded);
    expect(
      await refusal(sql`select public.prd_turn_settings_record(${turn}::uuid,
        ${SERVICE_MODEL}, ${JSON.stringify({ effort: "high" })}::text::jsonb) as r`),
    ).toBe("invalid-request");
    const other = await reserveIn(w, w.dev, "topic:booking");
    expect(
      await refusal(sql`select public.prd_turn_settings_record(${other}::uuid,
        'claude-opus-5', ${JSON.stringify(settings)}::text::jsonb) as r`),
    ).toBe("invalid-request");
  });

  async function scalar(query: Promise<unknown>): Promise<unknown> {
    const rows = (await query) as Array<{ r: unknown }>;
    return rows[0].r;
  }

  function sessionRead(w: World, key: string) {
    return one(sql`select public.prd_session_read(${w.project}::uuid, ${key}) as r`);
  }

  it("keeps one session per chat, and moves its credential and cursor only from what was read", async () => {
    const w = await world(stack, sql);
    await credit(w.project, 1_000_000n);
    const turn = await reserveIn(w, w.dev, "main", "Who books shifts?");

    const fresh = await sessionRead(w, "main");
    expect(fresh.session).toBeNull();
    expect(record(fresh.turn)).toMatchObject({
      id: turn,
      kind: "reply",
      state: "admitted",
      dispatched: false,
      parts: [{ type: "text", text: "Who books shifts?" }],
      modelRequests: 0,
    });
    expect(Number(record(fresh.turn).ageSeconds)).toBeGreaterThanOrEqual(0);
    expect(await refusal(sessionRead(w, "topic:nope"))).toBe("invalid-request");

    expect(await scalar(sql`select public.prd_turn_dispatch(${turn}::uuid) as r`)).toBe(true);
    expect(await scalar(sql`select public.prd_turn_dispatch(${turn}::uuid) as r`)).toBe(false);
    expect(record((await sessionRead(w, "main")).turn).dispatched).toBe(true);

    const opened = await one(
      sql`select public.prd_session_open(${turn}::uuid, 'sesn_a', 'vlt_a', 'vcrd_a') as r`,
    );
    expect(opened).toEqual({
      sessionId: "sesn_a",
      vaultId: "vlt_a",
      credentialId: "vcrd_a",
      generation: 1,
      cursor: null,
    });
    expect(
      await one(
        sql`select public.prd_session_open(${turn}::uuid, 'sesn_a', 'vlt_a', 'vcrd_a') as r`,
      ),
    ).toEqual(opened);
    expect(
      await refusal(
        sql`select public.prd_session_open(${turn}::uuid, 'sesn_b', 'vlt_b', 'vcrd_b') as r`,
      ),
    ).toBe("invalid-request");
    expect(
      await refusal(
        sql`select public.prd_session_open(${turn}::uuid, 'sesn_a', '', 'vcrd_a') as r`,
      ),
    ).toBe("invalid-request");

    const usage = { input: 100, output: 10, cacheRead: 0, cacheWrite: 0 };
    expect(await ingest(turn, modelEnd("sesn_a", "sevt_e1", usage))).toMatchObject({
      state: "settled",
    });
    expect(await refusal(ingest(turn, modelEnd("sesn_b", "sevt_e2", usage)))).toBe(
      "invalid-request",
    );
    expect(record((await sessionRead(w, "main")).turn).modelRequests).toBe(1);

    expect(await scalar(sql`select public.prd_session_rotate(${turn}::uuid, 1) as r`)).toBe(2);
    expect(await refusal(sql`select public.prd_session_rotate(${turn}::uuid, 1) as r`)).toBe(
      "stale",
    );

    expect(
      await scalar(sql`select public.prd_session_advance(${turn}::uuid, null, 'sevt_1') as r`),
    ).toBe(true);
    expect(
      await scalar(sql`select public.prd_session_advance(${turn}::uuid, null, 'sevt_2') as r`),
    ).toBe(false);
    expect(
      await scalar(sql`select public.prd_session_advance(${turn}::uuid, 'sevt_1', 'sevt_2') as r`),
    ).toBe(true);
    expect(
      await refusal(sql`select public.prd_session_advance(${turn}::uuid, 'sevt_2', ' ') as r`),
    ).toBe("invalid-request");
    expect((await sessionRead(w, "main")).session).toEqual({
      sessionId: "sesn_a",
      vaultId: "vlt_a",
      credentialId: "vcrd_a",
      generation: 2,
      cursor: "sevt_2",
    });

    await ingest(turn, { kind: "end", outcome: "answered" });
    for (const finished of [
      sql`select public.prd_turn_dispatch(${turn}::uuid) as r`,
      sql`select public.prd_session_rotate(${turn}::uuid, 2) as r`,
      sql`select public.prd_session_advance(${turn}::uuid, 'sevt_2', 'sevt_3') as r`,
    ]) {
      expect(await refusal(finished)).toBe("stale");
    }
    const after = await sessionRead(w, "main");
    expect(after.turn).toBeNull();
    expect(record(after.session).sessionId).toBe("sesn_a");

    const next = await reserveIn(w, w.dev, "main", "And who cancels?");
    expect(record((await sessionRead(w, "main")).turn)).toMatchObject({
      id: next,
      dispatched: false,
    });
    expect((await sessionRead(w, "topic:booking")).session).toBeNull();
  });

  it("lists the chats whose turn is uncertain or past its deadline", async () => {
    const w = await world(stack, sql);
    await credit(w.project, 1_000_000n);
    const main = await reserveIn(w, w.dev, "main");
    const topic = await reserveIn(w, w.dev, "topic:booking");
    const overdue = (seconds: number) =>
      scalar(sql`select public.prd_turns_overdue(${w.project}::uuid, ${seconds}) as r`).then(
        jsonValue,
      );
    expect(await overdue(600)).toEqual([]);
    expect(await overdue(0)).toEqual(["main", "topic:booking"]);
    await ingest(topic, { kind: "end", outcome: "uncertain" });
    expect(await overdue(600)).toEqual(["topic:booking"]);
    await ingest(main, { kind: "end", outcome: "answered" });
    await ingest(topic, { kind: "end", outcome: "answered" });
    expect(await overdue(0)).toEqual([]);
  });

  it("writes no ledger entry for reading, drafting, or opening questions", async () => {
    const w = await world(stack, sql);
    await credit(w.project, 1_000_000n);
    const before = await entryCount(w.project);
    const quiet = await funds(w);
    await sql`select public.prd_snapshot(${w.dev}::uuid, ${w.project}::uuid, null)`;
    await sql`select public.prd_snapshot(${w.ngo}::uuid, ${w.project}::uuid, null)`;
    await sql`select public.prd_save_draft(${w.dev}::uuid, ${w.project}::uuid, 'main', 'typed')`;
    await sql`select public.prd_facts(${w.ngo}::uuid, ${w.project}::uuid)`;
    expect(await entryCount(w.project)).toBe(before);
    expect(await funds(w)).toEqual(quiet);
    const reservations = (await sql`select count(*)::int as n from public.prd_reservations
      where project_id = ${w.project}::uuid`) as Array<{ n: unknown }>;
    expect(whole(reservations[0].n)).toBe(0);
  });
});
