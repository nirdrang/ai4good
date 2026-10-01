# Writer brief: unit 1 of the Discovery screen on fixtures (second attempt)

## What happened before you, and what changed

A first writer worked in this same worktree for 90 minutes and stopped without committing. Its
uncommitted changes are still here (`git status`, `git diff`). Review them first. Keep what is
correct against `design.md`, fix or replace the rest. Do not assume any of it works.

It got stuck launching Playwright under Bun. The lead measured this: under Bun on Windows,
`chromium.launch()` and `chromium.connect()` both hang. Under Node they work. The design now puts
Playwright in a Node host process, `tests/at/harness/screen-host.mjs`, driven by the Bun-side
`tests/at/harness/screen.ts` over JSON lines on stdin and stdout. Read `design.md` section 6 again,
and the working probe in `loop/items/AI4DEV-180/probes/host.mjs` and `bun-client.mjs`. Build on
that probe. The test project never imports Playwright, so do not add `dom-names.d.ts`.

**Stop rule.** If an environment problem (a hang, a tool that will not start, a sandbox refusal)
blocks you for 15 minutes, stop. Commit what works, and report the exact command, its output, and
what you tried. Do not work around it with patches to Node or Bun internals.

You are the writer for one unit. Work only in your working directory, which is a git worktree on
branch `lane/ai4dev-180/unit1`. Commit your work there with messages that end with
`(AI4DEV-180)`. Do not push. Do not launch other agents. Do not touch any other folder.

## Read first, in this order

1. `loop/items/AI4DEV-180/design.md`: the design. It is the contract. Section 8, unit 1, is your scope.
2. `loop/items/AI4DEV-180/arena/candidate-opus-contract.md`: the base candidate. Its sketches of
   `a11y.ts`, `port.ts`, `model.ts`, `givens.ts`, `screen.ts`, `dom-names.d.ts`, `_screen.ts` and the
   page objects are your starting text. Where `design.md` differs, `design.md` wins.
3. `design/astra/canvas-rev12/Interview.dc.html`: the approved desktop screen (inline styles; the
   labels and text are the approved copy). Also `Phone.dc.html`.
4. `design/discovery-ui-contract.md` section "Claude revision 12" and `.taskmaster/docs/acceptance/at-req-004.md`
   AT-004.65.
5. `tests/at/harness/registry.ts` (`atTest`, tier body maps, `ctx.open`, `testUseProblem`),
   `tests/at/suites/req-004/_bind.ts`, `_pending.ts`, `j-need-brief.test.ts`,
   `tests/at/expected/README.md`, `tests/at/expected/req-004.json`, `tests/at/typecheck.ts`,
   `tests/at/tsconfig.json`, `.github/workflows/ci.yml`.
6. The current mock: `design/astra/src/` (`App.tsx`, `components.tsx`, `screens.tsx`, `main.tsx`,
   `fixture-transport.ts`, `model.ts`, `questions.ts`) and `design/astra/vite.config.ts`, `tsconfig.json`.

## Scope of unit 1: one browser case through the whole path

Build these, and nothing from later units beyond what this list needs:

1. `src/lib/discovery-stream.ts`: every type addition in design section 2 (all of them now, so later
   units do not reshape them).
2. `src/components/discovery/a11y.ts` (whole contract), `port.ts` (whole interface),
   `model.ts` (only the functions unit 1 uses; others may wait), `use-is-phone.ts`,
   `use-discovery.ts` (the main chat, the brief snapshot merge, answer drafts, send), `index.ts`.
3. A minimal `DiscoveryScreen.tsx` with `Conversation.tsx`, `QuestionGroup.tsx`, `Composer.tsx`,
   and `FilesCard.tsx` (list and the Add a file button only; the chooser and file chat are unit 3).
   Enough to render the first AI reply with its questions and the files request, answer a
   question, and send. Use shadcn components from `src/components/ui/` and the tokens in
   `src/styles.css` (class-based `.dark`). Add the three usage tokens to `src/styles.css`.
   No hex colours. No new font.
4. The fixture shell per design section 5: delete the revision 11 Discovery files, add
   `fixture-world.ts`, `fixture-port.ts`, `fixture-data.ts`, `givens.ts`, rewrite
   `fixture-transport.ts`, mount the screen in `App.tsx` (route `discovery`; a placeholder for
   `discovery-review` is fine), add the `@` alias in `vite.config.ts`, prune `model.ts` and
   `questions.ts` only as far as the type check requires, and keep the other mock screens working.
   Scenarios needed now: `first-reply` (intake only, no Discovery files, the first AI reply in the
   transcript) and `first-reply-three-files`. The first AI reply asks for files that show how the
   NGO works today, names the kinds that would help this need, and points to "Add a file", only
   while the project has fewer than three Discovery files. Its questions stay answerable without
   a file.
5. The driver per design section 6: `playwright-core` pinned to exactly `1.58.2` as a
   devDependency (`bun add -d playwright-core@1.58.2 --exact`; Chromium revision 1208 is already
   installed in `%LOCALAPPDATA%\ms-playwright`), `tests/at/harness/screen-host.mjs`,
   `tests/at/harness/screen.ts`, `tests/at/harness/screen.selftest.ts`,
   `tests/at/suites/req-004/_screen.ts` with the page objects this unit's body needs. The driver
   builds the shell with vite into a temporary folder outside the repository, serves it from
   `node:http` on a free port, owns one Chromium per test file, opens a fresh context per page,
   and throws from `afterAll` when a teardown fails.
6. The AT-004.65 body in `j-need-brief.test.ts`, `{ surface: 'ui' }`, loop body through
   `withDiscovery` (which calls `ctx.open()` first), integration and drill
   `CapabilityPending(['ui.discovery-surface'])`. Every other id stays `notYet`.
   Update `tests/at/expected/req-004.json`: .65 green at loop and capability-pending
   `["ui.discovery-surface"]` at integration. Leave the other ids as they are.
7. `tests/at/typecheck.ts` gains the fixture shell tsconfig. `ci.yml` gains the Chromium install
   step (`bunx playwright-core install --with-deps chromium`, same `if` as the verify steps, before
   the loop verify step) and `^design/astra/` in the code-territory pattern.

## Rules

- Comments only for a non-obvious why. No phase-narrating comments in tests; assertion messages
  document the step.
- Test bodies check what a person sees: roles, names, visible text, geometry. Take landmark names
  from `a11y.ts`; assert the phrases the acceptance text names as literals.
- No new capability names, sentinels, fault injections, vendor stand-ins, or fixture worlds in the
  harness. The screen driver is the one sanctioned addition.
- UI code never fetches and never touches a database; it goes through the port.
- Keep `tests/at/tsconfig.json` free of the DOM library.

## Checks (all must pass before you finish; run them yourself)

1. `bun install`
2. `bun run typecheck` exits 0 (now five projects).
3. `bunx tsc --project design/astra/tsconfig.json` exits 0.
4. `bun run at:selftest` exits 0.
5. `bun run at:check req-004` exits 0.
6. `bun run at:verify req-004 --tier loop --expect` exits 0, with AT-004.65 green.
7. Open the shell yourself once (`bun run design:astra`, then load
   `http://localhost:4310/?scenario=first-reply&pace=demo#discovery`) and confirm the first reply,
   its questions, and the Your files card render. Stop the server afterwards.

## Your final response

List: the commits (hash and subject), each check with its exit code and counts, anything in the
design you could not follow and why, and anything you noticed that a later unit must handle.
