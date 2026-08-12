# Gate 1 rulings — AI4DEV-65 (who signed fields)

Ruler: DRAFT sitting orchestrator, model Fable 5 (claude-fable-5). Reviewer: sol (PLAN review,
7 findings). Each claim is quoted verbatim from the raw output; each ruling is one of the four
contract outcomes. The plan amendments these rulings order are in `plan.md` at the head this
file rides in.

## [1] critical — accept, fixed differently

> "The proposed `default null` parameters do not provide a viable rolling-deployment bridge."
> "Migration-first makes the current edge omit signer arguments, whose null defaults then
> violate the new `not null` columns; edge-first sends `p_signer_*` names the old function does
> not recognize. Every signup therefore fails during either mixed-plane window. Rehearsing both
> deployment orders and submitting a completion would settle this."

The defect is real, and it is in the plan's rationale, not the code shape. Sol is right that
`default null` cannot bridge a mixed-plane window here: the GitHub leaf's pattern works because
its columns are nullable, and these columns are `not null`, so a defaulted call fails at the
constraint. The plan may not borrow that rationale. But the remedy — rehearse both deployment
orders — assumes a mixed-plane window exists somewhere. It does not: no production or staging
plane exists, integration slots are reset and re-migrated from scratch, and the functions under
test always deploy from the same tree as the migrations. There is no window in which an old
edge function meets the new database.

Fixed differently: decision E's rationale is rewritten. The defaults stay, for call-signature
tolerance only — a caller that omits the new arguments fails at the column constraints, the
whole transaction aborts, and no partial signup exists. That refusal is the requirement's own
demanded behavior for omission, not an outage. The "rolling-deploy pattern" citation is
removed. No code change; severity "deployment-wide outage" does not apply where no deployment
plane exists.

## [2] high — accept in part, fixed differently; the display clause is this ruling's terminal narrowing

> "AT-001.20 directly imports an otherwise unused constant, so it cannot prove the ratified
> 'When displayed' behavior."
> "Both tiers remain green if no product surface imports or displays the copy—or if the module
> is absent from the deployed function graph. The plan explicitly excludes UI while declaring
> the entire acceptance id green."

Two halves. The "otherwise unused constant" half is accepted and is fixed by the remedy of
finding [3]: `validateCompleteSignup` now imports `ACKNOWLEDGMENT_IDENTITY_COPY` and refuses an
attestation that does not match the shipped statement. The copy module is therefore in the
deployed function graph, and its content has behavioral force at runtime — it is no longer a
constant only the test reads.

The "When displayed" half stands as the plan's recorded narrowing, and dismissing it is my
terminal ruling under the contract's unearned-green clause: no screen exists, display is later
UI work, and the green claims the copy's content, never its display. The two conditions are
honored — sol's claim is recorded verbatim here and will appear in the merge ruling and the
pull request, and the plan's "what the green claims" section states exactly what the green does
and does not claim.

## [3] high — accept

> "Validation checks only that `authorityAttestation` is nonblank and never establishes that it
> affirms the server-owned authority statement."
> "A valid request containing `authorityAttestation: 'I am not authorized'` is trimmed,
> accepted, and stored as an authority attestation despite contradicting the required authority
> to bind, fund, and accept no-SLA terms; none of the planned tests supplies a wrong-content
> counterexample."

Accepted in full. `validateCompleteSignup` gains a fourth identity check: after the three
presence-and-blank checks, the trimmed attestation must equal
`ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement` exactly; the refusal names the field and says
the statement does not match the shipped authority statement. AT-001.39 gains a wrong-content
loop variant using sol's own counterexample, refused with no writes. Decisions B, C, D and
steps 2 and 5 are amended.

## [4] high — reject

> "The migration has no executable upgrade path for an acknowledgment table containing existing
> rows."
> "Adding a `text not null` column without a default immediately aborts on any nonempty staging
> or deployed database; calling that failure 'loud' does not complete the migration. A row
> census in every target environment or a migration rehearsal against a populated snapshot
> would settle the stated empty-database assumption."

Rejected. The premise — "any nonempty staging or deployed database" — names environments this
project does not have. Decision H records the fact: no production database exists, integration
slots are reset and re-migrated from scratch, so `public.acknowledgments` is empty at the
moment this migration runs, and the loop tier has no database at all. The row census sol asks
for IS the slot-reset procedure. On a stray populated dev database the loud abort is the chosen
behavior: a backfill would fabricate signer identities for rows that never captured one, which
is the exact defect this requirement exists to prevent. Risk accepted and recorded.

## [5] medium — accept

> "The migration's done-criterion omits the PostgREST schema-cache reload required after
> recreating `complete_signup`."

Accepted. Both existing migrations end with `notify pgrst, 'reload schema';` and the newer one
documents why the reload must follow a drop — the stale cache entry names a signature that no
longer exists. Step 6's done-criterion now names the notify tail after the grants block.

## [6] medium — accept

> "AT-001.39 claims to prove absence of every write but checks only the account, acknowledgment
> rows, and acknowledgment predicate."
> "A refusal that leaves an organization or membership behind still satisfies the listed
> assertions... The existing `organizationsNamed` and `membershipsOf` observables can close
> this gap."

Accepted. The contract's own comments state that a refusal's return value cannot prove nothing
was written, and names these observables as the reads built for that. Step 2's no-partial-state
assertions extend to `organizationsNamed` (the refused NGO completion's organisation name is
absent) and `membershipsOf` (empty) after every refusal, at both tiers.

## [7] medium — accept

> "The proposed `length(btrim(...)) > 0` constraints do not reject all whitespace-only signer
> fields."
> "PostgreSQL's one-argument `btrim` strips spaces but not tabs and other whitespace, as the
> current GitHub migration already documents; a direct database caller can therefore store
> tab-only name, title, and attestation values..."

Accepted. The GitHub migration documents exactly this defect and its repaired shape: the
scalar constraints use `col !~ '^\s*$'`, the POSIX whitespace class. Decision A changes to that
shape for all three columns and stops citing `text_version`'s older `btrim` shape as the
pattern. `text_version`'s own gap is pre-existing code and stays untouched — noted here, not
repaired, per the surgical-change rule.

## Disposition summary

| # | severity | ruling |
|---|---|---|
| 1 | critical | accept, fixed differently — rationale rewritten, defaults kept, no bridge claimed |
| 2 | high | accept in part via [3]; display narrowing stands, terminal, claim rides the PR |
| 3 | high | accept — attestation must match the shipped statement; wrong-content variant added |
| 4 | high | reject — the environments the claim needs do not exist; loud abort is the design |
| 5 | medium | accept — notify pgrst reload joins step 6's done-criterion |
| 6 | medium | accept — organizationsNamed and membershipsOf join the no-partial-state assertions |
| 7 | medium | accept — constraints use `!~ '^\s*$'` per the newer migration's documented shape |
