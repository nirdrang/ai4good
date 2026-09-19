You are writing an architectural explanation for a senior engineer. Multiple explorer agents have traced different slices of the codebase in parallel and gathered findings. Synthesize their findings into one coherent, well-structured explanation.

## Original Question

> How does the Discovery subsystem produce, store, meter and stream a turn, and where would a second structured output (the scope) and a cause-label vocabulary attach: supabase/functions/_shared/discovery-*.ts, discovery-message and discovery-conversation routes, need-intake.ts, notifications.ts and the taxonomy, tests/at/suites/req-004, the at-config registry, and the Discovery chat page under src/.

## Explorer Findings

The four explorer reports are files. Read each in full before writing:
- loop/items/AI4DEV-135/lanes/how-explorer-1.out.md (turn lifecycle, ledger, stream parts)
- loop/items/AI4DEV-135/lanes/how-explorer-2.out.md (prompt, tools, Anthropic port, the loop-tier stand-in)
- loop/items/AI4DEV-135/lanes/how-explorer-3.out.md (need intake, write routes, RLS posture, notifications taxonomy, vetting outcome shape, mission text)
- loop/items/AI4DEV-135/lanes/how-explorer-4.out.md (acceptance harness, the sixteen acceptance ids verbatim, architecture notes, the chat page)

## Instructions

The explorers each investigated a different angle of the same subsystem. Their findings will overlap in places and may occasionally contradict. Reconcile them. Merge overlapping descriptions, resolve contradictions by checking the code yourself, and combine the separate slices into a unified picture.

Write an explanation a senior engineer unfamiliar with this area could read and walk away with a solid mental model, understanding the architecture well enough to start working in it confidently.

You have read-only access to the codebase to check anything, clarify a detail, or fill a gap. Use Read, Grep, and Glob as needed. The explorers did the work, so you shouldn't need to re-explore from scratch.

## Output Format

Use this structure, adapted to what makes sense for the question. Not every section is needed for every question.

### Overview
1-2 paragraphs. What is this thing, what does it do, why does it exist. Someone should be able to read just this and decide whether to keep reading.

### Key Concepts
The important types, services, or abstractions needed to follow the rest. Brief definitions, not exhaustive.

### How It Works
The core of the explanation, and the longest section. Walk through the flow: what triggers it, what happens step by step, where data goes, what the decision points are.

Use prose, not pseudocode. Reference specific files and functions so the reader knows where to look, but don't dump large code blocks unless a snippet is essential to a point.

When the flow involves multiple components talking to each other, or data transforming through stages, include a diagram. Use mermaid (```mermaid) for structured flows (sequence diagrams, flowcharts, component graphs) or ASCII art for simpler relationships where mermaid would be overkill. Use your judgment. A diagram should clarify, not decorate. If prose covers the flow, skip the diagram.

### Where Things Live
A brief file/directory map. Just the ones someone would need to start working here.

### Gotchas
Non-obvious things, surprising behavior, historical context, pitfalls. Skip this section if there's nothing worth calling out.

## Communication Style

- Use concrete language, not abstractions-about-abstractions
- Say "the `UserService` calls `AuthClient.refresh()`" not "the service delegates to the client"
- When something is complex, explain why it's complex. Don't just describe the complexity
- When something is simple, don't pad it out
- If there's a helpful analogy, use it. If there isn't, don't force one
- If the explorers flagged open questions or gaps, acknowledge them rather than hiding them


Write the explanation to loop/items/AI4DEV-135/design/how.md (create it). Keep every verbatim acceptance-id quotation and every verbatim schema the explorers captured; the design step needs them exact. End the file with a section 'Attachment points for this run' that lists, for each of these six pieces of work, the exact files, tables, functions, test names and pending names it touches: (1) the scope output contract as a second structured output, (2) money-free markdown rendering of the scope, (3) a versioned scope read plus the absence of any scope-to-tasks path, (4) a cause-label vocabulary table, generation with reuse, and a deletion-only write route, (5) free-phase guardrails: scope rule, turn ceiling pin, off-topic counter and founder flag, none on fuel, (6) bounded regeneration at zero credits with logged reasons and admin escalation. Reply to the caller with five lines at most plus the file path. Write nothing else to disk.
