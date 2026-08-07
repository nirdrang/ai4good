# AI4DEV-48 (a green can be faked) — rulings on the pre-merge audit

**Sitting 4 (AUDIT). Ruled by `orchestrator-opus` — opus at effort max, the OPUS FALLBACK. Fable is
out of credit for this item.** A fable ruling and an opus ruling are not the same evidence.

**Auditor:** luna, gpt-5.6, effort max, read-only, whole-tree access with change-only scope, against
`audit-brief.md` at head `33a887e`.
**Verdict as returned, verbatim:** *"Audit result: not mergeable as recorded. I did not run the suite
or any `bun` command."*
**Three findings. All three ADOPTED. None of them changes executable behaviour.**

---

## Before the rulings: what the audit CONFIRMED, and why that is the larger half

The auditor was pointed at three boxes the last sitting called the ones that mattered most. All three
came back answered, and two of them were the load-bearing facts of the whole item:

- **The merge-base fact holds.** The severity ruling that demoted a reviewer's BLOCKER to a MAJOR
  rests entirely on `fc8d50dd` already labelling a `fake` transport real above loop. The audit
  checked it and did not contradict it.
- **The new pins actually pin, and the regexes are unique to the witness's own messages** — not also
  matched by `oracles.ts`. That was the fix most likely to be vacuous, and it is not.
- **The disagreement resolution stands.** The auditor was invited in writing to disagree with my
  MAJOR against terra's BLOCKER and kimi's MINOR, and answered: *"I agree with the recorded MAJOR
  resolution of the terra/kimi disagreement."* Nothing else in this process re-examines that call.

Also confirmed: A1–A4 and A6 implemented; rejected claims still rejected including `fake` above loop;
forbidden files and the acceptance-test hash unchanged; scope and line endings clean with no control
residue; **all eight negative-control assertions and their guards present.**

**Every one of the three findings is about PROSE describing the code. Not one is about the code.**
That distinction is the whole disposition below, so I did not take it on the auditor's word either —
I read all four cited sites myself and swept the tree for more.

---

## Finding 1 — the "only witness" overstatement — **ADOPTED, and it is FOUR sites, not one**

> **luna, verbatim:** *"Gate 2 fact 2 is false literally. `theArticleItself()` is a
> `CapabilityWitness` and returns `real`; three such witnesses are registered alongside
> `oracles.judge` (capabilities.ts:96). The accurate claim is that `oracles.judge` is the only
> evidence-derived or conditional real witness. The severity ruling remains sound."*

### Verified, and the auditor is right on the substance

`theArticleItself()` (`capabilities.ts:96-101`) returns a `CapabilityWitness` whose verdict is
`{ kind: 'real', … }` **unconditionally, with no throw path**, and it is registered three times —
`config.registry`, `sentinels.planted`, `faults.injection` (`capabilities.ts:176-178`). All three are
constructed on every harness build (`index.ts:174, 183, 184`). So they do not merely *reach* `real`;
they reach it on **every single run**, which is more reachable than `oracles.judge`'s `real`, which
needs a non-loop tier. The sentence is false, and false in the direction of understating how much
`real` this table hands out.

### Where I do not follow the auditor, and where I go further than it did

**It is not "Gate 2 fact 2" that is worst.** `gate2-rulings.md:87` makes the bolded claim and then
**names the three `theArticleItself` rows in the very next sentence** — "The three `theArticleItself`
rows are declarations; the two seam witnesses can only ever return stand-in or throw." The record
knew. The bolded sentence is still false as written, so this is adopted — but it is the *least*
wrong instance, and it is the only one the auditor found.

I swept the tree for the claim rather than fixing the one line I was handed. **There are six
instances, four of them defective, and the two worst are shipped code comments the audit never
named:**

| site | text | state |
|---|---|---|
| `plan.md:230` | "the one witness with a **genuinely evidenced** `real` outcome" | **ACCURATE — no change** |
| `gate2-rulings.md:87` | "the only witness in the table with a **reachable** `real` outcome" | false, qualified by the next sentence — **fix** |
| `audit-brief.md:106` | quotes the rulings sentence, then qualifies it | **DO NOT TOUCH** — see below |
| `PHASE-STATE.md:51` | "the **only** witness with a reachable `real` outcome" | false, unqualified — **fix** |
| `capabilities.ts:109` | "the **ONE** witness in the table with a reachable `real` outcome" | false, unqualified, **shipped** — **fix** |
| `conformance.selftest.ts:250` | "the **one** witness in the table that can reach `real` at all" | false, unqualified, **shipped** — **fix** |

**The plan said it correctly and the claim degraded as it was copied forward.** `plan.md:230` carries
the qualifier "genuinely evidenced", which is precisely the accurate formulation the auditor
proposes. That word was dropped exactly once — at `gate2-rulings.md:87`, where "genuinely evidenced"
became "reachable" — and every downstream copy inherited the weaker word, two of them into source
comments with no qualifying sentence anywhere near them.

That is worth recording plainly, because it is the item's own subject played out in the record: a
claim that was true at the point it was measured, restated slightly stronger, and then propagated
until the qualifier that made it true was gone. Nothing checks prose.

**`audit-brief.md` is not corrected.** It is the brief **as issued to the auditor**, and editing it
would falsify what the auditor was actually asked — the same reason a reviewer's raw output is never
edited. It stays wrong, on purpose, and this ruling is the correction.

**The severity ruling is untouched, and the auditor agrees.** The MAJOR rests on the `oracles.judge`
branch being the only place a `real` verdict is *derived by reasoning about evidence*, which is
exactly where reasoning can be wrong. The three declaration rows inspect nothing and decide about a
name. Correcting the sentence sharpens the argument; it does not weaken it.

---

## Finding 2 — the A5 contracts comment contradicts itself — **ADOPTED**

> **luna, verbatim:** *"A5 is incomplete. The contracts comment says every stubbed name comes from a
> value seam or module URL, but `oracles.judge` comes from tier and transport evidence
> (contracts.ts:327). Its later paragraph admits this, so the comment contradicts itself."*

**Verified exactly as stated.** `contracts.ts:327-329` offers **two** sources — "a witness … that read
the value's own control seam, or … the module URL". `oracles.judge` at the loop tier is on the
stubbed list and got there from **neither**: it is derived from tier plus transport brand
(`capabilities.ts:186-235`). And the same docblock's own later paragraph (`:334-338`) says so — "for
`fixtures.worlds`, every `sut.<key>` and `oracles.judge` there is no such seam: the verdict comes
from the adapter-derived route or from the tier and transport brands." The docblock refutes itself
nine lines later.

**This one stings, and I am recording why.** A5 *was itself a comment correction*, adopted from
Gate 2 for overclaiming, and it came out incomplete. A comment corrected for inaccuracy was replaced
by a differently inaccurate comment. That is direct in-item evidence that this exact activity fails
when done quickly, and it is why the replacement text below is authored here, in the ruling, rather
than left to whoever types it.

---

## Finding 3 — two residual comment inaccuracies — **ADOPTED, both**

> **luna, verbatim:** *"Two residual comment inaccuracies remain: the ledger header says every
> capability carries a witness verdict although adapter-derived capabilities do not (index.ts:136);
> and the conformance comment says there are four legal oracle combinations, while six combinations
> are accepted (conformance.selftest.ts:269)."*

### 3a — the ledger header — verified

`index.ts:136` reads "Every capability this harness constructs, each carrying the verdict **its
witness** reached." The `CapabilityLedger` includes `fixtures` and every `sut.<key>`, both built by
`adapterDerivedCapability()` (`index.ts:182, 196`), which **consults no witness at all** — it stamps
stand-in and names the module URL. The header is false for those.

Same shape as finding 2 again: `buildCapabilityLedger`'s own docblock 26 lines below already states
it correctly — "either hands its value to the witness registered for that name, or — for the two
adapter-derived families — carries the module URL." **The unqualified header, the correct body.**
Three findings, three instances of the same pattern.

### 3b — the combination count — verified by enumeration, and it is six

Three legal tiers times three legal transports is nine pairs. Three throw:

- `loop` + `live` (`capabilities.ts:214-219`)
- `integration` + `replay-fs` and `drill` + `replay-fs` (`:225-230`)

Nine minus three is **six accepted**: `loop`+`replay-fs` and `loop`+`fake` as stand-in;
`integration`+`live`, `integration`+`fake`, `drill`+`live`, `drill`+`fake` as real. The comment says
four. Four is the number of pairs **this test asserts** (`:272-279`), not the number the tree allows.
The comment mistook its own sample for the space.

**I am NOT adding the two missing assertions, and this is a ruling, not a saving.** `integration`+`fake`
and `drill`+`live` reach `real` through the **same single final branch** (`capabilities.ts:231-234`)
as the already-pinned `drill`+`fake`. Adding them buys assertions and zero branch coverage, and it
would change code — which under the determination below would owe a second audit for prose. The
corrected comment instead states the true count, names the three refused pairs, and says which four
are pinned and why the other two are not, which forecloses the real hazard here: a later reader
believing only four are legal and "fixing" the witness to refuse the other two.

---

## THE DETERMINATION: does this change code, and is a second audit owed?

**The contract's trigger is: "The audit re-runs once per item, and only if code changed."** The
conductor is right that "code changed" reads narrowly (executable behaviour) or broadly (any tracked
file). I apply the **narrow, executable-behaviour reading**, and I state why in full because
`shared-invariants.md` forbids inferring a loosening.

**This is not a loosening inferred from silence. It is the only reading under which the sentence
means anything:**

1. **The contract pairs "code" against "record" in the very disposition governing this finding
   class.** *"The record is false … either the code changes to match the record or the record changes
   to match the code."* The contract names a complete remedy that changes the record and not the
   code. A remedy the contract explicitly offers cannot be one that automatically fires the re-run
   condition, or it could never be used.
2. **Under the broad reading the condition is vacuous.** Every audit-driven fix writes at minimum
   `audit-rulings.md` and `PHASE-STATE.md`, both tracked files in the tree. "Only if code changed"
   would then be true in every case that can ever reach it — a condition that is always satisfied is
   not a condition, and the drafter did not write a qualifier meaning "always".
3. **The re-run exists so the audit's verdict describes the commit that merges.** Every affirmative
   finding luna made is a claim about executable content or file identity: guards present, assertions
   present, regexes unique, hashes unchanged, scope and line endings clean. **A comment edit falsifies
   none of them** — and I do not have to argue that, I can measure it.

**The argument on the other side, stated at full strength rather than buried:** finding 2 is proof
that an unreviewed comment correction in this very item came out wrong. The last thing this branch
does before merging is therefore the activity with the worst demonstrated track record in it. That is
real and I am not dismissing it. It does not flip the determination, for three reasons:

- **It argues for care, not for a re-run.** The re-run is capped at once per item. Spending it on
  prose leaves nothing for a real finding; and if a re-run surfaced a *fourth* comment nit, the cap
  would be spent and I would rule terminally — the same place I stand now, one wait later.
- **The failure mode is structural and I removed it.** A5 failed because the replacement wording was
  decided loosely by whoever was typing. **Every replacement string below is authored here, in this
  ruling.** The executor transcribes; it does not compose.
- **CI still gates the new head independently.** A comment edit that broke a parse cannot merge.

### The determination is CONDITIONAL and FALSIFIABLE — I do not get to assert non-executability

The executor re-runs the **entire** verify surface after the edits. If **any** of these moves:

| must be unchanged | value |
|---|---|
| `bun run typecheck` | clean, both projects |
| `bun run at:selftest` | `251 passed`, 9 files |
| `bun run at:verify req-016 --tier loop --expect` | `12 P0: 11 green, 1 red, 0 missing` |
| `bun run at:check req-016` | `12 P0 in the acceptance file, 12 registered in the suite` |
| `tests/at/expected/req-016.json` blob hash | `58408b86a6e8a772d8a3315e42b8a320369e1540` |

…then something executable changed, this determination does not hold for these edits, **the audit is
owed at the new head, and the sitting ends there instead of proceeding.** Verified independently:
nothing in the tree reads harness source text and asserts on it — `check.ts` reads only
`.taskmaster/docs/acceptance/at-req-0NN.md` and `tests/at/suites/req-016/*.test.ts`, and none of the
four files edited here is in either set. So comments are not load-bearing; the run confirms it rather
than the reasoning standing alone.

**What the merge ruling must therefore say, and I am binding my successor to it:** the final comment
corrections on this branch were made *after* the audit and are **not themselves audited**. The
mechanism is audited. The prose describing it, at its last revision, is not. That is the honest
statement of what the green claims and it goes in the pull request.

---

## The exact replacement text — authored here, transcribed verbatim, composed by nobody else

Five sites in four source files, plus one record file. **Comments and prose only. No statement, no
expression, no type, no assertion, no import is touched.**

### E1 — `tests/at/harness/capabilities.ts`, in the block comment above `LEGAL_TIERS`

REPLACE:
```
 * verdict. That is "I found no forbidden thing, therefore the thing is present" — the sentence this
 * file's own header forbids, on the ONE witness in the table with a reachable `real` outcome. A
```
WITH:
```
 * verdict. That is "I found no forbidden thing, therefore the thing is present" — the sentence this
 * file's own header forbids, on the only witness here whose `real` verdict is DERIVED. The three
 * `theArticleItself` rows return `real` too, and on every run, but unconditionally and from a
 * decision about the name; this is the one witness that reaches `real` by reasoning about evidence,
 * so it is the only place that reasoning can be wrong. A
```

### E2 — `tests/at/harness/contracts.ts`, in the `stubbedCapabilities()` docblock

REPLACE:
```
   * Each name on this list was put there by a witness in `capabilities.ts` that read the value's
   * own control seam, or by the module URL the fixture adapter was loaded from. No caller names a
   * provenance.
```
WITH:
```
   * Each name on this list was put there by `capabilities.ts` from one of THREE sources: a witness
   * that read the value's own control seam, the module URL the fixture adapter was loaded from, or —
   * for `oracles.judge` alone — the running tier and the judge transport's kind brand. No caller
   * names a provenance.
```

### E3 — `tests/at/harness/index.ts`, the `CapabilityLedger` header

REPLACE:
```
 * Every capability this harness constructs, each carrying the verdict its witness reached.
```
WITH:
```
 * Every capability this harness constructs, each carrying the verdict that classified it — from the
 * witness registered for its name, or, for the two adapter-derived families (`fixtures.worlds` and
 * every `sut.<key>`), from the route itself, which stamps stand-in and names the module URL it was
 * loaded from. No witness is consulted for those two.
```

### E4 — `tests/at/harness/conformance.selftest.ts`, inside the accept-by-enumeration test

REPLACE:
```
    // back `real` with confident-sounding evidence — on the one witness in the table that can reach
    // `real` at all. `CapabilityEvidence` carries plain strings, deliberately, because the evidence
    // comes from a caller; a type union could not have caught this and is not what does.
```
WITH:
```
    // back `real` with confident-sounding evidence — on the only witness whose `real` verdict is
    // derived from evidence rather than declared for a name, which is what makes it the one place
    // that reasoning can go wrong. `CapabilityEvidence` carries plain strings, deliberately, because
    // the evidence comes from a caller; a type union could not have caught this and is not what does.
```

### E5 — `tests/at/harness/conformance.selftest.ts`, above the four accepting assertions

REPLACE:
```
    // AND THE ENUMERATION DISCRIMINATES rather than refusing everything: the four legal combinations
    // the tree deliberately allows still build, including a `fake` transport above loop, which is
    // the instrument the tier rules are themselves tested with.
```
WITH:
```
    // AND THE ENUMERATION DISCRIMINATES rather than refusing everything. SIX of the nine brand pairs
    // are accepted; the three refused are loop+live, integration+replay-fs and drill+replay-fs. The
    // four pinned below cover every rule that produces an acceptance, including a `fake` transport
    // above loop, which is the instrument the tier rules are themselves tested with. The two
    // unpinned pairs — integration+fake and drill+live — reach `real` through the same final branch
    // as drill+fake, so pinning them would add assertions and no coverage.
```

### E6 — `loop/items/AI4DEV-48/gate2-rulings.md`, the bolded sentence at line 87

REPLACE:
```
And `oracles.judge` is **the only witness in the table with a reachable `real` outcome**. The three
```
WITH:
```
And `oracles.judge` is **the only witness in the table whose `real` outcome is derived from evidence**
— corrected here after the pre-merge audit, which caught this sentence overstated as "the only
witness with a reachable `real` outcome"; that is false, and `plan.md:230` had it right as "genuinely
evidenced" before this file weakened it. The three
```

**Not edited, deliberately:** `plan.md:230` (already accurate) and `audit-brief.md:106` (the brief as
issued — editing it would falsify what the auditor was asked).

**`PHASE-STATE.md:51` has no E-block on purpose, and my executor was right to say so.** It read the
finding-1 table, saw a fourth site marked "fix" with no authored replacement beside it, and refused to
compose one — which is exactly the instruction, and exactly the discipline whose absence produced the
A5 defect in the first place. The gap was real and it was mine. **That sentence is corrected in this
sitting's rewrite of `PHASE-STATE.md`, authored by me at the close of the sitting**, because the file
is rewritten wholesale for the next phase anyway and a replacement string for a line that is about to
be replaced entirely would be a fiction. Recorded here so the site marked "fix" is not left looking
untouched.

---

## Nothing is deferred and nothing is filed from this audit

Every finding is adopted and fixed in this sitting. The audit produced no out-of-scope finding, no
rejected claim, and no maintained disagreement. There is nothing to carry forward and nothing owed to
the founder from it.
