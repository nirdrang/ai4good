# MERGE RULING — AI4DEV-24

**Verdict: MERGE.** Ruled at head `df96254`, on the pre-merge audit (`AI4DEV-24 · audit`, fresh
context, all seven verification commands reproduced independently) plus the executor's own runs
and four reviewer rounds.

Founder authorization: "Finish 24" (2026-07-31), which is the sanctioned path interim mode names.

## The checklist

| # | Box | Verdict |
|---|---|---|
| 1 | Gate 1 ran; every finding disposed; amended plan approved before implementation | **PASS** — 7 findings, all disposed; checkpoint in rulings-01 |
| 2 | Gate 2 closed; every finding terminal; no unresolved false-green-class tag | **PASS** — codex 6 + Kimi 4, five fix cycles, terminal ruling on the last |
| 3 | Verification matches the declared state at the named tier | **PASS** — 114 selftests, 12 ids in bijection, `--expect` exit 0 |
| 4 | An agent other than the executor reproduced the results | **PASS** — the auditor reproduced all seven in a fresh context |
| 5 | One head SHA through reviews, confirmations, verify, audit and ruling | **PASS** — `df96254`; `origin/main` is an ancestor, no drift |
| 6 | Finding manifest ↔ disposition log, one-to-one, auditor-checked | **PASS** — no orphaned finding in any of the seven reviewer artifacts |
| 7 | Diff confined to allowed paths | **PASS** — 28 files, all allowed; no `src/`, `design/`, `supabase/`, no root `tsconfig.json`, no `*.test.ts` |
| 8 | Every deferral filed and named | **PASS** — AI4DEV-31 (the seam), updated with the proven exploit |
| 9 | Required proofs attached | **PASS** — 16 types each under a named test; reverting one fails exactly that name |
| 10 | No pending founder escalation | **PASS** |

## The two audit deviations, ruled

**C3 — one commit lacks the trailers.** `62c42c1` is the auto-generated `git merge` commit from
the base-drift fix. It carries no authored content, and the trailer rule exists to attribute
authorship. **Accepted.** The rule's wording is at fault, not the commit — it should say
*authored* commits. Folded into the way-of-work follow-up rather than fixed by rewriting history
over a machine-generated message.

**C5/C4 — stale numbers in earlier plan sections.** §11 and §12 record 423 whitespace violations
and three confirmation files; the true figures at HEAD are **852** and **four**, because the later
reviewer records are themselves part of the diff they are counted in. Those sections are
historical — true when written, superseded since, and §12 is already marked so. **Accepted as
historical record**, on one condition: the authoritative final numbers are the ones stated here
and in the PR body, not the ones in the historical sections. Rewriting a record to match a later
state would be the same defect as doctoring the evidence, which R9 already refused.

## What this item actually establishes

Before it, `tsconfig.json` included only `src/**`. The command every verification report in this
project quotes as evidence — `bunx tsc --noEmit` — **read none of the harness**. Coverage was
zero files. It is now 30, with zero leaking from `node_modules`, and both the compiler's own file
list and an independent filesystem scan agree.

Fixing the 24 errors that surfaced exposed something larger: the type system let a suite invent
members that no runtime value supplies. Five fix cycles closed that on 16 shared types, each
proven by its own named test.

## What it deliberately does NOT establish

Declaration merging is closed. **A suite declaring its own world or SUT type is not verified** —
the seam returns it through an unchecked cast, and a suite can read an invented member green with
no merging involved. Different mechanism, proven exploitable by codex, tracked as **AI4DEV-31**,
scoped out three times with reasoning each time.

That distinction is the item's most important output. Three separate claims were refuted during
this item, and **not one of them was refuted on the code — every refutation was of a sentence
describing the code.** The rule the executor drew from it, which belongs in the skill: *a claim
should name the mechanism it closed and the test that proves it, not the class of defect it
belongs to.*

## Remaining true and unverified

The REQ-016 acceptance state did not move once across five fix cycles — 8 green / 4 red, same
SHA256. Those four reds still await H3 and H5. The loop tier still grades a conforming stand-in,
so a green there means the machinery runs, not that the product behaves; the integration tier is
where that changes.
