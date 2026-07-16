# AT-REQ-006 — Stripe Fuel Top-Up & Ledger

Source: requirements/req-006.md (prd-mvp.md REQ-006 + Promise §3/§7/§9). Dependencies: REQ-001, REQ-002, REQ-004, REQ-008, REQ-009.

**Boundary note:** REQ-006 owns money-in (Stripe), the ledger and its balances, the platform-share recognition rule, the acknowledgment cadence and content gates (per AT-REQ-001's boundary, identity capture on acknowledgments is owned by REQ-001), unused-fuel credit rules, and chargebacks. State transitions the money triggers are owned by REQ-005.5; provider-side spend enforcement and thresholds mechanics by REQ-009; Discovery money routing by REQ-004; attribution telemetry by REQ-034 — all appear here only as `[cross:]` firings.

## A. Checkout & crediting

- **AT-006.01 (P0)** — Given an NGO funding a project, When it pays via Stripe Checkout, Then the payment is a one-time charge — no subscription or recurring-billing object is created anywhere.
- **AT-006.02 (P0)** — Given a $100 top-up directed at a project, When payment settles, Then the project's fuel balance increases by exactly $100 — the full gross amount, with no upfront platform deduction.
- **AT-006.03 (P0)** — Given the NGO chooses its general balance at checkout, When payment settles, Then the general balance increases by the full gross amount and no project balance changes.
- **AT-006.04 (P0)** — Given a project in `draft`, When the NGO tops it up, Then the payment succeeds — fuel is fundable from `draft` onward. [cross: REQ-005.5]
- **AT-006.05 (P0)** — Given a funded project that never consumes, When it is later cancelled, Then the NGO's general balance receives the full funded amount and the ledger contains zero platform-share rows for that project — the platform earned nothing. [Promise §3/§7]
- **AT-006.06 (P0)** — Given a project with a consented match and no prior payment of any kind by this NGO, When match funding is its first-ever payment, Then it succeeds — either funding moment can be first. [cross: REQ-004 owns Discovery-funding routing]

## B. Platform-share recognition

- **AT-006.07 (P0)** — Given a funded project, When the provider bills $X of consumption, Then the ledger books a platform share of exactly 15% of $X at consumption time, and before any consumption no share row exists.
- **AT-006.08 (P0)** — Given the share configuration changes from 15% to a sentinel value mid-project, When the ledger is read, Then every consumption row booked before the change still carries 15% (locked per consumption, never retroactive) and only consumption after the change carries the new rate.
- **AT-006.09 (P0)** — Given consumption by the NGO in Discovery, by the NGO via the post-funding project assistant, and by the volunteer building, When the ledger is read, Then each consumption row carries its distinct kind label (Discovery / assistant / build) and all three kinds carry the same share percentage. [cross: REQ-033]

## C. Match-to-fund flow

- **AT-006.10 (P0)** — Given a `matched_pending_fuel` project whose per-match acknowledgment is not yet submitted, When the NGO attempts to reach funding checkout, Then it is blocked — the acknowledgment gate precedes the funding CTA.
- **AT-006.11 (P0)** — Given the per-match acknowledgment copy, When it renders, Then it contains every mandated element: it names the volunteer; states the platform is a coordination layer with no obligation to deliver a finished tool; states fuel funds AI compute and may be consumed without a viable deliverable; states fuel is non-cash credit, not cash-refundable, with unused fuel remaining credit for the NGO's projects; states the data tier and NGO data responsibility (Tier-2 = fixtures-only); and states the chosen amount is the hard maximum exposure.
- **AT-006.12 (P0)** — Given the acknowledgment is submitted, When the record is read, Then it is stored per match with timestamp and IP. [cross: REQ-001 owns name/title/authority capture]
- **AT-006.13 (P0)** — Given Lovable is recommended for the project, When the acknowledgment renders, Then it carries the Lovable setup reminder.
- **AT-006.14 (P0)** — Given the funding screen, When it renders, Then the amount field is empty (no prefilled estimate), the complexity tier appears as context only, and the start-small / top-up-stepwise guidance is shown.
- **AT-006.15 (P0)** — Given a funding attempt of $49, When submitted, Then it is rejected; a $50 attempt succeeds — the minimum is $50.
- **AT-006.16 (P0)** — Given an NGO with no completed-project history, When it attempts to fund a project beyond the per-project first-fund cap (default $200), Then the attempt is rejected at the cap.
- **AT-006.17 (P0)** — Given the same NGO on one calendar day (controlled clock), When its payments would exceed the per-day cap, Then the exceeding payment is rejected.
- **AT-006.18 (P0)** — Given an NGO that accrues completed-project history, When caps are evaluated, Then its per-project and per-day caps are higher than the no-history defaults — caps rise as history accrues.
- **AT-006.19 (P0)** — Given the funding screen, When it renders, Then the no-refund rule is disclosed on it — upfront, before payment.
- **AT-006.20 (P0)** — Given a `matched_pending_fuel` project, When the minimum is funded within 7 days, Then the project moves to `in_progress` and kickoff fires; when it is not, the project returns to `open`, the volunteer is freed, and the funding-expired notice with restart CTA is sent (controlled clock). [cross: REQ-005.5/016]

## D. Acknowledgment cadence

- **AT-006.21 (P0)** — Given a fresh NGO that has not signed the full disclaimer at signup, When it attempts to create a project, Then creation is blocked — the signup disclaimer gates project creation. [cross: REQ-001]
- **AT-006.22 (P0)** — Given a project's first funding, When the NGO proceeds, Then a hard per-project acknowledgment is required; on a later top-up to the same project, no hard acknowledgment appears — only a passive Promise link.
- **AT-006.23 (P0)** — Given a project with the first-funding acknowledgment already recorded, When the first match acceptance arrives, Then the per-match acknowledgment naming the volunteer is still required — neither record satisfies the other (never reused across the two).
- **AT-006.24 (P0)** — Given a rematch after a volunteer change, When funding-time acknowledgment is evaluated for the new match, Then a new per-match acknowledgment naming the NEW volunteer is required.

## E. Ledger & provider truth

- **AT-006.25 (P0)** — Given a sequence of money movements (top-up, consumption shares, release to general balance, clawback), When balances are read, Then every movement exists as a ledger row and every displayed balance equals the value derived from the ledger rows exactly.
- **AT-006.26 (P0)** — Given a sentinel local book that disagrees with the provider's billed cost for a workspace, When reconciliation runs, Then the books auto-conform to the provider value and an audited, visible correction row records the change. [cross: REQ-009 owns the monitor]
- **AT-006.27 (P0)** — Given sentinel drift that provider truth cannot decide, When reconciliation runs, Then the books are untouched, no guessed correction exists, and the case is surfaced to the platform admin. [cross: REQ-030]
- **AT-006.28 (P0)** — Given a sentinel control-total imbalance, When the control-total check runs, Then it is auto-repaired under the same provider-truth rules with an audit record.
- **AT-006.29 (P0)** — Given a Stripe settlement event, When the ledger's money-in row is compared to it, Then the row conforms to the Stripe event — Stripe is the money-in truth.
- **AT-006.30 (P0)** — Given gateway per-request usage rows for the project, When the money ledger is derived, Then no gateway row participates — gateway capture is attribution telemetry, never the money ledger. [cross: REQ-034/009]

## F. Unused fuel — non-cash credit

- **AT-006.31 (P0)** — Given a funded `in_progress` project, When the NGO cancels, Then the unconsumed balance moves to the general balance in full and the project's provider workspace is archived. [cross: REQ-009]
- **AT-006.32 (P0)** — Given a volunteer change (abandonment release), When the project re-opens, Then the project's fuel balance is unchanged — leftover fuel stays on the project across a volunteer change. [cross: REQ-005.5/027]
- **AT-006.33 (P0)** — Given a project completing with leftover fuel, When the release to general balance lands, Then it exists as a ledger operation under control totals — no balance value changes without a corresponding ledger row.
- **AT-006.34 (P0)** — Given a general balance of $30, When the NGO opens a $50 funding checkout, Then $30 of credit auto-applies and the card is charged exactly $20 — the credit plus remainder satisfies the $50 minimum.
- **AT-006.35 (P0)** — Given a general balance larger than the checkout amount, When checkout completes, Then the credit covers it entirely and no card charge occurs.
- **AT-006.36 (P0)** — Given a general balance untouched for 13 months (controlled clock), When it is read, Then the amount is unchanged — no decay, no auto-renew, never silently removed — and the dashboard shows it as redeployable credit with no expiry.
- **AT-006.37 (P0)** — Given any actor including a platform admin, When a cash refund or withdrawal is attempted through any surface, Then no such capability exists (UI absent; API rejects); a genuinely-wronged NGO is made whole only via an audited general-balance credit grant.
- **AT-006.38 (P0)** — Given the funding and balance surfaces, When inspected, Then no donation flow, manual conversion, or tax-receipt surface exists (absence).

## G. Chargebacks

- **AT-006.39 (P0)** — Given a Stripe dispute event on an NGO's payment, When it lands, Then the NGO is frozen: new funding attempts are rejected and new matching is blocked.
- **AT-006.40 (P0)** — Given the same dispute, When it lands, Then the project's AI access is cut. [cross: REQ-009]
- **AT-006.41 (P0)** — Given the same dispute, When the ledger is read, Then the unconsumed balance is clawed back and the consumed portion is booked as loss — each as ledger rows.
- **AT-006.42 (P0)** — Given the same dispute, When the platform responds, Then an admin review work item is opened and the audit-logged acknowledgment (timestamp + IP) is submitted as the Stripe dispute evidence.
- **AT-006.43 (P0)** — Given disputed funds already released to the general balance (funded → cancelled → dispute), When the clawback runs, Then it pulls from the general balance — release respects chargeback clawback.

## H. Ops

- **AT-006.44 (P0)** — Given concierge/admin work items (vetting, task-system provisioning, chargeback reviews, incidents), When they are created, Then each lands in a tracked queue carrying a service target it is prioritized against. [cross: REQ-030]

## Coverage map

| REQ-006 clause | Tests |
|---|---|
| Stripe Checkout one-time, no subscription | 01 |
| Full gross credits project or general balance (NGO's choice) | 02, 03 |
| Fundable from draft onward; either funding moment first | 04, 06 |
| Share recognized at consumption; never-consuming project → platform nothing | 05, 07 |
| 15% configurable, locked per consumption, never retroactive | 08 |
| Same share for all consumers; ledger labels consumption kinds | 09 |
| Acknowledgment gate precedes funding CTA; content elements; per-match record (timestamp+IP); Lovable reminder | 10–13 |
| NGO picks amount; no prefill; tier context; guidance; min $50 | 14, 15 |
| First-fund cap ($200 default) + per-day cap; caps rise with history | 16–18 |
| 7-day window; payment → in_progress/kickoff; expiry → open + freed + notice; no-refund upfront | 19, 20 |
| Ack cadence: signup gates creation; first-funding hard ack; per-match ack; never reused; top-ups passive link | 21–24 |
| One auditable ledger; balances derive from it | 25, 33 |
| Provider-truth per workspace; auto-conform + audited corrections; undecidable drift → human, books untouched | 26, 27 |
| Zero-fuel ceiling provider-enforced; gateway telemetry never money ledger | 30 [cross: REQ-009 owns enforcement] |
| Control totals reconciled/auto-repaired; Stripe = money-in truth | 28, 29 |
| Nothing pre-committed to Anthropic; cancellation strands nothing; workspace archived | 31 |
| Leftover stays on project across volunteer change | 32 |
| Release only at completion/cancellation → general balance; auto-apply at checkout ($50 min with remainder on card) | 31, 33–35 |
| No decay / no expiry / dashboard shows redeployable credit | 36 |
| No cash-out, no admin refunds; wronged NGO → credit; no donation/conversion/tax receipts | 37, 38 |
| v1 manual top-up driven by 20%/0% signals | [cross: REQ-009 owns thresholds; REQ-010 owns gauge UI] |
| Chargebacks: freeze, cut access, clawback, loss, review, ack as evidence; release respects clawback | 39–43 |
| Admin work items tracked against service targets | 44 |
