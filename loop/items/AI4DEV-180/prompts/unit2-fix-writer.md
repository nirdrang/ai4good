# Writer brief: unit 2 fix round (Discovery screen on fixtures)

You are the writer for one fix round. Work only in your working directory, a git worktree on branch
`lane/ai4dev-180/unit2`. It already holds unit 2 as commit 2af0152. Add new commits on top; do not
amend or rebase. Commit messages end with `(AI4DEV-180)`. Do not push. Do not launch other agents.
Do not touch any other folder. Do not stop or start any process you did not start yourself; a
preview on another port belongs to another worktree.

**Stop rule.** If an environment problem (a hang, a tool that will not start, a sandbox refusal)
blocks you for 15 minutes, stop. Commit what works, and report the exact command, its output, and
what you tried.

## Why this round

The lead reviewed the unit 2 screenshots against the approved boards. The checks pass, but the
layout is not the approved layout. Both boards are fixed app frames, not a scrolling document:

- `design/astra/canvas-rev12/Interview.dc.html` line 22: the frame is the viewport height with
  `overflow: hidden`. Line 45: the chat (`#chat-scroll`) scrolls inside the frame, and the message
  box sits under it, always in view. Line 153: the Questions card scrolls inside the right column.
  Line 238: the usage card is `flex-shrink: 0` at the bottom of the right column, always in view.
- `design/astra/canvas-rev12/Phone.dc.html` line 18: the frame is the viewport height. Lines 50 to
  65: the usage card (`margin-top: auto`) and the message box sit at the bottom of the frame, always
  in view. The progress strip is at the top, always in view (design.md section 7: "sticky progress
  strip").

## Fixes

1. **App frame.** The Discovery screen fills the height that the shell leaves below its header,
   and the page itself does not scroll while Discovery is open. Inside it:
   - Desktop: the progress strip at the top; the chat column scrolls on its own, with the message
     box pinned under it; the right column holds the brief card, the Questions card (scrolls on its
     own), the files card, and the usage card pinned at the bottom.
   - Phone: the progress strip and the two buttons at the top; the chat scrolls on its own; the
     usage card and the message box pinned at the bottom, the usage card directly above the
     message box.
   - The shell footer must not push the frame. If the shell layout needs a change for this, change
     only the Discovery route's container in `design/astra`.
2. **Usage card order, as on both boards.** Headline, then the bar, then the values line (Free
   today, Beta, Fuel), then the footer with the reset. Undo the reorder that put the values above
   the bar. The rule that the bar must be the last row came from a wrong line in the lead's brief;
   the board wins.
3. **Placeholders, as on the boards.** Desktop message box: "Add a note to your answers
   (optional)". Phone message box: "Reply to ai4good AI". If the placeholder makes the empty box
   taller than one line, fix the box (width, `min-width: 0`, the growth rule), not the copy.
4. **Test changes in `tests/at/suites/req-004/j-need-brief.test.ts`, same commit as the code.**
   - Replace the two bar-position asserts (lines 245 to 248) with: on the phone, the usage card's
     bottom is at or above the message box top, and the gap is at most 16 px.
   - Add, at desktop and phone: with the page at its initial scroll, the message box, Send, the
     usage card, and Finish Discovery are all fully inside the viewport. Then scroll the chat to its
     top (a driver op that scrolls an element, if the host has none: add `scroll` to
     `screen-host.mjs` and `screen.ts`, the same shape as the other ops) and check the same four
     are still fully inside the viewport. This is the check that the frame is pinned.
   - Keep the one-line check, but take its bound from the rendered line: the empty box is less
     than two line-heights tall plus its vertical padding and border, read from computed style
     through an `attribute`-style op if needed. No magic 48.
   - Run all of this in light and dark, and at 320 pixels wide as before.
5. **Evidence.** Replace the four screenshots in `loop/items/AI4DEV-180/evidence/unit2/` with
   viewport screenshots (not full-page), at 1280x900 and 390x844, light and dark. Add one phone
   screenshot with the chat scrolled to the top.

## Checks (all must pass; run them yourself)

1. `bun run typecheck` exits 0.
2. `bun run at:selftest` exits 0.
3. `bun run at:check req-004` exits 0.
4. `bun run at:verify req-004 --tier loop --expect` exits 0, with .61, .65, .71, .72, .73 green.

## Your final response

The commits (hash and subject), each check with its exit code and counts, and anything in the
boards you could not follow and why.
