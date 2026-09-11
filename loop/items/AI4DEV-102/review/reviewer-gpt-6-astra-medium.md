## Findings

### 1. [warning] The fixture duplicates the database implementation and already disagrees with it
**Location**: [tests/at/suites/req-002/_fixture.ts:385](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/tests/at/suites/req-002/_fixture.ts:385), particularly `commitVetting`, `undo`, and `attemptVettingDefinerAsOperator`.

**Finding**: The adapter implements a second vetting transaction engine, including constraint errors, audit writes, notification writes, and manual rollback. This creates substantial maintenance work without checking the canonical SQL implementation.

**Evidence**: `attemptVettingDefinerAsOperator` passes any account directly to `commitVetting`, which never checks platform-admin standing or account lifecycle. The real definer rejects those callers. Similarly, the schema tests receive fabricated PostgreSQL constraint errors from `operatorRowRefused`; the rollback test exercises the fixture’s handwritten `undo`. CI runs the loop tier, so these checks can remain green when the corresponding SQL protections break.

**Suggestion**: Keep loop tests focused on shipped TypeScript decisions. Run constraint, authorization-backstop, and transaction-rollback tests against PostgreSQL in CI, and remove their simulated implementations.

### 2. [critical] Retried requests can spend credits twice and duplicate vetting notifications
**Location**: [supabase/migrations/20260916120000_discovery_allowance.sql:176](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/supabase/migrations/20260916120000_discovery_allowance.sql:176), and `set_organization_vetting` at line 389.

**Finding**: Neither write accepts or persists a request identity. Transactional atomicity does not make these operations safe to retry.

**Evidence**: A debit can commit while its HTTP response is lost. Repeating the same request increments `spent` again: two requests for one credit produce two credits spent. The aggregate ledger cannot identify or reconcile the duplicate.

The vet path likewise always updates the record, appends another audit row, and emits another notification—even when the previous identical request committed. Notification delivery deduplication cannot help: each emission receives a fresh event ID and therefore fresh delivery keys.

**Suggestion**: Accept a stable operation ID and record its result atomically with the write. Replays should return that result. Intentional new actions should use new IDs.

### 3. [warning] Notifications do not identify which organisation was vetted
**Location**: [supabase/migrations/20260916120000_discovery_allowance.sql:474](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/supabase/migrations/20260916120000_discovery_allowance.sql:474), and [notification-copy.ts:71](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/supabase/functions/_shared/notification-copy.ts:71).

**Finding**: Both the persisted notification and its rendered text omit the organisation identity.

**Evidence**: The event and delivery payloads contain only `{outcome}`. The copy says “Your organisation” without a name or link. Existing `create_organization` permits one account to administer multiple organisations; the membership uniqueness constraint limits seats per organisation, not organisations per account.

If that account receives a vet notification for organisation A and an unvet notification for organisation B, neither message identifies its subject. An in-app consumer cannot recover that association from the notification rows either.

**Suggestion**: Persist the organisation ID in both payloads and include its name in the rendered notification.

### 4. [warning] Oversized debits overflow before reaching the allowance refusal
**Location**: [supabase/functions/_shared/discovery-allowance.ts:163](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/supabase/functions/_shared/discovery-allowance.ts:163), and [20260916120000_discovery_allowance.sql:167](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-102/supabase/migrations/20260916120000_discovery_allowance.sql:167).

**Finding**: The request validator accepts positive integers that the SQL arithmetic cannot safely handle.

**Evidence**: After spending one credit, submit `credits: 2147483647`. TypeScript accepts it, and it fits the RPC’s PostgreSQL `integer` parameter. However, `v_spent + p_credits` overflows before the comparison executes. The caller receives a generic integer-range refusal instead of `daily-allowance-exhausted` and its three remedies. Larger integers fail during parameter conversion.

**Suggestion**: Validate the supported integer range and compare `p_credits > v_granted - v_spent`, which avoids overflowing the addition.

*Findings are based on source inspection. Runtime probing failed with a local file-access error; integration tests were not run.*