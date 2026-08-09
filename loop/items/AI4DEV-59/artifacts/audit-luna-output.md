Severity scale: high = false required-certification risk; medium = material evidence gap; low = record mismatch.

Verdicts: scope PASS; fixture mirrors PASS; counts PASS; verify-first ruling PASS; rate-limit record PASS; runtime claims COULD-NOT-VERIFY (not re-run); adopted-rulings FAIL; redaction FAIL.

[1] severity: low    loop/items/AI4DEV-59/plan.md:435  
    claim: Section 8 reports three “accept, fixed differently” rulings, but only A5 and A8 carry that disposition.  
    why it matters: The ruling record cannot reconcile all claimed dispositions; PHASE-STATE repeats the same false count.  
    unverified-runtime-claim: no

[2] severity: medium    loop/items/AI4DEV-59/proof-local.ts:345  
    claim: The confirmation check accepts any 4xx body containing “confirm” even when `error_code` is not `email_not_confirmed`.  
    why it matters: An unrelated response such as “MFA confirmation required” produces PASS and falsely certifies email-confirmation enforcement.  
    unverified-runtime-claim: no

[3] severity: medium    loop/items/AI4DEV-59/proof-local.ts:637  
    claim: The signup-session guard checks only `access_token` and `session`, ignoring `refresh_token` and raw token responses.  
    why it matters: A successful signup body containing only a refresh token is recorded as carrying no session, so check (a) can pass while signup issued credential material.  
    unverified-runtime-claim: no

[4] severity: medium    loop/items/AI4DEV-59/proof-local.ts:508  
    claim: The mail-catcher probe prints raw response text without passing it through `redact()`.  
    why it matters: A credential-bearing catcher response would bypass the promised redaction; the committed run is clean, but execution against that response or routing it through `redact()` would settle the exposure.  
    unverified-runtime-claim: yes

AUDIT: 4 FINDINGS