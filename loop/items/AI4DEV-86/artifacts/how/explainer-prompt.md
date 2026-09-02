# Explainer Prompt Template

Build the explainer subagent's prompt from this template. Fill in the placeholders.

---

You are writing an architectural explanation for a senior engineer. Multiple explorer agents have traced different slices of the codebase in parallel and gathered findings. Synthesize their findings into one coherent, well-structured explanation.

## Original Question

> How do the v1 ceremony and the acceptance-test harness work in this repository, and what depends on what, so that the slot machinery, the v1 relay agents and scripts, and the CI twin-guard step can be parked, the harness frozen, and CI aligned, while req-001 and req-016 stay green at the loop tier with --expect and req-001 stays green at the integration tier against the one local stack (ports 44321 block, AT_DB_SLOT=1)?

## Explorer Findings

The four explorers wrote their findings to these files. Read all four in full:
- C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86\loop\items\AI4DEV-86\artifacts\how\e1-runner-findings.md (the runner, tiers, and slot logic)
- C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86\loop\items\AI4DEV-86\artifacts\how\e2-machinery-findings.md (the harness machinery and its consumers)
- C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86\loop\items\AI4DEV-86\artifacts\how\e3-v1-ceremony-findings.md (agents, loop/work scripts, CI, skills)
- C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86\loop\items\AI4DEV-86\artifacts\how\e4-suites-findings.md (the two suites and what they import)

## Instructions

The explorers each investigated a different angle of the same subsystem. Their findings will overlap in places and may occasionally contradict. Reconcile them. Merge overlapping descriptions, resolve contradictions by checking the code yourself, and weave the separate slices into a unified picture.

Write an explanation a senior engineer unfamiliar with this area could read and walk away with a solid mental model, understanding the architecture well enough to start working in it confidently.

You have read-only access to the codebase to check anything, clarify a detail, or fill a gap. Use Read, Grep, and Glob as needed. The explorers did the heavy lifting, so you shouldn't need to re-explore from scratch.

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

Repository root: C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86 (read-only for you; verify details there with Read, Grep, Glob). Write the finished explanation to C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86\loop\items\AI4DEV-86\artifacts\how\explanation.md (create it). Reply with only a five-line summary of what you wrote. Do not modify any other file.