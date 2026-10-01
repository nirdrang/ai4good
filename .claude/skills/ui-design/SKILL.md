---
name: ui-design
description: Design a UI screen with the founder before any code is written, so that screen build and screen wiring start from a design the founder approved and a real user has tried. It gives the approved canvas, the PRD changes it caused, and the acceptance tests. The controller invokes it, instead of poteto-mode, for the screen design item of a UI screen; the founder can also type /ui-design.
---

# UI design: screen design

The founder owns every design decision. You make the screens, run the Codex review, and update the PRD at the end.
Work in this session, with the founder. Do not hand the work to poteto-mode or to a writer lane.
`reference.md` in this folder gives the founder's rulings and the reason for each step. `codex-review.md` holds the Codex review.

The canvas boards are the input to screen build. The details of the screen live on the boards. The PRD gets only the contract changes and the big changes or additions, once, at step 6.

If the controller started you, read `loop/items/<item>/brief.md`. If the founder typed `/ui-design`, ask for the screen and its requirement ids.

## Steps

1. **Make the first screens from the PRD.** Read the screen's requirements in `.taskmaster/docs/requirements/`, its row in `design/ui-ux-instructions.md`, and its contract, `design/<screen>-ui-contract.md`, if it has one. Then make the canvas the way `/design` does: call the Artifact quickstart with the intent `design`, create the canvas from the Design type it names, with a title and no files, and fill it as the type's instructions say.
   - Make one board for each page in both sizes: desktop at 1280 by 900 pixels, phone at 390 by 844 pixels.
   - Every control works in Play, and the boards link the way the real screen moves.
   - All boards show one sample project with realistic data.
   - Each control carries a `data-testid`, as section 5.1 of the rules says.
2. **Change the screens with the founder.** Give the founder the canvas link.
   - A change can come from the chat, from a comment on the canvas, or from an element the founder selected. Answer comments in the chat.
   - Ask each decision with `AskUserQuestion`, with a concrete example in each option.
   - Read the canvas again before each change, because the founder can also change it directly in Claude Design. Change the boards and publish.
   - Record each ruling in the review record, `design/canvas/<screen>/review.md`, in the founder's words, with its date. Mark a ruling that changes the screen's contract, or makes a big change or addition: it goes to the PRD at step 6. Do not change the PRD now.
3. **Ask for the Codex review.** When the founder is content with the screens, ask with `AskUserQuestion` whether to run the Codex review now. On yes, run it as `codex-review.md` says.
4. **Fix until all works.** Fix each interaction that does not work. Show the usability hints to the founder in one `AskUserQuestion` with multiple choice, and apply the hints the founder accepts. Record and mark these changes as in step 2. Run the review again. Repeat until the review ends with ALL WORKS and the founder has answered every hint.
5. **Agree that the screen is complete.** Ask with `AskUserQuestion`: complete in both sizes, complete on desktop with the phone moved to screen build, or not yet. "Not yet" returns to step 2.
6. **Update the PRD, last.** Show the founder the marked rulings in one `AskUserQuestion` with multiple choice. Update the PRD and the contract only for the rulings the founder confirms. Smaller details stay on the boards.
   - Requirement text: run `powershell -File loop/assemble-pure.ps1 -Check` first; if it reports a difference, bring the pure section up to date. Edit the owning section in `loop/out/pure-s*.md`, run `loop/assemble-pure.ps1` and `loop/extract-isolates.ps1 -Reqs <ids>`, and add one decision to `loop/state/decisions.jsonl`.
   - Contract: edit the screen's contract and its row in `design/ui-ux-instructions.md`.
   - Change only what the founder ruled. Name any other requirement that now disagrees as a known gap.
7. **Write the acceptance tests for screen build and screen wiring.** For each behavior of the complete screen, add or amend a test in `.taskmaster/docs/acceptance/at-req-0NN.md`, in the file's own form: what the user does and what the user sees, bound to the `data-testid` handles.
   - Register each new id as a pending stub in `tests/at/suites/`, and declare it pending in `tests/at/expected/`.
   - Do not delete a green test that the design made wrong. Mark it to move or retire in screen wiring.
   - Add the new ids to the `verify:` field of the screen wiring leaf in the screen's deliverable, in `loop/decomp/req-0NN.md`. That field lists the tests the leaf must turn green.
   - Check with `loop/decomp/check-tree.ps1`, `bun run at:check <req>`, and `bun run at:verify <req> --tier loop --expect`.
8. **Save and close.**
   - Download the boards and `canvas.json` from the published canvas into `design/canvas/<screen>/project/`. Screen build uses this copy as its target.
   - Complete the review record: the canvas link and version, each Codex review and what it changed, and the founder's answers at steps 5 and 6. Set the screen's status in `design/astra/screens.json`.
   - Commit with messages that cite this branch's item. Push, and open one pull request with `gh pr create`. Name no item id except this branch's own. Under Verification, list each check with its exit code and counts. Under Not done here, list what moves to screen build or screen wiring, each known gap, and the Linear forward sync (`/doc-sync`).
   - When CI is green on the exact head and the founder says "merge", give the `mechanical` agent `gh pr merge <n> --squash`. Spawn it with no `model` parameter. Delete no branch and no worktree. Leave the worktree with `ExitWorktree(action: "keep")`, then invoke `/controller done <item>`.

## Acceptance tests and the Codex review are different checks

| | Acceptance tests | Codex review |
| --- | --- | --- |
| What it is | Code that checks what the requirement promises | An agent that plays the screen's user |
| When it is made | Once, when the design is complete (step 7) | For each review, from the template in `codex-review.md` |
| Where it runs | On the coded screen, in screen build and screen wiring, through `bun run at:verify` and CI | On the canvas in screen design, and on the coded screen in screen build |
| What it gives | Pass or fail for each test id, the same each run | What works, what does not, and usability hints |

The Codex review does not run the acceptance tests, and the acceptance tests do not replace the Codex review.

## What a design item needs

The controller writes the item text from `.claude/skills/controller/screen-stages.md` when it materializes the screen. The text names the screen, its requirement ids, and its deliverable in the manifest.
