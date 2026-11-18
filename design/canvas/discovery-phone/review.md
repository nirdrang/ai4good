# Discovery phone redesign: review record

Requirement: REQ-004. Screen: Discovery on a phone (390 by 844), from sign-in to finish.
Canvas: https://claude.ai/artifact/GiGBRX1xaDYR1UT6JhCP5p, version 10.
Copy for screen build: `design/canvas/discovery-phone/project/` (all boards and `canvas.json`, from version 10). The canvas player (`support.js`) is not committed.

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

## Open for the founder

These come from the persona retests, but each one meets a rule that is already in the contract, so the canvas keeps the rule:

- Sending "I'm not sure" uses a free reply, because the AI replies to it. Two personas expected it to be free.
- Finish is allowed with every topic open (contract: "including at zero topic coverage"). Two personas published an empty brief.
- Find a volunteer publishes in one tap (contract: "This action publishes the project at once"). All three expected a step before publishing, or a label such as "Publish brief".

Small leftover: the "I'm not sure" row of the first question starts just below the first screen.

## Not done here

- The desktop boards. This redesign covers the phone only, and the three rulings apply on a phone.
- PRD text: the three rulings change how the screen shows things, not what REQ-004 requires, so the PRD is unchanged.
- Paid mode on a phone. The contract section describes the usage line and the Reply limits panel in paid mode, but the canvas draws only free mode.
- Screen build and screen wiring.
