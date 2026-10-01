# Writer brief: unit 5, fix round 4, of the Discovery screen on fixtures

Follow `loop/items/AI4DEV-180/prompts/unit5-fix1-writer.md` for the rules, the stop rule, the
settled decisions, the test rules and the checks, with these changes:

- Your working directory is a git worktree on branch `lane/ai4dev-180/unit5-fix4`. It holds fix
  rounds 1 to 3.
- Input: `loop/items/AI4DEV-180/evidence/unit5/round4/report.md`. Round 4 confirmed issues 1 to 18
  fixed. The lead accepts the two new issues, 19 and 20.
- Evidence goes under `loop/items/AI4DEV-180/evidence/unit5/fix4/`: light viewport shots at
  desktop and phone of the chat line after a saved change and after an accepted suggestion, and of
  View highlighting it; one dark shot.
- **Commit early.** Commit each fix as soon as its checks pass, before you take screenshots.

## One cause, one fix

Both issues come from the same gap: a saved change (Save change) and an accepted suggestion (Use
the suggestion) update the brief but leave nothing in the chat. So View has no target (20), and the
code that decides whether a section is editable finds no answer to reopen (19).

- **A saved change and an accepted suggestion each add one line to the chat**, as the person's
  side of the transcript, with no AI reply and no charge. The Finish board uses "you changed: …"
  (`design/astra/canvas-rev12/Finish.dc.html` line 194); reuse its wording, for example "You
  changed Main priority: Fewer unfilled shifts" and "You used the suggestion for Booking rules:
  Weekly shift limit". List these two sentences in your report as provisional copy. The line
  survives a reload (contract line 65) and is part of the fixture world's transcript.
- **View targets the newest answer line for that topic**: the chat line above if it is the newest,
  else the original answer. It scrolls and highlights as fix 9 does.
- **Every answered section is editable** (contract lines 64, 97, 197): on the review page and in the
  live brief, a section answered by an accepted suggestion has Edit, before and after confirmation.
  Its Questions row shows View. Edit reopens the topic's question in the chat with its options and
  Save change, as fixes 17 and 18 do, and a save after confirmation clears the approval.

## Tests

Add to the existing bodies, without new ids: after Use the suggestion on the review page, the
section has Edit, and the live brief section has Edit; after Save change, View on that topic
scrolls to the new chat line and highlights it (the `aria-current` check fix 9 added). Keep every
current assertion green.
