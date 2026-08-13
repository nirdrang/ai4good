# Rulings - the ITEM-WIDE AUDIT, both slices, two readers

AI4DEV-66 (cross-org denial, no existence oracle), batched with AI4DEV-67 (assigned volunteer,
admin, stranger). Branch
`nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`.

Ruled by the AUDIT sitting, orchestrator on **opus @ max**, 2026-08-13, at head `1e058d0`.

## THE MODEL RULING FOR THIS RUN - CARRY IT FORWARD

The founder ruled (relayed 2026-08-12, restated to this sitting 2026-08-13) that **every
orchestrator sitting of this item runs as `orchestrator-opus` at opus/max effort** - plan, draft,
fix-and-goal, and the FIRST audit - not only the merge and audit-re-run sittings that are opus by
design. This is a deliberate founder choice for this run. It is **not** a sign that fable has no
credit. The conductor spawns every subsequent sitting of this item the same way, and every state
file repeats this paragraph.

---

# 0. THE PANEL, AND WHAT EACH SEAT RETURNED

Two readers, each blind to the other, each over BOTH slices at once.

| seat | reader | findings | checklist |
|---|---|---|---|
| 1 | `gpt-5.6-luna` via codex, effort max, `--sandbox read-only` | **6** | S1 PASS; R1-4 FAIL; F9 FAIL; every other box PASS |
| 2 | `opencode-go/deepseek-v4-flash`, agent `reviewer-flash` | **2** | S1 PASS; F9 FAIL; every other box PASS |

**Neither seat is clean, so neither is a veto over the other, and both verdicts are recorded here.**
Both seats independently passed scope box S1 - the 22-file path-set with nothing under `src/`. Both
seats independently failed stated fact F9. **That is the panel's one convergence and it is ruled
once, as ruling A3, under both claims quoted.**

**Eight findings, seven rulings, because two findings are one defect.** All seven are ADOPTED. One
of the seven is adopted with the record changing rather than the code - ruling A1, and the reasoning
for it is the longest thing in this file, because it is the one that touches the item's core claim.

---

# A1. THE PUBLIC HANDLER READS ITS TARGET FIRST - ACCEPT, AND THE RECORD CHANGES TO MATCH THE CODE

**Seat 1, severity S1, `supabase/functions/public-project-page/index.ts:73`.**

> claim: "The public handler reads the project target, then reads its organization, so the target is
> not the handler's last read as R1-4 requires."
> why it matters: "An organization-read fault is reachable only after an existing project, producing
> 502 while an absent project returns 404; this third handler is also absent from the fault loop."
> unverified-runtime-claim: yes - "inject the organization-read fault for existing and absent
> projects."
> checklist: **R1-4 - FAIL.**

## The stated fact is TRUE, and I confirmed it by reading

`public-project-page/index.ts` reads the project at line 64 and the organisation at line 73. The
target read is not last. The reader is right about the code.

## The checklist box it graded against is the thing that is wrong

The box I handed both readers says:

> **R1-4** Decision B's ordering constraint: **in each of the three edge functions**, every read a
> decision needs is issued BEFORE the target row is read, and the target read is the LAST read the
> handler makes ...

"in each of the three edge functions" is my own overstatement of the ruling. It is not what gate-1
ruling 4 decided and it is not what decision B claims. Decision B's own sentence is:

> **Every non-public read surface** returns exactly this constant for BOTH "no such row" and
> "exists, not yours".

`public-project-page` is the PUBLIC read surface. It is the one function in this repository that
declares `verify_jwt = false`, and the criterion writes the carve-out itself: AT-001.21's clause is
"no existence oracle BEYOND PUBLIC SURFACES". The ordering constraint exists to keep two answers
indistinguishable. This surface has no second answer to keep indistinguishable, because it answers
everybody the same way.

**The file already says so, in writing, at lines 22-25, and it said so before the audit ran:**

> THE READ ORDER IS NOT LOAD-BEARING HERE, and saying so is the point rather than an omission. This
> surface makes no access decision - it answers everyone the same way - so there is no second answer
> for an ordering to keep indistinguishable from the first. It reads the project, then the
> organisation whose name the projection carries.

So the tree and the primary record agree with each other. My derived checklist box disagreed with
both. **This is the class the orchestrator contract calls "the record is false", and the contract's
remedy is either direction: the code changes to match the record, or the record changes to match the
code. Here the record changes.**

## And the constraint is not merely unnecessary there - it is UNSATISFIABLE there

This is the fact that settles it rather than merely excusing it.

In the two authenticated handlers every decision input is keyed on the CALLER or on the target's
IDENTIFIER, never on the target's CONTENTS, so every one of them can be issued before the target
read. I verified both:

- `organization-dashboard/index.ts` makes four reads - the caller's account (line 83), the target
  organisation's seats (line 90), the projection's projects (line 103), and the target organisation
  (line 111). Line 110 carries its own comment, "READ 4 - THE TARGET, AND IT IS LAST. Nothing is
  read after this line." Reads 2 and 3 are keyed on the organisation ID but hit DIFFERENT tables, so
  neither says whether the organisation row exists. **R1-4 holds.**
- `project-workspace/index.ts` makes two reads - the caller's account (line 67) and the target
  project (line 72). Nothing follows. **R1-4 holds.**

In `public-project-page` the second read is keyed on `project.org_id` - **a column of the target
row**. The organisation cannot be read before the project, because its identifier does not exist
until the project row is in hand. Satisfying the box's letter would mean collapsing the two reads
into one embedded PostgREST select, which is a read-shape change to a live query on a public
surface.

**And that change is one this branch cannot verify.** The integration tier has never run - section 1
of `PHASE-STATE.md`, the infrastructure block - so a new PostgREST query shape would land unexecuted
against a surface whose entire claim is "it answers 200". A change I cannot grade, made to satisfy a
sentence that overstated its own ruling, is strictly worse than the residual it would remove.

## THE RULING

1. **No code change to the read order in `public-project-page`.** The read order stands as written.
2. **The claim narrows, and the narrowing is written into the record.** R1-4's ordering constraint
   binds the two AUTHENTICATED read surfaces - the non-public surfaces that carry `TENANT_NOT_FOUND`
   as their one refusal. It does not bind the public surface, which makes no access decision, and it
   cannot bind it, because that surface's second read is keyed on a column of the target row.
3. **`plan.md` gains the scope sentence** at decision B, so the primary record stops stating the
   constraint unqualified. `PHASE-STATE.md` carries the narrowed claim and the new residual.
4. **A NEW RESIDUAL IS RECORDED RATHER THAN ARGUED AWAY** - see below. The reader found something
   real and it belongs in the merge ruling.
5. **The second half of the claim - "this third handler is also absent from the fault loop" - is
   correct and needs no remedy.** The fault arm's subject is "an existing-but-foreign target and a
   well-formed nonexistent target produce the SAME outcome under each fault" (plan step 8). On the
   public surface nothing is foreign; every project is public to everybody. The arm cannot cover
   that handler because the arm's own comparison has no second term there. This is now stated rather
   than left to be rediscovered.

## The new residual, stated plainly

**On the public project surface, an organisation-read outage answers 502 where an absent project
answers 404. So under that fault the response distinguishes an existing project from an absent
one.**

It is inside residual 4 - "the public project surface reveals that a project exists, deliberately" -
and not beside it, for a measured reason: on the normal path this surface answers 200 **carrying the
project's name and its organisation's name** for every project that exists, and 404 for one that
does not. The outage path discloses strictly less than the designed path already discloses, about
the same set of rows. No project is hidden by this surface - the handler applies no visibility
filter, so there is no project whose existence the 200 answer conceals and the 502 answer would
reveal.

**One sub-case, named because it is the sharpest reading and I do not want it discovered later.** A
project whose organisation row is missing answers 404, while the same project under an
organisation-read fault answers 502. That distinguishes a data-integrity state from a fault, not one
tenant from another. The criterion protects a tenant boundary, and a project with no organisation
row is on nobody's side of one.

---

# A2. AT-001.40's FOUR NON-ADMINISTRATOR CONTROLS PASS ON AN EMPTY RESULT - ACCEPT

**Seat 1, severity S2, `tests/at/suites/req-001/d-tenant-isolation.test.ts:700`.**

> claim: "AT-001.40's non-administrator controls only require non-null rows and absence of tenant A's
> identifiers, so empty successful results pass."
> why it matters: "With privileges present but member policies denying every row, the administrator
> checks can pass while all four non-admin controls pass empty, proving no administrator-specific
> attribution."

## Confirmed by reading, and it is a seam THIS ITEM ADDED

Each of the four controls at lines 694-728 asserts exactly two things: `rows` is not null, and the
mapped identifiers do not contain tenant A's. An empty array satisfies both.

The administrator arms directly above are guarded by construction - lines 642, 643, 651, 654, 664,
667, 680 and 683 all use `toContain`, which cannot pass on an empty array. The controls are the half
that can.

**And three of these four controls were added by this item's own slice-2 ruling 5**, which extended
AT-001.40's control from one table to all four. `PHASE-STATE.md` filing candidate 1 states this
item's own practice in its own words: it "guarded the nine it ADDED and left these alone
deliberately", of six PRE-EXISTING vacuous seams. By that practice these four are ours to guard. The
reader found a place where the item did not do what it says it does.

## What the control is FOR, and why empty is not good enough

The block's own comment says the reach "is attributable through the CONTRAST". A control that passes
empty cannot tell "the member policies admit each tenant its own rows and no more" from "the member
policies deny everything". In the second world AT-001.40 stays green while the tenant isolation it
brackets is broken shut. That is a false green of exactly the kind this item exists to remove.

## THE RULING - ACCEPT, with the remedy dictated and a verification condition on each half

**In BOTH bodies - the loop body in `d-tenant-isolation.test.ts` and the integration body `at00140`
in `_integration.ts` - each of the four non-administrator Data API controls gains a POSITIVE
assertion beside its existing negative one: the non-administrator's OWN row is present.**

| control | table | the positive assertion |
|---|---|---|
| `nonAdminListing` | `organizations` | the mapped `id`s CONTAIN `b.organizationId` |
| `nonAdminSeats` | `org_memberships` | the mapped `org_id`s CONTAIN `b.organizationId` |
| `nonAdminProjects` | `projects` | the mapped `id`s CONTAIN `projectB.id` |
| `nonAdminAcknowledgments` | `acknowledgments` | the mapped `account_id`s CONTAIN `b.accountId` |

Each assertion carries a message in the file's existing voice, naming what its failure would mean -
that the control proved nothing because the caller read nothing at all.

**Why I believe all four hold under the SHIPPED policy set**, checked against the migrations rather
than assumed:

- `organizations_select_org_member` uses `public.viewer_is_org_member(id)` - admits org B to a member
  of org B (`20260812120000_…sql:123-127`).
- `org_memberships_select_org_member` uses `public.viewer_is_org_member(org_id)` - same
  (`…:132-136`).
- `projects_select_org_member` uses `public.viewer_is_org_member(org_id)` - same (`…:141-145`).
- `acknowledgments_select_own_account` uses `account_id = (select auth.uid())` - admits the caller's
  OWN acknowledgment (`…:156-160`). The administrator arm at line 683 already asserts that account
  b's acknowledgment exists in the fixture, so there is a row for this to find.

**VERIFY FIRST, AND THE CONDITION IS A STOP RATHER THAN A FALLBACK.** Before writing each assertion
the executor confirms two things: that `sessionB` is the session of account `b.accountId`, and that
the assertion holds. Then:

- **If the SHIPPED policy set does not admit one of the four, STOP and report it.** That is a
  finding about the product, not about the test, and it is worth more than this ruling. Do not
  weaken the assertion to fit.
- **NEVER edit the fixture, the seed data or `tests/at/expected/req-001.json` to make an assertion
  pass.** A declaration edited to fit a result is the false green this item exists to prevent. If
  the shipped set admits a row and the fixture's mirror does not, that is a MIRROR defect: report it,
  do not patch it silently.
- The integration body cannot be executed - the tier is down. Write it to state the same claim as the
  loop body, and record in the report that it is unexecuted, exactly as every other integration-side
  change on this branch is recorded.

---

# A3. `route-visibility.ts` SAYS NOTHING IMPORTS IT, AND TWO FILES DO - ACCEPT. **BOTH SEATS FOUND THIS, AND IT IS RULED ONCE.**

**This is the panel's only convergence. I checked that the two claims really are one defect before
merging them: same file, same line, same two importers, same stated fact. They are.**

**Seat 1, severity S3, `supabase/functions/_shared/route-visibility.ts:31`:**

> claim: "The comment says nothing imports this module, but the route selftest and route scan import
> it at `shipped-route-visibility.selftest.ts:33` and `_route-scan.ts:30`."
> why it matters: "Maintainers may treat the registry as unused and miss its current consumers."
> checklist: **F9 - FAIL.**

**Seat 2, severity low, `supabase/functions/_shared/route-visibility.ts:31`:**

> claim: "The claim \"Nothing imports route-visibility.ts today\" (audit fact F9, repeated in this
> module's own header at line 31, in plan.md:593 and in PHASE-STATE.md:341) is false as written: two
> files import the module - tests/at/suites/req-001/_route-scan.ts:30 imports undeclaredRoutes, and
> tests/at/harness/shipped-route-visibility.selftest.ts:33 imports ROUTE_VISIBILITY and
> undeclaredRoutes."
> checklist: **F9 - FAIL.**

## Confirmed, and seat 2 found MORE of it than seat 1 did

Both importers exist exactly as described - `_route-scan.ts:30` and
`shipped-route-visibility.selftest.ts:33`. The module's header at line 31 says "NOTHING IMPORTS THIS
TODAY AND NO ROUTER OBEYS IT." The second half is true. The first half is false.

**Seat 2 also traced the same false statement into the RECORD - `plan.md:593` and
`PHASE-STATE.md:341` - which seat 1 did not.** That is worth naming: the two seats converged on the
defect and one of them mapped it further. It is also why the remedy below is wider than either
reader's file citation.

**And `plan.md:593-594` turns out to carry a SECOND false statement beside it:** "there is no
router". Slice-1 gate-2 ruling 6 established that `src/router.tsx` EXISTS and consults nothing, and
corrected the code accordingly. The plan was never corrected to match. `PHASE-STATE.md` residual 11
was corrected on the router half and not on the imports half. The record drifted from its own ruling
in two places, in opposite directions.

## THE RULING - ACCEPT, at all four sites

1. **`route-visibility.ts:31`** - the sentence is replaced. It keeps the true half, names the two
   importers by path, and keeps the residual's actual point: the consumers are TESTS, no product
   code imports it, and no router obeys it.
2. **`plan.md:593-594`** - corrected on BOTH false statements, in place, with the original kept
   visible as history the way this item's other record corrections are. This is a record change made
   by me, not by the executor.
3. **`PHASE-STATE.md` residual 11** - rewritten by me in the new state file.
4. **The audit prompt files are NOT edited.** They are the record of what was asked, and a spent
   prompt rewritten after the fact would destroy the evidence that F9 was graded FAIL for a reason.

---

# A4. `visibility.ts` SAYS NO CALL SITE CAN REACH ITS FAIL-CLOSED BRANCH, AND THE SELFTEST REACHES IT - ACCEPT

**Seat 1, severity S3, `supabase/functions/_shared/visibility.ts:206`.**

> claim: "The comment says no call site can reach the unknown-scope branch, but the selftest
> deliberately reaches it through its casted call at `shipped-visibility.selftest.ts:47`."
> why it matters: "The comment misclassifies the fail-closed branch as unreachable and could
> encourage its removal."

## Confirmed, and the two files contradict each other in writing

`visibility.ts:205-207` says "no call site can reach it today because `TenantReadScope` is a union of
exactly two strings."

`shipped-visibility.selftest.ts:42-47` says the opposite about itself: "Every call below is a shape
the type-checker would reject at a checked call site ... the casts are how this file reaches them",
and its `call` helper casts `scope as TenantReadScope`.

## A CORRECTION TO MY OWN STATED FACT, RECORDED BESIDE THE ORIGINAL

**As first written, this ruling named `shipped-visibility.selftest.ts:192` as the site that reaches
the branch. THAT WAS WRONG, and the executor disputed it rather than implementing it.** The original
sentence was:

> Line 192 then calls it with `'anything'`, which lands in exactly that branch.

**It does not.** `visibility.ts:176` returns before any scope is read:

> `if (accountType === 'platform_admin') return { ok: true, basis: 'platform-admin' };`

The scope tests are at lines 178 and 193; the fail-closed branch is at line 210. Selftest line 192
passes `{ accountType: 'platform_admin', … }`, so it returns at line 176, and line 194 asserts
`{ ok: true, basis: 'platform-admin' }` - the administrator branch. The selftest says so in its own
comment at lines 188-190: "an administrator still reads under an unknown scope, because its clause
never reads the scope at all."

**THE SITE THAT DOES REACH THE BRANCH IS THE LOOP AT `shipped-visibility.selftest.ts:163-187`.** The
viewer is `wouldHaveBeenGranted` (lines 163-167) - a volunteer, assigned - driven through thirteen
non-scope values (`undefined`, `null`, `''`, `'   '`, `'Project'`, `'projects'`, `'organisation'`,
`'org'`, `42`, `true`, `{}`, `[]`, `['project']`) through the same cast helper at lines 46-47. A
volunteer passes line 176, misses `'organization'` at 178 and `'project'` at 193, and lands at 210.
Line 184 asserts `.ok` is false for every one of the thirteen. I verified all of this first-hand
after the dispute.

**How I got it wrong, said plainly.** I searched for `call(` , saw line 192 carrying the
unrecognised scope `'anything'`, and inferred the branch from the scope argument without reading the
viewer's account type on the same line. That is the same defect this audit is correcting in four
comments: a statement about code that is plausible and not followed to the end.

**The ruling's CONCLUSION is unchanged and I re-affirm it.** A call site does reach the branch,
deliberately, through a cast; the branch is covered by a test rather than dead. Only the citation
moves - from line 192 to lines 163-187.

**"why it matters" is the sharp half and I adopt it as stated.** A branch marked unreachable is a
branch somebody deletes. This one is the fail-closed posture for an unrecognised scope, and the
record states what it prevents: before it existed, an unrecognised scope fell through to the project
rule, where an assigned volunteer is allowed - so an unknown scope WIDENED access. Deleting it as
dead code would restore that.

## THE RULING - ACCEPT, comment only. **AMENDED AFTER THE EXECUTOR'S DISPUTE; THE CITATION IS THE ONLY THING THAT MOVED.**

The sentence is replaced. It states the reachability precisely: no TYPE-CHECKED call site can reach
the branch, because `TenantReadScope` is a union of exactly two strings; **the selftest's
thirteen-value loop at `shipped-visibility.selftest.ts:163-187` reaches it deliberately, through the
cast helper at lines 46-47**; **and therefore the branch is covered by a test rather than dead.** It
keeps the existing sentence about what the branch prevents, unchanged.

---

# A5. `_contract.ts` SAYS EVERY `dataApiRead` CALLER PASSES A SESSION, AND AT-001.24 PASSES `null` - ACCEPT

**Seat 1, severity S3, `tests/at/suites/req-001/_contract.ts:868`.**

> claim: "The comment says every `dataApiRead` caller passes a `Session`, but AT-001.24 calls it with
> `null` at `d-tenant-isolation.test.ts:810`."
> why it matters: "It hides the newly exercised anonymous path and can lead future changes to assume
> a non-null session."

## Confirmed, and the sentence is a pre-change fact left in the present tense

`_contract.ts:868` reads "Every existing call site passes a `Session`, which is assignable, so
nothing else moves." `d-tenant-isolation.test.ts:810` is `sut.dataApiRead(null, …)`, and it is the
only such call site in the tree - I measured it, rather than taking the reader's single citation.

The sentence was a correct argument for why WIDENING the parameter type was safe. It is false as a
present-tense statement about this tree, and it sits five lines below a paragraph that says
`session` MAY be `null`, so the file argues with itself.

## THE RULING - ACCEPT, comment only

The sentence is replaced by one that says the same true thing without the false present tense: every
call site that PREDATES this change passes a `Session`, which is assignable, so widening the
parameter moved none of them; AT-001.24's own probe at `d-tenant-isolation.test.ts:810` is the one
call site that passes `null`, and it is the reason the parameter was widened.

---

# A6. THE CATALOG WITNESS CANNOT SEE A PARTITIONED TABLE - ACCEPT, AND IT IS A CODE FIX

**Seat 1, severity S2, `tests/at/suites/req-001/_live.ts:1026`.**

> claim: "The catalog witness filters `pg_class` to `relkind = 'r'`, omitting partitioned tables such
> as relations with `relkind = 'p'`."
> why it matters: "A public partitioned tenant table can be omitted before `catalogProblemsAgainst`
> checks declaration or isolation, allowing the conformance arm to miss it."

## Confirmed, and it is a hole in an instrument THIS ITEM SHIPS

Line 1026 is `where n.nspname = 'public' and c.relkind = 'r'`. `'r'` is an ordinary table. A
partitioned table is `'p'`. A partitioned parent is where the row-level-security flag lives and where
`pg_policies` reports its policies, so a public partitioned tenant table would be absent from the
witness entirely - never declared, never checked for isolation, silently conformant.

`_contract.ts:873` states the witness's own claim as "EVERY TABLE IN THE `public` SCHEMA". With this
filter it is not every table. So the finding is both a blind spot and a false stated fact.

**In scope, and not marginally.** The conformance arm is this item's own instrument, and its whole
purpose is the one named in open question 2: "land the catalog conformance arm so a later
requirement's table cannot arrive unisolated". A later requirement arriving with a partitioned table
is precisely the case the arm is for.

## THE RULING - ACCEPT

The filter becomes `c.relkind in ('r', 'p')`.

The comment above the query gains one sentence naming what is in and what is deliberately out:
ordinary tables and partitioned parents are in, because both carry row-level security and policies;
views and materialised views are out because they are not the arm's subject; foreign tables are out
because this repository uses no foreign-data wrapper, **and that is named so the same finding does
not have to be made twice.**

**Two facts about the risk, so the merge ruling can state it accurately.** This query has never been
executed - the integration tier has never run - and it is `_live.ts`, the integration adapter, so
the loop tier cannot reach it at all. The change cannot move the loop result. It is a better
ungraded query replacing a worse ungraded one, which is the same posture, and the same stated
reason, that slice-2 ruling 2 already recorded when it replaced this query's grant instrument.

---

# A7. AN INTEGRATION COMMENT EXPLAINS A CORRECT ASSERTION WITH A MECHANISM SLICE 2 REMOVED - ACCEPT

**Seat 2, severity low, `tests/at/suites/req-001/_integration.ts:1539-1541`.**

> claim: "at00122 arm (4)'s comment says \"Slice 1 ships no policy branch that admits a volunteer, so
> this answers [] for the seat-holder too\". At this head, slice 2's migration 20260813120000 ships
> projects_select_assigned_volunteer, which admits the seat-holder, and at00123's own arm (4) asserts
> the assigned volunteer's unfiltered listing holds exactly its project - so \"this answers [] for
> the seat-holder too\" is no longer true, and the comment's stated mechanism (\"no policy branch
> that admits a volunteer\") is false as an explanation of the current denial."

## Confirmed, and the reader was precise about which half is wrong

`20260813120000_…sql:134-138` creates `projects_select_assigned_volunteer`, `using
(assigned_volunteer_id = (select auth.uid()) and public.viewer_is_volunteer())`. That policy admits
the seat-holder. The comment says no such branch exists.

**The ASSERTION is still correct and the reader says so.** The arm reads as `unassigned`, and an
unassigned volunteer is admitted by neither branch - not by `projects_select_assigned_volunteer`,
because it is not the assigned volunteer, and not by `projects_select_org_member`, because it holds
no seat. The answer is still `[]`. Only the stated REASON is stale.

**This is the same defect shape slice-2 ruling 7 already ruled once** - a fixture stating a false
REASON for a correct refusal. Consistency requires adopting it.

## THE RULING - ACCEPT, comment only

The sentence is replaced. It states the current mechanism: the migration now ships
`projects_select_assigned_volunteer`, which DOES admit the seat-holder, and what this arm asserts is
the UNASSIGNED volunteer, whom neither that policy nor `projects_select_org_member` admits.

**I measured the site count myself rather than trusting one citation.** The phrase "policy branch
that admits a volunteer" occurs at exactly one site in `tests/` and `supabase/` -
`_integration.ts:1540`. The loop twin does not carry it. Seat 2 found the only one.

---

# THE STANDING INSTRUCTION ON EVERY COMMENT CORRECTION IN THIS SITTING

**This item has already been bitten by this once and the executor must not repeat it.** Slice-2
ruling 9 records that ruling 6 claimed an exhaustive fix list on the strength of a search for two
exact phrases, and the same two claims survived in DIFFERENT WORDS in another file.

So, for A3, A4, A5 and A7: **search the tree for the same CLAIM, not the same phrase, before
touching anything.** Search for the idea in several wordings. If the same claim survives anywhere
else - in `supabase/`, in `tests/`, or in a file this ruling does not name - **report it and do not
touch it.** A ruling that turns out to be non-exhaustive is a finding about my ruling, and I would
rather receive it than have it quietly fixed.

---

# THE EXECUTOR'S DISPUTE, AND MY RULING ON IT - THE EXECUTOR IS UPHELD

**The executor disputed ruling A4 and refused to implement it. It was right, and I record that as
plainly as I record its rulings.**

It did exactly what its contract requires: it did not implement the ruling, it did not silently
adapt it to something true, and it reported with first-hand evidence and three named options. Had it
adapted quietly, my false citation would have been laundered into a comment that looked verified,
and the next reader would have had no way to know.

**The disposition is option (a), the smallest correct amendment: A4 keeps its conclusion and its
remedy, and its citation moves from line 192 to lines 163-187.** The correction is written into A4
above, beside the original sentence rather than over it.

**This is the SECOND time this item has caught a defect in the orchestrator's own ruling** - slice-2
ruling 9 was the first, where a fix list was claimed exhaustive on a two-phrase search. Both were
caught by the executor, not by a reviewer, and both were caught because the executor is required to
verify before it writes. That is worth naming in the merge ruling: the dispute right is not
ceremony, it has now paid twice.

**Nothing else in the sitting was blocked by it.** The executor held `visibility.ts` untouched and
completed the other five rulings, so the dispute cost one commit rather than a sitting.

---

# ONE THING THE EXECUTOR FOUND AND CORRECTLY DID NOT TOUCH

`supabase/functions/_shared/edge.ts:8` says `edge.ts` is "imported by no test". The executor read it
as a different module making a different claim from A3's, noted that `PHASE-STATE.md` residual 9
states it deliberately, and reported it instead of fixing it. **That judgment is correct and I
confirm it.** Residual 9 says "The `readRows` fix is proved by reading, not by a test. No test
program imports `edge.ts`." The statement is in-record, it is not a surviving copy of A3's claim, and
it is out of this ruling's scope.

**It is UNVERIFIED, by the executor's own statement and by mine.** It is carried to the merge ruling
as an unverified in-record statement rather than as a finding, and no sitting of this item has
measured it.

---

# WHAT THIS MEANS FOR THE AUDIT RE-RUN

**Code changes. So the audit re-runs once, at the new head, scoped to the fix delta, with BOTH
seats.** Rulings A2 and A6 change executable code - four test assertions in two bodies, and one
catalogue predicate. A comment-only sitting would not have earned a re-run; this one does.

The next sitting's state file names the delta and rebuilds the claim checklist. It is written in
`PHASE-STATE.md`.
