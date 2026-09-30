# Writer brief: unit 4 of the Discovery screen on fixtures (Finish)

You are the writer for one unit. Work only in your working directory, a git worktree on branch
`lane/ai4dev-180/unit4`. It already holds units 1 to 3, committed. Commit your work with messages
that end with `(AI4DEV-180)`. Do not push. Do not launch other agents. Do not touch any other
folder. Do not stop or start any process you did not start yourself; a preview on another port
belongs to another worktree.

**Stop rule.** If an environment problem (a hang, a tool that will not start, a sandbox refusal)
blocks you for 15 minutes, stop. Commit what works, and report the exact command, its output, and
what you tried.

## Read first

1. `loop/items/AI4DEV-180/design.md`: the contract. Section 8, unit 4, is your scope. Sections 1,
   2 and 4, and section 7 ("Finish review"), describe what you build. The data model has
   `BriefSnapshot` (monotonic by revision, `newerBrief`, every write carries `baseRevision`),
   `Confirmation`, the review tick keyed to the revision (`reviewedRevision`), and the port methods
   `saveBriefEdit`, `acceptSuggestion`, `removeCauseLabel`, `finish`.
2. `loop/items/AI4DEV-180/arena/candidate-opus-contract.md`, section 7: what each body checks.
   Where `design.md` differs, `design.md` wins.
3. The approved screens, which are the visual spec and the approved copy:
   `design/astra/canvas-rev12/Finish.dc.html` (the review page and the Discovery document) and
   design.md section 7 "Finish review" for the phone: one column; open questions first as stacked
   cards with two full-width buttons; the sections with source and Edit (an open edit is a
   full-width box with Cancel and Save); files; cause label; the Confirm Discovery card last; a
   fixed bottom bar "Go to Finish Discovery" that jumps to the card and hides while the card is in
   view; Back to the chat in the header.
4. `design/discovery-ui-contract.md`: "Claude revision 12" and the Finish and review sections.
5. `.taskmaster/docs/acceptance/at-req-004.md`: AT-004.61, .62, .63, .64.
6. Units 1 to 3 as built: `src/components/discovery/` (the placeholder `DiscoveryReview.tsx`,
   `ProgressStrip.tsx` with `onOpenReview`), `design/astra/src/` (fixture files, `givens.ts`,
   `App.tsx` route `discovery-review`), `tests/at/harness/screen.ts`, `screen-host.mjs`,
   `tests/at/suites/req-004/_screen.ts`, `j-need-brief.test.ts`.

## Lessons from units 2 and 3

- The boards are fixed app frames. The page does not scroll; panels scroll inside. The phone
  review is one scrolling column with the fixed bottom bar.
- Do not change the approved copy or layout to pass a test threshold. Copy comes from the board
  text, word for word, including the separators. Report any board detail you could not follow.
- The port owns the project scope. No component builds a request body with ids.
- Evidence is viewport screenshots, not full-page ones.

## Scope of unit 4

1. Components: full `DiscoveryReview.tsx` (desktop per the Finish board; phone per design section
   7) and `DiscoveryDocument.tsx` (the finished Discovery document). Edits on the review page save
   through `saveBriefEdit` with `baseRevision`; a stale revision shows the refusal the design names
   and keeps the person's text. The review tick is keyed to the revision: a newer brief clears it.
   Confirm Discovery calls `finish` and shows the document.
2. `model.ts` and `use-discovery.ts`: what the review and the document need.
3. Fixture: the world's `saveBriefEdit`, `acceptSuggestion`, `removeCauseLabel` and `finish` as
   design.md defines them, and any scenario the bodies need (for example a brief ready to finish),
   named in `givens.ts`.
4. Bodies in `j-need-brief.test.ts` (or the suite file design.md names): AT-004.62, .63, .64 fully,
   and the Finish half of .61 added to its existing body. Run them at desktop and phone, light and
   dark, and at 320 pixels check that no required control is clipped. Move .62, .63 and .64 to green
   at loop and to `capability-pending ["ui.discovery-surface"]` at integration in
   `tests/at/expected/req-004.json`, in the same commit as each body.

## Rules

- Comments only for a non-obvious why. Assertion messages document test steps.
- Test bodies check what a person sees: roles, names, visible text, geometry. Landmark names come
  from `a11y.ts`; phrases the acceptance text names are literals.
- No new capability names, sentinels, faults, vendor stand-ins, or fixture worlds in the harness.
  A new driver op in `screen-host.mjs` and `screen.ts` is allowed if a body needs it; use the same
  shape as the existing ops.
- UI code never fetches; everything goes through the port. shadcn components and `src/styles.css`
  tokens only; no hex colours; no new font.

## Checks (all must pass; run them yourself)

1. `bun run typecheck` exits 0.
2. `bun run at:selftest` exits 0.
3. `bun run at:check req-004` exits 0.
4. `bun run at:verify req-004 --tier loop --expect` exits 0, with .61 to .66 and .70 to .73 green.
5. Viewport screenshots through the screen host, saved under
   `loop/items/AI4DEV-180/evidence/unit4/`: the desktop review page and the Discovery document at
   1280x900; the phone review at its top and with the Confirm Discovery card in view at 390x844;
   light and dark. Stop any server you started.

The lead runs the integration `--expect` run on the database stack after your unit; you do not.

## Your final response

The commits (hash and subject), each check with its exit code and counts, what in the design you
could not follow and why, and what a later unit must handle.
