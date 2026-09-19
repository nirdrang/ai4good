import { renderDiscoveryAllowance, type Allowance } from './discovery-allowance.ts';
import { billingTargetFor, DISCOVERY_MESSAGE_MAX_CHARS, DISCOVERY_OFF_TOPIC_FLAG_STRIKES, DISCOVERY_REQUEST_SETTINGS, reserveSettings, type DiscoveryReserveSettings, type ModelUsage } from './discovery-metering.ts';
import { contextMessagesFrom, DECLINE_OFF_TOPIC_TOOL, discoverySystemPrompt, guardrailSettingsFor, parseElicitation, RECORD_ELICITATION_TOOL, type DiscoveryNeed, type SystemBlock } from './discovery-prompt.ts';
import { renderCopy } from './notification-copy.ts';
import { channelsFor, taxonomyRow, type Channel } from './notification-taxonomy.ts';
import { SCOPE_COPY } from './scope-copy.ts';
import { scopeViewFromSql, type RecordScopeTool, type ScopeView } from './scope.ts';
import type { DiscoverySkill } from './discovery-skills.ts';
import { TENANT_NOT_FOUND, TENANT_READ_FAILED } from './tenant-reads.ts';
import type { CallerReads, DiscoveryTurnSqlRow } from './discovery-reads.ts';
import { orgAdminActionAllowed } from './memberships.ts';
import { needIntakeAnswer } from './need-intake.ts';
import type { Caller } from './caller.ts';
import { isRecord, refuseWrite, stringField, uuidField, type AccountWriteRouteInput, type WriteRouteDecision } from './write-routes.ts';
import type { Decision } from './accounts.ts';

export type { CallerReads, DiscoveryReads, DiscoveryTurnSqlRow } from './discovery-reads.ts';
export type Elicitation = NonNullable<DiscoveryTurnSqlRow['elicitation']>;
export type DiscoveryModelRequest = {
  model: string; maxTokens: number; effort: 'low'; system: SystemBlock[];
  tools: readonly (typeof RECORD_ELICITATION_TOOL | typeof DECLINE_OFF_TOPIC_TOOL | RecordScopeTool)[];
  toolChoice?: { type: 'tool'; name: string };
  messages: { role: 'user' | 'assistant'; content: string }[];
};
export type DiscoveryModelAnswer =
  | { ok: true; text: string; stopReason: string; usage: ModelUsage; model: string; toolUse?: { name: string; input: unknown } | null }
  | { ok: false; status: number | null; reason: string };
export type MessagesPort = {
  model: string;
  create(request: DiscoveryModelRequest): Promise<DiscoveryModelAnswer>;
  countTokens(request: DiscoveryModelRequest): Promise<number>;
  stream(request: DiscoveryModelRequest, onDelta: (text: string) => void, signal: AbortSignal): Promise<DiscoveryModelAnswer>;
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
    offTopic: row.off_topic === true,
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
export { contextMessagesFrom } from './discovery-prompt.ts';

export function buildModelRequest(input: {
  need: DiscoveryNeed; context: DiscoveryModelRequest['messages']; skills: readonly DiscoverySkill[];
  maxTokens?: number; model: string; tools?: DiscoveryModelRequest['tools'];
}): DiscoveryModelRequest {
  return {
    model: input.model, maxTokens: input.maxTokens ?? DISCOVERY_REQUEST_SETTINGS.maxOutputTokens,
    effort: DISCOVERY_REQUEST_SETTINGS.effort, system: discoverySystemPrompt(input.need, input.skills), messages: input.context,
    tools: input.tools ?? [RECORD_ELICITATION_TOOL],
  };
}
export function discoveryPrepare(port: MessagesPort, skills: readonly DiscoverySkill[]) {
  return async (caller: Caller, args: DiscoveryReserveArgs, reads: CallerReads): Promise<WriteRouteDecision<DiscoveryReserveArgs>> => {
    const need = await needIntakeAnswer(reads, args.p_project_id);
    if (need.status === 502) throw new Error(need.body.reason);
    if (need.status === 404) return refuseWrite('no-such-project', 409, need.body.reason);
    if (need.body.need.stage !== 'discovery_in_progress') {
      return refuseWrite('need-not-in-discovery', 409, 'the need is not in Discovery');
    }
    const turns = await reads.discoveryTurnsOf(args.p_project_id);
    if (!turns.ok) throw new Error(turns.detail);
    const project = await reads.project(args.p_project_id);
    if (!project.ok) throw new Error(project.detail);
    const source = project.rows[0];
    if (source === undefined) return refuseWrite('no-such-project', 409, 'no such project');
    const billing = billingTargetFor({
      id: source.id, fundedAt: source.funded_at == null ? null : String(source.funded_at),
    });
    const guardrails = guardrailSettingsFor(billing.kind);
    const settled = turns.rows.filter((row) => row.status === 'settled').sort((a, b) => a.seq - b.seq);
    const request = buildModelRequest({
      skills, model: port.model,
      need: { title: need.body.need.title, description: need.body.need.description, urgency: need.body.need.urgency,
        reference_files: need.body.need.referenceFiles.map((file) => file.fileName) },
      context: [...contextMessagesFrom(settled), { role: 'user', content: args.p_message }],
      tools: guardrails.active ? [RECORD_ELICITATION_TOOL, DECLINE_OFF_TOPIC_TOOL] : [RECORD_ELICITATION_TOOL],
    });
    let count = 0;
    if (caller.emailVerified) {
      count = await port.countTokens(request);
      if (!Number.isSafeInteger(count) || count < 0) throw new Error('the provider returned an invalid token count');
    }
    return { ok: true, args: { ...args, p_settings: {
        ...args.p_settings, counted_input_tokens: count, model: port.model,
        off_topic_flag_strikes: guardrails.offTopicFlagStrikes,
      },
      p_counted_through_seq: settled.at(-1)?.seq ?? 0, [PREPARED_REQUEST]: request } };
  };
}
const OFF_TOPIC_FLAGGED_EVENT = 'discovery.off_topic_flagged';
export type OffTopicFlaggedNotice = {
  readonly channels: readonly Channel[];
  readonly copy: { readonly subject: string; readonly body: string };
};
export function offTopicFlaggedNotice(payload: {
  projectId: string; organizationId: string; strikes: number;
}, row = taxonomyRow(OFF_TOPIC_FLAGGED_EVENT) ?? null): Decision<OffTopicFlaggedNotice> {
  if (row === null) {
    return { ok: false, reason: 'discovery.off_topic_flagged is missing from the notification taxonomy' };
  }
  return {
    ok: true,
    value: {
      channels: channelsFor(row),
      copy: renderCopy(row, payload),
    },
  };
}
export type DiscoverySettleArgs = {
  p_account_id: string; p_turn_id: string; p_outcome: 'completed' | 'failed'; p_assistant_message: string | null;
  p_input_tokens: number | null; p_output_tokens: number | null; p_stop_reason: string | null;
  p_served_model: string | null; p_elicitation: Elicitation | null;
  p_off_topic: boolean; p_notice: OffTopicFlaggedNotice | null;
};
export function settleArgsFrom(reservation: Reservation, answer: DiscoveryModelAnswer, accountId: string): {
  args: DiscoverySettleArgs | null; failure: string | null;
} {
  if (!answer.ok && answer.status === null) return { args: null, failure: answer.reason };
  const active = reservation.turn.request_settings?.guardrails?.active === true;
  const offTopic = Boolean(answer.ok && answer.toolUse?.name === 'decline_off_topic' && active);
  const notice = offTopic ? offTopicFlaggedNotice({
    projectId: reservation.turn.project_id, organizationId: reservation.turn.org_id,
    strikes: reservation.turn.request_settings.guardrails?.off_topic_flag_strikes ?? DISCOVERY_OFF_TOPIC_FLAG_STRIKES,
  }) : null;
  const pNotice = notice?.ok ? notice.value : null;
  if (answer.ok && answer.stopReason === 'refusal') {
    return {
      args: {
        p_account_id: accountId, p_turn_id: reservation.turn.id, p_outcome: 'failed',
        p_assistant_message: null, p_input_tokens: null, p_output_tokens: null, p_stop_reason: null,
        p_served_model: null, p_elicitation: null, p_off_topic: false, p_notice: null,
      }, failure: 'the model refused the request',
    };
  }
  return {
    args: {
      p_account_id: accountId, p_turn_id: reservation.turn.id, p_outcome: answer.ok ? 'completed' : 'failed',
      p_assistant_message: answer.ok ? answer.text : null, p_input_tokens: answer.ok ? answer.usage.inputTokens : null,
      p_output_tokens: answer.ok ? answer.usage.outputTokens : null, p_stop_reason: answer.ok ? answer.stopReason : null,
      p_served_model: answer.ok ? answer.model : null,
      p_elicitation: answer.ok && answer.toolUse?.name === 'record_elicitation' ? parseElicitation(answer.toolUse.input) : null,
      p_off_topic: offTopic, p_notice: pNotice,
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
export function discoveryStream(port: MessagesPort) {
  return async (value: unknown, args: DiscoveryReserveArgs, onDelta: (text: string) => void, signal: AbortSignal) => {
    const reservation = renderReservation(value);
    const prepared = args[PREPARED_REQUEST];
    if (prepared === undefined) throw new Error('Discovery has no counted request');
    const answer = await port.stream({ ...prepared, maxTokens: reservation.turn.max_output_tokens }, onDelta, signal);
    return settleArgsFrom(reservation, answer, args.p_account_id);
  };
}
export type DiscoveryConversationView = {
  projectId: string; turns: DiscoveryTurnView[]; elicitation: Elicitation | null;
  scopes: ScopeView[]; scope: ScopeView | null;
};
export type DiscoveryConversationAnswer = { status: 200; body: { ok: true; conversation: DiscoveryConversationView; allowance: Allowance | null } }
  | typeof TENANT_NOT_FOUND | typeof TENANT_READ_FAILED;
export async function conversationAnswer(
  reads: Pick<CallerReads, 'project' | 'discoveryTurnsOf' | 'discoveryAllowance' | 'discoveryScopesOf'>, projectId: string,
): Promise<DiscoveryConversationAnswer> {
  const project = await reads.project(projectId);
  if (!project.ok) return TENANT_READ_FAILED;
  const source = project.rows[0];
  if (source === undefined) return TENANT_NOT_FOUND;
  const rows = await reads.discoveryTurnsOf(projectId);
  if (!rows.ok) return TENANT_READ_FAILED;
  const scopeRows = await reads.discoveryScopesOf(projectId);
  if (!scopeRows.ok) return TENANT_READ_FAILED;
  const allowance = await reads.discoveryAllowance(source.org_id);
  try {
    const turns = [...rows.rows].sort((a, b) => a.seq - b.seq).map(turnViewFromSql);
    const elicitation = turns.filter((turn) => turn.elicitation !== null).at(-1)?.elicitation ?? null;
    const scopes = [...scopeRows.rows].sort((a, b) => a.version - b.version).map(scopeViewFromSql);
    const scope = scopes.find((row) => row.status === 'current') ?? null;
    return { status: 200, body: { ok: true, conversation: { projectId, turns, elicitation, scopes, scope },
      allowance: allowance.ok ? renderDiscoveryAllowance(allowance.value) : null } };
  } catch {
    return TENANT_READ_FAILED;
  }
}
export type DiscoveryGuardrailView = {
  offTopicCount: number; flagged: boolean; notice: string | null;
};
export function renderDiscoveryMessage(value: unknown): {
  turn: DiscoveryTurnView; reply: string; elicitation: Elicitation | null; allowance: Allowance | null; scopeReady: boolean;
  guardrail: DiscoveryGuardrailView | null;
} {
  if (!isRecord(value) || !isRecord(value.turn)) throw new Error('discovery settle returned no turn');
  const row = value.turn as DiscoveryTurnSqlRow;
  const turn = turnViewFromSql(row);
  const counted = typeof value.off_topic_count === 'number' ? value.off_topic_count : Number(value.off_topic_count ?? 0);
  const offTopicCount = Number.isFinite(counted) ? counted : 0;
  const strikes = row.request_settings?.guardrails?.off_topic_flag_strikes;
  const flagged = typeof strikes === 'number' && offTopicCount >= strikes;
  return { turn, reply: turn.assistantMessage ?? '', elicitation: turn.elicitation,
    allowance: value.allowance === null ? null : renderDiscoveryAllowance(value.allowance),
    scopeReady: turn.elicitation?.complete === true,
    guardrail: turn.billing === 'fuel' ? null : {
      offTopicCount, flagged, notice: flagged ? SCOPE_COPY.offTopicNotice : null,
    } };
}
