# AT-REQ-034 — Task-Level Attribution (telemetry, never gating)

> **[d82 AMENDED — two-tree model + requirement-level granularity, 2026-07-19]:** this suite now tests attribution at the PM-TREE REQUIREMENT level (REQ-026): bindings target pulled requirement items, never dev-tree items; burn and baselines are per-requirement; the recorded granularity IS the NGO-displayed granularity. Task-level assertions were retargeted; the per-volunteer-per-task coordinator detail was retired with the granularity.

Source: requirements/req-034.md (prd-mvp.md REQ-034, incl. d77 layered-Skill ceiling). Dependencies: REQ-004, REQ-006, REQ-009, REQ-013, REQ-026, REQ-028, REQ-033.

**Boundary note:** REQ-034 owns the telemetry classification, the binding/attribution semantics, the one usage log, the two-meter separation, the steering ceiling, and the aggregation boundary. The Skill's binding mechanics and its local pause are REQ-028's (d77); fuel money truth REQ-006/009's; the NGO dashboard surface REQ-013's — `[cross:]` here.

## A. Binding & soft degradation

- **AT-034.01 (P0)** — Given a metered request carrying a valid binding to a pulled PM-tree requirement and one carrying none, When both flow, Then BOTH are served; the bound request's row attributes to its task, the unbound row records "unattributed" — no resolvable binding is never a rejection reason.
- **AT-034.02 (P0)** — Given an UNRESOLVABLE binding (a requirement item from another project, and a nonexistent item — two fixtures), When each request flows, Then each is served and its row is recorded EXACTLY as "unattributed" with NO task association stored; and Given a RESOLVABLE but dishonest binding (a real task of this project the work does not belong to — third fixture), Then the request is served and the row records against THAT requirement — the telemetry is spoofable by design and never a gate; no truth-checking layer is asserted. [cx: unattributed pinned] [cx r2: unresolvable vs spoofed separated — the false-attribution-never-lands guarantee contradicted "spoofable"]
- **AT-034.03 (P0)** — Given the taskless values, When a session starts without a task, Then "exploration" and "onboarding" are offered PROACTIVELY as first-class choices [cross: AT-028.07], and rows from such sessions carry the chosen bucket.
- **AT-034.04 (P0)** — Given an induced attribution failure of any kind (binding resolution error, log-degradation sentinel), When the metered request flows, Then the request itself is served — attribution failure degrades the DATA, never the request.

## B. The one usage log

- **AT-034.05 (P0)** — Given one metered request on each surface — a gateway volunteer request, a funded Discovery turn, and an assistant turn — plus a controlled NON-SUCCESS provider response on the gateway and on a direct handler (five fixtures), When the log is read, Then each produced exactly ONE row carrying: surface/actor, project, request id, the ACTUAL provider status (including the non-success statuses), and the provider's echoed token usage as supplied by the fixture; and with background workers/event delivery PAUSED, each row exists BEFORE its request handler returns, the instrumented writer identity is the handling component itself (gateway row by the gateway; direct rows by the platform backend), and an absence probe finds NO second usage store and NO usage-event publication. [cx r2: provider-failure rows tested; in-line/single-log made observable — an async queue or shadow log could have passed]
- **AT-034.06 (P0)** — Given the log rows and their schema, When inspected, Then no row holds request or response BODIES and no MONEY-denominated field exists anywhere in the log — metadata only, token-denominated only.
- **AT-034.07 (P0)** — Given the log, When its consumers are probed, Then attribution, the NGO burn views, and reconciliation are READS over it and no subscriber/trigger reacts to row writes; and Given an existing recorded row, When update, overwrite, and deletion are each attempted (three probes), Then each is rejected and the original row is byte-unchanged — append-only proven by negative, not asserted. [cx: append-only had no mutation-attempt test]

## C. Two meters, never mixed

- **AT-034.08 (P0)** — Given seeded ATTRIBUTION-LOG rows while both provider snapshots — Anthropic billed cost AND usage reporting — are held constant (controlled fixtures), When the fuel meter renders, Then it is UNCHANGED — fuel is never derived from attribution-log rows or per-request attribution token math (the PRD-required pricing of the provider's own usage REPORT at official rates, REQ-006/009, is a different, permitted path); the positive mapping — provider truth moves the meter — is owned by the fuel suites [cross: AT-010.14/AT-006.48]; the Lovable credit status likewise does not move on attribution-row writes, its positive mapping owned by AT-021; and the attribution views display tokens with NO money figure anywhere. [cx] [cx r2: "never from token math" scoped to attribution rows — REQ-009's provisional gauge prices the provider report; positive mappings delegated to their owning P0 tests]
- **AT-034.09 (P0)** — Given reconciliation, When it runs, Then it compares same-unit only: row token totals against the provider's usage reporting, and the money ledger against billed cost + Stripe — and NO cross-conversion path (a price table applied to attribution rows) exists (absence probe). [cross: AT-030.07 owns money-side conforming]

## D. Both billable surfaces & reconciliation of categories

- **AT-034.10 (P0)** — Given the direct surface, When a funded Discovery turn and an assistant turn complete, Then their rows carry the project and the first-class categories (Discovery; NGO assistant) — NGO-facing consumption is counted on the project and NEVER folded into build burn (the categories stay distinct from task/bucket attribution). [cross: AT-033.04]
- **AT-034.11 (P0)** — Given a fixture set of rows across pulled requirements, taskless buckets, and direct categories on one project, When totals are computed, Then the sum of all attributed lines equals the project's total token usage — every metered request carries project + category, and the categories reconcile to the total.

## E. Steering ceiling (d77)

- **AT-034.12 (P0)** — Given the platform and gateway, When an otherwise-valid metered request arrives with any attribution state (bound, unbound, spoofed), Then forwarding is never gated for attribution reasons — steering is conversational nudging only; the ONE permitted pause is the Skill's own guided workflow [cross: AT-028.07/08]; and Given the Skill is disabled MID-SESSION during an active guided pause, Then the very next otherwise-valid request flows IMMEDIATELY — no residual pause, no penalty — recorded as unattributed. [cx: "immediate" was untested]
- **AT-034.16 (P0)** — Given an exploration-bucket session in which implementation intent appears (edits toward a known task's scope — fixture), When the conversational steering acts, Then a NON-BLOCKING nudge to select the matching requirement is shown, and When the nudge is NOT followed, Then forwarding remains fully available — nudged, never enforced. [cx r2: added — the nudge clause itself had no test; the Skill-local pause layer is AT-028.08's] [cross: AT-028.08]

## F. Aggregation boundary

- **AT-034.13 (P0)** — Given the NGO burn view, When it renders, Then burn appears per REQUIREMENT and per NGO-facing category, token-denominated, with exploration, onboarding, and unattributed as their OWN visible lines summing to the total (usage never hidden or folded into a requirement); no finer-than-requirement detail EXISTS to appear anywhere — recorded granularity equals displayed granularity (probe: the log itself holds no dev-item field); and the rendered view carries NO celebratory copy, badge, animation, or equivalent success treatment — data only. [cx: the no-celebration clause had no assertion]
- **AT-034.14 (P0)** — Given the coordinator-side view, When read, Then it exposes the per-project unattributed-% and binding-failure signals — both absent from PUBLIC and other non-coordinator surfaces (volunteer-by-task detail is RETIRED with d82's granularity; no such data exists); and Given wide per-requirement burn variation (a 10x spread fixture), Then no anomaly flag or alert fires — expected data, not an anomaly (absence probe). [cx: coordinator access proven] [cx r2: NGO-absence duplication with .13 removed]
- **AT-034.15 (P0)** — Given seeded burn history across several REQUIREMENTS, When the per-requirement baseline is computed/read, Then it exists, its values derive from the seeded token history, and its displayed units are TOKENS with no currency conversion anywhere in the computation or display. [cx: added — "per-task baselines are token-based" had no test]

## Coverage map

| REQ-034 clause | Tests |
|---|---|
| Binding optional; unattributed recorded, never rejected | 01 |
| Soft-degrading (unresolvable → exactly "unattributed") + SPOOFABLE (resolvable-but-dishonest records, never gates) | 02 [cx r2] |
| Exploration/onboarding first-class, offered proactively | 03 |
| Attribution failure never blocks a request | 04 |
| One log, one row per metered request incl. provider non-success; in-line write + writer identity + no-second-store proven | 05 [cx r2] |
| Metadata only — no bodies, no money fields (token-denominated) | 06 |
| Reads-only consumers; nothing subscribes; APPEND-ONLY proven by mutation rejection | 07 [cx] |
| Two meters never mixed; money never from ATTRIBUTION-ROW token math (provider-report pricing permitted per REQ-006/009; positive mappings → AT-010.14/006.48/021); per-requirement baselines token-based | 08 [cx r2], 15 [cx] |
| Same-unit reconciliation only; no cross-conversion | 09 |
| Direct-surface project categories; never folded into build burn | 10 |
| All categories reconcile to project total | 11 |
| d77 ceiling: never gate forwarding; Skill-local pause only; disable IMMEDIATE mid-session → unattributed; conversational nudge shown + ignorable | 12 [cx], 16 [cx r2] |
| NGO aggregation: per-deliverable + categories, honest buckets, totals reconcile, no per-volunteer detail, NO celebration | 13 [cx] |
| Coordinator-side signals only (volunteer-by-task detail retired, d82); wide variation is not an anomaly | 14 [cx r2] |
| v1 = capture + NGO burn-per-deliverable view | 01–16 (capture) + 13 (view) |
