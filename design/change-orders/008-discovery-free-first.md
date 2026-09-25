# Change order 008 — Discovery free turns, paid USD, and agreed interface

Date: 2026-09-20. Decision: d92. Status: ASTRA FIXTURE READY FOR REVIEW; founder approval is pending.

AI4DEV-9 (Discovery screen design) owns the design revision.
AI4DEV-158 (Discovery interface wiring) owns the implementation.

The founder requested the agreed Discovery interface with the system font and color scheme.
The founder also requested PRD and Linear integration, including reopening affected completed items.

## Required screen revision

Use [the Discovery interface contract](../discovery-ui-contract.md) as the design specification.
Use [the preserved conversation prototype](../references/discovery-conversation.html) for layout and interaction history.
Its former credit arithmetic and standalone palette are superseded.

**Scope clarification, 2026-09-21:** revise the Discovery screen for Discovery only.
The stage bar belongs to the shared project workspace and represents a compact process Kanban.
Its order is Intake, Discovery, Volunteer match, PRD, Design, Build, and Handoff.
After Discovery confirmation, Find a volunteer opens publication review. Volunteer consent and funding kickoff precede PRD work.
Keep that boundary visible in the design composition and assess the shared bar separately.
Do not add other stage screens or publishing into Discovery to satisfy the broader design item.
The scope review and funding checks below cover Discovery's adjacent entry and exit points, not other stages within this screen.

Revise the interactive fixture in `design/astra/`, as authorized on 2026-09-21.
Keep `design/screens/discovery-chat.html` as the unchanged Claude Design reference.
Save later Claude revisions under `design/claude-review/`.
Update screen 6 and the Discovery gauge rules in `design/ui-ux-instructions.md`.
Use the app font and `src/styles.css` variables for both themes.
Keep NGO and AI roles, dependent questions, the live brief, one gate gauge, and NGO confirmation.
Draw every funding and review state in the contract, including fractional-cent paid receipts.

Check the scope review screen for explicit confirmation of the current brief revision.
Check the ordinary funding entry point for free-first return behavior after purchase.
Do not create a separate Discovery wallet, checkout, or 30-turn vetted grant.

## Current delivery route

The founder authorized Astra to edit fixture designs directly. See [the design source rules](../README.md).
Review the Discovery route at `http://127.0.0.1:4310/#discovery`.
This fixture uses scripted replies and simulated money. It does not implement the production interface.
The earlier conversation prototype remains a preserved reference. Its old funding logic does not apply.
Record the founder's explicit approval of Discovery separately from the other screens in this design item.
The [revision 4 review](../astra/discovery-review.md) records the NGO and AI chat, completion guidance, matching step, checks, and remaining production work.

## Changed requirement text

The following requirement blocks are copied verbatim from the editable PRD source.

#### REQ-002: NGO Organization Profile & Founder Vetting

NGOs sign up (email-verified) and complete an org profile. v1 trust is a founder-vetted flag applied during concierge onboarding; the verification machinery is deferred (→ RM-6). Two tiers:

1. **Unverified** — email-verified, the Discovery access floor. May draft projects and use an enrolled project's beta allowance or paid fuel. Cannot publish.
2. **Vetted** — one audited admin action at concierge onboarding. May publish and fund. The default for admitted pilot NGOs. Vetting does not increase Discovery allowances.

- The NGO admin creates and edits the profile (name, mission, country, website, logo).
- The profile's mission text is one input the Discovery pass reads to generate cause labels (REQ-004); there is no separate cause-category field or admin taxonomy surface here.
- Email verification precedes any Discovery message; vetting gates publishing, never Discovery.
- **The vetting action is audited:** it records who vetted and when, the NGO legal/display name, a public reference link, the contact's name + title + authority attestation, the evidence type, and a note; unvet/revoke exists; vet/unvet emits the verification-outcome notification through the normal event path (REQ-016).
- **Evidence rule (PII-minimizing):** public evidence is preferred (registry, website, EIN); emailed registration documents have only their metadata recorded and the copy deleted after vetting; no sensitive personal identity documents in v1; nothing may imply a document review that did not occur.
- **No public "verified" claim in v1** — the flag may show only as "founder-vetted" (→ RM-6).
- **Beta enrollment:** the initial cohort contains at most 20 NGOs, with one sponsored project per NGO. Each enrolled project receives 10 free turns per UTC day and 50 across the beta. The cohort therefore has at most 1,000 free turns. Enrollment records the NGO and project. Additional projects receive no new grant. Vetting, re-vetting, project recreation, or reopening Discovery never replenishes the grant.
- Only vetted NGOs publish; an unvetted NGO may reach `scoped` with publishing disabled.
- The daily allowance resets to 10 at 00:00 UTC without rollover. The beta counter persists. Free capacity equals the smaller remaining daily or beta allowance. Vetting status does not change either counter. Existing v1 membership remains single-seat; future members share these project counters.
- A paid "Discovery wallet" is excluded in v1 and v1.5 (→ RM-6).

Dependencies: REQ-001.

---

#### REQ-004: AI Discovery Agent (free, rate-limited)

A conversational agent, on Claude Opus, turns intake into a scoped spec over 5–10 structured turns.

**Discovery pilot funding:** one free credit covers one completed AI reply, regardless of token usage or internal model calls. The enrolled project receives 10 free turns per day and 50 across the beta (REQ-002). If both counters have capacity, Discovery uses a free turn first, including on funded projects. Otherwise, it uses available project fuel in USD. When neither source is available, the draft persists and sending stops. Show the next daily reset only when beta capacity remains. Show ordinary fuel checkout for paid continuation. Vetting never restores free capacity.

- Discovery elicits enough from a non-technical NGO to produce a valid technical scope. Only the NGO and AI participate in this chat. The conversation persists and resumes with its question, answer, brief, and funding state intact.
- **Question progression:** reuse intake facts. Ask the next unresolved question and explain why it matters. Independent questions may share a round. Dependent questions wait for prerequisite answers. Offer suggested answers, a custom answer, and an explicit uncertainty option. The agent records uncertainty instead of inventing an answer. Answers update the visible Discovery brief. If an answer changes, mark affected dependent answers for review.
- **Discovery completion:** show the percentage and count of agreed required topics, the remaining topics, and a visible Finish Discovery action. Progress measures resolved topics, not messages, tokens, fuel, or elapsed time. Use a stable topic checklist; conditional follow-up questions belong to their topic. The agent works only on unresolved required topics and stops asking when they are resolved. Optional detail does not prolong Discovery. If a required fact stays unknown, explain the blocker instead of repeating questions or inventing certainty. Finish Discovery opens the current brief for NGO review. Enable it only when required topics are resolved, the scope is valid, and no review hold remains. It requires no available turns or paid fuel. A changed answer reopens affected topics and updates progress. The shared process bar remains separate.
- **After Discovery:** the shared project step becomes Volunteer match. The Find a volunteer action opens publication review (REQ-005). Existing vetting and human review requirements remain. ai4good coordinates the match, and the volunteer must consent. PRD work starts after consent and funding kickoff (REQ-005.5, REQ-036). Matching does not add a lifecycle state or extend the Discovery chat.
- **NGO confirmation:** valid scope output opens a review. The NGO confirms the current brief before Discovery completes (REQ-005.5). Record the approver, brief revision, and timestamp. The AI cannot approve for the NGO. Edits invalidate approval of an older revision. Reading, manual edits, reviews, and approval consume no free turns or paid AI usage.
- It reads Discovery-visible reference files, may request more mid-conversation, and may cite them; it never receives files not marked Discovery-visible (REQ-032).
- **Structured scope output:** a summary; user stories with nested acceptance criteria; a suggested stack; a complexity tier (small/medium/large — never dollars); risk flags; a data-sensitivity tier; a maintainability-fit verdict; zero to three normalized cause labels; a Lovable recommendation with rationale; and the Lovable-vs-Claude-Code build split — which parts are built in Lovable and which are coded through Claude Code. v1 always emits both parts (every match requires an Anthropic fuel kickoff) (→ RM-15).
- **Discovery output is a scope contract:** the source for the dev-authored PRD (REQ-036) and the scorer's gate reference; never decomposed into tasks directly.
- **Data-sensitivity tiers** (Discovery asks what data the tool will handle before assigning one): Tier 0 (no restriction); Tier 1 (ordinary PII — a minimization reminder and NGO data-responsibility acknowledgment); Tier 2 (special-category or high-volume PII — synthetic/anonymized fixtures only during build, the NGO connecting real data itself after completion; real Tier-2 data never reaches Anthropic, Lovable, or the volunteer). The NGO owns the exposure risk and triage confirms the tier; when unsure, Tier 2; health, immigration, abuse-victim, and financial data are never below Tier 2.
- **Maintainability fit check:** the criterion is who evolves the tool after the volunteer leaves — the maintainer, not the technology. A fit means a non-technical staffer can maintain the live app by chat, with Lovable as the durable home; internal tools (intake forms, CRUD trackers, directories, dashboards) fit by default. A need requiring ongoing developer maintenance — developer-grade, one-off, pure-backend, or Tier-2 data that cannot live in Lovable — is declined plainly, with Discovery explaining the limitation and never producing a publishable scope. No waitlist, no second track. Confidential-codebase needs are likewise declined (public-only → RM-2). Sensitive *data* is never a decline reason.
- **Decline-then-review — every fit decline is read by a person.** The fit decline is the only consequential AI judgment in v1 that reaches a decision on its own, and it is the one an unhappy party never contests, because a declined NGO simply leaves; a miscalibrated decline evaluator would therefore be invisible by construction. So the decline is delivered and reviewed, in that order. **To the NGO:** the decline arrives immediately — kind, plainly reasoned, final in the moment, no waiting state and no service-level promise — and its copy says outright that a person reads every decline and will reach out if it was wrong. **On the project:** a durable decline record — cause, date, and the reshaping suggestion — so the declined project stays visible in the NGO's project list instead of existing only as a chat message. **To the platform:** the decline opens a platform-admin ops item carrying the project, the decline cause, and the full Discovery conversation, with an admin notification (REQ-016). The item stays open until the founder disposes it **upheld** or **overturned**; an overturn reopens Discovery and notifies the NGO. Dispositions are recorded and are the decline evaluator's calibration dataset, exactly as the founder-review records are the triage screener's (REQ-023). No decline is auto-approved and none is unauditable.
- **Cause-taxonomy generation is self-generated and normalizing, never curated.** Discovery emits the project's cause labels (zero to three) from the org profile's mission text, the intake description, and the Discovery conversation itself — no NGO, admin, or platform staff ever curates or types a category list, and there is no admin taxonomy-management surface. Generation must normalize, not invent freely: it sees the labels that already exist across the system and reuses one that fits rather than minting a synonym, growing the vocabulary only when a need is genuinely new — emergent but converging, so that a volunteer tagged one way lines up with a project tagged another. Causes are optional throughout — v1 matching is concierge (a human reading the problem description), so a cause is a coarse aid, never a required input for intake, Discovery, or matching. The NGO may remove a wrongly generated label; it may never type or invent one. A project shown before Discovery has run (a `draft`) legitimately carries no cause labels at all.
- Scope is regenerable a bounded number of times (each with a logged reason) before admin escalation; regenerations and system-error retries cost zero credits.
- **One charge per turn:** reserve one free turn atomically before dispatch and consume it only when the reply completes. Automatic retries belong to that turn. Failed turns release the reservation. The funding mode stays fixed throughout the turn. Never convert part of a free reply into a paid charge. Free file upload consumes no turn and requires no spending confirmation. File processing follows the selected turn mode. Bounded scope regeneration retains its zero-credit exemption.
- **Free-first routing:** after the daily reset, eligible replies use free turns again. If the beta allowance is exhausted, daily resets provide no further free replies. Buying fuel does not increase either allowance. Free calls use a platform-funded provider budget. Paid calls use the project fuel budget. Paid fuel exhaustion cannot block eligible free calls. Provider reconciliation must never charge free usage to the NGO.
- **Paid Discovery metering:** the API reports usage; the backend calculates USD from each call's model, service configuration, and versioned rates. Price uncached input, cache reads, cache writes by duration, output, and separately billed tools without overlap. Sum internal calls once. Preserve fractional cents. Reserve an authorized paid amount before dispatch. Settle reported usage once per request and turn. Missing usage remains pending. Apply the existing 15% configurable platform fee, locked per turn, at consumption and show it separately. Provider billing reconciliation posts visible adjustments, never a second charge for the same usage (REQ-006/034).
- **Discovery interface:** use the agreed question workspace and live brief in `design/discovery-ui-contract.md`. Inherit the application font and shared theme variables from `src/styles.css`. Show only the current gate's usage gauge. Show today's free turns, remaining beta turns, paid USD available, and the next reply's Free or Paid mode before Send. Free quota has no dollar conversion. Show each completed turn's charge and any pending settlement. Gauge colors use the unrounded percentage consumed: green below 80%, yellow from 80% through 95%, and red above 95% through 100%. Keep text labels alongside color. No other gate's gauge appears inside Discovery. Remaining paid allocation becomes available to the next gate after NGO approval, retaining pending reservations. No transfer creates money, changes the project's total fuel, or converts free quota into dollars.
- **Free-turn scope guardrails:** unrelated tasks receive a scope redirect. There is no per-conversation turn ceiling: the NGO can say stop at any time, and Discovery then wraps up with the open questions listed. When a free-turn quota runs out, Discovery offers scope review or paid continuation. A new conversation does not replenish daily or beta counters. Repeated off-topic requests show a notice and flag the conversation for founder visibility, without lockout. These rules follow the selected free mode even when the project has fuel. Paid turns use the cost display and fuel gauge without the free scope guardrails.
- **Abuse guardrails:** email verification precedes every Discovery message. Cohort admission and daily and beta counters bound the number of sponsored replies, not their dollar cost. Funding changes no model, service priority, or allowance. A per-NGO admin kill switch exists. Admins cannot issue supplemental free grants. The cohort admission cap does not stop other enrolled NGOs when one NGO exhausts its quota. Free counters stay outside the money ledger. Free credits are never purchased.

**No dollar estimation in v1:** the scope doc shows the complexity tier with rationale and links Lovable's public pricing where recommended; the NGO picks its fuel amount at funding ($50 minimum), topping up reactively (→ RM-16). The rendered doc plainly explains the tier and start-small advice, maintenance (the NGO evolves by chat for roughly the ~$25/mo Lovable subscription, paid directly, and owns the code), and the data tier (Tier 2 renders fixtures-only).

Dependencies: REQ-003.

---

#### REQ-005.5: Project Lifecycle State-Transition Table

Nine states: `draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`, `completed`, `cancelled`. Every transition has an actor, preconditions, side effects, and failure handling. Abandonment/rematch (`in_progress → open`, REQ-027) is a transition, not a tenth state.

> **No `paused` state in v1.** A pause is a support conversation: pre-match, the NGO unpublishes or cancels; mid-build, an admin revokes access with a note, or the project is cancelled. (→ RM-17)

Transition rules:

- Any NGO — including unvetted — can create a draft. Vetting gates publishing, never Discovery.
- draft → Discovery requires submitted intake, an email-verified NGO admin, and Discovery capacity (free credits or funded fuel); otherwise the transition is blocked and the NGO is shown its remedies (verify, fund now, or return later).
- Discovery completion → `scoped` requires valid output and the NGO's explicit confirmation of that output revision. Record the actor, revision, and timestamp. Before confirmation, remain `discovery_in_progress`. A stale approval or approval from another actor cannot advance the project. Invalid output receives bounded retries, then admin escalation. A valid retry still requires NGO confirmation.
- **`discovery_in_progress` → `cancelled` on a Discovery fit decline** (REQ-004): a maintainability or confidential-codebase decline lands in the same terminal state a review decline does, rather than inventing a tenth state. Actor: the Discovery fit check — the only machine-initiated cancellation in the table. Side effects: the durable decline record on the project, the platform-admin ops item and its notification, the NGO's decline message, and the ordinary cancellation effects for a Discovery-stage project — no keys or volunteer exist yet, and any funded fuel returns to the NGO's general balance, which auto-applies at its next funding.
- **`cancelled` → `discovery_in_progress` — the one reverse transition, admin-only, machine-declines only.** Available solely to the platform admin, solely when disposing a fit-decline ops item as *overturned*, and audited. Every cancellation a human chose stays irreversibly terminal: the NGO's own cancellation below, and the triage decline (REQ-023). The asymmetry is the point — only a cancellation that no human decided can be undone.
- `scoped` → `triage` on Publish (vetted only). Every publish enters the founder review queue (an AI advisory pass attaches per-check evidence, never a decision — REQ-023); the reviewer either approves → `open`, returns to `scoped` with a reason note (edit and republish re-enters review), or declines → `cancelled` (terminal; only for needs that editing cannot fix). No automated path to `open` exists.
- `open` → `matched_pending_fuel` on volunteer consent to a concierge match (admin-created, binding, no NGO approve/decline; drawn from the candidate pool). The first-match disclaimer is satisfied at the consent click (GitHub is already linked at signup). One match at a time per project; the match log tracks the rest.
- `matched_pending_fuel` → `in_progress` on funding (≥ $50): kickoff fires. If unfunded after 7 days the project returns to `open`, the volunteer is freed and notified, and the NGO gets the funding-expired notice with a restart CTA (REQ-016). The NGO may cancel pre-payment.
- `in_progress` → `completed` when all P0 requirements are done and the repo exists (no formal handoff ceremony — REQ-012): leftover fuel → general-balance credit; keys revoked and the provider workspace archived; Linear membership removed and the final task history preserved; completion credit and first-tool badge recorded. The NGO owns the live app and repo throughout and offboards the volunteer and ai4good's monitoring account self-serve. No tip in v1.
- Abandonment/rematch (REQ-027): after 21 days of no code/task activity, or a manual release, the ex-volunteer's platform-controlled access — repo, keys, Linear — is revoked automatically, never waiting on the NGO; Lovable membership has no removal API, so the NGO removes the ex-volunteer on the platform's prompt. **Remaining fuel stays on the project.** The departing volunteer's assigned tasks return to the backlog; blockers tied to the departed volunteer or their setup are archived or retargeted before the project re-lists (REQ-024); the departure is flagged ghosted vs released-for-cause; the project re-opens with rematch priority.
- `open` → `scoped` ("unpublish to revise") any time before consent; a pending match is notified and released.
- Any pre-completion state → `cancelled` by the NGO: keys revoked; fuel → general balance; the volunteer notified; the thread read-only (terminal).
- Operational blockers (REQ-024) are independent of `in_progress`, never lifecycle states.

Match records track their own states — invited / consented / declined / expired / released — in the match log (REQ-007); an unfunded expiry frees the volunteer for re-match. (→ RM-8)

**Kickoff sequence** (side effects fire in parallel on funding):
- The project's reserved provider workspace+key pair (reserved at checkout, REQ-009) is bound and its virtual key issued, with no ops task.
- A Linear workspace is assigned; unavailability raises an urgent ops task + blocker.
- The repo is established by the NGO and volunteer with no platform-admin involvement (REQ-021, required before completion).
- The Linear workspace is seeded with the one bootstrap item — author the project PRD from the Discovery scope (REQ-036); the build backlog decomposes only after the automated completion gate.
- The funded/kickoff status is announced, the comment thread opens, and the volunteer is notified with setup instructions.

Provisioning failures never invent a sub-state — the project stays `in_progress` and gaps surface as blockers/ops tasks, gating the volunteer only from the pending resource.

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

**Ledger:** every money movement lands in one auditable ledger and all balances derive from it. Paid project usage remains isolated by provider workspace. Free Discovery uses a separate platform-funded budget and never reduces NGO fuel. Platform-owned paid Discovery has the following request-metering exception. Build gateway accounting remains unchanged.
- **Paid Discovery exception:** response usage and versioned rates create provisional consumption with a separately recorded platform fee. Reserve before dispatch, settle each request once, and retain unresolved reservations while usage is pending. Nightly provider reconciliation adjusts those entries to billed cost without duplicating consumption. Free calls never enter the NGO money ledger. Transfers between approved gate allocations move available authority only; pending consumption stays reserved. Project fuel returns to the general balance only under the existing completion and cancellation rules.
- **Provider-truth (build and assistant), two speeds:** the provider's reporting **per workspace** is the single source of truth for each project's AI spend and fuel state — the platform monitor prices the provider's per-workspace usage report at the provider's official rate card each minute for the live gauge and the 20/5/0% thresholds (provisional), and the books conform nightly to the provider's billed cost (final; Stripe is the same truth for money-in). A payment's gross amount funds a provider budget of gross ÷ (1 + share rate); the share is recognized only at consumption. Corrections are audited and visible; only undecidable drift needs a human — it never touches the books and is surfaced to the platform admin (REQ-030).
- **The zero-fuel stop executes at the provider:** when the project's provider budget is consumed, the platform sets the project's provider key inactive and the provider rejects further requests (REQ-009); the gateway does not gate — it proxies the provider's rejection. Any per-request usage the gateway captures is attribution telemetry (REQ-034), never the money ledger.
- **Checkout requires reserved provider inventory:** a funding checkout opens only when a pre-created provider workspace+key pair and a workspace slot are reserved for the project (REQ-009); with none available, checkout is blocked BEFORE payment — money is never taken against missing capacity.

Control totals are reconciled and auto-repaired by the same provider-truth rules (→ RM-18). Match expiry (7 days) is automatic.

**Unused fuel — non-cash credit (Promise §7):**

- **Nothing is ever pre-committed to Anthropic:** the platform pays Anthropic only for actual usage (pay-as-you-go), and each project's usage is isolated in and reported per its own provider workspace. Neither cancellation nor volunteer release strands money at Anthropic — the unconsumed balance never left the platform. On cancellation (as at completion) the workspace is archived, freeing its slot; on a volunteer release the workspace persists so the successor inherits it with the project's fuel and spend history intact (REQ-009).
- **There is no cash-out or withdrawal in v1** — no money-out path; only chargeback risk survives.
- Leftover fuel **stays on the project** across a volunteer change.
- Only at completion or cancellation does leftover credit release to the **general balance**, and only after the provider's final cost settlement for the workspace has landed (so late billing can never over-credit): non-cash, with no decay clock, no silent auto-renew, and never silently removed; it auto-applies at any of the NGO's funding checkouts, satisfying the $50 minimum with any remainder on card. The release is a ledger operation under control totals, never a manual balance tweak, and it respects chargeback clawback. No donation flow, manual conversions, or tax receipts.
- No cash refunds of any kind, not even admin-initiated. A genuinely-wronged NGO is made whole in general-balance credit; the only money-out surface is Stripe's dispute process.
- The NGO dashboard shows the general balance as redeployable credit with no expiry.

**v1 top-up is manual** — the 20% warning and 0% blocker drive top-up from the project page (→ RM-7).

**Chargebacks:** on a dispute the platform immediately freezes the NGO (no new funding or matching), cuts the project's AI access, claws back the unconsumed balance, books the consumed portion as loss, and opens an admin review; the audit-logged acknowledgment (timestamp + IP) is submitted as the Stripe dispute evidence. Loss is bounded by no-cash-out, the first-fund cap, and rapid cutoff (→ RM-19); pilot losses are absorbed from operating funds. Collusion / shared payment-fingerprint detection is out of v1 — concierge hand-vetting of every pairing, no-cash-out, and caps are the control (→ RM-20).

Concierge/admin work items (vetting, task-system provisioning, chargeback reviews, incidents) are tracked and prioritized against their service targets.

Dependencies: REQ-001, REQ-002, REQ-004, REQ-008, REQ-009.
