# Gate 1 rulings — AI4DEV-81 (per-item integration verification)

Ruler: the DRAFT orchestrator sitting (fable). Reviewer: gpt-5.6-sol via codex, effort xhigh,
read-only. Source: `artifacts/gate1-sol.output.txt` (11 findings), distillate
`artifacts/gate1-sol.distilled.md`. Every claim below is quoted verbatim from the raw output.
Every load-bearing code fact each finding cites was re-verified against this tree before ruling.

## Finding 1 — ACCEPT

> "D4 treats syntactically local connection strings as positive provenance even though they are
> not bound to the runner's validated slot evidence."

Verified: `localStackProblems` (runner.ts:714) checks URL shape and JWT claims only — all
fabricatable without any prepared stack answering. The child receives four plain strings
(db-pool.ts:1249-1254). Shape checks are a guard against the personal stack, not positive
provenance.

**Remedy adopted:** real provenance for slot-backed capabilities requires a live round-trip
binding. `prepare()` mints a per-run attestation nonce and writes it into the slot database after
the reset (service-role SQL); the child receives it as `AT_SLOT_ATTESTATION`. The live adapter's
construction reads the nonce back from the slot database THROUGH the supplied coordinates and
refuses on mismatch or read failure. The existing shape checks stay (they guard the personal
stack). Positive grounds = "these coordinates answered with this run's runner-minted value."
Selftests (step 3) must include the fabricated-but-well-formed case sol names.

## Finding 2 — ACCEPT

> "The proposed generic live-backed route does not preserve the closed-table doctrine for
> `sut.*` names."

Verified: `adapterDerivedCapability` (capabilities.ts:311) is safe precisely because every
outcome is stand-in; its own comment says a prefix that GRANTS a verdict is a hole.

**Remedy adopted:** no route ever grants `real` by prefix. The live route constructs `real` only
for exact names drawn from a CLOSED enumeration the live adapter module itself exports (its
backed-method list), with two admission checks: every enumerated name must exist on the loaded
adapter surface, and every grant must carry finding 1's attestation evidence. Names outside the
enumeration are never real (they go through the callable-pending mechanism of finding 5). The
witness table stays closed; the live route is a separate constructor with its own admission
partition, mirroring the existing two-route design. Step 3's selftests must prove the NEW route
refuses unknown and unenumerated names — not only that the old table does.

## Finding 3 — ACCEPT

> "Every integration harness will still contain the `vendors.email` stand-in, so D2 rejects
> every planned green body before it reaches the live adapter."

Verified: `buildCapabilityLedger` constructs `EmailProviderSim` unconditionally (index.ts:181,
:188) and the whole-ledger gate (registry.ts:619) refuses any stand-in above loop. The same
structural problem covers `clock.controlled` (index.ts:175, finding 4) and `fixtures.worlds`
(always stand-in on the adapter-derived route).

**Remedy adopted:** ledger construction becomes tier-aware. At integration it constructs: a live
email capability reading the slot stack's mail catcher (the endpoint derived from the slot's own
status/config, attested per finding 1, probed before grant — the witness gains a live branch
granting `real` on that positive evidence; the sim branch is untouched); the attested real clock
(finding 4); and live-route fixtures/sut entries (findings 2, 5). Whether the slot stack serves
its mail catcher and at which port joins step 5's verify-first list.

## Finding 4 — ACCEPT

> "The attested clock specified by D4 cannot satisfy the harness types because it deliberately
> lacks the methods the contract requires."

Verified: `Clock` requires `freezeAt`/`advance` (contracts.ts:54-57); `createFixtureAdapter`
requires a `ControlledClock` (index.ts:41); the ledger constructs one unconditionally
(index.ts:175).

**Remedy adopted:** the contract and construction become tier-aware. Integration constructs an
attested real clock with NO control seam; the `clock.controlled` witness gains the
attested-real branch its refusal text already anticipates ("no attested real clock backing"),
granting `real` only on the harness's own real-clock constructor's positive attestation. The
per-tier context types (D5) carry the difference: an integration body's clock type exposes no
`freezeAt`/`advance`, so misuse fails typecheck. The live adapter factory has its own signature
and does not take a `ControlledClock`. Loop types and loop construction are byte-identical to
before.

## Finding 5 — ACCEPT

> "D3 assigns provenance at the wrong granularity because every REQ-001 id shares the single
> `sut.accounts` key."

Verified: the suite binds exactly one sut key, `accounts` (_bind.ts:34-40).

**Remedy adopted:** method-level backing inside the one key, exactly the "method-level provenance
and a new callable pending mechanism" the finding names. The live adapter exports a closed
enumeration of BACKED method names (finding 2); unbacked methods become callable pending proxies
that throw `CapabilityPending` naming `sut.accounts.<method>` ON USE. A pending-on-use proxy is
not a ledger stand-in — it fakes nothing and can never produce a green — so the whole-ledger gate
passes while any id that leans on an unbacked method goes declarably red at use time. The
`sut.accounts` ledger entry is `real` with evidence naming the backed enumeration and the
attestation; the failure direction stays false-red, never false-green. D2's gate semantics amend
accordingly: the gate still refuses any ledger STAND-IN above loop; use-time refusal covers the
method axis.

## Finding 6 — ACCEPT, FIXED DIFFERENTLY

> "The transient `jwt_expiry` step has neither a safe slot-management mechanism nor an oracle
> capable of proving restoration."

Verified: `prepare()` owns the config mirror, the generated write, the hash marker and restarts
(db-pool.ts:1184-1205); the child holds coordinates only. A body editing the repository file
changes nothing in the running slot; a body editing the slot directly breaks the marker
discipline; `git diff supabase/config.toml` measures the wrong object. All three points stand.

**Remedy (different from the plan's):** there is NO transient override and NO restoration to
prove. `generateSlotConfig` (db-pool.ts:308) gains one sanctioned, pinned transform: slot configs
set a STANDING low `auth.jwt_expiry` (target ~120 s; exact value settled by step 5's
verify-first against the local stack's accepted range). The value rides the existing
generated-config + hash-marker + restart machinery, so it is applied exactly when absent and
never needs restoring — it IS the slot's config, identical every run. This also makes the expiry
arm of AT-001.12 and the client auto-refresh of AT-001.13 provable inside the single manifest
run, with zero mid-run mutation. Struck from step 6: the in-run restore and the `git diff` proof.
Cost: the two session-lifetime bodies each wait roughly one expiry window; accepted (D1 already
accepted minutes per item). The generator's own comment says any other difference means the slot
grades different behaviour — this is a deliberate, reviewed extension of its permitted transform
set, asserted by its selftests.

## Finding 7 — ACCEPT

> "The plan declares AT-001.13 green using evidence that explicitly does not prove automatic
> refresh."

Verified: the criterion demands refresh "automatically without forced re-login mid-work"
(at-req-001.md:28); the loop body calls `refreshSession` explicitly and says automatic
scheduling is unproved; the transcript says only the mechanism was proved. A mechanism-only
green at the tier whose meaning is "proved for real" would be a new overclaim made by this item.

**Remedy adopted:** AT-001.13 leaves the unconditional floor. Green is permitted ONLY with a
genuine automatic-refresh body: a real client (supabase-js with `autoRefreshToken: true`)
against the slot stack under finding 6's standing low expiry, observing token rotation occur
WITHOUT any explicit refresh call, then continued access. Feasibility joins step 5's
verify-first list; if auto-refresh cannot be observed deterministically, the id is declared red
with its exact kind — never a mechanism-only green. The loop tier's existing green for this id
is pre-existing on main and is not relitigated by this item.

## Finding 8 — ACCEPT

> "The selected AT-001.09 migration omits the check that proves verification for both
> email-capable account types."

Verified: the criterion says "EITHER account type ... (NGO and volunteer)" and carries the
"parameterized over account types" note (at-req-001.md:20). The migrated set (a, b, b2, d) is
NGO-only; the volunteer path is the email item's proof check (e).

**Remedy adopted:** step 6's AT-001.09 body is parameterized over both account types, the
volunteer path following the transcript's check (e) recipe.

## Finding 9 — ACCEPT

> "Signup atomicity does not prove AT-001.01, yet the plan makes that id a mandatory
> integration green."

Verified: the criterion demands the account with type NGO, the org admin membership, the
recorded acknowledgment (timestamp, IP, text version) gating project creation, and a later
sign-in (at-req-001.md:9). Atomicity is the negative arm only.

**Remedy adopted:** AT-001.01 leaves the unconditional floor. Green requires the full-outcome
oracle: successful NGO signup asserting the account type, the org row, the admin membership, the
acknowledgment fields, the pre-project gate (oracled the way the loop body oracles it, against a
live surface), and a subsequent sign-in with the same credentials — with the atomicity check as
the negative arm. Step 1 settles whether every clause is live-oracleable from the deployed
surfaces; any clause that is not makes the id red with its exact kind, recorded in the table.

## Finding 10 — ACCEPT

> "Step 7 derives initial red declarations from the run they are supposed to judge."

The exact-match machinery pins drift, not first-run truth; the plan gave the first run authority
over its own expectations.

**Remedy adopted:** declarations are AUTHORED BEFORE the first integration run, from step 1's
settled table plus the fixture/adapter analysis — an inventory independent of the run. The run
must then match. Any divergence is investigated as a defect first; a declaration may be amended
toward the run only with the cause traced to code or fixture and recorded in the item record.
Step 7's done-criterion amends accordingly.

## Finding 11 — ACCEPT

> "D10 incorrectly says the existing workflow comment avoids choosing between queueing and a
> dead runner."

Verified: ci.yml:46 flatly asserts "hosted capacity queued this job for 11-15 minutes on
2026-08-06" — that elects the queue story the partner item forbids treating as distinguished.
D10's factual claim about the comment was wrong.

**Remedy adopted:** amend the comment (comment-only; zero behavior change; the required check
stays loop-only and fast) to state both candidate explanations as undistinguished: the job got
no runner for 11-15 minutes — hosted queueing and a dead runner lane are equally consistent with
the evidence — and either way the budget expired before a single step ran. D1's "ci.yml is not
changed" loosens to "ci.yml's BEHAVIOR is not changed; the one edit is this comment
neutralization." The merge ruling cites the amended comment as part of the partner's evidence.

## Disposition summary

| # | severity | ruling |
|---|---|---|
| 1 | critical | accept — attestation nonce binds coordinates to the prepared slot |
| 2 | critical | accept — real only per exact enumerated name, never by prefix |
| 3 | high | accept — tier-aware ledger construction; live mail-catcher capability |
| 4 | high | accept — tier-aware clock contract; attested real clock witness branch |
| 5 | critical | accept — method-level backing; callable pending proxies |
| 6 | critical | accept, fixed differently — standing low jwt_expiry in the generated slot config; no transient override |
| 7 | critical | accept — genuine client auto-refresh or declared red; floor conditioned |
| 8 | high | accept — both account types in the .09 body |
| 9 | high | accept — full-outcome oracle for .01 or declared red; floor conditioned |
| 10 | medium | accept — declarations authored from the settled table, never from the run |
| 11 | high | accept — neutralize the ci.yml comment; D1/D10 amended |

No finding is rejected; no verify-first RULING is open (the runtime unknowns sol's remedies
depend on are folded into step 5's verify-first list: mail catcher presence and port, accepted
`jwt_expiry` range, supabase-js auto-refresh observability, edge-function serving mode).
