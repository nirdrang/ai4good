# Create organization and home: review record

Requirement: REQ-002 (with REQ-001 for sign-up and the admin role, and REQ-003 for the project cards). Screen: the organisation profile page after sign-up, its edit form, and Your projects, the NGO home, on a phone (390 by 844) and on desktop (1280 by 900).
Canvas: https://claude.ai/artifact/G9FSxzJchMr81p7Xf2NXux, version 15.
Copy for screen build: `design/canvas/org-home/project/` (all boards and `canvas.json`). The canvas player (`support.js`) is not committed.

## How this design was made

On 2026-11-27 the founder answered "Yes" to the coordinator's proposal to start the create organisation screen and the home page with project cards. In that proposal the design lead makes the product calls, has external-model personas review the screens, and lists the calls for the founder. So every product call below waits for the founder's review on the pull request, and the persona reviews took the place of the founder's walkthrough.

## Boards

- `Main.dc.html`: the whole flow in one component, with props `device` (`phone` or `desktop`) and `start` (`setup`, `home` or `edit`).
- `Main` (phone row) and `Desktop`: the profile page right after sign-up, then Your projects with no project.
- `PhoneHome` / `DesktopHome`: Your projects for a returning admin with four projects, one at each pilot stage.
- `PhoneEdit` / `DesktopEdit`: the edit form with the saved profile.

Sample: Dana Okonkwo, admin of Harbor Community Kitchen, United Kingdom, harborkitchen.org.uk. The pilot NGO is one account, the admin. Projects: Volunteer scheduling (Discovery chat in progress, three questions waiting), Food donation log (draft), Weekly meal counts report (brief ready for review), Client case notes (not a fit). The intake form, the Discovery chat, the brief and the public list have their own canvases; here their buttons open a placeholder.

## What the screen does

1. Sign-up (the sign-in canvas) creates the account and the organisation with its name. Until the mission and the country are saved, a sign-in opens "Finish your organisation profile", with the name filled in and editable; after that, every sign-in opens Your projects.
2. The form asks for what the organisation does (required, up to 600 characters, with a counter and an example), the country (required), the country (required, from the full list of countries), the website (optional; `harborkitchen.org.uk` is enough, no `https://`; a path, a query, a port or a non-Latin domain name is accepted) and the logo (optional; PNG, JPEG or WebP up to 2 MB, and the file must open as a picture). Without a logo the organisation's initials show, in any script.
3. A notice says that the name, what the organisation does, the country, the website and the logo show beside every project the NGO posts, and that the admin's own name and email stay private. Desktop shows a live preview of the card beside the form and "What happens next".
4. The name, the mission and the country are marked required. Save checks every field first. An error summary names each problem, takes focus, and links to the field. A refused logo (wrong type or over 2 MB) says why and that it was not added; the logo the admin had, or the initials, stays, and the save goes ahead with a banner that says the chosen logo was not added.
5. While saving, the save button cannot be pressed again. The first save opens Your projects with a banner and an empty list that says what happens next, and "Start your first project".
6. Your projects shows the organisation card (logo or initials, name, country, website, what it does, and the vetting state "Not vetted yet" or "founder-vetted" with one line on what it means), then the projects. Each project card has its stage, one line on what happens next, and one next action. Projects that need the admin come first: the Discovery chat, then the draft, then the brief, then the declined project. A declined project explains why and what to try next in a disclosure.
7. With a draft, "Start a new project" hides and a line under the heading says to post or discard the draft first. Discard asks first (the intake design's confirmation).
8. Going back from a project, a public card or the public list returns to the same scroll position with focus on the button that was pressed.
9. Edit profile (on the organisation card or in the Account dialog) opens the form with the saved values. Save returns to the screen the admin came from, Your projects or another screen, with "Profile changes saved." Cancel or Back after a change asks "Discard your changes?" with focus on Keep editing, which returns focus to the button that was pressed; the save button hides until the admin answers. With unsaved changes, the Account dialog says that signing out drops them, its buttons read "Discard changes and sign out" and "Keep editing", and focus starts on Keep editing. Without a change, cancel leaves at once.
10. There is no member view: the founder ruled on 2026-11-28, "Members can wait post pilot", so the pilot NGO is a single admin account. The member boards and acceptance test AT-002.38 were removed after round 9 and the adversarial review, which had covered them.
11. Account opens a dialog with the person's name, email, organisation, role, Sign out and Close. Focus moves into it, Tab stays inside (also after a click on its text), Escape closes it. Signed out, the page shows no organisation name and offers Sign in.
12. Every control is at least 44 px high, and nothing scrolls sideways at 390 px, even with a 120-character name.

## Persona reviews

Each persona drove the canvas boards, served locally with the canvas player, with Playwright in a real headless Chromium, and judged its own screenshots. Reports and screenshots: `/mnt/project-files/org-home-persona-review/round-N/<persona>/` in the project files.

- Maya: a volunteer coordinator at a community kitchen, not technical, on a phone. Codex, GPT-6.2 Sol, high effort.
- Omar: director of a small refugee legal-aid charity, careful about privacy, on a laptop. Gemini 4 Neon through the Antigravity CLI.
- Lee: a product designer who checks keyboard use and accessibility, on both sizes. Codex, GPT-6.2 Sol, high effort.

| Round | Looks (Maya, Omar, Lee) | Clarity | Sure what happens next (Maya in round 6: the mean of her four project scores) | Does not work (Maya, Omar, Lee) | Changed after |
| --- | --- | --- | --- | --- | --- |
| 1 | 7, 8, 8 | 5, 6, 5 | 6, 7, 7 | 5, 7, 9 | Typed values in the mission, country and website fields were lost (a board defect); members no longer see drafts; `www.bridgelegal` is not a web address; no organisation name when signed out; no initials for an empty name; Back returns to the same scroll position and button |
| 2 | 8, 8, 8 | 7, 7, 7 | 7, 7, 7 | 2, 0, 3 | A rejected logo blocks the save and is named in the summary, with a way to go on without it; visible focus on headings, the error summary and the logo button; Back from the public list focuses Public projects; the declined disclosure stays open on return |
| 3 | 7, 8, 8 | 6, 7, 7 | 6, 6, 7 | 2, 1, 7 | "Use initials instead"; focus returns to the exact button pressed (open, public card, start); the discard confirmation closes when focus leaves it; the save button stays focusable while saving; fields scroll into view with a margin |
| 4 | 8, 8, 8 | 7, 7, 7 | 7, 6, 7 | 2, 0, 1 | The Account dialog says the admin is already on the profile page instead of showing a greyed-out button; focus after a public card opened from Your projects (reached through the header) returns to that card; project titles are level-two headings; a line under the heading explains why Start a new project is hidden while a draft exists |
| 5 | 8, 8, 8 | 7, 6, 7 | 7, 7, 7 | 3, 2, 3 | A refused logo no longer stops the save: the logo the admin had, or the initials, stays, and the banner says the chosen logo was not added (Maya expected to go on, and Lee found the old message pointed at the wrong button); the name, mission and country are marked required; the logo button names its state for screen readers and announces "Logo added"; the save button hides while "Discard your changes?" is open; Sign out warns about unsaved changes and drops them; an old "Draft discarded" line clears when the admin leaves the page |
| 6 | 7, 8, 7 | 6, 7, 7 | 7, 7, 8 | 2, 0, 2 | Moving to a field from the error summary, or showing a logo error, scrolled the whole board and hid the header; now only the page body scrolls. Maya's other point, that the email link to the admin opened nothing, is the test browser having no email app |
| 7 | 8, 8, 8 | 7, 7, 7 | 7, 7, 7 | 2, 0, 2 | The past Discovery chat and the brief placeholders say who reads them and that the declined chat takes no new answers; Keep editing after the header Back returns to the place in the form where the admin was |
| 8 | 8, 8, 8 | 7, 7, 7 | 7, 7, 7 | 1, 0, 2 | The country list is the full list of countries (Lee could not choose Belgium from the short sample); with unsaved changes the Account dialog opens on Close, and Sign out names the warning for screen readers. Maya's one point was again the email link in a browser with no email app |
| 9 | 8, –, 8 | 7, –, 7 | 7, –, 8 | 2, –, 2 | Sign out with unsaved changes now reads "Discard changes and sign out" beside "Keep editing"; opening the decline reason near the bottom of the screen scrolls it into view; Your projects in the header, pressed on Your projects, goes back to the top. Omar did not run: the Gemini account's quota was used up |

## Adversarial review before the pull request

Three reviewers tried to break the change at version 11, each in its own worktree, proving each finding with a Playwright or shell run: Codex GPT-6.2 Sol (high) and Claude Opus completed. Gemini 4 Neon through the Antigravity CLI dropped out twice: the first run hung on a local web server it started in the foreground, and the second stopped on the account's usage quota.

Verified, and fixed in versions 12 and 13:

- A 120-character name made the phone page scroll sideways and pushed Account off the desktop header.
- A file named `.png` that was not a picture replaced a working logo with a broken image.
- An edit opened from the Account dialog on another screen returned to Your projects instead of that screen.
- Sign in after sign out reopened the screen the person left (even the edit form with its old values) instead of Your projects, or the profile page while the profile is not finished.
- Website addresses with a query, a port or a non-Latin domain name were refused.
- Organisation names in non-Latin scripts got blank initials.
- After a click on the Account dialog's text, Escape did nothing and Shift+Tab left the dialog.
- The vetting label read "Founder-vetted"; AT-002.23 requires exactly "founder-vetted".
- A line with trailing spaces failed `git diff --check`.
- Acceptance texts named a card preview on the phone (it is desktop only) and an organisation card that shows the mission on the phone (it sits in the `org-details` disclosure); both now match the boards.

Not changed:

- Shift+Tab out of "Discard your changes?" closes the question and brings Save back. Leaving the question is an answer of "keep editing", so this stays.
- d108 builds on d107 (sign-up names the organisation), which is in the sign-in design pull request, not yet merged. This pull request should merge after it; both append to `loop/state/decisions.jsonl` and `design/ui-ux-instructions.md`.
- Members against the single-seat rule: the founder answered it (see Boards and What the screen does, point 10).

## Lead calls (under the founder's delegation, for review)

1. Sign-up names the organisation, and this page only finishes the profile. Reason: the sign-up finish step already asks for the name with the signer's authority (d107), so asking again would repeat it.
2. The mission and the country are required; the website and the logo are optional. Reason: many small charities have only a Facebook page or no logo, and the mission is what volunteers and Discovery read. Screen wiring relaxes `set-organization-profile`, which today requires all five.
3. Limits: name 120 characters, mission 600, logo PNG, JPEG or WebP up to 2 MB; initials stand in for a missing logo.
4. The profile shows beside each project the NGO posts; the admin's own name and email stay private. This makes the profile public where it was not defined before, so AT-002.23 now covers it as part of the project surfaces.
5. Your projects is the NGO home after every later sign-in, with the organisation card on top and the projects that need the admin first.
6. The vetting state shows to the admin as "Not vetted yet" or "founder-vetted", with one line: vetting is a short call with the ai4good team, and Discovery works before it.
7. (Withdrawn) A member view: the founder ruled that members wait until after the pilot.
8. A declined project keeps its card on Your projects with the reason and what to try next.

Calls 1 to 5 went into the REQ-002 text (decision d108), with the single-seat ruling. The rest stay on the boards.

## Persona suggestions not taken

- Put the waiting project above the organisation card on phones: the card is short once filled, and the order of projects already puts the waiting one first. Screen build may revisit this with the real card height.
- Rename "founder-vetted" to "Vetted by ai4good": the PRD fixes the label (AT-002.23).
- Define Discovery, the AI training policy and pilot pricing on the profile page: the intake form and the Discovery chat explain them where they apply; a training policy is not this screen's matter.
- A "Browse public projects" link on phones: the phone header has no navigation row; screen build decides where the public list sits in the phone shell.
- Say whether a declined project's public card stays public: the PRD does not define it yet (see Known gaps).
- Move the unsaved-changes question into a box over the field being edited, and shorten the phone help texts behind "See an example": hints for screen build.
- A sticky card preview and a top Back link on the desktop edit form: hints for screen build.

## Known gaps

- What happens to the public intake card of a project Discovery declined is not defined: it belongs to the project lifecycle requirement (REQ-005.5), which is parked.
- The edge function that returns the caller's own organisations is a screen wiring task (it is in the wiring item's text).
- The intake canvas still has its member boards; its member test AT-003.26 is retired in this pull request under the same ruling, and screen build of the intake screen skips the member notice.
- The founder has not seen the boards. Screen status is `ready-for-founder-review` in `design/astra/screens.json` (the "My projects" screen).
