/**
 * verify-ai4good — the Discovery credits engine drive.
 *
 *   bun .claude/skills/verify-ai4good/scripts/drive-discovery.ts [outDir]
 *
 * Drives the REAL user path on the local stack, past NGO signup: a need started and submitted,
 * a JSON Discovery send, a streamed SSE send, a cancelled SSE send, a conversation read, the
 * platform-admin per-organisation Discovery switch, a funded project with no fuel, and a drained
 * daily allowance. Writes a REDACTED transcript to `outDir` (default
 * `loop/verify-evidence/<timestamp>/`) and exits 0 only when every check passed.
 *
 * Run it from the repo root, with the stack up (`bun run db:start`). This drive spends real
 * provider credits (the deployed discovery-message function needs a provider key in
 * supabase/functions/.env) — do not run it against a stack without one.
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

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

/* --------------------------------------------------------------------------- SSE helper */

type SsePart = { type: string; data?: unknown };

async function sseRequest(
  stack: Stack,
  name: string,
  body: unknown,
  bearer: string,
  opts?: { abortAfterFirstDelta?: boolean },
): Promise<{ status: number; headers: Record<string, string>; parts: SsePart[]; aborted: boolean }> {
  const url = `${stack.apiUrl.replace(/\/$/, '')}/functions/v1/${name}`;
  const controller = new AbortController();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: stack.anonKey,
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const parts: SsePart[] = [];
  let aborted = false;
  const reader = response.body?.getReader();
  if (!reader) return { status: response.status, headers, parts, aborted };
  const decoder = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const line = chunk.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        const payload = line.slice('data: '.length);
        if (payload === '[DONE]') {
          parts.push({ type: 'DONE' });
          continue;
        }
        try {
          const obj = JSON.parse(payload) as { type: string; [k: string]: unknown };
          parts.push({ type: obj.type, data: obj });
          if (obj.type === 'text-delta' && opts?.abortAfterFirstDelta && !aborted) {
            aborted = true;
            controller.abort();
            try {
              await reader.cancel();
            } catch {
              /* already aborted */
            }
            return { status: response.status, headers, parts, aborted };
          }
        } catch {
          parts.push({ type: 'unparsed', data: payload });
        }
      }
    }
  } catch (err) {
    if (!aborted) throw err;
  }
  return { status: response.status, headers, parts, aborted };
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
const ngoEmail = `verify-discovery-${stamp}@example.com`;
const adminEmail = `verify-discovery-admin-${stamp}@example.com`;
const password = `Verify-Drill-${stamp}!`;
const orgName = `Verify Discovery Org ${stamp}`;

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
    record('setup-ngo', 'NGO admin signed up, confirmed and completed', true, `organizationId ${organizationId}`);
  } catch (err) {
    fatal((err as Error).message);
  }
}

/* --------------------------------------------------------- step 2: platform administrator */

let adminAccessToken = '';
let adminAccountId = '';
{
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
  record('setup-admin1', 'admin user API mints a platform administrator account', created.status < 400 && adminAccountId !== '', `status ${created.status}, id ${adminAccountId ? 'issued' : 'missing'}`);
  if (!adminAccountId) fatal('platform administrator provisioning named no user id');

  await sql`insert into public.accounts (id, account_type) values (${adminAccountId}::uuid, 'platform_admin')`;
  const rows = await readRows(sql, 'accounts (admin)', sql`select id, account_type from public.accounts where id = ${adminAccountId}::uuid`);
  record('setup-admin2', 'accounts row: account_type=platform_admin', rows[0]?.account_type === 'platform_admin', JSON.stringify(redactValue(rows[0] ?? null)));

  const signedIn = await authPost(stack, '/auth/v1/token?grant_type=password', { email: adminEmail, password });
  recordHttp('admin-signin', 'POST', signedIn.url, signedIn.status, signedIn.json);
  adminAccessToken = String(signedIn.json.access_token ?? '');
  record('setup-admin3', 'platform administrator signs in', signedIn.status === 200 && adminAccessToken !== '', `status ${signedIn.status}, token ${adminAccessToken ? 'issued' : 'missing'}`);
  if (!adminAccessToken) fatal('platform administrator sign-in produced no access token');
}

/* -------------------------------------------------------------- step 3: two submitted needs */

async function startAndSubmitNeed(title: string): Promise<string> {
  const started = await functionPost(
    stack,
    'project-need',
    { organizationId, action: 'start', title, description: `${title} — need description for the Discovery drive.`, urgency: 'soon' },
    ngoAccessToken,
  );
  recordHttp(`project-need-start-${title}`, 'POST', started.url, started.status, started.json);
  const need = started.json.need as Record<string, unknown> | undefined;
  const projectId = String(need?.projectId ?? '');
  if (started.status !== 200 || !projectId) throw new Error(`project-need start for "${title}" answered ${started.status}`);

  const submitted = await functionPost(stack, 'project-need', { organizationId, action: 'submit', projectId }, ngoAccessToken);
  recordHttp(`project-need-submit-${title}`, 'POST', submitted.url, submitted.status, submitted.json);
  if (submitted.status !== 200) throw new Error(`project-need submit for "${title}" answered ${submitted.status}`);
  return projectId;
}

let projectId1 = '';
let projectId2 = '';
{
  try {
    projectId1 = await startAndSubmitNeed('Discovery drive need one');
    projectId2 = await startAndSubmitNeed('Discovery drive need two');
    record('setup-needs', 'both needs started and submitted into discovery_in_progress', projectId1 !== '' && projectId2 !== '', `projectId1 ${projectId1}, projectId2 ${projectId2}`);
  } catch (err) {
    fatal((err as Error).message);
  }
}

async function latestTurn(projectId: string): Promise<Record<string, unknown> | undefined> {
  const rows = await readRows(
    sql,
    `discovery_turns (latest for ${projectId})`,
    sql`select id, project_id, seq, status, billing, user_message, assistant_message, stop_reason, served_model,
               input_tokens, output_tokens, charged_credits, reserved_credits, max_output_tokens,
               request_settings->>'model' as request_settings_model
          from public.discovery_turns where project_id = ${projectId}::uuid order by seq desc limit 1`,
  );
  return rows[0];
}

async function spendRow(): Promise<Record<string, unknown> | undefined> {
  const rows = await readRows(
    sql,
    'discovery_spend (current)',
    sql`select org_id, utc_day::text as utc_day, spent, granted, granted - spent as remaining
          from public.discovery_spend where org_id = ${organizationId}::uuid
         order by utc_day desc limit 1`,
  );
  return rows[0];
}

/* --------------------------------------------------------- check 1: JSON send on unfunded */

{
  const r = await functionPost(
    stack,
    'discovery-message',
    { organizationId, projectId: projectId1, message: 'We keep missing funder reporting deadlines. Please help us scope a tracker.' },
    ngoAccessToken,
  );
  recordHttp('discovery-message-json-1', 'POST', r.url, r.status, r.json);
  const turn = r.json.turn as Record<string, unknown> | undefined;
  const reply = String(r.json.reply ?? '');
  const ok = r.status === 200 && r.json.ok === true && turn !== undefined && reply.length > 0 && r.json.allowance !== undefined;
  record('d1', 'JSON send on an unfunded project answers 200 with turn, reply and allowance', ok, `status ${r.status}: ${JSON.stringify(redactValue({ ok: r.json.ok, replyLength: reply.length, turnStatus: turn?.status, allowance: r.json.allowance }))}`);

  const row = await latestTurn(projectId1);
  const spend = await spendRow();
  const servedModel = String(row?.served_model ?? '');
  const requestSettingsModel = String(row?.request_settings_model ?? '');
  const chargedCredits = Number(row?.charged_credits ?? -1);
  const rowOk =
    row?.status === 'settled' &&
    servedModel.length > 0 &&
    (turn?.chargedCredits === undefined || Number(turn.chargedCredits) === chargedCredits) &&
    spend?.spent === chargedCredits &&
    reply.length > 0;
  record(
    'd1-readback',
    'discovery_turns is settled with a served model recorded, and discovery_spend.spent equals the charged credits',
    Boolean(rowOk),
    `served_model=${servedModel || '(none)'} request_settings.model=${requestSettingsModel || '(none)'} charged_credits=${chargedCredits} spend.spent=${spend?.spent}`,
  );
}

/* ------------------------------------------------------------- check 2: SSE send (full) */

{
  const r = await sseRequest(
    stack,
    'discovery-message',
    { organizationId, projectId: projectId1, message: 'There are two of us and we both need to see and update the same list.' },
    ngoAccessToken,
  );
  transcript.push({
    step: 'discovery-message-sse-2',
    request: { method: 'POST', url: redactUrl(`${stack.apiUrl}/functions/v1/discovery-message`) },
    response: { status: r.status, headers: r.headers, parts: redactValue(r.parts.map((p) => ({ type: p.type, data: p.data }))) },
  });

  const contentTypeOk = (r.headers['content-type'] ?? '').includes('text/event-stream');
  const uiHeaderOk = r.headers['x-vercel-ai-ui-message-stream'] === 'v1';
  record('d2-headers', 'SSE response headers carry content-type and the Vercel UI message stream header', contentTypeOk && uiHeaderOk, `content-type=${r.headers['content-type']} x-vercel-ai-ui-message-stream=${r.headers['x-vercel-ai-ui-message-stream']}`);

  const types = r.parts.map((p) => p.type);
  const dataTurnPart = r.parts.find((p) => p.type === 'data-turn');
  const dataTurnPayload = (dataTurnPart?.data as { data?: { ok?: boolean; turn?: { status?: string } } } | undefined)?.data;
  const sequenceOk =
    types.includes('text-delta') &&
    dataTurnPart !== undefined &&
    types.indexOf('text-delta') < types.indexOf('data-turn') &&
    types.includes('finish') &&
    types.indexOf('data-turn') < types.indexOf('finish') &&
    types[types.length - 1] === 'DONE';
  const settledOk = dataTurnPayload?.ok === true && dataTurnPayload?.turn?.status === 'settled';
  record('d2', 'SSE parts run text-delta, data-turn (settled, ok true), finish, [DONE]', sequenceOk && settledOk, `parts: ${types.join(' -> ')}`);

  const row = await latestTurn(projectId1);
  record('d2-readback', 'discovery_turns row for the streamed turn is settled', row?.status === 'settled', JSON.stringify(redactValue(row ?? null)));
}

/* -------------------------------------------------- check 3: SSE send, cancelled mid-stream */

{
  const before = await spendRow();
  const beforeRemaining = Number(before?.remaining ?? 0);

  const r = await sseRequest(
    stack,
    'discovery-message',
    { organizationId, projectId: projectId1, message: 'We write funder names and due dates in a shared list today, but checking it every day is easy to forget.' },
    ngoAccessToken,
    { abortAfterFirstDelta: true },
  );
  transcript.push({
    step: 'discovery-message-sse-3-cancelled',
    request: { method: 'POST', url: redactUrl(`${stack.apiUrl}/functions/v1/discovery-message`) },
    response: { status: r.status, headers: r.headers, parts: redactValue(r.parts.map((p) => ({ type: p.type, data: p.data }))), aborted: r.aborted },
  });
  record('d3-abort', 'the client aborted after the first text-delta arrived', r.aborted && r.parts.some((p) => p.type === 'text-delta'), `aborted=${r.aborted} parts=${r.parts.map((p) => p.type).join(',')}`);

  // Wait up to twenty seconds for settlement to complete through the edge runtime's background task.
  const deadline = Date.now() + 20_000;
  let row: Record<string, unknown> | undefined;
  for (;;) {
    row = await latestTurn(projectId1);
    if (row?.status !== 'open' || Date.now() >= deadline) break;
    await sleep(500);
  }
  const outputTokens = Number(row?.output_tokens ?? -1);
  const chargedCredits = Number(row?.charged_credits ?? -1);
  const maxOutputTokens = Number(row?.max_output_tokens ?? -1);
  const belowCap = Number.isFinite(outputTokens) && outputTokens < 4096;
  const settledOk = row?.status === 'settled' && row?.stop_reason === 'user_stopped' && outputTokens > 0;
  record(
    'd3',
    'the cancelled turn settles as user_stopped with output tokens and its charge debited',
    Boolean(settledOk),
    settledOk
      ? `status=${row?.status} stop_reason=${row?.stop_reason} output_tokens=${outputTokens} max_output_tokens=${maxOutputTokens} below output cap of 4096: ${belowCap} charged_credits=${chargedCredits}`
      : `row state: ${JSON.stringify(redactValue(row ?? null))}`,
  );

  const after = await spendRow();
  const afterRemaining = Number(after?.remaining ?? 0);
  const allowanceOk = settledOk && beforeRemaining - afterRemaining === chargedCredits;
  record('d3-allowance', 'the allowance dropped by exactly the cancelled turn\'s charged credits', Boolean(allowanceOk), `before remaining=${beforeRemaining} after remaining=${afterRemaining} charged_credits=${chargedCredits}`);
}

/* --------------------------------------------------------- check 4: discovery-conversation */

{
  const r = await functionPost(stack, 'discovery-conversation', { projectId: projectId1 }, ngoAccessToken);
  recordHttp('discovery-conversation-read', 'POST', r.url, r.status, r.json);
  const conversation = r.json.conversation as { turns?: unknown[] } | undefined;
  const turns = (conversation?.turns as Record<string, unknown>[] | undefined) ?? [];

  const rows = await readRows(
    sql,
    'discovery_turns (all, for conversation compare)',
    sql`select seq, status from public.discovery_turns where project_id = ${projectId1}::uuid order by seq`,
  );
  const seqOk = turns.length === rows.length && turns.every((t, i) => Number(t.seq) === Number(rows[i]?.seq));
  const ok = r.status === 200 && r.json.ok === true && seqOk && r.json.allowance !== undefined;
  record('d4', 'discovery-conversation turns are in seq order and match the rows; allowance is present', ok, `turns.length=${turns.length} rows.length=${rows.length} allowance=${JSON.stringify(redactValue(r.json.allowance))}`);
}

/* ----------------------------------------------------- check 5: the platform-admin switch */

{
  const off = await functionPost(stack, 'set-organization-discovery', { organizationId, enabled: false, reason: 'Discovery drive: disable check' }, adminAccessToken);
  recordHttp('set-organization-discovery-off', 'POST', off.url, off.status, off.json);
  record('d5-off', 'platform admin disables Discovery for the organisation', off.status === 200 && off.json.discoveryEnabled === false, `status ${off.status}: ${JSON.stringify(redactValue(off.json))}`);

  const refused = await functionPost(stack, 'discovery-message', { organizationId, projectId: projectId1, message: 'Please email both of us seven days before a report is due.' }, ngoAccessToken);
  recordHttp('discovery-message-while-disabled', 'POST', refused.url, refused.status, refused.json);
  record('d5-refused', 'a send while disabled answers 409 discovery-disabled', refused.status === 409 && refused.json.kind === 'discovery-disabled', `status ${refused.status}: ${JSON.stringify(redactValue(refused.json))}`);

  const on = await functionPost(stack, 'set-organization-discovery', { organizationId, enabled: true, reason: 'Discovery drive: re-enable check' }, adminAccessToken);
  recordHttp('set-organization-discovery-on', 'POST', on.url, on.status, on.json);
  record('d5-on', 'platform admin re-enables Discovery for the organisation', on.status === 200 && on.json.discoveryEnabled === true, `status ${on.status}: ${JSON.stringify(redactValue(on.json))}`);

  const resumed = await functionPost(stack, 'discovery-message', { organizationId, projectId: projectId1, message: 'We have no developer. We must be able to add and change dates ourselves without coding.' }, ngoAccessToken);
  recordHttp('discovery-message-after-reenable', 'POST', resumed.url, resumed.status, resumed.json);
  record('d5-resumed', 'a send after re-enabling succeeds again', resumed.status === 200 && resumed.json.ok === true, `status ${resumed.status}: ${JSON.stringify(redactValue({ ok: resumed.json.ok }))}`);

  const audits = await readRows(
    sql,
    'audit_events (org_discovery_switched)',
    sql`select id, actor_account_id, subject_org_id, reason, detail->>'enabled' as enabled
          from public.audit_events where event_kind = 'org_discovery_switched' and subject_org_id = ${organizationId}::uuid
         order by occurred_at`,
  );
  const auditsOk = audits.length === 2 && audits[0]?.enabled === 'false' && audits[1]?.enabled === 'true';
  record('d5-audit', 'audit_events carries the two org_discovery_switched rows in order', Boolean(auditsOk), JSON.stringify(redactValue(audits)));
}

/* --------------------------------------------------------------- check 6: fuel-exhausted */

{
  await sql`update public.projects set funded_at = now() where id = ${projectId2}::uuid`;
  const rows = await readRows(sql, 'projects (funded, no fuel)', sql`select id, funded_at from public.projects where id = ${projectId2}::uuid`);
  record('d6-fund', 'the operator sets funded_at on the second project', rows[0]?.funded_at !== null, JSON.stringify(redactValue(rows[0] ?? null)));

  const before = await spendRow();

  const r = await functionPost(stack, 'discovery-message', { organizationId, projectId: projectId2, message: 'This project is funded but has no fuel yet.' }, ngoAccessToken);
  recordHttp('discovery-message-fuel-exhausted', 'POST', r.url, r.status, r.json);
  const reason = String(r.json.reason ?? '');
  const ok = r.status === 409 && r.json.kind === 'fuel-exhausted' && /top up project fuel/i.test(reason);
  record('d6', 'a funded project with no fuel is refused fuel-exhausted, naming the top-up remedy', ok, `status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);

  const after = await spendRow();
  const unchanged = JSON.stringify(redactValue(before)) === JSON.stringify(redactValue(after));
  record('d6-unchanged', 'the organisation spend row is unchanged by the fuel-exhausted refusal', unchanged, `before=${JSON.stringify(redactValue(before))} after=${JSON.stringify(redactValue(after))}`);
}

/* -------------------------------------------------------- check 7: daily-allowance-exhausted */

{
  await sql`update public.discovery_spend set spent = granted
              where org_id = ${organizationId}::uuid and utc_day = (clock_timestamp() at time zone 'utc')::date`;
  const drained = await spendRow();
  const drainedRows = await readRows(sql, 'discovery_spend (drained)', Promise.resolve(drained ? [drained] : []));
  record('d7-drain', 'the operator drains the remaining allowance to zero', Number(drained?.remaining ?? -1) === 0, JSON.stringify(redactValue(drained ?? null)));
  void drainedRows;

  const r = await functionPost(stack, 'discovery-message', { organizationId, projectId: projectId1, message: 'That is everything. Please record this need.' }, ngoAccessToken);
  recordHttp('discovery-message-allowance-exhausted', 'POST', r.url, r.status, r.json);
  const reason = String(r.json.reason ?? '');
  const namesRemedies = ['get vetted', 'fund project fuel', 'wait for the next UTC day'].every((remedy) => reason.includes(remedy));
  const ok = r.status === 409 && r.json.kind === 'daily-allowance-exhausted' && namesRemedies;
  record('d7', 'a send with no allowance left is refused daily-allowance-exhausted, naming the tier remedies', ok, `status ${r.status}: ${JSON.stringify(redactValue(r.json))}`);
}

await sql.close();

/* -------------------------------------------------------------------------- the artifact */

function flush(): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'transcript.json'),
    JSON.stringify({ ranAt: new Date().toISOString(), ngoEmail, adminEmail, orgName, organizationId, projectId1, projectId2, checks, transcript }, null, 2),
  );
  console.log(`\nevidence: ${join(outDir, 'transcript.json')}`);
}

flush();
const failed = checks.filter((c) => c.outcome === 'fail');
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length === 0 && checks.length > 0 ? 0 : 1);
