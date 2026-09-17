You are writing an architectural explanation for a senior engineer. Multiple explorer agents have traced different slices of the codebase in parallel and gathered findings. Synthesize their findings into one coherent, well-structured explanation.

You are read-only over the tree. Do not edit, create, or run anything that writes under the repository, except the one output file named at the end. Working directory is the item worktree; every path is relative to it. If you shell out, use PowerShell syntax; you are on Windows.

## Original Question

> How does the ai4good tree support building deliverable D1 of the AI Discovery agent (REQ-004) plus three extra leaves from the same requirement, in one run of six units: (1) per-turn allowance metering at a constant cost-to-credit ratio against the existing daily ledger, with the turn's cost recorded; (2) funded projects bill their own fuel and never the free pool, with project isolation and a mid-conversation switch, while no fuel ledger exists yet; (3) zero-credit remedies split by tier; (4) the Discovery conversation itself on Claude Opus from a Supabase edge function on Deno, persisted and resumable, with an Anthropic stand-in for the acceptance harness; (5) abuse guardrails: unverified blocked, a per-NGO admin kill switch, and static absence proofs that no supplemental grant path and no platform breaker exist; (6) transparency: remaining credits and per-turn cost readable, zero-cost actions leave no balance delta. The run must create `tests/at/suites/req-004/` and `tests/at/expected/req-004.json` in the shape of the intake suite under `tests/at/suites/req-003/`, register all fifty-eight P0 ids of `.taskmaster/docs/acceptance/at-req-004.md` through `atTest` (twenty proven in this run, thirty-eight pending with a stated shape), and pass `at:check`. The manifest is `loop/decomp/req-004.md`, the brief is `loop/items/AI4DEV-132/brief.md`. Read the brief first.

## Explorer Findings

Read these three files in full. They are the explorers' replies.

- `loop/items/AI4DEV-132/how/explorer-a-ledger-suite.md` (the allowance ledger and the acceptance suite shape)
- `loop/items/AI4DEV-132/how/explorer-b-writeframe.md` (the write frame, intake, projects, admin routes, notifications, audit)
- `loop/items/AI4DEV-132/how/explorer-c-anthropic-seam.md` (the Anthropic seam, vendor stand-ins, the harness clock and oracle, the Deno runtime, the environment)

Also read `loop/items/AI4DEV-132/brief.md` (the six units and the ask), `.taskmaster/docs/acceptance/at-req-004.md` and `loop/decomp/req-004.md`.

## Instructions

The explorers each investigated a different angle of the same subsystem. Their findings will overlap in places and may occasionally contradict. Reconcile them. Merge overlapping descriptions, resolve contradictions by checking the code yourself, and combine the separate slices into a unified picture.

Write an explanation a senior engineer unfamiliar with this area could read and walk away with a solid mental model, understanding the architecture well enough to start working in it confidently.

You have read-only access to the codebase to check anything, clarify a detail, or fill a gap. Use Read, Grep, and Glob as needed. The explorers did the work, so you shouldn't need to re-explore from scratch. Verify every constraint you state against the tree; cite the path and line.

## Output Format

Use this structure.

### Overview
1-2 paragraphs.

### Key Concepts
The important types, services, or abstractions needed to follow the rest.

### How It Works
The core of the explanation. Walk through: how a Discovery allowance is granted, read and debited today; how a need reaches `discovery_in_progress`; how a write route is framed, registered, audited and refused; how a suite registers ids, declares pending ids, pins facts with static arms, and is judged by `--expect` at each tier; how a vendor stand-in is built and consumed; how an edge function would call an npm package and read a secret; what the semantic-oracle harness offers or that it does not exist. Use prose. A mermaid diagram only where it clarifies.

### Where Things Live
A file and directory map.

### Constraints for the design
A numbered list of every constraint a design for the six units must respect, each one sentence with a path. Include harness constraints (atTest, at:check bijection, expected-file shape, capability names already in use, the ui tag), database posture constraints (revoke, RLS, catalog row, policy shape, viewer helpers), write-route constraints (inventory, refusal kinds, DETAIL convention, audit enum migrations, admin role check), notification constraints (sole writer, taxonomy rows), the allowance ledger's existing contract that req-002 ids depend on, the projects and need_intakes shapes, and the environment constraints on keys and CI. Aim for the complete set; thirty to forty is expected.

### Ids whose proof waits on another surface
For each of the twenty ids of this run (AT-004.01, .02, .03a, .03b, .04, .05, .06, .08, .09, .10, .11, .41, .42, .43, .44, .45, .46, .47, .48, .49), say whether it can be green at loop and at integration with what this run may build, or must be declared pending, and on which capability name (reuse names already in `tests/at/expected/` where one fits). Mark each as certain or open.

### Gotchas
Non-obvious things, surprising behavior, historical context, pitfalls.

## Communication Style

- Use concrete language, not abstractions-about-abstractions.
- Say "the `UserService` calls `AuthClient.refresh()`" not "the service delegates to the client".
- When something is complex, explain why it's complex. When something is simple, don't pad it out.
- If the explorers flagged open questions or gaps, acknowledge them rather than hiding them.
- Short declarative sentences. No long-dash character. No mid-sentence colon.

## Output

Write the explanation to `loop/items/AI4DEV-132/how/explanation.md` with the Write tool. That is the one file you may write. Then reply with five lines: the line count of the file, the number of constraints, the number of ids you marked pending at integration, any contradiction between explorers you had to resolve, and the path.
