# ORCHESTRATOR RULINGS 01 — on the executor's plan-stage escalations

These amend the brief. They are decisions, not suggestions; fold them into `plan.md`
and treat them as part of the implementation contract.

---

## R1 — BLOCKING QUESTION, Q1: the process exit code under `--expect`. **UPHELD, and extended.**

The escalation is correct and is the most valuable thing to come out of the plan stage.
With declared reds present, vitest necessarily exits non-zero, so under `--expect` the
process exit degrades from signal to noise — and an infrastructure failure (a global
teardown that threw, an unhandled rejection, a worker that died) hides behind an
expected test failure. Shipping D4 as literally written would reintroduce inside the new
gate the exact false green that `runVerdict`'s own comment says the harness exists to
prevent.

**Adopt the three process-level deviations you proposed:**
1. a launch failure always fails, regardless of declaration;
2. an EMPTY declared-red set plus a non-zero exit fails (today's rule, unchanged);
3. a NON-EMPTY declared-red set plus a ZERO exit fails — vitest should have reported
   those failures, so a clean exit means the run did not do what the declaration says.

**And implement the fuller fix as well — this is now D4a, part of the contract.**
Your reservation was that it reads state D4 does not mention. D4 is mine, and I am
amending it: a gate that cannot tell "the failures I declared" from "those failures plus
something else" is not a gate. Concretely, `--expect` additionally requires:

- **the count of non-passing results in the vitest report equals the number of declared
  reds.** The id-set comparison alone does not catch a failing test the id parser skipped
  (an untagged `it()`, a failing hook attributed to no id) — the count does.
- **any failure signal the report carries outside the assertion results fails the run** —
  unhandled errors, suite-level failures, or whatever top-level error/unhandled fields
  the reporter exposes. Read the shape from the actual JSON the current reporter emits;
  do not invent fields. If a signal you expect turns out not to be present in the report,
  say so in the plan rather than silently dropping the check.

The principle to apply if a detail is ambiguous: **every non-zero exit must be fully
accounted for by the declaration; anything unaccounted for is a failure.**

## R2 — Q2, `tsconfig` does not cover `tests/at`. **Split verdict.**

You are right that the brief's `tsc` step is vacuous for your new code, and D7 correctly
forbids fixing the root cause here (that is AI4DEV-24).

- KEEP the `bunx tsc --noEmit` step: it still proves you regressed nothing in the covered
  tree.
- ADD a config-free typecheck over the files this item creates or modifies, and report
  its raw output as evidence.
- **Pre-existing errors in `tests/at/**` do NOT block** — they are AI4DEV-24's inheritance
  and out of scope by D7. **A NEW error introduced by this item's own files DOES block.**
  Do not inherit the debt; do not add to it. If separating "pre-existing" from "new" is
  not cleanly possible, report the full output and escalate rather than guessing.

## R3 — Q3, may you edit `runner-blackbox.selftest.ts` to share the tree helper? **NO — duplicate.**

D6's "no existing selftest may change" is behavioural in intent, but extracting a shared
helper out of a passing test is exactly the kind of refactor that changes behaviour by
accident, and CLAUDE.md is explicit: touch only what you must, do not refactor what is
not broken. Forty duplicated lines in a test file is the cheap, safe option. Your plan is
approved as written.

## R4 — Q4, `redact()` could make a reason inside a long token undeclarable. **Document, do not fix.**

No REQ-016 id is affected today, and a speculative fix to redaction is exactly the kind
of unasked-for machinery CLAUDE.md warns against. Note the limitation in W4's README so a
future author who hits it understands the cause immediately. If it ever bites for real,
that is a filed item then.

## R5 — Q5, the integration path ships exercised only by its "tier absent" refusal. **Accepted, named.**

The loop tier is the only tier this item may run, so this is a real and unavoidable
coverage gap rather than an oversight. State it plainly in the README: integration-tier
declarations are exercised when integration-tier declarations exist.

## R6 — Q6, no Linear id. **Confirmed as a named deferral.**

The board item is filed and linked when the Linear connection returns, before the merge
ruling; merge-checklist box 8 (every deferral named in the PR body) covers it. Not a
blocker for implementation.

## R7 — your D9 reconciliation (slash vs comma in AT-016.01's reasons). **Correct; approved.**

D9's instruction to derive the wording from the actual reported detail governs over its
own illustrative parenthetical. Using the comma form the runner really prints — and
keeping every declared reason ASCII, stopping before the em dash — is exactly right.

---

**Next:** this plan plus these rulings go to Gate 1 (codex `gpt-5.6-terra` @ `xhigh`),
which is instructed to refute them. Its critique returns to you as first reader. You fold
what the brief and these rulings already decide, escalate anything genuinely undecided,
record every finding's disposition in `plan.md` — and implement nothing until the
orchestrator's checkpoint approves the amended plan.
