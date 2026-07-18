# AT-REQ-016 — Notifications (Email + In-App)

Source: requirements/req-016.md (prd-mvp.md REQ-016, incl. d78 watchdog row). Dependencies: REQ-005.5, REQ-006, REQ-009, REQ-015, REQ-023, REQ-024, REQ-027.

**Boundary note:** REQ-016 owns the emitter, the static taxonomy (event → recipients → delivery), the defaults, and the critical-event reliability guard. The EVENTS themselves fire from their owning requirements (blockers REQ-024, money REQ-006, abandonment REQ-027, triage REQ-023…) — those suites assert THAT the event fires; this suite asserts WHO is notified, HOW, and the delivery semantics — `[cross:]` throughout.

## A. Single writer & static taxonomy

- **AT-016.01 (P0)** — Given the notification architecture, When its senders are probed, Then the ONE shared emitter is the sole writer — blockers, scope additions, and lifecycle code paths hold no direct send capability (a sentinel event raised in each of the three domains reaches recipients only via the emitter, and no other component holds sender credentials/paths).
- **AT-016.02 (P0)** — Given a sentinel event type NOT in the static taxonomy, When emission is attempted, Then it is rejected and nothing sends — the taxonomy is closed and static.
- **AT-016.03 (P0)** — Given the full v1 taxonomy table (every row of the requirement's event → recipients → delivery list, parameterized), When each event fires from a fixture, Then EXACTLY the named recipients receive it on the named channels — no extra recipient, no missing recipient, no extra channel. Representative rows called out: triage approved → NGO (email + in-app); candidacy marked → admin ONLY (never the NGO); fuel 20% → NGO while 5%/depleted → both; task status changed → NGO in-app low-tone; PM status auto-reverted → volunteer (in-app, low-tone); watchdog failed closed → platform admin (email + in-app) [d78]. PAYLOAD semantics asserted where the row names them: returned-to-scoped carries the reason; match created carries the consent CTA; consented carries the fund-to-kick-off framing; key revoked carries the replacement-on-dashboard affordance; PM auto-revert content is instructive (states what to do instead) with no penalty language. [cx: recipients/channels alone left the named payloads uncovered]
- **AT-016.04 (P0)** — Given the negative halves of sensitive rows, When probed: the NGO never receives candidacy/match-log events; the volunteer never receives the NGO's vetting outcome; no donation event exists on leftover release (three probes). [cross: AT-007/002/006 own the underlying flows]

## B. Delivery defaults

- **AT-016.05 (P0)** — Given one critical event of each class (money, deadline, blocker, completion, decision — five fixtures), When each delivers, Then each goes out by EMAIL (plus any named in-app); and Given a low-tone event (task status changed), Then it is in-app ONLY — no email.
- **AT-016.06 (P0)** — Given the documented defaults, When inspected, Then a per-event default exists in the documentation for every taxonomy row — documented defaults, not implicit behavior.
- **AT-016.07 (P0)** — Given one committed event, When delivery runs (including after a process restart mid-flight — fixture), Then exactly ONE logical notification event exists for it, and each required recipient-channel PAIR receives exactly one delivery (an email + in-app row legitimately yields two deliveries — one per channel — never two on the same pair). [cx: "one notification" disambiguated — logical event vs per-channel delivery]
- **AT-016.08 (P0)** — Given a burst of thread comments (fixture), When notifications deliver, Then the CONFIGURED anti-spam guard policy engages and deliveries conform to it — the guard's cap/window/coalescing values are configuration, not asserted numbers here. [cx: the invented every-conversation-surfaces guarantee removed — the requirement states only that a guard exists] [cross: REQ-015]

## C. Critical-event reliability guard

- **AT-016.09 (P0)** — Given one guarded transition of EACH class — money, access (key issued/revoked), and completion (parameterized fixtures), When each commits under an induced fault between transition and event write, Then atomicity holds for every class: the fault either rolls back both or commits both — no transition-without-event state is reachable in any of them. [cx: the guard names three classes; only money was exercised]
- **AT-016.10 (P0)** — Given an event created while recipient X holds a role, When the role passes to Y BEFORE delivery (fixture), Then delivery goes to X and NOT to Y — recipients resolve at event creation, not at send time (a send-time re-resolver delivering to both would fail). [cx: the newly-eligible-excluded half added]
- **AT-016.11 (P0)** — Given the provider rejects or fails to accept a critical send (sentinel failure), When delivery runs, Then the event is NOT marked sent, a retry occurs, and the notification is never silently dropped (the unconfirmed send is observable as pending/retrying); on provider acceptance, it is marked sent; and Given the ambiguous outcome — the provider ACCEPTED but its acknowledgment is lost before the durable sent mark commits (injected fault), Then the retry path preserves exactly ONE logical notification with no duplicate recipient-channel delivery — the retry/no-duplicate collision is resolved, not ignored. [cx: the lost-acknowledgment case is where retries mint duplicates]
- **AT-016.12 (P0)** — Given an escalation-tier event (Lovable credits blocked — fixture), When it delivers, Then BOTH the NGO and the platform admin are notified.

## Coverage map

| REQ-016 clause | Tests |
|---|---|
| One shared emitter, sole writer; domains never send directly | 01 |
| Static closed taxonomy (unknown event rejected) | 02 |
| Full taxonomy: exact recipients + channels per row (incl. d78 watchdog row) + named payloads (reason, CTA, affordance, instructive tone) | 03 [cx] |
| Sensitive negatives (candidacy never → NGO; no donation event; vetting → NGO only) | 04 |
| Email for critical classes; in-app only for low-tone | 05 |
| Documented defaults per event | 06 |
| One logical event per committed event; one delivery per recipient-channel pair | 07 [cx] |
| Thread-comment anti-spam guard (configured policy) | 08 [cx] |
| Atomic write across ALL guard classes (money, access, completion) | 09 [cx] |
| Recipients resolve at creation (old receives, new excluded) | 10 [cx] |
| Sent only on provider acceptance; retry; never dropped; lost-ack retry mints no duplicate | 11 [cx] |
| Escalation tier → NGO + platform admin | 12 |
