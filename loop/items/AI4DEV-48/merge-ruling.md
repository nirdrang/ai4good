# AI4DEV-48 (a green can be faked) — the merge ruling

**Sitting 5 (MERGE). Ruled by `orchestrator-opus` — opus at effort max, the OPUS FALLBACK.**
Fable was out of credit for this item, so **all five sittings** — plan, draft, fix and goal, audit,
merge — were ruled by opus, not by fable. A fable ruling and an opus ruling are not the same
evidence, and every ruling in this item's record should be read as an opus ruling.

**Branch:** `nirdrang/ai4dev-48-a-green-can-be-faked-capability-provenance-is-a-caller`
**Code head, pinned:** `d831240e9908b74ecceb3b90f973c2cc2b024865`
**Chain, derived:** AI4DEV-48 (a green can be faked) → parent AI4DEV-3 (AT harness), a bring-up root
under the W0 Bring-up project. No requirement above it, so no evidence gate; this closes on a merged
pull request like any other foundation item.

## THE DECISION: **MERGE.**

### What the pin means, stated exactly, because the ruling itself moves the head

`d831240` is the commit the pre-merge audit read, the commit the executor measured, and the commit
the required check passed on. **It is the last commit on this branch that contains any executable
content of this change.** This ruling and the rewritten pull-request text are record artifacts and
ride in a commit on top of it; that commit adds markdown and touches no file under `tests/`. It gets
its own independent green from the same required check before the merge executes — GitHub requires
it, `verify` being a required status check on `main` — so nothing merges unchecked. Where this
document says "the head", it means `d831240`: the head the evidence describes.

**Merge method: squash — and THE BRANCH MUST NOT BE DELETED.** Both merge styles are in use in this
repository and the most recent item squashed, so squashing is consistent with practice. But a squash
collapses fourteen commits into one, and every SHA this ruling pins evidence to stays reachable
**only through the branch ref**: `d831240` for the green, `33a887e` for the commit the auditor
actually read, `a871d59` for the diff both Gate 2 reviewers read, and the merge base `fc8d50dd` on
which the entire severity ruling turns. The repository setting `delete_branch_on_merge` is `false`,
and it must stay false for this branch. Deleting it would leave this document citing commits nobody
can fetch — an unverifiable claim arrived at by housekeeping, which is the exact defect class this
item exists to remove. **This is a ruling, not a preference.**

---

## 1. The green, and exactly what was confirmed on it

| | |
|---|---|
| required check | `verify` (the only required status check on `main`) |
| workflow run | `31172391786`, workflow "CI", event `pull_request` |
| check run | `92846854426` |
| conclusion | **success**, completed `2026-08-07T11:01:54Z` |
| head SHA | `d831240e9908b74ecceb3b90f973c2cc2b024865` |

**I confirmed this myself against the GitHub API rather than accepting it on report** — both the
check-runs list for the SHA and the workflow run's own record, which agree on the SHA and the
conclusion. No red was classified, because there was none: the check was green first time on this
head, as it was on all six heads this branch pushed.

Local verify surface at the same head, measured by the executor before and after the final edits:
`bun run typecheck` clean on both configs · `bun run at:selftest` 9 files, **251 passed** ·
`bun run at:verify req-016 --tier loop --expect` → `12 P0: 11 green, 1 red, 0 missing` ·
`bun run at:check req-016` → 12 in the acceptance file, 12 registered ·
`tests/at/expected/req-016.json` blob `58408b86a6e8a772d8a3315e42b8a320369e1540`, byte-identical to
the pre-change baseline. The single red is the still-unbuilt static provider scan, unchanged by this
item and recorded below as work to file.

---

## 2. What was built

The harness decided whether a capability was the real article or a stand-in by reading a word the
caller passed in; the only validation was that the word was non-empty. Relabelling four wrappers in
`tests/at/harness/index.ts` therefore emptied the stand-in list that the integration-tier gate
checks, and that gate — the one whose green is supposed to mean "earned against a real database and
real product code" — passed with nothing behind it. Silently.

Provenance is now a **verdict the harness computes**, never a word a caller supplies:

- The `realCapability` / `standInCapability` pair is gone. One constructor computes a verdict from a
  witness registered per capability name, and there are three outcomes, the third of which
  **refuses** — a known name whose value cannot be classified is refused rather than promoted.
- **A capability name with no witness is refused, never defaulted.** The name table is six exact
  names and genuinely closed: no prefix, no wildcard.
- The clock and the vendor simulator are judged on the **control seam they expose** — a capability
  that can be commanded to jump forward is not the passage of time; one that can be told to reject
  the next N sends is a simulator. Faking either verdict means deleting the seam the suites drive,
  so the lie reddens tests instead of hiding.
- `fixtures.worlds` and every `sut.<key>` left the name table for a separate adapter-derived route
  carrying the module URL actually imported. After a Gate 2 finding, **the two routes are now
  disjoint and total**: the adapter route refuses any name the witness table knows, and refuses any
  name outside its own two families, so neither route can be used to walk around the other.
- The oracle witness now **accepts by enumeration on both axes** rather than by absence, after the
  most consequential finding of the item (section 4).
- `createHarness` derives every capability member from the ledger entry that judged it, so the
  object judged **is** the object handed to the suite, by construction rather than by convention.

Six source files under `tests/at/harness/` and `tests/at/suites/req-016/`, 742 lines added, 81
removed. Eight new negative-control guards, each one **observed** — reverted, the suite run, the reds
counted, then restored and confirmed back at 251 green before the next.

**Nothing rides along.** This branch changes no machinery, no workflow and no skill file.

---

## 3. Every finding and its disposition

Three review passes, **twenty-two findings**, every one ruled with the reviewer's claim quoted beside
it. Full rulings: `gate1-rulings.md`, `gate2-rulings.md`, `audit-rulings.md`.

### Gate 1 — the plan (sol, gpt-5.6, effort xhigh)

Twelve findings: six BLOCKER, three MAJOR, three MINOR. **All twelve adopted** — two in part or
fixed differently, ten in full. Three additional accepted-risk items: two accepted, one **rejected**
with a written reason (the exact-zero grep costing some historical record — the criterion stands).

The findings that changed the item most: the witnesses as first drafted **failed open**; a
verification criterion of mine was **empty by construction** and could never have failed; another
could not be executed at all under the draft contract; and my justification for not building a
separate integration adapter cited a founder ruling that **does not bear on the question** — the plan
now says plainly that the principle is extended by analogy **on my own authority, not the founder's**.

### Gate 2 — the draft diff (terra, gpt-5.6, effort max; kimi, kimi-code/k3, effort high — parallel, neither seeing the other)

Seven findings covering five distinct defects, including one sharp severity disagreement (section 4).
Dispositions: three adopted as MAJOR, two adopted as MINOR, one **adopted-modified with its framing
and its MAJOR severity rejected** — a real hole was adopted from underneath the rejected claim — and
one proposed remedy rejected in favour of a different fix.

Worth recording, because it bears on how much the two-reviewer arrangement bought: kimi ran the
eleven attack questions to completion and reported the central hunt **empty** — *"I found no path by
which a value nobody could classify reaches `real`"* — and traced all eight ledger members. Terra did
not answer the attack questions but found the accept-by-absence branch that kimi rated too low.
**Neither review alone would have produced the ruling.**

### The pre-merge audit — the claim, not the code (luna, gpt-5.6, effort max, read-only)

Three findings. **All three adopted.** Section 5.

---

## 4. The severity disagreement, and what the auditor said about my resolution

Terra rated the `oracles.judge` accepting branch a **BLOCKER**. Kimi read the same lines and rated
the same branch a **MINOR**, closing *"no BLOCKER, no MAJOR."* **I ruled MAJOR** — not by splitting
the difference, which would have been a way of not deciding, but because both reviewers were partly
wrong.

### Terra's structural claim was UPHELD

> **terra, verbatim:** *"`oracles.judge` reaches `real` on negative evidence: any non-`loop` tier
> plus any transport other than `replay-fs` is accepted, including the explicitly `fake` transport."*

True, and terra correctly named **both** axes — the tier was accepted by absence too — which kimi's
narrower description missed. "I found no forbidden thing, therefore the thing is present" is the
exact sentence that file's own header forbids, shipped inside the item whose subject line is *a green
can be faked*. Fixed: both axes now enumerate, and an unrecognised brand on either axis refuses and
names which axis and which value.

### Terra's semantic claim was REJECTED

> **terra, verbatim:** *"`NEVER_TOUCHED` is `kind: 'fake'` in `oracles.selftest.ts:195-201`, yet
> lines 960-961 require it to be `real` at integration/drill."*
>
> **and terra's verify instruction, verbatim:** *"an injected `kind: 'fake'` transport ... may not
> yield `provenance: 'real'`"*

**Rejected, and the reason is on the record and in the pull request.** Terra presents this as a
contradiction the draft introduced. It is not. At the merge base `fc8d50dd`, `createOracleCapability`
already did precisely this — refuse `replay-fs` above loop, label everything else real, `fake`
included — and the rule is deliberate and argued in the tree: *"'fake' is legal at every tier on
purpose. Conformance fakes are the instrument the tier rules are proved WITH; barring them would
leave the rules untestable, which is a worse trade than allowing an obviously-labelled fake."* The
test terra cites as evidence of a bug is the **encoding of that rule**. Following terra's instruction
would have reddened five assertions in a file this item is forbidden to touch, to overturn a rule
this item never made. **Terra maintained nothing after this; there is no live disagreement — but the
claim is quoted verbatim in the pull request anyway, because a reader deserves to see what was
rejected and judge the rejection.**

### Kimi's MINOR understated it

> **kimi, verbatim:** *"Today the only producer constrains the brand through the `TransportKind`
> union, so this is reachable only via a hand-forged transport or evidence — source-edit territory
> the plan's §7 ceiling already owns — which is why this is MINOR and not MAJOR."*

The reachability analysis is right; the conclusion is not. The evidence fields are declared plain
`string`, not the branded unions, so the exported constructor handed out a `real` verdict for a brand
nobody has ever heard of **on its current source, with no edit at all** — which is not what the
"harness is source code" ceiling covers.

### The auditor was invited to disagree with me, and did not

The audit brief asked luna in writing to say so if it disagreed with the MAJOR against terra's
BLOCKER and kimi's MINOR. It answered:

> **luna, verbatim:** *"I agree with the recorded MAJOR resolution of the terra/kimi disagreement."*

**Nothing else in this process re-examines that call**, which is why it is recorded here rather than
left in a rulings file.

---

## 5. The audit: its verdict, its three findings, and what is NOT audited

> **luna's verdict, verbatim:** *"Audit result: not mergeable as recorded. I did not run the suite or
> any `bun` command."*

**Three findings. All three ADOPTED. Every one is about prose describing the code. Not one is about
the code.** No out-of-scope finding, no rejected claim, no maintained disagreement.

1. **The "only witness" overstatement.** The claim that `oracles.judge` is the only witness that can
   reach `real` is false: three `theArticleItself` rows return `real` unconditionally on every run.
   The accurate claim is that `oracles.judge` is the only witness whose `real` verdict is **derived
   from evidence** rather than declared for a name. **I swept the tree instead of editing the one
   line I was handed and found six instances, four defective — including two shipped source comments
   and the state file, none of which the audit cited.** The plan had it right all along as *"genuinely
   evidenced"*; that qualifier was dropped exactly once, in a rulings file, and every downstream copy
   inherited the weaker word. That is this item's own subject played out inside its own record: a
   claim true where it was measured, restated slightly stronger, then propagated until the word that
   made it true was gone. Nothing checks prose.
2. **The stubbed-name comment contradicted itself** — it named two sources when there are three, and
   refuted itself nine lines later. **This one stings and is recorded as such:** that comment was
   *itself* a Gate 2 correction adopted for overclaiming, and it came out inaccurate in a different
   way.
3. **Two residual comment inaccuracies** — a ledger header crediting a witness for two families that
   never see one, and a conformance comment that mistook the four pairs it asserts for the six the
   tree accepts. Both self-refuted by correct paragraphs further down their own files.

I did **not** add the two missing assertions for the unpinned brand pairs: they reach `real` through
the same single final branch as an already-pinned pair, so they buy assertions and zero branch
coverage — and they would change code. The corrected comment states the true count and names the
three refused pairs, which forecloses the real hazard: a later reader believing only four are legal
and "fixing" the witness to refuse the other two.

### WHAT THE AUDIT DOES NOT COVER — the honest statement, and I am bound to it

**The comment corrections were made AFTER the audit ran. They are not themselves audited, and no
second audit was run on them.** The mechanism is audited and confirmed. The prose describing that
mechanism, at its last revision, is not.

What those corrections **were** subjected to is measurement, not argument. My predecessor made the
"this changes nothing executable" determination **falsifiable in advance**: it named five values that
had to be unchanged, and said in writing that if any of them moved, the audit was owed at the new
head and the sitting ended there. The executor then ran the entire verify surface before and after —
typecheck, self-tests, verify, check, and the expected-state blob hash — and every value was
identical. Line endings were checked byte by byte. Nothing in the tree reads harness source text and
asserts on it, verified independently. And the full diff was read line by line by the orchestrator
rather than taken on the executor's report: **every `+` and `-` line is a comment line or markdown
prose; no statement, expression, type, assertion, import or string literal appears anywhere in it.**

**Why no second audit was owed**, in one line each — the full argument is in `audit-rulings.md`: the
contract's re-run trigger is *"only if code changed"*, and the contract itself offers "change the
record to match the code" as a complete remedy for this finding class, so that remedy cannot be one
that automatically fires the re-run; under the broad reading of "code" the condition would be
satisfied in **every** case that can reach it, which is not a condition at all; and every affirmative
finding the audit made is a claim about executable content or file identity, which a comment edit
falsifies none of. **The argument against, at full strength:** finding 2 proves that an unreviewed
comment correction *in this very item* came out wrong, so the last act before merge is the activity
with the worst demonstrated record in it. That is real. It did not flip the determination because the
re-run is capped at one and spending it on prose leaves nothing for a real finding; because the
failure mode — wording composed by whoever was typing — was removed structurally, every replacement
string being authored in the ruling and transcribed rather than composed; and because CI gates the
new head independently.

**A reader who wants to distrust one thing in this merge should distrust the comments, not the
mechanism.** That is the accurate place to point, and it is why this paragraph exists.

---

## 6. What this green does and does not claim

**It claims:** no caller in this tree can name a capability's provenance; a capability name nobody
decided about is refused; a known name whose value cannot be classified is refused rather than
promoted; the four reference capabilities cannot reach `real` through any route the API offers; the
integration-tier gate cannot be satisfied by the reference adapter under any relabelling; the object
the witness judged is the object the suite receives, by construction; and — for the clock and the
vendor simulator specifically — faking the verdict requires removing the very seam the suites drive,
so the lie reddens tests rather than hiding.

**It does not claim:** that the harness cannot be faked. The harness is source code. An author who
edits a witness **and** the conformance test asserting it can still produce a false green. Producer
and witness can drift apart in future edits, and a future value could collide with a witness's shape
by accident. **The honest ceiling is: the current assemblies are pinned by construction and by
conformance assertions; deliberate or future producer/witness drift remains possible.** What changed
is the character of the act — it stops being a one-word relabel that reads like a routine promotion
and becomes a multi-file edit that visibly disables a named guard.

**It also does not claim the self-defeating-lie property for all six capabilities** — only for the
two seam-witnessed ones. Kimi found that overreach in a comment and it was narrowed; the comment now
says plainly what the other four cost.

**Nor does it make the integration tier reachable.** It makes that tier honestly unreachable, which
it already was. Reaching it means changing what the harness hands a suite, not relabelling it.

**And it does not claim the twelfth notification test passes.** Eleven of twelve are green; the
twelfth is red on a provider scan nobody has built. That red is pre-existing, unchanged by this item,
and recorded below as work to file.

---

## 7. Maintained reviewer disagreement

**None.** No reviewer maintained a position after its finding was ruled, and no reviewer tagged this
green as unearned. The one claim I rejected outright at Gate 2 — terra's semantic claim in section 4
— is quoted verbatim in the pull request body so a reader can see the rejected claim and judge the
rejection, not merely be told it happened. The audit produced no rejected claim at all.

---

## 8. Open question for the founder — not blocking, and it was never blocking

**Do you want tier-specific fixture-adapter selection built now, or filed?** In plain terms: today
the harness loads the same reference adapter whatever tier you ask for, and the only thing stopping a
reference adapter from satisfying the closing gate is the stand-in ledger this item hardened. The
alternative makes the tier decide which adapter file loads — the fast inner-loop tier keeps the
reference adapter; any deeper tier looks for a real product adapter that does not exist yet and fails
loudly. It builds no product code.

I filed it rather than built it because it covers only two of the eight capabilities this item fixes,
and because it turns building a harness at a deeper tier from something that works today into
something that throws, with knock-on effects on the oracle self-tests. The argument for doing it now
is that this is the last acceptance-test-engine item before product work starts, and it would be a
second, independent barrier.

---

## 9. To report upward for filing — nothing here is absorbed by this item

The conductor and coordinator should hand these up after this item closes. **I am not filing them
myself.**

1. **Tier-specific fixture-adapter selection** — the founder question above. **Recommend filing.**
   Note for whoever picks it up: it changes building a harness at the integration tier from returning
   a harness to throwing, with a blast radius through the oracle self-tests.
2. **The static provider scan has no board item.** `h.static` is an unconditional pending capability,
   which is why one of the twelve notification tests is the single red. Left-over work from the
   sentinels item, harness-owned, buildable today, independent of the product; supplying it is what
   would make the count twelve rather than eleven. **Recommend filing.**
3. **A typed `stubbed-capabilities` failure kind**, so a deeper-tier refusal is structurally
   declarable rather than matched as free-form text. Close enough to the already-filed structured
   capability-codes item that it should be **added to that existing item rather than filed fresh.**

Also flagged, **not** for filing: that same structured-codes item wants a machine-readable code
emitted from the capabilities file this item rewrote. Deliberately not absorbed — the obligation this
item carried was negative (the rewrite must not make emitting such a code harder), and the new
verdict type arguably makes it easier, since every verdict now carries its own words.

---

## 10. One process finding, for the coordinator to fold

There is **no reflection step** (founder ruling 2026-08-06), and this is not one. It is a single
observation that belongs to whoever maintains the way of work, recorded here because it would
otherwise be lost:

**Four of this item's defects were unexecutable or untrue criteria of mine, not code defects** — a
verification guard that was empty by construction (found at Gate 1), a verify-suite row that could
never pass (found in the draft), a command form that exits non-zero however healthy the tree is
(found in the fix sitting), and a claim that degraded across four copies of the record (found by the
audit). One cause every time: **prose written into a record without being run, or without being
re-checked against the thing it describes.** The baseline this item measured covered typecheck,
self-tests and verify — and every one of the four landed in what it did not measure. Worth a process
fix by someone; it was not this item's to build.

A second, smaller one: a distiller wrote its output to a nested artifacts directory inside the item
worktree rather than the sibling one it was pointed at, and it was found only by searching. Evidence
left only in an artifacts directory dies with the sweep. All raw critiques and distillates for this
item — Gate 1, both Gate 2 reviewers, and the audit — are committed into `loop/items/AI4DEV-48/`, so
this item's record is safe either way, but the next one's may not be.

---

## 11. The record this ruling names

`loop/items/AI4DEV-48/` holds the whole item: `plan.md` (amended after Gate 1), the three prompt
files, all four raw reviewer outputs and their distillates, `gate1-rulings.md`, `gate2-rulings.md`,
`audit-brief.md`, `audit-rulings.md`, `baseline-before-fix.md`, `PHASE-STATE.md` and this ruling.
`audit-brief.md` deliberately still contains the overstated sentence finding 1 corrected elsewhere:
it is the brief **as issued to the auditor**, and editing it would falsify what the auditor was
actually asked.
