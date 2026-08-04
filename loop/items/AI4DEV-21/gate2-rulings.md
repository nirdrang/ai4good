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
folded together).

---

## THE CONFIRMATION STEP IS DELETED (founder ruling, 2026-08-05)

Verbatim, relayed through the coordinator: **"I don't want confirmation drop it out now and
from the skill."** Effective immediately: no reviewer-confirmation phase exists. The item
agent rules each finding's disposition itself — closed by the fix, or rejected with a written
reason — on the basis of the fixes, the verification runs, and its own reading. The checks on
the fixes are the ones that already exist: the verify suite, luna's independent audit, and
the required CI check on the pinned head. The two recording conditions for dismissing a
maintained unearned-green claim stay in force (verbatim recording beside the ruling, visible
in the PR body; the ruling stating what the green does and does not claim).

Historical note, for honesty about what actually happened: two confirmation runs launched
before this ruling arrived completed on their own (`gate2-terra-confirm.md`,
`gate2-kimi-confirm.md`; both ended VERDICT: RESOLVED). They are retained as free evidence
and were read as such. They gate nothing; the dispositions below are the item agent's own.

## Dispositions (the item agent's own, per the founder's ruling)

Basis for every row: the fix diff read directly in the tree (not the executor's report), the
verify suite at the fix head (`verify-final-3.txt`: typecheck clean, 167/167 selftests,
expect gate exact at 11 green / 1 red, bijection 12/12), and the falsification transcripts.

| finding | disposition | evidence read in the tree |
|---|---|---|
| F-A (terra 1 + Kimi 1) | **CLOSED BY FIX** | `c-reliability-guard.test.ts:185-190,211-214` — every provider attempt for the access events must carry the volunteer on email; `:282-287` — accepted pairs judged by `pairProblems` EQUALITY against `expectedPairs(volunteer × email)`, the same multiset oracle as the delivery side. `proof-f3.txt`: the wrong-recipient retry passes the OLD oracle, fails the new one naming `actor-ngo:email: 1 unexpected deliveries` |
| F-B (terra 2) | **CLOSED BY FIX** | `d-taxonomy-evidence.test.ts:45-48,97-103` — per-row snapshot of BOTH provider traces; `:259-271` — both directions asserted for all 45 rows (no off-email attempt; accepted pairs exactly the expected email pairs, empty when the row has no email). `proof-f4.txt`: the inapp-through-provider cheat fails both halves, only that id moves |
| F-C (terra 3) | **CLOSED BY FIX** | `_fixture.ts` refuses a defined non-positive-integer `passes` naming the value; wall case proves the refusal with work pending and untouched |
| F-D (terra 4) | **CLOSED BY FIX** | wall cases: refusal preserves an armed queue; mixed-order FIFO at counts of two, both orders |
| F-E (terra 5) | **CLOSED BY FIX** | `vendors.ts` identity is `JSON.stringify([eventId, recipientId, channel])`; wall case drives the colliding raw strings, both physically accepted |
| F-F (Kimi 2) | **CLOSED BY FIX** | wall case: same event+recipient on a second channel is an independent send, both in `accepted()` |
| F-G (Kimi 4) | **CLOSED BY FIX** | README illustration names the real remaining capability |
| F-H (Kimi 5) | **CLOSED BY FIX** | `_contract.ts` comment on `NotificationEvent.attempts`: worker passes, not sends; the provider trace is the send-count oracle |

**No finding is rejected**, so no unearned-green claim stands dismissed and no residual needs
recording. Terra's Gate 2 verdict (CHANGES REQUIRED on findings 1 and 2) is answered by the
fixes themselves; nothing of either reviewer's critique is overruled.
