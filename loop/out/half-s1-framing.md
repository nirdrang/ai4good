# PRD: ai4good — MVP (v1 build spec)

> Pure v1 scope; deferrals in roadmap.md (RM-N). Source: prd-new.md.

## Executive Summary

NGOs need custom internal tools (scheduling, CRMs, grant trackers, dashboards) but cannot afford bespoke development. **ai4good: a nonprofit-operated, open-source marketplace turning NGO software needs into volunteer-built, AI-powered tools the NGO runs and keeps evolving itself.** A volunteer builds the first version via Claude Code orchestrating Lovable (the UI/app layer); the NGO then evolves the deployed app via chat. "Fuel" (prepaid, fully-consumable, non-cash metered Stripe credits) funds build-phase AI compute; the platform share is configurable (default ~15%), taken at consumption, not pay-in. Revenue: skim + grants + donations, never skim alone. Target: 25 NGOs with a working deployed tool and 100 active volunteer developers in the first 12 months.

---

## Platform Promise & Disclaimers

A nonprofit coordination layer, explicitly not a service provider with delivery commitments; hence free Discovery, fuel-on-match, open-source-by-default, no public ratings, tip-not-pay.

**Legal posture (decided 2026-06-03; flow #17 verdict 2026-07-08):** a plain-language ToS carries the no-warranty/no-SLA/limitation-of-liability terms (enforceable only inside a contract); the MVP pilot runs on the un-reviewed draft, risk accepted (→ RM-1). ai4good asserts a limited, bona-fide coordination relationship, not "no contract exists." Volunteers donate time; never employees, contractors, or subcontractors of ai4good or the NGO.

### 1. A limited coordination relationship — no delivery obligation
Connects the parties, funds AI compute; no party owes any specific outcome; volunteers donate their time.

### 2. Work is fully open-source (public MIT)
Every repo is public MIT from first commit (a public volunteer portfolio). **v1 is public-only (decision-27);** closed/confidential-codebase needs are declined at Discovery (→ RM-2). Sensitive-*data* tools are still served: public code, synthetic fixtures; the NGO connects real Tier-2 data itself post-handoff, never into the repo (REQ-004). Never allowed: commercial or closed-source-for-resale work, surveillance tooling, spam infrastructure, illegal use, acceptable-use violations.

### 3. Fuel funds AI usage on this project — not deliverables
Fuel pays for AI compute: NGO Discovery scoping past the free credit pool (decision-8) and volunteer build work. Lovable credits are separate: the NGO pays Lovable directly, never through fuel (REQ-021). Fuel does NOT buy a working tool, fixed scope, or outcome; it may be spent in full without a viable deliverable — a risk NGOs knowingly assume.

### 4. No SLA, no completion guarantee
No project is guaranteed to reach handoff: volunteers may ghost (inactivity → auto-release + rematch, REQ-027), AI may consume fuel without progress, scopes may prove infeasible, NGOs may decline handoffs. Inactivity + handoff flows surface stalls early; the platform always strives to attribute every token consumed to a specific work item (REQ-034).

### 5. What ai4good does promise
- Bounded financial risk: NGO-chosen per-project fuel budgets; nothing charged beyond commitment.
- Transparent volunteer track record: completion credit from day one (→ RM-3); never stars.
- Open-source IP norms: forkable forever, no lock-in.
- NGO-side vetting gating (REQ-002, founder-vetted in v1) against fraudulent and abusive demand.
- Escalation paths on stalls: messaging (REQ-015), notifications (REQ-016); post-handoff issue surfacing → RM-4 (v1: re-engage via a new project).
- A genuine attempt to ship: motivated volunteers, AI leverage, real NGO problems.

### 6. Progress over promises (stepwise funding by design)
NGOs are steered to small, frequent funding steps; each fuel run-out is a review of visible work — PM task view (REQ-026), commit cadence (REQ-010), the volunteer's next steps — before top-up. Low-fuel blockers (REQ-024) make stepwise funding the path of least resistance.

### 7. Fuel is non-cash, project-scoped credit — it stays yours and working (decided 2026-06-03)
Fundable from draft onward (decision-8). Project-scoped: unused fuel survives volunteer change (the successor inherits it, REQ-027). On finish or abandonment, leftover credit becomes redeployable NGO general-balance credit: auto-applies at any NGO funding checkout (Discovery top-up or match funding), can satisfy the $50 minimum, remainder on card. No donation flow (decision-28). No cash-out or withdrawal: no money-out path means no laundering risk, no ACH/AML/KYC machinery. Nothing is ever silently removed. Funding screen: "Fuel powers AI work and is not cash-refundable; unused fuel stays as credit for your projects."

### 8. Minimize admin intervention
Target: under 10 minutes admin time per active project per week at steady state. Automation first: only ambiguous cases reach an admin; manual work is batched, never on a kickoff's critical path, wait stated upfront (NGO vetting: twice-daily batches). Virtual keys mint automatically at kickoff (decision-21). v1 bounds loss: deterministic caps + daily human review (→ RM-5). Lovable setup: volunteer-driven (REQ-021). Fuel top-up, key rotation: NGO self-serve. Vetting: one audited admin action in concierge onboarding (decision-29/r3 → RM-6, RM-7). Reconciliation: fully automatic; corrections auto-conform to provider truth (decision-31); only undecidable drift surfaces. Features adding routine admin load must justify against this principle; a standing review inventories manual procedures against the target, automates the automatable, re-audits on each added manual step.

### 9. Acknowledgment cadence (Option D)
Explicit, audit-logged acknowledgments:
- **NGO at signup**: full ToS + Promise (all clauses); required before project creation.
- **NGO at first funding on a project and at every match acceptance**: fuel ≠ deliverable, no SLA, non-cash credit, tier data-responsibility. The first per-project funding names the project and cap; match acceptance names the volunteer; separate acknowledgments, never reused.
- **Volunteer at first match consent (decision-28, was first application)**: one combined account-held disclaimer: limited coordination relationship, open-source-by-default, per-project key use, standing data-confidentiality undertaking (synthetic/anonymized fixtures only; confidentiality over anything seen). Sworn once, binding before any sensitive-data project; re-prompted only on material text change.

Later same-project top-ups: passive footer Promise link, no hard checkbox. Acknowledgments record timestamp, IP, text version; a material text change re-triggers acknowledgment.

### 10. The deliverable: a tool the NGO can run and keep evolving (decided 2026-06-03; single model per decision-23)
Not "a repo": a deployed, running tool the non-technical NGO keeps evolving itself. **Exactly one delivery model (decision-23, 2026-07-07; supersedes decision-19's deferred second track):** the durable home is an AI app-builder (Lovable in v1), evolved via chat post-handoff. Discovery (REQ-004) checks fit: needs requiring ongoing developer maintenance (custom logic or integrations a non-developer cannot evolve via chat) are **declined at Discovery** with plain messaging; each decline recorded for founder review. No second track, no waitlist.

The NGO owns the code outright (portable, no lock-in) and self-maintains via chat for roughly the AI-builder's subscription (~$25/mo); stopping payment keeps a deployable app but ends chat maintenance. Stated at kickoff, with a spend cap so metered edit costs never blindside a non-technical owner.

---
