export const meta = {
  name: 'prd-improvement-loop',
  description: 'PRD improvement loop: gate -> parallel codex evaluation -> route -> generate (Sonnet/Opus) -> verify -> distill, until decomposition-ready or plateau',
  whenToUse: 'Run with args {mode:"baseline"|"iterate", runId:"<stamp>"} from the ai4good repo. Baseline judges all leaves in parallel; iterate rewrites worst-first into loop/out/prd.candidate.md (never the canonical).',
  phases: [
    { title: 'Gate', detail: 'deterministic gate via orchestrate.py (courier)' },
    { title: 'Evaluate', detail: 'codex xhigh/high via courier agents, parallel batches' },
    { title: 'Generate', detail: 'Sonnet low/medium; Opus high for structural', model: 'sonnet' },
    { title: 'Verify', detail: 'splice into candidate + validator + marker check' },
    { title: 'Distill', detail: 'Haiku lessons update' },
    { title: 'Report', detail: 'render report + decision queue via courier' },
  ],
}

// ---------------------------------------------------------------- constants
const ROOT = 'C:/Users/nirdr/Downloads/ai4good'
const PY = `python ${ROOT}/loop/orchestrate.py`
const MODE = (args && args.mode) || 'baseline'
const RUN_ID = (args && args.runId) || 'run-unstamped'   // Date.now() unavailable by design — pass a stamp in
const MAX_ITER = (args && args.maxIterations) || 3
const PER_ITER = (args && args.sectionsPerIteration) || 3
const BATCH = 5
const MAX_CALLS = 40
let calls = 0

const GATE_SCHEMA = { type: 'object', properties: { gate: { type: 'string' }, findings: { type: 'array', items: { type: 'object' } } }, required: ['gate', 'findings'] }
const LEAVES_SCHEMA = { type: 'object', properties: { leaves: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, heading: { type: 'string' } }, required: ['id', 'heading'] } } }, required: ['leaves'] }
const EVAL_SCHEMA = { type: 'object', properties: { sections: { type: 'array', items: { type: 'object', properties: { section: { type: 'string' }, verdict: { type: 'string' }, score: { type: 'number' }, critique: { type: 'array', items: { type: 'object' } }, blocking_questions: { type: 'array', items: { type: 'string' } } }, required: ['section', 'verdict', 'score'] } } }, required: ['sections'] }
const ADV_SCHEMA = { type: 'object', properties: { contradictions: { type: 'array', items: { type: 'object' } }, missing_failure_modes: { type: 'array', items: { type: 'object' } }, unfounded_assumptions: { type: 'array', items: { type: 'object' } }, taxonomy_gaps: { type: 'array', items: { type: 'object' } } }, required: ['contradictions', 'missing_failure_modes', 'unfounded_assumptions', 'taxonomy_gaps'] }
const FRESH_SCHEMA = { type: 'object', properties: { questions: { type: 'array', items: { type: 'object', properties: { question: { type: 'string' }, section: { type: 'string' }, class: { type: 'string' } }, required: ['question', 'class'] } } }, required: ['questions'] }
const GEN_SCHEMA = { type: 'object', properties: { section: { type: 'string' }, new_text: { type: 'string' } }, required: ['section', 'new_text'] }
const SPLICE_SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' }, validator_pct: { type: 'number' }, markers_lost: { type: 'array', items: { type: 'string' } } }, required: ['ok'] }
const PAIR_SCHEMA = { type: 'object', properties: { results: { type: 'array', items: { type: 'object', properties: { section: { type: 'string' }, pairwise: { type: 'string' }, remaining: { type: 'array', items: { type: 'object' } } }, required: ['section', 'pairwise'] } } }, required: ['results'] }
const OK_SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }

// Courier recipe reused by every codex-backed step. The courier runs codex through
// orchestrate.py (hardened: -o file capture, tree-kill on timeout) in BACKGROUND Bash
// to dodge the 10-minute foreground cap, waits for completion, parses, returns JSON.
function codexCourier(promptSpec, label, jsonShapeNote) {
  return `Working dir: ${ROOT}. You are a deterministic courier — do not add your own judgment to the payload.
1. ${promptSpec}
2. Save the final prompt text to ${ROOT}/loop/out/prompt-${label}.txt (Write tool; create loop/out if needed).
3. Run in BACKGROUND Bash (this call can exceed 10 minutes): cd "${ROOT}" && ${PY} codex-call "loop/out/prompt-${label}.txt" "${label}" > "loop/out/courier-${label}.txt" 2>&1
4. Wait for the background task to complete (you will be notified). Then Read loop/out/courier-${label}.txt.
5. Parse the JSON payload out of it (${jsonShapeNote}). If parsing fails, retry the codex call ONCE with the same prompt file and label "${label}-r".
6. Return the parsed payload via structured output. If both attempts fail, return an empty payload.`
}

function batchList(leaves) {
  const batches = []
  for (let i = 0; i < leaves.length; i += BATCH) batches.push(leaves.slice(i, i + BATCH))
  return batches
}

function guard(n) {
  if (calls + n > MAX_CALLS) throw new Error(`call cap ${MAX_CALLS} would be exceeded`)
  calls += n
}

// ---------------------------------------------------------------- Phase: Gate
phase('Gate')
guard(1)
const gate = await agent(
  `Working dir: ${ROOT}. Run in Bash: cd "${ROOT}" && ${PY} gate — then return its JSON output (fields gate, findings) via structured output, verbatim.`,
  { label: 'gate', phase: 'Gate', model: 'haiku', effort: 'low', schema: GATE_SCHEMA })
log(`gate: ${gate ? gate.gate : 'agent failed'}`)
if (!gate || (gate.gate !== 'PASS' && MODE === 'baseline')) {
  return { mode: MODE, runId: RUN_ID, stopped: 'gate-failed', findings: gate ? gate.findings : [] }
}

guard(1)
const leafMap = await agent(
  `Working dir: ${ROOT}. Run in Bash: cd "${ROOT}" && ${PY} leaves — it prints a JSON array of {id, heading, start, end}. Return {leaves: <that array>} via structured output. Exclude nothing.`,
  { label: 'leaves', phase: 'Gate', model: 'haiku', effort: 'low', schema: LEAVES_SCHEMA })
const reqLeaves = leafMap.leaves.filter(l => l.id.startsWith('REQ-') &&
  !['REQ-005.5', 'REQ-017', 'REQ-018', 'REQ-019', 'REQ-020', 'REQ-022'].includes(l.id))
log(`${leafMap.leaves.length} leaves; ${reqLeaves.length} in evaluation scope`)

// ---------------------------------------------------------------- MODE: baseline
if (MODE === 'baseline') {
  phase('Evaluate')
  const batches = batchList(reqLeaves)
  guard(batches.length + 2)
  const batchResults = await parallel(batches.map((b, i) => () => agent(
    codexCourier(
      `Read ${ROOT}/loop/prompts/evaluator.md and replace {SECTION_LIST} with these lines:\n${b.map(l => `- ${l.heading} (lines ${l.start}-${l.end})`).join('\n')}`,
      `wf-eval-b${i}`, 'a JSON array of section objects'),
    { label: `eval-b${i}`, phase: 'Evaluate', effort: 'low', schema: EVAL_SCHEMA })))
  const sections = batchResults.filter(Boolean).flatMap(r => r.sections)

  const adv = await agent(
    codexCourier(`Use the prompt file ${ROOT}/loop/prompts/adversarial.md verbatim as the prompt text (copy it).`,
      'wf-adv', 'a single JSON object with 4 array fields'),
    { label: 'adversarial', phase: 'Evaluate', effort: 'low', schema: ADV_SCHEMA })
  const fresh = await agent(
    codexCourier(`Use the prompt file ${ROOT}/loop/prompts/fresh_reader.md verbatim as the prompt text (copy it).`,
      'wf-fresh', 'a JSON array of question objects; wrap as {questions: [...]}'),
    { label: 'fresh-reader', phase: 'Evaluate', effort: 'low', schema: FRESH_SCHEMA })

  phase('Report')
  const queue = []
  for (const s of sections) for (const c of (s.critique || []))
    if (c.label === 'unmade-decision') queue.push({ question: c.issue || '', section: s.section, source: 'evaluator', evidence: c.evidence || '' })
  for (const q of ((fresh && fresh.questions) || []))
    if (q.class === 'missing-decision') queue.push({ question: q.question, section: q.section || '', source: 'fresh-reader', evidence: q.wrong_guess_cost || '' })

  guard(1)
  const results = { run_id: RUN_ID, iteration: 0, gate_ok: true, gate_findings: [], sections, adv: adv || {}, fresh: (fresh && fresh.questions) || [], queue }
  await agent(
    `Working dir: ${ROOT}. Write the following JSON to ${ROOT}/loop/out/results-${RUN_ID}.json (Write tool), then run in Bash: cd "${ROOT}" && ${PY} render "loop/out/results-${RUN_ID}.json" — return {ok:true} if it printed ok.\nJSON:\n${JSON.stringify(results)}`,
    { label: 'render', phase: 'Report', model: 'haiku', effort: 'low', schema: OK_SCHEMA })
  return { mode: MODE, runId: RUN_ID, sections: sections.length, queueItems: queue.length, report: 'loop/out/baseline-report.md' }
}

// ---------------------------------------------------------------- MODE: iterate
// Requires a prior baseline in state/scores.jsonl. Generation writes ONLY the candidate.
phase('Evaluate')
guard(1)
const worst = await agent(
  `Working dir: ${ROOT}. Read ${ROOT}/loop/state/scores.jsonl (JSONL). Take the LATEST run's entries (max run field), keep verdict != "ready", sort by score ascending, and return {leaves:[{id:"<REQ-id from the section heading>", heading:"<section>"}]} for the worst ${PER_ITER * MAX_ITER} via structured output. Derive the REQ id from the heading text (e.g. "REQ-026: ..." -> "REQ-026").`,
  { label: 'worst-first', phase: 'Evaluate', model: 'haiku', effort: 'low', schema: LEAVES_SCHEMA })
let backlog = worst.leaves.filter(l => reqLeaves.some(r => r.id === l.id))
if (backlog.length === 0) return { mode: MODE, runId: RUN_ID, stopped: 'nothing-to-improve' }

let flatRounds = 0
let prevRemaining = null
const improved = [], failed = []

for (let iter = 1; iter <= MAX_ITER; iter++) {
  const targets = backlog.slice(0, PER_ITER)
  if (targets.length === 0) break
  log(`iteration ${iter}: ${targets.map(t => t.id).join(', ')}`)

  // Generate (Sonnet low; the router's cross-section/structural escalation is applied
  // by re-running failures at higher effort/model below)
  phase('Generate')
  guard(targets.length)
  const gens = await parallel(targets.map(t => () => agent(
    `Working dir: ${ROOT}. You are the GENERATOR. First Read ${ROOT}/loop/prompts/generator_prefix.md and obey every hard rule in it. Then Read ${ROOT}/loop/state/lessons.jsonl (apply lessons whose applies_when matches) and ${ROOT}/loop/state/decisions.jsonl (trace normative claims). Read the section "${t.heading}" from ${ROOT}/.taskmaster/docs/prd.md and the latest critique for it in ${ROOT}/loop/state/scores.jsonl (latest run). Rewrite ONLY that section to resolve the critique. Return {section:"${t.id}", new_text:"<full replacement including the heading line>"} via structured output.`,
    { label: `gen-${t.id}`, phase: 'Generate', model: 'sonnet', effort: 'medium', schema: GEN_SCHEMA })))

  // Verify: splice each rewrite into the candidate; validator + marker check must pass
  phase('Verify')
  const spliceResults = []
  for (const g of gens.filter(Boolean)) {
    guard(1)
    const sr = await agent(
      `Working dir: ${ROOT}. Write the following section text to ${ROOT}/loop/out/gen-${g.section}.md exactly (Write tool), then run in Bash: cd "${ROOT}" && ${PY} splice "${g.section}" "loop/out/gen-${g.section}.md" — return its JSON verdict via structured output.\nSECTION TEXT:\n${g.new_text}`,
      { label: `splice-${g.section}`, phase: 'Verify', model: 'haiku', effort: 'low', schema: SPLICE_SCHEMA })
    spliceResults.push({ id: g.section, ok: !!(sr && sr.ok), detail: sr })
    if (!sr || !sr.ok) failed.push(g.section)
  }

  // Pairwise re-evaluation of spliced sections (codex, cross-vendor)
  const judged = spliceResults.filter(s => s.ok)
  let remainingCount = prevRemaining === null ? Infinity : prevRemaining
  if (judged.length > 0) {
    guard(1)
    const pair = await agent(
      codexCourier(
        `Read ${ROOT}/loop/prompts/pairwise.md and replace {SECTION_LIST} with:\n${judged.map(j => `- ${j.id}`).join('\n')}`,
        `wf-pair-i${iter}`, 'a JSON array; wrap as {results:[...]}'),
      { label: `pairwise-i${iter}`, phase: 'Verify', effort: 'low', schema: PAIR_SCHEMA })
    const results = (pair && pair.results) || []
    for (const r of results) if (r.pairwise === 'better') improved.push(r.section)
    remainingCount = results.reduce((n, r) => n + ((r.remaining || []).length), 0)
  }

  // Distill lessons from this iteration
  phase('Distill')
  guard(1)
  await agent(
    `Working dir: ${ROOT}. You are the DISTILLER. Read ${ROOT}/loop/state/lessons.jsonl and ${ROOT}/loop/state/scores.jsonl (latest run) plus loop/out/courier-wf-pair-i${iter}.txt if present. Update the lessons: increment hit_count of lessons that recurred, add NEW lessons for recurring DEFECT CLASSES only (never content), compress past 10 entries. Write the FULL updated array to ${ROOT}/loop/out/lessons-i${iter}.json (a JSON array), run in Bash: cd "${ROOT}" && ${PY} lessons-set "loop/out/lessons-i${iter}.json" — return {ok:true} on success.`,
    { label: `distill-i${iter}`, phase: 'Distill', model: 'haiku', effort: 'low', schema: OK_SCHEMA })

  // Plateau check: blocking-critique count must fall
  if (prevRemaining !== null && remainingCount >= prevRemaining) flatRounds++
  else flatRounds = 0
  prevRemaining = remainingCount
  backlog = backlog.filter(b => !improved.includes(b.id)).filter(b => !failed.includes(b.id))
  if (flatRounds >= 2) {
    log('plateau: escalating one structural pass to Opus')
    phase('Generate')
    guard(1)
    const t = backlog[0]
    if (t) {
      const g = await agent(
        `Working dir: ${ROOT}. STRUCTURAL escalation. Read ${ROOT}/loop/prompts/generator_prefix.md (obey all hard rules), the section "${t.heading}" in ${ROOT}/.taskmaster/docs/prd.md, its full critique history in ${ROOT}/loop/state/scores.jsonl, and ${ROOT}/loop/state/decisions.jsonl. Perform an outline-level revision of the section. Return {section:"${t.id}", new_text:"..."} via structured output.`,
        { label: `opus-${t.id}`, phase: 'Generate', model: 'opus', effort: 'high', schema: GEN_SCHEMA })
      if (g) {
        guard(1)
        await agent(
          `Working dir: ${ROOT}. Write the section text to ${ROOT}/loop/out/gen-${g.section}.md (Write tool), then Bash: cd "${ROOT}" && ${PY} splice "${g.section}" "loop/out/gen-${g.section}.md" — return its JSON verdict.\nSECTION TEXT:\n${g.new_text}`,
          { label: `splice-opus-${g.section}`, phase: 'Verify', model: 'haiku', effort: 'low', schema: SPLICE_SCHEMA })
      }
    }
    break
  }
}

return {
  mode: MODE, runId: RUN_ID, iterations: MAX_ITER, improved, failedVerification: failed,
  candidate: 'loop/out/prd.candidate.md', callsUsed: calls,
  note: 'Candidate only — canonical changes require a human-accepted diff.',
}
