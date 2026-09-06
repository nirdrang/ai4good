# Brief for AI4DEV-56 (admin operations, lifecycle gates and audit)

Chain: AI4PM-19 (auth and org membership, REQ-001) > AI4DEV-50 (auth dev root) > AI4DEV-56
(admin operations, lifecycle gates and audit, D6)
Branch: nirdrang/ai4dev-56-admin-operations-lifecycle-gates-and-audit-d6
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

The lines this deliverable builds are the contact-transfer and recovery guard, the escalation
contact, and "Lifecycle state (active/deactivated) gates every write". The manifest is
`loop/decomp/req-001.md`, deliverable D6, revision `0579425`.

Item text: (verbatim from the board)

> Deliverable D6 of the authentication requirement: recovering accounts, deactivating them,
> and leaving a trail. A container — it folds when its leaves close.
>
> Covers acceptance ids AT-001.25 through .31, plus .33, .34 and .35.

Acceptance tests: `tests/at/suites/req-001/e-admin-operations.test.ts` and
`tests/at/suites/req-001/f-lifecycle-and-audit.test.ts` must register and turn green
AT-001.25, .26, .27, .28, .29, .30, .31, .33, .34 and .35. The specification is
`.taskmaster/docs/acceptance/at-req-001.md`, sections F, G and H. The expect manifest is
under `tests/at/expected/`.

The tenant read posture landed on main in the merge of the tenant isolation deliverable
(commit `6dcf18a`): one rule in SQL, reads as the caller, a static catalog scan over the
migrations in CI, a live catalog check at integration. Every table or policy this run adds
joins that posture or fails the scan. Its "Not done here" list names the two write functions
still reading as the service role. Moving them is not in this run.

## Units

Units 1 to 3 are the deliverable's own leaves. Units 4 to 6 are extra units from the same
requirement root (founder 2026-09-06), small and independent. Build them in this order. The
pull request names each by its short label in words, never by its id.

### Unit 1: AI4DEV-68 (contact transfer and lost-access recovery, audited)
Item text: (verbatim from the board)

> Transferring an organisation's contact and recovering an account whose owner has lost
> access — audited, with history preserved, and executable only by a platform admin. Also
> captures the escalation contact during concierge onboarding.
>
> **Verify:** AT-001.25, AT-001.26, AT-001.27, AT-001.28, AT-001.35
> **Blocked by:** D1.L1
> **Manifest:** `loop/decomp/req-001.md`, deliverable D6 leaf L1, revision `0579425`

The blocker D1.L1 (email and Google signup, three account types) is Done.
Acceptance tests: AT-001.25, .26, .27, .28, .35 in `e-admin-operations.test.ts`.

### Unit 2: AI4DEV-69 (deactivation blocks every write route, provably)
Item text: (verbatim from the board)

> Deactivating an account must gate **every** write. All write routes register through one
> mandatory lifecycle-gate boundary, and a conformance check fails any route that is not
> registered — so the all-endpoints assertion stays true as later waves add routes, rather
> than silently decaying. Also revokes gateway keys on acceptable-use deactivation, and
> supports re-enabling.
>
> The conformance check is the point of this leaf: without it the test passes today and
> quietly stops meaning anything later.
>
> **Verify:** AT-001.29, AT-001.30, AT-001.31
> **Blocked by:** D3.L1
> **Manifest:** `loop/decomp/req-001.md`, deliverable D6 leaf L2, revision `0579425`

The blocker D3.L1 (per-organisation roles and membership isolation) is Done.
Acceptance tests: AT-001.29, .30, .31 in `f-lifecycle-and-audit.test.ts`. AT-001.30 names
the virtual keys of the gateway requirement, which is not materialised. Decide in the design
how the key revocation is proven, and say so in Tradeoffs.

### Unit 3: AI4DEV-70 (append-only audit trail and sign-in rate limiting)
Item text: (verbatim from the board)

> An append-only audit record for role changes and contact transfers, and rate limiting on
> sign-in.
>
> **Verify:** AT-001.33, AT-001.34
> **Blocked by:** D6.L1
> **Manifest:** `loop/decomp/req-001.md`, deliverable D6 leaf L3, revision `0579425`

The blocker D6.L1 is unit 1 of this brief. Unit 3 starts when unit 1 is green.
Acceptance tests: AT-001.33, .34 in `f-lifecycle-and-audit.test.ts`. Unit 6 below measures
what the local stack does with a configured rate limit. Do unit 6 before the rate-limit half
of this unit if the design needs the answer.

### Unit 4: AI4DEV-74 (revoke residual privileges on four auth tables)
Item text: (verbatim from the board)

> Filed, not built — measured while working the GitHub sign-in item, but pre-existing on
> `main` from the first signup item rather than introduced by that branch, so it was not
> fixed there.
>
> ## What was measured
>
> Four authentication tables carry default privileges that were never explicitly granted or
> revoked: `TRUNCATE`, `TRIGGER` and `REFERENCES`. Row-level security governs the read and
> write paths, so this is residue rather than an open door — but it is privilege nobody
> chose, on the tables that hold accounts.
>
> ## Why it stands alone
>
> It belongs to no acceptance id, it is not in the GitHub sign-in item's territory, and
> fixing it inside that item would have put an unreviewed schema change into a branch whose
> gates had already read the diff. Its fix is a small migration revoking the three
> privileges, plus a check that nothing depends on them.
>
> ## What it needs
>
> A migration on its own branch, through the ordinary lifecycle.

Acceptance tests: none. The tenant isolation merge already revoked the service role's
default privileges on six tables and re-granted two selects. Measure what residue remains
before writing the migration, and let the catalog scan and the live catalog check prove it.

### Unit 5: AI4DEV-75 (refuse volunteer GitHub unlink, the permanent-link ruling)
Item text: (verbatim from the board)

> Enforces the founder ruling of 2026-08-09 (recorded on the decision item under this same
> root): a volunteer may NOT unlink the mandatory GitHub identity after signup — the link is
> permanent for the life of the account, and lost-GitHub-access recovery is an admin-mediated
> path belonging to the admin-operations deliverable, never self-service.
>
> ## Why enforcement is needed
>
> The manual-linking flag that makes signup-time linking possible ALSO opens the platform's
> unlink surface — `supabase/config.toml` records this as seen and deliberately unguarded,
> because at build time no ratified text asked for a guard. The ruling now does.
>
> ## What this item does
>
> 1. Refuse identity unlink for volunteer accounts at the server (the UI never talks to the
>    database directly, so the refusal lives behind the edge/auth surface).
> 2. A test that proves the refusal: a volunteer with a linked GitHub identity attempting
>    unlink is denied and the link survives.
> 3. The ruling becomes ratified text: a new acceptance id in the authentication
>    requirement's suite covering post-signup identity permanence — through the
>    decomposition/AT change flow (`/doc-sync fold`), not an ad-hoc edit.
>
> ## Out of scope
>
> Admin-mediated recovery for a volunteer who lost GitHub access — that is the lost-access
> recovery work in the admin-operations deliverable.

Acceptance tests: one new id, registered through `/doc-sync fold` as the item says, then
turned green. The lost-access recovery it names is unit 1 of this brief.

### Unit 6: AI4DEV-78 (the local stack ignores the configured email rate limit)
Item text: (verbatim from the board)

> Filed, not built — measured while working the email-verification leaf.
>
> ## What was seen
>
> `supabase/config.toml` carries an `[auth.rate_limit]` setting for how many verification
> emails may be sent in a period. The local command-line tool does not apply it. The running
> stack uses its own default instead.
>
> ## Why it matters
>
> Every test of a rate limit on the local stack measures the tool's default, not our
> configured value. A test could pass while the setting it names does nothing, which is a
> green with no meaning behind it.
>
> ## What it needs
>
> Establish what the local tool actually honours, then either make the test assert the real
> behaviour or state in the record that the limit is unverifiable locally and name where it
> is verified instead.

Acceptance tests: none of its own. Its answer feeds AT-001.34 in unit 3.

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
   types: `gh pr merge <n> --squash`. The merge closes the item on the board through the
   pull request link. Never touch the board yourself. Delete no branch and no worktree: the
   founder keeps merged branches for reflection, and deletes by name when they choose
   (founder 2026-09-06).
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
