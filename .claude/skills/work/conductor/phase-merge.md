# The merge phase — the item's last

Read this when the CI watch reports a terminal run on the final head, before spawning the merge
sitting.

Spawn the MERGE sitting only at a TERMINAL run, never while CI is still going; its type is in
`phase-sittings.md`, and it is one of the two sittings that run on `orchestrator-opus` by design. Its
spawn prompt names the final head and the CI outcome as facts — the outcome is a fact you
observed, never a ruling you made. A red, cancelled or timed-out run goes down exactly like a
green does, with the platform status attached per `phase-ci-watch.md`; whether it excuses the red is
the sitting's ruling.

**The merge tail is the sitting's, not yours.** The merge sitting spawns the one mechanical that
publishes the pull-request body, posts the ruling comment, and runs the merge command. You spawn
no mechanical in this phase — a boundary two actors can cross is not a boundary.

The phase completes when the merge sitting's `PHASE-STATE.md` says the item is done. Then:

1. Append the close event to the status log.
2. Send the final `FLOW` line.
3. Report one line to the coordinator. Say `slot release due`, never `slot freed` — only the
   coordinator releases a database slot, and a state you did not produce is a claim, not a count.
4. End. The coordinator sweeps the worktree and the branch; you never delete either.
