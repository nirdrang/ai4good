# AT-REQ-015 — Per-Project Comment Thread (v1)

Source: requirements/req-015.md (prd-mvp.md REQ-015). Dependencies: REQ-005.5, REQ-010, REQ-016, REQ-025, REQ-026.

**Boundary note:** REQ-015 owns the thread: membership, format, posting semantics, the task-anchored comment flow, and the post-completion freeze. Notification delivery is REQ-016's; the Linear relay mechanics AT-026.05's; scope-addition protocol rules REQ-025's — `[cross:]` here.

## A. Membership & access

- **AT-015.01 (P0)** — Given the thread's implicit membership, When each actor engages: the NGO admin and the assigned volunteer can read and post; an unrelated authenticated account and an anonymous visitor can do neither; the platform admin participates ONLY when escalated (before the escalation fixture, the admin is not a thread participant; after it, they are); and Given the volunteer is RELEASED and a replacement assigned (role-transition fixture), Then the former volunteer automatically loses read/post access and the replacement automatically gains it — with NO thread-membership operation anywhere: membership is implicit from CURRENT project roles. [cx: the role-transition fixture added — a persisted ACL could have passed the static matrix] **[TENSION T7 → codex pass: an authenticated, role-restricted thread on the project page collides with REQ-010's "the page is the same for NGO admins, the assigned volunteer, platform admins, and logged-out visitors" with the assistant as "the one viewer-specific element". Reconciling candidate: REQ-010's identical-content rule covers the read-only status content; the thread (like the assistant) is an authenticated interactive element explicitly excluded — REQ-010 wording gains the thread as a second named exclusion. Held for the adversarial evaluation.]**
- **AT-015.02 (P0)** — Given any two projects, When their threads are probed, Then each thread is bound to its own project and NO cross-project direct-message surface exists anywhere (absence probe).

## B. Format & posting

- **AT-015.03 (P0)** — Given posted comments, When the thread renders, Then comments appear chronologically as plain text; a URL in a comment is auto-linked; and markdown syntax is NOT rendered (raw), code blocks are not formatted, an @-mention has no special behavior, and an attachment PAYLOAD submitted directly to the posting interface is not accepted, stored, or rendered — beyond the mere absence of an attachment control (four probes). [cx: control-absence alone let a payload-accepting backend pass]
- **AT-015.04 (P0)** — Given new comments posted since a viewer last loaded, When the viewer opens the thread, Then the current comments are shown (no real-time push is required — currency on view is); and When a party posts, Then the OTHER party is notified. [cross: REQ-016 owns delivery + the anti-spam guard]
- **AT-015.05 (P0)** — Given the shared notification emitter (the sole system-event writer [cross: AT-016.01]), When its capabilities are probed, Then NO thread-post path exists from it — the universal invariant verified at the one place system events flow; and Given sampled events (a lifecycle transition, a blocker raise, a payment event — three fixtures), When each fires, Then no thread post results from any of them AND each surfaces through notifications and the activity feed [cross: REQ-016 delivery; AT-010 activity]. [cx: the universal claim pinned at the emitter, not just three samples; the surfaces-elsewhere half added]

## C. Task-anchored comments

- **AT-015.06 (P0)** — Given the NGO on the read-only status panel, When they attach a comment to a QUEUED task and to an IN-PROGRESS task (two fixtures), Then each is surfaced to the volunteer in context on that task with a notification [cross: AT-026.05 owns the relay], and the volunteer's reply becomes visible to the NGO in the project THREAD (whether it also exists in task context is unconstrained); and Given a DONE task on the same active project (negative fixture), Then no task-anchored comment can be created for it — the anchor states are queued and in-progress only. [cx: the ineligible-state negative added; the ends-on-thread exclusivity removed — the requirement says the reply returns to the thread, not that it exists nowhere else]
- **AT-015.07 (P0)** — Given routine dev-internal task chatter (volunteer/agent comments on Linear issues — fixture), When NGO surfaces render, Then none of it appears; and the NGO holds no direct task-system access. [cross: AT-026.03/04 own the Linear-side assertions]

## D. Lifecycle

- **AT-015.08 (P0)** — Given a project reaching completion, When each party attempts a post, Then it is rejected — the thread is read-only post-completion — while reading the full history still works.
- **AT-015.09 (P0)** — Given a scope-addition discussion, When it occurs, Then it lives in this thread (the acceptance protocol runs here). [cross: AT-025.01/02 own the protocol rules]
- **AT-015.10 (P0)** — Given each authorized participant, When they open the project's PAGE, Then the thread is accessible FROM that page — a project-page comment thread, not a dashboard-only or separate-route surface. [cx: added — the defining placement clause had no test]

## Coverage map

| REQ-015 clause | Tests |
|---|---|
| Membership implicit from CURRENT roles (release/reassign transitions automatic); admin only when escalated; outsiders excluded — REQ-010 identical-page tension HELD (T7) | 01 [cx, T7] |
| No cross-project DMs | 02 |
| Chronological plain text; auto-linked URLs; no markdown/code/@-mentions; attachment payloads not accepted/stored/rendered | 03 [cx] |
| Current on view (no real-time requirement); posting notifies the other party | 04 |
| System events never post (verified at the sole emitter + samples); they surface via notifications + activity | 05 [cx] |
| Task-anchored NGO comments (queued/in-progress only; done rejected): surfaced in context + notified; reply visible in thread | 06 [cx] |
| Dev-internal chatter never surfaces; NGO never touches the task system | 07 |
| Post-completion read-only | 08 |
| Scope-addition discussions live here | 09 |
| A PROJECT-PAGE thread (placement) | 10 [cx] |
