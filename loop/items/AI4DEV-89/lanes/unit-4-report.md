# Unit 4 report: one notification per committed event, and the anti-spam guard

Written as the work proceeds. This file is the record if the runner discards the final message.

## Plan

1. Read design, candidate D unit notes, unit 2 deviations, then the current product and test files.
2. Check the mid-flight precondition for AT-016.07 at the integration tier before building on it.
3. Land `applyPassResults` in the migration, move the worker into the core, and mint a new process epoch on restart.
4. Land the thread-comment guard in `notifications.ts` and the AT-016.08 integration procedure.
5. Flip AT-016.07 and AT-016.08 to green in the manifest. Leave AT-016.09 and AT-016.11 red.
6. Verify with the seven commands the brief names. Commit as soon as something is green.

## Reading

- Design: candidate D is the base. Unit 4 files are the worker in the core, `applyPassResults` in the migration, the guard in `notifications.ts`, `processRestart` on `_live.ts`, and the AT-016.08 procedure on `_integration.ts`.
- Unit 2 handed units 5 and 6 a capture limit: above loop, rejected provider attempts are invisible. Unit 4 does not assert provider outcomes, so that limit does not bind here.

## Mid-flight precondition (AT-016.07)

`w.fire()` at both tiers only calls `core.emit` → `outbox.append`. It does not drain. Live `append` is one `fixture_commit_transition_and_emit` call. Deliveries are inserted as `pending`. `payment.succeeded` is a money row with null channels, so it binds to email and in-app for the NGO and the volunteer: four pending rows, none `sent`.

A restart after `fire()` and before `drainDeliveries()` is therefore mid-flight. If `fire()` had drained, the id would be a red rather than a pass. Confirmed from the code; re-checked when the id runs.

Unit 1 already landed the worker in the core and `apply_delivery_results` in the first notification migration, because AT-016.01 drains a real send. This unit does not add a second copy. It makes the live epoch mutable, mints a new one on restart, moves the thread-comment decision into the core, and writes the AT-016.08 integration procedure.

## Work log

Started. Next: inspect current files and the two test bodies.
Read complete. Implementing the live restart, the core guard, and the AT-016.08 procedure.

## Files changed

| path | what changed |
|---|---|
| `supabase/functions/_shared/notifications.ts` | `threadCommentGuard` on the core, reading `ClockPort` |
| `tests/at/suites/req-016/_fixture.ts` | burst routes through the core guard |
| `tests/at/suites/req-016/_live.ts` | mutable process epoch; restart mints a new one; world name carries the guard pin; burst is real |
| `tests/at/suites/req-016/_integration.ts` | AT-016.08 procedure, two short windows, real waits |
| `tests/at/suites/req-016/b-delivery-defaults.test.ts` | `timeoutMs: { integration: 60_000 }` |
| `tests/at/expected/req-016.json` | AT-016.07 and AT-016.08 green at integration; AT-016.09 and AT-016.11 stay red |

No new table and no new write route. `apply_delivery_results` was already in the first notification migration.

## Deviations from the design

None intended. Two notes that are not deviations:

1. The worker and `applyPassResults` already lived in the core and the migration, from unit 1. This unit does not add a second copy.
2. The live restart mutates the epoch string, the way the loop fixture does with `epochSeq`. The core stores nothing, so minting a new identity is the restart. The same `ProcessPort` closure is what `drain` reads when it stamps.
