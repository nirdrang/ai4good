# Design task: the Discovery scope output run, six units, one design

You are one of four architect runners. Produce one candidate design package for the whole
subtree below. Read these first, in this order:

1. `loop/items/AI4DEV-135/design/how.md` (the traced model of the subsystem, with the sixteen
   acceptance ids verbatim and the attachment points).
2. `loop/items/AI4DEV-135/brief.md` (the six units and the repository facts).
3. `.taskmaster/docs/acceptance/at-req-004.md` sections B, D and G.
4. The code the how file names. Read `supabase/functions/_shared/discovery-turn.ts`,
   `discovery-prompt.ts`, `discovery-metering.ts`, `need-intake.ts`, `notifications.ts`,
   `notification-taxonomy.ts`, `write-routes.ts`, the migration
   `supabase/migrations/20260920120000_discovery_turns.sql`, and
   `tests/at/suites/req-004/_fixture.ts`, `_contract.ts`, `_pending.ts`, `_source-absences.ts`.

Then read the architect skill's runner prompt and rationale template, which are appended at the
end of this file, and produce the package in that shape.

## The six units, in build order

1. **The scope output contract.** A completed Discovery emits the full contract: summary, user
   stories with nested acceptance criteria, suggested stack, complexity tier (small, medium,
   large), risk flags, data-sensitivity tier, maintainability-fit verdict, zero to three cause
   labels, a Lovable recommendation with rationale, and both build-split parts (Lovable-built
   and Claude-Code-coded), always. AT-004.20, AT-004.22. The sensitivity tier and the fit
   verdict are fields with a stated shape here; a later run fills them with judgment.
2. **Money-free rendering.** The backend renders the contract to markdown. No project or
   build-cost figure anywhere; the complexity tier never in money. The approximate monthly
   maintenance figure (about 25 dollars a month, paid by the NGO directly to Lovable) and the
   Lovable pricing link are permitted copy. Each tier's document explains its data tier (Tier 2
   adds fixtures-only handling), the complexity tier with rationale and start-small advice,
   maintenance expectation (chat-evolve, NGO owns the code), and pricing. AT-004.21, AT-004.25.
3. **Scope as contract.** A stable, versioned read of the scope that the dev-authored PRD
   authoring and the completion scorer (both unbuilt, wave 3) take as their source and gate
   reference. No path decomposes a scope into tasks. AT-004.24, AT-004.52. Decide what is
   provable now and what stays red under a named pending capability.
4. **Cause-label producer.** A shared vocabulary table. Generation reuses an existing label
   when the need fits it ("food security" in the vocabulary plus a food-bank need emits "food
   security", not "hunger relief") and grows the vocabulary only for a genuinely new domain. A
   thin conversation yields zero labels. The NGO removes a label through a new write route
   (deletion only). No create or curate control and no admin taxonomy surface exists anywhere.
   The org-profile mission text is one input. AT-004.58, .59, .60.
5. **Free-phase guardrails.** On free credits: a scope rule declines or redirects unrelated
   tasks; a deterministic per-conversation turn ceiling (a pinned number, founder to rule on
   the value) after which Discovery wraps up (generates the scope or directs to a fresh
   Discovery); repeated off-topic declines produce a plain notice and a founder-visible flag,
   never a lockout. On fuel: none of it. The off-topic count is a fact the platform records,
   not a model opinion; say how a decline is detected deterministically. AT-004.12 to .15.
6. **Regeneration.** The NGO can regenerate the scope a bounded number of times (three, pinned),
   each with a logged reason, at zero credits. When the bound is exhausted the case escalates
   to an admin (a durable record plus the admin notification through the emitter). A retry
   after a system error costs zero. AT-004.37, .38, .39.

## Fixed constraints every candidate honours

- `discovery_turns` is immutable after settle except the allow-listed columns; one open turn per
  project; a `failed` turn charges zero; `elicitation` is the settled turn's jsonb with exactly
  five keys and its tool is strict. Do not widen the elicitation record.
- Every new table joins the tenant read posture (`TENANT_CATALOG`, RLS, revoke baseline). Every
  new write route registers in `write-routes.ts` with its security-definer RPC. Read routes stay
  out of the inventory.
- The chat page reads `text` parts and `data-turn`; any new stream part is `data-*` and the page
  ignores it today.
- Notifications go only through `emit_notification` from a security-definer function, with a
  taxonomy row that exists in both the TypeScript `TAXONOMY` and the SQL seed. Forbidden event
  names match `/scope[._-]?change/`, `/change[._-]?request/`, `/\bcr\b/`, `/donat/`.
  `NOTIFICATION_COMPONENTS['scope.service']` already names `supabase/functions/_shared/scope.ts`
  and `supabase/functions/scope/`, neither of which exists.
- The loop tier runs against the Anthropic stand-in (`h.vendors.anthropic.script(...)`); the
  integration tier runs the real model only when a key is present and otherwise declares
  `vendors.anthropic` red. Model-judgment claims (label reuse) must be provable at loop tier by
  scripting the tool call and at integration tier against the real model.
- Pinned numbers live in `tests/at/harness/atconfig.ts` with a source; `_source-pins.ts` asserts
  the product constant equals the pin.
- The need's stages are `draft` and `discovery_in_progress` only. The stage after scoping
  belongs to an unbuilt requirement. Say how a scoped need is marked without building that
  engine.
- The UI never touches the database; the front end is out of scope for this run beyond
  keeping the stream compatible.

## What the package must decide, explicitly

1. Where the scope lives (on the turn, on the need, in its own table) and what "completed
   Discovery" means (the elicitation's `complete` flag, the ceiling, or both).
2. How generation is triggered: a tool call inside a chat turn, or a separate non-chat model
   call from a dedicated route, or automatic on the completing settle.
3. The versioned read the PRD and scorer consume, and what the two interface stubs assert.
4. The vocabulary table, how the model sees it, how reuse is proven at both tiers, and the
   deletion route.
5. The guardrail mechanics: the scope line, the ceiling pin, how a decline is counted
   deterministically, the founder flag (a notification row or a durable flag), and the fuel
   bypass.
6. The regeneration bound, the reason log, the zero-cost path through the ledger's constraints,
   the escalation record and its notification.
7. Which acceptance ids go green at loop, which at integration, and which stay red under which
   pending name, with a one-line reason each.
8. The module map: new files, changed files, new migrations, new routes, new taxonomy rows,
   new pins, new test files.

## Your assigned structural direction

Your direction is in the file named `direction.md` beside your output path. Follow it. Do not
converge on a middle design; the differences between candidates are the signal.

## Output

Write `candidate.md` in your output directory, shaped per the rationale template below, with
the type sketch (TypeScript types and function signatures with `not implemented` bodies, SQL
DDL for tables, the tool JSON schema for any model tool) and the module map. One file. No code
outside the sketch. Do not modify the repository.

---

# Appendix A: architect runner prompt

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


# Appendix B: rationale template

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

