You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the ai4good tree, at this branch's head, authorise and perform every WRITE today (the three write edge functions, caller resolution, the SECURITY DEFINER database functions and the triggers, the privilege posture and its two catalog checks); how does Supabase Auth on the local stack expose identities and the unlink endpoint, the admin API, the auth hooks, bans, and its rate limits; and how does the acceptance harness for REQ-001 drive the system at the loop tier and the integration tier, add a system-under-test member, provision operator-only Givens, and declare an id red by shape; so that the admin-operations deliverable can land (1) an audited, platform-admin-only contact transfer and lost-access recovery that moves an organisation's ownership to a new account, deactivates the old one and preserves every row's attribution, plus one escalation contact captured at concierge onboarding, (2) a lifecycle state on accounts that gates every write through ONE mandatory boundary every write route registers with, with a conformance check that fails any unregistered write route, plus AUP key revocation and platform-admin re-enable, (3) an append-only audit for role changes and contact transfer that cannot be altered or deleted, and a sign-in rate limit, (4) a proof that no leftover TRUNCATE, TRIGGER or REFERENCES privilege remains on the authentication tables, (5) a server-side refusal of GitHub identity unlink for volunteer accounts with a new acceptance id, and (6) a record of what the local auth rate limit really honours; with acceptance ids AT-001.25, .26, .27, .28, .29, .30, .31, .33, .34 and .35 green or declared red by shape at both tiers?

## Your Exploration Angle

THE ACCEPTANCE HARNESS AND HOW A LEAF LANDS AN ID. Read `tests/at/harness/registry.ts`, `pending.ts`, `expected.ts`, `check.ts`, `runner.ts`, `index.ts`, `suite-adapters.ts`, `contracts.ts`, `fixtures.ts`, `local-stack.ts`, `live-stack.ts`, `stack-lock.ts`, `atconfig.ts`, and `tests/at/README.md` and `tests/at/expected/README.md`. Then the REQ-001 suite: `tests/at/suites/req-001/_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `_integration.ts`, `_live-tenant-reads.ts`, `_pending.ts`, and the six test files `a-` through `f-`. Trace, step by step: how `atTest(id, name, body)` registers a test and how `at:check` proves the bijection with `.taskmaster/docs/acceptance/at-req-001.md`; how `--expect` compares a run to `tests/at/expected/req-001.json` and exactly what the two declared red shapes are (`pending / sut-missing` through `AtPending`, and `capability-pending` through `CapabilityPending` with named capabilities), and what prefix `expected.ts` anchors on; how a body gets `{ w, sut }` from `open()` at each tier, what `harness.sut.accounts` is at loop tier (`_fixture.ts`, storage only, every judgement imported from `supabase/functions/_shared/*`) and at integration tier (`_live.ts`, HTTP to Auth, the deployed functions, and the operator SQL connection); how an integration run resets the database and which `db:` commands it runs; how a NEW member is added to `AccountsSut` (contract, fixture, live, and the type derivation that forbids a seam nothing supplies); how the operator-only Givens are provisioned today (`provisionPlatformAdmin`, `createOrganizationAsOperator`, `grantMembershipAsOperator`, `createProjectAsOperator`, `assignVolunteerAsOperator`, `retypeAccountAsOperator`) and what authority each uses on the live stack; how `_live-tenant-reads.ts` reads the catalog (`tenantTableFacts`) and pins privilege sets; how the loop fixture's clock and the config registry `AT_CONFIG` pin numbers such as the access-token lifetime and how the runner refuses a run when the config file and the registry disagree. State what a leaf must change to flip an id from red to green: the `LEAF` map in `_pending.ts`, the `expected/req-001.json` rows at both tiers, the pending ledger under `loop/items/<item>/pending-ledger.txt`, and the body at its one call site. State how a body writes a real red for a capability that does not exist in this environment (the AT-001.24 and AT-001.10 precedents). Say exactly what `at:selftest` covers and how a new harness helper gets a selftest under `tests/at/harness/`.

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
