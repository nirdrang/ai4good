You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the Discovery subsystem produce, store, meter and stream a turn, and where would a second structured output (the scope) and a cause-label vocabulary attach: supabase/functions/_shared/discovery-*.ts, discovery-message and discovery-conversation routes, need-intake.ts, notifications.ts and the taxonomy, tests/at/suites/req-004, the at-config registry, and the Discovery chat page under src/.

## Your Exploration Angle

The model side. discovery-prompt.ts (the system prompt template, the need block, the record_elicitation tool, its strict JSON schema, and its parser), anthropic-messages.ts (the one Anthropic port, model, prompt caching, tool use handling, how tool calls are surfaced), discovery-skills.ts and the discovery-skills folder. Then the loop-tier Anthropic stand-in: tests/at/suites/req-004/_fixture.ts and tests/at/suites/req-004/fixtures/*.ts (grant-tracker). Say exactly how the stand-in decides what to answer, how a test injects a scripted tool call, how the real model is selected at integration tier, and how a second tool (record_scope) or a labels-vocabulary block in the prompt would be added on both the real port and the stand-in. Quote the record_elicitation schema verbatim.

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
Anything surprising, historically motivated, or easy to get wrong. Things that look like they should work one way but work another.

### Open Questions
Anything you couldn't fully trace or understand. Be honest about gaps.


Repository root is the current working directory. Read files with the tools you have; do not run the test suite or the database. Write nothing to disk.

