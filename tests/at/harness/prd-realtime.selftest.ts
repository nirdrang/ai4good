import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STACK_ENV, sqlClient, stackFromEnv, type Stack } from "./live-stack.ts";
import { openWithoutGithub } from "./prd-git.ts";

type Sql = ReturnType<typeof sqlClient>;

const live = Boolean(process.env[STACK_ENV.dbUrl]) && "Bun" in globalThis;

function whole(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  throw new Error(`expected a whole number, got ${JSON.stringify(value)}`);
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
    usersToday: {
      text: "Coordinators fill a spreadsheet every week.",
      source: { kind: "intake" },
    },
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
}

async function canListen(sql: Sql, actor: string | null, topic: string): Promise<boolean> {
  return sql.begin(async (tx) => {
    if (actor !== null) {
      await tx`select set_config('request.jwt.claim.sub', ${actor}, true)`;
    }
    const rows = (await tx`select public.prd_can_listen(${topic}) as allowed`) as Array<{
      allowed: boolean;
    }>;
    return rows[0]?.allowed === true;
  });
}

async function sequences(sql: Sql, project: string): Promise<number[]> {
  const rows = (await sql`select event, payload->>'sequence' as sequence
    from realtime.messages
    where topic = ${`prd:${project}`} and extension = 'broadcast'
    order by inserted_at`) as Array<{ event: string; sequence: unknown }>;
  expect(rows.every((row) => row.event === "sequence")).toBe(true);
  return rows.map((row) => whole(row.sequence));
}

describe.skipIf(!live)("PRD realtime on the local stack", () => {
  let stack: Stack;
  let sql: Sql;

  beforeAll(() => {
    stack = stackFromEnv();
    sql = sqlClient(stack);
  });

  afterAll(async () => {
    await sql?.close();
  });

  it("lets the project's developer and NGO hear one ping per sequence bump", async () => {
    const dev = await account(stack, sql, "volunteer", "Priya Shah");
    const ngo = await account(stack, sql, "ngo", "Maya Levi");
    const outsider = await account(stack, sql, "ngo", "Other Org");
    const orgs = (await sql`insert into public.organizations (name)
      values ('Harbor Community Kitchen') returning id`) as Array<{ id: string }>;
    const org = String(orgs[0].id);
    await sql`insert into public.org_memberships (org_id, account_id, role)
      values (${org}::uuid, ${ngo}::uuid, 'admin')`;
    const others = (await sql`insert into public.organizations (name)
      values ('Other Kitchen') returning id`) as Array<{ id: string }>;
    await sql`insert into public.org_memberships (org_id, account_id, role)
      values (${String(others[0].id)}::uuid, ${outsider}::uuid, 'admin')`;
    const projects = (await sql`insert into public.projects (org_id, name, assigned_volunteer_id)
      values (${org}::uuid, 'Volunteer scheduling', ${dev}::uuid) returning id`) as Array<{
      id: string;
    }>;
    const project = String(projects[0].id);
    await sql`insert into public.brief_revisions (project_id, revision, document, created_by)
      values (${project}::uuid, 1, ${JSON.stringify(schedulingBrief())}::text::jsonb, ${ngo}::uuid)`;
    await sql`insert into public.discovery_confirmations
      (project_id, revision, actor_id, actor_name, confirmed_at, accepted_gaps)
      values (${project}::uuid, 1, ${ngo}::uuid, 'Maya Levi', clock_timestamp(), '[]'::jsonb)`;
    await openWithoutGithub(sql, dev, org, project);

    const topic = `prd:${project}`;
    expect(await canListen(sql, dev, topic)).toBe(true);
    expect(await canListen(sql, ngo, topic)).toBe(true);
    expect(await canListen(sql, outsider, topic)).toBe(false);
    expect(await canListen(sql, dev, "prd:")).toBe(false);
    expect(await canListen(sql, dev, "not-a-topic")).toBe(false);
    expect(await canListen(sql, dev, `PRD:${project}`)).toBe(false);
    expect(await canListen(sql, dev, `prd:${crypto.randomUUID()}`)).toBe(false);
    expect(await canListen(sql, null, topic)).toBe(false);

    const before = await sequences(sql, project);
    const bumped = (await sql`update public.prd_records
      set snapshot_sequence = snapshot_sequence + 1
      where project_id = ${project}::uuid
      returning snapshot_sequence`) as Array<{ snapshot_sequence: unknown }>;
    const sequence = whole(bumped[0]?.snapshot_sequence);
    const after = await sequences(sql, project);
    expect(after).toEqual([...before, sequence]);
    expect(after.filter((item) => item === sequence)).toHaveLength(1);

    await sql`update public.prd_records
      set synced_at = clock_timestamp(), snapshot_sequence = snapshot_sequence
      where project_id = ${project}::uuid`;
    expect(await sequences(sql, project)).toEqual(after);
  });
});
