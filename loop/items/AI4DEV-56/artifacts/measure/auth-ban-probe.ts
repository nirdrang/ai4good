// Measurement for the design: what a GoTrue admin ban does to a live access token, a refresh
// token, and /auth/v1/user, on the local stack this branch runs against. Creates one throwaway
// auth user through the admin API; the next integration run resets the database anyway.
// Run: bun loop/items/AI4DEV-56/artifacts/measure/auth-ban-probe.ts
const API = 'http://127.0.0.1:44321';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const email = `ban-probe-${Date.now()}@example.invalid`;
const password = 'correct horse battery staple';

async function call(path: string, init: RequestInit & { bearer?: string }): Promise<{ status: number; body: string }> {
  const headers: Record<string, string> = { 'content-type': 'application/json', apikey: init.bearer === SERVICE ? SERVICE : ANON, ...(init.headers as Record<string, string> ?? {}) };
  if (init.bearer) headers.Authorization = `Bearer ${init.bearer}`;
  const r = await fetch(`${API}${path}`, { ...init, headers });
  return { status: r.status, body: await r.text() };
}
const log = (step: string, r: { status: number; body: string }) => console.log(`${step}: HTTP ${r.status} ${r.body.slice(0, 400)}`);

console.log(`probe ${new Date().toISOString()} user ${email}`);
const created = await call('/auth/v1/admin/users', { method: 'POST', bearer: SERVICE, body: JSON.stringify({ email, password, email_confirm: true }) });
log('1 admin create user', created);
const userId = (JSON.parse(created.body) as { id: string }).id;

const grant = await call('/auth/v1/token?grant_type=password', { method: 'POST', bearer: ANON, body: JSON.stringify({ email, password }) });
log('2 password grant', { status: grant.status, body: grant.body.slice(0, 80) });
const tokens = JSON.parse(grant.body) as { access_token: string; refresh_token: string };

log('3 GET /user with live token before ban', await call('/auth/v1/user', { method: 'GET', bearer: tokens.access_token }));

log('4 admin ban (ban_duration 876000h)', await call(`/auth/v1/admin/users/${userId}`, { method: 'PUT', bearer: SERVICE, body: JSON.stringify({ ban_duration: '876000h' }) }));

log('5 GET /user with the SAME unexpired token after ban', await call('/auth/v1/user', { method: 'GET', bearer: tokens.access_token }));
log('6 refresh grant after ban', await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', bearer: ANON, body: JSON.stringify({ refresh_token: tokens.refresh_token }) }));
log('7 password grant after ban', await call('/auth/v1/token?grant_type=password', { method: 'POST', bearer: ANON, body: JSON.stringify({ email, password }) }));

log('8 admin unban (ban_duration none)', await call(`/auth/v1/admin/users/${userId}`, { method: 'PUT', bearer: SERVICE, body: JSON.stringify({ ban_duration: 'none' }) }));
log('9 GET /user with the original token after unban', await call('/auth/v1/user', { method: 'GET', bearer: tokens.access_token }));
log('10 password grant after unban', { ...(await call('/auth/v1/token?grant_type=password', { method: 'POST', bearer: ANON, body: JSON.stringify({ email, password }) })), body: '(body elided)' });
console.log(`user id ${userId}`);
