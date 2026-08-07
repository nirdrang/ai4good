# AI4DEV-48 (a green can be faked) — phase state

**Phase just completed:** DRAFT (sitting 2) — Gate 1 ruled, plan amended, draft code written
**Phase next:** GATE 2 — critique of the draft code
**Branch:** `nirdrang/ai4dev-48-a-green-can-be-faked-capability-provenance-is-a-caller`
**Chain, derived:** AI4DEV-48 (a green can be faked) → parent AI4DEV-3 (AT harness), a bring-up
root under the W0 Bring-up project, carrying `attr:bringup`. No requirement above it, so no
evidence gate — this closes on a merged pull request like any other foundation item.

---

## THE OPUS FALLBACK IS IN FORCE FOR THIS ITEM, NOT JUST THIS SITTING

Fable is out of credit. Every orchestrator sitting on AI4DEV-48 runs as `orchestrator-opus`
(opus at effort max), which is a different agent TYPE, never a model override on the fable
definition. A fable ruling and an opus ruling are not the same evidence: read every ruling in this
item — the plan's decisions and all twelve Gate 1 dispositions — as an opus ruling. Any successor
sitting that finds itself running as fable should say so in its first line rather than assume
continuity.

---

## THE PLAN CHANGED SHAPE. Read this before reading the plan.

Gate 1 returned twelve findings and an explicit verdict of **"replace the plan"**. I ruled it
**amend, not replace** — but the amendment is material, and a successor sitting that skims the plan
as "the same plan plus fixes" will misread it.

**The reviewer was right about the central defect, and it was mine.** The first draft said provenance
was *"the absence of a reason"*, which made `real` the outcome of a witness that found nothing to
say — the same hole one door to the left. **A witness now returns stand-in, real, or THROWS.**
Unclassifiable refuses. That is the single most important change and the thing Gate 2 should attack
first.

What else moved:
- **D4 restructured.** `fixtures.worlds` and every `sut.<key>` left the witness table entirely and
  are built on an adapter-derived route with the loaded module URL as the reason. The `sut.*` prefix
  is gone, so the table is six exact names and genuinely closed.
- **The URL does not branch, deliberately.** `adapterUrl()` has one possible output today, so a
  route that branched on it would be a constant dressed as a check. It is the reason's content.
- **A founder citation was corrected** — see the question below.
- **S1, S4 and S6 rewritten**: each was unexecutable or guaranteed to pass.
- **One refactor dropped** — converting `Capability` to a type alias, which rested on a false claim
  of mine.

Every change traces to a written ruling in `gate1-rulings.md`, which quotes the reviewer's claim
beside each one so it can be disputed.

**What was REJECTED:** the reviewer's proposed replacement mechanism, tier-specific fixture-adapter
selection. Reasons are in D5 and in the rulings file; it is **filed, not dismissed**. Gate 2 is told
not to re-litigate it.

---

## What is on the branch

**Head: `f6bc152`** plus this sitting's record commits. The draft is complete in the contract's
sense: every plan step implemented, `bun run typecheck` clean on both projects, **the verify suite
deliberately not run.**

Executor: one iteration, no retries; typecheck was clean on the first run. Three commits —
`ac88723` (S2+S3), `2ba4113` (S5), `f6bc152` (S1+S4 assertions).

Files changed, all inside the declared blast radius: `capabilities.ts`, `index.ts`, `oracles.ts`,
`conformance.selftest.ts`, `contracts.ts`, `_fixture.ts`, plus `loop/items/AI4DEV-48/`. Nothing
outside it; `oracles.selftest.ts`, `registry.ts`, `runner.ts` and `tests/at/expected/req-016.json`
are untouched, as required.

---

## What completes GATE 2

Two reviewers in parallel on the same pinned commit, into **separate files**, neither seeing the
other's output: **terra at effort max** and **kimi-code/k3 at effort high** (from its config file;
its CLI has no effort flag), both `--sandbox read-only`. The prompt is
`loop/items/AI4DEV-48/gate2-prompt.txt` — the base contract in `.claude/skills/work/reviewers.md`
plus eleven additive attack directions.

**Gate 2 is complete when** both raw outputs exist in the item's artifacts directory and both are
distilled. A progress-line-only or empty output is not a clean gate and must be re-run.

**The three answers that matter most:**
1. **Attack direction 1 — can anything still reach `real` without positive grounds?** This is the
   entire Gate 1 correction. If a path exists, the item has not done its job.
2. **Attack direction 5 — is the object the witness judged the object the suite receives, for every
   capability?** Section 7's whole "the lie reddens tests" claim rests on it. One member still
   assigned from a separately-held variable breaks it.
3. **Attack direction 6 — would the new assertions actually fail?** Gate 1 already caught one
   criterion of mine that was empty by construction. Assume there is another.

---

## What the FIX AND GOAL sitting must do first

1. **Run the suite. It has never been run against this change.** `bun run at:selftest` is the first
   thing, before anything else — decision D4's claim that the runner's generated black-box adapters
   need no special case is confirmed only by reading, and only the run settles it.
2. **The four negative controls in section 5, actually run**: revert each new guard one at a time and
   observe the matching assertion go red. Report the four observations individually. A guard that
   passes when disabled is not a guard.
3. **S6's blob-hash comparison, not `git diff --stat`.** Gate 1 finding 6 was that `git diff --stat`
   on the clean tree S6 itself requires is empty whether or not the file changed and was committed.
   The executor already checked the expected-state file this way and both hashes were
   `58408b86a6e8a772d8a3315e42b8a320369e1540`; re-check at the final head.
4. **Commit Gate 2's raw critiques and distillates into the record before closing.** Gate 1's are
   already in (`gate1-sol.md`, `gate1-sol-distilled.md`) — moved in this sitting rather than the
   next, because the gate is closed and evidence left only in the artifacts directory dies with the
   sweep.
5. **Write the audit brief.**

**DO NOT CHASE `bun run lint`.** It is red repository-wide and it is not this item's defect:
`core.autocrlf=true` checks every `.ts` file out as CRLF, `.prettierrc` sets no `endOfLine` so
prettier defaults to `lf`, and **CI runs no lint step at all** — the required check is `typecheck`,
`at:selftest`, `at:check`, `at:verify … --tier loop --expect`, plus the two-territory and item-id
guards. I verified all three of those myself. Section 5's row was my error and is corrected there.
**The fix pass must not "fix" line endings anywhere** — that would be a repository-wide diff far
outside this item.

---

## Question for the founder — ONE, and it is a real one

**Sitting 1 promised to raise this if Gate 1 found what it found, so it is raised.**

The plan justified not building a separate integration-adapter path by citing your ruling of
2026-08-04 about vendor stand-ins (`loop/bringup/AI4DEV-3-at-harness.md`, lines 52-64). **Gate 1
found that citation does not bear on the question, and it is right.** That ruling amends the item
about provider and vendor simulation, and governs when the five named vendor stand-ins get built. It
says nothing about how the harness picks a fixture adapter. I have corrected the plan to say that
the principle inside it — *"a sim contract authored without its consuming test is a guess that gets
rewritten when the real suite arrives"* — is being **extended by analogy on my own authority, not
yours.**

So the decision now rests on my judgment alone, where the plan previously implied it rested on
yours. The question:

**Do you want tier-specific fixture-adapter selection built now, or filed?**

In plain terms: today the harness loads the same reference adapter no matter which tier you ask
for, and the only thing stopping a reference adapter from satisfying the closing gate is the
stand-in ledger. The alternative is to make the tier decide which adapter file is loaded — the fast
inner-loop tier keeps the reference adapter, and any deeper tier looks for a real product adapter
that does not exist yet and fails loudly saying so. It builds no product code.

- **I filed it rather than built it** because it covers only two of the eight capabilities this item
  fixes — the other five never involve an adapter — and because it changes building a harness at the
  deeper tier from something that works today into something that throws, which has its own knock-on
  effects on the oracle tests.
- **The argument for doing it now** is that you have called this the last acceptance-test-engine item
  before product work starts, and it would be a second, independent barrier: after this item the
  ledger can only be emptied by editing a named guard, and this would make the reference adapter
  unreachable at the deeper tier even then.

**No answer is needed for this item to proceed** — it is filed and the item is complete without it.
This is asked because the choice is yours and the plan spent a sitting implying it was already made.

---

## To report upward for filing — separate items, absorbed nowhere

1. **Tier-specific fixture-adapter selection** — the Gate 1 reviewer's alternative, rejected as this
   item's work and described in the founder question above. **Recommend filing.** Note for whoever
   picks it up: it changes building a harness at the integration tier from returning a harness to
   throwing, which has a blast radius through the oracle self-tests.
2. **The static provider scan has no board item.** `h.static` is an unconditional
   `pendingCapability` (`tests/at/harness/index.ts:173`), which is why one of the twelve
   notification tests is the single red. It is left-over work from the sentinels item (AI4DEV-19,
   Done), harness-owned, buildable today, independent of the product, and supplying it is what would
   make the count twelve rather than eleven. I searched the board and found no item owning it. The
   machinery that would have made an unowned red impossible — AI4DEV-30 (declared reds name their
   owner) — is itself still in Backlog. **Recommend filing.**
3. **A typed `stubbed-capabilities` failure kind**, so the deeper-tier refusal is structurally
   declarable rather than matched as free-form text. Close enough to AI4DEV-28 (structured
   capability codes), whose own text says it *"Belongs to the slice that owns `capabilities.ts`"*,
   that it should be **added to that existing item rather than filed fresh**.

Also flagged, not for filing: AI4DEV-28 wants a machine-readable code emitted from
`capabilities.ts` — the exact file this item rewrote. It is deliberately not absorbed. The obligation
carried was negative — the rewrite must not make emitting such a code harder than it is today — and
the new `CapabilityVerdict` type arguably makes it easier, since every verdict now carries its own
words.

---

## For the mechanical touching the pull request

The pull request is **#46**, already open. The body must **name no item id other than this branch's
own**. Any other id links that item and moves it on the board even without a closing verb — a
finished item was dragged back to In Progress twenty-four minutes after its own merge by a body that
carried a bare reference. This item's record cites several sibling ids inside files, which is fine
there and is not fine in the pull request. Refer to them in words. CI enforces this and will fail
the build.

---

## Verify surface for this item

`bun run typecheck` · `bun run at:selftest` · `bun run at:verify req-016 --tier loop --expect` ·
`bun run at:check`. **Not `bun run lint`** — see above.

Baseline, measured at the pre-fix head `219cae23` and recorded in `baseline-before-fix.md`, not read
off a declaration file: `12 P0: 11 green, 1 red, 0 missing`; self-tests `243 passed (243)`. The same
numbers are what "unchanged" means at the end. `tests/at/expected/req-016.json` must come out
byte-identical, confirmed by comparing blob hashes against the merge base.
