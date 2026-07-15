# AT-REQ-002 — NGO Organization Profile & Founder Vetting

Source: prd-mvp.md REQ-002 (+ REQ-004 two-layer money for allowance behavior at its boundary; REQ-016 notification path). Dependencies: REQ-001.

## A. Org profile

- **AT-002.01 (P0)** — Given a signed-up, email-verified NGO account, When it creates the org profile with name, mission, country, website, and logo, Then all fields persist and render on the profile.
- **AT-002.02 (P0)** — Given the org profile, When edited by the NGO's admin account, Then edits persist; When any other account (other NGO, volunteer, visitor) attempts to edit it, Then the attempt is rejected.
- **AT-002.03 (P1)** — Given a logo upload, When an unsupported file or oversize file is submitted, Then it is rejected with the constraint stated.

## B. Tiers & the daily Discovery allowance

- **AT-002.04 (P0)** — Given a newly email-verified (unverified-tier) NGO, When it runs Discovery, Then it can draft projects and consume Discovery within **10 credits/day**, and cannot publish.
- **AT-002.05 (P0)** — Given an unverified-tier NGO at 0 remaining daily credits, When it sends another Discovery message, Then the message is blocked and the shown remedies are: fund fuel to continue now, or wait for the next day [cross: REQ-004].
- **AT-002.06 (P0)** — Given any NGO with unused credits at end of day, When the UTC day rolls over, Then the allowance hard-resets to exactly the tier grant (10 or 30) — no rollover, no accumulation.
- **AT-002.07 (P0)** — Given an unverified-tier NGO mid-day with credits already consumed, When the founder vets it, Then the daily allowance rises to the 30-credit grant immediately (not only from the next day), and subsequent days grant 30.
- **AT-002.08 (P0)** — Given a vetted NGO that is un-vetted and later re-vetted, When re-vetting occurs, Then the allowance is the standard 30 — re-vetting never re-raises or stacks.
- **AT-002.09 (P0)** — Given any tier, When the NGO checks its Discovery surface, Then remaining daily credits are visible [cross: REQ-004 transparency].
- **AT-002.10 (P0)** — Given the whole product, When searched for a purchase path, Then no paid "Discovery wallet" exists: the only paid continuation is a regular project fuel purchase [cross: REQ-006].

## C. The vetting action & its audit record

- **AT-002.11 (P0)** — Given a platform admin vetting an NGO during concierge onboarding, When the vet action is recorded, Then the audit record captures: who vetted and when; the NGO legal/display name; a public reference link; the contact's name + title + authority attestation; the evidence type; and a note.
- **AT-002.12 (P0)** — Given a vetted NGO, When the admin runs unvet/revoke, Then vetted-only capabilities close (publishing and funding gates), and the action is audit-recorded.
- **AT-002.13 (P0)** — Given a vet or unvet action, When it lands, Then the verification-outcome notification is emitted to the NGO through the normal event path [cross: REQ-016] — never a side-channel email.
- **AT-002.14 (P1)** — Given the vetting flow, When performed, Then it is a single audited admin action — no multi-step approval chain exists in v1.

## D. Evidence rule (PII-minimizing)

- **AT-002.15 (P0)** — Given vetting evidence via a public source (registry, website, EIN), When recorded, Then the audit record stores the public reference link and evidence type.
- **AT-002.16 (P0)** — Given registration documents received by email, When vetting completes, Then only the documents' metadata is recorded and the document copy is deleted; the audit trail reflects the deletion, and no document content is retrievable afterward.
- **AT-002.17 (P0)** — Given an attempt to record sensitive personal identity documents as evidence, When submitted, Then it is refused — no such documents are accepted in v1.
- **AT-002.18 (P0)** — Given any NGO-facing or public copy about vetting, When rendered, Then nothing implies a document review that did not occur — the record and copy reflect the evidence type actually used.

## E. What vetting gates (and what it never gates)

- **AT-002.19 (P0)** — Given an unvetted NGO with a completed scope, When it attempts to publish, Then publishing is blocked (UI and API) while the project may sit at `scoped` indefinitely [cross: REQ-005/005.5].
- **AT-002.20 (P0)** — Given a vetted NGO with a completed scope, When it publishes, Then the project enters triage [cross: REQ-005/023].
- **AT-002.21 (P0)** — Given an unvetted NGO, When it runs Discovery within its allowance, Then Discovery is never blocked by vetting status — vetting gates publishing, never Discovery.
- **AT-002.22 (P0)** — Given an email-unverified NGO, When it attempts any Discovery message, Then it is blocked — email verification precedes Discovery, at every tier.

## F. Public claims

- **AT-002.23 (P0)** — Given every public surface (listings, project pages, profile), When rendered for a vetted NGO, Then no "verified" claim appears anywhere; if the trust flag is surfaced at all, its label is exactly "founder-vetted".
- **AT-002.24 (P1)** — Given public listings in v1, When rendered, Then no verification badge appears on project cards [cross: REQ-007/011 deferral].

## Coverage map

| REQ-002 clause | Tests |
|---|---|
| Profile create/edit (name, mission, country, website, logo) | 01–03 |
| Unverified tier: 10/day, draft+Discovery, cannot publish | 04, 05, 19 |
| Vetted tier: 30/day, may publish and fund | 07, 20 |
| Email verification precedes any Discovery message | 22 |
| Vetting gates publishing, never Discovery | 19–21 |
| Audited vet action (all recorded fields) + unvet/revoke + notification via REQ-016 | 11–14 |
| Evidence rule (public preferred; email docs metadata-only + deleted; no identity docs; honesty) | 15–18 |
| No public "verified" claim; "founder-vetted" only | 23, 24 |
| Allowance rises 10→30 immediately; re-vetting never re-raises | 07, 08 |
| Daily hard reset, no rollover | 06 |
| No paid Discovery wallet in v1/v1.5 | 10 |
