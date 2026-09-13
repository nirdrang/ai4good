/**
 * verify-ai4good — the need intake drive.
 *
 *   bun .claude/skills/verify-ai4good/scripts/drive-need-intake.ts [outDir]
 *
 * Drives the REAL user path on the local stack, past NGO signup: starting a project need,
 * reading it back, the submission gate, autosave (save, no-op save, re-read), attaching a
 * reference file, the Tier-2 disclosure upgrade and its monotonic guard, submit and its audit
 * snapshot, a re-submit no-op, a post-submit edit that leaves the snapshot untouched, and four
 * refusals (no-such-need, invalid-request, unauthenticated, missing-description gate). Writes a
 * REDACTED transcript to `outDir` (default `loop/verify-evidence/<timestamp>/`) and exits 0
 * only when every check passed.
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
// The shipped Tier-2 copy, imported so the drive checks the exact disclosure the server sends.
import { REFERENCE_FILE_DISCLOSURE } from '../../../../supabase/functions/_shared/need-intake-copy.ts';

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
const ngoEmail = `verify-need-${stamp}@example.com`;
const secondNgoEmail = `verify-need-second-${stamp}@example.com`;
const password = `Verify-Drill-${stamp}!`;
const orgName = `Verify Need Intake Org ${stamp}`;
const secondOrgName = `Verify Need Intake Org Two ${stamp}`;

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

async function signUpConfirmedNgo(email: string, name: string): Promise<{ accessToken: string; accountId: string; organizationId: string }> {
  const signup = await authPost(stack, '/auth/v1/signup', { email, password });
  recordHttp(`ngo-signup-${email}`, 'POST', signup.url, signup.status, signup.json);
  if (signup.status !== 200) throw new Error(`signup for ${email} answered ${signup.status}`);

  const links = await verifyLinksFor(stack, email, 'signup');
  const link = links[0] ?? null;
  transcript.push({ step: `ngo-confirmation-link-${email}`, link: link ? redactUrl(link) : null });
  if (!link) throw new Error(`no confirmation email for ${email}`);
  const followed = await followLink(link);
  transcript.push({ step: `ngo-verify-redirect-${email}`, status: followed.status, location: redactUrl(followed.location) });
  if (!(followed.status >= 300 && followed.status < 400)) throw new Error(`confirmation for ${email} did not redirect`);

  const signedIn = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
  recordHttp(`ngo-signin-${email}`, 'POST', signedIn.url, signedIn.status, signedIn.json);
  const accessToken = String(signedIn.json.access_token ?? '');
  const accountId = String((signedIn.json.user as { id?: string } | undefined)?.id ?? '');
  if (!accessToken || !accountId) throw new Error(`sign-in for ${email} produced no token or id`);

  const completed = await functionPost(
    stack,
    'complete-signup',
    {
      accountType: 'ngo',
      organizationName: name,
      acknowledgmentTextVersion: 'tos-platform-promise-v1',
      signerName: 'Verify Drill',
      signerTitle: 'Automated verifier',
      authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
    },
    accessToken,
  );
  recordHttp(`complete-signup-ngo-${email}`, 'POST', completed.url, completed.status, completed.json);
  const organizationId = String(completed.json.organizationId ?? '');
  if (!organizationId) throw new Error(`complete-signup for ${email} named no organisation`);

  return { accessToken, accountId, organizationId };
}

let ngoAccessToken = '';
let ngoAccountId = '';
let organizationId = '';
{
  try {
    const ngo = await signUpConfirmedNgo(ngoEmail, orgName);
    ngoAccessToken = ngo.accessToken;
    ngoAccountId = ngo.accountId;
    organizationId = ngo.organizationId;
    record('setup', 'NGO admin signed up, confirmed and completed', true, `organizationId ${organizationId}`);
  } catch (err) {
    fatal((err as Error).message);
  }
}

/* ------------------------------------------------------------- step n1: start the need */

let projectId = '';
{
  const r = await functionPost(
    stack,
    'project-need',
    { organizationId, action: 'start', title: 'Grant deadline tracker', urgency: 'soon' },
    ngoAccessToken,
  );
  recordHttp('project-need-start', 'POST', r.url, r.status, r.json);
  const need = r.json.need as Record<string, unknown> | undefined;
  const upload = need?.upload as { disclosure?: { level?: string } } | undefined;
  const ok =
    r.status === 200 &&
    r.json.ok === true &&
    r.json.changed === true &&
    need?.stage === 'draft' &&
    need?.description === null &&
    Array.isArray(need?.causeLabels) &&
    (need!.causeLabels as unknown[]).length === 0 &&
    upload?.disclosure?.level === 'base';
  record('n1', 'project-need start answers a fresh draft with a base disclosure', ok, `status ${r.status}: ${JSON.stringify(redactValue(r.json)).slice(0, 300)}`);
  projectId = String(need?.projectId ?? '');
  if (!projectId) fatal('project-need start named no project id');

  const rows = await readRows(
    sql,
    'need_intakes (after start)',
    sql`select n.*, p.name as project_name from public.need_intakes n join public.projects p on p.id = n.project_id where n.project_id = ${projectId}::uuid`,
  );
  record('n1-readback', 'need_intakes row exists for the new project', rows.length === 1 && rows[0]?.stage === 'draft', JSON.stringify(redactValue(rows[0] ?? null)));
}

/* -------------------------------------------------------------- step n2: need-intake read */

{
  const r = await functionPost(stack, 'need-intake', { projectId }, ngoAccessToken);
  recordHttp('need-intake-read-1', 'POST', r.url, r.status, r.json);
  const need = r.json.need as Record<string, unknown> | undefined;
  const ok = r.status === 200 && r.json.ok === true && need?.stage === 'draft' && need?.description === null && need?.projectId === projectId;
  record('n2', 'need-intake read answers the same draft need', ok, `status ${r.status}: ${JSON.stringify(redactValue(r.json)).slice(0, 300)}`);
}

/* ---------------------------------------------------------- step n3: public page is 404 */

{
  const r = await functionPostRaw(stack, 'public-project', { projectId }, null);
  recordHttp('public-project-draft', 'POST', r.url, r.status, r.text);
  let body: unknown = r.text;
  try {
    body = JSON.parse(r.text);
  } catch {
    /* keep raw text */
  }
  record('n3', 'public-project answers 404 for a draft need', r.status === 404, `status ${r.status}: ${JSON.stringify(redactValue(body)).slice(0, 200)}`);
}

/* -------------------------------------------------------- step n4: submit gate refuses */

{
  const r = await functionPost(stack, 'project-need', { organizationId, action: 'submit', projectId }, ngoAccessToken);
  recordHttp('project-need-submit-refused', 'POST', r.url, r.status, r.json);
  record('n4', 'project-need submit is refused as missing-description', r.status === 409 && r.json.kind === 'missing-description', `status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);

  const rows = await readRows(sql, 'need_intakes (still draft)', sql`select project_id, stage from public.need_intakes where project_id = ${projectId}::uuid`);
  record('n4-readback', 'need_intakes stage is still draft', rows[0]?.stage === 'draft', JSON.stringify(redactValue(rows[0] ?? null)));
}

/* --------------------------------------------------------------------- step n5: save */

const description = '  We miss reporting deadlines.\n  Staff need a shared view.  ';
let firstSaveUpdatedAt = '';
{
  const r = await functionPost(stack, 'project-need', { organizationId, action: 'save', projectId, patch: { description } }, ngoAccessToken);
  recordHttp('project-need-save-1', 'POST', r.url, r.status, r.json);
  const need = r.json.need as Record<string, unknown> | undefined;
  firstSaveUpdatedAt = String(need?.updatedAt ?? '');
  record('n5', 'project-need save keeps the description exactly as typed', r.status === 200 && r.json.changed === true && need?.description === description, `status ${r.status}: ${JSON.stringify(redactValue(r.json)).slice(0, 300)}`);
  if (!firstSaveUpdatedAt) fatal('save did not name an updatedAt');
}

/* -------------------------------------------------------------- step n6: save no-op */

{
  const r = await functionPost(stack, 'project-need', { organizationId, action: 'save', projectId, patch: { description } }, ngoAccessToken);
  recordHttp('project-need-save-2-noop', 'POST', r.url, r.status, r.json);
  const need = r.json.need as Record<string, unknown> | undefined;
  record('n6', 'the same save answers changed:false with the same updatedAt', r.status === 200 && r.json.changed === false && need?.updatedAt === firstSaveUpdatedAt, `status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);
}

/* ---------------------------------------------------------------- step n7: attach */

{
  const r = await functionPost(
    stack,
    'project-need',
    { organizationId, action: 'attach', projectId, file: { fileName: 'grants-tracker.csv', mediaType: 'text/csv', byteSize: 4096, description: 'Sample rows' } },
    ngoAccessToken,
  );
  recordHttp('project-need-attach', 'POST', r.url, r.status, r.json);
  const need = r.json.need as Record<string, unknown> | undefined;
  const files = (need?.referenceFiles as Record<string, unknown>[] | undefined) ?? [];
  const upload = need?.upload as { disclosure?: { level?: string } } | undefined;
  const ok = r.status === 200 && files.length === 1 && files[0]?.addedByAccountId === ngoAccountId && upload?.disclosure?.level === 'base';
  record('n7', 'project-need attach adds one reference file at base disclosure', ok, `status ${r.status}: ${JSON.stringify(redactValue(r.json)).slice(0, 300)}`);
}

/* -------------------------------------------------------- step n8: Tier-2 classification */

{
  await sql`update public.need_intakes set tier2_classified_at = now() where project_id = ${projectId}::uuid`;
  const rows = await readRows(sql, 'need_intakes (tier2 classified)', sql`select project_id, tier2_classified_at from public.need_intakes where project_id = ${projectId}::uuid`);
  record('n8-classify', 'the operator classifies the project Tier 2', rows[0]?.tier2_classified_at !== null, JSON.stringify(redactValue(rows[0] ?? null)));

  const r = await functionPost(stack, 'need-intake', { projectId }, ngoAccessToken);
  recordHttp('need-intake-read-2-tier2', 'POST', r.url, r.status, r.json);
  const need = r.json.need as Record<string, unknown> | undefined;
  const upload = need?.upload as { disclosure?: { level?: string; acknowledgmentRequired?: boolean; acknowledgment?: string } } | undefined;
  const ok =
    r.status === 200 &&
    upload?.disclosure?.level === 'tier2-hardened' &&
    upload?.disclosure?.acknowledgmentRequired === true &&
    upload?.disclosure?.acknowledgment === REFERENCE_FILE_DISCLOSURE.tier2Hardened.acknowledgment;
  record('n8', 'need-intake reports the Tier-2 hardened disclosure and acknowledgment', ok, `status ${r.status}: ${JSON.stringify(redactValue(r.json)).slice(0, 400)}`);
}

/* --------------------------------------------------------- step n9: the monotonic guard */

{
  let sqlstate = '';
  try {
    await sql`update public.need_intakes set tier2_classified_at = null where project_id = ${projectId}::uuid`;
    transcript.push({ step: 'tier2-unclassify-attempt', outcome: 'no error raised' });
  } catch (err) {
    const carrier = err as { errno?: unknown; cause?: { errno?: unknown } };
    sqlstate = String(carrier.errno ?? carrier.cause?.errno ?? '');
    transcript.push({ step: 'tier2-unclassify-attempt', outcome: 'error', code: sqlstate });
  }
  record('n9', 'clearing tier2_classified_at is refused by the monotonic trigger (42501)', sqlstate === '42501', `sqlstate ${sqlstate || '(none — no error raised)'}`);
}

/* --------------------------------------------------------------------- step n10: submit */

let submittedAt = '';
{
  const r = await functionPost(stack, 'project-need', { organizationId, action: 'submit', projectId }, ngoAccessToken);
  recordHttp('project-need-submit', 'POST', r.url, r.status, r.json);
  const need = r.json.need as Record<string, unknown> | undefined;
  submittedAt = String(need?.submittedAt ?? '');
  const ok = r.status === 200 && r.json.changed === true && need?.stage === 'discovery_in_progress' && submittedAt !== '' && need?.updatedAt === submittedAt;
  record('n10', 'project-need submit moves the need to discovery_in_progress', ok, `status ${r.status}: ${JSON.stringify(redactValue(r.json)).slice(0, 300)}`);
  if (!submittedAt) fatal('submit did not name a submittedAt');

  const rows = await readRows(sql, 'need_intakes (after submit)', sql`select project_id, stage, submitted_at, updated_at from public.need_intakes where project_id = ${projectId}::uuid`);
  record('n10-readback', 'need_intakes row now carries the submitted stage', rows[0]?.stage === 'discovery_in_progress', JSON.stringify(redactValue(rows[0] ?? null)));

  const audits = await readRows(
    sql,
    'audit_events (submit)',
    sql`select id, detail from public.audit_events where event_kind = 'need_intake_submitted' and detail->>'project_id' = ${projectId}`,
  );
  const detail = audits[0]?.detail as Record<string, unknown> | undefined;
  const refFiles = (detail?.reference_files as unknown[] | undefined) ?? [];
  const auditOk = audits.length === 1 && detail?.description === description && refFiles.length === 1;
  record('n10-audit', 'exactly one audit_events row carries the description and one reference file', auditOk, JSON.stringify(redactValue({ count: audits.length, description: detail?.description, referenceFileCount: refFiles.length })));
}

/* -------------------------------------------------------------- step n11: re-submit no-op */

{
  const r = await functionPost(stack, 'project-need', { organizationId, action: 'submit', projectId }, ngoAccessToken);
  recordHttp('project-need-submit-again', 'POST', r.url, r.status, r.json);
  record('n11', 'submitting again answers changed:false', r.status === 200 && r.json.changed === false, `status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);

  const audits = await readRows(
    sql,
    'audit_events (after re-submit)',
    sql`select id from public.audit_events where event_kind = 'need_intake_submitted' and detail->>'project_id' = ${projectId}`,
  );
  record('n11-audit', 'the audit readback still holds exactly one row', audits.length === 1, JSON.stringify(redactValue(audits.map((a) => a.id))));
}

/* ------------------------------------------------------- step n12: post-submit edit */

{
  const r = await functionPost(stack, 'project-need', { organizationId, action: 'save', projectId, patch: { description: 'Edited after Discovery began' } }, ngoAccessToken);
  recordHttp('project-need-save-post-submit', 'POST', r.url, r.status, r.json);
  record('n12', 'a post-submit save still answers changed:true', r.status === 200 && r.json.changed === true, `status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);

  const audits = await readRows(
    sql,
    'audit_events (after post-submit edit)',
    sql`select id, detail->>'description' as description from public.audit_events where event_kind = 'need_intake_submitted' and detail->>'project_id' = ${projectId}`,
  );
  const auditOk = audits.length === 1 && audits[0]?.description === description;
  record('n12-audit', 'the audit snapshot is unchanged by the later edit', auditOk, JSON.stringify(redactValue(audits[0] ?? null)));

  const pub = await functionPostRaw(stack, 'public-project', { projectId }, null);
  recordHttp('public-project-after-submit', 'POST', pub.url, pub.status, pub.text);
  record('n12-public', 'public-project still answers 404 after submission', pub.status === 404, `status ${pub.status}`);
}

/* ---------------------------------------------------------------------------- refusals */

// (n13) a second NGO admin saving the first project's need.
{
  let second: { accessToken: string; accountId: string; organizationId: string };
  try {
    second = await signUpConfirmedNgo(secondNgoEmail, secondOrgName);
  } catch (err) {
    fatal((err as Error).message);
  }
  const r = await functionPost(stack, 'project-need', { organizationId: second.organizationId, action: 'save', projectId, patch: { description: 'Foreign edit' } }, second.accessToken);
  recordHttp('project-need-refusal-no-such-need', 'POST', r.url, r.status, r.json);
  record('n13', 'a second NGO admin saving on the first project is refused as no-such-need', r.status === 409 && r.json.kind === 'no-such-need', `status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);
}

// (n14) an invalid project id.
{
  const r = await functionPost(stack, 'project-need', { organizationId, action: 'save', projectId: 'not-a-uuid', patch: { description: 'x' } }, ngoAccessToken);
  recordHttp('project-need-refusal-invalid-request', 'POST', r.url, r.status, r.json);
  record('n14', 'a non-uuid project id is refused as invalid-request', r.status === 400 && r.json.kind === 'invalid-request', `status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);
}

// (n15) an unauthenticated need-intake read.
{
  const r = await functionPostRaw(stack, 'need-intake', { projectId }, null);
  recordHttp('need-intake-refusal-unauthenticated', 'POST', r.url, r.status, r.text);
  let body: unknown = r.text;
  try {
    body = JSON.parse(r.text);
  } catch {
    /* keep raw text */
  }
  record('n15', 'an unauthenticated need-intake read is refused with 401', r.status === 401, `status ${r.status}: ${JSON.stringify(redactValue(body)).slice(0, 200)}`);
}

await sql.close();

/* -------------------------------------------------------------------------- the artifact */

function flush(): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'transcript.json'),
    JSON.stringify({ ranAt: new Date().toISOString(), ngoEmail, secondNgoEmail, orgName, organizationId, projectId, checks, transcript }, null, 2),
  );
  console.log(`\nevidence: ${join(outDir, 'transcript.json')}`);
}

flush();
const failed = checks.filter((c) => c.outcome === 'fail');
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length === 0 && checks.length > 0 ? 0 : 1);
