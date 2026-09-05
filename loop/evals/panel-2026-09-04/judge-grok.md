The fourth seat is for defects the three settled reviews did not raise. On that job, P is the better candidate. Q is a fuller restatement of those three reviews, with a long tail of nits and one design quote that this tree does not contain.

## 1. Scores

| Criterion | P | Q |
|---|---|---|
| 1. Marginal coverage | 2 | 1 |
| 2. Factual accuracy | 3 | 2 |
| 3. Freedom from noise | 4 | 2 |
| 4. Actionability | 4 | 5 |
| 5. Severity judgment | 3 | 4 |
| **Total** | **16** | **14** |

## 2. Criterion 1 — marginal findings

A finding already made by panel-1, panel-2, or panel-3 scores nothing here, even when restated well. Shared-client request drift, the `live` boolean as the whole above-loop gate, parked comments, the second CLI builder, the 1,268-line lifecycle file, the `CapabilityPending` cycle, the twenty-second poll with no inner deadline, transcript URLs rebuilt by hand, the Doctor mount check as prose, the `runner.ts` re-export, and the double clock cast are all already on the settled record.

**P — one real unique defect**

1. **`mailMessagesFor` parses the search body with a bare `JSON.parse`.** In `tests/at/harness/live-stack.ts:215`, a 200 response whose body is not JSON throws a raw `SyntaxError`. The same module’s `mailIdentification` wraps that parse in a named refusal (`tests/at/harness/live-stack.ts:187–193`). The drive calls `verifyLinksFor` without `mailIdentification` (`drive-ngo-signup.ts:117`), so a wrong service that answers 200 with HTML fails as an uncaught parse error rather than the module’s own refusal. None of the three settled reviews named this parse. Panel-2 covered the deadline sitting after a full round; panel-3 covered the drive skipping the identification probe and getting a 404 from Inbucket. Those are different faults.

P’s other unique notes are not counted as real unique defects: restoring a load-time closed enumeration argues against a cost the design already accepts, and the duplicated `BunSqlClient` type is hygiene.

**Q — no real unique defect**

Q’s unique residue is style and coupling, not a new failure:

- The lifetime-pin spawn test now lives in `local-stack.selftest.ts` rather than `runner.selftest.ts`. The test still runs.
- JWT redaction uses `{5,}` in `local-stack.ts:140` and `{8,}` in `live-stack.ts:19`. Q itself says to leave both unless one is wrong.
- `_live.ts` importing `CapabilityPending` from `registry.ts` also pulls `vitest`. That is a footnote on panel-2’s cycle finding, not a separate defect.
- The rewritten `contracts.ts:174` Proxy sentence is a stale comment, not a parked-file claim.

Q’s strongest findings (boolean gate, second CLI seam, drive requests, parked prose, cycle, transcript URLs, mount check) are already in the settled three.

## 3. Criterion 2 — inaccuracies

**P**

- **“Nothing checks the six names.”** `tests/at/suites/req-001/_live.ts:201` annotates `sut: { accounts: AccountsSut }`. Dropping a method is a compile error. P’s own evidence later admits the typing; the finding sentence does not.
- **Canned data on an unbacked method “stays green.”** `tests/at/expected/req-001.json:67–71` declares AT-001.02, AT-001.03, AT-001.04, and AT-001.10 as `capability-pending`. A successful canned method turns a declared red into a green, which `--expect` refuses. `tests/at/suites/req-001/_integration.ts:1278` (`at00110`) uses `refusesWith` and never calls `sendDiscoveryMessage`.
- **A bad catcher answer is an “undeclarable red” under `--expect`.** `tests/at/harness/expected.ts:45–48` shape-matches only ids that are already declared red. A `SyntaxError` on a green id is expected-green-got-red, not a declared-red shape miss. The live adapter also calls `mailIdentification` first (`_live.ts:207`), so this parse is on the drive path and on later search calls, not on adapter construction.

**Q**

- **`loop/items/AI4DEV-87/artifacts/design.md:27`.** That file is not in this tree. The quoted sentence (“A false `live: true` cannot produce a green: with no `_live.ts` there is no sut above loop, and the first call on it is a TypeError, which is red.”) appears nowhere else in the checkout. `notes/intended-design.md:19–27` says the opposite of that TypeError story: `openWorld` should refuse before `createHarness`, and `createHarness` above loop with no live adapter should throw rather than load the loop fixture.
- **“Every req-016 id goes green” if `index.ts:255` is flipped to `true`.** `tests/at/harness/index.ts:192` still installs `refusing<StaticScan>('H3 static provider scan')`. AT-016.01 stays red, with a different name than `tests/at/expected/req-016.json:28` declares. The other eleven ids would green; “every” is false.
- **“Both callers pass `ip`, so nothing reachable changes.”** `drive-ngo-signup.ts:142–154` calls `functionPost` with no `ip`. The old drive also omitted `x-forwarded-for` on that step, so behavior is unchanged, but the “both callers” claim is false.
- **“The live adapter can only load inside a vitest worker.”** `registry.ts:21` imports `expect` and `it` from `vitest`. That is a dependency, not a worker-only load rule. `local-stack.selftest.ts:16` already imports `_live.ts` under vitest.
- **“The intent says the three units are behavior-preserving.”** `notes/intended-design.md:57` says that only of the lifecycle extract. Unit 2 is “one shared module” and “keeps its eleven checks,” not identical drive requests.

## 4. Verdict

P should hold the fourth seat. The seat exists to catch what panel-1, panel-2, and panel-3 already missed. P is the only candidate that does that on a real defect: the shared mail reader’s bare `JSON.parse` of a 200 search body. The rest of P overlaps the settled three, and it overstates the six unbacked methods, but that overlap is cheap compared with Q. Q would be a better *sole* review — tighter locations, cleaner ranking, and a full pass over the same ground the three already covered — and that is the wrong job. Q’s unique material is nits, and its headline extra (the design’s TypeError safety net) cites a file and a sentence this checkout does not have.

## 5. If the fourth seat is removed

The three settled reviews would miss **`mailMessagesFor`’s bare `JSON.parse` of the Mailpit search body** (`tests/at/harness/live-stack.ts:215`): a 200 with a non-JSON body becomes a raw `SyntaxError` instead of the named refusal `mailIdentification` already uses. Everything else both candidates raised is already on the settled record, or is not a real problem.