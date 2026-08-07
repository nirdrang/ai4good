# AI4DEV-48 (a green can be faked) — phase state

**Phase just completed:** FIX AND GOAL (sitting 3) — Gate 2 ruled, fixes applied, suite run, eight
negative controls observed
**Phase next:** AUDIT — and it is NOT skippable; see "What completes the next phase" below
**Branch:** `nirdrang/ai4dev-48-a-green-can-be-faked-capability-provenance-is-a-caller`
**Chain, derived:** AI4DEV-48 (a green can be faked) → parent AI4DEV-3 (AT harness), a bring-up
root under the W0 Bring-up project, carrying `attr:bringup`. No requirement above it, so no
evidence gate — this closes on a merged pull request like any other foundation item.

---

## THE OPUS FALLBACK IS IN FORCE FOR THIS ITEM, NOT JUST THIS SITTING

Fable is out of credit. Every orchestrator sitting on AI4DEV-48 runs as `orchestrator-opus`
(opus at effort max), which is a different agent TYPE, never a model override on the fable
definition. A fable ruling and an opus ruling are not the same evidence: read every ruling in this
item — the plan's decisions, the twelve Gate 1 dispositions and the seven Gate 2 dispositions — as an
opus ruling. Any successor sitting that finds itself running as fable should say so in its first line
rather than assume continuity.

---

## What happened this sitting

Gate 2 returned **seven findings from two reviewers covering five distinct defects**. All seven are
ruled in writing in `gate2-rulings.md`, each with the reviewer's claim quoted beside it. **Five
adopted, one rejected-as-framed with a different real defect adopted underneath it, plus one further
fix I ruled on my executor's own finding.**

### The two reviewers disagreed with each other, and that is settled in writing

Terra rated the `oracles.judge` accepting branch a **BLOCKER**. Kimi read the same lines and rated it
**MINOR**, closing "no BLOCKER, no MAJOR". **I ruled MAJOR, and both of them partly wrong.** The full
reasoning is the first section of `gate2-rulings.md`; the short form:

- **Terra's structural claim is TRUE.** Above the loop tier the witness returned `real` after
  refusing one transport brand — "I found no forbidden thing, therefore the thing is present", the
  exact sentence `capabilities.ts:18` forbids. Terra also correctly named the **tier** axis, which
  kimi missed.
- **Terra's semantic claim is FALSE.** It read a `fake`-kind transport reaching `real` as a
  contradiction this change introduced. **At the merge base `fc8d50dd` the function already did
  exactly that** — I checked, and that single fact is what demoted the severity. The rule is
  deliberate and argued at length in `oracles.ts:174-177`, and the test terra cited as evidence of a
  bug is the *encoding* of the rule. Following terra's `verify` instruction would have reddened five
  assertions in `oracles.selftest.ts`, a file on the may-not-touch list.
- **Kimi's reachability analysis is right and its conclusion is wrong.** Through every production
  path the two formulations produce identical ledgers. But the evidence fields are plain `string`, so
  a direct call with an unrecognised brand returned `real` **needing no source edit at all** — which
  is why kimi's filing of it under the "harness is source code" ceiling does not hold. And
  `oracles.judge` is the **only** witness with a reachable `real` outcome, so that branch was the
  entire surface on which this mechanism can produce one.

### The six fixes, all inside the declared blast radius

1. **Enumeration on both axes** — legal tiers and legal transports enumerated at runtime; an
   unrecognised value on either axis refuses, naming the axis and the value, before any existing rule
   runs. No existing rule changed. `fake` above loop still yields `real`, as ruled.
2. **The witness's refusal branches pinned, not deleted** — three new `it` blocks calling
   `witnessedCapability` directly with the mismatched pairs. The regexes match wording unique to the
   witness (`refusing to construct capability` versus `oracles.ts`'s `refusing to build a … oracle`),
   verified in the actual strings before being relied on. No production string needed to change.
3. **The two construction routes made disjoint** — the adapter route now refuses any name the witness
   table knows, and any name that is not `fixtures.worlds` or `sut.<key>`.
4. **The "cannot be caller-supplied" docblock corrected** — it was true of the route and false of the
   signature; both reviewers found this independently.
5. **Two overclaiming comments corrected** to name the mechanism that actually enforces.
6. **`index.ts:117`'s `sut.` prefix comment narrowed** — my executor's own finding, raised rather than
   decided, and I ruled it adopted for consistency with the three comment findings already adopted.

**Rejected, with reasons in the rulings file:** refusing `fake` above loop; the adapter route's
unconstrained name/URL as a MAJOR (every outcome of that route is stand-in, so it makes the closing
gate stricter, never laxer — the worst it produces is a false red); the path-traversal and symlink
sub-claims; and deleting the witness's duplicated branches instead of pinning them.

---

## Verification — run, not reasoned about

| check | result |
|---|---|
| `bun run at:selftest` | **9 files, 251 tests passed** — green first run, no iteration (baseline was 243) |
| `bun run at:verify req-016 --tier loop --expect` | **`12 P0: 11 green, 1 red, 0 missing`** — matches the plan exactly; the one red is AT-016.01, `CAPABILITY PENDING — H3 static provider scan` |
| `bun run at:check req-016` | `12 P0 in the acceptance file, 12 registered in the suite` |
| `bun run typecheck` | clean, both projects |
| S6 blob hashes | **identical** — `tests/at/expected/req-016.json` is `58408b86a6e8a772d8a3315e42b8a320369e1540` on both sides, and all four `*.test.ts` bodies match |

**S6 used blob-hash comparison against the merge base, not `git diff --stat`** — Gate 1's sharpest
finding was that `git diff --stat` on the clean tree S6 itself requires is empty whether or not the
file changed and was committed.

`bun run lint` was not run and no line endings were touched. That is settled in plan §5.

### The eight negative controls, as OBSERVED

The plan required four; the adopted fixes added four more guards, so the same rule applied to them.

| # | guard reverted | observed |
|---|---|---|
| 1 | clock stand-in reason made generic | **2 red** — the reason's specificity is asserted in two places, not one |
| 2 | clock witness's refusal replaced with a real verdict (the first draft's exact defect) | **2 red** — the malformed-value test, plus the new cross-route test failing on its own precondition assertion, which was written in deliberately so it cannot go vacuous |
| 3 | unwitnessed-name throw replaced with a stand-in verdict | **1 red** |
| 4 | `theArticleItself` evidence emptied | **1 red** |
| 5 | brand enumeration removed | **run twice** — vitest stops at the first failing assertion in a block, so one mutation could only show one axis. Both axes disabled → the tier assertion red; transport half only → the transport assertion red. Both observed independently |
| 6 | witness's loop + `live` throw deleted | **exactly 1 red**, the new pin; `oracles.selftest.ts` stayed entirely green |
| 7 | witness's above-loop + `replay-fs` throw deleted | **exactly 1 red**, the same new pin on the integration case; `oracles.selftest.ts` again fully green |
| 8 | adapter route's name constraint removed | **1 red** |

**Controls 6 and 7 are the empirical confirmation of both reviewers' claim**: before this pass,
deleting either witness copy left *every test in the tree green*. Each deletion is now caught, and
caught only by the new pin. Every control was restored and the suite confirmed back at 251 green
before the next began; `git status --porcelain` is empty, so no control left residue.

---

## A correction to my own record, found by my executor

**`bun run at:check` takes a requirement argument, and plan §5, this file's verify surface and my own
executor brief all wrote it bare** — a command that cannot pass. The executor raised it rather than
quietly adding the argument. I ran both forms myself rather than take either the row or the report on
trust: bare exits **2** with `"undefined" is not a requirement`; `bun run at:check req-016` exits
**0**. **CI was always right** — `.github/workflows/ci.yml:153` runs `bun run at:check "$req"`.

**This is the third criterion of mine in this item that was unexecutable or vacuous as written**,
after the `git diff --stat` guard Gate 1 caught and the `bun run lint` row corrected in the draft
pass. One cause every time: a command written into a goal spec without being run once. The baseline
at `219cae23` measured typecheck, selftest and verify — and all three defects landed in exactly what
it did not measure. Recorded in plan §5 as a second correction, in the same terms.

---

## What completes the next phase — THE AUDIT, and it does not get skipped

**Gate 2 found real findings, including one rated BLOCKER by a reviewer and MAJOR by me, and code
changed as a result. So this is NOT the clean-audit-skip case**, and the audit gets its own sitting
under the conditional-audit rule.

The brief is `loop/items/AI4DEV-48/audit-brief.md`. It is written for a **read-only** audit with
**whole-tree access and change-only scope**, and it explicitly instructs the auditor **not to run the
suite** — execution evidence is CI's, and this project's record shows audit execution attempts
producing "could not verify" while every reading-and-tracing box came back answered.

**The audit is complete when** its raw output exists in the item's artifacts directory and is
distilled. A progress-line-only or empty output is not a clean gate and must be re-run.

**The three boxes that matter most:**
1. **Box 4, fact 1 — is the merge-base claim true?** `git show fc8d50dd:tests/at/harness/oracles.ts`.
   That single fact is what demoted a BLOCKER to a MAJOR. If it is false, the whole severity ruling
   collapses.
2. **Box 1, fix A2 — do the new pins actually pin?** Their entire purpose is that deleting the
   witness's refusal branches must now redden something, and the regexes must be matched *only* by
   the witness's message, not also by `oracles.ts`'s.
3. **The disagreement itself.** The auditor is invited in writing to disagree with my resolution of
   terra-versus-kimi. It is the most consequential judgment in the sitting, made by one orchestrator
   against two disagreeing reviewers, and nothing else in the process re-examines it.

**The audit re-runs at most once per item, and only if code changes.** If the auditor's findings
change code, that sitting ends at the new head with the audit owed again — the orchestrator never
spans that wait.

---

## Question for the founder — still ONE, still open, still not blocking

Unchanged from the last sitting and **not re-litigated this sitting**. Raised because sitting 1
promised to raise it if Gate 1 found what it found.

The plan justified not building a separate integration-adapter path by citing your ruling of
2026-08-04 about vendor stand-ins. **Gate 1 found that citation does not bear on the question, and it
is right** — that ruling governs when the five named vendor stand-ins get built and says nothing
about how the harness picks a fixture adapter. The plan is corrected to say the principle inside it
is being **extended by analogy on my own authority, not yours.**

**Do you want tier-specific fixture-adapter selection built now, or filed?**

In plain terms: today the harness loads the same reference adapter no matter which tier you ask for,
and the only thing stopping a reference adapter from satisfying the closing gate is the stand-in
ledger. The alternative makes the tier decide which adapter file is loaded — the fast inner-loop tier
keeps the reference adapter, and any deeper tier looks for a real product adapter that does not exist
yet and fails loudly saying so. It builds no product code.

- **I filed it rather than built it** because it covers only two of the eight capabilities this item
  fixes, and because it changes building a harness at the deeper tier from something that works today
  into something that throws, with knock-on effects on the oracle tests.
- **The argument for doing it now** is that you have called this the last acceptance-test-engine item
  before product work starts, and it would be a second, independent barrier.

**No answer is needed for this item to proceed.** It is filed and the item is complete without it.

---

## To report upward for filing — separate items, absorbed nowhere

Unchanged from the last sitting, and nothing was added this sitting:

1. **Tier-specific fixture-adapter selection** — the Gate 1 reviewer's alternative, rejected as this
   item's work and described in the founder question above. **Recommend filing.** Note for whoever
   picks it up: it changes building a harness at the integration tier from returning a harness to
   throwing, which has a blast radius through the oracle self-tests.
2. **The static provider scan has no board item.** `h.static` is an unconditional `pendingCapability`
   (`tests/at/harness/index.ts`), which is why one of the twelve notification tests is the single red.
   It is left-over work from the sentinels item (Done), harness-owned, buildable today, independent of
   the product, and supplying it is what would make the count twelve rather than eleven. The board has
   no item owning it, and the machinery that would have made an unowned red impossible is itself still
   in Backlog. **Recommend filing.**
3. **A typed `stubbed-capabilities` failure kind**, so the deeper-tier refusal is structurally
   declarable rather than matched as free-form text. Close enough to the already-filed structured
   capability codes item — whose own text says it *"Belongs to the slice that owns
   `capabilities.ts`"* — that it should be **added to that existing item rather than filed fresh**.

Also flagged, not for filing: that same structured-codes item wants a machine-readable code emitted
from `capabilities.ts`, the exact file this item rewrote. It is deliberately not absorbed. The
obligation carried was negative — the rewrite must not make emitting such a code harder than it is
today — and the new `CapabilityVerdict` type arguably makes it easier, since every verdict now carries
its own words.

---

## A process note for whoever folds it

The Gate 2 distiller wrote **terra's distillate to a nested `.claude/worktrees/artifacts-AI4DEV-48/`
inside the item worktree** rather than the sibling artifacts directory where kimi's landed and where
the conductor pointed. The file was correct and complete; it was simply in a second location, found
only by searching. Both raw critiques and both distillates are now committed into
`loop/items/AI4DEV-48/`, so the record is safe either way — but a distiller writing relative to its
cwd will keep producing this, and evidence left only in an artifacts directory dies with the sweep.

---

## For the mechanical touching the pull request

The pull request is **#46**, already open. The body must **name no item id other than this branch's
own**. Any other id links that item and moves it on the board even without a closing verb — a finished
item was dragged back to In Progress twenty-four minutes after its own merge by a body that carried a
bare reference. This item's record cites several sibling ids inside files, which is fine there and is
not fine in the pull request. Refer to them in words. CI enforces this and will fail the build.

---

## Verify surface for this item

`bun run typecheck` · `bun run at:selftest` · `bun run at:verify req-016 --tier loop --expect` ·
**`bun run at:check req-016`** (the requirement argument is required — corrected this sitting).
**Not `bun run lint`** — red repository-wide from a CRLF checkout, and CI runs no lint step.

Baseline, measured at the pre-fix head `219cae23` and recorded in `baseline-before-fix.md`:
`12 P0: 11 green, 1 red, 0 missing`; self-tests `243 passed (243)`. **After this sitting: the same
verify numbers, and self-tests at `251 passed`** — the eight added tests are the new guards and their
pins. `tests/at/expected/req-016.json` came out byte-identical, confirmed by blob hash against the
merge base.
