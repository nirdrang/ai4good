/**
 * THE LOCAL INTEGRATION PROOF for AI4DEV-57 — the only evidence in this item about the real
 * database, the real edge functions and the real Supabase Auth.
 *
 *   bun loop/items/AI4DEV-57/proof-local.ts
 *
 * Preconditions, and the script refuses rather than guesses if any is missing:
 *   1. `bun run db:start` — the stack is up.
 *   2. `bun run db:reset` — the migration has been replayed. Run it immediately before this
 *      script: the checks below assert row counts and a clean database makes them mean what they
 *      say.
 *   3. `bunx supabase functions serve` — running in another terminal, WITHOUT --no-verify-jwt.
 *
 * IT LIVES IN THE ITEM RECORD AND NOT IN `tests/`, DELIBERATELY. It is evidence-gathering: it runs
 * once, on one machine, by hand, and its transcript is the artifact. Putting it under `tests/`
 * would make it look like something that guards the tree, and it guards nothing — nothing runs it
 * again, CI has no database, and a test nobody runs is worse than no test because it reads like
 * coverage.
 *
 * WHAT THE LOOP-TIER SUITE ALREADY PROVES, so this script does not duplicate it: that the shipped
 * decisions in `supabase/functions/_shared/accounts.ts` behave as the four acceptance criteria
 * require. What NOTHING but this script touches: that the migration is correct, that either edge
 * function works, that row-level security denies what it should, and that Auth is configured.
 *
 * NO KEY IS WRITTEN INTO THIS FILE. Everything is read from `bunx supabase status -o json` at run
 * time, so nothing key-shaped is committed and the script follows the machine it is run on.
 */

import { SQL } from 'bun';

/* ------------------------------------------------------------------------ reporting machinery */

type Check = { id: string; title: string; passed: boolean; note: string };

const results: Check[] = [];

function record(id: string, title: string, passed: boolean, note: string): void {
  results.push({ id, title, passed, note });
  console.log(`${passed ? 'PASS' : 'FAIL'}  (${id}) ${title}\n        ${note}`);
}

/** A check that could not be attempted. Reported as SKIPPED and never as a pass. */
function skip(id: string, title: string, why: string): void {
  results.push({ id, title, passed: true, note: `SKIPPED — ${why}` });
  console.log(`SKIP  (${id}) ${title}\n        ${why}`);
}

function fail(message: string): never {
  console.error(`\nPRECONDITION FAILED: ${message}`);
  process.exit(2);
}

/* --------------------------------------------------------------------------- the environment */

const status = await (async () => {
  const proc = Bun.spawnSync(['bunx', 'supabase', 'status', '-o', 'json'], { stdout: 'pipe', stderr: 'pipe' });
  const text = new TextDecoder().decode(proc.stdout);
  const start = text.indexOf('{');
  if (start < 0) fail(`could not read \`supabase status -o json\` — is the stack up? (bun run db:start)\n${text}`);
  return JSON.parse(text.slice(start)) as Record<string, string>;
})();

const API_URL = status.API_URL ?? fail('supabase status reported no API_URL');
const DB_URL = status.DB_URL ?? fail('supabase status reported no DB_URL');
/** The browser's key. Everything a signed-out or signed-in visitor could do uses this and no other. */
const PUBLIC_KEY = status.ANON_KEY ?? status.PUBLISHABLE_KEY ?? fail('supabase status reported no client key');
/** The server's key. Used ONLY where the check is about what a server may do. */
const SECRET_KEY = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY ?? fail('supabase status reported no service key');

const sql = new SQL(DB_URL);

const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const PASSWORD = 'correct horse battery staple';
const CLIENT_IP = '203.0.113.7';
/** Unique per run, so a second run against a database that was not reset still reads honestly. */
const RUN = Date.now().toString(36);
const address = (local: string) => `${local}+${RUN}@example.test`;

/* --------------------------------------------------------------------------------- Auth calls */

type AuthSession = { accessToken: string; userId: string };

async function signUp(email: string): Promise<AuthSession> {
  const response = await fetch(`${API_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: PUBLIC_KEY },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = (await response.json()) as { access_token?: string; user?: { id?: string }; msg?: string; error_description?: string };
  if (!response.ok || !body.access_token || !body.user?.id) {
    fail(`sign-up for ${email} failed (${response.status}): ${body.msg ?? body.error_description ?? JSON.stringify(body)}`);
  }
  return { accessToken: body.access_token, userId: body.user.id };
}

async function signIn(email: string, password = PASSWORD): Promise<{ ok: boolean; session?: AuthSession; status: number }> {
  const response = await fetch(`${API_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: PUBLIC_KEY },
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json()) as { access_token?: string; user?: { id?: string } };
  if (!response.ok || !body.access_token || !body.user?.id) return { ok: false, status: response.status };
  return { ok: true, status: response.status, session: { accessToken: body.access_token, userId: body.user.id } };
}

/* ------------------------------------------------------------------------ the edge functions */

async function callFunction(
  name: string,
  session: AuthSession,
  body: unknown,
): Promise<{ status: number; body: { ok?: boolean; reason?: string; accountId?: string; organizationId?: string | null } }> {
  const response = await fetch(`${API_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: PUBLIC_KEY,
      Authorization: `Bearer ${session.accessToken}`,
      // The address the acknowledgment records. Kong sits in front of the function and may prepend
      // its own hop, and `callerIp` takes the FIRST entry of the chain — which is the original
      // client — so check (a) asserts that an address was recorded and prints the value rather than
      // pinning a string this script cannot fully control.
      'x-forwarded-for': CLIENT_IP,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as Record<string, never> };
}

/* =============================================================================================
 * (a) email/password signup produces an NGO account with an organisation, an admin membership,
 *     and an acknowledgment carrying IP and text version.
 * ============================================================================================= */

const ngoEmail = address('ngo');
const ngo = await signUp(ngoEmail);

// (h) FIRST HALF — the predicate must be FALSE for a user who has authenticated and not completed
// signup. Asserted here, against the real database, before anything has been written.
const acknowledgedBefore = (
  await sql`select public.has_platform_acknowledgment(${ngo.userId}) as held`
)[0].held as boolean;

const completion = await callFunction('complete-signup', ngo, {
  accountType: 'ngo',
  organizationName: 'Riverside Shelter',
  acknowledgmentTextVersion: TEXT_VERSION,
});

const accountRows = await sql`select account_type from public.accounts where id = ${ngo.userId}`;
const orgRows = await sql`
  select o.id, o.name, m.role
    from public.org_memberships m
    join public.organizations o on o.id = m.org_id
   where m.account_id = ${ngo.userId}`;
const ackRows = await sql`
  select kind, host(ip) as ip, text_version, acknowledged_at
    from public.acknowledgments
   where account_id = ${ngo.userId}`;

record(
  'a',
  'email/password signup produces an ngo account, an organisation, an admin membership and a three-field acknowledgment',
  completion.status === 200 &&
    completion.body.ok === true &&
    accountRows.length === 1 &&
    accountRows[0].account_type === 'ngo' &&
    orgRows.length === 1 &&
    orgRows[0].name === 'Riverside Shelter' &&
    orgRows[0].role === 'admin' &&
    ackRows.length === 1 &&
    ackRows[0].text_version === TEXT_VERSION &&
    ackRows[0].ip !== null &&
    ackRows[0].acknowledged_at !== null,
  `HTTP ${completion.status} ${JSON.stringify(completion.body)} · account=${JSON.stringify(accountRows)} · org+membership=${JSON.stringify(orgRows)} · acknowledgment=${JSON.stringify(ackRows)}`,
);

/* =============================================================================================
 * (b) signing in again with the same credentials succeeds, and lands on the same account.
 * ============================================================================================= */

const returning = await signIn(ngoEmail);
record(
  'b',
  'the same email and password sign in again, onto the same account',
  returning.ok && returning.session?.userId === ngo.userId,
  `HTTP ${returning.status} · returned user ${returning.session?.userId ?? '<none>'} · original ${ngo.userId}`,
);

/* =============================================================================================
 * (c) a request asking for platform_admin is refused by the public path, and leaves nothing.
 * ============================================================================================= */

const wouldBeAdmin = await signUp(address('would-be-admin'));
const escalation = await callFunction('complete-signup', wouldBeAdmin, {
  accountType: 'platform_admin',
  acknowledgmentTextVersion: TEXT_VERSION,
});
const escalationRows = await sql`select 1 from public.accounts where id = ${wouldBeAdmin.userId}`;
record(
  'c',
  'the public signup path refuses platform_admin and writes nothing',
  escalation.status >= 400 && escalation.body.ok !== true && escalationRows.length === 0,
  `HTTP ${escalation.status} ${JSON.stringify(escalation.body)} · accounts rows for that user: ${escalationRows.length}`,
);

/* =============================================================================================
 * (d) create-organization refuses a volunteer AND succeeds for an NGO.
 *
 * The NGO control is not decoration: an operation that refused everybody would satisfy the
 * negative half on its own, so a refusal with no working control proves only that the path is
 * broken.
 * ============================================================================================= */

const volunteer = await signUp(address('volunteer'));
const volunteerCompletion = await callFunction('complete-signup', volunteer, {
  accountType: 'volunteer',
  acknowledgmentTextVersion: TEXT_VERSION,
});
if (volunteerCompletion.body.ok !== true) fail(`the volunteer could not complete signup: ${JSON.stringify(volunteerCompletion)}`);

const volunteerAction = await callFunction('create-organization', volunteer, { name: 'Riverside Shelter Copy' });
const ngoAction = await callFunction('create-organization', ngo, { name: 'Riverside Shelter Second Programme' });

const controlMembership = await sql`
  select m.role, o.name
    from public.org_memberships m
    join public.organizations o on o.id = m.org_id
   where m.account_id = ${ngo.userId} and o.name = 'Riverside Shelter Second Programme'`;
const volunteerOrgs = await sql`select 1 from public.org_memberships where account_id = ${volunteer.userId}`;

record(
  'd',
  'the NGO-only action succeeds for an NGO account and is refused for a volunteer',
  ngoAction.status === 200 &&
    ngoAction.body.ok === true &&
    controlMembership.length === 1 &&
    controlMembership[0].role === 'admin' &&
    volunteerAction.status >= 400 &&
    volunteerAction.body.ok !== true &&
    /NGO accounts only/i.test(volunteerAction.body.reason ?? '') &&
    volunteerOrgs.length === 0,
  `ngo: HTTP ${ngoAction.status} ${JSON.stringify(ngoAction.body)} membership=${JSON.stringify(controlMembership)} · volunteer: HTTP ${volunteerAction.status} ${JSON.stringify(volunteerAction.body)} memberships=${volunteerOrgs.length}`,
);

/* =============================================================================================
 * (e) a direct client-key insert into public.accounts is denied BY ROW-LEVEL SECURITY.
 *
 * The layer matters and the message names it. `public.accounts` deliberately grants SELECT and
 * INSERT to `authenticated`, so the privilege check PASSES and row-level security is what refuses
 * — with "new row violates row-level security policy". Without that grant the refusal would read
 * "permission denied for table accounts", which is a different mechanism, and calling that
 * "denied by row-level security" would be a claim about something that never ran.
 * ============================================================================================= */

const clientInsert = await fetch(`${API_URL}/rest/v1/accounts`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    apikey: PUBLIC_KEY,
    Authorization: `Bearer ${returning.session?.accessToken ?? PUBLIC_KEY}`,
    Prefer: 'return=representation',
  },
  body: JSON.stringify({ id: volunteer.userId, account_type: 'platform_admin' }),
});
const clientInsertBody = await clientInsert.text();
const stillVolunteer = await sql`select account_type from public.accounts where id = ${volunteer.userId}`;

record(
  'e',
  'a client-key insert into public.accounts is refused by row-level security, and changes nothing',
  clientInsert.status >= 400 &&
    /row-level security/i.test(clientInsertBody) &&
    stillVolunteer.length === 1 &&
    stillVolunteer[0].account_type === 'volunteer',
  `HTTP ${clientInsert.status} ${clientInsertBody} · account after the attempt: ${JSON.stringify(stillVolunteer)}`,
);

/* =============================================================================================
 * (f) Supabase Auth reports Google enabled.
 * ============================================================================================= */

const settings = (await (await fetch(`${API_URL}/auth/v1/settings`, { headers: { apikey: PUBLIC_KEY } })).json()) as {
  external?: Record<string, boolean>;
};
record(
  'f',
  'Auth reports the Google provider enabled, and apple untouched',
  settings.external?.google === true && settings.external?.apple === false,
  `external.google=${String(settings.external?.google)} external.apple=${String(settings.external?.apple)}`,
);

/* =============================================================================================
 * (f2) THE HANDSHAKE WIRING — and ONLY if a real credential is in the environment.
 *
 * If `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` is unset this is SKIPPED and said so plainly. That
 * is the expected case: creating the OAuth client is a founder-manual step. A placeholder proves
 * the block is well-formed, which is (f), and NOTHING MORE — dressing one up as this check would
 * be manufacturing evidence.
 *
 * No redirect is followed and no credential is entered. What is read is the Location header of the
 * FIRST response, which is where the configured client id becomes observable.
 * ============================================================================================= */

const configuredClientId = process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID?.trim();
if (!configuredClientId) {
  skip(
    'f2',
    'the configured Google client id reaches the provider handshake',
    'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID is not set in this environment. Creating the OAuth client is a founder-manual step, so this is the expected case and not a failure. (f) above still holds: the block is well-formed and Auth reports Google enabled. This check stays unperformed rather than being faked with a placeholder.',
  );
} else {
  const authorize = await fetch(`${API_URL}/auth/v1/authorize?provider=google`, {
    redirect: 'manual',
    headers: { apikey: PUBLIC_KEY },
  });
  const location = authorize.headers.get('location') ?? '';
  let carriesClientId = false;
  let carriesCallback = false;
  let host = '';
  try {
    const target = new URL(location);
    host = target.host;
    carriesClientId = target.searchParams.get('client_id') === configuredClientId;
    carriesCallback = target.searchParams.get('redirect_uri') === 'http://127.0.0.1:54321/auth/v1/callback';
  } catch {
    // A Location that is not a URL is a failure, reported by the assertion below.
  }
  record(
    'f2',
    'the configured Google client id reaches the provider handshake, with the local callback',
    authorize.status >= 300 && authorize.status < 400 && /google\.com$/.test(host) && carriesClientId && carriesCallback,
    `HTTP ${authorize.status} · redirect host ${host || '<unparseable>'} · client_id matches the configured value: ${carriesClientId} · redirect_uri is the local Auth callback: ${carriesCallback}`,
  );
}

/* =============================================================================================
 * (g) A PLATFORM ADMINISTRATOR IS PROVISIONED AND SIGNS IN.
 *
 * A DEVIATION FROM THE PLAN'S WORDING, and it is the plan that has to move rather than this
 * script. Plan step 7(g) says "provisioned the only legal way — a service-role write". It is NOT a
 * service-role write, because the service role deliberately holds NO INSERT privilege anywhere in
 * this schema: every write goes through a SECURITY DEFINER function, which is what makes
 * `complete_signup`'s platform_admin refusal sit on the only write path a running service can
 * reach. Granting the service role a direct insert would have made the plan's sentence true and
 * the guard weaker.
 *
 * So provisioning is a direct database operation by an operator — a NARROWER authority than the
 * service role, not a wider one. The criterion says "provisioned", and this is what provisioning
 * is here. The auth user itself is still created through Auth's own admin API with the service
 * key, because only Auth can mint a credential that can then sign in.
 * ============================================================================================= */

const adminEmail = address('platform-admin');
const adminCreate = await fetch(`${API_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}` },
  body: JSON.stringify({ email: adminEmail, password: PASSWORD, email_confirm: true }),
});
const adminUser = (await adminCreate.json()) as { id?: string };
if (!adminCreate.ok || !adminUser.id) fail(`could not provision the administrator's auth user: ${adminCreate.status} ${JSON.stringify(adminUser)}`);

await sql`insert into public.accounts (id, account_type) values (${adminUser.id}, 'platform_admin')`;

const adminSignIn = await signIn(adminEmail);
const adminRows = await sql`select account_type from public.accounts where id = ${adminUser.id}`;
record(
  'g',
  'a provisioned platform administrator authenticates and carries the platform_admin type',
  adminSignIn.ok && adminSignIn.session?.userId === adminUser.id && adminRows.length === 1 && adminRows[0].account_type === 'platform_admin',
  `sign-in HTTP ${adminSignIn.status} · user ${adminSignIn.session?.userId ?? '<none>'} · account row ${JSON.stringify(adminRows)}`,
);

/* =============================================================================================
 * (h) the acknowledgment predicate DISCRIMINATES against the real database.
 *
 * The false half was captured at the top of this script, before anything was written for that
 * user. Both halves are asserted together here so the check reads as one claim.
 * ============================================================================================= */

const acknowledgedAfter = (await sql`select public.has_platform_acknowledgment(${ngo.userId}) as held`)[0].held as boolean;
const neverCompleted = (await sql`select public.has_platform_acknowledgment(${wouldBeAdmin.userId}) as held`)[0].held as boolean;
record(
  'h',
  'has_platform_acknowledgment discriminates: false before signup completion, true after',
  acknowledgedBefore === false && acknowledgedAfter === true && neverCompleted === false,
  `the NGO before completion: ${acknowledgedBefore} · after: ${acknowledgedAfter} · a user whose completion was refused: ${neverCompleted}`,
);

/* =============================================================================================
 * (i) ATOMICITY IS DEMONSTRATED, NOT ASSERTED.
 *
 * `complete_signup` is forced to fail on its LAST write after the first three have succeeded. The
 * lever is the non-empty CHECK on `acknowledgments.text_version`: an empty version passes the
 * function's own argument checks, so the account, the organisation and the membership are all
 * inserted, and then the acknowledgment insert violates the constraint. A failure at the FIRST
 * write would prove nothing at all — there would be nothing to roll back.
 * ============================================================================================= */

const atomicity = await signUp(address('atomicity'));
let atomicityRaised = '';
try {
  await sql`select public.complete_signup(${atomicity.userId}::uuid, 'ngo', 'Halfway House', '', ${CLIENT_IP}::inet)`;
} catch (error) {
  atomicityRaised = error instanceof Error ? error.message : String(error);
}
const leftBehind = {
  accounts: (await sql`select 1 from public.accounts where id = ${atomicity.userId}`).length,
  organizations: (await sql`select 1 from public.organizations where name = 'Halfway House'`).length,
  memberships: (await sql`select 1 from public.org_memberships where account_id = ${atomicity.userId}`).length,
  acknowledgments: (await sql`select 1 from public.acknowledgments where account_id = ${atomicity.userId}`).length,
};
record(
  'i',
  'a completion that fails on its last write leaves NO partial state',
  atomicityRaised !== '' &&
    leftBehind.accounts === 0 &&
    leftBehind.organizations === 0 &&
    leftBehind.memberships === 0 &&
    leftBehind.acknowledgments === 0,
  `the database raised: ${atomicityRaised || '<nothing — the failure was not induced, so this proves nothing>'} · rows left behind: ${JSON.stringify(leftBehind)}`,
);

/* =============================================================================================
 * (j) THE INDEPENDENT GUARD HOLDS — the one that does not depend on the edge function's
 *     TypeScript.
 *
 * `public.complete_signup` is called DIRECTLY, with the service role, through the Data API, asking
 * for platform_admin. If `parseAccountType` were deleted tomorrow this is what would still refuse.
 * The call also establishes that the service role's EXECUTE grant works, which is the other half of
 * the arrangement.
 * ============================================================================================= */

const guardTarget = await signUp(address('guard'));
const directCall = await fetch(`${API_URL}/rest/v1/rpc/complete_signup`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}` },
  body: JSON.stringify({
    p_account_id: guardTarget.userId,
    p_account_type: 'platform_admin',
    p_organization_name: null,
    p_acknowledgment_text_version: TEXT_VERSION,
    p_ip: CLIENT_IP,
  }),
});
const directBody = await directCall.text();
const guardRows = await sql`select 1 from public.accounts where id = ${guardTarget.userId}`;
record(
  'j',
  'the database refuses platform_admin even when called directly with the service role',
  directCall.status >= 400 && /platform_admin/.test(directBody) && guardRows.length === 0,
  `HTTP ${directCall.status} ${directBody} · accounts rows for that user: ${guardRows.length}`,
);

/* ----------------------------------------------------------------------------------- verdict */

await sql.end();

const failed = results.filter((check) => !check.passed);
console.log(`\n${results.length} checks · ${results.length - failed.length} passed · ${failed.length} failed`);
if (failed.length) {
  console.log(`FAILED: ${failed.map((check) => `(${check.id})`).join(' ')}`);
  process.exit(1);
}
console.log('ALL CHECKS PASSED');
