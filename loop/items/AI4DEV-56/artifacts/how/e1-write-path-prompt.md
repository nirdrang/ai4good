You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the ai4good tree, at this branch's head, authorise and perform every WRITE today (the three write edge functions, caller resolution, the SECURITY DEFINER database functions and the triggers, the privilege posture and its two catalog checks); how does Supabase Auth on the local stack expose identities and the unlink endpoint, the admin API, the auth hooks, bans, and its rate limits; and how does the acceptance harness for REQ-001 drive the system at the loop tier and the integration tier, add a system-under-test member, provision operator-only Givens, and declare an id red by shape; so that the admin-operations deliverable can land (1) an audited, platform-admin-only contact transfer and lost-access recovery that moves an organisation's ownership to a new account, deactivates the old one and preserves every row's attribution, plus one escalation contact captured at concierge onboarding, (2) a lifecycle state on accounts that gates every write through ONE mandatory boundary every write route registers with, with a conformance check that fails any unregistered write route, plus AUP key revocation and platform-admin re-enable, (3) an append-only audit for role changes and contact transfer that cannot be altered or deleted, and a sign-in rate limit, (4) a proof that no leftover TRUNCATE, TRIGGER or REFERENCES privilege remains on the authentication tables, (5) a server-side refusal of GitHub identity unlink for volunteer accounts with a new acceptance id, and (6) a record of what the local auth rate limit really honours; with acceptance ids AT-001.25, .26, .27, .28, .29, .30, .31, .33, .34 and .35 green or declared red by shape at both tiers?

## Your Exploration Angle

THE WRITE PATH, FROM THE EDGE TO THE ROW. Read `supabase/functions/_shared/edge.ts`, `caller.ts`, `accounts.ts`, `memberships.ts`, `github.ts`, and the three write functions `supabase/functions/complete-signup/index.ts`, `create-organization/index.ts`, `update-organization/index.ts`; then the three read functions `organization-dashboard`, `project-workspace`, `public-project` so you can say what separates a write route from a read route in this tree. Read every migration under `supabase/migrations/` in order and map every table (`accounts`, `organizations`, `org_memberships`, `acknowledgments`, `volunteer_profiles`, `projects`), every SECURITY DEFINER function, every trigger, every policy, and every grant and revoke. Trace one authenticated write end to end: the JWT reaching the function, `resolveCaller` and `callerFromAuthAnswer`, the shared decision module, `callDatabaseFunction` with the service role, the definer function's own backstop checks, the trigger, the row. State exactly where a "lifecycle state gates every write" check could sit on that path (the edge entry, the shared decision module, the definer function, a trigger, a policy) and what each placement covers and misses, in particular the operator path with no TypeScript on it and the service-role path that reaches `/rest/v1/rpc/<fn>` directly. State how a write route is "registered" today: the `[functions.<name>]` blocks in `supabase/config.toml`, the directory listing under `supabase/functions/`, `verify_jwt`. Say what identifies a write function versus a read function mechanically (does it call `callDatabaseFunction`, does it import `callerReads`) so a conformance check could enumerate write routes from the tree and fail an unregistered one. Read `tests/at/suites/req-001/_source-scan.ts` and `_policy-scan.ts` and `tests/at/harness/policy-scan.selftest.ts` as the two existing static-scan precedents and say exactly how they read the tree and how their selftests prove the negative direction. Note `public.accounts` has no lifecycle column, `complete_signup` inserts the account row, `has_platform_acknowledgment` is a hook nothing calls yet, and the org-membership migration defers the role-change audit. Say what "history preserved and still attributed to the original acting humans" would mean row by row for `acknowledgments`, `org_memberships`, `projects`, `volunteer_profiles` if an organisation's seat moved from one account to another.

## Exploration Instructions

Start by finding the relevant code. Use Glob to find directories and files, Grep to find key symbols, Read to understand the actual implementation. Don't guess from names. Read the code. You are read-only; do not modify anything and do not start any process.

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
