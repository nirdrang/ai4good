## Findings

No critical-severity findings. The happy paths do what the intent says. What follows are real defects and structural risks, ordered by conviction.

### 1. [Warning] The allowance debit's email gate lives in SQL plus a hand-mirror in the fixture, not in the shipped decision
**Location**: `supabase/functions/_shared/discovery-allowance.ts:128-177` vs `supabase/migrations/20260916120000_discovery_allowance.sql:148-152` vs `tests/at/suites/req-002/_fixture.ts:810-817`
**Finding**: `decideDiscoveryAllowance` never checks email verification. It checks membership/role and credit shape, then permits. The refusal for unverified callers exists only inside the `discovery_allowance` definer (`select email_confirmed_at ... if v_confirmed is null raise email-unverified`) and in a second copy inside the loop fixture (`if (emailVerified.get(caller.id) !== true)`).
**Evidence**: The standing type has no email field, so the check *cannot* live in `decide` without widening `write_standing` — the exact widening the design refused in G3. The result is the rule has two authors: change the SQL message/kind and the fixture drifts; change the fixture and loop proves something SQL does not do. No acceptance body debits as an unverified caller — every allowance test provisions `emailVerified: true`; AT-002.22 only consults the pure `discoveryMessageAllowed`, never `debitAllowance`. So the one email gate on the money path is the one gate with zero acceptance coverage at either tier.
**Suggestion**: Either put the verified fact into the standing (one read, judged once, both layers consume it) or stop claiming the debit enforces it and move the check to the future Discovery send route only. Two copies of a security rule with no test on either copy is the worst of both.

### 2. [Warning] The live adapter cannot call any edge route as an unverified NGO, so finding 1 is untestable at integration tier by construction
**Location**: `tests/at/suites/req-002/_live.ts:205-234`, `172-178`
**Finding**: The unverified-NGO provision path completes signup as the operator and returns `{ accountId, email, sessionId: '' }`. Every later edge call goes through `tokensOf`, which throws `holds NO session` for `sessionId: ''`. An unverified debit at integration tier therefore throws a harness error, never a product `email-unverified` refusal.
**Evidence**: `postWrite` does `session === null ? anonKey : tokensOf(session,...).accessToken`; `tokensOf` looks up `sessions.get('')` → undefined → throw. The suite never hits this only because no body attempts it (see finding 1). The harness shape makes the missing coverage permanent, not incidental.
**Suggestion**: Provision unverified NGOs through a path that still holds a session (e.g. confirm-then-`update auth.users set email_confirmed_at = null` as operator, or keep the password grant), or explicitly record that the debit email gate is integration-untestable.

### 3. [Warning] Validation-before-authorization in the profile definer vs authorization-before-validation in the shipped decision
**Location**: `supabase/migrations/20260915120000_organization_profile.sql:44-93` vs `supabase/functions/_shared/memberships.ts:151-183`
**Finding**: The SQL function trims and refuses empty fields (lines 44-69) *before* checking org existence (71) and membership/role (76-93). The TypeScript decision checks role (line 160) *before* any field. Same input, different refusal kind depending on which layer you hit: a non-member sending an empty mission gets `invalid-request` 400 from SQL and `not-a-member`/`not-an-admin` 403 from the edge.
**Evidence**: The operator arm (`attemptProfileDefinerAsOperator`) drives SQL directly, so the suite can observe both orders. Beyond test-oracle fragility, the SQL order lets an unaffiliated caller probe field validation on an org they have no standing in, and returns existence/field information before establishing any right to it. Fail-closed would be authz first in both.
**Suggestion**: Reorder the definer: `assert_account_active` → org-exists → membership/role → field checks → write. Same for the vet path (see finding 4).

### 4. [Warning] Vet checks org existence late, unvet checks it early — error precedence depends on action
**Location**: `supabase/functions/_shared/org-vetting.ts:277-280` vs `:370-372`
**Finding**: Unvet refuses `no-such-organisation` before any other work. Vet validates six evidence fields, URL shape, evidence type, and registration metadata first, and only then checks `orgExists`. A vet to a nonexistent org with a bad URL returns `invalid-request`; fix the URL and it returns `no-such-organisation`. Existence probing via vet is field-dependent.
**Evidence**: Lines 302-368 are all the field checks; the `!input.standing.orgExists` refusal sits at 370, after them. The unvet equivalent sits at 278, before everything. There is no semantic reason for the difference — both need the org to exist.
**Suggestion**: Move the vet `orgExists` check next to the unvet one, right after the action/extras/note checks.

### 5. [Warning] Seat-holder selection is nondeterministic on its face
**Location**: `supabase/migrations/20260916120000_discovery_allowance.sql:280-287` (and identical in `20260914120000_org_vetting.sql:162-169`)
**Finding**: `select account_id into v_holder from public.org_memberships where org_id = ... for share` has no `ORDER BY`, no `LIMIT 1`. With more than one membership row, `SELECT ... INTO` silently takes an arbitrary row and the vetting notification goes to an arbitrary member.
**Evidence**: Today the seat is unique by convention ("the unique seat forbids a second member"), so this holds by discipline, not by structure. Nothing in this function would fail if a second seat appeared — no `STRICT`, no count check — it would just notify the wrong person and record nothing about the choice. A security-relevant recipient resolved by an unordered single-row select is exactly the kind of convention-that-won't-hold the rubric warns about.
**Suggestion**: `select ... into strict`, or assert `count(*) = 1`, or at minimum `order by ... limit 1` with a comment. Fail loudly on zero *and* on two.

### 6. [Warning] Mixed clocks in one transaction: `vetted_at` uses `now()`, the ledger day uses `clock_timestamp()`
**Location**: `supabase/migrations/20260916120000_discovery_allowance.sql:377` (`now()`) vs `:409` (`clock_timestamp()`)
**Finding**: Correction C1 deliberately moved the UTC-day read to `clock_timestamp()` after the lock, but `vetted_at` (and whatever timestamp `append_audit_event` uses) still comes from `now()`, i.e. transaction start. A transaction that begins before midnight and locks after it records `vetted_at` yesterday and the grant mark today.
**Evidence**: The two clocks are three lines of reasoning apart in the same function body. Either the C1 argument applies to both (use `clock_timestamp()` for both) or `vetted_at` is intentionally "when the request started" — in which case the audit `occurred_at` and `vetted_at` can disagree with the ledger day about which day the action happened on, and no comment says which reading is intended.
**Suggestion**: Pick one clock per action, document it, and use it for `vetted_at`, the audit instant, and the UTC day together.

### 7. [Warning] Re-vet is always a "change": retries duplicate audit rows and notifications, with no idempotency story
**Location**: `supabase/functions/_shared/org-vetting.ts:300-392`; `supabase/migrations/20260916120000_discovery_allowance.sql:295-308` vs `:309+`
**Finding**: Unvet-of-unvetted has a `changed: false` early return (no audit, no event). Vet has no counterpart: vetting an already-vetted org always upserts with fresh `now()`, appends an audit row, and emits a notification event with deliveries. A client timeout followed by a retry — the normal case for an admin button — produces two audit rows and two user-visible notifications for one intent.
**Evidence**: There is no request key, no evidence-hash comparison, nothing distinguishing "same vet retried" from "new evidence submitted." AT-002.08 exercises vet→unvet→vet, never vet→vet, so the duplicate path is untested. Append-only audit makes duplicate *rows* defensible; duplicate *notifications to the NGO* is user-visible spam from a network retry.
**Suggestion**: Either document "every vet notifies, retries included" as intended operator behavior, or add a no-op path when the incoming evidence is byte-identical to the stored row.

### 8. [Warning] Corrupt-data projections degrade silently instead of signaling
**Location**: `supabase/functions/_shared/org-vetting.ts:187-213` (`vettingRecordFromSql`), `:215-237` (`vettingAuditCurrentFromDetail`)
**Finding**: If `evidence_type` is `emailed_registration_documents` but a registration column is null — impossible per the check constraint, but the projection is the last line of defense — `vettingRecordFromSql` returns `registration: null`, i.e. a well-formed record that quietly claims "no registration metadata." `vettingAuditCurrentFromDetail` coerces every missing string field to `''` (`String(current.x ?? '')`) and only null-checks two fields, so a truncated audit `current` blob surfaces as empty strings rather than a detection.
**Evidence**: The live adapter throws only when `current === null` (`_live.ts:491-493`); a half-present `current` passes through as `''`s and the test asserts on them as if they were data. This is the "guard clause masking an invariant violation" pattern: the constraint is the real enforcement, and the reader converts its violation into plausible-looking data.
**Suggestion**: Throw on constraint-impossible shapes in both functions. The database guarantees it; the projection should detonate, not narrate, if the guarantee ever breaks.

### 9. [Warning] Allowance reads take a write lock; every read serializes with every write per org
**Location**: `supabase/migrations/20260916120000_discovery_allowance.sql:81`
**Finding**: `perform 1 from public.organizations where id = ... for update` runs on the `read` path too. A pure balance read holds a write lock on the org row for the transaction's duration, blocking concurrent vets, debits, and other reads on the same org.
**Evidence**: Correctness does not need it — the read path writes nothing and persists nothing (it deliberately leaves no row; the test at `b-allowance.test.ts:142-146` asserts exactly that). `FOR SHARE` (or no lock, with a documented skew tolerance) suffices. Under concurrent Discovery turns this is a self-inflicted contention point on the hottest row in the feature.
**Suggestion**: `FOR SHARE` on read, `FOR UPDATE` on debit/vet. If the write lock is intentional serialization, say so in the comment that currently only discusses the clock.

### 10. [Warning] Duplicated prose across languages, held together by a brittle exact-match test
**Location**: `supabase/functions/_shared/discovery-allowance.ts:49-54` vs `supabase/migrations/20260916120000_discovery_allowance.sql:167-173`; oracle at `tests/at/suites/req-002/_source-scan.ts:794-825`
**Finding**: The exhausted sentence is authored twice — once as a TS renderer, once as a SQL `RAISE` format string — and `scanExhaustedSentence` requires them byte-identical after substitution, while *also* forbidding any digit in either copy (`/\d/` on the SQL format, `/\b\d+\b/` on the renderer). The structure is sound (SQL passes `discovery_daily_grant(true)`, never a literal), but the coupling is prose-equality enforced by regex: any future copy edit containing a digit ("within 48h", "3 remedies") fails the build, and any rewording must land in two languages at once.
**Evidence**: The oracle's own digit checks prove the fragility — they constrain *wording*, not values. The grant-number pin (G5) is value-level and fine; the sentence pin is string-level and will false-positive on honest copy.
**Suggestion**: The cleaner structure is one renderer: SQL raises a stable code plus structured args (`org_id`, `vetted_grant`), and the edge renders the sentence. If dual-authoring stays, scope the digit check to format *arguments*, not to the human sentence.

### 11. [Warning] `_source-scan.ts` crosses 1k lines to assert absences; the oracles are name-based and will false-positive
**Location**: `tests/at/suites/req-002/_source-scan.ts` (1365+ lines), plus `tests/at/harness/req002-oracles.selftest.ts` (~942 lines)
**Finding**: Per the code-quality bar, pushing a file past 1000 lines needs a strong reason. Six overlapping scanners (KYC names, wallet names, publish names, trust wording, grant pins, sentence pins) plus a near-1k selftest file that tests the tests is incidental complexity the product does not need. The header comments concede the core weakness: a disguised surface (`review-desk.tsx`, `go-live.tsx`, `credit-desk.tsx`, runtime-assembled copy) escapes every arm — so the suite pays ~2300 lines for oracles that catch only honestly-named regressions.
**Evidence**: Concrete tripwires: `VERIFIED_FIELD = /\bverified\s*\??\s*:/g` flags *any* future `verified:` key on a product surface; the wallet/publish scanners tokenize every declaration name in the tree on every run. Each new feature anywhere near these words buys a build break unrelated to its behavior.
**Suggestion**: Keep the two load-bearing arms (exactly-one-route-to-definer; no writers outside the definer) and the grant-value pin; collapse or delete the naming sweeps, or move them to a periodic audit rather than the per-run gate. At minimum split the file — one oracle family per module.

### 12. [Nit] Duplicated parsing helpers across the two new shared modules
**Location**: `supabase/functions/_shared/org-vetting.ts:156-177` vs `supabase/functions/_shared/discovery-allowance.ts:97-112`
**Finding**: `isRecord`, `integerField`, `booleanField`/`isoDay`/`timestampField` are re-implemented per file while `stringField` already lives canonically in `write-routes.ts`. Three modules, three private copies of the same narrowing.
**Evidence**: `write-routes.ts:236-240` owns `stringField` with the comment "the shape every selector answers with" — the pattern for where these belong already exists. The copies have already diverged in strictness (finding 8's `->>` vs `typeof` mismatch is the same disease one layer down).
**Suggestion**: Move `integerField`, `booleanField`, `timestampField`, `isoDay` into `write-routes.ts` (or a `fields.ts`) and delete the local copies.

### 13. [Nit] `vettingOutcomeNotice` throws where the module otherwise returns decisions
**Location**: `supabase/functions/_shared/org-vetting.ts:85-94`, called at `:287` and `:380`
**Finding**: Every other judgement in this module returns a `Decision`/`WriteRouteDecision`; the notice builder `throw`s on a missing taxonomy row. Called inside `decideOrganizationVetting`, the throw escapes `writePipeline` and becomes a 502 via `edgeHandler` instead of a shaped refusal — and in the loop fixture it escapes `setVetting` entirely rather than returning `{ ok: false, ... }`.
**Evidence**: `decideOrganizationVetting` has no try/catch; `writeRoute` in `edge.ts:346-379` only converts returned decisions, while thrown errors fall to `edgeHandler`'s 502. A deleted taxonomy row turns an admin action into an outage-shaped response with no kind.
**Suggestion**: Return a refusal (`refused`, 502 with the sentence) or resolve channels/copy inside the definer where the taxonomy row actually lives. Throwing across a function whose contract is "return a decision" breaks the module's own convention.

### 14. [Nit] Profile update is check-then-act without a lock and without a rowcount check
**Location**: `supabase/migrations/20260915120000_organization_profile.sql:71-74`, `:95-101`
**Finding**: Existence is checked with a lock-free `select 1`, membership is read lock-free, and the `UPDATE` result is never verified. An org deleted between the check and the write yields a success JSON for a nonexistent org.
**Evidence**: Contrast the vetting and allowance functions, which both take `FOR UPDATE` on the org row first. This function takes none. Reachability requires a concurrent org delete, which may not exist as a product path today — hence nit, not warning — but the three sibling writers all lock and this one does not, with no comment explaining the difference.
**Suggestion**: Lock the org row like the siblings do, or check `GET DIAGNOSTICS ... ROW_COUNT` after the update and raise `no-such-organisation` on zero.

### 15. [Nit] Whitespace-class divergence between edge trim and SQL trim admits NBSP-only values via direct RPC
**Location**: `supabase/functions/_shared/write-routes.ts:236-240` (`String.trim`, Unicode-aware) vs `supabase/migrations/20260914120000_org_vetting.sql:26-54` (`btrim(x)` / `~ '[^[:space:]]'`, ASCII POSIX classes)
**Finding**: The edge refuses a name of only U+00A0 (JS `trim` strips it → null → 400). The definer's `btrim(..., ' \t\r\n\f')` leaves it intact and POSIX `[^[:space:]]` matches it (NBSP is not in the ASCII class), so the not-null/populated checks pass and the row stores a visually blank name.
**Evidence**: Same divergence exists in the profile migration (`length(btrim(mission)) > 0` with default single-space trim vs the function's explicit char set). The backstop is strictly weaker than the gate it backs.
**Suggestion**: Normalize with the same character class in both layers, or add a `CHECK (col = btrim(col))`-style guard so stored values are already canonical. At minimum, note the backstop gap in the function comment that currently claims the checks are a backstop.
