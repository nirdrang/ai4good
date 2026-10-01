# Explorer brief: unit 5, round 1, of the Discovery screen on fixtures

You explore a built screen and report issues. You do not fix anything. Work only in your working
directory, a git worktree on branch `lane/ai4dev-180/unit5-explore`. Do not change any file under
`src/`, `design/`, `tests/` or `supabase/`. You may write only under
`loop/items/AI4DEV-180/evidence/unit5/round1/`: your scripts, your screenshots and your report.
Do not commit. Do not push. Do not launch other agents. Do not stop or start any process you did
not start yourself.

**Stop rule.** If an environment problem (a hang, a tool that will not start, a sandbox refusal)
blocks you for 15 minutes, stop, and report the exact command, its output, and what you tried.

## What to explore

The Discovery screen of ai4good, running in the fixture shell `design/astra`. It is the chat where
an NGO agrees six topics of a project brief with an AI, adds files, and finishes Discovery. All
data is fixture data; no backend runs.

- Start the shell: `bun run design:astra -- --port 4320 --strictPort` (if that script does not take
  a port, read `package.json` and `design/astra/vite.config.ts` and start vite on 4320 yourself).
- Scenarios are listed in `design/astra/src/givens.ts` (`SCENARIOS`). Open each with
  `http://localhost:4320/?scenario=<name>&pace=demo#discovery`. The review page is the
  `#discovery-review` route, reached with the Finish Discovery button.
- Drive it with Playwright under **Node, not Bun** (Playwright hangs under Bun on this machine).
  `playwright-core` 1.58.2 is in `node_modules`, and Chromium revision 1208 is already installed
  in `%LOCALAPPDATA%\ms-playwright`. `tests/at/harness/screen-host.mjs` shows a working launch.
- Viewports: 1280x900 desktop and 390x844 phone (use a phone user agent with touch for the
  phone), each in light and dark (`colorScheme`). Also look once at 320x700.

## The approved design

The boards are the visual spec and the approved copy:
`design/astra/canvas-rev12/Interview.dc.html`, `Finish.dc.html`, `Phone.dc.html`. The written
contract is `design/discovery-ui-contract.md` ("Claude revision 12") and
`loop/items/AI4DEV-180/design.md` section 7 (phone designs). Two decisions are settled; do not
report them: the desktop file chat fills the right column instead of the board's floating panel;
there is no "Use a sample file" button.

## What to do

Act like the NGO person. On each viewport and theme: read the first reply; answer questions (pick
options, Write my own, I'm not sure); send; open the Questions card or dialog and use Answer and
View; open the live brief and use Edit; add a file (use a small CSV or XLSX you create under your
evidence folder) and use the file chat; close it during a read and come back; go to the review
page; use Use the suggestion, Answer in the chat, Edit, Cancel, Save; tick the boxes and finish;
read the Discovery document; use Back to the chat.

Look for: text or controls that are clipped, overlap, or leave the screen; things that scroll that
should not, or cannot be reached; a control that does nothing or does the wrong thing; focus that
lands in the wrong place or is lost; copy that differs from the boards; contrast that is too low in
either theme; a phone layout that leaves too little room for the chat; anything a person would find
confusing. Also check these five, already suspected:

1. On the phone, the top area (progress strip, brief heading, two buttons) leaves too little
   height for the chat.
2. On desktop, the file chat panel is cramped: messages cut off, little room to read.
3. The file read progress bar: the board paints it blue while reading and amber while paused on a
   question; the build uses one colour.
4. On the phone, the "Add a file" dialog header wraps its title between two buttons.
5. The review page section headings: the board uses capitals, the build uses sentence case.

## Your report

Write `loop/items/AI4DEV-180/evidence/unit5/round1/report.md` and give the same text as your final
response. One numbered entry per issue:
- severity: blocker (a person cannot finish), major (wrong behaviour or unreadable), or minor
  (polish);
- viewport and theme;
- the steps that show it;
- what you saw, and what the board or contract shows instead (file and line when you can);
- the screenshot file name.

Report only what you saw. If a suspected item is not a problem, say so. Then stop the shell.
