/**
 * verify-ai4good — the end-to-end NGO drive.
 *
 *   bun .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts [outDir]
 *
 * Drives the REAL user path on the local stack: email signup → refused sign-in while
 * unconfirmed → confirmation link from Mailpit → sign-in → `complete-signup` (NGO) →
 * database readback with the service role. Writes a REDACTED transcript to
 * `outDir` (default `loop/verify-evidence/<timestamp>/`) and exits 0 only when every
 * check passed. Keys are read from `bun x supabase status -o json` at run time.
 *
 * Run it from the repo root, with the stack up (`bun run db:start`). A clean state
 * (`bun run db:reset`) is recommended for evidence-grade runs. Mind the auth rate limit:
 * two signup emails per hour per stack restart (see features/email-signup-and-confirmation.md).
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SQL } from 'bun';

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

/* ----------------------------------------------------------------------------- redaction */

const SENSITIVE_KEY = /token|secret|password|apikey|api_key|jwt|nonce|otp|code$/i;
const JWT_SHAPE = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
const SB_KEY_SHAPE = /sb_(publishable|secret)_[A-Za-z0-9_-]+/g;

function redactString(s: string): string {
  return s.replace(JWT_SHAPE, '[REDACTED-JWT]').replace(SB_KEY_SHAPE, '[REDACTED-KEY]');
}

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? '[REDACTED]' : redactValue(v);
    }
    return out;
  }
  return value;
}

/** A URL with its fragment cut and every query VALUE replaced; parameter names survive. */
function redactUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = '';
    for (const name of [...u.searchParams.keys()]) u.searchParams.set(name, 'REDACTED');
    return u.toString();
  } catch {
    return '[UNPARSEABLE-URL-REDACTED]';
  }
}

/* ------------------------------------------------------------------------------- harness */

const repoRoot = resolve(import.meta.dir, '../../../..');
const outDir = resolve(
  repoRoot,
  process.argv[2] ??
    join('loop', 'verify-evidence', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)),
);

async function step(
  name: string,
  url: string,
  init: RequestInit,
): Promise<{ status: number; body: unknown; headers: Headers }> {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* not JSON — keep the string */
  }
  transcript.push({
    step: name,
    request: { method: init.method ?? 'GET', url: redactUrl(url) },
    response: { status: response.status, body: redactValue(body) },
  });
  return { status: response.status, body, headers: response.headers };
}

/* ----------------------------------------------------------------------------------- run */

// Keys and URLs from the running stack — never hardcoded.
const status = spawnSync('bun', ['x', 'supabase', 'status', '-o', 'json'], {
  cwd: repoRoot,
  encoding: 'utf8',
});
const raw = (status.stdout ?? '').slice((status.stdout ?? '').indexOf('{'));
let cfg: Record<string, string>;
try {
  cfg = JSON.parse(raw.slice(0, raw.lastIndexOf('}') + 1));
} catch {
  fatal('supabase status did not answer JSON — is the stack up? (bun run db:start)');
}
const API = cfg.API_URL;
const MAIL = cfg.MAILPIT_URL ?? cfg.INBUCKET_URL;
const ANON = cfg.ANON_KEY;
const DB_URL = cfg.DB_URL;
if (!API || !MAIL || !ANON || !DB_URL) fatal('status JSON is missing API/MAIL/ANON/DB fields');

const stamp = Date.now();
const email = `verify-${stamp}@example.com`;
const password = `Verify-Drill-${stamp}!`;
const orgName = `Verify Drill Org ${stamp}`;

// (a) Doctor: the stack answers.
{
  const r = await step('doctor-auth-health', `${API}/auth/v1/health`, {});
  record('a', 'auth health answers', r.status === 200, `GET /auth/v1/health -> ${r.status}`);
  if (r.status !== 200) fatal('stack not healthy');
}

// (b) Signup issues NO session while unconfirmed.
{
  const r = await step('signup', `${API}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const b = r.body as Record<string, unknown>;
  const noSession = r.status === 200 && !('access_token' in b);
  record('b', 'signup returns a user and no session', noSession, `status ${r.status}, access_token present: ${'access_token' in b}`);
}

// (c) Sign-in is refused before confirmation.
{
  const r = await step('signin-before-confirm', `${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  record('c', 'sign-in refused while unconfirmed', r.status === 400, `status ${r.status}`);
}

// (d) The confirmation email arrives; extract and follow its verify link.
let confirmed = false;
{
  let link: string | null = null;
  for (let attempt = 0; attempt < 20 && !link; attempt++) {
    const list = await fetch(`${MAIL}/api/v1/messages`).then((r) => r.json() as Promise<{ messages?: { ID: string; To: { Address: string }[] }[] }>);
    const mine = (list.messages ?? []).find((m) => m.To.some((t) => t.Address === email));
    if (mine) {
      const detail = await fetch(`${MAIL}/api/v1/message/${mine.ID}`).then((r) => r.json() as Promise<{ Text?: string; HTML?: string }>);
      const source = `${detail.Text ?? ''}\n${(detail.HTML ?? '').replace(/&amp;/g, '&')}`;
      link = source.match(/https?:\/\/[^\s"'<>\])]+\/auth\/v1\/verify[^\s"'<>\])]*/)?.[0] ?? null;
    }
    if (!link) await new Promise((f) => setTimeout(f, 1000));
  }
  transcript.push({ step: 'confirmation-link', link: link ? redactUrl(link) : null });
  record('d1', 'confirmation email holds a verify link', link !== null, link ? redactUrl(link) : 'no message for the address after 20s (rate limit? see feature file)');
  if (link) {
    const r = await fetch(link, { redirect: 'manual' });
    const location = r.headers.get('location') ?? '';
    transcript.push({ step: 'verify-redirect', status: r.status, location: redactUrl(location) });
    confirmed = r.status >= 300 && r.status < 400;
    record('d2', 'verify link redirects (address confirmed)', confirmed, `status ${r.status} -> ${redactUrl(location)}`);
  }
}

// (e) Sign-in now succeeds.
let accessToken = '';
let userId = '';
if (confirmed) {
  const r = await step('signin-after-confirm', `${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const b = r.body as { access_token?: string; user?: { id?: string } };
  accessToken = b.access_token ?? '';
  userId = b.user?.id ?? '';
  record('e', 'sign-in succeeds after confirmation', r.status === 200 && accessToken !== '', `status ${r.status}, token ${accessToken ? 'issued' : 'missing'}, user ${userId || 'missing'}`);
}

// (f) complete-signup, NGO branch — the real edge function, real JWT gate.
if (accessToken) {
  const r = await step('complete-signup-ngo', `${API}/functions/v1/complete-signup`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountType: 'ngo',
      organizationName: orgName,
      acknowledgmentTextVersion: 'tos-platform-promise-v1',
      signerName: 'Verify Drill',
      signerTitle: 'Automated verifier',
      authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
    }),
  });
  record('f', 'complete-signup (ngo) answers 200', r.status === 200, `status ${r.status}: ${JSON.stringify(redactValue(r.body)).slice(0, 200)}`);
}

// (g) Side effects, read back directly from Postgres over DB_URL. REST is not the tool here:
// the service role has no SELECT grant on organizations/acknowledgments (measured 403,
// 2026-08-31), and granting one for verification's sake would widen the shipped surface.
if (userId) {
  const sql = new SQL(DB_URL);
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

  await sql.end();
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
