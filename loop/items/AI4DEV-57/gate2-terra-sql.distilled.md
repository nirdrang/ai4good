SOURCE   C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\artifacts-AI4DEV-57\gate2-terra-sql.md
REVIEWER terra (codex, gpt-5.6, effort max, read-only sandbox) — Gate 2 DRAFT CODE REVIEW, SQL+config slice, AI4DEV-57, head 1782d7c1afd8b898320280905777b822ba09ce70
COUNT    8 findings in source → 8 extracted
NOTES    none — declared closing line "CODE REVIEW: 8 FINDINGS" matches extracted count; no truncation observed.

[1] severity: high   supabase/functions/complete-signup/index.ts:35
    claim: "Neither edge function handles CORS preflight requests or emits CORS headers."
    unverified-runtime-claim: yes
    raw: gate2-terra-sql.md lines 3-6

[2] severity: high   supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql:267
    claim: "The `SECURITY DEFINER` `create_organization` RPC validates only the name, so its service-role caller can create an admin membership for a volunteer or platform-admin account."
    unverified-runtime-claim: yes
    raw: gate2-terra-sql.md lines 8-11

[3] severity: medium   supabase/functions/_shared/edge.ts:96
    claim: "The acknowledgment IP is optional and sourced from an untrusted left-most `x-forwarded-for` value."
    unverified-runtime-claim: yes
    raw: gate2-terra-sql.md lines 13-16

[4] severity: medium   tests/at/suites/req-001/_fixture.ts:243
    claim: "AT-001.01's loop-tier predicate and return-sign-in assertions exercise in-memory Maps, not `public.has_platform_acknowledgment` or Supabase Auth."
    unverified-runtime-claim: no
    raw: gate2-terra-sql.md lines 18-21

[5] severity: medium   tests/at/suites/req-001/a-signup-and-signin.test.ts:264
    claim: "AT-001.07's loop-tier green claims a provisioned admin authenticates even though provisioning and sign-in are fixture-only operations."
    unverified-runtime-claim: no
    raw: gate2-terra-sql.md lines 23-26

[6] severity: medium   loop/items/AI4DEV-57/proof-local.ts:306
    claim: "The Google handshake check treats any nonempty client ID in the script process as a real credential and does not establish it matches the running stack."
    unverified-runtime-claim: yes
    raw: gate2-terra-sql.md lines 28-31

[7] severity: low   supabase/functions/create-organization/index.ts:57
    claim: "A failed account-type lookup is indistinguishable from an absent account and is returned as \"complete signup\" with HTTP 409."
    unverified-runtime-claim: yes
    raw: gate2-terra-sql.md lines 33-36

[8] severity: low   loop/items/AI4DEV-57/pr-body.md:4
    claim: "The committed PR body still says the pull request contains only a plan, no code, and that `--wired` is unimplemented."
    unverified-runtime-claim: no
    raw: gate2-terra-sql.md lines 38-41
</content>
