#### REQ-001: User Authentication & Org Membership

Two-layer authorization: global account type (NGO / volunteer / platform admin) + per-NGO role (admin / member, NGO accounts only); "NGO admin" = admin role in that NGO. NGO users may join multiple NGOs; volunteers are individual accounts.

- Email/password, GitHub OAuth, Google OAuth. GitHub link required at first match consent (decision-28); linking runs volunteer GitHub onboarding (REQ-007).
- **Single-seat NGO in v1 (decision-28):** one NGO = one account performing every NGO-side action — funding, acknowledgments, scope edits, handoff sign-off (→ RM-12; the two-layer model stays in schema). Guards: acks capture name + title + authority attestation (bind NGO, fund non-refundable fuel, accept no-SLA, approve handoff); org email preferred, shared credentials prohibited in ToS/UI copy (acks per named human); audited platform-admin contact-transfer/recovery (out-of-band verification; ownership moves to the new account, the old one deactivates, history preserved); one non-login escalation contact captured at concierge onboarding.
- **Single-dev projects in v1 (decision-28):** one volunteer per project; no collaborator seats or co-volunteers (→ RM-13). (OD-1 "peer volunteer" = bench reviewer, not a second member.)
- NGO data visible only to its account and assigned volunteer.
- Password reset, email verification, session management.
- Lifecycle state (active/deactivated) gates every write (REQ-007 AUP) (→ RM-14).

Dependencies: none.

---

#### REQ-002: NGO Organization Profile + Founder Vetting (verification machinery deferred to v1.5 — decision-29/r3)

NGOs sign up (email-verified) and complete an org profile. v1 trust = the founder's hand, recorded; vetting happens in concierge onboarding. Two tiers (→ RM-6):

1. **Unverified** — email-verified (the Discovery bot floor). May draft projects, run Discovery within 10 credits/day; at zero: fund fuel now or wait for tomorrow. Cannot publish.
2. **Vetted** — ONE audited admin action at concierge onboarding. Allowance 30/day (3×). May publish and fund. Default for admitted pilot NGOs.

- NGO admin creates/edits the profile (name, mission, country, website, logo).
- Email verification precedes any Discovery message (composer disabled with a verify CTA). Vetting gates publish, never Discovery (decision-8).
- **Vetted action audited (decision-29/r3 guard):** vetted_by, vetted_at, NGO legal/display name, public reference link, contact name + title + authority attestation (decision-28/s2), evidence type, note; unvet/revoke exists. Vet/unvet emits the verification-outcome notification via the normal event path (REQ-016).
- **Evidence rule (PII-minimizing):** prefer public evidence (registry, website, EIN). Emailed registration docs: metadata recorded only, copy deleted after vetting. No sensitive personal identity documents in v1; nothing may imply a document review that did not occur.
- **No public "verified" claim in v1** — the flag may show only as "founder-vetted" (→ RM-6).
- On vetting the allowance rises 10 → 30 immediately and on later days (tier model); re-vetting never re-raises (idempotent).
- Only vetted NGOs publish; unvetted may reach `scoped` with Publish disabled ("your ai4good contact completes vetting during onboarding").
- Daily drip (decision-11): allowance hard-resets to the tier grant once per UTC day, no rollover — this wall replaces a separate message cap.
- Paid "Discovery wallet" excluded in v1 AND v1.5 (decision-8) (→ RM-6).

Dependencies: REQ-001.

---

#### REQ-003: Project Need Creation (free-text intake)

NGO admins start a "Project Need" with a free-text problem description, starting Discovery.

- Form: title, problem description, cause tags, urgency.
- Optional reference-file upload (screenshot, spreadsheet, blank form, mockup, requirements doc) for Discovery and the volunteer; shows the data-responsibility disclosure, hardened once Tier-2 sensitivity becomes known (REQ-032).
- Drafts autosave. Submission → Discovery; raw intake retained for audit.

Dependencies: REQ-001, REQ-002, REQ-032.

---

#### REQ-004: AI Discovery Agent (free, rate-limited)

A conversational agent turns intake into a scoped spec over 5–10 structured turns, on Claude Opus (decision-13; ~$1–2 per scoped run).

**Two-layer money (decision-11):** free Discovery runs on context-weighted credits — 10/day unverified, 30/day vetted; daily reset, no rollover. Funded fuel is dollar-pegged at the standard margin. **Routing ("Funded → all-$"):** a funded project's Discovery draws its fuel; the free pool serves only unfunded projects. At zero credits: get vetted (→ 30), fund fuel and continue now, or wait for tomorrow.

- System prompt tuned to extract technical scope from non-technical NGOs; the conversation persists and resumes in the platform UI.
- Reads Discovery-visible reference files multimodally, may request more mid-conversation, may cite them; never receives files not marked Discovery-visible (REQ-032).
- Structured scope output: summary; user stories with nested acceptance criteria; suggested stack; complexity tier (small/medium/large — never dollars); risk flags; data-sensitivity tier; maintainability fit; Lovable recommendation + rationale; workflow split (Lovable vs Claude Code). v1 always emits the split workflow (every match requires an Anthropic fuel kickoff) (→ RM-15).
- **Discovery output is a scope contract (decision-25):** the source for the dev-authored PRD (REQ-036) and the scorer's gate reference; never decomposed into tasks directly.
- **Data-sensitivity tiers** (Discovery asks what data the tool will handle before assigning one): Tier 0 (no restriction); Tier 1 (ordinary PII — minimization reminder + NGO data-responsibility acknowledgment); Tier 2 (special-category or high-volume PII — **synthetic/anonymized fixtures only during build; the NGO connects real data itself after handoff**; real Tier-2 data never reaches Anthropic, Lovable, or the volunteer). NGO owns the exposure risk (governance-by-disclosure); triage confirms. When unsure, Tier 2; health, immigration, abuse-victim, and financial data never below Tier 2.
- **Maintainability fit check (decision-23, supersedes decision-19):** who evolves the tool after the volunteer leaves — the criterion is the maintainer, not the technology. Fit = a non-technical staffer maintains the live app by chat, Lovable the durable home; internal tools (intake forms, CRUD trackers, directories, dashboards) default here. Needs requiring ongoing developer maintenance — developer-grade, one-off, pure-backend, or Tier-2 data that cannot live in Lovable — are **declined**, plainly, Discovery explaining the limitation; a declined need never yields a publishable scope; each decline recorded for founder review. No waitlist, no second track. Confidential-codebase needs likewise declined (public-only — decision-27) (→ RM-2). Sensitive *data* is never a decline reason.
- Scope regenerable up to 3 times (reason logged), then admin escalation. Regenerations and system-error retries cost zero credits.
- Per-turn cost conversation-weighted; cached content heavily discounted. **File attachment never consumes credits and never interrupts — no pre-ingestion confirm** (founder review 2026-07-07); the daily allowance bounds platform spend. Funded projects bill each turn to fuel, files included.
- **Transparency UI:** credit gauge ("Discovery credits: 7 of 10 today") + per-turn cost; Lovable's opacity, forfeiture-on-cancel, and silent burn rejected. Credits never silently removed.
- **Free-phase scope guardrails (decision-34):** on FREE credits only: (1) a system-prompt scope line declines/redirects unrelated tasks (general Q&A, document drafting, translations, coding help); (2) a deterministic per-conversation turn ceiling (platform-configurable, pilot-tuned) — past it the agent moves to wrap-up and the composer offers only: generate the scope or start a fresh Discovery; (3) repeated off-topic declines → plain notice + founder daily-review flag; visibility, never lockout. **Funded Discovery carries NO scope guardrail:** per-turn cost display + fuel gauge are the controls.
- **Abuse guardrails:** email verification precedes any Discovery message; the daily allowance caps the per-NGO subsidy; funding is an expedite (same model, no latency change, no allowance raise); per-NGO admin kill switch (extra-credit grants removed — founder verdict 2026-07-08); no platform-wide circuit breaker (per-NGO caps bound exposure). Free credits are never purchased — zero stored-value/money-transmitter/escheatment exposure — and live outside the money ledger.

**No dollar estimation in v1:** the scope doc shows the complexity tier with rationale and links Lovable's public pricing where recommended; the NGO picks its fuel amount at funding ($50 minimum), topping up reactively (→ RM-16). The rendered doc explains plainly: tier + start-small advice; maintenance (NGO evolves by chat; ~$25/mo Lovable subscription paid direct; NGO owns the code); data tier (Tier 2 renders fixtures-only).

Dependencies: REQ-003.

---

#### REQ-005.5: Project Lifecycle State-Transition Table

Ten states: `draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`, `handoff_pending`, `handed_off`, `cancelled`. Every transition has actor, preconditions, side effects, failure handling. Abandonment/rematch (`in_progress → open`, REQ-027) is a transition, not an 11th state.

> **Decision-17: no `paused` state in v1.** At ~10–15 hand-matched projects, "pause" is a support conversation: pre-match, unpublish or cancel; mid-build, admin revokes keys and leaves a note, or cancel. (→ RM-17)

Transition rules:

- Any NGO — including unvetted — can create a draft. Vetting gates publish, never Discovery (decision-8).
- draft → Discovery: submitted intake + email-verified NGO admin + Discovery capacity (free credits or funded fuel); otherwise the composer is disabled, showing verify / fund-now / come-back-tomorrow CTAs.
- Discovery completion → `scoped` automatically on valid output; invalid output retries up to 3×, then admin escalation.
- `scoped` → `triage` on Publish (vetted only). Screener (decision-29/r4): confident-clean auto-approves → `open`; non-decided → founder exception queue — return to `scoped` with a reason note (edit; republish re-enters the screener) or `cancelled` (terminal, non-remediable only). Tier-2 never auto-approves.
- `open` → `matched_pending_fuel` on volunteer consent to a concierge match (decision-28 — admin-created, binding, no NGO approve/decline). Both volunteer gates (GitHub link, first-match disclaimer) are satisfied at the consent click. One match at a time per project (the match log tracks the rest).
- `matched_pending_fuel` → `in_progress` on funding (≥ $50): kickoff fires. 7 days unfunded → back to `open`, volunteer freed and notified, NGO gets the funding-expired notice with a restart CTA (REQ-016). NGO may cancel pre-payment.
- `in_progress` → `handoff_pending` on "Ready for Handoff": all P0 tasks done + repo exists. A failed checklist keeps `in_progress`, results shown.
- `handoff_pending` → `handed_off` on NGO acceptance (live deployment URL required): leftover fuel → general-balance credit; keys revoked; Linear membership removed, tree snapshotted read-only; attribution captured (REQ-035); completion credit + first-tool badge; 30-day-alive check scheduled. No tip in v1. Rejection → `in_progress` with comments (dispute machinery removed, flow #8).
- Abandonment/rematch (REQ-027): after 21 days of no code/task activity, or manual release, ex-volunteer access is revoked everywhere automatically — repo, keys, Linear, Lovable workspace (platform member seat, never waiting on the NGO — decision-35). **Remaining fuel stays on the project.** The departing volunteer's assigned tasks → backlog; departure flagged ghosted vs released-for-cause; project re-opens with rematch priority.
- `open` → `scoped` ("unpublish to revise") anytime before consent; a pending match is notified and released.
- Any pre-handoff state → `cancelled` by the NGO: keys revoked; fuel → general balance; volunteer notified; thread read-only (terminal).
- Operational blockers (REQ-024) are orthogonal badges on `in_progress`, never lifecycle states.

Match records track their own states — invited / consented / declined / expired / released — in the match log (REQ-007); an unfunded expiry frees the volunteer for re-match. (→ RM-8)

**Kickoff sequence** (parallel side effects on funding): (1) project gateway virtual key issued instantly, no ops task (decision-21); (2) Linear workspace assigned from the pool (pre-created in batches by concierge ops; empty pool → urgent ops task + blocker — decision-20); (3) repo established by NGO + volunteer via the Lovable setup checklist, no platform-admin involvement (REQ-021) — required before handoff; (4) workspace seeded with the one bootstrap task — author the project PRD from the Discovery scope (REQ-036, decision-25); the build backlog decomposes only after the automated completion gate; (5) comment thread opens; "funded and live" announced; (6) volunteer notified with setup instructions. Provisioning failures never invent a sub-state: the project stays `in_progress`; gaps surface as blockers/ops tasks, gating the volunteer only from the pending resource.

---

#### REQ-005: Scope Document & Project Publishing

Discovery output renders as an editable scope document; the NGO edits and publishes. Publishing needs no pre-funded fuel (fuel is required only at volunteer acceptance — match-first) but requires triage approval (REQ-023).

- Editable: summary, user stories, acceptance criteria, suggested stack. No fuel-budget section (no v1 dollar estimates).
- **All projects public MIT (decision-27, Platform Promise §2):** no visibility choice. Confidential-codebase needs declined at Discovery (→ RM-2); sensitive *data* → Tier-2 fixtures-only (REQ-004).
- A project may stay `scoped` indefinitely; the NGO picks its fuel amount at match acceptance.
- Publish requires vetted status, no fuel deposit; moves to `triage`, never directly to `open`. Clean projects go live immediately; exceptions await the founder (REQ-023).
- Unpublish to `scoped` anytime before consent; a return-to-scoped outcome carries the founder's reason note for edit + republish.

Dependencies: REQ-004, REQ-023.

---

#### REQ-006: Stripe Fuel Top-Up & Ledger (NGO + volunteer both consume; funding allowed anytime from draft onward)

NGOs buy fuel via Stripe Checkout (one-time, no subscription). The full gross amount credits the specified project or, at the NGO's choice, its general balance. Margin (15%, platform-configurable, locked per consumption — never retroactive) is recognized at consumption, not top-up: a $100 top-up shows $100 of fuel; a never-consuming project leaves the NGO its full balance and the platform nothing (Promise §3/§7). Fundable from `draft` onward (decision-8); the consumers — the NGO (Discovery, and post-funding the project assistant, REQ-033) and the volunteer (build) — pay the same margin; the ledger labels each consumption kind separately.

**Two funding moments** (either first; decision-8): (1) Discovery funding — the expedite when free credits run out (the credits→dollars boundary; buys continuation, not speed); (2) match funding — the default, at acceptance.

**Match-to-fund flow:**

1. Volunteer-consented concierge match → `matched_pending_fuel` (decision-28).
2. **Acknowledgment gate** before the funding CTA — a plain-language modal, volunteer's name pre-filled: coordination layer only, no obligation to deliver a finished tool; fuel funds AI compute and may be consumed without a viable deliverable; **fuel is non-cash credit, not cash-refundable — unused fuel remains credit for the NGO's projects**; the data tier + NGO data responsibility (Tier-2 = fixtures-only); the chosen amount is the hard maximum exposure. Recorded per match with timestamp + IP. The modal also hosts the Lovable setup reminder where Lovable is recommended.
3. **The NGO picks its own amount** — no prefilled estimate. Copy treats the complexity tier as context only and recommends starting small, topping up stepwise after reviewing concrete progress. Minimum $50; presets $50/$100/$200/$500/custom; default $50. **First-fund cap:** no handed-off history → capped per project (default $200) and per day; caps rise with history — bounding any fraud/chargeback incident to roughly one cap of compute.
4. 7 calendar days to fund the minimum. Payment → `in_progress` + kickoff. No payment → back to `open`, volunteer freed, funding-expired notice with restart CTA (REQ-016; renamed from "re-fund prompt," which collided with "refund" — founder review 2026-07-09). The no-refund rule is disclosed upfront on the funding screen.

**Acknowledgment cadence:** full disclaimer at signup (gates project creation); a hard per-project ack at FIRST funding; a per-match ack naming the volunteer at first acceptance (never reused across the two); later top-ups show a passive footer link only.

**Ledger (product level):** every money movement lands in one auditable ledger; all balances derive from it. **The dollar meter runs at two levels, both on Anthropic's numbers (decisions 30/31):**
- **Out-of-band anchor:** a tight-cadence pull (minutes, pilot-tuned) of Anthropic's usage/cost reporting is the truth; disagreeing books auto-correct to it (Stripe = the same truth for money-in). Corrections post via the guarded function — audited, dashboard-visible; only undecidable drift pages, never touching the books.
- **Inline preview** covers what the anchor cannot: per-project split (Anthropic sees one org credential; only the gateway knows each request's project) and real-time fuel-zero decline. Between anchors the gauge moves per request on Anthropic's OWN token counts at Anthropic's published rates — never trusted over the anchor.

Control totals verify nightly and auto-repair by the same provider-truth rules (→ RM-18). Match expiry (7 days) is automatic.

**Unused fuel — non-cash credit (Promise §7):**

- **Nothing is ever pre-committed to Anthropic:** the platform pays Anthropic only for actual usage, request by request, on one org account (pay-as-you-go); per-project accounting exists only in the platform ledger (gateway metering, decision-21/30). Cancellation or volunteer release therefore strands no money at Anthropic — the unconsumed balance never left the platform.
- **No cash-out or withdrawal exists in v1** — no money-out path; only chargeback risk survives.
- Leftover fuel **stays on the project** across a volunteer change.
- Only at handoff or cancellation does leftover credit release to the **general balance**: non-cash, no decay clock, no silent auto-renew, never silently removed; it **auto-applies at any of the NGO's funding checkouts** (decision-28), satisfying the $50 minimum, remainder to card. The release is a ledger operation under nightly control totals — never a manual balance tweak — respecting chargeback clawback. No donation flow, manual conversions, or tax receipts.
- No cash refunds of any kind — not even admin-initiated (goodwill valve removed, flow #9). A genuinely-wronged NGO is made whole in general-balance credit; disputes go through the chargeback rail — the only money-out surface is Stripe's dispute process.
- The NGO dashboard shows the general balance as redeployable credit, no expiry.

**v1 top-up is manual** — the 20% warning and 0% blocker drive top-up from the project page (→ RM-7).

**Chargebacks:** on a dispute the platform immediately freezes the NGO (no new funding or matching), cuts the project's AI access, claws back the unconsumed balance, books the consumed portion as loss, and opens an admin review; the audit-logged acknowledgment (timestamp + IP) is submitted as the Stripe dispute evidence. Loss bounded by no-cash-out + first-fund cap + rapid cutoff (→ RM-19); pilot losses absorbed from operating funds. Fraud posture: collusion/shared-fingerprint detection removed from v1 (decision-26 + founder verdict) — concierge hand-vetting of every pairing + no-cash-out + caps are the control (→ RM-20).

Concierge/admin work items (vetting, pool replenishment, chargeback reviews, incidents) land in one prioritized admin queue with SLA targets.

Dependencies: REQ-001, REQ-002, REQ-004, REQ-008, REQ-009.

---
