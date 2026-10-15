# Codex review, round 1

Canvas version 49, local copy on 127.0.0.1:4390. Model gpt-6-astra at low. Run 2026-10-11. Prompt: one run playing Priya (laptop) and Maya (phone), eight tasks, then every interaction.

Priya: â€œI completed the laptop journey, including fixing both completion-check gaps, closing the PRD, and generating the board: six requirements in Backlog, zero In progress, zero Done.â€

Maya: â€œI answered and completed a question on the phone.â€

We used the requested screen sizes. â€œOpen in Linearâ€ was not followed because it leaves the three permitted addresses. Independent sample-state resets are not counted as failures.

**1. Works**

- **Priya â€” Main:** â€œThe closure checklist showed missing sections, unposted questions, and answers waiting for me.â€
- **Priya â€” Main and Phone:** â€œI could open all six sections, return to the main chat, and read the section discussions.â€
- **Priya â€” Main and Phone:** â€œAll shift choices were selectable. Changing a choice replaced the previous selection.â€
- **Priya â€” Main:** â€œSending coordinator-approved swaps and two-week publishing updated the shift rules and made Technical scope ready.â€
- **Priya â€” Main and Phone:** â€œâ€˜Post to Mayaâ€™ added the success question to her list.â€
- **Maya â€” Main and Phone:** â€œQuestion cards opened the right conversations. â€˜All questionsâ€™ took me back.â€
- **Maya â€” Main and Phone:** â€œEach suggested answer filled the answer box. I could replace it with my own words and send.â€
- **Maya â€” Main and Phone:** â€œâ€˜Mark answer completeâ€™ changed the status to waiting for Priya. I could reread my completed answer.â€
- **Priya â€” Main and Phone:** â€œâ€˜View answerâ€™ showed Mayaâ€™s answer, an editable version, and an optional note field.â€
- **Priya â€” Main and Phone:** â€œClaiming carried my edited wording and note into the main chat. The direct Claim button also worked.â€
- **Both â€” Main and Phone:** â€œThe Answered list expanded and collapsed. Selecting a claimed answer jumped to its handoff in chat.â€
- **Priya â€” Main and Phone:** â€œConfirm section, Reopen for review, and reconfirming changed the section status and progress count.â€
- **Priya â€” Main:** â€œThe completion check found holidays and younger volunteers. I could open those sections, add decisions, reconfirm, and reach Close PRD.â€
- **Priya â€” Main:** â€œClose PRD opened Materialize.â€
- **Priya â€” Main:** â€œQueued messages sent automatically. Edit successfully returned one queued message to the composer.â€
- **Maya â€” Phone:** â€œChat, PRD, Questions, and the section-back button worked. Enter added a new line; Send submitted my answer.â€
- **Priya â€” Materialize:** â€œStart showed progress. Resume recovered from the simulated interruption and produced six distinct board cards.â€
- **Priya â€” Materialize:** â€œShow steps, Hide steps, and Read the PRD worked.â€

**2. Does not work**

1. **Priya â€” Main, prepaid balance:** â€œI continued answering and fixing gaps. The app let my balance reach **âˆ’$0.86**, without stopping or asking. I expected prepaid funds to limit spending.â€

2. **Maya â€” Main and Phone, draft isolation:** â€œI selected â€˜24 monthsâ€™ in Data handling, returned to the question list, then opened another question. The old answer appeared in the new questionâ€™s box. I could easily send it to the wrong place.â€

3. **Priya â€” Main, success handoff:** â€œMaya chose â€˜Both of these,â€™ completed her answer, and I claimed it. The PRD literally said â€˜Both of theseâ€™ instead of naming the success targets.â€

4. **Priya â€” Main and Phone, editing requirements:** â€œI asked the success section to spell out its targets, and separately asked Notifications to change reminders from 24 to 48 hours. The AI said it updated the draft, but the displayed requirements stayed unchanged.â€

5. **Priya â€” Phone, alternative shift decision:** â€œI selected â€˜No swaps; volunteers cancel insteadâ€™ and sent it. Technical scope still included a **swap approval story**.â€

6. **Priya â€” Main, readiness:** â€œAfter claiming retention, the AI still asked me to settle the export ruleâ€”even though my note already answered it. Meanwhile, Data handling said every decision was recorded and let me confirm.â€

7. **Maya â€” Main, retention discussion:** â€œI asked whether volunteers could request earlier removal. The AI did not answer that directly. Its completed handoff then bundled my question into the decision instead of separating uncertainty from my final answer.â€

8. **Maya â€” Phone, logo choice:** â€œI chose â€˜No, plain text emails.â€™ The AI replied that the logo could come later. That changed my choice, so I had to correct it.â€

9. **Priya â€” Main and Phone, practical questions:** â€œI asked what blocked closure, what the next step was, and what the check would cost. The AI replied that it added my message to PRD notes, without answering.â€

10. **Maya â€” Phone, question counts:** â€œAfter completing one of two questions, the heading still said **2 open**, while the bottom Questions badge said **1**.â€

11. **Priya â€” Main and Phone, queue Remove:** â€œI sent a message, queued another, then clicked Remove. The queued message appeared as sent anyway. This happened twice on the laptop and once on the phone.â€

12. **Priya â€” Phone, queue Edit:** â€œI queued a draft and clicked Edit. It was sent instead of returning to the composer. The automatic sending was too fast for me to reliably intervene.â€

13. **Priya â€” Materialize, next step:** â€œAfter all three steps completed, I clicked Open UI Design. Nothing opened or changed. I tried it again with the same result.â€

**3. Usability hints**

- **Priya:** â€œShow an estimated charge before Send, Claim, and the automatic completion check. Explain pending versus final charges.â€
- **Priya:** â€œâ€˜Claim answerâ€™ is unfamiliar. â€˜Review and use answerâ€™ would tell me what happens.â€
- **Maya:** â€œShow one clean final-answer preview before I mark it complete, with a way to revise it afterwards.â€
- **Maya:** â€œStart my phone view on Questions. The long developer conversation makes me search for my own work.â€
- **Priya:** â€œReplace `[THRESHOLD â€” pilot decision]` with an actual threshold. Explain what the remaining uncovered percentage means before I close.â€
- **Priya:** â€œTechnical scope mentions eight stories and acceptance criteria, but I cannot inspect them there. Give me something concrete to review.â€
- **Maya:** â€œAt 390 Ã— 844, the bottom navigation labels were partly cut off. Keep the complete labels visible.â€
- **Priya:** â€œThe board clearly separates requirements from completed work. Keep that explanation, but rename â€˜materializeâ€™ to something like â€˜Create requirements and board.â€™â€

Automatic approval review rejected retaining the review tab as outside the requested scope; page testing and this report were unaffected.

13 interactions do not work.
