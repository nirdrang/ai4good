# PHASE-STATE — AI4DEV-58 (GitHub sign-in, mandatory GitHub link)

**Phase just completed:** AUDIT (sitting 4, `orchestrator` on fable, claude-fable-5 @ xhigh).
**Next phase:** MERGE — straight to CI and the merge ruling. **No second audit run** (reasoning
below and in `loop/items/AI4DEV-58/audit-rulings.md`, final section).

## What this sitting did
- Ruled the three findings from the read-only audit (gpt-5.6-luna, raw and distillate in
  `loop/items/AI4DEV-58/artifacts/`), in `loop/items/AI4DEV-58/audit-rulings.md`, pushed at
  `6e9faee` BEFORE any fix landed:
  - **Finding 1 (high) ADOPTED** — record-is-false class. The `edge.ts` header comment cited
    the predecessor item's runnable proof script instead of its transcript and omitted schema
    supersession, against gate-2 ruling R7's explicit text. The executor (opus, one invocation,
    commit `4d9ace9`) corrected the sentence to mirror the fixture's already-correct one;
    comment text only, 4 insertions 3 deletions, one file. The orchestrator read the final hunk
    against the ruled sentence: it matches.
  - **Finding 2 (high) REJECTED — the auditor is wrong.** The flagged
    `postgresql://postgres:postgres@127.0.0.1:54322/postgres` in `stack-up.txt` is the Supabase
    CLI's fixed, publicly documented local-development database URL — identical for every
    developer, loopback-only. Four measurements in the ruling: public documentation, GitHub
    push protection (which caught the transcript's REAL secret on first capture and passes
    this), merged precedent on main through pull request #47, and the brief's rule being a
    secrecy rule that a universal constant cannot violate. Claim quoted verbatim in the pull
    request body beside the ruling; nothing redacted, because redaction would falsely imply a
    credential had been present. Box B's "secrets FAIL" is discharged by this ruling.
  - **Finding 3 (low) ADOPTED** — the live PR description still called the branch deliberately
    un-verified after verification ran. `pr-body.md` rewritten to the current truth (verified
    status, single-reader gate-2 disclosure, the full green-does-and-does-not-claim list
    including the statistics-provenance sentence from rejected gate-2 ruling R2, and the
    rejected audit claim verbatim); a mechanical pushed it to live pull request #48 this
    sitting rather than leaving a false statement standing until merge.

## Why NO second audit run (ruled, with the re-run budget deliberately unspent)
The audit re-runs at most once per item, and only if code changes. The entire post-audit diff
(`git diff aa00f78..HEAD`) is comment and record text: the audit artifacts commit, the rulings
file, the `edge.ts` comment hunk, `pr-body.md`, and this file. **Zero executable lines
changed** — the merge sitting can re-verify that claim in that one command. None of the
audit's PASS verdicts can be invalidated by record text, and its one FAIL box (R7) is
discharged by the tree now reading exactly as the ruled sentence specifies. The unspent re-run
REMAINS AVAILABLE: if CI forces a real code fix at merge, that fix goes back through the audit
per contract.

## What completes the MERGE phase
- Required CI check green on the exact head the merge ruling pins (this sitting's closing head,
  unless CI forces change). Confirm check and head SHA together; record both run id and commit.
- The merge ruling posted on pull request #48, pinned to that head: what was built; every
  finding and its disposition — gate 1 (5 findings, `gate1-rulings.md`), gate 2 (8 findings as
  7 rulings plus 5 deviation rulings, `gate2-rulings.md`), audit (3 findings,
  `audit-rulings.md`); what the green does and does not claim — `pr-body.md`'s final section is
  the canonical current phrasing, including the statistics-provenance sentence; the
  single-reader gate-2 disclosure; the rejected audit claim verbatim (already in the body —
  the ruling repeats it).
- A mechanical publishes the ruling and executes the merge; the orchestrator verifies merged
  state afterwards. THE ORCHESTRATOR NEVER RUNS THE MERGE COMMAND (founder ruling 2026-08-07);
  a mechanical refusal is a STOP, reported upward with the denial text.
- If CI is red, classify from evidence before reacting: infrastructure/flake (one re-run, no
  new commit; a runner-less `cancelled` is infrastructure), broken-by-this-change (rule it, one
  executor round, push, END the sitting — the fix goes back through the audit at the new head,
  budget above), pre-existing on main (prove against main; goes to the founder), or CI
  unavailable (report with run ids and elapsed evidence; NO remediation, no workflow edits).

## Measured facts carried forward (supersede earlier notes)
- A fabricated `auth.identities` row needs EIGHT columns, not the five marked NOT NULL:
  `created_at`, `updated_at`, `last_sign_in_at` are nullable in the schema but GoTrue scans
  them into non-pointer Go timestamps — a five-column row makes `GET /auth/v1/user` answer 500
  and the edge function 401. Measured 200 → 500 → 200.
- The edge runtime holds keep-alive connections across `db:reset`; its first rpc afterwards
  fails at the transport layer (502). Restart the runtime after a reset; do not retry until
  green.
- The fix sitting left a local stack and a `supabase functions serve` running (executor
  background task `bxb22m5k7`). The merge sitting does not need them; they are cleanup, not
  evidence — the transcripts in the item directory are the evidence.
- `proof-local.txt` and `stack-up.txt` are redacted per the standing instruction; the audit's
  secrets pass/fail is ruled in `audit-rulings.md` finding 2.

## For the coordinator to FILE (handed up in the completion report, carried from sitting 3)
- **Carried (gate-1 F3):** the post-signup unlink product question — `enable_manual_linking =
  true` opens Auth's unlink surface; no acceptance id covers post-signup identity lifecycle.
- **Carried (gate-2 R5 scope note):** the predecessor's four tables (`accounts`,
  `acknowledgments`, `org_memberships`, `organizations`) each grant REFERENCES/TRIGGER/TRUNCATE
  to anon, authenticated AND service_role — Supabase default-privilege residue, measured in the
  refreshed `migration-replay.txt`, pre-existing on main, NOT fixed on this branch.
- **Carried (process, gate2-rulings addendum Dev-4):** a `supabase functions serve` can outlive
  its worktree and keep answering preflights from a deleted directory. Worth folding into the
  worktree-lifecycle lessons.

## Open questions for the founder
- None blocking. Carried FYI: a GitHub OAuth app (client id + secret) is a founder-manual step;
  its absence is the expected case (the one SKIP in the live proof) and blocks nothing.
