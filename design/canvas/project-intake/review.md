# Project intake: review record

Requirement: REQ-003 (with REQ-001 for the admin role). Screen: Your projects, the intake form, the public card preview, posting into the Discovery chat, and the public project list, on a phone (390 by 844) and on desktop (1280 by 900).
Canvas: https://claude.ai/artifact/Lk9F7cGxK1X8yo17UgyxL1, version 13.
Copy for screen build: `design/canvas/project-intake/project/` (all boards and `canvas.json`). The canvas player (`support.js`) is not committed.

## How this design was made

On 2026-11-27 the founder asked: "Can you run the intake design without my intervention? You should instruct thread that create it to utilize external models for persons review of the screens for intake". A few minutes later: "Also\nBuild intake for desktop".

So this item ran the ui-design skill without the founder's step-by-step answers. Every product call below was made by the design lead under that delegation, and each one waits for the founder's review on the pull request. The external-model persona reviews took the place of the founder's walkthrough at steps 2 to 4 of the skill.

## Boards

- `Main.dc.html`: the whole flow in one component, with props `device` (`phone` or `desktop`), `start` (`home`, `filled`, `review` or `list`) and `role` (`admin` or `member`).
- `Desktop.dc.html` and the phone row's `Main` board: Your projects, then the whole flow.
- `PhoneFilled` / `DesktopFilled`: the form with a sample filled in.
- `PhoneReview` / `DesktopReview`: the flow started at "Preview your public card".
- `PhoneCard` / `DesktopCard`: the public project list after posting.
- `PhoneMember` / `DesktopMember`: Your projects for a member without the admin role.

Sample: Dana Okonkwo, admin of Harbor Community Kitchen, posts "Volunteer scheduling".

## What the screen does

1. Your projects lists the organisation's projects and its one draft. With no project, it says what happens: a public card first, then a free, private chat with the AI.
2. Start a new project opens the form: title (up to 80 characters), the problem (up to 2,000; both counted as a person sees them, so an emoji is one), and urgency (Urgent, Soon, No fixed date). No file control (d101). A line says that a sample can be shared later in the private chat, blank or with made-up entries.
3. The draft saves itself as the admin types ("Saving…", then "Draft saved · private to your admins"). There is no save button. A form with an empty title and description leaves no draft, even with an urgency chosen. One draft at a time: Start a new project hides while a draft exists, and Discard draft asks first.
4. An amber notice above the fields says the title, description and urgency become public with the organisation's name. "What stays private" (a disclosure on the phone, a side card on desktop) says the account, the chat, the files and the unpublished brief stay with the organisation's admins and the ai4good team.
5. While the admin types, each field checks its text. An email address, a phone number or a street address shows a red hint. A likely person's name or a common health word shows an amber hint. Times, number ranges, year ranges, dates and plain 7 to 9 digit numbers are not phone numbers; dotted phone numbers are. A street address is a house number, up to three words and a street word (Street, Road, Lane, Grove, Crescent and others), in any case; its words are not a name.
6. Preview the public card checks the three answers first and moves focus to the first problem. Then it shows the exact card, marked "Not posted yet".
7. Contact details block posting: a red box says what was found, the confirmation and Post are disabled, and "Edit the description" goes straight to the field. A name or health word only warns, because names of places and organisations look the same; the warning says to remove it if it identifies someone, otherwise the admin can post.
8. The admin ticks "The title and description hold no names, contact details, health details or other personal details of the people we help." Post without the tick shows an error and posts nothing. While posting, every way to change the text, the Account menu and the navigation are disabled.
9. Posting opens the Discovery chat with a banner and a link to the card on the public list, and the AI's first question. Reopening the chat later keeps a "View your public card" link, which goes to that project's card.
10. A member without the admin role sees who the admin is, with the admin's email, and no start button.
11. Account opens a dialog with the person's name, email, organisation, role and Sign out. Focus moves into it, Tab stays inside, Escape closes it.
12. Signed out, the public list still opens, and Sign in in the header returns to sign in.
13. Every control is at least 44 px high, and nothing scrolls sideways at 390 px.

## Persona reviews

Each persona drove the canvas boards, served locally with the canvas player, with Playwright in a real headless Chromium, and judged its own screenshots. Reports and screenshots: `/mnt/project-files/intake-persona-review/round-N/<persona>/` in the project files.

- Rosa: a volunteer coordinator at a food bank, not technical, on a phone. Codex, GPT-6.2 Sol, high effort.
- Daniel: operations manager at a refugee legal-aid charity, careful about privacy, on a laptop. Gemini 4 Neon through the Antigravity CLI.
- Lee: a product designer who checks keyboard use and accessibility, on both sizes. Codex, GPT-6.2 Sol, high effort.

| Round | Looks (Rosa, Daniel, Lee) | Clarity | Safe about what is public | Does not work (Rosa, Daniel, Lee) | Changed after |
| --- | --- | --- | --- | --- | --- |
| 1 | 3, 6, 5 | 5, 6, 6 | 4, 5, 5 | 10, 7, 11 | Viewport meta on every board (the phone board had shown as a squeezed desktop page); 44 px controls; error summary and focus on the first problem; one draft at a time with Discard; phone back button; contact details block posting; "What stays private"; card preview checks |
| 2 | 8, 8, 8 | 7, 8, 7 | 6, 8, 7 | 3, 1, 8 | Street addresses and full names detected; Public projects works signed out; discard confirmation with focus on Keep; Account locked while posting; focus order on the review; card title as a heading |
| 3 | 8, 8.5, 8 | 8, 8.5, 7 | 7, 9, 4 | 2, 1, 3 | A health-word warning; address words never count as a name; blocked and warning boxes before the card; Edit project details; no edits while posting; Sign in on the signed-out list; Escape closes the discard confirmation; "What stays private" beside the form on desktop |
| 4 | 8, 9.5, 8 | 8, 9.5, 8 | 8, 9.5, 9 | 1, 0, 3 | Times such as 09.00 - 11.30 no longer count as phone numbers; leaving Your projects or signing out cancels a pending discard; limits count characters as people see them (an emoji is one); long titles wrap in the Discovery chat; a resumed chat links to its public card; warnings from both fields are combined; Start a new project is secondary once a project exists; urgency error tied to its group; the description grows as you type |
| 5 | 8, 9.5, 8 | 8, 10, 8 | 9, 9.5, 9 | 1, 0, 2 | View your public card scrolls to that project's card and focuses its title; scrolling a choice into view happens only for keyboard focus, so a tap on a radio near the screen edge selects it |
| 6 | 8, 9.5, 8 | 8, 9.5, 8 | 8, 9.5, 9 | 1, 0, 1 | An over-long description scrolls its length message into view instead of the middle of the text; Back to the Discovery chat sits inside the chat's own card, so the next Tab from the card reaches it |
| 7 | 8, 9, 8 | 8, 9.5, 8 | 8, 9.5, 9 | 1, 0, 2 | Continue the draft returns to the preview when the admin left from there; after a discard, "Draft discarded." shows and focus goes to the Your projects heading; Enter in the title opens the preview. These last three were checked by a Playwright script, not by another persona round |

## Adversarial review before the pull request

Three reviewers tried to break the change: Codex GPT-6.2 Sol (high), Gemini 4 Neon through the Antigravity CLI, and Claude Opus. Each worked in its own worktree and proved each finding with a Playwright or shell run.

Verified and fixed in version 12 (version 13 only simplifies two helpers after the deslop pass):

- Some phone numbers (dotted, such as 06.12.34.56.78) passed, while number ranges, year ranges and dates were blocked as phone numbers.
- Street addresses in lower case, with three words, or with Grove or Crescent passed, and their words were flagged as a name.
- Continue the draft reopened the preview after the admin left from the form through a fix button, and the review boards resumed at the form.
- A chosen urgency kept an otherwise empty draft alive.
- A long unbroken word in a draft title or a warning made the phone page scroll sideways.
- After a click on plain text inside the Account dialog or the discard confirmation, Escape did nothing and Shift+Tab left the dialog.
- A plain 7-digit number, such as a charity number, was blocked as a phone number.
- The preview showed untrimmed spaces that the posted card drops.
- Sign in on the signed-out list skipped the sign-in screen.
- The assembled PRD had lost three Discovery rules from 2026-11-18, because the pure PRD section was older than the assembled file. The pure section now carries them, and the PRD keeps them.
- Two acceptance tests named a control that never shows while posting, and said the card itself says "not posted yet". The wording now matches the boards.

## Lead calls (under the founder's delegation, for review)

1. Contact details (email address, phone number, street address) block posting. A likely name or a health word only warns. Reason: a block on names would stop "Harbor Community Kitchen" and "Willowbank Animal Shelter".
2. The admin sees the exact public card and confirms that it holds no personal details before posting.
3. One draft per organisation at a time, saved automatically; Discard asks first.
4. The private side is named: the organisation's admins and the ai4good team. The brief becomes public only if the admin publishes it at the end (d96 is unchanged).
5. Desktop puts "What happens next" and "What stays private" beside the form.

Calls 1 to 3 went into the REQ-003 text (decision d106). The rest stay on the boards.

## Persona suggestions not taken

- Rename the "Intake" label: it is the product's name for the stage, and the screens now explain it.
- Edit the public card after posting: a later screen covers this.
- A statement about AI training: a policy matter, not this screen.
- A copy button for the admin's email: the email link is enough.
- Remove "Back to the Discovery chat" from the public list: keyboard users need it in the page; the phone header also offers it.
- Detect every possible personal detail: the checks catch contact details, addresses, likely names and common health words; the confirmation box covers the rest.
- Move the file advice off the form, a second Edit button beside the confirmation, and wording about what other staff can see: the form line is short, Edit sits above the card with "confirm below" in the review heading, and the member screen covers staff.

## Known gaps

- Whether intake projects should stay private until a volunteer is matched, which reverses d96, is still open in the simpler MVP plan. This design keeps d96: the card is public on posting.
- The name and health checks on the boards are simple patterns. Screen wiring decides where the real check runs (the edge function that saves the intake must repeat it, because the UI alone can be bypassed).
- The founder has not seen the boards. Screen status is `ready-for-founder-review` in `design/astra/screens.json`.
