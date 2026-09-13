You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the ai4good tree support building the project need intake (REQ-003): capture of title, description and urgency on a draft owned by an NGO admin; autosave as a data contract; an optional reference-file upload with a data-responsibility disclosure and a Tier-2 hardened disclosure; submission that moves the project from draft to discovery_in_progress; and a raw-intake audit snapshot that later edits never change? The run must create a new acceptance suite `tests/at/suites/req-003/` and `tests/at/expected/req-003.json` in the shape of the NGO profile suite under `tests/at/suites/req-002/`, register thirteen P0 ids through `atTest`, and declare red any id whose full proof waits on a surface owned elsewhere. The specification is `.taskmaster/docs/acceptance/at-req-003.md`, the manifest is `loop/decomp/req-003.md`, the brief is `loop/items/AI4DEV-120/brief.md`. Read the brief first.

## Your Exploration Angle

The cross-cutting facts: the notifications emitter, the front end, storage, and the vocabulary. Read `supabase/functions/_shared/` for the notifications emitter, its sole-writer scan in the req-016 suite (`tests/at/suites/req-016/`), and what a new route must not do around it. Read `supabase/config.toml` for storage and the local ports. Read the front-end app (find it: `app/`, `src/`, or the TanStack Start routes) and say whether any project or intake screen exists, how a screen calls an edge function today (the rule is that UI never touches the database directly), and whether any autosave pattern exists. Grep the whole tree, including `loop/out/pure-*.md`, `.taskmaster/docs/`, `loop/decomp/`, and the migrations, for: `discovery_in_progress`, `draft`, `Tier-2`, `tier_2`, `classification`, `cause`, `label`, `urgency`, `snapshot`, `raw intake`, `disclosure`, `fixtures-only`, `data-responsibility`, `REQ-032`, `REQ-004`, `REQ-005.5`. Report what each term already means in the tree, in particular: whether a project lifecycle state enum exists and what values it has; whether any Tier-2 or classification column, enum, or event exists; whether any cause-label table or column exists; where the disclosure copy of the file-policy contract lives, if anywhere; and what the PRD sections for REQ-004, REQ-005.5 and REQ-032 in `loop/out/pure-*.md` say about the transition engine, the classification event, and the file policy, quoting the lines. Also read `loop/items/AI4DEV-102/resume.md` sections "Standing constraints" and "Gotchas" and `loop/items/AI4DEV-102/design/SYNTHESIS.md` and report every constraint that carries over to a project need.

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


Return your findings as your reply. Do not write any file. Your reply is captured by the runner.