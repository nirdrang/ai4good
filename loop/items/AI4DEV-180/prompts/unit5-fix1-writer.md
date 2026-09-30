# Writer brief: unit 5, fix round 1, of the Discovery screen on fixtures

You are the writer for one fix round. Work only in your working directory, a git worktree on
branch `lane/ai4dev-180/unit5-fix1`. It holds units 1 to 4, committed. Commit your work with
messages that end with `(AI4DEV-180)`; one commit per numbered fix is good. Do not push. Do not
launch other agents. Do not touch any other folder. Do not stop or start any process you did not
start yourself.

**Stop rule.** If an environment problem (a hang, a tool that will not start, a sandbox refusal)
blocks you for 15 minutes, stop. Commit what works, and report the exact command, its output, and
what you tried.

## Input

An explorer (Codex) drove the fixture shell as the NGO person and reported eleven issues. The lead
checked them and accepts all eleven. The report and its screenshots are in
`loop/items/AI4DEV-180/evidence/unit5/round1/report.md`. Read it first; it cites the board and
contract lines for each issue. The contract is `loop/items/AI4DEV-180/design.md`, the boards are
`design/astra/canvas-rev12/*.dc.html`, and the written contract is
`design/discovery-ui-contract.md`. Settled, do not change: the desktop file chat fills the right
column; there is no "Use a sample file" button.

## Fixes (numbers follow the report)

1. **The interview goes on.** The fixture world scripts every round until all six topics have an
   answer or are marked not sure. After each send, the next reply asks the next unresolved topics
   (the rounds after round 1 may reuse the topics, options and suggestions already in
   `fixture-data.ts`). The percent and agreed count move with each round. When no topic is left
   open, the reply says so and points to Finish Discovery.
2. **Answer in the chat opens any open topic.** From the review page, Answer in the chat returns to
   the chat and shows that topic's question with its options, asked at no cost if it was not asked
   yet, and focuses its first option. This holds for a topic that was never asked.
3. **The desktop file chat gets room to read.** While the file chat is open on desktop, the files
   card and the usage card may compress or collapse, but the file chat messages get most of the
   column height. The newest message scrolls into view when it arrives, including the paused
   question. The file chat answer box and its chips stay visible.
4. **The phone top area is compact** (design.md section 7, Phone.dc.html lines 22 to 36). One
   compact progress row (percent, agreed count, Finish Discovery on one line where it fits), then
   the two equal buttons "Open your live brief" and "Questions · k answered · n open". Remove the
   separate brief heading line and the separate count line on the phone. The chat must get at least
   450 px of height at 390x844 and at least 250 px at 320x700. Add these two measurements to the
   AT-004.73 body at phone, as the chat log's height.
5. **The phone Add a file header.** Back to chat on the left, the title on one line, and Cancel
   adding this file moved out of the header, to the bottom of the dialog as a full-width button. At
   320 px nothing overlaps.
6. **The file progress bar colour.** While reading: a steady "working" colour. While paused on a
   question: `--usage-warn`. When ready: `--usage-ok`. If the theme has no suitable token for
   "working", add one pair (`--progress-reading` for light and dark) to `src/styles.css` beside the
   usage tokens. No hex colours in components.
7. **Review section headings in capitals**, as on the Finish board line 18. Use a CSS text
   transform; the text in the DOM and the accessible names stay in sentence case.
8. **A fresh chat opens at the first reply.** On load, when the transcript holds only the first
   reply (or the newest assistant message is taller than the view), scroll so that the newest
   assistant message's top is in view, not the bottom of the log. Later new messages keep the
   current follow behaviour.
9. **View highlights the answer.** View scrolls to the answer, gives it a visible highlight (a
   background and an outline from the theme tokens) for two seconds, and sets
   `aria-current="true"` for that time. Check both themes.
10. **Focus.** When the live brief, the Questions dialog, Add a file, or the file chat closes, focus
    returns to the control that opened it. Edit on the review page focuses its text field. Edit in
    the live brief focuses the reopened question's first option.
11. **Find a volunteer.** It navigates to the shell's existing next screen (read `App.tsx`: the
    route after Discovery review, "Volunteer match", or the publication review screen that the
    contract line 37 names, whichever the shell has). It must never be a dead button.

## Tests

Add assertions to the existing bodies where they fit, without new ids: 4 (chat height, above),
9 (highlight present after View), 10 (focus returns to the opener after the brief closes, at
desktop and phone), 1 (after the first-reply send, a new question appears and the percent rises).
Keep every current assertion green. Do not loosen an assertion to pass.

## Checks (all must pass; run them yourself)

1. `bun run typecheck` exits 0.
2. `bun run at:selftest` exits 0.
3. `bun run at:check req-004` exits 0.
4. `bun run at:verify req-004 --tier loop --expect` exits 0, 44 green and matching.
5. Viewport screenshots under `loop/items/AI4DEV-180/evidence/unit5/fix1/`: one per fix that
   changes what a person sees (1, 3, 4, 5, 6, 7, 8, 9), light, plus 4 and 6 in dark. Stop any server
   you started.

## Your final response

The commits (hash and subject), each check with its exit code and counts, and any fix you could not
make and why.
