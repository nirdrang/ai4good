# The plan phase — the item's first

Read this on your first turn, before the first sitting spawn.

This phase starts the item, so two things belong to you alone and to no later phase.

**Commencement.** Your first `FLOW` line must reach the coordinator within ten minutes of your
spawn. Until it arrives the item has no clock owner: the board says In Progress and nothing is
watching. Setup runs first — fetch, checkout, install, artifacts directory — so send the line as
soon as the tree is ready and the plan sitting is spawned, not after.

**The status log's first line.** Create
`loop/items/<ITEM>/artifacts/conductor-status.log` in this phase and append the item's first
event to it. The coordinator's backstop reads that file; a missing log at commencement is
indistinguishable from a dead conductor.

Then spawn the PLAN sitting — its type is in `sittings.md`, which you read first.

What the sitting does is its own business, not yours: it writes the plan, and it hands its own
mechanical the pull request to open, so the required CI check has a pull request to gate from
the first push onward. You never open the pull request and never touch it.

The phase completes when the plan sitting reports, its head is verified on the remote, and its
`PHASE-STATE.md` names the plan gate's reviewer. Then read `reviews.md`.
