# AI4DEV-44 (conditional audit sitting) — the landing record

## What was wrong

The relay landed with the audit ruling as its own **unconditional** sitting, so every item cost
five orchestrator sittings. The design session had settled on four — plan, build, dispose, merge —
and the four was right. The fifth was a conditional hardcoded as though it were structural.

## The reasoning

A sitting exists to put judgment between two waits, so the count of sittings is the count of waits
plus one. There are four waits: the plan gate, the code gate, the audit, and CI. Five sittings
follow only if judgment is required between *every* consecutive pair.

Three of those gaps genuinely need it. The plan critique must be ruled before code is written; the
code critique before the fixes are applied; CI's verdict before anything merges. **The gap between
the audit and CI is the exception — it needs judgment only if the audit found something.** A clean
audit has nothing to rule, so those two waits sit back to back and the merge sitting absorbs both.

That is four sittings, and it maps exactly onto the names the design session chose: `build` is the
draft, `dispose` is fix-and-goal, and `merge` was always meant to read the audit result *and* the
CI result.

(The draft/fix split is a separate matter and stands: the code gate has to sit between writing the
code and making it green, or reviewers critique code that is about to change anyway. But that split
is one wait and one boundary — it did not add a sitting.)

## What changed

**`conductor.md`** gains the conditional, deriving it from the distillate exactly as it derives
proportionality — never from anyone's declaration:

- **Clean** — zero findings **and** a distillate that reads as a real verdict. A mechanical commits
  the audit's raw output and distillate and pushes; CI is armed **on that new head**; the merge
  sitting is spawned. No audit sitting.
- **Findings, or anything ambiguous** — truncated, cut off mid-write, or progress lines with no
  findings at all — spawns the audit sitting. **Ambiguity buys more judgment, never less**, the same
  reflex that sends CI down its slow path when it cannot read the changed-file list. An empty gate
  must never be mistaken for a clean one.

**`WORKFLOW.md`** expresses it at step 52 without renumbering the tail, and the roles table now says
four sittings per item, five when the audit finds something. "No audit sitting on a clean audit"
joins the deliberately-absent list.

**Both orchestrator twins** gain the sitting count with its reasoning, mark the audit sitting as
conditional, and — the part that would otherwise go silently missing — make the merge sitting
responsible for recording the clean audit's verdict among the dispositions. A clean audit is
evidence and belongs in the ruling; it must not read as a step that quietly did not happen.

## The ordering detail that would have bitten

Committing the audit artifacts **moves the head**, so CI is armed after that push, never before.
This is the same trap as a state file that cannot name its own commit, and it is written into both
the conductor contract and the workflow step so nobody has to rediscover it.

## What it saves

One premium sitting — roughly forty thousand tokens of cold reading — on every item whose audit
comes back clean, spent ruling a list that is frequently empty.

## Provenance and process notes

Motivated by the founder's question on the merged relay item (ref AI4DEV-43): *"Why 4 and not 5
sittings?"* The answer was that four was right, which is why this is a correction rather than a
redesign.

Built serially in the founder's session rather than through the new relay. Two reasons, both worth
recording: a three-file prose edit does not warrant seven roles and four external reviewers —
ceremony out of proportion is how a process stops being followed — and changing the relay's own
flow *while* running the relay would make any misbehaviour impossible to attribute to either. The
relay's first real exercise should be a code item, where its gates earn their keep.

**A base-branch hazard caught at pickup.** This branch was first created from local `main`, which
carried an unpushed founder commit (`e4c28e9`, a statusline change) made minutes earlier in
parallel. Left alone, that commit would have ridden into this item's pull request and been
attributed to AI4DEV-44. The branch was re-based onto the pushed `origin/main` instead; the
founder's commit remains untouched on local `main`. Worth generalising: **branch from
`origin/main`, not local `main`** — local `main` can carry someone else's unpushed work, and a
pull request is exactly where that becomes a wrong attribution.
