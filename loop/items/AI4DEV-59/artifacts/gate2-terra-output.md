Severity scale: high = can certify a required claim while false; medium = leaves a promised guarantee unproved; low = false scoped documentation or fixture state.

[1] severity: medium    tests/at/harness/shipped-verification.selftest.ts:96
    claim: The malformed-caller selftest checks only `ok` and never verifies that those refusals name email verification as the remedy.
    why it matters: A malformed caller could return `"forbidden"` while the normal `emailVerified: false` path retains the helpful reason, leaving both this selftest and AT-001.10 green despite the all-refusals promise.
    unverified-runtime-claim: no

[2] severity: medium    tests/at/suites/req-001/_fixture.ts:60
    claim: The fixture calls the never-issued-link mirror live-bound even though the proof never follows or observes an unissued link.
    why it matters: GoTrue could accept a mutated or unknown verification token while the fixture Map negative still passes; following a mutated issued link and reading `email_confirmed_at` unchanged would settle this without asserting retired link-lifetime semantics.
    unverified-runtime-claim: yes

[3] severity: high    loop/items/AI4DEV-59/proof-local.ts:595
    claim: Check (c) treats any HTTP status of 400 or greater as the expected pre-confirmation refusal and does not assert a confirmation-specific response.
    why it matters: A 429, 500, or unrelated Auth failure can be recorded as PASS even if confirmation is not enforcing sign-in; the run must identify the confirmation-required refusal before the link and successful sign-in after it.
    unverified-runtime-claim: yes

[4] severity: high    loop/items/AI4DEV-59/proof-local.ts:689
    claim: Check (e) never requires the volunteer round trip to use an emailed verification link, despite claiming it repeats check (b).
    why it matters: If the volunteer email is absent, `verificationRoundTrip` can use `adminGeneratedLink` and still pass (e), falsely certifying both public types’ emailed verification flow; the second address must prove `linkSource === 'emailed'`.
    unverified-runtime-claim: yes

[5] severity: medium    loop/items/AI4DEV-59/proof-local.ts:316
    claim: The stale-worktree probe accepts any non-404 response as the current `complete-signup` function.
    why it matters: A stale mounted function can return its normal unauthenticated 401 and later produce the expected rows, so check (e) does not bind its evidence to this commit; the mounted artifact needs a verifiable revision/source marker before the proof runs.
    unverified-runtime-claim: yes

[6] severity: high    loop/items/AI4DEV-59/proof-local.ts:122
    claim: The redirect redactor strips only URL fragments and logs credential-bearing query parameters unchanged.
    why it matters: A confirmation redirect using `?code=` or a query-token flow can write that credential into the committed transcript; a run using such a redirect must show that sensitive query values are redacted.
    unverified-runtime-claim: yes

[7] severity: medium    tests/at/suites/req-001/_fixture.ts:12
    claim: The updated fixture header falsely says `verification.ts` is imported by edge functions and that every accept/refusal below comes from shipped modules.
    why it matters: No deployed function imports `verification.ts`, and `sendDiscoveryMessage` has fixture-owned precondition refusals, so the header overstates what a loop green proves beyond the amended plan’s explicit limitation.
    unverified-runtime-claim: no

[8] severity: low    tests/at/suites/req-001/_fixture.ts:80
    claim: The new mirror makes a provisioned platform admin unconfirmed by reusing email registration, despite the repository’s real provisioning flow creating that user with `email_confirm: true`.
    why it matters: A future verification-aware admin test would exercise a fixture state the established provisioning path does not create, and this fifth mirror has no independent binding; creating an admin under the flipped config and reading `email_confirmed_at` would settle it.
    unverified-runtime-claim: yes

[9] severity: low    loop/items/AI4DEV-59/pr-body.md:12
    claim: The PR body still says the branch is in the plan phase and that code comes after plan review, although this commit contains the draft implementation under code review.
    why it matters: The PR’s status record misstates the current review stage and can cause the implementation diff to be treated as unavailable or unreviewed.
    unverified-runtime-claim: no

CODE REVIEW: 9 FINDINGS