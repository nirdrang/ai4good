# AI4DEV-19 (planted markers, forced failures) — rulings on the confirmation round

**Item agent model: FABLE.** Third agent on this item: the first died on an expired login
mid-Gate-2, the second — an opus run, the documented fallback — died on the weekly usage limit.
Neither death was a defect in the work, and everything both produced was pushed.

Chain, re-derived by walking `parent` upward from the item on the board, not inherited from any
handoff: `~bringup > AI4DEV-3 (acceptance-test harness) > AI4DEV-19 (planted markers, forced
failures)`. `AI4DEV-3` has no parent and carries the `attr:bringup` label.

## Terra's confirmation completed, and its output outlived its agent

The second agent resumed both raiser sessions for confirmation and died before preserving either
output file. Terra's run in fact **completed**: the raiser session's own rollout
(`019fc7c7-c54b-7033-b161-1fe9cd46360b` — the same session that raised the Gate 2 findings)
carries the committed confirmation prompt and a `task_complete` event at 2026-08-03T21:34:54Z
whose final message answers the four findings one by one.

Attribution rests on four legs, each checked: the session id is the raiser session named in the
handoff; the prompt embedded in the rollout is `confirm-terra.txt`; the answer cites the
post-fix code and the re-captured proofs by file and line, which only existed after commit
`23ea24f`; and the completion time falls between the second agent's last push and its death.
That is beyond reasonable doubt, so the run is **used, not re-run** — re-running a completed
confirmation would replace the raiser's answer with a second derivation, which is the exact
thing resuming exists to avoid. Recovered verbatim into `confirm-terra-result.md`.

Kimi's confirmation run failed (exit 199, zero-byte output file) and never produced a
transcript. It is **re-run**, resuming the raiser session, against the post-fix head.

## The ruling table

| finding | terra's verdict | ruling |
|---|---|---|
| 1 — restart not causal | **PARTIALLY CLOSED** | residual verified true on the code. **Fix ordered** — cycle 1 of the 2 the gate allows. Below. |
| 2 — AT-016.09 oracle too narrow | CLOSED, lines cited | folded. Nothing further. |
| 3 — `nextId` outside the rollback unit | CLOSED, lines cited | folded. Nothing further. |
| 4 — proof files overclaim | CLOSED, lines cited | folded; note below on the re-capture this round forces. |

## Finding 1 — the residual is real, and it is this item's own thesis

Terra's residual, re-derived against the tree before ruling: `b-delivery-defaults.test.ts:39-41`
reads the epoch before and after the restart, but **no assertion requires the two to differ** —
they appear only inside a failure message. The comment at :37-38 delegates the obligation to the
harness guard, but `processEpochProblem` runs only inside `h.faults.processRestart()`
(`faults.ts:97-103`); a call that is deleted is a guard that never runs. Delete line 40 and both
reads return `delivery-process-1`, `drainDeliveries` stamps exactly that, `[...new Set(stamps)]`
still equals `[afterRestart]`, and the test passes.

So the mechanical statement of the original upheld finding — *a step whose removal changes no
outcome did not participate in the result* — is **still true of the restart call itself**. The
round-2 fix proved something real but conditional: WHEN the scenario restarts, a delivery path
that ignores the new identity fails (`proof-restart.txt`, RUN 1). It left the antecedent
unpinned. On the item whose whole subject is greens that are not earned, that residual does not
get ruled terminal while a two-line scenario pin closes it.

**Why a fix round is open at all.** `rulings-04.md` ends "this is the last fix round" — that
sentence closed the executor-challenge round, before any raiser had confirmed anything. The
standing cap is two fix→confirm cycles on the post-fix diff, and none were spent. A residual
confirmed by its own raiser, in false-green territory, with a fix this small, is what that
budget exists for. Fixing a false-green-class finding needs no escalation; only rejecting one
would.

**The fix** (ordered in `fix-brief-05.md`): AT-016.07 gains a third scenario precondition — the
restart actually produced a new identity — in the same family as the two mid-flight pins already
above it; the comment stops delegating to a guard that only runs if invoked and says which
obligation belongs to whom; the falsification is captured (delete the restart call → red,
restore → green) alongside the existing constant-stamp one; and all four proofs are re-captured
against the new final code commit, because the round-2 capture rule — capture only once the
final code commit exists, change nothing afterwards — binds this round exactly as it bound that
one.

**What stays terminal, unchanged from `rulings-03.md`:** at loop tier there is no volatile
in-flight state for a restart to LOSE, so "restart resilience" in the full sense still needs a
real delivery process, which is filed, not built. Terra's verdict language — "proves attribution
after an epoch change, but still overclaims restart resilience" — names that distance without
tagging the green unearned, and the distance is stated openly in the code (`:66-74`) and in
`proof-restart.txt`. After this fix, what the green claims at this tier is: a restart happened,
it changed the identity, the delivery path read it, and durable pending work completed exactly
once under the post-restart identity. Each clause has an oracle that can fail.

## Process note: both committed confirmation prompts pointed at a dead tree

`confirm-terra.txt` and `confirm-kimi.txt` direct the reviewer to read
`agent-adf5c7b803767a1c3`, the second agent's worktree — deleted when that agent died. Both
prompts are amended to this agent's worktree and to the post-fix head before the confirmation
wave runs. A prompt that survives its author must name a path that survives too; absolute
worktree paths in committed prompts rot the moment the worktree dies, and this is the second
time on this item (the Gate 2 findings themselves cite the first agent's tree). Carried into
the reflection.
