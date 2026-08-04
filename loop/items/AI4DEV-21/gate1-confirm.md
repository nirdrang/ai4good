1. **NOT-RESOLVED.** D1’s merge block is sound, but lines 57–66 acknowledge five deferred stand-ins and then promise only “four backlog items,” without mapping all five to durable owners. Option B also lacks a requirement to amend and re-review the plan before implementing the undesigned contracts. Correct the count/mapping and require another Gate 1 pass if Option B expands implementation.

2. **CONFIRMED-RESOLVED.** D8 opens a draft PR, queues no early merge, waits for Gate 2, audit, reflection, and a SHA-pinned ruling, and voids that ruling after any later push.

3. **CONFIRMED-RESOLVED.** D3 explicitly updates `conformance.selftest.ts`’s complete expected provenance list to include `vendors.email` in the same commit.

4. **CONFIRMED-RESOLVED.** D7 uses `{ passes: 1 }`, observes `ack_lost` and the unconfirmed state, then verifies the replay trace `['ack_lost','accepted']` and attempts ≥2.

5. **CONFIRMED-RESOLVED.** D6 item 8 tests both mixed arming orders with distinct identities, proving one cross-method FIFO.

6. **CONFIRMED-RESOLVED.** D4 removes the cap and states the finite termination argument; D6 item 9 verifies three rejections followed by acceptance under a default quiescent drain.

VERDICT: STILL REFUTED — Finding 1 remains open.