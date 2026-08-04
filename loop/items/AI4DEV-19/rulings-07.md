# AI4DEV-19 (planted markers, forced failures) — the merge ruling

**Item agent model: FABLE.** Ruling made under authority explicitly delegated by the founder on
2026-08-04. The escalation asked the founder to choose between merging with the reviewer's
maintained residual recorded (door A) and a scope change to keep AT-016.07 out of the green set
(door B). The founder's answer, verbatim: **"This is a judgement call to the orchestrator."**
So the call is mine, and this file is me making it.

## The disagreement, preserved next to the ruling that overrides it

Terra — the Gate 2 raiser, confirming as itself with its model pinned — closed findings 2, 3
and 4 and ruled finding 1 PARTIALLY CLOSED, maintaining, verbatim:

> "It proves attribution after a modeled identity change, not restart resilience; I still
> consider the 'across a restart' green unearned as a resilience claim."

That sentence stays here, in the PR body, and in the item's history. It is not smoothed away by
what follows; it is overruled by it, on delegated authority, for stated reasons.

## The ruling: door A — AT-016.07 stays green at loop tier; the item merges

Four reasons, each standing on its own:

1. **Every clause of the green now has an oracle that can fail, and each was falsified on
   purpose.** A restart happens (deleting the call is a captured red); it changes the process
   identity (the harness refuses a no-op restart); the delivery path reads that identity
   (stamping a constant is a captured red); durable pending work completes exactly once,
   attributed to the post-restart identity. None of that was true when terra raised the finding
   — its original mechanism ("a step whose removal changes no outcome") is closed by execution
   evidence in both directions, and terra itself confirms the falsifications are real.
2. **What remains unproven is a property of a process that does not exist at this tier, and the
   record says so everywhere a reader could look.** The loop tier runs the reference stand-in by
   definition; volatile in-flight loss-and-recovery needs a real delivery worker, which is filed
   in writing — in the test's own comment, the proof trailer, and three rulings — for whoever
   builds it. A green whose limitation is stated beside the assertion is the opposite of the
   silent overclaim this item exists to kill.
3. **Both remedies that would satisfy the tag were ruled out for cause, twice, by independent
   agents, and re-derived rather than inherited.** A throwaway "volatile" worker inside the
   fixture stages the proof it pretends to give; per-test capability-pending is machinery the
   registry deliberately lacks, and inventing it is harness surgery larger than the defect.
   Nothing in terra's confirmation disturbs either derivation — it proposes no third remedy.
4. **The cross-vendor reviewer independently endorses the repair.** Kimi, unprompted: the pin
   is sound, the harness guard correctly cannot cover a deleted call, and nothing serious is
   new. Two decorrelated reviewers agree on every fact; one draws a stricter conclusion about
   what a loop-tier title may promise. Titles are the requirement catalog's text, not this
   item's to edit; the tier boundary is the declaration's to enforce, and the integration tier
   — the closing gate — is where "across a restart" must be proven against a real process.

With this ruling the residual is **terminal** for AI4DEV-19: recorded, filed, overruled as a
merge blocker. Fix→confirm cycle 2 remains deliberately unspent (rulings-06.md); nothing is
left open that a cycle could close.

## Luna's pre-merge audit

Luna (max effort, workspace-write, in this worktree) verified six points, could not execute five,
and refuted none. Every could-not-verify failed on the pre-documented nested-worktree sandbox
signature — vitest's ancestor-directory config walk denied — which the audit brief itself names
and instructs to read as COULD-NOT-VERIFY-IN-SANDBOX, never as a red. Its recommendation,
verbatim, so nothing is smoothed:

> "The evidence does not support merging based on this audit: the core Vitest gates and
> fault-injection checks could not be independently executed in this sandbox, and Terra's
> maintained restart-resilience concern remains escalated."

Ruled on as follows:

- **Verified by luna:** typecheck clean; `at:check req-016` in bijection; all four proofs name
  `a970880`, `proof-green.txt` carries the real `--expect` transcript, and the active stack
  references match the current source; the confirmation files say what the rulings claim they
  say; the diff stays in Claude territory with nothing outside `loop/items/` after the code
  commit; the comments — including the scenario-pin block and the unfailable-assertion note —
  claim no more than the code delivers. It also applied BOTH falsification mutations and both
  guard-break probes and restored them fully, leaving `git status --porcelain` empty.
- **The five unexecuted checks take their execution evidence from three sources, each named:**
  (a) the required `verify` CI check on the exact pinned head — typecheck, the harness
  self-tests, the bijection check and the `--expect` gate in a clean environment; that check
  being green on the pinned head is a merge PREREQUISITE, so the evidence the sandbox denied
  luna is produced by the very gate the merge waits on; (b) the captured falsification
  transcripts, whose claims luna verified against the source even though it could not re-run
  them; (c) this agent's own unsandboxed runs in this worktree today — `--expect` exact match,
  selftest 153/153, typecheck clean — corroborating the executor's. The guard-break probes
  (check A) remain unexecuted by any independent party; the conformance wall covering those
  guards runs inside `at:selftest` on CI, and that residual gap is recorded here rather than
  papered over.
- The audit's second concern — the escalation — is resolved above: the founder delegated the
  ruling and this file is it. Nothing luna verified contradicts any of the four grounds; what it
  verified is precisely the honesty of the artifacts those grounds rest on.

## Merge authorization, pinned

The merge is authorized for **the commit that adds this ruling and the audit report** — its SHA
is recorded in the pull request body at open time, and the authorization holds for that head and
no other. Verifiable properties of that head: the tree differs from `88e2be9` only under
`loop/items/AI4DEV-19/`; the final code commit is `a970880`; the required CI check (`verify`)
must be green on exactly that SHA before the merge completes — auto-merge is queued so GitHub
performs the merge only when that check passes on that head.
