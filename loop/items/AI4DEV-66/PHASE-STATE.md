# PHASE-STATE - AI4DEV-66 (cross-org denial, no existence oracle), batch with AI4DEV-67 (assigned volunteer, admin, stranger)

**Phase: BOTH SLICES ARE BUILT, BOTH CODE GATES ARE RULED, AND EVERY ADOPTED FIX IS LANDED. The
next event is the ITEM-WIDE AUDIT - two readers over BOTH slices at once. The two prompt files are
written and named in section 4.** The INFRASTRUCTURE BLOCK from every earlier sitting still stands,
unchanged, and it is restated in full in section 1.

Written by the FIX AND GOAL sitting for slice 2, orchestrator on **opus @ max**, 2026-08-13.

## THE MODEL RULING FOR THIS RUN - CARRY IT FORWARD

The founder ruled (relayed 2026-08-12, restated to this sitting 2026-08-13) that **every
orchestrator sitting of this item runs as `orchestrator-opus` at opus/max effort** - plan, draft,
fix-and-goal, and the FIRST audit - not only the merge and audit-re-run sittings that are opus by
design. This is a deliberate founder choice for this run. It is **not** a sign that fable has no
credit. The conductor spawns every subsequent sitting of this item the same way, and every state
file repeats this paragraph.

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

**Head at the close of this sitting: reported by the sitting in its completion message.** The last
commit that touches CODE is `42d678a`; every commit after it touches `loop/items/` only.

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
6. **THIS SITTING ADDS A FOURTH, AND IT IS THE SAME BLOCKER AGAIN.** Slice 2's gate-2 ruling 2
   REPLACED the catalog witness's grant query with `has_table_privilege`. The old query had never
   been sent to a database and neither has the new one. It is a better ungraded query, not a graded
   one.

**What the integration tier now owes, enumerated:** the plan's step 6 privilege-posture measurement
(never made - `artifacts/verify-first-answers.md` records that plainly and invents no result);
AT-001.21, .22, .23 and .40 green at integration tier; first proof that BOTH migrations apply and
that the three deployed functions serve at all; the grading of the fixture's policy mirror, which
now mirrors two migrations and one added account-type conjunct; step 16's third done-criterion,
"the conformance arm passes on the real list", which needs the live catalog; and the first execution
of `publicSchemaCatalog`'s new query.

---

# 2. WHAT THIS SITTING DID

## Eight findings from two blind readers, ruled before any code moved

Two readers on slice 2's diff. terra returned 7 findings, flash returned 1. **No two of them are
the same defect, so this gate produced NO convergence** - unlike slice 1's gate, which converged
twice. Flash's single finding is in a file slice 2's diff does not touch: it read past the
change-set into the item's own slice-1 code and found a sentence slice 2's own dictation had made
misleading.

**Six adopted, two dismissed with written reasons.** Three of the six are adopted with a remedy
other than the one the reader proposed. All eight rulings are in
`loop/items/AI4DEV-66/rulings-gate2-slice2.md`, each with the reader's claim quoted exactly beside
it. **The rulings were committed and pushed as `2e6a937` BEFORE the executor touched a file**, so
the judgment would survive an executor death.

| id | reader | disposition, in one line |
|---|---|---|
| 1 | terra, high | the assigned-volunteer policy admitted any assigned ACCOUNT - **adopted**, and the condition is removed rather than measured |
| 2 | terra, high | the conformance rule could not see a grant to `PUBLIC` - **adopted**, fixed at the INSTRUMENT rather than by widening a role list |
| 3 | terra, high | a tenant-isolated table passed with row-level security OFF - **adopted exactly as proposed**; the best of the eight |
| 4 | terra, high | the trivially-open check catches only the literal `true` - **DISMISSED**: true, and already declared as a non-claim in three places |
| 5 | terra, medium | AT-001.40 drove ONE of four platform-admin policies - **adopted exactly as proposed** |
| 6 | terra, medium | the route module said there is no router, and stated a convention this router lacks - **adopted** on both stated facts, **the "false failure" half REJECTED in writing** |
| 7 | terra, medium | the fixture's REASON for refusing a signed-out caller is false at the live tier - **adopted**, comments only, the runtime half recorded UNVERIFIED |
| 8 | flash, low | the selftest restated the implication this diff corrected one file away - **adopted** |

**A ninth ruling exists and it is a defect in MY OWN ruling 6.** Ruling 6 claimed its fix list was
exhaustive on the strength of a search for two exact phrases. The executor found the same two claims
surviving in different words in `shipped-route-visibility.selftest.ts`, **reported it rather than
touching it**, and re-measured with a second instrument before reporting. Ruling 9 fixes that file
and records the wide re-measurement made before writing it. Two of my own stated facts are corrected
in place beside their originals, in the same file.

## Evidence checks that decided the rulings, and that neither reader made

1. **THE TWO SEATS ARE NOT SYMMETRIC**, which is what made ruling 1 an adoption rather than a
   restatement of slice 1's recorded asymmetry. `public.org_memberships` is guarded by
   `org_membership_grantee_must_be_ngo()`; `public.projects.assigned_volunteer_id` has no
   account-type guard at all, and its only trigger enforces the single-developer invariant.
2. **The edge surfaces read with the SERVICE ROLE** (`edge.ts:339-345`), so the administrator's
   dashboard and workspace successes prove nothing about three of the four platform-admin policies.
3. **`src/router.tsx` EXISTS.** Sixteen lines, `createRouter` over the generated route tree.
4. **The double-underscore rule described a convention this router does not have.**
   `src/routes/README.md` documents `_layout.tsx` - one underscore - as the layout route.
5. **The live adapter deliberately retains a session's tokens after `signOut`**, and says so in its
   own comment, which is what refutes the fixture's stated reason without any database being asked.
6. **The flash run's cage held and its identity matched.** 54 tool calls - 22 `read`, 17 `gitdiff`,
   13 `grep`, 2 `glob`, and no `write`, `edit`, `patch`, `bash`, `task` or `webfetch`. 31 of 31
   assistant messages matched the pin; session `ses_0079562b3ffeZwOBiow0ND9R8Z`. **The ride-along
   from slice 1 is what makes this a valid run rather than an INVALID one** - `gitdiff` is on the
   runner's allowed list now, and this run used it 17 times.

## What landed

**Nine commits, `2804e17` through `42d678a`, one per work item. ELEVEN code files** - ten from the
first executor invocation and `shipped-route-visibility.selftest.ts` from ruling 9.

- `supabase/migrations/20260813120000_…sql` - `public.viewer_is_volunteer()` and the account-type
  conjunct on the assigned-developer policy.
- `tests/at/suites/req-001/_live.ts` - the catalog witness now asks `has_table_privilege` per client
  role instead of reading a grant catalogue that omits `PUBLIC` by documented design.
- `tests/at/suites/req-001/_catalog-conformance.ts` - clause 3 gains a row-level-security check and
  an effective-grant check; `KNOWN_POLICY_HELPERS` gains the third helper.
- `tests/at/harness/shipped-catalog-conformance.selftest.ts` - two new failure cases, one per new
  check, and the predicted `qual` for the assigned-developer policy.
- `tests/at/suites/req-001/d-tenant-isolation.test.ts` and `_integration.ts` - AT-001.40's
  administrator listing and its non-administrator control now cover ALL FOUR tables in both bodies.
- `tests/at/suites/req-001/_fixture.ts` - the mirror gains the account-type conjunct; the signed-out
  caller's stated reason is corrected.
- `supabase/functions/_shared/route-visibility.ts`, `tests/at/harness/shipped-visibility.selftest.ts`,
  `tests/at/harness/shipped-route-visibility.selftest.ts`, `tests/at/suites/req-001/_contract.ts` -
  comment corrections, no behaviour.

## What I verified MYSELF, independently of the executor's report

Every one of these I ran or read first-hand, at head `42d678a`:

- `bun run typecheck` - **exit 0**, "typecheck OK: both configs clean"
- `bun run at:check req-001` - **exit 0**, "37 P0 ids in bijection"
- `bun run at:verify req-001 --tier loop --expect` - **exit 0, 26 green / 11 red, EXACT MATCH**, with
  AT-001.21, .22, .23, .24 and .40 all green in the same run. The runner's own line: "EXPECTED: the
  run matches tests/at/expected/req-001.json exactly (26 declared green, 11 declared red)".
- `bun run at:selftest` - **exit 0, 16 files / 370 tests.** The file count is unchanged, as ruling 3
  required, and the test count rose from 368 by exactly the two cases it dictated.
- **The changed-file list of this sitting's fix is ELEVEN code files** and nothing else outside
  `loop/items/`. No `supabase/config.toml`, no `package.json`, no `.github/`, no `.claude/`, and
  `tests/at/expected/req-001.json` is untouched - a declaration edited to fit a result would be a
  false green, and none was made.
- **The whole branch touches 22 files in the code territory and ZERO files under `src/`**, measured
  directly rather than assumed. That is the territory guard's condition and it holds.
- **I read every diff of both executor invocations against the ruling that dictated it** - the
  migration helper and its conjunct, the effective-privilege witness, clause 3's two new checks, both
  AT-001.40 bodies extended to four tables in both the administrator arm and the control arm, and
  every comment correction.

**THE INTEGRATION TIER WAS NOT RUN AND THIS GREEN CLAIMS THE LOOP TIER ONLY.**

---

# 3. CAPS USED BY THIS SITTING

- **Executor invocations: 2 of 3.** One build pass for rulings 1, 2, 3, 5, 6, 7 and 8, with zero
  corrective iterations; one send-back for ruling 9.
- **Mechanical invocations: 0.**
- Integration-tier attempts: **0 this sitting.** The single attempt from slice 1's draft sitting
  stays spent.
- Continuous-integration flake re-run: **unused.** Audit re-run: **unused.**

**The running total across the item, so the count stays auditable:** slice 1's draft sitting used 2
of its 3, slice 1's fix-and-goal sitting used 1 of its 3, slice 2's draft sitting used 1 of its 3,
this sitting used 2 of its 3. The terminated resume-sitting's invocation was ruled not-chargeable by
that sitting and no sitting since has reopened that ruling. **Caps are PER SITTING** - the next
sitting opens with three of its own.

---

# 4. WHAT COMPLETES THE NEXT PHASE - THE ITEM-WIDE AUDIT

**The next phase is the AUDIT, and it is per ITEM rather than per slice.** Both code gates have now
run, once per slice, and every adopted fix from both is landed. The two prompt files are written,
committed and ready to hand out AS WRITTEN:

- `loop/items/AI4DEV-66/audit-luna-prompt.txt`
- `loop/items/AI4DEV-66/audit-flash-prompt.txt`

Two readers, each launched by its own reviewer-runner, each handed ONE prompt file as written. The
two files are **byte-identical by design** - verified at **25821 bytes each** with the explicit UTF-8
reader (`[System.IO.File]::ReadAllBytes` compared with `SequenceEqual`, plus
`[System.IO.File]::ReadAllText` with `Encoding::UTF8`), never with a byte count alone. **67
em-dashes and 0 replacement characters** in each.

Assembled per `.claude/skills/work/reviewers.md`: its `## Your contract` section, the AUDIT review
section only, and this item's additions. **Checked by measurement, not by intent:** zero occurrences
of `**Pins**`, zero of "reader one" or "reader two", zero mentions of any model name, and zero
mentions of a panel or of both readers. Neither file can tell its reader that a second reader exists.

## What the audit's subject IS and IS NOT

**The founder narrowed it to CODE ONLY (ruling 2026-08-10).** The auditor reads the record purely as
the list of claims to test against the tree, and raises no finding about the record itself - not its
counts, not its citations, not its phrasing. The prompt says so in the contract's own words.

**The change-set instrument, in the prompt:**

```
git diff 926d170d5af6becb1f371e36c4b8099caa131429...HEAD -- src supabase tests .github package.json bun.lockb tsconfig.json vitest.config.ts
```

`HEAD` rather than a pinned sha, deliberately and with the reason stated in the prompt: every commit
after `42d678a` touches `loop/items/` only, so the code-territory change-set is fixed whichever of
those commits `HEAD` names. **22 files**, listed in the prompt as scope box S1.

**ONE CHANGE SITS OUTSIDE THE CODE TERRITORY AND IS DECLARED IN THE PROMPT AS SUCH:** the one-line
ride-along in `.claude/agents/reviewer-runner.md`. The territory filter excludes it by construction,
so it is not in the auditor's change-set and the auditor is not asked to grade it. It is named so
that a full `git diff --name-only` showing 23 files reads as declared rather than as scope leakage.

## The claim checklist the prompt carries

Enumerated and testable, never a paragraph:

- **The path-set**, all 22 files, as scope box S1, with the claim that nothing under `src/` is
  touched.
- **R-GROUP 1** - the eleven plan-stage rulings. Six are boxes with a code footprint; **the two with
  no code footprint are named as such so the auditor does not hunt the tree for them.**
- **R-GROUP 2** - the eight first-code-stage rulings, as boxes, each naming what is deliberately NOT
  touched beside it.
- **R-GROUP 3** - the nine second-code-stage rulings: six with a code footprint, one record-only, and
  **both dismissals stated as claims of their own**, so a fix that "helpfully" appeared anyway reads
  as a finding.
- **TWO SUPERSESSIONS ARE STATED EXPLICITLY**, because a checklist that hid them would make a correct
  tree look like a ruling not implemented as ruled: gate-1 ruling 8's clause 2 had its grant
  instrument replaced by slice-2 ruling 2, and its clause 3 was widened by slice-2 ruling 3. The
  prompt tells the auditor to grade the CURRENT wording.
- **Twelve stated facts about the code**, F1 to F12, each independently checkable by reading.
- **Six item-specific attack directions**, additive.
- **Twelve stated non-claims**, offered for attack rather than as exemptions, with the instruction
  that finding one UNDERSTATED is itself a finding.

## What the sitting after the audit must know

1. **Rule findings from BOTH readers together.** A clean seat beside a seat with findings is
   evidence, never a veto, and its clean verdict is recorded among the dispositions. Where the two
   converge on one defect, rule it once and note the convergence.
2. **If fixes change code, the audit re-runs ONCE at the new head, scoped to the fix delta** -
   both readers, never one seat. That sitting must name the fix delta and rebuild the claim
   checklist. The re-run is unused so far.
3. **Three integration-tier done-criteria are BLOCKED, not met, and no ruling may quietly convert
   them.** Step 11's migration proof (the slot evidence line, which does not exist), step 16's third
   criterion (the arm passing on the real list), and step 17's both-tiers exact match. The loop half
   of step 17 IS met and exact.
4. **`main` had moved to `160042c` as of slice 2's draft sitting.** The branch has not taken main in.
   **The merge sitting decides whether to merge main in; no sitting before it should.**
5. **The sitting sequence for this item is now:** plan → draft (slice 1) → fix and goal (slice 1) →
   draft (slice 2) → fix and goal (slice 2) → **audit** → merge.

---

# 5. STANDING ITEMS THE MERGE RULING MUST CARRY

## The pull request body, for the mechanical who writes it at merge

The pull request closes **AI4DEV-66** through its own branch link. **The partner item closes through
the one sanctioned batch line**, per `CLAUDE.md` and the reference guard in `.github/workflows/ci.yml`:

- one line, of exactly the shape `Closes AI4DEV-67`, alone on its line, nothing else on it;
- at most one such line in the whole body;
- **it is added by the MERGE ruling's mechanical, not before**;
- **and gate-1 ruling 3 makes it CONDITIONAL**: the line is added **only if** the founder has
  answered open question 1 - by ratifying a D5 wiring leaf for the screens the way D2 has one, or by
  ruling AT-001.24's browser half out of that item. **With no founder answer the line is OMITTED**,
  the partner item stays open, and the merge ruling states why.
- No other item id may appear anywhere in the title or body. Name other items in words.
- The body lists the ride-along under "rides along".

## The two open questions for the founder - still unanswered

1. **AT-001.24 asks for a browser behaviour this pull request is forbidden to build.** CI fails any
   change touching both `src/` and this change's territory, there are no screens to guard, and D5.L2
   has no wiring leaf the way D2 does. **Proposed:** land the decision and the API-level denials
   here, declare the id capability-pending at integration tier, and file a D5 wiring leaf. The
   founder may instead prefer to hold AT-001.24 out of that item entirely. Slice 2 built exactly what
   that proposal describes.
2. **Most of the data the criteria enumerate does not exist.** Drafts, ledger, files, thread and
   tasks belong to requirements that have not landed. **Proposed:** isolate every kind that does
   exist, land the catalog conformance arm so a later requirement's table cannot arrive unisolated,
   and name the absent kinds in the merge ruling. The arm is built and has never seen a real catalog.

Neither blocked either code gate. Both must be answered before the partner item can close.

## Residuals for the merge ruling

1. **Timing is not defended.** The claim is about response content and status, never response time.
2. **AT-001.21 and AT-001.22 are `ui`-tagged, not UI-proved.** No screen exists.
3. **Only the dashboard kind of tenant data exists.** Drafts, ledger, files and thread do not.
4. **The public project surface reveals that a project exists**, deliberately.
5. **RETIRED BY SLICE 2.** `visibility.ts`'s platform-admin branch now has a unit oracle AND an
   acceptance test driving it through a surface at both tiers.
6. **RETIRED BY SLICE 2.** `publicSchemaCatalog` now has a consumer.
7. **The read-fault arm is loop tier only.** No fault is injected into a real database.
8. **The loop-tier Data API arms grade the fixture's MIRROR of the policy set, not the migrations.**
   Item claim 1 - "a green grades shipped code rather than a copy of it" - holds for the edge-surface
   arms and NOT for the probe arms at loop tier.
9. **The `readRows` fix is proved by reading, not by a test.** No test program imports `edge.ts`.
10. **The four Data API positive controls are a BRACKET, not a proof.**
11. **Nothing imports the route registry and no router obeys it.** A router EXISTS (`src/router.tsx`)
    and consults nothing; this is a declaration plus a test that fails when a route arrives
    undeclared, not a redirect that runs.
12. **The catalog conformance arm does not prove a declared predicate is CORRECT.** It proves a table
    is declared, reachable only as declared, row-level security is on, the rightful tenant is
    admitted, and no policy is literally `true`. **A semantically open predicate naming an approved
    identifier still satisfies it** - `using (org_id = org_id)`, and the reviewer's sharper example,
    `using (id is not null)` on `organizations`, where `id` is a primary key. **This was attacked at
    the code gate and the attack was dismissed with reasons** (slice-2 ruling 4): there is no sound
    syntactic test for semantic openness, a blacklist of spellings would be a guard that looks like a
    check, and the sound instrument is the acceptance denial arms, which bracket it from the other
    side.
13. **The catalog selftest's "real shaped catalog" is a HAND-WRITTEN PREDICTION** of what the two
    migrations leave in `pg_policies`, deparsed `qual` strings included - now including the
    assigned-developer policy's new conjunct. Only the integration tier grades it.
14. **A request carrying no `Authorization` header is not expressible against the two authenticated
    functions.** Both declare `verify_jwt = true`.
15. **NEW - whether the Data API accepts a revoked-but-unexpired access token is UNMEASURED.** The
    live adapter deliberately retains a session's tokens after `signOut`, and PostgREST judges a
    token by signature and expiry rather than by a session store, so a signed-out caller may be
    answered as that user at the integration tier where the fixture answers 401. AT-001.24 refuses at
    that tier, so nothing in this branch grades it. **The loop-tier equality between the
    never-signed-in caller and the signed-out caller is the fixture's model, and the never-signed-in
    half alone is sound at both tiers.**
16. **NEW - `has_table_privilege` errors if the role name does not exist.** That is deliberate - a
    loud failure beats a silent absence - and it has never been executed.
17. **NEW - the account-type conjunct on the assigned-developer policy is a READ-side repair of a
    WRITE-side gap.** The developer seat still accepts any account type at write time.
18. **THE INTEGRATION TIER HAS NOT RUN.** Section 1. This is the one that blocks merge.

## Rides along

**One line in `.claude/agents/reviewer-runner.md`** (slice-1 gate-2 ruling 8, commit `50d0daa`). That
file told the runner to report any tool outside `read`, `glob` and `grep` as an INVALID RUN, while
`.opencode/agent/reviewer-flash.md` grants `gitdiff: true` deliberately. `gitdiff` is now on the list
with its reason. **This gate proved it was worth landing: slice 2's flash run made 17 `gitdiff`
calls, and a runner obeying the old letter would have discarded a valid review.** Named in `plan.md`
under "Rides along", and it must be named in the pull request body. Slice 2 and this sitting added no
ride-along of their own.

## Filing candidates for the founder - suggestions only, at close-out

The coordinator suggests filings at close-out and **only the founder creates items.**

1. **Six pre-existing vacuous-pass seams** - `c-membership-and-acknowledgment.test.ts` 106, 189, 364;
   `f-lifecycle-and-audit.test.ts` 69; `_integration.ts` two sites. They predate this change at
   `926d170`. This item guarded the nine it ADDED and left these alone deliberately.
2. **`_bind.ts` line 31 says "the 33 not-yet-landed ids"** - stale before this item.
3. **NEW - the developer seat accepts any account type at WRITE time.** `public.org_memberships` is
   guarded by a trigger that refuses a non-NGO grantee; `public.projects.assigned_volunteer_id` has
   no equivalent. Slice-2 ruling 1 repaired the READ side inside this item's own migration and
   deliberately did not add a trigger to a pre-existing table - that belongs to the item that owns
   the developer seat, and this item's decision H says only READ members are added.
4. **NEW - a revoked access token may keep reading the Data API until it expires.** If PostgREST
   accepts a revoked-but-unexpired token, a signed-out NGO admin keeps reading its own organisation
   for the remainder of the token's life. That is a product question about token lifetime and
   revocation reaching PostgREST. Not buildable without the blocked tier, and it touches no file this
   item claims.

## Two measurement traps, carried forward

1. **PowerShell 5.1's `Get-Content -Raw` reads with the system ANSI codepage.** Use
   `[System.IO.File]::ReadAllText(path, [System.Text.Encoding]::UTF8)`, and compare files with
   `ReadAllBytes` plus `SequenceEqual` rather than by length.
2. **PowerShell 5.1 re-splits a here-string commit message containing double quotes** before passing
   it to `git.exe`; use `git commit -F <file>`. **And `Set-Content -Encoding utf8` writes a
   BYTE-ORDER MARK**, which `git commit -F` then puts at the front of the commit subject - commit
   `2769e7b` carries one. Write the message file with
   `[System.IO.File]::WriteAllText(path, text, [System.Text.UTF8Encoding]::new($false))`.
