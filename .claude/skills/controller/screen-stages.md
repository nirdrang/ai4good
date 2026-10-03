# The item texts for a UI screen's three stages

The controller writes these texts into a screen's three dev items when it materializes the screen. Replace `<screen>` with the screen's name in lowercase words, `<Screen>` with its title, `<reqs>` with the requirement ids, and `<D>` with the deliverable code. Do not add facts that the earlier stage will produce: the brief reads them from the repository when the item starts.

## Screen design: `<Screen>`

```markdown
The screen design stage of the <Screen> screen, for <reqs>. The ui-design skill runs this item.

It makes the screen on a Claude Design canvas from the PRD, in desktop and phone sizes. The canvas is a design, not app code, and this stage commits nothing under src/ or supabase/. The founder changes it in chat, and Codex reviews it as the screen's user until every interaction works. When the founder agrees the screen is complete, it updates the PRD for contract changes and big changes or additions, and it writes the acceptance tests. It adds their ids to the `verify:` field of the screen wiring leaf of <D> in the manifest. That field lists the acceptance tests that leaf must turn green.

Done when: the founder agrees the screen is complete, the canvas copy is in design/canvas/<screen>/project/, and the new acceptance tests are pending stubs.
Acceptance tests: none turn green in this stage. New ids register as pending.
```

## Screen build: `<Screen>`

```markdown
The screen build stage of the <Screen> screen, for <reqs>. poteto-mode runs this item, with its feature playbook and these steps.

1. Read the canvas copy in design/canvas/<screen>/project/ and the review record design/canvas/<screen>/review.md. Serve the copy locally and use every board once, as .claude/skills/ui-design/codex-review.md says.
2. Build the real components in src/components/<screen>/, with the app's own UI stack: the code that ships, not a mock. That means TanStack Start routes, shadcn/ui components, Tailwind with the tokens in src/styles.css, and the Vercel AI SDK (`useChat` from `@ai-sdk/react`) for chat. Only the data is a mock: sample data comes through a fixture transport, which stands where the edge functions will be. Match the canvas copy board by board, and build any viewport that the review record moves to this stage. The canvas copy is a specification of what the screen shows and does, not source to paste: rebuild each part in the app's stack, and carry over no canvas comment, class name, inline style, or fixture shortcut. Copy only the data-testid handles.
3. Put only the sample-data transport and the sample data in design/astra/. The shell there imports the real components. No screen logic lives in design/astra/.
4. The UI never calls the database directly. It reads and writes through the transport, which becomes an edge function in screen wiring.
5. Bind the screen tests to the data-testid handles on the canvas copy, so that the same test file runs on the sample-data shell and on the real route.
6. Run `bun run at:verify <req> --tier loop --expect` until the screen's pending acceptance tests are green at the loop tier.
7. Run the Codex review on the running sample-data shell, with the prompt, the model, and the command in .claude/skills/ui-design/codex-review.md and the persona and tasks in the review record. Start Codex directly, not through provider dispatch. Fix each interaction that does not work, and run both checks again until the tests are green and the review ends with ALL WORKS. Bring the usability hints to the founder.
8. Run the comment audit over the diff and also over each file under src/ that the screen imports and this diff does not change. A comment that an earlier stage left in such a file is in scope.

Done when: the pending acceptance tests are green at the loop tier, the Codex review ends with ALL WORKS, and the founder has answered each usability hint.
```

## Screen wiring: `<Screen>`

```markdown
The screen wiring stage of the <Screen> screen, for <reqs>. poteto-mode runs this item, with its feature playbook and these steps.

1. Write the edge functions and the migrations the screen needs, on the local database.
2. Replace the sample-data transport with the real one. Do not change the screen components or the screen tests.
3. Run `bun run at:verify <req> --tier integration --expect`. The screen's acceptance tests are in this leaf's `verify:` field, so they must pass here.
4. Teach the verify-ai4good skill the new screen. Add or update one file in .claude/skills/verify-ai4good/features/ for the screen, and one for each new edge function. Each file says what the feature is, how to reach it, how to drive it, and what end state proves it works, as features/README.md says. Add a row for each file to the table in features/README.md. If the screen needs prepared data, add a script in .claude/skills/verify-ai4good/scripts/.
5. Use the verify-ai4good skill to drive the real screen through the new feature file, and capture the evidence.
6. Remove or move each test that the screen design stage marked to retire.

Done when: the screen's acceptance tests pass at the integration tier, the verify-ai4good feature map lists the screen, and its evidence is in the pull request.
```
