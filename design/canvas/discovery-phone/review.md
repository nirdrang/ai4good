# Discovery phone redesign: review record

Requirement: REQ-004. Screen: Discovery on a phone (390 by 844), from sign-in to finish.
Canvas: https://claude.ai/artifact/GiGBRX1xaDYR1UT6JhCP5p, version 14.
Copy for screen build: `design/canvas/discovery-phone/project/` (all boards and `canvas.json`, from version 14). The canvas player (`support.js`) is not committed.

## Why this redesign

On 2026-11-17 the founder looked at the running app on a phone through the Vercel Sandbox viewer and wrote: "From a quick Look on the phone ui using the vercel sandbox I didn’t really like it. Have an external sol 6.2 persons tinkering with the ui and give feedback so the ui looks better and more self explanatory".

Three Codex personas on GPT-6.2 Sol at high effort used the real app at 390 by 844, against a local stack with Discovery on gpt-6-luna: Maya (a non-technical volunteer coordinator), Sam (an operations lead who uses many apps) and Lee (a mobile product designer). Each sent 7 to 8 real replies. Report: https://claude.ai/artifact/VsqjK7xgwgzeDbmq85W4xa. Scores: looks 6, 5 and 5 of 10; clarity 4 of 10 from all three.

The founder answered the proposal to redesign the phone screens on a canvas, then retest them with the personas, with "Go" (2026-11-18).

## Boards

- `SignIn.dc.html`: sign in, with the ai4good name and 48 px fields.
- `Main.dc.html`: the whole phone flow on one board: chat, Questions, Your brief, Your files, Reply limits, Account, review, finish and publish. Props: `variant` (`proposed` or `ruled`) and `start` (`chat` or `review`).
- `Review.dc.html`: `Main` started at the review with a sample of four answered and two open topics.
- `MainRuled.dc.html` and `ReviewRuled.dc.html`: the same flow with the three earlier rulings kept, for comparison.

## What the redesign changes on a phone

1. The first question, its answer choices and the reply box are on the first screen. One line above the chat says what the answers become.
2. One reply box. A tapped answer, including "I'm not sure yet. Keep it open.", goes into the reply box. The person can change the words and then presses Send. After Send, the answer shows as a chat bubble with "Preparing your next question…" (or "Updating your brief…" after the last topic).
3. The answer card always asks the question the AI just asked. "I'm not sure" keeps that topic open and the chat moves on. No earlier answer reopens.
4. Questions lists, in order: Answer now, Still to decide (each with Answer), Later, then Answered.
5. Your brief edits in place, with the current answer filled in, Save and Cancel.
6. Your files: "Attach a sample rota (optional)" in the first AI message and a paperclip beside the reply box. The sample-data advice sits above Choose a file.
7. An Account button in the header opens the name, email, organisation and Sign out.
8. Every control is at least 44 px high.
9. Review, finish and publish are one flow with the chat, so the review shows the chat's answers. After finishing, the status screen offers Find a volunteer, then says what happens next. Reopening the brief keeps the saved or published status, with Back to project status.

## Persona retests on the canvas

The canvas was served locally with the canvas player, and each persona drove it with Playwright at 390 by 844 and read its own screenshots.

| Round | Looks (Maya, Sam, Lee) | Clarity | What it found | Changed after |
| --- | --- | --- | --- | --- |
| 1 | 8, 8, 7 | 7, 7, 6 | Review opened a separate sample, not the chat's answers; Find a volunteer did nothing; "I'm not sure" sent at once; the reply box clipped long text; some controls under 44 px | Chat, review and finish joined into one board; publish step added; "I'm not sure" goes into the reply box; reply box grows; 44 px controls |
| 2 | 8, 8, 7 | 7, 7, 7 | Opened scrolled past the introduction; Undo after a later edit erased it; acknowledgments stayed ticked after the open questions changed; the reopened brief lost its status; the jump to open questions hid its heading | All five fixed in version 9 |

Reports and screenshots: the project files folder `phone-ui-persona-review/canvas-retests/`.

## Rulings

### 2026-11-18: the three earlier rulings on a phone

The bottom row of the canvas kept three earlier rulings so they could be compared. In both retest rounds all three personas preferred the proposed version of each. The founder chose "Proposed for all three" on the question "Which version of the three earlier Discovery rulings should we keep?".

1. Finish Discovery is no longer the primary button from the start. The header shows a secondary Review button, which becomes primary when every topic is answered or kept open. MARKED: changes the contract.
2. On a phone, the full usage card with its bar no longer sits above the message box. One line shows the free replies left and "no charge" when no fuel is used, with a Reply limits link that opens the details. MARKED: changes the contract and AT-004.72.
3. On the review page the brief comes first. A line at the top says how many questions are still open and jumps to them. Open questions carry an amber "Still to decide" label instead of a red one. MARKED: changes the contract and AT-004.62.

### 2026-11-18: usage text and "I'm not sure"

After looking at the running preview, the founder wrote: "The progress bar of the budget takes way too much space and its location above the answer box is way not intuitive. It doesn’t feel
Like a chat with an AI". Asked whether to apply the phone usage line to desktop too and to show it only near the limit, the founder answered "Yes that’s a start".

4. On phone and desktop, no usage card sits above the message box. A short line shows only when 3 or fewer free replies are left, when none are left, or in paid mode. Reply limits is always in the Account menu. The canvas now starts the chat at 5 free replies left so the line shows after two answers. MARKED: changes AT-004.46, AT-004.72 and AT-004.77.

The founder also wrote: "I am not sure doesn’t count towards free credit".

5. Sending "I'm not sure" uses no free reply and no fuel. The sent message reads "Kept open · no charge". MARKED: changes the metering rule; new AT-004.80.

On the third open point, the founder answered "Go with your recommendation for 3".

6. Find a volunteer no longer publishes in one tap. It shows "What volunteers will see" with every section and the open questions marked "Still to decide", then Publish brief or Not yet. Publish brief still publishes at once. MARKED: changes the contract's one-tap rule and AT-004.78.

On the last open point, two personas had published an empty brief. The founder wrote: "I agree about key topics but how do you set all these prose into a system prompt of the llm in use?"

7. Finish needs agreed answers to three key topics: Main priority, Information handled and Maintenance owner ("Who looks after the tool" and "Volunteer details kept" on the canvas). "I'm not sure" does not settle a key topic. The review marks the missing ones "Needed to finish". The gate is enforced in the finish edge function, and the key flag is set in code, never by the AI. MARKED: changes REQ-004 Discovery completion and AT-004.62; new AT-004.81.

## Leftover

Small leftover: the "I'm not sure" row of the first question starts just below the first screen.

## Not done here

- The desktop boards. This redesign covers the phone only, and the three rulings apply on a phone.
- PRD text: the three rulings change how the screen shows things, not what REQ-004 requires, so the PRD is unchanged.
- Paid mode on a phone. The contract section describes the usage line and the Reply limits panel in paid mode, but the canvas draws only free mode.
- Screen build and screen wiring.
