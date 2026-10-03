export interface AtConfigEntry {
  name: string;
  value: number | boolean | null;
  unit: string;
  provisional?: true;
  source: string;
}

export const AT_CONFIG = {
  discoveryMaxOutputTokens: { name: 'Discovery maximum output', value: 4096, unit: 'tokens', source: 'AI4DEV-132 design/candidate-4-reserve-settle.md' },
  discoveryTurnDeadlineSeconds: { name: 'Discovery open turn deadline', value: 150, unit: 'seconds', source: 'AI4DEV-132 design/candidate-4-reserve-settle.md' },
  discoveryCauseLabelsMax: { name: 'Discovery cause labels maximum', value: 3, unit: 'labels', source: 'PRD REQ-004 "zero to three"' },
  discoveryOffTopicFlagStrikes: {
    name: 'Discovery off-topic flag strikes',
    value: 3,
    unit: 'declines',
    provisional: true,
    source: 'founder ruling at the unit 4 gate of the scope run, 2026-09-19, pilot-tuned',
  },
  discoveryRegenerationBound: {
    name: 'Discovery regeneration bound',
    value: 3,
    unit: 'regenerations',
    source: 'architecture notes REQ-004 "up to 3x"',
  },
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
    value: 200,
    unit: 'usd',
    source:
      'founder 2026-08-07: equal to the $200 per-project cap, so a brand-new NGO can fully fund one project in a day and no more. v1 is single-dev projects matched by a human, so funding a second project on the first day is already outside the expected shape — the tightest bound that never blocks a legitimate first project is the right one.',
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
    value: 25,
    unit: 'mb',
    source:
      'founder 2026-08-07: sized for the realistic large case, a scanned PDF requirements document, and kept under the provider document limit so a file that uploads can always be read. Accepting a file Discovery cannot read would be worse than rejecting it, because the NGO would believe it had been understood.',
  },
  filePerProjectSizeCapMb: {
    name: 'total uploaded file size per project',
    value: 100,
    unit: 'mb',
    source:
      'founder 2026-08-07: four maximum-size files, or many ordinary ones — generous for the internal tools v1 serves while still bounding what an abandoned project leaves behind.',
  },
  authorizedLinkTtlMinutes: {
    name: 'lifetime of a short-lived authorized file link',
    value: 15,
    unit: 'minutes',
    source:
      'founder 2026-08-07: links are minted on demand from the project page, so none needs to survive — nobody is ever holding one they must come back to. Fifteen minutes bounds the damage when a link is pasted into a chat or forwarded, which is the realistic leak for files that may carry ordinary personal data.',
  },
  bindingCheckThresholdTokens: {
    name: 'request size at which the gateway enforces the project-binding check',
    value: null,
    unit: 'tokens',
    provisional: true,
    source: 'OD-4 (open decision) — the substantive-request threshold for binding checks; founder to pin',
  },
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
  accessTokenLifetimeSeconds: {
    name: 'lifetime of an access token issued by the local Auth service (jwt_expiry)',
    value: 120,
    unit: 'seconds',
    source:
      'supabase/config.toml [auth] jwt_expiry, pinned to 120 so AT-001.12 and AT-001.13 wait out a real expiry inside ' +
      'their 240 s budget (the ruling of AI4DEV-86, the item that parks the slot pool, 2026-09-02); the config comment cites this entry back',
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
