# Design task: the project need intake (REQ-003), one design for seven units

You are one runner in a four-lane design arena. Produce one candidate design package for the whole subtree. You are read-only over the tree. Do not edit, create, or run anything that writes under the repository. Working directory is the item worktree; every path below is relative to it. If you shell out, use PowerShell syntax.

## Read first, in this order

1. `loop/items/AI4DEV-120/brief.md`. The seven units, the facts, the ask.
2. `loop/items/AI4DEV-120/how/explanation.md`. The grounding. Its section "Constraints for the design" is binding: a design that breaks one of the thirty constraints is rejected before scoring. Its section "Ids whose proof waits on another surface" is the lead's reading; you may disagree with reasons.
3. `.taskmaster/docs/acceptance/at-req-003.md`. The thirteen P0 ids.
4. `loop/decomp/req-003.md`. The manifest and its cross-contracts.
5. `tests/at/suites/req-002/` and `tests/at/expected/req-002.json`. The suite shape you copy. Read `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, `_bind.ts`, one `_source-*.ts`, one test file.
6. `supabase/functions/set-organization-profile/index.ts`, `supabase/functions/_shared/write-routes.ts`, `supabase/functions/_shared/edge.ts`, `supabase/functions/_shared/memberships.ts`, `supabase/migrations/20260914120000_org_vetting.sql`, `supabase/migrations/20260916120000_discovery_allowance.sql`. The write frame and the two aggregates that came before.

The explorer reports under `loop/items/AI4DEV-120/how/explorer-*.md` hold more detail if you need it.

## What the design must cover

One design, seven units. For each unit the design names the tables, the SQL definer functions, the edge routes, the `_shared` decision modules, the refusal kinds, the suite files, and the acceptance ids that turn green at each tier or are declared red with a `capability-pending` shape and a stated capability name. The units, from the brief:

1. Capture title, description and urgency on a draft; only the NGO admin starts a need. AT-003.01, .02, .04.
2. The missing-description block, isolated from every other gate; autosave with no explicit save. AT-003.03, .05.
3. A pre-Discovery draft carries zero cause labels; the producer is stubbed. AT-003.17.
4. Optional reference upload attaches to the draft, with the base data-responsibility disclosure the upload surface must show. AT-003.07, .09.
5. The Tier-2 hardened disclosure is present before any further upload once classification lands; the classification event is stubbed. AT-003.10.
6. Submission by a verified admin with capacity starts Discovery and moves the need from draft to discovery_in_progress, with or without a file. AT-003.11, .12.
7. A raw-intake audit snapshot at submission, unchanged under later edits, retrievable by the platform. AT-003.14, .16.

Decisions the design must make and say why, each in one paragraph:

- Where the need lives: a row on `public.projects`, its own table joined to `projects`, or its own table with no join yet. The projects table comment says product creation is not landed there, and constraint 11 forbids a state column on any table named like a project.
- How the draft to discovery_in_progress transition is proven until the lifecycle engine of REQ-005.5 exists: a local stage on the need with a pure transition helper, or AT-003.11 and .12 red on the engine. Say what the engine deletes or absorbs later.
- What "attached" means with no storage primitive: the metadata shape, and what loop proves and what integration cannot.
- What the upload route serves for the disclosure, copy or a flag, and where the copy lives as a shipped constant.
- How the Tier-2 classification is stubbed: the column or event, who sets it (operator SQL at integration, a fixture command at loop), and how the hardened disclosure follows it without a further upload.
- How zero cause labels are represented: a column, an array, a table with no rows, and what REQ-004 writes later.
- Where the snapshot lives: a row on `audit_events`, or an immutable table of its own, and how the platform retrieves it.
- Autosave as a data contract: the write route's patch semantics, idempotency, and what a second session reads back.
- The refusal kinds added to `WRITE_REFUSAL_KINDS` and the exact SQL DETAIL each definer raises.
- The red set: every id red at either tier, its capability name, and the reason. Fewer reds are better only when the green is honest.
- Which units go to the hardest-tasks lane (the writer must still design something) and which to the feature lane (the writer applies a fixed contract). The sheet's writer lanes are astra at low for feature and astra at medium for hardest tasks.

## The rubric the judge and the lead score

1. Constraint compliance. Every one of the thirty constraints in `explanation.md` holds. Name any you bend and why. A hard break is disqualifying.
2. Honest green count. How many of the thirteen ids are green at loop and at integration, with each red carrying a capability name a stranger could act on.
3. Interface depth. Routes and RPCs are few, the wiring leaf's screen later calls a small surface, and the complexity of gates, autosave, snapshot and disclosure sits behind it.
4. Invariants in structure. The snapshot cannot change, autosave twice converges, submit twice is safe, the description gate is isolated from verification and capacity by construction, and the pre-Discovery draft cannot carry a label.
5. Fit for what comes later. The lifecycle engine, the storage primitive, and the label producer replace or extend this design with the least throwaway. Name what each deletes.
6. Diff size. The smallest change that gives the above. Count migrations, routes, definers, modules and suite files.

## Output

One document, shaped per the architect rationale template: Problem, Usage (caller's view, written first, with the seven unit call sites in test form), Shape (tables with columns and types, definer signatures, route names and request and response bodies, `_shared` module names and exported function signatures, the suite's SUT contract members, the manifest's red entries), Tradeoffs accepted, Alternatives considered, Open questions and risks, Next implementation step. Leave "Synthesis decision" empty. Add a final section "Per-unit plan" with one block per unit naming files, ids, tier result, and lane.

Do not converge on a safe middle. Your lane has an assigned structural direction below. Push it as far as it honestly goes, and say where it breaks if it does.
