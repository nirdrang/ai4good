# The code gate: run or skip

Read this when the draft sitting completes, before spawning the code gate's runners.

Proportionality is DERIVED, never declared. Nobody — not the orchestrator, not you, not the
coordinator — gets to say "this item is small, skip the review". The only input is the diff.

Before the code gate, compute whether the diff reaches code, using CI's prose-only fast-lane
rule — the SAME rule CI applies, so the skip and the pipeline can never disagree about what
the item touched.

If the diff reaches code: the gate runs. Nothing else in this file applies; return to the
contract's boundary sequence and spawn the gate's runners per `phase-reviews.md`.

If the diff is prose-only: skip the code gate, and record the skip TWICE — in the flow line
and in the state file — so the merge ruling can say, in so many words, that this green
includes no code review. An unrecorded skip looks identical to a reviewed gate from the
board, and that is the defect the double record prevents.

A skipped gate still gets its fix sitting, spawned with zero findings. The verify suite and
the audit brief happen in that sitting; only the critique is skipped. The sitting is not
ceremony: no other sitting owns the suite run or the audit brief.

This decision completes either when the gate's runners are spawned (diff reaches code), or
when the skip is recorded in both places and the zero-findings fix sitting is spawned
(prose-only).
