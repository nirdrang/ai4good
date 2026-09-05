You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the ai4good repository decide what an authenticated or anonymous caller may see, today, across the database (row-level security, security-definer functions, grants), the edge functions and their caller resolution, the front-end routes, and the acceptance-test harness for REQ-001 at both tiers; so that the tenant-isolation deliverable can grant the right reads (own NGO, assigned volunteer, platform admin), deny cross-organisation and unassigned-volunteer reads with no existence oracle, and render public surfaces only to a logged-out visitor, with acceptance ids AT-001.21, .22, .23, .24 and .40 green at the loop tier and the integration tier?

## Your Exploration Angle

THE REQUEST PATH AND THE FRONT END. Read supabase/functions/_shared/edge.ts, caller.ts, accounts.ts, memberships.ts, and every function under supabase/functions/ (complete-signup, create-organization, update-organization). Trace one authenticated request end to end: how the JWT reaches the function, how resolveCaller and callerFromAuthAnswer decide who is calling, what the refusal shapes are (status codes, bodies, the names of the refusal kinds), and how the functions read or write the database (service role client, anon client, or the caller JWT). Then the front end: read src/router.tsx, src/routes/, src/server.ts, src/start.ts, src/lib/, src/hooks/ and src/components/ to say what routes exist today, which are public, how the client holds a session, whether any route guard or redirect-to-sign-in exists, and how the UI reaches the edge functions (the project rule is that UI never touches the database directly). State exactly what read surfaces exist today for an organisation dashboard, a project page, reference files, a comment thread, a ledger; say plainly which do not exist. Read .taskmaster/docs/architecture-notes.md and src/routes/README.md for the intended shape.

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
