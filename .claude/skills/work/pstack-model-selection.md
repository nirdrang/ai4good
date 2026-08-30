# Model selection for the pstack workflow

This file is the record of every model decision and every model finding for ai4good's
workflow v2. The sheet-roles table in
[`pstack-workflow-ai4good.md`](pstack-workflow-ai4good.md) shows the current values. This file
says why each value is what it is, and what was measured. If you change a model, an effort, or
a panel, add the decision here in the same commit.

Names: a **family** is one row of the model matrix. A **sheet role** is one row of
[`~/.claude/pstack-models.md`](file:///C:/Users/nirdr/.claude/pstack-models.md). A **lane** is
one entry in a panel role. A **descriptor** is `provider:model@effort`.

## 1. The families

| family | descriptor | efforts | route | why this model |
|---|---|---|---|---|
| fable | `claude:claude-fable-5` | low, medium, high, xhigh, max | native agents | The session's own model. Judgment and prose. The most expensive model here, so it earns its seat only where judgment under uncertainty is the job. |
| sol | `codex:gpt-5.6-sol` | low, medium, high, xhigh, max | codex CLI | The proven reviewer of v1: gate 1 at xhigh caught a too-weak test oracle and a passing no-op before code existed (2026-08-03). |
| grok | `codex:opencode-go-responses/grok-4.6` | low, medium, high, xhigh | codex CLI through the router | The plugin's default writer. Kept as the third vendor. Served by the codex router because no Grok CLI is installed (founder 2026-08-29). |
| opus | `claude:claude-opus-5` | low, medium, high, xhigh, max | native agents | Same vendor as fable. A judge that differs from a fable front-runner, and nothing else. |

Other models the router serves, for trials: `opencode-go/deepseek-v4-pro` (high, max),
`opencode-go/kimi-k3` (low, high, max), `opencode-go/glm-5.3` (high, max), `gpt-5.6-luna`
and `gpt-5.6-terra` (low to max). The full catalog is
[`~/.codex/codex-router/merged-models.json`](file:///C:/Users/nirdr/.codex/codex-router/merged-models.json).

## 2. Decisions, newest first

| date | decision | reason | source |
|---|---|---|---|
| 2026-08-30 | `how explainer` = `fable@high` | The explainer writes the one explanation everything downstream reads, so it stays on fable. It writes prose from explorer notes, so high effort is enough. | founder: "is that really necessary to go full blown on our most expensive model here?" and "g3 should be fable@high not opus" |
| 2026-08-30 | The ground critique runs on every item. | The decision "does the request ask for problems" was undefined for a brief. Always on removes the question. | founder: "how can we make g4 critique happens for all scenarios?" |
| 2026-08-30 | `how critics` = three lanes: fable@max, sol@max, grok@xhigh | Opus shares a vendor with fable. Two lanes from one family add cost and no independent view. | founder 2026-08-28: "I don't really understand fable as well as opus on the same task" |
| 2026-08-29 | The grok family routes through codex: `opencode-go-responses/grok-4.6` | Setup probes every family live and writes nothing on a failed probe. No Grok CLI here. The runner takes the model as a free string. | founder choice, 2026-08-29 |
| 2026-08-28 | Target sheet: writers at `@high`, `hardest tasks` = `fable@max`, every panel three lanes from three vendors, opus only in `arena cross-judge pool` | Effort headroom is the first escalation step. Cross-vendor panels have decorrelated blind spots. | founder's escalation-ready design |
| 2026-08-28 | The verifier rule lives in the user-level CLAUDE.md, not the sheet | pstack has no verifier role. A custom role row is "inconsistent state" and stops setup. | setup-pstack step 2 |
| 2026-08-28 | A false green disqualifies a candidate at any price | Cost decides only between models that told the truth. | v1 finding below, 2026-08-09 |

## 3. Findings from v1 trials that still bind

These were measured on the v1 relay. The models are the same, so the findings carry.

| date | finding | consequence |
|---|---|---|
| 2026-08-13 | Diff review recall on one graded gate: terra 6, DeepSeek V4 Pro 3.5, Flash 3, all with zero false positives, at $0.18 for the panel. | terra is the strongest cheap reviewer of the three. V4 Pro is a fair second seat. |
| 2026-08-13 | DeepSeek V4 Pro as executor cleared a well-specified plan with no false green ($0.21). The hard half was untested. | A candidate writer, not yet proven on hard units. |
| 2026-08-09 | Flash as reviewer matched a graded Kimi review and added two real findings (one miss, zero false positives). Flash as executor shipped a false green. | Flash may review. Flash never writes. |
| 2026-08-05 | Per-gate pins in v1: sol at xhigh for the plan, terra at max plus Kimi k3 at high for the diff, luna at max for the audit. | The plan and the diff are never judged by the same eyes. Carry this into which lanes sit in `interrogate reviewers`. |
| 2026-07-31 | Effort ladders differ by vendor. codex: minimal to max. Kimi: low, high, max. grok: no max. An invalid effort falls back silently. | Name the vendor with every effort. Check the ladder before writing a descriptor. |
| 2026-08-09 | An opencode lane costs about $0.001 per review. A missing `--agent` falls back to a write-capable default. | Cheap reviewers are cheap. Pin the agent file on every opencode call. |

## 4. Rules that shape every choice

- The most expensive model earns a seat only where the job is judgment under uncertainty:
  ruling on findings, designing, the hardest units. Prose and synthesis run one effort step
  down on the same model, or on a cheaper family.
- Two lanes from one vendor are one view. A panel is three vendors or it is not a panel.
- pstack calls its shipped efforts minimums and lets the lead raise them. We treat the sheet
  as the ceiling too: a lead that wants more effort says so in its report, and the sheet
  changes on a rerun of setup.
- A model change is a trial first (section 7 of the workflow file): replay one station, then
  an arena head to head, then one item end to end in two cloud sessions. A false green ends
  the trial.
- `inherit-parent` roles (`why`, `reflect`) stay on the session model because external lanes
  never get the MCP surface.

## 5. Open questions

- Panel efforts: `fable@max` and `sol@max` in the panels are the shipped values, untested
  against `@high` for the same recall.
- terra and luna have v1 evidence as reviewers and no seat in the first write. Candidates for
  `interrogate reviewers` on the first rerun.
- DeepSeek V4 Pro as a writer on hard units.
- There is no verifier role. Station 6 runs on the lead.
