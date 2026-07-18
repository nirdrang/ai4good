# AT-REQ-030 — Operations, Incident Response & Admin Correction Tooling

Source: requirements/req-030.md (prd-mvp.md REQ-030). Dependencies: REQ-006, REQ-009, REQ-016, REQ-023, REQ-032.

**Boundary note:** REQ-030 owns the ops model: on-call/escalation, the money dashboard, the no-monitoring posture, the runbooks/cards, automatic money corrections, and AUP-recovery documentation. The ledger's arithmetic invariants are REQ-006's; notification delivery REQ-016's; reference-file access REQ-032's; the daily founder READ is a human procedure (documented, not machine-asserted) — `[cross:]` here. The removed audited-reversal requirement needs no test: undoing enforcement is an ordinary admin ability, asserted nowhere as a special ceremony.

## A. Operating model

- **AT-030.01 (P0)** — Given the pilot operating model, When its documentation is inspected, Then the on-call owner (the founder) and a documented escalation tree exist; and Given an incident is opened, Then it exists as a first-class ops work item (queryable, with state), not a chat message or email.
- **AT-030.02 (P0)** — Given seeded money fixtures (a funding event, metered consumption, the platform share, a reconciliation run, and a chargeback), When the one v1 dashboard renders, Then it is the money dashboard and each of the five areas displays its fixture value; and no second operational dashboard exists (absence probe).
- **AT-030.03 (P0)** — Given the v1 monitoring posture, When probed, Then NO job-heartbeat surface, NO invariant pager, and NO operator-paging integration exists (three absence probes); and the stated detection paths exist: the money dashboard is readable, an induced error-rate spike raises the error-spike alert, and reconciliation runs without being manually invoked (controlled trigger).

## B. Runbooks & cards

- **AT-030.04 (P0)** — Given the v1 runbook set, When inspected, Then exactly three runbooks exist — backup restore (stating the 4-hour objective), gateway real-key rotation + mass virtual-key revocation, and Lovable outage fallback — and three one-page cards exist: credential-compromise break-glass, PM-tool outage degraded mode, and chargeback spike.
- **AT-030.05 (P0)** — Given a credential-compromise drill (sentinel fixtures), When the break-glass card is executed, Then in order: reference-file access is frozen (a fetch that succeeded before the freeze is rejected during it) [cross: REQ-032], the breach clock starts with the discovery time recorded, and money movement stays frozen until the Stripe-vs-fuel-ledger reconciliation for the window completes — only then does money movement unfreeze; and When the drill's PII-may-be-exposed branch is taken, Then the counsel/statutory-assessment step is recorded on the incident.

## C. Automatic money corrections

- **AT-030.06 (P0)** — Given a decidable ledger divergence (Stripe shows a top-up the ledger missed — fixture), When reconciliation runs, Then a balanced correction posts automatically with NO human step and NO correction UI in the path, traceable to its authoritative source (the Stripe record), and it appears on the money dashboard. [cross: AT-006 owns the ledger arithmetic]
- **AT-030.07 (P0)** — Given the three provider-truth authorities, When each divergence class is seeded (money-in vs Stripe including a chargeback; AI spend vs Anthropic billed cost; an internal pairing gap), Then each auto-conforms to ITS authority — Stripe wins money-in, Anthropic wins AI spend, pairing arithmetic closes the internal gap.
- **AT-030.08 (P0)** — Given every platform role including the platform admin, When each attempts a direct ledger write, Then each is rejected — the one guarded, idempotent, audited function is the only posting path; and When the same correction is submitted to that function twice (replay), Then exactly one posting results.
- **AT-030.09 (P0)** — Given a posted correction, When the founder's surfaces are probed, Then NO approval queue and NO pending-approval state exists anywhere — visibility only; and Given LARGE drift (above the configured threshold — fixture) and small drift (below), Then only the large drift additionally notifies the platform admin. [cross: REQ-016 owns delivery]
- **AT-030.10 (P0)** — Given undecidable drift (provider data MISSING, and separately SELF-CONTRADICTORY — two fixtures), When reconciliation runs, Then the books are untouched (ledger byte-identical before/after), the item surfaces on the money dashboard, and the platform admin is notified — never auto-resolved, never guessed.

## D. AUP recovery

- **AT-030.11 (P0)** — Given an AUP-deactivated account, When the documented recovery is followed, Then the account is manually re-enabled and its keys re-issued, and the re-issued keys work while the pre-deactivation keys stay dead. [cross: AT-007 owns the deactivation itself]

## Coverage map

| REQ-030 clause | Tests |
|---|---|
| On-call + escalation tree named; incidents first-class ops items | 01 |
| One v1 dashboard = money dashboard (funding/consumption/share/reconciliation/chargebacks); founder-read daily is a documented human procedure (not machine-asserted) | 02 |
| No monitoring framework (heartbeats/pagers/paging absent); detection = dashboard + error-spike alert + automatic reconciliation | 03 |
| Three runbooks (backup-4h, key rotation + mass revocation, Lovable outage) + three one-page cards | 04 |
| Credential-compromise card: freeze reference files → breach clock (discovery time; counsel/statutory if PII) → reconcile window before unfreezing money | 05 |
| Corrections fully automatic: no UI, no human step; balanced + traceable; dashboard-visible | 06 |
| Provider-truth hierarchy: Stripe money-in (incl. chargebacks), Anthropic AI spend, pairing arithmetic | 07 |
| One guarded idempotent audited posting function; direct writes revoked from every role | 08 |
| Visibility never approval; large drift → admin notification | 09 |
| Refusal-to-guess: undecidable drift untouched + surfaced + notified | 10 |
| AUP deactivation recovery documented and working (re-enable + re-issue) | 11 |
| Audited-reversal requirement REMOVED — ordinary admin ability, no test | — |
