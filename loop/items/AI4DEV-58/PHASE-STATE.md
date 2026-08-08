# PHASE-STATE — AI4DEV-58 (GitHub sign-in, mandatory GitHub link)

**Phase just completed:** DRAFT (sitting 2, `orchestrator` on fable, claude-fable-5 @ xhigh).
**Next phase:** GATE 2 — critique of the draft code, TWO slices, ONE reader each.

## What this sitting did
- Ruled on all 5 gate-1 findings: `loop/items/AI4DEV-58/gate1-rulings.md` — F2 accepted fixed
  differently (`cardinality`, never `array_length` — NULL passes a CHECK), F4 accepted (the
  identity check binds the handle), F5 accepted (the provider comment is retained, it is still
  true), F1 rejected with a strengthening amendment (pre-completion negative in AT-001.05), F3
  rejected for scope with the product question FILED (see below).
- Amended `plan.md` (amendment header lists every change); rulings and amendment were pushed
  BEFORE any code, at `58ee257`.
- The executor (opus, one invocation) built plan steps 0–5: baseline, stack up, shared modules,
  migration, edge function + config, three real test bodies + two amendments + expected flip +
  pending ledger. Typecheck green, migration replays clean, **verify suite deliberately NOT run
  against the changed tree** — the draft exists to be critiqued. Final code commit `766fcbd`.
- Draft-sitting rulings at `loop/items/AI4DEV-58/draft-rulings.md`: the D-K split trigger FIRES
  (1,226 changed lines outside `loop/items/` > 1,200 — insertions plus deletions, and the
  ambiguity resolves toward wider review), plus rulings on the executor's three reported
  deviations (all accepted; one standing instruction below).
- `pr-body.md` updated: draft-under-review status and the single-reader disclosure. The live
  pull request body must be updated to match (a mechanical does it; if this sitting ends before
  that is confirmed, the conductor verifies the PR body carries the single-reader paragraph).

## What completes gate 2
- TWO reviewer runs, one per prompt, each by the pinned draft-code reader (the conductor reads
  pins from `.claude/skills/work/reviewers.md`; the second reader named there is STOPPED by
  founder ruling 2026-08-08 — do not launch it, do not substitute):
  - `loop/items/AI4DEV-58/gate2-prompt-sql-and-config.txt`
  - `loop/items/AI4DEV-58/gate2-prompt-typescript-and-tests.txt`
- Both run against this sitting's closing head (the code is unchanged since `766fcbd`; the later
  commits are item record only). Raw outputs land in `loop/items/AI4DEV-58/artifacts/`, each
  with a terminal count line, then a distiller produces the findings-only file beside each.
- The completing artifacts: the two distilled findings files. The FIX sitting then rules on
  every finding from both slices, pushes rulings first, and only then pursues the goal.

## For the FIX-AND-GOAL sitting
- Verify-first obligations already folded into the plan: step 6(d) carries F2's empirical check
  (direct call with `'{}'::text[]` raises) and F4's mismatched-handle negative.
- **Standing instruction (draft-rulings deviation 2): `proof-local.txt` is written REDACTED from
  the start** — no service-role key, no JWT verbatim. GitHub push protection already rejected
  one push this item for a transcript that captured `supabase status` verbatim.
- Steps 4 (end-to-end clause), 6 and 7 are still unexecuted; they are the goal phase's work,
  with the verify suite green in at most three iterations.
- Measured facts the executor left for step 6: `auth.identities` NOT NULL columns are
  `provider_id, user_id, identity_data, provider, id` — a fabricated row needs those five;
  plan risk 1 looks tractable. The local stack was left RUNNING.
- The fix sitting also writes the audit brief and commits the gate-2 raw critiques + distillates
  into the record.

## Open questions for the founder
- None blocking. **One item for the coordinator to FILE as its own board item (gate-1 ruling
  F3):** `enable_manual_linking = true` also opens Auth's unlink surface, so a Google+GitHub
  volunteer could unlink the GitHub identity after signup. No acceptance id covers post-signup
  identity lifecycle and the PRD deliberately defines no linking policy (AT-001.08 retired), so
  nothing was built — but the product question ("should a volunteer be able to unlink the
  mandatory identity after signup?") deserves a filed item, not silence. Narrowing facts: the
  imported profile row persists after an unlink; only the return-visit GitHub sign-in path is
  lost; nothing this item ships calls unlink.
- Carried from the plan sitting, still an FYI only: a GitHub OAuth app (client id + secret) is a
  founder-manual step; its absence is the expected case and blocks nothing.
