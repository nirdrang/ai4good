# AI4DEV-48 (a green can be faked) — the audit brief

**For the pre-merge auditor.** Read-only on the claim, not on the code's quality.

**Scope: whole tree readable, CHANGE-ONLY judgeable.** You may read anything to understand the
change. You may only report on what this branch changed. A defect in code this branch never touched
belongs to another item — name it separately if you must, but it is not a finding against this one.

---

## DO NOT RUN THE SUITE. This is not a convenience, it is the instruction.

Execution evidence belongs to CI, which gates this merge on its own runners. Across four earlier
items, audit execution attempts produced almost nothing but "could not verify", and once produced
two FAIL verdicts that turned out to be sandbox artifacts — while **every reading-and-tracing
question ever put to an audit came back answered.** So every box below is answerable by reading the
source, reading the record, and running `git` queries. None requires `bun`.

---

## What this item is

The harness's capability ledger reports which capabilities are stand-ins. `registry.ts:618-620`
refuses ANY stubbed capability above the loop tier, which is the closing gate. Provenance used to be
a **word the caller passed**: two factories, `realCapability` and `standInCapability`, and a
capability's label was simply the one you called. Flipping five call sites in `index.ts` from one to
the other emptied the stand-in ledger and turned the closing gate green against a reference adapter
— a one-word edit that reads like a routine promotion.

This item makes provenance a **verdict the harness computes**. One constructor; a witness registered
per name returns stand-in, returns real, **or throws**; an unwitnessed name is refused. The third
outcome is the point: "I found no stand-in seam" is never evidence of real backing.

**Two gates have already run** and both are in the record: `gate1-sol.md` (plan critique, twelve
findings, verdict "replace the plan" — ruled amend, with reasons, in `gate1-rulings.md`) and Gate 2
(`gate2-terra.md`, `gate2-kimi.md`, both distilled), ruled in `gate2-rulings.md`.

---

## Read these, in this order

1. `loop/items/AI4DEV-48/gate2-rulings.md` — this sitting's rulings. **Your primary subject.**
2. `loop/items/AI4DEV-48/plan.md` — sections 4 (steps), 5 (expected state), 6 (blast radius),
   7 (what a green does and does not claim).
3. `loop/items/AI4DEV-48/gate1-rulings.md` — the earlier gate, for what was already settled.
4. The diff: `git diff origin/main...HEAD`.

---

## The boxes

### Box 1 — Does every ADOPTED ruling appear in the tree as ruled?

Six were adopted. For each: is it present, and does it do what the ruling said — not merely
something in the vicinity?

| # | the ruling | where to look |
|---|---|---|
| A1 | the `oracles.judge` witness accepts by **enumeration** on **both** axes (tier and transport), refusing an unrecognised value on either, naming which axis and which value, **before** any existing rule runs | `tests/at/harness/capabilities.ts` |
| A2 | the witness's own tier/transport refusal branches are **pinned** by direct assertions that call `witnessedCapability` with the mismatched pairs, using wording unique to the witness so `oracles.ts`'s copy cannot satisfy them | `conformance.selftest.ts` |
| A3 | the two construction routes are **disjoint**: the adapter route refuses any name the witness table knows, and any name that is not `fixtures.worlds` or `sut.<key>` | `capabilities.ts` |
| A4 | the docblock claiming the module URL "cannot be caller-supplied" now says what is true of the signature | `capabilities.ts` |
| A5 | two overclaiming comments corrected to name the mechanism that actually enforces | `tests/at/suites/req-016/_fixture.ts`, `tests/at/harness/contracts.ts` |
| A6 | the `sut.` prefix comment narrowed, and the divergence failure mode stated | `tests/at/harness/index.ts` |

**A2 is the one to press hardest.** Its entire purpose is that deleting the witness's refusal
branches must now redden something. Trace it by reading: if you deleted the witness's loop+`live`
throw, is there an assertion whose regex would then fail — and is that regex matched **only** by the
witness's message, not also by `oracles.ts`'s? The two texts are claimed to differ as
`refusing to construct capability "oracles.judge"` versus `refusing to build a … oracle`. Check that
claim character by character. If the regexes overlap both copies, A2 does not do its job and the
finding it answers is still open.

### Box 2 — Were any REJECTED claims implemented anyway?

Rejections are where a fix pass most easily drifts past its ruling.

- **`fake` above loop must still yield `real`.** One reviewer asked for it to be refused; that was
  rejected with reasons (it is a deliberate, pre-existing, documented rule). Confirm the accepting
  branch still admits `fake` above loop.
- **`oracles.ts` must be untouched** except that it was already routed through the new constructor in
  the draft pass. Confirm its two refusal texts and its derivation are unchanged in THIS sitting's
  commits.
- **`oracles.selftest.ts`, `registry.ts`, `runner.ts` and `tests/at/expected/req-016.json` must be
  untouched entirely** — `git diff origin/main...HEAD --stat` answers this.
- **Tier-specific fixture-adapter selection must NOT have been built.** Rejected in D5 and filed; a
  founder question is open on it.
- **No line-ending changes anywhere.** `bun run lint` is red repository-wide from a CRLF checkout and
  is explicitly not a gate; a repository-wide reformat would be exactly the scope growth this plan
  exists to avoid.

### Box 3 — Does the diff stay inside its declared scope?

Plan §6 declares what may and may not be touched. Compare it against
`git diff origin/main...HEAD --stat`. Anything outside is a finding regardless of merit.

### Box 4 — Is every stated fact about the code TRUE?

These are load-bearing factual claims in `gate2-rulings.md`. Each is checkable by reading. **A false
one is not mergeable** — either the code changes or the record does.

1. *"At the merge base `fc8d50dd`, `createOracleCapability` refused `replay-fs` above loop and
   labelled everything else real, including `fake`."* Check:
   `git show fc8d50dd:tests/at/harness/oracles.ts`. **This single fact is what demoted a BLOCKER to
   a MAJOR.** If it is false, the whole severity ruling collapses and you should say so loudly.
2. *"`oracles.judge` is the only witness in the table with a reachable `real` outcome."* The three
   `theArticleItself` rows are declarations; the two seam witnesses return stand-in or throw.
3. *"Every outcome of `adapterDerivedCapability` is `stand-in`, so it cannot produce a false green;
   the worst it produces is a false red."* This is why a MAJOR was rejected.
4. *"`Tier = 'loop' | 'integration' | 'drill'` (`registry.ts:104`) and
   `TransportKind = 'replay-fs' | 'live' | 'fake'` (`oracles.ts:179`), and the enumeration in
   `capabilities.ts` matches both."* A divergence here is a real defect.
5. *"`bun run at:check` requires a requirement argument; CI passes `\"$req\"` at `ci.yml:153`."*
6. **The expected-state file did not move.** `git rev-parse origin/main:tests/at/expected/req-016.json`
   against `git rev-parse HEAD:tests/at/expected/req-016.json` — must be equal. Same for each
   `tests/at/suites/req-016/*.test.ts`. (A git query, not a suite run.)

### Box 5 — Do the corrected comments now tell the truth, and does any comment still overclaim?

Three of this sitting's six fixes are comment corrections, and the item's own subject is records
that claim more enforcement than exists. So the corrections themselves deserve the same suspicion:

- Does each replacement name the mechanism that **actually** enforces, or has one overclaim been
  swapped for a subtler one?
- Plan §7 states the honest ceiling — *"the current assemblies are pinned by construction and by
  conformance assertions; deliberate or future producer/witness drift remains possible."* Does any
  comment in the changed files claim more than §7 does?
- The `capabilities.ts` docblock for the `sut.` admission check and the `index.ts:117` comment must
  **agree with each other**. Read both and say whether they do.

### Box 6 — The negative-control claims

The executor reported eight controls, each reverted, observed and restored (the observations are in
this sitting's report and summarised in `PHASE-STATE.md`). **You cannot re-run them and must not
try.** What you CAN do by reading: for each control, confirm the assertion it names exists in the
tree, and that the guard named as its subject is the thing that assertion actually depends on. A
control claiming to pin guard X while its assertion depends on guard Y is a false claim about the
code, and is in scope for you.

Also confirm by reading `git status`/`git diff` that **no control left residue** — a reverted guard
accidentally left disabled in the tree would be the worst possible outcome of this pass.

---

## The judgment most worth disagreeing with

The two Gate 2 reviewers **disagreed with each other** about the same lines: terra rated the
`oracles.judge` accepting branch a **BLOCKER**, kimi rated it a **MINOR** and closed with "no
BLOCKER, no MAJOR". I ruled it **MAJOR and both partly wrong** — terra's structural claim true and
its semantic claim false, kimi's reachability analysis right and its conclusion wrong. The full
reasoning is the first section of `gate2-rulings.md`.

**If you think that resolution is wrong, say so plainly.** It is the most consequential judgment in
the sitting, it was made by one orchestrator against two disagreeing reviewers, and nothing else in
the process re-examines it. A written disagreement from you goes into the merge ruling verbatim
whether or not I adopt it.

---

## One thing to know about this item's provenance

**Every ruling in this item is an OPUS ruling.** Fable is out of credit, so every orchestrator
sitting ran as `orchestrator-opus` (opus at effort max), which is a different agent type, not a model
override. A fable ruling and an opus ruling are not the same evidence. Weigh accordingly.

---

## What a finding from you means

- **The record is false** — an adopted ruling not implemented, a diff outside its declared scope, a
  stated fact untrue. **Never mergeable.** Either the code changes to match the record or the record
  changes to match the code.
- **Real but out of scope** — filed, named in the ruling, and the claim narrowed.
- **You are wrong** — rejected with a written reason, and your claim goes into the pull request
  verbatim anyway.
