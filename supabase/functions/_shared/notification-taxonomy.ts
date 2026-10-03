export type Role = 'ngo' | 'volunteer' | 'ex_volunteer' | 'platform_admin';
export type Channel = 'email' | 'inapp';
export type Tone = 'normal' | 'low';

export type EventClass = 'money' | 'deadline' | 'blocker' | 'completion' | 'decision' | 'access' | 'lowtone' | 'other';

export type TaxonomyRow = {
  readonly event: string;
  readonly recipients: readonly Role[];
  readonly channels: readonly Channel[] | null;
  readonly tone: Tone;
  readonly class: EventClass;
  readonly payloadKeys?: readonly string[];
  readonly guarded?: true;
  readonly opsItem?: true;
  readonly escalation?: true;
};

export const TAXONOMY: readonly TaxonomyRow[] = [
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

export type ClassChannelRule = {
  readonly mustInclude?: readonly Channel[];
  readonly mustEqual?: readonly Channel[];
};

export const CLASS_CHANNEL_RULE: Readonly<Record<EventClass, ClassChannelRule>> = {
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
  for (const channel of rule.mustInclude ?? []) {
    if (!channels.includes(channel)) problems.push(`class "${row.class}" requires ${channel}, got ${JSON.stringify(channels)}`);
  }
  if (rule.mustEqual) {
    const got = [...channels].sort().join(',');
    const want = [...rule.mustEqual].sort().join(',');
    if (got !== want) problems.push(`class "${row.class}" requires exactly [${want}], got [${got}]`);
  }
  return problems;
}

export type ClassDefault = {
  readonly channels: readonly Channel[];
  readonly source: string;
};

export const DEFAULT_BY_CLASS: Readonly<Record<EventClass, ClassDefault>> = {
  money: {
    channels: ['email', 'inapp'],
    source: 'REQ-016 delivery defaults: money events are critical and go by email; the in-app copy keeps the ledger change on the dashboard',
  },
  deadline: {
    channels: ['email', 'inapp'],
    source: 'REQ-016 delivery defaults: deadline events are critical and go by email; the in-app copy stays visible until the deadline passes',
  },
  blocker: {
    channels: ['email', 'inapp'],
    source: 'REQ-016 delivery defaults: blocker events are critical and go by email; the in-app copy sits on the project workspace',
  },
  completion: {
    channels: ['email', 'inapp'],
    source: 'REQ-016 delivery defaults: completion events are critical and go by email; the in-app copy closes the project on the dashboard',
  },
  decision: {
    channels: ['email', 'inapp'],
    source: 'REQ-016 delivery defaults: decision events are critical and go by email; the in-app copy carries the decision on the dashboard',
  },
  access: {
    channels: ['email', 'inapp'],
    source: 'REQ-016 access rows name email and in-app where they name channels; an unnamed access row follows the named ones',
  },
  lowtone: {
    channels: ['inapp'],
    source: 'REQ-016 delivery defaults: low-tone events are in-app only, never email',
  },
  other: {
    channels: ['inapp'],
    source: 'REQ-016 names no channel for these rows and states no class rule; in-app is the quiet default and email is not assumed',
  },
};

export function channelsFor(row: TaxonomyRow): Channel[] {
  return row.channels ? [...row.channels] : [...DEFAULT_BY_CLASS[row.class].channels];
}

export type DocumentedDefault = {
  event: string;
  channels: Channel[];
  source: string;
};

export function documentedDefaults(): DocumentedDefault[] {
  return TAXONOMY.map((row) => ({
    event: row.event,
    channels: channelsFor(row),
    source: row.channels ? `REQ-016 taxonomy row ${row.event} names its channels` : DEFAULT_BY_CLASS[row.class].source,
  }));
}

export function taxonomyRow(event: string): TaxonomyRow | undefined {
  return TAXONOMY.find((row) => row.event === event);
}

function assertTaxonomyIsLegal(): void {
  const seen = new Set<string>();
  for (const row of TAXONOMY) {
    if (seen.has(row.event)) throw new Error(`notification taxonomy registers ${row.event} twice`);
    seen.add(row.event);
    const problems = channelRuleProblems(row, channelsFor(row));
    if (problems.length) {
      throw new Error(`notification taxonomy row ${row.event} binds to channels that break its class rule: ${problems.join('; ')}`);
    }
  }
}

assertTaxonomyIsLegal();
