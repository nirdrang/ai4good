# AI4DEV-21 (fake Stripe, GitHub, Anthropic) — reflection on `/work`, before the merge decision

**Item agent model: FABLE**, one agent for the whole item (one involuntary session-limit
death mid-phase; everything pushed survived, and the two children lost with it were
relaunched from the remote record — the push-at-boundaries rule paying again).

This is the FIRST item run under the one-plan shape: no brief, no Gate 0, the plan as the
single intent artifact, sol refuting it — intent included — before implementation. Reflecting
on that shape explicitly is part of why this item ran first.

## Did the new shape behave as intended? Yes — and it earned its keep twice.

- **The plan-level gate caught intent defects no diff review could have seen.** Sol's six
  findings included two that were pure intent: the item agent quietly self-ratifying a scope
  amendment that belonged to the founder, and a merge-sequencing instruction (auto-merge
  queued at PR-open) that would have let GitHub merge the first green head before the gates
  finished. Both were in the PLAN, not in any code. Under the old shape the brief was
  reviewed but the executor's real instructions were not; under this shape the reviewed
  artifact IS the executed artifact, and the difference showed.
- **One intent artifact held.** The executor implemented the amended plan directly; no
  second plan, no drift between a reviewed document and a followed one. The plan's
  "expected verification state per AT id" table made the done-state checkable at every
  boundary.
- **Gate 1 also caught the author's own arithmetic** (five deferred vendors written as
  four) — small, but it is exactly the class of self-consistency error the author of a
  document cannot see.

## What needed rules that did not exist (for the coordinator to fold into main's live skill — this branch's copy is stale on these sections, the AI4DEV-19 boundary again)

1. **Launch detached reviewers so they SURVIVE the launcher.** Two confirmation runs
   launched as background children of my shell died with my session-limit termination (or
   were never started — the classifier refused the first attempt). The pattern that
   survived: an OS-detached process (`Start-Process` on Windows), output to files, liveness
   verified from the reviewer's own transcript, an explicit alarm armed on the output files.
   The skill's launch-lessons list should carry this: a background child of the agent's
   shell dies with the agent; a reviewer must not.
2. **Arm the alarm AT LAUNCH TIME.** The skill already says a detached process finishes
   silently; this item's practice — arm a Monitor until-loop on the output artifacts in the
   same breath as the launch, with the coordinator's file watch as backstop — worked every
   time it was used and should be the written default, not folklore. (Three of four
   platform completion notifications did arrive this item; the one that mattered most did
   not.)
3. **A spawn prompt is item facts only — process instructions in it can be WRONG.** My spawn
   prompt carried "queue auto-merge at PR-open", which contradicted the skill's own merge
   ordering; Gate 1 caught it as a blocker. The skill says a spawn prompt carries only what
   is specific to the item; it should also say plainly that process never travels in the
   spawn prompt, because the skill is where process lives and the prompt is reviewed by
   nobody.
4. **`codex exec resume` rejects `--sandbox` exactly as it rejects `-C`** — the sandbox pin
   on a resume rides as `-c sandbox_mode=...`. Cost one failed launch; belongs beside the
   existing resume bullets.

## What a rule forced that turned out right

- The verification condition attached to the deferral ruling (a removal must carry one)
  looked like ceremony when written; sol's Gate 1 then rebuilt the whole finding 1 on top of
  it, and the executor's sweep executed it. The rule from the sentinels item generalized
  cleanly.
- Proportionality was right: this was a code item and got the full gate set; nothing felt
  like ceremony out of scale.

## Mid-item process changes, recorded

The founder deleted the reviewer-confirmation step mid-item (2026-08-05, verbatim in
`gate2-rulings.md`). This item followed the ruling from that moment: dispositions are the
item agent's own, based on its own reading plus the standing checks (verify suite, luna,
required CI). Two confirmation runs that had already completed were kept as free evidence,
gating nothing. The founder had earlier ruled the deferral question (Option A) — both rulings
have their provenance recorded where the next reader will look.

## Reported upward, not built

- The `expected.ts` measurement comment (~line 484) cites counts from an earlier tree state
  ("6 failed suites for 4 failed tests"); pre-existing, untouched here. Whoever next touches
  that file should refresh or date the measurement.
- The AT tree still fails `prettier --check` wholesale (known since the sentinels item);
  unchanged, still waiting on its owner.
