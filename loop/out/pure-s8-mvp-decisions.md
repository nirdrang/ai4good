## MVP Scope & Post-MVP Roadmap

Authoritative reference: Out of Scope = never built; this section = when features ship. (The decision history behind v1 lives in the project decision log, not here.)

### v1 MVP (public beta launch)

**Launch strategy — concierge-first:** volunteer supply is the #1 launch gate; there is no organic browse first. Pre-recruit a ~20–30-volunteer bench, hand-match the first ~10–15 curated projects end-to-end, then open organic browse. v1 hooks: the supply-funnel metric, the aging nudge, and concierge-match tooling (→RM-49).

**Foundation:**
- REQ-001 — Auth: email + GitHub + Google.
- REQ-002 minimal — NGO trust via the audited founder-vetted action (→RM-6).
- REQ-003 — Project Need intake.
- REQ-007 — Volunteer profile + concierge matching (enforce-match, one-action consent, match log).
- REQ-011 minimal — Public read-only newest-first listings (→RM-8, RM-21).

**Discovery & Publishing:**
- REQ-004 — Discovery Agent: free within the daily allowance; complexity tier only, no dollar estimate.
- REQ-005 — Scope doc + publishing into triage.
- REQ-023 — Automated triage screener + founder exception queue; threshold = OD-8.

**Funding & Money:**
- REQ-006 — Stripe top-up + fuel ledger + match-to-fund, non-cash and no-cash-out; leftover auto-applies at checkouts; no donation flow; chargeback handling + first-fund caps (→RM-19); no refunds (→RM-7).
- REQ-022 — No tips UI at completion (→RM-11).

**Project Execution:**
- REQ-008 — GitHub repo per project in the platform org; dev-internal issues only.
- REQ-009 — LLM gateway; hosting = OD-6 (→RM-5).
- REQ-010 — Project page + cadence stats + the fuel and Lovable meters.
- REQ-021 — Lovable as the deliverable vehicle; Claude Code orchestrates behind a replaceable integration layer; manual status (→RM-27).
- REQ-024 — Lifecycle-independent blockers + task-anchored clarifications.
- REQ-025 minimal — Informal scope-addition protocol (→RM-10).
- REQ-026 — Task management via Linear.
- REQ-028 — ai4good Claude Code Skill: install, bootstrap, task binding, commands, conventions + the Lovable orchestration layer.
- REQ-034 — Task-level attribution (→RM-39).
- REQ-035 — Deferred: attribution + post-completion health capture out of v1 (→RM-62).

**Comms & Dashboards (minimal v1):**
- REQ-013 minimal — NGO dashboard: projects + fuel + task progress + items needing action (→RM-42).
- REQ-014 minimal — Volunteer dashboard: projects + fuel + completion-credit events (→RM-3).
- REQ-015 — Project comment thread (→RM-43).
- REQ-016 minimal — Event notifications, documented defaults (→RM-45).

**Completion:**
- REQ-012 — Volunteer marks done when all P0 tasks complete; access termination + provider-workspace archive + tree snapshot; no formal ceremony (checklist/sign-off/attribution/health deferred →RM-62).

Additional post-MVP items with no other v1-doc mention: →RM-50, RM-51, RM-52, RM-53, RM-56, RM-57, RM-59 (roadmap.md).

### Permanently out of scope (will not build)

A firm "no," to prevent re-litigation:
- Crypto, on-chain tokens, tradeable fuel — Stripe-backed fiat only.
- Native mobile apps — web-responsive only.
- Closed-source/proprietary builds — all projects MIT-licensed by default.
- Service-level agreements / completion guarantees — contradicts the Platform Promise.
- Fuel-spend insurance / refund-on-no-deliverable — spent tokens cannot be un-spent.
- Platform skim on volunteer tips — 0%.
- Hosted production environment for NGO-built tools — completion means NGO ownership.
- NGO-to-NGO tool-sharing marketplace — out of mission.
- Multi-tool fuel metering — only Anthropic spend routes through fuel.
- Collection of volunteer prompt content — privacy posture.

### Open issues to resolve before public launch

Decisions/policies needing external (legal, accounting, business) input — not features:
1. Fuel legal/tax characterization — DECIDED: prepaid, fully-consumable, non-cash-refundable service credit; a one-line counsel confirmation is still wanted.
2. Refund/donation/chargeback mechanics — dissolved: no refunds, no donation flow, chargeback-after-consumption handled (→RM-19).
3. Abandonment/rematch state machine — RESOLVED as REQ-027.
4. Sensitive-data vs open-source conflict — RESOLVED: public MIT only (→RM-2); Tier-2 fixtures-only; an acceptable-use document is still owed (ops work, not a launch blocker).
5. Admin staffing model at scale — OPEN: manual gates hold at pilot volume, not the year-1 target.
6. Anthropic commercial readiness — pilot on self-serve billing + default limits (→RM-60).
7. Deployment ownership at completion — DECIDED: Lovable hosts, the NGO owns the workspace (~$25/mo, disclosed) throughout; no live-deployment precondition and no 30-day-alive tracking in v1 (deferred →RM-62).
8. Entity type — DECIDED: nonprofit (fiscal sponsorship now, own 501(c)(3) later).
9. Counsel deliverables — pilot on the plain-language draft ToS, risk accepted (→RM-1).
10. Blended P&L + grant runway — a daily money dashboard suffices at pilot (→RM-61).
