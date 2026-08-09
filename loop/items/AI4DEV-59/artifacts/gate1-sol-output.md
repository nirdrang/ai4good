Severity scale: high = can produce a materially wrong product decision; medium = verification can pass despite a material coverage or execution gap.

[1] severity: high    loop/items/AI4DEV-59/plan.md:109
    claim: The plan treats Google/GitHub users as email-confirmed without a ratified product ruling and incorrectly says step 5 verifies their GoTrue serialization, although that step exercises only email/password users.
    why it matters: A provider NGO could either bypass the emailed-link floor or be permanently blocked without a confirmation-link remedy; settle this with a product ruling plus raw `/auth/v1/user` responses from real Google and GitHub sessions passed through `emailVerifiedFromUser`.
    unverified-runtime-claim: yes

[2] severity: medium    loop/items/AI4DEV-59/plan.md:243
    claim: Step 5 claims both email-capable account types flow, but only the NGO address completes signup; the second address repeats type-blind Auth operations and never becomes a volunteer account.
    why it matters: The configuration flip invalidates the predecessor’s pre-confirmation volunteer evidence, so post-confirmation GitHub linking and volunteer completion could be broken while this proof passes; settle it by confirming the second address, signing in, establishing the GitHub identity using the predecessor’s proof mechanism, completing as a volunteer, and reading back the account and profile.
    unverified-runtime-claim: yes

[3] severity: medium    loop/items/AI4DEV-59/plan.md:214
    claim: Step 2’s done-criterion that every fixture rule comes from a shipped module is impossible because the planned fixture itself decides link issuance, link validity, confirmation mutation, and provider auto-confirmation.
    why it matters: Those are the central GoTrue behaviors behind AT-001.09, so the executor must either violate the stated done-criterion or misreport a test-owned simulation as storage-only; the criterion must explicitly identify these vendor mirrors and bind each claimed behavior to live evidence.
    unverified-runtime-claim: no

[4] severity: medium    loop/items/AI4DEV-59/plan.md:72
    claim: The promised fail-closed handling of missing, non-string, and malformed `email_confirmed_at` values has no planned oracle because the tests exercise only `null` and a valid timestamp string.
    why it matters: An extractor that accepts `{ email_confirmed_at: 1 }` or another malformed response could pass every completion criterion and later authorize an unverified Discovery write; direct malformed-shape tests of `emailVerifiedFromUser` would settle the promise.
    unverified-runtime-claim: no

PLAN REVIEW: 4 FINDINGS