## Findings

### 1. [warning] The conformance scan can go green over exactly the defect it exists to catch: an ungated definer whose grant survives a `create or replace`

**Location**: `tests/at/suites/req-001/_policy-scan.ts:599-605` (and the check at `:640-647`); cf. `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql:454-456`.

**Finding**: `scanWriteGateSql` rebuilds a `WriteGateFn` with `executeRoles: new Set()` on every `create` **or `create or replace`**. PostgreSQL's `create or replace function` does **not** touch the ACL — the comment in the very migration at line 455 says so ("`create or replace` keeps privileges"). So a later migration that does `create or replace function public.update_organization(...)` without calling `assert_account_active` and without restating its grants leaves the live function service-role-executable but ungated, while the scan sees `executeRoles` empty and reports nothing.

**Evidence**: A future migration containing only:
```sql
create or replace function public.update_organization(p_account_id uuid, p_organization_id uuid, p_name text) ... as $$ begin ... end; $$;
```
PostgreSQL keeps `EXECUTE ... to service_role` from `20260811125000_org_membership_ngo_only_and_organization_rename.sql:207`. The scan resets the role set at `_policy-scan.ts:604`, sees no grant in the new statement, fails `fn.executeRoles.has('service_role')`, and reports no `definer-no-write-gate`. The scan's own comment claims it "overlays an earlier body, the way the catalog scan overlays grants" — but the catalog scan preserves grants while this one drops them, which is the unsafe direction for a gate check. This is the one path by which the intent's central claim ("no service-role writer skips the gate") can silently regress with CI green.

**Suggestion**: On `create or replace` of an existing name, carry the existing `executeRoles` set forward (only reset for a brand-new name); or track grants in a separate map that is never reset by a function definition, exactly as `scanTenantMigrations` does.

---

### 2. [warning] The R6 "holds another seat" check is a TOCTOU race against a concurrent `create_organization` by the outgoing account

**Location**: `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql:315-337` (seat lock and R6 read) and `:363-368` (seat update, deactivation).

**Finding**: `transfer_organization_contact` verifies R6 (the outgoing account holds no other seat) **before** it takes any lock on the outgoing account's row. The lock on that account is only acquired later, inside `change_account_lifecycle` (`:233-236`, `for update`). A concurrent `create_organization` for the outgoing account already holds a `for share` lock on that account row (from its own `assert_account_active` at `:470`) and has an uncommitted membership insert.

**Evidence**: Interleaving:
1. `create_organization(A)` begins, `assert_account_active(A)` takes `for share` on A's row, inserts org+membership, uncommitted.
2. Transfer begins, seat check passes, R6 query at `:329-332` runs under READ COMMITTED — the uncommitted insert is invisible, so `v_other_seats` is empty.
3. Transfer's `change_account_lifecycle(A, 'deactivated')` blocks on A's row behind the share lock.
4. `create_organization(A)` commits.
5. Transfer proceeds and deactivates A — which now holds a seat in an organisation the transfer "never looked at", precisely the state R6 (line 327-328) was written to prevent. The new org's contact is silently gated with no `holds-other-seats` refusal and no naming of the other org.

**Suggestion**: Take the outgoing account's row lock (e.g. `select lifecycle ... for update`) immediately after the seat check and before the R6 read. Then a concurrent `create_organization` either commits before the read (R6 sees the new seat and refuses) or blocks behind the lock and re-reads `deactivated` in its own `assert_account_active`.

---

### 3. [warning] The audit record states a false actor: real NGO actions are recorded as `operator`

**Location**: `supabase/migrations/20260910120000_org_membership_role_change_audit.sql:23-25` and the insert/update branches; `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql:200-211` (`append_audit_event`).

**Finding**: The trigger records `actor_account_id = null`, `actor_label = 'operator'` whenever `app.actor_account_id` is unset. `create_organization` (this migration, `:497-498`), `complete_signup` (`20260808120000...:210-211`) and any future product writer that inserts a membership do not set the setting, so the account holder's own action is written into the audit table as an operator action.

**Evidence**: The intent says "role changes and transfers append rows to an audit table"; the transfer path is honest because the definer sets `app.actor_account_id` (`:357`). But an NGO completing signup or creating a second organisation produces `org_role_changed` rows labelled `operator`. Unit 3's own report names this as open doubt 1 ("A later reader ... cannot tell a product membership grant from an operator grant, because both record the operator"). R9 sanctioned a null actor *on an operator path*; it did not ask that genuine product paths be mislabelled as operator paths. The AT-001.33 body is satisfied by exactly this ambiguity, so nothing catches it.

**Suggestion**: `perform set_config('app.actor_account_id', p_account_id::text, true)` in `create_organization` (and `complete_signup`, where the id is the caller) before the membership insert. That is a two-line change to the two restated/untouched definers and makes the label true.

---

### 4. [warning] `create_organization` still applies the spaces-only `btrim` name rule while its sibling and the shared TypeScript rule apply the full whitespace set

**Location**: `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql:472` and `:494` (create) vs `:524` and `:528` (update); `supabase/functions/_shared/accounts.ts:336-341`.

**Finding**: The restated `create_organization` keeps `length(btrim(p_name)) = 0` and stores `btrim(p_name)` (spaces only), while `update_organization`, restated in the same file, uses `btrim(p_name, E' \t\r\n\f')`. `validateOrganizationName` uses JS `trim()`, which strips tabs/newlines too. A service-role caller — the exact caller class the SQL backstop exists for — can create an organisation named `"\t"`, which the edge route and `update_organization` both refuse.

**Evidence**: The migration at `:522-527` carries a comment explaining that this exact defect was found and fixed for `update_organization`; `create_organization` at `:472` was re-emitted from the old file without the fix. The tree's stated standard is one rule stated twice with the database as backstop; here the backstop is *weaker than the rule* on one of two sibling functions, and this diff is the moment the file was reopened.

**Suggestion**: Match `update_organization`: check and store with `btrim(p_name, E' \t\r\n\f')`.

---

### 5. [warning] The fixture's `attemptWrite` re-implements five adapter write methods in the same file, doubling every mirror

**Location**: `tests/at/suites/req-001/_fixture.ts:1608-1695` vs `:1257` (`createOrganization`), `:1300` (`updateOrganization`), `:1566` (`transferOrganizationContact`), `:1586` (`setEscalationContact`), `:1601` (`setAccountLifecycle`).

**Finding**: Each `attemptWrite` entry runs `runWrite(...)` and then repeats the same state mutations as the corresponding adapter member: the transfer entry repeats the seat move, `recordRoleChange`, `changeLifecycle` and `appendAudit` (`:1641-1659`) that `transferOrganizationContact` already performs (`:1566-1585`); likewise for create/update/escalation/lifecycle. That is roughly 120 lines of duplicated write logic inside one file whose header promises there is no second copy of product rules.

**Evidence**: The live adapter solves the same problem with one line per route (`_live.ts:926-948`: `asAttempt(name, body)`). The fixture can do the same by calling its own members and normalising their outcomes (`{ ok: true, organizationId }` is assignable to `WriteAttemptOutcome`'s `{ ok: true }`; only `createOrganization`'s kind-less refusal needs a small adapter to `refused`). As written, a future change to the transfer member must be mirrored in `attemptWrite` or the `.29` acceptance body grades a different path than AT-001.25.

**Suggestion**: Implement each `attemptWrite` entry as a call to the corresponding member (with a thin outcome normaliser), deleting the duplicated mirror bodies.

---

### 6. [warning] AT-001.30/.31 have copy-paste loop and integration bodies in two files, against the section's own shared-Given pattern

**Location**: `tests/at/suites/req-001/f-lifecycle-and-audit.test.ts:66-210` vs `tests/at/suites/req-001/_integration.ts:2310-2470`.

**Finding**: The four admin-operations ids (.25-.28) and .29/.33 route their Given and assertions through helpers in `_integration.ts` so "the two tiers cannot drift apart" (e-lifecycle header). AT-001.30 and .31 instead duplicate ~35 lines each: provisioning, verification, GitHub link, completion, deactivation, the `attemptWrite` calls, the `not-an-admin`/`not-an-ngo-account` assertions and `virtualKeyActionFor` checks are written twice, with only the live-token/Discovery assertions differing.

**Evidence**: Compare `f-lifecycle-and-audit.test.ts:66-114` with `_integration.ts:2310-2360`, and `:116-210` with `:2365-2470`. The two `.30` bodies differ only in the live-token `fetch` and the trailing `CapabilityPending`; the two `.31` bodies differ only in the Discovery arm. The established file pattern (`transferGiven`/`transferSnapshot`/`expectTransferred`, `assertDeactivationGatesEveryWrite`, `assertAppendOnlyAudit`) shows the intended shape.

**Suggestion**: Extract `assertLifecycleReenable(...)` / `assertAupDeactivation(...)` helpers parameterised on the tier-specific arms, as done for the transfer.

---

### 7. [warning] The transfer does not require the outgoing account to be active, so its documented "three audit rows" can silently become two

**Location**: `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql:368` calling `change_account_lifecycle`, and the early return at `:243-245`.

**Finding**: `change_account_lifecycle` writes `account_lifecycle_changed` only when the state actually changes. `set_account_lifecycle` (this branch, `20260909120000`) lets an administrator deactivate any account that still holds a seat. If the outgoing account was deactivated before the transfer, the transfer still moves the seat and writes `org_contact_transferred` + `org_role_changed` but no transfer-linked deactivation row — the design's row-by-row table (design §6) states three rows for every transfer.

**Evidence**: The TS decision (`admin-operations.ts`) and the definer both check the *transferee's* lifecycle (`transferee-deactivated`) but never the *outgoing* account's. `expectTransferAudited` in `_integration.ts` asserts exactly one `account_lifecycle_changed` for the outgoing account carrying the transfer's reason, so the test would fail in that state; the tests never build that Given, so the precondition is silent. The earlier deactivation row (different actor/reason) is the only deactivation record, and the transfer's own reason never reaches the lifecycle history.

**Suggestion**: Either refuse a transfer whose outgoing account is already deactivated (a new `from-deactivated` kind alongside `transferee-deactivated`), or state in the design/acceptance that the lifecycle row is written by whichever operation caused the change and relax the .26 assertion.

---

### 8. [nit] UUID comparison in the transfer is case-sensitive string equality

**Location**: `supabase/functions/_shared/admin-operations.ts:81`.

**Finding**: `standing.orgSeatAccountId !== fromAccountId` compares the database's canonical lowercase UUID text against the client-supplied string. `UUID_SHAPE` (`edge.ts:348`) accepts uppercase via `/i`, and Postgres `uuid` comparison is case-insensitive, so a client echoing an uppercased id gets a 409 `not-the-current-contact` reading "account X does not hold the contact seat" for the account that does.

**Evidence**: `fromAccountId` comes from `stringField(input.body.fromAccountId)` and is never normalised; `write_standing` returns `m.account_id` as text. A retry built by a client that upper-cases ids (or that reads the id from a different representation) is refused for a false reason.

**Suggestion**: Normalise both sides (`fromAccountId.toLowerCase()`) or parse both as UUIDs before comparing; the same helper should be used wherever id equality is decided in TypeScript.

---

### 9. [nit] `WriteSubject` is one wide bag of fields for all seven routes

**Location**: `tests/at/suites/req-001/_contract.ts:321-331`.

**Finding**: Every route's smallest legal write is described by one type containing `name`, `organizationId`, `fromAccountId`, `toAccountId`, `accountId`, `lifecycle`, `reason`, `message`, `email`. Each route reads two or three of them; the call sites must fill nine (`f-lifecycle-and-audit.test.ts:95-104`), and a missing field for a route is undefined at runtime rather than a compile error. This is exactly the "loosely-shaped ad-hoc object" the code-quality lens calls out; `Record<WriteRouteName, ...>` guarantees the *route* is covered but not that the *fields the route needs* are present.

**Evidence**: `attemptWrite(route, session, subject)` cannot correlate the route key with its required fields; the `'set-account-lifecycle'` entry reads `write.accountId/lifecycle/reason` while `'transfer-organization-contact'` reads four other fields, and neither is enforced by the map's type.

**Suggestion**: Make the map's value a discriminated union keyed by route (`{ route: 'transfer-organization-contact'; … }`) or a generic `attemptWrite<N extends WriteRouteName>(route: N, subject: WriteSubjects[N])`, so an attempt that lacks a field the route needs fails to compile.

---

### 10. [nit] `_pending.ts`'s header is now a false stated fact

**Location**: `tests/at/suites/req-001/_pending.ts:9-18`.

**Finding**: The header still says "all 37 of them" and "Thirty-six are written", and its enumeration omits AT-001.41 entirely. The acceptance file and suite now carry 38 P0 (`at:check` prints "38 P0 ... 38 registered"), and 37 ids have bodies (only AT-001.18 is `notLanded`).

**Evidence**: The file is REQ-001's live progress ledger (`:26`: "a later leaf must update the ledger in the same change that lands its id"), and the same branch updated `loop/decomp/req-001.md` to 38 P0 and added D1.L3 without updating this count. Per this tree's own standard on false stated facts, the count should move with the change.

**Suggestion**: Update the two numbers to 38/37 and add "AT-001.41 with the GitHub-permanence one (D1.L3)" to the enumeration.

---

## Notes I considered but did not raise as findings

- The declared seams (`virtualKeyActionFor`, the `discovery-message` stand-in, `vendors.gotrue-sign-in-rate-limit`) are exactly the capability-pending clauses the intent sanctions; I did not treat them as gaps.
- The fixture's `unreachable` branches (`if (handle === null)` after `runWrite` already returned 401 in the `complete-signup` attempt) and the no-standing 502 branches in the three `decide*` functions are dead under the current pipeline but are driven by the selftests; harmless.
- `writeRoute` spreads `decision.fields` after `kind`/`reason` (`edge.ts:396`), so a future decision returning `{ ok: false }` or `{ kind }` in `fields` would overwrite the fixed keys. Only `holds-other-seats` uses `fields` today; worth a one-line guard if more fields appear.