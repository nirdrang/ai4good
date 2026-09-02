# Canon for AI4DEV-86 (v1 ceremony out, CI aligned)

Lead: this session, poteto-mode, pstack 1.2.1, sheet = default map (fable max, sol max, grok xhigh, opus xhigh).
Playbook: figure-it-out (cross-cutting), with the brief's stations: ground (/how critique), design arena, throughput checkpoint, write, diff, verify, sequence, interrogate, ship, close.

## Todolist
1. [done] Read the poteto-mode Principles in full and the leaf skills applied: prove-it-works, sequence-verifiable-units, subtract-before-you-add, laziness-protocol, separate-before-serializing-shared-state, foundational-thinking, migrate-callers-then-delete-legacy-apis, build-the-lever.
2. [done] Phase A frame: done predicate, scope count, rigor level.
3. [done] Station 1 ground: /how critique. 4 explorers (grok), explainer (fable), 4 critics (fable, sol, grok, opus). Rule each finding.
4. [done] Phase B design: arena with distinct structural directions (fable, sol, grok, opus), hidden rubric, cross-judge, red-flags screen, graft.
5. [done] Throughput checkpoint: four todos.
6. [done] Write units, one at a time, each verified (typecheck, at:verify loop --expect, integration).
7. [done] Diff against the design.
8. [done] Verify on the real surface via mechanical + verify-ai4good, and the integration tier against 44321.
9. [done] Sequence: rebase plan, mechanical executes, per-commit build.
10. [done] Interrogate: 4 reviewers, rule findings, re-panel on a changed head.
11. [done] Ship: deslop, no-comments, unslop, PR body (Why, Scope, Tradeoffs, Blast Radius, Verification, Harness ruling, Not done here).
12. [open: CI green on the head; waiting for the founder to say merge] Close: CI green on exact head AND founder "merge"; mechanical merges; ExitWorktree; /controller done.

## Decision trail
`decisions.tsv` beside this file (show-me-your-work).
## Throughput checkpoint (station 3)

Todo 1. What must finish before anything runs in parallel? The arena pick and graft (the seam decides the file list of unit 2), and the baseline is already captured.
Todo 2. What can run in parallel? Nothing worth the risk. Unit 1 (park the ceremony: agents, scripts, drills, /work prose, CI step, CLAUDE.md section 5, controller and mechanical pointers) and unit 2 (the one-stack integration path and the JWT single source) touch different files except .claude/skills/controller/SKILL.md, and both are proven by the same two commands. One machine, one database, one worktree: sequential.
Todo 3. Where would two writers touch the same state? .claude/skills/controller/SKILL.md (unit 1 rewrites the v1 pointers; unit 2 rewrites the cloud environment line) and .claude/settings.json (unit 2 removes AT_DB_SLOT). Split by territory: unit 2 owns tests/, supabase/config.toml and .claude/settings.json (the AT_DB_SLOT entry); unit 1 owns every prose file, including controller/SKILL.md, the verify skill, and the cloud docs.
Todo 4. Smallest safe split? Three units, one writer each, in this order: unit 2 first (the hard half, riskiest unknown first), then unit 1 (mechanical moves with exact instructions), then unit 3 (park the judge; revertible on its own). Each unit ends green on typecheck, at:selftest, both loop --expect runs; unit 2 also ends green on req-001 integration --expect against 44321.
