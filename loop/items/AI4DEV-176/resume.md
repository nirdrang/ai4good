# Resume note for AI4DEV-176 (PRD screen design)

Updated 2026-10-14. The ui-design skill runs this item (brief: loop/items/AI4DEV-176/brief.md).

## Where things are

- Steps 1 to 7 are done. The founder approved the screen as complete (step 5), confirmed every marked ruling for the PRD (step 6), and the acceptance cases are written (step 7).
- Canvas: https://claude.ai/artifact/2C3E67dNymAStfLY5GSdxn, final version 65. Copy for screen build: design/canvas/prd-workspace/project/.
- Review record, with the outcome, the known gaps, and every ruling in the founder's words: design/canvas/prd-workspace/review.md.
- Step 8 is in progress: commit, push, and one pull request. Merge only when CI is green on the exact head and the founder says "merge"; then ExitWorktree (keep) and /controller done for this item.

## Open items for after the merge

1. Board items written for the old order need rewording, which is board work for /controller done or the founder: the PRD materialization item and the screen sign-off into Build item, plus the PRD manifest leaves D2 to D6 (turns, request effort, materialize at close).
2. The known gaps listed in the review record (REQ-010, REQ-026, the Design review part of REQ-036 and its contract, the Build plan stage).
3. A "Screen design: Project page" item (REQ-010) and a "Screen design: UI Design" item were drafted for the founder to file; the founder files items unless told "use linear to place the item".
4. The Linear forward sync (/doc-sync) for the PRD, acceptance, and manifest changes.

## House rules seen this session

- Design talk happens in the session chat; answer canvas comments here, not in the comment threads.
- Every decision goes through AskUserQuestion with a concrete example in each option.
- The phone board script is copied from Main by the scratchpad prd-canvas/build-test.js, which also runs the flow tests; run it before each publish.
