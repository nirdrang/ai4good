# AT-REQ-002 — NGO Organization Profile & Founder Vetting

Source: prd-mvp.md REQ-002 (+ REQ-004 two-layer money for allowance behavior at its boundary; REQ-016 notification path; REQ-004 cause-taxonomy generation reads the profile's mission text as one input — no new REQ-002-owned test, see AT-REQ-004 §D). Dependencies: REQ-001.

## A. Org profile

- **AT-002.01 (P0)** — Given a signed-up, email-verified NGO account, When it creates the org profile with name, mission, country, website, and logo, Then all fields persist and render on the profile.
- **AT-002.02 (P0)** — Given the org profile, When the NGO's admin edits ALL of name, mission, country, website, and logo, Then every edited value persists; When any other account (other NGO, volunteer, visitor) attempts to edit it, Then the attempt is rejected. [cx r2: exercise all five fields]
- **AT-002.03 [retired — cx: the PRD defines no logo upload constraints; re-add if specified]**

## B. Tiers & the daily Discovery allowance

- **AT-002.04 (P0)** — Given an email-verified NGO with an enrolled project, when its grant is read, it has exactly 10 daily turns and 50 beta turns. Both vetted and unvetted NGOs share these limits. Another project or another member receives no additional grant. Unvetted NGOs can draft but cannot publish. [d92]
- **AT-002.05 (P0)** — Given no eligible free turn and no available fuel, sending is blocked and the draft remains. Show fuel checkout. Show the daily reset only if beta turns remain. Vetting is never a remedy for exhausted turns. [d92]
- **AT-002.26 (P0)** — Given exhausted daily or beta capacity, when the NGO funds project fuel, the next turn can use paid USD. Buying fuel changes neither free counter. [d92]
- **AT-002.27 (P0)** — Given exhausted daily capacity, the UTC reset permits free turns only if beta capacity remains. If beta capacity is zero, waiting does not restore free access. [d92]
- **AT-002.06 (P0)** — Given zero, partial, or full daily capacity, the UTC day change resets the daily counter to 10 exactly once without rollover. The beta counter does not reset. Effective free capacity is the smaller remaining daily or beta count. [d92]
- **AT-002.07 (P0)** — Given k daily and b beta turns used, vetting changes publishing permission but neither free counter. No allowance increase occurs immediately or on subsequent days. [d92]
- **AT-002.08 (P0)** — Given an enrolled NGO, unvetting, re-vetting, reopening Discovery, or recreating a project never mints another beta grant or resets either consumed counter. [d92]
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
- **AT-002.28 (P0)** — Given pilot enrollment, concierge onboarding records the audited vet action and the sponsored project. At most 20 NGOs enroll, one sponsored project each, with 50 beta turns each. Concurrent admissions cannot create a twenty-first grant. Vetting alone never creates a second sponsorship. [d92]
- **AT-002.21 (P0)** — Given an unvetted NGO, When it runs Discovery within its allowance, Then Discovery is never blocked by vetting status — vetting gates publishing, never Discovery.
- **AT-002.22 (P0)** — Given an email-unverified NGO, When it attempts any Discovery message, Then it is blocked — email verification precedes Discovery, at every tier.

## F. Public claims

- **AT-002.23 (P0)** — Given every public surface (listings, project pages), When rendered for a vetted NGO, Then no "verified" claim appears anywhere; if the trust flag is surfaced at all, its label is exactly "founder-vetted". [cx: org profile removed from the enumeration — the PRD does not define it as public]
- **AT-002.24 (P1)** — Given public listings in v1, When rendered, Then no verification badge appears on project cards [cross: REQ-007/011 deferral].

## Coverage map

| REQ-002 clause | Tests |
|---|---|
| Profile create/edit (all five fields) | 01, 02 |
| Enrolled project: 10 daily turns and 50 beta turns; unvetted cannot publish | 04, 05, 19 |
| Vetting permits publishing without increasing grants; cohort admission is bounded | 07, 20, 28 |
| Funding not vetting-gated (only publishing is) | 31 |
| Zero-credit remedies actually restore Discovery | 26, 27 |
| Verification machinery deferred (manual founder-vet only) | 30 |
| Email verification precedes any Discovery message | 22 |
| Vetting gates publishing, never Discovery | 19–21 |
| Audited vet action (all fields + field-omission negative + non-admin rejected) + unvet/revoke + notification via REQ-016 | 11, 11b, 12–14, 29 |
| Evidence rule (public preferred → observable as email-docs metadata-only+deleted; no identity docs; evidence-type honesty) | 16–18 |
| No public "verified" claim; "founder-vetted" only | 23, 24 |
| Vetting and project recreation never replenish allowances | 07, 08 |
| Daily hard reset, no rollover | 06 |
| No paid Discovery wallet in v1/v1.5 | 10 |
| Funded turns never debit the free allowance | 25 |
