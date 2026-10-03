export type Role = 'ngo' | 'volunteer' | 'ex_volunteer' | 'platform_admin';
export type Channel = 'email' | 'inapp';
export type Tone = 'normal' | 'low';

export type EventClass =
  | 'money'
  | 'deadline'
  | 'blocker'
  | 'completion'
  | 'decision'
  | 'access'
  | 'lowtone'
  | 'other';

export interface TaxonomyRow {
  event: string;
  recipients: Role[];
  channels: Channel[] | null;
  tone: Tone;
  class: EventClass;
  payloadKeys?: string[];
  guarded?: boolean;
  opsItem?: boolean;
  escalation?: boolean;
}

export const TAXONOMY: TaxonomyRow[] = [
  { event: 'triage.approved', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision', payloadKeys: ['marketplaceVisibility'] },
  { event: 'triage.returned_to_scoped', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision', payloadKeys: ['reason'] },
  { event: 'triage.declined_terminal', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision' },
  { event: 'vetting.outcome', recipients: ['ngo'], channels: null, tone: 'normal', class: 'decision' },

  { event: 'discovery.fit_declined', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision', payloadKeys: ['declineCause', 'reshapingSuggestion', 'oversightSentence'] },
  { event: 'discovery.fit_decline_review', recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision', payloadKeys: ['declineCause'], opsItem: true },
  { event: 'discovery.decline_overturned', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision', payloadKeys: ['discoveryReopened'] },
  { event: 'discovery.off_topic_flagged', recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'other', payloadKeys: ['projectId', 'organizationId', 'strikes'] },
  { event: 'discovery.regeneration_exhausted', recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'other', payloadKeys: ['projectId', 'organizationId', 'regenerations', 'lastReason'] },

  { event: 'candidacy.marked', recipients: ['platform_admin'], channels: null, tone: 'normal', class: 'other' },
  { event: 'match.created', recipients: ['volunteer'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision', payloadKeys: ['consentCta'] },
  { event: 'match.consented', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision', payloadKeys: ['fundToKickOff'] },
  { event: 'match.declined_or_expired', recipients: ['platform_admin'], channels: null, tone: 'normal', class: 'other' },
  { event: 'open_project.unmatched_aging', recipients: ['platform_admin'], channels: null, tone: 'normal', class: 'other' },

  { event: 'abandonment.reminder_14d', recipients: ['volunteer', 'ngo'], channels: null, tone: 'normal', class: 'deadline' },
  { event: 'abandonment.released', recipients: ['ngo', 'ex_volunteer'], channels: null, tone: 'normal', class: 'deadline' },
  { event: 'abandonment.rematch_available', recipients: ['ngo'], channels: null, tone: 'normal', class: 'other' },

  { event: 'funding.pre_deadline_reminder', recipients: ['ngo'], channels: null, tone: 'normal', class: 'deadline' },
  { event: 'funding.deadline_expired', recipients: ['ngo', 'volunteer'], channels: null, tone: 'normal', class: 'deadline', guarded: true },
  { event: 'payment.succeeded', recipients: ['ngo', 'volunteer'], channels: null, tone: 'normal', class: 'money', guarded: true },
  { event: 'payment.failed', recipients: ['ngo'], channels: null, tone: 'normal', class: 'money', guarded: true },
  { event: 'fuel.threshold_20', recipients: ['ngo'], channels: null, tone: 'normal', class: 'money', guarded: true },
  { event: 'fuel.threshold_5', recipients: ['ngo', 'volunteer'], channels: null, tone: 'normal', class: 'money', guarded: true },
  { event: 'fuel.depleted', recipients: ['ngo', 'volunteer', 'platform_admin'], channels: null, tone: 'normal', class: 'money', guarded: true },
  { event: 'leftover.released', recipients: ['ngo'], channels: null, tone: 'normal', class: 'money', guarded: true },
  { event: 'chargeback.opened', recipients: ['ngo', 'platform_admin'], channels: null, tone: 'normal', class: 'money', guarded: true, opsItem: true },

  { event: 'access.key_issued', recipients: ['volunteer'], channels: ['email', 'inapp'], tone: 'normal', class: 'access', guarded: true },
  { event: 'access.key_revoked', recipients: ['volunteer'], channels: ['email', 'inapp'], tone: 'normal', class: 'access', guarded: true, payloadKeys: ['replacementOnDashboard'] },

  { event: 'gateway.watchdog_failed_closed', recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'other' },

  { event: 'prd_gate.below_threshold_gap_report', recipients: ['volunteer'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision' },
  { event: 'prd_gate.passed', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision' },
  { event: 'backlog.live', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'other' },

  { event: 'reconciliation.large_drift', recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'money' },
  { event: 'reconciliation.undecidable_drift', recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'money' },

  { event: 'pm_item.status_changed', recipients: ['ngo'], channels: ['inapp'], tone: 'low', class: 'lowtone' },
  { event: 'pm_item.completed', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'completion' },
  { event: 'requirement.comment', recipients: ['volunteer'], channels: ['inapp'], tone: 'normal', class: 'other' },
  { event: 'thread.comment', recipients: ['volunteer'], channels: ['inapp'], tone: 'normal', class: 'other' },
  { event: 'blocker.raised', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'blocker' },
  { event: 'blocker.resolved', recipients: ['ngo', 'volunteer'], channels: ['email', 'inapp'], tone: 'normal', class: 'blocker' },
  { event: 'blocker.aging_48h', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'blocker' },
  { event: 'blocker.aging_7d', recipients: ['ngo', 'platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'blocker' },
  { event: 'pm_item.status_auto_reverted', recipients: ['volunteer'], channels: ['inapp'], tone: 'low', class: 'lowtone', payloadKeys: ['whatToDoInstead'] },

  { event: 'project.completed', recipients: ['ngo', 'volunteer'], channels: null, tone: 'normal', class: 'completion', guarded: true },

  { event: 'provisioning.failed', recipients: ['ngo', 'volunteer', 'platform_admin'], channels: null, tone: 'normal', class: 'other', opsItem: true },
  { event: 'lovable.setup_reminder', recipients: ['ngo'], channels: null, tone: 'normal', class: 'other' },
  { event: 'lovable.credits_low', recipients: ['ngo'], channels: null, tone: 'normal', class: 'other' },
  { event: 'lovable.credits_blocked', recipients: ['ngo', 'platform_admin'], channels: null, tone: 'normal', class: 'other', escalation: true },
  { event: 'lovable.setup_pending_raised', recipients: ['ngo'], channels: null, tone: 'normal', class: 'other' },
  { event: 'lovable.setup_complete', recipients: ['ngo', 'volunteer'], channels: null, tone: 'normal', class: 'other' },
];

export const GUARDED_ROWS = TAXONOMY.filter((r) => r.guarded === true);

export const CRITICAL_CLASS_FIXTURES: Record<'money' | 'deadline' | 'blocker' | 'completion' | 'decision', string> = {
  money: 'payment.succeeded',
  deadline: 'funding.deadline_expired',
  blocker: 'blocker.raised',
  completion: 'project.completed',
  decision: 'triage.approved',
};

export const LOW_TONE_FIXTURE = 'pm_item.status_changed';

export const PENALTY_LEXICON = ['penalty', 'penalis', 'penaliz', 'violation', 'infraction', 'warning issued', 'strike', 'fault', 'blame'];

export const FORBIDDEN_EVENT_PATTERNS = [/change[._-]?request/i, /\bcr\b/i, /scope[._-]?change/i, /donat/i];

export interface ChannelRule {
  mustInclude?: Channel[];
  mustEqual?: Channel[];
}

export const CLASS_CHANNEL_RULE: Record<EventClass, ChannelRule> = {
  money: { mustInclude: ['email'] },
  deadline: { mustInclude: ['email'] },
  blocker: { mustInclude: ['email'] },
  completion: { mustInclude: ['email'] },
  decision: { mustInclude: ['email'] },
  lowtone: { mustEqual: ['inapp'] },
  access: {},
  other: {},
};

export function channelRuleProblems(row: TaxonomyRow, channels: readonly Channel[]): string[] {
  const rule = CLASS_CHANNEL_RULE[row.class];
  const problems: string[] = [];
  for (const c of rule.mustInclude ?? []) {
    if (!channels.includes(c)) problems.push(`class "${row.class}" requires ${c}, got ${JSON.stringify(channels)}`);
  }
  if (rule.mustEqual) {
    const got = [...channels].sort().join(',');
    const want = [...rule.mustEqual].sort().join(',');
    if (got !== want) problems.push(`class "${row.class}" requires exactly [${want}], got [${got}]`);
  }
  return problems;
}

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();
const PLACEHOLDERS = ['', '-', 'n/a', 'na', 'tbd', 'none', 'null', 'undefined', 'todo'];

const text = (v: unknown): string => (typeof v === 'string' ? v : '');

function carriedInBody(value: string, body: string): boolean {
  const v = norm(value);
  return v.length > 0 && norm(body).includes(v);
}

export const PAYLOAD_PREDICATES: Record<string, Record<string, (value: unknown, body: string) => string | null>> = {
  'triage.approved': {
    marketplaceVisibility: (v) => (v === true ? null : `expected boolean true, got ${JSON.stringify(v)}`),
  },
  'triage.returned_to_scoped': {
    reason: (v, body) => {
      const s = text(v);
      if (PLACEHOLDERS.includes(norm(s)) || norm(s).length < 12) return `not a stated reason: ${JSON.stringify(v)}`;
      return carriedInBody(s, body) ? null : 'the reason never appears in the copy the NGO receives';
    },
  },
  'match.created': {
    consentCta: (v, body) => {
      const s = text(v);
      if (!/consent|accept|confirm/i.test(s)) return `no consent call-to-action in ${JSON.stringify(v)}`;
      return carriedInBody(s, body) ? null : 'the consent CTA never appears in the volunteer’s copy';
    },
  },
  'match.consented': {
    fundToKickOff: (v, body) => {
      const s = text(v);
      if (!/fund/i.test(s) || !/kick|start|begin/i.test(s)) return `no fund-to-kick-off framing in ${JSON.stringify(v)}`;
      return carriedInBody(s, body) ? null : 'the fund-to-kick-off framing never appears in the NGO’s copy';
    },
  },
  'discovery.fit_declined': {
    declineCause: (v) =>
      ['ongoing_developer_maintenance', 'confidential_codebase'].includes(text(v))
        ? null
        : `not one of the two v1 decline causes: ${JSON.stringify(v)}`,
    reshapingSuggestion: (v, body) => {
      const s = text(v);
      if (PLACEHOLDERS.includes(norm(s)) || norm(s).length < 12) return `not a reshaping suggestion: ${JSON.stringify(v)}`;
      return carriedInBody(s, body) ? null : 'the reshaping suggestion never appears in the copy the NGO receives';
    },
    oversightSentence: (v, body) => {
      const s = text(v);
      if (!/person|human|someone/i.test(s) || !/review|read|look/i.test(s)) {
        return `no human-review promise in ${JSON.stringify(v)}`;
      }
      return carriedInBody(s, body) ? null : 'the NGO is never told a person reviews the decline';
    },
  },
  'discovery.fit_decline_review': {
    declineCause: (v) =>
      ['ongoing_developer_maintenance', 'confidential_codebase'].includes(text(v))
        ? null
        : `not one of the two v1 decline causes: ${JSON.stringify(v)}`,
  },
  'discovery.decline_overturned': {
    discoveryReopened: (v) => (v === true ? null : `expected boolean true, got ${JSON.stringify(v)}`),
  },
  'discovery.off_topic_flagged': {
    projectId: (v) => (typeof v === 'string' && v.trim().length > 0 ? null : `not a project id: ${JSON.stringify(v)}`),
    organizationId: (v) => (typeof v === 'string' && v.trim().length > 0 ? null : `not an organisation id: ${JSON.stringify(v)}`),
    strikes: (v) => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isInteger(n) && n > 0 ? null : `not a strike count: ${JSON.stringify(v)}`;
    },
  },
  'discovery.regeneration_exhausted': {
    projectId: (v) => (typeof v === 'string' && v.trim().length > 0 ? null : `not a project id: ${JSON.stringify(v)}`),
    organizationId: (v) => (typeof v === 'string' && v.trim().length > 0 ? null : `not an organisation id: ${JSON.stringify(v)}`),
    regenerations: (v) => {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isInteger(n) && n > 0 ? null : `not a regeneration count: ${JSON.stringify(v)}`;
    },
    lastReason: (v, body) => {
      const s = text(v);
      if (PLACEHOLDERS.includes(norm(s)) || norm(s).length < 12) return `not a stated reason: ${JSON.stringify(v)}`;
      return carriedInBody(s, body) ? null : 'the last reason never appears in the copy the admin receives';
    },
  },
  'access.key_revoked': {
    replacementOnDashboard: (v, body) => {
      const s = text(v);
      if (!/dashboard/i.test(s)) return `no dashboard affordance in ${JSON.stringify(v)}`;
      return /dashboard/i.test(body) ? null : 'the copy never points the volunteer at the dashboard';
    },
  },
  'pm_item.status_auto_reverted': {
    whatToDoInstead: (v, body) => {
      const s = text(v);
      if (PLACEHOLDERS.includes(norm(s)) || norm(s).length < 12) return `not an instruction: ${JSON.stringify(v)}`;
      const penalty = PENALTY_LEXICON.filter((t) => norm(s).includes(t));
      if (penalty.length) return `penalty language ${JSON.stringify(penalty)} in the instruction`;
      return carriedInBody(s, body) ? null : 'the instruction never appears in the volunteer’s copy';
    },
  },
};
