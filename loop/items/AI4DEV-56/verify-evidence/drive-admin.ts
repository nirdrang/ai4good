/**
 * verify-evidence/drive-admin.ts — a custom drive for AI4DEV-56 (admin operations, lifecycle
 * gates and audit).
 *
 *   bun loop/items/AI4DEV-56/verify-evidence/drive-admin.ts
 *
 * Drives, on the real local stack: provision a platform administrator, register and complete
 * two NGO accounts, transfer the first organisation's contact seat to the second account,
 * read back accounts / org_memberships / audit_events as the operator, deactivate the second
 * account, then prove a deactivated account is refused `create-organization`. Prints every
 * step's HTTP status and the rows it reads back. Exits 0 only when every check passed.
 */

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { readLocalConfig, stackFromLocalStatus } from '../../../../tests/at/harness/local-stack.ts';
import {
  authPost,
  followLink,
  functionPost,
  redactString,
  redactValue,
  sqlClient,
  verifyLinksFor,
  type Stack,
} from '../../../../tests/at/harness/live-stack.ts';

// The shipped attestation, imported so the drive affirms the exact statement the server accepts.
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

type Check = { id: string; title: string; outcome: 'pass' | 'fail'; note: string };
const checks: Check[] = [];

function record(id: string, title: string, passed: boolean, note: string): void {
  checks.push({ id, title, outcome: passed ? 'pass' : 'fail', note: redactString(note) });
  console.log(`${passed ? 'PASS' : 'FAIL'}  (${id}) ${title}\n        ${redactString(note)}`);
}

function fatal(message: string): never {
  console.error(`\nABORT: ${redactString(message)}`);
  finish();
  process.exit(1);
}

function finish(): void {
  const failed = checks.filter((c) => c.outcome === 'fail');
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
}

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../../');

let stack: Stack;
try {
  stack = stackFromLocalStatus(repoRoot);
} catch (err) {
  fatal((err as Error).message);
}
// readLocalConfig is exercised the same way the shipped drive uses it (doctor-style check).
readLocalConfig(repoRoot);

const stamp = Date.now();
const sql = sqlClient(stack);

/* ------------------------------------------------------- (1) provision a platform administrator */
// Same shape as `_live.ts`'s `provisionPlatformAdmin`: create the auth user with the admin API,
// confirmed, then insert its `public.accounts` row directly as `platform_admin`, then sign in.

const adminEmail = `verify-admin-${stamp}@example.com`;
const adminPassword = `Verify-Admin-${stamp}!`;
let adminToken = '';
{
  const created = await fetch(`${stack.apiUrl.replace(/\/$/, '')}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: stack.serviceRoleKey,
      Authorization: `Bearer ${stack.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: adminEmail, password: adminPassword, email_confirm: true }),
  });
  const user = (await created.json()) as { id?: string };
  const adminId = String(user.id ?? '');
  record('1a', 'provision platform admin: admin API creates a confirmed user', created.status < 400 && adminId !== '', `status ${created.status}, id ${adminId ? 'present' : 'missing'}`);
  if (created.status >= 400 || !adminId) fatal(`provisioning a platform administrator answered ${created.status}`);

  await sql`insert into public.accounts (id, account_type) values (${adminId}::uuid, 'platform_admin')`;

  const signedIn = await authPost(stack, '/auth/v1/token?grant_type=password', { email: adminEmail, password: adminPassword });
  adminToken = String(signedIn.json.access_token ?? '');
  record('1b', 'provision platform admin: sign-in issues a token', signedIn.status === 200 && adminToken !== '', `status ${signedIn.status}, token ${adminToken ? 'issued' : 'missing'}`);
  if (!adminToken) fatal('the provisioned platform administrator could not sign in');
}

/* ------------------------------------------------------------- (2) register + complete two NGOs */

async function registerAndCompleteNgo(label: string, orgName: string): Promise<{ accountId: string; email: string; token: string }> {
  const email = `verify-ngo-${label}-${stamp}@example.com`;
  const password = `Verify-Ngo-${label}-${stamp}!`;

  const signup = await authPost(stack, '/auth/v1/signup', { email, password });
  record(`${label}1`, `NGO ${label}: signup answers 200`, signup.status === 200, `status ${signup.status}`);
  if (signup.status !== 200) fatal(`signup for NGO ${label} answered ${signup.status}`);

  const links = await verifyLinksFor(stack, email, 'signup');
  const link = links[0] ?? null;
  record(`${label}2`, `NGO ${label}: confirmation email holds a verify link`, link !== null, link ? 'link present' : 'no message for the address after 20s');
  if (!link) fatal(`no confirmation email arrived for NGO ${label}`);

  const followed = await followLink(link);
  const confirmed = followed.status >= 300 && followed.status < 400;
  record(`${label}3`, `NGO ${label}: verify link redirects (address confirmed)`, confirmed, `status ${followed.status}`);
  if (!confirmed) fatal(`the verify link for NGO ${label} did not redirect`);

  const signedIn = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
  const accessToken = String(signedIn.json.access_token ?? '');
  const accountId = String((signedIn.json.user as { id?: string } | undefined)?.id ?? '');
  record(`${label}4`, `NGO ${label}: sign-in succeeds after confirmation`, signedIn.status === 200 && accessToken !== '', `status ${signedIn.status}, user ${accountId || 'missing'}`);
  if (!accessToken || !accountId) fatal(`sign-in after confirmation failed for NGO ${label}`);

  const completed = await functionPost(
    stack,
    'complete-signup',
    {
      accountType: 'ngo',
      organizationName: orgName,
      acknowledgmentTextVersion: 'tos-platform-promise-v1',
      signerName: `Verify Drill ${label}`,
      signerTitle: 'Automated verifier',
      authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
    },
    accessToken,
  );
  record(`${label}5`, `NGO ${label}: complete-signup answers 200`, completed.status === 200, `status ${completed.status}: ${JSON.stringify(redactValue(completed.json)).slice(0, 200)}`);
  if (completed.status !== 200) fatal(`complete-signup for NGO ${label} answered ${completed.status}`);

  return { accountId, email, token: accessToken };
}

const orgOneName = `Verify Drill Org A ${stamp}`;
const orgTwoName = `Verify Drill Org B ${stamp}`;
const ngoOne = await registerAndCompleteNgo('A', orgOneName);
const ngoTwo = await registerAndCompleteNgo('B', orgTwoName);

const orgOneRows = (await sql`select id from public.organizations where name = ${orgOneName}`) as { id: string }[];
const orgOneId = String(orgOneRows[0]?.id ?? '');
record('org1', 'organisation A row exists', orgOneId !== '', `id ${orgOneId || 'missing'}`);
if (!orgOneId) fatal('organisation A was not found after complete-signup');

/* ---------------------------------------------- (3) transfer org A's contact seat to NGO B */

{
  const transfer = await functionPost(
    stack,
    'transfer-organization-contact',
    {
      organizationId: orgOneId,
      fromAccountId: ngoOne.accountId,
      toAccountId: ngoTwo.accountId,
      reason: 'verify-evidence drill: transfer to a fresh contact',
    },
    adminToken,
  );
  record('t1', 'transfer-organization-contact answers 200', transfer.status === 200, `status ${transfer.status}: ${JSON.stringify(redactValue(transfer.json)).slice(0, 200)}`);
  if (transfer.status !== 200) fatal(`transfer-organization-contact answered ${transfer.status}`);
}

/* ------------------------------------------------- (4) read back as the operator (service role) */

const accountsRows = await sql`select id, account_type, lifecycle from public.accounts where id in (${ngoOne.accountId}::uuid, ${ngoTwo.accountId}::uuid) order by id`;
console.log('accounts readback:', JSON.stringify(redactValue(accountsRows)));
record('r1', 'public.accounts readback shows both NGO accounts', (accountsRows as unknown[]).length === 2, JSON.stringify(redactValue(accountsRows)));

const membershipRows = await sql`select account_id, org_id, role from public.org_memberships where org_id = ${orgOneId}::uuid order by account_id`;
console.log('org_memberships readback:', JSON.stringify(redactValue(membershipRows)));
const seatHeldByB = (membershipRows as { account_id: string; role: string }[]).some((row) => row.account_id === ngoTwo.accountId && row.role === 'admin');
record('r2', 'public.org_memberships shows the seat transferred to NGO B', seatHeldByB, JSON.stringify(redactValue(membershipRows)));

const auditRows = await sql`select event_kind, actor_account_id, subject_account_id, subject_org_id, reason from public.audit_events where subject_org_id = ${orgOneId}::uuid order by occurred_at`;
console.log('audit_events readback:', JSON.stringify(redactValue(auditRows)));
const transferAudited = (auditRows as { event_kind: string }[]).some((row) => row.event_kind === 'org_contact_transferred');
record('r3', 'public.audit_events carries the transfer event', transferAudited, JSON.stringify(redactValue(auditRows)));

/* ---------------------------------------------------------- (5) deactivate NGO B, then refuse it */

{
  const deactivate = await functionPost(
    stack,
    'set-account-lifecycle',
    { accountId: ngoTwo.accountId, lifecycle: 'deactivated', reason: 'verify-evidence drill: deactivate the transferee' },
    adminToken,
  );
  record('d1', 'set-account-lifecycle deactivates NGO B', deactivate.status === 200 && deactivate.json.changed !== false, `status ${deactivate.status}: ${JSON.stringify(redactValue(deactivate.json)).slice(0, 200)}`);
  if (deactivate.status !== 200) fatal(`set-account-lifecycle answered ${deactivate.status}`);
}

{
  const attempt = await functionPost(stack, 'create-organization', { name: `Verify Drill Org C ${stamp}` }, ngoTwo.token);
  const refused = attempt.status >= 400 || attempt.json.ok === false;
  const kind = String(attempt.json.kind ?? 'none');
  console.log(`create-organization as a deactivated account: status ${attempt.status}, refusal kind ${kind}`);
  record('d2', 'create-organization refuses the now-deactivated NGO B', refused, `status ${attempt.status}, kind ${kind}`);
}

await sql.close();
finish();
const failed = checks.filter((c) => c.outcome === 'fail');
process.exit(failed.length === 0 && checks.length > 0 ? 0 : 1);
