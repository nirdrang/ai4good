/**
 * THE VERIFY-FIRST PROBES for AI4DEV-62 (per-organisation roles and isolation) and its single-seat
 * partner item — run against the reserved slot's own stack, before the design hardens.
 *
 * The plan marks six questions this item may not answer by reasoning. Each one below is measured and
 * its answer is written into `loop/items/AI4DEV-62/artifacts/verify-first-answers.md` with the
 * command that produced it.
 *
 *   (a) does the BEFORE trigger on `public.org_memberships` fire under the OPERATOR connection?
 *   (b) when the grantee's `public.accounts` row is absent, which refuses first — the trigger or the
 *       foreign key — and is that refusal a stated one?
 *   (c) does the service-role REST read of `public.org_memberships` genuinely need the new grant?
 *   (d) what are the unique-violation and trigger-refusal error shapes over the operator SQL path?
 *   (e) what does the functions router answer for a function name that does not exist?
 *   (f) after a reset, what does the catalog say `anon`, `authenticated` and `service_role` hold on
 *       `public.projects`?
 *
 * IT IS NOT AN ACCEPTANCE TEST AND PROVES NO CRITERION. It measures the platform so that the
 * adapter's classifications and the migration's refusals are written against what the stack really
 * does. Run it with `bun loop/items/AI4DEV-62/verify-first.ts`.
 *
 * IT TAKES THE ITEM'S OWN SLOT through the pool's own helpers, so the reservation, the identity
 * proof before anything destructive, and the reset all happen exactly as a verify run does them.
 */

import { evidence, occupy, prepare, release, stackEnv, type Occupancy } from '../../../tests/at/harness/db-pool.ts';

interface BunSqlClient {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  close(): Promise<void>;
}
type BunSqlCtor = new (url: string) => BunSqlClient;

const lines: string[] = [];
function say(text: string): void {
  lines.push(text);
  console.log(text);
}

function refusalOf(error: unknown): { code: string; message: string } {
  const carrier = error as { code?: unknown; errcode?: unknown; message?: unknown } | null;
  const code =
    typeof carrier?.code === 'string' ? carrier.code : typeof carrier?.errcode === 'string' ? carrier.errcode : '';
  const message = typeof carrier?.message === 'string' ? carrier.message : String(error);
  return { code, message };
}

async function main(): Promise<number> {
  let held: Occupancy | null = null;
  try {
    held = occupy('req-001');
    const result = await prepare(held);
    const env = stackEnv(held, result.status);
    say(evidence(held, result));
    say('');

    const api = env.AT_SUPABASE_URL.replace(/\/$/, '');
    const serviceRoleKey = env.AT_SUPABASE_SERVICE_ROLE_KEY;
    const SQL = (globalThis as { Bun?: { SQL?: BunSqlCtor } }).Bun?.SQL;
    if (!SQL) throw new Error('this runtime has no SQL client (expected bun)');
    const sql = new SQL(env.AT_SUPABASE_DB_URL);
    const rows = async <T>(query: Promise<unknown>): Promise<T[]> => (await query) as T[];

    /** An auth user, created through the admin API exactly as `provisionPlatformAdmin` does. */
    const authUser = async (email: string): Promise<string> => {
      const created = await fetch(`${api}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'correct horse battery staple', email_confirm: true }),
      });
      if (created.status >= 400) throw new Error(`creating ${email} answered ${created.status}`);
      const user = (await created.json()) as { id?: string };
      if (!user.id) throw new Error(`creating ${email} answered 200 with no id`);
      return user.id;
    };

    const stamp = Date.now().toString(36);
    const ngoId = await authUser(`probe-ngo-${stamp}@example.test`);
    const volunteerId = await authUser(`probe-volunteer-${stamp}@example.test`);
    await sql`insert into public.accounts (id, account_type) values (${ngoId}::uuid, 'ngo')`;
    await sql`insert into public.accounts (id, account_type) values (${volunteerId}::uuid, 'volunteer')`;
    const [orgOne] = await rows<{ id: string }>(
      sql`insert into public.organizations (name) values ('Probe Organisation One') returning id`,
    );
    const [orgTwo] = await rows<{ id: string }>(
      sql`insert into public.organizations (name) values ('Probe Organisation Two') returning id`,
    );

    /* ---------------------------------------------------------------------------------- (a) */

    say('=== (a) does the BEFORE trigger fire under the OPERATOR (superuser) connection? ===');
    const whoami = await rows<{ current_user: string; superuser: boolean; bypassrls: boolean }>(
      sql`select current_user, rolsuper as superuser, rolbypassrls as bypassrls
            from pg_roles where rolname = current_user`,
    );
    say(`  the operator connection is ${JSON.stringify(whoami[0])}`);
    try {
      await sql`insert into public.org_memberships (org_id, account_id, role)
                values (${orgOne.id}::uuid, ${volunteerId}::uuid, 'member')`;
      say('  ANSWER: NO — the volunteer grant SUCCEEDED under the operator connection. The trigger did not fire.');
    } catch (error) {
      const { code, message } = refusalOf(error);
      say(`  ANSWER: YES — refused. sqlstate ${JSON.stringify(code)} message ${JSON.stringify(message)}`);
    }
    // THE CONTROL: an NGO grantee must SUCCEED, or the answer above would hold over a trigger that
    // refuses everybody.
    const seated = await rows<{ role: string }>(
      sql`insert into public.org_memberships (org_id, account_id, role)
          values (${orgOne.id}::uuid, ${ngoId}::uuid, 'admin') returning role`,
    );
    say(`  control: the NGO grantee was seated, role ${JSON.stringify(seated[0]?.role)}`);
    const afterA = await rows<{ n: string }>(
      sql`select count(*)::text as n from public.org_memberships where org_id = ${orgOne.id}::uuid`,
    );
    say(`  read-back: organisation one holds ${afterA[0].n} membership row(s)`);
    say('');

    /* ---------------------------------------------------------------------------------- (b) */

    say('=== (b) an ABSENT accounts row: which refuses first, the trigger or the foreign key? ===');
    const ghost = crypto.randomUUID();
    try {
      await sql`insert into public.org_memberships (org_id, account_id, role)
                values (${orgTwo.id}::uuid, ${ghost}::uuid, 'admin')`;
      say('  ANSWER: NEITHER — the insert SUCCEEDED for an account that does not exist.');
    } catch (error) {
      const { code, message } = refusalOf(error);
      const byTrigger = /no account has completed signup/i.test(message);
      say(`  ANSWER: refused by ${byTrigger ? 'THE TRIGGER' : 'something else (read the message)'}`);
      say(`  sqlstate ${JSON.stringify(code)} message ${JSON.stringify(message)}`);
    }
    say('');

    /* ---------------------------------------------------------------------------------- (c) */

    say('=== (c) does the service-role REST read of org_memberships need the new grant? ===');
    const restRead = async (label: string): Promise<void> => {
      const response = await fetch(`${api}/rest/v1/org_memberships?select=role`, {
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, Accept: 'application/json' },
      });
      const text = await response.text();
      say(`  ${label}: HTTP ${response.status} body ${JSON.stringify(text.slice(0, 200))}`);
    };
    await restRead('with the migration\'s grant present');
    await sql`revoke select on public.org_memberships from service_role`;
    await sql`notify pgrst, 'reload schema'`;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await restRead('with the grant REVOKED');
    await sql`grant select on public.org_memberships to service_role`;
    await sql`notify pgrst, 'reload schema'`;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await restRead('with the grant restored');
    say('');

    /* ---------------------------------------------------------------------------------- (d) */

    say('=== (d) the error shapes the live adapter must classify, over operator SQL ===');
    // WHICH FIELDS THE DRIVER REALLY CARRIES. The first run of this probe found `code` holding
    // `ERR_POSTGRES_SERVER_ERROR` rather than the SQLSTATE the migration raises, which would make a
    // classification written against `42501` match nothing. Every own property is printed so the
    // adapter is written against what the client sends rather than against what a Postgres client
    // is assumed to send.
    try {
      await sql`insert into public.org_memberships (org_id, account_id, role)
                values (${orgOne.id}::uuid, ${volunteerId}::uuid, 'member')`;
      say('  error shape: NONE — the insert succeeded');
    } catch (error) {
      const own = Object.getOwnPropertyNames(error as object);
      say(`  error own properties: ${JSON.stringify(own)}`);
      const carrier = error as Record<string, unknown>;
      const shown: Record<string, unknown> = {};
      for (const key of own) {
        if (key === 'stack') continue;
        const value = carrier[key];
        shown[key] = typeof value === 'string' ? value.slice(0, 160) : value;
      }
      say(`  error field values: ${JSON.stringify(shown)}`);
      say(`  constructor name: ${JSON.stringify((error as object)?.constructor?.name ?? null)}`);
    }
    try {
      await sql`insert into public.org_memberships (org_id, account_id, role)
                values (${orgOne.id}::uuid, ${volunteerId}::uuid, 'member')`;
      say('  trigger refusal: NONE — the insert succeeded');
    } catch (error) {
      const { code, message } = refusalOf(error);
      say(`  trigger refusal (non-NGO grantee): sqlstate ${JSON.stringify(code)} message ${JSON.stringify(message)}`);
    }
    const [ngoTwoId] = [await authUser(`probe-ngo-two-${stamp}@example.test`)];
    await sql`insert into public.accounts (id, account_type) values (${ngoTwoId}::uuid, 'ngo')`;
    try {
      await sql`insert into public.org_memberships (org_id, account_id, role)
                values (${orgOne.id}::uuid, ${ngoTwoId}::uuid, 'member')`;
      say('  one-seat refusal: NONE — a SECOND membership row was accepted in an already-seated organisation');
    } catch (error) {
      const { code, message } = refusalOf(error);
      say(`  one-seat refusal (second seat, NGO grantee): sqlstate ${JSON.stringify(code)} message ${JSON.stringify(message)}`);
    }
    // THE ORDER, which the loop fixture mirrors: a non-NGO grantee offered into an ALREADY-SEATED
    // organisation must meet the trigger, not the index, because a BEFORE trigger runs first.
    try {
      await sql`insert into public.org_memberships (org_id, account_id, role)
                values (${orgOne.id}::uuid, ${volunteerId}::uuid, 'admin')`;
      say('  ordering: NEITHER refused a non-NGO grantee into an already-seated organisation');
    } catch (error) {
      const { code, message } = refusalOf(error);
      const byTrigger = /NGO accounts only/i.test(message);
      say(`  ordering (non-NGO grantee, already-seated organisation): refused by ${byTrigger ? 'THE TRIGGER' : 'THE INDEX or something else'}`);
      say(`    sqlstate ${JSON.stringify(code)} message ${JSON.stringify(message)}`);
    }
    // The project guard's own refusal shape, on the same path.
    const [projectId] = await rows<{ id: string }>(
      sql`insert into public.projects (org_id, name) values (${orgOne.id}::uuid, 'Probe Project') returning id`,
    );
    await sql`update public.projects set assigned_volunteer_id = ${volunteerId}::uuid where id = ${projectId.id}::uuid`;
    const [volunteerTwoId] = [await authUser(`probe-volunteer-two-${stamp}@example.test`)];
    await sql`insert into public.accounts (id, account_type) values (${volunteerTwoId}::uuid, 'volunteer')`;
    try {
      await sql`update public.projects set assigned_volunteer_id = ${volunteerTwoId}::uuid where id = ${projectId.id}::uuid`;
      say('  seat-occupied refusal: NONE — a second volunteer replaced the first');
    } catch (error) {
      const { code, message } = refusalOf(error);
      say(`  seat-occupied refusal (re-point an occupied project seat): sqlstate ${JSON.stringify(code)} message ${JSON.stringify(message)}`);
    }
    const assignment = await rows<{ assigned_volunteer_id: string | null }>(
      sql`select assigned_volunteer_id from public.projects where id = ${projectId.id}::uuid`,
    );
    say(`  read-back: the project seat holds ${JSON.stringify(assignment[0]?.assigned_volunteer_id)} (the FIRST volunteer is ${JSON.stringify(volunteerId)})`);
    // Releasing the seat to null must stay allowed — offboarding belongs to another requirement.
    try {
      await sql`update public.projects set assigned_volunteer_id = null where id = ${projectId.id}::uuid`;
      say('  release to null: ALLOWED');
    } catch (error) {
      say(`  release to null: REFUSED — ${JSON.stringify(refusalOf(error).message)}`);
    }
    say('');

    /* ---------------------------------------------------------------------------------- (e) */

    say('=== (e) what does the functions router answer for a function that does not exist? ===');
    for (const name of ['invite-member', 'create-organization']) {
      const response = await fetch(`${api}/functions/v1/${name}`, {
        method: 'POST',
        headers: { apikey: env.AT_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.AT_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const text = await response.text();
      say(`  POST /functions/v1/${name} -> HTTP ${response.status} body ${JSON.stringify(text.slice(0, 200))}`);
    }
    say('');

    /* ---------------------------------------------------------------------------------- (f) */

    say('=== (f) the catalog posture on public.projects for the three Data API roles ===');
    const grants = await rows<{ grantee: string; privilege_type: string }>(
      sql`select grantee, privilege_type
            from information_schema.role_table_grants
           where table_schema = 'public' and table_name = 'projects'
             and grantee in ('anon', 'authenticated', 'service_role')
           order by grantee, privilege_type`,
    );
    say(`  information_schema.role_table_grants rows for the three roles: ${grants.length}`);
    for (const row of grants) say(`    ${row.grantee}: ${row.privilege_type}`);
    const probes = await rows<Record<string, boolean>>(
      sql`select
            has_table_privilege('anon', 'public.projects', 'select') as anon_select,
            has_table_privilege('anon', 'public.projects', 'truncate') as anon_truncate,
            has_table_privilege('authenticated', 'public.projects', 'select') as authenticated_select,
            has_table_privilege('authenticated', 'public.projects', 'truncate') as authenticated_truncate,
            has_table_privilege('service_role', 'public.projects', 'select') as service_role_select,
            has_table_privilege('service_role', 'public.projects', 'truncate') as service_role_truncate,
            has_table_privilege('anon', 'public.projects', 'references') as anon_references,
            has_table_privilege('anon', 'public.projects', 'trigger') as anon_trigger`,
    );
    say(`  has_table_privilege: ${JSON.stringify(probes[0])}`);
    say('');

    await sql.close();
    say('END OF THE VERIFY-FIRST PROBES');
    return 0;
  } finally {
    release(held);
    console.log('=== the slot claim was released ===');
  }
}

process.exit(await main());
