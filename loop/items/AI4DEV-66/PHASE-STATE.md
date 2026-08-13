# PHASE-STATE - AI4DEV-66 (cross-org denial, no existence oracle), batch with AI4DEV-67 (assigned volunteer, admin, stranger)

**Phase: THE ITEM-WIDE AUDIT IS RULED AND ITS FIXES ARE LANDED. CODE CHANGED, SO THE ONCE-PER-ITEM
AUDIT RE-RUN IS NOW REQUIRED, at the new head, scoped to the FIX DELTA, with BOTH readers. The two
re-run prompt files are written and named in section 5.** The INFRASTRUCTURE BLOCK from every earlier
sitting still stands, unchanged, and it is restated in full in section 1.

Written by the AUDIT sitting, orchestrator on **opus @ max**, 2026-08-13.

## THE MODEL RULING FOR THIS RUN - CARRY IT FORWARD

The founder ruled (relayed 2026-08-12, restated to this sitting 2026-08-13) that **every
orchestrator sitting of this item runs as `orchestrator-opus` at opus/max effort** - plan, draft,
fix-and-goal, and the FIRST audit - not only the merge and audit-re-run sittings that are opus by
design. This is a deliberate founder choice for this run. It is **not** a sign that fable has no
credit. The conductor spawns every subsequent sitting of this item the same way, and every state
file repeats this paragraph.

## Attribution, derived from the branch

Branch `nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`, cut from
`origin/main` at `948d4f0`, merge-base with main `926d170` (re-measured this sitting).

`AI4PM-19 (auth and org membership)` > `AI4DEV-50 (auth root)` >
`AI4DEV-55 (tenant isolation and visibility)` > `AI4DEV-66 (cross-org denial, no existence oracle)`.

`AI4DEV-67 (assigned volunteer, admin, stranger)` rides this branch. It is the manifest's D5.L2,
blocked by D5.L1, which is why the two are batched. Slice 2 was that partner item's whole scope.

**Database slot 1**, reserved under this item, covers both.

Pull request **#57** is OPEN and its head is this branch
(`https://github.com/nirdrang/ai4good/pull/57`). Its body names `AI4DEV-66` once and no other item
id, so the reference guard has nothing to fail on.

**Head at the close of this sitting: reported by the sitting in its completion message.** The last
commit that touches CODE is `e91fc39`; every commit after it touches `loop/items/` only.

---

# 1. THE INFRASTRUCTURE BLOCK - READ THIS BEFORE ANY MERGE DECISION

**Database slot 1's local stack is DOWN. The integration tier has never run at any head of this
branch, so half of this item's verification evidence does not yet exist.** Nothing this sitting did
changes that, and this sitting made no attempt.

The founder relayed the cause: the gateway container cannot bind its API port (Windows has it
reserved) and the edge-function container fails to mount its entry file. **Only the founder can
clear this.**

The run was attempted **exactly once**, by the draft sitting for slice 1, and was refused before any
test executed. The runner's own words, from `artifacts/integration-attempt.txt`:

```
at:verify req-001 --tier integration — INFRASTRUCTURE: slot 1 could not be prepared: slot 1
reported no running stack (the stack reports stopped services: supabase_kong_ai4good-slot-1,
supabase_edge_runtime_ai4good-slot-1 — start them before running the suite), so nothing was
reset and nothing was run
```

Exit code 3. Zero tests. **No slot evidence line exists to carry, because the run never reached the
reset.**

**THE RULINGS ON IT, WHICH BIND EVERY SITTING AFTER THIS ONE:**

1. **This is a machine fault, not a red on this item's work.** It is the class the orchestrator
   contract calls "the check cannot be obtained right now". Nothing about it is debuggable here.
2. **NO REMEDIATION.** No container is to be started, stopped, rebuilt or reconfigured by any role
   inside this item; no port changed; no `supabase/config.toml` edit; no `AT_DB_SLOT` override; and
   **`supabase db reset` is never run, directly or through any wrapper** (gate-1 ruling 10).
3. **ONE ATTEMPT IS SPENT.** Do not re-run the integration tier speculatively. Re-run it when the
   founder says the stack is up, and not before.
4. **THIS IS A HARD MERGE BLOCKER.** The merge ruling must state both tiers' exact-match results,
   and the integration half does not exist. **A merge ruling written on the loop tier alone would be
   claiming a green that was never obtained.** The required continuous-integration check cannot
   supply the missing half either - it holds no database slot.
5. **SLICE 2 ADDED A THIRD REASON TO THE SAME BLOCKER, not a new one.** The second migration has
   never been applied anywhere. Nothing has parsed it, nothing has run it, and no policy in it has
   ever been evaluated.
6. **SLICE 2 ADDED A FOURTH, AND IT IS THE SAME BLOCKER AGAIN.** Slice 2's gate-2 ruling 2 REPLACED
   the catalog witness's grant query with `has_table_privilege`. The old query had never been sent to
   a database and neither has the new one.
7. **THIS SITTING ADDS A FIFTH, AND IT IS AGAIN THE SAME BLOCKER.** Audit ruling A6 widened that same
   catalogue query's `relkind` filter. **The widened predicate has never been executed either.** It
   is a better ungraded query replacing a worse ungraded one, which is the same posture and the same
   stated reason as the fourth.

**What the integration tier now owes, enumerated:** the plan's step 6 privilege-posture measurement
(never made - `artifacts/verify-first-answers.md` records that plainly and invents no result);
AT-001.21, .22, .23 and .40 green at integration tier; first proof that BOTH migrations apply and
that the three deployed functions serve at all; the grading of the fixture's policy mirror; step 16's
third done-criterion, "the conformance arm passes on the real list", which needs the live catalog;
the first execution of `publicSchemaCatalog`'s query in ANY form; **and now the first execution of
AT-001.40's four extended non-administrator controls in the integration body, which audit ruling A2
added and nothing has run.**

---

# 2. WHAT THIS SITTING DID

## The panel, and what each seat returned

Two readers, each blind to the other, over BOTH slices at once. **Neither seat was clean, so neither
is a veto over the other, and both verdicts are recorded.**

| seat | findings | checklist |
|---|---|---|
| `gpt-5.6-luna` via codex, effort max, `--sandbox read-only` | **6** | S1 PASS; R1-4 FAIL; F9 FAIL; every other box PASS |
| `opencode-go/deepseek-v4-flash`, agent `reviewer-flash` | **2** | S1 PASS; F9 FAIL; every other box PASS |

**Both seats independently passed scope box S1** - the 22-file path-set with nothing under `src/`.
**Both seats independently failed stated fact F9.** That is the panel's one convergence, and it is
ruled once, as ruling A3, under both claims quoted. I verified they were the same claim before
merging them: same file, same line, same two importers.

**Eight findings, SEVEN rulings, all ADOPTED.** All seven are in
`loop/items/AI4DEV-66/rulings-audit.md`, each with the reader's claim quoted exactly beside it.
**The rulings were committed and pushed as `1607e23` BEFORE the executor touched a file.**

| id | seat | disposition, in one line |
|---|---|---|
| A1 | 1, S1 | the public handler reads its target first - **adopted, and the RECORD changes rather than the code** |
| A2 | 1, S2 | AT-001.40's four non-administrator controls pass on an empty result - **adopted**, code fix in both bodies |
| A3 | **both** | `route-visibility.ts` says nothing imports it and two files do - **adopted**, ruled once under both claims |
| A4 | 1, S3 | `visibility.ts` calls its fail-closed branch unreachable and a test reaches it - **adopted**, **citation amended after the executor disputed it** |
| A5 | 1, S3 | `_contract.ts` says every `dataApiRead` caller passes a `Session` and one passes `null` - **adopted** |
| A6 | 1, S2 | the catalog witness cannot see a partitioned table - **adopted**, code fix |
| A7 | 2, low | an integration comment explains a correct assertion with a mechanism slice 2 removed - **adopted** |

## A1 IS THE ONE THAT NEEDED JUDGMENT, AND ITS REASONING BINDS THE MERGE RULING

The reader's stated fact was TRUE - `public-project-page/index.ts` reads the project at line 64 and
the organisation at line 73, so its target read is not last. **The checklist box it graded against
was the thing that was wrong.** My own box said the ordering constraint binds "each of the three edge
functions". Decision B's own sentence scopes the refusal constant to "every NON-PUBLIC read surface",
and the criterion writes the carve-out itself: AT-001.21's clause is "no existence oracle BEYOND
PUBLIC SURFACES".

**And the constraint is UNSATISFIABLE on that surface, which is what settles it rather than merely
excusing it.** Its second read is keyed on `project.org_id` - a column of the target row - so the
organisation cannot be read first at all. Obeying the letter would mean collapsing two reads into one
embedded select, which is a read-shape change to a live query **this branch cannot execute**.

I verified the other two surfaces obey, rather than assuming it: `organization-dashboard` makes four
reads with the target organisation last at line 111 (its own comment says so), and `project-workspace`
makes two with the target project last at line 72.

**`plan.md` now carries the scope sentence** at decision B, so the primary record no longer states the
constraint unqualified.

## THE EXECUTOR DISPUTED RULING A4, AND THE EXECUTOR WAS RIGHT

A4 named `shipped-visibility.selftest.ts:192` as the site that reaches the fail-closed branch. **It
does not.** `visibility.ts:176` returns on `platform_admin` before any scope is read, and line 192
passes exactly that viewer. The site that DOES reach the branch is the thirteen-value loop at lines
163-187, driving an assigned volunteer through the cast helper at lines 46-47.

**How I got it wrong:** I searched for `call(`, saw line 192 carrying the unrecognised scope
`'anything'`, and inferred the branch from the scope argument without reading the account type on the
same line. That is the same defect this audit corrected in four comments - a statement about code
that is plausible and not followed to the end.

**The ruling's conclusion stands; only the citation moved.** The correction is written into
`rulings-audit.md` beside the original sentence rather than over it, and pushed as `5e9f022` before
the executor applied it.

**THIS IS THE SECOND TIME THIS ITEM HAS CAUGHT A DEFECT IN THE ORCHESTRATOR'S OWN RULING** - slice-2
ruling 9 was the first. Both were caught by the executor before writing, not by a reviewer after.
**The merge ruling must name this: the dispute right is not ceremony, and it has now paid twice.**
The dispute cost one commit rather than a sitting, because the executor held one file and completed
the other five rulings.

## What landed

**Six code commits, `b5c3df2` through `e91fc39`, one per ruling. SIX code files.**

- `supabase/functions/_shared/route-visibility.ts` - A3, names both test importers, states no product
  code imports it, keeps the router half.
- `supabase/functions/_shared/visibility.ts` - A4, the corrected citation; the sentence about what the
  branch prevents is unchanged word for word.
- `tests/at/suites/req-001/_contract.ts` - A5.
- `tests/at/suites/req-001/_integration.ts` - **A2 and A7 both**.
- `tests/at/suites/req-001/_live.ts` - A6, `c.relkind in ('r', 'p')` plus the comment naming what is
  deliberately out and why.
- `tests/at/suites/req-001/d-tenant-isolation.test.ts` - A2's loop body.

## What I verified MYSELF, independently of the executor's report

- **I read every hunk of the sitting's diff against the ruling that dictated it** - all six. Each
  implements its ruling as ruled, and A2 adds eight positive assertions across the two bodies, four
  per body, each binding the mapped list to a local before asserting both directions.
- **The scope holds, re-measured directly:** the branch touches **22 files** in the code territory and
  **ZERO under `src/`**. The fix delta added no file to that list - it edited six that were already
  in it.
- **`tests/at/expected/req-001.json` is NOT in the fix delta.** No declaration was edited to fit a
  result.
- **No migration is in the fix delta.** Neither `.sql` file moved.
- The executor's four verifications at the final head: `bun run typecheck` exit 0; `bun run at:check
  req-001` exit 0, 37 P0 ids in bijection; `bun run at:verify req-001 --tier loop --expect` exit 0,
  **26 green / 11 red, EXACT MATCH**; `bun run at:selftest` exit 0, 16 files / 370 tests. **The test
  count did not move, which is correct: A2 adds assertions to existing tests, not new tests.**

**THE INTEGRATION TIER WAS NOT RUN AND THIS GREEN CLAIMS THE LOOP TIER ONLY.**

---

# 3. CAPS USED BY THIS SITTING

- **Executor invocations: 2 of 3.** One build pass for A2, A3, A5, A6 and A7 with zero corrective
  iterations; one further pass for A4 after I amended it. Neither was rework - the second existed
  because I was wrong, not because the executor was.
- **Mechanical invocations: 1** - the re-run prompt assembly. It rules on nothing and wrote no prose.
- Integration-tier attempts: **0 this sitting.** The single attempt from slice 1's draft sitting stays
  spent.
- **Audit re-run: STILL UNUSED. The next sitting spends it.**
- Continuous-integration flake re-run: **unused.**

**The running total across the item:** slice 1's draft sitting used 2 of 3; slice 1's fix-and-goal
sitting used 1 of 3; slice 2's draft sitting used 1 of 3; slice 2's fix-and-goal sitting used 2 of 3;
this sitting used 2 of 3. The terminated resume-sitting's invocation was ruled not-chargeable by that
sitting and no sitting since has reopened that ruling. **Caps are PER SITTING** - the next sitting
opens with three of its own.

---

# 4. THE RULING ON WHETHER A RE-RUN IS NEEDED - IT IS

**CODE CHANGED, SO THE AUDIT RE-RUNS. This is not a judgment call and I did not treat it as one.**

Two of the seven rulings changed executable code rather than prose:

- **A2** added eight assertions to AT-001.40 across two bodies. An assertion is executable code, and
  a wrongly-written one is a false green - which is the exact failure class this item exists to
  remove.
- **A6** changed a SQL predicate that feeds the conformance rule.

**Had the sitting been comment-only, no re-run would have been required**, because the audit's subject
is the code's behaviour and a corrected sentence changes none of it. That case did not occur, and I
record the reasoning so a later sitting does not have to guess which rule was applied.

---

# 5. WHAT COMPLETES THE NEXT PHASE - THE AUDIT RE-RUN

**The next phase is the AUDIT RE-RUN. It is the WHOLE PANEL - both readers, never one seat - and its
change-set is the FIX DELTA, not the whole range again.**

The two prompt files are written and ready to hand out AS WRITTEN:

- `loop/items/AI4DEV-66/audit-rerun-luna-prompt.txt`
- `loop/items/AI4DEV-66/audit-rerun-flash-prompt.txt`

They are byte-identical by design. The assembly and its measured verification are in this sitting's
completion report: assembled per `.claude/skills/work/reviewers.md` as its `## Your contract` section
plus the AUDIT review section with the whole `**Pins**` BLOCK removed, plus this item's additions
(`loop/items/AI4DEV-66/audit-rerun-additions.md`, kept as a separate file so the additions can be read
without the contract around them). **Neither file can tell its reader that a second reader exists.**

## THE FIX DELTA, NAMED

**The head the first audit read: `1e058d0`.** Every commit after `42d678a` touched `loop/items/` only,
so the code state the readers saw is fixed whichever of those commits their `HEAD` named.

**The head the fixes produced: `e91fc39`.**

The re-run's change-set instrument, as written into both prompts:

```
git diff 1e058d0...HEAD -- src supabase tests .github package.json bun.lockb tsconfig.json vitest.config.ts
```

**SIX files**, every one named in a box: `route-visibility.ts`, `visibility.ts`, `_contract.ts`,
`_integration.ts`, `_live.ts`, `d-tenant-isolation.test.ts`.

**ONE BOX RE-CHECKS IN FULL - the scope box** - against `926d170...HEAD`, because a fix can add a
stray file the narrow delta would hide. It did not; the list is still 22 files with nothing under
`src/`.

## THE REBUILT CLAIM CHECKLIST

**It is rebuilt, not carried over.** The boxes graded at the first head are not repeated. The new
boxes are the seven rulings this sitting adopted, by id, plus six new stated facts the fixes created,
plus a scope box. The prompts also instruct each reader to grade any claim the delta can REACH even
where the file is byte-identical.

**TWO BOXES ARE FLAGGED FOR THE HARDEST READING, and the reason is written into the prompt:**

1. **A1-N** - the NARROWED ordering claim. No code changed for it; the CLAIM changed. The prompt says
   so openly, states the narrowing in four clauses, and invites the reader to attack it - because a
   checklist that hid a narrowing would let a weakened claim pass as an unchanged one. **If a reader
   says the narrowing is wrong, that is a serious finding and the next sitting must treat it as one.**
2. **A4** - the corrected citation. The prompt tells the reader that an earlier version of that
   comment named a line which returns before the scope is ever read, and asks it to trace the viewer's
   account type through every earlier branch rather than only the scope argument.

## What the sitting after the re-run must know

1. **Rule findings from BOTH readers together.** A clean seat beside a seat with findings is evidence,
   never a veto, and its clean verdict is recorded among the dispositions.
2. **THE RE-RUN IS THE LAST ONE. It is once per item.** A finding from it that needs a code fix is
   ruled and fixed, and a fix that would need a SECOND re-run is scope growth - escalate it, never
   skip the audit and never quietly spend a second re-run.
3. **If the re-run is clean, the next phase is CI on that head, and the MERGE sitting absorbs the
   clean panel's verdicts into its dispositions.**
4. **Three integration-tier done-criteria are BLOCKED, not met, and no ruling may quietly convert
   them.** Step 11's migration proof (the slot evidence line, which does not exist), step 16's third
   criterion, and step 17's both-tiers exact match. The loop half of step 17 IS met and exact.
5. **`main` had moved to `160042c` as of slice 2's draft sitting.** The branch has not taken main in.
   **The merge sitting decides whether to merge main in; no sitting before it should.**
6. **The sitting sequence for this item is now:** plan → draft (slice 1) → fix and goal (slice 1) →
   draft (slice 2) → fix and goal (slice 2) → audit → **audit re-run** → merge.

---

# 6. STANDING ITEMS THE MERGE RULING MUST CARRY

## The pull request body, for the mechanical who writes it at merge

The pull request closes **AI4DEV-66** through its own branch link. **The partner item closes through
the one sanctioned batch line**, per `CLAUDE.md` and the reference guard in `.github/workflows/ci.yml`:

- one line, of exactly the shape `Closes AI4DEV-67`, alone on its line, nothing else on it;
- at most one such line in the whole body;
- **it is added by the MERGE ruling's mechanical, not before**;
- **and gate-1 ruling 3 makes it CONDITIONAL**: the line is added **only if** the founder has answered
  open question 1 - by ratifying a D5 wiring leaf for the screens the way D2 has one, or by ruling
  AT-001.24's browser half out of that item. **With no founder answer the line is OMITTED**, the
  partner item stays open, and the merge ruling states why.
- No other item id may appear anywhere in the title or body. Name other items in words.
- The body lists the ride-along under "rides along".

## The two open questions for the founder - still unanswered

1. **AT-001.24 asks for a browser behaviour this pull request is forbidden to build.** CI fails any
   change touching both `src/` and this change's territory, there are no screens to guard, and D5.L2
   has no wiring leaf the way D2 does. **Proposed:** land the decision and the API-level denials here,
   declare the id capability-pending at integration tier, and file a D5 wiring leaf. The founder may
   instead prefer to hold AT-001.24 out of that item entirely. Slice 2 built exactly what that
   proposal describes.
2. **Most of the data the criteria enumerate does not exist.** Drafts, ledger, files, thread and tasks
   belong to requirements that have not landed. **Proposed:** isolate every kind that does exist, land
   the catalog conformance arm so a later requirement's table cannot arrive unisolated, and name the
   absent kinds in the merge ruling. The arm is built and has never seen a real catalog.

Neither blocked either code gate, nor the audit. Both must be answered before the partner item can
close.

## Residuals for the merge ruling

1. **Timing is not defended.** The claim is about response content and status, never response time.
2. **AT-001.21 and AT-001.22 are `ui`-tagged, not UI-proved.** No screen exists.
3. **Only the dashboard kind of tenant data exists.** Drafts, ledger, files and thread do not.
4. **The public project surface reveals that a project exists**, deliberately.
5. **RETIRED BY SLICE 2.** `visibility.ts`'s platform-admin branch now has a unit oracle AND an
   acceptance test driving it through a surface at both tiers.
6. **RETIRED BY SLICE 2.** `publicSchemaCatalog` now has a consumer.
7. **The read-fault arm is loop tier only.** No fault is injected into a real database. **AND it
   covers the two AUTHENTICATED surfaces only** - it cannot cover the public surface, because its
   comparison needs an existing-but-FOREIGN target and nothing is foreign on a public surface. Audit
   ruling A1 states this rather than leaving it to be rediscovered.
8. **The loop-tier Data API arms grade the fixture's MIRROR of the policy set, not the migrations.**
   Item claim 1 - "a green grades shipped code rather than a copy of it" - holds for the edge-surface
   arms and NOT for the probe arms at loop tier.
9. **The `readRows` fix is proved by reading, not by a test.** No test program imports `edge.ts`.
   **`edge.ts:8` states this in the code, and THAT STATEMENT IS UNVERIFIED** - the executor found it
   while re-measuring audit ruling A3, correctly judged it a different module making a different
   claim, reported it and did not touch it. I confirmed that judgment. **No sitting of this item has
   measured it, and the merge ruling says so rather than implying it was checked.**
10. **The four Data API positive controls are a BRACKET, not a proof.**
11. **CORRECTED BY AUDIT RULING A3 - this residual was FALSE as written, in two directions, and both
    readers caught half of it.** **TWO TEST FILES import the route registry** -
    `tests/at/suites/req-001/_route-scan.ts` and `tests/at/harness/shipped-route-visibility.selftest.ts`
    - and **NO PRODUCT CODE imports it**. **A ROUTER EXISTS** (`src/router.tsx`) and consults nothing.
    What the registry buys is unchanged: a declaration in product code and a test that fails when a
    route arrives undeclared. **It is not a redirect that runs.**
12. **The catalog conformance arm does not prove a declared predicate is CORRECT.** It proves a table
    is declared, reachable only as declared, row-level security is on, the rightful tenant is admitted,
    and no policy is literally `true`. **A semantically open predicate naming an approved identifier
    still satisfies it** - `using (org_id = org_id)`, and the reviewer's sharper example,
    `using (id is not null)` on `organizations`. **This was attacked at the code gate and dismissed
    with reasons** (slice-2 ruling 4).
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
    a silent absence - and it has never been executed.
17. **The account-type conjunct on the assigned-developer policy is a READ-side repair of a WRITE-side
    gap.** The developer seat still accepts any account type at write time.
18. **NEW, FROM AUDIT RULING A1 - the public project surface's OUTAGE path distinguishes an existing
    project from an absent one.** An organisation-read fault answers 502 where an absent project
    answers 404. **It sits INSIDE residual 4 rather than beside it**, and the reason is measured: on
    the normal path this surface answers 200 carrying the project's name AND its organisation's name
    for every project that exists, and 404 for one that does not. The outage path discloses strictly
    less about the same rows. **No project is hidden by this surface** - the handler applies no
    visibility filter - so there is no project whose existence the 200 answer conceals and the 502
    would reveal. One sub-case, named rather than left to be found: a project whose ORGANISATION row
    is missing answers 404, and under an organisation-read fault answers 502; that distinguishes a
    data-integrity state from a fault, not one tenant from another.
19. **NEW, FROM AUDIT RULING A6 - the widened catalogue predicate has never been executed.** Section
    1, blocker reason 7.
20. **NEW - AT-001.40's four extended non-administrator controls have never run at integration tier.**
    Audit ruling A2 wrote them into the `at00140` integration body and nothing has graded that body.
21. **NEW, AND IT IS ABOUT THIS PROCESS RATHER THAN THE PRODUCT - the orchestrator's own rulings have
    been wrong twice on this item, and the executor caught both before writing.** Slice-2 ruling 9
    (an exhaustive fix list claimed on a two-phrase search) and audit ruling A4 (a citation naming a
    line that returns before the scope is read). **The merge ruling names this as evidence that the
    dispute right pays**, not as an apology.

## Rides along

**One line in `.claude/agents/reviewer-runner.md`** (slice-1 gate-2 ruling 8, commit `50d0daa`). That
file told the runner to report any tool outside `read`, `glob` and `grep` as an INVALID RUN, while
`.opencode/agent/reviewer-flash.md` grants `gitdiff: true` deliberately. `gitdiff` is now on the list
with its reason. Named in `plan.md` under "Rides along", and it must be named in the pull request
body. Slice 2 and this sitting added no ride-along of their own.

## Filing candidates for the founder - suggestions only, at close-out

The coordinator suggests filings at close-out and **only the founder creates items.**

1. **Six pre-existing vacuous-pass seams** - `c-membership-and-acknowledgment.test.ts` 106, 189, 364;
   `f-lifecycle-and-audit.test.ts` 69; `_integration.ts` two sites. They predate this change at
   `926d170`. **Audit ruling A2 closed four seams that THIS ITEM had added; these six are still
   open and still out of scope.**
2. **`_bind.ts` line 31 says "the 33 not-yet-landed ids"** - stale before this item.
3. **The developer seat accepts any account type at WRITE time.** `public.org_memberships` is guarded
   by a trigger that refuses a non-NGO grantee; `public.projects.assigned_volunteer_id` has no
   equivalent. Slice-2 ruling 1 repaired the READ side inside this item's own migration and
   deliberately did not add a trigger to a pre-existing table.
4. **A revoked access token may keep reading the Data API until it expires.** A product question about
   token lifetime and revocation reaching PostgREST. Not buildable without the blocked tier.
5. **NEW - `supabase/functions/_shared/edge.ts:8` claims no test imports it, and nobody has checked.**
   Residual 9. It is one measurement, and it is outside this item's declared claims.

## Two measurement traps, carried forward

1. **PowerShell 5.1's `Get-Content -Raw` reads with the system ANSI codepage.** Use
   `[System.IO.File]::ReadAllText(path, [System.Text.Encoding]::UTF8)`, and compare files with
   `ReadAllBytes` plus `SequenceEqual` rather than by length.
2. **PowerShell 5.1 re-splits a here-string commit message containing double quotes** before passing it
   to `git.exe`; use `git commit -F <file>`. **And `Set-Content -Encoding utf8` writes a BYTE-ORDER
   MARK**, which `git commit -F` then puts at the front of the commit subject. Write the message file
   with `[System.IO.File]::WriteAllText(path, text, [System.Text.UTF8Encoding]::new($false))`.
   **THIRD TRAP, NEW THIS SITTING: in this worktree `.git` is a FILE, not a directory**, so a message
   file cannot be written to `.git/`. Use the scratchpad.
