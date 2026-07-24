---
name: dev-end
description: Complete one dev-tree leaf — the dev-level close (the equivalent of /pm-done, one tier down). The leaf's verify set is already green from the implement loop (assumed, not re-run); land the PR (the merge flips it Done), reconcile its parent, suggest the next leaf. No PM touch, no attestation — that is /pm-done's job.
---

# /dev-end [leaf] — complete a leaf (DEV board)

**Verb tiers:** requirement = `/pm-next`, `/pm-done`; leaf = `/dev-start`, `/dev-end`.
**Ergonomic packaging, not an authority.** The leaf's real Done comes from the PR MERGE
(vendor-native); this verb packages verify → land → reconcile → suggest around it. It never
moves or attests the PM item, and never fakes a state the merge should produce. A disabled skill
loses nothing.

## Ritual (any failure → report the named failure and STOP — a leaf is not done)

1. **Target.** The leaf being worked (In Progress, its branch checked out), or the one named.
2. **Verification is ASSUMED, not re-run.** By the time you invoke `/dev-end`, the leaf's verify
   set is already green — you ran it test-first as the implement loop's own red→green cycle and
   approved it. `/dev-end` trusts that inner loop and does NOT re-run the tests. (The
   authoritative, machine-run verification is `/pm-done`'s FULL suite at integration tier — that
   is where cross-leaf regressions are caught, so nothing is lost by not re-running here.)
   Optionally note the last green result / commit for the record.
3. **Commit clean.** The leaf's work is committed on its branch; `git status --porcelain` empty.
4. **Land it.** Push the branch; open a PR linked to the leaf; the founder merges (self-merge).
   The MERGE is what flips the leaf → Done (the GitHub↔Linear integration) — the verb does not
   fake it. (If PRs are skipped for a trivial leaf, moving the dev leaf → Done directly is
   allowed — dev tree is revert-exempt — but PR-drives-state is the norm.)
5. **Reconcile the parent (Linear MCP).** If the leaf's deliverable now has all sub-issues
   Done/Cancelled, `save_issue` the parent → Done — the same reconcile `/pm-done` sweeps; this
   is how we overcome Linear's no-auto-close-parent.
6. **Suggest next (once, suggestive — never auto).** Propose the next unblocked leaf → offer
   `/dev-start`. If this was the LAST leaf and every parent is closed, note the requirement is
   ready for `/pm-done` (its integration-tier suite + attestation).

## Never
- Never invoke `/dev-end` before the implement loop's verify set is green — the verb ASSUMES it
  (the authoritative re-check is `/pm-done`'s integration-tier sweep); don't call it to "find
  out" if the leaf passes. Never over a dirty tree (step 3). Never move or attest the PM item —
  that is `/pm-done`. Never fake the leaf's Done — it comes from the merge. Reconcile closes only
  a PARENT whose leaves are all closed, never a leaf. Never auto-advance (step 6 is a suggestion).
