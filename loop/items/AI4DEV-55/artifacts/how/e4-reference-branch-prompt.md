You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the ai4good repository decide what an authenticated or anonymous caller may see, today, across the database (row-level security, security-definer functions, grants), the edge functions and their caller resolution, the front-end routes, and the acceptance-test harness for REQ-001 at both tiers; so that the tenant-isolation deliverable can grant the right reads (own NGO, assigned volunteer, platform admin), deny cross-organisation and unassigned-volunteer reads with no existence oracle, and render public surfaces only to a logged-out visitor, with acceptance ids AT-001.21, .22, .23, .24 and .40 green at the loop tier and the integration tier?

## Your Exploration Angle

THE REFERENCE BRANCH, READ ONLY. A prior attempt at this same deliverable lives in the detached worktree at .claude/worktrees/ref-66 (a checkout of a branch that reached CI green on 2026-08-13 and then fell far behind main). Read there, not in the main checkout, for this angle: loop/items/AI4DEV-66/plan.md, pr-body.md, rulings-gate1.md, rulings-gate2.md, rulings-gate2-slice2.md, rulings-audit.md, rulings-merge.md, and the code it added: supabase/functions/_shared/visibility.ts, its migration under supabase/migrations/ (the one that is not in the main checkout), any new edge functions or src routes it added (organisation dashboard, project workspace, public project page), and tests/at/suites/req-001/d-tenant-isolation.test.ts with the visibility parts of _fixture.ts, _live.ts, _integration.ts and _contract.ts. Report the decisions it made: how it defined the tenant-read rule, how it made the no-existence-oracle answer structural (one constant for not-found and not-yours), how it proved denial against surfaces owned by later requirements that do not exist, how it tested at each tier, what the reviewers and audits objected to and what was ruled. Then compare against the main checkout at /home/user/ai4good: which of the harness files it touched have since changed shape on main (tests/at/harness/runner.ts, _contract.ts, _fixture.ts, _live.ts, _integration.ts, _pending.ts), so the lead knows what from that branch could be carried as an idea and what cannot be carried as code. Merge nothing; write nothing outside your output file.

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
