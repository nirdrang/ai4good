---
name: ui-design
description: Design a UI screen before any code is written, so that screen build and screen wiring start from a design that real users have tried and the founder has reviewed. It gives the approved canvas, the PRD changes it caused, and the acceptance tests. The controller invokes it for the screen design item of a UI screen, and it runs under poteto-mode; the founder can also type /ui-design.
---

# UI design: screen design

You make every design decision, and the founder reviews the finished screen once, at the pull request (founder 2026-11-28: "Fully autonomous I will review ui in a single pass."). Ask the founder nothing during the run, except a sign-in a lane needs. You make the screens, run the persona review, and update the PRD at the end.
First invoke `pstack:poteto-mode` with the Skill tool, and apply its principles, delegation and verification rules. The steps below are this item's playbook: use them in place of poteto-mode's playbooks, and end with the pull request of step 8. Do not hand the work to a writer lane.
`reference.md` in this folder gives the founder's rulings and the reason for each step. `codex-review.md` holds the persona review.

The canvas boards are the input to screen build. The details of the screen live on the boards. The PRD gets only the contract changes and the big changes or additions, once, at step 6.

This item commits no app code: nothing under `src/` or `supabase/` (founder 2026-10-03). A type, transport, or helper the screen needs belongs to screen build, where the comment audit runs. The only code this item writes is the pending acceptance stubs of step 7.

If the controller started you, read `loop/items/<item>/brief.md`. If the founder typed `/ui-design`, ask for the screen and its requirement ids.

## Steps

1. **Make the first screens from the PRD.** Read the screen's requirements in `.taskmaster/docs/requirements/`, its row in `design/ui-ux-instructions.md`, and its contract, `design/<screen>-ui-contract.md`, if it has one. Then make the canvas the way `/design` does: call the Artifact quickstart with the intent `design`, create the canvas from the Design type it names, with a title and no files, and fill it as the type's instructions say.
   - Make one board for each page in both sizes: desktop at 1280 by 900 pixels, phone at 390 by 844 pixels.
   - Every control works in Play, and the boards link the way the real screen moves.
   - All boards show one sample project with realistic data.
   - Each control carries a `data-testid`, as section 5.1 of the rules says.
2. **Decide the open design choices.** For each choice the requirement, its contract and `design/ui-ux-instructions.md` leave open, pick the option that serves the screen's user best. When two options both fit, ask a second model the same question and record both answers.
   - Record each decision in the review record, `design/canvas/<screen>/review.md`, as a row in the `pstack:show-me-your-work` format: the decision, why, the evidence, and the result. Mark a decision that changes the screen's contract, or makes a big change or addition: it goes to the PRD at step 6. Do not change the PRD now.
   - If the founder writes in the chat or on the canvas during a run, that is a ruling. Read the canvas again before each change, because the founder can also change it directly in Claude Design. Record the ruling in the founder's words, with its date. Change the boards and publish.
3. **Run the persona review.** When every board is made, run the review as `codex-review.md` says, on its three model lanes at once.
4. **Fix until all works.** Fix each interaction that does not work. Decide each usability hint: apply it, or decline it with a reason. A hint that two lanes report weighs more. Record and mark these decisions as in step 2. Run the review again. Repeat until every lane ends with ALL WORKS on every board this stage keeps. A board that step 5 moves to screen build carries its open interactions in the review record.
5. **Close the design.** Decide whether the screen is complete in both sizes, or complete on desktop with the phone moved to screen build, and record the decision and why.
6. **Update the PRD, last.** Update the PRD and the contract for the marked decisions only. Smaller details stay on the boards.
   - Requirement text: run `powershell -File loop/assemble-pure.ps1 -Check` first; if it reports a difference, bring the pure section up to date. Edit the owning section in `loop/out/pure-s*.md`, run `loop/assemble-pure.ps1` and `loop/extract-isolates.ps1 -Reqs <ids>`, and add one decision to `loop/state/decisions.jsonl`.
   - Contract: edit the screen's contract and its row in `design/ui-ux-instructions.md`.
   - Change only what the marked decisions need. Name any other requirement that now disagrees as a known gap.
7. **Write the acceptance tests for screen build and screen wiring.** For each behavior of the complete screen, add or amend a test in `.taskmaster/docs/acceptance/at-req-0NN.md`, in the file's own form: what the user does and what the user sees, bound to the `data-testid` handles.
   - Register each new id as a pending stub in `tests/at/suites/`, and declare it pending in `tests/at/expected/`.
   - Do not delete a green test that the design made wrong. Mark it to move or retire in screen wiring.
   - Add the new ids to the `verify:` field of the screen wiring leaf in the screen's deliverable, in `loop/decomp/req-0NN.md`. That field lists the tests the leaf must turn green.
   - Check with `loop/decomp/check-tree.ps1`, `bun run at:check <req>`, and `bun run at:verify <req> --tier loop --expect`.
   - Download the boards and `canvas.json` into `design/canvas/<screen>/project/`, as step 8 says. Then invoke `pstack:interrogate` on the branch diff of the boards, the PRD, the pure sections, the contract, `design/ui-ux-instructions.md`, the acceptance files, and the decomposition manifest. The adversaries look for a behavior on the boards that no test covers, a test or rule that disagrees with another requirement, and earlier PRD text that the assembly reverted. Fix each finding that a run proves, then run the three checks above again.
8. **Save and close.**
   - Download the boards and `canvas.json` from the published canvas into `design/canvas/<screen>/project/`. Screen build uses this copy as its target.
   - Complete the review record: the canvas link and version, each persona review and what it changed, and the decisions of steps 5 and 6. Set the screen's status in `design/astra/screens.json`.
   - Run `pstack:deslop` over the diff before you commit, and `pstack:no-comments` before you open the pull request. When the comment audit offers to encode a constraint, do not encode it: delete the comment as its step 5 says, and list the constraint under Design decisions. Write the pull request body with `pstack:technical-writing`, then `pstack:unslop`.
   - Commit with messages that cite this branch's item. Push, and open one pull request with `gh pr create`. Name no item id except this branch's own. Under Verification, list each check with its exit code and counts. Under Design decisions, list every decision of the review record, with each applied or declined hint and the completion call, and mark the ones that changed the PRD, so the founder can review the screen in one pass. Under Not done here, list what moves to screen build or screen wiring, each known gap, and the Linear forward sync (`/doc-sync`).
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
