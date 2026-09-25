You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the notifications subsystem in this tree work end to end at the head of main: how an event is emitted and stored, how recipients and channels are resolved, how a delivery reaches a provider and is marked sent, how the acceptance suite drives the same system at the loop tier and the integration tier, and what guarantees it makes about atomicity, retries and duplicates?

## Your Exploration Angle

THE RELIABILITY PATH. Read `tests/at/suites/req-016/_fault-switch.ts`, `_provider-faults.ts`, `_mail-witness.ts` and the reliability test bodies in `c-reliability-guard.test.ts`. Explain how a fault is armed and how the system proves a fault actually fired rather than being merely requested. Explain what evidence the atomicity claim rests on and how many independent witnesses support it. Explain how a send is marked sent only on provider acceptance, what happens on a rejection and on a lost acknowledgment, and what prevents a retry from duplicating a message. Say where each piece of evidence comes from and which party could fake it.

## Exploration Instructions

Start by finding the relevant code. Use Glob to find directories and files, Grep to find key symbols, Read to understand the actual implementation. Don't guess from names. Read the code. You are read-only. Do not modify anything and do not start any process.

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