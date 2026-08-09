SOURCE   loop/items/AI4DEV-60/artifacts/gate2-terra-output.txt
REVIEWER gpt-5.6-terra / codex, effort max, sandbox read-only (gate 2, draft-code review, reader one)
COUNT    6 findings in source → 6 extracted
NOTES    none — declared count line "CODE REVIEW: 6 FINDINGS" matches the 6 findings extracted; file size stable across a settle check (2770 bytes, unchanged after 5s)

[1] severity: medium   supabase/functions/_shared/edge.ts:171
    claim: "A 2xx response whose valid JSON body is `null` now becomes a 401 refusal, whereas the old `user.id` read threw and became a 502; only unparseable 2xx bodies were accepted as a behavior change."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-60/artifacts/gate2-terra-output.txt lines 3-6

[2] severity: medium   tests/at/suites/req-001/b-verification-and-sessions.test.ts:308
    claim: "AT-001.38 makes equality between wrong-password and unknown-address refusal text a pass/fail assertion, despite the plan saying that no-existence behavior is observed, not asserted."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-60/artifacts/gate2-terra-output.txt lines 8-11

[3] severity: medium   tests/at/suites/req-001/b-verification-and-sessions.test.ts:291
    claim: "The correct-password control does not prove that sign-in minted a session, because `registerAndConfirm` already leaves the fixture's registration session live and `length > 0` passes without a before/after increase."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-60/artifacts/gate2-terra-output.txt lines 13-16

[4] severity: medium   tests/at/suites/req-001/_fixture.ts:833
    claim: "A second password-reset request retains the first link in `byPasswordResetLink`, so the earlier link remains usable after a resend."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-60/artifacts/gate2-terra-output.txt lines 18-21

[5] severity: low   tests/at/suites/req-001/b-verification-and-sessions.test.ts:358
    claim: "Neither expiry body exercises the exact 3600-second boundary; both only test at 3601 seconds."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-60/artifacts/gate2-terra-output.txt lines 23-26

[6] severity: low   tests/at/harness/shipped-caller.selftest.ts:51
    claim: "The caller selftest never covers the explicitly preserved blank-string `id` case."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-60/artifacts/gate2-terra-output.txt lines 28-31
