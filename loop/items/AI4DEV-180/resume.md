# Resume note for AI4DEV-180 (Discovery screen on fixtures)

Rewritten at the unit 5 gate, 2026-10-01. The founder chose "compact first" before the closing
stations.

## Where the run is

- The session runs in the item worktree `.claude/worktrees/AI4DEV-180`, on branch
  `nirdrang/ai4dev-180-phase-2-discovery-screen-on-fixtures-pstack-builds-the-real`. The lead is
  poteto-mode, following `brief.md`. The design is `design.md`; the decision record is
  `decisions.tsv` (one row per decision, read it for the full history).
- All five units are merged on the item branch and pushed. Head at the gate: 6e352d7.
- Tests: AT-004.61 to .66 and .70 to .73 are green at the loop tier. AT-004.67 and .68 run their
  screen checks and stay pending (their backend half is phase 3). AT-004.69 stays pending. Last
  lead rerun: typecheck 0, at:selftest 0 (474 passed), at:check req-004 0, at:verify req-004 --tier
  loop --expect 0 (44 green, 26 red, matches). The integration run matched at unit 4 (17 green,
  53 red); run it again before the pull request.
- Unit 5: Codex (GPT-6 Astra at low) explored in eight rounds, 23 issues, all fixed; round 8 said
  "No new issues". Reports in `evidence/unit5/round1` to `round8`. The review record
  `design/astra/discovery-review.md` has the section "Revision 12 built on fixtures", and
  `design/astra/screens.json` has the implementation fields.

## Next: the closing stations

1. Integration run: `bun run at:verify req-004 --tier integration --expect` (the one stack must be
   up; `bun run db:start` if not).
2. Interrogate: the multi-model review panel on the whole item diff against `main`
   (`pstack:interrogate`; the reviewers row in `.claude/pstack-models.md`). Rule on each finding;
   fix the accepted ones through the feature writer or by hand when small.
3. Deslop (`pstack:deslop`), then the comment audit (`pstack:comment-sicko`, model sonnet).
4. The pull request from this branch to `main`. Title and body name no other item's id. The body
   has a "Not done here" list and the copy calls (below). Then CI, green on the exact head.
5. Merge only when CI is green on the exact head AND the founder says "merge". Squash merge through
   the mechanical agent, ExitWorktree keep, then `/controller done AI4DEV-180`.

## Facts that cost time to learn

- Playwright hangs under Bun on this Windows machine. It runs in `tests/at/harness/screen-host.mjs`
  under Node. Explorers drive the shell with Node Playwright too.
- The lead's Edit tool works only in the item worktree. Unit worktrees are edited by the writer, or
  by the lead after a fast-forward merge into the item branch.
- A fresh worktree needs `bun install --frozen-lockfile` before any check.
- Grok writer runs twice ended "cancelled" on a late shell command (a screenshot retake, a cleanup).
  Writer briefs now say "commit early"; after a cancel, check `git status` in the unit worktree.
- In PowerShell, a double-quoted here-string expands `$(...)`. Write scripts with the Write tool.
- CI needs Node for the screen host. GitHub-hosted runners have it. The self-hosted runner image
  lacks Node and Chromium's libraries: "Not done here".

## Worktrees kept (no deletion without a founder decision)

`.claude/worktrees/AI4DEV-180-unit1` to `-unit4`, `-unit5` (round 1 explorer), `-unit5-explore2`
to `-explore8`, `-unit5-fix1` to `-fix5`, each on its `lane/ai4dev-180/...` branch.

## Not done here (for the pull request)

- Phase 3 wires the port to edge functions and points the same bodies at the real route.
- The backend halves of AT-004.67 and .68, and the whole of .69.
- Whether the first AI reply costs a turn, and what starts it, is a phase 3 decision.
- `runner.ts --wired` keeps its refusal; its message is phase 3's to change.
- The self-hosted CI runner image needs Node and Chromium's system libraries.

## Copy calls for the founder, to list in the pull request

- "Remove one to add another" is dropped: no remove control exists.
- No demo-only "Use a sample file" button.
- The desktop file chat fills the right column (founder, unit 3 gate).
- Provisional: the data-tier and fit sentences; the ready reply and the finish invitation; "You
  changed <topic>: <answer>" and "You used the suggestion for <topic>: <answer>"; "Discovery is
  finished, so files cannot be added. Change an answer to reopen it."
