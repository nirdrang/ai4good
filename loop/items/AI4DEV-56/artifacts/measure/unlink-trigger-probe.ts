// Measurement for unit 5's design: on this stack, does DELETE /auth/v1/user/identities/{id} unlink a
// fabricated GitHub identity, and what does GoTrue answer when a BEFORE DELETE trigger on
// auth.identities raises? Creates one throwaway user and a throwaway trigger, then drops the trigger.
// Run: bun loop/items/AI4DEV-56/artifacts/measure/unlink-trigger-probe.ts
const API = 'http://127.0.0.1:44321';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const DB = 'supabase_db_poancmeitlmxejofwzuu';
const email = `unlink-probe-${Date.now()}@example.invalid`;
const password = 'correct horse battery staple';
const handle = `unlink-probe-${Date.now()}`;

async function call(path: string, init: RequestInit & { bearer?: string }): Promise<{ status: number; body: string }> {
  const headers: Record<string, string> = { 'content-type': 'application/json', apikey: init.bearer === SERVICE ? SERVICE : ANON };
  if (init.bearer) headers.Authorization = `Bearer ${init.bearer}`;
  const r = await fetch(`${API}${path}`, { ...init, headers });
  return { status: r.status, body: await r.text() };
}
async function psql(sqlText: string): Promise<string> {
  const proc = Bun.spawn(['docker', 'exec', DB, 'psql', '-U', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sqlText], { stdout: 'pipe', stderr: 'pipe' });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  return (out + err).trim();
}
const log = (step: string, r: { status: number; body: string }) => console.log(`${step}: HTTP ${r.status} ${r.body.slice(0, 300)}`);

console.log(`probe ${new Date().toISOString()} user ${email}`);
const created = await call('/auth/v1/admin/users', { method: 'POST', bearer: SERVICE, body: JSON.stringify({ email, password, email_confirm: true }) });
const userId = (JSON.parse(created.body) as { id: string }).id;
console.log(`1 admin create user: HTTP ${created.status} id ${userId}`);
await psql(`insert into public.accounts (id, account_type) values ('${userId}', 'volunteer')`);
console.log('2 operator inserted public.accounts row of type volunteer');

const insertIdentity = async () => psql(`insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values (gen_random_uuid(), '${handle}', '${userId}', '{"sub":"${handle}","user_name":"${handle}","provider_id":"${handle}"}'::text::jsonb, 'github', now(), now(), now())`);
console.log(`3 operator inserted a github identity: ${await insertIdentity()}`);

const grant = await call('/auth/v1/token?grant_type=password', { method: 'POST', bearer: ANON, body: JSON.stringify({ email, password }) });
const token = (JSON.parse(grant.body) as { access_token: string }).access_token;
const me = await call('/auth/v1/user', { method: 'GET', bearer: token });
const identities = (JSON.parse(me.body) as { identities: { identity_id: string; provider: string }[] }).identities;
console.log(`4 GET /user: HTTP ${me.status}; identities ${JSON.stringify(identities.map((i) => ({ provider: i.provider, identity_id: i.identity_id })))}`);
const githubIdentityId = () => identities.find((i) => i.provider === 'github')!.identity_id;

log('5 DELETE github identity with NO trigger, as the user', await call(`/auth/v1/user/identities/${githubIdentityId()}`, { method: 'DELETE', bearer: token }));
console.log(`   rows left for user by provider: ${await psql(`select string_agg(provider, ',') from auth.identities where user_id='${userId}'`)}`);

console.log(`6 re-insert the github identity: ${await insertIdentity()}`);
const me2 = await call('/auth/v1/user', { method: 'GET', bearer: token });
const identities2 = (JSON.parse(me2.body) as { identities: { identity_id: string; provider: string }[] }).identities;
const gh2 = identities2.find((i) => i.provider === 'github')!.identity_id;

const trigger = await psql(`create or replace function public.probe_refuse_volunteer_github_unlink() returns trigger language plpgsql security definer set search_path = '' as $$ begin if old.provider = 'github' and exists (select 1 from public.accounts a where a.id = old.user_id and a.account_type = 'volunteer') then raise exception 'probe: a volunteer may not unlink the GitHub identity' using errcode = '42501'; end if; return old; end $$; create trigger probe_refuse_volunteer_github_unlink before delete on auth.identities for each row execute function public.probe_refuse_volunteer_github_unlink();`);
console.log(`7 created BEFORE DELETE trigger on auth.identities as postgres: ${trigger || 'ok'}`);

log('8 DELETE github identity WITH the trigger, as the user', await call(`/auth/v1/user/identities/${gh2}`, { method: 'DELETE', bearer: token }));
console.log(`   rows left for user by provider: ${await psql(`select string_agg(provider, ',') from auth.identities where user_id='${userId}'`)}`);
log('9 GET /user after the refused delete (is Auth still healthy for this user)', { ...(await call('/auth/v1/user', { method: 'GET', bearer: token })), body: '' });
log('10 DELETE with no token', await call(`/auth/v1/user/identities/${gh2}`, { method: 'DELETE' }));

console.log(`11 drop the probe trigger and function: ${await psql('drop trigger probe_refuse_volunteer_github_unlink on auth.identities; drop function public.probe_refuse_volunteer_github_unlink();') || 'ok'}`);
console.log(`12 auth log tail for this user id (docker logs, last lines mentioning the request):`);
const logs = Bun.spawn(['docker', 'logs', '--since', '2m', 'supabase_auth_poancmeitlmxejofwzuu'], { stdout: 'pipe', stderr: 'pipe' });
const text = (await new Response(logs.stdout).text()) + (await new Response(logs.stderr).text());
for (const line of text.split('\n').filter((l) => l.includes('identities') || l.includes('probe:'))) console.log(`   ${line.slice(0, 400)}`);
