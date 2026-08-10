SOURCE   loop/items/AI4DEV-60/artifacts/gate2-flash.md
REVIEWER flash (code review, gate 2)
COUNT    3 findings in source → 3 extracted
NOTES    none

[1] severity: low (untrue stated fact; zero functional impact)   supabase/functions/_shared/edge.ts:112-115
    claim: "The re-export comment asserts \"both say `import type { Caller } from '../_shared/edge.ts'`
    and both keep working\" — neither deployed function imports the `Caller` type at all."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-60/artifacts/gate2-flash.md lines 9-21 (finding [1])

[2] severity: low (equivalence claim possibly incomplete; needs the old file to settle)   supabase/functions/_shared/edge.ts:178-183 (and plan.md D-B, lines 88-94)
    claim: "The accepted \"ONE EDGE CHANGES\" description covers a 2xx with an unparseable body, but a
    2xx whose body is parseable JSON `null` is a distinct input the claim does not name, and the
    pre-refactor code's handling of it is not determinable from this tree."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-60/artifacts/gate2-flash.md lines 23-38 (finding [2])

[3] severity: low (guard weaker than the plan and than its own comment)   tests/at/suites/req-001/b-verification-and-sessions.test.ts:287-291
    claim: "Plan D-E's AT-001.38 control — \"sign-in with the correct password succeeds, and
    `sessionsOf` grows by one\" — is not implemented: the body asserts only
    `sessionsAfterGoodSignIn.length > 0`."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-60/artifacts/gate2-flash.md lines 40-55 (finding [3])
