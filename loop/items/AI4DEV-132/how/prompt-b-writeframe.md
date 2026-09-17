You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the ai4good tree support building deliverable D1 of the AI Discovery agent (REQ-004) plus three extra leaves from the same requirement, in one run of six units: (1) per-turn allowance metering at a constant cost-to-credit ratio against the existing daily ledger, with the turn's cost recorded; (2) funded projects bill their own fuel and never the free pool, with project isolation and a mid-conversation switch, while no fuel ledger exists yet; (3) zero-credit remedies split by tier; (4) the Discovery conversation itself on Claude Opus from a Supabase edge function on Deno, persisted and resumable, with an Anthropic stand-in for the acceptance harness; (5) abuse guardrails: unverified blocked, a per-NGO admin kill switch, and static absence proofs that no supplemental grant path and no platform breaker exist; (6) transparency: remaining credits and per-turn cost readable, zero-cost actions leave no balance delta. The run must create `tests/at/suites/req-004/` and `tests/at/expected/req-004.json` in the shape of the intake suite under `tests/at/suites/req-003/`, register all fifty-eight P0 ids of `.taskmaster/docs/acceptance/at-req-004.md` through `atTest` (twenty proven in this run, thirty-eight pending with a stated shape), and pass `at:check`. The manifest is `loop/decomp/req-004.md`, the brief is `loop/items/AI4DEV-132/brief.md`. Read the brief first.

## Your Exploration Angle
The write frame, the intake, the projects table, funding state, admin routes, notifications and audit. Read `supabase/functions/_shared/write-routes.ts`, `edge.ts`, `memberships.ts`, and every other module under `supabase/functions/_shared/`; list each with one sentence. Read `supabase/functions/_shared/need-intake.ts` and the `project-need` and `need-intake` routes: the `need_intakes` table, its stages `draft` and `discovery_in_progress`, how submit moves the stage, the raw-intake snapshot, and the reference-file metadata, because the Discovery conversation of this run starts from `discovery_in_progress` and must attach to a need. Read the `projects` table definition across `supabase/migrations/` and say whether any funding, fuel, balance, Stripe or checkout column or table exists anywhere in the tree (grep migrations and `_shared` for fuel, fund, stripe, checkout, ledger, balance); the brief says no fuel ledger exists, confirm or refute with paths. Read the admin write routes that exist (the vetting action route from the vetting run, the org lifecycle or deactivation routes from the admin-operations run, anything under `supabase/functions/` whose name says admin, vet, lifecycle, deactivate) and explain the frame a new admin write route must follow: how the platform-admin role is checked, how a route registers in the write-route inventory and what the conformance check fails on, the audit append and its enum of event kinds and how a new kind is added (its own migration file, the intake run found), the refusal kinds constant `WRITE_REFUSAL_KINDS` and the SQL DETAIL convention, and the tenant read posture (one rule in SQL, the catalog scan in `tests/at/suites/req-001/_policy-scan.ts`, what a new table must declare: baseline revoke, RLS, catalog row, policy shape, no subquery in USING, the `viewer_*` helpers). Read the notifications modules: the emitter as sole writer, the static taxonomy table and its rows, the outbox and delivery defaults, and how a route emits one; say whether a taxonomy row exists that fits an admin kill switch or a founder-visibility flag, and how the sole-writer scan would react to a new caller. Read the email-verification gate (how an unverified account is refused on a write route, the exact refusal kind) and any per-org disabled or deactivated flag that exists today, because the kill switch of this run may reuse it or need a new column. Read the append-only audit table and the org-level `acknowledgments` table. Name every constraint a new table, route, definer or notification in this run must respect.

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
