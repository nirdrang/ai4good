# AI4DEV-57 — rulings made in the DRAFT sitting (sitting 3)

Ruled by `orchestrator-opus` (Opus 5, effort max), the opus fallback that is in force for this whole
item because fable is out of credit. These are rulings on the **executor's report and on the code it
produced**, not on any reviewer's findings — the code critique has not happened yet.

Each ruling quotes the claim it rules on. Where the executor is quoted, the words are its own.

---

## R1 — the acknowledgment is recorded for volunteers too. ACCEPTED as built; the plan moves

**The executor's claim, quoted:**

> **The acknowledgment is recorded for volunteers too, not only NGOs.** D6 lists it under the NGO
> branch; D4.2 requires `acknowledgmentTextVersion` from *every* caller. Requiring a field and
> discarding it for one type is not defensible. The organisation and membership stay NGO-only.
> **This is a plan gap I filled by judgment — flagging it for your ruling.**

**Ruling: accept, as built.** The plan had a genuine internal contradiction and the executor
resolved it the right way. `validateCompleteSignup` refuses any completion with no acknowledgment
text version — every caller, both types. A path that demands the field and then throws it away for
volunteers would validate something the system never records, which is worse than either consistent
alternative. Of the two consistent readings, recording it is the one that matches what the field is
*for*: the `kind` and `text_version` columns are exactly what lets a later requirement distinguish
who accepted which document.

Verified in the tree, not taken from the report: `_fixture.ts` builds the acknowledgment
unconditionally, outside the `organizationName !== null` branch that gates the organisation and
membership. The organisation and membership remain NGO-only as the plan requires.

**Plan amended** — D6 now states the acknowledgment is universal and the organisation and membership
are not.

---

## R2 — the platform admin is NOT provisioned by a service-role write. DISPUTE UPHELD; the plan moves

**The executor's claim, quoted:**

> **Step 7(g) says the administrator is "provisioned the only legal way — a service-role write."
> That is no longer possible, and I believe the plan should move rather than the code.** With the
> fix in §3.2, `service_role` holds no INSERT anywhere; provisioning is a direct database operation
> by an operator — a *narrower* authority. To make the plan's sentence literally true I would have to
> grant `service_role` INSERT on `accounts`, which reopens the direct write path past
> `complete_signup`'s guard. […] **Your ruling: amend the plan's wording, or overrule me and take the
> grant.**

**Ruling: the executor is right, and this is the most important call in the sitting.** The plan's
sentence was written from an assumption about privileges that measurement then falsified. Taking the
grant to make the sentence true would have traded a real security property for a documentation
convenience — and it would have done it to the one guard the plan review specifically forced into
existence (F6). That is the shape of mistake this item is most exposed to: a ruled defence quietly
undone by something that looked like tidying.

Verified in the tree at
`supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql`: line 328 grants
`service_role` **`select` only** on `public.accounts`; lines 345–351 revoke `execute` from `public`
on all three functions and grant it to `service_role`; the write functions are `security definer`
with `set search_path = ''`.

**Plan amended** — step 7(g) now describes provisioning as a direct database operation by an
operator, says why the obvious repair must not be made, and records the consequence the plan had not
noticed: **the F6 guard is stronger than planned.** There is no key-reachable write path into
`public.accounts` at all, so `complete_signup`'s refusal is not a second door beside a first — it is
the only door. That is a better outcome than the plan asked for, and the record now says so.

---

## R3 — `public.create_organization` as a fifth database object. ACCEPTED

**The executor's claim, quoted:**

> **Step 4 grew a fifth object: `public.create_organization`.** Creating an organisation is two
> writes; as two Data API calls that is two transactions, and a failure between them orphans an
> organisation. That is exactly the defect F5 ruled against, reappearing inside the function F4
> added.

**Ruling: accept.** F5 ruled that a multi-row write goes through one database function; F4 added a
second operation that also writes multiple rows. Applying F5's reasoning to F4's operation is
following both rulings rather than extending either. The alternative — two Data API calls — would
have reinstated inside the new operation the precise defect the plan review found in the old one.

The boundary that matters held: the function performs the writes and decides nothing, so AT-001.06's
refusal still comes from `ngoOnlyActionAllowed` in the shared TypeScript module and the test still
exercises shipped logic rather than a rule buried in SQL. **Plan amended** — D5 records the fifth
object and why.

---

## R4 — a skipped check counts itself as a pass. MY OWN FINDING, and it is a defect

Not reported by the executor. Found by reading `loop/items/AI4DEV-57/proof-local.ts` in this sitting.

The function's own docstring, at line 42:

> `/** A check that could not be attempted. Reported as SKIPPED and never as a pass. */`

Line 44 then pushes `{ ..., passed: true, ... }`. Line 460 computes `failed` as the checks where
`!check.passed`, line 461 prints `${results.length - failed.length} passed`, and line 466 prints
`ALL CHECKS PASSED` when nothing failed. **A skipped check is therefore counted as a passing one and
does not stop the summary claiming everything passed.** The code does the exact opposite of what its
own comment says.

**Ruling: this is a defect and it is fixed before step 7 is ever run.** It matters more than its size
suggests, on three counts. Step 7's transcript is *the only evidence this item will ever have about
the real database*. The plan's step-7 done-criterion is worded "the transcript shows **all ten**
passing", which an inflated tally would satisfy without the checks having run. And the check most
likely to be skipped is (f2), the one covering the founder's Google question — so the failure mode is
an item claiming a Google-related proof it did not perform.

Nothing false has been produced: the script has **not been executed**, so no transcript exists yet.
Fixing it in the next sitting, before step 7 runs, costs nothing and pollutes no evidence.

**Required fix:** a skipped check must be distinguishable from a passing one in the stored result, in
the tally line, and in the final verdict. `ALL CHECKS PASSED` must not print when any check was
skipped.

---

## R5 — step 5's done-criterion is unmet. NOT a defect; it is the draft boundary working

**The executor's claim, quoted:**

> **Step 5's done-criterion is not met.** It asks for a signed-in happy path returning 200 with the
> expected rows "captured in step 7's transcript" — that is step 7, which your ruling says not to
> run. Boot is proved; the happy path is not.

**Ruling: correct, and it is mine, not the executor's.** I ruled that this sitting produces an
implemented draft rather than a green one, and that step 7 is not executed. A plan step's
done-criterion belongs to the fix-and-goal sitting. Recorded so no later reader mistakes an
unexecuted criterion for a skipped one. **Carried forward as work, not as a finding.**

---

## R6 — no Deno type-checker reachable. ACCEPTED as reported

**The executor's claim, quoted:**

> **No Deno type-checker is reachable** (not on PATH; the edge-runtime container ships `edge-runtime`
> binaries and no `deno`). No type coverage is claimed for either entry point or `_shared/edge.ts`.
> Installing a language runtime is bigger than a leaf's call — reported, not worked around.

**Ruling: accept, no action.** The plan's [F8] criterion explicitly permitted this outcome — *"If
none is reachable, record that plainly and claim no coverage"* — and required only that the reader
never be left assuming `bun run typecheck` covered those files. The executor did exactly that and
declined to install a language runtime on its own authority, which is the correct instinct.

**The consequence is carried into the code critique rather than hidden:** two edge-function entry
points and their shared helper have **no type coverage from any project**, and the Gate prompts say
so in those words.

---

## R7 — `bun run build` rewrites a `src/` file. A STANDING HAZARD for every later sitting

**The executor's claim, quoted:**

> **`bun run build` rewrites `src/routeTree.gen.ts`** (ten lines, a stale `declare module` block).
> Deterministic — reproduced twice, reverted both times. On this branch that is a **CI failure
> waiting to happen**: an unexamined `git add -A` after a build puts a `src/` file in a
> `supabase|tests|loop` diff.

**Ruling: accept, and promote it.** This is the sharpest operational observation in the report. The
territory guard fails a pull request whose files match both `^src/` and
`^(supabase|tests|loop|\.claude|\.github)/`, and this branch is permanently on the wrong side of that
line. A single careless `git add -A` after a build breaks the build for a reason that has nothing to
do with the change.

**Carried into `PHASE-STATE.md` as a standing hazard**, because it binds the fix sitting, the merge
sitting and anything that runs a build on this branch — not just whoever read this file. Regenerating
the file properly is a `src/`-only change and belongs to a different pull request: **filed, not
fixed.**

---

## R8 — the split trigger fires. Two slices, each reviewed twice

The plan's stated trigger: *"if the draft diff exceeds 1200 changed lines outside `loop/items/`, the
draft sitting splits the code gate into two prompts — SQL plus configuration, and TypeScript plus
tests."*

Measured independently of the executor's report, with `git diff --numstat 4b0f139..b3de541`:
**1990 changed lines across 18 files outside `loop/items/`.** The trigger fires. The slices are SQL
plus configuration at 389 lines (2 files) and TypeScript plus tests at 1601 lines (16 files).

**Ruling on the shape, since two readings were available.** Each slice is reviewed by **both** pinned
models — four runs from two prompt files — rather than one model per slice. Giving each slice a
single reader would halve the number of independent readers per line of code, which is a narrowing
of attack directions, and narrowing is exactly what the gate may never do. Slicing is for allocating
depth, not for dividing coverage.

**Ruling on the residual, recorded rather than glossed.** The TypeScript slice is 1601 lines, still
above the 1200 figure. I am not sub-dividing it further, for two reasons. The 1200 is written as a
*trigger* for splitting, not as a ceiling each resulting slice must sit under, and silently promoting
it to a ceiling would be inventing a rule. More substantively, the only natural third cut — server
TypeScript apart from the tests — would separate the test oracles from the shipped logic they
delegate to, and "would this green prove the claim" is the single most important question at this
gate. That question cannot be answered by someone holding only one half.

Neither prompt tells its reader that any other reader exists, that the change was split, or that
anything else covers the rest. Each is told to read the whole change, to report in depth on its own
area, and that anything it notices anywhere is reportable.

---

## What I verified myself rather than accepting from the report

The executor's report is evidence, not testimony. These were re-established directly in the tree:

| claim | how it was checked | verdict |
|---|---|---|
| 1990 changed lines outside `loop/items/`, 18 files | `git diff --numstat 4b0f139..b3de541`, summed | **true** |
| zero `src/` files in the diff | filtered the same file list | **true** — 0 |
| the tree is clean and eight commits exist | `git status --porcelain`, `git log` | **true** |
| the adapter fabricates no Google handshake | read `_fixture.ts` `registerWithProvider` — it records a provider on an auth user and performs no exchange | **true** |
| every judgement in the adapter is the shipped module's | read `_fixture.ts`: `validateCompleteSignup`, `ngoOnlyActionAllowed` and `PUBLIC_SIGNUP_ACCOUNT_TYPES` are imported and called; no second copy of a rule found | ~~**true**~~ — **FALSE, and corrected by the code critique. See below.** |

> **CORRECTION, written in by the FIX sitting (sitting 4).** The last row of that table was wrong.
> Both Gate 2 readers independently found a fourth judgement that had escaped the shared module: the
> organisation-name rule existed in **two** copies, one in `create-organization/index.ts` and one in
> `_fixture.ts`, and neither was in `supabase/functions/_shared/accounts.ts`. So AT-001.06's green was
> grading the adapter's copy of that rule rather than the shipped one — the exact "grading a puppet"
> failure D4 exists to prevent.
>
> **How the check went wrong is the useful part, and it is not that I read carelessly.** I verified
> the three judgements the plan enumerated, found all three correctly delegated, and wrote down a
> conclusion about *all* judgements. The plan never named a fourth, so a check scoped by the plan's
> own list could not have found one. **A list is only an exhaustive check if something independent
> establishes that the list is complete**, and nothing did. That is the same overclaim shape this
> project keeps meeting: measuring one route and generalising to "the type is safe".
>
> Ruled and fixed in `fix-rulings.md` B6 — a fifth export in the shared module, called by both sides.
> Recorded here rather than only there, because a false line in a verification table is worse than no
> table: it is the line a later reader would trust instead of re-checking.
| `service_role` holds no INSERT | read the migration's grant block | **true** — `select` only on `accounts` |
| the acknowledgment is written for volunteers too | read the adapter's `completeSignup` | **true** — outside the organisation branch |

One thing the executor reported that I did **not** re-derive: the three defects it says it found by
measuring (the default `PUBLIC` execute grant, the `service_role` privilege posture, the NUL bytes).
The first two are visible in the migration as written and the third is visible in the diff being
textual; what I did not reproduce is the measurement that found them.
