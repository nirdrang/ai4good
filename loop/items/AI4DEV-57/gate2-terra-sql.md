Severity scale: high = production authorization/signup failure; medium = required data or proof is unsound; low = misleading supporting behavior.

[1] severity: high    supabase/functions/complete-signup/index.ts:35
    claim: Neither edge function handles CORS preflight requests or emits CORS headers.
    why it matters: A browser signup call from the app origin sends `OPTIONS` because it uses JSON, `Authorization`, and `apikey`; it will receive a 405/no allow headers and the browser will block the real request. Verify by sending an origin-bearing preflight to both deployed functions and checking the CORS response headers.
    unverified-runtime-claim: yes

[2] severity: high    supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql:267
    claim: The `SECURITY DEFINER` `create_organization` RPC validates only the name, so its service-role caller can create an admin membership for a volunteer or platform-admin account.
    why it matters: A direct service-role RPC with a volunteer `p_account_id` writes an organisation and `role = 'admin'`, bypassing the TypeScript NGO check and violating the NGO-only boundary. Verify by making that RPC and reading the resulting membership.
    unverified-runtime-claim: yes

[3] severity: medium    supabase/functions/_shared/edge.ts:96
    claim: The acknowledgment IP is optional and sourced from an untrusted left-most `x-forwarded-for` value.
    why it matters: A request without that header records `NULL` despite IP being required, while a client able to prepend the header can forge the audit IP. Verify through the actual gateway with an omitted and a spoofed chained header, then inspect `acknowledgments.ip`.
    unverified-runtime-claim: yes

[4] severity: medium    tests/at/suites/req-001/_fixture.ts:243
    claim: AT-001.01’s loop-tier predicate and return-sign-in assertions exercise in-memory Maps, not `public.has_platform_acknowledgment` or Supabase Auth.
    why it matters: A constant/wrong SQL predicate or broken real password sign-in can leave this test green, contrary to the stated per-id proof claim. The fixture must not be presented as proving those database/Auth behaviors.
    unverified-runtime-claim: no

[5] severity: medium    tests/at/suites/req-001/a-signup-and-signin.test.ts:264
    claim: AT-001.07’s loop-tier green claims a provisioned admin authenticates even though provisioning and sign-in are fixture-only operations.
    why it matters: The test passes if the real admin provisioning/sign-in path fails; the plan reserves that proof for live-stack step 7(g), not the loop tier.
    unverified-runtime-claim: no

[6] severity: medium    loop/items/AI4DEV-57/proof-local.ts:306
    claim: The Google handshake check treats any nonempty client ID in the script process as a real credential and does not establish it matches the running stack.
    why it matters: A planned placeholder can produce a redirect containing that placeholder and falsely pass f2, while a real credential supplied only when the stack starts can be incorrectly skipped. Verify with each setup and compare the reported f2 result to the running Auth configuration.
    unverified-runtime-claim: yes

[7] severity: low    supabase/functions/create-organization/index.ts:57
    claim: A failed account-type lookup is indistinguishable from an absent account and is returned as “complete signup” with HTTP 409.
    why it matters: A completed NGO sees a misleading client-correctable error during a Data API/service-key failure instead of a retriable server failure. Verify by forcing a non-2xx account lookup for a completed account.
    unverified-runtime-claim: yes

[8] severity: low    loop/items/AI4DEV-57/pr-body.md:4
    claim: The committed PR body still says the pull request contains only a plan, no code, and that `--wired` is unimplemented.
    why it matters: It misstates the reviewed change and contradicts the amended plan, so reviewers can make a merge decision against obsolete scope and verification information.
    unverified-runtime-claim: no

CODE REVIEW: 8 FINDINGS