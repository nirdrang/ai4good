# AT-REQ-012 — Project Completion

Source: requirements/req-012.md (prd-mvp.md REQ-012 + Promise §10). Dependencies: REQ-006, REQ-009, REQ-021, REQ-026.

**Boundary note:** REQ-012 is a thin owner by design (d45 dropped the handoff ceremony): the state transition and its side-effect FIRING are owned by REQ-005.5 (AT-005.5.25–29/51/52/58); repo/Lovable access mechanics by REQ-008/021; key/workspace mechanics by REQ-009; task-history mechanics by REQ-026; fuel release by REQ-006. This suite owns what REMAINS specific to REQ-012: the volunteer's mark-done action, issues-never-block, the private completion-credit confirmation, the live-URL metadata capture, and the deferred-ceremony absences.

## A. Marking done

- **AT-012.01 (P0)** — Given all P0 tasks complete, When the assigned volunteer marks the project done, Then the project completes. [cross: AT-005.5.25 owns the transition]
- **AT-012.02 (P0)** — Given all P0 tasks complete AND five open GitHub Issues on the repo (fixture), When the volunteer marks done, Then completion proceeds — open GitHub Issues never block it.
- **AT-012.03 (P0)** — Given at least one P0 task not done, When the volunteer attempts to mark done, Then it is rejected. [cross: AT-005.5.27]
- **AT-012.04 (P0)** — Given all P0 tasks complete, When the NGO, another volunteer, or an unauthenticated caller attempts the mark-done action, Then each is rejected — marking done is the assigned volunteer's action.
- **AT-012.05 (P0)** — Given each done P0 task, When its history is audited, Then its `done` status arrived through a verified code merge — every done task carries shipped code; a task moved done any other way does not exist. [cross: REQ-026/AT-008.13 own the enforcement]

## B. Completion effects owned here

- **AT-012.06 (P0)** — Given completion lands, When the volunteer's record is read, Then a completion-credit event exists with a PRIVATE confirmation — visible to that volunteer only, on no public surface. [cross: AT-005.5.28/51 own credit + badge firing]
- **AT-012.07 (P0)** — Given a Lovable-deployed project, When completion lands, Then the live URL is captured automatically from Lovable as project metadata; and Given the URL is unavailable, Then completion still proceeds with the metadata empty — captured, never gated.

## C. No ceremony (deferred set stays absent)

- **AT-012.08 (P0)** — Given the completion path end to end, When probed, Then no completion checklist gate, no sign-off/acceptance flow, no guided-maintenance walkthrough, no rejection loop, and no live-URL gate exists anywhere in it. [cross: AT-005.5.58]
- **AT-012.09 (P0)** — Given a completed project, When post-completion surfaces are probed, Then no post-completion attribution or health-check surface exists in v1 (deferred → RM-62).
- **AT-012.10 (P0)** — Given a completing project, When probed, Then no tip flow exists (UI absent; API rejects). [cross: AT-005.5.29]

## D. Self-serve offboarding & ownership

- **AT-012.11 (P0)** — Given a completed project, When the NGO removes or downgrades the volunteer's repo access at a time of its choosing, Then it succeeds with no platform-admin involvement; the repo stays in the platform org with the NGO holding admin. [cross: AT-008.11/AT-005.5.52]
- **AT-012.12 (P0)** — Given the completed project's Lovable workspace, When the NGO removes both the volunteer and ai4good's read-only monitoring account, Then both memberships end — self-serve, platform prompting only. [cross: AT-008.26/REQ-021]
- **AT-012.13 (P0)** — Given the completed project, When the NGO forks or exports the repo and continues evolving the app via Lovable chat, Then both work — the deliverable is a deployed, running tool the NGO owns and evolves. [cross: AT-008.25; Promise §10]

## Coverage map

| REQ-012 clause | Tests |
|---|---|
| Completes when all P0 done; volunteer marks done; wrong-actor rejected | 01, 03, 04 |
| Open GitHub Issues never block | 02 |
| Done only via verified merge → every done task carries shipped code | 05 |
| completed state + fuel release + keys/workspace + Linear membership/history | [cross → AT-005.5.28, AT-006.33, AT-009.23, REQ-026] |
| Completion-credit event with private confirmation | 06 |
| Live URL auto-captured from Lovable as metadata, not gated | 07 |
| No handoff ceremony; deferred checklist/sign-off/walkthrough/rejection-loop/URL-gate/attribution+health | 08, 09 |
| No tip flow | 10 |
| Self-serve offboarding (repo + Lovable both accounts); repo stays in org, NGO admin | 11, 12 |
| NGO owns and evolves via chat; forkable/exportable | 13 |
