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
- Units 3 to 6 not started. `lanes/unit3-writer.prompt.md` is written; the others are written
  at each gate.

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
- Unit 5 needs two pin values: the turn ceiling and the off-topic strikes threshold.

## Not done here (for the pull request)
- The chat page shows no scope and no generate control; the wiring leaf owns that.
- A regeneration may re-emit a label the NGO removed; nothing records removals.
- Fuel is not billed for the scope model call; generation is zero-cost on both billing kinds.
- The money check on a generated scope is a word list (`$`, USD, dollar, cost, estimate,
  budget, price). A figure spelled in words or another currency passes it.
