# Codex review, round 2

Canvas version 57, local copy on 127.0.0.1:4390. Model gpt-6-astra at low. Run 2026-10-12, 157,098 tokens. Prompt: one run playing Priya (laptop) and Maya (phone), ten tasks, then every interaction.

Priya: â€œI closed revision 18 and reached the expected UI Design preview-end message. My first attempt ran out of usable funds; a shorter run finished with $0.22 left.â€

Maya: â€œI answered questions on my phone and read the saved Data handling section.â€

Tested Main at 1280 Ã— 900 and Phone at 390 Ã— 844.

**1. Works**

- **Priya, laptop:** â€œThe opening checklist tells me which sections and kitchen answers are missing.â€
- **Priya, both pages:** â€œI can open all six sections and read their requirements, sources, and status.â€
- **Priya, both:** â€œAll shift choices respond. Sending my selections updates the rules and Technical scope. Choosing â€˜No swapsâ€™ removes the swap story.â€
- **Priya, both:** â€œPost to Maya adds the success question to her list.â€
- **Maya, both:** â€œQuestion-list buttons open the right conversation. Suggested answers fill my reply; I can replace them with my own words.â€
- **Maya, both:** â€œSend, follow-up replies, Edit, and Mark answer complete work. Priya can see when Iâ€™m finished.â€
- **Priya, both:** â€œView answer lets me change the wording and add a note. Use answer records the handover in the main chat.â€
- **Priya, both:** â€œSection messages update the draft. Confirm section and Reopen for review change its approval status.â€
- **Priya, both:** â€œAnswered expands and collapses. Selecting an answered item takes me to its recorded handover.â€
- **Priya, both:** â€œThe shift-chat shortcut and update links open the relevant section.â€
- **Maya, phone:** â€œChat, PRD, Questions, All questions, and PRD sections let me move around. I completed the plain-text-email answer.â€
- **Priya, phone:** â€œUsing that optional answer adds â€˜No, plain text emailsâ€™ to Notifications.â€
- **Priya, phone:** â€œSend submits my message; Enter adds a newline. My follow-up entered while the AI was answering also went through.â€
- **Priya, laptop:** â€œThe completion check finds holiday and younger-volunteer gaps. I can fix them, approve again, pass the next check, close the PRD, and select Open UI Design.â€
- **Priya and Maya:** â€œThe prototype role switch changes our available controls. Reload restores the sample.â€

**2. Does not work**

1. **Priya and Maya â€” Main: no recovery from low funds.**  
   â€œAfter discussing and editing answers, then approving the sections, we reached $0.41. Send was disabled. The page told the kitchen to add funds, but neither role had an add-funds control. Clicking the balance did nothing. We had to restart.â€

2. **Priya â€” Main: cannot ask about costs after closing.**  
   â€œI closed the PRD, selected Open UI Design, then looked for somewhere to ask the cost question. Closing had removed the message field.â€

3. **Priya â€” Main and Phone: the cost answer gives an outdated balance.**  
   â€œOn a fresh laptop run, I asked what the work costs and what remains. The reply said $4.38 was left, while the balance showed $3.87. The answer hadnâ€™t included its own charge. I saw the same pattern on my phone.â€

4. **Priya â€” Main and Phone: notes settle decisions without entering the PRD.**  
   â€œI opened View answer, put the export-retention rule in Note for the AI, and selected Use answer. The AI said my note settled the question, but Data handling omitted that rule. My success-measurement note was also missing from Success criteria. Explicitly adding the export rule through section chat worked.â€

5. **Maya â€” Phone: the question card inside Chat does not open the question.**  
   â€œI opened Chat and tapped the contact-details card marked â€˜open Â· answer itâ€™. I stayed in Chat. Going through Questions opened it.â€

6. **Priya â€” Main: the holiday fix drops part of my answer.**  
   â€œFrom the completion-check gap, I requested yearly closed dates, prevention of new shifts, and cancellation emails for already-published shifts. The saved requirement only covered yearly dates and preventing publication, yet the AI declared the gap closed.â€

**3. Usability hints**

- **Priya:** â€œShow the reply price before Send, explain pending charges, and reserve enough money for the final checks. Asking what things cost should not itself consume the remaining budget.â€
- **Priya:** â€œThe checklist called sections â€˜ready to confirmâ€™ while their completion-check gaps still prevented confirmation. Say â€˜needs a decisionâ€™ instead.â€
- **Priya:** â€œReplace `[THRESHOLD â€” pilot decision]` with an actual threshold. I cannot judge why 84% fails and 91% passes.â€
- **Priya:** â€œCheck Technical scope against the other sections. Its story list did not visibly gain the reporting, retention, or export work we agreed.â€
- **Maya:** â€œDo not tell me â€˜discuss it hereâ€™ or â€˜confirm itâ€™ in a section where I can only read. Give me a route to my question.â€
- **Maya:** â€œMark answer complete becomes available while the AI is still asking a follow-up. Make unresolved questions obvious before I send something developers may treat as final.â€
- **Maya:** â€œCombine my replies into a clean proposed answer. Joining them with semicolons makes me do extra editing.â€
- **Priya:** â€œExplain the difference between clicking a question, View answer, and Use answer. One shows conversation, one allows editing, and one immediately applies it.â€
- **Maya:** â€œThe phone has separate scrolling areas for the section and its conversation. A clearer â€˜read full sectionâ€™ view would help.â€
- **Priya and Maya:** â€œClean the saved wording before approval: we saw doubled punctuation and instructions such as â€˜Add explicitlyâ€™ copied into requirements.â€

6 interactions do not work.
