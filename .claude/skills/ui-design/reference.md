# UI design: rulings, rules, and reasons

`SKILL.md` holds the steps. This file holds why each step exists, the canvas tool facts, and the founder's rulings.

## The founder's rulings

The three stages of a screen, 2026-09-30 (screen design, screen build, screen wiring):

> 1- design a screen with an agent operating the canvas to find out i=f the ui elents work like expected
> 2- code the screen using fixtures with agent operating the ui and a loop for fixes
> 3- write the backend for the screen and wire

The steps of screen design, 2026-10-01:

> 1- current prd doc and create the first screens
> 2- user interaction to approve or change using interactive chat
> 3- every chat and update needs to verify if it changes prd and change it if needed
> 4- ask the user to run the codex agent as a role in the screen and try to operate all interactions and give review of what works or not but also offer usability hints
> 5- you change the ui according to these critiques until
> All is ok
> 6- any ui changes that requires updates to prd u do it
> 7- user and you should interact if the screen is complete so it can complete the design screen. Once design is complete you should craft the acceptance test for later coding stages. It should be clear that we have acceptance test and codex as a user try to operate the ui as part of building the code this is not quite the same

Later the same day, on points 3 and 6:

> The prd update should be saved for last not on each iteration and only for contract and big changes or additions. Note that the design screens from the canvas are the input screens for the next coming phases of coding so details are there.

On the first screens, 2026-10-01: "the first /design with what we have in the prd for both screen sizes is one of the skills first and important steps".

Other choices, from options the design session gave:
- A screen is designed on a Claude Design canvas only, not in `design/astra/` (2026-09-30).
- pstack writes the screen code, and Lovable does not build screens (2026-09-30).
- poteto-mode does not run screen design (2026-10-01).
- The Codex review runs on GPT-6.1 Sol: at `xhigh` from 2026-09-30, at `high` from 2026-10-01.

## Rules for each step

**Step 1, the first screens.**
- Both sizes, because screen build codes both, and a phone board that is only drawn hides its defects until code.
- Every control works in Play. The founder reviews behavior, not a picture, and Codex can review only what works.
- One sample project with realistic data. Screen build turns the same data into the real screen's sample data.
- Each control carries a `data-testid` (section 5.1 of `design/ui-ux-instructions.md`, ratified 2026-07-24). The acceptance tests bind to the handles.

**Step 2, the founder's changes.**
- Design talk stays in the session chat, not in comment threads (founder, 2026-09-27).
- When the founder selects an element, the session sees its id, for example `Interview.dc.html#152:...`. Use the id to find the exact element.
- A question with a vague option gets a vague answer. Put a concrete example in each option. If the founder says an option is not clear, ask again with examples.
- Quote the founder exactly in the records, with the date in the founder's local time (UTC+3).

**Step 6, the PRD.** The boards carry the details and are the input to screen build, so the PRD gets only contract changes and big changes or additions. The pure sections can be older than the assembled PRD: earlier edits once went into the assembled PRD only, and an assembly would have removed them. That is why the `-Check` run comes first.

**Step 7, the acceptance tests.** Write them once, when the design is complete. New ids are pending stubs, so CI stays green and screen build has a red target.

**Step 8, the copy in git.** Two design places drift apart: Discovery revisions 1 to 11 were in the Astra mock and revision 12 only on the canvas, and they no longer matched. The copy in `design/canvas/<screen>/project/` is the one design that screen build uses.

## What the Discovery design taught

Discovery was the first screen designed on a canvas: 26 rounds, 2026-09-27 to 2026-09-29.
- No agent operated the canvas. The only checks were script runs of each board's logic, and the founder found the gaps in Play, for example "where can i i actually upload the file". This is why the Codex review exists.
- Most rulings changed a requirement, and decision d94 moved the technical scope out of Discovery. The PRD changed in one batch at the end.
- The approved canvas lost the test handles that earlier Discovery designs had.
- The design item and the approval item were on different branches, so the merge could not close the approval item. Each stage has its own branch and item.
- The founder approved desktop first, and the phone moved to screen build cleanly.

## Canvas tool facts

- **New canvas.** The Artifact quickstart for a design names the Design type. Create the canvas from that type with a title and no files. The result carries the type's instructions. `/design` does the same, so a `/design` run always makes a new canvas and never edits an existing one.
- **Publish.** The Artifact tool publishes a canvas with `root` and `file_path`. A publish with only `files` and `root` is refused. A file deleted on the canvas side needs `overwrite_unread` to replace it.
- **Board logic.** Several `setState` calls in one handler can overwrite each other. Put each step's changes in one `setState`.
- **Shared state.** Each board keeps its own state. A change on one board does not reach another board.
- **Test handles.** The canvas player keeps `data-testid` and `data-testkey`, also when a repeated item takes its key from data (checked 2026-09-30).
- **Line endings.** Many repository files use CRLF. A text replacement that assumes LF does nothing and reports no error. Check the result.
- **The Claude Design connector.** If it reports an authentication error, run `/design-login`. The canvas work uses the Artifact tool and does not need the connector.
