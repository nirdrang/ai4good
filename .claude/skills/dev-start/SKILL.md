---
name: dev-start
description: Begin implementing one dev-tree leaf of the currently bound requirement — the dev-level open (the equivalent of /pm-next, one tier down). Ergonomic packaging only: branch + implement-brief + In Progress. Never creates a binding (leaves ride the requirement's) and never touches the PM item.
---

# /dev-start [leaf] — begin a leaf (DEV board, inside the bound requirement)

**Verb tiers:** requirement = `/pm-next`, `/pm-done`; leaf = `/dev-start`, `/dev-end`.
**Leaf verbs are ERGONOMIC packaging for the inner coding loop — NOT authorities.** They keep
the two-tree invariants intact: attribution stays requirement-level (a leaf rides the
requirement's binding — this verb writes NO binding), the PM item's only movers remain
`/pm-next` and `/pm-done`, and because the dev tree is revert-exempt these dev-board moves are
legitimate, not status theatre. A disabled skill loses nothing — every step below is doable by
hand.

## Ritual

1. **Require a pulled requirement.** `Read-Binding` must name a `task` requirement in THIS
   worktree. None → STOP: "pull the requirement first (`/pm-next`); leaves belong to a pulled
   requirement." No new binding is written here — the leaf inherits the requirement's.
2. **Pick the leaf.** Named, or propose the next UNBLOCKED leaf of the bound requirement — all
   its manifest `blocked-by` leaves are Done on the dev board (use `materialize.ps1`'s dep graph
   + `list_issues` states). Refuse a blocked leaf, naming its incomplete blockers. Refuse a leaf
   already In Progress in another worktree (quick freshness read).
3. **Branch.** Check out the leaf's Linear `gitBranchName` — `git switch -c <branch>` off the
   requirement's base (or switch to it if it exists). The branch is the link that will carry the
   eventual PR to this leaf; the dev-tree state rides it.
4. **Implement brief.** Print the goal: the leaf's summary; its verify set (the AT ids); the
   actual Given/When/Then text for those ids from `at-req-0NN.md`; the loop-tier verify command
   (`pnpm at:verify req-0NN --tier loop`); and any cross-manifest fixtures the manifest flags.
   Implement those ids test-first.
5. **Mark In Progress.** `save_issue` the leaf → assignee me, state In Progress (dev board,
   revert-exempt; truthful because work starts now). NO PM change. NO attestation. NO stamp
   change — messages keep stamping the requirement.
6. **Report.** "Implementing <leaf> on <branch>; test-first: <verify set>; blockers clear."

## Never
- Never without a bound requirement (step 1). Never write a binding — leaves ride the
  requirement's (attribution stays requirement-level, d82). Never touch the PM item. Never start
  a blocked leaf (step 2).
