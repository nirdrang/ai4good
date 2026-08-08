# PHASE-STATE — AI4DEV-58 (GitHub sign-in, mandatory GitHub link)

**Phase just completed:** PLAN (sitting 1, `orchestrator` on fable, claude-fable-5 @ xhigh).
**Next phase:** GATE 1 — critique of the plan.

## What completes gate 1
- The plan reviewer runs against the pushed head with the prompt at
  `loop/items/AI4DEV-58/gate1-prompt.txt` (assembled: reviewer contract + the plan-review
  section + this item's additions; the Pins metadata was not copied into it — the conductor
  reads pins from `.claude/skills/work/reviewers.md`).
- Its raw output lands in `loop/items/AI4DEV-58/artifacts/` and is final (terminal count line
  present), then a distiller produces the findings-only file beside it.
- The completing artifact for this phase boundary: the distilled findings file. The DRAFT
  sitting then rules on every finding, amends `plan.md`, and pushes rulings before any code.

## The subject
- The plan: `loop/items/AI4DEV-58/plan.md` — 11 decisions (D-A…D-K), 8 steps with
  done-criteria, per-id verification table for AT-001.02/.04/.05, one review slice.
- Nothing else has been built. No code, no migration, no test bodies yet — by design; the
  draft comes after gate-1 rulings.

## Open questions for the founder
- None blocking. **One FYI to relay, not a question:** a GitHub OAuth app (client id + secret,
  callback `http://127.0.0.1:54321/auth/v1/callback`) is a founder-manual step exactly like the
  Google client was on the predecessor leaf. Its absence is the expected case; the item
  proceeds unchanged, and the live proof's handshake-wiring check is conditional on the
  credential's presence, never faked.

## Notes for the next sitting
- The three acceptance ids are currently declared red in `tests/at/expected/req-001.json`; the
  plan flips them green at step 5. Baseline (step 0) must precede any edit.
- The plan replaces the reserved comment block in `supabase/functions/_shared/accounts.ts`
  (lines 130–145) — an executor that leaves it in place has made the record false.
- Watch the two-territory guard: no `src/` changes anywhere in this item.
