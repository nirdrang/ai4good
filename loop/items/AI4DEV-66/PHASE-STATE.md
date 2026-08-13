# PHASE-STATE - AI4DEV-66 (cross-org denial, no existence oracle), batch with AI4DEV-67 (assigned volunteer, admin, stranger)

**Phase: THE MERGE RULING IS WRITTEN AND COMPLETE. THE MERGE IS BLOCKED ON A FOUNDER DECISION.**

**Every gate is closed. Every finding is ruled. The required continuous-integration check is GREEN on
the exact final head. NOTHING IS LEFT FOR ANY SITTING TO RULE.** The next event is not a wait on a
machine - it is **an answer from the founder**, and no sitting can proceed without it.

**The full merge ruling is `loop/items/AI4DEV-66/rulings-merge.md`.** It is finished, not a draft. It
states both verification halves, every finding and its disposition, what the green claims and does
not claim, both maintained reviewer disagreements verbatim, and what this sitting would decide under
each possible founder answer. **It stops at the ruling and does not merge.**

Written by the MERGE sitting, orchestrator on **opus @ max**, 2026-08-13.

## THE MODEL RULING FOR THIS RUN - CARRY IT FORWARD

The founder ruled (relayed 2026-08-12, restated 2026-08-13) that **every orchestrator sitting of this
item runs as `orchestrator-opus` at opus/max effort** - plan, draft, fix-and-goal, and the FIRST
audit - not only the merge and audit-re-run sittings that are opus by design. This is a deliberate
founder choice for this run. It is **not** a sign that fable has no credit. The conductor spawns every
subsequent sitting of this item the same way, and every state file repeats this paragraph.

**This sitting was ALSO opus by design, independently of that ruling** - the orchestrator contract
makes the MERGE sitting an opus sitting. Both reasons held at once.

## Attribution, derived from the branch

Branch `nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`, cut from
`origin/main` at `948d4f0`, merge-base with main `926d170`.

`AI4PM-19 (auth and org membership)` > `AI4DEV-50 (auth root)` >
`AI4DEV-55 (tenant isolation and visibility)` > `AI4DEV-66 (cross-org denial, no existence oracle)`.

`AI4DEV-67 (assigned volunteer, admin, stranger)` rides this branch. It is the manifest's D5.L2,
blocked by D5.L1, which is why the two are batched. Slice 2 was that partner item's whole scope.

**Database slot 1**, reserved under this item, covers both. **The slot is still reserved and its
release is the coordinator's, not this sitting's.**

Pull request **#57** is OPEN (`https://github.com/nirdrang/ai4good/pull/57`).

---

# 1. THE ONE QUESTION FOR THE FOUNDER - THIS IS THE WHOLE BLOCK

> **The integration tier has never run at any head of this branch, so half of this item's
> verification evidence does not exist. Database slot 1's local stack is down - the gateway container
> cannot bind its API port and the edge-function container cannot mount its entry file - and only you
> can clear it.**
>
> **Either clear the stack, so the integration tier can run and both halves of the evidence exist;
> or explicitly accept loop-only evidence for this item, knowing that both migrations, every policy
> and all three helper functions would reach `main` never having been applied, parsed or evaluated
> anywhere.**
>
> **A green continuous-integration check is NOT an answer to this.** The merge sitting verified that
> `.github/workflows/ci.yml` never names the integration tier at all - its verification step is
> `bun run at:verify "$req" --tier loop --expect` and nothing else - so the check holds no database
> slot and cannot supply the missing half.

**Why the merge sitting could not rule around it**, in one line each and in full in
`rulings-merge.md` section 8:

1. **The orchestrator contract** requires the ruling to state both tiers, and says in as many words
   that a ruling stating only the loop result is stating a green against stand-ins.
2. **The shared invariant on loosening** - a rule that loosens the process needs a real, explicit
   founder ruling, and loosening may never be inferred. Silence is not an answer and a green is not
   an answer.
3. **This item's own record**, in five consecutive sittings. Overturning it would need a reason, and
   the only fact that changed since is the green - which is precisely the fact the record already
   ruled cannot substitute, and which the merge sitting independently confirmed is a loop-tier green.

## THE TWO PLAN-SITTING QUESTIONS DO NOT BLOCK THE MERGE - BOTH ARE DISPOSED OF

They still want answers before the partner item can close. **Neither gates the merge**, and the
merge sitting checked each rather than assuming it.

1. **AT-001.24's browser half / a D5 wiring leaf.** **NOT BLOCKING - gate-1 ruling 3 gave it a
   determinate default and the merge sitting APPLIED it: the `Closes AI4DEV-67` line is OMITTED.**
   Whenever this merges, AI4DEV-66 closes through its own branch link and **AI4DEV-67 stays open with
   its work landed** - chosen deliberately over closing an item whose browser half was never built.
2. **The data kinds the criteria enumerate that do not exist.** **NOT BLOCKING - disposed of in
   `rulings-merge.md` section 7**, which names each absent kind and the requirement that owns it:
   drafts (REQ-005), ledger (REQ-006), files, thread and tasks (REQ-010 and above). Only the
   dashboard kind exists, and this item isolates all four of its tables.

---

# 2. THE EVIDENCE, AS IT STANDS AT THE FINAL HEAD

**Final head `d4f7835ea0f2d42e6a0d4aac49022186049e9e08`.** Local `HEAD`, the remote tip and the CI
run's `headSha` were confirmed to be one value, and the working tree was clean.

**THE LAST COMMIT THAT TOUCHES CODE IS `5da2e22`**, verified rather than inherited:
`git diff --name-only 5da2e22 d4f7835` returns exactly one path, this file. Nothing under
`supabase/`, `tests/` or `src/` moved after the final code head.

| what | value |
|---|---|
| required check | `CI` / `verify`, run **31661003643** |
| status / conclusion | `completed` / **`success`** |
| head sha | `d4f7835ea0f2d42e6a0d4aac49022186049e9e08` |
| steps | 16, every one `success` |
| pull request | `MERGEABLE`, `mergeStateStatus: CLEAN` |

**LOOP TIER - EXACT MATCH, measured by the check itself on this exact head:**
`req-001` exit 0, **26 green / 11 red / 0 missing**, matching `tests/at/expected/req-001.json`
exactly; `req-016` exit 0, 11 green / 1 red, exact. `at:check req-001` exit 0, 37 P0 ids in
bijection. **All five of this item's ids are green by name in that run.** The executor's four local
runs at the final code head agree with these figures exactly - two independent measurements, one of
them made by a machine with no stake in the answer.

**INTEGRATION TIER - NEVER RUN. There is no result to state.** One attempt ever, by slice 1's draft
sitting at head `b247772`, exit code **3**, about five seconds, zero tests, nothing graded, no
database reset. **There is no slot evidence line to carry, because the run never reached the reset**,
and that absence is recorded rather than described in words that could be mistaken for a result. Full
capture: `artifacts/integration-attempt.txt`.

**NO REMEDIATION HAS BEEN ATTEMPTED BY ANY SITTING, AND THE MERGE SITTING ATTEMPTED NONE.** No
container started, stopped, rebuilt or reconfigured; no port changed; no `supabase/config.toml` edit
for the stack; no `AT_DB_SLOT` override; and **`supabase db reset` never run, directly or through any
wrapper** (gate-1 ruling 10). **One attempt is spent. Do not spend another speculatively** - run the
tier when the founder says the stack is up, and not before.

---

# 3. WHAT COMPLETES THE NEXT PHASE - TWO PATHS, ONE PER ANSWER

**Nothing happens until the founder answers.** The conductor relays the question and waits; no
sitting spans that wait.

## PATH A - THE FOUNDER CLEARS THE STACK

1. A fresh sitting (`orchestrator-opus`) spawns an executor to run
   `bun run at:verify req-001 --tier integration --expect` **once**, through the guarded pool path in
   `tests/at/harness/db-pool.ts`. **No hand reset. No `AT_DB_SLOT`. No container work by any role
   inside this item.** The runner's own slot evidence line - naming the slot, the reset and the
   migration count - is carried into the report **verbatim**, because the merge ruling must quote it.
2. **If it is an EXACT MATCH:** commit the evidence, push, let the check re-run on the new head, and
   a MERGE sitting rules with both halves present. Expected integration counts, from the plan and to
   be confirmed by the run rather than by the table: **20 green / 17 red**, with AT-001.24 red under
   `{ "kind": "capability-pending", "capabilities": ["ui.logged-out-surface-rendering"] }`.
3. **If it DEVIATES:** rule the deviation, fix through the executor, push. **THE AUDIT RE-RUN IS
   SPENT - 1 of 1 - AND THERE IS NO SECOND ONE.** A fix that would need a second re-run is **scope
   growth**: escalate it to the founder, never spend it quietly. **The founder should know this
   before choosing path A**: clearing the block may reopen work under an escalation rather than
   simply producing a green.

## PATH B - THE FOUNDER EXPLICITLY ACCEPTS LOOP-ONLY EVIDENCE

1. A fresh MERGE sitting **records the acceptance verbatim, with its date**, as the founder's ruling
   and never as a conclusion any sitting reached.
2. It merges on `rulings-merge.md` **plus that acceptance**, carrying section 6's "what the green does
   NOT claim" list and all 22 residuals into the pull request.
3. **AI4DEV-66 closes. AI4DEV-67 stays open**, per section 1.

## WHAT BINDS EITHER PATH AT THE MERGE ITSELF

- **The required check must be GREEN on whatever head is merged**, and the ruling records both the
  run and the commit. **The green is necessary and it is NOT sufficient** - that is the whole lesson
  of this block.
- **THE ORCHESTRATOR NEVER RUNS THE MERGE COMMAND.** A mechanical publishes the body as handed, posts
  the ruling as handed, and executes the merge; the orchestrator verifies the merged state afterwards.
  **The merge tail has EXACTLY ONE executor - the mechanical that sitting spawns.** If it finds any
  tail step already done, that is another actor crossing the boundary: **stop there**, verify the end
  state independently, and record the crossing as a defect. **If the mechanical reports a permission
  refusal, that is a STOP** - report it upward with the exact denial text and end the sitting. Never
  run the command instead, and never find another actor who can.
- **`main` has moved to `160042c`** and this branch has not taken it in. The pull request is
  `MERGEABLE` / `CLEAN`, so there is no conflict. **The merge sitting deliberately did NOT merge main
  in**: it would move the head and discard a green for no benefit while the merge is blocked, and the
  head moves anyway under either path. The sitting that merges decides again, with facts current then.
- **The flake allowance is UNUSED** - one re-run of the check, no new commit - and it passes forward.

---

# 4. THE PULL REQUEST BODY - RULED, AND A HAZARD THE MERGING SITTING MUST HANDLE

**The published body is STILL the plan sitting's placeholder** and it ends with "Work in progress.
The plan is under review. Code has not been written." **That is false at this head and must not
survive into a merge commit.** The body is replaced whenever this merges.

**RULED BY THE MERGE SITTING:**

- **The `Closes AI4DEV-67` line is OMITTED**, under gate-1 ruling 3's default. Section 1 says why.
- The pull request closes AI4DEV-66 through its own branch link; that link is untouched.
- **No other item id appears anywhere in the title or body.** Other items are named in words.
- The body lists the ride-along and states both halves honestly - loop exact, integration absent.

**THE HAZARD, FOUND BY THE MERGE SITTING WHILE VERIFYING, AND IT IS AN INSTRUCTION:**

**The reference guard graded the OLD body, and editing a body does NOT re-run it.** `ci.yml`'s
trigger is `pull_request: branches: [main]` with **no `types:` list**, so GitHub's default applies -
`opened`, `synchronize`, `reopened`. **`edited` is not among them.** A body swapped in after the
green is therefore **checked by nothing**, and a foreign id in it would move that item with no guard
in the way.

1. **The merging sitting verifies the new body for foreign ids ITSELF, before publishing.** The guard
   cannot do it and must not be relied on for a post-green body swap.
2. **The ruling COMMENT posted to the pull request names the partner item in WORDS, never by id.**
   `rulings-merge.md` names `AI4DEV-67` throughout, which is correct for a record in the repository.
   A comment on the pull request is a different surface, and the safe direction is unambiguous: **the
   comment names no id but this branch's own.**

---

# 5. CAPS

**The merge sitting:** executor invocations **0 of 3**; **mechanical invocations 0 - and that is the
ruling, not an omission**; integration-tier attempts **0**; audit re-runs **0**; flake re-runs **0 of
1**; pushes against a red check **0 of 2**.

**Across the item, executor invocations by sitting:** slice-1 draft 2 of 3; slice-1 fix-and-goal 1 of
3; slice-2 draft 1 of 3; slice-2 fix-and-goal 2 of 3; audit 2 of 3; audit re-run 1 of 3; **merge 0 of
3**. The terminated resume-sitting's invocation was ruled not-chargeable by that sitting and no
sitting since has reopened that ruling. **Caps are PER SITTING** - the next sitting opens with three
of its own.

**AUDIT RE-RUNS: 1 of 1. SPENT. THERE IS NO SECOND ONE.**

---

# 6. STANDING ITEMS THE MERGE RULING CARRIES

`rulings-merge.md` section 12 points at this section, so this list stays here as the one carrier
rather than being copied into two files that could drift apart.

## Residuals

1. **Timing is not defended.** The claim is about response content and status, never response time.
2. **AT-001.21 and AT-001.22 are `ui`-tagged, not UI-proved.** No screen exists.
3. **Only the dashboard kind of tenant data exists.** Drafts, ledger, files and thread do not.
4. **The public project surface reveals that a project exists**, deliberately.
5. **RETIRED BY SLICE 2.** `visibility.ts`'s platform-admin branch now has a unit oracle AND an
   acceptance test driving it through a surface at both tiers.
6. **RETIRED BY SLICE 2.** `publicSchemaCatalog` now has a consumer.
7. **The read-fault arm is loop tier only.** No fault is injected into a real database. **AND it
   covers the two AUTHENTICATED surfaces only** - it cannot cover the public surface, because its
   comparison needs an existing-but-FOREIGN target and nothing is foreign on a public surface.
8. **The loop-tier Data API arms grade the fixture's MIRROR of the policy set, not the migrations.**
   Item claim 1 - "a green grades shipped code rather than a copy of it" - holds for the edge-surface
   arms and NOT for the probe arms at loop tier.
9. **The `readRows` fix is proved by reading, not by a test.** No test program imports `edge.ts`.
   **`edge.ts:8` states this in the code, and THAT STATEMENT IS UNVERIFIED.** No sitting of this item
   has measured it, and the merge ruling says so rather than implying it was checked.
10. **The four Data API positive controls are a BRACKET, not a proof.**
11. **CORRECTED BY AUDIT RULING A3.** **TWO TEST FILES import the route registry** -
    `tests/at/suites/req-001/_route-scan.ts` and `tests/at/harness/shipped-route-visibility.selftest.ts`
    - and **NO PRODUCT CODE imports it**. **A ROUTER EXISTS** (`src/router.tsx`) and consults nothing.
    What the registry buys: a declaration in product code and a test that fails when a route arrives
    undeclared. **It is not a redirect that runs.** The re-run's seat 1 re-graded this PASS.
12. **The catalog conformance arm does not prove a declared predicate is CORRECT.** It proves a table
    is declared, reachable only as declared, row-level security is on, the rightful tenant is admitted,
    and no policy is literally `true`. **A semantically open predicate naming an approved identifier
    still satisfies it** - `using (org_id = org_id)`, or `using (id is not null)` on `organizations`.
    **This was attacked at the code gate and dismissed with reasons** (slice-2 ruling 4), and that
    reader's claim goes verbatim into the pull request.
13. **The catalog selftest's "real shaped catalog" is a HAND-WRITTEN PREDICTION** of what the two
    migrations leave in `pg_policies`, deparsed `qual` strings included. Only the integration tier
    grades it.
14. **A request carrying no `Authorization` header is not expressible against the two authenticated
    functions.** Both declare `verify_jwt = true`.
15. **Whether the Data API accepts a revoked-but-unexpired access token is UNMEASURED.** The live
    adapter deliberately retains a session's tokens after `signOut`, and PostgREST judges a token by
    signature and expiry rather than by a session store. AT-001.24 refuses at that tier, so nothing in
    this branch grades it.
16. **`has_table_privilege` errors if the role name does not exist.** Deliberate - a loud failure beats
    a silent absence - and it has never been executed. **It is the first thing to watch on a path-A
    integration run.**
17. **The account-type conjunct on the assigned-developer policy is a READ-side repair of a WRITE-side
    gap.** The developer seat still accepts any account type at write time.
18. **FROM AUDIT RULING A1 - the public project surface's OUTAGE path distinguishes an existing
    project from an absent one.** An organisation-read fault answers 502 where an absent project
    answers 404. **It sits INSIDE residual 4 rather than beside it**, and the reason is measured: on
    the normal path this surface answers 200 carrying the project's name AND its organisation's name
    for every project that exists, and 404 for one that does not. The outage path discloses strictly
    less about the same rows. **No project is hidden by this surface.** One sub-case, named rather than
    left to be found: a project whose ORGANISATION row is missing answers 404, and under an
    organisation-read fault answers 502; that distinguishes a data-integrity state from a fault, not
    one tenant from another.
19. **FROM AUDIT RULING A6 - the widened catalogue predicate has never been executed.**
20. **AT-001.40's four extended non-administrator controls have never run at integration tier.** Audit
    ruling A2 wrote them into the `at00140` integration body and nothing has graded that body.
21. **ABOUT THIS PROCESS RATHER THAN THE PRODUCT - the orchestrator's own rulings have been wrong
    FOUR times on this item.** The executor caught three of them before writing: slice-2 ruling 9 (an
    exhaustive fix list claimed on a two-phrase search), audit ruling A4 (a citation naming a line that
    returns before the scope is read), and the audit re-run's own stale line numbers inside the ruling
    that forbids stale line numbers. **The fourth was found by the MERGE sitting reading the record**:
    `rulings-gate2-slice2.md`'s header says "Six adopted, two dismissed" where its own body and its own
    executor section both show **seven adopted and one dismissed**. No executor caught it because a
    summary line gates no writing. **The merge ruling names this as evidence that the dispute right
    pays**, not as an apology - it has now paid three times, and never once through a reviewer.
22. **FROM RE-RUN RULING R1 - the public surface's ordering exemption rests on ONE reason, not two.**
    The reason is that the surface makes no access decision. **The discarded reason - that the ordering
    clause is UNSATISFIABLE there - was an over-claim and must not be re-derived.** The clause CAN be
    met, by collapsing the two reads into one; what is true is only that the two reads AS WRITTEN
    cannot be reordered. **AND NEITHER COLLAPSED READ SHAPE IS MEASURED** - whether PostgREST serves an
    embedded select or a reverse relationship query against this schema has never been executed, and
    the record asserts nothing about it. The foreign key that would enable both is read out of
    `20260811130000_single_seat_org_and_single_developer_projects.sql:59`.

## Rides along

**One line in `.claude/agents/reviewer-runner.md`** (slice-1 gate-2 ruling 8, commit `50d0daa`). That
file told the runner to report any tool outside `read`, `glob` and `grep` as an INVALID RUN, while
`.opencode/agent/reviewer-flash.md` grants `gitdiff: true` deliberately. This item's own slice-1 flash
run used `gitdiff` sixteen times, so a runner obeying the letter would have discarded a valid review.
`gitdiff` is now on the list with its reason; the cage file itself is correct and was not changed.
Named in `plan.md` under "Rides along", **and it must be named in the pull request body.** Slice 2,
the audit sitting, the audit re-run and the merge sitting added no ride-along of their own.

## Filing candidates for the founder - suggestions only, at close-out

The coordinator suggests filings at close-out and **only the founder creates items.**

1. **Six pre-existing vacuous-pass seams** - `c-membership-and-acknowledgment.test.ts` 106, 189, 364;
   `f-lifecycle-and-audit.test.ts` 69; `_integration.ts` two sites. They predate this change at
   `926d170`. **Audit ruling A2 closed four seams that THIS ITEM had added; these six are still open
   and still out of scope.**
2. **`_bind.ts` line 31 says "the 33 not-yet-landed ids"** - stale before this item.
3. **The developer seat accepts any account type at WRITE time.** `public.org_memberships` is guarded
   by a trigger that refuses a non-NGO grantee; `public.projects.assigned_volunteer_id` has no
   equivalent. Slice-2 ruling 1 repaired the READ side inside this item's own migration and
   deliberately did not add a trigger to a pre-existing table.
4. **A revoked access token may keep reading the Data API until it expires.** A product question about
   token lifetime and revocation reaching PostgREST. Not buildable without the blocked tier.
5. **`supabase/functions/_shared/edge.ts:8` claims no test imports it, and nobody has checked.**
   Residual 9. It is one measurement, and it is outside this item's declared claims.
6. **NEW, FROM THE MERGE SITTING - the reference guard cannot see a body edited after the green.**
   `ci.yml`'s `pull_request` trigger carries no `types:` list, so `edited` never fires it. Every merge
   in this project replaces the body at merge time, **after** the green, so the guard has never
   graded the body that actually lands. Section 4 makes the merging sitting check it by hand; a
   durable fix would add `types: [opened, synchronize, reopened, edited]`. **Machinery, one line, and
   it touches every item rather than this one.**

## Three measurement traps, carried forward

1. **PowerShell 5.1's `Get-Content -Raw` reads with the system ANSI codepage.** Use
   `[System.IO.File]::ReadAllText(path, [System.Text.Encoding]::UTF8)`, and compare files with
   `ReadAllBytes` plus `SequenceEqual` rather than by length.
2. **PowerShell 5.1 re-splits a here-string commit message containing double quotes** before passing it
   to `git.exe`; use `git commit -F <file>`. **And `Set-Content -Encoding utf8` writes a BYTE-ORDER
   MARK**, which `git commit -F` then puts at the front of the commit subject. Write the message file
   with `[System.IO.File]::WriteAllText(path, text, [System.Text.UTF8Encoding]::new($false))`. **In
   this worktree `.git` is a FILE, not a directory**, so a message file cannot be written to `.git/`.
   Use the scratchpad.
3. **A LINE NUMBER IN A RECORD FILE DECAYS AS FAST AS ONE IN A CODE COMMENT.** The audit re-run's own
   ruling cited three line numbers in `rulings-audit.md` and invalidated them within the hour by
   inserting a pointer block above them. **Cite the SECTION, the symbol or the variable - not the
   line** - in rulings and state files exactly as in code comments.
