SOURCE   loop/items/AI4DEV-62/artifacts/gate2-slice1-flash.raw.txt
REVIEWER flash (gate 2, draft code review, slice 1)
COUNT    2 findings in source → 2 extracted
NOTES    Declared count line `CODE REVIEW: 2 FINDINGS` matches the extracted count. No mismatch.

[1] severity: low   tests/at/suites/req-001/_fixture.ts:1084-1086 vs supabase/migrations/20260811120000_...sql:43-89
    claim: "the fixture's operator grant checks organisation existence *before* the grantee-type rule, while the database's BEFORE trigger runs before the org foreign key is consulted, so the two surfaces answer differently for one input."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-62/artifacts/gate2-slice1-flash.raw.txt lines 11-14

[2] severity: low   tests/at/suites/req-001/_fixture.ts:1035-1036 vs supabase/functions/update-organization/index.ts:97-112
    claim: "the fixture's rename answers `refused` (\"no organisation … exists\") for a nonexistent organisation, while the deployed function answers 403 `not-a-member` for a well-formed-UUID nonexistent organisation, and the RPC backstop would answer \"no such organisation\" — three surfaces, three answers, and the fixture matches none of the two live ones."
    unverified-runtime-claim: yes — "the deployed function answers 403 not-a-member for a random well-formed UUID" is a runtime behaviour claim. What would settle it: call the deployed `update-organization` with a valid session and a random UUID, and observe the status and `kind` (expect 403 `not-a-member`, not 502 `refused`).
    raw: loop/items/AI4DEV-62/artifacts/gate2-slice1-flash.raw.txt lines 16-19
