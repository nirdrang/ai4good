# Writer brief: unit 3 of the Discovery screen on fixtures (files)

You are the writer for one unit. Work only in your working directory, a git worktree on branch
`lane/ai4dev-180/unit3`. It already holds units 1 and 2, committed. Commit your work with messages
that end with `(AI4DEV-180)`. Do not push. Do not launch other agents. Do not touch any other
folder. Do not stop or start any process you did not start yourself; a preview on another port
belongs to another worktree.

**Stop rule.** If an environment problem (a hang, a tool that will not start, a sandbox refusal)
blocks you for 15 minutes, stop. Commit what works, and report the exact command, its output, and
what you tried.

## Read first

1. `loop/items/AI4DEV-180/design.md`: the contract. Section 8, unit 3, is your scope. Sections 1,
   2, 4 and 7 (the "File chat" bullet) describe what you build. The data model has `FileStatus`,
   `DiscoveryFile`, `FileChatTarget {kind:'new', file}` and `FileChatDataTypes`.
2. `loop/items/AI4DEV-180/arena/candidate-opus-contract.md`, section 7: what each body checks.
   Where `design.md` differs, `design.md` wins.
3. The approved screens. They are the visual spec, and their labels and text are the approved
   copy:
   - `design/astra/canvas-rev12/Interview.dc.html`: the files card, and the file chat panel (from
     about line 260 to the end: the chooser, the read status, the file messages, the chips, the
     answer box "Your answer about this file").
   - `design/astra/canvas-rev12/Phone.dc.html`: the phone frame.
   - design.md section 7, "File chat": the full-screen phone dialog "Add a file", then "File chat:
     <name>", with the compact usage bar directly above the answer box and "Close and keep reading"
     in the header while a read runs.
4. `design/discovery-ui-contract.md`: "Claude revision 12" and the file sections.
5. `.taskmaster/docs/acceptance/at-req-004.md`: AT-004.66, .67, .68, .70.
6. Units 1 and 2 as built: `src/components/discovery/`, `design/astra/src/` (fixture files,
   `givens.ts`), `tests/at/harness/screen.ts`, `screen-host.mjs` (it already has `setFiles`),
   `tests/at/suites/req-004/_screen.ts`, `j-need-brief.test.ts`.

## Lessons from unit 2 (the lead sent it back once for these)

- Both boards are fixed app frames. The page does not scroll; panels scroll inside. Keep that for
  every new panel and dialog, and keep the unit 2 pinning checks green.
- Do not change the approved copy or layout to pass a test threshold. If a bound fails, fix the
  component, or derive the bound from computed style. Report any board detail you could not follow.
- The port owns the project scope. No component builds a request body with ids.
- Evidence is viewport screenshots, not full-page ones.

## Scope of unit 3

1. Components: full `FilesCard.tsx` (count "k of 3 added", the tier sentence, the rows with status,
   Add a file) and `FilePanel.tsx` (desktop panel per the Interview board; phone full-screen dialog
   per design section 7). The chooser: one Choose a file button, the drop area only with a fine
   pointer, the accepted types, the sample-data sentence, Cancel adding this file. After a choice:
   the live read status with a thin progress bar, the file messages, wrapping chips, the answer box.
   A staged file stays on the screen until the first file-chat answer, which commits the file and
   the answer together (`FileChatTarget {kind:'new', file}`); Cancel before that answer leaves no
   file behind.
2. `model.ts` (`fileRows` and what the file panel needs) and `use-discovery.ts` (file-chat state
   lives in the hook, per design.md).
3. Fixture: the read timers and file-chat scripts in `fixture-world.ts`, `fixture-data.ts`,
   `givens.ts` and `FixtureFileChatTransport`. The fixture port adds the scope to file-chat
   requests too, the same way as `FixtureChatTransport` (see its `ProjectScope`). Each file-chat
   model call reports to the probe. Any new scenario name goes into `givens.ts`.
4. Bodies in `j-need-brief.test.ts` (or the suite file design.md names): AT-004.66 and .70 fully;
   the screen assertions of .67 and .68, which then throw `AtPending(id, 'sut-missing', …)` as
   design.md section 1 says. Run the screen bodies at desktop and phone, and at 320 pixels check that
   no required control is clipped. Move .66 and .70 to green at loop and to `capability-pending
   ["ui.discovery-surface"]` at integration in `tests/at/expected/req-004.json`, in the same commit
   as each body. .67 and .68 keep their current declarations if the reason text still matches;
   change the reason text only if the check requires it.

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
4. `bun run at:verify req-004 --tier loop --expect` exits 0, with .61, .65, .66, .70, .71, .72, .73
   green.
5. Viewport screenshots through the screen host, saved under
   `loop/items/AI4DEV-180/evidence/unit3/`: the desktop file panel during a read and after the
   first answer, at 1280x900, light and dark; the phone "Add a file" dialog and the phone file
   chat during a read, at 390x844, light and dark. Stop any server you started.

## Your final response

The commits (hash and subject), each check with its exit code and counts, what in the design you
could not follow and why, and what a later unit must handle.
