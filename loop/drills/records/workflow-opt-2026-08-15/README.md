# Workflow optimization findings — the item profile and the conductor mechanism

Session `ebf2407e` (workflow-opt), 2026-08-13 to 2026-08-15. Written so these two chapters survive
compaction with their evidence intact. Companion records in the same scratchpad:
`v4pro-artifacts/TRIAL-RECORD.md`, `v4pro-artifacts/TRIAL-RECORD-EXECUTOR.md`.
Memory files: `v4-pro-reviewer-and-executor-trials.md`, `db-slot-ports-windows-reservation.md`.

---

## Chapter 3 — where an item's time and tokens go

### Evidence base

Four complete merged items, measured from primary sources only:
- **Time**: the conductor's timestamped FLOW/PULSE messages in the coordinator transcripts
  (`007dee8b-00c5-4a4a-ac9c-cc583206d805.jsonl` for AI4DEV-79/80/65,
  `5bb6c63d-542c-4f2e-8760-366f5b42bdaa.jsonl` for AI4DEV-62). Phase duration = the bracket
  between the "launched" and "done" messages.
- **Tokens**: raw `message.usage` on every line of all 33 subagent transcripts of AI4DEV-62,
  summed per spawn; each spawn mapped to its role by matching agent ids in Agent tool results.
- **Tool time**: every tool_use → tool_result timestamp gap in the same transcripts.
- Cross-check: wall clock minus founder pauses landed within 3 minutes of summed phase time on
  all three timeline items.

### Time per item

| item | active | wall clock | founder pause |
|---|---|---|---|
| AI4DEV-79 (database slot pool) | 303 min | 13 h 25 m | 8 h 16 m |
| AI4DEV-80 (nested attribution) | 237 min | 4 h 03 m | none |
| AI4DEV-65 (who signed) | 146 min | 11 h 26 m | 8 h 57 m |
| AI4DEV-62 (per-org roles, batch) | 179 min | 21 h 38 m | 17 h 08 m |

Split, holding per item not just on average: **sittings 63–73%, reviewer panels 27–35%,
test harness ~6%.**

Key measured facts:
- **Panels are wall-clock free.** AI4DEV-62 gate 2, four legs launched together at 23:29: flash
  landed both slices at ~10 min, terra at ~11 and ~17. Conductor's own pulse at 23:44: "3 of 4
  runners landed, ~10m more waiting — still waiting on slice1 terra." The OpenAI reader set the
  clock in all six measured panel legs. This is why the V4 Pro gate-2 swap (13.0/13.6 min
  measured on the same slices) costs zero wall time.
- **Harness is ~6%.** Four goal runs (2 requirements × 2 tiers) bracketed at ~10 min by the
  conductor's pulses; integration runs measured at 209–211 s each inside executor transcripts
  (database reset + migration replay is the floor). Cheap checks measured by hand: typecheck
  ~15 s, at:check ~2 s, selftest ~40 s (344 tests).
- **Founder latency dominates wall clock.** The only pause-free item (80) closed in 4 hours.
- **Collision cost is real:** 71 of AI4DEV-62's 179 min (40%) were integration work plus a forced
  audit re-run caused solely by AI4DEV-65 merging into the same shared acceptance suite nine
  hours earlier. Both audit passes were clean. Merge ruling: "the merge is BLOCKED, and the
  cause is not CI."

### Tokens per item (AI4DEV-62, exact)

| role | spawns | tokens | share |
|---|---|---|---|
| executor (opus) | 4 | 117.9M | 37.9% |
| conductor (sonnet) | 1 | 93.0M | 29.9% |
| orchestrator (fable) | 4 | 29.3M | 9.4% |
| reviewer-runner (sonnet) | 9 | 21.7M | 7.0% |
| orchestrator-opus | 1 | 19.8M | 6.4% |
| mechanical | 7 | 16.7M | 5.4% |
| Explore | 3 | 11.8M | 3.8% |
| distiller | 4 | 0.7M | 0.2% |
| **delegated total** | 33 | **310.9M** | |

Structural facts:
- **Cache reads are 90%+ of every role.** Output tokens across all 33 spawns: under 700K.
  Cost tracks turns × context size, not task difficulty.
- **Every spawn starts clean**: turn-1 usage on all 33 shows input=2, cache_read=0, cache write
  ~35–45K (its own contract + tool schemas). No context inheritance anywhere; the conductor's
  bloat is entirely its own.
- **Executor tool time**: 99.5 min combined span = 66.7 min model thinking + 32.9 min tool waits;
  PowerShell (the harness) is 98.9% of tool time. Read×95 + Edit×117 + Write×24 + Grep×19
  together: 18 seconds (~40 ms each). File tools are free.
- Pin discipline errors found: mechanical #1 ran on opus (10.9M tokens; six siblings on sonnet
  at 0.3–4M), Explore #1 on opus (8.6M). Cheap fixes, no design change.
- TokenTelemetry cross-check: its $26.69 conductor cost is CORRECT (84M sonnet cache reads).
  My initial "doesn't make sense" was a wrong denominator (divided by non-cache tokens only).
  Item total ~$203; delegated $116.85.

---

## Chapter 4 — the conductor mechanism (the thread's biggest finding)

Transcript: `5bb6c63d…\subagents\agent-aede7117cc1a2b492.jsonl` (the AI4DEV-62 conductor).

### The evidence chain

1. **The bill**: 610 usage records, 93,012,567 tokens; 84.2M cache reads (91%), 72K output.
   Second-largest consumer in the item; its contract says it "rules on nothing."
2. **Not a polling loop**: tool-wait totals 15.6 min of a 1,291-min span — **1%**. The roles
   that wait correctly: reviewer-runners 77–94% blocked in one PowerShell call, orchestrators
   70–75% blocked on the executor Agent call. Blocked waiting generates no tokens.
3. **Not calendar time**: context grew 44,935 (turn 1) → 255,948 (turn 604), linear at
   ~346 tokens/turn. Across the 17-hour founder pause (turns 306→367) context moved only
   150K→172K (~22K). Growth is in TURNS. (This killed the earlier "respawn across pauses" idea.)
4. **The 610 turns decomposed**: median inter-turn gap 4 s; 69% are continuations. Distinct
   wakes (gap >60 s): **92**, averaging **6.6 turns each** — one wake every 2.9 min during
   active hours. Inbound: 169 task notifications, 222 tool results, 11 agent messages.
   Tool calls: SendMessage 66, Monitor 48, TaskStop 43, Agent (real spawns) only 19.
   ~590 of 610 turns served watching/narrating, not decisions.
5. **169 notifications from 33 children = 5.1 per child** — but only **40 distinct task ids**,
   and 30 ids delivered more than once (up to ×10). Smoking gun in the conductor's own Monitor
   commands, BOTH forms present in one item:
   - correct: `prev=$(git ls-remote …); while true; do sleep 30; compare; emit on change; done`
   - wrong:   `while true; do sleep 60; git ls-remote origin refs/heads/…; done`
     (prints the tip EVERY tick; every printed line = a full-context wake; produced the
     one-per-minute wake stream, e.g. six "child finished" wakes 23:02–23:06).
   A correct filter prevents ~129 of the 169 deliveries from existing at all. True in-flight
   duplicates are the small residue and are handled by cheap one-turn wakes.
6. **The 10-minute echo**: conductor.md:247 "No wait may be open-ended. Cap every one at 10
   minutes." Cap expiry → conductor wake → PULSE → coordinator wake → mandatory stamped relay
   turn. Counted in the AI4DEV-62 trunk: **106 conductor messages = 30 FLOW + 76 PULSE, of which
   72 PULSEs were pure heartbeats** ("~40m elapsed, head still 610ead7" — seven in one draft
   window). Noise:signal = 72:30. Each heartbeat cost three parties (conductor wake, coordinator
   turn, founder attention).
7. **The floor**: turn-1 context 44,935 = conductor.md (27.3KB — largest contract in the system,
   ~60% rationale/history) + tool schemas, re-read every turn: **27.4M tokens = 30% of the
   conductor's bill** before any content. reviewer-runner.md (26.2KB × 9 spawns) has the same
   shape.
8. **Critical-path cost**: 7 clean phase transitions (child completion → next spawn): median
   74 s, mean 179 s, total **20.9 min ≈ 12% of the item's active time**. Per-turn latency is
   FLAT vs context (median 3.2 s at <80K, 3.1 s at >180K — cached prefix is free in time), so
   transition cost is turn COUNT, not context size.

### The fix — one item, four clauses ("the conductor waits quietly")

| clause | attacks | evidence | expected |
|---|---|---|---|
| 1. Pin the watch shape in conductor.md: compare-and-emit-on-change, as a pinned command (like the reviewer launch recipes) | repeat-firing watches | 169 deliveries / 40 tasks, ×10 repeaters | wakes 169 → ~45 |
| 2. Triage at wake: first act = is this task id / head new? If not, end the turn (1 turn, no re-verify, no narration) | 6.6 turns per wake | burst analysis | ~2 turns/wake; even alone takes 610 → ~250 turns |
| 3. Heartbeats stay local: cap expiry with no state change re-arms silently; FLOW travels up; PULSE only for real anomaly. Coordinator relays what arrives (less arrives) | the 72 no-news relays | 30 FLOW vs 76 PULSE count | ~40 stamped coordinator turns removed/item; founder feed becomes signal-only |
| 4. Contract diet: rationale/history from conductor.md + reviewer-runner.md into lessons.md (read on demand), rules stay | the 27.4M floor | 44,935 × 610 turn-1 math | floor ~45K → ~25K, compounds with 1–3 |

**Deliberately NOT changed**: the 10-minute liveness cap (bought with a 9.5-hour lesson), all
three report channels (they race; winner silences losers), the executor's synchronous blocking
spawn (measured free — a blocked agent generates nothing; splitting the sitting would trade a
free wait for a real context rebuild), panels, and every drill-bought safety rule. Nothing
loosens; emissions tighten.

**Expected effect** (on AI4DEV-62's measured numbers): conductor 610 turns/93M → ~120–150
turns/~10–15M; coordinator trunk correspondingly lighter; **~28% of item cost (~$50/item at
validated rates) removed; ~8–10 min off the critical path** (half the transition overhead);
and — because the seven-day usage window ran at 83–89% all week and parks work at 95% — roughly
**a third more items fit per window**. Drill assertion set: wakes ≤ 2 per child; zero
unconditional-emit watch commands in the conductor transcript; zero relayed heartbeats.

### Status 2026-08-20 — clauses 1–3 SHIPPED, light on main (founder ruling, no board item)

Commit `2f46f0b` on main: pinned watch shape, one-turn triage, heartbeats retired to
`loop/items/<ITEM>/artifacts/conductor-status.log`, 60-minute founder-wait cap, coordinator
backstop reads the log first and flags a phase/FLOW mismatch as a lost message. Drill regression
74/74 green before commit. Clause 4 (contract diet) and both riders (model-pin line, outer-loop
cap): founder ruled NOT NOW — they stay parked here. The first real item after this commit is the
before/after measurement against the numbers above.

### Related conclusions parked with evidence

- **Auto-compact at 300K: not worth it.** Verified via the pricing reference: Claude has NO
  long-context surcharge (Opus 5 $5/$25 flat across 1M; Sonnet 5 $3/$15; Fable $10/$50) — no
  price cliff to duck under; cost is linear cache reads. Latency measured flat vs context.
  Only the conductor and late-life executors ever cross ~250K; conductor peaked at 256K (a 300K
  trigger would almost never fire), executors die at sitting boundaries anyway, and lossy
  summaries hit exactly the bookkeeping (head SHAs, task ids) the conductor needs. Keep
  auto-compact as backstop; manual /compact at milestones in long coordinator sessions.
- **Fork-type subagents (2.1.232) don't fit the relay**: fork inherits the parent's model
  (breaks pin discipline), cannot spawn (kills conductor/orchestrator), and our children carry
  no parent context by design (measured cache_read=0 at turn 1 — the isolation is the point).
- **2.1.232 upgrade needs a drill first**: "non-teammate agent spawns execute in the background
  by default" touches the orchestrator's blocking executor call, and background subagents run a
  smaller toolset; 2.1.229's "MCP calls >2 min auto-background" touches the reviewer-runner's
  6–16 min PowerShell hold. Drill: executor spawned run_in_background:false still blocks and
  keeps Edit/Write/PowerShell; runner's long call returns inline. (We run 2.1.227.)
- **Hot escalation** (background executor + SendMessage ruling round-trip, same executor
  continues with context intact) is buildable on 2.1.232 primitives and worth a drill when
  upgrading; keep fresh-spawn as default — recorded deviations mostly travel the report-and-rule
  path (AI4DEV-80's D-1), and stop-and-wait escalation has not yet occurred in any recorded item.
- **Executor loop bounds, confirmed in contracts and transcripts**: 3 fix-iterations max per
  goal pursuit (executor.md + orchestrator.md, same three); loops never extend themselves —
  they escalate (AI4DEV-82's probe re-run was founder-authorized; AI4DEV-62's merge sitting
  ended WITHOUT merging). No numeric cap exists on orchestrator↔executor round-trips for
  distinct judgment calls — a one-line tightening if wanted.
- **Contracts drifted during this session** (executor.md, orchestrator.md, orchestrator-opus.md,
  conductor.md changed on disk after session start): the analysis above describes the pre-drift
  text; any drill should run against current main.
