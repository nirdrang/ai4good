# Resume note for AI4DEV-180 (Discovery screen on fixtures)

Rewritten at the unit 1 gate, 2026-09-30. The founder chose "compact first" before unit 2.

## Where the run is

- The session runs in the item worktree `.claude/worktrees/AI4DEV-180`, on branch
  `nirdrang/ai4dev-180-phase-2-discovery-screen-on-fixtures-pstack-builds-the-real`. The lead is
  poteto-mode, following `brief.md`.
- Playbook: Feature. The how and architect steps are done. The design is `design.md`. The decision
  record is `decisions.tsv`. The four arena candidates and the judge are in `arena/`.
- Unit 1 is merged on the item branch (commit 0726535; record 723c7b9) and pushed. AT-004.65 is
  green at the loop tier. Lead's rerun at 2026-09-29 23:25 local: typecheck 0, at:selftest 0 (474
  passed), at:check req-004 0, at:verify req-004 --tier loop --expect 0 (35 green, 35 red, matches).
- Next: unit 2. Its writer prompt is ready at `prompts/unit2-writer.md`. It includes the two fixes
  unit 1 left: the first-reply copy says "how you work today", and the data port owns the
  organization and project ids.

## How to start unit 2

1. `git worktree add ..\AI4DEV-180-unit2 -b lane/ai4dev-180/unit2 HEAD` from the item worktree.
2. Launch the feature writer (grok:grok-4.7@xhigh, isolated-write) through the pstack runner, as a
   background PowerShell call. Prepend `C:\Users\nirdr\.grok\bin` to `$env:Path` first:
   `bun <plugin>/skills/poteto-mode/scripts/runner/pstack-runner --parent claude --provider grok --model grok-4.7 --effort xhigh --mode isolated-write --prompt <item>/prompts/unit2-writer.md --cwd <repo>/.claude/worktrees/AI4DEV-180-unit2 --output <scratchpad>/unit2-out.md --receipt <scratchpad>/unit2-receipt.json`
   The plugin root is `C:\Users\nirdr\.claude\plugins\cache\open-pstack-nirdrang\pstack\1.4.1`.
3. When it finishes: read the receipt and report, review the diff yourself, rerun the four checks in
   the unit worktree as a background command writing to files, then `git merge --ff-only
   lane/ai4dev-180/unit2` in the item worktree, push, add a row to `decisions.tsv`, and open the
   unit gate with AskUserQuestion (continue or compact, what landed, the commit, the context left).

## Facts that cost time to learn

- Playwright hangs under Bun on this Windows machine (launch and connect). The test runner starts
  vitest under Bun. So Playwright runs in `tests/at/harness/screen-host.mjs` under Node, driven over
  JSON lines by `tests/at/harness/screen.ts`. Probes in `probes/`.
- The first unit 1 writer dropped out after 90 minutes on that problem. Every writer prompt now
  carries a 15-minute stop rule for environment problems.
- In PowerShell, a double-quoted here-string expands `$(...)`. Write probe scripts with the Write
  tool, not a here-string.
- The registry refuses a green that opened no world. Screen bodies call `ctx.open()` first.
- CI needs Node for the host. GitHub-hosted runners have it. The self-hosted runner image
  (`.github/runner/Dockerfile`) has neither Node nor Chromium's libraries: list it under "Not done
  here" unless the founder asks for it.

## Units left

2. Chat, Questions card, usage card, brief panel, progress strip, both layouts: .61 (no Finish
   half), .71, .72, .73.
3. Files: chooser, file chat, read timers: .66, .70, screen parts of .67 and .68.
4. Finish review and Discovery document: .62, .63, .64, the Finish half of .61; integration
   `--expect` on the one stack.
5. Codex loop (GPT-6 Astra at low, founder ruling) on the shell at 1280 and 390, light and dark;
   update `design/astra/discovery-review.md` and `design/astra/screens.json`.
Then interrogate, deslop, the comment audit, the pull request, CI, and the founder's "merge".

## Copy calls for the founder, to list in the pull request

- "Remove one to add another" is dropped: no remove control exists.
- The data-tier and fit sentences are provisional.
- No demo-only "Use a sample file" button.
