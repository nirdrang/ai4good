---

# THIS ITEM

A tenant-isolation change on the branch
`nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`. It ships the
tree's first row-level-security policy set across two migrations, three edge functions, two test
adapters and two conformance arms. Its core claim is that a caller denied another organisation's
data receives an answer that does not reveal whether that data exists.

**THIS IS A RE-RUN, AND YOUR CHANGE-SET IS THE FIX DELTA.** This tree was read once at an earlier
head. Findings were reported, they were ruled, and the fixes landed. You are reading what the fix
moved, not the whole item again.

## YOUR CHANGE-SET INSTRUMENT

```
git diff 1e058d0...HEAD -- src supabase tests .github package.json bun.lockb tsconfig.json vitest.config.ts
```

**SIX FILES.** Every one is named in a box below:

```
supabase/functions/_shared/route-visibility.ts
supabase/functions/_shared/visibility.ts
tests/at/suites/req-001/_contract.ts
tests/at/suites/req-001/_integration.ts
tests/at/suites/req-001/_live.ts
tests/at/suites/req-001/d-tenant-isolation.test.ts
```

**ONE BOX RE-CHECKS IN FULL AND IT IS THE SCOPE BOX.** For box S1-R below, and only for it, use the
whole range, because a fix can add a stray file that the narrow delta hides:

```
git diff 926d170d5af6becb1f371e36c4b8099caa131429...HEAD -- src supabase tests .github package.json bun.lockb tsconfig.json vitest.config.ts
```

**Two files carry TWO fixes each**, so do not stop at the first hunk you recognise:
`tests/at/suites/req-001/_integration.ts` carries boxes A2 and A7, and
`tests/at/suites/req-001/d-tenant-isolation.test.ts` carries box A2 in its loop body.

## ONE CHANGE SITS OUTSIDE THE CODE TERRITORY AND IS DECLARED HERE

A one-line change in `.claude/agents/reviewer-runner.md`, landed earlier in this item. The territory
filter above excludes it by construction, so it is not in your change-set and you are not asked to
grade it. It is named so that a full `git diff --name-only` showing one more file than the code
territory reads as declared rather than as scope leakage.

---

# THE CLAIM CHECKLIST

Answer every box below by name with **PASS**, **FAIL** or **COULD-NOT-VERIFY**, with the file and
line you personally read, or the reasoning you traced.

**On carrying a line forward.** Boxes graded at the earlier head are not repeated here. If you
believe the fix delta REACHES a claim not listed below — a caller of a changed function, an importer
of a changed module, a reader of changed shared state — grade it and say so. "Untouched" means the
delta cannot reach the claim, not that a file is byte-identical.

## S1-R — THE SCOPE BOX, RE-CHECKED IN FULL

Against the whole-range command above: the change touches **22 files** in the code territory and
**NOTHING under `src/`**. The fix delta added no file to that list — it edited six files that were
already in it. Confirm both halves: the count, and the absence of `src/`.

## A1-N — THE ORDERING CONSTRAINT, AND ITS SCOPE IS NARROWED

**NO CODE CHANGED FOR THIS BOX. THE CLAIM CHANGED, AND THE BOX ASKS WHETHER THE NARROWED CLAIM IS
TRUE OF THE TREE.** This is stated openly because a checklist that hid a narrowing would let a
weakened claim pass as an unchanged one.

The earlier reading graded an ordering constraint stated as binding all three edge functions, and
reported that `supabase/functions/public-project-page/index.ts` reads its target project before it
reads that project's organisation. **That reading of the code was correct.** The claim was the thing
that was wrong, and it is now narrowed. Grade the narrowed claim:

1. The ordering constraint binds the two AUTHENTICATED read surfaces —
   `supabase/functions/organization-dashboard/index.ts` and
   `supabase/functions/project-workspace/index.ts`. In each, every read a decision needs is issued
   BEFORE the target row is read, and the target read is the LAST read the handler makes.
2. It does NOT bind `supabase/functions/public-project-page/index.ts`, because that surface makes no
   access decision and answers every caller the same way, so it has no second answer for an ordering
   to keep indistinguishable from the first.
3. **And it CANNOT bind it**: that handler's second read is keyed on `project.org_id`, a COLUMN OF
   THE TARGET ROW, so the organisation cannot be read before the project at all.
4. The file states its own exemption in its header rather than leaving it to be discovered.

**Attack all four.** In particular: is clause 3 true, or is there a way to read the organisation
first that the item missed? And does `public-project-page` make any access decision anywhere — any
filter, any branch on a caller property — which would falsify clause 2 and make the narrowing
wrong? **A narrowing that is wrong is a serious finding and is worth more than any other box here.**

## A2 — AT-001.40'S NON-ADMINISTRATOR CONTROLS

In BOTH bodies — the loop body in `tests/at/suites/req-001/d-tenant-isolation.test.ts` and the
`at00140` body in `tests/at/suites/req-001/_integration.ts` — each of the FOUR non-administrator
Data API controls now asserts BOTH directions, where it previously asserted only that tenant A's
identifiers were absent:

| control | table | the added positive assertion |
|---|---|---|
| `nonAdminListing` | `organizations` | the mapped `id`s CONTAIN NGO B's organisation id |
| `nonAdminSeats` | `org_memberships` | the mapped `org_id`s CONTAIN NGO B's organisation id |
| `nonAdminProjects` | `projects` | the mapped `id`s CONTAIN NGO B's project id |
| `nonAdminAcknowledgments` | `acknowledgments` | the mapped `account_id`s CONTAIN account B's id |

The claim is that an empty successful result can no longer pass any of the four, so the control
proves a CONTRAST rather than an absence.

**Attack it.** Is each positive assertion actually reachable — does the shipped policy set admit
that row to that caller? Is the identifier each assertion names the right one? Is the assertion in
BOTH bodies, or only one? And is there any remaining way for one of the four to pass while reading
nothing?

## A3 — THE ROUTE REGISTRY NAMES ITS IMPORTERS

`supabase/functions/_shared/route-visibility.ts` previously said nothing imports it. Its header now
states that two TEST files import it — `tests/at/suites/req-001/_route-scan.ts` and
`tests/at/harness/shipped-route-visibility.selftest.ts` — that NO PRODUCT CODE imports it, and that
a router exists (`src/router.tsx`) which consults nothing.

**Attack it.** Are the named importers the ONLY importers? Is "no product code imports it" true? Is
the router claim true?

## A4 — THE FAIL-CLOSED BRANCH IS TESTED, NOT UNREACHABLE

`supabase/functions/_shared/visibility.ts` previously said no call site can reach its unknown-scope
fail-closed branch. Its comment now states that no TYPE-CHECKED call site can reach it, that the
selftest reaches it deliberately through a cast, and that the branch therefore has a test rather
than being dead code.

**GRADE THE CITATION ITSELF, CHARACTER BY CHARACTER. THIS IS THE BOX TO PUSH HARDEST ON.** The
comment names a specific site and a specific mechanism in
`tests/at/harness/shipped-visibility.selftest.ts`. Follow the named lines and confirm that a call
made there genuinely lands on the fail-closed return — trace the viewer's account type through every
earlier branch of `tenantReadAllowed`, not only its scope argument. **An earlier version of this
comment named a line that returns before the scope is ever read.** Confirm the current one does not
repeat that.

## A5 — THE DATA API READ PARAGRAPH

`tests/at/suites/req-001/_contract.ts` previously said every existing call site of `dataApiRead`
passes a `Session`. It now states that every call site PREDATING the widening passes one, and names
`tests/at/suites/req-001/d-tenant-isolation.test.ts:810` as the one call site that passes `null`.

**Attack it.** Is that the only `null` call site in the tree? Is the new sentence true as written?

## A6 — THE CATALOG WITNESS SEES PARTITIONED TABLES

`tests/at/suites/req-001/_live.ts`'s `publicSchemaCatalog` previously filtered `pg_class` to
`relkind = 'r'`. It now accepts `'r'` and `'p'`, and its comment names what is deliberately excluded
and why.

**Attack it.** Does the widened predicate do what the comment says? Does adding `'p'` introduce any
new defect — for example, does the witness now report a partitioned parent and its partitions in a
way that would make a downstream conformance check wrong or double-count? Is the stated reason for
each exclusion true of this repository?

**This query has never been executed** — see the non-claims below. Grade it by reading.

## A7 — THE at00122 ARM'S STATED MECHANISM

`tests/at/suites/req-001/_integration.ts` previously explained one denial with "no policy branch
admits a volunteer". A migration in this same change ships a policy that DOES admit the assigned
volunteer, so the comment now names the current mechanism and states that the arm's subject is the
UNASSIGNED volunteer.

**Attack it.** Is the new stated mechanism true of the shipped policy set? Is the assertion below it
still correct? Does the same stale explanation survive anywhere else?

---

# STATED FACTS ABOUT THE CODE THAT THE FIX CREATED — grade each

- **FN1** `tests/at/suites/req-001/_live.ts`'s catalog predicate is `c.relkind in ('r', 'p')`.
- **FN2** `tests/at/expected/req-001.json` is NOT in the fix delta. The item DID edit it earlier, to
  register its own ids, and it is one of the 22 files in the full range — but the fix moved none of
  it. **This is the box that would catch a declaration edited to fit a result.**
- **FN3** No fixture, seed or mirror file is in the fix delta. The four positive assertions in A2
  were added without changing what the fixture stores.
- **FN4** `supabase/functions/public-project-page/index.ts` is NOT in the fix delta and its read
  order is unchanged.
- **FN5** The fix delta contains no migration change. Neither `.sql` file moved.
- **FN6** The fix delta touches nothing under `src/`, nothing in `.github/`, and no configuration
  file.

---

# ITEM-SPECIFIC ATTACK DIRECTIONS — additive to your own

1. **A comment corrected into a NEW false statement.** Five of the six boxes above are corrections
   to statements that were false. A correction that is itself false is the worst outcome available
   here, and it has already happened once in this item. Read each new sentence as a claim to be
   disproved, not as a fix to be confirmed.
2. **A correction that is true but not exhaustive.** Each of A3, A4, A5 and A7 corrects a claim in
   one file. Search for the same CLAIM in other wordings elsewhere in `supabase/` and `tests/`. A
   surviving copy is a finding.
3. **An assertion added that cannot fail.** A2 adds eight assertions. An assertion that passes
   whatever the system does is worse than none, because it looks like coverage.
4. **A widened SQL predicate that changes a downstream result.** A6 widens a catalogue filter that
   feeds a conformance rule. Follow the value into every consumer.
5. **A test weakened while being extended.** Compare the four controls before and after in the diff.
   Confirm nothing was removed, loosened, or moved out of the assertion path.
6. **The narrowing in A1-N used to excuse something real.** Read it as an adversary would.

---

# STATED NON-CLAIMS — attack these rather than treat them as exemptions

**Finding one of these UNDERSTATED is itself a finding.**

1. **The integration tier has never run at any head of this branch.** No test in
   `tests/at/suites/req-001/_integration.ts` or `tests/at/suites/req-001/_live.ts` has been executed,
   in this fix or before it. Every integration-side change here is unexecuted by construction.
2. **The catalogue query in A6 has never been sent to a database**, before or after the change.
3. **Timing is not defended.** The isolation claim is about response content and status, never
   response time.
4. **The loop-tier probe arms grade a fixture's MIRROR of the policy set, not the migrations.**
5. **The public project surface reveals that a project exists, deliberately** — the criterion writes
   that carve-out itself.
6. **On the public project surface an organisation-read outage answers 502 where an absent project
   answers 404.** This is stated as a known residual, on the ground that it discloses strictly less
   than the surface's designed 200 answer, which names the project and its organisation. **If you
   think that reasoning is wrong, say so — it is a ruling, not a fact.**
7. **The read-fault arm is loop tier only** and covers the two authenticated surfaces. It cannot
   cover the public surface, because its comparison needs an existing-but-FOREIGN target and nothing
   is foreign on a public surface.
8. **Nothing in product code imports the route registry and no router obeys it.**
9. **`supabase/functions/_shared/edge.ts` states that no test imports it. That statement is
   UNVERIFIED.** It is named here rather than hidden. It is outside the fix delta; if you happen to
   settle it while tracing something else, say so beside your findings.
10. **The catalog conformance arm does not prove a declared predicate is semantically CORRECT.** A
    semantically open predicate naming an approved identifier still satisfies it.
