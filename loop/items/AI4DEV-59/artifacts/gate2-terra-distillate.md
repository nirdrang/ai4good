SOURCE   loop/items/AI4DEV-59/artifacts/gate2-terra-output.md
REVIEWER gpt-5.6-terra (codex, effort max, --sandbox read-only) — DRAFT CODE review, seat A / reader one
COUNT    9 findings in source → 9 extracted
NOTES    none — declared count line `CODE REVIEW: 9 FINDINGS` matches the 9 findings extracted.

[1] severity: medium   tests/at/harness/shipped-verification.selftest.ts:96
    claim: "The malformed-caller selftest checks only `ok` and never verifies that those refusals name email verification as the remedy."
    unverified-runtime-claim: no
    raw: gate2-terra-output.md, finding [1]

[2] severity: medium   tests/at/suites/req-001/_fixture.ts:60
    claim: "The fixture calls the never-issued-link mirror live-bound even though the proof never follows or observes an unissued link."
    unverified-runtime-claim: yes
    raw: gate2-terra-output.md, finding [2]

[3] severity: high   loop/items/AI4DEV-59/proof-local.ts:595
    claim: "Check (c) treats any HTTP status of 400 or greater as the expected pre-confirmation refusal and does not assert a confirmation-specific response."
    unverified-runtime-claim: yes
    raw: gate2-terra-output.md, finding [3]

[4] severity: high   loop/items/AI4DEV-59/proof-local.ts:689
    claim: "Check (e) never requires the volunteer round trip to use an emailed verification link, despite claiming it repeats check (b)."
    unverified-runtime-claim: yes
    raw: gate2-terra-output.md, finding [4]

[5] severity: medium   loop/items/AI4DEV-59/proof-local.ts:316
    claim: "The stale-worktree probe accepts any non-404 response as the current `complete-signup` function."
    unverified-runtime-claim: yes
    raw: gate2-terra-output.md, finding [5]

[6] severity: high   loop/items/AI4DEV-59/proof-local.ts:122
    claim: "The redirect redactor strips only URL fragments and logs credential-bearing query parameters unchanged."
    unverified-runtime-claim: yes
    raw: gate2-terra-output.md, finding [6]

[7] severity: medium   tests/at/suites/req-001/_fixture.ts:12
    claim: "The updated fixture header falsely says `verification.ts` is imported by edge functions and that every accept/refusal below comes from shipped modules."
    unverified-runtime-claim: no
    raw: gate2-terra-output.md, finding [7]

[8] severity: low   tests/at/suites/req-001/_fixture.ts:80
    claim: "The new mirror makes a provisioned platform admin unconfirmed by reusing email registration, despite the repository's real provisioning flow creating that user with `email_confirm: true`."
    unverified-runtime-claim: yes
    raw: gate2-terra-output.md, finding [8]

[9] severity: low   loop/items/AI4DEV-59/pr-body.md:12
    claim: "The PR body still says the branch is in the plan phase and that code comes after plan review, although this commit contains the draft implementation under code review."
    unverified-runtime-claim: no
    raw: gate2-terra-output.md, finding [9]
