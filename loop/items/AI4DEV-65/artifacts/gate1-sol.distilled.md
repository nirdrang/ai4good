SOURCE   loop/items/AI4DEV-65/artifacts/gate1-sol.raw.txt
REVIEWER sol (gate1, PLAN review)
COUNT    7 → 7
NOTES    none

[1] severity: critical   loop/items/AI4DEV-65/plan.md:67
    claim: "The proposed `default null` parameters do not provide a viable rolling-deployment bridge."
    unverified-runtime-claim: yes
    raw: gate1-sol.raw.txt lines 3-6

[2] severity: high   loop/items/AI4DEV-65/plan.md:116
    claim: "AT-001.20 directly imports an otherwise unused constant, so it cannot prove the ratified “When displayed” behavior."
    unverified-runtime-claim: no
    raw: gate1-sol.raw.txt lines 8-11

[3] severity: high   loop/items/AI4DEV-65/plan.md:124
    claim: "Validation checks only that `authorityAttestation` is nonblank and never establishes that it affirms the server-owned authority statement."
    unverified-runtime-claim: no
    raw: gate1-sol.raw.txt lines 13-16

[4] severity: high   loop/items/AI4DEV-65/plan.md:84
    claim: "The migration has no executable upgrade path for an acknowledgment table containing existing rows."
    unverified-runtime-claim: yes
    raw: gate1-sol.raw.txt lines 18-21

[5] severity: medium   loop/items/AI4DEV-65/plan.md:129
    claim: "The migration’s done-criterion omits the PostgREST schema-cache reload required after recreating `complete_signup`."
    unverified-runtime-claim: yes
    raw: gate1-sol.raw.txt lines 23-26

[6] severity: medium   loop/items/AI4DEV-65/plan.md:107
    claim: "AT-001.39 claims to prove absence of every write but checks only the account, acknowledgment rows, and acknowledgment predicate."
    unverified-runtime-claim: no
    raw: gate1-sol.raw.txt lines 28-31

[7] severity: medium   loop/items/AI4DEV-65/plan.md:25
    claim: "The proposed `length(btrim(...)) > 0` constraints do not reject all whitespace-only signer fields."
    unverified-runtime-claim: no
    raw: gate1-sol.raw.txt lines 33-36
