import {
  applyNeedPatch, submitGate, submitTransition, decideProjectNeed, disclosureFor, needIntakeAnswer, type NeedIntakeSqlRow, type ProjectNeedArgs, type StartPayload,
} from '../../../../supabase/functions/_shared/need-intake.ts';
import { publicProjectAnswer } from '../../../../supabase/functions/_shared/public-project.ts';
import {
  organizationIdField, parseWriteStanding, writePipeline, type AccountWriteRouteInput, type WriteRouteSpec, type WriteRefusalKind,
} from '../../../../supabase/functions/_shared/write-routes.ts';
import { createFixtureAdapter as createOrganizationsFixtureAdapter } from '../req-002/_fixture.ts';
import type { NeedIntakeView, NeedPatch, NeedsSut, NeedWriteOutcome, ProjectNeedRequest, Session } from './_contract.ts';

export const requirement = 'req-003' as const;
const SPEC: WriteRouteSpec<ProjectNeedArgs, AccountWriteRouteInput> = {
  name: 'project-need', target: organizationIdField, decide: decideProjectNeed,
};
type Actor = { accountId: string; accountType: 'ngo' | 'volunteer'; roles: Map<string, 'admin' | 'member'> };

export function createFixtureAdapter(opts: Parameters<typeof createOrganizationsFixtureAdapter>[0]) {
  const inner = createOrganizationsFixtureAdapter(opts);
  const organizations = inner.sut.organizations;
  const actors = new Map<string, Actor>();
  const emailActors = new Map<string, Actor>();
  const needs = new Map<string, NeedIntakeView>();
  const notLanded = (unit: number) => async (): Promise<never> => { throw new Error(`not landed: unit ${unit}`); };

  const start = (args: ProjectNeedArgs): Extract<NeedWriteOutcome, { ok: true }> => {
    const payload = args.p_payload as StartPayload;
    const need: NeedIntakeView = {
      projectId: crypto.randomUUID(), organizationId: args.p_organization_id,
      title: payload.title, description: payload.description, urgency: payload.urgency,
      stage: 'draft', causeLabels: [], referenceFiles: [], tier2ClassifiedAt: null,
      upload: { disclosure: disclosureFor(null) }, submittedAt: null, updatedAt: new Date(opts.clock.now()).toISOString(),
    };
    needs.set(need.projectId, structuredClone(need));
    return { ok: true, changed: true, need: structuredClone(need) };
  };

  const commit = (args: ProjectNeedArgs): NeedWriteOutcome & ({ ok: true } | { ok: false; kind: WriteRefusalKind }) => {
    if (args.p_action === 'start') return start(args);
    const need = needs.get(args.p_project_id!);
    if (need === undefined || need.organizationId !== args.p_organization_id) {
      return { ok: false, kind: 'no-such-need', status: 409, reason: 'no such need in this organisation' };
    }
    if (args.p_action === 'save') {
      const result = applyNeedPatch(need, args.p_payload as NeedPatch);
      needs.set(need.projectId, structuredClone(result.need));
      return { ok: true, ...structuredClone(result) };
    }
    if (args.p_action === 'submit') {
      if (need.stage === 'discovery_in_progress') return { ok: true, changed: false, need: structuredClone(need) };
      const gate = submitGate(need);
      if (!gate.ok) return { ...gate, status: 409 };
      const transition = submitTransition(need.stage);
      const submitted = { ...need, stage: transition.next, submittedAt: new Date(opts.clock.now()).toISOString() };
      needs.set(need.projectId, submitted);
      return { ok: true, changed: transition.changed, need: structuredClone(submitted) };
    }
    return { ok: false, kind: 'invalid-request', status: 409, reason: 'unsupported action' };
  };
  const write = async (session: Session | null, request: ProjectNeedRequest): Promise<NeedWriteOutcome> => {
    const actor = session === null ? undefined : actors.get(session.sessionId);
    if (actor === undefined || actor.accountId !== session?.accountId) {
      return { ok: false, kind: 'unauthenticated', status: 401, reason: 'authenticate before starting a need' };
    }
    const standing = parseWriteStanding({
      account: { account_type: actor.accountType, lifecycle: 'active' },
      org_exists: (await organizations.profile(request.organizationId)) !== null,
      org_role: actor.roles.get(request.organizationId) ?? null, org_seat_account_id: null, subject: null,
    });
    const decision = writePipeline(SPEC, {
      caller: { id: actor.accountId, githubHandle: null }, standing, body: request,
      target: request.organizationId, subject: null, ip: null,
    });
    return decision.ok ? commit(decision.args) : decision;
  };

  const sut: NeedsSut = {
    provisionNgo: async (email, options) => {
      const ngo = await organizations.provisionNgo(email, options);
      actors.set(ngo.session.sessionId, { accountId: ngo.accountId, accountType: 'ngo', roles: new Map([[ngo.organizationId, 'admin']]) });
      emailActors.set(email, actors.get(ngo.session.sessionId)!);
      return ngo;
    },
    provisionVolunteer: async (email) => {
      const session = await organizations.provisionVolunteer(email);
      actors.set(session.sessionId, { accountId: session.accountId, accountType: 'volunteer', roles: new Map() });
      return session;
    },
    signInAgain: async (email) => {
      const actor = emailActors.get(email);
      if (actor === undefined) throw new Error('no account for this email');
      const session = { accountId: actor.accountId, email, sessionId: crypto.randomUUID() };
      actors.set(session.sessionId, actor);
      return session;
    },
    setMembershipRoleAsOperator: async (organizationId, accountId, role) => {
      await organizations.setMembershipRoleAsOperator(organizationId, accountId, role);
      for (const actor of actors.values()) {
        if (actor.accountId === accountId) actor.roles.set(organizationId, role);
      }
    },
    readAllowance: (session, organizationId) => organizations.readAllowance(session, organizationId),
    startNeed: (session, request) => write(session, { ...request, action: 'start' }),
    saveNeed: (session, request) => write(session, { ...request, action: 'save' }),
    attachReferenceFile: notLanded(4),
    submitNeed: (session, request) => write(session, { ...request, action: 'submit' }),
    readNeed: async (session: Session | null, projectId) => {
      const actor = session === null ? undefined : actors.get(session.sessionId);
      if (actor === undefined || actor.accountId !== session?.accountId) {
        return { ok: false, answer: { status: 401, body: JSON.stringify({ ok: false, reason: 'authenticate before reading a need intake' }) } };
      }
      const stored = needs.get(projectId);
      const visible = stored !== undefined && actor.roles.has(stored.organizationId) ? stored : undefined;
      const answer = await needIntakeAnswer({
        project: async () => ({ ok: true, rows: visible === undefined ? [] : [{ id: visible.projectId, name: visible.title, org_id: visible.organizationId, assigned_volunteer_id: null }] }),
        need: async () => ({ ok: true, rows: visible === undefined ? [] : [sqlRow(visible)] }),
      }, projectId);
      const raw = { status: answer.status, body: JSON.stringify(answer.body) };
      return answer.status === 200 ? { ok: true, value: answer.body, answer: raw } : { ok: false, answer: raw };
    },
    publicProjectPage: async (projectId) => {
      const need = needs.get(projectId);
      if (need === undefined) return organizations.publicProjectPage(projectId);
      const organization = await organizations.profile(need.organizationId);
      const result = await publicProjectAnswer(projectId, { source: async () => ({ ok: true, rows: [{
        project_id: projectId, project_name: need.title, organization_name: organization!.name, need_stage: need.stage,
      }] }) });
      const answer = { status: result.status, body: JSON.stringify(result.body) };
      return result.status === 200 ? { ok: true, page: result.body, answer } : { ok: false, answer };
    },
    needRow: async (projectId) => structuredClone(needs.get(projectId) ?? null),
    attemptNeedDefinerAsOperator: async ({ accountId, request }) => {
      const actor = [...actors.values()].find((candidate) => candidate.accountId === accountId);
      const role = actor?.roles.get(request.organizationId);
      if (role === undefined) return { ok: false, kind: 'not-a-member', reason: 'the caller holds no membership in this organisation' };
      if (role !== 'admin') return { ok: false, kind: 'not-an-admin', reason: 'only the admin of this organisation may start a need' };
      if (request.action !== 'start') {
        const need = needs.get(request.projectId);
        if (need === undefined || need.organizationId !== request.organizationId) {
          return { ok: false, kind: 'no-such-need', reason: 'no such need in this organisation' };
        }
      }
      const decision = decideProjectNeed({
        caller: { id: accountId, githubHandle: null },
        standing: { kind: 'account', accountType: actor!.accountType, lifecycle: 'active', orgRole: role,
          orgExists: true, orgSeatAccountId: null, subject: null },
        body: request, target: request.organizationId, subject: null, ip: null,
      });
      if (!decision.ok) return decision;
      const result = commit(decision.args);
      if (!result.ok) return result;
      return { ok: true };
    },
    classifyTier2AsOperator: notLanded(5),
    intakeSnapshots: notLanded(7),
  };
  return {
    sut: { needs: sut }, fixtures: inner.fixtures,
    teardown: async () => { await inner.teardown(); actors.clear(); emailActors.clear(); needs.clear(); },
  };
}

function sqlRow(need: NeedIntakeView): NeedIntakeSqlRow {
  return {
    project_id: need.projectId, org_id: need.organizationId, title: need.title,
    description: need.description, urgency: need.urgency, stage: need.stage, cause_labels: [...need.causeLabels],
    reference_files: need.referenceFiles.map((file) => ({
      id: file.id, file_name: file.fileName, media_type: file.mediaType, byte_size: file.byteSize,
      description: file.description, added_by_account_id: file.addedByAccountId, added_at: file.addedAt,
    })),
    tier2_classified_at: need.tier2ClassifiedAt, submitted_at: need.submittedAt, updated_at: need.updatedAt,
  };
}
