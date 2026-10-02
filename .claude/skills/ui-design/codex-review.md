# The Codex review

Codex plays the screen's user and operates a local copy of the canvas. It reports what works, what does not work, and usability hints. `SKILL.md` steps 3 and 4 run it.

## The model

The founder chose GPT-6.1 Sol at `high` effort on 2026-10-01. The Codex id is `gpt-6.1-sol`. Name the model and the effort in every run, so the run does not depend on the local Codex default.

## Run it

1. Download the boards (`project/*.dc.html`) and the canvas player (`artifact-type/dc-runtime.js`) with the Artifact tool. Copy them into one scratch folder, and save the player there as `support.js`, because each board loads `./support.js`. Do not commit the player.
2. Serve the folder as a background command: `python -m http.server 4390 --bind 127.0.0.1 --directory <folder>`.
3. Write the prompt file from the template below, and run Codex as a background command:

   ```powershell
   Get-Content <prompt file> -Raw | codex exec -m gpt-6.1-sol -c model_reasoning_effort=high --skip-git-repo-check -C <empty folder> -o <report file> -
   ```

4. Stop the server. Its background task then reports exit code 255; that is expected.
5. Save the report as `loop/items/<item>/codex-review/round-<n>.md`.
6. If Codex says it has no browser tool, stop and tell the founder. Do not replace the review with screenshots or with a script run of the board logic.

## The prompt template

```text
You are <the screen's user, from section 2 of design/ui-ux-instructions.md: who you are, what you know, what device you use>.
Stay in this role for the whole review.

Use your browser tool. Open only these addresses:
<one line for each board: the address, the page it shows, and the screen size>
Reload a page to start it again. Do not read or edit files. Do not open any other address.
Act only through the page, the way this person would: click, type, press keys, scroll, and look.
Do not run scripts on the page to change it.

This is a design preview with sample data. The AI replies are scripted, no real file is read,
and every balance, price, and payment is a sample value: no action on these pages can spend real money.
Each page starts from its own sample state. Moving to another page does not carry your changes with you.

First, do what this person comes to the screen to do:
<four to eight numbered tasks from the requirement's user stories, in this person's words>
Then try every interaction on every page: each button, link, field, checkbox, menu, and each way between pages.

Write three lists, in this person's words:
1. Works: each interaction that did what you expected.
2. Does not work: each interaction that did nothing, or something you did not expect, with the page and your steps.
3. Usability hints: what was hard to find, unclear, or slow for you, and what would help.
End with one line: ALL WORKS, or the number of interactions that do not work.
```

Give the user a name, a role, and a worry from the PRD. Write each task as a goal the user has, not as a control to click: "find out how many free replies you have left", not "click the usage card".

## Read the report

- A control that does nothing, or does something wrong, is a defect. Fix it on the canvas.
- A usability hint is a design choice. The founder accepts or declines it.
- A finding about a design the founder ruled on goes to the founder. Do not change a ruled design on the agent's word.
- A finding that a change on one page did not reach another page is the limit of separate boards, not a defect.

## What Codex can and cannot do

- **Why a local copy.** The canvas is a private claude.ai page. Codex cannot sign in there. A local copy needs no sign-in and tests the exact board files.
- **Why Codex starts directly.** A pstack lane starts Codex with plugins switched off, and the browser is a Codex plugin. With the pstack runner's flags, Codex answered "NO BROWSER TOOL" (checked 2026-09-30).
- **How it acts.** The browser plugin drives Chrome through the Codex Chrome extension, in background tabs that close when the run ends. In the style of Playwright, it can open and reload a page, find a control by role, label, text, or `data-testid`, click, type, press keys, select, tick, scroll, read a page snapshot, take a screenshot, and set the window size. It can also run a script in the page; the template forbids that.
- **What it cannot test.** Only what the boards simulate: scripted replies, sample data, and no real backend, model, or file. A reload resets a board. A run with no visible browser is not proved.
- **What it costs.** The first full review, on the three Discovery boards on 2026-10-01, took 28.5 minutes and 188,282 tokens at `high`. It found 18 interactions that did not work, 10 of them on a phone board that was never made interactive.
- **Sample money.** In that review, Codex's own safety check stopped a send at zero free replies, because it might spend paid fuel. The template's sample-money line prevents that.
- **The PowerShell shim.** Send the prompt on standard input. The Codex shim breaks a prompt passed as an argument. `-C <empty folder>` keeps Codex out of the repository, and `-o <file>` saves its final message.
