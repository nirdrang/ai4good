import { createLiveAdapter as createNeedsAdapter } from '../req-003/_live.ts';
import { functionPost, functionPostRaw, sqlClient, type Stack } from '../../harness/live-stack.ts';
import { AtPending, CapabilityPending } from '../../harness/pending.ts';
import { AWAITED } from './_pending.ts';
import { countedInputTokens, reservationFor, settlementFor, reserveSettings, DISCOVERY_REQUEST_SETTINGS } from '../../../../supabase/functions/_shared/discovery-metering.ts';
import { turnViewFromSql, renderReservation, renderDiscoveryMessage, type DiscoveryTurnSqlRow } from '../../../../supabase/functions/_shared/discovery-turn.ts';
import { parseWriteRefusalKind } from '../../../../supabase/functions/_shared/write-routes.ts';
import type { DiscoverySut, DiscoveryMessageOutcome, DiscoveryConversationView, WriteRefusal } from './_contract.ts';
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
  const later = async (): Promise<never> => { throw new AtPending('AT-004', 'sut-missing', 'lands in a later unit of this run'); };
  const sut: DiscoverySut = {
    ...needs,
    provisionPlatformAdmin: organizations.provisionPlatformAdmin,
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
    turnRows: async (projectId) => {
      const rows = await sql`select to_jsonb(t) as turn from public.discovery_turns t
        where project_id = ${projectId}::uuid order by seq` as { turn: unknown }[];
      return rows.map((r) => turnViewFromSql(decoded(r.turn) as DiscoveryTurnSqlRow));
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
        const result = await sql`select public.discovery_turn_settle(${input.accountId}::uuid, ${input.turnId}::uuid,
          ${input.outcome}::text, ${input.reply ?? ''}::text, ${input.usage?.inputTokens ?? null}::integer,
          ${input.usage?.outputTokens ?? null}::integer, 'end_turn', ${DISCOVERY_REQUEST_SETTINGS.model}::text, null::jsonb) as value` as { value: unknown }[];
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
      const value = JSON.parse(raw.text) as { ok: true; conversation: DiscoveryConversationView; allowance: Allowance };
      if (value.ok !== true || !value.conversation || !value.allowance) throw new Error('discovery-conversation returned no conversation or allowance');
      return { ok: true, value, answer };
    },
    setEmailVerifiedAsOperator: later,
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
    setDiscoverySwitch: later, discoverySwitchAuditEvents: later,
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
            project_id, org_id, seq, status, billing, utc_day, user_message, assistant_message, request_settings,
            max_output_tokens, estimated_input_tokens, micros_per_credit, input_micros_per_token, output_micros_per_token,
            reserved_micros, reserved_credits, input_tokens, output_tokens, stop_reason, served_model, actual_micros,
            charged_credits, overrun_micros, opened_at, settled_at
          ) values (${projectId}::uuid, ${projects[0].org_id}::uuid, ${++seq}, 'settled', 'free',
            (clock_timestamp() at time zone 'utc')::date, ${seed.message}, ${seed.reply}, ${JSON.stringify(request)}::text::jsonb,
            ${cap}, ${estimated}, ${settings.micros_per_credit}, ${settings.input_micros_per_token}, ${settings.output_micros_per_token},
            ${bound.reservedMicros}, ${bound.reservedCredits}, ${seed.usage.inputTokens}, ${seed.usage.outputTokens},
            'end_turn', ${settings.model}, ${cost.actualMicros}, ${cost.chargedCredits}, ${cost.overrunMicros}, clock_timestamp(), clock_timestamp())`;
        }
      });
    },
    spendLedgerInvariantProblems: later,
  };
  return { sut: { discovery: sut }, fixtures: inner.fixtures,
    teardown: async () => { try { await inner.teardown(); } finally { await sql.close(); } } };
}
