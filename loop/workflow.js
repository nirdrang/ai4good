export const meta = {
  name: 'prd-improvement-loop',
  description: 'Per-leaf PRD improvement loop: each leaf flows independently through codex evaluate -> Sonnet-xhigh rewrite -> splice verify -> codex pairwise -> readiness status. Never evaluates the whole PRD at once.',
  whenToUse: 'args {mode:"baseline"|"iterate", runId:"<stamp>", only:[leafIds]?, targets:<n>?}. baseline = judge every leaf (per-leaf, parallel). iterate = rewrite worst-first (or `only`) leaves into loop/out/prd.candidate.md. Smoke = iterate with only:["REQ-035"].',
  phases: [
    { title: 'Gate', detail: 'deterministic gate via orchestrate.py (courier)' },
    { title: 'Leaves', detail: 'leaf map + target selection' },
    { title: 'PerLeaf', detail: 'pipeline: codex evaluate -> Sonnet xhigh generate -> splice -> codex pairwise', model: 'sonnet' },
    { title: 'Distill', detail: 'Haiku lessons update (defect classes only)' },
    { title: 'Report', detail: 'render report + decision queue + leaf-status ledger' },
  ],
}

// ---------------------------------------------------------------- constants
const ROOT = 'C:/Users/nirdr/Downloads/ai4good'
const PY = `python ${ROOT}/loop/orchestrate.py`
const MODE = (args && args.mode) || 'baseline'
const RUN_ID = (args && args.runId) || 'run-unstamped'   // Date.now() unavailable by design
const ONLY = (args && args.only) || null                 // explicit leaf ids (smoke / scoped runs)
const TARGETS = (args && args.targets) || 5              // worst-first count in iterate mode
const MAX_CALLS = 60
let calls = 0
function guard(n) { if (calls + n > MAX_CALLS) throw new Error(`call cap ${MAX_CALLS} exceeded`); calls += n }

const EXEMPT = ['REQ-005.5', 'REQ-017', 'REQ-018', 'REQ-019', 'REQ-020', 'REQ-022']

const GATE_SCHEMA = { type: 'object', properties: { gate: { type: 'string' }, findings: { type: 'array', items: { type: 'object' } } }, required: ['gate', 'findings'] }
const LEAVES_SCHEMA = { type: 'object', properties: { leaves: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, heading: { type: 'string' }, start: { type: 'number' }, end: { type: 'number' } }, required: ['id', 'heading'] } } }, required: ['leaves'] }
const EVAL_SCHEMA = { type: 'object', properties: { section: { type: 'string' }, verdict: { type: 'string', enum: ['ready', 'needs-work', 'blocked'] }, score: { type: 'number' }, critique: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, issue: { type: 'string' }, evidence: { type: 'string' } }, required: ['label', 'issue'] } }, blocking_questions: { type: 'array', items: { type: 'string' } } }, required: ['section', 'verdict', 'score'] }
const GEN_SCHEMA = { type: 'object', properties: { section: { type: 'string' }, new_text: { type: 'string' } }, required: ['section', 'new_text'] }
const SPLICE_SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' }, validator_pct: { type: 'number' }, markers_lost: { type: 'array', items: { type: 'string' } } }, required: ['ok'] }
const PAIR_SCHEMA = { type: 'object', properties: { results: { type: 'array', items: { type: 'object', properties: { section: { type: 'string' }, pairwise: { type: 'string' }, resolved: { type: 'array', items: { type: 'string' } }, remaining: { type: 'array', items: { type: 'object' } } }, required: ['section', 'pairwise'] } } }, required: ['results'] }
const OK_SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }

// Courier recipe for codex-backed judgment. Foreground Bash with a 10-minute timeout;
// per-leaf prompts keep every call small.
function codexCourier(promptSpec, label, jsonShapeNote) {
  return `Working dir: ${ROOT}. You are a deterministic courier — do not add your own judgment to the payload.
1. ${promptSpec}
2. Save the final prompt text to ${ROOT}/loop/out/prompt-${label}.txt (Write tool; create loop/out if needed).
3. Run in FOREGROUND Bash with the timeout parameter set to 600000 (ten minutes; do NOT use run_in_background): cd "${ROOT}" && ${PY} codex-call "loop/out/prompt-${label}.txt" "${label}" > "loop/out/courier-${label}.txt" 2>&1
4. When the command returns, Read loop/out/courier-${label}.txt. If the command timed out, retry it ONCE the same way with label "${label}-t".
5. Parse the JSON payload (${jsonShapeNote}). If parsing fails, retry the codex call ONCE with label "${label}-r".
6. Return the parsed payload via structured output. If both attempts fail, return an empty payload.`
}

// ---------------------------------------------------------------- Gate
phase('Gate')
guard(1)
const gate = await agent(
  `Working dir: ${ROOT}. Run in Bash: cd "${ROOT}" && ${PY} gate — return its JSON (fields gate, findings) verbatim via structured output.`,
  { label: 'gate', phase: 'Gate', model: 'haiku', effort: 'low', schema: GATE_SCHEMA })
log(`gate: ${gate ? gate.gate : 'agent failed'}`)
if (!gate || gate.gate !== 'PASS') return { mode: MODE, runId: RUN_ID, stopped: 'gate-failed', findings: gate ? gate.findings : [] }

phase('Leaves')
guard(1)
const leafMap = await agent(
  `Working dir: ${ROOT}. Run in Bash: cd "${ROOT}" && ${PY} leaves — it prints a JSON array of {id, heading, start, end}. Return {leaves: <that array>} via structured output.`,
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
    `Working dir: ${ROOT}. Read ${ROOT}/loop/state/scores.jsonl (JSONL). Take the LATEST run's entries (max run field), keep verdict != "ready", sort by score ascending, and return {leaves:[{id:"<REQ id from the heading>", heading:"<heading>"}]} for the worst ${TARGETS} via structured output.`,
    { label: 'worst-first', phase: 'Leaves', model: 'haiku', effort: 'low', schema: LEAVES_SCHEMA })
  targets = worst.leaves.map(w => scopeLeaves.find(l => l.id === w.id)).filter(Boolean)
  if (targets.length === 0) return { mode: MODE, runId: RUN_ID, stopped: 'nothing-to-improve (no prior baseline or all leaves ready)' }
}
log(`${targets.length} leaf(s) in this run: ${targets.map(t => t.id).join(', ')}`)

// ---------------------------------------------------------------- Per-leaf pipeline
// Each leaf flows independently: evaluate -> (generate -> verify -> judge)? -> record.
// NEVER the whole PRD in one judgment. No routing, no model fallbacks:
// every rewrite is Sonnet at xhigh (founder call, 2026-07-05).
phase('PerLeaf')
guard(targets.length)  // evaluations
const records = await pipeline(targets,

  // Stage 1 — evaluate ONE leaf (codex reads the leaf + its Dependencies sections as context)
  (leaf) => agent(
    codexCourier(
      `Read ${ROOT}/loop/prompts/evaluator_leaf.md and replace {TARGET} with this line:\n- ${leaf.heading} (lines ${leaf.start}-${leaf.end})`,
      `eval-${leaf.id}-${RUN_ID}`, 'ONE JSON object for this section'),
    { label: `eval:${leaf.id}`, phase: 'PerLeaf', effort: 'low', schema: EVAL_SCHEMA }),

  // Stage 2 — rewrite if warranted (Sonnet xhigh, no fallbacks), verify, judge
  async (ev, leaf) => {
    if (!ev) return { leaf: leaf.id, heading: leaf.heading, status: 'eval-failed' }
    const actionable = (ev.critique || []).filter(c => c.label !== 'unmade-decision')
    const unmade = (ev.critique || []).filter(c => c.label === 'unmade-decision')
    const record = { leaf: leaf.id, heading: leaf.heading, eval: ev, unmade, status: ev.verdict }
    if (MODE === 'baseline') return record
    if (ev.verdict === 'ready' || actionable.length === 0) return record

    guard(3)
    const gen = await agent(
      `Working dir: ${ROOT}. You are the GENERATOR. First Read ${ROOT}/loop/prompts/generator_prefix.md and obey every hard rule in it (vague-word ban, [DECISION] marker prohibition, invariant preservation). Then Read ${ROOT}/loop/state/lessons.jsonl (apply lessons whose applies_when matches) and ${ROOT}/loop/state/decisions.jsonl (normative claims must trace to entries). Read the section "${leaf.heading}" (lines ${leaf.start}-${leaf.end}) from ${ROOT}/.taskmaster/docs/prd.md — and, for context only, the sections its Dependencies line names.\nResolve THIS critique, surgically — change nothing the critique does not require:\n${JSON.stringify(actionable, null, 2)}\nBlocking questions to answer in the text where the decision ledger supports an answer (otherwise leave a [DECISION: <question>] marker):\n${JSON.stringify(ev.blocking_questions || [])}\nReturn {section: "${leaf.id}", new_text: "<full replacement section including the #### heading line>"} via structured output.`,
      { label: `gen:${leaf.id}`, phase: 'PerLeaf', model: 'sonnet', effort: 'xhigh', schema: GEN_SCHEMA })
    if (!gen || !gen.new_text) return { ...record, status: 'gen-failed' }

    const splice = await agent(
      `Working dir: ${ROOT}. Write the following section text EXACTLY to ${ROOT}/loop/out/gen-${leaf.id}.md (Write tool), then run in Bash: cd "${ROOT}" && ${PY} splice "${leaf.id}" "loop/out/gen-${leaf.id}.md" — return its JSON verdict via structured output.\nSECTION TEXT:\n${gen.new_text}`,
      { label: `splice:${leaf.id}`, phase: 'PerLeaf', model: 'haiku', effort: 'low', schema: SPLICE_SCHEMA })
    if (!splice || !splice.ok) return { ...record, status: 'rewrite-rejected', splice }

    const pair = await agent(
      codexCourier(
        `Read ${ROOT}/loop/prompts/pairwise.md and replace {SECTION_LIST} with this single line:\n- ${leaf.heading}`,
        `pair-${leaf.id}-${RUN_ID}`, 'a JSON array; wrap as {results: [...]}'),
      { label: `pair:${leaf.id}`, phase: 'PerLeaf', effort: 'low', schema: PAIR_SCHEMA })
    const verdict = pair && pair.results && pair.results[0] ? pair.results[0] : null
    return {
      ...record,
      status: verdict && verdict.pairwise === 'better' ? 'improved'
            : verdict && verdict.pairwise === 'worse' ? 'regressed-review-needed'
            : 'rewritten-same',
      pairwise: verdict ? verdict.pairwise : 'unavailable',
      remaining: verdict ? (verdict.remaining || []).length : null,
    }
  })

const done = records.filter(Boolean)
log(`per-leaf complete: ${done.map(r => `${r.leaf}=${r.status}`).join(' · ')}`)

// ---------------------------------------------------------------- Distill + Report
const queue = []
for (const r of done) {
  for (const c of (r.unmade || [])) queue.push({ question: c.issue || '', section: r.heading, source: 'evaluator', evidence: c.evidence || '' })
}

if (MODE === 'iterate' && done.some(r => r.eval)) {
  phase('Distill')
  guard(1)
  await agent(
    `Working dir: ${ROOT}. You are the DISTILLER. Read ${ROOT}/loop/state/lessons.jsonl. Based on these per-leaf outcomes, increment hit_count of lessons that recurred and add at most ONE new lesson per NEW defect CLASS (never content-specific). Outcomes: ${JSON.stringify(done.map(r => ({ leaf: r.leaf, status: r.status, critique: r.eval ? r.eval.critique : [] })))}. Write the FULL updated array to ${ROOT}/loop/out/lessons-${RUN_ID}.json (JSON array), then Bash: cd "${ROOT}" && ${PY} lessons-set "loop/out/lessons-${RUN_ID}.json" — return {ok:true} on success.`,
    { label: 'distill', phase: 'Distill', model: 'haiku', effort: 'low', schema: OK_SCHEMA })
}

phase('Report')
guard(1)
const sections = done.filter(r => r.eval).map(r => r.eval)
await agent(
  `Working dir: ${ROOT}. Write this JSON to ${ROOT}/loop/out/results-${RUN_ID}.json (Write tool), then Bash: cd "${ROOT}" && ${PY} render "loop/out/results-${RUN_ID}.json" — return {ok:true} when it prints ok.\nJSON:\n${JSON.stringify({ run_id: RUN_ID, iteration: MODE === 'baseline' ? 0 : 1, gate_ok: true, gate_findings: [], sections, adv: {}, fresh: [], queue })}`,
  { label: 'render', phase: 'Report', model: 'haiku', effort: 'low', schema: OK_SCHEMA })

return {
  mode: MODE, runId: RUN_ID, callsUsed: calls,
  leaves: done.map(r => ({ leaf: r.leaf, status: r.status, score: r.eval ? r.eval.score : null, pairwise: r.pairwise || null })),
  ready: done.filter(r => r.status === 'ready').length,
  blocked: done.filter(r => r.status === 'blocked').length,
  improved: done.filter(r => r.status === 'improved').length,
  queueItems: queue.length,
  candidate: 'loop/out/prd.candidate.md',
  note: 'Per-leaf only — the whole PRD is never judged in one call. Canonical unchanged; human-accepted diffs only.',
}
