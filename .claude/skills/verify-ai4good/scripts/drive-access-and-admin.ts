/**
 * verify-ai4good — the access and platform-administration drive.
 *
 *   bun .claude/skills/verify-ai4good/scripts/drive-access-and-admin.ts [outDir]
 *
 * Drives the REAL user path on the local stack: three NGO accounts (A, B, C) through signup,
 * the confirmation link, sign-in and `complete-signup`; one volunteer-path user (V) through
 * signup, confirmation and sign-in only; and one platform administrator (admin users API plus
 * the operator insert, because no product surface provisions one). Then, in order: the
 * volunteer GitHub gate refusals, create-organization and update-organization with their
 * refusals, a project need started through `project-need`, the three tenant reads with their
 * byte-identical 404s and the token-free public page, the catalog posture (policies, anon
 * grants, the public-page function's execute grant), the three platform-admin operations with
 * their audit rows, and the append-only proof on `audit_events`. Writes a REDACTED transcript to
 * `outDir` (default `loop/verify-evidence/<timestamp>/`) and exits 0 only when every check passed.
 *
 * Run it from the repo root, with the stack up (`bun run db:start`) and reset
 * (`bun run db:reset`) for an evidence-grade run. Mind the auth email rate limit
 * (`[auth.rate_limit] email_sent`, see features/email-signup-and-confirmation.md): this drive
 * sends four confirmation emails, so restart the stack before an evidence-grade run.
 *
 * Two states are operator setup and the transcript says so where they happen: the platform
 * administrator's account row, and one project with no need row (every product-created project
 * starts with a draft need, and a draft need keeps the public page at 404).
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

import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

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

function recordCall(name: string, method: string, url: string, requestBody: unknown, status: number, body: unknown): void {
  transcript.push({
    step: name,
    request: { method, url: redactUrl(url), body: redactValue(requestBody) },
    response: { status, body: redactValue(body) },
  });
}

function parseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function brief(value: unknown, length = 300): string {
  return JSON.stringify(redactValue(value)).slice(0, length);
}

async function readRows(sql: ReturnType<typeof sqlClient>, label: string, rowsPromise: Promise<unknown>): Promise<Record<string, unknown>[]> {
  const list = (await rowsPromise) as Record<string, unknown>[];
  transcript.push({ step: `readback ${label}`, rows: redactValue(list) });
  return list;
}

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

const api = stack.apiUrl.replace(/\/$/, '');
const stamp = Date.now();
const password = `Verify-Drill-${stamp}!`;
const emails = {
  a: `verify-access-a-${stamp}@example.com`,
  b: `verify-access-b-${stamp}@example.com`,
  c: `verify-access-c-${stamp}@example.com`,
  v: `verify-access-v-${stamp}@example.com`,
  admin: `verify-access-admin-${stamp}@example.com`,
};
const orgNames = {
  a: `Verify Access Org A ${stamp}`,
  b: `Verify Access Org B ${stamp}`,
  c: `Verify Access Org C ${stamp}`,
  second: `Second Org ${stamp}`,
  renamed: `Renamed ${stamp}`,
  publicFixture: `Public Fixture ${stamp}`,
};
let aOrgId = '';
let bOrgId = '';
let cOrgId = '';
let secondOrgId = '';
let projectId = '';
let publicProjectId = '';
const ABSENT_UUID = '00000000-0000-4000-8000-000000000000';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const TENANT_NOT_FOUND_BODY = '{"ok":false,"reason":"no such thing is visible to this caller"}';
const PROJECT_NOT_PUBLIC_BODY = '{"ok":false,"reason":"no such project page is public"}';

{
  const url = `${api}/auth/v1/health`;
  const health = await readJson(url);
  recordHttp('doctor-auth-health', 'GET', url, health.status, parseBody(health.text));
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

const sql = sqlClient(stack);

async function signIn(label: string, email: string): Promise<string> {
  const r = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
  recordHttp(`signin-${label}`, 'POST', r.url, r.status, r.json);
  const token = String(r.json.access_token ?? '');
  if (!token) fatal(`${label} could not sign in (status ${r.status})`);
  return token;
}

async function signUpConfirmed(label: string, email: string): Promise<{ accessToken: string; accountId: string }> {
  const signup = await authPost(stack, '/auth/v1/signup', { email, password });
  recordHttp(`signup-${label}`, 'POST', signup.url, signup.status, signup.json);
  if (signup.status !== 200 || 'access_token' in signup.json) {
    fatal(`signup for ${label} answered ${signup.status} (access_token present: ${'access_token' in signup.json})`);
  }

  const links = await verifyLinksFor(stack, email, 'signup');
  const link = links[0] ?? null;
  transcript.push({ step: `confirmation-link-${label}`, link: link ? redactUrl(link) : null });
  if (!link) fatal(`no confirmation email for ${label} after 20s (auth email rate limit? see features/email-signup-and-confirmation.md)`);
  const followed = await followLink(link);
  transcript.push({ step: `verify-redirect-${label}`, status: followed.status, location: redactUrl(followed.location) });
  if (!(followed.status >= 300 && followed.status < 400)) fatal(`confirmation for ${label} did not redirect (status ${followed.status})`);

  const signedIn = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
  recordHttp(`signin-${label}`, 'POST', signedIn.url, signedIn.status, signedIn.json);
  const accessToken = String(signedIn.json.access_token ?? '');
  const accountId = String((signedIn.json.user as { id?: string } | undefined)?.id ?? '');
  if (!accessToken || !accountId) fatal(`sign-in for ${label} produced no token or id (status ${signedIn.status})`);
  return { accessToken, accountId };
}

async function completeNgo(label: string, accessToken: string, organizationName: string): Promise<string> {
  const body = {
    accountType: 'ngo',
    organizationName,
    acknowledgmentTextVersion: 'tos-platform-promise-v1',
    signerName: 'Verify Drill',
    signerTitle: 'Automated verifier',
    authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
  };
  const r = await functionPost(stack, 'complete-signup', body, accessToken);
  recordCall(`complete-signup-ngo-${label}`, 'POST', r.url, body, r.status, r.json);
  const organizationId = String(r.json.organizationId ?? '');
  if (r.status !== 200 || !organizationId) fatal(`complete-signup for ${label} answered ${r.status} and named no organisation`);
  return organizationId;
}

async function call(name: string, fn: string, body: unknown, bearer: string): Promise<{ status: number; json: Record<string, unknown>; text: string }> {
  const r = await functionPostRaw(stack, fn, body, bearer);
  const json = parseBody(r.text);
  recordCall(name, 'POST', r.url, body, r.status, json);
  return { status: r.status, json: typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : {}, text: r.text };
}

async function authUser(name: string, bearer: string): Promise<{ status: number; json: unknown }> {
  const url = `${api}/auth/v1/user`;
  const response = await fetch(url, { headers: { apikey: stack.anonKey, Authorization: `Bearer ${bearer}` } });
  const json = parseBody(await response.text());
  recordHttp(name, 'GET', url, response.status, json);
  return { status: response.status, json };
}

async function publicProjectWithoutToken(name: string, body: unknown): Promise<{ status: number; text: string }> {
  const url = `${api}/functions/v1/public-project`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { apikey: stack.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  transcript.push({
    step: name,
    request: { method: 'POST', url: redactUrl(url), headers: ['apikey'], body: redactValue(body) },
    response: { status: response.status, body: redactValue(parseBody(text)) },
  });
  return { status: response.status, text };
}

async function auditCountForOrg(organizationId: string): Promise<number> {
  const rows = (await sql`select count(*)::int as n from public.audit_events where subject_org_id = ${organizationId}::uuid`) as { n: number }[];
  return Number(rows[0]?.n ?? -1);
}

const a = await signUpConfirmed('A', emails.a);
aOrgId = await completeNgo('A', a.accessToken, orgNames.a);
const b = await signUpConfirmed('B', emails.b);
bOrgId = await completeNgo('B', b.accessToken, orgNames.b);
const c = await signUpConfirmed('C', emails.c);
cOrgId = await completeNgo('C', c.accessToken, orgNames.c);
const v = await signUpConfirmed('V', emails.v);
record('setup', 'A, B, C completed NGO signup with one organisation each; V signed up, confirmed and signed in only', true, `A ${aOrgId}, B ${bOrgId}, C ${cOrgId}, V account ${v.accountId}`);

let adminAccountId = '';
{
  transcript.push({
    step: 'provision-platform-admin-note',
    note: 'The platform administrator bypasses the user path: complete-signup refuses the platform_admin type by design and no product surface provisions one. The auth user comes from the admin users API with email_confirm true; the accounts row is written by the operator over DB_URL; sign-in is the real password grant.',
  });
  const created = await fetch(`${api}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: stack.serviceRoleKey,
      Authorization: `Bearer ${stack.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: emails.admin, password, email_confirm: true }),
  });
  const createdJson = (await created.json().catch(() => ({}))) as { id?: string };
  recordHttp('provision-platform-admin', 'POST', `${api}/auth/v1/admin/users`, created.status, createdJson);
  adminAccountId = String(createdJson.id ?? '');
  if (created.status >= 400 || !adminAccountId) fatal(`platform administrator provisioning answered ${created.status} and named no user id`);

  await sql`insert into public.accounts (id, account_type) values (${adminAccountId}::uuid, 'platform_admin')`;
  const rows = await readRows(sql, 'accounts (admin)', sql`select id, account_type from public.accounts where id = ${adminAccountId}::uuid`);
  record('setup-admin', 'platform administrator provisioned (admin users API + operator accounts row)', rows[0]?.account_type === 'platform_admin', brief(rows[0] ?? null));
}

{
  const vToken = await signIn('V-for-1', emails.v);

  const plain = await call('volunteer-gate-no-github', 'complete-signup', { accountType: 'volunteer' }, vToken);
  record('1a', 'complete-signup (volunteer, no linked GitHub) answers 400 naming the linked GitHub account', plain.status === 400 && String(plain.json.reason ?? '').includes('linked GitHub account'), `status ${plain.status}: ${brief(plain.json)}`);

  const withOrg = await call('volunteer-gate-with-org-name', 'complete-signup', { accountType: 'volunteer', organizationName: 'X' }, vToken);
  record('1b', 'complete-signup (volunteer with an organisation name) answers 400 naming the organisation name', withOrg.status === 400 && String(withOrg.json.reason ?? '').includes('organisation name'), `status ${withOrg.status}: ${brief(withOrg.json)}`);

  const counts = await readRows(
    sql,
    'V rows',
    sql`select
          (select count(*)::int from public.accounts where id = ${v.accountId}::uuid) as accounts,
          (select count(*)::int from public.volunteer_profiles where account_id = ${v.accountId}::uuid) as volunteer_profiles,
          (select count(*)::int from public.acknowledgments where account_id = ${v.accountId}::uuid) as acknowledgments`,
  );
  const row = counts[0];
  record('1c', 'V has no accounts, volunteer_profiles or acknowledgments row', row?.accounts === 0 && row?.volunteer_profiles === 0 && row?.acknowledgments === 0, brief(row ?? null));

  const triggers = await readRows(
    sql,
    'pg_trigger volunteer_github_identity_is_permanent',
    sql`select tgname, tgrelid::regclass::text as relation from pg_trigger where tgname = 'volunteer_github_identity_is_permanent' and tgrelid = 'auth.identities'::regclass`,
  );
  record('1d', 'pg_trigger holds volunteer_github_identity_is_permanent on auth.identities', triggers.length === 1, brief(triggers));
}

{
  const aToken = await signIn('A-for-2', emails.a);
  const vToken = await signIn('V-for-2', emails.v);

  const created = await call('create-organization', 'create-organization', { name: orgNames.second }, aToken);
  secondOrgId = String(created.json.organizationId ?? '');
  record('2a', 'create-organization answers 200 with an organisation id', created.status === 200 && secondOrgId !== '', `status ${created.status}: ${brief(created.json)}`);
  if (!secondOrgId) fatal('create-organization named no organisation');

  const orgs = await readRows(sql, 'organizations (second)', sql`select id, name from public.organizations where id = ${secondOrgId}::uuid`);
  record('2b', 'organizations row exists with the driven name', orgs[0]?.name === orgNames.second, brief(orgs[0] ?? null));

  const seats = await readRows(sql, 'org_memberships (second)', sql`select account_id, role from public.org_memberships where org_id = ${secondOrgId}::uuid`);
  record('2c', 'org_memberships row: A holds role admin', seats.length === 1 && seats[0]?.account_id === a.accountId && seats[0]?.role === 'admin', brief(seats));

  const audits = await readRows(sql, 'audit_events (second org)', sql`select id, event_kind, reason from public.audit_events where subject_org_id = ${secondOrgId}::uuid`);
  record('2d', 'exactly one audit_events row for the organisation: org_role_changed, membership granted', audits.length === 1 && audits[0]?.event_kind === 'org_role_changed' && audits[0]?.reason === 'membership granted', brief(audits));

  const blank = await call('create-organization-blank-name', 'create-organization', { name: '   ' }, aToken);
  record('2e', 'a blank name is refused 400 invalid-name', blank.status === 400 && blank.json.kind === 'invalid-name', `status ${blank.status}: ${brief(blank.json)}`);

  const noAccount = await call('create-organization-no-account', 'create-organization', { name: 'X' }, vToken);
  record('2f', 'V (no completed signup) is refused 409 no-account', noAccount.status === 409 && noAccount.json.kind === 'no-account', `status ${noAccount.status}: ${brief(noAccount.json)}`);
}

{
  const aToken = await signIn('A-for-3', emails.a);
  const auditsBefore = await auditCountForOrg(aOrgId);

  const renamed = await call('update-organization', 'update-organization', { organizationId: aOrgId, name: orgNames.renamed }, aToken);
  record('3a', 'update-organization on the caller\'s own organisation answers 200', renamed.status === 200, `status ${renamed.status}: ${brief(renamed.json)}`);

  const rows = await readRows(sql, 'organizations (A renamed)', sql`select id, name from public.organizations where id = ${aOrgId}::uuid`);
  const auditsAfter = await auditCountForOrg(aOrgId);
  transcript.push({ step: 'readback audit_events count (A org)', before: auditsBefore, after: auditsAfter });
  record('3b', 'organizations name changed and the audit_events count for the organisation is unchanged', rows[0]?.name === orgNames.renamed && auditsBefore === auditsAfter, `name ${brief(rows[0]?.name ?? null)}, audit count ${auditsBefore} -> ${auditsAfter}`);

  const foreign = await call('update-organization-foreign', 'update-organization', { organizationId: bOrgId, name: 'Hijacked' }, aToken);
  record('3c', 'A renaming B\'s organisation is refused 403 not-a-member', foreign.status === 403 && foreign.json.kind === 'not-a-member', `status ${foreign.status}: ${brief(foreign.json)}`);

  const bRows = await readRows(sql, 'organizations (B unchanged)', sql`select id, name from public.organizations where id = ${bOrgId}::uuid`);
  record('3d', 'B\'s organisation name is unchanged', bRows[0]?.name === orgNames.b, brief(bRows[0] ?? null));

  const missing = await call('update-organization-missing-id', 'update-organization', { name: 'No target' }, aToken);
  record('3e', 'a missing organizationId is refused 400 invalid-request', missing.status === 400 && missing.json.kind === 'invalid-request', `status ${missing.status}: ${brief(missing.json)}`);

  const malformed = await call('update-organization-malformed-id', 'update-organization', { organizationId: 'not-a-uuid', name: 'No target' }, aToken);
  record('3f', 'a malformed organizationId is refused 400 invalid-request', malformed.status === 400 && malformed.json.kind === 'invalid-request', `status ${malformed.status}: ${brief(malformed.json)}`);

  const blank = await call('update-organization-blank-name', 'update-organization', { organizationId: aOrgId, name: '   ' }, aToken);
  record('3g', 'a blank name is refused 400 invalid-name', blank.status === 400 && blank.json.kind === 'invalid-name', `status ${blank.status}: ${brief(blank.json)}`);
}

{
  const aToken = await signIn('A-for-4', emails.a);
  const started = await call('project-need-start', 'project-need', { organizationId: aOrgId, action: 'start', title: 'Access drill need', urgency: 'soon' }, aToken);
  const need = started.json.need as Record<string, unknown> | undefined;
  projectId = String(need?.projectId ?? '');
  record('4a', 'project-need start on A\'s organisation answers 200 with a project id', started.status === 200 && projectId !== '', `status ${started.status}: ${brief(started.json)}`);
  if (!projectId) fatal('project-need start named no project id');

  const rows = await readRows(sql, 'projects (started)', sql`select id, org_id, name, assigned_volunteer_id from public.projects where id = ${projectId}::uuid`);
  record('4b', 'projects row belongs to A\'s organisation with no assigned volunteer', rows[0]?.org_id === aOrgId && rows[0]?.assigned_volunteer_id === null, brief(rows[0] ?? null));
}

{
  const aToken = await signIn('A-for-5', emails.a);
  const bToken = await signIn('B-for-5', emails.b);
  const vToken = await signIn('V-for-5', emails.v);

  const own = await call('organization-dashboard-A', 'organization-dashboard', { organizationId: aOrgId }, aToken);
  const seats = (own.json.seats as { accountId?: string; role?: string }[] | undefined) ?? [];
  const projects = (own.json.projects as { projectId?: string }[] | undefined) ?? [];
  const ok =
    own.status === 200 &&
    own.json.organizationName === orgNames.renamed &&
    seats.some((seat) => seat.accountId === a.accountId && seat.role === 'admin') &&
    projects.some((project) => project.projectId === projectId);
  record('5a', 'organization-dashboard as A answers 200 with the name, A\'s admin seat and the project', ok, `status ${own.status}: ${brief(own.json, 400)}`);

  const foreign = await call('organization-dashboard-B-on-A', 'organization-dashboard', { organizationId: aOrgId }, bToken);
  record('5b', 'organization-dashboard as B on A\'s organisation answers 404 with the one tenant refusal', foreign.status === 404 && foreign.text === TENANT_NOT_FOUND_BODY, `status ${foreign.status}: ${redactString(foreign.text)}`);

  const absent = await call('organization-dashboard-B-absent', 'organization-dashboard', { organizationId: ABSENT_UUID }, bToken);
  record('5c', 'an absent organisation id answers 404 with bytes identical to the foreign refusal', absent.status === 404 && absent.text === foreign.text, `status ${absent.status}: ${redactString(absent.text)}`);

  transcript.push({
    step: 'prediction organization-dashboard as V',
    source: 'resolveCaller (edge.ts) accepts any live token, so V is a caller; callerReads then selects as V under organizations_select_org_member and organizations_select_platform_admin (viewer_is_org_member reads org_memberships for auth.uid(), V holds none; V has no accounts row so it is no platform admin); zero rows is TENANT_NOT_FOUND in tenant-reads.ts',
    expected: 404,
  });
  const noAccount = await call('organization-dashboard-V', 'organization-dashboard', { organizationId: aOrgId }, vToken);
  record('5d', 'organization-dashboard as V (no account row) answers 404 with the one tenant refusal, as the source predicts', noAccount.status === 404 && noAccount.text === TENANT_NOT_FOUND_BODY, `status ${noAccount.status}: ${redactString(noAccount.text)}`);
}

{
  const aToken = await signIn('A-for-6', emails.a);
  const bToken = await signIn('B-for-6', emails.b);

  const own = await call('project-workspace-A', 'project-workspace', { projectId }, aToken);
  record('6a', 'project-workspace as A answers 200 naming A\'s organisation and no assigned volunteer', own.status === 200 && own.json.organizationId === aOrgId && own.json.assignedVolunteerId === null, `status ${own.status}: ${brief(own.json)}`);

  const foreign = await call('project-workspace-B', 'project-workspace', { projectId }, bToken);
  record('6b', 'project-workspace as B answers 404 with the one tenant refusal', foreign.status === 404 && foreign.text === TENANT_NOT_FOUND_BODY, `status ${foreign.status}: ${redactString(foreign.text)}`);

  const absent = await call('project-workspace-B-absent', 'project-workspace', { projectId: ABSENT_UUID }, bToken);
  record('6c', 'an absent project id answers 404 with bytes identical to the foreign refusal', absent.status === 404 && absent.text === foreign.text, `status ${absent.status}: ${redactString(absent.text)}`);
}

{
  transcript.push({
    step: 'operator-setup-public-project-note',
    note: 'A project with no need row is operator setup over DB_URL: every product-created project starts with a draft need, and projectIsPublic (public-project.ts) requires need_stage null, so no product path reaches a 200 public page today.',
  });
  const inserted = await readRows(sql, 'projects (public fixture insert)', sql`insert into public.projects (org_id, name) values (${aOrgId}::uuid, ${orgNames.publicFixture}) returning id, org_id, name`);
  publicProjectId = String(inserted[0]?.id ?? '');
  if (!publicProjectId) fatal('the public fixture project insert returned no id');

  const bToken = await signIn('B-for-7', emails.b);

  const open = await publicProjectWithoutToken('public-project-no-token', { projectId: publicProjectId });
  const body = parseBody(open.text);
  const keys = typeof body === 'object' && body !== null ? Object.keys(body).sort() : [];
  const exactKeys = JSON.stringify(keys) === JSON.stringify(['ok', 'organizationName', 'projectId', 'projectName']);
  record('7a', 'public-project without a token answers 200 with exactly ok, projectId, projectName, organizationName', open.status === 200 && exactKeys, `status ${open.status}, keys ${JSON.stringify(keys)}: ${redactString(open.text)}`);

  const withToken = await call('public-project-B-token', 'public-project', { projectId: publicProjectId }, bToken);
  record('7b', 'public-project with B\'s token answers bytes identical to the token-free answer', withToken.status === 200 && withToken.text === open.text, `status ${withToken.status}: ${redactString(withToken.text)}`);

  const draft = await publicProjectWithoutToken('public-project-draft-need', { projectId });
  record('7c', 'the need-intake project answers 404 no such project page is public', draft.status === 404 && draft.text === PROJECT_NOT_PUBLIC_BODY, `status ${draft.status}: ${redactString(draft.text)}`);

  const absent = await publicProjectWithoutToken('public-project-absent', { projectId: ABSENT_UUID });
  record('7d', 'an absent project id answers 404 with bytes identical to the draft-need refusal', absent.status === 404 && absent.text === draft.text, `status ${absent.status}: ${redactString(absent.text)}`);
}

{
  const policies = await readRows(
    sql,
    'pg_policies (tenant tables)',
    sql`select tablename, policyname, roles::text[] as roles, cmd
          from pg_policies
         where schemaname = 'public' and tablename in ('organizations', 'org_memberships', 'projects', 'acknowledgments')
         order by tablename, policyname`,
  );
  const tables = new Set(policies.map((policy) => String(policy.tablename)));
  const everyPolicyAuthenticatedSelect = policies.every((policy) => {
    const roles = policy.roles as string[];
    return roles.length === 1 && roles[0] === 'authenticated' && policy.cmd === 'SELECT';
  });
  record('8a', 'every policy on organizations, org_memberships, projects, acknowledgments is SELECT to {authenticated}', tables.size === 4 && everyPolicyAuthenticatedSelect, `${policies.length} policies over ${[...tables].join(', ')}`);

  const anonGrants = await readRows(
    sql,
    'has_table_privilege anon select (every public table)',
    sql`select table_name, has_table_privilege('anon', format('%I.%I', table_schema, table_name), 'select') as anon_select
          from information_schema.tables
         where table_schema = 'public' and table_type = 'BASE TABLE'
         order by table_name`,
  );
  const leaking = anonGrants.filter((row) => row.anon_select === true).map((row) => String(row.table_name));
  record('8b', 'anon holds select on no public table', anonGrants.length > 0 && leaking.length === 0, leaking.length === 0 ? `${anonGrants.length} tables, none readable by anon` : `anon can select: ${leaking.join(', ')}`);

  const fn = await readRows(
    sql,
    'has_function_privilege read_public_project',
    sql`select has_function_privilege('anon', 'public.read_public_project(uuid)', 'execute') as anon,
                has_function_privilege('authenticated', 'public.read_public_project(uuid)', 'execute') as authenticated,
                has_function_privilege('service_role', 'public.read_public_project(uuid)', 'execute') as service_role`,
  );
  const grants = fn[0];
  record('8c', 'read_public_project executes for service_role only', grants?.anon === false && grants?.authenticated === false && grants?.service_role === true, brief(grants ?? null));
}

{
  const adminToken = await signIn('admin-for-9', emails.admin);
  const aToken = await signIn('A-for-9', emails.a);

  const first = await call('set-escalation-contact-1', 'set-escalation-contact', { organizationId: aOrgId, name: 'Maya Lindqvist', email: 'maya@example.test', phone: ' ' }, adminToken);
  record('9a', 'set-escalation-contact as the administrator answers 200', first.status === 200, `status ${first.status}: ${brief(first.json)}`);

  const rows = await readRows(sql, 'org_escalation_contacts (A org)', sql`select org_id, contact_name, contact_email, contact_phone, recorded_by_account_id from public.org_escalation_contacts where org_id = ${aOrgId}::uuid`);
  record('9b', 'org_escalation_contacts row carries the name and a null phone', rows[0]?.contact_name === 'Maya Lindqvist' && rows[0]?.contact_phone === null && rows[0]?.recorded_by_account_id === adminAccountId, brief(rows[0] ?? null));

  const second = await call('set-escalation-contact-2', 'set-escalation-contact', { organizationId: aOrgId, name: 'Jonas Berg', email: 'jonas@example.test' }, adminToken);
  record('9c', 'a second escalation contact answers 200', second.status === 200, `status ${second.status}: ${brief(second.json)}`);

  const audits = await readRows(
    sql,
    'audit_events (escalation contact)',
    sql`select id, event_kind, actor_account_id, jsonb_typeof(detail->'previous') = 'object' as has_previous, detail->'current'->>'name' as current_name
          from public.audit_events
         where event_kind = 'org_escalation_contact_recorded' and subject_org_id = ${aOrgId}::uuid
         order by occurred_at`,
  );
  const latest = audits[audits.length - 1];
  record('9d', 'the second org_escalation_contact_recorded audit row carries a non-null previous contact', audits.length === 2 && latest?.has_previous === true && latest?.current_name === 'Jonas Berg' && latest?.actor_account_id === adminAccountId, brief(audits));

  const notAdmin = await call('set-escalation-contact-not-admin', 'set-escalation-contact', { organizationId: aOrgId, name: 'Maya Lindqvist', email: 'maya@example.test' }, aToken);
  record('9e', 'A (an NGO account) is refused 403 not-a-platform-admin', notAdmin.status === 403 && notAdmin.json.kind === 'not-a-platform-admin', `status ${notAdmin.status}: ${brief(notAdmin.json)}`);

  const badEmail = await call('set-escalation-contact-bad-email', 'set-escalation-contact', { organizationId: aOrgId, name: 'Maya Lindqvist', email: 'not-an-email' }, adminToken);
  record('9f', 'an email that is not an address is refused 400 invalid-contact', badEmail.status === 400 && badEmail.json.kind === 'invalid-contact', `status ${badEmail.status}: ${brief(badEmail.json)}`);

  const noOrg = await call('set-escalation-contact-no-org', 'set-escalation-contact', { organizationId: NIL_UUID, name: 'Maya Lindqvist', email: 'maya@example.test' }, adminToken);
  record('9g', 'an organisation that does not exist is refused 409 no-such-organisation', noOrg.status === 409 && noOrg.json.kind === 'no-such-organisation', `status ${noOrg.status}: ${brief(noOrg.json)}`);
}

{
  const adminToken = await signIn('admin-for-10', emails.admin);
  const request = { organizationId: aOrgId, fromAccountId: a.accountId, toAccountId: b.accountId, reason: 'planned handover' };

  const transferred = await call('transfer-organization-contact', 'transfer-organization-contact', request, adminToken);
  record('10a', 'transfer-organization-contact from A to B answers 200', transferred.status === 200 && transferred.json.organizationId === aOrgId, `status ${transferred.status}: ${brief(transferred.json)}`);

  const seats = await readRows(sql, 'org_memberships (A org after transfer)', sql`select account_id, role from public.org_memberships where org_id = ${aOrgId}::uuid`);
  record('10b', 'A\'s organisation seat is now held by B as admin', seats.length === 1 && seats[0]?.account_id === b.accountId && seats[0]?.role === 'admin', brief(seats));

  const remaining = await readRows(sql, 'org_memberships (A everywhere)', sql`select org_id, role from public.org_memberships where account_id = ${a.accountId}::uuid order by org_id`);
  const remainingIds = remaining.map((row) => String(row.org_id));
  record('10c', 'A keeps exactly the second organisation\'s seat', remainingIds.length === 1 && remainingIds[0] === secondOrgId, brief(remaining));

  const lifecycle = await readRows(sql, 'accounts (A lifecycle)', sql`select id, lifecycle from public.accounts where id = ${a.accountId}::uuid`);
  const audits = await readRows(
    sql,
    'audit_events (contact transferred)',
    sql`select id, actor_account_id, subject_account_id, reason, detail->>'deactivated' as deactivated, detail->'remaining_seats' as remaining_seats, detail->>'to_account_id' as to_account_id
          from public.audit_events
         where event_kind = 'org_contact_transferred' and subject_org_id = ${aOrgId}::uuid
         order by occurred_at`,
  );
  const audit = audits[audits.length - 1];
  const expectedDeactivated = remainingIds.length === 0;
  const auditMatchesSeats =
    audits.length === 1 &&
    audit?.deactivated === String(expectedDeactivated) &&
    JSON.stringify(audit?.remaining_seats) === JSON.stringify(remainingIds) &&
    audit?.to_account_id === b.accountId &&
    audit?.actor_account_id === adminAccountId &&
    audit?.subject_account_id === a.accountId &&
    audit?.reason === 'planned handover';
  const lifecycleMatches = lifecycle[0]?.lifecycle === (expectedDeactivated ? 'deactivated' : 'active');
  record('10d', 'the org_contact_transferred audit row says deactivated exactly when A has no seat left, and A\'s lifecycle agrees', auditMatchesSeats && lifecycleMatches, `A has ${remainingIds.length} seat(s) left; audit deactivated=${String(audit?.deactivated)}; lifecycle ${String(lifecycle[0]?.lifecycle)}`);

  const replay = await call('transfer-organization-contact-replay', 'transfer-organization-contact', request, adminToken);
  record('10e', 'replaying the identical transfer is refused 409 not-the-current-contact', replay.status === 409 && replay.json.kind === 'not-the-current-contact', `status ${replay.status}: ${brief(replay.json)}`);
}

{
  const adminToken = await signIn('admin-for-11', emails.admin);
  const cToken = await signIn('C-for-11', emails.c);
  const aToken = await signIn('A-for-11', emails.a);
  const lifecycleAudits = async (): Promise<number> => {
    const rows = (await sql`select count(*)::int as n from public.audit_events where event_kind = 'account_lifecycle_changed' and subject_account_id = ${c.accountId}::uuid`) as { n: number }[];
    return Number(rows[0]?.n ?? -1);
  };

  const deactivated = await call('set-account-lifecycle-deactivate', 'set-account-lifecycle', { accountId: c.accountId, lifecycle: 'deactivated', reason: 'AUP' }, adminToken);
  record('11a', 'set-account-lifecycle deactivated answers 200 changed true', deactivated.status === 200 && deactivated.json.changed === true, `status ${deactivated.status}: ${brief(deactivated.json)}`);

  const rows = await readRows(sql, 'accounts (C deactivated)', sql`select id, lifecycle from public.accounts where id = ${c.accountId}::uuid`);
  const auditsAfterFirst = await lifecycleAudits();
  transcript.push({ step: 'readback audit_events count (C lifecycle)', afterDeactivate: auditsAfterFirst });
  record('11b', 'C\'s accounts row reads deactivated with one lifecycle audit row', rows[0]?.lifecycle === 'deactivated' && auditsAfterFirst === 1, `${brief(rows[0] ?? null)}, audit rows ${auditsAfterFirst}`);

  const repeated = await call('set-account-lifecycle-deactivate-again', 'set-account-lifecycle', { accountId: c.accountId, lifecycle: 'deactivated', reason: 'AUP' }, adminToken);
  const auditsAfterRepeat = await lifecycleAudits();
  transcript.push({ step: 'readback audit_events count (C lifecycle)', afterRepeat: auditsAfterRepeat });
  record('11c', 'repeating the deactivation answers 200 changed false and adds no audit row', repeated.status === 200 && repeated.json.changed === false && auditsAfterRepeat === auditsAfterFirst, `status ${repeated.status}: ${brief(repeated.json)}; audit rows ${auditsAfterFirst} -> ${auditsAfterRepeat}`);

  const write = await call('create-organization-deactivated', 'create-organization', { name: 'X' }, cToken);
  record('11d', 'C (deactivated) attempting create-organization is refused 403 account-deactivated', write.status === 403 && write.json.kind === 'account-deactivated', `status ${write.status}: ${brief(write.json)}`);

  const session = await authUser('auth-user-C-deactivated', cToken);
  record('11e', 'C\'s session is still valid at GET /auth/v1/user (200)', session.status === 200, `status ${session.status}`);

  const reactivated = await call('set-account-lifecycle-reactivate', 'set-account-lifecycle', { accountId: c.accountId, lifecycle: 'active', reason: 're-enable' }, adminToken);
  record('11f', 'set-account-lifecycle active answers 200 changed true', reactivated.status === 200 && reactivated.json.changed === true, `status ${reactivated.status}: ${brief(reactivated.json)}`);

  const self = await call('set-account-lifecycle-self', 'set-account-lifecycle', { accountId: adminAccountId, lifecycle: 'deactivated', reason: 'self' }, adminToken);
  record('11g', 'an administrator changing its own lifecycle is refused 400 invalid-request', self.status === 400 && self.json.kind === 'invalid-request', `status ${self.status}: ${brief(self.json)}`);

  const notAdmin = await call('set-account-lifecycle-not-admin', 'set-account-lifecycle', { accountId: c.accountId, lifecycle: 'deactivated', reason: 'AUP' }, aToken);
  record('11h', 'A (an NGO account) is refused 403 not-a-platform-admin', notAdmin.status === 403 && notAdmin.json.kind === 'not-a-platform-admin', `status ${notAdmin.status}: ${brief(notAdmin.json)}`);
}

{
  const sqlstateOf = (err: unknown): string => {
    const carrier = err as { errno?: unknown; cause?: { errno?: unknown } };
    return String(carrier.errno ?? carrier.cause?.errno ?? '');
  };

  let updateState = '';
  try {
    await sql`update public.audit_events set reason = 'tampered'`;
    transcript.push({ step: 'audit_events update attempt', outcome: 'no error raised' });
  } catch (err) {
    updateState = sqlstateOf(err);
    transcript.push({ step: 'audit_events update attempt', outcome: 'error', code: updateState });
  }
  record('12a', 'updating audit_events is refused with SQLSTATE 42501', updateState === '42501', `sqlstate ${updateState || '(none — no error raised)'}`);

  let deleteState = '';
  try {
    await sql`delete from public.audit_events`;
    transcript.push({ step: 'audit_events delete attempt', outcome: 'no error raised' });
  } catch (err) {
    deleteState = sqlstateOf(err);
    transcript.push({ step: 'audit_events delete attempt', outcome: 'error', code: deleteState });
  }
  record('12b', 'deleting from audit_events is refused with SQLSTATE 42501', deleteState === '42501', `sqlstate ${deleteState || '(none — no error raised)'}`);
}

await sql.close();

function flush(): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'transcript.json'),
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        emails,
        organizations: { a: aOrgId, b: bOrgId, c: cOrgId, second: secondOrgId },
        projects: { needIntake: projectId, publicFixture: publicProjectId },
        checks,
        transcript,
      },
      null,
      2,
    ),
  );
  console.log(`\nevidence: ${join(outDir, 'transcript.json')}`);
}

flush();
const failed = checks.filter((check) => check.outcome === 'fail');
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length === 0 && checks.length > 0 ? 0 : 1);
