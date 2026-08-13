# THE MERGE RULING - AI4DEV-66 (cross-org denial, no existence oracle), batched with AI4DEV-67 (assigned volunteer, admin, stranger)

Written by the MERGE sitting, orchestrator on **opus @ max**, 2026-08-13.

Branch `nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`.
Pull request **#57**. **Pinned to head `d4f7835ea0f2d42e6a0d4aac49022186049e9e08`.**

## THE MODEL RULING FOR THIS RUN - CARRIED FORWARD

The founder ruled (relayed 2026-08-12, restated 2026-08-13) that **every orchestrator sitting of
this item runs as `orchestrator-opus` at opus/max effort**. This sitting is **ALSO opus by design,
independently of that ruling**: the orchestrator contract makes the MERGE sitting an opus sitting.
Both reasons hold at once. **Neither is a fallback for missing credit.**

---

# 0. THE RULING, FIRST, IN ONE PARAGRAPH

**THE MERGE IS BLOCKED. I DO NOT MERGE, AND I DO NOT SPAWN A MERGE MECHANICAL.**

The required continuous-integration check is GREEN on the exact final head, and I confirmed that
myself. **A green check is necessary and it is not sufficient.** My contract requires this ruling to
state **both tiers' exact-match results**. The loop tier is exact and I have machine-run evidence for
it on this exact head. **The integration tier has never run at any head of this branch, so the second
half of the evidence does not exist**, and the required check cannot supply it - I verified that
`.github/workflows/ci.yml` never names the integration tier at all.

**One question blocks this ruling and only one: the infrastructure block.** The founder either clears
the database stack so the integration tier can run, or explicitly accepts loop-only evidence for this
item. **I state that choice. I do not make it.** Section 8 sets out what I would decide under each
answer, and section 9 records what each answer costs, so the choice is made on facts rather than on
fatigue.

**The two open plan-sitting questions do NOT block this ruling**, and section 7 says exactly why. They
are already disposed of by rulings this item made: question 1 by gate-1 ruling 3, which gives a
determinate default; question 2 by decision E, gate-1 ruling 2 and residual 3. I apply both here.

---

# 1. THE REQUIRED CHECK - CONFIRMED FIRST-HAND, AND WHAT IT PROVES

I re-checked rather than inheriting the conductor's report.

| fact | value |
|---|---|
| workflow | `CI`, check name `verify` |
| run id | **31661003643** |
| status / conclusion | `completed` / **`success`** |
| head sha | **`d4f7835ea0f2d42e6a0d4aac49022186049e9e08`** |
| created / updated | 2026-08-13T02:29:59Z / 2026-08-13T02:30:55Z |
| steps | **16, every one `success`** |
| pull request rollup | one check run, `verify`, `SUCCESS` |
| mergeability | `MERGEABLE`, `mergeStateStatus: CLEAN` |

**The head is the right head, and I proved the branch tip, the remote tip and the check's sha are one
value.** Local `HEAD`, `git ls-remote` for this branch, and the run's `headSha` are all
`d4f7835ea0f2d42e6a0d4aac49022186049e9e08`. The working tree is clean.

**THE LAST COMMIT THAT TOUCHES CODE IS `5da2e22`, AND I VERIFIED THE CLAIM RATHER THAN ACCEPTING IT.**
`git diff --name-only 5da2e22 d4f7835` returns exactly one path,
`loop/items/AI4DEV-66/PHASE-STATE.md`. No file under `supabase/`, `tests/` or `src/` moved after the
final code head. So the check's green and the code it grades are the same thing.

## What the sixteen steps actually did

The check is not a formality and it is worth naming what it ran: the orchestrator twin-drift guard
(`SYNCED - 258 body lines identical apart from the declared differences`), the code-scope decision,
a type-check of both TypeScript projects, the acceptance-harness self-tests, the acceptance-file
bijection check for every discovered suite, the loop-tier verification of every declared
requirement, the territory guard, and the item-reference guard.

**Two of those are worth quoting, because they are this item's own claims being graded by a machine
that has no stake in them:**

```
at:check req-001 — 37 P0 in the acceptance file, 37 registered in the suite
RESULT: 37 P0 ids in bijection
```

```
37 P0: 26 green, 11 red, 0 missing
EXPECTED: the run matches .../tests/at/expected/req-001.json exactly (26 declared green, 11 declared red)
```

**AND THE FIVE IDS THIS ITEM OWNS ARE GREEN IN THAT RUN, BY NAME:**

```
AT-001.21    green    one NGO cannot reach another NGO non-public data by UI or by direct id probing
AT-001.22    green    an unassigned volunteer is denied a project non-public data while the public page stays visible
AT-001.23    green    the assigned volunteer reaches that project working data, scoped to that project only
AT-001.40    green    a platform admin reaches any NGO or project data — the admin role spans all accounts
AT-001.24    green    a logged-out visitor renders public surfaces only; authenticated surfaces redirect to sign-in
```

## WHAT THE CHECK DOES NOT CLAIM, AND THIS IS THE HALF THE RULING TURNS ON

**`.github/workflows/ci.yml` NEVER RUNS THE INTEGRATION TIER. I MEASURED IT.** A search for
`integration` across the whole workflow file returns exactly one line, and it is a comment about the
sanctioned batch closes-line - not a step, not a job, not a command. The workflow's verification step
is `bun run at:verify "$req" --tier loop --expect` and nothing else.

**So the green is a loop-tier green, by construction.** The orchestrator contract already says why -
the required check holds no database slot - and this run is the direct evidence for it rather than a
restatement of it. **No amount of green on this check can supply the missing half.**

**The check also never parses either migration.** No step in those sixteen reads a `.sql` file. The
type-checker does not; the bijection check does not; the loop tier runs against a fixture. This is
stated here because it is easy to read "sixteen steps, all green" as broader coverage than it is.

---

# 2. BOTH TIERS - ONE EXACT, ONE ABSENT

My contract requires tier, requirement and exit code for every declaration manifest, and for the
integration tier the runner's own slot evidence line naming the slot, the reset and the migration
count.

## LOOP TIER - EXACT MATCH, AND THE WITNESS IS INDEPENDENT

| manifest | tier | command | exit | result |
|---|---|---|---|---|
| `req-001` | loop | `bun run at:verify req-001 --tier loop --expect` | **0** | **26 green / 11 red / 0 missing - EXACT MATCH** |
| `req-016` | loop | `bun run at:verify req-016 --tier loop --expect` | **0** | 11 green / 1 red / 0 missing - exact match |

Supporting runs in the same check: `bun run typecheck` exit 0; `bun run at:check req-001` exit 0 with
37 P0 ids in bijection; `bun run at:check req-016` exit 0 with 12 in bijection; the harness
self-tests green.

**I take these numbers from the CONTINUOUS-INTEGRATION RUN ON THIS EXACT HEAD, not from the
executor's report of its own local run.** That is a deliberate choice and it is the stronger
evidence: the executor's four runs at the final code head are recorded in `PHASE-STATE.md` and agree
with these figures exactly, but they were made by the actor that wrote the code, on the machine that
wrote it. The check ran the same commands on a clean checkout on somebody else's machine and got the
same answer. **Two independent measurements agreeing is what makes this half of the evidence real.**

## INTEGRATION TIER - IT HAS NEVER RUN. THERE IS NO RESULT TO STATE.

| manifest | tier | command | exit | result |
|---|---|---|---|---|
| `req-001` | integration | `bun run at:verify req-001 --tier integration --expect` | **3** | **INFRASTRUCTURE. Zero tests executed. Nothing graded.** |

**One attempt, ever, by slice 1's draft sitting, at head `b247772`, lasting about five seconds.** The
runner's own words, from `artifacts/integration-attempt.txt`:

```
at:verify req-001 --tier integration — INFRASTRUCTURE: slot 1 could not be prepared: slot 1
reported no running stack (the stack reports stopped services: supabase_kong_ai4good-slot-1,
supabase_edge_runtime_ai4good-slot-1 — start them before running the suite), so nothing was
reset and nothing was run
```

**THERE IS NO SLOT EVIDENCE LINE TO CARRY, AND THAT ABSENCE IS ITSELF THE EVIDENCE.** My contract
asks for the runner's line naming the slot, the reset and the migration count. That line is printed
BY the reset. The run was refused before the reset, so no such line exists anywhere in this item's
record. **I record the absence rather than describing the block in words that could be mistaken for a
result.**

**The cause is a machine fault and only the founder can clear it:** the gateway container cannot bind
its API port (Windows holds it reserved) and the edge-function container fails to mount its entry
file.

**NO REMEDIATION WAS ATTEMPTED BY ANY SITTING, INCLUDING THIS ONE.** No container started, stopped,
rebuilt or reconfigured; no port changed; no `supabase/config.toml` edit for the stack; no
`AT_DB_SLOT` override; and `supabase db reset` never run, directly or through any wrapper (gate-1
ruling 10). One attempt is spent and this sitting made none.

---

# 3. WHAT WAS BUILT

**Twenty-three files outside the item's own record, and not one of them under `src/`.** The change-set
against merge-base `926d170`:

**Shipped decision code (3 modules, 3 edge functions, 1 config):**
`supabase/functions/_shared/visibility.ts` - the tenant-read rule, the public projection, and the one
refusal constant `TENANT_NOT_FOUND`; `supabase/functions/_shared/route-visibility.ts` - the route
declaration and the pure `undeclaredRoutes`; `supabase/functions/_shared/edge.ts` - `readRows` and
its rejected-`fetch` containment; `organization-dashboard`, `project-workspace` and
`public-project-page` (the repository's first `verify_jwt = false` block); `supabase/config.toml`.

**Two migrations - the first row-level-security policies in this repository:**
`20260812120000_tenant_isolation_policy_set.sql` (the `viewer_is_org_member` helper, the
organisation-member select policies on the four tenant tables, the grants) and
`20260813120000_tenant_visibility_volunteer_and_admin.sql` (`viewer_is_platform_admin`,
`viewer_is_volunteer`, the assigned-volunteer policy and the four platform-admin policies).

**Test bodies at both tiers for five acceptance ids**, three conformance instruments
(`_route-scan.ts`, `_catalog-conformance.ts`, `_source-scan.ts`), three shipped-code self-tests, both
adapters (`_fixture.ts`, `_live.ts`), the contract surface, and the declaration manifest.

**The structural claim, stated once:** the no-existence-oracle property is a property of two answers
being identical, so one exported constant is the answer every non-public surface returns both for a
row that does not exist and for a row that is not yours. There is nowhere in the surface to put a
second refusal. The tests compare the two responses rather than assert that both refused.

---

# 4. EVERY FINDING AND ITS DISPOSITION

**Five reviewer gates ran. Thirty-seven reviewer findings. Thirty-six adopted, one dismissed with a
written reason.** Every claim is quoted exactly beside its ruling in the five rulings files; this is
the index, not a replacement for them.

| gate | readers, pinned | findings | adopted | dismissed | rulings file |
|---|---|---|---|---|---|
| PLAN | `gpt-5.6-sol` via codex, effort xhigh, sandbox read-only | 11 | **11** | 0 | `rulings-gate1.md` |
| CODE, slice 1 | `gpt-5.6-terra` (codex, max) **5** + `deepseek-v4-flash` (opencode, max) **2** | 7 | **7** | 0 | `rulings-gate2.md` |
| CODE, slice 2 | `gpt-5.6-terra` **7** + `deepseek-v4-flash` **1** | 8 | **7** | **1** | `rulings-gate2-slice2.md` |
| AUDIT | `gpt-5.6-luna` (codex, max) **6** + `deepseek-v4-flash` **2** | 8 | **8** (7 rulings) | 0 | `rulings-audit.md` |
| AUDIT RE-RUN | `gpt-5.6-luna` **2** + `deepseek-v4-flash` **1** | 3 | **3** (2 rulings) | 0 | `rulings-audit-rerun.md` |

**Every gate was a real gate.** No gate was skipped, no gate came back empty, and no seat was recorded
as clean that was not. Both audit seats and both code-gate seats returned findings at every stage
except where noted, so no clean seat was ever used as a veto over a seat with findings.

## THE PANEL CONVERGED THREE TIMES, AND THAT IS THE STRONGEST SIGNAL A BLIND PANEL GIVES

Two readers, each blind to the other, independently naming one defect:

1. **Code gate, slice 1** - the `organizationId === null` early return can end a body as a silent
   pass. Terra medium, flash low. Ruled once, as slice-1 ruling 4.
2. **Code gate, slice 1** - the loop Data API green grades the fixture's mirror, not the migration.
   Terra medium, flash low. Ruled once, as slice-1 ruling 2.
3. **Audit** - stated fact F9: `route-visibility.ts` says nothing imports it and two files do. Both
   seats graded F9 FAIL. Ruled once, as audit ruling A3. **Seat 2 traced the same false statement
   further than seat 1 did, into `plan.md` and `PHASE-STATE.md`.**
4. **Audit re-run** - the corrected contract sentence cites a line its own sibling fix moved. Both
   seats, same file, same wrong line, same right one. Ruled once, as re-run ruling R2.

That is four convergences across two panels. Each was checked to be genuinely ONE defect before
being merged into a single ruling, rather than assumed from a shared file path.

## THE ADOPTIONS THAT CHANGED THE PRODUCT, NOT ONLY THE RECORD

- **Gate-1 ruling 4** - the target row is read LAST in every non-public handler, so an outage answer
  cannot depend on whether the target exists. The condition is removed by construction rather than
  measured.
- **Gate-1 ruling 6** - the two `security definer` policy helpers get `set search_path = ''` and an
  explicit `grant execute ... to authenticated`. **Copying the existing service-role-only posture
  would have broken every policy**, because a policy expression is evaluated as the querying role.
- **Gate-1 ruling 7** - the policy set splits by BRANCH across two migrations, so a slice never ships
  a policy branch it does not test.
- **Gate-1 ruling 10** - step 5's `supabase db reset` is removed. The identity-proving pool path is
  the only reset. This is the most dangerous of the eleven: on 2026-08-09 a `db reset` aimed at slot
  2 destroyed the founder's personal database.
- **Slice-1 ruling 1** - `readRows`'s rejected `fetch` is contained, so a transport failure can no
  longer leak the internal REST URL through `edgeHandler`'s error detail.
- **Slice-1 ruling 3** - four Data API positive controls where one existed, so three policies stop
  carrying a denial with nothing behind it.
- **Slice-1 ruling 5** - `tenantReadAllowed`'s scope dispatch becomes exhaustive and fails closed,
  with a self-test driving thirteen non-scope values. Before it, an unrecognised scope **widened**
  access to the project branch.
- **Slice-2 ruling 1** - the assigned-volunteer policy gains `public.viewer_is_volunteer()`, because
  the developer seat is a bare foreign key with no account-type guard while the membership seat has
  a trigger. **This measurement was the orchestrator's, not either reader's**, and it is what
  separated a real asymmetry from a theoretical one.
- **Slice-2 ruling 2** - the catalog witness drops `information_schema.role_table_grants` for
  `has_table_privilege`, because the view omits grants to `PUBLIC` by documented design.
- **Slice-2 ruling 3** - the conformance arm starts checking that row-level security is actually ON.
  A policy on a table with it off is inert. **The best of the eight findings.**
- **Slice-2 ruling 5** - AT-001.40's Data API arms extend from one table to four.
- **Audit ruling A2** - AT-001.40's four non-administrator controls gain a positive assertion, so
  they can no longer pass on an empty result.
- **Audit ruling A6** - the catalog witness's `relkind` filter widens to `('r', 'p')`, so a
  partitioned tenant table cannot be silently absent from the arm.

## THE ONE DISMISSAL, AND THE PARTIAL REJECTIONS

**Slice-2 finding [4] is the only finding dismissed outright** - terra's claim that the trivially-open
check recognises only the literal `true`, so `using (id is not null)` passes. **The claim is TRUE and
the dismissal is of the finding, not of the fact**: the module declares the limit in the paragraph a
reader meets before any code, decision E states the same non-claim, and residual 12 carries it. Three
reasons no code changed: there is no sound syntactic test for semantic openness, so any strengthening
would be a bypassable blacklist; the sound instrument is the runtime denial arms; and nothing here is
a false stated fact. **Terra's claim is reproduced verbatim in section 5 and must reach the pull
request.**

**Clauses rejected inside otherwise-adopted findings**, each with its reason in the record: gate-1
[3]'s reading of the CI territory guard as an authority over board scope; slice-1 [1]'s "existence
oracle" characterisation and its proposed live settlement; slice-1 [2]'s remedy of delegating the
fixture's mirror to `tenantReadAllowed`, **which would have made the fixture wrong**, because the SQL
helper and the module are genuinely different rules; slice-2 [1]'s and [7]'s proposed live
settlements; slice-2 [6]'s "false failure" characterisation; and re-run R1's request to verify a
relationship query this branch does not issue.

## THE DISPUTE RIGHT PAID THREE TIMES, AND NEVER THROUGH A REVIEWER

**The orchestrator's own rulings were wrong three times on this item, and the executor caught all
three before writing a line.**

1. **Slice-2 ruling 9** - ruling 6 claimed an exhaustive fix list on the strength of a search for two
   exact phrases. The same two claims survived in different words in
   `shipped-route-visibility.selftest.ts`. The executor found it, reported it, and **did not touch
   it**.
2. **Audit ruling A4** - the ruling cited `shipped-visibility.selftest.ts:192` as the site reaching
   the fail-closed branch. That line returns at `visibility.ts:176` before any scope is read. **The
   executor refused to implement the ruling and disputed it.** It was upheld; the citation moved to
   lines 163-187 and the conclusion stood.
3. **Audit re-run section 7** - the re-run ruling forbade decaying line-number citations and cited
   three decaying line numbers inside itself, which the same sitting invalidated within the hour by
   inserting a pointer block above them. The executor tripped over it and reported. **Its specific
   claim - a fourth stale citation - was rejected on a re-measurement, and the defect underneath it
   was accepted as the orchestrator's own.**

**This is recorded as evidence that the dispute right is not ceremony.** Had the executor adapted any
of the three quietly, a false citation would have been laundered into a comment that looked verified.
**The record would be worse in three places if the executor had only reported what turned out to be
true.**

## A FOURTH RECORD DEFECT, FOUND BY THIS SITTING, AND IT IS A COUNT

**`rulings-gate2-slice2.md`'s own header says "Eight findings. Six adopted, two dismissed with
written reasons." That is wrong: the body shows SEVEN adopted and ONE dismissed.** Findings [1],
[2], [3], [5], [6], [7] and [8] each carry an ACCEPT; only [4] carries a DISMISS. The same file's
executor section confirms it from the other side: "Rulings 1, 2, 3, 5, 6, 7 and 8 landed across eight
commits" - seven.

**I re-counted twice before writing this, because a counting claim about a counting error is the
worst possible place to be wrong.** The header undercounts adoptions by one and overcounts
dismissals by one. **The rulings themselves are unaffected** - every one of the eight has an explicit
disposition in its own section, and the executor implemented the seven. Only the summary line is
wrong.

**This is the fourth defect in this item's own record and the first that no executor caught**, because
it never gated any writing - a summary line is read by people, not applied by anyone. **It is
corrected here rather than in that file**, on the same principle the item has applied throughout: a
record that rewrites itself cannot be audited. The count that governs is the one in this section:
**37 reviewer findings, 36 adopted, 1 dismissed.**

---

# 5. MAINTAINED REVIEWER DISAGREEMENT - VERBATIM, AND IT MUST REACH THE PULL REQUEST

My contract requires a rejected finding's claim to go verbatim into the pull request. **Neither claim
below names any item id, so the elision rule does not apply and both are reproduced complete.**

## [A] terra, slice-2 finding [4] - DISMISSED

> claim: "The "trivially open" check only recognises literal `true`, so semantic tautologies pass
> when they contain an approved identifier."
> why it matters: "On `organizations`, `using (id is not null)` admits every row because `id` is a
> primary key, yet it is not literal `true` and satisfies `namesIdentifier(..., 'id')`; the
> conformance arm reports it clean."
> unverified-runtime-claim: no

**My ruling stands: the claim is true, the finding is dismissed, and the limit is a declared
non-claim rather than a defect.** Residual 12 carries terra's sharper example beside the one the
module already gave.

## [B] terra, slice-2 finding [6], the half I rejected in writing

> claim: "The route classifier uses a double-underscore layout convention that conflicts with this
> repository's TanStack routing conventions."
> why it matters: "`src/routes/__root.tsx` is an actual generated root route/app shell but is
> silently excluded, while the documented `_layout.tsx` convention would be treated as an undeclared
> route. This can produce both a false green and a false failure; the new comments also incorrectly
> say no router exists despite `src/router.tsx`."
> unverified-runtime-claim: no

**Both stated-fact halves were ADOPTED** - a router does exist, and the double-underscore convention
was invented - and both comments were corrected. **The "false failure" characterisation is
REJECTED**: treating a single-underscore layout file as a route that must be declared is the
dictated, fail-closed behaviour, not a failure. No such file exists today, and the day one arrives
the build asks a person a question rather than exempting it on a naming convention. **The dictation
stands, second time of asking.**

---

# 6. WHAT THE GREEN CLAIMS, AND WHAT IT DOES NOT

## IT CLAIMS

At loop tier, exact-matched and independently re-run by the required check on this exact head: that
the shipped decision module denies across the tenant boundary and grants inside it; that a denial and
an absence are the same answer, compared as whole responses rather than as two refusals; that an
unassigned volunteer is refused a project's non-public data while the public surface answers; that
the assigned volunteer's reach is scoped to its own project; that a platform admin reaches two
tenants where a non-administrator is refused; that every non-public API surface refuses an anonymous
caller; and that every route in the tree is declared public or authenticated.

**For the edge-surface arms the green grades SHIPPED CODE**, because the loop adapter delegates its
judgement to `visibility.ts` rather than reimplementing it.

## IT DOES NOT CLAIM - AND THIS IS THE LIST THAT MATTERS

- **THE ENTIRE DATABASE-ENFORCEMENT HALF IS UNGRADED.** Neither migration has ever been applied
  anywhere. **Nothing has parsed either file** - not the type-checker, not the bijection check, not
  the required check, which reads no `.sql` at all. No policy in either has ever been evaluated. All
  three `security definer` helpers are unexecuted.
- **The three edge functions have never served a request**, at any tier.
- **For the Data API probe arms the loop green grades the fixture's MIRROR of the policy set, not the
  migrations** (residual 8). Item claim 1 - "a green grades shipped code rather than a copy of it" -
  **holds for the edge-surface arms and NOT for the probe arms at loop tier.** I state that in the
  words slice-1 ruling 2 dictated.
- **`publicSchemaCatalog`'s query has never been executed in ANY form** - not the original, not
  slice-2 ruling 2's `has_table_privilege` replacement, not audit ruling A6's widened `relkind`.
  Each is a better ungraded query replacing a worse ungraded one.
- **AT-001.40's four extended non-administrator controls (audit ruling A2) have never run.**
- **The catalog selftest's "real shaped catalog" is a HAND-WRITTEN PREDICTION** of what the two
  migrations leave in `pg_policies`, deparsed `qual` strings included. Only the integration tier
  grades it.
- **The four Data API positive controls are a BRACKET, not a proof.** They prove each policy is not
  universally denying and admits the rightful tenant. They do not prove it is keyed correctly.
- **The catalog conformance arm does not prove a declared predicate is CORRECT.** A semantically open
  predicate naming an approved identifier still satisfies it. See section 5 [A].
- **`readRows`'s containment fix is proved by READING, not by a test.** No test program imports
  `edge.ts`. **`edge.ts:8` states this in the code and THAT STATEMENT IS UNVERIFIED** - no sitting of
  this item measured it, and the ruling says so rather than implying it was checked.
- **No browser behaviour, at all.** AT-001.21 and AT-001.22 are `ui`-tagged, not UI-proved.
  AT-001.24 is capability-pending at integration tier under `ui.logged-out-surface-rendering`. No
  screen exists and `src/` is another territory. **The route registry is a declaration and a test,
  not a redirect that runs.**
- **Only the dashboard kind of tenant data exists.** Drafts, ledger, files, thread and tasks belong
  to requirements that have not landed - this is open question 2, and section 7 disposes of it.
- **Timing is not defended.** The claim is about response content and status, never response time.
- **No fault is injected into a real database.** The read-fault arm is loop tier only, and it covers
  the two AUTHENTICATED surfaces only - it cannot cover the public surface, because its comparison
  needs an existing-but-FOREIGN target and nothing is foreign there.
- **Whether the Data API accepts a revoked-but-unexpired access token is UNMEASURED**, and nothing in
  this branch will grade it.

---

# 7. THE TWO OPEN PLAN-SITTING QUESTIONS DO NOT BLOCK THIS RULING - HERE IS WHY

The coordinator relayed that either question could bear on the merge. **I have checked both against
the record and neither blocks. I say which, precisely, rather than leaving it as "probably fine".**

## QUESTION 1 - AT-001.24's browser half. NOT BLOCKING. Already ruled, with a determinate default.

**Gate-1 ruling 3 made the batch partner's closes-line CONDITIONAL and wrote down what happens when
there is no answer:** "With no founder answer, the line is omitted, the partner item stays open, and
the merge ruling states why." That is not a gap waiting on the founder - **it is a rule with a
defined default, and I apply the default.**

**So my decision on the pull-request body is determined by an existing ruling of this item, not by a
new founder answer.** Section 10 records it: **the `Closes AI4DEV-67` line is OMITTED.**

**The consequence, stated plainly rather than glossed:** whenever this merges, AI4DEV-66 closes
through its own branch link and **AI4DEV-67 stays OPEN with its work landed.** That board state was
chosen deliberately over closing an item whose browser half was never built or observed. It is
coherent and it is the safer direction: an open item with landed work is visible and correctable, and
a wrongly-closed item is neither.

## QUESTION 2 - the data kinds the criteria enumerate that do not exist. NOT BLOCKING. Disposed of here.

**Decision E, gate-1 ruling 2 and residual 3 already settle the treatment**, and the proposal was
that the merge ruling name the absent kinds. **I do that now, with the requirement that owns each:**

| data kind the criteria enumerate | exists in this tree? | owned by |
|---|---|---|
| the dashboard kind - an organisation, its projects, its membership, its acknowledgments | **YES**, and this item isolates all four tables | REQ-001 |
| drafts | no | REQ-005 |
| ledger | no | REQ-006 |
| files, thread, tasks | no | REQ-010 and the requirements above |

**And the absence is made self-correcting rather than merely noted.** The catalog conformance arm
requires every table in `public` to appear in exactly one of two declared lists, so a table arriving
with a later requirement fails the build until somebody classifies it. **That arm is built and has
never seen a real catalog**, which is one more thing the integration tier owes.

**No leaf below this one re-checks isolation of a table that lands later**, which is exactly why the
arm exists: gate-1 ruling 2 verified that D5.L1 and D5.L2 are the only leaves owning these five ids.

---

# 8. THE INFRASTRUCTURE BLOCK - THE ONE THING THAT BLOCKS ME, AND WHAT I WOULD DECIDE

## Why I cannot rule around it

**Three independent authorities say the same thing, and they do not depend on each other.**

1. **My own contract.** "Both tiers means the loop result AND the integration result for every
   declaration manifest ... **A ruling that states only the loop result is stating a green against
   stand-ins**, and the required check cannot supply the other half because CI holds no database
   slot." The integration result does not exist. I cannot state it, and I may not omit it.
2. **The shared invariant on loosening.** "A rule that LOOSENS the process needs a real, explicit
   founder ruling. Tightening may be proposed; **loosening may never be inferred**." Waiving the
   integration half is a loosening. The founder's silence is not an answer, and a green check is not
   an answer either.
3. **This item's own record**, in five consecutive sittings, each adding a reason to the same
   blocker rather than a new one. I hold the authority to overturn an earlier sitting of this item -
   **and overturning would need a reason.** The only fact that has changed since is the CI green, and
   that is precisely the fact the record already ruled cannot substitute. **I have now verified that
   ruling is correct on the facts** (section 1): the workflow never runs the integration tier.

**I reject the one argument that could carry a merge, and I name it so nobody has to reconstruct it.**
The argument is: "the green is the only merge licence, I have the green, so I may merge." **The green
is necessary, not sufficient.** My contract makes it a precondition for merging and separately
requires the ruling to state both tiers. A satisfied precondition is not a satisfied gate.

## WHAT I WOULD DECIDE, UNDER EACH ANSWER

**IF THE FOUNDER CLEARS THE DATABASE STACK:** the integration tier runs, once, through the guarded
pool path - no hand reset, no `AT_DB_SLOT`, no container work by any role inside this item. Then:

- **If it is an exact match**, both halves of the evidence exist, and I merge on a ruling that states
  both. This is the outcome the item was built for. **The head will move** when the integration
  evidence is committed, so the required check re-runs on the new head and the merge is pinned to
  that.
- **If it is NOT an exact match**, the deviation is ruled and fixed through the executor. **The
  founder should know this before choosing: the audit re-run is SPENT.** A fix needing a second
  re-run is scope growth under the standing rule, and it escalates rather than being quietly spent.
  So clearing the block may reopen work under an escalation rather than simply producing a green.
  **That is not a reason to avoid it** - it is the honest shape of the option.

**IF THE FOUNDER EXPLICITLY ACCEPTS LOOP-ONLY EVIDENCE FOR THIS ITEM:** I merge, on a ruling that says
in as many words that half the evidence does not exist, carrying section 6's "does not claim" list and
all 22 residuals into the pull request. **AI4DEV-66 closes; AI4DEV-67 stays open**, per section 7.
**The acceptance is recorded as the founder's, dated, and quoted exactly** - not as a conclusion this
sitting reached.

**I do not recommend one over the other, and that is deliberate.** The choice is about what standard
of evidence closes a leaf in this project, which is the founder's to set, not mine to infer from a
tired night.

---

# 9. WHAT EACH ANSWER COSTS - SO THE CHOICE IS MADE ON FACTS

## Merging on loop-only evidence: the real risk, neither inflated nor minimised

**It is NOT a production risk.** Nothing consumes these functions. There are no screens, no product
code imports the route registry, and no router obeys it. Nothing in this repository calls the three
edge functions.

**The concrete cost is that it externalises an unparsed migration onto somebody else.** Both
migrations reach `main` never having been applied or parsed anywhere. **The next item that runs an
integration tier - any item - applies them for the first time.** If either carries a SQL error, that
item's database reset fails, and the failure lands on work that has nothing to do with this one. It
would be loud and traceable, which makes it recoverable rather than dangerous. **It is not free, and
whoever hits it will not be the person who chose it.**

**The evidentiary cost is the one the item's own record has been protecting against for five
sittings:** a leaf closing on a green that claims more than it earned. This item has ruled a false
stated fact non-mergeable five separate times, corrected its own record four times, and dismissed a
reviewer's remedy rather than let a fixture state something untrue. **Closing it on half its evidence
would be the one place that discipline was not applied - and it would be applied last, at the merge,
by the sitting with the most reason to want to be finished.** I name that pressure rather than
pretending I do not feel it.

## Clearing the stack: what it buys, enumerated

The plan's step 6 privilege-posture measurement, never made; **AT-001.21, .22, .23 and .40 green at
integration tier**; the first proof that both migrations apply and that the three deployed functions
serve at all; the grading of the fixture's policy mirror against a real database; step 16's third
done-criterion, which needs the live catalog; the first execution of `publicSchemaCatalog`'s query in
any form; and the first execution of AT-001.40's four extended non-administrator controls.

**One measured caution for that run:** `has_table_privilege` errors if the role name does not exist.
That is deliberate - a loud failure beats a silent absence - and it has never been executed.

---

# 10. THE PULL REQUEST BODY - MY DECISION, AND A HAZARD THE MERGING SITTING MUST HANDLE

**Whenever this merges, the body is REPLACED.** The published body is still the plan sitting's
placeholder and it ends with "**Work in progress. The plan is under review. Code has not been
written.**" That is false at this head and must not survive into a merge commit.

**MY DECISIONS ON THE BODY:**

1. **The `Closes AI4DEV-67` line is OMITTED**, under gate-1 ruling 3's default. Section 7 states why.
2. **The pull request closes AI4DEV-66 through its own branch link.** That link is untouched.
3. **No other item id appears anywhere in the title or body.** Other items are named in words.
4. **The body lists the ride-along** (section 11) and carries the two-halves verification statement
   honestly - loop exact, integration absent.

## A HAZARD I FOUND WHILE VERIFYING, AND IT BINDS WHOEVER MERGES

**The reference guard graded the OLD body, and editing the body does NOT re-run it.** The workflow's
trigger block is:

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

**No `types:` list, so GitHub's default applies - `opened`, `synchronize`, `reopened`. `edited` is not
among them.** The guard reads the title and body at run time. So a body swapped in after the green is
**never checked by anything**, and if it introduced a foreign id, nothing would catch it before the
merge moved that item.

**Two consequences, and they are instructions, not observations:**

- **The merging sitting verifies the new body for foreign ids ITSELF, before it is published.** The
  guard cannot do it and must not be relied on for a post-green body swap.
- **The ruling COMMENT posted to the pull request must name the partner item in WORDS, never by
  id.** This ruling FILE names `AI4DEV-67` throughout, which is correct for a record in the
  repository. A comment on the pull request is a different surface, and the safe direction is
  unambiguous: **the comment names no id but this branch's own.**

---

# 11. RIDES ALONG

**One line in `.claude/agents/reviewer-runner.md`** (slice-1 gate-2 ruling 8, commit `50d0daa`).

That file told the runner to report any tool outside `read`, `glob` and `grep` as an INVALID RUN,
while `.opencode/agent/reviewer-flash.md` grants `gitdiff: true` deliberately and with a comment
explaining it. **This item's own slice-1 flash run used `gitdiff` sixteen times.** A runner obeying
the letter would have discarded a valid review. `gitdiff` is now on the allowed list with its reason;
the cage file itself is correct and was not changed.

**This is a false-alarm defect in a safety check, which is the worst kind to leave, because it
teaches the next runner to ignore the check.** Slice 2, the audit sitting and the audit re-run added
no ride-along of their own.

**It must be named in the pull request body.**

---

# 12. THE RESIDUALS - ALL 22, CARRIED

The full list with its reasoning is in `PHASE-STATE.md` section 6 and it is carried into the pull
request unchanged. Two are RETIRED by slice 2 (5 and 6) and are kept numbered so the record's
references stay valid. The four that most bear on the merge:

- **8** - the loop-tier Data API arms grade the fixture's mirror, not the migrations.
- **9** - the `readRows` fix is proved by reading; `edge.ts:8`'s claim that no test imports it is
  **unverified by anybody**.
- **18** - on the public surface an organisation-read outage answers 502 where an absent project
  answers 404. It sits INSIDE the deliberate public-existence residual, not beside it, because the
  200 answer already names the project and its organisation for every project that exists.
- **22** - the public surface's ordering exemption rests on ONE reason: the surface makes no access
  decision. **The discarded reason - that the clause is UNSATISFIABLE there - was an over-claim and
  must not be re-derived.** Neither collapsed read shape is measured.

**Residual 21 is about this process rather than the product, and section 4 restates it with the
fourth instance this sitting found.**

---

# 13. THE OTHER DECISIONS THIS SITTING OWES

**MAIN IS NOT MERGED IN.** `origin/main` has moved to `160042c`, two commits ahead of this branch's
merge-base at `926d170`. **GitHub reports the pull request `MERGEABLE` with `mergeStateStatus:
CLEAN`, so there is no conflict to resolve.** Merging main in now would move the head and discard a
green that cost a full check run, for no benefit while the merge is blocked. **And the head will move
anyway** under either founder answer - the integration evidence gets committed, or the acceptance
does. The sitting that actually merges takes main in if it is needed then.

**NO CONTINUOUS-INTEGRATION RE-RUN WAS NEEDED.** The check passed first time on this head. The
one-re-run flake allowance is **unused** and passes to whichever sitting merges.

**NO CLASSIFICATION WAS NEEDED.** The four red classes - infrastructure or flake, broken by this
change, pre-existing on main, and the check cannot be obtained - are all moot. The check is green.

---

# 14. CAPS

**This sitting:** executor invocations **0 of 3**; mechanical invocations **0** - and that is the
ruling, not an omission; integration-tier attempts **0**; audit re-runs **0** (1 of 1 spent by the
re-run sitting, and no second one exists); continuous-integration flake re-runs **0 of 1**; pushes
against a red check **0 of 2**.

**Across the item, executor invocations by sitting:** slice-1 draft 2 of 3; slice-1 fix-and-goal 1 of
3; slice-2 draft 1 of 3; slice-2 fix-and-goal 2 of 3; audit 2 of 3; audit re-run 1 of 3; merge 0 of
3.

---

# 15. WHAT THE FOUNDER MUST ANSWER

**ONE QUESTION. IT IS THE ONLY THING BETWEEN THIS ITEM AND A MERGE.**

> **The integration tier has never run at any head of this branch, so half of this item's verification
> evidence does not exist. Database slot 1's local stack is down - the gateway container cannot bind
> its API port and the edge-function container cannot mount its entry file - and only you can clear
> it.**
>
> **Either clear the stack, so the integration tier can run and both halves of the evidence exist;
> or explicitly accept loop-only evidence for this item, knowing that both migrations, every policy
> and all three helper functions would reach `main` never having been applied, parsed or evaluated
> anywhere.**
>
> **A green continuous-integration check is not an answer to this. The check runs the loop tier only
> - I verified that the workflow never names the integration tier - so it cannot supply the missing
> half.**

**The two plan-sitting questions still want answers before AI4DEV-67 can close, and NEITHER blocks
this merge.** Question 1 has a determinate default that I have applied (the closes-line is omitted,
that item stays open). Question 2 is disposed of in section 7's table. They are relayed as standing
questions, not as blockers.
