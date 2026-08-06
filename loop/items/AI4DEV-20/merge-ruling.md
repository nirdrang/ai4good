# Merge ruling — AI4DEV-20 (judging AI output meaning)
## Item agent: fable @ xhigh · 2026-08-06

**RULING: MERGE, conditional on exactly one thing — the required `verify` CI check green on
the exact head commit of the pull request.** Auto-merge is queued behind that check; no agent
merges past red, and `strict`/`enforce_admins` being off is not a licence to.

## What is being merged
The semantic-oracle slice of the acceptance-test harness: the oracle capability on the shared
contract (13 new protected type aliases), the judge machinery (`oracles.ts` — rubric
validation, full-request-hash replay keys, structured-output verdicts locally re-validated,
per-criterion k-vote majority with the vote count owned by the at-config registry,
extraction-then-code comparators), per-tier wiring (replay stand-in at loop, real-and-branded
live transport above loop), three example rubrics (one near-final, two labeled DISPOSABLE),
the parent-side recorder, 76 new offline conformance tests (167 → 243), and the item record.
Plus rides-along: two work-skill fixes from the end-of-item reflection.

## Pinned commits
- Item base: `14fee90` (main at claim time).
- Audited code head: `6494f82` (the fix-round result luna audited; `92d682e`–`682ce9e` add
  only records, rulings, reflection and the skill fixes — no harness code).
- The PR head is the tip carrying this ruling; the CI `verify` run id and that SHA are
  recorded in the pull request once the check completes. THE MERGE CONDITION BINDS TO THAT
  HEAD, not to any earlier commit.

## What each green claims — and does not
- **Typecheck / selftests / req-016 loop verify green** (executor at `6494f82`, files
  `verify-*.txt`): the oracle machinery behaves as specified OFFLINE — replay, aggregation,
  provenance refusals, tier branding, credential hygiene — proven partly by seven
  deliberate mutations across the item, each caught by exactly the test built for it.
- **Luna VERIFIED-WITH-BOUNDARIES** (`premerge-audit.md`): independent typecheck exit 0;
  every fix-round claim located in the tree; runner and req-016 manifest blob-hash-identical
  to base; tree left clean. The vitest commands hit the known platform-worktree sandbox
  denial and are marked COULD-NOT-VERIFY-IN-SANDBOX — **the required CI check on the PR head
  is the execution evidence for the suite**, which is precisely what the merge condition
  demands.
- **What NO green claims:** the live judge path has NEVER executed — no credential exists on
  this machine. The recordings directory ships empty; the F1 stability measurement does not
  exist; the effort pin is provisional; the SDK is unproved under bun at run time. All four
  gaps are stated in committed records (`live-smoke.md` NOT RUN, `recordings/README.md`),
  and the first consuming suite's integration run is the named live proof point. Merging
  this is merging honest machinery plus its stated boundary — not a working live oracle.

## Review trail
Gate 1 (sol @ xhigh): 12 findings → all ruled, plan rev 2 (`gate1-critique.md`,
`gate1-rulings.md`). Gate 2 (terra @ max + Kimi k3 @ high): 13 findings in 8 clusters →
all accepted, fixed, and ruled CLOSED; four residuals recorded with reasons
(`gate2-rulings.md`, `gate2-closure.md`, `fixes-done.txt`). No reviewer claim was dismissed
rather than fixed, so no unearned-green terminal ruling exists on this item. Executor
proposals P1–P9 and Q1–Q4: all ruled, none outstanding.

## Board effects
Merging closes AI4DEV-20 (judging AI output meaning) via the branch–item coupling. Its
parent AI4DEV-3 (AT harness) stays open — sibling leaves remain, so no fold. The proving
ground item AI4DEV-22 (first requirement green end to end) loses one of its named blockers.
