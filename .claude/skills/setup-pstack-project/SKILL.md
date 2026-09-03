---
name: setup-pstack-project
description: Run the pstack setup skill for this repository so the model sheet lands in the tree (.claude/pstack-models.md, included from the project CLAUDE.md) and never in the home folder. A thin wrapper over the installed plugin skill, so a plugin update flows through. Use for /setup-pstack-project or "configure pstack models here".
---

# /setup-pstack-project

The installed plugin skill `pstack:setup-pstack` writes the sheet to `~/.claude/pstack-models.md`
and puts an `@` include into `~/.claude/CLAUDE.md`. This repository keeps the sheet in the tree
instead, so a cloud session, which starts from a fresh clone and never sees the home folder,
reads the same values as a local one. This skill changes only where the two writes go.

## Steps

1. Invoke the plugin skill with the Skill tool: `pstack:setup-pstack`. Follow every step of
   it as written: the parent, the loaded state, the matrix validation, the probes, the
   confirmation, the smoke. Do not copy its text here; the installed version is the contract.
2. Before the write step, check the guard. The installed skill must name exactly these two
   home targets: `~/.claude/pstack-models.md` for the sheet and an `@~/.claude/pstack-models.md`
   include in `~/.claude/CLAUDE.md`. If it names a different file, a different include shape,
   or a third target, STOP and report the difference. The plugin changed its integration and
   this wrapper needs a new mapping. Do not guess one.
3. Apply two substitutions to the write step, and nothing else:
   - the sheet: write `.claude/pstack-models.md` at the repository root, not the home path;
   - the include: keep the one line `@.claude/pstack-models.md` in the project `CLAUDE.md`,
     section "pstack model sheet". Do not write to `~/.claude/CLAUDE.md`.
   The skill's "load current state" step reads the tree copy as the current sheet.
4. After the write, check both home targets. `~/.claude/pstack-models.md` must be unchanged
   or absent, and `~/.claude/CLAUDE.md` must contain no `@` include of a pstack sheet. If
   either check fails, remove what the run added there and say so in the report.
5. Add the decision row to `.claude/skills/work/pstack-model-selection.md`, as that file
   requires: the date, what changed, why, and the founder's exact words.
6. Commit the two files, the sheet and the record, on the current branch. Stage nothing
   else. The message names the model or effort that changed, in words. If the branch is
   `main`, push it: a cloud session clones `main`, so the sheet reaches the cloud only after
   the push. On an item branch, the change rides along in that item's pull request.
7. Report: the roles that changed, the commit, and whether it is on `main` yet.

## Why a wrapper and not a copy

A copy of the plugin's setup skill with two paths changed goes stale at every plugin update,
silently. The wrapper runs whatever version is installed and fails loudly in step 2 when the
integration shape changes. That is the most an override can promise.
