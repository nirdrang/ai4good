export const meta = {
  name: 'prd-improvement-loop',
  description: 'Two-level per-leaf PRD improvement loop, agents-only: complete iterations (whole-PRD passes over a FROZEN working version) containing per-leaf mini-iterations (codex evaluate -> Sonnet-xhigh rewrite -> splice+validate -> Haiku clean-room close). Assembly + promotion only at pass boundaries.',
  whenToUse: 'args {mode:"baseline"|"iterate", runId:"<stamp>", only:[leafIds]?, targets:<n>?, maxPasses:<n>?, maxCycles:<n>?, reset:bool?}. Smoke = iterate + only:["REQ-035"]. Default: ONE complete pass per run (founder reviews between passes).',
  phases: [
    { title: 'Gate', detail: 'working-version setup + validator 100% + marker census' },
    { title: 'Pass', detail: 'complete iteration: per-leaf mini-iterations against the frozen working version', model: 'sonnet' },
    { title: 'Assemble', detail: 'merge accepted sections -> validate merged candidate -> promote to next working version' },
    { title: 'Report', detail: 'leaf-status ledger + decision queue + scores append' },
  ],
}

// ---------------------------------------------------------------- constants
const ROOT = 'C:/Users/nirdr/Downloads/ai4good'
const CANON = '.taskmaster/docs/prd.md'          // human-gated; the loop NEVER writes it
const WORK = 'loop/out/prd.working.md'           // frozen during a pass; promoted at boundaries
const VALIDATE = 'python .claude/skills/prd-taskmaster/script.py validate-prd --input'
const CODEX = 'codex exec --sandbox read-only --skip-git-repo-check -c model_reasoning_effort=xhigh'
const MODE = (args && args.mode) || 'baseline'
const RUN_ID = (args && args.runId) || 'run-unstamped'   // Date.now() unavailable by design
const ONLY = (args && args.only) || null
const TARGETS = (args && args.targets) || 5
const MAX_PASSES = (args && args.maxPasses) || 1         // P0: one complete iteration per run by default
const MAX_CYCLES = (args && args.maxCycles) || 3         // S6: mini-iteration cap per leaf per pass
const RESET = !!(args && args.reset)
const MAX_CALLS = (args && args.callCap) || 120
let calls = 0
function guard(n) { if (calls + n > MAX_CALLS) throw new Error(`call cap ${MAX_CALLS} exceeded`); calls += n }

const EXEMPT = ['REQ-005.5', 'REQ-017', 'REQ-018', 'REQ-019', 'REQ-020', 'REQ-022']

const GATE_SCHEMA = { type: 'object', properties: { gate: { type: 'string', enum: ['PASS', 'FAIL'] }, validator_pct: { type: 'number' }, marker_count: { type: 'number' }, notes: { type: 'array', items: { type: 'string' } } }, required: ['gate', 'validator_pct', 'marker_count'] }
const LEAVES_SCHEMA = { type: 'object', properties: { leaves: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, heading: { type: 'string' }, start: { type: 'number' }, end: { type: 'number' } }, required: ['id', 'heading', 'start', 'end'] } } }, required: ['leaves'] }
const EVAL_SCHEMA = { type: 'object', properties: { section: { type: 'string' }, verdict: { type: 'string', enum: ['ready', 'needs-work', 'blocked'] }, score: { type: 'number' }, critique: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, issue: { type: 'string' }, evidence: { type: 'string' } }, required: ['label', 'issue'] } }, blocking_questions: { type: 'array', items: { type: 'string' } } }, required: ['section', 'verdict', 'score'] }
const GEN_SCHEMA = { type: 'object', properties: { section: { type: 'string' }, new_text: { type: 'string' } }, required: ['section', 'new_text'] }
const SPLICE_SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' }, validator_pct: { type: 'number' }, marker_count_working: { type: 'number' }, marker_count_candidate: { type: 'number' }, error: { type: 'string' } }, required: ['ok'] }
const CLOSE_SCHEMA = { type: 'object', properties: { section: { type: 'string' }, verdict: { type: 'string', enum: ['resolved-all', 'partially-resolved', 'unresolved'] }, resolved: { type: 'array', items: { type: 'string' } }, unresolved: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, why: { type: 'string' } }, required: ['issue', 'why'] } }, new_defects: { type: 'array', items: { type: 'string' } } }, required: ['section', 'verdict', 'resolved', 'unresolved'] }
const OK_SCHEMA = { type: 'object', properties: { ok: { type: 'boolean' }, detail: { type: 'string' } }, required: ['ok'] }

function codexRecipe(promptSpec, label) {
  return `Working dir: ${ROOT}. You are a deterministic courier — do not add your own judgment to the payload.
1. ${promptSpec}
2. Write the final prompt text to ${ROOT}/loop/out/prompt-${label}.txt (Write tool; create loop/out if needed).
3. Run in FOREGROUND Bash with the timeout parameter set to 600000 (ten minutes; do NOT use run_in_background):
   cd "${ROOT}" && ${CODEX} -o "loop/out/lastmsg-${label}.txt" - < "loop/out/prompt-${label}.txt" > "loop/out/log-${label}.txt" 2>&1
4. Read loop/out/lastmsg-${label}.txt and parse the JSON payload from it. If the file is missing or unparseable, retry the codex command ONCE with "-r" appended to every ${label} filename.
5. Return the parsed payload via structured output. If both attempts fail, return an empty payload.`
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
let passTargets = null   // null = derive on pass 1
let finalRecords = []
let stopped = null

for (let pass = 1; pass <= MAX_PASSES; pass++) {
  phase('Pass')
  log(`=== complete iteration ${pass}/${MAX_PASSES} (frozen input: ${WORK}) ===`)

  // -- leaf map is recomputed each pass (line numbers shift after promotion)
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

    // evaluate ONE leaf — codex reads the WHOLE working doc for reference, judges only the target
    (leaf) => agent(
      codexRecipe(
        `Read ${ROOT}/loop/prompts/evaluator_leaf.md and replace {DOC} with "${WORK}" and {TARGET} with this line:\n- ${leaf.heading} (lines ${leaf.start}-${leaf.end})`,
        `eval-${leaf.id}-p${pass}-${RUN_ID}`),
      { label: `eval:${leaf.id}`, phase: 'Pass', effort: 'low', schema: EVAL_SCHEMA }),

    // mini-iteration loop: generate -> splice+validate -> clean-room close, cycle until a stop condition
    async (ev, leaf) => {
      if (!ev) return { leaf: leaf.id, heading: leaf.heading, status: 'eval-failed', cycles: 0 }
      const actionable = (ev.critique || []).filter(c => c.label !== 'unmade-decision')
      const unmade = (ev.critique || []).filter(c => c.label === 'unmade-decision')
      const record = { leaf: leaf.id, heading: leaf.heading, eval: ev, unmade, cycles: 0 }
      if (unmade.length > 0) return { ...record, status: 'blocked' }                    // S1
      if (ev.verdict === 'ready' || actionable.length === 0) return { ...record, status: 'ready' }  // S2
      if (MODE === 'baseline') return { ...record, status: ev.verdict }

      const leafCand = `loop/out/cand-${leaf.id}.md`
      let critique = actionable
      let blocking = ev.blocking_questions || []
      let lastGoodFile = null
      let prevUnresolved = actionable.length
      let entryUnresolved = actionable.length
      let spliceFails = 0
      let status = 'stalled'

      for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
        record.cycles = cycle
        guard(3)
        const genFile = `loop/out/gen-${leaf.id}-p${pass}-c${cycle}.md`

        // GENERATOR — Sonnet xhigh; whole working doc as reference, surgical on the target
        const gen = await agent(
          `Working dir: ${ROOT}. You are the GENERATOR. First Read ${ROOT}/loop/prompts/generator_prefix.md and obey every hard rule in it. Then Read ${ROOT}/loop/state/lessons.jsonl and ${ROOT}/loop/state/decisions.jsonl (normative claims must trace to entries). Read the ENTIRE working document ${ROOT}/${WORK} for reference — you rewrite ONLY the section "${leaf.heading}"${lastGoodFile ? `, whose CURRENT text (from your previous accepted cycle) is in ${ROOT}/${lastGoodFile} — refine THAT text` : ` (lines ${leaf.start}-${leaf.end} of the working doc)`}. Pay particular attention to the sections its Dependencies line names.\nResolve THIS critique, surgically — change nothing the critique does not require:\n${JSON.stringify(critique, null, 2)}\nBlocking questions to answer in the text where the decision ledger supports an answer (otherwise leave a [DECISION: <question>] marker):\n${JSON.stringify(blocking)}\nReturn {section: "${leaf.id}", new_text: "<full replacement section including the #### heading line>"} via structured output.`,
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
          critique = critique.concat([{ label: 'local', issue: `Previous rewrite failed verification: ${splice && splice.error ? splice.error : 'validator below 100% or a [DECISION] marker was lost'} — fix without reintroducing it`, evidence: 'splice verdict' }])
          continue
        }
        spliceFails = 0

        // CLOSER — Haiku clean room: original vs this cycle's text + the critique, nothing else
        const close = await agent(
          `You are the CLOSER in a PRD-improvement loop. You have NO other context — judge ONLY from the artifacts named here.
1. Read lines ${leaf.start}-${leaf.end} of ${ROOT}/${WORK} (the ORIGINAL section, this pass's frozen input).
2. Read ${ROOT}/${genFile} (the REWRITE).
3. For EACH critique item below, decide from the two texts alone: resolved or unresolved. Quote the rewrite where it resolves an item; say exactly why where it does not.
4. List any NEW defect the rewrite introduced that the original did not have (information lost, ambiguity added, an invariant weakened).
CRITIQUE:\n${JSON.stringify(critique, null, 2)}
Verdict: "resolved-all" | "partially-resolved" | "unresolved".
Return {section: "${leaf.id}", verdict, resolved: [...], unresolved: [{issue, why}], new_defects: [...]} via structured output.`,
          { label: `close:${leaf.id}-c${cycle}`, phase: 'Pass', model: 'haiku', effort: 'medium', schema: CLOSE_SCHEMA })
        if (!close) { status = 'closer-failed'; break }

        if ((close.new_defects || []).length > 0) {                                      // S4: discard cycle
          status = lastGoodFile ? 'partially-improved' : 'regressed-reverted'
          record.regression = close.new_defects
          break
        }
        lastGoodFile = genFile
        record.closure = { verdict: close.verdict, resolved: close.resolved.length, unresolved: close.unresolved.length }
        if (close.verdict === 'resolved-all') { status = 'improved'; break }             // S3
        if (close.unresolved.length >= prevUnresolved) {                                 // S5: no strict progress
          status = close.unresolved.length < entryUnresolved ? 'partially-improved' : 'stalled'
          break
        }
        prevUnresolved = close.unresolved.length
        status = 'partially-improved'                                                    // S6 fallthrough at cap
        critique = close.unresolved.map(u => ({ label: 'local', issue: u.issue, evidence: u.why }))
        blocking = []
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
  const unresolvedTotal = done.reduce((n, r) => n + (r.closure ? r.closure.unresolved : (r.eval ? (r.eval.critique || []).length : 0)), 0)
  passSummaries.push({ pass, targets: done.length, ready: readyN, blocked: blockedN, improved: done.filter(r => r.status === 'improved').length, unresolvedTotal })

  if (readyN + blockedN === done.length) { stopped = 'decomposition-ready-pending-queue'; break }   // P1
  if (done.every(r => r.status === 'blocked')) { stopped = 'queue-gated'; break }                   // P2
  const prev = passSummaries[passSummaries.length - 2]
  if (prev && readyN <= prev.ready && unresolvedTotal >= prev.unresolvedTotal) { stopped = 'plateau'; break }  // P3
  passTargets = done.filter(r => r.status !== 'blocked' && r.status !== 'ready').map(r => r.leaf)
  if (passTargets.length === 0) { stopped = 'decomposition-ready-pending-queue'; break }
}
if (!stopped) stopped = MAX_PASSES > 1 ? 'max-passes-reached' : 'single-pass-complete'              // P0/P4

// ================================================================ Report
phase('Report')
const queue = []
for (const r of finalRecords) {
  for (const c of (r.unmade || [])) queue.push({ question: c.issue || '', section: r.heading, source: 'evaluator', evidence: c.evidence || '' })
  for (const q of ((r.eval && r.eval.blocking_questions) || [])) queue.push({ question: q, section: r.heading, source: 'blocking-question', evidence: '' })
}
const leafRecords = finalRecords.map(r => ({ leaf: r.leaf, section: r.heading, status: r.status,
  cycles: r.cycles, score: r.eval ? r.eval.score : null, closure: r.closure || null }))
const scoreLines = finalRecords.filter(r => r.eval)
  .map(r => JSON.stringify({ run: RUN_ID, mode: MODE, ...r.eval, final_status: r.status, cycles: r.cycles }))

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
  note: 'Canonical PRD untouched — accept the working-vs-canonical diff to land a new PRD. Working version promotes only at pass boundaries; frozen during passes.',
}
