# PHASE-STATE - AI4DEV-66 (cross-org denial, no existence oracle), batch with AI4DEV-67 (assigned volunteer, admin, stranger)

**Phase: THE AUDIT IS CLOSED. THE ONCE-PER-ITEM RE-RUN IS SPENT AND THERE IS NO SECOND ONE. Both
readers' re-run findings are ruled and their fixes are landed. NOTHING IS LEFT TO RULE BEFORE
CONTINUOUS INTEGRATION.** The next phase is the required check on this final head, then the MERGE
sitting. The INFRASTRUCTURE BLOCK from every earlier sitting still stands, unchanged, and it is
restated in full in section 1. **It is a HARD MERGE BLOCKER and the merge sitting may not merge
around it.**

Written by the AUDIT RE-RUN sitting, orchestrator on **opus @ max**, 2026-08-13.

## THE MODEL RULING FOR THIS RUN - CARRY IT FORWARD

The founder ruled (relayed 2026-08-12, restated to this sitting 2026-08-13) that **every
orchestrator sitting of this item runs as `orchestrator-opus` at opus/max effort** - plan, draft,
fix-and-goal, and the FIRST audit - not only the merge and audit-re-run sittings that are opus by
design. This is a deliberate founder choice for this run. It is **not** a sign that fable has no
credit. The conductor spawns every subsequent sitting of this item the same way, and every state
file repeats this paragraph.

**This sitting was ALSO opus by design, independently of that ruling** - the orchestrator contract
makes the audit re-run an opus sitting, because the rebuilt checklist and the delta scope fence its
judgment. **The MERGE sitting is opus by design as well.** Both reasons hold at once for both, and
neither is a fallback for missing credit.

## Attribution, derived from the branch

Branch `nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`, cut from
`origin/main` at `948d4f0`, merge-base with main `926d170`.

`AI4PM-19 (auth and org membership)` > `AI4DEV-50 (auth root)` >
`AI4DEV-55 (tenant isolation and visibility)` > `AI4DEV-66 (cross-org denial, no existence oracle)`.

`AI4DEV-67 (assigned volunteer, admin, stranger)` rides this branch. It is the manifest's D5.L2,
blocked by D5.L1, which is why the two are batched. Slice 2 was that partner item's whole scope.

**Database slot 1**, reserved under this item, covers both.

Pull request **#57** is OPEN and its head is this branch
(`https://github.com/nirdrang/ai4good/pull/57`). Its body names `AI4DEV-66` once and no other item
id, so the reference guard has nothing to fail on.

## THE HEADS THE MERGE SITTING NEEDS

| what | commit |
|---|---|
| the head the FIRST audit panel read | `1e058d0` |
| the head the audit's fixes produced - the re-run's baseline | `e91fc39` |
| the head the RE-RUN panel read (code identical to `e91fc39`) | `116bbab` |
| this sitting's rulings and both readers' evidence | `7999496` |
| **THE LAST COMMIT THAT TOUCHES CODE - the whole item's final code head** | **`5da2e22`** |
| the final head | the commit carrying THIS file - the sitting reports it in its completion message |

**Every commit after `5da2e22` touches `loop/items/` only.** A file cannot name the commit that
carries it, so this file does not guess; the conductor takes the final head from this sitting's
completion message and arms the check on it.

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
7. **THE AUDIT SITTING ADDED A FIFTH, AND IT IS AGAIN THE SAME BLOCKER.** Audit ruling A6 widened that
   same catalogue query's `relkind` filter. **The widened predicate has never been executed either.**
   It is a better ungraded query replacing a worse ungraded one, which is the same posture and the
   same stated reason as the fourth.
8. **THIS SITTING ADDS NO SIXTH REASON, AND THAT IS ITSELF EVIDENCE.** Neither re-run ruling touches
   executable code. Nothing new is owed to the integration tier by this sitting.

**What the integration tier owes, enumerated:** the plan's step 6 privilege-posture measurement
(never made - `artifacts/verify-first-answers.md` records that plainly and invents no result);
AT-001.21, .22, .23 and .40 green at integration tier; first proof that BOTH migrations apply and
that the three deployed functions serve at all; the grading of the fixture's policy mirror; step 16's
third done-criterion, "the conformance arm passes on the real list", which needs the live catalog;
the first execution of `publicSchemaCatalog`'s query in ANY form; and the first execution of
AT-001.40's four extended non-administrator controls in the integration body, which audit ruling A2
added and nothing has run.

---

# 2. WHAT THIS SITTING DID

## The re-run panel, and what each seat returned

Two readers, each blind to the other, over the SAME fix delta - six files,
`git diff 1e058d0...HEAD` in the code territory - with the scope box re-checked over the full range.

| seat | findings | verdict |
|---|---|---|
| `gpt-5.6-luna` via codex, effort max, `--sandbox read-only` | **2** | S1-R PASS; A1-N FAIL; A5 FAIL; A2, A3, A4, A6, A7 and FN1-FN6 all PASS |
| `opencode-go/deepseek-v4-flash`, `--variant max`, agent `reviewer-flash` | **1** | one finding, severity LOW |

**Neither seat was clean, so neither is a veto over the other, and both verdicts are recorded.**

**Three findings, TWO rulings, both ADOPTED.** Seat 1's finding [2] and seat 2's finding [1] are one
defect - same file, same sentence, same wrong line, same right one - so they are ruled once, under
both claims quoted. **That is the panel's SECOND convergence on this item**; the first was stated fact
F9 (ruling A3). Both rulings are in `loop/items/AI4DEV-66/rulings-audit-rerun.md`, each with the
reader's claim quoted exactly beside it. **The rulings were committed and pushed as `7999496` BEFORE
the executor touched a file.**

| id | seat | disposition, in one line |
|---|---|---|
| R1 | 1 | the public surface's ordering exemption was argued from an impossibility that is not one - **adopted, and the RECORD changes rather than the code** |
| R2 | **both** | the corrected contract sentence cites a line its own sibling fix moved - **adopted**, ruled once under both claims, one comment in one file |

## R1 IS THE ONE THAT NEEDED JUDGMENT, AND ITS RESULT BINDS THE MERGE RULING

**The reader was right and the proof was already inside my own earlier ruling.** Audit ruling A1
called the target-row-last ordering clause **UNSATISFIABLE** on the public project surface. Three
paragraphs below, the same ruling said that collapsing the two reads into one embedded select would
satisfy it. **A clause that a named change would meet is not unsatisfiable.** The word was wrong and
the sentence disproving it sat next to it.

**What survives, and it is the half that was always load-bearing.** The two reads AS WRITTEN cannot
be reordered: the second is keyed on `project.org_id`, a column of the target row, so the
organisation's identifier does not exist until the project row is in hand. **That is a statement
about reordering. It is not a statement that the clause cannot be met.** It can be met, by collapsing
the two reads into one - and with a single read there is no earlier read to order and the target read
is trivially last.

**Two collapsed shapes exist**, and both are expressible because `public.projects.org_id` is
`references public.organizations (id)`
(`20260811130000_single_seat_org_and_single_developer_projects.sql:59`) and because `readRows` takes a
raw PostgREST path: an embedded select from `projects`, or the reader's reverse relationship query on
`organizations` keyed by the request's project id.

**SO THE EXEMPTION NOW RESTS ON ONE REASON ONLY: the surface makes no access decision.** That is what
the shipped code's own header states, and nothing more - so **no code changed for R1.** I re-verified
that single remaining reason first-hand rather than inheriting it: `public-project-page/index.ts`
calls no `resolveCaller`, reads no `Authorization` header, and branches on no caller property, and its
wrapper `edgeHandler` (`_shared/edge.ts:96-109`) branches only on `request.method === 'OPTIONS'`.

**THE CORRECTION REMOVES A CLAIM RATHER THAN ADDING ONE**, which is why it owes no runtime evidence.
Whether PostgREST would actually serve either collapsed shape is **UNMEASURED**, and the corrected
record says so instead of asserting it. I **rejected** the reader's sub-request to verify the
relationship query against the database, with the reason written down: the branch does not issue that
query, and the tier is down.

**Where the correction landed:** `plan.md` corrected in place at decision B; a pointer block at the
head of `rulings-audit.md` section A1 with **the original wording left standing**; and this file. **The
three spent prompt files are NOT edited** - they are the record of what was ASKED, and a spent prompt
rewritten afterwards destroys the evidence that box A1-N was graded FAIL for a reason.

## R2, AND THE MECHANISM THAT MADE IT

Ruling A2's fix added assertions ABOVE the line ruling A5's comment cites, in the same series of
commits. **A5's citation was true when it was dictated and false by the time the series landed.** Seat
2 called it "stale by construction" and traced the exact cause; seat 1 found the same defect
independently.

**The remedy names the probe, not the line** - `AT-001.24`'s `neverSignedIn` probe in
`d-tenant-isolation.test.ts` - and says in place why no line number is there. A renumber would have
been right today and would have decayed on the next insertion, which is the defect repeating rather
than closing.

## THE EXECUTOR DID NOT DISPUTE, AND IT WENT PAST WHAT I ASKED

It confirmed all three pre-write checks first-hand. On the exhaustiveness check it did not stop at
the literal `null`: it listed the FIRST ARGUMENT of every `dataApiRead` call in `tests/` - 41 call
sites across two files - to catch a second site passing a null-valued variable. The arguments are
`sessionA`, `sessionB`, `unassigned`, `volunteerSession`, `admin`, `signedOut`, and one `null`. **The
sentence's substance is confirmed by enumeration, not by a phrase search** - the standing instruction
from the first audit, applied without being told.

## THE EXECUTOR REPORTED A FOURTH STALE CITATION; I REJECTED IT AND THE CAUSE WAS MINE

The executor reported `rulings-audit.md:380` as a fourth stale citation beside the three my ruling
named. **There is no fourth. There are exactly three, all inside section A5**, and line 380 IS the
line my ruling called 366 - **shifted down by the 14-line pointer block I inserted earlier in this
same sitting** (`git diff --numstat` reports `14 0`). Its arithmetic was sound; its premise, that my
numbers described the file it was reading, was not.

**But the defect it tripped over is real and it is mine.** I wrote a ruling forbidding decaying
line-number citations and cited three decaying line numbers inside it, and the decay happened within
the hour. Section 4 item 2 and R2's exhaustiveness paragraph now name **section A5** instead. **The
report was correct to send and the executor is not marked down for it** - an executor that only
reported what turned out to be true would be filtering its findings through a guess about my
reaction, and this item's record would be worse in three places if it had.

## What landed

**One code commit, `5da2e22`. ONE code file: `tests/at/suites/req-001/_contract.ts`.** The change is
8 insertions and 2 deletions, entirely inside a `/** … */` block above an interface member.

## What I verified MYSELF, independently of the executor's report

- **I read the whole diff.** One file, comment-only, matching the dictated text character for
  character including the em dash.
- **The stale citation, both ends:** `_contract.ts:870` cited `:810`; line 810 is
  `expect(workspace.ok, 'a caller whose session had ended read a project workspace').toBe(false);`;
  the real call is line 834, `const neverSignedIn = await sut.dataApiRead(null, …)`.
- **The exhaustiveness of `dataApiRead(null`:** exactly one call site in the whole tree.
- **The foreign key R1 turns on:** read out of the migration, with its line.
- **The cage held on both seats.** `audit-rerun-flash.identity.md` records the pin matched on all 29
  assistant messages and that all 45 tool-call events were `gitdiff`, `grep`, `read` or `glob` - no
  `write`, `edit`, `patch`, `bash`, `task` or `webfetch`. Seat 1 ran under `--sandbox read-only` and
  states in its own output: "No tests or database queries were executed."
- **`audit-rerun-luna.stdout.log` is excluded from the commit and nothing is lost:** `diff` against
  the raw file reports one difference, a missing trailing newline. `audit-rerun-luna.pid` is scratch.
- The executor's four verifications at the final code head: `bun run typecheck` exit 0; `bun run
  at:check req-001` exit 0, 37 P0 ids in bijection; `bun run at:verify req-001 --tier loop --expect`
  exit 0, **26 green / 11 red / 0 missing, EXACT MATCH**; `bun run at:selftest` exit 0, 16 files /
  370 tests. **Every number is identical to the previous head, which is what a comment-only change
  must produce.**

**THE INTEGRATION TIER WAS NOT RUN AND THIS GREEN CLAIMS THE LOOP TIER ONLY.**

---

# 3. WHY NO SECOND AUDIT RE-RUN IS OWED

**The re-run is once per item and this item has spent it.** The rule that decides what follows is the
one the first audit sitting wrote, and I applied it unchanged rather than inventing one that suits me:

> Had the sitting been comment-only, no re-run would have been required, because the audit's subject
> is the code's behaviour and a corrected sentence changes none of it.

**This sitting is comment-only and thinner than that.** R1 changed no file under `supabase/`,
`tests/` or `src/` at all. R2 changed one comment. **No assertion, predicate or declaration moved**,
and the loop-tier exact match is unchanged, re-measured rather than assumed.

**And R1 adds no new claim for an auditor to grade - it deletes one.** A third reading would find a
strictly weaker statement resting on a clause both seats already graded PASS, plus one fact read out
of a migration and quoted with its line. **I state it plainly, as the contract requires: I believe
these two fixes are complete without another audit read.**

---

# 4. CAPS

**This sitting:** executor invocations **1 of 3**; mechanical invocations **0**; integration-tier
attempts **0**; **audit re-runs 1 of 1, SPENT**; continuous-integration flake re-run **unused**, and
it belongs to the merge sitting.

**Across the item:** slice 1's draft sitting used 2 of 3; slice 1's fix-and-goal sitting used 1 of 3;
slice 2's draft sitting used 1 of 3; slice 2's fix-and-goal sitting used 2 of 3; the audit sitting
used 2 of 3; this sitting used 1 of 3. The terminated resume-sitting's invocation was ruled
not-chargeable by that sitting and no sitting since has reopened that ruling. **Caps are PER SITTING**
- the merge sitting opens with three of its own.

---

# 5. WHAT COMPLETES THE NEXT PHASE

**The next phase is the required continuous-integration check on the final head, then the MERGE
sitting. THERE IS NOTHING LEFT TO RULE BEFORE THE CHECK.**

**The conductor holds the check's wait**, per its own contract, and spawns the merge sitting once the
check reaches a terminal state. No orchestrator sitting spans that wait.

## The merge sitting's own instructions

1. **Confirm the required check GREEN on the exact final head**, and record both the run and the
   commit. The green is the only merge licence.
2. **If the check is RED, classify BEFORE reacting**, from the evidence the conductor attaches - does
   a run exist, was a runner assigned, how many steps ran, the elapsed span, and what GitHub's status
   page says about Actions. The four classes are infrastructure or flake (one re-run of the check, no
   new commit); broken by this change (rule it, one round through the executor, push, then END the
   sitting - **a fix here would need an audit at the new head and the re-run is SPENT, so a fix that
   needs a second re-run is SCOPE GROWTH and is escalated, never quietly spent**); pre-existing on
   main (prove it against main; it goes to the founder); and **the check cannot be obtained**.
3. **On "the check cannot be obtained" - a run that gets no runner and executes no step, twice, or a
   run never created at all - THERE IS NO REMEDIATION.** Wait, re-trigger, change nothing: not the
   workflow, not the timeout, not the infrastructure, and file no fixes. Name both run ids and the
   elapsed-to-timeout evidence, and report the wait. **Read `cancelled` carefully**: a job that never
   got a runner and is then killed by its own `timeout-minutes` reports `cancelled`, which looks
   deliberate and is not.
4. **Local verify green while the check is red gets TWO PUSHES, then escalation with the evidence.**
5. **`main` had moved to `160042c` as of slice 2's draft sitting and the branch has not taken main
   in. The merge sitting decides whether to merge main in; no sitting before it should.**
6. **The merge sitting does NOT absorb an audit wait.** The re-run had findings, so this sitting ruled
   them. Its dispositions carry this sitting's two rulings and both seats' verdicts.

## AND THE MERGE ITSELF IS BLOCKED - THIS IS THE MOST IMPORTANT LINE IN THIS FILE

**Section 1 ruling 4 is a HARD MERGE BLOCKER and it is still standing.** The merge ruling must state
**both tiers' exact-match results**. The loop tier is exact and re-measured at the final code head.
**The integration tier has NEVER RUN, so there is no second half to state, and there is no slot
evidence line to carry because the one attempt never reached the reset.**

**So a green required check does NOT unblock this merge.** The check holds no database slot and cannot
supply the missing half. **The merge sitting writes the ruling stating both halves honestly - one
exact, one absent - and then the merge decision goes to the FOUNDER**, who either clears the stack so
the tier can run, or explicitly accepts loop-only evidence for this item. **The merge sitting states
that choice; it does not make it alone, and it does not merge on the loop tier alone.**

**AND THE MERGE COMMAND IS NEVER RUN BY THE ORCHESTRATOR.** A mechanical publishes the pull-request
body as handed, posts the ruling as handed, and executes the merge; the orchestrator verifies the
merged state afterwards. **The merge tail has EXACTLY ONE executor - the mechanical that sitting
spawns.** If the mechanical finds any tail step already done, that is another actor crossing the
boundary: stop there, verify the end state independently, and record the crossing as a defect. **If
the mechanical reports a permission refusal, that is a STOP** - report it upward with the exact denial
text and end the sitting. Never run the command instead, and never find another actor who can.

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
  AT-001.24's browser half out of that item. **AS OF THE CLOSE OF THIS SITTING THE FOUNDER HAS NOT
  ANSWERED. With no founder answer the line is OMITTED**, the partner item stays open, and the merge
  ruling states why.
- No other item id may appear anywhere in the title or body. Name other items in words.
- The body lists the ride-along under "rides along".

## The two open questions for the founder - BOTH STILL UNANSWERED at this sitting's close

1. **AT-001.24 asks for a browser behaviour this pull request is forbidden to build.** The check fails
   any change touching both `src/` and this change's territory, there are no screens to guard, and
   D5.L2 has no wiring leaf the way D2 does. **Proposed:** land the decision and the API-level denials
   here, declare the id capability-pending at integration tier, and file a D5 wiring leaf. The founder
   may instead prefer to hold AT-001.24 out of that item entirely. Slice 2 built exactly what that
   proposal describes. **This question gates the sanctioned closes-line above.**
2. **Most of the data the criteria enumerate does not exist.** Drafts, ledger, files, thread and tasks
   belong to requirements that have not landed. **Proposed:** isolate every kind that does exist, land
   the catalog conformance arm so a later requirement's table cannot arrive unisolated, and name the
   absent kinds in the merge ruling. The arm is built and has never seen a real catalog.

Neither blocked either code gate, nor either audit. Both must be answered before the partner item can
close.

**A THIRD QUESTION IS NOW UNAVOIDABLE AND IT IS THE MERGE ITSELF:** the integration tier has never
run, and section 1 ruling 4 forbids a merge ruling written on the loop tier alone. **The founder
either clears the database stack or explicitly accepts loop-only evidence for this item.**

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
    **This was attacked at the code gate and dismissed with reasons** (slice-2 ruling 4).
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
18. **FROM AUDIT RULING A1 - the public project surface's OUTAGE path distinguishes an existing
    project from an absent one.** An organisation-read fault answers 502 where an absent project
    answers 404. **It sits INSIDE residual 4 rather than beside it**, and the reason is measured: on
    the normal path this surface answers 200 carrying the project's name AND its organisation's name
    for every project that exists, and 404 for one that does not. The outage path discloses strictly
    less about the same rows. **No project is hidden by this surface.** One sub-case, named rather than
    left to be found: a project whose ORGANISATION row is missing answers 404, and under an
    organisation-read fault answers 502; that distinguishes a data-integrity state from a fault, not
    one tenant from another.
19. **FROM AUDIT RULING A6 - the widened catalogue predicate has never been executed.** Section 1,
    blocker reason 7.
20. **AT-001.40's four extended non-administrator controls have never run at integration tier.** Audit
    ruling A2 wrote them into the `at00140` integration body and nothing has graded that body.
21. **ABOUT THIS PROCESS RATHER THAN THE PRODUCT - the orchestrator's own rulings have now been wrong
    THREE times on this item, and the executor caught all three before writing.** Slice-2 ruling 9 (an
    exhaustive fix list claimed on a two-phrase search), audit ruling A4 (a citation naming a line that
    returns before the scope is read), and this sitting's own stale line numbers inside the ruling that
    forbids stale line numbers. **The merge ruling names this as evidence that the dispute right pays**,
    not as an apology. It has now paid three times, and never once through a reviewer.
22. **NEW, FROM RE-RUN RULING R1 - the public surface's ordering exemption rests on ONE reason, not
    two.** The reason is that the surface makes no access decision. **The discarded reason - that the
    ordering clause is UNSATISFIABLE there - was an over-claim and must not be re-derived.** The clause
    CAN be met, by collapsing the two reads into one; what is true is only that the two reads AS
    WRITTEN cannot be reordered. **AND NEITHER COLLAPSED READ SHAPE IS MEASURED** - whether PostgREST
    serves an embedded select or a reverse relationship query against this schema has never been
    executed, and the record asserts nothing about it. The foreign key that would enable both is read
    out of `20260811130000_single_seat_org_and_single_developer_projects.sql:59`.

## Rides along

**One line in `.claude/agents/reviewer-runner.md`** (slice-1 gate-2 ruling 8, commit `50d0daa`). That
file told the runner to report any tool outside `read`, `glob` and `grep` as an INVALID RUN, while
`.opencode/agent/reviewer-flash.md` grants `gitdiff: true` deliberately. `gitdiff` is now on the list
with its reason. Named in `plan.md` under "Rides along", and it must be named in the pull request
body. **Slice 2, the audit sitting and this sitting added no ride-along of their own.**

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

## Two measurement traps, carried forward

1. **PowerShell 5.1's `Get-Content -Raw` reads with the system ANSI codepage.** Use
   `[System.IO.File]::ReadAllText(path, [System.Text.Encoding]::UTF8)`, and compare files with
   `ReadAllBytes` plus `SequenceEqual` rather than by length.
2. **PowerShell 5.1 re-splits a here-string commit message containing double quotes** before passing it
   to `git.exe`; use `git commit -F <file>`. **And `Set-Content -Encoding utf8` writes a BYTE-ORDER
   MARK**, which `git commit -F` then puts at the front of the commit subject. Write the message file
   with `[System.IO.File]::WriteAllText(path, text, [System.Text.UTF8Encoding]::new($false))`. **In
   this worktree `.git` is a FILE, not a directory**, so a message file cannot be written to `.git/`.
   Use the scratchpad.

## A third trap, learned this sitting

**A LINE NUMBER IN A RECORD FILE DECAYS AS FAST AS ONE IN A CODE COMMENT.** This sitting's own ruling
cited three line numbers in `rulings-audit.md` and invalidated them within the hour by inserting a
pointer block above them. **Cite the SECTION, the symbol or the variable - not the line** - in rulings
and state files exactly as in code comments. The executor found this by tripping over it.
