/**
 * THE GATE-2 VERIFICATION PROBES for AI4DEV-62 (per-organisation roles and isolation) and its
 * single-seat partner item — the three conditions `gate2-rulings.md` attaches to its rulings.
 *
 *   v1 (ruling R2c, a REMOVAL condition, checked BEFORE the removal): the deployed
 *       `update-organization`, called with a valid session and a well-formed random UUID, must
 *       answer HTTP 403 with kind `not-a-member`. If it answers anything else the fixture keeps its
 *       organisation-existence pre-check and the executor reports instead of removing.
 *   v2 (ruling R7): what the anon (publishable) key really receives when it reads
 *       `public.org_memberships` through the Data API — status and body, measured then pinned.
 *   v3 (ruling R4): the definer RPC `update_organization` with `p_name` set to a single TAB.
 *       Before the fix it must SUCCEED (the reviewer's claim); after the fix and a reset replay the
 *       same call must refuse with SQLSTATE `22023`.
 *
 * IT IS NOT AN ACCEPTANCE TEST AND PROVES NO CRITERION. It measures the platform so that a removal
 * is made on evidence and an assertion is pinned to a measured shape.
 *
 * Run the before-half with `bun loop/items/AI4DEV-62/gate2-verify.ts before` and the after-half
 * with `bun loop/items/AI4DEV-62/gate2-verify.ts after`. Each half takes the item's own slot
 * through the pool's helpers, so the reservation, the identity proof and the reset happen exactly
 * as a verify run does them.
 */

import { evidence, occupy, prepare, release, stackEnv, type Occupancy } from '../../../tests/at/harness/db-pool.ts';

interface BunSqlClient {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  close(): Promise<void>;
}
type BunSqlCtor = new (url: string) => BunSqlClient;

function say(text: string): void {
  console.log(text);
}

const half = (process.argv[2] ?? 'before').toLowerCase();
if (half !== 'before' && half !== 'after') {
  throw new Error(`the half must be "before" or "after", not ${JSON.stringify(half)}`);
}

async function main(): Promise<number> {
  let held: Occupancy | null = null;
  try {
    held = occupy('req-001');
    const result = await prepare(held);
    const env = stackEnv(held, result.status);
    say(`half: ${half}`);
    say(evidence(held, result));
    say('');

    const api = env.AT_SUPABASE_URL.replace(/\/$/, '');
    const anonKey = env.AT_SUPABASE_ANON_KEY;
    const serviceRoleKey = env.AT_SUPABASE_SERVICE_ROLE_KEY;
    const SQL = (globalThis as { Bun?: { SQL?: BunSqlCtor } }).Bun?.SQL;
    if (!SQL) throw new Error('this runtime has no SQL client (expected bun)');
    const sql = new SQL(env.AT_SUPABASE_DB_URL);
    const rows = async <T>(query: Promise<unknown>): Promise<T[]> => (await query) as T[];

    /** An auth user, created through the admin API exactly as `provisionPlatformAdmin` does. */
    const PASSWORD = 'correct horse battery staple';
    const authUser = async (email: string): Promise<string> => {
      const created = await fetch(`${api}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
      });
      if (created.status >= 400) throw new Error(`creating ${email} answered ${created.status}`);
      const user = (await created.json()) as { id?: string };
      if (!user.id) throw new Error(`creating ${email} answered 200 with no id`);
      return user.id;
    };

    /** A real access token, obtained the way a browser client obtains one. */
    const signIn = async (email: string): Promise<string> => {
      const response = await fetch(`${api}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: PASSWORD }),
      });
      const body = (await response.json()) as { access_token?: string };
      if (!body.access_token) throw new Error(`signing in ${email} answered ${response.status} with no access token`);
      return body.access_token;
    };

    const stamp = Date.now().toString(36);
    const ngoId = await authUser(`gate2-ngo-${stamp}@example.test`);
    const ngoToken = await signIn(`gate2-ngo-${stamp}@example.test`);
    await sql`insert into public.accounts (id, account_type) values (${ngoId}::uuid, 'ngo')`;
    const [organization] = await rows<{ id: string; name: string }>(
      sql`insert into public.organizations (name) values ('Gate Two Probe Organisation') returning id, name`,
    );
    await sql`insert into public.org_memberships (org_id, account_id, role)
              values (${organization.id}::uuid, ${ngoId}::uuid, 'admin')`;

    if (half === 'before') {
      /* -------------------------------------------------------------------------------- (v1) */

      say('=== (v1) the deployed update-organization, a valid session, a well-formed RANDOM uuid ===');
      const ghostOrganization = crypto.randomUUID();
      say(`  the random organisation id: ${ghostOrganization}`);
      const v1 = await fetch(`${api}/functions/v1/update-organization`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${ngoToken}`,
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.7',
        },
        body: JSON.stringify({ organizationId: ghostOrganization, name: 'Gate Two Renamed Nothing' }),
      });
      const v1Body = await v1.text();
      say(`  ANSWER: HTTP ${v1.status} body ${JSON.stringify(v1Body.slice(0, 300))}`);
      let v1Kind: unknown = null;
      try {
        v1Kind = (JSON.parse(v1Body) as { kind?: unknown }).kind;
      } catch {
        v1Kind = null;
      }
      const v1Passes = v1.status === 403 && v1Kind === 'not-a-member';
      say(`  kind ${JSON.stringify(v1Kind)} — the removal condition ${v1Passes ? 'HOLDS' : 'DOES NOT HOLD'}`);
      // THE CONTROL: the same session renaming the organisation it really administers must SUCCEED,
      // or a 403 above would only mean this caller can rename nothing at all.
      const v1Control = await fetch(`${api}/functions/v1/update-organization`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${ngoToken}`,
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.7',
        },
        body: JSON.stringify({ organizationId: organization.id, name: 'Gate Two Probe Organisation Renamed' }),
      });
      say(`  control (the organisation this caller administers): HTTP ${v1Control.status} body ${JSON.stringify((await v1Control.text()).slice(0, 200))}`);
      say('');

      /* -------------------------------------------------------------------------------- (v2) */

      say('=== (v2) org_memberships through the Data API, with the ANON (publishable) key ===');
      const v2 = await fetch(`${api}/rest/v1/org_memberships?select=role`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' },
      });
      const v2Body = await v2.text();
      say(`  ANSWER: HTTP ${v2.status} body ${JSON.stringify(v2Body.slice(0, 300))}`);
      // THE CONTROL: a table the anon key CAN reach, so a refusal above is the privilege posture of
      // this table rather than the Data API being down or the key being wrong.
      const v2Control = await fetch(`${api}/rest/v1/organizations?select=id`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' },
      });
      say(`  control (organizations, same key): HTTP ${v2Control.status} body ${JSON.stringify((await v2Control.text()).slice(0, 200))}`);
      say('');
    }

    /* ---------------------------------------------------------------------------------- (v3) */

    say(`=== (v3, ${half} the fix) the definer RPC update_organization with p_name = one TAB ===`);
    const rpc = await fetch(`${api}/rest/v1/rpc/update_organization`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ p_account_id: ngoId, p_organization_id: organization.id, p_name: '\t' }),
    });
    const rpcBody = await rpc.text();
    say(`  ANSWER: HTTP ${rpc.status} body ${JSON.stringify(rpcBody.slice(0, 400))}`);
    let rpcCode: unknown = null;
    try {
      rpcCode = (JSON.parse(rpcBody) as { code?: unknown }).code;
    } catch {
      rpcCode = null;
    }
    say(`  sqlstate on the answer: ${JSON.stringify(rpcCode)}`);
    const [readBack] = await rows<{ name: string }>(
      sql`select name from public.organizations where id = ${organization.id}::uuid`,
    );
    say(`  read-back of the row: name ${JSON.stringify(readBack?.name ?? null)}`);
    say('');

    await sql.close();
    say('END OF THE GATE-2 VERIFICATION PROBES');
    return 0;
  } finally {
    release(held);
    console.log('=== the slot claim was released ===');
  }
}

process.exit(await main());
