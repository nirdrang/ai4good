#### REQ-001: User Authentication & Org Membership

Two-layer authorization: a global account type (NGO / volunteer / platform admin) plus a per-NGO role (admin / member, NGO accounts only); "NGO admin" means the admin role in that NGO. NGO users may belong to multiple NGOs; volunteers are individual accounts.

- Sign-in by email/password, GitHub, or Google. A GitHub link is mandatory at volunteer signup; linking runs volunteer GitHub onboarding (REQ-007).
- **Single-seat NGO in v1:** one NGO is one account performing every NGO-side action — funding, acknowledgments, scope edits, volunteer offboarding — without precluding later multi-member support (→ RM-12). Guards: every acknowledgment captures the acting person's name, title, and authority attestation (to bind the NGO, fund non-refundable fuel, accept no-SLA); an org email is preferred and shared credentials are prohibited (acknowledgments are per named human); an audited platform-admin contact-transfer/recovery path moves ownership to a new account, deactivates the old one, and preserves history; one non-login escalation contact is captured at concierge onboarding.
- **Single-dev projects in v1:** one volunteer per project; no collaborator seats or co-volunteers (→ RM-13). (OD-1's "peer volunteer" is a bench reviewer, not a second project member.)
- NGO data is visible only to its own account and the assigned volunteer, plus the platform admin (whose role spans all accounts for operations and support).
- Password reset, email verification, and session management.
- Lifecycle state (active/deactivated) gates every write (REQ-007 AUP) (→ RM-14).

Dependencies: none.

---

#### REQ-002: NGO Organization Profile & Founder Vetting

NGOs sign up (email-verified) and complete an org profile. v1 trust is a founder-vetted flag applied during concierge onboarding; the verification machinery is deferred (→ RM-6). Two tiers:

1. **Unverified** — email-verified (the Discovery floor). May draft projects and run Discovery within 10 credits/day; at zero, fund fuel to continue now or wait for the next day. Cannot publish.
2. **Vetted** — one audited admin action at concierge onboarding. Allowance 30/day. May publish and fund. The default for admitted pilot NGOs.

- The NGO admin creates and edits the profile (name, mission, country, website, logo).
- Email verification precedes any Discovery message; vetting gates publishing, never Discovery.
- **The vetting action is audited:** it records who vetted and when, the NGO legal/display name, a public reference link, the contact's name + title + authority attestation, the evidence type, and a note; unvet/revoke exists; vet/unvet emits the verification-outcome notification through the normal event path (REQ-016).
- **Evidence rule (PII-minimizing):** public evidence is preferred (registry, website, EIN); emailed registration documents have only their metadata recorded and the copy deleted after vetting; no sensitive personal identity documents in v1; nothing may imply a document review that did not occur.
- **No public "verified" claim in v1** — the flag may show only as "founder-vetted" (→ RM-6).
- On vetting, the allowance rises 10 → 30 immediately and on later days; re-vetting never re-raises.
- Only vetted NGOs publish; an unvetted NGO may reach `scoped` with publishing disabled.
- The daily allowance hard-resets to the tier grant once per UTC day, with no rollover.
- A paid "Discovery wallet" is excluded in v1 and v1.5 (→ RM-6).

Dependencies: REQ-001.

---

#### REQ-003: Project Need Creation (free-text intake)

An NGO admin starts a "Project Need" with a free-text problem description, which begins Discovery.

- Intake captures a title, problem description, cause tags, and urgency.
- An optional reference-file upload (screenshot, spreadsheet, blank form, mockup, requirements doc) is available for Discovery and the volunteer, shown with the data-responsibility disclosure, which is hardened once Tier-2 sensitivity becomes known (REQ-032).
- Drafts persist automatically without an explicit save; on submission Discovery begins and the raw intake is retained for audit.

Dependencies: REQ-001, REQ-002, REQ-032.

---

#### REQ-004: AI Discovery Agent (free, rate-limited)

A conversational agent, on Claude Opus, turns intake into a scoped spec over 5–10 structured turns.

**Two-layer money:** free Discovery runs on daily credits — 10/day unverified, 30/day vetted; daily reset, no rollover. Funded fuel is dollar-pegged at the standard platform share. **Routing ("Funded → all-$"):** a funded project's Discovery draws on its fuel and the free pool serves only unfunded projects. At zero credits the NGO can get vetted (→ 30), fund fuel to continue now, or wait for the next day.

- Discovery elicits enough from a non-technical NGO to produce a valid technical scope; the conversation persists and resumes.
- It reads Discovery-visible reference files, may request more mid-conversation, and may cite them; it never receives files not marked Discovery-visible (REQ-032).
- **Structured scope output:** a summary; user stories with nested acceptance criteria; a suggested stack; a complexity tier (small/medium/large — never dollars); risk flags; a data-sensitivity tier; a maintainability-fit verdict; a Lovable recommendation with rationale; and the Lovable-vs-Claude-Code build split — which parts are built in Lovable and which are coded through Claude Code. v1 always emits both parts (every match requires an Anthropic fuel kickoff) (→ RM-15).
- **Discovery output is a scope contract:** the source for the dev-authored PRD (REQ-036) and the scorer's gate reference; never decomposed into tasks directly.
- **Data-sensitivity tiers** (Discovery asks what data the tool will handle before assigning one): Tier 0 (no restriction); Tier 1 (ordinary PII — a minimization reminder and NGO data-responsibility acknowledgment); Tier 2 (special-category or high-volume PII — synthetic/anonymized fixtures only during build, the NGO connecting real data itself after completion; real Tier-2 data never reaches Anthropic, Lovable, or the volunteer). The NGO owns the exposure risk and triage confirms the tier; when unsure, Tier 2; health, immigration, abuse-victim, and financial data are never below Tier 2.
- **Maintainability fit check:** the criterion is who evolves the tool after the volunteer leaves — the maintainer, not the technology. A fit means a non-technical staffer can maintain the live app by chat, with Lovable as the durable home; internal tools (intake forms, CRUD trackers, directories, dashboards) fit by default. A need requiring ongoing developer maintenance — developer-grade, one-off, pure-backend, or Tier-2 data that cannot live in Lovable — is declined plainly, with Discovery explaining the limitation and never producing a publishable scope; each decline is recorded for founder review. No waitlist, no second track. Confidential-codebase needs are likewise declined (public-only → RM-2). Sensitive *data* is never a decline reason.
- Scope is regenerable a bounded number of times (each with a logged reason) before admin escalation; regenerations and system-error retries cost zero credits.
- Discovery consumes credits in proportion to the platform cost of each turn. **File attachment never consumes credits and never interrupts** (no pre-ingestion confirm); the daily allowance bounds platform spend. Funded projects bill each turn to fuel, files included.
- **Transparency:** the NGO can see its remaining daily credits and each turn's cost; credits are never silently removed.
- **Free-phase scope guardrails (free credits only):** (1) a scope rule declines/redirects unrelated tasks (general Q&A, document drafting, translations, coding help); (2) a bounded per-conversation turn ceiling, past which Discovery wraps up — generate the scope or start a fresh Discovery; (3) repeated off-topic declines show a plain notice and flag the conversation for founder visibility, never a lockout. **Funded Discovery carries no scope guardrail** — the per-turn cost display and fuel gauge are the controls.
- **Abuse guardrails:** email verification precedes any Discovery message; the daily allowance caps the per-NGO subsidy; funding only removes the wait (same model, no speed change, no allowance raise); a per-NGO admin kill switch exists; free-credit allowances cannot be supplemented by admin grants; there is no platform-wide circuit breaker (per-NGO caps bound exposure). Free credits are never purchased — no stored-value/money-transmitter/escheatment exposure — and live outside the money ledger.

**No dollar estimation in v1:** the scope doc shows the complexity tier with rationale and links Lovable's public pricing where recommended; the NGO picks its fuel amount at funding ($50 minimum), topping up reactively (→ RM-16). The rendered doc plainly explains the tier and start-small advice, maintenance (the NGO evolves by chat for roughly the ~$25/mo Lovable subscription, paid directly, and owns the code), and the data tier (Tier 2 renders fixtures-only).

Dependencies: REQ-003.

---

#### REQ-005.5: Project Lifecycle State-Transition Table

Nine states: `draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`, `completed`, `cancelled`. Every transition has an actor, preconditions, side effects, and failure handling. Abandonment/rematch (`in_progress → open`, REQ-027) is a transition, not a tenth state.

> **No `paused` state in v1.** A pause is a support conversation: pre-match, the NGO unpublishes or cancels; mid-build, an admin revokes access with a note, or the project is cancelled. (→ RM-17)

Transition rules:

- Any NGO — including unvetted — can create a draft. Vetting gates publishing, never Discovery.
- draft → Discovery requires submitted intake, an email-verified NGO admin, and Discovery capacity (free credits or funded fuel); otherwise the transition is blocked and the NGO is shown its remedies (verify, fund now, or return later).
- Discovery completion → `scoped` automatically on valid output; invalid output is retried a bounded number of times, then escalated to an admin.
- `scoped` → `triage` on Publish (vetted only). The triage screener auto-approves confident-clean cases → `open`; non-decided cases go to the founder exception queue and either return to `scoped` with a reason note (edit and republish re-enters the screener) or become `cancelled` (terminal; only for needs that editing cannot fix). Tier-2 never auto-approves.
- `open` → `matched_pending_fuel` on volunteer consent to a concierge match (admin-created, binding, no NGO approve/decline; drawn from the candidate pool after the candidacy window). The first-match disclaimer is satisfied at the consent click (GitHub is already linked at signup). One match at a time per project; the match log tracks the rest.
- `matched_pending_fuel` → `in_progress` on funding (≥ $50): kickoff fires. If unfunded after 7 days the project returns to `open`, the volunteer is freed and notified, and the NGO gets the funding-expired notice with a restart CTA (REQ-016). The NGO may cancel pre-payment.
- `in_progress` → `completed` when all P0 tasks are done and the repo exists (no formal handoff ceremony — REQ-012): leftover fuel → general-balance credit; keys revoked and the provider workspace archived; Linear membership removed and the final task history preserved; completion credit and first-tool badge recorded. The NGO owns the live app and repo throughout and offboards the volunteer and ai4good's monitoring account self-serve. No tip in v1.
- Abandonment/rematch (REQ-027): after 21 days of no code/task activity, or a manual release, the ex-volunteer's platform-controlled access — repo, keys, Linear — is revoked automatically, never waiting on the NGO; Lovable membership has no removal API, so the NGO removes the ex-volunteer on the platform's prompt. **Remaining fuel stays on the project.** The departing volunteer's assigned tasks return to the backlog; the departure is flagged ghosted vs released-for-cause; the project re-opens with rematch priority.
- `open` → `scoped` ("unpublish to revise") any time before consent; a pending match is notified and released.
- Any pre-completion state → `cancelled` by the NGO: keys revoked; fuel → general balance; the volunteer notified; the thread read-only (terminal).
- Operational blockers (REQ-024) are independent of `in_progress`, never lifecycle states.

Match records track their own states — invited / consented / declined / expired / released — in the match log (REQ-007); an unfunded expiry frees the volunteer for re-match. (→ RM-8)

**Kickoff sequence** (side effects fire in parallel on funding):
- A provider workspace and its virtual key are provisioned for the project, with no ops task.
- A Linear workspace is assigned; unavailability raises an urgent ops task + blocker.
- The repo is established by the NGO and volunteer with no platform-admin involvement (REQ-021, required before completion).
- The Linear workspace is seeded with the one bootstrap task — author the project PRD from the Discovery scope (REQ-036); the build backlog decomposes only after the automated completion gate.
- The funded/kickoff status is announced, the comment thread opens, and the volunteer is notified with setup instructions.

Provisioning failures never invent a sub-state — the project stays `in_progress` and gaps surface as blockers/ops tasks, gating the volunteer only from the pending resource.

---

#### REQ-005: Scope Document & Project Publishing

Discovery output renders as an editable scope document the NGO edits and publishes. Publishing needs no pre-funded fuel (fuel is required only at volunteer acceptance — match-first) but requires triage approval (REQ-023).

- Editable: summary, user stories, acceptance criteria, suggested stack. No fuel-budget section (no v1 dollar estimates).
- **All projects are public MIT (Platform Promise §2):** no visibility choice. Confidential-codebase needs are declined at Discovery (→ RM-2); sensitive *data* is served as Tier-2 fixtures-only (REQ-004).
- A project may stay `scoped` indefinitely; the NGO picks its fuel amount at match acceptance.
- Publishing requires vetted status and no fuel deposit; it moves the project to `triage`, never directly to `open`. Clean projects go live immediately; exceptions await the founder (REQ-023).
- Unpublish to `scoped` any time before consent; a return-to-scoped outcome carries the founder's reason note for editing and republishing.

Dependencies: REQ-004, REQ-023.

---

#### REQ-006: Stripe Fuel Top-Up & Ledger

NGOs buy fuel via Stripe Checkout (one-time, no subscription). The full gross amount credits the specified project or, at the NGO's choice, its general balance. The platform share (15%, configurable, locked per consumption — never retroactive) is recognized at consumption, not top-up: a $100 top-up shows $100 of fuel, and a never-consuming project leaves the NGO its full balance and the platform nothing (Promise §3/§7). Fuel is fundable from `draft` onward; the consumers — the NGO (Discovery, and post-funding the project assistant, REQ-033) and the volunteer (build) — pay the same share, and the ledger labels each consumption kind separately.

**Two funding moments** (either first): (1) Discovery funding — the expedite when free credits run out (it buys continuation, not speed); (2) match funding — the default, at acceptance.

**Match-to-fund flow:**

1. A volunteer-consented concierge match moves the project to `matched_pending_fuel`.
2. **An acknowledgment gate precedes the funding CTA,** naming the volunteer: coordination layer only, no obligation to deliver a finished tool; fuel funds AI compute and may be consumed without a viable deliverable; fuel is non-cash credit, not cash-refundable, and unused fuel remains credit for the NGO's projects; the data tier and NGO data responsibility (Tier-2 = fixtures-only); and the chosen amount is the hard maximum exposure. It is recorded per match with timestamp and IP, and it also carries the Lovable setup reminder where Lovable is recommended.
3. **The NGO picks its own amount** — no prefilled estimate; the complexity tier is context only, with start-small, top-up-stepwise guidance. Minimum $50. **First-fund cap:** with no completed-project history, funding is capped per project (default $200) and per day, with caps rising as history accrues — bounding any fraud/chargeback incident to roughly one cap of compute.
4. There are 7 calendar days to fund the minimum. Payment moves the project to `in_progress` and fires kickoff; no payment returns it to `open`, frees the volunteer, and sends the funding-expired notice with a restart CTA (REQ-016). The no-refund rule is disclosed upfront on the funding screen.

**Acknowledgment cadence:** the full disclaimer at signup (gates project creation); a hard per-project acknowledgment at first funding; a per-match acknowledgment naming the volunteer at first acceptance (never reused across the two); later top-ups carry a passive Promise link only.

**Ledger:** every money movement lands in one auditable ledger and all balances derive from it. **Each project is isolated in its own provider workspace, so the dollar meter runs on the provider's billed cost per project (REQ-009):**
- **Provider-truth (per-project):** the provider's usage/cost reporting **per workspace** (its Admin/usage API) is the single source of truth for each project's AI spend and fuel state; a platform monitor reads it on a tight cadence to drive the gauge and the 20/5/0% thresholds, and disagreeing books auto-conform to it (Stripe is the same truth for money-in). Corrections are audited and visible; only undecidable drift needs a human — it never touches the books and is surfaced to the platform admin (REQ-030).
- **The zero-fuel ceiling is provider-enforced** (the workspace spend limit); the gateway does not gate — it proxies the provider's rejection. Any per-request usage the gateway captures is attribution telemetry (REQ-034), never the money ledger.

Control totals are reconciled and auto-repaired by the same provider-truth rules (→ RM-18). Match expiry (7 days) is automatic.

**Unused fuel — non-cash credit (Promise §7):**

- **Nothing is ever pre-committed to Anthropic:** the platform pays Anthropic only for actual usage (pay-as-you-go), and each project's usage is isolated in and reported per its own provider workspace. Cancellation or volunteer release therefore strands no money at Anthropic — the unconsumed balance never left the platform, and the workspace is archived (freeing its slot).
- **There is no cash-out or withdrawal in v1** — no money-out path; only chargeback risk survives.
- Leftover fuel **stays on the project** across a volunteer change.
- Only at completion or cancellation does leftover credit release to the **general balance**: non-cash, with no decay clock, no silent auto-renew, and never silently removed; it auto-applies at any of the NGO's funding checkouts, satisfying the $50 minimum with any remainder on card. The release is a ledger operation under control totals, never a manual balance tweak, and it respects chargeback clawback. No donation flow, manual conversions, or tax receipts.
- No cash refunds of any kind, not even admin-initiated. A genuinely-wronged NGO is made whole in general-balance credit; the only money-out surface is Stripe's dispute process.
- The NGO dashboard shows the general balance as redeployable credit with no expiry.

**v1 top-up is manual** — the 20% warning and 0% blocker drive top-up from the project page (→ RM-7).

**Chargebacks:** on a dispute the platform immediately freezes the NGO (no new funding or matching), cuts the project's AI access, claws back the unconsumed balance, books the consumed portion as loss, and opens an admin review; the audit-logged acknowledgment (timestamp + IP) is submitted as the Stripe dispute evidence. Loss is bounded by no-cash-out, the first-fund cap, and rapid cutoff (→ RM-19); pilot losses are absorbed from operating funds. Collusion / shared payment-fingerprint detection is out of v1 — concierge hand-vetting of every pairing, no-cash-out, and caps are the control (→ RM-20).

Concierge/admin work items (vetting, task-system provisioning, chargeback reviews, incidents) are tracked and prioritized against their service targets.

Dependencies: REQ-001, REQ-002, REQ-004, REQ-008, REQ-009.
