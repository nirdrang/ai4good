# Resume note for the scope run (AI4DEV-135)

Read this first in a fresh session, then `design/SYNTHESIS.md`, then the latest
`lanes/unitN-writer.report.md`.

## State
- Branch `nirdrang/ai4dev-135-structured-scope-output-and-rendering-d4`, worktree
  `.claude/worktrees/AI4DEV-135`. The local stack runs from this worktree (restarted
  2026-09-18 15:10 local; the edge runtime served the chat-page worktree before that).
- Design: `design/SYNTHESIS.md` is the contract. Base candidate 2; grafts listed at its end.
- Unit 1 (scope contract, generate route, AT-004.20 and .22) landed at `514ca0f`, green at both
  tiers: `verify/unit1/summary.txt` and `verify/unit1-integration/summary.txt`.
- Unit 2 (money-free rendering, AT-004.21 and .25) landed at `dbe3417` plus review fixes at
  `6d4d059`, verified at both tiers: `verify/unit2/summary.txt`. The lead applied the three review
  fixes by hand (shared regex, dead `lastIndex` resets, two copy strings) instead of a fixes lane.
- Unit 3 (scope as contract, AT-004.24 and .52 red under `backlog.derivation` and
  `prd.authoring`) landed at `b86704c` plus one review fix at `a99695f`, verified at both tiers:
  `verify/unit3/summary.txt`.
- Unit 4 (cause labels, AT-004.58 to .60) landed at `32922f6` plus one review fix at `2483a0b`
  (the pass-through commit takes `p_changed`), verified at both tiers: `verify/unit4/summary.txt`
  (loop) and `verify/unit4-rerun/summary.txt` (integration; the first integration pass hit two
  auth hiccups on ids the unit does not touch, AT-004.03a and .05, and the rerun was clean).
- The unit 4 gate rulings (founder, 2026-09-19) are in `design/SYNTHESIS.md`, last section: no
  turn ceiling, wrap-up on request (the grill-me pattern), three off-topic strikes, the two
  taxonomy lines added to the req-016 requirement text. AT-004.14 and .15 were reworded in the
  acceptance file on this branch with the ruling cited inline.
- Unit 5 (free-phase guardrails, AT-004.12 to .15) landed at `b7b95c0`, no review fix, verified
  at both tiers: `verify/unit5/summary.txt`.
- Unit 6 (regeneration, AT-004.37 to .39) landed at `75fa9be` plus three fixes: `56200f4` (a
  regeneration reads the latest complete elicitation, not the current scope's copy; three
  unused pending names removed), `bed3a91` (AT-004.60 asserts the removed label stays in the
  shared vocabulary instead of a whole-table snapshot; the regeneration asserts print the
  refusal), `b257e0c` (the live SQL client pools two connections: bun pools ten per client,
  and ten req-004 files in parallel filled the local postgres, so auth answered 500 or no token
  on a different test each run). Verified at both tiers on `b257e0c`:
  `verify/unit6-head/summary.txt` (the earlier folders `verify/unit6`, `unit6-final` and
  `unit6-rerun/` hold the runs that found the two defects).
- All six units are built. Closing stations done: deslop (nothing to cut), the comment audit on the
  mechanical model at `7ca1baf`, interrogate (five lanes, `interrogate/verdict.md`) with the fixes at
  `3830cbf`, verified at both tiers on `d82cadb`: `verify/interrogate-fixes/summary.txt`.
- Next: the trail review by another model family, then the pull request.

## How a unit runs
1. `git worktree add -b lane/ai4dev-135/unitN ../AI4DEV-135-unitN HEAD` from this worktree, then
   `bun install --frozen-lockfile` in the lane.
2. The grok writer lane (feature row of the sheet) runs `pstack-runner --provider grok
   --mode isolated-write` with `lanes/unitN-writer.prompt.md`, cwd the lane worktree.
3. Review the diff. The Edit tool cannot write into a lane worktree from this session, so merge
   first (`git merge --ff-only lane/ai4dev-135/unitN`) and commit small fixes here; a large fix
   list goes to a fresh lane on the lane branch before the merge.
4. `powershell -File loop/items/AI4DEV-135/verify/run.ps1 unitN all` in the background; read
   `verify/unitN/summary.txt`.
5. Rewrite this note, commit, gate with `AskUserQuestion`.

## Open with the founder
- Settled at the unit 1 gate (founder, 2026-09-18): generation stays an explicit `discovery-scope`
  write (design decision 2).
- None open. Unit 6 needed no ruling (the regeneration bound is 3 from the architecture notes).

## Not done here (for the pull request)
- The chat page shows no scope and no generate control; the wiring leaf owns that.
- A regeneration may re-emit a label the NGO removed; nothing records removals.
- Fuel is not billed for the scope model call; generation is zero-cost on both billing kinds.
- The money check on a generated scope is a word list (`$`, USD, dollar, cost, estimate,
  budget, price). A figure spelled in words or another currency passes it.
- A retry is recognised by the exact same message after a failed turn; a message edited by one
  character costs credits again.
- An escalated project stays escalated; no admin path lifts the escalation.
- Scope calls sit outside metering: a failed generation can be retried at zero cost without a
  bound. A failed regeneration takes a version number but never counts toward the bound.
- The chat's cached prompt carries the scope skill and the scope call carries the chat skills; one
  cached block serves both by design.
- The conversation read carries no guardrail state (count, flagged, notice) for a page reload.
- The four migrations of this branch rewrite `discovery_scope_begin` three times; a squash is a
  founder call.
- Scope calls sit outside metering: a failed generation can be retried at zero cost without a
  bound. A failed regeneration takes a version number but never counts toward the bound.
- The chat's cached prompt carries the scope skill and the scope call carries the chat skills; one
  cached block serves both by design.
- The conversation read carries no guardrail state (count, flagged, notice) for a page reload.
- The four migrations of this branch rewrite `discovery_scope_begin` three times; a squash is a
  founder call.
