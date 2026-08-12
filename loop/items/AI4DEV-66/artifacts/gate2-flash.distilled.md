SOURCE   loop/items/AI4DEV-66/artifacts/gate2-flash.raw.txt
REVIEWER opencode-go/deepseek-v4-flash --variant max, agent reviewer-flash (gate2, slice 1)
COUNT    2 findings in source → 2 extracted
NOTES    Reviewer's declared count line ("CODE REVIEW: 2 FINDINGS") matches the number of
         numbered findings extracted. No truncation. The raw file also carries a "What I cleared
         by reading" paragraph and an "Observations" paragraph the reviewer explicitly says are
         not rated as findings — not extracted here, kept verbatim in the raw file at lines 9 and
         21 for the orchestrator to read if wanted.

[1] severity: low   tests/at/suites/req-001/d-tenant-isolation.test.ts:94,103 and tests/at/suites/req-001/_integration.ts:1273,1282,1393
    claim: "expect(a).toMatchObject({ok:true}); if (!a.ok || a.organizationId === null) return;" — a completion that answers `ok:true` with `organizationId === null` passes the expect, trips the `return`, and the whole criterion goes green with every arm skipped.
    unverified-runtime-claim: no (structural).
    raw: loop/items/AI4DEV-66/artifacts/gate2-flash.raw.txt:11-14

[2] severity: low   tests/at/suites/req-001/_fixture.ts:1485-1531 (dataApiRead), tests/at/expected/req-001.json:65-66
    claim: the loop-tier green over the Data API arms grades the fixture's hand-written mirror of the policy set, not shipped code — so item claim 1's "a green grades shipped code rather than a copy of it" holds for the edge-surface arms and not for the probe arms; a divergence between the mirror and the migration keeps every run this change can make green.
    unverified-runtime-claim: no (this is about what the evidence can claim, not about runtime).
    raw: loop/items/AI4DEV-66/artifacts/gate2-flash.raw.txt:16-19
