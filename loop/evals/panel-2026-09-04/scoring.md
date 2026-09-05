# Scoring against the twelve acted-on items

The incumbent's ruling produced twelve acted-on items. Every lane is scored on which of them it
raised. The numbering is the ruling's own.

## Terra at max, the control lane

Ran 15 minutes, five warnings, no critical, no noise.

| terra finding | incumbent item |
|---|---|
| 1. the edge-runtime mount check is documentation only, no executed path | item 4, the Doctor checks |
| 2. no-live suites build the loop stand-in before the refusal | item 1, liveness before construction |
| 3. the public factory advertises loop-only capabilities above loop | none, candidate new finding |
| 4. live prose still describes the parked ledger, and the recipe describes an obsolete mail protocol | items 5 and 7 |
| 5. the lifecycle extraction replaces one oversized file with another | item 9 and the Consider entry |

Terra alone recovers items 1, 4, 5, 7 and 9, five of twelve, with one candidate new finding.

## The vendor-correlation rule does not hold here

Terra was added as a bundle lane, then removed by founder ruling on 2026-09-04 because sol already
holds a lane and both are GPT 5.6. The lane had already started, so it was scored as a control on
that exact rule. The result contradicts the rule.

Sol, in the real run, raised items 2, 5, 7, 8, 9, 10, 11 and 12. Terra raised items 1 and 4, which
sol did not. Terra is not a subset of sol. Two lanes from one vendor were not one view on this
diff.

That does not put terra back in the bundle on its own. It does mean the same assumption applied to
the fable and opus pairing is unproven, and the sheet has been shaped by it more than once.

## Candidate new finding to adjudicate

Terra 3: `createHarness()` returns `Promise<AtHarness>` for every tier, so a direct caller can
compile a call to `h.clock.advance()` or `h.vendors.email` on an integration harness that throws
or is missing at runtime. `TierHarness<'integration'>` removes those members but only the registry
uses the narrower type. This is a real typing gap and no lane in the real panel raised it. It is a
filing candidate, not a defect in the merged work.

## Muse 1.3 at xhigh, a challenger lane

Ran 13 minutes, five warnings and one nit, no critical, no noise.

| muse finding | incumbent item |
|---|---|
| 1. live prose still names the parked ledger as the live mechanism | item 7, the prose sweep |
| 2. the boolean plus hand-written throws can go green over stub data | the ruling's first Noted entry |
| 3. the shared module changed the drive's requests, not only their home | item 5 and the second Noted entry |
| 4. a bad catcher answer becomes a red the manifest cannot declare, and the deadline is checked only between rounds | item 10 for the deadline half; the parse half is new |
| 5. the selftest proves only the pure helpers | item 12, pinning the request shape |
| 6. duplicated SQL client shape and a thin re-export | item 8 and the Consider entry |

Muse alone recovers items 5, 7, 8, 10 and 12, five of twelve, plus both Noted entries and one
Consider. Its prose finding names the same eight sites the ruling listed. Its request-shape finding
names the same fix down to the forwarded-for header.

## The two challenger lanes together

Terra covered items 1, 4, 5, 7 and 9. Muse covered items 5, 7, 8, 10 and 12. Together they reach
eight of twelve, and the four they miss are covered by lanes both bundles share: items 2 and 11 by
sol, items 3 and 6 by opus.

## Verdict on the pass bar

The challenger bundle clears it.

- **Every one of the twelve is recovered without fable.** The baseline showed fable raised no item
  alone, so removing it loses no acted-on item. Sol, grok and opus carry the four that terra and
  muse miss, including the one critical.
- **No added noise.** Neither challenger lane produced a finding that had to be dismissed.
- **No Claude credits beyond the opus lane both bundles share.**

Two new real findings arrived on top: muse's bare JSON parse in the mail search, which turns a
malformed catcher answer into a red the manifest cannot declare, and terra's per-tier harness type,
which lets a caller compile a clock or vendor access that does not exist above loop. Both are
filing candidates against the merged tree, not defects in it.

## What this does not prove

One item and one replay. The adjudication of the two new findings is mine, and I also wrote the
incumbent ruling, so it is not blind. DeepSeek Flash, Kimi and GLM were dropped or held before
running, so the challenger is two lanes, not five.
## Blinded judging of the fourth seat, 2026-09-04

Setup per the eval playbook. A fresh checkout at the reviewed commit, the changeset, the intended
design, the three settled panel reviews as fixed context, and the two candidate fourth reviews as
P and Q with the assignment set by a coin flip. Every model and vendor name stripped from all five
documents. The label key is `label-key.txt`, outside the judge's working directory. P is muse 1.3
at xhigh. Q is fable at high.

The judges score what each candidate ADDS to the three settled reviews, because that is the only
job the fourth seat has.

### Judge one, grok at xhigh. 11 minutes, USD 0.24.

| criterion | P (muse) | Q (fable) |
|---|---|---|
| marginal coverage | 2 | 1 |
| factual accuracy | 3 | 2 |
| freedom from noise | 4 | 2 |
| actionability | 4 | 5 |
| severity judgment | 3 | 4 |
| **total** | **16** | **14** |

Verdict: P holds the seat. The judge found exactly one real marginal defect across both candidates,
and it is muse's: the mail reader parses the search body with a bare JSON call, so a service that
answers 200 with HTML fails as an uncaught parse error instead of the named refusal the same module
already uses two functions away. That is the same finding the lead adjudicated independently.

The judge is blunt about the shape of the difference. Fable is the better sole review, with tighter
locations and cleaner ranking, and it covers the same ground the three settled reviews already
covered. That is the wrong job for this seat. Its unique residue is nits, and its headline extra
cites a design sentence this checkout does not contain.

Asked what a panel of three alone would miss, the judge named the same bare parse and nothing else.

Judge limitation: this judge also wrote one of the three settled reviews in the fixed context.
### Judge two, sol at max. 17 minutes, cost not reported.

| criterion | P (muse) | Q (fable) |
|---|---|---|
| marginal coverage | 2 | 0 |
| factual accuracy | 4 | 2 |
| freedom from noise | 4 | 2 |
| actionability | 4 | 4 |
| severity judgment | 2 | 4 |
| **total** | **16** | **12** |

Same verdict, same single marginal finding, same criticism of the incumbent's leading finding. This
judge is more explicit: that finding rests on a citation that does not exist, an invented design
statement, and a wrong claim about what would turn green.

Judge limitation: this judge also wrote one of the three settled reviews in the fixed context.

### Both judges together

Two blinded judges, two different families, one pass each on the same prompt. Both rank P above Q.
Both name exactly one marginal defect across both candidates, and it is the same one. Both answer
the fourth-seat question with that same single item and nothing else. The lead's own adjudication,
made before either judge ran, picked the same finding.

Agreement this complete on a blind pass is the strongest signal this eval can produce from one item.

## Recommendation

Replace the fable lane with muse 1.3 on both panel rows of `.claude/pstack-models.md`:

    how critics:           codex:opencode-go-responses/muse-spark-1.3-contributor@xhigh, codex:gpt-5.6-sol@max, grok:grok-4.6@xhigh, claude:opus@xhigh
    interrogate reviewers: codex:opencode-go-responses/muse-spark-1.3-contributor@xhigh, codex:gpt-5.6-sol@max, grok:grok-4.6@xhigh, claude:opus@xhigh

The saving counts twice per item, because both steps read these rows. Measured on the v1-ceremony
item, the fable lanes cost 637k tokens in the critics and 427k plus 280k in interrogate, all at max.

### Three things to weigh before it lands

- **One item, one replay.** Both judges also authored one of the three settled reviews they were
  given as fixed context, because the two neutral families were stopped earlier that day.
- **The seat itself bought one defect.** Both judges, asked what a panel of three alone would miss,
  named one finding. The seat is worth keeping at muse's price. It would be hard to justify at
  fable's.
- **Route risk with a date on it.** Muse runs through OpenCode, and the router sends no
  `x-opencode-session` header. OpenCode has said requests missing it may error from 09/06. Adopting
  muse puts a standing sheet lane on that route. The header gap is a router defect and belongs
  upstream.
## Astra at medium, a challenger for the sol seat, 2026-09-05

The founder asked for sol at max against the new GPT-6 Astra at medium. Same diff, same commit, same
prompt, same sandbox. Astra ran 6 minutes and returned three warnings, no critical, no noise. The
router ledger shows 40 requests on the astra slug inside its window and no substitute.

| astra finding | incumbent item |
|---|---|
| 1. moving the pending error creates a runtime dependency cycle | item 8, the cycle that moved to `pending.ts` |
| 2. parking the ledger selftest also removed coverage of behaviour that stayed live | none, candidate new finding |
| 3. live prose still promises the removed provenance guarantees | item 7, the prose sweep |

Astra alone recovers items 7 and 8, two of twelve. Sol, in the real run, recovered eight: items 2,
5, 7, 8, 9, 10, 11 and 12, including the three tests nobody else proposed.

The candidate new finding is substantive. The parked ledger selftest held tests of `captureFailure`,
tier selection, timeout isolation, and the mail identification probe rejecting HTML and bad
answers. Those functions all stayed live, and no remaining selftest exercises them directly. That
is a coverage regression the real panel did not raise. Adjudicated real by the lead, pending the
blinded judges.

On raw recall against the ruling astra is well behind sol. On marginal value it brought one real
finding sol did not. The blinded judges decide which of those matters for the seat.
### Sol against astra: judge one, fable at high, native. 5 minutes, 156k tokens.

Labels for this pairing: P is astra at medium, Q is sol at max. Key in `label-key-sol-astra.txt`.

| criterion | P (astra) | Q (sol) |
|---|---|---|
| marginal coverage | 4 | 2 |
| factual accuracy | 4 | 5 |
| freedom from noise | 5 | 4 |
| actionability | 4 | 4 |
| severity judgment | 4 | 3 |
| **total** | **21** | **18** |

Verdict: astra holds the seat. The judge credits astra with two things the settled three miss: the
runtime import cycle this change created by turning a type-only import into a value import, and
ten regression tests of live behaviour that left the tree inside a file parked for a different
reason. Sol catches the first too and states it more precisely, but four of its six findings
restate what the settled reviews already delivered, and it ranks its one new finding fourth. Sol's
line cites are the more exact; astra's two one-line offsets are its only inaccuracies.

Asked what a panel of three alone would miss, the judge named the import cycle first and the
orphaned tests second.

Note on the reading: the judge scored sol's own new findings, the three tests, as already covered
because muse's review in the fixed panel proposed the request-shape pin and the deadline. That is
correct for this pairing, where muse is settled and sol is the candidate, and it is the reverse of
the earlier pairing where sol was settled. Marginal value depends on who else is in the room.
### Sol against astra: judge two, grok at xhigh. 9 minutes, USD 0.14.

| criterion | P (astra) | Q (sol) |
|---|---|---|
| marginal coverage | 4 | 2 |
| factual accuracy | 5 | 4 |
| freedom from noise | 4 | 2 |
| actionability | 4 | 4 |
| severity judgment | 4 | 3 |
| **total** | **21** | **15** |

Same verdict, same two marginal defects, same answer to the fourth-seat question: the import cycle
and the orphaned selftests would go uncaught. The judge's one-line summary of sol: a fourth
reviewer who mostly repeats the first three does not earn the seat.

### Both judges on sol against astra

Two blinded judges from different families, one pass each. Both give astra the seat, 21 to 18 and
21 to 15. Both name the same two marginal defects. Both answer the removal question identically.
The lead's own adjudication, before either judge ran, had flagged the orphaned selftests as the one
new finding.

The finding that decides it is not astra being a better reviewer than sol in the abstract. Sol's
raw recall of the ruling was eight items to astra's two. It is that with muse now in the fixed
panel, sol's unique contribution shrank to one finding it ranked fourth, while astra's two unique
findings were things nobody in the room had raised. Marginal value depends on who else is seated.

### What this does not settle

Astra at medium ran six minutes to sol's real-run pass. It is the cheaper and faster lane by a wide
margin, which matters. But the comparison is one diff, one replay, and astra reviewed with muse
already seated while sol reviewed with fable seated. A clean test of the sol seat runs both against
the same fixed panel on the next item's real interrogate. The result here is enough to seat astra
as a fifth reviewer on the next item and score both live, not enough to unseat sol on its own.