# pstack setup run, 2026-08-31

Session `ebf2407e`. Parent: Claude Code. First run: no sheet existed. The matrix is the
six-family version in the plugin cache (grok on the codex router, opus default max, deepseek
and glm added). Efforts are per role by founder ruling, so the per-family effort questions
were answered by the first-write column of the sheet-roles table in
`.claude/skills/work/pstack-workflow-ai4good.md`.

## Probes

One live probe per family, each a one-turn marker reply, receipts in the session scratchpad.

| family | descriptor probed | route | result |
|---|---|---|---|
| fable | claude:claude-fable-5@max | native agent `pstack-fable-max` | green, exact marker |
| opus | claude:claude-opus-5@max | native agent `pstack-opus-max` | green, exact marker |
| sol | codex:gpt-5.6-sol@max | pstack-runner, codex CLI | green, exact marker, receipt complete, pinned-argv, 50s |
| deepseek | codex:opencode-go/deepseek-v4-flash@max | pstack-runner | green, exact marker, receipt complete, pinned-argv, 28s |
| glm | codex:opencode-go/glm-5.3-flash@max | pstack-runner | green, exact marker, receipt complete, pinned-argv, 50s |
| grok | codex:opencode-go-responses/grok-4.6@xhigh | pstack-runner | FAILED-UPSTREAM, three attempts, identical error |

The grok error, verbatim from the receipts: `opencode rejected the request for Grok 4.6
(opencode Go). (HTTP 400: {"model":"grok-4.6","error":{"message":"Error from provider
(Console Go): Upstream request failed"}})`. The preflight passed and the same route served
deepseek and glm green, so the fault is opencode's Grok 4.6 upstream. A diagnostic probe of
`opencode-go-responses/grok-4.5@high` was green in 19 seconds, which scopes the outage to the
4.6 model.

Founder ruling: keep 4.6 in the sheet and mark the probe failed ("Keep 4.6, mark failed").
**Re-probe grok before its first real use.** Grok holds the feature-writer seat, a critic
lane, an arena runner lane, a judge pool entry, and swarm workers. A dead lane at run time is
a loud dropout, never a silent substitute.

## Writes

- `~/.claude/pstack-models.md`: written, the first-write column, per-role efforts, six
  families, with the grok probe note in its header.
- `~/.claude/CLAUDE.md`: one include line `@~/.claude/pstack-models.md` plus the verifier
  rule (sonnet-class, different family than the writer), under a dated section.

## Deviations from the setup skill, both deliberate

- Per-role efforts instead of one effort per family. The model-selection file is the
  authority; a setup rerun must re-apply per-role values instead of normalizing.
- The sheet was written with one probe failed, on the founder's ruling above. The skill's
  own rule is that a failed probe writes nothing.

## Smoke

Behavioral smoke: PASS, four for four. One read-only task, name the standing rules of the
project CLAUDE.md section 5, run on fable@high (native), sol@xhigh, deepseek@max, and
glm@max (runner lanes, receipts complete), judged by opus@max against the file on disk. All
four answers accurate, no invented rule, every marker present. Lane times: fable 12s, sol
34s, deepseek 48s, glm 65s. The judge graded glm content-faithful with weak structure. Grok
was the recorded dropout throughout, per the founder's ruling above.

Setup is complete. The remaining bring-up steps are the verification skill and the pilot
item.
