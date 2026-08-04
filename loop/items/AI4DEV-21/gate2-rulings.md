# AI4DEV-21 (fake Stripe, GitHub, Anthropic) — Gate 2 rulings

**Reviewers:** codex `gpt-5.6-terra` @ `max`, read-only, in-worktree (session
`019fcdaa-2555-7353-9309-2e3edd767448`, pins verified in the rollout's `turn_context`) —
verdict **CHANGES REQUIRED** (its findings 1 and 2 gate). Kimi `kimi-code/k3` @ `high`,
in-worktree — verdict **APPROVE** (two minors as follow-up hardening, three notes), with an
independent re-run of `at:selftest` (162/162) and the expect gate (exact match) in this
worktree. Kimi also attacked and **upheld** the Gate-1-round ruling that the adapter-facing
port types stay outside the type-invention guard's protected list (its finding 3, a NOTE:
no route from a test body to those types exists, and they are aliases besides).

**Convergence worth recording:** terra finding 1 (BLOCKER) and Kimi finding 1 (MINOR) are
the same defect found independently — the provider-side trace is filtered by event id only
and never reconciled with the intended recipient/channel pairs, so a fixture that sends to
the WRONG recipient at the seam while keeping honest delivery records passes every clause.
Both reviewers walked concrete cheating implementations. The severity disagreement does not
need adjudicating because the ruling is the same either way: fix it in the maintained oracle.

## Rulings — ALL findings accepted, one combined fix round

| # | source | ruling | fix |
|---|---|---|---|
| F-A | terra 1 (BLOCKER) + Kimi 1 (MINOR) | ACCEPTED | AT-016.11: (c) asserts the accepted email pairs EQUAL the expected set for the event (volunteer × email), not merely internal uniqueness; (a)/(b) assert every provider attempt for their events carries the intended pair (the volunteer actor, channel email) |
| F-B | terra 2 (MAJOR) | ACCEPTED | the taxonomy capture snapshots the provider trace per row; AT-016.05 reconciles it: every provider attempt has channel 'email', and per row the accepted pairs equal exactly the expected email pairs (empty for rows without email) — this is the maintained oracle for the "in-app never reaches the provider" invariant this diff introduced |
| F-C | terra 3 (MINOR) | ACCEPTED | `drainDeliveries` refuses a `passes` that is not a positive integer (throw naming the value); one selftest case pins the refusal through the real harness |
| F-D | terra 4 (MINOR) | ACCEPTED | conformance additions: an invalid arming leaves an already-armed queue intact (refusal is not a reset); mixed-order FIFO at counts of two (`rejectNext(2); acceptButLoseAck(2)` → `['rejected','rejected','ack_lost','ack_lost']`) |
| F-E | terra 5 (MINOR) | ACCEPTED | send identity becomes collision-proof (`JSON.stringify([eventId, recipientId, channel])`); conformance case with colliding raw strings (`'e:a'/'b'` vs `'e'/'a:b'`) both physically accepted |
| F-F | Kimi 2 (MINOR) | ACCEPTED | conformance case pinning the channel component of the identity: same event+recipient on two channels are independent — both physically accepted, both in `accepted()` |
| F-G | Kimi 4 (NOTE) | ACCEPTED | `expected/README.md`'s prose illustration of exact matching updates its example names to the real remaining capability, so the doc carries no counterfactual detail |
| F-H | Kimi 5 (NOTE) | ACCEPTED as documentation | `_contract.ts` gains one comment on `NotificationEvent.attempts`: it counts worker passes that attempted the event, not provider sends — the provider trace is the send-count oracle. No rename: the field is a suite-contract member and the assertions using it are honest |

**Not changed, and why:** Kimi finding 3 needed no change (the ruling it attacked was
upheld). Terra's "once AT-016.01's static scan is implemented" framing in finding 2 does not
alter F-B — the oracle belongs in this diff because the invariant does.

**Round accounting:** this is the one combined fix round for Gate 2 (both reviewers' findings
folded together). Confirmation goes to the RAISERS after the fix lands: terra resumed
(pinned) to confirm its two gating findings; Kimi resumed in this working directory to
confirm its two minors. Cap remains: at most one further fix→confirm cycle if a confirmation
surfaces a real residual.
