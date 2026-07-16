# AT-REQ-006 — Stripe Fuel Top-Up & Ledger

Source: requirements/req-006.md (prd-mvp.md REQ-006 + Promise §3/§7/§9). Dependencies: REQ-001, REQ-002, REQ-004, REQ-008, REQ-009.

**Boundary note:** REQ-006 owns money-in (Stripe), the ledger and its balances, the platform-share recognition rule, the acknowledgment cadence and content gates (per AT-REQ-001's boundary, identity capture on acknowledgments is owned by REQ-001), unused-fuel credit rules, and chargebacks. State transitions the money triggers are owned by REQ-005.5; provider-side spend enforcement and thresholds mechanics by REQ-009; Discovery money routing by REQ-004; attribution telemetry by REQ-034 — all appear here only as `[cross:]` firings.

## A. Checkout & crediting

- **AT-006.01 (P0)** — Given an NGO funding a project, When it pays via Stripe Checkout, Then the payment is a one-time charge — no subscription or recurring-billing object is created anywhere.
- **AT-006.02 (P0)** — Given a $100 top-up directed at a project, When payment settles, Then that project's fuel balance increases by exactly $100 — the full gross amount, with no upfront platform deduction — and the general balance and every other project's balance are unchanged. [cx: no-double-credit assertion added]
- **AT-006.03 (P0)** — Given the NGO chooses its general balance at checkout, When payment settles, Then the general balance increases by the full gross amount and no project balance changes.
- **AT-006.04 (P0)** — Given a project in `draft`, When the NGO tops it up, Then the payment succeeds — fuel is fundable from `draft` onward. [cross: REQ-005.5]
- **AT-006.05 (P0)** — Given a funded project that never consumes, When it is later cancelled, Then the NGO's general balance receives the full funded amount and the ledger contains zero platform-share rows for that project — the platform earned nothing. [Promise §3/§7]
- **AT-006.06 (P0)** — Given a project with a consented match and no prior payment of any kind by this NGO, When match funding is its first-ever payment, Then it succeeds — either funding moment can be first. [cross: REQ-004 owns Discovery-funding routing]
- **AT-006.50 (P0)** — Given an NGO with exhausted free Discovery credits and no prior payment of any kind, When it funds the project mid-Discovery (its first-ever payment), Then Discovery consumption continues with NO speed or priority change (request settings identical before/after — it buys continuation, not speed), and a later match funding on the same project remains valid. [cx r2: added — Discovery-funding-first was claimed in the map but never exercised] [cross: REQ-004 owns routing]

## B. Platform-share recognition

- **AT-006.07 (P0)** — Given a funded project, When the provider bills $X of consumption, Then the ledger books a platform share of exactly 15% of $X at consumption time, and before any consumption no share row exists.
- **AT-006.08 (P0)** — Given the share configuration changes from 15% to a sentinel value mid-project, When the ledger is read, Then every consumption row booked before the change still carries 15% (locked per consumption, never retroactive) and only consumption after the change carries the new rate.
- **AT-006.09 (P0)** — Given consumption by the NGO in Discovery, by the NGO via the post-funding project assistant, and by the volunteer building, When the ledger is read, Then each consumption row carries its distinct kind label (Discovery / assistant / build) and all three kinds carry the same share percentage. [cross: REQ-033]

## C. Match-to-fund flow

- **AT-006.45 (P0)** — Given an `open` project with an admin-created match, When the volunteer consents, Then the project moves to `matched_pending_fuel` and no kickoff side effect fires — the flow's step 1. [cx: added — the flow's entry transition was assumed, not tested] [cross: REQ-005.5/007]
- **AT-006.10 (P0)** — Given a `matched_pending_fuel` project whose per-match acknowledgment is not yet submitted, When the NGO attempts to reach funding checkout, Then it is blocked — the acknowledgment gate precedes the funding CTA.
- **AT-006.11 (P0)** — Given the per-match acknowledgment copy, When it renders, Then it contains every mandated element: it names the volunteer; states the platform is a coordination layer with no obligation to deliver a finished tool; states fuel funds AI compute and may be consumed without a viable deliverable; states fuel is non-cash credit, not cash-refundable, with unused fuel remaining credit for the NGO's projects; states the data tier and NGO data responsibility (Tier-2 = fixtures-only); and states the chosen amount is the hard maximum exposure.
- **AT-006.12 (P0)** — Given the acknowledgment is submitted, When the record is read, Then it is stored per match with timestamp and IP. [cross: REQ-001 owns name/title/authority capture]
- **AT-006.13 (P0)** — Given Lovable is recommended for the project, When the acknowledgment renders, Then it carries the Lovable setup reminder.
- **AT-006.14 (P0)** — Given the funding screen, When it renders, Then the amount field is empty (no prefilled estimate), the complexity tier appears as context only, and the start-small / top-up-stepwise guidance is shown.
- **AT-006.15 (P0)** — Given a funding attempt of $49, When submitted, Then it is rejected; a $50 attempt succeeds — the minimum is $50.
- **AT-006.16 (P0)** — Given an NGO with no completed-project history under the default configuration, When it funds a project exactly $200, Then it succeeds; When it attempts the smallest supported amount above $200, Then it is rejected — the default cap is exactly $200, neither lower nor higher. [cx r2: both boundary sides pinned — "beyond the cap rejected" alone would pass an accidentally lower cap]
- **AT-006.17 (P0)** — Given the same NGO on one calendar day (controlled clock), When its payments would exceed the per-day cap, Then the exceeding payment is rejected.
- **AT-006.18 (P0)** — Given an NGO that accrues completed-project history, When caps are evaluated, Then its per-project and per-day caps are higher than the no-history defaults — caps rise as history accrues.
- **AT-006.19 (P0)** — Given the funding screen, When it renders, Then the no-refund rule is disclosed on it — upfront, before payment.
- **AT-006.20 (P0)** — Given a `matched_pending_fuel` project, When the minimum is funded within 7 days, Then the project moves to `in_progress` and kickoff fires; when it is not, the project returns to `open`, the volunteer is freed, and the funding-expired notice with restart CTA is sent (controlled clock). [cross: REQ-005.5/016]

## D. Acknowledgment cadence

- **AT-006.21 (P0)** — Given a fresh NGO that has not signed the full disclaimer at signup, When it attempts to create a project, Then creation is blocked; and the rendered signup acknowledgment matches the immutable canonical disclaimer fixture (version/hash equality, every required clause present) — not the shorter first-funding or per-match copy. [cx: content assertion] [cx r2: judged against a canonical versioned fixture — a copy merely labeled "full" proved nothing] [cross: REQ-001]
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
- **AT-006.32 (P0)** — Given a volunteer change (abandonment release), When the project re-opens, Then the project's fuel balance is unchanged and NO general-balance release row exists — leftover fuel stays on the project; release happens only at completion or cancellation. [cx: explicit no-release assertion] [cross: REQ-005.5/027]
- **AT-006.33 (P0)** — Given a project completing with a known leftover amount, When COMPLETION fires (the event under test, not an assumed release), Then exactly that amount is debited from the project, credited to the general balance, and represented by balanced ledger rows under control totals — a missing or wrong-amount release fails. [cx r2: completion made the trigger; exact-amount both-sides assertion]
- **AT-006.34 (P0)** — Given a general balance of exactly $30, When a $50 funding checkout COMPLETES (payment settles), Then the general balance is debited exactly $30, the card settles exactly $20, the target project is credited the full $50, and matching ledger rows exist; opening or abandoning the checkout changes nothing — no charge, no balance mutation. [cx r2: settle-time trigger; source/destination deltas asserted, not just the tender split]
- **AT-006.35 (P0)** — Given a general balance larger than the checkout amount, When checkout completes, Then the credit covers it entirely with no card charge, the general balance is debited exactly the checkout amount, and the target project is credited exactly that amount with matching ledger rows. [cx r2: balance deltas asserted — applied credit must not remain reusable]
- **AT-006.36 (P0)** — Given a general balance untouched for 13 months (controlled clock), When it is read, Then the amount is unchanged — no decay, no auto-renew, never silently removed — and the dashboard shows it as redeployable credit with no expiry.
- **AT-006.37 (P0)** — Given any actor including a platform admin, When a cash refund or withdrawal is attempted through any surface, Then no such capability exists (UI absent; API rejects); a genuinely-wronged NGO is made whole only via an audited general-balance credit grant.
- **AT-006.38 (P0)** — Given the funding and balance surfaces, When inspected, Then no donation flow, manual conversion, or tax-receipt surface exists (absence).

## F2. Provider-truth isolation & scope guards [cx: added round 1]

- **AT-006.46 (P0)** — Given two projects in distinct provider workspaces, When provider usage lands on workspace A and reconciliation runs, Then only project A's ledger and fuel state change — project B's are untouched — provider truth is per workspace. [cross: REQ-009]
- **AT-006.47 (P0)** — Given a top-up settles, When the provider account is inspected, Then no prepayment or committed amount exists at Anthropic (provider spend remains actual-usage-only); and When cancellation is EXECUTED on one fixture project and a volunteer release on another, Then after each event the provider account still shows no prepaid/stranded amount and the ledger shows the unconsumed balance platform-held — nothing is ever pre-committed, proven through both events, not claimed. [cx r2: cancellation and release actually executed — the temporal claim was unjudgeable from a top-up alone] [cross: REQ-009]
- **AT-006.48 (P0)** — Given controlled spend fixtures crossing 20%, 5%, and 0% (provider-truth reads), When each threshold crosses, Then the gauge and threshold events update within the configured propagation bound (provisional ≤5 minutes — founder to pin the "tight cadence" number), the 20% warning and 0% blocker each expose a project-page top-up action, and with no NGO action no card is charged and no provider spend limit is raised — only an NGO-confirmed checkout moves money. v1 top-up is manual. [cx r2: cadence bound + all three crossings + the positive project-page-CTA half added] [cross: AT-009.14 owns the notification routing; REQ-010 owns the gauge UI]
- **AT-006.49 (P0)** — Given two NGOs funding with the same payment fingerprint (sentinel), When both payments settle, Then no automated linking, freeze, or rejection is triggered by the shared fingerprint alone — collusion detection is out of v1; concierge vetting, no-cash-out, and caps are the controls.
- **AT-006.51 (P0)** — Given any pairing reaching `consented`/fundable, When its provenance is audited, Then an admin-created match record (the concierge hand-vetting evidence) exists for it — no pairing becomes fundable without the concierge control that the collusion posture leans on. [cx r2: added — the stated control had no test] [cross: REQ-007.09/28 own the enforce-match flow]

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
| Fundable from draft onward; either funding moment first (match-first AND Discovery-first with exhausted credits, continuation-not-speed) | 04, 06, 50 [cx r2] |
| Share recognized at consumption; never-consuming project → platform nothing | 05, 07 |
| 15% configurable, locked per consumption, never retroactive | 08 |
| Same share for all consumers; ledger labels consumption kinds | 09 |
| Consent → matched_pending_fuel (flow step 1, no kickoff) | 45 [cx] |
| Acknowledgment gate precedes funding CTA; content elements; per-match record (timestamp+IP); Lovable reminder | 10–13 |
| NGO picks amount; no prefill; tier context; guidance; min $50 | 14, 15 |
| First-fund cap (exactly $200 default, both boundary sides) + per-day cap; caps rise with history | 16–18 |
| 7-day window; payment → in_progress/kickoff; expiry → open + freed + notice; no-refund upfront | 19, 20 |
| Ack cadence: signup gates creation; first-funding hard ack; per-match ack; never reused; top-ups passive link | 21–24 |
| One auditable ledger; balances derive from it | 25, 33 |
| Provider-truth per workspace (isolation proven two-workspace); auto-conform + audited corrections; undecidable drift → human, books untouched | 26, 27, 46 [cx] |
| Zero-fuel ceiling provider-enforced + gateway proxies the rejection | [cross → AT-009.13 owns the proxy behavior]; telemetry never money ledger: 30 |
| Control totals reconciled/auto-repaired; Stripe = money-in truth | 28, 29 |
| Nothing pre-committed to Anthropic; cancellation/release strands nothing; workspace archived | 31, 47 [cx: honest remap — 31 alone did not prove no-prepayment] |
| Leftover stays on project across volunteer change (and no release fires then) | 32 |
| Release ONLY at completion/cancellation → general balance; auto-apply at checkout ($50 min with remainder on card) | 31, 32, 33–35 [cx: 32 added — the "only" negative] |
| No decay / no expiry / dashboard shows redeployable credit | 36 |
| No cash-out, no admin refunds; wronged NGO → credit; no donation/conversion/tax receipts | 37, 38 |
| v1 top-up is MANUAL: monitor on a tight cadence (provisional ≤5-min bound), 20/5/0 crossings, project-page top-up CTA, never auto-charge or auto-raise | 48 [cx r2] [cross: AT-009.14 notifications; REQ-010 gauge UI] |
| Chargebacks: freeze, cut access, clawback, loss, review, ack as evidence; release respects clawback | 39–43 |
| Collusion / shared-fingerprint detection OUT of v1 (no automated action on fingerprint alone); concierge hand-vetting evidence per pairing | 49, 51 [cx r2] |
| Admin work items tracked against service targets | 44 |
