# AI4DEV-48 (a green can be faked) — phase state

**Phase just completed:** AUDIT (sitting 4) — three findings ruled, all adopted, all prose; fixes
applied and the whole verify surface re-run to prove they changed nothing executable
**Phase next:** MERGE — CI green on the exact head, then the merge ruling. **No second audit is
owed, and the reasoning is written out below rather than assumed**
**Branch:** `nirdrang/ai4dev-48-a-green-can-be-faked-capability-provenance-is-a-caller`
**Chain, derived:** AI4DEV-48 (a green can be faked) → parent AI4DEV-3 (AT harness), a bring-up
root under the W0 Bring-up project, carrying `attr:bringup`. No requirement above it, so no
evidence gate — this closes on a merged pull request like any other foundation item.

---

## THE OPUS FALLBACK IS IN FORCE FOR THIS ITEM, NOT JUST THIS SITTING

Fable is out of credit. Every orchestrator sitting on AI4DEV-48 runs as `orchestrator-opus`
(opus at effort max), which is a different agent TYPE, never a model override on the fable
definition. A fable ruling and an opus ruling are not the same evidence: read every ruling in this
item — the plan's decisions, the twelve Gate 1 dispositions, the seven Gate 2 dispositions and the
three audit dispositions — as an opus ruling. Any successor sitting that finds itself running as
fable should say so in its first line rather than assume continuity.

---

## What happened this sitting

The read-only pre-merge audit (luna, gpt-5.6, effort max) returned **"not mergeable as recorded"**
with **three findings. All three are adopted. Every one is about prose describing the code, and not
one is about the code.** Full rulings, with each claim quoted verbatim beside its disposition, are in
`audit-rulings.md`.

### The larger half is what the audit CONFIRMED

All three boxes the last sitting called the most consequential came back answered:

- **The merge-base fact holds.** The entire severity ruling that demoted a reviewer's BLOCKER to a
  MAJOR rests on `fc8d50dd` already labelling a `fake` transport real above loop. Not contradicted.
- **The new pins genuinely pin**, and their regexes match the witness's own messages only — not also
  `oracles.ts`'s. That was the fix most likely to be vacuous. It is not.
- **The disagreement resolution stands.** The auditor was invited in writing to disagree with my
  MAJOR against terra's BLOCKER and kimi's MINOR, and answered: *"I agree with the recorded MAJOR
  resolution of the terra/kimi disagreement."* Nothing else in this process re-examines that call.

Also confirmed: A1–A4 and A6 implemented; rejected claims still rejected including `fake` above loop;
forbidden files and the acceptance-test hash unchanged; scope and line endings clean with no control
residue; **all eight negative-control assertions and their guards present.**

### Finding 1 was four sites, not the one the audit named

The claim *"`oracles.judge` is the only witness that can reach `real`"* is **false**:
`theArticleItself()` is also a `CapabilityWitness`, returns `real` unconditionally, and is registered
three times (`config.registry`, `sentinels.planted`, `faults.injection`) — all three built on **every**
harness run, which makes them more reachable than `oracles.judge`'s `real`, which needs a non-loop
tier. The accurate claim is that `oracles.judge` is the only witness whose `real` verdict is **derived
from evidence** rather than declared for a name.

**I swept the tree rather than editing the line I was handed, and found six instances, four of them
defective — including two shipped source comments and this file, none of which the audit cited.**
`plan.md:230` had it right all along as *"genuinely evidenced"*. That qualifier was dropped exactly
once, when `gate2-rulings.md:87` restated it as *"reachable"*, and every downstream copy inherited the
weaker word.

**That is this item's own subject played out inside its own record**: a claim true where it was
measured, restated slightly stronger, then propagated until the word that made it true was gone.
Nothing checks prose. Corrected at every live site; `audit-brief.md` is deliberately left wrong,
because it is the brief **as issued** and editing it would falsify what the auditor was asked.

### Findings 2 and 3 are the same shape three times over

Each is an unqualified header contradicted by a correct paragraph further down the same file:
`contracts.ts` named two sources for a stubbed name when there are three and refuted itself nine lines
later; `index.ts`'s ledger header credited a witness for two families that never see one, while
`buildCapabilityLedger`'s own docblock 26 lines below says it correctly; and the conformance comment
mistook the four pairs it asserts for the six the tree accepts (nine pairs minus `loop`+`live`,
`integration`+`replay-fs` and `drill`+`replay-fs`).

**Finding 2 stings and is recorded as such:** that comment was *itself* a Gate 2 correction adopted for
overclaiming, and it came out inaccurate in a different way. Direct in-item evidence that this exact
activity fails when done quickly — which is why every replacement string was authored in the ruling
and the executor transcribed rather than composed.

**I did not add the two missing assertions** for the unpinned combinations. `integration`+`fake` and
`drill`+`live` reach `real` through the same single final branch as the already-pinned `drill`+`fake`,
so they buy assertions and zero branch coverage — and they would change code. The corrected comment
states the true count and names which pairs are refused, which forecloses the real hazard: a later
reader believing only four are legal and "fixing" the witness to refuse the other two.

---

## WHY NO SECOND AUDIT IS OWED — the determination, and the evidence for it

The contract's trigger is *"The audit re-runs once per item, and only if code changed."* "Code changed"
reads narrowly (executable behaviour) or broadly (any tracked file). **I applied the narrow reading**,
and `shared-invariants.md` forbids inferring a loosening, so the reasoning is on the record in full in
`audit-rulings.md`. In short:

1. The contract pairs "code" against "record" **in the very disposition governing this finding class** —
   *"either the code changes to match the record or the record changes to match the code."* A remedy
   the contract explicitly offers cannot be one that automatically fires the re-run condition.
2. **Under the broad reading the condition is vacuous.** Every audit-driven fix writes at minimum the
   rulings file and this file, both tracked. A qualifier true in every case that can reach it is not a
   qualifier.
3. Every affirmative finding the audit made is a claim about executable content or file identity —
   guards present, assertions present, regexes unique, hashes unchanged, scope clean. **A comment edit
   falsifies none of them, and that was measured rather than argued.**

**The argument against, stated at full strength:** finding 2 proves an unreviewed comment correction in
this very item came out wrong, so the last act before merge is the activity with the worst demonstrated
record in it. That is real. It did not flip the determination because the re-run is capped at one — 
spending it on prose leaves nothing for a real finding, and a fourth prose nit would exhaust the cap
and land me exactly here, one wait later — because the A5 failure mode was loose wording decided by
whoever typed it, which I removed structurally, and because CI still gates the new head independently.

**The determination was made falsifiable, and it survived.** The executor ran the entire verify surface
**before and after** the edits, so "unchanged" is a measurement:

| check | before | after |
|---|---|---|
| `bun run typecheck` | clean, both configs | **clean, both configs** |
| `bun run at:selftest` | 9 files, 251 passed | **9 files, 251 passed** |
| `bun run at:verify req-016 --tier loop --expect` | `12 P0: 11 green, 1 red, 0 missing` | **identical** |
| `bun run at:check req-016` | 12 in the acceptance file, 12 registered | **identical** |
| `tests/at/expected/req-016.json` blob | `58408b86a6e8a772d8a3315e42b8a320369e1540` | **identical** |

Line endings were checked byte by byte: the four TypeScript files were pure CRLF before and after with
zero bare LF, the record file pure LF, and the line-count increases equal exactly the comment lines
added. **Independently verified: nothing in the tree reads harness source text and asserts on it** —
`check.ts` reads only `.taskmaster/docs/acceptance/at-req-0NN.md` and `tests/at/suites/req-016/*.test.ts`,
and none of the five edited files is in either set.

**I read the full diff myself rather than taking the executor's report.** Every `+` and `-` line is a
comment line or markdown prose. No statement, expression, type, assertion, import or string literal
appears anywhere in it.

---

## What completes the next phase — MERGE

1. **CI green on the exact head this state file rides in.** Never merge without it. That head is the
   one to pin; if the head moves, the evidence describes a different commit.
2. **Classify a red before reacting**, per the contract: infrastructure or flake (re-run the check
   once, no new commit — and read `cancelled` carefully: a job that never got a runner and is then
   killed by its own `timeout-minutes` reports `cancelled`, which looks deliberate. **No runner
   assigned and zero steps executed is unambiguously infrastructure, and that class forbids
   remediation** — wait, re-trigger, change nothing, file nothing); broken by this change; or
   pre-existing on main. Local green while CI is red gets **two pushes, then escalate**.
3. **Write the merge ruling pinned to that head**, then a mechanical publishes it as handed and
   executes the merge. Check the merged state afterwards. **There is no reflection step** (founder
   ruling 2026-08-06).

### THE MERGE RULING MUST SAY THIS, and I am binding my successor to it

**The comment corrections on this branch were made AFTER the audit and are not themselves audited.**
The mechanism is audited and confirmed. The prose describing it, at its last revision, is not. That is
the honest statement of what the green does and does not claim, and it belongs in the pull request.

It must also record, among the dispositions: the audit's verdict and its three findings all adopted;
that the auditor **agreed** with the MAJOR resolution of the reviewer disagreement; and — carried
forward from the last sitting and still owed — **that a reviewer's structural claim about the
`oracles.judge` branch was upheld while its semantic claim was rejected**, with the rejected claim
visible in the pull request.

### The pull request

**#46, already open, and its text requirement is RESOLVED.** I scanned title and body with a regex for
every `AI4DEV-*` and `AI4PM-*` id: the only id present is this branch's own. **No foreign ids.** That
matters because an id alone — with no closing verb — links and moves that item; a finished item was
once dragged back to In Progress twenty-four minutes after its own merge by a body carrying a bare
reference. CI enforces this.

**The body is STALE and the merge sitting must replace it.** It still says *"This pull request
currently carries the PLAN only. No code has changed yet."* That was true at sitting 1 and is now
false. Whoever rewrites it: describe other items **in words**, never by id.

---

## Verify surface for this item

`bun run typecheck` · `bun run at:selftest` · `bun run at:verify req-016 --tier loop --expect` ·
`bun run at:check req-016` (**the requirement argument is required** — bare `at:check` exits 2).
**Not `bun run lint`** — red repository-wide from a CRLF checkout, and CI runs no lint step.

Baseline at the pre-fix head `219cae23`: `12 P0: 11 green, 1 red, 0 missing`; self-tests `243 passed`.
**Now: the same verify numbers, self-tests at `251 passed`** — the eight added tests are the new guards
and their pins — and `tests/at/expected/req-016.json` byte-identical, confirmed by blob hash.

### The eight negative controls were OBSERVED, not reasoned about

Each guard was reverted, the suite run, and the reds counted, then restored and confirmed back at 251
green before the next began. Controls 6 and 7 are the empirical confirmation of both reviewers' claim:
before this item, deleting either copy of the witness's refusal branch left **every test in the tree
green**. Each deletion is now caught, and caught only by the new pin. Full table in the previous
revision of this file, in git history at `33a887e`.

---

## Question for the founder — still ONE, still open, still not blocking

Unchanged and not re-litigated this sitting. The plan justified not building a separate
integration-adapter path by citing a founder ruling about vendor stand-ins; **Gate 1 found that
citation does not bear on the question, and it is right.** The plan is corrected to say the principle
is being extended **by analogy on my own authority, not the founder's.**

**Do you want tier-specific fixture-adapter selection built now, or filed?** In plain terms: today the
harness loads the same reference adapter whatever tier you ask for, and the only thing stopping a
reference adapter from satisfying the closing gate is the stand-in ledger. The alternative makes the
tier decide which adapter file loads — the fast inner-loop tier keeps the reference adapter, any deeper
tier looks for a real product adapter that does not exist yet and fails loudly. It builds no product
code.

I filed it rather than built it because it covers only two of the eight capabilities this item fixes,
and because it turns building a harness at the deeper tier from something that works today into
something that throws, with knock-on effects on the oracle tests. The argument for doing it now is that
this is the last acceptance-test-engine item before product work starts, and it would be a second,
independent barrier. **No answer is needed for this item to proceed.**

---

## To report upward for filing — separate items, absorbed nowhere

Unchanged; the audit added nothing to this list.

1. **Tier-specific fixture-adapter selection** — described in the founder question above. **Recommend
   filing.** Note for whoever picks it up: it changes building a harness at the integration tier from
   returning a harness to throwing, with a blast radius through the oracle self-tests.
2. **The static provider scan has no board item.** `h.static` is an unconditional `pendingCapability`,
   which is why one of the twelve notification tests is the single red. Left-over work from the
   sentinels item (Done), harness-owned, buildable today, independent of the product, and supplying it
   is what would make the count twelve rather than eleven. **Recommend filing.**
3. **A typed `stubbed-capabilities` failure kind**, so the deeper-tier refusal is structurally
   declarable rather than matched as free-form text. Close enough to the already-filed structured
   capability codes item that it should be **added to that existing item rather than filed fresh**.

Also flagged, not for filing: that same structured-codes item wants a machine-readable code emitted from
`capabilities.ts`, the exact file this item rewrote. Deliberately not absorbed — the obligation carried
was negative (the rewrite must not make emitting such a code harder), and the new `CapabilityVerdict`
type arguably makes it easier, since every verdict now carries its own words.

---

## Process notes for whoever folds them

1. **A distiller wrote to a nested artifacts directory inside the item worktree** rather than the
   sibling one the conductor pointed at, found only by searching. A distiller writing relative to its
   cwd will keep doing this, and evidence left only in an artifacts directory dies with the sweep. All
   raw critiques and distillates for this item — Gate 1, both Gate 2 reviewers, and the audit — are now
   committed into `loop/items/AI4DEV-48/`, so the record is safe either way.
2. **Four of this item's defects were unexecutable or untrue criteria of mine, not code defects**: the
   `git diff --stat` guard that was empty by construction (Gate 1), the `bun run lint` row (draft), the
   bare `bun run at:check` that cannot pass (fix sitting), and now a claim that degraded across four
   copies of the record (audit). One cause every time — **prose written into a record without being run
   or re-checked against the thing it describes.** The baseline measured typecheck, selftest and verify,
   and every one of the four landed in what it did not measure. Worth a process fix by someone; it is
   not this item's to build.
