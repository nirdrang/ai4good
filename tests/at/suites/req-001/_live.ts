import { emailVerifiedFromUser } from '../../../../supabase/functions/_shared/verification.ts';
import { parseWriteRefusalKind, type WriteRouteName } from '../../../../supabase/functions/_shared/write-routes.ts';
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';
import { AT_CONFIG } from '../../harness/atconfig.ts';
import {
  authDelete,
  authPost,
  followLink,
  functionPost,
  mailIdentification,
  sqlClient,
  verifyLinksFor,
  type Stack,
} from '../../harness/live-stack.ts';
import { CapabilityPending } from '../../harness/pending.ts';
import type {
  AccountRow,
  AccountsSut,
  AcknowledgmentRow,
  AssignVolunteerOutcome,
  AuditEventRow,
  CompleteSignupOutcome,
  CompleteSignupRequest,
  CreateOrganizationOutcome,
  EscalationContactRow,
  EscalationOutcome,
  GrantMembershipOutcome,
  LifecycleOutcome,
  MembershipRow,
  OrganizationRow,
  ProjectRow,
  RefreshSessionOutcome,
  RepointMembershipOutcome,
  Session,
  SignInOutcome,
  TamperOutcome,
  TransferOutcome,
  UpdateOrganizationOutcome,
  VolunteerProfileRow,
  World,
  WriteAttemptOutcome,
  WriteRefusal,
} from './_contract.ts';
import { liveTenantReads, type JwtClaims } from './_live-tenant-reads.ts';

function asOrganizationRow(row: {
  id: string;
  name: string;
  mission: string | null;
  country: string | null;
  website: string | null;
  logo: string | null;
}): OrganizationRow {
  return {
    id: String(row.id),
    name: row.name,
    mission: row.mission ?? null,
    country: row.country ?? null,
    website: row.website ?? null,
    logo: row.logo ?? null,
  };
}

export const requirement = 'req-001' as const;

interface LiveSession {
  accessToken: string;
  refreshToken: string;
}

function tokensOf(store: Map<string, LiveSession>, session: Session, act: string): LiveSession {
  const held = session.sessionId ? store.get(session.sessionId) : undefined;
  if (!held) {
    throw new Error(
      `refusing to ${act}: this handle names account ${session.accountId} and holds NO session. On the live stack a ` +
        `registration under enable_confirmations = true issues no tokens, so the handle it returns cannot act. Follow ` +
        `the live public order — register, use the emailed verification link, sign in — and act with the sign-in's ` +
        `session. Nothing was fabricated to make this call work.`,
    );
  }
  return held;
}

function claimsOf(token: string): JwtClaims {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as JwtClaims;
}

function sessionIdOf(accessToken: string): string {
  return String(claimsOf(accessToken).session_id ?? '');
}

function accountIdOf(accessToken: string): string {
  return String(claimsOf(accessToken).sub ?? '');
}

function lifetimeOf(accessToken: string): number {
  const claims = claimsOf(accessToken);
  return Number(claims.exp) - Number(claims.iat);
}

export function lifetimeProblem(accessToken: string, pinned: number): string | null {
  const issued = lifetimeOf(accessToken);
  if (issued === pinned) return null;
  return (
    `the running stack issues ${issued}-second access tokens, but supabase/config.toml pins jwt_expiry = ${pinned} ` +
    `(the registry entry accessTokenLifetimeSeconds carries the same number). The stack was started before that ` +
    `config last changed: run \`bun run db:stop\` then \`bun run db:start\`, and run this tier again.`
  );
}

/**
 * The postgres client reports the SQLSTATE in `errno`; its `code` is the client error class.
 * Every candidate field is read and the one shaped like a SQLSTATE wins.
 */
function databaseRefusal(error: unknown): { code: string; message: string } {
  const carrier = error as Record<string, unknown> | null;
  let code = '';
  for (const field of ['errno', 'errcode', 'code'] as const) {
    const value = carrier?.[field];
    if (typeof value === 'string' && /^[0-9A-Z]{5}$/.test(value)) {
      code = value;
      break;
    }
  }
  const message = typeof carrier?.message === 'string' ? carrier.message : String(error);
  return { code, message };
}

export async function createLiveAdapter(opts: { stack: Stack }): Promise<{
  sut: { accounts: AccountsSut };
  fixtures: { world(name: string): Promise<World> };
  teardown(): Promise<void>;
}> {
  const { stack } = opts;
  const api = stack.apiUrl.replace(/\/$/, '');
  await mailIdentification(stack);
  const sql = sqlClient(stack);

  const sessions = new Map<string, LiveSession>();

  let lifetimeChecked = false;
  const checkLifetime = (accessToken: string): void => {
    if (lifetimeChecked) return;
    const problem = lifetimeProblem(accessToken, AT_CONFIG.accessTokenLifetimeSeconds.value);
    if (problem) throw new Error(problem);
    lifetimeChecked = true;
  };

  const rows = async <T>(query: Promise<unknown>): Promise<T[]> => (await query) as T[];

  const postWrite = async (
    name: string,
    session: Session | null,
    body: Record<string, unknown>,
  ): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; json: Record<string, unknown>; refusal: WriteRefusal }> => {
    const bearer = session === null ? stack.anonKey : tokensOf(sessions, session, `call the deployed ${name}`).accessToken;
    const { status, json } = await functionPost(stack, name, body, bearer, '203.0.113.7');
    if (status < 400 && json.ok !== false) return { ok: true, json };
    const reason = String(json.reason ?? json.msg ?? json.message ?? `the deployed ${name} answered ${status}`);
    const kind = status === 401 ? 'unauthenticated' : parseWriteRefusalKind(json.kind);
    return { ok: false, json, refusal: { ok: false, kind, status, reason } };
  };

  const sendDiscoveryMessage = async (session: Session | null, message: string): Promise<Awaited<ReturnType<AccountsSut['sendDiscoveryMessage']>>> => {
    const held = session === null ? [] : await rows<{ org_id: string; lifecycle: string; account_type: string }>(sql`select m.org_id, a.lifecycle, a.account_type
      from public.org_memberships m join public.accounts a on a.id = m.account_id
      where m.account_id = ${session.accountId}::uuid`);
    const actor = held[0];
    let projectId: string = crypto.randomUUID();
    if (actor?.lifecycle === 'active' && actor.account_type === 'ngo') {
      const projects = await rows<{ project_id: string }>(sql`select project_id from public.need_intakes where org_id = ${actor.org_id}::uuid limit 1`);
      if (projects.length > 0) projectId = projects[0].project_id;
      else {
        const started = await postWrite('project-need', session, { organizationId: actor.org_id, action: 'start',
          title: 'Discovery verification', description: 'Coordinate our NGO reporting deadlines.' });
        if (!started.ok) return started.refusal;
        projectId = (started.json.need as { projectId: string }).projectId;
        const submitted = await postWrite('project-need', session, { organizationId: actor.org_id, action: 'submit', projectId });
        if (!submitted.ok) return submitted.refusal;
      }
    }
    const answer = await postWrite('discovery-message', session, { organizationId: actor?.org_id ?? null, projectId, message,
      mode: 'answer', userMessageId: crypto.randomUUID(), answers: [], expectedCharge: 'free' });
    return answer.ok ? { ok: true } : answer.refusal;
  };

  const accounts: AccountsSut = {
    registerWithEmailPassword: async (email, password) => {
      const { status, json } = await authPost(stack, '/auth/v1/signup', { email, password });
      if (status >= 400) throw new Error(`the live signup for a fresh address answered ${status}`);
      const accountId = String((json.id as string | undefined) ?? (json.user as { id?: string } | undefined)?.id ?? '');
      if (!accountId) throw new Error('the live signup answered 200 but named no user id');
      return { accountId, email, provider: 'email', sessionId: '' };
    },

    signInWithEmailPassword: async (email, password) => {
      const { status, json } = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
      if (status >= 400) {
        return { ok: false, reason: String(json.msg ?? json.error_description ?? 'sign-in was refused') };
      }
      const accessToken = String(json.access_token ?? '');
      const refreshToken = String(json.refresh_token ?? '');
      if (!accessToken) return { ok: false, reason: 'sign-in answered 200 with no access token' };
      checkLifetime(accessToken);
      const sessionId = sessionIdOf(accessToken);
      sessions.set(sessionId, { accessToken, refreshToken });
      return { ok: true, session: { accountId: accountIdOf(accessToken), email, provider: 'email', sessionId } };
    },

    /*
     * The double cast is required: `${text}::jsonb` binds a JSON string scalar, so
     * `identity_data->>'user_name'` is null and GoTrue's `/auth/v1/user` answers 500.
     */
    linkGithubIdentity: async (session, githubHandle) => {
      tokensOf(sessions, session, 'link a GitHub identity');
      const identityId = crypto.randomUUID();
      await sql`
        insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        values (
          ${identityId}::uuid,
          ${githubHandle},
          ${session.accountId}::uuid,
          ${JSON.stringify({ sub: githubHandle, user_name: githubHandle, provider_id: githubHandle })}::text::jsonb,
          'github',
          now(), now(), now()
        )
      `;
    },

    unlinkGithubIdentity: async (session, provider) => {
      const tokens = tokensOf(sessions, session, 'unlink an identity');
      const me = await fetch(`${api}/auth/v1/user`, {
        headers: { apikey: stack.anonKey, Authorization: `Bearer ${tokens.accessToken}` },
      });
      let json: Record<string, unknown> = {};
      const text = await me.text();
      if (text) {
        try {
          json = JSON.parse(text) as Record<string, unknown>;
        } catch {
          json = { raw: text };
        }
      }
      const identities = Array.isArray(json.identities) ? json.identities : [];
      const identity = identities.find(
        (row): row is { identity_id?: unknown; id?: unknown; provider?: unknown } =>
          typeof row === 'object' && row !== null && (row as { provider?: unknown }).provider === provider,
      );
      const identityId = String(identity?.identity_id ?? identity?.id ?? '');
      if (!identityId) throw new Error(`the live user has no ${provider} identity to unlink`);
      await authDelete(stack, `/auth/v1/user/identities/${identityId}`, tokens.accessToken);
    },

    linkedIdentities: async (accountId) => {
      const found = await rows<{ provider: string }>(
        sql`select provider from auth.identities where user_id = ${accountId}::uuid order by provider`,
      );
      return found.map((row) => ({ provider: String(row.provider) }));
    },

    authUserIsHealthy: async (session) => {
      const tokens = tokensOf(sessions, session, 'read the auth user');
      const me = await fetch(`${api}/auth/v1/user`, {
        headers: { apikey: stack.anonKey, Authorization: `Bearer ${tokens.accessToken}` },
      });
      await me.text();
      return me.status === 200;
    },

    signOut: async (session) => {
      const tokens = tokensOf(sessions, session, 'sign out');
      const response = await fetch(`${api}/auth/v1/logout?scope=local`, {
        method: 'POST',
        headers: { apikey: stack.anonKey, Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (response.status >= 400) throw new Error(`the live logout answered ${response.status}`);
    },

    refreshSession: async (session): Promise<RefreshSessionOutcome> => {
      const tokens = tokensOf(sessions, session, 'refresh a session');
      const { status, json } = await authPost(stack, '/auth/v1/token?grant_type=refresh_token', { refresh_token: tokens.refreshToken });
      if (status >= 400) return { ok: false, reason: String(json.msg ?? 'the refresh was refused') };
      const accessToken = String(json.access_token ?? '');
      if (!accessToken) return { ok: false, reason: 'the refresh answered 200 with no access token' };
      checkLifetime(accessToken);
      const sessionId = sessionIdOf(accessToken);
      sessions.set(sessionId, { accessToken, refreshToken: String(json.refresh_token ?? tokens.refreshToken) });
      return { ok: true, session: { ...session, sessionId } };
    },

    sessionsOf: async (accountId) => {
      const found = await rows<{ id: string }>(sql`select id from auth.sessions where user_id = ${accountId}::uuid order by created_at`);
      return found.map((row) => ({ sessionId: String(row.id) }));
    },

    requestPasswordReset: async (email) => {
      await authPost(stack, '/auth/v1/recover', { email });
      return { ok: true };
    },

    emailedPasswordResetLink: async (email) => (await verifyLinksFor(stack, email, 'recovery'))[0] ?? null,

    completePasswordReset: async (link, newPassword) => {
      const { location } = await followLink(link);
      const fragment = location.includes('#') ? location.slice(location.indexOf('#') + 1) : '';
      const accessToken = new URLSearchParams(fragment).get('access_token') ?? '';
      if (!accessToken) return { ok: false };
      const update = await fetch(`${api}/auth/v1/user`, {
        method: 'PUT',
        headers: { apikey: stack.anonKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      return { ok: update.status < 400 };
    },

    emailVerified: async (accountId) => {
      const found = await rows<{ email_confirmed_at: string | Date | null; email: string }>(
        sql`select email, email_confirmed_at from auth.users where id = ${accountId}::uuid`,
      );
      if (found.length !== 1) return false;
      const confirmedAt = found[0].email_confirmed_at;
      return emailVerifiedFromUser({
        id: accountId,
        email: found[0].email,
        email_confirmed_at: confirmedAt === null ? null : new Date(confirmedAt).toISOString(),
      });
    },

    emailedVerificationLink: async (email) => (await verifyLinksFor(stack, email, 'signup'))[0] ?? null,

    useVerificationLink: async (link) => {
      const { status } = await followLink(link);
      // GoTrue answers a 303 for a token it never issued as well, so the status is not the oracle.
      return { ok: status < 400 };
    },

    completeSignup: async (session, request: CompleteSignupRequest, ip): Promise<CompleteSignupOutcome> => {
      const tokens = tokensOf(sessions, session, 'call the deployed complete-signup');
      const { status, json } = await functionPost(stack, 'complete-signup', request, tokens.accessToken, ip);
      if (status >= 400 || json.ok === false) {
        const reason = String(json.reason ?? json.msg ?? `the deployed complete-signup answered ${status}`);
        const kind = status === 401 ? 'unauthenticated' : parseWriteRefusalKind(json.kind);
        return { ok: false, kind, status, reason };
      }
      return {
        ok: true,
        accountId: String(json.accountId ?? ''),
        organizationId: (json.organizationId as string | null) ?? null,
      };
    },

    createOrganization: async (session, organizationName): Promise<CreateOrganizationOutcome> => {
      const answer = await postWrite('create-organization', session, { name: organizationName });
      if (!answer.ok) return answer.refusal;
      return { ok: true, organizationId: String(answer.json.organizationId ?? '') };
    },

    updateOrganization: async (session, organizationId, name): Promise<UpdateOrganizationOutcome> => {
      const answer = await postWrite('update-organization', session, { organizationId, name });
      if (!answer.ok) return answer.refusal;
      return {
        ok: true,
        organizationId: String(answer.json.organizationId ?? organizationId),
        name: String(answer.json.name ?? ''),
      };
    },

    createOrganizationAsOperator: async (name): Promise<OrganizationRow> => {
      const created = await rows<{
        id: string;
        name: string;
        mission: string | null;
        country: string | null;
        website: string | null;
        logo: string | null;
      }>(
        sql`insert into public.organizations (name) values (${name}) returning id, name, mission, country, website, logo`,
      );
      if (created.length !== 1) throw new Error(`the operator insert of organisation ${JSON.stringify(name)} returned no row`);
      return asOrganizationRow(created[0]);
    },

    grantMembershipAsOperator: async (organizationId, accountId, role): Promise<GrantMembershipOutcome> => {
      try {
        const inserted = await rows<{ organization_id: string; account_id: string; role: MembershipRow['role'] }>(
          sql`insert into public.org_memberships (org_id, account_id, role)
              values (${organizationId}::uuid, ${accountId}::uuid, ${role}::public.org_role)
              returning org_id as organization_id, account_id, role`,
        );
        if (inserted.length !== 1) throw new Error('the operator membership insert returned no row');
        return {
          ok: true,
          membership: {
            organizationId: String(inserted[0].organization_id),
            accountId: String(inserted[0].account_id),
            role: inserted[0].role,
          },
        };
      } catch (error) {
        const { code, message } = databaseRefusal(error);
        if (/NGO accounts only/i.test(message) && (code === '' || code === '42501')) {
          return { ok: false, kind: 'not-an-ngo-account', reason: message };
        }
        if (/org_memberships_one_seat_per_org_idx/i.test(message) && (code === '' || code === '23505')) {
          return { ok: false, kind: 'org-already-seated', reason: message };
        }
        return { ok: false, kind: 'refused', reason: message };
      }
    },

    repointMembershipAsOperator: async (organizationId, accountId): Promise<RepointMembershipOutcome> => {
      try {
        const updated = await rows<{ organization_id: string; account_id: string; role: MembershipRow['role'] }>(
          sql`update public.org_memberships set account_id = ${accountId}::uuid
               where org_id = ${organizationId}::uuid
           returning org_id as organization_id, account_id, role`,
        );
        if (updated.length !== 1) {
          return { ok: false, kind: 'refused', reason: `no membership row exists in organisation ${organizationId} to re-point` };
        }
        return {
          ok: true,
          membership: {
            organizationId: String(updated[0].organization_id),
            accountId: String(updated[0].account_id),
            role: updated[0].role,
          },
        };
      } catch (error) {
        const { code, message } = databaseRefusal(error);
        if (/NGO accounts only/i.test(message) && (code === '' || code === '42501')) {
          return { ok: false, kind: 'not-an-ngo-account', reason: message };
        }
        return { ok: false, kind: 'refused', reason: message };
      }
    },

    createProjectAsOperator: async (organizationId, name): Promise<ProjectRow> => {
      const created = await rows<{ id: string; org_id: string; name: string; assigned_volunteer_id: string | null }>(
        sql`insert into public.projects (org_id, name) values (${organizationId}::uuid, ${name})
            returning id, org_id, name, assigned_volunteer_id`,
      );
      if (created.length !== 1) throw new Error(`the operator insert of project ${JSON.stringify(name)} returned no row`);
      return {
        id: String(created[0].id),
        organizationId: String(created[0].org_id),
        name: created[0].name,
        assignedVolunteerId: created[0].assigned_volunteer_id === null ? null : String(created[0].assigned_volunteer_id),
      };
    },

    assignVolunteerAsOperator: async (projectId, accountId): Promise<AssignVolunteerOutcome> => {
      try {
        const updated = await rows<{ id: string; org_id: string; name: string; assigned_volunteer_id: string | null }>(
          sql`update public.projects set assigned_volunteer_id = ${accountId}::uuid
               where id = ${projectId}::uuid
           returning id, org_id, name, assigned_volunteer_id`,
        );
        if (updated.length !== 1) return { ok: false, kind: 'refused', reason: `no project ${projectId} exists` };
        return {
          ok: true,
          project: {
            id: String(updated[0].id),
            organizationId: String(updated[0].org_id),
            name: updated[0].name,
            assignedVolunteerId: updated[0].assigned_volunteer_id === null ? null : String(updated[0].assigned_volunteer_id),
          },
        };
      } catch (error) {
        const { code, message } = databaseRefusal(error);
        if (/developer seat admits volunteer accounts only/i.test(message) && (code === '' || code === '42501')) {
          return { ok: false, kind: 'not-a-volunteer-account', reason: message };
        }
        if (/single developer seat/i.test(message) && (code === '' || code === '42501')) {
          return { ok: false, kind: 'seat-occupied', reason: message };
        }
        return { ok: false, kind: 'refused', reason: message };
      }
    },

    account: async (accountId): Promise<AccountRow | null> => {
      const found = await rows<{ id: string; account_type: AccountRow['accountType']; lifecycle: AccountRow['lifecycle'] }>(
        sql`select id, account_type, lifecycle from public.accounts where id = ${accountId}::uuid`,
      );
      return found.length === 1
        ? { id: String(found[0].id), accountType: found[0].account_type, lifecycle: found[0].lifecycle }
        : null;
    },

    organization: async (organizationId): Promise<OrganizationRow | null> => {
      const found = await rows<{
        id: string;
        name: string;
        mission: string | null;
        country: string | null;
        website: string | null;
        logo: string | null;
      }>(
        sql`select id, name, mission, country, website, logo from public.organizations where id = ${organizationId}::uuid`,
      );
      return found.length === 1 ? asOrganizationRow(found[0]) : null;
    },

    membership: async (organizationId, accountId): Promise<MembershipRow | null> => {
      const found = await rows<{ organization_id: string; account_id: string; role: MembershipRow['role'] }>(
        sql`select org_id as organization_id, account_id, role from public.org_memberships
            where org_id = ${organizationId}::uuid and account_id = ${accountId}::uuid`,
      );
      return found.length === 1
        ? { organizationId: String(found[0].organization_id), accountId: String(found[0].account_id), role: found[0].role }
        : null;
    },

    projectAssignment: async (projectId): Promise<ProjectRow | null> => {
      const found = await rows<{ id: string; org_id: string; name: string; assigned_volunteer_id: string | null }>(
        sql`select id, org_id, name, assigned_volunteer_id from public.projects where id = ${projectId}::uuid`,
      );
      if (found.length !== 1) return null;
      return {
        id: String(found[0].id),
        organizationId: String(found[0].org_id),
        name: found[0].name,
        assignedVolunteerId: found[0].assigned_volunteer_id === null ? null : String(found[0].assigned_volunteer_id),
      };
    },

    acknowledgments: async (accountId): Promise<AcknowledgmentRow[]> => {
      const found = await rows<{
        kind: string;
        acknowledged_at: string | Date;
        ip: string | null;
        text_version: string;
        signer_name: string;
        signer_title: string;
        authority_attestation: string;
      }>(
        sql`select kind, acknowledged_at, ip::text as ip, text_version,
                   signer_name, signer_title, authority_attestation
              from public.acknowledgments
             where account_id = ${accountId}::uuid order by acknowledged_at`,
      );
      return found.map((row) => ({
        accountId,
        kind: row.kind,
        acknowledgedAt: new Date(row.acknowledged_at).toISOString(),
        ip: String(row.ip ?? ''),
        textVersion: row.text_version,
        signerName: row.signer_name,
        signerTitle: row.signer_title,
        authorityAttestation: row.authority_attestation,
      }));
    },

    volunteerProfile: async (accountId): Promise<VolunteerProfileRow | null> => {
      const found = await rows<{
        github_handle: string;
        top_languages: string[];
        repository_count: number;
        contribution_summary: string;
        imported_at: string | Date;
      }>(
        sql`select github_handle, top_languages, repository_count, contribution_summary, imported_at
            from public.volunteer_profiles where account_id = ${accountId}::uuid`,
      );
      if (found.length !== 1) return null;
      return {
        accountId,
        githubHandle: found[0].github_handle,
        topLanguages: found[0].top_languages,
        repositoryCount: Number(found[0].repository_count),
        contributionSummary: found[0].contribution_summary,
        importedAt: new Date(found[0].imported_at).toISOString(),
      };
    },

    organizationsNamed: async (name): Promise<OrganizationRow[]> => {
      const found = await rows<{
        id: string;
        name: string;
        mission: string | null;
        country: string | null;
        website: string | null;
        logo: string | null;
      }>(sql`select id, name, mission, country, website, logo from public.organizations where name = ${name}`);
      return found.map(asOrganizationRow);
    },

    membershipsOf: async (accountId): Promise<MembershipRow[]> => {
      const found = await rows<{ organization_id: string; account_id: string; role: MembershipRow['role'] }>(
        sql`select org_id as organization_id, account_id, role from public.org_memberships where account_id = ${accountId}::uuid`,
      );
      return found.map((row) => ({
        organizationId: String(row.organization_id),
        accountId: String(row.account_id),
        role: row.role,
      }));
    },

    hasPlatformAcknowledgment: async (accountId) => {
      const found = await rows<{ held: boolean }>(
        sql`select public.has_platform_acknowledgment(${accountId}::uuid) as held`,
      );
      return found[0]?.held === true;
    },

    provisionPlatformAdmin: async (email, password): Promise<Session> => {
      const created = await fetch(`${api}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          apikey: stack.serviceRoleKey,
          Authorization: `Bearer ${stack.serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
      if (created.status >= 400) throw new Error(`provisioning a platform administrator answered ${created.status}`);
      const user = (await created.json()) as { id?: string };
      const accountId = String(user.id ?? '');
      if (!accountId) throw new Error('the admin user API answered 200 but named no user id');
      await sql`insert into public.accounts (id, account_type) values (${accountId}::uuid, 'platform_admin')`;

      const signedIn = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
      const accessToken = String(signedIn.json.access_token ?? '');
      if (!accessToken) throw new Error('a provisioned platform administrator could not sign in');
      checkLifetime(accessToken);
      const sessionId = sessionIdOf(accessToken);
      sessions.set(sessionId, { accessToken, refreshToken: String(signedIn.json.refresh_token ?? '') });
      return { accountId, email, provider: 'email', sessionId };
    },

    retypeAccountAsOperator: async (accountId, accountType): Promise<void> => {
      const updated = await rows<{ id: string }>(
        sql`update public.accounts set account_type = ${accountType}::public.account_type
             where id = ${accountId}::uuid returning id`,
      );
      if (updated.length !== 1) throw new Error(`the operator could not retype account ${accountId}`);
    },

    clearEmailConfirmationAsOperator: async (accountId): Promise<void> => {
      const cleared = await rows<{ email_confirmed_at: string | Date | null }>(
        sql`update auth.users set email_confirmed_at = null where id = ${accountId}::uuid returning email_confirmed_at`,
      );
      if (cleared.length !== 1) {
        throw new Error(`no auth user ${accountId} whose confirmation could be cleared`);
      }
      if ((cleared[0]?.email_confirmed_at ?? null) !== null) {
        throw new Error(`Auth still reports account ${accountId} confirmed after the operator clear`);
      }
    },

    transferOrganizationContact: async (session, request): Promise<TransferOutcome> => {
      const answer = await postWrite('transfer-organization-contact', session, request);
      if (answer.ok) return { ok: true, organizationId: String(answer.json.organizationId ?? request.organizationId) };
      return answer.refusal;
    },

    setEscalationContact: async (session, request): Promise<EscalationOutcome> => {
      const answer = await postWrite('set-escalation-contact', session, request);
      if (!answer.ok) return answer.refusal;
      return { ok: true, organizationId: String(answer.json.organizationId ?? request.organizationId) };
    },

    setAccountLifecycle: async (session, request): Promise<LifecycleOutcome> => {
      const answer = await postWrite('set-account-lifecycle', session, request);
      if (!answer.ok) return answer.refusal;
      return { ok: true, changed: Boolean(answer.json.changed) };
    },

    attemptWrite: async function (this: AccountsSut, subject, session): Promise<WriteAttemptOutcome> {
      const asAttempt = async (outcome: { ok: true } | WriteRefusal): Promise<WriteAttemptOutcome> =>
        outcome.ok ? { ok: true } : outcome;
      const attempts: Record<WriteRouteName, () => Promise<WriteAttemptOutcome>> = {
        'project-need': async () => {
          if (subject.route !== 'project-need') throw new Error('unreachable');
          const answer = await postWrite('project-need', session, {
            organizationId: subject.organizationId, action: subject.action, title: subject.title,
          });
          return answer.ok ? { ok: true } : answer.refusal;
        },
        'complete-signup': async () => {
          if (subject.route !== 'complete-signup') throw new Error('unreachable');
          if (session === null) {
            const answer = await postWrite('complete-signup', null, {
              accountType: 'ngo',
              organizationName: subject.name,
              acknowledgmentTextVersion: 'tos-2026-01+promise-2026-01',
              signerName: 'Dana Okonkwo',
              signerTitle: 'Executive Director',
              authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
            });
            return answer.ok ? { ok: true } : answer.refusal;
          }
          const completed = await this.completeSignup(
            session,
            {
              accountType: 'ngo',
              organizationName: subject.name,
              acknowledgmentTextVersion: 'tos-2026-01+promise-2026-01',
              signerName: 'Dana Okonkwo',
              signerTitle: 'Executive Director',
              authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
            },
            '203.0.113.7',
          );
          if (completed.ok) return { ok: true };
          if ('kind' in completed) return completed;
          return { ok: false, kind: 'refused', status: 409, reason: completed.reason };
        },
        'create-organization': async () => {
          if (subject.route !== 'create-organization') throw new Error('unreachable');
          if (session === null) {
            const answer = await postWrite('create-organization', null, { name: subject.name });
            return answer.ok ? { ok: true } : answer.refusal;
          }
          return asAttempt(await this.createOrganization(session, subject.name));
        },
        'update-organization': async () => {
          if (subject.route !== 'update-organization') throw new Error('unreachable');
          if (session === null) {
            const answer = await postWrite('update-organization', null, {
              organizationId: subject.organizationId,
              name: subject.name,
            });
            return answer.ok ? { ok: true } : answer.refusal;
          }
          return asAttempt(await this.updateOrganization(session, subject.organizationId, subject.name));
        },
        'set-organization-profile': async () => {
          if (subject.route !== 'set-organization-profile') throw new Error('unreachable');
          const answer = await postWrite('set-organization-profile', session, {
            organizationId: subject.organizationId,
            name: subject.name,
            mission: subject.mission,
            country: subject.country,
            website: subject.website,
            logo: subject.logo,
          });
          return answer.ok ? { ok: true } : answer.refusal;
        },
        'transfer-organization-contact': async () => {
          if (subject.route !== 'transfer-organization-contact') throw new Error('unreachable');
          return asAttempt(await this.transferOrganizationContact(session, subject));
        },
        'set-escalation-contact': async () => {
          if (subject.route !== 'set-escalation-contact') throw new Error('unreachable');
          return asAttempt(await this.setEscalationContact(session, { ...subject, phone: null }));
        },
        'set-account-lifecycle': async () => {
          if (subject.route !== 'set-account-lifecycle') throw new Error('unreachable');
          return asAttempt(await this.setAccountLifecycle(session, subject));
        },
        'set-organization-vetting': async () => {
          if (subject.route !== 'set-organization-vetting') throw new Error('unreachable');
          const answer = await postWrite('set-organization-vetting', session, {
            organizationId: subject.organizationId,
            action: subject.action,
            organizationName: subject.organizationName,
            publicReferenceUrl: subject.publicReferenceUrl,
            contactName: subject.contactName,
            contactTitle: subject.contactTitle,
            authorityAttestation: subject.authorityAttestation,
            evidenceType: subject.evidenceType,
            note: subject.note,
          });
          return answer.ok ? { ok: true } : answer.refusal;
        },
        'set-organization-discovery': async () => {
          if (subject.route !== 'set-organization-discovery') throw new Error('unreachable');
          const answer = await postWrite('set-organization-discovery', session, {
            organizationId: subject.organizationId,
            enabled: subject.enabled,
            reason: subject.reason,
          });
          return answer.ok ? { ok: true } : answer.refusal;
        },
        'discovery-allowance': async () => {
          if (subject.route !== 'discovery-allowance') throw new Error('unreachable');
          const body: Record<string, unknown> = { organizationId: subject.organizationId, action: subject.action };
          if (subject.action === 'debit') body.credits = subject.credits;
          const answer = await postWrite('discovery-allowance', session, body);
          return answer.ok ? { ok: true } : answer.refusal;
        },
        'discovery-message': async () => {
          if (subject.route !== 'discovery-message') throw new Error('unreachable');
          return sendDiscoveryMessage(session, subject.message);
        },
        'discovery-scope': async () => {
          if (subject.route !== 'discovery-scope') throw new Error('unreachable');
          const answer = await postWrite('discovery-scope', session, {
            organizationId: subject.organizationId, projectId: subject.projectId, action: subject.action,
          });
          return answer.ok ? { ok: true } : answer.refusal;
        },
        'discovery-file': async () => {
          if (subject.route !== 'discovery-file') throw new Error('unreachable');
          const answer = await postWrite('discovery-file', session, subject);
          return answer.ok ? { ok: true } : answer.refusal;
        },
        'discovery-brief': async () => {
          if (subject.route !== 'discovery-brief') throw new Error('unreachable');
          const answer = await postWrite('discovery-brief', session, {
            organizationId: subject.organizationId, projectId: subject.projectId, action: subject.action,
            sectionId: subject.sectionId, text: subject.text, baseRevision: subject.baseRevision,
          });
          return answer.ok ? { ok: true } : answer.refusal;
        },
      };
      return attempts[subject.route]();
    },

    auditEvents: async (filter): Promise<AuditEventRow[]> => {
      const orgId = filter.subjectOrgId ?? null;
      const accountId = filter.subjectAccountId ?? null;
      const found = await rows<{
        id: string;
        occurred_at: string | Date;
        event_kind: AuditEventRow['eventKind'];
        actor_account_id: string | null;
        actor_label: string;
        subject_account_id: string | null;
        subject_org_id: string | null;
        reason: string;
        detail: unknown;
      }>(
        sql`select id, occurred_at, event_kind, actor_account_id, actor_label, subject_account_id, subject_org_id, reason, detail
              from public.audit_events
             where (${orgId}::uuid is null or subject_org_id = ${orgId}::uuid)
               and (${accountId}::uuid is null or subject_account_id = ${accountId}::uuid)
             order by occurred_at, id`,
      );
      return found.map((row) => ({
        id: String(row.id),
        occurredAt: new Date(row.occurred_at).toISOString(),
        eventKind: row.event_kind,
        actorAccountId: row.actor_account_id === null ? null : String(row.actor_account_id),
        actorLabel: row.actor_label,
        subjectAccountId: row.subject_account_id === null ? null : String(row.subject_account_id),
        subjectOrgId: row.subject_org_id === null ? null : String(row.subject_org_id),
        reason: row.reason,
        detail: (typeof row.detail === 'string' ? JSON.parse(row.detail) : row.detail) as Record<string, unknown>,
      }));
    },

    attemptAuditTamper: async (attempt): Promise<TamperOutcome> => {
      try {
        if (attempt === 'update') {
          await sql`update public.audit_events set reason = 'tampered'`;
        } else if (attempt === 'delete') {
          await sql`delete from public.audit_events`;
        } else {
          await sql`truncate public.audit_events`;
        }
        return { ok: true };
      } catch (error) {
        const { message } = databaseRefusal(error);
        return { ok: false, reason: message };
      }
    },

    escalationContact: async (organizationId): Promise<EscalationContactRow | null> => {
      const found = await rows<{
        org_id: string;
        contact_name: string;
        contact_email: string;
        contact_phone: string | null;
        recorded_by_account_id: string;
        recorded_at: string | Date;
      }>(
        sql`select org_id, contact_name, contact_email, contact_phone, recorded_by_account_id, recorded_at
              from public.org_escalation_contacts where org_id = ${organizationId}::uuid`,
      );
      if (found.length !== 1) return null;
      return {
        organizationId: String(found[0].org_id),
        contactName: found[0].contact_name,
        contactEmail: found[0].contact_email,
        contactPhone: found[0].contact_phone === null ? null : String(found[0].contact_phone),
        recordedByAccountId: String(found[0].recorded_by_account_id),
        recordedAt: new Date(found[0].recorded_at).toISOString(),
      };
    },

    registerWithProvider: () => { throw new CapabilityPending(['sut.accounts.registerWithProvider']); },
    registerWithGithub: () => { throw new CapabilityPending(['sut.accounts.registerWithGithub']); },
    signInWithProvider: () => { throw new CapabilityPending(['sut.accounts.signInWithProvider']); },
    sendDiscoveryMessage,
    discoveryMessagesBy: async (accountId) => (await rows<{ user_message: string }>(sql`select t.user_message from public.discovery_turns t
      join public.org_memberships m on m.org_id = t.org_id where m.account_id = ${accountId}::uuid and t.status = 'settled' order by t.opened_at, t.seq`)).map((row) => row.user_message),
    publicSignupAccountTypes: () => { throw new CapabilityPending(['sut.accounts.publicSignupAccountTypes']); },

    ...liveTenantReads({
      stack,
      sessions,
      tokensOf: (session, act) => tokensOf(sessions, session, act),
      claimsOf,
      rows,
      sql,
    }),
  };

  const world = async (name: string): Promise<World> => {
    const namespace = `${name.replace(/[^a-z0-9]+/gi, '-')}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      email: (local: string) => `${local}+${namespace}@example.test`,
      teardown: async () => undefined,
    };
  };

  return {
    sut: { accounts },
    fixtures: { world },
    teardown: async () => {
      await sql.close().catch(() => undefined);
    },
  };
}
