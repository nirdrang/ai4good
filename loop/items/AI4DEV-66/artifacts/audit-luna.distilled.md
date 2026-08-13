SOURCE   loop/items/AI4DEV-66/artifacts/audit-luna.raw.txt
REVIEWER gpt-5.6-luna (codex, effort max, --sandbox read-only)
COUNT    6 findings in source → 6 extracted
NOTES    Count line at end of file reads "AUDIT: 6 FINDINGS" (with a duplicate bare "6 FINDINGS" line immediately after it) — matches the 6 findings extracted. No truncation observed.

[1] severity: S1 (adopted ordering failure)   supabase/functions/public-project-page/index.ts:73
    claim: "The public handler reads the project target, then reads its organization, so the target is not the handler's last read as R1-4 requires."
    why it matters: "An organization-read fault is reachable only after an existing project, producing 502 while an absent project returns 404; this third handler is also absent from the fault loop."
    unverified-runtime-claim: yes — "inject the organization-read fault for existing and absent projects."
    raw: loop/items/AI4DEV-66/artifacts/audit-luna.raw.txt:5-8

[2] severity: S2 (false-green test gap)   tests/at/suites/req-001/d-tenant-isolation.test.ts:700
    claim: "AT-001.40's non-administrator controls only require non-null rows and absence of tenant A's identifiers, so empty successful results pass."
    why it matters: "With privileges present but member policies denying every row, the administrator checks can pass while all four non-admin controls pass empty, proving no administrator-specific attribution."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-66/artifacts/audit-luna.raw.txt:10-13

[3] severity: S3 (false code fact)   supabase/functions/_shared/route-visibility.ts:31
    claim: "The comment says nothing imports this module, but the route selftest and route scan import it at `shipped-route-visibility.selftest.ts:33` and `_route-scan.ts:30`."
    why it matters: "Maintainers may treat the registry as unused and miss its current consumers."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-66/artifacts/audit-luna.raw.txt:15-18

[4] severity: S3 (false code fact)   supabase/functions/_shared/visibility.ts:206
    claim: "The comment says no call site can reach the unknown-scope branch, but the selftest deliberately reaches it through its casted call at `shipped-visibility.selftest.ts:47`."
    why it matters: "The comment misclassifies the fail-closed branch as unreachable and could encourage its removal."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-66/artifacts/audit-luna.raw.txt:20-23

[5] severity: S3 (false code fact)   tests/at/suites/req-001/_contract.ts:868
    claim: "The comment says every `dataApiRead` caller passes a `Session`, but AT-001.24 calls it with `null` at `d-tenant-isolation.test.ts:810`."
    why it matters: "It hides the newly exercised anonymous path and can lead future changes to assume a non-null session."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-66/artifacts/audit-luna.raw.txt:25-28

[6] severity: S2 (conformance blind spot)   tests/at/suites/req-001/_live.ts:1026
    claim: "The catalog witness filters `pg_class` to `relkind = 'r'`, omitting partitioned tables such as relations with `relkind = 'p'`."
    why it matters: "A public partitioned tenant table can be omitted before `catalogProblemsAgainst` checks declaration or isolation, allowing the conformance arm to miss it."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-66/artifacts/audit-luna.raw.txt:30-33

CHECKLIST (as the raw file recorded it, reproduced for reference — not a finding list; the orchestrator rules on how these relate to findings [1] and [3] above):
- S1 — PASS
- R1-1 — PASS; R1-2 — PASS (no code footprint); R1-3 — PASS (no code footprint)
- R1-4 — FAIL, ties to finding [1]
- R1-5 — PASS; R1-6 — PASS; R1-7 — PASS; R1-8 — PASS; R1-9 — PASS; R1-10 — PASS; R1-11 — PASS; R1-A — PASS
- GS1-1 — PASS; GS1-2 — PASS; GS1-3 — PASS; GS1-4 — PASS; GS1-5 — PASS; GS1-7 — PASS; GS1-8 — PASS
- GS2-1 — PASS; GS2-2 — PASS; GS2-3 — PASS; GS2-4 — PASS
- GS2-5 — "PASS for the stated coverage ... finding [2] covers the weak non-admin controls"
- GS2-6 — PASS; GS2-7 — PASS; GS2-8 — PASS; GS2-9 — PASS
- F1 — PASS; F2 — PASS; F3 — PASS; F4 — PASS; F5 — PASS; F6 — PASS; F7 — PASS; F8 — PASS
- F9 — FAIL, ties to finding [3]
- F10 — PASS; F11 — PASS; F12 — PASS
