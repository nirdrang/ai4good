# AT-REQ-024 — Project Blockers (operational health, independent of lifecycle)

Source: requirements/req-024.md (prd-mvp.md REQ-024, incl. d67/d69/d71 amendments). Dependencies: REQ-005.5, REQ-009, REQ-010, REQ-011, REQ-016, REQ-021.

**Boundary note:** REQ-024 owns blocker types, their raise/resolve/aging mechanics, and what each surface must show. Lifecycle independence is asserted state-side in AT-005.5.38; the showcase chip's card placement in AT-011.08; the page Q&A log display in AT-010.12/13; fuel-threshold detection in AT-009.14 — `[cross:]` here.

## A. Raising & resolving

- **AT-024.01 (P0)** — Given the assigned volunteer, When they raise a blocker with type, severity, title, and body, Then the blocker exists with all four fields and the project's blocker count increments.
- **AT-024.02 (P0)** — Given an open blocker, When resolution is attempted without a note, Then it is rejected; with a note, Then it resolves and the note persists on the record.
- **AT-024.03 (P0)** — Given the two roles, When the volunteer raises a blocker (persisted with actor=volunteer) and resolves one, and the NGO raises an available type (persisted with actor=NGO) and resolves an awaiting-NGO-review blocker (state flips to resolved with the NGO as resolver), Then each of the four operations shows its concrete persisted result. [cx: split into role-specific operations with observable state assertions]
- **AT-024.27 (P0)** — Given each v1 manual type in turn, When exercised per its rules, Then: a clarifying question can be raised by the DEV only (an NGO attempt does not create one) and resolves manually; awaiting-NGO-review resolves by the NGO; an external-dependency blocker raises under the general field rules (no special field required); and a GitHub-collaborator blocker stays open until the NGO confirms access AND the resolution note is recorded; and Given a sentinel UNKNOWN type string, When submitted, Then it is rejected with no blocker created and no count change — the catalog is closed; custom cases use the catch-all. [cx] [cx r2: invented dependency-context field dropped; closed-catalog negative added]
- **AT-024.04 (P0)** — Given the manual catch-all type, When raised, Then it requires a per-instance action-owner; and When the owner chosen is admin/ops, Then the ops work item is created immediately. [cross: REQ-030]
- **AT-024.05 (P0)** — Given every NGO-facing free-text surface of a blocker (raise form, Q&A, resolution note), When each renders, Then it carries the Tier-1/Tier-2 warning: never paste beneficiary data, passwords, keys, or live credentials.
- **AT-024.06 (P0)** — Given a blocker's conversation, When probed, Then it consists of the blocker's Q&A plus the project comment thread — no separate chat channel exists (absence).

## B. Auto-raised types (singleton, in-place severity)

- **AT-024.07 (P0)** — Given project fuel crossing 20% remaining (controlled fixture), When the monitor detects it, Then a fuel blocker auto-raises at warning severity; When fuel then reaches the stop, Then the SAME instance upgrades to blocking severity in place — same blocker id, no duplicate; When a top-up lifts fuel above 20%, Then it auto-resolves. [cross: AT-009.14 owns threshold detection]
- **AT-024.08 (P0)** — Given the auto-raised types (fuel, Lovable credits, Lovable setup), When the raising condition fires repeatedly UNCHANGED, Then at most ONE unresolved instance per type exists per project with id AND severity preserved — repetition alone never escalates; When the condition WORSENS (fixture), Then the SAME instance upgrades severity in place — never a duplicate; and Given the same condition firing on TWO projects (second fixture), Then one unresolved instance exists on EACH — the singleton is per project, not global. [cx r2: unchanged-repeat vs worsened split (repeat-upgrades was wrong); two-project scope fixture]
- **AT-024.09 (P0)** — Given TWO blockers of the SAME manual type raised on one project, When probed, Then both distinct instances remain open simultaneously — the singleton rule applies to auto-raised types only. [cx r2: same-type fixture pinned — different-type multiplicity would not have proven it]
- **AT-024.10 (P0)** — Given the Lovable-credits status read from Lovable shows low/exhausted (fixture), When detected, Then the Lovable-credits blocker raises; and its resolution is an NGO action (auto-resolution does not occur on the platform side alone). [cross: AT-021.21/22 own the status read]
- **AT-024.11 (P0)** — Given a Lovable-setup-pending blocker, When platform validation completes, Then it auto-resolves with no manual step. [cross: AT-021.10]

## C. Notifications & aging

- **AT-024.12 (P0)** — Given a blocker is raised, Then the NGO admins are notified; Given the fuel blocker turns blocking, Then an admin is also notified; Given any blocker resolves, Then both parties are notified. [cross: REQ-016 owns delivery]
- **AT-024.13 (P0)** — Given an unresolved blocker (controlled clock), When 48h pass, Then a reminder fires; just before 48h, none has.
- **AT-024.14 (P0)** — Given a NON-Lovable-setup blocker unresolved at 7 days, Then it escalates to an admin and the project is flagged at-risk; just before 7d, neither has happened. [cx: scoped — Lovable-setup follows its own mutual-silence rule in .15]
- **AT-024.15 (P0)** — Given a Lovable-setup blocker aging, When it ages, Then the NGO and volunteer are notified first, and an admin is involved ONLY after 7 days of MUTUAL silence — activity by either party before 7d prevents the admin escalation (two fixtures: silence vs one-party activity) — and when the 7-day mutual-silence escalation fires, the project is ALSO flagged at-risk. This test is the authoritative home of the mutual-silence rule. [cx: circular AT-008.05 delegation removed] [cx r2: the at-risk consequence restored for the Lovable-setup path — .14's scoping had orphaned it]
- **AT-024.16 (P0)** — Given open blockers at completion, When the project completes, Then all auto-archive.

## D. Clarifying questions

- **AT-024.17 (P0)** — Given a clarifying question, When raised, Then it carries topic, what was tried, and what is needed — and both variants work: project-level and requirement-anchored (anchored to a PM-tree requirement item; dev-tree items are never NGO-facing anchors). [d86]
- **AT-024.18 (P0)** — Given an unresolved requirement-anchored clarification, When that requirement renders on the NGO-facing panel, Then it is marked awaiting NGO clarification, and the volunteer can still progress OTHER work (a second item moves normally). [d86]
- **AT-024.19 (P0)** — Given a clarification resolved, When the lifetime Clarifications log is read at any later point, Then the pair persists with who asked, who answered, and when. [cross: AT-010.12 owns the page display]

## E. Surfaces

- **AT-024.20 (P0)** — Given an `in_progress` project with two blockers (highest severity `warning`) AND an `open` project with one blocker (two fixtures), When the surfaces render, Then: the in-progress project shows presence/count/highest-severity on its page, showcase card, and NGO dashboard; the open project shows them on its public page and NGO dashboard while its marketplace card shows NO blocker signal. [cx: the open-project page/dashboard visibility half added — only the card-absence was tested] [cross: AT-011.08 owns the chip's leak-free form]
- **AT-024.21 (P0)** — Given the NGO dashboard with blockers of mixed severities and ages (fixtures, controlled clock), When it renders at 47h59m and again past 48h for the same item, Then they aggregate by severity then age, the item carries NO added prominence at 47h59m, and the added prominence appears only past 48h — the threshold discriminates. [cx r2: pre-threshold negative added — always-prominent would have passed]
- **AT-024.22 (P0)** — Given work blocked on NGO action and separately on fuel (two fixtures), When cadence stats render, Then each notes the blocked-on cause — this test owns the blocked-cause rendering. [cx: wrong REQ-010 delegation removed]
- **AT-024.28 (P0)** — Given the in-progress fixture of AT-024.20, When the highest-severity blocker is resolved, Then count and highest severity recompute on ALL three surfaces; When the final blocker is resolved, Then every surface shows the zero state — surfaces reflect current state dynamically, not just at render time. [cx: added — all fixtures were static]
- **AT-024.23 (P0)** — Given the showcase chip, When rendered, Then it is noninteractive and carries only count + a severity from `info / warning / blocking` — never type, title, body, or acting party; and at zero open blockers, the showcase exposes NO nonzero blocker signal (whether the zero state is an absent chip or an explicit zero chip is unprescribed — a product call, not requirement-owned). [d71] [cx r2: absence-means-zero mandated an unstated representation] [cross: AT-011.08]

## F. Independence, credit & release cleanup

- **AT-024.24 (P0)** — Given an open blocker on an `in_progress` project, When it RESOLVES, Then lifecycle state is unchanged by the resolution — the raise half is owned by AT-005.5.38; this test keeps only the resolution half. [cx r2: raise-path duplication with AT-005.5.38 removed] [cross: AT-005.5.38]
- **AT-024.25 (P0)** — Given two completed projects — one with a heavy blocker history, one with none, When each volunteer's durable completion-credit event/counter and private confirmation are read, Then the counter carries no blocker-derived decrement and the private confirmation is unchanged — blockers never reduce completion credit; no public credit surface exists in v1. [cx: corrected — REQ-014 forbids public credit display in v1; the original test invented one]
- **AT-024.29 (P0)** — Given a volunteer whose inactivity window overlaps an open awaiting-NGO blocker (fixture), When the internal reputation/outreach record is read, Then the waiting-on-someone-else period is distinguishable from ghosting on that record — and no public rating exists and no completion credit changed. [cx: added — the separation-feeds-reputation clause had no test] [cross: AT-027.09 owns the ghosting flag semantics]
- **AT-024.26 (P0)** — Given a release with three open blockers — one volunteer-tied (the manual catch-all with action-owner set to the departing volunteer), one Lovable-setup-tied, one NGO-tied — parameterized over BOTH release paths (21-day timeout AND manual release), When the project re-lists after each, Then the volunteer-tied and setup-tied blockers are each either ARCHIVED (absent everywhere) or RETARGETED (valid new owner, correctly represented on the required surfaces) — the invariant is that no STALE or OWNERLESS blocker renders anywhere public — while the NGO-tied blocker survives correctly targeted. [cx: archive-vs-retarget branches] [cx r2: "awaiting-volunteer" was not a v1 type — catch-all owner fixture; both release paths parameterized] [d71 release cleanup] [cross: AT-005.5.33 owns the re-listing]

## Coverage map

| REQ-024 clause | Tests |
|---|---|
| Volunteer raises (type/severity/title/body); resolution requires note; both roles (concrete per-role ops); per-type catalog CLOSED (clarifying dev-only, NGO-review, external dependency general-rules, collaborator-until-NGO-confirms; unknown type rejected) | 01–03, 27 [cx r2] |
| Catch-all action-owner; admin/ops → immediate ops item | 04 |
| Tier warning on every NGO-facing free-text surface | 05 |
| Q&A + comment thread only (no separate channel) | 06 |
| Fuel blocker: auto-raise 20% warning / blocking at stop / auto-resolve above 20%; in-place severity | 07 |
| Auto-raised singleton per type PER PROJECT (unchanged-repeat preserves severity; worsening upgrades in place); same-manual-type multiplicity | 08, 09 [cx r2] |
| Lovable credits (read-driven raise, NGO-resolved); Lovable setup (auto-resolve on validation) | 10, 11 |
| Notifications on raise/blocking/resolve | 12 |
| 48h reminder; 7d admin escalation + at-risk (non-Lovable-setup) | 13, 14 [cx] |
| Lovable-setup mutual-silence aging (authoritative here; escalation also flags at-risk) | 15 [cx r2] |
| Auto-archive at completion | 16 |
| Clarifying questions: fields, variants, task-marking, continue-other-tasks, lifetime log | 17–19 |
| Surfaces: page/showcase/dashboard presence-count-severity (in_progress AND open fixtures); open card none; aggregation + 48h prominence (pre-threshold negative); cadence blocked-on notes (owned here); chip leak-free, no nonzero signal at zero; DYNAMIC recomputation | 20–23, 28 [cx r2] |
| Independent of lifecycle (resolution half here; raise half → AT-005.5.38); never reduces completion credit (durable counter + private confirmation — no public surface in v1); waiting-vs-ghosting separation feeds internal reputation | 24 [cx r2], 25 [cx], 29 [cx] |
| Release cleanup (archive vs valid-retarget branches; catch-all-owner + setup-tied fixtures; BOTH release paths; no stale/ownerless blocker public) | 26 [cx r2] |
