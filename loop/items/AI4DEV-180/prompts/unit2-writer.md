# Writer brief: unit 2 of the Discovery screen on fixtures

You are the writer for one unit. Work only in your working directory, a git worktree on branch
`lane/ai4dev-180/unit2`. It already holds unit 1, committed. Commit your work with messages that end
with `(AI4DEV-180)`. Do not push. Do not launch other agents. Do not touch any other folder.

**Stop rule.** If an environment problem (a hang, a tool that will not start, a sandbox refusal)
blocks you for 15 minutes, stop. Commit what works, and report the exact command, its output, and
what you tried.

## Read first

1. `loop/items/AI4DEV-180/design.md`: the contract. Section 8, unit 2, is your scope. Sections 1, 2,
   4 and 7 describe what you build.
2. `loop/items/AI4DEV-180/arena/candidate-opus-contract.md`, section 7: what each body checks.
   Where `design.md` differs, `design.md` wins.
3. The approved screens: `design/astra/canvas-rev12/Interview.dc.html` (desktop: the progress strip,
   the chat, the brief card and side panel, the Questions card, the usage card) and
   `Phone.dc.html` (the phone chat, the full-screen brief panel, the usage bar above the message
   box). Their labels and text are the approved copy.
4. `design/discovery-ui-contract.md`: "Claude revision 12", "Funding panel", "Gauge behavior",
   "Usability rules", "Application theme".
5. `.taskmaster/docs/acceptance/at-req-004.md`: AT-004.61, .71, .72, .73.
6. Unit 1 as built: `src/components/discovery/`, `design/astra/src/` (fixture files, `givens.ts`),
   `tests/at/harness/screen.ts`, `screen-host.mjs`, `tests/at/suites/req-004/_screen.ts`,
   `j-need-brief.test.ts`.

## Scope of unit 2

1. Components: `ProgressStrip.tsx` (percent, agreed count, Finish Discovery, and the compact
   sticky strip; Finish Discovery calls an `onOpenReview` prop and makes no port call),
   full `Conversation.tsx` (receipts "Free reply · no charge", the "Added to brief" line, the
   highlighted answer with `aria-current="true"` for two seconds), full `QuestionGroup.tsx`
   (options with exactly one marked Suggested, Write my own, I'm not sure, the uncertainty help,
   "Still open from last round" on a carried question, "Changing your earlier answer" on a
   reopened one), `Composer.tsx` (one-line box that grows with the text; Send, or "Send paid
   reply" in paid mode; no usage text beside Send), `QuestionsCard.tsx` (desktop card and phone
   dialog; states Answered, Not sure, Open, Ready to send, Coming next; Answer focuses the question
   in the chat; View scrolls to and highlights the answer), `UsageCard.tsx` (headline sentence, one
   two-part bar with `role="img"` and an accessible name that names free replies before paid fuel,
   one values line with Free today, Beta, Fuel, the footer with the reset; gauge colours from the
   unrounded consumed percentage via the `--usage-*` tokens; Buy fuel only when free replies are
   used up), `BriefPanel.tsx` (the card "Your live brief · Revision N · k of 6 agreed"; on desktop a
   complementary side panel beside the chat; on a phone a full-screen dialog "Your live brief" with
   Back to chat and the usage card in its footer; each section with a status and an Edit that closes
   the panel and reopens that question in the chat at no cost). Desktop layout per the Interview
   board; phone layout per the Phone board and design section 7.
2. `model.ts`: `progressOf`, `questionRows`, `gaugeTone`, `usageView`, `sourceText`, and what the
   components need. `use-discovery.ts`: reopened questions, panels, highlight, one-at-a-time mode if
   the board shows it. File-chat state is unit 3.
3. Fixture: scenarios `mid-interview` (round 4: two agreed, one not sure, two asked and open, one
   coming next; free) and `mid-interview-paid` (free replies used up, fuel available), in
   `fixture-data.ts` and `givens.ts`; the fixture reply to a send updates the brief in the same
   reply (`data-brief`) and reports one model call to the probe.
4. Bodies in `j-need-brief.test.ts`: AT-004.61 (without its Finish half, which unit 4 adds),
   .71, .72, .73, following the pattern of .65. .72 and .73 run at desktop and phone; .72 checks
   that the bar sits directly above the message box on the phone (bar bottom at or above the box
   top, gap at most 16 px), that the box grows, that no usage text sits beside Send, that the usage
   card stays visible while the brief is open; .73 checks the side panel sits right of the
   conversation on desktop and that the phone dialog covers the viewport. Run .72 and .73 in dark
   mode too, and check at 320 pixels wide that no required control or amount is clipped. Move each id
   to green at loop and to `capability-pending ["ui.discovery-surface"]` at integration in
   `tests/at/expected/req-004.json`, in the same commit as its body.
5. Two fixes to unit 1:
   - The first reply speaks to the NGO. Its copy says "files that show how you work today", as the
     approved canvas does, not "how the NGO works today". Change AT-004.65 to assert the screen's
     phrase and the kinds of file the fixture Given names (take them from `givens.ts`, not literals).
   - The data port owns the organization and project. `DiscoveryScreen` takes the port and
     `onOpenReview` only; the fixture port's chat transport adds the scope to the request body.
     No component builds a request body with ids.

## Rules

- Comments only for a non-obvious why. Assertion messages document test steps.
- Test bodies check what a person sees: roles, names, visible text, geometry. Landmark names from
  `a11y.ts`; phrases the acceptance text names as literals.
- No new capability names, sentinels, faults, vendor stand-ins, or fixture worlds in the harness.
- UI code never fetches; everything goes through the port. shadcn components and `src/styles.css`
  tokens only; no hex colours; no new font.

## Checks (all must pass; run them yourself)

1. `bun run typecheck` exits 0.
2. `bun run at:selftest` exits 0.
3. `bun run at:check req-004` exits 0.
4. `bun run at:verify req-004 --tier loop --expect` exits 0, with .61, .65, .71, .72, .73 green.
5. Open the shell once (`bun run design:astra`, `http://localhost:4310/?scenario=mid-interview&pace=demo#discovery`)
   at 1280 and 390 pixels through the screen host, light and dark, and look at a screenshot of each
   (save them under `loop/items/AI4DEV-180/evidence/unit2/`). Stop the server afterwards.

## Your final response

The commits (hash and subject), each check with its exit code and counts, what in the design you
could not follow and why, and what a later unit must handle.
