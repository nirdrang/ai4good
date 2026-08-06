# Reflection on /work — AI4DEV-20 (written BEFORE the merge decision, so fixes ride along)

**Did /work behave as intended?** Substantially yes, with three machinery failures worth fixing
and one observation worth keeping.

## What worked
- **The gates earned their cost.** Gate 1 (sol) materially reshaped the plan: it refuted a
  claim I had stated as settled (stubbed-capabilities semantics), forced the recorder/provenance
  design that later PROVED load-bearing, and pushed the credential surface out of test children
  entirely. Gate 2 then found a real hole in the exact mechanism Gate 1's ruling had called
  impossible (the shadow-key overwrite) — two independent reviewers, two different real
  defects, neither findable by the author's own eyes. The no-confirmation-step flow (founder
  2026-08-05) worked: rulings closed the loop faster than re-engaging reviewers would have,
  and luna + CI are the checks on the fixes.
- **Honest-state records kept greens honest.** The NOT-RUN live-smoke record, the empty
  recordings directory, and luna's COULD-NOT-VERIFY-IN-SANDBOX marking all did exactly what
  the doctrine wants: nothing green claims more than it proved.
- **Push-at-every-phase-boundary was load-bearing twice.** This item's agent died twice on the
  account session limit; both times everything of value was already on the remote and nothing
  was lost. The rule paid for itself in full.
- **Executor mutation-checking** (self-initiated in round one, demanded in round two) turned
  "the tests pass" into "the tests catch the specific regressions they exist for" — worth
  keeping as executor practice.

## What failed, and the fixes riding along in this PR
1. **A subagent's completion report silently reached the coordinator instead of its parent** —
   the executor could not resolve `item-agent` as a name, sent its report to `main`, and this
   item agent slept through its own child finishing. FIX (SKILL.md, token discipline): pin the
   channel at spawn time — the child's last act is committing and pushing a named completion
   file; that remote-visible file is the channel of record.
2. **The tracked-child alarm never fired across four phases of this item** — every wake came
   from the coordinator's named-file backstop. The earlier fold already said "two channels,
   neither trusted alone"; this item's experience confirms the backstop is currently the
   WORKING mechanism, and the new completion-file rule (fix 1) makes the file channel primary
   for subagent phases too.
3. **A read-intended reviewer wrote probe files into the tree mid-review** (Kimi, verifying
   the shadow-key hole empirically — it cleaned up, but nothing required it to). FIX
   (SKILL.md, reviewer mechanics): every reviewer launch prompt states the write policy;
   empirical-probe reviews require cleanup plus a final clean git status in the report.

## Observation kept, no rule change
Windows launch mechanics cost a round of failures (npm shim not a Win32 executable;
PowerShell 5.1 Start-Process joining arguments unquoted). Not a /work defect — but the
resolved invocation pattern (native codex.exe path, pre-quoted argument elements) is now in
this item's transcript and worth lifting into the skill only if it bites a second item.

## Proportionality check
Ceremony stayed roughly proportionate: one plan, two gates, one fix round, one audit for a
~2,600-line-diff harness slice with two BLOCKER-grade defects caught pre-merge. The costliest
overhead was wake/park churn from the broken alarm channels — which is what the two skill
fixes address.
