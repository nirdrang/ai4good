## 1. Scores

| Criterion | P | Q |
|---|---:|---:|
| Marginal coverage | 2 | 0 |
| Factual accuracy | 4 | 2 |
| Freedom from noise | 4 | 2 |
| Actionability | 4 | 4 |
| Severity judgment | 2 | 4 |
| **Total** | **16/25** | **12/25** |

## 2. Marginal coverage

### P — one marginal finding

- **Malformed successful Mailpit responses lose diagnostic context.** [`mailMessagesFor`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/harness/live-stack.ts:215) directly parses a 200 response. Non-JSON produces a bare `SyntaxError`, and JSON `null` produces a `TypeError`, without identifying the endpoint or recipient. This is real, although inherited from the old reader, because it now sits on the shared adapter/drive boundary. None of panel-1, panel-2, or panel-3 identified this malformed-response path; panel-1’s timeout finding is different.

### Q — no marginal findings

Q’s substantive findings were already covered:

- Boolean-gate weakness and missing mechanism test: panel-1 finding 3, panel-2 finding 2, panel-3 findings 2 and 9.
- Second CLI seam/parser: panel-2 finding 4.
- Oversized lifecycle module: all three settled reviews.
- Changed drive requests: panel-1 finding 1 and panel-2 finding 1.
- Stale prose: all three settled reviews.
- Re-export, double cast, transcript URLs, mount check, and dependency cycle: panel-3 findings 8, 11, 12, 13 and panel-1 finding 4.

Its remaining additions—test-file placement and duplicated type declarations—are organizational/style observations, not distinct substantive defects.

## 3. Factual inaccuracies

### P

- P overstates that “nothing checks the six names.” The live object is explicitly assigned to `AccountsSut` at [`_live.ts:227`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/suites/req-001/_live.ts:227), whose required surface begins at [`_contract.ts:329`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/suites/req-001/_contract.ts:329). Omission or misspelling is therefore a compile-time error. What remains unchecked is whether those methods throw the exact intended payload or genuinely use live backing.
- P says malformed search JSON makes `--expect` report a red “shape mismatch.” Mail-using integration IDs are declared green, so [`expected.ts:323`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/harness/expected.ts:323) reports “declared green, reported red.” “Red of a different shape” applies only to IDs already declared red at [`expected.ts:344`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/harness/expected.ts:344).

### Q

- Q cites a nonexistent `loop/items/AI4DEV-87/artifacts/design.md` and attributes a sentence to it that appears nowhere in the checkout. The actual design says the opposite: refusal should happen before `createHarness`, and `createHarness` should not load the fixture above loop ([`notes/intended-design.md:27`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/notes/intended-design.md:27)).
- Q claims flipping `live` would make **every** requirement 016 ID green. AT-016.01 would still hit the refusing static proxy created at [`index.ts:192`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/harness/index.ts:192) through [`a-emitter-and-taxonomy.test.ts:28`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/suites/req-016/a-emitter-and-taxonomy.test.ts:28). Other bodies call `freezeAt` on the `RealClock` installed at [`index.ts:252`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/harness/index.ts:252), for example [`b-delivery-defaults.test.ts:137`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/suites/req-016/b-delivery-defaults.test.ts:137). Some false greens are possible, but not twelve.
- Its “every code line moved verbatim except imports” claim misses at least the changed return at [`local-stack.ts:1222`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/harness/local-stack.ts:1222); the old line returned `nonce` too ([`changeset.patch:5905`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/notes/changeset.patch:5905)).
- The six `_live.ts` throws do not account for all five capability-pending manifest entries. AT-001.05 is thrown explicitly at [`_integration.ts:1268`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/suites/req-001/_integration.ts:1268), and AT-001.10 is independently thrown at [`_integration.ts:1278`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/suites/req-001/_integration.ts:1278), bypassing the corresponding live-adapter stub.
- Q says `runner.ts` imports six values from `local-stack.ts`; it imports ten at [`runner.ts:35`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/harness/runner.ts:35). It also says `local-stack.selftest.ts` imports twenty names; the import beginning at [`local-stack.selftest.ts:19`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/harness/local-stack.selftest.ts:19) contains twenty-one.
- Q says the pass-through re-export serves two selftests. There are three; [`runner-blackbox.selftest.ts:35`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/harness/runner-blackbox.selftest.ts:35) is the omitted caller.
- Q says the registry/index cycle works because the dynamic import runs after the registry has evaluated. The import is top-level-awaited while registry evaluation is still in progress at [`registry.ts:208`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/harness/registry.ts:208). The relevant error-class binding has already been initialized, but the module has not finished evaluating when [`index.ts:12`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/harness/index.ts:12) imports it.

## 4. Verdict

P should hold the fourth seat. It contributes one genuine failure mode absent from the settled panel and is otherwise mostly accurate and focused. Q is more detailed and ranks its concerns better, but nearly all of its useful content duplicates the three settled reviews, while its leading finding relies on a nonexistent citation, an invented design statement, and an incorrect claim that all twelve requirement 016 IDs would become green.

## 5. If the fourth seat were removed

The unguarded Mailpit search parse at [`live-stack.ts:215`](/C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/panel-judge/tests/at/harness/live-stack.ts:215) would go uncaught: a successful but malformed response surfaces as a context-free JavaScript parse/type error instead of identifying the failing mail endpoint and response contract.