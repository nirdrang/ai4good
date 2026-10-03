import type { RouteSurface } from '../../../../supabase/functions/_shared/write-routes.ts';
import { expect } from 'vitest';

import { AT_CONFIG } from '../../harness/atconfig.ts';
import { CapabilityPending } from '../../harness/registry.ts';
import type { AtContext as HarnessAtContext } from '../../harness/registry.ts';
import { TENANT_NOT_FOUND } from '../../../../supabase/functions/_shared/tenant-reads.ts';
import type { AccountType, AccountsSut, AuditEventRow, ProjectRow, Session, World, WriteSubject } from './_contract.ts';
import { isTautologicalUsing, TENANT_CATALOG, tenantCatalogProblems } from './_policy-scan.ts';
import { writeRouteProblems } from './_write-route-scan.ts';
import { WRITE_ROUTES, type WriteRouteName } from '../../../../supabase/functions/_shared/write-routes.ts';
import { inviteOrAddMemberSurface } from './_source-scan.ts';
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

type Ctx = HarnessAtContext<'req-001', 'accounts', 'integration'>;

const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const CLIENT_IP = '203.0.113.7';
const PASSWORD = 'correct horse battery staple';
const SIGNER = {
  signerName: 'Dana Okonkwo',
  signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
} as const;

const ACCESS_TOKEN_LIFETIME_MS = AT_CONFIG.accessTokenLifetimeSeconds.value * 1000;

export const INTEGRATION_TIMEOUT_MS = 240_000;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `@supabase/supabase-js` types reference DOM globals and `tests/at/tsconfig.json` has no DOM lib,
 * so the module is loaded through a non-literal specifier and only the surface used is declared.
 */
type RealClient = {
  auth: {
    signInWithPassword(credentials: { email: string; password: string }): Promise<{
      data: { session: { access_token: string } | null };
      error: unknown;
    }>;
    getSession(): Promise<{ data: { session: { access_token: string } | null } }>;
    getUser(): Promise<{ data: { user: { id: string } | null } }>;
    stopAutoRefresh(): Promise<void>;
  };
};

async function realClient(url: string, anonKey: string): Promise<RealClient> {
  const specifier = '@supabase/supabase-js';
  const module = (await import(/* @vite-ignore */ specifier)) as {
    createClient?: (url: string, key: string, opts: unknown) => RealClient;
  };
  if (typeof module.createClient !== 'function') {
    throw new Error(`${specifier} exports no createClient() — AT-001.13's whole claim is about a real client`);
  }
  return module.createClient(url, anonKey, {
    auth: { autoRefreshToken: true, persistSession: false, detectSessionInUrl: false },
  });
}

async function registerConfirmAndSignIn(
  sut: Awaited<ReturnType<Ctx['open']>>['sut'],
  email: string,
  password = PASSWORD,
): Promise<Session> {
  const registered = await sut.registerWithEmailPassword(email, password);
  expect(registered.sessionId, 'the live registration issued a session, which under confirmations it must not').toBe('');

  const link = await sut.emailedVerificationLink(email);
  expect(link, `no confirmation email reached the stack's mail catcher for ${email}`).not.toBeNull();
  const used = await sut.useVerificationLink(link!);
  expect(used.ok, 'following the emailed confirmation link was refused').toBe(true);

  const signedIn = await sut.signInWithEmailPassword(email, password);
  expect(signedIn, `sign-in after confirmation failed for ${email}`).toMatchObject({ ok: true });
  if (!signedIn.ok) throw new Error('unreachable: the assertion above fails first');
  expect(signedIn.session.accountId, 'sign-in resolved to a different account than the registration created').toBe(
    registered.accountId,
  );
  return signedIn.session;
}

const SERVICE_ROLE_SELECT = new Set(['accounts', 'org_memberships']);
const VIEWER_FUNCTIONS = new Set(['viewer_is_org_member', 'viewer_is_platform_admin', 'viewer_is_volunteer', 'viewer_discovery_allowance', 'viewer_discovery_brief']);
const PUBLIC_PAGE_KEYS = ['ok', 'organizationName', 'projectId', 'projectName'];

async function assertTenantCatalog(sut: Awaited<ReturnType<Ctx['open']>>['sut']): Promise<void> {
  expect(tenantCatalogProblems(), 'the static catalog scan found a problem').toEqual([]);
  const facts = await sut.tenantTableFacts();
  const byTable = new Map(facts.tables.map((row) => [row.table, row]));
  for (const table of byTable.keys()) {
    expect(table in TENANT_CATALOG, `the live catalog has undeclared public table ${table}`).toBe(true);
  }
  for (const [table, posture] of Object.entries(TENANT_CATALOG)) {
    const fact = byTable.get(table);
    expect(fact, `the live catalog has no row for ${table}`).toBeDefined();
    if (!fact) continue;
    expect(fact.forceRowLevelSecurity, `${table} has FORCE ROW LEVEL SECURITY`).toBe(false);
    expect(fact.anon, `${table} anon privileges`).toEqual([]);
    const serviceExpected = SERVICE_ROLE_SELECT.has(table) ? ['select'] : [];
    expect(fact.serviceRole, `${table} service_role privileges`).toEqual(serviceExpected);
    if (posture === 'tenant-isolated') {
      expect(fact.rowLevelSecurity, `${table} does not have row-level security`).toBe(true);
      expect(fact.authenticated, `${table} authenticated privileges`).toEqual(['select']);
      expect(fact.policies.length, `${table} has no policy`).toBeGreaterThan(0);
      expect(
        fact.policies.some((policy) => isTautologicalUsing(policy.using)),
        `${table} has a tautological using policy`,
      ).toBe(false);
    } else {
      expect(fact.authenticated, `${table} authenticated privileges`).toEqual([]);
    }
  }
  for (const fn of facts.functions) {
    expect(fn.anonExecute, `${fn.name} is executable by anon`).toBe(false);
    expect(fn.authenticatedExecute, `${fn.name} authenticated execute`).toBe(VIEWER_FUNCTIONS.has(fn.name));
  }
}

function viewerRows<T>(read: { ok: true; rows: readonly T[] } | { ok: false }): readonly T[] {
  expect(read.ok, 'a caller-bound read was refused at the privilege or session layer, so it is not an empty list').toBe(
    true,
  );
  return read.ok ? read.rows : [];
}

function publicPageKeys(body: string): string[] {
  const parsed = JSON.parse(body) as unknown;
  expect(parsed === null || typeof parsed !== 'object' || Array.isArray(parsed), 'public page body is not an object').toBe(
    false,
  );
  return Object.keys(parsed as Record<string, unknown>).sort();
}

export async function at00101(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const email = w.email('ngo-signup');
  const session = await registerConfirmAndSignIn(sut, email);

  expect(
    await sut.hasPlatformAcknowledgment(session.accountId),
    'a user who has authenticated but not completed signup must NOT hold the platform acknowledgment',
  ).toBe(false);

  const completion = await sut.completeSignup(
    session,
    { accountType: 'ngo', organizationName: 'Riverside Shelter', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, 'the deployed complete-signup refused the NGO completion').toMatchObject({ ok: true });
  if (!completion.ok) return;
  expect(completion.organizationId, 'an NGO completion produced no organisation').not.toBeNull();

  expect(await sut.account(completion.accountId)).toEqual({ id: session.accountId, accountType: 'ngo', lifecycle: 'active' });
  expect(await sut.organization(completion.organizationId!)).toMatchObject({ name: 'Riverside Shelter' });
  expect(await sut.membership(completion.organizationId!, completion.accountId)).toEqual({
    organizationId: completion.organizationId,
    accountId: completion.accountId,
    role: 'admin',
  });

  const acknowledgments = await sut.acknowledgments(completion.accountId);
  expect(acknowledgments, 'exactly one platform acknowledgment is recorded by one completion').toHaveLength(1);
  expect(acknowledgments[0].textVersion, 'the acknowledgment must say WHICH text was accepted').toBe(TEXT_VERSION);
  expect(acknowledgments[0].ip, 'the reported address did not reach the acknowledgment row').toContain(CLIENT_IP);
  expect(
    Number.isFinite(Date.parse(acknowledgments[0].acknowledgedAt)),
    `the acknowledgment timestamp ${JSON.stringify(acknowledgments[0].acknowledgedAt)} is not a readable instant`,
  ).toBe(true);

  expect(
    await sut.hasPlatformAcknowledgment(completion.accountId),
    'the SHIPPED has_platform_acknowledgment does not hold once signup has completed',
  ).toBe(true);

  const returning = await sut.signInWithEmailPassword(email, PASSWORD);
  expect(returning, 'the same credentials did not sign in again').toMatchObject({ ok: true });
  if (!returning.ok) return;
  expect(returning.session.accountId).toBe(session.accountId);

  const other = await registerConfirmAndSignIn(sut, w.email('no-acknowledgment'));
  const refused = await sut.completeSignup(other, { accountType: 'ngo', organizationName: 'Riverside Shelter Annexe' }, CLIENT_IP);
  expect(refused.ok, 'signup completed with no acknowledgment of the ToS and Platform Promise').toBe(false);
  if (refused.ok) return;
  expect(refused.reason, 'the refusal does not say the acknowledgment is what is missing').toMatch(/acknowledgment/i);
  expect(await sut.account(other.accountId), 'the refused completion left an account row behind').toBeNull();
  expect(
    await sut.hasPlatformAcknowledgment(other.accountId),
    'the refused completion recorded an acknowledgment anyway',
  ).toBe(false);
}

export async function at00106(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  const ngo = await registerConfirmAndSignIn(sut, w.email('ngo-actor'));
  const ngoCompletion = await sut.completeSignup(
    ngo,
    { accountType: 'ngo', organizationName: 'Riverside Shelter', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(ngoCompletion, 'the NGO control could not complete signup').toMatchObject({ ok: true });
  if (!ngoCompletion.ok) return;

  const ngoAction = await sut.createOrganization(ngo, 'Riverside Shelter Second Programme');
  expect(ngoAction, 'the NGO control was refused the NGO-only action, so the refusal below proves nothing').toMatchObject({
    ok: true,
  });
  if (!ngoAction.ok) return;
  expect(await sut.organization(ngoAction.organizationId)).toMatchObject({ name: 'Riverside Shelter Second Programme' });
  expect(await sut.membership(ngoAction.organizationId, ngoCompletion.accountId)).toMatchObject({ role: 'admin' });

  const volunteer = await registerConfirmAndSignIn(sut, w.email('volunteer-actor'));
  await sut.linkGithubIdentity(volunteer, 'volunteer-actor-handle');
  const volunteerCompletion = await sut.completeSignup(
    volunteer,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(volunteerCompletion, 'the volunteer could not complete signup, so the refusal below is not the one under test').toMatchObject(
    { ok: true },
  );
  if (!volunteerCompletion.ok) return;

  const REFUSED_NAME = 'Riverside Shelter Copy';
  const volunteerAction = await sut.createOrganization(volunteer, REFUSED_NAME);
  expect(volunteerAction.ok, 'a volunteer account performed an NGO-only action').toBe(false);
  if (volunteerAction.ok) return;

  expect(await sut.organizationsNamed(REFUSED_NAME), `the refused action created an organisation named ${REFUSED_NAME}`).toEqual([]);
  expect(await sut.membershipsOf(volunteerCompletion.accountId), 'the refused action left the volunteer holding a membership').toEqual(
    [],
  );
  expect(volunteerAction.reason).toMatch(/NGO accounts only/i);
  expect(volunteerAction.reason).toMatch(/volunteer/i);
}

export async function at00107(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  const adminEmail = w.email('platform-admin');
  const provisioned = await sut.provisionPlatformAdmin(adminEmail, PASSWORD);

  const signedIn = await sut.signInWithEmailPassword(adminEmail, PASSWORD);
  expect(signedIn, 'the provisioned platform admin could not sign in').toMatchObject({ ok: true });
  if (!signedIn.ok) return;
  expect(signedIn.session.accountId).toBe(provisioned.accountId);
  expect(
    await sut.account(signedIn.session.accountId),
    'the signed-in administrator does not carry the platform_admin global type',
  ).toMatchObject({ accountType: 'platform_admin' });

  const visitor = await registerConfirmAndSignIn(sut, w.email('would-be-admin'));
  const escalation = await sut.completeSignup(
    visitor,
    { accountType: 'platform_admin', acknowledgmentTextVersion: TEXT_VERSION },
    CLIENT_IP,
  );
  expect(escalation.ok, 'the DEPLOYED public signup path minted a platform administrator').toBe(false);
  if (escalation.ok) return;
  expect(escalation.reason).toMatch(/platform_admin/);
  expect(await sut.account(visitor.accountId), 'the refused escalation left an account row behind').toBeNull();
}

export async function at00141(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  const volunteer = await registerConfirmAndSignIn(sut, w.email('permanent-github'));
  await sut.linkGithubIdentity(volunteer, 'permanent-github-handle');
  await sut.completeSignup(
    volunteer,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );

  const before = await sut.linkedIdentities(volunteer.accountId);
  expect(before.map((i) => i.provider), 'the Given is a volunteer holding email and github').toContain('github');
  expect(before.map((i) => i.provider), 'the Given is a volunteer holding email and github').toContain('email');

  await sut.unlinkGithubIdentity(volunteer, 'github');

  expect(
    (await sut.linkedIdentities(volunteer.accountId)).map((i) => i.provider),
    'the mandatory GitHub identity was unlinked',
  ).toContain('github');
  expect(await sut.authUserIsHealthy(volunteer), 'the refusal broke Auth for this user').toBe(true);

  const ngo = await registerConfirmAndSignIn(sut, w.email('ngo-with-github'));
  await sut.linkGithubIdentity(ngo, 'ngo-github-handle');
  await sut.completeSignup(
    ngo,
    {
      accountType: 'ngo',
      organizationName: 'Riverside Shelter 41',
      acknowledgmentTextVersion: TEXT_VERSION,
      ...SIGNER,
    },
    CLIENT_IP,
  );
  await sut.unlinkGithubIdentity(ngo, 'github');
  expect(
    (await sut.linkedIdentities(ngo.accountId)).map((i) => i.provider),
    'the control was refused too, so the refusal is not about volunteers',
  ).not.toContain('github');
}

export async function at00109(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  for (const kind of ['ngo', 'volunteer'] as const) {
    const email = w.email(`${kind}-verify`);
    const registered = await sut.registerWithEmailPassword(email, PASSWORD);
    expect(registered.sessionId, 'the live registration issued a session, which under confirmations it must not').toBe('');

    expect(
      await sut.emailVerified(registered.accountId),
      `a fresh ${kind} registration is already reported verified — nothing below would then mean anything`,
    ).toBe(false);

    const early = await sut.signInWithEmailPassword(email, PASSWORD);
    expect(early.ok, `an unconfirmed ${kind} account signed in`).toBe(false);

    const link = await sut.emailedVerificationLink(email);
    expect(link, `no confirmation email reached the stack's mail catcher for the ${kind} address`).not.toBeNull();

    const used = await sut.useVerificationLink(link!);
    expect(used.ok, `following the emailed ${kind} confirmation link was refused`).toBe(true);
    expect(
      await sut.emailVerified(registered.accountId),
      `using the emailed link did not flip the ${kind} account to verified`,
    ).toBe(true);

    const after = await sut.signInWithEmailPassword(email, PASSWORD);
    expect(after, `a confirmed ${kind} account could not sign in`).toMatchObject({ ok: true });
    if (!after.ok) return;

    const request =
      kind === 'ngo'
        ? {
            accountType: 'ngo' as const,
            organizationName: `Riverside Shelter ${kind}-verify`,
            acknowledgmentTextVersion: TEXT_VERSION,
            ...SIGNER,
          }
        : { accountType: 'volunteer' as const, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER };
    if (kind === 'volunteer') await sut.linkGithubIdentity(after.session, `verify-${registered.accountId.slice(0, 8)}`);

    const completion = await sut.completeSignup(after.session, request, CLIENT_IP);
    expect(completion, `the verified ${kind} could not complete signup as a ${kind}`).toMatchObject({ ok: true });
    if (!completion.ok) return;
    expect(
      await sut.account(completion.accountId),
      `the completed ${kind} account does not carry the ${kind} global type`,
    ).toEqual({ id: registered.accountId, accountType: kind, lifecycle: 'active' });
  }
}

export async function at00112(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const email = w.email('sessions');
  const session = await registerConfirmAndSignIn(sut, email);

  const completion = await sut.completeSignup(
    session,
    { accountType: 'ngo', organizationName: 'Riverside Shelter', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, 'the session under test could not complete signup, so nothing below is about a working session').toMatchObject({
    ok: true,
  });

  const sibling = await sut.signInWithEmailPassword(email, PASSWORD);
  expect(sibling, 'a second sign-in for the same account failed').toMatchObject({ ok: true });
  if (!sibling.ok) return;
  const before = await sut.sessionsOf(session.accountId);
  expect(before.length, 'the account does not hold the two sessions this arm needs').toBeGreaterThanOrEqual(2);

  await sut.signOut(session);
  const after = await sut.sessionsOf(session.accountId);
  expect(after.map((row) => row.sessionId), 'the signed-out session row is still there').not.toContain(session.sessionId);
  expect(after.map((row) => row.sessionId), 'the scoped logout took the sibling session with it').toContain(sibling.session.sessionId);

  const revokedWrite = await sut.createOrganization(session, 'Riverside Shelter After Logout');
  expect(revokedWrite.ok, 'a revoked session performed a write').toBe(false);
  expect(await sut.organizationsNamed('Riverside Shelter After Logout'), 'the revoked write happened anyway').toEqual([]);

  const again = await sut.signInWithEmailPassword(email, PASSWORD);
  expect(again, 're-authentication after revocation was refused, so revocation ended the account rather than the session').toMatchObject(
    { ok: true },
  );
  if (!again.ok) return;

  await wait(ACCESS_TOKEN_LIFETIME_MS + 15_000);
  const expiredWrite = await sut.createOrganization(again.session, 'Riverside Shelter After Expiry');
  expect(expiredWrite.ok, 'an expired access token performed a write').toBe(false);
  expect(await sut.organizationsNamed('Riverside Shelter After Expiry'), 'the expired write happened anyway').toEqual([]);

  const refreshed = await sut.refreshSession(again.session);
  expect(refreshed, 'the same session could not be refreshed after its access token expired').toMatchObject({ ok: true });
  if (!refreshed.ok) return;
  const afterRefresh = await sut.createOrganization(refreshed.session, 'Riverside Shelter After Refresh');
  expect(afterRefresh, 'a refreshed session still could not write').toMatchObject({ ok: true });
}

export async function at00113(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const email = w.email('auto-refresh');
  const session = await registerConfirmAndSignIn(sut, email);

  const completion = await sut.completeSignup(
    session,
    { accountType: 'ngo', organizationName: 'Riverside Shelter Auto Refresh', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, 'the account under test could not complete signup, so it holds no account row').toMatchObject({ ok: true });

  const url = process.env.AT_SUPABASE_URL ?? '';
  const anonKey = process.env.AT_SUPABASE_ANON_KEY ?? '';
  expect(url && anonKey, 'this child holds no stack coordinates, so no real client can be built').toBeTruthy();

  const client = await realClient(url, anonKey);
  try {
    const signedIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
    expect(signedIn.error, 'the real client could not sign in against the stack').toBeNull();
    const first = signedIn.data.session?.access_token ?? '';
    expect(first, 'the real client signed in with no access token').not.toBe('');

    const signedInAs = (await client.auth.getUser()).data.user?.id ?? '';
    expect(signedInAs, 'the real client signed in and named no user').not.toBe('');
    expect(signedInAs, 'the real client signed in as a different account than the harness registered').toBe(
      session.accountId,
    );

    const deadline = Date.now() + ACCESS_TOKEN_LIFETIME_MS + 30_000;
    let rotated = '';
    while (Date.now() < deadline && !rotated) {
      await wait(5_000);
      const current = (await client.auth.getSession()).data.session?.access_token ?? '';
      if (current && current !== first) rotated = current;
    }
    expect(rotated, 'the client never rotated its access token on its own — automatic refresh is unproved').not.toBe('');

    const me = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${rotated}` },
    });
    expect(me.status, 'the automatically rotated token does not carry access').toBe(200);

    const rotatedUser = (await client.auth.getUser()).data.user?.id ?? '';
    expect(rotatedUser, 'the automatically rotated token names a different user than the one that signed in').toBe(
      signedInAs,
    );
    const account = await sut.account(rotatedUser);
    expect(account, 'the rotated session resolved to no readable account row').not.toBeNull();
    expect(account?.id, 'the account row the rotated session resolves to is somebody else\'s').toBe(signedInAs);
  } finally {
    await client.auth.stopAutoRefresh().catch(() => undefined);
  }
}

export async function at00114(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const email = w.email('password-reset');
  await registerConfirmAndSignIn(sut, email);

  await sut.requestPasswordReset(email);
  const link = await sut.emailedPasswordResetLink(email);
  expect(link, "no recovery email reached the stack's mail catcher").not.toBeNull();

  const NEW_PASSWORD = 'a completely different passphrase 42';
  const completed = await sut.completePasswordReset(link!, NEW_PASSWORD);
  expect(completed.ok, 'completing the emailed reset flow failed').toBe(true);

  const withNew = await sut.signInWithEmailPassword(email, NEW_PASSWORD);
  expect(withNew, 'the new password does not work').toMatchObject({ ok: true });

  const withOld = await sut.signInWithEmailPassword(email, PASSWORD);
  expect(withOld.ok, 'the OLD password still works after the reset').toBe(false);
}

export async function at00138(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const email = w.email('wrong-password');
  const session = await registerConfirmAndSignIn(sut, email);

  const before = (await sut.sessionsOf(session.accountId)).map((row) => row.sessionId).sort();

  const refused = await sut.signInWithEmailPassword(email, 'not the password at all');
  expect(refused.ok, 'the wrong password signed in').toBe(false);

  const after = (await sut.sessionsOf(session.accountId)).map((row) => row.sessionId).sort();
  expect(after, 'the refused sign-in created an authenticated session').toEqual(before);

  const accepted = await sut.signInWithEmailPassword(email, PASSWORD);
  expect(accepted, 'the correct password was refused, so the negative above proves nothing').toMatchObject({ ok: true });
  expect((await sut.sessionsOf(session.accountId)).length, 'the accepted sign-in added no session row').toBe(after.length + 1);
}

async function twoMembershipGiven(
  sut: Awaited<ReturnType<Ctx['open']>>['sut'],
  w: Awaited<ReturnType<Ctx['open']>>['w'],
  label: string,
  names: { a: string; b: string; c: string },
): Promise<{ session: Session; accountId: string; organizationA: string; organizationB: string; organizationC: string }> {
  const session = await registerConfirmAndSignIn(sut, w.email(label));
  const completion = await sut.completeSignup(
    session,
    { accountType: 'ngo', organizationName: names.a, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, 'the NGO actor could not complete signup, so nothing below is about a seated admin').toMatchObject({ ok: true });
  if (!completion.ok || completion.organizationId === null) throw new Error('unreachable: the assertion above fails first');

  const organizationB = await sut.createOrganizationAsOperator(names.b);
  const seated = await sut.grantMembershipAsOperator(organizationB.id, completion.accountId, 'member');
  expect(seated, `the operator could not seat the actor as ${names.b}'s single member, so the Given does not exist`).toMatchObject({
    ok: true,
  });
  const organizationC = await sut.createOrganizationAsOperator(names.c);

  return {
    session,
    accountId: completion.accountId,
    organizationA: completion.organizationId,
    organizationB: organizationB.id,
    organizationC: organizationC.id,
  };
}

export async function at00116(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const NAMES = {
    a: 'Riverside Shelter 16A',
    b: 'Northgate Foodbank 16B',
    c: 'Eastside Legal Aid 16C',
  };
  const RENAMED_A = 'Riverside Shelter and Kitchen 16A';
  const ATTEMPTED_B = 'Northgate Foodbank Renamed By An Outsider 16B';
  const ATTEMPTED_C = 'Eastside Legal Aid Renamed By An Outsider 16C';

  const given = await twoMembershipGiven(sut, w, 'two-orgs-16', NAMES);

  expect(await sut.membership(given.organizationA, given.accountId), 'the actor is not A\'s admin').toMatchObject({ role: 'admin' });
  expect(await sut.membership(given.organizationB, given.accountId), 'the actor is not B\'s member').toMatchObject({ role: 'member' });
  expect(await sut.membership(given.organizationC, given.accountId), 'the actor holds a membership in C, which the Given denies').toBeNull();
  const held = await sut.membershipsOf(given.accountId);
  expect(held, 'the actor does not hold exactly two memberships').toHaveLength(2);
  expect(
    held.map((row) => row.role).sort(),
    'the two memberships do not carry two different roles, so the role is not being held per organisation',
  ).toEqual(['admin', 'member']);

  const renamed = await sut.updateOrganization(given.session, given.organizationA, RENAMED_A);
  expect(renamed, 'A\'s own admin was refused the admin-only action, so the refusals below prove nothing').toMatchObject({ ok: true });
  expect(await sut.organization(given.organizationA), 'the rename did not reach the row').toMatchObject({ name: RENAMED_A });

  const refusedInB = await sut.updateOrganization(given.session, given.organizationB, ATTEMPTED_B);
  expect(refusedInB.ok, 'A\'s admin renamed an organisation where it holds only the member role').toBe(false);
  if (refusedInB.ok) return;
  expect(refusedInB.kind, 'the refusal in B is not the not-an-admin one').toBe('not-an-admin');
  expect(await sut.organization(given.organizationB), 'the refused rename reached B\'s row anyway').toMatchObject({ name: NAMES.b });
  expect(await sut.organizationsNamed(ATTEMPTED_B), 'the refused rename created an organisation by the attempted name').toEqual([]);

  const refusedInC = await sut.updateOrganization(given.session, given.organizationC, ATTEMPTED_C);
  expect(refusedInC.ok, 'the actor renamed an organisation it holds no membership in').toBe(false);
  if (refusedInC.ok) return;
  expect(refusedInC.kind, 'the refusal in C is not the not-a-member one').toBe('not-a-member');
  expect(await sut.organization(given.organizationC), 'the refused rename reached C\'s row anyway').toMatchObject({ name: NAMES.c });
  expect(await sut.organizationsNamed(ATTEMPTED_C), 'the refused rename created an organisation by the attempted name').toEqual([]);

  expect(await sut.membershipsOf(given.accountId), 'a refused action changed what the actor is a member of').toHaveLength(2);
}

export async function at00136(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const NAMES = {
    a: 'Riverside Shelter 36A',
    b: 'Northgate Foodbank 36B',
    c: 'Eastside Legal Aid 36C',
  };
  const RENAMED_A = 'Riverside Shelter Second Programme 36A';
  const ATTEMPTED_B = 'Northgate Foodbank Renamed By A Member 36B';

  const given = await twoMembershipGiven(sut, w, 'admin-and-member-36', NAMES);

  expect(await sut.membership(given.organizationA, given.accountId), 'the actor is not A\'s admin').toMatchObject({
    accountId: given.accountId,
    role: 'admin',
  });
  expect(await sut.membership(given.organizationB, given.accountId), 'the actor is not B\'s member').toMatchObject({
    accountId: given.accountId,
    role: 'member',
  });

  const inA = await sut.updateOrganization(given.session, given.organizationA, RENAMED_A);
  expect(inA, 'the admin-only action failed where the caller IS the admin').toMatchObject({ ok: true });
  expect(await sut.organization(given.organizationA)).toMatchObject({ name: RENAMED_A });

  const inB = await sut.updateOrganization(given.session, given.organizationB, ATTEMPTED_B);
  expect(inB.ok, 'the same account performed the admin-only action where it holds the member role').toBe(false);
  if (inB.ok) return;
  expect(inB.kind, 'the refusal is not the not-an-admin one').toBe('not-an-admin');
  expect(
    inB.kind,
    'the refusal came back as not-a-member, which would mean the member row was not found rather than not sufficient',
  ).not.toBe('not-a-member');

  expect(await sut.organization(given.organizationB), 'the refused action renamed B anyway').toMatchObject({ name: NAMES.b });
  expect(await sut.organizationsNamed(ATTEMPTED_B), 'the refused action created an organisation by the attempted name').toEqual([]);
  expect(await sut.membership(given.organizationB, given.accountId), 'the refused action changed the actor\'s role in B').toMatchObject({
    role: 'member',
  });
}

export async function at00137(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const ATTEMPTED_ORG = 'Volunteer Attempted Organisation 37';
  const ATTEMPTED_ON_SIGNUP = 'Volunteer Owned Organisation 37';
  const OPERATOR_ORG = 'Operator Created Organisation 37';

  const volunteer = await registerConfirmAndSignIn(sut, w.email('volunteer-37'));
  await sut.linkGithubIdentity(volunteer, `volunteer-37-${volunteer.accountId.slice(0, 8)}`);
  const completion = await sut.completeSignup(
    volunteer,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, 'the volunteer could not complete signup, so nothing below is about a volunteer account').toMatchObject({ ok: true });
  if (!completion.ok) return;
  expect(await sut.account(completion.accountId), 'the account under test is not a volunteer').toMatchObject({ accountType: 'volunteer' });

  const ngoOnly = await sut.createOrganization(volunteer, ATTEMPTED_ORG);
  expect(ngoOnly.ok, 'a volunteer performed the NGO-only action and would have been seated as its admin').toBe(false);
  expect(await sut.organizationsNamed(ATTEMPTED_ORG), 'the refused action created an organisation').toEqual([]);

  const second = await registerConfirmAndSignIn(sut, w.email('volunteer-with-org-37'));
  await sut.linkGithubIdentity(second, `volunteer-org-37-${second.accountId.slice(0, 8)}`);
  const withOrganization = await sut.completeSignup(
    second,
    { accountType: 'volunteer', organizationName: ATTEMPTED_ON_SIGNUP, acknowledgmentTextVersion: TEXT_VERSION },
    CLIENT_IP,
  );
  expect(withOrganization.ok, 'a volunteer completion carrying an organisation name was accepted').toBe(false);
  expect(await sut.account(second.accountId), 'the refused completion left an account row behind').toBeNull();
  expect(await sut.organizationsNamed(ATTEMPTED_ON_SIGNUP), 'the refused completion created an organisation').toEqual([]);

  const organization = await sut.createOrganizationAsOperator(OPERATOR_ORG);
  for (const role of ['admin', 'member'] as const) {
    const granted = await sut.grantMembershipAsOperator(organization.id, completion.accountId, role);
    expect(granted.ok, `an operator granted the ${role} role to a volunteer account`).toBe(false);
    if (granted.ok) return;
    expect(granted.kind, `the ${role} grant was refused for a reason other than the account type`).toBe('not-an-ngo-account');
  }

  expect(await sut.membershipsOf(completion.accountId), 'the volunteer holds a per-organisation role after every path refused').toEqual([]);
  expect(await sut.membership(organization.id, completion.accountId), 'the refused grant wrote a membership row').toBeNull();

  const control = await registerConfirmAndSignIn(sut, w.email('ngo-control-37'));
  const controlCompletion = await sut.completeSignup(
    control,
    { accountType: 'ngo', organizationName: 'Riverside Shelter Control 37', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(controlCompletion, 'the NGO control could not complete signup').toMatchObject({ ok: true });
  if (!controlCompletion.ok) return;
  const seated = await sut.grantMembershipAsOperator(organization.id, controlCompletion.accountId, 'member');
  expect(seated, 'the operator grant refuses an NGO account too, so the refusals above prove nothing').toMatchObject({ ok: true });

  const repointed = await sut.repointMembershipAsOperator(organization.id, completion.accountId);
  expect(repointed.ok, 'an operator re-pointed a seated membership at a volunteer account').toBe(false);
  if (repointed.ok) return;
  expect(repointed.kind, 'the re-point was refused for a reason other than the account type').toBe('not-an-ngo-account');

  expect(await sut.membership(organization.id, controlCompletion.accountId), 'the refused re-point moved the seat anyway').toMatchObject({
    accountId: controlCompletion.accountId,
    role: 'member',
  });
  expect(await sut.membershipsOf(completion.accountId), 'the volunteer holds a per-organisation role after the re-point refused').toEqual([]);
}

export async function at00117(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  expect(
    inviteOrAddMemberSurface(),
    'the app carries a route named like an invite or add-member surface, so "UI absent" is no longer true',
  ).toEqual([]);

  const url = (process.env.AT_SUPABASE_URL ?? '').replace(/\/$/, '');
  const anonKey = process.env.AT_SUPABASE_ANON_KEY ?? '';
  expect(url && anonKey, 'this child holds no stack coordinates, so the absence probes below cannot run').toBeTruthy();

  const absent = await fetch(`${url}/functions/v1/invite-member`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const absentBody = await absent.text();
  expect(absent.status, 'an invite-member function answered on the deployed stack').toBe(404);
  expect(absentBody, 'the router did not answer with its not-found shape').toContain('Function not found');

  const present = await fetch(`${url}/functions/v1/create-organization`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  expect(
    present.status,
    'the deployed control did not answer its measured 401, so the router may not be resolving names and the probe above proves nothing',
  ).toBe(401);

  const clientRead = await fetch(`${url}/rest/v1/org_memberships?select=role`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' },
  });
  const clientReadBody = await clientRead.text();
  expect(clientRead.status, 'the membership table did not answer the measured privilege refusal to a client key').toBe(401);
  expect(clientReadBody, 'the refusal does not name a permission denial, so it is not the privilege layer answering').toMatch(
    /permission denied/i,
  );

  const owner = await registerConfirmAndSignIn(sut, w.email('single-seat-owner-17'));
  const ownerCompletion = await sut.completeSignup(
    owner,
    { accountType: 'ngo', organizationName: 'Riverside Shelter 17', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(ownerCompletion, 'the NGO owner could not complete signup, so there is no seated organisation').toMatchObject({ ok: true });
  if (!ownerCompletion.ok || ownerCompletion.organizationId === null) return;

  const wouldBeSecond = await registerConfirmAndSignIn(sut, w.email('would-be-second-17'));
  const secondCompletion = await sut.completeSignup(
    wouldBeSecond,
    { accountType: 'ngo', organizationName: 'Northgate Foodbank 17', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(secondCompletion, 'the second NGO account could not complete signup').toMatchObject({ ok: true });
  if (!secondCompletion.ok) return;

  for (const role of ['admin', 'member'] as const) {
    const seated = await sut.grantMembershipAsOperator(ownerCompletion.organizationId, secondCompletion.accountId, role);
    expect(seated.ok, `a second ${role} was seated in an organisation that already holds its one seat`).toBe(false);
    if (seated.ok) return;
    expect(seated.kind, `the second ${role} was refused for a reason other than the seat being taken`).toBe('org-already-seated');
  }

  const seats = await sut.membershipsOf(secondCompletion.accountId);
  expect(
    seats.map((row) => row.organizationId),
    'the refused grant seated the second account in the first organisation anyway',
  ).not.toContain(ownerCompletion.organizationId);
  expect(
    await sut.membership(ownerCompletion.organizationId, ownerCompletion.accountId),
    'the owner lost its own seat',
  ).toMatchObject({ role: 'admin' });
}

export async function at00132(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  const ngo = await registerConfirmAndSignIn(sut, w.email('project-owner-32'));
  const ngoCompletion = await sut.completeSignup(
    ngo,
    { accountType: 'ngo', organizationName: 'Riverside Shelter 32', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(ngoCompletion, 'the NGO could not complete signup, so there is no organisation to hold a project').toMatchObject({ ok: true });
  if (!ngoCompletion.ok || ngoCompletion.organizationId === null) return;

  const first = await registerConfirmAndSignIn(sut, w.email('first-volunteer-32'));
  await sut.linkGithubIdentity(first, `first-32-${first.accountId.slice(0, 8)}`);
  const firstCompletion = await sut.completeSignup(
    first,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(firstCompletion, 'the first volunteer could not complete signup').toMatchObject({ ok: true });
  if (!firstCompletion.ok) return;

  const second = await registerConfirmAndSignIn(sut, w.email('second-volunteer-32'));
  await sut.linkGithubIdentity(second, `second-32-${second.accountId.slice(0, 8)}`);
  const secondCompletion = await sut.completeSignup(
    second,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(secondCompletion, 'the second volunteer could not complete signup').toMatchObject({ ok: true });
  if (!secondCompletion.ok) return;

  const project = await sut.createProjectAsOperator(ngoCompletion.organizationId, 'Riverside Shelter Website 32');
  expect(project.assignedVolunteerId, 'a freshly created project already carries a developer').toBeNull();
  const assigned = await sut.assignVolunteerAsOperator(project.id, firstCompletion.accountId);
  expect(assigned, 'the first volunteer could not be attached, so this criterion has no Given').toMatchObject({ ok: true });
  expect(await sut.projectAssignment(project.id), 'the seat does not hold the first volunteer').toMatchObject({
    assignedVolunteerId: firstCompletion.accountId,
  });

  const secondAttach = await sut.assignVolunteerAsOperator(project.id, secondCompletion.accountId);
  expect(secondAttach.ok, 'a second volunteer was attached to a project that already has one').toBe(false);
  if (secondAttach.ok) return;
  expect(secondAttach.kind, 'the second attach was refused for a reason other than the seat being taken').toBe('seat-occupied');

  expect(await sut.projectAssignment(project.id), 'the refused attach changed the project seat').toMatchObject({
    id: project.id,
    assignedVolunteerId: firstCompletion.accountId,
  });

  const again = await sut.assignVolunteerAsOperator(project.id, firstCompletion.accountId);
  expect(again, 'attaching the volunteer that already holds the seat was refused, so the refusal above is not about a SECOND one').toMatchObject(
    { ok: true },
  );
  expect(await sut.projectAssignment(project.id)).toMatchObject({ assignedVolunteerId: firstCompletion.accountId });
}

export async function at00119(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const session = await registerConfirmAndSignIn(sut, w.email('who-signed'));

  const completion = await sut.completeSignup(
    session,
    {
      accountType: 'ngo',
      organizationName: 'Riverside Shelter Who Signed',
      acknowledgmentTextVersion: TEXT_VERSION,
      ...SIGNER,
    },
    CLIENT_IP,
  );
  expect(completion, 'the deployed complete-signup refused a completion carrying all three identity fields').toMatchObject({
    ok: true,
  });
  if (!completion.ok) return;

  const acknowledgments = await sut.acknowledgments(completion.accountId);
  expect(acknowledgments, 'exactly one platform acknowledgment is recorded by one completion').toHaveLength(1);
  const row = acknowledgments[0];

  expect(row.signerName, 'the acknowledgment does not record the name that was submitted').toBe(SIGNER.signerName);
  expect(row.signerTitle, 'the acknowledgment does not record the title that was submitted').toBe(SIGNER.signerTitle);
  expect(
    row.authorityAttestation,
    'the acknowledgment does not record the authority statement that was affirmed',
  ).toBe(ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement);
}

export async function at00139(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  const omissions = [
    { slug: 'name', field: 'signerName', names: /signer name/i },
    { slug: 'title', field: 'signerTitle', names: /signer title/i },
    { slug: 'attestation', field: 'authorityAttestation', names: /authority attestation/i },
  ] as const;

  for (const omission of omissions) {
    const session = await registerConfirmAndSignIn(sut, w.email(`no-${omission.slug}`));
    const organizationName = `Riverside Shelter No ${omission.slug}`;

    const identity: Record<string, unknown> = { ...SIGNER };
    delete identity[omission.field];
    const refused = await sut.completeSignup(
      session,
      { accountType: 'ngo', organizationName, acknowledgmentTextVersion: TEXT_VERSION, ...identity },
      CLIENT_IP,
    );

    expect(refused.ok, `the deployed path completed a signup with no ${omission.slug}`).toBe(false);
    if (refused.ok) return;
    expect(refused.reason, `the refusal does not name the ${omission.slug} as what is missing`).toMatch(omission.names);

    expect(await sut.account(session.accountId), `the refused completion left an account row behind (${omission.slug})`).toBeNull();
    expect(
      await sut.acknowledgments(session.accountId),
      `the refused completion recorded an acknowledgment anyway (${omission.slug})`,
    ).toEqual([]);
    expect(
      await sut.hasPlatformAcknowledgment(session.accountId),
      `the refused completion left the account holding the platform acknowledgment (${omission.slug})`,
    ).toBe(false);
    expect(
      await sut.organizationsNamed(organizationName),
      `the refused completion created the organisation anyway (${omission.slug})`,
    ).toEqual([]);
    expect(
      await sut.membershipsOf(session.accountId),
      `the refused completion left a membership behind (${omission.slug})`,
    ).toEqual([]);
  }

  const control = await registerConfirmAndSignIn(sut, w.email('all-three'));
  const completed = await sut.completeSignup(
    control,
    {
      accountType: 'ngo',
      organizationName: 'Riverside Shelter All Three',
      acknowledgmentTextVersion: TEXT_VERSION,
      ...SIGNER,
    },
    CLIENT_IP,
  );
  expect(completed, 'the control completion carrying all three fields was refused, so the refusals prove nothing').toMatchObject({
    ok: true,
  });
}

export async function at00121(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const emailA = w.email('ngo-a-21');
  const emailB = w.email('ngo-b-21');

  const sessionA = await registerConfirmAndSignIn(sut, emailA);
  const completionA = await sut.completeSignup(
    sessionA,
    { accountType: 'ngo', organizationName: 'Riverside Shelter 21A', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completionA, 'NGO A could not complete signup').toMatchObject({ ok: true });
  if (!completionA.ok || completionA.organizationId === null) return;
  const orgA = completionA.organizationId;
  const project = await sut.createProjectAsOperator(orgA, 'Riverside Shelter Website 21');

  expect(await sut.organization(orgA), "the operator cannot see A's organisation, so the denials below prove nothing").not.toBeNull();
  expect(await sut.membership(orgA, completionA.accountId), "the operator cannot see A's seat").not.toBeNull();
  expect(await sut.projectAssignment(project.id), "the operator cannot see A's project").not.toBeNull();
  expect(await sut.acknowledgments(completionA.accountId), "the operator cannot see A's acknowledgment").not.toEqual([]);

  const ownOrg = await sut.organizationAsViewer(sessionA, orgA);
  expect(viewerRows(ownOrg).map((row) => row.id)).toEqual([orgA]);
  const ownSeats = await sut.membershipsAsViewer(sessionA, orgA);
  expect(viewerRows(ownSeats)).toEqual([
    { organizationId: orgA, accountId: completionA.accountId, role: 'admin' },
  ]);
  const ownProject = await sut.projectAsViewer(sessionA, project.id);
  expect(viewerRows(ownProject).map((row) => row.id)).toEqual([project.id]);
  const ownAcks = await sut.acknowledgmentsAsViewer(sessionA, completionA.accountId);
  expect(viewerRows(ownAcks).length, "A cannot read its own acknowledgment").toBeGreaterThan(0);
  const ownDash = await sut.organizationDashboard(sessionA, orgA);
  expect(ownDash.ok, "A's own dashboard was refused, so B's denials prove nothing").toBe(true);
  if (!ownDash.ok) return;
  expect(ownDash.value.organizationName).toBe('Riverside Shelter 21A');
  expect(ownDash.answer.status).toBe(200);

  const sessionB = await registerConfirmAndSignIn(sut, emailB);
  const completionB = await sut.completeSignup(
    sessionB,
    { accountType: 'ngo', organizationName: 'Northgate Foodbank 21B', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completionB, 'NGO B could not complete signup').toMatchObject({ ok: true });
  if (!completionB.ok || completionB.organizationId === null) return;

  const absentOrg = crypto.randomUUID();
  const absentProject = crypto.randomUUID();
  const absentAccount = crypto.randomUUID();

  expect(viewerRows(await sut.organizationAsViewer(sessionB, orgA))).toEqual([]);
  expect(viewerRows(await sut.organizationAsViewer(sessionB, absentOrg))).toEqual([]);
  expect(viewerRows(await sut.membershipsAsViewer(sessionB, orgA))).toEqual([]);
  expect(viewerRows(await sut.membershipsAsViewer(sessionB, absentOrg))).toEqual([]);
  expect(viewerRows(await sut.projectAsViewer(sessionB, project.id))).toEqual([]);
  expect(viewerRows(await sut.projectAsViewer(sessionB, absentProject))).toEqual([]);
  expect(viewerRows(await sut.acknowledgmentsAsViewer(sessionB, completionA.accountId))).toEqual([]);
  expect(viewerRows(await sut.acknowledgmentsAsViewer(sessionB, absentAccount))).toEqual([]);

  const foreignDash = await sut.organizationDashboard(sessionB, orgA);
  const absentDash = await sut.organizationDashboard(sessionB, absentOrg);
  expect(foreignDash.ok, "B reached A's dashboard").toBe(false);
  expect(absentDash.ok, 'B reached a dashboard for an id that does not exist').toBe(false);
  if (foreignDash.ok || absentDash.ok) return;
  expect(foreignDash.answer.status).toBe(404);
  expect(absentDash.answer.status).toBe(404);
  expect(foreignDash.answer.body, 'foreign and absent dashboard refusals differ as bytes').toBe(absentDash.answer.body);
  expect(foreignDash.answer.body).toBe(JSON.stringify(TENANT_NOT_FOUND.body));

  const listed = viewerRows(await sut.organizationsAsViewer(sessionB));
  expect(
    listed.some((row) => row.id === orgA),
    "B's unfiltered organisations listing contains A's organisation",
  ).toBe(false);
  expect(
    listed.some((row) => row.id === completionB.organizationId),
    "B's unfiltered organisations listing does not contain B's own organisation, so the empty listing of A proves nothing",
  ).toBe(true);

  const anonMemberships = await sut.membershipsAsViewer(null, orgA);
  expect(anonMemberships.ok, 'anon on org_memberships was not refused').toBe(false);
  if (anonMemberships.ok) return;
  expect(anonMemberships.kind, 'anon on org_memberships was not the privilege layer').toBe('privilege-denied');
  expect(anonMemberships.answer.status, 'anon on org_memberships did not answer the measured privilege refusal').toBe(
    401,
  );
  expect(anonMemberships.reason, 'the anon refusal does not name a permission denial').toMatch(/permission denied/i);

  await assertTenantCatalog(sut);
}

export async function at00122(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const emailNgo = w.email('ngo-22');
  const emailVolunteer = w.email('volunteer-22');

  const ngo = await registerConfirmAndSignIn(sut, emailNgo);
  const ngoCompletion = await sut.completeSignup(
    ngo,
    { accountType: 'ngo', organizationName: 'Riverside Shelter 22', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(ngoCompletion, 'the owning NGO could not complete signup').toMatchObject({ ok: true });
  if (!ngoCompletion.ok || ngoCompletion.organizationId === null) return;
  const project = await sut.createProjectAsOperator(ngoCompletion.organizationId, 'Riverside Shelter Website 22');

  const volunteer = await registerConfirmAndSignIn(sut, emailVolunteer);
  await sut.linkGithubIdentity(volunteer, `volunteer-22-${volunteer.accountId.slice(0, 8)}`);
  const volunteerCompletion = await sut.completeSignup(
    volunteer,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(volunteerCompletion, 'the unassigned volunteer could not complete signup').toMatchObject({ ok: true });
  if (!volunteerCompletion.ok) return;

  const absent = crypto.randomUUID();
  const foreignWorkspace = await sut.projectWorkspace(volunteer, project.id);
  const absentWorkspace = await sut.projectWorkspace(volunteer, absent);
  expect(foreignWorkspace.ok, 'an unassigned volunteer reached the project workspace').toBe(false);
  expect(absentWorkspace.ok, 'an unassigned volunteer reached a workspace for an id that does not exist').toBe(false);
  if (foreignWorkspace.ok || absentWorkspace.ok) return;
  expect(foreignWorkspace.answer.status).toBe(404);
  expect(absentWorkspace.answer.status).toBe(404);
  expect(foreignWorkspace.answer.body, 'foreign and absent workspace refusals differ as bytes').toBe(
    absentWorkspace.answer.body,
  );
  expect(foreignWorkspace.answer.body).toBe(JSON.stringify(TENANT_NOT_FOUND.body));

  expect(viewerRows(await sut.projectAsViewer(volunteer, project.id))).toEqual([]);

  const asVisitor = await sut.publicProjectPage(project.id);
  expect(asVisitor.ok, 'the public project page was refused with no token').toBe(true);
  if (!asVisitor.ok) return;
  expect(asVisitor.page).toEqual({
    projectId: project.id,
    projectName: 'Riverside Shelter Website 22',
    organizationName: 'Riverside Shelter 22',
  });
  expect(publicPageKeys(asVisitor.answer.body)).toEqual(PUBLIC_PAGE_KEYS);

  const asVolunteerPage = await sut.publicProjectPage(project.id, volunteer);
  expect(asVolunteerPage.ok, 'the public project page was refused as the volunteer').toBe(true);
  if (!asVolunteerPage.ok) return;
  expect(asVolunteerPage.answer.body).toBe(asVisitor.answer.body);
  expect(publicPageKeys(asVolunteerPage.answer.body)).toEqual(PUBLIC_PAGE_KEYS);

  const ownerRead = await sut.projectAsViewer(ngo, project.id);
  expect(viewerRows(ownerRead).map((row) => row.id)).toEqual([project.id]);

  const anonWorkspace = await sut.projectWorkspace(null, project.id);
  expect(anonWorkspace.ok, 'anon workspace was not refused').toBe(false);
  expect(anonWorkspace.answer.status, 'anon workspace did not answer 401').toBe(401);

  await assertTenantCatalog(sut);
}

export async function at00123(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const emailNgoA = w.email('ngo-a-23');
  const emailNgoB = w.email('ngo-b-23');
  const emailVolunteer = w.email('volunteer-23');

  const ngoA = await registerConfirmAndSignIn(sut, emailNgoA);
  const completionA = await sut.completeSignup(
    ngoA,
    { accountType: 'ngo', organizationName: 'Riverside Shelter 23A', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completionA, 'NGO A could not complete signup').toMatchObject({ ok: true });
  if (!completionA.ok || completionA.organizationId === null) return;
  const orgA = completionA.organizationId;
  const project1 = await sut.createProjectAsOperator(orgA, 'Riverside Shelter Website 23 P1');
  const project2 = await sut.createProjectAsOperator(orgA, 'Riverside Shelter Website 23 P2');

  const ngoB = await registerConfirmAndSignIn(sut, emailNgoB);
  const completionB = await sut.completeSignup(
    ngoB,
    { accountType: 'ngo', organizationName: 'Northgate Foodbank 23B', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completionB, 'NGO B could not complete signup').toMatchObject({ ok: true });
  if (!completionB.ok || completionB.organizationId === null) return;
  const project3 = await sut.createProjectAsOperator(completionB.organizationId, 'Northgate Foodbank Website 23 P3');

  const volunteer = await registerConfirmAndSignIn(sut, emailVolunteer);
  await sut.linkGithubIdentity(volunteer, `volunteer-23-${volunteer.accountId.slice(0, 8)}`);
  const volunteerCompletion = await sut.completeSignup(
    volunteer,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(volunteerCompletion, 'the volunteer could not complete signup').toMatchObject({ ok: true });
  if (!volunteerCompletion.ok) return;

  const seated = await sut.assignVolunteerAsOperator(project1.id, volunteerCompletion.accountId);
  expect(seated, 'the operator could not seat the volunteer on P1').toMatchObject({ ok: true });

  expect(await sut.organization(orgA), "the operator cannot see A's organisation").not.toBeNull();
  expect(await sut.projectAssignment(project1.id), 'the operator cannot see P1').toMatchObject({
    assignedVolunteerId: volunteerCompletion.accountId,
  });
  expect(await sut.projectAssignment(project2.id), 'the operator cannot see P2').not.toBeNull();
  expect(await sut.projectAssignment(project3.id), 'the operator cannot see P3').not.toBeNull();

  const volunteerIn = await sut.signInWithEmailPassword(emailVolunteer, PASSWORD);
  expect(volunteerIn, 'the assigned volunteer could not sign in before the reads').toMatchObject({ ok: true });
  if (!volunteerIn.ok) return;
  const asVolunteer = volunteerIn.session;

  const ownWorkspace = await sut.projectWorkspace(asVolunteer, project1.id);
  expect(ownWorkspace.ok, 'the assigned volunteer was refused P1 workspace').toBe(true);
  if (!ownWorkspace.ok) return;
  expect(ownWorkspace.answer.status).toBe(200);
  expect(ownWorkspace.value).toEqual({
    ok: true,
    projectId: project1.id,
    projectName: 'Riverside Shelter Website 23 P1',
    organizationId: orgA,
    assignedVolunteerId: volunteerCompletion.accountId,
  });
  const ownProject = await sut.projectAsViewer(asVolunteer, project1.id);
  expect(viewerRows(ownProject).map((row) => row.id)).toEqual([project1.id]);

  expect(viewerRows(await sut.projectAsViewer(asVolunteer, project2.id))).toEqual([]);
  expect(viewerRows(await sut.projectAsViewer(asVolunteer, project3.id))).toEqual([]);
  expect(viewerRows(await sut.organizationAsViewer(asVolunteer, orgA))).toEqual([]);
  expect(viewerRows(await sut.membershipsAsViewer(asVolunteer, orgA))).toEqual([]);
  expect(viewerRows(await sut.acknowledgmentsAsViewer(asVolunteer, completionA.accountId))).toEqual([]);

  const siblingWorkspace = await sut.projectWorkspace(asVolunteer, project2.id);
  const foreignWorkspace = await sut.projectWorkspace(asVolunteer, project3.id);
  const owningDash = await sut.organizationDashboard(asVolunteer, orgA);
  expect(siblingWorkspace.ok, 'the assigned volunteer reached P2 in the same organisation').toBe(false);
  expect(foreignWorkspace.ok, 'the assigned volunteer reached P3 in another organisation').toBe(false);
  expect(owningDash.ok, 'the assigned volunteer reached the owning organisation dashboard').toBe(false);
  if (siblingWorkspace.ok || foreignWorkspace.ok || owningDash.ok) return;
  expect(siblingWorkspace.answer.body).toBe(JSON.stringify(TENANT_NOT_FOUND.body));
  expect(foreignWorkspace.answer.body).toBe(JSON.stringify(TENANT_NOT_FOUND.body));
  expect(owningDash.answer.body).toBe(JSON.stringify(TENANT_NOT_FOUND.body));

  const ngoSeat = await sut.assignVolunteerAsOperator(project2.id, completionA.accountId);
  expect(ngoSeat.ok, 'an operator seated an NGO account in a developer seat').toBe(false);
  if (ngoSeat.ok) return;
  expect(ngoSeat.kind, 'the NGO seating was refused for a reason other than the account type').toBe(
    'not-a-volunteer-account',
  );
  expect(await sut.projectAssignment(project2.id), 'the refused NGO seating wrote the seat anyway').toMatchObject({
    assignedVolunteerId: null,
  });

  await sut.retypeAccountAsOperator(volunteerCompletion.accountId, 'ngo');
  expect(await sut.projectAssignment(project1.id), 'retyping the volunteer moved the seat').toMatchObject({
    assignedVolunteerId: volunteerCompletion.accountId,
  });
  const retyped = await sut.signInWithEmailPassword(emailVolunteer, PASSWORD);
  expect(retyped, 'the retyped account could not sign in').toMatchObject({ ok: true });
  if (!retyped.ok) return;
  expect(viewerRows(await sut.projectAsViewer(retyped.session, project1.id))).toEqual([]);
  const retypedWorkspace = await sut.projectWorkspace(retyped.session, project1.id);
  expect(retypedWorkspace.ok, 'a retyped non-volunteer still reached P1 workspace').toBe(false);
  if (retypedWorkspace.ok) return;
  expect(retypedWorkspace.answer.body).toBe(JSON.stringify(TENANT_NOT_FOUND.body));

  await assertTenantCatalog(sut);
}

export async function at00140(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const emailA = w.email('ngo-a-40');
  const emailB = w.email('ngo-b-40');
  const adminEmail = w.email('platform-admin-40');

  const ngoA = await registerConfirmAndSignIn(sut, emailA);
  const completionA = await sut.completeSignup(
    ngoA,
    { accountType: 'ngo', organizationName: 'Riverside Shelter 40A', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completionA, 'NGO A could not complete signup').toMatchObject({ ok: true });
  if (!completionA.ok || completionA.organizationId === null) return;
  const orgA = completionA.organizationId;
  const projectA = await sut.createProjectAsOperator(orgA, 'Riverside Shelter Website 40A');

  const ngoB = await registerConfirmAndSignIn(sut, emailB);
  const completionB = await sut.completeSignup(
    ngoB,
    { accountType: 'ngo', organizationName: 'Northgate Foodbank 40B', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completionB, 'NGO B could not complete signup').toMatchObject({ ok: true });
  if (!completionB.ok || completionB.organizationId === null) return;
  const orgB = completionB.organizationId;
  const projectB = await sut.createProjectAsOperator(orgB, 'Northgate Foodbank Website 40B');

  expect(await sut.organization(orgA), "the operator cannot see A's organisation").not.toBeNull();
  expect(await sut.organization(orgB), "the operator cannot see B's organisation").not.toBeNull();
  expect(await sut.projectAssignment(projectA.id), 'the operator cannot see project A').not.toBeNull();
  expect(await sut.projectAssignment(projectB.id), 'the operator cannot see project B').not.toBeNull();

  const provisioned = await sut.provisionPlatformAdmin(adminEmail, PASSWORD);
  const adminIn = await sut.signInWithEmailPassword(adminEmail, PASSWORD);
  expect(adminIn, 'the provisioned platform admin could not sign in').toMatchObject({ ok: true });
  if (!adminIn.ok) return;
  expect(adminIn.session.accountId).toBe(provisioned.accountId);
  const admin = adminIn.session;

  const dashA = await sut.organizationDashboard(admin, orgA);
  const dashB = await sut.organizationDashboard(admin, orgB);
  expect(dashA.ok, "the platform admin was refused A's dashboard").toBe(true);
  expect(dashB.ok, "the platform admin was refused B's dashboard").toBe(true);
  if (!dashA.ok || !dashB.ok) return;
  expect(dashA.answer.status).toBe(200);
  expect(dashB.answer.status).toBe(200);
  expect(dashA.value.organizationName).toBe('Riverside Shelter 40A');
  expect(dashB.value.organizationName).toBe('Northgate Foodbank 40B');

  const wsA = await sut.projectWorkspace(admin, projectA.id);
  const wsB = await sut.projectWorkspace(admin, projectB.id);
  expect(wsA.ok, "the platform admin was refused A's workspace").toBe(true);
  expect(wsB.ok, "the platform admin was refused B's workspace").toBe(true);
  if (!wsA.ok || !wsB.ok) return;
  expect(wsA.answer.status).toBe(200);
  expect(wsB.answer.status).toBe(200);

  expect(viewerRows(await sut.organizationAsViewer(admin, orgA)).map((row) => row.id)).toEqual([orgA]);
  expect(viewerRows(await sut.organizationAsViewer(admin, orgB)).map((row) => row.id)).toEqual([orgB]);
  expect(viewerRows(await sut.membershipsAsViewer(admin, orgA))).toEqual([
    { organizationId: orgA, accountId: completionA.accountId, role: 'admin' },
  ]);
  expect(viewerRows(await sut.membershipsAsViewer(admin, orgB))).toEqual([
    { organizationId: orgB, accountId: completionB.accountId, role: 'admin' },
  ]);
  expect(viewerRows(await sut.projectAsViewer(admin, projectA.id)).map((row) => row.id)).toEqual([projectA.id]);
  expect(viewerRows(await sut.projectAsViewer(admin, projectB.id)).map((row) => row.id)).toEqual([projectB.id]);
  expect(
    viewerRows(await sut.acknowledgmentsAsViewer(admin, completionA.accountId)).length,
    "the platform admin cannot read A's acknowledgment",
  ).toBeGreaterThan(0);
  expect(
    viewerRows(await sut.acknowledgmentsAsViewer(admin, completionB.accountId)).length,
    "the platform admin cannot read B's acknowledgment",
  ).toBeGreaterThan(0);

  const ngoAIn = await sut.signInWithEmailPassword(emailA, PASSWORD);
  expect(ngoAIn, 'NGO A could not sign in before the repeated read').toMatchObject({ ok: true });
  if (!ngoAIn.ok) return;
  expect(viewerRows(await sut.organizationAsViewer(ngoAIn.session, orgB))).toEqual([]);
  const ngoDashB = await sut.organizationDashboard(ngoAIn.session, orgB);
  expect(ngoDashB.ok, "NGO A reached B's dashboard").toBe(false);
  if (ngoDashB.ok) return;
  expect(ngoDashB.answer.body).toBe(JSON.stringify(TENANT_NOT_FOUND.body));

  await assertTenantCatalog(sut);
}

export async function at00124(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();

  const ngo = await registerConfirmAndSignIn(sut, w.email('ngo-24'));
  const completion = await sut.completeSignup(
    ngo,
    { accountType: 'ngo', organizationName: 'Riverside Shelter 24', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, 'the NGO could not complete signup, so the public page has no project').toMatchObject({
    ok: true,
  });
  if (!completion.ok || completion.organizationId === null) return;
  const project = await sut.createProjectAsOperator(completion.organizationId, 'Riverside Shelter Website 24');
  const orgId = completion.organizationId;

  const anonOrg = await sut.organizationAsViewer(null, orgId);
  const anonSeats = await sut.membershipsAsViewer(null, orgId);
  const anonProject = await sut.projectAsViewer(null, project.id);
  const anonAcks = await sut.acknowledgmentsAsViewer(null, completion.accountId);
  for (const [label, answer] of [
    ['organizations', anonOrg],
    ['org_memberships', anonSeats],
    ['projects', anonProject],
    ['acknowledgments', anonAcks],
  ] as const) {
    expect(answer.ok, `anon on ${label} was not refused`).toBe(false);
    if (answer.ok) return;
    expect(answer.kind, `anon on ${label} was not the privilege layer`).toBe('privilege-denied');
    expect(answer.answer.status, `anon on ${label} did not answer 401`).toBe(401);
    expect(answer.reason, `the anon refusal on ${label} does not name a permission denial`).toMatch(
      /permission denied/i,
    );
  }

  const page = await sut.publicProjectPage(project.id);
  expect(page.ok, 'the public project page was refused with no token').toBe(true);
  if (!page.ok) return;
  expect(page.answer.status).toBe(200);
  expect(publicPageKeys(page.answer.body)).toEqual(PUBLIC_PAGE_KEYS);

  throw new CapabilityPending(['ui.authenticated-surface-rendering']);
}

type Opened = Awaited<ReturnType<Ctx['open']>>;

export const HANDOVER_REASON = 'planned handover: the executive director changed';
export const RECOVERY_REASON = 'lost access — recovery: the original contact cannot sign in';

export async function transferGiven(
  sut: Opened['sut'],
  w: Opened['w'],
  tag: string,
  signIn: (email: string) => Promise<Session>,
): Promise<{
  admin: Session;
  a: Session;
  b: Session;
  c: Session;
  organizationId: string;
  bOrganizationId: string;
  project: ProjectRow;
}> {
  const admin = await sut.provisionPlatformAdmin(w.email(`admin-${tag}`), PASSWORD);
  const a = await signIn(w.email(`ngo-a-${tag}`));
  const aCompletion = await sut.completeSignup(
    a,
    { accountType: 'ngo', organizationName: `Riverside Shelter ${tag}`, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(aCompletion, 'NGO A could not complete signup, so there is no organisation whose contact could change').toMatchObject({
    ok: true,
  });
  if (!aCompletion.ok || aCompletion.organizationId === null) throw new Error('unreachable: the assertion above fails first');
  const project = await sut.createProjectAsOperator(aCompletion.organizationId, `Riverside Shelter Website ${tag}`);
  const b = await signIn(w.email(`ngo-b-${tag}`));
  const bCompletion = await sut.completeSignup(
    b,
    { accountType: 'ngo', organizationName: `Northgate Foodbank ${tag}`, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(bCompletion, 'NGO B could not complete signup, so there is no completed NGO account to transfer to').toMatchObject({ ok: true });
  if (!bCompletion.ok || bCompletion.organizationId === null) throw new Error('unreachable: the assertion above fails first');
  const c = await signIn(w.email(`ngo-c-${tag}`));
  const cCompletion = await sut.completeSignup(
    c,
    { accountType: 'ngo', organizationName: `Harbour Clinic ${tag}`, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(cCompletion, 'NGO C could not complete signup, so there is no third completed NGO to receive the second transfer').toMatchObject({
    ok: true,
  });
  if (!cCompletion.ok) throw new Error('unreachable: the assertion above fails first');
  return { admin, a, b, c, organizationId: aCompletion.organizationId, bOrganizationId: bCompletion.organizationId, project };
}

type TransferGiven = Awaited<ReturnType<typeof transferGiven>>;

export async function transferSnapshot(sut: Opened['sut'], given: TransferGiven) {
  const acknowledgments = await sut.acknowledgments(given.a.accountId);
  expect(acknowledgments, 'NGO A holds no acknowledgment, so there is no history to preserve').toHaveLength(1);
  expect(await sut.membership(given.organizationId, given.a.accountId), 'NGO A does not hold the seat it is to hand over').toMatchObject({
    role: 'admin',
  });
  return {
    organization: await sut.organization(given.organizationId),
    acknowledgments,
    project: await sut.projectAssignment(given.project.id),
  };
}

export async function expectTransferred(
  sut: Opened['sut'],
  given: TransferGiven,
  before: Awaited<ReturnType<typeof transferSnapshot>>,
): Promise<void> {
  const { a, b, organizationId, project } = given;
  expect(await sut.membership(organizationId, b.accountId), 'the seat did not move to the new contact').toEqual({
    organizationId,
    accountId: b.accountId,
    role: 'admin',
  });
  expect(await sut.membership(organizationId, a.accountId), 'the outgoing contact still holds a seat in the organisation').toBeNull();
  expect(
    (await sut.membershipsOf(a.accountId)).map((row) => row.organizationId),
    'the outgoing contact still names the organisation among its seats',
  ).not.toContain(organizationId);
  expect(await sut.organization(organizationId), 'the organisation changed during the transfer').toEqual(before.organization);
  expect(await sut.acknowledgments(a.accountId), 'the acknowledgment the outgoing contact signed changed during the transfer').toEqual(
    before.acknowledgments,
  );
  expect(await sut.projectAssignment(project.id), 'the project changed during the transfer').toEqual(before.project);
  expect(await sut.account(a.accountId), 'the outgoing contact was not deactivated').toMatchObject({
    accountType: 'ngo',
    lifecycle: 'deactivated',
  });
  expect(await sut.account(b.accountId), 'the new contact was deactivated too').toMatchObject({ accountType: 'ngo', lifecycle: 'active' });
}

export async function expectSecondTransfer(sut: Opened['sut'], given: TransferGiven): Promise<void> {
  const second = await sut.transferOrganizationContact(given.admin, {
    organizationId: given.organizationId,
    fromAccountId: given.b.accountId,
    toAccountId: given.c.accountId,
    reason: HANDOVER_REASON,
  });
  expect(second, 'the platform administrator was refused the second transfer, from B to C').toMatchObject({ ok: true });
  if (!second.ok) return;
  expect(await sut.membership(given.organizationId, given.c.accountId), 'the seat did not move to C').toMatchObject({
    organizationId: given.organizationId,
    accountId: given.c.accountId,
    role: 'admin',
  });
  expect(await sut.membership(given.bOrganizationId, given.b.accountId), 'B lost its signup seat').toMatchObject({
    role: 'admin',
  });
  expect(await sut.account(given.b.accountId), 'B was deactivated even though it still holds its signup seat').toMatchObject({
    lifecycle: 'active',
  });
  expect(await sut.account(given.a.accountId), 'A was not left deactivated from the first transfer').toMatchObject({
    lifecycle: 'deactivated',
  });
  const transferred = (await sut.auditEvents({ subjectOrgId: given.organizationId })).filter(
    (row) => row.eventKind === 'org_contact_transferred',
  );
  expect(transferred, 'the two transfers did not leave two transfer rows').toHaveLength(2);
  expect(transferred[1].detail, 'the second transfer did not record that B stayed active with its remaining seat').toMatchObject({
    remaining_seats: [given.bOrganizationId],
    deactivated: false,
  });
}

export async function expectNotTransferred(sut: Opened['sut'], given: TransferGiven, arm: string): Promise<void> {
  expect(await sut.membership(given.organizationId, given.a.accountId), `the refused ${arm} attempt moved the seat`).toMatchObject({
    accountId: given.a.accountId,
    role: 'admin',
  });
  expect(await sut.account(given.a.accountId), `the refused ${arm} attempt changed the outgoing contact's lifecycle`).toMatchObject({
    lifecycle: 'active',
  });
  expect(await sut.account(given.b.accountId), `the refused ${arm} attempt changed the new contact's lifecycle`).toMatchObject({
    lifecycle: 'active',
  });
  expect(
    (await sut.auditEvents({ subjectOrgId: given.organizationId })).filter((row) => row.eventKind === 'org_contact_transferred'),
    `the refused ${arm} attempt left a transfer audit row`,
  ).toEqual([]);
}

export async function expectTransferAudited(
  sut: Opened['sut'],
  given: TransferGiven,
  reason: string,
  window: { openedAtMs: number; closedAtMs: number; toleranceMs: number },
): Promise<AuditEventRow> {
  const events = await sut.auditEvents({ subjectOrgId: given.organizationId });
  const transferred = events.filter((row) => row.eventKind === 'org_contact_transferred');
  expect(transferred, 'the transfer did not leave exactly one transfer row for the organisation').toHaveLength(1);
  const record = transferred[0];
  expect(record.actorAccountId, 'the audit row does not name the administrator who performed the transfer').toBe(given.admin.accountId);
  expect(record.actorLabel, 'the audit label does not name the administrator').toContain(given.admin.accountId);
  expect(record.reason, 'the audit row does not carry the reason the administrator gave').toBe(reason);
  expect(record.subjectAccountId, 'the audit row does not name the outgoing contact').toBe(given.a.accountId);
  expect(record.detail, 'the audit row does not name the new contact').toMatchObject({ to_account_id: given.b.accountId });
  const occurredAtMs = Date.parse(record.occurredAt);
  expect(occurredAtMs, 'the audit row carries no readable instant').not.toBeNaN();
  expect(occurredAtMs, 'the audit row is dated before the transfer began').toBeGreaterThanOrEqual(window.openedAtMs - window.toleranceMs);
  expect(occurredAtMs, 'the audit row is dated after the transfer completed').toBeLessThanOrEqual(window.closedAtMs + window.toleranceMs);

  const deactivations = (await sut.auditEvents({ subjectAccountId: given.a.accountId })).filter(
    (row) => row.eventKind === 'account_lifecycle_changed',
  );
  expect(deactivations, 'the deactivation of the outgoing contact left no audit row of its own').toHaveLength(1);
  expect(deactivations[0], 'the deactivation row does not carry the same actor and reason as the transfer').toMatchObject({
    actorAccountId: given.admin.accountId,
    reason,
    detail: { from: 'active', to: 'deactivated' },
  });
  return record;
}

const CONTAINER_CLOCK_TOLERANCE_MS = 60_000;

export async function at00125(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const given = await transferGiven(sut, w, '25', (email) => registerConfirmAndSignIn(sut, email));
  const before = await transferSnapshot(sut, given);
  const request = {
    organizationId: given.organizationId,
    fromAccountId: given.a.accountId,
    toAccountId: given.b.accountId,
    reason: HANDOVER_REASON,
  };

  const transfer = await sut.transferOrganizationContact(given.admin, request);
  expect(transfer, 'the platform administrator was refused the transfer').toMatchObject({ ok: true });
  if (!transfer.ok) return;
  await expectTransferred(sut, given, before);

  const again = await sut.transferOrganizationContact(given.admin, request);
  expect(again.ok, 'a second transfer of the same seat from the same account succeeded').toBe(false);
  if (again.ok) return;
  expect(again.kind, 'the retry was refused for a reason other than the seat having moved').toBe('not-the-current-contact');
  await expectTransferred(sut, given, before);

  await expectSecondTransfer(sut, given);
}

export async function at00126(ctx: Ctx): Promise<void> {
  const { h, w, sut } = await ctx.open();
  const given = await transferGiven(sut, w, '26', (email) => registerConfirmAndSignIn(sut, email));
  expect(
    (await sut.auditEvents({ subjectOrgId: given.organizationId })).filter((row) => row.eventKind === 'org_contact_transferred'),
    'the organisation carries a transfer audit row before the transfer',
  ).toEqual([]);

  const openedAtMs = h.clock.now();
  const transfer = await sut.transferOrganizationContact(given.admin, {
    organizationId: given.organizationId,
    fromAccountId: given.a.accountId,
    toAccountId: given.b.accountId,
    reason: HANDOVER_REASON,
  });
  const closedAtMs = h.clock.now();
  expect(transfer, 'the platform administrator was refused the transfer, so there is nothing to audit').toMatchObject({ ok: true });
  if (!transfer.ok) return;

  await expectTransferAudited(sut, given, HANDOVER_REASON, { openedAtMs, closedAtMs, toleranceMs: CONTAINER_CLOCK_TOLERANCE_MS });
}

export async function at00127(ctx: Ctx): Promise<void> {
  const { h, w, sut } = await ctx.open();
  const given = await transferGiven(sut, w, '27', (email) => registerConfirmAndSignIn(sut, email));

  await sut.signOut(given.a);
  const locked = await sut.signInWithEmailPassword(given.a.email, 'a password the contact no longer has');
  expect(locked.ok, 'the original contact can still sign in, so there is no lost access to recover from').toBe(false);
  const before = await transferSnapshot(sut, given);

  const openedAtMs = h.clock.now();
  const recovery = await sut.transferOrganizationContact(given.admin, {
    organizationId: given.organizationId,
    fromAccountId: given.a.accountId,
    toAccountId: given.b.accountId,
    reason: RECOVERY_REASON,
  });
  const closedAtMs = h.clock.now();
  expect(recovery, 'the administrator was refused the recovery').toMatchObject({ ok: true });
  if (!recovery.ok) return;

  await expectTransferred(sut, given, before);
  await expectTransferAudited(sut, given, RECOVERY_REASON, { openedAtMs, closedAtMs, toleranceMs: CONTAINER_CLOCK_TOLERANCE_MS });
}

export async function at00128(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const admin = await sut.provisionPlatformAdmin(w.email('admin-28'), PASSWORD);
  const ngo = await registerConfirmAndSignIn(sut, w.email('ngo-28'));
  const completion = await sut.completeSignup(
    ngo,
    { accountType: 'ngo', organizationName: 'Riverside Shelter 28', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, 'the NGO could not complete signup, so there is no organisation to record a contact for').toMatchObject({ ok: true });
  if (!completion.ok || completion.organizationId === null) return;
  const organizationId = completion.organizationId;
  expect(await sut.escalationContact(organizationId), 'a fresh organisation already carries an escalation contact').toBeNull();

  const contactEmail = w.email('escalation-28');
  const recorded = await sut.setEscalationContact(admin, { organizationId, name: 'Maya Lindqvist', email: contactEmail, phone: '+1 555 0100' });
  expect(recorded, 'the administrator was refused the escalation contact').toMatchObject({ ok: true });
  if (!recorded.ok) return;
  expect(await sut.escalationContact(organizationId), 'the escalation contact was not stored as recorded').toMatchObject({
    organizationId,
    contactName: 'Maya Lindqvist',
    contactEmail,
    contactPhone: '+1 555 0100',
    recordedByAccountId: admin.accountId,
  });

  const signIn = await sut.signInWithEmailPassword(contactEmail, PASSWORD);
  expect(signIn.ok, 'the escalation contact can sign in, so it is an account rather than a non-login contact').toBe(false);

  const replaced = await sut.setEscalationContact(admin, { organizationId, name: 'Jonas Ekholm', email: w.email('escalation-28-second'), phone: null });
  expect(replaced, 'the administrator was refused a second capture').toMatchObject({ ok: true });
  expect(await sut.escalationContact(organizationId), 'the second capture did not replace the first').toMatchObject({
    contactName: 'Jonas Ekholm',
    contactPhone: null,
  });

  const refused = await sut.setEscalationContact(ngo, { organizationId, name: 'Self Appointed', email: w.email('escalation-28-self'), phone: null });
  expect(refused.ok, 'an NGO account recorded its own escalation contact').toBe(false);
  if (refused.ok) return;
  expect(refused.kind, 'the NGO was refused for a reason other than not being a platform administrator').toBe('not-a-platform-admin');
  expect(refused.status, 'the NGO refusal is not a 403').toBe(403);
  expect(await sut.escalationContact(organizationId), 'the refused capture changed the contact').toMatchObject({ contactName: 'Jonas Ekholm' });

  const recordedEvents = (await sut.auditEvents({ subjectOrgId: organizationId })).filter(
    (row) => row.eventKind === 'org_escalation_contact_recorded',
  );
  expect(recordedEvents, 'the two captures did not leave two escalation audit rows').toHaveLength(2);
  expect(recordedEvents[0], 'the first capture did not record Maya as current with no previous contact').toMatchObject({
    actorAccountId: admin.accountId,
    reason: 'escalation contact recorded',
    detail: {
      previous: null,
      current: { name: 'Maya Lindqvist', email: contactEmail, phone: '+1 555 0100' },
    },
  });
  expect(recordedEvents[1], 'the second capture did not record Jonas as current and Maya as previous').toMatchObject({
    actorAccountId: admin.accountId,
    reason: 'escalation contact recorded',
    detail: {
      previous: { name: 'Maya Lindqvist', email: contactEmail, phone: '+1 555 0100' },
      current: { name: 'Jonas Ekholm', phone: null },
    },
  });
}

export async function at00135(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const given = await transferGiven(sut, w, '35', (email) => registerConfirmAndSignIn(sut, email));
  const volunteer = await registerConfirmAndSignIn(sut, w.email('volunteer-35'));
  await sut.linkGithubIdentity(volunteer, `volunteer-35-${volunteer.accountId.slice(0, 8)}`);
  const volunteerCompletion = await sut.completeSignup(
    volunteer,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(volunteerCompletion, 'the volunteer could not complete signup, so its refusal below is not the one under test').toMatchObject({ ok: true });
  if (!volunteerCompletion.ok) return;
  const before = await transferSnapshot(sut, given);
  const request = {
    organizationId: given.organizationId,
    fromAccountId: given.a.accountId,
    toAccountId: given.b.accountId,
    reason: HANDOVER_REASON,
  };

  const asNgo = await sut.transferOrganizationContact(given.a, request);
  expect(asNgo.ok, 'an NGO account ran the transfer').toBe(false);
  if (asNgo.ok) return;
  expect(asNgo.status, 'the NGO refusal is not a 403').toBe(403);
  expect(asNgo.kind, 'the NGO refusal is not the not-a-platform-admin one').toBe('not-a-platform-admin');
  await expectNotTransferred(sut, given, 'NGO');

  const asVolunteer = await sut.transferOrganizationContact(volunteer, request);
  expect(asVolunteer.ok, 'a volunteer account ran the transfer').toBe(false);
  if (asVolunteer.ok) return;
  expect(asVolunteer.status, 'the volunteer refusal is not a 403').toBe(403);
  expect(asVolunteer.kind, 'the volunteer refusal is not the not-a-platform-admin one').toBe('not-a-platform-admin');
  await expectNotTransferred(sut, given, 'volunteer');

  const anonymous = await sut.transferOrganizationContact(null, request);
  expect(anonymous.ok, 'an unauthenticated caller ran the transfer').toBe(false);
  if (anonymous.ok) return;
  expect(anonymous.status, 'the unauthenticated refusal is not a 401').toBe(401);
  expect(anonymous.kind, 'the unauthenticated refusal was classified as a decision').toBe('unauthenticated');
  await expectNotTransferred(sut, given, 'unauthenticated');

  const asAdmin = await sut.transferOrganizationContact(given.admin, request);
  expect(asAdmin, 'the platform administrator was refused the transfer, so the refusals above prove nothing').toMatchObject({ ok: true });
  if (!asAdmin.ok) return;
  await expectTransferred(sut, given, before);
}

export const AUP_REASON = 'AUP';
export const REENABLE_REASON = 're-enable after review';

async function ensureVerified(sut: AccountsSut, session: Session): Promise<void> {
  const link = await sut.emailedVerificationLink(session.email);
  if (link !== null) await sut.useVerificationLink(link);
}

async function completeNgo(sut: AccountsSut, session: Session, organizationName: string): Promise<string> {
  const completion = await sut.completeSignup(
    session,
    { accountType: 'ngo', organizationName, acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, `NGO ${organizationName} could not complete signup`).toMatchObject({ ok: true });
  if (!completion.ok || completion.organizationId === null) throw new Error('unreachable: the assertion above fails first');
  return completion.organizationId;
}

async function completeVolunteer(sut: AccountsSut, session: Session, handle: string): Promise<void> {
  await sut.linkGithubIdentity(session, handle);
  const completion = await sut.completeSignup(
    session,
    { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
    CLIENT_IP,
  );
  expect(completion, `volunteer ${handle} could not complete signup`).toMatchObject({ ok: true });
  if (!completion.ok) throw new Error('unreachable: the assertion above fails first');
}

type LifecycleActors = {
  admin: Session;
  adminOther: Session;
  adminOff: Session;
  ngo: Session;
  ngoOrg: string;
  ngoOff: Session;
  ngoOffOrg: string;
  volunteer: Session;
  volunteerOff: Session;
  transferFrom: Session;
  transferTo: Session;
  transferOrg: string;
};

export async function provisionLifecycleActors(
  sut: AccountsSut,
  w: World,
  tag: string,
  signIn: (email: string) => Promise<Session>,
): Promise<LifecycleActors> {
  const admin = await sut.provisionPlatformAdmin(w.email(`admin-${tag}`), PASSWORD);
  const adminOther = await sut.provisionPlatformAdmin(w.email(`admin-other-${tag}`), PASSWORD);
  const adminOff = await sut.provisionPlatformAdmin(w.email(`admin-off-${tag}`), PASSWORD);

  const ngo = await signIn(w.email(`ngo-${tag}`));
  await ensureVerified(sut, ngo);
  const ngoOrg = await completeNgo(sut, ngo, `Riverside ${tag}`);

  const ngoOff = await signIn(w.email(`ngo-off-${tag}`));
  await ensureVerified(sut, ngoOff);
  const ngoOffOrg = await completeNgo(sut, ngoOff, `Riverside Off ${tag}`);

  const volunteer = await signIn(w.email(`vol-${tag}`));
  await ensureVerified(sut, volunteer);
  await completeVolunteer(sut, volunteer, `vol-${tag}-${volunteer.accountId.slice(0, 8)}`);

  const volunteerOff = await signIn(w.email(`vol-off-${tag}`));
  await ensureVerified(sut, volunteerOff);
  await completeVolunteer(sut, volunteerOff, `vol-off-${tag}-${volunteerOff.accountId.slice(0, 8)}`);

  const transferFrom = await signIn(w.email(`xfer-from-${tag}`));
  const transferOrg = await completeNgo(sut, transferFrom, `Transfer ${tag}`);
  const transferTo = await signIn(w.email(`xfer-to-${tag}`));
  await completeNgo(sut, transferTo, `Transfer To ${tag}`);

  for (const [label, accountId] of [
    ['ngoOff', ngoOff.accountId],
    ['volunteerOff', volunteerOff.accountId],
    ['adminOff', adminOff.accountId],
  ] as const) {
    const deactivated = await sut.setAccountLifecycle(admin, { accountId, lifecycle: 'deactivated', reason: AUP_REASON });
    expect(deactivated, `${label} could not be deactivated`).toMatchObject({ ok: true, changed: true });
  }

  return {
    admin,
    adminOther,
    adminOff,
    ngo,
    ngoOrg,
    ngoOff,
    ngoOffOrg,
    volunteer,
    volunteerOff,
    transferFrom,
    transferTo,
    transferOrg,
  };
}

function sessionOf(actors: LifecycleActors, accountType: AccountType, role: 'active' | 'deactivated'): Session {
  if (accountType === 'ngo') return role === 'active' ? actors.ngo : actors.ngoOff;
  if (accountType === 'volunteer') return role === 'active' ? actors.volunteer : actors.volunteerOff;
  return role === 'active' ? actors.admin : actors.adminOff;
}

function organizationOf(actors: LifecycleActors, accountType: AccountType, role: 'active' | 'deactivated'): string {
  if (accountType === 'ngo') return role === 'active' ? actors.ngoOrg : actors.ngoOffOrg;
  return actors.transferOrg;
}

function deactivatedSubject(
  actors: LifecycleActors,
  w: World,
  tag: string,
  route: WriteRouteName,
  accountType: AccountType,
): WriteSubject {
  const organizationId = organizationOf(actors, accountType, 'deactivated');
  switch (route) {
    case 'project-need':
      return { route, organizationId, action: 'start', title: `Need ${tag} deactivated` };
    case 'complete-signup':
      return { route, name: `Write ${tag} complete-signup ${accountType} deactivated` };
    case 'create-organization':
      return { route, name: `Write ${tag} ${route} ${accountType} deactivated` };
    case 'update-organization':
      return { route, organizationId, name: `Write ${tag} ${route} ${accountType} deactivated` };
    case 'set-organization-profile':
      return {
        route,
        organizationId,
        name: `Write ${tag} ${route} ${accountType} deactivated`,
        mission: `mission ${tag}`,
        country: `country ${tag}`,
        website: `website ${tag}`,
        logo: `logo ${tag}`,
      };
    case 'transfer-organization-contact':
      return {
        route,
        organizationId: actors.transferOrg,
        fromAccountId: actors.transferFrom.accountId,
        toAccountId: actors.transferTo.accountId,
        reason: AUP_REASON,
      };
    case 'set-escalation-contact':
      return { route, organizationId: actors.transferOrg, name: 'Maya Lindqvist', email: w.email(`esc-${tag}-${route}`) };
    case 'set-account-lifecycle':
      return { route, accountId: actors.transferTo.accountId, lifecycle: 'deactivated', reason: AUP_REASON };
    case 'set-organization-vetting':
      return {
        route,
        organizationId: actors.transferOrg,
        action: 'vet',
        organizationName: `Deactivated Vet ${tag}`,
        publicReferenceUrl: 'https://example.org/deactivated-vet',
        contactName: 'Dana Okonkwo',
        contactTitle: 'Executive Director',
        authorityAttestation: 'The named contact attests authority to bind the organisation.',
        evidenceType: 'organization_website',
        note: `deactivated vet ${tag}`,
      };
    case 'set-organization-discovery':
      return { route, organizationId: actors.transferOrg, enabled: true, reason: `deactivated discovery ${tag}` };
    case 'discovery-allowance':
      return { route, organizationId, action: 'read' };
    case 'discovery-message':
      return { route, message: `hello ${tag} ${route} ${accountType} deactivated` };
    case 'discovery-scope':
      return { route, organizationId, projectId: '00000000-0000-4000-8000-000000000001', action: 'generate' };
    case 'discovery-brief':
      return {
        route, organizationId, projectId: '00000000-0000-4000-8000-000000000001', action: 'edit',
        sectionId: 'need', text: `brief ${tag}`, baseRevision: 1,
      };
  }
}

async function snapshotWrite(sut: AccountsSut, session: Session | null, subject: WriteSubject) {
  switch (subject.route) {
    case 'project-need':
      return { dashboard: await sut.organizationDashboard(session, subject.organizationId) };
    case 'create-organization':
      return { organizations: await sut.organizationsNamed(subject.name) };
    case 'update-organization':
      return { organization: await sut.organization(subject.organizationId) };
    case 'set-organization-profile':
      return { organization: await sut.organization(subject.organizationId) };
    case 'transfer-organization-contact':
      return { membership: await sut.membership(subject.organizationId, subject.fromAccountId) };
    case 'set-escalation-contact':
      return { contact: await sut.escalationContact(subject.organizationId) };
    case 'set-account-lifecycle':
      return { account: await sut.account(subject.accountId) };
    case 'set-organization-vetting':
      return { audit: await sut.auditEvents({ subjectOrgId: subject.organizationId }) };
    case 'set-organization-discovery':
      return { audit: await sut.auditEvents({ subjectOrgId: subject.organizationId }) };
    case 'discovery-allowance':
      return { organization: await sut.organization(subject.organizationId) };
    case 'discovery-message':
      return { messages: session ? await sut.discoveryMessagesBy(session.accountId) : [] };
    case 'discovery-scope':
      return { organization: await sut.organization(subject.organizationId) };
    case 'discovery-brief':
      return { organization: await sut.organization(subject.organizationId) };
    case 'complete-signup':
      return { account: session ? await sut.account(session.accountId) : null };
  }
}

async function provisionActiveControl(
  sut: AccountsSut,
  w: World,
  tag: string,
  signIn: (email: string) => Promise<Session>,
  route: WriteRouteName,
  accountType: AccountType,
): Promise<{ session: Session; subject: WriteSubject }> {
  switch (route) {
    case 'project-need': {
      const ngo = await signIn(w.email(`need-on-${tag}`));
      await ensureVerified(sut, ngo);
      const organizationId = await completeNgo(sut, ngo, `Need Host ${tag}`);
      return { session: ngo, subject: { route, organizationId, action: 'start', title: `Need ${tag}` } };
    }
    case 'complete-signup': {
      const fresh = await signIn(w.email(`signup-on-${tag}`));
      await ensureVerified(sut, fresh);
      return { session: fresh, subject: { route, name: `Signup Org ${tag}` } };
    }
    case 'create-organization': {
      const ngo = await signIn(w.email(`create-on-${tag}`));
      await ensureVerified(sut, ngo);
      await completeNgo(sut, ngo, `Create Host ${tag}`);
      return { session: ngo, subject: { route, name: `Created ${tag}` } };
    }
    case 'update-organization': {
      const ngo = await signIn(w.email(`rename-on-${tag}`));
      await ensureVerified(sut, ngo);
      const organizationId = await completeNgo(sut, ngo, `Rename Host ${tag}`);
      return { session: ngo, subject: { route, organizationId, name: `Renamed ${tag}` } };
    }
    case 'set-organization-profile': {
      const ngo = await signIn(w.email(`profile-on-${tag}`));
      await ensureVerified(sut, ngo);
      const organizationId = await completeNgo(sut, ngo, `Profile Host ${tag}`);
      return {
        session: ngo,
        subject: {
          route,
          organizationId,
          name: `Profiled ${tag}`,
          mission: `mission ${tag}`,
          country: `country ${tag}`,
          website: `website ${tag}`,
          logo: `logo ${tag}`,
        },
      };
    }
    case 'transfer-organization-contact': {
      const admin = await sut.provisionPlatformAdmin(w.email(`xfer-admin-${tag}`), PASSWORD);
      const from = await signIn(w.email(`xfer-from-on-${tag}`));
      const organizationId = await completeNgo(sut, from, `Xfer From ${tag}`);
      const to = await signIn(w.email(`xfer-to-on-${tag}`));
      await completeNgo(sut, to, `Xfer To ${tag}`);
      return {
        session: admin,
        subject: {
          route,
          organizationId,
          fromAccountId: from.accountId,
          toAccountId: to.accountId,
          reason: AUP_REASON,
        },
      };
    }
    case 'set-escalation-contact': {
      const admin = await sut.provisionPlatformAdmin(w.email(`esc-admin-${tag}`), PASSWORD);
      const ngo = await signIn(w.email(`esc-org-${tag}`));
      await ensureVerified(sut, ngo);
      const organizationId = await completeNgo(sut, ngo, `Escalation Host ${tag}`);
      return {
        session: admin,
        subject: { route, organizationId, name: 'Maya Lindqvist', email: w.email(`esc-on-${tag}`) },
      };
    }
    case 'set-account-lifecycle': {
      const admin = await sut.provisionPlatformAdmin(w.email(`life-admin-${tag}`), PASSWORD);
      const subjectAccount = await signIn(w.email(`life-subject-${tag}`));
      await ensureVerified(sut, subjectAccount);
      await completeNgo(sut, subjectAccount, `Life Subject ${tag}`);
      return {
        session: admin,
        subject: { route, accountId: subjectAccount.accountId, lifecycle: 'deactivated', reason: AUP_REASON },
      };
    }
    case 'set-organization-vetting': {
      const admin = await sut.provisionPlatformAdmin(w.email(`vet-admin-${tag}`), PASSWORD);
      const ngo = await signIn(w.email(`vet-org-${tag}`));
      await ensureVerified(sut, ngo);
      const organizationId = await completeNgo(sut, ngo, `Vet Host ${tag}`);
      return {
        session: admin,
        subject: {
          route,
          organizationId,
          action: 'vet',
          organizationName: `Vet Host ${tag}`,
          publicReferenceUrl: 'https://example.org/vet-reference',
          contactName: 'Dana Okonkwo',
          contactTitle: 'Executive Director',
          authorityAttestation: 'The named contact attests authority to bind the organisation.',
          evidenceType: 'organization_website',
          note: `founder vet ${tag}`,
        },
      };
    }
    case 'set-organization-discovery': {
      const admin = await sut.provisionPlatformAdmin(w.email(`disc-switch-admin-${tag}`), PASSWORD);
      const ngo = await signIn(w.email(`disc-switch-org-${tag}`));
      await ensureVerified(sut, ngo);
      const organizationId = await completeNgo(sut, ngo, `Discovery Switch Host ${tag}`);
      return {
        session: admin,
        subject: { route, organizationId, enabled: true, reason: `founder discovery switch ${tag}` },
      };
    }
    case 'discovery-allowance': {
      const ngo = await signIn(w.email(`allowance-on-${tag}`));
      await ensureVerified(sut, ngo);
      const organizationId = await completeNgo(sut, ngo, `Allowance Host ${tag}`);
      return { session: ngo, subject: { route, organizationId, action: 'read' } };
    }
    case 'discovery-message': {
      const session =
        accountType === 'volunteer'
          ? await (async () => {
              const volunteer = await signIn(w.email(`disc-vol-${tag}`));
              await ensureVerified(sut, volunteer);
              await completeVolunteer(sut, volunteer, `disc-${tag}-${volunteer.accountId.slice(0, 8)}`);
              return volunteer;
            })()
          : accountType === 'ngo'
            ? await (async () => {
                const ngo = await signIn(w.email(`disc-ngo-${tag}`));
                await ensureVerified(sut, ngo);
                await completeNgo(sut, ngo, `Disc Host ${tag}`);
                return ngo;
              })()
            : await sut.provisionPlatformAdmin(w.email(`disc-admin-${tag}`), PASSWORD);
      return { session, subject: { route, message: `hello ${tag}` } };
    }
    case 'discovery-scope': {
      const ngo = await signIn(w.email(`scope-on-${tag}`));
      await ensureVerified(sut, ngo);
      const organizationId = await completeNgo(sut, ngo, `Scope Host ${tag}`);
      return {
        session: ngo,
        subject: { route, organizationId, projectId: '00000000-0000-4000-8000-000000000001', action: 'generate' },
      };
    }
    case 'discovery-brief': {
      const ngo = await signIn(w.email(`brief-on-${tag}`));
      await ensureVerified(sut, ngo);
      const organizationId = await completeNgo(sut, ngo, `Brief Host ${tag}`);
      return {
        session: ngo,
        subject: {
          route, organizationId, projectId: '00000000-0000-4000-8000-000000000001', action: 'edit',
          sectionId: 'need', text: `brief ${tag}`, baseRevision: 1,
        },
      };
    }
  }
}

export async function assertDeactivationGatesEveryWrite(
  sut: AccountsSut,
  w: World,
  tag: string,
  signIn: (email: string) => Promise<Session>,
  options: { skipStandIn: boolean; discoveryNeedsProvider?: boolean },
): Promise<void> {
  const actors = await provisionLifecycleActors(sut, w, tag, signIn);
  expect(writeRouteProblems(), 'the write-route conformance scan found a problem').toEqual([]);

  for (const name of Object.keys(WRITE_ROUTES) as WriteRouteName[]) {
    const row = WRITE_ROUTES[name];
    if (options.skipStandIn && (row.surface as RouteSurface).kind === 'stand-in') continue;

    if (name === 'complete-signup') {
      const subjectOff: WriteSubject = { route: 'complete-signup', name: `Write ${tag} complete-signup ngo deactivated` };
      const before = await snapshotWrite(sut, actors.ngoOff, subjectOff);
      const refused = await sut.attemptWrite(subjectOff, actors.ngoOff);
      expect(refused.ok, 'a deactivated NGO succeeded at complete-signup').toBe(false);
      if (refused.ok) return;
      expect(refused.kind, 'a deactivated NGO was refused complete-signup for a reason other than deactivation').toBe(
        'account-deactivated',
      );
      expect(refused.status).toBe(403);
      expect(await snapshotWrite(sut, actors.ngoOff, subjectOff), 'the refused complete-signup write changed state').toEqual(before);

      const fresh = await provisionActiveControl(sut, w, `${tag}-complete-signup`, signIn, 'complete-signup', 'ngo');
      const allowed = await sut.attemptWrite(fresh.subject, fresh.session);
      expect(allowed, 'an active uncompleted account was refused complete-signup').toMatchObject({ ok: true });
      continue;
    }

    if (row.standing.kind !== 'account-required') continue;
    for (const accountType of row.standing.admits) {
      const deactivated = sessionOf(actors, accountType, 'deactivated');
      const subjectOff = deactivatedSubject(actors, w, tag, name, accountType);
      const before = await snapshotWrite(sut, deactivated, subjectOff);
      const refused = await sut.attemptWrite(subjectOff, deactivated);
      expect(refused.ok, `a deactivated ${accountType} succeeded at ${name}`).toBe(false);
      if (refused.ok) return;
      expect(refused.kind, `a deactivated ${accountType} was refused ${name} for a reason other than deactivation`).toBe(
        'account-deactivated',
      );
      expect(refused.status).toBe(403);
      expect(await snapshotWrite(sut, deactivated, subjectOff), `the refused ${name} write by a deactivated ${accountType} changed state`).toEqual(
        before,
      );

      const fresh = await provisionActiveControl(sut, w, `${tag}-${name}-${accountType}`, signIn, name, accountType);
      const allowed = await sut.attemptWrite(fresh.subject, fresh.session);
      if ((name === 'discovery-message' || name === 'discovery-scope' || name === 'discovery-brief') && options.discoveryNeedsProvider) {
        expect(
          allowed.ok || allowed.kind !== 'account-deactivated',
          `an active ${accountType} was refused ${name} as account-deactivated`,
        ).toBe(true);
      } else {
        expect(allowed, `an active ${accountType} was refused ${name}`).toMatchObject({ ok: true });
      }
    }
  }
}

export async function at00129(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  await assertDeactivationGatesEveryWrite(sut, w, '29', (email) => registerConfirmAndSignIn(sut, email), {
    skipStandIn: false, discoveryNeedsProvider: true,
  });
}

export async function at00130(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const admin = await sut.provisionPlatformAdmin(w.email('admin-30'), PASSWORD);
  const volunteer = await registerConfirmAndSignIn(sut, w.email('vol-30'));
  await completeVolunteer(sut, volunteer, `vol-30-${volunteer.accountId.slice(0, 8)}`);

  const url = (process.env.AT_SUPABASE_URL ?? '').replace(/\/$/, '');
  const anonKey = process.env.AT_SUPABASE_ANON_KEY ?? '';
  expect(url && anonKey, 'this child holds no stack coordinates, so the live token cannot be presented to Auth').toBeTruthy();
  const grant = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: volunteer.email, password: PASSWORD }),
  });
  const granted = (await grant.json()) as { access_token?: string };
  const token = granted.access_token ?? '';
  expect(token, 'the volunteer could not obtain a live access token before deactivation').not.toBe('');

  const deactivated = await sut.setAccountLifecycle(admin, {
    accountId: volunteer.accountId,
    lifecycle: 'deactivated',
    reason: AUP_REASON,
  });
  expect(deactivated, 'the administrator could not deactivate the volunteer').toMatchObject({ ok: true, changed: true });
  expect(await sut.account(volunteer.accountId)).toMatchObject({ lifecycle: 'deactivated' });

  const before = await sut.organizationsNamed('Volunteer Org 30');
  const refused = await sut.attemptWrite({ route: 'create-organization', name: 'Volunteer Org 30' }, volunteer);
  expect(refused.ok, 'the deactivated volunteer created an organisation').toBe(false);
  if (refused.ok) return;
  expect(refused.kind, 'the volunteer was refused for a reason other than deactivation').toBe('account-deactivated');
  expect(await sut.organizationsNamed('Volunteer Org 30'), 'the refused write still created an organisation').toEqual(before);
  expect(await sut.sendDiscoveryMessage(volunteer, 'Hello')).toMatchObject({ ok: false, kind: 'account-deactivated', status: 403 });
  expect(await sut.discoveryMessagesBy(volunteer.accountId)).toEqual([]);

  const me = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  expect(me.status, 'the volunteer token stopped answering at Auth, so the refusal is not the product lifecycle').toBe(200);

  throw new CapabilityPending(['gateway.virtual-key-revocation']);
}

export async function at00131(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const actors = await provisionLifecycleActors(sut, w, '31', (email) => registerConfirmAndSignIn(sut, email));

  const memberOrg = await sut.createOrganizationAsOperator(`Member 31`);
  const granted = await sut.grantMembershipAsOperator(memberOrg.id, actors.ngoOff.accountId, 'member');
  expect(granted, 'the operator could not seat the NGO as member').toMatchObject({ ok: true });

  const reNgo = await sut.setAccountLifecycle(actors.admin, {
    accountId: actors.ngoOff.accountId,
    lifecycle: 'active',
    reason: REENABLE_REASON,
  });
  expect(reNgo, 'the administrator could not re-enable the NGO').toMatchObject({ ok: true, changed: true });
  const reVol = await sut.setAccountLifecycle(actors.admin, {
    accountId: actors.volunteerOff.accountId,
    lifecycle: 'active',
    reason: REENABLE_REASON,
  });
  expect(reVol, 'the administrator could not re-enable the volunteer').toMatchObject({ ok: true, changed: true });

  const renamed = await sut.attemptWrite(
    { route: 'update-organization', organizationId: actors.ngoOffOrg, name: 'Riverside Re-enabled 31' },
    actors.ngoOff,
  );
  expect(renamed, 'the re-enabled NGO was refused an otherwise-authorized rename').toMatchObject({ ok: true });

  const sent = await sut.attemptWrite(
    { route: 'discovery-message', message: 're-enabled volunteer message' },
    actors.volunteerOff,
  );
  expect(sent).toMatchObject({ ok: false, kind: 'not-an-ngo-account', status: 403 });

  const memberWrite = await sut.updateOrganization(actors.ngoOff, memberOrg.id, 'Member Rename 31');
  expect(memberWrite.ok, 'the re-enabled NGO renamed an organisation where it holds member').toBe(false);
  if (memberWrite.ok) return;
  expect(memberWrite.kind, 'the member-role refusal is not the independent gate').toBe('not-an-admin');

  const volunteerWrite = await sut.attemptWrite({ route: 'create-organization', name: 'Volunteer Org 31' }, actors.volunteerOff);
  expect(volunteerWrite.ok, 'the re-enabled volunteer created an organisation').toBe(false);
  if (volunteerWrite.ok) return;
  expect(volunteerWrite.kind, 'the volunteer NGO-only refusal is not the independent type gate').toBe('not-an-ngo-account');
  expect(await sut.organizationsNamed('Volunteer Org 31'), 'the refused volunteer write created an organisation').toEqual([]);

  const self = await sut.setAccountLifecycle(actors.adminOff, {
    accountId: actors.adminOff.accountId,
    lifecycle: 'active',
    reason: REENABLE_REASON,
  });
  expect(self.ok, 'a deactivated administrator re-enabled itself').toBe(false);
  if (self.ok) return;
  expect(self.kind, 'the self re-enable was refused for a reason other than deactivation').toBe('account-deactivated');
  expect(await sut.account(actors.adminOff.accountId)).toMatchObject({ lifecycle: 'deactivated' });

  const byOther = await sut.setAccountLifecycle(actors.adminOther, {
    accountId: actors.adminOff.accountId,
    lifecycle: 'active',
    reason: REENABLE_REASON,
  });
  expect(byOther, 'the second administrator could not re-enable the first').toMatchObject({ ok: true, changed: true });

  throw new CapabilityPending(['gateway.virtual-key-reissue']);
}

export async function assertAppendOnlyAudit(
  sut: Opened['sut'],
  w: Opened['w'],
  tag: string,
  signIn: (email: string) => Promise<Session>,
  options?: { checkPrivileges?: boolean },
): Promise<void> {
  const given = await transferGiven(sut, w, tag, signIn);
  const roleChanged = (rows: AuditEventRow[]) => rows.filter((row) => row.eventKind === 'org_role_changed');
  const beforeTransfer = roleChanged(await sut.auditEvents({ subjectOrgId: given.organizationId }));
  const transfer = await sut.transferOrganizationContact(given.admin, {
    organizationId: given.organizationId,
    fromAccountId: given.a.accountId,
    toAccountId: given.b.accountId,
    reason: HANDOVER_REASON,
  });
  expect(transfer, 'the platform administrator was refused the transfer, so there is no transfer audit to keep').toMatchObject({
    ok: true,
  });
  if (!transfer.ok) return;

  const afterTransfer = roleChanged(await sut.auditEvents({ subjectOrgId: given.organizationId }));
  const newAfterTransfer = afterTransfer.filter((row) => !beforeTransfer.some((prior) => prior.id === row.id));
  expect(newAfterTransfer, 'the transfer did not leave exactly one new org_role_changed row').toHaveLength(1);
  expect(newAfterTransfer[0], 'the transfer role-change row is not the seat-repointed administrator row').toMatchObject({
    reason: 'seat repointed',
    actorAccountId: given.admin.accountId,
    detail: { old_account_id: given.a.accountId, new_account_id: given.b.accountId },
  });

  const beforeRepoint = roleChanged(await sut.auditEvents({ subjectOrgId: given.organizationId }));
  const repointed = await sut.repointMembershipAsOperator(given.organizationId, given.a.accountId);
  expect(repointed, 'the operator could not re-point the transferred seat, so there is no operator role-change row').toMatchObject({
    ok: true,
  });

  const afterRepoint = roleChanged(await sut.auditEvents({ subjectOrgId: given.organizationId }));
  const newAfterRepoint = afterRepoint.filter((row) => !beforeRepoint.some((prior) => prior.id === row.id));
  expect(newAfterRepoint, 'the operator re-point did not leave exactly one new org_role_changed row').toHaveLength(1);
  expect(newAfterRepoint[0], 'the operator role-change row is not the seat-repointed operator row').toMatchObject({
    reason: 'seat repointed',
    actorAccountId: null,
    actorLabel: 'operator',
  });

  const orgEvents = await sut.auditEvents({ subjectOrgId: given.organizationId });
  expect(
    orgEvents.filter((row) => row.eventKind === 'org_contact_transferred'),
    'the transfer left no org_contact_transferred row',
  ).toHaveLength(1);
  expect(
    (await sut.auditEvents({ subjectAccountId: given.a.accountId })).filter((row) => row.eventKind === 'account_lifecycle_changed'),
    'the deactivation left no account_lifecycle_changed row',
  ).toHaveLength(1);

  const before = await sut.auditEvents({});
  expect(before.length, 'the Given left no audit row to protect').toBeGreaterThan(0);
  for (const attempt of ['update', 'delete', 'truncate'] as const) {
    const tamper = await sut.attemptAuditTamper(attempt);
    expect(tamper.ok, `the operator ${attempt} of the audit record succeeded`).toBe(false);
    expect(await sut.auditEvents({}), `the operator ${attempt} removed or changed an audit row`).toEqual(before);
  }

  if (options?.checkPrivileges) {
    const facts = await sut.tenantTableFacts();
    const audit = facts.tables.find((row) => row.table === 'audit_events');
    expect(audit, 'the live catalog has no row for audit_events').toBeDefined();
    if (!audit) return;
    expect(audit.anon, 'audit_events anon privileges').toEqual([]);
    expect(audit.authenticated, 'audit_events authenticated privileges').toEqual([]);
    expect(audit.serviceRole, 'audit_events service_role privileges').toEqual([]);
  }
}

export async function at00133(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  await assertAppendOnlyAudit(sut, w, '33', (email) => registerConfirmAndSignIn(sut, email), { checkPrivileges: true });
}

export async function at00134(ctx: { open: () => Promise<unknown> }): Promise<void> {
  await ctx.open();
  throw new CapabilityPending(['vendors.gotrue-sign-in-rate-limit']);
}

function refusesWith(capability: string): (ctx: Ctx) => Promise<void> {
  return async (ctx: Ctx): Promise<void> => {
    await ctx.open();
    throw new CapabilityPending([capability]);
  };
}

export const at00105 = refusesWith('vendors.github-public-statistics');

export async function at00110(ctx: Ctx): Promise<void> {
  const { w, sut } = await ctx.open();
  const session = await registerConfirmAndSignIn(sut, w.email('ngo-discovery-unverified'));
  await completeNgo(sut, session, 'Discovery verification NGO');
  await sut.clearEmailConfirmationAsOperator(session.accountId);
  expect(
    await sut.emailVerified(session.accountId),
    'this test is about an UNVERIFIED account; if it is verified, nothing below is about the email floor',
  ).toBe(false);
  const blocked = await sut.sendDiscoveryMessage(session, 'Help us scope our reporting tracker.');
  expect(blocked.ok, 'an unverified account was allowed to send a Discovery message').toBe(false);
  if (blocked.ok) return;
  expect(blocked).toMatchObject({ kind: 'email-unverified', status: 409 });
  expect(blocked.reason, 'the refusal does not name verification').toMatch(/verif/i);
  expect(blocked.reason, 'the refusal does not name the email address as what needs verifying').toMatch(/email/i);
  expect(await sut.discoveryMessagesBy(session.accountId), 'the blocked Discovery message was recorded anyway').toEqual([]);
}
