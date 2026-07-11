## Non-Functional Requirements

### Performance

- p95: marketplace page < 500ms (re-validate pre-launch); Discovery first token < 1.5s; payment webhook < 2s end-to-end; code-hosting webhook < 5s end-to-end.
- Year 1: 1000 concurrent marketplace viewers (within the budgeted hosting tiers); 50 concurrent Discovery conversations (provider quota).
- Infrastructure budget ~$50/mo in year 1; re-baseline for the two-target deploy.

### Security

- Authentication and sessions are managed, with automatic refresh, and access ends on expiry or revocation. Tenant isolation covers NGO records, projects, fuel transactions, task comments, and project files. Rate limits apply to the auth, Discovery, and match-consent flows. Every inbound webhook is signature-verified.
- All provider keys (payment, LLM, code-hosting, work-tracking) are held as managed secrets and never logged. The real LLM key is never issued to volunteers; each volunteer holds an individual revocable credential.
- PII is minimum-necessary: verification documents are encrypted at rest and never public. GDPR: right-to-erasure (profile deleted, ledger anonymized) plus a standard DPA for EU NGOs. PCI is out of scope — all card data is handled by the processor.
- A tamper-evident audit history covers fuel transactions, project status transitions, role changes, volunteer AI-credential issuance/revocation, and work-tracking webhook-ingest provenance.

### Scalability

- Pilot: 100 NGOs, 200 volunteers, 50 active projects; year 1: 500 NGOs, 1000 volunteers, 200 active projects — within the budgeted tiers.
- The frontend, backend, and database scale to sustain these targets within budget; heavy and periodic work (webhook fan-out, outbox drain, scheduled scans, AI streaming) runs without blocking interactive traffic. Per-project provider workspaces do not exist, so no provider workspace cap binds; org-level provider rate/quota limits are monitored.

### Reliability

- Uptime 99.5% (~3.6 hours/month). RTO 4 hours; RPO 24 hours.
- Application errors and logs are captured centrally with enough fidelity to investigate failures; alerts fire on error-rate spikes.

### Accessibility

- WCAG 2.1 AA; full keyboard navigation; automated checks per change plus a manual screen-reader pass pre-launch; contrast ≥ 4.5:1.

### Compatibility

- The last 2 versions of Chrome, Firefox, Safari, and Edge. Responsive web (mobile, tablet, desktop); no native apps. English only at launch (→ RM-46).

---

## Technical Considerations

**Fixed platform partners (product decisions):** Stripe (fuel payments), GitHub (repos and commit/PR ingest), Lovable (the build vehicle and durable home), Linear (the task system of record), and Anthropic/Claude Opus (the LLM). Volunteer builds reach Anthropic only through the LLM gateway on per-project virtual keys, and the gateway alone holds the real key (REQ-009); platform AI (Discovery and the assistant, both Opus) calls Anthropic directly. A volunteer's LLM path and task path are disjoint, touching only at the task-ID binding (REQ-034). Each project has one platform-owned Linear workspace that never transfers; the NGO sees a read-only mirror, status moves on PR merge via the GitHub integration, and out-of-band edits are auto-reverted with an explanatory comment (REQ-026). GitHub Issues are never written or managed by ai4good in v1 (REQ-008). The platform backend, Stripe, Anthropic, the gateway, and GitHub are hard dependencies with defined, user-visible degraded states; a Linear outage only stales the panel while volunteers keep working. Greenfield; no data migration.

**Implementation stack — architecture-session decision:** the frontend framework, backend runtime, ORM, the object store for reference files (REQ-032), observability, CI/CD, and the gateway's hosting home (OD-6) are chosen in the architecture session; only the platform partners above are fixed.

**Implementation roadmap — build-plan pointer:** the phased plan (Foundation → Core MVP → Dashboards, Comms & Operations → Hardening → Public Beta + Concierge Launch), the effort estimate (~420h core / ~530h buffered, ~14–17 weeks for two engineers, plus 4–6 weeks of pilot operations), and per-phase exit criteria are maintained in the build plan; task decomposition lives in Linear.

---

## Out of Scope

1. **ai4good AI Proxy** — ships in v1 as the LLM gateway (REQ-009): token validation, velocity + budget caps, a real-time fuel check, instant rotation, a fingerprint tripwire, governance-prompt injection, and per-request audit metadata (→ RM-5); the real key is never exposed and bodies are never persisted. Default policy: allow message calls, token counting, file upload, and model listing; block persistent-resource endpoints and all DELETEs; batch submission is per-project opt-in (→ RM-47). It cannot verify prompt relevance, machine-lock a token, or stop a determined token holder — caps and rotation bound the damage. Hosting open (OD-6).
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
14. **ai4good-funded Lovable infrastructure** — the NGO owns and pays for its Lovable workspace, never billed against fuel; the platform does meter/cap per-task usage and surface the NGO's Lovable credit balance during orchestration (REQ-021/028).
15. **Multi-tool fuel metering** — fuel covers Anthropic (Claude Code) only; other tools are NGO-direct or volunteer-personal unless they ship metering-compatible APIs.
16. **Lovable credit reselling through ai4good** — NGOs buy from Lovable directly; a deep-linked "top up" route only (→ RM-28).
17. **Service-level agreements / completion guarantees** — none: ghosting, fuel burn without a deliverable, and infeasible scopes are all possible; the platform bounds financial risk (per-project fuel caps) and surfaces stalls but never underwrites.
18. **Closed-source / proprietary builds** — MIT (or a compatible permissive license) by default; closed-source is not served.
19. **Fuel-spend insurance / refund-on-no-deliverable** — consumed fuel is non-refundable even if nothing ships; NGOs are warned at every top-up.
20. **Fully-automated Anthropic key provisioning** — moot: no per-project Anthropic keys exist; virtual keys auto-issue at kickoff.
21. **Per-request prompt/response content capture** — permanently out (privacy posture): metadata only (tokens, model, timestamps, cost); bodies are never persisted; deliberate and on record.
22. **Anthropic-side "agent budget" enforcement** — moot: enforcement is structural at the gateway.
23. **OpenTelemetry prompt-content export from Claude Code** — ai4good never requests, processes, or aggregates volunteer prompt-content telemetry; independent OTel is allowed.
24. **v1 keeps, in place of the earlier deferrals:** per-IP/per-surface throttles (not full rate-limiting); an allow-list + don't-advertise + waitlist page (not gradual rollout); a handful of internal reports (not an analytics dashboard); secret-scanning + push-protection (REQ-031, not a takedown UI); automated tax calculation + hosted invoices + a tax-ID field (not multi-jurisdiction registration); and consent + a sub-processor list + a manual erasure runbook (not a self-serve GDPR erasure/export UI; no EU/public signup until self-serve) (→ RM-36, RM-48). The multi-org Anthropic router is retired.
25. **Automated PII / secret pre-scan on uploaded reference files (REQ-032)** — v1 is governance-by-disclosure: the NGO acknowledges the data-responsibility rule; no scan (→ RM-37).
26. **Automated spend-anomaly detection engine (REQ-009)** — v1 uses deterministic loss caps (no cash-out, the $200 first-fund cap, per-key caps + the fuel gate), the NGO's instant "revoke access now," and daily human money-dashboard review (→ RM-5).

---
