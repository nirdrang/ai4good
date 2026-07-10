#### REQ-001: User Authentication & Org Membership

Two-layer authorization: global account type (NGO / volunteer / platform admin) + per-NGO role (admin / member) on NGO accounts; "NGO admin" = admin role in that NGO. NGO users may join multiple NGOs; volunteers are individual accounts.

- Email/password, GitHub OAuth, Google OAuth. GitHub link required at first match consent (decision-28); linking runs volunteer GitHub onboarding (REQ-007).
- **Single-seat NGO in v1 (decision-28):** one NGO = one account performing every NGO-side action — funding, acknowledgments, scope edits, handoff sign-off (→ RM-12; two-layer model stays in schema). Guards: acks capture name + title + authority attestation (bind NGO, fund non-refundable fuel, accept no-SLA, approve handoff); org email preferred, shared credentials prohibited in ToS/UI (acks per named human); audited admin contact-transfer/recovery (out-of-band verify → new account, deactivate old, keep history); one non-login secondary escalation contact captured at concierge onboarding.
- **Single-dev projects in v1 (founder extension, decision-28):** one volunteer per project; no collaborator seats or co-volunteers (→ RM-13). (OD-1 "peer volunteer" = bench reviewer, not second member.)
- NGO data visible only to its account and assigned volunteer.
- Password reset, email verification, session management.
- Lifecycle state (active/deactivated) gates every write (REQ-007 AUP) (→ RM-14).

Dependencies: none.

---

#### REQ-002: NGO Organization Profile + Founder Vetting (verification machinery deferred to v1.5 — decision-29/r3)

NGOs sign up (email-verified), complete an org profile. v1 trust = founder's hand, recorded; vetting happens in concierge onboarding. Two tiers (→ RM-6).

1. **Unverified** — email-verified (bot floor for Discovery). May draft projects, run Discovery within 10 credits/day; at zero: fund the project's fuel now or wait for tomorrow. Cannot publish.
2. **Vetted** — ONE audited admin action at concierge onboarding. Allowance 30/day (3× reward). May publish and fund fuel. Default for admitted pilot NGOs.

- NGO admin creates/edits profile (name, mission, country, website, logo).
- Email verification precedes any Discovery message; composer disabled with verify CTA. Vetting gates publish, never Discovery (decision-8).
- **Vetted action audited (decision-29/r3 guard):** vetted_by, vetted_at, NGO legal/display name, public reference link, contact name + title + authority attestation (decision-28/s2), evidence type, vetting note; unvet/revoke exists. Vet/unvet emits the verification-outcome notification (REQ-016).
- **Evidence rule (PII-minimizing):** prefer public evidence (registry, website, EIN lookup). Emailed registration document: metadata recorded only, copy deleted after vetting. No sensitive personal identity documents in v1.
- **No public "verified" claim in v1** — flag internal (or "founder-vetted") (→ RM-6).
- On vetting, allowance rises 10 → 30 immediately and permanently; re-vetting never re-raises (idempotent).
- Only vetted NGOs publish; unvetted may reach `scoped`, Publish disabled ("your ai4good contact completes vetting during onboarding").
- Daily drip (decision-11): allowance hard-resets to tier grant once per UTC day, no rollover; this wall replaces a separate message cap.
- (→ RM-6). Paid "Discovery wallet" excluded in v1 AND v1.5 (decision-8).

Dependencies: REQ-001.

---

#### REQ-003: Project Need Creation (free-text intake)

NGO admins start a "Project Need" with a free-text problem description, starting Discovery.

- Form: title, problem description, cause tags, urgency.
- Optional reference-file upload (screenshot, spreadsheet, blank form, mockup, requirements doc) for Discovery and the volunteer; shows the data-responsibility disclosure, hardened for Tier-2 (REQ-032).
- Drafts autosave. Submission → Discovery; raw intake retained for audit.

Dependencies: REQ-001, REQ-002, REQ-032.

---

#### REQ-004: AI Discovery Agent (free, rate-limited)

A conversational agent turns intake into a scoped spec over a structured 5–10 turn conversation, on Claude Opus (decision-13; ~$1–2 per scoped run).

**Two-layer money model (decision-11):** free Discovery runs on context-weighted credits — 10/day unverified, 30/day vetted; daily reset, no rollover. Funded fuel: real-dollar-pegged, standard margin. **Routing ("Funded → all-$"):** a funded project's Discovery draws its fuel; the free pool serves only unfunded projects. At zero credits: (a) get vetted (→ 30), (b) fund fuel and continue now (expedite), (c) wait for tomorrow's refill.

- System prompt tuned to extract technical scope from non-technical NGOs; conversation persists and resumes in the platform UI.
- Reads Discovery-visible reference files multimodally, may request more mid-conversation, may cite them; never receives files not marked Discovery-visible (REQ-032).
- Structured scope: summary; user stories with nested acceptance criteria; suggested stack; qualitative complexity tier (small/medium/large — never dollars); risk flags; data-sensitivity tier; maintainability fit; Lovable recommendation with rationale; workflow split (Lovable vs Claude Code). v1 always emits the split workflow (every matched v1 project requires an Anthropic fuel kickoff) (→ RM-15).
- **Discovery output is a scope contract (decision-25):** source for the dev-authored project PRD (REQ-036) and the completion scorer's gate reference; never decomposed into build tasks directly.
- **Data-sensitivity classification:** Tier 0 (no restriction); Tier 1 (ordinary PII — minimization reminder + NGO data-responsibility acknowledgment); Tier 2 (special-category or high-volume PII — **synthetic/anonymized fixtures only; NGO connects real data itself after handoff**; real Tier-2 data never reaches Anthropic, Lovable, or volunteer). NGO owns data-exposure risk (governance-by-disclosure); triage confirms compliance. When unsure, Tier 2; health, immigration, abuse-victim, financial data never below Tier 2.
- **Maintainability fit check (single delivery model — decision-23, supersedes decision-19):** Discovery asks who evolves the tool after the volunteer leaves — maintainer selects, not technology. Fit = non-technical staffer maintains the live app by chat, Lovable the durable home; internal tools (intake forms, CRUD trackers, directories, dashboards) default here. Needs requiring ongoing developer maintenance — developer-grade, one-off, pure-backend, or Tier-2 data that cannot live in Lovable — get no publishable scope: Discovery explains plainly, **declines the need**; each decline recorded for founder review. No waitlist, no second track. Private/confidential-codebase needs likewise declined (public-only — decision-27) (→ RM-2). Sensitive *data* is never a decline reason — Tier-2 fixtures-only covers it.
- Scope regenerable up to 3 times (reason logged), then admin escalation. Regenerations and system-error retries cost zero credits — the NGO never pays for failed platform output.
- Per-turn credit cost conversation-weighted; cached content heavily discounted. **Attaching reference files never consumes credits and never interrupts** (no per-file charge or pre-ingestion confirm — removed, founder review 2026-07-07). The daily allowance bounds platform spend. Funded projects bill each turn to fuel, files included.
- **Transparency UI (anti-Lovable):** credit gauge ("Discovery credits: 7 of 10 today") + per-turn cost; Lovable's opacity, forfeiture-on-cancel, and silent burn rejected. Credits never silently removed.
- **Free-phase scope guardrails (decision-34, founder 2026-07-09):** on FREE credits, unrelated work (Q&A, document drafting, translations, coding help) is guarded against. Three layers: (1) system-prompt scope line — decline unrelated tasks, redirect to scoping; (2) deterministic per-conversation turn ceiling (platform-configurable, pilot-tuned) — past it, wrap-up; composer requires generating the scope or a fresh Discovery; (3) repeated off-topic declines → plain notice + founder daily-review flag; visibility, never lockout. **Funded Discovery carries NO scope guardrail (founder ruling):** per-turn cost display and fuel gauge are the only controls.
- **Abuse guardrails:** email verification is a hard precondition for any Discovery message at any tier. Daily allowance caps the free subsidy per NGO per day. Funding is an expedite — same model, no latency change, no allowance raise. Per-NGO admin kill switch (admin-grantable extra credits removed — founder verdict 2026-07-08). No platform-wide circuit breaker in v1; per-NGO daily caps bound exposure. Free credits never purchased — zero stored-value / money-transmitter / escheatment exposure — and live outside the money ledger.

**No dollar estimation in v1:** scope doc shows the qualitative complexity tier with rationale, links Lovable's public pricing where recommended. NGO picks its fuel amount at funding ($50 minimum), tops up reactively (→ RM-16). Rendered doc explains plainly: tier + start-small advice; maintenance (NGO evolves the tool by chat; ~$25/mo Lovable subscription paid directly to Lovable; NGO owns the code); data tier (Tier 2 renders fixtures-only).

Dependencies: REQ-003.

---

#### REQ-005.5: Project Lifecycle State-Transition Table

Ten states: `draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`, `handoff_pending`, `handed_off`, `cancelled`. Every transition has actor, preconditions, side effects, failure handling. Abandonment/rematch (`in_progress → open`, REQ-027) is a transition, not an 11th state.

> **Decision-17: no `paused` state in v1.** Pause/resume cost too much (restore-state edge cases, funding-clock freezes, special-casing in three scheduled jobs, key deactivate/reactivate). At ~10–15 hand-matched projects, "pause" is a support conversation: pre-match, unpublish or cancel the match; mid-build, admin revokes keys and leaves a note, or cancel. (→ RM-17)

Product-level transition rules:

- Any NGO — including unvetted — can create a draft. Vetting gates publish (`scoped → triage`), never Discovery (decision-8).
- draft → Discovery requires submitted intake, email-verified NGO admin, and Discovery capacity (today's free credits or funded fuel); otherwise composer disabled with verify / fund-now / come-back-tomorrow CTAs.
- Discovery completion → `scoped` automatically on valid output; invalid output retries up to 3 times, then admin escalation.
- `scoped` → `triage` on Publish (vetted only). Decision-29/r4 screener: confident-clean auto-approves → `open` (marketplace-visible); anything non-decided → founder exception queue — return to `scoped` with reason note (edit; republish re-enters the screener), or `cancelled` with reason (terminal, non-remediable only). Tier-2 never auto-approves.
- `open` → `matched_pending_fuel` on volunteer consent to a concierge match (decision-28 — admin-created, binding, no NGO approve/decline). Both volunteer gates (GitHub link, first-match disclaimer) satisfied at the consent click — no post-match readiness races. One match at a time per project (concierge match log tracks the rest).
- `matched_pending_fuel` → `in_progress` on funding (≥ $50): kickoff fires. After 7 days unfunded: back to `open`, volunteer freed and notified, NGO gets the funding-expired notice with restart CTA ("funding deadline expired" event, REQ-016). NGO may cancel the match anytime pre-payment.
- `in_progress` → `handoff_pending` on the volunteer's "Ready for Handoff": all P0 tasks done and project repo exists. Failed checklist keeps `in_progress`, results shown.
- `handoff_pending` → `handed_off` on NGO acceptance (live deployment URL required): leftover fuel → non-cash general-balance credit; AI keys revoked; Linear membership removed, task tree snapshotted read-only; attribution captured (REQ-035); volunteer earns completion credit + first-tool badge; 30-day-alive check scheduled. No tip in v1. Rejection → `in_progress` with comments (dispute-review machinery removed at flow #8).
- Abandonment/rematch (REQ-027): after 21 days of no code or task activity, or on manual release, ex-volunteer access revoked everywhere automatically — repo, keys, Linear, Lovable workspace (via the platform's build-phase member seat — decision-35; no waiting on the NGO). **Remaining fuel stays on the project.** Assigned tasks → backlog. Departure flagged ghosted vs released-for-cause; project re-opens with rematch priority.
- `open` → `scoped` ("unpublish to revise") anytime before a match is consented; a pending match is notified and released.
- Any pre-handoff state → `cancelled` by the NGO: keys revoked; remaining fuel → general balance as non-cash credit; volunteer notified; comment thread read-only (terminal).
- Operational blockers (REQ-024) are orthogonal badges on `in_progress`, never lifecycle states.

Match records track their own states — invited / consented / declined / expired / released — in the concierge match log (REQ-007). A match expiring unfunded frees the volunteer for later re-match. (→ RM-8)

**Kickoff sequence** (funding fires parallel side effects): (1) gateway virtual key issued instantly — no ops task, no wait (decision-21); (2) Linear workspace assigned from a pre-created pool (no public creation API; concierge pre-creates in batch; empty pool → urgent ops task + blocker — decision-20); (3) GitHub repo established via the NGO+volunteer Lovable setup checklist (REQ-021) — no platform-admin involvement, required before handoff; (4) workspace seeded with one bootstrap task — author the project PRD from the Discovery scope (REQ-036, decision-25); build backlog decomposes from that PRD only after it clears the automated completion gate; (5) comment thread starts; "funded and live" event announced; (6) volunteer notified with setup instructions. Provisioning failures never invent a sub-state: project stays `in_progress`, gaps surface as blockers/ops tasks, volunteer gated only from the pending resource.

---

#### REQ-005: Scope Document & Project Publishing

Discovery output renders as an editable scope document; the NGO edits and publishes. Publishing needs no pre-funded fuel — fuel is required only at volunteer acceptance (match-first / fund-on-kickoff) — but requires platform triage approval (REQ-023).

- Editable sections: summary, user stories, acceptance criteria, suggested stack. No fuel-budget section (no v1 dollar estimates).
- **All projects are public MIT (Platform Promise §2, decision-27):** no visibility choice — every repo public. Confidential-codebase needs declined at Discovery (→ RM-2). Sensitive *data* → Tier-2 fixtures-only rule (REQ-004), not repo hiding.
- A project may stay `scoped` indefinitely. Doc shows only the qualitative complexity tier; NGO picks its fuel amount at match acceptance.
- Publish requires vetted status and no fuel deposit; moves to `triage`, never directly to `open`. Clean projects go live immediately; exceptions await the founder (REQ-023).
- Unpublish back to `scoped` anytime before a match is consented; a return-to-scoped triage outcome carries the founder's reason note for edit + republish.

Dependencies: REQ-004, REQ-023.

---

#### REQ-006: Stripe Fuel Top-Up & Ledger (NGO + volunteer both consume; funding allowed anytime from draft onward)

NGOs buy fuel via Stripe Checkout (one-time, no subscription). Full gross amount credits the specified project or, at the NGO's choice, its general balance. Margin (15%, platform-configurable, locked per consumption — never retroactive) is recognized at consumption, not top-up: a $100 top-up shows $100 of fuel; a never-consuming project leaves the NGO the full redeployable balance, the platform earning nothing ("fuel funds AI usage, not deliverables" — Platform Promise §3/§7). Fuel fundable anytime from `draft` onward (decision-8); two consumers — NGO during Discovery (after free credits, or immediately on a funded project), volunteer during build. Both pay the same margin; the ledger labels the two consumption kinds separately (spend attributable by phase).

**Two funding moments** (either first; decision-8): (1) Discovery funding — the expedite when free credits run out; the credits→dollars boundary, buying continuation, not per-message speed; (2) match funding — the default, at volunteer acceptance.

**Match-to-fund flow:**

1. Volunteer-consented concierge match → `matched_pending_fuel` (decision-28).
2. **Acknowledgment gate** before the funding CTA — plain-language modal, volunteer's name pre-filled: coordination layer only, no obligation to deliver a finished tool; fuel funds AI compute, may be consumed without a viable deliverable; **fuel is non-cash credit** (not cash-refundable; unused fuel stays as NGO credit); data tier + NGO data responsibility (Tier-2 = fixtures-only); chosen amount = hard maximum exposure. Recorded per match with timestamp + IP. Modal also hosts the Lovable workspace-setup reminder when Lovable is recommended.
3. **NGO chooses its own kickoff amount** — no prefilled estimate; complexity tier is context only. Copy recommends starting small, topping up after concrete progress. Minimum $50; presets $50 / $100 / $200 / $500 / custom; default $50. **First-fund cap:** a funder with no handed-off history is capped per project (default $200) and per day; caps rise with completed-project history — bounding any single fraud/chargeback incident to roughly one cap of compute.
4. 7 calendar days to fund at least the minimum. Payment → `in_progress` + kickoff + volunteer notified. No payment → back to `open`, volunteer freed, NGO gets the funding-expired notice with restart CTA (REQ-016). (Renamed from "re-fund prompt" — founder review 2026-07-09: collided with "refund.")

**Acknowledgment cadence:** full disclaimer at signup (blocks project creation until accepted); hard per-project ack at the project's FIRST funding — Discovery top-up or match funding; per-match ack naming the volunteer at first acceptance (acks never reused across the two moments); later top-ups show only a passive footer link.

**Ledger (product level):** every money movement lands in one auditable ledger; all balances derive from it. **Dollar meter at two levels, both on Anthropic's numbers (decisions 30/31):**
- **Out-of-band anchor:** on a tight cadence (minutes, pilot-tuned — not nightly) the platform pulls Anthropic's usage/cost reporting; that figure is truth — disagreeing books auto-correct to it (Stripe = the same truth for money-in). Corrections post via the guarded function — audited, dashboard-visible; only drift provider data cannot decide pages a human, never touching the books.
- **Inline live preview** covers what the anchor cannot: per-project split (Anthropic sees one org credential; only the gateway knows each request's project) and real-time fuel-zero decline of the next request. Between anchors the gauge moves per request on Anthropic's OWN token counts (in each response — nothing estimated) at Anthropic's published rates; never trusted over the out-of-band figure.

Control totals verify nightly and auto-repair by the same provider-truth rules (→ RM-18). Match expiry (7 days) enforced automatically.

**Unused fuel — non-cash credit (Platform Promise §7):**

- **No cash-out or withdrawal exists in v1** — no money-out path, so no laundering or payout-compliance exposure; only chargeback risk survives.
- Leftover fuel **stays on the project** across a volunteer change — the next volunteer uses it; no money movement.
- Only at handoff or cancellation is leftover credit released to the NGO's **general balance**: non-cash, no decay clock, never silently removed. One v1 behavior (decision-28): the balance **auto-applies at any of the NGO's funding checkouts** — Discovery top-up or match funding — satisfying the $50 minimum, remainder to card. The release is a ledger operation under the nightly control totals (never a manual balance tweak), respecting chargeback clawback. No donation flow, manual conversions, or tax receipts in v1.
- No cash refunds of any kind in v1 — not even admin-initiated (goodwill-refund valve removed, founder verdict flow #9 2026-07-08). No retention clock, no silent auto-renew; the funding screen discloses this upfront. A genuinely-wronged NGO is made whole in general-balance credit (auto-applies at checkout, decision-28); disputes go through the chargeback rail — the only money-out surface is Stripe's dispute process.
- NGO dashboard shows the general balance as redeployable credit, no expiry.

**v1 fuel top-up is manual** — fuel-low warning (20%) and blocker (0%) drive top-up from the project page (→ RM-7).

**Chargebacks:** on a dispute the platform immediately freezes the NGO (no new funding or matching), cuts the project's AI access, claws back the unconsumed balance, books the consumed portion as platform loss, and opens an admin review. The audit-logged acknowledgment (timestamp + IP) is submitted as dispute evidence — what wins friendly-fraud disputes. Loss bounded by no-cash-out + first-fund cap + rapid access cutoff (→ RM-19); pilot-scale losses absorbed from operating funds under those three controls. Fraud posture (decision-26 + founder verdict): collusion/shared-fingerprint detection removed from v1 — concierge hand-vetting of every pairing + no-cash-out + caps are the v1 control (→ RM-20).

Concierge/admin work items (vetting, Linear-pool replenishment, chargeback reviews, incidents) land in one prioritized admin queue with SLA targets.

Dependencies: REQ-001, REQ-002, REQ-004, REQ-008, REQ-009.

---
