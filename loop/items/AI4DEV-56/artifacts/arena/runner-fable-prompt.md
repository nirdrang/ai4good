# Arena runner: claude:fable@low

# Architect runner prompt

The orchestrator passes this file through to every parallel candidate runner during Phase B and fills in the variable inputs around it: the task, the Phase A grounding artifacts, the isolated working directory, and the path to write outputs. The working directory is a git worktree when available, otherwise a per-runner subdirectory under the sketch dir; what matters is independence between candidates.

You are producing one candidate design in architect's parallel exploration. Read the **architect** skill in full first; that's the workflow you're inside. Output a candidate design package: type sketch, function signatures, module map, and prose rationale shaped per [`rationale-template.md`](rationale-template.md).

Apply the following discipline. The orchestrator compares candidates on these axes to pick a base.

- Caller's usage first. Write the README-style usage and two or three real call sites before the types, then derive the type sketch from them. The usage is the spec; the two must agree, so reconcile the sketch to the usage, not the reverse.
- Data structures first. Get the core types right and the code becomes obvious. Trace each dominant access pattern through the proposed structure; if the answer is "we'll add a map / index / cache later," the structure is wrong.
- Interface depth. Compare the capability hidden behind the public surface relative to the size of that surface. Prefer a simple interface that pulls complexity into the callee, even when the implementation becomes less simple. Do not put transport or wire types on the public surface; parse into domain types behind the interface.
- Shared state: if two actors might both write, ask "what happens?" If the answer isn't "nothing," default to per-actor state with a merge at the read boundary, per the **separate-before-serializing-shared-state** principle skill.
- Make boundaries visible. `not implemented` errors for bodies, `// TODO` pseudocode for tricky logic, doc comments stating intent and invariants. A reader should trace data from input to output by reading types and signatures alone.
- Encode invariants in types: hard-to-misuse types > runtime checks > prose comments, per the **encode-lessons-in-structure** principle skill.
- Validate at boundaries, trust types inside, per the **boundary-discipline** principle skill. Business logic as pure functions; the shell stays thin.
- Single source of truth per invariant. Derive instead of sync.
- Idempotent state transitions where applicable, per the **make-operations-idempotent** principle skill. Ask what happens if the operation runs twice or crashes halfway.
- Short call chains. If tracing the flow needs more than three files, flatten the hierarchy, per the **laziness-protocol** and **minimize-reader-load** principle skills.

You are one of several runners, each on a different model. Produce the best design your model can make; don't hedge against the others. Differences between candidates are the signal used to pick a base and graft. Converging on a safe-looking middle defeats the exploration.


## The task

Read loop/items/AI4DEV-56/artifacts/arena/design-task.md in full and follow it. It names what to read, the six units, the measured facts, the working assumption for the two clauses with no surface, what every package must contain, and the reply shape.

## Your structural direction

SHARED MODULE FIRST. The boundary is a typed CallerAccount loader plus one pure writeAllowed decision in supabase/functions/_shared/, imported by every write route and by the loop fixture; the edge entries become declarative (a route table: name, admitted account types, the definer it calls), and a definer-side helper is only the backstop. The write inventory IS the route table, one exported constant the AT-001.29 body iterates and the scan checks against the tree. Push as much judgement as possible into the type-checked pure modules and keep the untyped edge files to plumbing.

## Output

Write your design package to loop/items/AI4DEV-56/artifacts/arena/candidate-fable.md. You are read-only everywhere else: do not run git, do not start processes, do not touch the database, do not modify any other file.

## The rationale template your package follows

# Rationale template

The prose that ships alongside the type sketch. One page. Sentence-case headings, no boilerplate. Replace the italic notes with actual content.

## Problem

*One paragraph. What we're trying to do, and what about the existing system or constraints makes the shape non-obvious. If [Phase A](../SKILL.md#phase-a-ground-the-problem) surfaced constraints the design must honor (existing types to interop with, callers we can't break, invariants that crossed our boundary), name them here so the reader sees the same constraints you saw.*

## Usage (caller's view)

*Write this first, before the type sketch. Show the README or quickstart the consumer reads, plus two or three realistic call sites in their own code. What they import, what they call, what comes back. The type sketch in [Shape](#shape) is derived from this. The two must agree; when they diverge, reconcile the sketch to the usage, not the reverse. The caller's experience is the spec. The types serve it.*

## Shape

*The recommended architecture. Data structures first; then how data flows through the signatures. Name the load-bearing decisions. State which invariants are encoded in types, where validation lives, and what the system deliberately does not do. Judge interface depth explicitly. State what complexity the public surface hides, what remains exposed to callers, and why the interface is no larger than needed. Cite the principle behind each decision (e.g., `per boundary-discipline`); don't restate it.*

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

