# Architect runner prompt

The orchestrator passes this file through to every parallel candidate runner during Phase B and fills in the variable inputs around it: the task, the Phase A grounding artifacts, the isolated working directory, and the path to write outputs. The working directory is a git worktree when available, otherwise a per-runner subdirectory under the sketch dir. What matters is independence between candidates.

You are producing one candidate design in architect's parallel exploration. Read the **architect** skill in full first. That's the workflow you're inside. Output a candidate design package: type sketch, function signatures, module map, and prose rationale shaped per [`rationale-template.md`](rationale-template.md).

Apply the following discipline. The orchestrator compares candidates on these axes to pick a base.

- Caller's usage first. Write the README-style usage and two or three real call sites before the types, then derive the type sketch from them. The usage is the spec. The two must agree, so reconcile the sketch to the usage, not the reverse.
- Data structures first. Get the core types right and the code becomes obvious. Trace each dominant access pattern through the proposed structure. If the answer is "we'll add a map / index / cache later," the structure is wrong.
- Interface depth. Compare the capability hidden behind the public surface relative to the size of that surface. Prefer a simple interface that pulls complexity into the callee, even when the implementation becomes less simple. Do not put transport or wire types on the public API. Parse into domain types behind the interface.
- Shared state: if two actors might both write, ask "what happens?" If the answer isn't "nothing," default to per-actor state with a merge at the read boundary, per the **separate-before-serializing-shared-state** principle skill.
- Make boundaries visible. `not implemented` errors for bodies, `// TODO` pseudocode for tricky logic, doc comments stating intent and invariants. A reader should trace data from input to output by reading types and signatures alone.
- Encode invariants in types: hard-to-misuse types > runtime checks > prose comments, per the **encode-lessons-in-structure** principle skill.
- Validate at boundaries, trust types inside, per the **boundary-discipline** principle skill. Business logic as pure functions. The shell stays thin.
- Single source of truth per invariant. Derive instead of sync.
- Idempotent state transitions where applicable, per the **make-operations-idempotent** principle skill. Ask what happens if the operation runs twice or crashes halfway.
- Short call chains. If tracing the flow needs more than three files, flatten the hierarchy, per the **laziness-protocol** and **minimize-reader-load** principle skills.

You are one of several runners, each on a different model. Produce the best design your model can make. Don't hedge against the others. Differences between candidates are the signal used to pick a base and graft. Converging on a safe-looking middle defeats the exploration.


---

# Rationale template

# Rationale template

The prose that ships alongside the type sketch. One page. Sentence-case headings, no boilerplate. Replace the italic notes with actual content.

## Problem

*One paragraph. What we're trying to do, and what about the existing system or constraints makes the shape non-obvious. If [Phase A](../SKILL.md#phase-a-ground-the-problem) surfaced constraints the design must honor (existing types to interop with, callers we can't break, invariants that crossed our boundary), name them here so the reader sees the same constraints you saw.*

## Usage (caller's view)

*Write this first, before the type sketch. Show the README or quickstart the consumer reads, plus two or three realistic call sites in their own code. What they import, what they call, what comes back. The type sketch in [Shape](#shape) is derived from this. The two must agree. When they diverge, reconcile the sketch to the usage, not the reverse. The caller's experience is the spec. The types serve it.*

## Shape

*The recommended architecture. Data structures first. Then how data flows through the signatures. Name the load-bearing decisions. State which invariants are encoded in types, where validation lives, and what the system deliberately does not do. Judge interface depth explicitly. State what complexity the public surface hides, what remains exposed to callers, and why the interface is no larger than needed. Cite the principle behind each decision (e.g., `per boundary-discipline`). Don't restate it.*

## Synthesis decision

*Filled in by [arena](../../arena/SKILL.md). Records which candidate became the base and why, what was adapted from each of the others, and what was rejected and why.*

## Tradeoffs accepted

*One bullet per tradeoff the chosen shape makes. Form: "we accept X in exchange for Y." Name anything a future reader might mistake for an oversight, including things that look like premature optimization or premature simplification.*

## Alternatives considered

*Required. Name at least one concrete alternative shape, with one line on why it lost. Judge each alternative on interface depth, not implementation simplicity alone. Name the complexity it exposes to callers and the complexity it hides. Two or three alternatives belong here when the design space had real contenders. One is fine when the constraints forced the answer, with the conclusion phrased as "this was the only viable shape because..." Avoid listing flavors of the same shape. This section covers design alternatives the chosen shape considered and rejected, not other runner candidates.*

## Open questions and risks

*Things you noticed during the sketch that the human needs to weigh in on, and risks worth flagging before implementation starts. Phrase as questions, not assertions, so the human's answer is the resolution rather than a comment.*

## Next implementation step

*The first thing to build against the sketch. One sentence. What you'd start writing immediately after synthesis (or after Phase D sign-off, if a checkpoint was opted into).*


---

# Design red flags

# Design red flags

Screen every candidate before synthesis. A red flag is a reason to revise or reject the shape.

## Shallow module

A shallow module exposes a large interface while hiding little complexity. Judge depth by the capability and policy hidden behind the public surface relative to the size of that surface. Prefer a simple interface backed by substantial behavior.

Do not confuse a deep module with a deep call chain. A deep call chain scatters understanding across layers. A deep module concentrates capability behind one interface.

Look for these signs:

- Callers coordinate several methods to complete one operation.
- Public options expose internal stages or implementation choices.
- Learning the interface does not save the caller from learning the implementation.

## Information leakage

Information leakage makes multiple modules depend on the same internal decision. A representation, policy, or protocol detail appears in more than one place, so changing it requires coordinated edits.

Public re-exports of transport or wire types are leakage. Parse external data into domain types behind the interface. Keep storage schemas, framework objects, and protocol details private.

## Temporal decomposition

Temporal decomposition organizes modules by execution order instead of the knowledge they own. Separate load, validate, transform, and save stages often repeat one representation and its invariants across several boundaries.

Group code around domain knowledge and ownership. Methods that run at different times can still belong to one module when they protect the same decisions.

## Pass-through method

A pass-through method forwards the same arguments to another method with the same shape. It adds a layer without hiding complexity.

Remove it or move responsibility to the module that can complete the operation. Keep a forwarding boundary only when it adds policy, adaptation, or a distinct abstraction.


---

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


## Your structural direction: intake as an append-only revision log

The need's content is never updated in place. Every autosave appends a revision row; the current draft is the latest revision; submission pins the revision id that was submitted, and that pinned row is the raw-intake snapshot, immutable because nothing updates revisions. Attachments and the classification are events in the same or a sibling log. Reads fold the log into the current draft. Argue where immutability by construction beats an append-only audit row, what the read surface costs, whether a head pointer table is needed, and where the log shape breaks against the posture scans, the row lock the definer scan demands, and the wiring leaf's screen that reads a draft.

Return the whole design document as your reply. Do not write any file. Your reply is captured by the runner.