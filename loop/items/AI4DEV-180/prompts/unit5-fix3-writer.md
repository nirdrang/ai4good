# Writer brief: unit 5, fix round 3, of the Discovery screen on fixtures

Follow `loop/items/AI4DEV-180/prompts/unit5-fix1-writer.md` for the rules, the stop rule, the
settled decisions, the test rules and the checks, with these changes:

- Your working directory is a git worktree on branch `lane/ai4dev-180/unit5-fix3`. It holds fix
  rounds 1 and 2.
- Input: `loop/items/AI4DEV-180/evidence/unit5/round3/report.md`. Round 3 confirmed issues 1 to 16
  fixed. The lead accepts the two new issues, 17 and 18.
- Evidence goes under `loop/items/AI4DEV-180/evidence/unit5/fix3/`: light viewport shots of the
  free edit (17) at desktop and phone, and of the reopened state after confirmation (18) at desktop
  and phone, plus one dark shot of each.
- **Commit early.** Commit each fix as soon as its checks pass, before you take screenshots. The
  last writer run was cancelled while it retook a screenshot and lost nothing only because the lead
  committed for it.

## Fixes (numbers follow the report)

17. **Changing an earlier answer is free.** `design/discovery-ui-contract.md` lines 64, 66, 197 and
    243: manual answer editing uses no turn. When the person changes a reopened question's answer
    (from Edit in the live brief, or Edit on the review page), the change saves through the port's
    `saveBriefEdit` with `baseRevision`, makes no model call and uses no free reply or fuel. The
    control for this reads "Save change" (take the label from a board if one shows it) and sits with
    the reopened question, not in the composer; the composer's Send stays for new messages only. The
    brief updates to the new revision at once. If the change affects a dependent answer, mark that
    topic as needing review (line 64) the way the design names it. Add to the AT-004.61 or .73 body
    (whichever holds the Edit path): after Edit, a changed answer and Save change, the brief shows the
    new answer, the model-call probe count is unchanged, and Free today and Beta are unchanged.
18. **A change after confirmation reopens Discovery.** Line 105: if the NGO changes an answer after
    confirming, reopen the affected topic, lower progress where needed, and invalidate the previous
    approval. So after confirmation, Edit in the live brief and Answer in Questions must show the
    question with its options and Save change, exactly as before confirmation. Saving a change
    clears the confirmation in the fixture world: the finished state goes, Finish Discovery and the
    review page need new acknowledgments, the review tick clears, and Volunteer match shows "Scope
    not confirmed" again. Until the person saves a change, nothing is invalidated (opening Edit and
    going Back changes nothing). Add a body step to AT-004.62 or .63 (whichever covers
    confirmation): after confirming, Edit and Save change on one answer shows the question, then
    clears the confirmation; the review page asks for the acknowledgments again.
