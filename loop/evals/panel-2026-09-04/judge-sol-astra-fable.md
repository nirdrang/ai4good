# Fourth-seat assessment: P against Q

Checkout: `.claude/worktrees/panel-judge` at the commit the reviews describe. I read `notes/intended-design.md`, the parts of `notes/changeset.patch` that carry the claims below (the drive, `index.ts`, `registry.ts`, `_live.ts`, `conformance.selftest.ts`, `runner.selftest.ts`, `local-stack.selftest.ts`, the parked README), the three settled reviews, and both candidates in full. I checked every claim against the live files, not only against the patch. I ran no build and no test.

## 1. Scores

| Criterion | P | Q |
|---|---|---|
| 1. Marginal coverage | 4 | 2 |
| 2. Factual accuracy | 4 | 5 |
| 3. Freedom from noise | 5 | 4 |
| 4. Actionability | 4 | 4 |
| 5. Severity judgment | 4 | 3 |
| **Total** | **21** | **18** |

## 2. Criterion 1: marginal findings

Method: for each candidate finding I asked whether panel-1, panel-2 or panel-3 states the same defect. If one does, the finding is worth nothing here, however well it is argued.

### P

**P.1 — the runtime import cycle between `index.ts` and `registry.ts`.** Real. Before this change `index.ts` imported only types from `registry.ts` (`import type { ConfigOverrides, Tier }`, patch line 1185), and `registry.ts` took `CapabilityPending` from the leaf `capabilities.ts` (patch line 3926). The change parks `capabilities.ts`, defines `CapabilityPending` inside `registry.ts` (`registry.ts:165`) and makes `index.ts:12` a value import of it. `registry.ts:209` does a top-level `await import('./index.ts')`. So the cycle is new and it is a runtime cycle. P also traces the transitive cost: `_live.ts:78` value-imports the same class, so `local-stack.selftest.ts:16`, which imports the pure `lifetimeProblem` from `_live.ts`, now evaluates `registry.ts` (vitest and the top-level harness import) to get one function. None of the three settled reviews mentions the cycle or this import. The design document's later note ("since rulings item 8 both live in the leaf `pending.ts`") shows the same fix P proposes was adopted afterwards.

**P.2 — parking `live-ledger.selftest.ts` also parked tests of behaviour that stayed live.** Real, in the half that is new. The parked file's blocks at `loop/parked/v1/tests/at/harness/live-ledger.selftest.ts:235` (three tests of `captureFailure`) and `:493` (seven tests of `chooseTierBody`, `tierBodyProblem`, `tierTimeout`) test functions that are still live and still on the real path (`registry.ts:468, 501, 756, 784, 906, 908, 934`). A grep of `tests/at` for those four names finds no caller outside `registry.ts`, so nothing in `at:selftest` exercises them now. The `captureFailure` test at `:243` guards a measured incident (a refusal wrapped into an undeclarable error on five ids), so its loss is a real gap. None of the three settled reviews raises it: panel-3's "no selftest was lost in the split" is about `runner.selftest.ts` only, and panel-3 finding 9 is about the deleted `conformance.selftest.ts` blocks. The Mailpit half of P.2 (`:288`, `mailIdentification` untested) is already in panel-1 finding 5, so that half earns nothing.

P.3 (stale prose) is made by panel-1 finding 1, panel-2 finding 3 and panel-3 finding 4. Worth nothing here.

Count: two marginal findings, one of them the most consequential defect neither panel saw.

### Q

**Q.4 — the same runtime cycle as P.1.** Real, for the reasons above. Q states the loader mechanics precisely (`_bind.ts` loads `registry.ts`; `registry.ts` awaits `index.ts`; `index.ts` imports back from the still-evaluating `registry.ts`; verified at `tests/at/suites/req-001/_bind.ts:13` and `registry.ts:209`). None of the three settled reviews raises it.

**Q.5, one clause — `local-stack.selftest.ts:16` imports `lifetimeProblem` from a suite adapter.** True and not raised by the three, but small: the same import existed in the old `runner.selftest.ts` (patch line 4083) and moved with the tests. It is a layering smell the change carried, not one it made. Half credit at most.

Q.1 is panel-1 finding 3, panel-2 finding 1 and panel-3's preamble. Q.2 is panel-1 finding 4 ("checks the deadline only after a full `mailMessagesFor` round"); Q adds the ten-second-per-request arithmetic but not a new defect. Q.3 is panel-2 finding 2 and panel-3 finding 9; the "six refusal methods untested" clause is panel-1 finding 2. Q.5's main point is panel-2 finding 5 and panel-3 finding 10. Q.6 is the same prose list as P.3.

Count: one marginal finding and one minor clause.

## 3. Criterion 2: inaccuracies

### P

- P.1 cites `_live.ts:77`. The import is at `tests/at/suites/req-001/_live.ts:78`. One line off.
- P.1 says the top-level awaited import is "at line 208". `registry.ts:208` is the `try {`; the import is at `:209`. One line off.
- Every other claim checks: the parked line numbers `235`, `288`, `493` are exact; the counts (three, seven) are exact; the live call sites of the four functions are as stated; `req-016/_fixture.ts:15` is the start of the header P quotes.

### Q

- Q.5 says the self-test "crossing back from generic harness infrastructure into a suite implementation" is part of what the extraction produced. The import is real (`local-stack.selftest.ts:16`) but it pre-dates the change (`runner.selftest.ts` had the identical line, patch line 4083). The sentence does not state that the extraction created it, so this is a framing that misleads rather than a false claim.
- Every line cite checks: `live-stack.ts:115` (`authPost`), `:206` (`mailMessagesFor`), `:261` (the deadline check), `index.ts:12` and `:236`, `registry.ts:682`, `conformance.selftest.ts:139`, the drive at `:101, :109, :133`, `SKILL.md:80-83`, the seven prose sites, and the count of 36 exported declarations in `local-stack.ts` (26 functions, 10 interfaces). The claim that CI runs typecheck, self-tests and loop-tier acceptance only is true of `.github/workflows/ci.yml:134, 139, 187`.

## 4. Verdict

P should hold the fourth seat. The seat exists to catch what the other three miss, and P catches two things they miss: the runtime import cycle that this change created by turning a type-only import into a value import, and ten regression tests of live behaviour that left the tree inside a file parked for a different reason. Q catches the first of those too, and states its mechanics slightly more precisely, but Q spends four of its six findings restating what panel-1, panel-2 and panel-3 already delivered, and it ranks its one new finding fourth behind a drive-protocol change that every settled review had already covered. Q's line cites are the more exact of the two; P's two one-line offsets are the only inaccuracies I found in it, and neither changes what a maintainer would do. On what each adds, P adds more, ranks it correctly, and carries no noise.

## 5. Without the fourth seat

The runtime import cycle between `tests/at/harness/index.ts` and `tests/at/harness/registry.ts` goes uncaught. It is new in this change (`index.ts` used to import only types from `registry.ts`), it makes harness initialisation depend on how the loader resolves a top-level `await import()` of a module that is mid-evaluation, and it makes any import of `_live.ts` evaluate vitest and the whole harness. A second, smaller gap also goes uncaught: the three `captureFailure` tests and the seven per-tier body tests now run nowhere.

P=21 Q=18
P
Q.5 (extraction crossed into a suite) — the `lifetimeProblem` import at `local-stack.selftest.ts:16` was already in `runner.selftest.ts` before the change (patch line 4083), so the extraction moved that boundary crossing rather than creating it.
