# UI way of work: three stages per screen

A screen goes through three stages: screen design, screen build, and screen wiring. Each stage is one child item of the screen's parent item, on its own branch, closed by the merge of that branch. Run the children in order; each child blocks the next one. Start each child with `/controller <child id>`.

1. **Screen design.** The `ui-design` skill, `.claude/skills/ui-design/`, holds this stage: its steps, the founder's rulings, and the Codex review. The controller invokes it for the screen design item, because the skill's description claims that stage.
2. **Screen build:** the real screen on sample data. Section 2 below, until the founder decides how screen build and screen wiring add to poteto-mode.
3. **Screen wiring:** the backend and the wiring. Section 3 below, under the same condition.

This document replaces the July 2026 version, which had Lovable build each screen from Claude Design exports. That version is in git history at commit `8319306`.

## 1. The layers of truth

| Layer | Holds | Where |
| --- | --- | --- |
| Requirements | What must exist | `.taskmaster/docs/prd-mvp.md`, from `loop/out/pure-s*.md` |
| Screen rules | Rules every screen obeys, and one row per screen | `design/ui-ux-instructions.md` |
| Screen contract | The detailed behavior of one screen | `design/<screen>-ui-contract.md` |
| Acceptance tests | The checks that prove the coded screen | `.taskmaster/docs/acceptance/`, `tests/at/` |
| Approved design | The complete canvas | the canvas artifact, and its copy in `design/canvas/<screen>/` |
| Screen code | The real components | `src/components/<screen>/` |
| Backend | Edge functions and the database | `supabase/` |

Each layer comes from the layer above it. If a layer below disagrees, fix the layer above first, then copy the change down.
Never fix the screen code to disagree with the approved design, and never fix the design to disagree with the requirement.

## 2. Screen build: the real screen on sample data

**Result:** the real components pass the screen's acceptance tests on sample data.

1. `/controller <screen build id>` writes the brief. pstack's poteto-mode builds the screen.
2. Build the real components in `src/components/<screen>/`. Use the libraries the real screen uses, for example `useChat` from the Vercel AI SDK.
3. Put only the sample-data transport and the sample data in `design/astra/`. The shell there imports the real components. No screen logic lives in `design/astra/`.
4. Match the complete canvas copy in `design/canvas/<screen>/`. Build any viewport that screen design left for this stage.
5. The screen tests bind to the test handles from the canvas (section 5.1 of `design/ui-ux-instructions.md`). The same test file must run on the sample-data shell and on the real route.
6. The acceptance tests run as code. Codex also reviews the running screen as its user, with the prompt, the model, and the command in `.claude/skills/ui-design/codex-review.md`. The loop fixes every failure that either finds, then runs both again. A run with no browser window is not proved yet; the first screen build run finds out.
7. The pending acceptance stubs from screen design turn green at the loop tier.
8. The UI never calls the database directly. It goes through the transport, which becomes an edge function in screen wiring.
9. Merge closes the screen build item.

## 3. Screen wiring: the backend and the wiring

**Result:** the screen works on the real backend, and the acceptance tests pass at the integration tier.

1. `/controller <screen wiring id>` writes the brief. pstack's poteto-mode builds the backend.
2. Write the edge functions and the migrations on the local database.
3. Replace the sample-data transport with the real transport. Do not change the screen components or the screen tests.
4. Run `bun run at:verify <req> --tier integration --expect`.
5. The `verify-ai4good` skill drives the real screen and captures the evidence.
6. Remove or move the tests that screen design marked to retire.
7. Merge closes the screen wiring item and the screen's parent.

## 4. Retired

- The Lovable build loop, and the rule to use the Lovable connector for non-trivial UI work.
- Claude Design exports in `design/screens/` as the build input. The files stay as a baseline.
- `design/astra/` as a design place for new screens. It stays as the screen build sample-data shell and keeps its existing review records.
- The change-order transport through `put_conversation`. A change order stays the record when a requirement change reaches a screen from outside a design session. A design session records its rulings in the screen's review record.
- The separate design-track worktree with a direct push to main. Each stage uses its own branch and a pull request.
