# The tail: audit panel, then CI

Read this when the fix sitting after the code gate completes.

The audit is a claim check, and a fix moves the head: let the audit ruling and its fixing
finish, then watch CI on the FINAL head. Only the run whose SHA equals the final head counts;
the merge ruling records both SHAs.

The audit sitting is CONDITIONAL; the usual item is four sittings. Judgment sits in three
gaps — plan critique, code critique, CI verdict — and the audit-to-CI gap needs its own
sitting only if the audit found something. Otherwise the merge sitting absorbs both waits.

The panel is two readers: two runners, two distillates, spawned per `reviews.md`. Derive the
branch you take from BOTH distillates, never from anyone's word.

## Clean: both seats report zero findings AND each holds a real verdict

Spawn a MECHANICAL to commit and push the evidence: both raw outputs, both distillates, and
the opencode seat's tool-call summary and identity extract. **Your mechanical commits
evidence only — it never touches the pull request.** The merge tail — publishing the body,
the ruling comment, the merge command — has exactly ONE executor, and the MERGE SITTING
spawns it: a boundary two actors can cross is not a boundary. Spell the limit into the
mechanical's spawn prompt: commit these files, push, nothing else.

The evidence push moves the head, so arm CI on the NEW head (read `ci-watch.md` before the
item's first arming). Spawn the MERGE sitting only at a terminal run. **The CI wait is YOURS
— a sitting never holds it**: a sitting alive through a wait is judgment capacity buying
nothing.

## Findings, or ambiguity, in EITHER seat

Findings in either seat — or ambiguity in either: a truncated file, output cut mid-write,
progress lines, no findings section — means spawn the AUDIT SITTING, with both distillates
named in its spawn prompt. One clean seat never outvotes the other's findings: the clean seat
is evidence for the ruling, not a veto over it. Ambiguity always buys MORE judgment, never
less — the cheap reading of a garbled file is the one that skips the sitting, and that
reading is banned.

## The re-run

The once-per-item audit re-run is of the WHOLE panel at the new head, never one seat alone —
half a panel re-run is a different gate wearing the same name. The re-run's sitting type is
in `sittings.md`. Audit artifacts MOVE the head: arm CI after that push, never before.

The tail completes at a terminal CI run on the final head, with the MERGE sitting spawned on
it. The merge sitting's state file saying done is the item's end, per the contract.
