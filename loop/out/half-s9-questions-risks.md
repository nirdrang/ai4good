## Open Questions & Risks

### Open Questions

**Resolved/superseded (trail only):** Q1+Q8: moot per decision-21 (REQ-009). Q2: resolved; no product impact. Q5: v1 reward is completion credit+"Shipped first tool" badge only (REQ-014); handoff tips→v1.5; honoraria only if Goal 2 underperforms. Q6: Discovery free within daily credits (10/day unverified, 30/day verified); funding from draft allowed; funded Discovery dollar-metered (REQ-002/004/006); `kyc_verified` lift→v1.5.

**Still open:**

- **Q3, NGO verification:** v1: founder-vetted flag (decision-29/r3). v1.5 bar: `verified` needs registration document, public reference link, manual admin review; `kyc_verified` adds tax-exempt documentation+NGO-admin identity check (provider selected). Open: accepted tax-exempt jurisdictions (US 501(c)(3), UK Charity Commission, EU equivalents).
- **Q4, skim rate:** flat 15% vs NGO-size-tiered vs sub-$200 waivers. Owner: business; due pre-public-launch; affects revenue model.
- **Q7, platform-level Lovable usage visibility:** v1: consent-based in-session balance read enforces per-task cap (REQ-021/028); standing cross-workspace visibility deferred (only broad per-user authorization today); revisit when usage-only scoped access ships — would replace per-session capture, add build-cadence analytics.

#### Open decisions register — founder calls still owed (decisions 20/21/22 fold-in; none block the PRD-dissection pass, each blocks only the build item named)

- OD-1: Reviewer identity+merge authority per project (coordinator/peer/agent-assisted)→REQ-026 merge flow+reviewer role
- OD-2: NGO Status-Panel scope+workspace onboarding→REQ-010/013 panel
- OD-3: Volunteer spend-cap+low-fuel warning levels→REQ-009
- OD-4: Misuse-detection enforcement sensitivity→REQ-009
- OD-5: Deferred second spend-verification layer scope→v1.5
- OD-6: Usage-metering operational home (founder: deferred)→REQ-009
- OD-7: PRD completion-gate threshold+scorer configuration (decision-25; pilot-tuned)→REQ-036
- OD-8: Triage-screener confidence threshold+model configuration (decision-29/r4; pilot-tuned)→REQ-023

### Risks & Mitigation

Rows: risk (severity): mitigation→contingency.

- Volunteers exceed fuel without enforcement (High): low-balance alerts, hard zero cut-off, transparent ledger→NGO top-up; platform absorbs week-1 pilot overruns
- AI consumes fuel, no viable deliverable (High): first-match disclaimer, fuel-cap-bounded exposure, user-test checkpoints, Goal 4 target, burn-per-deliverable (REQ-034)→transparency+post-mortem; no refund; outcome recorded (REQ-035)
- Malicious NGO posts commercial need (High): founder vetting+triage screener (Tier-2/non-decided→founder)→decline, deactivate; policy documented
- Volunteers ghost mid-project (High): 14-day reminder→21-day auto-release→re-opened; NGO re-match; responsiveness on project page
- Payment succeeds, fuel not credited (High): tight-cadence reconciliation→Stripe truth (decision-31)→undecidable-cases page
- Anthropic outage stops Discovery (High): "Service degraded" banner, queued intakes, manual scope option→alternate provider post-v1
- NGOs sign up, never fund (Medium): free Discovery funnel; $50 minimum at match-acceptance, not publish; abandonment detection→loosen if funnel-killing; unfunded tagged
- NGO expects SLA/completion guarantee (Medium): mandatory no-SLA acknowledgment at signup+every acceptance; Promise link per top-up→admin outreach; next-match priority
- AI code license/quality issues (Medium): MIT default (Platform Promise); disclaimer carries volunteer IP attestation (REQ-007, no v1 CLA); handoff requires passing lint+tests (REQ-012)→NGO may reject; remediation playbook
- Regulators deem verification documents sensitive PII (Medium): restricted access; DPA available→explicit consent+data-minimization review
- Fuel-cost inflation, Anthropic price rises (Medium): percentage skim scales; pre-announced→monthly rate-card adjustment
- Lovable security incident hits integration (Medium): exposure bounded (decision-35): build-phase seat only (exits at handoff; build Tier-2 fixtures-only)+volunteers' own accounts→rotate/exit seats; pause Lovable-track recommendations until remediated; in-flight→fallback (REQ-021)

---
