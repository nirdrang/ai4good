# Panel eval: bundle against bundle

Founder ruling, 2026-09-04: judge the whole panel output, not one lane against one lane. A
challenger bundle may hold more lanes than the incumbent. It wins if the ruling it makes possible
is as good or better, whatever the lane count.

## The two bundles

Incumbent, the current sheet rows `how critics` and `interrogate reviewers`:

| lane | descriptor | Claude pool |
|---|---|---|
| fable | `claude:fable@high` | yes |
| sol | `codex:gpt-5.6-sol@max` | no |
| grok | `grok:grok-4.6@xhigh` | no |
| opus | `claude:opus@xhigh` | yes |

Challenger, fable out and three cheap lanes in:

| lane | descriptor | Claude pool |
|---|---|---|
| sol | `codex:gpt-5.6-sol@max` | no |
| grok | `grok:grok-4.6@xhigh` | no |
| opus | `claude:opus@xhigh` | yes |
| deepseek | `codex:opencode-go/deepseek-v4-pro@max` | no |
| kimi | `codex:opencode-go/kimi-k3@high` | no |
| glm | `codex:opencode-go/glm-5.3@max` | no |
| muse | `codex:opencode-go-responses/muse-spark-1.2-contributor@xhigh` | no |

Three lanes are common to both, so the comparison is what one fable lane contributes against what
five router lanes contribute, on the same diff at the same head.

Three of the new families are chosen on v1 evidence. Terra had the best diff-review recall of the
cheap reviewers with no false positives. DeepSeek V4 Pro was a fair second. Kimi K3 was the graded
reference in that trial. None of them writes code here; reviewing is the seat they earned. The
founder added glm and muse on 2026-09-04; both are untested here. The catalog carries no muse 1.3,
so the lane runs the only muse entry, `muse-spark-1.2-contributor`, at its ceiling effort.

A lane that scores nothing is dropped from the winning bundle before the sheet changes. Five
router lanes cost cents together, but a lane that adds no finding still costs the lead a file to
read and a ruling to write.

## The material

Head 3141206 of the harness item, the same commit the real panel reviewed. Worktree
`.claude/worktrees/panel-replay`, dependencies installed, seeded with the design and the diff and
nothing else from the item folder. The prompt is the original reviewer prompt with the working
directory swapped. The three router lanes run through the external runner with `--cwd`, so they
are sandboxed by process, not by instruction. That closes the blinding flaw the explainer eval hit.

The incumbent bundle needs no rerun. Its four reviews are on disk from the real run.

## Scoring

Ground truth is the union of real findings across both bundles.

1. The incumbent's real set is already adjudicated. The lead ruled every one of its findings and
   dismissed none, so its act-on list is the known-real set. It holds twelve items.
2. Every challenger finding that is not already in that list is adjudicated fresh: real defect,
   real prose error, sizing question, or noise.
3. Each bundle then scores recall against the union, plus a noise count.

## The pass bar

The challenger replaces fable on both sheet rows only if all three hold.

- It recovers every one of the twelve acted-on items, including the one critical, the missing
  type check on the drive script.
- It adds no more noise than the incumbent, which added none.
- It costs no Claude credits beyond the opus lane both bundles share.

Finding something the incumbent missed is a bonus, not a requirement. Equal is a pass, because
the saving is the point.

## Limits

One item, one replay. The adjudication of new challenger findings is done by the lead, the same
role that wrote the incumbent's ruling, so it is not blind. A finding that is real but was never
raised before is the case to watch, since the lead has no prior judgment to lean on there.

## Route failures, 2026-09-04

Two of the five challenger lanes cannot run through the codex router at all. Neither failure says
anything about the model's review quality.

- **glm 5.3**: the provider rejects the request with `Extra inputs are not permitted, field:
  'web_search_options'`. The router adds that field to every opencode-go request and GLM refuses
  it. Turning web search off in the codex config does not remove it, and neither does clearing
  `supports_standalone_web_search` on the router provider entry, so the field comes from the
  router and not from codex. No lane is possible on this route today.
- **muse spark 1.2 contributor**: the provider rejects the request with `Recursive JSON schemas
  are not currently supported`. Codex sends its own tool definitions with every call and this
  provider cannot parse them. No lane is possible on this route today.

Both would need either a router fix or a different route. The finding is recorded so the next
person does not spend the same hour on it.
### muse 1.3 exists, the router cannot reach it yet

The founder was right that a muse 1.3 exists. `opencode models` lists
`opencode-go/muse-spark-1.3-contributor`. The router does not serve it: its catalog
`merged-models.json` was built on 2026-08-29 and has not refreshed, so a call with that slug is
refused with "not supported when using Codex with a ChatGPT account".

Refreshing the catalog means restarting the router service. Three challenger lanes were running
through that same router when this was found, so the restart waits until they land. After the
restart, retry muse 1.3 and also retry glm 5.3, because a newer catalog may change what the
router sends.
## Terra leaves the bundle, 2026-09-04

Founder ruling: terra does not belong in the challenger bundle, because sol already holds a lane
and both are GPT 5.6. Two lanes from one vendor are one view, the same rule that put the fable and
opus pairing in question. The v1 evidence that recommended terra was collected when sol was not on
the panel, so it does not carry here.

The terra lane was already running when the ruling landed. It finishes and is scored as a control
outside the bundle, to measure the vendor-correlation rule itself on our own tree:

- If terra's findings are a subset of sol's, the rule is confirmed with local data.
- If terra raises anything sol missed, the rule is weaker than the sheet assumes, and the fable
  and opus pairing deserves the same question.
## muse 1.3 cannot be reached from here, 2026-09-04

Investigated on the founder's instruction. A router restart is not the fix.

- The router restarts cleanly and does republish its catalog, but the catalog is filtered by a
  curated list in the router's own source, `src/opencode-curation.mjs`. That list names
  `muse-spark-1.2-contributor` and knows no 1.3.
- `control catalog-cache invalidate opencode-go` clears nothing, so no stale cache is involved.
- Adding 1.3 to the curated list by hand, on both the responses route and the primary route, did
  not surface it. The router still refuses the slug. The edit was reverted and the router restarted,
  so the tool is exactly as it was found. Its catalog holds 42 models and every lane this eval needs.
- The proper fix is a router update to a release whose curation carries 1.3. The installed router
  is version 0.5.1.

There is a second reason to expect nothing from muse here. Muse 1.2 was reachable and still failed,
because the provider rejects the recursive JSON tool schemas codex sends on every call. That is a
codex incompatibility, not a version gap, so a reachable 1.3 would likely fail the same way.

## deepseek flash, not pro, 2026-09-04

Founder ruling: the rerun uses `opencode-go/deepseek-v4-flash`, not the pro variant. The v1 record
supports it. Flash as a reviewer matched a graded reference review and added two real findings with
zero false positives. Flash is disqualified as a writer only, and this seat is review.

## The opencode window

The opencode-go provider rate-limited after five lanes at once, and its window is five hours. The
DeepSeek and Kimi lanes wait for it. Terra is on a different route and already ran.
## Bundle after the founder's rulings, 2026-09-04 evening

The founder updated the router, which brought muse 1.3 into the catalog. A probe answered, so the
recursive tool-schema rejection that killed muse 1.2 was a version gap after all.

Challenger bundle as it now stands:

| lane | descriptor | status |
|---|---|---|
| sol | `codex:gpt-5.6-sol@max` | shared with the incumbent, already scored |
| grok | `grok:grok-4.6@xhigh` | shared with the incumbent, already scored |
| opus | `claude:opus@xhigh` | shared with the incumbent, already scored |
| deepseek | `codex:opencode-go/deepseek-v4-flash@max` | running |
| muse | `codex:opencode-go-responses/muse-spark-1.3-contributor@xhigh` | running |

Out by founder ruling: terra, same vendor as sol, kept only as a scored control. Kimi K3, dropped
2026-09-04 evening with no lane run.
GLM 5.3 became reachable after the router update and a probe answered, but the founder held it
back: "No glm yet". No GLM lane has run. It stays a candidate for a later round.
DeepSeek Flash was launched and then stopped by the founder before it finished. No DeepSeek lane
has run. Only muse 1.3 continues.