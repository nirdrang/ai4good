# PHASE-STATE — AI4DEV-60 (session expiry, refresh, password reset)

**Phase just completed: MERGE SITTING, WITHOUT THE MERGE** (sitting 5, `orchestrator` on
fable, claude-fable-5 @ xhigh). The merge DECISION is made and recorded; its EXECUTION is
blocked at the permission layer. This file rides in the head that closes the sitting; the
conductor verifies the reported head against the remote.

## The merge ruling exists and the decision is MERGE

- `loop/items/AI4DEV-60/merge-ruling.md`, committed with this file. It pins head
  `9c53e685b384efe08e3a4e6cd19b882800fbe089` and records: what was built, all 25 dispositions
  (5 plan-gate, 3 draft, 7 draft-code, 4 measurement re-pins, 6 audit — re-counted first-hand
  from the five rulings files, zero rejections, no maintained disagreement), both audit seats'
  box verdicts, and what the green does and does not claim.
- CI confirmed first-hand this sitting: required check `verify` PASS on exactly
  `9c53e68…`, run 31341518091, 40 seconds. `gh pr view 50`: OPEN, CLEAN, MERGEABLE.
  `git ls-remote` confirmed the remote branch tip at the same SHA before the merge attempt.
- The live body of pull request #50 is byte-identical to `pr-body.md` (verified this sitting
  under explicit UTF-8 decoding). A mechanical's first comparison reported a mismatch; that
  was the instrument — PowerShell 5.1 `Get-Content -Raw` without `-Encoding utf8` mis-decodes
  the BOM-less UTF-8 file, manufacturing mojibake. The previous item's merge sitting recorded
  the identical incident. The negative was re-measured and disproven.

## Why the merge did not execute: a permission denial, reported as REFUSED

The orchestrator handed the ruling to a mechanical (publish the ruling comment, then
`gh pr merge 50 --squash`, no branch deletion). **The Agent spawn itself was denied by the
Claude Code auto-mode permission classifier** — the mechanical was never created. Exact denial
text, verbatim:

> Permission for this action was denied by the Claude Code auto mode classifier. Reason:
> Blocked by classifier. If you have other tasks that don't depend on this action, continue
> working on those. IMPORTANT: You *may* attempt to accomplish this action using other tools
> that might naturally be used to accomplish this goal, e.g. using head instead of cat. But
> you *should not* attempt to work around this denial in malicious ways, e.g. do not use your
> ability to run tests to execute non-test actions. You should only try to work around this
> restriction in reasonable ways that do not attempt to bypass the intent behind this denial.
> If you believe this capability is essential to complete the user's request, STOP and explain
> to the user what you were trying to do and why you need this permission. Let the user decide
> how to proceed. To allow this type of action in the future, the user can add a Bash
> permission rule to their settings.

Per the orchestrator contract, a refusal on the merge path is a STOP: the orchestrator never
runs the merge command itself (founder ruling 2026-08-07), never reroutes it through another
actor, and never rewords the request until the classifier stops objecting. The denial was
re-measured before being believed: a second mechanical with a benign read-only task (the PR
body comparison above) spawned and ran normally, so the Agent tool works and the denial is
specific to the merge-bearing prompt. The merge stays blocked until the boundary's owner —
the founder — changes the boundary or executes the step.

## What this close does to the pinned head — the successor MUST re-pin

This close commit moves the branch tip PAST `9c53e68…`. Every changed path is under
`loop/items/` (prose territory), so CI re-runs on the push via the prose fast lane. The
sitting that executes the merge must: confirm `verify` green on the NEW tip, update the
pinned-head line in `merge-ruling.md` to that tip, and only then publish the ruling comment
and hand the merge to a mechanical. The ruling's substance needs no other change — the
dispositions and the built content are head-independent; only the pin and the run id move.

## What completes the next phase

1. The founder decides how to unblock the merge execution: add the permission rule the denial
   names, run the merge personally, or direct another documented path. The denial text above
   is the whole evidence; nothing else is wrong.
2. After the unblock: a merge-execution sitting confirms green on the current tip, re-pins
   `merge-ruling.md`, publishes it to pull request #50 as handed, hands
   `gh pr merge 50 --squash` (no branch deletion) to a mechanical, then runs the post-merge
   checks: PR state MERGED, the squash SHA on main, the board item flipped Done by the
   integration (repair only if the webhook dropped, recorded as a repair), and a final
   post-merge record commit on the item branch.

## Item facts the next sitting needs

- Branch `nirdrang/ai4dev-60-sessions-automatic-refresh-and-password-reset-d2l2`; PR #50
  open, body current and verified identical to `pr-body.md`.
- Verify pinned: req-001 at 13 green / 24 red exact match; req-016 at 11 / 1; selftest 264.
- The conductor's CI watch script (`artifacts/watch-ci.sh`) is committed with this close so
  the tree exits clean; it is sitting record, not evidence.
- The local Supabase stack may still be up with the checked-in configuration; it is cleanup,
  not evidence. Two other stacks (`ai4good-slot-1`, `ai4good-slot-2`) belong to another
  session — never touch.

## Open questions for the founder

One, stated above: unblock the merge execution. No finding contradicts ratified text and no
scope grew — this is a REFUSED report, not a ruling question.
