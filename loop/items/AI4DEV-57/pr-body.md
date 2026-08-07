Email and Google signup, and the three global account types — the first buildable leaf of the
product, and the first product code in this repository.

**This pull request currently carries the plan only.** No code exists yet. It is opened now so the
required check has something to gate from the first push onward, and it fills out as the item is
built.

## What this item builds

The schema and the server-side path that turn an authenticated user into a typed account:

- The **first database migration** — global account types (NGO, volunteer, platform admin),
  organisations, per-organisation memberships with roles, and the terms-of-service and Platform
  Promise acknowledgment record with its timestamp, IP and text version. Row-level security is on
  for every new table, with only the policies these acceptance tests need; everything else stays
  denied.
- The **first edge function**, `complete-signup`. Email/password and Google both authenticate
  upstream, so both arrive through one code path that assigns the account type once, and for an NGO
  creates the organisation, the administrator membership and the acknowledgment row in one
  transaction.
- The **first acceptance suite for a requirement**, covering the four acceptance ids this leaf owns.

## Two decisions worth knowing about before reading the diff

**No `src/` changes.** The signup screens belong to a later leaf of the same deliverable — the one
that wires the auth screens through real screens and adds no new acceptance ids. Three things agree:
the decomposition manifest assigns them there, CI fails any pull request touching both `src/` and
`supabase/`, and the acceptance runner's `--wired` flag that would prove a screen works is not
implemented yet.

**The acceptance suite covers the whole requirement, because the harness gives no choice.** The
bijection preflight refuses a suite whose registered ids are not in exact bijection with the
acceptance file's P0 set, so creating the suite obliges all thirty-seven call sites at once. Four
run for real and go green; the other thirty-three throw `AtPending` and are declared pending in
`tests/at/expected/req-001.json`, each naming the leaf that will land it. That declaration becomes
the requirement's live progress ledger, and CI enforces it from here on.

## What the green will and will not claim

The loop-tier pass will claim that the four acceptance tests are executable, really open a world and
really assert, and that the shipped decision logic behaves as they require.

It will **not** claim that the migration is correct, that the edge function works, that row-level
security denies what it should, or that Google sign-in works. CI has no database and never runs
above the loop tier. The only evidence for that half is a transcript captured against a local
Supabase stack on one machine, which a reviewer cannot reproduce. That distinction is stated again
in the merge ruling rather than left to be inferred.

## The record

`loop/items/AI4DEV-57/plan.md` carries the eight decisions, the steps with their done-criteria, and
the expected verification state per acceptance id. `loop/items/AI4DEV-57/PHASE-STATE.md` carries the
open questions, including a scope reduction the founder should see and a missing Google OAuth client.

Ruled by the opus fallback orchestrator throughout, because fable is out of credit.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01DVE9Gg215tDXmRmB4RySGn
