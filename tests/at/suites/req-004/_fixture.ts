import { createFixtureAdapter as createNeedsAdapter } from '../req-003/_fixture.ts';
import { affordableOutputTokens, billingTargetFor, countedInputTokens, fuelRouteAllowed, reservationFor, reserveSettings, settlementFor,
  DISCOVERY_MICROS_PER_CREDIT, DISCOVERY_REQUEST_SETTINGS, DISCOVERY_TURN_DEADLINE_SECONDS } from '../../../../supabase/functions/_shared/discovery-metering.ts';
import { decideDiscoveryMessage, discoveryPrepare, discoveryAct, conversationAnswer, turnViewFromSql, renderDiscoveryMessage,
  contextMessagesFrom,
  type CallerReads, type DiscoveryReserveArgs, type DiscoverySettleArgs, type DiscoveryTurnSqlRow } from '../../../../supabase/functions/_shared/discovery-turn.ts';
import { canonicalLabel, decideDiscoveryScope, renderDiscoveryScope, renderScopeBegin, scopeAct, scopeViewFromSql, type DiscoveryScopeArgs, type ScopeSqlRow } from '../../../../supabase/functions/_shared/scope.ts';
import { organizationIdField, writePipeline } from '../../../../supabase/functions/_shared/write-routes.ts';
import { decideOrganizationDiscovery, renderDiscoverySwitch } from '../../../../supabase/functions/_shared/discovery-switch.ts';
import { discoveryMessageAllowed } from '../../../../supabase/functions/_shared/verification.ts';
import type { AnthropicMessagesPort } from '../../harness/contracts.ts';
import { DISCOVERY_SKILLS } from '../../../../supabase/functions/_shared/discovery-skills/index.ts';
import type { DiscoverySut, Session, OperatorReserveOutcome, DiscoveryMessageOutcome, DiscoverySwitchAuditRow, ScopeWriteOutcome } from './_contract.ts';

export const requirement = 'req-004' as const;
export const VETTING_EVIDENCE = {
  action: 'vet', organizationName: 'Riverside Shelter', publicReferenceUrl: 'https://example.org/riverside',
  contactName: 'Dana Okonkwo', contactTitle: 'Executive Director',
  authorityAttestation: 'The named contact attests they have authority to bind the organisation.',
  evidenceType: 'organization_website', note: 'The website and named contact match the organisation.',
} as const;
const SEND_SPEC = { name: 'discovery-message', target: organizationIdField, decide: decideDiscoveryMessage } as const;
const SCOPE_SPEC = { name: 'discovery-scope', target: organizationIdField, decide: decideDiscoveryScope } as const;
const SWITCH_SPEC = { name: 'set-organization-discovery', target: organizationIdField, decide: decideOrganizationDiscovery } as const;
export function createFixtureAdapter(opts: Parameters<typeof createNeedsAdapter>[0] & { vendors: { anthropic: AnthropicMessagesPort } }) {
  const inner = createNeedsAdapter(opts);
  const needs = inner.sut.needs;
  const organizations = inner.organizations;
  const accounts = inner.accounts;
  const actors = new Map<string, { session: Session; organizationId: string | null; role: 'admin' | 'member'; type: 'ngo' | 'volunteer' | 'platform_admin'; emailVerified: boolean }>();
  const turns = new Map<string, DiscoveryTurnSqlRow[]>();
  const scopes = new Map<string, ScopeSqlRow[]>();
  const vocabulary = new Map<string, { label: string; firstProjectId: string | null }>();
  const needCauseLabels = new Map<string, string[]>();
  const funding = new Map<string, { fundedAt: string | null; fuelMicros: number }>();
  const switches = new Map<string, { disabledAt: string; disabledBy: string; reason: string }>();
  const switchAudits: DiscoverySwitchAuditRow[] = [];
  const skills = DISCOVERY_SKILLS;
  const now = () => new Date(opts.clock.now()).toISOString();
  const sqlAllowance = (allowance: { organizationId: string; utcDay: string; vetted: boolean; dailyGrant: number; spentToday: number; remaining: number }) => ({
    organization_id: allowance.organizationId, utc_day: allowance.utcDay, vetted: allowance.vetted,
    daily_grant: allowance.dailyGrant, spent_today: allowance.spentToday, remaining: allowance.remaining,
  });
  const refuse = (kind: Parameters<typeof import('../../../../supabase/functions/_shared/write-routes.ts').refuseWrite>[0], reason: string) =>
    ({ ok: false as const, kind, status: 409, reason });
  const reserve = async (args: DiscoveryReserveArgs): Promise<OperatorReserveOutcome> => {
    const actor = [...actors.values()].find((a) => a.session.accountId === args.p_account_id);
    if (!actor || actor.organizationId !== args.p_organization_id) return refuse('not-a-member', 'the caller holds no membership');
    if (actor.role !== 'admin') return refuse('not-an-admin', 'only the organisation admin may send');
    const switched = switches.get(args.p_organization_id);
    if (switched !== undefined) {
      return refuse('discovery-disabled', `a platform admin switched Discovery off for this organisation — ${switched.reason}`);
    }
    const email = discoveryMessageAllowed({ emailVerified: actor.emailVerified });
    if (!email.ok) return refuse('email-unverified', email.reason);
    const need = await needs.needRow(args.p_project_id);
    if (!need || need.organizationId !== args.p_organization_id) return refuse('no-such-project', 'no such project');
    if (need.stage !== 'discovery_in_progress') return refuse('need-not-in-discovery', 'the need is not in Discovery');
    const rows = turns.get(need.projectId) ?? [];
    const open = rows.find((row) => row.status === 'open');
    if (open && opts.clock.now() - Date.parse(open.opened_at) < DISCOVERY_TURN_DEADLINE_SECONDS * 1000) {
      return refuse('turn-in-flight', 'a Discovery turn is in flight');
    }
    const settled = rows.filter((row) => row.status === 'settled');
    if ((settled.at(-1)?.seq ?? 0) !== args.p_counted_through_seq) return refuse('stale-context', 'the conversation changed after token counting');
    const estimatedInputTokens = countedInputTokens(args.p_settings.counted_input_tokens!);
    const funded = funding.get(need.projectId);
    const target = billingTargetFor({ id: need.projectId, fundedAt: funded?.fundedAt ?? null });
    let maxOutputTokens: number;
    let bound: ReturnType<typeof reservationFor>;
    let utcDay: string;
    let debitAllowance: ReturnType<typeof sqlAllowance> | null = null;
    if (target.kind === 'fuel') {
      const fuel = { availableMicros: funded?.fuelMicros ?? 0 };
      maxOutputTokens = Math.max(DISCOVERY_REQUEST_SETTINGS.minOutputTokens,
        affordableOutputTokens({ availableMicros: fuel.availableMicros, estimatedInputTokens }));
      bound = reservationFor({ estimatedInputTokens, maxOutputTokens });
      const allowed = fuelRouteAllowed(target, fuel, bound.reservedMicros);
      if (!allowed.ok) return refuse(allowed.kind, allowed.reason);
      bound = { reservedMicros: bound.reservedMicros, reservedCredits: 0 };
      utcDay = new Date(opts.clock.now()).toISOString().slice(0, 10);
    } else {
      const before = await organizations.readAllowance(actor.session, need.organizationId);
      if (!before.ok) return before;
      maxOutputTokens = Math.max(DISCOVERY_REQUEST_SETTINGS.minOutputTokens,
        affordableOutputTokens({ availableMicros: before.allowance.remaining * DISCOVERY_MICROS_PER_CREDIT, estimatedInputTokens }));
      bound = reservationFor({ estimatedInputTokens, maxOutputTokens });
      const debit = await organizations.debitAllowance(actor.session, need.organizationId, bound.reservedCredits);
      if (!debit.ok) return debit;
      utcDay = debit.allowance.utcDay;
      debitAllowance = sqlAllowance(debit.allowance);
    }
    if (open) Object.assign(open, { status: 'abandoned', charged_credits: open.reserved_credits, settled_at: now() });
    const row: DiscoveryTurnSqlRow = {
      id: crypto.randomUUID(), project_id: need.projectId, org_id: need.organizationId, seq: (rows.at(-1)?.seq ?? 0) + 1,
      status: 'open', billing: target.kind, utc_day: utcDay, user_message: args.p_message,
      assistant_message: null, elicitation: null, request_settings: {
        model: args.p_settings.model, max_tokens: maxOutputTokens, effort: args.p_settings.effort,
      }, max_output_tokens: maxOutputTokens, estimated_input_tokens: estimatedInputTokens,
      micros_per_credit: args.p_settings.micros_per_credit, input_micros_per_token: args.p_settings.input_micros_per_token,
      output_micros_per_token: args.p_settings.output_micros_per_token, reserved_micros: bound.reservedMicros,
      reserved_credits: bound.reservedCredits, input_tokens: null, output_tokens: null, stop_reason: null, served_model: null,
      actual_micros: null, charged_credits: null, overrun_micros: null, opened_at: now(), settled_at: null,
    };
    turns.set(need.projectId, [...rows, row]);
    return { ok: true, reservation: { turn: structuredClone(row),
      need: { title: need.title, description: need.description, urgency: need.urgency, reference_files: need.referenceFiles.map((f) => f.fileName) },
      context: [...contextMessagesFrom(settled), { role: 'user', content: args.p_message }], allowance: debitAllowance } };
  };
  const settle = async (args: DiscoverySettleArgs): Promise<DiscoveryMessageOutcome> => {
    const row = [...turns.values()].flat().find((r) => r.id === args.p_turn_id);
    if (!row || row.status !== 'open') return refuse('turn-not-open', 'the Discovery turn is not open');
    const actor = [...actors.values()].find((a) => a.session.accountId === args.p_account_id);
    if (!actor || actor.organizationId !== row.org_id) return refuse('not-a-member', 'the caller holds no membership');
    if (actor.role !== 'admin') return refuse('not-an-admin', 'only the organisation admin may settle');
    if (args.p_outcome === 'completed') {
      if (args.p_input_tokens === null || args.p_input_tokens < 0 || args.p_output_tokens === null ||
        args.p_output_tokens < 0 || args.p_output_tokens > row.max_output_tokens || args.p_assistant_message === null) {
        return refuse('invalid-request', 'invalid Discovery usage');
      }
      const result = settlementFor({ reservedMicros: row.reserved_micros, reservedCredits: row.reserved_credits,
        billing: row.billing, usage: { inputTokens: args.p_input_tokens, outputTokens: args.p_output_tokens } });
      Object.assign(row, { status: 'settled', assistant_message: args.p_assistant_message, input_tokens: args.p_input_tokens,
        output_tokens: args.p_output_tokens, stop_reason: args.p_stop_reason, served_model: args.p_served_model, elicitation: args.p_elicitation,
        actual_micros: result.actualMicros, charged_credits: result.chargedCredits, overrun_micros: result.overrunMicros });
      if (row.billing === 'fuel') {
        const entry = funding.get(row.project_id);
        if (entry) entry.fuelMicros -= result.actualMicros;
      }
    } else Object.assign(row, { status: 'failed', charged_credits: 0 });
    row.settled_at = now();
    const released = row.reserved_credits - row.charged_credits!;
    if (released > 0) {
      const spend = (await organizations.spendRows(row.org_id)).find((s) => s.utcDay === row.utc_day);
      if (!spend || spend.spent < released) throw new Error('release exceeds recorded spend');
      await organizations.writeSpendRowAsOperator({ ...spend, spent: spend.spent - released });
    }
    const after = await organizations.readAllowance(actor.session, row.org_id);
    if (!after.ok) return after;
    return { ok: true, ...renderDiscoveryMessage({ turn: row, allowance: sqlAllowance(after.allowance) }) };
  };
  const sqlNeed = async (projectId: string) => {
    const need = await needs.needRow(projectId);
    if (!need) return null;
    return {
      project_id: need.projectId, org_id: need.organizationId, title: need.title,
      description: need.description, urgency: need.urgency, stage: need.stage,
      cause_labels: [...(needCauseLabels.get(need.projectId) ?? need.causeLabels)],
      reference_files: need.referenceFiles.map((file) => ({
        id: file.id, file_name: file.fileName, media_type: file.mediaType, byte_size: file.byteSize,
        description: file.description, added_by_account_id: file.addedByAccountId, added_at: file.addedAt,
      })),
      tier2_classified_at: need.tier2ClassifiedAt, submitted_at: need.submittedAt, updated_at: need.updatedAt,
    };
  };
  const beginScope = async (args: DiscoveryScopeArgs): Promise<{ ok: true; value: unknown } | Extract<ScopeWriteOutcome, { ok: false }>> => {
    const actor = [...actors.values()].find((a) => a.session.accountId === args.p_account_id);
    if (!actor || actor.organizationId !== args.p_organization_id) return refuse('not-a-member', 'the caller holds no membership');
    if (actor.role !== 'admin') return refuse('not-an-admin', 'only the organisation admin may write a Discovery scope');
    const switched = switches.get(args.p_organization_id);
    if (switched !== undefined) {
      return refuse('discovery-disabled', `a platform admin switched Discovery off for this organisation — ${switched.reason}`);
    }
    const need = await needs.needRow(args.p_project_id);
    if (!need || need.organizationId !== args.p_organization_id) return refuse('no-such-project', 'no such project');
    if (need.stage !== 'discovery_in_progress') return refuse('need-not-in-discovery', 'the need is not in Discovery');
    if (args.p_action === 'remove-label') {
      const label = args.p_label ?? '';
      if (label === '') return refuse('invalid-request', 'a Discovery scope write requires a label to remove');
      const existing = scopes.get(need.projectId) ?? [];
      const current = existing.find((row) => row.status === 'current') ?? null;
      const held = [...(needCauseLabels.get(need.projectId) ?? need.causeLabels)];
      if (!held.includes(label)) {
        return { ok: true, value: {
          done: true, changed: false, scope: current === null ? null : structuredClone(current),
          scopes: structuredClone(existing), need: await sqlNeed(need.projectId),
        } };
      }
      needCauseLabels.set(need.projectId, held.filter((item) => item !== label));
      return { ok: true, value: {
        done: true, changed: true, scope: current === null ? null : structuredClone(current),
        scopes: structuredClone(existing), need: await sqlNeed(need.projectId),
      } };
    }
    if (args.p_action !== 'generate') return refuse('invalid-request', 'a Discovery scope write requires the generate or remove-label action');
    const turnRows = turns.get(need.projectId) ?? [];
    const elicitation = [...turnRows].filter((row) => row.elicitation !== null).at(-1)?.elicitation ?? null;
    if (elicitation === null || elicitation.complete !== true) {
      return refuse('elicitation-incomplete', 'the elicitation is not complete');
    }
    const existing = scopes.get(need.projectId) ?? [];
    const generating = existing.find((row) => row.status === 'generating');
    if (generating && opts.clock.now() - Date.parse(generating.opened_at) < DISCOVERY_TURN_DEADLINE_SECONDS * 1000) {
      return refuse('generation-in-flight', 'a Discovery generation is in flight');
    }
    if (generating) Object.assign(generating, { status: 'failed', settled_at: now() });
    if (existing.some((row) => row.status === 'current' || row.status === 'superseded')) {
      return refuse('scope-already-generated', 'a scope has already been generated for this project');
    }
    const profile = await organizations.profile(need.organizationId);
    const settled = turnRows.filter((row) => row.status === 'settled');
    const context = settled.flatMap((row) => [
      { role: 'user' as const, content: row.user_message },
      { role: 'assistant' as const, content: row.assistant_message },
    ]);
    const failed = [...existing].filter((row) => row.status === 'failed').sort((a, b) => b.version - a.version)[0];
    let row: ScopeSqlRow;
    if (failed) {
      Object.assign(failed, {
        status: 'generating', contract: null, markdown: null, served_model: null,
        input_tokens: null, output_tokens: null, settled_at: null, elicitation,
        requested_by: args.p_account_id, opened_at: now(), cause_labels: [],
      });
      row = failed;
    } else {
      row = {
        id: crypto.randomUUID(), project_id: need.projectId, org_id: need.organizationId, version: 1,
        status: 'generating', reason: null, requested_by: args.p_account_id, elicitation, contract: null,
        markdown: null, cause_labels: [], served_model: null, input_tokens: null, output_tokens: null,
        opened_at: now(), settled_at: null,
      };
      scopes.set(need.projectId, [...existing, row]);
    }
    return { ok: true, value: {
      done: false, scope: structuredClone(row), elicitation, context,
      need: await sqlNeed(need.projectId), mission: profile?.mission ?? null,
      vocabulary: [...vocabulary.values()].map((row) => row.label).sort(),
    } };
  };
  const commitScope = async (args: Record<string, unknown>): Promise<ScopeWriteOutcome> => {
    const projectId = typeof args.p_project_id === 'string' ? args.p_project_id : '';
    const need = await needs.needRow(projectId);
    if (!need) return refuse('no-such-project', 'no such project');
    const actor = [...actors.values()].find((a) => a.session.accountId === args.p_account_id);
    if (!actor || actor.organizationId !== need.organizationId) return refuse('not-a-member', 'the caller holds no membership');
    if (actor.role !== 'admin') return refuse('not-an-admin', 'only the organisation admin may settle a Discovery scope');
    const snapshot = async (scope: ScopeSqlRow | null) => {
      const sqlNeedRow = await sqlNeed(projectId);
      if (!sqlNeedRow) throw new Error('no need for a scope commit');
      return renderDiscoveryScope({ scope, scopes: scopes.get(projectId) ?? [], need: sqlNeedRow });
    };
    if (args.p_scope_id == null) {
      const current = (scopes.get(projectId) ?? []).find((row) => row.status === 'current') ?? null;
      const sqlNeedRow = await sqlNeed(projectId);
      if (!sqlNeedRow) throw new Error('no need for a scope commit');
      return { ok: true, ...renderDiscoveryScope({
        scope: current, scopes: scopes.get(projectId) ?? [], need: sqlNeedRow, changed: args.p_changed === true,
      }) };
    }
    const row = (scopes.get(projectId) ?? []).find((item) => item.id === args.p_scope_id);
    if (!row || row.status !== 'generating') return refuse('scope-not-open', 'the Discovery scope is not open');
    if (args.p_outcome === 'completed') {
      for (const other of scopes.get(row.project_id) ?? []) {
        if (other.status === 'current') other.status = 'superseded';
      }
      const labels = Array.isArray(args.p_labels)
        ? args.p_labels.filter((item): item is string => typeof item === 'string') : [];
      Object.assign(row, {
        status: 'current', contract: args.p_contract, markdown: args.p_markdown,
        cause_labels: labels,
        served_model: args.p_served_model, input_tokens: args.p_input_tokens,
        output_tokens: args.p_output_tokens, settled_at: now(),
      });
      needCauseLabels.set(projectId, labels);
      for (const label of labels) {
        if (!vocabulary.has(label)) vocabulary.set(label, { label, firstProjectId: projectId });
      }
    } else if (args.p_outcome === 'failed') {
      Object.assign(row, { status: 'failed', settled_at: now() });
    } else return refuse('invalid-request', 'invalid Discovery scope outcome');
    return { ok: true, ...await snapshot(row) };
  };
  const sut: DiscoverySut = {
    ...needs,
    provisionNgo: async (email, options) => {
      const ngo = await needs.provisionNgo(email, options);
      actors.set(ngo.session.sessionId, { session: ngo.session, organizationId: ngo.organizationId, role: 'admin', type: 'ngo', emailVerified: options.emailVerified });
      return ngo;
    },
    provisionVolunteer: async (email) => {
      const session = await needs.provisionVolunteer(email);
      actors.set(session.sessionId, { session, organizationId: null, role: 'member', type: 'volunteer', emailVerified: true });
      return session;
    },
    signInAgain: async (email) => {
      const session = await needs.signInAgain(email);
      const actor = [...actors.values()].find((entry) => entry.session.accountId === session.accountId);
      if (!actor) throw new Error('no Discovery actor for the new session');
      actors.set(session.sessionId, { ...actor, session });
      return session;
    },
    setMembershipRoleAsOperator: async (org, account, role) => {
      await needs.setMembershipRoleAsOperator(org, account, role);
      for (const actor of actors.values()) if (actor.session.accountId === account && actor.organizationId === org) actor.role = role;
    },
    provisionPlatformAdmin: async (email) => {
      const session = await organizations.provisionPlatformAdmin(email);
      actors.set(session.sessionId, { session, organizationId: null, role: 'member', type: 'platform_admin', emailVerified: true });
      return session;
    },
    vetOrganizationAsAdmin: async (admin, organizationId) => {
      const result = await organizations.setVetting(admin, { ...VETTING_EVIDENCE, organizationId });
      if (!result.ok) throw new Error(result.reason);
    },
    startDiscoveryNeed: async (session, organizationId, intake) => {
      const started = await needs.startNeed(session, { organizationId, ...intake });
      if (!started.ok) throw new Error(started.reason);
      const submitted = await needs.submitNeed(session, { organizationId, projectId: started.need.projectId });
      if (!submitted.ok) throw new Error(submitted.reason);
      return { projectId: submitted.need.projectId };
    },
    drainAllowance: async (session, organizationId, leave = 0) => {
      const read = await organizations.readAllowance(session, organizationId);
      if (!read.ok) throw new Error(read.reason);
      if (read.allowance.remaining > leave) {
        const debit = await organizations.debitAllowance(session, organizationId, read.allowance.remaining - leave);
        if (!debit.ok) throw new Error(debit.reason);
      }
    },
    writeSpendRowAsOperator: organizations.writeSpendRowAsOperator, spendRows: organizations.spendRows,
    writeScope: async (session, request) => {
      const actor = session === null ? undefined : actors.get(session.sessionId);
      if (!actor || actor.session.accountId !== session?.accountId) {
        return { ok: false, kind: 'unauthenticated', status: 401, reason: 'authenticate before Discovery' };
      }
      const caller = { id: session.accountId, githubHandle: null, emailVerified: actor.emailVerified };
      const decision = writePipeline(SCOPE_SPEC, { caller, target: request.organizationId, subject: null, ip: null, body: { ...request },
        standing: { kind: 'account', accountType: actor.type, lifecycle: 'active', orgExists: await organizations.profile(request.organizationId) !== null,
          orgRole: actor.organizationId === request.organizationId ? actor.role : null, orgSeatAccountId: null, subject: null } });
      if (!decision.ok) return decision;
      const begun = await beginScope(decision.args);
      if (!begun.ok) return begun;
      const acted = await scopeAct(opts.vendors.anthropic, skills)(begun.value, decision.args);
      if (acted.args === null) return { ok: false, kind: 'refused', status: 502, reason: acted.failure! };
      const result = await commitScope(acted.args);
      return acted.failure === null ? result : { ok: false, kind: 'refused', status: 502, reason: acted.failure };
    },
    seedCauseLabelsAsOperator: async (labels) => {
      for (const raw of labels) {
        const label = canonicalLabel(raw);
        if (label === '' || vocabulary.has(label)) continue;
        vocabulary.set(label, { label, firstProjectId: null });
      }
    },
    causeLabelRows: async () => [...vocabulary.values()]
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((row) => ({ ...row })),
    beginScopeAsOperator: async (input) => {
      const begun = await beginScope({
        p_account_id: input.accountId, p_organization_id: input.organizationId, p_project_id: input.projectId,
        p_action: 'generate', p_reason: null, p_label: null,
        p_settings: { turn_deadline_seconds: DISCOVERY_TURN_DEADLINE_SECONDS }, p_notice: null,
      });
      if (!begun.ok) return begun;
      const snapshot = renderScopeBegin(begun.value);
      if (snapshot.scope === null) return refuse('scope-not-open', 'the Discovery scope is not open');
      return { ok: true, scopeId: snapshot.scope.id };
    },
    commitScopeAsOperator: async (input) => commitScope({
      p_account_id: input.accountId, p_project_id: input.projectId, p_scope_id: input.scopeId,
      p_outcome: input.outcome, p_contract: input.contract ?? null, p_markdown: input.markdown ?? null,
      p_labels: input.labels ?? [], p_served_model: input.servedModel ?? null,
      p_input_tokens: input.inputTokens ?? null, p_output_tokens: input.outputTokens ?? null, p_changed: null,
    }),
    needRow: async (projectId) => {
      const row = await needs.needRow(projectId);
      if (row === null) return null;
      const overlay = needCauseLabels.get(projectId);
      return overlay === undefined ? row : { ...row, causeLabels: [...overlay] };
    },
    turnRows: async (projectId) => structuredClone((turns.get(projectId) ?? []).map(turnViewFromSql)),
    scopeRows: async (projectId) => structuredClone((scopes.get(projectId) ?? []).map(scopeViewFromSql)),
    reserveTurnAsOperator: async (input) => reserve({
      p_account_id: input.accountId, p_organization_id: input.organizationId, p_project_id: input.projectId,
      p_message: input.message, p_settings: { ...reserveSettings(), counted_input_tokens: input.countedInputTokens ?? 0 },
      p_counted_through_seq: input.countedThroughSeq ?? (turns.get(input.projectId) ?? []).filter((r) => r.status === 'settled').at(-1)?.seq ?? 0,
    }),
    settleTurnAsOperator: async (input) => settle({
      p_account_id: input.accountId, p_turn_id: input.turnId, p_outcome: input.outcome, p_assistant_message: input.reply ?? '',
      p_input_tokens: input.usage?.inputTokens ?? null, p_output_tokens: input.usage?.outputTokens ?? null,
      p_stop_reason: 'end_turn', p_served_model: DISCOVERY_REQUEST_SETTINGS.model, p_elicitation: null,
    }),
    backdateOpenTurnAsOperator: async (id, openedAt) => {
      const row = [...turns.values()].flat().find((r) => r.id === id && r.status === 'open');
      if (!row) throw new Error('no open turn to backdate');
      row.opened_at = openedAt;
    },
    sendMessage: async (session, request) => {
      const actor = session === null ? undefined : actors.get(session.sessionId);
      if (!actor || actor.session.accountId !== session?.accountId) return { ok: false, kind: 'unauthenticated', status: 401, reason: 'authenticate before Discovery' };
      const caller = { id: session.accountId, githubHandle: null, emailVerified: actor.emailVerified };
      const decision = writePipeline(SEND_SPEC, { caller, target: request.organizationId, subject: null, ip: null, body: request,
        standing: { kind: 'account', accountType: actor.type, lifecycle: 'active', orgExists: await organizations.profile(request.organizationId) !== null,
          orgRole: actor.organizationId === request.organizationId ? actor.role : null, orgSeatAccountId: null, subject: null } });
      if (!decision.ok) return decision;
      const need = await needs.needRow(request.projectId);
      const visible = need && actor.organizationId === need.organizationId ? need : null;
      const reads: CallerReads = {
        organization: async () => ({ ok: true, rows: [] }), seatsOf: async () => ({ ok: true, rows: [] }), projectsOf: async () => ({ ok: true, rows: [] }),
        project: async () => ({ ok: true, rows: visible ? [{ id: visible.projectId, name: visible.title, org_id: visible.organizationId, assigned_volunteer_id: null }] : [] }),
        need: async () => ({ ok: true, rows: visible ? [{ project_id: visible.projectId, description: visible.description, urgency: visible.urgency,
          stage: visible.stage, cause_labels: visible.causeLabels, reference_files: visible.referenceFiles.map((f) => ({ id: f.id, file_name: f.fileName,
            media_type: f.mediaType, byte_size: f.byteSize, description: f.description, added_by_account_id: f.addedByAccountId, added_at: f.addedAt })),
          tier2_classified_at: visible.tier2ClassifiedAt, submitted_at: visible.submittedAt, updated_at: visible.updatedAt }] : [] }),
        discoveryTurnsOf: async () => ({ ok: true, rows: visible ? structuredClone(turns.get(request.projectId) ?? []) : [] }),
        discoveryScopesOf: async () => ({ ok: true, rows: visible ? structuredClone(scopes.get(request.projectId) ?? []) : [] }),
        discoveryAllowance: async (organizationId) => {
          const original = [...actors.values()].find((entry) => entry.session.accountId === actor.session.accountId)!;
          const result = await organizations.readAllowance(original.session, organizationId);
          return result.ok ? { ok: true, value: sqlAllowance(result.allowance) } : { ok: false, detail: result.reason };
        },
      };
      const prepared = await discoveryPrepare(opts.vendors.anthropic, skills)(caller, decision.args, reads);
      if (!prepared.ok) return prepared;
      const reserved = await reserve(prepared.args);
      if (!reserved.ok) return reserved;
      const acted = await discoveryAct(opts.vendors.anthropic)(reserved.reservation, prepared.args);
      if (acted.args === null) return { ok: false, kind: 'refused', status: 502, reason: acted.failure! };
      const result = await settle(acted.args);
      return acted.failure === null ? result : { ok: false, kind: 'refused', status: 502, reason: acted.failure };
    },
    readConversation: async (session, projectId) => {
      const need = await needs.readNeed(session, projectId);
      if (!need.ok) return need;
      const actor = session && actors.get(session.sessionId);
      if (!actor) return { ok: false, answer: { status: 401, body: JSON.stringify({ ok: false, reason: 'authenticate before Discovery' }) } };
      const answer = await conversationAnswer({
        project: async () => ({ ok: true, rows: [{ id: projectId, name: need.value.need.title,
          org_id: need.value.need.organizationId, assigned_volunteer_id: null }] }),
        discoveryTurnsOf: async () => ({ ok: true, rows: structuredClone(turns.get(projectId) ?? []) }),
        discoveryScopesOf: async () => ({ ok: true, rows: structuredClone(scopes.get(projectId) ?? []) }),
        discoveryAllowance: async (organizationId) => {
          const original = [...actors.values()].find((entry) => entry.session.accountId === actor.session.accountId)!;
          const result = await organizations.readAllowance(original.session, organizationId);
          return result.ok ? { ok: true, value: sqlAllowance(result.allowance) } : { ok: false, detail: result.reason };
        },
      }, projectId);
      const raw = { status: answer.status, body: JSON.stringify(answer.body) };
      return answer.status === 200 ? { ok: true, value: answer.body, answer: raw } : { ok: false, answer: raw };
    },
    setEmailVerifiedAsOperator: async (accountId, verified) => {
      const actor = [...actors.values()].find((entry) => entry.session.accountId === accountId);
      if (!actor) throw new Error('no Discovery actor whose email confirmation could be set');
      if (verified) {
        const link = await accounts.emailedVerificationLink(actor.session.email);
        if (link === null) throw new Error('no verification link for the Discovery actor');
        const used = await accounts.useVerificationLink(link);
        if (!used.ok) throw new Error('the verification link did not confirm the address');
      } else {
        await accounts.clearEmailConfirmationAsOperator(accountId);
      }
      for (const entry of actors.values()) if (entry.session.accountId === accountId) entry.emailVerified = verified;
    },
    setProjectFundingAsOperator: async (projectId, value) => {
      if (value.fundedAt === null) funding.delete(projectId);
      else funding.set(projectId, { fundedAt: value.fundedAt, fuelMicros: value.fuelMicros });
    },
    projectFundingAsOperator: async (projectId) => {
      const entry = funding.get(projectId);
      return entry === undefined ? { fundedAt: null, fuelMicros: 0 } : { ...entry };
    },
    setDiscoverySwitch: async (session, request) => {
      const actor = session === null ? undefined : actors.get(session.sessionId);
      if (!actor || actor.session.accountId !== session?.accountId) {
        return { ok: false, kind: 'unauthenticated', status: 401, reason: 'authenticate before Discovery' };
      }
      const caller = { id: session.accountId, githubHandle: null, emailVerified: actor.emailVerified };
      const decision = writePipeline(SWITCH_SPEC, {
        caller, target: request.organizationId, subject: null, ip: null, body: request,
        standing: {
          kind: 'account', accountType: actor.type, lifecycle: 'active',
          orgExists: await organizations.profile(request.organizationId) !== null,
          orgRole: actor.organizationId === request.organizationId ? actor.role : null,
          orgSeatAccountId: null, subject: null,
        },
      });
      if (!decision.ok) return decision;
      const current = switches.get(decision.args.p_organization_id);
      const currentlyEnabled = current === undefined;
      const rendered = (row: { organization_id: string; discovery_enabled: boolean; changed: boolean; disabled_at: string | null }) => {
        const view = renderDiscoverySwitch(row);
        return { ok: true as const, organizationId: view.organizationId ?? row.organization_id,
          discoveryEnabled: view.discoveryEnabled, changed: view.changed, disabledAt: view.disabledAt };
      };
      if (decision.args.p_enabled === currentlyEnabled) {
        return rendered({
          organization_id: decision.args.p_organization_id, discovery_enabled: decision.args.p_enabled,
          changed: false, disabled_at: current?.disabledAt ?? null,
        });
      }
      if (decision.args.p_enabled) {
        switches.delete(decision.args.p_organization_id);
        switchAudits.push({
          id: crypto.randomUUID(), actorAccountId: session.accountId, subjectOrgId: decision.args.p_organization_id,
          reason: decision.args.p_reason, detail: { enabled: true, previously_disabled_at: current?.disabledAt ?? null },
        });
        return rendered({
          organization_id: decision.args.p_organization_id, discovery_enabled: true, changed: true, disabled_at: null,
        });
      }
      const disabledAt = now();
      switches.set(decision.args.p_organization_id, { disabledAt, disabledBy: session.accountId, reason: decision.args.p_reason });
      switchAudits.push({
        id: crypto.randomUUID(), actorAccountId: session.accountId, subjectOrgId: decision.args.p_organization_id,
        reason: decision.args.p_reason, detail: { enabled: false, previously_disabled_at: current?.disabledAt ?? null },
      });
      return rendered({
        organization_id: decision.args.p_organization_id, discovery_enabled: false, changed: true, disabled_at: disabledAt,
      });
    },
    discoverySwitchAuditEvents: async (organizationId) => switchAudits.filter((event) => event.subjectOrgId === organizationId).map((event) => structuredClone(event)),
    seedTurnsAsOperator: async (projectId, seeds) => {
      const need = await needs.needRow(projectId);
      if (!need) throw new Error('no need for seeded turns');
      const settings = reserveSettings();
      const rows = turns.get(projectId) ?? [];
      for (const seed of seeds) {
        const estimatedInputTokens = countedInputTokens(seed.usage.inputTokens);
        const maxOutputTokens = Math.max(settings.max_output_tokens, seed.usage.outputTokens);
        const bound = reservationFor({ estimatedInputTokens, maxOutputTokens });
        const cost = settlementFor({ ...bound, billing: 'free', usage: seed.usage });
        rows.push({ id: crypto.randomUUID(), project_id: projectId, org_id: need.organizationId,
          seq: (rows.at(-1)?.seq ?? 0) + 1, status: 'settled', billing: 'free', utc_day: now().slice(0, 10),
          user_message: seed.message, assistant_message: seed.reply, elicitation: seed.elicitation ?? null,
          request_settings: { model: settings.model, max_tokens: maxOutputTokens, effort: settings.effort },
          max_output_tokens: maxOutputTokens, estimated_input_tokens: estimatedInputTokens,
          micros_per_credit: settings.micros_per_credit, input_micros_per_token: settings.input_micros_per_token,
          output_micros_per_token: settings.output_micros_per_token, reserved_micros: bound.reservedMicros,
          reserved_credits: bound.reservedCredits, input_tokens: seed.usage.inputTokens, output_tokens: seed.usage.outputTokens,
          stop_reason: 'end_turn', served_model: settings.model, actual_micros: cost.actualMicros,
          charged_credits: cost.chargedCredits, overrun_micros: cost.overrunMicros, opened_at: now(), settled_at: now() });
      }
      turns.set(projectId, rows);
    },
    spendLedgerInvariantProblems: async (organizationId) => {
      const spend = await organizations.spendRows(organizationId);
      const free = [...turns.values()].flat().filter((row) => row.org_id === organizationId && row.billing === 'free');
      const problems: string[] = [];
      for (const row of spend) {
        const accounted = free.filter((turn) => turn.utc_day === row.utcDay)
          .reduce((sum, turn) => sum + (turn.status === 'open' ? turn.reserved_credits : turn.charged_credits ?? 0), 0);
        if (row.spent !== accounted) problems.push(`utc_day=${row.utcDay} spent=${row.spent} accounted=${accounted}`);
      }
      for (const turn of [...turns.values()].flat().filter((row) => row.org_id === organizationId)) {
        if (turn.status === 'settled' && (turn.overrun_micros ?? 0) > 0) {
          problems.push(`overrun utc_day=${turn.utc_day} overrun_micros=${turn.overrun_micros}`);
        }
      }
      return problems;
    },
  };
  return { sut: { discovery: sut }, fixtures: inner.fixtures, teardown: async () => { await inner.teardown(); actors.clear(); turns.clear(); scopes.clear(); vocabulary.clear(); needCauseLabels.clear(); funding.clear(); switches.clear(); switchAudits.length = 0; } };
}
