# Design task: the Discovery screen, revision 12, on fixtures

You design; you do not implement. Produce one candidate design package. Read-only work in the
repository at the working directory. Write nothing into the repository.

## What must exist after the build (the item)

Read `loop/items/AI4DEV-180/brief.md` first. It carries the product spec slice and the item text.
In short:

1. Real Discovery screen components in `src/components/discovery/` (production tree): the chat on
   `useChat` from `@ai-sdk/react`, the Questions card, the brief card and side panel (desktop) and
   full-screen brief panel (phone), the usage card (one two-part bar: free replies first, then
   fuel), the file chooser panel and the file chat, and the Finish review page. They use the app
   font, shadcn components in `src/components/ui/`, and the tokens in `src/styles.css`, including
   dark mode (class-based `.dark`).
2. A thin fixture shell in `design/astra/` that imports those components and adds ONLY the sample
   transport (`design/astra/src/fixture-transport.ts`, in the SDK's `ChatTransport` slot) and the
   fixture data: scripted conversation, a one-question file chat per file, a question the AI asks
   during a read, read progress, digests, question importance, the three-file limit. The screen
   code does not live in `design/astra`. The existing mock files `Discovery.tsx`,
   `DiscoveryProgress.tsx`, `DiscoveryReferences.tsx`, `DiscoveryScope.tsx` are revision 11 (scope
   generation) and are replaced. Other mock screens (`ProjectBuild.tsx`, `screens.tsx` for other
   pages) stay.
3. Phone versions (390 px) of the file chat, the Questions card, and the Finish review page. The
   canvas has none; you propose them.
4. Screen tests: the bodies of AT-004.61 to .73 in `tests/at/suites/req-004/j-need-brief.test.ts`.
   Each checks what a person sees (roles, labels, text), so phase 3 runs the same bodies against
   the real route. Fully here: .61 to .66 and .70 to .73. Screen part only: .67 and .68 (their
   backend parts stay pending). Not here: .69.
5. Phase 3 (a later item) swaps only the data source: a transport to the `discovery-message` edge
   function and edge-function calls for the other actions. UI code never touches the database
   directly; it goes through edge functions.

## Founder rulings made in this session (fixed; do not reopen)

- The screen tests drive a headless browser: Playwright controlling Chromium, called from the
  `atTest` bodies. jsdom is rejected because it has no layout, and .72 and .73 check layout
  (bar directly above the message box on a 390 px phone; side panel on desktop, full-screen
  panel on phone; the message box grows from one line).
- CI runs the screen tests at the loop tier on every code pull request. The harness starts and
  stops the fixture shell server itself; `ci.yml` only gains a Chromium install step.
- This is the one sanctioned addition to the harness ("the harness takes no new machinery"
  otherwise stands: no new sentinels, faults, vendor stand-ins, fixture worlds, or capabilities
  beyond what the driver strictly needs). Keep the driver small.
- Codex (GPT-6 Astra at low) runs the suite and explores the shell during the build; it is not
  part of the test run.

## Sources to read (paths are relative to the working directory)

- Visual spec, revision 12 canvas boards (HTML with inline styles and a small state script):
  `design/astra/canvas-rev12/Interview.dc.html` (desktop chat, brief side panel, Questions card,
  usage card, file panel and file chat), `Finish.dc.html` (desktop review page),
  `Phone.dc.html` (phone chat with brief panel). Labels and text there are the approved copy.
- Contract: `design/discovery-ui-contract.md`, especially "Claude revision 12", "Funding panel",
  "Gauge behavior", "Required states", "Usability rules", "Application theme".
- Change order: `design/change-orders/012-discovery-need-brief-and-file-chat.md`.
- Model calls: `design/discovery-model-calls.md`.
- Acceptance text: `.taskmaster/docs/acceptance/at-req-004.md`, section J (AT-004.61 to .73).
- Stream types shared by mock and backend: `src/lib/discovery-stream.ts` (data parts
  `data-question`, `data-filed`, `data-charge`, `data-ready`, `data-usage`), helpers in
  `src/lib/discovery-chat.ts`, backend stream in `supabase/functions/_shared/discovery-stream.ts`.
- The current real route: `src/routes/discovery/$organizationId.$projectId.tsx` (plain chat,
  `DefaultChatTransport` to `functions/v1/discovery-message`).
- The current mock: `design/astra/src/` (`fixture-transport.ts`, `model.ts` zod state in
  localStorage, `questions.ts`, `discovery-examples.ts`, `App.tsx` hash router, `main.tsx`),
  `design/astra/vite.config.ts` (port 4310), `design/astra/tsconfig.json`.
- The harness: `tests/at/harness/registry.ts` (`atTest`, tiers `loop|integration|drill` from
  `AT_TIER`, per-tier body maps, `surface: 'ui'`, `AtPending`, `CapabilityPending`),
  `tests/at/suites/req-004/_bind.ts`, `_pending.ts` (`notYet`, `AWAITED.discoverySurface =
  'ui.discovery-surface'`), `tests/at/expected/README.md` (the `--expect` rules: a red that turns
  green must move to green in `tests/at/expected/req-004.json` in the same change),
  `tests/at/harness/runner.ts` (the `--wired` flag that says the screen driver does not exist
  yet), `tests/at/harness/suite-adapters.ts`, `tests/at/vitest.config.ts` (node environment),
  `tests/at/tsconfig.json` (no DOM lib; keep it that way: Playwright's API is Node-side),
  `tests/at/README.md`, `.github/workflows/ci.yml`.

## What your design package must cover

1. The data model of the screen: the brief (sections, statuses, importance, revisions, sources),
   questions and their states (Answered, Not sure, Open, Ready to send, Coming next), files and
   read states (Reading with progress, A question for you, Ready with N facts), usage, the review
   (acknowledgments, open edit, finished). Say where each piece of state lives and who writes it.
2. The stream contract additions to `src/lib/discovery-stream.ts` that revision 12 needs (brief
   update with importance in the same reply, file-chat, read progress, file-facts suggestion),
   and the non-chat actions (save a brief edit, accept a suggestion, finish, add a file, answer a
   file-chat question, read progress): how the components call them so phase 3 swaps only the
   data source.
3. The module map of `src/components/discovery/` and `src/lib/`, with type sketches and function
   signatures (`throw new Error('not implemented')` bodies, `// TODO` pseudocode where logic is
   tricky).
4. The fixture shell: what `design/astra` keeps, adds, and deletes, and how it mounts the screen.
5. The screen-test driver inside the harness: how a body gets a browser page at the right URL at
   each tier, who starts and stops the fixture shell server, how .61 proves "no other model call"
   from a screen test, how .67/.68 assert the screen part and then stay pending, how .69 stays
   pending, what each tier does in phase 2 (loop green; integration: say), and how phase 3
   points the same bodies at the real route. Name every new file and dependency.
6. The phone designs for the file chat, Questions card, and Finish review page (layout in words).
7. Build order: a sequence of small units, each ending in a check.
8. The rationale per the template below, including alternatives you rejected.

## Your structural direction

DIRECTION_PLACEHOLDER

Other runners take other directions. Push yours to its best form; do not converge to a middle.

## Output

Your final response IS the design package, as one Markdown document. Keep it under about 900
lines. Put TypeScript sketches in fenced blocks.
