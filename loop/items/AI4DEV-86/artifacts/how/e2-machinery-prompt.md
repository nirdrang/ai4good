# Explorer Prompt Template

Build each explorer subagent's prompt from this template. Fill in the placeholders.

---

You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How do the v1 ceremony and the acceptance-test harness work in this repository, and what depends on what, so that the slot machinery, the v1 relay agents and scripts, and the CI twin-guard step can be parked, the harness frozen, and CI aligned, while req-001 and req-016 stay green at the loop tier with --expect and req-001 stays green at the integration tier against the one local stack (ports 44321 block, AT_DB_SLOT=1)?

## Your Exploration Angle

The bespoke harness machinery and who uses it. Read tests/at/harness/oracles.ts, record-oracles.ts, sentinels.ts, faults.ts, vendors.ts, fixtures.ts, guards.ts, clock.ts, capabilities.ts, contracts.ts, suite-adapters.ts, index.ts. For each module: what it does, its exports, which suite files under tests/at/suites/req-001 and req-016 import it (grep the imports), and which selftests cover it. For oracles.ts in particular: the judge model, the request shape, record and replay, the AT_JUDGE_API_KEY plumbing, how CI runs without a key, and which req-016 tests depend on it. State which modules have NO suite consumer at all.

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
