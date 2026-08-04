# AI4DEV-21 (fake Stripe, GitHub, Anthropic) — the merge ruling

**Ruled by:** the item agent (fable), holding full authority over this item. 2026-08-05.

## What is authorized

Merging PR #35 into `main`, by marking it ready for review and queuing
`gh pr merge --auto --merge`, under exactly these conditions:

- The merge head is the CODE-AND-RECORDS state audited and ruled here: commit
  `5374a803841d8b00dc92b4f30e02f7adda31ee09` (the last state-changing commit) plus the single
  records commit that carries this ruling and the audit transcript. Nothing else.
- The required CI check `verify` is green on that EXACT final head — GitHub's auto-merge
  enforces this by construction, and the branch protection makes `verify` required, so a red
  head cannot merge at all.
- **Any push to the branch after this ruling's commit voids the ruling.**

## The evidence this ruling stands on

1. **The plan-level gate:** sol at max refuted the plan (6 findings, all accepted, plan
   amended); the two intent-level blockers — scope self-ratification, premature auto-merge —
   were resolved by a founder ruling (Option A, 2026-08-04) and a draft-PR sequencing
   decision (D8), both executed.
2. **The diff gate:** terra at max (CHANGES REQUIRED) + Kimi k3 at high (APPROVE), reviewed
   in the worktree. All eight findings ruled CLOSED BY FIX by this agent under the founder's
   2026-08-05 no-confirmation ruling — dispositions with file-and-line evidence in
   `gate2-rulings.md`. No finding rejected; no unearned-green claim dismissed.
3. **Verification at `5374a80`** (`verify-final-3.txt` and the CI run): typecheck clean,
   harness selftests 167/167, the expect gate an exact match — 11 green / 1 red — and the
   acceptance bijection 12/12.
4. **Falsification:** four transcripts (`proof-f1..f4.txt`) each showing a named cheating
   implementation caught RED by the maintained oracles; luna verified no mutation residue.
5. **The independent audit:** luna at max, workspace-write, in this worktree
   (`premerge-audit.md`): boxes 1/4/5/6 verified by its own runs; boxes 2/3
   COULD-NOT-VERIFY-IN-SANDBOX with the known platform-worktree vitest signature,
   substituted by PR #35's CI `verify` run at the same SHA (167 tests, expect exact). Its
   runtime check of the declaration coupling: thrown set equals declared set, exact and
   ordered. Nothing adverse found.
6. **CI:** `verify` passed on `5374a80` (run recorded on PR #35); the FINAL head's own run is
   enforced by the required check at merge time.

## What the green claims, and what it does not

`AT-016.11`'s green claims: the harness's email provider seam, the suite's oracles and the
loop-tier reference stand-in discriminate end to end — sent-only-on-acceptance, observable
retry, lost-ack idempotency — against a simulator whose trace the sender cannot forge. It
claims NOTHING about the product: the system under test is a declared stand-in, and the
provenance ledger bars every stand-in from the integration tier that gates requirement
closure. `AT-016.01` stays red, declared, waiting on the static provider scan — a
real-source capability that lands when real product source exists.

## Closure this merge produces

The merge closes AI4DEV-21 on the board through the branch coupling — the branch is Linear's
own `gitBranchName` for the item. The five deferred vendor simulators are tracked as
AI4DEV-38 (Anthropic usage/cost sim), AI4DEV-39 (Stripe sim), AI4DEV-40 (GitHub sim),
AI4DEV-41 (Lovable credit sim), AI4DEV-42 (Linear tree sim) under AI4DEV-3 (AT harness),
which stays open — its fold is blocked by those and its other open children, exactly as the
founder's deferral ruling intends.
