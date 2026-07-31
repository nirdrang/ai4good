# MERGE RULING — AI4DEV-25

**Verdict: READY TO MERGE. Not authorised to self-merge — INTERIM MODE.**
This item is one of the three that switch autonomous merge on, so it cannot authorise
itself. The tail stops here with a founder ping.

Ruled at head SHA **`91fba07`** plus the paper-trail commit below. Evidence: the pre-merge
audit (`AI4DEV-25 · audit`, fresh context, independent re-run of all seven verification
commands), the executor's own ten-step verification, and the two Gate 2 critiques.

## The checklist, box by box

| # | Box | Verdict |
|---|---|---|
| 1 | Gate 1 ran; every finding disposed; amended plan approved before implementation | **PASS** — 7 findings, all disposed; checkpoint approved in rulings-03 |
| 2 | Gate 2 closed; every finding terminal; no unresolved false-green-class tag | **PASS** — 6 findings; 5 fixed, 1 closed by the founder (R15); first cycle, cap never reached |
| 3 | Verification matches the declared expected state per id, at the named tier | **PASS** — `--expect` exit 0; no-flag path exit 1 with 8 green / 4 red |
| 4 | An agent other than the executor reproduced the results | **PASS** — the sonnet auditor reproduced all seven commands in a fresh context |
| 5 | One head SHA through reviews, confirmations, verify runs, audit and ruling | **PASS** — see the base-drift ruling below |
| 6 | Finding manifest ↔ disposition log in one-to-one coverage, auditor-checked | **PASS** — auditor found no orphaned finding in either critique |
| 7 | The diff is confined to the item's allowed paths | **PASS** — after the base-drift resolution below; `capabilities.ts` confirmed untouched, so D7 held |
| 8 | Every deferral has a filed board item, named in the PR body | **PASS** — three deferrals, named below; AI4DEV-25/26/24 filed |
| 9 | Required proofs attached | **PASS** — two mutation tests against the real requirement, plus case 920 and case 8 |
| 10 | No pending founder escalation | **PASS** — G2-3 was the only one and the founder ruled it |

## Two things the audit surfaced, ruled explicitly

**The untracked ruling file — FIXED, not waived.** `rulings-04.md` (the founder's closure of
G2-3) existed on disk but not in git. This is the second time in this project that a paper
trail was written and left untracked, and the loop's own rule is that the paper trail IS the
protocol. It is committed before this ruling stands. Recorded as a process defect to fold
into the skill: the audit should check paper-trail tracking, and it now effectively does.

**Base drift — no re-review required, and here is why.** `origin/main` is 1 commit ahead of
the merge base (`6a5212e`, an unrelated AI4DEV-9 design-track commit). My SHA-discipline rule
says drift since Gate 2 forces an update plus scoped re-review. I rule that it does not apply
here, on evidence rather than convenience: the drift commit touches exactly three files, all
under `design/`, and touches nothing under `tests/at/**`. There is no shared file, no shared
import, and no way for it to interact with anything this item changed. The three `design/`
files that appeared in the raw scope diff are that drift, not branch content — the auditor
verified the line counts match the drift commit exactly, and that no commit unique to this
branch touches `design/` at all.

The rule exists to catch semantic conflict, not to perform ceremony where none is possible.
Had the drift touched `tests/at/**`, the answer would have been the opposite.

## Deferrals — filed, and named in the PR body

1. **Reporter-side envelope** for failures that never reach the JSON report (R8's residual).
2. **Structured capability codes** at the source, which subsume the provenance finding the
   founder deferred (R15) — for the slice that owns `capabilities.ts`.
3. **A required board reference on every declared red** (R10's governance point).

## What remains true and unverified

`tests/at` is still invisible to the project type-check (AI4DEV-24), so "tsc clean" continues
to mean `src/` only. This item does not make that worse — the config-free check reproduced
exactly three pre-existing errors, none in a file it touches — but it does not fix it either.
