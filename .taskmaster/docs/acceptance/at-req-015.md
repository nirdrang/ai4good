# AT-REQ-015 — Per-Project Comment Thread (v1)

Source: requirements/req-015.md (prd-mvp.md REQ-015). Dependencies: REQ-005.5, REQ-010, REQ-016, REQ-025, REQ-026.

**Boundary note:** REQ-015 owns the thread: membership, format, posting semantics, the requirement-anchored comment flow (anchors are PM-tree requirement items only — d86), and the post-completion freeze. Notification delivery is REQ-016's; the Linear relay mechanics AT-026.05's; scope-addition protocol rules REQ-025's — `[cross:]` here.

## A. Membership & access

- **AT-015.01 (P0)** — Given the thread's implicit membership, When each actor engages: the NGO admin and the assigned volunteer can read and post; an unrelated authenticated account and an anonymous visitor can do neither; the platform admin participates ONLY when escalated (before the escalation fixture, the admin is not a thread participant; after it, they are); and Given the volunteer is RELEASED (fixture), Then IMMEDIATELY after the release — before any reassignment — the former volunteer has lost read/post access; and separately, When a replacement is later assigned, Then the replacement gains access at assignment — with NO thread-membership operation anywhere: membership is implicit from CURRENT project roles. [cx: role-transition fixture] [cx r2: the two transitions asserted at their own boundaries — retain-until-reassignment would have passed the combined check] **[Resolved — d80 T7, founder-ruled + codex-amended: PARTICIPANTS-ONLY read and post — the project's NGO account, the currently assigned volunteer, and the platform admin only while escalated; role changes update access automatically; post-terminal, authorized readers retain history while posting is disabled. REQ-015 now states the read rule explicitly; REQ-010's exception-counting replaced by the two-layer contract (identical public status PROJECTION + role-gated communications/controls per their owning requirements). This test's restricted-read assertions are now requirement-backed.]**
- **AT-015.02 (P0)** — Given any two projects, When their threads are probed, Then each thread is bound to its own project and NO cross-project direct-message surface exists anywhere (absence probe).

## B. Format & posting

- **AT-015.03 (P0)** — Given posted comments, When the thread renders, Then comments appear chronologically as plain text; a URL in a comment is auto-linked; and markdown syntax is NOT rendered (raw), code blocks are not formatted, mention syntax stays literal plain text — no profile link, no autocomplete resolution, no mention-specific notification (three observables) — and an attachment PAYLOAD submitted directly to the posting interface is not accepted, stored, or rendered. [cx: payload probe] [cx r2: "@-mention has no special behavior" given its three observables]
- **AT-015.04 (P0)** — Given new comments posted since a viewer last loaded, When the viewer opens the thread, Then the current comments are shown (no real-time push is required — currency on view is); and When the NGO posts and separately the volunteer posts (both directions), Then the other party is notified in each; and Given an ESCALATED admin participating, When they post, Then both ordinary parties are notified (the admin is "the other party" to neither exclusively). [cx r2: both directions + the escalated-admin recipient case — one direction could have passed] [cross: REQ-016 owns delivery + the anti-spam guard]
- **AT-015.05 (P0)** — Given the THREAD WRITE BOUNDARY, When probed, Then it accepts only authenticated user-authored comments from thread participants — no system/service identity can post (the invariant verified where writes land, not at the emitter, which is REQ-016's sole NOTIFICATION writer, not the sole event producer); and Given sampled events exercised against that boundary (a lifecycle transition, a blocker raise, a payment event), When each fires, Then no thread post results, each surfaces through its NOTIFICATION [cross: REQ-016], and the TASK-TIED events additionally surface in the activity feed — the payment event is asserted through notification + thread-absence only (REQ-010's feed is task-tied; REQ-015's "notifications and activity feeds" reads distributively, each event through its applicable channels — T9 note). [cx] [cx r2: invariant moved to the write boundary; the payment-vs-task-tied-feed conflict resolved per the distributive reading]

## C. Requirement-anchored comments

- **AT-015.06 (P0)** — Given the NGO on the read-only status panel, When they attach a comment to a QUEUED requirement item and to an IN-PROGRESS requirement item (two fixtures), Then each is surfaced to the volunteer in context on that requirement's PM-tree item with a notification [cross: AT-026.05 owns the relay], and the volunteer's reply becomes visible to the NGO in the project THREAD (whether it also exists in item context is unconstrained); Given a DONE requirement item on the same active project (negative fixture), Then no requirement-anchored comment can be created for it — the anchor states are queued and in-progress only; and When the NGO attempts item MUTATIONS from that same panel (status change, assignment, metadata edit — three probes), Then each is rejected with no state change while requirement-anchored commenting remains available — the panel is read-only plus comments. [cx: ineligible-state negative; exclusivity removed] [cx r2: the read-only half of "from the read-only status panel" made an assertion, not a Given] [d86: anchors are PM-tree requirement items, never dev-tree items]
- **AT-015.07 (P0)** — Given routine dev-internal task chatter (volunteer/agent comments on Linear issues — fixture), When NGO surfaces render, Then none of it appears; and the NGO holds no direct task-system access. [cross: AT-026.03/04 own the Linear-side assertions]

## D. Lifecycle

- **AT-015.08 (P0)** — Given a project reaching completion, When each party attempts a post, Then it is rejected — the thread is read-only post-completion — while AUTHORIZED readers (the participants, per d80) still read the full history; an unrelated account and an anonymous visitor still cannot read it. [d80: reader set pinned to participants post-terminal]
- **AT-015.09 (P0)** — Given a scope-addition discussion, When it occurs, Then it lives in this thread (the acceptance protocol runs here). [cross: AT-025.01/02 own the protocol rules]
- **AT-015.10 (P0)** — Given a thread-bearing project AT or AFTER kickoff, When each authorized participant opens the project's PAGE, Then the thread is accessible FROM that page — a project-page comment thread, not a dashboard-only or separate-route surface; pre-kickoff states carry no thread-access obligation. [cx: added] [cx r2: lifecycle-scoped — an assigned volunteer exists in matched_pending_fuel but the thread opens at kickoff]

## Coverage map

| REQ-015 clause | Tests |
|---|---|
| Membership implicit from CURRENT roles (release loses access pre-reassignment; replacement gains at assignment); admin only when escalated; outsiders excluded — T7 resolved d80 (participants-only read) | 01 [cx r2, d80] |
| No cross-project DMs | 02 |
| Chronological plain text; auto-linked URLs; no markdown/code; literal mentions (3 observables); attachment payloads not accepted/stored/rendered | 03 [cx r2] |
| Current on view; posting notifies BOTH directions + escalated-admin case | 04 [cx r2] |
| System events never post (thread write boundary accepts participant comments only); each notifies; task-tied ones hit the feed (distributive reading, T9) | 05 [cx r2] |
| Requirement-anchored NGO comments (queued/in-progress items only; done rejected); panel mutations rejected; reply visible in thread | 06 [cx r2] [d86] |
| Dev-internal chatter never surfaces; NGO never touches the task system | 07 |
| Post-completion read-only | 08 |
| Scope-addition discussions live here | 09 |
| A PROJECT-PAGE thread (placement) | 10 [cx] |
