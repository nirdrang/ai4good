# AT-REQ-024 — Project Blockers (operational health, independent of lifecycle)

Source: requirements/req-024.md (prd-mvp.md REQ-024, incl. d67/d69/d71 amendments). Dependencies: REQ-005.5, REQ-009, REQ-010, REQ-011, REQ-016, REQ-021.

**Boundary note:** REQ-024 owns blocker types, their raise/resolve/aging mechanics, and what each surface must show. Lifecycle independence is asserted state-side in AT-005.5.38; the showcase chip's card placement in AT-011.08; the page Q&A log display in AT-010.12/13; fuel-threshold detection in AT-009.14 — `[cross:]` here.

## A. Raising & resolving

- **AT-024.01 (P0)** — Given the assigned volunteer, When they raise a blocker with type, severity, title, and body, Then the blocker exists with all four fields and the project's blocker count increments.
- **AT-024.02 (P0)** — Given an open blocker, When resolution is attempted without a note, Then it is rejected; with a note, Then it resolves and the note persists on the record.
- **AT-024.03 (P0)** — Given each role named by the AC, When the NGO raises a blocker type available to it and resolves one assigned to it (e.g. awaiting-NGO-review), Then both work — raising and resolving work for both roles, per type rules.
- **AT-024.04 (P0)** — Given the manual catch-all type, When raised, Then it requires a per-instance action-owner; and When the owner chosen is admin/ops, Then the ops work item is created immediately. [cross: REQ-030]
- **AT-024.05 (P0)** — Given every NGO-facing free-text surface of a blocker (raise form, Q&A, resolution note), When each renders, Then it carries the Tier-1/Tier-2 warning: never paste beneficiary data, passwords, keys, or live credentials.
- **AT-024.06 (P0)** — Given a blocker's conversation, When probed, Then it consists of the blocker's Q&A plus the project comment thread — no separate chat channel exists (absence).

## B. Auto-raised types (singleton, in-place severity)

- **AT-024.07 (P0)** — Given project fuel crossing 20% remaining (controlled fixture), When the monitor detects it, Then a fuel blocker auto-raises at warning severity; When fuel then reaches the stop, Then the SAME instance upgrades to blocking severity in place — same blocker id, no duplicate; When a top-up lifts fuel above 20%, Then it auto-resolves. [cross: AT-009.14 owns threshold detection]
- **AT-024.08 (P0)** — Given the auto-raised types (fuel, Lovable credits, Lovable setup), When the raising condition fires repeatedly, Then at most ONE unresolved instance per type exists per project — repeat conditions upgrade severity in place, never duplicate.
- **AT-024.09 (P0)** — Given manual types, When several are raised, Then several may be open simultaneously — the singleton rule applies to auto-raised types only.
- **AT-024.10 (P0)** — Given the Lovable-credits status read from Lovable shows low/exhausted (fixture), When detected, Then the Lovable-credits blocker raises; and its resolution is an NGO action (auto-resolution does not occur on the platform side alone). [cross: AT-021.21/22 own the status read]
- **AT-024.11 (P0)** — Given a Lovable-setup-pending blocker, When platform validation completes, Then it auto-resolves with no manual step. [cross: AT-021.10]

## C. Notifications & aging

- **AT-024.12 (P0)** — Given a blocker is raised, Then the NGO admins are notified; Given the fuel blocker turns blocking, Then an admin is also notified; Given any blocker resolves, Then both parties are notified. [cross: REQ-016 owns delivery]
- **AT-024.13 (P0)** — Given an unresolved blocker (controlled clock), When 48h pass, Then a reminder fires; just before 48h, none has.
- **AT-024.14 (P0)** — Given the same blocker unresolved at 7 days, Then it escalates to an admin and the project is flagged at-risk; just before 7d, neither has happened.
- **AT-024.15 (P0)** — Given a Lovable-setup blocker aging, When it ages, Then the NGO and volunteer are notified first, and an admin is involved ONLY after 7 days of MUTUAL silence — activity by either party before 7d prevents the admin escalation (two fixtures: silence vs one-party activity). [cross: AT-008.05]
- **AT-024.16 (P0)** — Given open blockers at completion, When the project completes, Then all auto-archive.

## D. Clarifying questions

- **AT-024.17 (P0)** — Given a clarifying question, When raised, Then it carries topic, what was tried, and what is needed — and both variants work: project-level and task-anchored.
- **AT-024.18 (P0)** — Given an unresolved task-anchored clarification, When the task renders, Then it is marked awaiting NGO clarification, and the volunteer can still self-assign and progress OTHER tasks (a second task moves normally).
- **AT-024.19 (P0)** — Given a clarification resolved, When the lifetime Clarifications log is read at any later point, Then the pair persists with who asked, who answered, and when. [cross: AT-010.12 owns the page display]

## E. Surfaces

- **AT-024.20 (P0)** — Given a project with two blockers (highest severity `warning`), When the project page, the in-progress showcase card, and the NGO dashboard render, Then each shows presence, count 2, and highest severity — and the OPEN-project marketplace card shows no blocker signal (fixture probe). [cross: AT-011.08 owns the chip's leak-free form]
- **AT-024.21 (P0)** — Given the NGO dashboard with blockers of mixed severities and ages (fixtures), When it renders, Then they aggregate by severity then age, and items unresolved past 48h carry the added prominence.
- **AT-024.22 (P0)** — Given work blocked on NGO action and separately on fuel (two fixtures), When cadence stats render, Then each notes the blocked-on cause. [cross: REQ-010.16-18]
- **AT-024.23 (P0)** — Given the showcase chip, When rendered, Then it is noninteractive and carries only count + a severity from `info / warning / blocking` — never type, title, body, or acting party; and its ABSENCE after successful load means zero open blockers (zero-state unambiguous). [d71] [cross: AT-011.08]

## F. Independence, credit & release cleanup

- **AT-024.24 (P0)** — Given a blocker raised and resolved on an `in_progress` project, When lifecycle state is read throughout, Then it never changes on account of the blocker. [cross: AT-005.5.38 owns the state assertion]
- **AT-024.25 (P0)** — Given two completed projects — one with a heavy blocker history, one with none, When public completion credit renders for both volunteers, Then it is identical in form and value — blockers never reduce public completion credit.
- **AT-024.26 (P0)** — Given an abandonment release with open volunteer-tied blockers (awaiting-volunteer fixture) and one NGO-tied blocker, When the project re-lists, Then the volunteer-tied blockers are archived or retargeted (none renders on any public surface) while the NGO-tied blocker survives correctly targeted. [d71 release cleanup] [cross: AT-005.5.30]

## Coverage map

| REQ-024 clause | Tests |
|---|---|
| Volunteer raises (type/severity/title/body); resolution requires note; both roles | 01–03 |
| Catch-all action-owner; admin/ops → immediate ops item | 04 |
| Tier warning on every NGO-facing free-text surface | 05 |
| Q&A + comment thread only (no separate channel) | 06 |
| Fuel blocker: auto-raise 20% warning / blocking at stop / auto-resolve above 20%; in-place severity | 07 |
| Auto-raised singleton per type; manual multiplicity | 08, 09 |
| Lovable credits (read-driven raise, NGO-resolved); Lovable setup (auto-resolve on validation) | 10, 11 |
| Notifications on raise/blocking/resolve | 12 |
| 48h reminder; 7d admin escalation + at-risk | 13, 14 |
| Lovable-setup mutual-silence aging | 15 |
| Auto-archive at completion | 16 |
| Clarifying questions: fields, variants, task-marking, continue-other-tasks, lifetime log | 17–19 |
| Surfaces: page/showcase/dashboard presence-count-severity; open card none; aggregation + 48h prominence; cadence blocked-on notes; chip leak-free + zero-state | 20–23 |
| Independent of lifecycle; never reduces public credit | 24, 25 |
| Release cleanup (volunteer-tied archived/retargeted) | 26 |
