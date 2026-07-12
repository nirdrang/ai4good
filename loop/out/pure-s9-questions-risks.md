## Open Questions & Risks

### Open Questions

**Resolved / superseded (trail only):** Q1+Q8: moot — volunteer AI access is platform-managed, attributed per volunteer, and instantly revocable, with no external-provisioning dependency (REQ-009). Q2: resolved; no product impact. Q5: the v1 reward is completion credit plus the "Shipped first tool" badge only (REQ-014); NGO tips at completion → v1.5; honoraria revisited only if Goal 2 underperforms. Q6: Discovery is free within per-NGO daily credits (10/day unverified, 30/day verified); funding from draft is allowed; funded Discovery is dollar-metered (REQ-002/004/006); the `kyc_verified` allowance lift → v1.5.

**Still open:**

- **Q3, NGO verification:** v1 is a founder-vetted flag. The v1.5 bar: `verified` needs a registration document, a public reference link, and manual admin review; `kyc_verified` adds tax-exempt documentation and an NGO-admin identity check (provider selected). Open: which jurisdictions' tax-exempt documents v1 accepts (US 501(c)(3), UK Charity Commission, EU equivalents).
- **Q4, skim rate:** flat 15% vs NGO-size-tiered vs sub-$200 waivers. Owner: business; due pre-public-launch; affects the revenue model.
- **Q7, platform-level Lovable usage visibility:** in v1 the NGO's Lovable balance is read via the Lovable MCP (`get_workspace`) only with the volunteer's consent, during the volunteer's own session (REQ-021/028); standing cross-workspace/background visibility is deferred (OAuth grants only broad per-user access — list/read/edit every project the account can reach — and a standing platform poll would require broad standing cross-workspace access the platform deliberately does not hold); revisit for narrowly-scoped usage-only access + build-cadence analytics.

#### Open decisions register — founder calls still owed (none block the PRD-dissection pass; each blocks only the build item named)

- OD-1: reviewer identity + merge authority per project (coordinator / peer / agent-assisted human click; governance, not plumbing) → REQ-026 merge flow + reviewer role
- OD-2: NGO Status-Panel scope + workspace onboarding → REQ-010/013 panel
- OD-4: misuse-detection enforcement sensitivity → REQ-009
- OD-5: deferred second spend-verification layer scope → v1.5
- OD-6: usage-metering operational home (deferred) → REQ-009
- OD-7: PRD completion-gate threshold + scorer configuration (pilot-tuned) → REQ-036
- OD-8: triage-screener confidence threshold + model configuration (pilot-tuned) → REQ-023

### Risks & Mitigation

Rows: risk (severity): mitigation → contingency.

- Volunteers exceed fuel without enforcement (High): low-balance alerts, a hard zero cut-off, a transparent ledger → NGO top-up; the platform absorbs week-1 pilot overruns.
- AI consumes fuel with no viable deliverable (High): the first-match disclaimer, a per-project fuel cap bounding exposure, user-test checkpoints during builds, the Goal 4 target, and burn-per-deliverable on the NGO panel (REQ-034) → transparency + post-mortem; no refund; the completion record notes the outcome (REQ-012).
- Malicious NGO posts a commercial need (High): the founder vetting gate + the triage screener (Tier-2/non-decided → founder) → decline, deactivate; policy documented.
- Volunteers ghost mid-project (High): a 14-day inactivity reminder → 21-day auto-release → re-opened; the NGO can request re-match; responsiveness shown on the project page.
- Payment succeeds but fuel is not credited (High): tight-cadence reconciliation detects and auto-corrects to Stripe truth → the undecidable-cases page.
- Anthropic outage stops Discovery (High): a "service degraded" banner, queued intakes, a manual scope option → alternate provider post-v1.
- NGOs sign up but never fund (Medium): the free Discovery funnel; the $50 minimum at match-acceptance, not publish; abandonment detection → loosen if funnel-killing; unfunded projects tagged clearly.
- NGO expects an SLA / completion guarantee (Medium): the mandatory no-SLA acknowledgment at signup and every match acceptance; the Promise link per top-up → admin outreach; next-match priority.
- AI-code license/quality issues (Medium): MIT by default (Platform Promise); the first-match disclaimer carries the volunteer IP attestation (REQ-007, no v1 CLA); the NGO may open GitHub Issues on its repo post-completion (REQ-012); a remediation playbook is published.
- Regulators deem verification documents sensitive PII (Medium): restricted access; a DPA available → explicit consent + a data-minimization review.
- Fuel-cost inflation, Anthropic price rises (Medium): the percentage skim scales; changes communicated to NGOs in advance → a monthly rate-card adjustment.
- Lovable security incident hits the integration (Medium): exposure bounded — ai4good holds no member seat in NGO Lovable workspaces (build Tier-2 is fixtures-only) and volunteers use their own accounts → rotate volunteer credentials; pause Lovable recommendations until remediation is confirmed; in-flight projects continue on the fallback build path (REQ-021).

---
