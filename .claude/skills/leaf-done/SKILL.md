---
name: leaf-done
description: Complete one dev-tree leaf — the dev-level close (the equivalent of /done, one tier down). Verify the leaf's tests, land the PR (the merge flips it Done), reconcile its parent, suggest the next leaf. No PM touch, no attestation — that is /done's job.
---

# /leaf-done [leaf] — complete a leaf (DEV board)

**Ergonomic packaging, not an authority.** The leaf's real Done comes from the PR MERGE
(vendor-native); this verb packages verify → land → reconcile → suggest around it. It never
moves or attests the PM item, and never fakes a state the merge should produce. A disabled skill
loses nothing.

## Ritual (any failure → report the named failure and STOP — a leaf is not done)

1. **Target.** The leaf being worked (In Progress, its branch checked out), or the one named.
2. **Verify gate.** Run the leaf's verify set — `pnpm at:verify req-0NN --tier loop` (the
   requirement's full integration-tier sweep is `/done`'s job, not the leaf's). Red → name the
   failing AT ids, STOP. Until the AT harness (AI4DEV-3) exists this FAILS CLOSED, by design —
   say so plainly.
3. **Commit clean.** The leaf's work is committed on its branch; `git status --porcelain` empty.
4. **Land it.** Push the branch; open a PR linked to the leaf; the founder merges (self-merge).
   The MERGE is what flips the leaf → Done (the GitHub↔Linear integration) — the verb does not
   fake it. (If PRs are skipped for a trivial leaf, moving the dev leaf → Done directly is
   allowed — dev tree is revert-exempt — but PR-drives-state is the norm.)
5. **Reconcile the parent (Linear MCP).** If the leaf's deliverable now has all sub-issues
   Done/Cancelled, `save_issue` the parent → Done — the same reconcile `/done` sweeps; this is
   how we overcome Linear's no-auto-close-parent.
6. **Suggest next (once, suggestive — never auto).** Propose the next unblocked leaf → offer
   `/leaf-start`. If this was the LAST leaf and every parent is closed, note the requirement is
   ready for `/done` (its integration-tier suite + attestation).

## Never
- Never Done a leaf whose verify set is red (step 2) or over a dirty tree (step 3). Never move or
  attest the PM item — that is `/done`. Never fake the leaf's Done — it comes from the merge.
  Reconcile closes only a PARENT whose leaves are all closed, never a leaf. Never auto-advance
  (step 6 is a suggestion).
