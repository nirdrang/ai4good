Email and Google signup, and the three global account types — the first buildable leaf of the
product, and the first product code in this repository.

**The code is built.** This body described a plan-only pull request when it was first written; that
was true then and stopped being true several commits later, so it is rewritten here to describe what
was actually built rather than what was intended.

## What this item builds

The schema and the server-side path that turn an authenticated user into a typed account:

- The **first database migration** — global account types (NGO, volunteer, platform admin),
  organisations, per-organisation memberships with roles, and the terms-of-service and Platform
  Promise acknowledgment record with its timestamp, IP and text version. Row-level security is on
  for every new table, with no policies at all, so every client-key read and write is denied;
  the full tenant-isolation policy set belongs to a later deliverable. All writing goes through
  two `SECURITY DEFINER` database functions, and the service role holds no INSERT privilege
  anywhere in this schema — which is what makes the signup function's refusal to mint a platform
  administrator sit on the only write path rather than beside one.
- **Two edge functions.** `complete-signup` assigns the account type once and, for an NGO, creates
  the organisation, the administrator membership and the acknowledgment row in a single
  transaction. Email/password and Google both authenticate upstream, so both arrive through this
  one code path. `create-organization` is the NGO-only action; it exists because the acceptance
  criterion about a volunteer being refused an NGO-only action had no product operation to attempt,
  and testing the helper directly would have proved a helper rather than an application boundary.
  It was added by the plan review, not by the original plan.
- **A shared decision module** both edge functions and the acceptance adapter import, so the
  loop-tier green is a statement about code that ships rather than about a re-implementation living
  in a test fixture.
- The **first acceptance suite for a requirement**, covering the four acceptance ids this leaf owns.

## Two decisions worth knowing about before reading the diff

**No `src/` changes.** The signup screens belong to a later leaf of the same deliverable — the one
that wires the auth screens and adds no new acceptance ids. Three things agree: the decomposition
manifest assigns them there; CI fails any pull request touching both `src/` and `supabase/`; and
while the acceptance runner's `--wired` flag is implemented, the screen DRIVER it needs does not
exist — the runner exits 3 saying so — which is a later slice of the harness item. So a screen built
now could be verified by nothing. The founder confirmed this reduction before any code was written.

**The acceptance suite covers the whole requirement, because the harness gives no choice.** The
bijection preflight refuses a suite whose registered ids are not in exact bijection with the
acceptance file's P0 set, so creating the suite obliges all thirty-seven call sites at once. Four
run for real and go green; the other thirty-three throw `AtPending` and are declared pending in
`tests/at/expected/req-001.json`, each naming the leaf that will land it. That declaration becomes
the requirement's live progress ledger, and CI enforces it from here on.

## What the green claims and what it does not

The loop-tier pass claims that the four acceptance tests are executable, really open a world and
really assert, and that the shipped decision logic behaves as they require.

It does **not** claim that the migration is correct, that either edge function works, that row-level
security denies what it should, that Supabase Auth is configured, or that Google sign-in works. CI
has no database and never runs above the loop tier. The only evidence for that half is a transcript
captured against a local Supabase stack on one machine, which a reviewer cannot reproduce. That
distinction is stated again in the merge ruling rather than left to be inferred.

One clause is named unproved and stays unproved: a real Google consent round trip. Consent is a
person pressing a button in a browser, so no agent closes it; a real OAuth client narrows the gap
without closing it.

## The record

`loop/items/AI4DEV-57/plan.md` carries the decisions, the steps with their done-criteria, and the
expected verification state per acceptance id. `loop/items/AI4DEV-57/PHASE-STATE.md` carries the
open questions and the standing hazards. The plan review, the code critique and the rulings on both
are committed beside them, with every reviewer claim quoted next to the ruling it received.

Ruled by the opus fallback orchestrator throughout, because fable is out of credit. One consequence
is recorded rather than hidden: the code gate was designed as four independent reads and only three
completed, because the second reader ran out of credit partway through the SQL and configuration
slice.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01DVE9Gg215tDXmRmB4RySGn
