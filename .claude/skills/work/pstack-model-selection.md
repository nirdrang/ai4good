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
| grok | `codex:opencode-go-responses/grok-4.6` | low, medium, high, xhigh | codex CLI through the router | The plugin's default writer; panel-only since 2026-08-31, when opus took the feature seat. Kept as the third vendor. Served by the codex router because no Grok CLI is installed (founder 2026-08-29). Re-probe before first use. |
| opus | `claude:claude-opus-5` | low, medium, high, xhigh, max | native agents | Same provider as fable and the lead, so the arena never prefers it as a judge. Since the batch ruling of 2026-08-31: the feature and refactoring writer at max, the why investigator at max, a panel lane at xhigh in the critics, both runner panels, and interrogate, the swarm worker at xhigh, and the judge pool fallback at max. The later-phases plan landed here. |
| deepseek | `codex:opencode-go/deepseek-v4-flash` | low, high, max | codex CLI through the router | v1 evidence for Flash: as reviewer it matched a graded Kimi review and added two real findings with zero false positives; as executor it shipped a false green. It never writes code units. Seats since 2026-08-31: critic, design-runner lanes in both runner panels (a design is a document, not code), interrogate, and the judge pool, all at max. |
| glm | `codex:opencode-go/glm-5.3-flash` | low, high, max | codex CLI through the router | Untested here. Seats since 2026-08-31: critic, design-runner lanes in both runner panels, interrogate, and the judge pool, all at max. Trials still owed. |

Other models the router serves, for trials: `opencode-go/deepseek-v4-pro` (high, max),
`opencode-go/kimi-k3` (low, high, max), `opencode-go/glm-5.3` (high, max), `gpt-5.6-luna`
and `gpt-5.6-terra` (low to max). The full catalog is
[`~/.codex/codex-router/merged-models.json`](file:///C:/Users/nirdr/.codex/codex-router/merged-models.json).

## 2. Decisions, newest first

| date | decision | reason | source |
|---|---|---|---|
| 2026-08-31 | Batch ruling before the pilot: every seat runs at or near its family ceiling. Supersedes the escalation-headroom target of 2026-08-28 and the superseded same-day rows below. | The founder chose maximum capability up front over effort headroom. The escalation ladder is now: respawn fresh, `hardest tasks`, re-arena, scrap. | founder batch, the six rows below |
| 2026-08-31 | `feature, refactoring` = `opus@max`. grok becomes panel-only. | The opus later-phases plan lands as the writer seat for the largest units. grok's failed probe leaves the writer path; the re-probe note stays for its panel lanes. | founder: "Feature and refactoring should go opus@max" |
| 2026-08-31 | `bug-fix`, `perf-issue`, `hillclimb` = `sol@max`. | Ceiling over headroom. Supersedes the same-day xhigh row. | founder: "Bugfix,pers issue, hillclimb sol@max" |
| 2026-08-31 | `judgment and prose` = `fable@max` and `how explainer` = `fable@max`. | Supersedes the same-day and 2026-08-30 "high is enough" rows. | founder batch |
| 2026-08-31 | `how critics` = fable@max, sol@max, grok@xhigh, deepseek@max, glm@max, opus@xhigh. | Fable rejoins the panel and opus joins at xhigh. Supersedes the fable removal, and narrows "opus always at max" to the writer, investigator, and judge seats. | founder: "How critics: add fable@max opus@xhigh" |
| 2026-08-31 | The why and reflect rows leave `inherit-parent` and split: `why investigators` = opus@max, `why synthesizer` = fable@max, `reflect tooling` = sol@max, `reflect judgment, divergent, synthesizer` = fable@max. | Native Claude lanes keep the MCP surface, so the MCP reason for inherit-parent does not bind them. `reflect tooling` on sol is an external lane with no MCP surface; flagged, ruled anyway. | founder batch |
| 2026-08-31 | `arena runners` and `architect runners` = six standing lanes: opus@xhigh, deepseek@max, and glm@max join. `interrogate reviewers` adds opus@xhigh. `swarm workers` = opus@xhigh. | The wide-solution-space conditional lanes become standing lanes. Two Claude lanes now sit in each wide panel; the founder accepted the shared-vendor overlap for the extra view. | founder batch |
| 2026-08-31 | `judgment and prose` = `fable@high`. | Station 9 is normally the lead itself, writing from its own memory of the decisions. The sheet row fires only for delegated prose, and prose from artifacts needs high, not max, the explainer logic. | founder: "yes fabel@high is enough" |
| 2026-08-31 | `interrogate reviewers` = fable@max, sol@max, grok@xhigh, deepseek@max, glm@max. Opus out. | Opus was a second Claude lane, the D2 and G5 defect. Flash's proven seat is reviewing, so deepseek and glm join at max. Fable stays: it reviews another family's code, which is the case that earns it a panel seat. The writer's-family lane stays for recall and its silence reads as weak evidence. | founder: "I2 revieweres currently both opus and fabel and no glm and no deepseek" |
| 2026-08-31 | The sol writer roles, `bug-fix`, `perf-issue`, `hillclimb`, run at `xhigh`. | One step of headroom below the ceiling, so raising sol to max is a real escalation rung instead of a wall. The same reasoning pinned sol at xhigh for v1's plan gate, deliberately one tier below max. | founder: "sol@xhigh on X2" |
| 2026-08-31 | Arena variety: every runner gets a distinct structural direction from the lead, and a wide-solution-space item adds deepseek@max and glm@max lanes on top of the core three. | Smart models given the same open prompt converge on the same respectable design. Directions force the space open at no cost; extra families make the priors disagree exactly when the space is wide. pstack's arena allows extra lanes: "spawn more when the arena covers multiple design directions". | founder: "for D2 what should we tailer variety as well as intelliegence ?" |
| 2026-08-31 | Opus leaves `architect runners` and `arena runners`. The runners are fable@max, sol@max, grok@xhigh. | Designing is fable's seat by the judgment rule, and a second Claude candidate correlates with fable's, so it buys a near-duplicate design package plus a judge read. Independence comes from sol and grok. Opus keeps only the judge pool fallback. | founder: "D2 is not logical to have bothe fable@max here and opus@max - what is best to keep" |
| 2026-08-31 | `how explorer` = `sol@high`, off grok. | The founder narrowed the seat to opus or sol. Opus draws from the same scarce Claude pool as the lead, and the explorers are the heaviest raw readers in the flow, so sol. Reading code for pointers is retrieval and needs high, not max. sol read repos well in every v1 gate. | founder: "what about chnaging is to something else than grok. i think either opus or sol" |
| 2026-08-31 | `how critics` = sol@max, grok@xhigh, deepseek@max, glm@max. Fable leaves the panel. | The ruler at G6 is fable, so a fable critic shares the ruler's blind spots, and with deepseek and glm seated the panel keeps four cross-family lanes without it. The lead still reads every finding with fable attention before ruling. The dropped lane was the most expensive on the sheet. | founder: "Add G5 more critics @ highest effort. glm and deepseek" then "why G5 need fable ?" |
| 2026-08-31 | Two families added: deepseek and glm, both through the codex router, both seated in the arena judge pool. The matrix edit is one plugin cache file, `provider-dispatch.md`, re-applied after updates. | A pool seat costs nothing until a judge is picked, satisfies setup's one-descriptor-per-family rule, and gives the arena judges from outside Claude and OpenAI. Promotion to reviewer or writer lanes goes through the trial ladder. | founder: "I want to add deepseek and glm 5.3 through codex provider ... I want minimal plugin changes" |
| 2026-08-31 | Station 6 driving and station 7 per-commit builds go to `mechanical` too. The lead only judges: the evidence verdict in 6, the report read in 7. | Driving the verify skill is following written instructions, and building every commit is tool churn. Judgment is reading what came back. | founder: "why we need fable to drive the verify running ( not the judgment of its results)" |
| 2026-08-30 | The lead stays fable at the session default effort, high. Tool-heavy work without judgment, the station 7 rebase and the station 10 git commands, goes to the `mechanical` agent on sonnet. Never to a fork: a fork runs on the parent's own model. | Fable calls are scarce next to the other providers, and a mechanical step spends them on tool rounds, not judgment. The lead decides, the mechanical executes, the lead checks once. | founder: "I like lead to be fable default which is @high. But any mechanics like this is a waste ... more fable calls which are scarce" |
| 2026-08-30 | `arena cross-judge pool` = sol@max, grok@xhigh, opus@max. Fable is out. Fable stays an `architect runners` lane. | The arena picks a judge whose provider differs from the lead's and the front-runner's. The lead is fable, so a fable judge is never picked, and opus (same provider) only when sol and grok both drop out. Fable still designs: designing is judgment under uncertainty, and the cross-judge plus the hidden rubric guard against the lead preferring its own model's design. | founder: "D2 and d4 why fable in the loop ?" |
| 2026-08-30 | Opus runs at `max` wherever it sits. The matrix default effort for the opus family is `max`, not the shipped `xhigh`. | Opus holds a seat only as the judge that differs from a fable front-runner. A judge at less than full effort defeats the reason it is there. | founder: "When we need max effort for opus it should be opus@max" |
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
- Two lanes from one vendor are one view. A panel is three vendors or it is not a panel. The
  2026-08-31 batch seats fable and opus together in the wide panels; the founder accepted
  the shared-vendor overlap for the extra lane.
- pstack calls its shipped efforts minimums and lets the lead raise them. We treat the sheet
  as the ceiling too: a lead that wants more effort says so in its report, and the sheet
  changes on a rerun of setup.
- A model change is a trial first (section 7 of the workflow file): replay one station, then
  an arena head to head, then one item end to end in two cloud sessions. A false green ends
  the trial.
- The why and reflect rows are pinned to native Claude lanes, which keep the MCP surface.
  `reflect tooling` on sol is the ruled exception and has no MCP surface (2026-08-31).

## 5. Fallback when fable is out of credit

Nothing falls back on its own: the platform's fallback model never fires on a billing error
(measured in v1), and pstack records a dead lane as a dropout rather than substituting. The
manual procedure, two moves:

1. The lead: type `/model opus` in the session. The item continues. Type `/model fable` when
   credit returns.
2. The sheet: hand-edit [`~/.claude/pstack-models.md`](file:///C:/Users/nirdr/.claude/pstack-models.md)
   and swap every `claude:claude-fable-5` descriptor to `claude:claude-opus-5@max` (every
   fable row is at max since 2026-08-31). In a panel where opus already holds a lane, drop
   the fable lane instead of seating opus twice. Opus is a matrix family, so the rows stay
   valid at the next setup run. Revert the same lines afterwards.

A session limit is not out of credit. The five-hour window is account-wide and heals itself.
Never set a timer for the reset, and never fall back for it.

## 6. Open questions

- Panel efforts: `fable@max` and `sol@max` in the panels are the shipped values, untested
  against `@high` for the same recall.
- terra and luna have v1 evidence as reviewers and no seat in the first write. Candidates for
  `interrogate reviewers` on the first rerun.
- deepseek and glm hold critic, design-runner, interrogate, and judge seats by ruling with no
  ai4good trial yet. The v1 Flash evidence covers review only, and as code writers they stay
  disqualified by the v1 false green. deepseek-v4-pro, the writer-candidate variant, stays on
  the later-trials list.
- There is no verifier role. Station 6 evidence is judged by the lead; the `mechanical` agent
  drives the skill.
- The opus later-phases plan landed 2026-08-31: the feature writer at max, the why
  investigator at max, panel lanes at xhigh, swarm workers at xhigh. Open: what the opus@max
  feature writer costs on the pilot item, and how much of the shared Claude pool the seats
  spend next to the lead.
