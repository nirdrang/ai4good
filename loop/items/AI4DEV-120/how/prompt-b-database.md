You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the ai4good tree support building the project need intake (REQ-003): capture of title, description and urgency on a draft owned by an NGO admin; autosave as a data contract; an optional reference-file upload with a data-responsibility disclosure and a Tier-2 hardened disclosure; submission that moves the project from draft to discovery_in_progress; and a raw-intake audit snapshot that later edits never change? The run must create a new acceptance suite `tests/at/suites/req-003/` and `tests/at/expected/req-003.json` in the shape of the NGO profile suite under `tests/at/suites/req-002/`, register thirteen P0 ids through `atTest`, and declare red any id whose full proof waits on a surface owned elsewhere. The specification is `.taskmaster/docs/acceptance/at-req-003.md`, the manifest is `loop/decomp/req-003.md`, the brief is `loop/items/AI4DEV-120/brief.md`. Read the brief first.

## Your Exploration Angle

The database and the edge functions the need builds on. Read every migration under `supabase/migrations/` that touches `projects`, `organizations`, `org_memberships`, `acknowledgments`, the audit table, the tenant posture helpers (`viewer_` helpers, `TENANT_CATALOG`), `discovery_allowance`, and any storage bucket; read `supabase/functions/project-workspace/`, `supabase/functions/public-project/`, `supabase/functions/set-organization-profile/`, `supabase/functions/discovery-allowance/`, `supabase/functions/create-organization/`, and everything under `supabase/functions/_shared/` (especially `write-routes.ts`, the auth and email-verification gate, `org-vetting.ts`, `discovery-allowance.ts`, the audit helpers). Explain: the exact shape of the `projects` table today, its comment, its columns, its status or lifecycle enum if any, its posture rows, and what the two project routes read and write; how a write route authenticates the caller, resolves the organisation and the admin role, enforces email verification, and registers in `WRITE_ROUTES`; what the conformance check demands of a new route; how a new table joins the tenant posture (baseline revoke, RLS, catalog row, policy scan in `tests/at/suites/req-001/_policy-scan.ts`) and what the live catalog check pins; how the audit table is written (append-only, enum kinds, detail jsonb) and whether a new enum value needs its own migration; how the Discovery allowance is read and debited, and what "capacity" means in code; whether Supabase storage is configured in `supabase/config.toml` and whether any bucket, policy or upload path exists. Name every constraint a new need table, a new need write route, and a storage attachment would have to satisfy, with file and line.

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