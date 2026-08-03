# AI4DEV-5 — rulings 03 (Gate 2 fold and endgame rulings)

## Ruling 5 — the merge-decision install row: corrected with provenance, on the record

The executor, reading `merge-decision.md` as evidence, caught the first row of the local
verification table claiming a populated-tree no-change check ("533 installs across 637
packages, no changes") as if it were the from-scratch frozen-lockfile gate. It was the item
agent's re-run after the executor's own install had populated the shared worktree. RULING:
corrected in place WITH provenance per row (executor empty-tree install, item agent
populated-tree check, CI's ubuntu empty-tree install), and the correction is recorded in
the file rather than silently swapped — a number not measured on the commit it pins is the
exact failure this way of work exists to prevent, and the catch itself is the paper trail
working.

## Ruling 6 — kimi was reported dead; the evidence said alive; no relaunch

The coordinator twice reported the kimi Gate 2 reviewer dead (71-byte critique file, no
process by that name). Direct measurement said otherwise: its task transcript grew 46,375 →
49,830 bytes across a 25-second window with the last-write timestamp advancing, and the
transcript showed real review work (twelve executed simulations of the ownership guard —
including the rename-crossing FAIL case and the 1,500-renames-no-ceiling case — then YAML
validation). Kimi streams progress to stderr and writes its final answer to stdout at the
end, so a small stdout file mid-run is expected, not diagnostic. RULING: do not kill, do
not relaunch a live working reviewer. Contingency stands: if the finished critique contains
no findings section, one relaunch (short -p, stderr captured); failing that, Gate 2
proceeds on terra alone and says so.

## Ruling 7 — branch protection attempted, denied by the permission layer, not faked

`gh api -X PUT repos/nirdrang/ai4good/branches/main/protection` with
`required_status_checks: {strict: false, contexts: ["verify"]}` (all other observed
protection flags preserved as-is) was blocked by this environment's permission classifier.
Per decision 11: recorded plainly here, in the merge decision, and in the item report with
the exact command for the founder. No workaround attempted — the denial's intent is that an
admin-surface change needs a human, which is also what decision 11 assumes.

## Gate 2 — codex gpt-5.6-terra @ max (diff), session 019fc486-10de-7891-8a5d-18f277464475

One finding, no others at any severity: BLOCKER claimed — on forked pull requests the
`pull_request` payload is empty, so the checkout ref falls through to the synthetic merge
sha, and the guard gets an empty PR number. Confirmation resumed in the raising session;
terra produced its citation verbatim and UPHELD, while itself stating the finding "would
not remain a BLOCKER even if the premise held" under this repository's operating model.

The item agent then verified the citation directly against the documentation page:
the sentence IS real — "The pull_request webhook event payload is empty for merged pull
requests and pull requests that come from forked repositories", a NOTE bullet under the
pull_request event in "Events that trigger workflows". It also contradicts load-bearing,
ecosystem-wide behaviour (fork detection via `github.event.pull_request.head.repo.*`
comparisons and fork-PR head checkouts require a populated payload), and no second page
corroborates the empty-payload reading. The documentary record is contradictory; neither
reviewer memory nor one doc bullet settles it, and this ruling does not pretend to.

RULING — no workflow change, severity re-graded to documented out-of-model limitation:
1. Fork pull requests are outside this repository's operating model: exactly two writers
   (the Lovable bot and the Claude side), both pushing branches inside the same repository.
2. Decisive: UNDER EITHER READING, no false green is possible. Populated payload — the
   workflow behaves exactly as designed. Empty payload — the guard's API call receives an
   empty PR number, fails, and the step FAILS CLOSED with its could-not-read refusal, while
   the report step visibly prints "pull request head: (not a pull request)" on a
   pull_request event. An out-of-model PR failing loudly is acceptable; a wrong verdict is
   unreachable in both worlds.
3. Terra's proposed pre-checkout resolver (derive PR number from GITHUB_REF, fetch head sha
   by API before checkout) adds a second API dependency ahead of checkout to serve pull
   requests this repository does not accept — complexity with no in-model beneficiary.
   Rejected.
Recorded here and in the merge decision. Not a founder matter: no ratified text is
contradicted — the decisions assume same-repository operation throughout.

## Gate 2 — kimi kimi-code/k3 @ high (diff): zero findings standing

Zero blockers, zero majors. One MINOR claimed: an unfiltered `pull_request` trigger fires
on every activity type, so a label edit cancels an in-flight run. Confirmation resumed
(`kimi -c`, same working directory): kimi could not produce a supporting sentence, quoted
the documentation's actual default — "By default, a workflow only runs when a pull_request
event's activity type is opened, synchronize, or reopened" (independently verified by the
item agent on the same fetch as above) — and WITHDREW. FINDING 1: WITHDRAWN, verbatim.

Kimi's positive evidence stands and is part of the record: all four amendments verified
APPLIED by execution (twelve adversarial guard cases including rename-crossing and the
1,500-renames ceiling case; real step bodies run against the tree; exit-code legends
checked against harness sources; YAML parsed; head-commit path confirmed single-checkout).

## Gate 2 net result

Zero changes ordered to the workflow. Both reviewers' single findings disposed through
confirmation in their own sessions — one withdrawn by its reviewer, one re-graded with the
reviewer's own concession plus a fail-closed analysis under both readings of a
contradictory documentation record.
