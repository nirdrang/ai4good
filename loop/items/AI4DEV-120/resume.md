# Resume note for AI4DEV-120 (intake form and draft autosave)

Rewritten after every unit. Read this first, then `decisions.tsv`.

## Where the run is

The Feature playbook, one run for the whole item, seven units. Grounding (`how/explanation.md`),
the four-lane design arena, the blinded judge and the synthesis are finished and committed at
`33f286d`. The design of record is `design/SYNTHESIS.md`; it wins over anything that disagrees
with it, and it names `design/candidate-2-project-row.md` as its base.

**Units done: unit 1.**

| what | commit | acceptance ids green |
|---|---|---|
| grounding, arena, synthesis | `33f286d` | none, by design |
| unit 1, the need row and the capture ids | `4db553b` | AT-003.01, .02, .04 at both tiers |

Item branch `nirdrang/ai4dev-120-intake-form-and-draft-autosave-d1`. The brief commit is
`eb246d1` and carries the sheet change (the writer row runs astra at low). The lane worktree is
`.claude/worktrees/AI4DEV-120-unit0` on `lane/ai4dev-120`, at the item head. Both worktrees have
`node_modules`. The local Supabase stack is up.

## The first action on resume

Unit 2 is next: write `units/unit2.md` (the save and submit helpers, the description gate, autosave;
ids 03 and 05), dispatch the feature lane at `codex:gpt-6-astra@low`, then the per-unit loop below.
Open carry from unit 1: `project_need` stores the description trimmed (`nullif(btrim(...), '')`);
unit 2's save helper stores the text as typed and uses btrim only to decide blankness. Apply the same
to `start` in unit 2's migration.

## The per-unit loop

1. Bring the lane worktree to the item head with `git -C .claude/worktrees/AI4DEV-120-unit0 merge
   --ff-only <item head>` after checking it is clean. That one worktree serves every unit.
2. Write the unit brief to `units/unitN.md`. Name the files, the scope, the checks, the must-nots.
3. Dispatch one writer lane through the external runner in `isolated-write` mode with `--cwd` set
   to the lane worktree. Unit 1 is the hardest-tasks lane, `codex:gpt-6-astra@medium`. Units 2 to
   7 are the feature lane, `codex:gpt-6-astra@low`. The output path is `reports/unitN.md`.
4. Review the diff yourself. Run every check yourself as a background command writing to a file;
   read back the exit code and the counts. The writer's sandbox cannot run vitest (measured; see
   Gotchas), so it never ran the suite.
5. Commit in the lane worktree citing the item, then `git merge --ff-only lane/ai4dev-120` in the
   item worktree.
6. Rewrite this file. Open the compaction gate with the `AskUserQuestion` tool (founder
   2026-09-13: "I want you to update this gate to use the askuserquestion tool"): one question
   whose options are continue or compact, with what the unit landed and the remaining context
   budget in the question text, plus any open decision the next unit needs as a second question.
   Never open the gate as prose alone.

## The eleven checks every unit must pass

```
bun run typecheck
bun run at:check req-003
bun run at:selftest
bun run at:verify req-003 --tier loop --expect
bun run at:verify req-001 --tier loop --expect
bun run at:verify req-002 --tier loop --expect
bun run at:verify req-016 --tier loop --expect
bun run at:verify req-003 --tier integration --expect
bun run at:verify req-001 --tier integration --expect
bun run at:verify req-002 --tier integration --expect
bun run at:verify req-016 --tier integration --expect
```

## The units, in the brief's order

| unit | item | ids | lane | notes |
|---|---|---|---|---|
| 1 | AI4DEV-123 (capture and the admin gate) | 01, 02, 04 | hardest tasks | lands the table, both routes, the suite scaffold, the manifest |
| 2 | AI4DEV-124 (description gate and autosave) | 03, 05 | feature | save and submit helpers, no audit yet |
| 3 | AI4DEV-125 (zero cause labels) | 17 | feature | test only; the column landed in unit 1 |
| 4 | AI4DEV-126 (reference metadata and base disclosure) | 07 red at integration, 09 red at integration | feature | attach helper |
| 5 | AI4DEV-127 (Tier-2 hardened disclosure) | 10 red at integration | feature | operator stub, no migration |
| 6 | AI4DEV-128 (submission starts Discovery) | 11, 12 | feature | the happy path over unit 2's helper |
| 7 | AI4DEV-129 (raw-intake snapshot) | 14, 16 | feature | enum migration, audit append, unique index |

## The red set, settled

Three ids, `capability-pending`, integration tier only: AT-003.07 on `storage.reference-upload`,
AT-003.09 and AT-003.10 on `ui.reference-upload-surface`. Thirteen green at loop and ten at
integration when every unit has landed. The founder ruled at the unit 1 gate (2026-09-13, AskUserQuestion): .09 and .10 are red at
integration on the ui surface. Settled.

## After the last unit

The item-wide stations, each once over the whole diff: the comment audit on the mechanical model
with the comment-sicko prompt; the multi-model review (interrogate, five lanes); the evidence
capture through `.claude/skills/verify-ai4good/`; the rebase into ordered commits by the
mechanical agent; the pull request with Why, Scope, Tradeoffs, Blast Radius and Verification,
naming every unit in words and no other item's id; then the brief's Closing section.

## Standing constraints

The thirty in `how/explanation.md`, section "Constraints for the design". The ones that bit before:
1. No column named `lifecycle`, `state` or `status` on any table named like a project.
2. No storage call, no `bytea`, no document-named column, no `'application/pdf'` string.
3. Every new table: baseline revoke, RLS, catalog row, policy with `auth.uid()` or a `viewer_*`
   helper, no subquery in USING, no fourth helper.
4. A new audit enum value needs its own migration file.
5. The grants 10 and 30 are pins; never write them in a test body.
6. `emit_notification` and `append_audit_event` are callable by an owner definer only.

## Gotchas

- PowerShell only. This project forbids the Bash tool.
- `grok.exe` is not on the tool shell PATH. Prepend `$env:USERPROFILE\.grok\bin` per call.
- Launch the external runner as `bun <path to pstack-runner> ...`, never as the bare path.
- A codex lane in the lane worktree runs `bun run typecheck` and `bun run at:check` but cannot run
  vitest: esbuild walks ancestor directories and the sandbox denies the read. Measured on
  2026-09-13 (scratchpad probe) and on 2026-08-05 in three geometries. Every `at:selftest` and
  `at:verify` is the lead's, as a background command.
- An external read-only lane returns its artifact as its reply; the runner writes the reply to
  `--output` and destroys anything the model put there.
- The read gate refuses an unbounded read over 350 lines. Page it with offset and limit.
- The edge runtime serves functions from the folder the stack was STARTED in. A new route folder in
  another worktree answers 404. Restart the stack from the lane worktree (`bun run db:stop` in the
  old folder, `bun run db:start` in the lane, outputs to files) whenever a unit adds a route folder.
  Measured on unit 1: the mount pointed at the AI4DEV-102 worktree.
- Never paste the output of `bun run db:start`.
- An integration run resets the stack; a check that starts in that window reports every id red
  with a 502. Run it again before looking for a cause.
- The PR body must not name any id but the parent's. Units are named in words.
