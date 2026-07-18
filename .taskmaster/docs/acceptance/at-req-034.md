# AT-REQ-034 — Task-Level Attribution (telemetry, never gating)

Source: requirements/req-034.md (prd-mvp.md REQ-034, incl. d77 layered-Skill ceiling). Dependencies: REQ-004, REQ-006, REQ-009, REQ-013, REQ-026, REQ-028, REQ-033.

**Boundary note:** REQ-034 owns the telemetry classification, the binding/attribution semantics, the one usage log, the two-meter separation, the steering ceiling, and the aggregation boundary. The Skill's binding mechanics and its local pause are REQ-028's (d77); fuel money truth REQ-006/009's; the NGO dashboard surface REQ-013's — `[cross:]` here.

## A. Binding & soft degradation

- **AT-034.01 (P0)** — Given a metered request carrying a valid task binding and one carrying none, When both flow, Then BOTH are served; the bound request's row attributes to its task, the unbound row records "unattributed" — no resolvable binding is never a rejection reason.
- **AT-034.02 (P0)** — Given a SPOOFED/invalid binding (a task id from another project, and a nonexistent id — two fixtures), When each request flows, Then each is served and its row soft-degrades (recorded without false attribution to a real task of this project) — spoofable telemetry never becomes a gate, and falsely-attributed burn never lands on a real task.
- **AT-034.03 (P0)** — Given the taskless values, When a session starts without a task, Then "exploration" and "onboarding" are offered PROACTIVELY as first-class choices [cross: AT-028.07], and rows from such sessions carry the chosen bucket.
- **AT-034.04 (P0)** — Given an induced attribution failure of any kind (binding resolution error, log-degradation sentinel), When the metered request flows, Then the request itself is served — attribution failure degrades the DATA, never the request.

## B. The one usage log

- **AT-034.05 (P0)** — Given one metered request on each surface — a gateway volunteer request, a funded Discovery turn, and an assistant turn — When the log is read, Then each produced exactly ONE row, written in-line by its handling component (the gateway row by the gateway; the two direct rows by the platform backend), and each row carries: surface/actor, project, request id, provider status, and the provider's echoed token usage by category.
- **AT-034.06 (P0)** — Given the log rows and their schema, When inspected, Then no row holds request or response BODIES and no MONEY-denominated field exists anywhere in the log — metadata only, token-denominated only.
- **AT-034.07 (P0)** — Given the log, When its consumers are probed, Then attribution, the NGO burn views, and reconciliation are READS over it, and no subscriber/trigger reacts to row writes (append-only, nothing subscribes, never gates).

## C. Two meters, never mixed

- **AT-034.08 (P0)** — Given seeded token rows WITHOUT corresponding provider billed cost (sentinel), When the fuel meter renders, Then it is UNCHANGED — fuel derives from provider truth alone (billed cost + usage reporting), never from token math; and the attribution views display tokens with NO money figure anywhere.
- **AT-034.09 (P0)** — Given reconciliation, When it runs, Then it compares same-unit only: row token totals against the provider's usage reporting, and the money ledger against billed cost + Stripe — and NO cross-conversion path (a price table applied to attribution rows) exists (absence probe). [cross: AT-030.07 owns money-side conforming]

## D. Both billable surfaces & reconciliation of categories

- **AT-034.10 (P0)** — Given the direct surface, When a funded Discovery turn and an assistant turn complete, Then their rows carry the project and the first-class categories (Discovery; NGO assistant) — NGO-facing consumption is counted on the project and NEVER folded into build burn (the categories stay distinct from task/bucket attribution). [cross: AT-033.04]
- **AT-034.11 (P0)** — Given a fixture set of rows across tasks, taskless buckets, and direct categories on one project, When totals are computed, Then the sum of all attributed lines equals the project's total token usage — every metered request carries project + category, and the categories reconcile to the total.

## E. Steering ceiling (d77)

- **AT-034.12 (P0)** — Given the platform and gateway, When an otherwise-valid metered request arrives with any attribution state (bound, unbound, spoofed), Then forwarding is never gated for attribution reasons — steering is conversational nudging only; the ONE permitted pause is the Skill's own guided workflow [cross: AT-028.07/08], and a disabled Skill leaves requests flowing as unattributed [cross: AT-028.19].

## F. Aggregation boundary

- **AT-034.13 (P0)** — Given the NGO burn view, When it renders, Then burn appears per deliverable and per NGO-facing category, token-denominated, with exploration, onboarding, and unattributed as their OWN visible lines summing to the total (usage never hidden or folded into a task); and NO per-volunteer-per-task detail appears on any NGO surface.
- **AT-034.14 (P0)** — Given the coordinator-side view, When read, Then the per-project unattributed-% and binding-failure signals exist THERE and are absent from every NGO surface; and Given wide per-task burn variation (a 10x spread fixture), Then no anomaly flag or alert fires — expected data, not an anomaly (absence probe).

## Coverage map

| REQ-034 clause | Tests |
|---|---|
| Binding optional; unattributed recorded, never rejected | 01 |
| Spoofable + soft-degrading (invalid bindings never gate, never falsely attribute) | 02 |
| Exploration/onboarding first-class, offered proactively | 03 |
| Attribution failure never blocks a request | 04 |
| One log, one row per metered request, written in-line, full row schema | 05 |
| Metadata only — no bodies, no money fields (token-denominated) | 06 |
| Reads-only consumers; nothing subscribes; never gates | 07 |
| Two meters never mixed; money never from token math | 08 |
| Same-unit reconciliation only; no cross-conversion | 09 |
| Direct-surface project categories; never folded into build burn | 10 |
| All categories reconcile to project total | 11 |
| d77 ceiling: never gate forwarding; Skill-local pause only; disable → unattributed | 12 |
| NGO aggregation: per-deliverable + categories, honest buckets, totals reconcile, no per-volunteer detail | 13 |
| Coordinator-side signals; wide variation is not an anomaly | 14 |
| v1 = capture + NGO burn-per-deliverable view | 01–14 (capture) + 13 (view) |
