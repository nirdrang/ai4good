/**
 * REQ-016 v1 notification taxonomy — the suite's SPEC ORACLE.
 *
 * Transcribed row-for-row from `.taskmaster/docs/requirements/req-016.md` (lines 6-19,
 * incl. the d78 watchdog row and the d81 PRD-gate + money-corrections rows).
 * AT-016.02 asserts the registered event set is EXACTLY equal to this table;
 * AT-016.03 fires every row and asserts recipients/channels/payloads.
 *
 * `event` keys are DEFINED BY THIS SUITE (test-first): the requirement names events in
 * prose, so the suite fixes the wire names and REQ-016's implementation (decomp req-016
 * D1.L1) must register exactly these. Renaming a key here is a spec change, not a fix.
 *
 * `channels: null` = the requirement does not name channels for this row. AT-016.03 binds
 * those rows to the DOCUMENTED per-event defaults (AT-016.06's matrix is the runtime
 * oracle), so nothing is silently assumed here.
 */

export type Role = 'ngo' | 'volunteer' | 'ex_volunteer' | 'platform_admin';
export type Channel = 'email' | 'inapp';
export type Tone = 'normal' | 'low';

/** Critical classes named by REQ-016's delivery defaults (AT-016.05). */
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
  /** wire name of the registered event */
  event: string;
  /** exact recipient roles — no extra, no missing */
  recipients: Role[];
  /** channels named by the requirement, or null = bind to the documented default */
  channels: Channel[] | null;
  tone: Tone;
  class: EventClass;
  /** payload keys the requirement names for this row (AT-016.03 payload semantics) */
  payloadKeys?: string[];
  /** row accompanies a ledger/state transition -> in AT-016.09's guarded matrix */
  guarded?: boolean;
  /** row must create exactly one linked ops item (AT-016.03) */
  opsItem?: boolean;
  /** escalation tier: NGO + platform admin (AT-016.12) */
  escalation?: boolean;
}

export const TAXONOMY: TaxonomyRow[] = [
  // --- Project decisions (req-016.md line 6) ---
  { event: 'triage.approved', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision', payloadKeys: ['marketplaceVisibility'] },
  { event: 'triage.returned_to_scoped', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision', payloadKeys: ['reason'] },
  { event: 'triage.declined_terminal', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision' },
  { event: 'vetting.outcome', recipients: ['ngo'], channels: null, tone: 'normal', class: 'decision' },

  // --- Matching (line 7) ---
  { event: 'candidacy.marked', recipients: ['platform_admin'], channels: null, tone: 'normal', class: 'other' },
  { event: 'match.created', recipients: ['volunteer'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision', payloadKeys: ['consentCta'] },
  { event: 'match.consented', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision', payloadKeys: ['fundToKickOff'] },
  { event: 'match.declined_or_expired', recipients: ['platform_admin'], channels: null, tone: 'normal', class: 'other' },
  { event: 'open_project.unmatched_aging', recipients: ['platform_admin'], channels: null, tone: 'normal', class: 'other' },

  // --- Abandonment, REQ-027 (line 8) ---
  { event: 'abandonment.reminder_14d', recipients: ['volunteer', 'ngo'], channels: null, tone: 'normal', class: 'deadline' },
  { event: 'abandonment.released', recipients: ['ngo', 'ex_volunteer'], channels: null, tone: 'normal', class: 'deadline' },
  { event: 'abandonment.rematch_available', recipients: ['ngo'], channels: null, tone: 'normal', class: 'other' },

  // --- Money (line 9) ---
  { event: 'funding.pre_deadline_reminder', recipients: ['ngo'], channels: null, tone: 'normal', class: 'deadline' },
  { event: 'funding.deadline_expired', recipients: ['ngo', 'volunteer'], channels: null, tone: 'normal', class: 'deadline', guarded: true },
  { event: 'payment.succeeded', recipients: ['ngo', 'volunteer'], channels: null, tone: 'normal', class: 'money', guarded: true },
  { event: 'payment.failed', recipients: ['ngo'], channels: null, tone: 'normal', class: 'money', guarded: true },
  { event: 'fuel.threshold_20', recipients: ['ngo'], channels: null, tone: 'normal', class: 'money', guarded: true },
  { event: 'fuel.threshold_5', recipients: ['ngo', 'volunteer'], channels: null, tone: 'normal', class: 'money', guarded: true },
  { event: 'fuel.depleted', recipients: ['ngo', 'volunteer', 'platform_admin'], channels: null, tone: 'normal', class: 'money', guarded: true },
  { event: 'leftover.released', recipients: ['ngo'], channels: null, tone: 'normal', class: 'money', guarded: true },
  { event: 'chargeback.opened', recipients: ['ngo', 'platform_admin'], channels: null, tone: 'normal', class: 'money', guarded: true, opsItem: true },

  // --- Access (line 10) ---
  { event: 'access.key_issued', recipients: ['volunteer'], channels: ['email', 'inapp'], tone: 'normal', class: 'access', guarded: true },
  { event: 'access.key_revoked', recipients: ['volunteer'], channels: ['email', 'inapp'], tone: 'normal', class: 'access', guarded: true, payloadKeys: ['replacementOnDashboard'] },

  // --- Fail-closed interlock, d78 (line 11) ---
  { event: 'gateway.watchdog_failed_closed', recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'other' },

  // --- PRD gate, REQ-036 / d81 (line 12) ---
  { event: 'prd_gate.below_threshold_gap_report', recipients: ['volunteer'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision' },
  { event: 'prd_gate.passed', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'decision' },
  { event: 'backlog.live', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'other' },

  // --- Money corrections, REQ-030 / d81 (line 13) ---
  { event: 'reconciliation.large_drift', recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'money' },
  { event: 'reconciliation.undecidable_drift', recipients: ['platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'money' },

  // --- Work signals, PM-tree only (line 14) ---
  { event: 'pm_item.status_changed', recipients: ['ngo'], channels: ['inapp'], tone: 'low', class: 'lowtone' },
  { event: 'pm_item.completed', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'completion' },
  { event: 'requirement.comment', recipients: ['volunteer'], channels: ['inapp'], tone: 'normal', class: 'other' },
  { event: 'thread.comment', recipients: ['volunteer'], channels: ['inapp'], tone: 'normal', class: 'other' },
  { event: 'blocker.raised', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'blocker' },
  { event: 'blocker.resolved', recipients: ['ngo', 'volunteer'], channels: ['email', 'inapp'], tone: 'normal', class: 'blocker' },
  { event: 'blocker.aging_48h', recipients: ['ngo'], channels: ['email', 'inapp'], tone: 'normal', class: 'blocker' },
  { event: 'blocker.aging_7d', recipients: ['ngo', 'platform_admin'], channels: ['email', 'inapp'], tone: 'normal', class: 'blocker' },
  { event: 'pm_item.status_auto_reverted', recipients: ['volunteer'], channels: ['inapp'], tone: 'low', class: 'lowtone', payloadKeys: ['whatToDoInstead'] },

  // --- Completion (line 16) ---
  { event: 'project.completed', recipients: ['ngo', 'volunteer'], channels: null, tone: 'normal', class: 'completion', guarded: true },

  // --- Provisioning + Lovable (line 17) ---
  { event: 'provisioning.failed', recipients: ['ngo', 'volunteer', 'platform_admin'], channels: null, tone: 'normal', class: 'other', opsItem: true },
  { event: 'lovable.setup_reminder', recipients: ['ngo'], channels: null, tone: 'normal', class: 'other' },
  { event: 'lovable.credits_low', recipients: ['ngo'], channels: null, tone: 'normal', class: 'other' },
  { event: 'lovable.credits_blocked', recipients: ['ngo', 'platform_admin'], channels: null, tone: 'normal', class: 'other', escalation: true },
  { event: 'lovable.setup_pending_raised', recipients: ['ngo'], channels: null, tone: 'normal', class: 'other' },
  { event: 'lovable.setup_complete', recipients: ['ngo', 'volunteer'], channels: null, tone: 'normal', class: 'other' },
];

/**
 * Rows in AT-016.09's guarded matrix: every money row, BOTH access rows, completion.
 * Parameterized, not sampled per class.
 */
export const GUARDED_ROWS = TAXONOMY.filter((r) => r.guarded === true);

/** One fixture per critical class named by the delivery defaults (AT-016.05). */
export const CRITICAL_CLASS_FIXTURES: Record<'money' | 'deadline' | 'blocker' | 'completion' | 'decision', string> = {
  money: 'payment.succeeded',
  deadline: 'funding.deadline_expired',
  blocker: 'blocker.raised',
  completion: 'project.completed',
  decision: 'triage.approved',
};

/** The low-tone probe named by AT-016.05 ("task status changed"). */
export const LOW_TONE_FIXTURE = 'pm_item.status_changed';

/**
 * Copy that must NOT appear in the PM auto-revert notification (AT-016.03: instructive,
 * no penalty language). Explicit lexicon so the check is discriminating, not decorative.
 */
export const PENALTY_LEXICON = ['penalty', 'penalis', 'penaliz', 'violation', 'infraction', 'warning issued', 'strike', 'fault', 'blame'];

/**
 * Patterns that would betray a dedicated scope-change / change-request event (AT-016.02).
 * `donat` (not `donation`) so `leftover.donated` cannot slip past — same stem AT-016.04 uses.
 */
export const FORBIDDEN_EVENT_PATTERNS = [/change[._-]?request/i, /\bcr\b/i, /scope[._-]?change/i, /donat/i];

/* ------------------------------------------------------------------ independent oracles */

export interface ChannelRule {
  /** the row's channels must contain all of these */
  mustInclude?: Channel[];
  /** the row's channels must be exactly this set */
  mustEqual?: Channel[];
}

/**
 * The delivery-defaults rule, transcribed from the requirement itself (req-016.md line 19:
 * "email for critical events (money, deadlines, blockers, completion, decisions); in-app only
 * for low-tone").
 *
 * WHY IT EXISTS: without it, the only oracle for a channel-unspecified row is
 * `sut.documentedDefaults()` — the subject documenting its own behaviour. An implementation
 * that delivers the wrong channels and documents that same wrong default would agree with
 * itself and pass. This rule is upstream of the implementation, so it can disagree.
 *
 * `access` and `other` carry NO rule: the requirement names channels explicitly for the rows
 * that matter (access, watchdog, PRD gate, work signals) and states nothing for the rest, so
 * for those the documented default remains the only oracle. That gap is real and named here
 * rather than papered over with an invented rule.
 */
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

/** Where a set of channels violates the requirement's own class rule. */
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

/* ---------------------------------------------------- payload semantics (AT-016.03) */

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();
const PLACEHOLDERS = ['', '-', 'n/a', 'na', 'tbd', 'none', 'null', 'undefined', 'todo'];

const text = (v: unknown): string => (typeof v === 'string' ? v : '');

function carriedInBody(value: string, body: string): boolean {
  const v = norm(value);
  return v.length > 0 && norm(body).includes(v);
}

/**
 * Deterministic meaning checks for the payload keys the requirement NAMES.
 *
 * A non-empty-string check is not a semantics check: `reason = "x"` and
 * `consentCta = "garbage"` both pass it. Each predicate below asserts the value carries the
 * affordance the requirement names AND that it actually reaches the recipient's copy — a
 * payload field the rendered body never uses is a field the NGO never sees.
 *
 * Returns an error string, or null when the value is acceptable.
 */
export const PAYLOAD_PREDICATES: Record<string, Record<string, (value: unknown, body: string) => string | null>> = {
  'triage.approved': {
    // "approval means marketplace visibility"
    marketplaceVisibility: (v) => (v === true ? null : `expected boolean true, got ${JSON.stringify(v)}`),
  },
  'triage.returned_to_scoped': {
    // "returned-to-scoped (with reason)"
    reason: (v, body) => {
      const s = text(v);
      if (PLACEHOLDERS.includes(norm(s)) || norm(s).length < 12) return `not a stated reason: ${JSON.stringify(v)}`;
      return carriedInBody(s, body) ? null : 'the reason never appears in the copy the NGO receives';
    },
  },
  'match.created': {
    // "consent CTA"
    consentCta: (v, body) => {
      const s = text(v);
      if (!/consent|accept|confirm/i.test(s)) return `no consent call-to-action in ${JSON.stringify(v)}`;
      return carriedInBody(s, body) ? null : 'the consent CTA never appears in the volunteer’s copy';
    },
  },
  'match.consented': {
    // "fund-to-kick-off"
    fundToKickOff: (v, body) => {
      const s = text(v);
      if (!/fund/i.test(s) || !/kick|start|begin/i.test(s)) return `no fund-to-kick-off framing in ${JSON.stringify(v)}`;
      return carriedInBody(s, body) ? null : 'the fund-to-kick-off framing never appears in the NGO’s copy';
    },
  },
  'access.key_revoked': {
    // "replacement on dashboard"
    replacementOnDashboard: (v, body) => {
      const s = text(v);
      if (!/dashboard/i.test(s)) return `no dashboard affordance in ${JSON.stringify(v)}`;
      return /dashboard/i.test(body) ? null : 'the copy never points the volunteer at the dashboard';
    },
  },
  'pm_item.status_auto_reverted': {
    // "instructive (states what to do instead) with no penalty language"
    whatToDoInstead: (v, body) => {
      const s = text(v);
      if (PLACEHOLDERS.includes(norm(s)) || norm(s).length < 12) return `not an instruction: ${JSON.stringify(v)}`;
      const penalty = PENALTY_LEXICON.filter((t) => norm(s).includes(t));
      if (penalty.length) return `penalty language ${JSON.stringify(penalty)} in the instruction`;
      return carriedInBody(s, body) ? null : 'the instruction never appears in the volunteer’s copy';
    },
  },
};
