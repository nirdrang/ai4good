# AT-REQ-026 — Platform Task Management (Linear as system of record)

Source: requirements/req-026.md (prd-mvp.md REQ-026; OD-1 and OD-2 open). Dependencies: REQ-005.5, REQ-008, REQ-012, REQ-015, REQ-025, REQ-027, REQ-028, REQ-034, REQ-036.

**Boundary note:** REQ-026 owns the Linear model: workspace-per-project, the read/write split, decomposition, the pull workflow, and lifecycle hooks. Kickoff sequencing is REQ-005.5's; the GitHub event provenance AT-008.12/13's; the Skill's binding mechanics REQ-028's; the panel's page placement REQ-010's — `[cross:]` here.

## A. System of record & visibility split

- **AT-026.01 (P0)** — Given a project at kickoff, When provisioning completes, Then exactly one Linear workspace is assigned to it — one free workspace per project.
- **AT-026.02 (P0)** — Given the NGO-visible status panel AND the project assistant's task context [cross: REQ-033], When each is compared against the platform's read-only Linear mirror and a sentinel manual edit attempt, Then every NGO-visible task state derives solely from observed Linear events and platform lifecycle actions — no other write path exists, the assistant reads the same mirror and cannot mutate task state, and the panel is public. [cx: assistant added — the mirror powers both consumers] [cross: AT-010.06-08]
- **AT-026.23 (P0)** — Given Linear events from the volunteer directly, from their agent (acting under the volunteer's identity), and from the platform integration (three fixtures), When the mirror is read within the configured convergence bound, Then each event appears with its event type and accountable actor preserved — agent-originated events attribute to the VOLUNTEER (consistent with AT-026.19; any source-kind marker is optional implementation detail, not required) — and Linear remains authoritative (a mirror-side sentinel divergence is corrected toward Linear, never the reverse). [cx] [cx r2: agent identity corrected — agents act under the volunteer, not as a distinct actor]
- **AT-026.24 (P0)** — Given two parallel worktrees bound to two different issues (one volunteer), When task-state operations flow from both, Then each worktree's operations affect only its own issue and no repository task-state conflict arises — task state lives in Linear, not in files. [cx: added — the no-merge-conflicts clause had no test] [cross: REQ-028.06]
- **AT-026.03 (P0)** — Given the NGO account, When probed for Linear access, Then it holds no Linear seat and no invite path exists — the status panel is its only Linear-visibility surface.
> **Resolved [codex-verified harmonization, batch-4 tension pass]:** T3 — REQ-008's category list governs (GitHub Issues = dev-internal code work: bugs, refactors, tech debt; never deliverable/scope authority; anything required for P0 acceptance must be represented in Linear). T2 — two status authorities only: explicit self-assignment → In Progress (vendor branch/PR automations are corroboration, reverted when unmatched — verified against Linear's actual docs); a verified MATCHING merge (task id + PR author + recorded pull) → Done. REQ-026/008/028 reworded accordingly.

- **AT-026.04 (P0)** — Given GitHub Issues and Linear comments on the project, When NGO-facing surfaces render, Then neither appears — they stay dev-internal; and Given a DELIVERABLE/scope item (fixture), Then no GitHub Issue is created or retained as its management home and its authoritative task exists only in Linear — not merely hidden from the NGO, but never managed in Issues at all. [cx] [cx r2: creation/retention banned, not just NGO-visibility] [cross: AT-008.14/29]
- **AT-026.05 (P0)** — Given a task-anchored NGO comment on the comment thread, When it lands, Then it is relayed onto its Linear task for the volunteer; and Given an ORDINARY (unanchored) NGO comment, Then it is NOT relayed into Linear — it stays thread-only. [cx: the negative half added] [cross: REQ-015]

## B. Provisioning

- **AT-026.06 (P0)** — Given kickoff, When it completes, Then the workspace is assigned, the volunteer invited, and the PRD bootstrap task seeded — with zero manual steps on the kickoff critical path. [cross: AT-005.5.41-43]
- **AT-026.07 (P0)** — Given provisioning cannot complete (sentinel), When kickoff proceeds, Then an external-dependency blocker is raised and the project stays `in_progress` — no silent stall, no sub-state. [cross: AT-005.5.42/46; REQ-024]

## C. Decomposition (from the gated PRD)

- **AT-026.08 (P0)** — Given the dev PRD clears its gate [cross: REQ-036], When the platform pushes the tree, Then it contains one parent per story and one sub-issue per acceptance criterion, all top priority, with blocking relations encoded; before the gate, only the bootstrap task exists.
- **AT-026.09 (P0)** — Given the pushed briefs and the VERSIONED decomposition rubric (the configured session-size criteria — a provisional AT-defined oracle until the requirement pins one), When each brief is judged against the rubric, Then each passes and the blocking relations are encoded on the issues. [cx: rubric oracle] [cx r2: the pullability assertion removed — AT-026.11 owns it] [OD-2 note: panel scope beyond current-work/hierarchy/activity is open]
- **AT-026.26 (P0)** — Given a pushed decomposition, When the coordinator's pilot spot-check runs on a sample of it, Then a recorded review outcome (pass/fail with the sample identified) exists. [cx r2: added — "coordinator review is a pilot spot-check" had no test]

## D. Pull-based workflow

- **AT-026.10 (P0)** — Given an unassigned unblocked issue, When the volunteer self-assigns, Then the issue is marked in progress — self-assignment IS the commitment signal.
- **AT-026.11 (P0)** — Given issues with blocking relations, When the volunteer requests the next task, Then only unblocked issues are offered — a blocked issue is never surfaced as pullable. [cross: REQ-028 helper]
- **AT-026.12 (P0)** — Given the coordinator/platform, When probed for a push-assignment path of build tasks to the volunteer, Then none exists — volunteers pull; the coordinator never pushes.
- **AT-026.13 (P0)** — Given the full onboarding sequence, When walked end to end, Then the order holds: match → invite (to the Linear workspace) → briefs browsable BEFORE any clone → the first work session connects task access → the first pull activates attribution — each step observably preceding the next. [cx: the match→invite head of the sequence added] [cross: REQ-007/028/034]
- **AT-026.25 (P0)** — Given the stated working norms — one issue in progress (one per worktree if parallel), assign before starting, comment when blocked — When the default flows run, Then the norms are delivered (repo seeding + injected prompt [cross: AT-008.16/AT-009.10]) and the default tooling conforms (pick-next self-assigns before work; a blocked issue carries its comment path). [cx: added] [cx r2: the invented coordinator-surfacing assertion removed — only the N-day inactivity case raises a coordinator flag (AT-026.14)]
- **AT-026.14 (P0)** — Given an in-progress issue with no branch activity for the configured N days (controlled clock), When the check runs, Then a coordinator flag proposes returning it to the backlog — a proposal, not an automatic return; just before N days, no flag.
- **AT-026.15 (P0)** — Given an agentic loop working under the volunteer's identity, When its PR reaches the created/ready state, Then it remains UNMERGED absent an authorized merge action; and When its task-system auth fails (sentinel), Then the degraded state is observable — an auth warning surfaces, the session continues operating, and task-system updates fail-or-queue visibly (no silent ignoring). [cx r2: PR event defined + degradation given observables] [OD-1 note: reviewer identity + merge authority open] [cross: REQ-028.10]

## E. Write authority (detect-and-revert)

- **AT-026.16 (P0)** — Given the volunteer (or their agent), When they read, comment, and self-assign, Then all succeed; When they change a status by hand, Then the change is detected and reverted with an explanatory comment on the issue and a low-tone notification to the volunteer — detect-and-revert, because vendor permissions cannot block status-only. [cross: AT-008.13]
- **AT-026.17 (P0)** — Given a PR merge whose task identifier matches the project, the PR author, and the recorded pull, When the GitHub integration fires, Then the task moves to done — the ONLY path to done (a DONE transition not backed by a matching merged PR never survives; authorized platform cancellations are a separate lifecycle authority, AT-026.18/20); and Given a merge with a WRONG or unmatched task identifier, and a vendor branch/PR automation firing WITHOUT a prior explicit pull (two negatives), Then no task advances and detect-and-revert corrects any vendor-written state. [T2] [cx r2: the never-survives parenthetical narrowed to Done — it contradicted authorized cancellations] [cross: AT-008.13/AT-012.05]
- **AT-026.18 (P0)** — Given platform-only operations, When exercised, Then the platform can create decomposition issues, invite, revert, and cancel; the volunteer CAN create a scope-addition linked task [cross: REQ-025.02] but cannot cancel or create decomposition issues; the NGO can do none; and a platform-originated SCOPE-ADDITION task cannot arise — platform issue creation is limited to decomposition/lifecycle cases (v1 scope-addition tasks are volunteer-created, exclusively). [cx r2: the exclusivity negative added]
- **AT-026.19 (P0)** — Given an agent action in Linear (comment/self-assign under the volunteer's identity), When its record is read, Then it attributes to the volunteer, who owns it.

## F. Lifecycle hooks & ownership

- **AT-026.20 (P0)** — Given completion with lower-priority not-started issues and top-priority issues, When completion fires, Then lower-priority not-started issues cancel, top-priority never auto-cancels (completion required them all done), volunteer membership is removed, the final tree is preserved with the repo, and the mirror goes read-only. [cross: AT-005.5.25/28]
- **AT-026.21 (P0)** — Given abandonment, When the release lands, Then the ex-volunteer's in-progress issues return to the backlog. [cross: AT-005.5.33]
- **AT-026.22 (P0)** — Given the project during `in_progress` AND at `completed` (two probes), When ownership is read at each point, Then delivery infrastructure (repo, Lovable workspace) is NGO-owned THROUGHOUT and coordination infrastructure (Linear workspace, gateway) is platform-owned throughout with no transfer event at any point; post-completion the Linear workspace sits dormant at $0, and the configured billing owner of the workspace is a platform account (inspected, not counterfactual). [cx r2: both-state probes; repo/Lovable/gateway included; billing owner made observable] [cross: AT-005.5.52/AT-008.11]

## Coverage map

| REQ-026 clause | Tests |
|---|---|
| One workspace per project; Linear is SoR (per-event/per-actor provenance, mirror converges toward Linear) | 01, 23 [cx] |
| No merge conflicts under parallel worktrees | 24 [cx] |
| NGO-visible state solely from Linear events + platform actions; mirror powers panel AND assistant (read-only); public panel | 02 |
| NGO no Linear seat; panel = only surface | 03 |
| Issues + Linear comments dev-internal (deliverables NEVER in Issues; category drift with REQ-008 queued); anchored comment relayed, unanchored stays thread-only | 04, 05 [cx] |
| Kickoff provisioning: no manual critical-path step; failure → external-dependency blocker | 06, 07 |
| Decomposition: bootstrap-only pre-gate; parent/story + sub-issue/AC, top priority, blocking relations, session-sized; coordinator pilot spot-check recorded | 08, 09, 26 [cx r2] |
| Pull workflow: self-assign = commitment; next-unblocked only; never pushed; FULL onboarding order (match→invite→browse→clone→access→pull); N-day stale flag (proposal); norms delivered + defaults conform | 10–14, 25 [cx] |
| Agentic loops: no auto-merge; degrade on auth failure (OD-1 open); reviewer agent ships in the template | 15 [reviewer agent: cross → AT-008.16] |
| Write authority: read/comment/self-assign yes, status never; detect-and-revert + notify; merge-only done (Done-scoped invariant); platform-only ops (scope-addition = volunteer-only); agent actions attribute to volunteer | 16–19 |
| Completion hooks (cancel/preserve/remove/read-only) + abandonment backlog return | 20, 21 |
| Ownership asymmetry: delivery NGO-owned / coordination platform-owned throughout, no transfer, dormant $0, billing owner platform | 22 [cx r2] |
| Panel content: current work + hierarchy [cross → AT-010.06]; recent activity conveyed with recency — NOT covered by AT-010.06/09; owed to REQ-010's suite (timestamped-activity fixture) | [cx r2: honest gap flagged; OD-2 open for scope beyond] |
