# Drill gate prompt — stand-in reviewer, not a real gate

## The DRAFT CODE review

This is a control drill of the relay's waiting and hand-off machinery. The process launched
against this prompt is a scripted stand-in (`loop/drills/fake-actor.ps1`) and never reads this
file. The file exists so the runner's own pre-launch checks run against a real prompt, exactly
as they would on a live gate.

Write policy, stated in words: this review is read-only; the reviewer writes nothing into the
tree, and nothing in the tree may be modified on its behalf.
