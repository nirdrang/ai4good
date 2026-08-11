SOURCE   loop/items/AI4DEV-62/artifacts/gate2-slice1-terra.raw.txt
REVIEWER terra (codex, model gpt-5.6-terra, effort max)
COUNT    5 findings in source → 5 extracted
NOTES    Raw file's own declared count line "CODE REVIEW: 5 FINDINGS" matches the 5 findings extracted. No mismatch.

[1] severity: high   supabase/migrations/20260811120000_org_membership_ngo_only_and_organization_rename.sql:136
    claim: "`update_organization` checks organisation existence before caller membership, producing a distinct “no such organisation” error for an unknown ID."
    why it matters (reviewer's words): "A service-role RPC caller can distinguish an existing organisation they do not belong to from a nonexistent one, creating the existence oracle the edge path is meant to avoid. Verify by calling the RPC with the same account against an existing non-member target and an absent UUID."
    unverified-runtime-claim: yes
    raw: line 3-6

[2] severity: medium   tests/at/suites/req-001/_fixture.ts:1079
    claim: "The fixture checks whether an organisation exists before mirroring the NGO-only `BEFORE INSERT` trigger."
    why it matters (reviewer's words): "For a valid absent organisation UUID and a volunteer account, PostgreSQL should run the trigger before the foreign-key check and classify it as `not-an-ngo-account`; the loop fixture instead returns generic `refused`, so the tiers diverge on an unhappy input. Verify with that direct insert on the slot."
    unverified-runtime-claim: yes
    raw: line 8-11

[3] severity: medium   tests/at/suites/req-001/_live.ts:640
    claim: "The live adapter labels any SQLSTATE `42501` as `not-an-ngo-account` without requiring the NGO-only trigger’s stated message."
    why it matters (reviewer's words): "A different selective permission, policy, or trigger error for a volunteer can falsely satisfy AT-001.37’s refusal arm while writing nothing; the NGO control can still succeed. Require the expected trigger message/identity together with the SQLSTATE. Verify by inducing a non-NGO-rule `42501` for only the volunteer insert."
    unverified-runtime-claim: yes
    raw: line 13-16

[4] severity: low   supabase/migrations/20260811120000_org_membership_ngo_only_and_organization_rename.sql:130
    claim: "The definer RPC’s default `btrim` validation accepts tab-only names that `validateOrganizationName` rejects."
    why it matters (reviewer's words): "A caller bypassing the edge through the permitted service-role RPC can rename an organisation to a visually blank name, so the database backstop does not preserve the shared validation rule. Verify with `p_name` set to a tab and read back the row."
    unverified-runtime-claim: yes
    raw: line 18-21

[5] severity: medium   tests/at/suites/req-001/c-membership-and-acknowledgment.test.ts:244
    claim: "AT-001.37 tests only volunteer INSERT attempts, not `platform_admin` or an UPDATE that changes an existing membership’s account."
    why it matters (reviewer's words): "An INSERT-only trigger, or one that permits platform administrators, can leave both tiers green despite violating the planned NGO-only rule on every SQL path. Add direct operator arms for both cases with read-backs."
    unverified-runtime-claim: no
    raw: line 23-26
