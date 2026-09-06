# Brief for AI4DEV-56 (admin operations, lifecycle gates, audit)

Chain: AI4PM-19 (authentication and org membership requirement) > AI4DEV-50 (authentication dev root) > AI4DEV-56 (admin operations, lifecycle gates, audit)
Branch: nirdrang/ai4dev-56-admin-operations-lifecycle-gates-and-audit-d6
PRD slice: `loop/out/pure-s3-req-001-006.md`, lines 1 to 12, the REQ-001 section. Pasted verbatim:

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

Item text: the parent's description, verbatim:

> Deliverable D6 of the authentication requirement: recovering accounts, deactivating them, and leaving a trail. A container — it folds when its leaves close.
>
> Covers acceptance ids AT-001.25 through .31, plus .33, .34 and .35.

Acceptance tests: `tests/at/suites/req-001/e-admin-operations.test.ts` (AT-001.25, .26, .27, .28, .35) and `tests/at/suites/req-001/f-lifecycle-and-audit.test.ts` (AT-001.29, .30, .31, .33, .34). The criteria are in `.taskmaster/docs/acceptance/at-req-001.md`, sections F (contact transfer and recovery), G (lifecycle gates writes) and H (audit and abuse controls). Every one of these ten ids is declared red today with the shape `pending / sut-missing` at both tiers in `tests/at/expected/req-001.json`, lines 35 to 44 and 78 to 87.

The manifest `loop/decomp/req-001.md` gives deliverable D6 three leaf lines, verbatim:

> - L1 contact transfer + lost-access recovery (audited, history preserved, admin-only executor) + escalation-contact capture at concierge onboarding · verify: AT-001.25,26,27,28,35 · blocked-by: D1.L1
> - L2 deactivation gates every write: all write routes register through ONE mandatory lifecycle-gate boundary, with a conformance check that fails any unregistered write route (so AT-001.29's all-endpoints oracle stays true as later waves add routes — the test stays wired in CI) + AUP-deactivation key revocation [cross: REQ-009] + re-enable recovery · verify: AT-001.29,30,31 · blocked-by: D3.L1
> - L3 append-only audit for role changes and contact transfer + sign-in rate limiting · verify: AT-001.33,34 · blocked-by: L1

Blockers, resolved from the board on 2026-09-06:

| code in the item text | the item it names | state |
|---|---|---|
| D1.L1 | AI4DEV-57 (email and Google signup) | Done, 2026-08-08 |
| D3.L1 | AI4DEV-62 (per-organisation roles) | Done, 2026-08-12 |
| D6.L1 | AI4DEV-68 (contact transfer and lost-access recovery), unit 1 of this run | In Progress; it closes inside this run, before unit 3 starts |

No unit carries a Linear blocking relation. The three extra units hang directly under AI4DEV-50 (authentication dev root), the same root as the parent. All seven items were set In Progress and assigned to the founder between 04:10 and 04:11 UTC on 2026-09-06.

## Units

### Unit 1: AI4DEV-68 (contact transfer and lost-access recovery)
Item text, verbatim:

> Transferring an organisation's contact and recovering an account whose owner has lost access — audited, with history preserved, and executable only by a platform admin. Also captures the escalation contact during concierge onboarding.
>
> **Verify:** AT-001.25, AT-001.26, AT-001.27, AT-001.28, AT-001.35
> **Blocked by:** D1.L1
> **Manifest:** `loop/decomp/req-001.md`, deliverable D6 leaf L1, revision `0579425`

Acceptance tests: `tests/at/suites/req-001/e-admin-operations.test.ts`, all five call sites, section F of `at-req-001.md`. The file header says a platform administrator exists and authenticates (AT-001.07), but no operation these ids act with exists, and no audit table exists in the tree.

### Unit 2: AI4DEV-69 (deactivation gates every write)
Item text, verbatim:

> Deactivating an account must gate **every** write. All write routes register through one mandatory lifecycle-gate boundary, and a conformance check fails any route that is not registered — so the all-endpoints assertion stays true as later waves add routes, rather than silently decaying. Also revokes gateway keys on acceptable-use deactivation, and supports re-enabling.
>
> The conformance check is the point of this leaf: without it the test passes today and quietly stops meaning anything later.
>
> **Verify:** AT-001.29, AT-001.30, AT-001.31
> **Blocked by:** D3.L1
> **Manifest:** `loop/decomp/req-001.md`, deliverable D6 leaf L2, revision `0579425`

Acceptance tests: `tests/at/suites/req-001/f-lifecycle-and-audit.test.ts`, lines 44 to 48, section G of `at-req-001.md`.

### Unit 3: AI4DEV-70 (append-only audit and sign-in rate limit)
Item text, verbatim:

> An append-only audit record for role changes and contact transfers, and rate limiting on sign-in.
>
> **Verify:** AT-001.33, AT-001.34
> **Blocked by:** D6.L1
> **Manifest:** `loop/decomp/req-001.md`, deliverable D6 leaf L3, revision `0579425`

Acceptance tests: `tests/at/suites/req-001/f-lifecycle-and-audit.test.ts`, lines 127 to 129, section H of `at-req-001.md`.

### Unit 4: AI4DEV-74 (revoke leftover table privileges)
Item text, verbatim:

> Filed, not built — measured while working the GitHub sign-in item, but pre-existing on `main` from the first signup item rather than introduced by that branch, so it was not fixed there.
>
> ## What was measured
>
> Four authentication tables carry default privileges that were never explicitly granted or revoked: `TRUNCATE`, `TRIGGER` and `REFERENCES`. Row-level security governs the read and write paths, so this is residue rather than an open door — but it is privilege nobody chose, on the tables that hold accounts.
>
> ## Why it stands alone
>
> It belongs to no acceptance id, it is not in the GitHub sign-in item's territory, and fixing it inside that item would have put an unreviewed schema change into a branch whose gates had already read the diff. Its fix is a small migration revoking the three privileges, plus a check that nothing depends on them.
>
> ## What it needs
>
> A migration on its own branch, through the ordinary lifecycle.

Acceptance tests: none. The item names no acceptance id. The two catalog checks that exist today are the proof surface: the static scan `tests/at/suites/req-001/_policy-scan.ts` over the migrations, and the live read in `tests/at/suites/req-001/_live-tenant-reads.ts` (lines 268 to 288), which pins all seven table privileges for `anon`, `authenticated` and `service_role` on every table in `public`.

### Unit 5: AI4DEV-75 (volunteer GitHub unlink refused)
Item text, verbatim:

> Enforces the founder ruling of 2026-08-09 (recorded on the decision item under this same root): a volunteer may NOT unlink the mandatory GitHub identity after signup — the link is permanent for the life of the account, and lost-GitHub-access recovery is an admin-mediated path belonging to the admin-operations deliverable, never self-service.
>
> ## Why enforcement is needed
>
> The manual-linking flag that makes signup-time linking possible ALSO opens the platform's unlink surface — `supabase/config.toml` records this as seen and deliberately unguarded, because at build time no ratified text asked for a guard. The ruling now does.
>
> ## What this item does
>
> 1. Refuse identity unlink for volunteer accounts at the server (the UI never talks to the database directly, so the refusal lives behind the edge/auth surface).
> 2. A test that proves the refusal: a volunteer with a linked GitHub identity attempting unlink is denied and the link survives.
> 3. The ruling becomes ratified text: a new acceptance id in the authentication requirement's suite covering post-signup identity permanence — through the decomposition/AT change flow (`/doc-sync fold`), not an ad-hoc edit.
>
> ## Out of scope
>
> Admin-mediated recovery for a volunteer who lost GitHub access — that is the lost-access recovery work in the admin-operations deliverable.

The admin-mediated recovery this item puts out of scope is unit 1 of this brief.

Acceptance tests: none exists today. The item creates one new id in `.taskmaster/docs/acceptance/at-req-001.md` through `/doc-sync fold`, registers it with `atTest` in a file under `tests/at/suites/req-001/`, and declares it in `tests/at/expected/req-001.json`. `at:check` refuses a run when an expected id has no call site, so the id, the call site and the manifest row land in one change.

### Unit 6: AI4DEV-78 (local email rate limit ignored)
Item text, verbatim:

> Filed, not built — measured while working the email-verification leaf.
>
> ## What was seen
>
> `supabase/config.toml` carries an `[auth.rate_limit]` setting for how many verification emails may be sent in a period. The local command-line tool does not apply it. The running stack uses its own default instead.
>
> ## Why it matters
>
> Every test of a rate limit on the local stack measures the tool's default, not our configured value. A test could pass while the setting it names does nothing, which is a green with no meaning behind it.
>
> ## What it needs
>
> Establish what the local tool actually honours, then either make the test assert the real behaviour or state in the record that the limit is unverifiable locally and name where it is verified instead.

Acceptance tests: none. No id names the email rate limit. AT-001.34 in unit 3 names the sign-in rate limit, and the same question applies to it. See "Facts from the repository", item 9.

## Facts from the repository

The board does not say these. The lead needs them.

1. `main` is at `32c8fbc`. The item branch was cut from it, and the only commits on the branch before you are this brief.
2. The last merged item is the tenant-isolation parent, pull request #66, merged 2026-09-06 03:47 UTC. Its migrations `20260906120000_tenant_read_posture_and_org_member_policies.sql` and `20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql` land the read-policy set, the `viewer_` helper functions, and two catalog checks. Its "Not done here" list includes: moving the two write functions' lookups off the service role, the account type as a token claim, and the authenticated screens that turn AT-001.24 green. None of those is this run's.
3. The static scan `_policy-scan.ts` runs at the loop tier, so it runs in CI. It requires `revoke all ... from anon, authenticated` after every `create table`, refuses `alter default privileges`, `grant ... to public` and `grant ... on all tables`, refuses a policy `to anon`, `for all`, or with a tautological `using`, requires every `using` to name `auth.uid()` or a `public.viewer_` function, requires a `revoke execute from public` on every SECURITY DEFINER function, and refuses any write privilege for `service_role`. Every new table this run adds (an audit table, an escalation contact, a lifecycle column) must pass this scan or CI fails. The live catalog check at integration walks `public` both ways, so a table the catalog does not name is a problem.
4. Unit 4 may already be done on `main`. The four tables the item names are `accounts`, `organizations`, `org_memberships` and `acknowledgments` (the replay capture in the GitHub sign-in item's folder, `loop/items/AI4DEV-58/migration-replay.txt`, lines 154 to 160). Migration `20260906120000`, lines 46 to 52, runs `revoke all on table` over those four plus `volunteer_profiles` and `projects` from `anon`, `authenticated` and `service_role`, then re-grants `select` only. `revoke all` covers `TRUNCATE`, `TRIGGER` and `REFERENCES`. The live check already pins the exact privilege set. Measure on the stack before writing a migration; the unit may reduce to a proof and a record.
5. `public.accounts` carries no lifecycle or deactivation column. The first migration says so at line 13, and the header of `f-lifecycle-and-audit.test.ts` (lines 10 to 14) says a flag nothing reads enforces nothing. No audit table exists (header of `e-admin-operations.test.ts`). The org-membership migration, line 31, defers the role-change audit to AT-001.33.
6. The write routes on `main` today are three edge functions: `complete-signup`, `create-organization` and `update-organization`. Each goes through `edgeHandler` in `supabase/functions/_shared/edge.ts` and a SECURITY DEFINER database function. The three read functions are `organization-dashboard`, `project-workspace` and `public-project`. Unit 2's "one mandatory lifecycle-gate boundary" has these three write routes to register, and its conformance check must fail a fourth route that a later wave adds without registering.
7. AT-001.30 names virtual-key revocation with a cross to the LLM gateway requirement (REQ-009), and AT-001.31 names re-issue "per the documented recovery" with a cross to the operations requirement (REQ-030). Nothing under `supabase/` mentions virtual keys or a gateway. The last merge used a declared red shape, `capability-pending` on a named capability, for a clause whose surface does not exist. That shape is available. Whether the key clause is declared that way or built as a stub is a founder question, not the lead's. Ask the founder before the design arena, in one message that names the two options, and record the answer in the decision trail.
8. AT-001.28 says the escalation contact is captured "at concierge onboarding". Concierge onboarding is the vetting step of the NGO profile requirement (the REQ-002 section that follows the slice above). No concierge onboarding surface exists. `create-organization` is the organisation creation path today.
9. The email rate limit measurement, from the verification leaf's records (`loop/items/AI4DEV-59/stack-up.txt`, lines 53 to 65): the auth container carried `GOTRUE_RATE_LIMIT_EMAIL_SENT=360000` while `supabase/config.toml` carries `email_sent = 2` (line 231). The CLI did not push the file's value into the container. `sign_in_sign_ups = 30` per five minutes per IP (line 239) is the setting AT-001.34 names. Unit 6's answer decides whether unit 3 can prove AT-001.34 on the local stack at all. Do unit 6's measurement before unit 3's design. `db:start` now runs `supabase start --ignore-health-check`.
10. Unit 5: the unlink surface is Supabase Auth's own endpoint, not an edge function. No function under `supabase/functions/` calls link or unlink; `_shared/github.ts` only reads `identities[]` from `/auth/v1/user`. `enable_manual_linking = true` is at `supabase/config.toml` line 212, and the comment at lines 206 to 211 records the open unlink surface as seen and deliberately unguarded. The founder ruling on the decision item under the same root, comment of 2026-08-09, reads exactly: "For 73 no unlink." The refusal must live where Auth deletes the identity row, or in front of it; that is a design choice for the arena.
11. `_pending.ts` holds the `LEAF` map with entries `D6_L1`, `D6_L2`, `D6_L3` and `D3_L3`. Each landed leaf removes its entry and flips its ids from `pending` to `green` in `tests/at/expected/req-001.json` in the same change. Every earlier leaf also wrote a `pending-ledger.txt` under its item folder. The remaining pending ids after this run are AT-001.18 (the cross-surface single-seat leaf, not in this run) and AT-001.24 (the auth-screens wiring leaf, not in this run).
12. Verify commands, from `package.json`: `bun run typecheck`, `bun run at:check req-001`, `bun run at:selftest`, `bun run at:verify req-001 --tier loop --expect`, `bun run at:verify req-001 --tier integration --expect`. The last merge's integration run reported 20 green and 17 red on `main`.
13. The pull request body must not name any id but the parent's own. The board titles of the six units carry codes in parentheses; write the units in words.

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
