# Change order 015: Close PRD reuses a completion check that already ran

Date: 2026-10-16. Decision d98. AI4DEV-215 (PRD screen build).

## Founder ruling, in the founder's words

During the screen build, Codex review round 3 (`loop/items/AI4DEV-215/codex-review/round-3.md`) reported that pressing Close PRD after the automatic completion check had failed ran a second paid check on the same revision. The lead asked, with the AskUserQuestion tool: "Close PRD after a check already failed on the same, unchanged revision: run the paid check again, or show the existing result again with Close anyway / Keep working?" The founder chose "Reuse the result (Recommended)".

## What changes

REQ-036, Completion, in `loop/out/pure-s6-req-027-036.md` (assembled into `.taskmaster/docs/prd-mvp.md` and `.taskmaster/docs/requirements/req-036.md`). Before:

> Close PRD runs the completion check first, unless it already passed for the current revision.

After:

> Close PRD runs the completion check first, unless a check already ran for the current revision; a check that passed closes the PRD at once, and a check that found gaps shows its result again without a new run.

The contract `design/prd-ui-contract.md`, section "Close and continue to UI Design", says the same and adds that a new check runs once the revision changes.

The acceptance cases AT-036.04 and AT-036.16 in `.taskmaster/docs/acceptance/at-req-036.md` are amended with `[d98]`. No identifier changes.

## The screen

The coded PRD workspace screen on this branch already behaves this way: the screen build implemented it after the ruling. The approved canvas in `design/canvas/prd-workspace/project/` is not revised. It shows a second press after a failed check only on its scripted path, and the screen build's code and acceptance tests now carry the behavior.
