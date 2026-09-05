Now I have everything. One more sanity check: the task says "The designers were each pushed in one of four structural directions, so some candidates share a direction." We don't need to infer who. Also need to ensure final answer follows exact shape: table, per-candidate evidence, ranking, graft list, judgment, then exactly three lines with totals, ranking, and one word.

Let me think through the final scores one more time carefully, because I want the ranking and question 5 defensible.

Consider whether H's large selftest story should earn criterion 5 = 3 or 2. H provides a table with ranges, and its "files touched" is clear. It gives exact pool moves 2495. It also says "16 added/modified files plus two moves." That's honest. It doesn't give exact live line counts per file (ranges). The rubric says "files touched and lines counted." Ranges are a weaker answer than A's exact 34/15493 and per-file exact numbers. But not a contradiction.

Could A beat F for second? A's exact counts and robust safety vs F's one-call surface. The rubric criterion 3 explicitly says at most two functions; F wins. So F second.

Could A be 16 (criterion 5 = 2 because not smallest) making ranking H > F > E > A ...? Let's reconsider "smallest honest diff" as a qualitative evaluation. A's live diff 519/116 is about double E's 246/99 and F's 286/154, largely because A adds a 185-line module plus 95 selftests plus 14 live-ledger tests plus moving db-slots.ps1. Is that "smallest"? Not really. But A's honesty is perfect. "Smallest honest diff" could mean both smallest and honest; A is honest but not smallest. Criterion 5 might be 2 for A on that ground. Hmm, but then H's 538-712 would also be 2 (largest). E would be 3. F 3. G/D/C 2. This would change totals:
A 16, F 17, H 17, E 16, D 16, C 16, G 15, B 10-11.
Then H/F tie for top; question 5 "close" anyway. But is a design that adds a robust selftest story penalized for "smallest"? The criterion asks for "smallest honest diff, with its selftest story". It probably means the diff size should be minimal but honest, not that it must literally be the smallest possible. A's extra lifetime check is arguably needed; H's selftests are thorough. I think penalizing A/H for thorough tests is not fair; "smallest honest" guards against padded designs. A's diff is padded relative to E? It adds runningTokenLifetime which is not required. That is arguably scope creep. But it's an optional diagnostic clearly labeled tradeoff. Hmm.

Let me instead treat criterion 5 as 3 for all candidates with accurate/honest counts (A, E, F, H) and 2 for wrong counts (C, D, G), 1 for B. This is simpler and defensible: "smallest honest diff" includes honesty; accurate counts signal honesty.

Actually A's exact harness count "34 files and 15,493 lines" exactly matches checkout, strong evidence of honesty. E's counts exact. F/H accurate moves. Fine.

Final scores:
A: 3,3,2,3,3,3 = 17
B: 3,1,1,1,1,3 = 10
C: 3,3,2,3,2,3 = 16
D: 3,3,2,3,2,3 = 16
E: 3,3,1,3,3,3 = 16
F: 3,3,3,3,3,3 = 18? Wait, earlier I gave F criterion 5=3, criterion 3=3, so F total = 3+3+3+3+3+3 = 18! I made an arithmetic error earlier for F: if criterion 5=3, F=18, tying H. I previously said F=17 with criterion 5=2. Let me choose final F criterion 5.

F's diff includes settings/guidance files and label changes; its totals 286/154; honest and correct. I think F deserves 3 as well. Then H and F tie at 18. That changes ranking and question 5: top two identical; "close" obviously.

But I should differentiate F's hard-coded `ONE_STACK` constants as a maintainability risk in criterion 2? If F criterion 2 = 2, F=17, H=18, gap 1, still close. Let me decide.

F: "The design must decide explicitly: ... Where the one-stack identity read lives... It must prove project id positively from CLI's own output, keep localStackProblems, keep wall, produce ProvenSlotRead." F does all. Hard-coding ONE_STACK is an authorization allowlist with config equality check. It does NOT introduce a second source of coordinates because the config must equal it. The design task itself is for the one fixed stack; hard-coding is arguably a strong positive statement. Criterion 2 = 3.

F's criterion 3 = 3, criterion 4 = 3, criterion 5 = 3 (accurate, honest, adequate selftest story, correct park), criterion 1=3, criterion 6=3 => F=18 tie with H. Then ranking H > F? Need tie-break. Tie-break: "design a future maintainer can extend without breaking the proof idiom." H avoids F's hard-coded constants and reads config as authority, and H's selftest story is more complete (mocked prep sequence, interruption, lock ownership). So H first, F second under tie-break.

Alternatively A=17, E=16, D=16, C=16, G=15, B=10.

Do I want F=18? It feels high for a design with a hard-coded allowlist and thinner selftest coverage. But rubric scores only six criteria; F is strong. Hmm.

Let me re-read F's criterion 5 honestly: Its table says "local-stack.ts, runner.ts | New lifecycle façade; primitive classifiers; targeted-only reset; runner branch and prose | ~175 | ~65". Then "runner.selftest.ts, live-ledger.selftest.ts | ... | ~60 | ~15", "atconfig.ts, _fixture, _integration, session test | ~20 | ~35", "index.ts, attestation.ts | ... ~8/~8", config.toml 1/1, README 12, settings 10/30, total ~286/~154, 19 paths. It says "Estimated total: 19 paths." It correctly says 2,495 moves unrenamed. It says "one discovered file" for pool selftest removed 33 cases/668. Accurate. So criterion 5 3 is fair.

H's criterion 5: ranges 538-712/155-267, 16 files + moves. Honest but larger. Still 3.

Now criterion 3 for A: branch calls 5 functions; F/H call 1. A gets 2. So A=17. Good.

Could C/D get criterion 3=2? yes; totals 16.

Now ranking:
H (18) > F (18) > A (17) > E (16) > D (16) > C (16) > G (15) > B (10)

Within E/D/C, tie-break: E has exact counts (criterion 5 strong) but surface 1; D has pure verdict, surface 2 but counts wrong; C same-ish. Which second tier is best? The tie-break clause: future maintainer extend without breaking proof idiom. D's pure `identityVerdict` with non-null `StackIdentityRead` and explicit `containerNames` helper is quite clean and easily tested; E's inline branch is simple but future changes touch main() sequence; C's null-armed read is weaker. I earlier thought E above D. But tie-break favors D over E. However E's smaller exact diff and full honesty may outweigh. The totals tie, so tie-break should decide. I'll rank D above E? Let me weigh again.

Rubric says tie-break specifically: "the design a future maintainer can extend without breaking the proof idiom." D:
- `StackIdentityRead` non-null proof, `stackIdentity` pure, `prepareStack` single, branch one screen (surface 2).
- Wrong counts only.
E:
- `ProvenLocalRead` non-null, `proveLocalTarget` single function, branch inline (surface 1), smallest diff, exact counts.
- Future maintainer extending E: must edit main branch to add a step; but proof idiom (reset takes proof) is structural. The branch exposes order on purpose (safety argument). Hard to say E breaks proof idiom.
D's pure separation arguably easier to test/maintain. D's wrong counts are a rubric penalty already. I'd rank D > E under tie-break? But then C also. Hmm.

Let me compare D vs C:
- D: `containerNames` combined, `stackIdentity` pure, non-null read, 10 test cases.
- C: two helpers, `proveStackTarget` with null arms, 8 tests, similar diff.
D is better. So D > C.

D vs E: D surface 2 vs E 1; D wrong counts vs E exact. Both have one tie-break advantage. The rubric's tie-break favors maintainability/proof: D's pure identity verdict is more of a proof idiom, and its branch is cleaner (prepareStack + evidence + coordinates) while still one screen. E's branch exposes every stage, which the rubric explicitly disfavors in criterion 3; D already paid that cost differently. I'll rank D above E. Hmm, but then E gets 5th.

Wait, E's criterion 3 = 1 and D's = 2; if both total 16, the difference in criterion 3 and 5 exactly offsets. Tie-break then D. So ranking: H, F, A, D, E, C, G, B perhaps. But E's "smallest honest diff" is a stated rubric value (criterion 5) and D has wrong counts. The tie-break is only about future extension; D is indeed more maintainable. I'll put D above E.

What about C vs E? E total 16, C total 16; E exact counts, C wrong; C surface 2, E surface 1. Tie-break: E's non-null read and minimal design vs C's null arms and weaker tests; E still has wrong? E exact. I'd rank E above C. So order: H > F > A > D > E > C > G > B.

Hmm, is that too arbitrary? Let me instead align with totals and fewer tie-break contortions: H > F > A > D > E > C > G > B. Need to explain one sentence per rank.

Actually, maybe give D 16 vs E 16 but rank D above E because (a) surface criterion explicitly values at most two functions and D's branch is cleaner; (b) future extension. E's count accuracy doesn't overcome D's stronger proof-structure/testability? This is a judgment call. The prompt says "Judge each candidate on the rubric." The rubric tie-break explicitly resolves ties—we need to use it. D: pure identity verdict + non-null read + one prepare call + evidence/coordinates => maintainable. E: inline sequence, no module, no named prepare; simple but less extensible. So D above E under tie-break.

C is similar to D but with nullable read and weaker selftest; E above C because exact counts and smaller diff? But tie-break between E/C: E's fewer funcs but exposed sequence; C's null arms. E's design is more coherent (non-null). I'd rank E above C.

G (15) below C due to lower surface and wrong counts. B (10) last.

Now question 5: H top at 18, F 18 tie, or H 18/F 17 if I assign F criterion5=2. Either way "close". The prompt asks one word. I'll say "close".

But wait—should the top be H or F? With tie 18, tie-break says H (config-driven, no hard-coded constants, full mocked prep tests). I'll state H top, F close second.

Let me also reconsider B's criterion 5 = 1: B's diff table only gives "new stack-identity.ts +150", runner +90/-70, selftest +80/-20, config +1/-1, atconfig +10, suite +6/-6, parked moves -1800 (moved). That is far from counted and wrong. Criterion 5 = 1 is fair. B's selftest story also says "drops no-target reset tests" which don't exist. So B low.

B's criterion 4 = 1: missing b-verification update means loop tier red, explicit criterion fail. Good.

B's criterion 2 = 1: retains `carriesPersonal` refusal for the target project, so the identity read refuses the very output it needs. Definite.

B's criterion 3 = 1: many calls/exposed stages. Good.

B total = 3+1+1+1+1+3 = 10.

Now let me ensure every per-candidate evidence mention uses exact file/line references where I checked. I'll cite:
- runner.ts:44, 630-631, 673, 984-986, 1295-1300, 1332-1370, 754, 854, 938.
- db-pool.ts:1084, 1110, 1194, 1126, 1140, 1373, 457, 73-75, 407.
- attestation.ts:80-85, 100.
- runner.selftest.ts:166-180.
- live-ledger.selftest.ts:280-307.
- _fixture.ts:426, 468.
- _integration.ts:65, 83, 487, 559.
- b-verification-and-sessions.test.ts:69, 405, 519, 537.
- atconfig.ts, config.ts CONFIG_KEYS.
- config.toml:174.
- tsconfigs/vitest.
- harness count 34/15493.

Now write final answer. Format: table with rows maybe "Proof", "Identity", "Surface", "Lifetime", "Diff/selftest", "Lock/evidence", "Total". Columns A-H. Use a markdown table.

Then per candidate evidence one or two sentences each (maybe a bullet per candidate compact). Need the evidence for each score? The instruction: "Per candidate, the evidence for each score in one or two sentences, naming the file and line where you checked." Could mean for each candidate as a whole, but "for each score" suggests per criterion. To be safe, I can write per candidate one sentence per score group, compact: e.g., "A: 3/3/2/3/3/3 — [criterion names] ...". But that's long. We can do a single paragraph per candidate that explains the notable scores and where verified. The output shape asks "Per candidate, the evidence for each score" — I'll list per candidate with score string and 1-2 sentences of evidence tied to key criteria. The user likely accepts one or two sentences per candidate. Given final length constraints, do concise.

Ranking: one sentence per rank, 8 sentences.

Graft list for H: a few items:
- from G: narrow `SlotIdentityProof.provenProjectId` to `string` so a "proved no project" read is unrepresentable at compile time.
- from D/G: a pure `identityVerdict(CliResult,...)` split so the container-name/local-checks judgement can be selftested without spawned external mocks.
- from A: fail-open running `jwt_expiry` observation line, so a stale GoTrue that still issues 3600s tokens is diagnosed before AT-001.12/13 time out.
These are genuine.

Judgment: "close".

Ending exactly three lines:
`A=17 B=10 C=16 D=16 E=16 F=18 G=15 H=18`
`H > F > A > D > E > C > G > B`
`close`

Wait, F=18 and H=18. If I assign F=3 on criterion 5, yes. Let me double-check F's other criteria:
1: deletes no-target reset, proof-required. 3.
2: positive identity, keeps localStackProblems/wall, no db-pool import, no guard deletion, docker. 3.
3: branch calls prepareLocalStack only (plus console/assign). 3.
4: lifetime single source, both read sites, b-verification, no manifest edit. 3.
5: accurate counts, selftest story, park. 3.
6: lock/evidence. 3.
Total 18. Yes.

But then F ties H. The ranking with tie-break H first is justified.

Alternatively, because F hard-codes ONE_STACK, I could lower F criterion 2 to 2 => 17. But the rubric criterion 2 wording doesn't penalize it, and F's read still proves from CLI and requires config equality. Keep 3.

Hmm, if H and F tie at 18, question 5 "close" is natural. Good.

A remains 17.

Let me make sure D total: 3+3+2+3+2+3 = 16. E: 3+3+1+3+3+3 = 16. C: 3+3+2+3+2+3 = 16. G: 3+3+1+3+2+3 = 15. B: 3+1+1+1+1+3 = 10.

One more consideration: criterion 1 for B = 3 even though the read cannot pass. The proof structure itself (no unproven reset) is fine. Yes.

Criterion 6 for F/H lock: H's lock is acquired inside `prepareLocalStack`, not by runner before; F's also. Both release; evidence includes lock.file. Fine.

Now per-candidate evidence text (concise):

A (17): Exact harness counts verified (34 files, 15,493 lines under tests/at/harness), pool 1,827/668, and correct reads at runner.ts:44, 984-986, _fixture.ts:468, _integration.ts:65, b-verification:405/519. Identity read keeps foreign/own container names, localStackProblems, wall, docker. Surface loses: branch calls 5 functions rather than at most two.

B (10): Retains personal-id refusal in identity read (db-pool.ts:1204 carriesPersonal) while requiring own container names, self-contradiction. Misses b-verification read sites, so loop tier breaks; count claim -1800 vs actual 2,495. Proof structure and lock/evidence fine.

C (16): Correct proof deletion and positive identity; surface branch calls ~6 functions; wrong counts 1674/602 vs 1827/668; otherwise good lifetime and lock/evidence.

D (16): Best pure identity verdict `identityVerdict` + non-null StackIdentityRead; same proof quality; wrong counts (1674/602, 35 it). Surface branch calls 6.

E (16): Exact smallest diff counts (1827/668, live 246/99), correct lifetime handling, positive identity. But inline branch exposes every stage and calls many functions, losing surface.

F (18): One-call `prepareLocalStack` branch; correct pool/selftest counts (668/33, 2,495 moves); lifetime and lock/evidence correct; hard-coded ONE_STACK allowlist is a minor maintainability cost but not a rubric violation.

G (15): Strong type narrowing (provenProjectId string), good reasoning; inline branch exposes stages; wrong counts 1674/602 and 2,300 vs 2,495.

H (18): Best overall: one exported `prepareLocalStack`, config-driven target, refreshed read + docker confirmation, full mocked-prep selftest story, accurate 2,495 moves, correct lifetime sites, clean lock ownership/evidence. Slightly larger diff but honest.

Ranking sentences:
1. H best: single-call module, config-driven positive identity, proven-reset and full test story.
2. F essentially equal: same surface and safety, but hard-coded ONE_STACK allowlist and smaller selftest coverage keep it second.
3. A: exact counts and strong safety, but branch exceeds two-function surface and diff is larger than needed.
4. D: pure identity verdict and non-null read make it the strongest in-runner-section design; wrong pool counts keep it below A.
5. E: smallest honest diff with exact counts, but inline branch exposes all stages.
6. C: solid positive identity and lifetime, but wrong counts and a weaker selftest story than D.
7. G: clean proof narrowing and measured reasoning, but wrong counts and fully exposed sequence.
8. B: fatally keeps the personal-id refusal for the very stack it must prove, and misses the loop-lifetime read sites.

Question 4 graft list:
- From G: make `SlotIdentityProof.provenProjectId` non-null (`string`) so a "proved no project" read cannot compile.
- From D/G: split pure `identityVerdict(res, target, config)` from the CLI spawn for direct selftests without external mocks.
- From A: add the fail-open running token-lifetime observation line so a stale Auth that still issues 3600s is visible before AT-001.12/13 fail by timeout.

Question 5: close. H and F essentially tie under the rubric; choice between them would not be regretted.

Final three lines exactly as requested:
`A=17 B=10 C=16 D=16 E=16 F=18 G=15 H=18`
`H > F > A > D > E > C > G > B`
`close`

Let me ensure no claim in final conflicts with rubric scores. If H/F tie 18, is "top candidate meaningfully better than second?" Answer close.

Now compose the final response in the requested shape. Keep it high-signal but enough detail. Use table; per-candidate concise bullets; ranking list; graft list; judgment; exactly three ending lines. Also mention I did not run anything (they asked not to run anything; we only read). Fine.

Let me make sure the per-candidate evidence includes naming file and line for all scores? I'll align score chunks to evidence in each bullet, e.g. "Proof 3: reset overloads exist at runner.ts:984-986 and all candidates delete them... Identity 3... Surface 2..." That will be a long bullet per candidate; maybe 2-3 sentences. Given "one or two sentences per candidate" instruction, I'll compress each into two sentences. Format: `**A (17)**` then two sentences. Good.

For H's final line, note exactly three lines: totals; ranking; one word. No extra text after.

Let me draft.

Wait: The final answer must end with exactly three lines. I need to ensure no blank line or trailing text after. Good.

Also should include scores table with columns A-H. Total row included.

Let me write.## Scores

| Criterion | A | B | C | D | E | F | G | H |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Proof on destructive path | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |
| Positive identity, nothing deleted | 3 | 1 | 3 | 3 | 3 | 3 | 3 | 3 |
| Surface | 2 | 1 | 2 | 2 | 1 | 3 | 1 | 3 |
| Session lifetime single-sourced | 3 | 1 | 3 | 3 | 3 | 3 | 3 | 3 |
| Smallest honest diff + selftests | 3 | 1 | 2 | 2 | 3 | 3 | 2 | 3 |
| Lock and evidence | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 |
| **Total** | **17** | **10** | **16** | **16** | **16** | **18** | **15** | **18** |

## Per Candidate

**A (17).** The rough identity and proof claims check out: the no-target reset overloads are truly at `runner.ts:984-986`, the pool prints own/foreign names via `db-pool.ts:1084` and `1110`, and A's harness count of 34 files / 15,493 lines under `tests/at/harness` matches exactly, as do the 1,827/668 pool and selftest counts. It loses on surface because its branch calls about five functions (`readLocalConfig`, `acquireStackLock`, `prepareLocalStack`, `localEvidence`, `localStackEnv`) rather than at most two, and its extra fail-open token-lifetime probe grows the diff.

**B (10).** B carries over the pool's `carriesPersonal` refusal (`db-pool.ts:1204`) verbatim into a read that must positively prove `poancmeitlmxejofwzuu`, so the read would refuse the very output that proves the target; that is why identity scores 1. It never mentions changing `b-verification-and-sessions.test.ts:405/519`, so pinning `jwt_expiry=120` would turn AT-001.13's loop green into a declared-red mismatch, and its move estimate of "-1800" contradicts the real 1,827+668=2,495 moved lines.

**C (16).** C has the correct proof deletion, positive own-container rule, and the correct third lifetime read site at `b-verification-and-sessions.test.ts:405/519`. It drops a point on surface because its branch still calls about six functions, and its diff/selftest criterion is weakened by the wrong pool counts of 1,674 and 602 versus the checkout's 1,827 and 668 (`db-pool.ts`, `db-pool.selftest.ts`), plus a claim about dropping no-target reset tests that do not exist at `runner.selftest.ts:166-180`.

**D (16).** D's pure `identityVerdict` split and non-null `StackIdentityRead` are the strongest in-runner-section design, and it correctly removes any personal-id blacklist while keeping `localStackProblems` and the wall. It scores like C on surface with a six-call branch and on honesty with the same wrong 1,674/602 counts, and D additionally claims 35 pool selftest `it` blocks where there are 33.

**E (16).** E has the smallest honest diff (live ~246 added / ~99 removed, correct pool 1,827/668), the exact lifetime fix in all three files, and clean non-null proof types. It scores 1 on surface because it intentionally inlines every stage in the integration branch and calls many primitives, exposing the internal sequence instead of calling at most two functions.

**F (18).** F's runner branch calls exactly one new function (`prepareLocalStack`), which fully satisfies the surface criterion, and its selftest counts (668 lines, 33 pool cases, 13→12 files) and 2,495-line move all match the checkout. Its hard-coded `ONE_STACK` allowlist is a minor maintainability cost, but it is still a positive statement with config equality enforced, not a removed guard, so no rubric point is lost.

**G (15).** G has the strongest compile-time proof shape by narrowing `provenProjectId` to a non-null `string`, and its lock/evidence and lifetime answers are correct. It loses on surface by exposing the whole sequence inline, and its counts are contradicted by the checkout: 1,674/602 and "about 2,300 lines" versus actual 1,827/668 and 2,495.

**H (18).** H combines the best surface (one exported `prepareLocalStack`), a config-driven target with no duplicated constants, refreshed identity read plus Docker confirmation, correct lifetime updates at `_fixture.ts:468`, `_integration.ts:65`, and `b-verification-and-sessions.test.ts:405/519`, and the most complete mocked-preparation selftest story; its 2,495-line move total is accurate. Its diff is the largest, but it is honest, justified, and the most maintainable shape among the candidates.

## Ranking

1. **H**: Complete one-call module with config-driven positive identity, full proof idiom, and the strongest test story.
2. **F**: Essentially equal surface and safety; a compact module, but the hard-coded allowlist and thinner selftests keep it second.
3. **A**: Verify-precise counts and strong safety, but too many branch calls and extra novel instruments.
4. **D**: Best in-runner design with a pure identity verdict and non-null proof, held back only by wrong counts.
5. **E**: Smallest honest diff with exact counts, but the inline branch exposes every internal stage.
6. **C**: Correct proof and lifetime mechanics, but wrong counts and a weaker selftest story than D.
7. **G**: Strong type narrowing and reasoning, but fully exposed sequence and wrong counts.
8. **B**: The retained personal-id refusal makes the identity read unworkable, and the loop-lifetime break is missed.

## Graft List For H

- From **G**: narrow `SlotIdentityProof.provenProjectId` to non-null `string` so a "proved no project" proof is a compile error.
- From **D/G**: split a pure `identityVerdict(res, target, config)` from the CLI spawn so the container-name/local-check judgement is selftested without external mocks.
- From **A**: the fail-open running-token-lifetime observation, so a stale Auth still issuing 3600-second tokens is diagnosed before AT-001.12/13 time out.

## Judgment

H and F are close enough that either would do; H's config-driven single source and richer selftest story are modest advantages, not reasons a team would regret choosing F.

A=17 B=10 C=16 D=16 E=16 F=18 G=15 H=18
H > F > A > D > E > C > G > B
close