import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../supabase/functions/_shared/acknowledgment-copy.ts';

const PROJECT_TITLE = 'Volunteer scheduling';
const PROJECT_DESCRIPTION = 'We coordinate 45 volunteers across three community kitchens. Scheduling takes four hours each week.';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`set ${name}`);
  return value;
}

const url = env('SUPABASE_URL').replace(/\/+$/, '');
const anonKey = env('SUPABASE_ANON_KEY');
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
const email = env('PREVIEW_NGO_EMAIL');
const password = env('PREVIEW_NGO_PASSWORD');

async function call(path: string, init: { method?: string; key: string; bearer?: string; body?: unknown }) {
  const response = await fetch(`${url}${path}`, {
    method: init.method ?? 'POST',
    headers: { apikey: init.key, authorization: `Bearer ${init.bearer ?? init.key}`, 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await response.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: response.status, json: json as Record<string, unknown> };
}

function expectOk(label: string, answer: { status: number; json: Record<string, unknown> }) {
  if (answer.status >= 400) throw new Error(`${label} answered ${answer.status}: ${JSON.stringify(answer.json)}`);
  return answer.json;
}

const created = await call('/auth/v1/admin/users', { key: serviceKey, body: { email, password, email_confirm: true } });
if (created.status >= 400 && created.status !== 422) expectOk('creating the NGO user', created);

const login = expectOk('signing in', await call('/auth/v1/token?grant_type=password', { key: anonKey, body: { email, password } }));
const bearer = String(login.access_token);
const accountId = String((login.user as { id: string }).id);

const memberships = expectOk('reading memberships', await call(`/rest/v1/org_memberships?account_id=eq.${accountId}&select=org_id`, { method: 'GET', key: serviceKey })) as unknown as { org_id: string }[];
let organizationId = memberships[0]?.org_id;
if (!organizationId) {
  const completed = expectOk('completing signup', await call('/functions/v1/complete-signup', { key: anonKey, bearer, body: {
    accountType: 'ngo', organizationName: 'Harbor Community Kitchen', acknowledgmentTextVersion: 'tos-2026-01+promise-2026-01',
    signerName: 'Dana Okonkwo', signerTitle: 'Executive Director', authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
  } }));
  organizationId = String(completed.organizationId);
}

const projects = expectOk('reading projects', await call(`/rest/v1/projects?org_id=eq.${organizationId}&name=eq.${encodeURIComponent(PROJECT_TITLE)}&select=id`, { method: 'GET', key: anonKey, bearer })) as unknown as { id: string }[];
let projectId = projects[0]?.id;
if (!projectId) {
  const started = expectOk('starting the need', await call('/functions/v1/project-need', { key: anonKey, bearer, body: {
    action: 'start', organizationId, title: PROJECT_TITLE, description: PROJECT_DESCRIPTION,
  } }));
  projectId = String((started.need as { projectId: string }).projectId);
}
expectOk('submitting the need', await call('/functions/v1/project-need', { key: anonKey, bearer, body: { action: 'submit', organizationId, projectId } }));

console.log(`Sign in as ${email}`);
console.log(`Discovery: /discovery/${organizationId}/${projectId}`);
