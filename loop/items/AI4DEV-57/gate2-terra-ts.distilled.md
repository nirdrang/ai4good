SOURCE   C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\artifacts-AI4DEV-57\gate2-terra-ts.md
REVIEWER codex (terra, gpt-5.6, effort max, read-only sandbox), Gate 2 DRAFT CODE REVIEW, TypeScript+tests slice, head 1782d7c1afd8b898320280905777b822ba09ce70
COUNT    11 findings in source → 11 extracted
NOTES    none — closing count line "CODE REVIEW: 11 FINDINGS" matches the 11 findings present.

[1] severity: high   supabase/functions/_shared/edge.ts:35
    claim: "Neither edge function handles CORS preflight or emits CORS response headers."
    why it matters: "Browser signup from the app origin sends an authenticated JSON preflight; these endpoints reject `OPTIONS` and their POST responses lack access-control headers, so the later UI cannot invoke them. Verify with an Origin-bearing preflight and POST through the deployed gateway."
    unverified-runtime-claim: yes
    raw: gate2-terra-ts.md lines 3-6

[2] severity: high   supabase/functions/_shared/edge.ts:96
    claim: "The acknowledgment IP may be null or attacker-chosen because the code trusts the first raw `x-forwarded-for` value."
    why it matters: "A request without that header stores `NULL` in the nullable `ip` column, while a caller/proxy chain can supply a forged first value; the audit record therefore need not contain the request's source address. Verify signed-in requests with absent and spoofed headers, then inspect `acknowledgments.ip`."
    unverified-runtime-claim: yes
    raw: gate2-terra-ts.md lines 8-11

[3] severity: high   supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql:293
    claim: "A returning authenticated user has no supported way to obtain their `account_type`."
    why it matters: "RLS is enabled with no policies, no Auth metadata is populated, and no edge endpoint returns the account after later sign-in; NGO, volunteer, and platform-admin sessions therefore cannot actually "carry" their global type as AT-001.07 requires."
    unverified-runtime-claim: no
    raw: gate2-terra-ts.md lines 13-16

[4] severity: high   tests/at/suites/req-001/_fixture.ts:154
    claim: "AT-001.03's Google-versus-email comparison is provider-blind."
    why it matters: "The adapter's `completeSignup` reads only `session.accountId`; neither it nor the shared decision receives `session.provider`, so an edge-function regression that treats Google differently still leaves this loop-tier test green."
    unverified-runtime-claim: no
    raw: gate2-terra-ts.md lines 18-21

[5] severity: high   tests/at/suites/req-001/_fixture.ts:243
    claim: "The acceptance adapter reimplements `has_platform_acknowledgment` instead of exercising the shipped SQL predicate."
    why it matters: "The SQL function could return `true` unconditionally or check the wrong acknowledgment kind while the Map predicate still passes; the plan's loop-tier claim that the predicate discriminates is therefore stronger than the suite can support."
    unverified-runtime-claim: no
    raw: gate2-terra-ts.md lines 23-26

[6] severity: medium   tests/at/suites/req-001/_fixture.ts:224
    claim: "Organization-name validation is independently duplicated in the fixture and `create-organization` edge function rather than shared through `accounts.ts`."
    why it matters: "The adapter can continue accepting or rejecting malformed names differently from production while all four loop tests pass on valid names, breaking D4's "shared judgments" guarantee."
    unverified-runtime-claim: no
    raw: gate2-terra-ts.md lines 28-31

[7] severity: medium   tests/at/suites/req-001/a-signup-and-signin.test.ts:53
    claim: "AT-001.01 never tests that omitting the acknowledgment is rejected and leaves no account state."
    why it matters: "A weakened implementation can preserve the tested happy-path record while allowing signup without an actual acknowledgment, so the green test does not establish the criterion's "required" clause."
    unverified-runtime-claim: no
    raw: gate2-terra-ts.md lines 33-36

[8] severity: medium   supabase/functions/_shared/edge.ts:122
    claim: "Upstream Auth/Data API failures bypass the intended structured error handling."
    why it matters: "A rejected `fetch` or bad successful body throws rather than producing an `RpcOutcome`; additionally `create-organization` maps any failed account lookup to "complete signup." Outages can therefore surface as a generic 500 or a false 409 rather than the documented transient failure. Verify by faulting both upstream calls and asserting the returned JSON/status."
    unverified-runtime-claim: yes
    raw: gate2-terra-ts.md lines 38-41

[9] severity: high   loop/items/AI4DEV-57/proof-local.ts:44
    claim: "A skipped proof check is stored as `passed: true`."
    why it matters: "The normally skipped Google credential check is counted as a pass and permits `ALL CHECKS PASSED`, despite the script's own contract saying skips are never passes; this can falsely certify missing live-stack evidence."
    unverified-runtime-claim: no
    raw: gate2-terra-ts.md lines 43-46

[10] severity: low   tests/at/suites/req-001/_contract.ts:173
    claim: "The contract still says live platform-admin provisioning is a service-role write, contradicting the migration's deliberate removal of service-role INSERT privileges."
    why it matters: "A later implementation following this comment will either fail or restore the direct write path that bypasses the database's platform-admin guard."
    unverified-runtime-claim: no
    raw: gate2-terra-ts.md lines 48-51

[11] severity: low   tests/at/suites/req-001/_fixture.ts:20
    claim: "The fixture comment presents `proof-local.txt` as produced live-stack evidence even though this draft has not run the script or created that transcript."
    why it matters: "Reviewers can mistake adapter-only coverage for verified edge-function and database behavior, contradicting the plan's explicit verification boundary."
    unverified-runtime-claim: no
    raw: gate2-terra-ts.md lines 53-56
