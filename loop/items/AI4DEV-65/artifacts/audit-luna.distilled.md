# Distilled audit — AI4DEV-65, reader one (luna)

Source: `loop/items/AI4DEV-65/artifacts/audit-luna.raw.txt`
Declared count line: `AUDIT: 2 FINDINGS`
Extracted findings: 2 (match)

## Findings

[1] severity: S3    supabase/migrations/20260811120000_acknowledgment_signer_identity.sql:83
    claim: The deployment-bridge comment says the previous GitHub parameters were backed by nullable columns, but the previous migration defines all `volunteer_profiles` fields as `NOT NULL`.
    why it matters: This misstates mixed-deployment behavior; the NGO bridge works because no volunteer row is written, while volunteer completion still requires both planes.
    unverified-runtime-claim: no

[2] severity: S3    tests/at/suites/req-001/_contract.ts:95
    claim: The acknowledgment row comment says only the shipped authority statement can appear, but the SQL function intentionally permits any nonblank statement for a `service_role` caller.
    why it matters: A direct service-role call can create a row with `"I am not authorized"` despite the comment claiming that state is impossible; a migration replay plus direct RPC would settle runtime persistence.
    unverified-runtime-claim: yes

## Checklist verdicts (all PASS, per reviewer)

R1 PASS, R2 PASS, R3 PASS, R4 PASS, R5 PASS, R6 PASS, R7 PASS, R8 PASS,
Declared scope PASS, F1 PASS, F2 PASS, F3 PASS, F4 PASS, F5 PASS, F6 PASS,
F7 PASS, F8 PASS, F9 PASS, F10 PASS.

Each verdict carries file:line evidence in the raw file — see raw output for citations.

## NOTES

None — count line matches extracted findings exactly (2 = 2). No test suite was executed, as required by the audit contract.
