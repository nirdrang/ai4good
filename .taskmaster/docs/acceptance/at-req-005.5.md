# AT-REQ-005.5 — Project Lifecycle State-Transition Table

Source: requirements/req-005.5.md (prd-mvp.md REQ-005.5). Dependencies at boundaries: REQ-004 (Discovery), REQ-005 (publish/unpublish), REQ-006 (funding), REQ-007 (matching), REQ-008 (repo), REQ-009 (keys/workspaces), REQ-012 (completion), REQ-016 (notifications), REQ-024 (blockers), REQ-026 (Linear), REQ-027 (abandonment), REQ-036 (PRD gate).

**Boundary note:** REQ-005.5 owns the state machine — the closed set of nine states, every transition's source→target, actor, preconditions, and the observable *firing* of its side effects. The internal mechanics of each side effect (payment flow, match-log detail, key minting, notification copy, Linear seeding, abandonment detection) are tested in their owning suites; here each is asserted as an observable firing and marked `[cross:]`.

## A. State-machine shape (closed table)

- **AT-005.5.01 (P0)** — Given a fixture project driven through every legal transition of the table, When the state field is observed after each transition, Then it only ever holds one of the nine values `draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`, `completed`, `cancelled` — no `paused`, no handoff state, no sub-states.
- **AT-005.5.02 (P0)** — Given each transition NOT in the table (sweep at minimum: draft→open, draft→in_progress, scoped→open, scoped→in_progress, triage→in_progress, open→in_progress, matched_pending_fuel→scoped, matched_pending_fuel→completed, completed→any state, cancelled→any state), When it is attempted via API by an otherwise-authorized actor, Then it is rejected and the state is unchanged — the table is closed and `completed`/`cancelled` are terminal.
- **AT-005.5.03 (P0)** — Given an abandonment/rematch release on an `in_progress` project, When the release lands, Then the project's state is exactly `open` and no intermediate or tenth state value is ever observable.
- **AT-005.5.04 (P0)** — Given any legal transition, When it fires, Then an append-only audit record captures from-state, to-state, actor, and timestamp. [NFR audit: transition events owned here]

## B. draft → discovery_in_progress

- **AT-005.5.05 (P0)** — Given an unvetted NGO, When it creates a project draft, Then the draft is created — any NGO, including unvetted, can create a draft.
- **AT-005.5.06 (P0)** — Given an unvetted NGO with submitted intake, a verified email, and free Discovery credits, When it starts Discovery, Then the transition succeeds — vetting gates publishing, never Discovery.
- **AT-005.5.07 (P0)** — Given a draft without submitted intake, When the NGO attempts to start Discovery, Then the transition is blocked and the remedy is shown. [cross: REQ-003 owns intake]
- **AT-005.5.08 (P0)** — Given an NGO admin whose email is unverified, When they attempt to start Discovery, Then the transition is blocked and "verify" is named as a remedy.
- **AT-005.5.09 (P0)** — Given an NGO with zero free credits and no funded fuel, When it attempts to start Discovery, Then the transition is blocked and the remedies name funding now and returning later.
- **AT-005.5.10 (P0)** — Given an NGO with zero free credits but funded fuel on the project, When it starts Discovery, Then the transition succeeds — capacity via funded fuel. [cross: REQ-006]

## C. discovery_in_progress → scoped

- **AT-005.5.11 (P0)** — Given a Discovery run producing valid output, When Discovery completes, Then the project moves to `scoped` automatically with no manual approval step in the path.
- **AT-005.5.12 (P0)** — Given a sentinel forcing invalid Discovery output on every attempt, When Discovery completes, Then it is retried at most the configured bound, an admin escalation record is created after the last retry, and the project has not moved to `scoped`. [cross: REQ-004 owns output validity]

## D. scoped → triage → open / return / cancelled

- **AT-005.5.13 (P0)** — Given a vetted NGO on a `scoped` project, When it publishes, Then the project moves to `triage` — never directly to `open`. [cross: REQ-005 owns the publish surface]
- **AT-005.5.14 (P0)** — Given an unvetted NGO on a `scoped` project, When it attempts to publish, Then the transition is rejected and the project stays `scoped`. [cross: REQ-005/REQ-002]
- **AT-005.5.15 (P0)** — Given a confident-clean Tier-1 project in `triage`, When the screener runs, Then the project is auto-approved to `open` with no human action recorded in the transition.
- **AT-005.5.16 (P0)** — Given a project the screener does not decide, When screening completes, Then an entry appears in the founder exception queue and the project remains in `triage`.
- **AT-005.5.17 (P0)** — Given an exception-queue decision to return, When it lands, Then the project is `scoped` with a reason note visible to the NGO, and a subsequent edit + republish re-enters the screener (a new screener run is recorded).
- **AT-005.5.18 (P0)** — Given an exception-queue decision to cancel (a need editing cannot fix), When it lands, Then the project is `cancelled` and terminal.
- **AT-005.5.19 (P0)** — Given a Tier-2 project in `triage`, however clean, When the screener runs, Then it is never auto-approved to `open` — it lands in the exception queue.

## E. open → matched_pending_fuel

- **AT-005.5.20 (P0)** — Given an admin-created match on an `open` project, When the volunteer consents, Then the project moves to `matched_pending_fuel`, and no NGO approve/decline step exists anywhere between consent and the new state (absence of any NGO gate surface). [cross: REQ-007]
- **AT-005.5.21 (P0)** — Given a project with one match invited or consented, When a second match invitation is attempted for the same project, Then it is rejected — one match at a time per project; the match log tracks the remaining pool. [cross: REQ-007]

## F. matched_pending_fuel → in_progress / open / cancelled

- **AT-005.5.22 (P0)** — Given a `matched_pending_fuel` project, When funding of at least $50 lands, Then the project moves to `in_progress` and kickoff fires. [cross: REQ-006 owns payment]
- **AT-005.5.23 (P0)** — Given a `matched_pending_fuel` project unfunded for 7 days (controlled clock), When the window lapses, Then the project returns to `open`, the match record expires and the volunteer is freed and notified, and the NGO receives the funding-expired notice with a restart CTA. [cross: REQ-016]
- **AT-005.5.24 (P0)** — Given a `matched_pending_fuel` project, When the NGO cancels before payment, Then the project moves to `cancelled`.

## G. in_progress → completed

- **AT-005.5.25 (P0)** — Given an `in_progress` project with all P0 tasks done and a recorded repo URL, When completion evaluates, Then the project moves to `completed`.
- **AT-005.5.26 (P0)** — Given all P0 tasks done but NO recorded repo URL, When completion evaluates, Then the project stays `in_progress` — the repo is a hard precondition. [cross: REQ-008]
- **AT-005.5.27 (P0)** — Given a recorded repo URL but at least one P0 task not done, When completion evaluates, Then the project stays `in_progress`.
- **AT-005.5.28 (P0)** — Given a completion transition, When it fires, Then the side effects are observable: leftover fuel released to general-balance credit [cross: REQ-006], keys revoked and the provider workspace archived [cross: REQ-009], Linear membership removed with the final task history preserved [cross: REQ-026], and the completion credit + first-tool badge recorded.
- **AT-005.5.29 (P0)** — Given a completing project, When completion lands, Then no tip surface exists (UI absent; API rejects) — no tip in v1.

## H. Abandonment / rematch (in_progress → open)

- **AT-005.5.30 (P0)** — Given 21 days with no code or task activity (controlled clock), When the abandonment release fires, Then the ex-volunteer's repo access, virtual key, and Linear access are revoked automatically with no NGO action in the path, and the NGO is prompted to remove the ex-volunteer from the Lovable workspace. [cross: REQ-027/009]
- **AT-005.5.31 (P0)** — Given a manual release, When it lands, Then the same revocation path fires and the departure is flagged released-for-cause, while a 21-day-inactivity release is flagged ghosted — each variant records its distinct flag.
- **AT-005.5.32 (P0)** — Given a release on a project with remaining fuel, When the project re-opens, Then the project fuel balance is identical before and after — remaining fuel stays on the project. [cross: REQ-006]
- **AT-005.5.33 (P0)** — Given the departing volunteer had assigned tasks, When the release lands, Then those tasks are back in the backlog (assignee cleared) and the project re-opens carrying an observable rematch-priority flag. [cross: REQ-026]

## I. open → scoped (unpublish)

- **AT-005.5.34 (P0)** — Given an `open` project with an invited (unconsented) match, When the NGO unpublishes to revise, Then the project is `scoped`, the pending match is released, and the volunteer is notified. [cross: REQ-005 owns the unpublish surface]

## J. Cancellation (any pre-completion state → cancelled)

- **AT-005.5.35 (P0)** — Given a project in each pre-completion state (`draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`), When the NGO cancels, Then the project moves to `cancelled` in every case.
- **AT-005.5.36 (P0)** — Given cancellation of a funded `in_progress` project, When it lands, Then keys are revoked, unconsumed fuel moves to the general balance, the volunteer is notified, and the comment thread is read-only. [cross: REQ-006/009/016]
- **AT-005.5.37 (P0)** — Given a volunteer, a different NGO's account, or an unauthenticated caller, When any of them attempts to cancel the project, Then the attempt is rejected — cancellation is the owning NGO's action.

## K. Blockers are not states

- **AT-005.5.38 (P0)** — Given an `in_progress` project, When an operational blocker is raised, Then the lifecycle state remains `in_progress` and the blocker is visible on its own surface — blockers are independent of lifecycle state. [cross: REQ-024]

## L. Match-record states

- **AT-005.5.39 (P0)** — Given match events across a project's life, When the match log is read, Then match records carry their own states — invited / consented / declined / expired / released — and a project state change never overwrites a match record's own state. [cross: REQ-007 owns the log]
- **AT-005.5.40 (P0)** — Given a volunteer freed by an unfunded expiry, When a new match invitation is created for them on another project, Then it succeeds — expiry frees the volunteer for re-match. [cross: REQ-007]

## M. Kickoff sequence (side effects on funding)

- **AT-005.5.41 (P0)** — Given funding lands, When kickoff fires, Then a provider workspace and its virtual key are provisioned for the project and no ops task is created for that provisioning. [cross: REQ-009]
- **AT-005.5.42 (P0)** — Given the Linear pool has no available workspace (sentinel), When kickoff fires, Then an urgent ops task and a blocker are raised while the project still enters `in_progress`. [cross: REQ-026]
- **AT-005.5.43 (P0)** — Given kickoff completes, When the Linear workspace is seeded, Then it contains exactly ONE task — author the project PRD from the Discovery scope — and no build-backlog tasks exist before the completion gate passes. [cross: REQ-036/026]
- **AT-005.5.44 (P0)** — Given kickoff fires, When its notifications land, Then the funded/kickoff status is announced, the comment thread opens, and the volunteer is notified with setup instructions — all three observable. [cross: REQ-016]
- **AT-005.5.45 (P0)** — Given the kickoff sequence, When it is inspected end to end, Then it contains no platform-admin step for repo establishment — the repo is NGO+volunteer-driven. [cross: REQ-008/021]
- **AT-005.5.46 (P0)** — Given a provisioning failure (sentinel: workspace provisioning error), When kickoff fires, Then the project stays `in_progress` with no sub-state, a blocker/ops task surfaces the gap, and the volunteer is gated only from the pending resource while other provisioned resources remain usable.

## Coverage map

| REQ-005.5 clause | Tests |
|---|---|
| Nine states exactly; no `paused`; abandonment is a transition not a state | 01, 02, 03 |
| Every transition has actor, preconditions, side effects, failure handling (closed table + audit) | 02, 04, and every per-transition test |
| Unvetted can draft; vetting gates publishing never Discovery | 05, 06, 14 |
| draft → Discovery preconditions + remedies (intake, verified email, capacity) | 07–10 |
| Discovery completion → scoped auto; invalid output bounded retry → admin escalation | 11, 12 |
| scoped → triage on Publish (vetted only); screener auto-approve → open; exception queue return/cancel; republish re-enters; Tier-2 never auto | 13–19 |
| open → matched_pending_fuel on consent; no NGO approve/decline; one match at a time | 20, 21 |
| matched_pending_fuel: fund ≥$50 → in_progress + kickoff; 7-day expiry → open + freed + notice; NGO cancel pre-payment | 22–24 |
| in_progress → completed: all-P0 + repo; side effects; no tip | 25–29 |
| Abandonment/rematch: auto-revocation never waiting on NGO; Lovable prompt; ghosted vs released-for-cause; fuel stays; tasks → backlog; rematch priority | 30–33 |
| open → scoped unpublish before consent; pending match released + notified | 34 |
| Any pre-completion → cancelled by NGO; side effects; terminal; actor rule | 02, 35–37 |
| Blockers independent of lifecycle | 38 |
| Match-record states in match log; expiry frees volunteer | 39, 40 |
| Kickoff sequence (workspace+key no-ops-task, Linear assignment + unavailability, one bootstrap task, announce/thread/notify, no admin repo step) | 41–45 |
| Provisioning failures: no sub-state; blockers/ops tasks; gate only the pending resource | 46 |
