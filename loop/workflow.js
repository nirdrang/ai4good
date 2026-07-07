export const meta = {
  name: 'prd-improvement-loop',
  description: 'Two-level per-leaf PRD improvement loop, agents-only: complete iterations (whole-PRD passes over a FROZEN working version) containing per-leaf mini-iterations (codex evaluate -> Sonnet-xhigh rewrite -> splice+validate -> codex INNER RE-EVALUATION). A leaf reaches ready in-pass when the re-eval says so. Assembly + promotion only at pass boundaries.',
  whenToUse: 'args {mode:"baseline"|"iterate", runId:"<stamp>", only:[leafIds]?, targets:<n>?, maxPasses:<n>?, maxCycles:<n>?, reset:bool?}. Smoke = iterate + only:["REQ-001"]. Default: up to 3 complete passes per run.',
  phases: [
    { title: 'Gate', detail: 'working-version setup + validator 100% + marker census' },
    { title: 'Pass', detail: 'complete iteration: per-leaf mini-iterations vs the frozen working version', model: 'sonnet' },
    { title: 'Assemble', detail: 'merge accepted sections -> validate merged candidate -> promote to next working version' },
    { title: 'Report', detail: 'leaf-status ledger + decision queue + scores append' },
  ],
}

// ---------------------------------------------------------------- constants
const ROOT = 'C:/Users/nirdr/Downloads/ai4good'
const CANON = '.taskmaster/docs/prd.md'          // human-gated; the loop NEVER writes it
const WORK = 'loop/out/prd.working.md'           // frozen during a pass; promoted at boundaries
const VALIDATE = 'python .claude/skills/prd-taskmaster/script.py validate-prd --input'
// Explicit model + max reasoning effort so the evaluator never silently drifts to a codex-exec
// default. gpt-5.5 is the best available (config default); xhigh is the max effort tier.
const CODEX = 'codex exec --sandbox read-only --skip-git-repo-check -c model=gpt-5.5 -c model_reasoning_effort=xhigh'

// Defensive arg handling: the Workflow tool can deliver `args` as an object, a JSON string,
// or undefined. Parse all three so a stringified payload never silently collapses to defaults.
let A = {}
try { A = (typeof args === 'string') ? JSON.parse(args || '{}') : (args || {}) } catch (e) { A = {} }
const MODE = A.mode || 'baseline'
const RUN_ID = A.runId || 'run-unstamped'   // Date.now() unavailable by design
const ONLY = A.only || null
const TARGETS = A.targets || 5
const MAX_PASSES = A.maxPasses || 3         // P0: up to 3 complete iterations per run (founder call)
const MAX_CYCLES = A.maxCycles || 3         // S6: mini-iteration cap per leaf per pass
const RESET = !!A.reset
const MAX_CALLS = A.callCap || 200
let calls = 0
function guard(n) { if (calls + n > MAX_CALLS) throw new Error(`call cap ${MAX_CALLS} exceeded`); calls += n }
if (MODE === 'baseline' && !ONLY && !A.allowFullBaseline) {
  return { stopped: 'refused-implicit-full-baseline', hint: 'Pass only:[ids] for a scoped run, or allowFullBaseline:true to sweep every leaf.', resolvedArgs: { MODE, RUN_ID, ONLY, MAX_PASSES } }
}
log(`resolved args → mode=${MODE} runId=${RUN_ID} only=${ONLY ? ONLY.join(',') : '(none)'} passes=${MAX_PASSES} cycles=${MAX_CYCLES} reset=${RESET}`)

const EXEMPT = ['REQ-005.5', 'REQ-017', 'REQ-018', 'REQ-019', 'REQ-020', 'REQ-022']

const GATE_SCHEMA = { type: 'object', properties: { gate: { type: 'string', enum: ['PASS', 'FAIL'] }, validator_pct: { type: 'number' }, marker_count: { type: 'number' }, notes: { type: 'array', items: { type: 'string' } } }, required: ['gate', 'validator_pct', 'marker_count'] }
const LEAVES_SCHEMA = { type: 'object', properties: { leaves: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, heading: { type: 'string' }, start: { type: 'number' }, end: { type: 'number' } }, required: ['id', 'heading', 'start', 'end'] } } }, required: ['leaves'] }
const EVAL_SCHEMA = { type: 'object', properties: { section: { type: 'string' }, verdict: { type: 'string', enum: ['ready', 'needs-work', 'blocked'] }, score: { type: 'number' }, critique: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, issue: { type: 'string' }, evidence: { type: 'string' } }, required: ['label', 'issue'] } }, blocking_questions: { type: 'array', items: { type: 'string' } } }, required: ['section', 'verdict', 'score'] }
const GEN_SCHEMA = { type: 'object', properties: { section: { type: 'string' }, new_text: { type: 'string' } }, required: ['section', 'new_text'] }
const SPLICE_SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' }, validator_pct: { type: 'number' }, marker_count_working: { type: 'number' }, marker_count_candidate: { type: 'number' }, error: { type: 'string' } }, required: ['ok'] }
const OK_SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' }, detail: { type: 'string' } }, required: ['ok'] }

function codexRecipe(promptSpec, label) {
  return `Working dir: ${ROOT}. You are a deterministic courier — do not add your own judgment to the payload. NEVER modify any file under loop/prompts/ (those are read-only templates); you only ever WRITE to loop/out/.
1. ${promptSpec}
2. Write the final (substituted) prompt text to ${ROOT}/loop/out/prompt-${label}.txt (Write tool; create loop/out if needed). This is a NEW file in loop/out/ — do not write into the template.
3. Run in FOREGROUND Bash with the timeout parameter set to 600000 (ten minutes; do NOT use run_in_background):
   cd "${ROOT}" && ${CODEX} -o "loop/out/lastmsg-${label}.txt" - < "loop/out/prompt-${label}.txt" > "loop/out/log-${label}.txt" 2>&1
4. Read loop/out/lastmsg-${label}.txt and parse the JSON payload from it. If the file is missing or unparseable, retry the codex command ONCE with "-r" appended to every ${label} filename.
5. Return the parsed payload via structured output. If both attempts fail, return an empty payload.`
}

// evaluate/re-evaluate ONE leaf against a given document (WORK for the initial eval, the leaf
// candidate for an inner re-eval). Same rubric either way — a re-eval is just an eval of the rewrite.
function evalAgent(docPath, leaf, label) {
  // The courier only writes a prompt file, shells out to codex, and parses the JSON result —
  // mechanical work, so pin it to Haiku to keep the Claude budget off the codex path.
  return agent(
    codexRecipe(`Read the TEMPLATE ${ROOT}/loop/prompts/evaluator_leaf.md into memory — it is READ-ONLY, you must NOT edit or overwrite it. Take its text and produce a filled copy in which the literal token {DOC} is replaced by "${docPath}" and the literal token {TARGET} is replaced by "- ${leaf.heading} (lines ${leaf.start}-${leaf.end})". That filled copy is the prompt text for the next step.`, label),
    { label, phase: 'Pass', model: 'haiku', effort: 'low', schema: EVAL_SCHEMA })
}

// ================================================================ Gate + working version
phase('Gate')
guard(1)
const gate = await agent(
  `Working dir: ${ROOT}. Set up and gate the loop's WORKING version of the PRD:
1. Bash: cd "${ROOT}" && mkdir -p loop/out && ${RESET ? `cp -f ${CANON} ${WORK}` : `[ -f ${WORK} ] || cp ${CANON} ${WORK}`}
2. Bash: cd "${ROOT}" && ${VALIDATE} ${WORK}   — find "percentage" in the JSON output (must be 100.0).
3. Bash: cd "${ROOT}" && grep -c "\\[DECISION: OD-" ${WORK}   — the [DECISION] marker count (must be >= 6).
Return {gate: "PASS" if both hold else "FAIL", validator_pct, marker_count, notes: [<any anomaly>]} via structured output.`,
  { label: 'gate', phase: 'Gate', model: 'haiku', effort: 'low', schema: GATE_SCHEMA })
log(`gate: ${gate ? `${gate.gate} (validator ${gate.validator_pct}%, markers ${gate.marker_count})` : 'agent failed'}`)
if (!gate || gate.gate !== 'PASS') return { mode: MODE, runId: RUN_ID, stopped: 'gate-failed', gate }

// ================================================================ Complete iterations
const passSummaries = []
let passTargets = null
let finalRecords = []
let stopped = null

for (let pass = 1; pass <= MAX_PASSES; pass++) {
  phase('Pass')
  log(`=== complete iteration ${pass}/${MAX_PASSES} (frozen input: ${WORK}) ===`)

  guard(1)
  const leafMap = await agent(
    `Working dir: ${ROOT}. Build the leaf map of the WORKING version:
1. Bash: cd "${ROOT}" && grep -n -E "^#### REQ-|^### Story " ${WORK}
2. Bash: cd "${ROOT}" && wc -l < ${WORK}
Each grep hit starts a leaf; it ends one line before the next hit (the last leaf ends at the file's line count). id = the "REQ-NNN" (or "REQ-NNN.5") token in the heading if present, else the "Story N" prefix. heading = heading text without leading #.
Return {leaves: [{id, heading, start, end}]} for ALL hits, in file order, via structured output.`,
    { label: `leaves-p${pass}`, phase: 'Pass', model: 'haiku', effort: 'low', schema: LEAVES_SCHEMA })
  const scopeLeaves = leafMap.leaves.filter(l => l.id.startsWith('REQ-') && !EXEMPT.includes(l.id))

  let targets
  if (passTargets) {
    targets = passTargets.map(id => scopeLeaves.find(l => l.id === id)).filter(Boolean)
  } else if (ONLY) {
    targets = scopeLeaves.filter(l => ONLY.includes(l.id))
  } else if (MODE === 'baseline') {
    targets = scopeLeaves
  } else {
    guard(1)
    const worst = await agent(
      `Working dir: ${ROOT}. Read ${ROOT}/loop/state/scores.jsonl (JSONL). Take the LATEST run's entries (max run field), keep verdict != "ready", sort by score ascending, and return {leaves:[{id:"<REQ id from the heading>", heading:"<heading>", start:0, end:0}]} for the worst ${TARGETS} via structured output.`,
      { label: 'worst-first', phase: 'Pass', model: 'haiku', effort: 'low', schema: LEAVES_SCHEMA })
    targets = worst.leaves.map(w => scopeLeaves.find(l => l.id === w.id)).filter(Boolean)
  }
  if (!targets || targets.length === 0) { stopped = 'no-targets'; break }
  log(`pass ${pass}: ${targets.length} leaf(s): ${targets.map(t => t.id).join(', ')}`)

  // ---------------------------------------------------------- per-leaf mini-iterations
  guard(targets.length)
  const records = await pipeline(targets,

    // Stage 1 — initial evaluation of ONE leaf against the frozen working doc
    (leaf) => evalAgent(WORK, leaf, `eval-${leaf.id}-p${pass}-${RUN_ID}`),

    // Stage 2 — mini-iteration loop: generate -> splice+validate -> codex INNER RE-EVAL
    async (ev, leaf) => {
      if (!ev) return { leaf: leaf.id, heading: leaf.heading, status: 'eval-failed', cycles: 0 }
      let actionable = (ev.critique || []).filter(c => c.label !== 'unmade-decision')
      let unmade = (ev.critique || []).filter(c => c.label === 'unmade-decision')
      const record = { leaf: leaf.id, heading: leaf.heading, finalEval: ev, unmade, cycles: 0 }
      if (ev.verdict === 'blocked' || unmade.length > 0) return { ...record, status: 'blocked' }   // S1
      if (ev.verdict === 'ready' || actionable.length === 0) return { ...record, status: 'ready' } // S2
      if (MODE === 'baseline') return { ...record, status: ev.verdict }

      const leafCand = `loop/out/cand-${leaf.id}.md`
      let lastGoodFile = null
      let prevScore = ev.score          // S5 is score-based, not critique-count-based: a fresh re-eval
      const entryScore = ev.score       // surfaces a different critique SET each cycle, so count is noisy;
      let spliceFails = 0                // score tracks whether the section is actually getting better.
      let status = 'stalled'

      for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
        record.cycles = cycle
        guard(3)
        const genFile = `loop/out/gen-${leaf.id}-p${pass}-c${cycle}.md`

        // GENERATOR — Sonnet xhigh. TOKEN REDUCTION: cycle 1 reads the whole working doc
        // (full context for the first rewrite); cycles 2+ read only the previous rewrite +
        // the dependency sections it names — never the whole doc again.
        const readScope = cycle === 1
          ? `Read the ENTIRE working document ${ROOT}/${WORK} for reference. Rewrite ONLY the section "${leaf.heading}" (lines ${leaf.start}-${leaf.end}). Pay particular attention to the sections its Dependencies line names.`
          : `TOKEN-EFFICIENT REFINEMENT — do NOT read the whole document. Read ONLY: (a) your previous accepted rewrite of this section in ${ROOT}/${lastGoodFile}; (b) grep the "Dependencies:" line inside that file and Read just the sections it names from ${ROOT}/${WORK} for cross-section context. Refine the previous rewrite to resolve the remaining critique below.`
        const gen = await agent(
          `Working dir: ${ROOT}. You are the GENERATOR. First Read ${ROOT}/loop/prompts/generator_prefix.md and obey every hard rule in it. Then Read ${ROOT}/loop/state/lessons.jsonl and ${ROOT}/loop/state/decisions.jsonl (normative claims must trace to entries). ${readScope}\nResolve THIS critique, surgically — change nothing the critique does not require:\n${JSON.stringify(actionable, null, 2)}\nWhere a normative answer is not in the decision ledger, leave a [DECISION: <question>] marker rather than inventing policy.\nReturn {section: "${leaf.id}", new_text: "<full replacement section including the #### heading line>"} via structured output.`,
          { label: `gen:${leaf.id}-c${cycle}`, phase: 'Pass', model: 'sonnet', effort: 'xhigh', schema: GEN_SCHEMA })
        if (!gen || !gen.new_text) { status = 'gen-failed'; break }

        // SPLICE + VALIDATE — this leaf's own scratch candidate (parallel-safe)
        const splice = await agent(
          `Working dir: ${ROOT}. Apply a section rewrite to this leaf's SCRATCH candidate — never touch ${CANON} or ${WORK}.
1. Write the SECTION TEXT below to ${ROOT}/${genFile} exactly (Write tool).
2. Bash: cd "${ROOT}" && cp -f ${WORK} ${leafCand}
3. Replace the section in ${leafCand}. Bash (verify each step's output):
   cd "${ROOT}" && S=$(grep -n -F "${leaf.heading}" ${leafCand} | head -1 | cut -d: -f1) && E=$(awk -v s="$S" 'NR>s && (/^#### /||/^### /){print NR; exit}' ${leafCand}) && [ -z "$E" ] && E=$(( $(wc -l < ${leafCand}) + 1 )); head -n $((S-1)) ${leafCand} > loop/out/.tmp-${leaf.id} && cat ${genFile} >> loop/out/.tmp-${leaf.id} && echo "" >> loop/out/.tmp-${leaf.id} && tail -n +$E ${leafCand} >> loop/out/.tmp-${leaf.id} && mv loop/out/.tmp-${leaf.id} ${leafCand}
   (If grep finds no match, stop and return ok:false with error.)
4. Bash: cd "${ROOT}" && ${VALIDATE} ${leafCand}   — find "percentage"; must be 100.0.
5. Bash: cd "${ROOT}" && grep -c "\\[DECISION: OD-" ${WORK} && grep -c "\\[DECISION: OD-" ${leafCand}   — candidate count must be >= working count.
Return {ok, validator_pct, marker_count_working, marker_count_candidate, error?} via structured output. ok=true ONLY if validator is 100.0 AND no marker was lost.
SECTION TEXT:\n${gen.new_text}`,
          { label: `splice:${leaf.id}-c${cycle}`, phase: 'Pass', model: 'sonnet', effort: 'low', schema: SPLICE_SCHEMA })
        if (!splice || !splice.ok) {                                                     // S7
          spliceFails++
          if (spliceFails >= 2) { status = 'rewrite-rejected'; break }
          actionable = actionable.concat([{ label: 'local', issue: `Previous rewrite failed verification: ${splice && splice.error ? splice.error : 'validator below 100% or a [DECISION] marker was lost'} — fix without reintroducing it`, evidence: 'splice verdict' }])
          continue
        }
        spliceFails = 0
        lastGoodFile = genFile

        // INNER RE-EVALUATION — codex re-evaluates the REWRITTEN section fresh (founder call).
        // A full-rubric cross-vendor verdict on the candidate; drives readiness and the next cycle.
        const re = await evalAgent(leafCand, leaf, `reeval-${leaf.id}-p${pass}-c${cycle}-${RUN_ID}`)
        if (!re) { status = 'reeval-failed'; break }
        record.finalEval = re
        record.reeval = { verdict: re.verdict, score: re.score, critiques: (re.critique || []).length }
        const reActionable = (re.critique || []).filter(c => c.label !== 'unmade-decision')
        const reUnmade = (re.critique || []).filter(c => c.label === 'unmade-decision')

        if (re.verdict === 'ready') { status = 'ready'; break }                          // re-eval confirms ready IN-PASS
        if (re.verdict === 'blocked' || reUnmade.length > 0) { record.unmade = reUnmade; status = 'blocked'; break } // new unmade-decision surfaced by the rewrite
        if (re.score <= prevScore) {                                                     // S5 score-based: the rewrite did not improve the section
          status = re.score > entryScore ? 'partially-improved' : 'stalled'
          break
        }
        prevScore = re.score
        actionable = reActionable                                                        // the fresh critique drives the next cycle
        status = 'partially-improved'                                                    // S6 fallthrough at the cap
      }

      return { ...record, status, accepted: lastGoodFile }
    })

  const done = records.filter(Boolean)
  finalRecords = done
  log(`pass ${pass} mini-iterations: ${done.map(r => `${r.leaf}=${r.status}(${r.cycles})`).join(' · ')}`)

  // ---------------------------------------------------------- Assemble + promote (pass boundary)
  const accepted = done.filter(r => r.accepted)
  if (accepted.length > 0) {
    phase('Assemble')
    guard(1)
    const asm = await agent(
      `Working dir: ${ROOT}. Assemble this pass's new PRD version. Sequentially, in this order, apply each section replacement to a single merged candidate — never touch ${CANON}.
1. Bash: cd "${ROOT}" && cp -f ${WORK} loop/out/prd.candidate.md
2. For EACH entry below, replace its section in loop/out/prd.candidate.md using the same recipe (S = first grep -n -F match of the heading; E = next ^#### or ^### heading line after S, else EOF+1; head/cat/echo/tail/mv):
${accepted.map(r => `   - heading: "${r.heading}" · replacement file: ${r.accepted}`).join('\n')}
3. Bash: cd "${ROOT}" && ${VALIDATE} loop/out/prd.candidate.md   — must be 100.0.
4. Bash: cd "${ROOT}" && grep -c "\\[DECISION: OD-" ${WORK} && grep -c "\\[DECISION: OD-" loop/out/prd.candidate.md   — no loss allowed.
5. If BOTH hold: cd "${ROOT}" && cp -f loop/out/prd.candidate.md loop/out/prd.pass-${RUN_ID}-${pass}.md && cp -f loop/out/prd.candidate.md ${WORK}   — the candidate becomes the next pass's frozen input.
6. If either fails: do NOT promote; leave ${WORK} untouched.
Return {ok: <promoted?>, detail: "<validator pct + marker counts>"} via structured output.`,
      { label: `assemble-p${pass}`, phase: 'Assemble', model: 'sonnet', effort: 'low', schema: OK_SCHEMA })
    if (!asm || !asm.ok) { stopped = 'assembly-gate-failed'; log(`P5: assembly failed — working version kept (${asm ? asm.detail : 'agent failed'})`); break }
    log(`pass ${pass} promoted: new working version (snapshot prd.pass-${RUN_ID}-${pass}.md)`)
  }

  // ---------------------------------------------------------- pass-level stop conditions
  const readyN = done.filter(r => r.status === 'ready').length
  const blockedN = done.filter(r => r.status === 'blocked').length
  const unresolvedTotal = done.reduce((n, r) => n + (r.finalEval ? (r.finalEval.critique || []).filter(c => c.label !== 'unmade-decision').length : 0), 0)
  passSummaries.push({ pass, targets: done.length, ready: readyN, blocked: blockedN, unresolvedTotal })

  if (readyN + blockedN === done.length) { stopped = 'decomposition-ready-pending-queue'; break }   // P1
  if (done.every(r => r.status === 'blocked')) { stopped = 'queue-gated'; break }                   // P2
  const prev = passSummaries[passSummaries.length - 2]
  if (prev && readyN <= prev.ready && unresolvedTotal >= prev.unresolvedTotal) { stopped = 'plateau'; break }  // P3
  passTargets = done.filter(r => r.status !== 'blocked' && r.status !== 'ready').map(r => r.leaf)
  if (passTargets.length === 0) { stopped = 'decomposition-ready-pending-queue'; break }
}
if (!stopped) stopped = MAX_PASSES > 1 ? 'max-passes-reached' : 'single-pass-complete'              // P4

// ================================================================ Report
phase('Report')
const queue = []
for (const r of finalRecords) {
  for (const c of (r.unmade || [])) queue.push({ question: c.issue || '', section: r.heading, source: 'unmade-decision', evidence: c.evidence || '' })
  for (const q of ((r.finalEval && r.finalEval.blocking_questions) || [])) queue.push({ question: q, section: r.heading, source: 'blocking-question', evidence: '' })
}
const leafRecords = finalRecords.map(r => ({ leaf: r.leaf, section: r.heading, status: r.status,
  cycles: r.cycles, score: r.finalEval ? r.finalEval.score : null, reeval: r.reeval || null }))
const scoreLines = finalRecords.filter(r => r.finalEval)
  .map(r => JSON.stringify({ run: RUN_ID, mode: MODE, ...r.finalEval, final_status: r.status, cycles: r.cycles }))

guard(1)
await agent(
  `Working dir: ${ROOT}. Persist this run's results — three deterministic writes:
1. Write the following JSON to ${ROOT}/loop/out/leaf-status.json (Write tool):\n${JSON.stringify({ run_id: RUN_ID, mode: MODE, stopped, passes: passSummaries, leaves: leafRecords }, null, 2)}
2. Write a human-readable decision queue to ${ROOT}/loop/decision-queue.md: title "# Decision queue — run ${RUN_ID}", then for each item a "## Q<n> — <section>" block with the question, source, and evidence. Items:\n${JSON.stringify(queue, null, 2)}\n(Zero items: write the title plus "*(empty — no unmade decisions surfaced this run)*".)
3. Append these lines to ${ROOT}/loop/state/scores.jsonl — Bash, one printf per line: printf '%s\\n' '<line>' >> loop/state/scores.jsonl\nLINES:\n${scoreLines.join('\n')}
Return {ok:true, detail:""} when all three are done.`,
  { label: 'persist', phase: 'Report', model: 'haiku', effort: 'low', schema: OK_SCHEMA })

return {
  mode: MODE, runId: RUN_ID, stopped, callsUsed: calls,
  passes: passSummaries,
  leaves: leafRecords,
  queueItems: queue.length,
  workingVersion: WORK,
  note: 'Inner codex re-evaluation drives readiness; a leaf can reach ready in-pass. Working version promotes only at pass boundaries; canonical untouched — accept the working-vs-canonical diff to land a new PRD.',
}
