You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the ai4good tree support building deliverable D1 of the AI Discovery agent (REQ-004) plus three extra leaves from the same requirement, in one run of six units: (1) per-turn allowance metering at a constant cost-to-credit ratio against the existing daily ledger, with the turn's cost recorded; (2) funded projects bill their own fuel and never the free pool, with project isolation and a mid-conversation switch, while no fuel ledger exists yet; (3) zero-credit remedies split by tier; (4) the Discovery conversation itself on Claude Opus from a Supabase edge function on Deno, persisted and resumable, with an Anthropic stand-in for the acceptance harness; (5) abuse guardrails: unverified blocked, a per-NGO admin kill switch, and static absence proofs that no supplemental grant path and no platform breaker exist; (6) transparency: remaining credits and per-turn cost readable, zero-cost actions leave no balance delta. The run must create `tests/at/suites/req-004/` and `tests/at/expected/req-004.json` in the shape of the intake suite under `tests/at/suites/req-003/`, register all fifty-eight P0 ids of `.taskmaster/docs/acceptance/at-req-004.md` through `atTest` (twenty proven in this run, thirty-eight pending with a stated shape), and pass `at:check`. The manifest is `loop/decomp/req-004.md`, the brief is `loop/items/AI4DEV-132/brief.md`. Read the brief first.

## Your Exploration Angle
The allowance ledger and the acceptance suite shape. Read `supabase/functions/_shared/discovery-allowance.ts`, the `supabase/functions/discovery-allowance/index.ts` route, the migration `supabase/migrations/20260916120000_discovery_allowance.sql`, and the at-config pins `discoveryDailyCreditsUnverified` and `discoveryDailyCreditsVetted` (grep `tests/at/harness/` for them). Explain exactly: the ledger's table, columns, keys and the per-UTC-day row rule; the `read` and `debit` actions, their request and response bodies, their refusal kinds, and how the SQL definer refuses a debit past zero; the high-water grant rule for a same-day vet raise and where the daily reset happens (a row per day, a cron, or a lazy read); the block at zero and the exact remedy names it returns and where that copy lives; and which req-002 acceptance ids read this ledger (grep `tests/at/suites/req-002/` for allowance) and what they assert, so that a change to the ledger does not break them. Then the suite shape, from `tests/at/suites/req-003/` in full: `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, `_bind.ts` if present, every `_source-*.ts`, and two per-id test files, one green and one declared red at integration. Read `tests/at/expected/req-003.json` and `req-002.json` and list every capability name used so far across all four expected files. Read `tests/at/harness/` (registry.ts, atconfig.ts, contracts.ts, the tiers, the selftests), the `at:check` script and the `at:verify` runner that `package.json` points to. Explain: how a suite registers its ids through `atTest` and what `at:check` demands (one call site per P0 id, the bijection); how an id that waits on another surface is registered pending with a stated shape (the intake run did this for ids that waited on other surfaces: find the exact mechanism, `capability-pending` or otherwise, and its per-tier form); how `--expect` reads the expected file and what makes a run green; how a static arm (`_source-absences.ts`, `_source-pins.ts` in req-002) pins a fact or an absence against the shipped tree and how it is asserted; how the live adapter provisions accounts, orgs, memberships, admin roles, email verification and the vetted tier, and how it reads and debits the allowance today; and what `.github/workflows/` runs at CI. Name every harness constraint the new req-004 suite must respect and any harness gap that would stop one of the twenty ids of this run (AT-004.01, .02, .03a, .03b, .04, .05, .06, .08, .09, .10, .11, .41, .42, .43, .44, .45, .46, .47, .48, .49) from being proven at integration.

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
