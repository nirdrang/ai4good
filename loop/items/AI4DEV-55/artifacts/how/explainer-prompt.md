You are writing an architectural explanation for a senior engineer. Multiple explorer agents have traced different slices of the codebase in parallel and gathered findings. Synthesize their findings into one coherent, well-structured explanation.

Work in the repository at /home/user/ai4good. Read-only: do not edit any file except the one output file named at the end.

## Original Question

> How does the ai4good repository decide what an authenticated or anonymous caller may see, today, across the database (row-level security, security-definer functions, grants), the edge functions and their caller resolution, the front-end routes, and the acceptance-test harness for REQ-001 at both tiers; so that the tenant-isolation deliverable can grant the right reads (own NGO, assigned volunteer, platform admin), deny cross-organisation and unassigned-volunteer reads with no existence oracle, and render public surfaces only to a logged-out visitor, with acceptance ids AT-001.21, .22, .23, .24 and .40 green at the loop tier and the integration tier?

## Explorer Findings

Read these four files in full. They are the explorers' reports, one per angle.

- loop/items/AI4DEV-55/artifacts/how/e1-data-model-findings.md (the data model and database-side access control)
- loop/items/AI4DEV-55/artifacts/how/e2-request-path-findings.md (the request path through the edge functions and the front end)
- loop/items/AI4DEV-55/artifacts/how/e3-harness-findings.md (the acceptance harness for REQ-001 at both tiers)
- loop/items/AI4DEV-55/artifacts/how/e4-reference-branch-findings.md (a prior attempt at this deliverable on another branch, read as a source of decisions, never merged; its checkout is at .claude/worktrees/ref-66)

## Instructions

The explorers each investigated a different angle of the same subsystem. Their findings will overlap in places and may occasionally contradict. Reconcile them. Merge overlapping descriptions, resolve contradictions by checking the code yourself, and weave the separate slices into a unified picture.

Write an explanation a senior engineer unfamiliar with this area could read and walk away with a solid mental model, understanding the architecture well enough to start working in it confidently.

You have read-only access to the codebase to check anything, clarify a detail, or fill a gap. Use Read, Grep, and Glob as needed. The explorers did the heavy lifting, so you shouldn't need to re-explore from scratch.

Two facts the design that follows this explanation needs stated plainly, with file and line evidence: which of the surfaces the acceptance text names (drafts, ledger, reference files, comment thread, dashboard, tasks, public project page) exist today as tables or routes and which do not exist at all; and exactly how a test body can perform a database read as a specific signed-in user at each tier (what the loop fixture can and cannot prove about row-level security, and what the integration tier's live adapter reaches: PostgREST with the caller's JWT, an edge function, or the service role).

## Output Format

Use this structure, adapted to what makes sense for the question. Not every section is needed for every question.

### Overview
1-2 paragraphs. What is this thing, what does it do, why does it exist. Someone should be able to read just this and decide whether to keep reading.

### Key Concepts
The important types, services, or abstractions needed to follow the rest. Brief definitions, not exhaustive.

### How It Works
The core of the explanation, and the longest section. Walk through the flow: what triggers it, what happens step by step, where data goes, what the decision points are.

Use prose, not pseudocode. Reference specific files and functions so the reader knows where to look, but don't dump large code blocks unless a snippet is genuinely essential to a point.

When the flow involves multiple components talking to each other, or data transforming through stages, include a diagram. Use mermaid (```mermaid) for structured flows (sequence diagrams, flowcharts, component graphs) or ASCII art for simpler relationships where mermaid would be overkill. Use your judgment. A diagram should clarify, not decorate. If prose covers the flow, skip the diagram.

### Where Things Live
A brief file/directory map. Just the ones someone would need to start working here.

### Gotchas
Non-obvious things, surprising behavior, historical context, sharp edges. Skip this section if there's nothing worth calling out.

## Communication Style

- Use concrete language, not abstractions-about-abstractions
- Say "the `UserService` calls `AuthClient.refresh()`" not "the service delegates to the client"
- When something is complex, explain why it's complex. Don't just describe the complexity
- When something is simple, don't pad it out
- If there's a helpful analogy, use it; if there isn't, don't force one
- If the explorers flagged open questions or gaps, acknowledge them honestly rather than papering over them

## Where to write

Write the full explanation to loop/items/AI4DEV-55/artifacts/how/explanation.md. That is the only file you create or change. Then reply with exactly five lines: one line naming the output path, and four lines summarizing the explanation's most important conclusions for the design that follows.
