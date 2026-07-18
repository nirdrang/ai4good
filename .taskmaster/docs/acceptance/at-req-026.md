# AT-REQ-026 — Platform Task Management (Linear as system of record)

Source: requirements/req-026.md (prd-mvp.md REQ-026; OD-1 and OD-2 open). Dependencies: REQ-005.5, REQ-008, REQ-012, REQ-015, REQ-025, REQ-027, REQ-028, REQ-034, REQ-036.

**Boundary note:** REQ-026 owns the Linear model: workspace-per-project, the read/write split, decomposition, the pull workflow, and lifecycle hooks. Kickoff sequencing is REQ-005.5's; the GitHub event provenance AT-008.12/13's; the Skill's binding mechanics REQ-028's; the panel's page placement REQ-010's — `[cross:]` here.

## A. System of record & visibility split

- **AT-026.01 (P0)** — Given a project at kickoff, When provisioning completes, Then exactly one Linear workspace is assigned to it — one free workspace per project.
- **AT-026.02 (P0)** — Given the NGO-visible status panel AND the project assistant's task context [cross: REQ-033], When each is compared against the platform's read-only Linear mirror and a sentinel manual edit attempt, Then every NGO-visible task state derives solely from observed Linear events and platform lifecycle actions — no other write path exists, the assistant reads the same mirror and cannot mutate task state, and the panel is public. [cx: assistant added — the mirror powers both consumers] [cross: AT-010.06-08]
- **AT-026.23 (P0)** — Given Linear events from distinct actors (the volunteer, their agent, the platform integration — three fixtures), When the mirror is read within the configured convergence bound, Then each event appears with its event type and actor provenance preserved, and Linear remains authoritative (a mirror-side sentinel divergence is corrected toward Linear, never the reverse). [cx: added — "real-time signals per event and per actor" and SoR provenance had no test]
- **AT-026.24 (P0)** — Given two parallel worktrees bound to two different issues (one volunteer), When task-state operations flow from both, Then each worktree's operations affect only its own issue and no repository task-state conflict arises — task state lives in Linear, not in files. [cx: added — the no-merge-conflicts clause had no test] [cross: REQ-028.06]
- **AT-026.03 (P0)** — Given the NGO account, When probed for Linear access, Then it holds no Linear seat and no invite path exists — the status panel is its only Linear-visibility surface.
> **Wording-drift note [cx round 1 → queued for the batch codex pass]:** REQ-026 says GitHub Issues are "(code bugs only)" while REQ-008 says "bugs, refactors, tech debt". Proposed harmonization under evaluation: REQ-008's category list governs (dev-internal code work); the load-bearing invariant is that NGO-visible deliverables and scope tasks are NEVER managed in GitHub Issues — Linear is their only home.

- **AT-026.04 (P0)** — Given GitHub Issues and Linear comments on the project, When NGO-facing surfaces render, Then neither appears — they stay dev-internal; and Given an attempt to manage a DELIVERABLE/scope task as a GitHub Issue (fixture), Then it never becomes NGO-visible task state — Linear is the only home for deliverables. [cx: the deliverable-never-in-Issues negative added] [cross: AT-008.14/29]
- **AT-026.05 (P0)** — Given a task-anchored NGO comment on the comment thread, When it lands, Then it is relayed onto its Linear task for the volunteer; and Given an ORDINARY (unanchored) NGO comment, Then it is NOT relayed into Linear — it stays thread-only. [cx: the negative half added] [cross: REQ-015]

## B. Provisioning

- **AT-026.06 (P0)** — Given kickoff, When it completes, Then the workspace is assigned, the volunteer invited, and the PRD bootstrap task seeded — with zero manual steps on the kickoff critical path. [cross: AT-005.5.41-43]
- **AT-026.07 (P0)** — Given provisioning cannot complete (sentinel), When kickoff proceeds, Then an external-dependency blocker is raised and the project stays `in_progress` — no silent stall, no sub-state. [cross: AT-005.5.42/46; REQ-024]

## C. Decomposition (from the gated PRD)

- **AT-026.08 (P0)** — Given the dev PRD clears its gate [cross: REQ-036], When the platform pushes the tree, Then it contains one parent per story and one sub-issue per acceptance criterion, all top priority, with blocking relations encoded; before the gate, only the bootstrap task exists.
- **AT-026.09 (P0)** — Given the pushed briefs and the VERSIONED decomposition rubric (the configured session-size criteria — a provisional AT-defined oracle until the requirement pins one), When each brief is judged against the rubric, Then each passes, and dependency ordering holds — a sub-issue whose declared blocker is unresolved is not offered as next-unblocked. [cx: "session-sized" given a judgeable rubric oracle] [OD-2 note: panel scope beyond current-work/hierarchy/activity is open]

## D. Pull-based workflow

- **AT-026.10 (P0)** — Given an unassigned unblocked issue, When the volunteer self-assigns, Then the issue is marked in progress — self-assignment IS the commitment signal.
- **AT-026.11 (P0)** — Given issues with blocking relations, When the volunteer requests the next task, Then only unblocked issues are offered — a blocked issue is never surfaced as pullable. [cross: REQ-028 helper]
- **AT-026.12 (P0)** — Given the coordinator/platform, When probed for a push-assignment path of build tasks to the volunteer, Then none exists — volunteers pull; the coordinator never pushes.
- **AT-026.13 (P0)** — Given the full onboarding sequence, When walked end to end, Then the order holds: match → invite (to the Linear workspace) → briefs browsable BEFORE any clone → the first work session connects task access → the first pull activates attribution — each step observably preceding the next. [cx: the match→invite head of the sequence added] [cross: REQ-007/028/034]
- **AT-026.25 (P0)** — Given the stated working norms — one issue in progress (one per worktree if parallel), assign before starting, comment when blocked — When the default flows run, Then the norms are delivered (repo seeding + injected prompt [cross: AT-008.16/AT-009.10]) and the default tooling conforms (pick-next self-assigns before work; a blocked issue carries its comment path); norm violations surface to the coordinator rather than being mechanically blocked. [cx: added — the norms had no test; social/tooling enforcement, not mechanical, per the vendor-permissions reality]
- **AT-026.14 (P0)** — Given an in-progress issue with no branch activity for the configured N days (controlled clock), When the check runs, Then a coordinator flag proposes returning it to the backlog — a proposal, not an automatic return; just before N days, no flag.
- **AT-026.15 (P0)** — Given an agentic loop working under the volunteer's identity, When its PR completes, Then it never auto-merges; and When its task-system auth fails (sentinel), Then the loop degrades without stopping the session. [OD-1 note: reviewer identity + merge authority open] [cross: REQ-028]

## E. Write authority (detect-and-revert)

- **AT-026.16 (P0)** — Given the volunteer (or their agent), When they read, comment, and self-assign, Then all succeed; When they change a status by hand, Then the change is detected and reverted with an explanatory comment on the issue and a low-tone notification to the volunteer — detect-and-revert, because vendor permissions cannot block status-only. [cross: AT-008.13]
- **AT-026.17 (P0)** — Given a PR merge linked to a task, When the GitHub integration fires, Then the task moves to done — and this is the ONLY path to done (a status change not backed by a linked merged PR never survives). [cross: AT-008.13/AT-012.05]
- **AT-026.18 (P0)** — Given platform-only operations, When exercised, Then the platform can create decomposition issues, invite, revert, and cancel; the volunteer CAN create a scope-addition linked task [cross: REQ-025.02] but cannot cancel or create decomposition issues; the NGO can do none.
- **AT-026.19 (P0)** — Given an agent action in Linear (comment/self-assign under the volunteer's identity), When its record is read, Then it attributes to the volunteer, who owns it.

## F. Lifecycle hooks & ownership

- **AT-026.20 (P0)** — Given completion with lower-priority not-started issues and top-priority issues, When completion fires, Then lower-priority not-started issues cancel, top-priority never auto-cancels (completion required them all done), volunteer membership is removed, the final tree is preserved with the repo, and the mirror goes read-only. [cross: AT-005.5.25/28]
- **AT-026.21 (P0)** — Given abandonment, When the release lands, Then the ex-volunteer's in-progress issues return to the backlog. [cross: AT-005.5.33]
- **AT-026.22 (P0)** — Given the completed project, When workspace ownership and billing are probed, Then the Linear workspace never transferred to the NGO, sits dormant at $0, and any paid tier would be platform-paid — coordination infrastructure is platform-owned; delivery infrastructure (repo, Lovable) is NGO-owned.

## Coverage map

| REQ-026 clause | Tests |
|---|---|
| One workspace per project; Linear is SoR (per-event/per-actor provenance, mirror converges toward Linear) | 01, 23 [cx] |
| No merge conflicts under parallel worktrees | 24 [cx] |
| NGO-visible state solely from Linear events + platform actions; mirror powers panel AND assistant (read-only); public panel | 02 |
| NGO no Linear seat; panel = only surface | 03 |
| Issues + Linear comments dev-internal (deliverables NEVER in Issues; category drift with REQ-008 queued); anchored comment relayed, unanchored stays thread-only | 04, 05 [cx] |
| Kickoff provisioning: no manual critical-path step; failure → external-dependency blocker | 06, 07 |
| Decomposition: bootstrap-only pre-gate; parent/story + sub-issue/AC, top priority, blocking relations, session-sized | 08, 09 |
| Pull workflow: self-assign = commitment; next-unblocked only; never pushed; FULL onboarding order (match→invite→browse→clone→access→pull); N-day stale flag (proposal); norms delivered + defaults conform | 10–14, 25 [cx] |
| Agentic loops: no auto-merge; degrade on auth failure (OD-1 open); reviewer agent ships in the template | 15 [reviewer agent: cross → AT-008.16] |
| Write authority: read/comment/self-assign yes, status never; detect-and-revert + notify; merge-only done; platform-only ops; agent actions attribute to volunteer | 16–19 |
| Completion hooks (cancel/preserve/remove/read-only) + abandonment backlog return | 20, 21 |
| Ownership asymmetry: platform-owned, never transfers, dormant $0, platform pays tier | 22 |
| Panel content (current work, hierarchy, recent activity) | [cross → AT-010.06; OD-2 open for scope beyond] |
