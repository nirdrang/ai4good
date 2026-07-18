# AT-REQ-027 — Abandonment / Rematch (volunteer ghosts mid-project)

Source: requirements/req-027.md (prd-mvp.md REQ-027). Dependencies: REQ-005.5, REQ-007, REQ-009, REQ-016, REQ-024, REQ-026.

**Boundary note:** the state edge (`in_progress` → `open`), the auto-revocation firing, fuel-stays, tasks-to-backlog, and the ghosted/for-cause flags are asserted state-side in AT-005.5.30–33/53. REQ-027 owns the trigger definitions (14d reminder, 21d release, AND-inactivity, in_progress-only clock), the either-party manual release, revocation independence, the reputation semantics of the two flavors, and the rematch/notification set — `[cross:]` here.

## A. Triggers

- **AT-027.01 (P0)** — Given an `in_progress` project with no repo activity AND no task movement for 14 days (controlled clock), When the check runs, Then the reminder fires; just before 14 days, it has not; and Given a recent code push OR a recent task movement inside the window (two more fixtures), Then NO reminder fires — the reminder uses the same AND-silence predicate as the release. [cx: wrong-OR-predicate negatives added at the reminder threshold]
- **AT-027.02 (P0)** — Given continued dual silence reaching 21 days, When the check runs, Then auto-release fires; either a code push OR a task movement inside the window prevents it — the trigger requires silence in BOTH signals. [cross: AT-005.5.30/53 own the release + activity-prevents mechanics]
- **AT-027.03 (P0)** — Given a project that sits in `matched_pending_fuel` for MORE than 21 silent days (controlled clock) and then enters `in_progress`, When the check runs at entry and just after, Then NO reminder or release fires immediately — the thresholds measure from `in_progress` entry, proving no time accrued outside the state; and Given the remaining non-`in_progress` states (sweep), When time passes in each, Then no reminder or release fires there. [cx] [cx r2: accrual disproven by the enter-after-21-silent-days fixture, not just suppression; full state sweep]
- **AT-027.04 (P0)** — Given a manual release, When either the owning NGO or the assigned volunteer initiates it WITH a reason, Then it succeeds for both actors; without a reason, it is rejected. [cross: AT-005.5.47 owns the wrong-actor matrix]

## B. Release mechanics

- **AT-027.05 (P0)** — Given a release fires against a volunteer whose account is fully ACTIVE (no suspension, no AUP action), When it executes, Then all platform-controlled ex-volunteer access — repo, AI keys, Linear — is revoked with each revocation attributed to the RELEASE action, and AFTER the release the account is still ACTIVE with zero suspension/AUP events on its record — the release did not route through the suspension machinery. [cx r2: post-release account-state + attribution asserted — a suspend-during-release implementation could have passed] [cross: AT-005.5.30/AT-009.25]
- **AT-027.06 (P0)** — Given the release, When Lovable access is handled, Then the NGO receives the platform's removal prompt (Lovable has no removal API — the NGO acts). [cross: AT-005.5.30]
- **AT-027.07 (P0)** — Given the departing volunteer's work, When the release completes, Then in-progress tasks are back in the backlog while done work and history are preserved (done issues, merged code, comments untouched). [cross: AT-005.5.33/AT-026.21]
- **AT-027.08 (P0)** — Given remaining fuel at release, When the project re-opens, Then the fuel stays on the project — no refund path exists for the release event. [cross: AT-005.5.32/AT-006.32]

## C. Ghosting vs release-for-cause

- **AT-027.09 (P0)** — Given a 21-day timeout release and a manual for-cause release (two fixtures), When each record is read, Then the ghosting is recorded distinctly from the for-cause release; the ghosting affects the volunteer's outreach/reputation signal (observable on the internal record), and the for-cause release produces NO negative reputation/outreach delta, downgrade, or suppression — a neutral record event is permitted; byte-for-byte signal equality is NOT required. [cx r2: "unchanged" over-asserted — the requirement bars automatic penalty, not any representation change] [cross: AT-005.5.31 owns the flag firing]

## D. Rematch & notifications

- **AT-027.10 (P0)** — Given a TIMEOUT release and a MANUAL release (two fixtures), When each project re-lists, Then in BOTH cases it is `open` with concierge rematch priority (observable flag on the matching queue), the NGO is notified, and the prior match records are closed in the match log. [cx: parameterized over both release paths — a manual-release implementation could have skipped the downstream] [cross: AT-005.5.33/AT-007.17]
- **AT-027.11 (P0)** — Given both release paths, When each notification moment arrives, Then the released notice and the rematch-available notice fire for BOTH paths; the 14-day reminder is governed solely by the dual-inactivity condition (AT-027.01) — a project may receive it and then be manually released — and initiating a manual release does not itself emit an additional reminder. [cx] [cx r2: "reminder fires for timeout path only" was wrong — eligibility is the 14-day condition, not the eventual release type] [cross: REQ-016 owns delivery]

## Coverage map

| REQ-027 clause | Tests |
|---|---|
| 14d reminder / 21d auto-release; AND-silence predicate proven at BOTH thresholds | 01, 02 |
| No accrual outside in_progress (proven via enter-after-silence fixture) + full non-in_progress state sweep | 03 [cx r2] |
| Manual release by either party, reason required | 04 |
| Release revokes platform-controlled access as its own attributed action; account stays ACTIVE, zero suspension/AUP events | 05 [cx r2] |
| Lovable removal = NGO on platform prompt | 06 |
| Tasks → backlog; done work + history preserved | 07 |
| Fuel stays on the project — no refund | 08 |
| Ghosting vs for-cause: distinct records; reputation semantics (signal vs no negative delta — neutral events permitted) | 09 [cx r2] |
| Re-open with rematch priority; NGO notified; prior matches closed — BOTH release paths | 10 |
| Notifications per path (released + rematch both; reminder governed by the 14-day condition alone) | 11 [cx r2] |
