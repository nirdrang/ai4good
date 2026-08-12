# AI4DEV-82 — worktree auto-clean incident (2026-08-12, PLAN sitting)

The PLAN sitting opened into the conductor's worktree
(`.claude/worktrees/agent-aacbb10d5c85b1114`) and found it EMPTY and unregistered:
`git worktree list` did not name it, `Get-ChildItem -Force` counted 0 children, and the item
branch was checked out nowhere. The branch itself existed locally at 390042c (equal to main and
origin/main) with no remote ref — the conductor had created the branch and the tree but had
committed and pushed nothing.

Evidence of timing: the sitting's first file reads under the worktree path SUCCEEDED
(shared-invariants.md, window-gauge.ps1, statusline.ps1, settings.json, a glob of loop/drills/),
and reads two tool-batches later FAILED on paths that exist on main (run-drills.ps1,
stamp-hook.ps1). The tree had content at spawn and lost it mid-sitting.

Diagnosis: the platform auto-cleans an UNCHANGED worktree when an agent finishes (measured
2026-08-05, recorded in memory: "unchanged worktrees die at agent finish, committed ones
survive"). This tree had zero commits on its branch, so it was "unchanged" and eligible; some
agent in the session tree finished mid-sitting and the cleanup took the conductor's live tree
with it.

Repair (this sitting): `git worktree add` re-registered the same path on the item branch;
this file's commit and push are what mark the tree changed and create the remote branch, so the
same cleanup cannot take it again.

Lesson for the conductor contract: a conductor must push a first commit on the item branch
BEFORE spawning its first sitting — an empty branch plus a clean tree is auto-clean bait for the
whole item lifetime. Filed in the PLAN completion report for the conductor to carry upward.
