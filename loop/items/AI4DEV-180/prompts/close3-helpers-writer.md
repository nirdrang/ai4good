# Writer brief: closing round 3, the screen test helpers move to their own file

Follow `loop/items/AI4DEV-180/prompts/close1-ingest-writer.md` for the rules (the worktree, the
commits, commit early, the stop rule, PowerShell), with these changes:

- Your working directory is a git worktree on branch `lane/ai4dev-180/close3-helpers`. It holds
  closing rounds 1 and 2.
- No screenshots in this round.

## The task

The founder agreed on 2026-10-01 to move the step helpers out of the acceptance test file.
`tests/at/suites/req-004/j-need-brief.test.ts` is 1128 lines. Most of it is step helpers that the
screen test bodies (AT-004.61 to .73) call: flows such as the finish flow, change reopens
Discovery, the document checks, the usage checks and the file read checks.

1. Create `tests/at/suites/req-004/_flows.ts` beside `_screen.ts`. Move into it every helper
   function and helper type that the test bodies call and that is not itself a registered test.
   Export what the test file uses. `_flows.ts` may import from `_screen.ts` and the harness;
   `_screen.ts` does not import from `_flows.ts`.
2. The test file keeps the imports, the `atTest` registrations and their bodies, and nothing else
   that can move. Each body stays a short list of named steps. The target is a test file well
   under 1000 lines; say the final line counts of both files.
3. Move code as it is. Do not change what any helper checks, its waits, its messages or its order.
   Do not rename a registered test or change an id. Renaming a helper is allowed only to resolve a
   name clash; say which.
4. Check that `_flows.ts` is picked up by the same typecheck project as `_screen.ts`
   (`tests/at/typecheck.ts`), and that the at-check bijection does not see `_flows.ts` as a suite
   file (the leading underscore is the existing convention; confirm it in the harness).

## Checks (all must pass; run them yourself)

The four checks from the round 1 brief. The loop run must match the declaration exactly as before:
44 green, 26 red, and the same ids green.

## Your final response

The commit (hash and subject), each check with its exit code and counts, the line counts of both
files before and after, and any helper you renamed.
