# Rulings - the AUDIT RE-RUN, both readers, scoped to the fix delta

AI4DEV-66 (cross-org denial, no existence oracle), batched with AI4DEV-67 (assigned volunteer,
admin, stranger). Branch
`nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`.

Ruled by the AUDIT RE-RUN sitting, orchestrator on **opus @ max**, 2026-08-13, at head `116bbab`.
The code head the readers graded is `e91fc39`; every commit after it touches `loop/items/` only.

## THE MODEL RULING FOR THIS RUN - CARRY IT FORWARD

The founder ruled (relayed 2026-08-12, restated to this sitting 2026-08-13) that **every
orchestrator sitting of this item runs as `orchestrator-opus` at opus/max effort** - plan, draft,
fix-and-goal, and the FIRST audit - not only the merge and audit-re-run sittings that are opus by
design. This is a deliberate founder choice for this run. It is **not** a sign that fable has no
credit. The conductor spawns every subsequent sitting of this item the same way, and every state
file repeats this paragraph.

**This sitting is ALSO opus by design, independently of that ruling.** The orchestrator contract
makes the audit re-run an opus sitting, because the rebuilt checklist and the delta scope fence its
judgment. Both reasons hold at once and neither is a fallback for missing credit.

---

# 0. THE PANEL, AND WHAT EACH SEAT RETURNED

Two readers, each blind to the other, each over the SAME fix delta - six files,
`git diff 1e058d0...HEAD` in the code territory - with the scope box re-checked over the full range.

| seat | reader | findings | verdict |
|---|---|---|---|
| 1 | `gpt-5.6-luna` via codex, effort max, `--sandbox read-only` | **2** | S1-R PASS; A1-N FAIL; A5 FAIL; A2, A3, A4, A6, A7 and FN1-FN6 all PASS |
| 2 | `opencode-go/deepseek-v4-flash`, `--variant max`, agent `reviewer-flash` | **1** | one finding, severity LOW |

**Neither seat is clean, so neither is a veto over the other, and both verdicts are recorded here.**

**Three findings, TWO rulings, because two findings are one defect.** Seat 1's finding [2] and
seat 2's finding [1] are the same stale citation, in the same file, naming the same wrong line and
the same right one. I checked that they are one defect before merging them, rather than assuming it
from the file path. They are. **That is this panel's convergence, and it is ruled once, as R2, under
both claims quoted.**

**THIS IS THE SECOND CONVERGENCE THE PANEL HAS PRODUCED ON THIS ITEM.** The first audit converged on
stated fact F9 (ruling A3). Two independent readers agreeing on a defect is the strongest signal a
panel gives, and it has now fired twice.

**Both rulings are ADOPTED. NEITHER CHANGES ANY BEHAVIOUR.** One changes the record. One changes one
sentence of one comment. Section 3 states why that means no second re-run is owed.

---

# R1. THE ORDERING EXEMPTION'S "IMPOSSIBILITY" REASON IS AN OVER-CLAIM - ACCEPT. THE RECORD CHANGES, THE CODE DOES NOT.

**Seat 1, severity S2 (material claim defect),
`supabase/functions/public-project-page/index.ts:22`. Checklist box A1-N graded FAIL.**

> claim: "The exemption claims the organisation cannot be read before the project, but the
> repository's foreign key and generic PostgREST reader allow a reverse relationship query keyed by
> the request's project ID."
> why it matters: "Clause 3's impossibility rationale is false; it should rely only on the surface
> being caller-independent. The relationship query should be verified against the database."
> unverified-runtime-claim: yes
> checklist: **A1-N - FAIL: clauses 1, 2, and 4 match the code; clause 3 is overstated as above.**

## THE READER IS RIGHT, AND THE PROOF IS ALREADY INSIDE MY OWN EARLIER RULING

Box A1-N clause 3 said: the handler's second read is keyed on `project.org_id`, a column of the
target row, **"so the organisation cannot be read before the project at all"**. The record around it
went further and called the ordering clause **UNSATISFIABLE** on that surface -
`rulings-audit.md:89`, `plan.md:211`, `PHASE-STATE.md:139`.

**Ruling A1 then contradicted itself three paragraphs later, and nobody noticed until this reader
did.** Its own next sentence is:

> Satisfying the box's letter would mean collapsing the two reads into one embedded PostgREST
> select, which is a read-shape change to a live query on a public surface.

A clause that a named change would satisfy is not unsatisfiable. **The word was wrong, and the
sentence that disproves it was sitting next to it.**

## WHAT IS TRUE, SEPARATED FROM WHAT IS NOT

**True, and it stays:** the two reads AS WRITTEN cannot be reordered. The second read is keyed on
`project.org_id`, so the organisation's identifier does not exist until the project row is in hand.
I re-read `public-project-page/index.ts` lines 64-77 first-hand to confirm it.

**Not true, and it goes:** that the clause therefore cannot be met. The clause can be met, by
collapsing the two reads into ONE. **With a single read there is no earlier read to order, and the
target read is trivially the last read the handler makes** - the clause is satisfied vacuously.

**Two shapes would collapse it**, and the reader named the second:

1. an embedded select from `projects`, and
2. the reader's reverse relationship query on `organizations`, keyed by the request's project id.

**Both are expressible, and I verified the two facts that make them so rather than taking them from
the reader.** `public.projects.org_id` is `uuid not null references public.organizations (id)`, in
`supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql:59` - the
foreign key PostgREST needs to offer the relationship. And `readRows` takes a raw PostgREST path,
so the handler can issue any query shape it wants.

## SO THE EXEMPTION RESTS ON ONE REASON, AND IT IS THE ONE THE READER NAMED

The reader's prescription is "it should rely only on the surface being caller-independent". **I adopt
it, and the code already says exactly that and nothing more.** `public-project-page/index.ts:22-25`
reads:

> THE READ ORDER IS NOT LOAD-BEARING HERE ... This surface makes no access decision - it answers
> everyone the same way - so there is no second answer for an ordering to keep indistinguishable from
> the first.

**That is caller-independence, stated without any impossibility claim beside it. The code is already
correct by the reader's own standard.** The over-claim exists only in the DERIVED record - my ruling,
the plan and the state file. So the remedy is a record change, and the code is not touched.

**And clause 2 - the claim the whole exemption now carries alone - I re-verified rather than
inherited.** `public-project-page/index.ts` calls no `resolveCaller`, reads no `Authorization`
header, and branches on no caller property. Its wrapper `edgeHandler`
(`supabase/functions/_shared/edge.ts:96-109`) branches only on `request.method === 'OPTIONS'` and
converts a thrown error into a 502. Nothing in the path inspects who is calling. Seat 1 graded
clause 2 PASS; I confirm it independently.

## THE PART OF THE FINDING I REJECT, WITH THE REASON

> "The relationship query should be verified against the database."

**REJECTED, and the reason is that the branch does not issue that query.** The reverse relationship
query appears in this ruling only as proof that a collapsed shape EXISTS. Nothing in the tree sends
it. Verifying it would measure a query this item does not ship, on a tier that is down (section 1 of
`PHASE-STATE.md`), to support a claim I am removing rather than adding.

**AND THE CORRECTED RECORD ASSERTS NOTHING ABOUT IT.** It says the foreign key exists - read from the
migration - and it says plainly that whether PostgREST would serve either collapsed shape is
UNMEASURED. **The correction REMOVES an unsupported claim; it does not add a new one.** That
distinction is the whole reason this ruling owes no runtime evidence.

## THE RULING

1. **NO CODE CHANGE.** The read order in `public-project-page` stands. The file's own header already
   states the correct and only basis.
2. **`plan.md` is corrected in place**, at the paragraph beginning "And the clause is UNSATISFIABLE
   there". It keeps the true half - the two reads as written cannot be reordered - and it replaces
   the false half with the collapsed-read fact, the two enabling facts, and the plain statement that
   neither collapsed shape has been executed. This is a record change made by me, not by the executor.
3. **`rulings-audit.md` is NOT rewritten.** A pointer line is added at the head of section A1, naming
   this ruling as its correction. **The original wording stays visible**, exactly as ruling A4's own
   correction was written beside its original rather than over it. A record that hides its own
   corrections cannot be audited.
4. **`PHASE-STATE.md` carries the corrected statement**, because this sitting rewrites that file.
5. **THE THREE SPENT PROMPT FILES ARE NOT EDITED** - `audit-rerun-additions.md:86-87` and the two
   `audit-rerun-*-prompt.txt` files. They are the record of what was ASKED. A1 ruling 4 settled this
   for the first audit's prompts and the same reason holds here: a spent prompt rewritten after the
   fact destroys the evidence that box A1-N was graded FAIL for a reason.
6. **A NEW RESIDUAL IS RECORDED** - residual 22 in the next state file. The exemption for the public
   surface now rests on one reason rather than two, and a later reader must not re-derive the
   discarded one.

## WHAT THIS DOES AND DOES NOT MOVE, FOR THE MERGE RULING

**It moves no behaviour and it weakens no security claim.** The ordering clause exists to stop an
outage answer depending on whether the target exists. On the public surface there is nothing to hide:
the designed answer already names the project and its organisation for every project that exists, and
404 for one that does not. That is residual 4, and the criterion writes the carve-out itself -
AT-001.21's clause is "no existence oracle BEYOND PUBLIC SURFACES". The 502-versus-404 outage
difference stays recorded as residual 18.

**What it moves is the strength of the reason**, from two reasons to one. The remaining reason is the
one that was always load-bearing, and it is the one the shipped code states.

---

# R2. THE CORRECTED CONTRACT SENTENCE CARRIES A CITATION THAT ITS OWN FIX MADE STALE - ACCEPT. **BOTH SEATS FOUND THIS, AND IT IS RULED ONCE.**

**I checked that the two claims are one defect before merging them: same file, same sentence, same
stale line 810, same true line 834. They are.**

**Seat 1, severity S3 (localized citation defect), `tests/at/suites/req-001/_contract.ts:870`.
Checklist box A5 graded FAIL.**

> claim: "The contract points to line 810 as the sole `dataApiRead(null, …)` call site, but the
> current call is at `tests/at/suites/req-001/d-tenant-isolation.test.ts:834`."
> why it matters: "Following the citation lands on a workspace assertion rather than the anonymous
> Data API probe, misdirecting verification."
> unverified-runtime-claim: no
> checklist: **A5 - FAIL: the sole null call exists, but the cited line is stale.**

**Seat 2, severity LOW, `tests/at/suites/req-001/_contract.ts:869-872`.**

> claim: "The new sentence cites \"d-tenant-isolation.test.ts:810\" as the one call site that passes
> `null` to `dataApiRead`; at HEAD that line is `expect(workspace.ok, 'a caller whose session had
> ended read a project workspace').toBe(false);` — the actual null call site is line 834 (`const
> neverSignedIn = await sut.dataApiRead(null, ...)`), which the fix delta itself shifted from pre-fix
> line 810 by its +24 added lines. The citation is stale by construction: a reader following the
> named line lands on a different statement."
> why it matters: "The item's whole purpose is correcting false statements, and the corrected
> sentence still contains a false statement about the code — exactly the \"correction that is itself
> false\" failure mode the brief names as worst-case. The substantive claim (only one null call site
> exists; it is AT-001.24's probe) is true — verified by grep — so the defect is the citation, not
> the content. Fix is a one-line renumber to 834 (or a citation that survives the delta, e.g. by
> naming the probe variable instead of a line)."
> unverified-runtime-claim: no

## CONFIRMED FIRST-HAND, ON ALL THREE POINTS

1. `_contract.ts:870` cites `d-tenant-isolation.test.ts:810`.
2. `d-tenant-isolation.test.ts:810` is
   `expect(workspace.ok, 'a caller whose session had ended read a project workspace').toBe(false);` -
   an assertion about the project workspace, not a Data API probe.
3. `d-tenant-isolation.test.ts:834` is
   `const neverSignedIn = await sut.dataApiRead(null, { table, keyedBy: null, value: null });`

**And the substance is still true.** I searched the whole tree for `dataApiRead(null` across `tests/`,
`src/` and `supabase/`: **exactly one call site, line 834.** Ruling A5's content holds; only its
pointer is wrong.

## SEAT 2 EXPLAINED THE CAUSE, AND THE CAUSE IS THE SHARP PART

**Ruling A2's own fix moved the line that ruling A5's comment cites.** A2 added assertions to
AT-001.40's loop body, higher up the same file. The two rulings were applied in the same series of
commits. **A5's citation was true when I dictated it and false by the time the series landed.** Seat 2
called it "stale by construction" and that is exactly right.

**This is the THIRD citation defect on this item, and the first that no person got wrong.** The other
two were mine - slice-2 ruling 9's non-exhaustive fix list, and audit ruling A4's line 192. This one
was correct when written. **A line number is a fact with a short life, and the item has now been bitten
by that three times.** The remedy takes that seriously rather than renumbering and moving on.

## THE RULING - ACCEPT, comment only, and the citation is made DURABLE rather than renumbered

Seat 2 offered two remedies and preferred neither. **I take the second: name the probe, not the line.**
A renumber to 834 would be correct today and would decay the next time anything is inserted above it,
which is the defect repeating rather than closing.

**The exact replacement text is dictated in section 2 below, character for character.** It:

- names AT-001.24's `neverSignedIn` probe in `d-tenant-isolation.test.ts`, with no line number;
- keeps every other word of the sentence, including the true statement about pre-existing call sites;
- **says why the line number is gone**, so a later reader does not helpfully restore one.

The last point is not decoration. The same file already carries a correction in that voice at
`supabase/functions/_shared/edge.ts:116-117`, and this item's practice is to state a correction where
the defect was rather than in a document nobody opens.

**ONE SITE, AND I MEASURED THE CLAIM RATHER THAN THE PHRASE**, per the standing instruction the first
audit wrote. The stale citation `d-tenant-isolation.test.ts:810` appears at exactly one place in the
code territory: `_contract.ts:870`. The other occurrences are all in `loop/items/AI4DEV-66/`: **three
of them inside `rulings-audit.md` section A5**, and the three spent prompt files. **None of those is
edited**, for the reasons in R1 rulings 3 and 5, and section 4 records the rulings file's three stale
citations so they are not read as current.

**That reference names a SECTION and not three line numbers, and the first draft of this ruling named
the line numbers instead. Section 7 records what that cost within the hour.**

---

# 2. THE DICTATED TEXT FOR R2 - EVERY CHARACTER DECIDED

**Replace exactly these four lines in `tests/at/suites/req-001/_contract.ts` (lines 868-871):**

```
   * says so. Every call site that PREDATES this change passes a `Session`, which is assignable, so
   * widening the parameter moved none of them; AT-001.24's own probe at
   * `d-tenant-isolation.test.ts:810` is the one call site that passes `null`, and it is the reason the
   * parameter was widened.
```

**with exactly this:**

```
   * says so. Every call site that PREDATES this change passes a `Session`, which is assignable, so
   * widening the parameter moved none of them; AT-001.24's own `neverSignedIn` probe in
   * `d-tenant-isolation.test.ts` is the one call site that passes `null`, and it is the reason the
   * parameter was widened.
   *
   * THE REFERENCE NAMES THE PROBE AND NOT A LINE, ON PURPOSE. An earlier version of this sentence
   * cited line 810. The audit fix that added assertions ABOVE it in that same file moved the call to
   * another line, so the citation was false by the time the commit landed — the audit re-run caught
   * it, both readers independently. Do not restore a line number here; it decays on the next
   * insertion.
```

**Nothing else in the file changes.**

---

# 3. WHY NO SECOND AUDIT RE-RUN IS OWED - THE RULE, AND ITS APPLICATION

**The audit re-runs ONCE PER ITEM and this item has now spent it.** A finding needing a code fix is
ruled and fixed in this sitting. A fix that would need a SECOND re-run is scope growth, and it is
escalated rather than quietly spent.

**The rule that decides it is the one the first audit sitting wrote down, in section 4 of the previous
`PHASE-STATE.md`, and I apply it unchanged rather than inventing one that suits me:**

> Had the sitting been comment-only, no re-run would have been required, because the audit's subject
> is the code's behaviour and a corrected sentence changes none of it.

**This sitting IS comment-only, and it is thinner than that.**

| ruling | what changes | executable code touched |
|---|---|---|
| R1 | `plan.md`, a pointer line in `rulings-audit.md`, the new state file | **none - no file under `supabase/`, `tests/`, `src/` is touched at all** |
| R2 | one comment sentence in `tests/at/suites/req-001/_contract.ts` | **none - the change is inside a `/** … */` block above an interface member** |

**No assertion is added, removed or altered. No predicate changes. No declaration is edited.** The
loop-tier exact-match result cannot move, and the executor re-measures it at the final head to prove
that rather than to assume it.

**And R1 adds no new claim for an auditor to grade.** It deletes one. An auditor re-reading the
corrected paragraph would find a strictly weaker statement resting on a clause both seats already
graded PASS - clause 2, caller-independence - plus one fact I read out of a migration file in this
sitting and quoted with its line. **There is nothing there that a third reading could falsify that a
second reading could not.**

**So the re-run is spent, correctly, and nothing is owed.** I state it plainly because the contract
requires me to: **I believe these two fixes are complete without another audit read**, on the ground
that neither one changes behaviour and one of them only removes a claim.

---

# 4. WHAT I CHECKED AND DID NOT RULE A FINDING - RECORDED SO IT IS NOT READ AS A MISS

1. **`supabase/functions/_shared/visibility.ts:28` says "AND THE SURFACES READ THE TARGET ROW LAST"
   without repeating the word "non-public".** I read it against R1 and I do NOT rule it a defect. Its
   own paragraph five lines above scopes the subject - "Every non-public read surface returns exactly
   that constant" - and "the surfaces" is that noun. It makes no impossibility claim, so R1's defect
   is absent from it. Both seats had this file in the fix delta, because ruling A4 edited it, and
   neither flagged the sentence. **I leave it, rather than improve adjacent text a ruling does not
   reach.**
2. **`rulings-audit.md` section A5 carries the stale `:810` citation THREE times** - in the quoted
   reader claim, in the confirmation prose, and in the dictated replacement text. They were TRUE when
   written, at head `1e058d0`, and ruling A2's fix moved the line afterwards. They are the record of
   what was ruled, not a statement about the current tree. **They are not edited**, and they are named
   here so a later reader does not follow them. **The count is three and I re-measured it after the
   executor reported a fourth - see section 7.**
3. **The reverse relationship query is not a new risk anywhere else.** PostgREST evaluates an embedded
   resource under the caller's role and policies, and `public-project-page` reads with the service-role
   key by design, because it builds a hand-written public projection. Nothing in R1 widens what any
   caller may read.
4. **`audit-rerun-luna.stdout.log` is excluded from the commit as launcher output, and I measured that
   nothing is lost.** `diff` against `audit-rerun-luna.raw.txt` reports one difference: the raw file
   has no trailing newline. The content is otherwise identical. `audit-rerun-luna.pid` is scratch and
   is excluded too.
5. **The cage held on both seats.** `audit-rerun-flash.identity.md` records the pin matched on all 29
   assistant messages and that all 45 tool-call events were `gitdiff`, `grep`, `read` or `glob` -
   no `write`, `edit`, `patch`, `bash`, `task` or `webfetch`. Seat 1 ran under `--sandbox read-only`
   and states in its own output: "No tests or database queries were executed." **Neither reader
   executed anything, which is what the brief asked for.**

---

# 5. CAPS USED BY THIS SITTING

- **Executor invocations: 1 of 3.** One pass for R2's dictated sentence plus the four verifications
  at the final code head.
- **Mechanical invocations: 0.**
- **Audit re-runs: 1 of 1. SPENT. There is no second one.**
- Integration-tier attempts: **0 this sitting.** The single attempt from slice 1's draft sitting stays
  spent, and section 1 of the state file forbids another.
- Continuous-integration flake re-run: **unused**, and it belongs to the merge sitting.

---

# 6. WHY AN EXECUTOR APPLIED A ONE-SENTENCE COMMENT FIX

**Because this item's orchestrator has been wrong about a citation twice, and R2 is a citation
ruling.** Slice-2 ruling 9 claimed an exhaustive fix list on a two-phrase search. Audit ruling A4
named a line that returns before the scope is read. Both were caught by the executor before writing,
because the executor is required to verify before it writes and it holds the dispute right.

A mechanical would have typed R2 faster. It would not have been permitted to dispute it. **On the one
class of ruling this item keeps getting wrong, the dispute right is worth more than the speed** - and
the same invocation carries the four verification runs at the final code head, which the merge ruling
must quote. That is one invocation of three, spent on the thing the record says is risky.

**The executor did not dispute R2.** It confirmed all three pre-write checks first-hand, and it went
past what I asked on check 3: rather than search only for the literal `null`, it listed the FIRST
ARGUMENT of every `dataApiRead` call in `tests/` - 41 call sites across two files - to catch a second
site passing a null-valued variable. The arguments are `sessionA`, `sessionB`, `unassigned`,
`volunteerSession`, `admin`, `signedOut`, and one `null`. **The sentence's substance is confirmed by
enumeration, not by a phrase search.** That is the standing instruction from the first audit obeyed
properly, and it is worth recording that the executor applied it without being told.

---

# 7. THE EXECUTOR REPORTED A FOURTH STALE CITATION. IT IS WRONG - AND WHAT MADE IT WRONG IS MINE.

**The report:**

> `loop/items/AI4DEV-66/rulings-audit.md:380` still carries the stale `d-tenant-isolation.test.ts:810`
> citation, alongside lines 359, 366 and 377. ... your section 4 item 2 lists three lines and my
> search found a fourth occurrence in that file, so the record's own list of its stale citations is
> one short.

## THE SUBSTANCE IS REJECTED, AND I MEASURED IT RATHER THAN ASSERTED IT

**There is no fourth citation. There are exactly three, and all three are inside section A5**, which
spans lines 368 to 395 of the current file: the quoted reader claim at 373, the confirmation prose at
380, and the dictated replacement text at 391.

**Line 380 IS the line my ruling called 366.** Earlier in this same sitting I inserted a 14-line
pointer block at the head of section A1 - `git diff --numstat` reports `14 0` for that file. Every
line below it moved down by fourteen. 359 became 373, **366 became 380**, and 377 became 391. The
executor grepped the CURRENT file, compared the result against my list of PRE-EDIT numbers, found 380
absent from it, and correctly concluded that something did not add up. Its arithmetic was sound. Its
premise - that my three numbers described the file it was reading - was not.

## THE DEFECT IS REAL, IT IS MINE, AND IT IS R2's OWN DEFECT COMMITTED INSIDE R2

**My line numbers were stale, and I made them stale myself, in this sitting, by inserting text above
them.**

That is the exact mechanism R2 rules on: a citation that was true when it was written and false by
the time the edit above it landed. **I wrote a ruling that forbids decaying line-number citations, and
cited three decaying line numbers in it, and the decay happened inside the same hour.** No reviewer
found it. The executor found it, by tripping over it.

**This is the FOURTH citation defect on this item and the third that is the orchestrator's own** -
slice-2 ruling 9's non-exhaustive fix list, audit ruling A4's line 192, and now this. The pattern is
one pattern, and it is not carelessness about numbers; it is a reference held to a weaker standard
than the sentence around it.

## THE RULING

1. **The executor's substantive claim is REJECTED**, with the reason above: line 380 is line 366 after
   a shift I introduced. No fourth citation exists. **I re-measured before rejecting**, because
   rejecting a report on the strength of my own earlier count is exactly how the first three of these
   happened.
2. **The underlying defect is ACCEPTED and fixed, by R2's own remedy.** Section 4 item 2 and R2's
   exhaustiveness paragraph now name **section A5** instead of three line numbers. A section name does
   not move when text is inserted above it.
3. **The pointer block I added to `rulings-audit.md` already names the section rather than lines**, so
   it needs no change. That is the one place I happened to get it right, and the contrast is the
   evidence for rule 2.
4. **The report was CORRECT TO SEND, and the executor is not marked down for it.** It found a real
   inconsistency between my ruling and the tree, reported it with its evidence, and changed nothing.
   That is precisely the behaviour the dispute right exists to produce. **An executor that only
   reported what turned out to be true would be an executor filtering its findings through a guess
   about my reaction**, and this item's record would be worse in three places if it had.
5. **Nothing in the code territory changes.** All of this is inside `loop/items/`. The fix delta
   remains one comment in one file, so section 3's conclusion - no second audit re-run is owed - is
   untouched.
