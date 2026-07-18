# AT-REQ-027 — Abandonment / Rematch (volunteer ghosts mid-project)

Source: requirements/req-027.md (prd-mvp.md REQ-027). Dependencies: REQ-005.5, REQ-007, REQ-009, REQ-016, REQ-024, REQ-026.

**Boundary note:** the state edge (`in_progress` → `open`), the auto-revocation firing, fuel-stays, tasks-to-backlog, and the ghosted/for-cause flags are asserted state-side in AT-005.5.30–33/53. REQ-027 owns the trigger definitions (14d reminder, 21d release, AND-inactivity, in_progress-only clock), the either-party manual release, revocation independence, the reputation semantics of the two flavors, and the rematch/notification set — `[cross:]` here.

## A. Triggers

- **AT-027.01 (P0)** — Given an `in_progress` project with no repo activity AND no task movement for 14 days (controlled clock), When the check runs, Then the reminder fires; just before 14 days, it has not.
- **AT-027.02 (P0)** — Given continued dual silence reaching 21 days, When the check runs, Then auto-release fires; either a code push OR a task movement inside the window prevents it — the trigger requires silence in BOTH signals. [cross: AT-005.5.30/53 own the release + activity-prevents mechanics]
- **AT-027.03 (P0)** — Given a project that spends time in `matched_pending_fuel` or returns briefly to `open` (fixtures), When inactivity is computed, Then only time spent `in_progress` counts — the clock pauses outside `in_progress`.
- **AT-027.04 (P0)** — Given a manual release, When either the owning NGO or the assigned volunteer initiates it WITH a reason, Then it succeeds for both actors; without a reason, it is rejected. [cross: AT-005.5.47 owns the wrong-actor matrix]

## B. Release mechanics

- **AT-027.05 (P0)** — Given a release fires against a volunteer whose account is fully ACTIVE (no suspension, no AUP action), When it executes, Then all platform-controlled ex-volunteer access — repo, AI keys, Linear — is revoked as the release's own action, proving no dependency on account suspension. [cross: AT-005.5.30/AT-009.25]
- **AT-027.06 (P0)** — Given the release, When Lovable access is handled, Then the NGO receives the platform's removal prompt (Lovable has no removal API — the NGO acts). [cross: AT-005.5.30]
- **AT-027.07 (P0)** — Given the departing volunteer's work, When the release completes, Then in-progress tasks are back in the backlog while done work and history are preserved (done issues, merged code, comments untouched). [cross: AT-005.5.33/AT-026.21]
- **AT-027.08 (P0)** — Given remaining fuel at release, When the project re-opens, Then the fuel stays on the project — no refund path exists for the release event. [cross: AT-005.5.32/AT-006.32]

## C. Ghosting vs release-for-cause

- **AT-027.09 (P0)** — Given a 21-day timeout release and a manual for-cause release (two fixtures), When each record is read, Then the ghosting is recorded distinctly from the for-cause release; the ghosting affects the volunteer's outreach/reputation signal (observable on the internal record), and the for-cause release carries NO automatic penalty (the signal is unchanged). [cross: AT-005.5.31 owns the flag firing]

## D. Rematch & notifications

- **AT-027.10 (P0)** — Given the release completes, When the project re-lists, Then it is `open` with concierge rematch priority (observable flag on the matching queue), the NGO is notified, and the prior match records are closed in the match log. [cross: AT-005.5.33/AT-007.17]
- **AT-027.11 (P0)** — Given the full timeline, When each notification moment arrives, Then the three fire: the 14-day reminder, the released notice, and the rematch-available notice. [cross: REQ-016 owns delivery]

## Coverage map

| REQ-027 clause | Tests |
|---|---|
| 14d reminder / 21d auto-release; inactivity = no repo activity AND no task movement | 01, 02 |
| Clock runs only while in_progress | 03 |
| Manual release by either party, reason required | 04 |
| Release revokes platform-controlled access as its own action (no suspension dependency) | 05 |
| Lovable removal = NGO on platform prompt | 06 |
| Tasks → backlog; done work + history preserved | 07 |
| Fuel stays on the project — no refund | 08 |
| Ghosting vs for-cause: distinct records; reputation semantics (signal vs no automatic penalty) | 09 |
| Re-open with rematch priority; NGO notified; prior matches closed in log | 10 |
| Notifications: reminder / released / rematch available | 11 |
