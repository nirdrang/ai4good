// Unit 5 prototype measurement (R3): with the refusal trigger guarded by WHEN (pg_trigger_depth() = 0),
// does a direct DELETE /auth/v1/user/identities/{id} still refuse, and does the vendor's admin user
// delete (DELETE /auth/v1/admin/users/{id}), whose cascade removes the identity rows, still succeed?
// Creates throwaway users and a throwaway trigger, then drops the trigger.
// Run: bun loop/items/AI4DEV-56/artifacts/measure/unlink-depth-probe.ts
const API = 'http://127.0.0.1:44321';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const DB = 'supabase_db_poancmeitlmxejofwzuu';
const stamp = Date.now();
const password = 'correct horse battery staple';

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
const log = (step: string, r: { status: number; body: string }) => console.log(`${step}: HTTP ${r.status} ${r.body.slice(0, 200)}`);

async function volunteerWithGithub(tag: string): Promise<{ userId: string; token: string; githubIdentityId: string }> {
  const email = `depth-probe-${tag}-${stamp}@example.invalid`;
  const handle = `depth-probe-${tag}-${stamp}`;
  const created = await call('/auth/v1/admin/users', { method: 'POST', bearer: SERVICE, body: JSON.stringify({ email, password, email_confirm: true }) });
  const userId = (JSON.parse(created.body) as { id: string }).id;
  await psql(`insert into public.accounts (id, account_type) values ('${userId}', 'volunteer')`);
  await psql(`insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values (gen_random_uuid(), '${handle}', '${userId}', '{"sub":"${handle}","user_name":"${handle}","provider_id":"${handle}"}'::text::jsonb, 'github', now(), now(), now())`);
  const grant = await call('/auth/v1/token?grant_type=password', { method: 'POST', bearer: ANON, body: JSON.stringify({ email, password }) });
  const token = (JSON.parse(grant.body) as { access_token: string }).access_token;
  const me = await call('/auth/v1/user', { method: 'GET', bearer: token });
  const identities = (JSON.parse(me.body) as { identities: { identity_id: string; provider: string }[] }).identities;
  return { userId, token, githubIdentityId: identities.find((i) => i.provider === 'github')!.identity_id };
}

console.log(`probe ${new Date().toISOString()}`);
const trigger = await psql(`create or replace function public.probe_depth_refuse() returns trigger language plpgsql security definer set search_path = '' as $$ begin raise notice 'probe trigger body sees pg_trigger_depth() = %', pg_trigger_depth(); if old.provider = 'github' and exists (select 1 from public.accounts a where a.id = old.user_id and a.account_type = 'volunteer') then raise exception 'probe: a volunteer may not unlink the GitHub identity' using errcode = '42501', detail = 'github-unlink-refused'; end if; return old; end $$; create trigger probe_depth_refuse before delete on auth.identities for each row when (pg_trigger_depth() = 0) execute function public.probe_depth_refuse();`);
console.log(`1 created trigger guarded by WHEN (pg_trigger_depth() = 0): ${trigger || 'ok'}`);

const a = await volunteerWithGithub('direct');
log('2 direct DELETE of the github identity as the user', await call(`/auth/v1/user/identities/${a.githubIdentityId}`, { method: 'DELETE', bearer: a.token }));
console.log(`   rows left for user by provider: ${await psql(`select string_agg(provider, ',' order by provider) from auth.identities where user_id='${a.userId}'`)}`);
log('3 GET /user after the refused delete', { ...(await call('/auth/v1/user', { method: 'GET', bearer: a.token })), body: '' });

const b = await volunteerWithGithub('cascade');
console.log(`4 second volunteer ${b.userId} identities before admin delete: ${await psql(`select string_agg(provider, ',' order by provider) from auth.identities where user_id='${b.userId}'`)}`);
log('5 admin DELETE /auth/v1/admin/users/{id} (cascade through auth.identities)', await call(`/auth/v1/admin/users/${b.userId}`, { method: 'DELETE', bearer: SERVICE }));
console.log(`   auth.users rows for that id: ${await psql(`select count(*) from auth.users where id='${b.userId}'`)}; auth.identities rows: ${await psql(`select count(*) from auth.identities where user_id='${b.userId}'`)}; public.accounts rows: ${await psql(`select count(*) from public.accounts where id='${b.userId}'`)}`);

console.log(`6 operator direct delete of the first volunteer's github row (depth 0 as postgres): ${await psql(`delete from auth.identities where user_id='${a.userId}' and provider='github'`)}`);
console.log(`7 operator delete of the first volunteer's auth.users row (cascade): ${await psql(`delete from auth.users where id='${a.userId}'`)}`);
console.log(`   identities left: ${await psql(`select count(*) from auth.identities where user_id='${a.userId}'`)}`);

console.log(`8 drop the probe trigger and function: ${await psql('drop trigger if exists probe_depth_refuse on auth.identities; drop function if exists public.probe_depth_refuse();') || 'ok'}`);
