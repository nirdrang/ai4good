Read-only audit completed; no tests, builds, or proof scripts were run.

Severity scale: high = ruling/security failure; medium = material false claim; low = record metadata.

### Box A — ruling fidelity

1. CI-1 — YES — `tests/at/harness/runner.selftest.ts:251-280` observes the baseline and only hard-codes its probe filename.
2. CI-2 — NO — `tests/at/harness/type-invention.selftest.ts:5,227-284` has 31 changed lines, not only four constraint-text changes. [1]
3. B1 — YES — `_shared/edge.ts:52-92` supplies shared CORS and 502 handling to both entry points.
4. B2 — YES — `supabase/migrations/...sql:281-295` labels the database check as a backstop; the edge refusal remains shared.
5. B3a — YES — `_shared/edge.ts:131-179` validates IPs and states they are not authenticated.
6. B5 — YES — `a-signup-and-signin.test.ts:149-168` corrects the comment while the test body remains unchanged.
7. B6 — NO — the required shared export and TypeScript call sites exist, but the SQL path still duplicates the organization-name rule at `...sql:276-279`. [2]
8. B7 — YES — the three comments distinguish the adapter predicate from the SQL predicate at `_fixture.ts:251-258`, `_contract.ts:171-181`, and the test body at `a-signup-and-signin.test.ts:42-51`.
9. B8 — YES — `a-signup-and-signin.test.ts:114-136` tests missing acknowledgment refusal and no account row.
10. B9 — YES — `a-signup-and-signin.test.ts:286-300` checks no volunteer membership and no attempted organization.
11. B10 — YES — `_shared/edge.ts:85-92` shapes thrown errors as 502; the 4xx-to-409 mappings remain at the entry points.
12. B11 — YES — `proof-local.ts:43-60,682-702` stores, counts, and reports skips separately.
13. B12 — YES — `proof-local.ts:337-400` distinguishes absent, placeholder-shaped, and credential-shaped values.
14. B13 — YES — `create-organization/index.ts:50-86` has found, absent, and failed outcomes, with failed reads returning 502.
15. B14 — YES — `_shared/edge.ts:96-128` retains only `Caller.id`.
16. B15 — YES — `_contract.ts:191-204` describes operator provisioning, not a service-role write.
17. B17 — YES — `a-signup-and-signin.test.ts:311-319` explicitly says real administrator authentication belongs to live-stack check (g).
18. B18 — YES — `pr-body.md:4-6,17,34-39` contains the corrected description.
19. L3 — YES — `proof-local.ts:521-558` performs and checks the service-role insert refusal.
20. L4 — YES — `.env.example:35-49` names both Google variables with empty values.
21. Rejected B4 — YES — the migration enables RLS but creates no policies at `...sql:311-319`.
22. Rejected B10 second half — YES — the 4xx-to-409 mappings remain unchanged.
23. Rejected E3 — YES — `accounts.ts:154-158` retains the NGO-name check.

### Box B — scope

1. Territory — PASS — `git diff main...HEAD --name-only` contains no `src/` path.
2. Read-only acceptance file — PASS — `.taskmaster/docs/acceptance/at-req-001.md` is absent from the diff.
3. Foreign item IDs — FAIL — changed records contain other board IDs, including `PHASE-STATE.md:10`. [3]
4. Fix-sitting scope — PASS — `fix-rulings.md:709-711` limits the sitting to accepted fixes and plan steps 6–8; the fix-sitting delta follows that scope.
5. Secrets — FAIL — `stack-up.txt:22` contains credential values. [4]

### Box C — claim truth

1. Claims table — TRUE for loop-tier behavior: `plan.md:557-562` matches what the four test bodies drive at `a-signup-and-signin.test.ts:37-351`; live-stack evidence remains transcript-only.
2. D4 — TRUE for the adapter’s acceptance decisions: `_fixture.ts:158,225,231` delegates them to `accounts.ts`; its storage/Auth stand-ins are explicitly separated.
3. “Only door” — TRUE as a successful key-reachable path claim: authenticated INSERT is blocked by no RLS policy, service-role has SELECT only at `...sql:338,353`, and transcript check (k) records the privilege refusal.
4. F6 guard — TRUE — `...sql:133-173` independently rejects `platform_admin` and uses `security definer` with empty `search_path`.
5. Shared-module constraints — TRUE — `accounts.ts:1-31,194-198` has no imports and no `Deno`.
6. Surviving comments — FALSE — the acknowledgment IP and loop-tier administrator-authentication comments still overstate reach. [5][6]
7. Proof transcript — TRUE — `proof-local.ts:682-702` would produce the transcript’s 13-pass/1-skip verdict, and only (f2) is skipped.
8. Gate coverage — TRUE — `fix-rulings.md:25-36` and `PHASE-STATE.md:55-64` agree, while `gate2-kimi-sql.md:1-12` has no verdict.

[1] severity: high    tests/at/harness/type-invention.selftest.ts:5  
    claim: CI-2 was not implemented as exactly four marker-only constraint changes; the diff also rewrites numerous prose and diagnostic-label lines.  
    why it matters: The adopted surgical-change ruling is false even though the four rejection subjects remain intact.  
    unverified-runtime-claim: no

[2] severity: high    supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql:276  
    claim: `create_organization` still independently judges blank organization names outside `_shared/accounts.ts`.  
    why it matters: A direct RPC follows a separate name-validation branch, so B6’s “no duplicate copy outside the module” claim is untrue.  
    unverified-runtime-claim: no

[3] severity: medium    loop/items/AI4DEV-57/PHASE-STATE.md:10  
    claim: A changed file names foreign board items `AI4DEV-51`, `AI4DEV-50`, and `AI4PM-19`, contrary to the single-item scope rule.  
    why it matters: Those IDs can link or move other work items even though the pull-request body and commit subjects use only `AI4DEV-57`.  
    unverified-runtime-claim: no

[4] severity: high    loop/items/AI4DEV-57/stack-up.txt:22  
    claim: The committed stack transcript contains a JWT secret and S3 access key and secret instead of redacting them.  
    why it matters: Credential values are exposed in a changed file, violating the secret gate.  
    unverified-runtime-claim: no

[5] severity: medium    supabase/functions/complete-signup/index.ts:11  
    claim: The comment still calls the acknowledgment value the request’s “source address,” with the same wording in `_contract.ts:79` and the test diagnostic at `a-signup-and-signin.test.ts:95`.  
    why it matters: It contradicts the narrowed claim that the stored value is only an unauthenticated gateway-reported address.  
    unverified-runtime-claim: no

[6] severity: medium    tests/at/suites/req-001/a-signup-and-signin.test.ts:311  
    claim: The AT-001.07 comment calls fixture-only provisioning and sign-in a real property of the shipped decision module.  
    why it matters: The loop test can remain green while real administrator authentication fails, although the claims table assigns that proof to live check (g).  
    unverified-runtime-claim: no

[7] severity: low    loop/items/AI4DEV-57/PHASE-STATE.md:90  
    claim: The state file identifies `b4688fe` as the head although the checked-out head is `553d2bb43c1cff7593681d592e9194580ec03ff8`.  
    why it matters: A reader following the state file can inspect a superseded commit and miss the final claims-table and record corrections.  
    unverified-runtime-claim: no

AUDIT: 7 FINDINGS