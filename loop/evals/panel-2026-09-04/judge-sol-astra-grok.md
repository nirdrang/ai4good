I have enough to score the two candidates against the settled reviews and the code.

## Scores

| Criterion | P | Q |
|---|---|---|
| 1. Marginal coverage | 4 | 2 |
| 2. Factual accuracy | 5 | 4 |
| 3. Freedom from noise | 4 | 2 |
| 4. Actionability | 4 | 4 |
| 5. Severity judgment | 4 | 3 |
| **Total** | **21** | **15** |

## 1. Marginal coverage

**P — two real findings the settled reviews do not raise**

1. **Runtime cycle after moving `CapabilityPending`.** `index.ts:12` now imports the pending-error class from `registry.ts`. `registry.ts:209` already does a top-level `await import('./index.ts')`. `_live.ts:78` imports the same class only to throw. The intended design already required a leaf pending module for this reason. None of the three settled reviews named this cycle. Panel 3 even checked the runner / lifecycle pair and reported no cycle, and it missed this one.

2. **Parking the ledger selftest also parks tests of code that is still live.** `loop/parked/v1/tests/at/harness/live-ledger.selftest.ts` still holds three tests of `captureFailure` (`registry.ts:468`) and seven tests of `chooseTierBody` / `tierBodyProblem` / `tierTimeout` (`registry.ts:95`, `:756`, `:784`). Those functions still run on every registration and every shared evidence capture. No remaining file under `tests/at/**/*selftest.ts` calls them. That is a coverage hole, not a ledger leftover. The Mailpit identification cases in the same parked file overlap panel 1’s note that `live-stack.selftest.ts` never calls `mailIdentification`; the `captureFailure` and per-tier body tests do not.

P’s third finding (live comments still describe the parked ledger) is already in all three settled reviews. It adds nothing.

**Q — one real finding the settled reviews do not raise**

1. **The same `CapabilityPending` cycle** (`index.ts:12` × `registry.ts:208`). Same defect as P. Same suggested fix.

Q’s other five findings are already in the settled set:

- Drive HTTP / Mailpit contract change: panel 1 finding 3, panel 2 finding 1.
- Mail poll deadline checked only after `mailMessagesFor`: panel 1 finding 4.
- Above-loop gate tested only as a pure predicate: panel 2 finding 2, panel 3 finding 9.
- `local-stack.ts` as a 1,268-line mixed module: panel 2 finding 5, panel 3 finding 10.
- Live prose that still names parked files: all three panels.

## 2. Factual accuracy

**P — no claim contradicts the code.** Line pointers are one line off in two places (`_live.ts:77` is the import at `:78`; the dynamic import is `registry.ts:209`, not `:168`), but the named modules, the cycle, the parked tests, and the live functions those tests covered all match.

**Q**

- **“The 20 second mail poll has no global time bound”** is false as stated. `tests/at/harness/live-stack.ts:257` sets `const deadline = Date.now() + 20_000`. The real defect is that `:261` checks that deadline only after `mailMessagesFor` returns. Panel 1 already described that correctly. The ten-second `AbortSignal.timeout` on each fetch (`live-stack.ts:45`) can make one round last minutes; that evidence is true, the headline is not.
- **`local-stack.selftest.ts:16` importing `lifetimeProblem` from `_live.ts`** is a real import. Treating it as a failure of the lifecycle move is not. The design keeps `lifetimeProblem` in `_live.ts` and moves that selftest with the lifecycle module.

## 3–5 (brief)

P has one duplicate (stale comments). Its two unique findings name files, lines, and a fix a maintainer can apply: a leaf pending module, and restore the parked tests next to the live functions. It leads with the cycle, then the coverage hole, then comments.

Q repeats five settled findings, then adds the cycle in fourth place, then a style split of a module the design asked to move unchanged. Locations and fixes are clear. Severity order of the *known* items is reasonable (drive wire, hang, untested gate, then structure and comments), but every item is a warning, and the only new item is buried.

## Verdict

P should hold the fourth seat. The seat exists to catch what the other three miss. P adds two such defects: the `index.ts` / `registry.ts` cycle created by parking the pending-error class in the registry, and the parked selftests of `captureFailure` and per-tier body selection that still run in live code. Both match the tree, and both come with a concrete fix. Q also finds the cycle, then spends the rest of the review restating the drive contract change, the mail deadline, the untested boolean gate, the large lifecycle file, and the stale comments. Those are real, and the settled reviews already have them. A fourth reviewer who mostly repeats the first three does not earn the seat.

## If the fourth seat were removed

The runtime import cycle between `tests/at/harness/index.ts` and `tests/at/harness/registry.ts` created by moving `CapabilityPending` into the registry, plus the parked selftests of `captureFailure` and per-tier body selection, would go uncaught.

P=21 Q=15
P
P1 — Moving CapabilityPending into registry.ts closes a runtime import cycle with the harness; the design required a dependency-free pending module.