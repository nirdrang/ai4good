/**
 * The at-config registry — the single source for every pinned number the acceptance tests read.
 *
 * WHY: a threshold copied into a test body is a second source of truth. When the founder
 * re-tunes a value, a hard-coded copy keeps asserting the old one and the suite goes green on
 * a stale promise. Every configured number lives here; no test may hard-code one.
 *
 * `value: null` means the number is NOT pinned anywhere yet — the requirement names the knob
 * but no figure exists. A test that reads a null must fail loudly rather than substitute a
 * guess: an invented threshold is worse than a red.
 *
 * `provisional: true` marks a value that is not founder-settled — either flagged PROVISIONAL
 * where it is stated, or an open decision (OD-4, OD-7). Provisional values are usable; they
 * are expected to move.
 *
 * Sources are cited per entry. Adding a number here without a source is not allowed.
 */

export interface AtConfigEntry {
  /** plain-words name of the thing being pinned */
  name: string;
  /**
   * The pinned figure, or null when no figure has been pinned anywhere. Booleans are pinned
   * values too: whether a guard coalesces is configuration in exactly the way a cap is, and a
   * test that hard-coded the switch would go stale the same way a hard-coded number does.
   */
  value: number | boolean | null;
  unit: string;
  /** not founder-settled — flagged PROVISIONAL at its source, or an open decision */
  provisional?: true;
  /** where the figure comes from, and what would settle it */
  source: string;
}

export const AT_CONFIG = {
  gatewayLatencyP95Ms: {
    name: 'gateway added latency, 95th percentile',
    value: 300,
    unit: 'ms',
    provisional: true,
    source: 'AI4DEV-3 Part B — PROVISIONAL, pending a founder-set service-level objective',
  },
  gatewayFirstChunkMs: {
    name: 'gateway time to first streamed chunk',
    value: 500,
    unit: 'ms',
    provisional: true,
    source: 'AI4DEV-3 Part B — PROVISIONAL, pending a founder-set service-level objective',
  },
  aupResidualAccessRemovalMinutes: {
    name: 'removal of residual repo/Linear/org access after an acceptable-use deactivation',
    value: 15,
    unit: 'minutes',
    provisional: true,
    source: 'AT-007.22 — a bound the acceptance test defined ("promptly" in REQ-007); founder to pin',
  },
  monitorPropagationMinutes: {
    name: 'freshness interval for provider-derived figures reaching the product surfaces',
    value: 5,
    unit: 'minutes',
    provisional: true,
    source: 'AT-010.14 (the AT-006.48 bound) — provisional; founder to pin',
  },
  fundingMinimumUsd: {
    name: 'minimum first funding amount for a project',
    value: 50,
    unit: 'usd',
    source: 'prd-mvp.md REQ-006 — "Minimum $50"',
  },
  firstFundPerProjectCapUsd: {
    name: 'per-project funding cap while the NGO has no completed-project history',
    value: 200,
    unit: 'usd',
    source: 'prd-mvp.md REQ-006 — "capped per project (default $200)"',
  },
  firstFundPerDayCapUsd: {
    name: 'per-day funding cap while the NGO has no completed-project history',
    value: null,
    unit: 'usd',
    provisional: true,
    source: 'prd-mvp.md REQ-006 names a per-day cap alongside the $200 per-project cap but pins no figure',
  },
  discoveryDailyCreditsUnverified: {
    name: 'daily Discovery credit grant, email-verified NGO',
    value: 10,
    unit: 'credits/day',
    source: 'prd-mvp.md REQ-002 — "within 10 credits/day"',
  },
  discoveryDailyCreditsVetted: {
    name: 'daily Discovery credit grant, founder-vetted NGO',
    value: 30,
    unit: 'credits/day',
    source: 'prd-mvp.md REQ-002 — "Allowance 30/day"',
  },
  blockerReminderHours: {
    name: 'age at which an unresolved blocker sends its reminder',
    value: 48,
    unit: 'hours',
    source: 'prd-mvp.md REQ-024 — "a reminder at 48h"',
  },
  blockerEscalationDays: {
    name: 'age at which an unresolved blocker escalates to a platform admin',
    value: 7,
    unit: 'days',
    source: 'prd-mvp.md REQ-024 — "escalates to an admin at 7d"',
  },
  abandonmentReminderDays: {
    name: 'inactivity before the abandonment reminder fires',
    value: 14,
    unit: 'days',
    source: 'requirements/req-027.md — "a reminder at 14 days"',
  },
  abandonmentReleaseDays: {
    name: 'inactivity before the project auto-releases the volunteer',
    value: 21,
    unit: 'days',
    source: 'requirements/req-027.md — "auto-release at 21 days"',
  },
  restoreObjectiveHours: {
    name: 'recovery time objective for restoring service',
    value: 4,
    unit: 'hours',
    source: 'prd-mvp.md non-functional section — "RTO 4 hours"',
  },
  filePerFileSizeCapMb: {
    name: 'largest single uploaded project file',
    value: null,
    unit: 'mb',
    provisional: true,
    source: 'requirements/req-032.md names "per-file and per-project size caps" but pins no figure',
  },
  filePerProjectSizeCapMb: {
    name: 'total uploaded file size per project',
    value: null,
    unit: 'mb',
    provisional: true,
    source: 'requirements/req-032.md names "per-file and per-project size caps" but pins no figure',
  },
  authorizedLinkTtlMinutes: {
    name: 'lifetime of a short-lived authorized file link',
    value: null,
    unit: 'minutes',
    provisional: true,
    source: 'requirements/req-032.md says "short-lived authorized links" but pins no figure',
  },
  bindingCheckThresholdTokens: {
    name: 'request size at which the gateway enforces the project-binding check',
    value: null,
    unit: 'tokens',
    provisional: true,
    source: 'OD-4 (open decision) — the substantive-request threshold for binding checks; founder to pin',
  },
  /*
   * The thread-comment anti-spam guard. These three are TEST PINS, not product promises:
   * AT-016.08 supplies its own configuration ("Given a TEST-PINNED guard configuration — an
   * explicit cap/window/coalescing fixture") and says in the same breath that "production values
   * remain unstandardized". REQ-015 names the guard and pins no figure, so there is nothing
   * upstream to read. They live here anyway, because the alternative is the test body hard-coding
   * them, and a re-tune would then have to be chased through test source.
   */
  threadCommentNotificationsMaxPerWindow: {
    name: 'thread-comment notifications delivered to one recipient inside one anti-spam window',
    value: 2,
    unit: 'notifications/window',
    provisional: true,
    source: 'AT-016.08 — TEST-PINNED by the acceptance criterion itself; REQ-015 names the guard but pins no production figure',
  },
  threadCommentNotificationsWindowMs: {
    name: 'length of the thread-comment anti-spam window',
    value: 60_000,
    unit: 'ms',
    provisional: true,
    source: 'AT-016.08 — TEST-PINNED by the acceptance criterion itself; REQ-015 names the guard but pins no production figure',
  },
  threadCommentNotificationsCoalesce: {
    name: 'whether a thread-comment burst collapses into ONE notification per window instead of capping',
    value: false,
    unit: 'boolean',
    provisional: true,
    source: 'AT-016.08 — TEST-PINNED by the acceptance criterion itself ("an explicit cap/window/coalescing fixture")',
  },
  prdGateThresholdScore: {
    name: 'completion score at which the project PRD passes its gate',
    value: null,
    unit: 'score',
    provisional: true,
    source: 'OD-7 (open decision) — completion-gate threshold + scorer configuration; pilot-tuned',
  },
} as const satisfies Record<string, AtConfigEntry>;

export type AtConfigKey = keyof typeof AT_CONFIG;
