# AI4DEV-58 (GitHub sign-in, mandatory GitHub link) — DRAFT-SITTING RULINGS

**Sitting 2 of the item: DRAFT. Ruled by the `orchestrator` definition on fable (claude-fable-5,
effort xhigh).** The gate-1 rulings are the file beside this one; this file rules on what the
draft itself surfaced — one dispute the executor correctly declined to decide, and its three
reported deviations.

**Draft built by the executor (opus, one invocation, one failing check fixed on the second
attempt), final code commit `766fcbd`, pushed.** All five gate-1 rulings implemented as ruled,
per its report; the audit checks that claim against the tree later.

---

## The D-K split trigger — measured 1148 insertions / 78 deletions outside `loop/items/` · **THE TRIGGER FIRES: two review slices**

D-K reads: *"if the draft exceeds 1200 changed lines outside `loop/items/`, the draft sitting
splits the code gate into two prompts (SQL + configuration, and TypeScript + tests)."* The
executor measured 1148 insertions and 78 deletions (1226 combined) and reported the ambiguity
instead of ruling on it — correctly.

Ruled: **"changed lines" means insertions plus deletions** — the total a diff stat reports, and
the honest measure of what a reviewer must actually read, since judging a deletion requires
reading what was deleted and why. 1226 > 1200; the gate splits into
`gate2-prompt-sql-and-config.txt` and `gate2-prompt-typescript-and-tests.txt`.

A second, independent reason recorded so the tiebreak is principled rather than convenient:
where a cap's wording is ambiguous, **the reading that widens review wins**. The reviewer
contract's assembly rules already state the direction — item-specific narrowing is forbidden
because "a gate that can be narrowed per item is a gate that will be." Reading the trigger
narrowly to run one review instead of two would be exactly that, 26 lines from the line.

## Executor deviation 1 — the contract/fixture seam landed in step 2's commit, not step 5's · **ACCEPTED**

Step 2's done-criterion requires typecheck green *with both modules imported by the acceptance
adapter*, which cannot hold while `_fixture.ts` still calls `validateCompleteSignup` with one
argument. The criterion itself forces the seam forward; no plan text changed meaning, and the
work is the same work in a different commit. This is a sequencing fact, not a scope change.

## Executor deviation 2 — GitHub push protection rejected the first push · **ACCEPTED; one standing instruction**

The step-1 transcript captured `supabase status` verbatim, including the local secret key.
Nothing reached the remote (verified by a second instrument — `git ls-remote` showed origin
unmoved), the transcript was redacted, and the three unpushed commits were rebuilt with
identical messages. Correct handling end to end.

**Standing instruction for the fix-and-goal sitting, so the same wall is not hit with more at
stake:** `proof-local.txt` (step 6) is written **redacted from the start** — no service-role
key, no JWT, no secret material verbatim — matching the predecessor's practice.

## Executor deviation 3 — one unplanned record file, `step4-serves.txt` · **ACCEPTED**

Step 4's draft-level evidence (the stack restart took the config; the function serves with the
new import loaded) had no named home in the plan because "exercised end to end" is deferred to
step 6. A record file is the right home; it joins the item evidence.
