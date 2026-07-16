# AT-REQ-005.5 — Project Lifecycle State-Transition Table

Source: requirements/req-005.5.md (prd-mvp.md REQ-005.5). Dependencies at boundaries: REQ-004 (Discovery), REQ-005 (publish/unpublish), REQ-006 (funding), REQ-007 (matching), REQ-008 (repo), REQ-009 (keys/workspaces), REQ-012 (completion), REQ-016 (notifications), REQ-024 (blockers), REQ-026 (Linear), REQ-027 (abandonment), REQ-036 (PRD gate).

**Boundary note:** REQ-005.5 owns the state machine — the closed set of nine states, every transition's source→target, actor, preconditions, and the observable *firing* of its side effects. The internal mechanics of each side effect (payment flow, match-log detail, key minting, notification copy, Linear seeding, abandonment detection) are tested in their owning suites; here each is asserted as an observable firing and marked `[cross:]`.

## A. State-machine shape (closed table)

- **AT-005.5.01 (P0)** — Given a fixture project driven through every legal transition of the table, When the state field is observed after each transition, Then it only ever holds one of the nine values `draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`, `completed`, `cancelled` — no `paused`, no handoff state, no sub-states.
- **AT-005.5.02 (P0)** — Given each transition NOT in the table (sweep at minimum: draft→open, draft→in_progress, scoped→open, scoped→in_progress, triage→in_progress, open→in_progress, matched_pending_fuel→scoped, matched_pending_fuel→completed, completed→any state, cancelled→any state), When it is attempted through BOTH entry points — the user/API path AND a system-worker path (screener, expiry job, abandonment job, completion evaluator driven against the wrong source state) — Then every attempt is rejected with the state unchanged and no side effect fired — the table is closed through one centralized guard, and `completed`/`cancelled` are terminal. [cx r2: system-driven illegal edges added — API-only left workers unconstrained]
- **AT-005.5.03 (P0)** — Given an abandonment/rematch release on an `in_progress` project, When the release lands, Then the project's state is exactly `open` and no intermediate or tenth state value is ever observable.
- **AT-005.5.04 (P0)** — Given any legal transition, When it fires, Then an append-only audit record captures from-state, to-state, actor, and timestamp. [cx: this is the PRD's NFR-Security audit clause for transitions, homed here per the AT-REQ-001 boundary note — not a REQ-005.5 sentence; kept as this suite's explicit NFR delegation]
- **AT-005.5.47 (P0)** — Given every actor-restricted transition — NGO-only: start Discovery, publish, unpublish, cancel; volunteer-only: match consent; FOUNDER-only: exception-queue return/cancel (REQ-023 assigns these to the founder, not any admin); manual release: allowed to the owning NGO and the assigned volunteer, each with a required reason (REQ-027 — "either party") — When each is attempted by every wrong actor (including a DIFFERENT NGO's account and unauthenticated callers), Then each attempt is rejected with the state unchanged and no side effect fired. [cx: added] [cx r2: manual release corrected to either-party-with-reason; exception decisions pinned to the founder role; wrong-tenant NGO case folded in from retired AT-005.5.37]

## B. draft → discovery_in_progress

- **AT-005.5.05 (P0)** — Given an unvetted NGO, When it creates a project draft, Then the draft is created — any NGO, including unvetted, can create a draft.
- **AT-005.5.06 (P0)** — Given an unvetted NGO with submitted intake, a verified email, and free Discovery credits, When it starts Discovery, Then the transition succeeds — vetting gates publishing, never Discovery.
- **AT-005.5.07 (P0)** — Given a draft without submitted intake, When the NGO attempts to start Discovery, Then the transition is blocked and the remedy is shown. [cross: REQ-003 owns intake]
- **AT-005.5.08 (P0)** — Given an NGO admin whose email is unverified, When they attempt to start Discovery, Then the transition is blocked and "verify" is named as a remedy.
- **AT-005.5.09 (P0)** — Given an NGO with zero free credits and no funded fuel, When it attempts to start Discovery, Then the transition is blocked and the remedies name funding now and returning later.
- **AT-005.5.10 (P0)** — Given an NGO with zero free credits but funded fuel on the project, When it starts Discovery, Then the transition succeeds — capacity via funded fuel. [cross: REQ-006]

## C. discovery_in_progress → scoped

- **AT-005.5.11 (P0)** — Given a Discovery run producing valid output, When Discovery completes, Then the project moves to `scoped` automatically with no manual approval step in the path.
- **AT-005.5.12 (P0)** — Given the retry limit configured to N (N = retries after the initial attempt) and a sentinel forcing invalid Discovery output on every attempt, When Discovery completes, Then one initial attempt plus exactly N retries are observed (N+1 failures total), the admin escalation record is created only after failure N+1, and the project's state is still exactly `discovery_in_progress` — not `scoped`, and not any other state. [cx: retries must occur] [cx r2: N defined unambiguously; exact-state assertion — "not scoped" alone would pass a wrong move to open/cancelled] [cross: REQ-004 owns output validity]
- **AT-005.5.49 (P0)** — Given invalid Discovery output on the first attempt and valid output on a retry within the bound, When the retry succeeds, Then the project moves to `scoped` automatically and NO admin escalation record exists. [cx: added — the recovery path]

## D. scoped → triage → open / return / cancelled

- **AT-005.5.13 (P0)** — Given a vetted NGO on a `scoped` project, When it publishes, Then the project moves to `triage` — never directly to `open`. [cross: REQ-005 owns the publish surface]
- **AT-005.5.14 (P0)** — Given an unvetted NGO on a `scoped` project, When it attempts to publish, Then the transition is rejected and the project stays `scoped`. [cross: REQ-005/REQ-002]
- **AT-005.5.15 (P0)** — Given a confident-clean Tier-1 project in `triage`, When the screener runs, Then the project is auto-approved to `open` with no human action recorded in the transition.
- **AT-005.5.16 (P0)** — Given a project the screener does not decide, When screening completes, Then an entry appears in the founder exception queue and the project remains in `triage`.
- **AT-005.5.17 (P0)** — Given an exception-queue decision to return, When it lands, Then the project is `scoped` with a reason note visible to the NGO, and a subsequent edit + republish re-enters the screener (a new screener run is recorded).
- **AT-005.5.18 (P0)** — Given an exception-queue decision to cancel (a need editing cannot fix), When it lands, Then the project is `cancelled` and terminal.
- **AT-005.5.50 (P0)** — Given an exception-queue case classified as fixable by editing, When the founder acts on it, Then the terminal-cancel action is unavailable for that classification and the return-to-`scoped` path (with reason note) is — `cancelled` is only for needs editing cannot fix. [cx: added — the "only" negative]
- **AT-005.5.19 (P0)** — Given a Tier-2 project in `triage`, however clean, When the screener runs, Then it is never auto-approved to `open` — it lands in the exception queue.

## E. open → matched_pending_fuel

- **AT-005.5.20 (P0)** — Given an admin-created match on an `open` project, When the volunteer consents, Then the project moves to `matched_pending_fuel`, and no NGO approve/decline step exists anywhere between consent and the new state (absence of any NGO gate surface). [cross: REQ-007]
- **AT-005.5.55 (P0)** — Given an `open` candidate-bearing project, When a match is attempted that is (a) not admin-created, (b) with a volunteer outside the candidate pool, or (c) before the candidacy window boundary (per REQ-005.5's "after the candidacy window" wording — the same clause as the within-vs-after tension flagged in AT-REQ-007), Then each attempt is rejected with the project still `open` and no consent side effects; a boundary-valid admin match from the pool succeeds. [cx r2: added — .20 assumed a valid match into existence] [cross: REQ-007]
- **AT-005.5.56 (P0)** — Given a volunteer's first-ever consent (disclaimer unsigned), When they click consent, Then their GitHub identity already exists on the account (linked at signup), the disclaimer acceptance is recorded atomically with the consent, and only then is `matched_pending_fuel` entered — the disclaimer is satisfied at the consent click. [cx r2: added] [cross: REQ-007.12/REQ-001]
- **AT-005.5.21 (P0)** — Given a project with one match invited or consented, When a second match invitation is attempted for the same project, Then it is rejected — one match at a time per project. [cross: REQ-007]
- **AT-005.5.57 (P0)** — Given a project whose prior matches are closed (one declined, one expired, one released — three cases), When a new match invitation is created on the same `open` project, Then it succeeds, and each prior record is still preserved in the match log in its original state — closed history never blocks a new match, and the log demonstrably tracks the rest. [cx r2: added — the complementary half of one-match-at-a-time] [cross: REQ-007]

## F. matched_pending_fuel → in_progress / open / cancelled

- **AT-005.5.22 (P0)** — Given a `matched_pending_fuel` project, When funding of at least $50 lands, Then the project moves to `in_progress` and kickoff fires; a payment attempt below $50 leaves the project in `matched_pending_fuel` with no kickoff side effect fired. [cx: sub-minimum state negative added] [cross: REQ-006 owns the payment gate]
- **AT-005.5.23 (P0)** — Given a `matched_pending_fuel` project unfunded (controlled clock), When probed just before the 7-day boundary, Then no expiry, release, or notification has fired; when the 7 days lapse, Then the project returns to `open`, the match record expires and the volunteer is freed and notified, and the NGO receives the funding-expired notice with a restart CTA. [cx: pre-boundary negative added] [cross: REQ-016]
- **AT-005.5.24 [retired — cx r2: the round-1 repurpose invented match-record effects (released/freed) that REQ-005.5 does not state for pre-payment cancellation; the state move is covered by the .35 matrix and the stated side effects by .36 — re-add under REQ-007 only if the PRD ever specifies match-record behavior on cancellation]**

## G. in_progress → completed

- **AT-005.5.25 (P0)** — Given an `in_progress` project with all P0 tasks done and a recorded repo URL, When completion evaluates, Then the project moves to `completed`.
- **AT-005.5.58 (P0)** — Given the same all-P0-plus-repo project, When completion evaluates, Then it completes with NO separate NGO approval, checklist, sign-off, acceptance step, or handoff artifact anywhere in the path — no formal handoff ceremony exists. [cx r2: added — the no-ceremony clause was implied, never asserted]
- **AT-005.5.26 (P0)** — Given all P0 tasks done but NO recorded repo URL, When completion evaluates, Then the project stays `in_progress` — the repo is a hard precondition. [cross: REQ-008]
- **AT-005.5.27 (P0)** — Given a recorded repo URL but at least one P0 task not done, When completion evaluates, Then the project stays `in_progress`.
- **AT-005.5.28 (P0)** — Given the volunteer's FIRST-ever completion, When the transition fires, Then the side effects are observable: leftover fuel released to general-balance credit [cross: REQ-006], keys revoked and the provider workspace archived [cross: REQ-009], Linear membership removed with the final task history preserved [cross: REQ-026], and the completion credit + first-tool badge recorded. [cx: fixture pinned to first completion — the badge is first-only]
- **AT-005.5.51 (P0)** — Given a volunteer with an existing first-tool badge, When a LATER project of theirs completes, Then a completion credit is recorded and NO second first-tool badge is. [cx: added]
- **AT-005.5.52 (P0)** — Given the whole project lifecycle, When ownership and offboarding are probed at completion, Then the NGO has owned the live app and repo throughout (no transfer step exists at completion); and When the NGO EXERCISES the self-serve offboarding, Then both the volunteer's and ai4good's monitoring-account memberships are actually removed with no platform-admin intervention — exposure alone is not enough. [cx: added] [cx r2: offboarding exercised to removal, not just exposed] [cross: AT-008.26/REQ-012/021]
- **AT-005.5.29 (P0)** — Given a completing project, When completion lands, Then no tip surface exists (UI absent; API rejects) — no tip in v1.

## H. Abandonment / rematch (in_progress → open)

- **AT-005.5.30 (P0)** — Given 21 days with no code or task activity (controlled clock), When the abandonment release fires, Then the ex-volunteer's repo access, virtual key, and Linear access are revoked automatically with no NGO action in the path, and the NGO is prompted to remove the ex-volunteer from the Lovable workspace. [cross: REQ-027/009]
- **AT-005.5.53 (P0)** — Given a project probed just before the 21-day boundary, and separately projects with a code push or a task movement inside the window, When the abandonment check runs, Then NO release fires in any of these cases — either kind of recent activity prevents it, and no early trigger exists. [cx: added — early-trigger and OR-condition negatives] [cross: REQ-027]
- **AT-005.5.31 (P0)** — Given a manual release, When it lands, Then the same revocation path fires and the departure is flagged released-for-cause, while a 21-day-inactivity release is flagged ghosted — each variant records its distinct flag.
- **AT-005.5.32 (P0)** — Given a release on a project with remaining fuel, When the project re-opens, Then the project fuel balance is identical before and after — remaining fuel stays on the project. [cross: REQ-006]
- **AT-005.5.33 (P0)** — Given the departing volunteer had assigned tasks, When the release lands, Then those tasks are back in the backlog (assignee cleared) and the project re-opens carrying an observable rematch-priority flag. [cross: REQ-026]

## I. open → scoped (unpublish)

- **AT-005.5.34 (P0)** — Given an `open` project with NO match, and separately one with an invited (unconsented) match, When the NGO unpublishes to revise, Then BOTH reach `scoped`; in the invited case the pending match is additionally released and the volunteer notified — unpublish never requires a pending invitation. [cx r2: no-match case added] [cross: REQ-005 owns the unpublish surface]

## J. Cancellation (any pre-completion state → cancelled)

- **AT-005.5.35 (P0)** — Given a project in each pre-completion state (`draft`, `discovery_in_progress`, `scoped`, `triage`, `open`, `matched_pending_fuel`, `in_progress`), When the NGO cancels, Then the project moves to `cancelled` in every case.
- **AT-005.5.36 (P0)** — Given cancellation from EACH pre-completion state carrying applicable fixtures (a funded draft, a funded `scoped`, a `matched_pending_fuel` with a consented match, a funded `in_progress` with keys and thread), When each cancellation lands, Then every side effect applicable to that state fires: keys revoked where keys exist, unconsumed fuel to the general balance where fuel exists, the volunteer notified where one is attached, and the thread read-only where one exists. [cx: parameterized — side effects were only tested from in_progress] [cross: REQ-006/009/016]
- **AT-005.5.37 [retired — cx r2: merged into the AT-005.5.47 authorization matrix, which now carries the wrong-tenant NGO case; two unequal versions of the same actor rule were worse than one]**

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
- **AT-005.5.45 (P0)** — Given kickoff has fired, When the NGO and volunteer drive the repo setup to a validated, recorded repository, Then it succeeds with both parties' participation observable and ZERO platform-admin actions anywhere in the flow — the positive establishment AND the no-admin negative, not the negative alone. [cx r2: positive half added — "no admin step" also passed when no repo was ever established] [cross: REQ-008/021]
- **AT-005.5.46 (P0)** — Given each provisioning failure in turn — the provider workspace/key, the Linear workspace, and the repo setup (three sentinel cases) — When kickoff fires, Then in every case the project stays `in_progress` with no sub-state, the appropriate blocker/ops record surfaces that specific gap, and the volunteer is gated ONLY from the failed resource while every unaffected resource remains usable. [cx r2: parameterized per resource — one ambiguous workspace sentinel proved nothing about the others]
- **AT-005.5.54 (P0)** — Given one kickoff side effect made artificially slow and another made to fail (controllable adapters), When kickoff fires, Then the remaining side effects initiate without waiting for the slow one and the failure does not suppress any other — the side effects fire in parallel. [cx: added — parallelism was stated but only outcomes were tested]
- **AT-005.5.48 (P0)** — Given a mid-build support situation, When an admin revokes the volunteer's access with a note, Then the note is recorded, the access revocation lands, and the project state remains `in_progress` — no `paused` state is created by the pause alternative. [cx: added — the stated mid-build pause path]

## Coverage map

| REQ-005.5 clause | Tests |
|---|---|
| Nine states exactly; no `paused` (incl. the mid-build pause alternative: admin revocation with note) | 01, 02, 03, 48 [cx] |
| Every transition has actor, preconditions, side effects, failure handling — closed table via API AND system-worker paths; authz matrix (founder-only exceptions, either-party release with reason, wrong-tenant); audit | 02, 04, 47 [cx r2] |
| Unvetted can draft; vetting gates publishing never Discovery | 05, 06, 14 |
| draft → Discovery preconditions + remedies (intake, verified email, capacity) | 07–10 |
| Discovery completion → scoped auto; invalid output: initial + N retries → escalation after failure N+1, state stays discovery_in_progress; valid retry recovers | 11, 12, 49 [cx] |
| scoped → triage on Publish (vetted only); screener auto-approve → open; exception queue return/cancel (cancel ONLY for unfixable); republish re-enters; Tier-2 never auto | 13–19, 50 [cx] |
| open → matched_pending_fuel on consent; admin-created from pool after window (negatives); first-match disclaimer at consent click (GitHub pre-linked); no NGO approve/decline; one match at a time (closed history never blocks) | 20, 21, 55, 56, 57 [cx r2] |
| matched_pending_fuel: fund ≥$50 → in_progress + kickoff (sub-$50 negative); 7-day expiry (pre-boundary negative) → open + freed + notice; NGO cancel pre-payment | 22, 23 [24 retired — cancel covered by 35/36] |
| in_progress → completed: all-P0 + repo; NO handoff ceremony; side effects; badge first-only; NGO owns throughout + offboarding EXERCISED to removal; no tip | 25–29, 51, 52, 58 [cx r2] |
| Abandonment/rematch: auto-revocation never waiting on NGO; Lovable prompt; ghosted vs released-for-cause; fuel stays; tasks → backlog; rematch priority; no early trigger, activity prevents | 30–33, 53 [cx] |
| open → scoped unpublish before consent (with AND without a pending match); pending match released + notified | 34 [cx r2] |
| Any pre-completion → cancelled by NGO; per-state side-effect matrix; terminal; actor rule | 02, 35, 36, 47 [37 retired into 47] |
| Blockers independent of lifecycle | 38 |
| Match-record states in match log; expiry frees volunteer | 39, 40, 57 |
| Kickoff sequence (workspace+key no-ops-task, Linear assignment + unavailability, one bootstrap task, announce/thread/notify, repo NGO+volunteer-established with zero admin actions, side effects PARALLEL) | 41–45, 54 [cx] |
| Provisioning failures: no sub-state; per-resource blockers/ops records; gate only the failed resource (parameterized: provider/key, Linear, repo) | 46 [cx r2], 54 |
