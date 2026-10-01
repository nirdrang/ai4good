/**
 * verify-ai4good — the Discovery surface without a provider key.
 *
 *   bun .claude/skills/verify-ai4good/scripts/drive-discovery-refusals.ts [outDir]
 *
 * For a stack whose functions have no provider key (no supabase/functions/.env), where
 * drive-discovery.ts cannot run. Drives, past NGO signup and a submitted need: the conversation
 * read, the discovery-message refusals that come before any model call, the discovery-scope
 * refusals and the label pass-through, and the platform-admin Discovery switch with its effect on
 * both routes. Writes a REDACTED transcript and exits 0 only when every check passed.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';

import { readLocalConfig, stackFromLocalStatus } from '../../../../tests/at/harness/local-stack.ts';
import {
  authPost,
  followLink,
  functionPost,
  mailIdentification,
  readJson,
  redactValue,
  sqlClient,
  verifyLinksFor,
  type Stack,
} from '../../../../tests/at/harness/live-stack.ts';
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

const repoRoot = resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const outDir = resolve(
  repoRoot,
  process.argv[2] ?? join('loop', 'verify-evidence', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)),
);

type Check = { id: string; title: string; passed: boolean; note: string };
const checks: Check[] = [];
const http: unknown[] = [];

function record(id: string, title: string, passed: boolean, note: string): void {
  checks.push({ id, title, passed, note });
  console.log(`${passed ? 'PASS' : 'FAIL'}  (${id}) ${title}${passed ? '' : ` — ${note}`}`);
}

function flush(): never {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'transcript.json'), JSON.stringify(redactValue({ checks, http }), null, 2));
  const passed = checks.filter((check) => check.passed).length;
  console.log(`${passed}/${checks.length} checks passed`);
  process.exit(passed === checks.length ? 0 : 1);
}

async function call(stack: Stack, name: string, body: unknown, token: string) {
  const answer = await functionPost(stack, name, body, token);
  http.push({ name, body, status: answer.status, json: answer.json });
  return answer;
}

const stack: Stack = stackFromLocalStatus(repoRoot);
const sql = sqlClient(stack);

// Doctor: auth health, the mail catcher, and the edge runtime mount of this checkout.
{
  const health = await readJson(`${stack.apiUrl.replace(/\/$/, '')}/auth/v1/health`);
  record('a', 'auth health answers', health.status === 200, `status ${health.status}`);
  try {
    record('a2', 'mail identification', true, await mailIdentification(stack));
  } catch (err) {
    record('a2', 'mail identification', false, (err as Error).message);
  }
  const projectRef = readLocalConfig(repoRoot).projectId;
  const inspect = spawnSync('docker', ['inspect', `supabase_edge_runtime_${projectRef}`, '--format', '{{json .Mounts}}'], {
    encoding: 'utf8',
  });
  const normalize = (value: string) =>
    value.replace(/\\\\/g, '/').replace(/\\/g, '/').replace(/^\/run\/desktop\/mnt\/host\/([a-z])\//i, '$1:/').toLowerCase();
  const mounts = (JSON.parse(inspect.stdout || '[]') as { Source: string }[]).map((mount) => normalize(mount.Source));
  const ours = mounts.some((source) => source.startsWith(normalize(repoRoot)) && source.endsWith('/supabase/functions'));
  record('a3', 'edge runtime mounts this checkout', ours, mounts.join(', '));
  if (checks.some((check) => !check.passed)) flush();
}

async function signUpNgo(label: string, withOrganization: boolean) {
  const email = `verify-${label}-${Date.now()}@example.com`;
  const password = `Drv-${randomBytes(18).toString('base64url')}-Aa1!`;
  await authPost(stack, '/auth/v1/signup', { email, password });
  const [link] = await verifyLinksFor(stack, email, 'signup');
  await followLink(link);
  const signIn = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
  const token = String(signIn.json.access_token);
  if (!withOrganization) return { email, password, token, organizationId: '' };
  const done = await call(stack, 'complete-signup', {
    accountType: 'ngo',
    organizationName: `Verify ${label} ${Date.now()}`,
    acknowledgmentTextVersion: 'tos-platform-promise-v1',
    signerName: 'Sam Taylor',
    signerTitle: 'Coordinator',
    authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
  }, token);
  return { email, password, token, organizationId: String(done.json.organizationId) };
}

const ngo = await signUpNgo('discovery-refusals', true);
record('setup', 'NGO admin signed up, confirmed and completed', ngo.organizationId.length > 0, ngo.organizationId);

const started = await call(stack, 'project-need', { organizationId: ngo.organizationId, action: 'start', title: 'Shift booking' }, ngo.token);
const projectId = String((started.json.need as { projectId?: string } | undefined)?.projectId ?? '');
await call(stack, 'project-need', {
  organizationId: ngo.organizationId,
  action: 'save',
  projectId,
  patch: { description: 'Volunteers book shifts by phone.' },
}, ngo.token);
const submitted = await call(stack, 'project-need', { organizationId: ngo.organizationId, action: 'submit', projectId }, ngo.token);
record('setup2', 'a need is started, described and submitted', submitted.status === 200, `status ${submitted.status}`);

const draft = await call(stack, 'project-need', { organizationId: ngo.organizationId, action: 'start', title: 'Draft need' }, ngo.token);
const draftId = String((draft.json.need as { projectId?: string } | undefined)?.projectId ?? '');

// discovery-conversation
{
  const read = await call(stack, 'discovery-conversation', { projectId }, ngo.token);
  const conversation = read.json.conversation as { turns?: unknown[]; scopes?: unknown[]; scope?: unknown } | undefined;
  const allowance = read.json.allowance as { remaining?: number; dailyGrant?: number } | null | undefined;
  record('c1', 'discovery-conversation answers 200 with no turns, no scopes and a full allowance',
    read.status === 200 && conversation?.turns?.length === 0 && Array.isArray(conversation?.scopes) &&
      conversation?.scope === null && allowance?.remaining === allowance?.dailyGrant,
    JSON.stringify(read.json).slice(0, 300));
  const foreign = await call(stack, 'discovery-conversation', { projectId: randomUUID() }, ngo.token);
  record('c2', 'an absent project answers 404 with the tenant refusal', foreign.status === 404 && !('kind' in foreign.json),
    JSON.stringify(foreign.json));
}

// discovery-message: refusals decided before any model call
{
  const long = await call(stack, 'discovery-message', { organizationId: ngo.organizationId, projectId, message: 'x'.repeat(4001) }, ngo.token);
  record('m1', 'a 4001-character message is refused 400 invalid-request', long.status === 400 && long.json.kind === 'invalid-request',
    `${long.status} ${long.json.kind}`);
  const notYet = await call(stack, 'discovery-message', { organizationId: ngo.organizationId, projectId: draftId, message: 'Hello' }, ngo.token);
  record('m2', 'a draft need is refused 409 need-not-in-discovery', notYet.status === 409 && notYet.json.kind === 'need-not-in-discovery',
    `${notYet.status} ${notYet.json.kind}`);
  const absent = await call(stack, 'discovery-message', { organizationId: ngo.organizationId, projectId: randomUUID(), message: 'Hello' }, ngo.token);
  record('m3', 'an absent project is refused 409 no-such-project', absent.status === 409 && absent.json.kind === 'no-such-project',
    `${absent.status} ${absent.json.kind}`);
  const turns = (await sql`select count(*)::int as n from public.discovery_turns where project_id in (${projectId}, ${draftId})`) as { n: number }[];
  record('m4', 'no discovery_turns row was written by the refusals', turns[0].n === 0, `rows ${turns[0].n}`);
}

// discovery-scope: refusals and the label pass-through
{
  const generate = await call(stack, 'discovery-scope', { organizationId: ngo.organizationId, projectId, action: 'generate' }, ngo.token);
  record('s1', 'generate before a complete elicitation is refused 409 elicitation-incomplete',
    generate.status === 409 && generate.json.kind === 'elicitation-incomplete', `${generate.status} ${generate.json.kind}`);
  const regenerate = await call(stack, 'discovery-scope', { organizationId: ngo.organizationId, projectId, action: 'regenerate', reason: 'try again' }, ngo.token);
  record('s2', 'regenerate with no scope is refused 409 scope-not-generated',
    regenerate.status === 409 && regenerate.json.kind === 'scope-not-generated', `${regenerate.status} ${regenerate.json.kind}`);
  const label = await call(stack, 'discovery-scope', { organizationId: ngo.organizationId, projectId, action: 'remove-label', label: 'Food Security' }, ngo.token);
  record('s3', 'remove-label of an absent label answers 200 changed:false', label.status === 200 && label.json.changed === false,
    `${label.status} ${JSON.stringify(label.json).slice(0, 200)}`);
  const unknown = await call(stack, 'discovery-scope', { organizationId: ngo.organizationId, projectId, action: 'rewrite' }, ngo.token);
  record('s4', 'an unknown action is refused 400 invalid-request', unknown.status === 400 && unknown.json.kind === 'invalid-request',
    `${unknown.status} ${unknown.json.kind}`);
  const scopes = (await sql`select count(*)::int as n from public.discovery_scopes where project_id = ${projectId}`) as { n: number }[];
  record('s5', 'no discovery_scopes row was written', scopes[0].n === 0, `rows ${scopes[0].n}`);
}

// set-organization-discovery, with the operator-provisioned platform administrator
{
  const adminEmail = `verify-admin-${Date.now()}@example.com`;
  const adminPassword = `Adm-${randomBytes(18).toString('base64url')}-Aa1!`;
  const minted = await fetch(`${stack.apiUrl.replace(/\/$/, '')}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: stack.serviceRoleKey, Authorization: `Bearer ${stack.serviceRoleKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword, email_confirm: true }),
  });
  const adminId = String(((await minted.json()) as { id?: string }).id);
  // OPERATOR SQL: a platform administrator has no product path (see features/README.md).
  await sql`insert into public.accounts (id, account_type) values (${adminId}, 'platform_admin')`;
  const adminToken = String((await authPost(stack, '/auth/v1/token?grant_type=password', { email: adminEmail, password: adminPassword })).json.access_token);
  record('d0', 'platform administrator provisioned (admin users API + operator accounts row)', adminToken.length > 20, adminId);

  const byNgo = await call(stack, 'set-organization-discovery', { organizationId: ngo.organizationId, enabled: false, reason: 'abuse report' }, ngo.token);
  record('d1', 'the NGO is refused 403 not-a-platform-admin', byNgo.status === 403 && byNgo.json.kind === 'not-a-platform-admin',
    `${byNgo.status} ${byNgo.json.kind}`);
  const off = await call(stack, 'set-organization-discovery', { organizationId: ngo.organizationId, enabled: false, reason: 'abuse report' }, adminToken);
  record('d2', 'switching Discovery off answers 200 changed:true', off.status === 200 && off.json.changed === true && off.json.discoveryEnabled === false,
    JSON.stringify(off.json));
  const again = await call(stack, 'set-organization-discovery', { organizationId: ngo.organizationId, enabled: false, reason: 'abuse report' }, adminToken);
  record('d3', 'repeating it answers 200 changed:false', again.status === 200 && again.json.changed === false, JSON.stringify(again.json));
  const message = await call(stack, 'discovery-message', { organizationId: ngo.organizationId, projectId, message: 'Hello' }, ngo.token);
  // A verified caller's send counts tokens before the reserve reads the switch. With no provider
  // key the count fails first, so discovery-disabled on this route needs drive-discovery.ts.
  record('d4', 'without a provider key, a send fails 502 at token counting before the switch is read',
    message.status === 502 && String(message.json.reason).includes('ANTHROPIC_API_KEY'),
    `${message.status} ${message.json.kind} ${message.json.reason}`);
  const scope = await call(stack, 'discovery-scope', { organizationId: ngo.organizationId, projectId, action: 'generate' }, ngo.token);
  record('d5', 'scope generate is refused 409 discovery-disabled', scope.status === 409 && scope.json.kind === 'discovery-disabled',
    `${scope.status} ${scope.json.kind}`);
  const on = await call(stack, 'set-organization-discovery', { organizationId: ngo.organizationId, enabled: true, reason: 'resolved' }, adminToken);
  record('d6', 'switching Discovery on answers 200 changed:true with disabledAt null',
    on.status === 200 && on.json.changed === true && on.json.disabledAt === null, JSON.stringify(on.json));
  const row = (await sql`select discovery_disabled_at, discovery_disabled_by, discovery_disabled_reason from public.organizations where id = ${ngo.organizationId}`) as Record<string, unknown>[];
  record('d7', 'the three switch columns are null again',
    row[0].discovery_disabled_at === null && row[0].discovery_disabled_by === null && row[0].discovery_disabled_reason === null, JSON.stringify(row[0]));
  const audit = (await sql`select actor_label, detail->>'enabled' as enabled from public.audit_events
    where event_kind = 'org_discovery_switched' and subject_org_id = ${ngo.organizationId} order by occurred_at`) as { actor_label: string; enabled: string }[];
  record('d8', 'two org_discovery_switched audit rows name the administrator',
    audit.length === 2 && audit.every((item) => item.actor_label === `platform_admin:${adminId}`),
    JSON.stringify(audit));
}

await sql.close();
flush();
