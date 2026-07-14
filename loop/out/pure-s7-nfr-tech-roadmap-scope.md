## Non-Functional Requirements

### Performance

- p95: marketplace page < 500ms at 100 RPS (re-validate pre-launch); Discovery first token < 1.5s; payment webhook < 2s end-to-end; code-hosting webhook < 5s end-to-end.
- Year 1: 1000 concurrent marketplace viewers (within the budgeted hosting tiers); 50 concurrent Discovery conversations (provider quota).
- Infrastructure budget ~$50/mo in year 1; re-baseline once the deployment architecture is chosen.

### Security

- Authentication and sessions are managed, with automatic refresh, and access ends on expiry or revocation. Tenant isolation covers NGO records, projects, fuel transactions, task comments, and project files; project-file access is time-bounded and granted only after a current-membership check. Rate limits apply to the auth, Discovery, and match-consent flows. Every inbound webhook is signature-verified.
- All provider keys (payment, LLM, code-hosting, work-tracking) are held as managed secrets and never logged. The real LLM key is never issued to volunteers; each volunteer holds an individual revocable credential.
- PII is minimum-necessary: verification documents are encrypted at rest and never public. GDPR: right-to-erasure (profile deleted, ledger anonymized) plus a standard DPA for EU NGOs. PCI is out of scope — all card data is handled by the processor.
- An append-only audit history (records cannot be altered or deleted) covers fuel transactions, project status transitions, role changes, volunteer AI-credential issuance/revocation, and work-tracking webhook-ingest provenance.

### Scalability

- Pilot: 100 NGOs, 200 volunteers, 50 active projects; year 1: 500 NGOs, 1000 volunteers, 200 active projects — within the budgeted tiers.
- The frontend, backend, and database scale to sustain these targets within budget; heavy and periodic work (webhook fan-out, outbox drain, scheduled scans, AI streaming) runs without blocking interactive traffic. Each project is isolated in its own Anthropic Workspace (REQ-009), so the provider's **100-workspaces-per-org cap** applies: workspaces are archived at completion/cancellation (archived ones don't count), so it binds only on concurrent in-flight projects; beyond that, projects spread across additional Anthropic orgs, with a cap lift negotiated once the platform has traction. Org-level provider rate/quota limits are also monitored.

### Reliability

- Uptime 99.5% (~3.6 hours/month). RTO 4 hours; RPO 24 hours.
- Application errors and logs are captured centrally with enough fidelity to investigate failures; alerts fire on error-rate spikes; and the gateway has actionable operator paging for availability, latency, and enforcement failures (REQ-029).

### Accessibility

- WCAG 2.1 AA; full keyboard navigation; automated checks per change plus a manual screen-reader pass pre-launch; contrast ≥ 4.5:1.

### Compatibility

- The last 2 versions of Chrome, Firefox, Safari, and Edge. Responsive web (mobile, tablet, desktop); no native apps. English only at launch (→ RM-46).

---

## Technical Considerations

**Fixed platform partners (product decisions):** Stripe (fuel payments), GitHub (repos and commit/PR ingest), Lovable (the build vehicle and durable home), Linear (the task system of record), and Anthropic/Claude Opus (the LLM). Volunteer builds reach Anthropic only through the LLM gateway on per-project virtual keys, and the gateway alone holds the real key (REQ-009); every volunteer request is metered against project fuel and cannot exceed available fuel or caps. Platform AI (Discovery and the assistant (REQ-033), both Opus) calls Anthropic directly. A volunteer's LLM path and task path are disjoint, touching only at the task-ID binding (REQ-034). Each project has one platform-owned Linear workspace that never transfers; the NGO sees a read-only mirror, status moves on PR merge via the GitHub integration, and out-of-band edits are auto-reverted with an explanatory comment (REQ-026). GitHub Issues are never written or managed by ai4good in v1 (REQ-008). The platform backend, Stripe, Anthropic, the gateway, and GitHub are hard dependencies with defined, user-visible degraded states; a Linear outage only stales the panel while volunteers keep working, and the mirror converges once Linear recovers. Greenfield; no data migration.

**Implementation stack — architecture-session decision:** the frontend framework, backend runtime, ORM, the object store for reference files (REQ-032), observability, CI/CD, and the gateway's hosting home (OD-6) are chosen in the architecture session; only the platform partners above are fixed.

**Implementation roadmap — build-plan pointer:** the phased plan (Foundation → Core MVP → Dashboards, Comms & Operations → Hardening → Public Beta + Concierge Launch), the effort estimate (~420h core / ~530h buffered, ~14–17 weeks for two engineers, plus 4–6 weeks of pilot operations), and per-phase exit criteria are maintained in the build plan; task decomposition lives in Linear.

---

## Out of Scope

1. **ai4good AI Proxy** — ships in v1 as the LLM gateway (REQ-009): token validation, the project-binding tripwire, governance-prompt injection, instant rotation, and per-request audit metadata (→ RM-5); budget and velocity limits are provider-enforced (workspace spend + rate limits, REQ-009); the real key is never exposed and bodies are never persisted. Default policy: allow message calls, token counting, file upload, and model listing; block persistent-resource endpoints and all DELETEs; batch submission is per-project opt-in (→ RM-47). It cannot verify prompt relevance, machine-lock a token, or stop a determined token holder — the provider limits and rotation bound the damage. Hosting open (OD-6).
2. **Crypto / on-chain tokens** — fuel is Stripe-backed fiat credits only; no tradeable token, no on-chain ledger.
3. **Native mobile apps** — web-responsive only; iOS/Android not on the roadmap.
4. **i18n / multi-language UI** — English only at launch.
5. **Multi-volunteer teams per project** — one volunteer per project in v1 (→ RM-13).
6. **Embedded IDE / web-based code editor** — volunteers bring their own Claude Code / Lovable.
7. **NGO-to-NGO tool sharing marketplace** — repos are public; no curated fork experience.
8. **Anonymous / unvetted NGOs publishing** — founder-vetting is required in v1 (→ RM-6).
9. **Automated NGO verification** — manual admin review in v1.
10. **Hosted production environment for built tools** — the volunteer/NGO choose deployment.
11. **Public star ratings for volunteers** — reputation is completion credit plus badges; NGO satisfaction stays private, never displayed (→ RM-24).
12. **Platform skim on tips** — tips (REQ-022) flow NGO→volunteer with a 0% cut.
13. **Pay-gated Discovery in v1** — a free daily per-NGO allowance (10/day unverified, 30/day verified; resets 00:00 UTC, no rollover); when exhausted the NGO verifies, funds fuel to continue immediately (REQ-006), or waits; funded projects draw on fuel from the outset ("Funded → all-$"); amounts are revisited if abuse exceeds the grant.
13a. **Paid "Discovery wallet"** — out for v1 and v1.5; the post-allowance path is a regular project-fuel purchase (single-pot).
14. **ai4good-funded Lovable infrastructure** — the NGO owns and pays for its Lovable workspace, never billed against fuel; the platform caps orchestrated Lovable calls per task (estimate-based, REQ-028) and reads the workspace-level credit status through its monitoring account (REQ-021); it never meters Lovable's actual billing.
15. **Multi-tool fuel metering** — fuel covers Anthropic (Claude Code) only; other tools are NGO-direct or volunteer-personal unless they ship metering-compatible APIs.
16. **Lovable credit reselling through ai4good** — NGOs buy from Lovable directly; a deep-linked "top up" route only (→ RM-28).
17. **Service-level agreements / completion guarantees** — none: ghosting, fuel burn without a deliverable, and infeasible scopes are all possible; the platform bounds financial risk (per-project fuel caps) and surfaces stalls but never underwrites.
18. **Closed-source / proprietary builds** — MIT (or a compatible permissive license) by default; closed-source is not served.
19. **Fuel-spend insurance / refund-on-no-deliverable** — consumed fuel is non-refundable even if nothing ships; NGOs are warned at every top-up.
20. **Fully-automated Anthropic workspace + key provisioning** — now IN v1 (REQ-009): each project's Anthropic Workspace and its workspace-scoped key are created via the provider Admin API at kickoff and archived at completion/cancellation (no manual console ops).
21. **Per-request prompt/response content capture** — permanently out (privacy posture): metadata only (tokens, model, timestamps, cost); bodies are never persisted; deliberate and on record.
22. **Anthropic-side budget enforcement** — now USED (REQ-009): the per-workspace provider spend limit is the hard fuel ceiling; the gateway adds governance and audit on top — it does not gate.
23. **OpenTelemetry prompt-content export from Claude Code** — ai4good never requests, processes, or aggregates volunteer prompt-content telemetry; independent OTel is allowed.
24. **v1 keeps, in place of the earlier deferrals:** per-IP/per-surface throttles (not full rate-limiting); an allow-list + don't-advertise + waitlist page (not gradual rollout); a handful of internal reports (not an analytics dashboard); secret-scanning + push-protection (REQ-031, not a takedown UI); automated tax calculation + hosted invoices + a tax-ID field (not multi-jurisdiction registration); and consent + a sub-processor list + a manual erasure runbook (not a self-serve GDPR erasure/export UI; no EU/public signup until self-serve) (→ RM-36, RM-48). The multi-org Anthropic router is retired.
25. **Automated PII / secret pre-scan on uploaded reference files (REQ-032)** — v1 is governance-by-disclosure: the NGO acknowledges the data-responsibility rule; no scan (→ RM-37).
26. **Automated spend-anomaly detection engine (REQ-009)** — v1 uses deterministic loss caps (no cash-out, the $200 first-fund cap, the provider-enforced workspace spend + rate limits), the NGO's instant "revoke access now," and daily human money-dashboard review (→ RM-5).

---
