# AI4DEV-60 — MERGE RULING

**Sessions: expiry and revocation, refresh, and password reset.**
Ruled by the merge sitting (sitting 5, `orchestrator` on fable, claude-fable-5, effort xhigh).

**Pinned head: `9c53e685b384efe08e3a4e6cd19b882800fbe089`** — the tip of this branch, verified
against the remote at ruling time. Every statement below is about that commit and no other.

## Decision

**MERGE.** The required check is green on the pinned head. Every external finding across the
whole item is ruled, and every ruling is implemented in the tree. The record matches the code.
No maintained reviewer disagreement exists, so none is carried here.

## What was built

Sessions are Supabase Auth's own machinery; this item ships no migration and no session table.
The one shipped code change extracts the caller judgment from the edge plumbing into a pure
module (`callerFromAuthAnswer` in `supabase/functions/_shared/caller.ts` — fail closed on any
non-2xx auth answer), so the judgment every deployed function runs on every authenticated
request is type-checked and on the tested path. The acceptance fixture gains a clock-driven
session mirror (issuance, expiry, revocation, refresh) and password-reset mirrors; each mirror
is labelled with the live-proof check that binds it, or labelled unbound. Four acceptance tests
(session expiry at the exact 3600-second boundary, refresh against an unrefreshed sibling
session, the emailed password-reset flow, and wrong-password rejection) go from declared-pending
stubs to real bodies at the loop tier. A live local-stack transcript
(`loop/items/AI4DEV-60/proof-local.txt`, 7 checks, 7 passed) carries the evidence the loop tier
cannot reach, including a linked-volunteer control across the refactored edge. Two retired
acceptance ids (verification-link and reset-link lifetime semantics) stay deliberately
unasserted.

## Every finding and its disposition

Twenty-five adopted rulings across five files in `loop/items/AI4DEV-60/`. Zero rejections
anywhere in the item. Each rulings file quotes the reviewer's claim verbatim beside the ruling.

**Gate 1 — plan review (one reader: sol via codex). Five findings, five accepted**
(`gate1-rulings.md`):
1. Automatic refresh had no owner — accepted, fixed differently: the acceptance id's surface
   mark became `ui`, which hands the automatic clause to the wiring leaf instead of faking a
   timer at loop tier.
2. The live checks did not bind GitHub-handle extraction across the refactored edge — accepted:
   live check (g), a linked-volunteer control through the deployed function, was added.
3. Two test setups completed signup on a session the live stack never issues — accepted:
   sign-in now precedes completion.
4. "Every new mirror is live-bound" overreached its cited checks — accepted: two probes added,
   labels narrowed, unbound issuance labelled as unbound.
5. A stale "eleven" green-id count — accepted: corrected to nine in all three places.

**Draft sitting — rulings on the executor's report. Three matters, three accepted**
(`draft-rulings.md`): the one changed edge in the extracted module (a 2xx answer with an
unparseable body now refuses instead of throwing) accepted and recorded; the blank-id
acceptance recorded as preservation of the old inline behaviour, not a tightening; the
one-slice decision re-decided and maintained at the measured diff size.

**Gate 2 — draft-code review (two readers, blind to each other: terra via codex, flash via
opencode). Nine raw findings, two convergences, seven rulings, all accepted**
(`gate2-rulings.md`):
1. (converged, both seats) The equivalence record named one changed edge and there are two —
   accepted, fixed differently: the record now names both; behaviour kept, both edges fail
   closed.
2. A refusal-text equality assertion imported another id's criterion — accepted: assertion
   removed under a written removal condition, which the executor checked and satisfied before
   removing.
3. (converged, both seats) The sign-in control did not prove minting — accepted: the body now
   asserts the session count grows by exactly one.
4. A resend retains the first reset link — accepted, fixed differently: a comment names the
   unmodeled retention; invalidating it would model retired ground.
5. The 3600-second boundary had no oracle — accepted: one body now advances exactly 3600
   seconds, the boundary instant.
6. The preserved blank-id acceptance had no oracle — accepted: a selftest case now covers it.
7. A comment stated a false import fact — accepted: corrected to the grep-verified truth.

**Fix sitting — live-proof measurements against the plan's expectations. Four re-pins, four
accepted** (`fix-rulings.md`): a session row exists before the refused attempt (the
confirmation link is an implicit-flow sign-in), so the check asserts the unchanged session-id
set; the auth server answers HTTP 403, not 401, for a dead token — nothing shipped reads the
number; the vendor's default logout scope is global while the fixture models local, recorded
where the mirror is described; the expired-token refusal at the deployed function belongs to
the platform layer, and the record says which layer each check binds.

**Audit — two seats, blind to each other (luna via codex, flash via opencode). Six findings,
six accepted** (`audit-rulings.md`). All six are the stated-fact-untrue class; every remedy
changed the record to match the code and the measurements, never the other direction; zero
executable statements moved. The fixes: the plan's amendment header regained its missing
second amendment; two comments corrected from 401 to the measured 403; the pull-request body
brought to the item's real phase; the verify transcript's comparison corrected to the recorded
baseline; one mirror label re-pinned to the measured predicate; one citation corrected to
quote its source exactly.

**Both audit seats' box verdicts, recorded.** Seat one (luna): rulings-implemented PASS (all
19 to that point), scope PASS, stated-facts FAIL (its three findings), PASS on all six
additional boxes. Seat two (flash): rulings-implemented PASS (all 19, traced line by line),
stated-facts FAIL (its three findings), fixture-mirrors FAIL (its two findings there),
removal-condition PASS, equivalence PASS, bookkeeping PASS, proof consistency PASS, and scope
COULD-NOT-VERIFY — resolved PASS by the audit sitting's own git enumeration: every changed
path since merge-base `c11e352` is inside the declared surfaces. The audit did not re-run for
the six fixes: they change comment text and record files only, and every new sentence is the
one the panel's own finding dictated. The full reasoning is in `audit-rulings.md`.

## What the green does and does not claim

The required check `verify` (workflow "CI") passed on exactly the pinned head: run
31341518091, 40 seconds. Its steps on that commit: type-check of both TypeScript projects, the
acceptance-harness self-tests (264 tests in 11 files), every suite checked against its
acceptance file, every declared requirement verified at the loop tier — req-001 at 13 green /
24 declared red with exact declaration match, req-016 at 11 green / 1 red — plus the
territory guard and the item-ownership reference guard.

The green does NOT claim: integration-tier evidence (CI has no database; the fixture is a
stand-in capped at the loop tier, and the requirement above this item keeps its own evidence
gate); the live-stack facts, which live in the committed transcript
(`loop/items/AI4DEV-60/proof-local.txt`, 7 of 7, gathered on a local stack, not by CI);
automatic refresh exercised through a real client, which is handed to the wiring leaf by the
`ui` mark; or tamper-proofness — on a pull-request event CI runs the workflow as the pull
request defines it, as the workflow's own header states.

## Dispositions of record

- 25 adopted rulings: 5 plan-gate, 3 draft, 7 draft-code, 4 measurement re-pins, 6 audit.
- Rejections: none. Maintained reviewer disagreement: none — nothing to quote verbatim.
- Open founder questions: none.
- Caps: none fired at any sitting.
