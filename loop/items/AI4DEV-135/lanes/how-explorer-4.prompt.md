You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the Discovery subsystem produce, store, meter and stream a turn, and where would a second structured output (the scope) and a cause-label vocabulary attach: supabase/functions/_shared/discovery-*.ts, discovery-message and discovery-conversation routes, need-intake.ts, notifications.ts and the taxonomy, tests/at/suites/req-004, the at-config registry, and the Discovery chat page under src/.

## Your Exploration Angle

The acceptance harness and the front end. tests/at/suites/req-004: _contract.ts, _fixture.ts, _live.ts, _pending.ts, _source-absences.ts, _source-pins.ts, _bind.ts, z-later-runs.test.ts (list every placeholder id and its pending name), one of the real test files (d-conversation.test.ts) as a model of a loop-tier and integration-tier test. tests/at/expected/req-004.json (its shape, the red and green declarations). tests/at/harness/atconfig.ts (how a pin is registered with its source). loop/bringup/AI4DEV-3-at-harness.md: the suite-authoring rules, in summary. .taskmaster/docs/acceptance/at-req-004.md: quote verbatim the entries for AT-004.12, .13, .14, .15, .20, .21, .22, .24, .25, .37, .38, .39, .52, .58, .59, .60. .taskmaster/docs/architecture-notes.md section REQ-004: quote what it says about the turn ceiling, regeneration bound, guardrails, cause labels, and scope. The front end: find the Discovery chat page under src/ (route /discovery/:organizationId/:projectId), how useChat is wired to the two routes, which stream parts it renders and what it does with an unknown data part, and how react-markdown renders assistant text.

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

