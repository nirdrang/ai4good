I've read the full diff, the design, the rulings, the lane reports, the migrations, the shared modules, the harness scan code, the fixture, and the measurements. Here is the review.

## Findings

### 1. [warning] The SQL backstop for `create_organization` disagrees with the TypeScript rule and with its sibling function — blank organisation names are writable
**Location**: `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql:472,494` (`create_organization`) vs `:524,528` (`update_organization`); `supabase/functions/_shared/accounts.ts:336` (`validateOrganizationName`).

**Finding**: `create_organization` validates and stores with one-argument `btrim` (`length(btrim(p_name)) = 0`, `values (btrim(p_name))`), while the `update_organization` restated in the *same migration* deliberately uses the explicit whitespace set `btrim(p_name, E' \t\r\n\f')` and its own comment explains why: one-arg `btrim` strips spaces only. `organizations.name`'s column CHECK also uses one-arg `btrim`. The TypeScript rule (`raw.trim()`, JS trim) does strip tabs. So the "rule stated once in TypeScript and once in SQL" is now three disagreeing statements, and the SQL backstop — whose stated audience is a service-role caller with no TypeScript in the path — admits a name of `"\t"` and persists a visually blank organisation.

**Evidence**: The migration comment at `:518-522` states the exact defect for `update_organization` but the same file restates `create_organization` without the fix. A direct `POST /rest/v1/rpc/create_organization` with `p_name = "\t"` passes the emptiness check, passes the column CHECK (`length(btrim(name)) > 0`), and stores `"\t"`.

**Suggestion**: Give both functions (and the column CHECK) one shared whitespace predicate, e.g. `length(btrim(p_name, E' \t\r\n\f'))`, so the TS rule and the backstop agree on the same set.

---

### 2. [warning] The CI definer scan models `create or replace` as dropping EXECUTE grants, so an ungated replacement can pass
**Location**: `tests/at/suites/req-001/_policy-scan.ts:595-606` (the `fns.set(..., executeRoles: new Set())` reset) with the predicate at `:642`.

**Finding**: When the scan sees `create or replace function public.x(...)`, it overwrites the tracked row and resets `executeRoles` to empty. Postgres preserves privileges across `create or replace`. The gate check is guarded by `fn.executeRoles.has('service_role')`, so a future migration that replaces a service-role-reachable definer's body with an ungated one and does **not** restate the grant is treated as not service-role-reachable and produces no `definer-no-write-gate` — the exact regression the CI check exists to catch.

**Evidence**: `scanWriteGateSql` at `:604`; the current tree masks it only because every replacement happens to restate `revoke`/`grant` (unit-1 report deviation 14 and the migration's own comment about a dropped grant). The scan's correctness therefore depends on a convention, not on the privilege semantics it claims to model.

**Suggestion**: On `create or replace`, preserve the existing `executeRoles` set (only `drop function` should clear it); or track grant/revoke independently of the definition statement.

---

### 3. [warning] The CI scan proves the gate is *mentioned*, not that it is called first
**Location**: `tests/at/suites/req-001/_policy-scan.ts:602` (`gated: /public\.assert_account_active\s*\(/i.test(stmt)`).

**Finding**: The stated invariant is "Called FIRST by every write definer" (design; `assert_account_active`'s own comment). The check is an unanchored substring test over the whole collapsed statement, so a definer that writes first and calls the gate last, or merely names `public.assert_account_active(` inside a comment, passes. The core CI oracle is weaker than the property it is credited with.

**Evidence**: `:602` runs against the entire statement, not the body's first statement; there is no ordering assertion anywhere in the scan.

**Suggestion**: Anchor the match to the function body's first non-comment statement (or reject when the first write statement precedes the gate call). At minimum, strip comments before matching.

---

### 4. [warning] AT-001.33's operator arm is satisfied by the signup row, so the UPDATE half is not actually verified
**Location**: `tests/at/suites/req-001/_integration.ts:2490` (`assertAppendOnlyAudit`); migration `20260910120000_org_membership_role_change_audit.sql`.

**Finding**: The assertion is `orgEvents.some(row => row.eventKind === 'org_role_changed' && row.actorAccountId === null && row.actorLabel === 'operator')`. But the Given's NGO signup (`complete_signup`/`create_organization`) inserts an `org_memberships` row with no `app.actor_account_id` set, so the trigger already writes exactly such a row (`membership granted`, actor null, `operator`). The subsequent `repointMembershipAsOperator` — which the report says is the proof of the UPDATE half — is not needed for this assertion to pass, and no assertion distinguishes `seat repointed` from `membership granted`.

**Evidence**: Unit-3 report "Actor decision for product membership inserts" confirms product inserts record the operator; the assertion does not filter on `reason` or on the seat's `account_id`, so it cannot fail without the re-point.

**Suggestion**: Assert the `seat repointed` row specifically (filter `detail.old_account_id`/`new_account_id`, or count rows before and after the re-point), so the UPDATE trigger branch is genuinely exercised.

---

### 5. [warning] `actor_label = 'operator'` conflates operator actions with routine product membership grants
**Location**: `supabase/migrations/20260910120000_org_membership_role_change_audit.sql` (trigger) with `20260808120000_accounts_org_membership_and_acknowledgments.sql:210,301` (`complete_signup`, `create_organization` do not set `app.actor_account_id`).

**Finding**: The audit table's `actor_label` uses the sentinel `operator` whenever `app.actor_account_id` is unset (R9). Because `complete_signup` and `create_organization` never set it, **every** NGO signup and every org creation writes `actor_account_id = null, actor_label = 'operator'` even though a named product user performed the act. After this change `operator` no longer identifies an operator path; it also means "product write with no actor", so a reader of the audit table cannot tell the two apart. The report flags this as an open doubt, but the deliverable's "role changes ... leave a record [of who]" is materially weakened for grants.

**Evidence**: The role-change trigger's only actor source is `current_setting('app.actor_account_id', true)`; the two product definers that insert memberships do not set it (unit-3 report, deviation 1). R9 accepts a null actor, but does not require conflating it with the operator sentinel.

**Suggestion**: Set `app.actor_account_id` to the completing account in `complete_signup`/`create_organization` before the membership insert, or add a distinct sentinel (e.g. `product`) so `operator` stays truthful.

---

### 6. [warning] The fixture duplicates the entire admin-write mutation inside `attemptWrite`
**Location**: `tests/at/suites/req-001/_fixture.ts:1566-1606` (`transferOrganizationContact`, `setEscalationContact`, `setAccountLifecycle`) vs `:1641-1687` (`attemptWrite` entries for the same three routes).

**Finding**: The transfer (seat re-key, `recordRoleChange`, `changeLifecycle`, `appendAudit`), escalation upsert, and lifecycle change are each implemented twice in the same file, byte-for-byte semantically. Any change to the mirror must be made in two places; if one drifts, AT-001.29/.30/.31 and AT-001.25/.28 grade different fixture behaviour.

**Evidence**: `_fixture.ts:1566-1584` vs `1641-1659`; `1586-1599` vs `1660-1677`; `1601-1606` vs `1678-1687`.

**Suggestion**: Have `attemptWrite` map the `WriteSubject` onto the typed request and call the existing member methods (or extract one `applyTransfer`/`applyLifecycle` helper used by both).

---

### 7. [warning] The loop shell is not the edge shell: the new malformed-id refusal is ungraded and the two can diverge
**Location**: `supabase/functions/_shared/edge.ts:387-391` (UUID_SHAPE guard) vs the fixture's `runWrite` in `tests/at/suites/req-001/_fixture.ts`.

**Finding**: `writeRoute` refuses a non-UUID target/subject with `400 invalid-request` before the standing read; the fixture's `runWrite` passes the raw selectors straight to `parseWriteStanding(renderWriteStanding(...))`. So the loop tier never grades this new branch, and a fixture input the edge would 400 can be accepted at loop. The design's claim that the two shells are shells around one spine holds for the gate/decisions but not for this boundary behavior.

**Evidence**: Compare `edge.ts:385-394` with `_fixture.ts` `runWrite`; no selftest drives the edge's UUID guard (it is a Deno-only file no test imports).

**Suggestion**: Move the UUID-shape check into the pure pipeline (`writePipeline` or a small `validateIdentifiers`) so both shells share it and the selftest can drive it.

---

### 8. [warning] The "no other way to reach the database" claim rests on a literal-string regex a route can evade
**Location**: `tests/at/suites/req-001/_write-route-scan.ts` (`REACHES_DATABASE = /writeRoute|callDatabaseFunction|\/rest\/v1\/rpc\//`).

**Finding**: The stated structural claim is that a route has no way to reach the database except through `writeRoute`. What actually enforces it in CI is a substring scan over `index.ts` files. A new `supabase/functions/x/index.ts` with its own `Deno.serve` and a `fetch` to a URL assembled without any of those three literals (e.g. `` `${root}/rpc/` + name ``, or a helper that builds it) is neither registered nor flagged: the unregistered-file rule only fires on a literal match, and the `Deno.serve`/serve-count checks run only for names already in `WRITE_ROUTES`. The claim as written in the intent ("there is no other way to reach the database") overstates what the mechanism proves; the design's own caveat ("the scan is a text oracle") is the honest phrasing and should be the one used.

**Evidence**: `REACHES_DATABASE` is the only thing that decides `write-route-unregistered`; `edge.ts` still exports DB-reaching helpers (`callerReads`, `publicProjectReads`) whose names are absent from the regex; `serveCount` is only computed for registered names.

**Suggestion**: Either state the guarantee as "no registered route reaches the database outside `writeRoute`" (which is what is checked), or add a rule that flags any `index.ts` containing `Deno.serve(` that is not a registered `writeRoute` construction, regardless of the URL text.

---

### 9. [nit] `_pending.ts` counts are stale against the 38-id suite
**Location**: `tests/at/suites/req-001/_pending.ts:3-18`.

**Finding**: The header says "all 37 of them" and "Thirty-six are written" while the fold added AT-001.41 (38 P0, 37 written). The list stops at ".33 and .34", omitting .41. This is exactly the drift the file's own text warns about, and the ledger is a reviewer-facing artifact.

**Evidence**: `.taskmaster/docs/acceptance/at-req-001.md` now carries 38 P0; `expected/req-001.json` and `at:check` report 38; the header was not updated in the same fold.

**Suggestion**: Update the two counts and add AT-001.41 to the written list.

---

### 10. [nit] Field selectors are split with no principle, and `decision.fields` can clobber the refusal envelope
**Location**: `supabase/functions/_shared/write-routes.ts:256` (`organizationIdField`) and `supabase/functions/_shared/admin-operations.ts:26-33` (`subjectAccountIdField`, `accountIdField`); `edge.ts:396` (`json({ ok:false, kind, reason, ...decision.fields }, ...)`).

**Finding**: All three selectors are the same kind of value with the same contract, yet one lives in the inventory module and two in the admin module; the three route files then import from two places for one concept. Separately, the refusal body spreads `decision.fields` after `ok`/`kind`/`reason`, so a future decision that puts one of those keys in `fields` silently overwrites the envelope; only `holds-other-seats` uses `fields` today.

**Evidence**: `transfer-organization-contact/index.ts` imports `subjectAccountIdField` from `admin-operations.ts` and `organizationIdField` from `write-routes.ts`; `edge.ts:396` has no key guard.

**Suggestion**: Put the three selectors in one module (or make them local to their route files, since each is one line), and spread `fields` before the envelope keys.

---

## Summary

No critical defect found: the transfer/audit/lifecycle SQL is internally consistent, the seat index makes the standing read's scalar subqueries safe, the append-only and identity triggers are measured, and concurrency is handled by the share/exclusive lock pair as described. The real problems are in the **backstops and the oracles that are supposed to prove them**: the `create_organization` SQL rule no longer matches the TypeScript rule it is the backstop for (finding 1); the CI definer scan mis-models Postgres privileges and gate ordering (findings 2, 3); and the AT-001.33 operator assertion does not verify the branch it claims to (finding 4). Findings 5–7 are fixture/audit fidelity and maintainability issues that will bite the next wave; findings 8–10 are the stated-claim and tidiness items.