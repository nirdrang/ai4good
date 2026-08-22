# Gate 1 rulings - AI4DEV-66 (cross-organisation denial, no existence oracle)

Written by the DRAFT sitting, orchestrator on **opus @ max**, 2026-08-12. The founder ruled for
this whole run (relayed 2026-08-12) that every orchestrator sitting of this item runs as
`orchestrator-opus` at opus/max effort - plan, draft, fix-and-goal, and the FIRST audit. This is a
founder choice for this run. It is not a sign that fable has no credit.

**Reviewer:** `gpt-5.6-sol` through codex, effort `xhigh`, sandbox read-only.
**Verdict line:** `PLAN REVIEW: 11 FINDINGS`. Vendor session `019ff7a7-4766-7100-8d31-1992c2d0cb40`.
**Evidence in the record:** `artifacts/gate1-sol.raw.txt`, `artifacts/gate1-sol.distilled.md`,
`artifacts/gate1-sol.stderr.log`.

**Dispositions: 11 findings, 11 adopted, 0 rejected.** Four are adopted with a different remedy
than the reviewer proposed. Every claim below is quoted exactly as the reviewer wrote it.

---

## [1] AT-001.21's UI path - ACCEPT, FIXED DIFFERENTLY

> claim: AT-001.21 is declared green at both tiers without exercising its required UI path.
> why it matters: `organization-dashboard` and the Data API are both HTTP APIs; with no dashboard
> route, both can pass while the interface path remains absent or later exposes cross-organisation
> data.

The defect is real. AT-001.21 names a browser route ("by UI or direct API/ID probing"), the plan
proves only the API route, and the plan records the gap nowhere the machinery can act on.

The reviewer's implied remedy - exercise the interface - is not the one used. There is no screen
(`src/routes/` holds one heading and a root layout) and `src/` is another territory: `ci.yml`
lines 274-284 fail any pull request whose file list matches both `^src/` and
`^(supabase|tests|loop|\.claude|\.github)/`.

**The fix uses the device the harness already has for exactly this.**
`tests/at/harness/registry.ts:69` says of `AtTestOptions.surface`: "`ui` marks the test as part of
a wiring leaf's `--wired` re-run selection". AT-001.21 and AT-001.22 register with
`{ surface: 'ui' }`, so a wiring leaf's `--wired` re-run selects them when screens land.
`--wired` today exits 3 with a stated reason (`runner.ts:1245-1251`), so the tag changes no
current run and costs one option value per id.

**The line that separates a green id from a capability-pending one, written down here because it
is the reason AT-001.21 is green and AT-001.24 is not:** if the criterion's OUTCOME can be
observed without a screen, the id goes green and carries the `ui` tag. If the outcome IS the
screen, the id refuses with a capability. AT-001.21's outcome is "access is denied and nothing
leaks" - observable at the API. AT-001.24's outcome is "only public surfaces render ... every
authenticated surface redirects to sign-in" - that is the screen itself.

**Plan amendment:** steps 2 and 3 register with `{ surface: 'ui' }`; the per-id table's "does NOT
claim" column names the browser route for AT-001.21 and AT-001.22; the merge ruling repeats it.

## [2] Four ids green while the enumerated data kinds are excluded - ACCEPT

> claim: Four ids are declared green while explicitly excluding drafts, ledger, files, threads and
> tasks, although the decomposition manifest does not defer those parts to another leaf.
> why it matters: the named data can later land without its access behavior ever being exercised,
> while the leaves owning AT-001.21, .22, .23 and .40 have already closed green.

Verified against `loop/decomp/req-001.md` lines 35-38 and 47. D5.L1 and D5.L2 are the only leaves
that own AT-001.21, .22, .23, .40 and .24, and the coverage check states each id appears in exactly
one leaf. So no later leaf re-checks isolation of a table that lands later. The finding is right.

The plan's answer is decision E's catalog conformance arm. Ruling 8 finds that arm as specified
does not do the job, so this ruling and ruling 8 are ONE remedy recorded in two places: the
strengthened arm of ruling 8 is what defers the absent kinds, by failing the build when a table in
`public` is not declared. The merge ruling additionally names each absent data kind and the
requirement that owns it.

This stays part of open founder question 2, which the conductor already carries. Nothing here
changes ratified text.

## [3] Closing the batched item with AT-001.24 unresolved - ACCEPT, FIXED DIFFERENTLY

> claim: The plan closes the batched item while its own integration declaration leaves AT-001.24
> capability-pending and the proposed new wiring leaf remains an unresolved founder decision.
> why it matters: the board item explicitly owns AT-001.24, so merging this pull request would
> close work whose required public rendering and sign-in redirects were never built or observed;
> the CI territory guard does not authorize changing that item boundary.

The substance is right and the remedy is available to me now, without waiting for the founder.

**The batch partner's closes-line becomes CONDITIONAL, in writing.** `CLAUDE.md` and the
orchestrator contract already say the partner's `Closes` line is declared in the merge ruling, and
`PHASE-STATE.md` already says the mechanical adds it at merge and not before. I now bind what the
merge ruling may decide: the merge ruling adds the one sanctioned closes-line for the batch partner
**only if** the founder has answered open question 1 - by ratifying a D5 wiring leaf for the
screens, the way D2 has one, or by ruling AT-001.24's browser half out of that item. **With no
founder answer, the line is omitted, the partner item stays open, and the merge ruling states
why.** AI4DEV-66's own branch link is untouched; its two ids carry no residual beyond ruling 1's
tag.

**One clause is rejected, with its reason.** "the CI territory guard does not authorize changing
that item boundary" reads the guard as an authority over board scope. It is not. `ci.yml` lines
274-284 are a path-set check on the changed-file list. The guard is why the screens cannot be built
in this pull request; it is not the thing that decides what closes.

This item does not edit `loop/decomp/req-001.md`. Filing a wiring leaf takes founder approval.

## [4] The 502 path is an existence oracle outside the constant - ACCEPT

> claim: Treating database failures as 502 responses leaves a possible existence oracle outside the
> exported 404 constant.
> why it matters: if a target lookup succeeds and a follow-up membership, account or organisation
> lookup fails only for the existing-row path, the foreign existing id answers 502 while the
> nonexistent id returns 404. Settle this by faulting each post-target lookup while comparing the
> complete responses for an existing foreign id and a nonexistent well-formed id.

The reviewer marked this `unverified-runtime-claim: yes`. It does not need a runtime check to be
closed, because the remedy removes the condition rather than measuring it.

**The remedy is an ordering constraint, and it becomes decision B's third structural clause.**
Every read a decision needs is issued BEFORE the target row is read, and the target read is the
LAST read the handler makes. Then no read's failure can depend on whether the target exists: a
fault in a viewer-context read answers 502 for both ids because the target has not been read yet,
and a fault in the target read answers 502 for both because nothing follows it. The property holds
by construction, the same way the refusal itself does.

**And one loop-tier arm proves it rather than asserting it.** The loop fixture accepts "fail the
next read of the named store", and the body asserts that an existing-but-foreign target and a
well-formed nonexistent target produce the SAME outcome under each fault - same kind, same status,
same body. The flag joins `interface State` and is cleared in `teardown`, under step 8's standing
rule. No fault injection at integration tier; the merge ruling records that.

## [5] The byte-identical oracle cannot run through `callFunction` - ACCEPT

> claim: The promised byte-identical response oracle cannot be implemented through the existing
> `callFunction` helper the plan requires.
> why it matters: `tests/at/suites/req-001/_live.ts:266` parses the body and returns only
> `{status, json}`, discarding the original bytes and headers; differently serialized responses can
> therefore compare equal after parsing.

Verified at `_live.ts:266-288`. The helper reads the body as text, `JSON.parse`s it, and returns
`{ status, json }`.

`callFunction` is NOT changed - landed bodies across the suite use it, and changing its return type
ripples through code this item has no business touching. A sibling helper is added beside it that
returns the body UNPARSED, with the status and the content type, and only the tenant-read members
use it.

**And the plan stops using one word for two tiers.** At integration the comparison is on the raw
response text and the status. At loop there are no bytes, so it is deep equality of the returned
outcome value and its status. Decision B and steps 2, 3 and 9 say which is which instead of
promising "byte-identical" everywhere.

## [6] The definer helpers' search path and grants are unspecified - ACCEPT

> claim: The migration step does not specify the mandatory `search_path` and revoke-then-grant
> posture for its two `security definer` policy helpers.
> why it matters: leaving PostgreSQL's default grants exposes the helpers as public RPC functions,
> while copying the existing service-role-only grants prevents `authenticated` policy evaluation;
> an unsafe search path also violates the explicit definer-function posture established by the
> existing migrations.

Verified across four migrations: every definer function sets `search_path = ''`, then
`revoke execute ... from public` and `grant execute ... to service_role` (for example
`20260808120000_accounts_org_membership_and_acknowledgments.sql` lines 97-98 and 370-376).

The second half of the finding is the sharp part and it is correct: copying that posture verbatim
BREAKS the policy, because a policy expression is evaluated as the querying role, so `authenticated`
needs EXECUTE on any helper a policy calls.

**Dictated posture for each policy helper:**

- `language sql`, `stable`, `security definer`, `set search_path = ''`, every name inside it
  schema-qualified;
- `revoke execute on function <full signature> from public;`
- `grant execute on function <full signature> to authenticated, service_role;`
- a comment stating both reasons: why `authenticated` must hold execute, and why the resulting
  remote-procedure exposure leaks nothing - both helpers answer only about `auth.uid()`, so a
  caller can learn only its own standing, which it already knows.

## [7] Slice 1 is not independently proved - ACCEPT, FIXED DIFFERENTLY

> claim: Slice 1 is not independently proved even though the entire policy set lands there.
> why it matters: AT-001.22's assigned-volunteer control uses the service-role edge function, not
> the Data API, so row-level security that denies every volunteer can pass slice 1; the
> platform-admin policy branch is likewise untested until slice 2.

Right in substance. The remedy is not a note in the gate prompt. It is that **slice 1 does not
SHIP a policy branch that slice 1 does not test.**

Several permissive `select` policies on one table are OR'd, so the set splits cleanly by branch
across two migration files:

- **slice 1** - `<stamp>_tenant_isolation_policy_set.sql`: `public.viewer_is_org_member(uuid)`, the
  organisation-member `select` policies on the four tenant tables, and `grant select ... to
  authenticated`. AT-001.21's own Data API positive control exercises this branch.
- **slice 2** - `<stamp>_tenant_visibility_volunteer_and_admin.sql`:
  `public.viewer_is_platform_admin()`, the assigned-volunteer policy and the platform-admin
  policies. AT-001.23 and AT-001.40 exercise them in the same slice that ships them.

The plan's stated reason for landing the set whole - that splitting makes slice 1's denials vacuous
- does not survive the split being by BRANCH rather than by table. Slice 1's denials remain
denials, and the volunteer and the platform admin are denied at the Data API in slice 1 because no
policy admits them yet. Slice 2's run re-runs AT-001.21 and .22, so an added branch that broke a
denial fails there.

`visibility.ts` still lands whole in slice 1, deliberately: it is one pure rule and splitting a
decision function across slices is worse than the residual it leaves. Its volunteer branch IS
exercised in slice 1 - AT-001.22 carries both an unassigned denial and an assigned control. Its
platform-admin branch is not exercised until slice 2, and slice 1's code-gate additions say so in
as many words, so both readers read that branch as unproven.

## [8] The catalog arm treats any policy as isolation - ACCEPT, FIXED DIFFERENTLY

> claim: The catalog conformance arm treats the presence of any select policy as proof that a table
> is isolated.
> why it matters: a later tenant table with `USING (true)`, the wrong role, or an incomplete tenant
> predicate satisfies this oracle while exposing every row, so the promised self-correcting
> isolation guard is not real.

Right. The remedy keeps the arm's real job - a tripwire that fails when a new table arrives
undeclared - and stops it claiming more than it proves.

**The arm, as dictated:**

1. Every table in `public` appears in exactly one of two shipped lists,
   `unreachableByClientRoles` or `tenantIsolated`. A table in neither list, or in both, FAILS.
2. A table in `unreachableByClientRoles` is unreachable for a stated reason: either
   `information_schema.role_table_grants` shows no `select` grant to `anon` or `authenticated`, or
   row-level security is enabled on it and `pg_policies` shows zero `select` policies reaching
   those roles. **Both arms are needed** - `public.accounts` carries
   `grant select, insert ... to authenticated` and is unreachable only because it has no policy,
   while `public.volunteer_profiles` carries `revoke all` and is unreachable by privilege.
3. A table in `tenantIsolated` carries at least one `select` policy for `authenticated`; no
   `select` policy on it has a `qual` of `true`; and every `select` policy's `qual` names
   `viewer_is_org_member`, `viewer_is_platform_admin`, or that table's declared tenant key column.

**What it still does not prove, and the merge ruling says so:** that a declared predicate is
CORRECT. It proves a table is declared, reachable only as declared, and not trivially open.

## [9] The Data API helper omits the `apikey` header - ACCEPT

> claim: The new caller-token Data API helper does not require the anon or publishable key in the
> `apikey` header alongside the user's bearer token.
> why it matters: the gateway may reject the request before PostgREST and row-level security run,
> making the probe a gateway test rather than a user-scoped policy test. Settle this with a live
> request carrying `apikey: slot.anonKey` plus the caller's access token and demonstrate an allowed
> own-row control and a denied foreign-row `[]`.

Marked `unverified-runtime-claim: yes`, and every existing call in this tree already sends the
header: `_live.ts` lines 249 and 271, `_integration.ts` lines 954 and 977.

The new helper sends `apikey: slot.anonKey` AND `Authorization: Bearer <the caller's own access
token>`. The thing that settles it is the positive control the plan already requires - the owning
NGO's keyed read returns exactly its own row (step 2). **Step 9's done-criterion now names that
control as the settlement**, so an empty array from a denied read can never be a gateway refusal in
disguise.

## [10] Step 5 calls for `supabase db reset` - ACCEPT

> claim: Step 5 calls for `supabase db reset` even though the plan says resets occur only through
> the integration runner and the repository provides an identity-proving pool reset path.
> why it matters: a literal reset from the worktree bypasses the occupancy and target-identity
> checks in `resetSlotDatabase` and can act on the repository-configured personal stack rather than
> reserved slot 1.

Adopted, and it is the most dangerous of the eleven. `tests/at/harness/db-pool.ts` lines 1177-1186
puts the identity read INSIDE the reset - "so no caller can reach the reset without it" - for the
reason recorded at `tests/at/harness/runner.ts` lines 609-615: on 2026-08-09 a `db reset` aimed at
slot 2 destroyed the founder's personal database, because the environment supplied the identity
while the slot's config supplied the ports. The plan's own fact 12 says no step resets a database
by hand, and step 5's done-criterion then said the opposite.

**Step 5's done-criterion is replaced.** The migration is proved by the integration run, which
resets through the guarded path and prints its own slot evidence line naming the slot and the
migration count. The policy count is read over the operator connection the live adapter already
opens. **No step in this plan runs `supabase db reset`, directly or through any wrapper.**

## [11] A comment that becomes false - ACCEPT

> claim: The plan omits a comment that will become false when `authenticated` receives `select` on
> `public.projects`.
> why it matters: the comment will continue to state that the table reaches no Data API role, and
> step 17's two search phrases will not detect it.

Verified at `_live.ts` lines 709-712: the comment states `public.projects` reaches no Data API role
at all and cites the measurement behind it. Slice 1 grants `select` on that table to
`authenticated`, so the sentence stops being true, and neither of step 17's phrases finds it.

**The correcting step's done-criterion now names the file and the line** - it is step 18 in the
amended plan, renumbered from 17 when slice 2's migration became its own step - adds the phrases
"reaches no Data API role" and "zero catalog rows" to the search, and requires the corrected comment
to keep the original measurement as history with the date it stopped being true.

---

## Two additions of my own, found while ruling

These are not reviewer findings. They are dictated into the plan the same way.

**A. The new migration REVERSES an explicit revoke, and must say so.**
`20260811130000_single_seat_org_and_single_developer_projects.sql` line 123 carries
`revoke all on table public.projects from anon, authenticated, service_role;`. Slice 1's migration
grants `select` on that table to `authenticated`. A later migration overriding an earlier one is
ordinary, but a silent reversal of a deliberate revoke is not. The migration's comment names the
earlier statement and states why the grant is now correct.

**B. `public.accounts` is the case the two-list scheme would have failed on.** It is granted to
`authenticated` and reaches no row, because row-level security is on and it has no policy. Ruling
8's clause 2 is written with both arms for that reason; an arm that tested grants alone would have
classified `accounts` as reachable and failed the build on the first run.
