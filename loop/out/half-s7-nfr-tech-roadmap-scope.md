## Non-Functional Requirements

### Performance

- p95: marketplace page < 500ms (re-validate pre-launch); Discovery first token < 1.5s; payment webhook < 2s; code-hosting webhook < 5s.
- Year 1: 1000 concurrent marketplace viewers; 50 concurrent Discovery conversations (provider quota).
- Infrastructure ~$50/mo year 1; re-baseline for the two-target deploy.

### Security

- Managed auth + session refresh. Tenant isolation: NGO records, projects, fuel transactions, task comments, project files. Rate limits: auth, discovery, match-consent. Signature-verify every inbound webhook.
- Provider keys (payment, LLM, code-hosting, work-tracking): managed secrets, never logged. The real LLM key never issued to volunteers; individual revocable credentials (decision-21).
- PII minimum-necessary: verification docs encrypted at rest, never public. GDPR: right-to-erasure (profile deleted, ledger anonymized) + EU-NGO DPA. PCI out of scope (processor holds card data).
- Append-only audit: fuel transactions, status transitions, role changes, AI-credential issuance/revocation, webhook-ingest provenance.

### Scalability

- Pilot: 100 NGOs, 200 volunteers, 50 active projects; year 1: 500 NGOs, 1000 volunteers, 200 active projects — within budgeted tiers.
- Managed auto-scaling; heavy work (webhook fan-out, outbox drain, scheduled scans, AI streaming) on managed functions; standalone compute only past function limits.

#### Anthropic workspace-cap scale path — RETIRED by decision-21

- Per-project workspaces gone; the cap never binds. Org-level rate/quota limits monitored.

### Reliability

- Uptime 99.5% (~3.6 hours/month). RTO 4 hours; RPO 24 hours (point-in-time recovery).
- Central error/log capture; alerts on error-rate spikes.

### Accessibility

- WCAG 2.1 AA; full keyboard navigation; automated checks per change + a manual screen-reader pass pre-launch; contrast >= 4.5:1.

### Compatibility

- Last 2 versions: Chrome, Firefox, Safari, Edge. Responsive web; no native apps. English only at launch (→ RM-46).

---

## Technical Considerations

### System Architecture

Lovable-owned frontend; Supabase backend; Stripe fuel payments; GitHub App (repos, commit/PR ingest); Linear = task system of record; Anthropic = LLM. Volunteer builds reach Anthropic only via the LLM gateway on per-project virtual keys (REQ-009, decision-21); the gateway alone holds the real key; hosting open (OD-6). Platform AI (Discovery + assistant REQ-033, both Opus, decision-13) calls Anthropic directly. Volunteer LLM and task paths disjoint; sole touchpoint: task-ID binding (REQ-034). One platform-owned Linear workspace per project (decision-20), never transferred; NGO panel = read-only mirror; status moves on PR merge; out-of-band edits auto-reverted with comment (REQ-026). GitHub Issues dev-internal (REQ-008). Hard dependencies with defined degraded states: Supabase, Stripe, Anthropic, gateway, GitHub; a Linear outage only stales the panel. Greenfield; no migration.

### Technology Stack

- Frontend: TanStack Start (SSR) — React, TanStack Router + Query, Tailwind CSS, shadcn/ui; Lovable owns/syncs the repo.
- Backend: Supabase — Postgres + RLS, Auth, Storage, Realtime, Edge Functions (Deno), pg_cron; Drizzle ORM.
- Attachments: Cloudflare R2 (REQ-032); short-TTL signed URLs after membership check only.
- Payments: Stripe — Checkout, webhooks, Stripe Tax (EU VAT invoices).
- AI: Anthropic — Opus (decision-13); volunteer traffic only via gateway virtual keys (decision-21).
- Task coordination: Linear — one free workspace per project, pre-created pool (creation manual, no API); webhooks feed the mirror; agents via Linear MCP.
- VCS: GitHub App — org/repo setup, push/PR ingest (cadence stats, commit-to-task linkage).
- Observability: Sentry, Axiom or Logflare, Lovable analytics; golden-signal gateway paging (REQ-029).
- CI/CD: GitHub Actions (test/lint); frontend deploys via Lovable, backend via Supabase CLI.

---

## Implementation Roadmap

**Headline estimate (post decisions 20/21/22 — authoritative): ≈ ~420h core / ~530h buffered → ~14-17 weeks for 2 engineers.** Plus 4-6 weeks pilot operations (3 internal full-cycle projects): public beta in ~5 months (2 engineers), ~7-8 months (one).

Holds only with the §11 cuts; decomposition lives in Linear (decision-20); phases = overview.

- **Phase 1 — Foundation (weeks 1-3):** Auth, NGO org profile + audited founder-vetted action (decision-29/r3), volunteer profiles, logging baseline; nothing public. Exit: test NGO + volunteer complete profiles; admin vets NGO.
- **Phase 2 — Core MVP (weeks 4-7):** One project end-to-end: intake → credit-metered Discovery → editable scope → publish → triage screener → public listing → concierge enforce-match + consent (decision-28) → **fund-on-match** → repo + workspace provisioning → PRD bootstrap task + completion gate (decision-25) → fuel-metered build with fuel-low blockers → live-URL deploy → handoff with attribution. Exit: a real NGO + volunteer reach a deployed live URL; handoff ritual executed.
- **Phase 3 — Dashboards, Comms & Platform Operations (weeks 8-10):** v1-minimal dashboards, comment thread, notifications, admin audit viewer, observability + alerting, incident response, automatic ledger reconciliation (decision-31), content moderation, abandonment/rematch; §11 items out. Exit: 3 pilot NGOs + 5 pilot volunteers fully in-platform; an injected money error auto-corrects, books balanced.
- **Phase 4 — Hardening & Beta Launch (weeks 11-13):** Coverage to 80%, end-to-end journey tests, accessibility fixes, vulnerability/pen review, tax/VAT invoicing, GDPR erasure, rate limiting, performance pass, onboarding emails, public landing page. Exit: no critical pen-test findings; p95 marketplace < 500ms at 100 RPS; accessibility checks pass in CI.
- **Phase 5 — Public Beta & Concierge Launch (weeks 14-16):** Launch checklist, invite-only → open rollout, goals analytics, concierge supply-funnel tooling, aging nudges, hand-match tool (first ~10-15 projects), v1.5 spec + retrospective. Exit: 10+ projects in flight; ≥1 public-beta handoff; ≥1 handoff reachable at its live URL 30 days later.

---

## Out of Scope

1. **ai4good AI Proxy** — ships in v1 as the LLM gateway (decision-21, REQ-009): token validation, velocity/budget caps, real-time fuel check, instant rotation, fingerprint tripwire, governance-prompt injection, per-request audit metadata (timestamp, IP, User-Agent, endpoint, payload size, Anthropic cost, fuel delta → RM-5); real key never exposed; bodies never persisted. Default policy: allow message calls, token counting, file upload, model listing; block persistent-resource endpoints + all DELETEs; batch per-project opt-in (→ RM-47). Cannot verify prompt relevance, machine-lock a token, or stop a determined token holder — caps + rotation bound damage. Hosting open (OD-6).
2. **Crypto / on-chain tokens** — fuel = Stripe-backed fiat only.
3. **Native mobile apps** — web-responsive only.
4. **i18n / multi-language UI** — English only at launch.
5. **Multi-volunteer teams per project** — one volunteer per project (→ RM-13).
6. **Embedded IDE / web-based code editor** — volunteers bring their own Claude Code / Lovable.
7. **NGO-to-NGO tool sharing marketplace** — repos public; no curated fork experience.
8. **Anonymous / unvetted NGOs publishing** — founder-vetting required (→ RM-6).
9. **Automated NGO verification** — manual admin review in v1.
10. **Hosted production environment for built tools** — volunteer/NGO choose deployment.
11. **Public star ratings for volunteers** — reputation = completion credit + badges; NGO satisfaction private, never displayed (→ RM-24).
12. **Platform skim on tips** — tips (REQ-022): NGO→volunteer, 0% cut.
13. **Pay-gated Discovery in v1** — free daily per-NGO allowance (10/day unverified, 30/day verified; resets 00:00 UTC, no rollover — decisions 8/11); exhausted: verify, fund fuel — continues immediately (REQ-006) — or wait; funded projects draw on fuel from the outset ("Funded → all-$"); amounts revisitable on abuse.
13a. **Paid "Discovery wallet"** — out v1 + v1.5 (decision-8); post-allowance = regular project-fuel purchase (single-pot).
14. **ai4good-funded Lovable infrastructure** — the NGO owns/pays its Lovable workspace; never billed against fuel; the platform does meter/cap per-task usage and surface the NGO's balance (REQ-021/028).
15. **Multi-tool fuel metering** — fuel = Anthropic (Claude Code) only.
16. **Lovable credit reselling through ai4good** — NGOs buy from Lovable directly; deep-linked "Top up" CTA only (→ RM-28).
17. **Service-level agreements / completion guarantees** — none: ghosting, fuel burn sans deliverable, infeasible scopes possible; the platform bounds financial risk (per-project fuel caps), surfaces stalls, never underwrites.
18. **Closed-source / proprietary builds** — MIT (or compatible permissive) default; closed-source not served.
19. **Fuel-spend insurance / refund-on-no-deliverable** — consumed fuel non-refundable even if nothing ships; NGOs warned at every top-up.
20. **Fully-automated Anthropic key provisioning** — moot (decision-21): virtual keys auto-issued at kickoff.
21. **Per-request prompt/response content capture** — permanently out (privacy posture): metadata only; bodies never persisted; deliberate, on record.
22. **Anthropic-side "agent budget" enforcement** — moot (decision-21): enforcement structural at the gateway.
23. **OpenTelemetry prompt-content export from Claude Code** — ai4good never requests/processes/aggregates volunteer prompt-content telemetry; independent OTel allowed.
24. **v1 keeps in place of the decision-10 deferrals** — per-IP/per-surface throttles (not full rate-limiting); allow-list + don't-advertise + waitlist page (not gradual rollout); internal reports (not analytics dashboard); secret-scanning + push-protection (REQ-031, not takedown UI); tax calculation + hosted invoices + tax-ID field (not multi-jurisdiction registration); consent + sub-processor list + manual erasure runbook (not self-serve GDPR erasure/export UI; no EU/public signup until self-serve) (→ RM-36, RM-48). Multi-org Anthropic router retired (decision-21).
25. **Automated PII / secret pre-scan on uploaded reference files (REQ-032)** — v1 = governance-by-disclosure: the NGO acknowledges the data-responsibility rule; no scan (→ RM-37).
26. **Automated spend-anomaly detection engine (REQ-009)** — v1: deterministic loss caps (no cash-out, $200 first-fund cap, per-key caps + fuel gate), NGO instant "revoke access now", daily money-dashboard review (→ RM-5).

---
