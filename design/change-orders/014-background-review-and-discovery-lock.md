# Change order 014: projects public from intake, background review, Discovery freezes at PRD start

Date: 2026-10-06. Decision d96. AI4DEV-212 (background review instead of a publish gate).

## Founder rulings, in the founder's words

In the session of 2026-10-06, while the controller was checking whether the publishing requirement was ready to build. Option choices are quoted as the founder picked them; later rulings replace earlier ones where marked.

- "With the new discovery we have review of the discovery all along. We should be able to let ngo review and edit the discovery through the discover screen this is our discovery editing panel of glass. Post volunteer match this screen should be in read only and not available for changes"
- Asked at which moment the screen becomes read-only, the founder first chose "Volunteer consent (Recommended)". Replaced later the same day: "As long as the state is not that the volunteer is in the prd step ngo can edit discovery. Once volunteer start the step it captures the discovery doc state freeze it and make the discover screen read only", then "When volunteer enter the yet to be designed prd screen which he owns post matching and start working on it", and "When volunteer start to work in prd the discovery is closed".
- Asked whether an edit after publishing goes back to review: "Why the need for admin review". After the controller explained the d74 gate: "Review is a later stage that is not a gate to walk through this is a governance background guardrail"
- Asked whether the vetted-NGO publish gate stays: "Yes for 1."
- Asked when a published project enters the review queue, the founder chose "First publish only". Replaced when visibility moved to intake: the founder chose "First time it is visible (Recommended)".
- On what the public sees: "Sees a change where ? If you are talking about the project card in the market place this should only highlight the status of the project e.g state and maybe later a progress or cadence and not the fact that edit’s happens"
- "Until ngo not completed discovery the state is still intake volunteer can see the project t card with intake need not the discovery since it’s not gated yet by ngo". Asked to confirm, the founder chose "Yes, from intake".
- Asked whether an unvetted NGO's intake is public: "Every NGO".
- Asked what a volunteer can do with an intake card: "Look and mark interest (Recommended)".
- Asked when the intake card becomes visible: "On submit; title + need (Recommended)".
- Asked how to handle personal data typed into the intake: "Warn on the form (Recommended)".
- On keep and return: "As written (Recommended)". On decline: "Any state before done (Recommended)". On the renames: "Rename publishing, Rename review".
- Asked "What is the data tier ?", the founder did not rule on it. Because the review now runs at intake, before Discovery assigns a tier, the review cannot confirm the tier; this change records Discovery's tier as final. Flagged for the founder.

These rulings loosen d74: nothing waits on a human review, and every NGO's intake is public before review. The loosening is the founder's explicit ruling above.

## What changes

- Every project is public from intake submission as an intake card (title, problem description, urgency, NGO name, state "Intake", posted date; no files), vetted or not. Volunteers can mark interest; matching waits for publish. The intake form warns that the description is public.
- The founder's review is a background queue: one item per project, when its intake card first goes public. Keep, return an `open` project to `scoped` before consent, or decline from any pre-completion state; break-glass covers the rest. The advisory pass reads the public intake and flags personal data in it; the data tier and Discovery risk flags leave the review.
- Publishing (vetted only) moves `scoped` → `open`, opens matching, and swaps the intake need on the card for the Discovery document. The lifecycle has eight states; `triage` is gone. No "under review" state exists.
- The Discovery screen is the one editor of the Discovery document until the matched volunteer starts work in the PRD screen; then the document is frozen as the PRD's source and the screen is read-only. There is no separate scope editor (screen row 8 retired).
- Cards show the project's state, never that edits happened.

## Changed requirement text, verbatim

#### REQ-005: Project Publishing

The NGO publishes the confirmed Discovery document (REQ-004), which makes the project `open` for matching. The project has been visible since intake as an intake card (REQ-005.5); publishing replaces the intake need on it with the Discovery document. There is no separate scope editor: the NGO reviews and edits the document in the Discovery screen until the matched volunteer starts PRD work. Publishing needs no pre-funded fuel (fuel is required only at volunteer acceptance — match-first) and waits on no review.

- **All projects are public MIT (Platform Promise §2):** no visibility choice. Confidential-codebase needs are declined at Discovery (→ RM-2); sensitive *data* is served as Tier-2 fixtures-only (REQ-004).
- A project may stay `scoped` indefinitely; the NGO picks its fuel amount at match acceptance.
- Publishing requires vetted status and no fuel deposit; it moves the project directly to `open`. Publishing waits on nothing; the founder's background review began when the intake card went public (REQ-023).
- The project page of a published project shows the latest confirmed revision of the Discovery document; an unconfirmed edit never reaches it. The card shows the project's state, never that edits happened.
- Unpublish to `scoped` any time before consent. A return to `scoped` by the founder's background review carries the reason note; the NGO edits in the Discovery screen and republishes.

Dependencies: REQ-004, REQ-023.

#### REQ-023: Platform Background Review (governance guardrail after a project goes public)

Visibility is never gated. A project is public from intake submission (REQ-005.5); the founder reviews it afterwards as a background governance guardrail, catching policy violations and taking the project down when needed. **v1: every project is read by the founder-reviewer once, when its intake card first goes public; an AI advisory pass assists but holds no authority.** Discovery, publishing, later edits, and republishes are not queued. The autonomous screener is deferred (→ RM-64), where the v1 review records become its calibration dataset.

**Advisory pass (evidence, never authority):** when the intake card first goes public, a structured AI review evaluates the public intake snapshot on five dimensions — open-source alignment (all projects public MIT; commercial or closed-source-for-resale work is prohibited; a confidential-codebase need is flagged categorical); nonprofit purpose against the NGO's profile and its vetting state; scope reasonableness against the stated need (abusive scope caught here); acceptable use (no surveillance, spam, illegal use); and personal data in the public text (names, health, or other personal details of beneficiaries). The data-sensitivity tier is Discovery's and final (REQ-004); the review does not confirm it. It attaches versioned per-check evidence to the queue item. It never transitions project state, never emits a keep/return/decline recommendation (evidence only), and its unavailability never blocks review — the reviewer proceeds unaided.

**Acceptance criteria:**
- [ ] The intake card going public adds the project's one item to the review queue; Discovery, publishing, later edits, and republishes add none. Nothing in intake, Discovery, publishing, listing, or matching waits on the queue.
- [ ] The reviewer has exactly three actions: **keep** (no transition), **return to `scoped`** (only while `open` with no volunteer consent; closes matching and returns the card to the intake need, releases a pending match, and sends the NGO a reason note; the NGO edits in the Discovery screen and republishes without a new queue item; prior notes visible), or **terminal decline** (→ `cancelled` from any pre-completion state, with the ordinary cancellation side effects; non-remediable — cannot be edited and resubmitted). A project still in intake or Discovery, or past consent, that needs taking down without a decline is hidden with break-glass (REQ-031).
- [ ] Every decision is recorded: reviewer, timestamp, decision, reason, per-check dispositions, policy version, advisory output + version (or its recorded absence), the public intake snapshot — the record doubles as RM-64's evaluation dataset.
- [ ] Queue items expose their age; the internal review target is end of the next business day (an ops target, never an NGO-facing SLA). v1 names no backup reviewer — the queue waits during founder absence while projects stay listed, a knowingly accepted limit.
- [ ] A break-glass hide recovers a project kept in error (REQ-031).
- [ ] NGO copy: intake submission and publishing say the project is public; no "under review" state exists. A return or decline reaches the NGO with its reason (REQ-016).

#### REQ-011: Public Project Listings (v1 read-only; browse/sort/filter machinery v1.5)

v1 is a public, read-only listing of projects (newest-first), from intake submission onward, with exactly one volunteer action: marking interest ("candidate for this project"), which feeds the admin match log only. Matching is concierge (REQ-007); there is no NGO-facing apply queue, no filters/sort/scoring, and no NGO accept/decline (enforce-match). No algorithmic ranking or NGO-satisfaction weighting in v1.
- **Intake card** (from intake submission until the NGO publishes): title, problem description, urgency, NGO name, state "Intake", and posted date — the intake need as submitted, never the Discovery conversation, files, or edit activity. title, summary, complexity tier, needed skills, cause tags (zero to three, whatever Discovery generated; display only — no cause-based filter or sort exists in v1), NGO name, and posted date — static attributes only, with no live stats, no dollar figure, and no candidate/interest count (candidacies are admin-only).
- **In-progress showcase** (public): a project under build surfaces a live card modeled on a code-host's project view — requirement-tree progress, cadence (requirement progression + commit activity), the language/stack, time since last activity, the assigned contributor, and the blocker chip (noninteractive; count + `info / warning / blocking` severity only — REQ-024) — so the public sees what ai4good is building. The open-project card stays identity-only (no blocker signal, no liveness beyond the posted date). Browse/sort/filter machinery stays v1.5; **popularity metrics (stars/forks/watchers) are never shown**.
- (→ RM-8, RM-21, RM-24)

Dependencies: REQ-007.

#### REQ-003, added bullet

- **On submission the intake is public** as the project's intake card (REQ-005.5, REQ-011): title, problem description, urgency, NGO name, state "Intake", and posted date. Reference files stay private. The form says plainly, before submission, that the description will be public and must not contain names, health details, or other personal details of beneficiaries.

#### REQ-004, the Discovery document (added sentences)

- **Discovery document:** the confirmed live brief, rendered by code. It holds the need in the NGO's words; who uses the tool and how they work today; the agreed answers with their sources; how the NGO will know it works; the open questions kept, with their importance; each file with what the AI took from it; the data-sensitivity tier; the maintainability-fit verdict; and zero to three normalized cause labels. It shows no stack, complexity tier, build split, or cost. The NGO changes it through the chat or by editing the brief; the AI never rewrites the document. The Discovery screen is the one place the NGO reviews and edits the Discovery document, before and after publishing and after a match. When the matched volunteer starts work in the PRD workspace (REQ-036), Discovery closes: the document is captured as the PRD's source, frozen, and the screen becomes read-only — no chat turn, edit, or file change is accepted.

#### REQ-005.5, visibility and publish

Eight states: `draft`, `discovery_in_progress`, `scoped`, `open`, `matched_pending_fuel`, `in_progress`, `completed`, `cancelled`. Every transition has an actor, preconditions, side effects, and failure handling. Abandonment/rematch (`in_progress → open`, REQ-027) is a transition, not a ninth state. The founder's review of a publication is background work on an `open` project, never a state.
- **Public from intake.** From intake submission every project — vetted or not — shows on the marketplace as an intake card (REQ-011): the intake need, shown as state "Intake", until the NGO publishes. Volunteers may mark interest on it; matching and consent wait for `open`. The card first going public adds the project's one item to the founder's background review queue (an AI advisory pass attaches per-check evidence, never a decision — REQ-023); nothing waits on it. A `cancelled` project leaves every public surface.
- `scoped` → `open` on Publish (vetted only, owning NGO only). The card switches from the intake need to the confirmed Discovery document. No new review item. The reviewer keeps a project (no transition), returns an `open` project → `scoped` with a reason note while no volunteer has consented (a pending match is notified and released), or declines a project → `cancelled` from any pre-completion state (terminal; only for needs that editing cannot fix; ordinary cancellation side effects). The break-glass hide (REQ-031) covers everything else, including a project still in intake or Discovery and any project after consent.

## Contract edits

- `design/discovery-ui-contract.md`, section "After Discovery: volunteer matching": publishing swaps the intake card to the Discovery document and opens matching; the screen stays the editor until the volunteer starts PRD work, then freezes read-only.
- `design/ui-ux-instructions.md`: the d96 note; the admin role and navigation label; the Discovery-to-match paragraph; the lifecycle line; rows 5, 8, 9, 16 and 25.

## Acceptance tests

- New: AT-003.18 (public-intake warning and card on submit), AT-004.74 (Discovery freezes when PRD work starts), AT-005.21 (confirmed edits reach the page, no public edit signal), AT-007.32 (interest from an intake card, matching only once open), AT-011.15 (the intake card), AT-023.23 (one review item per project).
- Retired: AT-005.01 to .04 (no separate editor), AT-004.51 (review no longer confirms the tier), AT-023.08 and .22 (review runs before Discovery).
- Restated with a d96 tag: the publishing, review, lifecycle, listing and matching tests that assumed the gate or open-only listing, and the one-line mentions in the notification, dashboard, operations, moderation and scope-addition suites.

## Canvas

Not revised in this change. The intake card, the publish-to-open flow, the review queue, and the Discovery screen's frozen state need canvas work through the `ui-design` skill, as screen design items. The PRD screen that triggers the freeze is not designed yet.