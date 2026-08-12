# PHASE-STATE — AI4DEV-65 (who signed fields)

## Where the item stands

**DONE. Merged. This item is closed and no sitting remains.**

- The MERGE sitting ran on orchestrator-opus at effort max, BY DESIGN (founder 2026-08-11), not
  as a credit-out fallback.
- Merge ruling pinned to head `ef7369e37a56d5658e96574186efe6af1bbb9a65`, published whole as a
  comment on pull request 54 by a mechanical, as handed:
  `https://github.com/nirdrang/ai4good/pull/54#issuecomment-5263166469` (17564 characters).
- Required check green on that exact SHA: CI run `31569768493`, job `verify`, conclusion
  `success`, 16 steps, 48s. GitHub Actions reported `operational` with no open incidents.
- Merged by squash at 2026-08-12T06:29:19Z. Merge commit on main:
  `e888d82d3b725cf0ba4833cbad7af17f6cb0fddc`. Main moved `72aa3e4..e888d82`.
- Board item moved to Done at 06:29:21 by the merge integration, not by hand. State history is
  Backlog → In Progress → Done.

## Post-merge verification, done first-hand by the merge sitting

- All thirteen declared paths exist at `origin/main`.
- `git diff --name-only ef7369e origin/main` restricted to the code territory returns NOTHING —
  the merged content is byte-identical to the pinned head. The green describes what landed.
- The mechanical found the tail untouched at step 1 (zero comments, not merged), so no other
  actor crossed the merge-tail boundary. It reported no permission refusal.

## The record

| file | what it holds |
|---|---|
| `plan.md` | decisions A–H, twelve steps, the verification table, what the green claims |
| `gate1-rulings.md` | sol, 7 findings — 5 accepted, 1 accept-fixed-differently, 1 rejected |
| `gate2-rulings.md` | terra 2 findings, flash clean; the verify-first FEFF outcome addendum |
| `audit-rulings.md` | luna 2 findings accepted (comment-only), flash clean, 2 boxes settled |
| `audit-rerun-rulings.md` | luna clean, flash 1 finding accepted (comment-only), 2 boxes settled |
| `artifacts/` | every reader's raw output, distillate, stderr, tool-call summary, identity extract, and the FEFF probe evidence |

Twelve findings across four reader passes, every one ruled. Four clean seats recorded as
evidence. The merge ruling on the pull request carries all of it, including sol's dismissed
unearned-green claim verbatim.

## What the green does not claim

Display of the copy (no screen exists); a GitHub-established session at integration tier
(AT-001.19's integration green is the email/Google path only); a database-level content pin on
the attestation; equal blank floors between POSIX `[[:space:]]` and ECMAScript `trim()`; and
future acknowledgment moments. Full text in the merge ruling on the pull request.

## Open questions

- For the founder: none.

## Notes for the coordinator's sweep

- The artifacts directory contents ARE committed into the record — verified before this close.
- Database slot 1 was reserved under this item and is now free.
- The branch is squash-merged, so its head is not an ancestor of main by construction. Judge it
  merged from the pull request state, never from `git branch --merged`.
