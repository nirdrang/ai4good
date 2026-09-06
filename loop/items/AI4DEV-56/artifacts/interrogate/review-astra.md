## Findings

### 1. [critical] A concurrent organization creation bypasses the transfer’s other-seats guard

**Location:** `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql:329`, `transfer_organization_contact`.

**Finding:** The transfer can deactivate an account that still owns another organization, despite explicitly promising to refuse that case.

**Evidence:** The transfer locks the selected membership row, then checks other memberships without locking the outgoing account. A concurrent `create_organization` can acquire its lifecycle share lock, insert another organization and membership, and commit after that check. The transfer subsequently calls `change_account_lifecycle` at line 368, acquires the outgoing account lock, and deactivates it without repeating the membership check. Both operations succeed, leaving the newly created organization owned by a deactivated account.

Waiting for the concurrent creation to finish does not repair the stale decision.

**Suggestion:** Lock the outgoing account before checking its memberships, using a consistent locking order across account and seat operations. Check other seats only after acquiring that lock. Add a concurrency test covering creation during transfer.

### 2. [critical] The transfer can hand the seat to an already-deactivated recipient

**Location:** `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql:339`, `transfer_organization_contact`.

**Finding:** The recipient’s active lifecycle is checked through an unlocked read and can change before the seat moves.

**Evidence:** The SQL function reads recipient B as active. Another administrator can then run `set_account_lifecycle` and commit B’s deactivation before the transfer reaches its membership update. The transfer continues, assigns the seat to B, deactivates outgoing account A, and returns success.

The membership trigger does not prevent this: `org_membership_grantee_must_be_ngo` checks account type, not lifecycle. The result is an organization whose outgoing and incoming contacts are both deactivated.

**Suggestion:** Hold a lifecycle-protecting lock on the recipient from the authoritative eligibility check through commit. Coordinate its acquisition with the outgoing-account locking fix to avoid opposing transfers acquiring participant locks in different orders.

### 3. [warning] The conformance scan accepts an unregistered SDK write route

**Location:** `tests/at/suites/req-001/_write-route-scan.ts:33`, `scanWriteRoutes`; `supabase/functions/_shared/edge.ts:358`, `writeRoute`.

**Finding:** Making `callDatabaseFunction` private does not establish the claimed exclusive database boundary. The scan only recognizes three textual spellings and silently ignores other write entry points.

**Evidence:** I passed the real scanner an additional in-memory `index.ts` that imports `createClient`, reads the service-role environment variable, and calls:

```ts
db.rpc('update_organization', {
  p_account_id: body.accountId,
  p_organization_id: body.organizationId,
  p_name: body.name,
});
```

`scanWriteRoutes` returned `[]`. The route contains none of `writeRoute`, `callDatabaseFunction`, or the literal `/rest/v1/rpc/`, so it receives no registration, construction, or configuration checks.

The existing SQL backstop cannot substitute for this boundary: it trusts the supplied actor ID. The example route would let a caller supply another account’s ID. This is a demonstrated scanner failure, not a claim that this alternate route is currently shipped.

**Suggestion:** Classify every entry point as a registered write or an explicit read. Enforce permitted imports and I/O across route modules and their dependencies instead of treating recognizable database text as the admission filter.

### 4. [warning] Replacing a function makes the SQL scan forget its surviving privileges

**Location:** `tests/at/suites/req-001/_policy-scan.ts:594–605`, `scanWriteGateSql`.

**Finding:** Every `CREATE OR REPLACE FUNCTION` resets `executeRoles` to an empty set. PostgreSQL preserves the existing function’s grants, so the scanner can incorrectly classify an exposed writer as internal and skip its lifecycle check.

**Evidence:** Using the real migration inputs, I appended an in-memory replacement of `create_organization` with its lifecycle assertion removed and its PUBLIC revoke retained. Both `scanWriteGateSql` and `scanTenantMigrations` returned `[]`.

Adding the redundant service-role EXECUTE grant to that same replacement made `scanWriteGateSql` report `definer-no-write-gate`. The database authorization is equivalent in both cases; only the scanner’s model differs.

**Suggestion:** Preserve privileges when replacing the same function signature; clear them on DROP. Share the function/privilege overlay between the two scans and add a replacement-without-regrant regression test.

### 5. [warning] Product membership grants are falsely attributed to the operator

**Location:** `supabase/migrations/20260910120000_org_membership_role_change_audit.sql:6–31`; `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql:497`.

**Finding:** Ordinary signup and organization creation produce immutable audit records claiming that the operator granted the membership, although the product knows the authenticated actor.

**Evidence:** `complete_signup` and `create_organization` receive `p_account_id` but never set `app.actor_account_id`. Their membership inserts invoke `org_membership_role_change_audit`, which finds no actor setting and passes NULL to `append_audit_event`. That helper records `actor_label = 'operator'`.

The operator sentinel ruling covers an operator path with no known actor. These are authenticated product paths. The lane report acknowledges the lost distinction, and the fixture deliberately reproduces it. Consequently, the acceptance test’s search for any operator-labelled role event can already be satisfied by signup.

**Suggestion:** Set the transaction-local actor before product membership writes. Update label construction so NGO actors are not labelled `platform_admin`, and assert the actor on the specific newly created audit event.

### 6. [warning] The adapters implement the same writes twice and expand an already oversized structure

**Location:** `tests/at/suites/req-001/_fixture.ts:1566–1708`; `tests/at/suites/req-001/_live.ts:889–1031`.

**Finding:** `attemptWrite` introduces a second implementation of operations that already have named adapter methods. This adds substantial maintenance cost and lets lifecycle tests exercise a different implementation from the operation-specific tests.

**Evidence:** The fixture repeats the complete transfer mutation sequence at lines 1575–1582 and 1650–1657: membership replacement, role audit, lifecycle change, and transfer audit. Organization creation, rename, escalation capture, lifecycle changes, and Discovery writes likewise have duplicate paths. Sharing `writePipeline` does not share these mutations.

The live adapter also repeats request construction inside `attemptWrite`. This change grows `_live.ts` from 860 to 1,072 lines without extracting the distinct administrator/audit section.

**Suggestion:** Give each operation one implementation returning its full write outcome, and make both the named method and inventory dispatcher delegate to it. Extract the administrator/audit adapter section into a focused module. This removes duplicate behavior rather than merely relocating it.

Review used file reads and in-memory scanner checks. No processes were started, files written, or database operations performed. Attribution: unattributed.