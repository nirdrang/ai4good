# Brief for AI4DEV-55 (tenant isolation and visibility)

Chain: AI4PM-19 (auth and org membership, REQ-001) > AI4DEV-50 (auth dev root) > AI4DEV-55
(tenant isolation and visibility, D5)
Branch: nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5
PRD slice: `loop/out/pure-s3-req-001-006.md`, section REQ-001, verbatim:

> #### REQ-001: User Authentication & Org Membership
>
> Two-layer authorization: a global account type (NGO / volunteer / platform admin) plus a per-NGO role (admin / member, NGO accounts only); "NGO admin" means the admin role in that NGO. NGO users may belong to multiple NGOs; volunteers are individual accounts.
>
> - Sign-in by email/password, GitHub, or Google. A GitHub link is mandatory at volunteer signup; linking runs volunteer GitHub onboarding (REQ-007).
> - **Single-seat NGO in v1:** one NGO is one account performing every NGO-side action — funding, acknowledgments, scope edits, volunteer offboarding — without precluding later multi-member support (→ RM-12). Guards: every acknowledgment captures the acting person's name, title, and authority attestation (to bind the NGO, fund non-refundable fuel, accept no-SLA); an org email is preferred and shared credentials are prohibited (acknowledgments are per named human); an audited platform-admin contact-transfer/recovery path moves ownership to a new account, deactivates the old one, and preserves history; one non-login escalation contact is captured at concierge onboarding.
> - **Single-dev projects in v1:** one volunteer per project; no collaborator seats or co-volunteers (→ RM-13). (OD-1's "peer volunteer" is a bench reviewer, not a second project member.)
> - NGO data is visible only to its own account and the assigned volunteer, plus the platform admin (whose role spans all accounts for operations and support).
> - Password reset, email verification, and session management.
> - Lifecycle state (active/deactivated) gates every write (REQ-007 AUP) (→ RM-14).
>
> Dependencies: none.

The line this deliverable builds is the visibility line: "NGO data is visible only to its own
account and the assigned volunteer, plus the platform admin". The manifest is
`loop/decomp/req-001.md`, deliverable D5, revision `0579425`.

Item text: (verbatim from the board)

> Deliverable D5 of the authentication requirement: what each kind of account can see, and
> what it is denied. A container — it folds when its leaves close.
>
> Covers acceptance ids AT-001.21, .22, .23, .24 and .40.

Acceptance tests: `tests/at/suites/req-001/d-tenant-isolation.test.ts` must register and turn
green AT-001.21, AT-001.22, AT-001.23, AT-001.24, AT-001.40. The specification is
`.taskmaster/docs/acceptance/at-req-001.md`, section E. The expect manifest is under
`tests/at/expected/`.

## Units

### Unit 1: AI4DEV-66 (cross-org denial, no existence oracle)
Item text: (verbatim from the board)

> One organisation cannot reach another's data — through the interface or by probing
> identifiers directly against the API — and the denial must not reveal whether the thing
> exists. An unassigned volunteer is denied the same way.
>
> **Verify:** AT-001.21, AT-001.22
> **Blocked by:** D3.L1
> **Manifest:** `loop/decomp/req-001.md`, deliverable D5 leaf L1, revision `0579425`

The blocker D3.L1 (per-organisation roles and membership isolation) is Done.
Acceptance tests: AT-001.21, AT-001.22 in `tests/at/suites/req-001/d-tenant-isolation.test.ts`.

Reference material, read only: pull request 57 on GitHub built this unit under the old
relay and reached CI green on 2026-08-13, then fell about a hundred commits behind main.
Its branch is `nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`.
Read it for the decisions it made. Merge nothing from it. It stays open until the founder
rules on it.

### Unit 2: AI4DEV-67 (what an assigned volunteer, an admin, and a stranger can see)
Item text: (verbatim from the board)

> Scoped access for a volunteer assigned to a project, platform-admin reach across all
> accounts, and a logged-out visitor seeing public surfaces only.
>
> **Verify:** AT-001.23, AT-001.24, AT-001.40
> **Blocked by:** D5.L1
> **Manifest:** `loop/decomp/req-001.md`, deliverable D5 leaf L2, revision `0579425`

The blocker D5.L1 is unit 1 of this brief. Unit 2 starts when unit 1 is green.
Acceptance tests: AT-001.23, AT-001.24, AT-001.40 in
`tests/at/suites/req-001/d-tenant-isolation.test.ts`.

Both units reach surfaces owned by later requirements: the project page, the reference
files, the comment thread, the ledger, the dashboard. Those requirements are not
materialised. Decide once, in the design, how the denial and the scoped access are proven
against surfaces that do not exist yet, and say so in the pull request's Tradeoffs.

## The ask
Run this item in poteto-mode, end to end, and open one pull request from this branch.
If the brief has Units, design once for the whole subtree, then build and verify the units
in order, one commit group per unit, each unit green before the next starts. The pull
request body names each unit by its short label in words, never by its id.
Ground it with /how in critique mode first: explorers, explainer, then the critics, on
every item.
In the design arena, give every runner a distinct structural direction, so the candidates
do not converge on one design. The runner lanes are the sheet's four; add none.
Tool-heavy work without judgment goes to the mechanical agent with exact instructions: the
rebase into ordered commits, the per-commit builds and tests, driving the verify skill and
capturing its evidence, and the closing commands. You decide and you judge the evidence; it
types; you check each result once.
Every delegated lane writes its full report to a file under the item folder and replies
with five lines and the path. Read the file only when the summary names a deviation, a
blocker, or a red.
A unit goes to the hardest-tasks lane only when the writer must still design something. A
unit that applies a fixed contract goes to the feature lane. Say which in the decision trail.
The comment audit before review runs on the mechanical model with the comment-sicko prompt,
never on your own model.
Do not name any other item's id in the pull request title or body.
The pull request body carries Why, Scope, Tradeoffs, Blast Radius, and Verification.
Then close the item as the Closing section says. You close it, nobody else.

## Closing (the git part is yours, the board is not)
1. Wait for CI to be green on the exact head of the pull request, and for the founder to
   say "merge". Both, never one.
2. Hand the git mechanics to the `mechanical` agent with exact commands. You decide, it
   types: `gh pr merge <n> --squash`, and after you leave the worktree, the worktree removal
   and the remote branch deletion. The merge closes the item on the board through the pull
   request link. Never touch the board yourself.
3. Leave the worktree with `ExitWorktree(action: "keep")`.
4. Invoke `/controller done <item>`. That skill does the board steering. Do not do it
   yourself.

## Mechanics never spend your calls
Fable calls are scarce. Tool-heavy work without judgment, the station 7 rebase, the merge
and cleanup commands, goes to the `mechanical` agent (sonnet, inherits the worktree,
executes exact instructions, rules on nothing). Write the exact plan, let it run, check the
result with one read. Do not use a fork for this: a fork runs on your own model.
A writer that dies after finishing its work is recovered by running the pin and committing
the finished tree, not by rerunning the writer.

## The evidence bar
- The verify suite for the acceptance tests above passes on the final head. Name each check
  and its timestamp in the Verification section.
- CI is green on the final head.
- Discovered work goes in a "Not done here" list in the pull request body, never in the diff.

## Environment facts
- One database, the stack `supabase/config.toml` describes, local and cloud alike. Start it
  with `bun run db:start`; every integration run resets it.
- codex needs `codex login --device-auth` once per fresh VM. The session banner says when.
