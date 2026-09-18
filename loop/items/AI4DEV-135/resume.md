# Resume note for the scope run (AI4DEV-135)

Read this first in a fresh session, then `design/SYNTHESIS.md`, then the latest
`lanes/unitN-writer.report.md`.

## State
- Branch `nirdrang/ai4dev-135-structured-scope-output-and-rendering-d4`, worktree
  `.claude/worktrees/AI4DEV-135`. The local stack now runs from this worktree (restarted
  2026-09-18 15:10 local; the edge runtime served the chat-page worktree before that).
- Design: `design/SYNTHESIS.md` is the contract. Base candidate 2; grafts listed at its end.
- Unit 1 (scope contract, generate route, AT-004.20 and .22) landed at `514ca0f` and is green at
  both tiers: `verify/unit1/summary.txt` (loop) and `verify/unit1-integration/summary.txt`.
- Units 2 to 6 not started. Prompts: `lanes/unit2-writer.prompt.md` is written; the others are
  written at each gate.

## How a unit runs
1. `git worktree add -b lane/ai4dev-135/unitN ../AI4DEV-135-unitN HEAD` from this worktree.
2. The grok writer lane (feature row of the sheet) runs `pstack-runner --provider grok
   --mode isolated-write` with `lanes/unitN-writer.prompt.md`, cwd the lane worktree.
3. Review the diff; fixes go to a fresh lane on the same branch with a consolidated list.
4. `git merge --ff-only lane/ai4dev-135/unitN`, then
   `powershell -File loop/items/AI4DEV-135/verify/run.ps1 unitN all` in the background; read
   `verify/unitN/summary.txt`.
5. Rewrite this note, commit, gate with `AskUserQuestion`.

## Open with the founder
- Settled at the unit 1 gate (founder, 2026-09-18): generation stays an explicit `discovery-scope`
  write (design decision 2). Nothing to change.
- Unit 5 needs two pin values: the turn ceiling and the off-topic strikes threshold.

## Not done here (for the pull request)
- The chat page shows no scope and no generate control; the wiring leaf owns that.
- A regeneration may re-emit a label the NGO removed; nothing records removals.
- Fuel is not billed for the scope model call; generation is zero-cost on both billing kinds.

