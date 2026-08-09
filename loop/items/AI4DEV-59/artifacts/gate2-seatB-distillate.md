SOURCE   loop/items/AI4DEV-59/artifacts/gate2-flash-output.md
REVIEWER opencode-go/deepseek-v4-flash, variant max, agent reviewer-flash (gate 2, seat B)
COUNT    3 findings in source → 3 extracted
NOTES    Count line present and matches (CODE REVIEW: 3 FINDINGS). No truncation. Raw file also
         records verified-sound areas (fail-closed oracle coverage, fixture discipline, AT-001.10
         discriminating pair, AT-001.09 ordering, bookkeeping counts, refactor neutrality, selftest
         lane placement) and one non-finding observation (proof-local.ts is outside any typecheck
         program) — neither carried into the findings list below since they are not findings.

[1] severity: low (claimed-bound-but-unmeasured vendor mirror)   tests/at/suites/req-001/_fixture.ts:60-64
    claim: "Mirror 2 — 'a link that was never issued confirms nothing' — is labeled BOUND by the
    live proof, but none of proof checks (a)-(d) ever attempts a never-issued link, so nothing in
    the named evidence measures the negative."
    unverified-runtime-claim: no (the absence of any bogus-link attempt in proof-local.ts is
    statically checkable; whether GoTrue would refuse is the runtime part)
    raw: loop/items/AI4DEV-59/artifacts/gate2-flash-output.md, finding [1]

[2] severity: low (redaction is shape-dependent where the header claims absolutes)   loop/items/AI4DEV-59/proof-local.ts:122-126, 483-486, 102-120
    claim: "The header promises 'NO KEY IS WRITTEN INTO THIS FILE AND NONE IS PRINTED BY IT', but
    the followed redirect's `location` is printed after only fragment-stripping
    (`withoutFragment`), and `redact()` returns non-object values — including non-JSON response
    bodies — verbatim."
    unverified-runtime-claim: yes (depends on the never-measured redirect shape of the local GoTrue)
    raw: loop/items/AI4DEV-59/artifacts/gate2-flash-output.md, finding [2]

[3] severity: low (false statement in a rewritten header)   tests/at/suites/req-001/b-verification-and-sessions.test.ts:6
    claim: "The rewritten header says 'The other four are section C's', but AT-001.38
    (wrong-password rejection) sits in section B of the acceptance file (`at-req-001.md` line 23,
    under '## B. Email verification'); only .12/.13/.14 are section C's."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-59/artifacts/gate2-flash-output.md, finding [3]
