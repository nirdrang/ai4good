You are writing an architectural explanation for a senior engineer. Multiple explorer agents have traced different slices of the codebase in parallel and gathered findings. Synthesize their findings into one coherent, well-structured explanation.

## Original Question

> How does the ai4good tree, at this branch's head, authorise and perform every WRITE today (the three write edge functions, caller resolution, the SECURITY DEFINER database functions and the triggers, the privilege posture and its two catalog checks); how does Supabase Auth on the local stack expose identities and the unlink endpoint, the admin API, the auth hooks, bans, and its rate limits; and how does the acceptance harness for REQ-001 drive the system at the loop tier and the integration tier, add a system-under-test member, provision operator-only Givens, and declare an id red by shape; so that the admin-operations deliverable can land (1) an audited, platform-admin-only contact transfer and lost-access recovery that moves an organisation's ownership to a new account, deactivates the old one and preserves every row's attribution, plus one escalation contact captured at concierge onboarding, (2) a lifecycle state on accounts that gates every write through ONE mandatory boundary every write route registers with, with a conformance check that fails any unregistered write route, plus AUP key revocation and platform-admin re-enable, (3) an append-only audit for role changes and contact transfer that cannot be altered or deleted, and a sign-in rate limit, (4) a proof that no leftover TRUNCATE, TRIGGER or REFERENCES privilege remains on the authentication tables, (5) a server-side refusal of GitHub identity unlink for volunteer accounts with a new acceptance id, and (6) a record of what the local auth rate limit really honours; with acceptance ids AT-001.25, .26, .27, .28, .29, .30, .31, .33, .34 and .35 green or declared red by shape at both tiers?


## Explorer Findings

Read these four files in full; they are the explorers' reports. Do not inline them into your answer.

- loop/items/AI4DEV-56/artifacts/how/e1-write-path-findings.md (the write path, from the edge to the row)
- loop/items/AI4DEV-56/artifacts/how/e2-harness-findings.md (the acceptance harness and how a leaf lands an id)
- loop/items/AI4DEV-56/artifacts/how/e3-auth-vendor-findings.md (Supabase Auth as this tree uses it, and the vendor surfaces the new work needs)
- loop/items/AI4DEV-56/artifacts/how/e4-requirements-and-record-findings.md (the requirement texts, cross-requirement contracts, and record conventions)

Also read loop/items/AI4DEV-56/brief.md (the six units) and the two measurement records under loop/items/AI4DEV-56/artifacts/measure/ (unit4-privileges-after-reset.txt, unit6-signin-rate-limit.txt, unit6-auth-container-env.txt).

## Instructions

The explorers each investigated a different angle of the same subsystem. Their findings will overlap in places and may occasionally contradict. Reconcile them. Merge overlapping descriptions, resolve contradictions by checking the code yourself, and weave the separate slices into a unified picture.

Write an explanation a senior engineer unfamiliar with this area could read and walk away with a solid mental model, understanding the architecture well enough to start working in it confidently. The reader's next job is to DESIGN the six units, so give special weight to: where a lifecycle gate can sit on the write path and what each placement covers; how a write route could be enumerated mechanically from the tree; what "history preserved" means row by row; where an unlink refusal can live given who owns auth.identities; which auth hooks the local tool pushes into the container; and exactly what a leaf touches to flip an id, including the new-id flow through doc-sync.

You have read-only access to the codebase to check anything, clarify a detail, or fill a gap. Use Read, Grep, and Glob as needed. The explorers did the heavy lifting, so you shouldn't need to re-explore from scratch. Do not modify any file except the one output file named below.

## Output

Write the explanation to loop/items/AI4DEV-56/artifacts/how/explanation.md and reply with five lines: the output path, the word count, the three findings you weight most for the design, and any explorer contradiction you resolved.

Use this structure, adapted to what makes sense for the question.

### Overview
1-2 paragraphs. What is this thing, what does it do, why does it exist.

### Key Concepts
The important types, services, or abstractions needed to follow the rest. Brief definitions, not exhaustive.

### How It Works
The core of the explanation, and the longest section. Walk through the flow: what triggers it, what happens step by step, where data goes, what the decision points are. Prose, not pseudocode. Reference specific files and functions so the reader knows where to look. A mermaid diagram only where it clarifies.

### Where Things Live
A brief file/directory map.

### Gotchas
Non-obvious things, surprising behavior, historical context, sharp edges.

## Communication Style

- Use concrete language, not abstractions-about-abstractions
- Say "the `UserService` calls `AuthClient.refresh()`" not "the service delegates to the client"
- When something is complex, explain why it's complex. Don't just describe the complexity
- When something is simple, don't pad it out
- If the explorers flagged open questions or gaps, acknowledge them honestly rather than papering over them
- Short declarative sentences. No long-dash character. No colon as a mid-sentence connector.
