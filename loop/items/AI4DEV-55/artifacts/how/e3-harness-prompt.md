You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the ai4good repository decide what an authenticated or anonymous caller may see, today, across the database (row-level security, security-definer functions, grants), the edge functions and their caller resolution, the front-end routes, and the acceptance-test harness for REQ-001 at both tiers; so that the tenant-isolation deliverable can grant the right reads (own NGO, assigned volunteer, platform admin), deny cross-organisation and unassigned-volunteer reads with no existence oracle, and render public surfaces only to a logged-out visitor, with acceptance ids AT-001.21, .22, .23, .24 and .40 green at the loop tier and the integration tier?

## Your Exploration Angle

THE ACCEPTANCE HARNESS FOR REQ-001 AT BOTH TIERS. Read tests/at/README.md, tests/at/harness/ (registry.ts, contracts.ts, runner.ts, expected.ts, pending.ts, live-stack.ts, local-stack.ts, fixtures.ts, suite-adapters.ts, check.ts) and tests/at/suites/req-001/ (all underscore files and c-membership-and-acknowledgment.test.ts as the nearest precedent, plus d-tenant-isolation.test.ts as it stands). Explain how an id is registered through atTest, how the loop tier drives the _fixture.ts storage adapter and the integration tier drives _live.ts against the running Supabase stack, how _integration.ts bodies are wired per tier, how tests/at/expected/req-001.json declares each id green or pending by shape, and what a leaf must change there when its ids turn green. Trace how AT-001.16, .36 and .37 (per-organisation roles and membership isolation) are proved at both tiers: what fixture world they open, what they assert, and how the integration body reaches the database (through an edge function, through a PostgREST call with the caller JWT, or through the service role). State exactly how a new test could exercise a database read as a specific signed-in user at the integration tier (a PostgREST query with that user JWT, or an edge function), and what the loop tier can and cannot prove about row-level security given that _fixture.ts is a Map. Read the commands in package.json (at:verify, at:check, db:start) and say what the --expect run checks.

## Exploration Instructions

Start by finding the relevant code. Use Glob to find directories and files, Grep to find key symbols, Read to understand the actual implementation. Don't guess from names. Read the code.

Follow this pattern:
1. **Find the entry point.** What triggers this behavior? A user action, an API call, a scheduled job? Find where it starts.
2. **Trace the flow.** Follow the call chain from the entry point. Read each function. Understand what data flows through and how it transforms.
3. **Map the key abstractions.** What types, interfaces, services, or classes are central? Read their definitions. Understand what they represent and why they exist.
4. **Find the boundaries.** Where does this subsystem interface with others? What goes in, what comes out?
5. **Look for the non-obvious.** Anything surprising? Anything that looks like a historical artifact? Anything a newcomer would misunderstand?

Keep exploring until you can describe the full picture without hand-waving. If you hit a part you can't trace, say so explicitly. "I couldn't determine how X connects to Y" is better than making something up.

## Output

Return your findings in this structure. Be factual and specific. Reference exact file paths, function names, type names, and line numbers where relevant.

### Components Found
The key types, services, classes, and abstractions. For each: name, file path, and a one-sentence description of what it does.

### Flow
The execution flow step by step. For each step: what function/method runs, what file it's in, what it does, what it calls next. Include the data that flows between steps.

### Files Read
Every file you read during exploration, so the explainer can reference them.

### Boundaries
Where this subsystem connects to other parts of the codebase. The inputs and outputs.

### Non-Obvious Things
Anything surprising, historically motivated, or easy to get wrong. Things that look like they should work one way but actually work another.

### Open Questions
Anything you couldn't fully trace or understand. Be honest about gaps.
