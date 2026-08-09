# MERGE RULING — AI4DEV-58 (GitHub sign-in, mandatory GitHub link)

Ruled by the `orchestrator` definition on fable (claude-fable-5, effort xhigh), merge sitting.

## The pin and the green

This ruling licenses the merge of **exactly one commit**: head
`60a02cb70d065d95db68ea92a08728c7502f90a9`. The required check **`verify`** (workflow "CI") is
green on that exact SHA: run **31288110295**, event `pull_request`, created 2026-08-09T01:21:44Z,
completed 2026-08-09T01:22:29Z, conclusion **success** (the check itself passed in 41s). This
sitting confirmed the run's head SHA, status and conclusion against the live GitHub API — not
from any prior report — and confirmed the pull request's head and CLEAN merge state at ruling
time. If the head moves after this ruling, the ruling describes a different commit and the merge
it licenses does not happen.

## What was built

Deliverable D1 leaf L2 of the authentication requirement: GitHub OAuth signup for volunteers,
the mandatory GitHub link without which a volunteer signup cannot complete, and the
volunteer-onboarding profile import fired at completion against a stub import source. Concretely:
one migration (the `volunteer_profiles` table with whitespace-aware emptiness constraints and an
IMMUTABLE array-validation helper; `complete_signup` dropped and recreated with the volunteer
gate, the identity-to-handle binding check, and `default null` on the four new parameters as a
named-argument compatibility bridge), the `complete-signup` edge function carrying the caller's
linked-GitHub fact derived through the shipped extractor, Auth configuration enabling the GitHub
provider and manual identity linking, the three acceptance tests this leaf owns (AT-001.02,
AT-001.04, AT-001.05) at loop tier, and the live-stack proof transcript
(`loop/items/AI4DEV-58/proof-local.txt`: 9 checks, 8 passed, 0 failed, 1 skipped — the skip is
the GitHub authorize redirect, no OAuth app exists yet, the expected case).

## Every finding and its disposition

**Gate 1 — plan critique** (gpt-5.6 sol, read-only; 5 findings; full rulings with every claim
quoted verbatim in `loop/items/AI4DEV-58/gate1-rulings.md`):

- F1 (high, onboarding must fire at the link event) — **REJECTED**, with a strengthening
  amendment: the abandoned-flow analysis written into the plan, and a pre-completion negative
  added to the AT-001.05 oracle proving population is caused by completion.
- F2 (high, `array_length >= 1` passes the empty array) — **ACCEPTED, FIXED DIFFERENTLY**:
  `cardinality(...) >= 1` (two-valued on exactly the input that matters) plus a stated raise in
  the function body, with an empirical empty-array probe on the migrated database.
- F3 (high, no guard on post-signup unlinking) — **REJECTED for this item**: the invariant as
  stated exists nowhere in the ratified text, and the omission is documented as deliberate. The
  real product question underneath it is **filed upward**, not ruled away.
- F4 (medium, the backstop proves existence, not ownership) — **ACCEPTED**: the check now binds
  `identity_data->>'user_name'` to the supplied handle, with a mismatched-handle negative probe.
- F5 (low, the plan would have rewritten a still-true comment) — **ACCEPTED**: the load-bearing
  provider comment is retained; only its genuinely stale clause updated.

**Gate 2 — draft-code critique** (gpt-5.6 terra, read-only, two slices; 8 findings ruled as 7;
full rulings in `loop/items/AI4DEV-58/gate2-rulings.md`):

- R1 (high, "populated" checks accept semantically empty data) — **ACCEPTED**: whitespace-aware
  CHECK expressions, an IMMUTABLE helper refusing NULL and blank array elements, the same
  strengthening mirrored in the function body, all probed empirically. R6 (medium, the same gap
  at the function-body line) is ruled within it.
- R2 (medium, a service-role caller can forge shape-valid statistics) — **REJECTED, risk
  accepted and recorded in writing**: the database enforces shape and identity binding, not the
  provenance of imported statistics; the sentence is carried in this ruling's green-claims
  section below.
- R3 (high, no test executes the handle extractor) — **ACCEPTED**: the fixture now derives the
  caller fact through the shipped extractor from a canonical identities shape.
- R4 (high, RPC signature replacement with no compatibility bridge; one defect reported from
  both slices) — **ACCEPTED, FIXED DIFFERENTLY**: `default null` on the four new parameters, the
  edge omitting the GitHub keys for NGO completions (so NGO signup works under either rollout
  order), the honest residual — volunteer completion needs both planes at the new version —
  stated in the migration comment, and the old-caller shape proven live against the new schema.
- R5 (low, the claimed no-grants posture contradicted by the committed capture) — **ACCEPTED,
  verified**: `revoke all` on the new table from all three roles, the comment rewritten to the
  measured reality, the re-capture returning zero privilege rows for those roles.
- R7 (medium, the fixture cites the predecessor item's live proof as evidence for the current
  tree) — **ACCEPTED**: both comments now cite this item's transcript, keeping both handshake
  caveats, retaining the predecessor's transcript only for what only it still covers.

Five executor-reported deviations were ruled in the gate-2 addendum, all accepted: the octal
vertical-tab spelling (correcting a defect in my own ruling text), one evidence-strengthening
probe beyond the plan list, the eight-column `auth.identities` fabrication as a measured fact,
the stale serve-transcript superseded as evidence (with the underlying hazard handed up as a
process finding), and the keep-alive-across-reset transport fact.

**Gate 2 ran with ONE reader.** The gate is designed for two readers of different model
families; the second was stopped by founder ruling (2026-08-08, after it exhausted its
billing-cycle quota mid-gate). The cost is known, not assumed — on a previous item one reader
found a blocker where the other reported nothing — so the single-reader run is a deliberately
weaker gate, recorded here so this ruling states what the gate did and did not cover.

**Audit — read-only, whole record** (gpt-5.6 luna; 3 findings; full rulings in
`loop/items/AI4DEV-58/audit-rulings.md`):

- Finding 1 (high, an adopted ruling not implemented as ruled: the evidence-citation comment
  named the predecessor's runnable script instead of its transcript and dropped schema
  supersession) — **ADOPTED**, record-is-false class. The tree was changed to match the record:
  comment text only, verified afterwards against the ruled sentence word by word.
- Finding 2 (high, "a credential is committed") — **REJECTED: the auditor is wrong.** The
  maintained claim stands verbatim in the next section.
- Finding 3 (low, the live pull-request description still called the branch deliberately
  un-verified after verification ran) — **ADOPTED**: the description was rewritten to the
  current truth and pushed live during the audit sitting.

The item's single audit re-run was deliberately **not spent**: the entire post-audit diff is
record text — this sitting re-verified that claim independently (`git diff` from the audited
commit to this head touches one comment hunk in `supabase/functions/_shared/edge.ts`, 4
insertions, 3 deletions, zero executable lines; everything else is rulings, artifacts and the
pull-request description). No PASS verdict of the audit can be invalidated by record text, and
its one FAIL box is discharged by the tree now reading exactly as the ruled sentence specifies.

## The maintained reviewer disagreement, verbatim

The rejected audit claim, quoted in full (it contains no foreign item id; nothing is elided):

> "a credential is committed — The transcript embeds
> `postgresql://postgres:postgres@127.0.0.1...`. The changed tree contains a database
> username/password despite the no-credential requirement."
> (severity high, against `loop/items/AI4DEV-58/stack-up.txt` line 26)

The ruling: the flagged string is the Supabase CLI's fixed local-development database URL —
printed identically for every developer on every machine by `supabase start`, publicly
documented, and reachable only on the loopback interface of whoever runs their own local stack.
GitHub push protection, which refused this transcript's first capture over a real secret key,
passes this string; the identical string is already on main through pull request #47. It is a
public constant, not a credential, and nothing was redacted because nothing secret is present.
Every actual key-shaped value in that transcript is redacted. A database URL with any
non-default password or any routable host would be a credential and would be redacted; this one
is neither.

## What the green does and does not claim

**Claims:** the three acceptance tests exist, execute, open worlds and assert; the shipped
decision modules (`accounts.ts`, `github.ts`) — byte for byte the code the edge functions
import — behave as the three criteria require; the volunteer gate fails closed.

**Does not claim:** that the migration is correct, that the edge functions work, that Auth is
configured, or that any OAuth handshake or real GitHub import works — that half's only evidence
is the live-stack transcript, one machine's word, not reproducible by a reviewer. The GitHub and
Google handshakes are proved by nothing: no OAuth app or credential exists for either, so
"sign-in works" end to end is not claimed at any tier. The profile import is asserted against a
stub import source by design until the volunteer-profile requirement lands the real one — no
green here may be reported as "profile import from GitHub works." Also not claimed (a
draft-review ruling with the risk accepted in writing): that the database authenticates the
PROVENANCE of imported statistics — it enforces their shape and the identity binding, and a
caller holding the service-role key, the deployment's own authority, can commit any shape-valid
statistics for a correctly linked handle.

## Execution

Per founder ruling (2026-08-07), the orchestrator decides the merge and verifies it afterwards;
a mechanical executes it. The merge is a squash of this branch at the pinned head, and the
pull-request link to this item is what flips the board — nothing sets it Done by hand.
