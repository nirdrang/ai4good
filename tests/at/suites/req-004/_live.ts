import { createLiveAdapter as createNeedsAdapter } from '../req-003/_live.ts';
import { authPost, functionPost, functionPostRaw, sqlClient, type Stack } from '../../harness/live-stack.ts';
import { CapabilityPending } from '../../harness/pending.ts';
import { AWAITED } from './_pending.ts';
import { countedInputTokens, reservationFor, settlementFor, reserveSettings, DISCOVERY_OFF_TOPIC_FLAG_STRIKES, DISCOVERY_REQUEST_SETTINGS, DISCOVERY_TURN_DEADLINE_SECONDS } from '../../../../supabase/functions/_shared/discovery-metering.ts';
import { turnViewFromSql, renderReservation, renderDiscoveryMessage, offTopicFlaggedNotice, type DiscoveryTurnSqlRow } from '../../../../supabase/functions/_shared/discovery-turn.ts';
import { canonicalLabel, renderDiscoveryScope, renderScopeBegin, scopeViewFromSql, type ScopeSqlRow } from '../../../../supabase/functions/_shared/scope.ts';
import { parseWriteRefusalKind } from '../../../../supabase/functions/_shared/write-routes.ts';
import { renderDiscoverySwitch } from '../../../../supabase/functions/_shared/discovery-switch.ts';
import type { DiscoverySut, DiscoveryMessageOutcome, DiscoveryConversationView, DiscoverySwitchAuditRow, WriteRefusal, ScopeWriteOutcome } from './_contract.ts';
import type { Allowance } from '../../../../supabase/functions/_shared/discovery-allowance.ts';

export const requirement = 'req-004' as const;
export async function createLiveAdapter(opts: { stack: Stack }) {
  const inner = await createNeedsAdapter(opts);
  const needs = inner.sut.needs;
  const organizations = inner.organizations;
  const sql = sqlClient(opts.stack);
  const sqlRefusal = (error: unknown): WriteRefusal => {
    const e = error as { detail?: string; message?: string; cause?: { detail?: string } };
    return { ok: false, status: 409, kind: parseWriteRefusalKind(e.detail ?? e.cause?.detail), reason: e.message ?? String(error) };
  };
  const decoded = (value: unknown): unknown => typeof value === 'string' ? JSON.parse(value) : value;
  const PASSWORD = 'correct horse battery staple';
  const adminTokens = new Map<string, string>();
  const bearerFor = (session: Parameters<DiscoverySut['sendMessage']>[0]): string => {
    if (session === null) return inner.bearerOf(session);
    return adminTokens.get(session.sessionId) ?? inner.bearerOf(session);
  };
  const sut: DiscoverySut = {
    ...needs,
    provisionPlatformAdmin: async (email) => {
      const session = await organizations.provisionPlatformAdmin(email);
      const signedIn = await authPost(opts.stack, '/auth/v1/token?grant_type=password', { email, password: PASSWORD });
      const token = String(signedIn.json.access_token ?? '');
      if (!token) throw new Error('a provisioned platform administrator could not sign in');
      adminTokens.set(session.sessionId, token);
      return session;
    },
    vetOrganizationAsAdmin: async (admin, organizationId) => {
      const result = await organizations.setVetting(admin, {
        organizationId, action: 'vet', organizationName: 'Riverside Shelter', publicReferenceUrl: 'https://example.org/riverside',
        contactName: 'Dana Okonkwo', contactTitle: 'Executive Director',
        authorityAttestation: 'The named contact attests they have authority to bind the organisation.',
        evidenceType: 'organization_website', note: 'The website and named contact match the organisation.',
      });
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
      const read = await needs.readAllowance(session, organizationId);
      if (!read.ok) throw new Error(read.reason);
      if (read.allowance.remaining > leave) {
        const answer = await functionPost(opts.stack, 'discovery-allowance', {
          organizationId, action: 'debit', credits: read.allowance.remaining - leave,
        }, inner.bearerOf(session));
        if (answer.json.ok !== true) throw new Error(String(answer.json.reason));
      }
    },
    writeSpendRowAsOperator: organizations.writeSpendRowAsOperator,
    spendRows: organizations.spendRows,
    sendMessage: async (session, request): Promise<DiscoveryMessageOutcome> => {
      const answer = await functionPost(opts.stack, 'discovery-message', request, inner.bearerOf(session));
      if (answer.json.ok !== true) return { ok: false, status: answer.status,
        kind: answer.status === 401 ? 'unauthenticated' : parseWriteRefusalKind(answer.json.kind),
        reason: String(answer.json.reason ?? answer.json.message) };
      return answer.json as Extract<DiscoveryMessageOutcome, { ok: true }>;
    },
    writeScope: async (session, request): Promise<ScopeWriteOutcome> => {
      const answer = await functionPost(opts.stack, 'discovery-scope', request, inner.bearerOf(session));
      if (answer.json.ok !== true) return { ok: false, status: answer.status,
        kind: answer.status === 401 ? 'unauthenticated' : parseWriteRefusalKind(answer.json.kind),
        reason: String(answer.json.reason ?? answer.json.message) };
      return answer.json as Extract<ScopeWriteOutcome, { ok: true }>;
    },
    seedCauseLabelsAsOperator: async (labels) => {
      for (const raw of labels) {
        const label = canonicalLabel(raw);
        if (label === '') continue;
        await sql`insert into public.cause_labels (label) values (${label}) on conflict (label) do nothing`;
      }
    },
    causeLabelRows: async () => {
      const rows = await sql`select label, first_project_id from public.cause_labels order by label` as {
        label: string; first_project_id: string | null;
      }[];
      return rows.map((row) => ({
        label: String(row.label),
        firstProjectId: row.first_project_id === null ? null : String(row.first_project_id),
      }));
    },
    beginScopeAsOperator: async (input) => {
      const settings = { turn_deadline_seconds: DISCOVERY_TURN_DEADLINE_SECONDS };
      try {
        const result = await sql`select public.discovery_scope_begin(${input.accountId}::uuid, ${input.organizationId}::uuid,
          ${input.projectId}::uuid, 'generate'::text, null::text, null::text,
          ${JSON.stringify(settings)}::text::jsonb, null::jsonb) as value` as { value: unknown }[];
        const snapshot = renderScopeBegin(decoded(result[0].value));
        if (snapshot.scope === null) return sqlRefusal(new Error('the Discovery scope is not open'));
        return { ok: true, scopeId: snapshot.scope.id };
      } catch (error) { return sqlRefusal(error); }
    },
    commitScopeAsOperator: async (input) => {
      try {
        const labelsJson = JSON.stringify(input.labels ?? []);
        const result = await sql`select public.discovery_scope_commit(${input.accountId}::uuid, ${input.projectId}::uuid,
          ${input.scopeId}::uuid, ${input.outcome}::text,
          ${input.contract == null ? null : JSON.stringify(input.contract)}::text::jsonb,
          ${input.markdown ?? null}::text,
          coalesce((select array_agg(value) from jsonb_array_elements_text(${labelsJson}::text::jsonb) as value), '{}'::text[]),
          ${input.servedModel ?? null}::text, ${input.inputTokens ?? null}::integer, ${input.outputTokens ?? null}::integer, null::boolean
        ) as value` as { value: unknown }[];
        return { ok: true, ...renderDiscoveryScope(decoded(result[0].value)) };
      } catch (error) { return sqlRefusal(error); }
    },
    turnRows: async (projectId) => {
      const rows = await sql`select to_jsonb(t) as turn from public.discovery_turns t
        where project_id = ${projectId}::uuid order by seq` as { turn: unknown }[];
      return rows.map((r) => turnViewFromSql(decoded(r.turn) as DiscoveryTurnSqlRow));
    },
    scopeRows: async (projectId) => {
      const rows = await sql`select to_jsonb(s) as scope from public.discovery_scopes s
        where project_id = ${projectId}::uuid order by version` as { scope: unknown }[];
      return rows.map((r) => scopeViewFromSql(decoded(r.scope) as ScopeSqlRow));
    },
    reserveTurnAsOperator: async (input) => {
      const rows = await sql`select coalesce(max(seq), 0) as seq from public.discovery_turns
        where project_id = ${input.projectId}::uuid and status = 'settled'` as { seq: number }[];
      const settings = { ...reserveSettings(), counted_input_tokens: input.countedInputTokens ?? 0 };
      try {
        const result = await sql`select public.discovery_turn_reserve(${input.accountId}::uuid, ${input.organizationId}::uuid,
          ${input.projectId}::uuid, ${input.message}::text, ${JSON.stringify(settings)}::text::jsonb,
          ${input.countedThroughSeq ?? rows[0].seq}::integer) as value` as { value: unknown }[];
        return { ok: true, reservation: renderReservation(decoded(result[0].value)) };
      } catch (error) { return sqlRefusal(error); }
    },
    settleTurnAsOperator: async (input) => {
      try {
        let noticeJson: string | null = null;
        if (input.offTopic === true) {
          const found = await sql`select project_id, org_id, request_settings from public.discovery_turns
            where id = ${input.turnId}::uuid` as { project_id: string; org_id: string; request_settings: unknown }[];
          const row = found[0];
          if (row === undefined) return sqlRefusal(new Error('no open Discovery turn'));
          const settings = (typeof row.request_settings === 'string' ? JSON.parse(row.request_settings) : row.request_settings) as {
            guardrails?: { off_topic_flag_strikes?: number };
          } | null;
          const notice = offTopicFlaggedNotice({
            projectId: String(row.project_id), organizationId: String(row.org_id),
            strikes: settings?.guardrails?.off_topic_flag_strikes ?? DISCOVERY_OFF_TOPIC_FLAG_STRIKES,
          });
          if (notice.ok) noticeJson = JSON.stringify(notice.value);
        }
        const result = await sql`select public.discovery_turn_settle(${input.accountId}::uuid, ${input.turnId}::uuid,
          ${input.outcome}::text, ${input.reply ?? ''}::text, ${input.usage?.inputTokens ?? null}::integer,
          ${input.usage?.outputTokens ?? null}::integer, 'end_turn', ${DISCOVERY_REQUEST_SETTINGS.model}::text, null::jsonb,
          ${input.offTopic === true}::boolean, ${noticeJson}::text::jsonb) as value` as { value: unknown }[];
        return { ok: true, ...renderDiscoveryMessage(decoded(result[0].value)) };
      } catch (error) { return sqlRefusal(error); }
    },
    backdateOpenTurnAsOperator: async (turnId, openedAt) => {
      await sql.begin(async (tx) => {
        await tx`alter table public.discovery_turns disable trigger discovery_turns_immutable`;
        const rows = await tx`update public.discovery_turns set opened_at = ${openedAt}::timestamptz
          where id = ${turnId}::uuid and status = 'open' returning id` as { id: string }[];
        if (rows.length !== 1) throw new Error('no open turn to backdate');
        await tx`alter table public.discovery_turns enable trigger discovery_turns_immutable`;
      });
    },
    readConversation: async (session, projectId) => {
      const raw = await functionPostRaw(opts.stack, 'discovery-conversation', { projectId }, inner.bearerOf(session));
      const answer = { status: raw.status, body: raw.text };
      if (raw.status !== 200) return { ok: false, answer };
      const value = JSON.parse(raw.text) as { ok: true; conversation: DiscoveryConversationView; allowance: Allowance | null };
      if (value.ok !== true || !value.conversation) throw new Error('discovery-conversation returned no conversation');
      return { ok: true, value, answer };
    },
    setEmailVerifiedAsOperator: async (accountId, verified) => {
      const rows = verified
        ? await sql`update auth.users set email_confirmed_at = coalesce(email_confirmed_at, clock_timestamp())
            where id = ${accountId}::uuid returning id` as { id: string }[]
        : await sql`update auth.users set email_confirmed_at = null
            where id = ${accountId}::uuid returning id` as { id: string }[];
      if (rows.length !== 1) throw new Error('no auth user whose email confirmation could be set');
    },
    setProjectFundingAsOperator: async (projectId, value) => {
      if (value.fuelMicros > 0) throw new CapabilityPending([AWAITED.projectFuelCheckout]);
      const rows = value.fundedAt === null
        ? await sql`update public.projects set funded_at = null where id = ${projectId}::uuid returning id` as { id: string }[]
        : await sql`update public.projects set funded_at = ${value.fundedAt}::timestamptz where id = ${projectId}::uuid returning id` as { id: string }[];
      if (rows.length !== 1) throw new Error('no such project');
    },
    projectFundingAsOperator: async (projectId) => {
      const rows = await sql`select funded_at, public.project_fuel_available_micros(${projectId}::uuid) as fuel_micros
        from public.projects where id = ${projectId}::uuid` as { funded_at: Date | string | null; fuel_micros: string | number }[];
      if (rows.length !== 1) throw new Error('no such project');
      return {
        fundedAt: rows[0].funded_at === null ? null : new Date(rows[0].funded_at).toISOString(),
        fuelMicros: Number(rows[0].fuel_micros),
      };
    },
    setDiscoverySwitch: async (session, request) => {
      const answer = await functionPost(opts.stack, 'set-organization-discovery', request, bearerFor(session));
      if (answer.json.ok !== true) return { ok: false, status: answer.status,
        kind: answer.status === 401 ? 'unauthenticated' : parseWriteRefusalKind(answer.json.kind),
        reason: String(answer.json.reason ?? answer.json.message) };
      const rendered = renderDiscoverySwitch({
        organization_id: answer.json.organizationId ?? request.organizationId,
        discovery_enabled: answer.json.discoveryEnabled,
        changed: answer.json.changed,
        disabled_at: answer.json.disabledAt,
      });
      return { ok: true, organizationId: rendered.organizationId ?? request.organizationId,
        discoveryEnabled: rendered.discoveryEnabled, changed: rendered.changed, disabledAt: rendered.disabledAt };
    },
    discoverySwitchAuditEvents: async (organizationId) => {
      const rows = await sql`select id, actor_account_id, subject_org_id, reason, detail
        from public.audit_events
       where event_kind = 'org_discovery_switched' and subject_org_id = ${organizationId}::uuid
       order by occurred_at, id` as {
        id: string; actor_account_id: string | null; subject_org_id: string; reason: string; detail: unknown;
      }[];
      return rows.map((row): DiscoverySwitchAuditRow => {
        const detail = (typeof row.detail === 'string' ? JSON.parse(row.detail) : row.detail) as Record<string, unknown>;
        return {
          id: String(row.id),
          actorAccountId: row.actor_account_id === null ? null : String(row.actor_account_id),
          subjectOrgId: String(row.subject_org_id),
          reason: row.reason,
          detail: {
            enabled: detail.enabled === true,
            previously_disabled_at: detail.previously_disabled_at == null ? null : String(detail.previously_disabled_at),
          },
        };
      });
    },
    seedTurnsAsOperator: async (projectId, seeds) => {
      await sql.begin(async (tx) => {
        const projects = await tx`select org_id from public.projects where id = ${projectId}::uuid for update` as { org_id: string }[];
        if (projects.length !== 1) throw new Error('no project for seeded turns');
        const rows = await tx`select coalesce(max(seq), 0) as seq from public.discovery_turns where project_id = ${projectId}::uuid` as { seq: number }[];
        let seq = rows[0].seq;
        const settings = reserveSettings();
        for (const seed of seeds) {
          const estimated = countedInputTokens(seed.usage.inputTokens);
          const cap = Math.max(settings.max_output_tokens, seed.usage.outputTokens);
          const bound = reservationFor({ estimatedInputTokens: estimated, maxOutputTokens: cap });
          const cost = settlementFor({ ...bound, billing: 'free', usage: seed.usage });
          const request = { model: settings.model, max_tokens: cap, effort: settings.effort };
          await tx`insert into public.discovery_turns (
            project_id, org_id, seq, status, billing, utc_day, user_message, assistant_message, elicitation, request_settings,
            max_output_tokens, estimated_input_tokens, micros_per_credit, input_micros_per_token, output_micros_per_token,
            reserved_micros, reserved_credits, input_tokens, output_tokens, stop_reason, served_model, actual_micros,
            charged_credits, overrun_micros, opened_at, settled_at
          ) values (${projectId}::uuid, ${projects[0].org_id}::uuid, ${++seq}, 'settled', 'free',
            (clock_timestamp() at time zone 'utc')::date, ${seed.message}, ${seed.reply},
            ${seed.elicitation == null ? null : JSON.stringify(seed.elicitation)}::text::jsonb,
            ${JSON.stringify(request)}::text::jsonb,
            ${cap}, ${estimated}, ${settings.micros_per_credit}, ${settings.input_micros_per_token}, ${settings.output_micros_per_token},
            ${bound.reservedMicros}, ${bound.reservedCredits}, ${seed.usage.inputTokens}, ${seed.usage.outputTokens},
            'end_turn', ${settings.model}, ${cost.actualMicros}, ${cost.chargedCredits}, ${cost.overrunMicros}, clock_timestamp(), clock_timestamp())`;
        }
      });
    },
    notificationEvents: async (event) => {
      const rows = await sql`select event, payload from public.notification_events
        where event = ${event} order by created_at, id` as { event: string; payload: unknown }[];
      return rows.map((row) => ({
        event: String(row.event),
        payload: (typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload) as Record<string, unknown>,
      }));
    },
    spendLedgerInvariantProblems: async (organizationId) => {
      const mismatches = await sql`select s.utc_day::text as utc_day, s.spent,
             coalesce(sum(case t.status when 'open' then t.reserved_credits else t.charged_credits end), 0) as accounted
        from public.discovery_spend s
        left join public.discovery_turns t on t.org_id = s.org_id and t.utc_day = s.utc_day and t.billing = 'free'
       where s.org_id = ${organizationId}::uuid
       group by s.org_id, s.utc_day, s.spent
      having s.spent <> coalesce(sum(case t.status when 'open' then t.reserved_credits else t.charged_credits end), 0)` as {
        utc_day: string; spent: number | string; accounted: number | string;
      }[];
      const overruns = await sql`select utc_day::text as utc_day, overrun_micros
        from public.discovery_turns
       where org_id = ${organizationId}::uuid and status = 'settled' and overrun_micros > 0` as {
        utc_day: string; overrun_micros: number | string;
      }[];
      return [
        ...mismatches.map((row) => `utc_day=${row.utc_day} spent=${Number(row.spent)} accounted=${Number(row.accounted)}`),
        ...overruns.map((row) => `overrun utc_day=${row.utc_day} overrun_micros=${Number(row.overrun_micros)}`),
      ];
    },
  };
  return { sut: { discovery: sut }, fixtures: inner.fixtures,
    teardown: async () => { try { await inner.teardown(); } finally { await sql.close(); adminTokens.clear(); } } };
}
