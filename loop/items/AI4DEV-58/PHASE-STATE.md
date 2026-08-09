# PHASE-STATE — AI4DEV-58 (GitHub sign-in, mandatory GitHub link)

**Phase just completed:** FIX AND GOAL (sitting 3, `orchestrator` on fable, claude-fable-5 @
xhigh).
**Next phase:** AUDIT — one read-only auditor run against this sitting's closing head, using
`loop/items/AI4DEV-58/audit-brief.md`.

## What this sitting did
- Ruled on all 8 gate-2 findings as 7 rulings (`loop/items/AI4DEV-58/gate2-rulings.md`): slice
  A finding 4 and slice B finding 1 are ONE defect (the RPC-arity deployment bridge, R4);
  slice B finding 2 is subsumed by R1 (R6). Adopted: R1/R6 (whitespace-aware, element-wise
  emptiness), R3 (the extractor on the tested path), R4 (accept-fixed-differently: `default
  null` bridge + edge key omission, staged-rollout demonstration rejected), R5 (the
  volunteer_profiles revoke — verify-first half already verified against the committed capture),
  R7 (live-proof citations repointed). Rejected with the risk recorded: R2 (database-side
  provenance of stub statistics — unenforceable without a second copy of the rule).
- Rulings and the plan amendment were pushed BEFORE any code, at `d034dc2`.
- The executor (opus, ONE invocation, three commits `0d5400a`, `35f94a5`, `e5b9624`)
  implemented every adopted ruling, refreshed `migration-replay.txt` (extended capture), wrote
  and ran the live proof (9 checks, 8 passed, 0 failed, 1 skipped — the skip is the GitHub
  authorize redirect, no client id in the environment, the expected case), and closed step 7 in
  ONE iteration: all six verify commands exit 0, req-001 at exactly 7 green / 30 declared red,
  req-016 unchanged from baseline. Transcripts: `proof-local.txt`, `verify-final.txt`.
- Five executor deviations ruled in the gate2-rulings addendum. Notable: `\013` not `\v` in the
  whitespace set (PostgreSQL has no `\v` escape — the ruling text's suggestion was a near-miss,
  the implementation is the ruling's intent); `step4-serves.txt` is SUPERSEDED as serve evidence
  (the draft-phase serve may have answered from a deleted worktree; `proof-local.txt` from a
  verified serve is the live evidence).
- The audit brief was written: `loop/items/AI4DEV-58/audit-brief.md`. Gate-2 raw critiques and
  distillates were already committed at `77caa90`.

## What completes the AUDIT phase
- ONE auditor run, read-only, whole-tree access, change-only scope, at this sitting's closing
  head (the conductor names the exact SHA from the completion report and verifies it against
  the remote). The brief is the subject; execution is forbidden by the brief — the auditor must
  not run the suite, the stack, or the build (`bun run build` would rewrite `src/routeTree.gen.ts`
  and create a territory violation).
- Raw output and distillate land in `loop/items/AI4DEV-58/artifacts/`.
- **Findings → an audit sitting rules them. Clean → the merge sitting absorbs the audit's wait
  and records the clean verdict among its dispositions** (the conductor derives which from the
  distillate, per its proportionality rules).
- The audit re-runs at most once for this item, and only if code changes.

## Measured facts carried forward (supersede earlier notes)
- **A fabricated `auth.identities` row needs EIGHT columns, not the five marked NOT NULL:**
  `created_at`, `updated_at`, `last_sign_in_at` are nullable in the schema but GoTrue scans
  them into non-pointer Go timestamps — a five-column row makes `GET /auth/v1/user` answer 500
  and the edge function 401, indistinguishable from an expired token. Measured 200 → 500 → 200.
  (The earlier five-column note in this file is superseded.)
- The edge runtime holds keep-alive connections across `db:reset`; its first rpc afterwards
  fails at the transport layer (502). Restart the runtime after a reset; do not retry until
  green.
- The local stack and a `supabase functions serve` FROM THIS WORKTREE are running (executor
  background task `bxb22m5k7`).
- `proof-local.txt` is redacted from the start (standing instruction, held — a secrets grep of
  the item directory is clean).

## For the coordinator to FILE (handed up in the completion report)
- **Carried (gate-1 F3):** the post-signup unlink product question — `enable_manual_linking =
  true` opens Auth's unlink surface; no acceptance id covers post-signup identity lifecycle.
- **New (gate-2 R5 scope note):** the predecessor's four tables (`accounts`, `acknowledgments`,
  `org_memberships`, `organizations`) each grant REFERENCES/TRIGGER/TRUNCATE to anon,
  authenticated AND service_role — Supabase default-privilege residue, measured in the refreshed
  `migration-replay.txt`, pre-existing on main, NOT fixed on this branch.
- **New (process, gate2-rulings addendum Dev-4):** a `supabase functions serve` can outlive its
  worktree and keep answering preflights from a deleted directory — a serve that looks alive
  while serving nothing current. Worth folding into the worktree-lifecycle lessons.

## Open questions for the founder
- None blocking. Carried FYI: a GitHub OAuth app (client id + secret) is a founder-manual step;
  its absence is the expected case (the one SKIP in the live proof) and blocks nothing.

## Notes for the MERGE sitting
- The PR body (`pr-body.md` and the live pull request) still describes the draft-under-review
  state; the merge ruling rewrites it.
- The merge ruling's "what the green does and does not claim" must carry plan section 4's list
  INCLUDING the R2 sentence (statistics provenance is not database-enforced) and the standing
  ones: no OAuth handshake, no real import, no `linkIdentity` round trip proved.
