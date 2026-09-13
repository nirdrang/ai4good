import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';
import { intakeSnapshotFromDetail, needViewFromSql, type NeedIntakeSqlRow } from '../../../../supabase/functions/_shared/need-intake.ts';
import { parseWriteRefusalKind } from '../../../../supabase/functions/_shared/write-routes.ts';
import { authPost, followLink, functionPost, functionPostRaw, sqlClient, verifyLinksFor, type Stack } from '../../harness/live-stack.ts';
import { createLiveAdapter as createOrganizationsLiveAdapter } from '../req-002/_live.ts';
import type { NeedIntakeView, NeedsSut, NeedWriteOutcome, Session, TenantReadOutcome } from './_contract.ts';

export const requirement = 'req-003' as const;
const PASSWORD = 'correct horse battery staple';
const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const CLIENT_IP = '203.0.113.7';
const SIGNER = {
  signerName: 'Dana Okonkwo', signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
};

export async function createLiveAdapter(opts: { stack: Stack }) {
  const { stack } = opts;
  const inner = await createOrganizationsLiveAdapter(opts);
  const sql = sqlClient(stack);
  const sessions = new Map<string, { accountId: string; accessToken: string }>();
  const allowanceSessions = new Map<string, Session>();

  const bearerOf = (session: Session | null): string => {
    if (session === null) return stack.anonKey;
    const held = sessions.get(session.sessionId);
    if (held === undefined || held.accountId !== session.accountId) throw new Error('this handle holds no session');
    return held.accessToken;
  };
  const signIn = async (email: string): Promise<Session> => {
    const answer = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password: PASSWORD });
    const token = answer.json.access_token;
    if (typeof token !== 'string' || token === '') throw new Error(`password grant for ${email} returned no token`);
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { sub: string; session_id: string };
    const session = { accountId: claims.sub, sessionId: claims.session_id, email };
    sessions.set(session.sessionId, { accountId: session.accountId, accessToken: token });
    return session;
  };
  const signup = async (email: string): Promise<Session> => {
    const answer = await authPost(stack, '/auth/v1/signup', { email, password: PASSWORD });
    if (answer.status >= 400) throw new Error(`signup for ${email} answered ${answer.status}`);
    const link = (await verifyLinksFor(stack, email, 'signup'))[0];
    if (link === undefined) throw new Error(`no confirmation email for ${email}`);
    const used = await followLink(link);
    if (used.status >= 400) throw new Error(`following confirmation for ${email} answered ${used.status}`);
    return signIn(email);
  };
  const postNeed = async (session: Session | null, body: Record<string, unknown>): Promise<NeedWriteOutcome> => {
    const { status, json } = await functionPost(stack, 'project-need', body, bearerOf(session), CLIENT_IP);
    if (status >= 400 || json.ok !== true) {
      return { ok: false, status, kind: status === 401 ? 'unauthenticated' : parseWriteRefusalKind(json.kind),
        reason: String(json.reason ?? json.message ?? `project-need answered ${status}`) };
    }
    if (json.need === null || typeof json.need !== 'object') throw new Error('project-need returned no need');
    return { ok: true, changed: json.changed === true, need: json.need as NeedIntakeView };
  };

  const sut: NeedsSut = {
    provisionNgo: async (email, options) => {
      // Provision through the existing adapter; take a second session before clearing email confirmation.
      const ngo = await inner.sut.organizations.provisionNgo(email, { emailVerified: true });
      const session = await signIn(email);
      allowanceSessions.set(session.sessionId, ngo.session);
      if (!options.emailVerified) {
        const rows = await sql`update auth.users set email_confirmed_at = null where id = ${ngo.accountId}::uuid returning id` as { id: string }[];
        if (rows.length !== 1) throw new Error('no auth user whose email confirmation could be cleared');
      }
      return { ...ngo, session };
    },
    provisionVolunteer: async (email) => {
      const session = await signup(email);
      const githubHandle = `vol-${session.accountId.replace(/-/g, '').slice(0, 20)}`;
      await sql`insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        values (${crypto.randomUUID()}::uuid, ${githubHandle}, ${session.accountId}::uuid,
          ${JSON.stringify({ sub: githubHandle, user_name: githubHandle, provider_id: githubHandle })}::text::jsonb,
          'github', now(), now(), now())`;
      const answer = await functionPost(stack, 'complete-signup', {
        accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER,
      }, bearerOf(session), CLIENT_IP);
      if (answer.status >= 400 || answer.json.ok !== true) throw new Error(`volunteer completion answered ${answer.status}`);
      return session;
    },
    signInAgain: signIn,
    setMembershipRoleAsOperator: (organizationId, accountId, role) =>
      inner.sut.organizations.setMembershipRoleAsOperator(organizationId, accountId, role),
    readAllowance: (session, organizationId) => {
      if (session === null) return inner.sut.organizations.readAllowance(null, organizationId);
      const held = allowanceSessions.get(session.sessionId);
      if (held === undefined || held.accountId !== session.accountId) throw new Error('no held session for the allowance read');
      return inner.sut.organizations.readAllowance(held, organizationId);
    },
    startNeed: (session, request) => postNeed(session, { ...request, action: 'start' }),
    saveNeed: (session, request) => postNeed(session, { ...request, action: 'save' }),
    attachReferenceFile: (session, request) => postNeed(session, { ...request, action: 'attach' }),
    submitNeed: (session, request) => postNeed(session, { ...request, action: 'submit' }),
    readNeed: async (session, projectId): Promise<TenantReadOutcome<{ ok: true; need: NeedIntakeView }>> => {
      const raw = await functionPostRaw(stack, 'need-intake', { projectId }, bearerOf(session));
      const answer = { status: raw.status, body: raw.text };
      if (raw.status !== 200) return { ok: false, answer };
      const value = JSON.parse(raw.text) as { ok: true; need: NeedIntakeView };
      if (value.ok !== true || !value.need) throw new Error('need-intake returned no need');
      return { ok: true, value, answer };
    },
    publicProjectPage: (projectId) => inner.sut.organizations.publicProjectPage(projectId),
    needRow: async (projectId) => {
      const rows = await sql`select to_jsonb(n) || jsonb_build_object('title', p.name) as need
        from public.need_intakes n join public.projects p on p.id = n.project_id where n.project_id = ${projectId}::uuid` as { need: unknown }[];
      if (rows.length === 0) return null;
      const raw: unknown = rows[0].need;
      return needViewFromSql((typeof raw === 'string' ? JSON.parse(raw) : raw) as NeedIntakeSqlRow);
    },
    attemptNeedDefinerAsOperator: async ({ accountId, request }) => {
      const projectId = request.action === 'start' ? null : request.projectId;
      const payload = request.action === 'start'
        ? { title: request.title, description: request.description ?? null, urgency: request.urgency ?? null }
        : request.action === 'save' ? request.patch : request.action === 'attach' ? request.file : {};
      try {
        await sql`select public.project_need(${accountId}::uuid, ${request.organizationId}::uuid,
          ${request.action}::text, ${projectId}::uuid, ${JSON.stringify(payload)}::text::jsonb)`;
        return { ok: true };
      } catch (error) {
        const carrier = error as { detail?: string; message?: string; cause?: { detail?: string } };
        return { ok: false, kind: parseWriteRefusalKind(carrier.detail ?? carrier.cause?.detail), reason: carrier.message ?? String(error) };
      }
    },
    classifyTier2AsOperator: async (projectId) => {
      const rows = await sql`update public.need_intakes set tier2_classified_at = coalesce(tier2_classified_at, now())
        where project_id = ${projectId}::uuid returning project_id` as { project_id: string }[];
      if (rows.length === 0) throw new Error('no such need to classify');
    },
    intakeSnapshots: async (projectId) => {
      const rows = await sql`select id, occurred_at, actor_account_id, actor_label, subject_org_id, reason, detail
        from public.audit_events where event_kind = 'need_intake_submitted'
          and detail->>'project_id' = ${projectId} order by occurred_at, id` as {
        id: string; occurred_at: string | Date; actor_account_id: string | null; actor_label: string;
        subject_org_id: string; reason: string; detail: unknown;
      }[];
      return rows.map((event) => {
        const detail = intakeSnapshotFromDetail(typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail);
        if (detail === null) throw new Error(`audit row ${event.id} has no intake snapshot`);
        return {
          id: event.id, occurredAt: new Date(event.occurred_at).toISOString(),
          actorAccountId: event.actor_account_id, actorLabel: event.actor_label,
          subjectOrgId: event.subject_org_id, reason: event.reason, detail,
        };
      });
    },
  };
  return {
    sut: { needs: sut }, fixtures: inner.fixtures,
    teardown: async () => {
      try { await inner.teardown(); } finally { await sql.close(); sessions.clear(); allowanceSessions.clear(); }
    },
  };
}
