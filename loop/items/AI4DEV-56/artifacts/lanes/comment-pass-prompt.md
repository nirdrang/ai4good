# Comment pass: apply the comment audit under the lead's rulings

You are the mechanical agent. You execute exact instructions and rule on nothing. You work in the worktree you are given, on its current head. You edit comments only; you never change a line of code, a string literal, an assertion message or a migration statement. If a deletion would require touching code (for example a comment that shares a line with code), delete only the comment part of that line.

## Inputs

- `loop/items/AI4DEV-56/artifacts/comment-audit.md`: every comment marked DELETE and every comment marked KEEP, quoted, by file.
- `loop/items/AI4DEV-56/artifacts/comment-audit-rulings.md`: the lead's rulings. Every DELETE is applied except the entries under "Kept, trimmed to one sentence", which are replaced by the one sentence the rulings give; every KEEP stands; MUST KILL 1 and 2 were applied by the fix lane already, MUST KILL 3 and 4 are declined and their one-sentence whys stay.
- The tree has changed since the audit was written: a fix lane landed after it. Where an audited comment no longer exists, skip it and list it under "not found". Where the fix lane added a NEW comment in a changed file that the audit could not see, judge it by the same rulings (delete narration, banners, ids and rationale; keep a one-sentence why only where the rulings' keep list names that place) and list each such decision under "new since the audit".

## Procedure

1. Walk the audit file by file. For each DELETE entry, find the quoted comment in the tree and remove it. For a file-header block marked DELETE, leave at most the one-sentence header the rulings allow ("Every new module or migration keeps at most a one-sentence header saying what the file holds"); write that sentence yourself from the file's contents, plain and without an id.
2. Apply the rulings' "Kept, trimmed to one sentence" list: replace each named comment with exactly the sentence given.
3. In `tests/at/suites/req-001/_fixture.ts`, every mirror comment keeps its first sentence in the form "The mirror of `public.<object>`; the live adapter is the oracle."
4. In `tests/at/suites/req-001/_pending.ts`, rewrite the header's count sentence to the current count in one sentence and delete the changelog list of landed leaves.
5. After the edits run, in this order, and keep the output:

```
bun run typecheck
bun run at:check req-001
bun run at:selftest
bun run at:verify req-001 --tier loop --expect
```

All four must exit 0. The integration tier is not needed for a comment-only change; the lead runs it on the final head.

6. Commit once with exactly this message:

```
AI4DEV-56: the comment audit applied

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01X4L1LDLGqdutW5cMaJsaaG
```

## Report

Write `loop/items/AI4DEV-56/artifacts/lanes/comment-pass-report.md` before the commit: the deletion count applied, the trimmed keeps applied, the "not found" list, the "new since the audit" decisions, the four check results with exit codes, and `git diff --stat HEAD~1` after the commit (add the report to the commit with a second `git commit --amend --no-edit` if needed). Reply with three lines: the commit hash; the deletion count and the not-found count; the four exit codes.
