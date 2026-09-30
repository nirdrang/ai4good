Round 2 rechecked all eleven findings. Their original reproduction steps now pass. Five new findings follow, numbered 12–16.

I explored all nine scenarios with Node Playwright and `pace=demo`. Viewports were 1280×900 and 390×844, each in light and dark themes. Phone contexts used touch and a phone user agent. I also checked 320×700 in light mode.

In all four main combinations, I completed the interview from `first-reply`, agreed six topics, reviewed, edited, confirmed, and read the Discovery document. Back to the chat also worked. Separate checks covered custom answers, uncertain answers, Questions, live brief edits, file reading, review suggestions, and completion with gaps.

Screenshot names refer to this report's folder. Measurements are in `checks.json`, `followup.json`, `deeper.json`, `stable.json`, and `paid.json`. Corrected follow-up scripts resolve the earlier locator and route errors recorded in those files. Those script errors are not product findings.

1. **Fixed — The interview continues after the first two answers.** Desktop and phone, both themes. In `first-reply`, select both suggested answers and Send. Success measure and Maintenance owner now follow. Information handled and Booking rules follow those answers. Progress reaches 100%. This meets the next-topic requirement in `design/discovery-ui-contract.md:84`. Screenshots: `1280-light-round2.png`, `390-dark-ready.png`.

2. **Fixed — Answer in the chat opens the requested topic.** Desktop and phone, both themes. Submit the first two answers, open Finish Discovery, and select Answer in the chat for Success measure. The question appears, and focus reaches its first option. This meets `design/discovery-ui-contract.md:91`. Screenshot: `390-light-answer-unasked.png`.

3. **Fixed — The desktop file question has readable space.** Desktop, both themes. Add `sunday-gaps.csv`, describe it, close during reading, and reopen after the pause. The latest question is fully visible above its answer buttons. The transcript has about 247 pixels of height. The approved right-column placement remains. Reference: `design/astra/canvas-rev12/Interview.dc.html:254`. Screenshot: `1280-light-follow-paused.png`.

4. **Fixed — The phone header is compact.** Phone, both themes; also 320×700 light. Open `first-reply`. The conversation starts near y=198, below the progress strip and two buttons. Its height is about 488 pixels at 390 pixels wide, and 344 pixels at 320 pixels wide. This follows `loop/items/AI4DEV-180/design.md:315`. Screenshots: `390-light-initial.png`, `320-light-initial.png`.

5. **Fixed — The file chooser title fits.** Phone, both themes; also 320×700 light. Select Add a file. The title and Back to chat fit in the header. Cancel adding this file sits at the bottom. No title overlap remains. Reference: `loop/items/AI4DEV-180/design.md:320`. Screenshots: `390-light-stable-chooser.png`, `320-light-stable-chooser.png`.

6. **Fixed — Reading is blue and the paused question is amber.** Desktop and phone, both themes. Add `sunday-gaps.csv`, send its description, and compare reading with the pause at 35%. I read the computed `background-color` of the fill, not the track. Both viewports return these values:

   | Theme | Reading fill | Paused fill |
   | --- | --- | --- |
   | Light | `oklch(0.45 0.14 255)` | `oklch(0.55 0.13 85)` |
   | Dark | `oklch(0.75 0.12 255)` | `oklch(0.82 0.12 90)` |

   Desktop file-row fills also match the panel fills. The suspected missing amber state is not present. Reference: `design/astra/canvas-rev12/Interview.dc.html:603`. Screenshots: `1280-light-follow-reading.png`, `1280-light-follow-paused.png`, `390-dark-stable-paused.png`.

7. **Fixed — Review section headings use capitals.** Desktop and phone, both themes. Open Finish Discovery and read The need and the answered sections. Their visible headings are uppercase, as specified in `design/astra/canvas-rev12/Finish.dc.html:18`. Screenshots: `1280-light-review-saved.png`, `390-dark-follow-review-edit.png`.

8. **Fixed — A fresh conversation shows the first AI reply.** Desktop and phone, both themes. Open `first-reply` with fresh storage. The introduction and request for files are visible without scrolling upward. Reference: `design/discovery-ui-contract.md:266`. Screenshots: `1280-light-initial.png`, `390-light-initial.png`. Later-round scrolling is a separate finding below.

9. **Fixed — View highlights the answer.** Desktop and phone, both themes. Open `mid-interview`, open Questions, and select View for Main priority. The chat shows “Less coordination time” with a background and a two-pixel outline. The highlight then clears. This meets `design/discovery-ui-contract.md:261`. Screenshots: `1280-light-stable-view.png`, `390-dark-stable-view.png`.

10. **Fixed — The checked controls restore or set focus.** Desktop and phone, both themes. Open the live brief and select Back to chat. Focus returns to Open your live brief. Closing the chooser returns focus to Add a file. Selecting Edit The need in review focuses its textarea. Reference: `design/discovery-ui-contract.md:302`. Screenshots: `390-light-brief-close.png`, `390-dark-follow-review-edit.png`. Focus measurements are in the JSON evidence.

11. **Fixed — Find a volunteer opens the publication page.** Desktop and phone, both themes. Confirm Discovery and select Find a volunteer. The route changes to the volunteer-match page. The original dead button is fixed against `design/discovery-ui-contract.md:37`. The newly reachable page has the separate state problem in issue 16. Screenshots: `1280-light-find-volunteer.png`, `390-dark-find-volunteer.png`.

12. **Major — Later rounds open below the new reply and first question.** Desktop and phone, both themes. In `first-reply`, select both suggested answers and Send. Repeat for Success measure and Maintenance owner. Each new round scrolls to the bottom. On the phone, the visible area starts inside the last question's explanation or options, followed by Your files. The new reply and first question are above the viewport. After the first submission, the phone reply ends near y=-379 while the conversation starts near y=198. The board presents the question with its explanation (`design/astra/canvas-rev12/Phone.dc.html:37`). Screenshots: `390-light-deep-round1.png`, `1280-light-after-round2.png`.

13. **Major — The completed topic checklist still accepts a charged reply.** Desktop and phone, both themes. Answer all six topics with their suggested options. At 100%, type “Thank you.” and select Send. The AI replies again, and daily free replies decrease from seven to six. The composer remains instead of the finish invitation required by `design/discovery-ui-contract.md:88–89`. This occurs before NGO confirmation. Screenshots: `1280-light-deep-ready-send.png`, `390-dark-deep-charged-after-ready.png`.

14. **Major — Single-question mode skips the first question of the next round.** Desktop and phone, both themes; also reproduced at 320×700 light. Open `first-reply`, select One question at a time, answer the first question, select Next question, answer booking, and Send. The next round displays only Maintenance owner. Success measure is absent from the conversation. There is no Previous or Show questions together control. Selecting Answer for Success measure in Questions recovers it and shows both questions. The contract requires the next unresolved topic and supports single-question mode (`design/discovery-ui-contract.md:84`, `:224`). Screenshots: `1280-light-stable-single-round2.png`, `390-dark-stable-single-round2.png`.

15. **Major — Free replies do not reduce the beta counter.** Desktop and phone, both themes. Start `first-reply` with ten daily replies and 42 beta replies. Complete the three interview submissions. Daily replies decrease to seven, but beta replies remain at 42. File-chat answers show the same mismatch. The contract describes daily and beta limits on free replies, with both counters having capacity (`design/discovery-ui-contract.md:116–119`). Screenshots: `1280-light-initial.png`, `1280-light-ready.png`. Before-and-after values are in `deeper.json`.

16. **Major — The publication page loses the Discovery confirmation.** Desktop and phone, both themes. Complete all six topics, review the document, tick both acknowledgments, and finish Discovery. Select Find a volunteer. The destination says “Scope not confirmed” and asks for Discovery confirmation. Send for review is disabled. Its process bar still marks Discovery current. The contract requires Volunteer match after confirmation and carries the confirmed brief into review (`design/discovery-ui-contract.md:36–41`, `:105`). Screenshots: `1280-light-find-volunteer.png`, `390-dark-find-volunteer.png`.

The five originally suspected layout and colour problems no longer reproduce. No blocker prevents acknowledged Discovery completion. The publication handoff still prevents the next submission.

No application files were changed. Nothing was committed or pushed. The fixture shell is stopped. Final workspace changes are confined to this evidence folder.
