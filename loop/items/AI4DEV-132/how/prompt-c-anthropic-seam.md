You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the ai4good tree support building deliverable D1 of the AI Discovery agent (REQ-004) plus three extra leaves from the same requirement, in one run of six units: (1) per-turn allowance metering at a constant cost-to-credit ratio against the existing daily ledger, with the turn's cost recorded; (2) funded projects bill their own fuel and never the free pool, with project isolation and a mid-conversation switch, while no fuel ledger exists yet; (3) zero-credit remedies split by tier; (4) the Discovery conversation itself on Claude Opus from a Supabase edge function on Deno, persisted and resumable, with an Anthropic stand-in for the acceptance harness; (5) abuse guardrails: unverified blocked, a per-NGO admin kill switch, and static absence proofs that no supplemental grant path and no platform breaker exist; (6) transparency: remaining credits and per-turn cost readable, zero-cost actions leave no balance delta. The run must create `tests/at/suites/req-004/` and `tests/at/expected/req-004.json` in the shape of the intake suite under `tests/at/suites/req-003/`, register all fifty-eight P0 ids of `.taskmaster/docs/acceptance/at-req-004.md` through `atTest` (twenty proven in this run, thirty-eight pending with a stated shape), and pass `at:check`. The manifest is `loop/decomp/req-004.md`, the brief is `loop/items/AI4DEV-132/brief.md`. Read the brief first.

## Your Exploration Angle
The Anthropic seam, the vendor stand-ins, the harness clock and fixtures, the Deno runtime, and the environment. Nothing in the tree calls Anthropic today; establish that (grep the whole tree outside `node_modules` and `plugins/` for anthropic, claude, opus, `@anthropic-ai`, `messages.create`, `x-api-key`) and report every hit with its path, including docs. Read `.taskmaster/docs/` for the architecture notes on REQ-004 (grep for `req-004`, Discovery, Opus, `turn ceiling`, regeneration, `system-prompt`) and report what they pin: model, prompt tuning, the deterministic per-conversation turn ceiling, three regenerations, anything on persistence or on how the edge function talks to the model. Read `tests/at/harness/contracts.ts` in full and `tests/at/harness/vendors.ts` in full: how the email provider stand-in is built, what its contract says, how a suite consumes it at loop tier and what happens at integration, and the sentence that says each vendor stand-in is built with the first suite that consumes it. Read the controlled clock, the fixtures, the sentinels and the faults in `tests/at/harness/` and say how a suite advances a UTC day at loop and at integration (the req-002 allowance ids do it; find how). Find the semantic-oracle harness the brief says is built (grep `tests/at/harness/` and `loop/bringup/` for oracle, semantic, judge) and report its API, what it asserts and how a fixture-specific oracle is written, or report that it does not exist. Read `loop/bringup/AI4DEV-3-at-harness.md` for the suite-authoring rules and list every rule that binds a new suite, in particular the rules on vendor stand-ins, on `capability-pending`, and on the `surface: 'ui'` tag. Read `supabase/config.toml`, `supabase/functions/deno.json` or `import_map.json` if present, and one edge function's imports, and explain how an edge function imports an npm package on this stack (npm: specifier, esm.sh, or a vendored file), what Deno permissions the local edge runtime grants, how a function reads a secret (`Deno.env.get`), and what `.env.example` names for secrets and what the tree says about keys in committed files (grep for `ANTHROPIC`, `.env`, `secret` in `.env.example`, `README`, `CLAUDE.md`, `.gitignore`). Read `.claude/skills/verify-ai4good/SKILL.md` and its scripts and say what it drives and how a new edge route gets added to it. Read `package.json` scripts for `db:start`, `at:verify`, `at:check`, `at:selftest`, `typecheck`, and the CI workflows under `.github/workflows/`, and say whether CI could ever hold an Anthropic key (it must not) and what an integration-tier test that needs a real model does in CI today, if any precedent exists. Name every constraint on how unit 4 (the conversation) may call the model, store the conversation, and be proven at loop against a stand-in and at integration against the real model.

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

Return your findings as your reply. Do not write any file. Your reply is captured by the runner. If you shell out, use PowerShell syntax; you are on Windows.
