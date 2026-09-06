## Findings

### 1. [structural] Organization transfer and account deactivation have different scopes

**Components**: Organization memberships, contact transfer, account lifecycle.

**Finding**: The planned transfer concerns one organization, but deactivates an account that may own several organizations. Repointing one seat and deactivating its former holder can therefore disable unrelated organizations. Transferring every membership instead would move authority beyond the requested organization.

**Evidence**: The [membership schema](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql:57) permits multiple organizations per account. The [single-seat index](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql:41) restricts memberships per organization, not organizations per account. [Integration coverage](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/tests/at/suites/req-001/_integration.ts:339) already exercises one account creating a second organization. Meanwhile, [AT-001.25](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/.taskmaster/docs/acceptance/at-req-001.md:55) requires deactivating the old account.

**Impact**: The transfer design needs an explicit policy for the old account’s other memberships before its transaction can be specified correctly. Tests involving only one organization would conceal this conflict.

### 2. [concern] Transactional writes do not serialize changes to authorization

**Components**: SQL definers, membership transfer, lifecycle gate.

**Finding**: Existing definers read authorization facts and subsequently mutate another row without locking the authorization facts. Their transaction guarantees all-or-nothing writes, but does not establish an ordering against concurrent transfer or deactivation.

**Evidence**: [update_organization](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/migrations/20260811125000_org_membership_ngo_only_and_organization_rename.sql:160) reads membership with a plain `SELECT`, then updates `organizations`. [create_organization](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql:283) similarly reads the account before inserting organization and membership rows. The [loop adapter](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/tests/at/suites/req-001/_fixture.ts:1100) performs the equivalent check and mutation synchronously in Maps.

**Impact**: Copying this pattern for lifecycle checks permits an in-flight write to pass the check, then finish after deactivation commits. Transfer and every gated write need a shared concurrency contract; simply repeating the check in SQL does not prove “immediately.” Sequential loop tests cannot verify that contract.

### 3. [concern] Historical records inherit the lifetime of login accounts

**Components**: Auth users, accounts, acknowledgments, future audit records.

**Finding**: Historical attribution is attached to a deletable authentication identity through cascading foreign keys. Deactivate-without-delete preserves current rows during transfer, but does not establish durable preservation afterward.

**Evidence**: [accounts.id](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql:38) cascades from `auth.users`; [acknowledgments.account_id](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql:72) cascades from `accounts`. Captured signer fields remain on those same acknowledgment rows. The [live repoint operation](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/tests/at/suites/req-001/_live.ts:552) overwrites membership ownership without retaining the previous membership.

**Impact**: A later administrative Auth deletion can erase the history that transfer promised to preserve. The new audit model must explicitly retain actor identity and previous ownership, with deliberate deletion behavior. Reusing the existing cascading-reference pattern would undermine append-only history even if direct audit updates and deletes were forbidden.

### 4. [concern] The proposed write inventory rests on a convention rather than an enforced boundary

**Components**: Edge entries, RPC transport, Auth endpoints, lifecycle conformance scan.

**Finding**: Importing `callDatabaseFunction` identifies today’s three application writes, but cannot establish that every future write uses the lifecycle boundary. It describes current implementation syntax, not mutation authority.

**Evidence**: [callDatabaseFunction](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/functions/_shared/edge.ts:277) accepts an arbitrary function name and argument bag. The same module’s [publicProjectReads](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/functions/_shared/edge.ts:353) demonstrates a separate service-role RPC transport using direct `fetch`. Auth mutations take another road entirely: the [unlink measurement](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/loop/items/AI4DEV-56/artifacts/measure/unlink-trigger-probe.txt:6) successfully deletes an identity through Auth without any edge entry.

**Impact**: A scan based only on the named import would miss a wrapper, direct RPC fetch, or Auth mutation while continuing to report complete coverage. The design needs an independently enumerated route set, explicit classifications and exceptions, and enforcement against alternate mutation paths. Auth-side enforcement must have its own coverage rather than silently inheriting the edge registry’s claim.

### 5. [concern] Error boundaries erase the distinctions the new acceptance tests require

**Components**: Caller resolution, RPC outcomes, live adapter, acceptance contract.

**Finding**: Several boundaries collapse policy refusals, invalid credentials, throttling, and upstream failures into indistinguishable outcomes. That makes the test contract too weak to prove why an operation failed.

**Evidence**: [callerFromAuthAnswer](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/functions/_shared/caller.ts:111) returns `null` for every non-success Auth status. [RPC handling](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/functions/_shared/edge.ts:293) retains the database message but discards its error code. The [live sign-in adapter](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/tests/at/suites/req-001/_live.ts:240) and [write adapter](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/tests/at/suites/req-001/_live.ts:418) then discard HTTP status. The [unlink trigger probe](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/loop/items/AI4DEV-56/artifacts/measure/unlink-trigger-probe.txt:11) already demonstrates an intentional refusal presented as HTTP 500.

**Impact**: An unchanged row plus `ok: false` can demonstrate an outage instead of lifecycle enforcement; repeated wrong-password responses can masquerade as throttling. Preserve machine-readable refusal categories and transport evidence through the adapters. The unlink test also needs surviving-identity and healthy-control assertions because its measured status alone cannot identify the guard.

### 6. [concern] Integration preparation proves database state more strongly than Auth configuration

**Components**: Stack preparation, Auth hooks, rate limits, measurement records.

**Finding**: The integration harness verifies migration replay and token lifetime, but does not establish that the running Auth service uses the hook and rate-limit configuration under review.

**Evidence**: [readLocalConfig](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/tests/at/harness/local-stack.ts:186) extracts project identity, ports, and JWT lifetime; [configDriftProblems](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/tests/at/harness/local-stack.ts:928) compares those fields only. The [environment measurement](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/loop/items/AI4DEV-56/artifacts/measure/unit6-auth-container-env.txt:12) records an email limit different from the file. The [hook probe](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/loop/items/AI4DEV-56/artifacts/measure/hook-push-probe.txt:9) establishes environment-variable propagation, but contains no hook invocation or rejection test. The [sign-in probe](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/loop/items/AI4DEV-56/artifacts/measure/unit6-signin-rate-limit.ts:12) uses an unprovisioned address and supplies no forwarded address.

**Impact**: A replayed hook function can exist without being active in Auth. Conversely, a working account-based hook would not, by that fact alone, prove the configured per-IP sign-in limit. The design must bind its acceptance claim to the actual enforcement scope, running configuration, and observed behavior.

### 7. [concern] Privilege checks do not yet cover the authorities introduced by Auth enforcement

**Components**: Static migration scanner, live catalog, future Auth hooks and triggers.

**Finding**: The existing checks provide useful protection for public application tables, but their modeled authorities and objects are narrower than the upcoming Auth integration.

**Evidence**: The [static scanner](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/tests/at/suites/req-001/_policy-scan.ts:188) excludes `references` and `trigger` from its prohibited service-role privileges, and its [baseline check](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/tests/at/suites/req-001/_policy-scan.ts:455) requires explicit revocation for only `anon` and `authenticated`. The [live catalog](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/tests/at/suites/req-001/_live-tenant-reads.ts:263) examines public tables and public definer functions, without checking Auth trigger attachment or `supabase_auth_admin` privileges. The [reset measurement](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/loop/items/AI4DEV-56/artifacts/measure/unit4-privileges-after-reset.txt:10) confirms that existing table privileges are already corrected.

**Impact**: Another cleanup migration would duplicate completed work, while new Auth grants and trigger wiring could remain outside the proof. Extend the checks around those concrete authorities and objects; the current public-table catalog cannot certify the unlink or hook boundary.

### 8. [concern] CI checks shared decisions but omits deployed write orchestration

**Components**: Edge handlers, TypeScript projects, fixture adapter, CI.

**Finding**: The pure-decision separation is useful, but deployed write orchestration has neither ordinary type-check coverage nor direct loop-tier execution. This is where the mandatory lifecycle gate would be wired.

**Evidence**: [typecheck.ts](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/tests/at/typecheck.ts:41) checks the app, acceptance tests, and verification scripts. The [edge module](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/supabase/functions/_shared/edge.ts:11) explicitly records its exclusion. The [fixture](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/tests/at/suites/req-001/_fixture.ts:1047) independently reconstructs write orchestration, while [CI](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-56/.github/workflows/ci.yml:170) runs acceptance verification only at loop tier.

**Impact**: A correct shared lifecycle predicate and green fixture tests can coexist with incorrect deployed wiring. The new boundary needs compilation and wiring coverage in addition to registry membership checks; integration remains necessary for SQL, Auth, and concurrency behavior.