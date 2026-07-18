# AT-REQ-026 — Platform Task Management (Linear as system of record)

Source: requirements/req-026.md (prd-mvp.md REQ-026; OD-1 and OD-2 open). Dependencies: REQ-005.5, REQ-008, REQ-012, REQ-015, REQ-025, REQ-027, REQ-028, REQ-034, REQ-036.

**Boundary note:** REQ-026 owns the Linear model: workspace-per-project, the read/write split, decomposition, the pull workflow, and lifecycle hooks. Kickoff sequencing is REQ-005.5's; the GitHub event provenance AT-008.12/13's; the Skill's binding mechanics REQ-028's; the panel's page placement REQ-010's — `[cross:]` here.

## A. System of record & visibility split

- **AT-026.01 (P0)** — Given a project at kickoff, When provisioning completes, Then exactly one Linear workspace is assigned to it — one free workspace per project.
- **AT-026.02 (P0)** — Given the NGO-visible status panel, When compared against the platform's read-only Linear mirror and a sentinel manual edit attempt, Then every NGO-visible task state derives solely from observed Linear events and platform lifecycle actions — no other write path exists — and the panel is public. [cross: AT-010.06-08]
- **AT-026.03 (P0)** — Given the NGO account, When probed for Linear access, Then it holds no Linear seat and no invite path exists — the status panel is its only Linear-visibility surface.
- **AT-026.04 (P0)** — Given GitHub Issues and Linear comments on the project, When NGO-facing surfaces render, Then neither appears — they stay dev-internal. [cross: AT-008.14 owns the platform-channel sweep]
- **AT-026.05 (P0)** — Given a task-anchored NGO comment on the comment thread, When it lands, Then it is relayed onto its Linear task for the volunteer. [cross: REQ-015]

## B. Provisioning

- **AT-026.06 (P0)** — Given kickoff, When it completes, Then the workspace is assigned, the volunteer invited, and the PRD bootstrap task seeded — with zero manual steps on the kickoff critical path. [cross: AT-005.5.41-43]
- **AT-026.07 (P0)** — Given provisioning cannot complete (sentinel), When kickoff proceeds, Then an external-dependency blocker is raised and the project stays `in_progress` — no silent stall, no sub-state. [cross: AT-005.5.42/46; REQ-024]

## C. Decomposition (from the gated PRD)

- **AT-026.08 (P0)** — Given the dev PRD clears its gate [cross: REQ-036], When the platform pushes the tree, Then it contains one parent per story and one sub-issue per acceptance criterion, all top priority, with blocking relations encoded; before the gate, only the bootstrap task exists.
- **AT-026.09 (P0)** — Given the pushed briefs, When inspected, Then each is session-sized and dependency-ordered — a sub-issue whose declared blocker is unresolved is not offered as next-unblocked. [OD-2 note: panel scope beyond current-work/hierarchy/activity is open]

## D. Pull-based workflow

- **AT-026.10 (P0)** — Given an unassigned unblocked issue, When the volunteer self-assigns, Then the issue is marked in progress — self-assignment IS the commitment signal.
- **AT-026.11 (P0)** — Given issues with blocking relations, When the volunteer requests the next task, Then only unblocked issues are offered — a blocked issue is never surfaced as pullable. [cross: REQ-028 helper]
- **AT-026.12 (P0)** — Given the coordinator/platform, When probed for a push-assignment path of build tasks to the volunteer, Then none exists — volunteers pull; the coordinator never pushes.
- **AT-026.13 (P0)** — Given onboarding order, When walked, Then briefs are browsable BEFORE any clone, the first work session connects task access, and the first pull activates attribution. [cross: REQ-028/034]
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
| One workspace per project; Linear is SoR | 01 |
| NGO-visible state solely from Linear events + platform actions; public panel | 02 |
| NGO no Linear seat; panel = only surface | 03 |
| Issues + Linear comments dev-internal; task-anchored NGO comment relayed | 04, 05 |
| Kickoff provisioning: no manual critical-path step; failure → external-dependency blocker | 06, 07 |
| Decomposition: bootstrap-only pre-gate; parent/story + sub-issue/AC, top priority, blocking relations, session-sized | 08, 09 |
| Pull workflow: self-assign = commitment; next-unblocked only; never pushed; onboarding order; N-day stale flag (proposal) | 10–14 |
| Agentic loops: no auto-merge; degrade on auth failure (OD-1 open) | 15 |
| Write authority: read/comment/self-assign yes, status never; detect-and-revert + notify; merge-only done; platform-only ops; agent actions attribute to volunteer | 16–19 |
| Completion hooks (cancel/preserve/remove/read-only) + abandonment backlog return | 20, 21 |
| Ownership asymmetry: platform-owned, never transfers, dormant $0, platform pays tier | 22 |
| Panel content (current work, hierarchy, recent activity) | [cross → AT-010.06; OD-2 open for scope beyond] |
