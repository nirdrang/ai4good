import { renderDiscoveryAllowance, type Allowance } from './discovery-allowance.ts';
import { briefVersionFrom, briefViewFromRead, openingDocument, snapshotOf, type BriefSnapshot, type BriefVersion, type Confirmation, type DiscoveryAnswer, type PersonLine } from './discovery-brief.ts';
import { openQuestions, persistedParts, planReplyTurn, replyCharge, replyPrefix, replySystemPrompt, replyTail, replyTool, screenUsage } from './discovery-reply.ts';
import { DISCOVERY_MESSAGE_MAX_CHARS, DISCOVERY_OFF_TOPIC_FLAG_STRIKES, DISCOVERY_REQUEST_SETTINGS, reserveSettings, type DiscoveryReserveSettings, type ModelUsage } from './discovery-metering.ts';
import { contextMessagesFrom, type DiscoveryNeed, type SystemBlock } from './discovery-prompt.ts';
import { renderCopy } from './notification-copy.ts';
import { channelsFor, taxonomyRow, type Channel } from './notification-taxonomy.ts';
import { SCOPE_COPY } from './scope-copy.ts';
import { scopeSourceFromBrief, scopeViewFromSql, type ScopeView } from './scope.ts';
import type { DiscoverySkill } from './discovery-skills.ts';
import { TENANT_NOT_FOUND, TENANT_READ_FAILED } from './tenant-reads.ts';
import type { CallerReads, DiscoveryTurnSqlRow } from './discovery-reads.ts';
import { orgAdminActionAllowed } from './memberships.ts';
import { needIntakeAnswer } from './need-intake.ts';
import type { Caller } from './caller.ts';
import { isRecord, refuseWrite, stringField, uuidField, type AccountWriteRouteInput, type WriteRouteDecision } from './write-routes.ts';
import type { Decision } from './accounts.ts';
import { fileDigestContext, fileReport, type FileRow } from './discovery-files.ts';

export type { CallerReads, DiscoveryReads, DiscoveryTurnSqlRow } from './discovery-reads.ts';
export type Elicitation = NonNullable<DiscoveryTurnSqlRow['elicitation']>;
export type DiscoveryModelRequest = {
  model: string; maxTokens: number; effort: 'low'; system: SystemBlock[];
  tools: readonly { name: string; description: string; strict?: boolean; input_schema: { type: 'object'; [key: string]: unknown } }[];
  images?: { mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'; data: string }[];
  toolChoice?: { type: 'tool'; name: string };
  messages: { role: 'user' | 'assistant'; content: string }[];
  reply?: {
    messageId: string; opening: boolean; discoveryFileCount: number;
    answers: DiscoveryAnswer[]; topicIds: string[]; userMessageId: string;
    fileReports?: string;
  };
};
export type DiscoveryModelAnswer =
  | { ok: true; text: string; stopReason: string; usage: ModelUsage; model: string; toolUse?: { name: string; input: unknown } | null }
  | { ok: false; status: number | null; reason: string };
export type MessagesPort = {
  model: string;
  create(request: DiscoveryModelRequest): Promise<DiscoveryModelAnswer>;
  stream(request: DiscoveryModelRequest, onDelta: (text: string) => void, signal: AbortSignal): Promise<DiscoveryModelAnswer>;
};
export function turnViewFromSql(row: DiscoveryTurnSqlRow) {
  return {
    id: row.id, projectId: row.project_id, seq: row.seq, status: row.status, billing: row.billing,
    userMessageId: row.user_message_id ?? `${row.id}:user`, assistantUI: row.assistant_ui ?? null,
    baseRevision: row.base_revision ?? 0,
    utcDay: row.utc_day.slice(0, 10), userMessage: row.user_message, assistantMessage: row.assistant_message,
    elicitation: row.elicitation, requestSettings: {
      model: row.request_settings.model, maxTokens: row.request_settings.max_tokens, effort: row.request_settings.effort,
    }, maxOutputTokens: row.max_output_tokens,
    reservedCredits: row.reserved_credits, chargedCredits: row.charged_credits,
    reservedMicros: row.reserved_micros, actualMicros: row.actual_micros, overrunMicros: row.overrun_micros,
    inputTokens: row.input_tokens, outputTokens: row.output_tokens, stopReason: row.stop_reason,
    servedModel: row.served_model, openedAt: row.opened_at, settledAt: row.settled_at,
    offTopic: row.off_topic === true,
    ...(row.assistant_ui != null ? { assistantUi: row.assistant_ui } : {}),
  };
}
export type DiscoveryTurnView = ReturnType<typeof turnViewFromSql>;
const PREPARED_REQUEST = Symbol('discovery prepared request');
export type ReplyReserveFields = {
  mode: 'answer' | 'opening'; user_message_id: string;
  answers: DiscoveryAnswer[]; expected_charge: 'free' | 'paid'; assistant_message_id: string;
};
export type DiscoveryReserveArgs = {
  p_account_id: string; p_organization_id: string; p_project_id: string; p_message: string;
  p_settings: DiscoveryReserveSettings & ReplyReserveFields;
  [PREPARED_REQUEST]?: DiscoveryModelRequest;
};
export type Reservation = {
  turn: DiscoveryTurnSqlRow; need: DiscoveryNeed; context: DiscoveryModelRequest['messages']; allowance: unknown; brief?: BriefVersion | null; usage?: unknown; replay?: string;
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
  return decideReplyMessage(input);
}
export { contextMessagesFrom } from './discovery-prompt.ts';

export function discoveryPrepare(port: MessagesPort, skills: readonly DiscoverySkill[]) {
  return async (_caller: Caller, args: DiscoveryReserveArgs, reads: CallerReads): Promise<WriteRouteDecision<DiscoveryReserveArgs>> =>
    prepareReply(port, skills, args, reads);
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
  p_served_model: string | null; p_elicitation: Record<string, unknown> | null;
  p_off_topic: boolean; p_notice: OffTopicFlaggedNotice | null;
};
export function discoveryAct(port: MessagesPort) {
  return async (value: unknown, args: DiscoveryReserveArgs) => actReply(port, value, args, null, undefined);
}
export function discoveryStream(port: MessagesPort) {
  return async (value: unknown, args: DiscoveryReserveArgs, onDelta: (text: string) => void, signal: AbortSignal) =>
    actReply(port, value, args, onDelta, signal);
}
export type DiscoveryConversationView = {
  projectId: string; turns: DiscoveryTurnView[]; elicitation: Elicitation | null;
  scopes: ScopeView[]; scope: ScopeView | null;
};
export type DiscoveryConversationAnswer = {
  status: 200;
  body: {
    ok: true; conversation: DiscoveryConversationView; allowance: Allowance | null;
    brief: BriefSnapshot | null; confirmation: Confirmation | null; lines: PersonLine[];
  };
} | typeof TENANT_NOT_FOUND | typeof TENANT_READ_FAILED;
export async function conversationAnswer(
  reads: Pick<CallerReads, 'project' | 'discoveryTurnsOf' | 'discoveryAllowance' | 'discoveryScopesOf' | 'discoveryBriefOf'>,
  projectId: string,
): Promise<DiscoveryConversationAnswer> {
  const project = await reads.project(projectId);
  if (!project.ok) return TENANT_READ_FAILED;
  const source = project.rows[0];
  if (source === undefined) return TENANT_NOT_FOUND;
  const rows = await reads.discoveryTurnsOf(projectId);
  if (!rows.ok) return TENANT_READ_FAILED;
  const scopeRows = await reads.discoveryScopesOf(projectId);
  if (!scopeRows.ok) return TENANT_READ_FAILED;
  const briefRead = await reads.discoveryBriefOf(projectId);
  if (!briefRead.ok) return TENANT_READ_FAILED;
  const allowance = await reads.discoveryAllowance(source.org_id);
  try {
    const turns = [...rows.rows].sort((a, b) => a.seq - b.seq).map(turnViewFromSql);
    const elicitation = turns.filter((turn) => turn.elicitation !== null).at(-1)?.elicitation ?? null;
    const scopes = [...scopeRows.rows].sort((a, b) => a.version - b.version).map(scopeViewFromSql);
    const scope = scopes.find((row) => row.status === 'current') ?? null;
    const view = briefViewFromRead(briefRead.value);
    return { status: 200, body: { ok: true, conversation: { projectId, turns, elicitation, scopes, scope },
      allowance: allowance.ok ? renderDiscoveryAllowance(allowance.value) : null,
      brief: view.brief, confirmation: view.confirmation, lines: view.lines } };
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

const USER_MESSAGE_ID_MAX = 200;

function messageText(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function parseAnswers(value: unknown): DiscoveryAnswer[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const answers: DiscoveryAnswer[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const questionId = stringField(item.questionId);
    const choice = stringField(item.choice);
    if (questionId === null || choice === null || typeof item.text !== 'string' || typeof item.certain !== 'boolean') return null;
    answers.push({ questionId, choice, text: item.text, certain: item.certain });
  }
  return answers;
}

function replyUserText(message: string, answers: readonly DiscoveryAnswer[], opening: boolean): string {
  const lines = answers.map((answer) => {
    const text = answer.text.trim();
    return answer.certain ? text : `Not sure. ${text}`.trim();
  }).filter((line) => line.length > 0);
  if (message.length > 0) lines.push(message);
  if (lines.length > 0) return lines.join('\n');
  if (opening) return 'Begin Discovery.';
  if (answers.length > 0) return 'The answer is recorded.';
  return '';
}

function decideReplyMessage(input: AccountWriteRouteInput): WriteRouteDecision<DiscoveryReserveArgs> {
  if (input.target === null) return refuseWrite('invalid-request', 400, 'a Discovery message must name its organisation');
  const projectId = uuidField(input.body.projectId);
  const mode = input.body.mode === 'opening' ? 'opening' : 'answer';
  const userMessageId = stringField(input.body.userMessageId);
  const message = input.body.message === undefined ? '' : messageText(input.body.message);
  const answers = parseAnswers(input.body.answers);
  const expected = input.body.expectedCharge;
  if (projectId === null || userMessageId === null || userMessageId.length > USER_MESSAGE_ID_MAX
    || message === null || message.length > DISCOVERY_MESSAGE_MAX_CHARS || answers === null
    || (input.body.mode !== 'opening' && input.body.mode !== 'answer')) {
    return refuseWrite('invalid-request', 400, 'a Discovery reply needs a project, a message id, and text within the message limit');
  }
  if (mode === 'answer' && message.length === 0 && answers.length === 0) {
    return refuseWrite('invalid-request', 400, 'a Discovery reply needs a note or an answer');
  }
  if (mode === 'answer' && expected !== 'free' && expected !== 'paid') {
    return refuseWrite('invalid-request', 400, 'a Discovery reply needs the charge the screen showed');
  }
  const composed = replyUserText(message, answers, mode === 'opening');
  if (composed.length === 0 || composed.length > DISCOVERY_MESSAGE_MAX_CHARS) {
    return refuseWrite('invalid-request', 400, 'a Discovery reply needs a project, a message id, and text within the message limit');
  }
  const expectedCharge: 'free' | 'paid' = mode === 'opening' || expected !== 'paid' ? 'free' : 'paid';
  return { ok: true, args: {
    p_account_id: input.caller.id, p_organization_id: input.target, p_project_id: projectId,
    p_message: composed,
    p_settings: {
      ...reserveSettings(), mode,
      user_message_id: userMessageId, answers, expected_charge: expectedCharge,
      assistant_message_id: crypto.randomUUID(),
    },
  } };
}

async function prepareReply(
  port: MessagesPort, skills: readonly DiscoverySkill[], args: DiscoveryReserveArgs, reads: CallerReads,
): Promise<WriteRouteDecision<DiscoveryReserveArgs>> {
  const need = await needIntakeAnswer(reads, args.p_project_id);
  if (need.status === 502) throw new Error(need.body.reason);
  if (need.status === 404) return refuseWrite('no-such-project', 409, need.body.reason);
  if (need.body.need.stage !== 'discovery_in_progress') {
    return refuseWrite('need-not-in-discovery', 409, 'the need is not in Discovery');
  }
  const turns = await reads.discoveryTurnsOf(args.p_project_id);
  if (!turns.ok) throw new Error(turns.detail);
  const briefRead = await reads.discoveryBriefOf(args.p_project_id);
  if (!briefRead.ok) throw new Error(briefRead.detail);
  const current = isRecord(briefRead.value) ? briefVersionFrom(briefRead.value.revision, briefRead.value.document) : null;
  const topicIds = current?.document.topicOrder
    ?? openingDocument({ need: need.body.need.description ?? need.body.need.title }).document.topicOrder;
  const settled = turns.rows.filter((row) => row.status === 'settled').sort((a, b) => a.seq - b.seq);
  const opening = args.p_settings.mode === 'opening';
  const files = reads.discoveryFilesOf ? await reads.discoveryFilesOf(args.p_project_id) : { ok: true as const, rows: [] as FileRow[] };
  if (!files.ok) throw new Error(files.detail);
  const discoveryFileCount = files.rows.length;
  const shown = settled.map((turn) => turn.assistant_message ?? '').join('\n');
  const fileReports = files.rows.filter((file) => file.status === 'read' && !shown.includes(fileReport(file))).map(fileReport).join('\n\n');
  const request: DiscoveryModelRequest = {
    model: port.model, maxTokens: DISCOVERY_REQUEST_SETTINGS.maxOutputTokens, effort: DISCOVERY_REQUEST_SETTINGS.effort,
    system: replySystemPrompt({
      title: need.body.need.title, description: need.body.need.description, urgency: need.body.need.urgency,
      reference_files: need.body.need.referenceFiles.map((file) => file.fileName),
    }, topicIds, skills, args.p_settings.expected_charge !== 'paid'),
    messages: [...contextMessagesFrom(settled), ...fileDigestContext(files.rows), { role: 'user', content: args.p_message }],
    tools: [replyTool(topicIds)], toolChoice: { type: 'tool', name: 'reply' },
    reply: {
      messageId: args.p_settings.assistant_message_id ?? crypto.randomUUID(),
      opening, discoveryFileCount, answers: args.p_settings.answers ?? [], topicIds,
      userMessageId: args.p_settings.user_message_id ?? '',
      fileReports,
    },
  };
  request.system[1].text += `\nCause-label vocabulary: ${JSON.stringify(isRecord(briefRead.value) ? briefRead.value.vocabulary ?? [] : [])}\nCurrent brief: ${JSON.stringify(current)}`;
  return { ok: true, args: {
    ...args,
    p_settings: { ...args.p_settings, model: port.model },
    [PREPARED_REQUEST]: request,
  } };
}

function briefFromReservation(value: unknown): BriefVersion | null {
  if (!isRecord(value) || !isRecord(value.brief)) return null;
  return briefVersionFrom(value.brief.revision, value.brief.document);
}

function assistantMessageId(turn: DiscoveryTurnSqlRow, fallback: string): string {
  const settings = turn.request_settings as { assistant_message_id?: unknown };
  if (typeof settings.assistant_message_id === 'string') return settings.assistant_message_id;
  if (isRecord(turn.assistant_ui) && typeof turn.assistant_ui.id === 'string') return turn.assistant_ui.id;
  return fallback;
}

function storedParts(ui: unknown): { text: string; parts: Record<string, unknown>[] } | null {
  if (!isRecord(ui) || !Array.isArray(ui.parts)) return null;
  const text = ui.parts.filter(isRecord).map((part) => part.type === 'text' && typeof part.text === 'string' ? part.text : '').join('');
  const parts = ui.parts.filter(isRecord).flatMap((part) => (
    typeof part.type === 'string' && part.type !== 'text' ? [{ type: part.type, data: part.data }] : []
  ));
  return { text, parts };
}

export function replyStreamHead(value: unknown, args: DiscoveryReserveArgs): {
  messageId: string; textId: string; prefix?: string;
  replay: { text: string; parts: readonly Record<string, unknown>[] } | null;
} | null {
  const reservation = renderReservation(value);
  const prepared = args[PREPARED_REQUEST];
  const messageId = assistantMessageId(reservation.turn, prepared?.reply?.messageId ?? args.p_settings.assistant_message_id ?? reservation.turn.id);
  if (isRecord(value) && value.replay === 'stored') {
    return { messageId, textId: 'reply', prefix: '', replay: storedParts(reservation.turn.assistant_ui) ?? { text: '', parts: [] } };
  }
  const billing: string = reservation.turn.billing;
  const opening = billing === 'opening' || prepared?.reply?.opening === true;
  return {
    messageId, textId: 'reply', replay: null,
    prefix: replyPrefix(opening, prepared?.reply?.discoveryFileCount ?? 0) + (prepared?.reply?.fileReports ? `${prepared.reply.fileReports}\n\n` : ''),
  };
}

async function actReply(
  port: MessagesPort, value: unknown, args: DiscoveryReserveArgs,
  onDelta: ((text: string) => void) | null, signal: AbortSignal | undefined,
): Promise<{
  args: DiscoverySettleArgs | null; failure: string | null; skipSettle?: boolean; suffix?: string;
  tail?: readonly Record<string, unknown>[];
}> {
  if (isRecord(value) && value.replay === 'stored') return { args: null, failure: null, skipSettle: true };
  const reservation = renderReservation(value);
  const prepared = args[PREPARED_REQUEST];
  if (prepared?.reply === undefined) throw new Error('Discovery has no prepared reply');
  const request = { ...prepared, maxTokens: reservation.turn.max_output_tokens };
  const answer = onDelta
    ? await port.stream(request, onDelta, signal ?? new AbortController().signal)
    : await port.create(request);
  const failed = (reason: string): { args: DiscoverySettleArgs; failure: string } => ({
    args: {
      p_account_id: args.p_account_id, p_turn_id: reservation.turn.id, p_outcome: 'failed',
      p_assistant_message: null, p_input_tokens: null, p_output_tokens: null, p_stop_reason: null,
      p_served_model: null, p_elicitation: null, p_off_topic: false, p_notice: null,
    },
    failure: reason,
  });
  if (signal?.aborted) return failed('the client cancelled the reply');
  if (!answer.ok) return failed(answer.reason);
  if (answer.stopReason === 'refusal') return failed('the model refused the request');
  const current = briefFromReservation(value);
  const plan = planReplyTurn({
    current, need: reservation.need.description ?? reservation.need.title,
    answers: prepared.reply.answers, userMessageId: prepared.reply.userMessageId, round: reservation.turn.seq,
    toolInput: answer.toolUse?.name === 'reply' ? answer.toolUse.input : null,
    topicIds: prepared.reply.topicIds, opening: prepared.reply.opening,
    discoveryFileCount: prepared.reply.discoveryFileCount,
  });
  if (!plan.ok) return failed('The model did not record a valid reply tool answer.');
  if (prepared.reply.fileReports) plan.text = `${plan.prefix}${prepared.reply.fileReports}\n\n${plan.text.slice(plan.prefix.length)}`;
  const usage = screenUsage(isRecord(value) ? value.usage : null);
  if (usage === null) return failed('Discovery usage could not be read');
  const tail = replyTail({
    filed: plan.filed, charge: replyCharge(reservation.turn.billing), questions: openQuestions(plan.brief),
    ready: plan.ready, brief: snapshotOf(plan.brief), usage,
  });
  const messageId = assistantMessageId(reservation.turn, prepared.reply.messageId);
  const offTopic = reservation.turn.billing === 'free' && isRecord(answer.toolUse?.input)
    && answer.toolUse.input.offTopic === true;
  const notice = offTopic ? offTopicFlaggedNotice({
    projectId: reservation.turn.project_id, organizationId: reservation.turn.org_id,
    strikes: DISCOVERY_OFF_TOPIC_FLAG_STRIKES,
  }) : null;
  return {
    args: {
      p_account_id: args.p_account_id, p_turn_id: reservation.turn.id, p_outcome: 'completed',
      p_assistant_message: plan.text,
      p_input_tokens: Math.max(0, answer.usage.inputTokens),
      p_output_tokens: Math.min(reservation.turn.max_output_tokens, Math.max(0, answer.usage.outputTokens)),
      p_stop_reason: answer.stopReason, p_served_model: answer.model,
      p_elicitation: {
        replyContract: true,
        ui: { id: messageId, role: 'assistant', parts: persistedParts(plan.text, tail) },
        document: plan.changed ? plan.brief.document : null,
        baseRevision: current?.revision ?? null,
        source: scopeSourceFromBrief(plan.brief),
      },
      p_off_topic: offTopic, p_notice: notice?.ok ? notice.value : null,
    },
    failure: null, suffix: plan.suffix, tail,
  };
}
