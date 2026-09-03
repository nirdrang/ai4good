/**
 * verify-ai4good — the end-to-end NGO drive.
 *
 *   bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts [outDir]
 *
 * Drives the REAL user path on the local stack: email signup → refused sign-in while
 * unconfirmed → confirmation link from Mailpit → sign-in → `complete-signup` (NGO) →
 * database readback with the service role. Writes a REDACTED transcript to
 * `outDir` (default `loop/verify-evidence/<timestamp>/`) and exits 0 only when every
 * check passed.
 *
 * Run it from the repo root, with the stack up (`bun run db:start`). A clean state
 * (`bun run db:reset`) is recommended for evidence-grade runs. Mind the auth rate limit:
 * two signup emails per hour per stack restart (see features/email-signup-and-confirmation.md).
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readLocalConfig, stackFromLocalStatus } from '../../../../tests/at/harness/local-stack.ts';
import {
  authPost,
  followLink,
  functionPost,
  mailIdentification,
  readJson,
  redactString,
  redactUrl,
  redactValue,
  sqlClient,
  verifyLinksFor,
  type Stack,
} from '../../../../tests/at/harness/live-stack.ts';

// The shipped attestation, imported so the drive affirms the exact statement the server accepts.
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

/* ----------------------------------------------------------------------------- reporting */

type Check = { id: string; title: string; outcome: 'pass' | 'fail'; note: string };
const checks: Check[] = [];
const transcript: unknown[] = [];

function record(id: string, title: string, passed: boolean, note: string): void {
  checks.push({ id, title, outcome: passed ? 'pass' : 'fail', note: redactString(note) });
  console.log(`${passed ? 'PASS' : 'FAIL'}  (${id}) ${title}\n        ${redactString(note)}`);
}

function fatal(message: string): never {
  console.error(`\nABORT: ${redactString(message)}`);
  flush();
  process.exit(1);
}

function recordHttp(name: string, method: string, url: string, status: number, body: unknown): void {
  transcript.push({
    step: name,
    request: { method, url: redactUrl(url) },
    response: { status, body: redactValue(body) },
  });
}

/* ----------------------------------------------------------------------------------- run */

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../..');
const outDir = resolve(
  repoRoot,
  process.argv[2] ??
    join('loop', 'verify-evidence', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)),
);

let stack: Stack;
try {
  stack = stackFromLocalStatus(repoRoot);
} catch (err) {
  fatal((err as Error).message);
}

const stamp = Date.now();
const email = `verify-${stamp}@example.com`;
const password = `Verify-Drill-${stamp}!`;
const orgName = `Verify Drill Org ${stamp}`;

// (a) Doctor: the stack answers.
{
  const url = `${stack.apiUrl.replace(/\/$/, '')}/auth/v1/health`;
  const health = await readJson(url);
  let body: unknown = health.text;
  try {
    body = JSON.parse(health.text);
  } catch {
    /* not JSON — keep the string */
  }
  recordHttp('doctor-auth-health', 'GET', url, health.status, body);
  record('a', 'auth health answers', health.status === 200, `GET /auth/v1/health -> ${health.status}`);
  if (health.status !== 200) fatal('stack not healthy');
}

// (a2) Doctor: the catcher's own identification.
{
  try {
    const identification = await mailIdentification(stack);
    record('a2', 'mail identification', true, identification);
  } catch (err) {
    record('a2', 'mail identification', false, (err as Error).message);
    fatal((err as Error).message);
  }
}

// (a3) Doctor: the edge runtime mounts this checkout's functions.
{
  const projectId = readLocalConfig(repoRoot).projectId;
  const inspect = spawnSync(
    'docker',
    ['inspect', `supabase_edge_runtime_${projectId}`, '--format', '{{json .Mounts}}'],
    { encoding: 'utf8' },
  );
  const remedy = 'bun run db:stop then bun run db:start from this checkout';
  const normalize = (value: string) => value.replace(/\\/g, '/').toLowerCase();
  const root = normalize(repoRoot);
  let source = '';
  let ok = false;
  let note = '';
  if (inspect.error) {
    note = `docker inspect could not be launched (${inspect.error.message}); ${remedy}`;
  } else {
    try {
      const mounts = JSON.parse(inspect.stdout || '[]') as { Source?: string }[];
      const functionsMount = mounts.find((mount) => normalize(String(mount.Source ?? '')).endsWith('supabase/functions'));
      source = String(functionsMount?.Source ?? '');
      ok = source.length > 0 && normalize(source).startsWith(root);
      note = ok
        ? `edge runtime functions mount ${source}`
        : `edge runtime functions mount is ${source || 'missing'}; expected a Source ending in supabase/functions that starts with ${repoRoot}. ${remedy}`;
    } catch (err) {
      note = `docker inspect did not answer JSON mounts (${(err as Error).message}); ${remedy}`;
    }
  }
  record('a3', 'edge runtime mount', ok, note);
  if (!ok) fatal(note);
}

// (b) Signup issues NO session while unconfirmed.
{
  const r = await authPost(stack, '/auth/v1/signup', { email, password });
  recordHttp('signup', 'POST', r.url, r.status, r.json);
  const noSession = r.status === 200 && !('access_token' in r.json);
  record('b', 'signup returns a user and no session', noSession, `status ${r.status}, access_token present: ${'access_token' in r.json}`);
}

// (c) Sign-in is refused before confirmation.
{
  const r = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
  recordHttp('signin-before-confirm', 'POST', r.url, r.status, r.json);
  record('c', 'sign-in refused while unconfirmed', r.status === 400, `status ${r.status}`);
}

// (d) The confirmation email arrives; extract and follow its verify link.
let confirmed = false;
{
  const links = await verifyLinksFor(stack, email, 'signup');
  const link = links[0] ?? null;
  transcript.push({ step: 'confirmation-link', link: link ? redactUrl(link) : null });
  record('d1', 'confirmation email holds a verify link', link !== null, link ? redactUrl(link) : 'no message for the address after 20s (rate limit? see feature file)');
  if (link) {
    const r = await followLink(link);
    transcript.push({ step: 'verify-redirect', status: r.status, location: redactUrl(r.location) });
    confirmed = r.status >= 300 && r.status < 400;
    record('d2', 'verify link redirects (address confirmed)', confirmed, `status ${r.status} -> ${redactUrl(r.location)}`);
  }
}

// (e) Sign-in now succeeds.
let accessToken = '';
let userId = '';
if (confirmed) {
  const r = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
  recordHttp('signin-after-confirm', 'POST', r.url, r.status, r.json);
  accessToken = String(r.json.access_token ?? '');
  userId = String((r.json.user as { id?: string } | undefined)?.id ?? '');
  record('e', 'sign-in succeeds after confirmation', r.status === 200 && accessToken !== '', `status ${r.status}, token ${accessToken ? 'issued' : 'missing'}, user ${userId || 'missing'}`);
}

// (f) complete-signup, NGO branch — the real edge function, real JWT gate.
if (accessToken) {
  const r = await functionPost(
    stack,
    'complete-signup',
    {
      accountType: 'ngo',
      organizationName: orgName,
      acknowledgmentTextVersion: 'tos-platform-promise-v1',
      signerName: 'Verify Drill',
      signerTitle: 'Automated verifier',
      authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
    },
    accessToken,
  );
  recordHttp('complete-signup-ngo', 'POST', r.url, r.status, r.json);
  record('f', 'complete-signup (ngo) answers 200', r.status === 200, `status ${r.status}: ${JSON.stringify(redactValue(r.json)).slice(0, 200)}`);
}

// (g) Side effects, read back directly from Postgres over DB_URL. REST is not the tool here:
// the service role has no SELECT grant on organizations/acknowledgments (measured 403,
// 2026-08-31), and granting one for verification's sake would widen the shipped surface.
if (userId) {
  const sql = sqlClient(stack);
  const read = async (label: string, rows: unknown): Promise<Record<string, unknown>[]> => {
    const list = rows as Record<string, unknown>[];
    transcript.push({ step: `readback ${label}`, rows: redactValue(list) });
    return list;
  };

  const accounts = await read('accounts', await sql`select id, account_type from public.accounts where id = ${userId}`);
  record('g1', 'accounts row: account_type=ngo', accounts[0]?.account_type === 'ngo', JSON.stringify(redactValue(accounts[0] ?? null)));

  const orgs = await read('organizations', await sql`select id, name from public.organizations where name = ${orgName}`);
  record('g2', 'organizations row exists with the driven name', orgs[0]?.name === orgName, JSON.stringify(redactValue(orgs[0] ?? null)));

  const members = await read(
    'org_memberships',
    await sql`select role from public.org_memberships where account_id = ${userId} and org_id = ${orgs[0]?.id ?? '00000000-0000-0000-0000-000000000000'}`,
  );
  record('g3', 'org_memberships row: role=admin', members[0]?.role === 'admin', JSON.stringify(redactValue(members[0] ?? null)));

  const acks = await read('acknowledgments', await sql`select kind, text_version from public.acknowledgments where account_id = ${userId}`);
  record('g4', 'acknowledgments row carries the driven text_version', acks[0]?.text_version === 'tos-platform-promise-v1', JSON.stringify(redactValue(acks[0] ?? null)));

  await sql.close();
}

/* -------------------------------------------------------------------------- the artifact */

function flush(): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'transcript.json'),
    JSON.stringify({ ranAt: new Date().toISOString(), email, orgName, checks, transcript }, null, 2),
  );
  console.log(`\nevidence: ${join(outDir, 'transcript.json')}`);
}

flush();
const failed = checks.filter((c) => c.outcome === 'fail');
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length === 0 && checks.length > 0 ? 0 : 1);
