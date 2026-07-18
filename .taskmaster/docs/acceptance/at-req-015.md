# AT-REQ-015 — Per-Project Comment Thread (v1)

Source: requirements/req-015.md (prd-mvp.md REQ-015). Dependencies: REQ-005.5, REQ-010, REQ-016, REQ-025, REQ-026.

**Boundary note:** REQ-015 owns the thread: membership, format, posting semantics, the task-anchored comment flow, and the post-completion freeze. Notification delivery is REQ-016's; the Linear relay mechanics AT-026.05's; scope-addition protocol rules REQ-025's — `[cross:]` here.

## A. Membership & access

- **AT-015.01 (P0)** — Given the thread's implicit membership, When each actor engages: the NGO admin and the assigned volunteer can read and post; an unrelated authenticated account and an anonymous visitor can do neither; and the platform admin participates ONLY when escalated (before the escalation fixture, the admin is not a thread participant; after it, they are) — membership is implicit from project roles, never managed by hand.
- **AT-015.02 (P0)** — Given any two projects, When their threads are probed, Then each thread is bound to its own project and NO cross-project direct-message surface exists anywhere (absence probe).

## B. Format & posting

- **AT-015.03 (P0)** — Given posted comments, When the thread renders, Then comments appear chronologically as plain text; a URL in a comment is auto-linked; and markdown syntax is NOT rendered (raw), code blocks are not formatted, no attachment control exists, and an @-mention has no special behavior (four probes).
- **AT-015.04 (P0)** — Given new comments posted since a viewer last loaded, When the viewer opens the thread, Then the current comments are shown (no real-time push is required — currency on view is); and When a party posts, Then the OTHER party is notified. [cross: REQ-016 owns delivery + the anti-spam guard]
- **AT-015.05 (P0)** — Given system events (a lifecycle transition, a blocker raise, a payment event — three fixtures), When each fires, Then NO post appears in the thread from any of them — system events surface in notifications and activity feeds, never as thread posts.

## C. Task-anchored comments

- **AT-015.06 (P0)** — Given the NGO on the read-only status panel, When they attach a comment to a QUEUED task and to an IN-PROGRESS task (two fixtures), Then each is surfaced to the volunteer in context on that task with a notification [cross: AT-026.05 owns the relay], and the volunteer's reply returns to the THREAD — the round trip ends on the thread, not in the task system.
- **AT-015.07 (P0)** — Given routine dev-internal task chatter (volunteer/agent comments on Linear issues — fixture), When NGO surfaces render, Then none of it appears; and the NGO holds no direct task-system access. [cross: AT-026.03/04 own the Linear-side assertions]

## D. Lifecycle

- **AT-015.08 (P0)** — Given a project reaching completion, When each party attempts a post, Then it is rejected — the thread is read-only post-completion — while reading the full history still works.
- **AT-015.09 (P0)** — Given a scope-addition discussion, When it occurs, Then it lives in this thread (the acceptance protocol runs here). [cross: AT-025.01/02 own the protocol rules]

## Coverage map

| REQ-015 clause | Tests |
|---|---|
| Membership implicit from roles; admin only when escalated; outsiders excluded | 01 |
| No cross-project DMs | 02 |
| Chronological plain text; auto-linked URLs; no markdown/code/attachments/@-mentions | 03 |
| Current on view (no real-time requirement); posting notifies the other party | 04 |
| System events never post to the thread | 05 |
| Task-anchored NGO comments: surfaced in context + notified; reply returns to thread | 06 |
| Dev-internal chatter never surfaces; NGO never touches the task system | 07 |
| Post-completion read-only | 08 |
| Scope-addition discussions live here | 09 |
