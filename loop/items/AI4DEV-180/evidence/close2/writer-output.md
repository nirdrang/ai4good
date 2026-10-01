Closing round 2 for AI4DEV-180 (Discovery review fixes) is committed on `lane/ai4dev-180/close2-review`. The fixture server is stopped. Port 4310 is closed.

## Commits

- `2da20bf3dc88acc34fcb924e28994fa7a86a200b` — loop: the review fixes and the founder's calls for Discovery (AI4DEV-180)
- `92fcc371cc4496e94ee1c4e189139c3644389b2b` — loop: screenshots of the Discovery finish, fuel, and sidebar (AI4DEV-180)

## Checks

- `bun run typecheck` — exit 0. All four projects are clean.
- `bun run at:selftest` — exit 0. 35 files passed. 474 tests passed.
- `bun run at:check req-004` — exit 0. 70 priority ids in the acceptance file. 70 registered. The bijection holds.
- `bun run at:verify req-004 --tier loop --expect` — exit 0. 70 priority ids: 44 green, 26 red, 0 missing. The run matches the expected file.

The nine screenshots are in `loop/items/AI4DEV-180/evidence/close2/`. They show the finish card at tier 0, tier 1, and tier 2, the dashboard after finish, the fuel page after a $50 purchase, the usage card before and after that purchase, and the sidebar after finish in light and dark.

## Fixes

- **A1. Done.** A confirmed brief refuses `acceptSuggestion` and `removeCauseLabel`. The screen uses one helper, `confirmationCurrent`, wherever it decides that Discovery is finished. A finished read already skips its fact when the brief is confirmed. That path was checked and left as it is.
- **A2. Done** for the main chat. The request carries the mode the Send button showed. The world refuses with `mode-changed` before it charges when the mode differs. The screen then shows the new mode and keeps the draft. The file-chat half has nothing left. Round 1 removed the file chat.
- **A3. Done.** The model-call record reports `chat-turn` after the world accepts the turn.
- **A4. Done.** `askTopic` returns the question id from the brief.
- **A5. Done.** Buy fuel shows when the next reply is not free, with the $50 note. The free part of the bar uses the more consumed of the daily and beta limits. The shell opens the fuel page.
- **A6. Done.** The composer clears only when it still holds the sent note. An answer draft clears only when it still equals the sent answer.
- **A7. Done.** View shows only when the answer has a message to scroll to. A Not sure row has no View.
- **A8. Done.** The open sentence and the streamed question list both use `topicSettled`. A Not sure topic stays open. An agreed topic that needs review stays listed.
- **A9. Done.** `applyTurn` and `acceptSuggestion` mark dependents when an answer changes.
- **A10. Done.** The open-questions tick stores the open count. A different count clears the tick.
- **A11. Done.** `ServerChange` carries `confirmation`. The world sends it. Both controllers take it. `saveChange` does not load again.
- **A12. Done.** Each review call clears its busy state in `finally`. The error shows next to the control that failed.
- **A13. Done.** A refusal removes the user line from the chat. The drafts stay. The world builds the stored line from the request.
- **A14. Done.** One fixture world is cached for each scenario and pace.
- **A15. Done.** Paragraph keys use the index. Theme setup does not write the page inside the state initializer. The compact progress observer is gone. The unused `ask` mode is gone. The unused screen helpers are gone. The old scenario picker is gone. The old Discovery helpers in the mock are gone.
- **F1. Done.** Tier 0 shows no data box, and Finish does not need one. Tier 1 keeps the current sentence. Tier 2 uses the fake-records sentence. The In practice line stays under tier 1 and tier 2. A tier 1 or tier 2 finish without the box is refused.
- **F2. Done.** The dashboard reads the finish state from the same fixture world. After finish, attention and the next step say "Find a volunteer match", and Continue opens volunteer match. A fuel purchase raises the fuel that the usage card shows. It does not add free replies. Buy fuel opens the fuel page. Return goes back to the Discovery page the person came from, or to the finished review when Discovery is finished.
- **F3. Done.** A finished step shows a green check in the theme ok colour, with a name that says the step is done. Intake is done once intake is submitted. Discovery and Discovery review are done once Discovery is confirmed for the current revision. A change that reopens Discovery removes those checks. Light and dark both show the check.

The new assertions sit in the existing finish, usage, send, questions, and reopen bodies. No new acceptance id was added. No current assertion was loosened.

## What remains

`design/astra/src/questions.ts` still exists as an empty module. The old Discovery list inside it is removed. Deleting the file itself was blocked.

In the sidebar shots, Intake stays numbered. The sample project phase is still intake, so that step is not finished. Discovery and Discovery review show the green check.