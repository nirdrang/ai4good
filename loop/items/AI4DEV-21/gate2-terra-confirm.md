1. CONFIRMED-RESOLVED — `c-reliability-guard.test.ts` now rejects any access-key retry attempt not addressed to the volunteer over email, and compares provider-accepted recipient/channel pairs exactly to the expected volunteer-email pair.

2. CONFIRMED-RESOLVED — `d-taxonomy-evidence.test.ts` captures provider attempts and accepted sends per taxonomy event, then reconciles every taxonomy row: no non-email provider attempt and exact expected email accepted pairs (or none).

3. CONFIRMED-RESOLVED — `_fixture.ts` rejects non-positive and non-integer `passes` before delivery processing; `vendors.selftest.ts` proves rejected calls leave the queue intact.

4. CONFIRMED-RESOLVED — `vendors.selftest.ts` covers invalid-arm queue preservation and mixed `rejectNext(2)` / `acceptButLoseAck(2)` FIFO behavior.

5. CONFIRMED-RESOLVED — `vendors.ts` uses `JSON.stringify([eventId, recipientId, channel])` for send identity, with collision and channel-distinction self-tests.

The supplied F3 and F4 mutation transcripts demonstrate the strengthened assertions fail under the intended regressions. The fix range also passes `git diff --check`.

VERDICT: RESOLVED (merge may proceed to audit)