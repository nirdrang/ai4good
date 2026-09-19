import type { Decision } from './accounts.ts';
import { DISCOVERY_REGENERATION_BOUND, DISCOVERY_REQUEST_SETTINGS, DISCOVERY_TURN_DEADLINE_SECONDS } from './discovery-metering.ts';
import { DISCOVERY_SYSTEM_PROMPT_TEMPLATE, parseElicitation, type DiscoveryNeed } from './discovery-prompt.ts';
import { discoverySkillsText, type DiscoverySkill } from './discovery-skills.ts';
import type { Elicitation, DiscoveryModelRequest, MessagesPort } from './discovery-turn.ts';
import { orgAdminActionAllowed } from './memberships.ts';
import { needViewFromSql, type NeedIntakeSqlRow, type NeedIntakeView } from './need-intake.ts';
import { renderCopy } from './notification-copy.ts';
import { channelsFor, taxonomyRow, type Channel } from './notification-taxonomy.ts';
import { SCOPE_COPY } from './scope-copy.ts';
import {
  isRecord, refuseWrite, stringField, uuidField,
  type AccountWriteRouteInput, type SettleActResult, type WriteRouteDecision,
} from './write-routes.ts';

export const COMPLEXITY_TIERS = ['small', 'medium', 'large'] as const;
export type ComplexityTier = (typeof COMPLEXITY_TIERS)[number];
export const DATA_TIERS = ['tier0', 'tier1', 'tier2'] as const;
export type DataTier = (typeof DATA_TIERS)[number];
export const FIT_VERDICTS = ['fit', 'declined'] as const;
export type FitVerdict = (typeof FIT_VERDICTS)[number];
export const SCOPE_CAUSE_LABELS_MAX = 3;

export type Scope = {
  summary: string;
  userStories: { story: string; acceptanceCriteria: string[] }[];
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
        properties: { story: { type: 'string' }, acceptanceCriteria: strings },
        required: ['story', 'acceptanceCriteria'],
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
      causeLabels: { type: 'array', maxItems: 3, items: { type: 'string' } },
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

export function canonicalLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normaliseLabels(candidates: readonly string[], vocabulary: readonly string[]): string[] {
  const vocabByCanonical = new Map<string, string>();
  for (const entry of vocabulary) {
    const key = canonicalLabel(entry);
    if (key === '' || vocabByCanonical.has(key)) continue;
    vocabByCanonical.set(key, entry);
  }
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const raw of candidates) {
    const key = canonicalLabel(raw);
    if (key === '' || seen.has(key)) continue;
    seen.add(key);
    labels.push(vocabByCanonical.get(key) ?? key);
    if (labels.length === SCOPE_CAUSE_LABELS_MAX) break;
  }
  return labels;
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
    if (!isRecord(item) || !exactKeys(item, ['story', 'acceptanceCriteria'])) return null;
    const story = trimmed(item.story);
    const acceptanceCriteria = trimmedStrings(item.acceptanceCriteria, 1);
    if (story === null || acceptanceCriteria === null) return null;
    userStories.push({ story, acceptanceCriteria });
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
    if (label === '') return null;
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

export const SCOPE_REQUEST_MESSAGE =
  'Produce the technical scope now from the recorded elicitation and this conversation. Call record_scope.';

export function buildScopeRequest(input: {
  need: DiscoveryNeed; mission: string | null; elicitation: Elicitation; vocabulary: readonly string[];
  context: DiscoveryModelRequest['messages'];
}, skills: readonly DiscoverySkill[]): DiscoveryModelRequest {
  return {
    model: DISCOVERY_REQUEST_SETTINGS.model,
    maxTokens: DISCOVERY_REQUEST_SETTINGS.maxOutputTokens,
    effort: DISCOVERY_REQUEST_SETTINGS.effort,
    system: [
      { text: `${DISCOVERY_SYSTEM_PROMPT_TEMPLATE}\n\n${discoverySkillsText(skills)}`, cached: true },
      { text: [
        `Need supplied by the NGO:\n${JSON.stringify(input.need)}`,
        `Organisation mission:\n${input.mission ?? ''}`,
        `Completed elicitation:\n${JSON.stringify(input.elicitation)}`,
        `Cause-label vocabulary:\n${JSON.stringify(input.vocabulary)}`,
      ].join('\n\n'), cached: false },
    ],
    messages: [...input.context, { role: 'user', content: SCOPE_REQUEST_MESSAGE }],
    tools: [RECORD_SCOPE_TOOL],
    toolChoice: { type: 'tool', name: 'record_scope' },
  };
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
    `## Maintenance\n${SCOPE_COPY.maintenance}\n\n${SCOPE_COPY.ownership}`,
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

const REGENERATION_EXHAUSTED_EVENT = 'discovery.regeneration_exhausted';
export type RegenerationExhaustedNotice = {
  readonly channels: readonly Channel[];
  readonly copy: { readonly subject: string; readonly body: string };
};
export function regenerationExhaustedNotice(payload: {
  projectId: string; organizationId: string; regenerations: number; lastReason: string;
}, row = taxonomyRow(REGENERATION_EXHAUSTED_EVENT) ?? null): Decision<RegenerationExhaustedNotice> {
  if (row === null) {
    return { ok: false, reason: 'discovery.regeneration_exhausted is missing from the notification taxonomy' };
  }
  return {
    ok: true,
    value: {
      channels: channelsFor(row),
      copy: renderCopy(row, payload),
    },
  };
}

export type DiscoveryScopeArgs = {
  p_account_id: string; p_organization_id: string; p_project_id: string;
  p_action: 'generate' | 'remove-label' | 'regenerate'; p_reason: string | null; p_label: string | null;
  p_settings: { turn_deadline_seconds: number; regeneration_bound: number };
  p_notice: RegenerationExhaustedNotice | null;
};

function scopeBeginSettings() {
  return {
    turn_deadline_seconds: DISCOVERY_TURN_DEADLINE_SECONDS,
    regeneration_bound: DISCOVERY_REGENERATION_BOUND,
  };
}

export function decideDiscoveryScope(input: AccountWriteRouteInput): WriteRouteDecision<DiscoveryScopeArgs> {
  if (input.target === null) return refuseWrite('invalid-request', 400, 'a Discovery scope write must name its organisation');
  if (!input.standing.orgExists) return refuseWrite('no-such-organisation', 409, 'no such organisation');
  const allowed = orgAdminActionAllowed(input.standing.orgRole);
  if (!allowed.ok) return refuseWrite(allowed.kind, 403, allowed.reason);
  const projectId = uuidField(input.body.projectId);
  if (projectId === null) return refuseWrite('invalid-request', 400, 'a Discovery scope write must name the project as a uuid');
  const known = input.body.action === 'remove-label'
    ? ['organizationId', 'projectId', 'action', 'label']
    : input.body.action === 'regenerate'
      ? ['organizationId', 'projectId', 'action', 'reason']
      : ['organizationId', 'projectId', 'action'];
  if (Object.keys(input.body).some((key) => !known.includes(key))) {
    return refuseWrite('invalid-request', 400, 'a Discovery scope write contains an unknown field');
  }
  if (input.body.action === 'remove-label') {
    const label = typeof input.body.label === 'string' ? canonicalLabel(input.body.label) : '';
    if (label === '') {
      return refuseWrite('invalid-request', 400, 'a Discovery scope write requires a label to remove');
    }
    return { ok: true, args: {
      p_account_id: input.caller.id, p_organization_id: input.target, p_project_id: projectId,
      p_action: 'remove-label', p_reason: null, p_label: label,
      p_settings: scopeBeginSettings(), p_notice: null,
    } };
  }
  if (input.body.action === 'regenerate') {
    const reason = stringField(input.body.reason);
    if (reason === null) {
      return refuseWrite('invalid-request', 400, 'a Discovery scope write requires a reason');
    }
    const notice = regenerationExhaustedNotice({
      projectId, organizationId: input.target, regenerations: DISCOVERY_REGENERATION_BOUND, lastReason: reason,
    });
    if (!notice.ok) return refuseWrite('invalid-request', 400, notice.reason);
    return { ok: true, args: {
      p_account_id: input.caller.id, p_organization_id: input.target, p_project_id: projectId,
      p_action: 'regenerate', p_reason: reason, p_label: null,
      p_settings: scopeBeginSettings(), p_notice: notice.value,
    } };
  }
  if (input.body.action !== 'generate') {
    return refuseWrite('invalid-request', 400, 'a Discovery scope write requires the generate, regenerate or remove-label action');
  }
  return { ok: true, args: {
    p_account_id: input.caller.id, p_organization_id: input.target, p_project_id: projectId,
    p_action: 'generate', p_reason: null, p_label: null,
    p_settings: scopeBeginSettings(), p_notice: null,
  } };
}

export type ScopeBeginSnapshot = {
  done: boolean;
  escalated?: boolean;
  changed?: boolean;
  scope: ScopeSqlRow | null;
  elicitation: Elicitation | null;
  context: DiscoveryModelRequest['messages'];
  need: NeedIntakeView | null;
  mission: string | null;
  vocabulary: string[];
};

function contextFrom(value: unknown): DiscoveryModelRequest['messages'] {
  if (!Array.isArray(value)) return [];
  const messages: DiscoveryModelRequest['messages'] = [];
  for (const item of value) {
    if (!isRecord(item) || (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') {
      continue;
    }
    messages.push({ role: item.role, content: item.content });
  }
  return messages;
}

export function renderScopeBegin(value: unknown): ScopeBeginSnapshot {
  if (!isRecord(value) || typeof value.done !== 'boolean') throw new Error('discovery scope begin returned no snapshot');
  const elicitation = value.elicitation == null ? null : parseElicitation(value.elicitation);
  const vocabulary = Array.isArray(value.vocabulary)
    ? value.vocabulary.filter((item): item is string => typeof item === 'string') : [];
  const need = isRecord(value.need) ? needViewFromSql(value.need as NeedIntakeSqlRow) : null;
  return {
    done: value.done,
    escalated: value.escalated === true,
    changed: value.changed === true,
    scope: isRecord(value.scope) ? value.scope as ScopeSqlRow : null,
    elicitation, context: contextFrom(value.context), need,
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
    if (begun.scope === null || begun.elicitation === null || begun.need === null) {
      throw new Error('discovery scope begin returned no generating snapshot');
    }
    const request = buildScopeRequest({
      need: {
        title: begun.need.title, description: begun.need.description, urgency: begun.need.urgency,
        reference_files: begun.need.referenceFiles.map((file) => file.fileName),
      },
      mission: begun.mission, elicitation: begun.elicitation, vocabulary: begun.vocabulary, context: begun.context,
    }, skills);
    const answer = await port.create(request);
    const failed = (reason: string, usage?: { inputTokens: number; outputTokens: number; model: string }) => ({
      args: {
        p_account_id: args.p_account_id, p_project_id: args.p_project_id, p_scope_id: begun.scope!.id, p_outcome: 'failed' as const,
        p_contract: null, p_markdown: null, p_labels: [] as string[],
        p_served_model: usage?.model ?? null,
        p_input_tokens: usage?.inputTokens ?? null, p_output_tokens: usage?.outputTokens ?? null, p_changed: null,
      }, failure: reason,
    });
    if (!answer.ok) return failed(answer.reason);
    if (answer.stopReason === 'refusal') return failed('the model refused the request');
    const parsed = answer.toolUse?.name === 'record_scope' ? parseScope(answer.toolUse.input) : null;
    if (parsed === null) return failed('the model did not record a valid scope', {
      inputTokens: answer.usage.inputTokens, outputTokens: answer.usage.outputTokens, model: answer.model,
    });
    const causeLabels = normaliseLabels(parsed.causeLabels, begun.vocabulary);
    const stored = { ...parsed, causeLabels };
    const markdown = renderScopeMarkdown(stored, { title: begun.need.title });
    const money = scopeMoneyProblems(markdown);
    if (money.length > 0) {
      return failed(money[0], {
        inputTokens: answer.usage.inputTokens, outputTokens: answer.usage.outputTokens, model: answer.model,
      });
    }
    return { args: {
      p_account_id: args.p_account_id, p_project_id: args.p_project_id, p_scope_id: begun.scope.id, p_outcome: 'completed',
      p_contract: stored, p_markdown: markdown,
      p_labels: causeLabels, p_served_model: answer.model,
      p_input_tokens: answer.usage.inputTokens, p_output_tokens: answer.usage.outputTokens, p_changed: null,
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
