# AT-REQ-012 — Project Completion

Source: requirements/req-012.md (prd-mvp.md REQ-012 + Promise §10). Dependencies: REQ-006, REQ-009, REQ-021, REQ-026.

**Boundary note:** REQ-012 is a thin owner by design (d45 dropped the handoff ceremony): the state transition and its side-effect FIRING are owned by REQ-005.5 (AT-005.5.25–29/51/52/58); repo/Lovable access mechanics by REQ-008/021; key/workspace mechanics by REQ-009; task-history mechanics by REQ-026; fuel release by REQ-006. This suite owns what REMAINS specific to REQ-012: the volunteer's mark-done action, issues-never-block, the private completion-credit confirmation, the live-URL metadata capture, and the deferred-ceremony absences.

## A. Marking done

- **AT-012.01 (P0)** — Given all P0 tasks complete AND a validated, recorded repo URL, When the assigned volunteer marks the project done, Then the project's state is exactly `completed`. [cx r2: repo-URL precondition added — REQ-005.5 gates completion on it] [cross: AT-005.5.25]
- **AT-012.02 (P0)** — Given all P0 tasks complete, a validated recorded repo URL, AND five open GitHub Issues on that repo (fixture), When the volunteer marks done, Then the state is exactly `completed` — open GitHub Issues never block it. [cx r2: repo precondition added]
- **AT-012.03 (P0)** — Given a validated recorded repo URL and every other precondition met EXCEPT one P0 task not done, When the volunteer attempts to mark done, Then it is rejected — the unfinished P0 is provably the rejection cause. [cx r2: unrelated preconditions satisfied to isolate the cause] [cross: AT-005.5.27]
- **AT-012.04 (P0)** — Given all completion preconditions met (all P0 done, recorded repo URL), When the NGO, another volunteer, a PLATFORM ADMIN, or an unauthenticated caller attempts the mark-done action, Then each is rejected — the actor is provably the rejection cause. [cx: admin added] [cx r2: preconditions satisfied to isolate the cause]
- **AT-012.05 (P0)** — Given each done P0 task, When its history is audited, Then its final authoritative `done` state arrived only through a verified code merge — every done task carries shipped code; an unauthorized status edit may exist transiently but is detected, reverted, and never authoritative. [cx: aligned with REQ-026's detect-and-revert — prevention was overclaimed] [cross: REQ-026/AT-008.13]

## B. Completion effects owned here

- **AT-012.06 (P0)** — Given completion lands, When the volunteer's record is read, Then a completion-credit event exists with a PRIVATE confirmation — visible to that volunteer only, on no public surface. [cross: AT-005.5.28/51 own credit + badge firing]
- **AT-012.07 (P0)** — Given a Lovable-deployed project with its live URL available, When completion lands, Then the exact Lovable URL is stored as project metadata; and Given a separate fixture where the URL is unavailable, Then completion still proceeds — no metadata value is prescribed for the unavailable case (an earlier URL may persist). [cx r2: split — "metadata empty" was an invented representation of retrieval failure]

## C. No ceremony (deferred set stays absent)

- **AT-012.08 (P0)** — Given the completion flow's enumerated surfaces — the volunteer's mark-done UI, the completion API request, the resulting state/events, and the post-completion follow-up actions offered to each party — When each is inspected, Then five separate absence assertions hold: no checklist gate blocks the request; no NGO sign-off/acceptance step exists in the state/events; no guided-maintenance walkthrough is offered; no rejection loop (NGO send-back) exists; and no live-URL check gates the transition. [cx: surfaces enumerated + per-mechanism oracles — "when probed" was unjudgeable] [cross: AT-005.5.58]
- **AT-012.09 (P0)** — Given a completed project, When probed across every layer, Then no completion/post-completion outcome-attribution FIELDS, WRITES, EVENTS, APIs, or UI exist, and no post-completion health STORAGE, JOBS, APIs, or UI exist (deferred → RM-62) — while REQ-034's pre-completion build-usage records, views, and history remain fully present and readable, explicitly excluded from the absence assertion. [cx: narrowed vs REQ-034] [cx r2: absence widened from "new flow"/"surface" to every layer — backend capture on existing endpoints would have slipped through]
- **AT-012.10 [retired — cx r2: full duplicate of AT-005.5.29, the owning test]**

## D. Self-serve offboarding & ownership

- **AT-012.11 (P0)** — Given three fixtures — a completed project where the NGO REMOVES the volunteer's repo access (result: no repo permission), a completed project where it DOWNGRADES them (result: exactly the GitHub `triage` role, REQ-008's completion posture), and an `in_progress` project where it changes access mid-build (result: the change lands) — When the NGO acts on each, Then each result holds with no platform-admin involvement and the repo stays in the platform org with the NGO holding admin — "whenever it chooses" is not completion-timed. [cx: parameterized] [cx r2: downgrade pinned to a named role; in-progress fixture added] [cross: AT-008.11/AT-005.5.52]
- **AT-012.12 [retired — cx r2: the Lovable offboarding removal is owned by AT-008.26 and the prompt+confirm flow by AT-021.27 (also AT-005.5.52); "platform prompting only" also contradicted REQ-021's required confirmation]**
- **AT-012.13 (P0)** — Given a completed project whose live URL is available (fixture — availability is never a gate), When the NGO (a) FORKS the repo, (b) EXPORTS it as an archive, and (c) requests a known sentinel change via Lovable chat — three separate paths — Then the fork contains the known fixture commit, the export archive contains the fixture sentinel file's content (archives carry content, not git history), and the chat change appears in the running deployed app. [cx: concretized] [cx r2: fork and export split into distinct paths with per-path oracles] [cross: AT-008.25, AT-021.26; Promise §10]

## Coverage map

| REQ-012 clause | Tests |
|---|---|
| Completes when all P0 done; volunteer marks done; wrong-actor rejected | 01, 03, 04 |
| Open GitHub Issues never block | 02 |
| Done only via verified merge → every done task carries shipped code | 05 |
| completed state + fuel release + keys/workspace + Linear membership/history | [cross → AT-005.5.28, AT-006.33, AT-009.23, REQ-026] |
| Completion-credit event with private confirmation | 06 |
| Live URL auto-captured from Lovable as metadata, not gated | 07 |
| No handoff ceremony: five enumerated absences; deferred outcome-attribution capture + health (REQ-034 build views preserved) | 08, 09 [cx] |
| No tip flow | [cross → AT-005.5.29; 10 retired] |
| Self-serve offboarding: repo remove AND downgrade (named roles) AND mid-build change; Lovable both accounts | 11 [12 retired → AT-008.26/AT-021.27] |
| NGO owns and evolves via chat; forkable/exportable | 13 |
