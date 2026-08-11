SOURCE   loop/items/AI4DEV-81/artifacts/gate2-slice1-terra.output.txt
REVIEWER gpt-5.6-terra (codex, effort max, sandbox read-only) — role terra, reader one, gate2 slice1
COUNT    6 findings in source → 6 extracted
NOTES    none — count line `CODE REVIEW: 6 FINDINGS` matches extracted count

[1] severity: critical   tests/at/harness/attestation.ts:67
    claim: "`writeAttestation` deletes and writes the attestation table for any supplied database URL without applying the slot identity, port, or project-ID safety checks."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-81/artifacts/gate2-slice1-terra.output.txt lines 3-6

[2] severity: high   tests/at/harness/clock.ts:30
    claim: "`createAttestedRealClock` trusts the structural `LiveAttestation` type instead of validating a branded slot attestation; `createLiveEmail` has the same flaw at `live-email.ts:82`."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-81/artifacts/gate2-slice1-terra.output.txt lines 8-11

[3] severity: high   tests/at/harness/capabilities.ts:473
    claim: "`liveSutCapability` admits any `sut.*` capability name and accepts inherited methods through `surface[method]`, rather than using a closed, own-method enumeration."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-81/artifacts/gate2-slice1-terra.output.txt lines 13-16

[4] severity: high   tests/at/harness/capabilities.ts:621
    claim: "The pending-method proxy's `has` trap returns false for an omitted unbacked method, rather than making the method observably pending."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-81/artifacts/gate2-slice1-terra.output.txt lines 18-21

[5] severity: high   tests/at/harness/registry.ts:702
    claim: "A bare test body or `default` body is typed as a loop-tier body but is also executed at integration tier."
    unverified-runtime-claim: yes
    raw: loop/items/AI4DEV-81/artifacts/gate2-slice1-terra.output.txt lines 23-26

[6] severity: high   tests/at/harness/runner.ts:711
    claim: "The runner forwards an unvalidated Mailpit URL from stack status, and the live-email probe grants identity after any HTTP 200 response."
    unverified-runtime-claim: no
    raw: loop/items/AI4DEV-81/artifacts/gate2-slice1-terra.output.txt lines 28-31
