/**
 * verify-ai4good — prepare a signed-in NGO admin and a submitted need for the Discovery chat page.
 *
 *   bun .claude/skills/verify-ai4good/scripts/prepare-chat-page.ts [outDir] [--drain]
 *
 * Walks the product path on the local stack: email signup, mail confirmation, password sign-in,
 * complete-signup as an NGO, project-need start with a description, project-need submit. Prints
 * one JSON object on stdout with email, password, organizationId, projectId, and pageUrl
 * (http://localhost:8080/discovery/<org>/<project>) so a person or a browser drive can open the
 * page. The password is a fresh random string for a throwaway local user; printing it is intended.
 *
 * With --drain, after that setup, send short JSON turns through discovery-message (no Accept
 * header) until the send answers 409 daily-allowance-exhausted, at most 15 sends, and add
 * drained: true and the send count to the JSON. The drain spends real provider credits on the
 * Haiku test model — do not run --drain against a stack without a provider key in
 * supabase/functions/.env.
 *
 * Writes a REDACTED transcript to outDir (default loop/verify-evidence/<timestamp>/). Run from
 * the repo root with the stack up (bun run db:start).
 */

import { randomBytes } from 'node:crypto';
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
  verifyLinksFor,
  type Stack,
} from '../../../../tests/at/harness/live-stack.ts';

import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

/* ----------------------------------------------------------------------------- reporting */

type Check = { id: string; title: string; outcome: 'pass' | 'fail'; note: string };
const checks: Check[] = [];
const transcript: unknown[] = [];

function record(id: string, title: string, passed: boolean, note: string): void {
  checks.push({ id, title, outcome: passed ? 'pass' : 'fail', note: redactString(note) });
  console.error(`${passed ? 'PASS' : 'FAIL'}  (${id}) ${title}\n        ${redactString(note)}`);
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
const rawArgs = process.argv.slice(2);
const drain = rawArgs.includes('--drain');
const positionals = rawArgs.filter((arg) => arg !== '--drain');
const outDir = resolve(
  repoRoot,
  positionals[0] ??
    join('loop', 'verify-evidence', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)),
);

let organizationId = '';
let projectId = '';
let email = '';
let orgName = '';

let stack: Stack;
try {
  stack = stackFromLocalStatus(repoRoot);
} catch (err) {
  fatal((err as Error).message);
}

const stamp = Date.now();
email = `verify-chat-page-${stamp}@example.com`;
const password = `Chat-${randomBytes(18).toString('base64url')}-Aa1!`;
orgName = `Verify Chat Page Org ${stamp}`;

{
  const url = `${stack.apiUrl.replace(/\/$/, '')}/auth/v1/health`;
  const health = await readJson(url);
  let body: unknown = health.text;
  try {
    body = JSON.parse(health.text);
  } catch {
  }
  recordHttp('doctor-auth-health', 'GET', url, health.status, body);
  record('a', 'auth health answers', health.status === 200, `GET /auth/v1/health -> ${health.status}`);
  if (health.status !== 200) fatal('stack not healthy');
}

{
  try {
    const identification = await mailIdentification(stack);
    record('a2', 'mail identification', true, identification);
  } catch (err) {
    record('a2', 'mail identification', false, (err as Error).message);
    fatal((err as Error).message);
  }
}

{
  const projectId = readLocalConfig(repoRoot).projectId;
  const inspect = spawnSync(
    'docker',
    ['inspect', `supabase_edge_runtime_${projectId}`, '--format', '{{json .Mounts}}'],
    { encoding: 'utf8' },
  );
  const remedy = 'bun run db:stop then bun run db:start from this checkout';
  const normalize = (value: string) =>
    value.replace(/\\/g, '/').replace(/^\/run\/desktop\/mnt\/host\/([a-z])\//i, '$1:/').toLowerCase();
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

/* --------------------------------------------------------------- product path */

const signup = await authPost(stack, '/auth/v1/signup', { email, password });
recordHttp('signup', 'POST', signup.url, signup.status, signup.json);
if (signup.status !== 200) fatal(`signup answered ${signup.status}`);
record('setup-signup', 'email signup', signup.status === 200, `status ${signup.status}`);

const links = await verifyLinksFor(stack, email, 'signup');
const link = links[0] ?? null;
transcript.push({ step: 'confirmation-link', link: link ? redactUrl(link) : null });
if (!link) fatal('no confirmation email');
const followed = await followLink(link);
transcript.push({ step: 'verify-redirect', status: followed.status, location: redactUrl(followed.location) });
if (!(followed.status >= 300 && followed.status < 400)) fatal('confirmation did not redirect');
record('setup-confirm', 'mail confirmation', true, `status ${followed.status}`);

const signedIn = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
recordHttp('signin', 'POST', signedIn.url, signedIn.status, signedIn.json);
let accessToken = String(signedIn.json.access_token ?? '');
if (!accessToken) fatal('sign-in produced no token');
record('setup-signin', 'password sign-in', true, `status ${signedIn.status}`);

const completed = await functionPost(
  stack,
  'complete-signup',
  {
    accountType: 'ngo',
    organizationName: orgName,
    acknowledgmentTextVersion: 'tos-platform-promise-v1',
    signerName: 'Verify Chat Page',
    signerTitle: 'Automated verifier',
    authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
  },
  accessToken,
);
recordHttp('complete-signup', 'POST', completed.url, completed.status, completed.json);
organizationId = String(completed.json.organizationId ?? '');
if (!organizationId) fatal('complete-signup named no organisation');
record('setup-ngo', 'complete-signup as NGO', completed.status === 200, `organizationId ${organizationId}`);

const started = await functionPost(
  stack,
  'project-need',
  {
    organizationId,
    action: 'start',
    title: 'Chat page need',
    description: 'We miss funder reporting deadlines and need a shared reminder list.',
    urgency: 'soon',
  },
  accessToken,
);
recordHttp('project-need-start', 'POST', started.url, started.status, started.json);
const need = started.json.need as Record<string, unknown> | undefined;
projectId = String(need?.projectId ?? '');
if (started.status !== 200 || !projectId) fatal(`project-need start answered ${started.status}`);
record('setup-start', 'project-need start', true, `projectId ${projectId}`);

const submitted = await functionPost(stack, 'project-need', { organizationId, action: 'submit', projectId }, accessToken);
recordHttp('project-need-submit', 'POST', submitted.url, submitted.status, submitted.json);
if (submitted.status !== 200) fatal(`project-need submit answered ${submitted.status}`);
record('setup-submit', 'project-need submit', true, `status ${submitted.status}`);

async function refreshAccessToken(): Promise<void> {
  const again = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
  recordHttp('signin-refresh', 'POST', again.url, again.status, again.json);
  accessToken = String(again.json.access_token ?? '');
  if (!accessToken) fatal('sign-in refresh produced no token');
}

async function send(message: string) {
  const first = await functionPost(
    stack,
    'discovery-message',
    { organizationId, projectId, message },
    accessToken,
  );
  recordHttp(`discovery-message-drain-${sendCount}`, 'POST', first.url, first.status, first.json);
  if (first.status !== 401) return first;
  await refreshAccessToken();
  const retry = await functionPost(
    stack,
    'discovery-message',
    { organizationId, projectId, message },
    accessToken,
  );
  recordHttp(`discovery-message-drain-${sendCount}-retry`, 'POST', retry.url, retry.status, retry.json);
  return retry;
}

let sendCount = 0;
let drained = false;
let drainedKind: string | null = null;
if (drain) {
  const maxSends = 15;
  while (sendCount < maxSends) {
    sendCount += 1;
    const r = await send(`Short turn ${sendCount}. Please record this need.`);
    if (r.status === 409) {
      drainedKind = typeof r.json.kind === 'string' ? r.json.kind : null;
      drained = drainedKind === 'daily-allowance-exhausted' || drainedKind === 'debit-exceeds-remaining';
      break;
    }
    if (r.status !== 200) fatal(`drain send ${sendCount} answered ${r.status}`);
  }
  record(
    'drain',
    'daily allowance drained through JSON sends',
    drained,
    `sends=${sendCount} drained=${drained} kind=${drainedKind ?? 'none'}`,
  );
  if (!drained) fatal(`drain did not reach a zero-credit 409 after ${sendCount} sends`);
}

const summary: Record<string, unknown> = {
  email,
  password,
  organizationId,
  projectId,
  apiUrl: stack.apiUrl,
  pageUrl: `http://localhost:8080/discovery/${organizationId}/${projectId}`,
};
if (drain) {
  summary.drained = true;
  summary.sendCount = sendCount;
  summary.drainedKind = drainedKind;
}

transcript.push({ step: 'summary', body: redactValue(summary) });

function flush(): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'transcript.json'),
    JSON.stringify({ ranAt: new Date().toISOString(), email, orgName, organizationId, projectId, checks, transcript }, null, 2),
  );
  console.error(`\nevidence: ${join(outDir, 'transcript.json')}`);
}

flush();
console.log(JSON.stringify(summary));
const failed = checks.filter((c) => c.outcome === 'fail');
process.exit(failed.length === 0 && checks.length > 0 ? 0 : 1);
