export const meta = {
  name: 'prd-improvement-loop',
  description: 'Per-leaf PRD improvement loop, agents-only (no python orchestration): codex evaluate -> Sonnet-xhigh rewrite -> agent splice + validator -> Haiku clean-room closer -> readiness ledger. Never evaluates the whole PRD at once.',
  whenToUse: 'args {mode:"baseline"|"iterate", runId:"<stamp>", only:[leafIds]?, targets:<n>?}. baseline = judge every leaf per-leaf in parallel. iterate = rewrite worst-first (or `only`) leaves into loop/out/prd.candidate.md. Smoke = iterate with only:["REQ-035"].',
  phases: [
    { title: 'Gate', detail: 'validator 100% + [DECISION] marker census (agent runs the repo validator)' },
    { title: 'Leaves', detail: 'leaf map via grep + target selection' },
    { title: 'PerLeaf', detail: 'pipeline: codex evaluate -> Sonnet xhigh generate -> splice+validate -> Haiku clean-room closer', model: 'sonnet' },
    { title: 'Report', detail: 'leaf-status ledger + decision queue + scores append' },
  ],
}

// ---------------------------------------------------------------- constants
const ROOT = 'C:/Users/nirdr/Downloads/ai4good'
const PRD = '.taskmaster/docs/prd.md'
const CAND = 'loop/out/prd.candidate.md'
// The repo's PRE-EXISTING 13-check validator (a quality tool the loop calls; the loop's
// own orchestration is agents-only — founder call, 2026-07-05: no python orchestration).
const VALIDATE = 'python .claude/skills/prd-taskmaster/script.py validate-prd --input'
const CODEX = 'codex exec --sandbox read-only --skip-git-repo-check -c model_reasoning_effort=xhigh'
const MODE = (args && args.mode) || 'baseline'
const RUN_ID = (args && args.runId) || 'run-unstamped'   // Date.now() unavailable by design
const ONLY = (args && args.only) || null
const TARGETS = (args && args.targets) || 5
const MAX_CALLS = 60
let calls = 0
function guard(n) { if (calls + n > MAX_CALLS) throw new Error(`call cap ${MAX_CALLS} exceeded`); calls += n }

const EXEMPT = ['REQ-005.5', 'REQ-017', 'REQ-018', 'REQ-019', 'REQ-020', 'REQ-022']

const GATE_SCHEMA = { type: 'object', properties: { gate: { type: 'string', enum: ['PASS', 'FAIL'] }, validator_pct: { type: 'number' }, marker_count: { type: 'number' }, notes: { type: 'array', items: { type: 'string' } } }, required: ['gate', 'validator_pct', 'marker_count'] }
const LEAVES_SCHEMA = { type: 'object', properties: { leaves: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, heading: { type: 'string' }, start: { type: 'number' }, end: { type: 'number' } }, required: ['id', 'heading', 'start', 'end'] } } }, required: ['leaves'] }
const EVAL_SCHEMA = { type: 'object', properties: { section: { type: 'string' }, verdict: { type: 'string', enum: ['ready', 'needs-work', 'blocked'] }, score: { type: 'number' }, critique: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, issue: { type: 'string' }, evidence: { type: 'string' } }, required: ['label', 'issue'] } }, blocking_questions: { type: 'array', items: { type: 'string' } } }, required: ['section', 'verdict', 'score'] }
const GEN_SCHEMA = { type: 'object', properties: { section: { type: 'string' }, new_text: { type: 'string' } }, required: ['section', 'new_text'] }
const SPLICE_SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' }, validator_pct: { type: 'number' }, marker_count_canonical: { type: 'number' }, marker_count_candidate: { type: 'number' }, error: { type: 'string' } }, required: ['ok'] }
const CLOSE_SCHEMA = { type: 'object', properties: { section: { type: 'string' }, verdict: { type: 'string', enum: ['resolved-all', 'partially-resolved', 'unresolved'] }, resolved: { type: 'array', items: { type: 'string' } }, unresolved: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, why: { type: 'string' } }, required: ['issue', 'why'] } }, new_defects: { type: 'array', items: { type: 'string' } } }, required: ['section', 'verdict', 'resolved', 'unresolved'] }
const OK_SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }

// codex courier recipe: bash-native (npm's sh shim — none of the Windows CMD pain),
// prompt via stdin redirect, final message captured to a file with -o.
function codexRecipe(promptSpec, label) {
  return `Working dir: ${ROOT}. You are a deterministic courier — do not add your own judgment to the payload.
1. ${promptSpec}
2. Write the final prompt text to ${ROOT}/loop/out/prompt-${label}.txt (Write tool; create loop/out if needed).
3. Run in FOREGROUND Bash with the timeout parameter set to 600000 (ten minutes; do NOT use run_in_background):
   cd "${ROOT}" && ${CODEX} -o "loop/out/lastmsg-${label}.txt" - < "loop/out/prompt-${label}.txt" > "loop/out/log-${label}.txt" 2>&1
4. Read loop/out/lastmsg-${label}.txt and parse the JSON payload from it. If the file is missing or unparseable, retry the codex command ONCE with "-r" appended to every ${label} filename.
5. Return the parsed payload via structured output. If both attempts fail, return an empty payload.`
}

// ---------------------------------------------------------------- Gate
phase('Gate')
guard(1)
const gate = await agent(
  `Working dir: ${ROOT}. Run these two commands in Bash and report results EXACTLY:
1. cd "${ROOT}" && ${VALIDATE} ${PRD}   — find "percentage" in the JSON output (must be 100.0).
2. cd "${ROOT}" && grep -c "\\[DECISION: OD-" ${PRD}   — the [DECISION] marker count (must be >= 6).
Return {gate: "PASS" if both hold else "FAIL", validator_pct, marker_count, notes: [<any anomaly>]} via structured output.`,
  { label: 'gate', phase: 'Gate', model: 'haiku', effort: 'low', schema: GATE_SCHEMA })
log(`gate: ${gate ? `${gate.gate} (validator ${gate.validator_pct}%, markers ${gate.marker_count})` : 'agent failed'}`)
if (!gate || gate.gate !== 'PASS') return { mode: MODE, runId: RUN_ID, stopped: 'gate-failed', gate }

// ---------------------------------------------------------------- Leaves
phase('Leaves')
guard(1)
const leafMap = await agent(
  `Working dir: ${ROOT}. Build the PRD leaf map:
1. Bash: cd "${ROOT}" && grep -n -E "^#### REQ-|^### Story " ${PRD}
2. Bash: cd "${ROOT}" && wc -l < ${PRD}
Each grep hit starts a leaf; it ends one line before the next hit (the last leaf ends at the file's line count). id = the "REQ-NNN" (or "REQ-NNN.5") token in the heading if present, else the "Story N" prefix. heading = the heading text without leading #.
Return {leaves: [{id, heading, start, end}]} for ALL hits, in file order, via structured output.`,
  { label: 'leaves', phase: 'Leaves', model: 'haiku', effort: 'low', schema: LEAVES_SCHEMA })
const scopeLeaves = leafMap.leaves.filter(l => l.id.startsWith('REQ-') && !EXEMPT.includes(l.id))

let targets
if (ONLY) {
  targets = scopeLeaves.filter(l => ONLY.includes(l.id))
  if (targets.length === 0) return { mode: MODE, runId: RUN_ID, stopped: `none of ${JSON.stringify(ONLY)} found in scope` }
} else if (MODE === 'baseline') {
  targets = scopeLeaves
} else {
  guard(1)
  const worst = await agent(
    `Working dir: ${ROOT}. Read ${ROOT}/loop/state/scores.jsonl (JSONL). Take the LATEST run's entries (max run field), keep verdict != "ready", sort by score ascending, and return {leaves:[{id:"<REQ id from the heading>", heading:"<heading>", start:0, end:0}]} for the worst ${TARGETS} via structured output.`,
    { label: 'worst-first', phase: 'Leaves', model: 'haiku', effort: 'low', schema: LEAVES_SCHEMA })
  targets = worst.leaves.map(w => scopeLeaves.find(l => l.id === w.id)).filter(Boolean)
  if (targets.length === 0) return { mode: MODE, runId: RUN_ID, stopped: 'nothing-to-improve (no prior baseline or all leaves ready)' }
}
log(`${targets.length} leaf(s) in this run: ${targets.map(t => t.id).join(', ')}`)

// ---------------------------------------------------------------- Per-leaf pipeline
// Each leaf flows independently: evaluate -> (generate -> splice -> close)? -> record.
// ONE leaf per judgment, always. No routing, no fallbacks: every rewrite is Sonnet xhigh.
phase('PerLeaf')
guard(targets.length)
const records = await pipeline(targets,

  // Stage 1 — evaluate ONE leaf (codex; reads the leaf + its Dependencies sections as context)
  (leaf) => agent(
    codexRecipe(
      `Read ${ROOT}/loop/prompts/evaluator_leaf.md and replace {TARGET} with this line:\n- ${leaf.heading} (lines ${leaf.start}-${leaf.end})`,
      `eval-${leaf.id}-${RUN_ID}`),
    { label: `eval:${leaf.id}`, phase: 'PerLeaf', effort: 'low', schema: EVAL_SCHEMA }),

  // Stage 2 — rewrite if warranted, splice+validate, clean-room close
  async (ev, leaf) => {
    if (!ev) return { leaf: leaf.id, heading: leaf.heading, status: 'eval-failed' }
    const actionable = (ev.critique || []).filter(c => c.label !== 'unmade-decision')
    const unmade = (ev.critique || []).filter(c => c.label === 'unmade-decision')
    const record = { leaf: leaf.id, heading: leaf.heading, eval: ev, unmade, status: ev.verdict }
    if (MODE === 'baseline') return record
    if (ev.verdict === 'ready' || actionable.length === 0) return record

    guard(3)
    // GENERATOR — Sonnet xhigh, the only rewrite path (no routing, no fallbacks)
    const gen = await agent(
      `Working dir: ${ROOT}. You are the GENERATOR. First Read ${ROOT}/loop/prompts/generator_prefix.md and obey every hard rule in it (vague-word ban, [DECISION] marker prohibition, invariant preservation). Then Read ${ROOT}/loop/state/lessons.jsonl (apply lessons whose applies_when matches) and ${ROOT}/loop/state/decisions.jsonl (normative claims must trace to entries). Read the section "${leaf.heading}" (lines ${leaf.start}-${leaf.end}) from ${ROOT}/${PRD} — and, for context only, the sections its Dependencies line names.\nResolve THIS critique, surgically — change nothing the critique does not require:\n${JSON.stringify(actionable, null, 2)}\nBlocking questions to answer in the text where the decision ledger supports an answer (otherwise leave a [DECISION: <question>] marker):\n${JSON.stringify(ev.blocking_questions || [])}\nReturn {section: "${leaf.id}", new_text: "<full replacement section including the #### heading line>"} via structured output.`,
      { label: `gen:${leaf.id}`, phase: 'PerLeaf', model: 'sonnet', effort: 'xhigh', schema: GEN_SCHEMA })
    if (!gen || !gen.new_text) return { ...record, status: 'gen-failed' }

    // SPLICE + VALIDATE — agent file surgery; candidate only, never the canonical
    const splice = await agent(
      `Working dir: ${ROOT}. Apply a section rewrite to the CANDIDATE copy of the PRD — NEVER touch ${PRD} itself.
1. Bash: cd "${ROOT}" && [ -f ${CAND} ] || cp ${PRD} ${CAND}
2. Write the SECTION TEXT below to ${ROOT}/loop/out/gen-${leaf.id}.md exactly (Write tool).
3. Replace the section in the candidate. Bash (verify each step's output):
   cd "${ROOT}" && S=$(grep -n -F "${leaf.heading}" ${CAND} | head -1 | cut -d: -f1) && E=$(awk -v s="$S" 'NR>s && (/^#### /||/^### /){print NR; exit}' ${CAND}) && [ -z "$E" ] && E=$(( $(wc -l < ${CAND}) + 1 )); head -n $((S-1)) ${CAND} > loop/out/.tmp-cand && cat loop/out/gen-${leaf.id}.md >> loop/out/.tmp-cand && echo "" >> loop/out/.tmp-cand && tail -n +$E ${CAND} >> loop/out/.tmp-cand && mv loop/out/.tmp-cand ${CAND}
   (If grep finds no match for the heading, stop and return ok:false with error.)
4. Bash: cd "${ROOT}" && ${VALIDATE} ${CAND}   — find "percentage"; must be 100.0.
5. Bash: cd "${ROOT}" && grep -c "\\[DECISION: OD-" ${PRD} && grep -c "\\[DECISION: OD-" ${CAND}   — candidate count must be >= canonical count.
Return {ok, validator_pct, marker_count_canonical, marker_count_candidate, error?} via structured output. ok=true ONLY if validator is 100.0 AND no marker was lost.
SECTION TEXT:\n${gen.new_text}`,
      { label: `splice:${leaf.id}`, phase: 'PerLeaf', model: 'sonnet', effort: 'low', schema: SPLICE_SCHEMA })
    if (!splice || !splice.ok) return { ...record, status: 'rewrite-rejected', splice }

    // CLOSER — Haiku subagent in a CLEAN ROOM (founder call): fresh context, artifacts only.
    const close = await agent(
      `You are the CLOSER in a PRD-improvement loop. You have NO other context — judge ONLY from the artifacts named here.
1. Read lines ${leaf.start}-${leaf.end} of ${ROOT}/${PRD} (the ORIGINAL section).
2. Read the section titled "${leaf.heading}" in ${ROOT}/${CAND} (the REWRITE).
3. For EACH critique item below, decide from the two texts alone: resolved or unresolved. Quote the rewrite where it resolves an item; say exactly why where it does not.
4. List any NEW defect the rewrite introduced that the original did not have (information lost, ambiguity added, an invariant weakened).
CRITIQUE:\n${JSON.stringify(actionable, null, 2)}
Verdict: "resolved-all" | "partially-resolved" | "unresolved".
Return {section: "${leaf.id}", verdict, resolved: [...], unresolved: [{issue, why}], new_defects: [...]} via structured output.`,
      { label: `close:${leaf.id}`, phase: 'PerLeaf', model: 'haiku', effort: 'medium', schema: CLOSE_SCHEMA })
    return {
      ...record,
      status: !close ? 'closer-failed'
            : (close.new_defects || []).length > 0 ? 'regressed-review-needed'
            : close.verdict === 'resolved-all' ? 'improved'
            : close.verdict === 'partially-resolved' ? 'partially-improved'
            : 'rewrite-ineffective',
      closure: close ? { verdict: close.verdict, resolved: close.resolved.length,
                         unresolved: close.unresolved.length,
                         new_defects: (close.new_defects || []) } : null,
    }
  })

const done = records.filter(Boolean)
log(`per-leaf complete: ${done.map(r => `${r.leaf}=${r.status}`).join(' · ')}`)

// ---------------------------------------------------------------- Report
phase('Report')
const queue = []
for (const r of done) {
  for (const c of (r.unmade || [])) queue.push({ question: c.issue || '', section: r.heading, source: 'evaluator', evidence: c.evidence || '' })
  for (const q of ((r.eval && r.eval.blocking_questions) || [])) queue.push({ question: q, section: r.heading, source: 'blocking-question', evidence: '' })
}
const leafRecords = done.map(r => ({ leaf: r.leaf, section: r.heading, status: r.status,
  score: r.eval ? r.eval.score : null, closure: r.closure || null }))
const scoreLines = done.filter(r => r.eval)
  .map(r => JSON.stringify({ run: RUN_ID, iteration: MODE === 'baseline' ? 0 : 1, ...r.eval, final_status: r.status }))

guard(1)
await agent(
  `Working dir: ${ROOT}. Persist this run's results — three deterministic writes:
1. Write the following JSON to ${ROOT}/loop/out/leaf-status.json (Write tool):\n${JSON.stringify({ run_id: RUN_ID, mode: MODE, leaves: leafRecords }, null, 2)}
2. Write a human-readable decision queue to ${ROOT}/loop/decision-queue.md: title "# Decision queue — run ${RUN_ID}", then for each item a "## Q<n> — <section>" block with the question, source, and evidence. Items:\n${JSON.stringify(queue, null, 2)}\n(If there are zero items, write the title plus "*(empty — no unmade decisions surfaced this run)*".)
3. Append these lines to ${ROOT}/loop/state/scores.jsonl — Bash, one printf per line: printf '%s\\n' '<line>' >> loop/state/scores.jsonl\nLINES:\n${scoreLines.join('\n')}
Return {ok:true} when all three are done.`,
  { label: 'persist', phase: 'Report', model: 'haiku', effort: 'low', schema: OK_SCHEMA })

return {
  mode: MODE, runId: RUN_ID, callsUsed: calls,
  leaves: leafRecords,
  ready: done.filter(r => r.status === 'ready').length,
  blocked: done.filter(r => r.status === 'blocked').length,
  improved: done.filter(r => r.status === 'improved').length,
  queueItems: queue.length,
  candidate: CAND,
  note: 'Agents-only (no python orchestration). Per-leaf only — the whole PRD is never judged in one call. Canonical unchanged; human-accepted diffs only.',
}
