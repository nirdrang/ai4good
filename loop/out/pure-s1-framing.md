# PRD: ai4good — MVP (v1 build spec)

> Pure v1 scope; deferrals in roadmap.md (RM-N).

## Executive Summary

NGOs need custom internal tools (scheduling, CRMs, grant trackers, dashboards) but cannot afford bespoke development. **ai4good: a nonprofit-operated, open-source marketplace turning NGO software needs into volunteer-built, AI-powered tools the NGO runs and keeps evolving itself.** A volunteer builds the first version via Claude Code orchestrating Lovable (the UI/app layer); the NGO then evolves the deployed app via chat. "Fuel" (prepaid, fully-consumable, non-cash metered Stripe credits) funds build-phase AI compute; the platform share (the "skim") is configurable (default ~15%), taken at consumption, not pay-in. Revenue is blended — skim, grants, and donations, never skim alone. Target: 25 NGOs with a working deployed tool and 100 active volunteer developers in the first 12 months.

---

## Platform Promise & Disclaimers

A nonprofit coordination layer, explicitly not a service provider with delivery commitments — hence free Discovery, fuel-on-match, open-source-by-default, no public ratings, tip-not-pay.

**Legal posture:** a plain-language ToS — warm in tone, real in force — carries the no-warranty/no-SLA/limitation-of-liability terms (enforceable only inside a contract); the MVP pilot runs on the un-reviewed draft, risk accepted (→ RM-1). ai4good asserts a limited, genuine coordination relationship, not "no contract exists." Volunteers donate time; they are never employees, contractors, or subcontractors of ai4good or the NGO.

### 1. A limited coordination relationship — no delivery obligation
ai4good connects the parties and funds AI compute; no party owes any specific outcome; volunteers donate their time.

### 2. Work is fully open-source (public MIT)
Every repo remains MIT-licensed (a public volunteer portfolio): a repo is born private — Lovable's creation default — and the platform flips it public at setup validation, within the first days of the build; from then on its canonical GitHub visibility is public unless an active, audited founder break-glass hide (REQ-031) requires it to be private. **v1 is public-only:** needs genuinely requiring a closed/confidential codebase are declined at Discovery (→ RM-2) — the hide is an emergency action, never a private-project option. A hide limits FUTURE access through ai4good-controlled surfaces and the canonical repo only; it cannot recall clones or forks, revoke rights in copies already obtained, or provide retroactive confidentiality. Throughout this PRD, statements that projects, pages, listings, showcases, task trees, portfolios, or repos are public describe their normal state, subject only to this exception. This is separate from data sensitivity — a tool handling sensitive *data* is still served with public code and synthetic fixtures, and the NGO connects real Tier-2 data itself post-completion, never into the repo (REQ-004). Never allowed: commercial or closed-source-for-resale work, surveillance tooling, spam infrastructure, illegal use, acceptable-use violations.

### 3. Fuel funds AI usage on this project — not deliverables
Fuel pays for AI compute: NGO Discovery scoping past the free credit pool and volunteer build work. Lovable credits are separate — the NGO pays Lovable directly from its own workspace, never through fuel (REQ-021). Fuel does NOT buy a working tool, a fixed scope, or an outcome; the NGO or volunteer may spend it in full without a viable deliverable, a risk NGOs knowingly assume.

### 4. No SLA, no completion guarantee
No project is guaranteed to reach completion: volunteers may ghost (inactivity → auto-release + rematch, REQ-027), AI may consume fuel without progress, scopes may prove infeasible, NGOs may cancel. Inactivity flows surface stalls early, and the platform always strives to attribute every token consumed to a specific work item (REQ-034) — even when the outcome disappoints, the NGO sees exactly what its fuel was spent attempting.

### 5. What ai4good does promise
- Bounded financial risk: NGO-chosen per-project fuel budgets; nothing charged beyond commitment.
- A transparent volunteer track record: completion credit from day one (→ RM-3), never stars; every repo is MIT from setup validation onward and normally public, so the portfolio is normally visible on GitHub throughout the build — an active REQ-031 hide may interrupt canonical visibility, never MIT licensing or already-distributed copies.
- Open-source IP norms: MIT rights are never revoked — copies and forks already made persist; no lock-in.
- NGO-side vetting (REQ-002, founder-vetted in v1) that gates against fraudulent and abusive demand.
- Escalation paths on stalls: messaging (REQ-015) and notifications (REQ-016); post-completion issue surfacing (→ RM-4; in v1, re-engage via a new project).
- A genuine attempt to ship: motivated volunteers, AI leverage, real NGO problems.

### 6. Progress over promises (stepwise funding by design)
NGOs are steered toward small, frequent funding steps; each fuel run-out is a review of visible work — the PM task view (REQ-026), commit cadence (REQ-010), and the volunteer's next steps — before top-up. Low-fuel blockers (REQ-024) make stepwise funding the path of least resistance.

### 7. Fuel is non-cash, project-scoped credit — it stays yours and working
Fuel is fundable from draft onward — typically at match acceptance, or earlier to continue Discovery past the free pool. It is project-scoped: unused fuel survives a volunteer change (the successor inherits it, REQ-027). On genuine finish or abandonment, leftover credit becomes redeployable NGO general-balance credit that auto-applies at any NGO funding checkout, can satisfy the $50 minimum, with any remainder on card. There is no donation flow and no cash-out or withdrawal — no money-out path means no laundering risk and no ACH/AML/KYC machinery. Nothing is ever silently removed. The funding flow discloses plainly, before commitment, that fuel funds AI work, is not cash-refundable, and that unused fuel stays as credit for the NGO's projects.

### 8. Minimize admin intervention
The target is under 10 minutes of admin time per active project per week at steady state. Automation comes first — only ambiguous cases reach an admin, with one deliberate v1 exception: every marketplace publication is human-reviewed at the triage gate (REQ-023), a compliance stance chosen over automation at pilot volume; manual work is batched, never on a kickoff's critical path, with the wait stated upfront (NGO vetting is batched). Virtual keys mint automatically at kickoff. Loss is bounded by caps plus regular human review (→ RM-5). Lovable setup is volunteer-driven (REQ-021); fuel top-up and key rotation are NGO self-serve; vetting is one audited admin action in concierge onboarding (→ RM-6, RM-7); reconciliation is fully automatic, with corrections conforming to provider-authoritative records and only undecidable drift surfacing. Any feature needing routine admin involvement is weighed against this principle before it is added, and a standing review inventories every manual procedure against the target, automates the automatable, and re-audits whenever a manual step is added.

### 9. Acknowledgment cadence
Explicit, audit-logged acknowledgments:
- **NGO at signup:** the full ToS + Promise (all clauses); required before project creation.
- **NGO at first funding on a project and at every match acceptance:** fuel ≠ deliverable, no SLA, non-cash credit, and data-responsibility for the tier. The first per-project funding names the project and its cap; match acceptance names the volunteer; separate acknowledgments, never reused.
- **Volunteer at first match consent:** one combined account-held disclaimer — limited coordination relationship, open-source-by-default, per-project key use, and a standing data-confidentiality undertaking (when a project handles real data, the NGO's synthetic/anonymized fixtures only, with confidentiality over anything seen). Sworn once, binding before any sensitive-data project; re-prompted only on a material text change.

Later same-project top-ups do not require renewed acknowledgment, while the Promise stays readily accessible. Every acknowledgment records timestamp, IP, and text version; a material text change re-triggers it.

### 10. The deliverable: a tool the NGO can run and keep evolving
The deliverable is not "a repo" but a deployed, running tool the non-technical NGO keeps evolving itself. **There is exactly one delivery model:** the durable home is an AI app-builder (Lovable in v1), evolved via chat after completion; the volunteer builds the first version through Claude Code orchestrating Lovable. Discovery (REQ-004) checks fit — a need requiring ongoing developer maintenance (custom logic or integrations a non-developer cannot evolve via chat) is **declined at Discovery** with plain messaging, each decline recorded for founder review. No second track, no waitlist.

The NGO owns the code outright (portable, no lock-in) and self-maintains via chat for roughly the AI-builder's subscription (~$25/mo); stopping payment keeps a deployable app but ends hands-free chat maintenance. This is set as an expectation at kickoff, with a spend cap so metered edit costs never blindside a non-technical owner.

---
