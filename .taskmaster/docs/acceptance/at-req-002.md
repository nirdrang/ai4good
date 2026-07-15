# AT-REQ-002 — NGO Organization Profile & Founder Vetting

Source: prd-mvp.md REQ-002 (+ REQ-004 two-layer money for allowance behavior at its boundary; REQ-016 notification path). Dependencies: REQ-001.

## A. Org profile

- **AT-002.01 (P0)** — Given a signed-up, email-verified NGO account, When it creates the org profile with name, mission, country, website, and logo, Then all fields persist and render on the profile.
- **AT-002.02 (P0)** — Given the org profile, When the NGO's admin edits ALL of name, mission, country, website, and logo, Then every edited value persists; When any other account (other NGO, volunteer, visitor) attempts to edit it, Then the attempt is rejected. [cx r2: exercise all five fields]
- **AT-002.03 [retired — cx: the PRD defines no logo upload constraints; re-add if specified]**

## B. Tiers & the daily Discovery allowance

- **AT-002.04 (P0)** — Given a newly email-verified (unverified-tier) NGO, When its daily grant is read, Then it is exactly **10**; free consumption can reach 10 but never exceed it; it can draft projects and cannot publish. [cx r2: assert the exact grant, not just an upper bound]
- **AT-002.05 (P0)** — Given an unverified-tier NGO at 0 remaining daily credits on an UNFUNDED project, When it sends another Discovery message, Then the message is blocked and the shown remedies are: get vetted (→ 30), fund fuel to continue now, or wait for the next day [cross: REQ-004]. [cx: scoped to unfunded]
- **AT-002.26 (P0)** — Given the zero-credit block in AT-002.05, When the NGO funds project fuel, Then the very next Discovery turn succeeds (billed to fuel). [cx r2: remedy actually restores Discovery]
- **AT-002.27 (P0)** — Given the zero-credit block, When the day rolls over, Then the next free Discovery turn succeeds on the reset allowance. [cx r2: the other remedy]
- **AT-002.06 (P0)** — Given an NGO with any starting balance (zero, partial, or full), When the UTC day rolls over, Then the allowance hard-resets to exactly the tier grant (10 or 30) — no rollover; and a second reset does NOT occur within the same UTC day. [cx r2: parameterize starting balance incl. zero; assert once-per-day]
- **AT-002.07 (P0)** — Given an unverified-tier NGO that has consumed a known k credits mid-day, When the founder vets it, Then the cap becomes 30 immediately and remaining free credits equal 30 − k (not a fresh 30); subsequent days grant 30. [cx r2: exact remaining balance]
- **AT-002.08 (P0)** — Given a vetted NGO that is un-vetted and later re-vetted mid-day, When re-vetting occurs, Then the cap is 30 and no additional same-day credits are minted — re-vetting never re-raises or stacks. [cx r2: no same-day credit minting]
- **AT-002.09 [retired — cx r2: remaining-credit visibility is a REQ-004 transparency clause → AT-REQ-004.46]**
- **AT-002.10 (P0)** — Given exhausted Discovery credits, When the NGO follows the paid-continuation path (UI and API), Then it routes to the ordinary project-fuel checkout; no separately-purchasable Discovery-credit SKU, wallet, or Discovery-only balance exists — ordinary project/general fuel checkout is permitted [cross: REQ-006]. [cx r2: permit fuel checkout, forbid only a Discovery wallet]
- **AT-002.25 [retired — cx r2: funded-turn billing/allowance-side is a REQ-004 obligation → AT-REQ-004.04/05/48]**
- **AT-002.31 (P0)** — Given an NGO regardless of vetting status (unverified or vetted), When it funds ordinary project fuel, Then funding succeeds — funding is not vetting-gated (only publishing is). [cx r2: resolves the REQ-002-"may fund" vs REQ-006 tension in-suite]

## C. The vetting action & its audit record

- **AT-002.11 (P0)** — Given a platform admin vetting an NGO during concierge onboarding, When the vet action is recorded, Then the audit record captures: who vetted and when; the NGO legal/display name; a public reference link; the contact's name + title + authority attestation; the evidence type; and a note.
- **AT-002.11b (P0)** — Given a vet attempt with any one required audit field absent (name, reference link, attestation, evidence type…), When submitted, Then the vet does not commit and no partial vetted state results. [cx r2: field-omission negative]
- **AT-002.29 (P0)** — Given a vet or unvet request from a non-admin (NGO account, volunteer, or unauthenticated caller), When attempted, Then it is rejected — no tier change and no verification-outcome event. [cx r2: negative authorization path]
- **AT-002.30 (P0)** — Given v1, When the vetting surfaces are inspected, Then only the manual founder vet/unvet path exists — no automated verification/KYC workflow or document-review status transition (the verification machinery is deferred, → RM-6). [cx r2: "verification machinery is deferred"]
- **AT-002.12 (P0)** — Given a vetted NGO, When the admin runs unvet/revoke, Then publishing closes and the action is audit-recorded; project-fuel funding is NOT blocked (fuel is fundable from draft onward regardless of vetting, REQ-006). [cx: funding-gate claim removed — REQ-006 is the money authority]
- **AT-002.13 (P0)** — Given a vet or unvet action, When it lands, Then the verification-outcome notification is emitted to the NGO through the normal event path [cross: REQ-016] — never a side-channel email.
- **AT-002.14 (P0)** — Given the vetting flow, When performed, Then it is a single audited admin action — no multi-step approval chain exists in v1. [cx: promoted P1→P0 — explicit REQ clause]

## D. Evidence rule (PII-minimizing)

- **AT-002.15 [retired — cx: fully covered by AT-002.11's audit-record field assertions; the "public evidence preferred" clause is procedural guidance without an observable mechanism]**
- **AT-002.16 (P0)** — Given registration documents received by email, When vetting completes, Then only the documents' metadata is recorded and no document content is retrievable afterward. [cx: deletion-audit-event claim dropped — not required by the PRD]
- **AT-002.17 (P0)** — Given an attempt to record sensitive personal identity documents as evidence, When submitted, Then it is refused — no such documents are accepted in v1.
- **AT-002.18 (P0)** — Given a vetting performed with evidence type X (not documents), When the audit record and any NGO-facing/public surface are shown, Then the audit record stores exactly type X, and no surface implies a document review occurred. [cx r2: assert the "no implied doc review" honesty rule, not that every surface must disclose the exact type — which would collide with the "founder-vetted" label]

## E. What vetting gates (and what it never gates)

- **AT-002.19 (P0)** — Given an unvetted NGO with a completed scope, When it attempts to publish, Then publishing is blocked (UI and API) while the project may sit at `scoped` indefinitely [cross: REQ-005/005.5].
- **AT-002.20 (P0)** — Given a vetted NGO with a completed scope, When it publishes, Then the project enters triage [cross: REQ-005/023].
- **AT-002.28 (P0)** — Given an admitted pilot NGO, When concierge onboarding completes, Then the audited vet action has run and the NGO is left founder-vetted with the 30-credit tier (vetted is the pilot default). [cx r2: "the default for admitted pilot NGOs"]
- **AT-002.21 (P0)** — Given an unvetted NGO, When it runs Discovery within its allowance, Then Discovery is never blocked by vetting status — vetting gates publishing, never Discovery.
- **AT-002.22 (P0)** — Given an email-unverified NGO, When it attempts any Discovery message, Then it is blocked — email verification precedes Discovery, at every tier.

## F. Public claims

- **AT-002.23 (P0)** — Given every public surface (listings, project pages), When rendered for a vetted NGO, Then no "verified" claim appears anywhere; if the trust flag is surfaced at all, its label is exactly "founder-vetted". [cx: org profile removed from the enumeration — the PRD does not define it as public]
- **AT-002.24 (P1)** — Given public listings in v1, When rendered, Then no verification badge appears on project cards [cross: REQ-007/011 deferral].

## Coverage map

| REQ-002 clause | Tests |
|---|---|
| Profile create/edit (all five fields) | 01, 02 |
| Unverified tier: exactly 10/day, draft+Discovery, cannot publish | 04, 05, 19 |
| Vetted tier: 30/day, may publish; pilot default is vetted | 07, 20, 28 |
| Funding not vetting-gated (only publishing is) | 31 |
| Zero-credit remedies actually restore Discovery | 26, 27 |
| Verification machinery deferred (manual founder-vet only) | 30 |
| Email verification precedes any Discovery message | 22 |
| Vetting gates publishing, never Discovery | 19–21 |
| Audited vet action (all fields + field-omission negative + non-admin rejected) + unvet/revoke + notification via REQ-016 | 11, 11b, 12–14, 29 |
| Evidence rule (public preferred → observable as email-docs metadata-only+deleted; no identity docs; evidence-type honesty) | 16–18 |
| No public "verified" claim; "founder-vetted" only | 23, 24 |
| Allowance rises 10→30 immediately; re-vetting never re-raises | 07, 08 |
| Daily hard reset, no rollover | 06 |
| No paid Discovery wallet in v1/v1.5 | 10 |
| Funded turns never debit the free allowance | 25 |
