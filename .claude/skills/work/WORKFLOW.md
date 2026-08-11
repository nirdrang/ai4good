# One item, end to end

The reference sequence. The role contracts implement it; where they disagree with this document,
this document describes the intent and they describe the obligation.

**Where each file lives.** Beside this one, in `.claude/skills/work/`: `SKILL.md` (the
coordinator's manual, and the skill `/work` loads), `shared-invariants.md` (binds every role),
`reviewers.md` (the base of every gate prompt — the reviewers are external processes, not agents),
and `lessons.md` (what the rules cost to learn). In `.claude/agents/`, because the platform
resolves spawnable agent types and their effort pins there: `conductor.md`, `orchestrator.md`,
`orchestrator-opus.md`, `executor.md`, `mechanical.md`, `distiller.md`. The coordinator has no
definition file of its own — it is the founder's own session, so its contract is the skill.

## The roles

| role | model | owns | lives |
|---|---|---|---|
| **Coordinator** | fable @ xhigh | the PM board · the founder channel · everything destructive | the whole session |
| **Conductor** | sonnet | the item's worktree and its clock · narration | one item |
| **Orchestrator** | fable @ xhigh; the **MERGE** and **AUDIT RE-RUN** sittings and any credit-out sitting on opus @ max | **all judgment** — plan, rulings, merge decision | one sitting; four per item, five when the audit finds something |
| **Executor** | opus | the code, and running verify | one task |
| **Mechanical** | sonnet | publish · merge execution · capture | one task |
| **Reviewer-runner** | sonnet | launching ONE reviewer · holding its wait · distilling its output — the sole actor that starts a reviewer process | one reviewer run |
| **Distiller** | sonnet | one raw critique → findings only (the contract the runner follows; spawned alone only to re-distil) | one file |
| **Reviewers** | codex sol · terra · luna · opencode flash | critique — never execution | one run, never resumed |

Three sentences hold it together: **the orchestrator owns decisions, the executor owns
keystrokes, the conductor owns the clock.** Judgment never waits; waiting never judges.

## The trees

- The **main checkout** on `main` — the coordinator's, permanent, never follows anyone in.
- **One worktree per item**, created by the platform when the conductor is spawned with
  isolation, checked out to the item branch, installed once. Every role inside the item is
  spawned **without** isolation and inherits it.
- An **artifacts directory INSIDE the tree** at `loop/items/<item>/artifacts/`, for reviewer
  output and distillates (founder ruling 2026-08-09 — it lived beside the tree until the Write
  tool's isolation guard collided with that placement; see reviewer-runner.md step 0).

No clones. No per-sitting trees. No `--detach` handoff — nothing else competes for the branch.

---

## PICKUP

```
 1  FOUNDER      /work AI4DEV-NN
 2  COORDINATOR  resolve: id · short label · gitBranchName · state · blockers
                 walk parent upward (cap 8, cycle detection), short label for every link
 3  COORDINATOR  startability: missing | Done | Cancelled | open blocker → stop, say which
                 chain ROOT bare → ask the founder ONCE, ranked options
                 board unreadable → print CHAIN UNRESOLVED, carry on, never guess
 4  COORDINATOR  create the branch from the board's name VERBATIM → push
 5  COORDINATOR  claim: assign + In Progress          ← last, so a failure leaves no false claim
 6  COORDINATOR  spawn CONDUCTOR (sonnet, isolation: worktree, background)
                 spawn prompt = item facts only; never a resolved chain, never process
```

## SETUP

```
 7  CONDUCTOR    born in the item's ONE worktree
 8  CONDUCTOR    git fetch ; git checkout <item-branch>
 9  CONDUCTOR    bun install --frozen-lockfile              once per item, ~52s
10  CONDUCTOR    create the artifacts dir INSIDE the tree at loop/items/<item>/artifacts/
11  CONDUCTOR    flow "claimed → plan" → spawn PLAN SITTING (no isolation → same tree)
```

## PLAN

```
12  ORCHESTRATOR print stamp · derive own chain (a chain in the spawn prompt is a hint, not a fact)
13  ORCHESTRATOR read the board item + spec/acceptance tests + the code
14  ORCHESTRATOR write plan.md — decisions · steps each with a done-criterion ·
                 expected verification state per acceptance-test id  ← the executor's goal spec
                 evidence by POINTER, never pasted
                 decide and record: is this large enough to slice, so the code gate runs per slice
15  ORCHESTRATOR write the gate-1 prompt = reviewers.md `## Your contract` + the PLAN review
                 section ONLY + item additions (ADDITIVE ONLY; no sibling section, no Pins
                 line, and never a word telling this reviewer another gate exists —
                 see the assembly section at the top of reviewers.md)
16  ORCHESTRATOR write PHASE-STATE — gate-1 spec · the file that completes this phase —
                 THEN commit + push · tree clean · report the pushed head
                 (the state file rides IN the head it completes; it never names its own SHA —
                  the sitting reports the head, and the conductor verifies that report)
17  ORCHESTRATOR hand a MECHANICAL the pull request to open — body as handed,
                 non-closing references only → end
```

## GATE 1 · critique of the PLAN

```
18  CONDUCTOR    tether wakes it · verify the push landed (ls-remote tip == the head the
                 sitting reported)
19  CONDUCTOR    spawn ONE reviewer-runner (sol via codex), in the background — the runner
                 launches OS-DETACHED, holds the wait, and distils; its completion wakes you.
                 No file-watch: that mechanism failed twice on one item, armed and silent
20  CONDUCTOR    flow "plan → gate 1" · keep-alive timer armed · you watch no reviewer files
21  CONDUCTOR    the runner reports — LANDED with its distillate, or an anomaly handed down
22  CONDUCTOR    flow "gate 1 done · sol N" → spawn DRAFT SITTING
```

## DRAFT · the code is written, not finished

```
23  ORCHESTRATOR read PHASE-STATE + gate-1 findings
24  ORCHESTRATOR rule EVERY finding · removals carry a verification condition
25  ORCHESTRATOR amend plan.md — the amended plan IS what gets built; no second plan, no brief
26  ORCHESTRATOR commit + push rulings and the amended plan     ← before any code changes
27  ORCHESTRATOR spawn EXECUTOR — DRAFT PASS                                    ROUND n
        └─ implement every plan step · typecheck and build MUST pass
           the verify suite is NOT run — the draft exists to be critiqued, not to be green
           commit + push → report (coverage · typecheck · open questions)
28  ORCHESTRATOR draft incomplete, or a dispute? → re-rule → back to 27      MAX 2 RE-ROUNDS
29  ORCHESTRATOR write the gate-2 prompts (critique only, NO execution) = `## Your contract` +
                 the DRAFT CODE review section ONLY + item additions. Two prompts, one per
                 pinned model, and NEITHER may hint that the other reviewer exists
30  ORCHESTRATOR write PHASE-STATE — BOTH completing files — THEN commit + push ·
                 tree clean · report the pushed head → end
```

## GATE 2 · critique of the DRAFT CODE

```
31  CONDUCTOR    wake · verify the push landed
32  CONDUCTOR    PROPORTIONALITY, DERIVED: does the diff reach code (the rule CI's prose-only
                 fast lane uses)?  NO → skip this gate, record it in the flow line and the
                 state file so the merge ruling can say the green excludes a code review,
                 then spawn the FIX SITTING directly with ZERO findings — the goal loop and
                 the audit brief still happen there; only the critique is skipped
33  CONDUCTOR    spawn ONE reviewer-runner PER READER, in the background — terra via codex,
                 flash via opencode (the second seat, founder ruling 2026-08-09; Kimi stays
                 out). The runner launches, holds the wait, and distils; its completion wakes
                 you. Neither reviewer learns the other exists
34  CONDUCTOR    flow "draft → gate 2" · keep-alive timer armed · you watch no reviewer files —
                 the runner holds that wait
35  CONDUCTOR    proceed only when BOTH runners have reported — a partial landing is not
                 progress, and it is visible as one runner still outstanding
36  CONDUCTOR    flow "gate 2 done · terra N · flash M" → spawn FIX SITTING
```

## FIX AND GOAL

```
37  ORCHESTRATOR read PHASE-STATE + both findings lists
38  ORCHESTRATOR rule EVERY finding, the reviewer's claim quoted verbatim beside each:
                 accept · reject-with-reason · accept-fixed-differently · verify-first
39  ORCHESTRATOR write the amendment (each entry cites its ruling and its done-criterion)
40  ORCHESTRATOR commit + push rulings and amendment            ← before any code changes
41  ORCHESTRATOR spawn EXECUTOR — FIX PASS then GOAL LOOP                       ROUND n
        └─ a) check every verify-first claim and removal condition FIRST → proven / disproven
           b) apply the ruled fixes, as ruled
           c) GOAL: every plan step at its done-criterion AND the verify suite green
              AT BOTH TIERS — `--tier loop --expect` for every declaration manifest, and
              `--tier integration --expect` for every one, serially on the item's own
              reserved database slot. An item that proves its ids only against stand-ins
              has proved them against stand-ins. CI's required check is UNCHANGED: it
              stays loop-only and fast, because it has no slot
              MAX 3 ITERATIONS · no external critique
           d) commit + push → report (per-ruling status · verify · ITERATION COUNT · disputes)
42  ORCHESTRATOR dispute, or the goal not reached? → re-rule → back to 41     MAX 2 RE-ROUNDS
43  ORCHESTRATOR cap reached → STOP WORKING, NOT JUDGING: what remains is written as open
                 items — filed, or escalated as scope growth. Never recorded as "invalid".
44  ORCHESTRATOR normal exit: every ruling closed-by-fix or rejected-with-reason AND verify
                 green (the capped exit is 43)
45  ORCHESTRATOR commit the fixes and each code reader's full evidence into the record
                 (raw critique + distillate, PLUS the opencode reader's tool-call summary +
                  identity extract — see reviewer-runner.md)
46  ORCHESTRATOR write the audit brief = `## Your contract` + the AUDIT section ONLY + item
                 additions — the item additions ARE the CLAIM CHECKLIST: adopted rulings by id,
                 the declared code path-set, each stated code fact, enumerated (see reviewers.md)
47  ORCHESTRATOR write PHASE-STATE — audit spec — THEN commit + push · tree clean ·
                 report the pushed head → end
```

**THE VERIFICATION INSTRUMENT IS `at:verify`, AT BOTH TIERS, AND NOTHING ELSE.** A hand-written
proof script that talks to a real stack is legitimate as a VENDOR MEASUREMENT feeding a plan
decision — what a live provider really answers, what a real client really does — and it is never
an item's evidence that an acceptance id holds. Three such transcripts are in the record and they
stay there as history; nothing about them is deleted. What changed is their standing: a
transcript is one machine's word, produced once, which a reviewer cannot reproduce, and it grades
no id. The suite at the integration tier grades every id, on a slot any run rebuilds, and states
exactly which id it graded.

## AUDIT · critique of the CLAIM — before CI, never beside it

The first audit sitting runs on **fable @ xhigh** — it is the item's last open-ended safety net.
The **re-run** sitting runs on **orchestrator-opus (opus @ max)** by design: the rebuilt checklist
and the fix delta fence its judgment, so it spares fable (founder 2026-08-11).

```
48  CONDUCTOR    wake · verify the push landed
49  CONDUCTOR    spawn ONE reviewer-runner PER READER, in the background — luna via codex,
                 flash via opencode: the audit is a PANEL of two (founder ruling 2026-08-09).
                 The runner launches, holds the wait, and distils
50  CONDUCTOR    flow "fix → audit" · keep-alive timer armed · the runners hold the waits
51  CONDUCTOR    proceed only when BOTH runners have reported
52  CONDUCTOR    CLEAN OR NOT, DERIVED FROM BOTH DISTILLATES — never from anyone's word
                 CLEAN = BOTH seats zero findings AND each distillate reads as a real verdict
                   → a MECHANICAL commits each reader's full evidence and pushes
                     (a reader's evidence = raw output + distillate, PLUS for an opencode
                      reader its tool-call summary + identity extract — see reviewer-runner.md)
                     EVIDENCE ONLY — this mechanical never touches the pull request; the
                     merge tail has ONE executor and the MERGE SITTING spawns it (founder
                     2026-08-11, after two mechanicals raced the tail)
                   → flow "audit clean → ci" · arm CI ON THAT NEW HEAD (the commit moved it)
                   → spawn the MERGE SITTING as orchestrator-opus (opus @ max, by design — see
                     the MERGE step).  NO AUDIT SITTING — nothing to rule, so this
                     wait and CI's are adjacent.  THIS is what makes the usual item FOUR
                     orchestrator sittings rather than five
                 FINDINGS IN EITHER SEAT, or truncated · cut off mid-write · progress lines and
                 no findings in either
                   → flow "audit done · luna N · flash M" → spawn the AUDIT SITTING (53)
                     one clean seat never outvotes the other's findings
                     AMBIGUITY BUYS MORE JUDGMENT, NEVER LESS — the same reflex that sends
                     CI down its slow path when it cannot read the file list

53  ORCHESTRATOR [only when there is something to rule]
                 rule each finding BY CLASS:
                 1 THE RECORD IS FALSE — an adopted ruling not implemented · the diff outside
                   its declared scope · a stated fact untrue
                   → NEVER mergeable: change the code, or change the record
                 2 REAL BUT OUT OF SCOPE  → file it · name it in the ruling · narrow the claim
                 3 THE AUDITOR IS WRONG   → reject with a reason · claim verbatim into the PR
54  ORCHESTRATOR fixes needed? → EXECUTOR → commit + push → PHASE-STATE: "the audit must
                 re-run at the new head" · NAME THE FIX DELTA (audited head → new head) ·
                 REBUILD the checklist (add the adopted audit rulings + changed facts)
                 → END THE SITTING — launching BOTH auditors and
                 waiting is the conductor's (it re-enters at 49 and spawns a FRESH audit sitting
                 as orchestrator-opus, opus @ max by design — the first audit was on fable);
                 a sitting never spans the auditors' wait
                 the audit re-runs ONLY if code changed · BOTH seats, but SCOPED to what the
                 fix delta can REACH, not the whole range again (scope box alone re-checks the
                 full code-territory file list) — a scoped fix earns a scoped re-read  MAX 1 PER ITEM
55  ORCHESTRATOR the record is true and every finding from BOTH seats disposed
                 → commit each reader's full evidence + rulings into the record
                   (full evidence per reader as defined at step 52 / reviewer-runner.md)
                 → write PHASE-STATE — completing signal = CI on the final head —
                 THEN commit + push · tree clean · report the FINAL head → end
```

## CI · the last thing, on the head that merges

```
56  CONDUCTOR    arm a Monitor on the required check for the FINAL head
                 emit on ANY terminal state — success · failure · cancelled · timed out
                 (GitHub fires CI on every push; intermediate runs are NOT the gate)
57  CONDUCTOR    flow "audit → ci"
58  CONDUCTOR    terminal state → spawn MERGE SITTING as orchestrator-opus (opus @ max, by design)
```

## MERGE

The merge sitting runs on **orchestrator-opus (opus @ max)** by design — it spares fable, whose
credit runs out sooner, and the merge sitting's work is procedural rather than the item's hardest
judgment (founder 2026-08-11).

```
59  ORCHESTRATOR read PHASE-STATE + the CI result
60  ORCHESTRATOR CI RED → classify before reacting:
                 a INFRASTRUCTURE / FLAKE  → re-run the check, no new commit          ONCE
                                             fails again → treat it as real
                 b THIS CHANGE BROKE IT    → rule → EXECUTOR → push → PHASE-STATE: "back
                                             through the audit at the new head" → END THE
                                             SITTING; the conductor re-enters at 49.  MAX 1
                                             A fix here that needs a SECOND audit re-run is
                                             scope growth — escalate, never skip the audit
                 c PRE-EXISTING ON MAIN    → prove it against main. Not this item's defect
                                             → the founder: rebase, or a separate item
61  ORCHESTRATOR local verify GREEN but CI RED = debugging blind against a remote signal
                 MAX 2 pushes, then escalate with the evidence
62  ORCHESTRATOR write the merge ruling, pinned to the exact head:
                 what was built · every finding and its disposition ·
                 BOTH TIERS' exact-match results — tier, requirement, exit code, and for
                 integration the runner's own slot evidence line naming the slot, the
                 reset and the migration count ·
                 WHAT THE GREEN DOES AND DOES NOT CLAIM ·
                 any maintained reviewer disagreement, verbatim
63  ORCHESTRATOR confirm the required check green on THAT SHA — record the run id AND the sha
64  ORCHESTRATOR hand the ruling to a MECHANICAL — published to the pull request AS HANDED
                 no closing verb beside an item id the branch does not own
65  MECHANICAL   execute the merge → the integration flips the item Done
66  ORCHESTRATOR post-merge check against merged main · board state confirmed
                 webhook dropped → repair it, and record it AS a repair
67  ORCHESTRATOR PHASE-STATE: done → end
```

## CLOSE

```
68  CONDUCTOR    flow "merged → done" → one line to the coordinator → end
69  COORDINATOR  sweep: the item's worktree · its generated worktree-agent-* branch ·
                 the artifacts directory (its contents were committed into the record by
                 the fix and audit sittings — verify that before deleting)
                 a live agent's tree is marked `locked` — that is the never-touch signal
70  COORDINATOR  fold upward — re-read the parent's children FRESH · cascade ·
                 stop below a requirement · name every cancelled child
71  COORDINATOR  release · report open siblings with labels · suggest the next /work
```

---

## Caps — they bound effort, never truth

| bound | value |
|---|---|
| executor attempts to reach green, inside one invocation | 3 |
| times an orchestrator may send the executor back, per sitting | 2 |
| audit re-runs, per item (and only if code changed) | 1 |
| CI re-runs for a suspected flake | 1 |
| pushes while debugging blind against CI | 2 |

When a cap fires, **stop working — do not stop judging.** What remains is written down as an
open item: filed as separate work, or escalated as scope growth. "We ran out of rounds" is never
recorded as "the finding was invalid."

## Escalation

```
executor disputes a ruling        → its own orchestrator sitting, addressed BY AGENT ID
                                    (an agent TYPE name does not resolve and lands on the
                                     coordinator, where nobody has authority over the item)
anomaly during a gap              → the conductor never investigates: it spawns the next
                                    sitting EARLY with the anomaly named in the state file
contradicts ratified text, or     → question into PHASE-STATE → sitting ends
real scope growth                   → conductor sends a question line + push notification
                                    → coordinator relays VERBATIM, rules on nothing
                                    → answer into PHASE-STATE → a fresh sitting resumes
```

Exactly two things reach the founder from inside an item. Everything else the orchestrator
decides, including dismissing a reviewer's maintained "this green is unearned" — recorded
verbatim in the pull request, with the ruling stating what the green does and does not claim.

## Watchdog

The conductor emits a `STALL` line when any sitting or gate exceeds its window with nothing
landed. **A watch expiring empty is a signal, not a shrug** — the one time it was shrugged off it
cost four idle hours. Silence and progress look identical from outside.

## What is deliberately absent

- **No reviewer clone.** A worktree holding commits survives its agent, so reviewers read the
  item's own tree.
- **No `--detach` handoff.** One tree per item means nothing else competes for the branch.
- **No confirmation step.** Reviewers are not re-engaged to approve fixes to their own findings.
- **No reflection step** (founder ruling 2026-08-06: *"Reflection should be out"*). The way of
  work improves between items; a process finding surfaced mid-item still rides along or goes to
  the coordinator to fold — only the mandated step is gone.
- **No execution by reviewers.** They critique; the executor verifies; CI proves.
- **No lazy install.** One tree that will certainly run the harness gets installed once, up front.
- **No audit sitting on a clean audit.** A sitting exists to put judgment between two waits; with
  nothing to rule there is no judgment to place, so the merge sitting absorbs both waits.

## The two things that make this cheaper than what it replaces

**No premium context is ever alive while a machine is working.** Every sitting ends where the
next event is a wait. A sitting starts at roughly 40K tokens of curated reading (the measured fresh-spawn baseline
is ~39K) instead of replaying a 246K–330K transcript, which is what a parked agent's every
wake used to cost.

**The record is the memory.** `PHASE-STATE.md`, the plan, the rulings, the distillates and the
pull request carry everything across a boundary. That is why an involuntary death costs one
sitting rather than an item — proven three times before it was designed for.
