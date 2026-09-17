import { createLiveAdapter as createNeedsAdapter } from '../req-003/_live.ts';
import { functionPost, sqlClient, type Stack } from '../../harness/live-stack.ts';
import { AtPending } from '../../harness/pending.ts';
import { reserveSettings, DISCOVERY_REQUEST_SETTINGS } from '../../../../supabase/functions/_shared/discovery-metering.ts';
import { turnViewFromSql, renderReservation, renderDiscoveryMessage, type DiscoveryTurnSqlRow } from '../../../../supabase/functions/_shared/discovery-turn.ts';
import { parseWriteRefusalKind } from '../../../../supabase/functions/_shared/write-routes.ts';
import type { DiscoverySut, DiscoveryMessageOutcome, WriteRefusal } from './_contract.ts';

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
    readConversation: later, setProjectFundingAsOperator: later, setEmailVerifiedAsOperator: later,
    setDiscoverySwitch: later, discoverySwitchAuditEvents: later,
    seedTurnsAsOperator: later, spendLedgerInvariantProblems: later,
  };
  return { sut: { discovery: sut }, fixtures: inner.fixtures,
    teardown: async () => { try { await inner.teardown(); } finally { await sql.close(); } } };
}
