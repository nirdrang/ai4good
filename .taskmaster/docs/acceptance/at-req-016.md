# AT-REQ-016 — Notifications (Email + In-App)

Source: requirements/req-016.md (prd-mvp.md REQ-016, incl. d78 watchdog row). Dependencies: REQ-005.5, REQ-006, REQ-009, REQ-015, REQ-023, REQ-024, REQ-027.

**Boundary note:** REQ-016 owns the emitter, the static taxonomy (event → recipients → delivery), the defaults, and the critical-event reliability guard. The EVENTS themselves fire from their owning requirements (blockers REQ-024, money REQ-006, abandonment REQ-027, triage REQ-023…) — those suites assert THAT the event fires; this suite asserts WHO is notified, HOW, and the delivery semantics — `[cross:]` throughout.

## A. Single writer & static taxonomy

- **AT-016.01 (P0)** — Given the notification architecture, When its senders are probed, Then the ONE shared emitter is the sole writer — blockers, scope additions, and lifecycle code paths hold no direct send capability (a sentinel event raised in each of the three domains reaches recipients only via the emitter, and no other component holds sender credentials/paths).
- **AT-016.02 (P0)** — Given a sentinel event type NOT in the static taxonomy, When emission is attempted, Then it is rejected and nothing sends — the taxonomy is closed and static.
- **AT-016.03 (P0)** — Given the full v1 taxonomy table (every row of the requirement's event → recipients → delivery list, parameterized), When each event fires from a fixture, Then EXACTLY the named recipients receive it on the named channels — no extra recipient, no missing recipient, no extra channel. Representative rows called out: triage approved → NGO (email + in-app); candidacy marked → admin ONLY (never the NGO); fuel 20% → NGO while 5%/depleted → both; task status changed → NGO in-app low-tone; PM status auto-reverted → volunteer (in-app, low-tone); watchdog failed closed → platform admin (email + in-app) [d78].
- **AT-016.04 (P0)** — Given the negative halves of sensitive rows, When probed: the NGO never receives candidacy/match-log events; the volunteer never receives the NGO's vetting outcome; no donation event exists on leftover release (three probes). [cross: AT-007/002/006 own the underlying flows]

## B. Delivery defaults

- **AT-016.05 (P0)** — Given one critical event of each class (money, deadline, blocker, completion, decision — five fixtures), When each delivers, Then each goes out by EMAIL (plus any named in-app); and Given a low-tone event (task status changed), Then it is in-app ONLY — no email.
- **AT-016.06 (P0)** — Given the documented defaults, When inspected, Then a per-event default exists in the documentation for every taxonomy row — documented defaults, not implicit behavior.
- **AT-016.07 (P0)** — Given one committed event, When delivery runs (including after a process restart mid-flight — fixture), Then each recipient receives exactly ONE notification for it — one notification per committed event, no duplicates.
- **AT-016.08 (P0)** — Given a burst of thread comments (fixture), When notifications deliver, Then the anti-spam guard bounds them (the configured guard behavior engages, and every distinct conversation still surfaces — no silent total suppression). [cross: REQ-015]

## C. Critical-event reliability guard

- **AT-016.09 (P0)** — Given a money-class event, When its ledger/state transition commits, Then the notification event is written ATOMICALLY with it — an induced crash between transition and event write is impossible by construction (fixture: the induced fault either rolls back both or commits both; no transition-without-event state is reachable).
- **AT-016.10 (P0)** — Given an event created while recipient X holds a role, When the role changes BEFORE delivery (fixture), Then delivery still goes to X — recipients resolve at event creation, not at send time.
- **AT-016.11 (P0)** — Given the provider rejects or fails to accept a critical send (sentinel failure), When delivery runs, Then the event is NOT marked sent, a retry occurs, and the notification is never silently dropped (the unconfirmed send is observable as pending/retrying); on provider acceptance, it is marked sent.
- **AT-016.12 (P0)** — Given an escalation-tier event (Lovable credits blocked — fixture), When it delivers, Then BOTH the NGO and the platform admin are notified.

## Coverage map

| REQ-016 clause | Tests |
|---|---|
| One shared emitter, sole writer; domains never send directly | 01 |
| Static closed taxonomy (unknown event rejected) | 02 |
| Full taxonomy: exact recipients + channels per row (incl. d78 watchdog row) | 03 |
| Sensitive negatives (candidacy never → NGO; no donation event; vetting → NGO only) | 04 |
| Email for critical classes; in-app only for low-tone | 05 |
| Documented defaults per event | 06 |
| One notification per committed event | 07 |
| Thread-comment anti-spam guard | 08 |
| Atomic write with ledger/state transition | 09 |
| Recipients resolve at creation | 10 |
| Sent only on provider acceptance; retry; never silently dropped | 11 |
| Escalation tier → NGO + platform admin | 12 |
