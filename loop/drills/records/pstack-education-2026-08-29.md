# open-pstack education — what the founder raised and what held (2026-08-27..29)

Session `ebf2407e` (workflow-opt). Source: ericlitman/open-pstack read file by file
(provider-dispatch, setup-pstack, how, architect, arena, interrogate + rubric,
create-verification-skill, feature/eval/orchestrate/opening-a-pr playbooks, babysit,
pstack-runner). This record keeps the answers to the questions the founder raised —
integration, role selection, escalation, trials — not the whole walkthrough.

---

## 1. The flow map, with sheet roles and models per station

The standing format: always expanded, never folded.

| # | station | who acts | sheet role → default model |
|---|---|---|---|
| 1 | Ground (`/how`) | 2–4 disjoint explorers → one explainer → opt-in critics | how explorer, how explainer, how critics — cross-family panel |
| 2 | Design arena | architect runners fan out; cross-judges score against a hidden rubric; the LEAD reads all end to end, picks a base, grafts | architect runners; arena cross-judge pool (judge ≠ parent's provider ≠ front-runner's) |
| 3 | Throughput checkpoint | the lead alone | none — lead model |
| 4 | Write | ONE delegated writer per unit, isolated-write worktree, red-green tests first | feature / refactoring (grok@xhigh default), bug-fix / perf (sol@max) |
| 5 | Diff vs sketch | the lead alone | none — lead model |
| 6 | Verify | the lead drives the project's `verify-<app>` skill on the real surface | none — lead model |
| 7 | Sequence | the lead alone — each commit builds and verifies alone | none — lead model |
| 8 | Interrogate | read-only reviewer panel, identical rubric each; lead rules Act On / Consider / Noted / Dismissed | interrogate reviewers — panel list length = fan-out count |
| 9 | Ship (`opening-a-pr`) | the lead + deslop passes; babysit is a separate verb | judgment and prose (fable@max) for the PR text |

Roles that stay on the parent: why + reflect (inherit-parent, they need MCP).
Janitorial verbs (babysit, fix-ci, deslop, recall) ride the lead, unpinned.

## 2. How roles wire to models (integration of opencode/codex models)

- The contract is `provider-dispatch.md`: descriptor grammar `provider:model@effort`, a
  4-family matrix (fable, sol, grok, opus), and a route table — `claude:*` runs native
  Agent calls through ten pinned agents; everything else goes through the external
  `pstack-runner` CLI, one lane per call, receipts record the exact flags.
- `~/.claude/pstack-models.md` is the role→descriptor sheet. `setup-pstack` writes it,
  asks one effort question per family, and LIVE-PROBES all four pairs. A failed probe
  writes nothing.
- **Consequence for us**: no Grok CLI on this machine → the grok row MUST be swapped in
  `provider-dispatch.md` for an opencode-family row BEFORE running setup, or setup blocks.
- `pstack-runner` takes the model as a FREE STRING — the 4-family limit is prose, not
  code. So opencode models through the codex router (sol, luna, Kimi) drop in by editing
  the matrix and re-running setup. New model later = edit matrix, re-run setup, re-probe.
- Unknown role names in the sheet are "inconsistent state" — custom rows trip validation.
  Extra rules (a verifier rule, a tier map) go in `~/.claude/CLAUDE.md` lines, not the sheet.
- CLAUDE.md footprint: setup adds ONE include line to the USER-level file. The project
  CLAUDE.md is never touched.

## 3. Role selection — the escalation-ready sheet

Designed for the founder's fleet (fable native; sol/luna/Kimi via codex):

- Writers pinned at `@high`, not max — effort headroom IS the first escalation rung.
- `hardest tasks: claude:claude-fable-5@max` — the named escalation target.
- Panels are 3-lane and cross-vendor: fable / sol / luna. Never two lanes from one
  family — same-family agreement is not independence.
- Opus sits in the judge pool only, never as a writer lane.
- No verifier role exists in pstack (a real gap). The rule "verifier is sonnet-class and a
  different family than the writer" lives as a CLAUDE.md line the lead reads.

## 4. Escalation paths (the write phase question)

Workers cannot ask questions — escalation is post-hoc, through reports:

1. In-lane: the writer's own red-green loop and retries.
2. REPORT: `BLOCKED`, deviations list, or a timeboxed partial — never silent.
3. Lead: respawn fresh (context rot is real), raise effort, move the unit to the
   hardest-tasks role, re-arena the design, or scrap the loop entirely.
4. Human: irreversible acts, unsettleable calls, batched at gates.

Retry-by-mode: two retries, then abandon and replan — never a third identical attempt.

## 5. Testing a candidate model for a sheet role

Ladder, cheapest first:
1. Role-level answer-keyed replay: rerun a finished station's inputs (receipts hold them)
   with the candidate in that one seat; grade against the known-good output.
2. Arena head-to-head: candidate and incumbent as two lanes on the same task, one
   cross-family judge.
3. Full end-to-end dual run only as final confirmation — in TWO CLOUD SESSIONS, not two
   worktrees (database slots and CPU contend on one machine), scored per station from
   receipts, blinded per the eval playbook.
- The eval playbook's blinding rules: no eval/test/judge/candidate words anywhere visible,
  organic prompts, sanitized project-shaped directories, one blinded cross-family judge,
  single pass, verification read from transcripts.
- A false green disqualifies a candidate at any price. Cost decides only between models
  that both told the truth.

## 6. Lead-context and cache discipline (cloud session)

- `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` + `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL=1h` are
  committed in the project `.claude/settings.json` env block (inert until the 2.1.242
  client; this machine runs 2.1.238).
- The per-item cloud lead dies at item close. At every phase boundary it writes a canon
  file — compact-proof and crash-resume in one. Autocompact stays on.
- The local controller cannot remote-compact the cloud session. The move is
  canon-then-fresh-session, never keep-alive wakes.

## 7. Where our gates splice in

- Gate 1 equivalent: the design arena plus an interrogate pass over the PLAN — swap the
  rubric for our plan rubric.
- Gate 2 equivalent: interrogate over the diff. pstack has NO re-clearance loop after
  fixes; the splice is one added rubric line — "a changed head voids the verdict;
  re-panel."
- New work discovered mid-flow: accumulated in the report, never built as a rider. The
  controller judges it as a filing candidate; the founder files items.

## 8. The v2 shape and what is still open

Local controller (Linear MCP, item pickup, PRD slice, branch from origin/main, brief) →
cloud poteto-mode mechanic (Docker Supabase + codex/opencode OAuth, founder-tested) →
PR back → local gate, verify, merge, board closes. The v1 relay is frozen as fallback;
the constitution layer (board rules, evidence bar, attribution, CI guards) binds both.

Pre-install checklist (at the terminal, not Remote Control): install plugin → delete the
auto-fire `hooks/hooks.json` from the plugin cache (else poteto-mode hijacks /work
sessions; an update restores it) → swap the grok matrix row → `/setup-pstack` → adjust
the sheet to the escalation-ready shape → add the CLAUDE.md tier-map and verifier lines.

Open founder rulings: who gates the merge (recommended: local), the evidence bar written
into the brief, one PR per item vs stacks.
