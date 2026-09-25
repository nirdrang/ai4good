# The how-explorer seat: grok against three cheaper models

Answer: grok keeps the seat. Three challengers, six blind judgements, grok won every matchup.

Run on 2026-09-09 and 2026-09-10, all at head `a29fbaa`.

## Method

Every candidate ran the same four exploration angles on the notifications subsystem, from prompts
built verbatim from the `how` skill's own `references/explorer-prompt.md`. Identical prompt text,
identical commit, read-only.

The subsystem was chosen because the lead had just built and merged it, so claims could be checked
against known ground truth instead of judged only on preference.

Each challenger was then blinded against grok as A and B and scored by two judges from families
that are neither candidate, `codex:gpt-6-astra@medium` and `claude:opus@xhigh`, on trace
completeness, verifiability, non-obvious yield and honesty.

**Method defect found and fixed mid-eval.** The muse round randomised A and B per angle, which
protects each angle but makes each judge's closing verdict incoherent, because A is one model in
some angles and the other elsewhere. Both muse-round verdict paragraphs are unusable. The GLM and
DeepSeek rounds use one assignment for the whole run. Randomise per run, never per angle.

**Second method defect, in my own tooling.** A mechanical citation audit that flags a path which
does not resolve cannot tell a fabricated path from a correct report that a declared path is
missing. Both of its non-zero hits were false positives: GLM correctly reported that
`NOTIFICATION_COMPONENTS` declares three service files that do not exist, and DeepSeek correctly
reported that `config.toml` declares a `seed.sql` that is absent. Every hit needs a human read.

## Result

| | grok 4.6 @xhigh | DeepSeek V4.1 Flash @max | GLM 5.3 Flash @max | muse 1.3 @xhigh |
|---|---|---|---|---|
| Astra angles won | — | 1 of 4 | 1 of 4 | 0 of 4 |
| Opus angles won | — | 0 of 4 | 1 of 4 | 0 of 4 |
| Astra score, grok's beside it | 74 / 74 / 75 | 70 | 69 | 60 |
| Opus score, grok's beside it | 80 / 79 / 80 | 73 | 75 | 73 |
| Cost, four angles | $0.613 | $0.164 | $0.368 | $0.041 |
| Wall clock | 26.4 min | 13.2 min | 18.7 min | 6.5 min |
| Output | 84.9 KB | 94.7 KB | 111.3 KB | 70.4 KB |
| Citations, per KB | 107, 1.26 | 97, 1.02 | 91, 0.82 | 71, 1.01 |
| Real citation defects | 0 | 1 bad line | 0 | 3 bad lines, 1 fake symbol |
| Ground-truth facts | 9 of 10 | **10 of 10** | 9 of 10 | 9 of 10 |

Combined margin against grok across both judges: GLM 9, DeepSeek 11, muse 22.

## Why all three lost, and it is the same reason

None of them produced worse traces. All three trace the subsystem end to end, cite real files, and
answer the angle. They lost on **honesty scores**, and specifically on confident assertions about
the tree that are false.

- muse named `maxIdFor` in a module whose function is `messageIdFor`, and reported the atomicity
  guarantee as resting on four independent reads when two of them join through the delivery table.
- GLM asserted that a crash between provider acceptance and the sent mark leaves a durable record,
  in two angles, while correctly refuting that exact claim in a third. It also gave the local stack
  URL from a synthetic selftest fixture rather than this tree's ports.
- DeepSeek claimed row-level security is enabled on a sequence, which PostgreSQL does not support,
  gave a wrong inventory of the tree's triggers, and declared the acceptance specification absent
  because a glob failed to find it.

Opus put the consequence exactly: an explorer feeds a writer who will not re-open the code, so a
competent explorer whose output needs a verification pass costs more than the model saves. Grok's
output needed no such pass in either round.

## The pairing case, which is the one that survives

Every judge, unprompted, said running two models adds real value, and opus said "more than
marginally" for DeepSeek. The novel findings barely overlap.

DeepSeek alone found six things grok did not, including two real defects. It is also the only
candidate that found the shared reference-counted SQL client and reconstructed the connection-pool
incident behind it, which grok, GLM and muse all missed.

If a pair is ever adopted, DeepSeek is the best partner on value at $0.164 and 13 minutes, and the
`how` skill must first learn to read the row as a list. The second lane's output has to be marked
unverified, because all three challengers' failures are the propagating kind.

## Recommendation

Keep `how explorer` as one descriptor on `grok:grok-4.6@xhigh`. No change.

The untested cell that could still change the answer is a challenger at a lower effort, since the
flash models' ladder is low/high/max and both were run at max. A real cost drop with held quality
is the only configuration that would make a swap rational.

## What this eval actually bought: twelve defects in merged code

Six blind judgements and twelve explorer runs read the notifications subsystem harder than its own
build did. None of these breaks a test, which is why nothing caught them.

**Serious.**

1. **No delivery row is ever claimed or locked.** `runPass` calls `runPassOver(await
   outbox.pending())` and iterates. There is no `FOR UPDATE`, no `SKIP LOCKED`, no claim column
   anywhere. Two concurrent worker passes would hand the same rows to the provider. The
   subsystem's headline guarantee is "never duplicated" and nothing in the schema enforces it.
   Latent today because only the test adapter drives the worker; live the moment a schedule exists.
2. **A witness disagreement leaves the fault point permanently armed.** `faults.ts` calls
   `armed.triggerCount()` before `armed.disarm()`. The live crash switch throws from
   `triggerCount()` on disagreement, so the disarm and the reservation release never run. The
   comment between those two lines states the intent to release first and gives this exact hazard
   as the reason.
3. **The durable receipt cannot serve its stated purpose.** `apply_delivery_results` writes
   `state = 'sent'`, `accepted_at` and `provider_receipt` in one update, so the
   crash-after-acceptance window the design invented those columns for does not exist. The claim
   appears in the design, a migration comment, and pull request 71's body.

**Real.**

4. `provider_receipt` is last-wins while `delivered_by_process` and `accepted_at` are first-wins.
5. The atomicity oracle's ops-item read discriminates for exactly one of eleven guarded rows, so
   one of its four "nothing survived" checks is vacuous for the other ten.
6. The live catalog check verifies `rowLevelSecurity === true` only for tenant-isolated tables, so
   four of the five notification tables never have RLS confirmed live.
7. The live catalog checks `anon` and `authenticated` execute but never `service_role`.
8. A future `CACHE n` on `notification_fault_triggers` would make the two crash witnesses disagree
   spuriously.
9. `accepted_at` and `provider_receipt` are never written on the live lost-acknowledgment path.

**Minor.**

10. `tests/at/harness/index.ts:214` still says an id stays red against a manifest declaring none.
11. `taxonomyRow()` is exported and unused.
12. `config.toml` declares `[db.seed] sql_paths = ["./seed.sql"]` and no such file exists.

## The conclusion that matters more than the seat

These models are poor explorer replacements and excellent cheap adversarial readers. Grok won every
matchup, yet the challengers between them surfaced twelve defects the build's own panel, its
verification sweeps and its comment audit all missed, at a total cost under a dollar.

That capability already has a home on the sheet. `interrogate reviewers` is a four-lane panel and
muse already holds a seat there. The measured lesson is not "swap the explorer" but "a cheap
adversarial read over a diff before merge pays for itself many times over", and the notifications
item shipped without one.

## Artifacts

`out/` holds twelve lane outputs, their receipts, and six judge verdicts. `blind/`, `blind2/` and
`blind3/` hold what each judge round read, with `BLIND-KEY*.txt` beside them. `angle-N-prompt.md`
holds the prompts and `judge-prompt*.md` the rubrics.
