# Writer brief: unit 5, fix round 2, of the Discovery screen on fixtures

Follow `loop/items/AI4DEV-180/prompts/unit5-fix1-writer.md` for the rules, the stop rule, the
settled decisions, the test rules and the checks, with these changes:

- Your working directory is a git worktree on branch `lane/ai4dev-180/unit5-fix2`. It holds fix
  round 1.
- Input: `loop/items/AI4DEV-180/evidence/unit5/round2/report.md`. Round 2 confirmed that round 1's
  eleven fixes hold. The lead accepts the five new issues, 12 to 16.
- Evidence goes under `loop/items/AI4DEV-180/evidence/unit5/fix2/`: one light viewport shot per
  fix that changes what a person sees (12, 13, 14, 16), plus 13 in dark.

## Fixes (numbers follow the report)

12. **Every new round opens at its reply.** When a new assistant reply arrives, scroll so that the
    reply's top is in view, on desktop and phone, the same rule fix 8 applies at load. If the person
    has scrolled up to read, do not move them; show the existing way to jump to the newest message
    if the screen has one, else just leave the position.
13. **Ready means the composer goes.** `design/discovery-ui-contract.md` lines 88 and 89: when all
    required topics are agreed, the AI reply says Discovery is ready for review and stops asking,
    and the screen replaces the composer with a finish invitation whose primary action is Finish
    Discovery. No send is possible from that state, so no model call and no charge. Take the
    invitation copy from the boards if one shows it; otherwise use the contract's words and list the
    sentence in your report as provisional copy. Add to the AT-004.61 body: at the ready state the
    message box and Send are gone, the invitation shows, and the model-call probe count does not
    change.
14. **Single-question mode shows every open question of a round.** With One question at a time on,
    a new round starts at its first open question and Next question steps through all of them; no
    question of the round is skipped. Give the mode a way back ("Show questions together", already
    in `a11y.ts`) and, if the board shows one, a Previous. Add the round-2 case to the AT-004.71
    body.
15. **A free reply uses one daily turn and one beta turn.** The fixture world decrements both free
    counters for each completed free reply, in the main chat and in the file chat. The next reply
    is free only while both have capacity (contract line 119). Add to AT-004.72: after one free
    send, both "Free today" and "Beta" drop by one.
16. **The volunteer match screen sees the confirmed Discovery.** Contract lines 36 to 41: after
    confirmation the process bar marks Volunteer match current and the publication review screen
    shows the confirmed brief. Change only what the shell needs: the existing volunteer match
    screen in `design/astra/src/` reads the Discovery confirmation from the fixture world (through
    the same port or world the Discovery screen uses; no new fixture world), so "Scope not
    confirmed" no longer shows after confirmation and Send for review is enabled. Do not redesign
    that screen.
