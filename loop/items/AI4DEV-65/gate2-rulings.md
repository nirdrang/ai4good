# Gate 2 rulings — AI4DEV-65 (who signed fields)

Ruler: FIX AND GOAL sitting orchestrator, model Fable 5 (claude-fable-5). The gate was a
two-reader panel: terra (codex, 2 findings, `artifacts/gate2-terra.distilled.md`) and flash
(opencode, CLEAN, `artifacts/gate2-flash.distilled.md`). Both seats are ruled here — a clean
seat is evidence, never a veto. Each claim is quoted verbatim; each ruling is one of the four
contract outcomes.

## Terra [1] P2 — accept, fixed differently

> "The database write path accepts any nonblank authority attestation, rather than enforcing
> the one shipped statement."
> "A caller using the granted `service_role` RPC can submit `I am not authorized` with
> otherwise valid parameters, and the function inserts it unchanged; the wrong-attestation test
> only exercises the shared TypeScript validation."

The fact is verified true against the tree. The migration's constraints (lines 43–45) refuse
null and blank only; the exact-statement pin lives in `validateCompleteSignup`
(`supabase/functions/_shared/accounts.ts`, check 4 — the gate 1 finding 3 remedy). And the
threat model is real, not decorative: the grant tail is service_role-only, the function is
SECURITY DEFINER precisely because service_role holds no direct INSERT, and this same function
already closes a service-role gap for GitHub handles with a lengthy comment. Terra aimed at the
right boundary.

The proposed remedy — pin the statement's content in the database — is not the one we use,
for three measured reasons:

1. **No application string constant lives in SQL anywhere in this tree.** Every check the
   function body carries is structural (nonblank, not-null, cardinality) or referential (the
   handle bound against `auth.identities` — live data the database can see). A SQL copy of
   `ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement` would be the first shipped-copy literal in
   a migration, and a second source of truth for it.
2. **The drift failure mode is worse than the gap.** If the copy module and a SQL literal ever
   diverge — one edit to the copy without a drop-and-recreate migration — the validation layer
   sends the current statement and the database refuses it: every completion fails, signup is
   down entirely. The gap terra names is a trusted-key caller storing a wrong-but-nonblank
   statement, in a system with no production database, where the wrong statement is
   self-evidencing — the column stores verbatim what was affirmed, so a wrong statement is
   visibly not the shipped one. A forged GitHub handle looks legitimate; a wrong attestation
   does not.
3. **The closest analog has the same posture.** `text_version` — the field decision C models
   the attestation on — has no content pin anywhere, in TS or SQL. This item already raised the
   bar above its model by pinning content at the validation layer.

Fixed differently: the boundary is STATED instead of moved. (a) The migration's
`authority_attestation` comment block gains explicit sentences: the constraints floor presence
and nonblank; the content pin lives in `validateCompleteSignup` and is deliberately not
duplicated here, with the drift reasoning above; a service-role caller that bypasses the edge
function can therefore store a nonblank statement that is not the shipped one, and the row then
shows verbatim which statement was affirmed. Accepted residual, recorded here. (b) The plan's
"what the green claims" section states the same boundary. (c) This claim rides the merge ruling
verbatim.

## Terra [2] P3 — verify first, both branches pre-ruled

> "The POSIX `\s` constraint does not guarantee the same blank-value definition as JavaScript
> `trim()`."
> "In a locale where an ECMAScript-trimmed character such as U+FEFF is not in PostgreSQL's
> `[:space:]` class, a direct RPC caller can persist a visually blank signer field. PostgreSQL
> makes non-ASCII class membership collation-dependent."

Marked unverified-runtime by the reviewer, so the executor measures it on the deployment that
matters — slot 1:

- Probe 1 (database): `select U&'\FEFF' ~ '^\s*$' as feff_is_posix_blank;` on the slot-1
  database the integration tier uses.
- Probe 2 (runtime): confirm `'﻿'.trim() === ''` in the suite's JS runtime.

**Branch A — probe 1 returns true** (U+FEFF is in the class): the constraint refuses a
FEFF-only value, the claim is disproven on this deployment, the measurement is recorded and
nothing changes.

**Branch B — probe 1 returns false** (the expected result): the divergence is real, and it is
confined to the same boundary as [1]. Through the deployed path a FEFF-only value never reaches
the database — probe 2's trim strips it and the presence check refuses blank. The only writer
that can persist it is a service-role caller bypassing the edge function. Disposition follows
[1]: the boundary statement ordered there extends one sentence — the database's blank floor is
POSIX `[[:space:]]`; the validation layer's is ECMAScript trim, which is wider (U+FEFF, measured
on slot 1); reachable only by the same trusted-key caller, same accepted residual. No
constraint change: chasing the ECMAScript whitespace set through PostgreSQL character classes
reproduces, character by character, the two-source drift hazard that [1] rejects.

Executor records both probe outputs verbatim in
`loop/items/AI4DEV-65/artifacts/verify-first-feff.txt`, committed. The outcome addendum at the
end of this file states which branch held.

## Flash — CODE REVIEW: CLEAN — recorded, and its self-dismissed concern ruled

Flash's seat is clean: zero findings, with the six named risk directions each ruled out on
specific evidence (see the distillate's notes). Recorded as a verdict among these dispositions.

Flash raised one concern and dismissed it itself, and the contract hands me that dismissal to
ratify or overturn: a direct service-role caller can store an UNTRIMMED (but nonblank)
signer_name or signer_title, since the function body does not btrim the new parameters.
**I ratify the dismissal.** It is the same boundary as [1]: the verbatim-and-trimmed guarantee
belongs to the validation layer, the migration's parameter comment says so explicitly ("THEY
ARRIVE TRIMMED"), and the boundary statement ordered under [1] covers this class. No code
change.

## Convergence note

Terra's two findings and flash's self-dismissed concern describe ONE boundary from independent
seats: the database floor is structural (presence, nonblank), the validation layer is semantic
(content, trim), and the gap between them is reachable only by a service-role caller that
bypasses the edge function. A panel converging on an unstated boundary is the strongest signal
a panel gives — and the fix is to state the boundary, which is what [1] orders.

## Disposition summary

| finding | severity | ruling |
|---|---|---|
| terra 1 | P2 | accept, fixed differently — boundary stated in migration comment, plan and merge ruling; no SQL content pin (drift hazard) |
| terra 2 | P3 | verify first — FEFF probes on slot 1; branch A record-only, branch B extends [1]'s boundary statement |
| flash (seat) | — | clean; verdict recorded |
| flash self-dismissed concern | — | dismissal ratified — same boundary as terra 1, covered by its statement |

## Verify-first outcome addendum

(Written after the executor's probes; empty until then.)
