/**
 * verify-ai4good — the vetting drive for AI4DEV-102.
 *
 *   bun .claude/skills/verify-ai4good/scripts/drive-vetting.ts [outDir]
 *
 * Drives the REAL user path on the local stack, past NGO signup: organisation profile,
 * Discovery allowance read and debit, a platform administrator vetting the organisation,
 * the allowance rising to the vetted grant, an unvet, and three refusals (not-a-platform-admin,
 * debit-exceeds-remaining, daily-allowance-exhausted). Writes a REDACTED transcript to `outDir`
 * (default `loop/verify-evidence/<timestamp>/`) and exits 0 only when every check passed.
 *
 * Run it from the repo root, with the stack up (`bun run db:start`) and reset
 * (`bun run db:reset`) for an evidence-grade run.
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
  functionPostRaw,
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

async function readRows(sql: ReturnType<typeof sqlClient>, label: string, rowsPromise: Promise<unknown>): Promise<Record<string, unknown>[]> {
  const list = (await rowsPromise) as Record<string, unknown>[];
  transcript.push({ step: `readback ${label}`, rows: redactValue(list) });
  return list;
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
const ngoEmail = `verify-vet-${stamp}@example.com`;
const adminEmail = `verify-admin-${stamp}@example.com`;
const password = `Verify-Drill-${stamp}!`;
const orgName = `Verify Vetting Org ${stamp}`;

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

const sql = sqlClient(stack);

/* --------------------------------------------------------------- step 1: NGO signup path */

let ngoAccessToken = '';
let ngoUserId = '';
let organizationId = '';

// (b) Signup issues NO session while unconfirmed.
{
  const r = await authPost(stack, '/auth/v1/signup', { email: ngoEmail, password });
  recordHttp('ngo-signup', 'POST', r.url, r.status, r.json);
  const noSession = r.status === 200 && !('access_token' in r.json);
  record('b', 'NGO signup returns a user and no session', noSession, `status ${r.status}, access_token present: ${'access_token' in r.json}`);
}

// (c) The confirmation email arrives; extract and follow its verify link.
let confirmed = false;
{
  const links = await verifyLinksFor(stack, ngoEmail, 'signup');
  const link = links[0] ?? null;
  transcript.push({ step: 'ngo-confirmation-link', link: link ? redactUrl(link) : null });
  record('c1', 'confirmation email holds a verify link', link !== null, link ? redactUrl(link) : 'no message for the address after 20s');
  if (link) {
    const r = await followLink(link);
    transcript.push({ step: 'ngo-verify-redirect', status: r.status, location: redactUrl(r.location) });
    confirmed = r.status >= 300 && r.status < 400;
    record('c2', 'verify link redirects (address confirmed)', confirmed, `status ${r.status} -> ${redactUrl(r.location)}`);
  }
  if (!confirmed) fatal('NGO email was never confirmed');
}

// (d) Sign-in succeeds.
{
  const r = await authPost(stack, '/auth/v1/token?grant_type=password', { email: ngoEmail, password });
  recordHttp('ngo-signin', 'POST', r.url, r.status, r.json);
  ngoAccessToken = String(r.json.access_token ?? '');
  ngoUserId = String((r.json.user as { id?: string } | undefined)?.id ?? '');
  record('d', 'NGO sign-in succeeds after confirmation', r.status === 200 && ngoAccessToken !== '', `status ${r.status}, token ${ngoAccessToken ? 'issued' : 'missing'}`);
  if (!ngoAccessToken) fatal('NGO sign-in produced no access token');
}

// (e) complete-signup, NGO branch.
{
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
    ngoAccessToken,
  );
  recordHttp('complete-signup-ngo', 'POST', r.url, r.status, r.json);
  organizationId = String(r.json.organizationId ?? '');
  record('e', 'complete-signup (ngo) answers 200 with an organisation id', r.status === 200 && organizationId !== '', `status ${r.status}: ${JSON.stringify(redactValue(r.json)).slice(0, 200)}`);
  if (!organizationId) fatal('complete-signup named no organisation');
}

/* --------------------------------------------------------- step 2: organisation profile */

{
  const r = await functionPost(
    stack,
    'set-organization-profile',
    {
      organizationId,
      name: orgName,
      mission: 'Deliver clean water access to river communities.',
      country: 'Kenya',
      website: 'https://example.test/verify-drill',
      logo: 'https://example.test/verify-drill/logo.png',
    },
    ngoAccessToken,
  );
  recordHttp('set-organization-profile', 'POST', r.url, r.status, r.json);
  record('f', 'set-organization-profile answers 200', r.status === 200, `status ${r.status}: ${JSON.stringify(redactValue(r.json)).slice(0, 200)}`);

  const rows = await readRows(
    sql,
    'organizations',
    sql`select id, name, mission, country, website, logo from public.organizations where id = ${organizationId}::uuid`,
  );
  const row = rows[0];
  const matches =
    row?.name === orgName &&
    row?.mission === 'Deliver clean water access to river communities.' &&
    row?.country === 'Kenya' &&
    row?.website === 'https://example.test/verify-drill' &&
    row?.logo === 'https://example.test/verify-drill/logo.png';
  record('f2', 'organizations row carries all five driven fields', Boolean(matches), JSON.stringify(redactValue(row ?? null)));
}

/* ------------------------------------------------------- step 3: Discovery allowance (NGO) */

{
  const readAnswer = await functionPost(stack, 'discovery-allowance', { organizationId, action: 'read' }, ngoAccessToken);
  recordHttp('discovery-allowance-read-1', 'POST', readAnswer.url, readAnswer.status, readAnswer.json);
  record('g1', 'discovery-allowance read answers 200 with the unverified grant (10)', readAnswer.status === 200 && readAnswer.json.dailyGrant === 10, `status ${readAnswer.status}: ${JSON.stringify(redactValue(readAnswer.json))}`);

  const debitAnswer = await functionPost(stack, 'discovery-allowance', { organizationId, action: 'debit', credits: 1 }, ngoAccessToken);
  recordHttp('discovery-allowance-debit-1', 'POST', debitAnswer.url, debitAnswer.status, debitAnswer.json);
  record('g2', 'discovery-allowance debit of 1 answers 200 with remaining 9', debitAnswer.status === 200 && debitAnswer.json.remaining === 9, `status ${debitAnswer.status}: ${JSON.stringify(redactValue(debitAnswer.json))}`);

  const rows = await readRows(
    sql,
    'discovery_spend',
    sql`select org_id, utc_day::text as utc_day, spent, granted from public.discovery_spend where org_id = ${organizationId}::uuid`,
  );
  const row = rows[0];
  record('g3', 'discovery_spend row shows spent=1, granted=10', row?.spent === 1 && row?.granted === 10, JSON.stringify(redactValue(row ?? null)));
}

/* ------------------------------------------------------------ step 4: platform administrator */

let adminAccessToken = '';
let adminAccountId = '';
{
  // Exactly what tests/at/suites/req-002/_live.ts's provisionPlatformAdmin does: the admin
  // API mints the user (account type has no public signup path), then the account row is
  // written directly, and the drive signs in over the real password grant like any other caller.
  const api = stack.apiUrl.replace(/\/$/, '');
  const created = await fetch(`${api}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: stack.serviceRoleKey,
      Authorization: `Bearer ${stack.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: adminEmail, password, email_confirm: true }),
  });
  const createdJson = (await created.json().catch(() => ({}))) as { id?: string };
  recordHttp('provision-platform-admin', 'POST', `${api}/auth/v1/admin/users`, created.status, createdJson);
  adminAccountId = String(createdJson.id ?? '');
  record('h1', 'admin user API mints a platform administrator account', created.status < 400 && adminAccountId !== '', `status ${created.status}, id ${adminAccountId ? 'issued' : 'missing'}`);
  if (!adminAccountId) fatal('platform administrator provisioning named no user id');

  await sql`insert into public.accounts (id, account_type) values (${adminAccountId}::uuid, 'platform_admin')`;
  const rows = await readRows(sql, 'accounts (admin)', sql`select id, account_type from public.accounts where id = ${adminAccountId}::uuid`);
  record('h2', 'accounts row: account_type=platform_admin', rows[0]?.account_type === 'platform_admin', JSON.stringify(redactValue(rows[0] ?? null)));

  const signedIn = await authPost(stack, '/auth/v1/token?grant_type=password', { email: adminEmail, password });
  recordHttp('admin-signin', 'POST', signedIn.url, signedIn.status, signedIn.json);
  adminAccessToken = String(signedIn.json.access_token ?? '');
  record('h3', 'platform administrator signs in', signedIn.status === 200 && adminAccessToken !== '', `status ${signedIn.status}, token ${adminAccessToken ? 'issued' : 'missing'}`);
  if (!adminAccessToken) fatal('platform administrator sign-in produced no access token');
}

/* --------------------------------------------------------------------- step 5: vet the org */

let vetNotificationEventId = '';
{
  const r = await functionPost(
    stack,
    'set-organization-vetting',
    {
      organizationId,
      action: 'vet',
      organizationName: orgName,
      publicReferenceUrl: 'https://example.test/registry/verify-vetting-org',
      contactName: 'Dana Okonkwo',
      contactTitle: 'Executive Director',
      authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
      evidenceType: 'public_registry',
      note: 'Verified against the public registry entry during the AI4DEV-102 live drive.',
    },
    adminAccessToken,
  );
  recordHttp('set-organization-vetting-vet', 'POST', r.url, r.status, r.json);
  vetNotificationEventId = String(r.json.notificationEventId ?? '');
  record('i1', 'set-organization-vetting (vet) answers 200 vetted=true', r.status === 200 && r.json.vetted === true, `status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);

  const rows = await readRows(
    sql,
    'org_vetting (after vet)',
    sql`select org_id, vetted, vetted_by_account_id, organization_name, public_reference_url, contact_name, contact_title, evidence_type, note
          from public.org_vetting where org_id = ${organizationId}::uuid`,
  );
  const row = rows[0];
  record('i2', 'org_vetting row: vetted=true, vetted_by=admin, evidence recorded', row?.vetted === true && row?.vetted_by_account_id === adminAccountId, JSON.stringify(redactValue(row ?? null)));

  const audits = await readRows(
    sql,
    'audit_events (vet)',
    sql`select id, event_kind, actor_account_id, subject_org_id, reason
          from public.audit_events where event_kind = 'org_vetting_changed' and subject_org_id = ${organizationId}::uuid order by occurred_at`,
  );
  record('i3', 'audit_events carries a vet row for this organisation', audits.length >= 1 && audits[0]?.actor_account_id === adminAccountId, JSON.stringify(redactValue(audits[0] ?? null)));

  const notifications = await readRows(
    sql,
    'notification_events (vet)',
    sql`select id, event, actor_account_id, state from public.notification_events where id = ${vetNotificationEventId || '00000000-0000-0000-0000-000000000000'}::uuid`,
  );
  record('i4', 'notification_events row exists for the vet outcome', notifications.length === 1, JSON.stringify(redactValue(notifications[0] ?? null)));

  const deliveries = await readRows(
    sql,
    'notification_deliveries (vet)',
    sql`select event_id, recipient_id, channel, state from public.notification_deliveries where event_id = ${vetNotificationEventId || '00000000-0000-0000-0000-000000000000'}::uuid`,
  );
  record('i5', 'notification_deliveries has at least one row for the vet event', deliveries.length >= 1, JSON.stringify(redactValue(deliveries)));
}

/* ---------------------------------------------------- step 6: NGO reads the vetted grant */

{
  const r = await functionPost(stack, 'discovery-allowance', { organizationId, action: 'read' }, ngoAccessToken);
  recordHttp('discovery-allowance-read-2', 'POST', r.url, r.status, r.json);
  record('j', 'discovery-allowance now reports the vetted grant (30)', r.status === 200 && r.json.dailyGrant === 30 && r.json.vetted === true, `status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);
}

/* -------------------------------------------------------------------- step 7: unvet the org */

let unvetNotificationEventId = '';
{
  const r = await functionPost(
    stack,
    'set-organization-vetting',
    { organizationId, action: 'unvet', note: 'Registry entry expired; unvetting during the AI4DEV-102 live drive.' },
    adminAccessToken,
  );
  recordHttp('set-organization-vetting-unvet', 'POST', r.url, r.status, r.json);
  unvetNotificationEventId = String(r.json.notificationEventId ?? '');
  record('k1', 'set-organization-vetting (unvet) answers 200 vetted=false', r.status === 200 && r.json.vetted === false, `status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);

  const rows = await readRows(
    sql,
    'org_vetting (after unvet)',
    sql`select org_id, vetted, vetted_by_account_id, note from public.org_vetting where org_id = ${organizationId}::uuid`,
  );
  record('k2', 'org_vetting aggregate now reads vetted=false', rows[0]?.vetted === false, JSON.stringify(redactValue(rows[0] ?? null)));

  const audits = await readRows(
    sql,
    'audit_events (unvet)',
    sql`select id, event_kind, actor_account_id, subject_org_id, reason
          from public.audit_events where event_kind = 'org_vetting_changed' and subject_org_id = ${organizationId}::uuid order by occurred_at`,
  );
  record('k3', 'audit_events carries a second (unvet) row', audits.length >= 2, JSON.stringify(redactValue(audits.map((a) => a.id))));

  const notifications = await readRows(
    sql,
    'notification_events (unvet)',
    sql`select id, event, actor_account_id, state from public.notification_events where id = ${unvetNotificationEventId || '00000000-0000-0000-0000-000000000000'}::uuid`,
  );
  record('k4', 'a second notification_events row exists for the unvet outcome', notifications.length === 1 && notifications[0]?.id !== vetNotificationEventId, JSON.stringify(redactValue(notifications[0] ?? null)));
}

/* ---------------------------------------------------------------------------- refusals */

// (l) The NGO itself attempts the vetting route.
{
  const r = await functionPost(
    stack,
    'set-organization-vetting',
    { organizationId, action: 'unvet', note: 'the NGO trying the platform-administrator route' },
    ngoAccessToken,
  );
  recordHttp('vetting-refusal-not-admin', 'POST', r.url, r.status, r.json);
  const namesPlatformAdmins = typeof r.json.reason === 'string' && /platform administrator/i.test(r.json.reason);
  record('l', 'NGO attempting vetting is refused, naming the platform administrator', r.status >= 400 && r.json.kind === 'not-a-platform-admin' && namesPlatformAdmins, `status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);
}

// (m) A debit larger than the remaining allowance.
{
  const readAnswer = await functionPost(stack, 'discovery-allowance', { organizationId, action: 'read' }, ngoAccessToken);
  const remaining = Number(readAnswer.json.remaining ?? 0);
  const r = await functionPost(stack, 'discovery-allowance', { organizationId, action: 'debit', credits: remaining + 1 }, ngoAccessToken);
  recordHttp('allowance-refusal-exceeds-remaining', 'POST', r.url, r.status, r.json);
  record('m', 'a debit larger than what remains is refused as debit-exceeds-remaining', r.status >= 400 && r.json.kind === 'debit-exceeds-remaining', `remaining was ${remaining}; status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);
}

// (n) Spend the whole remaining grant, then debit one more credit.
{
  const readAnswer = await functionPost(stack, 'discovery-allowance', { organizationId, action: 'read' }, ngoAccessToken);
  const remaining = Number(readAnswer.json.remaining ?? 0);
  if (remaining > 0) {
    const drain = await functionPost(stack, 'discovery-allowance', { organizationId, action: 'debit', credits: remaining }, ngoAccessToken);
    recordHttp('allowance-drain-remaining', 'POST', drain.url, drain.status, drain.json);
    record('n1', 'draining the remaining allowance answers 200 with remaining 0', drain.status === 200 && drain.json.remaining === 0, `drained ${remaining}; status ${drain.status}: ${JSON.stringify(redactValue(drain.json))}`);
  } else {
    record('n1', 'the allowance was already fully spent', true, 'remaining was already 0');
  }
  const r = await functionPost(stack, 'discovery-allowance', { organizationId, action: 'debit', credits: 1 }, ngoAccessToken);
  recordHttp('allowance-refusal-exhausted', 'POST', r.url, r.status, r.json);
  const reason = String(r.json.reason ?? '');
  const namesThreeRemedies = ['get vetted', 'fund project fuel', 'wait for the next UTC day'].every((remedy) => reason.includes(remedy));
  record('n2', 'one more credit is refused as daily-allowance-exhausted, naming three remedies', r.status >= 400 && r.json.kind === 'daily-allowance-exhausted' && namesThreeRemedies, `status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);
}

await sql.close();

/* -------------------------------------------------------------------------- the artifact */

function flush(): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'transcript.json'),
    JSON.stringify({ ranAt: new Date().toISOString(), ngoEmail, adminEmail, orgName, organizationId, checks, transcript }, null, 2),
  );
  console.log(`\nevidence: ${join(outDir, 'transcript.json')}`);
}

flush();
const failed = checks.filter((c) => c.outcome === 'fail');
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length === 0 && checks.length > 0 ? 0 : 1);
