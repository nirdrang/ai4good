import { renderDiscoveryAllowance, type Allowance } from './discovery-allowance.ts';
import { DISCOVERY_MESSAGE_MAX_CHARS, DISCOVERY_REQUEST_SETTINGS, reserveSettings, type DiscoveryReserveSettings, type ModelUsage } from './discovery-metering.ts';
import { discoverySystemPrompt, type DiscoveryNeed } from './discovery-prompt.ts';
import type { CallerReads, DiscoveryTurnSqlRow } from './discovery-reads.ts';
import { orgAdminActionAllowed } from './memberships.ts';
import { needIntakeAnswer } from './need-intake.ts';
import type { Caller } from './caller.ts';
import { discoveryMessageAllowed } from './verification.ts';
import { isRecord, refuseWrite, stringField, uuidField, type AccountWriteRouteInput, type WriteRouteDecision } from './write-routes.ts';

export type { CallerReads, DiscoveryReads, DiscoveryTurnSqlRow } from './discovery-reads.ts';
export type Elicitation = NonNullable<DiscoveryTurnSqlRow['elicitation']>;
export type DiscoveryModelRequest = {
  model: string; maxTokens: number; effort: 'low'; system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
};
export type DiscoveryModelAnswer =
  | { ok: true; text: string; stopReason: string; usage: ModelUsage; model: string; toolUse?: { name: string; input: unknown } | null }
  | { ok: false; status: number | null; reason: string };
export type MessagesPort = {
  create(request: DiscoveryModelRequest): Promise<DiscoveryModelAnswer>;
  countTokens(request: DiscoveryModelRequest): Promise<number>;
};
export function turnViewFromSql(row: DiscoveryTurnSqlRow) {
  return {
    id: row.id, projectId: row.project_id, seq: row.seq, status: row.status, billing: row.billing,
    utcDay: row.utc_day.slice(0, 10), userMessage: row.user_message, assistantMessage: row.assistant_message,
    elicitation: row.elicitation, requestSettings: {
      model: row.request_settings.model, maxTokens: row.request_settings.max_tokens, effort: row.request_settings.effort,
    }, maxOutputTokens: row.max_output_tokens, estimatedInputTokens: row.estimated_input_tokens,
    reservedCredits: row.reserved_credits, chargedCredits: row.charged_credits,
    reservedMicros: row.reserved_micros, actualMicros: row.actual_micros, overrunMicros: row.overrun_micros,
    inputTokens: row.input_tokens, outputTokens: row.output_tokens, stopReason: row.stop_reason,
    servedModel: row.served_model, openedAt: row.opened_at, settledAt: row.settled_at,
  };
}
export type DiscoveryTurnView = ReturnType<typeof turnViewFromSql>;
const PREPARED_REQUEST = Symbol('discovery prepared request');
export type DiscoveryReserveArgs = {
  p_account_id: string; p_organization_id: string; p_project_id: string; p_message: string;
  p_settings: DiscoveryReserveSettings; p_counted_through_seq: number;
  [PREPARED_REQUEST]?: DiscoveryModelRequest;
};
export type Reservation = {
  turn: DiscoveryTurnSqlRow; need: DiscoveryNeed; context: DiscoveryModelRequest['messages']; allowance: unknown;
};
export function renderReservation(value: unknown): Reservation {
  if (!isRecord(value) || !isRecord(value.turn) || !Array.isArray(value.context) || !isRecord(value.need)) {
    throw new Error('discovery reserve returned no turn context');
  }
  return value as Reservation;
}
export function decideDiscoveryMessage(input: AccountWriteRouteInput): WriteRouteDecision<DiscoveryReserveArgs> {
  if (input.target === null) return refuseWrite('invalid-request', 400, 'a Discovery message must name its organisation');
  if (!input.standing.orgExists) return refuseWrite('no-such-organisation', 409, 'no such organisation');
  const allowed = orgAdminActionAllowed(input.standing.orgRole);
  if (!allowed.ok) return refuseWrite(allowed.kind, 403, allowed.reason);
  const projectId = uuidField(input.body.projectId);
  const message = stringField(input.body.message);
  if (projectId === null || message === null || message.length > DISCOVERY_MESSAGE_MAX_CHARS) {
    return refuseWrite('invalid-request', 400, 'a Discovery message requires a project id and text within the message limit');
  }
  return { ok: true, args: {
    p_account_id: input.caller.id, p_organization_id: input.target, p_project_id: projectId,
    p_message: message, p_settings: reserveSettings(), p_counted_through_seq: 0,
  } };
}
export function buildModelRequest(input: { need: DiscoveryNeed; context: DiscoveryModelRequest['messages']; maxTokens?: number }): DiscoveryModelRequest {
  return {
    model: DISCOVERY_REQUEST_SETTINGS.model, maxTokens: input.maxTokens ?? DISCOVERY_REQUEST_SETTINGS.maxOutputTokens,
    effort: DISCOVERY_REQUEST_SETTINGS.effort, system: discoverySystemPrompt(input.need), messages: input.context,
  };
}
export function discoveryPrepare(port: MessagesPort) {
  return async (caller: Caller, args: DiscoveryReserveArgs, reads: CallerReads): Promise<WriteRouteDecision<DiscoveryReserveArgs>> => {
    const allowed = discoveryMessageAllowed({ emailVerified: caller.emailVerified });
    if (!allowed.ok) return refuseWrite('email-unverified', 409, allowed.reason);
    const need = await needIntakeAnswer(reads, args.p_project_id);
    if (need.status !== 200) return refuseWrite('no-such-project', need.status, need.body.reason);
    const turns = await reads.discoveryTurnsOf(args.p_project_id);
    if (!turns.ok) throw new Error(turns.detail);
    const settled = turns.rows.filter((row) => row.status === 'settled').sort((a, b) => a.seq - b.seq);
    const request = buildModelRequest({
      need: { title: need.body.need.title, description: need.body.need.description, urgency: need.body.need.urgency,
        reference_files: need.body.need.referenceFiles.map((file) => file.fileName) },
      context: [...settled.flatMap((row): DiscoveryModelRequest['messages'] => [
        { role: 'user', content: row.user_message }, { role: 'assistant', content: row.assistant_message! },
      ]), { role: 'user', content: args.p_message }],
    });
    const count = await port.countTokens(request);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('the provider returned an invalid token count');
    return { ok: true, args: { ...args, p_settings: { ...args.p_settings, counted_input_tokens: count },
      p_counted_through_seq: settled.at(-1)?.seq ?? 0, [PREPARED_REQUEST]: request } };
  };
}
export type DiscoverySettleArgs = {
  p_account_id: string; p_turn_id: string; p_outcome: 'completed' | 'failed'; p_assistant_message: string | null;
  p_input_tokens: number | null; p_output_tokens: number | null; p_stop_reason: string | null;
  p_served_model: string | null; p_elicitation: Elicitation | null;
};
export function settleArgsFrom(reservation: Reservation, answer: DiscoveryModelAnswer, accountId: string): {
  args: DiscoverySettleArgs | null; failure: string | null;
} {
  if (!answer.ok && answer.status === null) return { args: null, failure: answer.reason };
  return {
    args: {
      p_account_id: accountId, p_turn_id: reservation.turn.id, p_outcome: answer.ok ? 'completed' : 'failed',
      p_assistant_message: answer.ok ? answer.text : null, p_input_tokens: answer.ok ? answer.usage.inputTokens : null,
      p_output_tokens: answer.ok ? answer.usage.outputTokens : null, p_stop_reason: answer.ok ? answer.stopReason : null,
      p_served_model: answer.ok ? answer.model : null, p_elicitation: null,
    }, failure: answer.ok ? null : answer.reason,
  };
}
export function discoveryAct(port: MessagesPort) {
  return async (value: unknown, args: DiscoveryReserveArgs) => {
    const reservation = renderReservation(value);
    const prepared = args[PREPARED_REQUEST];
    if (prepared === undefined) throw new Error('Discovery has no counted request');
    const answer = await port.create({ ...prepared, maxTokens: reservation.turn.max_output_tokens });
    return settleArgsFrom(reservation, answer, args.p_account_id);
  };
}
export function renderDiscoveryMessage(value: unknown): {
  turn: DiscoveryTurnView; reply: string; elicitation: Elicitation | null; allowance: Allowance | null;
} {
  if (!isRecord(value) || !isRecord(value.turn)) throw new Error('discovery settle returned no turn');
  const turn = turnViewFromSql(value.turn as DiscoveryTurnSqlRow);
  return { turn, reply: turn.assistantMessage ?? '', elicitation: turn.elicitation,
    allowance: value.allowance === null ? null : renderDiscoveryAllowance(value.allowance) };
}
