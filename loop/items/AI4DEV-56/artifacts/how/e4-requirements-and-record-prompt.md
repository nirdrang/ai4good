You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does the ai4good tree, at this branch's head, authorise and perform every WRITE today (the three write edge functions, caller resolution, the SECURITY DEFINER database functions and the triggers, the privilege posture and its two catalog checks); how does Supabase Auth on the local stack expose identities and the unlink endpoint, the admin API, the auth hooks, bans, and its rate limits; and how does the acceptance harness for REQ-001 drive the system at the loop tier and the integration tier, add a system-under-test member, provision operator-only Givens, and declare an id red by shape; so that the admin-operations deliverable can land (1) an audited, platform-admin-only contact transfer and lost-access recovery that moves an organisation's ownership to a new account, deactivates the old one and preserves every row's attribution, plus one escalation contact captured at concierge onboarding, (2) a lifecycle state on accounts that gates every write through ONE mandatory boundary every write route registers with, with a conformance check that fails any unregistered write route, plus AUP key revocation and platform-admin re-enable, (3) an append-only audit for role changes and contact transfer that cannot be altered or deleted, and a sign-in rate limit, (4) a proof that no leftover TRUNCATE, TRIGGER or REFERENCES privilege remains on the authentication tables, (5) a server-side refusal of GitHub identity unlink for volunteer accounts with a new acceptance id, and (6) a record of what the local auth rate limit really honours; with acceptance ids AT-001.25, .26, .27, .28, .29, .30, .31, .33, .34 and .35 green or declared red by shape at both tiers?

## Your Exploration Angle

THE REQUIREMENT TEXTS, THE CROSS-REQUIREMENT CONTRACTS, AND THE RECORD CONVENTIONS A LEAF MUST FOLLOW. Read the brief `loop/items/AI4DEV-56/brief.md` in full first; it names the six units and the facts the board does not say. Then read `.taskmaster/docs/acceptance/at-req-001.md` sections F, G and H word by word, and the coverage map; the requirement isolate `.taskmaster/docs/requirements/req-001.md`; the pure section `loop/out/pure-s3-req-001-006.md` lines 1 to 12; and the crossed texts: `req-002.md` and `at-req-002.md` for concierge onboarding, the vetting audit (AT-002.11, AT-002.28) and what "escalation contact" and "contact's name, title, authority attestation" mean there; `req-007.md` and `at-req-007.md` (AT-007.22, AT-007.23) for AUP deactivation, key revocation, and manual re-enable plus key re-issue; `req-009.md` and `at-req-009.md` (AT-009.01, AT-009.22) for what a virtual key is and who mints it; `req-030.md` and `at-req-030.md` (AT-030.11) for "the documented recovery"; and `prd-mvp.md` for the NFR Security audit list (which events are audit-mandated and what "append-only, cannot be altered or deleted" is asked of them). Read the decomposition manifest `loop/decomp/req-001.md` (deliverable D6, its three leaves, the cross-contracts line, the coverage check) and `loop/decomp/check-tree.ps1` for what the manifest check enforces. Read the record conventions every earlier leaf followed: `loop/items/AI4DEV-65/pending-ledger.txt`, `loop/items/AI4DEV-62/pending-ledger.txt`, the pull request body shape in `loop/items/AI4DEV-55/artifacts/pr/body-draft.md`, the mechanical plan `loop/items/AI4DEV-55/artifacts/pr/mechanical-plan.md`, and the verify skill `.claude/skills/verify-ai4good/SKILL.md`, its `features/*.md` and `scripts/drive-ngo-signup.ts`. Read `.claude/skills/doc-sync/SKILL.md` and the tools it names (`loop/assemble-pure.ps1`, `loop/extract-isolates.ps1`, `loop/decomp/check-tree.ps1`, `loop/state/decisions.jsonl`) and state exactly which files a NEW acceptance id for REQ-001 must touch, in what order, what the next free id number is (read every `AT-001.NN` in the acceptance file), how `at:check` and the expected manifest will react, and whether the manifest's coverage-check line and the `LEAF` map in `tests/at/suites/req-001/_pending.ts` must change. Read `.github/workflows/ci.yml` for the reference guard (any item id in a pull request body that the branch does not own fails the build) and the ownership guard (a pull request may not change both `src/` and the Claude territories). Read `CLAUDE.md` at the repository root for the writing rules (simplified technical English, ids always with a short title in parentheses, never another item's id in a pull request). Report the founder rulings you find recorded in the tree about unlink ("For 73 no unlink"), about deleting branches, and about declared red shapes, with file and line.

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
