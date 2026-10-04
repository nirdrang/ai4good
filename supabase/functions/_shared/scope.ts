import { DISCOVERY_REQUEST_SETTINGS, DISCOVERY_TURN_DEADLINE_SECONDS } from './discovery-metering.ts';
import { contextMessagesFrom, type DiscoveryNeed } from './discovery-prompt.ts';
import { discoverySkillsText, type DiscoverySkill } from './discovery-skills.ts';
import type { Elicitation, DiscoveryModelRequest, MessagesPort } from './discovery-turn.ts';
import { requiredAgreement, briefVersionFrom, type BriefVersion, type Confirmation } from './discovery-brief.ts';
import { orgAdminActionAllowed } from './memberships.ts';
import { needViewFromSql, type NeedIntakeSqlRow, type NeedIntakeView } from './need-intake.ts';
import { SCOPE_COPY } from './scope-copy.ts';
import {
  isRecord, refuseWrite, uuidField,
  type AccountWriteRouteInput, type SettleActResult, type WriteRouteDecision,
} from './write-routes.ts';

export const COMPLEXITY_TIERS = ['small', 'medium', 'large'] as const;
export type ComplexityTier = (typeof COMPLEXITY_TIERS)[number];
export const DATA_TIERS = ['tier0', 'tier1', 'tier2'] as const;
export type DataTier = (typeof DATA_TIERS)[number];
export const FIT_VERDICTS = ['fit', 'declined'] as const;
export type FitVerdict = (typeof FIT_VERDICTS)[number];
import { SCOPE_CAUSE_LABELS_MAX, SCOPE_CAUSE_LABEL_MAX_CHARS, canonicalLabel } from './discovery-brief.ts';
import { discoveryModelPort } from './discovery-model.ts';
export { SCOPE_CAUSE_LABELS_MAX, SCOPE_CAUSE_LABEL_MAX_CHARS, canonicalLabel } from './discovery-brief.ts';

export type Scope = {
  summary: string;
  userStories: { story: string; acceptanceCriteria: string[]; discoveryTopicId?: string }[];
  suggestedStack: string[];
  complexity: { tier: ComplexityTier; rationale: string; startSmallAdvice: string };
  riskFlags: string[];
  dataSensitivity: { tier: DataTier; rationale: string };
  maintainabilityFit: { verdict: FitVerdict; rationale: string };
  causeLabels: string[];
  lovableRecommendation: { recommended: boolean; rationale: string };
  buildSplit: { lovable: string[]; claudeCode: string[] };
};

const strings = { type: 'array', items: { type: 'string' } };
export const RECORD_SCOPE_TOOL = {
  name: 'record_scope',
  description: 'Record the technical scope of this NGO software need, derived only from the completed elicitation and the conversation.',
  strict: true,
  input_schema: {
    type: 'object' as const, additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      userStories: { type: 'array', minItems: 1, items: {
        type: 'object', additionalProperties: false,
        properties: { story: { type: 'string' }, acceptanceCriteria: strings, discoveryTopicId: { type: 'string' } },
        required: ['story', 'acceptanceCriteria', 'discoveryTopicId'],
      } },
      suggestedStack: { type: 'array', minItems: 1, items: { type: 'string' } },
      complexity: { type: 'object', additionalProperties: false,
        properties: {
          tier: { type: 'string', enum: ['small', 'medium', 'large'] },
          rationale: { type: 'string' }, startSmallAdvice: { type: 'string' },
        },
        required: ['tier', 'rationale', 'startSmallAdvice'] },
      riskFlags: strings,
      dataSensitivity: { type: 'object', additionalProperties: false,
        properties: { tier: { type: 'string', enum: ['tier0', 'tier1', 'tier2'] }, rationale: { type: 'string' } },
        required: ['tier', 'rationale'] },
      maintainabilityFit: { type: 'object', additionalProperties: false,
        properties: { verdict: { type: 'string', enum: ['fit', 'declined'] }, rationale: { type: 'string' } },
        required: ['verdict', 'rationale'] },
      causeLabels: strings,
      lovableRecommendation: { type: 'object', additionalProperties: false,
        properties: { recommended: { type: 'boolean' }, rationale: { type: 'string' } },
        required: ['recommended', 'rationale'] },
      buildSplit: { type: 'object', additionalProperties: false,
        properties: {
          lovable: { type: 'array', minItems: 1, items: { type: 'string' } },
          claudeCode: { type: 'array', minItems: 1, items: { type: 'string' } },
        },
        required: ['lovable', 'claudeCode'] },
    },
    required: ['summary', 'userStories', 'suggestedStack', 'complexity', 'riskFlags', 'dataSensitivity',
      'maintainabilityFit', 'causeLabels', 'lovableRecommendation', 'buildSplit'],
  },
} as const;
export type RecordScopeTool = typeof RECORD_SCOPE_TOOL;

const SCOPE_KEYS = ['summary', 'userStories', 'suggestedStack', 'complexity', 'riskFlags', 'dataSensitivity',
  'maintainabilityFit', 'causeLabels', 'lovableRecommendation', 'buildSplit'] as const;

function trimmed(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text === '' ? null : text;
}
function trimmedStrings(value: unknown, min: number): string[] | null {
  if (!Array.isArray(value) || value.length < min) return null;
  const items: string[] = [];
  for (const item of value) {
    const text = trimmed(item);
    if (text === null) return null;
    items.push(text);
  }
  return items;
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function inEnum<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

export function parseScope(input: unknown): Scope | null {
  if (!isRecord(input) || !exactKeys(input, SCOPE_KEYS)) return null;
  const summary = trimmed(input.summary);
  const suggestedStack = trimmedStrings(input.suggestedStack, 1);
  const riskFlags = trimmedStrings(input.riskFlags, 0);
  if (summary === null || suggestedStack === null || riskFlags === null) return null;
  if (!Array.isArray(input.userStories) || input.userStories.length < 1) return null;
  const userStories: Scope['userStories'] = [];
  for (const item of input.userStories) {
    if (!isRecord(item) || !exactKeys(item, item.discoveryTopicId === undefined ? ['story', 'acceptanceCriteria'] : ['story', 'acceptanceCriteria', 'discoveryTopicId'])) return null;
    const story = trimmed(item.story);
    const acceptanceCriteria = trimmedStrings(item.acceptanceCriteria, 1);
    if (story === null || acceptanceCriteria === null) return null;
    if (item.discoveryTopicId !== undefined && trimmed(item.discoveryTopicId) === null) return null;
    userStories.push({ story, acceptanceCriteria, ...(typeof item.discoveryTopicId === 'string' ? { discoveryTopicId: item.discoveryTopicId } : {}) });
  }
  if (!isRecord(input.complexity) || !exactKeys(input.complexity, ['tier', 'rationale', 'startSmallAdvice'])) return null;
  const complexityTier = input.complexity.tier;
  const complexityRationale = trimmed(input.complexity.rationale);
  const startSmallAdvice = trimmed(input.complexity.startSmallAdvice);
  if (!inEnum(complexityTier, COMPLEXITY_TIERS) || complexityRationale === null || startSmallAdvice === null) return null;
  if (!isRecord(input.dataSensitivity) || !exactKeys(input.dataSensitivity, ['tier', 'rationale'])) return null;
  const dataTier = input.dataSensitivity.tier;
  const dataRationale = trimmed(input.dataSensitivity.rationale);
  if (!inEnum(dataTier, DATA_TIERS) || dataRationale === null) return null;
  if (!isRecord(input.maintainabilityFit) || !exactKeys(input.maintainabilityFit, ['verdict', 'rationale'])) return null;
  const fitVerdict = input.maintainabilityFit.verdict;
  const fitRationale = trimmed(input.maintainabilityFit.rationale);
  if (!inEnum(fitVerdict, FIT_VERDICTS) || fitRationale === null) return null;
  if (!Array.isArray(input.causeLabels) || input.causeLabels.length > SCOPE_CAUSE_LABELS_MAX) return null;
  const causeLabels: string[] = [];
  const seen = new Set<string>();
  for (const item of input.causeLabels) {
    if (typeof item !== 'string') return null;
    const label = canonicalLabel(item);
    if (label === '' || label.length > SCOPE_CAUSE_LABEL_MAX_CHARS) return null;
    if (seen.has(label)) continue;
    seen.add(label);
    causeLabels.push(label);
  }
  if (!isRecord(input.lovableRecommendation) || !exactKeys(input.lovableRecommendation, ['recommended', 'rationale'])) {
    return null;
  }
  if (typeof input.lovableRecommendation.recommended !== 'boolean') return null;
  const lovableRationale = trimmed(input.lovableRecommendation.rationale);
  if (lovableRationale === null) return null;
  if (!isRecord(input.buildSplit) || !exactKeys(input.buildSplit, ['lovable', 'claudeCode'])) return null;
  const lovable = trimmedStrings(input.buildSplit.lovable, 1);
  const claudeCode = trimmedStrings(input.buildSplit.claudeCode, 1);
  if (lovable === null || claudeCode === null) return null;
  return {
    summary, userStories, suggestedStack,
    complexity: { tier: complexityTier, rationale: complexityRationale, startSmallAdvice },
    riskFlags,
    dataSensitivity: { tier: dataTier, rationale: dataRationale },
    maintainabilityFit: { verdict: fitVerdict, rationale: fitRationale },
    causeLabels,
    lovableRecommendation: { recommended: input.lovableRecommendation.recommended, rationale: lovableRationale },
    buildSplit: { lovable, claudeCode },
  };
}

export const SCOPE_REQUEST_MESSAGE = 'Produce the PRD technical scope from the confirmed Discovery document. Call record_scope.';
export type ConfirmedDiscovery = { brief: BriefVersion; confirmation: Confirmation };

export function buildScopeRequest(input: ConfirmedDiscovery, skills: readonly DiscoverySkill[]): DiscoveryModelRequest {
  if (input.confirmation.revision !== input.brief.revision) throw new Error('The Discovery confirmation is stale.');
  return {
    model: DISCOVERY_REQUEST_SETTINGS.model,
    maxTokens: DISCOVERY_REQUEST_SETTINGS.maxOutputTokens,
    effort: DISCOVERY_REQUEST_SETTINGS.effort,
    system: [
      { text: `You produce a technical scope in the PRD step. Ground every story in an agreed answer or a kept open question. Set discoveryTopicId to its topic id. Never turn uncertainty into an agreed fact. Preserve the data tier and maintainability verdict in the confirmed brief. Include both build-split parts. Never give a money figure for the project or the build.\n\n${discoverySkillsText(skills)}`, cached: true },
      { text: `Confirmed Discovery document:\n${JSON.stringify(input)}`, cached: false },
    ],
    messages: [{ role: 'user', content: SCOPE_REQUEST_MESSAGE }],
    tools: [RECORD_SCOPE_TOOL],
    toolChoice: { type: 'tool', name: 'record_scope' },
  };
}

export async function generateConfirmedScope(input: ConfirmedDiscovery, skills: readonly DiscoverySkill[], port: MessagesPort = discoveryModelPort()) {
  const request = buildScopeRequest(input, skills);
  request.model = port.model;
  const answer = await port.create(request);
  if (!answer.ok) throw new Error(answer.reason);
  const scope = answer.toolUse?.name === 'record_scope' ? parseScope(answer.toolUse.input) : null;
  if (answer.stopReason === 'refusal' || scope === null) throw new Error('The model did not record a valid scope.');
  scope.causeLabels = [...input.brief.document.causeLabels];
  const gaps = new Set(input.confirmation.acceptedGaps.map((gap) => gap.topicId));
  for (const story of scope.userStories) {
    const topic = input.brief.document.topics[story.discoveryTopicId ?? ''];
    if (!topic || !((topic.state.kind === 'agreed' && !topic.needsReview) || gaps.has(topic.id))) {
      throw new Error('A scope story has no confirmed Discovery source.');
    }
  }
  const data = input.brief.document.dataTier;
  const fit = input.brief.document.fit;
  if (data && scope.dataSensitivity.tier !== `tier${data.tier}`) throw new Error('The scope changed the confirmed data tier.');
  if (fit && scope.maintainabilityFit.verdict !== (fit.verdict === 'fits' ? 'fit' : 'declined')) throw new Error('The scope changed the confirmed fit verdict.');
  if (scopeMoneyProblems(scopeModelText(scope)).length > 0) throw new Error('The scope contains a forbidden money figure.');
  return { scope, markdown: renderScopeMarkdown(scope, { title: input.brief.document.need.text }), model: answer.model, usage: answer.usage };
}

function listBlock(items: readonly string[]): string {
  return items.length === 0 ? '' : items.map((item) => `- ${item}`).join('\n');
}

export function renderScopeMarkdown(scope: Scope, need: { title: string }): string {
  const stories = scope.userStories.map((story) =>
    `### ${story.story}\n${listBlock(story.acceptanceCriteria)}`).join('\n\n');
  const lovable = [
    scope.lovableRecommendation.rationale,
    scope.lovableRecommendation.recommended
      ? '[Lovable pricing](' + SCOPE_COPY.lovablePricingUrl + ')'
      : '',
  ].filter((part) => part !== '').join('\n\n');
  return [
    `# ${need.title}`,
    `## Summary\n${scope.summary}`,
    `## User stories\n${stories}`,
    `## Suggested stack\n${listBlock(scope.suggestedStack)}`,
    `## Complexity\nThis need is ${scope.complexity.tier}.\n${scope.complexity.rationale}\n\n${SCOPE_COPY.startSmall}\n${scope.complexity.startSmallAdvice}`,
    `## Risk flags\n${listBlock(scope.riskFlags)}`,
    `## Data sensitivity\n${SCOPE_COPY.dataTier[scope.dataSensitivity.tier]}\n${scope.dataSensitivity.rationale}`,
    `## Maintainability fit\n- Verdict: ${scope.maintainabilityFit.verdict}\n- Rationale: ${scope.maintainabilityFit.rationale}`,
    `## Cause labels\n${listBlock(scope.causeLabels)}`,
    `## Maintenance\n${SCOPE_COPY.maintenance}`,
    `## Lovable recommendation\n${lovable}`,
    `## Build split\n### Lovable\n${listBlock(scope.buildSplit.lovable)}\n### Claude Code\n${listBlock(scope.buildSplit.claudeCode)}`,
  ].join('\n\n');
}

export const SCOPE_MONEY = /\$|\bUSD\b|\bdollars?\b|\bcost\b|\bestimate\b|\bbudget\b|\bprice\b/gi;

export function scopeMoneyProblems(markdown: string): string[] {
  const allowed = [SCOPE_COPY.maintenance, SCOPE_COPY.lovablePricingUrl];
  let rest = markdown;
  for (const piece of allowed) rest = rest.split(piece).join('');
  const problems: string[] = [];
  const lines = rest.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    for (const match of lines[i].matchAll(SCOPE_MONEY)) {
      problems.push('line ' + String(i + 1) + ': ' + match[0]);
    }
  }
  return problems;
}

export function scopeModelText(scope: Scope): string {
  return [
    scope.summary,
    ...scope.userStories.flatMap((story) => [story.story, ...story.acceptanceCriteria]),
    ...scope.suggestedStack,
    scope.complexity.rationale, scope.complexity.startSmallAdvice,
    ...scope.riskFlags,
    scope.dataSensitivity.rationale,
    scope.maintainabilityFit.rationale,
    scope.lovableRecommendation.rationale,
    ...scope.buildSplit.lovable, ...scope.buildSplit.claudeCode,
  ].join('\n');
}

export type ScopeSqlRow = {
  id: string; project_id: string; org_id: string; version: number;
  status: 'generating' | 'current' | 'superseded' | 'failed' | 'escalated';
  reason: string | null; requested_by: string; elicitation: Elicitation;
  contract: Scope | null; markdown: string | null; cause_labels: readonly string[];
  served_model: string | null; input_tokens: number | null; output_tokens: number | null;
  opened_at: string; settled_at: string | null;
};
export type ScopeView = {
  id: string; projectId: string; version: number; status: ScopeSqlRow['status']; reason: string | null;
  contract: Scope | null; markdown: string | null; causeLabels: string[];
  generatedAt: string | null; requestedAt: string;
};
export function scopeViewFromSql(row: ScopeSqlRow): ScopeView {
  const labels = Array.isArray(row.cause_labels) ? [...row.cause_labels] : [];
  const contract = row.contract == null ? null : parseScope(row.contract);
  if (row.contract != null && contract === null) {
    throw new Error('discovery_scopes row ' + row.id + ' holds a contract parseScope refuses');
  }
  return {
    id: row.id, projectId: row.project_id, version: row.version, status: row.status, reason: row.reason,
    contract, markdown: row.markdown, causeLabels: labels,
    generatedAt: row.settled_at, requestedAt: row.opened_at,
  };
}

export type ScopeContractRef = { projectId: string; version: number };
type ScopeContractResult =
  | { ok: true; scope: Scope; markdown: string }
  | { ok: false; reason: 'no-such-version' | 'not-settled' };

function resolveScopeContract(scopes: readonly ScopeView[], ref: ScopeContractRef): ScopeContractResult {
  const row = scopes.find((item) => item.projectId === ref.projectId && item.version === ref.version);
  if (row === undefined) return { ok: false, reason: 'no-such-version' };
  if (
    (row.status !== 'current' && row.status !== 'superseded')
    || row.contract === null
    || row.markdown === null
  ) {
    return { ok: false, reason: 'not-settled' };
  }
  return { ok: true, scope: row.contract, markdown: row.markdown };
}

export function scopeSourceForPrd(
  scopes: readonly ScopeView[],
  ref: ScopeContractRef,
): ScopeContractResult {
  return resolveScopeContract(scopes, ref);
}

export function scopeReferenceForScorer(
  scopes: readonly ScopeView[],
  ref: ScopeContractRef,
): ScopeContractResult {
  return resolveScopeContract(scopes, ref);
}

export type DiscoveryScopeArgs = {
  p_account_id: string; p_organization_id: string; p_project_id: string;
  p_action: 'generate'; p_reason: null; p_label: null;
  p_settings: { turn_deadline_seconds: number }; p_notice: null;
};

export function decideDiscoveryScope(input: AccountWriteRouteInput): WriteRouteDecision<DiscoveryScopeArgs> {
  if (input.target === null) return refuseWrite('invalid-request', 400, 'a PRD scope write must name its organisation');
  if (!input.standing.orgExists) return refuseWrite('no-such-organisation', 409, 'no such organisation');
  const allowed = orgAdminActionAllowed(input.standing.orgRole);
  if (!allowed.ok) return refuseWrite(allowed.kind, 403, allowed.reason);
  const projectId = uuidField(input.body.projectId);
  if (projectId === null || input.body.action !== 'generate'
    || Object.keys(input.body).some((key) => !['organizationId', 'projectId', 'action'].includes(key))) {
    return refuseWrite('invalid-request', 400, 'the PRD scope entry accepts only generate for a project');
  }
  return { ok: true, args: {
    p_account_id: input.caller.id, p_organization_id: input.target, p_project_id: projectId,
    p_action: 'generate', p_reason: null, p_label: null,
    p_settings: { turn_deadline_seconds: DISCOVERY_TURN_DEADLINE_SECONDS }, p_notice: null,
  } };
}

export type ScopeBeginSnapshot = {
  done: boolean;
  confirmed: ConfirmedDiscovery | null;
  escalated?: boolean;
  changed?: boolean;
  scope: ScopeSqlRow | null;
  elicitation: Elicitation | null;
  context: DiscoveryModelRequest['messages'];
  previous: Scope | null;
  need: NeedIntakeView | null;
  mission: string | null;
  vocabulary: string[];
};

function transcriptFrom(value: unknown): { user_message: string; assistant_message: string | null }[] {
  if (!Array.isArray(value)) return [];
  const rows: { user_message: string; assistant_message: string | null }[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.user_message !== 'string') continue;
    rows.push({ user_message: item.user_message, assistant_message: typeof item.assistant_message === 'string' ? item.assistant_message : null });
  }
  return rows;
}

function scopeSource(value: unknown): Elicitation | null {
  if (!isRecord(value) || value.complete !== true || !Array.isArray(value.facts)
    || !Array.isArray(value.constraints) || !Array.isArray(value.userStories) || !Array.isArray(value.openQuestions)) return null;
  return value as Elicitation;
}
/** The recorded need for the scope generator while its move to the PRD step is pending. */
export function scopeSourceFromBrief(brief: BriefVersion): Elicitation | null {
  if (!requiredAgreement(brief).ready) return null;
  const facts = brief.document.topicOrder.flatMap((id) => {
    const topic = brief.document.topics[id];
    return topic?.state.kind === 'agreed' ? [topic.state.answer] : [];
  });
  return { complete: true, facts, constraints: [], userStories: [], openQuestions: [] };
}
export function renderScopeBegin(value: unknown): ScopeBeginSnapshot {
  if (!isRecord(value) || typeof value.done !== 'boolean') throw new Error('discovery scope begin returned no snapshot');
  const elicitation = value.elicitation == null ? null : scopeSource(value.elicitation);
  const vocabulary = Array.isArray(value.vocabulary)
    ? value.vocabulary.filter((item): item is string => typeof item === 'string') : [];
  const need = isRecord(value.need) ? needViewFromSql(value.need as NeedIntakeSqlRow) : null;
  return {
    done: value.done,
    confirmed: isRecord(value.confirmed) && isRecord(value.confirmed.confirmation) && briefVersionFrom(isRecord(value.confirmed.brief) ? value.confirmed.brief.revision : null, isRecord(value.confirmed.brief) ? value.confirmed.brief.document : null) !== null ? value.confirmed as ConfirmedDiscovery : null,
    escalated: value.escalated === true,
    changed: value.changed === true,
    scope: isRecord(value.scope) ? value.scope as ScopeSqlRow : null,
    elicitation, context: contextMessagesFrom(transcriptFrom(value.transcript)),
    previous: value.previous == null ? null : parseScope(value.previous),
    need,
    mission: typeof value.mission === 'string' ? value.mission : null,
    vocabulary,
  };
}

export function scopeAct(port: MessagesPort, skills: readonly DiscoverySkill[]) {
  return async (value: unknown, args: DiscoveryScopeArgs): Promise<SettleActResult> => {
    const begun = renderScopeBegin(value);
    if (begun.done === true) {
      return { args: {
        p_account_id: args.p_account_id, p_project_id: args.p_project_id, p_scope_id: null,
        p_outcome: 'completed', p_contract: null, p_markdown: null, p_labels: [],
        p_served_model: null, p_input_tokens: null, p_output_tokens: null, p_changed: begun.changed === true,
      }, failure: null };
    }
    if (begun.scope === null || begun.confirmed === null || begun.need === null) {
      throw new Error('discovery scope begin returned no generating snapshot');
    }
    const failed = (reason: string, usage?: { inputTokens: number; outputTokens: number; model: string }) => ({
      args: {
        p_account_id: args.p_account_id, p_project_id: args.p_project_id, p_scope_id: begun.scope!.id, p_outcome: 'failed' as const,
        p_contract: null, p_markdown: null, p_labels: [] as string[],
        p_served_model: usage?.model ?? null,
        p_input_tokens: usage?.inputTokens ?? null, p_output_tokens: usage?.outputTokens ?? null, p_changed: null,
      }, failure: reason,
    });
    let result: Awaited<ReturnType<typeof generateConfirmedScope>>;
    try {
      if (begun.confirmed === null) return failed('The PRD scope needs a confirmed Discovery document.');
      result = await generateConfirmedScope(begun.confirmed, skills, port);
    } catch (error) { return failed(error instanceof Error ? error.message : String(error)); }
    const parsed = result.scope;
    const markdown = result.markdown;
    return { args: {
      p_account_id: args.p_account_id, p_project_id: args.p_project_id, p_scope_id: begun.scope.id, p_outcome: 'completed',
      p_contract: parsed, p_markdown: markdown,
      p_labels: parsed.causeLabels, p_served_model: result.model,
      p_input_tokens: result.usage.inputTokens, p_output_tokens: result.usage.outputTokens, p_changed: null,
    }, failure: null };
  };
}

export function renderDiscoveryScope(value: unknown): {
  changed: boolean; scope: ScopeView | null; scopes: ScopeView[]; need: NeedIntakeView; escalated: boolean;
} {
  if (!isRecord(value) || !isRecord(value.need)) throw new Error('discovery scope commit returned no snapshot');
  const scopes = Array.isArray(value.scopes)
    ? value.scopes.filter(isRecord).map((row) => scopeViewFromSql(row as ScopeSqlRow)) : [];
  const scope = isRecord(value.scope) ? scopeViewFromSql(value.scope as ScopeSqlRow) : null;
  return {
    changed: typeof value.changed === 'boolean' ? value.changed : scope?.status === 'current',
    scope, scopes, need: needViewFromSql(value.need as NeedIntakeSqlRow),
    escalated: value.escalated === true || scopes.some((row) => row.status === 'escalated'),
  };
}
