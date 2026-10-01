# Writer brief: unit 5, fix round 5, of the Discovery screen on fixtures

Follow `loop/items/AI4DEV-180/prompts/unit5-fix1-writer.md` for the rules, the stop rule, the
settled decisions, the test rules and the checks, with these changes:

- Your working directory is a git worktree on branch `lane/ai4dev-180/unit5-fix5`. It holds fix
  rounds 1 to 4 and the lead's commit 6626892 ("a confirmed Discovery disables Add a file and says
  why").
- Input: `loop/items/AI4DEV-180/evidence/unit5/round6/report.md`. The lead accepts the remaining
  part of 21 and the new issue 22.
- Evidence goes under `loop/items/AI4DEV-180/evidence/unit5/fix5/`: a light desktop and a light
  phone shot of an existing file chat after confirmation, and one dark shot.
- **Commit early.** Commit each fix as soon as its checks pass, before you take screenshots. Do not
  delete files outside your evidence folder at the end.

## Fixes

21 (rest). **An existing file chat is read-only after confirmation.** Contract line 103: a finished
    Discovery stops AI questions and charges. The lead's commit 6626892 disables Add a file after
    confirmation and shows `TEXT.filesFinished` in the files card. Do the same inside the file chat:
    when Discovery is confirmed, a file chat that is open, reopened, staged (chosen but not yet
    answered) or paused on a question shows its messages but no answer chips, no answer box and no
    Send, and shows `TEXT.filesFinished` where the answer controls were. A staged file whose first
    answer never came is not committed (design.md: the staged file commits with its first answer).
    A saved change reopens Discovery and the controls return, as they do today for the files card.
    A read that was already running may finish, but it must not ask a new question while Discovery
    is confirmed; if it reaches its question step, it waits there and asks once Discovery is
    reopened.
22. **A reload keeps the file read's question.** In the fixture world, a read's pause for a question
    depends on the read's state, not on a timer index that a reload resets. After a reload during a
    read, the read continues from its saved percent and still pauses at its question step if that
    question has no answer yet. The question is never skipped. Check both paces.

## Tests

Add to the existing bodies, without new ids: in the confirmation body, an existing paused file chat
after confirmation shows no answer box and shows `TEXT.filesFinished`; after Save change, its answer
controls return. In AT-004.66 or .70 (whichever covers the read), a reload during the read still
reaches the pause question. Keep every current assertion green.
