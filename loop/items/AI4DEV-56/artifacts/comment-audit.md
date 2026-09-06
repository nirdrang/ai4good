# Comment audit — nirdrang/ai4dev-56-admin-operations-lifecycle-gates-and-audit-d6 vs main

Scope: comments ADDED or CHANGED by the diff (lines starting with `+` in the patch), excluding
everything under `loop/items/AI4DEV-56/`. Documentation/data files (`.taskmaster/docs/**`,
`loop/decomp/**`, `loop/out/**`, `loop/state/decisions.jsonl`, `tests/at/expected/req-001.json`)
are prose/data, not code comments, and are out of scope for this audit — flagged as skips below,
not judged.

Standard applied: comment-sicko leash (legal/license headers; non-obvious behavior forced by an
external dependency/platform/vendor/protocol we cannot reshape, MUST KILL-flagged when it is our
own code instead; `// prettier-ignore` and non-pedantic lint suppressions; doc comments defining a
public API contract; issue/RFC links). Internal acceptance-test ids (`AT-001.xx`) and ruling
numbers (`R1`…`R15`) are not RFC/issue links and do not qualify for the keep-list on their own.

---

## supabase/functions/_shared/accounts.ts

DELETE
- "This mirrors the `public.account_lifecycle` enum under the same rule `ACCOUNT_TYPES` is under: the database wins, and `public.assert_account_active` re-reads the column itself rather than trusting this module." — design narration on our own code, no exception.
- "/* ------------------------------------------------ 5. the two write routes this module decides for */" — banner.
- "THE FOUR GITHUB KEYS ARE OMITTED ENTIRELY WHEN THERE IS NO HANDLE, rather than sent as nulls, and the difference is a DEPLOYMENT property: the database function gives them `default null`, so a call carrying only the original arguments resolves against either version of it while a migration is rolling." — justifies our own function's shape in prose. **MUST KILL: `SignupCompletionArgs` / `decideSignupCompletion`** — extract the conditional-spread into a named helper (e.g. `githubArgsOrEmpty`) so the omission is a type/name, not a paragraph.
- "An NGO completion writes no `volunteer_profiles` row, so the omission reaches no column." — same comment, same verdict.
- "`complete-signup`'s decision: `validateCompleteSignup` over the body and the caller fact, then the onboarding import for a volunteer — AT-001.05." — meat (AT-id narration).
- "The stats are computed for the JUDGED handle and travel in the same database call as the account, so there is no queue and no second request: a queued-but-empty import is unrepresentable rather than merely untested." — design rationale, meat.
- "// THE CALLER FACT COMES FROM AUTH, never from the body: a handle a client asserts gates nothing." — a real security-relevant surprise, but it is OUR code, not a vendor/platform constraint. **MUST KILL: `decideSignupCompletion`** — rename the value taken from `input.caller.githubHandle` (e.g. to `verifiedGithubHandle`) so provenance is obvious without prose.
- "`create-organization`'s decision. The NGO-only refusal is NOT here: it is the inventory's — `WRITE_ROUTES['create-organization']` admits `ngo` — and the gate applies it with `ngoOnlyActionAllowed`'s own sentence before this runs." — architecture narration, meat.
- "The lifecycle states an account can hold — v1 has two and no third (R8). This mirrors the `public.account_lifecycle` enum..." (doc block on `ACCOUNT_LIFECYCLES`) — the values are already fully visible in the array literal; the doc adds only rationale and an R-id citation. Meat.

KEEP
- "/** The lifecycle a row carries, or `null` for every value this module does not recognise — it fails closed. */" (on `parseAccountLifecycle`) — doc comment stating the exported function's actual return contract, no rationale, no id citation.

Deletions in this file: 9. Keeps: 1.

---

## supabase/functions/_shared/admin-operations.ts (new file)

DELETE
- Whole file-header doc block: "THE PLATFORM ADMINISTRATOR'S THREE OPERATIONS, as pure decisions: ... (AT-001.25, .26, .27, .35) ... (AT-001.28) ... (AT-001.29, .30, .31)." / "WHO MAY CALL IS NOT DECIDED HERE. ..." / "Same two constraints as `accounts.ts`: no non-relative import and no Deno global; no I/O, no clock, no randomness." — pure narration of scope, architecture and AT ids; no part defines a contract of an exported symbol on its own line. Meat.
- "The transferee is the SUBJECT whose standing the route loads: its type and lifecycle decide three refusals below. The outgoing account is the organisation's seat holder and is read with the organisation, so it needs no field of its own in the standing." (on `subjectAccountIdField`) — design rationale, meat.
- "/* ------------------------------------------------------------------------ the contact transfer */" — banner.
- "THE TRANSFER NAMES THE OUTGOING ACCOUNT and refuses when that account no longer holds the seat, so a retry after a timeout cannot move a seat from a state the caller never saw. It refuses when the outgoing account holds another seat (R6)... And it refuses a transfer to the same account..." (on `decideContactTransfer`) — long justification, R-id, meat; behavior is already legible from the refusal branches themselves.
- "/* ---------------------------------------------------------------------- the escalation contact */" — banner.
- "/* ---------------------------------------------------------------------- the lifecycle setter */" — banner.
- "THE SUBJECT IS THE STANDING'S SUBJECT. An administrator changing its own lifecycle is `invalid-request` — a second administrator is required. A deactivated administrator never reaches this decision: the inventory gate refuses it first." (on `decideLifecycleChange`) — restates code already visible at the `subjectAccountId === input.caller.id` check plus narrates a different module's behavior. Meat.

KEEP
- "/** The account whose lifecycle the setter changes — the standing's subject. */" (on `accountIdField`) — short, states what the returned field represents, no rationale.
- "/** A name and an address are what make the row a contact; a blank phone records nothing rather than ''. */" (on `validateEscalationContact`) — states the function's actual validation/shape contract precisely, no id citation.

Deletions in this file: 7. Keeps: 2.

---

## supabase/functions/_shared/edge.ts

DELETE
- "NOT EXPORTED, and that one line is the whole structural claim of the write boundary: a route has no way to reach `/rest/v1/rpc/` except through `writeRoute` below." (added to `callDatabaseFunction`'s doc) — architecture narration; the `write-route-scan.selftest.ts` conformance check already enforces this structurally. Meat.
- Whole doc block on `writeRoute`: "THE WRITE BOUNDARY, AS THE HANDLER..." / "The order is fixed: refuse a method that is not POST, resolve the caller..." / "AN ID THAT CANNOT BE A UUID IS REFUSED BEFORE THE STANDING READ, because PostgREST would fail the cast..." — narrates the function body step by step; the function body already shows the order. Meat (the PostgREST-cast sentence is the only borderline one, but it explains our own ordering choice, not a vendor quirk we're forced into — the 502 vs a UUID check is our design).
- "// The database's backstop fired. Its sentence travels as the reason and the kind it attached as DETAIL travels as the kind: 409 for anything the database judged, 502 for transport." — restates the two lines immediately below it. Meat.

KEEP
- "/** The result of a database function call: its value, or the database's own refusal. `details` is the DETAIL a definer attached with `RAISE ... USING DETAIL`, which is where a backstop refusal carries its kind (R10); null when the refusal carried none. */" (on `RpcOutcome`) — states the exported type's contract, including how Postgres's own `RAISE ... USING DETAIL` mechanism (external protocol behavior) surfaces in the `details` field. Doc comment on a public contract, with a genuine protocol note.
- "/** One round trip for type, lifecycle, role-in-target, the organisation's seat and the subject. */" (on `loadWriteStanding`) — states what the function returns, no rationale.

Deletions in this file: 3. Keeps: 2.

---

## supabase/functions/_shared/gateway-keys.ts (new file)

DELETE
- File-header doc: "WHAT A LIFECYCLE CHANGE REQUIRES OF THE PROJECT'S VIRTUAL KEYS. The LLM gateway leaf (REQ-009) must consult this decision. This tree ships the hook and no table, because the founder has not answered the declare-or-stub question and the design's DECLARE assumption holds." / "Same two constraints as `accounts.ts`..." — status/rationale narration citing an unresolved founder question. Meat.
- "/** What a lifecycle change requires of the project's virtual keys (REQ-009's leaf must consult it). */" (on `virtualKeyActionFor`) — duplicate of the header sentence with an id citation; the function body (`revoke`/`reissue`/`none` on the two lifecycle transitions) is already self-explanatory. Meat.

Deletions in this file: 2. Keeps: 0.

---

## supabase/functions/_shared/memberships.ts

DELETE
- "THE ORGANISATION NAME RULE IS NOT HERE. `validateOrganizationName` lives in `./accounts.ts`, and `decideOrganizationRename` below imports it from there. A second copy of a rule is the defect this whole arrangement exists to delete, and it does not get an exception for being three lines long." (changed sentence in the module header) — architecture narration. Meat.
- "/* ----------------------------------------------------------------- the rename route's decision */" — banner.
- "`update-organization`'s decision, in the order the deployed function has always applied: the role in the TARGET organisation, then the name — authorisation before validation, so a caller with no standing learns nothing about whether its name would have been accepted. An unknown organisation is not a case of its own... which is the deployed behaviour gate-2 ruling R2c measured." (on `decideOrganizationRename`) — long justification citing an internal ruling id; the order is already visible in the function body. Meat.

Deletions in this file: 3. Keeps: 0.

---

## supabase/functions/_shared/write-routes.ts (new file)

DELETE
- File-header doc: "THE WRITE BOUNDARY, AS A VALUE... This module is the PURE spine of that pipeline..." / "IT IS UNDER THE SAME TWO CONSTRAINTS `accounts.ts` STATES..." / "THE LIFECYCLE RULE IS STATED TWICE, HERE AND IN SQL..." — architecture and duplication narration. Meat.
- "/* ------------------------------------------------------------------------------- the inventory */" — banner.
- "THE CLOSED SET OF KINDS A WRITE REFUSAL CARRIES ON THE WIRE... which is the direction that matters when the value came from a database DETAIL or from a gateway error page." (on `WriteRefusalKind`/`parseWriteRefusalKind`) — the fail-closed mapping is already stated by the code (`?? 'refused'` pattern); the "direction that matters" clause is rationale. Meat.
- "/* ------------------------------------------------------------------- the caller's standing */" — banner.
- "`unreadable` is a third state on purpose: a read that did not happen is not a judgement about the caller, and collapsing it into `no-account` would tell a caller with a database outage to complete signup." — design rationale, meat.
- "/* ------------------------------------------------------------------------------- the pipeline */" — banner.
- "// The NGO-only sentence has one home, `ngoOnlyActionAllowed`, and AT-001.06 reads it." — AT-id narration, meat.
- "The gate, alone, so a body can grade it without building a request. THE ORDER IS LOAD-BEARING: deactivation is judged before type and before presence, because AT-001.29 asks that the refusal be deactivation's rather than an ordinary role or lifecycle precondition." (on `writeGateDecision`) — the order is our own code's structure, not a vendor constraint. **MUST KILL: `writeGateDecision`** — the fixed order should be a named, ordered structure in code (e.g. an array of named guard functions run in sequence) so the sequence is visible without a comment, instead of asserted in prose and re-asserted by an AT id.
- "/** Gate then decide. ONE spine; the edge and the fixture are two shells around it. */" (on the gate-then-decide combinator) — architecture narration rather than a contract of inputs/outputs. Meat.

KEEP
- "/** Where a route lives. A stand-in has no deployed function; the fixture drives the gate over it. */" (on the route-location union) — states the type's meaning, no id/rationale beyond the shape itself.
- "/** What the caller must be. The exemption carries its reason IN THE TYPE, so nothing is a bare flag. */" (on the caller-requirement type) — states a real type-design contract (no bare boolean), no id citation.
- "/** extra fields the refusal body carries beside `kind` and `reason`, e.g. the other organisations */" — states a field's contract.
- "/** A request field as a trimmed non-empty string, or null — the shape every selector answers with. */" — states a function's return contract.
- "/** The organisation a request targets, read from the one field every organisation-scoped route uses. */" — states a function's contract.
- "/** The kind a type mismatch carries, DERIVED from `admits` so there is no second field to sync. */" — states a real invariant (single source of truth), no id.
- "/** The account a route names beside the caller — the transferee, for the contact transfer. */" — states a field's meaning.
- "/** the caller's role in the TARGET organisation, or null — never a role held elsewhere */" — states a field's guarantee.
- "/** the organisation's single seat holder, which the transfer compares against */" — states a field's meaning.
- "/** every organisation that seat holder holds a seat in, so the transfer can name the others (R6) */" — mostly a field description; kept despite the trailing R6 tag since the clause it supports (why the field exists) is one short phrase, not a justification paragraph.
- "/** the subject account a route names; null when it names none or the account has no row */" — states a field's contract.
- "/** The answer of `public.write_standing`, judged. FAIL-CLOSED: every shape this function does not recognise is `unreadable` — never `no-account`, and never an account with a guessed field. */" (on `parseWriteStanding`) — states the exported function's actual fail-closed contract, no id citation.

Deletions in this file: 8. Keeps: 12.

---

## supabase/functions/complete-signup/index.ts

DELETE
- "EVERY JUDGEMENT IS `decideSignupCompletion`'s, in `../_shared/accounts.ts` — the module the acceptance suite drives. The row is `WRITE_ROUTES['complete-signup']`, which admits an absent account by design: the account row is what this route creates." — architecture narration, meat.

Deletions: 1. Keeps: 0.

---

## supabase/functions/create-organization/index.ts

DELETE
- "THE REFUSAL IS THE INVENTORY'S, not this file's: `WRITE_ROUTES['create-organization']` admits `ngo`, and the gate refuses every other type with `ngoOnlyActionAllowed`'s own sentence — the same function the acceptance suite drives." — architecture narration, meat.

Deletions: 1. Keeps: 0.

---

## supabase/functions/set-account-lifecycle/index.ts

DELETE
- "The platform administrator's lifecycle setter (AT-001.29, .30, .31). A deactivated administrator is refused by the gate before the decision; an administrator changing its own lifecycle is `invalid-request`." / "The decision is `decideLifecycleChange`'s, in `../_shared/admin-operations.ts`; who may call is the inventory's (`WRITE_ROUTES['set-account-lifecycle']` admits `platform_admin` only)." — AT-id and architecture narration. Meat.

Deletions: 1. Keeps: 0.

---

## supabase/functions/set-escalation-contact/index.ts

DELETE
- "The non-login escalation contact of an organisation (AT-001.28), recorded by a platform administrator on the same admin surface as the contact transfer (R15)." / "The decision is `decideEscalationContact`'s..." — AT/R-id narration. Meat.

Deletions: 1. Keeps: 0.

---

## supabase/functions/transfer-organization-contact/index.ts

DELETE
- "The audited contact transfer and lost-access recovery (AT-001.25, .26, .27, .35)." / "ONE ROUTE FOR BOTH: AT-001.27's words are 'behaves as AT-001.25 (same audited flow)'." / "The decision is `decideContactTransfer`'s..." — AT-id narration, meat.

Deletions: 1. Keeps: 0.

---

## supabase/functions/update-organization/index.ts

DELETE
- "THE DECISION IS `decideOrganizationRename`'s, in `../_shared/memberships.ts` — the same two shared rules the acceptance suite drives, and the refusal's `kind` on the wire is that decision's own field, passed through unchanged." — architecture narration, meat.

Deletions: 1. Keeps: 0.

---

## supabase/config.toml

KEEP
- "# REQ-001's edge functions. `verify_jwt` is STATED rather than inherited. The six write functions and the two authenticated reads operate on behalf of an already-authenticated caller; a default that changed underneath us would silently open a public write path." (only the count "three"→"six" changed, but the touched line sits inside this comment) — explains genuinely non-obvious behavior forced by the Supabase CLI/edge-runtime config platform: an inherited `verify_jwt` default silently changing would open a public write path. External-platform exception applies.

Deletions: 0. Keeps: 1.

---

## supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql

DELETE (banners)
- "-- ================================================================== the lifecycle state ========="
- "-- ================================================================== the audit record ============"
- "-- ================================================================== the escalation contact ======"
- "-- ================================================================== privilege posture =========="
- "-- ================================================================== append-only, in the schema =="
- "-- ================================================================== the write gate, in SQL ======"
- "-- ================================================================== the one standing read ======="
- "-- ================================================================== audit writing, internal ====="
- "-- ================================================================== the two admin writes ========"
- "-- ================================================================== the two existing writers ===="

DELETE (narration)
- "-- REQ-001, D6 leaf 1: the audited contact transfer and lost-access recovery (AT-001.25, .26, .27, .35), the non-login escalation contact (AT-001.28), and the lifecycle boundary they need — the column, the SQL gate, and the one standing read every write route loads first." — file-header AT-id narration.
- "-- THE LIFECYCLE RULE IS STATED TWICE, ONCE HERE AND ONCE IN TYPESCRIPT (R1)..." — duplication rationale, meat.
- "-- Two values and no third (R8). An enum rather than a boolean, so `suspended` cannot be written by accident, and rather than a nullable timestamp, so a null cannot mean 'probably active'. When and why live in `audit_events`, which is the only place they are written." — design rationale on the enum, R-id, meat.
- "-- The other-seats check (R6) and the standing read look seats up BY ACCOUNT; the unique index that keeps one seat per organisation is by organisation." — meat.
- "-- NO FOREIGN KEY AND NO CASCADE (R3). Actor and subject are plain uuids beside a denormalised label... `actor_account_id` is null on an operator path and `actor_label` then reads 'operator' (R9)." — design rationale, meat.
- "  -- AT-001.26's 'why', encoded rather than described: no audit row without a reason." — meat.
- "-- ONE ROW PER ORGANISATION, and 'non-login' is structural... (R15)... The primary key on `org_id` is AT-001.28's 'one escalation contact' as a fact about the shape; a second capture updates the row." — meat.
- "-- BOTH TABLES ARE UNREACHABLE BY CLIENT ROLES (R12). `revoke all` is what makes 'no privilege' true, and it names service_role as well (R4)... No policy and no viewer_ helper, by decision; the tests read these tables as the operator." — meat.
- "-- R3's three halves: no role holds UPDATE, DELETE or TRUNCATE (above); no definer below updates or deletes a row; and this trigger raises for the owner's own statements. The owner can drop the trigger — no object protects against its owner — and that residual is stated here rather than papered over with a second trigger the same authority could also drop." — meat.
- "-- TRUNCATE takes a statement trigger; a row trigger never sees it." — this is a genuine Postgres trigger-mechanics fact (external platform behavior), but it is stated as a bare aside with no reshape target; still, because it documents *our* trigger design choice reacting to that fact rather than a surprise forced on a call site, treat as meat — the trigger definition itself (statement-level) already encodes the choice.
- "-- Called FIRST by every write definer the service role can reach." — meat (restates call order, visible at each call site).
- "  -- `for share` (R7): a gated write in flight blocks a concurrent deactivation, and a write that arrives during one blocks until it commits and then reads the committed state. That is the whole concurrency contract; nothing else here is serialised." — our own concurrency design narrated in prose. **MUST KILL: `public.assert_account_active`** — give the `for share` lock its own named wrapper (or a comment-free dedicated function) so the concurrency contract is structural rather than explained.
- "  -- ABSENCE IS NOT A LIFECYCLE REFUSAL. The calling function answers for a missing account with its own sentence; this one answers for exactly one thing." — meat.
- "-- NO GRANT. It is reached only from inside other definers, which run as the owner." — meat (restates the absence of a GRANT statement, visible in the file).
- "-- ONE READ FOR EVERY WRITE ROUTE: the caller's type and lifecycle, its role in the target organisation, whether that organisation exists, who holds its single seat and which seats that holder has elsewhere, and the subject's type and lifecycle... `parseWriteStanding`... judges the answer and fails closed on any other shape." — meat.
- "-- Reached only from inside other definers: no grant. `actor_label` is 'platform_admin:<id>' for a product path and 'operator' when no actor is known (R9)." — meat.
- "-- IDEMPOTENT: it updates only when the state differs, returns whether it changed, and writes an audit row only on a change. Running it twice leaves one row, not two. `for update` takes the lock that `assert_account_active`'s share lock waits behind (R7)." — meat.
- "-- THE CONTACT TRANSFER, AND LOST-ACCESS RECOVERY IS THE SAME OPERATION (AT-001.27)... One call is one transaction, so a transfer cannot half-happen." — meat.
- "-- EVERY CHECK BELOW IS A BACKSTOP for a caller that bypassed `decideContactTransfer`... Each raise here still carries its kind as DETAIL, so the edge can put it on the wire (R10)." — meat.
- "  -- `for update` on the seat row: two transfers of one seat serialise here, and the second one reads the seat the first one moved and refuses." — meat (own concurrency design narrated).
- "  -- R6: lifecycle is account-level, and deactivating an account that holds another seat would gate its writes in an organisation this transfer never looked at." — meat.
- "  -- The actor, for any trigger that writes an audit row inside this transaction (R9)." — meat.
- "  -- THE SEAT MOVES AND NOTHING ELSE ON THE ROW CHANGES... That is AT-001.25's 'history preserved and still attributed to the original acting humans'. Nothing is deleted." — meat.
- "-- THE ESCALATION CONTACT (AT-001.28). The same backstop posture as the transfer..." — meat.
- "  -- ONE ROW PER ORGANISATION: a second capture replaces the first, and the primary key is what makes that true rather than a rule somebody applies." — meat.
- "-- Both gain the gate as their FIRST statement and are otherwise the bodies their own migrations state. `create or replace` keeps privileges, and the revoke and the grant are restated anyway: this tree has paid for a recreate that dropped a grant once." — meat (incident-story justification).
- "  -- THE BACKSTOP. It fires only on a call that did not come through the edge function, because the edge function refuses a non-NGO caller before ever reaching here." — meat.
- "  -- THE ROLE IS READ IN THE TARGET ORGANISATION AND NOWHERE ELSE. There is no query here that could find the caller's role in a different organisation, which is what makes 'acting in NGO A never grants anything in NGO B' structural on this path rather than a rule somebody applied." — meat.

KEEP
- "  -- THE TRIM CARRIES AN EXPLICIT WHITESPACE SET: `btrim(text)` with one argument strips SPACES ONLY, so a name of one TAB would pass the emptiness check and be stored as a visually blank name." — explains genuinely non-obvious behavior of Postgres's own built-in `btrim`, a platform function we cannot reshape.
- "-- PostgREST caches the schema. Without this, the first call to a freshly created function is a 404 from the schema cache rather than a real answer — and `write_standing` sits on the path of EVERY write, so a stale cache would 404 every route at once." — explains a genuinely non-obvious external-vendor behavior (PostgREST's schema cache) that forces the accompanying statement; external-dependency exception.

Deletions in this file: 24 (10 banners + 14 narration). Keeps: 2.

---

## supabase/migrations/20260909120000_account_lifecycle_setter.sql

DELETE
- "-- REQ-001, D6 leaf 2: the platform-administrator lifecycle setter (AT-001.29, .30, .31)." — AT-id narration.
- "-- The CALLER is gated first, so a deactivated administrator cannot re-enable itself." — meat (restates the SQL that follows).

Deletions: 2. Keeps: 0.

---

## supabase/migrations/20260910120000_org_membership_role_change_audit.sql

DELETE
- "-- REQ-001, D6 leaf 3: role changes reach the audit table from a trigger on org_memberships (AT-001.33). The transfer definer already writes its own transfer row; this object writes the org_role_changed row for every membership insert and for every update that changes the account or the role." — AT-id narration.
- "-- THE ACTOR IS A TRANSACTION-LOCAL SETTING (R9). The transfer definer sets `app.actor_account_id` before it moves the seat. `create_organization` and `complete_signup` do not, and this migration does not add it there: a product membership insert therefore records a null actor and the label `operator`, which AT-001.33's body already accepts on an operator path. An UPDATE that changes neither account nor role writes nothing." — R/AT-id narration, meat.

Deletions: 2. Keeps: 0.

---

## supabase/migrations/20260911120000_volunteer_github_identity_is_permanent.sql

KEEP
- "-- A BEFORE DELETE trigger on auth.identities keeps the identity row and Auth stays healthy for the user (unlink-trigger-probe.txt). The WHEN clause sees depth 0 for a direct delete, while a cascade and the function body see depth 1 or more (unlink-depth-probe.txt)." — documents genuinely non-obvious behavior of Postgres trigger recursion depth (`pg_trigger_depth()`) on a Supabase-Auth-owned table (`auth.identities`) we do not control the schema of; external-platform exception applies.

Deletions: 0. Keeps: 1.

---

## tests/at/harness/live-stack.ts

DELETE
- "/** Auth DELETE as a caller. AT-001.41 unlinks through `/auth/v1/user/identities/{id}`. */" — AT-id citation on a test helper; the function name and its one line of code already say this.

Deletions: 1. Keeps: 0.

---

## tests/at/harness/shipped-admin-operations.selftest.ts

DELETE
- "THE ORACLE FOR THE PLATFORM ADMINISTRATOR'S TWO DECISIONS. The acceptance ids reach the admitted path of `decideContactTransfer` and `decideEscalationContact`... WHAT A GREEN HERE CLAIMS... WHAT IT DOES NOT CLAIM..." — test-scope narration, meat.

Deletions: 1. Keeps: 0.

---

## tests/at/harness/shipped-lifecycle.selftest.ts

DELETE
- "THE ORACLE FOR THE LIFECYCLE SETTER AND THE VIRTUAL-KEY SEAM... WHAT A GREEN HERE CLAIMS... WHAT IT DOES NOT CLAIM..." — same pattern, meat.

Deletions: 1. Keeps: 0.

---

## tests/at/harness/shipped-write-gate.selftest.ts

DELETE
- "THE ORACLE FOR THE WRITE GATE'S ORDER AND FOR THE STANDING PARSER'S FAIL-CLOSED PROMISE... WHAT A GREEN HERE CLAIMS... WHAT IT DOES NOT CLAIM..." — meat.
- "/** The standing `public.write_standing` renders for an active account of one type, with no organisation named. */" — test-fixture narration, meat.
- "/** The canonical `write_standing` answer for an active NGO admin of one organisation. */" — meat.
- "// THE ORDER IS THE CLAIM: a deactivated volunteer on an admin route is told it is deactivated, not that it is not an administrator, and a deactivated account on the signup route is refused by the gate rather than by a primary-key collision." — meat.
- "// And an existing ACTIVE account of any type is admitted too: the second completion is the database's refusal, never the gate's." — meat.

Deletions: 5. Keeps: 0.

---

## tests/at/harness/write-route-scan.selftest.ts

DELETE
- "Oracle for the write-route conformance scan: each refusal the scan names, and that the real tree yields none. The load-bearing case is a fourth write route that reaches `/rest/v1/rpc/` without registering." — meat.

Deletions: 1. Keeps: 0.

---

## tests/at/suites/req-001/_contract.ts

DELETE
- "// THE CLOSED SET OF REFUSAL KINDS a write route answers with, imported for the reason every other judgement type here is: a body asserts the kind the shipped pipeline produces, never a restatement." — meat.
- "/** the product's one deactivation authority (R8); when and why live in the audit record */" — R-id, meat.
- "One row of `public.audit_events`. The kinds mirror the `public.audit_event_kind` enum, and the database wins: no shipped TypeScript writes an audit row, so there is no shipped vocabulary to import here." — meat.
- "/** ISO-8601 instant — AT-001.26's 'when' */" — AT-id, meat.
- "/** null on an operator path; `actorLabel` then reads 'operator' (R9) */" — R-id, meat.
- "/** AT-001.26's 'who', denormalised so a later account delete cannot take it away (R3) */" — AT/R-id, meat.
- "/** AT-001.26's 'why' — never blank, by CHECK constraint */" — AT-id, meat.
- "/** One row of `public.org_escalation_contacts` — one per organisation, and no account behind it (R15). */" — R-id, meat.
- "THE KIND IS THE SHIPPED CLOSED SET, `WriteRefusalKind`, because the route now answers through the write pipeline... a live adapter facing an unexpected status reports 'something refused and I do not know what' rather than picking whichever meaningful kind happens to make a test pass." — meat.
- "A refused write, as every route registered through `writeRoute` answers it... `refused` keeps the meaning above: the adapter could not classify what it received." — meat.
- "/** The contact transfer's request — AT-001.25's act, and AT-001.27's with a recovery reason. */" — AT-id, meat.
- "/** the outgoing contact, named so a retry cannot move a seat from a state the caller never saw */" — meat (rationale for the field, restates earlier prose).
- "/** the new contact: a completed NGO account (R5) */" — R-id, meat.
- "/** AT-001.26's 'why', written to the audit row verbatim */" — AT-id, meat.
- "/** Refused with `holds-other-seats`, the body names the other organisations (R6). */" — R-id, meat.
- "/** AT-001.29/.30/.31: the fields each inventory route's smallest legal write reads. */" — AT-id, meat.
- "/** AT-001.33: the operator tries to alter `public.audit_events`. The refusal is the criterion. */" — AT-id, meat.
- "/** Attempt to unlink one identity — AT-001.41. The oracle is the row and the user's health, never GoTrue's status: a refused delete answers 500 (R10). */" — AT/R-id, meat.

KEEP
- "/** ISO-8601 instant */" — plain field-shape doc, no rationale or id.
- "/** The account's linked identities, read as the operator. */" — states a field's meaning, no id.
- "/** Whether `/auth/v1/user` still answers 200 for this session. */" — states a field's meaning, no id.

Deletions in this file: 18. Keeps: 3.

---

## tests/at/suites/req-001/_fixture.ts

DELETE
- "/* ------------------------------ the platform administrator's operations -------------------- */" — banner.
- "`supabase/functions/transfer-organization-contact` — the audited contact transfer, and lost-access recovery is the SAME operation with a recovery reason (AT-001.27). / A null session is the unauthenticated arm of AT-001.35..." — AT-id, meat.
- "`supabase/functions/set-escalation-contact` — one non-login escalation contact per organisation, recorded by a platform administrator (AT-001.28, R15)." — AT/R-id, meat.
- "`supabase/functions/set-account-lifecycle` — deactivate or re-enable an account (AT-001.30, .31). A null session is the unauthenticated arm, the same posture the transfer carries." — AT-id, meat.
- "AT-001.29/.30/.31: the smallest legal write on one inventory route, as this session. Both adapters implement the body as a `Record<WriteRouteName, …>`, so an inventory row the adapter cannot attempt is a type error." — AT-id, meat.
- "The audit record, read as the operator: no client role and no viewer helper reaches the table (R12). Rows come back ordered by their instant." — R-id, meat.
- "AT-001.33: the operator attempts to alter the record. The refusal is the criterion." — AT-id, meat.
- "// NGO-side action is permitted in the target organisation. `update-organization` registers the same decision, so a loop-tier green over AT-001.16 and AT-001.36 grades the code that ships. This file..." — AT-id, meat.
- "// THE SHIPPED WRITE PIPELINE — the inventory, the lifecycle gate and the gate-then-decide order that every write route below runs through, exactly as `writeRoute` runs it at the deployed edge... What this file supplies is storage." — meat.
- "THE WRITE PIPELINE AT THE LOOP TIER — the shipped `writePipeline` over this file's Maps, one shell beside the deployed `writeRoute`... every other refusal is the pipeline's own kind and status." — meat.
- "/** The mirror of `public.append_audit_event`: the label is 'platform_admin:<id>' or 'operator' (R9). */" — R-id, meat.
- "THE MIRROR of `public.org_membership_role_change_audit`. Product membership inserts pass a null actor because `create_organization` and `complete_signup` do not set `app.actor_account_id`... An update that changes neither account nor role writes nothing. The live adapter is the oracle." — meat.
- "// THE REFUSAL IS THE SHIPPED INVENTORY'S, not this file's: the gate refuses every type but `ngo` with `ngoOnlyActionAllowed`'s own sentence. That is what makes AT-001.06 a test of an application boundary rather than of a helper called directly from a test body." — AT-id, meat.
- "// NOTHING BEFORE THE WRITE BELOW HAS MUTATED STATE, which is what makes the bodies' read-backs after a refusal measure a real property rather than this file's good intentions." — meat.
- "// THE MIRROR OF `public.transfer_organization_contact`, row by row: the seat row is re-keyed to the new contact with its role untouched, the outgoing account is deactivated, and the definer's two audit rows are appended... Nothing is deleted, which is the whole of 'history preserved'." — meat.
- "THE MIRROR of `public.audit_events_are_append_only` and the statement-level TRUNCATE trigger. The operator's UPDATE, DELETE and TRUNCATE raise, and the rows stay. The live adapter is the oracle." — meat.

KEEP
- "/** the mirror of `public.audit_events`, in insertion order — append-only, like the table */" — states the map's shape/ordering contract, no id.
- "/** organisation id -> its one escalation contact, mirroring `public.org_escalation_contacts`'s primary key */" — states the map's shape.
- "/** The mirror of `public.change_account_lifecycle`: idempotent, and an audit row only on a change. */" — states the mirrored function's behavioral contract, no id.
- "THE MIRROR of `public.github_identity_is_permanent_for_volunteers`. A volunteer GitHub identity stays on the map; any other unlink removes it. The live adapter is the oracle." — states the mirrored function's contract, no id.
- "/** The organisation's escalation contact, or `null` — read as the operator, for the reason above. */" — states a field's contract.

Deletions in this file: 16. Keeps: 5.

---

## tests/at/suites/req-001/_integration.ts

DELETE (AT/R-id or design-rationale narration — one line each unless noted)
- "AT-001.41 — a volunteer may not unlink the GitHub identity after signup. The oracle is the identity row and `/auth/v1/user` still answering 200, never GoTrue's 500 (R10)."
- "/* ---------------------------------------------- the contact transfer and the escalation contact */" (banner)
- "/** The reason AT-001.25's transfer is written with; AT-001.26 reads it back verbatim. */"
- "/** AT-001.27's reason — the ONLY thing that differs between a handover and a recovery. */"
- "THE TRANSFER'S GIVEN, as the design's per-id table states it, at either tier... (R5)... so the Given has one home and two callers."
- "/** The history a transfer must leave byte-identical, read BEFORE the act so the comparison is honest. */"
- "/** What AT-001.25 and AT-001.27 both read after a transfer: the seat, the history, the two lifecycles. */"
- "/** What AT-001.35 reads after each refused attempt: the seat, both lifecycles and the audit record, unchanged. */"
- "AT-001.26's who, when and why, on the one transfer row the organisation carries... `toleranceMs` is for the integration tier, where the instant is the database container's clock and not this process's."
- "AT-001.25 — the contact transfer, against the DEPLOYED route and the real rows. / WHAT IS LIVE HERE: ..."
- "// A RETRY IS REFUSED AND WRITES NOTHING: the outgoing account no longer holds the seat, so the request describes a state the seat is not in."
- "/** AT-001.26 — who, when and why, read back from the real `public.audit_events`. */"
- "AT-001.27 — lost-access recovery IS the transfer of AT-001.25 with a recovery reason. The contact who cannot sign in is real here..."
- "AT-001.28 — one non-login escalation contact, recorded by the DEPLOYED admin route into the real `public.org_escalation_contacts`. R15 narrows the Given..."
- "// NON-LOGIN: the contact is a person to call, not an account. No auth user carries the address, so a sign-in with it is refused by Auth itself."
- "// ONE CONTACT PER ORGANISATION: a second capture replaces the first rather than adding a second."
- "// AND THE ORGANISATION CANNOT RECORD ITS OWN: the capture is the administrator's operation (R15)."
- "AT-001.35 — only a platform administrator runs the transfer. The NGO arm is the organisation's OWN contact..."
- "// THE CONTROL: the same request from the administrator succeeds, so the three refusals above are about who called and not about the request."
- "/* -------------------------------------------------------------- the lifecycle gate, AT-001.29–.31 */" (banner)
- "AT-001.29 — every account-required write is refused for a deactivated caller of an admitted type, while the active control succeeds..."
- "AT-001.30 — an AUP deactivation refuses the next write at once. The volunteer's live token still answers 200 at Auth (the measured fact). Virtual-key revocation is the declared seam."
- "AT-001.31 — re-enable restores otherwise-authorized writes. Independent gates still refuse. A deactivated administrator cannot re-enable itself. Virtual-key reissue is the declared seam."
- "AT-001.33 — the transfer of AT-001.25 plus an operator seat re-point, then three tampers. / The transfer definer writes `org_contact_transferred`..."
- "/** AT-001.33 — the same assertions against the deployed trigger and the real append-only guards. */"
- "AT-001.34 — declared red at both tiers (R11). The body opens a world so the id is exercised, then names the capability. The limit is verified on the hosted Auth service, not on this stack; see loop/items/AI4DEV-56/unit6-record.md."

KEEP
- "/** The database container keeps its own clock; a minute covers the drift seen on a laptop that slept. */" — explains a real environment/infrastructure fact (the DB container runs its own clock, independent of the test process), which is a genuinely external, non-reshapable timing quirk.

Deletions in this file: 25. Keeps: 1.

---

## tests/at/suites/req-001/_live.ts

DELETE
- "// THE SHIPPED FAIL-CLOSED PARSER for the kind a write route puts on the wire: an unrecognised value becomes `refused` rather than being trusted, so a gateway error page or a future field rename cannot arrive wearing a label an acceptance body asserts." — meat.
- "ONE DEPLOYED WRITE ROUTE, called as a browser client would. A null session sends the anon key as the bearer... A 401 carries no kind on the wire and is classified as `unauthenticated` here; every other refusal's kind is read through the shipped fail-closed parser." — meat.
- "// THE STATUS IS NOT THE ORACLE (R10): a refused volunteer unlink answers 500." — R-id, meat.
- "THE DEPLOYED `update-organization`, called exactly as a browser client would. The `kind` is read off the wire through the shipped closed set... AT-001.16 asserts the not-a-member kind and AT-001.36 the not-an-admin one." — AT-id, meat.
- "/* ----------------------------- the DEPLOYED admin routes, over the stack's kong ------------- */" — banner.
- "/* --------------------- the audit record and the escalation contact, as the operator (R12) --- */" — banner + R-id.

Deletions: 6. Keeps: 0.

---

## tests/at/suites/req-001/_pending.ts

DELETE
- "THE IDS REQ-001 HAS NOT LANDED YET, and the leaf that will land each one. There is 1 of them once the append-only-audit leaf is in this tree. There were 3 before that, 6 before that, 11 before that, 14 before that, 16 before that, 24 before the three earlier leaves, 28 before that, 30 before that and 33 before that, and the count moves down as leaves land." — status narration with no code contract.
- "sites; there is no partial suite. Thirty-six are written — AT-001.01 through .07 across the first ... acknowledgment-identity one, AT-001.21 and .22 with the cross-organisation-denial one, AT-001.23, .40 and .24 with the assigned-volunteer-scope one, AT-001.25, .26, .27, .28 and .35 with the contact-transfer one, AT-001.29, .30 and .31 with the lifecycle-gate one, and AT-001.33 and .34 with the append-only-audit one. The other 1 is declared, not faked: it throws, loudly, stamped with its own id and with the manifest leaf that will make it real." — status narration.
- "// ELEVEN LABELS ARE GONE FROM THIS MAP rather than kept for symmetry, and the rule is the same for all eleven: a leaf label sitting here with nothing pointing at it is a claim that something is still pending when it is not." — meat.
- "//   D6.L1 — contact transfer, lost-access recovery and the escalation contact — landed AT-001.25, .26, .27, .28 and .35, its only five ids. / D6.L2 — ... / D6.L3 — ..." — a changelog embedded as a comment; meat.

Deletions: 4. Keeps: 0.

---

## tests/at/suites/req-001/_policy-scan.ts

DELETE
- "A SECURITY DEFINER granted EXECUTE to `service_role` that is not `stable` or `immutable` must call `public.assert_account_active(`. One exemption, with its reason in the row (R1)." — R-id, meat (this is the scan's own rule statement, which should be legible from the scan's data/predicate, not prose).
- "The SQL half of the write-route conformance check. Reuses `splitSqlStatements`. A later `create or replace` overlays an earlier body, the way the catalog scan overlays grants." — meat.

Deletions: 2. Keeps: 0.

---

## tests/at/suites/req-001/_write-route-scan.ts

DELETE
- "AT-001.41's static arm. There is no TypeScript on Auth's delete path, so the loop tier grades the migration text: a BEFORE DELETE trigger on `auth.identities`, guarded by `WHEN (pg_trigger_depth() = 0)`." — AT-id, meat.
- "THE CONFORMANCE CHECK FOR THE WRITE BOUNDARY (AT-001.29). / It proves registration and construction... Precedent: `_source-scan.ts`. No sentinel, fault, vendor stand-in or fixture world. ..." — AT-id + process narration, meat.
- "// A directory with no index.ts is a missing entry when WRITE_ROUTES names it." — meat (restates the check immediately below).
- "Reads every function index.ts, supabase/config.toml, _shared/edge.ts, the migrations and the fixture. Throws on an empty functions directory — an absence reported by a broken instrument is the false green this whole arrangement exists to remove." — meat.

Deletions: 4. Keeps: 0.

---

## tests/at/suites/req-001/a-signup-and-signin.test.ts

DELETE
- "ALL EIGHT of this file's ids are now written. Four came with the first accounts leaf — AT-001.01, .03, .06 and .07 — three GitHub ones, AT-001.02, .04 and .05, with the GitHub leaf, and AT-001.41 with the permanence of the volunteer GitHub link after signup. Nothing in this file is a..." — status/changelog narration, meat.

Deletions: 1. Keeps: 0.

---

## tests/at/suites/req-001/e-admin-operations.test.ts

DELETE
- "AT-REQ-001 section F — the audited contact transfer, lost-access recovery, the escalation contact, and who may run the transfer." — AT-id, meat.
- "ALL FIVE IDS ARE WRITTEN, at both tiers. The loop bodies below drive the shipped write pipeline — the inventory, the lifecycle gate, `decideContactTransfer` and `decideEscalationContact` — over the fixture's storage; the integration bodies in `_integration.ts` drive the deployed routes and read the real audit and escalation tables as the operator. The Given, the read-backs and the audit assertions have one home there and two callers, so the two tiers cannot drift apart." — status/architecture narration, meat.
- "The instant the loop clock is frozen at BEFORE the Given is built, so the sessions it mints are live and the audit row the fixture writes from the harness clock can be pinned to one instant. The loop `Clock` reports no time of its own, on purpose; commanding it is the honest way to know what 'inside the test window' means at this tier." — meat.
- "// R15 NARROWS THE GIVEN: concierge onboarding is the administrator acting on an organisation, and the vetting act itself stays the NGO profile requirement's. What this body proves is the capture, by a platform-admin operation on the same surface as the transfer, of a contact no login can attach to." — R-id, meat (duplicate of `_integration.ts`'s equivalent doc, worded differently).

Deletions: 4. Keeps: 0.

---

## tests/at/suites/req-001/f-lifecycle-and-audit.test.ts

DELETE
- "AT-001.29, .30, .31 and .33 ARE WRITTEN. AT-001.34 is declared red at both tiers with the named vendor capability: the body opens a world and then refuses. AT-001.32 stays at this call site because an id is registered once." — status narration, AT-ids, meat.

Deletions: 1. Keeps: 0.

---

## Skips (out of scope)

- `.taskmaster/docs/acceptance/at-req-001.md`, `.taskmaster/docs/prd-mvp.md`, `.taskmaster/docs/requirements/req-001.md`, `loop/decomp/req-001.md`, `loop/out/pure-s3-req-001-006.md`, `loop/state/decisions.jsonl`, `tests/at/expected/req-001.json` — markdown/data files; their added lines are specification prose or data, not code comments, so they are not judged against the comment-sicko leash.
- `tests/at/harness/live-stack.selftest.ts` line matching `//` — false positive: the match is `http://127.0.0.1:44321/...` inside a string literal in an `expect(...)` assertion, not a comment.
- `tests/at/suites/req-001/_write-route-scan.ts` and `_policy-scan.ts` regex literals (e.g. `/^create(?:\s+or\s+replace)?.../i`, `/\bcallDatabaseFunction\b/`) — false positives from `//`/`/.../ ` regex syntax in code, not comments.
- `supabase/functions/_shared/edge.ts` two pre-existing `//` lines inside `callDatabaseFunction` ("sentence the database function chose..." and "A non-JSON body from PostgREST...") — unchanged context lines in the diff, not added or changed by this branch; out of scope.
- `tests/at/suites/req-001/b-verification-and-sessions.test.ts` — diff touches this file (+2 lines) but neither added line is a comment; no findings.
- `tests/at/harness/policy-scan.selftest.ts`, `tests/at/harness/live-stack.selftest.ts` (beyond the one false positive above) — changed but no added/changed comment lines found.

---

## Totals

Files with at least one comment finding: 26.

Deletions (comments to kill): 152
Keeps (comments that crawl away): 27
MUST KILL flags: 4

### MUST KILL flags

1. `supabase/functions/_shared/accounts.ts` — `SignupCompletionArgs` / `decideSignupCompletion`: the GitHub-key omission (conditional spread of the four `p_github_*` fields) is explained in prose ("omitted entirely when there is no handle... a DEPLOYMENT property... while a migration is rolling"). Extract it to a named helper (e.g. `githubArgsOrEmpty(handle, stats)`) so the omission is a name, not a paragraph.
2. `supabase/functions/_shared/accounts.ts` — `decideSignupCompletion`: the inline comment "THE CALLER FACT COMES FROM AUTH, never from the body" flags a real our-code surprise (a body-asserted handle gates nothing). Rename the value read from `input.caller.githubHandle` (e.g. to `verifiedGithubHandle`) at its point of use so the provenance is obvious without a comment.
3. `supabase/functions/_shared/write-routes.ts` — `writeGateDecision`: the fixed check order (unreadable, deactivated, absent-by-design, no account, type) is asserted in prose ("THE ORDER IS LOAD-BEARING") and re-asserted by an AT id rather than being visible in the function's structure. Restructure as a named, ordered sequence (e.g. an array of named guard functions run in order) so the order is enforced and legible in code.
4. `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql` — `public.assert_account_active`: the `for share` locking contract ("a gated write in flight blocks a concurrent deactivation...") is a real concurrency invariant narrated in a comment. Give the lock a dedicated, named wrapper (or a differently-named guard step) so the concurrency contract is structural rather than explained in prose.
